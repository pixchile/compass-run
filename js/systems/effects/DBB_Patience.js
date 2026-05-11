// js/systems/effects/DBB_Patience.js
// D+B+B: After 3s idle (no damage dealt or taken), next hit multiplies true damage up to 10x

export default class DBBEffect {
  constructor(scene) {
    this.scene = scene;
    this.idleTimer = 0;
    this.bonus = 0;
    this.ready = false;
    this.cooldown = 0;
    this.lastMult = 1;
    this._activeMult = 1;
  }

  update(delta, player) {
    if (!player.dashing && !player.combat?.activeSlam) {
      this._activeMult = 1;
    }

    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - delta);
      this.idleTimer = 0;
      this.bonus = 0;
      this.ready = false;
      return;
    }

    const idle = (player._lastDamageTime || 0) < Date.now() - 3000 &&
                 (player._lastInflictTime || 0) < Date.now() - 3000;
    if (idle) {
      this.idleTimer += delta;
      this.bonus = Math.min(900, this.idleTimer / 1000 * 250);
      this.ready = true;
    } else {
      this.idleTimer = 0;
      this.bonus = 0;
      this.ready = false;
    }
  }

  onPlayerTookDamage() {
    this.cooldown = 3000;
    this.idleTimer = 0;
    this.bonus = 0;
    this.ready = false;
  }

  getTrueDamageMultiplier() {
    if (this._activeMult > 1) return this._activeMult;
    if (!this.ready) return 1;

    const mult = 1 + this.bonus / 100;
    this._activeMult = mult;
    this.lastMult = mult;
    this.idleTimer = 0;
    this.bonus = 0;
    this.ready = false;
    this.cooldown = 3000;
    return mult;
  }

  reset() {
    this.idleTimer = 0;
    this.bonus = 0;
    this.ready = false;
    this.cooldown = 0;
    this.lastMult = 1;
    this._activeMult = 1;
  }
}
