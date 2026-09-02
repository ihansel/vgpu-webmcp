import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion";

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 70% 25%, #17243c 0%, #05070b 42%, #000 78%)", padding: "110px 96px", justifyContent: "center" }}>
      <Interactive.Div name="Eyebrow" style={{ color: "#7dd3fc", fontSize: 28, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", opacity: interpolate(frame, [0, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }) }}>vGPU × WebMCP</Interactive.Div>
      <Interactive.Div name="Opening title" style={{ marginTop: 24, maxWidth: 1000, fontSize: 92, lineHeight: 0.98, fontWeight: 750, letterSpacing: -5, opacity: interpolate(frame, [10, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }), translate: interpolate(frame, [10, 40], ["0px 30px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }) }}>A live GPU lab an agent can actually collaborate with.</Interactive.Div>
      <Interactive.Div name="Opening subtitle" style={{ marginTop: 32, color: "#a1a1aa", fontSize: 34, lineHeight: 1.3, maxWidth: 940, opacity: interpolate(frame, [34, 64], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }) }}>Inspect real controls. Run bounded browser benchmarks. Leave the decision visible.</Interactive.Div>
    </AbsoluteFill>
  );
};
