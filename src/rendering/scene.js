import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { BALANCE as B, MAPS, biomeDefinition, itemDefinition } from '../data/balance.js';
import { attackStage } from '../systems/simulation.js';

const material = color => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });

export class SceneView {
  constructor(canvas, world) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#b9d8ba');
    this.scene.fog = new THREE.Fog('#b9d8ba', 35, 68);
    this.camera = new THREE.PerspectiveCamera(43, 1, 0.1, 90);
    this.focus = new THREE.Vector3(0, 0, 4);
    this.scene.add(new THREE.HemisphereLight('#fff5d2', '#527f72', 2.5));
    const sun = new THREE.DirectionalLight('#fff0c7', 3);
    sun.position.set(-10, 20, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, far: 60 });
    sun.shadow.normalBias = 0.04;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight('#8edcff', 0.85);
    rim.position.set(13, 9, -16);
    this.scene.add(rim);
    this.buildWorld(world);
    this.player = this.buildPlayer();
    this.enemyViews = new Map();
    this.scene.add(this.player.root);
    this.dropViews = new Map();
    const arc = new THREE.RingGeometry(0.8, B.player.range, 28, 1, -B.player.arc / 2, B.player.arc);
    arc.rotateX(-Math.PI / 2);
    // Ring's zero angle points along +x; actor facing zero points along +z.
    arc.rotateY(-Math.PI / 2);
    this.swing = new THREE.Mesh(arc, new THREE.MeshBasicMaterial({ color: '#fff1b4', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    this.scene.add(this.swing);
    this.warning = new THREE.Mesh(new THREE.RingGeometry(0.94, 1.15, 32), new THREE.MeshBasicMaterial({ color: '#ff714f', transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    this.warning.rotation.x = -Math.PI / 2;
    this.scene.add(this.warning);
    this.resize = () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight, false);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this.resize);
    this.resize();
  }
  mesh(parent, geometry, mat, x, y, z) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  buildWorld(world) {
    this.groundMaterial = material('#83ad62');
    this.arenaMaterial = material('#95b968');
    const ground = this.mesh(this.scene, new THREE.PlaneGeometry(180, 180), this.groundMaterial, 0, -0.07, 0);
    ground.rotation.x = -Math.PI / 2;
    const arena = this.mesh(this.scene, new THREE.PlaneGeometry(26, 26), this.arenaMaterial, 0, -0.02, 0);
    arena.rotation.x = -Math.PI / 2;
    this.hubDecor = new THREE.Group();
    this.meadowDecor = new THREE.Group();
    this.scene.add(this.hubDecor, this.meadowDecor);
    const pathMat = material('#b6bd7e');
    for (let i = 0; i < 18; i++) {
      const patch = this.mesh(this.hubDecor, new THREE.CircleGeometry(1.35 + Math.sin(i) * 0.25, 9), pathMat, Math.sin(i * 0.35) * 0.55, 0.002 + i * 0.0001, 11 - i * 1.3);
      patch.rotation.x = -Math.PI / 2;
    }
    const stone = material('#809084');
    const darkStone = material('#627c70');
    const trunk = material('#7d6550');
    const leaf = [material('#477c55'), material('#609454'), material('#79a75c')];
    for (const o of MAPS.meadow.obstacles) {
      const base = this.mesh(this.meadowDecor, new THREE.CylinderGeometry(o.radius, o.radius, 0.15, 10), material('#759352'), o.x, 0.04, o.z);
      if (o.kind === 'rock') {
        const rock = this.mesh(this.meadowDecor, new THREE.DodecahedronGeometry(1, 0), stone, o.x, o.radius * 0.55, o.z);
        rock.scale.set(o.radius * 0.95, o.radius * 0.85, o.radius * 0.95);
        rock.rotation.set(0.2, o.x, 0.2);
        this.mesh(this.meadowDecor, new THREE.DodecahedronGeometry(0.35, 0), darkStone, o.x + 0.6, 0.2, o.z + 0.55);
      } else {
        this.mesh(this.meadowDecor, new THREE.CylinderGeometry(0.2, 0.37, 2.3, 7), trunk, o.x, 1.15, o.z);
        for (let j = 0; j < 3; j++) this.mesh(this.meadowDecor, new THREE.ConeGeometry(1.55 - j * 0.3, 1.65, 7), leaf[j], o.x, 2.1 + j * 0.85, o.z);
      }
      base.receiveShadow = true;
    }
    this.buildHubMap();
    const boundary = material('#d1d4a1');
    for (let i = -13; i <= 13; i += 2) {
      for (const [x, z] of [[i, -13], [i, 13], [-13, i], [13, i]]) this.mesh(this.scene, new THREE.DodecahedronGeometry(0.27), boundary, x, 0.15, z);
    }
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-13, 0.03, -13), new THREE.Vector3(13, 0.03, -13), new THREE.Vector3(13, 0.03, 13), new THREE.Vector3(-13, 0.03, 13),
    ]), new THREE.LineBasicMaterial({ color: '#e0dcac' }));
    this.scene.add(line);
    this.portals = new THREE.Group();
    const makePortal = (x, z, color, labelColor) => {
      const group = new THREE.Group();
      const disc = this.mesh(group, new THREE.CylinderGeometry(1.25, 1.4, 0.09, 32), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, transparent: true, opacity: 0.86 }), 0, 0.04, 0);
      disc.castShadow = false;
      const ring = this.mesh(group, new THREE.TorusGeometry(1.25, 0.11, 8, 32), material(labelColor), 0, 0.11, 0);
      ring.rotation.x = Math.PI / 2;
      group.position.set(x, 0, z); this.portals.add(group); return group;
    };
    this.playPortal = makePortal(B.portal.playX, B.portal.playZ, '#63dbeb', '#e7ffff');
    this.upgradePortal = makePortal(B.portal.upgradeX, B.portal.upgradeZ, '#df80f2', '#ffeaff');
    this.scene.add(this.portals);
    this.frostDecor = new THREE.Group();
    const ice = [material('#a9efff'), material('#71bce8'), material('#d9c9ff')];
    for (const [index, point] of [[-10,-9],[-9,-3],[-10,8],[-5,10],[4,10],[9,7],[10,-6],[5,-10]].entries()) {
      const [x, z] = point;
      for (let shard = 0; shard < 3; shard++) {
        const crystal = this.mesh(this.frostDecor, new THREE.OctahedronGeometry(0.28 + shard * 0.09, 0), ice[(index + shard) % ice.length], x + shard * 0.34, 0.35 + shard * 0.16, z + (shard % 2) * 0.25);
        crystal.scale.y = 1.8 + shard * 0.35;
      }
    }
    for (const [index, o] of MAPS.frost.obstacles.entries()) {
      if (o.kind === 'crystal') {
        for (let shard = 0; shard < 4; shard++) {
          const crystal = this.mesh(this.frostDecor, new THREE.OctahedronGeometry(0.42 + shard * 0.08, 0), ice[(index + shard) % ice.length], o.x + (shard - 1.5) * 0.28, 0.65 + shard * 0.2, o.z + Math.sin(shard) * 0.35);
          crystal.scale.set(0.75, 2.2 + shard * 0.35, 0.75);
          crystal.rotation.z = (shard - 1.5) * 0.12;
        }
      } else {
        const boulder = this.mesh(this.frostDecor, new THREE.DodecahedronGeometry(1, 0), material('#87a7b1'), o.x, o.radius * 0.55, o.z);
        boulder.scale.set(o.radius, o.radius * 0.75, o.radius);
        this.mesh(this.frostDecor, new THREE.ConeGeometry(o.radius * 0.85, 0.5, 7), material('#dff4f4'), o.x - 0.1, o.radius + 0.15, o.z);
      }
    }
    const frozenWater = this.mesh(this.frostDecor, new THREE.PlaneGeometry(4.2, 24), new THREE.MeshStandardMaterial({ color: '#7fd4e8', roughness: 0.28, metalness: 0.15, transparent: true, opacity: 0.78 }), 9.8, 0.012, 0);
    frozenWater.rotation.x = -Math.PI / 2;
    frozenWater.rotation.z = -0.08;
    this.frostDecor.visible = false;
    this.scene.add(this.frostDecor);
    // Deterministic scenery uses no gameplay randomness or external textures.
    let seed = 24;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const grass = material('#709b55');
    const flowers = [material('#f2dea0'), material('#e5b19b')];
    for (let i = 0; i < 360; i++) {
      const x = (random() - 0.5) * 34;
      const z = (random() - 0.5) * 34;
      if (Math.abs(x) < 1.8 || !MAPS.meadow.obstacles.every(o => Math.hypot(x - o.x, z - o.z) > o.radius + 0.4)) continue;
      const tuft = this.mesh(this.meadowDecor, new THREE.ConeGeometry(0.09, 0.25 + random() * 0.2, 3), grass, x, 0.12, z);
      tuft.castShadow = false;
      if (i % 6 === 0) this.mesh(this.meadowDecor, new THREE.IcosahedronGeometry(0.09, 0), flowers[i % 2], x, 0.3, z);
    }
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2;
      const hill = this.mesh(this.scene, new THREE.IcosahedronGeometry(4, 0), material(i % 2 ? '#75a278' : '#8db086'), Math.sin(a) * 35, 0, Math.cos(a) * 35);
      hill.scale.set(1.8, 1, 1.4);
    }
  }
  buildHubMap() {
    const mortar = material('#59615e');
    const stone = [material('#8c918b'), material('#777f7a'), material('#a2a39a')];
    for (let x = -11; x <= 11; x += 2) for (let z = -11; z <= 11; z += 2) {
      const tile = this.mesh(this.hubDecor, new THREE.BoxGeometry(1.86, 0.12, 1.86), stone[(Math.abs(x * 3 + z)) % stone.length], x + (z % 4 ? 0.18 : -0.12), 0.015, z);
      tile.rotation.y = ((x + z) % 3) * 0.012;
      tile.receiveShadow = true;
    }
    const wall = (x, z, width, depth) => this.mesh(this.hubDecor, new THREE.BoxGeometry(width, 1.45, depth), mortar, x, 0.7, z);
    wall(0, -12.35, 25, 0.75); wall(-12.35, 0, 0.75, 25); wall(12.35, 0, 0.75, 25);
    for (let i = -11; i <= 11; i += 2) {
      for (const [x, z] of [[i, -12.35], [-12.35, i], [12.35, i]]) this.mesh(this.hubDecor, new THREE.BoxGeometry(0.95, 0.7, 0.95), stone[Math.abs(i) % 3], x, 1.72, z);
    }
    for (const o of MAPS.hub.obstacles.filter(entry => entry.kind === 'tower')) {
      this.mesh(this.hubDecor, new THREE.CylinderGeometry(1.35, 1.55, 3.2, 10), mortar, o.x, 1.55, o.z);
      this.mesh(this.hubDecor, new THREE.ConeGeometry(1.65, 1.5, 10), material('#70443b'), o.x, 3.9, o.z);
    }
    const well = MAPS.hub.obstacles.find(entry => entry.kind === 'well');
    this.mesh(this.hubDecor, new THREE.CylinderGeometry(1, 1.15, 0.85, 12, 1, true), mortar, well.x, 0.43, well.z);
    const water = this.mesh(this.hubDecor, new THREE.CircleGeometry(0.88, 16), new THREE.MeshStandardMaterial({ color: '#62b9c7', emissive: '#256573', emissiveIntensity: 0.18 }), well.x, 0.47, well.z);
    water.rotation.x = -Math.PI / 2;
    for (const x of [-0.62, 0.62]) this.mesh(this.hubDecor, new THREE.CylinderGeometry(0.08, 0.1, 1.8, 7), material('#5b4231'), well.x + x, 1.35, well.z);
    this.mesh(this.hubDecor, new THREE.BoxGeometry(1.55, 0.12, 0.16), material('#5b4231'), well.x, 2.18, well.z);
    const bannerMat = new THREE.MeshStandardMaterial({ color: '#7f3150', roughness: 0.85, side: THREE.DoubleSide });
    for (const x of [-7.5, 7.5]) {
      this.mesh(this.hubDecor, new THREE.CylinderGeometry(0.07, 0.07, 3.4, 6), material('#4b392e'), x, 1.7, -10.9);
      const banner = this.mesh(this.hubDecor, new THREE.PlaneGeometry(1.3, 1.8), bannerMat, x, 2.25, -10.82);
      banner.rotation.y = Math.PI;
    }
  }
  buildPlayer() {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const coat = material('#32677a');
    const skin = material('#f0cb97');
    const boots = material('#334c49');
    this.mesh(body, new THREE.CylinderGeometry(0.3, 0.42, 0.75, 6), coat, 0, 0.86, 0);
    this.mesh(body, new THREE.BoxGeometry(0.2, 0.4, 0.24), boots, -0.18, 0.25, 0);
    this.mesh(body, new THREE.BoxGeometry(0.2, 0.4, 0.24), boots, 0.18, 0.25, 0);
    this.mesh(body, new THREE.IcosahedronGeometry(0.29, 1), skin, 0, 1.45, 0);
    this.mesh(body, new THREE.ConeGeometry(0.38, 0.34, 6), coat, 0, 1.73, -0.02);
    this.mesh(body, new THREE.BoxGeometry(0.22, 0.1, 0.08), boots, 0, 1.45, 0.26);
    this.mesh(body, new THREE.BoxGeometry(0.65, 0.12, 0.44), material('#c4aa6f'), 0, 0.6, 0);
    const cape = this.mesh(body, new THREE.PlaneGeometry(0.62, 0.92), material('#7f3150'), 0, 0.94, -0.31);
    cape.rotation.x = -0.08;
    const sword = new THREE.Group();
    sword.position.set(-0.46, 0.88, 0.12);
    const swordBlade = material('#e7f0db');
    this.mesh(sword, new THREE.BoxGeometry(0.12, 0.08, 1.05), swordBlade, 0, 0, 0.48);
    this.mesh(sword, new THREE.BoxGeometry(0.42, 0.12, 0.1), material('#dec587'), 0, 0, 0.06);
    body.add(sword);
    this.mesh(body, new THREE.CylinderGeometry(0.26, 0.26, 0.12, 8), coat, 0.45, 0.85, 0.1).rotation.x = Math.PI / 2;
    const shield = this.mesh(body, new THREE.CylinderGeometry(0.3, 0.3, 0.09, 8), material('#b7904d'), 0.46, 0.87, 0.15);
    shield.rotation.z = Math.PI / 2;
    return { root, body, sword, swordBlade, flashMaterials: [coat, skin] };
  }
  buildEnemy() {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const fur = material('#ba755a');
    const dark = material('#654d43');
    this.mesh(body, new THREE.IcosahedronGeometry(0.7, 1), fur, 0, 0.67, 0).scale.set(1, 0.85, 1.15);
    const muzzle = material('#e2b184');
    this.mesh(body, new THREE.DodecahedronGeometry(0.37), muzzle, 0, 0.65, 0.62);
    for (const x of [-0.28, 0.28]) {
      this.mesh(body, new THREE.ConeGeometry(0.18, 0.48, 4), dark, x, 1.26, 0.25);
      this.mesh(body, new THREE.SphereGeometry(0.07, 6, 4), material('#292f2b'), x, 0.94, 0.54);
      for (const z of [-0.36, 0.36]) this.mesh(body, new THREE.BoxGeometry(0.19, 0.29, 0.19), dark, x, 0.2, z);
    }
    for (const z of [-0.4, -0.05, 0.3]) this.mesh(body, new THREE.ConeGeometry(0.18, 0.38, 4), material('#688b54'), 0, 1.18, z);
    return { root, body, fur, dark, muzzle, type: null, flashMaterials: [fur] };
  }
  syncDrops(run) {
    const active = new Set(run.drops.map(drop => drop.id));
    for (const [id, view] of this.dropViews) {
      if (active.has(id)) continue;
      this.scene.remove(view);
      view.traverse(node => { node.geometry?.dispose(); node.material?.dispose?.(); });
      this.dropViews.delete(id);
    }
    for (const drop of run.drops) {
      let view = this.dropViews.get(drop.id);
      if (!view) {
        const item = itemDefinition(drop.key);
        view = new THREE.Group();
        const aura = this.mesh(view, new THREE.CylinderGeometry(0.5, 0.62, 0.08, 8), new THREE.MeshBasicMaterial({ color: item.color, transparent: true, opacity: 0.5 }), 0, 0.08, 0);
        aura.castShadow = false;
        this.mesh(view, new THREE.OctahedronGeometry(0.3, 0), material(item.color), 0, 0.58, 0);
        const beam = this.mesh(view, new THREE.CylinderGeometry(0.035, 0.12, 1.6, 6), new THREE.MeshBasicMaterial({ color: item.color, transparent: true, opacity: 0.28 }), 0, 0.82, 0);
        beam.castShadow = false;
        this.scene.add(view); this.dropViews.set(drop.id, view);
      }
      view.position.set(drop.x, 0, drop.z);
      view.rotation.y = run.time * 1.8 + drop.spin;
      view.children[1].position.y = 0.58 + Math.sin(run.time * 4 + drop.spin) * 0.1;
    }
  }
  render(run, dt, snap = false) {
    const p = run.player;
    const activeIds = new Set(run.enemies.map(enemy => enemy.id));
    for (const [id, view] of this.enemyViews) {
      if (activeIds.has(id)) continue;
      this.scene.remove(view.root); view.root.traverse(node => { node.geometry?.dispose(); node.material?.dispose?.(); }); this.enemyViews.delete(id);
    }
    for (const enemy of run.enemies) {
      let view = this.enemyViews.get(enemy.id);
      if (!view) { view = this.buildEnemy(); view.type = enemy.type; view.fur.color.set(enemy.color); view.dark.color.set(enemy.accent); view.muzzle.color.set(enemy.accent); const scale = enemy.boss ? 1.55 : enemy.type === 'golem' || enemy.type === 'mammoth' ? 1.18 : enemy.type === 'hare' || enemy.type === 'wolf' ? 0.86 : 1; view.root.scale.setScalar(scale); this.enemyViews.set(enemy.id, view); this.scene.add(view.root); }
    }
    for (const [actor, view] of [[p, this.player], ...run.enemies.map(enemy => [enemy, this.enemyViews.get(enemy.id)])]) {
      view.root.position.set(actor.x, 0, actor.z);
      view.root.rotation.y = actor.facing;
      view.flashMaterials.forEach(mat => { mat.emissive.set(actor.flash > 0 ? '#ffcfb0' : '#000000'); mat.emissiveIntensity = actor.flash > 0 ? 1 : 0; });
    }
    this.player.body.rotation.z = 0;
    this.player.body.position.y = p.moving ? Math.sin(run.time * 16) * 0.045 : 0;
    const stage = attackStage(p.attack);
    this.player.sword.rotation.y = stage === 'windup' ? -1.3 : stage === 'active' ? -1.3 + ((p.attack.elapsed - B.player.windup) / B.player.active) * 2.6 : 0;
    this.swing.visible = stage === 'active';
    this.swing.position.set(p.x, 0.07, p.z);
    this.swing.rotation.y = p.attack?.facing ?? p.facing;
    for (const enemy of run.enemies) { const view = this.enemyViews.get(enemy.id); view.root.visible = enemy.mode !== 'defeated'; view.body.rotation.z = enemy.mode === 'defeated' ? Math.PI / 2 : 0; view.body.scale.setScalar(enemy.mode === 'windup' ? 1 + Math.sin(run.time * 25) * 0.07 : 1); }
    const warningEnemy = run.enemies.find(enemy => enemy.mode === 'windup');
    this.warning.visible = Boolean(warningEnemy);
    if (warningEnemy) this.warning.position.set(warningEnemy.x, 0.06, warningEnemy.z);
    this.syncDrops(run);
    const weaponId = run.equipped.weapon;
    const weapon = weaponId && run.inventory.find(item => item.id === weaponId);
    this.player.swordBlade.color.set(weapon ? itemDefinition(weapon.key, weapon.level).color : '#e7f0db');
    const biome = biomeDefinition(run.biome);
    this.scene.background.set(run.status === 'hub' ? '#91a6a0' : biome.fog); this.scene.fog.color.copy(this.scene.background);
    this.groundMaterial.color.set(run.status === 'hub' ? '#526b61' : biome.world); this.arenaMaterial.color.set(run.status === 'hub' ? '#747b76' : biome.ground);
    this.hubDecor.visible = run.status === 'hub';
    this.meadowDecor.visible = run.status === 'playing' && run.biome === 'meadow';
    this.portals.visible = run.status === 'hub';
    this.frostDecor.visible = run.status === 'playing' && run.biome === 'frost';
    this.playPortal.rotation.y = run.time * 0.35; this.upgradePortal.rotation.y = -run.time * 0.35;
    const target = new THREE.Vector3(p.x, 0, p.z - 0.8);
    if (snap) this.focus.copy(target);
    else this.focus.lerp(target, 1 - Math.exp(-6 * dt));
    this.camera.position.copy(this.focus).add(new THREE.Vector3(0, 16, 16));
    this.camera.lookAt(this.focus);
    this.renderer.render(this.scene, this.camera);
  }
  destroy() {
    window.removeEventListener('resize', this.resize);
    this.scene.traverse(node => {
      node.geometry?.dispose();
      if (node.material) (Array.isArray(node.material) ? node.material : [node.material]).forEach(mat => mat.dispose());
    });
    this.renderer.dispose();
  }
}
