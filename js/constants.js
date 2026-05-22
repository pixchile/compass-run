export const W = 880, H = 620;
export const ARENA = { x: 55, y: 58, w: 4000, h: 4000 };
export const TRAIL_MAX = 16;
export const L2 = 40, L3 = 50, SMAX = 90;

export const MAX_SPD = [0, 250,  300,  350];
export const TURN_K  = [0, 0.4, 0.2, 0.12];
export const STOP_K  = [0, 0.24, 0.12, 0.06];

// Jump params [_, L1, L2, L3]
export const JUMP_DUR    = [0,  400,  500,  600];
export const JUMP_HMAX   = [0,   28,   54,   84];
export const JUMP_DIST_K = [0,  1.0, 1.1, 1.2];

// Dash
export const DASH_DUR = 500;
export const DASH_CD  = 2000;
export const DASH_SPD = 2.0;

// Health
export const HP_MAX             = 50;
export const HP_DMG_DASH_WALL   = 0.01;
export const HP_DMG_VOID        = 1000;
export const HP_REGEN_DELAY     = 4000;
export const HP_REGEN_RATE      = 0.2;

export const WALL_DEFAULT_HP = 300;
export const WALL_CHUNK_SIZE = 80;
export const DASH_WALL_DAMAGE_FACTOR = 0.1;
export const ENEMY_REACTION_RADIUS = 400;

// Wall Jump Configuration
export const WALL_JUMP = {
  STICK_DURATION: 500,
  GRACE_WINDOW: 100,
  PENALTY_MIN_FACTOR: 0.8,
  STICK_DAMAGE_THRESHOLD: 900,
  STICK_DAMAGE_AMOUNT: 1
};

export const BBC_REBOUND_SPEEDS = [0, 500, 600, 700];
export const WALL_JUMP_EXIT_MULT = 1.1;        // multiplicador de velocidad al salir de la pared
export const WALL_JUMP_DASH_MOMENTUM_COST = 3; // stacks de momentum que cuesta hacer dash desde pared
export const WALL_JUMP_MOMENTUM_COST = 5;      // stacks de momentum que cuesta un wall jump normal
export const SPEED_BUFFER_SIZE = 10;           // tamaño del buffer circular para promediar velocidad
export const MOMENTUM_GAIN_PER_250_SPEED = 2;  // stacks ganados por segundo al ir a velocidad máxima
export const DASH_PIERCE_BASE = 2;             // enemigos base que atraviesa un dash (a velocidad <= 500)
export const MOMENTUM3_HIT_COOLDOWN = 500;     // ms entre hits del ataque de momentum nivel 3
export const DASH_WALL_DAMAGE_SPEED_MIN = 800; // velocidad mínima para dañar un muro en dash


export const ATTACK_RADIOS = {
    1: 50,
    2: 55,
    3: 60
};


export const SLAM = {
    MIN_SPEED: 500,
    HIGH_SPEED_THRESHOLD: 1500,
    DAMAGE: 50,
    RADIUS: 100,
    SANDKING_RADIUS_MULT: 2.2,
    SELF_DAMAGE: 10,
    KNOCKBACK_DIST: 100,
    WALL_COLLISION_DAMAGE: 200,
    COOLDOWN: 5000,
    EFFECT_DURATION: 200,
};

// Enemy attack effects applied on contact
export const ENEMY_ATTACK = {
    SLOW_DURATION: 1500,        // ms
    PUSH_FORCE: 300,            // velocity impulse away from enemy
    NO_JUMP_DURATION: 2000,     // ms
    FLIP_HORIZONTAL_FORCE: 300, // velocity toward beetle (to arc over)
    FLIP_UPWARD_FORCE: 100,     // upward velocity for flip arc
    FLIP_STUN_DURATION: 2000,    // ms — can't control mid-flip
    FLIP_COOLDOWN: 6000,        // ms — beetle flip cooldown
};

