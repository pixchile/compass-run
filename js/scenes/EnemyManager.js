// js/scenes/EnemyManager.js

import enemyRegistry from '../enemies/EnemyRegistry.js';
import { SLAM, KILL_STACKS } from '../constants.js';

export default class EnemyManager {
  constructor(scene, arenaBounds) {
    this.scene = scene;
    this.arenaBounds = arenaBounds;
    this.enemies = [];
    this.totalKills = 0;
    this.nextSpawnIndex = 0;
    this.gameStartTime = 0;
    
    this.damagedThisDash = new Set();
    this.wasDashing = false;

    this.rewardSystem = null;
    this.orbManager   = null;
    this.momentum     = null;
    this.density      = null;
    this.spawners     = [];
    this._fillType    = null;

    // Objetos Zero-Allocation
    this._dashAttackObj = { type: 'dash', baseDamage: 0, now: 0, radius: 0 };
    this._pierceAttackObj = { type: 'momentum3', baseDamage: 0, now: 0, radius: 0 };
    this._slamAttackObj = { type: 'slam', baseDamage: 0, now: 0, radius: 0 };
    this._wallAttackObj = { type: 'wallCrash', baseDamage: 0, now: 0, radius: 0 };
    
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
    this.totalKills++;
    if (this.rewardSystem) this.rewardSystem.onEnemyKilled(enemy.type);
    if (this.orbManager && enemy.type === 'big') this.orbManager.scheduleOrb(enemy.x, enemy.y);
    if (this.momentum && KILL_STACKS[enemy.type] !== undefined) {
      this.momentum.addStacks(KILL_STACKS[enemy.type]);
    }
  }
  
  setDensity(density) {
    this.density = density || null;
  }

  setSpawners(spawners) {
    this.spawners = spawners || [];
  }

  setSpawnList(enemies) {
    this.spawnList = enemies.map(e => {
        const enemyType = e.type || e.enemyRef;
        let finalSpawnTime = e.spawnTime;

        const typeConfig = enemyRegistry.configs?.get?.(enemyType) || enemyRegistry.configs?.[enemyType];
        if (typeConfig) {
            const basic = typeConfig.basic || {};
            const trigger = basic.spawnTrigger || {};
            
            if (e.spawnTime === undefined && trigger.type === 'time') {
                finalSpawnTime = parseFloat(trigger.value) || 0;
            }
            if (trigger.type === 'kills' || trigger.type === 'coords') {
                return { ...e, spawnTime: undefined, spawnTrigger: trigger, active: false };
            }
        }

        return { ...e, spawnTime: finalSpawnTime ?? 0, active: false };
    }).sort((a, b) => (a.spawnTime ?? Infinity) - (b.spawnTime ?? Infinity));
    
    this.nextSpawnIndex = 0;
    this.gameStartTime = 0;
  }
  
