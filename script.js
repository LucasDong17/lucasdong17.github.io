const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const TAU = Math.PI * 2;
const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 }
];

const palette = {
  bg: "#090b10",
  panel: "#151b25",
  text: "#f6f9ff",
  muted: "#aeb9c8",
  yellow: "#ffd84d",
  cyan: "#54cfff",
  green: "#70e28a",
  red: "#ff5b6c",
  violet: "#b785ff",
  orange: "#ff9d4d",
  pink: "#ff76b7",
  blockBlue: "#5a8dff",
  blockMint: "#61e6b2",
  ink: "#0b0e14"
};

const screens = {
  home: document.getElementById("homeScreen"),
  game: document.getElementById("gameScreen")
};

const ui = {
  globalStatus: document.getElementById("globalStatus"),
  walletPoints: document.getElementById("walletPoints"),
  shopPoints: document.getElementById("shopPoints"),
  walletGameText: document.getElementById("walletGameText"),
  shopGrid: document.getElementById("shopGrid"),
  shopStatus: document.getElementById("shopStatus"),
  gameTitle: document.getElementById("gameTitle"),
  gameLabel: document.getElementById("gameLabel"),
  scoreText: document.getElementById("scoreText"),
  bestText: document.getElementById("bestText"),
  roundText: document.getElementById("roundText"),
  overlay: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayText: document.getElementById("overlayText"),
  startBtn: document.getElementById("startBtn"),
  restartBtn: document.getElementById("restartBtn"),
  controlsText: document.getElementById("controlsText")
};

const homeBest = {
  pac: document.getElementById("pacBestHome"),
  road: document.getElementById("roadBestHome"),
  zombie: document.getElementById("zombieBestHome"),
  block: document.getElementById("blockBestHome")
};

const gameInfo = {
  pac: {
    title: "Pac-Man",
    label: "Maze Chase",
    controls: "Arrow keys or WASD to move. Power pellets turn ghosts blue for a few seconds.",
    bestKey: "pixel-party-pac-best"
  },
  road: {
    title: "Crossy Roads",
    label: "Traffic Hop",
    controls: "Arrow keys or WASD to hop. Reach the top, grab coins, and dodge traffic.",
    bestKey: "pixel-party-road-best"
  },
  zombie: {
    title: "Zombie Zone",
    label: "Survival",
    controls: "WASD or arrow keys to move. Click/tap and hold to shoot. Press E for a grenade. Runners flank, brutes soak shots.",
    bestKey: "pixel-party-zombie-best"
  },
  block: {
    title: "Block Blast",
    label: "Shape Stack",
    controls: "Click/tap a tray shape, then click/tap a board cell to place it. Press V to rotate. Shop powers: R reroll, C clear a block, X prism bomb, Q color shift.",
    bestKey: "pixel-party-block-best"
  }
};

const economyKey = "pixel-party-economy";
const shopCatalog = {
  pac: [
    { id: "extraLife", title: "Extra Life", description: "Revive once after a ghost catches you.", cost: 8, icon: "extra-life", kind: "consumable" },
    { id: "powerDuration", title: "Power Core", description: "Power pellets last 3 seconds longer per level.", cost: 12, icon: "power-duration", kind: "upgrade" },
    { id: "dotMagnet", title: "Dot Magnet", description: "Pull nearby orbs into Pac Man as you move.", cost: 16, icon: "dot-magnet", kind: "upgrade" }
  ],
  road: [
    { id: "extraLife", title: "Extra Life", description: "Recover once after a traffic hit.", cost: 8, icon: "road-life", kind: "consumable" },
    { id: "trafficSlow", title: "Traffic Brake", description: "Slow every car by 12% per upgrade level.", cost: 14, icon: "traffic-slow", kind: "upgrade" },
    { id: "coinMagnet", title: "Coin Magnet", description: "Collect road coins from farther away.", cost: 12, icon: "coin-magnet", kind: "upgrade" }
  ],
  zombie: [
    { id: "extraLife", title: "Extra Life", description: "Stand back up once after the swarm drops you.", cost: 10, icon: "zombie-life", kind: "consumable" },
    { id: "pulseRifle", title: "Pulse Rifle", description: "A faster gun with stronger energy shots.", cost: 24, icon: "pulse-rifle", kind: "upgrade" },
    { id: "grenadePack", title: "Grenade Pack", description: "Adds 3 grenades. Aim, then press E for splash damage.", cost: 14, icon: "grenade-pack", kind: "consumable", grant: 3 },
    { id: "damageMod", title: "Damage Mod", description: "Every upgrade adds damage to bullets and grenades.", cost: 20, icon: "damage-mod", kind: "upgrade" }
  ],
  block: [
    { id: "reroller", title: "Block Reroller", description: "Press R to trash your whole tray and deal three fresh shapes.", cost: 12, icon: "block-reroller", kind: "consumable", grant: 1, key: "R" },
    { id: "clearBlock", title: "Clear a Block", description: "Hover a filled cell and press C to delete it without breaking your combo.", cost: 10, icon: "clear-block", kind: "consumable", grant: 1, key: "C" },
    { id: "prismBomb", title: "Prism Bomb", description: "Press X to wipe a 3×3 blast around your hovered cell.", cost: 18, icon: "prism-bomb", kind: "consumable", grant: 1, key: "X" },
    { id: "colorShift", title: "Color Shift", description: "Press Q to remix your selected shape into a lucky wild color.", cost: 14, icon: "color-shift", kind: "consumable", grant: 1, key: "Q" }
  ]
};

function defaultInventory() {
  return Object.fromEntries(Object.entries(shopCatalog).map(([game, items]) => [
    game,
    Object.fromEntries(items.map((item) => [item.id, 0]))
  ]));
}

function loadEconomy() {
  const fresh = { points: 0, inventory: defaultInventory() };
  try {
    const stored = JSON.parse(localStorage.getItem(economyKey) || "null");
    if (!stored || typeof stored !== "object") return fresh;
    fresh.points = Math.max(0, Number(stored.points) || 0);
    Object.keys(fresh.inventory).forEach((game) => {
      Object.keys(fresh.inventory[game]).forEach((itemId) => {
        fresh.inventory[game][itemId] = Math.max(0, Number(stored.inventory?.[game]?.[itemId]) || 0);
      });
    });
  } catch (error) {
    return fresh;
  }
  return fresh;
}

let economy = loadEconomy();
let activeShopTab = "pac";

function persistEconomy() {
  localStorage.setItem(economyKey, JSON.stringify(economy));
  refreshWallet();
}

function inventoryCount(game, itemId) {
  return Number(economy.inventory?.[game]?.[itemId] || 0);
}

function consumeShopItem(game, itemId, amount = 1) {
  if (inventoryCount(game, itemId) < amount) return false;
  economy.inventory[game][itemId] -= amount;
  persistEconomy();
  renderShop();
  return true;
}

function awardPoints(amount) {
  economy.points += amount;
  persistEconomy();
}

function refreshWallet() {
  const points = Math.floor(economy.points);
  ui.walletPoints.textContent = points;
  ui.shopPoints.textContent = points;
  ui.walletGameText.textContent = points;
}

function shopItem(game, itemId) {
  return shopCatalog[game].find((item) => item.id === itemId);
}

