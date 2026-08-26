import "server-only";

import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";

import { sendConfirmationEmail, type EmailStatus } from "@/lib/confirmation-email";
import { createConfirmationReceipt } from "@/lib/confirmation-receipt";
import { privacyNoticeSnapshot } from "@/lib/privacy-notice";
import {
  ACCESSIBILITY_CONSENT_TEXT,
  ACCESSIBILITY_CONSENT_VERSION,
  CV_BUCKET,
  CV_CONSENT_TEXT,
  CV_CONSENT_VERSION,
  MAX_CV_BYTES,
  PRIVACY_CONSENT_TEXT,
  PRIVACY_NOTICE_VERSION,
  RULES_VERSION,
  type RegistrationInput,
} from "@/lib/registration";

const RULES_CONSENT_TEXT =
  "I agree to comply with the AI Chessathon competition rules and code of conduct.";

type CreateRegistrationRow = {
  registration_id: string;
  reference_code: string;
  submission_state: string;
  expected_cv_object_path: string | null;
  upload_expires_at: string | null;
  was_existing: boolean;
};

type FinalizedRegistrationRow = {
  registration_id: string;
  reference_code: string;
  email: string;
  full_name: string;
  idempotency_key: string;
  submission_state: string;
  was_existing: boolean;
};

export class RegistrationError extends Error {
  constructor(public status: number, message: string, public code = "registration_error") {
    super(message);
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  try {
    if (new URL(origin).host !== new URL(request.url).host) {
      throw new RegistrationError(403, "This submission could not be verified.", "origin_mismatch");
    }
  } catch (error) {
    if (error instanceof RegistrationError) throw error;
    throw new RegistrationError(403, "This submission could not be verified.", "origin_invalid");
  }
}

export async function readSmallJson(request: Request, maximumBytes = 64 * 1024) {
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maximumBytes) {
    throw new RegistrationError(413, "The registration data is too large.", "payload_too_large");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RegistrationError(400, "The registration data is not valid JSON.", "invalid_json");
  }
}

export async function enforceRateLimit(
  supabase: SupabaseClient,
  request: Request,
  scope: "start" | "complete" = "start",
) {
  const secret = process.env.RATE_LIMIT_HMAC_SECRET;
  if (!secret) {
    throw new RegistrationError(503, "Registration abuse protection is temporarily unavailable.", "rate_limit_unavailable");
  }
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const fingerprint = createHmac("sha256", secret).update(ip).digest("hex");
  const limit = scope === "start" ? 8 : 4;
  const { data: allowed, error } = await supabase.rpc("consume_registration_rate_limit", {
    p_ip_fingerprint: fingerprint,
    p_scope: scope,
    p_limit: limit,
    p_window_seconds: 15 * 60,
  });
  if (error) {
    throw new RegistrationError(503, "Registration abuse protection is temporarily unavailable.", "rate_limit_unavailable");
  }
  if (!allowed) {
    throw new RegistrationError(429, "Too many attempts. Please wait before trying again.", "rate_limited");
  }
}

