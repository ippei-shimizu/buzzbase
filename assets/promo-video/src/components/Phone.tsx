import React from "react";
import { Img, staticFile } from "remotion";
import { COLOR, SCREEN_RATIO } from "../theme";

type Props = {
  screen: string;
  width: number;
  style?: React.CSSProperties;
};

/**
 * 切り出した実画面をはめ込む端末モック。
 * 3D 変形は呼び出し側が style で渡す（transform-style は親で preserve-3d にしておく）。
 */
export const Phone: React.FC<Props> = ({ screen, width, style }) => {
  const height = Math.round(width / SCREEN_RATIO);
  const bezel = Math.round(width * 0.024);
  const rim = 3;
  const screenRadius = Math.round(width * 0.088);
  const outerRadius = screenRadius + bezel + rim;

  return (
    <div
      style={{
        position: "relative",
        width: width + (bezel + rim) * 2,
        height: height + (bezel + rim) * 2,
        borderRadius: outerRadius,
        padding: rim,
        boxSizing: "border-box",
        background:
          "linear-gradient(142deg,#9C948A 0%,#3B3730 22%,#C6BDAF 48%,#2A2723 72%,#7A736A 100%)",
        boxShadow:
          "0 70px 140px rgba(0,0,0,0.70), 0 18px 44px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)",
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: outerRadius - rim,
          padding: bezel,
          boxSizing: "border-box",
          background: "#080706",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: screenRadius,
            overflow: "hidden",
            backgroundColor: COLOR.ground,
          }}
        >
          <Img
            src={staticFile(`screens/${screen}.png`)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: outerRadius,
          background:
            "linear-gradient(118deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.02) 16%, rgba(255,255,255,0) 44%, rgba(255,255,255,0) 68%, rgba(255,255,255,0.08) 80%, rgba(255,255,255,0) 94%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
