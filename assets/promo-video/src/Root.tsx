import React from "react";
import { Composition } from "remotion";
import { Reel, TOTAL_FRAMES } from "./Reel";
import { Story, STORY_FRAMES } from "./Story";
import { Journey, JOURNEY_FRAMES } from "./Journey";
import { Runway, RUNWAY_FRAMES } from "./Runway";
import { Pop, POP_FRAMES } from "./Pop";
import { Play, PLAY_FRAMES } from "./Play";
import { VIDEO } from "./theme";

const COMPOSITIONS = [
  { id: "BuzzBaseReel", component: Reel, durationInFrames: TOTAL_FRAMES },
  { id: "BuzzBaseStory", component: Story, durationInFrames: STORY_FRAMES },
  { id: "BuzzBaseJourney", component: Journey, durationInFrames: JOURNEY_FRAMES },
  { id: "BuzzBaseRunway", component: Runway, durationInFrames: RUNWAY_FRAMES },
  { id: "BuzzBasePop", component: Pop, durationInFrames: POP_FRAMES },
  { id: "BuzzBasePlay", component: Play, durationInFrames: PLAY_FRAMES },
];

export const RemotionRoot: React.FC = () => (
  <>
    {COMPOSITIONS.map((composition) => (
      <Composition
        key={composition.id}
        id={composition.id}
        component={composition.component}
        durationInFrames={composition.durationInFrames}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    ))}
  </>
);
