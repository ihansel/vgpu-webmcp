import { DEFAULT_PARAMS, type OceanParams } from "./scene";

interface ViewSettings {
  autoRotate: boolean;
  rotateSpeed: number;
}

type ControlValue = boolean | number | string;

const PARAMETERS = {
  windSpeed: numberParameter("Wind speed", "Wind strength in metres per second.", 2, 60, 0.5, DEFAULT_PARAMS.windSpeed),
  windAngle: numberParameter("Wind angle", "Direction of travel in degrees.", 0, 360, 1, DEFAULT_PARAMS.windAngle),
  amplitude: numberParameter("Amplitude", "Energy in the Phillips wave spectrum.", 0.2, 16, 0.1, DEFAULT_PARAMS.amplitude),
  patchSize: numberParameter("Patch size", "Simulated ocean patch size in metres.", 60, 600, 1, DEFAULT_PARAMS.patchSize),
  heightScale: numberParameter("Wave height", "Visible vertical displacement scale.", 0, 80, 0.5, DEFAULT_PARAMS.heightScale),
  choppyScale: numberParameter("Choppiness", "Visible horizontal displacement scale.", 0, 40, 0.5, DEFAULT_PARAMS.choppyScale),
  foamScale: numberParameter("Foam", "Amount of foam on compressed wave crests.", 0.05, 1.2, 0.01, DEFAULT_PARAMS.foamScale),
  renderScale: numberParameter("Render scale", "HDR scene resolution relative to the visible canvas.", 0.5, 1, 0.01, DEFAULT_PARAMS.renderScale),
  sunElevation: numberParameter("Sun elevation", "Sun height above the horizon in degrees.", -2, 60, 0.5, DEFAULT_PARAMS.sunElevation),
  sunAzimuth: numberParameter("Sun azimuth", "Sun direction around the horizon in degrees.", 0, 360, 1, DEFAULT_PARAMS.sunAzimuth),
  timeScale: numberParameter("Simulation speed", "Multiplier applied to simulation time.", 0, 3, 0.05, DEFAULT_PARAMS.timeScale),
  autoRotate: {
    type: "boolean" as const,
    label: "Auto-rotate",
    description: "Automatically orbit the camera while the ocean runs.",
    default: false,
  },
  rotateSpeed: numberParameter("Rotate speed", "Automatic camera orbit speed.", 0.02, 0.6, 0.01, 0.12),
};

export const OCEAN_WEBMCP_CAPABILITIES = {
  protocolVersion: 1 as const,
  slug: "fft-ocean-surface",
  title: "FFT ocean surface",
  actions: ["inspect", "set", "reset", "benchmark"] as const,
  parameters: PARAMETERS,
  profiles: [
    {
      id: "performance",
      label: "Performance",
      description: "Lower internal resolution with restrained foam for steadier frame delivery.",
      settings: { ...DEFAULT_PARAMS, renderScale: 0.55, foamScale: 0.28 },
    },
    {
      id: "balanced",
      label: "Balanced",
      description: "The default resolution and sunset ocean treatment.",
      settings: { ...DEFAULT_PARAMS },
    },
    {
      id: "storm-dusk",
      label: "Storm at dusk",
      description: "Full-resolution, energetic waves with a low evening sun.",
      settings: {
        ...DEFAULT_PARAMS,
        renderScale: 1,
        windSpeed: 46,
        windAngle: 32,
        amplitude: 8.5,
        heightScale: 52,
        choppyScale: 24,
        foamScale: 0.82,
        sunElevation: 1.5,
        sunAzimuth: 246,
        timeScale: 1.2,
      },
    },
  ],
  benchmark: {
    minDurationMs: 500,
    maxDurationMs: 3000,
    defaultDurationMs: 1200,
    warmupMs: 250,
    maxProfiles: 3,
  },
};

interface OceanControllerOptions {
  readonly canvas: HTMLCanvasElement;
  readonly params: OceanParams;
  readonly view: ViewSettings;
  readonly rebuildSpectrum: () => void;
  readonly resizeQuality: () => void;
  readonly refreshGui: () => void;
  readonly isDisposed: () => boolean;
}

export function createOceanWebMcpController(options: OceanControllerOptions) {
  const listeners = new Set<(state: ReturnType<typeof getState>) => void>();
  let revision = 0;

  const getState = () => ({
    slug: OCEAN_WEBMCP_CAPABILITIES.slug,
    revision,
    status: "ready" as const,
    parameters: {
      ...options.params,
      autoRotate: options.view.autoRotate,
      rotateSpeed: options.view.rotateSpeed,
    },
    canvas: canvasState(options.canvas),
  });
  const emit = () => {
    revision++;
    const state = getState();
    for (const listener of listeners) listener(state);
    return state;
  };
  const setControls = (changes: Readonly<Record<string, ControlValue>>) => {
    if (options.isDisposed()) throw new Error("The ocean renderer has been disposed");
    let rebuild = false;
    let resize = false;
    for (const [key, value] of Object.entries(changes)) {
      assertValue(key, value);
      if (key === "autoRotate" || key === "rotateSpeed") {
        Object.assign(options.view, { [key]: value });
      } else {
        Object.assign(options.params, { [key]: value });
        rebuild ||= ["windSpeed", "windAngle", "amplitude", "patchSize"].includes(key);
        resize ||= key === "renderScale";
      }
    }
    if (rebuild) options.rebuildSpectrum();
    if (resize) options.resizeQuality();
    options.refreshGui();
    return emit();
  };
  const reset = () => setControls({
    ...DEFAULT_PARAMS,
    autoRotate: false,
    rotateSpeed: 0.12,
  });
  const controller = {
    capabilities: OCEAN_WEBMCP_CAPABILITIES,
    getState,
    setControls,
    reset,
    subscribe(listener: (state: ReturnType<typeof getState>) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return { controller, notifyManualChange: emit };
}

function assertValue(key: string, value: ControlValue): void {
  const definition = PARAMETERS[key as keyof typeof PARAMETERS];
  if (!definition) throw new Error(`Unknown parameter: ${key}`);
  if (definition.type === "boolean") {
    if (typeof value !== "boolean") throw new Error(`${key} must be a boolean`);
    return;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < definition.min || value > definition.max) {
    throw new Error(`${key} must be from ${definition.min} to ${definition.max}`);
  }
}

function numberParameter(label: string, description: string, min: number, max: number, step: number, defaultValue: number) {
  return { type: "number" as const, label, description, min, max, step, default: defaultValue };
}

function canvasState(canvas: HTMLCanvasElement) {
  const rect = typeof canvas.getBoundingClientRect === "function" ? canvas.getBoundingClientRect() : undefined;
  const cssWidth = Math.max(1, rect?.width || canvas.clientWidth || canvas.width || 1);
  return {
    width: canvas.width || 0,
    height: canvas.height || 0,
    dpr: Math.round((canvas.width / cssWidth) * 100) / 100,
  };
}
