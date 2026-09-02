import { expect, test, vi } from "vitest";
import { MODES, type AaMode } from "./scene";
import { createAntiAliasingWebMcpController } from "./webmcp";

test("manual and agent updates share one anti-aliasing mode state", () => {
  let mode: AaMode = MODES.FXAA;
  const refreshGui = vi.fn();
  const { controller, notifyManualChange } = createAntiAliasingWebMcpController({
    canvas: { width: 800, height: 450, clientWidth: 400, getBoundingClientRect: () => ({ width: 400 }) } as never,
    getMode: () => mode,
    setMode: (next) => { mode = next; },
    refreshGui,
    isDisposed: () => false,
  });
  const listener = vi.fn();
  controller.subscribe(listener);

  expect(controller.setControls({ mode: "MSAA 4×" }).parameters.mode).toBe("MSAA 4×");
  expect(mode).toBe(MODES["MSAA 4×"]);
  expect(refreshGui).toHaveBeenCalledOnce();
  mode = MODES.Off;
  notifyManualChange();
  expect(listener.mock.calls.at(-1)![0].parameters.mode).toBe("Off");
  expect(controller.getState().canvas).toEqual({ width: 800, height: 450, dpr: 2 });
});

test("rejects private and invalid anti-aliasing settings", () => {
  const { controller } = createAntiAliasingWebMcpController({
    canvas: {} as never,
    getMode: () => MODES.FXAA,
    setMode: vi.fn(),
    refreshGui: vi.fn(),
    isDisposed: () => false,
  });
  expect(() => controller.setControls({ gpuAdapter: "private" })).toThrow("Only mode");
  expect(() => controller.setControls({ mode: "Ultra" })).toThrow("mode must be");
});
