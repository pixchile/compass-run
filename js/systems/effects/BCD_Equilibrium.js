// js/systems/effects/BCD_Equilibrium.js
// B+C+D: Skid normalizes momentum to level 2

export default class BCDEffect {
  constructor(scene) {
    this.scene = scene;
  }

  onDerape(momentum) {
    const lv = momentum.level;
    if (lv === 3) {
      while (momentum.level > 2 && momentum.stacks > 0) momentum.stacks--;
    } else if (lv === 1) {
      while (momentum.level < 2 && momentum.stacks < 90) momentum.stacks++;
    }
  }

  reset() {}
}
