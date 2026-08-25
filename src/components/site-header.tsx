import Link from "next/link";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`site-header${compact ? " site-header-compact" : ""}`}>
      <Link className="wordmark" href="/" aria-label="AI Chessathon home">
        <span className="wordmark-mark" aria-hidden="true">AC</span>
        <span>AI Chessathon</span>
      </Link>
      <nav className="nav-links" aria-label="Primary navigation">
        <Link href="/#format">Format</Link>
        <Link href="/terms">Competition rules</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
      <Link className="button button-small" href="/register">Register</Link>
    </header>
  );
}
