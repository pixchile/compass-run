// js/systems/effects/AAD_Explosive.js
// A+A+D: 25% chance enemies explode on death. Explosion kills always chain at 100%.

export default class AADEffect {
  constructor(scene) {
    this.scene = scene;
    this.explosions = 0;
  }

  onEnemyDied(enemy, enemyManager) {
    const chained = enemy._willExplode || false;
    if (!chained && Math.random() > 0.25) return;

    const x = enemy.x, y = enemy.y;
    const enemies = enemyManager.enemies;
    let exploded = false;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (Math.hypot(e.x - x, e.y - y) <= 120) {
        if (e.receiveDamage) e.receiveDamage({ type: 'explosion', baseDamage: 30, now: this.scene?.time?.now ?? Date.now() });
        e._willExplode = true;
        exploded = true;
      }
    }
    if (exploded) this.explosions++;
    if (this.scene.renderer?.addSlamEffect) this.scene.renderer.addSlamEffect(x, y, false);
  }

  reset() {
    this.explosions = 0;
  }
}
