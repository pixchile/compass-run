import { REWARDS } from '../constants.js';

export default class RewardSystem {
  constructor() {
    this.killCount   = 0;      // NÚMERO DE ENEMIGOS ELIMINADOS (Para aumentar cap de velocidad)
    this.credits     = 0;      // Créditos acumulados (float interno, mostrar Math.floor)
    this._tickTimer  = 0;      // Acumulador para ticks de crédito
    this._creditAccum = 0;     // Créditos acumulados en el segundo actual
    this._secTimer   = 0;      // Para sumar el +1 base cada segundo
  }

  // Llamar cuando un enemigo muere (cualquier tipo)
  onEnemyKilled(enemyType) {
    this.killCount += 1;
  }

  // Llamar cada frame desde Game.js
  update(delta, player) {
    const speed = Math.hypot(player.vx, player.vy);

    // ─── Ticks de velocidad (10 veces por segundo) ─────────────────────
    this._tickTimer += delta;
    while (this._tickTimer >= REWARDS.CREDIT_TICK_RATE) {
      this._tickTimer  -= REWARDS.CREDIT_TICK_RATE;
      this._creditAccum += speed * REWARDS.CREDIT_SPEED_FACTOR;
    }

    // ─── +1 base por segundo ───────────────────────────────────────────
    this._secTimer += delta;
    while (this._secTimer >= 1000) {
      this._secTimer   -= 1000;
      this.credits     += REWARDS.CREDIT_BASE_PER_SEC + this._creditAccum;
      this._creditAccum = 0;
    }
  }

  // Resetear al terminar una etapa
  reset() {
    this.killCount    = 0;
    this.credits      = 0;
    this._tickTimer   = 0;
    this._creditAccum = 0;
    this._secTimer    = 0;
  }

  // Créditos enteros para mostrar en UI
  get displayCredits() { return Math.floor(this.credits); }
}