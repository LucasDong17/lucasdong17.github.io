import { BALANCE } from '../data/balance.js';
import { EventBus } from './event-bus.js';
import { AudioService } from './audio.js';
import { createRun, equipItem } from '../state/run.js';
import { World } from '../world/world.js';
import { Input } from '../input/input.js';
import { stepRun } from '../systems/simulation.js';
import { SceneView } from '../rendering/scene.js';
import { Hud } from '../ui/hud.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas; this.run = createRun(); this.world = new World(); this.bus = new EventBus(); this.audio = new AudioService();
    this.view = new SceneView(canvas, this.world);
    this.hud = new Hud({ onMenu: open => this.setMenu(open), onEquip: id => equipItem(this.run, id) });
    this.paused = true; this.started = false; this.menuOpen = false; this.accumulator = 0; this.lastTime = null; this.destroyed = false;
    this.input = new Input(canvas, () => this.pause(), () => this.restart(), () => this.audio.unlock());
    this.unsubscribers = ['attackStarted','damageTaken','enemyDefeated','playerDied','pickupCollected'].map(name => this.bus.on(name, event => this.audio.play(name, event)));
    this.unsubscribers.push(this.bus.on('waveStarted', event => this.hud.announce(event.wave, event.enemy, event.boss)));
    this.onPlay = () => { if (this.run.status === 'defeated') this.restart(); else this.resume(); };
    this.hud.nodes.play.addEventListener('click', this.onPlay);
    this.hud.nodes.play.disabled = false; this.hud.nodes.play.textContent = 'Enter the meadow →';
    this.frame = this.frame.bind(this); this.view.render(this.run, 0, true); this.raf = requestAnimationFrame(this.frame);
  }
  pause() { this.paused = true; this.accumulator = 0; this.lastTime = null; this.input.clear(); }
  resume() {
    if (this.menuOpen) return;
    this.input.clear(); this.canvas.focus(); this.audio.unlock(); this.started = true; this.paused = false; this.accumulator = 0; this.lastTime = null;
    if (!this.hasAnnounced) { this.hasAnnounced = true; this.hud.announce(1, this.run.enemy.name); }
  }
  setMenu(open) {
    this.menuOpen = open;
    if (open) this.pause();
    else if (this.started && this.run.status === 'playing') this.resume();
  }
  restart() {
    if (this.run.status !== 'defeated') return;
    this.run = createRun(); this.hasAnnounced = false; this.view.render(this.run, 0, true); this.resume();
  }
  frame(now) {
    if (this.destroyed) return;
    const elapsed = this.lastTime === null ? 0 : Math.min((now - this.lastTime) / 1000, BALANCE.maxFrame); this.lastTime = now;
    if (!this.paused) { this.accumulator += elapsed; while (this.accumulator >= BALANCE.step) { stepRun(this.run, this.input.sample(), this.world, this.bus); this.accumulator -= BALANCE.step; } }
    this.view.render(this.run, elapsed); this.hud.render(this.run, this.paused, this.started); this.raf = requestAnimationFrame(this.frame);
  }
  destroy() {
    this.destroyed = true; cancelAnimationFrame(this.raf); this.input.destroy(); this.hud.nodes.play.removeEventListener('click', this.onPlay);
    this.unsubscribers.forEach(off => off()); this.hud.destroy(); this.audio.destroy(); this.view.destroy();
  }
}
