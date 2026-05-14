// SquadDirector.js — Algorithmic squad spawner based on player performance.
// Evaluates every 5s using 5 signals → threat score → tier → picks a squad.

import enemyRegistry from '../enemies/EnemyRegistry.js';

export default class SquadDirector {
  constructor() {
    this._evalInterval = 5000;
    this._recordInterval = 1000;
    this._cooldownMs = 20000;
    this._lastEvalTime = 0;
    this._lastRecordTime = 0;
    this._cooldownEnd = 0;
    this._squadsSpawned = 0;
    this._maxSquads = 8;

    this._hpSnapshots = [];
    this._killTimestamps = [];
    this._speedSnapshots = [];
    this._lastKillCount = 0;
  }

  reset() {
    this._lastEvalTime = 0;
    this._lastRecordTime = 0;
    this._cooldownEnd = 0;
    this._squadsSpawned = 0;
    this._hpSnapshots.length = 0;
    this._killTimestamps.length = 0;
    this._speedSnapshots.length = 0;
    this._lastKillCount = 0;
  }

  update(delta, currentTime, player, totalKills, itemCount, elapsedSec, squads) {
    if (!squads || squads.length === 0) return null;
    if (this._squadsSpawned >= this._maxSquads) return null;
    if (currentTime < this._cooldownEnd || currentTime - this._lastEvalTime < this._evalInterval) return null;

    // Don't start evaluating until the game has been running at least 30s
    if (currentTime < 30000) return null;

    // Record snapshots at 1 Hz (and always capture kills)
    this._captureKills(currentTime, totalKills);
    if (currentTime - this._lastRecordTime >= this._recordInterval) {
      this._lastRecordTime = currentTime;
      this._record(currentTime, player);
    }

    if (currentTime - this._lastEvalTime < this._evalInterval) return null;
    this._lastEvalTime = currentTime;

    const score = this._computeScore(currentTime, player, itemCount, elapsedSec);
    if (score < 0) return null;

    const tier = score >= 3.0 ? 3 : score >= 1.5 ? 2 : 1;
    const squad = this._pickSquad(squads, tier);
    if (!squad) return null;

    this._cooldownEnd = currentTime + this._cooldownMs;
    this._squadsSpawned++;

    return { squadName: squad.name, x: player.px, y: player.py };
  }

  _captureKills(time, totalKills) {
    const added = totalKills - this._lastKillCount;
    if (added <= 0) return;
    const sec = time / 1000;
    for (let i = 0; i < added; i++) {
      this._killTimestamps.push({ time: sec });
    }
    this._lastKillCount = totalKills;
  }

  _record(time, player) {
    const sec = time / 1000;

    if (player.hp !== undefined) {
      this._hpSnapshots.push({ time: sec, hp: player.hp });
    }

    if (player.vx !== undefined && player.vy !== undefined) {
      this._speedSnapshots.push({ time: sec, speed: Math.hypot(player.vx, player.vy) });
    }

    // Prune everything older than 16s
    const cut = sec - 16;
    this._hpSnapshots = this._hpSnapshots.filter(s => s.time > cut);
    this._speedSnapshots = this._speedSnapshots.filter(s => s.time > cut);
    this._killTimestamps = this._killTimestamps.filter(k => k.time > cut);
  }

  _computeScore(time, player, itemCount, elapsedSec) {
    const sec = time / 1000;
    let score = 0;

    // 1. HP lost in last 10s
    const hpWindow = this._hpSnapshots.filter(s => s.time > sec - 10);
    if (hpWindow.length >= 2) {
      const lost = hpWindow[0].hp - hpWindow[hpWindow.length - 1].hp;
      if (lost > 30) score -= 1;
      else if (lost < 10) score += 0.5;
    }

    // 2. Kill rate in last 10s
    const kills10s = this._killTimestamps.filter(k => k.time > sec - 10).length;
    const kps = kills10s / 10;
    if (kps > 1) score += 2;
    else if (kps > 0.5) score += 1;
    else if (kps > 0.2) score += 0.5;

    // 3. Avg speed vs expected (300 + 50/min)
    const spWindow = this._speedSnapshots.filter(s => s.time > sec - 10);
    if (spWindow.length > 0) {
      const avg = spWindow.reduce((a, s) => a + s.speed, 0) / spWindow.length;
      const expected = 300 + 50 * (elapsedSec / 60);
      if (avg > expected) score += 1;
      else if (avg < 200) score -= 0.5;
    }

    // 4. Speed stagnation in last 15s
    const sp15s = this._speedSnapshots.filter(s => s.time > sec - 15);
    if (sp15s.length >= 6) {
      const third = Math.floor(sp15s.length / 3);
      const firstAvg = sp15s.slice(0, third).reduce((a, s) => a + s.speed, 0) / third;
      const lastAvg = sp15s.slice(-third).reduce((a, s) => a + s.speed, 0) / third;
      if (lastAvg <= firstAvg) score -= 0.5;
    }

    // 5. Item count
    if (itemCount >= 3) score += 1.5;
    else if (itemCount >= 2) score += 0.75;
    else if (itemCount >= 1) score += 0.25;

    return score;
  }

  _pickSquad(squads, tier) {
    if (squads.length === 0) return null;

    const scored = squads.map(sq => {
      let totalHp = 0;
      for (const m of sq.members) {
        const def = enemyRegistry.getTypeDefinition(m.type);
        totalHp += def?.basic?.hp || 50;
      }
      return { squad: sq, difficulty: totalHp };
    });
    scored.sort((a, b) => a.difficulty - b.difficulty);

    const n = scored.length;
    let pool;
    if (n === 1) {
      pool = scored;
    } else if (n === 2) {
      pool = tier === 3 ? [scored[1]] : [scored[0]];
    } else {
      const t1End = Math.max(1, Math.floor(n / 3));
      const t3Start = Math.ceil(2 * n / 3);
      if (tier === 1) pool = scored.slice(0, t1End);
      else if (tier === 3) pool = scored.slice(t3Start);
      else pool = scored.slice(t1End, t3Start);
    }

    if (pool.length === 0) pool = scored;
    return pool[Math.floor(Math.random() * pool.length)].squad;
  }
}
