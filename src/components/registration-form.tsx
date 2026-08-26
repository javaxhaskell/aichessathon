"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cloneElement, FormEvent, type ReactElement, useRef, useState } from "react";

import { SponsorLockup } from "@/components/brand";
import { FINAL_DATE, QUALIFICATION_DATES } from "@/lib/event";
import { MAX_CV_BYTES, REGISTRATION_COUNTRY, type StartRegistrationResponse } from "@/lib/registration";

type Teammate = { key: number; fullName: string; email: string };
type FieldErrors = Record<string, string[] | undefined>;
type ApiFailure = { error?: string; code?: string; fieldErrors?: FieldErrors };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & ApiFailure;
  if (!response.ok) {
    const error = new Error(payload.error || "Registration could not be submitted.") as Error & { fieldErrors?: FieldErrors };
    error.fieldErrors = payload.fieldErrors;
    throw error;
  }
  return payload;
}

async function cancelPendingUpload(input: { registrationId: string; claimToken: string; path: string }) {
  await fetch("/api/registration/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => undefined);
}

export function RegistrationForm({ supabaseUrl, supabaseKey }: { supabaseUrl: string; supabaseKey: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const idempotencyKey = useRef("");
  const teammateKey = useRef(1);
  const [teamStatus, setTeamStatus] = useState<"looking_for_team" | "has_team">("looking_for_team");
  const [teammates, setTeammates] = useState<Teammate[]>([{ key: 0, fullName: "", email: "" }]);
  const [cv, setCv] = useState<File | null>(null);
  const [cvConsent, setCvConsent] = useState(false);
  const [accessibilityText, setAccessibilityText] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "uploading" | "finalizing">("idle");
  const busy = status !== "idle";

  function updateTeammate(key: number, field: "fullName" | "email", value: string) {
    setTeammates((current) => current.map((teammate) => teammate.key === key ? { ...teammate, [field]: value } : teammate));
  }

  function addTeammate() {
    if (teammates.length >= 8) return;
    setTeammates((current) => [...current, { key: teammateKey.current++, fullName: "", email: "" }]);
  }

  function removeTeammate(key: number) {
    setTeammates((current) => current.filter((teammate) => teammate.key !== key));
  }

  function onFileChange(file: File | undefined) {
    setFormError("");
    if (!file) { setCv(null); setCvConsent(false); return; }
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      setFormError("Choose a PDF file for your CV.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > MAX_CV_BYTES) {
      setFormError("Your CV must be 10 MB or smaller.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setCv(file);
  }

  function removeCv() {
    setCv(null);
    setCvConsent(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFieldErrors({});
    setFormError("");
    setStatus("saving");

    const form = new FormData(event.currentTarget);
    const graduation = String(form.get("graduationYear") || "").trim();
    const accessibility = accessibilityText.trim();
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();

    const body = {
      idempotencyKey: idempotencyKey.current,
      fullName: String(form.get("fullName") || ""),
      email: String(form.get("email") || ""),
      organization: String(form.get("organization") || ""),
      roleOrCourse: String(form.get("roleOrCourse") || ""),
      graduationYear: graduation ? Number(graduation) : null,
      country: String(form.get("country") || ""),
      city: String(form.get("city") || ""),
      githubPortfolioUrl: String(form.get("githubPortfolioUrl") || ""),
      linkedinUrl: String(form.get("linkedinUrl") || ""),
      teamStatus,
      teamName: teamStatus === "has_team" ? String(form.get("teamName") || "") : null,
      teammates: teamStatus === "has_team" ? teammates.map(({ fullName, email }) => ({ fullName, email })) : [],
      availabilityOnline: form.get("availabilityOnline") === "on",
      availabilityLondon: form.get("availabilityLondon") === "on",
      rulesAccepted: form.get("rulesAccepted") === "on",
      privacyAccepted: form.get("privacyAccepted") === "on",
      technicalBackground: String(form.get("technicalBackground") || ""),
      accessibilityDietary: accessibility,
      accessibilityConsent: Boolean(accessibility && form.get("accessibilityConsent") === "on"),
      cv: cv ? { name: cv.name, size: cv.size, type: cv.type } : null,
      cvShareConsent: Boolean(cv && cvConsent),
      website: String(form.get("website") || ""),
    };

    try {
      const started = await postJson<StartRegistrationResponse>("/api/registration/start", body);
      if (started.state === "complete") {
        router.push(`/register/confirmation?receipt=${encodeURIComponent(started.receipt)}`);
        return;
      }
      if (!cv) throw new Error("The CV file is no longer selected. No registration was submitted.");

      if (!started.uploadPresent) {
        setStatus("uploading");
        const storage = createClient(supabaseUrl, supabaseKey, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        });
        const { error: uploadError } = await storage.storage
          .from(started.bucket)
          .uploadToSignedUrl(started.path, started.token, cv, { contentType: "application/pdf" });
        if (uploadError) {
          await cancelPendingUpload({ registrationId: started.registrationId, claimToken: started.claimToken, path: started.path });
          throw new Error("The CV upload failed, so your registration was not submitted. Please try again.");
        }
      }

      setStatus("finalizing");
      const completed = await postJson<{ reference: string; emailStatus: "sent" | "not_configured" | "failed"; receipt: string }>(
        "/api/registration/complete",
        { registrationId: started.registrationId, claimToken: started.claimToken, path: started.path },
      );
      router.push(`/register/confirmation?receipt=${encodeURIComponent(completed.receipt)}`);
    } catch (error) {
      const failure = error as Error & { fieldErrors?: FieldErrors };
      if (failure.fieldErrors) setFieldErrors(failure.fieldErrors);
      setFormError(failure.message || "Registration could not be submitted. Please try again.");
      setStatus("idle");
      window.setTimeout(() => errorRef.current?.focus(), 0);
    }
  }

  const errorMessages = [formError, ...Object.values(fieldErrors).flatMap((messages) => messages || [])].filter(Boolean);
  const errorFor = (name: string) => fieldErrors[name]?.[0];
  const fieldErrorEntries = Object.entries(fieldErrors).flatMap(([field, messages]) =>
    (messages || []).map((message) => ({ field, message })),
  );
  const errorTarget = (field: string) => field === "teammates" ? "teammates" : field;

  return (
    <div className="registration-layout">
      <form className="registration-form" onSubmit={onSubmit} ref={formRef} noValidate>
        {errorMessages.length ? (
          <div className="error-summary" role="alert" tabIndex={-1} ref={errorRef}>
            <p>Registration has not been submitted.</p>
            <ul>
              {formError ? <li>{formError}</li> : null}
              {fieldErrorEntries.map(({ field, message }, index) => (
                <li key={`${field}-${message}-${index}`}><a href={`#${errorTarget(field)}`}>{message}</a></li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className="form-section" id="about-you" aria-labelledby="about-you-heading">
          <div className="form-section-heading"><span>01</span><div><h2 id="about-you-heading">About you</h2><p>Tell us how to contact you and where you are currently working or studying.</p></div></div>
          <div className="field-grid">
            <Field id="fullName" label="Full name" error={errorFor("fullName")}><input id="fullName" name="fullName" autoComplete="name" required maxLength={120} /></Field>
            <Field id="email" label="Email address" error={errorFor("email")}><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} /></Field>
            <Field id="organization" label="University or organisation" error={errorFor("organization")}><input id="organization" name="organization" autoComplete="organization" required maxLength={160} /></Field>
            <Field id="roleOrCourse" label="Course, degree, or current role" error={errorFor("roleOrCourse")}><input id="roleOrCourse" name="roleOrCourse" required maxLength={160} /></Field>
            <Field id="graduationYear" label="Graduation year" optional hint="If applicable" error={errorFor("graduationYear")}><input id="graduationYear" name="graduationYear" type="number" inputMode="numeric" min="1950" max="2040" placeholder="2027" /></Field>
            <div className="field-spacer" aria-hidden="true" />
            <Field id="country" label="Country" hint="UK only" error={errorFor("country")}>
              <select id="country" name="country" autoComplete="country-name" required defaultValue={REGISTRATION_COUNTRY}>
                <option value={REGISTRATION_COUNTRY}>{REGISTRATION_COUNTRY}</option>
              </select>
            </Field>
            <Field id="city" label="City" error={errorFor("city")}><input id="city" name="city" autoComplete="address-level2" required maxLength={100} /></Field>
            <Field id="githubPortfolioUrl" label="GitHub profile or portfolio" error={errorFor("githubPortfolioUrl")} wide><input id="githubPortfolioUrl" name="githubPortfolioUrl" type="url" inputMode="url" placeholder="https://github.com/your-name" required maxLength={500} /></Field>
            <Field id="linkedinUrl" label="LinkedIn profile" optional error={errorFor("linkedinUrl")} wide><input id="linkedinUrl" name="linkedinUrl" type="url" inputMode="url" placeholder="https://linkedin.com/in/your-name" maxLength={500} /></Field>
            <Field id="technicalBackground" label="Technical background or relevant projects" optional error={errorFor("technicalBackground")} wide><textarea id="technicalBackground" name="technicalBackground" rows={5} maxLength={2000} placeholder="A short overview of the systems, agents, or projects you have built." /></Field>
          </div>
        </section>

        <section className="form-section" aria-labelledby="team-heading">
          <div className="form-section-heading"><span>02</span><div><h2 id="team-heading">Team</h2><p>You can apply with a team or ask to be matched with one.</p></div></div>
          <fieldset className="radio-group" id="teamStatus" aria-invalid={Boolean(errorFor("teamStatus"))}>
            <legend className="sr-only">Team status</legend>
            <label className={`choice-card${teamStatus === "looking_for_team" ? " selected" : ""}`}>
              <input type="radio" name="teamStatus" value="looking_for_team" checked={teamStatus === "looking_for_team"} onChange={() => setTeamStatus("looking_for_team")} />
              <span><strong>I am looking for a team</strong><small>We will use your details to support team formation.</small></span>
            </label>
            <label className={`choice-card${teamStatus === "has_team" ? " selected" : ""}`}>
              <input type="radio" name="teamStatus" value="has_team" checked={teamStatus === "has_team"} onChange={() => setTeamStatus("has_team")} />
              <span><strong>I already have a team</strong><small>Add your team name and current teammates.</small></span>
            </label>
          </fieldset>
          {teamStatus === "has_team" ? (
            <div className="team-details">
              <Field id="teamName" label="Team name" error={errorFor("teamName")}><input id="teamName" name="teamName" required maxLength={120} /></Field>
              <div className="teammates-heading"><div><h3>Teammates</h3><p>Listing a teammate does not register them. We use these details only to identify your team.</p></div><button className="quiet-button" type="button" onClick={addTeammate} disabled={teammates.length >= 8}>Add teammate</button></div>
              {errorFor("teammates") ? <p className="field-error" id="teammates-error">{errorFor("teammates")}</p> : null}
              <div className="teammate-list" id="teammates" aria-describedby={errorFor("teammates") ? "teammates-error" : undefined}>
                {teammates.map((teammate, index) => (
                  <div className="teammate-row" key={teammate.key}>
                    <label><span>Teammate {index + 1} name</span><input required value={teammate.fullName} onChange={(event) => updateTeammate(teammate.key, "fullName", event.target.value)} maxLength={120} /></label>
                    <label><span>Teammate {index + 1} email</span><input required type="email" value={teammate.email} onChange={(event) => updateTeammate(teammate.key, "email", event.target.value)} maxLength={254} /></label>
                    {teammates.length > 1 ? <button className="remove-button" type="button" onClick={() => removeTeammate(teammate.key)} aria-label={`Remove teammate ${index + 1}`}>Remove</button> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="form-section" aria-labelledby="support-heading">
          <div className="form-section-heading"><span>03</span><div><h2 id="support-heading">Participation support</h2><p>Optional. Share only what the organising team needs to support your participation.</p></div></div>
          <Field id="accessibilityDietary" label="Accessibility or dietary requirements" optional error={errorFor("accessibilityDietary")} wide>
            <textarea id="accessibilityDietary" name="accessibilityDietary" rows={4} maxLength={1000} value={accessibilityText} onChange={(event) => setAccessibilityText(event.target.value)} />
          </Field>
          {accessibilityText.trim() ? (
            <>
              <label className="check-row sensitive-consent">
                <input id="accessibilityConsent" type="checkbox" name="accessibilityConsent" required aria-invalid={Boolean(errorFor("accessibilityConsent"))} aria-describedby={errorFor("accessibilityConsent") ? "accessibilityConsent-error" : undefined} />
                <span>I explicitly consent to AI Chessathon using this information only to support my participation.</span>
              </label>
              {errorFor("accessibilityConsent") ? <p className="field-error" id="accessibilityConsent-error">{errorFor("accessibilityConsent")}</p> : null}
            </>
          ) : null}
        </section>

        <section className="form-section" aria-labelledby="cv-heading">
          <div className="form-section-heading"><span>04</span><div><h2 id="cv-heading">CV</h2><p>Optional · PDF only · Maximum 10 MB. Top 50 by ELO from the online phase advance to the London final. Their CVs are shared with Optiver.</p></div></div>
          <div className="file-control" id="cv">
            <input className="sr-only" ref={fileRef} id="cvFile" name="cv" type="file" accept=".pdf,application/pdf" onChange={(event) => onFileChange(event.target.files?.[0])} />
            {cv ? (
              <div className="selected-file"><span aria-hidden="true">PDF</span><div><strong>{cv.name}</strong><small>{(cv.size / 1024 / 1024).toFixed(2)} MB · Private upload</small></div><button type="button" onClick={removeCv}>Remove</button></div>
            ) : (
              <label className="file-picker" htmlFor="cvFile"><span>Choose PDF</span><small>Upload is optional and does not affect eligibility.</small></label>
            )}
          </div>
          <label className={`check-row cv-consent${!cv ? " disabled" : ""}`}>
            <input id="cvShareConsent" type="checkbox" checked={cvConsent} disabled={!cv} onChange={(event) => setCvConsent(event.target.checked)} aria-invalid={Boolean(errorFor("cvShareConsent"))} aria-describedby={errorFor("cvShareConsent") ? "cvShareConsent-error" : undefined} />
            <span><strong>I consent to AI Chessathon sharing my CV with Optiver for recruitment-related opportunities.</strong><small>Declining this consent does not affect your eligibility or judging. This choice is separate from your registration.</small></span>
          </label>
          {errorFor("cvShareConsent") ? <p className="field-error" id="cvShareConsent-error">{errorFor("cvShareConsent")}</p> : null}
        </section>

        <section className="form-section" aria-labelledby="confirm-heading">
          <div className="form-section-heading"><span>05</span><div><h2 id="confirm-heading">Availability and agreements</h2><p>Please confirm each item before submitting.</p></div></div>
          <div className="check-list">
            <Check name="availabilityOnline" error={errorFor("availabilityOnline")}>I confirm that I am available for the five-day online qualification from {QUALIFICATION_DATES}.</Check>
            <Check name="availabilityLondon" error={errorFor("availabilityLondon")}>I confirm that I can attend the London final on {FINAL_DATE} if selected.</Check>
            <Check name="rulesAccepted" error={errorFor("rulesAccepted")}>I agree to comply with the <Link href="/terms" target="_blank">competition rules and code of conduct</Link>.</Check>
            <Check name="privacyAccepted" error={errorFor("privacyAccepted")}>I have read and accept the <Link href="/privacy" target="_blank">privacy notice</Link>.</Check>
          </div>
          <div className="honeypot" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
          <div className="submit-row">
            <button className="button submit-button" type="submit" disabled={busy}>
              {status === "saving" ? "Validating securely…" : status === "uploading" ? "Uploading CV securely…" : status === "finalizing" ? "Finalizing registration…" : "Submit registration"}
            </button>
            <p aria-live="polite">We use your information only to administer AI Chessathon and for any separately selected consent.</p>
          </div>
        </section>
      </form>

      <aside className="registration-aside">
        <p className="status-kicker">Event brief</p>
        <h2>AI Chessathon</h2>
        <p>Build an autonomous chess agent, qualify online, and compete in the London final.</p>
        <dl>
          <div><dt>Online phase</dt><dd>{QUALIFICATION_DATES}<br /><span>Five days · Online</span></dd></div>
          <div><dt>London final</dt><dd>{FINAL_DATE}<br /><span>Encode Club, London</span></dd></div>
          <div><dt>Eligibility</dt><dd>United Kingdom only</dd></div>
          <div><dt>Sponsor</dt><dd><SponsorLockup className="aside-sponsor" /></dd></div>
        </dl>
        <div className="aside-note"><span aria-hidden="true">i</span><p>Your CV is optional at registration and stored privately. Top 50 by ELO from the online phase advance to the London final. Their CVs are shared with Optiver.</p></div>
      </aside>
    </div>
  );
}

type AriaControlProps = { "aria-invalid"?: boolean; "aria-describedby"?: string };

function Field({ id, label, optional, hint, error, wide, children }: { id: string; label: string; optional?: boolean; hint?: string; error?: string; wide?: boolean; children: ReactElement<AriaControlProps> }) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const control = cloneElement(children, {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  });
  return (
    <label className={`field${wide ? " field-wide" : ""}`} htmlFor={id}>
      <span className="field-label">{label}{optional ? <small>Optional</small> : null}</span>
      {hint ? <small className="field-hint" id={`${id}-hint`}>{hint}</small> : null}
      {control}
      {error ? <span className="field-error" id={`${id}-error`}>{error}</span> : null}
    </label>
  );
}

function Check({ name, error, children }: { name: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="check-row"><input id={name} type="checkbox" name={name} required aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} /><span>{children}</span></label>
      {error ? <p className="field-error" id={`${name}-error`}>{error}</p> : null}
    </div>
  );
}
