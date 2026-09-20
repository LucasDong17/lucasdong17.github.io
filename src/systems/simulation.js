import { BALANCE as B, ITEM_TYPES, SETS } from '../data/balance.js';
import { createEnemy } from '../state/run.js';

export function attackStage(attack) {
  if (!attack) return 'ready';
  if (attack.elapsed < B.player.windup) return 'windup';
  if (attack.elapsed < B.player.windup + B.player.active) return 'active';
  return 'recovery';
}
export const attackDuration = B.player.windup + B.player.active + B.player.recovery;

export function canHit(player, enemy, facing = player.facing) {
  if (enemy.health <= 0) return false;
  const dx = enemy.x - player.x;
  const dz = enemy.z - player.z;
  const distance = Math.hypot(dx, dz);
  return distance <= B.player.range && (distance < 1e-8 || (Math.sin(facing) * dx + Math.cos(facing) * dz) / distance >= Math.cos(B.player.arc / 2));
}

function randomFor(wave, salt) {
  let value = (wave * 2654435761 + salt * 1013904223) >>> 0;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  return (value >>> 0) / 4294967296;
}

function createDrops(run, enemy) {
  const chance = Math.min(0.92, 0.42 + run.wave * 0.035);
  const count = enemy.boss ? 2 : (randomFor(run.wave, 1) < chance ? 1 : 0);
  const available = SETS.filter(set => set.unlock <= run.wave);
  for (let index = 0; index < count; index++) {
    const weighted = Math.pow(randomFor(run.wave, index + 2), 0.7);
    const set = available[Math.min(available.length - 1, Math.floor(weighted * available.length))];
    const type = ITEM_TYPES[Math.floor(randomFor(run.wave, index + 20) * ITEM_TYPES.length)];
    run.drops.push({ id: run.nextItemId++, key: `${set.key}:${type.key}`, x: enemy.x + (index ? 0.65 : 0), z: enemy.z + (index ? 0.15 : 0), spin: randomFor(run.wave, index + 40) * Math.PI * 2 });
  }
}

function damage(run, target, amount, bus) {
  const actor = run[target];
  const dealt = target === 'player' ? Math.max(1, amount - actor.defense) : amount;
  actor.health = Math.max(0, actor.health - dealt);
  actor.flash = B.hitFlash;
  bus.emit('damageTaken', { target, amount: dealt, x: actor.x, z: actor.z });
  if (actor.health !== 0) return;
  if (target === 'player') {
    run.status = 'defeated'; actor.attack = null; actor.moving = false; bus.emit('playerDied', {});
  } else {
    actor.mode = 'defeated'; run.phase = 'intermission'; run.intermission = B.intermission; createDrops(run, actor);
    bus.emit('enemyDefeated', { wave: run.wave, drops: run.drops.length });
  }
}

function updatePickup(run, input, bus, dt) {
  const nearest = run.drops.reduce((best, drop) => {
    const distance = Math.hypot(drop.x - run.player.x, drop.z - run.player.z);
    return distance <= B.pickup.radius && (!best || distance < best.distance) ? { drop, distance } : best;
  }, null);
  if (!nearest || !input.pickup) {
    run.pickup.id = nearest?.drop.id ?? null; run.pickup.progress = 0; return;
  }
  if (run.pickup.id !== nearest.drop.id) { run.pickup.id = nearest.drop.id; run.pickup.progress = 0; }
  run.pickup.progress += dt;
  if (run.pickup.progress < B.pickup.hold) return;
  run.inventory.push({ id: nearest.drop.id, key: nearest.drop.key, new: true });
  run.drops = run.drops.filter(drop => drop.id !== nearest.drop.id);
  run.pickup = { id: null, progress: 0 };
  bus.emit('pickupCollected', { itemId: nearest.drop.id, key: nearest.drop.key });
}

export function stepRun(run, input, world, bus, dt = B.step) {
  if (run.status !== 'playing') return;
  run.time += dt;
  const p = run.player;
  let e = run.enemy;
  p.flash = Math.max(0, p.flash - dt); e.flash = Math.max(0, e.flash - dt);
  let mx = input.moveX || 0; let mz = input.moveZ || 0;
  const length = Math.hypot(mx, mz);
  if (length > 1) { mx /= length; mz /= length; }
  p.moving = length > 0;
  if (length > 0) {
    if (!p.attack) p.facing = Math.atan2(mx, mz);
    world.move(p, mx * B.player.speed * dt, mz * B.player.speed * dt);
  }
  updatePickup(run, input, bus, dt);
  if (input.attack && !p.attack && run.phase === 'combat') {
    p.attack = { elapsed: 0, hit: false, facing: p.facing }; bus.emit('attackStarted', { target: 'player' });
  }
  if (p.attack) {
    p.attack.elapsed += dt;
    if (attackStage(p.attack) === 'active' && !p.attack.hit && canHit(p, e, p.attack.facing)) { p.attack.hit = true; damage(run, 'enemy', p.damage, bus); }
    if (p.attack.elapsed >= attackDuration) p.attack = null;
  }
  if (run.phase === 'intermission') {
    run.intermission -= dt;
    if (run.intermission <= 0) {
      run.drops = []; run.wave++; run.spawnIndex++; run.enemy = createEnemy(world.spawn(p, run.spawnIndex), run.wave);
      run.discovered.add(run.enemy.type); run.phase = 'combat'; run.intermission = 0;
      bus.emit('waveStarted', { wave: run.wave, enemy: run.enemy.name, boss: run.enemy.boss });
    }
    return;
  }
  e.cooldown = Math.max(0, e.cooldown - dt);
  const dx = p.x - e.x; const dz = p.z - e.z; const distance = Math.hypot(dx, dz);
  if (e.mode === 'idle' && distance < B.enemy.detection) e.mode = 'chase';
  if (e.mode === 'windup') {
    e.timer -= dt;
    if (e.timer <= 0) { if (distance <= B.enemy.reach) damage(run, 'player', e.damage, bus); e.cooldown = B.enemy.cooldown; e.mode = 'chase'; }
    return;
  }
  if (e.mode === 'chase') {
    e.facing = Math.atan2(dx, dz);
    if (distance <= B.enemy.reach) {
      if (e.cooldown <= 0) { e.mode = 'windup'; e.timer = B.enemy.windup; bus.emit('attackStarted', { target: 'enemy' }); }
    } else {
      const speed = Math.min(e.speed * dt, distance - B.enemy.reach * 0.85);
      world.move(e, dx / distance * speed, dz / distance * speed);
    }
  }
}
