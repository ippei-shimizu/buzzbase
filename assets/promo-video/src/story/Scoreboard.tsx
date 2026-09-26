import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, DISPLAY, JP, SCENE } from "../theme";
import { track } from "../anim";

const ROWS = [
  { rank: 1, name: "YOU", value: ".318", me: true },
  { rank: 2, name: "TANAKA", value: ".301" },
  { rank: 3, name: "SATO", value: ".287" },
  { rank: 4, name: "WATANABE", value: ".264" },
];

const BULBS = 22;

/** 球場の電光掲示板。アンバーの発光で場面の色をもう一度変える */
export const Scoreboard: React.FC = () => {
  const frame = useCurrentFrame();
  const flicker = 0.82 + 0.18 * Math.sin(frame * 0.9);

  return (
    <AbsoluteFill style={{ backgroundColor: SCENE.board }}>
      <div
        style={{
          position: "absolute",
          top: 262,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: JP,
          fontWeight: 900,
          fontSize: 82,
          color: COLOR.chalk,
          whiteSpace: "nowrap",
          opacity: track(frame, 2, 14),
        }}
      >
        チームの中で、何番手か。
      </div>

      <div
        style={{
          position: "absolute",
          top: 560,
          left: 70,
          right: 70,
          padding: "54px 46px",
          border: `5px solid rgba(255,176,32,0.34)`,
          borderRadius: 18,
          background: "linear-gradient(180deg, rgba(255,176,32,0.05), rgba(0,0,0,0.3))",
          opacity: track(frame, 4, 16),
        }}
      >
        {Array.from({ length: BULBS }).map((_, index) => {
          const lit = (index + Math.floor(frame / 3)) % 4 === 0;
          return (
            <span
              key={index}
              style={{
                position: "absolute",
                top: -9,
                left: `${(index / (BULBS - 1)) * 100}%`,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: lit ? SCENE.bulb : "rgba(255,176,32,0.22)",
                boxShadow: lit ? `0 0 18px ${SCENE.bulb}` : "none",
                transform: "translateX(-50%)",
              }}
            />
          );
        })}

        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: "0.4em",
            color: "rgba(255,176,32,0.62)",
            marginBottom: 34,
          }}
        >
          TEAM BATTING AVG
        </div>

        {ROWS.map((row, index) => {
          const appear = track(frame, 10 + index * 7, 16);
          return (
            <div
              key={row.name}
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr auto",
                alignItems: "center",
                gap: 24,
                padding: "22px 0",
                borderTop: index === 0 ? "none" : "2px solid rgba(255,176,32,0.16)",
                opacity: appear,
                transform: `translateX(${(1 - appear) * -30}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 900,
                  fontSize: 64,
                  color: row.me ? SCENE.bulb : "rgba(255,176,32,0.44)",
                  textShadow: row.me ? `0 0 26px rgba(255,176,32,${flicker})` : "none",
                }}
              >
                {row.rank}
              </span>
              <span
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 52,
                  letterSpacing: "0.16em",
                  color: row.me ? SCENE.bulb : "rgba(255,176,32,0.5)",
                }}
              >
                {row.name}
              </span>
              <span
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 900,
                  fontSize: 62,
                  fontVariantNumeric: "tabular-nums",
                  color: row.me ? SCENE.bulb : "rgba(255,176,32,0.5)",
                  textShadow: row.me ? `0 0 26px rgba(255,176,32,${flicker})` : "none",
                }}
              >
                {row.value}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
