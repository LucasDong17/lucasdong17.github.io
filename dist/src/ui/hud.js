import { BALANCE as B, BIOMES, ENEMIES, BOSSES, SETS, ITEM_TYPES, itemDefinition } from '../data/balance.js';
import { attackStage, attackDuration } from '../systems/simulation.js';
import { primaryEnemy } from '../state/run.js';

const byId = id => document.getElementById(id);
const statsText = d => d.category === 'tools' ? `+${d.damage} damage` : `+${d.defense} shield · +${d.health} health`;

export class Hud {
  constructor(handlers = {}) {
    this.handlers = handlers; this.activeMenu = null; this.inventoryTab = 'armor'; this.indexTab = 'enemies'; this.selectedIndex = 'cow';
    this.nodes = Object.fromEntries(['player-health','player-fill','player-stats','enemy-panel','enemy-name','enemy-icon','enemy-health','enemy-fill','enemy-state','wave-label','wave-name','wave-mode','attack-label','attack-fill','pickup-prompt','pickup-fill','countdown','countdown-value','overlay','overlay-title','overlay-copy','overlay-kicker','play','return-hub','menu-backdrop','inventory-menu','index-menu','play-menu','upgrade-menu','inventory-grid','inventory-count','equip-best','index-grid','index-detail','biome-grid','upgrade-grid','loot-badge','announcement','announcement-kicker','announcement-title','announcement-copy','hub-prompt','hub-prompt-title','hub-prompt-copy'].map(id => [id, byId(id)]));
    byId('open-inventory').addEventListener('click', () => this.openMenu('inventory'));
    byId('open-index').addEventListener('click', () => this.openMenu('index'));
    this.onReturn = () => this.handlers.onReturn?.();
    this.nodes['return-hub'].addEventListener('click', this.onReturn);
    document.querySelectorAll('.close-menu').forEach(button => button.addEventListener('click', () => this.closeMenu()));
    this.nodes['menu-backdrop'].addEventListener('pointerdown', event => { if (event.target === this.nodes['menu-backdrop']) this.closeMenu(); });
    document.querySelectorAll('[data-inventory-tab]').forEach(button => button.addEventListener('click', () => { this.inventoryTab = button.dataset.inventoryTab; this.updateTabs(); this.renderInventory(this.lastRun); }));
    document.querySelectorAll('[data-index-tab]').forEach(button => button.addEventListener('click', () => { this.indexTab = button.dataset.indexTab; this.selectedIndex = this.indexTab === 'enemies' ? 'cow' : 'stone'; this.updateTabs(); this.renderIndex(this.lastRun); }));
    this.nodes['equip-best'].addEventListener('click', () => { this.handlers.onEquipBest?.(this.inventoryTab); this.renderInventory(this.lastRun); });
    this.nodes['inventory-grid'].addEventListener('click', event => { const card = event.target.closest('[data-item-id]'); if (card) { this.handlers.onEquip?.(Number(card.dataset.itemId)); this.renderInventory(this.lastRun); } });
    this.nodes['index-grid'].addEventListener('click', event => { const card = event.target.closest('[data-index-key]:not(.locked)'); if (card) { this.selectedIndex = card.dataset.indexKey; this.renderIndex(this.lastRun); } });
    this.nodes['biome-grid'].addEventListener('click', event => { const button = event.target.closest('[data-biome][data-wave]:not(:disabled)'); if (button) { this.closeMenu(false); this.handlers.onStart?.(button.dataset.biome, Number(button.dataset.wave)); } });
    this.nodes['upgrade-grid'].addEventListener('click', event => { const button = event.target.closest('[data-combine-key]'); if (button && !button.disabled) { this.handlers.onCombine?.(button.dataset.combineKey, Number(button.dataset.level)); this.renderUpgrades(this.lastRun); } });
  }