function renderShop() {
  const items = shopCatalog[activeShopTab];
  document.querySelectorAll("[data-shop-tab]").forEach((tab) => {
    const active = tab.dataset.shopTab === activeShopTab;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  ui.shopGrid.innerHTML = items.map((item) => {
    const owned = inventoryCount(activeShopTab, item.id);
    const ownedLabel = item.kind === "upgrade" ? `Level ${owned}` : `Owned ${owned}`;
    const grantLabel = item.grant ? ` +${item.grant}` : "";
    return `<article class="shop-item">
      <span class="shop-art ${item.icon}" aria-hidden="true"></span>
      <div class="shop-item-copy">
        <h3>${item.title}</h3>
        <p>${item.description}${item.key ? ` <span class="key-hint">${item.key}</span>` : ""}</p>
        <div class="shop-item-footer">
          <span class="shop-owned">${ownedLabel}${grantLabel}</span>
          <button class="shop-buy" type="button" data-shop-buy="${item.id}"><span class="coin-icon" aria-hidden="true"></span>${item.cost}</button>
        </div>
      </div>
    </article>`;
  }).join("");
  refreshWallet();
}

function setShopStatus(message, tone = "") {
  ui.shopStatus.textContent = message;
  ui.shopStatus.dataset.tone = tone;
}

function buyShopItem(game, itemId) {
  const item = shopItem(game, itemId);
  if (!item) return;
  if (economy.points < item.cost) {
    setShopStatus(`You need ${item.cost - economy.points} more point${item.cost - economy.points === 1 ? "" : "s"} for ${item.title}.`, "warn");
    return;
  }
  economy.points -= item.cost;
  economy.inventory[game][item.id] += item.grant || 1;
  persistEconomy();
  renderShop();
  setShopStatus(`${item.title} added to your ${gameInfo[game].title} loadout.`, "good");
}

let currentGame = null;
let animationId = 0;
let lastTime = 0;
let keys = {};
let pointer = { x: WIDTH / 2, y: HEIGHT / 2, down: false };
let state = {};

function bestFor(id) {
  return Number(localStorage.getItem(gameInfo[id].bestKey) || 0);
}

function setBest(id, score) {
  if (score > bestFor(id)) {
    localStorage.setItem(gameInfo[id].bestKey, String(Math.floor(score)));
  }
  refreshBestScores();
}

function refreshBestScores() {
  Object.keys(homeBest).forEach((id) => {
    homeBest[id].textContent = bestFor(id);
  });
  if (currentGame) ui.bestText.textContent = bestFor(currentGame);
}

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
}

function openHome() {
  stopLoop();
  currentGame = null;
  ui.globalStatus.textContent = "Choose a game";
  showScreen("home");
  refreshBestScores();
  renderShop();
}

function openGame(id) {
  stopLoop();
  currentGame = id;
  const info = gameInfo[id];
  ui.gameTitle.textContent = info.title;
  ui.gameLabel.textContent = info.label;
  ui.controlsText.textContent = info.controls;
  ui.globalStatus.textContent = info.title;
  ui.scoreText.textContent = "0";
  ui.bestText.textContent = bestFor(id);
  refreshWallet();
  ui.roundText.textContent = "Ready";
  ui.overlayTitle.textContent = "Ready?";
  ui.overlayText.textContent = info.controls;
  ui.startBtn.textContent = "Start";
  ui.overlay.classList.remove("hidden");
  showScreen("game");
  drawAttract(id);
}

function startCurrentGame() {
  if (!currentGame) return;
  keys = {};
  pointer.down = false;
  if (currentGame === "pac") initPac();
  if (currentGame === "road") initRoad();
  if (currentGame === "zombie") initZombie();
  if (currentGame === "block") initBlock();
  ui.overlay.classList.add("hidden");
  lastTime = performance.now();
  stopLoop();
  animationId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (animationId) cancelAnimationFrame(animationId);
  animationId = 0;
}

function loop(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0.016);
  lastTime = time;
  if (currentGame === "pac") updatePac(dt);
  if (currentGame === "road") updateRoad(dt);
  if (currentGame === "zombie") updateZombie(dt);
  if (currentGame === "block") updateBlock(dt);
  if (state.ended) return;
  animationId = requestAnimationFrame(loop);
}

function endGame(title, text) {
  state.ended = true;
  stopLoop();
  setBest(currentGame, state.score || 0);
  ui.roundText.textContent = "Game Over";
  ui.overlayTitle.textContent = title;
  ui.overlayText.textContent = text;
  ui.startBtn.textContent = "Play Again";
  ui.overlay.classList.remove("hidden");
}

function winGame(title, text) {
  state.ended = true;
  stopLoop();
  setBest(currentGame, state.score || 0);
  ui.roundText.textContent = "Cleared";
  ui.overlayTitle.textContent = title;
  ui.overlayText.textContent = text;
  ui.startBtn.textContent = "Play Again";
  ui.overlay.classList.remove("hidden");
}

function updateScore() {
  ui.scoreText.textContent = Math.floor(state.score || 0);
  ui.bestText.textContent = Math.max(bestFor(currentGame), Math.floor(state.score || 0));
}

function drawAttract(id) {
  const accent = id === "pac" ? palette.yellow : id === "road" ? palette.cyan : id === "zombie" ? palette.green : palette.violet;
  drawCanvasBackdrop("#0b0f17", accent, 0.16);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 48px Arial";
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;
  ctx.fillText(gameInfo[id].title, WIDTH / 2, HEIGHT / 2 - 24);
  ctx.shadowBlur = 0;
  ctx.font = "18px Arial";
  ctx.fillStyle = palette.muted;
  ctx.fillText("Press Start", WIDTH / 2, HEIGHT / 2 + 34);

  if (id === "pac") {
    drawPacmanSprite(WIDTH / 2 - 150, HEIGHT / 2 - 10, 26, 0, 0.23);
    drawGhostSprite(WIDTH / 2 + 150, HEIGHT / 2 - 10, 24, palette.red, { x: -1, y: 0 }, false);
  }
  if (id === "road") {
    drawRoadCarSprite(WIDTH / 2 - 165, HEIGHT / 2 - 6, 76, 34, palette.red, 1);
    drawHopper(WIDTH / 2 + 165, HEIGHT / 2 + 4, 1);
  }
  if (id === "zombie") {
    drawZombieEnemy({ x: WIDTH / 2 - 150, y: HEIGHT / 2 - 2, r: 18, hp: 2, maxHp: 2, color: palette.green, accent: palette.violet, type: "brute" });
    drawSurvivor(WIDTH / 2 + 150, HEIGHT / 2 - 2, Math.PI);
  }
  if (id === "block") {
    drawBlockAttract();
  }
}

function wallAt(col, row) {
  return state.map[row] && state.map[row][col] === "#";
}

function gridCenter(col, row) {
  return {
    x: col * state.tile + state.tile / 2 + state.offsetX,
    y: row * state.tile + state.tile / 2 + state.offsetY
  };
}

function initPac(level = 1, score = 0) {
  const rows = [
    "###############",
    "#.............#",
    "#.###.###.###.#",
    "#o#.........#o#",
    "#.###.#.#.###.#",
    "#.....#.#.....#",
    "###.#.....#.###",
    "#...###.###...#",
    "#.#.........#.#",
    "#.#.##.#.##.#.#",
    "#.............#",
    "###############"
  ];
  state = {
    map: rows.map((row) => row.split("")),
    tile: 38,
    offsetX: 75,
    offsetY: 32,
    score,
    level,
    ended: false,
    pellets: 0,
    time: 0,
    powerTime: 0,
    invulnerable: 0,
    lives: inventoryCount("pac", "extraLife"),
    powerBonus: inventoryCount("pac", "powerDuration"),
    magnet: inventoryCount("pac", "dotMagnet"),
    player: { col: 1, row: 1, dir: { x: 1, y: 0 }, next: { x: 1, y: 0 } },
    ghosts: [
      makePacGhost("chaser", 13, 1, palette.red, { col: 13, row: 1 }),
      makePacGhost("ambusher", 1, 10, palette.cyan, { col: 1, row: 10 }),
      makePacGhost("patrol", 13, 10, palette.violet, { col: 13, row: 10 })
    ],
    moveTimer: 0,
    ghostTimer: 0,
    playerDelay: Math.max(0.102, 0.146 - (level - 1) * 0.006),
    ghostDelay: Math.max(0.118, 0.232 - (level - 1) * 0.011)
  };
  state.map.forEach((row) => row.forEach((cell) => {
    if (cell === "." || cell === "o") state.pellets += 1;
  }));
  eatPacPellet();
  drawPac();
  ui.roundText.textContent = `Level ${state.level} | Lives ${state.lives}`;
  updateScore();
}

function makePacGhost(name, col, row, color, scatter) {
  return {
    name,
    col,
    row,
    color,
    scatter,
    home: { col, row },
    dir: { x: 0, y: 0 },
    step: 0
  };
}

function updatePac(dt) {
  state.time += dt;
  state.powerTime = Math.max(0, state.powerTime - dt);
  state.invulnerable = Math.max(0, state.invulnerable - dt);
  const wanted = directionFromKeys();
  if (wanted) state.player.next = wanted;
  state.moveTimer += dt;
  state.ghostTimer += dt;
  if (state.moveTimer >= state.playerDelay) {
    state.moveTimer = 0;
    movePacPlayer();
    eatPacPellet();
    if (resolvePacCollisions()) {
      drawPac();
      endGame("Caught!", "The ghosts boxed you in. Try using power pellets earlier.");
      return;
    }
  }
  if (state.ghostTimer >= state.ghostDelay) {
    state.ghostTimer = 0;
    moveGhosts();
    if (resolvePacCollisions()) {
      drawPac();
      endGame("Caught!", "The ghosts boxed you in. Try using power pellets earlier.");
      return;
    }
  }
  if (state.pellets <= 0) {
    state.score += 250 + state.level * 25;
    updateScore();
    initPac(state.level + 1, state.score);
    return;
  }
  drawPac();
  updateScore();
}

