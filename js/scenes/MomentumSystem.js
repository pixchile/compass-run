// js/scenes/MomentumSystem.js
import { L2, L3, SMAX, MAX_SPD, ATTACK_RADIOS, MOMENTUM_GAIN_PER_250_SPEED } from '../constants.js';

export default class MomentumSystem {
  constructor() {
    this.stacks = 0;
    this._maxSpeedBonus = 0;
    this._l2Margin = 5;

    // Pérdida pasiva
    this._lastActionTime = Date.now();
    this._decayAccum = 0;
  }

  // ─── Getters de nivel ───────────────────────────────────────
  get l2Min() { return 50 - (this._l2Margin - 5); }
  get l2Max() { return 80 + (this._l2Margin - 5); }

  get level() {
    if (this.stacks > this.l2Max) return 3;
    if (this.stacks >= this.l2Min) return 2;
    return 1;
  }

  get lColor() { return this.level === 1 ? 0x4488ff : this.level === 2 ? 0xffaa22 : 0xff3322; }
  get lHex()   { return ['','#4488ff','#ffaa22','#ff3322'][this.level]; }

  getAttackRadius() {
    return ATTACK_RADIOS[this.level] || ATTACK_RADIOS[1];
  }

  getDamageMultiplier() {
    const multipliers = { 1: 1.0, 2: 1.15, 3: 1.3 };
    return multipliers[this.level] || 1.0;
  }

  getEffectiveMaxSpeed(level) {
    if (this._maxSpeedOverride) return this._maxSpeedOverride;
    return (MAX_SPD[level] || 300) + this._maxSpeedBonus;
  }

  // ─── Modificadores de permanentes ──────────────────────────
  addMaxSpeed(amount) {
    this._maxSpeedBonus += amount;
  }

  addAmplitude(amount) {
    this._l2Margin += amount;
    if (this._l2Margin > 45) this._l2Margin = 45;
    if (this._l2Margin < 5) this._l2Margin = 5;
  }

  // ─── Stacks ────────────────────────────────────────────────
  addStacks(amount) {
    const bonus = this._stackRateBonus || 0;
    const malus = this._stackRateMalus || 0;
    const final = amount * (1 + bonus) * (1 - malus);
    this.stacks = Math.min(SMAX, this.stacks + final);
    this._lastActionTime = Date.now();
    this._decayAccum = 0;
  }

  gainFromSpeed(delta, currentSpeed, maxSpeed) {
    if (this.level > 1) return;
    if (currentSpeed >= maxSpeed * 0.95) {
      const gain = MOMENTUM_GAIN_PER_250_SPEED * (maxSpeed / 250) * (delta / 1000);
      this.stacks = Math.min(SMAX, this.stacks + gain);
      this._lastActionTime = Date.now();
      this._decayAccum = 0;
    }
  }

  consumeStacks(amount) {
    if (this.stacks < amount) return false;
    this.stacks = Math.max(0, Math.min(SMAX, this.stacks - amount));
    return true;
  }

  halveStacks() {
    this.stacks = Math.max(0, Math.floor(this.stacks / 1.5));
  }

  reset() {
    this.stacks = 0;
    this._lastActionTime = Date.now();
    this._decayAccum = 0;
  }

  // ─── Pérdida pasiva por inactividad ────────────────────────
  updateDecay(delta, now = Date.now()) {
    const inactivity = now - this._lastActionTime;
    if (inactivity >= 3000 && this.stacks > 0) {
      this._decayAccum += delta;
      const decayRate = this.level === 3 ? 4 : this.level === 2 ? 3 : 2;
      while (this._decayAccum >= 1000) {
        this.stacks = Math.max(0, this.stacks - decayRate);
        this._decayAccum -= 1000;
      }
    }
  }
}