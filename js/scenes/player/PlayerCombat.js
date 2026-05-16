// js/scenes/player/PlayerCombat.js
import { SLAM, ATTACK_RADIOS } from '../../constants.js';

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
        const applyKnockback = isHighSpeed;

        // BBC: limpiar stick si se hace slam durante stick
        if (this.player._stickState) {
            this.player.scene?.itemEffects?.onStickExpired(this.player._stickEnemy);
            this.player._stickState = false;
            this.player._stickTimer = 0;
            this.player._stickEnemy = null;
        }

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

    getAttackRadius(momentumLevel) {
        const baseRadius = ATTACK_RADIOS[momentumLevel] || ATTACK_RADIOS[1];
        return baseRadius * (1 + (this.player.attackRadiusMultiplier || 0));
    }

    getCurrentAttackPayload(momentumLevel) {
        const currentSpeed = Math.hypot(this.player.vx, this.player.vy);
        const now = Date.now();
        
        // Radio base según nivel de momentum, modificado por el buff permanente
        const baseRadius = ATTACK_RADIOS[momentumLevel] || ATTACK_RADIOS[1];
        const radiusMultiplier = 1 + (this.player.attackRadiusMultiplier || 0);
        const finalRadius = baseRadius * radiusMultiplier;

        // Daño base según nivel, multiplicado por AAA (Berserker)
        const baseDamageMult = this.player.scene?.momentum?.getDamageMultiplier() || 1;
        const trueDamage = this.player.trueDamage || 0;

        const fx = this.player.scene?.itemEffects;
        const isAttacking = this.activeSlam || this.player.dashing;
        const aaaMult = (fx && isAttacking) ? fx.getAAAMultiplier(this.player) : 1;
        const totalDamageMult = baseDamageMult * aaaMult;
        const gggMult = (fx && isAttacking) ? (fx.getGGGMultiplier() || 1) : 1;
        // DBB: multiplica daño verdadero
        const dbbTrueMult = (fx && isAttacking) ? fx.getDBBTrueDamageMultiplier() : 1;
        const finalTrueDamage = trueDamage * dbbTrueMult;

        if (this.activeSlam) {
            return {
                type: this.activeSlam.isHighSpeed ? 'slam3' : 'slam',
                baseDamage: this.activeSlam.speed * 0.05 * totalDamageMult * gggMult,
                radius: finalRadius * 1.5,
                now: now,
                trueDamage: finalTrueDamage
            };
        }

        if (this.player.dashing) {
            const dabMult = fx?.getDABMultiplier() ?? 1;
            const isAerial = this.player.wasJumpingWhenDashed;
            const isWallJump = isAerial && this.player._fromWallJump;
            if (isWallJump) this.player._fromWallJump = false; // consumir el flag
            return {
                type: isWallJump ? 'wallJumpDash' : isAerial ? 'aerialDash' : 'dash',
                baseDamage: this.player.dashInitialSpeed * 0.05 * totalDamageMult * gggMult * dabMult,
                radius: finalRadius,
                now: now,
                trueDamage: finalTrueDamage
            };
        }

        if (momentumLevel === 3) {
            return { type: 'momentum3', baseDamage: currentSpeed * 0.05 * baseDamageMult, radius: finalRadius, now: now, trueDamage: finalTrueDamage };
        }

        return null;
    }
}