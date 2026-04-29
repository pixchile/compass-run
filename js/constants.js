export const W = 880, H = 620;
export const ARENA = { x: 55, y: 58, w: 4000, h: 4000 };
export const TRAIL_MAX = 16;
export const L2 = 40, L3 = 50, SMAX = 90;

export const MAX_SPD = [0, 300,  400,  440];
export const TURN_K  = [0, 0.25, 0.25, 0.12];
export const STOP_K  = [0, 0.25, 0.25, 0.12];

// Jump params [_, L1, L2, L3]
export const JUMP_DUR    = [0,  400,  800,  800];
export const JUMP_HMAX   = [0,   28,   54,   84];
export const JUMP_DIST_K = [0,  0.72, 0.92, 1.12];

// Dash
export const DASH_DUR = 400;
export const DASH_CD  = 2500;
export const DASH_SPD = 2.0;

// Health
export const HP_MAX             = 100;
export const HP_DMG_DASH_WALL   = 0.01;
export const HP_DMG_ENEMY_HIT   = 0.65;
export const HP_DMG_VOID        = 100;
export const HP_LOW_SPD         = 29;
export const HP_REGEN_DELAY     = 4000;
export const HP_REGEN_RATE      = 0.2;


// Muros destructibles
export const WALL_DEFAULT_HP = 100;
export const DASH_WALL_DAMAGE_FACTOR = 0.1; // 10% de la velocidad de impacto

// Momentum system - Airborne balance (obsoleto, pero se conserva por si acaso)
export const AIR_GAIN_RATE   = 120;
export const AIR_DRAIN_RATE  = 1000;
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
  STICK_DURATION: 3000,
  GRACE_WINDOW: 100,
  PENALTY_MIN_FACTOR: 0.8,
  COMPASS_BONUS: 1.5,
  GRACE_TIME: 100,
  SPEEDS: [0, 400, 800, 880],
  STACK_BONUS: [0, 4, 0, 0],
  STICK_DAMAGE_THRESHOLD: 940,
  STICK_DAMAGE_AMOUNT: 3
};


export const ATTACK_RADIOS = {
    1: 50,
    2: 100,
    3: 100
};

export const ATTACK_DAMAGE_MULTIPLIERS = {
    1: 1.0,
    2: 1.5,
    3: 1.5
};

export const SLAM = {
    MIN_SPEED: 600,
    HIGH_SPEED_THRESHOLD: 999,
    DAMAGE: 20,
    RADIUS: 100,
    SELF_DAMAGE: 10,
    KNOCKBACK_DIST: 100,
    WALL_COLLISION_DAMAGE: 100,
    COOLDOWN: 5000,
    EFFECT_DURATION: 200,
};

export const REWARDS = {
  ORB_DELAY:            550,
  ORB_RADIUS:             20,
  ORB_HEAL_MIN:            1,
  ORB_HEAL_MAX:           25,
  ORB_HEAL_SPEED_CAP:   1200,

  CREDIT_BASE_PER_SEC:     1,
  CREDIT_TICK_RATE:      100,
  CREDIT_SPEED_FACTOR: 0.0002,

  SPEED_MIN_BONUS_PER_KILL: 0.1,
  SPEED_MAX_BONUS_PER_KILL: [0, 0.4, 0.6, 0.6],
};

// Wall Run Configuration
export const WALL_RUN = {
    MAX_DURATION: 2000,
    SPEEDS: [0, 350, 700, 700],
};

// Dash Wall Impact
export const DASH_WALL_STUN_DUR = 250;

// ============================================================
// NUEVO SISTEMA DE COMPASS (brújula con buffs)
// ============================================================

// Direcciones primarias (cardinales) y secundarias (diagonales)
export const COMPASS_DIRS_PRIMARY = [
  { id: 'N',  dx:  0, dy: -1 },
  { id: 'S',  dx:  0, dy:  1 },
  { id: 'E',  dx:  1, dy:  0 },
  { id: 'O',  dx: -1, dy:  0 },
];

export const COMPASS_DIRS_SECONDARY = [
  { id: 'NE', dx:  0.7071, dy: -0.7071 },
  { id: 'NO', dx: -0.7071, dy: -0.7071 },
  { id: 'SE', dx:  0.7071, dy:  0.7071 },
  { id: 'SO', dx: -0.7071, dy:  0.7071 },
];

// Intervalos de cambio de dirección (ms)
export const COMPASS_PRIMARY_BASE   = 3600;   // intervalo base (0 stacks)
export const COMPASS_PRIMARY_MIN    = 2000;   // intervalo mínimo
export const COMPASS_STACK_FACTOR   = 18;     // reducción por stack (ms por stack)
export const COMPASS_SPEEDUP_RATE   = 0.10;   // 10% más rápido por minuto
export const COMPASS_SPEEDUP_INTERVAL = 60000; // cada 60s
export const COMPASS_SECONDARY_MULT = 2.0;    // secundaria cambia el doble de rápido

// Ganancia: cada 100ms (10 ticks/segundo), unificado tierra/aire
export const COMPASS_TICK_RATE = 100;

// Umbral para secundaria (producto punto con cos(22.5°))
export const COMPASS_STRICT_DOT = 0.9238795;

// Tipos de buff
export const BUFF_TYPES = [
  'heal',
  'credit',
  'momentum',
  'maxSpeed',
  'amplitude',
  'timer',
  'dashCd',
  'hitboxAmplitude',
  'damageMult',
];

// Colores de cada buff
export const BUFF_COLORS = {
  heal:      { hex: '#44dd77', color: 0x44dd77 },
  credit:    { hex: '#ffcc22', color: 0xffcc22 },
  momentum:  { hex: '#cc44ff', color: 0xcc44ff },
  maxSpeed:  { hex: '#00cccc', color: 0x00cccc },
  amplitude: { hex: '#ffaa22', color: 0xffaa22 },
  timer:     { hex: '#dddddd', color: 0xdddddd },
  dashCd:    { hex: '#ff3322', color: 0xff3322 },
  hitboxAmplitude: { hex: '#aaff00', color: 0xaaff00 },
  damageMult:      { hex: '#800D00', color: 0x800D00 },
};

// Valores por tick (primaria = 1x, secundaria = 2x)
export const BUFF_VALUES = {
  heal:      { primary: 0.05, secondary: 0.10 },
  credit:    { primary: 0.2,  secondary: 0.4  },
  momentum:  { primary: 0.2,  secondary: 0.4  },
  maxSpeed:  { primary: 0.02, secondary: 0.04 },
  amplitude: { primary: 0.02, secondary: 0.04 },
  timer:     { primary: 0.1,  secondary: 0.2  },
  dashCd:    { primary: 0.1,  secondary: 0.2  },
  hitboxAmplitude: { primary: 0.001, secondary: 0.002 },
  damageMult:      { primary: 0.001, secondary: 0.002 },
};