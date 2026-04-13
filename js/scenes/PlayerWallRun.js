import { WALL_RUN } from '../constants.js';

export class WallRunSystem {
    constructor(scene, player, wallJumpSystem) {
        this.scene = scene;
        this.player = player;
        this.wallJumpSystem = wallJumpSystem;
        this.isWallRunning = false;
        this.wallRunSpeed = 0;
        this.wallTangentX = 0;
        this.wallTangentY = 0;
        this.wallRunDirection = 1;
        this.currentWallLine = null;
        this.wasNaturalExit = false;
    }

    reset() {
        this.isWallRunning = false;
        this.wallRunSpeed = 0;
        this.wallTangentX = 0;
        this.wallTangentY = 0;
        this.wallRunDirection = 1;
        this.currentWallLine = null;
        this.wasNaturalExit = false;
    }

    tryStartWallRun(wallNormalAngle, momentumLevel, moveDirection, wallLine) {
        if (!this.wallJumpSystem.wallStick) return false;
        const isMoving = Math.abs(moveDirection.x) > 0.1 || Math.abs(moveDirection.y) > 0.1;
        if (!isMoving) return false;

        const tangentX = Math.cos(wallNormalAngle + Math.PI / 2);
        const tangentY = Math.sin(wallNormalAngle + Math.PI / 2);
        const dot = moveDirection.x * tangentX + moveDirection.y * tangentY;
        if (Math.abs(dot) < 0.1) return false;

        const direction = dot > 0 ? 1 : -1;
        const speed = WALL_RUN.SPEEDS[momentumLevel] || WALL_RUN.SPEEDS[1];

        this.isWallRunning = true;
        this.wallRunSpeed = speed;
        this.wallTangentX = tangentX;
        this.wallTangentY = tangentY;
        this.wallRunDirection = direction;
        this.currentWallLine = wallLine;

        this.player.vx = speed * direction * tangentX;
        this.player.vy = speed * direction * tangentY;
        return true;
    }

    isStillTouchingWall(playerRadius) {
        const lines = this.scene.currentMap?.lines || [];
        const threshold = playerRadius + 20;
        for (const line of lines) {
            if (line._broken) continue;
            const abx = line.end.x - line.start.x;
            const aby = line.end.y - line.start.y;
            const len2 = abx * abx + aby * aby;
            if (len2 === 0) continue;
            let t = ((this.player.px - line.start.x) * abx + (this.player.py - line.start.y) * aby) / len2;
            t = Math.max(0, Math.min(1, t));
            const cx = line.start.x + t * abx;
            const cy = line.start.y + t * aby;
            if (Math.hypot(this.player.px - cx, this.player.py - cy) <= threshold) {
                // Si cambió de segmento, recalcular la tangente con el nuevo ángulo
                if (line !== this.currentWallLine) {
                    const len = Math.sqrt(abx * abx + aby * aby);
                    if (len > 0) {
                        const nx = -aby / len;
                        const ny =  abx / len;
                        const normalAngle = Math.atan2(ny, nx);
                        this.wallTangentX = Math.cos(normalAngle + Math.PI / 2);
                        this.wallTangentY = Math.sin(normalAngle + Math.PI / 2);
                    }
                    this.currentWallLine = line;
                }
                return true;
            }
        }
        return false;
    }

    update(delta, moveDirection, now, playerRadius = 12) {
        if (!this.isWallRunning) return false;
        if (!this.isStillTouchingWall(playerRadius)) { this.stopWallRun(true); return false; }
        if (!this.wallJumpSystem.wallStick) { this.stopWallRun(); return false; }
        if (now - (this.wallJumpSystem.wallStickStartTime || 0) >= WALL_RUN.MAX_DURATION) { this.stopWallRun(true); return false; }

        const isMoving = Math.abs(moveDirection.x) > 0.1 || Math.abs(moveDirection.y) > 0.1;
        if (!isMoving) { this.stopWallRun(); return false; }

        const dot = moveDirection.x * this.wallTangentX + moveDirection.y * this.wallTangentY;
        if (Math.abs(dot) < 0.1) { this.stopWallRun(); return false; }

        this.wallRunDirection = dot > 0 ? 1 : -1;
        this.player.vx = this.wallRunSpeed * this.wallRunDirection * this.wallTangentX;
        this.player.vy = this.wallRunSpeed * this.wallRunDirection * this.wallTangentY;
        return true;
    }

    stopWallRun(naturalExit = false) {
        this.isWallRunning = false;
        this.currentWallLine = null;
        this.wasNaturalExit = naturalExit;
        if (naturalExit) {
            const nx = Math.cos(this.wallJumpSystem.wallNormalAngle);
            const ny = Math.sin(this.wallJumpSystem.wallNormalAngle);
            this.player.px += nx * 2;
            this.player.py += ny * 2;
        }
    }
}

export default WallRunSystem;
