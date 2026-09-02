import {
  ControlContractError,
  WEBMCP_PROTOCOL_VERSION,
  isRecord,
  type ExampleControlCapabilities,
  type ExampleControlState,
  type ParentToPreviewMessage,
  type PreviewRequestAction,
  type PreviewToParentMessage,
} from "./control-contract";

interface ParentBridgeOptions {
  readonly iframe: HTMLIFrameElement;
  readonly slug: string;
  readonly onReady?: (capabilities: ExampleControlCapabilities, state: ExampleControlState) => void;
  readonly onState?: (state: ExampleControlState) => void;
}

interface PendingRequest {
  readonly sessionId: string;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timer: number;
}

export interface ParentPreviewBridge {
  request(action: PreviewRequestAction, input?: unknown, signal?: AbortSignal): Promise<unknown>;
  destroy(): void;
}

export function createParentPreviewBridge(options: ParentBridgeOptions): ParentPreviewBridge {
  const pending = new Map<string, PendingRequest>();
  const readyWaiters = new Set<() => void>();
  let sessionId: string | undefined;
  let destroyed = false;

  const rejectPending = (code: string, message: string) => {
    for (const request of pending.values()) {
      window.clearTimeout(request.timer);
      request.reject(new ControlContractError(code, message));
    }
    pending.clear();
  };

  const onLoad = () => {
    sessionId = undefined;
    rejectPending("STALE_PREVIEW", "The preview navigated before the request completed");
  };

  const onMessage = (event: MessageEvent) => {
    if (
      event.origin !== window.location.origin ||
      event.source !== options.iframe.contentWindow ||
      !isPreviewMessage(event.data, options.slug)
    ) return;
    const message = event.data;
    if (message.type === "vgpu-webmcp-ready") {
      sessionId = message.sessionId;
      options.onReady?.(message.capabilities, message.state);
      for (const wake of readyWaiters) wake();
      readyWaiters.clear();
      return;
    }
    if (!sessionId || message.sessionId !== sessionId) return;
    if (message.type === "vgpu-webmcp-state") {
      options.onState?.(message.state);
      return;
    }
    const request = pending.get(message.requestId);
    if (!request || request.sessionId !== message.sessionId) return;
    pending.delete(message.requestId);
    window.clearTimeout(request.timer);
    if (message.ok) request.resolve(message.result);
    else request.reject(new ControlContractError(message.error?.code ?? "PREVIEW_ERROR", message.error?.message ?? "Preview request failed"));
  };

  window.addEventListener("message", onMessage);
  options.iframe.addEventListener("load", onLoad);

  return {
    async request(action, input = {}, signal) {
      if (destroyed) throw new ControlContractError("BRIDGE_DISPOSED", "The preview bridge is no longer active");
      signal?.throwIfAborted();
      const activeSession = sessionId ?? await waitForReady(8_000, signal).then(() => sessionId);
      if (!activeSession) throw new ControlContractError("PREVIEW_NOT_READY", "The enabled example preview did not become ready");
      const requestId = createId();
      const timeoutMs = action === "benchmark" ? 20_000 : 6_000;
      const message: ParentToPreviewMessage = {
        type: "vgpu-webmcp-request",
        protocolVersion: WEBMCP_PROTOCOL_VERSION,
        sessionId: activeSession,
        slug: options.slug,
        requestId,
        action,
        input,
      };
      return new Promise<unknown>((resolve, reject) => {
        const timer = window.setTimeout(() => {
          pending.delete(requestId);
          reject(new ControlContractError("PREVIEW_TIMEOUT", `${action} timed out`));
        }, timeoutMs);
        pending.set(requestId, { sessionId: activeSession, resolve, reject, timer });
        const onAbort = () => {
          const current = pending.get(requestId);
          if (!current) return;
          pending.delete(requestId);
          window.clearTimeout(current.timer);
          options.iframe.contentWindow?.postMessage({
            type: "vgpu-webmcp-cancel",
            protocolVersion: WEBMCP_PROTOCOL_VERSION,
            sessionId: activeSession,
            slug: options.slug,
            requestId,
          } satisfies ParentToPreviewMessage, window.location.origin);
          reject(signal?.reason instanceof Error ? signal.reason : new DOMException("Cancelled", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        options.iframe.contentWindow?.postMessage(message, window.location.origin);
      });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.removeEventListener("message", onMessage);
      options.iframe.removeEventListener("load", onLoad);
      rejectPending("BRIDGE_DISPOSED", "The preview bridge was disposed");
      readyWaiters.clear();
    },
  };

  function waitForReady(timeoutMs: number, signal?: AbortSignal): Promise<void> {
    if (sessionId) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        readyWaiters.delete(wake);
        reject(new ControlContractError("PREVIEW_NOT_READY", "The enabled example preview did not become ready"));
      }, timeoutMs);
      const wake = () => {
        window.clearTimeout(timer);
        resolve();
      };
      const abort = () => {
        readyWaiters.delete(wake);
        window.clearTimeout(timer);
        reject(signal?.reason instanceof Error ? signal.reason : new DOMException("Cancelled", "AbortError"));
      };
      readyWaiters.add(wake);
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
    });
  }
}

function isPreviewMessage(value: unknown, slug: string): value is PreviewToParentMessage {
  if (!isRecord(value)) return false;
  return (
    (value.type === "vgpu-webmcp-ready" || value.type === "vgpu-webmcp-state" || value.type === "vgpu-webmcp-response") &&
    value.protocolVersion === WEBMCP_PROTOCOL_VERSION &&
    value.slug === slug &&
    typeof value.sessionId === "string"
  );
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
