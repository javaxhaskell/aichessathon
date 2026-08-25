import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export type ConfirmationEmailStatus = "sent" | "not_configured" | "failed";

type ReceiptPayload = {
  reference: string;
  emailStatus: ConfirmationEmailStatus;
  expiresAt: number;
};

function receiptSecret() {
  const secret = process.env.RATE_LIMIT_HMAC_SECRET;
  if (!secret) throw new Error("Confirmation receipts are not configured.");
  return secret;
}

function signature(payload: string) {
  return createHmac("sha256", receiptSecret())
    .update(`aichessathon-confirmation-v1:${payload}`)
    .digest("base64url");
}

export function createConfirmationReceipt(reference: string, emailStatus: ConfirmationEmailStatus) {
  const payload: ReceiptPayload = {
    reference,
    emailStatus,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyConfirmationReceipt(receipt: string | undefined): ReceiptPayload | null {
  if (!receipt || receipt.length > 600) return null;
  const [encoded, supplied, extra] = receipt.split(".");
  if (!encoded || !supplied || extra) return null;

  try {
    const expected = Buffer.from(signature(encoded), "base64url");
    const actual = Buffer.from(supplied, "base64url");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<ReceiptPayload>;
    if (!/^ACH-[A-F0-9]{10}$/.test(payload.reference || "")) return null;
    if (!(["sent", "not_configured", "failed"] as const).includes(payload.emailStatus as ConfirmationEmailStatus)) return null;
    if (typeof payload.expiresAt !== "number" || payload.expiresAt < Date.now()) return null;
    return payload as ReceiptPayload;
  } catch {
    return null;
  }
}
