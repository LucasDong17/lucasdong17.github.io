export const BALANCE = Object.freeze({
  step: 1 / 60, maxFrame: 0.1, arenaHalf: 13,
  player: { health: 100, speed: 4.6, radius: 0.42, damage: 25, range: 2.05, arc: Math.PI * 0.78, windup: 0.16, active: 0.14, recovery: 0.42 },
  enemy: { radius: 0.58, detection: 10, reach: 1.22, windup: 0.5, cooldown: 1.25 },
  pickup: { radius: 1.35, hold: 0.45 }, portal: {
    radius: 1.22,
    playX: 0, playZ: 1.2,
    upgradeX: -7, upgradeZ: 5.6,
    petsX: 7, petsZ: 5.6,
    sellPetsX: 7, sellPetsZ: -3.4,
    sellArmorX: 0, sellArmorZ: -6.7,
    sellWeaponsX: -7, sellWeaponsZ: -3.4,
  },
  intermission: 5, hitFlash: 0.18, maxWave: 50,
});

export const MAPS = Object.freeze({
  hub: {
    key: 'hub',
    obstacles: [
      { x: -10.3, z: -9.7, radius: 1.35, kind: 'tower' }, { x: 10.3, z: -9.7, radius: 1.35, kind: 'tower' },
      { x: -10.3, z: 9.7, radius: 1.35, kind: 'tower' }, { x: 10.3, z: 9.7, radius: 1.35, kind: 'tower' },
      { x: 5.4, z: 5.4, radius: 1, kind: 'well' },
    ],
    spawns: [],
  },
  meadow: {
    key: 'meadow',
    obstacles: [
      { x: -4.2, z: -0.6, radius: 1.25, kind: 'rock' }, { x: 4.4, z: 2.1, radius: 1.15, kind: 'rock' },
      { x: -2.2, z: -5.6, radius: 0.95, kind: 'tree' }, { x: 6.4, z: -5.3, radius: 1, kind: 'tree' },
      { x: -7.2, z: 5.2, radius: 1.1, kind: 'tree' },
    ],
    spawns: [{ x: 0, z: -6 }, { x: 7, z: -2 }, { x: -6, z: -5 }, { x: 7, z: 7 }, { x: -8, z: 1 }, { x: 2, z: -9 }, { x: -7, z: -8 }, { x: 8, z: 3 }],
  },
  frost: {
    key: 'frost',
    obstacles: [
      { x: -6.8, z: -2.4, radius: 1.35, kind: 'crystal' }, { x: 6.7, z: -4.9, radius: 1.15, kind: 'crystal' },
      { x: 5.7, z: 4.5, radius: 1.2, kind: 'ice-rock' }, { x: -3.2, z: 5.4, radius: 1, kind: 'ice-rock' },
      { x: 0.8, z: -2, radius: 0.9, kind: 'crystal' },
    ],
    spawns: [{ x: -8, z: -7 }, { x: 8, z: -8 }, { x: -8, z: 2 }, { x: 8, z: 1 }, { x: -7, z: 8 }, { x: 1, z: -9 }, { x: 8, z: 8 }, { x: 0, z: -7 }],
  },
});

