import { Audio } from "@remotion/media";
import { AbsoluteFill, Composition, Sequence, staticFile } from "remotion";
import { ArchitectureScene } from "./scenes/ArchitectureScene";
import { AntiAliasingScene } from "./scenes/AntiAliasingScene";
import { BenchmarkScene } from "./scenes/BenchmarkScene";
import { OceanScene } from "./scenes/OceanScene";
import { TitleScene } from "./scenes/TitleScene";

export const AgentLabVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", color: "#ededed", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <Audio src={staticFile("narration.mp3")} volume={1} />
      <Sequence durationInFrames={240} name="Opening"><TitleScene /></Sequence>
      <Sequence from={240} durationInFrames={810} name="Live ocean controls"><OceanScene /></Sequence>
      <Sequence from={1050} durationInFrames={690} name="Bounded benchmark"><BenchmarkScene /></Sequence>
      <Sequence from={1740} durationInFrames={720} name="Anti-aliasing comparison"><AntiAliasingScene /></Sequence>
      <Sequence from={2460} durationInFrames={600} name="Architecture and safety"><ArchitectureScene /></Sequence>
    </AbsoluteFill>
  );
};

export const MyComposition = () => (
  <Composition id="WebMCPAgentLab" component={AgentLabVideo} durationInFrames={3060} fps={30} width={1280} height={720} />
);
