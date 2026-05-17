// js/boss/AttackScheduler.js
// Maneja qué ataque seleccionar y cuándo, según el pool de la fase actual.
// Weighted random, cooldowns individuales, interval min/max, no solapamiento.

import { createAttack } from './BossAttack.js';

export default class AttackScheduler {
    /**
     * @param {string} bossColor  - hex color para pasarle a los ataques
     */
    constructor(bossColor = '#ff4400') {
        this.bossColor = bossColor;

        // Phase config actual
        this._pool            = [];     // [ { attack: 'charge', weight, cooldown, cooldownMs }, ...]
        this._minInterval     = 1500;
        this._maxInterval     = 4000;

        // Estado runtime
        this._cooldowns       = {};     // attack name → remaining ms
        this._nextAttackIn    = 0;      // ms hasta el próximo intento
        this._currentAttack   = null;   // BossAttack en curso (telegraph o execute)
        this._phase           = 'idle'; // 'idle'|'telegraph'|'execute'
        this._attackInstances = {};     // cache de instancias reutilizables
    }

    /**
     * Cambia el pool de ataques de la fase actual.
     * @param {object} phaseConfig  - { attackPool, minAttackInterval, maxAttackInterval }
     */
    setPhase(phaseConfig) {
        this._pool        = phaseConfig.attackPool        || [];
        this._minInterval = phaseConfig.minAttackInterval ?? 1500;
        this._maxInterval = phaseConfig.maxAttackInterval ?? 4000;

        // Crear/cachear instancias para esta fase
        for (const entry of this._pool) {
            const key = entry.attack;
            if (!this._attackInstances[key]) {
                const inst = createAttack(key, {
                    ...entry.opts,
                    bossColor: this.bossColor,
                    damage: entry.damage,
                    despawnMs: entry.despawnMs,
                });
                if (inst) this._attackInstances[key] = inst;
            }
        }

        // Reset timer para evitar ataque inmediato en transición
        this._nextAttackIn = this._minInterval;
        this._phase = 'idle';
        this._currentAttack = null;
    }

    /**
     * Actualizar cada frame.
     * @param {number} delta  ms
     * @param {object} boss
     * @param {object} player
     * @param {EnemyManager} enemyManager
     * @param {TelegraphRenderer} telegraphRenderer
     */
    update(delta, boss, player, enemyManager, telegraphRenderer) {
        // Actualizar cooldowns
        for (const key in this._cooldowns) {
            this._cooldowns[key] = Math.max(0, this._cooldowns[key] - delta);
        }

        if (this._phase === 'telegraph' && this._currentAttack) {
            const ready = this._currentAttack.updateTelegraph(delta, boss, player, telegraphRenderer);
            if (ready) {
                this._phase = 'execute';
                this._currentAttack.execute(boss, player, enemyManager);
                // Iniciar cooldown para este ataque
                const entry = this._pool.find(e => e.attack === this._currentAttackName);
                if (entry) this._cooldowns[this._currentAttackName] = entry.cooldown || 4000;
                this._currentAttack.reset();
                this._currentAttack = null;
                this._currentAttackName = null;
                // Programar siguiente ataque
                this._nextAttackIn = this._minInterval + Math.random() * (this._maxInterval - this._minInterval);
                this._phase = 'idle';
            }
            return;
        }

        if (this._phase === 'idle') {
            this._nextAttackIn -= delta;
            if (this._nextAttackIn <= 0) {
                const chosen = this._pickAttack();
                if (chosen) {
                    this._currentAttackName = chosen;
                    this._currentAttack     = this._attackInstances[chosen];
                    this._phase = 'telegraph';
                } else {
                    // Todos en cooldown — reintentar pronto
                    this._nextAttackIn = 500;
                }
            }
        }
    }

    /** Selección ponderada excluyendo ataques en cooldown */
    _pickAttack() {
        const available = this._pool.filter(entry => {
            const cd = this._cooldowns[entry.attack] || 0;
            return cd <= 0 && this._attackInstances[entry.attack];
        });

        if (!available.length) return null;

        const totalWeight = available.reduce((sum, e) => sum + (e.weight || 1), 0);
        let roll = Math.random() * totalWeight;

        for (const entry of available) {
            roll -= (entry.weight || 1);
            if (roll <= 0) return entry.attack;
        }

        return available[available.length - 1].attack;
    }

    /** ¿Hay un ataque en curso? (telegraph o execute) */
    get isBusy() {
        return this._phase !== 'idle';
    }

    /** Resetea todos los estados — útil en transición de fase */
    reset() {
        this._cooldowns       = {};
        this._nextAttackIn    = this._minInterval;
        this._currentAttack   = null;
        this._currentAttackName = null;
        this._phase = 'idle';
    }

    /** Limpia las instancias cacheadas (al cambiar de boss) */
    clearInstances() {
        this._attackInstances = {};
        this.reset();
    }
}
