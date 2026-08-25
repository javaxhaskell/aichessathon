"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { QUALIFICATION_DATES_SHORT } from "@/lib/event";

type Side = "white" | "black";
type Piece = { token: string; black: boolean };
type OpeningMove = { move: string; from: string; to: string; evaluation: number };
type Frame = {
  move: string;
  from: string | null;
  to: string | null;
  evaluation: number;
  pieces: Map<string, Piece>;
  activeSide: Side;
};
type Playback = {
  frameIndex: number;
  whiteClock: number;
  blackClock: number;
  status: "waiting" | "playing" | "complete";
};
type Match = {
  board: string;
  white: string;
  black: string;
  whiteClock: number;
  blackClock: number;
  offset: number;
  frames: Frame[];
};

function parseFen(fen: string) {
  const squares: Array<{ square: string } & Piece> = [];
  const rows = fen.split(" ")[0].split("/");
  rows.forEach((row, rankIndex) => {
    let fileIndex = 0;
    for (const token of row) {
      if (/\d/.test(token)) { fileIndex += Number(token); continue; }
      squares.push({ square: `${"abcdefgh"[fileIndex]}${8 - rankIndex}`, token, black: token === token.toLowerCase() });
      fileIndex += 1;
    }
  });
  return new Map(squares.map(({ square, token, black }) => [square, { token, black }]));
}

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function buildFrames(moves: OpeningMove[]): Frame[] {
  const position = parseFen(STARTING_FEN);
  const frames: Frame[] = [{
    move: "Start position",
    from: null,
    to: null,
    evaluation: 0,
    pieces: new Map(position),
    activeSide: "white",
  }];

  moves.forEach((move, index) => {
    const piece = position.get(move.from);
    const movingSide: Side = index % 2 === 0 ? "white" : "black";
    if (!piece || piece.black !== (movingSide === "black")) {
      throw new Error(`Invalid opening move ${move.move} on ${move.from}`);
    }
    position.delete(move.from);
    position.set(move.to, piece);
    frames.push({
      ...move,
      pieces: new Map(position),
      activeSide: movingSide === "white" ? "black" : "white",
    });
  });

  return frames;
}

const matches: Match[] = [
  {
    board: "Board 01", white: "Agent 04", black: "Agent 17", whiteClock: 600, blackClock: 600, offset: 0,
    frames: buildFrames([
      { move: "1. e4", from: "e2", to: "e4", evaluation: 0.20 },
      { move: "1… e5", from: "e7", to: "e5", evaluation: 0.15 },
      { move: "2. Nf3", from: "g1", to: "f3", evaluation: 0.22 },
      { move: "2… Nc6", from: "b8", to: "c6", evaluation: 0.16 },
      { move: "3. Bc4", from: "f1", to: "c4", evaluation: 0.24 },
      { move: "3… Nf6", from: "g8", to: "f6", evaluation: 0.18 },
      { move: "4. d3", from: "d2", to: "d3", evaluation: 0.16 },
      { move: "4… Bc5", from: "f8", to: "c5", evaluation: 0.12 },
      { move: "5. c3", from: "c2", to: "c3", evaluation: 0.18 },
      { move: "5… d6", from: "d7", to: "d6", evaluation: 0.14 },
      { move: "6. Nbd2", from: "b1", to: "d2", evaluation: 0.17 },
      { move: "6… a6", from: "a7", to: "a6", evaluation: 0.20 },
    ]),
  },
  {
    board: "Board 02", white: "Agent 12", black: "Agent 09", whiteClock: 600, blackClock: 600, offset: 620,
    frames: buildFrames([
      { move: "1. d4", from: "d2", to: "d4", evaluation: 0.20 },
      { move: "1… d5", from: "d7", to: "d5", evaluation: 0.16 },
      { move: "2. c4", from: "c2", to: "c4", evaluation: 0.28 },
      { move: "2… e6", from: "e7", to: "e6", evaluation: 0.20 },
      { move: "3. Nc3", from: "b1", to: "c3", evaluation: 0.27 },
      { move: "3… Nf6", from: "g8", to: "f6", evaluation: 0.22 },
      { move: "4. Nf3", from: "g1", to: "f3", evaluation: 0.26 },
      { move: "4… Be7", from: "f8", to: "e7", evaluation: 0.22 },
      { move: "5. Bg5", from: "c1", to: "g5", evaluation: 0.30 },
      { move: "5… h6", from: "h7", to: "h6", evaluation: 0.28 },
      { move: "6. Bh4", from: "g5", to: "h4", evaluation: 0.31 },
      { move: "6… b6", from: "b7", to: "b6", evaluation: 0.34 },
    ]),
  },
  {
    board: "Board 03", white: "Agent 21", black: "Agent 02", whiteClock: 600, blackClock: 600, offset: 1240,
    frames: buildFrames([
      { move: "1. e4", from: "e2", to: "e4", evaluation: 0.20 },
      { move: "1… e5", from: "e7", to: "e5", evaluation: 0.15 },
      { move: "2. Nf3", from: "g1", to: "f3", evaluation: 0.22 },
      { move: "2… Nc6", from: "b8", to: "c6", evaluation: 0.16 },
      { move: "3. d4", from: "d2", to: "d4", evaluation: 0.28 },
      { move: "3… exd4", from: "e5", to: "d4", evaluation: 0.22 },
      { move: "4. Nxd4", from: "f3", to: "d4", evaluation: 0.30 },
      { move: "4… Nf6", from: "g8", to: "f6", evaluation: 0.23 },
      { move: "5. Nxc6", from: "d4", to: "c6", evaluation: 0.18 },
      { move: "5… bxc6", from: "b7", to: "c6", evaluation: 0.26 },
      { move: "6. Bd3", from: "f1", to: "d3", evaluation: 0.28 },
      { move: "6… d5", from: "d7", to: "d5", evaluation: 0.20 },
      { move: "7. exd5", from: "e4", to: "d5", evaluation: 0.24 },
      { move: "7… cxd5", from: "c6", to: "d5", evaluation: 0.18 },
    ]),
  },
];

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

