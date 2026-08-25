import "server-only";

import { FINAL_DATE, QUALIFICATION_DATES } from "@/lib/event";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/registration";

export type EmailStatus = "sent" | "not_configured" | "failed";

export async function sendConfirmationEmail(input: {
  email: string;
  fullName: string;
  reference: string;
  idempotencyKey: string;
}): Promise<{ status: EmailStatus; providerId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { status: "not_configured" };

  const from = process.env.EMAIL_FROM || `AI Chessathon <${CONTACT_EMAIL}>`;
  const firstName = input.fullName.trim().split(/\s+/)[0] || "there";
  const text = [
    `Hi ${firstName},`,
    "",
    "Your AI Chessathon registration has been received.",
    `Reference: ${input.reference}`,
    "",
    `The competition begins with a five-day online qualification phase from ${QUALIFICATION_DATES}, followed by the London final on ${FINAL_DATE}.`,
    "We will contact you with participant information and the remaining competition details.",
    "",
    `Competition rules: ${SITE_URL}/terms`,
    `Privacy notice: ${SITE_URL}/privacy`,
    "",
    `Questions? Reply to this email or contact ${CONTACT_EMAIL}.`,
    "",
    "AI Chessathon",
    "Sponsored by Optiver",
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        reply_to: process.env.EMAIL_REPLY_TO || CONTACT_EMAIL,
        subject: `AI Chessathon registration · ${input.reference}`,
        text,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const result = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) return { status: "failed", error: result.message || `Email provider returned ${response.status}.` };
    return { status: "sent", providerId: result.id };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Email delivery failed." };
  }
}
