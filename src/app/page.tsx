import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TournamentStage } from "@/components/tournament-stage";
import { FINAL_DATE, QUALIFICATION_DATES } from "@/lib/event";
import { CONTACT_EMAIL } from "@/lib/registration";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="hero section-shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="sponsor-line"><span aria-hidden="true" />Sponsored by Optiver</p>
            <h1 id="hero-title">Build an AI chess agent. Put it on the board.</h1>
            <p className="hero-intro">
              An engineering competition for autonomous chess agents. Qualify
              online, then compete in London.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/register">Register now</Link>
              <a className="text-link" href="#format">See the format <span aria-hidden="true">↘</span></a>
            </div>
            <dl className="event-facts">
              <div><dt>Qualification</dt><dd><time dateTime="2026-09-07">7</time>–<time dateTime="2026-09-11">11 September 2026</time> · Online</dd></div>
              <div><dt>Final</dt><dd><time dateTime="2026-09-12">{FINAL_DATE}</time> · London</dd></div>
            </dl>
          </div>
          <TournamentStage />
        </section>

        <section className="positioning-section section-shell" aria-labelledby="positioning-title">
          <p className="section-index" data-reveal>01 · The challenge</p>
          <div className="positioning-grid" data-reveal>
            <h2 id="positioning-title">Chess is the test environment. Engineering is the competition.</h2>
            <div><p>Build a reliable agent and test it against other entrants under match conditions. Results are decided on the board.</p></div>
          </div>
        </section>

        <section className="format-section section-shell" id="format" aria-labelledby="format-title">
          <div className="section-heading" data-reveal><p className="section-index">02 · Format</p><h2 id="format-title">Three steps to the final.</h2></div>
          <ol className="timeline" data-reveal>
            <li><span>01</span><div><p>Register</p><small>Tell us about your background, links, and team status.</small></div><b>Online form</b></li>
            <li><span>02</span><div><p>Online qualification</p><small>Five days of agent matches, {QUALIFICATION_DATES}.</small></div><b>Online</b></li>
            <li><span>03</span><div><p>London final</p><small>Selected finalists compete in person on {FINAL_DATE}.</small></div><b>London</b></li>
          </ol>
        </section>

        <section className="build-section section-shell" aria-labelledby="build-title">
          <div className="section-heading" data-reveal><p className="section-index">03 · What matters</p><h2 id="build-title">What matters in competition.</h2></div>
          <div className="principle-grid" data-reveal>
            <article><span>01</span><h3>Agent design</h3><p>Turn board states into effective decisions.</p></article>
            <article><span>02</span><h3>Match performance</h3><p>Compete directly against other agents.</p></article>
            <article><span>03</span><h3>Robust execution</h3><p>Legal moves, time discipline, and reliable deployment all count.</p></article>
          </div>
        </section>

        <section className="cta-section section-shell" aria-labelledby="cta-title" data-reveal>
          <h2 id="cta-title">Register for AI Chessathon.</h2>
          <div><Link className="button" href="/register">Register now</Link><p>Questions? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
