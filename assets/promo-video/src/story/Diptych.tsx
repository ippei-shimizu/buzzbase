import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, DISPLAY, JP, SCENE } from "../theme";
import { EASE_OUT, track } from "../anim";

const Half: React.FC<{
  caption: string;
  value: string;
  background: string;
  ink: string;
  accent: string;
  progress: number;
  from: number;
}> = ({ caption, value, background, ink, accent, progress, from }) => (
  <div
    style={{
      flex: 1,
      background,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 22,
      paddingTop: 60,
      transform: `translateY(${(1 - progress) * from}px)`,
    }}
  >
    <span
      style={{
        fontFamily: JP,
        fontWeight: 700,
        fontSize: 42,
        letterSpacing: "0.24em",
        color: accent,
      }}
    >
      {caption}
    </span>
    <span
      style={{
        fontFamily: DISPLAY,
        fontWeight: 900,
        fontSize: 236,
        lineHeight: 0.9,
        fontVariantNumeric: "tabular-nums",
        color: ink,
      }}
    >
      {value}
    </span>
  </div>
);

/** 画面を2分割して比較を見せる。構図そのものを前後のカットと変える */
export const Diptych: React.FC = () => {
  const frame = useCurrentFrame();
  const split = track(frame, 0, 20, { easing: EASE_OUT });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column" }}>
        <Half
          caption="先月"
          value=".241"
          background="#141009"
          ink="rgba(242,238,228,0.62)"
          accent={COLOR.mute}
          progress={split}
          from={-260}
        />
        <Half
          caption="今月"
          value=".318"
          background={COLOR.gold}
          ink="#140D01"
          accent="rgba(20,13,1,0.62)"
          progress={split}
          from={260}
        />
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          width: `${split * 100}%`,
          height: 10,
          background: COLOR.chalk,
          transform: "translateY(-50%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 236,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: JP,
          fontWeight: 900,
          fontSize: 76,
          color: COLOR.chalk,
          whiteSpace: "nowrap",
          opacity: track(frame, 14, 16),
        }}
      >
        先月の自分と、比べられる。
      </div>

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: "translateY(-50%)",
          opacity: track(frame, 30, 14),
        }}
      >
        <span
          style={{
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontSize: 62,
            color: "#0B2A17",
            background: COLOR.up,
            borderRadius: 18,
            padding: "14px 34px",
            boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
          }}
        >
          +.077
        </span>
      </div>
    </AbsoluteFill>
  );
};
