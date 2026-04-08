// js/enemies/core/DynamicEnemy.js
import Enemy from '../../scenes/Enemy.js';

export default class DynamicEnemy extends Enemy {
    constructor(x, y, scene, config) {
        super(x, y, scene, config);
        
        // 1. CONFIGURACIÓN DE MOVIMIENTO (Soporta Editor v2.0 y antiguo)
        const mov = config.movement || {};
        
        this.isMobile = mov.mobile ?? (config.behaviors?.mobile !== false);
        this.baseSpeed = mov.speed || config.speed || 50;
        this.speed = this.baseSpeed;
        
        // Escalado dinámico
        this.speedScaling = mov.scaling || { hpBase: 'none', hpPercentage: 0 };
        
        this.movementStyle = mov.style || config.movementStyle || 'seek'; // seek, flee, wander, orbit
        this.distanceMin = mov.distanceMin || config.distanceMin || 0;
        this.distanceMax = mov.distanceMax || config.distanceMax || 0;
        this.orbitRadius = mov.orbitRange || config.orbitRadius || 120;
        this.erraticTime = mov.erraticTime || 2000;
        
        this.ignoreWalls = mov.ignoreWalls ?? (config.ignoreWalls === true);
        this.isPhantom = mov.isPhantom || false;
        
        // Comportamientos ambiciosos
        const amb = config.ambitious || {};
        this.isWall = amb.isWall || false;
        
        // Guardar config original por si se necesita
        this.customConfig = config;
    }
    
    update(delta, player, lines) {
        super.update(delta, player, lines); // Llama a la regeneración de HP

        if (!player || player.isDead) return;
        if (!this.isMobile) return;

        // --- SISTEMA DE ESCALADO DINÁMICO DE VELOCIDAD ---
        if (this.speedScaling.hpBase === 'proportional') {
            // Pierde vida = Más lento
            this.speed = this.baseSpeed * Math.max(0.2, (this.hp / this.maxHp));
        } else if (this.speedScaling.hpBase === 'inverse') {
            // Pierde vida = Más rápido (Fase "Enfurecido")
            const missingHpPct = 1 - (this.hp / this.maxHp);
            const maxBoost = (this.speedScaling.hpPercentage || 50) / 100;
            this.speed = this.baseSpeed * (1 + (missingHpPct * maxBoost));
        }

// Sistema físico de "resbalar" por las paredes para los enemigos
    handleWallCollisions(lines) {
        for (const line of lines) {
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

            // Si el enemigo está pisando la pared
            if (dist < this.radius && dist > 0) {
                const overlap = this.radius - dist;
                
                // Lo empujamos hacia afuera de forma geométrica
                this.x += (dx / dist) * overlap;
                this.y += (dy / dist) * overlap;
                
                // Resetear el contador de atasco porque logró deslizarse
                this.state.stuckCounter = 0;
            }
        }
    }

        // --- LÓGICA DE DIRECCIONES ---
        let moveX = 0, moveY = 0;
        
        switch (this.movementStyle) {
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
            case 'axisX':
                moveX = this._seekMovement(player, delta).x;
                break;
            case 'axisY':
                moveY = this._seekMovement(player, delta).y;
                break;
            default:
                const defaultSeek = this._seekMovement(player, delta);
                moveX = defaultSeek.x; moveY = defaultSeek.y;
        }
        
        // --- RESTRICCIONES DE DISTANCIA ---
        const dx = player.px - this.x;
        const dy = player.py - this.y;
        const distToPlayer = Math.hypot(dx, dy);
        
        if (this.distanceMin > 0 && distToPlayer < this.distanceMin) {
            const angle = Math.atan2(dy, dx);
            moveX = moveX * 0.5 + (-Math.cos(angle) * this.speed * (delta / 16)) * 0.5;
            moveY = moveY * 0.5 + (-Math.sin(angle) * this.speed * (delta / 16)) * 0.5;
        }
        
        if (this.distanceMax > 0 && distToPlayer > this.distanceMax) {
            const angle = Math.atan2(dy, dx);
            moveX = moveX * 0.5 + (Math.cos(angle) * this.speed * (delta / 16)) * 0.5;
            moveY = moveY * 0.5 + (Math.sin(angle) * this.speed * (delta / 16)) * 0.5;
        }
        
        // Aplicar movimiento
        this.x += moveX;
        this.y += moveY;
        
// --- COLISIONES CON MUROS ---
        if (!this.ignoreWalls && lines) {
            this.handleWallCollisions(lines);
        }
        
        this.state.lastX = this.x;
        this.state.lastY = this.y;
    }
                
