import { NextResponse } from "next/server";
import { z } from "zod";

import { isRegistrationConfigured } from "@/lib/registration-config";
import {
  assertSameOrigin,
  completeRegistration,
  enforceRateLimit,
  readSmallJson,
  RegistrationError,
} from "@/lib/registration-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const completionSchema = z.object({
  registrationId: z.string().uuid(),
  claimToken: z.string().min(32).max(128),
  path: z.string().min(1).max(300),
}).strict();

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
    await enforceRateLimit(supabase, request, "complete");
    const parsed = completionSchema.safeParse(await readSmallJson(request, 8 * 1024));
    if (!parsed.success) throw new RegistrationError(400, "The upload confirmation is invalid.", "invalid_completion");
    return response(await completeRegistration(supabase, parsed.data));
  } catch (error) {
    if (error instanceof RegistrationError) return response({ error: error.message, code: error.code }, error.status);
    console.error("Registration completion failed", error instanceof Error ? error.message : "Unknown error");
    return response({ error: "The CV could not be verified, so the registration was not submitted. Please try again.", code: "completion_failed" }, 500);
  }
}
