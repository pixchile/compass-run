// js/scenes/CompassSystem.js
import {
  COMPASS_DIRS_PRIMARY,
  COMPASS_DIRS_SECONDARY,
  COMPASS_PRIMARY_BASE,
  COMPASS_PRIMARY_MIN,
  COMPASS_STACK_FACTOR,
  COMPASS_SPEEDUP_RATE,
  COMPASS_SPEEDUP_INTERVAL,
  COMPASS_SECONDARY_MULT,
  COMPASS_TICK_RATE,
  COMPASS_STRICT_DOT,
  COMPASS_SPEED_BUFF_BASE,
  COMPASS_SPEED_BUFF_MAX,
  COMPASS_SPEED_BUFF_MULT_MAX,
  BUFF_TYPES,
  BUFF_COLORS,
  BUFF_VALUES,
} from '../constants.js';

export default class CompassSystem {
  constructor() {
    this.primaryDir   = this._randomPrimary();
    this.secondaryDir = this._randomSecondary();
    this.primaryBuff  = this._randomBuff();
    this.secondaryBuff = this._randomBuff();

    this._primaryTimer   = 0;
    this._secondaryTimer = 0;
    this._totalTime      = 0;

    this._tickAccum = 0;

    this._primaryAccum   = 0;
    this._secondaryAccum = 0;

    this.momentum  = null;
    this.rewards   = null;
    this.gameScene = null;

    this.heat = 0;
    this._heatDecayRate = 0.25;
    this._heatPerKill = 0.4;
    this._heatMinReward = 0.2;
    this._heatGraceMs = 0;
    this._heatGraceDuration = 1000;
  }

  setReferences(momentumSystem, rewardSystem, gameScene) {
    this.momentum  = momentumSystem;
    this.rewards   = rewardSystem;
    this.gameScene = gameScene;
  }

  _randomPrimary() {
    return COMPASS_DIRS_PRIMARY[Math.floor(Math.random() * COMPASS_DIRS_PRIMARY.length)];
  }

  _randomSecondary() {
    return COMPASS_DIRS_SECONDARY[Math.floor(Math.random() * COMPASS_DIRS_SECONDARY.length)];
  }

  _randomBuff() {
    return BUFF_TYPES[Math.floor(Math.random() * BUFF_TYPES.length)];
  }

  _isFollowingPrimary(vx, vy) {
    const speed = Math.hypot(vx, vy);
    if (speed < 5) return false;
    const d = this.primaryDir;
    const dot = (vx * d.dx + vy * d.dy) / speed;
    return dot >= 0.7;
  }

  _isFollowingSecondary(vx, vy) {
    const speed = Math.hypot(vx, vy);
    if (speed < 5) return false;
    const d = this.secondaryDir;
    const dot = (vx * d.dx + vy * d.dy) / speed;
    return dot >= COMPASS_STRICT_DOT;
  }

  _getBuffValue(buffType, isSecondary) {
    const entry = BUFF_VALUES[buffType];
    if (!entry) return 0;
    return isSecondary ? entry.secondary : entry.primary;
  }

  _applyBuff(buffType, isSecondary, player, now, mult = 1) {
    const value = this._getBuffValue(buffType, isSecondary) * mult;
    if (value === 0) return;
    this.gameScene?.runStats?.recordCompassTick(COMPASS_TICK_RATE);

    switch (buffType) {
      case 'heal':
        if (player.health) player.health.hp = Math.min(player.health.maxHp, player.health.hp + value);
        break;
      case 'credit':
        if (this.rewards) this.rewards.credits += value;
        break;
      case 'momentum':
        if (this.momentum) this.momentum.addStacks(value);
        break;
      case 'dashCd':
        if (player.dashCD > 0) {
          player.dashCD = Math.max(0, player.dashCD - value * 1000);
        }
        break;
      case 'trueDamage':
        player.trueDamage += value;
        break;
    }
  }

