import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR } from "../theme";
import { EASE_IN_OUT, track } from "../anim";

const HALF_WINDOW = 13;
const STREAK_WIDTHS = [30, 14, 52, 20, 68, 24, 44, 16, 36];

const Flood: React.FC<{ progress: number; flip: boolean }> = ({ progress, flip }) => (
  <div
    style={{
      position: "absolute",
      left: "-80%",
      top: "-80%",
      width: "260%",
      height: "260%",
      background: `linear-gradient(120deg, ${COLOR.goldDeep}, ${COLOR.gold} 42%, ${COLOR.goldHi})`,
      transform: `rotate(${flip ? 24 : -26}deg) translateX(${(flip ? -1 : 1) * (progress * 7000 - 3500)}px)`,
    }}
  />
);

const Slabs: React.FC<{ frame: number; mark: number }> = ({ frame, mark }) => (
  <>
    {Array.from({ length: 5 }).map((_, index) => {
      const progress = track(frame, mark - HALF_WINDOW + index * 1.6, 22, {
        easing: EASE_IN_OUT,
      });
      const direction = index % 2 === 0 ? 1 : -1;
      return (
        <div
          key={index}
          style={{
            position: "absolute",
            left: 0,
            top: `${index * 20}%`,
            width: "100%",
            height: "20.4%",
            background: index % 2 === 0 ? COLOR.gold : COLOR.goldDeep,
            transform: `translateX(${direction * 1260 * (1 - 2 * progress)}px)`,
          }}
        />
      );
    })}
  </>
);

const Streaks: React.FC<{ frame: number; mark: number }> = ({ frame, mark }) => (
  <div
    style={{
      position: "absolute",
      left: "-34%",
      top: "-40%",
      width: "168%",
      height: "180%",
      transform: "rotate(-26deg)",
      display: "flex",
      gap: 74,
    }}
  >
    {STREAK_WIDTHS.map((width, index) => {
      const progress = track(frame, mark - HALF_WINDOW + index * 1.2, 24, {
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
            transform: `translateX(${-1300 + progress * 3400}px)`,
          }}
        />
      );
    })}
  </div>
);

/**
 * シーンの切れ目に被せる転換。3種類を順番に回して単調さを避ける。
 * 切り替わりの瞬間は画面が覆われるため、下でカットが起きても段差が見えない。
 */
export const Transitions: React.FC<{ frame: number; marks: number[] }> = ({
  frame,
  marks,
}) => {
  const index = marks.reduce(
    (best, mark, current) =>
      Math.abs(frame - mark) < Math.abs(frame - marks[best]) ? current : best,
    0,
  );
  const mark = marks[index];
  const distance = Math.abs(frame - mark);
  if (distance > HALF_WINDOW + 12) {
    return null;
  }

  const variant = index % 3;
  const progress = track(frame, mark - HALF_WINDOW, 26, { easing: EASE_IN_OUT });

  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      {variant === 0 ? <Flood progress={progress} flip={index % 2 === 1} /> : null}
      {variant === 1 ? <Streaks frame={frame} mark={mark} /> : null}
      {variant === 2 ? <Slabs frame={frame} mark={mark} /> : null}
      <AbsoluteFill
        style={{
          background: COLOR.goldHi,
          opacity: Math.max(0, 1 - distance / 6) * 0.16,
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};
