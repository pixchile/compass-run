import { REWARDS, HP_MAX } from '../constants.js';

export default class OrbManager {
  constructor() {
    this.orbs    = [];   // { x, y }  — orbes activos
    this.pending = [];   // { x, y, timer } — esperando el delay de spawn
  }

  // Llamar cuando muere un enemigo tipo 'big'
  scheduleOrb(x, y) {
    this.pending.push({ x, y, timer: REWARDS.ORB_DELAY });
  }

  // Llamar cada frame desde Game.js
  update(delta, player) {
    // ─── Procesar pendientes ──────────────────────────────────────────
    for (let i = this.pending.length - 1; i >= 0; i--) {
      this.pending[i].timer -= delta;
      if (this.pending[i].timer <= 0) {
        const { x, y } = this.pending[i];
        this.orbs.push({ x, y });
        this.pending.splice(i, 1);
      }
    }

    // ─── Colisión con jugador ─────────────────────────────────────────
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      if (Math.hypot(player.px - orb.x, player.py - orb.y) > REWARDS.ORB_RADIUS) continue;

      const speed = Math.hypot(player.vx, player.vy);
      const heal  = Math.max(
        REWARDS.ORB_HEAL_MIN,
        Math.min(REWARDS.ORB_HEAL_MAX, speed * REWARDS.ORB_HEAL_MAX / REWARDS.ORB_HEAL_SPEED_CAP)
      );
      player.hp = Math.min(HP_MAX, player.hp + heal);
      this.orbs.splice(i, 1);
    }
  }

  // Llamar desde GameRenderer (se pasa el graphics activo con cámara ya aplicada)
  render(g) {
    const pulse = 0.75 + 0.25 * Math.sin(Date.now() / 250);

    for (const orb of this.orbs) {
      // Halo exterior
      g.lineStyle(2, 0x44ff88, 0.3 * pulse);
      g.strokeCircle(orb.x, orb.y, REWARDS.ORB_RADIUS * 1.5);
      // Cuerpo
      g.fillStyle(0x44ff88, 0.7 * pulse);
      g.fillCircle(orb.x, orb.y, REWARDS.ORB_RADIUS);
      // Brillo central
      g.fillStyle(0xaaffcc, 0.9);
      g.fillCircle(orb.x, orb.y, REWARDS.ORB_RADIUS * 0.35);
    }
  }

  reset() {
    this.orbs    = [];
    this.pending = [];
  }
}
