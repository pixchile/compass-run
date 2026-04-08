// js/enemies/core/DynamicEnemy.js
import Enemy from '../../scenes/Enemy.js';

export default class DynamicEnemy extends Enemy {
    constructor(x, y, scene, config) {
        // Configuración base
        const finalConfig = {
            type: config.type || 'dynamic',
            radius: config.radius || 12,
            maxHp: config.maxHp || config.hp || 1,
            hp: config.hp || config.maxHp || 1,
            color: config.color || 0x88ff88,
            speed: config.speed || 60,
            ...config
        };
        
        super(x, y, scene, finalConfig);
        
if (typeof finalConfig.color === 'string') {
    finalConfig.color = parseInt(finalConfig.color.replace('#', '0x'));
}
        // Almacenar configuración personalizada
        this.customConfig = config;
        this.behaviors = config.behaviors || {};
        this.onDeathEffects = config.onDeath || [];
        
        // Funciones de daño (pueden ser números o funciones)
        this.dashDamageFn = config.dashDamage;
        this.slamDamageFn = config.slamDamage;
        this.slamVulnerable = config.slamVulnerable !== false;
        this.pierceable = config.pierceable === true;
        
        // Configuración de movimiento
        this.ignoreWalls = config.ignoreWalls === true;
        this.movementStyle = config.movementStyle || 'seek'; // seek, flee, wander, circle
        
        // Parámetros de comportamiento
        this.distanceMin = config.distanceMin || 0;      // distancia mínima al jugador
        this.distanceMax = config.distanceMax || 0;      // distancia máxima (0 = ilimitado)
        this.orbitRadius = config.orbitRadius || 100;
        this.wanderSpeed = config.wanderSpeed || 0.5;    // intensidad del movimiento errático
        
        // Estado interno
        this.state = {
            wanderAngle: Math.random() * Math.PI * 2,
            orbitAngle: 0,
            lastAttackTime: 0,
            lastTeleportTime: 0,
            stuckCounter: 0,
            lastX: x,
            lastY: y
        };
    }
    
    update(delta, player, lines) {
        if (!player || player.isDead) return;
        
        // Si no es móvil, no se mueve
        if (this.behaviors.mobile === false) return;
        
        // Obtener vector de movimiento según el estilo
        let moveX = 0, moveY = 0;
        
        switch (this.movementStyle) {
            case 'seek':
                moveX = this._seekMovement(player, delta);
                moveY = this._seekMovement(player, delta, true);
                break;
            case 'flee':
                const flee = this._fleeMovement(player, delta);
                moveX = flee.x;
                moveY = flee.y;
                break;
            case 'wander':
                const wander = this._wanderMovement(delta);
                moveX = wander.x;
                moveY = wander.y;
                break;
            case 'circle':
                const circle = this._circleMovement(player, delta);
                moveX = circle.x;
                moveY = circle.y;
                break;
            default:
                const seek = this._seekMovement(player, delta);
                moveX = seek.x;
                moveY = seek.y;
        }
        
        // Aplicar restricciones de distancia (min/max)
        const dx = player.px - this.x;
        const dy = player.py - this.y;
        const distToPlayer = Math.hypot(dx, dy);
        
        // Si está demasiado cerca y no queremos que se acerque más
        if (this.distanceMin > 0 && distToPlayer < this.distanceMin) {
            // Alejar del jugador
            const angle = Math.atan2(dy, dx);
            const pushX = -Math.cos(angle) * this.speed * (delta / 16);
            const pushY = -Math.sin(angle) * this.speed * (delta / 16);
            moveX = moveX * 0.5 + pushX * 0.5;
            moveY = moveY * 0.5 + pushY * 0.5;
        }
        
        // Si está demasiado lejos y queremos que se acerque
        if (this.distanceMax > 0 && distToPlayer > this.distanceMax) {
            const angle = Math.atan2(dy, dx);
            const pullX = Math.cos(angle) * this.speed * (delta / 16);
            const pullY = Math.sin(angle) * this.speed * (delta / 16);
            moveX = moveX * 0.5 + pullX * 0.5;
            moveY = moveY * 0.5 + pullY * 0.5;
        }
        
        // Aplicar movimiento
        this.x += moveX;
        this.y += moveY;
        
        // Colisiones con líneas (si no ignora muros)
        if (!this.ignoreWalls && lines) {
            if (this.checkLineCollision(lines)) {
                this.x -= moveX;
                this.y -= moveY;
                
                // Detectar si está atascado
                const distMoved = Math.hypot(this.x - this.state.lastX, this.y - this.state.lastY);
                if (distMoved < 1) {
                    this.state.stuckCounter++;
                    if (this.state.stuckCounter > 30) {
                        // Está atascado, dar un pequeño empujón aleatorio
                        this.x += (Math.random() - 0.5) * 10;
                        this.y += (Math.random() - 0.5) * 10;
                        this.state.stuckCounter = 0;
                    }
                } else {
                    this.state.stuckCounter = 0;
                }
            }
        }
        
        // Guardar posición para detección de atasco
        this.state.lastX = this.x;
        this.state.lastY = this.y;
    }
    
