export const WEBMCP_PROTOCOL_VERSION = 1 as const;
export const WEBMCP_CONTROLLER_EVENT = "vgpu-webmcp-controller";

export type ControlValue = boolean | number | string;

interface BaseControlDefinition<T extends ControlValue> {
  readonly default: T;
  readonly description: string;
  readonly label: string;
}

export interface NumberControlDefinition extends BaseControlDefinition<number> {
  readonly type: "number";
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export interface BooleanControlDefinition extends BaseControlDefinition<boolean> {
  readonly type: "boolean";
}

export interface EnumControlDefinition extends BaseControlDefinition<string> {
  readonly type: "enum";
  readonly values: readonly string[];
}

export type ControlDefinition =
  | BooleanControlDefinition
  | EnumControlDefinition
  | NumberControlDefinition;

export interface BenchmarkProfile {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly settings: Readonly<Record<string, ControlValue>>;
}

export interface BenchmarkLimits {
  readonly defaultDurationMs: number;
  readonly maxDurationMs: number;
  readonly maxProfiles: number;
  readonly minDurationMs: number;
  readonly warmupMs: number;
}

export interface ExampleControlCapabilities {
  readonly protocolVersion: typeof WEBMCP_PROTOCOL_VERSION;
  readonly slug: string;
  readonly title: string;
  readonly parameters: Readonly<Record<string, ControlDefinition>>;
  readonly profiles: readonly BenchmarkProfile[];
  readonly actions: readonly ["inspect", "set", "reset", "benchmark"];
  readonly benchmark: BenchmarkLimits;
}

export interface ExampleCanvasState {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}

export interface ExampleControlState {
  readonly slug: string;
  readonly revision: number;
  readonly status: "ready" | "benchmarking";
  readonly parameters: Readonly<Record<string, ControlValue>>;
  readonly canvas: ExampleCanvasState;
}

export interface ExampleControlController {
  readonly capabilities: ExampleControlCapabilities;
  getState(): ExampleControlState;
  setControls(changes: Readonly<Record<string, ControlValue>>): ExampleControlState;
  reset(): ExampleControlState;
  subscribe(listener: (state: ExampleControlState) => void): () => void;
}

export interface FrameStatistics {
  readonly approximateFps: number;
  readonly droppedFrameRatio: number;
  readonly medianFrameMs: number;
  readonly p95FrameMs: number;
  readonly sampleCount: number;
}

export interface BenchmarkResult {
  readonly canvas: ExampleCanvasState;
  readonly caveats: readonly string[];
  readonly durationMs: number;
  readonly finishedAt: string;
  readonly profiles: readonly (FrameStatistics & {
    readonly profileId: string;
    readonly profileLabel: string;
    readonly settings: Readonly<Record<string, ControlValue>>;
  })[];
  readonly restoredState: ExampleControlState;
  readonly slug: string;
}

export type PreviewRequestAction =
  | "apply_profile"
  | "benchmark"
  | "describe"
  | "get_state"
  | "reset"
  | "set_controls";

export interface PreviewReadyMessage {
  readonly type: "vgpu-webmcp-ready";
  readonly protocolVersion: typeof WEBMCP_PROTOCOL_VERSION;
  readonly sessionId: string;
  readonly slug: string;
  readonly capabilities: ExampleControlCapabilities;
  readonly state: ExampleControlState;
}

export interface PreviewStateMessage {
  readonly type: "vgpu-webmcp-state";
  readonly protocolVersion: typeof WEBMCP_PROTOCOL_VERSION;
  readonly sessionId: string;
  readonly slug: string;
  readonly state: ExampleControlState;
}

export interface ParentRequestMessage {
  readonly type: "vgpu-webmcp-request";
  readonly protocolVersion: typeof WEBMCP_PROTOCOL_VERSION;
  readonly sessionId: string;
  readonly slug: string;
  readonly requestId: string;
  readonly action: PreviewRequestAction;
  readonly input: unknown;
}

export interface ParentCancelMessage {
  readonly type: "vgpu-webmcp-cancel";
  readonly protocolVersion: typeof WEBMCP_PROTOCOL_VERSION;
  readonly sessionId: string;
  readonly slug: string;
  readonly requestId: string;
}

export interface PreviewResponseMessage {
  readonly type: "vgpu-webmcp-response";
  readonly protocolVersion: typeof WEBMCP_PROTOCOL_VERSION;
  readonly sessionId: string;
  readonly slug: string;
  readonly requestId: string;
  readonly ok: boolean;
  readonly result?: unknown;
  readonly error?: { readonly code: string; readonly message: string };
}

export type PreviewToParentMessage =
  | PreviewReadyMessage
  | PreviewResponseMessage
  | PreviewStateMessage;

export type ParentToPreviewMessage = ParentCancelMessage | ParentRequestMessage;

export class ControlContractError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ControlContractError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateChanges(
  capabilities: ExampleControlCapabilities,
  value: unknown,
): Readonly<Record<string, ControlValue>> {
  if (!isRecord(value)) {
    throw new ControlContractError("INVALID_CHANGES", "changes must be an object");
  }
  const entries = Object.entries(value);
  if (entries.length === 0) {
    throw new ControlContractError("INVALID_CHANGES", "changes must contain at least one parameter");
  }
  if (entries.length > 16) {
    throw new ControlContractError("INVALID_CHANGES", "changes may contain at most 16 parameters");
  }

  const validated: Record<string, ControlValue> = {};
  for (const [key, candidate] of entries) {
    const definition = capabilities.parameters[key];
    if (!definition) {
      throw new ControlContractError("UNKNOWN_PARAMETER", `Unknown parameter: ${key}`);
    }
    if (definition.type === "boolean") {
      if (typeof candidate !== "boolean") {
        throw new ControlContractError("INVALID_PARAMETER", `${key} must be a boolean`);
      }
    } else if (definition.type === "enum") {
      if (typeof candidate !== "string" || !definition.values.includes(candidate)) {
        throw new ControlContractError(
          "INVALID_PARAMETER",
          `${key} must be one of: ${definition.values.join(", ")}`,
        );
      }
    } else if (
      typeof candidate !== "number" ||
      !Number.isFinite(candidate) ||
      candidate < definition.min ||
      candidate > definition.max
    ) {
      throw new ControlContractError(
        "INVALID_PARAMETER",
        `${key} must be a finite number from ${definition.min} to ${definition.max}`,
      );
    }
    validated[key] = candidate as ControlValue;
  }
  return validated;
}

export function profileById(
  capabilities: ExampleControlCapabilities,
  profileId: string,
): BenchmarkProfile {
  const profile = capabilities.profiles.find(({ id }) => id === profileId);
  if (!profile) {
    throw new ControlContractError("UNKNOWN_PROFILE", `Unknown benchmark profile: ${profileId}`);
  }
  return profile;
}

export function frameStatistics(samples: readonly number[]): FrameStatistics {
  if (samples.length === 0) {
    throw new ControlContractError("NO_FRAME_SAMPLES", "The browser did not produce frame samples");
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (fraction: number) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)]!;
  const medianFrameMs = round(percentile(0.5), 2);
  const p95FrameMs = round(percentile(0.95), 2);
  return {
    medianFrameMs,
    p95FrameMs,
    approximateFps: round(1000 / medianFrameMs, 1),
    droppedFrameRatio: round(samples.filter((sample) => sample > 20).length / samples.length, 3),
    sampleCount: samples.length,
  };
}

export function errorPayload(error: unknown): { code: string; message: string } {
  if (error instanceof ControlContractError) return { code: error.code, message: error.message };
  if (error instanceof DOMException && error.name === "AbortError") {
    return { code: "CANCELLED", message: "The operation was cancelled" };
  }
  return {
    code: "PREVIEW_ERROR",
    message: error instanceof Error ? error.message : "The preview could not complete the request",
  };
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
