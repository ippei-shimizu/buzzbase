import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Phone } from "./components/Phone";
import { COLOR, EDITORIAL, MINCHO, SERIF } from "./theme";
import { EASE_IN_OUT, EASE_SOFT, track } from "./anim";

export const RUNWAY_FRAMES = 1120;

const FADE = 22;

/** 前後を重ねて溶かす。ハードカットを1回も使わないのがこの版のトーン */
const phase = (frame: number, start: number, end: number) =>
  track(frame, start, FADE, { easing: EASE_IN_OUT }) *
  (1 - track(frame, end - FADE, FADE, { easing: EASE_IN_OUT }));

const Label: React.FC<{ text: string; opacity?: number }> = ({ text, opacity = 1 }) => (
  <div
    style={{
      fontFamily: SERIF,
      fontWeight: 400,
      fontSize: 26,
      letterSpacing: "0.52em",
      textTransform: "uppercase",
      color: EDITORIAL.faint,
      opacity,
    }}
  >
    {text}
  </div>
);

const Rule: React.FC<{ width: number; gold?: boolean }> = ({ width, gold }) => (
  <div
    style={{
      width,
      height: 1,
      background: gold ? COLOR.gold : EDITORIAL.rule,
    }}
  />
);

const Mincho: React.FC<{ children: React.ReactNode; size: number; lift: number }> = ({
  children,
  size,
  lift,
}) => (
  <div
    style={{
      fontFamily: MINCHO,
      fontWeight: 600,
      fontSize: size,
      lineHeight: 1.62,
      letterSpacing: "0.12em",
      textAlign: "center",
      color: EDITORIAL.ink,
      transform: `translateY(${lift}px)`,
    }}
  >
    {children}
  </div>
);

const SPEC = [
  { label: "ON BASE PLUS SLUGGING", jp: "OPS", value: ".921" },
  { label: "SLUGGING", jp: "長打率", value: ".548" },
  { label: "WITH RUNNERS IN SCORING POSITION", jp: "得点圏打率", value: ".364" },
  { label: "EARNED RUN AVERAGE", jp: "防御率", value: "2.15" },
];

/** 端末の上をゆっくり流れる反射。暗い画面に動きを与える */
const Sheen: React.FC<{ progress: number }> = ({ progress }) => (
  <div
    style={{
      position: "absolute",
      inset: -40,
      overflow: "hidden",
      pointerEvents: "none",
      borderRadius: 90,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: "-40%",
        background:
          "linear-gradient(108deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0) 60%)",
        transform: `translateX(${-60 + progress * 120}%)`,
      }}
    />
  </div>
);

/**
 * 4本目。ハイファッションの広告に寄せたエディトリアル版。
 * 明朝とボドニ、余白、細い罫だけで組み、動きは全編ゆっくりにしている。
 */
