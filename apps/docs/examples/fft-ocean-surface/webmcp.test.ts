import { expect, test, vi } from "vitest";
import { DEFAULT_PARAMS } from "./scene";
import { createOceanWebMcpController } from "./webmcp";

test("batches ocean settings, refreshes lil-gui, and coalesces expensive updates", () => {
  const params = { ...DEFAULT_PARAMS };
  const view = { autoRotate: false, rotateSpeed: 0.12 };
  const rebuildSpectrum = vi.fn();
  const resizeQuality = vi.fn();
  const refreshGui = vi.fn();
  const { controller } = createOceanWebMcpController({
    canvas: { width: 960, height: 540, clientWidth: 960, getBoundingClientRect: () => ({ width: 960 }) } as never,
    params,
    view,
    rebuildSpectrum,
    resizeQuality,
    refreshGui,
    isDisposed: () => false,
  });

  const state = controller.setControls({
    windSpeed: 44,
    amplitude: 8,
    renderScale: 0.6,
    autoRotate: true,
  });
  expect(state.parameters).toMatchObject({ windSpeed: 44, amplitude: 8, renderScale: 0.6, autoRotate: true });
  expect(rebuildSpectrum).toHaveBeenCalledOnce();
  expect(resizeQuality).toHaveBeenCalledOnce();
  expect(refreshGui).toHaveBeenCalledOnce();
});

test("rejects out-of-range values and resets all public ocean state", () => {
  const params = { ...DEFAULT_PARAMS, windSpeed: 50 };
  const view = { autoRotate: true, rotateSpeed: 0.5 };
  const { controller } = createOceanWebMcpController({
    canvas: {} as never,
    params,
    view,
    rebuildSpectrum: vi.fn(),
    resizeQuality: vi.fn(),
    refreshGui: vi.fn(),
    isDisposed: () => false,
  });
  expect(() => controller.setControls({ renderScale: 1.5 })).toThrow("renderScale must be from 0.5 to 1");
  expect(controller.reset().parameters).toMatchObject({ ...DEFAULT_PARAMS, autoRotate: false, rotateSpeed: 0.12 });
});
