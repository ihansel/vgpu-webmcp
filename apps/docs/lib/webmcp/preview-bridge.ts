import {
  ControlContractError,
  WEBMCP_CONTROLLER_EVENT,
  WEBMCP_PROTOCOL_VERSION,
  errorPayload,
  frameStatistics,
  isRecord,
  profileById,
  validateChanges,
  type BenchmarkResult,
  type ExampleControlController,
  type ParentToPreviewMessage,
  type PreviewRequestAction,
  type PreviewToParentMessage,
} from "./control-contract";

interface ControllerEventDetail {
  readonly controller?: ExampleControlController;
  readonly slug: string;
}

export function installPreviewWebMcpBridge(slug: string): () => void {
  const sessionId = createId();
  const active = new Map<string, AbortController>();
  let controller: ExampleControlController | undefined;
  let unsubscribeState: (() => void) | undefined;

  const post = (message: PreviewToParentMessage) => {
    if (window.parent === window) return;
    window.parent.postMessage(message, window.location.origin);
  };

  const attach = (next: ExampleControlController) => {
    if (next.capabilities.slug !== slug) return;
    unsubscribeState?.();
    controller = next;
    unsubscribeState = next.subscribe((state) => {
      post({
        type: "vgpu-webmcp-state",
        protocolVersion: WEBMCP_PROTOCOL_VERSION,
        sessionId,
        slug,
        state,
      });
    });
    post({
      type: "vgpu-webmcp-ready",
      protocolVersion: WEBMCP_PROTOCOL_VERSION,
      sessionId,
      slug,
      capabilities: next.capabilities,
      state: next.getState(),
    });
  };

  const onController = (event: Event) => {
    const detail = (event as CustomEvent<ControllerEventDetail>).detail;
    if (!detail || detail.slug !== slug) return;
    if (detail.controller) attach(detail.controller);
    else {
      unsubscribeState?.();
      unsubscribeState = undefined;
      controller = undefined;
      for (const operation of active.values()) operation.abort();
      active.clear();
    }
  };

  const onMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    if (!isParentMessage(event.data, slug, sessionId)) return;
    const message = event.data;
    if (message.type === "vgpu-webmcp-cancel") {
      active.get(message.requestId)?.abort();
      return;
    }
    if (!controller) {
      respond(message, false, undefined, {
        code: "PREVIEW_NOT_READY",
        message: "The enabled example renderer is not ready",
      });
      return;
    }

    const operation = new AbortController();
    active.set(message.requestId, operation);
    void executeRequest(controller, message.action, message.input, operation.signal)
      .then((result) => respond(message, true, result))
      .catch((error: unknown) => respond(message, false, undefined, errorPayload(error)))
      .finally(() => active.delete(message.requestId));
  };

  const respond = (
    request: Extract<ParentToPreviewMessage, { type: "vgpu-webmcp-request" }>,
    ok: boolean,
    result?: unknown,
    error?: { code: string; message: string },
  ) => post({
    type: "vgpu-webmcp-response",
    protocolVersion: WEBMCP_PROTOCOL_VERSION,
    sessionId,
    slug,
    requestId: request.requestId,
    ok,
    result,
    error,
  });

  window.addEventListener(WEBMCP_CONTROLLER_EVENT, onController);
  window.addEventListener("message", onMessage);
  return () => {
    window.removeEventListener(WEBMCP_CONTROLLER_EVENT, onController);
    window.removeEventListener("message", onMessage);
    unsubscribeState?.();
    for (const operation of active.values()) operation.abort();
    active.clear();
  };
}

async function executeRequest(
  controller: ExampleControlController,
  action: PreviewRequestAction,
  input: unknown,
  signal: AbortSignal,
): Promise<unknown> {
  signal.throwIfAborted();
  if (action === "describe") return controller.capabilities;
  if (action === "get_state") return controller.getState();
  if (action === "reset") return controller.reset();
  if (action === "set_controls") {
    if (!isRecord(input)) throw new ControlContractError("INVALID_INPUT", "Input must be an object");
    return controller.setControls(validateChanges(controller.capabilities, input.changes));
  }
  if (action === "apply_profile") {
    if (!isRecord(input) || typeof input.profileId !== "string") {
      throw new ControlContractError("INVALID_INPUT", "profileId must be a string");
    }
    const profile = profileById(controller.capabilities, input.profileId);
    return controller.setControls(validateChanges(controller.capabilities, profile.settings));
  }
  return runBoundedBenchmark(controller, input, signal);
}

