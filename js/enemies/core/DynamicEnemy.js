// js/enemies/core/DynamicEnemy.js
import Enemy from '../../scenes/Enemy.js';
import { ENEMY_REACTION_RADIUS } from '../../constants.js';

export default class DynamicEnemy extends Enemy {
    constructor(x, y, scene, config) {
        super(x, y, scene, config);

        const mov = config.movement || {};

        this.isMobile = mov.mobile ?? true;
        this.baseSpeed = mov.speed ?? 200;
        this.speed = this.baseSpeed;

        this.speedScaling = mov.scaling || { hpBase: 'none', hpPercentage: 0 };

        this.movementStyle = mov.style || 'seek';
        this.orbitRadius = mov.orbitRange || 120;
        this.erraticTime = mov.erraticTime || 2000;
        this.reactionRadius = mov.reactionRadius ?? null;
        this.disengageRadius = mov.disengageRadius ?? null;
        this.activeSpeed = mov.activeSpeed ?? null;
        this.state._awareOfPlayer = false;

        // Reacciones a eventos
        this.reactions = mov.reactions || [];
        this._activeReaction = null;

        // flee por daño en vez de proximidad
        this.fleeTrigger = mov.fleeTrigger || 'proximity'; // 'proximity' | 'damage'
        this._fleeDamageActive = false; // flee activado por daño recibido

        // Odio hacia otros tipos de enemigos
        const amb = config.ambitious || {};
        this.hates = amb.hates || [];
        this.hateRadius = amb.hateRadius || 0;
        this.hateDamage = amb.hateDamage || 5;
        this.hateOverridesFleeOnDamage = amb.hateOverridesFleeOnDamage ?? false;
        this._hateTarget = null;
        this._fleeActive = false;
        this._onPath = false;

        // Throttle: recalcular hate target y reacciones 4 veces/segundo
        // El offset aleatorio evita que todos los enemigos sincronicen el tick
        this._hateCheckTimer  = Math.random() * 250;
        this._hateCheckPeriod = 250; // ms → 4Hz

        this.ignoreWalls = mov.ignoreWalls ?? false;
        this.isPhantom = mov.isPhantom || false;

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

    receiveDamage(attackPayload) {
        const died = super.receiveDamage(attackPayload);
        // Si fleeTrigger es 'damage' y el daño viene del jugador (no de haters ni void),
        // activar flee solo si no hay hated en radio (o hateOverridesFleeOnDamage es false)
        if (
            this.fleeTrigger === 'damage' &&
            attackPayload.type !== 'hater' &&
            attackPayload.type !== 'void' &&
            !died
        ) {
            const hateActive = this.hateOverridesFleeOnDamage && this._hateTarget != null;
            if (!hateActive) {
                this._fleeDamageActive = true;
            }
        }
        return died;
    }

    update(delta, player, lines) {
        super.update(delta, player, lines);
        this._lines = lines;

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
        // Cede el control si hay flee-by-damage activo y no hay hated en radio
        const hasMultiPath = this._paths && this._paths.length > 0;
        const hasSinglePath = this._path && this._path.length > 0;
        if (hasMultiPath || hasSinglePath) {
            const fleeDamageBlocking = this._fleeDamageActive && !this._hateTarget;
            // También ceder si hay hate target — pero primero necesitamos correr
            // el hate check para saber si hay target. Corremos hate check aquí si toca.
            if (this.hates.length > 0 && this.hateRadius > 0) {
                this._hateCheckTimer += delta;
                if (this._hateCheckTimer >= this._hateCheckPeriod) {
                    this._hateCheckTimer = 0;
                    const enemies = this.scene?.enemyManager?.enemies || [];
                    let nearestHated = null;
                    let nearestHateDist = this.hateRadius;
                    for (const other of enemies) {
                        if (other === this || other.hp <= 0) continue;
                        if (!this.hates.includes(other.type)) continue;
                        const d = Math.hypot(other.x - this.x, other.y - this.y);
                        if (d < nearestHateDist) { nearestHateDist = d; nearestHated = other; }
                    }
                    this._hateTarget = nearestHated;
                } else {
                    if (this._hateTarget && (
                        this._hateTarget.hp <= 0 ||
                        Math.hypot(this._hateTarget.x - this.x, this._hateTarget.y - this.y) > this.hateRadius
                    )) {
                        this._hateTarget = null;
                    }
                }
            }
            const hateBlocking = !!this._hateTarget;
            if (!fleeDamageBlocking && !hateBlocking && this._followPath(delta, player)) return;
        }

        // --- REACTION RADIUS: histeresis deteccion/desenganche ---
        const trackingStyles = ['seek', 'flee', 'orbit', 'circle', 'axisX', 'axisY', 'dashOnly'];
        // reactionRadius: null/undefined → usar global. 0 → desactivado explícitamente.
        const hasExplicitRadius = this.reactionRadius != null;
        const detectRadius = !hasExplicitRadius
            ? ENEMY_REACTION_RADIUS
            : this.reactionRadius; // 0 es válido = sin detección por proximidad

        let effectiveStyle = this.movementStyle;

        if (detectRadius > 0 && this.fleeTrigger !== 'damage') {
            const distToPlayer = Math.hypot(player.px - this.x, player.py - this.y);
            const seeThrough = this.customConfig?.ambitious?.seeThroughWalls;

            if (!this.state._awareOfPlayer) {
                if (distToPlayer <= detectRadius) {
                    // Gate awareness on LOS: enemies that can't see through walls
                    // must have clear line of sight to become aware
                    if (seeThrough) {
                        this.state._awareOfPlayer = true;
                    } else {
                        const hasWalls = (lines && lines.length > 0) || this.scene?.wallGrid;
                        if (!hasWalls) {
                            this.state._awareOfPlayer = true;
                        } else {
                            this.state._losTimer = (this.state._losTimer || 0) + delta;
                            if (this.state._losTimer >= 300) {
                                this.state._losTimer = 0;
                                if (this.scene?.hasLineOfSight?.(this.x, this.y, player.px, player.py, lines)) {
                                    this.state._awareOfPlayer = true;
                                }
                            }
                        }
                    }
                }
            } else {
                const disengageRadius = (this.disengageRadius != null && this.disengageRadius !== 0)
                    ? this.disengageRadius
                    : detectRadius * 2;
                if (distToPlayer > disengageRadius) {
                    this.state._awareOfPlayer = false;
                    this.state._losTimer = 0;
                } else if (!seeThrough) {
                    // Periodically re-check LOS while aware; disengage if wall blocks sight
                    this.state._losTimer = (this.state._losTimer || 0) + delta;
                    if (this.state._losTimer >= 300) {
                        this.state._losTimer = 0;
                        if (!this.scene?.hasLineOfSight?.(this.x, this.y, player.px, player.py, lines)) {
                            this.state._awareOfPlayer = false;
                        }
                    }
                }
            }

            if (!this.state._awareOfPlayer && !this._onPath) {
                effectiveStyle = 'wander';
            }
        }

        // Velocidad: activa si detecta al jugador O tiene hated en radio
        if ((this.state._awareOfPlayer || this._hateTarget) && this.activeSpeed != null) {
            this.speed = this.activeSpeed;
        } else if (this.speedScaling.hpBase === 'proportional') {
            this.speed = this.baseSpeed * Math.max(0.2, (this.hp / this.maxHp));
        } else if (this.speedScaling.hpBase === 'inverse') {
            const missingHpPct = 1 - (this.hp / this.maxHp);
            const maxBoost = (this.speedScaling.hpPercentage || 50) / 100;
            this.speed = this.baseSpeed * (1 + (missingHpPct * maxBoost));
        } else {
            this.speed = this.baseSpeed;
        }

        // --- EVENT REACTIONS: reaccion a eventos cercanos ---
        // Throttled al mismo ciclo que hate (4Hz) — los eventos no son urgentes frame a frame.
        if (this.reactions.length > 0 && !this._activeReaction && this._hateCheckTimer === 0) {
            const eventIndex = this.scene?.enemyManager?.recentEventsByType;
            for (const reaction of this.reactions) {
                const events = eventIndex?.[reaction.event] || [];
                for (const event of events) {
                    if (event.sourceId === this.id) continue;
                    if (reaction.allyType && event.enemyType !== reaction.allyType) continue;
                    const edist = Math.hypot(event.x - this.x, event.y - this.y);
                    if (edist > (reaction.radius || 300)) continue;
                    if (!(this.customConfig?.ambitious?.seeThroughWalls)) {
                        const wls = this._lines;
                        if (wls && wls.length > 0 &&
                            !this.scene?.hasLineOfSight?.(this.x, this.y, event.x, event.y, wls)) continue;
                    }
                    this._activeReaction = {
                        action: reaction.action,
                        targetX: event.x,
                        targetY: event.y,
                        speed: reaction.speed > 0 ? reaction.speed : this.speed,
                        endTime: Date.now() + (reaction.duration || 2000)
                    };
                    break;
                }
                if (this._activeReaction) break;
            }
        }

        if (this._activeReaction && Date.now() > this._activeReaction.endTime) {
            this._activeReaction = null;
        }

        if (this._activeReaction) {
            this.speed = this._activeReaction.speed;
            effectiveStyle = this._activeReaction.action;
        }

        if (this._hateTarget) {
            effectiveStyle = 'seek';
            if (this.hateOverridesFleeOnDamage) this._fleeDamageActive = false;
            this._fleeActive = false;
            const hd = Math.hypot(this._hateTarget.x - this.x, this._hateTarget.y - this.y);
            if (hd < this.radius + (this._hateTarget.radius || 16) + 5) {
                this._hateTarget.hp -= (this.hateDamage || 5) * (delta / 1000);
                this._hateTarget._lastDamageSource = 'hater';
            }
        }

        // --- FLEE FROM PATH: huir del jugador, volver al path cuando seguro ---
        if (this._fleeActive) {
            effectiveStyle = 'flee';
            const fleeRadius = this._fleeRadius ?? 250;
            if (Math.hypot(player.px - this.x, player.py - this.y) > fleeRadius * 2) {
                this._fleeActive = false;
                if (this._path) {
                    const nearest = this._getNearestWaypoint(this._path);
                    if (nearest) this._pathIndex = this._path.indexOf(nearest);
                } else if (this._paths) {
                    this._evaluatePaths();
                }
            }
        }

        // --- FLEE BY DAMAGE: huir si recibió daño (fleeTrigger === 'damage') ---
        if (this._fleeDamageActive && !this._hateTarget) {
            effectiveStyle = 'flee';
            const safeRadius = this._fleeRadius ?? 250;
            if (Math.hypot(player.px - this.x, player.py - this.y) > safeRadius * 2) {
                this._fleeDamageActive = false;
                // Volver al waypoint más cercano
                if (this._path) {
                    const nearest = this._getNearestWaypoint(this._path);
                    if (nearest) this._pathIndex = this._path.indexOf(nearest);
                } else if (this._paths) {
                    this._evaluatePaths();
                }
            }
        }

        // --- UNDETECTABLE PLAYER ---
        if (player._undetectable) {
            if (trackingStyles.includes(effectiveStyle)) {
                effectiveStyle = 'erratic';
            }
        }

        // --- LÓGICA DE DIRECCIONES ---
        let moveX = 0, moveY = 0;

        switch (effectiveStyle) {
            case 'dashOnly':
                const dashOnly = this._dashOnlyMovement(player, delta);
                moveX = dashOnly.x; moveY = dashOnly.y;
                break;
            case 'seek':
                const seekTarget = this._hateTarget
                    ? { px: this._hateTarget.x, py: this._hateTarget.y }
                    : player;
                const seek = this._seekMovement(seekTarget, delta);
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
            case 'swarm':
                const swT = this._activeReaction || {};
                const sw = this._swarmMovement(swT.targetX || player.px, swT.targetY || player.py, delta);
                moveX = sw.x; moveY = sw.y;
                break;
            case 'retreat':
                const rtT = this._activeReaction || { targetX: player.px, targetY: player.py };
                const rt = this._retreatMovement(rtT.targetX, rtT.targetY, delta);
                moveX = rt.x; moveY = rt.y;
                break;
            case 'investigate':
                const invT = this._activeReaction || {};
                const inv = this._investigateMovement(invT.targetX || player.px, invT.targetY || player.py, delta);
                moveX = inv.x; moveY = inv.y;
                break;
            default:
                const defaultSeek = this._seekMovement(player, delta);
                moveX = defaultSeek.x; moveY = defaultSeek.y;
        }

        // Aplicar movimiento
        this.x += moveX;
        this.y += moveY;

        // --- COLISIONES CON MUROS ---
        if (!this.ignoreWalls) {
            const wallLines = this.scene?.wallGrid?.query(this.x, this.y, this.radius + 30) || lines || [];
            if (wallLines.length > 0) {
                this.handleWallCollisions(wallLines, player, delta);
            }
        }

        // --- SISTEMA DESATASCAR (solo si el enemigo está intentando moverse) ---
        const distMoved = Math.hypot(this.x - this.state.lastX, this.y - this.state.lastY);
        if (this.speed > 0 && distMoved < 0.5) {
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

                const isFollowingPath = this._onPath;
                if (line.hp != null && player && delta && isFollowingPath) {
                    this._wallStuckFrames = (this._wallStuckFrames || 0) + delta;
                    if (this._wallStuckFrames > 500) {
                        const playerDist = Math.hypot(player.px - this.x, player.py - this.y);
                        if (playerDist <= 800) {
                            line.hp -= 5 * (delta / 1000);
                            if (line.hp <= 0) line._broken = true;
                        }
                    }
                }
            }
        }
        if (!hitWall) this._wallStuckFrames = 0;
    }

