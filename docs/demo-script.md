# Demo script — 2 minutes 40 seconds

## 0:00–0:18 — Set up the contrast

“vGPU already has a conventional MCP server that helps coding agents find documentation and verified examples. But it cannot see the scene running in this tab. WebMCP turns the page itself into a safe live collaborator.”

Show the FFT ocean surface running, its existing `lil-gui`, and the Agent Lab panel directly below it.

## 0:18–0:38 — Prove live discovery

Prompt the agent:

> Inspect this live ocean. Tell me which controls and safe benchmark profiles are available, then summarize its current state.

Briefly show the tool activity line changing. Point out that the returned state includes only public controls and canvas size—not a GPU name or private renderer data.

## 0:38–1:32 — Run the hero journey

Prompt:

> This ocean should look like a storm developing at dusk, but it still needs to run smoothly on this laptop. Compare the safe profiles at the current canvas size, keep it close to 60fps, choose the best one, apply it, and show me why.

Keep the canvas visible while Performance, Balanced, and Storm at dusk run sequentially. Show `lil-gui` and the ocean changing together. When the agent creates the comparison, point out median, p95, sample duration, canvas size, slow-frame ratio, and the persistent recommendation.

“The benchmark is deliberately short and bounded. It measures browser frame delivery, restores the starting state after testing, and only applies the winner after the decision.”

## 1:32–1:52 — Human remains in control

Manually adjust wind speed or sun elevation in `lil-gui`; show the live state staying synchronized. Click Reset, then use “Apply recommended profile” if the agent left the result unapplied.

“Agent and person use one state path. There is no hidden shadow model and no DOM clicking.”

## 1:52–2:24 — Deterministic second example

Open Anti-Aliasing and prompt:

> Compare Off, MSAA 4×, SSAA 2×, and FXAA at this canvas size. Choose the smoothest option that remains near 60fps and apply it.

Show all four measured rows and the mode changing in the existing control panel.

## 2:24–2:40 — Close on architecture and safety

Show the architecture diagram or README table.

“Conventional MCP teaches the agent about vGPU. WebMCP lets the person and agent collaborate with the live vGPU page. The bridge is same-origin and correlated, settings are schema-validated, experiments are bounded and cancellable, and no arbitrary code, pixels, or detailed GPU identifiers leave the renderer.”
