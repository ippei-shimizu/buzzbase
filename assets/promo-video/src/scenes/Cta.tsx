import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLOR, DISPLAY, JP } from "../theme";
import { track } from "../anim";
import { Headline } from "../components/Type";

const Pill: React.FC<{ text: string; solid?: boolean; progress: number }> = ({
  text,
  solid,
  progress,
}) => (
  <div
    style={{
      padding: "26px 52px",
      borderRadius: 999,
      fontFamily: DISPLAY,
      fontWeight: 700,
      fontSize: 40,
      letterSpacing: "0.06em",
      whiteSpace: "nowrap",
      background: solid ? COLOR.gold : "transparent",
      border: `3px solid ${solid ? COLOR.gold : "rgba(242,238,228,0.32)"}`,
      color: solid ? "#241A08" : COLOR.chalk,
      opacity: progress,
      transform: `translateY(${(1 - progress) * 26}px)`,
    }}
  >
    {text}
  </div>
);

export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const land = spring({
    frame,
    fps,
    config: { damping: 190, mass: 1.1, stiffness: 80 },
  });

  return (
    <AbsoluteFill style={{ perspective: 1700 }}>
      <AbsoluteFill
        style={{
          transformStyle: "preserve-3d",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 220,
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{
            width: 760,
            transform: `translateZ(${interpolate(land, [0, 1], [-560, 0])}px)`,
            opacity: land,
          }}
        />

        <div style={{ marginTop: 66, textAlign: "center" }}>
          <Headline lines={["記録するほど、", "うまくなる。"]} frame={frame} start={18} size={82} />
        </div>

        <div style={{ display: "flex", gap: 30, marginTop: 72 }}>
          <Pill text="App Store" solid progress={track(frame, 44, 26)} />
          <Pill text="buzzbase.jp" progress={track(frame, 52, 26)} />
        </div>

        <div
          style={{
            marginTop: 54,
            fontFamily: JP,
            fontWeight: 500,
            fontSize: 34,
            letterSpacing: "0.2em",
            color: COLOR.mute,
            opacity: track(frame, 64, 26),
          }}
        >
          iOS ／ Web 対応・基本無料
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
