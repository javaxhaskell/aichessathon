"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

const glyphs: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

function parseFen(fen: string) {
  const squares: Array<{ square: string; piece?: string; black?: boolean }> = [];
  const rows = fen.split(" ")[0].split("/");
  rows.forEach((row, rankIndex) => {
    let fileIndex = 0;
    for (const token of row) {
      if (/\d/.test(token)) { fileIndex += Number(token); continue; }
      squares.push({ square: `${"abcdefgh"[fileIndex]}${8 - rankIndex}`, piece: glyphs[token], black: token === token.toLowerCase() });
      fileIndex += 1;
    }
  });
  return new Map(squares.map((square) => [square.square, square]));
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
        }, 2400);
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
    <article className="match-card" ref={cardRef}>
      <p className="sr-only">{match.board}: {match.white} versus {match.black}. Current move {frame.move}.</p>
      <div aria-hidden="true">
        <div className="match-topline"><span>{match.board}</span><span>QF · Sim</span></div>
        <div className="agent-list">
          <div className="agent-row"><span className="agent-identity"><i className="agent-chip" />{match.white}</span><time className="clock" dateTime={`PT${playback.whiteClock}S`}>{formatClock(playback.whiteClock)}{activeSide === "white" ? " ·" : ""}</time></div>
          <div className="agent-row"><span className="agent-identity"><i className="agent-chip dark" />{match.black}</span><time className="clock" dateTime={`PT${playback.blackClock}S`}>{formatClock(playback.blackClock)}{activeSide === "black" ? " ·" : ""}</time></div>
        </div>
        <div className="board-shell">
          <div className="chess-board">
            {Array.from({ length: 64 }, (_, squareIndex) => {
              const file = squareIndex % 8;
              const rank = 8 - Math.floor(squareIndex / 8);
              const square = `${"abcdefgh"[file]}${rank}`;
              const piece = pieces.get(square);
              const isDark = (file + rank) % 2 === 0;
              const isLast = square === frame.from || square === frame.to;
              return (
                <span className={`board-square${isDark ? " dark" : ""}${isLast ? " last" : ""}`} key={`${index}-${square}`}>
                  {piece?.piece ? <span className={`piece${piece.black ? " black" : ""}`} key={`${square}-${piece.piece}`}>{piece.piece}</span> : null}
                </span>
              );
            })}
          </div>
          <div className="eval-track"><span className="eval-fill" style={{ height: `${evaluationHeight}%` }} /></div>
        </div>
        <div className="match-foot"><span className="move-notation">{frame.move}</span><span className="eval-value">Eval {frame.evaluation > 0 ? "+" : ""}{frame.evaluation.toFixed(1)}</span></div>
      </div>
    </article>
  );
}

export function TournamentStage() {
  return (
    <div className="tournament-stage" aria-label="Animated autonomous agent chess matches">
      <div className="stage-head"><p className="stage-label">Agent match simulation</p><p className="stage-meta">Qualification environment · 3 active boards</p></div>
      <div className="matches-grid">{matches.map((match, index) => <MatchCard index={index} key={match.board} match={match} />)}</div>
    </div>
  );
}
