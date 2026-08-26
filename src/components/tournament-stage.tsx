"use client";

import type { RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChessPiece, moveOffset } from "@/components/chess-piece";
import { QUALIFICATION_DATES_SHORT } from "@/lib/event";

import "./code-view.css";

type Side = "white" | "black";
type Piece = { token: string; black: boolean };
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
  plyMs: number;
  frames: Frame[];
  game: string;
  echo: string;
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
const FILES = "abcdefgh";

function fileOf(square: string) {
  return FILES.indexOf(square[0]);
}

function rankOf(square: string) {
  return Number(square[1]);
}

function sq(file: number, rank: number) {
  return `${FILES[file]}${rank}`;
}

function pathClear(position: Map<string, Piece>, from: string, to: string) {
  const df = Math.sign(fileOf(to) - fileOf(from));
  const dr = Math.sign(rankOf(to) - rankOf(from));
  let file = fileOf(from) + df;
  let rank = rankOf(from) + dr;
  while (file !== fileOf(to) || rank !== rankOf(to)) {
    if (position.has(sq(file, rank))) return false;
    file += df;
    rank += dr;
  }
  return true;
}

function canSlide(position: Map<string, Piece>, from: string, to: string, diagonals: boolean, orthogonals: boolean) {
  const df = fileOf(to) - fileOf(from);
  const dr = rankOf(to) - rankOf(from);
  if (df === 0 && dr === 0) return false;
  const diag = Math.abs(df) === Math.abs(dr);
  const orth = df === 0 || dr === 0;
  if (diag && !diagonals) return false;
  if (orth && !orthogonals) return false;
  if (!diag && !orth) return false;
  return pathClear(position, from, to);
}

function canReach(position: Map<string, Piece>, from: string, to: string, token: string, capture: boolean) {
  const kind = token.toLowerCase();
  const black = token === token.toLowerCase();
  const df = fileOf(to) - fileOf(from);
  const dr = rankOf(to) - rankOf(from);
  if (kind === "n") return (Math.abs(df) === 1 && Math.abs(dr) === 2) || (Math.abs(df) === 2 && Math.abs(dr) === 1);
  if (kind === "k") return Math.max(Math.abs(df), Math.abs(dr)) === 1;
  if (kind === "b") return canSlide(position, from, to, true, false);
  if (kind === "r") return canSlide(position, from, to, false, true);
  if (kind === "q") return canSlide(position, from, to, true, true);
  if (kind === "p") {
    const dir = black ? -1 : 1;
    const start = black ? 7 : 2;
    if (!capture) {
      if (df !== 0 || position.has(to)) return false;
      if (dr === dir) return true;
      return rankOf(from) === start && dr === 2 * dir && !position.has(sq(fileOf(from), rankOf(from) + dir));
    }
    return Math.abs(df) === 1 && dr === dir;
  }
  return false;
}

