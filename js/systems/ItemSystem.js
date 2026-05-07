// js/systems/ItemSystem.js
// Definiciones de componentes e items terminados
// ─────────────────────────────────────────────────────────────────────────────
// GUÍA DE BALANCE — todas las cifras están aquí, no busques en otro lugar.
//
// Stats disponibles:
//   dashCDReduction  : ms que se restan al CD base del dash (base: 2500ms)
//   hpRegen          : HP regenerados por segundo (el engine divide /60 internamente)
//   derapeReduction  : fracción (0–1) de reducción de fricción lateral al derrapar
//   stackRateBonus   : fracción (0–1) de stacks extra por kill
//
// Componentes: stats modestos, un solo stat cada uno, coherente con su letra.
// Items terminados: stats combinados que reflejan sus componentes + bonus por efecto.
// ─────────────────────────────────────────────────────────────────────────────

export const COMPONENT_PRICE = 500;
export const ITEM_BASE_PRICE  = 2500;
export const SELL_RATE        = 0.7;
export const DROP_CHANCE      = 0.04;

// ── Stats de componentes individuales ─────────────────────────────────────────
// Cada componente otorga un pequeño bonus al equiparse (comprarse o dropearse).
export const COMPONENTS = {
  A: { id: 'A', name: 'Catalizador A', desc: '−200ms CD Dash',       color: '#ff4444', stats: { dashCDReduction: 200  } },
  B: { id: 'B', name: 'Catalizador B', desc: '−8% derrape',          color: '#4488ff', stats: { derapeReduction:  0.08 } },
  C: { id: 'C', name: 'Catalizador C', desc: '+8% stacks por kill',  color: '#44ff88', stats: { stackRateBonus:   0.08 } },
  D: { id: 'D', name: 'Catalizador D', desc: '+0.4 HP/s regeneración', color: '#ffdd44', stats: { hpRegen: 0.4 } },
};

// ── Stats de items terminados ──────────────────────────────────────────────────
// Regla general: item = suma stats componentes + ~50% bonus por efecto especial.
// (ej: AAA = 3×A = 600ms CD base → redondeado a 700ms + bonus por Berserker)
const STATS = {
  // Triple mismo componente — máximo de esa stat
  AAA: { dashCDReduction: 700  },                          // 3A: fuerte CD red.
  BBB: { derapeReduction: 0.28 },                          // 3B: control total derrape
  CCC: { stackRateBonus: 0.28, controlReduction: 0.5 },   // 3C: máximo stacks, −40% control
  DDD: { hpRegen: 1.4 },                                   // 3D: fuerte regen

  // Doble + uno — combinaciones
  ADD: { dashCDReduction: 300,  hpRegen: 0.9 },            // A+DD
  AAD: { dashCDReduction: 500,  hpRegen: 0.5 },            // AA+D
  BBC: { derapeReduction: 0.18, stackRateBonus: 0.10 },    // BB+C
  CCB: { stackRateBonus:  0.18, derapeReduction: 0.10 },   // CC+B
  ACC: { dashCDReduction: 250,  stackRateBonus: 0.18 },    // A+CC
  DBB: { hpRegen: 0.5,  derapeReduction: 0.18 },           // D+BB
  DDC: { hpRegen: 0.9,  stackRateBonus: 0.12 },            // DD+C
  AAB: { dashCDReduction: 450,  derapeReduction: 0.10 },   // AA+B

  // Uno de cada — stats mixtos pero menores
  ABC: { dashCDReduction: 200,  derapeReduction: 0.08, stackRateBonus: 0.08 },
  CAD: { stackRateBonus:  0.10, dashCDReduction: 200,  hpRegen: 0.4 },
  DAB: { hpRegen: 0.4,  dashCDReduction: 200, derapeReduction: 0.08 },
};

