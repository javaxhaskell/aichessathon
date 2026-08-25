import { NextResponse } from "next/server";

import { isRegistrationConfigured } from "@/lib/registration-config";
import { flushStorageCleanupQueue } from "@/lib/registration-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isRegistrationConfigured()) {
    return NextResponse.json({ error: "Registration storage is not configured." }, { status: 503 });
  }

  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();
  const deadline = Date.now() + 45_000;
  let cleaned = 0;
  let registrationCleanupFailed = false;
  while (Date.now() < deadline) {
    const { data: expired, error } = await supabase
      .from("registrations")
      .select("id")
      .eq("submission_state", "pending_upload")
      .lt("upload_expires_at", now)
      .limit(100);
    if (error) {
      registrationCleanupFailed = true;
      break;
    }
    const ids = (expired || []).map((registration) => registration.id);
    if (!ids.length) break;
    const { count, error: deleteError } = await supabase
      .from("registrations")
      .delete({ count: "exact" })
      .in("id", ids)
      .eq("submission_state", "pending_upload");
    if (deleteError) {
      registrationCleanupFailed = true;
      break;
    }
    cleaned += count || 0;
    if (ids.length < 100) break;
  }

  const { error: attemptsError } = await supabase
    .from("registration_attempts")
    .delete()
    .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  let filesRemoved = 0;
  let storageCleanupFailed = false;
  while (Date.now() < deadline) {
    try {
      const removed = await flushStorageCleanupQueue(supabase, 100);
      filesRemoved += removed;
      if (removed < 100) break;
    } catch {
      storageCleanupFailed = true;
      break;
    }
  }

  if (registrationCleanupFailed || storageCleanupFailed || attemptsError) {
    return NextResponse.json({
      error: "Cleanup was only partially completed and will be retried.",
      cleaned,
      filesRemoved,
    }, { status: 503 });
  }
  return NextResponse.json({ success: true, cleaned, filesRemoved });
}
