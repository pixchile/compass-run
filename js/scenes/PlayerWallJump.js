import { WALL_JUMP } from '../constants.js';

export class WallJumpSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.wallStick = false;
        this.wallStickTimer = 0;
        this.wallStickCooldown = 0;
        this.wallNormalAngle = 0;
        this.wallStickStartTime = 0;
        this.impactSpeed = 0;
    }

    reset() {
        this.wallStick = false;
        this.wallStickTimer = 0;
        this.wallStickCooldown = 0;
        this.wallNormalAngle = 0;
        this.wallStickStartTime = 0;
        this.impactSpeed = 0;
    }

    canStick(jumping, cooldown) {
        return jumping && !this.wallStick && cooldown <= 0;
    }

    stick(wallNormalAngle, currentSpeed) {
        this.impactSpeed = currentSpeed;
        this.wallStick = true;
        this.wallStickTimer = WALL_JUMP.STICK_DURATION;
        this.wallNormalAngle = wallNormalAngle;
        this.wallStickStartTime = this.scene?.time?.now || 0;

        const threshold = WALL_JUMP.STICK_DAMAGE_THRESHOLD ?? 949;
        const damage    = WALL_JUMP.STICK_DAMAGE_AMOUNT ?? 1;

        if (this.impactSpeed >= threshold && this.player?.takeDamage) {
            this.player.takeDamage(damage);
        }

        return true;
    }

    getPenaltyFactor(now) {
        if (!this.wallStick) return 1.0;
        if (!this.wallStickStartTime || !now) return 1.0;

        let stickDuration = now - this.wallStickStartTime;
        if (stickDuration < 0) return 1.0;

        if (stickDuration <= WALL_JUMP.GRACE_WINDOW) {
            return 1.0;
        }

        const maxDuration = WALL_JUMP.STICK_DURATION;
        const graceWindow = WALL_JUMP.GRACE_WINDOW;
        const penaltyRange = maxDuration - graceWindow;

        let timeInPenalty = stickDuration - graceWindow;
        timeInPenalty = Math.min(timeInPenalty, penaltyRange);
        timeInPenalty = Math.max(0, timeInPenalty);

        const t = penaltyRange > 0 ? timeInPenalty / penaltyRange : 1.0;
        const factor = 1.0 - (t * (1.0 - WALL_JUMP.PENALTY_MIN_FACTOR));
        const finalFactor = Math.max(WALL_JUMP.PENALTY_MIN_FACTOR, Math.min(1.0, factor));

        return finalFactor;
    }

    tryJump(moveDir, momentum, getMoveDirectionFn, isMovingInCompassDirectionFn, now) {
        if (!this.wallStick) return false;

        const moveDirActual = getMoveDirectionFn();
        const nx = Math.cos(this.wallNormalAngle);
        const ny = Math.sin(this.wallNormalAngle);

        if (moveDirActual.x === 0 && moveDirActual.y === 0) {
            this._release();
            return { success: true, vx: 0, vy: 0 };
        }

        const dot = moveDirActual.x * nx + moveDirActual.y * ny;
        if (dot < -0.2) return false;

        const level = momentum.level || 1;
        let jumpDistance = WALL_JUMP.SPEEDS[level] || 400;

        if (isMovingInCompassDirectionFn(momentum)) {
            jumpDistance *= WALL_JUMP.COMPASS_BONUS;
        }

        const penaltyFactor = this.getPenaltyFactor(now);
        jumpDistance *= penaltyFactor;

        if (momentum) {
            const bonusStacks = WALL_JUMP.STACK_BONUS[level] || 3;
            if (typeof momentum.addStacks === 'function') {
                momentum.addStacks(bonusStacks);
            } else {
                momentum.stacks = Math.min(90, momentum.stacks + bonusStacks);
            }
        }

        let dirX = moveDirActual.x;
        let dirY = moveDirActual.y;

        if (dot < 0.3) {
            dirX += nx * 0.2;
            dirY += ny * 0.2;
        }

        const finalLen = Math.hypot(dirX, dirY);
        if (finalLen < 0.001) {
            dirX = nx;
            dirY = ny;
        } else {
            dirX /= finalLen;
            dirY /= finalLen;
        }

        const vx = dirX * jumpDistance;
        const vy = dirY * jumpDistance;

        this._release();
        return { success: true, vx, vy };
    }

    _release() {
        this.wallStick = false;
        this.wallStickTimer = 0;
        this.wallStickStartTime = 0;
        this.wallStickCooldown = 150;
        this.impactSpeed = 0;
    }

    update(delta, onTimeout) {
        this.wallStickCooldown = Math.max(0, this.wallStickCooldown - delta);

        if (!this.wallStick) return null;

        this.wallStickTimer -= delta;

        if (this.wallStickTimer <= 0) {
            this._release();
            if (onTimeout) onTimeout(0, 0);
            return { timeout: true, vx: 0, vy: 0 };
        }

        return null;
    }
    
    getWallNormalAngle() {
        return this.wallNormalAngle;
    }
}

// Exportación por defecto para compatibilidad
export default WallJumpSystem;