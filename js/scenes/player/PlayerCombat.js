import { SLAM, ATTACK_RADIOS, ATTACK_DAMAGE_MULTIPLIERS } from '../../constants.js';

export default class PlayerCombat {
    constructor(player) {
        this.player = player;
        this.canSlam = true;              
        this.hasSlammedThisJump = false;  
        this.slamCooldown = 0;            
        this.preSlamSpeed = 0;            
        this.activeSlam = null;
    }

    update(delta) {
        this.slamCooldown = Math.max(0, this.slamCooldown - delta);
    }

    performSlam(speed, skipCooldown = false) {
        this.preSlamSpeed = speed;
        const isHighSpeed = speed >= SLAM.HIGH_SPEED_THRESHOLD;
        const slamSelfDmg = this.player.scene?.itemEffects?.has('ADD')
            ? Math.floor(SLAM.SELF_DAMAGE * 0.6)
            : SLAM.SELF_DAMAGE;
        const canPayHealth = this.player.health.hp > slamSelfDmg;
        const applyKnockback = isHighSpeed && canPayHealth;

        // BBC: limpiar stick si se hace slam durante stick
        if (this.player._stickState) {
            this.player.scene?.itemEffects?.onStickExpired(this.player._stickEnemy);
            this.player._stickState = false;
            this.player._stickTimer = 0;
            this.player._stickEnemy = null;
        }

        if (applyKnockback) this.player.health.takeDamage(slamSelfDmg);

        // AAA: costo extra de 3 HP en slam
        const fx = this.player.scene?.itemEffects;
        if (fx?.has('AAA')) {
            const cost = fx.getAAACost(this.player);
            if (cost > 0) this.player.health.takeDamage(cost);
        }

        const slamRadius = (fx?.has('DDC')) ? SLAM.RADIUS * SLAM.SANDKING_RADIUS_MULT : SLAM.RADIUS;
        if (this.player.scene.renderer) this.player.scene.renderer.addSlamEffect(this.player.px, this.player.py, applyKnockback, slamRadius);
        
        this.activeSlam = {
            x: this.player.px, y: this.player.py,
            speed: speed,
            isHighSpeed: isHighSpeed,
            applyKnockback: applyKnockback
        };

        this.player.vx = 0; this.player.vy = 0;
        this.player.jumping = false;
        this.hasSlammedThisJump = true;
        if (!skipCooldown) this.slamCooldown = SLAM.COOLDOWN;
    }

    getCurrentAttackPayload(momentumLevel) {
        const currentSpeed = Math.hypot(this.player.vx, this.player.vy);
        const now = Date.now();
        
        // Radio base según nivel de momentum, modificado por el buff permanente
        const baseRadius = ATTACK_RADIOS[momentumLevel] || ATTACK_RADIOS[1];
        const radiusMultiplier = 1 + (this.player.attackRadiusMultiplier || 0);
        const finalRadius = baseRadius * radiusMultiplier;

        // Daño base según nivel, más bonificadores aditivos (compass, AAA, DBB)
        const baseDamageMult = ATTACK_DAMAGE_MULTIPLIERS[momentumLevel] || ATTACK_DAMAGE_MULTIPLIERS[1];
        const compassBonus = this.player.damageMultiplierBonus || 0;

        const fx = this.player.scene?.itemEffects;
        const isAttacking = this.activeSlam || this.player.dashing;
        const aaaMult = (fx && isAttacking) ? fx.getAAAMultiplier(this.player) : 1;
        const dbbBonus = (fx && isAttacking) ? (fx.getDashDamageMultiplier(this.player) - 1) : 0;
        const totalDamageMult = (baseDamageMult + compassBonus + dbbBonus) * aaaMult;
        const gggMult = (fx && isAttacking) ? (fx.getGGGMultiplier() || 1) : 1;

        if (this.activeSlam) {
            return {
                type: this.activeSlam.isHighSpeed ? 'slam3' : 'slam',
                baseDamage: this.activeSlam.speed * 0.1 * totalDamageMult * gggMult,
                radius: finalRadius * 1.5,
                now: now
            };
        }

        if (this.player.dashing) {
            const dabMult = (fx?.has('DAB')) ? 1 + (this.player._dabBreaks || 0) * 0.1 : 1;
            return {
                type: this.player.wasJumpingWhenDashed ? 'aerialDash' : 'dash',
                baseDamage: this.player.dashInitialSpeed * 0.1 * totalDamageMult * gggMult * dabMult,
                radius: finalRadius,
                now: now
            };
        }

        if (momentumLevel === 3) {
            return { type: 'momentum3', baseDamage: currentSpeed * 0.1 * (baseDamageMult + compassBonus), radius: finalRadius, now: now };
        }

        return null;
    }
}