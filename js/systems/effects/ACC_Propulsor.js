// js/systems/effects/ACC_Propulsor.js
// A+CC: Double dash speed and distance

export default class ACCEffect {
  constructor(scene) {
    this.scene = scene;
  }

  getDashSpeedMult()     { return 2.0; }
  getDashDistanceMult()  { return 2.0; }

  reset() {}
}
