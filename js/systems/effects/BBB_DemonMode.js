// js/systems/effects/BBB_DemonMode.js
// B+B+B: Aerial dash activates Demon Mode: 1000px/s speed for 2s, killing resets duration

export default class BBBEffect {
  constructor(scene) {
    this.scene = scene;
    this.cooldown = 0;
    this.ready = false;
    this.active = false;
    this.timer = 0;
  }

  update(delta, player, momentum) {
    this.cooldown = Math.max(0, this.cooldown - delta);
    if (this.cooldown <= 0 && !this.ready && !this.active) {
      this.ready = true;
    }
    if (this.active) {
      this.timer -= delta;
      if (this.timer <= 0) this._deactivate(player, momentum);
    }
  }

  onAerialDash(player, momentum) {
    if (!this.ready) return;
    this.ready = false;
    this.active = true;
    this.timer = 2000;
    this.cooldown = 30000;
    momentum._maxSpeedOverride = Math.max(momentum._maxSpeedOverride || 0, 1000);
    player._demonMode = true;
  }

  onEnemyKilledInDemon() {
    if (this.active) this.timer = 2000;
  }

  _deactivate(player, momentum) {
    this.active = false;
    player._demonMode = false;
    if (momentum._maxSpeedOverride === 1000) momentum._maxSpeedOverride = null;
  }

  reset() {
    this.cooldown = 0;
    this.ready = false;
    this.active = false;
    this.timer = 0;
  }
}
