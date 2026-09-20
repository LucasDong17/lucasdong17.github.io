export const BALANCE = Object.freeze({
  step: 1 / 60,
  maxFrame: 0.1,
  arenaHalf: 13,
  player: { health: 100, speed: 4.6, radius: 0.42, damage: 25, range: 2.05, arc: Math.PI * 0.78, windup: 0.16, active: 0.14, recovery: 0.42 },
  enemy: { radius: 0.58, detection: 7, reach: 1.22, windup: 0.5, cooldown: 1.25 },
  pickup: { radius: 1.35, hold: 0.6 },
  intermission: 10,
  hitFlash: 0.18,
});

export const ENEMIES = Object.freeze([
  { key: 'cow', name: 'Meadow Cow', icon: '🐄', health: 75, damage: 14, speed: 1.9, color: '#f4efe0', accent: '#493d36', waves: '1–2', trait: 'Slow and sturdy' },
  { key: 'boar', name: 'Bramble Boar', icon: '🐗', health: 105, damage: 13, speed: 2.25, color: '#b86f58', accent: '#f1c38f', waves: '3–4', trait: 'Tough hide' },
  { key: 'wolf', name: 'Moss Wolf', icon: '🐺', health: 125, damage: 16, speed: 3.05, color: '#6f8193', accent: '#dbe5e2', waves: '5–6', trait: 'Quick pursuit' },
  { key: 'golem', name: 'Stone Golem', icon: '🪨', health: 165, damage: 20, speed: 1.65, color: '#788b87', accent: '#c6d3bf', waves: '7–8', trait: 'Heavy armor' },
  { key: 'guardian', name: 'Jade Guardian', icon: '🐲', health: 205, damage: 24, speed: 2.35, color: '#25a779', accent: '#b8f2cf', waves: '9+', trait: 'Balanced hunter' },
]);

export const BOSS = Object.freeze({ key: 'king', name: 'Crowned Colossus', icon: '👑', health: 420, damage: 31, speed: 2.15, color: '#7c4bc4', accent: '#ffd76a', waves: '10, 20, 30…', trait: 'Boss · guaranteed rare loot' });

export const SETS = Object.freeze([
  { key: 'stone', name: 'Stone', color: '#93a29d', unlock: 1, power: 1 },
  { key: 'iron', name: 'Iron', color: '#9ebad1', unlock: 3, power: 1.35 },
  { key: 'jade', name: 'Jade', color: '#38d193', unlock: 5, power: 1.75 },
  { key: 'diamond', name: 'Diamond', color: '#55ddff', unlock: 8, power: 2.25 },
  { key: 'warborn', name: 'Warborn', color: '#d26aff', unlock: 10, power: 3 },
]);

export const ITEM_TYPES = Object.freeze([
  { key: 'sword', name: 'Sword', category: 'tools', slot: 'weapon', icon: '⚔️', damage: 8 },
  { key: 'mace', name: 'Mace', category: 'tools', slot: 'weapon', icon: '🎖️', damage: 10 },
  { key: 'spear', name: 'Spear', category: 'tools', slot: 'weapon', icon: '🔱', damage: 9 },
  { key: 'axe', name: 'Axe', category: 'tools', slot: 'weapon', icon: '🪓', damage: 11 },
  { key: 'warhammer', name: 'War hammer', category: 'tools', slot: 'weapon', icon: '🔨', damage: 13 },
  { key: 'helmet', name: 'Helmet', category: 'armor', slot: 'helmet', icon: '⛑️', defense: 2, health: 4 },
  { key: 'chestplate', name: 'Chestplate', category: 'armor', slot: 'chestplate', icon: '🛡️', defense: 4, health: 10 },
  { key: 'leggings', name: 'Leggings', category: 'armor', slot: 'leggings', icon: '🩳', defense: 3, health: 7 },
  { key: 'boots', name: 'Boots', category: 'armor', slot: 'boots', icon: '🥾', defense: 2, health: 5 },
]);

export const OBSTACLES = [
  { x: -3.5, z: 0, radius: 1.25, kind: 'rock' },
  { x: 3.5, z: 1.5, radius: 1.15, kind: 'rock' },
  { x: -1.8, z: -5, radius: 0.95, kind: 'tree' },
  { x: 6, z: -5.5, radius: 1, kind: 'tree' },
  { x: -7, z: 5, radius: 1.1, kind: 'tree' },
];

export const SPAWNS = [{ x: 0, z: -2 }, { x: 7, z: -2 }, { x: -6, z: -5 }, { x: 0, z: -8 }];

export function enemyForWave(wave) {
  if (wave % 10 === 0) return { ...BOSS, health: BOSS.health + (wave - 10) * 22, boss: true };
  const base = ENEMIES[Math.min(ENEMIES.length - 1, Math.floor((wave - 1) / 2))];
  const scale = 1 + Math.max(0, wave - 9) * 0.09;
  return { ...base, health: Math.round(base.health * scale), damage: Math.round(base.damage * scale), boss: false };
}

export function itemDefinition(key) {
  const [setKey, typeKey] = key.split(':');
  const set = SETS.find(entry => entry.key === setKey);
  const type = ITEM_TYPES.find(entry => entry.key === typeKey);
  if (!set || !type) return null;
  return { key, set: set.key, type: type.key, name: `${set.name} ${type.name}`, category: type.category, slot: type.slot, icon: type.icon, color: set.color, damage: Math.round((type.damage || 0) * set.power), defense: Math.round((type.defense || 0) * set.power), health: Math.round((type.health || 0) * set.power) };
}
