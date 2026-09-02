# Hackathon submission copy

- **Live application:** <https://vgpu-webmcp.vercel.app/examples/fft-ocean-surface>
- **Public repository:** <https://github.com/ihansel/vgpu-webmcp>
- **Narrated demo (1:42):** <https://vgpu-webmcp.vercel.app/webmcp-agent-lab-demo.mp4>

## Project name

vGPU WebMCP Agent Lab

## One-line summary

A browser agent and graphics developer can tune and benchmark the same live WebGPU scene together—on the user's real machine, with every change visible and reversible.

## The problem

WebGPU quality choices are contextual. A code example can explain MSAA or an FFT ocean, but it cannot know how the current canvas is configured, what the user just changed, or how several safe profiles behave in the user's live browser. Developers normally bounce between documentation, controls, performance tooling, and guesswork.

## What we built

We extended the open-source vGPU example gallery with a WebMCP Agent Lab. On the FFT ocean surface and anti-aliasing examples, an agent can discover declared public controls, inspect current state, apply a validated batch of changes, reset defaults, run a short reproducible profile comparison, and publish a recommendation that stays visible next to the running canvas. The person watches the same `lil-gui` controls update and can adjust or reset them at any time.

The hero prompt is: “This ocean should look like a storm developing at dusk, but it still needs to run smoothly on this laptop. Try a few safe quality profiles, keep it close to 60fps, choose the best one, and show me the result.”

The deterministic alternate is: “Compare Off, MSAA, SSAA, and FXAA at the current canvas size. Choose the smoothest option that remains near 60fps and apply it.”

## Why WebMCP is essential

The existing conventional vGPU MCP is excellent for searching documentation and verified example source. It is intentionally not connected to the user's current tab. WebMCP closes that last mile: tools live with the active page, reuse its real renderer state, and make human and agent actions converge on one visible artifact. This is not more reliable clicking; there is no DOM automation. It is a typed, narrow collaboration surface over application logic.

## Implementation

The detail page registers six imperative WebMCP tools through `document.modelContext`. A same-origin, origin-checked iframe bridge correlates each request with a protocol version, example slug, preview session, and request id. Enabled renderers expose a narrow controller backed by the exact objects used by `lil-gui` and the canvas. The shared preview host validates every setting against declared types, ranges, and enums and performs bounded `requestAnimationFrame` comparisons with cancellation, timeout, and state restoration.

The tools never expose arbitrary shader/JavaScript execution, private renderer internals, pixel buffers, screenshots, filesystem access, or detailed GPU identifiers. Results describe browser frame delivery—not laboratory GPU timing—and include their limitations.

## Upstream and new work

This project is a focused fork of `vercel-labs/vgpu`, based on commit `671d1be9ea0128f0243292710255800808e71b49` and licensed under MIT. The existing library, documentation, example gallery, conventional MCP server, license, and notices are preserved. New hackathon work comprises the WebMCP control contract, correlated iframe bridge, page-tool registrations, persistent Agent Lab comparison UI, two example adapters, focused tests, and submission documentation.

## Judging evidence

- **WebMCP leverage:** six non-overlapping live-page tools, shared state, batched validated changes, bounded local experiments, and a visible human-agent handoff.
- **Execution:** two complete examples, progressive enhancement, lifecycle and error recovery, persistent results, manual controls, focused automated tests, and a production build.
- **Impact:** helps WebGPU learners and graphics developers turn abstract quality advice into a safe choice for the actual browser and canvas in front of them.
- **Creativity and ambition:** combines generative visual direction, live browser state, and short controlled performance experiments in a workflow that a standalone docs agent cannot perform.

## Setup for judges

No account or test credentials are required. Open an enabled example at <https://vgpu-webmcp.vercel.app> using ChatGPT's supported in-app browser or Chrome 149+ with WebMCP testing enabled. WebGPU and a secure context are required for the renderer; the site remains usable without WebMCP.
