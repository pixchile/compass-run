// js/systems/ItemEffects.js
// Efectos activos de items terminados.
// Cada función recibe (scene, player, momentum, enemyManager, extra)

import { WALL_JUMP, SLAM } from '../constants.js';

export default class ItemEffects {
  constructor(scene) {
    this.scene = scene;

    // ── BBB: Modo Demonio ────────────────────────────────────
    this.bbbCooldown   = 0;       // ms hasta próxima disponibilidad
    this.bbbReady      = false;   // próximo dash aéreo activa demonio
    this.bbbActive     = false;
    this.bbbTimer      = 0;

    // ── BBC: Rebote ──────────────────────────────────────────
    this.bbcBounces     = 0;   // cadena actual de rebotes
    this.bbcActive      = false; // si estamos en cadena de rebote
    this._bbcLastJumped = null; // enemigo del que se acaba de saltar (evitar re-stick)

    // ── DBB: Paciencia ───────────────────────────────────────
    this.dbbIdleTimer   = 0;
    this.dbbBonus       = 0;       // % acumulado (0–999)
    this.dbbReady       = false;
    this.dbbCooldown    = 0;       // ms restantes antes de volver a acumular
    this.dbbLastMult    = 1;       // último multiplicador consumido (para HUD)
    this._dbbActiveMult = 1;       // multiplicador cacheado para el dash/slam actual

    // ── Estadísticas de items ────────────────────────────────
    this.statAADExplosions  = 0;   // veces que AAD explotó
    this.statADDMitigated   = 0;   // daño real mitigado por ADD
    this.statCADHealed      = 0;   // HP real curado por CAD

    // ── DDD: Fénix ───────────────────────────────────────────
    this.dddCD       = 0;
    this.dddDecaying = false;
    this.dddPeakHp   = 100;

    // ── AAB: Gancho ─────────────────────────────────────────
    this.aabGrabbed    = null;    // referencia al enemigo agarrado
    this.aabTimer      = 0;

    // ── DAB: Maestría ───────────────────────────────────────
    // Sin estado, se aplica en physics
  }

  has(id) {
    return this.scene.shopSystem?.hasEffect(id) || false;
  }

  // ─── Update general (llamado cada frame) ────────────────────
  update(delta, player, momentum, enemyManager) {
    if (this.has('BBB')) this._updateBBB(delta, player, momentum);
    // BBC no requiere update frame-a-frame
    if (this.has('DBB')) this._updateDBB(delta, player, enemyManager);
    if (this.has('DDD')) this._updateDDD(delta, player);
    if (this.has('AAB')) this._updateAAB(delta, player);
    if (this.has('CCB') && this.scene.rewardSystem) {
      // Velocidad límite = créditos actuales (cap 3000)
      const credits = this.scene.rewardSystem.credits;
      const cap = Math.min(3000, credits);
      momentum._maxSpeedOverride = cap;
    }
  }

  // ─── BBB: Modo Demonio ───────────────────────────────────────
  _updateBBB(delta, player, momentum) {
    this.bbbCooldown = Math.max(0, this.bbbCooldown - delta);
    if (this.bbbCooldown <= 0 && !this.bbbReady && !this.bbbActive) {
      this.bbbReady = true;
    }
    if (this.bbbActive) {
      this.bbbTimer -= delta;
      if (this.bbbTimer <= 0) this._deactivateDemon(player, momentum);
    }
  }

  onAerialDash(player, momentum) {
    if (!this.has('BBB') || !this.bbbReady) return;
    this.bbbReady  = false;
    this.bbbActive = true;
    this.bbbTimer  = 2000;
    this.bbbCooldown = 30000;
    momentum._maxSpeedOverride = Math.max(momentum._maxSpeedOverride || 0, 1000);
    player._demonMode = true;
  }

  onEnemyKilledInDemon() {
    if (this.bbbActive) this.bbbTimer = 2000; // reiniciar duración
  }

  _deactivateDemon(player, momentum) {
    this.bbbActive = false;
    player._demonMode = false;
    if (momentum._maxSpeedOverride === 1000) momentum._maxSpeedOverride = null;
  }

  // ─── BBC: Rebote (Stick + Jump-off) ──────────────────────────
  // Al saltar sobre un enemigo, el jugador se pega a el.
  // Desde ahi, Space + direccion salta hacia otro enemigo.
  // El danio se aplica al saltar, no al pegarse.

