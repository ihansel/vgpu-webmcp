import { ControlContractError, isRecord, profileById, type BenchmarkResult, type ExampleControlCapabilities, type ExampleControlState } from "./control-contract";
import type { ParentPreviewBridge } from "./parent-bridge";

export interface VisibleComparison {
  readonly applied: boolean;
  readonly createdAt: string;
  readonly rationale: string;
  readonly recommendedProfileId: string;
}

interface RegisterToolsOptions {
  readonly bridge: ParentPreviewBridge;
  readonly slug: string;
  readonly onActivity: (label: string, state: "error" | "running" | "success") => void;
  readonly onBenchmark: (result: BenchmarkResult) => void;
  readonly onComparison: (comparison: VisibleComparison) => void;
  readonly getCapabilities: () => ExampleControlCapabilities | undefined;
  readonly getLastBenchmark: () => BenchmarkResult | undefined;
}

export function registerAgentLabTools(options: RegisterToolsOptions): () => void {
  const modelContext = document.modelContext;
  if (!modelContext) return () => {};
  const registration = new AbortController();

  const run = async <T>(label: string, task: () => Promise<T>): Promise<T> => {
    options.onActivity(label, "running");
    try {
      const result = await task();
      options.onActivity(label, "success");
      return result;
    } catch (error) {
      options.onActivity(label, "error");
      throw error;
    }
  };

  const emptySchema = { type: "object", properties: {}, additionalProperties: false };
  const registrations = [
    modelContext.registerTool({
      name: "get_example_capabilities",
      title: "Inspect live vGPU controls",
      description: "Describe the current live vGPU example's public controls, ranges, defaults, safe benchmark profiles, limits, and supported actions.",
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (_input, { signal }) => run("Inspecting capabilities", () => options.bridge.request("describe", {}, signal) as Promise<ExampleControlCapabilities>),
    }, { signal: registration.signal }),
    modelContext.registerTool({
      name: "get_example_state",
      title: "Read live vGPU state",
      description: "Read the actual public control values and canvas size for the live example shown in this tab.",
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (_input, { signal }) => run("Reading live state", () => options.bridge.request("get_state", {}, signal) as Promise<ExampleControlState>),
    }, { signal: registration.signal }),
    modelContext.registerTool({
      name: "set_example_controls",
      title: "Adjust live vGPU controls",
      description: "Apply a validated batch of public control changes to the visible renderer and its lil-gui panel. Inspect capabilities first for accepted names and ranges.",
      inputSchema: {
        type: "object",
        properties: {
          changes: {
            type: "object",
            description: "Control names mapped to number, boolean, or enum values declared by get_example_capabilities.",
            minProperties: 1,
            maxProperties: 16,
            additionalProperties: { type: ["number", "boolean", "string"] },
          },
        },
        required: ["changes"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input, { signal }) => run("Applying control changes", async () => {
        if (!isRecord(input.changes)) throw new ControlContractError("INVALID_INPUT", "changes must be an object");
        return options.bridge.request("set_controls", { changes: input.changes }, signal);
      }),
    }, { signal: registration.signal }),
    modelContext.registerTool({
      name: "reset_example",
      title: "Reset live vGPU example",
      description: "Reset every public control in the visible example to its declared default while keeping manual controls available.",
      inputSchema: emptySchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (_input, { signal }) => run("Resetting the example", () => options.bridge.request("reset", {}, signal)),
    }, { signal: registration.signal }),
    modelContext.registerTool({
      name: "benchmark_example",
      title: "Compare vGPU profiles",
      description: "Run a short, sequential frame-time comparison of declared profiles in the visible canvas, restore the starting state, and return bounded median and p95 results.",
      inputSchema: {
        type: "object",
        properties: {
          profileIds: {
            type: "array",
            description: "One or more unique profile ids from get_example_capabilities.",
            items: { type: "string", maxLength: 64 },
            minItems: 1,
            maxItems: 4,
            uniqueItems: true,
          },
          durationMs: {
            type: "number",
            description: "Sampling time per profile. The example declares the accepted bounded range.",
            minimum: 500,
            maximum: 3000,
          },
        },
        required: ["profileIds"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input, { signal }) => run("Benchmarking live profiles", async () => {
        if (!Array.isArray(input.profileIds)) throw new ControlContractError("INVALID_INPUT", "profileIds must be an array");
        const result = await options.bridge.request("benchmark", {
          profileIds: input.profileIds,
          durationMs: input.durationMs,
        }, signal) as BenchmarkResult;
        options.onBenchmark(result);
        return result;
      }),
    }, { signal: registration.signal }),
    modelContext.registerTool({
      name: "create_comparison",
      title: "Show benchmark decision",
      description: "Keep a concise recommendation from the latest benchmark visible beside the live example and optionally apply that tested profile.",
      inputSchema: {
        type: "object",
        properties: {
          recommendedProfileId: { type: "string", maxLength: 64, description: "A profile id included in the latest benchmark." },
          rationale: { type: "string", minLength: 1, maxLength: 280, description: "A concise explanation grounded in the measured frame times and visual goal." },
          apply: { type: "boolean", description: "Apply the recommended tested profile. Defaults to true." },
        },
        required: ["recommendedProfileId", "rationale"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input, { signal }) => run("Publishing the comparison", async () => {
        const latest = options.getLastBenchmark();
        if (!latest) throw new ControlContractError("NO_BENCHMARK", "Run benchmark_example before creating a comparison");
        if (typeof input.recommendedProfileId !== "string" || !latest.profiles.some(({ profileId }) => profileId === input.recommendedProfileId)) {
          throw new ControlContractError("UNTESTED_PROFILE", "The recommendation must name a profile from the latest benchmark");
        }
        if (typeof input.rationale !== "string" || input.rationale.trim().length === 0 || input.rationale.length > 280) {
          throw new ControlContractError("INVALID_RATIONALE", "rationale must contain 1 to 280 characters");
        }
        const capabilities = options.getCapabilities();
        if (!capabilities) throw new ControlContractError("PREVIEW_NOT_READY", "Capabilities are not available yet");
        profileById(capabilities, input.recommendedProfileId);
        const apply = input.apply !== false;
        if (apply) await options.bridge.request("apply_profile", { profileId: input.recommendedProfileId }, signal);
        const comparison: VisibleComparison = {
          recommendedProfileId: input.recommendedProfileId,
          rationale: input.rationale.trim(),
          applied: apply,
          createdAt: new Date().toISOString(),
        };
        const state = apply ? await options.bridge.request("get_state", {}, signal) : undefined;
        options.onComparison(comparison);
        return { ...comparison, state };
      }),
    }, { signal: registration.signal }),
  ];

  void Promise.all(registrations).catch((error: unknown) => {
    if (!registration.signal.aborted) console.error("vGPU WebMCP tool registration failed", error);
  });
  return () => registration.abort();
}
