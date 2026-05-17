// js/boss/BossAttack.js
// Clase base y 8 patrones de ataque reutilizables.
// Ciclo de vida: telegraph → execute → (cleanup)

import BossAttackEnemy from '../enemies/core/BossAttackEnemy.js';
import { BOSS } from '../constants.js';

// ─── Clase base ─────────────────────────────────────────────────────────────

export class BossAttack {
    /**
     * @param {object} opts
     * @param {number}  opts.telegraphMs  - duración del warning (ms)
     * @param {number}  opts.damage       - daño base de los attack enemies
     * @param {number}  opts.despawnMs    - cuánto viven los attack enemies
     * @param {string}  opts.bossColor    - color hex del boss dueño
     */
    constructor(opts = {}) {
        this.telegraphMs = opts.telegraphMs ?? BOSS.TELEGRAPH.RADIAL;
        this.damage      = opts.damage      ?? 10;
        this.despawnMs   = opts.despawnMs   ?? 2000;
        this.bossColor   = opts.bossColor   ?? '#ff4400';
        this._telegraphElapsed = 0;
        this._telegraphing = false;
        this._done = false;
    }

    /**
     * Llama cada frame mientras el ataque está telegrafíando.
     * @returns {boolean} true cuando el telegraph terminó y hay que ejecutar
     */
    updateTelegraph(delta, boss, player, telegraphRenderer) {
        if (!this._telegraphing) {
            this._telegraphing = true;
            this._telegraphElapsed = 0;
            this.onTelegraphStart(boss, player, telegraphRenderer);
        }
        this._telegraphElapsed += delta;
        return this._telegraphElapsed >= this.telegraphMs;
    }

    /** Override en subclases para registrar las telegrafías visuales */
    onTelegraphStart(boss, player, telegraphRenderer) {}

    /**
     * Ejecuta el ataque — spawna BossAttackEnemies.
     * @param {object} boss
     * @param {object} player
     * @param {EnemyManager} enemyManager
     */
    execute(boss, player, enemyManager) {}

    reset() {
        this._telegraphing = false;
        this._telegraphElapsed = 0;
        this._done = false;
    }

    /** Helper para crear un BossAttackEnemy fácilmente */
    _spawnAttackEnemy(x, y, scene, attackConfig) {
        const config = {
            id: 'boss_attack',
            basic: {
                hp: 9999, radius: attackConfig.radius || 12,
                color: this.bossColor, shape: 'circle',
            },
        };
        return new BossAttackEnemy(x, y, scene, config, {
            ...attackConfig,
            damage:     this.damage,
            despawnMs:  this.despawnMs,
            bossColor:  this.bossColor,
        });
    }
}

// ─── Patrón 1: Charge ────────────────────────────────────────────────────────
// Boss dashes en línea recta hacia el player. Spawna trail de entities detrás.

export class ChargeAttack extends BossAttack {
    constructor(opts = {}) {
        super({ telegraphMs: BOSS.TELEGRAPH.CHARGE, despawnMs: 800, ...opts });
        this._targetX = 0;
        this._targetY = 0;
    }

    onTelegraphStart(boss, player, tr) {
        this._targetX = player.px;
        this._targetY = player.py;
        tr.telegraphLine(boss.x, boss.y, this._targetX, this._targetY, 24, this.telegraphMs);
    }

    execute(boss, player, enemyManager) {
        // Spawnea una estela de 5 circles a lo largo de la trayectoria
        const steps = 5;
        const dx = this._targetX - boss.x;
        const dy = this._targetY - boss.y;
        const dist = Math.hypot(dx, dy) || 1;

        for (let i = 0; i < steps; i++) {
            const t  = (i + 1) / steps;
            const ex = boss.x + dx * t;
            const ey = boss.y + dy * t;
            const e  = this._spawnAttackEnemy(ex, ey, boss.scene || player.scene, {
                movementType: 'stationary',
                radius: 16,
                despawnMs: 600 + i * 80,
                lingering: false,
            });
            if (e) enemyManager.addBossAttack(e);
        }

        // Trigger charge en el BossAI
        if (boss._ai) boss._ai.initCharge(this._targetX, this._targetY);
    }
}

// ─── Patrón 2: Radial Burst ──────────────────────────────────────────────────
// N proyectiles disparados en anillo desde el boss.

