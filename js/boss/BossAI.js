// js/boss/BossAI.js
// Controla el movimiento del boss según el estilo definido en cada fase.
// Devuelve un delta {dx, dy} que BossManager aplica a la posición del boss.

import { BOSS } from '../constants.js';

export default class BossAI {
    /**
     * @param {object} arena  - { x, y, w, h } bounds del arena
     */
    constructor(arena) {
        this.arena = arena;
        this._strafeDir   = 1;      // 1 o -1
        this._strafeTimer = 0;
        this._chargeTarget = null;
        this._chargeActive = false;
        this._orbitAngle   = Math.random() * Math.PI * 2;
    }

    /**
     * Actualiza el movimiento del boss.
     * @param {number} delta  ms
     * @param {object} boss   - { x, y, radius }
     * @param {object} player - { px, py }
     * @param {object} movementConfig - { style, distance, speed }
     * @returns {{ dx: number, dy: number }}
     */
    update(delta, boss, player, movementConfig) {
        const dt  = delta / 1000;
        const cfg = movementConfig || {};
        const style = cfg.style || 'none';

        switch (style) {
            case 'strafe':   return this._strafe(dt, boss, player, cfg);
            case 'pursue':   return this._pursue(dt, boss, player, cfg);
            case 'flee_to_edge': return this._fleeToEdge(dt, boss, player, cfg);
            case 'hold_center':  return this._holdCenter(dt, boss, cfg);
            case 'charge_position': return this._chargePosition(dt, boss, player, cfg);
            case 'none':
            default:         return { dx: 0, dy: 0 };
        }
    }

    /** Orbita al player a distancia fija, cambia de dirección periódicamente */
    _strafe(dt, boss, player, cfg) {
        this._strafeTimer -= dt * 1000;
        if (this._strafeTimer <= 0) {
            this._strafeDir  *= -1;
            this._strafeTimer = BOSS.AI.STRAFE_SWITCH_MS + (Math.random() - 0.5) * 1000;
        }

        const targetDist = cfg.distance || 250;
        const speed      = cfg.speed    || 280;

        const dx = boss.x - player.px;
        const dy = boss.y - player.py;
        const dist = Math.hypot(dx, dy) || 1;

        // Perpendicular al vector boss→player
        const perpX = (-dy / dist) * this._strafeDir;
        const perpY = ( dx / dist) * this._strafeDir;

        // Corrección de distancia: acercar o alejar
        const distErr  = dist - targetDist;
        const radialX  = -(dx / dist) * Math.sign(distErr) * 0.5;
        const radialY  = -(dy / dist) * Math.sign(distErr) * 0.5;

        const moveX = (perpX + radialX);
        const moveY = (perpY + radialY);
        const mag   = Math.hypot(moveX, moveY) || 1;

        return this._clampToArena(boss, {
            dx: (moveX / mag) * speed * dt,
            dy: (moveY / mag) * speed * dt,
        });
    }

    /** Persigue al player con inercia (turning suave) */
    _pursue(dt, boss, player, cfg) {
        const speed   = cfg.speed   || 220;
        const inertia = BOSS.AI.PURSUE_INERTIA;

        const dx = player.px - boss.x;
        const dy = player.py - boss.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (!this._pursueVx) { this._pursueVx = 0; this._pursueVy = 0; }

        const targetVx = (dx / dist) * speed;
        const targetVy = (dy / dist) * speed;

        this._pursueVx += (targetVx - this._pursueVx) * inertia;
        this._pursueVy += (targetVy - this._pursueVy) * inertia;

        return this._clampToArena(boss, {
            dx: this._pursueVx * dt,
            dy: this._pursueVy * dt,
        });
    }

    /** Huye al borde más cercano del arena */
    _fleeToEdge(dt, boss, player, cfg) {
        const speed = cfg.speed || 300;

        const cx = this.arena.x + this.arena.w / 2;
        const cy = this.arena.y + this.arena.h / 2;

        // Dirección desde el centro (para elegir borde)
        const dx = boss.x - cx;
        const dy = boss.y - cy;
        const dist = Math.hypot(dx, dy) || 1;

        // También repelemos desde el player
        const pdx  = boss.x - player.px;
        const pdy  = boss.y - player.py;
        const pdist = Math.hypot(pdx, pdy) || 1;

        const moveX = (dx / dist) * 0.4 + (pdx / pdist) * 0.6;
        const moveY = (dy / dist) * 0.4 + (pdy / pdist) * 0.6;
        const mag   = Math.hypot(moveX, moveY) || 1;

        return this._clampToArena(boss, {
            dx: (moveX / mag) * speed * dt,
            dy: (moveY / mag) * speed * dt,
        });
    }

    /** Mantiene al boss cerca del centro del arena con drift suave */
    _holdCenter(dt, boss, cfg) {
        const speed = cfg.speed || 80;
        const cx = this.arena.x + this.arena.w / 2;
        const cy = this.arena.y + this.arena.h / 2;

        const dx   = cx - boss.x;
        const dy   = cy - boss.y;
        const dist = Math.hypot(dx, dy) || 1;

        // Solo moverse si está lejos del centro
        if (dist < 30) return { dx: 0, dy: 0 };

        return {
            dx: (dx / dist) * Math.min(speed, dist) * dt,
            dy: (dy / dist) * Math.min(speed, dist) * dt,
        };
    }

    /**
     * Telegraph + dash rápido.
     * Llamar initCharge(targetX, targetY) antes de que el ataque arranque.
     * Mientras _chargeActive=true devuelve delta rápido hacia el target.
     */
    _chargePosition(dt, boss, player, cfg) {
        if (!this._chargeActive || !this._chargeTarget) {
            return { dx: 0, dy: 0 };
        }

        const speed = BOSS.AI.CHARGE_SPEED;
        const dx    = this._chargeTarget.x - boss.x;
        const dy    = this._chargeTarget.y - boss.y;
        const dist  = Math.hypot(dx, dy) || 1;

        if (dist < 8) {
            this._chargeActive = false;
            this._chargeTarget = null;
            return { dx: 0, dy: 0 };
        }

        const move = Math.min(speed * dt, dist);
        return {
            dx: (dx / dist) * move,
            dy: (dy / dist) * move,
        };
    }

    /** Inicia un charge hacia un punto dado */
    initCharge(targetX, targetY) {
        this._chargeTarget = { x: targetX, y: targetY };
        this._chargeActive = true;
    }

    /** Cancela el charge activo */
    stopCharge() {
        this._chargeActive = false;
        this._chargeTarget = null;
    }

    get isCharging() { return this._chargeActive; }

    /** Clampea el delta resultante para que el boss no salga del arena + margen */
    _clampToArena(boss, delta) {
        const margin = BOSS.ARENA_MARGIN;
        const minX   = this.arena.x - margin;
        const minY   = this.arena.y - margin;
        const maxX   = this.arena.x + this.arena.w + margin;
        const maxY   = this.arena.y + this.arena.h + margin;

        const nx = boss.x + delta.dx;
        const ny = boss.y + delta.dy;

        return {
            dx: nx < minX ? (minX - boss.x) : (nx > maxX ? (maxX - boss.x) : delta.dx),
            dy: ny < minY ? (minY - boss.y) : (ny > maxY ? (maxY - boss.y) : delta.dy),
        };
    }
}
