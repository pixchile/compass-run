// js/enemies/core/BossAttackEnemy.js
// Entidad spawneada por ataques del boss. No usa AI, no cuenta como kill,
// se autodestruye por timer o al tocar pared.

import Enemy from '../../scenes/Enemy.js';

export default class BossAttackEnemy extends Enemy {
    /**
     * @param {number} x
     * @param {number} y
     * @param {object} scene
     * @param {object} config  - config estándar de Enemy
     * @param {object} attackConfig
     * @param {number} attackConfig.despawnMs     - ms hasta autodestrucción
     * @param {string} attackConfig.movementType  - 'ballistic'|'linear'|'orbit'|'stationary'|'homing'
     * @param {number} attackConfig.vx            - velocidad inicial x (ballistic/linear)
     * @param {number} attackConfig.vy            - velocidad inicial y
     * @param {number} attackConfig.speed         - magnitud de velocidad (linear/homing)
     * @param {number} attackConfig.damage        - daño al contacto con player
     * @param {boolean} attackConfig.lingering    - si true, no despawnea al tocar player (AoE zone)
     * @param {object} attackConfig.orbitOrigin   - { x, y } para movimiento orbit
     * @param {number} attackConfig.orbitSpeed    - rad/s para orbit
     * @param {number} attackConfig.orbitRadius   - px para orbit
     * @param {number} attackConfig.orbitAngle    - ángulo inicial para orbit
     * @param {string} attackConfig.bossColor     - color del boss dueño (hex) para visuals
     */
    constructor(x, y, scene, config, attackConfig = {}) {
        super(x, y, scene, config);

        // Tags que distinguen a este enemigo del resto
        this._isBossAttack  = true;
        this._attackTeam    = 'boss';

        // Movimiento
        this._movementType  = attackConfig.movementType || 'stationary';
        this._vx            = attackConfig.vx || 0;
        this._vy            = attackConfig.vy || 0;
        this._speed         = attackConfig.speed || 0;
        this._orbitOrigin   = attackConfig.orbitOrigin || null;
        this._orbitSpeed    = attackConfig.orbitSpeed || 1.5;
        this._orbitRadius   = attackConfig.orbitRadius || 100;
        this._orbitAngle    = attackConfig.orbitAngle || 0;

        // Timer de despawn
        this._despawnTimer  = attackConfig.despawnMs || 3000;
        this._maxDespawnMs  = this._despawnTimer;

        // Combat
        this._attackDamage  = attackConfig.damage || 10;
        this._lingering     = attackConfig.lingering || false;
        this._hitPlayer     = false; // para non-lingering: solo golpea una vez

        // Visual
        this._bossColorHex  = attackConfig.bossColor || '#ff4400';
        this._bossColor     = parseInt(this._bossColorHex.replace('#', ''), 16);

        // Override maxHp a algo alto — no mueren por daño, solo por timer
        this.maxHp = 9999;
        this.hp    = 9999;

        // Sin bar de vida (se renderiza distinto en EnemyRenderer)
        this.isBoss = false;
    }

    update(delta, player, lines) {
        // Sin regen ni hpRegen base
        this._despawnTimer -= delta;
        if (this._despawnTimer <= 0) {
            this.hp = 0;
            return;
        }

        this._updateMovement(delta, lines);
    }

    _updateMovement(delta, lines) {
        const dt = delta / 1000;

        switch (this._movementType) {
            case 'ballistic':
            case 'linear':
                this.x += this._vx * dt;
                this.y += this._vy * dt;
                if (lines) this._checkWallDespawn(lines);
                break;

            case 'homing':
                // Se actualiza desde BossAttack con la posición del player
                this.x += this._vx * dt;
                this.y += this._vy * dt;
                break;

            case 'orbit':
                if (this._orbitOrigin) {
                    this._orbitAngle += this._orbitSpeed * dt;
                    this.x = this._orbitOrigin.x + Math.cos(this._orbitAngle) * this._orbitRadius;
                    this.y = this._orbitOrigin.y + Math.sin(this._orbitAngle) * this._orbitRadius;
                }
                break;

            case 'stationary':
            default:
                // No se mueve
                break;
        }
    }

    _checkWallDespawn(lines) {
        for (const line of lines) {
            if (!line || line.destructible === false) continue;
            // Check simple de proximidad a segmento de línea
            const d = this._distToSegment(this.x, this.y, line.x1, line.y1, line.x2, line.y2);
            if (d < this.radius) {
                this.hp = 0;
                return;
            }
        }
    }

    _distToSegment(px, py, ax, ay, bx, by) {
        const dx = bx - ax, dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - ax, py - ay);
        let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    }

    /**
     * Alfa de opacidad basado en tiempo de vida restante (fade in/out suave)
     */
    getAlpha() {
        const pct = this._despawnTimer / this._maxDespawnMs;
        if (pct > 0.8) return 1 - (pct - 0.8) / 0.2; // fade in en primeros 20%
        if (pct < 0.2) return pct / 0.2;               // fade out en últimos 20%
        return 1;
    }

    get bossColor() { return this._bossColor; }
}
