import React from "react";
import { COLOR, DISPLAY, JP } from "../theme";
import {
  CARDS,
  LINE,
  MONTHS,
  POINTS,
  WORLD,
  formatAverage,
  xFor,
  yFor,
  type Card,
} from "./season";

/** Journey 側のカメラ先読み量と合わせる。寄りのカードを画面中央に置くために要る */
export const CAMERA_LEAD = 40;

const COOL = "#4C9AFF";
const GRID = "rgba(140,170,200,0.10)";

const HEAT = [
  [0.188, 0.214, 0.265, 0.231, 0.175],
  [0.205, 0.289, 0.348, 0.302, 0.198],
  [0.242, 0.361, 0.455, 0.338, 0.221],
  [0.219, 0.318, 0.372, 0.284, 0.192],
  [0.151, 0.198, 0.236, 0.207, 0.120],
];

const RANK = [
  { rank: 1, name: "あなた", value: ".318", me: true },
  { rank: 2, name: "田中", value: ".301" },
  { rank: 3, name: "佐藤", value: ".287" },
];

const linePath = POINTS.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
const areaPath = `${linePath} L ${LINE.x1} ${LINE.yBottom + 260} L ${LINE.x0} ${LINE.yBottom + 260} Z`;

const NoteCard: React.FC<{ card: Extract<Card, { kind: "note" }>; progress: number }> = ({
  card,
  progress,
}) => {
  const x = xFor(card.ratio);
  const y = yFor(POINTS[Math.round(card.ratio * (POINTS.length - 1))].average);
  const accent = card.tone === "cool" ? COOL : COLOR.gold;
  const big = card.tone === "big";

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: card.above ? y - (big ? 330 : 250) : y + 120,
        transform: `translateX(-50%) translateY(${(1 - progress) * (card.above ? 30 : -30)}px)`,
        opacity: progress,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          padding: big ? "26px 44px" : "20px 34px",
          borderRadius: 16,
          border: `3px solid ${accent}`,
          background: card.tone === "big" ? accent : "rgba(10,14,20,0.86)",
          display: "flex",
          alignItems: "baseline",
          gap: 20,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: "0.18em",
            color: big ? "rgba(20,13,1,0.7)" : accent,
          }}
        >
          {card.label}
        </span>
        <span
          style={{
            fontFamily: JP,
            fontWeight: 900,
            fontSize: big ? 62 : 44,
            color: big ? "#140D01" : COLOR.chalk,
          }}
        >
          {card.value}
        </span>
      </div>
      <span style={{ width: 3, height: card.above ? 92 : 62, background: accent, opacity: 0.6 }} />
    </div>
  );
};

const HeatCard: React.FC<{ card: Extract<Card, { kind: "heat" }>; progress: number }> = ({
  card,
  progress,
}) => {
  const x = xFor(card.anchor) + CAMERA_LEAD;
  const y = yFor(POINTS[Math.round(card.anchor * (POINTS.length - 1))].average);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - 500,
        opacity: progress,
        transform: `translateX(-50%) scale(${0.88 + progress * 0.12})`,
        padding: 26,
        borderRadius: 18,
        border: "3px solid rgba(140,170,200,0.28)",
        background: "rgba(8,12,18,0.92)",
      }}
    >
      <div
        style={{
          fontFamily: JP,
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: "0.16em",
          color: "rgba(242,238,228,0.62)",
          marginBottom: 16,
        }}
      >
        コース別打率
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 58px)", gridAutoRows: 58, gap: 5 }}>
        {HEAT.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => {
            const heat = (value - 0.12) / (0.455 - 0.12);
            const weak = value === 0.12;
            return (
              <div
                key={`${rowIndex}-${columnIndex}`}
                style={{
                  borderRadius: 6,
                  background: `hsl(${215 - heat * 210} 74% ${38 + heat * 8}%)`,
                  border: weak ? `3px solid ${COLOR.chalk}` : "none",
                }}
              />
            );
          }),
        )}
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: JP,
          fontWeight: 900,
          fontSize: 34,
          color: COLOR.chalk,
          whiteSpace: "nowrap",
        }}
      >
        外角低めが <span style={{ color: COOL }}>.120</span>
      </div>
    </div>
  );
};