export async function runBoundedBenchmark(
  controller: ExampleControlController,
  input: unknown,
  signal: AbortSignal,
): Promise<BenchmarkResult> {
  if (!isRecord(input) || !Array.isArray(input.profileIds)) {
    throw new ControlContractError("INVALID_INPUT", "profileIds must be an array");
  }
  const limits = controller.capabilities.benchmark;
  const durationMs = input.durationMs === undefined ? limits.defaultDurationMs : input.durationMs;
  if (
    typeof durationMs !== "number" ||
    !Number.isFinite(durationMs) ||
    durationMs < limits.minDurationMs ||
    durationMs > limits.maxDurationMs
  ) {
    throw new ControlContractError(
      "INVALID_DURATION",
      `durationMs must be from ${limits.minDurationMs} to ${limits.maxDurationMs}`,
    );
  }
  const profileIds = input.profileIds;
  if (profileIds.length === 0 || profileIds.length > limits.maxProfiles) {
    throw new ControlContractError(
      "INVALID_PROFILES",
      `Choose between 1 and ${limits.maxProfiles} profiles`,
    );
  }
  if (!profileIds.every((id) => typeof id === "string") || new Set(profileIds).size !== profileIds.length) {
    throw new ControlContractError("INVALID_PROFILES", "Profile ids must be unique strings");
  }

  const profiles = profileIds.map((id) => profileById(controller.capabilities, id));
  const original = controller.getState().parameters;
  const results: BenchmarkResult["profiles"][number][] = [];
  try {
    for (const profile of profiles) {
      signal.throwIfAborted();
      controller.setControls(validateChanges(controller.capabilities, profile.settings));
      await sampleAnimationFrames(limits.warmupMs, signal, false);
      const samples = await sampleAnimationFrames(durationMs, signal, true);
      results.push({
        profileId: profile.id,
        profileLabel: profile.label,
        settings: profile.settings,
        ...frameStatistics(samples),
      });
    }
  } finally {
    try {
      controller.setControls(validateChanges(controller.capabilities, original));
    } catch {
      // A disposed or failed renderer cannot be restored; its owning lifecycle reports the failure.
    }
  }

  const restoredState = controller.getState();
  return {
    slug: controller.capabilities.slug,
    durationMs,
    finishedAt: new Date().toISOString(),
    canvas: restoredState.canvas,
    profiles: results,
    restoredState,
    caveats: [
      "Frame times include browser scheduling and system load; they are not raw GPU timings.",
      "Display refresh rate and background-tab throttling affect results.",
      "Compare profiles only within this active canvas session and canvas size.",
    ],
  };
}

function sampleAnimationFrames(
  durationMs: number,
  signal: AbortSignal,
  collect: boolean,
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    let frameId = 0;
    let started: number | undefined;
    let previous: number | undefined;
    const samples: number[] = [];
    const wallTimer = window.setTimeout(() => {
      cancelAnimationFrame(frameId);
      reject(new ControlContractError("BENCHMARK_THROTTLED", "Frame sampling timed out; keep the preview visible and try again"));
    }, durationMs + 4_000);
    const cleanup = () => {
      window.clearTimeout(wallTimer);
      signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cancelAnimationFrame(frameId);
      cleanup();
      reject(signal.reason instanceof Error ? signal.reason : new DOMException("Cancelled", "AbortError"));
    };
    const onFrame = (timestamp: number) => {
      if (started === undefined) {
        started = timestamp;
        previous = timestamp;
      } else {
        if (collect) samples.push(timestamp - previous!);
        previous = timestamp;
      }
      if (timestamp - started >= durationMs) {
        cleanup();
        resolve(samples);
      } else {
        frameId = requestAnimationFrame(onFrame);
      }
    };
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    else frameId = requestAnimationFrame(onFrame);
  });
}

function isParentMessage(value: unknown, slug: string, sessionId: string): value is ParentToPreviewMessage {
  if (!isRecord(value)) return false;
  return (
    (value.type === "vgpu-webmcp-request" || value.type === "vgpu-webmcp-cancel") &&
    value.protocolVersion === WEBMCP_PROTOCOL_VERSION &&
    value.slug === slug &&
    value.sessionId === sessionId &&
    typeof value.requestId === "string"
  );
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
