import Enemy from './Enemy.js';

export class SmallEnemy extends Enemy {
  constructor(x, y, scene) {
    super(x, y, scene, { type: 'small', radius: 12, maxHp: 1, color: 0xff6666, speed: 60 });
  }

  getDashDamage() { return 1; }
  
  takeDamage() { this.hp = 0; return true; }

  takeSlamDamage() { this.hp = 0; return true; }
}

export class MediumEnemy extends Enemy {
  constructor(x, y, scene) {
    super(x, y, scene, { type: 'medium', radius: 20, maxHp: 100, color: 0xff4444, speed: 50 });
  }

  getDashDamage(dashSpeed) {
    if (dashSpeed >= 1500) return 60;
    if (dashSpeed <= 600) return 5;
    return Math.floor(5 + (dashSpeed - 600) * (55 / 900));
  }

  takeDamage(damage) {
    this.hp -= damage;
    return this.hp <= 0;
  }

  takeSlamDamage(damage) {
    this.hp -= damage;
    return this.hp <= 0;
  }
}

export class BigEnemy extends Enemy {
  constructor(x, y, scene) {
    super(x, y, scene, { type: 'big', radius: 32, maxHp: 300, color: 0xaa2222, speed: 30 });
  }

  getDashDamage(dashSpeed, isAirDash) {
    if (isAirDash && dashSpeed >= 400) {
      return dashSpeed >= 1000 ? 105 : 55;
    }
    return 0;
  }

  takeDamage(damage, dashSpeed, isAirDash) {
    if (isAirDash) {
      this.hp -= damage;
      return this.hp <= 0;
    }
    return false;
  }

  takeSlamDamage(damage, isHighSpeed) {
    if (isHighSpeed) {
      this.hp -= damage;
      return this.hp <= 0;
    }
    return false;
  }
}