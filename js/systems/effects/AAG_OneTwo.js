// js/systems/effects/AAG_OneTwo.js
// A+A+G: Every 2nd dash deals 25% of previous dash's total damage to first enemy hit

export default class AAGEffect {
  constructor(scene) {
    this.scene = scene;
    this._dashCount = 0;
    this._storedDamage = 0;
    this._bonusPending = 0;
    this._bonusConsumed = false;
  }

  /** Called once when a dash begins, with the dash attack's base damage (after all multipliers) */
  onDashStarted(baseDamage) {
    this._dashCount++;
    if (this._dashCount % 2 === 0) {
      // Bonus dash: 25% of previous dash's total damage
      this._bonusPending = this._storedDamage * 0.25;
      this._bonusConsumed = false;
    } else {
      // Record dash: store for next time
      this._storedDamage = baseDamage;
      this._bonusPending = 0;
    }
  }

  /** Returns pending bonus damage and marks it consumed. Only first enemy per bonus dash gets it. */
  consumeBonus() {
    if (!this._bonusPending || this._bonusConsumed) return 0;
    this._bonusConsumed = true;
    return this._bonusPending;
  }

  reset() {
    this._dashCount = 0;
    this._storedDamage = 0;
    this._bonusPending = 0;
    this._bonusConsumed = false;
  }
}
