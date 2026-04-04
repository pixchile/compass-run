import { WALL_JUMP } from '../constants.js';

export class WallJumpSystem {
    constructor() {
        this.wallStick = false;
        this.wallStickTimer = 0;
        this.wallStickCooldown = 0;
        this.wallNormalAngle = 0;
    }

    reset() {
        this.wallStick = false;
        this.wallStickTimer = 0;
        this.wallStickCooldown = 0;
        this.wallNormalAngle = 0;
    }

    canStick(jumping, cooldown) {
        return jumping && !this.wallStick && cooldown <= 0;
    }

    stick(wallNormalAngle, currentSpeed) {
        this.wallStick = true;
        this.wallStickTimer = WALL_JUMP.STICK_DURATION;
        this.wallNormalAngle = wallNormalAngle;
        return true;
    }

    tryJump(moveDir, momentum, getMoveDirectionFn, isMovingInCompassDirectionFn) {
        if (!this.wallStick) return false;

        const moveDirActual = getMoveDirectionFn();
        const nx = Math.cos(this.wallNormalAngle);
        const ny = Math.sin(this.wallNormalAngle);

        if (moveDirActual.x === 0 && moveDirActual.y === 0) {
            this._release();
            return { success: true, vx: 0, vy: 0 };
        }

        const dot = moveDirActual.x * nx + moveDirActual.y * ny;
        if (dot < 0) return false;

        let jumpDistance = WALL_JUMP.FIXED_JUMP_DISTANCE;

        const hasCompassBonus = isMovingInCompassDirectionFn(momentum);
        if (hasCompassBonus) {
            jumpDistance *= WALL_JUMP.COMPASS_BONUS;
        }

        const len = Math.hypot(moveDirActual.x, moveDirActual.y);
        if (len === 0) return false;
        
        // Se extrae la dirección del input
        let dirX = moveDirActual.x / len;
        let dirY = moveDirActual.y / len;

        // FIX: Mezclamos el input con la normal de la pared para garantizar
        // que el salto sea consistentemente "hacia afuera" permitiendo encadenar muros.
        dirX = (dirX + nx) / 2;
        dirY = (dirY + ny) / 2;

        // Volver a normalizar la combinación para mantener la velocidad fija estricta
        const finalLen = Math.hypot(dirX, dirY);
        if (finalLen > 0) {
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
        this.wallStickCooldown = 300; 
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
}