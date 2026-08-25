import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/register/confirmation"] },
    sitemap: "https://aichessathon.com/sitemap.xml",
    host: "https://aichessathon.com",
  };
}