  update(delta, currentTime, player, lines) {
    if (this.gameStartTime === 0) this.gameStartTime = currentTime;
    
    const elapsedSeconds = (currentTime - this.gameStartTime) / 1000;
    const elapsedMin     = elapsedSeconds / 60;
    const hardcap = this.density
      ? Math.min(Math.floor((this.density.maxBase || 20) + (this.density.maxPerMin || 0) * elapsedMin), 300)
      : 300;

    while (this.nextSpawnIndex < this.spawnList.length) {
      const enemyData = this.spawnList[this.nextSpawnIndex];
      if (enemyData.spawnTime <= elapsedSeconds) {
        if (!enemyData.active && this.enemies.length < hardcap) {
          enemyData.active = true;
          this._spawnOne(enemyData, player);
        }
        this.nextSpawnIndex++;
      } else {
        break;
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (typeof enemy.update === 'function') {
            enemy.update(delta, player, lines);
        }
        if (enemy.hp <= 0) {
            this._onEnemyDied(enemy);
            this.enemies.splice(i, 1);
        }
    }

    for (const enemyData of this.spawnList) {
        if (enemyData.active || !enemyData.spawnTrigger) continue;
        const trigger = enemyData.spawnTrigger;
        let shouldSpawn = false;

        if (trigger.type === 'kills') {
            shouldSpawn = this.totalKills >= parseInt(trigger.value);
        } else if (trigger.type === 'coords' && player) {
            const [tx, ty, tr] = (trigger.value + '').split(',').map(Number);
            shouldSpawn = Math.hypot(player.px - tx, player.py - ty) <= (tr || 80);
        }

        if (shouldSpawn) {
            enemyData.active = true;
            this._spawnOne(enemyData, player);
        }
    }

    if (this.density && player && this.spawners.length) {
      const minNow = Math.floor((this.density.minBase || 0) + (this.density.minPerMin || 0) * elapsedMin);

      if (this.enemies.length < minNow && this.enemies.length < hardcap) {
        if (!this._fillType) {
          const types = this.spawnList.map(e => e.type || e.enemyRef).filter(Boolean);
          this._fillType = types[0] || null;
        }
        if (this._fillType && enemyRegistry.has(this._fillType)) {
          const spawner = this.spawners[Math.floor(Math.random() * this.spawners.length)];
          const offset  = 60 + Math.random() * 80;
          const angle   = Math.random() * Math.PI * 2;
          const newEnemy = enemyRegistry.create(
            this._fillType,
            spawner.x + Math.cos(angle) * offset,
            spawner.y + Math.sin(angle) * offset,
            this.scene
          );
          if (newEnemy) this.enemies.push(newEnemy);
        }
      }
    }
  }

  _spawnOne(enemyData, player) {
    const enemyType = enemyData.type || enemyData.enemyRef;
    const typeConfig = enemyRegistry.configs?.get?.(enemyType) || enemyRegistry.configs?.[enemyType];
    const spawnConfig = typeConfig?.ambitious?.spawn;
    const pattern = spawnConfig?.pattern || 'normal';
    const count = parseInt(spawnConfig?.count) || 1;

    if ((pattern === 'radial' || pattern === 'radial_player' || pattern === 'horde') && count > 1) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        const spread = (pattern === 'radial' || pattern === 'radial_player')
          ? (spawnConfig?.orbitRange || 80) : (50 + Math.random() * 60);
        const cx = pattern === 'radial_player' ? (player?.px ?? enemyData.x) : enemyData.x;
        const cy = pattern === 'radial_player' ? (player?.py ?? enemyData.y) : enemyData.y;
        const newEnemy = enemyRegistry.create(enemyType, cx + Math.cos(angle) * spread, cy + Math.sin(angle) * spread, this.scene);
        if (newEnemy) this.enemies.push(newEnemy);
      }
    } else {
      const newEnemy = enemyRegistry.create(enemyType, enemyData.x, enemyData.y, this.scene);
      if (newEnemy) this.enemies.push(newEnemy);
    }
  }

  // --- MODIFICADO: Usa el radio del payload de ataque ---
  processPlayerInteractions(player, delta, now, momentumSystem) {
    if (player.dashing && !this.wasDashing) {
      this.damagedThisDash.clear();
    }
    this.wasDashing = player.dashing;

    // Obtener payload de ataque del jugador (incluye radio)
    const attackPayload = player.getCurrentAttackPayload(momentumSystem.level);
    
    const playerRadius = 12;
    const currentSpeed = Math.hypot(player.vx, player.vy);

    const auraEmitters = this.enemies.filter(e => e.invulnerableAura && e.hp > 0);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const hasCollisionFunc = typeof enemy.collidesWith === 'function';
      const enemyRadius = enemy.radius || 12;
      
      // --- NUEVO: Detección por radio de ataque (prioridad sobre colisión física) ---
      let isInAttackRange = false;
      let attackDamage = 0;
      let attackType = null;
      
      if (attackPayload) {
        const dx = enemy.x - player.px;
        const dy = enemy.y - player.py;
        const distanceToEnemy = Math.hypot(dx, dy);
        
        if (distanceToEnemy <= attackPayload.radius) {
          isInAttackRange = true;
          attackDamage = attackPayload.baseDamage;
          attackType = attackPayload.type;
        }
      }
      
      // Colisión física normal (cuerpo a cuerpo)
      let isColliding = false;
      if (hasCollisionFunc) {
         isColliding = enemy.collidesWith(player.px, player.py, playerRadius);
      } else {
         const dx = enemy.x - player.px;
         const dy = enemy.y - player.py;
         const minR = enemyRadius + playerRadius;
         isColliding = (dx * dx + dy * dy) < (minR * minR);
      }

      // Si está en rango de ataque O hay colisión física
      if (isInAttackRange || isColliding) {
        let enemyDied = false;
        let fatalSource = 'any';

        const isProtectedByAura = auraEmitters.some(e =>
            e !== enemy && Math.hypot(e.x - enemy.x, e.y - enemy.y) < 200
        );
        if (isProtectedByAura) continue;

        if (enemy.evade && player.dashing) {
            const angle = Math.random() * Math.PI * 2;
            enemy.x += Math.cos(angle) * 150;
            enemy.y += Math.sin(angle) * 150;
            continue;
        }

        // --- PRIORIDAD 1: Ataque por radio (dash, momentum3, slam) ---
        if (attackPayload && isInAttackRange) {
          const attackObj = {
            type: attackType,
            baseDamage: attackDamage,
            now: now,
            radius: attackPayload.radius
          };
          
          if (typeof enemy.receiveDamage === 'function') {
              enemyDied = enemy.receiveDamage(attackObj);
          } else {
              enemy.hp = (enemy.hp || 1) - attackDamage;
              enemyDied = enemy.hp <= 0;
          }
          fatalSource = attackType;
        }
        // --- PRIORIDAD 2: Colisión física con dash ---
        else if (player.dashing) {
          if (!this.damagedThisDash.has(enemy)) {
            this.damagedThisDash.add(enemy);
            
            this._dashAttackObj.type = player.wasJumpingWhenDashed ? 'aerialDash' : 'dash';
            this._dashAttackObj.baseDamage = (player.dashInitialSpeed || currentSpeed) * 0.25; 
            this._dashAttackObj.now = now;
            this._dashAttackObj.radius = player.getAttackRadius(momentumSystem.level);
            
            if (typeof enemy.receiveDamage === 'function') {
                enemyDied = enemy.receiveDamage(this._dashAttackObj);
            } else {
                enemy.hp = (enemy.hp || 1) - this._dashAttackObj.baseDamage;
                enemyDied = enemy.hp <= 0;
            }
            fatalSource = this._dashAttackObj.type;
          }
        } 
        // --- PRIORIDAD 3: Colisión física con momentum 3 ---
        else if (momentumSystem.level === 3 && !isInAttackRange) {
            this._pierceAttackObj.type = 'momentum3';
            this._pierceAttackObj.baseDamage = currentSpeed * 0.025; 
            this._pierceAttackObj.now = now;
            this._pierceAttackObj.radius = player.getAttackRadius(3);

            if (typeof enemy.receiveDamage === 'function') {
                enemyDied = enemy.receiveDamage(this._pierceAttackObj);
            } else if (enemy.pierceable) {
                enemy.hp = 0;
                enemyDied = true;
            }
            fatalSource = 'momentum3';
        }
        // --- PRIORIDAD 4: Daño al jugador por colisión física ---
        else if (!player.isInvincible && !isInAttackRange) {
          if (!enemy.state) enemy.state = {}; 
          if (now - (enemy.state.lastAttackTime || 0) >= 250) {
            enemy.state.lastAttackTime = now;
            player.takeEnemyDamage();

            const effect = enemy.customConfig?.ambitious?.attack?.effect;
            if (effect === 'slow') {
                player.slowTimer = (player.slowTimer || 0) + 1500;
            } else if (effect === 'push') {
                const angle = Math.atan2(player.py - enemy.y, player.px - enemy.x);
                player.vx += Math.cos(angle) * 300;
                player.vy += Math.sin(angle) * 300;
            } else if (effect === 'noJump') {
                player.noJumpTimer = (player.noJumpTimer || 0) + 2000;
            }
          }
        }

        if (enemyDied) {
          if (typeof enemy.kill === 'function') enemy.kill(fatalSource);
          this._onEnemyDied(enemy);
          this.enemies.splice(i, 1);
        }
      }
    }
  }

  getWallEnemyLines() {
    const lines = [];
    for (const enemy of this.enemies) {
      if (!enemy.isWall) continue;
      const r = enemy.radius || 12;
      lines.push({ start: { x: enemy.x - r, y: enemy.y - r }, end: { x: enemy.x + r, y: enemy.y - r }, thickness: 4 });
      lines.push({ start: { x: enemy.x + r, y: enemy.y - r }, end: { x: enemy.x + r, y: enemy.y + r }, thickness: 4 });
      lines.push({ start: { x: enemy.x + r, y: enemy.y + r }, end: { x: enemy.x - r, y: enemy.y + r }, thickness: 4 });
      lines.push({ start: { x: enemy.x - r, y: enemy.y + r }, end: { x: enemy.x - r, y: enemy.y - r }, thickness: 4 });
    }
    return lines;
  }

  cleanupDead() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].hp <= 0) {
        this._onEnemyDied(this.enemies[i]);
        this.enemies.splice(i, 1);
      }
    }
  }

  checkSolidCollision(player, playerRadius = 12) {
    let collided = false;
    for (const enemy of this.enemies) {
      if (enemy.isPhantom) continue;
      const eRadius = enemy.radius || 12;
      const dx = player.px - enemy.x;
      const dy = player.py - enemy.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = playerRadius + eRadius;
      
      if (distance < minDistance && distance > 0) {
        collided = true;
        const overlap = minDistance - distance;
        
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

    this._slamAttackObj.type = isHighSpeed ? 'slam3' : 'slam';
    this._slamAttackObj.baseDamage = damage;
    this._slamAttackObj.now = now;
    this._slamAttackObj.radius = radius;

    this._wallAttackObj.type = 'wallCrash';
    this._wallAttackObj.baseDamage = wallDamage;
    this._wallAttackObj.now = now;
    this._wallAttackObj.radius = radius;

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
        if (typeof enemy.kill === 'function') enemy.kill(this._slamAttackObj.type);
        this._onEnemyDied(enemy);
        this.enemies.splice(i, 1);
        continue;
      }

      if (isHighSpeed && applyKnockback && dist > 0) {
        const oldX = enemy.x;
        const oldY = enemy.y;
        
        const dirX = dx / dist;
        const dirY = dy / dist;
        enemy.x += dirX * SLAM.KNOCKBACK_DIST;
        enemy.y += dirY * SLAM.KNOCKBACK_DIST;

        const lines = this.scene.currentMap?.lines || [];
        let hitWall = false;

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
            if (typeof enemy.kill === 'function') enemy.kill(this._wallAttackObj.type);
            this._onEnemyDied(enemy);
            this.enemies.splice(i, 1);
          }
        }
      }
    }
  }

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
    this._fillType = null;
    for (const enemy of this.spawnList) enemy.active = false;
  }
  
  getEnemies() { return this.enemies; }
}