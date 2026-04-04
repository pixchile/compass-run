import Enemy from './Enemy.js';
import { SLAM } from '../constants.js';

export default class EnemyManager {
  constructor(scene, arenaBounds) {
    this.scene = scene;
    this.arenaBounds = arenaBounds;
    this.enemies = [];
    
    this.spawnList = [];
    this.nextSpawnIndex = 0;
    this.gameStartTime = 0;
    
    this.damagedThisDash = new Set();

    // ─── Sistemas de recompensa (se inyectan desde Game.js) ───────────
    this.rewardSystem = null;
    this.orbManager   = null;
  }

  // Llamar desde Game.js tras crear los sistemas
  setRewardHandlers(rewardSystem, orbManager) {
    this.rewardSystem = rewardSystem;
    this.orbManager   = orbManager;
  }

  // ─── Hook central de muerte ───────────────────────────────────────────
  _onEnemyDied(enemy) {
    if (this.rewardSystem) this.rewardSystem.onEnemyKilled(enemy.type);
    if (this.orbManager && enemy.type === 'big') this.orbManager.scheduleOrb(enemy.x, enemy.y);
  }
  
  setSpawnList(enemies) {
    this.spawnList = enemies
      .map(e => ({ ...e, active: false }))
      .sort((a, b) => a.spawnTime - b.spawnTime);
    this.nextSpawnIndex = 0;
    this.gameStartTime = 0;
  }
  
  update(delta, currentTime) {
    if (this.gameStartTime === 0) this.gameStartTime = currentTime;
    
    const elapsedSeconds = (currentTime - this.gameStartTime) / 1000;
    
    while (this.nextSpawnIndex < this.spawnList.length) {
      const enemyData = this.spawnList[this.nextSpawnIndex];
      if (enemyData.spawnTime <= elapsedSeconds) {
        if (!enemyData.active) {
          enemyData.active = true;
          this.enemies.push(new Enemy(enemyData.x, enemyData.y, enemyData.type, this.scene));
        }
        this.nextSpawnIndex++;
      } else {
        break;
      }
    }
  }
  
  spawnRandomEnemy() {}
  spawnInitialEnemies(count = 5) {}
  
  resetDashDamageTracking() {
    this.damagedThisDash.clear();
  }
  
  // ─── COLISIONES DE DASH ──────────────────────────────────────────────
checkDashCollisions(player, dashSpeed, now, onEnemyKilled) {  // dashLevel → dashSpeed
    let killedAny = false;
    let hitAny = false;
    
    const isAirDash = player.wasJumpingWhenDashed === true;
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (this.damagedThisDash.has(enemy)) continue;
        
        if (enemy.collidesWith(player.px, player.py)) {
            hitAny = true;
            if (enemy.canTakeDashDamage(isAirDash)) {
                const damage = enemy.getDashDamage(dashSpeed, isAirDash);  // ← pasa velocidad
                if (damage > 0) {
                    this.damagedThisDash.add(enemy);
                    const isDead = enemy.takeDamage(damage, dashSpeed, isAirDash);  // ← también aquí
                    if (isDead) {
                        this._onEnemyDied(enemy);
                        this.enemies.splice(i, 1);
                        killedAny = true;
                        if (onEnemyKilled) onEnemyKilled(enemy.type);
                    }
                }
            }
        }
    }
    