export const REWARDS = {
  ORB_DELAY:            550,
  ORB_RADIUS:             20,
  ORB_HEAL_MIN:            1,
  ORB_HEAL_MAX:           25,
  ORB_HEAL_SPEED_CAP:   1200,

  CREDIT_BASE_PER_SEC:     1,
  CREDIT_TICK_RATE:      100,
  CREDIT_SPEED_FACTOR: 0.0004,

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
export const COMPASS_PRIMARY_BASE   = 6000;   // intervalo base (0 stacks)
export const COMPASS_PRIMARY_MIN    = 3000;   // intervalo mínimo
export const COMPASS_STACK_FACTOR   = 22;     // reducción por stack (ms por stack)
export const COMPASS_SPEEDUP_RATE   = 0.10;   // 10% más rápido por minuto
export const COMPASS_SPEEDUP_INTERVAL = 60000; // cada 60s
export const COMPASS_SECONDARY_MULT = 2.0;    // secundaria cambia el doble de rápido

// Ganancia: cada 100ms (10 ticks/segundo)
export const COMPASS_TICK_RATE = 100;

// Umbral para secundaria (producto punto con cos(22.5°))
export const COMPASS_STRICT_DOT = 0.9238795;

// Speed-based buff scaling: at COMPASS_SPEED_BUFF_BASE or below → 1x,
// at COMPASS_SPEED_BUFF_MAX or above → COMPASS_SPEED_BUFF_MULT_MAX
// linear interpolation between
export const COMPASS_SPEED_BUFF_BASE = 300;
export const COMPASS_SPEED_BUFF_MAX  = 1000;
export const COMPASS_SPEED_BUFF_MULT_MAX = 3;

// Tipos de buff
export const BUFF_TYPES = [
  'heal',
  'credit',
  'momentum',
  'dashCd',
  'trueDamage',
];

// Colores de cada buff
export const BUFF_COLORS = {
  heal:       { hex: '#44dd77', color: 0x44dd77 },
  credit:     { hex: '#ffcc22', color: 0xffcc22 },
  momentum:   { hex: '#cc44ff', color: 0xcc44ff },
  dashCd:     { hex: '#ff3322', color: 0xff3322 },
  trueDamage: { hex: '#ffffff', color: 0xffffff },
};

// Valores por tick (primaria = 1x, secundaria = 2x)
export const BUFF_VALUES = {
  heal:       { primary: 0.5, secondary: 1.0 },
  credit:     { primary: 1.2, secondary: 2.4 },
  momentum:   { primary: 0.85, secondary: 1.7 },
  dashCd:     { primary: 0.17, secondary: 0.34 },
  trueDamage: { primary: 0.05, secondary: 0.1 },
};

// ============================================================
// BOSS SYSTEM
// ============================================================

export const BOSS = {
  MAX_ACTIVE:            1,      // solo 1 boss activo a la vez
  MAX_ATTACK_ENEMIES:   80,      // hard cap de BossAttackEnemy simultáneos
  INTRO_INVULN_MS:    1500,      // ms de invulnerabilidad al spawnear
  PHASE_TRANSITION_MS:  500,     // ms de invuln + flash al cambiar fase

  // HP bar (pantalla superior)
  HP_BAR: {
    x: 200, y: 18, w: 480, h: 14,
    bgColor:     0x220000,
    borderColor: 0xff6633,
    fillHigh:    0xff3300,
    fillMid:     0xff6600,
    fillLow:     0xffaa00,
  },

  // Telegrafías: duración por defecto (ms)
  TELEGRAPH: {
    CHARGE:   600,
    RADIAL:   600,
    CONE:     500,
    GROUND:   800,
    BARRAGE:  400,
    LINE:     500,
    COLOR:          0xff6600,
    COLOR_DANGER:   0xff0000,
    ALPHA:          0.45,
  },

  // Arenas
  ARENA_MARGIN: 80,   // px que el boss puede salirse del arena

  // BossAI
  AI: {
    STRAFE_SWITCH_MS: 3000,   // cada cuánto cambia dirección en strafe
    CHARGE_SPEED:      900,   // px/s durante un charge
    PURSUE_INERTIA:    0.08,  // factor de giro suave en pursue
  },
};
