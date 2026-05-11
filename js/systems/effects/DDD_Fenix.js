// js/systems/effects/DDD_Fenix.js
// D+D+D: Survive lethal damage, explode, freeze enemies, HP decays to 10

export default class DDDEffect {
  constructor(scene) {
    this.scene = scene;
    this.cd = 0;
    this.decaying = false;
    this.peakHp = 100;
    this.freezeTimer = 0;
  }

  update(delta, player) {
    this.cd = Math.max(0, this.cd - delta);

    if (this.freezeTimer > 0) {
      this.freezeTimer -= delta;
      if (this.freezeTimer <= 0) {
        this.freezeTimer = 0;
        this._unfreezeAllEnemies();
      }
    }

    if (this.decaying && player.health.hp > 10) {
      const rate = (this.peakHp - 10) / 3000;
      player.health.hp = Math.max(10, player.health.hp - rate * delta);
      if (player.health.hp <= 10) {
        player.health.hp = 10;
        this.decaying = false;
      }
    }
  }

  onLethalDamage(player) {
    if (this.cd > 0) return false;

    player.health.maxHp = (player.health.maxHp || 100) + 10;
    player.health.hp = player.health.maxHp;
    this.peakHp = player.health.maxHp;
    this.decaying = true;

    const fx = this.scene?.itemEffects;
    const aaaMult = fx?.has('AAA') ? fx.getAAAMultiplier(player) : 1;
    const totalMult = aaaMult;
    const explosionDmg = Math.max(10, player.health.maxHp - 10) * totalMult;
    const explosionRadius = explosionDmg * 3;
    const dbbTrueMult = fx?.getDBBTrueDamageMultiplier() ?? 1;
    const trueDmg = (player.trueDamage || 0) * dbbTrueMult;
    this._triggerFenixExplosion(player.px, player.py, explosionDmg, explosionRadius, trueDmg);

    this._freezeAllEnemies();
    this.freezeTimer = 3000;

    this.cd = 60000;

    return true;
  }

  _triggerFenixExplosion(x, y, damage, radius, trueDmg = 0) {
    const enemies = this.scene?.enemyManager?.enemies;
    const now = this.scene?.time?.now ?? Date.now();

    if (enemies) {
      for (const e of enemies) {
        if (Math.hypot(e.x - x, e.y - y) <= radius) {
          const hpBefore = e.hp || 0;
          if (e.receiveDamage) {
            e.receiveDamage({ type: 'explosion', baseDamage: damage, now });
          } else {
            e.hp = (e.hp || 1) - damage;
          }
          const actualDmg = hpBefore - (e.hp || 0);
          if (actualDmg > 0) {
            this.scene?.spawnDamageNumber?.(e.x, e.y, actualDmg, 'enemyDamage');
          }
          // True damage
          if (trueDmg > 0 && e.hp > 0) {
            e.hp = (e.hp || 1) - trueDmg;
            this.scene?.spawnDamageNumber?.(e.x, e.y, trueDmg, 'trueDamage');
          }
        }
      }
    }

    if (this.scene?.renderer?.addSlamEffect) {
      this.scene.renderer.addSlamEffect(x, y, true, radius);
    }
  }

  _freezeAllEnemies() {
    const enemies = this.scene?.enemyManager?.enemies;
    if (!enemies) return;
    for (const e of enemies) {
      e._frozen = true;
      e._fenixFrozen = true;
      e._frozenVx = e.vx || 0;
      e._frozenVy = e.vy || 0;
    }
  }

  _unfreezeAllEnemies() {
    const enemies = this.scene?.enemyManager?.enemies;
    if (!enemies) return;
    for (const e of enemies) {
      if (e._fenixFrozen) {
        e._frozen = false;
        e._fenixFrozen = false;
      }
    }
  }

  reset() {
    this.cd = 0;
    this.decaying = false;
    this.peakHp = 100;
    this.freezeTimer = 0;
  }
}
