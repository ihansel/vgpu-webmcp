import { afterEach, expect, test, vi } from "vitest";
import { registerAgentLabTools } from "./register-tools";

afterEach(() => vi.unstubAllGlobals());

test("registers the compact six-tool surface with bounded schemas and unregisters by abort", async () => {
  const tools: Array<{ tool: VgpuModelContextTool; signal?: AbortSignal }> = [];
  vi.stubGlobal("document", {
    modelContext: {
      registerTool: vi.fn(async (tool: VgpuModelContextTool, options?: { signal?: AbortSignal }) => {
        tools.push({ tool, signal: options?.signal });
      }),
    },
  });
  const cleanup = registerAgentLabTools({
    bridge: { request: vi.fn(), destroy: vi.fn() },
    slug: "anti-aliasing",
    onActivity: vi.fn(),
    onBenchmark: vi.fn(),
    onComparison: vi.fn(),
    getCapabilities: () => undefined,
    getLastBenchmark: () => undefined,
  });
  await vi.waitFor(() => expect(tools).toHaveLength(6));
  expect(tools.map(({ tool }) => tool.name)).toEqual([
    "get_example_capabilities",
    "get_example_state",
    "set_example_controls",
    "reset_example",
    "benchmark_example",
    "create_comparison",
  ]);
  const benchmark = tools.find(({ tool }) => tool.name === "benchmark_example")!.tool.inputSchema;
  expect(benchmark).toMatchObject({
    additionalProperties: false,
    properties: {
      durationMs: { minimum: 500, maximum: 3000 },
      profileIds: { minItems: 1, maxItems: 4, uniqueItems: true },
    },
  });
  cleanup();
  expect(tools.every(({ signal }) => signal?.aborted)).toBe(true);
});
