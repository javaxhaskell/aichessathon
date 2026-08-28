import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";

import { MotionController } from "@/components/motion-controller";
import { FINAL_DATE, QUALIFICATION_DATES } from "@/lib/event";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const sponsorSans = Outfit({ variable: "--font-sponsor", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://aichessathon.com"),
  title: { default: "AI Chessathon: Build a chess agent. Put it on the board.", template: "%s | AI Chessathon" },
  description:
    `An AI chess engineering competition with online qualification from ${QUALIFICATION_DATES} and an in-person London final on ${FINAL_DATE}.`,
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
    title: "AI Chessathon: Build a chess agent. Put it on the board.",
    description: `Online qualification ${QUALIFICATION_DATES}. London final ${FINAL_DATE}. Sponsored by Optiver.`,
    images: [{ url: "/opengraph-image.png?v=optiver-lockup", width: 1200, height: 630, alt: "Chess × Machine Learning Hackathon, sponsored by Optiver" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Chessathon: Build a chess agent. Put it on the board.",
    description: `Online qualification ${QUALIFICATION_DATES}. London final ${FINAL_DATE}. Sponsored by Optiver.`,
    images: ["/opengraph-image.png?v=optiver-lockup"],
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${sponsorSans.variable}`}>
      <body><MotionController /><a className="skip-link" href="#main-content">Skip to content</a>{children}</body>
    </html>
  );
}
