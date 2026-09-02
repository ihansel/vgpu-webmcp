# WebMCP security and privacy

The Agent Lab gives a browser agent narrow access to the same live state a person can already see and edit. It is progressive enhancement; every example continues to work without WebMCP.

## Exposed data

The page tools may return only:

- declared public control names, types, ranges, enum values, defaults, and profile definitions;
- current public control values;
- coarse canvas width, height, and effective device-pixel ratio;
- bounded `requestAnimationFrame` statistics: sample count, duration, median and p95 frame time, approximate FPS, and slow-frame ratio;
- a short, user-visible comparison rationale.

They do not return a GPU adapter name, device vendor, driver, limits, features, shader source, arbitrary renderer objects, screenshots, pixels, filesystem data, cookies, tokens, or unrelated page/session data.

## Trust boundaries

The example detail page owns WebMCP registration. Its live renderer remains inside a same-origin preview iframe. Every message must match the exact origin, iframe window, protocol version, example slug, active iframe session, and request id. Navigating or replacing the iframe rejects pending work; stale responses cannot resolve a request from the new renderer.

WebMCP JSON Schema constrains the public tool inputs. Runtime checks run again in the preview against the selected example's declarations. Unknown parameters, wrong types, non-finite values, out-of-range numbers, invalid enum values, duplicate profiles, excessive profile counts, and out-of-range durations are rejected before renderer state changes.

The comparison rationale is agent-supplied untrusted text. It is capped at 280 characters, rendered as React text rather than HTML, and the tool is annotated as returning untrusted content.

## Bounded benchmarking

- Duration is restricted to 500–3,000 ms per profile.
- Each example caps the profiles per call at three or four.
- Profiles are fixed declarations, not arbitrary shader or JavaScript payloads.
- Only one request handler samples a given request; cancellation aborts pending animation frames.
- A wall-clock timeout stops sampling when the tab is throttled or not visible.
- Starting public settings are restored after success, cancellation, or sampling failure.
- Results explicitly state that they include display scheduling and system load and are not raw GPU timings.

## Recovery and lifecycle

Reset is always available in the visible Agent Lab panel and as a WebMCP tool. Manual `lil-gui` controls remain live after agent actions. The preview bridge aborts work and removes listeners on unmount. Each renderer retains its existing idempotent GPU, frame-loop, resize, input, and GUI cleanup behavior. Missing WebGPU, device initialization failure, preview error, timeout, cancellation, and navigation return concise actionable errors rather than partial success.

## Verification checklist

- Exact-origin and exact-iframe-window rejection.
- Request, session, slug, and protocol correlation.
- Stale navigation response rejection.
- Schema shape and runtime range/enum rejection.
- Manual-to-agent and agent-to-manual state synchronization.
- Benchmark count/duration bounds, timeout, cancellation, and starting-state restoration.
- Renderer cleanup and late WebGPU initialization disposal.
- No large or fingerprinting-oriented output fields.
