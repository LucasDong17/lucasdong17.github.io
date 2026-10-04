import { BALANCE as B, ITEM_TYPES, SETS, coinRewardForWave, isBossWave, maxWaveForBiome, petDefinition, towerLootBand } from '../data/balance.js';
import { createWaveEnemies, enterHub } from '../state/run.js';

export function attackStage(attack) { if (!attack) return 'ready'; if (attack.elapsed < B.player.windup) return 'windup'; if (attack.elapsed < B.player.windup + B.player.active) return 'active'; return 'recovery'; }
export const attackDuration = B.player.windup + B.player.active + B.player.recovery;
export function canHit(player, enemy, facing = player.facing) { if (!enemy || enemy.health <= 0) return false; const dx = enemy.x - player.x; const dz = enemy.z - player.z; const distance = Math.hypot(dx, dz); return distance <= B.player.range && (distance < 1e-8 || (Math.sin(facing) * dx + Math.cos(facing) * dz) / distance >= Math.cos(B.player.arc / 2)); }

function randomFor(wave, salt, biome = 'meadow') { const biomeSalt = biome === 'frost' ? 7919 : biome === 'jungle' ? 15401 : biome === 'ember' ? 23173 : 0; let value = (wave * 2654435761 + salt * 1013904223 + biomeSalt) >>> 0; value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; }

function createDrops(run, enemy, bus) {
  const defeated = run.enemies.filter(entry => entry.health <= 0).length;
  const chance = Math.min(0.98, 0.78 + run.wave * 0.004);
  const count = enemy.boss ? 4 : (randomFor(run.wave, defeated * 13, run.biome) < chance ? 1 : 0);
  const towerBand = run.biome === 'tower' ? towerLootBand(run.wave) : null;
  const available = towerBand ? towerBand.sets : SETS.filter(set => set.biome === run.biome && set.unlock <= run.wave);
  for (let index = 0; index < count; index++) {
    const duplicatePool = towerBand ? run.inventory.filter(item => {
      const [setKey, typeKey] = item.key.split(':'); const set = available.find(entry => entry.key === setKey); const type = ITEM_TYPES.find(entry => entry.key === typeKey);
      return set && type && (set.biome !== 'tower' || type.category === 'armor');
    }) : run.inventory;
    const duplicate = duplicatePool.length && randomFor(run.wave, defeated * 31 + index + 2, run.biome) < 0.45;
    let key;
    if (duplicate) key = duplicatePool[Math.floor(randomFor(run.wave, defeated * 41 + index, run.biome) * duplicatePool.length)].key;
    else {
      const roll = randomFor(run.wave, defeated * 47 + index + 4, run.biome);
      const weighted = run.biome === 'tower' ? roll : Math.pow(roll, 0.62);
      const set = available[Math.min(available.length - 1, Math.floor(weighted * available.length))];
      const itemPool = run.biome === 'tower' && set.biome === 'tower' ? ITEM_TYPES.filter(type => type.category === 'armor') : ITEM_TYPES;
      const type = itemPool[Math.floor(randomFor(run.wave, defeated * 59 + index + 20, run.biome) * itemPool.length)];
      key = `${set.key}:${type.key}`;
    }
    const drop = { id: run.nextItemId++, key, level: 1, x: enemy.x + (index % 2) * 0.55, z: enemy.z + Math.floor(index / 2) * 0.55, spin: randomFor(run.wave, defeated * 67 + index + 40, run.biome) * Math.PI * 2 };
    const setKey = key.split(':')[0];
    if (run.autoCollectSets.has(setKey)) {
      run.inventory.push({ id: drop.id, key: drop.key, level: drop.level, new: true });
      bus.emit('pickupCollected', { itemId: drop.id, key: drop.key, automatic: true });
    } else run.drops.push(drop);
  }
}

