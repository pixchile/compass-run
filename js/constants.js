export const W = 880, H = 620;
export const ARENA = { x: 55, y: 58, w: 4000, h: 4000 };
export const TRAIL_MAX = 16;
export const L2 = 30, L3 = 70, SMAX = 90;

export const MAX_SPD = [0, 195,  375,  565];
export const TURN_K  = [0, 0.22, 0.09, 0.036];
export const STOP_K  = [0, 0.28, 0.12, 0.052];

// Jump params [_, L1, L2, L3]
export const JUMP_DUR    = [0,  420,  630,  860];
export const JUMP_HMAX   = [0,   28,   54,   84];
export const JUMP_DIST_K = [0,  0.72, 0.92, 1.12];

// Dash
export const DASH_DUR = 480;
export const DASH_CD  = 1600;
export const DASH_SPD = 3.0;

// Health
export const HP_MAX             = 100;
export const HP_DMG_DASH_WALL   = 0.02;
export const HP_DMG_ENEMY_HIT   = 10;
export const HP_DMG_VOID        = 100;
export const HP_LOW_SPD         = 29;
export const HP_REGEN_DELAY     = 4000;
export const HP_REGEN_RATE      = 0;

// Momentum system - Airborne balance
export const AIR_GAIN_RATE   = 120;
export const AIR_DRAIN_RATE  = 600;
export const AIR_BONUS_MULT  = 1.8;

export const C = {
  L1: 0x4488ff, L2: 0xffaa22, L3: 0xff3322,
  compass: 0xffff44, arena: 0x0c1020, grid: 0x131825, wall: 0x28384e,
  hpHigh: 0x44dd77, hpMid: 0xffcc22, hpLow: 0xff3322,
};

export const DIRS = [
  { id:'N',  key:'W',   dx: 0,       dy:-1      },
  { id:'NE', key:'W+D', dx: 0.7071,  dy:-0.7071 },
  { id:'E',  key:'D',   dx: 1,       dy: 0      },
  { id:'SE', key:'S+D', dx: 0.7071,  dy: 0.7071 },
  { id:'S',  key:'S',   dx: 0,       dy: 1      },
  { id:'SW', key:'S+A', dx:-0.7071,  dy: 0.7071 },
  { id:'W',  key:'A',   dx:-1,       dy: 0      },
  { id:'NW', key:'W+A', dx:-0.7071,  dy:-0.7071 },
];

// Map Editor Configuration
export const EDITOR = {
  GRID_SIZE: 32,
  BRUSH_SIZES: [1, 2, 3, 5],
  DEFAULT_WALL_WIDTH: 32,
  DEFAULT_WALL_HEIGHT: 32,
  MAX_WALLS: 500,
};

export const MAPS = {
  SAVE_SLOTS: 5,
  DEFAULT_MAP: 'default',
};

// Wall Jump Configuration
export const WALL_JUMP = {
  STICK_DURATION: 1000,        // ms que puede estar pegado
  COMPASS_BONUS: 1.25,         // bonus por seguir la flecha
  GRACE_TIME: 300,             // ms sin pérdida de velocidad al pegarse
  FIXED_JUMP_DISTANCE: 400   // ← nuevo
};

export const SLAM = {
    MIN_SPEED: 320,              // Velocidad mínima para activar (px/s)
    HIGH_SPEED_THRESHOLD: 550,   // Umbral para efectos extra (px/s)
    DAMAGE: 34,                  // Daño base a enemigos
    RADIUS: 100,                 // Radio de efecto (px)
    SELF_DAMAGE: 25,             // Daño al jugador (solo high speed)
    KNOCKBACK_DIST: 150,         // Distancia de knockback (px)
    WALL_COLLISION_DAMAGE: 100,  // Daño extra por chocar con pared
    COOLDOWN: 500,               // Cooldown después de slam (ms)
    EFFECT_DURATION: 200,        // Duración de efecto visual (ms)
};

export const REWARDS = {
  ORB_DELAY:            1000,   // ms antes de que aparezca el orbe
  ORB_RADIUS:             32,   // mismo que enemigo big
  ORB_HEAL_MIN:            1,
  ORB_HEAL_MAX:           25,
  ORB_HEAL_SPEED_CAP:   1000,   // px/s para curación máxima

  KILL_FLOOR_CAP:         25,   // máximo floor para no romper el balance

  CREDIT_BASE_PER_SEC:     1,
  CREDIT_TICK_RATE:      100,   // ms entre ticks de velocidad
  CREDIT_SPEED_FACTOR: 0.0003,
};

// Dash Wall Impact
export const DASH_WALL_STUN_DUR = 500;   // ms de stun (parálisis) al chocar con muro en dash

// Compass (Brújula)
export const COMPASS_SPEEDUP_RATE     = 0.10;   // Aumento de velocidad (0.10 = 10%)
export const COMPASS_SPEEDUP_INTERVAL = 60000;  // Cada cuánto aplica el aumento (60000ms = 1 min)
export const COMPASS_BASE_MAX         = 3000;   // Intervalo máximo (con 0 stacks)
export const COMPASS_BASE_MIN         = 1250;   // Intervalo mínimo cap
export const COMPASS_STACK_FACTOR     = 18;     // Reducción del intervalo por cada stack de momentum