// js/systems/effects/ADD_ShockAbsorber.js
// A+DD: 40% wall/slam damage reduction, wall rebound

export default class ADDEffect {
  constructor(scene) {
    this.scene = scene;
    this.mitigated = 0;
  }

  getDamageReduction() {
    return 0.4;
  }

  reset() {
    this.mitigated = 0;
  }
}
