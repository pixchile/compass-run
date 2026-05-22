// js/systems/effects/BBC_Rebound.js
// B+B+C: Landing on enemies sticks player, Space + direction bounces off with damage

import { BBC_REBOUND_SPEEDS } from '../../constants.js';

export default class BBCEffect {
  constructor(scene) {
    this.scene = scene;
    this.bounces = 0;
    this.active = false;
    this._lastJumped = null;
  }

  onStickEnemy(player, enemy, now, momentumSystem) {
    if (enemy === this._lastJumped) return false;
    this._lastJumped = null;

    player.px = enemy.x;
    player.py = enemy.y;
    player.vx = 0; player.vy = 0;
    player.jumping = false;
    player.combat.hasSlammedThisJump = false;

    player._stickState = true;
    player._stickTimer = 1000;
    player._stickEnemy = enemy;

    enemy._frozen = true;
    enemy._frozenVx = enemy.vx || 0;
    enemy._frozenVy = enemy.vy || 0;

    if (!this.active) {
      this.bounces = 1;
      this.active = true;
    } else {
      this.bounces++;
    }
    this.scene?.runStats?.recordBbcBounce();
    this.scene?.runStats?.recordBbcCombo(this.bounces);

    if (this.scene.renderer?.addSlamEffect) {
      this.scene.renderer.addSlamEffect(player.px, player.py, false);
    }

    return { sticked: true };
  }

  onJumpOffEnemy(player, enemy, dirX, dirY, momentumSystem) {
    if (!enemy) return;

    this._lastJumped = enemy;

    const baseDmg = 5 + this.bounces * 5;
    const momentumMult = momentumSystem?.getDamageMultiplier?.() ?? 1;
    const finalDamage = baseDmg * momentumMult;

    const hpBefore = enemy.hp;
    const now = Date.now();
    enemy.receiveDamage
      ? enemy.receiveDamage({ type: 'stomp', baseDamage: finalDamage, now })
      : (() => { enemy.hp = (enemy.hp || 1) - finalDamage; })();
    const actualDamage = hpBefore - enemy.hp;
    if (actualDamage > 0) {
      this.scene.spawnDamageNumber?.(enemy.x, enemy.y, actualDamage, 'enemyDamage');
    }
    // True damage
    const trueDmg = player.trueDamage || 0;
    if (trueDmg > 0 && enemy.hp > 0) {
      enemy.hp = (enemy.hp || 1) - trueDmg;
      this.scene.spawnDamageNumber?.(enemy.x, enemy.y, trueDmg, 'trueDamage');
    }

    enemy._frozen = false;

    const lv = momentumSystem?.level ?? 1;
    const jumpSpd = BBC_REBOUND_SPEEDS[lv] || 400;
    player.jumping = true;
    player.jumpT = 0;
    player.jumpDur = 400;
    player.jumpHMax = 0;
    player.jumpLv = 1;
    player.jumpVx = dirX * jumpSpd;
    player.jumpVy = dirY * jumpSpd;
    player.vx = player.jumpVx;
    player.vy = player.jumpVy;
    player.combat.hasSlammedThisJump = false;
    player.facing = Math.atan2(dirY, dirX);

    if (this.scene.renderer?.addSlamEffect) {
      this.scene.renderer.addSlamEffect(enemy.x, enemy.y, false);
    }
  }

  onStickExpired(enemy) {
    if (enemy) enemy._frozen = false;
    this._lastJumped = null;
    this.bounces = 0;
    this.active = false;
  }

  onPlayerLanded() {
    this._lastJumped = null;
    const player = this.scene?.player;
    if (this.active && !player?._stickState && !player?.wallJump?.wallStick) {
      this.bounces = 0;
      this.active = false;
    }
  }

  reset() {
    this.bounces = 0;
    this.active = false;
    this._lastJumped = null;
  }
}
