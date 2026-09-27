# Project Plan

## Vision and Source Interpretation

Create an original, lightweight browser action RPG with a colorful low-poly grassland, an angled follow camera, melee combat, enemy drops, and character growth. The supplied screenshots show the likely long-term inspiration: chickens, sheep, pigs, cows, wolves, bears, and a king-chicken boss; health and XP bars; coins; equipment and item inventories; quests and achievements; stat choices; crafting/dismantling; gear upgrades; an enemy index; pickups; and waypoint markers.

`raw_game_ideas.md` contained no text when this plan was created, so the screenshots are the only available design evidence. Names, numbers, layouts, and art shown in them are reference material rather than requirements. This roadmap deliberately converts that broad inspiration into small, testable increments.

## Design Pillars

1. **Immediate readability:** movement, attack reach, damage, enemy state, and victory must be obvious without a tutorial.
2. **Short reward loop:** approach an enemy, fight it, see a clear result, and reset quickly.
3. **Data-driven growth:** later enemies, items, and quests should be content definitions over stable systems.
4. **Fast web iteration:** no build step, placeholder low-poly art, and clean boundaries between simulation, rendering, and UI.

## Phase 1 — Vertical Slice / Core Loop

### Goal

Prove that moving through a compact 3D arena and defeating one enemy with one melee action feels clear and functional.

### Build

- A responsive full-window Three.js canvas and minimal title/instruction overlay.
- A small grassland arena made from primitive low-poly shapes: ground, boundary, several blocking rocks/trees, player, and one hostile training creature.
- Angled third-person follow camera that keeps the player and nearby action readable.
- Player movement on the ground plane with collision against arena bounds and obstacles.
- One short-range melee attack with wind-up/active/recovery timing, visible arc/flash, cooldown, and a single hit per swing.
- One simple enemy with idle/chase/contact-attack states, health, hit feedback, defeat, and timed respawn.
- Minimal HUD: player health, enemy health when engaged, and a compact controls reminder.
- Restart after player defeat; pause simulation when the page loses focus.

### Explicit non-goals

No XP, coins, loot, inventory, equipment, consumables, quests, dialogue, crafting, stat choices, boss, multiple enemy species, audio, save data, multiplayer, or elaborate menus.

### Exit criteria

- The app loads from a static HTTP server with no console errors.
- Keyboard movement is smooth, diagonal movement is not faster, and the player cannot cross blockers or arena bounds.
- The primary action visibly attacks, respects cooldown, damages only in range, and cannot damage the same target twice per swing.
- The enemy can chase, damage, be defeated, disappear, and respawn without stale state.
- Player defeat and restart work repeatedly without duplicated listeners or loops.
- The layout remains usable at 1280×720 and common wider desktop sizes.

## Phase 2 — Secondary Systems

### Goal

Turn the combat proof into a replayable five-minute progression loop.

### Build in order

1. Add enemy defeat rewards: XP and coins, with readable world pickups or direct rewards—not both until tested.
2. Add player level thresholds and a level-up choice between damage, maximum health, and defense, echoing the references without copying their UI.
3. Add two consumable slots (health recovery and a temporary combat buff) plus a deliberately small inventory state.
4. Add a basic win condition (reach a target level or defeat count) and loss/retry flow.
5. Add a second enemy behavior profile only after the first reward loop is stable.
6. Add lightweight save/load for progression with a versioned localStorage schema and reset control.

### Exit criteria

- A fresh run can progress, level up, spend/use rewards, win or lose, and restart.
- HUD values always match authoritative state; rewards cannot be collected twice.
- Save corruption or an old schema falls back safely.
- Balance supports a coherent five-minute test run without unavoidable damage or long idle grinding.

## Phase 3 — Content Expansion

### Goal

Expand the stable loop into a small authored adventure rather than a collection of disconnected systems.

### Build in order

1. Create one grassland route with a safe hub, combat pockets, readable paths, and a final encounter area.
2. Add a compact roster of differentiated creatures: passive, defensive, and aggressive archetypes; tune variants through data.
3. Add equipment slots and a restrained loot table with clear rarity/stat comparisons.
4. Add one NPC quest chain that teaches gathering, combat, and returning to the hub; add waypoint guidance only where navigation testing proves it necessary.
5. Add a boss encounter inspired by the “king creature” escalation in the references, with telegraphed attacks and a clear completion state.
6. Add dialogue/narrative triggers, an enemy/item index, and additional quests only after the main route is complete.

### Deferred unless separately approved

Multiplayer/PvP, live services, store/monetization, daily rewards, achievements, global leaderboards, large open worlds, and extensive crafting. Crafting/dismantling and gear upgrades may enter late Phase 3 only if the core loot loop needs a duplicate-item sink.

