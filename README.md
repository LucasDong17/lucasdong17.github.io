# Mossvale — Wildfront

A no-build browser action RPG with a persistent safe haven, four 50-wave biomes, a 100-wave Endless Tower, scaling multi-enemy encounters, equipment drops, duplicate-item upgrades, and collectible battle pets.

From the repository root, run:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000 in a current desktop or mobile browser. An internet connection is needed for the pinned Three.js 0.170.0 ES module on jsDelivr. No package install or build step is needed.

Enter the medieval safe-haven courtyard, then walk forward into the blue Play portal to choose a biome, a checkpoint, or **Start Here** at the highest wave you have played. The purple Endless Tower circle behind spawn opens a separate 100-wave climb with resume progress and boss checkpoints at waves 25, 50, 75, and 100. Walk left into the purple Upgrade circle to combine two identical items of the same level, or enter the gold Pet Hatchery circle on the right to buy eggs with coins earned from wave victories. On PC, move with WASD or arrows, attack with Space or left click, and hold E near a drop to collect it. Touch devices automatically receive an analog movement joystick, a HIT button, and a hold-to-collect LOOT button that appears near drops. Keyboard controls remain available. The **Pets** button shows companion rarity and damage and lets you equip up to three. Equipped pets follow you everywhere and attack the nearest arena enemy once per second. The **Spawn** HUD button returns you to the haven during any wave. Inventory, pets, coins, equipment, upgrades, discoveries, highest waves, checkpoints, and completion save automatically. Death returns you to the haven with everything intact.

Every biome egg has a 1% Mythical hatch: the Mossvale Moonhorn Unicorn, Frostfang Frost Phoenix, Sunspire Verdant Basilisk, and Embercrag Solar Manticore. Mythical companions are stronger and more valuable than each egg's Legendary animal.

Mossvale Meadow is available immediately. Its checkpoints unlock after reaching waves 10, 20, 30, 40, and 50. Defeat the Crowned Colossus on wave 50 to unlock Frostfang Tundra, defeat the Aurora Wyrm to open Sunspire Jungle, then defeat the Sunken Temple Hydra to unlock Embercrag Badlands. Embercrag adds a volcanic arena, eight fire and obsidian creatures, six stronger equipment sets, a 9,000-coin egg, the Solar Manticore Mythical pet, and the Caldera Wyrm final boss.

The Endless Tower is available immediately and has its own arcane arena, eight original enemy families, and bosses every 25 waves. Tower drops can come from any biome even when that biome is still locked. Later tower waves increasingly favor powerful sets and can drop the armor-only Runebound, Voidglass, Celestial, and Eternity collections.

## Tests

Using Node.js 22 or newer:

```powershell
node tests/simulation.test.mjs
```

The deterministic suite covers portals, enemy scaling, combat, drops, equipment, upgrades, pets, coins, persistence, death, checkpoints, and biome unlocking. Browser integration checks remain available at http://127.0.0.1:8000/tests/browser.html.

## Structure

- `src/core`: lifecycle, fixed-step loop, event bus, silent audio boundary.
- `src/data`: biomes, enemies, equipment sets, balance, and arena definitions.
- `src/state`, `src/systems`, `src/world`: save state, combat/AI/progression, collision, and spawning.
- `src/input`: named keyboard/pointer actions and focus cleanup.
- `src/rendering`, `src/ui`: Three.js views and DOM HUD/menus.
- `tests`: deterministic logic and browser integration checks.

All art is original procedural geometry. See `PROJECT_PLAN.md` for implementation status and known limitations.
