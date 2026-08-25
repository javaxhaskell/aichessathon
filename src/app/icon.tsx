import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, background: "#0b1016", border: "3px solid #34445c", color: "#dfe8ff", fontFamily: "sans-serif", fontSize: 21, fontWeight: 700, letterSpacing: "-2px" }}>AC</div>,
    size,
  );
}
