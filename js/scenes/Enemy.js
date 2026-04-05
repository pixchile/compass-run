export default class Enemy {
  constructor(x, y, scene, config) {
    this.x = x;
    this.y = y;
    this.scene = scene;
    
    // Configuración compartida
    this.radius = config.radius;
    this.maxHp = config.maxHp;
    this.hp = config.maxHp;
    this.color = config.color;
    this.type = config.type;
    this.speed = config.speed || 50;
    
    this.lastDamageTime = 0;
    this.vx = 0;
    this.vy = 0;
  }

  canDamage(now) {
    return (now - this.lastDamageTime) >= 250;
  }

  recordDamage(now) {
    this.lastDamageTime = now;
  }

  update(delta, player, lines) {
    if (!player || player.isDead) return;
    
    const dx = player.px - this.x;
    const dy = player.py - this.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0.01) {
      const moveX = (dx / dist) * this.speed * (delta / 16);
      const moveY = (dy / dist) * this.speed * (delta / 16);
      
      this.x += moveX;
      if (this.checkLineCollision(lines)) this.x -= moveX;
      
      this.y += moveY;
      if (this.checkLineCollision(lines)) this.y -= moveY;
    }
  }

  checkLineCollision(lines) {
    for (const line of lines) {
      const distance = this.distanceToSegment({ x: this.x, y: this.y }, line.start, line.end);
      if (distance < this.radius + (line.thickness / 2)) return true;
    }
    return false;
  }

  distanceToSegment(p, a, b) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby)));
    return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
  }

  collidesWith(playerX, playerY, playerRadius = 12) {
    return Math.hypot(this.x - playerX, this.y - playerY) < (this.radius + playerRadius);
  }

  kill() {
    if (this.type !== 'big') {
      this.hp = 0;
      return true;
    }
    return false;
  }
}