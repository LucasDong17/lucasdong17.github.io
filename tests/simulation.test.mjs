import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE as B, EGGS, SETS, TOWER_BOSSES, coinRewardForWave, enemyCountForWave, enemyForWave, itemDefinition, petDefinition, petSellValue } from '../src/data/balance.js';
import { EventBus } from '../src/core/event-bus.js';
import { SAVE_KEY, combineItems, createRun, defaultProgress, enterHub, equipBestItems, equipItem, hatchEgg, loadProgress, saveProgress, sellItem, sellPet, startLevel, togglePet } from '../src/state/run.js';
import { World } from '../src/world/world.js';
import { stepRun, canHit, attackStage } from '../src/systems/simulation.js';
import { usesTouchControls } from '../src/input/input.js';

const world = new World();
const tick = (run, input = {}, count = 1, bus = new EventBus()) => { for (let i = 0; i < count; i++) stepRun(run, input, world, bus); };
const activeRun = (wave = 1, biome = 'meadow', progress = defaultProgress()) => { progress.unlocked[biome] = Math.max(progress.unlocked[biome] || 0, wave); const run = createRun(progress); assert.ok(startLevel(run, biome, wave, world)); return run; };

test('control mode distinguishes touch-first devices from pointer PCs', () => {
  const view = coarse => ({ matchMedia: () => ({ matches: coarse }) });
  assert.equal(usesTouchControls(view(true), { maxTouchPoints: 5, userAgent: 'Tablet' }), true);
  assert.equal(usesTouchControls(view(false), { maxTouchPoints: 0, userAgent: 'Desktop' }), false);
  assert.equal(usesTouchControls(view(false), { maxTouchPoints: 1, userAgent: 'iPhone' }), true);
});

test('hub movement opens all labeled service and sell circles', () => {
  const run = createRun(); const bus = new EventBus(); const opened = []; bus.on('portalEntered', event => opened.push(event.portal));
  Object.assign(run.player, { x: B.portal.playX, z: B.portal.playZ + B.portal.radius + 0.05 }); tick(run, { moveZ: -1 }, 2, bus); assert.deepEqual(opened, ['play']);
  Object.assign(run.player, { x: B.portal.upgradeX + B.portal.radius + 0.05, z: B.portal.upgradeZ }); run.portalLatch = false; tick(run, { moveX: -1 }, 2, bus); assert.deepEqual(opened, ['play', 'upgrade']);
  Object.assign(run.player, { x: B.portal.petsX - B.portal.radius - 0.05, z: B.portal.petsZ }); run.portalLatch = false; tick(run, { moveX: 1 }, 2, bus); assert.deepEqual(opened, ['play', 'upgrade', 'pet-shop']);
  for (const [x, z, portal] of [[B.portal.sellPetsX, B.portal.sellPetsZ, 'sell-pets'], [B.portal.sellArmorX, B.portal.sellArmorZ, 'sell-armor'], [B.portal.sellWeaponsX, B.portal.sellWeaponsZ, 'sell-tools']]) { Object.assign(run.player, { x, z }); run.portalLatch = false; tick(run, {}, 1, bus); assert.equal(opened.at(-1), portal); }
  Object.assign(run.player, { x: B.portal.towerX, z: B.portal.towerZ }); run.portalLatch = false; tick(run, {}, 1, bus); assert.equal(opened.at(-1), 'tower');
});

test('wave population scales to eight and wave 50 is a single final boss', () => {
  assert.equal(enemyCountForWave(1), 1); assert.equal(enemyCountForWave(8), 2); assert.equal(enemyCountForWave(49), 7); assert.equal(enemyCountForWave(50), 1);
  const run = activeRun(50); assert.equal(run.enemies.length, 1); assert.equal(run.enemies[0].boss, true); assert.equal(run.enemies[0].name, 'Crowned Colossus'); assert.ok(run.enemies[0].health >= 2500);
});