    // Movimiento: perseguir al jugador
    _seekMovement(player, delta, returnY = false) {
        const dx = player.px - this.x;
        const dy = player.py - this.y;
        const dist = Math.hypot(dx, dy);
        
        if (returnY) {
            if (dist > 0.01) {
                return (dy / dist) * this.speed * (delta / 16);
            }
            return 0;
        } else {
            if (dist > 0.01) {
                return (dx / dist) * this.speed * (delta / 16);
            }
            return 0;
        }
    }
    
    // Movimiento: huir del jugador
    _fleeMovement(player, delta) {
        const dx = this.x - player.px;
        const dy = this.y - player.py;
        const dist = Math.hypot(dx, dy);
        
        // Solo huir si está dentro del rango de miedo (200px)
        const fearRange = this.behaviors.fearRange || 200;
        
        if (dist > 0.01 && dist < fearRange) {
            // Más miedo si está más cerca
            const fearMultiplier = Math.min(2, fearRange / Math.max(1, dist));
            return {
                x: (dx / dist) * this.speed * (delta / 16) * fearMultiplier,
                y: (dy / dist) * this.speed * (delta / 16) * fearMultiplier
            };
        }
        
        // Si está fuera del rango, comportamiento por defecto (errático o quieto)
        if (this.movementStyle === 'flee') {
            return this._wanderMovement(delta);
        }
        
        return { x: 0, y: 0 };
    }
    
    // Movimiento: errático (wander)
    _wanderMovement(delta) {
        // Cambiar ángulo gradualmente
        this.state.wanderAngle += (Math.random() - 0.5) * delta / 100;
        
        // Velocidad de wandering (0.3 a 0.8 de la velocidad normal)
        const wanderIntensity = this.wanderSpeed;
        
        return {
            x: Math.cos(this.state.wanderAngle) * this.speed * wanderIntensity * (delta / 16),
            y: Math.sin(this.state.wanderAngle) * this.speed * wanderIntensity * (delta / 16)
        };
    }
    
    // Movimiento: orbitar alrededor del jugador
    _circleMovement(player, delta) {
        // Incrementar ángulo orbital
        const orbitSpeed = this.behaviors.orbitSpeed || 2; // vueltas por segundo
        this.state.orbitAngle += orbitSpeed * (delta / 1000);
        
        // Calcular posición objetivo en el círculo
        const targetX = player.px + Math.cos(this.state.orbitAngle) * this.orbitRadius;
        const targetY = player.py + Math.sin(this.state.orbitAngle) * this.orbitRadius;
        
        // Moverse hacia la posición objetivo
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 0.01) {
            return {
                x: (dx / dist) * this.speed * (delta / 16),
                y: (dy / dist) * this.speed * (delta / 16)
            };
        }
        
