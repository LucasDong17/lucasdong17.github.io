import { BALANCE, MAPS } from '../data/balance.js';

export class World {
  constructor() { this.half = BALANCE.arenaHalf; this.setMap('hub'); }
  setMap(key) { this.map = MAPS[key] || MAPS.meadow; this.obstacles = this.map.obstacles; }
  valid(x, z, radius) {
    return Math.abs(x) <= this.half - radius && Math.abs(z) <= this.half - radius &&
      this.obstacles.every(o => Math.hypot(x - o.x, z - o.z) >= radius + o.radius - 1e-7);
  }
  move(actor, dx, dz) {
    // Short substeps prevent tunnelling; projection permits sliding around round blockers.
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (actor.radius * 0.5)));
    for (let i = 0; i < steps; i++) {
      let x = actor.x + dx / steps;
      let z = actor.z + dz / steps;
      for (let pass = 0; pass < 3; pass++) {
        const edge = this.half - actor.radius;
        x = Math.max(-edge, Math.min(edge, x));
        z = Math.max(-edge, Math.min(edge, z));
        for (const o of this.obstacles) {
          const distance = Math.hypot(x - o.x, z - o.z);
          const separation = actor.radius + o.radius;
          if (distance < separation) {
            const nx = distance > 1e-8 ? (x - o.x) / distance : 1;
            const nz = distance > 1e-8 ? (z - o.z) / distance : 0;
            x = o.x + nx * separation;
            z = o.z + nz * separation;
          }
        }
      }
      if (this.valid(x, z, actor.radius)) { actor.x = x; actor.z = z; }
    }
  }
  spawn(player, index, occupied = []) {
    const spawns = this.map.spawns.length ? this.map.spawns : MAPS.meadow.spawns;
    for (let i = 0; i < spawns.length; i++) {
      const point = spawns[(index + i) % spawns.length];
      if (this.valid(point.x, point.z, BALANCE.enemy.radius) && Math.hypot(point.x - player.x, point.z - player.z) > 3 && occupied.every(other => Math.hypot(point.x - other.x, point.z - other.z) > 1.5)) return point;
    }
    return spawns.reduce((best, p) => Math.hypot(p.x - player.x, p.z - player.z) > Math.hypot(best.x - player.x, best.z - player.z) ? p : best);
  }
}
