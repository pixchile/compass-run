// js/scenes/EnemyManager.js

import enemyRegistry from '../enemies/EnemyRegistry.js';
import { SLAM, KILL_STACKS } from '../constants.js';

export default class EnemyManager {
  constructor(scene, arenaBounds) {
    this.scene = scene;
    this.arenaBounds = arenaBounds;
    this.enemies = [];
    
    this.spawnList = [];
    this.nextSpawnIndex = 0;
    this.gameStartTime = 0;
    
    this.damagedThisDash = new Set();
    this.wasDashing = false;

    this.rewardSystem = null;
    this.orbManager   = null;
    this.momentum     = null;

    // OPTIMIZACIÓN: Pre-asignar objetos para Zero Allocation (GC Free)
    this._dashAttackObj = { type: 'dash', speed: 0, isAir: false, now: 0 };
    this._pierceAttackObj = { type: 'pierce', now: 0 };
    this._slamAttackObj = { type: 'slam', damage: 0, isHighSpeed: false, now: 0 };
    this._wallAttackObj = { type: 'slam', damage: 0, isHighSpeed: false, now: 0 };
    
    // Objetos para colisión matemática
    this._p1 = { x: 0, y: 0 };
    this._p2 = { x: 0, y: 0 };
    this._colResult = { collided: false, hitX: 0, hitY: 0 };
  }

  setRewardHandlers(rewardSystem, orbManager) {
    this.rewardSystem = rewardSystem;
    this.orbManager   = orbManager;
  }

  setMomentumSystem(momentum) {
    this.momentum = momentum;
  }

  _onEnemyDied(enemy) {
    if (this.rewardSystem) this.rewardSystem.onEnemyKilled(enemy.type);
    if (this.orbManager && enemy.type === 'big') this.orbManager.scheduleOrb(enemy.x, enemy.y);
    if (this.momentum && KILL_STACKS[enemy.type] !== undefined) {
      this.momentum.addStacks(KILL_STACKS[enemy.type]);
    }
  }
  
  setSpawnList(enemies) {
    this.spawnList = enemies
      .map(e => ({ ...e, active: false }))
      .sort((a, b) => a.spawnTime - b.spawnTime);
    this.nextSpawnIndex = 0;
    this.gameStartTime = 0;
  }
  
  update(delta, currentTime, player, lines) {
    if (this.gameStartTime === 0) this.gameStartTime = currentTime;
    
    const elapsedSeconds = (currentTime - this.gameStartTime) / 1000;
    
    while (this.nextSpawnIndex < this.spawnList.length) {
      const enemyData = this.spawnList[this.nextSpawnIndex];
      if (enemyData.spawnTime <= elapsedSeconds) {
        if (!enemyData.active) {
          enemyData.active = true;
          const enemyType = enemyData.type || enemyData.enemyRef;
          const newEnemy = enemyRegistry.create(enemyType, enemyData.x, enemyData.y, this.scene);

          if (newEnemy) this.enemies.push(newEnemy);
        }
        this.nextSpawnIndex++;
      } else {
        break;
      }
    }

    for (const enemy of this.enemies) {
        if (typeof enemy.update === 'function') {
            enemy.update(delta, player, lines);
        }
    }
  }

