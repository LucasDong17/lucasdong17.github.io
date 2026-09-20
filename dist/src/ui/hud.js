import { BALANCE as B, ENEMIES, BOSS, SETS, ITEM_TYPES, itemDefinition } from '../data/balance.js';
import { attackStage, attackDuration } from '../systems/simulation.js';

const byId = id => document.getElementById(id);

export class Hud {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.activeMenu = null;
    this.inventoryTab = 'armor';
    this.indexTab = 'enemies';
    this.selectedIndex = 'cow';
    this.nodes = Object.fromEntries([
      'player-health','player-fill','player-stats','enemy-panel','enemy-name','enemy-icon','enemy-health','enemy-fill','enemy-state',
      'wave-label','wave-name','wave-mode','attack-label','attack-fill','pickup-prompt','pickup-fill','countdown','countdown-value',
      'overlay','overlay-title','overlay-copy','overlay-kicker','play','menu-backdrop','inventory-menu','index-menu','inventory-grid',
      'inventory-count','index-grid','index-detail','loot-badge','announcement','announcement-kicker','announcement-title','announcement-copy',
    ].map(id => [id, byId(id)]));
    byId('open-inventory').addEventListener('click', () => this.openMenu('inventory'));
    byId('open-index').addEventListener('click', () => this.openMenu('index'));
    document.querySelectorAll('.close-menu').forEach(button => button.addEventListener('click', () => this.closeMenu()));
    this.nodes['menu-backdrop'].addEventListener('pointerdown', event => { if (event.target === this.nodes['menu-backdrop']) this.closeMenu(); });
    document.querySelectorAll('[data-inventory-tab]').forEach(button => button.addEventListener('click', () => { this.inventoryTab = button.dataset.inventoryTab; this.updateTabs(); this.renderInventory(this.lastRun); }));
    document.querySelectorAll('[data-index-tab]').forEach(button => button.addEventListener('click', () => { this.indexTab = button.dataset.indexTab; this.selectedIndex = this.indexTab === 'enemies' ? 'cow' : 'stone'; this.updateTabs(); this.renderIndex(this.lastRun); }));
    this.nodes['inventory-grid'].addEventListener('click', event => {
      const card = event.target.closest('[data-item-id]');
      if (card) { this.handlers.onEquip?.(Number(card.dataset.itemId)); this.renderInventory(this.lastRun); }
    });
    this.nodes['index-grid'].addEventListener('click', event => {
      const card = event.target.closest('[data-index-key]:not(.locked)');
      if (card) { this.selectedIndex = card.dataset.indexKey; this.renderIndex(this.lastRun); }
    });
  }

  openMenu(name) {
    this.activeMenu = name;
    this.nodes['menu-backdrop'].hidden = false;
    this.nodes['inventory-menu'].hidden = name !== 'inventory';
    this.nodes['index-menu'].hidden = name !== 'index';
    this.handlers.onMenu?.(true);
    if (name === 'inventory') this.renderInventory(this.lastRun);
    else this.renderIndex(this.lastRun);
    this.nodes[`${name}-menu`].querySelector('.close-menu').focus();
  }

  closeMenu() {
    if (!this.activeMenu) return;
    this.activeMenu = null;
    this.nodes['menu-backdrop'].hidden = true;
    this.handlers.onMenu?.(false);
  }

  updateTabs() {
    document.querySelectorAll('[data-inventory-tab]').forEach(button => button.classList.toggle('active', button.dataset.inventoryTab === this.inventoryTab));
    document.querySelectorAll('[data-index-tab]').forEach(button => button.classList.toggle('active', button.dataset.indexTab === this.indexTab));
  }

  renderInventory(run) {
    if (!run) return;
    this.nodes['inventory-count'].textContent = `${run.inventory.length} / 40 items`;
    const items = run.inventory.map(item => ({ ...item, definition: itemDefinition(item.key) })).filter(item => item.definition?.category === this.inventoryTab);
    this.nodes['inventory-grid'].innerHTML = items.length ? items.map(item => {
      const d = item.definition;
      const equipped = run.equipped[d.slot] === item.id;
      const stats = d.category === 'tools' ? `+${d.damage} damage` : `+${d.defense} defense · +${d.health} health`;
      return `<button class="item-card ${equipped ? 'equipped' : ''}" data-item-id="${item.id}" style="--item-color:${d.color}"><span class="item-icon">${d.icon}</span><b>${d.name}</b><small>${stats}</small></button>`;
    }).join('') : `<div class="empty-state"><span>✦</span><strong>No ${this.inventoryTab} yet</strong><p>Defeat enemies and hold E near their drops.</p></div>`;
  }

  renderIndex(run) {
    if (!run) return;
    if (this.indexTab === 'enemies') {
      const entries = [...ENEMIES, BOSS];
      this.nodes['index-grid'].innerHTML = entries.map(enemy => {
        const seen = run.discovered.has(enemy.key);
        return `<button class="index-card ${seen ? '' : 'locked'} ${this.selectedIndex === enemy.key ? 'selected' : ''}" data-index-key="${enemy.key}"><span>${seen ? enemy.icon : '❔'}</span><b>${seen ? enemy.name : 'Undiscovered'}</b></button>`;
      }).join('');
      const enemy = entries.find(entry => entry.key === this.selectedIndex);
      const seen = enemy && run.discovered.has(enemy.key);
      this.nodes['index-detail'].innerHTML = seen ? `<div class="detail-icon">${enemy.icon}</div><small>WAVES ${enemy.waves}</small><h3>${enemy.name}</h3><p>${enemy.trait}. Once discovered, creatures stay recorded here for the rest of this run.</p><div class="stat-list"><div><span>Health</span><b>${enemy.health}</b></div><div><span>Damage</span><b>${enemy.damage}</b></div><div><span>Speed</span><b>${enemy.speed}</b></div></div>` : `<div class="detail-icon">❔</div><h3>Unknown creature</h3><p>Reach a new wave to reveal this entry and its battle stats.</p>`;
    } else {
      this.nodes['index-grid'].innerHTML = SETS.map(set => {
        const seen = run.wave >= set.unlock;
        return `<button class="index-card ${seen ? '' : 'locked'} ${this.selectedIndex === set.key ? 'selected' : ''}" data-index-key="${set.key}" style="border-color:${seen ? set.color : '#57736c'}"><span>${seen ? '✦' : '❔'}</span><b>${seen ? `${set.name} Set` : 'Undiscovered'}</b></button>`;
      }).join('');
      const set = SETS.find(entry => entry.key === this.selectedIndex);
      const seen = set && run.wave >= set.unlock;
      this.nodes['index-detail'].innerHTML = seen ? `<div class="detail-icon">✦</div><small>FOUND FROM WAVE ${set.unlock}</small><h3>${set.name} Set</h3><div class="set-stripe" style="background:${set.color}"></div><p>A complete family of weapons and armor. Higher-tier sets improve the same core stats with stronger values.</p><div class="stat-list"><div><span>Pieces</span><b>${ITEM_TYPES.length}</b></div><div><span>Power rating</span><b>${set.power}×</b></div><div><span>Color</span><b>${set.color}</b></div></div>` : `<div class="detail-icon">❔</div><h3>Unknown set</h3><p>Survive deeper waves to discover this equipment family.</p>`;
    }
  }

  announce(wave, enemy, boss = false) {
    const box = this.nodes.announcement;
    this.nodes['announcement-kicker'].textContent = boss ? 'BOSS WAVE' : 'GET READY';
    this.nodes['announcement-title'].textContent = `Wave ${wave}`;
    this.nodes['announcement-copy'].textContent = `${enemy} approaches`;
    box.classList.toggle('boss', boss);
    box.hidden = false;
    box.style.animation = 'none';
    void box.offsetWidth;
    box.style.animation = '';
    clearTimeout(this.announcementTimer);
    this.announcementTimer = setTimeout(() => { box.hidden = true; }, 2250);
  }

  render(run, paused, started) {
    this.lastRun = run;
    const n = this.nodes; const p = run.player; const e = run.enemy;
    n['player-health'].textContent = `${p.health} / ${p.maxHealth}`;
    n['player-fill'].style.width = `${p.health / p.maxHealth * 100}%`;
    n['player-stats'].textContent = `${p.damage} damage · ${p.defense} defense`;
    n['wave-label'].textContent = `WAVE ${run.wave}${e.boss ? ' · BOSS' : ''}`;
    n['wave-name'].textContent = e.name;
    n['wave-mode'].textContent = run.phase === 'intermission' ? 'Next wave incoming' : '1 enemy remaining';
    n['enemy-name'].textContent = e.name.toUpperCase(); n['enemy-icon'].textContent = e.boss ? '👑' : ({ cow:'🐄',boar:'🐗',wolf:'🐺',golem:'🪨',guardian:'🐲' }[e.type] || '🐾');
    n['enemy-health'].textContent = `${e.health} / ${e.maxHealth}`;
    n['enemy-fill'].style.width = `${e.health / e.maxHealth * 100}%`;
    n['enemy-state'].textContent = e.mode === 'defeated' ? 'Defeated' : e.mode === 'windup' ? 'About to strike — move!' : e.mode === 'chase' ? 'Hunting you' : 'Waiting in the meadow';
    const stage = attackStage(p.attack);
    n['attack-label'].textContent = run.status === 'defeated' ? 'Defeated' : { ready: 'Sword ready', windup: 'Winding up…', active: 'Swing!', recovery: 'Recovering…' }[stage];
    n['attack-fill'].style.width = `${p.attack ? Math.min(100, p.attack.elapsed / attackDuration * 100) : 100}%`;
    n['countdown'].hidden = run.phase !== 'intermission'; n['countdown-value'].textContent = Math.ceil(run.intermission);
    const nearDrop = run.pickup.id !== null;
    n['pickup-prompt'].hidden = !nearDrop; n['pickup-fill'].style.width = `${run.pickup.progress / B.pickup.hold * 100}%`;
    const newLoot = run.inventory.filter(item => item.new).length;
    n['loot-badge'].hidden = newLoot === 0; n['loot-badge'].textContent = newLoot;
    if (this.activeMenu === 'inventory') run.inventory.forEach(item => { item.new = false; });
    n.overlay.hidden = this.activeMenu || (started && !paused && run.status !== 'defeated');
    if (run.status === 'defeated') {
      n['overlay-kicker'].textContent = `RUN ENDED · WAVE ${run.wave}`; n['overlay-title'].innerHTML = 'The meadow<br><em>won this round.</em>';
      n['overlay-copy'].textContent = 'Your index remembers this run, but your gear is scattered. Start fresh and push farther.'; n.play.textContent = 'Begin a new run →';
    } else if (started && paused && !this.activeMenu) {
      n['overlay-kicker'].textContent = 'THE MEADOW CAN WAIT'; n['overlay-title'].innerHTML = 'Game<br><em>paused.</em>';
      n['overlay-copy'].textContent = 'Nothing moves while you are away. Return when you are ready.'; n.play.textContent = 'Return to the meadow →';
    }
  }

  destroy() { clearTimeout(this.announcementTimer); }
}
