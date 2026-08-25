import { NextResponse } from "next/server";
import { z } from "zod";

import { isRegistrationConfigured } from "@/lib/registration-config";
import {
  assertSameOrigin,
  cancelPendingRegistration,
  readSmallJson,
  RegistrationError,
} from "@/lib/registration-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const cancellationSchema = z.object({
  registrationId: z.string().uuid(),
  claimToken: z.string().min(32).max(128),
  path: z.string().min(1).max(300),
}).strict();

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isRegistrationConfigured()) {
    return response({ error: "Registration is temporarily unavailable.", code: "registration_unavailable" }, 503);
  }

  try {
    assertSameOrigin(request);
    const parsed = cancellationSchema.safeParse(await readSmallJson(request, 8 * 1024));
    if (!parsed.success) throw new RegistrationError(400, "The cancellation request is invalid.", "invalid_cancellation");
    await cancelPendingRegistration(createSupabaseAdmin(), parsed.data);
    return response({ success: true });
  } catch (error) {
    if (error instanceof RegistrationError) return response({ error: error.message, code: error.code }, error.status);
    console.error("Registration cancellation failed", error instanceof Error ? error.message : "Unknown error");
    return response({ error: "The pending upload could not be cancelled immediately." }, 500);
  }
}
