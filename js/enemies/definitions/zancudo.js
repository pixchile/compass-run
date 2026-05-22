// js/enemies/definitions/zancudo.js
// Mosquito-type enemy: orbits, lunges at player, flees on hit, lands on walls.
// To remove: delete this file and the import from index.js.

import DynamicEnemy from '../core/DynamicEnemy.js';

const PHASE = {
  ORBIT:    'orbit',
  APPROACH: 'approach',
  FLEE:     'flee',
  FINDWALL: 'findWall',
  LANDED:   'landed',
};

// Tuning (all in one place — tweak freely)
const CFG = {
  ORBIT_RADIUS:    180,
  ORBIT_MIN_TIME:  3000,
  ORBIT_MAX_TIME:  7000,
  APPROACH_SPEED:  800,
  APPROACH_DUR:    2000,
  HIT_DAMAGE:      2,
  FLEE_SPEED:      1200,
  FLEE_DUR:        5000,
  LANDED_DUR:      5000,
  RADIUS:          12,
};

export class ZancudoEnemy extends DynamicEnemy {
  constructor(x, y, scene, config) {
    super(x, y, scene, config);

    this.ignoreWalls = true;
    this.isPhantom   = false;
    this.isMobile    = true;

    this._zPhase  = PHASE.ORBIT;
    this._zTimer  = CFG.ORBIT_MIN_TIME + Math.random() * (CFG.ORBIT_MAX_TIME - CFG.ORBIT_MIN_TIME);
    this._zHit    = false;
    this._zWallPt = null;
  }

  update(delta, player, lines) {
    super.update(delta, player, lines);

    if (!player || player.isDead || this.hp <= 0) return;

    this._zTimer -= delta;

    switch (this._zPhase) {

      case PHASE.ORBIT:
        this.intention = 'orbit';
        this.orbitRadius   = CFG.ORBIT_RADIUS;
        this.activeSpeed   = null;

        if (this._zTimer <= 0) {
          this._zPhase = PHASE.APPROACH;
          this._zTimer = CFG.APPROACH_DUR;
          this._zHit   = false;
        }
        break;

      case PHASE.APPROACH:
        this.intention = 'chase';
        this.activeSpeed   = CFG.APPROACH_SPEED;

        if (player) {
          const dist = Math.hypot(player.px - this.x, player.py - this.y);
          if (dist < this.radius + 12) {
            this._zHit = true;
            this._zPhase = PHASE.FLEE;
            this._zTimer = CFG.FLEE_DUR;
            break;
          }
        }

        if (this._zTimer <= 0) {
          this._zPhase = PHASE.ORBIT;
          this._zTimer = CFG.ORBIT_MIN_TIME + Math.random() * (CFG.ORBIT_MAX_TIME - CFG.ORBIT_MIN_TIME);
        }
        break;

      case PHASE.FLEE:
        this.intention = 'flee';
        this.activeSpeed   = CFG.FLEE_SPEED;

        if (this._zTimer <= 0) {
          this._zWallPt = this._findNearestWall(lines);
          if (this._zWallPt) {
            this._zPhase = PHASE.FINDWALL;
          } else {
            this._zPhase = PHASE.ORBIT;
            this._zTimer = CFG.ORBIT_MIN_TIME + Math.random() * (CFG.ORBIT_MAX_TIME - CFG.ORBIT_MIN_TIME);
          }
        }
        break;

      case PHASE.FINDWALL:
        if (!this._zWallPt) {
          this._zPhase = PHASE.ORBIT;
          this._zTimer = CFG.ORBIT_MIN_TIME;
          break;
        }

        {
          const dx = this._zWallPt.x - this.x;
          const dy = this._zWallPt.y - this.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 5) {
            this.x = this._zWallPt.x;
            this.y = this._zWallPt.y;
            this.isMobile = false;
            this.vx = 0;
            this.vy = 0;
            this._zPhase = PHASE.LANDED;
            this._zTimer = CFG.LANDED_DUR;
          } else {
            const speed = CFG.FLEE_SPEED;
            const step = speed * (delta / 1000);
            if (step >= dist) {
              this.x = this._zWallPt.x;
              this.y = this._zWallPt.y;
            } else {
              this.x += (dx / dist) * step;
              this.y += (dy / dist) * step;
            }
            return;
          }
        }
        break;

      case PHASE.LANDED:
        this.intention = 'orbit';
        this.activeSpeed   = null;
        this.isMobile      = false;
        this.vx = 0;
        this.vy = 0;

        if (this._zTimer <= 0) {
          this.isMobile = true;
          this._zPhase = PHASE.ORBIT;
          this._zTimer = CFG.ORBIT_MIN_TIME + Math.random() * (CFG.ORBIT_MAX_TIME - CFG.ORBIT_MIN_TIME);
        }
        break;
    }
  }

  _findNearestWall(lines) {
    const allLines = lines || this.scene?.currentMap?.lines;
    if (!allLines) return null;

    let best = null, bestDist = Infinity;

    for (const line of allLines) {
      if (line._broken) continue;
      const sx = line.start.x, sy = line.start.y;
      const ex = line.end.x,   ey = line.end.y;
      const dx = ex - sx, dy = ey - sy;
      const len2 = dx * dx + dy * dy;

      let px, py;
      if (len2 === 0) {
        px = sx; py = sy;
      } else {
        let t = ((this.x - sx) * dx + (this.y - sy) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        px = sx + t * dx;
        py = sy + t * dy;
      }

      const d = Math.hypot(this.x - px, this.y - py);
      if (d < bestDist) {
        bestDist = d;
        best = { x: px, y: py };
      }
    }

    return best;
  }

  receiveDamage(attackPayload) {
    const died = super.receiveDamage(attackPayload);

    if (!died && this._zPhase === PHASE.LANDED && attackPayload.type !== 'fire' && attackPayload.type !== 'void') {
      this.hp -= (attackPayload.baseDamage || 5) * 1.5;
    }

    return this.hp <= 0;
  }
}

// Definition export (same format as other enemies)
const zancudoConfig = {
  id: 'zancudo',
  name: 'zancudo',
  basic: {
    hp: 40,
    hpRegen: 0,
    color: '0x88CCFF',
    shape: 'circle',
    radius: CFG.RADIUS,
    isBoss: false,
    selfDestruct: { type: 'none', value: 0 },
    spawnTrigger: { type: 'immediate', value: '0' },
  },
  movement: {
    mobile: true,
    speed: 200,
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
      params: { amount: 1 },
    },
  ],
  ambitious: {
    impenetrable: false,
    seeThroughWalls: true,
    attack: {
      type: 'contact',
      effect: 'none',
      damage: CFG.HIT_DAMAGE,
      cooldown: 2000,
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
    hateDamage: 5,
    hateOverridesFleeOnDamage: false,
  },
};

export default {
  id: 'zancudo',
  name: 'zancudo',
  factory: (x, y, scene) => new ZancudoEnemy(x, y, scene, zancudoConfig),
  config: zancudoConfig,
};
