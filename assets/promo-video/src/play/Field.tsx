import React from "react";
import { COLOR, SCENE } from "../theme";
import { EASE_OUT, track } from "../anim";

const HOME = { x: 540, y: 1410 };
const RADIUS = 760;

const point = (angle: number, length: number) => ({
  x: HOME.x + Math.sin((angle * Math.PI) / 180) * length,
  y: HOME.y - Math.cos((angle * Math.PI) / 180) * length,
});

const LEFT_FOUL = point(-45, RADIUS);
const RIGHT_FOUL = point(45, RADIUS);
/** 左中間。アプリの球場図で言う「左中」の方向 */
const LANDING = point(-22, 700);

/**
 * 俯瞰の球場。アプリの打席記録画面にある球場図と同じ形にしてあるので、
 * そのまま端末の中へ縮めるとカットを割らずにアプリへ渡せる。
 */
export const Field: React.FC<{ frame: number; start: number }> = ({ frame, start }) => {
  const local = frame - start;
  const swing = track(local, 6, 12, { easing: EASE_OUT });
  const flight = track(local, 16, 34, { easing: EASE_OUT });
  const land = track(local, 48, 16, { easing: EASE_OUT });

  const ball = {
    x: HOME.x + (LANDING.x - HOME.x) * flight,
    y: HOME.y + (LANDING.y - HOME.y) * flight - Math.sin(flight * Math.PI) * 150,
  };

  return (
    <svg width="1080" height="1920" viewBox="0 0 1080 1920">
      <path
        d={`M ${HOME.x} ${HOME.y} L ${LEFT_FOUL.x} ${LEFT_FOUL.y} A ${RADIUS} ${RADIUS} 0 0 1 ${RIGHT_FOUL.x} ${RIGHT_FOUL.y} Z`}
        fill={SCENE.grass}
      />
      <path
        d={`M ${HOME.x} ${HOME.y} L ${HOME.x - 250} ${HOME.y - 250} L ${HOME.x} ${HOME.y - 500} L ${HOME.x + 250} ${HOME.y - 250} Z`}
        fill="#8A5A2B"
      />
      <path
        d={`M ${HOME.x} ${HOME.y - 40} L ${HOME.x - 190} ${HOME.y - 230} L ${HOME.x} ${HOME.y - 420} L ${HOME.x + 190} ${HOME.y - 230} Z`}
        fill={SCENE.grass}
      />
      {[
        { x: HOME.x, y: HOME.y - 20 },
        { x: HOME.x - 250, y: HOME.y - 250 },
        { x: HOME.x, y: HOME.y - 500 },
        { x: HOME.x + 250, y: HOME.y - 250 },
      ].map((base) => (
        <rect
          key={`${base.x}-${base.y}`}
          x={base.x - 17}
          y={base.y - 17}
          width={34}
          height={34}
          fill="#F2EEE4"
          transform={`rotate(45 ${base.x} ${base.y})`}
        />
      ))}
      <path
        d={`M ${HOME.x} ${HOME.y} L ${LEFT_FOUL.x} ${LEFT_FOUL.y}`}
        stroke="rgba(242,238,228,0.75)"
        strokeWidth={6}
      />
      <path
        d={`M ${HOME.x} ${HOME.y} L ${RIGHT_FOUL.x} ${RIGHT_FOUL.y}`}
        stroke="rgba(242,238,228,0.75)"
        strokeWidth={6}
      />

      {/* 打者とスイングの弧 */}
      <circle cx={HOME.x - 62} cy={HOME.y + 26} r={26} fill="#F2EEE4" />
      <path
        d={`M ${HOME.x - 62} ${HOME.y + 26} m -110 60 a 126 126 0 0 1 ${230 * swing} ${-120 * swing}`}
        fill="none"
        stroke={COLOR.goldHi}
        strokeWidth={18}
        strokeLinecap="round"
        opacity={swing * (1 - flight * 0.55)}
      />

      <path
        d={`M ${HOME.x} ${HOME.y} Q ${(HOME.x + LANDING.x) / 2 - 40} ${(HOME.y + LANDING.y) / 2 - 190} ${ball.x} ${ball.y}`}
        fill="none"
        stroke={COLOR.goldHi}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray="4 26"
        opacity={flight > 0 ? 0.9 : 0}
      />
      <circle cx={ball.x} cy={ball.y} r={20} fill="#FFFDF6" opacity={flight > 0 ? 1 : 0} />
      <circle
        cx={LANDING.x}
        cy={LANDING.y}
        r={30 + land * 90}
        fill="none"
        stroke={COLOR.goldHi}
        strokeWidth={8}
        opacity={(1 - land) * 0.9}
      />
    </svg>
  );
};
