// js/scenes/Enemy.js

export default class Enemy {
    constructor(x, y, scene, config) {
        this.x = x;
        this.y = y;
        this.scene = scene;
        
        // 1. LEER CONFIGURACIÓN (Soporta Editor v2.0 y el antiguo)
        const basic = config.basic || {};
        
        this.type = config.id || config.type || 'enemy';
        this.radius = basic.radius || config.radius || 12;
        this.shape = basic.shape || config.shape || 'circle';
        this.maxHp = basic.hp || config.maxHp || config.hp || 1;
        this.hp = this.maxHp;
        this.hpRegen = basic.hpRegen || 0; // Nueva mecánica: regeneración
        this.isBoss = basic.isBoss || false;
        
        // Procesar color (soporta "0xFF0000" del nuevo editor o "#ff0000" del viejo)
        let c = basic.color || config.color || 0xff6666;
        if (typeof c === 'string') {
            c = parseInt(c.replace('#', '0x').replace('0x', ''), 16);
        }
        this.color = c;

        // 2. MULTIPLICADORES DE DAÑO (Game-Feel)
        // Si no existen en la config, ponemos por defecto 1.0 (daño normal)
        this.damageMultipliers = config.damageMultipliers || {
            dash: 1.0, 
            aerialDash: 1.0, 
            momentum3: 1.0, 
            slam: 1.0, 
            slam3: 1.0, 
            void: 100.0, 
            wallCrash: 0.0, 
            explosion: 1.0
        };

        // Mantener compatibilidad con configuraciones antiguas
        if (config.slamVulnerable === false) this.damageMultipliers.slam = 0;
        if (config.pierceable === true) this.damageMultipliers.momentum3 = 999;

        this.onDeathEffects = config.onDeath || [];
        
        // Tiempos y estados
        this.lastHurtTime = 0;
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

    collidesWith(playerX, playerY, playerRadius = 12) {
        const dx = this.x - playerX;
        const dy = this.y - playerY;
        const dist = Math.hypot(dx, dy);
        return dist < (this.radius + playerRadius);
    }

    // --- NUEVO SISTEMA DE DAÑO CENTRALIZADO (Fase 2) ---
    // payload = { type: 'dash'|'slam'|'momentum3'|'wallCrash', baseDamage: número, now: Date.now() }
    receiveDamage(attackPayload) {
        // Evitar multihits accidentales (i-frames de 100ms)
        if (attackPayload.now && attackPayload.now - this.lastHurtTime < 100) return false;

        // Buscar el multiplicador correspondiente según el tipo de ataque
        const multiplier = this.damageMultipliers[attackPayload.type] ?? 1.0;
        
        // Si el multiplicador es 0 o menor, es inmune a esto
        if (multiplier <= 0) return false;

        // Calcular daño final
        const finalDamage = attackPayload.baseDamage * multiplier;
        
        this.hp -= finalDamage;
        if (attackPayload.now) this.lastHurtTime = attackPayload.now;

        return this.hp <= 0;
    }

    // Update básico (se sobrescribe en DynamicEnemy)
    update(delta, player, lines) {
        // Lógica de regeneración pasiva
        if (this.hpRegen > 0 && this.hp < this.maxHp && this.hp > 0) {
            this.hp = Math.min(this.maxHp, this.hp + (this.hpRegen * (delta / 1000)));
        }
    }
}