  openMenu(name) { this.activeMenu = name; this.nodes['menu-backdrop'].hidden = false; for (const menu of ['inventory','index','play','upgrade']) this.nodes[`${menu}-menu`].hidden = menu !== name; this.handlers.onMenu?.(true); if (name === 'inventory') this.renderInventory(this.lastRun); if (name === 'index') this.renderIndex(this.lastRun); if (name === 'play') this.renderPlay(this.lastRun); if (name === 'upgrade') this.renderUpgrades(this.lastRun); this.nodes[`${name}-menu`].querySelector('.close-menu').focus(); }
  closeMenu(notify = true) { if (!this.activeMenu) return; this.activeMenu = null; this.nodes['menu-backdrop'].hidden = true; if (notify) this.handlers.onMenu?.(false); }
  updateTabs() { document.querySelectorAll('[data-inventory-tab]').forEach(button => button.classList.toggle('active', button.dataset.inventoryTab === this.inventoryTab)); document.querySelectorAll('[data-index-tab]').forEach(button => button.classList.toggle('active', button.dataset.indexTab === this.indexTab)); }

  renderInventory(run) {
    if (!run) return; this.nodes['inventory-count'].textContent = `${run.inventory.length} items · saved automatically`;
    const items = run.inventory.map(item => ({ ...item, definition: itemDefinition(item.key, item.level) })).filter(item => item.definition?.category === this.inventoryTab);
    this.nodes['equip-best'].textContent = this.inventoryTab === 'tools' ? '⚔️ Equip Best Weapon' : '🛡️ Equip Best Armor';
    this.nodes['equip-best'].disabled = items.length === 0;
    this.nodes['inventory-grid'].innerHTML = items.length ? items.map(item => { const d = item.definition; const equipped = run.equipped[d.slot] === item.id; return `<button class="item-card ${equipped ? 'equipped' : ''}" data-item-id="${item.id}" style="--item-color:${d.color}"><span class="item-icon">${d.icon}</span><b>${d.name}</b><span class="item-level">LEVEL ${d.level}</span><small>${statsText(d)}</small></button>`; }).join('') : `<div class="empty-state"><span>✦</span><strong>No ${this.inventoryTab} yet</strong><p>Defeat animals and hold E near their drops.</p></div>`;
  }

  renderPlay(run) {
    if (!run) return; const checkpoints = [1, 10, 20, 30, 40, 50];
    this.nodes['biome-grid'].innerHTML = BIOMES.map(biome => { const unlocked = run.progress.unlocked[biome.key] || 0; const highest = Math.min(unlocked, run.progress.highest?.[biome.key] || unlocked); const available = unlocked > 0; const status = run.progress.completed[biome.key] ? 'COMPLETED' : available ? `HIGHEST PLAYED · WAVE ${highest}` : 'DEFEAT THE MEADOW WAVE 50 BOSS'; const startHere = available ? `<button class="start-here" data-biome="${biome.key}" data-wave="${highest}"><span>START HERE</span><b>Wave ${highest}</b><small>Your highest adventure</small></button>` : ''; const buttons = checkpoints.map(wave => `<button class="checkpoint ${wave === 50 ? 'boss' : ''}" data-biome="${biome.key}" data-wave="${wave}" ${unlocked < wave ? 'disabled' : ''}>${wave === 1 ? 'Start' : `Wave ${wave}`}${wave === 50 ? ' 👑' : ''}</button>`).join(''); return `<section class="biome-card ${available ? '' : 'locked'}"><div class="biome-heading"><span>${biome.key === 'frost' ? '❄️' : '🌿'}</span><div><h3>${biome.name}</h3><p>${biome.description}</p></div></div><span class="biome-status">${status}</span>${startHere}<small class="checkpoint-label">OR CHOOSE A CHECKPOINT</small><div class="checkpoint-grid">${buttons}</div></section>`; }).join('');
  }

