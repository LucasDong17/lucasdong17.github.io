import { Game } from '../src/core/game.js';
import { BALANCE as B } from '../src/data/balance.js';
import { createRun } from '../src/state/run.js';
import { stepRun } from '../src/systems/simulation.js';

const results = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const key = (code, down = true) => {
  const event = new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true, cancelable: true });
  window.dispatchEvent(event);
  return event;
};

document.getElementById('start').addEventListener('click', async () => {
  const markup = await (await fetch('../index.html')).text();
  const template = new DOMParser().parseFromString(markup, 'text/html');
  template.querySelectorAll('script').forEach(script => script.remove());
  document.body.innerHTML = template.body.innerHTML;
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '../css/main.css';
  document.head.append(style);
  const status = document.createElement('pre');
  status.id = 'test-results';
  status.style.cssText = 'position:fixed;right:12px;top:140px;max-width:500px;max-height:50vh;overflow:auto;background:#14251eef;padding:12px;font:11px monospace;white-space:pre-wrap;pointer-events:none;z-index:10';
  document.body.append(status);
  const game = new Game(document.getElementById('game'));
  const report = async (name, fn) => {
    try { await fn(); results.push(`PASS ${name}`); }
    catch (error) { results.push(`FAIL ${name}: ${error.message}`); }
    status.textContent = results.join('\n');
  };
  const reset = () => { game.run = createRun(); game.resume(); };
  const tick = (count, input = {}) => { for (let i = 0; i < count; i++) stepRun(game.run, input, game.world, game.bus); };
  const render = () => { game.view.render(game.run, 0); game.hud.render(game.run, game.paused, game.started); };
  const pointer = down => game.canvas.dispatchEvent(new PointerEvent(down ? 'pointerdown' : 'pointerup', { button: 0, bubbles: true }));
  game.resume();
  await report('WebGL initializes, RAF advances, HUD matches state', async () => {
    await wait(200);
    assert(game.run.time > 0, 'simulation did not advance');
    assert(game.hud.nodes['player-health'].textContent === '100 / 100', 'health HUD');
    assert(game.view.renderer.getContext().getError() === 0, 'WebGL error');
  });
  await report('WASD and all arrows; opposite keys cancel; diagonal normalized', () => {
    for (const [code, axis, value] of [['KeyW', 'moveZ', -1], ['ArrowUp', 'moveZ', -1], ['KeyS', 'moveZ', 1], ['ArrowDown', 'moveZ', 1], ['KeyA', 'moveX', -1], ['ArrowLeft', 'moveX', -1], ['KeyD', 'moveX', 1], ['ArrowRight', 'moveX', 1]]) {
      key(code);
      assert(game.input.sample()[axis] === value, code);
      key(code, false);
    }
    key('KeyW'); key('KeyS'); key('KeyA'); key('KeyD');
    assert(game.input.sample().moveX === 0 && game.input.sample().moveZ === 0, 'opposites');
    game.input.clear(); reset();
    key('KeyW'); key('KeyD'); tick(30, game.input.sample());
    assert(Math.abs(Math.hypot(game.run.player.x, game.run.player.z - 6) - B.player.speed / 2) < 1e-6, 'diagonal');
    game.input.clear();
  });
  await report('Held movement drives actual animation loop', async () => {
    reset();
    key('KeyW');
    await wait(400);
    key('KeyW', false);
    assert(game.run.player.z < 5.2, 'no actual movement');
    const z = game.run.player.z;
    await wait(150);
    assert(game.run.player.z === z, 'movement stuck');
  });
  await report('Solid obstacles and boundary remain valid during diagonal inputs', () => {
    for (const o of game.world.obstacles) {
      Object.assign(game.run.player, { x: o.x - 2, z: o.z - 2 });
      for (let i = 0; i < 90; i++) {
        game.world.move(game.run.player, 0.06, 0.06);
        assert(game.world.valid(game.run.player.x, game.run.player.z, game.run.player.radius), 'penetration');
      }
    }
    game.world.move(game.run.player, 100, 100);
    assert(game.world.valid(game.run.player.x, game.run.player.z, game.run.player.radius), 'boundary');
  });
  await report('Space and LMB give identical single-hit swings; holds respect cooldown', () => {
    const health = [];
    for (const source of ['space', 'mouse']) {
      reset(); game.run.enemy.z = 4.5;
      if (source === 'space') key('Space'); else pointer(true);
      tick(30, game.input.sample());
      health.push(game.run.enemy.health);
      assert(game.run.enemy.health === 50, 'one hit per swing');
      if (source === 'space') key('Space', false); else pointer(false);
      assert(!game.input.sample().attack, 'attack release');
    }
    assert(health[0] === health[1], 'input parity');
  });
  await report('Quick Space taps and mouse clicks survive between simulation steps', () => {
    for (const source of ['space', 'mouse']) {
      reset();
      if (source === 'space') { key('Space'); key('Space', false); }
      else { pointer(true); pointer(false); }
      tick(1, game.input.sample());
      assert(game.run.player.attack !== null, 'short tap lost');
      assert(!game.input.sample().attack, 'tap repeated');
    }
  });
  await report('Live combat: approach, swing effect, damage, defeat and timed respawn', async () => {
    reset();
    key('KeyW');
    for (let i = 0; i < 40 && Math.hypot(game.run.player.x - game.run.enemy.x, game.run.player.z - game.run.enemy.z) > 1.8; i++) await wait(50);
    key('KeyW', false);
    assert(game.run.enemy.mode !== 'idle', 'enemy failed to detect');
    key('Space');
    let sawSwing = false;
    let sawFlash = false;
    for (let i = 0; i < 42; i++) {
      await wait(50);
      sawSwing ||= game.view.swing.visible;
      sawFlash ||= game.run.enemy.flash > 0;
    }
    key('Space', false);
    assert(sawSwing && sawFlash, 'missing visible swing/damage');
    assert(game.run.enemy.health === 0, 'enemy not defeated');
    tick(610); render();
    assert(game.run.wave === 2 && game.run.enemy.health === game.run.enemy.maxHealth, 'next wave did not start');
    assert(game.world.valid(game.run.enemy.x, game.run.enemy.z, game.run.enemy.radius), 'invalid spawn');
  });
  await report('Range and rear arc misses through live input listener', () => {
    for (const [z, facing] of [[2, Math.PI], [4.5, 0]]) {
      reset(); game.run.player.facing = facing; game.run.enemy.z = z;
      key('Space'); tick(20, game.input.sample()); key('Space', false);
      assert(game.run.enemy.health === 75, 'unexpected hit');
    }
  });
  await report('Three enemy defeat/respawn cycles retain one scene entity', () => {
    reset();
    const children = game.view.scene.children.length;
    for (let cycle = 0; cycle < 3; cycle++) {
      Object.assign(game.run.enemy, { x: 0, z: 4.5, health: 25, mode: 'idle' });
      game.run.player.attack = null;
      tick(12, { attack: true });
      assert(game.run.enemy.mode === 'defeated', 'defeat');
      tick(610); render();
      assert(game.run.enemy.health === game.run.enemy.maxHealth, 'next wave spawn');
      assert(game.view.scene.children.length === children, 'stale scene entities');
    }
  });
  await report('Three player defeats and R restarts; no duplicate attack listeners', () => {
    let starts = 0;
    const off = game.bus.on('attackStarted', event => { if (event.target === 'player') starts++; });
    for (let cycle = 0; cycle < 3; cycle++) {
      reset(); game.run.enemy.z = 5;
      tick(1200); render();
      assert(game.run.player.health === 0 && game.run.status === 'defeated', 'player defeat');
      const before = JSON.stringify(game.run);
      tick(60, { moveX: 1, attack: true });
      assert(JSON.stringify(game.run) === before, 'defeated activity');
      key('KeyR'); key('KeyR', false);
      assert(game.run.player.health === 100 && game.run.enemy.health === 75 && game.run.player.z === 6, 'unclean restart');
      key('Space'); tick(1, game.input.sample()); key('Space', false);
    }
    off(); assert(starts === 3, 'duplicate attack events');
  });
  await report('Focus-bound default prevention; blur clears held keyboard/pointer', async () => {
    reset();
    assert(key('Space').defaultPrevented, 'focused Space scroll');
    assert(key('ArrowUp').defaultPrevented, 'focused arrow scroll');
    pointer(true);
    window.dispatchEvent(new Event('blur'));
    assert(game.paused && game.input.held.size === 0, 'blur cleanup');
    const time = game.run.time;
    await wait(250);
    assert(game.run.time === time, 'pause advanced');
    game.hud.nodes.play.focus();
    assert(!key('Space').defaultPrevented && !key('ArrowUp').defaultPrevented, 'outside canvas prevention');
    game.resume();
    await wait(150);
    assert(game.run.time - time < 0.25, 'resume jumped');
    assert(game.run.player.attack === null && !game.run.player.moving, 'stuck action');
  });
  await report('Visibility loss pauses; large frame delta is clamped', () => {
    reset(); key('KeyW');
    const descriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    if (descriptor) Object.defineProperty(document, 'hidden', descriptor); else delete document.hidden;
    assert(game.paused && game.input.held.size === 0, 'visibility cleanup');
    game.resume();
    cancelAnimationFrame(game.raf);
    game.lastTime = 1000;
    const time = game.run.time;
    game.frame(61000);
    assert(game.run.time - time <= B.maxFrame + 1e-6, 'unclamped elapsed');
  });
  await report('HUD matches damage, respawn and cooldown; one RAF after restarts', async () => {
    reset(); game.run.enemy.z = 4.5;
    tick(12, { attack: true }); render();
    assert(game.hud.nodes['enemy-health'].textContent === '50 / 75', 'enemy HUD');
    assert(game.hud.nodes['attack-label'].textContent === 'Swing!', 'cooldown HUD');
    reset();
    const now = performance.now();
    await wait(500);
    const wall = (performance.now() - now) / 1000;
    assert(game.run.time > wall * 0.6 && game.run.time < wall * 1.3, 'loop count / timing');
  });
  reset(); game.pause(); render();
  status.textContent = `${results.join('\n')}\n\n${results.filter(x => x.startsWith('PASS')).length}/${results.length} passed. Browser checks finished.`;
}, { once: true });
