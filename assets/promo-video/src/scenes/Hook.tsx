import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, DISPLAY, JP } from "../theme";
import { EASE_IN_OUT, EASE_OUT, track } from "../anim";
import { Marquee } from "../components/Marquee";

const STATS = "打率　OPS　防御率　出塁率　長打率　奪三振率　WHIP　得点圏打率　";

/**
 * 冒頭 1.5 秒。1フレーム目からゴールドの全面で始め、問いかけを叩き込む。
 * SNS はここで見るかどうかが決まるので、フェードインは使わない。
 */
export const Hook: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();

  const slam = track(frame, 0, 7, { easing: EASE_OUT });
  // 1フレーム目は必ず本編を見せる。閃光は文字が着地する瞬間に当てる
  const flash = Math.max(0, 1 - Math.abs(frame - 6) / 3) * 0.42;
  const push = track(frame, duration - 12, 12, { easing: EASE_IN_OUT });

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.gold, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          justifyContent: "space-between",
          paddingTop: 210,
          paddingBottom: 250,
        }}
      >
        <Marquee
          text={STATS}
          frame={frame}
          size={148}
          speed={0.0042}
          color="#2B1B03"
          opacity={0.22}
          fontFamily={JP}
        />
        <Marquee
          text={STATS}
          frame={frame}
          size={148}
          speed={0.0034}
          color="#2B1B03"
          opacity={0.16}
          outline={4}
          reverse
          fontFamily={JP}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 10,
          transform: `scale(${1.34 - slam * 0.34}) translateY(${push * -120}px)`,
          opacity: 1 - push,
        }}
      >
        <div
          style={{
            fontFamily: JP,
            fontWeight: 900,
            fontSize: 122,
            lineHeight: 1.18,
            color: "#160E02",
            whiteSpace: "nowrap",
            letterSpacing: "-0.01em",
          }}
        >
          自分の打率、
        </div>
        <div
          style={{
            fontFamily: JP,
            fontWeight: 900,
            fontSize: 122,
            lineHeight: 1.18,
            color: "#160E02",
            whiteSpace: "nowrap",
            letterSpacing: "-0.01em",
          }}
        >
          すぐ言える？
        </div>
        <div
          style={{
            marginTop: 40,
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: "0.4em",
            color: "rgba(22,14,2,0.62)",
            opacity: track(frame, 8, 14),
          }}
        >
          FOR BASEBALL PLAYERS
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ backgroundColor: COLOR.chalk, opacity: flash }} />
    </AbsoluteFill>
  );
};
