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

    performSlam(speed) {
        this.preSlamSpeed = speed;
        const isHighSpeed = speed >= SLAM.HIGH_SPEED_THRESHOLD;
        const canPayHealth = this.player.health.hp > SLAM.SELF_DAMAGE;
        const applyKnockback = isHighSpeed && canPayHealth;
        
        if (applyKnockback) this.player.health.takeDamage(SLAM.SELF_DAMAGE);
        if (this.player.scene.renderer) this.player.scene.renderer.addSlamEffect(this.player.px, this.player.py, applyKnockback);
        
        this.activeSlam = {
            x: this.player.px, y: this.player.py,
            speed: speed,
            isHighSpeed: isHighSpeed,
            applyKnockback: applyKnockback
        };

        this.player.vx = 0; this.player.vy = 0;
        this.player.jumping = false;
        this.hasSlammedThisJump = true;
        this.slamCooldown = SLAM.COOLDOWN;
    }

    getCurrentAttackPayload(momentumLevel) {
        const currentSpeed = Math.hypot(this.player.vx, this.player.vy);
        const now = Date.now();
        
        // Radio base según nivel de momentum, modificado por el buff permanente
        const baseRadius = ATTACK_RADIOS[momentumLevel] || ATTACK_RADIOS[1];
        const radiusMultiplier = 1 + (this.player.attackRadiusMultiplier || 0);
        const finalRadius = baseRadius * radiusMultiplier;

        // Daño base según nivel, más el bonificador permanente
        const baseDamageMult = ATTACK_DAMAGE_MULTIPLIERS[momentumLevel] || ATTACK_DAMAGE_MULTIPLIERS[1];
        const bonusMult = this.player.damageMultiplierBonus || 0;
        const totalDamageMult = baseDamageMult + bonusMult;

        if (this.activeSlam) {
            return {
                type: this.activeSlam.isHighSpeed ? 'slam3' : 'slam',
                baseDamage: this.activeSlam.speed * 0.1 * totalDamageMult,
                radius: finalRadius * 1.5,
                now: now
            };
        }

        if (momentumLevel === 3) {
            return { type: 'momentum3', baseDamage: currentSpeed * 0.025 * totalDamageMult, radius: finalRadius, now: now };
        }

        if (this.player.dashing) {
            return {
                type: this.player.wasJumpingWhenDashed ? 'aerialDash' : 'dash',
                baseDamage: this.player.dashInitialSpeed * 0.1 * totalDamageMult,
                radius: finalRadius,
                now: now
            };
        }

        return null;
    }
}