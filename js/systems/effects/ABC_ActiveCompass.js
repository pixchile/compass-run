// js/systems/effects/ABC_ActiveCompass.js
// A+B+C: Dash in compass direction grants stacks

export default class ABCEffect {
  constructor(scene) {
    this.scene = scene;
  }

  onDashInCompassDir(player, momentum, isPrimary) {
    const stacks = isPrimary ? 10 : 20;
    momentum.addStacks(stacks);
  }

  reset() {}
}
