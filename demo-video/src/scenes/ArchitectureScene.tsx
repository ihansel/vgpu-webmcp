import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion";

export const ArchitectureScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 100%, #10233c 0%, #05070b 52%, #000 100%)", padding: "78px 86px" }}>
      <Interactive.Div name="Architecture title" style={{ textAlign: "center", fontSize: 62, lineHeight: 1.05, fontWeight: 740, letterSpacing: -3 }}>Two MCPs. Two different moments.</Interactive.Div>
      <div style={{ display: "flex", gap: 28, marginTop: 52 }}>
        <Interactive.Div name="Conventional MCP card" style={{ flex: 1, borderRadius: 20, border: "1px solid #3f3f46", backgroundColor: "rgba(24,24,27,.8)", padding: 32, opacity: interpolate(frame, [14, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }), translate: interpolate(frame, [14, 42], ["-24px 0px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }) }}>
          <div style={{ color: "#a1a1aa", fontSize: 22, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Conventional MCP</div>
          <div style={{ marginTop: 18, fontSize: 38, lineHeight: 1.15, fontWeight: 700 }}>Knows vGPU.</div>
          <div style={{ marginTop: 20, color: "#d4d4d8", fontSize: 25, lineHeight: 1.45 }}>Searches docs and verified examples. It is intentionally separate from the active browser tab.</div>
        </Interactive.Div>
        <Interactive.Div name="WebMCP card" style={{ flex: 1, borderRadius: 20, border: "1px solid #38bdf8", backgroundColor: "rgba(8,47,73,.72)", padding: 32, opacity: interpolate(frame, [30, 58], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }), translate: interpolate(frame, [30, 58], ["24px 0px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }) }}>
          <div style={{ color: "#7dd3fc", fontSize: 22, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>WebMCP Agent Lab</div>
          <div style={{ marginTop: 18, fontSize: 38, lineHeight: 1.15, fontWeight: 700 }}>Collaborates live.</div>
          <div style={{ marginTop: 20, color: "#e0f2fe", fontSize: 25, lineHeight: 1.45 }}>Uses current state, visible controls, short local evidence, and a reversible human handoff.</div>
        </Interactive.Div>
      </div>
      <Interactive.Div name="Safety footer" style={{ marginTop: 34, textAlign: "center", color: "#a1a1aa", fontSize: 23, opacity: interpolate(frame, [66, 94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }) }}>Same origin · typed messages · validated ranges · bounded work · no arbitrary code or pixels</Interactive.Div>
    </AbsoluteFill>
  );
};
