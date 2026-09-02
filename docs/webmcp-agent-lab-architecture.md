# vGPU WebMCP Agent Lab architecture

## Upstream baseline

- Repository: `https://github.com/vercel-labs/vgpu`
- Branch inspected: `main`
- Base commit: `671d1be9ea0128f0243292710255800808e71b49`
- Commit date: 2026-09-01T10:18:08-03:00
- Commit subject: `Merge pull request #382 from ColinL-code/fix/webpack-real-test-macos-realpath`

The MIT `LICENSE`, existing vGPU packages, examples, documentation, example gallery, and conventional MCP endpoint are retained. The WebMCP lab is a focused browser-side extension of the example detail and preview paths.

## Existing flow

1. `app/[lang]/examples/[slug]/page.tsx` resolves an example from the generated registry and renders `ExamplePreview` plus its source viewer.
2. `ExamplePreview` embeds the same-origin `/preview/[slug]` route in an iframe and already accepts origin-checked renderer error messages.
3. `app/preview/[slug]/example-canvas.tsx` lazy-loads the registry entry component and owns preview-level error handling.
4. Each example component mounts its own renderer. The renderer owns the WebGPU context, frame loop, responsive surface, `lil-gui`, and cleanup.
5. The hosted conventional MCP endpoint at `/api/mcp` delegates to `@vgpu/cli`. It searches and reads deployed documentation and verified example artifacts; it does not know the current tab's live renderer state.

## Added WebMCP flow

```text
browser agent
  -> detail-page WebMCP tools
  -> parent bridge (request id + iframe generation + timeout/abort)
  -> same-origin postMessage
  -> preview host bridge
  -> selected example's narrow control adapter
  -> renderer state also bound to lil-gui and canvas
  -> bounded structured result + visible activity/comparison UI
```

The parent registers a compact, stable tool set as soon as the detail page mounts. Renderer-dependent calls wait briefly for the active preview handshake rather than registering tools late. The preview creates a new session identifier on every navigation. Requests and responses include the example slug, session identifier, request identifier, and protocol version; the parent rejects wrong origins, wrong windows, old sessions, unknown requests, and late responses.

## Shared control contract

An enabled example declares:

- public parameters with number/boolean/enum type, label, default, and optional range/step;
- named benchmark profiles containing validated public settings;
- supported actions: inspect, set a validated batch, reset, benchmark, and cancel;
- current public state and coarse canvas size;
- a bounded benchmark result containing sample count, duration, median and p95 frame time, approximate FPS, dropped-frame ratio, and caveats.

Each renderer exposes only a narrow adapter. The adapter is created beside the renderer so it can use the exact mutable objects already bound to `lil-gui`; no DOM clicking or private GPU object traversal is involved. Setting changes update the mutable state, refresh the existing GUI controllers, and affect the next rendered frame. Manual GUI changes update the same object and emit state to the parent.

## Benchmark method

Benchmarks use `requestAnimationFrame` timestamps in the live visible preview. Each requested profile receives a short warm-up followed by a fixed sampling interval. Input durations are clamped to the declared minimum and hard maximum, profiles are capped per call, one benchmark runs at a time, and an abort request stops pending animation frames. Results are observational browser frame-time distributions—not laboratory GPU timings—and explicitly note display refresh, background throttling, other browser/system work, and that results should be compared only within the same active canvas session.

The comparison tool stores its concise conclusion in the detail page. That result remains visible while the renderer continues running, and applying a selected profile uses the same validated setting path as manual controls.

## Security and privacy boundaries

- Same-origin messages only, with exact iframe-window checks in the parent.
- Protocol, slug, session, request correlation, timeout, cancellation, and disposal checks.
- Schema validation in WebMCP handlers and again against renderer-declared parameter definitions.
- No source execution, arbitrary WGSL/JavaScript, DOM automation, screenshots, pixel buffers, filesystem access, network proxying, or detailed GPU/adapter identifiers.
- Fixed benchmark profiles, short durations, a hard profile-count cap, and one active run.
- Reset remains available and the user's visible controls remain editable after every tool call.
- Missing WebGPU, device loss, preview navigation, timeout, cancellation, and renderer disposal return bounded actionable errors.

## New-work boundary

Hackathon-specific work is isolated to the browser control contract and bridge, WebMCP registrations, activity/comparison UI, adapters for `fft-ocean-surface` and `anti-aliasing`, focused tests, and the accompanying security, submission, and demo documentation. Conventional MCP remains separate and unchanged.