function damagePlayer(run, enemy, bus, world) {
  const dealt = Math.max(1, enemy.damage - run.player.defense);
  run.player.health = Math.max(0, run.player.health - dealt); run.player.flash = B.hitFlash;
  bus.emit('damageTaken', { target: 'player', amount: dealt, x: run.player.x, z: run.player.z });
  if (run.player.health > 0) return;
  bus.emit('playerDied', { biome: run.biome, wave: run.wave });
  enterHub(run, world);
}

function damageEnemy(run, enemy, amount, bus) {
  enemy.health = Math.max(0, enemy.health - amount); enemy.flash = B.hitFlash;
  bus.emit('damageTaken', { target: 'enemy', amount, x: enemy.x, z: enemy.z, id: enemy.id });
  if (enemy.health > 0) return;
  enemy.mode = 'defeated'; run.discovered.add(enemy.type); createDrops(run, enemy, bus); bus.emit('enemyDefeated', { wave: run.wave, enemy: enemy.name, type: enemy.type, drops: run.drops.length });
  if (run.enemies.some(entry => entry.health > 0)) return;
  const coins = coinRewardForWave(run.wave, run.biome); run.coins += coins; bus.emit('coinsEarned', { amount: coins, total: run.coins, biome: run.biome, wave: run.wave });
  run.phase = 'intermission'; run.intermission = B.intermission;
  if (run.wave < maxWaveForBiome(run.biome)) run.progress.unlocked[run.biome] = Math.max(run.progress.unlocked[run.biome] || 1, run.wave + 1);
  else {
    run.progress.completed[run.biome] = true;
    const nextBiome = { meadow: 'frost', frost: 'jungle', jungle: 'ember' }[run.biome];
    if (nextBiome) run.progress.unlocked[nextBiome] = Math.max(1, run.progress.unlocked[nextBiome] || 0);
  }
  bus.emit('waveCleared', { biome: run.biome, wave: run.wave });
}

function updatePickup(run, input, bus, dt) {
  const nearest = run.drops.reduce((best, drop) => { const distance = Math.hypot(drop.x - run.player.x, drop.z - run.player.z); return distance <= B.pickup.radius && (!best || distance < best.distance) ? { drop, distance } : best; }, null);
  if (!nearest || !input.pickup) { run.pickup.id = nearest?.drop.id ?? null; run.pickup.progress = 0; return; }
  if (run.pickup.id !== nearest.drop.id) { run.pickup.id = nearest.drop.id; run.pickup.progress = 0; }
  run.pickup.progress += dt;
  if (run.pickup.progress < B.pickup.hold) return;
  run.inventory.push({ id: nearest.drop.id, key: nearest.drop.key, level: nearest.drop.level || 1, new: true }); run.drops = run.drops.filter(drop => drop.id !== nearest.drop.id); run.pickup = { id: null, progress: 0 };
  bus.emit('pickupCollected', { itemId: nearest.drop.id, key: nearest.drop.key });
}

function updateHub(run, world, bus, input, dt) {
  const p = run.player; let mx = input.moveX || 0; let mz = input.moveZ || 0; const length = Math.hypot(mx, mz); if (length > 1) { mx /= length; mz /= length; }
  p.moving = length > 0; if (length > 0) { p.facing = Math.atan2(mx, mz); world.move(p, mx * B.player.speed * dt, mz * B.player.speed * dt); }
  const play = Math.hypot(p.x - B.portal.playX, p.z - B.portal.playZ) <= B.portal.radius;
  const upgrade = Math.hypot(p.x - B.portal.upgradeX, p.z - B.portal.upgradeZ) <= B.portal.radius;
  const pets = Math.hypot(p.x - B.portal.petsX, p.z - B.portal.petsZ) <= B.portal.radius;
  const sellPets = Math.hypot(p.x - B.portal.sellPetsX, p.z - B.portal.sellPetsZ) <= B.portal.radius;
  const sellArmor = Math.hypot(p.x - B.portal.sellArmorX, p.z - B.portal.sellArmorZ) <= B.portal.radius;
  const sellWeapons = Math.hypot(p.x - B.portal.sellWeaponsX, p.z - B.portal.sellWeaponsZ) <= B.portal.radius;
  const tower = Math.hypot(p.x - B.portal.towerX, p.z - B.portal.towerZ) <= B.portal.radius;
  if (!play && !upgrade && !pets && !sellPets && !sellArmor && !sellWeapons && !tower) run.portalLatch = false;
  if (!run.portalLatch && (play || upgrade || pets || sellPets || sellArmor || sellWeapons || tower)) {
    run.portalLatch = true;
    const portal = play ? 'play' : upgrade ? 'upgrade' : pets ? 'pet-shop' : sellPets ? 'sell-pets' : sellArmor ? 'sell-armor' : sellWeapons ? 'sell-tools' : 'tower';
    bus.emit('portalEntered', { portal });
  }
}

