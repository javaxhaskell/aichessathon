import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader compact />
      <main className="confirmation-shell" id="main-content">
        <section className="confirmation-card">
          <p className="eyebrow">404 · No match</p>
          <h1>This square is empty.</h1>
          <p>The page you requested does not exist or has moved.</p>
          <Link className="button" href="/">Return to AI Chessathon</Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
