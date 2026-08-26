import type { CSSProperties } from "react";

import "./brand-mark.css";

const GRID = 9;
const RADIUS = (GRID - 1) / 2;
const CELL = 8;
const VIEW = 108;

type Tile = {
  key: string;
  x: number;
  y: number;
  tile: number;
  peak: number;
  dim: number;
  ripple: number;
};

function buildTiles() {
  const tiles: Tile[] = [];

  for (let y = -RADIUS; y <= RADIUS; y += 1) {
    for (let x = -RADIUS; x <= RADIUS; x += 1) {
      if (((x + y) & 1) !== 0) continue;

      const dist = Math.hypot(x, y);
      const fade = Math.max(0, 1 - dist / 4.45);
      const tile = Number(Math.pow(fade, 1.35).toFixed(3));
      if (tile <= 0.02) continue;

      tiles.push({
        key: `${x}:${y}`,
        x: x * CELL - CELL / 2,
        y: y * CELL - CELL / 2,
        tile,
        peak: Number(Math.min(1, tile * 1.28 + 0.05).toFixed(3)),
        dim: Number((tile * 0.52).toFixed(3)),
        ripple: Math.round(dist),
      });
    }
  }

  return tiles;
}

const TILES = buildTiles();

export function BrandMark(_props?: { animate?: boolean; priority?: boolean }) {
  return (
    <svg
      className="wordmark-logo aichessathon-mark"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      aria-hidden="true"
      focusable="false"
    >
      <g transform={`translate(${VIEW / 2} ${VIEW / 2}) rotate(45)`}>
        {TILES.map((tile) => (
          <rect
            key={tile.key}
            className="aichessathon-mark-tile"
            x={tile.x}
            y={tile.y}
            width={CELL}
            height={CELL}
            style={
              {
                "--tile": tile.tile,
                "--peak": tile.peak,
                "--dim": tile.dim,
                "--ripple": tile.ripple,
              } as CSSProperties
            }
          />
        ))}
      </g>
    </svg>
  );
}
