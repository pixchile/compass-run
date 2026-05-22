// js/boss/BossManager.js
// Orquesta el ciclo de vida del boss: spawn → intro → fases → muerte.
// Actualiza BossAI + AttackScheduler cada frame.
// Dibuja la HP bar del boss en la parte superior de la pantalla.

import BossAI from './BossAI.js';
import AttackScheduler from './AttackScheduler.js';
import TelegraphRenderer from './TelegraphRenderer.js';
import { BOSS } from '../constants.js';

export default class BossManager {
    /**
     * @param {object} scene      - Phaser scene
     * @param {object} arena      - { x, y, w, h }
     * @param {EnemyManager} enemyManager
     */
    constructor(scene, arena, enemyManager) {
        this.scene        = scene;
        this.arena        = arena;
        this.enemyManager = enemyManager;

        // Boss activo (instancia de Enemy con campos extra de boss)
        this._boss        = null;
        this._definition  = null;

        // Sub-sistemas
        this._ai          = null;
        this._scheduler   = null;
        this.telegraph    = new TelegraphRenderer();

        // Estado del lifecycle
        this._state       = 'idle';  // idle|intro|active|dead
        this._introTimer  = 0;
        this._phaseIndex  = 0;
        this._transitionTimer = 0;

        // Nombre del boss para el HUD
        this._bossNameText = null;
        this._bossNameAlpha = 0;
        this._bossNameTimer = 0;
    }

    // ─── Spawn ──────────────────────────────────────────────────────────────

    /**
     * Spawnea un boss en (x, y) según su definición.
     * @param {object} definition  - BossDefinition config
     * @param {number} x
     * @param {number} y
     */
    spawn(definition, x, y) {
        if (this._boss) return; // solo 1 a la vez

        this._definition = definition;

        // Crear la entidad del boss como Enemy genérico con isBoss=true
        const basic    = definition.basic || {};
        let color = basic.color || '#cc2200';
        if (typeof color === 'string') color = parseInt(color.replace('#', ''), 16);

        this._boss = {
            id:      `boss_${definition.id}`,
            type:    definition.id,
            x, y,
            radius:  basic.radius || 40,
            shape:   basic.shape  || 'circle',
            color,
            maxHp:   basic.hp || 2000,
            hp:      basic.hp || 2000,
            isBoss:  true,
            _isBossEntity: true,  // no es BossAttackEnemy
            _invulnerable: true,  // intro invuln
            _lastDamageSource: null,
            lastHurtTime: 0,
            damageMultipliers: basic.damageMultipliers || {
                dash: 1, aerialDash: 1, momentum3: 1, slam: 1,
                slam3: 1, void: 100, wallCrash: 0, explosion: 1,
            },
            scene: this.scene,
            // Referencia al AI para que ChargeAttack pueda iniciarlo
            _ai: null,
        };

        // Inicializar subsistemas
        const bossColorHex = `#${color.toString(16).padStart(6, '0')}`;
        this._ai           = new BossAI(this.arena);
        this._scheduler    = new AttackScheduler(bossColorHex);
        this._boss._ai     = this._ai;

        // Comenzar intro
        this._state      = 'intro';
        this._introTimer = BOSS.INTRO_INVULN_MS;
        this._phaseIndex = 0;

        // Agregar al array de enemigos del EnemyManager para que reciba daño
        this.enemyManager.addEnemy(this._boss);

        // DEBUG: interceptar cambios de hp para ver quién mata al boss
        let _hp = this._boss.hp;
        Object.defineProperty(this._boss, 'hp', {
            get: () => _hp,
            set: (v) => {
                if (v < _hp) console.warn(`[Boss HP] ${_hp} → ${v}`, new Error().stack.split('\n').slice(1,4).join(' | '));
                _hp = v;
            },
            configurable: true,
        });

        console.log(`[BossManager] Spawned boss "${definition.id}" at (${x}, ${y})`);
    }

    // ─── Update ─────────────────────────────────────────────────────────────

    update(delta, player) {
        if (!this._boss || this._state === 'idle' || this._state === 'dead') return;

        // Comprobar si fue matado externamente (por daño del player)
        if (this._boss.hp <= 0 && this._state !== 'dead') {
            this._onBossDeath();
            return;
        }

        // Actualizar nombre HUD
        if (this._bossNameTimer > 0) {
            this._bossNameTimer -= delta;
            this._bossNameAlpha = Math.min(1, this._bossNameTimer / 500);
        }

        switch (this._state) {
            case 'intro':
                this._introTimer -= delta;
                if (this._introTimer <= 0) {
                    this._boss._invulnerable = false;
                    this._enterPhase(0);
                    this._state = 'active';
                    this._showBossName(this._definition.name || this._definition.id);
                }
                break;

            case 'transition':
                this._transitionTimer -= delta;
                if (this._transitionTimer <= 0) {
                    this._boss._invulnerable = false;
                    this._state = 'active';
                }
                break;

            case 'active':
                this._checkPhaseTransition();
                this._updateMovement(delta, player);
                this._scheduler.update(delta, this._boss, player, this.enemyManager, this.telegraph);
                this.telegraph.update(delta);
                break;
        }
    }

