// js/scenes/Enemy.js

export default class Enemy {
  constructor(x, y, scene, config) {
    this.x = x;
    this.y = y;
    this.scene = scene;
    
    this.radius = config.radius || 12;
    this.maxHp = config.maxHp || config.hp || 1;
    this.hp = this.maxHp;
    this.color = config.color || 0xff6666;
    this.type = config.type || 'enemy';
    this.speed = config.speed || 50;
    
    // Configuración de daño
    this.dashDamageFn = config.dashDamage || 1;
    this.slamDamageFn = config.slamDamage;
    this.slamVulnerable = config.slamVulnerable !== false;
    this.pierceable = config.pierceable === true;
    
    this.onDeathEffects = config.onDeath || [];
    this.ignoreWalls = config.ignoreWalls === true;
    
    // Tiempos separados para evitar conflictos
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

  // --- NUEVO SISTEMA DE DAÑO (Payload) ---
  receiveDamage(attackPayload) {
    // Si acaba de recibir daño, tiene 100ms de i-frames (evita multihits accidentales)
    if (attackPayload.now - this.lastHurtTime < 100) return false;

    let damageToTake = 0;

    switch(attackPayload.type) {
      case 'dash':
        if (typeof this.dashDamageFn === 'function') {
          damageToTake = this.dashDamageFn(attackPayload.speed, attackPayload.isAir);
        } else {
          damageToTake = typeof this.dashDamageFn === 'number' ? this.dashDamageFn : 1;
        }
        break;
        
      case 'slam':
        if (!this.slamVulnerable) return false;
        if (typeof this.slamDamageFn === 'function') {
          damageToTake = this.slamDamageFn(attackPayload.damage, attackPayload.isHighSpeed);
        } else if (typeof this.slamDamageFn === 'number') {
          damageToTake = this.slamDamageFn;
        } else {
          damageToTake = attackPayload.damage;
        }
        break;
        
      case 'pierce':
        if (!this.pierceable) return false;
        damageToTake = this.maxHp;
        break;
    }

    if (damageToTake <= 0) return false;

    this.hp -= damageToTake;
    this.lastHurtTime = attackPayload.now;

    console.log(`💥 Enemigo [${this.type}] recibió ${damageToTake} dmg por ataque tipo: ${attackPayload.type}. HP restante: ${this.hp}`);
    
    return this.hp <= 0;
  }

  update(delta, player, lines) {
    if (!player || player.isDead) return;
    if (this.behaviors?.mobile === false) return;
    
    const dx = player.px - this.x;
    const dy = player.py - this.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0.01) {
      const moveX = (dx / dist) * this.speed * (delta / 16);
      const moveY = (dy / dist) * this.speed * (delta / 16);
      this.x += moveX;
      this.y += moveY;
    }
  }
}