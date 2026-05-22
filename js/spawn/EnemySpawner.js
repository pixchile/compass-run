// js/spawn/EnemySpawner.js

import enemyRegistry from '../enemies/EnemyRegistry.js';
import { ARENA } from '../constants.js';

export default class EnemySpawner {
  constructor(manager, scene) {
    this.manager = manager;
    this.scene = scene;

    this.spawnList = [];
    this.nextSpawnIndex = 0;
    this.gameStartTime = 0;

    this.density = null;
    this.spawners = [];
    this._spawnerTimers = {};
    this._spawnerRoundRobin = {};

    this.squads = [];
    this.squadInstances = [];
    this._squadSpawned = {};

    this._spawnerAlive = {};
    this._fillerAlive = 0;
    this._spawnerWaiting = {};
  }

  setDensity(density) {
    this.density = density || null;
  }

  setSpawners(spawners) {
    this.spawners = spawners || [];
    this._spawnerTimers = {};
    this._spawnerWaveTimers = {};
    this._spawnerWaveState = {};
    this._spawnerRoundRobin = {};
    this._spawnerAlive = {};
    this._spawnerWaiting = {};
  }

  setSquads(squads, squadInstances) {
    this.squads = squads || [];
    this.squadInstances = squadInstances || [];
    this._squadSpawned = {};
  }

