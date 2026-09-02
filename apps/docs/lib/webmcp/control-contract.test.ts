import { describe, expect, test } from "vitest";
import {
  ControlContractError,
  frameStatistics,
  profileById,
  validateChanges,
  type ExampleControlCapabilities,
} from "./control-contract";

const capabilities = {
  protocolVersion: 1,
  slug: "test",
  title: "Test",
  actions: ["inspect", "set", "reset", "benchmark"],
  parameters: {
    quality: {
      type: "enum",
      label: "Quality",
      description: "Quality mode",
      default: "balanced",
      values: ["fast", "balanced"],
    },
    scale: {
      type: "number",
      label: "Scale",
      description: "Render scale",
      default: 0.75,
      min: 0.5,
      max: 1,
      step: 0.05,
    },
    animate: {
      type: "boolean",
      label: "Animate",
      description: "Animation toggle",
      default: true,
    },
  },
  profiles: [{ id: "fast", label: "Fast", description: "Fast", settings: { scale: 0.5 } }],
  benchmark: { minDurationMs: 500, maxDurationMs: 3000, defaultDurationMs: 1000, warmupMs: 250, maxProfiles: 2 },
} as const satisfies ExampleControlCapabilities;

describe("WebMCP control contract", () => {
  test("accepts a typed batch and rejects unknown, out-of-range, and wrong-type values", () => {
    expect(validateChanges(capabilities, { quality: "fast", scale: 0.6, animate: false })).toEqual({
      quality: "fast",
      scale: 0.6,
      animate: false,
    });
    expectCode(() => validateChanges(capabilities, { hiddenGpuName: "x" }), "UNKNOWN_PARAMETER");
    expectCode(() => validateChanges(capabilities, { scale: 1.01 }), "INVALID_PARAMETER");
    expectCode(() => validateChanges(capabilities, { quality: "ultra" }), "INVALID_PARAMETER");
    expectCode(() => validateChanges(capabilities, { animate: "yes" }), "INVALID_PARAMETER");
  });

  test("resolves only declared profiles", () => {
    expect(profileById(capabilities, "fast").settings).toEqual({ scale: 0.5 });
    expectCode(() => profileById(capabilities, "missing"), "UNKNOWN_PROFILE");
  });

  test("reports reproducible median, p95, FPS, and slow-frame ratio", () => {
    expect(frameStatistics([16, 17, 18, 22, 40])).toEqual({
      medianFrameMs: 18,
      p95FrameMs: 40,
      approximateFps: 55.6,
      droppedFrameRatio: 0.4,
      sampleCount: 5,
    });
  });
});

function expectCode(run: () => unknown, code: string) {
  try {
    run();
    throw new Error("Expected validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(ControlContractError);
    expect((error as ControlContractError).code).toBe(code);
  }
}
