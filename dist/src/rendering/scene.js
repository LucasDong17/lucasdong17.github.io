import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { BALANCE as B, itemDefinition } from '../data/balance.js';
import { attackStage } from '../systems/simulation.js';

const material = color => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });

export class SceneView {
  constructor(canvas, world) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    this.buildWorld(world);
    this.player = this.buildPlayer();
    this.enemy = this.buildEnemy();
    this.scene.add(this.player.root, this.enemy.root);
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
    const ground = this.mesh(this.scene, new THREE.PlaneGeometry(180, 180), material('#83ad62'), 0, -0.07, 0);
    ground.rotation.x = -Math.PI / 2;
    const arena = this.mesh(this.scene, new THREE.PlaneGeometry(26, 26), material('#95b968'), 0, -0.02, 0);
    arena.rotation.x = -Math.PI / 2;
    const pathMat = material('#b6bd7e');
    for (let i = 0; i < 18; i++) {
      const patch = this.mesh(this.scene, new THREE.CircleGeometry(1.35 + Math.sin(i) * 0.25, 9), pathMat, Math.sin(i * 0.35) * 0.55, 0.002 + i * 0.0001, 11 - i * 1.3);
      patch.rotation.x = -Math.PI / 2;
    }
    const stone = material('#809084');
    const darkStone = material('#627c70');
    const trunk = material('#7d6550');
    const leaf = [material('#477c55'), material('#609454'), material('#79a75c')];
    for (const o of world.obstacles) {
      const base = this.mesh(this.scene, new THREE.CylinderGeometry(o.radius, o.radius, 0.15, 10), material('#759352'), o.x, 0.04, o.z);
      if (o.kind === 'rock') {
        const rock = this.mesh(this.scene, new THREE.DodecahedronGeometry(1, 0), stone, o.x, o.radius * 0.55, o.z);
        rock.scale.set(o.radius * 0.95, o.radius * 0.85, o.radius * 0.95);
        rock.rotation.set(0.2, o.x, 0.2);
        this.mesh(this.scene, new THREE.DodecahedronGeometry(0.35, 0), darkStone, o.x + 0.6, 0.2, o.z + 0.55);
      } else {
        this.mesh(this.scene, new THREE.CylinderGeometry(0.2, 0.37, 2.3, 7), trunk, o.x, 1.15, o.z);
        for (let j = 0; j < 3; j++) this.mesh(this.scene, new THREE.ConeGeometry(1.55 - j * 0.3, 1.65, 7), leaf[j], o.x, 2.1 + j * 0.85, o.z);
      }
      base.receiveShadow = true;
    }
    const boundary = material('#d1d4a1');
    for (let i = -13; i <= 13; i += 2) {
      for (const [x, z] of [[i, -13], [i, 13], [-13, i], [13, i]]) this.mesh(this.scene, new THREE.DodecahedronGeometry(0.27), boundary, x, 0.15, z);
    }
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-13, 0.03, -13), new THREE.Vector3(13, 0.03, -13), new THREE.Vector3(13, 0.03, 13), new THREE.Vector3(-13, 0.03, 13),
    ]), new THREE.LineBasicMaterial({ color: '#e0dcac' }));
    this.scene.add(line);
    // Deterministic scenery uses no gameplay randomness or external textures.
    let seed = 24;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const grass = material('#709b55');
    const flowers = [material('#f2dea0'), material('#e5b19b')];
    for (let i = 0; i < 360; i++) {
      const x = (random() - 0.5) * 34;
      const z = (random() - 0.5) * 34;
      if (Math.abs(x) < 1.8 || !world.obstacles.every(o => Math.hypot(x - o.x, z - o.z) > o.radius + 0.4)) continue;
      const tuft = this.mesh(this.scene, new THREE.ConeGeometry(0.09, 0.25 + random() * 0.2, 3), grass, x, 0.12, z);
      tuft.castShadow = false;
      if (i % 6 === 0) this.mesh(this.scene, new THREE.IcosahedronGeometry(0.09, 0), flowers[i % 2], x, 0.3, z);
    }
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2;
      const hill = this.mesh(this.scene, new THREE.IcosahedronGeometry(4, 0), material(i % 2 ? '#75a278' : '#8db086'), Math.sin(a) * 35, 0, Math.cos(a) * 35);
      hill.scale.set(1.8, 1, 1.4);
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
    const sword = new THREE.Group();
    sword.position.set(-0.46, 0.88, 0.12);
    const swordBlade = material('#e7f0db');
    this.mesh(sword, new THREE.BoxGeometry(0.12, 0.08, 1.05), swordBlade, 0, 0, 0.48);
    this.mesh(sword, new THREE.BoxGeometry(0.42, 0.12, 0.1), material('#dec587'), 0, 0, 0.06);
    body.add(sword);
    this.mesh(body, new THREE.CylinderGeometry(0.26, 0.26, 0.12, 8), coat, 0.45, 0.85, 0.1).rotation.x = Math.PI / 2;
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
    const e = run.enemy;
    if (this.enemy.type !== e.type) {
      this.enemy.type = e.type;
      this.enemy.fur.color.set(e.color);
      this.enemy.dark.color.set(e.accent);
      this.enemy.muzzle.color.set(e.accent);
      const scale = e.boss ? 1.38 : e.type === 'golem' ? 1.16 : e.type === 'wolf' ? 0.88 : 1;
      this.enemy.root.scale.setScalar(scale);
    }
    for (const [actor, view] of [[p, this.player], [e, this.enemy]]) {
      view.root.position.set(actor.x, 0, actor.z);
      view.root.rotation.y = actor.facing;
      view.flashMaterials.forEach(mat => { mat.emissive.set(actor.flash > 0 ? '#ffcfb0' : '#000000'); mat.emissiveIntensity = actor.flash > 0 ? 1 : 0; });
    }
    this.player.body.rotation.z = run.status === 'defeated' ? -Math.PI / 2 : 0;
    this.player.body.position.y = p.moving ? Math.sin(run.time * 16) * 0.045 : 0;
    const stage = attackStage(p.attack);
    this.player.sword.rotation.y = stage === 'windup' ? -1.3 : stage === 'active' ? -1.3 + ((p.attack.elapsed - B.player.windup) / B.player.active) * 2.6 : 0;
    this.swing.visible = stage === 'active';
    this.swing.position.set(p.x, 0.07, p.z);
    this.swing.rotation.y = p.attack?.facing ?? p.facing;
    this.enemy.root.visible = e.mode !== 'defeated';
    this.enemy.body.rotation.z = e.mode === 'defeated' ? Math.PI / 2 : 0;
    this.enemy.body.scale.setScalar(e.mode === 'windup' ? 1 + Math.sin(run.time * 25) * 0.07 : 1);
    this.warning.visible = e.mode === 'windup';
    this.warning.position.set(e.x, 0.06, e.z);
    this.syncDrops(run);
    const weaponId = run.equipped.weapon;
    const weapon = weaponId && run.inventory.find(item => item.id === weaponId);
    this.player.swordBlade.color.set(weapon ? itemDefinition(weapon.key).color : '#e7f0db');
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