test('endless tower saves 100 waves, milestone bosses, cross-biome loot, and rare armor', () => {
  assert.equal(enemyCountForWave(25, 'tower'), 1); assert.equal(enemyForWave(25, 'tower').key, TOWER_BOSSES[25].key); assert.equal(enemyForWave(100, 'tower').key, TOWER_BOSSES[100].key);
  const progress = defaultProgress(); progress.unlocked.tower = 100; progress.highest.tower = 100; const run = activeRun(100, 'tower', progress);
  assert.equal(world.map.key, 'tower'); assert.equal(run.enemies.length, 1); assert.equal(run.enemies[0].boss, true);
  Object.assign(run.player, { damage: run.enemies[0].maxHealth + 1, x: 0, z: 6, facing: Math.PI }); Object.assign(run.enemies[0], { x: 0, z: 4.5, health: 1, mode: 'idle' }); tick(run, { attack: true }, 12);
  assert.equal(run.phase, 'intermission'); assert.equal(run.drops.length, 4); assert.ok(run.drops.every(drop => SETS.some(set => drop.key.startsWith(`${set.key}:`))));
  tick(run, {}, Math.ceil(B.intermission / B.step) + 2); assert.equal(run.status, 'hub'); assert.equal(run.progress.completed.tower, true);
});

test('movement stays normalized and attack can hit multiple animals once each', () => {
  const cardinal = activeRun(); const diagonal = activeRun(); tick(cardinal, { moveX: 1 }, 20); tick(diagonal, { moveX: 1, moveZ: 1 }, 20);
  const cardDistance = Math.hypot(cardinal.player.x, cardinal.player.z - 6); const diagonalDistance = Math.hypot(diagonal.player.x, diagonal.player.z - 6); assert.ok(Math.abs(cardDistance - diagonalDistance) < 1e-6);
  const run = activeRun(8); Object.assign(run.player, { x: 0, z: 0, facing: 0 }); for (let i = 0; i < run.enemies.length; i++) Object.assign(run.enemies[i], { x: (i ? 0.35 : -0.35), z: 1.4, health: 60, maxHealth: 60, mode: 'idle' });
  tick(run, { attack: true }, 12); assert.equal(attackStage(run.player.attack), 'active'); assert.deepEqual(run.enemies.map(enemy => enemy.health), [35, 35]); tick(run, {}, 5); assert.deepEqual(run.enemies.map(enemy => enemy.health), [35, 35]);
});

test('range, arc, dead targets, obstacles, and bounds remain valid', () => {
  const run = activeRun(); const p = run.player; const e = run.enemies[0]; Object.assign(p, { x: 0, z: 0, facing: 0 }); Object.assign(e, { x: 0, z: 2 }); assert.ok(canHit(p, e)); e.z = B.player.range + 0.01; assert.ok(!canHit(p, e)); e.health = 0; e.z = 1; assert.ok(!canHit(p, e));
  for (const obstacle of world.obstacles) { const actor = { x: obstacle.x - 3, z: obstacle.z, radius: B.player.radius }; world.move(actor, 100, 0); assert.ok(world.valid(actor.x, actor.z, actor.radius)); }
  const actor = { x: 0, z: 0, radius: B.player.radius }; world.move(actor, 100, 100); assert.ok(world.valid(actor.x, actor.z, actor.radius));
});

test('clearing a wave unlocks progress, advances cleanly, and gives high-odds loot', () => {
  const run = activeRun(7); const bus = new EventBus(); for (const enemy of run.enemies) Object.assign(enemy, { x: 0, z: 4.5, health: 1, mode: 'idle' });
  tick(run, { attack: true }, 12, bus); assert.equal(run.phase, 'intermission'); assert.equal(run.progress.unlocked.meadow, 8); assert.ok(run.drops.length >= 1); tick(run, {}, Math.ceil(B.intermission / B.step) + 2, bus); assert.equal(run.wave, 8); assert.equal(run.enemies.length, 2); assert.ok(run.enemies.every(enemy => enemy.health === enemy.maxHealth));
});

