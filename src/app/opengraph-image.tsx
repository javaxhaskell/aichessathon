import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { FINAL_DATE, QUALIFICATION_DATES } from "@/lib/event";

export const alt = "AI Chessathon: Build a chess agent. Put it on the board.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const squares = Array.from({ length: 64 });
  const [mark, optiver] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/aichessathon-mark.png")),
    readFile(join(process.cwd(), "src/assets/optiver-wordmark.png")),
  ]);
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;
  const optiverSrc = `data:image/png;base64,${optiver.toString("base64")}`;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "#06080b", color: "#f3f6fa", padding: "64px 72px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", width: 690, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 18, color: "#cfd7e3", letterSpacing: 3, textTransform: "uppercase" }}>
          <span>Sponsored by</span>
          <img src={optiverSrc} width={132} height={48} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", flexDirection: "column", fontSize: 72, lineHeight: .96, letterSpacing: -5, fontWeight: 600 }}><span>Build a chess agent.</span><span>Put it on the board.</span></div><div style={{ display: "flex", flexDirection: "column", marginTop: 30, fontSize: 22, color: "#98a3af" }}><span>Online qualification · {QUALIFICATION_DATES}</span><span>London final · {FINAL_DATE}</span></div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 15, fontSize: 22, fontWeight: 600 }}>
          <img src={markSrc} width={44} height={44} alt="" />
          AI Chessathon
        </div>
      </div>
      <div style={{ position: "absolute", right: 65, top: 67, width: 440, height: 440, display: "flex", flexWrap: "wrap", border: "1px solid #899180", borderRadius: 12, overflow: "hidden", transform: "rotate(3deg)", boxShadow: "0 30px 90px #000" }}>
        {squares.map((_, index) => <span key={index} style={{ width: 55, height: 55, background: (index + Math.floor(index / 8)) % 2 ? "#74806d" : "#d8d5c1", boxShadow: index === 27 || index === 36 ? "inset 0 0 0 55px rgba(234,204,90,.34)" : "none" }} />)}
      </div>
      <div style={{ position: "absolute", right: -90, bottom: -170, width: 500, height: 500, borderRadius: "50%", background: "rgba(68,100,180,.12)" }} />
    </div>,
    size,
  );
}
