import { HP_MAX, HP_DMG_ENEMY_HIT, HP_DMG_VOID, HP_REGEN_DELAY, HP_REGEN_RATE, W, H } from '../../constants.js';

export default class PlayerHealth {
    constructor(player) {
        this.player = player;
        this.maxHp = HP_MAX;       // puede crecer con Fénix
        this.hp = this.maxHp;
        this.hpRegenT = 0;
        this.isInvincible = false;
        this.invincibleTimer = 0;
    }

    get isDead() { return this.hp <= 0; }

    update(delta, dt, wallStick) {
        if (this.isInvincible) {
            this.invincibleTimer -= delta;
            if (this.invincibleTimer <= 0) this.isInvincible = false;
        }

        if (this.hp < this.maxHp && this.hp > 0 && !wallStick) {
            this.hpRegenT += delta;
            if (this.hpRegenT >= HP_REGEN_DELAY) {
                this.hp = Math.min(this.maxHp, this.hp + HP_REGEN_RATE * dt);
            }
        }
    }

    takeDamage(amount) {
        if (this.isInvincible) return;
        const newHp = this.hp - amount;
        // DDD: Fénix — interceptar daño letal
        if (newHp <= 0) {
            const fx = this.player?.scene?.itemEffects;
            if (fx?.onLethalDamage(this.player)) return; // absorbido
        }
        this.player?.scene?.runStats?.recordDamageReceived(amount);
        this.hp = Math.max(0, newHp);
        this.hpRegenT = 0;
        this.isInvincible = true;
        this.invincibleTimer = 50;
        // DBB: notificar daño recibido
        this.player?.scene?.itemEffects?.onPlayerTookDamage();
        this.player?.scene?.spawnDamageNumber?.(this.player.px, this.player.py, amount, 'playerDamage');
        // El daño rompe el ritmo
        if (this.player?.scene?.momentum) {
            this.player.scene.momentum.stacks = Math.max(0, this.player.scene.momentum.stacks - 5);
        }
    }

    takeEnemyDamage(mult = 1) { this.takeDamage(HP_DMG_ENEMY_HIT * mult); }

    heal(amount) {
        const before = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        const actual = this.hp - before;
        if (actual > 0) this.player?.scene?.spawnDamageNumber?.(this.player.px, this.player.py, actual, 'heal');
    }

    fallIntoVoid() {
        this.takeDamage(HP_DMG_VOID);
        this.player.px = W / 2; this.player.py = H / 2;
        this.player.vx = 0; this.player.vy = 0;
        this.player.jumping = false; this.player.dashing = false;
        this.player.combat.activeSlam = null;
        this.player.wallJump.reset();
    }
}