### Exit criteria

- The full route has a clear beginning, guided middle, boss ending, and 15–30 minutes of purposeful play.
- Each enemy archetype is identifiable from behavior, not only color/stat changes.
- Quest and inventory state survive reloads and cannot become irrecoverably stuck.
- Content is data-driven and adding an enemy/item does not require edits to core combat code.

## Phase 4 — Polish and Audio

### Goal

Improve feel, accessibility, clarity, and performance without changing the established game rules.

### Build

- Combat juice: restrained screen shake, hit-stop, particles, damage numbers, defeat effects, and pickup motion.
- Presentation: cohesive original color palette, refined low-poly silhouettes, lighting/fog, transitions, responsive HUD, and menu polish.
- Audio: original/licensed music, attack/hit/defeat/pickup/UI sounds, volume categories, mute, and safe autoplay handling.
- Accessibility: remappable controls, reduced motion, screen-shake toggle, high-contrast/readability checks, and scalable UI.
- Technical polish: object pooling where profiling supports it, asset preloading/fallbacks, loading state, browser/device QA, and performance budgets.

### Exit criteria

- Stable target frame rate on the agreed baseline device with no unbounded allocations during normal play.
- All major actions have coordinated visual and audio feedback; muting audio preserves playability.
- Reduced-motion and UI scaling options work throughout the complete loop.
- A clean start-to-finish regression pass succeeds in supported browsers.

## Active Wave Expansion — 2026-09-19

The requested scope now advances beyond the original Phase 1 limit into a focused wave-survival loop. This replaces the former timed single-enemy respawn with numbered waves, a ten-second loot intermission, increasing enemy difficulty, a boss every tenth wave, hold-to-collect world drops, equippable armor/tools, and pause-safe Inventory and Index menus. The first content pass includes five regular enemy families; Stone, Iron, Jade, Diamond, and custom Warborn equipment sets; and the five requested weapon types plus four armor slots.

This remains intentionally narrower than the former Phase 2/3 roadmap: there are no coins, XP levels, consumables, quests, shops, or narrative systems. Persistent equipment, duplicate combining, biome progression, and multiple simultaneous enemies were subsequently added in the 2026-09-22 expansion below.

## Immediate Next Step

Long-form play-balance both 50-wave campaigns, especially multi-enemy pressure, pet-assisted damage, egg affordability, final-boss survivability, upgrade pacing, and checkpoint recovery.

## Persistent Pet and Coin Expansion — 2026-09-25

The safe haven now has a gold Pet Hatchery circle and a persistent coin economy. Every cleared wave awards coins, with rewards increasing by wave and Frostfang victories paying substantially more. The 500-coin Mossvale Egg is available immediately; the stronger 1,500-coin Frostfang Egg unlocks with the second biome. Each egg has explicit Common, Rare, Epic, and Legendary odds, with higher rarity and later-biome companions dealing more damage.

Hatched pets appear in a dedicated side-menu collection with rarity, origin, damage, and attack-speed details. Up to three can be equipped at once. Equipped pets use authoritative simulation state, follow the player in the hub and both arenas, seek the nearest living enemy, and attack once per second. Eight original blocky companions cover medieval beasts, archers, golems, knights, griffins, and tundra creatures. Coins, owned pets, and the three equipped slots migrate additively into save schema version 3; existing version-2 saves retain their progression and gear.

### Recorded checks

- **Logic: 14/14 passing.** The suite now covers all three hub circles, increasing biome-specific coin rewards, egg price and unlock rules, rarity rolls, the three-pet equipment limit, one-second pet attacks, save migration, and all previous combat/progression behavior.
- **Browser: 12/12 passing.** The WebGL build rendered an equipped low-poly pet, the hatchery spent the correct 500 coins, the Pets menu equipped and displayed its stats, and all prior browser checks passed. No browser console errors or warnings were reported.

### Known limitations

Pet and egg balance is an initial pass. Duplicate pets are currently allowed and intentionally remain separate collectible instances; there is no pet merging or pet leveling system in this scope.

## Persistent Biome Progression — 2026-09-22

The requested scope now replaces run resets with a persistent safe-haven loop. Inventory, equipped armor/weapons, upgrade levels, creature discoveries, biome completion, and highest reached wave are stored in a versioned `localStorage` save. Death immediately returns the player to the safe haven at full health without removing gear.

