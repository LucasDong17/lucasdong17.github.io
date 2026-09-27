import { BALANCE } from '../data/balance.js';
import { EventBus } from './event-bus.js';
import { AudioService } from './audio.js';
import { combineItems, createRun, enterHub, equipBestItems, equipItem, hatchEgg, loadProgress, saveProgress, sellItem, sellPet, startLevel, togglePet } from '../state/run.js';
import { World } from '../world/world.js';
import { Input } from '../input/input.js';
import { stepRun } from '../systems/simulation.js';
import { SceneView } from '../rendering/scene.js';
import { Hud } from '../ui/hud.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas; this.run = createRun(loadProgress()); this.world = new World(); this.bus = new EventBus(); this.audio = new AudioService();
    this.view = new SceneView(canvas, this.world);
    this.hud = new Hud({ onMenu: open => this.setMenu(open), onEquip: id => { equipItem(this.run, id); this.save(); }, onEquipBest: category => { if (equipBestItems(this.run, category)) this.save(); }, onCombine: (key, level) => { if (combineItems(this.run, key, level)) this.save(); }, onHatch: key => { const pet = hatchEgg(this.run, key); if (pet) this.save(); return pet; }, onTogglePet: id => { const changed = togglePet(this.run, id); if (changed) this.save(); return changed; }, onSellItem: (id, category) => { const value = sellItem(this.run, id, category); if (value) this.save(); return value; }, onSellPet: id => { const value = sellPet(this.run, id); if (value) this.save(); return value; }, onStart: (biome, wave) => this.startLevel(biome, wave), onReturn: () => this.returnToHub() });
    this.paused = true; this.started = false; this.menuOpen = false; this.accumulator = 0; this.lastTime = null; this.destroyed = false;
    this.input = new Input(canvas, () => this.pause(), () => this.restart(), () => this.audio.unlock());
    this.unsubscribers = ['attackStarted','damageTaken','enemyDefeated','playerDied','pickupCollected'].map(name => this.bus.on(name, event => this.audio.play(name, event)));
    this.unsubscribers.push(this.bus.on('waveStarted', event => this.hud.announce(event.wave, event.enemy, event.boss, event.count)));
    this.unsubscribers.push(this.bus.on('portalEntered', event => this.hud.openMenu(event.portal)));
    for (const event of ['pickupCollected','waveCleared','waveStarted','playerDied','biomeCompleted']) this.unsubscribers.push(this.bus.on(event, () => this.save()));
    this.onPlay = () => this.resume();
    this.hud.nodes.play.addEventListener('click', this.onPlay);
    this.hud.nodes.play.disabled = false; this.hud.nodes.play.textContent = 'Enter the safe haven →';
    this.frame = this.frame.bind(this); this.view.render(this.run, 0, true); this.raf = requestAnimationFrame(this.frame);
  }
  pause() { this.paused = true; this.accumulator = 0; this.lastTime = null; this.input.clear(); }
  resume() { if (this.menuOpen) return; this.input.clear(); this.canvas.focus(); this.audio.unlock(); this.started = true; this.paused = false; this.accumulator = 0; this.lastTime = null; }
  setMenu(open) { this.menuOpen = open; if (open) this.pause(); else if (this.started) this.resume(); }
  save() { saveProgress(this.run); }
  startLevel(biome, wave) { if (!startLevel(this.run, biome, wave, this.world)) return; this.menuOpen = false; this.save(); this.view.render(this.run, 0, true); this.resume(); this.hud.announce(wave, this.run.enemies[0].name, wave === BALANCE.maxWave, this.run.enemies.length); }
  returnToHub() { enterHub(this.run, this.world); this.save(); this.view.render(this.run, 0, true); this.resume(); }
  restart() { if (this.run.status === 'hub') this.resume(); }
  frame(now) {
    if (this.destroyed) return;
    const elapsed = this.lastTime === null ? 0 : Math.min((now - this.lastTime) / 1000, BALANCE.maxFrame); this.lastTime = now;
    if (!this.paused) { this.accumulator += elapsed; while (this.accumulator >= BALANCE.step) { stepRun(this.run, this.input.sample(), this.world, this.bus); this.accumulator -= BALANCE.step; } }
    this.view.render(this.run, elapsed); this.hud.render(this.run, this.paused, this.started); this.raf = requestAnimationFrame(this.frame);
  }
  destroy() { this.save(); this.destroyed = true; cancelAnimationFrame(this.raf); this.input.destroy(); this.hud.nodes.play.removeEventListener('click', this.onPlay); this.unsubscribers.forEach(off => off()); this.hud.destroy(); this.audio.destroy(); this.view.destroy(); }
}
