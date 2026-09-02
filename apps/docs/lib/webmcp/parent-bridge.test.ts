import { afterEach, expect, test, vi } from "vitest";
import { createParentPreviewBridge } from "./parent-bridge";

function setup() {
  const windowListeners = new Map<string, Set<(event: any) => void>>();
  const iframeListeners = new Map<string, Set<(event: any) => void>>();
  const contentWindow = { postMessage: vi.fn() };
  const iframe = {
    contentWindow,
    addEventListener(name: string, listener: (event: any) => void) {
      const listeners = iframeListeners.get(name) ?? new Set();
      listeners.add(listener);
      iframeListeners.set(name, listeners);
    },
    removeEventListener(name: string, listener: (event: any) => void) {
      iframeListeners.get(name)?.delete(listener);
    },
  } as unknown as HTMLIFrameElement;
  vi.stubGlobal("window", {
    location: { origin: "https://vgpu.test" },
    setTimeout,
    clearTimeout,
    addEventListener(name: string, listener: (event: any) => void) {
      const listeners = windowListeners.get(name) ?? new Set();
      listeners.add(listener);
      windowListeners.set(name, listeners);
    },
    removeEventListener(name: string, listener: (event: any) => void) {
      windowListeners.get(name)?.delete(listener);
    },
  });
  const emitWindow = (name: string, event: any) => {
    for (const listener of windowListeners.get(name) ?? []) listener(event);
  };
  const emitIframe = (name: string, event: any = {}) => {
    for (const listener of iframeListeners.get(name) ?? []) listener(event);
  };
  return { contentWindow, emitIframe, emitWindow, iframe };
}

afterEach(() => vi.unstubAllGlobals());

test("accepts only exact-origin, exact-window, correlated current-session responses", async () => {
  const env = setup();
  const bridge = createParentPreviewBridge({ iframe: env.iframe, slug: "anti-aliasing" });
  env.emitWindow("message", ready(env, "session-current"));

  const resultPromise = bridge.request("get_state");
  const request = env.contentWindow.postMessage.mock.calls.at(-1)![0];
  const response = {
    type: "vgpu-webmcp-response",
    protocolVersion: 1,
    slug: "anti-aliasing",
    sessionId: "session-current",
    requestId: request.requestId,
    ok: true,
    result: { revision: 4 },
  };
  env.emitWindow("message", { origin: "https://attacker.test", source: env.contentWindow, data: response });
  env.emitWindow("message", { origin: "https://vgpu.test", source: {}, data: response });
  env.emitWindow("message", { origin: "https://vgpu.test", source: env.contentWindow, data: { ...response, sessionId: "session-old" } });
  env.emitWindow("message", { origin: "https://vgpu.test", source: env.contentWindow, data: response });

  await expect(resultPromise).resolves.toEqual({ revision: 4 });
  bridge.destroy();
});

test("rejects an in-flight request when the iframe navigates and ignores the stale response", async () => {
  const env = setup();
  const bridge = createParentPreviewBridge({ iframe: env.iframe, slug: "anti-aliasing" });
  env.emitWindow("message", ready(env, "session-a"));
  const request = bridge.request("get_state");
  env.emitIframe("load");
  await expect(request).rejects.toMatchObject({ code: "STALE_PREVIEW" });
  bridge.destroy();
});

test("forwards cancellation with the same request correlation id", async () => {
  const env = setup();
  const bridge = createParentPreviewBridge({ iframe: env.iframe, slug: "anti-aliasing" });
  env.emitWindow("message", ready(env, "session-a"));
  const abort = new AbortController();
  const request = bridge.request("benchmark", { profileIds: ["off"] }, abort.signal);
  const sent = env.contentWindow.postMessage.mock.calls.at(-1)![0];
  abort.abort();
  await expect(request).rejects.toHaveProperty("name", "AbortError");
  const cancellation = env.contentWindow.postMessage.mock.calls.at(-1)![0];
  expect(cancellation).toMatchObject({ type: "vgpu-webmcp-cancel", requestId: sent.requestId, sessionId: "session-a" });
  bridge.destroy();
});

function ready(env: ReturnType<typeof setup>, sessionId: string) {
  return {
    origin: "https://vgpu.test",
    source: env.contentWindow,
    data: {
      type: "vgpu-webmcp-ready",
      protocolVersion: 1,
      slug: "anti-aliasing",
      sessionId,
      capabilities: {},
      state: {},
    },
  };
}