function updatePets(run, world, bus, dt) {
  const equipped = run.equippedPetIds.map(id => run.pets.find(pet => pet.id === id)).filter(Boolean);
  for (const [index, pet] of equipped.entries()) {
    const definition = petDefinition(pet.key); if (!definition) continue;
    pet.cooldown = Math.max(0, pet.cooldown - dt); pet.attack = Math.max(0, pet.attack - dt); pet.flash = Math.max(0, pet.flash - dt);
    const living = run.status === 'playing' && run.phase === 'combat' ? run.enemies.filter(enemy => enemy.health > 0) : [];
    const target = living.reduce((best, enemy) => !best || Math.hypot(enemy.x - pet.x, enemy.z - pet.z) < Math.hypot(best.x - pet.x, best.z - pet.z) ? enemy : best, null);
    let goalX; let goalZ; let stop = 0.18;
    if (target) { goalX = target.x; goalZ = target.z; stop = 1.05; }
    else { const side = index - (equipped.length - 1) / 2; goalX = run.player.x + Math.cos(run.player.facing) * side * 0.72 - Math.sin(run.player.facing) * 1.15; goalZ = run.player.z - Math.sin(run.player.facing) * side * 0.72 - Math.cos(run.player.facing) * 1.15; }
    const dx = goalX - pet.x; const dz = goalZ - pet.z; const distance = Math.hypot(dx, dz);
    if (distance > stop) { pet.facing = Math.atan2(dx, dz); const speed = Math.min((target ? 5.6 : 5.1) * dt, distance - stop); world.move(pet, dx / distance * speed, dz / distance * speed); }
    if (target && distance <= stop + 0.12 && pet.cooldown <= 0) { pet.cooldown = 1; pet.attack = 0.22; target.flash = B.hitFlash; damageEnemy(run, target, definition.damage, bus); bus.emit('petAttacked', { petId: pet.id, targetId: target.id, amount: definition.damage }); }
  }
}

function updateEnemy(run, enemy, world, bus, dt) {
  if (enemy.health <= 0 || run.status !== 'playing') return;
  const p = run.player; enemy.flash = Math.max(0, enemy.flash - dt); enemy.cooldown = Math.max(0, enemy.cooldown - dt);
  const dx = p.x - enemy.x; const dz = p.z - enemy.z; const distance = Math.hypot(dx, dz);
  if (enemy.mode === 'idle' && distance < B.enemy.detection) enemy.mode = 'chase';
  if (enemy.mode === 'windup') { enemy.timer -= dt; if (enemy.timer <= 0) {
    if (enemy.attackType === 'ranged' && distance <= enemy.range + 0.5) {
      const length = Math.max(distance, 0.001);
      run.projectiles.push({ id: run.nextProjectileId++, x: enemy.x, z: enemy.z, dx: dx / length, dz: dz / length, speed: enemy.projectileSpeed, damage: enemy.damage, color: enemy.accent, radius: 0.22, life: 2.2 });
      bus.emit('projectileFired', { id: enemy.id, type: enemy.type });
    } else if (enemy.attackType !== 'ranged' && distance <= enemy.range) damagePlayer(run, enemy, bus, world);
    enemy.cooldown = enemy.attackCooldown; enemy.mode = 'chase';
  } return; }
  if (enemy.mode !== 'chase') return;
  enemy.facing = Math.atan2(dx, dz);
  const attackRange = enemy.range || B.enemy.reach;
  if (distance <= attackRange) {
    if (enemy.attackType === 'ranged' && distance < 2.5) {
      const speed = Math.min(enemy.speed * 0.7 * dt, 2.5 - distance); if (distance > 0) world.move(enemy, -dx / distance * speed, -dz / distance * speed);
    }
    if (enemy.cooldown <= 0) { enemy.mode = 'windup'; enemy.timer = enemy.attackType === 'ranged' ? B.enemy.windup * 0.8 : B.enemy.windup; bus.emit('attackStarted', { target: 'enemy', id: enemy.id }); }
  } else { const speed = Math.min(enemy.speed * dt, distance - attackRange * 0.85); if (distance > 0) world.move(enemy, dx / distance * speed, dz / distance * speed); }
}