function referenceCode() {
  return `ACH-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function completionToken(registrationId: string, idempotencyKey: string) {
  const secret = process.env.RATE_LIMIT_HMAC_SECRET;
  if (!secret) throw new Error("Registration tokens are not configured.");
  return createHmac("sha256", secret)
    .update(`aichessathon-cv-claim-v1:${registrationId}:${idempotencyKey}`)
    .digest("base64url");
}

function requestFingerprint(input: RegistrationInput) {
  return sha256(JSON.stringify(input));
}

async function ensurePrivacyNoticeVersion(supabase: SupabaseClient) {
  const controller = process.env.REGISTRATION_LEGAL_CONTROLLER_NAME?.trim();
  if (!controller) {
    throw new RegistrationError(503, "Registration legal information is not configured.", "legal_configuration_invalid");
  }

  const text = privacyNoticeSnapshot();
  const hash = sha256(text);
  const readExisting = () => supabase
    .from("legal_document_versions")
    .select("exact_text,text_sha256,is_active")
    .eq("document_kind", "privacy")
    .eq("version", PRIVACY_NOTICE_VERSION)
    .maybeSingle();

  let { data: existing, error } = await readExisting();
  if (error) {
    throw new RegistrationError(503, "Registration legal information could not be verified.", "legal_configuration_invalid");
  }

  if (!existing) {
    const inserted = await supabase.from("legal_document_versions").insert({
      document_kind: "privacy",
      version: PRIVACY_NOTICE_VERSION,
      exact_text: text,
      text_sha256: hash,
      effective_at: "2026-08-26T00:00:00.000Z",
      is_active: true,
    });
    if (inserted.error) {
      ({ data: existing, error } = await readExisting());
      if (error || !existing) {
        throw new RegistrationError(503, "Registration legal information could not be activated.", "legal_configuration_invalid");
      }
    } else {
      existing = { exact_text: text, text_sha256: hash, is_active: true };
    }
  }

  if (!existing.is_active || existing.exact_text !== text || existing.text_sha256 !== hash) {
    throw new RegistrationError(503, "The approved privacy notice version does not match the published notice.", "legal_configuration_invalid");
  }
  return { version: PRIVACY_NOTICE_VERSION, textSnapshot: text, textSha256: hash };
}

async function recordEmailOutcome(
  supabase: SupabaseClient,
  registration: { id: string; email: string; fullName: string; reference: string; idempotencyKey: string },
) {
  const outcome = await sendConfirmationEmail({
    email: registration.email,
    fullName: registration.fullName,
    reference: registration.reference,
    idempotencyKey: registration.idempotencyKey,
  });
  await Promise.all([
    supabase
      .from("registrations")
      .update({ confirmation_email_status: outcome.status, confirmation_email_sent_at: outcome.status === "sent" ? new Date().toISOString() : null })
      .eq("id", registration.id),
    supabase.from("email_outbox").upsert({
      registration_id: registration.id,
      template: "registration_confirmation_v1",
      status: outcome.status,
      provider_message_id: outcome.providerId || null,
      last_error: outcome.error?.slice(0, 500) || null,
      sent_at: outcome.status === "sent" ? new Date().toISOString() : null,
    }, { onConflict: "registration_id,template" }),
  ]);
  return outcome.status;
}

async function confirmationOutcome(
  supabase: SupabaseClient,
  registration: { id: string; email: string; fullName: string; reference: string; idempotencyKey: string },
  wasExisting: boolean,
) {
  let emailStatus: EmailStatus | null = null;
  if (wasExisting) {
    const { data } = await supabase
      .from("registrations")
      .select("confirmation_email_status")
      .eq("id", registration.id)
      .maybeSingle();
    emailStatus = (data?.confirmation_email_status as EmailStatus | undefined) || null;
  }
  if (!emailStatus || (emailStatus !== "sent" && Boolean(process.env.RESEND_API_KEY))) {
    emailStatus = await recordEmailOutcome(supabase, registration);
  }
  return {
    state: "complete" as const,
    reference: registration.reference,
    emailStatus,
    receipt: createConfirmationReceipt(registration.reference, emailStatus),
  };
}

export async function flushStorageCleanupQueue(supabase: SupabaseClient, maximum = 100) {
  const { data, error } = await supabase.rpc("list_storage_cleanup_queue", { p_limit: maximum });
  if (error) throw error;
  const paths = ((data || []) as Array<{ object_path: string }>).map((item) => item.object_path).filter(Boolean);
  if (!paths.length) return 0;

  const { error: removeError } = await supabase.storage.from(CV_BUCKET).remove(paths);
  if (removeError) throw removeError;
  const { error: acknowledgeError } = await supabase.rpc("ack_storage_cleanup", { p_object_paths: paths });
  if (acknowledgeError) throw acknowledgeError;
  return paths.length;
}

async function deletePendingRegistration(supabase: SupabaseClient, registrationId: string) {
  const { error } = await supabase
    .from("registrations")
    .delete()
    .eq("id", registrationId)
    .eq("submission_state", "pending_upload");
  if (error) throw error;
  await flushStorageCleanupQueue(supabase).catch(() => undefined);
}

export async function cancelPendingRegistration(
  supabase: SupabaseClient,
  input: { registrationId: string; claimToken: string; path: string },
) {
  const { error } = await supabase
    .from("registrations")
    .delete()
    .eq("id", input.registrationId)
    .eq("submission_state", "pending_upload")
    .eq("completion_token_hash", sha256(input.claimToken))
    .eq("expected_cv_object_path", input.path);
  if (error) throw error;
  await flushStorageCleanupQueue(supabase).catch(() => undefined);
}

async function uploadIsPresent(supabase: SupabaseClient, registrationId: string, path: string) {
  const fileName = path.split("/").at(-1);
  if (!fileName) return false;
  const { data, error } = await supabase.storage
    .from(CV_BUCKET)
    .list(`intents/${registrationId}`, { search: fileName, limit: 10 });
  if (error) throw error;
  return Boolean(data?.some((item) => item.name === fileName));
}

export async function startRegistration(supabase: SupabaseClient, input: RegistrationInput) {
  const privacy = await ensurePrivacyNoticeVersion(supabase);
  const registrationId = randomUUID();
  const reference = referenceCode();
  const claimToken = input.cv ? completionToken(registrationId, input.idempotencyKey) : null;
  const objectPath = input.cv ? `intents/${registrationId}/${randomUUID()}.pdf` : null;

  const registrationPayload = {
    id: registrationId,
    reference_code: reference,
    idempotency_key: input.idempotencyKey,
    request_fingerprint: requestFingerprint(input),
    full_name: input.fullName,
    email: input.email,
    organization: input.organization,
    role_or_course: input.roleOrCourse,
    graduation_year: input.graduationYear,
    country: input.country,
    city: input.city,
    github_portfolio_url: input.githubPortfolioUrl,
    linkedin_url: input.linkedinUrl,
    team_status: input.teamStatus,
    team_name: input.teamName,
    technical_background: input.technicalBackground,
    availability_online: input.availabilityOnline,
    availability_london: input.availabilityLondon,
    expected_cv_object_path: objectPath,
    expected_cv_original_filename: input.cv?.name || null,
    expected_cv_size_bytes: input.cv?.size || null,
    expected_cv_mime_type: input.cv?.type || null,
    completion_token_hash: claimToken ? sha256(claimToken) : null,
  };
  const teammates = input.teammates.map((teammate) => ({ full_name: teammate.fullName, email: teammate.email }));
  const sensitive = input.accessibilityDietary ? {
    accessibility_dietary: input.accessibilityDietary,
    consent_version: ACCESSIBILITY_CONSENT_VERSION,
    consent_text_snapshot: ACCESSIBILITY_CONSENT_TEXT,
    consent_text_sha256: sha256(ACCESSIBILITY_CONSENT_TEXT),
  } : null;
  const consents = {
    privacy_notice: {
      version: privacy.version,
      text_snapshot: privacy.textSnapshot,
      text_sha256: privacy.textSha256,
    },
    items: [
      {
        consent_kind: "privacy",
        accepted: true,
        document_version: privacy.version,
        text_snapshot: PRIVACY_CONSENT_TEXT,
        text_sha256: sha256(PRIVACY_CONSENT_TEXT),
      },
      {
        consent_kind: "rules_and_code",
        accepted: true,
        document_version: RULES_VERSION,
        text_snapshot: RULES_CONSENT_TEXT,
        text_sha256: sha256(RULES_CONSENT_TEXT),
      },
      {
        consent_kind: "cv_share_optiver",
        accepted: input.cvShareConsent,
        document_version: CV_CONSENT_VERSION,
        text_snapshot: CV_CONSENT_TEXT,
        text_sha256: sha256(CV_CONSENT_TEXT),
      },
    ],
  };

  const { data, error } = await supabase.rpc("create_registration", {
    p_registration: registrationPayload,
    p_teammates: teammates,
    p_sensitive: sensitive,
    p_consents: consents,
  });
  if (error) {
    if (error.code === "23505") {
      throw new RegistrationError(409, "A registration with this email or request reference already exists.", "duplicate_registration");
    }
    throw error;
  }

  const created = (data as CreateRegistrationRow[] | null)?.[0];
  if (!created) throw new Error("The registration transaction returned no result.");

  if (created.submission_state === "pending_upload" && created.upload_expires_at && new Date(created.upload_expires_at).getTime() <= Date.now()) {
    await deletePendingRegistration(supabase, created.registration_id);
    return startRegistration(supabase, input);
  }

  if (created.submission_state !== "pending_upload") {
    return confirmationOutcome(supabase, {
      id: created.registration_id,
      email: input.email,
      fullName: input.fullName,
      reference: created.reference_code,
      idempotencyKey: input.idempotencyKey,
    }, created.was_existing);
  }

  if (!input.cv || !created.expected_cv_object_path) {
    await deletePendingRegistration(supabase, created.registration_id);
    throw new Error("The registration upload transaction was incomplete.");
  }
  const recoveredClaimToken = completionToken(created.registration_id, input.idempotencyKey);
  let uploadPresent = false;
  try {
    uploadPresent = await uploadIsPresent(supabase, created.registration_id, created.expected_cv_object_path);
  } catch {
    await deletePendingRegistration(supabase, created.registration_id);
    throw new RegistrationError(503, "Secure CV storage is not ready. No registration was submitted.", "storage_unavailable");
  }

  let uploadToken = "";
  if (!uploadPresent) {
    const { data: capabilityReserved, error: capabilityError } = await supabase.rpc(
      "reserve_cv_upload_capability",
      {
        p_registration_id: created.registration_id,
        p_completion_token_hash: sha256(recoveredClaimToken),
      },
    );
    if (capabilityError) {
      await deletePendingRegistration(supabase, created.registration_id);
      throw new RegistrationError(503, "Secure CV storage is not ready. No registration was submitted.", "storage_unavailable");
    }
    if (!capabilityReserved) {
      await deletePendingRegistration(supabase, created.registration_id);
      return startRegistration(supabase, input);
    }
    const { data: signed, error: signError } = await supabase.storage
      .from(CV_BUCKET)
      .createSignedUploadUrl(created.expected_cv_object_path, { upsert: false });
    if (signError || !signed?.token) {
      await deletePendingRegistration(supabase, created.registration_id);
      throw new RegistrationError(503, "Secure CV storage is not ready. No registration was submitted.", "storage_unavailable");
    }
    uploadToken = signed.token;
  }

  return {
    state: "upload_required" as const,
    registrationId: created.registration_id,
    reference: created.reference_code,
    path: created.expected_cv_object_path,
    token: uploadToken,
    claimToken: recoveredClaimToken,
    bucket: CV_BUCKET,
    uploadPresent,
  };
}

export async function completeRegistration(
  supabase: SupabaseClient,
  input: { registrationId: string; claimToken: string; path: string },
): Promise<{ reference: string; emailStatus: EmailStatus; receipt: string }> {
  const hash = sha256(input.claimToken);
  const { data: registration, error } = await supabase
    .from("registrations")
    .select("id,reference_code,email,full_name,idempotency_key,expected_cv_object_path,expected_cv_size_bytes,upload_expires_at,submission_state")
    .eq("id", input.registrationId)
    .eq("completion_token_hash", hash)
    .maybeSingle();

  if (error || !registration) throw new RegistrationError(404, "This upload session is invalid or has expired.", "upload_session_invalid");
  if (registration.expected_cv_object_path !== input.path) {
    throw new RegistrationError(400, "The uploaded file does not match this registration.", "upload_path_mismatch");
  }
  if (registration.submission_state === "submitted") {
    const completed = await confirmationOutcome(supabase, {
      id: registration.id,
      email: registration.email,
      fullName: registration.full_name,
      reference: registration.reference_code,
      idempotencyKey: registration.idempotency_key,
    }, true);
    return { reference: completed.reference, emailStatus: completed.emailStatus, receipt: completed.receipt };
  }
  if (registration.submission_state !== "pending_upload") {
    throw new RegistrationError(409, "This registration can no longer accept a CV upload.", "upload_session_closed");
  }
  if (!registration.upload_expires_at || new Date(registration.upload_expires_at).getTime() < Date.now()) {
    await deletePendingRegistration(supabase, registration.id);
    throw new RegistrationError(410, "This upload session has expired. Please submit the form again.", "upload_session_expired");
  }

  const { data: leaseClaimed, error: leaseError } = await supabase.rpc("claim_cv_verification", {
    p_registration_id: registration.id,
    p_completion_token_hash: hash,
  });
  if (leaseError) {
    throw new RegistrationError(503, "The CV verification service is temporarily unavailable.", "verification_unavailable");
  }
  if (!leaseClaimed) {
    throw new RegistrationError(409, "This CV is already being verified. Please wait a moment.", "verification_in_progress");
  }

  const { data: blob, error: downloadError } = await supabase.storage.from(CV_BUCKET).download(input.path);
  if (downloadError || !blob) {
    await deletePendingRegistration(supabase, registration.id);
    throw new RegistrationError(400, "The CV upload could not be verified. No registration was submitted.", "upload_missing");
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const signature = new TextDecoder("ascii").decode(bytes.slice(0, 5));
  let validPdf = signature === "%PDF-";
  if (validPdf) {
    try {
      await PDFDocument.load(bytes, {
        ignoreEncryption: false,
        throwOnInvalidObject: true,
        updateMetadata: false,
      });
    } catch {
      validPdf = false;
    }
  }

  if (bytes.byteLength > MAX_CV_BYTES || bytes.byteLength !== registration.expected_cv_size_bytes || !validPdf) {
    await deletePendingRegistration(supabase, registration.id);
    throw new RegistrationError(400, "The CV must be a valid PDF no larger than 10 MB. No registration was submitted.", "invalid_cv");
  }

  const fileName = input.path.split("/").at(-1) || "";
  const { data: listed, error: listError } = await supabase.storage
    .from(CV_BUCKET)
    .list(`intents/${registration.id}`, { search: fileName, limit: 10 });
  if (listError) {
    await supabase.rpc("release_cv_verification", { p_registration_id: registration.id, p_completion_token_hash: hash });
    throw new RegistrationError(503, "The CV upload could not be verified yet. Please try again.", "storage_verification_unavailable");
  }
  const stored = listed?.find((item) => item.name === fileName);
  const storedMime = typeof stored?.metadata?.mimetype === "string" ? stored.metadata.mimetype : blob.type;
  if (!stored || storedMime !== "application/pdf") {
    await deletePendingRegistration(supabase, registration.id);
    throw new RegistrationError(400, "The CV must be uploaded as a PDF. No registration was submitted.", "invalid_cv_mime");
  }

  const document = {
    object_path: input.path,
    size_bytes: bytes.byteLength,
    mime_type: "application/pdf",
    sha256: sha256(bytes),
  };
  let finalized: FinalizedRegistrationRow | null = null;
  const result = await supabase.rpc("finalize_registration", {
    p_registration_id: registration.id,
    p_completion_token_hash: hash,
    p_document: document,
  });
  if (!result.error) finalized = (result.data as FinalizedRegistrationRow[] | null)?.[0] || null;

  if (result.error || !finalized) {
    const { data: committed } = await supabase
      .from("registrations")
      .select("id,reference_code,email,full_name,idempotency_key,submission_state")
      .eq("id", registration.id)
      .maybeSingle();
    if (committed?.submission_state === "submitted") {
      finalized = { ...committed, registration_id: committed.id, was_existing: true } as FinalizedRegistrationRow;
    } else if (result.error?.code === "23505") {
      await deletePendingRegistration(supabase, registration.id);
      throw new RegistrationError(409, "A submitted registration already exists for this email.", "duplicate_registration");
    } else {
      await supabase.rpc("release_cv_verification", { p_registration_id: registration.id, p_completion_token_hash: hash });
      throw result.error || new Error("The registration finalization returned no result.");
    }
  }

  const completed = await confirmationOutcome(supabase, {
    id: finalized.registration_id,
    email: finalized.email,
    fullName: finalized.full_name,
    reference: finalized.reference_code,
    idempotencyKey: finalized.idempotency_key,
  }, finalized.was_existing);
  return { reference: completed.reference, emailStatus: completed.emailStatus, receipt: completed.receipt };
}
