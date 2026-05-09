// js/systems/effects/GBA_Acrobatic.js
// G+B+A: Every 12s, next air dash makes player undetectable.
// Enemies ignore you and you phase through walls.
// Lasts 4s +1s per dash done while undetectable.

export default class GBAEffect {
  constructor(scene) {
    this.scene = scene;
    this.cooldown = 0;
    this.ready = false;
    this.active = false;
    this.timer = 0;
    this._extensions = 0;
  }

  update(delta, player) {
    if (!this.active) {
      this.cooldown = Math.max(0, this.cooldown - delta);
      if (this.cooldown <= 0 && !this.ready) {
        this.ready = true;
      }
      return;
    }

    this.timer -= delta;
    if (this.timer <= 0) {
      this._deactivate(player);
    }
  }

  /** Called on every air dash. Activates or extends undetectable. */
  onAerialDash(player) {
    if (this.active) {
      this.timer += 1000;
      this._extensions++;
      return;
    }
    if (!this.ready) return;

    this.ready = false;
    this.active = true;
    this.timer = 4000;
    this._extensions = 0;
    player._undetectable = true;
  }

  _deactivate(player) {
    this.active = false;
    this.timer = 0;
    this.cooldown = 12000;
    player._undetectable = false;
  }

  reset() {
    this.cooldown = 0;
    this.ready = false;
    this.active = false;
    this.timer = 0;
    this._extensions = 0;
  }
}
