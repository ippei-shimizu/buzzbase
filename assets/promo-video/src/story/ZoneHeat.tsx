import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, DISPLAY, JP, SCENE } from "../theme";
import { track } from "../anim";

const HEAT = [
  [0.188, 0.214, 0.265, 0.231, 0.175],
  [0.205, 0.289, 0.348, 0.302, 0.198],
  [0.242, 0.361, 0.455, 0.338, 0.221],
  [0.219, 0.318, 0.372, 0.284, 0.192],
  [0.151, 0.198, 0.236, 0.207, 0.143],
];
const CELL = 176;

/** コースを色の面だけで見せる。アプリの画面は出さない */
export const ZoneHeat: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SCENE.night,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 320,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: JP,
          fontWeight: 900,
          fontSize: 96,
          color: COLOR.chalk,
          opacity: track(frame, 2, 14),
        }}
      >
        どこを打った？
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(5, ${CELL}px)`,
          gridAutoRows: CELL,
          gap: 12,
          transform: `translateY(90px) rotateX(${8 - track(frame, 0, 30) * 8}deg)`,
        }}
      >
        {HEAT.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => {
            const appear = track(frame, 4 + (rowIndex + columnIndex) * 2.4, 14);
            const heat = (value - 0.13) / (0.455 - 0.13);
            const peak = value === 0.455;
            return (
              <div
                key={`${rowIndex}-${columnIndex}`}
                style={{
                  borderRadius: 10,
                  border: `3px solid ${peak ? COLOR.goldHi : "rgba(242,238,228,0.12)"}`,
                  background: `hsl(${215 - heat * 210} 74% ${38 + heat * 8}% / ${appear})`,
                  transform: `scale(${0.5 + appear * 0.5})`,
                  opacity: appear,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: DISPLAY,
                  fontWeight: 900,
                  fontSize: 48,
                  color: "#FFFFFF",
                  textShadow: "0 2px 10px rgba(0,0,0,0.55)",
                }}
              >
                {peak ? ".455" : ""}
              </div>
            );
          }),
        )}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 300,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: JP,
          fontWeight: 500,
          fontSize: 34,
          letterSpacing: "0.2em",
          color: COLOR.mute,
          opacity: track(frame, 34, 16),
        }}
      >
        ボール球も含めた25コース
      </div>
    </AbsoluteFill>
  );
};
