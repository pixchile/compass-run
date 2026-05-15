// js/systems/effects/CCC_Incendiary.js
// C+C+C: Skidding creates fire zones that damage enemies

export default class CCCEffect {
  constructor(scene) {
    this.scene = scene;
  }

  onSkid(x, y) {
    const R = 25;
    const zones = this.scene.currentMap?.zones;
    if (!zones) return;
    zones.push({
      type: 'damage_zone',
      damagePerSec: 60,
      timeLeft: 15000,
      geometry: { bbox: { x: x - R, y: y - R, w: R * 2, h: R * 2 } },
      _isFire: true,
    });
  }

  reset() {}
}
