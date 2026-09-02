"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AgentLabPanel } from "@/components/agent-lab-panel";
import type { BenchmarkResult, ExampleControlCapabilities, ExampleControlState } from "@/lib/webmcp/control-contract";
import { createParentPreviewBridge, type ParentPreviewBridge } from "@/lib/webmcp/parent-bridge";
import { registerAgentLabTools, type VisibleComparison } from "@/lib/webmcp/register-tools";

// TGEIST-09: verbatim behaviour of the old app's `ExamplePreview` (embeds the
// `/preview/<slug>` route -- owned by TGEIST-08 -- in an iframe and surfaces
// `postMessage`-reported render errors), only the chrome around it changed.
interface ExamplePreviewProps {
  slug: string;
  title: string;
}

interface PreviewErrorMessage {
  type: "vgpu-example-error";
  slug: string;
  message: string;
}

function isPreviewErrorMessage(value: unknown): value is PreviewErrorMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as PreviewErrorMessage).type === "vgpu-example-error" &&
    typeof (value as PreviewErrorMessage).slug === "string" &&
    typeof (value as PreviewErrorMessage).message === "string"
  );
}

export function ExamplePreview({ slug, title }: ExamplePreviewProps) {
  const enabled = slug === "fft-ocean-surface" || slug === "anti-aliasing";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const capabilitiesRef = useRef<ExampleControlCapabilities | undefined>(undefined);
  const benchmarkRef = useRef<BenchmarkResult | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [bridge, setBridge] = useState<ParentPreviewBridge>();
  const [capabilities, setCapabilities] = useState<ExampleControlCapabilities>();
  const [state, setState] = useState<ExampleControlState>();
  const [benchmark, setBenchmark] = useState<BenchmarkResult>();
  const [comparison, setComparison] = useState<VisibleComparison>();
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [statusText, setStatusText] = useState("Manual controls are ready");
  const webMcpAvailable = typeof document !== "undefined" && Boolean(document.modelContext);

  useEffect(() => {
    setError(null);
    setBenchmark(undefined);
    setComparison(undefined);
    benchmarkRef.current = undefined;
  }, [slug]);

  useEffect(() => {
    if (!enabled || !iframeRef.current) return;
    const nextBridge = createParentPreviewBridge({
      iframe: iframeRef.current,
      slug,
      onReady: (nextCapabilities, nextState) => {
        capabilitiesRef.current = nextCapabilities;
        setCapabilities(nextCapabilities);
        setState(nextState);
        setConnected(true);
        setStatusText("Live renderer and manual controls are synchronized");
      },
      onState: setState,
    });
    setBridge(nextBridge);
    return () => {
      nextBridge.destroy();
      setBridge(undefined);
      setConnected(false);
      capabilitiesRef.current = undefined;
    };
  }, [enabled, slug]);

  const onActivity = useCallback((label: string, activityState: "error" | "running" | "success") => {
    setRunning(activityState === "running");
    setStatusText(activityState === "error" ? `${label} failed` : activityState === "success" ? `${label} complete` : label);
  }, []);

  useEffect(() => {
    if (!bridge) return;
    return registerAgentLabTools({
      bridge,
      slug,
      onActivity,
      onBenchmark: (result) => {
        benchmarkRef.current = result;
        setBenchmark(result);
      },
      onComparison: setComparison,
      getCapabilities: () => capabilitiesRef.current,
      getLastBenchmark: () => benchmarkRef.current,
    });
  }, [bridge, onActivity, slug]);

  const runManual = useCallback(async () => {
    if (!bridge || !capabilities) return;
    onActivity("Benchmarking live profiles", "running");
    try {
      const result = await bridge.request("benchmark", {
        profileIds: capabilities.profiles.map(({ id }) => id),
        durationMs: capabilities.benchmark.defaultDurationMs,
      }) as BenchmarkResult;
      benchmarkRef.current = result;
      setBenchmark(result);
      setComparison(undefined);
      onActivity("Benchmarking live profiles", "success");
    } catch {
      onActivity("Benchmarking live profiles", "error");
    }
  }, [bridge, capabilities, onActivity]);

  const reset = useCallback(async () => {
    if (!bridge) return;
    onActivity("Resetting the example", "running");
    try {
      await bridge.request("reset");
      setComparison(undefined);
      onActivity("Resetting the example", "success");
    } catch {
      onActivity("Resetting the example", "error");
    }
  }, [bridge, onActivity]);

  const apply = useCallback(async (profileId: string) => {
    if (!bridge) return;
    onActivity("Applying the recommended profile", "running");
    try {
      await bridge.request("apply_profile", { profileId });
      setComparison((current) => current ? { ...current, applied: true } : current);
      onActivity("Applying the recommended profile", "success");
    } catch {
      onActivity("Applying the recommended profile", "error");
    }
  }, [bridge, onActivity]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isPreviewErrorMessage(event.data)) return;
      if (event.data.slug !== slug) return;
      setError(event.data.message);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [slug]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black shadow-2xl">
        <iframe
        ref={iframeRef}
        allow="fullscreen"
        className="h-full w-full border-0 bg-black"
        src={`/preview/${slug}`}
        title={`${title} preview`}
      />
        {error ? (
        <div className="absolute inset-0 overflow-auto bg-black/85 p-5 text-sm text-red-300 backdrop-blur-sm">
          <div className="mb-3 font-semibold text-red-200">Preview error</div>
          <pre className="whitespace-pre-wrap rounded-md border border-red-800/40 bg-red-950/40 p-3 font-mono text-xs leading-5">
            {error}
          </pre>
        </div>
        ) : null}
      </div>
      {enabled ? (
        <AgentLabPanel
          benchmark={benchmark}
          capabilities={capabilities}
          comparison={comparison}
          connected={connected}
          running={running}
          state={state}
          statusText={statusText}
          webMcpAvailable={webMcpAvailable}
          onApply={apply}
          onBenchmark={() => void runManual()}
          onReset={() => void reset()}
        />
      ) : null}
    </div>
  );
}
