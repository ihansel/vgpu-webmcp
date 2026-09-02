"use client";

import { Check, CircleAlert, Gauge, RefreshCw, Sparkles } from "lucide-react";
import type { BenchmarkResult, ExampleControlCapabilities, ExampleControlState } from "@/lib/webmcp/control-contract";
import type { VisibleComparison } from "@/lib/webmcp/register-tools";

interface AgentLabPanelProps {
  readonly benchmark?: BenchmarkResult;
  readonly capabilities?: ExampleControlCapabilities;
  readonly comparison?: VisibleComparison;
  readonly connected: boolean;
  readonly running: boolean;
  readonly state?: ExampleControlState;
  readonly statusText: string;
  readonly webMcpAvailable: boolean;
  readonly onApply: (profileId: string) => void;
  readonly onBenchmark: () => void;
  readonly onReset: () => void;
}

export function AgentLabPanel(props: AgentLabPanelProps) {
  const recommended = props.comparison?.recommendedProfileId;
  const profileLabel = props.capabilities?.profiles.find(({ id }) => id === recommended)?.label ?? recommended;

  return (
    <section className="overflow-hidden rounded-lg border border-gray-400 bg-background-100" aria-labelledby="agent-lab-title">
      <div className="flex flex-col gap-4 border-b border-gray-400 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-gray-500 bg-background-200 text-gray-1000">
            <Sparkles aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="agent-lab-title" className="text-copy-14 font-semibold text-gray-1000">WebMCP Agent Lab</h2>
              <span className={`inline-flex items-center gap-1.5 text-copy-12 ${props.connected ? "text-green-900" : "text-gray-800"}`}>
                <span className={`size-1.5 rounded-full ${props.connected ? "bg-green-700" : "bg-gray-600"}`} />
                {props.connected ? "Live renderer connected" : "Waiting for renderer"}
              </span>
            </div>
            <p className="mt-1 text-copy-13 text-gray-900">
              {props.webMcpAvailable
                ? "The page exposes six safe tools. Every agent change stays visible in the canvas and lil-gui."
                : "WebMCP is unavailable in this browser, but the same benchmark and reset paths remain usable here."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={props.onReset}
            disabled={!props.connected || props.running}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-500 px-3 text-copy-13 font-medium text-gray-1000 transition-colors hover:bg-background-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw aria-hidden="true" className="size-3.5" /> Reset
          </button>
          <button
            type="button"
            onClick={props.onBenchmark}
            disabled={!props.connected || props.running}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-gray-1000 px-3 text-copy-13 font-medium text-background-100 transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Gauge aria-hidden="true" className="size-3.5" /> {props.running ? "Testing…" : "Compare profiles"}
          </button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0 px-4 py-4">
          {props.benchmark ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-copy-13">
                <thead className="text-gray-800">
                  <tr className="border-b border-gray-400">
                    <th className="pb-2 font-medium">Profile</th>
                    <th className="pb-2 font-medium">Median</th>
                    <th className="pb-2 font-medium">p95</th>
                    <th className="pb-2 font-medium">Approx. FPS</th>
                    <th className="pb-2 text-right font-medium">Slow frames</th>
                  </tr>
                </thead>
                <tbody>
                  {props.benchmark.profiles.map((profile) => (
                    <tr key={profile.profileId} className="border-b border-gray-300 last:border-0">
                      <td className="py-2.5 font-medium text-gray-1000">
                        <span className="inline-flex items-center gap-2">
                          {profile.profileLabel}
                          {profile.profileId === recommended ? <Check aria-label="Recommended" className="size-3.5 text-green-900" /> : null}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-gray-1000">{profile.medianFrameMs.toFixed(2)} ms</td>
                      <td className="py-2.5 font-mono text-gray-1000">{profile.p95FrameMs.toFixed(2)} ms</td>
                      <td className="py-2.5 font-mono text-gray-1000">{profile.approximateFps.toFixed(1)}</td>
                      <td className="py-2.5 text-right font-mono text-gray-1000">{(profile.droppedFrameRatio * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-copy-12 text-gray-800">
                {props.benchmark.durationMs} ms per profile · {props.benchmark.canvas.width}×{props.benchmark.canvas.height} px · DPR {props.benchmark.canvas.dpr}. Browser frame times include display scheduling and system load.
              </p>
            </div>
          ) : (
            <div className="flex min-h-28 items-center gap-3 text-gray-800">
              <Gauge aria-hidden="true" className="size-5 shrink-0" />
              <p className="max-w-xl text-copy-13">Run a short bounded comparison here, or ask an agent to inspect the live renderer and test its declared profiles.</p>
            </div>
          )}
        </div>

        <aside className="border-t border-gray-400 bg-background-200 px-4 py-4 lg:border-t-0 lg:border-l">
          {props.comparison ? (
            <div>
              <p className="text-copy-12 font-medium tracking-wide text-gray-800 uppercase">Recommendation</p>
              <p className="mt-2 text-copy-14 font-semibold text-gray-1000">{profileLabel}</p>
              <p className="mt-1.5 text-copy-13 leading-5 text-gray-900">{props.comparison.rationale}</p>
              {!props.comparison.applied && recommended ? (
                <button type="button" onClick={() => props.onApply(recommended)} className="mt-3 text-copy-13 font-medium text-gray-1000 underline underline-offset-4">
                  Apply recommended profile
                </button>
              ) : (
                <p className="mt-3 inline-flex items-center gap-1.5 text-copy-12 text-green-900"><Check className="size-3.5" /> Applied to the live controls</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-copy-12 font-medium tracking-wide text-gray-800 uppercase">Current state</p>
              <p className="mt-2 text-copy-13 text-gray-1000">{props.state ? `${Object.keys(props.state.parameters).length} public controls` : "Connecting…"}</p>
              <p className="mt-1.5 text-copy-12 leading-5 text-gray-800">A comparison stays here after testing so the result never disappears into chat history.</p>
            </div>
          )}
        </aside>
      </div>

      <div className="flex items-center gap-2 border-t border-gray-400 px-4 py-2.5 text-copy-12 text-gray-800" aria-live="polite">
        {props.statusText.toLowerCase().includes("failed") ? <CircleAlert className="size-3.5 text-red-800" /> : <span className={`size-1.5 rounded-full ${props.running ? "animate-pulse bg-blue-700" : "bg-gray-600"}`} />}
        {props.statusText}
      </div>
    </section>
  );
}
