import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Phone } from "./components/Phone";
import { COLOR, DISPLAY, JP, POP, ROUND } from "./theme";
import { track, wave } from "./anim";

export const POP_FRAMES = 880;

const OUTLINE = `6px solid ${POP.ink}`;
const HARD_SHADOW = `12px 12px 0 ${POP.ink}`;

/** 跳ねる登場。ポップ版はすべてこのバネで動かす */
const useBounce = (delay: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 11, mass: 0.7, stiffness: 190 },
  });
};

const Sticker: React.FC<{
  text: string;
  color: string;
  rotate: number;
  delay: number;
  size?: number;
  style?: React.CSSProperties;
}> = ({ text, color, rotate, delay, size = 40, style }) => {
  const pop = useBounce(delay);
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        padding: "16px 30px",
        borderRadius: 999,
        background: color,
        border: OUTLINE,
        boxShadow: `8px 8px 0 ${POP.ink}`,
        fontFamily: JP,
        fontWeight: 900,
        fontSize: size,
        color: POP.ink,
        whiteSpace: "nowrap",
        transform: `rotate(${rotate + wave(frame, 70, 2)}deg) scale(${pop})`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

const CONFETTI = Array.from({ length: 26 }, (_, index) => ({
  angle: (index / 26) * Math.PI * 2 + index * 0.31,
  distance: 420 + ((index * 137) % 420),
  color: [POP.pink, POP.blue, POP.green, COLOR.gold, POP.purple][index % 5],
  spin: ((index * 71) % 720) - 360,
  size: 18 + ((index * 53) % 26),
}));

const Confetti: React.FC<{ start: number; x: number; y: number }> = ({ start, x, y }) => {
  const frame = useCurrentFrame();
  const local = frame - start;
  if (local < 0 || local > 70) {
    return null;
  }
  const progress = local / 70;
  return (
    <>
      {CONFETTI.map((piece, index) => {
        const travel = 1 - Math.pow(1 - progress, 2.4);
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x + Math.cos(piece.angle) * piece.distance * travel,
              top: y + Math.sin(piece.angle) * piece.distance * travel + progress * progress * 420,
              width: piece.size,
              height: piece.size * 1.6,
              background: piece.color,
              border: `3px solid ${POP.ink}`,
              borderRadius: 4,
              transform: `rotate(${piece.spin * travel}deg)`,
              opacity: 1 - Math.pow(progress, 3),
            }}
          />
        );
      })}
    </>
  );
};

const BouncyLine: React.FC<{ text: string; delay: number; size: number; color?: string }> = ({
  text,
  delay,
  size,
  color = POP.ink,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {Array.from(text).map((character, index) => {
        const pop = spring({
          frame: frame - delay - index * 2.4,
          fps,
          config: { damping: 10, mass: 0.6, stiffness: 210 },
        });
        return (
          <span
            key={`${character}-${index}`}
            style={{
              fontFamily: JP,
              fontWeight: 900,
              fontSize: size,
              lineHeight: 1.12,
              color,
              display: "inline-block",
              transform: `translateY(${(1 - pop) * 90}px) scale(${pop})`,
              opacity: Math.min(1, pop * 1.6),
            }}
          >
            {character}
          </span>
        );
      })}
    </div>
  );
};

const PopPhone: React.FC<{ screen: string; delay: number; rotate: number; width?: number }> = ({
  screen,
  delay,
  rotate,
  width = 540,
}) => {
  const pop = useBounce(delay);
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        transform: `rotate(${rotate + wave(frame, 110, 1.4)}deg) scale(${pop}) translateY(${(1 - pop) * 120}px)`,
        filter: `drop-shadow(14px 16px 0 ${POP.ink})`,
      }}
    >
      <Phone screen={screen} width={width} />
    </div>
  );
};

const METRICS = [
  { label: "打率", value: ".342", color: COLOR.gold },
  { label: "OPS", value: ".921", color: POP.pink },
  { label: "防御率", value: "2.15", color: POP.blue },
];

