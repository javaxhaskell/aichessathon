import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Archive",
  description: "The future factual record of AI Chessathon.",
  alternates: { canonical: "/archive" },
};

export default function ArchivePage() {
  return (
    <>
      <SiteHeader compact />
      <main className="archive-shell" id="main-content">
        <p className="eyebrow">Event archive</p>
        <h1>The record comes after the games.</h1>
        <p>AI Chessathon is scheduled for 2026 and has not yet taken place. After the competition, this archive will provide a factual record of the format, matches, results, and published materials.</p>
        <div className="archive-grid"><article><span>01</span><h2>Qualification</h2><p>Dates, format, and verified outcomes will be added after the online phase.</p></article><article><span>02</span><h2>London final</h2><p>A record of the 12 September 2026 final will be published after it takes place.</p></article><article><span>03</span><h2>Technical record</h2><p>Public rules, match data, and approved participant material will be preserved here.</p></article></div>
        <Link className="button" href="/">View the upcoming event</Link>
      </main>
      <SiteFooter />
    </>
  );
}
