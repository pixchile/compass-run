// js/systems/effects/CCB_Accelerator.js
// C+C+B: Speed cap adds credits * 0.1 on top of base max speed

import { MAX_SPD } from '../../constants.js';

export default class CCBEffect {
  constructor(scene) {
    this.scene = scene;
  }

  update(momentum) {
    const credits = this.scene.rewardSystem?.credits ?? 0;
    const base = (MAX_SPD[momentum.level] || 300) + (momentum._maxSpeedBonus || 0);
    momentum._maxSpeedOverride = base + credits * 0.1;
  }

  reset() {}
}
