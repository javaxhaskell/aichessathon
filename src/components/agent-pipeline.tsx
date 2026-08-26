"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ChessPiece, moveOffset } from "@/components/chess-piece";

import "./agent-pipeline.css";
import "./code-view.css";

type Side = "white" | "black";
type Piece = { token: string; black: boolean };
type GameMove = { move: string; san: string; from: string; to: string; evaluation: number };
type Frame = {
  move: string;
  san: string | null;
  from: string | null;
  to: string | null;
  evaluation: number;
  pieces: Map<string, Piece>;
  activeSide: Side;
};
type TokenKind = "kw" | "fn" | "hot" | "str" | "num" | "cm" | "id" | "op";
type Token = { kind: TokenKind; text: string };
type CodeRow = { key: string; number: number; fn: string; tokens: Token[] };

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const DEMO_WHITE_ELO = 1512;
const DEMO_BLACK_ELO = 1488;
const GAME_ECHO = "Qh4+";
const AGENT_SOURCE = `PIECE = {"P": 1, "N": 3, "B": 3, "R": 5, "Q": 9, "K": 0}
CENTER = {"d4", "d5", "e4", "e5"}

def evaluate(pos):
    score = 0.0
    for sq, piece in pos.pieces():
        sign = 1 if piece.white else -1
        score += sign * PIECE[piece.kind]
        if sq in CENTER:
            score += sign * 0.12
    if pos.in_check:
        score += -0.35 if pos.side == "w" else 0.35
    return score

def search(pos, depth, alpha, beta):
    if depth == 0 or pos.done():
        return evaluate(pos)
    best = -99.0
    for move in pos.legal_moves():
        pos.push(move)
        value = -search(pos, depth - 1, -beta, -alpha)
        pos.pop()
        best = max(best, value)
        alpha = max(alpha, value)
        if alpha >= beta:
            break
    return best

IMMORTAL = {"Qh4+", "Bxb5", "Be7#"}  # Anderssen vs Kieseritzky, 1851

def pick_move(pos, clock):
    depth = 3 if clock > 90 else 2
    choice, best = None, -99.0
    for move in pos.legal_moves():
        pos.push(move)  # Immortal, 1851
        value = -search(pos, depth, -8, 8)
        pos.pop()
        if move.san in IMMORTAL:
            value += 0.08
        if value > best:
            choice, best = move, value
    return choice`;

const PY_KEYWORDS = new Set([
  "and", "as", "break", "class", "continue", "def", "elif", "else", "False",
  "for", "from", "if", "import", "in", "is", "lambda", "None", "not", "or",
  "pass", "return", "True", "while",
]);
const PY_HOT = new Set([
  "CENTER", "IMMORTAL", "PIECE", "alpha", "beta", "clock", "depth", "evaluate",
  "in_check", "legal_moves", "pick_move", "score", "search",
]);

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