  /**
   * Jugador salto y colisiono con un enemigo — pegarse a el.
   * Sin danio. Congela al enemigo. Inicia ventana de 1s para saltar.
   */
  onStickEnemy(player, enemy, now, momentumSystem) {
    if (!this.has('BBC')) return false;

    // No re-pegarse al enemigo del que se acaba de saltar
    if (enemy === this._bbcLastJumped) return false;
    this._bbcLastJumped = null;

    // Snap al centro del enemigo, encima
    player.px = enemy.x;
    player.py = enemy.y - (enemy.radius || 12) - 8;
    player.vx = 0; player.vy = 0;
    player.jumping = false;
    player.combat.hasSlammedThisJump = false;

    player._stickState = true;
    player._stickTimer = 1000;
    player._stickEnemy = enemy;

    // Congelar enemigo mientras el jugador esta pegado
    enemy._frozen = true;
    enemy._frozenVx = enemy.vx || 0;
    enemy._frozenVy = enemy.vy || 0;

    if (!this.bbcActive) {
      this.bbcBounces = 1;
      this.bbcActive = true;
    } else {
      this.bbcBounces++;
    }

    // Visual
    if (this.scene.renderer?.addSlamEffect) {
      this.scene.renderer.addSlamEffect(player.px, player.py, false);
    }

    return { sticked: true };
  }

  /**
   * Jugador presiono Space + direccion durante stick.
   * Aplica danio al enemigo actual, lo descongela, lanza al jugador.
   */
  onJumpOffEnemy(player, enemy, dirX, dirY, momentumSystem) {
    if (!this.has('BBC') || !enemy) return;

    // Recordar para no re-pegarse al mismo enemigo
    this._bbcLastJumped = enemy;

    // Danio al saltar: 5 base + 5 por cada rebote en cadena
    const baseDmg = 5 + this.bbcBounces * 5;
    const momentumMult = momentumSystem?.getDamageMultiplier?.() ?? 1;
    const bonusMult    = 1 + (player.damageMultiplierBonus || 0);
    const finalDamage  = baseDmg * momentumMult * bonusMult;

    const hpBefore = enemy.hp;
    const now = Date.now();
    enemy.receiveDamage
      ? enemy.receiveDamage({ type: 'stomp', baseDamage: finalDamage, now })
      : (() => { enemy.hp = (enemy.hp || 1) - finalDamage; })();
    const actualDamage = hpBefore - enemy.hp;
    if (actualDamage > 0) {
      this.scene.spawnDamageNumber?.(enemy.x, enemy.y, actualDamage, 'enemyDamage');
    }

    // Descongelar enemigo
    enemy._frozen = false;

    // Lanzar jugador en la direccion elegida (misma distancia que wall jump segun nivel)
    const lv = momentumSystem?.level ?? 1;
    const jumpSpd = WALL_JUMP.SPEEDS[lv] || 400;
    player.jumping = true;
    player.jumpT   = 0;
    player.jumpDur = 400;
    player.jumpHMax = 0;
    player.jumpLv  = 1;
    player.jumpVx  = dirX * jumpSpd;
    player.jumpVy  = dirY * jumpSpd;
    player.vx = player.jumpVx;
    player.vy = player.jumpVy;
    player.combat.hasSlammedThisJump = false;
    player.facing = Math.atan2(dirY, dirX);

    // Visual
    if (this.scene.renderer?.addSlamEffect) {
      this.scene.renderer.addSlamEffect(enemy.x, enemy.y, false);
    }
  }

  /** Stick expiro sin saltar — descongelar enemigo, resetear cadena */
  onStickExpired(enemy) {
    if (enemy) enemy._frozen = false;
    this._bbcLastJumped = null;
    this.bbcBounces = 0;
    this.bbcActive  = false;
  }

  /** Llamado cuando el jugador aterriza — resetear cadena si no esta pegado ni en muro */
  onPlayerLanded() {
    this._bbcLastJumped = null;
    const player = this.scene?.player;
    if (this.bbcActive && !player?._stickState && !player?.wallJump?.wallStick) {
      this.bbcBounces = 0;
      this.bbcActive  = false;
    }
  }

  // ─── DBB: Paciencia ─────────────────────────────────────────
  _updateDBB(delta, player, enemyManager) {
    // Resetear multiplicador cacheado cuando termina el dash/slam
    if (!player.dashing && !player.combat?.activeSlam) {
      this._dbbActiveMult = 1;
    }

    // Si está en CD (recibió daño o infligió recientemente), contar hacia abajo
    if (this.dbbCooldown > 0) {
      this.dbbCooldown = Math.max(0, this.dbbCooldown - delta);
      this.dbbIdleTimer = 0;
      this.dbbBonus     = 0;
      this.dbbReady     = false;
      return;
    }

    const idle = (player._lastDamageTime || 0) < Date.now() - 5000 &&
                 (player._lastInflictTime || 0) < Date.now() - 5000;
    if (idle) {
      this.dbbIdleTimer += delta;
      this.dbbBonus = Math.min(999, this.dbbIdleTimer / 1000 * 100);
      this.dbbReady = true;
    } else {
      this.dbbIdleTimer = 0;
      this.dbbBonus     = 0;
      this.dbbReady     = false;
    }
  }