  setSpawnList(enemies) {
    this.spawnList = enemies.map(e => {
      const enemyType = e.type || e.enemyRef;
      let finalSpawnTime = e.spawnTime;
      const typeConfig = enemyRegistry.getTypeDefinition(enemyType);

      if (typeConfig) {
        const trigger = typeConfig.basic?.spawnTrigger || {};
        // 'immediate' o sin trigger: usa el spawnTime del editor (o 0 si no tiene)
        if (trigger.type === 'immediate' || trigger.type === 'none' || !trigger.type) {
          finalSpawnTime = e.spawnTime ?? 0;
        }
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

  update(delta, currentTime, player) {
    if (this.gameStartTime === 0) this.gameStartTime = currentTime;

    const elapsedSeconds = (currentTime - this.gameStartTime) / 1000;
    const elapsedMin = elapsedSeconds / 60;
    const currentEnemiesCount = this.manager.enemies.filter(e => !e._isBossAttack).length;

    const hardcap = this.density
      ? Math.min(Math.floor((this.density.maxBase || 20) + (this.density.maxPerMin || 0) * elapsedMin), 300)
      : 300;

    this._processTimeSpawns(elapsedSeconds, hardcap, player, currentEnemiesCount);
    this._processTriggerSpawns(player);
    this._processIntervalSpawns(delta, elapsedSeconds, hardcap, player, currentEnemiesCount);
    this._processSquadSpawns(elapsedSeconds, hardcap, player, currentEnemiesCount);
    this._processDensitySpawns(delta, elapsedSeconds, elapsedMin, hardcap, currentEnemiesCount, player);
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

  _processIntervalSpawns(delta, elapsedSeconds, hardcap, player, currentEnemiesCount) {
    for (let i = 0; i < this.spawners.length; i++) {
      const s = this.spawners[i];

      // Wave mode
      if (s.waveInterval > 0 && s.waveCount > 0) {
        if (currentEnemiesCount >= hardcap) continue;
        if (s.startTime && s.startTime > 0 && elapsedSeconds < s.startTime) continue;
        if (s.expireTime && s.expireTime > 0 && elapsedSeconds >= s.expireTime) continue;

        // maxAlive gate: wait for all children to die before next wave
        if (s.maxAlive > 0) {
          const alive = this._spawnerAlive[i] || 0;
          if (this._spawnerWaiting[i]) {
            if (alive > 0) continue;
            this._spawnerWaiting[i] = false;
            this._spawnerWaveTimers[i] = 0;
          }
        }

        // Mid-wave: still spawning staggered enemies
        const ws = this._spawnerWaveState?.[i];
        if (ws && ws.remaining > 0) {
          // Respect maxAlive mid-wave
          if (s.maxAlive > 0 && (this._spawnerAlive[i] || 0) >= s.maxAlive) {
            delete this._spawnerWaveState[i];
            continue;
          }
          ws.delayTimer -= delta;
          if (ws.delayTimer <= 0) {
            this._spawnWaveEnemy(s, i);
            ws.remaining--;
            if (ws.remaining > 0) {
              ws.delayTimer = s.waveDelay || 0;
            } else {
              delete this._spawnerWaveState[i];
            }
          }
          // Check if maxAlive reached mid-wave
          if (s.maxAlive > 0 && (this._spawnerAlive[i] || 0) >= s.maxAlive) {
            delete this._spawnerWaveState[i];
            this._spawnerWaiting[i] = true;
          }
          continue;
        }

        // Accumulate wave timer
        this._spawnerWaveTimers = this._spawnerWaveTimers || {};
        this._spawnerWaveTimers[i] = (this._spawnerWaveTimers[i] || 0) + delta;
        if (this._spawnerWaveTimers[i] < s.waveInterval) continue;
        this._spawnerWaveTimers[i] -= s.waveInterval;

        const waveDelay = s.waveDelay || 0;
        const count = s.maxAlive > 0 ? Math.min(s.waveCount, s.maxAlive) : s.waveCount;

        if (waveDelay <= 0) {
          // All at once
          for (let j = 0; j < count && currentEnemiesCount < hardcap; j++) {
            this._spawnWaveEnemy(s, i);
          }
        } else {
          // Staggered: spawn first, queue the rest
          this._spawnWaveEnemy(s, i);
          if (count > 1) {
            this._spawnerWaveState = this._spawnerWaveState || {};
            this._spawnerWaveState[i] = { remaining: count - 1, delayTimer: waveDelay };
          }
        }

        if (s.maxAlive > 0 && (this._spawnerAlive[i] || 0) >= s.maxAlive) {
          this._spawnerWaiting[i] = true;
        }
        continue;
      }

      // Legacy interval mode
      if (!s.interval || s.interval <= 0) continue;
      if (currentEnemiesCount >= hardcap) continue;

      if (s.startTime && s.startTime > 0 && elapsedSeconds < s.startTime) continue;
      if (s.expireTime && s.expireTime > 0 && elapsedSeconds >= s.expireTime) continue;

      // maxAlive gate: wait for all children to die, then restart interval timer
      if (s.maxAlive > 0) {
        const alive = this._spawnerAlive[i] || 0;
        if (this._spawnerWaiting[i]) {
          if (alive > 0) continue;
          this._spawnerWaiting[i] = false;
          this._spawnerTimers[i] = 0;
        }
        if (alive >= s.maxAlive) {
          this._spawnerWaiting[i] = true;
          continue;
        }
      }

      this._spawnerTimers[i] = (this._spawnerTimers[i] || 0) + delta;
      if (this._spawnerTimers[i] < s.interval) continue;

      this._spawnerTimers[i] = 0;

      const types = s.types || [];
      if (types.length === 0) continue;

      const rr = this._spawnerRoundRobin[i] = (this._spawnerRoundRobin[i] || 0) % types.length;
      const type = types[rr];
      this._spawnerRoundRobin[i] = rr + 1;

      if (!enemyRegistry.has(type)) continue;

      const enemy = enemyRegistry.create(type, s.x, s.y, this.scene);
      if (enemy) {
        enemy._spawnerIndex = i;
        this._spawnerAlive[i] = (this._spawnerAlive[i] || 0) + 1;
        this._assignPath(enemy, s);
        this.manager.addEnemy(enemy);
      }
    }
  }

  /** Spawn one enemy from a wave spawner using round-robin type cycling. */
  _spawnWaveEnemy(spawner, idx) {
    const types = spawner.types || [];
    if (types.length === 0) return;

    this._spawnerRoundRobin[idx] = (this._spawnerRoundRobin[idx] || 0) % types.length;
    const type = types[this._spawnerRoundRobin[idx]];
    this._spawnerRoundRobin[idx]++;

    if (!enemyRegistry.has(type)) return;

    const enemy = enemyRegistry.create(type, spawner.x, spawner.y, this.scene);
    if (enemy) {
      enemy._spawnerIndex = idx;
      this._spawnerAlive[idx] = (this._spawnerAlive[idx] || 0) + 1;
      this._assignPath(enemy, spawner);
      this.manager.addEnemy(enemy);
    }
  }

  _processSquadSpawns(elapsedSeconds, hardcap, player, currentEnemiesCount) {
    for (let i = 0; i < this.squadInstances.length; i++) {
      const inst = this.squadInstances[i];
      if (this._squadSpawned[i]) continue;
      if (elapsedSeconds < inst.spawnTime) continue;
      if (!player) continue;

      const template = this.squads.find(s => s.name === inst.squadName);
      if (!template || !template.members) continue;

      // Face direction: player movement, or default down (0, 1)
      let fdX = 0, fdY = 1;
      if (Math.abs(player.vx) > 1 || Math.abs(player.vy) > 1) {
        const mag = Math.hypot(player.vx, player.vy);
        fdX = player.vx / mag;
        fdY = player.vy / mag;
      }

      // Rotation angle from default face (0,1) to (fdX, fdY)
      const theta = -Math.atan2(fdX, fdY);
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // Spawn origin: ahead of the player (off-screen, ready to engage)
      const ox = player.px + fdX * 700;
      const oy = player.py + fdY * 700;

      for (const member of template.members) {
        if (this.manager.enemies.length >= hardcap) break;
        if (!enemyRegistry.has(member.type)) continue;

        // Rotate offset by formation facing
        const rx = member.offsetX * cosT - member.offsetY * sinT;
        const ry = member.offsetX * sinT + member.offsetY * cosT;

        let ex = ox + rx;
        let ey = oy + ry;

        // Nudge out of unsafe zones / walls
        const safe = this._findSafeSpawn(ex, ey, player.px, player.py);
        if (!safe) continue;

        const enemy = enemyRegistry.create(member.type, safe.x, safe.y, this.scene);
        if (enemy) {
          enemy._squadName = inst.squadName;
          this.manager.addEnemy(enemy);
        }
      }
      this._squadSpawned[i] = true;
    }
  }

  spawnSquadNow(squadName, ox, oy, fdX, fdY, player) {
    const template = this.squads.find(s => s.name === squadName);
    if (!template || !template.members) return;

    const theta = -Math.atan2(fdX, fdY);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    for (const member of template.members) {
      if (!enemyRegistry.has(member.type)) continue;
      const rx = member.offsetX * cosT - member.offsetY * sinT;
      const ry = member.offsetX * sinT + member.offsetY * cosT;
      const safe = this._findSafeSpawn(ox + rx, oy + ry, player.px, player.py);
      if (!safe) continue;
      const enemy = enemyRegistry.create(member.type, safe.x, safe.y, this.scene);
      if (enemy) {
        enemy._squadName = squadName;
        this.manager.addEnemy(enemy);
      }
    }
  }

  _findSafeSpawn(x, y, playerX, playerY) {
    const zones = this.scene?.currentMap?.zones;
    const wallGrid = this.scene?.wallGrid;
    const unsafeTypes = new Set(['void', 'shop', 'pit_stop']);

    const isUnsafe = (px, py) => {
      // Check zones
      if (zones) {
        for (const zone of zones) {
          if (!unsafeTypes.has(zone.type)) continue;
          const bx = zone.x ?? zone.geometry?.bbox?.x ?? zone.geometry?.x;
          const by = zone.y ?? zone.geometry?.bbox?.y ?? zone.geometry?.y;
          const bw = zone.w ?? zone.geometry?.bbox?.w ?? zone.geometry?.w;
          const bh = zone.h ?? zone.geometry?.bbox?.h ?? zone.geometry?.h;
          if (bx === undefined || by === undefined) continue;
          if (px >= bx && px <= bx + bw && py >= by && py <= by + bh) return true;
        }
      }
      // Check wall proximity
      if (wallGrid) {
        const r = 20;
        const nearby = wallGrid.query(px, py, r);
        for (const wall of nearby) {
          if (wall._broken) continue;
          const cx = (wall.start.x + wall.end.x) / 2;
          const cy = (wall.start.y + wall.end.y) / 2;
          const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
          const hlen = len / 2;
          if (hlen < 1) {
            if (Math.hypot(px - cx, py - cy) < r) return true;
            continue;
          }
          const ux = (wall.end.x - wall.start.x) / len;
          const uy = (wall.end.y - wall.start.y) / len;
          let t = (px - wall.start.x) * ux + (py - wall.start.y) * uy;
          t = Math.max(0, Math.min(len, t));
          const closestX = wall.start.x + t * ux;
          const closestY = wall.start.y + t * uy;
          if (Math.hypot(px - closestX, py - closestY) < r) return true;
        }
      }
      return false;
    };

    if (!isUnsafe(x, y)) return { x, y };

    // Spiral outward from original position toward player to find a safe spot
    const dirX = playerX - x;
    const dirY = playerY - y;
    const dist = Math.hypot(dirX, dirY) || 1;
    const ndX = dirX / dist;
    const ndY = dirY / dist;

    for (let step = 1; step <= 8; step++) {
      for (const sign of [1, -1]) {
        const sx = x + ndX * 40 * step * sign;
        const sy = y + ndY * 40 * step * sign;
        if (!isUnsafe(sx, sy)) return { x: sx, y: sy };
      }
    }
    return null;
  }

  _processDensitySpawns(delta, elapsedSeconds, elapsedMin, hardcap, currentEnemiesCount, player) {
    if (!this.density) return;

    const minNow = Math.floor((this.density.minBase || 0) + (this.density.minPerMin || 0) * elapsedMin);
    this._fillCooldown = Math.max(0, (this._fillCooldown || 0) - delta);

    // Filler maintains its own population floor, independent of spawner enemies
    if (this._fillerAlive >= minNow || this._fillCooldown > 0) return;
    if (!player) return;

    const rawPool = (this.density.fillTypes?.length > 0)
      ? this.density.fillTypes
      : enemyRegistry.getAllTypes().map(t => ({ type: t, startMin: 0 }));

    const nowMin = elapsedSeconds / 60;
    const eligible = rawPool.filter(entry => {
      if (typeof entry === 'string') return true;
      return elapsedSeconds >= (entry.startSec || 0);
    });

    if (!eligible.length) return;

    const rr = this._fillRoundRobin = (this._fillRoundRobin || 0) % eligible.length;
    const entry = eligible[rr];
    const fillType = typeof entry === 'string' ? entry : entry.type;
    this._fillRoundRobin = rr + 1;

    if (!enemyRegistry.has(fillType)) return;

    // Spawn offscreen in a random direction around the player
    const angle = Math.random() * Math.PI * 2;
    const dist = 600 + Math.random() * 200;
    let sx = player.px + Math.cos(angle) * dist;
    let sy = player.py + Math.sin(angle) * dist;

    // Clamp to arena bounds
    sx = Math.max(ARENA.x + 20, Math.min(ARENA.x + ARENA.w - 20, sx));
    sy = Math.max(ARENA.y + 20, Math.min(ARENA.y + ARENA.h - 20, sy));

    const safe = this._findSafeSpawn(sx, sy, player.px, player.py);
    if (!safe) return;

    const enemy = enemyRegistry.create(fillType, safe.x, safe.y, this.scene);
    if (enemy) {
      enemy._isFiller = true;
      this._fillerAlive++;
      this.manager.addEnemy(enemy);
    }
    this._fillCooldown = 500;
  }

  _assignPath(enemy, spawner) {
    // Multi-path (nuevo formato)
    if (spawner.paths && spawner.paths.length > 0) {
      enemy._paths = spawner.paths;
      enemy._activePathIndex = 0;
      enemy._pathIndex = 0;
      enemy._pathTimer = 0;
      enemy._pathCheckTimer = 0;
      enemy._pathLoopCount = 0;
      return;
    }
    // Single path (formato legacy)
    if (spawner.path && spawner.path.length > 0) {
      // patrol: aplicar waypointWait global a todos los waypoints que no tienen wait propio
      const waypointWait = spawner.waypointWait || 0;
      const path = waypointWait > 0
        ? spawner.path.map(wp => ({ ...wp, wait: wp.wait > 0 ? wp.wait : waypointWait }))
        : spawner.path;

      enemy._path = path;
      enemy._pathMode = spawner.pathMode || 'loop';
      enemy._pathRandom = spawner.pathMode === 'random';
      enemy._pathIndex = 0;
      enemy._pathTimer = 0;
      enemy._pathCycles = spawner.pathCycles || 0;
      enemy._pathLoopCount = 0;
      enemy._chaseRadius = spawner.chaseRadius;
      enemy._fleeRadius = spawner.fleeRadius;
      if (path[0].wait) {
        enemy.x = path[0].x;
        enemy.y = path[0].y;
      }
    }
  }

  _spawnOne(enemyData, player) {
    const enemyType = enemyData.type || enemyData.enemyRef;
    const typeConfig = enemyRegistry.getTypeDefinition(enemyType);
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

  getSpawnerTimers(elapsedSeconds) {
    const result = [];
    for (let i = 0; i < this.spawners.length; i++) {
      const s = this.spawners[i];
      if (!s.showTimer) continue;

      let remainingMs = 0;
      let state = 'counting';

      if (s.startTime && s.startTime > 0 && elapsedSeconds < s.startTime) {
        remainingMs = (s.startTime - elapsedSeconds) * 1000;
        state = 'waiting_start';
      } else if (s.expireTime && s.expireTime > 0 && elapsedSeconds >= s.expireTime) {
        continue;
      } else if (s.maxAlive > 0 && this._spawnerWaiting[i]) {
        state = 'max_alive';
        remainingMs = 0;
      } else if (s.waveInterval > 0 && s.waveCount > 0) {
        remainingMs = s.waveInterval - (this._spawnerWaveTimers[i] || 0);
      } else if (s.interval > 0) {
        remainingMs = s.interval - (this._spawnerTimers[i] || 0);
      } else {
        continue;
      }

      result.push({ x: s.x, y: s.y, remainingMs, state });
    }
    return result;
  }

  clear() {
    this.nextSpawnIndex = 0;
    this.gameStartTime = 0;
    this._fillCooldown = 0;
    this._spawnerTimers = {};
    this._spawnerWaveTimers = {};
    this._spawnerWaveState = {};
    this._spawnerRoundRobin = {};
    this._fillRoundRobin = 0;
    this._squadSpawned = {};
    this._spawnerAlive = {};
    this._fillerAlive = 0;
    this._spawnerWaiting = {};
    for (const enemy of this.spawnList) enemy.active = false;
  }

  _onEnemyKilled(enemy) {
    if (enemy._spawnerIndex !== undefined) {
      const idx = enemy._spawnerIndex;
      this._spawnerAlive[idx] = Math.max(0, (this._spawnerAlive[idx] || 0) - 1);
    }
    if (enemy._isFiller) {
      this._fillerAlive = Math.max(0, this._fillerAlive - 1);
    }
  }
}
