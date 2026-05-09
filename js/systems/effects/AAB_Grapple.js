// js/systems/effects/AAB_Grapple.js
// A+A+B: First enemy hit by dash is grabbed. Next dash launches it as a projectile.

import { ATTACK_DAMAGE_MULTIPLIERS } from '../../constants.js';

export default class AABEffect {
  constructor(scene) {
    this.scene = scene;
    this.grabbed = null;
    this.timer = 0;
    this.lastReleased = null;
    this._releaseBlock = 0;
    this._projectile = null;
    this._projectileDamage = 0;
    this._projHitSet = new Set();
  }

  update(delta) {
    if (this._releaseBlock > 0) this._releaseBlock -= delta;

    if (this._projectile) {
      const proj = this._projectile;
      if (proj.hp <= 0 || proj._projectileTimer <= 0) {
        this._projectile = null;
        this._projHitSet.clear();
      } else {
        this._checkProjectileCollisions(proj);
      }
    }

    if (!this.grabbed) return;
    this.timer -= delta;
    const player = this.scene.player;
    this.grabbed.x = player.px + Math.cos(player.facing) * 30;
    this.grabbed.y = player.py + Math.sin(player.facing) * 30;
    if (this.timer <= 0) this._releaseGrab();
  }

  tryGrab(enemy, player) {
    if (this.grabbed) return false;
    if (enemy === this.lastReleased && this._releaseBlock > 0) return false;
    this.grabbed = enemy;
    this.timer = 4000;
    enemy.isGrabbed = true;
    enemy.isPhantom = true;
    return true;
  }

  onDashWhileGrabbing(player, dashDirX, dashDirY, dashSpeed) {
    if (!this.grabbed) return false;
    const enemy = this.grabbed;
    this.lastReleased = enemy;
    this._releaseBlock = 800;
    this._releaseGrab();

    const momLv = this.scene?.momentum?.level ?? 1;
    const baseDmgMult = ATTACK_DAMAGE_MULTIPLIERS[momLv] || 1;
    const compassBonus = player.damageMultiplierBonus || 0;

    const fx = this.scene.itemEffects;
    const aaaMult = fx?.has('AAA') ? fx.getAAAMultiplier(player) : 1;
    const dbbBonus = fx?.has('DBB') ? (fx.getDashDamageMultiplier(player) - 1) : 0;
    const totalDamageMult = (baseDmgMult + compassBonus + dbbBonus) * aaaMult;
    fx?.lockGGGForAttack();
    const gggMult = fx?.has('GGG') ? (fx.getGGGMultiplier() || 1) : 1;
    this._projectileDamage = dashSpeed * 0.1 * totalDamageMult * gggMult;

    enemy._projectileVx = dashDirX * dashSpeed;
    enemy._projectileVy = dashDirY * dashSpeed;
    enemy._projectileTimer = player.jumping ? 1600 : 800;
    enemy.isGrabbed = false;
    enemy.isPhantom = false;

    this._projectile = enemy;
    this._projHitSet.clear();

    return true;
  }

  _releaseGrab() {
    if (!this.grabbed) return;
    this.grabbed.isGrabbed = false;
    this.grabbed.isPhantom = false;
    this.grabbed = null;
  }

  _checkProjectileCollisions(proj) {
    const enemies = this.scene?.enemyManager?.enemies;
    if (!enemies) return;
    const now = this.scene?.time?.now ?? Date.now();
    const hitRadius = proj.radius || 24;

    for (const e of enemies) {
      if (e === proj) continue;
      if (this._projHitSet.has(e)) continue;
      if (Math.hypot(e.x - proj.x, e.y - proj.y) > hitRadius) continue;

      this._projHitSet.add(e);
      if (e.receiveDamage) {
        e.receiveDamage({ type: 'dash', baseDamage: this._projectileDamage, now, radius: hitRadius });
      } else {
        e.hp = (e.hp || 1) - this._projectileDamage;
      }
      if (this._projectileDamage > 0) {
        this.scene?.spawnDamageNumber?.(e.x, e.y, this._projectileDamage, 'enemyDamage');
      }
    }
  }

  reset() {
    this.grabbed = null;
    this.timer = 0;
    this.lastReleased = null;
    this._releaseBlock = 0;
    this._projectile = null;
    this._projectileDamage = 0;
    this._projHitSet.clear();
  }
}
