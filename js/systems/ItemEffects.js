// js/systems/ItemEffects.js
// Efectos activos de items terminados.
// Cada función recibe (scene, player, momentum, enemyManager, extra)

export default class ItemEffects {
  constructor(scene) {
    this.scene = scene;

    // ── BBB: Modo Demonio ────────────────────────────────────
    this.bbbCooldown   = 0;       // ms hasta próxima disponibilidad
    this.bbbReady      = false;   // próximo dash aéreo activa demonio
    this.bbbActive     = false;
    this.bbbTimer      = 0;

    // ── BBC: Rebote ──────────────────────────────────────────
    this.bbcCooldown   = 0;
    this.bbcReady      = false;
    this.bbcBounces    = 0;

    // ── DBB: Paciencia ───────────────────────────────────────
    this.dbbIdleTimer  = 0;
    this.dbbBonus      = 0;       // % acumulado (0–999)
    this.dbbReady      = false;

    // ── DDD: Fénix ───────────────────────────────────────────
    this.dddCD         = 0;
    this.dddLimit      = 100;     // límite actual de HP tras activación

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
    if (this.has('BBC')) this._updateBBC(delta);
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

  // ─── BBC: Rebote ────────────────────────────────────────────
  _updateBBC(delta) {
    this.bbcCooldown = Math.max(0, this.bbcCooldown - delta);
    if (this.bbcCooldown <= 0 && !this.bbcReady) this.bbcReady = true;
  }

  // Devuelve true si se debe rebotar
  onSlamHit(player, enemyManager, slamX, slamY) {
    if (!this.has('BBC') || !this.bbcReady) return false;
    const damage = 10 + this.bbcBounces * 10;
    if (damage >= 300) { this.bbcBounces = 0; this.bbcReady = false; this.bbcCooldown = 3000; return false; }

    // Daño extra a enemigos en el punto de slam
    const enemies = enemyManager.enemies;
    let hit = false;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (Math.hypot(e.x - slamX, e.y - slamY) <= 60) {
        if (e.receiveDamage) e.receiveDamage({ type: 'slam', baseDamage: damage, now: Date.now() });
        hit = true;
      }
    }
    if (hit) {
      this.bbcBounces++;
      // Rebotar al jugador (invertir vy)
      player.vy = -Math.abs(player.vy || 300);
      player.jumping = true;
      player.jumpT   = 0;
      player.jumpDur = player.jumpDur || 400;
      player.jumpVx  = player.vx;
      player.jumpVy  = player.vy;
      return true;
    }
    // No impactó — resetear cadena
    this.bbcBounces  = 0;
    this.bbcReady    = false;
    this.bbcCooldown = 3000;
    return false;
  }

  // ─── DBB: Paciencia ─────────────────────────────────────────
  _updateDBB(delta, player, enemyManager) {
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

  getDashDamageMultiplier(player) {
    if (!this.has('DBB') || !this.dbbReady) return 1;
    const mult = 1 + this.dbbBonus / 100;
    this.dbbIdleTimer = 0; this.dbbBonus = 0; this.dbbReady = false; // consumir
    return mult;
  }

  // ─── DDD: Fénix ─────────────────────────────────────────────
  _updateDDD(delta, player) {
    this.dddCD = Math.max(0, this.dddCD - delta);
    // Reducir límite de 100 a 10 continuamente mientras Fénix esté equipado
    this.dddLimit = Math.max(10, this.dddLimit - (90 / 3000) * delta);
  }

  onLethalDamage(player) {
    if (!this.has('DDD') || this.dddCD > 0) return false;
    // Subir maxHp permanentemente
    player.health.maxHp = (player.health.maxHp || 100) + 10;
    // Revivir con el límite actual (que ya habrá bajado a ~10)
    player.health.hp = this.dddLimit;
    // Reiniciar límite para que vuelva a bajar
    this.dddLimit = player.health.maxHp;
    this.dddCD    = 60000;
    return true;
  }

  // ─── AAA: Berserker ─────────────────────────────────────────
  getAAAMultiplier(player) {
    if (!this.has('AAA')) return 1;
    const missing = Math.max(0, 100 - (player.health.hp || 0));
    const mult = 1 + Math.min(0.7, missing / 100 * 0.7);
    return Math.max(1.3, mult); // mínimo 30%
  }

  getAAACost(player) {
    if (!this.has('AAA')) return 0;
    return (player.health.hp || 0) >= 30 ? 3 : 0;
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
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (Math.hypot(e.x - x, e.y - y) <= 120) {
        if (e.receiveDamage) e.receiveDamage({ type: 'explosion', baseDamage: 30, now: Date.now() });
      }
    }
    // Visual
    if (this.scene.renderer?.addSlamEffect) this.scene.renderer.addSlamEffect(x, y, false);
  }