  /** Llamado cuando el jugador recibe daño — activa CD de Paciencia */
  onPlayerTookDamage() {
    if (!this.has('DBB')) return;
    this.dbbCooldown  = 5000;   // 5s de CD
    this.dbbIdleTimer = 0;
    this.dbbBonus     = 0;
    this.dbbReady     = false;
  }

  getDashDamageMultiplier(player) {
    if (!this.has('DBB')) return 1;

    // Si ya hay un multiplicador activo para este dash/slam, devolverlo
    if (this._dbbActiveMult > 1) return this._dbbActiveMult;

    if (!this.dbbReady) return 1;

    const mult = 1 + this.dbbBonus / 100;
    this._dbbActiveMult = mult;   // cachear para todo el dash/slam
    this.dbbLastMult    = mult;   // recordar para el HUD
    this.dbbIdleTimer   = 0;
    this.dbbBonus       = 0;
    this.dbbReady       = false;
    this.dbbCooldown    = 5000;
    return mult;
  }

  // ─── DDD: Fénix ─────────────────────────────────────────────
  _updateDDD(delta, player) {
    this.dddCD = Math.max(0, this.dddCD - delta);

    // Si está en fase de descenso post-activación, bajar HP gradualmente hasta 10
    if (this.dddDecaying && player.health.hp > 10) {
      const rate = (this.dddPeakHp - 10) / 3000;   // de maxHp a 10 en 3000ms
      player.health.hp = Math.max(10, player.health.hp - rate * delta);
      if (player.health.hp <= 10) {
        player.health.hp = 10;
        this.dddDecaying = false;
      }
    }
  }

  onLethalDamage(player) {
    if (!this.has('DDD') || this.dddCD > 0) return false;

    // +10 HP máximo permanente
    player.health.maxHp = (player.health.maxHp || 100) + 10;

    // Revivir al máximo actual
    player.health.hp    = player.health.maxHp;
    this.dddPeakHp      = player.health.maxHp;

    // Iniciar descenso gradual a 10 HP en 3s
    this.dddDecaying    = true;

    // CD arranca inmediatamente
    this.dddCD = 60000;

    return true;
  }

  // ─── AAA: Berserker ─────────────────────────────────────────
  getAAAMultiplier(player) {
    if (!this.has('AAA')) return 1;
    const hp = player.health.hp || 0;
    const missing = Math.max(0, 100 - hp);
    return 1 + Math.min(1, missing / 75); // max bonus at 25 HP
  }

  getAAACost(player) {
    if (!this.has('AAA')) return 0;
    return (player.health.hp || 0) >= 25 ? 3 : 0;
  }

  // ─── ADD: Amortiguador ───────────────────────────────────────
  getADDDamageReduction() {
    return this.has('ADD') ? 10 : 0;
  }