export class RadialBurstAttack extends BossAttack {
    /**
     * @param {object} opts
     * @param {number} opts.count     - cantidad de proyectiles
     * @param {number} opts.speed     - velocidad de los proyectiles
     * @param {number} opts.offsetAngle - rotación adicional del anillo (rad)
     */
    constructor(opts = {}) {
        super({ telegraphMs: BOSS.TELEGRAPH.RADIAL, despawnMs: 2500, ...opts });
        this.count       = opts.count       ?? 8;
        this.speed       = opts.speed       ?? 280;
        this.offsetAngle = opts.offsetAngle ?? 0;
    }

    onTelegraphStart(boss, player, tr) {
        tr.telegraphCircle(boss.x, boss.y, 120, this.telegraphMs);
    }

    execute(boss, player, enemyManager) {
        const scene = boss.scene || player.scene;
        for (let i = 0; i < this.count; i++) {
            const angle = this.offsetAngle + (Math.PI * 2 * i / this.count);
            const e = this._spawnAttackEnemy(boss.x, boss.y, scene, {
                movementType: 'linear',
                vx: Math.cos(angle) * this.speed,
                vy: Math.sin(angle) * this.speed,
                radius: 10,
            });
            if (e) enemyManager.addBossAttack(e);
        }
    }
}

// ─── Patrón 3: Cone ──────────────────────────────────────────────────────────
// Abanico de proyectiles apuntando al player.

export class ConeAttack extends BossAttack {
    /**
     * @param {object} opts
     * @param {number} opts.count     - proyectiles en el cono
     * @param {number} opts.halfArc   - semi-apertura en radianes (default π/4 = 45°)
     * @param {number} opts.speed     - velocidad de proyectiles
     */
    constructor(opts = {}) {
        super({ telegraphMs: BOSS.TELEGRAPH.CONE, despawnMs: 2000, ...opts });
        this.count   = opts.count   ?? 5;
        this.halfArc = opts.halfArc ?? Math.PI / 4;
        this.speed   = opts.speed   ?? 320;
    }

    onTelegraphStart(boss, player, tr) {
        const angle = Math.atan2(player.py - boss.y, player.px - boss.x);
        tr.telegraphCone(boss.x, boss.y, angle, this.halfArc, 200, this.telegraphMs);
        this._angle = angle;
    }

    execute(boss, player, enemyManager) {
        const scene = boss.scene || player.scene;
        const angle = this._angle ?? Math.atan2(player.py - boss.y, player.px - boss.x);
        for (let i = 0; i < this.count; i++) {
            const t = this.count === 1 ? 0.5 : i / (this.count - 1);
            const a = angle - this.halfArc + this.halfArc * 2 * t;
            const e = this._spawnAttackEnemy(boss.x, boss.y, scene, {
                movementType: 'linear',
                vx: Math.cos(a) * this.speed,
                vy: Math.sin(a) * this.speed,
                radius: 10,
            });
            if (e) enemyManager.addBossAttack(e);
        }
    }
}

// ─── Patrón 4: Orbit Ring ────────────────────────────────────────────────────
// N entities que orbitan alrededor del boss, radio creciente.

export class OrbitRingAttack extends BossAttack {
    /**
     * @param {object} opts
     * @param {number} opts.count       - satélites
     * @param {number} opts.orbitRadius - radio inicial
     * @param {number} opts.orbitSpeed  - rad/s
     */
    constructor(opts = {}) {
        super({ telegraphMs: BOSS.TELEGRAPH.RADIAL, despawnMs: 4000, ...opts });
        this.count       = opts.count       ?? 6;
        this.orbitRadius = opts.orbitRadius ?? 90;
        this.orbitSpeed  = opts.orbitSpeed  ?? 1.8;
    }

    onTelegraphStart(boss, player, tr) {
        tr.telegraphCircle(boss.x, boss.y, this.orbitRadius, this.telegraphMs);
    }