    // ─── PATH FOLLOWING ────────────────────────────────────────

    _canSeeTarget(target) {
        if (this.customConfig?.ambitious?.seeThroughWalls) return true;
        const wl = this._lines;
        if (!wl || wl.length === 0) return true;
        const tx = target.px ?? target.x;
        const ty = target.py ?? target.y;
        return this.scene?.hasLineOfSight?.(this.x, this.y, tx, ty, wl) ?? true;
    }

    _followPath(delta, player) {
        if (this._paths && this._paths.length > 0) {
            const result = this._followMultiPath(delta, player);
            this._onPath = result;
            return result;
        }
        const result = this._followSinglePath(delta, player);
        this._onPath = result;
        return result;
    }

    _followSinglePath(delta, player) {
        const path = this._path;
        const mode = this._pathMode || 'loop';
        const idx = this._pathIndex || 0;

        if (mode === 'chase' && player && !player.isDead) {
            const chaseRadius = this._chaseRadius ?? 300;
            // Si el enemigo ignora al jugador hasta recibir daño, el path chase
            // no rompe por proximidad del jugador — solo por hated en radio.
            if (this.fleeTrigger !== 'damage') {
                const dp = Math.hypot(player.px - this.x, player.py - this.y);
                if (dp <= chaseRadius && this._canSeeTarget(player)) return false;
            }
            // Usar _hateTarget cacheado (recalculado a 4Hz) en vez de loop O(n)
            if (this._hateTarget && Math.hypot(this._hateTarget.x - this.x, this._hateTarget.y - this.y) <= chaseRadius) return false;
        }

        if (mode === 'flee' && player && !player.isDead) {
            const fleeRadius = this._fleeRadius ?? 250;
            if (Math.hypot(player.px - this.x, player.py - this.y) <= fleeRadius) {
                // Don't flee if walls block line of sight
                const seeThrough = this.customConfig?.ambitious?.seeThroughWalls;
                if (!seeThrough) {
                    const wallLines = this._lines;
                    if (wallLines && wallLines.length > 0 &&
                        !this.scene?.hasLineOfSight?.(this.x, this.y, player.px, player.py, wallLines)) {
                        return true;
                    }
                }
                this._fleeActive = true;
                return false;
            }
        }

        const target = path[idx];
        if (!target) return true;

        if (this._pathTimer > 0) { this._pathTimer -= delta; return true; }

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 4) {
            this.x = target.x; this.y = target.y;
            if (target.wait && target.wait > 0) this._pathTimer = target.wait;
            this._advanceWaypoint(path, mode, idx, false);
        } else {
            const speed = this.speed ?? this.baseSpeed ?? 200;
            this.x += (dx / dist) * speed * (delta / 1000);
            this.y += (dy / dist) * speed * (delta / 1000);
        }
        return true;
    }

    // ─── MULTI-PATH ──────────────────────────────────────────

    _followMultiPath(delta, player) {
        if (this._activePathIndex == null) this._activePathIndex = 0;

        const pathData = this._paths[this._activePathIndex];
        if (!pathData) return false;
        const path = pathData.path;
        const mode = pathData.mode || 'loop';

        if (mode === 'chase' && player && !player.isDead) {
            const chaseRadius = this._chaseRadius ?? 300;
            if (this.fleeTrigger !== 'damage') {
                if (Math.hypot(player.px - this.x, player.py - this.y) <= chaseRadius && this._canSeeTarget(player)) return false;
            }
            if (this._hateTarget && Math.hypot(this._hateTarget.x - this.x, this._hateTarget.y - this.y) <= chaseRadius) return false;
        }

        if (mode === 'flee' && player && !player.isDead) {
            const fleeRadius = this._fleeRadius ?? 250;
            if (Math.hypot(player.px - this.x, player.py - this.y) <= fleeRadius) {
                const seeThrough = this.customConfig?.ambitious?.seeThroughWalls;
                if (!seeThrough) {
                    const wallLines = this._lines;
                    if (wallLines && wallLines.length > 0 &&
                        !this.scene?.hasLineOfSight?.(this.x, this.y, player.px, player.py, wallLines)) {
                        return true;
                    }
                }
                this._fleeActive = true;
                return false;
            }
        }

        // Re-evaluar paths cada 2s
        this._pathCheckTimer = (this._pathCheckTimer || 0) + delta;
        if (this._pathCheckTimer > 2000) {
            this._pathCheckTimer = 0;
            this._evaluatePaths();
        }

        const idx = this._pathIndex || 0;
        const target = path[idx];
        if (!target) { this._evaluatePaths(); return true; }

        if (this._pathTimer > 0) { this._pathTimer -= delta; return true; }

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 4) {
            this.x = target.x; this.y = target.y;
            if (target.wait && target.wait > 0) this._pathTimer = target.wait;
            this._advanceWaypoint(path, mode, idx, true);

            // Al llegar a un waypoint, verificar si el siguiente es alcanzable
            const nextIdx = this._pathIndex;
            const nextTarget = path[nextIdx];
            if (nextTarget && !this._hasClearPathTo(nextTarget.x, nextTarget.y)) {
                this._evaluatePaths();
            }
        } else {
            const speed = this.speed ?? this.baseSpeed ?? 200;
            this.x += (dx / dist) * speed * (delta / 1000);
            this.y += (dy / dist) * speed * (delta / 1000);
        }
        return true;
    }

    _evaluatePaths() {
        for (let i = 0; i < this._paths.length; i++) {
            const wp = this._getNearestWaypoint(this._paths[i].path);
            if (wp && this._hasClearPathTo(wp.x, wp.y)) {
                this._activePathIndex = i;
                this._pathIndex = this._paths[i].path.indexOf(wp);
                this._pathTimer = 0;
                this._pathCheckTimer = 0;
                return;
            }
        }
        // Todos los paths bloqueados — reintentar primario en el proximo ciclo
        this._activePathIndex = 0;
    }

    _hasClearPathTo(tx, ty) {
        const lines = this._lines;
        if (!lines || lines.length === 0) return true;
        return this.scene?.hasLineOfSight?.(this.x, this.y, tx, ty, lines) ?? true;
    }

    _getNearestWaypoint(path) {
        let nearest = null, nearestDist = Infinity;
        for (const wp of path) {
            const d = Math.hypot(wp.x - this.x, wp.y - this.y);
            if (d < nearestDist) { nearestDist = d; nearest = wp; }
        }
        return nearest;
    }

    _advanceWaypoint(path, mode, idx, isMulti) {
        if (mode === 'loop' || mode === 'chase' || mode === 'flee' || mode === 'patrol') {
            this._pathIndex = (idx + 1) % path.length;
        } else if (mode === 'random') {
            // Elegir cualquier waypoint excepto el actual
            let next;
            if (path.length > 1) {
                do { next = Math.floor(Math.random() * path.length); } while (next === idx);
            } else { next = 0; }
            this._pathIndex = next;
        } else if (mode === 'pingpong') {
            if (this._pathReverse) {
                if (idx === 0) { this._pathReverse = false; this._pathIndex = 1; }
                else { this._pathIndex = idx - 1; }
            } else {
                if (idx === path.length - 1) { this._pathReverse = true; this._pathIndex = idx - 1; }
                else { this._pathIndex = idx + 1; }
            }
        } else { // 'once'
            if (idx < path.length - 1) {
                this._pathIndex = idx + 1;
            } else {
                if (isMulti) {
                    this._paths = null;
                } else {
                    this._path = null; this._pathMode = null;
                }
                this._pathIndex = 0; this._pathTimer = 0;
            }
        }
    }

    // Movimiento Helpers
    _seekMovement(player, delta) {
        const target = this._hateTarget || player;
        const tx = target.px ?? target.x;
        const ty = target.py ?? target.y;
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.01) return { x: (dx / dist) * this.speed * (delta / 1000), y: (dy / dist) * this.speed * (delta / 1000) };
        return { x: 0, y: 0 };
    }

    _fleeMovement(player, delta) {
        // Never flee from a player we can't see through walls
        if (!(this.customConfig?.ambitious?.seeThroughWalls)) {
            const wl = this._lines;
            if (wl && wl.length > 0 &&
                !this.scene?.hasLineOfSight?.(this.x, this.y, player.px, player.py, wl)) {
                return this._wanderMovement(delta);
            }
        }

        const dx = this.x - player.px;
        const dy = this.y - player.py;
        const dist = Math.hypot(dx, dy);
        const fearRange = 250;

        if (dist > 0.01 && dist < fearRange) {
            const fearMultiplier = Math.min(2, fearRange / Math.max(1, dist));
            return {
                x: (dx / dist) * this.speed * (delta / 1000) * fearMultiplier,
                y: (dy / dist) * this.speed * (delta / 1000) * fearMultiplier
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
            x: Math.cos(this.state.wanderAngle) * this.speed * (delta / 1000),
            y: Math.sin(this.state.wanderAngle) * this.speed * (delta / 1000)
        };
    }

    _dashOnlyMovement(player, delta) {
        // Init dash state if needed
        if (!this._dash) {
            this._dash = { phase: 'cooldown', timer: 500 + Math.random() * 1000 };
        }
        const ds = this._dash;
        ds.timer -= delta;

        const dashSpeed = (this.activeSpeed || this.speed) * 2.5;
        const windupTime = 400;
        const dashTime = 350;
        const cooldownMin = 600;
        const cooldownMax = 1500;

        if (ds.phase === 'cooldown') {
            if (ds.timer <= 0) {
                ds.phase = 'windup';
                ds.timer = windupTime;
            }
            return { x: 0, y: 0 };
        }

        if (ds.phase === 'windup') {
            if (ds.timer <= 0) {
                ds.phase = 'dash';
                ds.timer = dashTime;
                // Lock target at windup end
                ds.targetX = player.px;
                ds.targetY = player.py;
                const dx2 = ds.targetX - this.x;
                const dy2 = ds.targetY - this.y;
                const dist2 = Math.hypot(dx2, dy2);
                if (dist2 > 0.01) {
                    ds.dirX = dx2 / dist2;
                    ds.dirY = dy2 / dist2;
                } else {
                    ds.dirX = 0;
                    ds.dirY = -1;
                }
            }
            return { x: 0, y: 0 };
        }

        if (ds.phase === 'dash') {
            if (ds.timer <= 0) {
                ds.phase = 'cooldown';
                ds.timer = cooldownMin + Math.random() * (cooldownMax - cooldownMin);
                return { x: 0, y: 0 };
            }
            return {
                x: ds.dirX * dashSpeed * (delta / 1000),
                y: ds.dirY * dashSpeed * (delta / 1000)
            };
        }

        return { x: 0, y: 0 };
    }

    _circleMovement(player, delta) {
        this.state.orbitAngle += 2 * (delta / 1000);
        const targetX = player.px + Math.cos(this.state.orbitAngle) * this.orbitRadius;
        const targetY = player.py + Math.sin(this.state.orbitAngle) * this.orbitRadius;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.01) return { x: (dx / dist) * this.speed * (delta / 1000), y: (dy / dist) * this.speed * (delta / 1000) };
        return { x: 0, y: 0 };
    }

    // --- Nuevos estilos de movimiento para reacciones ---

    _swarmMovement(tx, ty, delta) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 5) return this._wanderMovement(delta);
        return { x: (dx / dist) * this.speed * (delta / 1000), y: (dy / dist) * this.speed * (delta / 1000) };
    }

    _retreatMovement(tx, ty, delta) {
        const dx = this.x - tx;
        const dy = this.y - ty;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) {
            const a = Math.random() * Math.PI * 2;
            return { x: Math.cos(a) * this.speed * (delta / 1000), y: Math.sin(a) * this.speed * (delta / 1000) };
        }
        if (dist < 400) {
            return { x: (dx / dist) * this.speed * (delta / 1000), y: (dy / dist) * this.speed * (delta / 1000) };
        }
        return this._wanderMovement(delta);
    }

    _investigateMovement(tx, ty, delta) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 15) return this._wanderMovement(delta);
        return { x: (dx / dist) * this.speed * (delta / 1000), y: (dy / dist) * this.speed * (delta / 1000) };
    }

    kill(fatalSource = 'any') {
        if (this.onDeathEffects) {
            const noRewards = fatalSource === 'void' || fatalSource === 'hater';
            for (const effect of this.onDeathEffects) {
                if (effect.condition && effect.condition !== 'any' && effect.condition !== fatalSource) continue;
                if (noRewards && (effect.type === 'extraCredits' || effect.type === 'extraCredit' || effect.type === 'momentumStack' || effect.type === 'dropOrb' || effect.type === 'healPlayer' || effect.type === 'buffPlayer')) continue;
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