const meadowEnemies = [
  { key: 'cow', name: 'Meadow Cow', icon: '🐄', model: 'cow', health: 62, damage: 10, speed: 1.8, attackType: 'melee', range: 1.22, cooldown: 1.45, color: '#f4efe0', accent: '#493d36', trait: 'Slow, sturdy headbutter' },
  { key: 'boar', name: 'Bramble Boar', icon: '🐗', model: 'boar', health: 78, damage: 12, speed: 2.35, attackType: 'melee', range: 1.35, cooldown: 1.2, color: '#b86f58', accent: '#f1c38f', trait: 'Short-range charging bruiser' },
  { key: 'wolf', name: 'Moss Wolf', icon: '🐺', model: 'wolf', health: 68, damage: 13, speed: 3.1, attackType: 'melee', range: 1.15, cooldown: 0.9, color: '#6f8193', accent: '#dbe5e2', trait: 'Fast hunter with rapid bites' },
  { key: 'golem', name: 'Stone Golem', icon: '🪨', model: 'golem', health: 112, damage: 17, speed: 1.45, attackType: 'melee', range: 1.5, cooldown: 1.7, color: '#788b87', accent: '#c6d3bf', trait: 'Armored, slow heavy hitter' },
  { key: 'guardian', name: 'Jade Guardian', icon: '🐲', model: 'guardian', health: 105, damage: 15, speed: 2.05, attackType: 'ranged', range: 6.2, cooldown: 1.8, projectileSpeed: 7, color: '#25a779', accent: '#b8f2cf', trait: 'Keeps its distance and launches jade bolts' },
];
const frostEnemies = [
  { key: 'hare', name: 'Frost Hare', icon: '🐇', model: 'hare', health: 155, damage: 20, speed: 3.45, attackType: 'melee', range: 1.05, cooldown: 0.78, color: '#e9fbff', accent: '#8bcce0', trait: 'Tiny, lightning-fast attacker' },
  { key: 'yak', name: 'Tundra Yak', icon: '🐂', model: 'yak', health: 240, damage: 25, speed: 1.65, attackType: 'melee', range: 1.45, cooldown: 1.55, color: '#806c68', accent: '#e9d8c2', trait: 'Massive winter hide and wide horns' },
  { key: 'lynx', name: 'Ice Lynx', icon: '🐈', model: 'lynx', health: 178, damage: 26, speed: 3.2, attackType: 'melee', range: 1.18, cooldown: 0.88, color: '#bad8df', accent: '#314e62', trait: 'Relentless close-range pursuit' },
  { key: 'walrus', name: 'Glacier Walrus', icon: '🦭', model: 'walrus', health: 285, damage: 29, speed: 1.4, attackType: 'melee', range: 1.55, cooldown: 1.65, color: '#7995a1', accent: '#f7e7c1', trait: 'Slow armored bruiser with long tusks' },
  { key: 'owl', name: 'Aurora Owl', icon: '🦉', model: 'owl', health: 190, damage: 28, speed: 2.4, attackType: 'ranged', range: 7.2, cooldown: 1.45, projectileSpeed: 8.5, color: '#d7e9f4', accent: '#9d68df', trait: 'Launches quick aurora feathers from afar' },
  { key: 'mammoth', name: 'Snow Mammoth', icon: '🦣', model: 'mammoth', health: 330, damage: 36, speed: 1.55, attackType: 'melee', range: 1.65, cooldown: 1.85, color: '#7c8792', accent: '#e8ddc7', trait: 'Towering endurance and crushing strikes' },
  { key: 'wraith', name: 'Rime Wraith', icon: '👻', model: 'wraith', health: 220, damage: 34, speed: 2.7, attackType: 'ranged', range: 7.8, cooldown: 1.25, projectileSpeed: 6.5, color: '#80e5ec', accent: '#315b9c', trait: 'Fires frequent slow frost orbs' },
  { key: 'drake', name: 'Crystal Drake', icon: '🐉', model: 'drake', health: 350, damage: 40, speed: 2.25, attackType: 'ranged', range: 6.8, cooldown: 1.7, projectileSpeed: 9, color: '#6fc7ee', accent: '#d6adff', trait: 'Mobile predator that spits crystal shards' },
];

