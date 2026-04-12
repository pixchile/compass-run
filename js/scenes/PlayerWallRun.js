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
        const lines = this.scene.currentMap?.lines || [];
        const threshold = playerRadius + 20;

        // 1. Prioridad: verificar si el muro ACTUAL sigue en rango.
        //    Esto evita que una pared perpendicular (esquina) reemplace a currentWallLine
        //    antes de que checkLineCollisions pueda detectar la colisión real.
        if (this.currentWallLine && !this.currentWallLine._broken) {
            const line = this.currentWallLine;
            const abx = line.end.x - line.start.x;
            const aby = line.end.y - line.start.y;
            const len2 = abx * abx + aby * aby;
            if (len2 > 0) {
                let t = ((this.player.px - line.start.x) * abx + (this.player.py - line.start.y) * aby) / len2;
                t = Math.max(0, Math.min(1, t));
                const closestX = line.start.x + t * abx;
                const closestY = line.start.y + t * aby;
                const distance = Math.hypot(this.player.px - closestX, this.player.py - closestY);
                if (distance <= threshold) return true; // mismo muro, sigue válido
            }
        }

        // 2. El muro actual ya no está en rango (llegó al final del segmento).
        //    Buscar un segmento continuo: DEBE ser aproximadamente paralelo al tangente actual.
        //    Muros perpendiculares (esquinas) NO cuentan — esos deben ser manejados
        //    por checkLineCollisions como una colisión real.
        const tx = this.wallTangentX;
        const ty = this.wallTangentY;
        // umbral de paralelismo: cos(~32°) ≈ 0.85. Muros más perpendiculares que eso = esquina.
        const PARALLEL_THRESHOLD = 0.85;

        for (const line of lines) {
            if (line._broken || line === this.currentWallLine) continue;

            const abx = line.end.x - line.start.x;
            const aby = line.end.y - line.start.y;
            const len = Math.hypot(abx, aby);
            if (len === 0) continue;

            // Verificar que la línea sea suficientemente paralela al tangente del wallrun actual
            const parallelDot = Math.abs((abx / len) * tx + (aby / len) * ty);
            if (parallelDot < PARALLEL_THRESHOLD) continue; // muy perpendicular → es esquina, ignorar aquí

            const len2 = len * len;
            let t = ((this.player.px - line.start.x) * abx + (this.player.py - line.start.y) * aby) / len2;
            t = Math.max(0, Math.min(1, t));
            const closestX = line.start.x + t * abx;
            const closestY = line.start.y + t * aby;
            const distance = Math.hypot(this.player.px - closestX, this.player.py - closestY);

            if (distance <= threshold) {
                // Transición válida: segmento paralelo continuo
                this.currentWallLine = line;
                return true;
            }
        }

        return false;
    }

    update(delta, moveDirection, now, playerRadius = 12) {
        if (!this.isWallRunning) return false;
        
        if (!this.isStillTouchingWall(playerRadius)) {
            this.stopWallRun(true); // natural exit: reached wall end
            return false;
        }
        
        if (!this.wallJumpSystem.wallStick) {
            this.stopWallRun();
            return false;
        }
        
        const stickDuration = now - (this.wallJumpSystem.wallStickStartTime || 0);
        if (stickDuration >= WALL_RUN.MAX_DURATION) {
            this.stopWallRun(true);
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
    
    stopWallRun(naturalExit = false) {
        console.log("🛑 Wall run stopped", naturalExit ? "(natural exit)" : "");
        this.isWallRunning = false;
        this.currentWallLine = null;
        this.wasNaturalExit = naturalExit;

        if (naturalExit) {
            // FIX BUG: Nudge muy leve para salir de la colisión, sin inyectar velocidad drástica
            const nx = Math.cos(this.wallJumpSystem.wallNormalAngle);
            const ny = Math.sin(this.wallJumpSystem.wallNormalAngle);
            this.player.px += nx * 2;
            this.player.py += ny * 2;
        } else {
            // FIX BUG: Ya no reseteamos a this.player.vx/vy = 0.
            // Conservar la inercia permite transiciones suaves y evita el efecto "pegado".
        }
    }
}

export default WallRunSystem;
