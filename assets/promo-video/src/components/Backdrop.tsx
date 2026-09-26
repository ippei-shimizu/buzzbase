import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { COLOR } from "../theme";
import { track, wave } from "../anim";

const FloodLight: React.FC<{
  x: number;
  y: number;
  size: number;
  intensity: number;
}> = ({ x, y, size, intensity }) => (
  <div
    style={{
      position: "absolute",
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      borderRadius: "50%",
      background: `radial-gradient(circle, rgba(255,231,180,${0.5 * intensity}) 0%, rgba(240,178,74,${0.16 * intensity}) 26%, rgba(224,142,10,0) 68%)`,
    }}
  />
);

/** ボールの縫い目に見立てた点線のカーブ */
const Seam: React.FC<{ d: string; opacity: number; width: number }> = ({
  d,
  opacity,
  width,
}) => (
  <path
    d={d}
    fill="none"
    stroke={COLOR.seam}
    strokeWidth={width}
    strokeLinecap="round"
    strokeDasharray="6 44"
    opacity={opacity}
  />
);

/**
 * 全編を通して敷きっぱなしにするナイターの球場。
 * レイヤーごとに translateZ を変え、ゆっくりしたカメラの首振りで視差を出す。
 */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();

  const lightUp = track(frame, 6, 34);
  const flicker =
    frame < 40 ? (Math.sin(frame * 1.7) > 0.2 ? 1 : 0.45) * lightUp : lightUp;

  const yaw = wave(frame, 900, 1.6);
  const pitch = wave(frame, 1150, 1.0, 1.1);
  const dolly = wave(frame, 1400, 34, 0.4);

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.ink, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          perspective: 2400,
          perspectiveOrigin: "50% 42%",
        }}
      >
        <AbsoluteFill
          style={{
            transform: `rotateY(${yaw}deg) rotateX(${pitch}deg) translateZ(${dolly}px)`,
            transformStyle: "preserve-3d",
          }}
        >
          <AbsoluteFill
            style={{
              transform: "translateZ(-520px) scale(1.34)",
              background: `radial-gradient(120% 70% at 50% 8%, #241A0F 0%, ${COLOR.ground} 46%, ${COLOR.ink} 100%)`,
            }}
          />

          <AbsoluteFill style={{ transform: "translateZ(-380px) scale(1.24)" }}>
            <FloodLight x={130} y={150} size={900} intensity={flicker} />
            <FloodLight x={950} y={95} size={820} intensity={flicker * 0.85} />
            <FloodLight x={540} y={-60} size={1200} intensity={flicker * 0.5} />
            <FloodLight x={1010} y={1180} size={760} intensity={flicker * 0.35} />
          </AbsoluteFill>

          {/* 内野の土とファウルライン */}
          <AbsoluteFill style={{ transform: "translateZ(-240px) scale(1.16)" }}>
            <div
              style={{
                position: "absolute",
                left: -420,
                top: 1180,
                width: 1920,
                height: 1400,
                borderRadius: "50%",
                background: `radial-gradient(60% 60% at 50% 22%, rgba(120,78,34,0.55) 0%, rgba(59,41,21,0.52) 45%, rgba(24,17,9,0) 78%)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: -240,
                top: 1455,
                width: 1600,
                height: 10,
                background:
                  "linear-gradient(90deg, rgba(242,238,228,0) 0%, rgba(242,238,228,0.30) 32%, rgba(242,238,228,0.30) 68%, rgba(242,238,228,0) 100%)",
                transform: "rotate(-6deg)",
                filter: "blur(1px)",
              }}
            />
          </AbsoluteFill>

          {/* ストライクゾーン 5x5 */}
          <AbsoluteFill
            style={{
              transform: "translateZ(-120px) scale(1.08)",
              display: "grid",
              placeItems: "center",
              opacity: 0.16 * lightUp,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 132px)",
                gridAutoRows: 132,
                gap: 12,
                transform: "rotateX(16deg) rotateZ(-2deg)",
              }}
            >
              {Array.from({ length: 25 }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    border: `2px solid ${COLOR.chalk}`,
                    borderRadius: 6,
                    opacity: index % 2 === 0 ? 0.5 : 0.28,
                  }}
                />
              ))}
            </div>
          </AbsoluteFill>

          {/* 縫い目 */}
          <AbsoluteFill style={{ transform: "translateZ(60px)" }}>
            <svg width="1080" height="1920" viewBox="0 0 1080 1920">
              <Seam
                d="M-120 430 C 260 250, 820 250, 1200 430"
                opacity={0.34 * lightUp}
                width={7}
              />
              <Seam
                d="M-120 1560 C 260 1740, 820 1740, 1200 1560"
                opacity={0.26 * lightUp}
                width={7}
              />
            </svg>
          </AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile("noise.png")})`,
          backgroundSize: "512px 512px",
          opacity: 0.32,
          mixBlendMode: "overlay",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(112% 78% at 50% 44%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.72) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** 画面右上に出す小さなロゴ。ロゴ単体シーンでは消す */
export const Watermark: React.FC<{ opacity: number }> = ({ opacity }) => (
  <Img
    src={staticFile("logo.png")}
    style={{
      position: "absolute",
      top: 86,
      right: 72,
      width: 232,
      opacity,
    }}
  />
);
