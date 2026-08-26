import Link from "next/link";

import { AgentPipeline } from "@/components/agent-pipeline";
import { SponsorLockup } from "@/components/brand";
import { Faq } from "@/components/faq";
import { HowItWorks } from "@/components/how-it-works";
import { OrganisingTeam } from "@/components/organising-team";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Sponsors } from "@/components/sponsors";
import { TournamentStage } from "@/components/tournament-stage";
import { FINAL_DATE } from "@/lib/event";
import { CONTACT_EMAIL } from "@/lib/registration";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="hero section-shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <SponsorLockup />
            <h1 id="hero-title">Build a chess agent. Put it on the board.</h1>
            <p className="hero-intro">
              The UK&apos;s first chess hackathon.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/register">Register now</Link>
              <a className="text-link" href="#format">See the format <span aria-hidden="true">↘</span></a>
            </div>
            <dl className="event-facts">
              <div><dt>Qualification</dt><dd><time dateTime="2026-09-07">7</time>–<time dateTime="2026-09-11">11 September 2026</time> · Online</dd></div>
              <div><dt>Final</dt><dd><time dateTime="2026-09-12">{FINAL_DATE}</time> · Encode Club, London</dd></div>
            </dl>
          </div>
          <TournamentStage />
        </section>

        <OrganisingTeam />

        <section className="positioning-section section-shell" id="challenge" aria-labelledby="positioning-title">
          <p className="section-index">02 · The challenge</p>
          <h2 id="positioning-title" className="sr-only">The challenge</h2>
          <AgentPipeline />
        </section>

        <HowItWorks />

        <section className="build-section section-shell" aria-labelledby="build-title">
          <div className="section-heading" data-reveal><p className="section-index">04 · What matters</p><h2 id="build-title">What matters in competition.</h2></div>
          <div className="principle-grid" data-reveal>
            <article><span>01</span><h3>Agent design</h3><p>Turn board states into effective decisions.</p></article>
            <article><span>02</span><h3>Match performance</h3><p>Compete directly against other agents. Ranking is by ELO.</p></article>
            <article><span>03</span><h3>Robust execution</h3><p>Legal moves, time discipline, and reliable deployment all count.</p></article>
          </div>
        </section>

        <Sponsors />

        <Faq />

        <section className="cta-section section-shell" aria-labelledby="cta-title" data-reveal>
          <h2 id="cta-title">Put it on the board?</h2>
          <div><Link className="button" href="/register">Register now</Link><p>Questions? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
