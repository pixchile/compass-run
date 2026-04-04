export default class Enemy {
  constructor(x, y, type, scene) {
    this.x = x;
    this.y = y;
    this.type = type;      // 'small', 'medium', 'big'
    this.scene = scene;
    
    // Configuración según tipo
    switch(type) {
      case 'small':
        this.radius = 12;
        this.maxHp = 1;
        this.hp = 1;
        this.color = 0xff6666;
        break;
      case 'medium':
        this.radius = 20;
        this.maxHp = 100;
        this.hp = 100;
        this.color = 0xff4444;
        break;
      case 'big':
        this.radius = 32;
        this.maxHp = 300;
        this.hp = 300;
        this.color = 0xaa2222;
        break;
    }
    
    // Cooldown por enemigo (0.25s entre daños)
    this.lastDamageTime = 0;
    
    // Velocidad para movimiento
    this.vx = 0;
    this.vy = 0;
    this.speed = 50; // Velocidad base
  }
  
  // Recibir daño de un dash
takeDamage(damage, dashSpeed, isAirDash = false) {  // dashLevel → dashSpeed (no se usa)
    if (this.type === 'big') {
        if (isAirDash) {
            this.hp -= damage;
            if (this.hp <= 0) return true;
        }
        return false;
    }
    
    this.hp -= damage;
    if (this.hp <= 0) return true;
    return false;
}
  
  // ============================================================
  // NUEVO: Recibir daño del SLAM (aterrizaje forzoso)
  // ============================================================
  takeSlamDamage(damage, isHighSpeed = false) {
    // Small: siempre muere (tiene 1 de vida)
    if (this.type === 'small') {
      this.hp = 0;
      return true;
    }
    
    // Medium: recibe daño normalmente
    if (this.type === 'medium') {
      this.hp -= damage;
      return this.hp <= 0;
    }
    
    // Big: solo recibe daño si es high speed (velocidad del jugador ≥ 650)
    if (this.type === 'big') {
      if (isHighSpeed) {
        this.hp -= damage;
        return this.hp <= 0;
      }
      return false;
    }
    
    return false;
  }
  
  // Verificar si puede recibir daño del dash actual
  canTakeDashDamage(isAirDash) {
    if (this.type === 'big') {
      return isAirDash;  // Solo con dash aéreo
    }
    return true;  // Los demás siempre pueden recibir daño
  }
  
  // Calcular daño según nivel de dash
getDashDamage(dashSpeed, isAirDash = false) {
    switch(this.type) {
        case 'small':
            return 1;  // Muere siempre
            
        case 'medium':
            // Velocidades aproximadas: L1~585, L2~1125, L3~1695
            if (dashSpeed >= 1200) return 100;   // equivalente a nivel 3
            if (dashSpeed >= 750)  return 55;    // equivalente a nivel 2
            return 0;  // muy lento, no daña
            
        case 'big':
            if (isAirDash && dashSpeed >= 750) {  // mínimo nivel 2
                if (dashSpeed >= 1200) return 105;  // nivel 3
                return 55;   // nivel 2
            }
            return 0;
            
        default:
            return 0;
    }
}
  
  // Verificar si el enemigo puede dañar al jugador (cooldown 0.25s)
  canDamage(now) {
    return (now - this.lastDamageTime) >= 250;  // 0.25 segundos
  }
  
  // Registrar que el enemigo acaba de dañar al jugador
  recordDamage(now) {
    this.lastDamageTime = now;
  }
  
  // Actualizar movimiento del enemigo
  update(delta, player, lines) {
    if (!player || player.isDead) return;
    
    // Movimiento hacia el jugador
    const dx = player.px - this.x;
    const dy = player.py - this.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0.01) {
      const moveX = (dx / dist) * this.speed * (delta / 16);
      const moveY = (dy / dist) * this.speed * (delta / 16);
      
      // Probar movimiento en X
      this.x += moveX;
      if (this.checkLineCollision(lines)) {
        this.x -= moveX;
      }
      
      // Probar movimiento en Y
      this.y += moveY;
      if (this.checkLineCollision(lines)) {
        this.y -= moveY;
      }
    }
  }
  
  // Verificar colisión con líneas
  checkLineCollision(lines) {
    for (const line of lines) {
      const distance = this.distanceToSegment(
        { x: this.x, y: this.y },
        line.start,
        line.end
      );
      
      if (distance < this.radius + (line.thickness / 2)) {
        return true;
      }
    }
    return false;
  }
  
  // Distancia de un punto a un segmento
  distanceToSegment(p, a, b) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby);
    
    if (t < 0) return Math.hypot(p.x - a.x, p.y - a.y);
    if (t > 1) return Math.hypot(p.x - b.x, p.y - b.y);
    
    const projX = a.x + t * abx;
    const projY = a.y + t * aby;
    return Math.hypot(p.x - projX, p.y - projY);
  }
  
  // Verificar si el jugador está colisionando
  collidesWith(playerX, playerY, playerRadius = 12) {
    const dx = this.x - playerX;
    const dy = this.y - playerY;
    const distance = Math.hypot(dx, dy);
    return distance < (this.radius + playerRadius);
  }
  
  // Matar enemigo (para muerte por velocidad nivel 3)
  kill() {
    if (this.type !== 'big') {
      this.hp = 0;
      return true;
    }
    return false;
  }
}