// js/enemies/core/DynamicEnemy.js
import Enemy from '../../scenes/Enemy.js';

export default class DynamicEnemy extends Enemy {
    constructor(x, y, scene, config) {
        super(x, y, scene, config);

        const mov = config.movement || {};

        this.isMobile = mov.mobile ?? true;
        this.baseSpeed = mov.speed || 50;
        this.speed = this.baseSpeed;

        this.speedScaling = mov.scaling || { hpBase: 'none', hpPercentage: 0 };

        this.movementStyle = mov.style || 'seek';
        this.orbitRadius = mov.orbitRange || 120;
        this.erraticTime = mov.erraticTime || 2000;

        this.ignoreWalls = mov.ignoreWalls ?? false;
        this.isPhantom = mov.isPhantom || false;

        const amb = config.ambitious || {};
        this.isWall = amb.isWall || false;
        this.evade = amb.defense?.evade || false;
        this.invulnerableAura = amb.defense?.invulnerableAura || false;

        // Enemy inicializa orbitAngle a 0; DynamicEnemy usa aleatorio
        this.state.orbitAngle = Math.random() * Math.PI * 2;

        const basic = config.basic || {};
        const sd = basic.selfDestruct || {};
        this.selfDestructType  = sd.type  || 'none';
        this.selfDestructValue = parseFloat(sd.value) || 0;
        this.selfDestructTimer = 0;

        this.customConfig = config;
    }

    update(delta, player, lines) {
        super.update(delta, player, lines); 

        if (!player || player.isDead) return;

        // --- SELF DESTRUCT ---
        if (this.selfDestructType === 'time') {
            this.selfDestructTimer += delta;
            if (this.selfDestructTimer >= this.selfDestructValue * 1000) {
                this.kill('timer');
                return;
            }
        } else if (this.selfDestructType === 'proximity') {
            const dist = Math.hypot(player.px - this.x, player.py - this.y);
            if (dist <= this.selfDestructValue) {
                this.kill('proximity');
                return;
            }
        }

        // AAB: Gancho — lanzado como proyectil
        if (this._projectileTimer > 0) {
            this._projectileTimer -= delta;
            this.x += (this._projectileVx || 0) * (delta / 1000);
            this.y += (this._projectileVy || 0) * (delta / 1000);
            if (!this.ignoreWalls && lines) this.handleWallCollisions(lines, player, delta);
            if (this._projectileTimer <= 0) {
                this._projectileVx = 0; this._projectileVy = 0;
            }
            return;
        }

        if (!this.isMobile) { this.trapped = false; return; }

        // Trapped enemies can't move (flyers immune)
        if (this.trapped && !this.ignoreWalls) { this.trapped = false; return; }

        // BBC: frozen by stick — no movement
        if (this._frozen) return;

        // --- PATH FOLLOWING (sobrescribe AI si tiene ruta asignada) ---
        if (this._path && this._path.length > 0) {
            if (this._followPath(delta, player)) return;
        }

        // --- SISTEMA DE ESCALADO DINÁMICO DE VELOCIDAD ---
        if (this.speedScaling.hpBase === 'proportional') {
            this.speed = this.baseSpeed * Math.max(0.2, (this.hp / this.maxHp));
        } else if (this.speedScaling.hpBase === 'inverse') {
            const missingHpPct = 1 - (this.hp / this.maxHp);
            const maxBoost = (this.speedScaling.hpPercentage || 50) / 100;
            this.speed = this.baseSpeed * (1 + (missingHpPct * maxBoost));
        }

        // --- LINE OF SIGHT: enemigos que no ven a traves de muros pierden rastro ---
        const seeThrough = this.customConfig?.ambitious?.seeThroughWalls;
        let effectiveStyle = this.movementStyle;
        if (!seeThrough && lines && lines.length > 0) {
            const dist = Math.hypot(player.px - this.x, player.py - this.y);
            if (dist < 500) {
                if (!this.state._losTimer) this.state._losTimer = 0;
                this.state._losTimer += delta;
                if (this.state._losTimer >= 300) {
                    this.state._losTimer = 0;
                    this.state._losBlocked = !this.scene?.hasLineOfSight?.(this.x, this.y, player.px, player.py, lines);
                }
                if (this.state._losBlocked) {
                    const trackingStyles = ['seek', 'flee', 'orbit', 'circle', 'axisX', 'axisY'];
                    if (trackingStyles.includes(effectiveStyle)) {
                        effectiveStyle = 'erratic';
                    }
                }
            } else {
                this.state._losBlocked = false;
                this.state._losTimer = 0;
            }
        }

        // --- LÓGICA DE DIRECCIONES ---
        let moveX = 0, moveY = 0;

        switch (effectiveStyle) {
            case 'seek':
                const seek = this._seekMovement(player, delta);
                moveX = seek.x; moveY = seek.y;
                break;
            case 'flee':
                const flee = this._fleeMovement(player, delta);
                moveX = flee.x; moveY = flee.y;
                break;
            case 'erratic':
            case 'wander':
                const wander = this._wanderMovement(delta);
                moveX = wander.x; moveY = wander.y;
                break;
            case 'orbit':
            case 'circle':
                const circle = this._circleMovement(player, delta);
                moveX = circle.x; moveY = circle.y;
                break;
            default:
                const defaultSeek = this._seekMovement(player, delta);
                moveX = defaultSeek.x; moveY = defaultSeek.y;
        }

        // Aplicar movimiento
        this.x += moveX;
        this.y += moveY;

        // --- COLISIONES CON MUROS ---
        if (!this.ignoreWalls && lines) {
            this.handleWallCollisions(lines, player, delta);
        }

        // --- SISTEMA DESATASCAR ---
        const distMoved = Math.hypot(this.x - this.state.lastX, this.y - this.state.lastY);
        if (distMoved < 0.5) { // Umbral ligeramente más sensible
            this.state.stuckCounter++;
            if (this.state.stuckCounter > 30) {
                this.x += (Math.random() - 0.5) * 15;
                this.y += (Math.random() - 0.5) * 15;
                this.state.stuckCounter = 0;
            }
        } else {
            this.state.stuckCounter = 0;
        }

        this.state.lastX = this.x;
        this.state.lastY = this.y;
        this.trapped = false;
    }

