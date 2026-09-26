import { BALANCE, PETS, SPAWNS, eggDefinition, enemyCountForWave, enemyForWave, itemDefinition, petDefinition } from '../data/balance.js';

export const SAVE_KEY = 'mossvale-save-v2';

export function defaultProgress() {
  return { version: 3, inventory: [], equipped: {}, nextItemId: 1, coins: 0, pets: [], equippedPetIds: [], nextPetId: 1, discovered: ['cow'], unlocked: { meadow: 1, frost: 0 }, highest: { meadow: 1, frost: 0 }, completed: { meadow: false, frost: false } };
}

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const data = JSON.parse(storage?.getItem(SAVE_KEY));
    if (![2, 3].includes(data?.version) || !Array.isArray(data.inventory)) return defaultProgress();
    return { ...defaultProgress(), ...data, version: 3, pets: Array.isArray(data.pets) ? data.pets : [], equippedPetIds: Array.isArray(data.equippedPetIds) ? data.equippedPetIds.slice(0, 3) : [], unlocked: { meadow: 1, frost: 0, ...data.unlocked }, highest: { meadow: 1, frost: 0, ...(data.highest || data.unlocked) }, completed: { meadow: false, frost: false, ...data.completed } };
  } catch { return defaultProgress(); }
}

export function saveProgress(run, storage = globalThis.localStorage) {
  const progress = { version: 3, inventory: run.inventory, equipped: run.equipped, nextItemId: run.nextItemId, coins: run.coins, pets: run.pets.map(({ id, key }) => ({ id, key })), equippedPetIds: run.equippedPetIds, nextPetId: run.nextPetId, discovered: [...run.discovered], unlocked: run.progress.unlocked, highest: run.progress.highest, completed: run.progress.completed };
  try { storage?.setItem(SAVE_KEY, JSON.stringify(progress)); } catch { /* Storage can be unavailable in private contexts. */ }
  return progress;
}

export function createEnemy(spawn = SPAWNS[0], wave = 1, biome = 'meadow', index = 0) {
  const definition = enemyForWave(wave, biome, index);
  return { id: `${wave}-${index}`, ...spawn, radius: BALANCE.enemy.radius + (definition.boss ? 0.22 : 0), health: definition.health, maxHealth: definition.health, damage: definition.damage, speed: definition.speed, type: definition.key, name: definition.name, boss: definition.boss, color: definition.color, accent: definition.accent, facing: 0, mode: 'idle', timer: 0, cooldown: index * 0.18, flash: 0 };
}

export function createWaveEnemies(wave, biome, world, player, spawnIndex = 0) {
  const enemies = [];
  for (let index = 0; index < enemyCountForWave(wave); index++) enemies.push(createEnemy(world ? world.spawn(player, spawnIndex + index, enemies) : SPAWNS[index % SPAWNS.length], wave, biome, index));
  return enemies;
}

export function createRun(saved = defaultProgress()) {
  const inventory = saved.inventory.map(item => ({ ...item, level: item.level || 1 }));
  const pets = (saved.pets || []).filter(pet => petDefinition(pet.key)).map((pet, index) => ({ ...pet, x: 0.7 + index * 0.35, z: 9.2, radius: 0.28, facing: Math.PI, cooldown: index * 0.18, attack: 0, flash: 0 }));
  const run = {
    status: 'hub', time: 0, spawnIndex: 0, biome: 'meadow', wave: 1, phase: 'hub', intermission: 0, portalLatch: false,
    player: { x: 0, z: 8.5, radius: BALANCE.player.radius, health: BALANCE.player.health, maxHealth: BALANCE.player.health, damage: BALANCE.player.damage, defense: 0, facing: Math.PI, attack: null, flash: 0, moving: false },
    enemies: [], drops: [], inventory, equipped: { ...saved.equipped }, coins: Math.max(0, saved.coins || 0), pets, equippedPetIds: (saved.equippedPetIds || []).filter(id => pets.some(pet => pet.id === id)).slice(0, 3), nextPetId: saved.nextPetId || 1, discovered: new Set(saved.discovered || ['cow']), pickup: { id: null, progress: 0 }, nextItemId: saved.nextItemId || 1,
    progress: { unlocked: { meadow: 1, frost: 0, ...saved.unlocked }, highest: { meadow: 1, frost: 0, ...(saved.highest || saved.unlocked) }, completed: { meadow: false, frost: false, ...saved.completed } },
  };
  recalculateStats(run, false);
  return run;
}

