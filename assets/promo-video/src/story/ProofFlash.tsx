import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Phone } from "../components/Phone";
import { COLOR, DISPLAY, SCENE } from "../theme";
import { track } from "../anim";

const SCREENS = ["dashboard", "plate-input", "course", "direction", "ranking", "note"];
const HOLD = 13;

/** 実画面を説明せずに連射する。1本目の機能紹介とは逆の見せ方 */
export const ProofFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const index = Math.min(SCREENS.length - 1, Math.floor(frame / HOLD));
  const local = frame - index * HOLD;
  const tilt = index % 2 === 0 ? -7 : 7;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SCENE.night,
        display: "grid",
        placeItems: "center",
        perspective: 1800,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(60% 40% at 50% 46%, rgba(224,142,10,${0.20 - (local / HOLD) * 0.14}) 0%, rgba(224,142,10,0) 70%)`,
        }}
      />
      <div
        style={{
          transform: `scale(${1.04 - (local / HOLD) * 0.05}) rotateY(${tilt}deg) rotateX(2deg)`,
        }}
      >
        <Phone screen={SCREENS[index]} width={620} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 268,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: "0.44em",
          color: COLOR.gold,
        }}
      >
        REAL SCREENS
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 250,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 14,
        }}
      >
        {SCREENS.map((screen, dot) => (
          <span
            key={screen}
            style={{
              width: dot === index ? 46 : 14,
              height: 8,
              borderRadius: 999,
              background: dot === index ? COLOR.gold : "rgba(242,238,228,0.24)",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
