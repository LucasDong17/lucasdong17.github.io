# Project Plan

## Safe-Haven Market Stands — 2026-10-03

The Play, Upgrade, Pet Hatchery, Sell Weapons, Sell Armor, and Sell Pets floor circles are now original low-poly market stands with striped awnings, wooden counters, permanent labels, category-specific colors, and distinct 3D symbols. The three sell stands share one evenly spaced row against the courtyard's back wall. The Endless Tower keeps its separate arcane circle so its special mode remains visually distinct.

Acceptance checks: all six service interactions retain their existing menus and trigger behavior; each stand has a readable label and unique symbol; the sell stands are aligned along one rear-wall row; the safe haven remains playable with no WebGL or console errors.

- **Logic: 24/24 passing.** All service triggers still open the correct menus after the layout change, alongside every prior gameplay system.
- **Browser: 20/20 passing.** The live WebGL fixture confirmed six labeled market stands, aligned sell stations, working protected selling, and a clean console. A manual courtyard check confirmed the striped canopies, distinct colors, and category symbols render from the spawn approach.

## Set Auto-Collect Filter — 2026-10-02

The side menu now includes a **Collect** button that shows every biome and Endless Tower equipment set in ascending power order. Each set is an opt-in saved filter: red sets remain as normal world drops, while green sets are transferred directly to inventory the instant they drop, regardless of the player's position.

Acceptance checks: all 27 sets appear worst-to-best; selection state is visibly red/green and persists in save schema version 6; selected boss drops enter inventory without movement or pickup input; unselected drops remain on the ground for manual collection.

- **Logic: 24/24 passing.** Coverage verifies immediate global collection, red-filter world drops, saved selection migration, and every prior gameplay system.
- **Browser: 20/20 passing.** The live WebGL fixture confirmed all 27 ordered filters, red-to-green toggling, persistence, the new side button, and a clean console.

## Forge Upgrade-All and Endless Egg — 2026-10-02

The Forge now includes an **Upgrade All** action that performs every currently possible duplicate merge, including newly enabled chain merges, while preserving equipped item references. “Max” means the highest level producible from the gear currently owned; gear levels remain uncapped.

The Hatchery now permanently offers a 1,000,000-coin Endless Egg as a long-term coin sink. Its pool contains five original endgame companions across Mythical, Divine, Secret, Cosmic, and Glitched rarities. Their damage ranges from 450 to 1,200 per one-second attack, making them substantially stronger than prior pets without trivializing the 36,000-health final tower boss.

Acceptance checks: recursive bulk merges produce the correct highest levels; equipped gear remains equipped; the Endless Egg is always unlocked, charges exactly 1,000,000 coins, its odds total 100%, and every result belongs to the requested endgame rarity pool.

- **Logic: 23/23 passing.** Coverage includes chain merges, equipped-ID preservation, exact price deduction, endgame rarity rolls, damage ordering, and all prior systems.
- **Browser: 19/19 passing.** The live WebGL fixture confirmed the five-card hatchery, Endless Egg artwork and odds, one-action forge merging, and a clean console. A separate responsive visual check confirmed the new egg remains readable and scrollable in the compact menu layout.

## Vision and Source Interpretation

Create an original, lightweight browser action RPG with a colorful low-poly grassland, an angled follow camera, melee combat, enemy drops, and character growth. The supplied screenshots show the likely long-term inspiration: chickens, sheep, pigs, cows, wolves, bears, and a king-chicken boss; health and XP bars; coins; equipment and item inventories; quests and achievements; stat choices; crafting/dismantling; gear upgrades; an enemy index; pickups; and waypoint markers.

`raw_game_ideas.md` now supplies additional long-term reference for progression, quests, crafting, abilities, and a Roblox-like low-poly presentation. Those notes are inspiration rather than immediate acceptance criteria: the active safe-haven market-stand change advances the requested readable 3D hub presentation without pulling later combat, quest, mining, crafting, rune, or leveling systems into the current scope. Names, numbers, layouts, and art from all references remain reference material rather than assets or requirements. This roadmap deliberately converts that broad inspiration into small, testable increments.

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

Long-form play-balance all four 50-wave campaigns and the 100-wave Endless Tower, especially late multi-enemy pressure, tower checkpoint recovery, cross-biome drop quality, pet-assisted damage, and final-boss survivability.