const RankCard: React.FC<{ card: Extract<Card, { kind: "rank" }>; progress: number }> = ({
  card,
  progress,
}) => {
  const x = xFor(card.anchor) + CAMERA_LEAD;
  const y = yFor(POINTS[Math.round(card.anchor * (POINTS.length - 1))].average);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + 240,
        opacity: progress,
        transform: `translateX(-50%) scale(${0.88 + progress * 0.12})`,
        padding: "26px 32px",
        borderRadius: 18,
        border: `3px solid ${COLOR.gold}`,
        background: "rgba(8,12,18,0.92)",
        minWidth: 420,
      }}
    >
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: "0.32em",
          color: "rgba(224,142,10,0.8)",
          marginBottom: 18,
        }}
      >
        TEAM RANKING
      </div>
      {RANK.map((row) => (
        <div
          key={row.name}
          style={{
            display: "grid",
            gridTemplateColumns: "48px 1fr auto",
            alignItems: "center",
            gap: 18,
            padding: "10px 0",
          }}
        >
          <span
            style={{
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: 36,
              color: row.me ? COLOR.goldHi : "rgba(242,238,228,0.4)",
            }}
          >
            {row.rank}
          </span>
          <span
            style={{
              fontFamily: JP,
              fontWeight: 700,
              fontSize: 32,
              color: row.me ? COLOR.chalk : "rgba(242,238,228,0.52)",
            }}
          >
            {row.name}
          </span>
          <span
            style={{
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: 36,
              fontVariantNumeric: "tabular-nums",
              color: row.me ? COLOR.goldHi : "rgba(242,238,228,0.52)",
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * シーズン全体を1枚の座標系に描いたもの。カットを割らず、ここをカメラが移動する。
 * @param progress 0..1。折れ線をどこまで描き終えたか
 */
export const World: React.FC<{ progress: number }> = ({ progress }) => {
  const drawnX = xFor(progress);

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: WORLD.width, height: WORLD.height }}>
      <svg
        width={WORLD.width}
        height={WORLD.height}
        viewBox={`0 0 ${WORLD.width} ${WORLD.height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="seasonStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={COOL} />
            <stop offset="38%" stopColor={COOL} />
            <stop offset="56%" stopColor={COLOR.gold} />
            <stop offset="100%" stopColor={COLOR.goldHi} />
          </linearGradient>
          <linearGradient id="seasonArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(224,142,10,0.20)" />
            <stop offset="100%" stopColor="rgba(224,142,10,0)" />
          </linearGradient>
          <clipPath id="reveal">
            <rect x="0" y="0" width={drawnX} height={WORLD.height} />
          </clipPath>
        </defs>

        {Array.from({ length: 34 }).map((_, index) => (
          <line
            key={index}
            x1={index * 200}
            y1={LINE.yTop - 260}
            x2={index * 200}
            y2={LINE.yBottom + 260}
            stroke={GRID}
            strokeWidth={2}
          />
        ))}
        <line
          x1={0}
          y1={LINE.yBottom}
          x2={WORLD.width}
          y2={LINE.yBottom}
          stroke="rgba(140,170,200,0.26)"
          strokeWidth={3}
        />
        <line
          x1={0}
          y1={yFor(0.3)}
          x2={WORLD.width}
          y2={yFor(0.3)}
          stroke="rgba(242,238,228,0.34)"
          strokeWidth={3}
          strokeDasharray="18 22"
        />

        <g clipPath="url(#reveal)">
          <path d={areaPath} fill="url(#seasonArea)" />
          {POINTS.map((point) => (
            <line
              key={point.x}
              x1={point.x}
              y1={point.y}
              x2={point.x}
              y2={LINE.yBottom}
              stroke="rgba(224,142,10,0.09)"
              strokeWidth={4}
            />
          ))}
          <path
            d={linePath}
            fill="none"
            stroke="url(#seasonStroke)"
            strokeWidth={11}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>

        <circle
          cx={drawnX}
          cy={yFor(POINTS[Math.min(POINTS.length - 1, Math.round(progress * (POINTS.length - 1)))].average)}
          r={18}
          fill={COLOR.goldHi}
          opacity={progress > 0.01 && progress < 0.995 ? 1 : 0}
        />
      </svg>

      <div
        style={{
          position: "absolute",
          left: 24,
          top: yFor(0.3) - 62,
          fontFamily: JP,
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: "0.2em",
          color: "rgba(242,238,228,0.5)",
        }}
      >
        3割ライン
      </div>

      {MONTHS.map((month) => (
        <div
          key={month.label}
          style={{
            position: "absolute",
            left: xFor(month.ratio),
            top: LINE.yBottom + 40,
            fontFamily: JP,
            fontWeight: 900,
            fontSize: 72,
            color: progress >= month.ratio ? "rgba(242,238,228,0.42)" : "rgba(242,238,228,0.12)",
          }}
        >
          {month.label}
        </div>
      ))}

      {CARDS.map((card) => {
        const appear = Math.max(0, Math.min(1, (progress - card.ratio) / 0.035));
        if (appear <= 0) {
          return null;
        }
        if (card.kind === "heat") {
          return <HeatCard key="heat" card={card} progress={appear} />;
        }
        if (card.kind === "rank") {
          return <RankCard key="rank" card={card} progress={appear} />;
        }
        return <NoteCard key={`${card.label}-${card.value}`} card={card} progress={appear} />;
      })}

      <div
        style={{
          position: "absolute",
          left: LINE.x1 - 260,
          top: LINE.yTop - 210,
          fontFamily: DISPLAY,
          fontWeight: 900,
          fontSize: 96,
          color: progress > 0.96 ? COLOR.goldHi : "rgba(242,238,228,0.16)",
          letterSpacing: "0.04em",
        }}
      >
        {formatAverage(POINTS[POINTS.length - 1].average)}
      </div>
    </div>
  );
};
