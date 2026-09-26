import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, JP, SCENE } from "../theme";
import { EASE_OUT, track } from "../anim";

const WORDS = [
  "1打席目",
  "きのうの練習試合",
  "先週のフリー打撃",
  "夏の県大会",
  "去年の秋",
  "あの日のスライダー",
  "覚えてない。",
];
const LINE_HEIGHT = 168;

/** 文字だけで見せるカット。図版を挟んだ直後に置いて画面の密度を落とす */
export const TypeStack: React.FC = () => {
  const frame = useCurrentFrame();
  const scroll = track(frame, 0, 46, { easing: EASE_OUT }) * (WORDS.length - 1);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SCENE.night,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill style={{ display: "grid", placeItems: "center" }}>
        <div
          style={{
            transform: `translateY(${-(scroll - (WORDS.length - 1) / 2) * LINE_HEIGHT}px)`,
          }}
        >
          {WORDS.map((word, index) => {
            const distance = Math.abs(index - scroll);
            const focus = Math.max(0, 1 - distance);
            const last = index === WORDS.length - 1;
            return (
              <div
                key={word}
                style={{
                  height: LINE_HEIGHT,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: JP,
                  fontWeight: 900,
                  fontSize: last ? 132 : 92,
                  whiteSpace: "nowrap",
                  color: last && focus > 0.6 ? COLOR.gold : COLOR.chalk,
                  opacity: 0.14 + focus * 0.86,
                  transform: `scale(${0.88 + focus * 0.12})`,
                }}
              >
                {word}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 960 - LINE_HEIGHT / 2,
          height: LINE_HEIGHT,
          borderTop: `2px solid rgba(224,142,10,0.26)`,
          borderBottom: `2px solid rgba(224,142,10,0.26)`,
          opacity: 1 - track(frame, 46, 14),
        }}
      />
    </AbsoluteFill>
  );
};