    execute(boss, player, enemyManager) {
        const scene = boss.scene || player.scene;
        for (let i = 0; i < this.count; i++) {
            const startAngle = (Math.PI * 2 * i / this.count);
            const e = this._spawnAttackEnemy(
                boss.x + Math.cos(startAngle) * this.orbitRadius,
                boss.y + Math.sin(startAngle) * this.orbitRadius,
                scene,
                {
                    movementType: 'orbit',
                    orbitOrigin: boss, // referencia viva: sigue al boss
                    orbitSpeed: this.orbitSpeed,
                    orbitRadius: this.orbitRadius,
                    orbitAngle: startAngle,
                    radius: 12,
                }
            );
            if (e) enemyManager.addBossAttack(e);
        }
    }
}

// ─── Patrón 5: Ground Slam ───────────────────────────────────────────────────
// Onda circular expansiva desde la posición del boss.

export class GroundSlamAttack extends BossAttack {
    /**
     * @param {object} opts
     * @param {number} opts.waveCount - número de ondas concéntricas
     * @param {number} opts.waveGap   - gap en ms entre ondas
     */
    constructor(opts = {}) {
        super({ telegraphMs: BOSS.TELEGRAPH.GROUND, despawnMs: 1200, ...opts });
        this.waveCount = opts.waveCount ?? 3;
        this.waveGap   = opts.waveGap   ?? 0;
    }

    onTelegraphStart(boss, player, tr) {
        tr.telegraphGround(boss.x, boss.y, 200, this.telegraphMs);
        this._origin = { x: boss.x, y: boss.y };
    }

    execute(boss, player, enemyManager) {
        const scene  = boss.scene || player.scene;
        const ox     = this._origin?.x ?? boss.x;
        const oy     = this._origin?.y ?? boss.y;
        const count  = 16; // entidades por onda
        const radius = 60;

        for (let wave = 0; wave < this.waveCount; wave++) {
            const waveRadius = radius + wave * 60;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i / count);
                const ex    = ox + Math.cos(angle) * waveRadius;
                const ey    = oy + Math.sin(angle) * waveRadius;
                const e     = this._spawnAttackEnemy(ex, ey, scene, {
                    movementType: 'stationary',
                    radius: 14,
                    lingering: false,
                    despawnMs: this.despawnMs + wave * 200,
                });
                if (e) enemyManager.addBossAttack(e);
            }
        }
    }
}

// ─── Patrón 6: Targeted Barrage ──────────────────────────────────────────────
// 3-5 proyectiles rápidos apuntando a la posición exacta del player.

export class TargetedBarrageAttack extends BossAttack {
    /**
     * @param {object} opts
     * @param {number} opts.count  - proyectiles
     * @param {number} opts.spread - dispersión aleatoria (px)
     * @param {number} opts.speed
     */
    constructor(opts = {}) {
        super({ telegraphMs: BOSS.TELEGRAPH.BARRAGE, despawnMs: 2000, ...opts });
        this.count  = opts.count  ?? 4;
        this.spread = opts.spread ?? 30;
        this.speed  = opts.speed  ?? 400;
    }

    onTelegraphStart(boss, player, tr) {
        for (let i = 0; i < this.count; i++) {
            tr.telegraphCrosshair(
                player.px + (Math.random() - 0.5) * this.spread,
                player.py + (Math.random() - 0.5) * this.spread,
                18,
                this.telegraphMs
            );
        }
        this._px = player.px;
        this._py = player.py;
    }

    execute(boss, player, enemyManager) {
        const scene = boss.scene || player.scene;
        for (let i = 0; i < this.count; i++) {
            const tx = (this._px ?? player.px) + (Math.random() - 0.5) * this.spread;
            const ty = (this._py ?? player.py) + (Math.random() - 0.5) * this.spread;
            const dx = tx - boss.x;
            const dy = ty - boss.y;
            const dist = Math.hypot(dx, dy) || 1;
            const e = this._spawnAttackEnemy(boss.x, boss.y, scene, {
                movementType: 'linear',
                vx: (dx / dist) * this.speed,
                vy: (dy / dist) * this.speed,
                radius: 9,
            });
            if (e) enemyManager.addBossAttack(e);
        }
    }
}

// ─── Patrón 7: Wall Spawn ────────────────────────────────────────────────────
// Línea de entidades estacionarias perpendicular al movimiento del player.

export class WallSpawnAttack extends BossAttack {
    /**
     * @param {object} opts
     * @param {number} opts.count   - entidades en la pared
     * @param {number} opts.spacing - px entre entidades
     * @param {number} opts.length  - largo total de la pared
     */
    constructor(opts = {}) {
        super({ telegraphMs: BOSS.TELEGRAPH.LINE, despawnMs: 3500, ...opts });
        this.count   = opts.count   ?? 8;
        this.spacing = opts.spacing ?? 40;
    }

