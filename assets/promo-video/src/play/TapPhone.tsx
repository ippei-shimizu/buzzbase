import React from "react";
import { Phone } from "../components/Phone";
import { COLOR } from "../theme";
import { EASE_OUT, track } from "../anim";

/** 切り出した実画面の座標系（920x2002）で位置を指定する */
export type Tap = {
  x: number;
  y: number;
  at: number;
  box?: { x: number; y: number; width: number; height: number };
};

type Props = {
  screen: string;
  width: number;
  frame: number;
  taps: Tap[];
  style?: React.CSSProperties;
};

const SCREEN_WIDTH = 920;

/**
 * 実画面の上で指のタップを再現する端末。
 * 「記録している」ことを言葉ではなく操作で見せるための部品。
 */
export const TapPhone: React.FC<Props> = ({ screen, width, frame, taps, style }) => {
  const scale = width / SCREEN_WIDTH;
  const inset = Math.round(width * 0.024) + 3;
  const toScreen = (value: number) => inset + value * scale;

  return (
    <div style={{ position: "relative", ...style }}>
      <Phone screen={screen} width={width} />

      {taps.map((tap) => {
        const press = track(frame, tap.at, 7, { easing: EASE_OUT });
        const release = track(frame, tap.at + 7, 9, { easing: EASE_OUT });
        const ripple = track(frame, tap.at + 4, 26, { easing: EASE_OUT });
        const held = track(frame, tap.at + 2, 6);

        return (
          <React.Fragment key={`${tap.x}-${tap.y}`}>
            {tap.box ? (
              <div
                style={{
                  position: "absolute",
                  left: toScreen(tap.box.x),
                  top: toScreen(tap.box.y),
                  width: tap.box.width * scale,
                  height: tap.box.height * scale,
                  borderRadius: 14 * scale,
                  border: `${Math.max(3, 8 * scale)}px solid ${COLOR.goldHi}`,
                  boxShadow: `0 0 ${40 * scale}px rgba(249,201,124,0.7)`,
                  opacity: held,
                }}
              />
            ) : null}

            <div
              style={{
                position: "absolute",
                left: toScreen(tap.x),
                top: toScreen(tap.y),
                width: 260 * scale,
                height: 260 * scale,
                marginLeft: -130 * scale,
                marginTop: -130 * scale,
                borderRadius: "50%",
                border: `${Math.max(2, 6 * scale)}px solid rgba(249,201,124,0.9)`,
                opacity: ripple > 0 ? (1 - ripple) * 0.9 : 0,
                transform: `scale(${0.2 + ripple * 1.0})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: toScreen(tap.x),
                top: toScreen(tap.y),
                width: 116 * scale,
                height: 116 * scale,
                marginLeft: -58 * scale,
                marginTop: -58 * scale,
                borderRadius: "50%",
                background: "rgba(242,238,228,0.42)",
                border: `${Math.max(2, 5 * scale)}px solid rgba(242,238,228,0.9)`,
                opacity: press * (1 - release),
                transform: `scale(${0.7 + press * 0.3})`,
              }}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
};
