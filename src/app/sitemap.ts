import type { MetadataRoute } from "next";

const base = "https://aichessathon.com";
const eventLastModified = new Date("2026-08-25T00:00:00Z");
const privacyLastModified = new Date("2026-08-26T00:00:00Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, lastModified: eventLastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/register`, lastModified: eventLastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/terms`, lastModified: eventLastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacy`, lastModified: privacyLastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/archive`, lastModified: eventLastModified, changeFrequency: "monthly", priority: 0.4 },
  ];
}
