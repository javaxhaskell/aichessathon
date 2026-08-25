import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { verifyConfirmationReceipt } from "@/lib/confirmation-receipt";
import { CONTACT_EMAIL } from "@/lib/registration";

export const metadata: Metadata = {
  title: "Registration received",
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ receipt?: string }> }) {
  const params = await searchParams;
  const confirmation = verifyConfirmationReceipt(params.receipt);
  if (!confirmation) redirect("/register");

  return (
    <>
      <SiteHeader compact />
      <main className="confirmation-shell" id="main-content">
        <section className="confirmation-card">
          <span className="confirmation-mark" aria-hidden="true">✓</span>
          <p className="eyebrow">Registration complete</p>
          <h1>Registration received.</h1>
          <p>Thank you for registering for AI Chessathon. We will be in touch with qualification dates and participant information.</p>
          <div className="reference-block"><span>Your reference</span><strong>{confirmation.reference}</strong></div>
          {confirmation.emailStatus === "sent" ? (
            <p className="confirmation-email">A confirmation has been sent to your email address.</p>
          ) : (
            <p className="confirmation-email">Your registration is saved, but a confirmation email was not sent. Please keep your reference and contact <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if you need help.</p>
          )}
          <Link className="button" href="/">Return to AI Chessathon</Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
