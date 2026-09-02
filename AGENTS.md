# vGPU WebMCP project instructions

## Mission

Build a WebMCP-powered WebGPU laboratory where a browser agent can inspect, configure, benchmark, and explain a live vGPU example running on the user's actual browser and GPU while the user watches and retains control.

The core story is the difference between knowing about vGPU and collaborating with a live vGPU page. vGPU's existing conventional MCP searches documentation and verified examples; this project adds access to current-tab runtime state, visible controls, and bounded browser performance experiments.

## Upstream and attribution

The primary upstream is `https://github.com/vercel-labs/vgpu` and is MIT licensed. Before making changes, record the exact upstream revision and preserve its license and notices. Clearly identify the WebMCP bridge, runtime-control adapters, comparison UI, tests, and documentation added for the hackathon.

Prefer a focused fork that could plausibly be contributed upstream. Do not rebuild vGPU or its example gallery.

## MVP scope

WebMCP-enable two or three examples with complementary value:

- FFT ocean surface for a visually strong, parameterized creative result.
- Anti-aliasing for a concrete quality/performance comparison.
- Instanced rendering, transmission, or another bounded example for a second performance or visual-control case.

Use a shared control contract, but allow each example to declare its own supported parameters, ranges, enums, actions, reset behavior, and benchmark profiles. Existing visible controls and WebMCP must operate on the same underlying state.

Do not make arbitrary WGSL or JavaScript execution part of the critical path. Do not expose unrestricted source editing through WebMCP.

## Hero journey

The preferred demonstration is:

> This ocean should look like a storm developing at dusk, but it still needs to run smoothly on this laptop. Try a few safe quality profiles, keep it close to 60fps, choose the best one, and show me the result.

The agent should inspect capabilities and current state, establish a baseline, run a short bounded comparison, select a profile, adjust the visible ocean controls, and show a concise comparison explaining its decision.

An alternate deterministic journey is:

> Compare Off, MSAA, SSAA, and FXAA at the current canvas size. Choose the smoothest option that remains near 60fps and apply it.

## Architecture

The example detail page should register WebMCP tools early. Because the live preview is a same-origin iframe, use a small typed message bridge between the parent page and the active renderer. Each enabled renderer should implement a narrow adapter such as:

- Describe capabilities and schemas.
- Read current public state.
- Apply a validated batch of control changes.
- Reset to declared defaults.
- Execute a finite benchmark profile.
- Dispose all listeners and resources with the renderer.

Likely WebMCP tools include `search_vgpu_examples`, `open_vgpu_example`, `get_example_capabilities`, `get_example_state`, `set_example_controls`, `reset_example`, `benchmark_example`, and `create_comparison`.

Use stable tool schemas and bounded structured results. Tool calls must update the real visible controls and canvas rather than a shadow state.

## Performance, privacy, and safety

- Benchmark only the active page with fixed, short durations and hard upper bounds.
- Report frame-time distributions and dropped-frame indicators rather than claiming laboratory-grade results.
- Avoid exposing detailed adapter identifiers or other unnecessary fingerprinting data. Coarse capability and performance results are sufficient.
- Validate all parameters against example-declared ranges and enums.
- Keep reset available and preserve manual control after every agent action.
- Avoid transferring screenshots or large pixel buffers through tool results; show captures and comparisons in the page when needed.
- Recover from missing WebGPU, device loss, unsupported formats, iframe navigation, cancellation, and renderer disposal.

## Engineering expectations

- Inspect the latest upstream example and MCP architecture before adding abstractions.
- Reuse existing example state and `lil-gui` controls instead of automating their DOM.
- Keep the bridge small, typed, origin-checked, lifecycle-safe, and independently testable.
- Make benchmark methodology visible and reproducible.
- Add focused tests for schemas, messages, validation, lifecycle cleanup, state synchronization, benchmarks, and WebMCP handlers.
- Verify the complete flow in a real WebGPU and WebMCP-capable browser.
- Preserve unrelated upstream behavior and user changes.

## Hackathon delivery

The finished project needs a live application, public repository and license, a clear statement of upstream versus new work, a concise explanation of conventional MCP versus WebMCP, and a public demonstration video under three minutes with audio.

The shared research is in `../knowledge/`, especially:

- `../knowledge/concepts/hackathon-brief.md`
- `../knowledge/concepts/webmcp-technical-primer.md`
- `../knowledge/decisions/project-guardrails.md`

## Definition of done

The project is done when a WebMCP-capable agent can discover the current example's real controls, run a finite browser benchmark, apply validated settings to the same visible state the user controls, and explain a comparison—without arbitrary code execution, hidden shadow state, or unbounded GPU work.
