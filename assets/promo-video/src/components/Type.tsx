import React from "react";
import { COLOR, DISPLAY, JP } from "../theme";
import { track } from "../anim";

export const Eyebrow: React.FC<{ label: string; progress: number }> = ({
  label,
  progress,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 22,
      opacity: progress,
      transform: `translateX(${(1 - progress) * -26}px)`,
    }}
  >
    <span
      style={{
        width: 20,
        height: 20,
        background: COLOR.gold,
        transform: "rotate(45deg)",
        display: "block",
      }}
    />
    <span
      style={{
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: 32,
        letterSpacing: "0.32em",
        color: COLOR.gold,
      }}
    >
      {label}
    </span>
  </div>
);

/**
 * 1行ずつ 3D で起き上がる見出し。
 * 想定外の位置で折り返さないよう、行は配列で受け取り nowrap で描画する。
 */
export const Headline: React.FC<{
  lines: string[];
  frame: number;
  start: number;
  size?: number;
}> = ({ lines, frame, start, size = 70 }) => (
  <div style={{ perspective: 1200 }}>
    {lines.map((line, index) => {
      const progress = track(frame, start + index * 4, 16);
      return (
        <div
          key={line}
          style={{
            overflow: "hidden",
            paddingBottom: 6,
          }}
        >
          <div
            style={{
              fontFamily: JP,
              fontWeight: 800,
              fontSize: size,
              lineHeight: 1.26,
              letterSpacing: "0.01em",
              color: COLOR.chalk,
              whiteSpace: "nowrap",
              transformOrigin: "50% 0%",
              transform: `translateY(${(1 - progress) * 104}%) rotateX(${(1 - progress) * -42}deg)`,
              opacity: progress,
            }}
          >
            {line}
          </div>
        </div>
      );
    })}
  </div>
);

export const SubCopy: React.FC<{ text: string; progress: number }> = ({
  text,
  progress,
}) => (
  <div
    style={{
      fontFamily: JP,
      fontWeight: 500,
      fontSize: 34,
      letterSpacing: "0.04em",
      color: COLOR.mute,
      whiteSpace: "nowrap",
      opacity: progress,
      transform: `translateY(${(1 - progress) * 20}px)`,
    }}
  >
    {text}
  </div>
);

/** 端末の脇に浮かせる実データのチップ */
export const StatChip: React.FC<{
  label: string;
  value: string;
  progress: number;
  scale: number;
}> = ({ label, value, progress, scale }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "baseline",
      gap: 18,
      padding: "20px 30px",
      borderRadius: 18,
      background: "linear-gradient(150deg, rgba(224,142,10,0.26), rgba(224,142,10,0.06))",
      border: `2px solid rgba(224,142,10,0.46)`,
      backdropFilter: "blur(6px)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
      opacity: progress,
      transform: `translateY(${(1 - progress) * 30}px) scale(${scale * (0.9 + progress * 0.1)})`,
    }}
  >
    <span
      style={{
        fontFamily: JP,
        fontWeight: 700,
        fontSize: 26,
        letterSpacing: "0.12em",
        color: COLOR.goldHi,
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontFamily: DISPLAY,
        fontWeight: 900,
        fontSize: 46,
        fontVariantNumeric: "tabular-nums",
        color: COLOR.chalk,
      }}
    >
      {value}
    </span>
  </div>
);
