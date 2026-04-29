// js/scenes/MomentumSystem.js
import { L2, L3, SMAX, MAX_SPD, ATTACK_RADIOS } from '../constants.js';

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
  get l2Min() { return 40 - (this._l2Margin - 5); }
  get l2Max() { return 50 + (this._l2Margin - 5); }

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
    const multipliers = { 1: 1.0, 2: 1.5, 3: 2.0 };
    return multipliers[this.level] || 1.0;
  }

  getEffectiveMaxSpeed(level) {
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
    this.stacks = Math.min(SMAX, this.stacks + amount);
    this._lastActionTime = Date.now();
    this._decayAccum = 0;
  }

  halveStacks() {
    this.stacks = Math.max(0, Math.floor(this.stacks / 1.5));
  }

  reset() {
    this.stacks = 0;
    this._lastActionTime = Date.now();
    this._decayAccum = 0;
  }

  // ─── Renovación de actividad ───────────────────────────────
  registerAction(now = Date.now()) {
    this._lastActionTime = now;
    this._decayAccum = 0;
  }

  // ─── Pérdida pasiva por inactividad ────────────────────────
  updateDecay(delta, now = Date.now()) {
    const inactivity = now - this._lastActionTime;
    if (inactivity >= 1000 && this.stacks > 0) {
      this._decayAccum += delta;
      while (this._decayAccum >= 1000) {
        this.stacks = Math.max(0, this.stacks - 3);
        this._decayAccum -= 1000;
      }
    }
  }
}