# Kickoff prompt: build the vGPU WebMCP Agent Lab

Work in this vGPU WebMCP project and follow its `AGENTS.md` completely.

Build a focused, hackathon-ready fork of the current `vercel-labs/vgpu` project that adds WebMCP control and bounded runtime benchmarking to selected live examples. Preserve the existing library, documentation, conventional MCP server, example gallery, license, and attribution.

Start by inspecting the latest upstream source and recording the base commit. Trace the example detail page, preview iframe, renderer lifecycle, existing `lil-gui` state, example registry, and conventional MCP implementation. Write a short architecture note before implementing the smallest typed bridge that lets the parent WebMCP page communicate with an enabled renderer.

Implement a shared example-control contract and adapt the FFT ocean surface and anti-aliasing examples first. Add a third example only after both primary journeys work reliably. Capabilities must declare parameter types, ranges, enums, defaults, benchmark profiles, and supported actions. The visible controls, canvas, and WebMCP tools must share one source of truth.

Register a compact set of meaningful WebMCP tools early. Support current-state inspection, validated batched setting changes, reset, and short reproducible benchmark comparisons. Do not use DOM clicking as the implementation, expose private renderer internals, transmit large pixel buffers, reveal unnecessary GPU identifiers, or permit arbitrary shader or JavaScript execution.

Create an in-page comparison result that remains visible after the agent tests profiles. Report median and percentile frame times, sample duration, canvas size, and important caveats. The agent should be able to apply the winning profile while the user can continue adjusting or reset it manually.

Verify both hero requests in `AGENTS.md` in a real WebGPU and WebMCP-capable browser. Test origin validation, message correlation, stale iframe responses, parameter schemas, range rejection, state synchronization, renderer cleanup, cancellation, device failure, and bounded benchmark behavior.

Finish the live deployment, upstream attribution, security and privacy explanation, conventional-MCP-versus-WebMCP narrative, hackathon submission copy, and an under-three-minute demo script. Optimize for a spectacular and dependable vertical slice, not support for every example.