test('loot pickup, equipment, duplicate combining, and save reload preserve gear', () => {
  const run = activeRun(); run.drops = [{ id: 10, key: 'stone:chestplate', level: 1, x: run.player.x, z: run.player.z, spin: 0 }]; tick(run, { pickup: true }, Math.ceil(B.pickup.hold / B.step) + 1); assert.equal(run.inventory.length, 1);
  run.inventory.push({ id: 11, key: 'stone:chestplate', level: 1 }); run.nextItemId = 12; assert.ok(equipItem(run, 10)); const before = { health: run.player.maxHealth, defense: run.player.defense }; assert.ok(combineItems(run, 'stone:chestplate', 1)); assert.equal(run.inventory.length, 1); assert.equal(run.inventory[0].level, 2); assert.ok(run.player.maxHealth > before.health); assert.ok(run.player.defense >= before.defense);
  const memory = new Map(); const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }; saveProgress(run, storage); assert.ok(memory.has(SAVE_KEY)); const restored = createRun(loadProgress(storage)); assert.equal(restored.inventory[0].level, 2); assert.equal(restored.equipped.chestplate, 10); assert.equal(restored.player.maxHealth, 113); assert.equal(itemDefinition('stone:chestplate', 2).health, 13);
});

test('equip best selects the strongest weapon and every strongest armor slot', () => {
  const run = createRun();
  run.inventory = [
    { id: 1, key: 'stone:sword', level: 1 }, { id: 2, key: 'jade:sword', level: 2 },
    { id: 3, key: 'stone:helmet', level: 1 }, { id: 4, key: 'jade:helmet', level: 2 },
    { id: 5, key: 'stone:chestplate', level: 2 }, { id: 6, key: 'jade:boots', level: 1 },
  ];
  assert.ok(equipBestItems(run, 'tools')); assert.equal(run.equipped.weapon, 2);
  assert.ok(equipBestItems(run, 'armor')); assert.deepEqual(run.equipped, { weapon: 2, helmet: 4, chestplate: 5, boots: 6 });
  assert.equal(run.player.damage, B.player.damage + itemDefinition('jade:sword', 2).damage);
  assert.equal(equipBestItems(run, 'missing'), false);
});

test('death teleports to hub with full health without losing equipment or unlocks', () => {
  const progress = defaultProgress(); progress.unlocked.meadow = 20; progress.inventory = [{ id: 1, key: 'jade:sword', level: 2 }]; progress.equipped = { weapon: 1 }; progress.nextItemId = 2;
  const run = activeRun(20, 'meadow', progress); const itemCount = run.inventory.length; run.player.health = 1; const enemy = run.enemies[0]; Object.assign(enemy, { x: run.player.x, z: run.player.z - 1, mode: 'windup', timer: 0 }); tick(run);
  assert.equal(run.status, 'hub'); assert.equal(run.phase, 'hub'); assert.equal(run.player.health, run.player.maxHealth); assert.equal(run.player.z, 8.5); assert.equal(run.inventory.length, itemCount); assert.equal(run.equipped.weapon, 1); assert.equal(run.progress.unlocked.meadow, 20);
});

test('highest played wave is remembered and a voluntary return restores the medieval hub map', () => {
  const progress = defaultProgress(); progress.unlocked.meadow = 23;
  const run = activeRun(17, 'meadow', progress);
  assert.equal(run.progress.highest.meadow, 17);
  assert.equal(world.map.key, 'meadow');
  enterHub(run, world);
  assert.equal(run.status, 'hub');
  assert.equal(world.map.key, 'hub');
  assert.equal(run.progress.highest.meadow, 17);
  assert.equal(run.player.health, run.player.maxHealth);
});

test('meadow final boss completion unlocks Frostfang and its own checkpoints', () => {
  const run = activeRun(50); const boss = run.enemies[0]; Object.assign(boss, { x: 0, z: 4.5, health: 1, mode: 'idle' }); tick(run, { attack: true }, 12); assert.equal(run.progress.completed.meadow, true); assert.equal(run.progress.unlocked.frost, 1); assert.equal(run.drops.length, 4);
  tick(run, {}, Math.ceil(B.intermission / B.step) + 2); assert.equal(run.status, 'hub'); assert.ok(startLevel(run, 'frost', 1, world)); assert.equal(world.map.key, 'frost'); assert.match(run.enemies[0].name, /Frost|Tundra|Ice|Glacier|Aurora|Snow|Rime|Crystal/);
});

