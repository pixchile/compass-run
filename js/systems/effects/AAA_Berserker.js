// js/systems/effects/AAA_Berserker.js
// Triple A: +damage when low HP, +3 HP cost on dash/slam

export default class AAAEffect {
  constructor(scene) {
    this.scene = scene;
  }

  getMultiplier(player) {
    const hp = player.health.hp || 0;
    const missing = Math.max(0, 100 - hp);
    return 1 + Math.min(1, missing / 75);
  }

  getCost(player) {
    return (player.health.hp || 0) >= 25 ? 3 : 0;
  }

  reset() {}
}
