/** 3本目が舞台にする「1シーズン分のデータ」。カメラはこの座標系の中だけを動く */

export const WORLD = { width: 6800, height: 1920 };
export const LINE = {
  x0: 560,
  x1: 6240,
  yTop: 620,
  yBottom: 1340,
  min: 0.15,
  max: 0.36,
};

/** 4月の .188 から9月の .342 まで。6月に落として7月から戻す */
const KEYS = [
  0.188, 0.205, 0.238, 0.265, 0.252, 0.231, 0.218, 0.226, 0.248, 0.271, 0.291,
  0.302, 0.318, 0.331, 0.342,
];
const SAMPLES = 60;

export const yFor = (average: number) =>
  LINE.yBottom - ((average - LINE.min) / (LINE.max - LINE.min)) * (LINE.yBottom - LINE.yTop);

export const xFor = (ratio: number) => LINE.x0 + ratio * (LINE.x1 - LINE.x0);

export type Point = { x: number; y: number; average: number; ratio: number };

export const POINTS: Point[] = Array.from({ length: SAMPLES + 1 }, (_, index) => {
  const ratio = index / SAMPLES;
  const position = ratio * (KEYS.length - 1);
  const low = Math.floor(position);
  const high = Math.min(KEYS.length - 1, low + 1);
  const blend = position - low;
  // 実データではないが、折れ線が定規のように見えないよう決め打ちの揺らぎを足す
  const jitter = Math.sin(index * 2.7) * 0.0045;
  const average = KEYS[low] * (1 - blend) + KEYS[high] * blend + (index === SAMPLES ? 0 : jitter);
  return { x: xFor(ratio), y: yFor(average), average, ratio };
});

export const averageAt = (ratio: number) => {
  const clamped = Math.max(0, Math.min(1, ratio));
  const position = clamped * SAMPLES;
  const low = Math.floor(position);
  const high = Math.min(SAMPLES, low + 1);
  const blend = position - low;
  return POINTS[low].average * (1 - blend) + POINTS[high].average * blend;
};

export const MONTHS = [
  { label: "4月", ratio: 0.02 },
  { label: "5月", ratio: 0.19 },
  { label: "6月", ratio: 0.36 },
  { label: "7月", ratio: 0.53 },
  { label: "8月", ratio: 0.7 },
  { label: "9月", ratio: 0.88 },
];

export const monthAt = (ratio: number) =>
  MONTHS.reduce((current, month) => (ratio >= month.ratio ? month.label : current), MONTHS[0].label);

export type Card =
  | { kind: "note"; ratio: number; tone: "gold" | "cool" | "big"; label: string; value: string; above: boolean }
  /** anchor はカメラが寄って止まる位置。カードはそこで画面中央に来るように置く */
  | { kind: "heat"; ratio: number; anchor: number }
  | { kind: "rank"; ratio: number; anchor: number };

export const CARDS: Card[] = [
  { kind: "note", ratio: 0.13, tone: "gold", label: "5/12", value: "初ホームラン", above: true },
  { kind: "note", ratio: 0.24, tone: "cool", label: "6月", value: "打率 .218", above: false },
  { kind: "heat", ratio: 0.34, anchor: 0.38 },
  { kind: "note", ratio: 0.52, tone: "gold", label: "7月", value: "打率 .291", above: true },
  { kind: "rank", ratio: 0.68, anchor: 0.72 },
  { kind: "note", ratio: 0.79, tone: "big", label: "8/3", value: "3割に乗せた", above: true },
  { kind: "note", ratio: 0.94, tone: "big", label: "9月", value: "打率 .342", above: false },
];

/** 打率 .342 の表記。先頭の 0 は落とす */
export const formatAverage = (value: number) => value.toFixed(3).replace(/^0/, "");
