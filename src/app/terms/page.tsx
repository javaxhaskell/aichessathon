import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { FINAL_DATE, QUALIFICATION_DATES } from "@/lib/event";
import { CONTACT_EMAIL, RULES_VERSION } from "@/lib/registration";

export const metadata: Metadata = {
  title: "Competition rules and code of conduct",
  description: `AI Chessathon competition rules for the online qualification from ${QUALIFICATION_DATES} and London final on ${FINAL_DATE}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader compact />
      <main className="legal-shell" id="main-content">
        <header className="legal-heading">
          <p className="eyebrow">Competition · {RULES_VERSION}</p>
          <h1>Rules and code of conduct</h1>
          <p>Initial competition framework · Technical specifications will be published before qualification begins.</p>
        </header>
        <div className="legal-layout">
          <nav className="legal-nav" aria-label="Competition rule sections"><a href="#format">Format</a><a href="#agents">Agent rules</a><a href="#fair-play">Fair play</a><a href="#conduct">Code of conduct</a><a href="#data">Data and IP</a><a href="#changes">Updates</a></nav>
          <article className="legal-copy">
            <section id="format"><h2>1. Competition format</h2><p>AI Chessathon is an AI chess engineering competition. It begins with a five-day online qualification phase from {QUALIFICATION_DATES}. Selected participants will be invited to an in-person final in London on {FINAL_DATE}. Match cadence, time controls, team-size limits, selection criteria, and the final technical specification will be announced before the competition begins.</p><p>Participants must provide accurate registration information and confirm availability for both phases. An invitation to the final is personal to the selected participant or team and may not be transferred without organiser approval.</p></section>
            <section id="agents"><h2>2. Agents and submissions</h2><p>Participants must build and operate their own chess agent within the published interface, compute, network, and time limits. Permitted open-source libraries, pretrained models, external services, hardware, and collaboration rules will be set out in the technical specification. Participants must disclose components and assistance when the specification requires it.</p><p>Agents must produce legal moves, operate reliably, and must not attempt to access another participant’s system, hidden match data, organiser infrastructure, or credentials.</p></section>
            <section id="fair-play"><h2>3. Fair play and enforcement</h2><p>No participant may manipulate pairings, coordinate match outcomes, impersonate another entrant, exploit infrastructure outside the intended game interface, or misrepresent authorship. Suspected vulnerabilities should be reported privately to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and not used for advantage.</p><p>Organisers may pause a match, request logs or a reproducible build, rerun a match affected by a verified technical problem, or disqualify a submission for a material breach. Decisions will be based on the published rules, available evidence, and consistent treatment of participants. An appeal process will accompany the final technical rules.</p></section>
            <section id="conduct"><h2>4. Code of conduct</h2><p>Participants must treat other participants, organisers, venue staff, and online communities with respect. Harassment, discrimination, threats, deliberate disruption, doxxing, or retaliation are not permitted. Communicate constructively, respect personal boundaries, and follow reasonable safety and venue instructions.</p><p>Report conduct concerns to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Reports will be handled as privately as reasonably possible and shared only with people who need to respond.</p></section>
            <section id="data"><h2>5. Intellectual property and event data</h2><p>Participants retain ownership of their original agent code. Entry grants the organisers only the limited rights needed to run, test, review, and record the competition. Any separate request to publish code, demonstrations, participant profiles, photography, or recordings will be explained before use.</p><p>Match results, pairings, rulings, and factual event records may be published. Private registration data and CVs are handled under the privacy notice.</p></section>
            <section id="changes"><h2>6. Updates and precedence</h2><p>This page is the initial competition framework. The published technical specification will complete the operational rules before qualification begins. Material changes will be versioned and communicated to registered participants, who will be asked to acknowledge any change that materially affects participation. If documents conflict, the latest dated competition rules take precedence for competition matters.</p><p>Questions can be sent to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p></section>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