    _updateMovement(delta, player) {
        if (!this._definition || !this._boss) return;
        const phase = this._currentPhase();
        if (!phase) return;

        const delta_ = this._ai.update(delta, this._boss, player, phase.movement || {});
        this._boss.x += delta_.dx;
        this._boss.y += delta_.dy;
    }

    _checkPhaseTransition() {
        const def = this._definition;
        if (!def || !def.phases) return;
        const hpPct = (this._boss.hp / this._boss.maxHp) * 100;

        // Buscar la fase más baja cuyo threshold >= hpPct actual
        for (let i = def.phases.length - 1; i >= 0; i--) {
            const phase = def.phases[i];
            if (hpPct <= phase.threshold && i > this._phaseIndex) {
                this._enterPhase(i);
                break;
            }
        }
    }

    _enterPhase(index) {
        const def = this._definition;
        if (!def?.phases || !def.phases[index]) return;

        this._phaseIndex = index;
        const phase = def.phases[index];

        this._scheduler.setPhase(phase);

        if (index > 0) {
            // Flash + invuln breve en transición
            this._boss._invulnerable = true;
            this._state = 'transition';
            this._transitionTimer = BOSS.PHASE_TRANSITION_MS;
        }

        console.log(`[BossManager] Boss "${this._definition.id}" → Phase ${index + 1}`);
    }

    _currentPhase() {
        const phases = this._definition?.phases;
        if (!phases) return null;
        return phases[this._phaseIndex] || phases[0] || null;
    }

    // ─── Death ───────────────────────────────────────────────────────────────

    _onBossDeath() {
        if (this._state === 'dead') return;
        this._state = 'dead';

        const def  = this._definition;
        const boss = this._boss;

        console.log(`[BossManager] Boss "${def?.id}" died`);

        // Limpiar telegrafías
        this.telegraph.clear();
        this._scheduler?.reset();

        // Recompensas
        if (def?.onDeath) {
            const credits = def.onDeath.credits || 0;
            if (credits > 0 && this.scene.rewardSystem) {
                this.scene.rewardSystem.addCredits?.(credits);
            }
        }

        // El EnemyManager ya sacará al boss del array en su próximo update
        // (hp <= 0 → killEnemy, pero necesitamos que sí dé rewards)
        // Marcarlo para que no sea tratado como BossAttackEnemy
        if (boss) boss._bossKilled = true;

        this._boss       = null;
        this._definition = null;
        this._ai         = null;
        this._scheduler?.clearInstances();
        this._scheduler  = null;
    }

    // ─── Combat: aplicar daño al boss ────────────────────────────────────────

    /**
     * Recibe un attackPayload estándar del CombatSystem y lo aplica al boss.
     * Devuelve true si el boss murió.
     */
    receiveDamage(attackPayload) {
        if (!this._boss) return false;
        if (this._boss._invulnerable) return false;

        const multiplier = this._boss.damageMultipliers[attackPayload.type] ?? 1.0;
        if (multiplier <= 0) return false;

        const dmg = attackPayload.baseDamage * multiplier;
        this._boss.hp = Math.max(0, this._boss.hp - dmg);
        if (attackPayload.now) this._boss.lastHurtTime = attackPayload.now;

        return this._boss.hp <= 0;
    }

    // ─── Render: HP bar superior ─────────────────────────────────────────────

    /**
     * Dibuja la barra de HP del boss en posición fija de pantalla.
     * Llamar DESPUÉS de camera.restore() (coordenadas de pantalla).
     * @param {Phaser.GameObjects.Graphics} g
     */
    renderHUD(g) {
        if (!this._boss || this._state === 'idle' || this._state === 'dead') return;

        const cfg    = BOSS.HP_BAR;
        const hpPct  = Math.max(0, this._boss.hp / this._boss.maxHp);
        const barColor = hpPct > 0.5 ? cfg.fillHigh : (hpPct > 0.25 ? cfg.fillMid : cfg.fillLow);

        // Fondo
        g.fillStyle(cfg.bgColor, 0.9);
        g.fillRect(cfg.x, cfg.y, cfg.w, cfg.h);

        // Borde
        g.lineStyle(1.5, cfg.borderColor, 0.8);
        g.strokeRect(cfg.x, cfg.y, cfg.w, cfg.h);

        // Vida
        g.fillStyle(barColor, 1);
        g.fillRect(cfg.x, cfg.y, cfg.w * hpPct, cfg.h);

        // Brillo interior
        g.fillStyle(0xffffff, 0.12);
        g.fillRect(cfg.x, cfg.y, cfg.w * hpPct, cfg.h / 2);
    }

    /**
     * Dibuja las telegrafías (en coordenadas mundo, antes de camera.restore()).
     */
    renderTelegraph(g) {
        this.telegraph.render(g);
    }

    // ─── HUD: nombre del boss ────────────────────────────────────────────────

    _showBossName(name) {
        this._bossNameTimer = 3000;
        // El UIManager o el GameRenderer puede leer esto
    }

    // ─── Getters ─────────────────────────────────────────────────────────────

    get hasBoss()      { return !!this._boss; }
    get boss()         { return this._boss; }
    get bossName()     { return this._definition?.name || ''; }
    get bossNameAlpha(){ return Math.max(0, Math.min(1, this._bossNameTimer / 1000)); }
    get isActive()     { return this._state === 'active' || this._state === 'intro' || this._state === 'transition'; }
}
