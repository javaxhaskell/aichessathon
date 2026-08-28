import Link from "next/link";

import { FINAL_DATE, QUALIFICATION_DATES } from "@/lib/event";
import { CV_SHARING_PUBLIC_COPY } from "@/lib/registration";

const steps = [
  {
    label: "Register",
    index: "01",
    copy: "Tell us about your background, links, and team status.",
  },
  {
    label: "Qualify",
    index: "02",
    copy: `Five-day online tournament of agent matches, ${QUALIFICATION_DATES}. Ranking is by ELO. Top 50 from the online phase advance to the London final.`,
    extra: <p className="how-meta">Online</p>,
  },
  {
    label: "Final",
    index: "03",
    copy: `The top 50 by ELO ranking compete in person on ${FINAL_DATE}, hosted at Encode Club, London. ${CV_SHARING_PUBLIC_COPY}`,
    extra: <p className="how-meta">London</p>,
  },
] as const;

export function HowItWorks({ formHref = "/register#about-you" }: { formHref?: string }) {
  return (
    <section className="format-section section-shell" id="format" aria-labelledby="format-title">
      <div className="section-heading" data-reveal>
        <p className="section-index">03 · Format</p>
        <h2 id="format-title">Three steps to the final.</h2>
      </div>
      <ol className="how-steps" data-reveal>
        {steps.map((step) => (
          <li className="how-step" key={step.index}>
            <p className="how-label" id={`format-step-${step.index}`}>{step.label}</p>
            <div className="how-rail">
              <span className="how-marker" aria-hidden="true" />
            </div>
            <article className="how-body" aria-labelledby={`format-step-${step.index}`}>
              <span>{step.index}</span>
              <p>{step.copy}</p>
              {"extra" in step ? step.extra : (
                formHref.includes("#") ? (
                  <a className="how-meta" href={formHref}>
                    Site form
                  </a>
                ) : (
                  <Link className="how-meta" href={formHref}>
                    Site form
                  </Link>
                )
              )}
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
