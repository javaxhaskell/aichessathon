"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { QUALIFICATION_DATES_SHORT } from "@/lib/event";

type Frame = { fen: string; move: string; from: string; to: string; evaluation: number };
type Match = {
  board: string;
  white: string;
  black: string;
  whiteClock: number;
  blackClock: number;
  offset: number;
  frames: Frame[];
};

const matches: Match[] = [
  {
    board: "Board 01", white: "Agent 04", black: "Agent 17", whiteClock: 521, blackClock: 476, offset: 0,
    frames: [
      { fen: "r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQR1K1 b - - 2 7", move: "7. Re1", from: "f1", to: "e1", evaluation: 0.3 },
      { fen: "r1bq1rk1/1pp2ppp/p1np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQR1K1 w - - 0 8", move: "7…a6", from: "a7", to: "a6", evaluation: 0.4 },
      { fen: "r1bq1rk1/1pp2ppp/p1np1n2/2b1p3/4P3/1BPP1N2/PP3PPP/RNBQR1K1 b - - 1 8", move: "8. Bb3", from: "c4", to: "b3", evaluation: 0.3 },
      { fen: "r1bq1rk1/bpp2ppp/p1np1n2/4p3/4P3/1BPP1N2/PP3PPP/RNBQR1K1 w - - 2 9", move: "8…Ba7", from: "c5", to: "a7", evaluation: 0.4 },
    ],
  },
  {
    board: "Board 02", white: "Agent 12", black: "Agent 09", whiteClock: 378, blackClock: 392, offset: 920,
    frames: [
      { fen: "rnbq1rk1/pp2bppp/4pn2/2Pp4/2P2B2/2N1PN2/PP3PPP/R2QKB1R b KQ - 0 7", move: "7. dxc5", from: "d4", to: "c5", evaluation: 0.3 },
      { fen: "rnbq1rk1/pp3ppp/4pn2/2bp4/2P2B2/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 8", move: "7…Bxc5", from: "e7", to: "c5", evaluation: 0.2 },
      { fen: "rnbq1rk1/pp3ppp/4pn2/2bp4/2P2B2/2N1PN2/PPQ2PPP/R3KB1R b KQ - 1 8", move: "8. Qc2", from: "d1", to: "c2", evaluation: 0.3 },
      { fen: "r1bq1rk1/pp3ppp/2n1pn2/2bp4/2P2B2/2N1PN2/PPQ2PPP/R3KB1R w KQ - 2 9", move: "8…Nc6", from: "b8", to: "c6", evaluation: 0.1 },
    ],
  },
  {
    board: "Board 03", white: "Agent 21", black: "Agent 02", whiteClock: 542, blackClock: 527, offset: 1740,
    frames: [
      { fen: "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b KQkq - 1 6", move: "6. Be3", from: "c1", to: "e3", evaluation: 0.1 },
      { fen: "rnbqkb1r/1p3ppp/p2p1n2/4p3/3NP3/2N1B3/PPP2PPP/R2QKB1R w KQkq e6 0 7", move: "6…e5", from: "e7", to: "e5", evaluation: 0.0 },
      { fen: "rnbqkb1r/1p3ppp/p2p1n2/4p3/4P3/1NN1B3/PPP2PPP/R2QKB1R b KQkq - 1 7", move: "7. Nb3", from: "d4", to: "b3", evaluation: 0.2 },
      { fen: "rn1qkb1r/1p3ppp/p2pbn2/4p3/4P3/1NN1B3/PPP2PPP/R2QKB1R w KQkq - 2 8", move: "7…Be6", from: "c8", to: "e6", evaluation: 0.1 },
    ],
  },
];

function parseFen(fen: string) {
  const squares: Array<{ square: string; token: string; black: boolean }> = [];
  const rows = fen.split(" ")[0].split("/");
  rows.forEach((row, rankIndex) => {
    let fileIndex = 0;
    for (const token of row) {
      if (/\d/.test(token)) { fileIndex += Number(token); continue; }
      squares.push({ square: `${"abcdefgh"[fileIndex]}${8 - rankIndex}`, token, black: token === token.toLowerCase() });
      fileIndex += 1;
    }
  });
  return new Map(squares.map((square) => [square.square, square]));
}

type PieceMotionStyle = CSSProperties & { "--move-x": string; "--move-y": string };

function drawChessPiece(canvas: HTMLCanvasElement, token: string) {
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

function ChessPiece({ token, moving, style }: { token: string; moving?: boolean; style?: PieceMotionStyle }) {
  const drawRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas) drawChessPiece(canvas, token);
  }, [token]);

  return (
    <span className={`piece ${token === token.toLowerCase() ? "black" : "white"}${moving ? " moving" : ""}`} style={style}>
      <canvas aria-hidden="true" className="piece-art" height={96} ref={drawRef} width={96} />
    </span>
  );
}

function moveOffset(from: string, to: string): PieceMotionStyle {
  const fromFile = "abcdefgh".indexOf(from[0]);
  const toFile = "abcdefgh".indexOf(to[0]);
  const fromRank = Number(from[1]);
  const toRank = Number(to[1]);
  return {
    "--move-x": `${(fromFile - toFile) * 100}%`,
    "--move-y": `${(toRank - fromRank) * 100}%`,
  };
}

function sideToMove(fen: string) {
  return fen.split(/\s+/)[1] === "b" ? "black" : "white";
}

function formatClock(seconds: number) {
  const bounded = Math.max(0, seconds);
  return `${String(Math.floor(bounded / 60)).padStart(2, "0")}:${String(bounded % 60).padStart(2, "0")}`;
}

