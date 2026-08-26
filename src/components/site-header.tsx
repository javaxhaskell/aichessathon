import Link from "next/link";

import { BrandLockup } from "@/components/brand";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`site-header${compact ? " site-header-compact" : ""}`}>
      <BrandLockup priority animate />
      <nav className="nav-links" aria-label="Primary navigation">
        <Link href="/#format">Format</Link>
        <Link href="/#team">Team</Link>
        <Link href="/terms">Competition rules</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
      <Link className="button button-small" href="/register">Register</Link>
    </header>
  );
}
