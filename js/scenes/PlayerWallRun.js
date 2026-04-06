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
    }

    reset() {
        this.isWallRunning = false;
        this.wallRunSpeed = 0;
        this.wallTangentX = 0;
        this.wallTangentY = 0;
        this.wallRunDirection = 1;
        this.currentWallLine = null;
    }

    tryStartWallRun(wallNormalAngle, momentumLevel, moveDirection, wallLine) {
        console.log("🔍 tryStartWallRun", { wallStick: this.wallJumpSystem.wallStick, moving: !!moveDirection, wallLine });
        if (!this.wallJumpSystem.wallStick) return false;
        
        const isMoving = Math.abs(moveDirection.x) > 0.1 || Math.abs(moveDirection.y) > 0.1;
        if (!isMoving) return false;
        
        const tangentX = Math.cos(wallNormalAngle + Math.PI/2);
        const tangentY = Math.sin(wallNormalAngle + Math.PI/2);
        
        const dot = moveDirection.x * tangentX + moveDirection.y * tangentY;
        console.log("   dot with tangent:", dot);
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
        
        console.log("🏃‍♂️ Wall RUN started! Speed:", speed, "Direction:", direction, "Tangent:", tangentX, tangentY);
        return true;
    }

    isStillTouchingWall(playerRadius) {
        if (!this.currentWallLine) return false;
        const line = this.currentWallLine;
        const start = line.start;
        const end = line.end;
        const abx = end.x - start.x;
        const aby = end.y - start.y;
        const len2 = abx * abx + aby * aby;
        if (len2 === 0) return false;
        let t = ((this.player.px - start.x) * abx + (this.player.py - start.y) * aby) / len2;
        t = Math.max(0, Math.min(1, t));
        const closestX = start.x + t * abx;
        const closestY = start.y + t * aby;
        const dx = this.player.px - closestX;
        const dy = this.player.py - closestY;
        const distance = Math.hypot(dx, dy);
        const threshold = playerRadius + (line.thickness / 2) + 5;
        const touching = distance <= threshold;
        if (!touching) console.log("🚫 Left the wall! distance:", distance, "threshold:", threshold);
        return touching;
    }

    update(delta, moveDirection, now, playerRadius = 12) {
        if (!this.isWallRunning) return false;
        
        if (!this.isStillTouchingWall(playerRadius)) {
            this.stopWallRun();
            return false;
        }
        
        if (!this.wallJumpSystem.wallStick) {
            this.stopWallRun();
            return false;
        }
        
        const stickDuration = now - (this.wallJumpSystem.wallStickStartTime || 0);
        if (stickDuration >= WALL_RUN.MAX_DURATION) {
            this.stopWallRun();
            return false;
        }
        
        const isMoving = Math.abs(moveDirection.x) > 0.1 || Math.abs(moveDirection.y) > 0.1;
        if (!isMoving) {
            this.stopWallRun();
            return false;
        }
        
        const dot = moveDirection.x * this.wallTangentX + moveDirection.y * this.wallTangentY;
        if (Math.abs(dot) < 0.1) {
            this.stopWallRun();
            return false;
        }
        
        const newDirection = dot > 0 ? 1 : -1;
        if (newDirection !== this.wallRunDirection) {
            this.wallRunDirection = newDirection;
        }
        
        this.player.vx = this.wallRunSpeed * this.wallRunDirection * this.wallTangentX;
        this.player.vy = this.wallRunSpeed * this.wallRunDirection * this.wallTangentY;
        
        return true;
    }
    
    stopWallRun() {
        console.log("🛑 Wall run stopped");
        this.isWallRunning = false;
        this.currentWallLine = null;
        this.player.vx = 0;
        this.player.vy = 0;
    }
}

export default WallRunSystem;