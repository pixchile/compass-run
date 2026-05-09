// js/systems/effects/DDC_SandKing.js
// D+D+C: Slam level 3 applies bonus damage, +3 per enemy in radius

import { SLAM } from '../../constants.js';

export default class DDCEffect {
  constructor(scene) {
    this.scene = scene;
  }

  applySandKingBonus(slamX, slamY, baseDamage, enemyManager, now) {
    const radius = SLAM.RADIUS * SLAM.SANDKING_RADIUS_MULT;
    const enemies = enemyManager.enemies;
    let count = 0;
    const hits = [];
    for (const e of enemies) {
      if (Math.hypot(e.x - slamX, e.y - slamY) <= radius) { hits.push(e); count++; }
    }
    const bonus = baseDamage + count * 3;
    const sandNow = (now ?? this.scene?.time?.now ?? Date.now()) + 30;
    for (let i = hits.length - 1; i >= 0; i--) {
      const e = hits[i];
      if (e.receiveDamage) e.receiveDamage({ type: 'slam3', baseDamage: bonus, now: sandNow });
    }
  }

  reset() {}
}
