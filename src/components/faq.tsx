"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

import { FINAL_DATE, QUALIFICATION_DATES } from "@/lib/event";
import { CONTACT_EMAIL, CV_SHARING_PUBLIC_COPY } from "@/lib/registration";

const items: Array<{ id: string; question: string; answer: ReactNode }> = [
  {
    id: "what",
    question: "What is AI Chessathon?",
    answer:
      "An engineering competition for autonomous chess agents. Chess is the test environment. Results are decided on the board.",
  },
  {
    id: "who",
    question: "Who can register?",
    answer:
      "Registration is for the United Kingdom only. Register through the site form. You will be asked for background, organisation, links, and team status, and to confirm availability for both phases.",
  },
  {
    id: "format",
    question: "What is the format?",
    answer: `Five days of online qualification, ${QUALIFICATION_DATES}. Ranking is by ELO. Top 50 from the online phase advance to the London final. The in-person final is on ${FINAL_DATE}, hosted at Encode Club, London. ${CV_SHARING_PUBLIC_COPY} The technical specification will be published before qualification begins.`,
  },
  {
    id: "team",
    question: "Can I enter with a team?",
    answer:
      "Yes. Register solo, with an existing team, or ask to be matched with one. Teammates are optional. Listing a teammate does not register them.",
  },
  {
    id: "cost",
    question: "Is there a ticket price?",
    answer: "No. It’s free of charge.",
  },
  {
    id: "judging",
    question: "How are results decided?",
    answer:
      "On the board. Ranking is by ELO.",
  },
  {
    id: "cv",
    question: "Do I have to share my CV with Optiver?",
    answer:
      CV_SHARING_PUBLIC_COPY,
  },
  {
    id: "rules",
    question: "Where are the rules and privacy notice?",
    answer: (
      <>
        The <Link href="/terms">competition rules</Link> and{" "}
        <Link href="/privacy">privacy notice</Link> are on this site.
      </>
    ),
  },
  {
    id: "contact",
    question: "How do I contact the organisers?",
    answer: (
      <>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </>
    ),
  },
];

export function Faq() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="faq-section section-shell" id="questions" aria-labelledby="questions-title">
      <div className="section-heading" data-reveal>
        <p className="section-index">06 · FAQ</p>
        <h2 id="questions-title">Questions</h2>
      </div>
      <div className="faq-list" data-reveal>
        {items.map((item) => {
          const open = openId === item.id;
          const panelId = `faq-${item.id}-panel`;
          const buttonId = `faq-${item.id}-button`;

          return (
            <div className="faq-item" key={item.id} data-open={open ? "true" : undefined}>
              <h3 className="faq-question">
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenId(open ? null : item.id)}
                >
                  <span>{item.question}</span>
                  <svg className="faq-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                    <path
                      d="M3.2 5.6 8 10.4l4.8-4.8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </h3>
              <div className="faq-panel" id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}>
                <p>{item.answer}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
