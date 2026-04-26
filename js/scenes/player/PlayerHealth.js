import { HP_MAX, HP_DMG_ENEMY_HIT, HP_DMG_VOID, HP_REGEN_DELAY, HP_REGEN_RATE, W, H } from '../../constants.js';

export default class PlayerHealth {
    constructor(player) {
        this.player = player;
        this.hp = HP_MAX;
        this.hpRegenT = 0;
        this.hpHitFlash = 0;
        this.isInvincible = false;
        this.invincibleTimer = 0;
    }

    get isDead() { return this.hp <= 0; }

    update(delta, dt, wallStick) {
        this.hpHitFlash = Math.max(0, this.hpHitFlash - delta);

        if (this.isInvincible) {
            this.invincibleTimer -= delta;
            if (this.invincibleTimer <= 0) this.isInvincible = false;
        }

        if (this.hp < HP_MAX && this.hp > 0 && !wallStick) {
            this.hpRegenT += delta;
            if (this.hpRegenT >= HP_REGEN_DELAY) {
                this.hp = Math.min(HP_MAX, this.hp + HP_REGEN_RATE * dt);
            }
        }
    }

    takeDamage(amount) {
        if (this.isInvincible) return;
        this.hp = Math.max(0, this.hp - amount);
        this.hpRegenT = 0;
        this.hpHitFlash = 280;
        this.isInvincible = true;
        this.invincibleTimer = 50;
    }

    takeEnemyDamage() { this.takeDamage(HP_DMG_ENEMY_HIT); }

    heal(amount) { this.hp = Math.min(HP_MAX, this.hp + amount); }

    fallIntoVoid() {
        this.takeDamage(HP_DMG_VOID);
        this.player.px = W / 2; this.player.py = H / 2;
        this.player.vx = 0; this.player.vy = 0;
        this.player.jumping = false; this.player.dashing = false;
        this.player.isSurfing = false;
        this.player.combat.activeSlam = null;
        this.player.wallJump.reset();
    }
}