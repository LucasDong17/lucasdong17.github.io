# First Codex Implementation Prompt

Read `AGENTS.md` and `PROJECT_PLAN.md` completely before making changes. Then implement **only Phase 1 — Vertical Slice / Core Loop**. Do not implement or stub Phase 2 features such as XP, coins, loot, inventory, equipment, consumables, level-ups, quests, crafting, saving, or multiple enemy types.

Build a no-bundler browser prototype using Three.js as a pinned CDN ES module, plain JavaScript modules, HTML, and CSS. It must run from a simple static HTTP server. Create only the project folders needed for this slice and keep gameplay state separate from Three.js rendering objects.

## Required playable scene

Render a full-window, colorful low-poly grassland arena containing:

- a clearly identifiable player made from primitive geometry;
- one hostile training creature made from primitive geometry;
- a ground plane, visible arena boundary, and at least three solid obstacles (rocks or trees);
- an angled third-person camera that smoothly follows the player while keeping nearby combat readable;
- a minimal HUD showing player health, the engaged enemy's health, attack cooldown/readiness, and controls;
- a visible melee swing/hit effect and obvious player/enemy damage feedback.

Do not use copyrighted assets from the screenshots. Procedural geometry, canvas textures, CSS, and original SVG placeholders are preferred.

## Input bindings

- Move: `W`, `A`, `S`, `D` and arrow-key equivalents.
- Primary melee attack: left mouse button or `Space`.
- Restart after player defeat: `R`.
- Prevent the Space/arrow keys from scrolling only while the game canvas is focused.
- Pause/clear held input on window blur or document visibility loss so movement never sticks.

Movement is relative to the ground plane, diagonal speed is normalized, and the player must not pass through the arena boundary or solid obstacles.

## Core behavior

- Give the player a short-range melee attack with explicit wind-up, active, and recovery/cooldown stages.
- A swing may damage the enemy at most once and only if it is alive, within range, and inside the attack arc during the active stage.
- Give the enemy a minimal state machine: idle until the player is near, chase, then contact attack with its own cooldown.
- Both actors have health. On zero health, the player enters a defeat state and the enemy plays/displays defeat, becomes inactive, then respawns after a short delay at a valid spawn point.
- `R` must fully reset the run after player defeat without reloading the page, duplicating listeners, or starting another animation loop.
- Use a fixed-timestep simulation and a separate render pass; clamp excessive elapsed time after tab suspension.

## Acceptance criteria — all must pass before stopping

1. From the repository root, the game launches via a documented simple static-server command and loads in a modern browser with no console errors or failed essential assets.
2. WASD and arrow keys move the player smoothly; opposite keys cancel; diagonal movement is not faster than cardinal movement.
3. The player remains within bounds and cannot cross any of the three solid obstacles, including when moving diagonally along them.
4. Left click and Space trigger the same readable melee action. Holding either does not bypass the cooldown.
5. Attacks miss outside range/arc, hit inside range/arc, and never apply more than one damage event per swing.
6. The enemy idles, detects, chases, attacks on cooldown, takes damage, is defeated, and respawns cleanly.
7. Player health reaches zero through enemy attacks; movement/attacks stop in defeat state; `R` restores a clean playable state.
8. Losing focus clears held input and pauses safely; returning does not cause a time jump, stuck movement, or burst of attacks.
9. HUD health/cooldown values accurately reflect game state and remain legible at 1280×720 and wider desktop viewports.
10. Repeating enemy respawn and player restart several times produces no duplicate event handling, extra game loops, or stale entities.

Before handing off, run available focused tests for deterministic logic and perform a browser play-through against every criterion. Fix failures within Phase 1 scope. In your final response, list created files, the exact launch command, what you verified, and any remaining Phase 1 limitation. Do not claim Phase 1 complete if an acceptance criterion was not tested; identify it plainly instead.
