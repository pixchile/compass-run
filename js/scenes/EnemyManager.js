// js/scenes/EnemyManager.js

import { KILL_STACKS } from '../constants.js';
import EnemySpawner from '../spawn/EnemySpawner.js';
import CombatSystem from '../systems/CombatSystem.js';

export default class EnemyManager {
  constructor(scene, arenaBounds) {
    this.scene = scene;
    this.arenaBounds = arenaBounds;
    this.enemies = [];
    this.totalKills = 0;

    // Dependencias externas
    this.rewardSystem = null;
    this.orbManager   = null;
    this.momentum     = null;

    // Sub-sistemas
    this.spawner = new EnemySpawner(this, scene);
    this.combatSystem = new CombatSystem(this, scene);
  }

  // --- CONFIGURACIÓN (Delegada al Spawner cuando corresponde) ---
  setRewardHandlers(rewardSystem, orbManager) {
    this.rewardSystem = rewardSystem;
    this.orbManager   = orbManager;
  }

  setMomentumSystem(momentum) { this.momentum = momentum; }
  setDensity(density)         { this.spawner.setDensity(density); }
  setSpawners(spawners)       { this.spawner.setSpawners(spawners); }
  setSpawnList(enemies)       { this.spawner.setSpawnList(enemies); }

  // --- MÉTODOS DE BUCLE PRINCIPAL ---
  update(delta, currentTime, player, lines) {
    // 1. Spawner decide si deben aparecer nuevos enemigos
    this.spawner.update(currentTime, player);

    // 2. Actualizar movimiento/lógica de los enemigos vivos
    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (typeof enemy.update === 'function') {
            enemy.update(delta, player, lines);
        }
        
        // Si un enemigo muere por un efecto de estado o tiempo (HP <= 0 de forma pasiva)
        if (enemy.hp <= 0) {
            this.killEnemy(i, enemy, 'passive');
        }
    }
  }

  // --- COMBATE (Delegado al CombatSystem) ---
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

  // --- UTILIDADES ---
  
  addEnemy(enemyInstance) {
    if (enemyInstance) {
        this.enemies.push(enemyInstance);
    }
  }

  killEnemy(index, enemy, fatalSource) {
    if (typeof enemy.kill === 'function') enemy.kill(fatalSource);
    
    // Contabilizar kills, recompensas y momentum
    this.totalKills++;
    if (this.rewardSystem) this.rewardSystem.onEnemyKilled(enemy.type);
    if (this.orbManager && enemy.type === 'big') this.orbManager.scheduleOrb(enemy.x, enemy.y);
    if (this.momentum && KILL_STACKS[enemy.type] !== undefined) {
      this.momentum.addStacks(KILL_STACKS[enemy.type]);
    }

    // Quitar del array
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