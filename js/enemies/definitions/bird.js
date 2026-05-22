// js/enemies/definitions/bird.js
// Strike-and-recover flyer. Orbits, predicts player position, charges,
// then coasts away before repositioning for the next strike.

import DynamicEnemy from '../core/DynamicEnemy.js';

const PHASE = {
  ORBIT:   'orbit',
  STRIKE:  'strike',
  RECOVER: 'recover',
};

const CFG = {
  ORBIT_SPEED:     180,
  ORBIT_RADIUS:    220,
  ORBIT_MIN_TIME:  1500,
  ORBIT_MAX_TIME:  3500,
  STRIKE_SPEED:    1100,
  STRIKE_MAX_DUR:  1800,
  PREDICT_LEAD:    0.35,
  RECOVER_SPEED:   120,
  RECOVER_DUR:     1200,
  HIT_DAMAGE:      8,
  RADIUS:          11,
};

export class BirdEnemy extends DynamicEnemy {
  constructor(x, y, scene, config) {
    super(x, y, scene, config);

    this.ignoreWalls = true;
    this.isPhantom   = false;
    this.isMobile    = true;

    this._bPhase   = PHASE.ORBIT;
    this._bTimer   = CFG.ORBIT_MIN_TIME + Math.random() * (CFG.ORBIT_MAX_TIME - CFG.ORBIT_MIN_TIME);
    this._bDirX    = 0;
    this._bDirY    = 0;
    this._struck   = false;
  }

  update(delta, player, lines) {
    super.update(delta, player, lines);

    if (!player || player.isDead || this.hp <= 0) return;

    this._bTimer -= delta;

    switch (this._bPhase) {

      case PHASE.ORBIT:
        this.intention = 'orbit';
        this.orbitRadius   = CFG.ORBIT_RADIUS;
        this.activeSpeed   = null;
        this.speed          = CFG.ORBIT_SPEED;

        if (this._bTimer <= 0) {
          const dx = player.px - this.x;
          const dy = player.py - this.y;
          const dist = Math.hypot(dx, dy) || 1;

          const lead = Math.min(CFG.PREDICT_LEAD, dist / CFG.STRIKE_SPEED * 0.6);
          const predX = player.px + (player.vx || 0) * lead * 30;
          const predY = player.py + (player.vy || 0) * lead * 30;

          const sdx = predX - this.x;
          const sdy = predY - this.y;
          const sdist = Math.hypot(sdx, sdy) || 1;
          this._bDirX = sdx / sdist;
          this._bDirY = sdy / sdist;

          this._bPhase = PHASE.STRIKE;
          this._bTimer = CFG.STRIKE_MAX_DUR;
          this._struck = false;
          this.speed   = CFG.STRIKE_SPEED;
        }
        break;

      case PHASE.STRIKE:
        this.intention = 'chase';
        this.activeSpeed = null;

        if (player && !this._struck) {
          const dist = Math.hypot(player.px - this.x, player.py - this.y);
          if (dist < this.radius + 12) {
            this._struck = true;
          }
        }

        const pastPlayer = this._struck
          && Math.hypot(player.px - this.x, player.py - this.y) > CFG.ORBIT_RADIUS * 1.5;

        if (this._bTimer <= 0 || pastPlayer) {
          this._bPhase = PHASE.RECOVER;
          this._bTimer = CFG.RECOVER_DUR;
          this.speed   = CFG.RECOVER_SPEED;
        }
        break;

      case PHASE.RECOVER:
        this.intention = 'flee';
        this.activeSpeed = null;
        this.speed        = CFG.RECOVER_SPEED;

        if (this._bTimer <= 0) {
          this._bPhase = PHASE.ORBIT;
          this._bTimer = CFG.ORBIT_MIN_TIME + Math.random() * (CFG.ORBIT_MAX_TIME - CFG.ORBIT_MIN_TIME);
          this.speed   = CFG.ORBIT_SPEED;
        }
        break;
    }

    if (this._bPhase === PHASE.STRIKE) {
      this.x += this._bDirX * this.speed * (delta / 1000);
      this.y += this._bDirY * this.speed * (delta / 1000);
      return;
    }
  }
}

const birdConfig = {
  id: 'bird',
  name: 'bird',
  basic: {
    hp: 60,
    hpRegen: 0,
    color: '0x00FF00',
    shape: 'triangle',
    radius: CFG.RADIUS,
    isBoss: false,
    selfDestruct: { type: 'none', value: 0 },
    spawnTrigger: { type: 'immediate', value: '0' },
  },
  movement: {
    mobile: true,
    speed: CFG.ORBIT_SPEED,
    activeSpeed: null,
    scaling: { timeBase: false, timeMultiplier: 1, hpBase: 'none', hpPercentage: 0 },
    locomotion: 'fly',
    intention: 'orbit',
    fleeOn: { damaged: false, lowHp: 0 },
    orbitRange: CFG.ORBIT_RADIUS,
    erraticTime: 2000,
    ignoreWalls: true,
    isPhantom: false,
    reactionRadius: 0,
    disengageRadius: 0,
    reactions: [],
  },
  damageMultipliers: {
    dash: 1.5,
    aerialDash: 2,
    wallJumpDash: 2,
    momentum3: 1,
    slam: 1,
    slam3: 2,
    void: 100,
    wallCrash: 0,
    explosion: 1,
  },
  onDeath: [
    {
      type: 'extraCredits',
      chance: 100,
      condition: 'any',
      params: { amount: 2 },
    },
  ],
  ambitious: {
    impenetrable: false,
    seeThroughWalls: true,
    attack: {
      type: 'contact',
      effect: 'none',
      damage: CFG.HIT_DAMAGE,
      cooldown: 1000,
    },
    defense: {
      invulnerableAura: false,
      evade: false,
    },
    spawn: {
      pattern: 'normal',
      count: 1,
    },
    hates: [],
    hateRadius: 0,
    hateDamage: 0,
    hateOverridesFleeOnDamage: false,
  },
};

export default {
  id: 'bird',
  name: 'bird',
  factory: (x, y, scene) => new BirdEnemy(x, y, scene, birdConfig),
  config: birdConfig,
};
