import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, DISPLAY, JP, SCENE } from "../theme";
import { track } from "../anim";

const COLUMNS = 4;
const ROWS = 5;
const CELL = 196;
const MARKS = [
  { row: 0, column: 1, label: "投ゴ" },
  { row: 1, column: 0, label: "三振" },
  { row: 2, column: 2, label: "左安" },
  { row: 3, column: 1, label: "四球" },
];

/** クリーム地のスコアブック。前後の暗い場面と明度を反転させて飽きを防ぐ */
export const Scorebook: React.FC = () => {
  const frame = useCurrentFrame();
  const left = (1080 - COLUMNS * CELL) / 2;
  const top = 780;

  return (
    <AbsoluteFill style={{ backgroundColor: SCENE.cream }}>
      <div
        style={{
          position: "absolute",
          top: 300,
          left: 78,
          fontFamily: JP,
          fontWeight: 900,
          fontSize: 96,
          color: SCENE.creamInk,
          whiteSpace: "nowrap",
          opacity: track(frame, 2, 14),
          transform: `translateY(${(1 - track(frame, 2, 14)) * 26}px)`,
        }}
      >
        どこに投げられて、
      </div>
      <div
        style={{
          position: "absolute",
          top: 432,
          left: 78,
          width: `${track(frame, 10, 18) * 560}px`,
          height: 12,
          background: COLOR.gold,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 486,
          left: 80,
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: "0.4em",
          color: "rgba(23,18,10,0.5)",
          opacity: track(frame, 14, 14),
        }}
      >
        SCOREBOOK
      </div>

      <svg
        width="1080"
        height="1920"
        viewBox="0 0 1080 1920"
        style={{ position: "absolute", inset: 0 }}
      >
        {Array.from({ length: ROWS + 1 }).map((_, row) => (
          <line
            key={`h${row}`}
            x1={left}
            y1={top + row * CELL}
            x2={left + COLUMNS * CELL * track(frame, 4 + row * 2, 16)}
            y2={top + row * CELL}
            stroke="rgba(23,18,10,0.42)"
            strokeWidth={3}
          />
        ))}
        {Array.from({ length: COLUMNS + 1 }).map((_, column) => (
          <line
            key={`v${column}`}
            x1={left + column * CELL}
            y1={top}
            x2={left + column * CELL}
            y2={top + ROWS * CELL * track(frame, 4 + column * 2, 16)}
            stroke="rgba(23,18,10,0.42)"
            strokeWidth={3}
          />
        ))}
        {MARKS.map((mark, index) => {
          const appear = track(frame, 20 + index * 6, 14);
          const cx = left + mark.column * CELL + CELL / 2;
          const cy = top + mark.row * CELL + CELL / 2;
          const size = 58 * appear;
          return (
            <g key={mark.label} opacity={appear}>
              <polygon
                points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
                fill="none"
                stroke={SCENE.creamInk}
                strokeWidth={5}
              />
              <text
                x={cx}
                y={cy + 12}
                textAnchor="middle"
                fontFamily="Hiragino Sans, sans-serif"
                fontWeight={700}
                fontSize={38}
                fill={SCENE.creamInk}
              >
                {mark.label}
              </text>
            </g>
          );
        })}
        <polygon
          points={`${left + 3 * CELL + CELL / 2},${top + 4 * CELL + CELL / 2 - 62} ${left + 3 * CELL + CELL / 2 + 62},${top + 4 * CELL + CELL / 2} ${left + 3 * CELL + CELL / 2},${top + 4 * CELL + CELL / 2 + 62} ${left + 3 * CELL + CELL / 2 - 62},${top + 4 * CELL + CELL / 2}`}
          fill={COLOR.gold}
          opacity={track(frame, 40, 12)}
        />
      </svg>
    </AbsoluteFill>
  );
};