function applySan(position: Map<string, Piece>, san: string, black: boolean) {
  const body = san.replace(/[+#?!]+/g, "");
  const rank = black ? 8 : 1;

  if (body === "O-O" || body === "0-0") {
    const from = `e${rank}`;
    const to = `g${rank}`;
    const rookFrom = `h${rank}`;
    const rookTo = `f${rank}`;
    const king = position.get(from);
    const rook = position.get(rookFrom);
    if (!king || !rook) throw new Error(`Castling pieces missing for ${san}`);
    position.delete(from);
    position.delete(rookFrom);
    position.set(to, king);
    position.set(rookTo, rook);
    return { from, to };
  }

  if (body === "O-O-O" || body === "0-0-0") {
    const from = `e${rank}`;
    const to = `c${rank}`;
    const rookFrom = `a${rank}`;
    const rookTo = `d${rank}`;
    const king = position.get(from);
    const rook = position.get(rookFrom);
    if (!king || !rook) throw new Error(`Castling pieces missing for ${san}`);
    position.delete(from);
    position.delete(rookFrom);
    position.set(to, king);
    position.set(rookTo, rook);
    return { from, to };
  }

  let move = body;
  let promo: string | null = null;
  const promoMatch = move.match(/=([QRBN])$/);
  if (promoMatch) {
    promo = black ? promoMatch[1].toLowerCase() : promoMatch[1];
    move = move.slice(0, -2);
  }

  const capture = move.includes("x");
  move = move.replace("x", "");
  const dest = move.slice(-2);
  const spec = move.slice(0, -2);
  let pieceKind = "P";
  let hintFile = -1;
  let hintRank = -1;

  if (spec && "KQRBN".includes(spec[0])) {
    pieceKind = spec[0];
    const hint = spec.slice(1);
    if (hint.length === 1) {
      if (/[a-h]/.test(hint)) hintFile = FILES.indexOf(hint);
      else hintRank = Number(hint);
    } else if (hint.length === 2) {
      hintFile = FILES.indexOf(hint[0]);
      hintRank = Number(hint[1]);
    }
  } else if (spec.length === 1 && /[a-h]/.test(spec)) {
    hintFile = FILES.indexOf(spec);
  }

  const token = pieceKind === "P" ? (black ? "p" : "P") : (black ? pieceKind.toLowerCase() : pieceKind);
  const destPiece = position.get(dest);
  if (destPiece && destPiece.black === black) throw new Error(`Own piece on ${dest} for ${san}`);

  const candidates: string[] = [];
  for (const [square, piece] of position) {
    if (piece.token !== token) continue;
    if (hintFile >= 0 && fileOf(square) !== hintFile) continue;
    if (hintRank >= 0 && rankOf(square) !== hintRank) continue;
    if (!canReach(position, square, dest, piece.token, capture || Boolean(destPiece))) continue;
    candidates.push(square);
  }

  if (candidates.length !== 1) {
    throw new Error(`Ambiguous or illegal ${san} (${candidates.join(",") || "none"})`);
  }

  const from = candidates[0];
  const piece = position.get(from);
  if (!piece) throw new Error(`Missing piece for ${san}`);
  position.delete(from);
  position.delete(dest);
  position.set(dest, promo ? { token: promo, black } : piece);
  return { from, to: dest };
}

function framesFromSan(sans: string[], winner: Side): Frame[] {
  const position = parseFen(STARTING_FEN);
  const frames: Frame[] = [{
    move: "Start position",
    from: null,
    to: null,
    evaluation: 0,
    pieces: new Map(position),
    activeSide: "white",
  }];

  sans.forEach((san, index) => {
    const { from, to } = applySan(position, san, index % 2 === 1);
    const n = Math.floor(index / 2) + 1;
    const t = (index + 1) / sans.length;
    const mag = 0.08 + t * 1.1;
    frames.push({
      move: index % 2 === 0 ? `${n}. ${san}` : `${n}… ${san}`,
      from,
      to,
      evaluation: winner === "white" ? mag : -mag,
      pieces: new Map(position),
      activeSide: index % 2 === 0 ? "black" : "white",
    });
  });

  return frames;
}

const OPERA = "e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#".split(" ");
const EVERGREEN = "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d3 Qb3 Qf6 e5 Qg6 Re1 Nge7 Ba3 b5 Qxb5 Rb8 Qa4 Bb6 Nbd2 Bb7 Ne4 Qf5 Bxd3 Qh5 Nf6+ gxf6 exf6 Rg8 Rad1 Qxf3 Rxe7+ Nxe7 Qxd7+ Kxd7 Bf5+ Ke8 Bd7+ Kf8 Bxe7#".split(" ");
const CENTURY = "Nf3 Nf6 c4 g6 Nc3 Bg7 d4 O-O Bf4 d5 Qb3 dxc4 Qxc4 c6 e4 Nbd7 Rd1 Nb6 Qc5 Bg4 Bg5 Na4 Qa3 Nxc3 bxc3 Nxe4 Bxe7 Qb6 Bc4 Nxc3 Bc5 Rfe8+ Kf1 Be6 Bxb6 Bxc4+ Kg1 Ne2+ Kf1 Nxd4+ Kg1 Ne2+ Kf1 Nc3+ Kg1 axb6 Qb4 Ra4 Qxb6 Nxd1 h3 Rxa2 Kh2 Nxf2 Re1 Rxe1 Qd8+ Bf8 Nxe1 Bd5 Nf3 Ne4 Qb8 b5 h4 h5 Ne5 Kg7 Kg1 Bc5+ Kf1 Ng3+ Ke1 Bb4+ Kd1 Bb3+ Kc1 Ne2+ Kb1 Nc3+ Kc1 Rc2#".split(" ");

const matches: Match[] = [
  {
    board: "Board 01", white: "Agent 04", black: "Agent 17", whiteClock: 600, blackClock: 600,
    offset: 90, plyMs: 560,
    game: "Opera", echo: "Rd8#",
    frames: framesFromSan(OPERA, "white"),
  },
  {
    board: "Board 02", white: "Agent 12", black: "Agent 09", whiteClock: 600, blackClock: 600,
    offset: 370, plyMs: 730,
    game: "Evergreen", echo: "Bxe7#",
    frames: framesFromSan(EVERGREEN, "white"),
  },
  {
    board: "Board 03", white: "Agent 21", black: "Agent 02", whiteClock: 600, blackClock: 600,
    offset: 680, plyMs: 910,
    game: "Century", echo: "Be6",
    frames: framesFromSan(CENTURY, "black"),
  },
];

function nextPlyDelay(match: Match, firstMove: boolean) {
  if (firstMove) return match.offset;
  if (Math.random() < 0.16) return match.plyMs + 200 + Math.round(Math.random() * 280);
  return match.plyMs;
}

function formatClock(seconds: number) {
  const bounded = Math.max(0, seconds);
  return `${String(Math.floor(bounded / 60)).padStart(2, "0")}:${String(bounded % 60).padStart(2, "0")}`;
}

type StageView = "boards" | "code";
type TokenKind = "kw" | "fn" | "hot" | "str" | "num" | "cm" | "id" | "op";
type Token = { kind: TokenKind; text: string };
type CodeRow =
  | { kind: "file"; key: string; filename: string }
  | { kind: "code"; key: string; filename: string; number: number; fn: string; tokens: Token[] };

const PY_KEYWORDS = new Set([
  "and", "as", "break", "class", "continue", "def", "elif", "else", "False",
  "for", "from", "if", "import", "in", "is", "lambda", "None", "not", "or",
  "pass", "return", "True", "while",
]);
const PY_HOT = new Set([
  "CAPTURE", "CENTER", "CHECKS", "FORK", "PIECE", "SAFE", "STRUCT",
  "activity", "alpha", "beta", "budget", "center", "clock", "cutoff", "depth",
  "evaluate", "in_check", "isolated", "legal_moves", "mobility", "nodes",
  "order_moves", "passed", "pick_move", "safety", "score", "search", "shield",
  "structure", "tactics", "time_left",
]);

function agentFile(name: string) {
  return `${name.toLowerCase().replace(/\s+/g, "_")}.py`;
}

const AGENT_SOURCE: Record<string, string> = {
  "Agent 04": `PIECE = {"P": 1, "N": 3, "B": 3, "R": 5, "Q": 9, "K": 0}
CENTER = {"d4", "d5", "e4", "e5"}
SAFE = {"g1", "g8", "c1", "c8"}

def evaluate(pos):
    score = 0.0
    for sq, piece in pos.pieces():
        sign = 1 if piece.white else -1
        score += sign * PIECE[piece.kind]
        if sq in CENTER:
            score += sign * 0.12
        if piece.kind == "K" and sq in SAFE:
            score += sign * 0.18
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

def pick_move(pos, clock):
    depth = 3 if clock > 90 else 2
    choice, best = None, -99.0
    for move in pos.legal_moves():
        pos.push(move)  # Opera, 1858
        value = -search(pos, depth, -8, 8)
        pos.pop()
        if move.san == "Qb8+":
            value += 0.16
        if value > best:
            choice, best = move, value
    return choice`,
  "Agent 17": `CAPTURE = {"P": 10, "N": 32, "B": 33, "R": 50, "Q": 90, "K": 0}

def activity(pos, side):
    score = 0.0
    for move in pos.legal_moves():
        if move.side != side:
            continue
        score += 0.04
        if move.to in pos.center:
            score += 0.08
        if move.capture:
            score += CAPTURE[move.capture] / 100
    return score

def evaluate(pos):
    score = activity(pos, "b") - activity(pos, "w")
    if pos.in_check:
        score += 0.4 if pos.side == "w" else -0.4
    return score

def order_moves(pos):
    return sorted(pos.legal_moves(), key=lambda m: CAPTURE.get(m.capture, 0), reverse=True)

def search(pos, depth, alpha, beta):
    if depth == 0 or pos.done():
        return evaluate(pos)
    best = -99.0
    for move in order_moves(pos):
        pos.push(move)
        value = -search(pos, depth - 1, -beta, -alpha)
        pos.pop()
        if value > best:
            best = value
        alpha = max(alpha, value)
        if alpha >= beta:
            break
    return best

def pick_move(pos, clock):
    depth = 4 if clock > 120 else 2
    ranked = []
    for move in order_moves(pos):
        pos.push(move)  # Morphy at the Opera
        ranked.append((search(pos, depth, -8, 8), move))
        pos.pop()
        if move.san == "Rd8#":
            ranked[-1] = (ranked[-1][0] + 0.2, move)
    ranked.sort(reverse=True)
    return ranked[0][1]`,
  "Agent 12": `STRUCT = {"c4": 0.16, "d4": 0.22, "e3": 0.08, "c5": -0.10}

def structure(pos):
    score = 0.0
    for sq, piece in pos.pieces():
        if piece.kind != "P":
            continue
        sign = 1 if piece.white else -1
        score += sign * STRUCT.get(sq, 0)
        if pos.isolated(sq):
            score -= sign * 0.11
        if pos.passed(sq):
            score += sign * 0.20
    return score

def evaluate(pos):
    score = structure(pos)
    if pos.in_check:
        score += -0.3 if pos.side == "w" else 0.3
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

def pick_move(pos, clock):
    depth = 3 if clock > 75 else 2
    choice, best = None, -99.0
    for move in pos.legal_moves():
        pos.push(move)  # Evergreen, 1852
        value = -search(pos, depth, -6, 6) + structure(pos) * 0.15
        pos.pop()
        if move.san == "Qxd7+":
            value += 0.18
        if value > best:
            choice, best = move, value
    return choice`,
  "Agent 09": `def time_left(clock, moves):
    return clock / max(12, 40 - moves)

def safety(pos, side):
    king = pos.king(side)
    score = 0.16 if king in pos.castle_side else -0.12
    score += 0.05 * pos.shield(king)
    if pos.in_check and pos.side == side:
        score -= 0.28
    return score

def evaluate(pos):
    score = safety(pos, "b") - safety(pos, "w")
    score += 0.03 * (pos.mobility("b") - pos.mobility("w"))
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

def pick_move(pos, clock):
    budget = time_left(clock, pos.ply)
    depth = 3 if budget > 4 else 2
    choice, best = None, -99.0
    for move in pos.legal_moves():
        if move.hangs and budget < 3:
            continue
        pos.push(move)  # Anderssen vs Dufresne
        value = -search(pos, depth, -7, 7)
        pos.pop()
        if move.san == "Bxe7#":
            value += 0.22
        if value > best:
            choice, best = move, value
    return choice`,
  "Agent 21": `CHECKS = 0.42
FORK = 0.36

def tactics(pos, move):
    score = 0.0
    if move.check:
        score += CHECKS
    if move.fork:
        score += FORK
    if move.capture:
        score += 0.08 * move.see
    return score

def evaluate(pos):
    score = 0.0
    for move in pos.legal_moves():
        sign = 1 if move.side == "w" else -1
        score += sign * tactics(pos, move)
    if pos.in_check:
        score += -0.25 if pos.side == "w" else 0.25
    return score

def search(pos, depth, alpha, beta):
    if depth == 0 or pos.done():
        return evaluate(pos)
    best = -99.0
    nodes = 0
    for move in pos.legal_moves():
        nodes += 1
        pos.push(move)
        value = -search(pos, depth - 1, -beta, -alpha)
        pos.pop()
        best = max(best, value)
        alpha = max(alpha, value)
        if alpha >= beta:
            break
    return best

def pick_move(pos, clock):
    depth = 4 if clock > 100 else 3
    choice, best = None, -99.0
    for move in pos.legal_moves():
        pos.push(move)  # New York, 1956
        value = -search(pos, depth, -9, 9) + tactics(pos, move)
        pos.pop()
        if move.san == "Be6":
            value += 0.14
        if value > best:
            choice, best = move, value
    return choice`,
  "Agent 02": `CENTER = {"d4", "e4", "d5", "e5"}

def budget(clock, ply):
    return max(0.4, clock / max(8, 36 - ply * 0.4))

def evaluate(pos):
    score = 0.0
    for sq, piece in pos.pieces():
        sign = 1 if piece.white else -1
        if sq in CENTER:
            score += sign * 0.14
        if piece.kind == "P" and sq[1] in "45":
            score += sign * 0.06
    if pos.in_check:
        score += -0.32 if pos.side == "w" else 0.32
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

def pick_move(pos, clock):
    slice = budget(clock, pos.ply)
    depth = 3 if slice > 2.5 else 2
    choice, best = None, -99.0
    for move in pos.legal_moves():
        pos.push(move)  # Game of the Century
        value = -search(pos, depth, -8, 8)
        pos.pop()
        if move.san == "Nc3+":
            value += 0.18
        if value > best:
            choice, best = move, value
    return choice`,
};

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

function rowsFor(files: Array<{ filename: string; source: string }>): CodeRow[] {
  const rows: CodeRow[] = [];
  for (const file of files) {
    rows.push({ kind: "file", key: `file-${file.filename}`, filename: file.filename });
    let fn = "module";
    file.source.split("\n").forEach((text, index) => {
      const tokens = tokenize(text);
      const defined = tokens.find((token) => token.kind === "fn");
      if (defined) fn = defined.text;
      rows.push({
        kind: "code",
        key: `${file.filename}-${index}`,
        filename: file.filename,
        number: index + 1,
        fn,
        tokens,
      });
    });
  }
  return rows;
}

function animatableIndexes(rows: CodeRow[]) {
  return rows.flatMap((row, index) => (row.kind === "code" && row.tokens.length ? [index] : []));
}

function talksAboutMoves(row: CodeRow) {
  if (row.kind !== "code") return false;
  if (row.fn === "pick_move") return true;
  return row.tokens.some((token) => token.text === "legal_moves" || token.text === "push" || token.text === "order_moves");
}

function paintScan(
  rows: CodeRow[],
  playable: number[],
  playableAt: number[],
  cursor: number,
  lineNodes: Array<HTMLDivElement | null>,
  scan: HTMLDivElement | null,
  rail: HTMLSpanElement | null,
  label: HTMLSpanElement | null,
  chrome: HTMLSpanElement | null,
  echo?: string,
) {
  const span = Math.max(playable.length - 1, 1);
  const playIndex = Math.min(playable.length - 1, Math.max(0, Math.floor(cursor)));
  const index = playable[playIndex] ?? 0;

  lineNodes.forEach((line, lineIndex) => {
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

  const line = lineNodes[index];
  if (scan && line) {
    scan.style.transform = `translateY(${Math.max(0, line.offsetTop - 10)}px)`;
  }
  if (rail) {
    rail.style.height = `${Math.max(8, (cursor / span) * 100)}%`;
  }

  const row = rows[index];
  if (row) {
    if (label) label.textContent = row.kind === "file" ? row.filename : `${row.filename} · ${row.fn}`;
    if (chrome) {
      chrome.textContent = row.kind === "code" && echo && talksAboutMoves(row)
        ? `${row.filename} · ${echo}`
        : row.filename;
    }
  }

  return { index, line };
}

function CodePane({
  files,
  offset,
  active,
  reducedMotion,
  visibleRef,
  labelRef,
  echo,
}: {
  files: Array<{ filename: string; source: string }>;
  offset: number;
  active: boolean;
  reducedMotion: boolean;
  visibleRef: RefObject<boolean>;
  labelRef: RefObject<HTMLSpanElement | null>;
  echo?: string;
}) {
  const paneRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lastProgress = useRef(0);
  const rows = useMemo(() => rowsFor(files), [files]);
  const playable = useMemo(() => animatableIndexes(rows), [rows]);
  const playableAt = useMemo(() => {
    const slots = Array.from({ length: rows.length }, () => -1);
    playable.forEach((rowIndex, playIndex) => { slots[rowIndex] = playIndex; });
    return slots;
  }, [playable, rows.length]);
  const period = 22000;

  useEffect(() => {
    lineRefs.current = lineRefs.current.slice(0, rows.length);
  }, [rows.length]);

  useEffect(() => {
    if (!active) return;

    const highlight = (cursor: number) => paintScan(
      rows,
      playable,
      playableAt,
      cursor,
      lineRefs.current,
      scanRef.current,
      railRef.current,
      labelRef.current,
      chromeRef.current,
      echo,
    );

    if (reducedMotion) {
      const pick = rows.findIndex((row) => row.kind === "code" && row.fn === "pick_move" && row.tokens.some((token) => token.kind === "fn"));
      const fallback = playable.find((index) => rows[index]?.kind === "code" && rows[index].fn === "search") ?? playable[Math.floor(playable.length / 3)] ?? 0;
      const { line } = highlight(Math.max(0, playableAt[pick >= 0 ? pick : fallback]));
      const pane = paneRef.current;
      if (pane && line) {
        pane.scrollTop = Math.max(0, line.offsetTop - pane.clientHeight * 0.36);
      }
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const span = Math.max(playable.length - 1, 1);

    const tick = (now: number) => {
      if (visibleRef.current && !document.hidden) {
        const progress = ((now - startedAt) / period + offset) % 1;
        if (lastProgress.current > 0.86 && progress < 0.14 && paneRef.current) {
          paneRef.current.scrollTop = 0;
        }
        lastProgress.current = progress;

        const { index, line } = highlight(progress * span);
        const pane = paneRef.current;
        if (pane && line) {
          const target = line.offsetTop - pane.clientHeight * 0.36;
          if (index === playable[0] && progress < 0.04) {
            pane.scrollTop = 0;
          } else {
            pane.scrollTop += (target - pane.scrollTop) * 0.12;
          }
        }
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active, echo, labelRef, offset, period, playable, playableAt, reducedMotion, rows, visibleRef]);

  return (
    <div className="code-shell">
      <div className="code-window">
        <div className="code-chrome" aria-hidden="true">
          <i className="code-live-dot" />
          <span className="code-chrome-file" ref={chromeRef}>{files[0]?.filename}</span>
        </div>
        <div className="code-pane" ref={paneRef}>
          <div className="code-scroll">
            {reducedMotion ? null : <div className="code-scan" ref={scanRef} />}
            {rows.map((row, index) => (
              row.kind === "file" ? (
                <div
                  className="code-file"
                  key={row.key}
                  ref={(node) => { lineRefs.current[index] = node; }}
                >
                  <span className="code-gutter" aria-hidden="true" />
                  <span className="code-file-name">{row.filename}</span>
                </div>
              ) : (
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
              )
            ))}
          </div>
        </div>
      </div>
      <div className="code-rail"><span className="code-fill" ref={railRef} /></div>
    </div>
  );
}

function MatchCard({ match, index, view }: { match: Match; index: number; view: StageView }) {
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

  const execLabelRef = useRef<HTMLSpanElement>(null);
  const agentFiles = useMemo(() => [
    { filename: agentFile(match.black), source: AGENT_SOURCE[match.black] },
    { filename: agentFile(match.white), source: AGENT_SOURCE[match.white] },
  ], [match.black, match.white]);
  const showCode = view === "code";

  useEffect(() => {
    if (showCode || reducedMotion) return;

    let cancelled = false;
    let moveTimer: number | undefined;

    if (playback.status === "complete") {
      moveTimer = window.setTimeout(() => {
        if (cancelled) return;
        setPlayback({
          frameIndex: 0,
          whiteClock: match.whiteClock,
          blackClock: match.blackClock,
          status: "waiting",
        });
      }, 1600);
      return () => {
        cancelled = true;
        if (moveTimer !== undefined) window.clearTimeout(moveTimer);
      };
    }

    const firstMove = playback.frameIndex === 0;
    const scheduleMove = (delay: number) => {
      moveTimer = window.setTimeout(() => {
        if (cancelled) return;
        if (!visibleRef.current || document.hidden) {
          scheduleMove(180);
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

    scheduleMove(nextPlyDelay(match, firstMove));
    return () => {
      cancelled = true;
      if (moveTimer !== undefined) window.clearTimeout(moveTimer);
    };
  }, [match, playback.frameIndex, playback.status, reducedMotion, showCode]);

  useEffect(() => {
    if (showCode || reducedMotion || playback.status !== "playing") return;
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
  }, [match, playback.status, reducedMotion, showCode]);

  const frameIndex = reducedMotion ? match.frames.length - 1 : playback.frameIndex;
  const frame = match.frames[frameIndex];
  const pieces = frame.pieces;
  const activeSide = frame.activeSide;
  const clockIsRunning = !reducedMotion && playback.status === "playing";
  const evaluationHeight = Math.max(12, Math.min(88, 50 + frame.evaluation * 17));

  return (
    <article className="match-card" data-reveal ref={cardRef}>
      <p className="sr-only">
        {match.board}: {match.white} versus {match.black}.
        {showCode
          ? ` Illustrative Python for ${agentFile(match.black)} and ${agentFile(match.white)}. Not submitted agent source.`
          : frame.from ? ` Current move ${frame.move}.` : " Starting position."}
      </p>
      <div aria-hidden="true">
        <div className="match-topline"><span>{match.board}</span><span>{showCode ? "Source" : match.game}</span></div>
        <div className="agent-row agent-row-top">
          <span className="agent-identity"><i className="agent-chip dark" />{showCode ? agentFile(match.black) : match.black}</span>
          <time className={`clock${clockIsRunning && activeSide === "black" ? " active" : ""}`} dateTime={`PT${playback.blackClock}S`}>{formatClock(playback.blackClock)}</time>
        </div>
        <div className="board-shell" hidden={showCode}>
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
        {showCode ? (
          <CodePane
            active
            echo={match.echo}
            files={agentFiles}
            labelRef={execLabelRef}
            offset={index * 0.27}
            reducedMotion={reducedMotion}
            visibleRef={visibleRef}
          />
        ) : null}
        <div className="agent-row agent-row-bottom">
          <span className="agent-identity"><i className="agent-chip" />{showCode ? agentFile(match.white) : match.white}</span>
          <time className={`clock${clockIsRunning && activeSide === "white" ? " active" : ""}`} dateTime={`PT${playback.whiteClock}S`}>{formatClock(playback.whiteClock)}</time>
        </div>
        <div className="match-foot">
          {showCode ? (
            <>
              <span className="move-notation" ref={execLabelRef}>{agentFile(match.black)}</span>
              <span className="eval-value">trace</span>
            </>
          ) : (
            <>
              <span className="move-notation">{frame.move}</span>
              <span className="eval-value">Eval {frame.evaluation > 0 ? "+" : ""}{frame.evaluation.toFixed(1)}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function TournamentStage() {
  const [view, setView] = useState<StageView>("boards");

  return (
    <section className="tournament-stage" aria-labelledby="simulation-title">
      <div className="stage-head">
        <div className="stage-head-start">
          <h2 className="stage-label" id="simulation-title">Match simulation</h2>
          <div className="stage-view-toggle" role="group" aria-label="Simulation view">
            <button aria-pressed={view === "boards"} onClick={() => setView("boards")} type="button">Boards</button>
            <button aria-pressed={view === "code"} onClick={() => setView("code")} type="button">Code</button>
          </div>
        </div>
        <p className="stage-meta">Qualification · {QUALIFICATION_DATES_SHORT} · 3 boards</p>
      </div>
      <div className="matches-grid">{matches.map((match, index) => <MatchCard index={index} key={match.board} match={match} view={view} />)}</div>
    </section>
  );
}
