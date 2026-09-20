# Mossvale — Phase 1

A no-build, primitive-geometry combat prototype. No progression, rewards, inventory, persistence, or audio is included.

From the repository root, run:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000 in a desktop browser. An internet connection is needed for the pinned Three.js 0.170.0 ES module on jsDelivr. No npm install or build step is needed.

Select **Enter the clearing**. Move and face with WASD or arrows; hold Space or the left mouse button to repeat timed sword swings. Movement sets facing; the direction is locked during a swing. The sword hits targets whose centers are within 2.05 world units and a 140.4° arc. Step away when Bramble's orange attack ring appears. Press R after defeat, or use Try again. Losing canvas/window focus pauses; use the resume button to continue.

## Tests

Using Node.js 22 or newer:

```powershell
node tests/simulation.test.mjs
```

Browser integration checks are at http://127.0.0.1:8000/tests/browser.html (same HTTP server). These exercise actual game input listeners, the animation loop, rendering, HUD, pause, and repeated restarts. The fixture is separate from the normal game and adds no production controls or global state.

## Structure

- `src/core`: lifecycle, fixed-step loop, event bus, silent audio boundary.
- `src/data`: centralized balance and arena definitions.
- `src/state`, `src/systems`, `src/world`: plain state, combat/AI/movement, collision/spawning.
- `src/input`: named keyboard/pointer actions and focus cleanup.
- `src/rendering`, `src/ui`: Three.js views and DOM HUD.
- `tests`: deterministic logic and browser integration checks.

The camera is fixed in orientation and follows smoothly. The creature uses direct pursuit and obstacle sliding, not pathfinding, and can be temporarily blocked by scenery. Rendering uses the latest fixed-step state; camera smoothing is independent. All art is original procedural geometry. See `PROJECT_PLAN.md` for verification status.