export const Runway: React.FC = () => {
  const frame = useCurrentFrame();

  // 全編にかかるごく緩いプッシュイン。止め絵に見せない
  const drift = interpolate(frame, [0, RUNWAY_FRAMES], [1, 1.07], {
    easing: EASE_SOFT,
  });

  const s1 = phase(frame, 0, 190);
  const s2 = phase(frame, 168, 350);
  const s3 = phase(frame, 328, 530);
  const s4 = phase(frame, 508, 700);
  const s5 = phase(frame, 678, 850);
  const s6 = phase(frame, 828, 980);
  const s7 = phase(frame, 958, 1120);

  return (
    <AbsoluteFill style={{ backgroundColor: EDITORIAL.ground, overflow: "hidden" }}>
      <Audio src={staticFile("audio/runway.m4a")} />

      <AbsoluteFill style={{ transform: `scale(${drift})` }}>
        <AbsoluteFill
          style={{
            opacity: s1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 56,
          }}
        >
          <Label text="Personal Baseball Records" />
          <Rule width={track(frame, 14, 70, { easing: EASE_SOFT }) * 620} gold />
          <Mincho size={82} lift={(1 - track(frame, 30, 70, { easing: EASE_SOFT })) * 26}>
            一球に、
            <br />
            意味を持たせる。
          </Mincho>
        </AbsoluteFill>

        <AbsoluteFill
          style={{
            opacity: s2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
            transform: `scale(${1 + track(frame, 168, 180, { easing: EASE_SOFT }) * 0.05})`,
          }}
        >
          <Label text="Batting Average" />
          <Rule width={520} />
          <div
            style={{
              fontFamily: SERIF,
              fontWeight: 500,
              fontSize: 380,
              lineHeight: 1,
              letterSpacing: "0.01em",
              color: EDITORIAL.ink,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            .342
          </div>
          <Rule width={520} />
          <Label text="2026 Season" />
        </AbsoluteFill>

        <AbsoluteFill
          style={{
            opacity: s3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 74,
            perspective: 2200,
          }}
        >
          <div
            style={{
              position: "relative",
              transform: `rotateY(${8 - track(frame, 328, 200, { easing: EASE_SOFT }) * 14}deg) rotateX(2deg) translateY(-40px)`,
            }}
          >
            <Phone screen="dashboard" width={560} />
            <Sheen progress={track(frame, 340, 170, { easing: EASE_SOFT })} />
          </div>
          <Mincho size={48} lift={0}>
            記録は、静かに積み上がる。
          </Mincho>
        </AbsoluteFill>

        <AbsoluteFill
          style={{
            opacity: s4,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 96px",
            gap: 0,
          }}
        >
          <div style={{ marginBottom: 54 }}>
            <Label text="Season Index" />
          </div>
          {SPEC.map((row, index) => {
            const appear = track(frame, 528 + index * 22, 44, { easing: EASE_SOFT });
            return (
              <div
                key={row.jp}
                style={{
                  borderTop: `1px solid ${EDITORIAL.rule}`,
                  borderBottom: index === SPEC.length - 1 ? `1px solid ${EDITORIAL.rule}` : "none",
                  padding: "40px 0",
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 30,
                  opacity: appear,
                  transform: `translateY(${(1 - appear) * 18}px)`,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <span
                    style={{
                      fontFamily: MINCHO,
                      fontWeight: 600,
                      fontSize: 46,
                      letterSpacing: "0.1em",
                      color: EDITORIAL.ink,
                    }}
                  >
                    {row.jp}
                  </span>
                  <span
                    style={{
                      fontFamily: SERIF,
                      fontSize: 19,
                      letterSpacing: "0.36em",
                      textTransform: "uppercase",
                      color: EDITORIAL.faint,
                    }}
                  >
                    {row.label}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: SERIF,
                    fontWeight: 500,
                    fontSize: 96,
                    fontVariantNumeric: "tabular-nums",
                    color: index === 0 ? COLOR.gold : EDITORIAL.ink,
                  }}
                >
                  {row.value}
                </span>
              </div>
            );
          })}
        </AbsoluteFill>

        <AbsoluteFill
          style={{
            opacity: s5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 74,
            perspective: 2200,
          }}
        >
          <div
            style={{
              position: "relative",
              transform: `rotateY(${-12 + track(frame, 678, 180, { easing: EASE_SOFT }) * 18}deg) rotateX(-2deg) translateY(-40px)`,
            }}
          >
            <Phone screen="course" width={560} />
            <Sheen progress={track(frame, 690, 160, { easing: EASE_SOFT })} />
          </div>
          <Mincho size={48} lift={0}>
            見えていなかった、弱点まで。
          </Mincho>
        </AbsoluteFill>

        <AbsoluteFill
          style={{
            opacity: s6,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 52,
          }}
        >
          <Mincho size={86} lift={(1 - track(frame, 846, 90, { easing: EASE_SOFT })) * 20}>
            打率は、
            <br />
            気分ではない。
          </Mincho>
          <Rule width={track(frame, 880, 70, { easing: EASE_SOFT }) * 420} gold />
        </AbsoluteFill>

        <AbsoluteFill
          style={{
            opacity: s7,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 52,
          }}
        >
          <Img
            src={staticFile("logo.png")}
            style={{
              width: 620,
              opacity: track(frame, 972, 60, { easing: EASE_SOFT }),
            }}
          />
          <Rule width={track(frame, 1000, 60, { easing: EASE_SOFT }) * 520} />
          <div
            style={{
              fontFamily: MINCHO,
              fontWeight: 600,
              fontSize: 34,
              letterSpacing: "0.44em",
              color: EDITORIAL.ink,
              opacity: track(frame, 1014, 50, { easing: EASE_SOFT }),
            }}
          >
            野球の個人成績記録アプリ
          </div>
          <div
            style={{
              display: "flex",
              gap: 26,
              marginTop: 24,
              opacity: track(frame, 1042, 50, { easing: EASE_SOFT }),
            }}
          >
            {["App Store", "buzzbase.jp"].map((text) => (
              <span
                key={text}
                style={{
                  padding: "20px 44px",
                  border: `1px solid ${EDITORIAL.rule}`,
                  fontFamily: SERIF,
                  fontSize: 30,
                  letterSpacing: "0.22em",
                  color: EDITORIAL.ink,
                }}
              >
                {text}
              </span>
            ))}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile("noise.png")})`,
          backgroundSize: "420px 420px",
          opacity: 0.4,
          mixBlendMode: "overlay",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(118% 78% at 50% 46%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.78) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
