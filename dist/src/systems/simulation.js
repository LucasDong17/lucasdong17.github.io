import { BALANCE as B, ITEM_TYPES, SETS } from '../data/balance.js';
import { createWaveEnemies, enterHub } from '../state/run.js';

export function attackStage(attack) { if (!attack) return 'ready'; if (attack.elapsed < B.player.windup) return 'windup'; if (attack.elapsed < B.player.windup + B.player.active) return 'active'; return 'recovery'; }
export const attackDuration = B.player.windup + B.player.active + B.player.recovery;
export function canHit(player, enemy, facing = player.facing) { if (!enemy || enemy.health <= 0) return false; const dx = enemy.x - player.x; const dz = enemy.z - player.z; const distance = Math.hypot(dx, dz); return distance <= B.player.range && (distance < 1e-8 || (Math.sin(facing) * dx + Math.cos(facing) * dz) / distance >= Math.cos(B.player.arc / 2)); }

function randomFor(wave, salt, biome = 'meadow') { let value = (wave * 2654435761 + salt * 1013904223 + (biome === 'frost' ? 7919 : 0)) >>> 0; value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; }

function createDrops(run, enemy) {
  const defeated = run.enemies.filter(entry => entry.health <= 0).length;
  const chance = Math.min(0.98, 0.78 + run.wave * 0.004);
  const count = enemy.boss ? 4 : (randomFor(run.wave, defeated * 13, run.biome) < chance ? 1 : 0);
  const available = SETS.filter(set => set.biome === run.biome && set.unlock <= run.wave);
  for (let index = 0; index < count; index++) {
    const duplicate = run.inventory.length && randomFor(run.wave, defeated * 31 + index + 2, run.biome) < 0.45;
    let key;
    if (duplicate) key = run.inventory[Math.floor(randomFor(run.wave, defeated * 41 + index, run.biome) * run.inventory.length)].key;
    else {
      const weighted = Math.pow(randomFor(run.wave, defeated * 47 + index + 4, run.biome), 0.62);
      const set = available[Math.min(available.length - 1, Math.floor(weighted * available.length))];
      const type = ITEM_TYPES[Math.floor(randomFor(run.wave, defeated * 59 + index + 20, run.biome) * ITEM_TYPES.length)];
      key = `${set.key}:${type.key}`;
    }
    run.drops.push({ id: run.nextItemId++, key, level: 1, x: enemy.x + (index % 2) * 0.55, z: enemy.z + Math.floor(index / 2) * 0.55, spin: randomFor(run.wave, defeated * 67 + index + 40, run.biome) * Math.PI * 2 });
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
  enemy.mode = 'defeated'; createDrops(run, enemy); bus.emit('enemyDefeated', { wave: run.wave, enemy: enemy.name, drops: run.drops.length });
  if (run.enemies.some(entry => entry.health > 0)) return;
  run.phase = 'intermission'; run.intermission = B.intermission;
  if (run.wave < B.maxWave) run.progress.unlocked[run.biome] = Math.max(run.progress.unlocked[run.biome] || 1, run.wave + 1);
  else { run.progress.completed[run.biome] = true; if (run.biome === 'meadow') run.progress.unlocked.frost = Math.max(1, run.progress.unlocked.frost || 0); }
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
  if (!play && !upgrade) run.portalLatch = false;
  if (!run.portalLatch && (play || upgrade)) { run.portalLatch = true; bus.emit('portalEntered', { portal: play ? 'play' : 'upgrade' }); }
}

function updateEnemy(run, enemy, world, bus, dt) {
  if (enemy.health <= 0 || run.status !== 'playing') return;
  const p = run.player; enemy.flash = Math.max(0, enemy.flash - dt); enemy.cooldown = Math.max(0, enemy.cooldown - dt);
  const dx = p.x - enemy.x; const dz = p.z - enemy.z; const distance = Math.hypot(dx, dz);
  if (enemy.mode === 'idle' && distance < B.enemy.detection) enemy.mode = 'chase';
  if (enemy.mode === 'windup') { enemy.timer -= dt; if (enemy.timer <= 0) { if (distance <= B.enemy.reach) damagePlayer(run, enemy, bus, world); enemy.cooldown = B.enemy.cooldown; enemy.mode = 'chase'; } return; }
  if (enemy.mode !== 'chase') return;
  enemy.facing = Math.atan2(dx, dz);
  if (distance <= B.enemy.reach) { if (enemy.cooldown <= 0) { enemy.mode = 'windup'; enemy.timer = B.enemy.windup; bus.emit('attackStarted', { target: 'enemy', id: enemy.id }); } }
  else { const speed = Math.min(enemy.speed * dt, distance - B.enemy.reach * 0.85); if (distance > 0) world.move(enemy, dx / distance * speed, dz / distance * speed); }
}

export function stepRun(run, input, world, bus, dt = B.step) {
  run.time += dt; run.player.flash = Math.max(0, run.player.flash - dt);
  if (run.status === 'hub') { updateHub(run, world, bus, input, dt); return; }
  if (run.status !== 'playing') return;
  const p = run.player; let mx = input.moveX || 0; let mz = input.moveZ || 0; const length = Math.hypot(mx, mz); if (length > 1) { mx /= length; mz /= length; }
  p.moving = length > 0; if (length > 0) { if (!p.attack) p.facing = Math.atan2(mx, mz); world.move(p, mx * B.player.speed * dt, mz * B.player.speed * dt); }
  updatePickup(run, input, bus, dt);
  if (input.attack && !p.attack && run.phase === 'combat') { p.attack = { elapsed: 0, hitIds: [], facing: p.facing }; bus.emit('attackStarted', { target: 'player' }); }
  if (p.attack) { p.attack.elapsed += dt; if (attackStage(p.attack) === 'active') for (const enemy of run.enemies) if (!p.attack.hitIds.includes(enemy.id) && canHit(p, enemy, p.attack.facing)) { p.attack.hitIds.push(enemy.id); damageEnemy(run, enemy, p.damage, bus); } if (p.attack.elapsed >= attackDuration) p.attack = null; }
  if (run.phase === 'intermission') { run.intermission -= dt; if (run.intermission <= 0) { if (run.wave >= B.maxWave) { bus.emit('biomeCompleted', { biome: run.biome }); enterHub(run, world); return; } run.drops = []; run.wave++; run.progress.highest[run.biome] = Math.max(run.progress.highest[run.biome] || 0, run.wave); run.spawnIndex += run.enemies.length; run.enemies = createWaveEnemies(run.wave, run.biome, world, p, run.spawnIndex); run.enemies.forEach(enemy => run.discovered.add(enemy.type)); run.phase = 'combat'; run.intermission = 0; bus.emit('waveStarted', { wave: run.wave, enemy: run.enemies[0].name, count: run.enemies.length, boss: run.wave === B.maxWave }); } return; }
  for (const enemy of run.enemies) updateEnemy(run, enemy, world, bus, dt);
}
