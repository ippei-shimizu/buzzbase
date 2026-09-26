import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Transitions } from "./components/Transitions";
import { GoldRain } from "./story/GoldRain";
import { PitchCount } from "./story/PitchCount";
import { Scorebook } from "./story/Scorebook";
import { ZoneHeat } from "./story/ZoneHeat";
import { SprayChart } from "./story/SprayChart";
import { TypeStack } from "./story/TypeStack";
import { GoldTurn } from "./story/GoldTurn";
import { ProofFlash } from "./story/ProofFlash";
import { BarRace } from "./story/BarRace";
import { Diptych } from "./story/Diptych";
import { Scoreboard } from "./story/Scoreboard";
import { StoryCta } from "./story/StoryCta";

type Cut = { from: number; duration: number; scene: React.ReactNode };

/**
 * 2本目。機能を順番に説明するのではなく、1打席を思い出せないという入りから
 * 記録する理由へ運ぶ。カットごとに地の色と構図を入れ替えるため、
 * 前後を溶かさずハードカットでつなぐ。
 */
const CUTS: Cut[] = [
  { from: 0, duration: 60, scene: <GoldRain /> },
  { from: 60, duration: 80, scene: <PitchCount /> },
  { from: 140, duration: 60, scene: <Scorebook /> },
  { from: 200, duration: 60, scene: <ZoneHeat /> },
  { from: 260, duration: 60, scene: <SprayChart /> },
  { from: 320, duration: 80, scene: <TypeStack /> },
  { from: 400, duration: 80, scene: <GoldTurn /> },
  { from: 480, duration: 80, scene: <ProofFlash /> },
  { from: 560, duration: 80, scene: <BarRace /> },
  { from: 640, duration: 80, scene: <Diptych /> },
  { from: 720, duration: 80, scene: <Scoreboard /> },
  { from: 800, duration: 160, scene: <StoryCta /> },
];

export const STORY_FRAMES = CUTS[CUTS.length - 1].from + CUTS[CUTS.length - 1].duration;

const MARKS = CUTS.slice(1).map((cut) => cut.from);

export const Story: React.FC = () => {
  const frame = useCurrentFrame();

  const kick = MARKS.reduce((strongest, mark) => {
    const distance = Math.abs(frame - mark);
    return Math.max(strongest, Math.max(0, 1 - distance / 7));
  }, 0);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0906" }}>
      <Audio src={staticFile("audio/story.m4a")} />

      <AbsoluteFill style={{ transform: `scale(${1 + kick * 0.022})` }}>
        {CUTS.map((cut) => (
          <Sequence key={cut.from} from={cut.from} durationInFrames={cut.duration}>
            {cut.scene}
          </Sequence>
        ))}
      </AbsoluteFill>

      <Transitions frame={frame} marks={MARKS} />
    </AbsoluteFill>
  );
};