  update(delta, player, now) {
    this._lastDelta = delta;
    this._totalTime += delta;

    this._heatGraceMs = Math.max(0, this._heatGraceMs - delta);
    if (this._heatGraceMs <= 0) {
      this.heat = Math.max(0, this.heat - this._heatDecayRate * (delta / 1000));
    }

    const intervalsPassed = this._totalTime / COMPASS_SPEEDUP_INTERVAL;
    const speedMultiplier = 1 + COMPASS_SPEEDUP_RATE * intervalsPassed;
    const primaryInterval = Math.max(
      COMPASS_PRIMARY_MIN,
      (COMPASS_PRIMARY_BASE - (this.momentum?.stacks || 0) * COMPASS_STACK_FACTOR) / speedMultiplier
    );
    const secondaryInterval = primaryInterval / COMPASS_SECONDARY_MULT;

    this._primaryTimer += delta;
    if (this._primaryTimer >= primaryInterval) {
      this._primaryTimer = 0;
      this.primaryDir = this._randomPrimary();
      this.primaryBuff = this._randomBuff();
      this._primaryAccum = 0;
    }

    this._secondaryTimer += delta;
    if (this._secondaryTimer >= secondaryInterval) {
      this._secondaryTimer = 0;
      this.secondaryDir = this._randomSecondary();
      this.secondaryBuff = this._randomBuff();
      this._secondaryAccum = 0;
    }

    this._tickAccum += delta;
    if (this._tickAccum >= COMPASS_TICK_RATE) {
      this._tickAccum -= COMPASS_TICK_RATE;

      const vx = player.vx;
      const vy = player.vy;
      const speed = Math.hypot(vx, vy);

      const actualDx = player.px - (this._lastPx ?? player.px);
      const actualDy = player.py - (this._lastPy ?? player.py);
      const actualSpeed = Math.hypot(actualDx, actualDy);
      this._lastPx = player.px;
      this._lastPy = player.py;

      const followPrimary = this._isFollowingPrimary(vx, vy) && actualSpeed > 5;
      const followSecondary = this._isFollowingSecondary(vx, vy) && actualSpeed > 5;

      const t = (speed - COMPASS_SPEED_BUFF_BASE) / (COMPASS_SPEED_BUFF_MAX - COMPASS_SPEED_BUFF_BASE);
      const mult = 1 + Math.max(0, Math.min(1, t)) * (COMPASS_SPEED_BUFF_MULT_MAX - 1);

      const clockMult = this.gameScene?.itemEffects?.has('GGD') ? 2 : 1;
      const heatMult = this.heat < this._heatMinReward ? this._heatMinReward : this.heat;

      if (followPrimary) {
        this._applyBuff(this.primaryBuff, false, player, now, mult * clockMult * heatMult);
        this._primaryAccum += this._getBuffValue(this.primaryBuff, false) * mult * clockMult * heatMult;
      }
      if (followSecondary) {
        this._applyBuff(this.secondaryBuff, true, player, now, mult * clockMult * heatMult);
        this._secondaryAccum += this._getBuffValue(this.secondaryBuff, true) * mult * clockMult * heatMult;
      }
    }
  }

  onEnemyKilled() {
    this.heat = Math.min(1, this.heat + this._heatPerKill);
    this._heatGraceMs = this._heatGraceDuration;
  }

  getPrimaryColor() {
    return BUFF_COLORS[this.primaryBuff]?.color || 0xffffff;
  }

  getSecondaryColor() {
    return BUFF_COLORS[this.secondaryBuff]?.color || 0xffffff;
  }

  getPrimaryHex() {
    return BUFF_COLORS[this.primaryBuff]?.hex || '#ffffff';
  }

  getSecondaryHex() {
    return BUFF_COLORS[this.secondaryBuff]?.hex || '#ffffff';
  }

  get cIdx() {
    return COMPASS_DIRS_PRIMARY.findIndex(d => d.id === this.primaryDir.id);
  }

  get primaryDirectionId() { return this.primaryDir.id; }
  get secondaryDirectionId() { return this.secondaryDir.id; }

  get primaryAccum()   { return this._primaryAccum; }
  get secondaryAccum() { return this._secondaryAccum; }

  get totalTimeEarned() { return this._totalTimeEarned || 0; }
  get highestHitDamage() { return this._highestHitDamage || 0; }

  recordHitDamage(dmg) {
    if (dmg > (this._highestHitDamage || 0)) this._highestHitDamage = dmg;
  }

  isFollowingPrimary(vx, vy) { return this._isFollowingPrimary(vx, vy); }
  isFollowingSecondary(vx, vy) { return this._isFollowingSecondary(vx, vy); }

  getBuffLabel(buffType) {
    const labels = {
      heal: 'HP', credit: 'Cr', momentum: 'Stk', dashCd: 'CD',
      trueDamage: 'True',
    };
    return labels[buffType] || buffType;
  }

  getBuffPerSec(buffType, isSecondary) {
    const entry = BUFF_VALUES[buffType];
    if (!entry) return 0;
    const perTick = isSecondary ? entry.secondary : entry.primary;
    return perTick * (1000 / COMPASS_TICK_RATE); // per-second value
  }
}