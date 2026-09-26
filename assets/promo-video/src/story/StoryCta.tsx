import React from "react";
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, DISPLAY, JP, SCENE } from "../theme";
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

export const StoryCta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = spring({
    frame,
    fps,
    config: { damping: 190, mass: 0.95, stiffness: 118 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: SCENE.night }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(70% 44% at 50% 40%, rgba(224,142,10,0.22) 0%, rgba(224,142,10,0) 72%)",
          opacity: land,
        }}
      />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 200,
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{ width: 780, transform: `scale(${0.86 + land * 0.14})`, opacity: land }}
        />

        <div style={{ marginTop: 62, textAlign: "center" }}>
          <Headline lines={["記録するほど、", "うまくなる。"]} frame={frame} start={14} size={84} />
        </div>

        <div style={{ display: "flex", gap: 30, marginTop: 74 }}>
          <Pill text="App Store" solid progress={track(frame, 40, 22)} />
          <Pill text="buzzbase.jp" progress={track(frame, 48, 22)} />
        </div>

        <div
          style={{
            marginTop: 52,
            fontFamily: JP,
            fontWeight: 500,
            fontSize: 34,
            letterSpacing: "0.2em",
            color: COLOR.mute,
            opacity: track(frame, 58, 22),
          }}
        >
          iOS ／ Web 対応・基本無料
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