    handleWallCollisions(lines, player, delta) {
        let hitWall = false;
        for (const line of lines) {
            if (line._broken) continue;
            const { start, end } = line;
            const abx = end.x - start.x;
            const aby = end.y - start.y;
            const len2 = abx * abx + aby * aby;
            if (len2 === 0) continue;

            let t = ((this.x - start.x) * abx + (this.y - start.y) * aby) / len2;
            t = Math.max(0, Math.min(1, t));

            const closestX = start.x + t * abx;
            const closestY = start.y + t * aby;

            const dx = this.x - closestX;
            const dy = this.y - closestY;
            const dist = Math.hypot(dx, dy);

            if (dist < this.radius && dist > 0) {
                const overlap = this.radius - dist;
                this.x += (dx / dist) * overlap;
                this.y += (dy / dist) * overlap;
                hitWall = true;

                if (line.hp != null && player && delta) {
                    this._wallStuckFrames = (this._wallStuckFrames || 0) + delta;
                    if (this._wallStuckFrames > 500) {
                        const playerDist = Math.hypot(player.px - this.x, player.py - this.y);
                        if (playerDist <= 800) {
                            line.hp -= 30 * (delta / 1000);
                            if (line.hp <= 0) line._broken = true;
                        }
                    }
                }
            }
        }
        if (!hitWall) this._wallStuckFrames = 0;
    }

    // ─── PATH FOLLOWING ────────────────────────────────────────

    _followPath(delta, player) {
        const path = this._path;
        const mode = this._pathMode || 'loop';
        const idx = this._pathIndex || 0;

        // chase mode: si el jugador está cerca, soltar ruta y pelear
        if (mode === 'chase' && player && !player.isDead) {
            const chaseRadius = this._chaseRadius ?? 300;
            const dp = Math.hypot(player.px - this.x, player.py - this.y);
            if (dp <= chaseRadius) return false;
        }

        const target = path[idx];
        if (!target) return true;

        // Si estamos esperando en el waypoint
        if (this._pathTimer > 0) {
            this._pathTimer -= delta;
            return true;
        }

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);
        const threshold = 4;

