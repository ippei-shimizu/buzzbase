import React from "react";
import { COLOR } from "../theme";

/** 縫い目付きの硬式球。S1 でカメラに向かって飛んでくる */
export const Ball: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 200 200">
    <defs>
      <radialGradient id="ballBody" cx="34%" cy="28%" r="78%">
        <stop offset="0%" stopColor="#FFFDF6" />
        <stop offset="52%" stopColor="#E6DFCE" />
        <stop offset="86%" stopColor="#A79C89" />
        <stop offset="100%" stopColor="#6D6454" />
      </radialGradient>
      <radialGradient id="ballGlow" cx="50%" cy="50%" r="50%">
        <stop offset="62%" stopColor="rgba(224,142,10,0)" />
        <stop offset="100%" stopColor="rgba(224,142,10,0.55)" />
      </radialGradient>
    </defs>
    <circle cx="100" cy="100" r="99" fill="url(#ballGlow)" />
    <circle cx="100" cy="100" r="94" fill="url(#ballBody)" />
    <path
      d="M40 24 C 76 66, 76 134, 40 176"
      fill="none"
      stroke={COLOR.seam}
      strokeWidth="6"
      strokeLinecap="round"
      strokeDasharray="3 15"
    />
    <path
      d="M160 24 C 124 66, 124 134, 160 176"
      fill="none"
      stroke={COLOR.seam}
      strokeWidth="6"
      strokeLinecap="round"
      strokeDasharray="3 15"
    />
  </svg>
);
