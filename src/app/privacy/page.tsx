import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CONTACT_EMAIL, PRIVACY_NOTICE_VERSION } from "@/lib/registration";
import { getPrivacyNotice, PRIVACY_NOTICE_EFFECTIVE_DATE } from "@/lib/privacy-notice";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How AI Chessathon collects, uses, stores, and shares registration information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const sections = getPrivacyNotice();
  return (
    <>
      <SiteHeader compact />
      <main className="legal-shell" id="main-content">
        <header className="legal-heading">
          <p className="eyebrow">Legal · {PRIVACY_NOTICE_VERSION}</p>
          <h1>Privacy notice</h1>
          <p>Effective {PRIVACY_NOTICE_EFFECTIVE_DATE} · This notice applies to AI Chessathon registration and participation.</p>
        </header>
        <div className="legal-layout">
          <nav className="legal-nav" aria-label="Privacy notice sections">
            {sections.map((section) => <a href={`#${section.id}`} key={section.id}>{section.navLabel}</a>)}
          </nav>
          <article className="legal-copy">
            {sections.map((section) => (
              <section id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <PrivacyParagraph key={paragraph} text={paragraph} />)}
              </section>
            ))}
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function PrivacyParagraph({ text }: { text: string }) {
  const parts = text.split(CONTACT_EMAIL);
  return (
    <p>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {index > 0 ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : null}
          {part}
        </span>
      ))}
    </p>
  );
}
