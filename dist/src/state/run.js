import { BALANCE, SPAWNS, enemyCountForWave, enemyForWave, itemDefinition } from '../data/balance.js';

export const SAVE_KEY = 'mossvale-save-v2';

export function defaultProgress() {
  return { version: 2, inventory: [], equipped: {}, nextItemId: 1, discovered: ['cow'], unlocked: { meadow: 1, frost: 0 }, highest: { meadow: 1, frost: 0 }, completed: { meadow: false, frost: false } };
}

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const data = JSON.parse(storage?.getItem(SAVE_KEY));
    if (data?.version !== 2 || !Array.isArray(data.inventory)) return defaultProgress();
    return { ...defaultProgress(), ...data, unlocked: { meadow: 1, frost: 0, ...data.unlocked }, highest: { meadow: 1, frost: 0, ...(data.highest || data.unlocked) }, completed: { meadow: false, frost: false, ...data.completed } };
  } catch { return defaultProgress(); }
}

export function saveProgress(run, storage = globalThis.localStorage) {
  const progress = { version: 2, inventory: run.inventory, equipped: run.equipped, nextItemId: run.nextItemId, discovered: [...run.discovered], unlocked: run.progress.unlocked, highest: run.progress.highest, completed: run.progress.completed };
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
  const run = {
    status: 'hub', time: 0, spawnIndex: 0, biome: 'meadow', wave: 1, phase: 'hub', intermission: 0, portalLatch: false,
    player: { x: 0, z: 8.5, radius: BALANCE.player.radius, health: BALANCE.player.health, maxHealth: BALANCE.player.health, damage: BALANCE.player.damage, defense: 0, facing: Math.PI, attack: null, flash: 0, moving: false },
    enemies: [], drops: [], inventory, equipped: { ...saved.equipped }, discovered: new Set(saved.discovered || ['cow']), pickup: { id: null, progress: 0 }, nextItemId: saved.nextItemId || 1,
    progress: { unlocked: { meadow: 1, frost: 0, ...saved.unlocked }, highest: { meadow: 1, frost: 0, ...(saved.highest || saved.unlocked) }, completed: { meadow: false, frost: false, ...saved.completed } },
  };
  recalculateStats(run, false);
  return run;
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
}

export function startLevel(run, biome, wave, world) {
  if ((run.progress.unlocked[biome] || 0) < wave) return false;
  world?.setMap(biome);
  run.biome = biome; run.wave = wave; run.status = 'playing'; run.phase = 'combat'; run.intermission = 0; run.drops = [];
  run.progress.highest[biome] = Math.max(run.progress.highest[biome] || 0, wave);
  Object.assign(run.player, { x: 0, z: 6, health: run.player.maxHealth, facing: Math.PI, attack: null });
  run.enemies = createWaveEnemies(wave, biome, world, run.player, run.spawnIndex);
  run.enemies.forEach(enemy => run.discovered.add(enemy.type));
  return true;
}

export function primaryEnemy(run) { return run.enemies.find(enemy => enemy.health > 0) || run.enemies[0] || null; }