  processPlayerInteractions(player, delta, now, momentumLevel) {
    if (player.dashing && !this.wasDashing) {
      this.damagedThisDash.clear();
      // console.log("⚡ [SISTEMA] Iniciando nuevo Dash. Tracking limpio.");
    }
    this.wasDashing = player.dashing;

    // OPTIMIZACIÓN: Sacar cálculos repetitivos fuera del bucle
    const playerRadius = 12;
    const currentDashSpeed = player.dashing ? Math.hypot(player.vx, player.vy) : 0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const hasCollisionFunc = typeof enemy.collidesWith === 'function';
      const enemyRadius = enemy.radius || 12;
      
      let isColliding = false;
      if (hasCollisionFunc) {
         isColliding = enemy.collidesWith(player.px, player.py, playerRadius);
      } else {
         // OPTIMIZACIÓN: Math.hypot es lento. Usamos distancia al cuadrado para el chequeo de respaldo.
         const dx = enemy.x - player.px;
         const dy = enemy.y - player.py;
         const minR = enemyRadius + playerRadius;
         isColliding = (dx * dx + dy * dy) < (minR * minR);
      }

      if (isColliding) {
        let enemyDied = false;

        if (player.dashing) {
          if (!this.damagedThisDash.has(enemy)) {
            this.damagedThisDash.add(enemy);
            
            // Reutilizamos el objeto pre-creado
            this._dashAttackObj.speed = currentDashSpeed;
            this._dashAttackObj.isAir = player.wasJumpingWhenDashed;
            this._dashAttackObj.now = now;
            
            if (typeof enemy.receiveDamage === 'function') {
                enemyDied = enemy.receiveDamage(this._dashAttackObj);
            } else {
                enemy.hp = (enemy.hp || 1) - 1;
                enemyDied = enemy.hp <= 0;
                // console.log(`💥 [FALLBACK] Enemigo golpeado a la fuerza! HP: ${enemy.hp}`);
            }
          }
        } 
        else if (momentumLevel === 3) {
            this._pierceAttackObj.now = now;
            if (typeof enemy.receiveDamage === 'function') {
                enemyDied = enemy.receiveDamage(this._pierceAttackObj);
            } else if (enemy.pierceable) {
                enemy.hp = 0;
                enemyDied = true;
            }
        }
        else if (!player.isInvincible) {
          if (!enemy.state) enemy.state = {}; 
          if (now - (enemy.state.lastAttackTime || 0) >= 250) {
            enemy.state.lastAttackTime = now;
            player.takeEnemyDamage();
          }
        }

        if (enemyDied) {
          // console.log(`💀 [SISTEMA] Enemigo destruido.`);
          this._onEnemyDied(enemy);
          this.enemies.splice(i, 1);
        }
      }
    }
  }

  checkSolidCollision(player, playerRadius = 12) {
    let collided = false;
    for (const enemy of this.enemies) {
      const eRadius = enemy.radius || 12;
      const dx = player.px - enemy.x;
      const dy = player.py - enemy.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = playerRadius + eRadius;
      
      if (distance < minDistance && distance > 0) { // distance > 0 previene división por 0
        collided = true;
        const overlap = minDistance - distance;
        
        // OPTIMIZACIÓN: Eliminada Trigonometría (Math.atan2, Math.cos, Math.sin)
        const pushX = dx / distance;
        const pushY = dy / distance;

        player.px += pushX * overlap;
        player.py += pushY * overlap;
        
        const velDot = player.vx * pushX + player.vy * pushY;
        if (velDot < 0) {
          player.vx -= pushX * velDot * 0.5;
          player.vy -= pushY * velDot * 0.5;
        }
      }
    }
    return collided;
  }

  processSlam(slamData, now) {
    const { x, y, speed, isHighSpeed, applyKnockback } = slamData;
    const radius = SLAM.RADIUS;
    const damage = SLAM.DAMAGE;
    const wallDamage = SLAM.WALL_COLLISION_DAMAGE;

    // Mutamos los objetos cacheados
    this._slamAttackObj.damage = damage;
    this._slamAttackObj.isHighSpeed = isHighSpeed;
    this._slamAttackObj.now = now;

    this._wallAttackObj.damage = wallDamage;
    this._wallAttackObj.isHighSpeed = isHighSpeed;
    this._wallAttackObj.now = now;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const dist = Math.hypot(dx, dy);
      
      if (dist > radius) continue;

      let enemyDied = false;
      if (typeof enemy.receiveDamage === 'function') {
        enemyDied = enemy.receiveDamage(this._slamAttackObj);
      } else {
        enemy.hp -= damage;
        enemyDied = enemy.hp <= 0;
      }

      if (enemyDied) {
        this._onEnemyDied(enemy);
        this.enemies.splice(i, 1);
        continue;
      }

      // Knockback y choque contra paredes
      if (isHighSpeed && applyKnockback && dist > 0) {
        const oldX = enemy.x;
        const oldY = enemy.y;
        
        // OPTIMIZACIÓN: Eliminada Trigonometría para el Knockback
        const dirX = dx / dist;
        const dirY = dy / dist;
        enemy.x += dirX * SLAM.KNOCKBACK_DIST;
        enemy.y += dirY * SLAM.KNOCKBACK_DIST;

        const lines = this.scene.currentMap?.lines || [];
        let hitWall = false;

        // Configuramos puntos cacheados sin crear objetos literales {}
        this._p1.x = oldX; this._p1.y = oldY;
        this._p2.x = enemy.x; this._p2.y = enemy.y;

        for (const line of lines) {
          this._checkLineCollision(this._p1, this._p2, line, enemy.radius || 12);
          if (this._colResult.collided) {
            hitWall = true;
            enemy.x = this._colResult.hitX;
            enemy.y = this._colResult.hitY;
            break;
          }
        }

        if (hitWall) {
          let wallDied = false;
          if (typeof enemy.receiveDamage === 'function') {
            wallDied = enemy.receiveDamage(this._wallAttackObj);
          } else {
            enemy.hp -= wallDamage; 
            wallDied = enemy.hp <= 0;
          }

          if (wallDied) {
            this._onEnemyDied(enemy);
            this.enemies.splice(i, 1);
          }
        }
      }
    }
  }

  // OPTIMIZACIÓN: Zero Allocation. Se actualiza this._colResult en vez de retornar {}
  _checkLineCollision(p1, p2, line, radius) {
    this._colResult.collided = false;

    const { start, end } = line;
    const abx = end.x - start.x, aby = end.y - start.y;
    const len2 = abx * abx + aby * aby;
    if (len2 === 0) return;
    
    let t = Math.max(0, Math.min(1, ((p1.x - start.x) * abx + (p1.y - start.y) * aby) / len2));
    const closestX = start.x + t * abx, closestY = start.y + t * aby;
    if (Math.hypot(closestX - p1.x, closestY - p1.y) >= radius) return;
    
    const moveX = p2.x - p1.x, moveY = p2.y - p1.y;
    const moveLen = Math.hypot(moveX, moveY);
    if (moveLen === 0) return;
    
    const dirX = moveX / moveLen, dirY = moveY / moveLen;
    const toClosestX = closestX - p1.x, toClosestY = closestY - p1.y;
    const dot = toClosestX * dirX + toClosestY * dirY;
    if (dot <= 0 || dot > moveLen) return;
    
    const perpX = toClosestX - dot * dirX, perpY = toClosestY - dot * dirY;
    const perpDist = Math.hypot(perpX, perpY);
    if (perpDist >= radius) return;
    
    const tCollide = dot - Math.sqrt(radius * radius - perpDist * perpDist);
    if (tCollide < 0 || tCollide > moveLen) return;
    
    this._colResult.collided = true;
    this._colResult.hitX = p1.x + dirX * tCollide;
    this._colResult.hitY = p1.y + dirY * tCollide;
  }
  
  clearAll() {
    this.enemies = [];
    this.damagedThisDash.clear();
    this.wasDashing = false;
    this.nextSpawnIndex = 0;
    this.gameStartTime = 0;
    for (const enemy of this.spawnList) enemy.active = false;
  }
  
  getEnemies() { return this.enemies; }
}