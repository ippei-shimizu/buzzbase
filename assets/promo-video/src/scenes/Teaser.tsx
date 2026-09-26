import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Ball } from "../components/Ball";
import { Headline, SubCopy } from "../components/Type";
import { EASE_IN_OUT, track } from "../anim";

export const Teaser: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();

  const approach = interpolate(frame, [6, 66], [-2700, 900], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const spin = interpolate(frame, [6, 70], [0, 430], { extrapolateRight: "clamp" });
  const ballFade = 1 - track(frame, 58, 12, { easing: EASE_IN_OUT });

  const copyOut = 1 - track(frame, duration - 20, 20, { easing: EASE_IN_OUT });

  return (
    <AbsoluteFill style={{ perspective: 1500, perspectiveOrigin: "50% 44%" }}>
      <AbsoluteFill
        style={{
          transformStyle: "preserve-3d",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            transform: `translateZ(${approach}px) rotate(${spin}deg)`,
            opacity: ballFade,
            filter: "drop-shadow(0 40px 80px rgba(0,0,0,0.6))",
          }}
        >
          <Ball size={420} />
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          left: 72,
          top: 700,
          display: "flex",
          flexDirection: "column",
          gap: 34,
          opacity: copyOut,
          transform: `translateY(${(1 - copyOut) * -30}px)`,
        }}
      >
        <Headline lines={["打った。抑えた。", "で、どう残す？"]} frame={frame} start={56} size={84} />
        <SubCopy text="その1球を、データにするアプリ。" progress={track(frame, 88, 26)} />
      </div>
    </AbsoluteFill>
  );
};