    onTelegraphStart(boss, player, tr) {
        // Calcular posición perpendicular al movimiento del player
        const pvx = player.vx || 1;
        const pvy = player.vy || 0;
        const pmag = Math.hypot(pvx, pvy) || 1;
        // perpendicular
        const perpX = -pvy / pmag;
        const perpY =  pvx / pmag;

        const halfLen = (this.count * this.spacing) / 2;
        // Linea delante del player
        const cx = player.px + (pvx / pmag) * 200;
        const cy = player.py + (pvy / pmag) * 200;

        tr.telegraphLine(
            cx - perpX * halfLen, cy - perpY * halfLen,
            cx + perpX * halfLen, cy + perpY * halfLen,
            16, this.telegraphMs
        );

        this._wallCenter = { x: cx, y: cy };
        this._perpX = perpX;
        this._perpY = perpY;
    }

    execute(boss, player, enemyManager) {
        const scene   = boss.scene || player.scene;
        const cx      = this._wallCenter?.x ?? player.px;
        const cy      = this._wallCenter?.y ?? player.py;
        const px      = this._perpX ?? 1;
        const py      = this._perpY ?? 0;
        const half    = Math.floor(this.count / 2);

        for (let i = -half; i <= half; i++) {
            const ex = cx + px * i * this.spacing;
            const ey = cy + py * i * this.spacing;
            const e  = this._spawnAttackEnemy(ex, ey, scene, {
                movementType: 'stationary',
                radius: 14,
                lingering: true,
            });
            if (e) enemyManager.addBossAttack(e);
        }
    }
}

// ─── Patrón 8: Minion Summon ─────────────────────────────────────────────────
// Spawnea N enemigos reales (no attack-tagged) usando el EnemyRegistry.

export class MinionSummonAttack extends BossAttack {
    /**
     * @param {object} opts
     * @param {string[]} opts.minionTypes  - tipos de la EnemyRegistry a spawnear
     * @param {number}   opts.count        - cuántos por invocación
     * @param {number}   opts.spawnRadius  - radio alrededor del boss
     */
    constructor(opts = {}) {
        super({ telegraphMs: 1000, despawnMs: 0, ...opts });
        this.minionTypes  = opts.minionTypes  || [];
        this.count        = opts.count        || 3;
        this.spawnRadius  = opts.spawnRadius  || 120;
    }

    onTelegraphStart(boss, player, tr) {
        tr.telegraphCircle(boss.x, boss.y, this.spawnRadius, this.telegraphMs);
    }

    execute(boss, player, enemyManager) {
        if (!this.minionTypes.length) return;
        const scene = boss.scene || player.scene;
        const registry = scene?.enemyRegistry || window._enemyRegistry;
        if (!registry) return;

        for (let i = 0; i < this.count; i++) {
            const type  = this.minionTypes[i % this.minionTypes.length];
            const angle = (Math.PI * 2 * i / this.count);
            const ex    = boss.x + Math.cos(angle) * this.spawnRadius;
            const ey    = boss.y + Math.sin(angle) * this.spawnRadius;
            const minion = registry.create(type, ex, ey, scene);
            if (minion) enemyManager.addEnemy(minion);
        }
    }
}

// ─── Export mapa por nombre ───────────────────────────────────────────────────

export const ATTACK_TYPES = {
    charge:          ChargeAttack,
    radial_burst:    RadialBurstAttack,
    cone:            ConeAttack,
    orbit_ring:      OrbitRingAttack,
    ground_slam:     GroundSlamAttack,
    targeted_barrage: TargetedBarrageAttack,
    wall_spawn:      WallSpawnAttack,
    minion_summon:   MinionSummonAttack,
};

/**
 * Factoría: crea un ataque por nombre de string.
 * @param {string} name
 * @param {object} opts
 */
export function createAttack(name, opts = {}) {
    const Cls = ATTACK_TYPES[name];
    if (!Cls) {
        console.warn(`BossAttack: tipo desconocido "${name}"`);
        return null;
    }
    return new Cls(opts);
}