  renderUpgrades(run) {
    if (!run) return; const groups = new Map(); for (const item of run.inventory) { const token = `${item.key}|${item.level || 1}`; if (!groups.has(token)) groups.set(token, []); groups.get(token).push(item); }
    this.nodes['upgrade-grid'].innerHTML = groups.size ? [...groups.entries()].map(([token, items]) => { const [key, levelText] = token.split('|'); const level = Number(levelText); const d = itemDefinition(key, level); const can = items.length >= 2; return `<article class="item-card upgrade-card" style="--item-color:${d.color}"><span class="item-icon">${d.icon}</span><b>${d.name}</b><span class="item-level">LEVEL ${level} · OWN ${items.length}</span><small>${statsText(d)}</small><button class="combine-button" data-combine-key="${key}" data-level="${level}" ${can ? '' : 'disabled'}>${can ? `Combine into Level ${level + 1}` : 'Need 2 matching'}</button></article>`; }).join('') : '<div class="empty-state"><span>⬆️</span><strong>No gear to upgrade</strong><p>Bring duplicate drops to the forge circle.</p></div>';
  }

  renderIndex(run) {
    if (!run) return;
    if (this.indexTab === 'enemies') {
      const entries = [...ENEMIES, ...Object.values(BOSSES)]; this.nodes['index-grid'].innerHTML = entries.map(enemy => { const seen = run.discovered.has(enemy.key); return `<button class="index-card ${seen ? '' : 'locked'} ${this.selectedIndex === enemy.key ? 'selected' : ''}" data-index-key="${enemy.key}"><span>${seen ? enemy.icon : '❔'}</span><b>${seen ? enemy.name : 'Undiscovered'}</b></button>`; }).join(''); const enemy = entries.find(entry => entry.key === this.selectedIndex); const seen = enemy && run.discovered.has(enemy.key); this.nodes['index-detail'].innerHTML = seen ? `<div class="detail-icon">${enemy.icon}</div><h3>${enemy.name}</h3><p>${enemy.trait}.</p><div class="stat-list"><div><span>Base health</span><b>${enemy.health}</b></div><div><span>Base damage</span><b>${enemy.damage}</b></div><div><span>Speed</span><b>${enemy.speed}</b></div></div>` : '<div class="detail-icon">❔</div><h3>Unknown creature</h3><p>Reach new waves to reveal this entry.</p>';
    } else {
      this.nodes['index-grid'].innerHTML = SETS.map(set => { const seen = (run.progress.unlocked[set.biome] || 0) >= set.unlock; return `<button class="index-card ${seen ? '' : 'locked'} ${this.selectedIndex === set.key ? 'selected' : ''}" data-index-key="${set.key}" style="border-color:${seen ? set.color : '#57736c'}"><span>${seen ? '✦' : '❔'}</span><b>${seen ? `${set.name} Set` : 'Undiscovered'}</b></button>`; }).join(''); const set = SETS.find(entry => entry.key === this.selectedIndex); const seen = set && (run.progress.unlocked[set.biome] || 0) >= set.unlock; this.nodes['index-detail'].innerHTML = seen ? `<div class="detail-icon">✦</div><small>${set.biome.toUpperCase()} · WAVE ${set.unlock}</small><h3>${set.name} Set</h3><div class="set-stripe" style="background:${set.color}"></div><p>Weapons and armor that can be combined at the forge.</p><div class="stat-list"><div><span>Pieces</span><b>${ITEM_TYPES.length}</b></div><div><span>Power</span><b>${set.power}×</b></div></div>` : '<div class="detail-icon">❔</div><h3>Unknown set</h3><p>Push deeper into each biome to discover it.</p>';
    }
  }

  announce(wave, enemy, boss = false, count = 1) { const box = this.nodes.announcement; this.nodes['announcement-kicker'].textContent = boss ? 'FINAL BOSS' : 'GET READY'; this.nodes['announcement-title'].textContent = `Wave ${wave}`; this.nodes['announcement-copy'].textContent = boss ? enemy : `${count} ${count === 1 ? 'animal' : 'animals'} approach`; box.classList.toggle('boss', boss); box.hidden = false; box.style.animation = 'none'; void box.offsetWidth; box.style.animation = ''; clearTimeout(this.announcementTimer); this.announcementTimer = setTimeout(() => { box.hidden = true; }, 2250); }