function directionFromKeys() {
  if (keys.ArrowUp || keys.w) return { x: 0, y: -1 };
  if (keys.ArrowDown || keys.s) return { x: 0, y: 1 };
  if (keys.ArrowLeft || keys.a) return { x: -1, y: 0 };
  if (keys.ArrowRight || keys.d) return { x: 1, y: 0 };
  return null;
}

function canMove(entity, dir) {
  return !wallAt(entity.col + dir.x, entity.row + dir.y);
}

function movePacPlayer() {
  if (canMove(state.player, state.player.next)) state.player.dir = state.player.next;
  if (canMove(state.player, state.player.dir)) {
    state.player.col += state.player.dir.x;
    state.player.row += state.player.dir.y;
  }
}

function eatPacPellet() {
  collectPacPellet(state.player.row, state.player.col);
  const radius = state.magnet > 0 ? Math.min(3, state.magnet + 1) : 0;
  if (!radius) return;
  for (let row = state.player.row - radius; row <= state.player.row + radius; row += 1) {
    for (let col = state.player.col - radius; col <= state.player.col + radius; col += 1) {
      if (Math.abs(row - state.player.row) + Math.abs(col - state.player.col) <= radius) {
        collectPacPellet(row, col);
      }
    }
  }
}

function collectPacPellet(row, col) {
  const cell = state.map[row]?.[col];
  if (cell !== "." && cell !== "o") return;
  state.map[row][col] = " ";
  state.pellets -= 1;
  state.score += cell === "o" ? 50 : 10;
  awardPoints(1);
  if (cell === "o") state.powerTime = 7.2 + state.powerBonus * 3;
}

function moveGhosts() {
  state.ghosts.forEach((ghost, index) => {
    const options = DIRS.filter((dir) => canMove(ghost, dir));
    if (!options.length) return;
    let legal = options.filter((dir) => !(dir.x === -ghost.dir.x && dir.y === -ghost.dir.y));
    if (!legal.length) legal = options;

    let dir;
    if (state.powerTime > 0) {
      legal.sort((a, b) => {
        const ad = cellDistance({ col: ghost.col + a.x, row: ghost.row + a.y }, state.player);
        const bd = cellDistance({ col: ghost.col + b.x, row: ghost.row + b.y }, state.player);
        return bd - ad;
      });
      dir = Math.random() < 0.18 && legal[1] ? legal[1] : legal[0];
    } else {
      const target = pacGhostTarget(ghost, index);
      legal.sort((a, b) => {
        const ad = cellDistance({ col: ghost.col + a.x, row: ghost.row + a.y }, target);
        const bd = cellDistance({ col: ghost.col + b.x, row: ghost.row + b.y }, target);
        return ad - bd;
      });
      const skill = clamp(0.58 + state.level * 0.048 + index * 0.04, 0.58, 0.94);
      const fallbackIndex = Math.min(legal.length - 1, (ghost.step + index) % Math.min(2, legal.length));
      dir = Math.random() < skill ? legal[0] : legal[fallbackIndex];
    }

    ghost.col += dir.x;
    ghost.row += dir.y;
    ghost.dir = dir;
    ghost.step += 1;
  });
}

function pacGhostTarget(ghost) {
  const p = state.player;
  const scatterPhase = Math.floor(state.time / 6) % 4 === 3;
  if (scatterPhase) return ghost.scatter;
  if (ghost.name === "ambusher") {
    return {
      col: clamp(p.col + p.dir.x * 4, 1, state.map[0].length - 2),
      row: clamp(p.row + p.dir.y * 4, 1, state.map.length - 2)
    };
  }
  if (ghost.name === "patrol" && cellDistance(ghost, p) < 5) {
    return ghost.scatter;
  }
  return { col: p.col, row: p.row };
}

function resolvePacCollisions() {
  if (state.invulnerable > 0) return false;
  let caught = false;
  state.ghosts.forEach((ghost) => {
    if (ghost.col !== state.player.col || ghost.row !== state.player.row) return;
    if (state.powerTime > 0) {
      state.score += 200 + state.level * 20;
      ghost.col = ghost.home.col;
      ghost.row = ghost.home.row;
      ghost.dir = { x: 0, y: 0 };
      ghost.step = 0;
    } else if (state.lives > 0 && consumeShopItem("pac", "extraLife")) {
      state.lives -= 1;
      state.player.col = 1;
      state.player.row = 1;
      state.player.dir = { x: 1, y: 0 };
      state.player.next = { x: 1, y: 0 };
      state.invulnerable = 1.8;
      ui.roundText.textContent = `Level ${state.level} | Life used | ${state.lives} left`;
    } else {
      caught = true;
    }
  });
  return caught;
}

