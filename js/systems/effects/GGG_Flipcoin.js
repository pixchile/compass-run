// js/systems/effects/GGG_Flipcoin.js
// G+G+G: Damage multiplier oscillates randomly x0.5-x2.5. High rolls grant credits, low rolls cost credits.

export default class GGGEffect {
  constructor(scene) {
    this.scene = scene;
    this.timer = 0;
    this._multiplier = 1.5;
    this._nextTick = 500;
    this._lockedMult = null;
    this._effectConsumed = false;
  }

  update(delta) {
    this.timer += delta;
    if (this.timer >= this._nextTick) {
      this._multiplier = 0.5 + Math.random() * 2.0;
      this._nextTick = this.timer + 400 + Math.random() * 400;
    }
  }

  lockForAttack() {
    this._lockedMult = this._multiplier;
    this._effectConsumed = false;
  }

  getMultiplier() {
    return this._lockedMult ?? this._multiplier;
  }

  applyCreditEffect(px, py) {
    if (this._effectConsumed) return;
    this._effectConsumed = true;
    const m = this._lockedMult ?? this._multiplier;
    const rewardSys = this.scene?.rewardSystem;
    if (!rewardSys) return;

    if (m > 2.0) {
      const deviation = m - 2.0;
      const reward = Math.floor(25 + (deviation / 0.5) * 25);
      rewardSys.credits += reward;
      if (this.scene?.spawnDamageNumber) {
        this.scene.spawnDamageNumber(px, py + 20, reward, 'creditGain');
      }
    } else if (m < 1.0) {
      const deviation = 1.0 - m;
      const cost = Math.floor(1 + (deviation / 0.5) * 24);
      if (rewardSys.credits >= cost) {
        rewardSys.credits -= cost;
        if (this.scene?.spawnDamageNumber) {
          this.scene.spawnDamageNumber(px, py + 20, -cost, 'creditCost');
        }
      }
    }
  }

  reset() {
    this.timer = 0;
    this._multiplier = 1.5;
    this._nextTick = 500;
    this._lockedMult = null;
    this._effectConsumed = false;
  }
}