## Equipped Item Sell Protection — 2026-10-02

The Sell Armor, Sell Weapons, and Sell Pets stations now identify equipped entries with a prominent checkmarked badge and a protected, disabled sell state. Each station has a category-specific **Sell All Unequipped** button that previews both the affected count and total gold value. Individual and bulk state operations reject equipped entries, so equipped gear and pets cannot be removed even if UI protections are bypassed.

### Recorded checks

- **Logic: 21/21 passing.** Sell coverage now verifies that individual and bulk sales preserve equipped armor, weapons, and pets while removing every eligible unequipped entry and awarding gold.
- **Browser: 18/18 passing.** The live WebGL fixture verified the equipped marker, disabled protected card, sell-all action, retained equipped weapon, gold award, and an error-free console.

## Endless Tower Expansion — 2026-09-30

A seventh labeled hub circle and a tall twin-spire tower entrance now sit behind the player spawn. Entering the circle opens a dedicated tower screen with resume-from-highest-progress and unlockable wave 25, 50, 75, and 100 boss checkpoints. Tower progress is independent, available from a fresh save, stored in save schema version 5, and safely added to version 2–4 saves.

The tower uses a separate arcane arena collision map and procedural rune-pillar scenery. Its eight custom enemy families and four milestone bosses use new low-poly construct, mimic, void-beast, floating-eye, armored-knight, sphinx, and time-dragon silhouettes. Waves scale to eight simultaneous enemies and stop after the wave-100 Dragon of Eternity.

Tower enemies can drop equipment sets from any regular biome regardless of campaign unlocks. A rising power band now increases the guaranteed minimum set quality every floor and removes weak early sets from later-wave pools; randomness only chooses among sets appropriate for the current band. Four tower-exclusive armor families—Runebound, Voidglass, Celestial, and Eternity—enter the pool at waves 20, 45, 70, and 90, and their tower drops are armor-only. Tower waves also grant the highest coin rewards currently in the game.

### Recorded checks

- **Logic: 21/21 passing.** Added portal, 100-wave completion, milestone-boss, tower-map, cross-biome loot, checkpoint persistence, and save-migration coverage alongside all prior systems.
- **Browser: 18/18 passing.** The live WebGL build confirmed the seven labeled circles, unobstructed twin-spire spawn sightline, tower checkpoint screen, arcane arena, custom tower model, expanded indexes, and no console errors or warnings.

### Known limitations

The 100-wave tower balance and high-floor drop curve are an initial pass. A full uninterrupted climb still needs play-balance testing, especially waves 75–100 with varied equipment and pet teams.

## Mobile Touch Controls — 2026-09-29

Touch-capable coarse-pointer devices now automatically receive an analog movement joystick and a holdable attack button. When the player enters pickup range, a separate hold-to-loot button appears and mirrors the existing pickup progress. These controls feed the same named movement, attack, and pickup actions as the unchanged WASD/arrow, Space/left-click, and E keyboard controls.

### Recorded checks

- **Logic: 19/19 passing.** Device-mode coverage distinguishes touch-first devices from pointer PCs alongside all existing gameplay checks.
- **Browser: 15/15 passing.** The touch HUD was detected in a mobile browser viewport, joystick movement entered the Play portal, the HIT button triggered a real combat swing, contextual loot visibility/progress passed, and the console stayed free of errors and warnings.

## Embercrag Badlands Expansion — 2026-09-29

A fourth 50-wave biome, Embercrag Badlands, now unlocks after defeating the Sunspire wave-50 Sunken Temple Hydra. It has its own volcanic collision map and procedural basalt, lava-vent, obsidian-spire, and molten-crack scenery. Eight fire-themed enemy families mix fast melee pressure, durable bruisers, and long-range firebolts before the wave-50 Caldera Wyrm.

Six Embercrag equipment sets extend gear progression beyond Sunspire, while Embercrag wave rewards form a new highest coin tier. The 9,000-coin Embercrag Egg contains Common through Mythical volcanic companions, including the 1% Solar Manticore. Existing version-4 saves receive safe locked defaults for the new biome without a schema reset.

### Recorded checks

- **Logic: 20/20 passing.** Added coverage for the Sunspire-to-Embercrag unlock, volcanic map entry, stronger rewards and gear, egg gating and price, pet rarity, save defaults, and all prior systems.
- **Browser: 16/16 passing.** The live WebGL build confirmed the fourth biome card, locked Embercrag progression, four complete egg cards, expanded indexes, and the distinct volcanic collision map and scenery with no console errors or warnings.
- **Syntax:** All changed JavaScript modules and browser tests pass Node syntax checks.