        return { x: 0, y: 0 };
    }
    
    getDashDamage(dashSpeed, isAirDash) {
        if (typeof this.dashDamageFn === 'function') {
            return this.dashDamageFn(dashSpeed, isAirDash);
        }
        if (typeof this.dashDamageFn === 'number') {
            return this.dashDamageFn;
        }
        return 1;
    }
    
    takeDamage(damage, dashSpeed, isAirDash) {
        const damageAmount = this.getDashDamage(dashSpeed, isAirDash);
        this.hp -= damageAmount;
        
        // Si tiene comportamiento de teletransporte al recibir daño
        if (this.behaviors.teleportOnHit && Math.random() < 0.3) {
            const now = Date.now();
            if (now - this.state.lastTeleportTime > 2000) {
                this.state.lastTeleportTime = now;
                // Teletransportar a una posición aleatoria cercana
                this.x += (Math.random() - 0.5) * 150;
                this.y += (Math.random() - 0.5) * 150;
            }
        }
        
        return this.hp <= 0;
    }
    
    takeSlamDamage(damage, isHighSpeed) {
        if (!this.slamVulnerable) return false;
        
        if (typeof this.slamDamageFn === 'function') {
            const slamDamage = this.slamDamageFn(damage, isHighSpeed);
            this.hp -= slamDamage;
        } else {
            this.hp -= damage;
        }
        return this.hp <= 0;
    }
    
   kill() {
    // Ejecutar efectos al morir
    for (const effect of this.onDeathEffects) {
        this.applyDeathEffect(effect);
    }
    
    // Efecto especial: spawn de minions (requiere acceso al enemyManager)
    if (this.onDeathEffects.some(e => e.type === 'spawnMinions')) {
        this.spawnMinionsOnDeath();
    }
    
    this.hp = 0;
    return true;
}
    
applyDeathEffect(effect) {
    switch (effect.type) {
        case 'dropOrb':
            if (this.scene.orbManager) {
                this.scene.orbManager.scheduleOrb(this.x, this.y);
            }
            break;
            
        case 'extraCredit':
            if (this.scene.rewardSystem) {
                this.scene.rewardSystem.credits += effect.amount || 50;
            }
            break;
            
        case 'explode':
            this.explodeOnDeath(effect.radius || 80, effect.damage || 25);
            break;
            
        case 'healPlayer':
            this.healPlayerOnDeath(effect.amount || 20);
            break;
            
        case 'buffPlayer':
            this.buffPlayerOnDeath(effect.type || 'speed', effect.duration || 5000, effect.value || 1.5);
            break;
            
        case 'dropLoot':
            this.dropLootOnDeath(effect.items || ['credit', 'orb']);
            break;
            
        case 'spawnMinions':
            // Se maneja en spawnMinionsOnDeath()
            break;
            
        default:
            break;
    }
}

// AÑADIR ESTOS MÉTODOS a DynamicEnemy

// Explosión en área al morir
explodeOnDeath(radius, damage) {
    console.log(`💥 Explosión en (${this.x.toFixed(0)}, ${this.y.toFixed(0)}) radio:${radius} daño:${damage}`);
    
    // Buscar enemigos cercanos y dañarlos
    if (this.scene.enemyManager) {
        const nearbyEnemies = this.scene.enemyManager.getEnemies();
        for (const enemy of nearbyEnemies) {
            if (enemy === this) continue; // no dañarse a sí mismo
            
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < radius) {
                // Daño proporcional a la cercanía
                const falloff = 1 - (dist / radius);
                const finalDamage = Math.floor(damage * falloff);
                enemy.hp -= finalDamage;
                
                if (enemy.hp <= 0) {
                    // El enemyManager se encargará de limpiarlo
                    if (this.scene.enemyManager._onEnemyDied) {
                        this.scene.enemyManager._onEnemyDied(enemy);
                    }
                }
            }
        }
    }
    
    // Efecto visual (opcional - se puede implementar después)
    // this.scene.addExplosionEffect(this.x, this.y, radius);
}