test('Frostfang completion unlocks Sunspire with stronger waves, gear, rewards, and egg', () => {
  const run = activeRun(50, 'frost'); const boss = run.enemies[0]; Object.assign(boss, { x: 0, z: 4.5, health: 1, mode: 'idle' }); tick(run, { attack: true }, 12);
  assert.equal(run.progress.completed.frost, true); assert.equal(run.progress.unlocked.jungle, 1); assert.equal(run.drops.length, 4);
  tick(run, {}, Math.ceil(B.intermission / B.step) + 2); assert.equal(run.status, 'hub'); assert.ok(startLevel(run, 'jungle', 1, world)); assert.equal(world.map.key, 'jungle'); assert.match(run.enemies[0].name, /Beetle|Serpent|Monkey|Panther|Shaman|Scarab|Cobra|Treant/);
  assert.ok(coinRewardForWave(1, 'jungle') > coinRewardForWave(1, 'frost')); assert.ok(itemDefinition('vineguard:chestplate').health > itemDefinition('starfall:chestplate').health);
  run.coins = 4000; const pet = hatchEgg(run, 'jungle', () => 0); assert.equal(petDefinition(pet.key).rarity, 'common'); assert.equal(run.coins, 0);
});

test('Sunspire completion unlocks Embercrag with volcanic content and rewards', () => {
  const run = activeRun(50, 'jungle'); const boss = run.enemies[0]; Object.assign(boss, { x: 0, z: 4.5, health: 1, mode: 'idle' }); tick(run, { attack: true }, 12);
  assert.equal(run.progress.completed.jungle, true); assert.equal(run.progress.unlocked.ember, 1); assert.equal(run.drops.length, 4);
  tick(run, {}, Math.ceil(B.intermission / B.step) + 2); assert.equal(run.status, 'hub'); assert.ok(startLevel(run, 'ember', 1, world)); assert.equal(world.map.key, 'ember'); assert.match(run.enemies[0].name, /Cinder|Magma|Ashhorn|Ember|Lava|Fire|Pyre|Obsidian/);
  assert.ok(coinRewardForWave(1, 'ember') > coinRewardForWave(1, 'jungle')); assert.ok(itemDefinition('cinder:chestplate').health > itemDefinition('sunspire:chestplate').health);
  run.coins = 9000; const pet = hatchEgg(run, 'ember', () => 0); assert.equal(petDefinition(pet.key).rarity, 'common'); assert.equal(run.coins, 0);
});

test('corrupt and old saves safely fall back to defaults', () => {
  const broken = { getItem: () => '{oops' }; const old = { getItem: () => JSON.stringify({ version: 1, inventory: [{ id: 1 }] }) };
  assert.deepEqual(loadProgress(broken), defaultProgress()); assert.deepEqual(loadProgress(old), defaultProgress());
});

test('wave victories award increasing coins with a Frostfang premium', () => {
  assert.ok(coinRewardForWave(20, 'meadow') > coinRewardForWave(1, 'meadow'));
  assert.ok(coinRewardForWave(1, 'frost') > coinRewardForWave(1, 'meadow'));
  const run = activeRun(1); const reward = coinRewardForWave(1, 'meadow'); const enemy = run.enemies[0]; Object.assign(enemy, { x: 0, z: 4.5, health: 1, mode: 'idle' }); tick(run, { attack: true }, 12); assert.equal(run.coins, reward);
});

test('eggs enforce price and biome locks while rarity rolls determine damage', () => {
  const run = createRun(); run.coins = 3000;
  const common = hatchEgg(run, 'meadow', () => 0); assert.equal(petDefinition(common.key).rarity, 'common'); assert.equal(run.coins, 2500);
  assert.equal(hatchEgg(run, 'frost', () => 0), null); run.progress.unlocked.frost = 1;
  const legendary = hatchEgg(run, 'frost', () => 0.985); assert.equal(petDefinition(legendary.key).rarity, 'legendary'); assert.ok(petDefinition(legendary.key).damage > petDefinition(common.key).damage); assert.equal(run.coins, 1000);
  run.coins = 5000; assert.equal(hatchEgg(run, 'jungle', () => 0), null); run.progress.unlocked.jungle = 1; assert.ok(hatchEgg(run, 'jungle', () => 0));
  run.coins = 9000; assert.equal(hatchEgg(run, 'ember', () => 0), null); run.progress.unlocked.ember = 1; assert.ok(hatchEgg(run, 'ember', () => 0));
});

