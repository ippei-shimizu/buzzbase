import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, DISPLAY, JP } from "../theme";
import { EASE_OUT, track } from "../anim";

const COLUMNS = [
  [".287", "4-2", "HR", ".702", "K", "2B"],
  ["OPS", ".318", "3-1", "BB", ".455", "RBI"],
  ["1.24", "SO", ".366", "5-3", "3B", ".220"],
  ["ERA", "9-4", ".241", "SB", ".980", "H"],
  [".500", "2-1", "IP", ".333", "W", ".129"],
  ["AVG", "6-2", ".409", "GO", ".075", "FO"],
];

/** 縦に流れる数字の列。1カット目から画面を情報で埋める */
const Column: React.FC<{ tokens: string[]; frame: number; speed: number; offset: number }> = ({
  tokens,
  frame,
  speed,
  offset,
}) => {
  const loop = (((frame + offset) * speed) % 1 + 1) % 1;
  return (
    <div style={{ overflow: "hidden", height: "100%", flex: 1 }}>
      <div style={{ transform: `translateY(${-loop * 50}%)` }}>
        {[0, 1].map((copy) => (
          <div key={copy}>
            {tokens.map((token) => (
              <div
                key={token}
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 900,
                  fontSize: 78,
                  lineHeight: 1.5,
                  textAlign: "center",
                  color: "rgba(38,24,3,0.26)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {token}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const GoldRain: React.FC = () => {
  const frame = useCurrentFrame();
  const slam = track(frame, 0, 6, { easing: EASE_OUT });

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.gold, overflow: "hidden" }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "row", gap: 18, padding: "0 20px" }}>
        {COLUMNS.map((tokens, index) => (
          <Column
            key={tokens[0]}
            tokens={tokens}
            frame={frame}
            speed={0.0026 + index * 0.0006}
            offset={index * 37}
          />
        ))}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          display: "grid",
          placeItems: "center",
          transform: `scale(${1.22 - slam * 0.22})`,
        }}
      >
        <div
          style={{
            fontFamily: JP,
            fontWeight: 900,
            fontSize: 168,
            color: "#140D01",
            whiteSpace: "nowrap",
            letterSpacing: "-0.02em",
          }}
        >
          その打席、
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