function drawPac() {
  drawCanvasBackdrop("#080b12", "#223eff", 0.08);
  const boardW = state.map[0].length * state.tile;
  const boardH = state.map.length * state.tile;
  fillRoundedRect(state.offsetX - 12, state.offsetY - 12, boardW + 24, boardH + 24, 12, "rgba(12, 17, 34, 0.92)", "rgba(84, 207, 255, 0.14)");

  for (let row = 0; row < state.map.length; row += 1) {
    for (let col = 0; col < state.map[row].length; col += 1) {
      const x = state.offsetX + col * state.tile;
      const y = state.offsetY + row * state.tile;
      const cell = state.map[row][col];
      if (cell === "#") {
        ctx.shadowColor = "rgba(62, 91, 255, 0.34)";
        ctx.shadowBlur = 10;
        fillRoundedRect(x + 3, y + 3, state.tile - 6, state.tile - 6, 7, "#243cff", "#5d74ff");
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.11)";
        ctx.fillRect(x + 8, y + 8, state.tile - 16, 2);
      } else if (cell === "." || cell === "o") {
        ctx.fillStyle = cell === "o" ? palette.yellow : palette.text;
        ctx.shadowColor = cell === "o" ? palette.yellow : "transparent";
        ctx.shadowBlur = cell === "o" ? 12 : 0;
        ctx.beginPath();
        ctx.arc(x + state.tile / 2, y + state.tile / 2, cell === "o" ? 7 : 3, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  const p = gridCenter(state.player.col, state.player.row);
  const mouth = 0.16 + Math.abs(Math.sin(state.time * 12)) * 0.12;
  const angle = Math.atan2(state.player.dir.y, state.player.dir.x);
  drawPacmanSprite(p.x, p.y, 16, angle, mouth);

  state.ghosts.forEach((ghost) => {
    const g = gridCenter(ghost.col, ghost.row);
    drawGhostSprite(g.x, g.y, 16, ghost.color, ghost.dir, state.powerTime > 0);
  });

  if (state.powerTime > 0) {
    ctx.fillStyle = "rgba(84, 207, 255, 0.88)";
    ctx.font = "800 16px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(`Power ${Math.ceil(state.powerTime)}`, WIDTH - 24, 20);
  }
}

function initRoad() {
  state = {
    score: 0,
    level: 1,
    ended: false,
    time: 0,
    lives: inventoryCount("road", "extraLife"),
    trafficSlow: inventoryCount("road", "trafficSlow"),
    coinMagnet: inventoryCount("road", "coinMagnet"),
    trafficMultiplier: clamp(1 - inventoryCount("road", "trafficSlow") * 0.12, 0.55, 1),
    player: { x: WIDTH / 2, y: 482, size: 30, cooldown: 0, bounce: 0 },
    cars: [],
    coins: [],
    lanes: [
      { y: 406, speed: 118, color: palette.red, roof: "#ff9aa4" },
      { y: 330, speed: -148, color: palette.yellow, roof: "#fff1a4" },
      { y: 254, speed: 178, color: palette.cyan, roof: "#b9ecff" },
      { y: 178, speed: -208, color: palette.violet, roof: "#ddc3ff" },
      { y: 102, speed: 232, color: palette.green, roof: "#bbf5c8" }
    ]
  };
  state.lanes.forEach((lane, laneIndex) => {
    for (let i = 0; i < 3; i += 1) {
      state.cars.push(makeRoadCar(lane, laneIndex, i));
    }
    state.coins.push({ x: 126 + laneIndex * 108, y: lane.y - 45, taken: false, phase: laneIndex * 0.7 });
  });
  ui.roundText.textContent = `Level ${state.level} | Lives ${state.lives}`;
  updateScore();
  drawRoad();
}

function makeRoadCar(lane, laneIndex, order) {
  const width = 66 + ((laneIndex + order) % 3) * 10;
  return {
    x: ((order * 252) + laneIndex * 73) % 780 - 50,
    y: lane.y,
    w: width,
    h: 34,
    laneIndex,
    speed: lane.speed * state.trafficMultiplier * (1 + order * 0.04),
    color: lane.color,
    roof: lane.roof
  };
}

function updateRoad(dt) {
  state.time += dt;
  state.player.cooldown = Math.max(0, state.player.cooldown - dt);
  state.player.bounce = Math.max(0, state.player.bounce - dt);
  if (state.player.cooldown <= 0) {
    const dir = directionFromKeys();
    if (dir) {
      state.player.x = clamp(state.player.x + dir.x * 54, 30, WIDTH - 30);
      state.player.y = clamp(state.player.y + dir.y * 38, 30, HEIGHT - 30);
      state.player.cooldown = 0.12;
      state.player.bounce = 0.16;
      if (dir.y < 0) awardPoints(1);
    }
  }

  state.cars.forEach((car) => {
    car.x += car.speed * dt;
    if (car.speed > 0 && car.x > WIDTH + 70) car.x = -car.w - 40;
    if (car.speed < 0 && car.x < -car.w - 50) car.x = WIDTH + 50;
    if (rectsOverlap(state.player.x - 14, state.player.y - 14, 28, 28, car.x, car.y - car.h / 2, car.w, car.h)) {
      if (state.lives > 0 && consumeShopItem("road", "extraLife")) {
        state.lives -= 1;
        state.player.x = WIDTH / 2;
        state.player.y = 482;
        state.player.cooldown = 0.5;
        state.player.bounce = 0;
        ui.roundText.textContent = `Level ${state.level} | Life used | ${state.lives} left`;
      } else {
        drawRoad();
        endGame("Splat!", "Traffic wins this round. Watch the faster lanes first.");
      }
    }
  });
  if (state.ended) return;

  state.coins.forEach((coin) => {
    if (!coin.taken && distance(state.player.x, state.player.y, coin.x, coin.y) < 27 + state.coinMagnet * 20) {
      coin.taken = true;
      state.score += 75;
    }
  });

  if (state.player.y < 46) {
    state.score += 150 + state.level * 20;
    state.level += 1;
    ui.roundText.textContent = `Level ${state.level} | Lives ${state.lives}`;
    state.player.x = WIDTH / 2;
    state.player.y = 482;
    state.cars.forEach((car) => {
      car.speed *= 1.065;
      car.w = Math.min(112, car.w + 2);
    });
    if (state.level % 2 === 0) addRoadCar();
    state.coins.forEach((coin, index) => {
      coin.taken = false;
      coin.x = 96 + ((state.level * 47 + index * 119) % 530);
    });
  }

  drawRoad();
  updateScore();
}

function addRoadCar() {
  const laneIndex = (state.level + state.cars.length) % state.lanes.length;
  const lane = state.lanes[laneIndex];
  const car = makeRoadCar(lane, laneIndex, state.level);
  car.x = lane.speed > 0 ? -130 : WIDTH + 130;
  car.speed = lane.speed * state.trafficMultiplier * (1 + state.level * 0.08);
  state.cars.push(car);
}

function drawRoad() {
  ctx.fillStyle = "#14251a";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (let y = 0; y < HEIGHT; y += 26) {
    ctx.fillStyle = y % 52 === 0 ? "rgba(112, 226, 138, 0.08)" : "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, y, WIDTH, 13);
  }

  ctx.fillStyle = "#27633a";
  ctx.fillRect(0, 452, WIDTH, 68);
  ctx.fillRect(0, 0, WIDTH, 64);
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(0, 452, WIDTH, 2);
  ctx.fillRect(0, 62, WIDTH, 2);

  state.lanes.forEach((lane, laneIndex) => {
    ctx.fillStyle = laneIndex % 2 === 0 ? "#2a303b" : "#242b36";
    ctx.fillRect(0, lane.y - 34, WIDTH, 68);
    ctx.strokeStyle = "rgba(255, 216, 77, 0.78)";
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo((state.time * lane.speed * 0.06) % 40 - 40, lane.y);
    ctx.lineTo(WIDTH + 40, lane.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
  });

  state.coins.forEach((coin) => {
    if (!coin.taken) drawCoin(coin.x, coin.y, 10, state.time + coin.phase);
  });

  state.cars.forEach((car) => {
    drawRoadCarSprite(car.x, car.y, car.w, car.h, car.color, Math.sign(car.speed), car.roof);
  });

  drawHopper(state.player.x, state.player.y - Math.sin(state.player.bounce * 28) * 4, state.player.bounce > 0 ? 1.08 : 1);
}

function initZombie() {
  state = {
    score: 0,
    time: 0,
    level: 1,
    ended: false,
    hitFlash: 0,
    lives: inventoryCount("zombie", "extraLife"),
    damageLevel: inventoryCount("zombie", "damageMod"),
    pulseRifle: inventoryCount("zombie", "pulseRifle"),
    grenades: inventoryCount("zombie", "grenadePack"),
    grenadeCooldown: 0,
    explosion: null,
    invulnerable: 0,
    player: { x: WIDTH / 2, y: HEIGHT / 2, r: 15, speed: 226, hp: 4, reload: 0, vx: 0, vy: 0 },
    bullets: [],
    zombies: [],
    spawn: 0,
    wave: 1
  };
  ui.roundText.textContent = `Level 1 | HP 4 | G ${state.grenades}`;
  updateScore();
  drawZombie();
}

function updateZombie(dt) {
  if (state.ended) return;
  state.time += dt;
  state.hitFlash = Math.max(0, state.hitFlash - dt);
  state.invulnerable = Math.max(0, state.invulnerable - dt);
  state.grenadeCooldown = Math.max(0, state.grenadeCooldown - dt);
  if (state.explosion) {
    state.explosion.life -= dt;
    if (state.explosion.life <= 0) state.explosion = null;
  }
  const nextLevel = Math.floor(state.time / 18) + 1;
  if (nextLevel > state.level) state.level = nextLevel;
  state.spawn -= dt;
  state.player.reload -= dt;

  const dx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
  const dy = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
  const len = Math.hypot(dx, dy) || 1;
  const oldX = state.player.x;
  const oldY = state.player.y;
  state.player.x = clamp(state.player.x + (dx / len) * state.player.speed * dt, 18, WIDTH - 18);
  state.player.y = clamp(state.player.y + (dy / len) * state.player.speed * dt, 18, HEIGHT - 18);
  state.player.vx = (state.player.x - oldX) / Math.max(0.001, dt);
  state.player.vy = (state.player.y - oldY) / Math.max(0.001, dt);

  if (pointer.down && state.player.reload <= 0) shootZombie();
  if (state.spawn <= 0) {
    state.spawn = Math.max(0.18, 1.12 - state.level * 0.085 - state.time * 0.005);
    spawnZombie();
    if (state.level > 4 && Math.random() < 0.18) spawnZombie();
  }

  state.bullets.forEach((bullet) => {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
  });
  state.bullets = state.bullets.filter((bullet) => bullet.life > 0 && bullet.x > -30 && bullet.x < WIDTH + 30 && bullet.y > -30 && bullet.y < HEIGHT + 30);

  state.zombies.forEach((zombie, index) => {
    zombie.attackCooldown = Math.max(0, zombie.attackCooldown - dt);
    zombie.stun = Math.max(0, (zombie.stun || 0) - dt);
    moveZombieBot(zombie, index, dt);
    if (!zombie.dead && state.invulnerable <= 0 && distance(zombie.x, zombie.y, state.player.x, state.player.y) < zombie.r + state.player.r && zombie.attackCooldown <= 0) {
      zombie.dead = true;
      state.player.hp -= 1;
      state.hitFlash = 0.22;
      if (state.player.hp <= 0) {
        if (state.lives > 0 && consumeShopItem("zombie", "extraLife")) {
          state.lives -= 1;
          state.player.hp = 3;
          state.player.x = WIDTH / 2;
          state.player.y = HEIGHT / 2;
          state.invulnerable = 1.8;
        } else {
          drawZombie();
          endGame("Overrun!", "The swarm got through. Keep moving and thin the runners first.");
        }
      }
    }
  });
  if (state.ended) return;

  state.bullets.forEach((bullet) => {
    if (bullet.life <= 0) return;
    for (const zombie of state.zombies) {
      if (zombie.dead) continue;
      if (distance(bullet.x, bullet.y, zombie.x, zombie.y) < zombie.r + 5) {
        zombie.hp -= bullet.damage;
        bullet.life = 0;
        if (zombie.hp <= 0) {
          defeatZombie(zombie);
        }
        break;
      }
    }
  });

  state.zombies = state.zombies.filter((zombie) => !zombie.dead);
  state.score += dt * (3 + state.level * 0.45);
  ui.roundText.textContent = `Level ${state.level} | HP ${state.player.hp} | G ${state.grenades}`;
  drawZombie();
  updateScore();
}

function shootZombie() {
  const angle = Math.atan2(pointer.y - state.player.y, pointer.x - state.player.x);
  state.bullets.push({
    x: state.player.x + Math.cos(angle) * 20,
    y: state.player.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * 520,
    vy: Math.sin(angle) * 520,
    life: 0.92,
    damage: 1 + state.damageLevel + (state.pulseRifle ? 1 : 0),
    color: state.pulseRifle ? palette.cyan : palette.yellow
  });
  state.player.reload = state.pulseRifle ? 0.09 : 0.15;
}

function defeatZombie(zombie) {
  if (zombie.dead) return;
  zombie.dead = true;
  state.score += zombie.type === "brute" ? 70 : zombie.type === "runner" ? 48 : 35;
  awardPoints(2);
}

function throwGrenade() {
  if (currentGame !== "zombie" || state.ended || state.grenades <= 0 || state.grenadeCooldown > 0) return;
  if (!consumeShopItem("zombie", "grenadePack")) return;
  state.grenades -= 1;
  state.grenadeCooldown = 0.65;
  const targetX = clamp(pointer.x, 24, WIDTH - 24);
  const targetY = clamp(pointer.y, 24, HEIGHT - 24);
  const radius = 88;
  const blastDamage = 3 + state.damageLevel;
  state.explosion = { x: targetX, y: targetY, radius, life: 0.34, maxLife: 0.34 };
  state.zombies.forEach((zombie) => {
    if (zombie.dead || distance(targetX, targetY, zombie.x, zombie.y) > radius + zombie.r) return;
    zombie.hp -= blastDamage;
    zombie.stun = 0.45;
    if (zombie.hp <= 0) defeatZombie(zombie);
  });
}

function spawnZombie() {
  const side = Math.floor(Math.random() * 4);
  const pos = [
    { x: Math.random() * WIDTH, y: -22 },
    { x: WIDTH + 22, y: Math.random() * HEIGHT },
    { x: Math.random() * WIDTH, y: HEIGHT + 22 },
    { x: -22, y: Math.random() * HEIGHT }
  ][side];
  const roll = Math.random();
  const runnerChance = Math.min(0.36, 0.08 + state.level * 0.035);
  const bruteChance = Math.min(0.26, 0.04 + state.level * 0.03);
  let type = "shambler";
  if (roll < runnerChance) type = "runner";
  if (roll > 1 - bruteChance) type = "brute";
  const config = {
    shambler: { r: 14, hp: 1, speed: 78 + state.level * 8 + state.time * 0.42, color: palette.green, accent: "#b9f7c6" },
    runner: { r: 12, hp: 1, speed: 118 + state.level * 10 + state.time * 0.5, color: palette.orange, accent: "#ffe0b8" },
    brute: { r: 19, hp: 3, speed: 54 + state.level * 6 + state.time * 0.34, color: "#94d86d", accent: palette.violet }
  }[type];
  state.zombies.push({
    x: pos.x,
    y: pos.y,
    r: config.r,
    hp: config.hp,
    maxHp: config.hp,
    speed: config.speed,
    color: config.color,
    accent: config.accent,
    type,
    flank: Math.random() < 0.5 ? -1 : 1,
    phase: Math.random() * TAU,
    attackCooldown: 0
  });
}

function moveZombieBot(zombie, index, dt) {
  if (zombie.dead || zombie.stun > 0) return;
  const lead = zombie.type === "runner" ? 0.34 : zombie.type === "brute" ? 0.1 : 0.2;
  const orbit = zombie.type === "runner" ? 58 : zombie.type === "brute" ? 24 : 36;
  const targetX = state.player.x + state.player.vx * lead + Math.sin(state.time * 0.8 + zombie.phase) * orbit * zombie.flank;
  const targetY = state.player.y + state.player.vy * lead + Math.cos(state.time * 0.7 + zombie.phase) * orbit * 0.45;
  const seek = normalize(targetX - zombie.x, targetY - zombie.y);

  let sepX = 0;
  let sepY = 0;
  state.zombies.forEach((other, otherIndex) => {
    if (otherIndex === index || other.dead) return;
    const d = distance(zombie.x, zombie.y, other.x, other.y);
    const desired = zombie.r + other.r + 24;
    if (d > 0 && d < desired) {
      const push = (desired - d) / desired;
      sepX += ((zombie.x - other.x) / d) * push;
      sepY += ((zombie.y - other.y) / d) * push;
    }
  });

  let avoidX = 0;
  let avoidY = 0;
  if (zombie.type !== "brute") {
    state.bullets.forEach((bullet) => {
      const d = distance(zombie.x, zombie.y, bullet.x, bullet.y);
      if (d < 54) {
        const bulletAngle = Math.atan2(bullet.vy, bullet.vx);
        const side = zombie.flank;
        avoidX += Math.cos(bulletAngle + side * Math.PI / 2) * (1 - d / 54);
        avoidY += Math.sin(bulletAngle + side * Math.PI / 2) * (1 - d / 54);
      }
    });
  }

  const mixX = seek.x + sepX * 1.45 + avoidX * 0.85;
  const mixY = seek.y + sepY * 1.45 + avoidY * 0.85;
  const move = normalize(mixX, mixY);
  zombie.x += move.x * zombie.speed * dt;
  zombie.y += move.y * zombie.speed * dt;
}

function drawZombie() {
  ctx.fillStyle = "#101712";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "rgba(112, 226, 138, 0.12)";
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x + (state.time * 8) % 48, 0);
    ctx.lineTo(x + (state.time * 8) % 48, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  const angle = Math.atan2(pointer.y - state.player.y, pointer.x - state.player.x);
  ctx.strokeStyle = "rgba(84, 207, 255, 0.24)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(state.player.x, state.player.y);
  ctx.lineTo(state.player.x + Math.cos(angle) * 90, state.player.y + Math.sin(angle) * 90);
  ctx.stroke();

  state.bullets.forEach((bullet) => {
    const bulletAngle = Math.atan2(bullet.vy, bullet.vx);
    ctx.strokeStyle = bullet.color || palette.yellow;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - Math.cos(bulletAngle) * 16, bullet.y - Math.sin(bulletAngle) * 16);
    ctx.stroke();
    ctx.lineCap = "butt";
  });

  if (state.explosion) {
    const progress = 1 - state.explosion.life / state.explosion.maxLife;
    const blastRadius = state.explosion.radius * (0.48 + progress * 0.62);
    ctx.fillStyle = `rgba(255, 157, 77, ${(1 - progress) * 0.24})`;
    ctx.beginPath();
    ctx.arc(state.explosion.x, state.explosion.y, blastRadius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 216, 77, ${1 - progress * 0.6})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(state.explosion.x, state.explosion.y, blastRadius, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  state.zombies.forEach(drawZombieEnemy);
  drawSurvivor(state.player.x, state.player.y, angle, state.pulseRifle);

  ctx.fillStyle = "rgba(246, 249, 255, 0.78)";
  ctx.font = "800 15px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(`E  Grenades ${state.grenades}`, 20, HEIGHT - 16);

  if (state.hitFlash > 0) {
    ctx.fillStyle = `rgba(255, 91, 108, ${state.hitFlash * 1.6})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function drawSurvivor(x, y, angle, pulseRifle = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 8, 19, 10, 0, 0, TAU);
  ctx.fill();
  fillRoundedRect(2, -5, 30, 10, 4, pulseRifle ? palette.violet : palette.cyan, pulseRifle ? "#eadbff" : "#b9ecff");
  ctx.fillStyle = palette.text;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, TAU);
  ctx.fill();
  ctx.fillStyle = palette.ink;
  ctx.fillRect(4, -5, 4, 4);
  ctx.fillRect(4, 3, 4, 4);
  ctx.restore();
}

function drawZombieEnemy(zombie) {
  ctx.save();
  ctx.translate(zombie.x, zombie.y);
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.beginPath();
  ctx.ellipse(0, zombie.r * 0.65, zombie.r * 1.15, zombie.r * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = zombie.color;
  ctx.beginPath();
  ctx.arc(0, 0, zombie.r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = zombie.accent;
  ctx.fillRect(-zombie.r * 0.4, -zombie.r * 0.9, zombie.r * 0.8, 4);
  ctx.fillStyle = palette.ink;
  ctx.fillRect(-zombie.r * 0.48, -zombie.r * 0.2, 5, 5);
  ctx.fillRect(zombie.r * 0.22, -zombie.r * 0.2, 5, 5);
  ctx.fillRect(-3, zombie.r * 0.34, 6, 3);
  if (zombie.hp < zombie.maxHp) {
    ctx.strokeStyle = "rgba(246, 249, 255, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, zombie.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * (zombie.hp / zombie.maxHp));
    ctx.stroke();
  }
  ctx.restore();
}

const BLOCK_ROWS = 8;
const BLOCK_COLS = 8;
const BLOCK_TILE = 48;
const BLOCK_OFFSET_X = 168;
const BLOCK_OFFSET_Y = 36;
const BLOCK_TRAY_SLOTS = [245, 395, 545];
const blockShapes = [
  { name: "dot", cells: [[0, 0]] },
  { name: "domino", cells: [[0, 0], [1, 0]] },
  { name: "tri-line", cells: [[0, 0], [1, 0], [2, 0]] },
  { name: "corner", cells: [[0, 0], [0, 1], [1, 1]] },
  { name: "square", cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { name: "zig", cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  { name: "L", cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { name: "T", cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  { name: "plus", cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] },
  { name: "long-four", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { name: "hook", cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] }
];
const blockColors = [palette.violet, palette.cyan, palette.orange, palette.pink, palette.green, palette.yellow, palette.blockBlue, palette.blockMint];

function initBlock() {
  state = {
    score: 0,
    ended: false,
    time: 0,
    lines: 0,
    combo: 0,
    board: Array.from({ length: BLOCK_ROWS }, () => Array(BLOCK_COLS).fill(null)),
    tray: createBlockHand(),
    selectedIndex: -1,
    hovered: null,
    message: "Pick a shape, then pick its landing cell.",
    messageTone: "muted",
    flashCells: [],
    flashTime: 0,
    powerPulse: 0,
    powerCounts: {
      reroller: inventoryCount("block", "reroller"),
      clearBlock: inventoryCount("block", "clearBlock"),
      prismBomb: inventoryCount("block", "prismBomb"),
      colorShift: inventoryCount("block", "colorShift")
    }
  };
  ui.roundText.textContent = "Lines 0 | Combo ready";
  updateScore();
  drawBlock();
}

function createBlockHand() {
  return [createBlockPiece(), createBlockPiece(), createBlockPiece()];
}

function createBlockPiece() {
  const shape = blockShapes[Math.floor(Math.random() * blockShapes.length)];
  return {
    name: shape.name,
    cells: shape.cells.map(([x, y]) => [x, y]),
    color: blockColors[Math.floor(Math.random() * blockColors.length)]
  };
}

function rotateBlockPiece(piece) {
  if (!piece) return;
  const rotated = piece.cells.map(([x, y]) => [-y, x]);
  const minX = Math.min(...rotated.map(([x]) => x));
  const minY = Math.min(...rotated.map(([, y]) => y));
  piece.cells = rotated.map(([x, y]) => [x - minX, y - minY]);
}

function blockShapeCells(piece, col, row) {
  return piece.cells.map(([x, y]) => ({ col: col + x, row: row + y }));
}

function isBlockPlacementValid(piece, col, row) {
  if (!piece || !Number.isInteger(col) || !Number.isInteger(row)) return false;
  return blockShapeCells(piece, col, row).every(({ col: cellCol, row: cellRow }) => (
    cellCol >= 0 && cellCol < BLOCK_COLS && cellRow >= 0 && cellRow < BLOCK_ROWS && !state.board[cellRow][cellCol]
  ));
}

function blockCellFromPointer() {
  const col = Math.floor((pointer.x - BLOCK_OFFSET_X) / BLOCK_TILE);
  const row = Math.floor((pointer.y - BLOCK_OFFSET_Y) / BLOCK_TILE);
  return col >= 0 && col < BLOCK_COLS && row >= 0 && row < BLOCK_ROWS ? { col, row } : null;
}

function blockTrayIndexFromPointer() {
  if (pointer.y < 424) return -1;
  return BLOCK_TRAY_SLOTS.findIndex((center) => Math.abs(pointer.x - center) < 68);
}

function setBlockMessage(message, tone = "muted") {
  if (!state || currentGame !== "block") return;
  state.message = message;
  state.messageTone = tone;
}

function handleBlockClick() {
  if (currentGame !== "block" || ui.overlay.classList.contains("hidden") === false || state.ended) return;
  const trayIndex = blockTrayIndexFromPointer();
  if (trayIndex >= 0 && state.tray[trayIndex]) {
    state.selectedIndex = trayIndex;
    setBlockMessage(`${state.tray[trayIndex].name} selected — choose a landing cell.`, "good");
    return;
  }
  const cell = blockCellFromPointer();
  if (cell && state.selectedIndex >= 0) placeBlock(state.selectedIndex, cell.col, cell.row);
  else if (cell) setBlockMessage("Choose one of the shapes below first.", "warn");
}

function placeBlock(trayIndex, col, row) {
  const piece = state.tray[trayIndex];
  if (!piece) return;
  if (!isBlockPlacementValid(piece, col, row)) {
    setBlockMessage("That shape bumps into the grid. Try a different cell or press V to rotate.", "warn");
    return;
  }
  const cells = blockShapeCells(piece, col, row);
  cells.forEach(({ col: cellCol, row: cellRow }) => {
    state.board[cellRow][cellCol] = { color: piece.color, placedAt: state.time };
  });
  state.score += cells.length * 10;
  awardPoints(Math.max(1, Math.floor(cells.length / 2)));
  state.tray[trayIndex] = null;
  state.selectedIndex = -1;

  const cleared = clearCompletedBlockLines();
  if (cleared.lines > 0) {
    state.combo += 1;
    const comboBonus = Math.max(0, state.combo - 1) * 50;
    state.score += cleared.lines * 100 + cleared.cells * 12 + comboBonus;
    awardPoints(cleared.lines * 2 + (state.combo > 1 ? 1 : 0));
    setBlockMessage(`${cleared.lines} line${cleared.lines === 1 ? "" : "s"} blasted${state.combo > 1 ? ` — ${state.combo}x combo!` : "!"}`, "good");
  } else {
    state.combo = 0;
    setBlockMessage("Nice fit. Keep the center open for the weird shapes.", "muted");
  }

  if (state.tray.every((entry) => !entry)) state.tray = createBlockHand();
  if (!hasAnyBlockMove()) {
    drawBlock();
    endGame("Gridlocked!", "No shape fits the board. Your best combo was " + Math.max(1, state.combo) + "x.");
    return;
  }
  updateBlockHud();
}

function clearCompletedBlockLines() {
  const rows = [];
  const cols = [];
  for (let row = 0; row < BLOCK_ROWS; row += 1) {
    if (state.board[row].every(Boolean)) rows.push(row);
  }
  for (let col = 0; col < BLOCK_COLS; col += 1) {
    if (state.board.every((row) => row[col])) cols.push(col);
  }
  const cells = new Set();
  rows.forEach((row) => { for (let col = 0; col < BLOCK_COLS; col += 1) cells.add(`${col},${row}`); });
  cols.forEach((col) => { for (let row = 0; row < BLOCK_ROWS; row += 1) cells.add(`${col},${row}`); });
  cells.forEach((key) => {
    const [col, row] = key.split(",").map(Number);
    state.board[row][col] = null;
  });
  state.lines += rows.length + cols.length;
  state.flashCells = [...cells].map((key) => key.split(",").map(Number));
  state.flashTime = cells.size ? 0.34 : 0;
  return { lines: rows.length + cols.length, cells: cells.size };
}

function hasAnyBlockMove() {
  return state.tray.some((piece) => {
    if (!piece) return false;
    for (let row = 0; row < BLOCK_ROWS; row += 1) {
      for (let col = 0; col < BLOCK_COLS; col += 1) {
        if (isBlockPlacementValid(piece, col, row)) return true;
      }
    }
    return false;
  });
}

function activateBlockPower(powerId) {
  if (currentGame !== "block" || ui.overlay.classList.contains("hidden") === false || state.ended) return;
  if (inventoryCount("block", powerId) < 1) {
    setBlockMessage(`No ${powerId === "clearBlock" ? "clear blocks" : powerId} left — visit the Block Blast shop.`, "warn");
    return;
  }
  if (powerId === "reroller") {
    consumeShopItem("block", powerId);
    state.tray = createBlockHand();
    state.selectedIndex = -1;
    setBlockMessage("Fresh shapes dropped in. The grid is yours again.", "good");
  }
  if (powerId === "clearBlock") {
    const cell = state.hovered;
    if (!cell || !state.board[cell.row][cell.col]) {
      setBlockMessage("Hover a filled block first, then press C.", "warn");
      return;
    }
    consumeShopItem("block", powerId);
    state.board[cell.row][cell.col] = null;
    state.score += 18;
    state.powerPulse = 0.38;
    setBlockMessage(`Block cleared at ${String.fromCharCode(65 + cell.col)}${cell.row + 1}.`, "good");
  }
  if (powerId === "prismBomb") {
    const cell = state.hovered;
    if (!cell) {
      setBlockMessage("Hover the center of your prism blast first, then press X.", "warn");
      return;
    }
    const cells = [];
    for (let row = cell.row - 1; row <= cell.row + 1; row += 1) {
      for (let col = cell.col - 1; col <= cell.col + 1; col += 1) {
        if (row >= 0 && row < BLOCK_ROWS && col >= 0 && col < BLOCK_COLS && state.board[row][col]) {
          cells.push({ col, row });
        }
      }
    }
    if (!cells.length) {
      setBlockMessage("Aim the prism at a filled cluster so it has something to blast.", "warn");
      return;
    }
    consumeShopItem("block", powerId);
    cells.forEach(({ col, row }) => { state.board[row][col] = null; });
    state.score += cells.length * 12;
    state.powerPulse = 0.54;
    state.flashCells = cells.map(({ col, row }) => [col, row]);
    state.flashTime = 0.42;
    setBlockMessage(`Prism burst cleared ${cells.length} block${cells.length === 1 ? "" : "s"}.`, "good");
  }
  if (powerId === "colorShift") {
    const piece = state.tray[state.selectedIndex];
    if (!piece) {
      setBlockMessage("Select a tray shape first, then press Q.", "warn");
      return;
    }
    consumeShopItem("block", powerId);
    const currentColor = piece.color;
    const nextColor = blockColors[(blockColors.indexOf(currentColor) + 3) % blockColors.length];
    piece.color = nextColor === currentColor ? palette.cyan : nextColor;
    setBlockMessage("Lucky color shifted. Make it fit.", "good");
  }
  state.powerCounts = {
    reroller: inventoryCount("block", "reroller"),
    clearBlock: inventoryCount("block", "clearBlock"),
    prismBomb: inventoryCount("block", "prismBomb"),
    colorShift: inventoryCount("block", "colorShift")
  };
  updateBlockHud();
}

function rotateSelectedBlock() {
  if (currentGame !== "block" || ui.overlay.classList.contains("hidden") === false || state.ended) return;
  const piece = state.tray[state.selectedIndex];
  if (!piece) {
    setBlockMessage("Select a shape first, then press V to rotate it.", "warn");
    return;
  }
  rotateBlockPiece(piece);
  setBlockMessage("Shape rotated. Find it a landing cell.", "good");
}

function updateBlock(dt) {
  if (state.ended) return;
  state.time += dt;
  state.flashTime = Math.max(0, state.flashTime - dt);
  state.powerPulse = Math.max(0, state.powerPulse - dt);
  state.hovered = blockCellFromPointer();
  drawBlock();
  updateBlockHud();
}

function updateBlockHud() {
  if (currentGame !== "block" || !state) return;
  const handCount = state.tray.filter(Boolean).length;
  ui.roundText.textContent = `Lines ${state.lines} | ${state.combo > 1 ? `${state.combo}x combo` : "Combo ready"} | Hand ${handCount}/3`;
  updateScore();
}

function drawBlock() {
  ctx.fillStyle = "#100d1b";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "rgba(183, 133, 255, 0.18)");
  bg.addColorStop(0.55, "rgba(84, 207, 255, 0.04)");
  bg.addColorStop(1, "rgba(255, 118, 183, 0.12)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  fillRoundedRect(BLOCK_OFFSET_X - 16, BLOCK_OFFSET_Y - 16, BLOCK_COLS * BLOCK_TILE + 32, BLOCK_ROWS * BLOCK_TILE + 32, 16, "rgba(18, 17, 34, 0.94)", "rgba(183, 133, 255, 0.3)");
  for (let row = 0; row < BLOCK_ROWS; row += 1) {
    for (let col = 0; col < BLOCK_COLS; col += 1) {
      const x = BLOCK_OFFSET_X + col * BLOCK_TILE;
      const y = BLOCK_OFFSET_Y + row * BLOCK_TILE;
      fillRoundedRect(x + 4, y + 4, BLOCK_TILE - 8, BLOCK_TILE - 8, 8, "rgba(255, 255, 255, 0.045)", "rgba(255, 255, 255, 0.06)");
      if (state.board[row][col]) drawBlockTile(x + 7, y + 7, BLOCK_TILE - 14, state.board[row][col].color);
    }
  }

  const hover = state.hovered;
  const selectedPiece = state.tray[state.selectedIndex];
  if (hover && selectedPiece) {
    const valid = isBlockPlacementValid(selectedPiece, hover.col, hover.row);
    blockShapeCells(selectedPiece, hover.col, hover.row).forEach(({ col, row }) => {
      if (col < 0 || col >= BLOCK_COLS || row < 0 || row >= BLOCK_ROWS) return;
      const x = BLOCK_OFFSET_X + col * BLOCK_TILE + 7;
      const y = BLOCK_OFFSET_Y + row * BLOCK_TILE + 7;
      drawBlockTile(x, y, BLOCK_TILE - 14, valid ? selectedPiece.color : palette.red, true);
    });
    ctx.strokeStyle = valid ? palette.blockMint : palette.red;
    ctx.lineWidth = 3;
    ctx.strokeRect(BLOCK_OFFSET_X + hover.col * BLOCK_TILE + 5, BLOCK_OFFSET_Y + hover.row * BLOCK_TILE + 5, BLOCK_TILE - 10, BLOCK_TILE - 10);
    ctx.lineWidth = 1;
  } else if (hover) {
    ctx.strokeStyle = "rgba(246, 249, 255, 0.72)";
    ctx.lineWidth = 2;
    ctx.strokeRect(BLOCK_OFFSET_X + hover.col * BLOCK_TILE + 5, BLOCK_OFFSET_Y + hover.row * BLOCK_TILE + 5, BLOCK_TILE - 10, BLOCK_TILE - 10);
    ctx.lineWidth = 1;
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "800 14px Arial";
  ctx.fillStyle = "rgba(246, 249, 255, 0.72)";
  ctx.fillText("BUILD ZONE", BLOCK_OFFSET_X, 8);
  ctx.textAlign = "right";
  ctx.fillStyle = state.messageTone === "good" ? palette.blockMint : state.messageTone === "warn" ? palette.orange : "rgba(246, 249, 255, 0.72)";
  ctx.fillText(state.message, WIDTH - 20, 8);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(246, 249, 255, 0.58)";
  ctx.font = "700 13px Arial";
  ctx.fillText("POWER KEYS", 20, 444);
  ctx.font = "800 13px Arial";
  ctx.fillStyle = palette.violet;
  ctx.fillText(`R  Reroll ×${state.powerCounts?.reroller || 0}`, 20, 466);
  ctx.fillStyle = palette.orange;
  ctx.fillText(`C  Clear ×${state.powerCounts?.clearBlock || 0}`, 20, 486);
  ctx.fillStyle = palette.cyan;
  ctx.fillText(`X  Prism ×${state.powerCounts?.prismBomb || 0}`, 20, 506);
  ctx.fillStyle = palette.pink;
  ctx.fillText(`Q  Shift ×${state.powerCounts?.colorShift || 0}`, 625, 506);
  ctx.fillStyle = palette.muted;
  ctx.fillText("V  rotate selected", 625, 486);

  ctx.textAlign = "center";
  ctx.font = "900 16px Arial";
  ctx.fillStyle = palette.text;
  ctx.fillText("SHAPE TRAY", WIDTH / 2, 426);
  state.tray.forEach((piece, index) => {
    const center = BLOCK_TRAY_SLOTS[index];
    fillRoundedRect(center - 62, 442, 124, 67, 10, index === state.selectedIndex ? "rgba(183, 133, 255, 0.19)" : "rgba(255, 255, 255, 0.045)", index === state.selectedIndex ? palette.violet : "rgba(255, 255, 255, 0.1)");
    ctx.fillStyle = "rgba(246, 249, 255, 0.46)";
    ctx.font = "800 11px Arial";
    ctx.fillText(String(index + 1), center - 50, 452);
    if (piece) drawBlockPiecePreview(piece, center, 477, 15);
  });

  if (state.flashTime > 0) {
    const alpha = state.flashTime / 0.42;
    state.flashCells.forEach(([col, row]) => {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
      ctx.fillRect(BLOCK_OFFSET_X + col * BLOCK_TILE + 5, BLOCK_OFFSET_Y + row * BLOCK_TILE + 5, BLOCK_TILE - 10, BLOCK_TILE - 10);
    });
  }
  if (state.powerPulse > 0) {
    ctx.strokeStyle = `rgba(84, 207, 255, ${state.powerPulse * 1.4})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(BLOCK_OFFSET_X - 5, BLOCK_OFFSET_Y - 5, BLOCK_COLS * BLOCK_TILE + 10, BLOCK_ROWS * BLOCK_TILE + 10);
    ctx.lineWidth = 1;
  }
}

function drawBlockPiecePreview(piece, centerX, centerY, size) {
  const maxX = Math.max(...piece.cells.map(([x]) => x));
  const maxY = Math.max(...piece.cells.map(([, y]) => y));
  const width = (maxX + 1) * size;
  const height = (maxY + 1) * size;
  piece.cells.forEach(([x, y]) => drawBlockTile(centerX - width / 2 + x * size, centerY - height / 2 + y * size, size - 2, piece.color));
}

function drawBlockTile(x, y, size, color, ghost = false) {
  ctx.save();
  ctx.globalAlpha = ghost ? 0.42 : 1;
  ctx.shadowColor = hexToRgba(color, ghost ? 0.24 : 0.45);
  ctx.shadowBlur = ghost ? 5 : 12;
  fillRoundedRect(x, y, size, size, Math.max(4, size * 0.16), color, ghost ? "rgba(246, 249, 255, 0.7)" : "rgba(255, 255, 255, 0.28)");
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
  ctx.fillRect(x + size * 0.18, y + size * 0.16, size * 0.46, Math.max(2, size * 0.07));
  ctx.restore();
}

function drawBlockAttract() {
  const demo = [
    [palette.violet, 2, 5], [palette.violet, 3, 5], [palette.cyan, 4, 5], [palette.cyan, 4, 6],
    [palette.orange, 5, 6], [palette.orange, 6, 6], [palette.green, 6, 7], [palette.pink, 3, 7]
  ];
  demo.forEach(([color, col, row]) => drawBlockTile(WIDTH / 2 - 92 + col * 24, 282 + row * 14, 22, color));
  drawBlockTile(WIDTH / 2 - 100, 346, 22, palette.yellow);
  drawBlockTile(WIDTH / 2 - 76, 346, 22, palette.yellow);
  drawBlockTile(WIDTH / 2 - 52, 346, 22, palette.yellow);
  ctx.fillStyle = "rgba(246, 249, 255, 0.72)";
  ctx.font = "700 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("click shapes • clear lines • chase combos", WIDTH / 2, 390);
}

function drawCanvasBackdrop(base, accent, alpha) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.42})`;
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, `${hexToRgba(accent, alpha)}`);
  gradient.addColorStop(0.52, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, `${hexToRgba(palette.yellow, alpha * 0.55)}`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawPacmanSprite(x, y, r, angle, mouth) {
  ctx.fillStyle = palette.yellow;
  ctx.shadowColor = "rgba(255, 216, 77, 0.4)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, angle + mouth * Math.PI, angle + (2 - mouth) * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.ink;
  ctx.beginPath();
  ctx.arc(x + Math.cos(angle - 0.85) * r * 0.42, y + Math.sin(angle - 0.85) * r * 0.42, Math.max(2, r * 0.16), 0, TAU);
  ctx.fill();
}

function drawGhostSprite(x, y, r, color, dir, scared) {
  const ghostColor = scared ? "#6aa9ff" : color;
  ctx.fillStyle = ghostColor;
  ctx.shadowColor = scared ? "rgba(84, 207, 255, 0.44)" : `${hexToRgba(color, 0.35)}`;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(x, y - 2, r, Math.PI, 0);
  ctx.lineTo(x + r, y + r * 0.78);
  for (let i = 0; i < 3; i += 1) {
    const px = x + r - ((i + 0.5) * (2 * r / 3));
    ctx.quadraticCurveTo(px, y + r * 0.44, px - r / 3, y + r * 0.78);
  }
  ctx.lineTo(x - r, y - 2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  const look = normalize(dir.x, dir.y);
  ctx.fillStyle = palette.text;
  ctx.beginPath();
  ctx.arc(x - r * 0.38, y - r * 0.24, r * 0.28, 0, TAU);
  ctx.arc(x + r * 0.38, y - r * 0.24, r * 0.28, 0, TAU);
  ctx.fill();
  ctx.fillStyle = scared ? palette.yellow : palette.ink;
  ctx.beginPath();
  ctx.arc(x - r * 0.38 + look.x * 3, y - r * 0.24 + look.y * 3, r * 0.12, 0, TAU);
  ctx.arc(x + r * 0.38 + look.x * 3, y - r * 0.24 + look.y * 3, r * 0.12, 0, TAU);
  ctx.fill();
}

function drawRoadCarSprite(x, y, w, h, color, dir, roof = "#ffffff") {
  ctx.save();
  ctx.translate(x + w / 2, y);
  if (dir < 0) ctx.scale(-1, 1);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, h * 0.52, w * 0.48, h * 0.22, 0, 0, TAU);
  ctx.fill();
  fillRoundedRect(-w / 2, -h / 2, w, h, 7, color, "rgba(255, 255, 255, 0.22)");
  fillRoundedRect(-w * 0.18, -h * 0.44, w * 0.38, h * 0.42, 5, roof, "rgba(255, 255, 255, 0.22)");
  ctx.fillStyle = palette.ink;
  ctx.beginPath();
  ctx.arc(-w * 0.3, h * 0.45, 6, 0, TAU);
  ctx.arc(w * 0.3, h * 0.45, 6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = palette.yellow;
  ctx.fillRect(w * 0.42, -h * 0.22, 5, 8);
  ctx.fillStyle = palette.red;
  ctx.fillRect(-w * 0.48, -h * 0.22, 4, 8);
  ctx.restore();
}

function drawHopper(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 15, 20, 8, 0, 0, TAU);
  ctx.fill();
  fillRoundedRect(-15, -16, 30, 32, 8, palette.cyan, "#b9ecff");
  ctx.fillStyle = palette.ink;
  ctx.fillRect(-7, -4, 5, 5);
  ctx.fillRect(3, -4, 5, 5);
  ctx.fillStyle = palette.yellow;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.lineTo(6, 9);
  ctx.lineTo(-6, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCoin(x, y, r, time) {
  const squash = 0.7 + Math.sin(time * 5) * 0.18;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(squash, 1);
  ctx.fillStyle = palette.yellow;
  ctx.shadowColor = "rgba(255, 216, 77, 0.45)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(11, 14, 20, 0.42)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r - 4, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function fillRoundedRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function cellDistance(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function normalize(x, y) {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  pointer.x = ((clientX - rect.left) / rect.width) * WIDTH;
  pointer.y = ((clientY - rect.top) / rect.height) * HEIGHT;
}

document.querySelectorAll("[data-game]").forEach((button) => {
  button.addEventListener("click", () => openGame(button.dataset.game));
});

document.querySelectorAll("[data-home]").forEach((button) => {
  button.addEventListener("click", openHome);
});

document.querySelectorAll("[data-shop-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    activeShopTab = button.dataset.shopTab;
    renderShop();
    setShopStatus(`Browse ${gameInfo[activeShopTab].title} upgrades.`, "");
  });
});

ui.shopGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-shop-buy]");
  if (!button) return;
  buyShopItem(activeShopTab, button.dataset.shopBuy);
});

ui.startBtn.addEventListener("click", startCurrentGame);
ui.restartBtn.addEventListener("click", startCurrentGame);

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
  keys[event.key] = true;
  keys[event.key.toLowerCase()] = true;
  if (event.key.toLowerCase() === "e") throwGrenade();
  if (currentGame === "block" && ui.overlay.classList.contains("hidden")) {
    const blockKey = event.key.toLowerCase();
    if (blockKey === "r") activateBlockPower("reroller");
    if (blockKey === "c") activateBlockPower("clearBlock");
    if (blockKey === "x") activateBlockPower("prismBomb");
    if (blockKey === "q") activateBlockPower("colorShift");
    if (blockKey === "v") rotateSelectedBlock();
  }
  if (event.key === "Enter" && !ui.overlay.classList.contains("hidden")) startCurrentGame();
});

window.addEventListener("keyup", (event) => {
  keys[event.key] = false;
  keys[event.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
  keys = {};
  pointer.down = false;
});

canvas.addEventListener("mousedown", (event) => {
  canvasPoint(event);
  pointer.down = true;
});

canvas.addEventListener("mousemove", canvasPoint);
canvas.addEventListener("click", (event) => {
  canvasPoint(event);
  handleBlockClick();
});
window.addEventListener("mouseup", () => {
  pointer.down = false;
});

canvas.addEventListener("touchstart", (event) => {
  canvasPoint(event);
  pointer.down = true;
  event.preventDefault();
}, { passive: false });

canvas.addEventListener("touchmove", (event) => {
  canvasPoint(event);
  event.preventDefault();
}, { passive: false });

window.addEventListener("touchend", () => {
  pointer.down = false;
});

refreshBestScores();
renderShop();
openHome();
