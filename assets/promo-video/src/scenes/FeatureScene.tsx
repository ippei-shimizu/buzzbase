import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Phone } from "../components/Phone";
import { Marquee } from "../components/Marquee";
import { Eyebrow, Headline, StatChip, SubCopy } from "../components/Type";
import { DISPLAY } from "../theme";
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
    config: { damping: 200, mass: 1, stiffness: 108 },
  });
  const exit = track(frame, duration - 18, 18, { easing: EASE_IN_OUT });
  const drift = wave(frame, 220, 1.8);

  const phoneZ = interpolate(enter, [0, 1], [-900, 0]) + exit * 360;
  const phoneYaw = interpolate(enter, [0, 1], [tilt * 3.6, tilt]) + drift - exit * tilt * 2.4;
  const phonePitch = interpolate(enter, [0, 1], [12, 2.4]) - exit * 7;
  const phoneY = interpolate(enter, [0, 1], [150, 0]) + exit * -80;

  const captionOut = 1 - track(frame, duration - 28, 18, { easing: EASE_IN_OUT });
  const chipShift = chips ? 56 : 0;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", paddingTop: 260 }}>
        <Marquee
          text={`${eyebrow}　`}
          frame={frame}
          size={230}
          speed={tilt < 0 ? 0.0032 : 0.0026}
          reverse={tilt > 0}
          color="rgba(242,238,228,0.42)"
          opacity={0.26 * enter * (1 - exit)}
          outline={3}
          fontFamily={DISPLAY}
        />
      </AbsoluteFill>

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
                  progress={track(frame, 30 + index * 8, 20) * (1 - exit)}
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
            top: 232,
            display: "flex",
            flexDirection: "column",
            gap: 28,
            opacity: captionOut,
            transform: `translateY(${(1 - captionOut) * -38}px)`,
          }}
        >
          <Eyebrow label={eyebrow} progress={track(frame, 2, 16)} />
          <Headline lines={lines} frame={frame} start={7} />
          <SubCopy text={sub} progress={track(frame, 22, 18)} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
