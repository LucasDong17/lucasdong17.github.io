import { BALANCE, SPAWNS, enemyForWave, itemDefinition } from '../data/balance.js';

export function createEnemy(spawn = SPAWNS[0], wave = 1) {
  const definition = enemyForWave(wave);
  return { ...spawn, radius: BALANCE.enemy.radius + (definition.boss ? 0.18 : 0), health: definition.health, maxHealth: definition.health, damage: definition.damage, speed: definition.speed, type: definition.key, name: definition.name, boss: definition.boss, color: definition.color, accent: definition.accent, facing: 0, mode: 'idle', timer: 0, cooldown: 0, flash: 0 };
}

export function createRun() {
  return {
    status: 'playing', time: 0, spawnIndex: 0, wave: 1, phase: 'combat', intermission: 0,
    player: { x: 0, z: 6, radius: BALANCE.player.radius, health: BALANCE.player.health, maxHealth: BALANCE.player.health, damage: BALANCE.player.damage, defense: 0, facing: Math.PI, attack: null, flash: 0, moving: false },
    enemy: createEnemy(),
    drops: [], inventory: [], equipped: {}, discovered: new Set(['cow']), pickup: { id: null, progress: 0 }, nextItemId: 1,
  };
}

export function equipItem(run, itemId) {
  const item = run.inventory.find(entry => entry.id === itemId);
  const definition = item && itemDefinition(item.key);
  if (!definition) return false;
  run.equipped[definition.slot] = item.id;
  let maxHealth = BALANCE.player.health;
  let defense = 0;
  let damage = BALANCE.player.damage;
  Object.values(run.equipped).forEach(id => {
    const equipped = run.inventory.find(entry => entry.id === id);
    const stats = equipped && itemDefinition(equipped.key);
    if (!stats) return;
    maxHealth += stats.health;
    defense += stats.defense;
    damage = Math.max(damage, BALANCE.player.damage + stats.damage);
  });
  const gainedHealth = maxHealth - run.player.maxHealth;
  Object.assign(run.player, { maxHealth, defense, damage, health: Math.min(maxHealth, run.player.health + Math.max(0, gainedHealth)) });
  return true;
}
