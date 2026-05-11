// js/systems/effects/DAB_Mastery.js
// D+A+B: Instant direction changes during dash, each break amplifies that dash's damage +10%

export default class DABEffect {
  constructor(scene) {
    this.scene = scene;
    this.breaks = 0;
  }

  tryRedirect(dashVx, dashVy, moveDir) {
    const spd = Math.hypot(dashVx, dashVy);
    const curDirX = dashVx / spd;
    const curDirY = dashVy / spd;
    const dot = moveDir.x * curDirX + moveDir.y * curDirY;
    if (dot >= 0.9) return null;
    this.breaks++;
    return {
      dashVx: moveDir.x * spd,
      dashVy: moveDir.y * spd,
      facing: Math.atan2(moveDir.y, moveDir.x)
    };
  }

  getDamageMultiplier() {
    return 1 + this.breaks * 0.1;
  }

  reset() {
    this.breaks = 0;
  }
}