export function hatchEgg(run, eggKey, random = Math.random) {
  const egg = eggDefinition(eggKey);
  if (!egg || run.coins < egg.cost || (egg.biome === 'frost' && !(run.progress.unlocked.frost > 0))) return null;
  run.coins -= egg.cost;
  let roll = Math.max(0, Math.min(0.999999, random())) * 100; let rarity = 'common';
  for (const [candidate, chance] of Object.entries(egg.odds)) { if (roll < chance) { rarity = candidate; break; } roll -= chance; }
  const pool = PETS.filter(pet => pet.egg === eggKey && pet.rarity === rarity);
  const definition = pool[Math.floor(Math.max(0, Math.min(0.999999, random())) * pool.length)] || PETS.find(pet => pet.egg === eggKey);
  const pet = { id: run.nextPetId++, key: definition.key, x: run.player.x + 0.7, z: run.player.z + 0.7, radius: 0.28, facing: run.player.facing, cooldown: 0, attack: 0, flash: 0, new: true };
  run.pets.push(pet);
  return pet;
}

export function togglePet(run, petId) {
  if (!run.pets.some(pet => pet.id === petId)) return false;
  if (run.equippedPetIds.includes(petId)) { run.equippedPetIds = run.equippedPetIds.filter(id => id !== petId); return true; }
  if (run.equippedPetIds.length >= 3) return false;
  run.equippedPetIds.push(petId); return true;
}

export function recalculateStats(run, healGain = true) {
  let maxHealth = BALANCE.player.health; let defense = 0; let damage = BALANCE.player.damage;
  for (const id of Object.values(run.equipped)) {
    const item = run.inventory.find(entry => entry.id === id);
    const stats = item && itemDefinition(item.key, item.level);
    if (!stats) continue;
    maxHealth += stats.health; defense += stats.defense; damage = Math.max(damage, BALANCE.player.damage + stats.damage);
  }
  const gained = maxHealth - run.player.maxHealth;
  Object.assign(run.player, { maxHealth, defense, damage, health: Math.min(maxHealth, run.player.health + (healGain ? Math.max(0, gained) : 0)) });
}

export function equipItem(run, itemId) {
  const item = run.inventory.find(entry => entry.id === itemId);
  const definition = item && itemDefinition(item.key, item.level);
  if (!definition) return false;
  run.equipped[definition.slot] = item.id; recalculateStats(run); return true;
}

export function equipBestItems(run, category) {
  const bestBySlot = new Map();
  for (const item of run.inventory) {
    const definition = itemDefinition(item.key, item.level);
    if (!definition || definition.category !== category) continue;
    const score = category === 'tools' ? definition.damage : definition.defense + definition.health;
    const current = bestBySlot.get(definition.slot);
    if (!current || score > current.score || (score === current.score && definition.level > current.level)) {
      bestBySlot.set(definition.slot, { id: item.id, level: definition.level, score });
    }
  }
  if (!bestBySlot.size) return false;
  for (const [slot, item] of bestBySlot) run.equipped[slot] = item.id;
  recalculateStats(run);
  return true;
}

export function combineItems(run, key, level = 1) {
  const matches = run.inventory.filter(item => item.key === key && (item.level || 1) === level).slice(0, 2);
  if (matches.length < 2) return false;
  const equippedSlots = Object.entries(run.equipped).filter(([, id]) => matches.some(item => item.id === id)).map(([slot]) => slot);
  const keep = matches[0]; keep.level = level + 1;
  run.inventory = run.inventory.filter(item => item.id !== matches[1].id);
  for (const slot of equippedSlots) run.equipped[slot] = keep.id;
  recalculateStats(run); return keep;
}

export function enterHub(run, world) {
  world?.setMap('hub');
  run.status = 'hub'; run.phase = 'hub'; run.enemies = []; run.drops = []; run.pickup = { id: null, progress: 0 };
  Object.assign(run.player, { x: 0, z: 8.5, health: run.player.maxHealth, facing: Math.PI, attack: null, moving: false });
  run.pets.forEach((pet, index) => Object.assign(pet, { x: (index % 3 - 1) * 0.65, z: 9.5 + Math.floor(index / 3) * 0.45, cooldown: 0, attack: 0 }));
}

export function startLevel(run, biome, wave, world) {
  if ((run.progress.unlocked[biome] || 0) < wave) return false;
  world?.setMap(biome);
  run.biome = biome; run.wave = wave; run.status = 'playing'; run.phase = 'combat'; run.intermission = 0; run.drops = [];
  run.progress.highest[biome] = Math.max(run.progress.highest[biome] || 0, wave);
  Object.assign(run.player, { x: 0, z: 6, health: run.player.maxHealth, facing: Math.PI, attack: null });
  run.pets.forEach((pet, index) => Object.assign(pet, { x: (index % 3 - 1) * 0.65, z: 7.1 + Math.floor(index / 3) * 0.45, cooldown: index * 0.15, attack: 0 }));
  run.enemies = createWaveEnemies(wave, biome, world, run.player, run.spawnIndex);
  run.enemies.forEach(enemy => run.discovered.add(enemy.type));
  return true;
}

export function primaryEnemy(run) { return run.enemies.find(enemy => enemy.health > 0) || run.enemies[0] || null; }
