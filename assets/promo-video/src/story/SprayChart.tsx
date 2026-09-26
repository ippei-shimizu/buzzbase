import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, JP, SCENE } from "../theme";
import { track } from "../anim";

const HOME = { x: 540, y: 1520 };
const HITS = [
  { angle: -44, length: 470, hit: false },
  { angle: -36, length: 610, hit: true },
  { angle: -27, length: 520, hit: false },
  { angle: -18, length: 690, hit: true },
  { angle: -9, length: 430, hit: false },
  { angle: 0, length: 720, hit: true },
  { angle: 9, length: 560, hit: false },
  { angle: 18, length: 650, hit: true },
  { angle: 27, length: 480, hit: false },
  { angle: 36, length: 600, hit: true },
  { angle: 44, length: 500, hit: false },
];

const point = (angle: number, length: number) => ({
  x: HOME.x + Math.sin((angle * Math.PI) / 180) * length,
  y: HOME.y - Math.cos((angle * Math.PI) / 180) * length,
});

/** 打球方向を線だけで描く。グラウンドの緑で場面の色をもう一度入れ替える */
export const SprayChart: React.FC = () => {
  const frame = useCurrentFrame();
  const leftFoul = point(-45, 900);
  const rightFoul = point(45, 900);

  return (
    <AbsoluteFill style={{ backgroundColor: SCENE.field }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <path
          d={`M ${HOME.x} ${HOME.y} L ${leftFoul.x} ${leftFoul.y} A 900 900 0 0 1 ${rightFoul.x} ${rightFoul.y} Z`}
          fill={SCENE.grass}
          opacity={0.42}
        />
        <path
          d={`M ${HOME.x} ${HOME.y} L ${leftFoul.x} ${leftFoul.y}`}
          stroke="rgba(242,238,228,0.55)"
          strokeWidth={5}
        />
        <path
          d={`M ${HOME.x} ${HOME.y} L ${rightFoul.x} ${rightFoul.y}`}
          stroke="rgba(242,238,228,0.55)"
          strokeWidth={5}
        />
        <path
          d={`M ${HOME.x} ${HOME.y - 250} L ${HOME.x + 250} ${HOME.y} L ${HOME.x} ${HOME.y + 40} L ${HOME.x - 250} ${HOME.y} Z`}
          fill="none"
          stroke="rgba(242,238,228,0.30)"
          strokeWidth={4}
        />

        {HITS.map((entry, index) => {
          const grow = track(frame, 4 + index * 2.6, 16);
          const end = point(entry.angle, entry.length * grow);
          return (
            <g key={entry.angle}>
              <line
                x1={HOME.x}
                y1={HOME.y}
                x2={end.x}
                y2={end.y}
                stroke={entry.hit ? COLOR.goldHi : "rgba(242,238,228,0.34)"}
                strokeWidth={entry.hit ? 7 : 4}
                strokeLinecap="round"
              />
              <circle
                cx={end.x}
                cy={end.y}
                r={entry.hit ? 17 : 10}
                fill={entry.hit ? COLOR.gold : "rgba(242,238,228,0.42)"}
                opacity={grow}
              />
            </g>
          );
        })}
      </svg>

      <div
        style={{
          position: "absolute",
          top: 300,
          left: 78,
          fontFamily: JP,
          fontWeight: 900,
          fontSize: 96,
          color: COLOR.chalk,
          whiteSpace: "nowrap",
          opacity: track(frame, 2, 14),
          transform: `translateY(${(1 - track(frame, 2, 14)) * 26}px)`,
        }}
      >
        どこへ飛んだ？
      </div>
    </AbsoluteFill>
  );
};
