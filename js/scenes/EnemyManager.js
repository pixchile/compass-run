// js/scenes/EnemyManager.js

import EnemySpawner from '../spawn/EnemySpawner.js';
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
    this.combatSystem = new CombatSystem(this, scene);
  }

  setRewardHandlers(rewardSystem, orbManager) {
    this.rewardSystem = rewardSystem;
    this.orbManager   = orbManager;
  }

  setMomentumSystem(momentum) { this.momentum = momentum; }
  setDensity(density)         { this.spawner.setDensity(density); }
  setSpawners(spawners)       { this.spawner.setSpawners(spawners); }
  setSpawnList(enemies)       { this.spawner.setSpawnList(enemies); }

  update(delta, currentTime, player, lines) {
    this.spawner.update(currentTime, player);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (typeof enemy.update === 'function') {
            enemy.update(delta, player, lines);
        }
        
        if (enemy.hp <= 0) {
            this.killEnemy(i, enemy, 'passive');
        }
    }
  }

  processPlayerInteractions(player, delta, now, momentumSystem) {
    this.combatSystem.processPlayerInteractions(player, delta, now, momentumSystem);
  }

  processSlam(slamData, now) {
    this.combatSystem.processSlam(slamData, now);
  }

  checkSolidCollision(player, playerRadius = 12) {
    return this.combatSystem.checkSolidCollision(player, playerRadius);
  }

  getWallEnemyLines() {
    return this.combatSystem.getWallEnemyLines();
  }

  addEnemy(enemyInstance) {
    if (enemyInstance) {
        this.enemies.push(enemyInstance);
    }
  }

  killEnemy(index, enemy, fatalSource) {
    if (typeof enemy.kill === 'function') enemy.kill(fatalSource);
    
    this.totalKills++;
    if (this.scene?.momentum) {
      this.scene.momentum.addMaxSpeed(0.1);
    }
    if (this.rewardSystem) this.rewardSystem.onEnemyKilled(enemy.type);

    // Drop de componente (chance global baja)
    if (this.scene?.shopSystem) {
      const drop = this.scene.shopSystem.tryDrop(enemy.x, enemy.y);
      if (drop && this.scene.itemDropManager) {
        this.scene.itemDropManager.spawnDrop(drop);
      }
    }
    // Los orbs y stacks al matar se manejan en DynamicEnemy.kill() → applyDeathEffect()

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
    this.combatSystem.clear();
  }
  
  getEnemies() { 
    return this.enemies; 
  }
}