import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Field } from "./play/Field";
import { TapPhone } from "./play/TapPhone";
import { Phone } from "./components/Phone";
import { COLOR, DISPLAY, JP, SCENE } from "./theme";
import { EASE_IN_OUT, EASE_OUT, track, wave } from "./anim";

export const PLAY_FRAMES = 1040;

const CUTS = { field: 0, record: 160, result: 360, stats: 520, pitch: 680, cta: 840 };

const Caption: React.FC<{
  lines: string[];
  frame: number;
  start: number;
  end: number;
  size?: number;
}> = ({ lines, frame, start, end, size = 68 }) => {
  const show = track(frame, start, 16) * (1 - track(frame, end - 14, 14, { easing: EASE_IN_OUT }));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 196,
        textAlign: "center",
        opacity: show,
        transform: `translateY(${(1 - show) * 22}px)`,
      }}
    >
      {lines.map((line) => (
        <div
          key={line}
          style={{
            fontFamily: JP,
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.34,
            color: COLOR.chalk,
            whiteSpace: "nowrap",
            textShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
};

const Chip: React.FC<{ text: string; progress: number; style: React.CSSProperties }> = ({
  text,
  progress,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      padding: "18px 32px",
      borderRadius: 14,
      background: COLOR.gold,
      color: "#241A08",
      fontFamily: JP,
      fontWeight: 900,
      fontSize: 42,
      whiteSpace: "nowrap",
      boxShadow: "0 22px 60px rgba(0,0,0,0.55)",
      opacity: progress,
      transform: `translateY(${(1 - progress) * 22}px) scale(${0.9 + progress * 0.1})`,
      ...style,
    }}
  >
    {text}
  </div>
);

/** キャッチャー目線のストライクゾーン。投球が外角低めに決まる */
const Zone: React.FC<{ frame: number; start: number }> = ({ frame, start }) => {
  const local = frame - start;
  const flight = track(local, 10, 22, { easing: EASE_OUT });
  const pop = track(local, 32, 14, { easing: EASE_OUT });
  const target = { x: 690, y: 1180 };

  return (
    <svg width="1080" height="1920" viewBox="0 0 1080 1920">
      {Array.from({ length: 3 }).map((_, row) =>
        Array.from({ length: 3 }).map((_, column) => (
          <rect
            key={`${row}-${column}`}
            x={340 + column * 134}
            y={760 + row * 134}
            width={134}
            height={134}
            fill="none"
            stroke="rgba(242,238,228,0.28)"
            strokeWidth={4}
          />
        )),
      )}
      <rect x={340} y={760} width={402} height={402} fill="none" stroke="rgba(242,238,228,0.6)" strokeWidth={7} />
      <path
        d="M 470 1290 L 612 1290 L 640 1330 L 541 1382 L 442 1330 Z"
        fill="none"
        stroke="rgba(242,238,228,0.5)"
        strokeWidth={6}
      />
      <path
        d={`M 540 380 Q 620 820 ${target.x} ${target.y}`}
        fill="none"
        stroke={COLOR.goldHi}
        strokeWidth={9}
        strokeDasharray="1000"
        strokeDashoffset={1000 * (1 - flight)}
        strokeLinecap="round"
      />
      <circle
        cx={540 + (target.x - 540) * flight}
        cy={380 + (target.y - 380) * flight}
        r={26}
        fill="#FFFDF6"
        opacity={flight > 0 ? 1 : 0}
      />
      <circle
        cx={target.x}
        cy={target.y}
        r={34 + pop * 90}
        fill="none"
        stroke={COLOR.goldHi}
        strokeWidth={7}
        opacity={(1 - pop) * 0.9}
      />
    </svg>
  );
};

/**
 * 6本目。プレーと記録を交互に見せる実演型。
 * 打球が左中間へ飛ぶ俯瞰図から、同じ形をしたアプリの球場図へ渡し、
 * 指のタップで「その場で記録している」ところをそのまま映す。
 */
export const Play: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fieldShrink = track(frame, CUTS.record - 34, 44, { easing: EASE_IN_OUT });
  const phoneIn = spring({
    frame: frame - (CUTS.record - 20),
    fps,
    config: { damping: 200, mass: 1, stiffness: 92 },
  });
  const recordOut = track(frame, CUTS.stats - 26, 26, { easing: EASE_IN_OUT });

  const statsIn = spring({
    frame: frame - CUTS.stats,
    fps,
    config: { damping: 200, mass: 1, stiffness: 100 },
  });
  const statsOut = track(frame, CUTS.pitch - 24, 24, { easing: EASE_IN_OUT });
  const average = interpolate(frame, [CUTS.stats + 40, CUTS.stats + 92], [0.287, 0.291], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pitchIn = track(frame, CUTS.pitch, 18);
  const pitchPhone = spring({
    frame: frame - (CUTS.pitch + 74),
    fps,
    config: { damping: 200, mass: 1, stiffness: 100 },
  });
  const pitchOut = track(frame, CUTS.cta - 24, 24, { easing: EASE_IN_OUT });

  const ctaIn = spring({
    frame: frame - CUTS.cta,
    fps,
    config: { damping: 190, mass: 1, stiffness: 104 },
  });

  const inField = frame < CUTS.record + 40;
  const inRecord = frame >= CUTS.record - 40 && frame < CUTS.stats;
  const inStats = frame >= CUTS.stats - 20 && frame < CUTS.pitch;
  const inPitch = frame >= CUTS.pitch - 10 && frame < CUTS.cta;
  const inCta = frame >= CUTS.cta - 10;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0C1410" }}>
      <Audio src={staticFile("audio/play.m4a")} />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(90% 60% at 50% 34%, #16281C 0%, #0C1410 56%, #060A08 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile("noise.png")})`,
          backgroundSize: "480px 480px",
          opacity: 0.26,
          mixBlendMode: "overlay",
        }}
      />

      {/* 俯瞰の球場。そのまま縮んで端末の中に収まる */}
      {inField ? (
        <AbsoluteFill
          style={{
            transformOrigin: "50% 58%",
            transform: `scale(${1 - fieldShrink * 0.62}) translateY(${fieldShrink * -140}px)`,
            opacity: 1 - track(frame, CUTS.record - 12, 22, { easing: EASE_IN_OUT }),
          }}
        >
          <Field frame={frame} start={CUTS.field} />
        </AbsoluteFill>
      ) : null}

      {inField ? (
        <>
          <Caption lines={["打った。"]} frame={frame} start={CUTS.field + 8} end={CUTS.field + 70} size={92} />
          <Caption
            lines={["左中間へ、二塁打。"]}
            frame={frame}
            start={CUTS.field + 74}
            end={CUTS.record - 10}
            size={78}
          />
        </>
      ) : null}

      {/* 記録。実画面の上で指が動くところをそのまま見せる */}
      {inRecord ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 210,
            opacity: phoneIn * (1 - recordOut),
            transform: `scale(${0.82 + phoneIn * 0.18}) translateY(${(1 - phoneIn) * 120 + recordOut * -80}px)`,
          }}
        >
          <TapPhone
            screen="plate-input"
            width={620}
            frame={frame}
            taps={[
              { x: 300, y: 462, at: CUTS.record + 54, box: { x: 258, y: 436, width: 84, height: 52 } },
              { x: 690, y: 1235, at: CUTS.result + 36, box: { x: 478, y: 1194, width: 424, height: 84 } },
            ]}
          />
        </AbsoluteFill>
      ) : null}

      {inRecord ? (
        <>
          <Caption
            lines={["打球方向を、タップ。"]}
            frame={frame}
            start={CUTS.record + 34}
            end={CUTS.result + 10}
            size={72}
          />
          <Caption
            lines={["結果を、タップ。"]}
            frame={frame}
            start={CUTS.result + 18}
            end={CUTS.stats - 16}
            size={72}
          />
          <Chip
            text="これだけ。30秒。"
            progress={track(frame, CUTS.result + 66, 20) * (1 - recordOut)}
            style={{ left: 0, right: 0, bottom: 200, margin: "0 auto", width: "fit-content" }}
          />
        </>
      ) : null}

      {/* 記録した結果が成績に反映される */}
      {inStats ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 250,
            opacity: statsIn * (1 - statsOut),
            transform: `translateY(${(1 - statsIn) * 130}px)`,
          }}
        >
          <Phone screen="dashboard" width={600} />
        </AbsoluteFill>
      ) : null}

      {inStats ? (
        <>
          <Caption
            lines={["打率は、その場で更新。"]}
            frame={frame}
            start={CUTS.stats + 10}
            end={CUTS.pitch - 16}
            size={72}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 210,
              display: "flex",
              justifyContent: "center",
              opacity: track(frame, CUTS.stats + 34, 18) * (1 - statsOut),
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 28,
                padding: "22px 48px",
                borderRadius: 26,
                background: "rgba(6,10,8,0.88)",
                border: "3px solid rgba(224,142,10,0.42)",
                boxShadow: "0 28px 70px rgba(0,0,0,0.6)",
              }}
            >
            <span
              style={{
                fontFamily: DISPLAY,
                fontWeight: 900,
                fontSize: 74,
                color: "rgba(242,238,228,0.42)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              .287
            </span>
            <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 60, color: COLOR.gold }}>→</span>
            <span
              style={{
                fontFamily: DISPLAY,
                fontWeight: 900,
                fontSize: 120,
                color: COLOR.goldHi,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {average.toFixed(3).replace(/^0/, "")}
            </span>
            </div>
          </div>
        </>
      ) : null}

      {/* 投げる側も同じ流れで残せる */}
      {inPitch ? (
        <AbsoluteFill style={{ opacity: pitchIn * (1 - pitchOut) }}>
          <AbsoluteFill style={{ opacity: 1 - track(frame, CUTS.pitch + 62, 22, { easing: EASE_IN_OUT }) }}>
            <Zone frame={frame} start={CUTS.pitch} />
          </AbsoluteFill>
          <AbsoluteFill
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 250,
              opacity: pitchPhone,
              transform: `scale(${0.86 + pitchPhone * 0.14}) translateY(${(1 - pitchPhone) * 120}px)`,
            }}
          >
            <Phone screen="course" width={600} />
          </AbsoluteFill>
        </AbsoluteFill>
      ) : null}

      {inPitch ? (
        <>
          <Caption
            lines={["投げたコースも。"]}
            frame={frame}
            start={CUTS.pitch + 10}
            end={CUTS.pitch + 70}
            size={78}
          />
          <Caption
            lines={["25コースぶん、", "自動で集計される。"]}
            frame={frame}
            start={CUTS.pitch + 78}
            end={CUTS.cta - 16}
            size={64}
          />
        </>
      ) : null}

      {inCta ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: 54,
            paddingBottom: 170,
            opacity: ctaIn,
          }}
        >
          <div
            style={{
              fontFamily: JP,
              fontWeight: 900,
              fontSize: 82,
              lineHeight: 1.3,
              textAlign: "center",
              color: COLOR.chalk,
              transform: `translateY(${(1 - ctaIn) * 34}px)`,
            }}
          >
            プレーして、記録して、
            <br />
            強くなる。
          </div>
          <Img
            src={staticFile("logo.png")}
            style={{
              width: 640,
              opacity: track(frame, CUTS.cta + 34, 20),
              transform: `scale(${0.9 + track(frame, CUTS.cta + 34, 20) * 0.1})`,
            }}
          />
          <div style={{ display: "flex", gap: 26 }}>
            {[
              { text: "App Store", solid: true, at: CUTS.cta + 62 },
              { text: "buzzbase.jp", solid: false, at: CUTS.cta + 72 },
            ].map((pill) => {
              const show = track(frame, pill.at, 20);
              return (
                <span
                  key={pill.text}
                  style={{
                    padding: "24px 48px",
                    borderRadius: 999,
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 38,
                    letterSpacing: "0.06em",
                    background: pill.solid ? COLOR.gold : "transparent",
                    border: `3px solid ${pill.solid ? COLOR.gold : "rgba(242,238,228,0.32)"}`,
                    color: pill.solid ? "#241A08" : COLOR.chalk,
                    opacity: show,
                    transform: `translateY(${(1 - show) * 22}px)`,
                  }}
                >
                  {pill.text}
                </span>
              );
            })}
          </div>
          <div
            style={{
              fontFamily: JP,
              fontWeight: 500,
              fontSize: 32,
              letterSpacing: "0.2em",
              color: SCENE.bulb,
              opacity: track(frame, CUTS.cta + 90, 20) * 0.7,
            }}
          >
            iOS ／ Web 対応・基本無料
          </div>
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill
        style={{
          background: "radial-gradient(116% 76% at 50% 46%, rgba(0,0,0,0) 44%, rgba(0,0,0,0.72) 100%)",
          pointerEvents: "none",
          transform: `translateY(${wave(frame, 600, 8)}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
