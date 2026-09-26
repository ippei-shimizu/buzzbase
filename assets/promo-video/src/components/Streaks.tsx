import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR } from "../theme";
import { EASE_IN_OUT, track } from "../anim";

const WIDTHS = [26, 13, 44, 18, 58, 22, 36, 14];
const SWEEP_FROM = -1200;
const SWEEP_TO = 2000;

/**
 * ロゴのモチーフである斜めのスイングトレイル。シーンの切れ目を横切らせる。
 * @param frame 動画全体の frame
 * @param marks 切り替わりの frame 一覧
 */
export const Streaks: React.FC<{ frame: number; marks: number[] }> = ({
  frame,
  marks,
}) => {
  const nearest = marks.reduce(
    (best, mark) => (Math.abs(frame - mark) < Math.abs(frame - best) ? mark : best),
    marks[0],
  );
  const distance = Math.abs(frame - nearest);
  if (distance > 20) {
    return null;
  }

  const flash = Math.max(0, 1 - distance / 7) * 0.14;

  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: "-34%",
          top: "-40%",
          width: "168%",
          height: "180%",
          transform: "rotate(-26deg)",
          display: "flex",
          gap: 90,
        }}
      >
        {WIDTHS.map((width, index) => {
          const progress = track(frame, nearest - 15 + index * 1.4, 28, {
            easing: EASE_IN_OUT,
          });
          return (
            <span
              key={index}
              style={{
                flex: `0 0 ${width}px`,
                borderRadius: 999,
                background: `linear-gradient(180deg, ${COLOR.goldHi}, ${COLOR.goldDeep})`,
                opacity: Math.sin(progress * Math.PI),
                transform: `translateX(${SWEEP_FROM + progress * (SWEEP_TO - SWEEP_FROM)}px)`,
              }}
            />
          );
        })}
      </div>
      <AbsoluteFill style={{ background: COLOR.goldHi, opacity: flash, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};