The haven has a forward Play portal and a left Upgrade circle. The Play portal presents Mossvale Meadow and the locked Frostfang Tundra, with selectable checkpoints at waves 1, 10, 20, 30, 40, and 50 once each has been reached. Defeating the Meadow wave-50 Crowned Colossus unlocks Frostfang. Each biome ends at wave 50 and has its own final boss.

Enemy counts now rise from one to eight across a biome. Frostfang adds eight enemy families and six higher-power equipment sets. Loot chance was raised substantially, collected item types have a duplicate bias, and two identical items of the same upgrade level can be combined at the haven forge. Upgraded weapons gain damage; upgraded armor gains health and defense.

### Recorded checks

- **Logic: 9/9 passing.** Hub portal entry, encounter scaling, multi-target melee, collision/range behavior, wave unlocks and spawning, high-odds loot, equipment and combining, save reload, death return, final-boss biome unlock, and corrupt-save fallback.
- **Browser:** WebGL loaded with no console errors or warnings. The safe-haven HUD, persistent upgraded gear after reload, 15-entry creature index, and 11-set equipment index were visually inspected in the in-app Chromium browser.

### Known limitations

Fine-grained wave balance through all 100 waves still needs a long-form playtest. Enemies use a shared low-poly body rig with color, scale, and stat variation; future art passes can add species-specific silhouettes without changing combat state.

## Medieval Hub and Distinct Arena Pass — 2026-09-23

The safe haven is now a medieval stone-brick courtyard with castle walls, towers, banners, a well, and the existing Play and Upgrade circles. Mossvale keeps a bright grassland layout, while Frostfang has a separate collision/spawn layout with crystal clusters, ice boulders, and a frozen river edge. Lighting, color management, shadows, player equipment details, and environment dressing received a coordinated graphics pass.

Players can use the **Spawn** HUD button during combat or an intermission to return safely to the haven and upgrade. The play portal now presents a prominent **Start Here** button for each available biome; it resumes at the highest wave the player has actually entered. That value is saved additively in the existing version-2 schema, with old saves safely inferring it from their unlocked wave.

## Phase 1 Verification — 2026-09-18

Implemented Mossvale, an original primitive-geometry meadow with one player, one training creature, five solid obstacles, a visible arena perimeter, a smooth angled camera, health/cooldown HUD, melee effects, defeat/respawn, and restart. No Phase 2 systems or stubs were added. Movement determines facing; facing locks for the duration of a swing. Attack range is measured center-to-center. A focused canvas accepts controls; focus loss pauses and requires explicit resume.

Launch from the repository root with `python -m http.server 8000 --bind 127.0.0.1`, then open `http://127.0.0.1:8000/`. Three.js is pinned to 0.170.0 on jsDelivr. Node 22+ can run `node tests/simulation.test.mjs`; no package install is required.

### Recorded checks

- **Logic: 8/8 passing.** Normalized/cancelling movement; all five obstacles from 16 approach angles, diagonal sliding and bounds; range and arc edges; timed attack stages and single hits; enemy detection/chase/telegraph/cooldown/dodge; three enemy respawns; player defeat/frozen state; event unsubscription.
- **Browser integration: 13/13 passing** in the Codex Chromium-based browser at `tests/browser.html`. The fixture uses the actual Game, Input, renderer, HUD and animation loop. It dispatches keyboard/pointer events, plays a real-time approach/combat/respawn sequence, verifies rapid input taps, performs three restarts and three respawns, checks focus-bound default prevention, blur/visibility cleanup, elapsed-time clamping, and single-loop timing. Accelerated deterministic steps supplement real-time playback for repeated cycles.
- **Manual browser play:** entered the arena, moved with W and Up, observed detection/chase/contact attacks and health loss, attacked with Space and left click, defeated the creature, observed respawn, and verified focus-loss pause and explicit resume. Inspected player defeat overlay and scene/HUD rendering. Checked layouts at 1280×720 and 1600×900, including resize; health, enemy state, cooldown and controls remained within the viewport.
- **Startup/console:** HTTP build and pinned CDN module loaded successfully; no browser console errors or warnings in game or test fixture. All essential assets are local modules/CSS plus the pinned Three.js module; no external art or fonts.
- A manual quick-click check found taps could be lost between fixed steps. Input now retains a press until the next simulation sample; the regression test covers both Space and pointer taps.

All ten requested acceptance criteria have test coverage through the deterministic and browser checks above. Exhaustive collision/arc/repetition cases were automated, not individually hand-played. Standalone Chrome, Edge, Firefox and Safari were not separately available for cross-browser verification; only the Chromium-based in-app browser was exercised. The minimal enemy uses direct pursuit with obstacle sliding, so scenery can temporarily block its chase. CDN access and WebGL are required. No audio is included, as specified for Phase 1.
