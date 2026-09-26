import { loadFont } from "@remotion/google-fonts/Archivo";

const archivo = loadFont("normal", {
  weights: ["500", "700", "900"],
  subsets: ["latin"],
});

/** 英数字・数値表示用（可変幅グロテスク） */
export const DISPLAY = `${archivo.fontFamily}, "Helvetica Neue", sans-serif`;
/** 和文用。レンダラは macOS 上で走るため Hiragino を第一候補にする */
export const JP = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';

export const COLOR = {
  ink: "#0B0906",
  ground: "#16110A",
  dirt: "#3B2915",
  gold: "#E08E0A",
  goldHi: "#F9C97C",
  goldDeep: "#9C6205",
  chalk: "#F2EEE4",
  white: "#F4F4F4",
  mute: "#9C9081",
  seam: "#C9382B",
  up: "#17C964",
};

/** 2本目で場面ごとに地の色を変えるためのパレット。ゴールドだけ共通で通す */
export const SCENE = {
  cream: "#F2EEE4",
  creamInk: "#17120A",
  field: "#14301C",
  grass: "#2C5C36",
  board: "#080C11",
  bulb: "#FFB020",
  night: "#0B0906",
};

export const VIDEO = { width: 1080, height: 1920, fps: 30 };

/** 端末モックの画面アスペクト（切り出した実画面 920x2002 に一致させる） */
export const SCREEN_RATIO = 920 / 2002;
