// js/systems/effects/CBG_EventHorizon.js
// C+B+G: 10% chance on kill to spawn a blackhole that pulls enemies in

export default class CBGEffect {
  constructor(scene) {
    this.scene = scene;
    this.holes = [];
  }

  spawnHole(x, y) {
    if (Math.random() > 0.10) return;
    this.holes.push({
      x, y,
      radius: 200,
      duration: 4000,
    });
  }

  update(delta) {
    const enemies = this.scene?.enemyManager?.enemies;
    if (!enemies) return;

    for (let i = this.holes.length - 1; i >= 0; i--) {
      const hole = this.holes[i];
      hole.duration -= delta;
      if (hole.duration <= 0) {
        this.holes.splice(i, 1);
        continue;
      }

      // Pull enemies toward center
      const dt = delta / 1000;
      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue;
        const dist = Math.hypot(enemy.x - hole.x, enemy.y - hole.y);
        if (dist <= hole.radius && dist > 2) {
          const nx = (hole.x - enemy.x) / dist;
          const ny = (hole.y - enemy.y) / dist;
          enemy.x += nx * 50 * dt;
          enemy.y += ny * 50 * dt;
        }
      }
    }
  }

  onEnemyKilledInHole(enemy) {
    for (const hole of this.holes) {
      if (Math.hypot(enemy.x - hole.x, enemy.y - hole.y) <= hole.radius) {
        hole.radius *= 1.10;
        hole.duration = 4000;
        return;
      }
    }
  }

  render(g) {
    if (!this.holes.length) return;
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 300);
    for (const hole of this.holes) {
      const alpha = 0.15 * pulse * Math.min(1, hole.duration / 500);
      g.fillStyle(0x8844cc, alpha);
      g.fillCircle(hole.x, hole.y, hole.radius);
      g.lineStyle(2, 0xbb66ff, 0.4 * pulse);
      g.strokeCircle(hole.x, hole.y, hole.radius);
      g.lineStyle(1, 0xcc88ff, 0.25 * pulse);
      g.strokeCircle(hole.x, hole.y, hole.radius * 0.6);
    }
  }

  reset() {
    this.holes = [];
  }
}