function buildFrames(moves: GameMove[]): Frame[] {
  const position = parseFen(STARTING_FEN);
  const frames: Frame[] = [{
    move: "Start position",
    san: null,
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
      throw new Error(`Invalid Immortal Game move ${move.move} on ${move.from}`);
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

const frames = buildFrames([
  { move: "1. e4", san: "e4", from: "e2", to: "e4", evaluation: 0.20 },
  { move: "1… e5", san: "e5", from: "e7", to: "e5", evaluation: 0.16 },
  { move: "2. f4", san: "f4", from: "f2", to: "f4", evaluation: 0.12 },
  { move: "2… exf4", san: "exf4", from: "e5", to: "f4", evaluation: 0.08 },
  { move: "3. Bc4", san: "Bc4", from: "f1", to: "c4", evaluation: 0.18 },
  { move: "3… Qh4+", san: "Qh4+", from: "d8", to: "h4", evaluation: 0.04 },
  { move: "4. Kf1", san: "Kf1", from: "e1", to: "f1", evaluation: 0.10 },
  { move: "4… b5", san: "b5", from: "b7", to: "b5", evaluation: 0.06 },
  { move: "5. Bxb5", san: "Bxb5", from: "c4", to: "b5", evaluation: 0.22 },
  { move: "5… Nf6", san: "Nf6", from: "g8", to: "f6", evaluation: 0.14 },
  { move: "6. Nf3", san: "Nf3", from: "g1", to: "f3", evaluation: 0.20 },
  { move: "6… Qh6", san: "Qh6", from: "h4", to: "h6", evaluation: 0.16 },
  { move: "7. d3", san: "d3", from: "d2", to: "d3", evaluation: 0.18 },
  { move: "7… Nh5", san: "Nh5", from: "f6", to: "h5", evaluation: 0.10 },
  { move: "8. Nh4", san: "Nh4", from: "f3", to: "h4", evaluation: 0.24 },
  { move: "8… Qg5", san: "Qg5", from: "h6", to: "g5", evaluation: 0.12 },
  { move: "9. Nf5", san: "Nf5", from: "h4", to: "f5", evaluation: 0.28 },
  { move: "9… c6", san: "c6", from: "c7", to: "c6", evaluation: 0.16 },
  { move: "10. g4", san: "g4", from: "g2", to: "g4", evaluation: 0.22 },
  { move: "10… Nf6", san: "Nf6", from: "h5", to: "f6", evaluation: 0.14 },
  { move: "11. Rg1", san: "Rg1", from: "h1", to: "g1", evaluation: 0.20 },
  { move: "11… cxb5", san: "cxb5", from: "c6", to: "b5", evaluation: 0.02 },
  { move: "12. h4", san: "h4", from: "h2", to: "h4", evaluation: 0.18 },
  { move: "12… Qg6", san: "Qg6", from: "g5", to: "g6", evaluation: 0.10 },
  { move: "13. h5", san: "h5", from: "h4", to: "h5", evaluation: 0.24 },
  { move: "13… Qg5", san: "Qg5", from: "g6", to: "g5", evaluation: 0.16 },
  { move: "14. Qf3", san: "Qf3", from: "d1", to: "f3", evaluation: 0.26 },
  { move: "14… Ng8", san: "Ng8", from: "f6", to: "g8", evaluation: 0.22 },
  { move: "15. Bxf4", san: "Bxf4", from: "c1", to: "f4", evaluation: 0.30 },
  { move: "15… Qf6", san: "Qf6", from: "g5", to: "f6", evaluation: 0.18 },
  { move: "16. Nc3", san: "Nc3", from: "b1", to: "c3", evaluation: 0.28 },
  { move: "16… Bc5", san: "Bc5", from: "f8", to: "c5", evaluation: 0.12 },
  { move: "17. Nd5", san: "Nd5", from: "c3", to: "d5", evaluation: 0.34 },
  { move: "17… Qxb2", san: "Qxb2", from: "f6", to: "b2", evaluation: 0.08 },
  { move: "18. Bd6", san: "Bd6", from: "f4", to: "d6", evaluation: 0.40 },
  { move: "18… Bxg1", san: "Bxg1", from: "c5", to: "g1", evaluation: 0.06 },
  { move: "19. e5", san: "e5", from: "e4", to: "e5", evaluation: 0.46 },
  { move: "19… Qxa1+", san: "Qxa1+", from: "b2", to: "a1", evaluation: 0.10 },
  { move: "20. Ke2", san: "Ke2", from: "f1", to: "e2", evaluation: 0.42 },
  { move: "20… Na6", san: "Na6", from: "b8", to: "a6", evaluation: 0.36 },
  { move: "21. Nxg7+", san: "Nxg7+", from: "f5", to: "g7", evaluation: 0.58 },
  { move: "21… Kd8", san: "Kd8", from: "e8", to: "d8", evaluation: 0.52 },
  { move: "22. Qf6+", san: "Qf6+", from: "f3", to: "f6", evaluation: 0.72 },
  { move: "22… Nxf6", san: "Nxf6", from: "g8", to: "f6", evaluation: 0.64 },
  { move: "23. Be7#", san: "Be7#", from: "d6", to: "e7", evaluation: 1.20 },
]);

function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /(#.*)|("[^"]*"|'[^']*')|(\b\d+\.?\d*)|(\b[A-Za-z_][A-Za-z0-9_]*\b)|(\s+)|(.)/g;
  let prevWasDef = false;
  for (const match of line.matchAll(pattern)) {
    const [, comment, string, number, ident, space, other] = match;
    if (comment) tokens.push({ kind: "cm", text: comment });
    else if (string) tokens.push({ kind: "str", text: string });
    else if (number) tokens.push({ kind: "num", text: number });
    else if (ident) {
      if (PY_KEYWORDS.has(ident)) {
        tokens.push({ kind: "kw", text: ident });
        prevWasDef = ident === "def";
      } else if (prevWasDef) {
        tokens.push({ kind: "fn", text: ident });
        prevWasDef = false;
      } else if (PY_HOT.has(ident)) {
        tokens.push({ kind: "hot", text: ident });
        prevWasDef = false;
      } else {
        tokens.push({ kind: "id", text: ident });
        prevWasDef = false;
      }
    } else {
      tokens.push({ kind: "op", text: space ?? other ?? "" });
    }
  }
  return tokens;
}

function rowsFor(source: string): CodeRow[] {
  let fn = "module";
  return source.split("\n").map((text, index) => {
    const tokens = tokenize(text);
    const defined = tokens.find((token) => token.kind === "fn");
    if (defined) fn = defined.text;
    return { key: `agent-${index}`, number: index + 1, fn, tokens };
  });
}

function talksAboutMoves(row: CodeRow) {
  if (row.fn === "pick_move") return true;
  return row.tokens.some((token) => token.text === "legal_moves" || token.text === "push");
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(motionPreference.matches);
    updatePreference();
    motionPreference.addEventListener("change", updatePreference);
    return () => motionPreference.removeEventListener("change", updatePreference);
  }, []);
  return reducedMotion;
}

function useOnScreen(ref: { current: HTMLElement | null }) {
  const visibleRef = useRef(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) {
      visibleRef.current = true;
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => { visibleRef.current = Boolean(entry?.isIntersecting); },
      { threshold: 0.18 },
    );
    observer.observe(node);
    return () => {
      visibleRef.current = false;
      observer.disconnect();
    };
  }, [ref]);
  return visibleRef;
}

