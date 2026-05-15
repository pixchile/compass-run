export const W = 880, H = 620;
export const ARENA = { x: 55, y: 58, w: 4000, h: 4000 };
export const TRAIL_MAX = 16;
export const L2 = 40, L3 = 50, SMAX = 90;

export const MAX_SPD = [0, 250,  350,  400];
export const TURN_K  = [0, 0.24, 0.12, 0.06];
export const STOP_K  = [0, 0.24, 0.12, 0.06];

// Jump params [_, L1, L2, L3]
export const JUMP_DUR    = [0,  400,  500,  600];
export const JUMP_HMAX   = [0,   28,   54,   84];
export const JUMP_DIST_K = [0,  0.72, 0.92, 1.12];

// Dash
export const DASH_DUR = 500;
export const DASH_CD  = 2000;
export const DASH_SPD = 2.0;

// Health
export const HP_MAX             = 100;
export const HP_DMG_DASH_WALL   = 0.01;
export const HP_DMG_ENEMY_HIT   = 1;
export const HP_DMG_VOID        = 1000;
export const HP_REGEN_DELAY     = 4000;
export const HP_REGEN_RATE      = 0.2;


// Muros destructibles
export const WALL_DEFAULT_HP = 300;
export const WALL_CHUNK_SIZE = 80; // px por segmento al cargar muros (rotura parcial)
export const DASH_WALL_DAMAGE_FACTOR = 0.1; // 10% de la velocidad de impacto
export const ENEMY_WALL_DAMAGE_RATE = 15;  // HP/segundo que un enemigo atascado inflige al muro
export const ENEMY_WALL_BREAK_RANGE = 800; // distancia máxima jugador para que enemigo rompa muros
export const ENEMY_REACTION_RADIUS = 400; // radio deteccion jugador (histeresis: ×2 para desenganche)

export const C = {
  L1: 0x4488ff, L2: 0xffaa22, L3: 0xff3322,
  compass: 0xffff44, arena: 0x0c1020, grid: 0x131825, wall: 0x28384e,
  hpHigh: 0x44dd77, hpMid: 0xffcc22, hpLow: 0xff3322,
};

// Wall Jump Configuration
export const WALL_JUMP = {
  STICK_DURATION: 2000,
  GRACE_WINDOW: 100, // período de gracia en el que no pierdes velocidad por esperar en la pared
  PENALTY_MIN_FACTOR: 0.8, // reducción de velocidad por tardar mucho en la pared.
  COMPASS_BONUS: 1.5, // si saltar desde un muro coincide con la dirección del compass, saltas más.
  SPEEDS: [0, 500, 600, 700],
  STACK_BONUS: [0, 4, 2, 0], // momentum obtenido por walljump por nivel.
  STICK_DAMAGE_THRESHOLD: 940, // a partir de esta velocidad, llegar a una pared con un salto lastima al jugador.
  STICK_DAMAGE_AMOUNT: 3 // daño por aferrarse con mucha velocidad a las paredes.
};


export const ATTACK_RADIOS = {
    1: 50,
    2: 60,
    3: 70
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

export const REWARDS = {
  ORB_DELAY:            550,
  ORB_RADIUS:             20,
  ORB_HEAL_MIN:            1,
  ORB_HEAL_MAX:           25,
  ORB_HEAL_SPEED_CAP:   1200,

  CREDIT_BASE_PER_SEC:     1,
  CREDIT_TICK_RATE:      100,
  CREDIT_SPEED_FACTOR: 0.0001,

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
  heal:       { primary: 0.2, secondary: 0.4 },
  credit:     { primary: 0.6, secondary: 1.2 },
  momentum:   { primary: 0.5, secondary: 1 },
  dashCd:     { primary: 0.1, secondary: 0.2 },
  trueDamage: { primary: 0.03, secondary: 0.06 },
};