// ── Items terminados ───────────────────────────────────────────────────────────
export const ITEMS = {
  AAA: {
    id: 'AAA', name: 'Berserker', components: ['A','A','A'],
    desc: 'Embestida y Caída Forzada infligen hasta +100% daño según vida faltante (mín 50%). Cuestan +3 HP (no si HP<25).',
    color: '#ff4444', stats: STATS.AAA, effect: 'AAA',
  },
  BBB: {
    id: 'BBB', name: 'Modo Demonio', components: ['B','B','B'],
    desc: 'Cada 30s, próximo dash aéreo activa Modo Demonio 2s: vel. máx. 1000px/s y control perfecto. Matar reinicia duración. −50% cadencia stacks.',
    color: '#4444ff', stats: STATS.BBB, effect: 'BBB',
  },
  CCC: {
    id: 'CCC', name: 'Incendiario', components: ['C','C','C'],
    desc: 'Derrapar puede incendiar el suelo (20 dmg/s a enemigos). −50% control.',
    color: '#44ff44', stats: STATS.CCC, effect: 'CCC',
  },
  DDD: {
    id: 'DDD', name: 'Fénix', components: ['D','D','D'],
    desc: 'Daño letal recupera HP al límite (baja a 10 en 3s). Cada activación +10 HP máx. CD 60s.',
    color: '#ffdd44', stats: STATS.DDD, effect: 'DDD',
  },
  ADD: {
    id: 'ADD', name: 'Amortiguador', components: ['A','D','D'],
    desc: 'Embestida y Caída Forzada reciben −10 daño por choque contra pared.',
    color: '#ff8844', stats: STATS.ADD, effect: 'ADD',
  },
  AAD: {
    id: 'AAD', name: 'Explosivo', components: ['A','A','D'],
    desc: '25% probabilidad de que enemigos exploten al morir, dañando a los cercanos.',
    color: '#ff6644', stats: STATS.AAD, effect: 'AAD',
  },
  BBC: {
    id: 'BBC', name: 'Rebotar', components: ['B','B','C'],
    desc: 'Aterrizar sobre un enemigo desde un salto causa daño y rebota automáticamente. +5 dmg por rebote consecutivo.',
    color: '#4466ff', stats: STATS.BBC, effect: 'BBC',
  },
  CCB: {
    id: 'CCB', name: 'Acelerador', components: ['C','C','B'],
    desc: 'Tu velocidad límite aumenta según tus créditos actuales (cap 3000 px/s).',
    color: '#44ff66', stats: STATS.CCB, effect: 'CCB',
  },
  ACC: {
    id: 'ACC', name: 'Propulsor', components: ['A','C','C'],
    desc: 'Duplica la distancia y velocidad de Embestida.',
    color: '#88ff44', stats: STATS.ACC, effect: 'ACC',
  },
  DBB: {
    id: 'DBB', name: 'Paciencia', components: ['D','B','B'],
    desc: 'Tras 5s sin dar ni recibir daño, próxima Embestida inflige hasta +999% dmg. CD 5s tras usar.',
    color: '#ffaa44', stats: STATS.DBB, effect: 'DBB',
  },
  DDC: {
    id: 'DDC', name: 'Sand King', components: ['D','D','C'],
    desc: 'Slam a nivel 3 aplica el daño una vez más, +3 dmg por enemigo impactado.',
    color: '#ffcc44', stats: STATS.DDC, effect: 'DDC',
  },
  AAB: {
    id: 'AAB', name: 'Gancho', components: ['A','A','B'],
    desc: 'Primer enemigo de Embestida es arrastrado 4s. Siguiente Embestida lo eyecta como proyectil.',
    color: '#ff4488', stats: STATS.AAB, effect: 'AAB',
  },
  ABC: {
    id: 'ABC', name: 'Brújula Activa', components: ['A','B','C'],
    desc: 'Embestir hacia brújula primaria: +10 stacks. Hacia secundaria: +20 stacks.',
    color: '#88aaff', stats: STATS.ABC, effect: 'ABC',
  },
  CAD: {
    id: 'CAD', name: 'Vampiro', components: ['C','A','D'],
    desc: 'Embestida recupera hasta 3 HP según nivel de momentum (1/2/3).',
    color: '#aa44ff', stats: STATS.CAD, effect: 'CAD',
  },
  DAB: {
    id: 'DAB', name: 'Maestría', components: ['D','A','B'],
    desc: 'Al girar hacia la dirección de la brújula, el giro es instantáneo.',
    color: '#ffaa88', stats: STATS.DAB, effect: 'DAB',
  },
};

export const SHOP_STOCK_MIN = 2;
export const SHOP_STOCK_MAX = 4;

export function rollShopStock() {
  // TEST: all items available in every shop
  return Object.keys(ITEMS);
}

export function getItemPrice(itemId, playerComponents) {
  const comps = playerComponents || [];
  const item  = ITEMS[itemId];
  if (!item) return ITEM_BASE_PRICE;
  const needed = [...item.components];
  const owned  = [...comps];
  let discount = 0;
  for (const c of owned) {
    const idx = needed.indexOf(c);
    if (idx !== -1) { needed.splice(idx, 1); discount += COMPONENT_PRICE; }
  }
  return Math.max(COMPONENT_PRICE, ITEM_BASE_PRICE - discount);
}