function useMatchClock(
  length: number,
  reducedMotion: boolean,
  visibleRef: { current: boolean },
) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      setFrameIndex(length - 1);
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    const schedule = (delay: number) => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        if (!visibleRef.current || document.hidden) {
          schedule(280);
          return;
        }
        setFrameIndex((current) => (current + 1) % length);
      }, delay);
    };
    schedule(frameIndex === length - 1 ? 1800 : 1100);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [frameIndex, length, reducedMotion, visibleRef]);

  return frameIndex;
}

function CodeRipple({
  reducedMotion,
  visibleRef,
}: {
  reducedMotion: boolean;
  visibleRef: { current: boolean };
}) {
  const paneRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rows = useMemo(() => rowsFor(AGENT_SOURCE), []);
  const playable = useMemo(
    () => rows.flatMap((row, index) => (row.tokens.length ? [index] : [])),
    [rows],
  );

  useEffect(() => {
    lineRefs.current = lineRefs.current.slice(0, rows.length);
  }, [rows.length]);

  useEffect(() => {
    const highlight = (cursor: number) => {
      const span = Math.max(playable.length - 1, 1);
      const playIndex = Math.min(playable.length - 1, Math.max(0, Math.floor(cursor)));
      const index = playable[playIndex] ?? 0;
      const playableAt = Array.from({ length: rows.length }, () => -1);
      playable.forEach((rowIndex, at) => { playableAt[rowIndex] = at; });

      lineRefs.current.forEach((line, lineIndex) => {
        if (!line) return;
        const playPos = playableAt[lineIndex] ?? -1;
        if (playPos < 0) {
          line.classList.remove("is-on", "is-near");
          line.style.setProperty("--fire", "0");
          return;
        }
        const distance = Math.abs(playPos - cursor);
        line.classList.toggle("is-on", distance < 0.82);
        line.classList.toggle("is-near", distance >= 0.82 && distance < 2.15);
        line.style.setProperty("--fire", String(Math.max(0, 1 - distance / 2.15)));
      });

      const line = lineRefs.current[index];
      if (scanRef.current && line) {
        scanRef.current.style.transform = `translateY(${Math.max(0, line.offsetTop - 10)}px)`;
      }
      if (railRef.current) {
        railRef.current.style.height = `${Math.max(8, (cursor / span) * 100)}%`;
      }
      const row = rows[index];
      if (chromeRef.current && row) {
        chromeRef.current.textContent = talksAboutMoves(row)
          ? `agent.py · ${GAME_ECHO}`
          : `agent.py · ${row.fn}`;
      }
      return line;
    };

    if (reducedMotion) {
      const pick = rows.findIndex((row) => row.fn === "pick_move" && row.tokens.some((token) => token.kind === "fn"));
      const line = highlight(Math.max(0, pick));
      const pane = paneRef.current;
      if (pane && line) pane.scrollTop = Math.max(0, line.offsetTop - pane.clientHeight * 0.36);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const period = 12000;
    const span = Math.max(playable.length - 1, 1);

    const tick = (now: number) => {
      if (visibleRef.current && !document.hidden) {
        const progress = ((now - startedAt) / period) % 1;
        const line = highlight(progress * span);
        const pane = paneRef.current;
        if (pane && line) {
          if (progress < 0.04) {
            pane.scrollTop = 0;
          } else {
            const target = line.offsetTop - pane.clientHeight * 0.36;
            pane.scrollTop += (target - pane.scrollTop) * 0.12;
          }
        }
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playable, reducedMotion, rows, visibleRef]);

  return (
    <div className="code-shell pipeline-code">
      <div className="code-window">
        <div className="code-chrome" aria-hidden="true">
          <i className="code-live-dot" />
          <span className="code-chrome-file" ref={chromeRef}>agent.py</span>
        </div>
        <div className="code-pane" ref={paneRef}>
          <div className="code-scroll">
            {reducedMotion ? null : <div className="code-scan" ref={scanRef} />}
            {rows.map((row, index) => (
              <div
                className="code-line"
                key={row.key}
                ref={(node) => { lineRefs.current[index] = node; }}
              >
                <span className="code-gutter" aria-hidden="true">{String(row.number).padStart(2, "0")}</span>
                <span className="code-src">
                  {row.tokens.length ? row.tokens.map((token, tokenIndex) => (
                    <span className={`code-tok tok-${token.kind}`} key={`${row.key}-${tokenIndex}`}>{token.text}</span>
                  )) : " "}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="code-rail"><span className="code-fill" ref={railRef} /></div>
    </div>
  );
}

function MiniMatch({
  frameIndex,
  reducedMotion,
}: {
  frameIndex: number;
  reducedMotion: boolean;
}) {
  const frame = frames[frameIndex];
  const pieces = frame.pieces;
  const evaluationHeight = Math.max(12, Math.min(88, 50 + frame.evaluation * 17));

  return (
    <div className="pipeline-match" aria-hidden="true">
      <div className="agent-row agent-row-top">
        <span className="agent-identity"><i className="agent-chip dark" />Agent 17</span>
        <span className="pipeline-elo">ELO {DEMO_BLACK_ELO}</span>
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
              <span className={`board-square${isDark ? " dark" : ""}${isFrom ? " move-from" : ""}${isTo ? " move-to" : ""}`} key={square}>
                {piece ? (
                  <ChessPiece
                    key={`${square}-${piece.token}-${isTo ? frameIndex : "still"}`}
                    moving={moving && !reducedMotion}
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
        <span className="agent-identity"><i className="agent-chip" />Agent 04</span>
        <span className="pipeline-elo">ELO {DEMO_WHITE_ELO}</span>
      </div>
      <div className="match-foot">
        <span className="move-notation">{frame.move}</span>
        <span className="eval-value">ELO</span>
      </div>
    </div>
  );
}

export function AgentPipeline() {
  const rootRef = useRef<HTMLOListElement>(null);
  const reducedMotion = useReducedMotion();
  const visibleRef = useOnScreen(rootRef);
  const frameIndex = useMatchClock(frames.length, reducedMotion, visibleRef);

  return (
    <ol className="pipeline" ref={rootRef}>
      <li className="pipeline-step">
        <div className="pipeline-body">
          <CodeRipple reducedMotion={reducedMotion} visibleRef={visibleRef} />
          <p className="pipeline-label" id="pipeline-write">Write the code</p>
        </div>
      </li>
      <li className="pipeline-step pipeline-deploy">
        <div className="pipeline-body">
          <div className="pipeline-path" aria-hidden="true">
            <span className="pipeline-file">agent.py</span>
            <span className="pipeline-track">
              <span className="pipeline-shaft">
                <i className="pipeline-packet" />
              </span>
              <span className="pipeline-head" />
            </span>
            <span className="pipeline-host">server</span>
          </div>
        </div>
      </li>
      <li className="pipeline-step">
        <div className="pipeline-body">
          <MiniMatch frameIndex={frameIndex} reducedMotion={reducedMotion} />
          <p className="pipeline-label" id="pipeline-play">Play</p>
        </div>
      </li>
    </ol>
  );
}