  // ─── AAD: Explosivo ──────────────────────────────────────────
  onEnemyDied(enemy, enemyManager) {
    if (!this.has('AAD') || Math.random() > 0.25) return;
    const x = enemy.x, y = enemy.y;
    const enemies = enemyManager.enemies;
    let exploded = false;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (Math.hypot(e.x - x, e.y - y) <= 120) {
        if (e.receiveDamage) e.receiveDamage({ type: 'explosion', baseDamage: 30, now: this.scene?.time?.now ?? Date.now() });
        exploded = true;
      }
    }
    if (exploded) this.statAADExplosions++;
    if (this.scene.renderer?.addSlamEffect) this.scene.renderer.addSlamEffect(x, y, false);
  }

  // ─── DDC: Sand King ──────────────────────────────────────────
  applySandKingBonus(slamX, slamY, baseDamage, enemyManager, now) {
    if (!this.has('DDC')) return;
    const radius = SLAM.RADIUS * SLAM.SANDKING_RADIUS_MULT;
    const enemies = enemyManager.enemies;
    let count = 0;
    const hits = [];
    for (const e of enemies) {
      if (Math.hypot(e.x - slamX, e.y - slamY) <= radius) { hits.push(e); count++; }
    }
    const bonus = baseDamage + count * 3;
    const sandNow = (now ?? this.scene?.time?.now ?? Date.now()) + 30;
    for (let i = hits.length - 1; i >= 0; i--) {
      const e = hits[i];
      if (e.receiveDamage) e.receiveDamage({ type: 'slam3', baseDamage: bonus, now: sandNow });
    }
  }

  // ─── ACC: Propulsor ──────────────────────────────────────────
  getDashSpeedMult()     { return this.has('ACC') ? 2.0 : 1.0; }
  getDashDistanceMult()  { return this.has('ACC') ? 2.0 : 1.0; }

  // ─── CAD: Vampiro ────────────────────────────────────────────
  onDashHit(player, momentum) {
    if (!this.has('CAD')) return;
    if (this._cadHealedThisDash) return;
    this._cadHealedThisDash = true;
    const heal = momentum.level;
    const before = player.health.hp;
    player.health.hp = Math.min(player.health.maxHp || 100, (player.health.hp || 0) + heal);
    this.statCADHealed += player.health.hp - before;
  }

  // ─── ABC: Brújula Activa ─────────────────────────────────────
  onDashInCompassDir(player, momentum, isPrimary) {
    if (!this.has('ABC')) return;
    const stacks = isPrimary ? 10 : 20;
    momentum.addStacks(stacks);
  }

  // ─── AAB: Gancho ─────────────────────────────────────────────
  _updateAAB(delta, player) {
    if (this._aabReleaseBlock > 0) this._aabReleaseBlock -= delta;
    if (!this.aabGrabbed) return;
    this.aabTimer -= delta;
    this.aabGrabbed.x = player.px + Math.cos(player.facing) * 30;
    this.aabGrabbed.y = player.py + Math.sin(player.facing) * 30;
    if (this.aabTimer <= 0) this._releaseGrab();
  }

  tryGrab(enemy, player) {
    if (!this.has('AAB') || this.aabGrabbed) return false;
    if (enemy === this.aabLastReleased && this._aabReleaseBlock > 0) return false;
    this.aabGrabbed = enemy;
    this.aabTimer   = 4000;
    enemy.isGrabbed = true;
    enemy.isPhantom = true;
    return true;
  }

  onDashWhileGrabbing(player, dashDirX, dashDirY, dashSpeed) {
    if (!this.aabGrabbed) return false;
    const enemy = this.aabGrabbed;
    this.aabLastReleased = enemy;
    this._aabReleaseBlock = 800;
    this._releaseGrab();

    enemy._projectileVx    = dashDirX * dashSpeed;
    enemy._projectileVy    = dashDirY * dashSpeed;
    enemy._projectileTimer = 800;
    enemy.isGrabbed        = false;
    enemy.isPhantom        = false;
    return true;
  }

  _releaseGrab() {
    if (!this.aabGrabbed) return;
    this.aabGrabbed.isGrabbed = false;
    this.aabGrabbed.isPhantom = false;
    this.aabGrabbed = null;
  }

  // ─── BCD: Equilibrio ─────────────────────────────────────────
  onDerape(momentum) {
    if (!this.has('BCD')) return;
    const lv = momentum.level;
    if (lv === 3) {
      // Drenar hasta nivel 2
      while (momentum.level > 2 && momentum.stacks > 0) momentum.stacks--;
    } else if (lv === 1) {
      // Ganar hasta nivel 2
      while (momentum.level < 2 && momentum.stacks < 90) momentum.stacks++;
    }
  }

  // ─── CCC: Incendiario ────────────────────────────────────────
  // Llamado desde Player cuando hay derrapaje con CCC equipado.
  // Crea una zona de daño temporal en currentMap.zones.
  onSkid(x, y) {
    if (!this.has('CCC')) return;
    const R = 25;
    const zones = this.scene.currentMap?.zones;
    if (!zones) return;
    zones.push({
      type: 'damage_zone',
      damagePerSec: 65,
      timeLeft: 15000,
      geometry: { bbox: { x: x - R, y: y - R, w: R * 2, h: R * 2 } },
      _isFire: true,
    });
  }

  // ─── CCB: velocidad = créditos (aplicado en update) ──────────
  // ya está en update()

  // ─── Reset ───────────────────────────────────────────────────
  reset() {
    this.bbbCooldown = 0; this.bbbReady = false; this.bbbActive = false; this.bbbTimer = 0;
    this.bbcBounces = 0; this.bbcActive = false; this._bbcLastJumped = null;
    this.dbbIdleTimer = 0; this.dbbBonus = 0; this.dbbReady = false; this.dbbCooldown = 0; this.dbbLastMult = 1; this._dbbActiveMult = 1;
    this.dddCD = 0; this.dddDecaying = false; this.dddPeakHp = 100;
    this.aabGrabbed = null; this.aabTimer = 0; this.aabLastReleased = null; this._aabReleaseBlock = 0;
    this.statAADExplosions = 0; this.statADDMitigated = 0; this.statCADHealed = 0;
  }
}
