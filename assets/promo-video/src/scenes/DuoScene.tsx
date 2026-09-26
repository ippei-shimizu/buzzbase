import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Phone } from "../components/Phone";
import { Eyebrow, Headline, SubCopy } from "../components/Type";
import { EASE_IN_OUT, track, wave } from "../anim";

/** 練習記録と野球ノートを2台並べて「記録の受け皿が揃っている」ことを見せる */
export const DuoScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const exit = track(frame, duration - 18, 18, { easing: EASE_IN_OUT });
  const captionOut = 1 - track(frame, duration - 26, 16, { easing: EASE_IN_OUT });

  const phone = (delay: number) =>
    spring({
      frame: frame - delay,
      fps,
      config: { damping: 200, mass: 0.9, stiffness: 134 },
    });

  const back = phone(0);
  const front = phone(6);

  return (
    <AbsoluteFill style={{ perspective: 1900, perspectiveOrigin: "50% 48%" }}>
      <AbsoluteFill style={{ transformStyle: "preserve-3d" }}>
        <div
          style={{
            position: "absolute",
            left: 72,
            top: 214,
            display: "flex",
            flexDirection: "column",
            gap: 30,
            opacity: captionOut,
            transform: `translateY(${(1 - captionOut) * -34}px)`,
          }}
        >
          <Eyebrow label="ROUTINE" progress={track(frame, 1, 12)} />
          <Headline lines={["練習も野球ノートも", "ぜんぶここに"]} frame={frame} start={4} />
          <SubCopy text="練習も気づきも、成績とつながる。" progress={track(frame, 16, 14)} />
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 652,
            transformStyle: "preserve-3d",
            transform: `translateX(-50%) translateX(-300px) translateZ(${interpolate(back, [0, 1], [-900, -220]) + exit * 300}px) rotateY(${interpolate(back, [0, 1], [30, 15]) + wave(frame, 250, 1.4)}deg) rotateX(3deg)`,
            opacity: back * (1 - exit),
          }}
        >
          <Phone screen="practice" width={450} />
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 566,
            transformStyle: "preserve-3d",
            transform: `translateX(-50%) translateX(176px) translateZ(${interpolate(front, [0, 1], [-820, 60]) + exit * 320}px) rotateY(${interpolate(front, [0, 1], [-28, -13]) + wave(frame, 230, 1.6, 1)}deg) rotateX(2deg)`,
            opacity: front * (1 - exit),
          }}
        >
          <Phone screen="note" width={500} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
