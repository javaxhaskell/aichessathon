import { OptiverMark } from "@/components/optiver-mark";

export const OPTIVER_CAREERS_URL =
  "https://optiver.com/working-at-optiver/career-opportunities/";

export function Sponsors() {
  return (
    <section className="sponsors-section section-shell" id="sponsors" aria-labelledby="sponsors-title">
      <div className="sponsors-heading" data-reveal>
        <p className="section-index">05 · Our sponsor</p>
        <h2 id="sponsors-title">Our Sponsor</h2>
      </div>
      <div className="sponsor-grid">
        <a
          className="sponsor-card"
          href={OPTIVER_CAREERS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Optiver careers (opens in a new tab)"
        >
          <OptiverMark className="sponsor-card-logo" />
        </a>
      </div>
    </section>
  );
}