        if (dist < threshold) {
            // Llegamos al waypoint
            this.x = target.x;
            this.y = target.y;

            if (target.wait && target.wait > 0) {
                this._pathTimer = target.wait;
            }

            // Avanzar al siguiente waypoint
            if (mode === 'loop' || mode === 'chase') {
                this._pathIndex = (idx + 1) % path.length;
            } else if (mode === 'pingpong') {
                if (this._pathReverse) {
                    if (idx === 0) {
                        this._pathReverse = false;
                        this._pathIndex = 1;
                    } else {
                        this._pathIndex = idx - 1;
                    }
                } else {
                    if (idx === path.length - 1) {
                        this._pathReverse = true;
                        this._pathIndex = idx - 1;
                    } else {
                        this._pathIndex = idx + 1;
                    }
                }
            } else { // 'once'
                if (idx < path.length - 1) {
                    this._pathIndex = idx + 1;
                } else {
                    // Llegó al final — remover path y volver a AI normal
                    this._path = null;
                    this._pathMode = null;
                    this._pathIndex = 0;
                    this._pathTimer = 0;
                }
            }
        } else {
            // Moverse hacia el waypoint
            const speed = this.speed || this.baseSpeed || 50;
            this.x += (dx / dist) * speed * (delta / 16);
            this.y += (dy / dist) * speed * (delta / 16);
        }
        return true;
    }

    // Movimiento Helpers
    _seekMovement(player, delta) {
        const dx = player.px - this.x;
        const dy = player.py - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.01) return { x: (dx / dist) * this.speed * (delta / 16), y: (dy / dist) * this.speed * (delta / 16) };
        return { x: 0, y: 0 };
    }

    _fleeMovement(player, delta) {
        const dx = this.x - player.px;
        const dy = this.y - player.py;
        const dist = Math.hypot(dx, dy);
        const fearRange = 250;

        if (dist > 0.01 && dist < fearRange) {
            const fearMultiplier = Math.min(2, fearRange / Math.max(1, dist));
            return {
                x: (dx / dist) * this.speed * (delta / 16) * fearMultiplier,
                y: (dy / dist) * this.speed * (delta / 16) * fearMultiplier
            };
        }
        return this._wanderMovement(delta);
    }

    _wanderMovement(delta) {
        if (Math.random() < (delta / this.erraticTime)) {
            this.state.wanderAngle += (Math.random() - 0.5) * Math.PI;
        } else {
            this.state.wanderAngle += (Math.random() - 0.5) * delta / 200;
        }

        return {
            x: Math.cos(this.state.wanderAngle) * this.speed * (delta / 16),
            y: Math.sin(this.state.wanderAngle) * this.speed * (delta / 16)
        };
    }

    _circleMovement(player, delta) {
        this.state.orbitAngle += 2 * (delta / 1000);
        const targetX = player.px + Math.cos(this.state.orbitAngle) * this.orbitRadius;
        const targetY = player.py + Math.sin(this.state.orbitAngle) * this.orbitRadius;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.01) return { x: (dx / dist) * this.speed * (delta / 16), y: (dy / dist) * this.speed * (delta / 16) };
        return { x: 0, y: 0 };
    }

    kill(fatalSource = 'any') {
        if (this.onDeathEffects) {
            for (const effect of this.onDeathEffects) {
                if (effect.condition && effect.condition !== 'any' && effect.condition !== fatalSource) continue;
                const chance = effect.chance !== undefined ? effect.chance : 100;
                if (Math.random() * 100 > chance) continue;
                this.applyDeathEffect(effect);
            }
        }
        this.hp = 0;
        return true;
    }

    applyDeathEffect(effect) {
        const p = effect.params || effect;
        switch (effect.type) {
            case 'dropOrb':
                if (this.scene.orbManager) this.scene.orbManager.scheduleOrb(this.x, this.y);
                break;
            case 'extraCredit':
            case 'extraCredits':
                if (this.scene.rewardSystem) this.scene.rewardSystem.credits += p.amount || 50;
                break;
            case 'explode':
                this.explodeOnDeath(p.radius || 100, p.damage || 25);
                break;
            case 'healPlayer':
                this.healPlayerOnDeath(p.amount || 20);
                break;
            case 'momentumStack':
                if (this.scene.momentum) {
                    this.scene.momentum.addStacks(p.amount || 1);
                }
                break;
            case 'buffPlayer':
                this.buffPlayerOnDeath(p.type || 'speed', p.duration || 5000, p.value || 1.5);
                break;
            case 'spawnMinions':
            case 'spawnEnemies':
                this.spawnMinionsOnDeath(p.type || 'small', p.count || 3, p.spread || 100);
                break;
        }
    }

    explodeOnDeath(radius, damage) {
        console.log(`💥 Explosión post-muerte en (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
        if (this.scene.enemyManager) {
            const nearby = this.scene.enemyManager.getEnemies();
            for (const enemy of nearby) {
                if (enemy === this) continue;
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist < radius) {
                    const falloff = 1 - (dist / radius);
                    enemy.receiveDamage({ type: 'explosion', baseDamage: damage * falloff, now: this.scene?.time?.now ?? Date.now() });
                }
            }
        }
    }

    healPlayerOnDeath(amount) {
        if (this.scene.player) {
            this.scene.player.hp = Math.min(this.scene.player.maxHp, this.scene.player.hp + amount);
        }
    }

    buffPlayerOnDeath(buffType, duration, value) {
        if (!this.scene.player) return;
        const p = this.scene.player;
        if (buffType === 'speed') {
            const old = p.baseSpeed || p.speed; 
            p.speed = old * value;
            setTimeout(() => p.speed = old, duration);
        }
    }

    spawnMinionsOnDeath(minionType, count, spread) {
        if (!this.scene.enemyManager || !window.enemyRegistry) return;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const distance = spread * (0.5 + Math.random() * 0.5);
            const mx = this.x + Math.cos(angle) * distance;
            const my = this.y + Math.sin(angle) * distance;
            const minion = window.enemyRegistry.create(minionType, mx, my, this.scene);
            if (minion) this.scene.enemyManager.enemies.push(minion);
        }
    }
}