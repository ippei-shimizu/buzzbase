import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, JP, SCENE } from "../theme";
import { EASE_OUT, track } from "../anim";

const RAYS = [14, 30, 18, 44, 22, 54, 20, 34, 16];
const TURN = 38;

/** 前半ゴールドの宣言、後半でロゴ。1カットの中で地の色ごと裏返す */
export const GoldTurn: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const turned = frame >= TURN;

  const declare = track(frame, 0, 8, { easing: EASE_OUT });
  const land = spring({
    frame: frame - TURN,
    fps,
    config: { damping: 190, mass: 0.9, stiffness: 140 },
  });

  if (!turned) {
    return (
      <AbsoluteFill style={{ backgroundColor: COLOR.gold, display: "grid", placeItems: "center" }}>
        <div
          style={{
            fontFamily: JP,
            fontWeight: 900,
            fontSize: 158,
            color: "#140D01",
            whiteSpace: "nowrap",
            letterSpacing: "-0.02em",
            transform: `scale(${1.18 - declare * 0.18})`,
          }}
        >
          だから、残す。
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SCENE.night,
        display: "grid",
        placeItems: "center",
        perspective: 1700,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 1800,
          height: 1800,
          transform: "rotate(-26deg)",
          display: "flex",
          gap: 34,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {RAYS.map((width, index) => {
          const burst = track(frame, TURN + index * 1.2, 30);
          return (
            <span
              key={index}
              style={{
                flex: `0 0 ${width}px`,
                height: "100%",
                borderRadius: 999,
                background: `linear-gradient(180deg, rgba(249,201,124,0), ${COLOR.gold}, rgba(249,201,124,0))`,
                transform: `scaleY(${0.06 + burst * 1.3})`,
                opacity: (1 - burst) * 0.8,
              }}
            />
          );
        })}
      </div>

      <div style={{ textAlign: "center", transform: `scale(${0.8 + land * 0.2})`, opacity: land }}>
        <Img src={staticFile("logo.png")} style={{ width: 880, display: "block" }} />
        <div
          style={{
            marginTop: 52,
            fontFamily: JP,
            fontWeight: 700,
            fontSize: 40,
            letterSpacing: "0.34em",
            color: COLOR.chalk,
            whiteSpace: "nowrap",
            opacity: track(frame, TURN + 12, 16),
            transform: `translateY(${interpolate(track(frame, TURN + 12, 16), [0, 1], [20, 0])}px)`,
          }}
        >
          野球の個人成績記録アプリ
        </div>
      </div>
    </AbsoluteFill>
  );
};
