// js/systems/effects/GGD_Clockmaker.js
// G+G+D: Stage timer depletes 2x faster. Killing an enemy adds 6 seconds.

export default class GGDEffect {
  constructor(scene) {
    this.scene = scene;
    this._tickAccum = 0;
  }

  /** Extra timer depletion: 1 additional second every 1000ms */
  update(delta) {
    this._tickAccum += delta;
    while (this._tickAccum >= 1000) {
      this._tickAccum -= 1000;
      if (this.scene.timeRemaining > 0) {
        this.scene.timeRemaining--;
      }
    }
  }

  /** +6 seconds to the stage timer per kill */
  onEnemyKilled() {
    this.scene.timeRemaining += 6;
  }

  reset() {
    this._tickAccum = 0;
  }
}
