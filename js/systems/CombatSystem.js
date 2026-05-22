// js/systems/CombatSystem.js

import { SLAM, MOMENTUM3_HIT_COOLDOWN, DASH_PIERCE_BASE, ENEMY_ATTACK } from '../constants.js';

export default class CombatSystem {
  constructor(manager, scene) {
    this.manager = manager;
    this.scene = scene;
    
    this.damagedThisDash = new Set();
    this._dashPierceCount = 0;
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
    const fx = this.manager.scene?.itemEffects;

    const dashJustStarted = player.dashing && !this.wasDashing;
    if (dashJustStarted) {
      this.damagedThisDash.clear();
      this._dashPierceCount = 0;
      if (fx) { fx.lockGGGForAttack(); }
    }

    // BBC: si el jugador aterrizó (jumping pasó de true a false) sin rebotar → resetear cadena
    const wasJumping = this.wasDashingJumping ?? false;
    const isJumping  = player.jumping;
    if (wasJumping && !isJumping && fx) fx.onPlayerLanded();
    this.wasDashingJumping = isJumping;

    this.wasDashing = player.dashing;

    const attackPayload = player.getCurrentAttackPayload(momentumSystem.level);

    // AAG: One-Two — record base damage on dash start
    if (dashJustStarted && attackPayload) {
      fx?.onDashStarted(attackPayload.baseDamage);
    }
    const enemies = this.manager.enemies;
    const auraEmitters = enemies.filter(e => e.invulnerableAura && e.hp > 0);

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];

      // El boss entity lo maneja BossManager directamente
      if (enemy._isBossEntity) continue;
      // BossAttackEnemies solo dañan al player — no reciben daño del player
      if (enemy._isBossAttack) {
        if (!player.isInvincible && !player._stickState) {
          this._applyDamageToPlayer(enemy, player, now);
        }
        continue;
      }

