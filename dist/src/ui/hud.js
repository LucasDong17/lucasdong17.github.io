import { BALANCE as B, BIOMES, EGGS, ENEMIES, BOSSES, TOWER, TOWER_BOSSES, RARITIES, SETS, ITEM_TYPES, isBossWave, itemDefinition, itemSellValue, petDefinition, petSellValue } from '../data/balance.js';
import { attackStage, attackDuration } from '../systems/simulation.js';

const byId = id => document.getElementById(id);
const statsText = d => d.category === 'tools' ? `+${d.damage} damage` : `+${d.defense} shield · +${d.health} health`;
const eggArtwork = key => `<div class="egg-art ${key}" aria-hidden="true"><span></span><i></i></div>`;
const petPortrait = definition => {
  const winged = ['owl', 'griffin', 'drake', 'phoenix'].includes(definition.kind);
  const longEars = ['hare', 'owl'].includes(definition.kind);
  const armored = ['golem', 'knight'].includes(definition.kind);
  return `<svg class="pet-portrait" viewBox="0 0 100 84" aria-hidden="true" focusable="false">
    ${winged ? `<path d="M31 47 7 28l5 32 22 8M69 47l24-19-5 32-22 8" fill="${definition.accent}"/>` : ''}
    <ellipse cx="50" cy="55" rx="27" ry="19" fill="${definition.color}"/>
    <circle cx="50" cy="32" r="21" fill="${definition.color}"/>
    ${longEars ? `<path d="M36 18 32 1q15 7 13 23M64 18 68 1Q53 8 55 24" fill="${definition.accent}"/>` : `<path d="m34 20-12-10 2 20m42-10 12-10-2 20" fill="${definition.accent}"/>`}
    ${armored ? `<path d="M31 31q19-24 38 0v7H31Z" fill="${definition.accent}"/><path d="M43 30h14v5H43z" fill="#263a3b"/>` : ''}
    ${definition.kind === 'unicorn' ? `<path d="m50 14 7-18 5 22" fill="${definition.accent}"/>` : ''}
    ${definition.kind === 'phoenix' ? `<path d="m32 19 18-18 18 18-18-7Z" fill="${definition.accent}"/>` : ''}
    ${definition.kind === 'basilisk' ? `<path d="m29 20 9-15 7 14L52 3l8 16 10-13 2 20" fill="${definition.accent}"/>` : ''}
    <circle cx="42" cy="32" r="3.4" fill="#182b2d"/><circle cx="58" cy="32" r="3.4" fill="#182b2d"/>
    <path d="m46 42 4 3 4-3" fill="none" stroke="#182b2d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
};

export class Hud {
  constructor(handlers = {}) {
    this.handlers = handlers; this.activeMenu = null; this.inventoryTab = 'armor'; this.indexTab = 'enemies'; this.selectedIndex = 'cow'; this.selectedPetId = null; this.sellCategory = 'armor';
    this.nodes = Object.fromEntries(['player-health','player-fill','player-stats','enemy-panel','enemy-list','enemy-state','wave-label','wave-name','wave-mode','coin-count','attack-label','attack-fill','pickup-prompt','pickup-fill','touch-pickup','countdown','countdown-value','overlay','overlay-title','overlay-copy','overlay-kicker','play','return-hub','menu-backdrop','inventory-menu','index-menu','play-menu','tower-menu','upgrade-menu','pet-shop-menu','pets-menu','sell-menu','inventory-grid','inventory-count','equip-best','index-grid','index-detail','biome-grid','tower-panel','upgrade-all','upgrade-grid','egg-grid','hatch-result','pet-grid','pet-detail','pet-count','equipped-pet-count','sell-title','sell-help','sell-all','sell-grid','loot-badge','pet-badge','announcement','announcement-kicker','announcement-title','announcement-copy','hub-prompt','hub-prompt-title','hub-prompt-copy'].map(id => [id, byId(id)]));
    byId('open-inventory').addEventListener('click', () => this.openMenu('inventory'));
    byId('open-index').addEventListener('click', () => this.openMenu('index'));
    byId('open-pets').addEventListener('click', () => this.openMenu('pets'));
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
    this.nodes['tower-panel'].addEventListener('click', event => { const button = event.target.closest('[data-biome][data-wave]:not(:disabled)'); if (button) { this.closeMenu(false); this.handlers.onStart?.('tower', Number(button.dataset.wave)); } });
    this.nodes['upgrade-grid'].addEventListener('click', event => { const button = event.target.closest('[data-combine-key]'); if (button && !button.disabled) { this.handlers.onCombine?.(button.dataset.combineKey, Number(button.dataset.level)); this.renderUpgrades(this.lastRun); } });
    this.nodes['upgrade-all'].addEventListener('click', () => { if (this.handlers.onUpgradeAll?.()) this.renderUpgrades(this.lastRun); });
    this.nodes['egg-grid'].addEventListener('click', event => { const button = event.target.closest('[data-egg-key]'); if (!button || button.disabled) return; const pet = this.handlers.onHatch?.(button.dataset.eggKey); this.renderPetShop(this.lastRun); this.nodes['coin-count'].textContent = this.lastRun.coins.toLocaleString(); if (pet) { const d = petDefinition(pet.key); this.nodes['hatch-result'].hidden = false; this.nodes['hatch-result'].innerHTML = `<div class="hatch-portrait">${petPortrait(d)}</div><div><small>${RARITIES[d.rarity].name.toUpperCase()} HATCH!</small><strong>${d.name}</strong><p>${d.damage} damage every second</p><span class="dismiss-hint">Tap to continue</span></div>`; } });
    this.nodes['pet-grid'].addEventListener('click', event => { const card = event.target.closest('[data-pet-id]'); if (card) { this.selectedPetId = Number(card.dataset.petId); this.renderPets(this.lastRun); } });
    this.nodes['pet-detail'].addEventListener('click', event => { const button = event.target.closest('[data-toggle-pet]'); if (button) { this.handlers.onTogglePet?.(Number(button.dataset.togglePet)); this.renderPets(this.lastRun); } });
    this.nodes['hatch-result'].addEventListener('click', () => { this.nodes['hatch-result'].hidden = true; });
    this.nodes['sell-grid'].addEventListener('click', event => { const button = event.target.closest('[data-sell-id]'); if (!button) return; const id = Number(button.dataset.sellId); const value = this.sellCategory === 'pets' ? this.handlers.onSellPet?.(id) : this.handlers.onSellItem?.(id, this.sellCategory); if (value) { this.renderSell(this.lastRun); this.nodes['coin-count'].textContent = this.lastRun.coins.toLocaleString(); } });
    this.nodes['sell-all'].addEventListener('click', () => { const value = this.handlers.onSellAll?.(this.sellCategory); if (value) { this.renderSell(this.lastRun); this.nodes['coin-count'].textContent = this.lastRun.coins.toLocaleString(); } });
  }

  openMenu(name) { const sell = name.startsWith('sell-'); this.activeMenu = name; if (sell) this.sellCategory = name.slice(5); this.nodes['menu-backdrop'].hidden = false; for (const menu of ['inventory','index','play','tower','upgrade','pet-shop','pets','sell']) this.nodes[`${menu}-menu`].hidden = menu !== (sell ? 'sell' : name); this.handlers.onMenu?.(true); if (name === 'inventory') this.renderInventory(this.lastRun); if (name === 'index') this.renderIndex(this.lastRun); if (name === 'play') this.renderPlay(this.lastRun); if (name === 'tower') this.renderTower(this.lastRun); if (name === 'upgrade') this.renderUpgrades(this.lastRun); if (name === 'pet-shop') { this.nodes['hatch-result'].hidden = true; this.renderPetShop(this.lastRun); } if (name === 'pets') { this.lastRun?.pets.forEach(pet => { pet.new = false; }); this.renderPets(this.lastRun); } if (sell) this.renderSell(this.lastRun); this.nodes[`${sell ? 'sell' : name}-menu`].querySelector('.close-menu').focus(); }
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
    const unlockHints = { frost: 'DEFEAT THE MEADOW WAVE 50 BOSS', jungle: 'DEFEAT THE TUNDRA WAVE 50 BOSS', ember: 'DEFEAT THE JUNGLE WAVE 50 BOSS' };
    const icons = { meadow: '🌿', frost: '❄️', jungle: '🌴', ember: '🌋' };
    this.nodes['biome-grid'].innerHTML = BIOMES.map(biome => { const unlocked = run.progress.unlocked[biome.key] || 0; const highest = Math.min(unlocked, run.progress.highest?.[biome.key] || unlocked); const available = unlocked > 0; const status = run.progress.completed[biome.key] ? 'COMPLETED' : available ? `HIGHEST PLAYED · WAVE ${highest}` : unlockHints[biome.key]; const startHere = available ? `<button class="start-here" data-biome="${biome.key}" data-wave="${highest}"><span>START HERE</span><b>Wave ${highest}</b><small>Your highest adventure</small></button>` : ''; const buttons = checkpoints.map(wave => `<button class="checkpoint ${wave === 50 ? 'boss' : ''}" data-biome="${biome.key}" data-wave="${wave}" ${unlocked < wave ? 'disabled' : ''}>${wave === 1 ? 'Start' : `Wave ${wave}`}${wave === 50 ? ' 👑' : ''}</button>`).join(''); return `<section class="biome-card ${available ? '' : 'locked'}"><div class="biome-heading"><span>${icons[biome.key]}</span><div><h3>${biome.name}</h3><p>${biome.description}</p></div></div><span class="biome-status">${status}</span>${startHere}<small class="checkpoint-label">OR CHOOSE A CHECKPOINT</small><div class="checkpoint-grid">${buttons}</div></section>`; }).join('');
  }

  renderTower(run) {
    if (!run) return;
    const unlocked = run.progress.unlocked.tower || 1; const highest = Math.min(unlocked, run.progress.highest.tower || unlocked); const checkpoints = [25, 50, 75, 100];
    const buttons = checkpoints.map(wave => `<button class="checkpoint boss" data-biome="tower" data-wave="${wave}" ${unlocked < wave ? 'disabled' : ''}>Start Wave ${wave}<small>${wave === 100 ? 'Final floor' : 'Boss floor'}</small></button>`).join('');
    this.nodes['tower-panel'].innerHTML = `<section class="tower-hero"><div class="tower-emblem">♜</div><small>100-FLOOR SURVIVAL</small><h3>${TOWER.name}</h3><p>${TOWER.description} Drops can come from every biome, even locked ones. Every floor raises the loot power band, so weak early sets stop dropping as you climb. Rare Runebound, Voidglass, Celestial, and Eternity armor joins at higher tiers.</p><span class="biome-status">${run.progress.completed.tower ? 'TOWER CONQUERED · REPLAY ANY CHECKPOINT' : `HIGHEST PLAYED · WAVE ${highest}`}</span><button class="start-here tower-start" data-biome="tower" data-wave="${highest}"><span>START FROM WHERE YOU LEFT OFF</span><b>Wave ${highest}</b><small>Saved automatically</small></button><span class="checkpoint-label">BOSS CHECKPOINTS</span><div class="checkpoint-grid tower-checkpoints">${buttons}</div></section>`;
  }

  renderUpgrades(run) {
    if (!run) return; const groups = new Map(); for (const item of run.inventory) { const token = `${item.key}|${item.level || 1}`; if (!groups.has(token)) groups.set(token, []); groups.get(token).push(item); }
    const counts = new Map(); for (const item of run.inventory) { if (!counts.has(item.key)) counts.set(item.key, new Map()); const levels = counts.get(item.key); const level = item.level || 1; levels.set(level, (levels.get(level) || 0) + 1); }
    let possible = 0; for (const levels of counts.values()) { const max = Math.max(...levels.keys()); for (let level = 1; level <= max || (levels.get(level) || 0) >= 2; level++) { const count = levels.get(level) || 0; const merges = Math.floor(count / 2); possible += merges; if (merges) levels.set(level + 1, (levels.get(level + 1) || 0) + merges); } }
    this.nodes['upgrade-all'].disabled = possible === 0; this.nodes['upgrade-all'].textContent = possible ? `Upgrade All · ${possible} ${possible === 1 ? 'merge' : 'merges'}` : 'Everything Maxed';
    this.nodes['upgrade-grid'].innerHTML = groups.size ? [...groups.entries()].map(([token, items]) => { const [key, levelText] = token.split('|'); const level = Number(levelText); const d = itemDefinition(key, level); const can = items.length >= 2; return `<article class="item-card upgrade-card" style="--item-color:${d.color}"><span class="item-icon">${d.icon}</span><b>${d.name}</b><span class="item-level">LEVEL ${level} · OWN ${items.length}</span><small>${statsText(d)}</small><button class="combine-button" data-combine-key="${key}" data-level="${level}" ${can ? '' : 'disabled'}>${can ? `Combine into Level ${level + 1}` : 'Need 2 matching'}</button></article>`; }).join('') : '<div class="empty-state"><span>⬆️</span><strong>No gear to upgrade</strong><p>Bring duplicate drops to the forge circle.</p></div>';
  }

  renderPetShop(run) {
    if (!run) return;
    const unlockNames = { frost: 'Frostfang', jungle: 'Sunspire', ember: 'Embercrag', tower: 'the Endless Tower' };
    this.nodes['egg-grid'].innerHTML = EGGS.map(egg => { const unlocked = (run.progress.unlocked[egg.biome] || 0) > 0; const affordable = run.coins >= egg.cost; const odds = Object.entries(egg.odds).map(([rarity, chance]) => `<span style="color:${RARITIES[rarity].color}">${RARITIES[rarity].name} ${chance}%</span>`).join(''); return `<article class="egg-card ${unlocked ? '' : 'locked'}">${eggArtwork(egg.key)}<small>${egg.biome.toUpperCase()} EGG</small><h3>${egg.name}</h3><p>${egg.description}</p><div class="egg-odds">${odds}</div><button data-egg-key="${egg.key}" ${unlocked && affordable ? '' : 'disabled'}>${unlocked ? affordable ? `Hatch · ${egg.cost.toLocaleString()} coins` : `Need ${(egg.cost - run.coins).toLocaleString()} more coins` : `Unlock ${unlockNames[egg.biome]} first`}</button></article>`; }).join('');
  }

  renderPets(run) {
    if (!run) return; const equipped = new Set(run.equippedPetIds); if (!run.pets.some(pet => pet.id === this.selectedPetId)) this.selectedPetId = run.pets[0]?.id ?? null;
    this.nodes['pet-count'].textContent = `${run.pets.length} ${run.pets.length === 1 ? 'pet' : 'pets'} collected`; this.nodes['equipped-pet-count'].textContent = `${equipped.size} / 3 EQUIPPED`;
    this.nodes['pet-grid'].innerHTML = run.pets.length ? run.pets.map(pet => { const d = petDefinition(pet.key); const rarity = RARITIES[d.rarity]; return `<button class="pet-card ${equipped.has(pet.id) ? 'equipped' : ''} ${this.selectedPetId === pet.id ? 'selected' : ''}" data-pet-id="${pet.id}" style="--rarity:${rarity.color}">${petPortrait(d)}<b>${d.name}</b><small>${rarity.name}</small><em>${d.damage} DMG</em></button>`; }).join('') : `<div class="empty-state">${eggArtwork('meadow')}<strong>No pets yet</strong><p>Visit the hatchery circle in the safe haven.</p></div>`;
    const pet = run.pets.find(entry => entry.id === this.selectedPetId); if (!pet) { this.nodes['pet-detail'].innerHTML = '<div class="detail-icon pet-team-mark">✦</div><h3>Your pet team</h3><p>Hatch companions, then equip up to three.</p>'; return; }
    const d = petDefinition(pet.key); const rarity = RARITIES[d.rarity]; const isEquipped = equipped.has(pet.id); const full = equipped.size >= 3;
    this.nodes['pet-detail'].innerHTML = `${petPortrait(d)}<small style="color:${rarity.color}">${rarity.name.toUpperCase()} · ${d.egg.toUpperCase()}</small><h3>${d.name}</h3><div class="set-stripe" style="background:${rarity.color}"></div><p>A blocky battle companion that follows you and attacks the nearest enemy once every second.</p><div class="stat-list"><div><span>Damage</span><b>${d.damage}</b></div><div><span>Attack speed</span><b>1 / second</b></div></div><button class="pet-equip" data-toggle-pet="${pet.id}" ${!isEquipped && full ? 'disabled' : ''}>${isEquipped ? 'Unequip Pet' : full ? '3 Pet Limit Reached' : 'Equip Pet'}</button>`;
  }

  renderSell(run) {
    if (!run) return;
    const labels = { armor: ['Sell Armor', 'Armor'], tools: ['Sell Weapons', 'weapon'], pets: ['Sell Pets', 'pet'] };
    const [title, singular] = labels[this.sellCategory]; this.nodes['sell-title'].textContent = title;
    this.nodes['sell-help'].textContent = `Select an unequipped ${singular} to sell. Equipped ${singular}s are protected.`;
    if (this.sellCategory === 'pets') {
      const equipped = new Set(run.equippedPetIds); const sellable = run.pets.filter(pet => !equipped.has(pet.id)); const total = sellable.reduce((sum, pet) => sum + petSellValue(pet), 0);
      this.nodes['sell-all'].disabled = sellable.length === 0; this.nodes['sell-all'].textContent = sellable.length ? `Sell All Unequipped (${sellable.length}) · 🪙 ${total.toLocaleString()}` : 'No Unequipped Pets to Sell';
      this.nodes['sell-grid'].innerHTML = run.pets.length ? run.pets.map(pet => { const d = petDefinition(pet.key); const rarity = RARITIES[d.rarity]; const value = petSellValue(pet); const isEquipped = equipped.has(pet.id); return `<button class="item-card sell-card ${isEquipped ? 'equipped' : ''}" data-sell-id="${pet.id}" style="--item-color:${rarity.color}" ${isEquipped ? 'disabled aria-label="Equipped pet; protected from selling"' : ''}>${petPortrait(d)}<b>${d.name}</b><small>${rarity.name} companion</small><strong class="sell-price">${isEquipped ? 'Protected' : `🪙 ${value.toLocaleString()}`}</strong></button>`; }).join('') : '<div class="empty-state"><span>🐾</span><strong>No pets to sell</strong><p>Hatch pets before visiting this circle.</p></div>';
      return;
    }
    const items = run.inventory.map(item => ({ ...item, definition: itemDefinition(item.key, item.level) })).filter(item => item.definition?.category === this.sellCategory);
    const equipped = new Set(Object.values(run.equipped)); const sellable = items.filter(item => !equipped.has(item.id)); const total = sellable.reduce((sum, item) => sum + itemSellValue(item), 0);
    this.nodes['sell-all'].disabled = sellable.length === 0; this.nodes['sell-all'].textContent = sellable.length ? `Sell All Unequipped (${sellable.length}) · 🪙 ${total.toLocaleString()}` : `No Unequipped ${title.slice(5)} to Sell`;
    this.nodes['sell-grid'].innerHTML = items.length ? items.map(item => { const d = item.definition; const value = itemSellValue(item); const isEquipped = equipped.has(item.id); return `<button class="item-card sell-card ${isEquipped ? 'equipped' : ''}" data-sell-id="${item.id}" style="--item-color:${d.color}" ${isEquipped ? 'disabled aria-label="Equipped item; protected from selling"' : ''}><span class="item-icon">${d.icon}</span><b>${d.name}</b><span class="item-level">LEVEL ${d.level}</span><small>${statsText(d)}</small><strong class="sell-price">${isEquipped ? 'Protected' : `🪙 ${value.toLocaleString()}`}</strong></button>`; }).join('') : `<div class="empty-state"><span>🪙</span><strong>No ${this.sellCategory} to sell</strong><p>Collect drops, then return to this circle.</p></div>`;
  }

  renderIndex(run) {
    if (!run) return;
    if (this.indexTab === 'enemies') {
      const entries = [...ENEMIES, ...Object.values(BOSSES), ...Object.values(TOWER_BOSSES)]; this.nodes['index-grid'].innerHTML = entries.map(enemy => { const seen = run.discovered.has(enemy.key); return `<button class="index-card ${seen ? '' : 'locked'} ${this.selectedIndex === enemy.key ? 'selected' : ''}" data-index-key="${enemy.key}"><span>${seen ? enemy.icon : '❔'}</span><b>${seen ? enemy.name : 'Undiscovered'}</b></button>`; }).join(''); const enemy = entries.find(entry => entry.key === this.selectedIndex); const seen = enemy && run.discovered.has(enemy.key); this.nodes['index-detail'].innerHTML = seen ? `<div class="detail-icon">${enemy.icon}</div><h3>${enemy.name}</h3><p>${enemy.trait}.</p><div class="stat-list"><div><span>Base health</span><b>${enemy.health}</b></div><div><span>Damage</span><b>${enemy.damage}</b></div><div><span>Move speed</span><b>${enemy.speed}</b></div><div><span>Attack style</span><b>${enemy.attackType === 'ranged' ? 'Ranged' : 'Melee'}</b></div><div><span>Attack range</span><b>${enemy.range.toFixed(1)}m</b></div><div><span>Attack speed</span><b>${(1 / enemy.cooldown).toFixed(2)}/s</b></div>${enemy.projectileSpeed ? `<div><span>Projectile speed</span><b>${enemy.projectileSpeed}m/s</b></div>` : ''}</div>` : '<div class="detail-icon">❔</div><h3>Unknown creature</h3><p>Defeat this creature once to reveal all of its attributes.</p>';
    } else {
      this.nodes['index-grid'].innerHTML = SETS.map(set => { const seen = (run.progress.unlocked[set.biome] || 0) >= set.unlock; return `<button class="index-card ${seen ? '' : 'locked'} ${this.selectedIndex === set.key ? 'selected' : ''}" data-index-key="${set.key}" style="border-color:${seen ? set.color : '#57736c'}"><span>${seen ? '✦' : '❔'}</span><b>${seen ? `${set.name} Set` : 'Undiscovered'}</b></button>`; }).join(''); const set = SETS.find(entry => entry.key === this.selectedIndex); const seen = set && (run.progress.unlocked[set.biome] || 0) >= set.unlock; this.nodes['index-detail'].innerHTML = seen ? `<div class="detail-icon">✦</div><small>${set.biome.toUpperCase()} · WAVE ${set.unlock}</small><h3>${set.name} Set</h3><div class="set-stripe" style="background:${set.color}"></div><p>Weapons and armor that can be combined at the forge.</p><div class="stat-list"><div><span>Pieces</span><b>${ITEM_TYPES.length}</b></div><div><span>Power</span><b>${set.power}×</b></div></div>` : '<div class="detail-icon">❔</div><h3>Unknown set</h3><p>Push deeper into each biome to discover it.</p>';
    }
  }

  announce(wave, enemy, boss = false, count = 1) { const box = this.nodes.announcement; this.nodes['announcement-kicker'].textContent = boss ? 'FINAL BOSS' : 'GET READY'; this.nodes['announcement-title'].textContent = `Wave ${wave}`; this.nodes['announcement-copy'].textContent = boss ? enemy : `${count} ${count === 1 ? 'animal' : 'animals'} approach`; box.classList.toggle('boss', boss); box.hidden = false; box.style.animation = 'none'; void box.offsetWidth; box.style.animation = ''; clearTimeout(this.announcementTimer); this.announcementTimer = setTimeout(() => { box.hidden = true; }, 2250); }

  render(run, paused, started) {
    this.lastRun = run; const n = this.nodes; const p = run.player; const living = run.enemies.filter(enemy => enemy.health > 0); const e = living[0] || null; const hub = run.status === 'hub';
    n['player-health'].textContent = `${p.health} / ${p.maxHealth}`; n['player-fill'].style.width = `${p.health / p.maxHealth * 100}%`; n['player-stats'].textContent = `${p.damage} damage · ${p.defense} shield`;
    n['coin-count'].textContent = run.coins.toLocaleString();
    const biome = run.biome === 'tower' ? TOWER : BIOMES.find(entry => entry.key === run.biome); n['wave-label'].textContent = hub ? 'SAFE HAVEN' : `${biome?.short.toUpperCase()} · WAVE ${run.wave}${isBossWave(run.wave, run.biome) ? ' · BOSS' : ''}`; n['wave-name'].textContent = hub ? 'Home Camp' : e?.name || 'Wave cleared'; const remaining = run.enemies.filter(enemy => enemy.health > 0).length; n['wave-mode'].textContent = hub ? 'Forward: play · behind: endless tower' : run.phase === 'intermission' ? 'Next wave incoming' : `${remaining} ${remaining === 1 ? 'enemy' : 'enemies'} remaining`;
    n['enemy-panel'].hidden = hub || !e; if (e) { n['enemy-state'].textContent = `${remaining} remaining`; n['enemy-list'].innerHTML = living.map(enemy => { const definition = ENEMIES.find(x => x.key === enemy.type) || Object.values(BOSSES).find(x => x.key === enemy.type) || Object.values(TOWER_BOSSES).find(x => x.key === enemy.type); const warning = enemy.mode === 'windup' ? ' warning' : ''; return `<article class="enemy-row${warning}"><span>${definition?.icon || '🐾'}</span><div><b>${enemy.name}</b><div class="enemy-row-meter"><i style="width:${enemy.health / enemy.maxHealth * 100}%"></i></div></div><small>${enemy.health}/${enemy.maxHealth}</small></article>`; }).join(''); }
    const stage = attackStage(p.attack); n['attack-label'].textContent = hub ? 'Safe haven' : { ready: 'Weapon ready', windup: 'Winding up…', active: 'Swing!', recovery: 'Recovering…' }[stage]; n['attack-fill'].style.width = `${p.attack ? Math.min(100, p.attack.elapsed / attackDuration * 100) : 100}%`;
    n['countdown'].hidden = run.phase !== 'intermission'; n['countdown-value'].textContent = Math.max(0, Math.ceil(run.intermission)); const nearDrop = run.pickup.id !== null; n['pickup-prompt'].hidden = !nearDrop; n['pickup-fill'].style.width = `${run.pickup.progress / B.pickup.hold * 100}%`; n['touch-pickup'].hidden = !nearDrop; n['touch-pickup'].style.setProperty('--pickup-progress', `${Math.min(100, run.pickup.progress / B.pickup.hold * 100)}%`);
    n['return-hub'].hidden = hub;
    const portals = [{ x: B.portal.playX, z: B.portal.playZ, title: 'Play Portal', copy: 'Choose a biome and checkpoint' }, { x: B.portal.towerX, z: B.portal.towerZ, title: 'Endless Tower', copy: 'Climb 100 waves for rare cross-biome loot' }, { x: B.portal.upgradeX, z: B.portal.upgradeZ, title: 'Upgrade Circle', copy: 'Combine matching gear' }, { x: B.portal.petsX, z: B.portal.petsZ, title: 'Pet Hatchery', copy: 'Hatch Meadow and Frostfang eggs' }, { x: B.portal.sellPetsX, z: B.portal.sellPetsZ, title: 'Sell Pets', copy: 'Trade companions for gold' }, { x: B.portal.sellArmorX, z: B.portal.sellArmorZ, title: 'Sell Armor', copy: 'Trade armor for gold' }, { x: B.portal.sellWeaponsX, z: B.portal.sellWeaponsZ, title: 'Sell Weapons', copy: 'Trade weapons for gold' }].map(portal => ({ ...portal, distance: Math.hypot(p.x - portal.x, p.z - portal.z) })).sort((a, b) => a.distance - b.distance); n['hub-prompt'].hidden = !hub || portals[0].distance > 2.3; n['hub-prompt-title'].textContent = portals[0].title; n['hub-prompt-copy'].textContent = portals[0].copy;
    const newLoot = run.inventory.filter(item => item.new).length; n['loot-badge'].hidden = newLoot === 0; n['loot-badge'].textContent = newLoot; if (this.activeMenu === 'inventory') run.inventory.forEach(item => { item.new = false; });
    const newPets = run.pets.filter(pet => pet.new).length; n['pet-badge'].hidden = newPets === 0; n['pet-badge'].textContent = newPets;
    n.overlay.hidden = this.activeMenu || (started && !paused); if (started && paused && !this.activeMenu) { n['overlay-kicker'].textContent = 'ADVENTURE PAUSED'; n['overlay-title'].innerHTML = 'Mossvale<br><em>is waiting.</em>'; n['overlay-copy'].textContent = 'Your progress and equipment are safe.'; n.play.textContent = 'Continue →'; }
  }
  destroy() { clearTimeout(this.announcementTimer); this.nodes['return-hub'].removeEventListener('click', this.onReturn); }
}