export const BIOMES = Object.freeze([
  { key: 'meadow', name: 'Mossvale Meadow', short: 'Meadow', description: 'Rolling grasslands and familiar beasts.', ground: '#95b968', world: '#83ad62', fog: '#b9d8ba', enemies: meadowEnemies },
  { key: 'frost', name: 'Frostfang Tundra', short: 'Tundra', description: 'A frozen hunting ground with stronger rewards.', ground: '#b8dae0', world: '#8cb6c2', fog: '#c9e7ed', enemies: frostEnemies },
]);
export const ENEMIES = Object.freeze(BIOMES.flatMap(biome => biome.enemies.map((enemy, index) => ({ ...enemy, biome: biome.key, waves: `${index * 6 + 1}+` }))));
export const BOSSES = Object.freeze({ meadow: { key: 'king', name: 'Crowned Colossus', icon: '👑', model: 'king', health: 2600, damage: 48, speed: 2.05, attackType: 'melee', range: 1.75, cooldown: 1.35, color: '#7c4bc4', accent: '#ffd76a', trait: 'Huge crowned guardian with sweeping melee hits' }, frost: { key: 'wyrm', name: 'Aurora Wyrm', icon: '🌌', model: 'wyrm', health: 5200, damage: 72, speed: 2.15, attackType: 'ranged', range: 8.5, cooldown: 1.15, projectileSpeed: 8, color: '#427de8', accent: '#e1a7ff', trait: 'Final guardian that rains rapid aurora bolts' } });
export const BOSS = BOSSES.meadow;
export const RARITIES = Object.freeze({
  common: { name: 'Common', color: '#a9c4af' }, rare: { name: 'Rare', color: '#58b9ef' },
  epic: { name: 'Epic', color: '#c477ef' }, legendary: { name: 'Legendary', color: '#ffc857' },
});
export const PETS = Object.freeze([
  { key: 'squire-pup', egg: 'meadow', name: 'Squire Pup', icon: '🐕', rarity: 'common', damage: 12, color: '#b98758', accent: '#d9dde0', kind: 'beast' },
  { key: 'owl-archer', egg: 'meadow', name: 'Owl Archer', icon: '🦉', rarity: 'rare', damage: 20, color: '#9b7455', accent: '#6fbd73', kind: 'owl' },
  { key: 'moss-golem', egg: 'meadow', name: 'Moss Golem', icon: '🪨', rarity: 'epic', damage: 34, color: '#668b70', accent: '#8fd35d', kind: 'golem' },
  { key: 'crown-griffin', egg: 'meadow', name: 'Crown Griffin', icon: '🦅', rarity: 'legendary', damage: 55, color: '#c98545', accent: '#ffd86b', kind: 'griffin' },
  { key: 'hare-sentry', egg: 'frost', name: 'Snow Hare Sentry', icon: '🐇', rarity: 'common', damage: 28, color: '#dff6f6', accent: '#70bfe4', kind: 'hare' },
  { key: 'ice-lynx', egg: 'frost', name: 'Ice Lynx', icon: '🐈', rarity: 'rare', damage: 44, color: '#8fc9d8', accent: '#416b9a', kind: 'beast' },
  { key: 'rime-knight', egg: 'frost', name: 'Rime Knight', icon: '🧙', rarity: 'epic', damage: 68, color: '#567aa8', accent: '#a5efff', kind: 'knight' },
  { key: 'starfall-drake', egg: 'frost', name: 'Starfall Drake', icon: '🐉', rarity: 'legendary', damage: 100, color: '#7056b8', accent: '#f3b7ff', kind: 'drake' },
]);
export const EGGS = Object.freeze([
  { key: 'meadow', name: 'Mossvale Egg', biome: 'meadow', cost: 500, icon: '🥚', description: 'A warm speckled egg with a loyal medieval companion inside.', odds: { common: 60, rare: 25, epic: 11, legendary: 4 } },
  { key: 'frost', name: 'Frostfang Egg', biome: 'frost', cost: 1500, icon: '❄️', description: 'A difficult icy hatch containing stronger tundra companions.', odds: { common: 68, rare: 22, epic: 8, legendary: 2 } },
]);
export function petDefinition(key) { return PETS.find(pet => pet.key === key) || null; }
export function eggDefinition(key) { return EGGS.find(egg => egg.key === key) || null; }
export function coinRewardForWave(wave, biome = 'meadow') { return biome === 'frost' ? 120 + wave * 35 : 40 + wave * 12; }
export function itemSellValue(item) { const definition = itemDefinition(item.key, item.level || 1); if (!definition) return 0; const base = definition.category === 'tools' ? 18 + definition.damage * 2 : 14 + definition.defense * 5 + definition.health * 2; return Math.max(10, Math.round(base * (1 + ((item.level || 1) - 1) * 0.35))); }
export function petSellValue(pet) { const definition = petDefinition(pet.key); if (!definition) return 0; const rarityValue = { common: 100, rare: 260, epic: 650, legendary: 1500 }; return rarityValue[definition.rarity] + definition.damage * 5; }
export const SETS = Object.freeze([
  { key: 'stone', name: 'Stone', color: '#93a29d', biome: 'meadow', unlock: 1, power: 1 }, { key: 'iron', name: 'Iron', color: '#9ebad1', biome: 'meadow', unlock: 10, power: 1.35 }, { key: 'jade', name: 'Jade', color: '#38d193', biome: 'meadow', unlock: 20, power: 1.75 }, { key: 'diamond', name: 'Diamond', color: '#55ddff', biome: 'meadow', unlock: 35, power: 2.25 }, { key: 'warborn', name: 'Warborn', color: '#d26aff', biome: 'meadow', unlock: 45, power: 3 },
  { key: 'frostbite', name: 'Frostbite', color: '#8ee8ff', biome: 'frost', unlock: 1, power: 3.4 }, { key: 'glacier', name: 'Glacier', color: '#66a9e8', biome: 'frost', unlock: 10, power: 3.9 }, { key: 'aurora', name: 'Aurora', color: '#b686f4', biome: 'frost', unlock: 20, power: 4.5 }, { key: 'mammoth', name: 'Mammoth', color: '#d9c7aa', biome: 'frost', unlock: 30, power: 5.2 }, { key: 'rime', name: 'Rimeforged', color: '#79f1df', biome: 'frost', unlock: 40, power: 6 }, { key: 'starfall', name: 'Starfall', color: '#f1b2ff', biome: 'frost', unlock: 48, power: 7 },
]);
export const ITEM_TYPES = Object.freeze([
  { key: 'sword', name: 'Sword', category: 'tools', slot: 'weapon', icon: '⚔️', damage: 8 }, { key: 'mace', name: 'Mace', category: 'tools', slot: 'weapon', icon: '🎖️', damage: 10 }, { key: 'spear', name: 'Spear', category: 'tools', slot: 'weapon', icon: '🔱', damage: 9 }, { key: 'axe', name: 'Axe', category: 'tools', slot: 'weapon', icon: '🪓', damage: 11 }, { key: 'warhammer', name: 'War hammer', category: 'tools', slot: 'weapon', icon: '🔨', damage: 13 },
  { key: 'helmet', name: 'Helmet', category: 'armor', slot: 'helmet', icon: '⛑️', defense: 2, health: 4 }, { key: 'chestplate', name: 'Chestplate', category: 'armor', slot: 'chestplate', icon: '🛡️', defense: 4, health: 10 }, { key: 'leggings', name: 'Leggings', category: 'armor', slot: 'leggings', icon: '🩳', defense: 3, health: 7 }, { key: 'boots', name: 'Boots', category: 'armor', slot: 'boots', icon: '🥾', defense: 2, health: 5 },
]);
export const OBSTACLES = MAPS.meadow.obstacles;
export const SPAWNS = MAPS.meadow.spawns;
export function biomeDefinition(key) { return BIOMES.find(biome => biome.key === key) || BIOMES[0]; }
export function enemyForWave(wave, biomeKey = 'meadow', index = 0) { const biome = biomeDefinition(biomeKey); if (wave === BALANCE.maxWave) return { ...BOSSES[biome.key], boss: true }; const tier = Math.min(biome.enemies.length - 1, Math.floor((wave - 1) / Math.max(1, Math.floor(49 / biome.enemies.length)))); const base = biome.enemies[(tier + index) % Math.min(biome.enemies.length, tier + 2)]; const scale = 1 + (wave - 1) * 0.055; return { ...base, health: Math.round(base.health * scale), damage: Math.round(base.damage * (1 + (wave - 1) * 0.032)), boss: false }; }
export function enemyCountForWave(wave) { return wave === BALANCE.maxWave ? 1 : Math.min(8, 1 + Math.floor((wave - 1) / 7)); }
export function itemDefinition(key, level = 1) { const [setKey, typeKey] = key.split(':'); const set = SETS.find(entry => entry.key === setKey); const type = ITEM_TYPES.find(entry => entry.key === typeKey); if (!set || !type) return null; const upgrade = 1 + Math.max(0, level - 1) * 0.3; return { key, set: set.key, type: type.key, name: `${set.name} ${type.name}`, category: type.category, slot: type.slot, icon: type.icon, color: set.color, level, damage: Math.round((type.damage || 0) * set.power * upgrade), defense: Math.round((type.defense || 0) * set.power * upgrade), health: Math.round((type.health || 0) * set.power * upgrade) }; }
