import { NextResponse } from "next/server";

import { registrationSchema } from "@/lib/registration";
import { isRegistrationConfigured } from "@/lib/registration-config";
import {
  assertSameOrigin,
  enforceRateLimit,
  readSmallJson,
  RegistrationError,
  startRegistration,
} from "@/lib/registration-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isRegistrationConfigured()) {
    return response({ error: "Registration is temporarily unavailable. No information has been submitted.", code: "registration_unavailable" }, 503);
  }

  try {
    assertSameOrigin(request);
    const supabase = createSupabaseAdmin();
    await enforceRateLimit(supabase, request);
    const body = await readSmallJson(request);
    const parsed = registrationSchema.safeParse(body);
    if (!parsed.success) {
      return response({
        error: "Please review the highlighted registration details.",
        code: "validation_error",
        fieldErrors: parsed.error.flatten().fieldErrors,
      }, 400);
    }
    if (parsed.data.website) {
      throw new RegistrationError(400, "The registration could not be verified.", "spam_detected");
    }
    return response(await startRegistration(supabase, parsed.data));
  } catch (error) {
    if (error instanceof RegistrationError) return response({ error: error.message, code: error.code }, error.status);
    console.error("Registration start failed", error instanceof Error ? error.message : "Unknown error");
    return response({ error: "Registration could not be saved. No information has been submitted. Please try again.", code: "registration_failed" }, 500);
  }
}
