import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Chessathon",
    short_name: "AI Chessathon",
    description: "An AI chess engineering competition.",
    start_url: "/",
    display: "standalone",
    background_color: "#06080b",
    theme_color: "#06080b",
    icons: [{ src: "/icon", sizes: "64x64", type: "image/png" }],
  };
}
