// js/scenes/MomentumSystem.js

import { L2, L3, SMAX, DIRS, C, AIR_GAIN_RATE, AIR_DRAIN_RATE, AIR_BONUS_MULT, COMPASS_SPEEDUP_RATE, COMPASS_SPEEDUP_INTERVAL, COMPASS_BASE_MAX, COMPASS_BASE_MIN, COMPASS_STACK_FACTOR, ATTACK_RADIOS } from '../constants.js';

// Precalculamos los cosenos de los ángulos para usar Producto Punto
const COS_22_5 = 0.9238795;
const COS_45 = 0.7071067;

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
    this.totalElapsedTime = 0;

    this.rewardSystem = null;
  }

  setRewardSystem(rewardSystem) {
    this.rewardSystem = rewardSystem;
  }

  _getRandomDifferentIndex(avoidIdx) {
    let ni;
    do { ni = Math.floor(Math.random() * DIRS.length); } while (ni === avoidIdx);
    return ni;
  }

  get level()  { return this.stacks < L2 ? 1 : this.stacks < L3 ? 2 : 3; }
  get lColor() { return this.level === 1 ? C.L1 : this.level === 2 ? C.L2 : C.L3; }
  get lHex()   { return ['','#4488ff','#ffaa22','#ff3322'][this.level]; }
  
  // --- NUEVO: Obtener radio de ataque actual según nivel ---
  getAttackRadius() {
    return ATTACK_RADIOS[this.level] || ATTACK_RADIOS[1];
  }
  
  // --- NUEVO: Obtener multiplicador de daño actual según nivel ---
  getDamageMultiplier() {
    const multipliers = { 1: 1.0, 2: 1.5, 3: 2.0 };
    return multipliers[this.level] || 1.0;
  }

  halveStacks() {
    this.stacks = Math.max(0, Math.floor(this.stacks / 2));
  }

  // --- NUEVO: Reinicio completo (Castigo al caer del muro) ---
  reset() {
    this.stacks = 0;
    this.gainT = 0;
    this.drainT = 0;
    this.levelProtect = 0;
  }

  addStacks(amount) {
    this.stacks = Math.min(SMAX, this.stacks + amount);
  }

  // --- NUEVO: Generar momentum rápido por grindear (Recompensa) ---
  addSurfingMomentum(delta) {
    this.gainT += delta;
    // Tasa súper rápida (ej: añadir un stack cada 100ms mientras grindeas)
    if (this.gainT >= 100) {
      this.stacks = Math.min(SMAX, this.stacks + 1);
      this.gainT -= 100;
    }
    // Protege el nivel mientras surfeas
    this.levelProtect = Math.min(3000, this.levelProtect + delta * 2);
  }

  calculateStackMode(player) {
    if (player.dashing) return 'neutral';
    
    const currentSpeed = Math.hypot(player.vx, player.vy);
    if (currentSpeed <= 5) return 'drain';
    
    const cd = DIRS[this.cIdx];
    if (!cd) return 'drain';

    const cdLen = Math.hypot(cd.dx, cd.dy) || 1;
    const cx = cd.dx / cdLen;
    const cy = cd.dy / cdLen;

    const px = player.vx / currentSpeed;
    const py = player.vy / currentSpeed;

    const dot = (px * cx) + (py * cy);
    
    if (dot >= COS_22_5) return 'gain';
    if (dot >= COS_45) return 'neutral';
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
    
    const cdLen = Math.hypot(cd.dx, cd.dy) || 1;
    const cx = cd.dx / cdLen;
    const cy = cd.dy / cdLen;

    const mx = dx / distanceMoved;
    const my = dy / distanceMoved;
    
    const dot = (mx * cx) + (my * cy);
    return dot >= COS_22_5;
  }

  update(delta, player) {
    this.totalElapsedTime += delta;

    this.cTimer += delta;
    
    const baseInterval = Math.max(
      COMPASS_BASE_MIN, 
      COMPASS_BASE_MAX - this.stacks * COMPASS_STACK_FACTOR
    );
    
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
        const gainRate    = isGrounded ? 200 : AIR_GAIN_RATE; 
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
        
      } else { 
        this.gainT  = 0;
        this.drainT += delta;
        const drainRate = isGrounded ? (isMoving ? 500 : 200) : AIR_DRAIN_RATE;
        const atFloorThreshold = (this.stacks === L3 || this.stacks === L2);
        
        if (atFloorThreshold) {
          this.levelProtect -= delta;
          if (this.levelProtect <= 0) {
            if (this.drainT >= drainRate) {
              this.stacks = Math.max(0, this.stacks - 1);
              this.drainT -= drainRate;
            }
          } else {
            this.drainT = 0;
          }
        } else {
          if (this.drainT >= drainRate) {
            this.stacks = Math.max(0, this.stacks - 1);
            this.drainT -= drainRate;
          }
        }
      }
    }
    
    this.levelProtectPct = Math.max(0, this.levelProtect) / 500;
  }
}