function formatClock(seconds: number) {
  const bounded = Math.max(0, seconds);
  return `${String(Math.floor(bounded / 60)).padStart(2, "0")}:${String(bounded % 60).padStart(2, "0")}`;
}

function MatchCard({ match, index }: { match: Match; index: number }) {
  const cardRef = useRef<HTMLElement>(null);
  const visibleRef = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playback, setPlayback] = useState<Playback>({
    frameIndex: 0,
    whiteClock: match.whiteClock,
    blackClock: match.blackClock,
    status: "waiting",
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
    const updatePreference = () => setReducedMotion(motionPreference.matches);
    updatePreference();
    motionPreference.addEventListener("change", updatePreference);
    return () => {
      motionPreference.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    if (playback.status === "complete") return;

    let cancelled = false;
    let moveTimer: number | undefined;
    const firstMove = playback.frameIndex === 0;
    const scheduleMove = (delay: number) => {
      moveTimer = window.setTimeout(() => {
        if (cancelled) return;
        if (!visibleRef.current || document.hidden) {
          scheduleMove(250);
          return;
        }
        setPlayback((current) => {
          const nextFrame = Math.min(current.frameIndex + 1, match.frames.length - 1);
          return {
            ...current,
            frameIndex: nextFrame,
            status: nextFrame === match.frames.length - 1 ? "complete" : "playing",
          };
        });
      }, delay);
    };

    scheduleMove(firstMove ? 1700 + match.offset : 1900);
    return () => {
      cancelled = true;
      if (moveTimer !== undefined) window.clearTimeout(moveTimer);
    };
  }, [match, playback.frameIndex, playback.status, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || playback.status !== "playing") return;
    const clockTimer = window.setInterval(() => {
      if (!visibleRef.current || document.hidden) return;
      setPlayback((current) => {
        if (current.status !== "playing") return current;
        const activeSide = match.frames[current.frameIndex].activeSide;
        return activeSide === "white"
          ? { ...current, whiteClock: Math.max(0, current.whiteClock - 1) }
          : { ...current, blackClock: Math.max(0, current.blackClock - 1) };
      });
    }, 1000);
    return () => window.clearInterval(clockTimer);
  }, [match, playback.status, reducedMotion]);

  const frameIndex = reducedMotion ? match.frames.length - 1 : playback.frameIndex;
  const frame = match.frames[frameIndex];
  const pieces = frame.pieces;
  const activeSide = frame.activeSide;
  const clockIsRunning = !reducedMotion && playback.status === "playing";
  const evaluationHeight = Math.max(12, Math.min(88, 50 + frame.evaluation * 17));

  return (
    <article className="match-card" data-reveal ref={cardRef}>
      <p className="sr-only">{match.board}: {match.white} versus {match.black}. {frame.from ? `Current move ${frame.move}.` : "Starting position."}</p>
      <div aria-hidden="true">
        <div className="match-topline"><span>{match.board}</span><span>Opening</span></div>
        <div className="agent-row agent-row-top">
          <span className="agent-identity"><i className="agent-chip dark" />{match.black}</span>
          <time className={`clock${clockIsRunning && activeSide === "black" ? " active" : ""}`} dateTime={`PT${playback.blackClock}S`}>{formatClock(playback.blackClock)}</time>
        </div>
        <div className="board-shell">
          <div className="chess-board">
            {Array.from({ length: 64 }, (_, squareIndex) => {
              const file = squareIndex % 8;
              const rank = 8 - Math.floor(squareIndex / 8);
              const square = `${"abcdefgh"[file]}${rank}`;
              const piece = pieces.get(square);
              const isDark = (file + rank) % 2 === 0;
              const isFrom = Boolean(frame.from && square === frame.from);
              const isTo = Boolean(frame.to && square === frame.to);
              const moving = Boolean(isTo && frame.from && frame.to);
              const motionStyle = isTo && frame.from && frame.to ? moveOffset(frame.from, frame.to) : undefined;
              return (
                <span className={`board-square${isDark ? " dark" : ""}${isFrom ? " move-from" : ""}${isTo ? " move-to" : ""}`} key={`${index}-${square}`}>
                  {file === 0 ? <small className="board-coordinate rank-coordinate">{rank}</small> : null}
                  {rank === 1 ? <small className="board-coordinate file-coordinate">{"abcdefgh"[file]}</small> : null}
                  {piece ? (
                    <ChessPiece
                      key={`${square}-${piece.token}-${isTo ? frameIndex : "still"}`}
                      moving={moving}
                      style={motionStyle}
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
          <time className={`clock${clockIsRunning && activeSide === "white" ? " active" : ""}`} dateTime={`PT${playback.whiteClock}S`}>{formatClock(playback.whiteClock)}</time>
        </div>
        <div className="match-foot"><span className="move-notation">{frame.move}</span><span className="eval-value">Eval {frame.evaluation > 0 ? "+" : ""}{frame.evaluation.toFixed(1)}</span></div>
      </div>
    </article>
  );
}

export function TournamentStage() {
  return (
    <section className="tournament-stage" aria-labelledby="simulation-title">
      <div className="stage-head"><h2 className="stage-label" id="simulation-title">Match simulation</h2><p className="stage-meta">Qualification · {QUALIFICATION_DATES_SHORT} · 3 boards</p></div>
      <div className="matches-grid">{matches.map((match, index) => <MatchCard index={index} key={match.board} match={match} />)}</div>
    </section>
  );
}
