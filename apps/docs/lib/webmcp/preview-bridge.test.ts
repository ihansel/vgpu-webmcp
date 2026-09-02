import { afterEach, expect, test, vi } from "vitest";
import type { ExampleControlController } from "./control-contract";
import { runBoundedBenchmark } from "./preview-bridge";

function controller(): ExampleControlController {
  let revision = 0;
  let parameters: Record<string, string | number | boolean> = { scale: 0.75 };
  return {
    capabilities: {
      protocolVersion: 1,
      slug: "bounded",
      title: "Bounded",
      actions: ["inspect", "set", "reset", "benchmark"],
      parameters: {
        scale: { type: "number", label: "Scale", description: "Scale", default: 0.75, min: 0.5, max: 1, step: 0.05 },
      },
      profiles: [
        { id: "fast", label: "Fast", description: "Fast", settings: { scale: 0.5 } },
        { id: "quality", label: "Quality", description: "Quality", settings: { scale: 1 } },
      ],
      benchmark: { minDurationMs: 500, maxDurationMs: 600, defaultDurationMs: 500, warmupMs: 32, maxProfiles: 2 },
    },
    getState: () => ({ slug: "bounded", revision, status: "ready", parameters, canvas: { width: 800, height: 450, dpr: 1 } }),
    setControls(changes) {
      parameters = { ...parameters, ...changes };
      revision++;
      return this.getState();
    },
    reset() {
      parameters = { scale: 0.75 };
      revision++;
      return this.getState();
    },
    subscribe: () => () => {},
  };
}

afterEach(() => vi.unstubAllGlobals());

test("bounds duration and profile count before doing browser work", async () => {
  const live = controller();
  await expect(runBoundedBenchmark(live, { profileIds: ["fast"], durationMs: 601 }, new AbortController().signal))
    .rejects.toMatchObject({ code: "INVALID_DURATION" });
  await expect(runBoundedBenchmark(live, { profileIds: ["fast", "quality", "fast"], durationMs: 500 }, new AbortController().signal))
    .rejects.toMatchObject({ code: "INVALID_PROFILES" });
});

test("samples declared profiles and restores the exact starting public state", async () => {
  let timestamp = 0;
  let nextId = 0;
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  vi.stubGlobal("window", { setTimeout, clearTimeout });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++nextId;
    timers.set(id, setTimeout(() => {
      timestamp += 16.67;
      callback(timestamp);
    }, 0));
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
  });
  const live = controller();
  const result = await runBoundedBenchmark(
    live,
    { profileIds: ["fast", "quality"], durationMs: 500 },
    new AbortController().signal,
  );
  expect(result.profiles).toHaveLength(2);
  expect(result.profiles[0]).toMatchObject({ profileId: "fast", medianFrameMs: 16.67, approximateFps: 60 });
  expect(result.restoredState.parameters).toEqual({ scale: 0.75 });
  expect(result.caveats.join(" ")).toContain("not raw GPU timings");
});

test("cancels an active frame sample without leaving the tested profile applied", async () => {
  vi.stubGlobal("window", { setTimeout, clearTimeout });
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 7));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const live = controller();
  const abort = new AbortController();
  const result = runBoundedBenchmark(live, { profileIds: ["quality"], durationMs: 500 }, abort.signal);
  abort.abort();
  await expect(result).rejects.toHaveProperty("name", "AbortError");
  expect(live.getState().parameters).toEqual({ scale: 0.75 });
  expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
});
