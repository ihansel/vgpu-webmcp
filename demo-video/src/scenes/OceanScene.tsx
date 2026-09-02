import { AbsoluteFill, CanvasImage, Easing, Interactive, interpolate, staticFile, useCurrentFrame } from "remotion";

export const OceanScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", padding: "60px 70px" }}>
      <Interactive.Div name="Ocean label" style={{ color: "#7dd3fc", fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>01 — One live state path</Interactive.Div>
      <Interactive.Div name="Ocean headline" style={{ marginTop: 12, fontSize: 54, fontWeight: 720, letterSpacing: -2 }}>The agent changes the renderer you can see.</Interactive.Div>
      <Interactive.Div name="Ocean browser frame" style={{ position: "absolute", left: 70, top: 190, width: 1140, height: 470, overflow: "hidden", borderRadius: 18, border: "1px solid #3f3f46", boxShadow: "0 28px 80px rgba(0,0,0,.55)", opacity: interpolate(frame, [10, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }), scale: interpolate(frame, [10, 38], [0.97, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({ damping: 200 }), output: "perceptual-scale" }) }}>
        <CanvasImage name="Live ocean page" src={staticFile("ocean.png")} style={{ width: 1140, height: 2690, objectFit: "cover", objectPosition: "top" }} />
      </Interactive.Div>
    </AbsoluteFill>
  );
};
