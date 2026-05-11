// js/scenes/Enemy.js

export default class Enemy {
    constructor(x, y, scene, config) {
        this.x = x;
        this.y = y;
        this.scene = scene;

        const basic = config.basic || {};

        this.type = config.id || 'enemy';
        this.id = `${this.type}_${Math.random().toString(36).slice(2, 9)}`;
        this.radius = basic.radius || 12;
        this.shape = basic.shape || 'circle';
        this.maxHp = basic.hp || 1;
        this.hp = this.maxHp;
        this.hpRegen = basic.hpRegen || 0;
        this.isBoss = basic.isBoss || false;

        let c = basic.color || 0xff6666;
        if (typeof c === 'string') {
            c = parseInt(c.replace('#', '').replace('0x', ''), 16);
        }
        this.color = c;

        this.damageMultipliers = config.damageMultipliers || {
            dash: 1.0,
            aerialDash: 1.0,
            momentum3: 1.0,
            slam: 1.0,
            slam3: 1.0,
            void: 100.0,
            wallCrash: 0.0,
            explosion: 1.0
        };

        this.onDeathEffects = config.onDeath || [];

        this._lastDamageSource = null;

        this.lastHurtTime = 0;
        this.state = {
            wanderAngle: Math.random() * Math.PI * 2,
            orbitAngle: 0,
            lastAttackTime: 0,
            lastTeleportTime: 0,
            stuckCounter: 0,
            lastX: x,
            lastY: y
        };
    }

    collidesWith(playerX, playerY, playerRadius = 12) {
        const dx = this.x - playerX;
        const dy = this.y - playerY;
        const dist = Math.hypot(dx, dy);
        return dist < (this.radius + playerRadius);
    }

    receiveDamage(attackPayload) {
        if (attackPayload.type !== 'fire' && attackPayload.now && attackPayload.now - this.lastHurtTime < 20) return false;

        const multiplier = this.damageMultipliers[attackPayload.type] ?? 1.0;
        if (multiplier <= 0) return false;

        const finalDamage = attackPayload.baseDamage * multiplier;

        this.hp -= finalDamage;
        if (attackPayload.now) this.lastHurtTime = attackPayload.now;
        this._lastDamageSource = null;

        return this.hp <= 0;
    }

    update(delta, player, lines) {
        if (this.hpRegen > 0 && this.hp < this.maxHp && this.hp > 0) {
            this.hp = Math.min(this.maxHp, this.hp + (this.hpRegen * (delta / 1000)));
        }
    }
}
