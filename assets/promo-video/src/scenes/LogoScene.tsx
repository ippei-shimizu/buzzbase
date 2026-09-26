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
import { COLOR, JP } from "../theme";
import { EASE_IN_OUT, track } from "../anim";

const RAY_WIDTHS = [12, 26, 16, 38, 20, 48, 18, 30, 14, 34];

export const LogoScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const land = spring({
    frame,
    fps,
    config: { damping: 190, mass: 0.95, stiffness: 120 },
  });
  const exit = track(frame, duration - 20, 20, { easing: EASE_IN_OUT });

  const sheen = track(frame, 16, 26, { easing: EASE_IN_OUT, from: -130, to: 130 });

  return (
    <AbsoluteFill style={{ perspective: 1700, perspectiveOrigin: "50% 48%" }}>
      <AbsoluteFill
        style={{
          transformStyle: "preserve-3d",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 1800,
            height: 1800,
            transform: "rotate(-26deg)",
            display: "flex",
            gap: 30,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {RAY_WIDTHS.map((width, index) => {
            const burst = track(frame, 2 + index * 1.4, 40);
            return (
              <span
                key={index}
                style={{
                  flex: `0 0 ${width}px`,
                  height: "100%",
                  borderRadius: 999,
                  background: `linear-gradient(180deg, rgba(249,201,124,0), ${COLOR.gold}, rgba(249,201,124,0))`,
                  transform: `scaleY(${0.08 + burst * 1.25})`,
                  opacity: (1 - burst) * 0.75,
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            transformStyle: "preserve-3d",
            transform: `translateZ(${interpolate(land, [0, 1], [-780, 0]) + exit * 180}px) rotateY(${interpolate(land, [0, 1], [24, 0])}deg) scale(${1 - exit * 0.06})`,
            opacity: land * (1 - exit),
            textAlign: "center",
          }}
        >
          <div style={{ position: "relative", width: 860 }}>
            <Img src={staticFile("logo.png")} style={{ width: 860, display: "block" }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                WebkitMaskImage: `url(${staticFile("logo.png")})`,
                WebkitMaskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(104deg, rgba(255,255,255,0) 42%, rgba(255,255,255,0.92) 50%, rgba(255,255,255,0) 58%)",
                  transform: `translateX(${sheen}%)`,
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 54,
              fontFamily: JP,
              fontWeight: 700,
              fontSize: 42,
              letterSpacing: "0.36em",
              color: COLOR.chalk,
              whiteSpace: "nowrap",
              opacity: track(frame, 18, 20),
              transform: `translateY(${(1 - track(frame, 18, 20)) * 22}px)`,
            }}
          >
            野球の個人成績記録アプリ
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
