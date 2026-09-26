import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { World } from "./journey/World";
import { WORLD, averageAt, formatAverage, monthAt, xFor, yFor } from "./journey/season";
import { CAMERA_LEAD } from "./journey/World";
import { COLOR, DISPLAY, JP } from "./theme";
import { EASE_IN_OUT, track } from "./anim";

export const JOURNEY_FRAMES = 1200;

/** 折れ線をどこまで描いたか。寄りのあいだは止めて、酔わないようにする */
const PROGRESS_FRAMES = [0, 60, 100, 300, 440, 620, 760, 880];
// 寄りで止める値はカードの ratio より少し先にする。真上で止めるとカードが出現しない
const PROGRESS_VALUES = [1, 1, 0, 0.38, 0.38, 0.72, 0.72, 1];

/** 寄り引き。1.8 の区間が、カットを割らずにカット相当の緩急を作る */
const ZOOM_FRAMES = [0, 60, 100, 300, 340, 400, 440, 620, 660, 720, 760, 880, 950, 1200];
const ZOOM_VALUES = [0.17, 0.17, 1.0, 1.0, 1.45, 1.45, 1.0, 1.0, 1.45, 1.45, 1.0, 1.0, 0.17, 0.17];

const Pill: React.FC<{ text: string; solid?: boolean; progress: number }> = ({
  text,
  solid,
  progress,
}) => (
  <div
    style={{
      padding: "24px 48px",
      borderRadius: 999,
      fontFamily: DISPLAY,
      fontWeight: 700,
      fontSize: 38,
      letterSpacing: "0.06em",
      whiteSpace: "nowrap",
      background: solid ? COLOR.gold : "transparent",
      border: `3px solid ${solid ? COLOR.gold : "rgba(242,238,228,0.32)"}`,
      color: solid ? "#241A08" : COLOR.chalk,
      opacity: progress,
      transform: `translateY(${(1 - progress) * 24}px)`,
    }}
  >
    {text}
  </div>
);

/**
 * 3本目。カットを割らず、1シーズン分のデータの中をカメラが動き続ける1カット。
 * 情報は絶えず変わるが場面転換は無い、という点で他の2本と構造が違う。
 */
