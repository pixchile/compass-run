// js/RunStats.js — per-run stat tracker
// Attached to Game.js as this.runStats; systems access via this.scene.runStats

export default class RunStats {
  constructor() {
    this.reset();
  }

  reset() {
    this.damageDealt = 0;
    this.trueDamageDealt = 0;
    this.damageReceived = 0;
    this.maxSpeed = 0;
    this.maxJumpDist = 0;
    this.jumps = 0;
    this.wallJumps = 0;
    this.wallsDestroyed = 0;
    this.wallDamage = 0;
    this.enemiesKilled = 0;
    this.enemiesDiedOther = 0;
    this.goldSpent = 0;
    this.goldEarned = 0;
    this.compassTime = 0;
    this.bbcBounces = 0;
    this.bbcMaxCombo = 0;

    this._jumpStartX = 0;
    this._jumpStartY = 0;
    this._lastCompassTick = 0;
    this._runStartTime = 0;
    this._runEndTime = 0;
  }

  startRun(startTime, startingCredits) {
    this.reset();
    this._startCredits = startingCredits;
    this._runStartTime = startTime;
  }

  finalize(endTime, finalCredits) {
    this._runEndTime = endTime;
    this._finalCredits = finalCredits;
    this.goldEarned = finalCredits - this._startCredits + this.goldSpent;
  }

  recordMaxSpeed(speed) { if (speed > this.maxSpeed) this.maxSpeed = speed; }

  recordJumpStart(x, y) { this.jumps++; this._jumpStartX = x; this._jumpStartY = y; }

  recordWallJumpStart(x, y) { this.wallJumps++; this._jumpStartX = x; this._jumpStartY = y; }

  recordJumpLand(x, y) {
    const dist = Math.hypot(x - this._jumpStartX, y - this._jumpStartY);
    if (dist > this.maxJumpDist) this.maxJumpDist = dist;
  }

  recordBbcBounce() { this.bbcBounces++; }
  recordBbcCombo(max) { if (max > this.bbcMaxCombo) this.bbcMaxCombo = max; }

  recordDamageDealt(amount) { this.damageDealt += amount; }
  recordTrueDamage(amount) { this.trueDamageDealt += amount; }
  recordDamageReceived(amount) { this.damageReceived += amount; }

  recordWallDamage(amount) { this.wallDamage += amount; }
  recordWallDestroyed() { this.wallsDestroyed++; }

  recordEnemyKilled(byPlayer) {
    if (byPlayer) this.enemiesKilled++;
    else this.enemiesDiedOther++;
  }

  recordGoldSpent(amount) { this.goldSpent += amount; }

  recordCompassTick(delta) { this.compassTime += delta; }

  get runTime() {
    return (this._runEndTime || this._runStartTime) - this._runStartTime;
  }

  get goldLost() {
    return Math.max(0, this._finalCredits ?? 0);
  }

  get damagePerMinute() {
    const mins = this.runTime / 60000;
    return mins > 0 ? this.damageDealt / mins : 0;
  }

  get goldPerMinute() {
    const mins = this.runTime / 60000;
    return mins > 0 ? this.goldEarned / mins : 0;
  }

  getSummary() {
    return {
      damageDealt: Math.round(this.damageDealt),
      trueDamageDealt: Math.round(this.trueDamageDealt),
      damagePerMinute: Math.round(this.damagePerMinute),
      damageReceived: Math.round(this.damageReceived),
      maxSpeed: Math.round(this.maxSpeed),
      maxJumpDist: Math.round(this.maxJumpDist),
      jumps: this.jumps,
      wallJumps: this.wallJumps,
      wallsDestroyed: this.wallsDestroyed,
      wallDamage: Math.round(this.wallDamage),
      enemiesKilled: this.enemiesKilled,
      enemiesDiedOther: this.enemiesDiedOther,
      goldEarned: Math.round(this.goldEarned),
      goldPerMinute: Math.round(this.goldPerMinute),
      goldSpent: Math.round(this.goldSpent),
      goldLost: Math.round(this.goldLost),
      compassTime: Math.round(this.compassTime / 1000),
      bbcBounces: this.bbcBounces,
      bbcMaxCombo: this.bbcMaxCombo,
      runTime: Math.round(this.runTime / 1000),
    };
  }
}
