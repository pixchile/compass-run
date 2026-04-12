// js/spawn/EnemySpawner.js

import enemyRegistry from '../enemies/EnemyRegistry.js';

export default class EnemySpawner {
  constructor(manager, scene) {
    this.manager = manager; // Referencia al EnemyManager
    this.scene = scene;
    
    this.spawnList = [];
    this.nextSpawnIndex = 0;
    this.gameStartTime = 0;
    
    this.density = null;
    this.spawners = [];
    this._fillType = null;
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
            const trigger = typeConfig.basic?.spawnTrigger || {};
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

  update(currentTime, player) {
    if (this.gameStartTime === 0) this.gameStartTime = currentTime;
    
    const elapsedSeconds = (currentTime - this.gameStartTime) / 1000;
    const elapsedMin = elapsedSeconds / 60;
    const currentEnemiesCount = this.manager.enemies.length;
    
    const hardcap = this.density 
      ? Math.min(Math.floor((this.density.maxBase || 20) + (this.density.maxPerMin || 0) * elapsedMin), 300) 
      : 300;

    this._processTimeSpawns(elapsedSeconds, hardcap, player, currentEnemiesCount);
    this._processTriggerSpawns(player);
    this._processDensitySpawns(elapsedMin, hardcap, currentEnemiesCount);
  }

  _processTimeSpawns(elapsedSeconds, hardcap, player, currentEnemiesCount) {
    while (this.nextSpawnIndex < this.spawnList.length) {
      const enemyData = this.spawnList[this.nextSpawnIndex];
      if (enemyData.spawnTime > elapsedSeconds) break;

      if (!enemyData.active && currentEnemiesCount < hardcap) {
        enemyData.active = true;
        this._spawnOne(enemyData, player);
      }
      this.nextSpawnIndex++;
    }
  }

  _processTriggerSpawns(player) {
    for (const enemyData of this.spawnList) {
        if (enemyData.active || !enemyData.spawnTrigger) continue;
        
        const trigger = enemyData.spawnTrigger;
        let shouldSpawn = false;

        if (trigger.type === 'kills') {
            shouldSpawn = this.manager.totalKills >= parseInt(trigger.value);
        } else if (trigger.type === 'coords' && player) {
            const [tx, ty, tr] = (trigger.value + '').split(',').map(Number);
            shouldSpawn = Math.hypot(player.px - tx, player.py - ty) <= (tr || 80);
        }

        if (shouldSpawn) {
            enemyData.active = true;
            this._spawnOne(enemyData, player);
        }
    }
  }

  _processDensitySpawns(elapsedMin, hardcap, currentEnemiesCount) {
    if (!this.density || !this.spawners.length) return;

    const minNow = Math.floor((this.density.minBase || 0) + (this.density.minPerMin || 0) * elapsedMin);
    
    if (currentEnemiesCount < minNow && currentEnemiesCount < hardcap) {
      if (!this._fillType) {
        this._fillType = this.spawnList.find(e => e.type || e.enemyRef)?.type || null;
      }
      if (this._fillType && enemyRegistry.has(this._fillType)) {
        const spawner = this.spawners[Math.floor(Math.random() * this.spawners.length)];
        const offset = 60 + Math.random() * 80;
        const angle = Math.random() * Math.PI * 2;
        const newEnemy = enemyRegistry.create(
          this._fillType,
          spawner.x + Math.cos(angle) * offset,
          spawner.y + Math.sin(angle) * offset,
          this.scene
        );
        if (newEnemy) this.manager.addEnemy(newEnemy);
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
        const spread = pattern.includes('radial') ? (spawnConfig?.orbitRange || 80) : (50 + Math.random() * 60);
        const cx = pattern === 'radial_player' ? (player?.px ?? enemyData.x) : enemyData.x;
        const cy = pattern === 'radial_player' ? (player?.py ?? enemyData.y) : enemyData.y;
        
        const newEnemy = enemyRegistry.create(enemyType, cx + Math.cos(angle) * spread, cy + Math.sin(angle) * spread, this.scene);
        if (newEnemy) this.manager.addEnemy(newEnemy);
      }
    } else {
      const newEnemy = enemyRegistry.create(enemyType, enemyData.x, enemyData.y, this.scene);
      if (newEnemy) this.manager.addEnemy(newEnemy);
    }
  }

  clear() {
    this.nextSpawnIndex = 0;
    this.gameStartTime = 0;
    this._fillType = null;
    for (const enemy of this.spawnList) enemy.active = false;
  }
}