  // ─── DDC: Sand King ──────────────────────────────────────────
  applySandKingBonus(slamX, slamY, baseDamage, enemyManager) {
    if (!this.has('DDC')) return;
    const enemies = enemyManager.enemies;
    let count = 0;
    const hits = [];
    for (const e of enemies) {
      if (Math.hypot(e.x - slamX, e.y - slamY) <= 100) { hits.push(e); count++; }
    }
    const bonus = baseDamage + count * 3;
    for (let i = hits.length - 1; i >= 0; i--) {
      const e = hits[i];
      if (e.receiveDamage) e.receiveDamage({ type: 'slam3', baseDamage: bonus, now: Date.now() });
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
    player.health.hp = Math.min(player.health.maxHp, (player.health.hp || 0) + heal);
  }

  // ─── ABC: Brújula Activa ─────────────────────────────────────
  onDashInCompassDir(player, momentum, isPrimary) {
    if (!this.has('ABC')) return;
    const stacks = isPrimary ? 10 : 20;
    momentum.addStacks(stacks);
  }

  // ─── AAB: Gancho ─────────────────────────────────────────────
  _updateAAB(delta, player) {
    if (!this.aabGrabbed) return;
    this.aabTimer -= delta;
    // Mover el enemigo agarrado junto al jugador
    this.aabGrabbed.x = player.px + Math.cos(player.facing) * 30;
    this.aabGrabbed.y = player.py + Math.sin(player.facing) * 30;
    if (this.aabTimer <= 0) this._releaseGrab(player);
  }

  tryGrab(enemy, player) {
    if (!this.has('AAB') || this.aabGrabbed) return false;
    this.aabGrabbed = enemy;
    this.aabTimer   = 4000;
    enemy.isGrabbed = true;
    enemy.isPhantom = true; // no empuja al jugador mientras está agarrado
    return true;
  }

  onDashWhileGrabbing(player) {
    if (!this.aabGrabbed) return false;
    const enemy = this.aabGrabbed;
    this._releaseGrab(player);
    // Eyectar al enemigo con velocidad del dash
    const spd = Math.hypot(player.vx, player.vy) || 600;
    enemy._projectileVx = Math.cos(player.facing) * spd;
    enemy._projectileVy = Math.sin(player.facing) * spd;
    enemy._projectileTimer = 800; // ms como proyectil
    return true;
  }

  _releaseGrab(player) {
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
    const R = 40;
    const zones = this.scene.currentMap?.zones;
    if (!zones) return;
    zones.push({
      type: 'damage_zone',
      damagePerSec: 20,
      timeLeft: 5000,
      geometry: { bbox: { x: x - R, y: y - R, w: R * 2, h: R * 2 } },
      _isFire: true,
    });
  }

  // ─── CCB: velocidad = créditos (aplicado en update) ──────────
  // ya está en update()

  // ─── Reset ───────────────────────────────────────────────────
  reset() {
    this.bbbCooldown = 0; this.bbbReady = false; this.bbbActive = false; this.bbbTimer = 0;
    this.bbcCooldown = 0; this.bbcReady = false; this.bbcBounces = 0;
    this.dbbIdleTimer = 0; this.dbbBonus = 0; this.dbbReady = false;
    this.dddCD = 0; this.dddLimit = 100;
    this.aabGrabbed = null; this.aabTimer = 0;
  }
}