### Known limitations

Embercrag combat values, wave rewards, and the 9,000-coin egg price are an initial balance pass. The full waves 1–50 campaign still needs a long-form play-balance run, particularly late ranged formations and the Caldera Wyrm.

## Sunspire Jungle Expansion — 2026-09-28

A third 50-wave biome, Sunspire Jungle, now unlocks after defeating the Frostfang wave-50 Aurora Wyrm. It has a separate overgrown temple collision map and procedural environment, eight jungle enemy families with melee and ranged behaviors, and the Sunken Temple Hydra final boss. Jungle victories award a new higher coin tier.

The Sunspire Egg costs 4,000 coins and adds four jungle companions across the existing Common, Rare, Epic, and Legendary rarities. Six new equipment families—Vineguard, Sunstone, Venom, Relic, Temple, and Sunspire—extend the existing weapon and four-slot armor drop system. The play menu, hatchery, creature index, equipment index, saved progression, and old-save defaults all include the new biome without changing the save schema.

### Recorded checks

- **Logic: 17/17 passing.** Added coverage for the Frostfang-to-Sunspire unlock, jungle map entry, stronger coin rewards and gear, egg gating/cost, pet rarity, and prior save/combat behavior.
- **Syntax:** All changed JavaScript modules pass Node syntax checks.

### Known limitations

Sunspire combat numbers and the 4,000-coin egg price are an initial progression pass. A full waves 1–50 manual balance run is still needed, especially against late ranged formations and the Hydra.

## Mythical Egg Animals — 2026-09-28

All three eggs now include one biome-exclusive Mythical animal at a displayed 1% hatch chance: Moonhorn Unicorn in Mossvale, Frost Phoenix in Frostfang, and Verdant Basilisk in Sunspire. Each has a distinct procedural portrait and world model, exceeds its egg's Legendary companion damage, and uses a new Mythical rarity color and sell-value tier. Each egg's odds still total exactly 100%.

### Recorded checks

- **Logic: 18/18 passing.** Mythical coverage checks all three eggs, exact 100% probability totals, the 1% result, damage ordering, and sell-value ordering alongside the existing campaign tests.
- **Browser: 14/14 passing.** The live WebGL fixture confirmed all three hatchery cards display Mythical 1%, pet artwork still renders, and every existing browser integration check remains green with no console errors.

## Enemy Readability and Haven Market Expansion — 2026-09-26

Multi-enemy waves now show a compact health roster with one bar and exact health count per living enemy. The roster remains bounded to a small corner panel and supports the existing eight-enemy maximum. Every creature family and both bosses now use a species-specific procedural low-poly silhouette instead of the former shared rig.

Enemy definitions now carry distinct movement speed, health, damage, attack range, attack cadence, melee/ranged style, and projectile speed where applicable. Jade Guardians, Aurora Owls, Rime Wraiths, Crystal Drakes, and the Aurora Wyrm use authoritative simulated projectiles. The creature index remains hidden until that creature has actually been defeated, then shows all combat attributes.

The safe haven now contains six spaced, permanently labeled circles: Play, Upgrade, Pet Hatchery, Sell Pets, Sell Armor, and Sell Weapons. Each sell circle opens a category-specific market with centralized, level/rarity-aware gold values. Equipped gear and pets were originally sold by safely unequipping them; the 2026-10-02 protection update above intentionally supersedes that behavior. Save schema version 4 preserves existing version-2 and version-3 progression while storing defeat-based discoveries going forward.

### Recorded checks

- **Logic: 16/16 passing.** Added coverage for all six hub circles, defeat-only discovery, ranged projectile creation, category-safe selling, gold awards, and automatic unequipping alongside all prior progression checks.
- **Browser: 13/13 passing.** The actual WebGL build rendered six labeled portals, distinct enemy models, one compact health row per simultaneous enemy, and a working sell interaction. No new console errors or warnings were produced on the fresh local origin.

### Known limitations

Sell values and the new per-species combat attributes are an initial balance pass. Existing version-2/3 saves retain their previously discovered index entries because older saves do not record whether each discovery came from spawning or defeating the creature.

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