    return { hitAny, killedAny };
}
  
  // ─── PIERCE ──────────────────────────────────────────────────────────
  checkPierceKills(player, momentumLevel) {
    let killedAny = false;
    
    if (momentumLevel === 3) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (enemy.type === 'small' && enemy.collidesWith(player.px, player.py)) {
          this._onEnemyDied(enemy);
          this.enemies.splice(i, 1);
          killedAny = true;
        }
      }
    }
    
    return killedAny;
  }
  
  // ─── COLISIONES NORMALES (daño al jugador) ────────────────────────────
  checkNormalCollisions(player, now, onDamage) {
    let tookDamage = false;
    
    for (const enemy of this.enemies) {
      if (enemy.collidesWith(player.px, player.py)) {
        if (enemy.canDamage(now)) {
          enemy.recordDamage(now);
          tookDamage = true;
          if (onDamage) onDamage(enemy);
        }
      }
    }
    
    return tookDamage;
  }
  
  // ─── COLISIÓN SÓLIDA (empuje) ─────────────────────────────────────────
  checkSolidCollision(player, playerRadius = 12) {
    let collided = false;
    
    for (const enemy of this.enemies) {
      const dx = player.px - enemy.x;
      const dy = player.py - enemy.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = playerRadius + enemy.radius;
      
      if (distance < minDistance) {
        collided = true;
        const angle = Math.atan2(dy, dx);
        const overlap = minDistance - distance;
        player.px += Math.cos(angle) * overlap;
        player.py += Math.sin(angle) * overlap;
        const pushX = Math.cos(angle), pushY = Math.sin(angle);
        const velDot = player.vx * pushX + player.vy * pushY;
        if (velDot < 0) {
          player.vx -= pushX * velDot * 0.5;
          player.vy -= pushY * velDot * 0.5;
        }
      }
    }
    
    return collided;
  }
  
  // ─── SLAM ─────────────────────────────────────────────────────────────
  applySlamDamage(slamX, slamY, playerSpeed, applyKnockback = true) {
    const isHighSpeed = playerSpeed >= SLAM.HIGH_SPEED_THRESHOLD;
    const { RADIUS: radius, DAMAGE: damage, KNOCKBACK_DIST: knockbackDist, WALL_COLLISION_DAMAGE: wallDamage } = SLAM;
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dx = enemy.x - slamX, dy = enemy.y - slamY;
      if (Math.hypot(dx, dy) > radius) continue;

      const wasDead = enemy.hp <= 0;
      const died = enemy.takeSlamDamage(damage, isHighSpeed);
      
      if (!wasDead && died) {
        this._onEnemyDied(enemy);
        this.enemies.splice(i, 1);
        continue;  // ya eliminado, no procesar knockback
      }
      
      if (isHighSpeed && applyKnockback) {
        const angle = Math.atan2(dy, dx);
        const oldX = enemy.x, oldY = enemy.y;
        enemy.x += Math.cos(angle) * knockbackDist;
        enemy.y += Math.sin(angle) * knockbackDist;
        
        const lines = this.scene.currentMap?.lines || [];
        let hitWall = false;
        
        for (const line of lines) {
          const collision = this._checkLineCollision(
            { x: oldX, y: oldY }, { x: enemy.x, y: enemy.y }, line, enemy.radius || 15
          );
          if (collision.collided) {
            hitWall = true;
            enemy.x = collision.hitX;
            enemy.y = collision.hitY;
            break;
          }
        }
        
        if (hitWall && !enemy.isDead && enemy.hp > 0) {
          const wallDied = enemy.takeSlamDamage(wallDamage, isHighSpeed);
          if (wallDied) {
            const idx = this.enemies.indexOf(enemy);
            if (idx !== -1) {
              this._onEnemyDied(enemy);
              this.enemies.splice(idx, 1);
            }
          }
        }
        
        const arenaBounds = this.scene.currentMap?.arena || this.arenaBounds;
        if (arenaBounds) {
          const margin = 200;
          const oob = enemy.y < arenaBounds.y - margin || enemy.y > arenaBounds.y + arenaBounds.h + margin ||
                      enemy.x < arenaBounds.x - margin || enemy.x > arenaBounds.x + arenaBounds.w + margin;
          if (oob && enemy.hp > 0) {
            const idx = this.enemies.indexOf(enemy);
            if (idx !== -1) {
              this._onEnemyDied(enemy);
              this.enemies.splice(idx, 1);
            }
          }
        }
      }
    }
  }
  
  _checkLineCollision(p1, p2, line, radius) {
    const { start, end } = line;
    const abx = end.x - start.x, aby = end.y - start.y;
    const len2 = abx * abx + aby * aby;
    if (len2 === 0) return { collided: false };
    
    let t = ((p1.x - start.x) * abx + (p1.y - start.y) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    const closestX = start.x + t * abx, closestY = start.y + t * aby;
    if (Math.hypot(closestX - p1.x, closestY - p1.y) >= radius) return { collided: false };
    
    const moveX = p2.x - p1.x, moveY = p2.y - p1.y;
    const moveLen = Math.hypot(moveX, moveY);
    if (moveLen === 0) return { collided: false };
    
    const dirX = moveX / moveLen, dirY = moveY / moveLen;
    const toClosestX = closestX - p1.x, toClosestY = closestY - p1.y;
    const dot = toClosestX * dirX + toClosestY * dirY;
    if (dot <= 0 || dot > moveLen) return { collided: false };
    
    const perpX = toClosestX - dot * dirX, perpY = toClosestY - dot * dirY;
    const perpDist = Math.hypot(perpX, perpY);
    if (perpDist >= radius) return { collided: false };
    
    const tCollide = dot - Math.sqrt(radius * radius - perpDist * perpDist);
    if (tCollide < 0 || tCollide > moveLen) return { collided: false };
    
    return { collided: true, hitX: p1.x + dirX * tCollide, hitY: p1.y + dirY * tCollide };
  }
  
  clearAll() {
    this.enemies = [];
    this.damagedThisDash.clear();
    this.nextSpawnIndex = 0;
    this.gameStartTime = 0;
    for (const enemy of this.spawnList) enemy.active = false;
  }
  
  getEnemies() { return this.enemies; }
}
