import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { OptiverMark } from "@/components/optiver-mark";

export function BrandLockup(_props?: { priority?: boolean; animate?: boolean }) {
  return (
    <Link className="wordmark" href="/" aria-label="AI Chessathon home">
      <BrandMark />
      <span>AI Chessathon</span>
    </Link>
  );
}

export function SponsorLockup({ className = "sponsor-line" }: { className?: string }) {
  return (
    <p className={className}>
      <span className="sponsor-kicker">Sponsored by</span>
      <OptiverMark className="sponsor-logo" />
    </p>
  );
}
