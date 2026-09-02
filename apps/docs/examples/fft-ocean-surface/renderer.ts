import GUI from "lil-gui";
import { clock, frameLoop, surface, type Gpu, type Surface } from "vgpu";
import { orbitControls, perspectiveCamera } from "vgpu/scene";

import { buildOcean, OCEAN_CAMERA, type OceanScene } from "./scene";
import { createOceanWebMcpController } from "./webmcp";

interface RendererOptions {
  readonly canvas: HTMLCanvasElement;
}

interface ViewSettings {
  autoRotate: boolean;
  rotateSpeed: number;
}

export function createRenderer({ canvas }: RendererOptions) {
  let disposed = false;
  let failed = false;
  let gpu: Gpu | undefined;
  let output: Surface | undefined;
  let scene: OceanScene | undefined;
  let camera: ReturnType<typeof perspectiveCamera> | undefined;
  let controls: ReturnType<typeof orbitControls> | undefined;
  let gui: GUI | undefined;
  let loop: { stop(): void } | undefined;
  let unsubscribeResize: (() => void) | undefined;
  let refreshGui = () => {};
  let webMcp: ReturnType<typeof createOceanWebMcpController> | undefined;
  const view: ViewSettings = { autoRotate: false, rotateSpeed: 0.12 };

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    runCleanups([
      () => loop?.stop(),
      () => unsubscribeResize?.(),
      () => controls?.dispose(),
      () => gui?.destroy(),
      () => gpu?.dispose(),
    ]);
  }

  function fail(error: unknown): never {
    failed = true;
    try {
      dispose();
    } catch {
      // Teardown must not replace the render, resize, or initialization error.
    }
    throw error;
  }

  function guard<T>(action: () => T): T {
    try {
      return action();
    } catch (error) {
      return fail(error);
    }
  }

  function resizeScene(): void {
    guard(() => {
      if (!scene || !camera || !output) return;
      scene.resize(output.size);
      camera.set({ aspect: output.size[0] / output.size[1] });
    });
  }

  const initialize = async () => {
    const { init } = await import("vgpu");
    if (disposed) return;
    const nextGpu = await init();
    if (disposed) {
      nextGpu.dispose();
      return;
    }

    gpu = nextGpu;
    output = surface(gpu, canvas, { dpr: [1, 2] });
    scene = buildOcean(gpu, output.size);
    camera = perspectiveCamera({
      ...OCEAN_CAMERA,
      aspect: output.size[0] / output.size[1],
    });
    controls = orbitControls(camera, {
      element: canvas,
      target: OCEAN_CAMERA.target,
      damping: 0.12,
      distance: { min: 20, max: 700 },
      pitch: { min: -0.05, max: 1.35 },
    });
    const container = canvas.parentElement ?? undefined;
    gui = new GUI({ title: "Ocean", container });
    webMcp = createOceanWebMcpController({
      canvas,
      params: scene.params,
      view,
      rebuildSpectrum: () => guard(() => scene?.rebuildSpectrum()),
      resizeQuality: () => resizeScene(),
      refreshGui: () => refreshGui(),
      isDisposed: () => disposed,
    });
    refreshGui = configureGui(
      gui,
      scene,
      view,
      () => guard(() => scene?.rebuildSpectrum()),
      webMcp.notifyManualChange,
      resizeScene,
    );
    unsubscribeResize = output.onResize(resizeScene);

    const time = clock(gpu);
    loop = frameLoop(gpu, (currentFrame) => {
      guard(() => {
        if (disposed || !output || !scene || !camera || !controls) return;
        const dt = time.deltaTime;
        controls.update(dt);
        if (view.autoRotate) {
          controls.set({ yaw: controls.yaw + dt * view.rotateSpeed });
        }
        scene.simulate(dt);
        scene.updateCamera(camera.viewProjection, camera.worldPosition);
        currentFrame.pass({ target: scene.hdr, clear: scene.clear }, (pass) => {
          pass.draw(scene!.skydome);
          pass.draw(scene!.ocean);
        });
        currentFrame.pass(output, scene.composite);
      });
    });
  };

  const ready = initialize().catch((error: unknown) => {
    if (disposed && !failed) return;
    fail(error);
  });

  return { ready, dispose, getWebMcpController: () => webMcp?.controller };
}

export function configureGui(
  gui: GUI,
  scene: OceanScene,
  view: ViewSettings,
  rebuild: () => void,
  notifyChange: () => void = () => {},
  resizeQuality: () => void = () => {},
): () => void {
  Object.assign(gui.domElement.style, {
    position: "absolute",
    top: "8px",
    right: "8px",
    zIndex: "10",
    maxHeight: "calc(100% - 16px)",
    overflowY: "auto",
  });
  const p = scene.params;
  const waves = gui.addFolder("Waves");
  const controllers = [] as Array<{ updateDisplay(): void }>;
  const add = <T extends { onChange(callback: () => void): T; updateDisplay(): void }>(controller: T, change = notifyChange) => {
    controller.onChange(change);
    controllers.push(controller);
    return controller;
  };
  add(waves.add(p, "windSpeed", 2, 60, 0.5).name("wind speed"), () => { rebuild(); notifyChange(); });
  add(waves.add(p, "windAngle", 0, 360, 1).name("wind angle"), () => { rebuild(); notifyChange(); });
  add(waves.add(p, "amplitude", 0.2, 16, 0.1), () => { rebuild(); notifyChange(); });
  add(waves.add(p, "patchSize", 60, 600, 1).name("patch size (m)"), () => { rebuild(); notifyChange(); });

  const look = gui.addFolder("Look");
  add(look.add(p, "heightScale", 0, 80, 0.5).name("height"));
  add(look.add(p, "choppyScale", 0, 40, 0.5).name("choppiness"));
  add(look.add(p, "foamScale", 0.05, 1.2, 0.01).name("foam"));
  add(look.add(p, "renderScale", 0.5, 1, 0.01).name("render scale"), () => { resizeQuality(); notifyChange(); });

  const sun = gui.addFolder("Sun");
  add(sun.add(p, "sunElevation", -2, 60, 0.5).name("elevation"));
  add(sun.add(p, "sunAzimuth", 0, 360, 1).name("azimuth"));

  const sim = gui.addFolder("Sim");
  add(sim.add(p, "timeScale", 0, 3, 0.05).name("speed"));
  add(sim.add(view, "autoRotate").name("auto-rotate"));
  add(sim.add(view, "rotateSpeed", 0.02, 0.6, 0.01).name("rotate speed"));
  return () => controllers.forEach((controller) => controller.updateDisplay());
}

function runCleanups(cleanups: readonly (() => void)[]): void {
  const errors: unknown[] = [];
  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) throw errors[0];
}
