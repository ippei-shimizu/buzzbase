import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, JP } from "../theme";
import { EASE_IN_OUT, EASE_OUT, track } from "../anim";

const LINE_SIZE = 104;

/** 記憶 → 記録 の言い換えでアプリの存在理由を1カットで言い切る */
export const Thesis: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();

  const lead = track(frame, 2, 18);
  const memory = track(frame, 12, 18);
  const strike = track(frame, 30, 12, { easing: EASE_OUT });
  const lift = track(frame, 44, 16, { easing: EASE_IN_OUT });
  const record = track(frame, 50, 20);
  const sub = track(frame, 68, 20);
  const out = track(frame, duration - 14, 14, { easing: EASE_IN_OUT });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingLeft: 78,
        opacity: 1 - out,
        transform: `translateY(${out * -60}px)`,
      }}
    >
      <div
        style={{
          fontFamily: JP,
          fontWeight: 700,
          fontSize: 48,
          color: COLOR.mute,
          whiteSpace: "nowrap",
          opacity: lead,
          transform: `translateY(${(1 - lead) * 24}px)`,
          marginBottom: 34,
        }}
      >
        きのうの4打席。
      </div>

      <div
        style={{
          position: "relative",
          alignSelf: "flex-start",
          opacity: memory * (1 - lift * 0.62),
          transform: `translateY(${(1 - memory) * 30 - lift * 44}px)`,
        }}
      >
        <span
          style={{
            fontFamily: JP,
            fontWeight: 900,
            fontSize: LINE_SIZE,
            color: "rgba(242,238,228,0.52)",
            whiteSpace: "nowrap",
          }}
        >
          記憶に残す。
        </span>
        <span
          style={{
            position: "absolute",
            left: -8,
            top: "52%",
            height: 10,
            width: `calc(${strike * 100}% + 16px)`,
            background: COLOR.gold,
            borderRadius: 999,
          }}
        />
      </div>

      <div
        style={{
          marginTop: 22,
          fontFamily: JP,
          fontWeight: 900,
          fontSize: LINE_SIZE,
          color: COLOR.chalk,
          whiteSpace: "nowrap",
          opacity: record,
          transform: `translateY(${(1 - record) * -46}px)`,
        }}
      >
        <span style={{ color: COLOR.gold }}>記録</span>に残す。
      </div>

      <div
        style={{
          marginTop: 44,
          fontFamily: JP,
          fontWeight: 500,
          fontSize: 36,
          color: COLOR.mute,
          whiteSpace: "nowrap",
          opacity: sub,
          transform: `translateY(${(1 - sub) * 20}px)`,
        }}
      >
        打数と安打を入れるだけ。あとは全部、自動で。
      </div>
    </AbsoluteFill>
  );
};