// Curar al jugador al morir
healPlayerOnDeath(amount) {
    if (this.scene.player) {
        const oldHp = this.scene.player.hp;
        this.scene.player.hp = Math.min(this.scene.player.maxHp, this.scene.player.hp + amount);
        const healed = this.scene.player.hp - oldHp;
        console.log(`💚 Jugador curado +${healed} HP`);
        
        // Efecto visual (opcional)
        // this.scene.addHealEffect(this.x, this.y, healed);
    }
}

// Buff al jugador al morir
buffPlayerOnDeath(buffType, duration, value) {
    if (this.scene.player) {
        console.log(`✨ Jugador recibe buff: ${buffType} x${value} por ${duration}ms`);
        
        // Guardar estado original
        const originalSpeed = this.scene.player.speed;
        const originalDamage = this.scene.player.dashDamage;
        
        switch(buffType) {
            case 'speed':
                this.scene.player.speed = this.scene.player.baseSpeed * value;
                setTimeout(() => {
                    this.scene.player.speed = originalSpeed;
                    console.log(`⏰ Buff de velocidad terminado`);
                }, duration);
                break;
                
            case 'damage':
                this.scene.player.dashDamage = this.scene.player.baseDashDamage * value;
                setTimeout(() => {
                    this.scene.player.dashDamage = originalDamage;
                    console.log(`⏰ Buff de daño terminado`);
                }, duration);
                break;
                
            case 'invincibility':
                this.scene.player.isInvincible = true;
                setTimeout(() => {
                    this.scene.player.isInvincible = false;
                    console.log(`⏰ Invulnerabilidad terminada`);
                }, duration);
                break;
        }
    }
}

// Soltar loot al morir
dropLootOnDeath(items) {
    for (const item of items) {
        switch(item) {
            case 'credit':
                if (this.scene.rewardSystem) {
                    this.scene.rewardSystem.credits += 25;
                }
                break;
            case 'orb':
                if (this.scene.orbManager) {
                    this.scene.orbManager.scheduleOrb(this.x, this.y);
                }
                break;
            case 'health':
                // Soltar corazón que cura al jugador
                this.dropHealthPickup();
                break;
        }
    }
}

// Spawnear minions al morir
spawnMinionsOnDeath() {
    // Buscar el efecto específico para obtener la configuración
    const minionEffect = this.onDeathEffects.find(e => e.type === 'spawnMinions');
    if (!minionEffect) return;
    
    const count = minionEffect.count || 3;
    const minionType = minionEffect.minionType || 'small';
    const spread = minionEffect.spread || 100;
    
    console.log(`🦟 Spawneando ${count} minions tipo ${minionType} alrededor de (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
    
    if (this.scene.enemyManager) {
        for (let i = 0; i < count; i++) {
            // Posición aleatoria alrededor del enemigo muerto
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const distance = spread * (0.5 + Math.random() * 0.5);
            const minionX = this.x + Math.cos(angle) * distance;
            const minionY = this.y + Math.sin(angle) * distance;
            
            // Usar el registry para crear el minion
            if (window.enemyRegistry) {
                const minion = window.enemyRegistry.create(minionType, minionX, minionY, this.scene);
                if (minion) {
                    this.scene.enemyManager.enemies.push(minion);
                }
            }
        }
    }
}

// Soltar pickup de salud
dropHealthPickup() {
    // Crear un objeto de curación en el mundo
    // Por ahora, simplemente curar directamente al jugador si está cerca
    if (this.scene.player) {
        const distToPlayer = Math.hypot(this.scene.player.px - this.x, this.scene.player.py - this.y);
        if (distToPlayer < 100) {
            this.healPlayerOnDeath(15);
        } else {
            // TODO: crear un objeto pickup que el jugador pueda recoger después
            console.log(`💊 Pickup de salud disponible en (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
        }
    }
}

} 