  render(run, paused, started) {
    this.lastRun = run; const n = this.nodes; const p = run.player; const e = primaryEnemy(run); const hub = run.status === 'hub';
    n['player-health'].textContent = `${p.health} / ${p.maxHealth}`; n['player-fill'].style.width = `${p.health / p.maxHealth * 100}%`; n['player-stats'].textContent = `${p.damage} damage · ${p.defense} shield`;
    n['wave-label'].textContent = hub ? 'SAFE HAVEN' : `${BIOMES.find(b => b.key === run.biome)?.short.toUpperCase()} · WAVE ${run.wave}${run.wave === B.maxWave ? ' · BOSS' : ''}`; n['wave-name'].textContent = hub ? 'Home Camp' : e?.name || 'Wave cleared'; const remaining = run.enemies.filter(enemy => enemy.health > 0).length; n['wave-mode'].textContent = hub ? 'Walk forward to play · left to upgrade' : run.phase === 'intermission' ? 'Next wave incoming' : `${remaining} ${remaining === 1 ? 'animal' : 'animals'} remaining`;
    n['enemy-panel'].hidden = hub || !e; if (e) { n['enemy-name'].textContent = e.name.toUpperCase(); n['enemy-icon'].textContent = ENEMIES.find(x => x.key === e.type)?.icon || BOSSES[run.biome]?.icon || '🐾'; n['enemy-health'].textContent = `${e.health} / ${e.maxHealth}`; n['enemy-fill'].style.width = `${e.health / e.maxHealth * 100}%`; n['enemy-state'].textContent = remaining > 1 ? `${remaining} enemies in this wave` : e.mode === 'windup' ? 'About to strike — move!' : e.mode === 'chase' ? 'Hunting you' : 'Waiting'; }
    const stage = attackStage(p.attack); n['attack-label'].textContent = hub ? 'Safe haven' : { ready: 'Weapon ready', windup: 'Winding up…', active: 'Swing!', recovery: 'Recovering…' }[stage]; n['attack-fill'].style.width = `${p.attack ? Math.min(100, p.attack.elapsed / attackDuration * 100) : 100}%`;
    n['countdown'].hidden = run.phase !== 'intermission'; n['countdown-value'].textContent = Math.max(0, Math.ceil(run.intermission)); const nearDrop = run.pickup.id !== null; n['pickup-prompt'].hidden = !nearDrop; n['pickup-fill'].style.width = `${run.pickup.progress / B.pickup.hold * 100}%`;
    n['return-hub'].hidden = hub;
    const playDistance = Math.hypot(p.x - B.portal.playX, p.z - B.portal.playZ); const upgradeDistance = Math.hypot(p.x - B.portal.upgradeX, p.z - B.portal.upgradeZ); n['hub-prompt'].hidden = !hub || Math.min(playDistance, upgradeDistance) > 2.3; const nearPlay = playDistance < upgradeDistance; n['hub-prompt-title'].textContent = nearPlay ? 'Play Portal' : 'Upgrade Circle'; n['hub-prompt-copy'].textContent = nearPlay ? 'Step inside to choose a biome and checkpoint' : 'Step inside to combine matching gear';
    const newLoot = run.inventory.filter(item => item.new).length; n['loot-badge'].hidden = newLoot === 0; n['loot-badge'].textContent = newLoot; if (this.activeMenu === 'inventory') run.inventory.forEach(item => { item.new = false; });
    n.overlay.hidden = this.activeMenu || (started && !paused); if (started && paused && !this.activeMenu) { n['overlay-kicker'].textContent = 'ADVENTURE PAUSED'; n['overlay-title'].innerHTML = 'Mossvale<br><em>is waiting.</em>'; n['overlay-copy'].textContent = 'Your progress and equipment are safe.'; n.play.textContent = 'Continue →'; }
  }
  destroy() { clearTimeout(this.announcementTimer); this.nodes['return-hub'].removeEventListener('click', this.onReturn); }
}