test('every egg has a one-percent Mythical animal with top-tier power and value', () => {
  const run = createRun(); run.progress.unlocked = { meadow: 1, frost: 1, jungle: 1, ember: 1 }; run.coins = 30000;
  const mythicalPets = EGGS.map(egg => {
    assert.equal(Object.values(egg.odds).reduce((sum, chance) => sum + chance, 0), 100);
    assert.equal(egg.odds.mythical, 1);
    const pet = hatchEgg(run, egg.key, () => 0.999999); const definition = petDefinition(pet.key);
    assert.equal(definition.rarity, 'mythical');
    const legendary = petDefinition({ meadow: 'crown-griffin', frost: 'starfall-drake', jungle: 'temple-hydra', ember: 'obsidian-drake' }[egg.key]);
    assert.ok(definition.damage > legendary.damage);
    return pet;
  });
  assert.deepEqual(mythicalPets.map(pet => petDefinition(pet.key).name), ['Moonhorn Unicorn', 'Frost Phoenix', 'Verdant Basilisk', 'Solar Manticore']);
  assert.ok(petSellValue(mythicalPets[0]) > petSellValue({ key: 'crown-griffin' }));
});

test('only three pets equip and equipped pets attack once per second', () => {
  const run = activeRun(); run.coins = 4000; const pets = [0, 0.7, 0.9, 0.99].map(roll => hatchEgg(run, 'meadow', () => roll));
  assert.ok(pets.slice(0, 3).every(pet => togglePet(run, pet.id))); assert.equal(togglePet(run, pets[3].id), false); assert.equal(run.equippedPetIds.length, 3);
  const enemy = run.enemies[0]; Object.assign(run.player, { x: 0, z: 0 }); Object.assign(enemy, { x: 0, z: 0.8, health: 500, maxHealth: 500, mode: 'idle' }); run.pets.forEach(pet => Object.assign(pet, { x: 0, z: 0, cooldown: 0 }));
  const totalDamage = pets.slice(0, 3).reduce((sum, pet) => sum + petDefinition(pet.key).damage, 0); tick(run); assert.equal(enemy.health, 500 - totalDamage); tick(run, {}, 30); assert.equal(enemy.health, 500 - totalDamage); tick(run, {}, 31); assert.equal(enemy.health, 500 - totalDamage * 2);
});

test('enemy index discovery happens on defeat and ranged enemies fire projectiles', () => {
  const run = activeRun(37); const bus = new EventBus(); const ranged = run.enemies.find(enemy => enemy.attackType === 'ranged'); assert.ok(ranged, 'expected a ranged enemy'); assert.equal(run.discovered.has(ranged.type), false);
  Object.assign(run.player, { x: 0, z: 0, health: 1000, maxHealth: 1000 }); Object.assign(ranged, { x: 0, z: 5, mode: 'chase', cooldown: 0 }); tick(run, {}, 1, bus); assert.equal(ranged.mode, 'windup'); tick(run, {}, Math.ceil(B.enemy.windup / B.step), bus); assert.ok(run.projectiles.length > 0, 'no ranged projectile');
  Object.assign(ranged, { x: 0, z: 1.4, health: 1, mode: 'idle' }); Object.assign(run.player, { x: 0, z: 0, facing: 0, attack: null }); tick(run, { attack: true }, 12, bus); assert.equal(run.discovered.has(ranged.type), true);
});

test('sell circles convert pets, armor, and weapons to coins and unequip sold gear', () => {
  const run = createRun(); run.inventory = [{ id: 1, key: 'stone:sword', level: 1 }, { id: 2, key: 'stone:helmet', level: 1 }]; run.equipped = { weapon: 1, helmet: 2 }; recalculate(run);
  run.coins = 500; const pet = hatchEgg(run, 'meadow', () => 0); togglePet(run, pet.id); const before = run.coins;
  assert.ok(sellItem(run, 1, 'tools') > 0); assert.equal(run.equipped.weapon, undefined); assert.ok(sellItem(run, 2, 'armor') > 0); assert.equal(run.equipped.helmet, undefined); assert.ok(sellPet(run, pet.id) > 0); assert.equal(run.pets.length, 0); assert.equal(run.equippedPetIds.length, 0); assert.ok(run.coins > before);
});

function recalculate(run) {
  equipItem(run, 1); equipItem(run, 2);
}
