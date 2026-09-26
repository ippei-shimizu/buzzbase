import { Config } from "@remotion/cli/config";

// JPEG 中間だと出力が full-range(yuvj420p) で焼かれ、プレイヤーによって色が転ぶ
Config.setVideoImageFormat("png");
Config.setColorSpace("bt709");
Config.setCrf(18);
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");
