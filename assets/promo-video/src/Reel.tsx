import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Backdrop } from "./components/Backdrop";
import { Hud } from "./components/Hud";
import { Transitions } from "./components/Transitions";
import { FeatureScene, type Chip } from "./scenes/FeatureScene";
import { Hook } from "./scenes/Hook";
import { Thesis } from "./scenes/Thesis";
import { LogoScene } from "./scenes/LogoScene";
import { DuoScene } from "./scenes/DuoScene";
import { Cta } from "./scenes/Cta";
import { track } from "./anim";

type Beat = { from: number; duration: number };

type Feature = Beat & {
  screen: string;
  eyebrow: string;
  lines: string[];
  sub: string;
  tilt: number;
  chips?: Chip[];
};

/**
 * 次のシーンをこのフレーム数だけ前倒しで始める。
 * 前のシーンの抜きと重ならないと、切り替わりで一瞬なにも映らないフレームができる。
 */
const OVERLAP = 14;

const HOOK: Beat = { from: 0, duration: 45 };
const THESIS: Beat = { from: 45, duration: 95 };
const LOGO: Beat = { from: 140, duration: 75 };
const DUO: Beat = { from: 995, duration: 114 };
const CTA: Beat = { from: 1109, duration: 150 };

export const TOTAL_FRAMES = CTA.from + CTA.duration;

const FEATURES: Feature[] = [
  {
    from: 215,
    duration: 120,
    screen: "dashboard",
    eyebrow: "AUTO CALC",
    lines: ["打率も OPS も", "防御率も、自動で。"],
    sub: "試合結果を入れるだけ。46項目を自動計算。",
    tilt: -9,
    chips: [
      { label: "打率", value: ".287" },
      { label: "本塁打", value: "19" },
    ],
  },
  {
    from: 335,
    duration: 108,
    screen: "plate-input",
    eyebrow: "RECORD",
    lines: ["打球方向も結果も", "タップで選ぶだけ"],
    sub: "左中間も右翼線も、13方向に分けて残せる。",
    tilt: 9,
  },
  {
    from: 443,
    duration: 108,
    screen: "plate-detail",
    eyebrow: "DETAIL",
    lines: ["1打席を、", "ここまで残せる"],
    sub: "カウント・ランナー・イニングまで1打席ずつ。",
    tilt: -9,
  },
  {
    from: 551,
    duration: 114,
    screen: "course",
    eyebrow: "PRO ANALYSIS",
    lines: ["コースごとの", "打率までわかる"],
    sub: "ボール球も含めた25コースを自動集計。",
    tilt: 9,
  },
  {
    from: 665,
    duration: 108,
    screen: "direction",
    eyebrow: "SPRAY CHART",
    lines: ["打った方向ごとの", "打率が見える"],
    sub: "引っ張りと逆方向、どちらで結果が出ているか。",
    tilt: -9,
  },
  {
    from: 773,
    duration: 108,
    screen: "pitcher",
    eyebrow: "MATCHUP",
    lines: ["同じ投手との", "通算成績が残る"],
    sub: "次に対戦する前に、どう攻められたか思い出せる。",
    tilt: 9,
  },
  {
    from: 881,
    duration: 114,
    screen: "ranking",
    eyebrow: "RANKING",
    lines: ["チームの仲間と", "成績で競える"],
    sub: "グループを作れば、部内の順位がひと目でわかる。",
    tilt: -9,
  },
];

const MARKS = [
  THESIS.from,
  LOGO.from,
  ...FEATURES.map((feature) => feature.from),
  DUO.from,
  CTA.from,
];

/** 冒頭以外は OVERLAP だけ前倒しし、その分だけシーンの尺も伸ばす */
const staged = ({ from, duration }: Beat) =>
  from === 0
    ? { from, span: duration }
    : { from: from - OVERLAP, span: duration + OVERLAP };

export const Reel: React.FC = () => {
  const frame = useCurrentFrame();

  const kick = MARKS.reduce((strongest, mark) => {
    const distance = Math.abs(frame - mark);
    return Math.max(strongest, Math.max(0, 1 - distance / 8));
  }, 0);

  const hook = staged(HOOK);
  const thesis = staged(THESIS);
  const logo = staged(LOGO);
  const duo = staged(DUO);
  const cta = staged(CTA);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0906" }}>
      <Audio src={staticFile("audio/reel.m4a")} />
      <Backdrop />

      <AbsoluteFill style={{ transform: `scale(${1 + kick * 0.018})` }}>
        <Sequence from={hook.from} durationInFrames={hook.span}>
          <Hook duration={hook.span} />
        </Sequence>

        <Sequence from={thesis.from} durationInFrames={thesis.span}>
          <Thesis duration={thesis.span} />
        </Sequence>

        <Sequence from={logo.from} durationInFrames={logo.span}>
          <LogoScene duration={logo.span} />
        </Sequence>

        {FEATURES.map((feature) => {
          const beat = staged(feature);
          return (
            <Sequence key={feature.screen} from={beat.from} durationInFrames={beat.span}>
              <FeatureScene {...feature} duration={beat.span} />
            </Sequence>
          );
        })}

        <Sequence from={duo.from} durationInFrames={duo.span}>
          <DuoScene duration={duo.span} />
        </Sequence>

        <Sequence from={cta.from} durationInFrames={cta.span}>
          <Cta />
        </Sequence>
      </AbsoluteFill>

      <Hud
        opacity={track(frame, THESIS.from + 4, 14) * (1 - track(frame, CTA.from - 14, 14))}
        progress={frame / TOTAL_FRAMES}
      />
      <Transitions frame={frame} marks={MARKS} />
    </AbsoluteFill>
  );
};
