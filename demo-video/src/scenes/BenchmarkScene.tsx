import { AbsoluteFill, CanvasImage, Easing, Interactive, interpolate, staticFile, useCurrentFrame } from "remotion";

export const BenchmarkScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg, #020617 0%, #050505 50%, #07131e 100%)", padding: "52px 70px" }}>
      <Interactive.Div name="Benchmark label" style={{ color: "#86efac", fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>02 — Bounded evidence</Interactive.Div>
      <Interactive.Div name="Benchmark headline" style={{ marginTop: 10, fontSize: 52, fontWeight: 720, letterSpacing: -2 }}>Test profiles. Restore state. Apply only the winner.</Interactive.Div>
      <Interactive.Div name="Benchmark crop" style={{ position: "absolute", left: 70, top: 176, width: 1140, height: 485, overflow: "hidden", borderRadius: 18, border: "1px solid #3f3f46", boxShadow: "0 28px 80px rgba(0,0,0,.6)", opacity: interpolate(frame, [8, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }) }}>
        <CanvasImage name="Ocean benchmark table" src={staticFile("ocean.png")} style={{ width: 1140, height: 2690, translate: "0px -810px" }} />
      </Interactive.Div>
      <Interactive.Div name="Metrics note" style={{ position: "absolute", right: 92, bottom: 78, padding: "14px 20px", borderRadius: 999, backgroundColor: "#f4f4f5", color: "#09090b", fontSize: 24, fontWeight: 700, opacity: interpolate(frame, [50, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }) }}>median · p95 · FPS · slow frames</Interactive.Div>
    </AbsoluteFill>
  );
};
