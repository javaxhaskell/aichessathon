import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TournamentStage } from "@/components/tournament-stage";
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
              An engineering competition for people building autonomous agents
              that compete in chess matches. Qualify online, then face the
              finalists in London.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/register">Register now</Link>
              <a className="text-link" href="#format">View competition format <span aria-hidden="true">↘</span></a>
            </div>
            <dl className="event-facts">
              <div><dt>Qualification</dt><dd>Five days · Online</dd></div>
              <div><dt>Final</dt><dd>12 September 2026 · London</dd></div>
            </dl>
          </div>
          <TournamentStage />
        </section>

        <section className="positioning-section section-shell" aria-labelledby="positioning-title">
          <p className="section-index">01 · The challenge</p>
          <div className="positioning-grid">
            <h2 id="positioning-title">Chess is the test environment. Engineering is the competition.</h2>
            <div><p>Design an agent, make its decisions reliable under time pressure, and test it against systems built by other participants. Performance is decided on the board.</p><p>No theatre. No black-box demos. Just agents making moves inside a shared competitive environment.</p></div>
          </div>
        </section>

        <section className="format-section section-shell" id="format" aria-labelledby="format-title">
          <div className="section-heading"><p className="section-index">02 · Format</p><h2 id="format-title">From registration to the final board.</h2></div>
          <ol className="timeline">
            <li><span>01</span><div><p>Register</p><small>Tell us about your background, links, and team status.</small></div><b>Online form</b></li>
            <li><span>02</span><div><p>Online qualification</p><small>Five days of agent matches. Exact dates will be announced.</small></div><b>Online</b></li>
            <li><span>03</span><div><p>London final</p><small>Selected finalists compete in person on 12 September 2026.</small></div><b>London</b></li>
          </ol>
        </section>

        <section className="build-section section-shell" aria-labelledby="build-title">
          <div className="section-heading"><p className="section-index">03 · What matters</p><h2 id="build-title">Build for the whole match.</h2></div>
          <div className="principle-grid">
            <article><span>01</span><h3>Agent design</h3><p>Turn chess state into clear, effective decisions through a system you can explain and improve.</p></article>
            <article><span>02</span><h3>Match performance</h3><p>Your agent is tested against other agents—not a static benchmark or a rehearsed scenario.</p></article>
            <article><span>03</span><h3>Robust execution</h3><p>Reliability, legal moves, time discipline, and repeatable deployment are part of the engineering problem.</p></article>
          </div>
        </section>

        <section className="cta-section section-shell" aria-labelledby="cta-title">
          <p className="sponsor-line"><span aria-hidden="true" />Sponsored by Optiver</p>
          <h2 id="cta-title">Ready to put your agent in play?</h2>
          <div><Link className="button" href="/register">Start registration</Link><p>Questions? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
