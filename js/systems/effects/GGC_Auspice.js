// js/systems/effects/GGC_Auspice.js
// G+G+C: Item prices drop 1% per enemy killed in the last 10 seconds. No cap.

export default class GGCEffect {
  constructor(scene) {
    this.scene = scene;
    this._kills = []; // timestamps (ms) of recent kills
  }

  /** Record a kill */
  onEnemyKilled() {
    const now = this.scene?.time?.now ?? Date.now();
    this._kills.push(now);
  }

  /** Clean expired entries and return discount fraction (0–1) */
  getDiscount() {
    const now = this.scene?.time?.now ?? Date.now();
    const windowStart = now - 10000;

    // Prune expired
    while (this._kills.length > 0 && this._kills[0] < windowStart) {
      this._kills.shift();
    }

    return Math.min(1, this._kills.length / 100); // 1% per kill, no cap → but Math.min at 1 (100%)
  }

  update() {
    // Prune expired kills each frame (cheap since we shift from front)
    const now = this.scene?.time?.now ?? Date.now();
    const windowStart = now - 10000;
    while (this._kills.length > 0 && this._kills[0] < windowStart) {
      this._kills.shift();
    }
  }

  reset() {
    this._kills = [];
  }
}
