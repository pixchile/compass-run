import { REWARDS } from '../constants.js';

export default class RewardSystem {
  constructor() {
    this.killCount   = 0;
    this.credits     = 0;
    this._tickTimer  = 0;
    this._creditAccum = 0;
    this._secTimer   = 0;
    this.momentum    = null;   // referencia externa
  }

  // Asignar referencia al sistema de momentum
  setMomentumSystem(momentum) {
    this.momentum = momentum;
  }

  onEnemyKilled(enemyType) {
    this.killCount += 1;
    // Notificar actividad al momentum para evitar pérdida pasiva
    if (this.momentum) {
      this.momentum.registerAction(Date.now());
    }
  }

  update(delta, player) {
    const speed = Math.hypot(player.vx, player.vy);

    this._tickTimer += delta;
    while (this._tickTimer >= REWARDS.CREDIT_TICK_RATE) {
      this._tickTimer  -= REWARDS.CREDIT_TICK_RATE;
      this._creditAccum += speed * REWARDS.CREDIT_SPEED_FACTOR;
    }

    this._secTimer += delta;
    while (this._secTimer >= 1000) {
      this._secTimer   -= 1000;
      this.credits     += REWARDS.CREDIT_BASE_PER_SEC + this._creditAccum;
      this._creditAccum = 0;
    }
  }

  reset() {
    this.killCount    = 0;
    this.credits      = 0;
    this._tickTimer   = 0;
    this._creditAccum = 0;
    this._secTimer    = 0;
  }

  get displayCredits() { return Math.floor(this.credits); }
}