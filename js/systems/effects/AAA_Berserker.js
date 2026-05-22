// js/systems/effects/AAA_Berserker.js
// Triple A: +damage when low HP, +3 HP cost on dash/slam

export default class AAAEffect {
  constructor(scene) {
    this.scene = scene;
  }

  getMultiplier(player) {
    const maxHp = player.health.maxHp || 50;
    const hp = player.health.hp || 0;
    const missing = Math.max(0, maxHp - hp);
    return 1 + Math.min(1, missing / (maxHp * 0.75));
  }

  getCost(player) {
    const maxHp = player.health.maxHp || 50;
    return (player.health.hp || 0) >= maxHp * 0.5 ? 3 : 0;
  }

  reset() {}
}
