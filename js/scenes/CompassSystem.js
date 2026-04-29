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

    this.momentum  = null;
    this.rewards   = null;
    this.gameScene = null;
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
    const d = this.primaryDir;
    if (d.id === 'N') return vy < 0;
    if (d.id === 'S') return vy > 0;
    if (d.id === 'E') return vx > 0;
    if (d.id === 'O') return vx < 0;
    return false;
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

  _applyBuff(buffType, isSecondary, player, now) {
    const value = this._getBuffValue(buffType, isSecondary);
    if (value === 0) return;

    switch (buffType) {
      case 'heal':
        if (player.health) player.health.hp = Math.min(100, player.health.hp + value);
        break;
      case 'credit':
        if (this.rewards) this.rewards.credits += value;
        break;
      case 'momentum':
        if (this.momentum) {
          this.momentum.addStacks(value);
          this.momentum.registerAction(now);
        }
        break;
      case 'maxSpeed':
        if (this.momentum) this.momentum.addMaxSpeed(value);
        break;
      case 'amplitude':
        if (this.momentum) this.momentum.addAmplitude(value);
        break;
      case 'timer':
        if (this.gameScene) this.gameScene.timeRemaining += value;
        break;
      case 'dashCd':
        if (player.dashCD > 0) {
          player.dashCD = Math.max(0, player.dashCD - value * 1000);
        }
        break;
      case 'hitboxAmplitude':
        // Aumenta el multiplicador del radio de ataque (0.1% por tick)
        player.attackRadiusMultiplier += value;
        break;
      case 'damageMult':
        // Aumenta el bonificador de daño permanentemente
        player.damageMultiplierBonus += value;
        break;
    }
  }

  update(delta, player, now) {
    this._totalTime += delta;

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
    }

    this._secondaryTimer += delta;
    if (this._secondaryTimer >= secondaryInterval) {
      this._secondaryTimer = 0;
      this.secondaryDir = this._randomSecondary();
      this.secondaryBuff = this._randomBuff();
    }

    this._tickAccum += delta;
    if (this._tickAccum >= COMPASS_TICK_RATE) {
      this._tickAccum -= COMPASS_TICK_RATE;

      const vx = player.vx;
      const vy = player.vy;

      const followPrimary = this._isFollowingPrimary(vx, vy);
      const followSecondary = this._isFollowingSecondary(vx, vy);

      if (followPrimary) {
        this._applyBuff(this.primaryBuff, false, player, now);
      }
      if (followSecondary) {
        this._applyBuff(this.secondaryBuff, true, player, now);
      }
    }
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
}