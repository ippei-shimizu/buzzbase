import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { COLOR, JP } from "../theme";

/** 上端の細いバーと進捗線。参考動画のコーナーHUDに寄せた常設の枠 */
export const Hud: React.FC<{ opacity: number; progress: number }> = ({
  opacity,
  progress,
}) => (
  <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 6,
        width: `${progress * 100}%`,
        background: COLOR.gold,
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 48,
        left: 60,
        right: 60,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Img src={staticFile("logo.png")} style={{ height: 34 }} />
      <span
        style={{
          fontFamily: JP,
          fontWeight: 500,
          fontSize: 22,
          letterSpacing: "0.26em",
          color: "rgba(242,238,228,0.46)",
        }}
      >
        野球の個人成績記録アプリ
      </span>
    </div>
  </AbsoluteFill>
);