      const distToPlayer = Math.hypot(enemy.x - player.px, enemy.y - player.py);
      const inAttackRange = attackPayload && distToPlayer <= attackPayload.radius;
      const died = this._processSingleInteraction(enemy, player, attackPayload, auraEmitters, now, momentumSystem);
      if (died) {
        // AAD: explosión al morir
        fx?.onEnemyDied(enemy, this.manager);
        // BBB: matar en Modo Demonio reinicia duración
        fx?.onEnemyKilledInDemon();
        this.manager.killEnemy(i, enemy, attackPayload?.type || 'any');
      } else if (attackPayload && player.dashing && inAttackRange) {
        // AAB: intentar agarrar al primer enemigo golpeado
        fx?.tryGrab(enemy, player);
      }
    }
  }

  _processSingleInteraction(enemy, player, attackPayload, auraEmitters, now, momentumSystem) {
    const playerRadius = 12;
    const currentSpeed = Math.hypot(player.vx, player.vy);

    const distToPlayer = Math.hypot(enemy.x - player.px, enemy.y - player.py);
    const isInAttackRange = attackPayload && (distToPlayer <= attackPayload.radius);
    
    const contactGrace = (enemy.customConfig?.ambitious?.attack?.type || 'contact') === 'contact' ? 10 : 0;
    let isColliding = false;
    if (typeof enemy.collidesWith === 'function') {
        isColliding = enemy.collidesWith(player.px, player.py, playerRadius + contactGrace);
    } else {
        isColliding = distToPlayer < (enemy.radius || 12) + playerRadius + contactGrace;
    }

    if (!isInAttackRange && !isColliding) return false;

    if (auraEmitters.some(e => e !== enemy && Math.hypot(e.x - enemy.x, e.y - enemy.y) < 200)) return false;

    if (enemy.evade && player.dashing) {
        const angle = Math.random() * Math.PI * 2;
        enemy.x += Math.cos(angle) * 150;
        enemy.y += Math.sin(angle) * 150;
        return false;
    }

    // BBC: Stick — jugador salta sobre un enemigo y se pega (30px grace)
    const fx2 = this.manager.scene?.itemEffects;
    const bbcDist = distToPlayer < (enemy.radius || 12) + playerRadius + 30;
    if (fx2?.has('BBC') && player.jumping && bbcDist && !player._stickState) {
      const result = fx2.onStickEnemy(player, enemy, now, momentumSystem);
      if (result) return false; // stick exitoso, sin danio
    }

    let enemyDied = false;

    if (attackPayload && isInAttackRange) {
        if (player.dashing && this.damagedThisDash.has(enemy)) return false;
        if (player.dashing) {
          const pierceMax = DASH_PIERCE_BASE + Math.max(0, Math.floor((currentSpeed - 500) / 100));
          if (this._dashPierceCount >= pierceMax) return false;
        }
        if (attackPayload.type === 'momentum3' && Date.now() - (enemy._lastMomentum3Hit || 0) < MOMENTUM3_HIT_COOLDOWN) return false;
        enemyDied = this._damageEnemy(enemy, attackPayload.type, attackPayload.baseDamage, attackPayload.radius, now, attackPayload.trueDamage || 0);
        if (attackPayload.type === 'momentum3') enemy._lastMomentum3Hit = Date.now();
        if (player.dashing) {
          this._dashPierceCount++;
          if (!enemyDied) this.damagedThisDash.add(enemy);
        }
    }
    else if (!player.isInvincible && !player.dashing && !isInAttackRange && !enemy.isGrabbed && !player._stickState) {
        this._applyDamageToPlayer(enemy, player, now);
    }

    return enemyDied;
  }

  _damageEnemy(enemy, type, damage, radius, now, trueDamage = 0) {
    if ((enemy.damageMultipliers?.[type] ?? 1) <= 0) return false;

    // AAG: One-Two — bonus damage on first enemy hit during bonus dash
    const aagBonus = (type === 'dash' || type === 'aerialDash' || type === 'wallJumpDash')
      ? (this.scene?.itemEffects?.consumeAAGBonus() || 0) : 0;
    const totalDamage = damage + aagBonus;

    if (totalDamage > 0) this.scene?.compass?.recordHitDamage(totalDamage);
    const hpBefore = enemy.hp;
    let died;
    if (typeof enemy.receiveDamage === 'function') {
        died = enemy.receiveDamage({ type, baseDamage: totalDamage, radius, now });
    } else {
        enemy.hp = (enemy.hp || 1) - totalDamage;
        died = enemy.hp <= 0;
    }
    const actualDamage = hpBefore - enemy.hp;
    if (actualDamage > 0) {
        this.manager.addEvent('enemyHit', enemy.x, enemy.y, enemy.type, { damage: actualDamage, sourceId: enemy.id });
        const colorKey = (type === 'slam' || type === 'slam3') ? 'slamDamage' : 'enemyDamage';
        this.scene?.spawnDamageNumber?.(enemy.x, enemy.y, actualDamage, colorKey);
        const p = this.scene?.player;
        if (p) this.scene?.itemEffects?.applyGGGCreditEffect(p.px, p.py);
    }

    // True damage — bypasses enemy type multipliers, always deals flat amount
    if (trueDamage > 0) {
      if (!died) {
        enemy.hp = (enemy.hp || 1) - trueDamage;
        if (enemy.hp <= 0) died = true;
      }
      this.scene?.spawnDamageNumber?.(enemy.x, enemy.y, trueDamage, 'trueDamage');
    }

    return died;
  }

  _applyDamageToPlayer(enemy, player, now) {
      if (player._undetectable || player._inShop) return;
      if (!enemy.state) enemy.state = {};

      // BossAttackEnemy: usa su propio damage y cooldown de 500ms
      if (enemy._isBossAttack) {
          if (now - (enemy.state.lastAttackTime || 0) < 500) return;
          const dist = Math.hypot(player.px - enemy.x, player.py - enemy.y);
          if (dist > (enemy.radius || 12) + 12) return;
          enemy.state.lastAttackTime = now;
          player.takeEnemyDamage(enemy._attackDamage ?? 10);
          if (!enemy._lingering) enemy.hp = 0; // despawn al tocar
          return;
      }

      const cooldown = enemy.customConfig?.ambitious?.attack?.cooldown ?? 100;
      if (now - (enemy.state.lastAttackTime || 0) < cooldown) return;

      // LOS: si no ve a traves de muros, verificar que no haya pared en medio
      if (!enemy.customConfig?.ambitious?.seeThroughWalls) {
        const lines = this.scene?.currentMap?.lines;
        if (lines && lines.length > 0) {
          const dist = Math.hypot(player.px - enemy.x, player.py - enemy.y);
          if (dist < 600 && !this.scene.hasLineOfSight(enemy.x, enemy.y, player.px, player.py, lines)) {
            return;
          }
        }
      }

      // Attack type gate
      const attackType = enemy.customConfig?.ambitious?.attack?.type || 'contact';
      if (attackType === 'shoot') return; // ranged only, no contact damage
      if (attackType === 'dash' && enemy._dash?.phase !== 'dash') return; // only during dash burst

      enemy.state.lastAttackTime = now;
      const dmgMult = enemy.customConfig?.ambitious?.attack?.damage ?? 1;
      player.takeEnemyDamage(dmgMult);

      const attackCfg = enemy.customConfig?.ambitious?.attack;
      const effect = attackCfg?.effect;
      const effects = attackCfg?.effects || [];
      const has = (name) => effect === name || effects.includes(name);

      if (has('slow') && !player._demonMode) {
          player.slowTimer = Math.max(player.slowTimer || 0, ENEMY_ATTACK.SLOW_DURATION);
      }
      if (has('push')) {
          const angle = Math.atan2(player.py - enemy.y, player.px - enemy.x);
          player.vx += Math.cos(angle) * ENEMY_ATTACK.PUSH_FORCE;
          player.vy += Math.sin(angle) * ENEMY_ATTACK.PUSH_FORCE;
      }
      if (has('noJump')) {
          player.noJumpTimer = Math.max(player.noJumpTimer || 0, ENEMY_ATTACK.NO_JUMP_DURATION);
      }
      if (has('flip')) {
          const fdx = enemy.x - player.px;
          const fdy = enemy.y - player.py;
          const fdist = Math.hypot(fdx, fdy);
          if (fdist > 0.01) {
              const fdirX = fdx / fdist;
              const fdirY = fdy / fdist;
              player.vx = fdirX * ENEMY_ATTACK.FLIP_HORIZONTAL_FORCE;
              player.vy = fdirY * ENEMY_ATTACK.FLIP_HORIZONTAL_FORCE - ENEMY_ATTACK.FLIP_UPWARD_FORCE;
          }
          player.jumping = true;
          player.jumpT = 0;
          player.jumpDur = 800;
          player.jumpVx = player.vx;
          player.jumpVy = player.vy;
          player.noJumpTimer = Math.max(player.noJumpTimer || 0, ENEMY_ATTACK.FLIP_STUN_DURATION);
          player.dashCD = Math.max(player.dashCD || 0, ENEMY_ATTACK.FLIP_STUN_DURATION);
          if (player.combat) player.combat.hasSlammedThisJump = false;
          // Beetle recoil: can't chase for 1s after flipping
          enemy._flipRecoil = 1000;
      }
  }

  processSlam(slamData, now, momentum) {
    const { x, y, isHighSpeed, applyKnockback } = slamData;
    const fx = this.manager.scene?.itemEffects;
    const player = this.manager.scene?.player;
    fx?.lockGGGForAttack();
    const isMomentum3 = (momentum?.level === 3);

    const hasSandKing = fx?.has('DDC');
    const slamRadius = hasSandKing ? SLAM.RADIUS * SLAM.SANDKING_RADIUS_MULT : SLAM.RADIUS;

    this._slamAttackObj.type = isHighSpeed ? 'slam3' : 'slam';
    this._slamAttackObj.baseDamage = SLAM.DAMAGE;
    this._slamAttackObj.now = now;
    this._slamAttackObj.radius = slamRadius;

    // DDC: Sand King — activa en momentum lvl 3
    if (isMomentum3) fx?.applySandKingBonus(x, y, SLAM.DAMAGE, this.manager, now);

    const enemies = this.manager.enemies;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      const dx = enemy.x - x, dy = enemy.y - y;
      const dist = Math.hypot(dx, dy);

      if (dist > slamRadius) continue;

      // True damage already applied via attack payload in processPlayerInteractions;
      // only pass it for the knockback wall crash (separate damage instance).
      if (this._damageEnemy(enemy, this._slamAttackObj.type, SLAM.DAMAGE, slamRadius, now, 0)) {
        fx?.onEnemyDied(enemy, this.manager);
        fx?.onEnemyKilledInDemon();
        this.manager.killEnemy(i, enemy, this._slamAttackObj.type);
        continue;
      }

      if (applyKnockback && dist > 0) {
        const knockTrueDmg = (player?.trueDamage || 0) * (fx?.getDBBTrueDamageMultiplier() ?? 1);
        if (this._applySlamKnockback(enemy, dx, dy, dist, now, knockTrueDmg)) {
            this.manager.killEnemy(i, enemy, 'wallCrash');
        }
      }
    }
  }

  _applySlamKnockback(enemy, dx, dy, dist, now, trueDamage = 0) {
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

          return this._damageEnemy(enemy, 'wallCrash', SLAM.WALL_COLLISION_DAMAGE, SLAM.RADIUS, now, trueDamage);
      }
      return false; 
  }

  checkSolidCollision(player, playerRadius = 12) {
    if (player._undetectable || player._inShop) return false;
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

  checkImpenetrableCollision(player, playerRadius = 12) {
    if (player._undetectable || player._inShop) return;
    for (const enemy of this.manager.enemies) {
      if (!enemy.impenetrable || enemy.isPhantom) continue;
      const r = enemy.radius || 12;
      const minDist = playerRadius + r;
      const dx = player.px - enemy.x;
      const dy = player.py - enemy.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist && dist > 0) {
        const push = (minDist - dist) / dist;
        player.px += dx * push;
        player.py += dy * push;
        const nx = dx / dist, ny = dy / dist;
        const velDot = player.vx * nx + player.vy * ny;
        if (velDot < 0) {
          player.vx -= nx * velDot;
          player.vy -= ny * velDot;
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

  clear() {
    this.damagedThisDash.clear();
    this.wasDashing = false;
  }
}