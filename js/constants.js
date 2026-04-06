export const W = 880, H = 620;
export const ARENA = { x: 55, y: 58, w: 4000, h: 4000 };
export const TRAIL_MAX = 16;
export const L2 = 35, L3 = 55, SMAX = 90;

export const MAX_SPD = [0, 280,  450,  650];
export const TURN_K  = [0, 0.22, 0.09, 0.03];
export const STOP_K  = [0, 0.28, 0.12, 0.045];

// Jump params [_, L1, L2, L3]
export const JUMP_DUR    = [0,  400,  600,  800];
export const JUMP_HMAX   = [0,   28,   54,   84]; //salto visual
export const JUMP_DIST_K = [0,  0.72, 0.92, 1.12]; //salto visual parabólico

// Dash
export const DASH_DUR = 400;
export const DASH_CD  = 2500;
export const DASH_SPD = 2.0;

// Health
export const HP_MAX             = 100;
export const HP_DMG_DASH_WALL   = 0.02;
export const HP_DMG_ENEMY_HIT   = 5;
export const HP_DMG_VOID        = 100;
export const HP_LOW_SPD         = 29; // que es esto?
export const HP_REGEN_DELAY     = 4000;
export const HP_REGEN_RATE      = 0;

// Momentum system - Airborne balance
export const AIR_GAIN_RATE   = 120;
export const AIR_DRAIN_RATE  = 1000; // creo que está en desuso.
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
  STICK_DURATION: 2000,
  GRACE_WINDOW: 200,
  PENALTY_MIN_FACTOR: 0.7,
  COMPASS_BONUS: 1.25,
  GRACE_TIME: 300,
  SPEEDS: [0, 400, 800, 1000],
  STACK_BONUS: [0, 3, 4, 5],
  STICK_DAMAGE_THRESHOLD: 940,
  STICK_DAMAGE_AMOUNT: 3
};

export const KILL_STACKS = {
  small:  4,   
  medium: 10,  
  big:    25,  
};

export const SLAM = {
    MIN_SPEED: 600,              // Velocidad mínima para activar (px/s)
    HIGH_SPEED_THRESHOLD: 999,   // Umbral para efectos extra (px/s)
    DAMAGE: 20,                  // Daño base a enemigos
    RADIUS: 100,                 // Radio de efecto (px)
    SELF_DAMAGE: 10,             // Daño al jugador (solo high speed)
    KNOCKBACK_DIST: 100,         // Distancia de knockback (px)
    WALL_COLLISION_DAMAGE: 100,  // Daño extra por chocar con pared
    COOLDOWN: 5000,               // Cooldown después de slam (ms)
    EFFECT_DURATION: 200,        // Duración de efecto visual (ms)
};

export const REWARDS = {
  ORB_DELAY:            550,   // ms antes de que aparezca el orbe
  ORB_RADIUS:             20,   // mismo que enemigo big
  ORB_HEAL_MIN:            1,
  ORB_HEAL_MAX:           25,
  ORB_HEAL_SPEED_CAP:   999,   // px/s para curación máxima

  KILL_FLOOR_CAP:         15,   // máximo floor para no romper el balance

  CREDIT_BASE_PER_SEC:     1,
  CREDIT_TICK_RATE:      100,   // ms entre ticks de velocidad
  CREDIT_SPEED_FACTOR: 0.0002,
};

// Wall Run Configuration
export const WALL_RUN = {
    MAX_DURATION: 2000,        // Duración máxima (compartida con wall stick)
    SPEEDS: [0, 300, 500, 700], // Velocidad constante según nivel de momentum
};

// Dash Wall Impact
export const DASH_WALL_STUN_DUR = 250;   // ms de stun (parálisis) al chocar con muro en dash

// Compass (Brújula)
export const COMPASS_SPEEDUP_RATE     = 0.10;   // Aumento de velocidad (0.10 = 10%)
export const COMPASS_SPEEDUP_INTERVAL = 60000;  // Cada cuánto aplica el aumento (60000ms = 1 min)
export const COMPASS_BASE_MAX         = 5000;   // Intervalo máximo (con 0 stacks)
export const COMPASS_BASE_MIN         = 2000;   // Intervalo mínimo cap
export const COMPASS_STACK_FACTOR     = 18;     // Reducción del intervalo por cada stack de momentum