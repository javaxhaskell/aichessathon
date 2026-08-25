import "server-only";

import { RULES_VERSION } from "@/lib/registration";

export function isRegistrationConfigured() {
  const controller = process.env.REGISTRATION_LEGAL_CONTROLLER_NAME?.trim();
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    controller && controller.length >= 3 &&
    process.env.REGISTRATION_RULES_APPROVED === RULES_VERSION &&
    process.env.RATE_LIMIT_HMAC_SECRET &&
    process.env.CRON_SECRET,
  );
}

export function publicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}
