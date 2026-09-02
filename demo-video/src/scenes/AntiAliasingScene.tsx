import { AbsoluteFill, CanvasImage, Easing, Interactive, interpolate, staticFile, useCurrentFrame } from "remotion";

export const AntiAliasingScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", padding: "52px 70px" }}>
      <Interactive.Div name="AA label" style={{ color: "#f0abfc", fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>03 — A concrete quality choice</Interactive.Div>
      <Interactive.Div name="AA headline" style={{ marginTop: 10, fontSize: 52, fontWeight: 720, letterSpacing: -2 }}>Off, MSAA, SSAA, and FXAA—measured here.</Interactive.Div>
      <Interactive.Div name="AA crop" style={{ position: "absolute", left: 70, top: 176, width: 1140, height: 485, overflow: "hidden", borderRadius: 18, border: "1px solid #3f3f46", boxShadow: "0 28px 80px rgba(0,0,0,.6)", opacity: interpolate(frame, [8, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }) }}>
        <CanvasImage name="Anti-aliasing result" src={staticFile("anti-aliasing.png")} style={{ width: 1140, height: 2668, translate: "0px -810px" }} />
      </Interactive.Div>
    </AbsoluteFill>
  );
};