export const Journey: React.FC = () => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, PROGRESS_FRAMES, PROGRESS_VALUES, {
    easing: Easing.bezier(0.5, 0, 0.5, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zoom = interpolate(frame, ZOOM_FRAMES, ZOOM_VALUES, {
    easing: Easing.bezier(0.5, 0, 0.5, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const wide = interpolate(zoom, [0.34, 0.92], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headX = xFor(progress);
  const headY = yFor(averageAt(progress));
  const centerX = headX * (1 - wide) + (WORLD.width / 2) * wide + CAMERA_LEAD * (1 - wide);
  const centerY = (headY + 110) * (1 - wide) + 980 * wide;

  const travelling = track(frame, 100, 20) * (1 - track(frame, 880, 20));
  const hook = 1 - track(frame, 52, 18, { easing: EASE_IN_OUT });
  const totals = track(frame, 956, 20) * (1 - track(frame, 1050, 16));
  const closing = track(frame, 1048, 20);
  const finale = track(frame, 946, 22) * (1 - track(frame, 1044, 14));
  const scrim = track(frame, 1040, 26);

  return (
    <AbsoluteFill style={{ backgroundColor: "#070A0F", overflow: "hidden" }}>
      <Audio src={staticFile("audio/journey.m4a")} />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(90% 60% at 50% 40%, #101823 0%, #0A0E14 48%, #05070B 100%)",
        }}
      />

      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "0 0",
              // 引きのときは帯を下に逃がし、上に冒頭コピーの居場所を作る
            transform: `translate(540px, ${960 + wide * 300}px) scale(${zoom}) translate(${-centerX}px, ${-centerY}px)`,
          }}
        >
          <World progress={progress} />
        </div>
      </AbsoluteFill>

      {/* 走行中の計器。数字が絶えず動き続けることで、切り替えなしでも間が持つ */}
      <AbsoluteFill style={{ opacity: travelling, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            top: 96,
            left: 66,
            right: 66,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span
            style={{
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: "0.4em",
              color: "rgba(242,238,228,0.46)",
            }}
          >
            2026 SEASON
          </span>
          <span
            style={{
              fontFamily: JP,
              fontWeight: 900,
              fontSize: 60,
              color: COLOR.chalk,
            }}
          >
            {monthAt(progress)}
          </span>
        </div>

        <div style={{ position: "absolute", bottom: 232, left: 66 }}>
          <div
            style={{
              fontFamily: JP,
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: "0.3em",
              color: "rgba(242,238,228,0.5)",
              marginBottom: 6,
            }}
          >
            通算打率
          </div>
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: 168,
              lineHeight: 0.92,
              fontVariantNumeric: "tabular-nums",
              color: COLOR.goldHi,
            }}
          >
            {formatAverage(averageAt(progress))}
          </div>
        </div>
      </AbsoluteFill>

      {/* 冒頭。完成した線を先に見せてから、4月まで巻き戻す */}
      <AbsoluteFill
        style={{
          opacity: hook,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 42,
          paddingBottom: 520,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: JP,
            fontWeight: 900,
            fontSize: 110,
            lineHeight: 1.22,
            textAlign: "center",
            color: COLOR.chalk,
            transform: `scale(${1.1 - track(frame, 0, 8) * 0.1})`,
          }}
        >
          半年で、
          <br />
          ここまで変わった。
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 34,
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontSize: 132,
            fontVariantNumeric: "tabular-nums",
            opacity: track(frame, 8, 14),
          }}
        >
          <span style={{ color: "rgba(242,238,228,0.46)" }}>.188</span>
          <span style={{ color: COLOR.gold, fontSize: 96 }}>→</span>
          <span style={{ color: COLOR.goldHi }}>.342</span>
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          bottom: 300,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: "0.4em",
          color: COLOR.gold,
          opacity: track(frame, 60, 8) * (1 - track(frame, 96, 8)),
        }}
      >
        ◀◀ 4月へ
      </div>

      <div
        style={{
          position: "absolute",
          top: 430,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "baseline",
          gap: 30,
          fontFamily: DISPLAY,
          fontWeight: 900,
          fontSize: 118,
          fontVariantNumeric: "tabular-nums",
          opacity: finale,
        }}
      >
        <span style={{ fontFamily: JP, fontSize: 44, color: "rgba(242,238,228,0.5)" }}>4月</span>
        <span style={{ color: "rgba(242,238,228,0.5)" }}>.188</span>
        <span style={{ color: COLOR.gold, fontSize: 84 }}>→</span>
        <span style={{ fontFamily: JP, fontSize: 44, color: COLOR.goldHi }}>9月</span>
        <span style={{ color: COLOR.goldHi }}>.342</span>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 300,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 78,
          opacity: totals,
        }}
      >
        {[
          { label: "打席", value: "312" },
          { label: "安打", value: "98" },
          { label: "本塁打", value: "11" },
        ].map((total) => (
          <div key={total.label} style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: JP,
                fontWeight: 700,
                fontSize: 28,
                letterSpacing: "0.24em",
                color: "rgba(242,238,228,0.5)",
              }}
            >
              {total.label}
            </div>
            <div
              style={{
                fontFamily: DISPLAY,
                fontWeight: 900,
                fontSize: 96,
                fontVariantNumeric: "tabular-nums",
                color: COLOR.chalk,
              }}
            >
              {total.value}
            </div>
          </div>
        ))}
      </div>

      {/* 締め。線を消さずに上から重ねるので、最後までカットが割れない */}
      <AbsoluteFill style={{ backgroundColor: "rgba(5,7,11,0.82)", opacity: scrim }} />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 54,
          paddingBottom: 150,
          opacity: closing,
        }}
      >
        <div
          style={{
            fontFamily: JP,
            fontWeight: 900,
            fontSize: 72,
            lineHeight: 1.3,
            textAlign: "center",
            color: COLOR.chalk,
            transform: `translateY(${(1 - closing) * 30}px)`,
          }}
        >
          この線は、
          <br />
          記録した人にしか描けない。
        </div>
        <Img
          src={staticFile("logo.png")}
          style={{ width: 640, opacity: track(frame, 1076, 20) }}
        />
        <div style={{ display: "flex", gap: 26 }}>
          <Pill text="App Store" solid progress={track(frame, 1100, 20)} />
          <Pill text="buzzbase.jp" progress={track(frame, 1110, 20)} />
        </div>
        <div
          style={{
            fontFamily: JP,
            fontWeight: 500,
            fontSize: 32,
            letterSpacing: "0.2em",
            color: COLOR.mute,
            opacity: track(frame, 1126, 20),
          }}
        >
          iOS ／ Web 対応・基本無料
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
