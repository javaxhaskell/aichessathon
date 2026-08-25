import { ImageResponse } from "next/og";

export const alt = "AI Chessathon — Build an agent. Put it on the board.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const squares = Array.from({ length: 64 });
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "#06080b", color: "#f3f6fa", padding: "64px 72px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", width: 690, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 18, color: "#cfd7e3", letterSpacing: 3, textTransform: "uppercase" }}><span style={{ width: 38, height: 2, background: "#6c91ff" }} />Sponsored by Optiver</div>
        <div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", flexDirection: "column", fontSize: 72, lineHeight: .96, letterSpacing: -5, fontWeight: 600 }}><span>Build an agent.</span><span>Put it on the board.</span></div><div style={{ marginTop: 30, fontSize: 22, color: "#98a3af" }}>AI Chessathon · London final · 12 September 2026</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 15, fontSize: 22, fontWeight: 600 }}><span style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #40516b", borderRadius: 9, color: "#dfe8ff", fontSize: 13 }}>AC</span>AI Chessathon</div>
      </div>
      <div style={{ position: "absolute", right: 65, top: 67, width: 440, height: 440, display: "flex", flexWrap: "wrap", border: "1px solid #2b3541", borderRadius: 12, overflow: "hidden", transform: "rotate(3deg)", boxShadow: "0 30px 90px #000" }}>
        {squares.map((_, index) => <span key={index} style={{ width: 55, height: 55, background: (index + Math.floor(index / 8)) % 2 ? "#171e26" : "#27313d", boxShadow: index === 27 || index === 36 ? "inset 0 0 0 55px rgba(108,145,255,.24)" : "none" }} />)}
      </div>
      <div style={{ position: "absolute", right: -90, bottom: -170, width: 500, height: 500, borderRadius: "50%", background: "rgba(68,100,180,.12)" }} />
    </div>,
    size,
  );
}
