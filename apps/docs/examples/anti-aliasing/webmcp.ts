import { DEFAULT_MODE, MODES, type AaMode } from "./scene";

type ModeLabel = keyof typeof MODES;
type ControlValue = boolean | number | string;

const DEFAULT_LABEL = labelForMode(DEFAULT_MODE);

export const ANTI_ALIASING_WEBMCP_CAPABILITIES = {
  protocolVersion: 1 as const,
  slug: "anti-aliasing",
  title: "Anti-Aliasing",
  actions: ["inspect", "set", "reset", "benchmark"] as const,
  parameters: {
    mode: {
      type: "enum" as const,
      label: "Mode",
      description: "Anti-aliasing technique used for the live scene.",
      default: DEFAULT_LABEL,
      values: Object.keys(MODES) as ModeLabel[],
    },
  },
  profiles: (Object.keys(MODES) as ModeLabel[]).map((mode) => ({
    id: profileId(mode),
    label: mode,
    description: descriptionForMode(mode),
    settings: { mode },
  })),
  benchmark: {
    minDurationMs: 500,
    maxDurationMs: 3000,
    defaultDurationMs: 1200,
    warmupMs: 250,
    maxProfiles: 4,
  },
};

interface AntiAliasingControllerOptions {
  readonly canvas: HTMLCanvasElement;
  readonly getMode: () => AaMode;
  readonly setMode: (mode: AaMode) => void;
  readonly refreshGui: () => void;
  readonly isDisposed: () => boolean;
}

export function createAntiAliasingWebMcpController(options: AntiAliasingControllerOptions) {
  const listeners = new Set<(state: ReturnType<typeof getState>) => void>();
  let revision = 0;
  const getState = () => ({
    slug: ANTI_ALIASING_WEBMCP_CAPABILITIES.slug,
    revision,
    status: "ready" as const,
    parameters: { mode: labelForMode(options.getMode()) },
    canvas: canvasState(options.canvas),
  });
  const emit = () => {
    revision++;
    const state = getState();
    for (const listener of listeners) listener(state);
    return state;
  };
  const setControls = (changes: Readonly<Record<string, ControlValue>>) => {
    if (options.isDisposed()) throw new Error("The anti-aliasing renderer has been disposed");
    const entries = Object.entries(changes);
    if (entries.length !== 1 || entries[0]?.[0] !== "mode") throw new Error("Only mode can be changed");
    const value = entries[0][1];
    if (typeof value !== "string" || !(value in MODES)) throw new Error("mode must be Off, MSAA 4×, SSAA 2×, or FXAA");
    options.setMode(MODES[value as ModeLabel]);
    options.refreshGui();
    return emit();
  };
  const controller = {
    capabilities: ANTI_ALIASING_WEBMCP_CAPABILITIES,
    getState,
    setControls,
    reset: () => setControls({ mode: DEFAULT_LABEL }),
    subscribe(listener: (state: ReturnType<typeof getState>) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return { controller, notifyManualChange: emit };
}

function labelForMode(mode: AaMode): ModeLabel {
  const entry = Object.entries(MODES).find(([, value]) => value === mode);
  return (entry?.[0] ?? "FXAA") as ModeLabel;
}

function profileId(mode: ModeLabel): string {
  return mode.toLowerCase().replace(" 4×", "-4x").replace(" 2×", "-2x");
}

function descriptionForMode(mode: ModeLabel): string {
  if (mode === "Off") return "No anti-aliasing; lowest render overhead and visibly jagged edges.";
  if (mode === "MSAA 4×") return "Four-sample multisampling for strong geometric edge quality.";
  if (mode === "SSAA 2×") return "Render at twice each dimension, then resolve; highest pixel workload.";
  return "A post-process edge filter with a modest additional pass.";
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
