import { L2, L3, SMAX, DIRS, C, AIR_GAIN_RATE, AIR_DRAIN_RATE, AIR_BONUS_MULT, COMPASS_SPEEDUP_RATE, COMPASS_SPEEDUP_INTERVAL, COMPASS_BASE_MAX, COMPASS_BASE_MIN, COMPASS_STACK_FACTOR } from '../constants.js';

export default class MomentumSystem {
  constructor() {
    this.stacks = 0;
    this.gainT = 0;
    this.drainT = 0;
    this.stackMode = 'drain';
    this.levelProtect = 3000;
    this.levelProtectPct = 1;

    this.cIdx     = Math.floor(Math.random() * DIRS.length);
    this.nextCIdx = this._getRandomDifferentIndex(this.cIdx);
    this.cTimer   = 0;
    this.cFlash   = 0;
    
    this.lastEffectivePosX = 0;
    this.lastEffectivePosY = 0;
    this.effectiveMovementAccumulator = 0;

    // NUEVO: Acumulador de tiempo de juego para acelerar el compass
    this.totalElapsedTime = 0;

    // ─── Kill floor (inyectado desde Game.js) ─────────────────────────
    this.rewardSystem = null;
  }

  // Llamar desde Game.js tras crear RewardSystem
  setRewardSystem(rewardSystem) {
    this.rewardSystem = rewardSystem;
  }

  // Floor dinámico: 0 si no hay rewardSystem, o el killFloor actual
  get _killFloor() { return this.rewardSystem?.killFloor ?? 0; }

  // Aplica el floor a cualquier reducción de stacks
  _floorStacks(n) { return Math.max(this._killFloor, n); }

  _getRandomDifferentIndex(avoidIdx) {
    let ni;
    do { ni = Math.floor(Math.random() * DIRS.length); } while (ni === avoidIdx);
    return ni;
  }

  get level()  { return this.stacks < L2 ? 1 : this.stacks < L3 ? 2 : 3; }
  get lColor() { return this.level === 1 ? C.L1 : this.level === 2 ? C.L2 : C.L3; }
  get lHex()   { return ['','#4488ff','#ffaa22','#ff3322'][this.level]; }

  halveStacks() {
    this.stacks = this._floorStacks(Math.floor(this.stacks / 2));
  }

  calculateStackMode(player) {
    if (player.dashing) return 'neutral';
    
    const currentSpeed = Math.hypot(player.vx, player.vy);
    if (currentSpeed <= 5) return 'drain';
    
    const cd = DIRS[this.cIdx];
    let diff = Math.abs(Math.atan2(player.vy, player.vx) - Math.atan2(cd.dy, cd.dx));
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    const degDiff = diff * (180 / Math.PI);
    
    if (degDiff <= 22.5) return 'gain';
    if (degDiff <= 45)   return 'neutral';
    return 'drain';
  }
  
  hasEffectiveMovementInCompassDirection(player, delta) {
    const dx = player.px - this.lastEffectivePosX;
    const dy = player.py - this.lastEffectivePosY;
    const distanceMoved = Math.hypot(dx, dy);
    
    this.lastEffectivePosX = player.px;
    this.lastEffectivePosY = player.py;
    
    if (distanceMoved < 2.0) return false;
    
    const cd = DIRS[this.cIdx];
    if (!cd) return false;
    
    const moveX = dx / distanceMoved, moveY = dy / distanceMoved;
    let diff = Math.abs(Math.atan2(moveY, moveX) - Math.atan2(cd.dy, cd.dx));
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    return (diff * (180 / Math.PI)) <= 22.5;
  }

  update(delta, player) {
    // Acumulamos el tiempo total de la partida
    this.totalElapsedTime += delta;

// ─── Brújula ──────────────────────────────────────────────────────
    this.cTimer += delta;
    
    // Intervalo base usando las constantes
    const baseInterval = Math.max(
      COMPASS_BASE_MIN, 
      COMPASS_BASE_MAX - this.stacks * COMPASS_STACK_FACTOR
    );
    
    // Calcular multiplicador de velocidad basado en el tiempo usando constantes
    const intervalsPassed = this.totalElapsedTime / COMPASS_SPEEDUP_INTERVAL;
    const speedMultiplier = 1 + (COMPASS_SPEEDUP_RATE * intervalsPassed);
    
    const finalInterval = baseInterval / speedMultiplier;
    
    if (this.cTimer >= finalInterval) {
      this.cTimer   = 0;
      this.cFlash   = 500;
      this.cIdx     = this.nextCIdx;
      this.nextCIdx = this._getRandomDifferentIndex(this.cIdx);
    }
    
    this.cFlash = Math.max(0, this.cFlash - delta);

    const isGrounded = !player.jumping;
    const isMoving   = Math.hypot(player.vx, player.vy) > 5;
    
    if (!player.isStunned) {
      let sm = this.calculateStackMode(player);
      
      if (sm === 'gain' && !this.hasEffectiveMovementInCompassDirection(player, delta)) {
        sm = 'neutral';
      }
      
      this.stackMode = sm;
      
      if (sm === 'gain') {
        this.gainT += delta;
        const gainRate    = isGrounded ? 100 : AIR_GAIN_RATE;
        const gainBonus   = isGrounded ? 1.0 : AIR_BONUS_MULT;
        const effectiveGT = gainRate / gainBonus;
        
        if (this.gainT >= effectiveGT) {
          this.stacks = Math.min(SMAX, this.stacks + 1);
          this.gainT -= effectiveGT;
        }
        this.drainT = 0;
        this.levelProtect = Math.min(3000, this.levelProtect + delta * 1.2);
        
      } else if (sm === 'neutral') {
        this.gainT = this.drainT = 0;
        this.levelProtect = Math.min(3000, this.levelProtect + delta * 1.2);
        
      } else { // 'drain'
        this.gainT  = 0;
        this.drainT += delta;
        const drainRate = isGrounded ? (isMoving ? 200 : 350) : AIR_DRAIN_RATE;
        const atFloorThreshold = (this.stacks === L3 || this.stacks === L2);
        
        if (atFloorThreshold) {
          this.levelProtect -= delta;
          if (this.levelProtect <= 0) {
            if (this.drainT >= drainRate) {
              this.stacks = this._floorStacks(this.stacks - 1);
              this.drainT -= drainRate;
            }
          } else {
            this.drainT = 0;
          }
        } else {
          if (this.drainT >= drainRate) {
            this.stacks = this._floorStacks(this.stacks - 1);
            this.drainT -= drainRate;
          }
        }
      }
    }
    
    this.levelProtectPct = Math.max(0, this.levelProtect) / 3000;
  }
}