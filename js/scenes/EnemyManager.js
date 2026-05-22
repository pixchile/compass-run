// js/scenes/EnemyManager.js

import EnemySpawner from '../spawn/EnemySpawner.js';
import SquadDirector from '../spawn/SquadDirector.js';
import CombatSystem from '../systems/CombatSystem.js';

export default class EnemyManager {
  constructor(scene, arenaBounds) {
    this.scene = scene;
    this.arenaBounds = arenaBounds;
    this.enemies = [];
    this.totalKills = 0;

    this.rewardSystem = null;
    this.orbManager   = null;
    this.momentum     = null;

    this.spawner = new EnemySpawner(this, scene);
    this.director = new SquadDirector();
    this.combatSystem = new CombatSystem(this, scene);
    this.recentEvents = [];
    this.recentEventsByType = {}; // índice por tipo para lookup O(1) en reacciones
  }

  addEvent(type, x, y, enemyType, data = {}) {
    const event = { type, x, y, enemyType, time: Date.now(), ...data };
    this.recentEvents.push(event);
    if (!this.recentEventsByType[type]) this.recentEventsByType[type] = [];
    this.recentEventsByType[type].push(event);
  }

  _cleanEvents() {
    const cutoff = Date.now() - 5000;
    this.recentEvents = this.recentEvents.filter(e => e.time > cutoff);
    // Reconstruir índice solo si hubo limpieza (barato porque es raro)
    for (const type in this.recentEventsByType) {
      this.recentEventsByType[type] = this.recentEventsByType[type].filter(e => e.time > cutoff);
      if (this.recentEventsByType[type].length === 0) delete this.recentEventsByType[type];
    }
  }

  setRewardHandlers(rewardSystem, orbManager) {
    this.rewardSystem = rewardSystem;
    this.orbManager   = orbManager;
  }

  setMomentumSystem(momentum) { this.momentum = momentum; }
  setDensity(density)         { this.spawner.setDensity(density); }
  setSpawners(spawners)       { this.spawner.setSpawners(spawners); }
  setSpawnList(enemies)       { this.spawner.setSpawnList(enemies); }
  setSquads(squads, squadInstances) { this.spawner.setSquads(squads, squadInstances); }

  update(delta, currentTime, player, lines) {
    this._cleanEvents();
    this.spawner.update(delta, currentTime, player);

    // Director: algorithmic squad spawns
    const elapsedSec = currentTime / 1000;
    const itemCount = this.scene?.shopSystem?.equippedItems?.length || 0;
    const result = this.director.update(
      delta, currentTime, player, this.totalKills,
      itemCount, elapsedSec, this.spawner.squads
    );
    if (result) {
      let fdX = 0, fdY = 1;
      if (Math.abs(player.vx) > 1 || Math.abs(player.vy) > 1) {
        const mag = Math.hypot(player.vx, player.vy);
        fdX = player.vx / mag;
        fdY = player.vy / mag;
      }
      const ox = player.px + fdX * 700;
      const oy = player.py + fdY * 700;
      this.spawner.spawnSquadNow(result.squadName, ox, oy, fdX, fdY, player);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (typeof enemy.update === 'function') {
            enemy.update(delta, player, lines);
        }

        if (enemy.hp <= 0) {
            this.killEnemy(i, enemy, enemy._lastDamageSource || 'passive');
        }
    }
  }

  processPlayerInteractions(player, delta, now, momentumSystem) {
    this.combatSystem.processPlayerInteractions(player, delta, now, momentumSystem);
  }

  processSlam(slamData, now, momentum) {
    this.combatSystem.processSlam(slamData, now, momentum);
  }

  checkSolidCollision(player, playerRadius = 12) {
    return this.combatSystem.checkSolidCollision(player, playerRadius);
  }

  checkImpenetrableCollision(player, playerRadius = 12) {
    this.combatSystem.checkImpenetrableCollision(player, playerRadius);
  }

  addEnemy(enemyInstance) {
    if (enemyInstance) {
        this.enemies.push(enemyInstance);
    }
  }

  /**
   * Agrega un BossAttackEnemy al array de enemigos.
   * Separado semánticamente de addEnemy para claridad y para permitir
   * caps futuros (máx 80 attack enemies simultáneos).
   */
  addBossAttack(bossAttackEnemy) {
    if (!bossAttackEnemy) return;
    // Hard cap: evitar que los arrays se inflen en combate intenso
    const attackCount = this.enemies.filter(e => e._isBossAttack).length;
    if (attackCount >= 80) return;
    this.enemies.push(bossAttackEnemy);
  }

  killEnemy(index, enemy, fatalSource) {
    // Boss attack enemies: solo sacar del array, sin rewards ni eventos
    if (enemy._isBossAttack) {
      this.enemies.splice(index, 1);
      return;
    }

    if (typeof enemy.kill === 'function') enemy.kill(fatalSource);

    const noRewards = fatalSource === 'void' || fatalSource === 'hater';

    this.addEvent('enemyKilled', enemy.x, enemy.y, enemy.type, { killedBy: fatalSource, sourceId: enemy.id });

    if (!noRewards) {
      this.totalKills++;
      this.scene?.itemEffects?.spawnVampireOrb(enemy.x, enemy.y);
      this.scene?.itemEffects?.onEnemyKilled();
      this.scene?.compass?.onEnemyKilled();
      if (this.scene?.momentum) {
        this.scene.momentum.addMaxSpeed(1);
      }
      if (this.rewardSystem) this.rewardSystem.onEnemyKilled(enemy.type);

      // Drop de componente (chance global baja)
      if (this.scene?.shopSystem) {
        const drop = this.scene.shopSystem.tryDrop(enemy.x, enemy.y);
        if (drop && this.scene.itemDropManager) {
          this.scene.itemDropManager.spawnDrop(drop);
        }
      }
    }

    if (this.spawner) this.spawner._onEnemyKilled(enemy);

    this.enemies.splice(index, 1);
  }

  cleanupDead() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].hp <= 0) {
        this.killEnemy(i, this.enemies[i], 'cleanup');
      }
    }
  }

  clearAll() {
    this.enemies = [];
    this.totalKills = 0;
    this.spawner.clear();
    this.director.reset();
    this.combatSystem.clear();
  }

  getSpawnerTimers(elapsedSeconds) {
    return this.spawner.getSpawnerTimers(elapsedSeconds);
  }

  getEnemies({ excludeBossAttacks = false } = {}) {
    if (excludeBossAttacks) return this.enemies.filter(e => !e._isBossAttack);
    return this.enemies;
  }
}