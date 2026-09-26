# Mossvale — Wildfront

A no-build browser action RPG with a persistent safe haven, two 50-wave biomes, scaling multi-animal encounters, equipment drops, and duplicate-item upgrades.

From the repository root, run:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000 in a desktop browser. An internet connection is needed for the pinned Three.js 0.170.0 ES module on jsDelivr. No package install or build step is needed.

Enter the medieval safe-haven courtyard, then walk forward into the blue Play portal to choose a biome, a checkpoint, or **Start Here** at the highest wave you have played. Walk left into the purple Upgrade circle to combine two identical items of the same level. Move with WASD or arrows, attack with Space or left click, and hold E near a drop to collect it. The **Spawn** HUD button returns you to the haven during any wave so you can upgrade. Inventory, equipped gear, upgrades, discoveries, highest waves, checkpoints, and biome completion save automatically. Death returns you to the haven with all gear intact.

Mossvale Meadow is available immediately. Its checkpoints unlock after reaching waves 10, 20, 30, 40, and 50. Defeat the Crowned Colossus on wave 50 to unlock Frostfang Tundra, which now has its own crystal-and-ice arena layout as well as its own roster, gear sets, checkpoints, and final boss.

## Tests

Using Node.js 22 or newer:

```powershell
node tests/simulation.test.mjs
```

The deterministic suite covers portals, enemy scaling, combat, drops, equipment, upgrades, persistence, death, checkpoints, and biome unlocking. Browser integration checks remain available at http://127.0.0.1:8000/tests/browser.html.

## Structure

- `src/core`: lifecycle, fixed-step loop, event bus, silent audio boundary.
- `src/data`: biomes, enemies, equipment sets, balance, and arena definitions.
- `src/state`, `src/systems`, `src/world`: save state, combat/AI/progression, collision, and spawning.
- `src/input`: named keyboard/pointer actions and focus cleanup.
- `src/rendering`, `src/ui`: Three.js views and DOM HUD/menus.
- `tests`: deterministic logic and browser integration checks.

All art is original procedural geometry. See `PROJECT_PLAN.md` for implementation status and known limitations.
