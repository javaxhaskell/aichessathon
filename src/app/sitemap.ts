import type { MetadataRoute } from "next";

const base = "https://aichessathon.com";
const lastModified = new Date("2026-08-24T00:00:00Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/register`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/terms`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/archive`, lastModified, changeFrequency: "monthly", priority: 0.4 },
  ];
}
