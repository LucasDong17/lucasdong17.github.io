import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE as B } from '../src/data/balance.js';
import { EventBus } from '../src/core/event-bus.js';
import { createRun, equipItem } from '../src/state/run.js';
import { World } from '../src/world/world.js';
import { stepRun, canHit, attackStage, attackDuration } from '../src/systems/simulation.js';

const world = new World();
const bus = new EventBus();
const tick = (run, input = {}, count = 1, events = bus) => {
  for (let i = 0; i < count; i++) stepRun(run, input, world, events);
};
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('normalized cardinal/diagonal movement and cancelling axes', () => {
  const a = createRun();
  const b = createRun();
  tick(a, { moveX: 1 }, 30);
  tick(b, { moveX: 1, moveZ: 1 }, 30);
  close(Math.hypot(a.player.x, a.player.z - 6), Math.hypot(b.player.x, b.player.z - 6));
  close(a.player.x, B.player.speed / 2);
  const initial = { ...a.player };
  tick(a, { moveX: 0, moveZ: 0 }, 10);
  close(a.player.x, initial.x);
  close(a.player.z, initial.z);
});

test('all obstacles block direct and diagonal movement; bounds block all directions', () => {
  for (const obstacle of world.obstacles) {
    for (let direction = 0; direction < 16; direction++) {
      const angle = direction / 16 * Math.PI * 2;
      const actor = { x: obstacle.x + Math.sin(angle) * 3, z: obstacle.z + Math.cos(angle) * 3, radius: B.player.radius };
      for (let i = 0; i < 180; i++) {
        world.move(actor, -Math.sin(angle) * 0.07, -Math.cos(angle) * 0.07);
        assert.ok(world.valid(actor.x, actor.z, actor.radius));
      }
    }
  }
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
    const actor = { x: 0, z: 0, radius: B.player.radius };
    world.move(actor, x * 100, z * 100);
    assert.ok(world.valid(actor.x, actor.z, actor.radius));
  }
});

test('range, arc edges and dead targets', () => {
  const { player: p, enemy: e } = createRun();
  Object.assign(p, { x: 0, z: 0, facing: 0 });
  Object.assign(e, { x: 0, z: 2 });
  assert.ok(canHit(p, e));
  e.z = B.player.range + 0.001;
  assert.ok(!canHit(p, e));
  for (const offset of [-0.001, 0.001]) {
    const angle = B.player.arc / 2 + offset;
    Object.assign(e, { x: Math.sin(angle), z: Math.cos(angle) });
    assert.equal(canHit(p, e), offset < 0);
  }
  Object.assign(e, { x: 0, z: -1 });
  assert.ok(!canHit(p, e));
  Object.assign(e, { z: 1, health: 0 });
  assert.ok(!canHit(p, e));
});

test('windup/active/recovery, one damage event per swing, held attack cooldown', () => {
  const run = createRun();
  Object.assign(run.enemy, { x: 0, z: 4.3, mode: 'idle' });
  const events = new EventBus();
  const hits = [];
  const starts = [];
  events.on('damageTaken', e => { if (e.target === 'enemy') hits.push(run.time); });
  events.on('attackStarted', e => { if (e.target === 'player') starts.push(run.time); });
  tick(run, { attack: true }, 1, events);
  assert.equal(attackStage(run.player.attack), 'windup');
  assert.equal(run.enemy.health, 75);
  tick(run, { attack: true }, 10, events);
  assert.equal(attackStage(run.player.attack), 'active');
  assert.equal(run.enemy.health, 50);
  tick(run, { attack: true }, 12, events);
  assert.equal(attackStage(run.player.attack), 'recovery');
  assert.equal(hits.length, 1);
  tick(run, { attack: true }, 130, events);
  for (let i = 1; i < starts.length; i++) assert.ok(starts[i] - starts[i - 1] >= attackDuration - B.step);
  assert.equal(hits.length, 3);
  assert.equal(run.enemy.mode, 'defeated');
});

test('enemy idles, detects, chases, telegraphs, attacks with cooldown and can be dodged', () => {
  const run = createRun();
  tick(run, {}, 60);
  assert.equal(run.enemy.mode, 'idle');
  run.player.z = 4;
  tick(run);
  assert.equal(run.enemy.mode, 'chase');
  tick(run, {}, 240);
  assert.ok(run.player.health < 100);
  while (run.enemy.mode !== 'windup') tick(run);
  const health = run.player.health;
  run.player.z = 10;
  tick(run, {}, 32);
  assert.equal(run.player.health, health);
  assert.ok(run.enemy.cooldown > 1);
});

test('defeated enemies begin a ten-second intermission and advance the wave cleanly', () => {
  const run = createRun();
  for (let cycle = 0; cycle < 3; cycle++) {
    Object.assign(run.enemy, { x: run.player.x, z: run.player.z - 1.5, health: 25, mode: 'idle' });
    run.player.attack = null;
    tick(run, { attack: true }, 12);
    assert.equal(run.enemy.health, 0);
    const old = run.enemy;
    assert.equal(run.phase, 'intermission');
    assert.ok(run.intermission > 9.7);
    tick(run, {}, 610);
    assert.notEqual(run.enemy, old);
    assert.equal(run.wave, cycle + 2);
    assert.equal(run.enemy.health, run.enemy.maxHealth);
    assert.equal(run.enemy.flash, 0);
    assert.ok(world.valid(run.enemy.x, run.enemy.z, run.enemy.radius));
    assert.ok(Math.hypot(run.enemy.x - run.player.x, run.enemy.z - run.player.z) > 3);
  }
});

test('holding pickup collects exactly once and equipment updates player stats', () => {
  const run = createRun();
  run.drops = [{ id: 99, key: 'stone:chestplate', x: run.player.x, z: run.player.z, spin: 0 }];
  tick(run, { pickup: true }, 35);
  assert.equal(run.inventory.length, 0);
  tick(run, { pickup: true }, 2);
  assert.equal(run.inventory.length, 1);
  assert.equal(run.drops.length, 0);
  assert.ok(equipItem(run, 99));
  assert.equal(run.equipped.chestplate, 99);
  assert.ok(run.player.maxHealth > 100);
  assert.ok(run.player.defense > 0);
});

test('enemy attacks cause player defeat; defeated simulation is frozen', () => {
  const run = createRun();
  run.enemy.z = 5;
  const events = new EventBus();
  const hitTimes = [];
  events.on('damageTaken', e => { if (e.target === 'player') hitTimes.push(run.time); });
  tick(run, {}, 1200, events);
  assert.equal(run.status, 'defeated');
  assert.equal(run.player.health, 0);
  assert.equal(hitTimes.length, 8);
  for (let i = 1; i < hitTimes.length; i++) assert.ok(hitTimes[i] - hitTimes[i - 1] >= B.enemy.cooldown);
  const before = JSON.stringify(run);
  tick(run, { moveX: 1, attack: true }, 120);
  assert.equal(JSON.stringify(run), before);
  assert.deepEqual(createRun(), createRun());
});

test('event subscriptions can be removed without duplicate handling', () => {
  const events = new EventBus();
  let calls = 0;
  const off = events.on('damageTaken', () => calls++);
  events.emit('damageTaken', {});
  off();
  events.emit('damageTaken', {});
  assert.equal(calls, 1);
});
