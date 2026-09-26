import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, DISPLAY, JP, SCENE } from "../theme";
import { EASE_OUT, track } from "../anim";

const PIPS = [
  { label: "B", color: COLOR.up, lit: 2 },
  { label: "S", color: COLOR.gold, lit: 2 },
];

/** 巨大な数字ひとつで画面を占める。前後のシーンと重心をずらす */
export const PitchCount: React.FC = () => {
  const frame = useCurrentFrame();
  const step = Math.min(6, Math.floor(track(frame, 6, 44, { easing: EASE_OUT }) * 7));
  const pitch = step + 1;
  const pop = 1 - ((frame - 6) % 7) / 7;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SCENE.night,
      }}
    >
      <AbsoluteFill style={{ display: "grid", placeItems: "center" }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontSize: 760,
            lineHeight: 0.8,
            color: COLOR.gold,
            fontVariantNumeric: "tabular-nums",
            transform: `scale(${1 + Math.max(0, pop) * 0.06})`,
            textShadow: "0 0 120px rgba(224,142,10,0.35)",
          }}
        >
          {pitch}
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          top: 300,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: JP,
          fontWeight: 900,
          fontSize: 92,
          color: COLOR.chalk,
          opacity: track(frame, 2, 14),
        }}
      >
        何球目だった？
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 330,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 56,
          opacity: track(frame, 20, 16),
        }}
      >
        {PIPS.map((pip) => (
          <div key={pip.label} style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span
              style={{
                fontFamily: DISPLAY,
                fontWeight: 900,
                fontSize: 44,
                color: "rgba(242,238,228,0.5)",
              }}
            >
              {pip.label}
            </span>
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: `3px solid ${index < pip.lit ? pip.color : "rgba(242,238,228,0.24)"}`,
                  background: index < pip.lit ? pip.color : "transparent",
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
