import React from "react";
import { Composition } from "remotion";
import { Reel, TOTAL_FRAMES } from "./Reel";
import { Story, STORY_FRAMES } from "./Story";
import { Journey, JOURNEY_FRAMES } from "./Journey";
import { VIDEO } from "./theme";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="BuzzBaseReel"
      component={Reel}
      durationInFrames={TOTAL_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Composition
      id="BuzzBaseJourney"
      component={Journey}
      durationInFrames={JOURNEY_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Composition
      id="BuzzBaseStory"
      component={Story}
      durationInFrames={STORY_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  </>
);
