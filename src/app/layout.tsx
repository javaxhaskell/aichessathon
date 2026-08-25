import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://aichessathon.com"),
  title: { default: "AI Chessathon — Build an agent. Put it on the board.", template: "%s | AI Chessathon" },
  description:
    "An AI chess engineering competition with a five-day online qualification and an in-person London final on 12 September 2026.",
  alternates: { canonical: "/" },
  applicationName: "AI Chessathon",
  keywords: ["AI Chessathon", "AI chess", "chess agents", "engineering competition", "London"],
  authors: [{ name: "AI Chessathon" }],
  creator: "AI Chessathon",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "/",
    siteName: "AI Chessathon",
    title: "AI Chessathon — Build an agent. Put it on the board.",
    description: "Five-day online qualification. London final on 12 September 2026. Sponsored by Optiver.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "AI Chessathon — autonomous agents competing on the board" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Chessathon — Build an agent. Put it on the board.",
    description: "Five-day online qualification. London final on 12 September 2026. Sponsored by Optiver.",
    images: ["/opengraph-image"],
  },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#06080b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body>
    </html>
  );
}
