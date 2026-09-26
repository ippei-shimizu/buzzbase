import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, DISPLAY, JP, SCENE } from "../theme";
import { track } from "../anim";

const METRICS = [
  { label: "打率", value: 0.318, max: 0.6 },
  { label: "出塁率", value: 0.412, max: 0.6 },
  { label: "長打率", value: 0.548, max: 0.6 },
  { label: "OPS", value: 0.96, max: 1.2 },
];

const format = (value: number) =>
  value >= 1 ? value.toFixed(3) : value.toFixed(3).replace(/^0/, "");

/** 数値そのものをグラフィックにする。アプリの画面は挟まない */
export const BarRace: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: SCENE.night }}>
      <AbsoluteFill style={{ opacity: 0.18 }}>
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              left: 78 + index * 118,
              top: 0,
              bottom: 0,
              width: 2,
              background: "rgba(224,142,10,0.5)",
            }}
          />
        ))}
      </AbsoluteFill>

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
        数字は、嘘をつかない。
      </div>

      <div
        style={{
          position: "absolute",
          top: 640,
          left: 78,
          right: 78,
          display: "flex",
          flexDirection: "column",
          gap: 58,
        }}
      >
        {METRICS.map((metric, index) => {
          const grow = track(frame, 8 + index * 6, 26);
          return (
            <div key={metric.label} style={{ opacity: track(frame, 6 + index * 6, 14) }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontFamily: JP,
                    fontWeight: 700,
                    fontSize: 40,
                    letterSpacing: "0.14em",
                    color: COLOR.mute,
                  }}
                >
                  {metric.label}
                </span>
                <span
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 900,
                    fontSize: 84,
                    fontVariantNumeric: "tabular-nums",
                    color: COLOR.goldHi,
                  }}
                >
                  {format(metric.value * grow)}
                </span>
              </div>
              <div
                style={{
                  height: 34,
                  borderRadius: 999,
                  background: "rgba(242,238,228,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(metric.value / metric.max) * 100 * grow}%`,
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${COLOR.goldDeep}, ${COLOR.goldHi})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
