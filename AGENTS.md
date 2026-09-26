# AGENTS.md

## Product Direction

Build a browser-based, low-poly action RPG inspired by the supplied screenshots: an angled third-person camera, a colorful grassland, readable melee combat, enemy drops, and gradual character progression. Treat the screenshots as visual and systems references, not assets to copy. `raw_game_ideas.md` is currently empty; when it gains content, reconcile it with this document and record meaningful scope changes in `PROJECT_PLAN.md`.

## Architecture and Stack

- Use Three.js as an ES module loaded from a pinned public CDN URL. Do not introduce npm, a bundler, TypeScript, a framework, or a physics engine without explicit approval and a documented need.
- The app must run from a simple local static server and in current desktop Chrome, Edge, Firefox, and Safari. Do not rely on `file://` module loading.
- Use HTML/CSS for menus and HUD; use WebGL/Three.js for the game world. Keep UI independent from world rendering.
- Use a fixed-timestep simulation with a separate render pass. Clamp large frame deltas after tab suspension.
- Prefer simple sphere/capsule/box collision and data-driven entities over a general-purpose physics solution.
- Keep authoritative gameplay state in plain JavaScript modules. Three.js scene objects are views of state, never the source of truth.

### Architectural boundaries

- `Game` owns startup, pause/resume, and the main loop.
- `World` owns level bounds, static obstacles, spawn points, and collision queries.
- `Input` converts keyboard/pointer events into named actions; gameplay code must not read raw key codes.
- Systems update state: movement, combat, AI, pickups, progression. Systems do not manipulate the DOM.
- Renderers synchronize state to Three.js and HUD elements. Renderers do not decide damage, drops, or progression.
- Static balance/content values live in data modules, not scattered magic numbers.
- Use a small event bus for discrete events such as `attackStarted`, `damageTaken`, `enemyDefeated`, `pickupCollected`, and `playerDied`. Do not use it for per-frame position updates.
- Reserve sound hooks at event boundaries. Missing audio must never break gameplay.

## Project Structure

```text
/
├── index.html
├── AGENTS.md
├── PROJECT_PLAN.md
├── FirstPrompt.md
├── raw_game_ideas.md
├── css/
│   └── main.css
├── src/
│   ├── main.js
│   ├── core/          # Game loop, constants, event bus
│   ├── input/         # Action mappings and pointer/keyboard state
│   ├── state/         # Game, player, progression, inventory state
│   ├── world/         # Arena data, obstacles, collision/spawning
│   ├── entities/      # Player/enemy/pickup factories and components
│   ├── systems/       # Movement, combat, AI, pickups, progression
│   ├── rendering/     # Three.js scene, camera, visual sync/effects
│   ├── ui/            # HUD and menu presenters
│   └── data/          # Enemy, item, level, and balance definitions
├── assets/
│   ├── audio/
│   ├── images/
│   └── models/
└── tests/             # Focused deterministic logic tests when added
```

Create only the directories needed by the current phase. Keep filenames lowercase with hyphens, except established entry files.

## Coding Standards

- Use modern, readable JavaScript ES modules with semicolons and consistent two-space indentation.
- Prefer small functions and composition over deep inheritance. Entity behavior should be assembled from state/components and systems.
- Keep mutable state explicit. Do not attach gameplay fields ad hoc to meshes.
- Make tuning values named and centralized. Use seeded randomness where a repeatable test depends on random outcomes.
- Store world positions in the ground plane (`x`, `z`); use `y` for height only.
- Normalize diagonal movement and make movement frame-rate independent.
- Register browser listeners once and provide teardown methods. Prevent default browser behavior only for bound game controls while the canvas is focused.
- Support keyboard and pointer input from the first slice. Maintain an action map so gamepad/touch can be added later without rewriting systems.
- Keep sound calls behind an audio service with no-op-safe methods. Audio starts only after a user gesture.
- Avoid global variables other than the single boot entry. Do not put executable gameplay logic in `index.html`.
- Add comments for intent, invariants, and non-obvious tradeoffs—not line-by-line narration.
- Preserve compatibility with saved state/data schemas once introduced; add migrations or safe defaults rather than silently breaking them.

## Scope and Delivery Rules

- Work only on the active phase and the specifically requested acceptance criteria. Never implement a later-phase system “while here.”
- Deliver the smallest playable increment. One enemy, one attack, one arena, and placeholder geometry are correct for Phase 1.
- Do not add inventory, loot tables, equipment, quests, crafting, shops, multiple levels, bosses, dialogue, multiplayer, or persistence during Phase 1.
- Keep extension seams small and concrete. Do not build speculative abstractions or unused configuration.
- Preserve existing controls and behavior unless the task explicitly changes them. Document intentional breaking changes.
- Test each mechanic in isolation, then run a short end-to-end play check. Fix regressions before starting new scope.
- Every change must leave the game launchable and playable. No phase advances until the current phase acceptance criteria pass.
- If requirements conflict or source notes are ambiguous, favor the narrower interpretation and record assumptions in the plan or handoff.

## Asset Handling

- During prototyping, use Three.js primitives, procedural low-poly geometry, canvas-generated textures, CSS, and original lightweight SVGs.
- Prefer local assets once custom art is supplied. Until then, CDN placeholders must be public, stable, attribution-compatible, and nonessential to startup.
- Do not copy imagery, branding, UI art, characters, or audio from the reference game/screenshots.
- Optimize imported assets: compressed images, reasonable texture sizes, low polygon counts, and compressed audio. Provide fallbacks for load failure.
- Keep asset paths relative and centralize them in an asset manifest when real assets are introduced.

## Verification and Handoff

- Serve the repository over HTTP (for example, `python -m http.server 8000`) and test the actual browser build.
- Check the browser console for errors, resize behavior, focus loss, repeated restart, and input cleanup.
- For gameplay changes, report what was manually verified and any known limitation.
- Update `PROJECT_PLAN.md` only when status, scope, assumptions, or acceptance criteria genuinely change.

