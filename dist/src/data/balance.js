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
    towerX: 0, towerZ: 10.7,
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
  jungle: {
    key: 'jungle',
    obstacles: [
      { x: -6.5, z: -3.8, radius: 1.25, kind: 'ruin' }, { x: 6.2, z: -5.2, radius: 1.1, kind: 'ruin' },
      { x: 5.4, z: 4.7, radius: 1.25, kind: 'jungle-tree' }, { x: -4.1, z: 5.6, radius: 1.1, kind: 'jungle-tree' },
      { x: 0.5, z: -1.9, radius: 0.9, kind: 'idol' },
    ],
    spawns: [{ x: -8, z: -8 }, { x: 8, z: -7 }, { x: -8, z: 1 }, { x: 8, z: 2 }, { x: -7, z: 8 }, { x: 2, z: -9 }, { x: 8, z: 8 }, { x: 0, z: -7 }],
  },
  ember: {
    key: 'ember',
    obstacles: [
      { x: -6.7, z: -4.2, radius: 1.3, kind: 'basalt' }, { x: 6.4, z: -5, radius: 1.15, kind: 'lava-vent' },
      { x: 5.8, z: 4.9, radius: 1.25, kind: 'basalt' }, { x: -4.4, z: 5.5, radius: 1.05, kind: 'lava-vent' },
      { x: 0.4, z: -1.8, radius: 0.92, kind: 'obsidian-spire' },
    ],
    spawns: [{ x: -8, z: -8 }, { x: 8, z: -8 }, { x: -8, z: 1 }, { x: 8, z: 2 }, { x: -7, z: 8 }, { x: 2, z: -9 }, { x: 8, z: 8 }, { x: 0, z: -7 }],
  },
  tower: {
    key: 'tower',
    obstacles: [
      { x: -6.8, z: -4.6, radius: 1.15, kind: 'rune-pillar' }, { x: 6.8, z: -4.6, radius: 1.15, kind: 'rune-pillar' },
      { x: -6.8, z: 4.6, radius: 1.15, kind: 'rune-pillar' }, { x: 6.8, z: 4.6, radius: 1.15, kind: 'rune-pillar' },
      { x: 0, z: -1.6, radius: 0.9, kind: 'arcane-core' },
    ],
    spawns: [{ x: -8, z: -8 }, { x: 8, z: -8 }, { x: -8, z: 0 }, { x: 8, z: 0 }, { x: -8, z: 8 }, { x: 8, z: 8 }, { x: 0, z: -9 }, { x: 0, z: 9 }],
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
const jungleEnemies = [
  { key: 'beetle', name: 'Sunscale Beetle', icon: '🪲', model: 'beetle', health: 390, damage: 42, speed: 2.2, attackType: 'melee', range: 1.15, cooldown: 1.05, color: '#5e9f4c', accent: '#f5c64f', trait: 'Armored skirmisher with a golden shell' },
  { key: 'serpent', name: 'Vine Serpent', icon: '🐍', model: 'serpent', health: 420, damage: 46, speed: 3.25, attackType: 'melee', range: 1.35, cooldown: 0.82, color: '#3e8f57', accent: '#d8f06f', trait: 'Fast slithering hunter with sudden strikes' },
  { key: 'monkey', name: 'Temple Monkey', icon: '🐒', model: 'monkey', health: 445, damage: 48, speed: 3.05, attackType: 'ranged', range: 7, cooldown: 1.35, projectileSpeed: 9.5, color: '#9b6846', accent: '#f0b84c', trait: 'Hurls sunfruit while keeping its distance' },
  { key: 'panther', name: 'Shadow Panther', icon: '🐆', model: 'panther', health: 510, damage: 55, speed: 3.65, attackType: 'melee', range: 1.22, cooldown: 0.74, color: '#343550', accent: '#b978e8', trait: 'The jungle\'s quickest close-range predator' },
  { key: 'shaman', name: 'Canopy Shaman', icon: '🧙', model: 'shaman', health: 500, damage: 58, speed: 2.25, attackType: 'ranged', range: 8, cooldown: 1.18, projectileSpeed: 7.5, color: '#4d8c6b', accent: '#66f0c1', trait: 'Casts bright spirit bolts through the canopy' },
  { key: 'scarab', name: 'Relic Scarab', icon: '🪲', model: 'scarab', health: 620, damage: 61, speed: 1.75, attackType: 'melee', range: 1.45, cooldown: 1.4, color: '#39796c', accent: '#e5ba55', trait: 'A plated ruin guardian built to endure' },
  { key: 'cobra', name: 'Emerald Cobra', icon: '🐍', model: 'cobra', health: 570, damage: 65, speed: 2.65, attackType: 'ranged', range: 7.5, cooldown: 1.05, projectileSpeed: 10, color: '#238d5a', accent: '#ffe16b', trait: 'Spits fast venom-colored bolts from long range' },
  { key: 'treant', name: 'Ancient Treant', icon: '🌳', model: 'treant', health: 760, damage: 72, speed: 1.45, attackType: 'melee', range: 1.7, cooldown: 1.75, color: '#69523c', accent: '#71bd56', trait: 'Towering ancient with crushing branch arms' },
];
const emberEnemies = [
  { key: 'cinder-fox', name: 'Cinder Fox', icon: '🦊', model: 'wolf', health: 840, damage: 76, speed: 3.75, attackType: 'melee', range: 1.14, cooldown: 0.7, color: '#b84c34', accent: '#ffd07a', trait: 'A blazing pack hunter that closes distance instantly' },
  { key: 'magma-crab', name: 'Magma Crab', icon: '🦀', model: 'beetle', health: 1050, damage: 82, speed: 1.9, attackType: 'melee', range: 1.48, cooldown: 1.35, color: '#7f3029', accent: '#ff9b45', trait: 'A plated lava crawler with crushing claws' },
  { key: 'ash-ram', name: 'Ashhorn Ram', icon: '🐏', model: 'yak', health: 1120, damage: 88, speed: 2.65, attackType: 'melee', range: 1.5, cooldown: 1.05, color: '#62595a', accent: '#ffb35b', trait: 'A relentless charger armored in cooled ash' },
  { key: 'ember-hawk', name: 'Ember Hawk', icon: '🦅', model: 'owl', health: 920, damage: 91, speed: 3.15, attackType: 'ranged', range: 8.2, cooldown: 1.05, projectileSpeed: 11, color: '#c74632', accent: '#ffd15c', trait: 'Launches quick fire feathers from across the caldera' },
  { key: 'lava-golem', name: 'Lava Golem', icon: '🌋', model: 'golem', health: 1420, damage: 98, speed: 1.45, attackType: 'melee', range: 1.62, cooldown: 1.65, color: '#493f42', accent: '#ff6b35', trait: 'A slow volcanic juggernaut with molten joints' },
  { key: 'fire-salamander', name: 'Fire Salamander', icon: '🦎', model: 'drake', health: 1220, damage: 104, speed: 2.55, attackType: 'ranged', range: 7.6, cooldown: 0.98, projectileSpeed: 11.5, color: '#a8322d', accent: '#ffdb63', trait: 'Spits rapid firebolts while circling its target' },
  { key: 'pyre-wraith', name: 'Pyre Wraith', icon: '🔥', model: 'wraith', health: 1180, damage: 112, speed: 2.85, attackType: 'ranged', range: 8.6, cooldown: 0.88, projectileSpeed: 9.5, color: '#863441', accent: '#ff8c4a', trait: 'An aggressive spirit that rains slow-burning orbs' },
  { key: 'obsidian-titan', name: 'Obsidian Titan', icon: '🗿', model: 'treant', health: 1780, damage: 124, speed: 1.3, attackType: 'melee', range: 1.82, cooldown: 1.8, color: '#302f3b', accent: '#e84b35', trait: 'The badlands’ toughest guardian with seismic strikes' },
];
const towerEnemies = [
  { key: 'clockwork-scarab', name: 'Clockwork Scarab', icon: '⚙️', model: 'clockwork-scarab', health: 520, damage: 46, speed: 2.7, attackType: 'melee', range: 1.2, cooldown: 0.9, color: '#8c7657', accent: '#67e8f9', trait: 'A skittering brass construct with an arcane core' },
  { key: 'rune-gargoyle', name: 'Rune Gargoyle', icon: '🗿', model: 'rune-gargoyle', health: 720, damage: 58, speed: 2.15, attackType: 'ranged', range: 7.3, cooldown: 1.35, projectileSpeed: 9, color: '#5e6475', accent: '#bc8cff', trait: 'A winged stone sentinel that fires rune shards' },
  { key: 'chest-mimic', name: 'Vault Mimic', icon: '🧰', model: 'chest-mimic', health: 920, damage: 68, speed: 2.95, attackType: 'melee', range: 1.38, cooldown: 0.82, color: '#785231', accent: '#ffd65c', trait: 'A treasure chest with teeth, legs, and a terrible appetite' },
  { key: 'void-hound', name: 'Void Hound', icon: '🐺', model: 'void-hound', health: 1050, damage: 78, speed: 3.65, attackType: 'melee', range: 1.2, cooldown: 0.7, color: '#302852', accent: '#f26dff', trait: 'A crystalline shadow beast that hunts at extreme speed' },
  { key: 'tower-eye', name: 'All-Seeing Orb', icon: '👁️', model: 'tower-eye', health: 1180, damage: 88, speed: 2.35, attackType: 'ranged', range: 8.8, cooldown: 0.95, projectileSpeed: 11, color: '#86456f', accent: '#70f4ff', trait: 'A floating eye that launches precise astral bolts' },
  { key: 'rune-knight', name: 'Hollow Rune Knight', icon: '♞', model: 'rune-knight', health: 1520, damage: 102, speed: 2.3, attackType: 'melee', range: 1.62, cooldown: 1.15, color: '#3e4658', accent: '#68ffd2', trait: 'An empty suit of armor wielding a luminous greatblade' },
  { key: 'astral-sphinx', name: 'Astral Sphinx', icon: '🦁', model: 'astral-sphinx', health: 1780, damage: 116, speed: 2.8, attackType: 'ranged', range: 8.2, cooldown: 0.82, projectileSpeed: 12, color: '#8065a8', accent: '#ffe272', trait: 'A winged guardian casting rapid starfire' },
  { key: 'chrono-drake', name: 'Chrono Drake', icon: '🐉', model: 'chrono-drake', health: 2250, damage: 134, speed: 2.55, attackType: 'ranged', range: 9, cooldown: 0.74, projectileSpeed: 13, color: '#315b73', accent: '#8affea', trait: 'A time-warped dragon that volleys luminous clock shards' },
];

export const TOWER = Object.freeze({ key: 'tower', name: 'The Endless Tower', short: 'Tower', description: 'A shifting arcane vault rising through 100 increasingly dangerous floors.', ground: '#273349', world: '#151b2d', fog: '#34365a', enemies: towerEnemies });
export const TOWER_BOSSES = Object.freeze({
  25: { key: 'brass-warden', name: 'Brass Warden', icon: '⚙️', model: 'brass-warden', health: 6200, damage: 92, speed: 2.05, attackType: 'melee', range: 1.85, cooldown: 1.15, color: '#82613f', accent: '#6dfff0', trait: 'A many-geared guardian with crushing hammer arms' },
  50: { key: 'mirror-sorcerer', name: 'Mirror Sorcerer', icon: '🔮', model: 'mirror-sorcerer', health: 11800, damage: 138, speed: 2.45, attackType: 'ranged', range: 9.2, cooldown: 0.74, projectileSpeed: 13, color: '#59477d', accent: '#efb5ff', trait: 'A masked tower mage who fills the floor with prism bolts' },
  75: { key: 'celestial-behemoth', name: 'Celestial Behemoth', icon: '🌠', model: 'celestial-behemoth', health: 20500, damage: 194, speed: 2.2, attackType: 'melee', range: 2.05, cooldown: 1, color: '#334d67', accent: '#ffdf76', trait: 'A star-armored titan whose fists shake the tower' },
  100: { key: 'eternity-dragon', name: 'Dragon of Eternity', icon: '♾️', model: 'eternity-dragon', health: 36000, damage: 270, speed: 2.75, attackType: 'ranged', range: 9.8, cooldown: 0.6, projectileSpeed: 14.5, color: '#30295f', accent: '#7dffe8', trait: 'The ancient keeper of the hundredth floor' },
});

export const BIOMES = Object.freeze([
  { key: 'meadow', name: 'Mossvale Meadow', short: 'Meadow', description: 'Rolling grasslands and familiar beasts.', ground: '#95b968', world: '#83ad62', fog: '#b9d8ba', enemies: meadowEnemies },
  { key: 'frost', name: 'Frostfang Tundra', short: 'Tundra', description: 'A frozen hunting ground with stronger rewards.', ground: '#b8dae0', world: '#8cb6c2', fog: '#c9e7ed', enemies: frostEnemies },
  { key: 'jungle', name: 'Sunspire Jungle', short: 'Jungle', description: 'Overgrown temple ruins guarded by venomous creatures.', ground: '#5f9e58', world: '#376f4b', fog: '#83b982', enemies: jungleEnemies },
  { key: 'ember', name: 'Embercrag Badlands', short: 'Badlands', description: 'A volcanic wasteland split by lava vents and obsidian.', ground: '#755044', world: '#3f292b', fog: '#a9664f', enemies: emberEnemies },
]);
export const ENEMIES = Object.freeze([...BIOMES.flatMap(biome => biome.enemies.map((enemy, index) => ({ ...enemy, biome: biome.key, waves: `${index * 6 + 1}+` }))), ...towerEnemies.map((enemy, index) => ({ ...enemy, biome: 'tower', waves: `${index * 12 + 1}+` }))]);
export const BOSSES = Object.freeze({ meadow: { key: 'king', name: 'Crowned Colossus', icon: '👑', model: 'king', health: 2600, damage: 48, speed: 2.05, attackType: 'melee', range: 1.75, cooldown: 1.35, color: '#7c4bc4', accent: '#ffd76a', trait: 'Huge crowned guardian with sweeping melee hits' }, frost: { key: 'wyrm', name: 'Aurora Wyrm', icon: '🌌', model: 'wyrm', health: 5200, damage: 72, speed: 2.15, attackType: 'ranged', range: 8.5, cooldown: 1.15, projectileSpeed: 8, color: '#427de8', accent: '#e1a7ff', trait: 'Final guardian that rains rapid aurora bolts' }, jungle: { key: 'sun-hydra', name: 'Sunken Temple Hydra', icon: '🐲', model: 'hydra', health: 8800, damage: 92, speed: 2.35, attackType: 'ranged', range: 8.8, cooldown: 0.95, projectileSpeed: 10.5, color: '#246f50', accent: '#ffd85e', trait: 'Three-headed temple guardian that unleashes rapid sunfire' }, ember: { key: 'caldera-wyrm', name: 'Caldera Wyrm', icon: '🌋', model: 'wyrm', health: 13800, damage: 142, speed: 2.5, attackType: 'ranged', range: 9.2, cooldown: 0.82, projectileSpeed: 12, color: '#7f252c', accent: '#ffb13b', trait: 'Ancient volcanic dragon that floods the arena with firebolts' } });
export const BOSS = BOSSES.meadow;
export const RARITIES = Object.freeze({
  common: { name: 'Common', color: '#a9c4af' }, rare: { name: 'Rare', color: '#58b9ef' },
  epic: { name: 'Epic', color: '#c477ef' }, legendary: { name: 'Legendary', color: '#ffc857' },
  mythical: { name: 'Mythical', color: '#ff72e8' }, divine: { name: 'Divine', color: '#fff08a' },
  secret: { name: 'Secret', color: '#66ffd8' }, cosmic: { name: 'Cosmic', color: '#9e8cff' },
  glitched: { name: 'Glitched', color: '#ff5f9e' },
});
export const PETS = Object.freeze([
  { key: 'squire-pup', egg: 'meadow', name: 'Squire Pup', icon: '🐕', rarity: 'common', damage: 12, color: '#b98758', accent: '#d9dde0', kind: 'beast' },
  { key: 'owl-archer', egg: 'meadow', name: 'Owl Archer', icon: '🦉', rarity: 'rare', damage: 20, color: '#9b7455', accent: '#6fbd73', kind: 'owl' },
  { key: 'moss-golem', egg: 'meadow', name: 'Moss Golem', icon: '🪨', rarity: 'epic', damage: 34, color: '#668b70', accent: '#8fd35d', kind: 'golem' },
  { key: 'crown-griffin', egg: 'meadow', name: 'Crown Griffin', icon: '🦅', rarity: 'legendary', damage: 55, color: '#c98545', accent: '#ffd86b', kind: 'griffin' },
  { key: 'moonhorn-unicorn', egg: 'meadow', name: 'Moonhorn Unicorn', icon: '🦄', rarity: 'mythical', damage: 85, color: '#f2ecff', accent: '#f27bea', kind: 'unicorn' },
  { key: 'hare-sentry', egg: 'frost', name: 'Snow Hare Sentry', icon: '🐇', rarity: 'common', damage: 28, color: '#dff6f6', accent: '#70bfe4', kind: 'hare' },
  { key: 'ice-lynx', egg: 'frost', name: 'Ice Lynx', icon: '🐈', rarity: 'rare', damage: 44, color: '#8fc9d8', accent: '#416b9a', kind: 'beast' },
  { key: 'rime-knight', egg: 'frost', name: 'Rime Knight', icon: '🧙', rarity: 'epic', damage: 68, color: '#567aa8', accent: '#a5efff', kind: 'knight' },
  { key: 'starfall-drake', egg: 'frost', name: 'Starfall Drake', icon: '🐉', rarity: 'legendary', damage: 100, color: '#7056b8', accent: '#f3b7ff', kind: 'drake' },
  { key: 'frost-phoenix', egg: 'frost', name: 'Frost Phoenix', icon: '🐦', rarity: 'mythical', damage: 145, color: '#baf6ff', accent: '#8b72ff', kind: 'phoenix' },
  { key: 'jungle-gecko', egg: 'jungle', name: 'Jungle Gecko', icon: '🦎', rarity: 'common', damage: 58, color: '#4fa761', accent: '#dbed6a', kind: 'beast' },
  { key: 'sun-macaque', egg: 'jungle', name: 'Sun Macaque', icon: '🐒', rarity: 'rare', damage: 82, color: '#a66b3e', accent: '#ffd257', kind: 'monkey' },
  { key: 'relic-scarab', egg: 'jungle', name: 'Relic Scarab', icon: '🪲', rarity: 'epic', damage: 118, color: '#267a70', accent: '#f5c84c', kind: 'scarab' },
  { key: 'temple-hydra', egg: 'jungle', name: 'Temple Hydra', icon: '🐲', rarity: 'legendary', damage: 165, color: '#2d8055', accent: '#ffd95d', kind: 'drake' },
  { key: 'verdant-basilisk', egg: 'jungle', name: 'Verdant Basilisk', icon: '🐍', rarity: 'mythical', damage: 230, color: '#236d4c', accent: '#ffdd4f', kind: 'basilisk' },
  { key: 'cinder-pup', egg: 'ember', name: 'Cinder Pup', icon: '🐕', rarity: 'common', damage: 110, color: '#8d4336', accent: '#ffb05b', kind: 'beast' },
  { key: 'magma-golem', egg: 'ember', name: 'Magma Golem', icon: '🌋', rarity: 'rare', damage: 150, color: '#443b3d', accent: '#ff6837', kind: 'golem' },
  { key: 'ember-phoenix', egg: 'ember', name: 'Ember Phoenix', icon: '🐦', rarity: 'epic', damage: 205, color: '#b93b2f', accent: '#ffd052', kind: 'phoenix' },
  { key: 'obsidian-drake', egg: 'ember', name: 'Obsidian Drake', icon: '🐉', rarity: 'legendary', damage: 275, color: '#342f40', accent: '#f05b3e', kind: 'drake' },
  { key: 'solar-manticore', egg: 'ember', name: 'Solar Manticore', icon: '🦁', rarity: 'mythical', damage: 360, color: '#a94335', accent: '#ffe06a', kind: 'griffin' },
  { key: 'eternal-stag', egg: 'endless', name: 'Eternal Stag', icon: '🦌', rarity: 'mythical', damage: 450, color: '#563b7f', accent: '#ff79dc', kind: 'beast' },
  { key: 'seraphic-lion', egg: 'endless', name: 'Seraphic Lion', icon: '🦁', rarity: 'divine', damage: 575, color: '#fff0a3', accent: '#f6b94d', kind: 'griffin' },
  { key: 'abyssal-watcher', egg: 'endless', name: 'Abyssal Watcher', icon: '👁️', rarity: 'secret', damage: 725, color: '#173f4d', accent: '#65ffd8', kind: 'golem' },
  { key: 'cosmic-wyrmling', egg: 'endless', name: 'Cosmic Wyrmling', icon: '🌌', rarity: 'cosmic', damage: 925, color: '#493d9e', accent: '#bda2ff', kind: 'drake' },
  { key: 'glitch-fox', egg: 'endless', name: 'Glitch Fox', icon: '🦊', rarity: 'glitched', damage: 1200, color: '#1f2633', accent: '#ff4e9e', kind: 'beast' },
]);
export const EGGS = Object.freeze([
  { key: 'meadow', name: 'Mossvale Egg', biome: 'meadow', cost: 500, icon: '🥚', description: 'A warm speckled egg with a loyal medieval companion inside.', odds: { common: 59, rare: 25, epic: 11, legendary: 4, mythical: 1 } },
  { key: 'frost', name: 'Frostfang Egg', biome: 'frost', cost: 1500, icon: '❄️', description: 'A difficult icy hatch containing stronger tundra companions.', odds: { common: 67, rare: 22, epic: 8, legendary: 2, mythical: 1 } },
  { key: 'jungle', name: 'Sunspire Egg', biome: 'jungle', cost: 4000, icon: '🌿', description: 'A vine-wrapped relic egg hiding a powerful jungle companion.', odds: { common: 69, rare: 20, epic: 8, legendary: 2, mythical: 1 } },
  { key: 'ember', name: 'Embercrag Egg', biome: 'ember', cost: 9000, icon: '🔥', description: 'A warm obsidian egg containing a fearless volcanic companion.', odds: { common: 69, rare: 20, epic: 8, legendary: 2, mythical: 1 } },
  { key: 'endless', name: 'Endless Egg', biome: 'tower', cost: 1000000, icon: '♾️', description: 'A reality-bending prize for dedicated adventurers, filled only with endgame companions.', odds: { mythical: 50, divine: 27, secret: 14, cosmic: 7, glitched: 2 } },
]);
export function petDefinition(key) { return PETS.find(pet => pet.key === key) || null; }
export function eggDefinition(key) { return EGGS.find(egg => egg.key === key) || null; }
export function coinRewardForWave(wave, biome = 'meadow') { if (biome === 'tower') return 900 + wave * 165; if (biome === 'ember') return 650 + wave * 120; if (biome === 'jungle') return 300 + wave * 70; return biome === 'frost' ? 120 + wave * 35 : 40 + wave * 12; }
export function itemSellValue(item) { const definition = itemDefinition(item.key, item.level || 1); if (!definition) return 0; const base = definition.category === 'tools' ? 18 + definition.damage * 2 : 14 + definition.defense * 5 + definition.health * 2; return Math.max(10, Math.round(base * (1 + ((item.level || 1) - 1) * 0.35))); }
export function petSellValue(pet) { const definition = petDefinition(pet.key); if (!definition) return 0; const rarityValue = { common: 100, rare: 260, epic: 650, legendary: 1500, mythical: 3500, divine: 9000, secret: 18000, cosmic: 35000, glitched: 75000 }; return rarityValue[definition.rarity] + definition.damage * 5; }
export const SETS = Object.freeze([
  { key: 'stone', name: 'Stone', color: '#93a29d', biome: 'meadow', unlock: 1, power: 1 }, { key: 'iron', name: 'Iron', color: '#9ebad1', biome: 'meadow', unlock: 10, power: 1.35 }, { key: 'jade', name: 'Jade', color: '#38d193', biome: 'meadow', unlock: 20, power: 1.75 }, { key: 'diamond', name: 'Diamond', color: '#55ddff', biome: 'meadow', unlock: 35, power: 2.25 }, { key: 'warborn', name: 'Warborn', color: '#d26aff', biome: 'meadow', unlock: 45, power: 3 },
  { key: 'frostbite', name: 'Frostbite', color: '#8ee8ff', biome: 'frost', unlock: 1, power: 3.4 }, { key: 'glacier', name: 'Glacier', color: '#66a9e8', biome: 'frost', unlock: 10, power: 3.9 }, { key: 'aurora', name: 'Aurora', color: '#b686f4', biome: 'frost', unlock: 20, power: 4.5 }, { key: 'mammoth', name: 'Mammoth', color: '#d9c7aa', biome: 'frost', unlock: 30, power: 5.2 }, { key: 'rime', name: 'Rimeforged', color: '#79f1df', biome: 'frost', unlock: 40, power: 6 }, { key: 'starfall', name: 'Starfall', color: '#f1b2ff', biome: 'frost', unlock: 48, power: 7 },
  { key: 'vineguard', name: 'Vineguard', color: '#6fbd58', biome: 'jungle', unlock: 1, power: 7.6 }, { key: 'sunstone', name: 'Sunstone', color: '#e6b84d', biome: 'jungle', unlock: 10, power: 8.4 }, { key: 'venom', name: 'Venom', color: '#42d987', biome: 'jungle', unlock: 20, power: 9.3 }, { key: 'relic', name: 'Relic', color: '#59b3a7', biome: 'jungle', unlock: 30, power: 10.3 }, { key: 'temple', name: 'Temple', color: '#d88e45', biome: 'jungle', unlock: 40, power: 11.5 }, { key: 'sunspire', name: 'Sunspire', color: '#ffe16b', biome: 'jungle', unlock: 48, power: 13 },
  { key: 'cinder', name: 'Cinder', color: '#d76745', biome: 'ember', unlock: 1, power: 14.2 }, { key: 'basalt', name: 'Basalt', color: '#665f68', biome: 'ember', unlock: 10, power: 15.7 }, { key: 'magma', name: 'Magma', color: '#ff7040', biome: 'ember', unlock: 20, power: 17.4 }, { key: 'inferno', name: 'Inferno', color: '#f13f36', biome: 'ember', unlock: 30, power: 19.3 }, { key: 'obsidian', name: 'Obsidian', color: '#514767', biome: 'ember', unlock: 40, power: 21.5 }, { key: 'caldera', name: 'Caldera', color: '#ffc04f', biome: 'ember', unlock: 48, power: 24 },
  { key: 'runebound', name: 'Runebound', color: '#64f2dc', biome: 'tower', unlock: 20, power: 11 }, { key: 'voidglass', name: 'Voidglass', color: '#b06cff', biome: 'tower', unlock: 45, power: 20 }, { key: 'celestial', name: 'Celestial', color: '#ffe27a', biome: 'tower', unlock: 70, power: 29 }, { key: 'eternity', name: 'Eternity', color: '#ff70da', biome: 'tower', unlock: 90, power: 38 },
]);
export function towerLootBand(wave) {
  const floor = Math.max(1, Math.min(100, wave));
  const anchors = [[1, 1], [25, 7.6], [50, 14.2], [75, 24], [100, 37]];
  let lower = anchors[0]; let upper = anchors[1];
  for (let index = 1; index < anchors.length; index++) if (floor >= anchors[index][0]) { lower = anchors[index]; upper = anchors[Math.min(index + 1, anchors.length - 1)]; }
  const span = Math.max(1, upper[0] - lower[0]);
  const minimumPower = lower[1] + (upper[1] - lower[1]) * ((floor - lower[0]) / span);
  const maximumPower = minimumPower + 7.5;
  const unlocked = SETS.filter(set => set.biome !== 'tower' || set.unlock <= floor).sort((a, b) => a.power - b.power);
  let sets = unlocked.filter(set => set.power >= minimumPower - 1e-6 && set.power <= maximumPower + 1e-6);
  if (!sets.length) sets = [unlocked.reduce((best, set) => Math.abs(set.power - minimumPower) < Math.abs(best.power - minimumPower) ? set : best)];
  return { minimumPower, maximumPower, sets };
}
export const ITEM_TYPES = Object.freeze([
  { key: 'sword', name: 'Sword', category: 'tools', slot: 'weapon', icon: '⚔️', damage: 8 }, { key: 'mace', name: 'Mace', category: 'tools', slot: 'weapon', icon: '🎖️', damage: 10 }, { key: 'spear', name: 'Spear', category: 'tools', slot: 'weapon', icon: '🔱', damage: 9 }, { key: 'axe', name: 'Axe', category: 'tools', slot: 'weapon', icon: '🪓', damage: 11 }, { key: 'warhammer', name: 'War hammer', category: 'tools', slot: 'weapon', icon: '🔨', damage: 13 },
  { key: 'helmet', name: 'Helmet', category: 'armor', slot: 'helmet', icon: '⛑️', defense: 2, health: 4 }, { key: 'chestplate', name: 'Chestplate', category: 'armor', slot: 'chestplate', icon: '🛡️', defense: 4, health: 10 }, { key: 'leggings', name: 'Leggings', category: 'armor', slot: 'leggings', icon: '🩳', defense: 3, health: 7 }, { key: 'boots', name: 'Boots', category: 'armor', slot: 'boots', icon: '🥾', defense: 2, health: 5 },
]);
export const OBSTACLES = MAPS.meadow.obstacles;
export const SPAWNS = MAPS.meadow.spawns;
export function biomeDefinition(key) { return key === 'tower' ? TOWER : BIOMES.find(biome => biome.key === key) || BIOMES[0]; }
export function maxWaveForBiome(key) { return key === 'tower' ? 100 : BALANCE.maxWave; }
export function isBossWave(wave, biomeKey = 'meadow') { return biomeKey === 'tower' ? Boolean(TOWER_BOSSES[wave]) : wave === BALANCE.maxWave; }
export function enemyForWave(wave, biomeKey = 'meadow', index = 0) { const biome = biomeDefinition(biomeKey); if (biomeKey === 'tower' && TOWER_BOSSES[wave]) return { ...TOWER_BOSSES[wave], boss: true }; if (wave === BALANCE.maxWave && biomeKey !== 'tower') return { ...BOSSES[biome.key], boss: true }; const divisor = biomeKey === 'tower' ? 12 : Math.max(1, Math.floor(49 / biome.enemies.length)); const tier = Math.min(biome.enemies.length - 1, Math.floor((wave - 1) / divisor)); const base = biome.enemies[(tier + index) % Math.min(biome.enemies.length, tier + 2)]; const healthGrowth = biomeKey === 'tower' ? 0.04 : 0.055; const damageGrowth = biomeKey === 'tower' ? 0.026 : 0.032; const scale = 1 + (wave - 1) * healthGrowth; return { ...base, health: Math.round(base.health * scale), damage: Math.round(base.damage * (1 + (wave - 1) * damageGrowth)), boss: false }; }
export function enemyCountForWave(wave, biomeKey = 'meadow') { return isBossWave(wave, biomeKey) ? 1 : Math.min(8, 1 + Math.floor((wave - 1) / (biomeKey === 'tower' ? 10 : 7))); }
export function itemDefinition(key, level = 1) { const [setKey, typeKey] = key.split(':'); const set = SETS.find(entry => entry.key === setKey); const type = ITEM_TYPES.find(entry => entry.key === typeKey); if (!set || !type) return null; const upgrade = 1 + Math.max(0, level - 1) * 0.3; return { key, set: set.key, type: type.key, name: `${set.name} ${type.name}`, category: type.category, slot: type.slot, icon: type.icon, color: set.color, level, damage: Math.round((type.damage || 0) * set.power * upgrade), defense: Math.round((type.defense || 0) * set.power * upgrade), health: Math.round((type.health || 0) * set.power * upgrade) }; }
