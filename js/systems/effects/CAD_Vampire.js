// js/systems/effects/CAD_Vampire.js
// C+A+D: 6% chance on kill to spawn healing orb. Move near orb in similar direction for speed buff.

import { closestPointOnLine } from '../GeometryUtils.js';

export default class CADEffect {
  constructor(scene) {
    this.scene = scene;
    this.orbs = [];
  }

  spawnOrb(x, y) {
    if (Math.random() > 0.06) return;
    const angle = Math.random() * Math.PI * 2;
    this.orbs.push({
      x, y,
      vx: Math.cos(angle) * 400,
      vy: Math.sin(angle) * 400,
      life: 20000,
      spawnTimer: 2000,
    });
  }

  update(delta, player) {
    const lines = this.scene?.currentMap?.lines?.filter(l => !l._broken) || [];
    const _cp = { x: 0, y: 0 };

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      orb.life -= delta;
      if (orb.spawnTimer > 0) orb.spawnTimer -= delta;
      if (orb.life <= 0) {
        this.orbs.splice(i, 1);
        continue;
      }

      if (orb.spawnTimer <= 0 && Math.hypot(player.px - orb.x, player.py - orb.y) < 40) {
        const spd = Math.hypot(player.vx, player.vy);
        const heal = Math.max(1, Math.min(25, spd * 25 / 1200));
        player.health?.heal(heal);
        this.orbs.splice(i, 1);
        continue;
      }

      if (Math.hypot(orb.vx, orb.vy) > 0) {
        const dt = delta / 1000;
        orb.x += orb.vx * dt;
        orb.y += orb.vy * dt;

        const R = 6;
        let hitWall = false;
        for (const line of lines) {
          if (!line || line._broken) continue;
          closestPointOnLine({ x: orb.x, y: orb.y }, line.start, line.end, _cp);
          if (Math.hypot(orb.x - _cp.x, orb.y - _cp.y) < R) {
            orb.vx = 0; orb.vy = 0;
            hitWall = true;
            break;
          }
        }
        if (hitWall) {
          for (const line of lines) {
            if (!line || line._broken) continue;
            closestPointOnLine({ x: orb.x, y: orb.y }, line.start, line.end, _cp);
            const dist = Math.hypot(orb.x - _cp.x, orb.y - _cp.y);
            if (dist < R && dist > 0) {
              orb.x += (_cp.x - orb.x) / dist * (R - dist);
              orb.y += (_cp.y - orb.y) / dist * (R - dist);
            }
          }
        }
      }
    }

    // Speed buff: within 600px and moving in similar direction (+-45 deg)
    player._vampireSpeed = false;
    const pSpeed = Math.hypot(player.vx, player.vy);
    if (pSpeed > 10) {
      const pDirX = player.vx / pSpeed;
      const pDirY = player.vy / pSpeed;
      for (const orb of this.orbs) {
        if (Math.hypot(player.px - orb.x, player.py - orb.y) > 900) continue;
        const oSpeed = Math.hypot(orb.vx, orb.vy);
        if (oSpeed < 1) {
          player._vampireSpeed = true;
          break;
        }
        const oDirX = orb.vx / oSpeed;
        const oDirY = orb.vy / oSpeed;
        if (pDirX * oDirX + pDirY * oDirY >= 0.7071) {
          player._vampireSpeed = true;
          break;
        }
      }
    }
  }

  render(g) {
    if (!this.orbs.length) return;
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 200);
    for (const orb of this.orbs) {
      const alpha = orb.spawnTimer > 0 ? 0.3 : 1;
      g.fillStyle(0xaa44ff, 0.5 * pulse * alpha);
      g.fillCircle(orb.x, orb.y, 10);
      g.lineStyle(1.5, 0xcc66ff, 0.7 * pulse * alpha);
      g.strokeCircle(orb.x, orb.y, 12);
      g.fillStyle(0xdd99ff, 0.8 * alpha);
      g.fillCircle(orb.x, orb.y, 4);
    }
  }

  reset() {
    this.orbs = [];
  }
}
