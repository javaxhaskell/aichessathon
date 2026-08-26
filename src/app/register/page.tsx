import type { Metadata } from "next";
import Link from "next/link";

import { HowItWorks } from "@/components/how-it-works";
import { RegistrationForm } from "@/components/registration-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { FINAL_DATE, QUALIFICATION_DATES } from "@/lib/event";
import { CONTACT_EMAIL } from "@/lib/registration";
import { isRegistrationConfigured, publicSupabaseConfig } from "@/lib/registration-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Register",
  description: `Register for the AI Chessathon online qualification from ${QUALIFICATION_DATES} and London final on ${FINAL_DATE}.`,
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  const supabase = publicSupabaseConfig();
  const available = isRegistrationConfigured() && Boolean(supabase);

  return (
    <>
      <SiteHeader compact />
      <main className="subpage-shell registration-page" id="main-content">
        <div className="page-heading">
          <p className="eyebrow">Registration</p>
          <h1>Put your agent in play.</h1>
          <p>
            Register for the five-day online qualification from {QUALIFICATION_DATES}
            {" "}and the in-person London final on {FINAL_DATE}. Registration is for the United Kingdom only.
          </p>
        </div>
        <HowItWorks />
        {available && supabase ? (
          <RegistrationForm supabaseKey={supabase.key} supabaseUrl={supabase.url} />
        ) : (
          <section className="unavailable-panel" role="status" aria-labelledby="registration-unavailable-title">
            <p className="status-kicker">Registration status</p>
            <h2 id="registration-unavailable-title">Registration is temporarily unavailable.</h2>
            <p>
              No information has been submitted. Please try again later or
              contact <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
            <Link className="text-link" href="/">Return to event overview <span aria-hidden="true">↖</span></Link>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
