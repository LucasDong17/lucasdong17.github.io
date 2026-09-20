import { BALANCE, OBSTACLES, SPAWNS } from '../data/balance.js';

export class World {
  constructor() { this.half = BALANCE.arenaHalf; this.obstacles = OBSTACLES; }
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
  spawn(player, index) {
    for (let i = 0; i < SPAWNS.length; i++) {
      const point = SPAWNS[(index + i) % SPAWNS.length];
      if (this.valid(point.x, point.z, BALANCE.enemy.radius) && Math.hypot(point.x - player.x, point.z - player.z) > 3) return point;
    }
    return SPAWNS.reduce((best, p) => Math.hypot(p.x - player.x, p.z - player.z) > Math.hypot(best.x - player.x, best.z - player.z) ? p : best);
  }
}
