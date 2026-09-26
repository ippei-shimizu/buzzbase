import { Easing, interpolate } from "remotion";

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
export const EASE_SOFT = Easing.bezier(0.33, 0, 0.15, 1);

type TrackOptions = {
  easing?: (input: number) => number;
  from?: number;
  to?: number;
};

/**
 * frame を [start, start + duration] の区間で [from, to] に写す。区間外はクランプする。
 */
export const track = (
  frame: number,
  start: number,
  duration: number,
  options: TrackOptions = {},
) => {
  const { easing = EASE_OUT, from = 0, to = 1 } = options;
  return interpolate(frame, [start, start + duration], [from, to], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

/** 入りと抜きをまとめた 0→1→0 のエンベロープ */
export const envelope = (
  frame: number,
  inStart: number,
  inDuration: number,
  outStart: number,
  outDuration: number,
) =>
  track(frame, inStart, inDuration) *
  (1 - track(frame, outStart, outDuration, { easing: EASE_IN_OUT }));

export const wave = (frame: number, period: number, amplitude: number, phase = 0) =>
  Math.sin(((frame / period) * Math.PI * 2) + phase) * amplitude;