function updateProjectiles(run, world, bus, dt) {
  for (const projectile of run.projectiles) {
    projectile.x += projectile.dx * projectile.speed * dt; projectile.z += projectile.dz * projectile.speed * dt; projectile.life -= dt;
    if (!world.valid(projectile.x, projectile.z, projectile.radius)) projectile.life = 0;
    if (projectile.life > 0 && Math.hypot(run.player.x - projectile.x, run.player.z - projectile.z) <= run.player.radius + projectile.radius) {
      damagePlayer(run, { damage: projectile.damage }, bus, world); projectile.life = 0;
      if (run.status === 'hub') { run.projectiles = []; return; }
    }
  }
  run.projectiles = run.projectiles.filter(projectile => projectile.life > 0);
}

export function stepRun(run, input, world, bus, dt = B.step) {
  run.time += dt; run.player.flash = Math.max(0, run.player.flash - dt);
  if (run.status === 'hub') { updateHub(run, world, bus, input, dt); updatePets(run, world, bus, dt); return; }
  if (run.status !== 'playing') return;
  const p = run.player; let mx = input.moveX || 0; let mz = input.moveZ || 0; const length = Math.hypot(mx, mz); if (length > 1) { mx /= length; mz /= length; }
  p.moving = length > 0; if (length > 0) { if (!p.attack) p.facing = Math.atan2(mx, mz); world.move(p, mx * B.player.speed * dt, mz * B.player.speed * dt); }
  updatePickup(run, input, bus, dt);
  updatePets(run, world, bus, dt);
  updateProjectiles(run, world, bus, dt);
  if (run.status !== 'playing') return;
  if (input.attack && !p.attack && run.phase === 'combat') { p.attack = { elapsed: 0, hitIds: [], facing: p.facing }; bus.emit('attackStarted', { target: 'player' }); }
  if (p.attack) { p.attack.elapsed += dt; if (attackStage(p.attack) === 'active') for (const enemy of run.enemies) if (!p.attack.hitIds.includes(enemy.id) && canHit(p, enemy, p.attack.facing)) { p.attack.hitIds.push(enemy.id); damageEnemy(run, enemy, p.damage, bus); } if (p.attack.elapsed >= attackDuration) p.attack = null; }
  if (run.phase === 'intermission') { run.intermission -= dt; if (run.intermission <= 0) { if (run.wave >= maxWaveForBiome(run.biome)) { bus.emit('biomeCompleted', { biome: run.biome }); enterHub(run, world); return; } run.drops = []; run.projectiles = []; run.wave++; run.progress.highest[run.biome] = Math.max(run.progress.highest[run.biome] || 0, run.wave); run.spawnIndex += run.enemies.length; run.enemies = createWaveEnemies(run.wave, run.biome, world, p, run.spawnIndex); run.phase = 'combat'; run.intermission = 0; bus.emit('waveStarted', { wave: run.wave, enemy: run.enemies[0].name, count: run.enemies.length, boss: isBossWave(run.wave, run.biome) }); } return; }
  for (const enemy of run.enemies) updateEnemy(run, enemy, world, bus, dt);
}
