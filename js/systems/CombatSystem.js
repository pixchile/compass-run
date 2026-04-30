// js/systems/CombatSystem.js

import { SLAM } from '../constants.js';

export default class CombatSystem {
  constructor(manager, scene) {
    this.manager = manager;
    this.scene = scene;
    
    this.damagedThisDash = new Set();
    this.wasDashing = false;

    // Objetos Zero-Allocation
    this._dashAttackObj   = { type: 'dash', baseDamage: 0, now: 0, radius: 0 };
    this._pierceAttackObj = { type: 'momentum3', baseDamage: 0, now: 0, radius: 0 };
    this._slamAttackObj   = { type: 'slam', baseDamage: 0, now: 0, radius: 0 };
    this._wallAttackObj   = { type: 'wallCrash', baseDamage: 0, now: 0, radius: 0 };
    
    this._p1 = { x: 0, y: 0 };
    this._p2 = { x: 0, y: 0 };
    this._colResult = { collided: false, hitX: 0, hitY: 0 };
  }

  processPlayerInteractions(player, delta, now, momentumSystem) {
    if (player.dashing && !this.wasDashing) this.damagedThisDash.clear();
    this.wasDashing = player.dashing;

    const attackPayload = player.getCurrentAttackPayload(momentumSystem.level);
    const enemies = this.manager.enemies;
    const auraEmitters = enemies.filter(e => e.invulnerableAura && e.hp > 0);

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (this._processSingleInteraction(enemy, player, attackPayload, auraEmitters, now, momentumSystem)) {
        this.manager.killEnemy(i, enemy, attackPayload?.type || 'any');
      }
    }
  }

  _processSingleInteraction(enemy, player, attackPayload, auraEmitters, now, momentumSystem) {
    const playerRadius = 12;
    const currentSpeed = Math.hypot(player.vx, player.vy);

    const distToPlayer = Math.hypot(enemy.x - player.px, enemy.y - player.py);
    const isInAttackRange = attackPayload && (distToPlayer <= attackPayload.radius);
    
    let isColliding = false;
    if (typeof enemy.collidesWith === 'function') {
        isColliding = enemy.collidesWith(player.px, player.py, playerRadius);
    } else {
        isColliding = distToPlayer < (enemy.radius || 12) + playerRadius;
    }

    if (!isInAttackRange && !isColliding) return false;

    if (auraEmitters.some(e => e !== enemy && Math.hypot(e.x - enemy.x, e.y - enemy.y) < 200)) return false;

    if (enemy.evade && player.dashing) {
        const angle = Math.random() * Math.PI * 2;
        enemy.x += Math.cos(angle) * 150;
        enemy.y += Math.sin(angle) * 150;
        return false;
    }

    let enemyDied = false;

    if (attackPayload && isInAttackRange) {
        enemyDied = this._damageEnemy(enemy, attackPayload.type, attackPayload.baseDamage, attackPayload.radius, now);
    } 
    else if (!player.isInvincible && !isInAttackRange) {
        this._applyDamageToPlayer(enemy, player, now);
    }

    return enemyDied;
  }

  _damageEnemy(enemy, type, damage, radius, now) {
    if (typeof enemy.receiveDamage === 'function') {
        return enemy.receiveDamage({ type, baseDamage: damage, radius, now });
    }
    enemy.hp = (enemy.hp || 1) - damage;
    return enemy.hp <= 0;
  }

  _applyDamageToPlayer(enemy, player, now) {
      if (!enemy.state) enemy.state = {}; 
      if (now - (enemy.state.lastAttackTime || 0) < 250) return;

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

  processSlam(slamData, now) {
    const { x, y, isHighSpeed, applyKnockback } = slamData;

    this._slamAttackObj.type = isHighSpeed ? 'slam3' : 'slam';
    this._slamAttackObj.baseDamage = SLAM.DAMAGE;
    this._slamAttackObj.now = now;
    this._slamAttackObj.radius = SLAM.RADIUS;

    const enemies = this.manager.enemies;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      const dx = enemy.x - x, dy = enemy.y - y;
      const dist = Math.hypot(dx, dy);
      
      if (dist > SLAM.RADIUS) continue;

      if (this._damageEnemy(enemy, this._slamAttackObj.type, SLAM.DAMAGE, SLAM.RADIUS, now)) {
        this.manager.killEnemy(i, enemy, this._slamAttackObj.type);
        continue;
      }

      if (applyKnockback && dist > 0) {
        if (this._applySlamKnockback(enemy, dx, dy, dist, now)) {
            this.manager.killEnemy(i, enemy, 'wallCrash');
        }
      }
    }
  }

  _applySlamKnockback(enemy, dx, dy, dist, now) {
      const oldX = enemy.x, oldY = enemy.y;
      enemy.x += (dx / dist) * SLAM.KNOCKBACK_DIST;
      enemy.y += (dy / dist) * SLAM.KNOCKBACK_DIST;

      let hitWall = false;
      this._p1.x = oldX; this._p1.y = oldY;
      this._p2.x = enemy.x; this._p2.y = enemy.y;

      const lines = this.scene.currentMap?.lines || [];
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
          this._wallAttackObj.type = 'wallCrash';
          this._wallAttackObj.baseDamage = SLAM.WALL_COLLISION_DAMAGE;
          this._wallAttackObj.now = now;
          this._wallAttackObj.radius = SLAM.RADIUS;

          return this._damageEnemy(enemy, 'wallCrash', SLAM.WALL_COLLISION_DAMAGE, SLAM.RADIUS, now);
      }
      return false; 
  }

  checkSolidCollision(player, playerRadius = 12) {
    let collided = false;
    for (const enemy of this.manager.enemies) {
      if (enemy.isPhantom) continue;
      const minDistance = playerRadius + (enemy.radius || 12);
      const dx = player.px - enemy.x, dy = player.py - enemy.y;
      const distance = Math.hypot(dx, dy);
      
      if (distance < minDistance && distance > 0) {
        collided = true;
        const pushScale = (minDistance - distance) / distance;
        player.px += dx * pushScale;
        player.py += dy * pushScale;
        
        const pushDirX = dx / distance, pushDirY = dy / distance;
        const velDot = player.vx * pushDirX + player.vy * pushDirY;
        if (velDot < 0) {
          player.vx -= pushDirX * velDot * 0.5;
          player.vy -= pushDirY * velDot * 0.5;
        }
      }
    }
    return collided;
  }

  getWallEnemyLines() {
    return this.manager.enemies.filter(e => e.isWall).flatMap(enemy => {
      const r = enemy.radius || 12;
      return [
        { start: { x: enemy.x - r, y: enemy.y - r }, end: { x: enemy.x + r, y: enemy.y - r }, thickness: 4 },
        { start: { x: enemy.x + r, y: enemy.y - r }, end: { x: enemy.x + r, y: enemy.y + r }, thickness: 4 },
        { start: { x: enemy.x + r, y: enemy.y + r }, end: { x: enemy.x - r, y: enemy.y + r }, thickness: 4 },
        { start: { x: enemy.x - r, y: enemy.y + r }, end: { x: enemy.x - r, y: enemy.y - r }, thickness: 4 }
      ];
    });
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

  clear() {
    this.damagedThisDash.clear();
    this.wasDashing = false;
  }
}