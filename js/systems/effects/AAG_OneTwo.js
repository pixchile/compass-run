// js/systems/effects/AAG_OneTwo.js
// A+A+G: Every 2nd dash deals 25% of previous dash's total accumulated damage as true damage

export default class AAGEffect {
  constructor(scene) {
    this.scene = scene;
    this._dashCount = 0;
    this._storedDamage = 0;
    this._bonusPending = 0;
    this._bonusConsumed = false;
  }

  /** Called once when a dash begins */
  onDashStarted() {
    this._dashCount++;
    if (this._dashCount % 2 === 0) {
      // Bonus dash: 25% of previous dash's total accumulated damage
      this._bonusPending = this._storedDamage * 0.25;
      this._bonusConsumed = false;
    } else {
      // Record dash: reset accumulator
      this._storedDamage = 0;
      this._bonusPending = 0;
    }
  }

  /** Called each time damage is dealt to an enemy during a record dash */
  accumulateDamage(amount) {
    if (this._dashCount % 2 === 1 && this._bonusPending === 0) {
      this._storedDamage += amount;
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
