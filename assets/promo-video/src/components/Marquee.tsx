import React from "react";

type Props = {
  text: string;
  frame: number;
  size: number;
  /** 1フレームあたりに進む割合（1周 = 2 コピー分の半分） */
  speed: number;
  color: string;
  opacity: number;
  outline?: number;
  reverse?: boolean;
  weight?: number;
  fontFamily: string;
};

/**
 * 同じ文字列を2つ並べて半分だけ動かし、継ぎ目なくループさせる横スクロール。
 * 幅を測らずに済むので、文字数やフォントが変わっても破綻しない。
 */
export const Marquee: React.FC<Props> = ({
  text,
  frame,
  size,
  speed,
  color,
  opacity,
  outline,
  reverse,
  weight = 900,
  fontFamily,
}) => {
  const loop = ((frame * speed) % 1 + 1) % 1;
  const shift = reverse ? -50 + loop * 50 : -loop * 50;

  const span = (key: string) => (
    <span
      key={key}
      style={{
        fontFamily,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1,
        whiteSpace: "pre",
        color: outline ? "transparent" : color,
        WebkitTextStroke: outline ? `${outline}px ${color}` : undefined,
        letterSpacing: "0.02em",
      }}
    >
      {text}
    </span>
  );

  return (
    <div style={{ overflow: "hidden", width: "100%", opacity }}>
      <div
        style={{
          display: "flex",
          width: "max-content",
          transform: `translateX(${shift}%)`,
        }}
      >
        {span("a")}
        {span("b")}
      </div>
    </div>
  );
};