                // Desatascar
                const distMoved = Math.hypot(this.x - this.state.lastX, this.y - this.state.lastY);
                if (distMoved < 1) {
                    this.state.stuckCounter++;
                    if (this.state.stuckCounter > 30) {
                        this.x += (Math.random() - 0.5) * 10;
                        this.y += (Math.random() - 0.5) * 10;
                        this.state.stuckCounter = 0;
                    }
                } else {
                    this.state.stuckCounter = 0;
                }
            }
        }
        
        this.state.lastX = this.x;
        this.state.lastY = this.y;
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
        // Usar erraticTime para saber cada cuánto cambiar de ángulo brutalmente
        if (Math.random() < (delta / this.erraticTime)) {
            this.state.wanderAngle += (Math.random() - 0.5) * Math.PI; // Giro brusco
        } else {
            this.state.wanderAngle += (Math.random() - 0.5) * delta / 200; // Giro suave
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
    
    // --- NUEVO SISTEMA DE MUERTES (Fase 3) ---
    // Recibe el tipo de ataque que lo mató (ej: 'slam', 'dash')
    kill(fatalSource = 'any') {
        for (const effect of this.onDeathEffects) {
            // 1. Evaluar condición del golpe final (si el efecto requiere morir por 'slam' y murió por 'dash', se salta)
            if (effect.condition && effect.condition !== 'any' && effect.condition !== fatalSource) continue;
            
            // 2. Evaluar probabilidad (chance)
            const chance = effect.chance !== undefined ? effect.chance : 100;
            if (Math.random() * 100 > chance) continue;

            // 3. Aplicar
            this.applyDeathEffect(effect);
        }
        
        this.hp = 0;
        return true;
    }
    
    applyDeathEffect(effect) {
        // Soporta { type: 'explode', params: { radius: 100 } } (v2) y { type: 'explode', radius: 100 } (v1)
        const p = effect.params || effect;

        switch (effect.type) {
            case 'dropOrb':
                if (this.scene.orbManager) this.scene.orbManager.scheduleOrb(this.x, this.y);
                break;
            case 'extraCredit':
            case 'extraCredits': // alias v2
                if (this.scene.rewardSystem) this.scene.rewardSystem.credits += p.amount || 50;
                break;
            case 'explode':
                this.explodeOnDeath(p.radius || 100, p.damage || 25);
                break;
            case 'healPlayer':
                this.healPlayerOnDeath(p.amount || 20);
                break;
            case 'momentumStack':
                if (this.scene.player) this.scene.player.addMomentum(p.amount || 1); // Asume que tienes este método
                break;
            case 'buffPlayer':
                this.buffPlayerOnDeath(p.type || 'speed', p.duration || 5000, p.value || 1.5);
                break;
            case 'spawnMinions':
            case 'spawnEnemies': // alias v2
                this.spawnMinionsOnDeath(p.type || 'small', p.count || 3, p.spread || 100);
                break;
        }
    }

    // Efectos específicos extraídos de params...
    explodeOnDeath(radius, damage) {
        console.log(`💥 Explosión post-muerte en (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
        if (this.scene.enemyManager) {
            const nearby = this.scene.enemyManager.getEnemies();
            for (const enemy of nearby) {
                if (enemy === this) continue;
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist < radius) {
                    const falloff = 1 - (dist / radius);
                    // Usamos el nuevo sistema de daño para dañar a otros enemigos
                    enemy.receiveDamage({ type: 'explosion', baseDamage: damage * falloff, now: Date.now() });
                    if (enemy.hp <= 0 && this.scene.enemyManager._onEnemyDied) {
                        this.scene.enemyManager._onEnemyDied(enemy);
                    }
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
        // Implementación similar a la que tenías
        if (!this.scene.player) return;
        const p = this.scene.player;
        if (buffType === 'speed') {
            const old = p.baseSpeed; p.speed = old * value;
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