const RANKS = [
  { name: "あなた", value: 0.342, color: COLOR.gold, me: true },
  { name: "たなか", value: 0.301, color: POP.blue },
  { name: "さとう", value: 0.264, color: POP.green },
];

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: POP.cream, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${POP.ink} 3px, transparent 3px)`,
          backgroundSize: "44px 44px",
          backgroundPosition: `${wave(frame, 300, 22)}px ${wave(frame, 260, 22)}px`,
          opacity: 0.09,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -260,
          top: 1180,
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: COLOR.gold,
          opacity: 0.22,
          transform: `translateY(${wave(frame, 240, 26)}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -300,
          top: -180,
          width: 760,
          height: 760,
          borderRadius: "50%",
          background: POP.pink,
          opacity: 0.18,
          transform: `translateY(${wave(frame, 290, 22, 1.4)}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * 5本目。ポップ版。太い黒縁・ハードシャドウ・跳ねるバネで、
 * 中高生が見て「楽しそう」と思える明るいトーンに寄せている。
 */
export const Pop: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: POP.cream }}>
      <Audio src={staticFile("audio/pop.m4a")} />
      <Backdrop />

      <Sequence from={0} durationInFrames={120}>
        <AbsoluteFill style={{ justifyContent: "center", paddingBottom: 120 }}>
          <BouncyLine text="野球の成績、" delay={2} size={128} />
          <BouncyLine text="アプリで全部。" delay={14} size={128} color={COLOR.gold} />
          <Sticker text="かんたん" color={POP.pink} rotate={-12} delay={30} style={{ left: 88, top: 560 }} />
          <Sticker text="無料" color={POP.green} rotate={10} delay={38} style={{ right: 96, top: 1280 }} />
          <Sticker text="ぜんぶ自動" color={POP.blue} rotate={6} delay={46} style={{ left: 150, top: 1360 }} />
          <Confetti start={6} x={540} y={900} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={120} durationInFrames={160}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: 120 }}>
          <PopPhone screen="dashboard" delay={4} rotate={-5} />
          <Sticker text="46項目を自動計算！" color={COLOR.gold} rotate={-8} delay={22} size={44} style={{ top: 250, left: 60 }} />
          <Sticker text="入力は30秒" color={POP.pink} rotate={9} delay={32} style={{ bottom: 300, right: 70 }} />
          <Confetti start={10} x={540} y={620} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={280} durationInFrames={140}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46 }}>
          <div style={{ marginBottom: 20 }}>
            <BouncyLine text="数字がぜんぶ出る！" delay={2} size={86} />
          </div>
          {METRICS.map((metric, index) => {
            const pop = spring({
              frame: frame - 280 - 14 - index * 8,
              fps: 30,
              config: { damping: 11, mass: 0.7, stiffness: 190 },
            });
            return (
              <div
                key={metric.label}
                style={{
                  width: 820,
                  padding: "28px 44px",
                  borderRadius: 28,
                  background: metric.color,
                  border: OUTLINE,
                  boxShadow: HARD_SHADOW,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transform: `translateX(${(1 - pop) * (index % 2 ? 260 : -260)}px) rotate(${index % 2 ? 1.6 : -1.6}deg) scale(${pop})`,
                }}
              >
                <span style={{ fontFamily: JP, fontWeight: 900, fontSize: 56, color: POP.ink }}>
                  {metric.label}
                </span>
                <span
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 900,
                    fontSize: 92,
                    fontVariantNumeric: "tabular-nums",
                    color: POP.ink,
                  }}
                >
                  {metric.value}
                </span>
              </div>
            );
          })}
        </AbsoluteFill>
      </Sequence>

      <Sequence from={420} durationInFrames={160}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
          <div style={{ marginBottom: 24 }}>
            <BouncyLine text="チームで競える！" delay={2} size={86} />
          </div>
          {RANKS.map((row, index) => {
            const grow = interpolate(frame - 420 - 16 - index * 7, [0, 26], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={row.name}
                style={{
                  width: 860,
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  opacity: grow > 0 ? 1 : 0,
                }}
              >
                <div
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: "50%",
                    background: row.color,
                    border: OUTLINE,
                    display: "grid",
                    placeItems: "center",
                    fontFamily: DISPLAY,
                    fontWeight: 900,
                    fontSize: 46,
                    color: POP.ink,
                    transform: `scale(${grow})`,
                  }}
                >
                  {index + 1}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 70,
                    borderRadius: 999,
                    border: OUTLINE,
                    background: "#FFFFFF",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(row.value / 0.36) * 100 * grow}%`,
                      background: row.color,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 900,
                    fontSize: 58,
                    fontVariantNumeric: "tabular-nums",
                    color: POP.ink,
                    width: 170,
                    textAlign: "right",
                  }}
                >
                  {row.value.toFixed(3).replace(/^0/, "")}
                </span>
              </div>
            );
          })}
          <Sticker text="1位！" color={COLOR.gold} rotate={-14} delay={60} size={64} style={{ bottom: 300, right: 76 }} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={580} durationInFrames={140}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: 140 }}>
          <div style={{ display: "flex" }}>
            <PopPhone screen="practice" delay={2} rotate={-8} width={392} />
            <div style={{ marginLeft: -24, marginTop: 96 }}>
              <PopPhone screen="note" delay={10} rotate={7} width={392} />
            </div>
          </div>
          <Sticker text="練習も記録！" color={POP.green} rotate={-9} delay={24} size={46} style={{ top: 300, left: 70 }} />
          <Sticker text="野球ノートも！" color={POP.purple} rotate={8} delay={34} size={46} style={{ bottom: 290, right: 60 }} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={720} durationInFrames={160}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 52, paddingBottom: 100 }}>
          <Img src={staticFile("logo.png")} style={{ width: 660, transform: `scale(${useBounceValue(frame - 724)})` }} />
          <BouncyLine text="いますぐ無料で" delay={736 - 720} size={72} />
          <div
            style={{
              padding: "34px 76px",
              borderRadius: 999,
              background: COLOR.gold,
              border: OUTLINE,
              boxShadow: HARD_SHADOW,
              fontFamily: JP,
              fontWeight: 900,
              fontSize: 72,
              color: POP.ink,
              transform: `scale(${1 + wave(frame, 34, 0.03)})`,
            }}
          >
            はじめる
          </div>
          <div
            style={{
              fontFamily: ROUND,
              fontWeight: 600,
              fontSize: 40,
              letterSpacing: "0.12em",
              color: POP.ink,
              opacity: track(frame, 790, 20),
            }}
          >
            App Store ／ buzzbase.jp
          </div>
          <Confetti start={6} x={540} y={760} />
          <Confetti start={66} x={540} y={900} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

/** Sequence の外で spring を使いたい箇所向け */
function useBounceValue(localFrame: number) {
  const { fps } = useVideoConfig();
  return spring({
    frame: localFrame,
    fps,
    config: { damping: 11, mass: 0.7, stiffness: 190 },
  });
}
