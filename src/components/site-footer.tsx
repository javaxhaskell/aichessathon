import Link from "next/link";

import { CONTACT_EMAIL } from "@/lib/registration";

export function SiteFooter() {
  return (
    <footer className="site-footer section-shell">
      <div className="footer-brand">
        <p>AI Chessathon</p>
        <span>Sponsored by Optiver</span>
      </div>
      <div className="footer-links">
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Competition rules</Link>
        <Link href="/archive">Archive</Link>
      </div>
      <p className="footer-note">© 2026 AI Chessathon</p>
    </footer>
  );
}
