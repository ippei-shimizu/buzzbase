import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Phone } from "../components/Phone";
import { Eyebrow, Headline, StatChip, SubCopy } from "../components/Type";
import { EASE_IN_OUT, track, wave } from "../anim";

export type Chip = { label: string; value: string };

type Props = {
  screen: string;
  eyebrow: string;
  lines: string[];
  sub: string;
  duration: number;
  /** 正なら右奥、負なら左奥に傾ける。シーンごとに符号を変えて単調さを避ける */
  tilt: number;
  chips?: Chip[];
};

export const FeatureScene: React.FC<Props> = ({
  screen,
  eyebrow,
  lines,
  sub,
  duration,
  tilt,
  chips,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 200, mass: 1.35, stiffness: 72 },
  });
  const exit = track(frame, duration - 24, 24, { easing: EASE_IN_OUT });
  const drift = wave(frame, 240, 2.0);

  const phoneZ = interpolate(enter, [0, 1], [-880, 0]) + exit * 320;
  const phoneYaw = interpolate(enter, [0, 1], [tilt * 3.4, tilt]) + drift - exit * tilt * 2.2;
  const phonePitch = interpolate(enter, [0, 1], [11, 2.4]) - exit * 6;
  const phoneY = interpolate(enter, [0, 1], [130, 0]) + exit * -70;

  // 見出しは端末より一足先に抜く。次シーンの見出しと重なって二重に見えるのを避ける
  const captionOut = 1 - track(frame, duration - 36, 22, { easing: EASE_IN_OUT });
  const chipShift = chips ? 56 : 0;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ perspective: 1900, perspectiveOrigin: "50% 46%" }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 618,
            transform: `translateX(-50%) translateX(${chipShift}px) translateY(${phoneY}px) translateZ(${phoneZ}px) rotateY(${phoneYaw}deg) rotateX(${phonePitch}deg)`,
            opacity: enter * (1 - exit),
          }}
        >
          <Phone screen={screen} width={640} />
        </div>
      </AbsoluteFill>

      {/* 端末より前に置くレイヤー。3D のソートに任せると傾き次第で端末に潜るため 2D で重ねる */}
      {chips ? (
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              left: 210,
              top: 1004,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 34,
            }}
          >
            {chips.map((chip, index) => (
              <div key={chip.label} style={{ marginLeft: index * 74 }}>
                <StatChip
                  label={chip.label}
                  value={chip.value}
                  progress={track(frame, 44 + index * 10, 26) * (1 - exit)}
                  scale={1.06 - index * 0.08}
                />
              </div>
            ))}
          </div>
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill>
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
          <Eyebrow label={eyebrow} progress={track(frame, 4, 22)} />
          <Headline lines={lines} frame={frame} start={12} />
          <SubCopy text={sub} progress={track(frame, 30, 24)} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