function MatchCard({ match, index }: { match: Match; index: number }) {
  const cardRef = useRef<HTMLElement>(null);
  const visibleRef = useRef(false);
  const [playback, setPlayback] = useState({
    frameIndex: 0,
    whiteClock: match.whiteClock,
    blackClock: match.blackClock,
  });

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !("IntersectionObserver" in window)) {
      visibleRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => { visibleRef.current = Boolean(entry?.isIntersecting); },
      { threshold: 0.15 },
    );
    observer.observe(card);
    return () => {
      visibleRef.current = false;
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let moveStart: number | undefined;
    let moveTimer: number | undefined;
    let clockTimer: number | undefined;

    const clearTimers = () => {
      if (moveStart !== undefined) window.clearTimeout(moveStart);
      if (moveTimer !== undefined) window.clearInterval(moveTimer);
      if (clockTimer !== undefined) window.clearInterval(clockTimer);
      moveStart = undefined;
      moveTimer = undefined;
      clockTimer = undefined;
    };

    const canAdvance = () => visibleRef.current && !document.hidden;
    const startTimers = () => {
      clearTimers();
      if (motionPreference.matches) return;

      clockTimer = window.setInterval(() => {
        if (!canAdvance()) return;
        setPlayback((current) => {
          const activeSide = sideToMove(match.frames[current.frameIndex].fen);
          return activeSide === "white"
            ? { ...current, whiteClock: Math.max(0, current.whiteClock - 1) }
            : { ...current, blackClock: Math.max(0, current.blackClock - 1) };
        });
      }, 1000);

      moveStart = window.setTimeout(() => {
        moveTimer = window.setInterval(() => {
          if (!canAdvance()) return;
          setPlayback((current) => ({
            ...current,
            frameIndex: (current.frameIndex + 1) % match.frames.length,
          }));
        }, 2600);
      }, match.offset);
    };

    startTimers();
    motionPreference.addEventListener("change", startTimers);
    return () => {
      motionPreference.removeEventListener("change", startTimers);
      clearTimers();
    };
  }, [match]);

  const frame = match.frames[playback.frameIndex];
  const pieces = useMemo(() => parseFen(frame.fen), [frame.fen]);
  const activeSide = sideToMove(frame.fen);
  const evaluationHeight = Math.max(12, Math.min(88, 50 + frame.evaluation * 17));

  return (
    <article className="match-card" data-reveal ref={cardRef}>
      <p className="sr-only">{match.board}: {match.white} versus {match.black}. Current move {frame.move}.</p>
      <div aria-hidden="true">
        <div className="match-topline"><span>{match.board}</span><span>QF · Sim</span></div>
        <div className="agent-row agent-row-top">
          <span className="agent-identity"><i className="agent-chip dark" />{match.black}</span>
          <time className={`clock${activeSide === "black" ? " active" : ""}`} dateTime={`PT${playback.blackClock}S`}>{formatClock(playback.blackClock)}</time>
        </div>
        <div className="board-shell">
          <div className={`chess-board${playback.frameIndex === 0 ? " resetting" : ""}`}>
            {Array.from({ length: 64 }, (_, squareIndex) => {
              const file = squareIndex % 8;
              const rank = 8 - Math.floor(squareIndex / 8);
              const square = `${"abcdefgh"[file]}${rank}`;
              const piece = pieces.get(square);
              const isDark = (file + rank) % 2 === 0;
              const isFrom = square === frame.from;
              const isTo = square === frame.to;
              return (
                <span className={`board-square${isDark ? " dark" : ""}${isFrom ? " move-from" : ""}${isTo ? " move-to" : ""}`} key={`${index}-${square}`}>
                  {file === 0 ? <small className="board-coordinate rank-coordinate">{rank}</small> : null}
                  {rank === 1 ? <small className="board-coordinate file-coordinate">{"abcdefgh"[file]}</small> : null}
                  {piece ? (
                    <ChessPiece
                      key={`${square}-${piece.token}-${isTo ? playback.frameIndex : "still"}`}
                      moving={isTo && playback.frameIndex > 0}
                      style={isTo && playback.frameIndex > 0 ? moveOffset(frame.from, frame.to) : undefined}
                      token={piece.token}
                    />
                  ) : null}
                </span>
              );
            })}
          </div>
          <div className="eval-track"><span className="eval-fill" style={{ height: `${evaluationHeight}%` }} /></div>
        </div>
        <div className="agent-row agent-row-bottom">
          <span className="agent-identity"><i className="agent-chip" />{match.white}</span>
          <time className={`clock${activeSide === "white" ? " active" : ""}`} dateTime={`PT${playback.whiteClock}S`}>{formatClock(playback.whiteClock)}</time>
        </div>
        <div className="match-foot"><span className="move-notation">{frame.move}</span><span className="eval-value">Eval {frame.evaluation > 0 ? "+" : ""}{frame.evaluation.toFixed(1)}</span></div>
      </div>
    </article>
  );
}

export function TournamentStage() {
  return (
    <section className="tournament-stage" aria-labelledby="simulation-title">
      <div className="stage-head"><h2 className="stage-label" id="simulation-title">Agent match simulation</h2><p className="stage-meta">Qualification · {QUALIFICATION_DATES_SHORT} · 3 boards</p></div>
      <div className="matches-grid">{matches.map((match, index) => <MatchCard index={index} key={match.board} match={match} />)}</div>
    </section>
  );
}
