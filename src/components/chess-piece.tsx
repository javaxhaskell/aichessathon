"use client";

import type { CSSProperties } from "react";
import { useCallback } from "react";

export type PieceMotionStyle = CSSProperties & { "--move-x": string; "--move-y": string };

export function drawChessPiece(canvas: HTMLCanvasElement, token: string) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const black = token === token.toLowerCase();
  const kind = token.toLowerCase();
  const fill = context.createLinearGradient(0, 12, 0, 64);
  if (black) {
    fill.addColorStop(0, "#4b5148");
    fill.addColorStop(1, "#20241f");
  } else {
    fill.addColorStop(0, "#fffdf2");
    fill.addColorStop(1, "#d8d6c3");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(canvas.width / 72, 0, 0, canvas.height / 72, 0, 0);
  context.lineJoin = "round";
  context.lineCap = "round";
  context.lineWidth = 1.55;

  const stroke = black ? "#111510" : "#77796a";
  const detail = black ? "#737a6f" : "#9c9d8c";
  const paint = () => {
    context.save();
    context.shadowColor = "rgba(8, 11, 8, .42)";
    context.shadowBlur = 2.4;
    context.shadowOffsetY = 2;
    context.fillStyle = fill;
    context.fill();
    context.restore();
    context.strokeStyle = stroke;
    context.stroke();
  };
  const base = (left = 18, right = 54) => {
    context.beginPath();
    context.moveTo(left + 3, 51);
    context.lineTo(right - 3, 51);
    context.quadraticCurveTo(right - 1, 54, right, 58);
    context.quadraticCurveTo(right - 1, 62, right - 4, 63);
    context.lineTo(left + 4, 63);
    context.quadraticCurveTo(left + 1, 62, left, 58);
    context.quadraticCurveTo(left + 1, 54, left + 3, 51);
    context.closePath();
    paint();
  };

  if (kind === "p") {
    context.beginPath();
    context.arc(36, 19, 8.2, 0, Math.PI * 2);
    paint();
    context.beginPath();
    context.moveTo(31, 28);
    context.quadraticCurveTo(32, 39, 26, 50);
    context.lineTo(46, 50);
    context.quadraticCurveTo(40, 39, 41, 28);
    context.closePath();
    paint();
    base(20, 52);
  } else if (kind === "r") {
    context.beginPath();
    context.moveTo(22, 15);
    context.lineTo(29, 15);
    context.lineTo(29, 21);
    context.lineTo(33, 21);
    context.lineTo(33, 15);
    context.lineTo(39, 15);
    context.lineTo(39, 21);
    context.lineTo(43, 21);
    context.lineTo(43, 15);
    context.lineTo(50, 15);
    context.lineTo(49, 28);
    context.lineTo(45, 31);
    context.lineTo(47, 50);
    context.lineTo(25, 50);
    context.lineTo(27, 31);
    context.lineTo(23, 28);
    context.closePath();
    paint();
    base(17, 55);
  } else if (kind === "n") {
    context.beginPath();
    context.moveTo(21, 51);
    context.quadraticCurveTo(22, 42, 30, 34);
    context.lineTo(24, 31);
    context.quadraticCurveTo(28, 22, 39, 17);
    context.lineTo(43, 14);
    context.lineTo(42, 23);
    context.quadraticCurveTo(50, 27, 51, 35);
    context.quadraticCurveTo(51, 43, 46, 51);
    context.closePath();
    paint();
    context.strokeStyle = detail;
    context.lineWidth = 1.3;
    context.beginPath();
    context.moveTo(31, 27);
    context.quadraticCurveTo(36, 31, 38, 39);
    context.stroke();
    context.fillStyle = detail;
    context.beginPath();
    context.arc(41.5, 27.5, 1.45, 0, Math.PI * 2);
    context.fill();
    base(17, 55);
  } else if (kind === "b") {
    context.beginPath();
    context.moveTo(36, 13);
    context.quadraticCurveTo(27, 20, 29, 29);
    context.quadraticCurveTo(30, 34, 34, 37);
    context.quadraticCurveTo(28, 42, 26, 50);
    context.lineTo(46, 50);
    context.quadraticCurveTo(44, 42, 38, 37);
    context.quadraticCurveTo(42, 34, 43, 29);
    context.quadraticCurveTo(45, 20, 36, 13);
    context.closePath();
    paint();
    context.strokeStyle = detail;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(39.5, 20);
    context.lineTo(33, 29);
    context.stroke();
    base(17, 55);
  } else if (kind === "q") {
    ([[23, 18, 2.6], [36, 13, 2.8], [49, 18, 2.6]] as const).forEach(([x, y, radius]) => {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      paint();
    });
    context.beginPath();
    context.moveTo(22, 22);
    context.lineTo(29, 31);
    context.lineTo(36, 17);
    context.lineTo(43, 31);
    context.lineTo(50, 22);
    context.lineTo(46, 38);
    context.quadraticCurveTo(43, 43, 44, 50);
    context.lineTo(28, 50);
    context.quadraticCurveTo(29, 43, 26, 38);
    context.closePath();
    paint();
    base(16, 56);
  } else {
    context.strokeStyle = stroke;
    context.lineWidth = 2.1;
    context.beginPath();
    context.moveTo(36, 10);
    context.lineTo(36, 22);
    context.moveTo(31.5, 15);
    context.lineTo(40.5, 15);
    context.stroke();
    context.beginPath();
    context.moveTo(31, 22);
    context.quadraticCurveTo(26, 28, 31, 35);
    context.quadraticCurveTo(27, 42, 27, 50);
    context.lineTo(45, 50);
    context.quadraticCurveTo(45, 42, 41, 35);
    context.quadraticCurveTo(46, 28, 41, 22);
    context.closePath();
    paint();
    base(16, 56);
  }
}

export function ChessPiece({ token, moving, style }: { token: string; moving?: boolean; style?: PieceMotionStyle }) {
  const drawRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas) drawChessPiece(canvas, token);
  }, [token]);

  return (
    <span className={`piece ${token === token.toLowerCase() ? "black" : "white"}${moving ? " moving" : ""}`} style={style}>
      <canvas aria-hidden="true" className="piece-art" height={96} ref={drawRef} width={96} />
    </span>
  );
}

export function moveOffset(from: string, to: string): PieceMotionStyle {
  const fromFile = "abcdefgh".indexOf(from[0]);
  const toFile = "abcdefgh".indexOf(to[0]);
  const fromRank = Number(from[1]);
  const toRank = Number(to[1]);
  return {
    "--move-x": `${(fromFile - toFile) * 100}%`,
    "--move-y": `${(toRank - fromRank) * 100}%`,
  };
}
