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
export const ITEM_BASE_PRICE  = 2000;
export const SELL_RATE        = 0.5;
export const DROP_CHANCE      = 0.04;

// ── Stats de componentes individuales ─────────────────────────────────────────
// Cada componente otorga un pequeño bonus al equiparse (comprarse o dropearse).
export const COMPONENTS = {
  A: { id: 'A', name: 'Catalizador A', desc: '−200ms CD Dash',       color: '#ff4444', stats: { dashCDReduction: 200  } },
  B: { id: 'B', name: 'Catalizador B', desc: '−8% derrape',          color: '#4488ff', stats: { derapeReduction:  0.08 } },
  C: { id: 'C', name: 'Catalizador C', desc: '+8% stacks por kill',  color: '#44ff88', stats: { stackRateBonus:   0.08 } },
  D: { id: 'D', name: 'Catalizador D', desc: '+0.4 HP/s regeneración', color: '#ffdd44', stats: { hpRegen: 0.4 } },
  G: { id: 'G', name: 'Catalizador G', desc: '+2 créditos/s',         color: '#cc44ff', stats: { creditPerSec: 2   } },
};

// ── Stats de items terminados ──────────────────────────────────────────────────
// Regla: item = suma stats componentes + 50% bonus.
const STATS = {
  // Triple mismo componente — suma × 1.5
  AAA: { dashCDReduction: 900  },                          // 3A: 600 +50%
  BBB: { derapeReduction: 0.36 },                          // 3B: 0.24 +50%
  CCC: { stackRateBonus: 0.36, controlReduction: 0.5 },   // 3C: 0.24 +50%
  DDD: { hpRegen: 1.8 },                                   // 3D: 1.2 +50%

  // Doble + uno — combinaciones
  ADD: { dashCDReduction: 300,  hpRegen: 1.2 },            // A+DD
  AAD: { dashCDReduction: 600,  hpRegen: 0.6 },            // AA+D
  BBC: { derapeReduction: 0.24, stackRateBonus: 0.12 },    // BB+C
  CCB: { stackRateBonus:  0.24, derapeReduction: 0.12 },   // CC+B
  ACC: { dashCDReduction: 300,  stackRateBonus: 0.24 },    // A+CC
  DBB: { hpRegen: 0.6,  derapeReduction: 0.24 },           // D+BB
  DDC: { hpRegen: 1.2,  stackRateBonus: 0.12 },            // DD+C
  AAB: { dashCDReduction: 600,  derapeReduction: 0.12 },   // AA+B

  // Uno de cada — suma +50%
  ABC: { dashCDReduction: 300,  derapeReduction: 0.12, stackRateBonus: 0.12 },
  CAD: { stackRateBonus:  0.12, dashCDReduction: 300,  hpRegen: 0.6 },
  DAB: { hpRegen: 0.6,  dashCDReduction: 300, derapeReduction: 0.12 },
  GGG: { creditPerSec: 9 },                                   // 3G: 6+50%
  GGC: { creditPerSec: 6, stackRateBonus: 0.12 },             // GG+C
  GGD: { creditPerSec: 6, hpRegen: 0.6 },                     // GG+D
  GBA: { creditPerSec: 3, derapeReduction: 0.12, dashCDReduction: 300 },  // G+B+A
  AAG: { dashCDReduction: 600, creditPerSec: 3 },             // AA+G
  CBG: { stackRateBonus: 0.12, derapeReduction: 0.12, creditPerSec: 3 },  // C+B+G
  CCG: { stackRateBonus: 0.24, creditPerSec: 3 },                         // CC+G: 0.16+50% / 2+50%
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
    desc: 'Daño letal: revive, explota (daño/área = HP máx −10) y congela enemigos 3s. HP baja a 10 en 3s. +10 HP máx. CD 60s.',
    color: '#ffdd44', stats: STATS.DDD, effect: 'DDD',
  },
  ADD: {
    id: 'ADD', name: 'Amortiguador', components: ['A','D','D'],
    desc: 'Dash contra muro rebota en dirección opuesta. Saltar durante rebote = Caída sin CD. −40% daño de muro y Caída.',
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
    desc: 'Primer enemigo de Embestida es arrastrado 4s. Siguiente Embestida lo eyecta como proyectil que daña enemigos con daño de dash.',
    color: '#ff4488', stats: STATS.AAB, effect: 'AAB',
  },
  ABC: {
    id: 'ABC', name: 'Brújula Activa', components: ['A','B','C'],
    desc: 'Embestir hacia brújula primaria: +10 stacks. Hacia secundaria: +20 stacks.',
    color: '#88aaff', stats: STATS.ABC, effect: 'ABC',
  },
  CAD: {
    id: 'CAD', name: 'Vampiro', components: ['C','A','D'],
    desc: '6% prob. al matar: suelta orbe morado que vaga a 400px/s. Muévete cerca (600px) en dirección similar: +40% vel. Tócalo: cura según velocidad.',
    color: '#aa44ff', stats: STATS.CAD, effect: 'CAD',
  },
  DAB: {
    id: 'DAB', name: 'Maestría', components: ['D','A','B'],
    desc: 'Durante Embestida, cambiar de dirección es instantáneo (0 derrape). Cada quiebre amplifica el daño de esa Embestida +10%.',
    color: '#ffaa88', stats: STATS.DAB, effect: 'DAB',
  },
  GGG: {
    id: 'GGG', name: 'Flipcoin', components: ['G','G','G'],
    desc: 'Daño fluctúa x0.5–x2.5. Si >x2.0 ganas 25–50 créditos. Si <x1.0 pagas 1–25 créditos para forzar x1.0.',
    color: '#cc44ff', stats: STATS.GGG, effect: 'GGG',
  },
  GGC: {
    id: 'GGC', name: 'Auspice', components: ['G','G','C'],
    desc: 'Precios de items bajan 1% por cada enemigo eliminado en los últimos 10s. Sin límite.',
    color: '#cc66ff', stats: STATS.GGC, effect: 'GGC',
  },
  GGD: {
    id: 'GGD', name: 'Clockmaker', components: ['G','G','D'],
    desc: 'El temporizador se agota 2x más rápido. Eliminar un enemigo añade +6s. Seguir la brújula da el doble de stats.',
    color: '#cc88ff', stats: STATS.GGD, effect: 'GGD',
  },
  GBA: {
    id: 'GBA', name: 'Acrobatic', components: ['G','B','A'],
    desc: 'Cada 12s, tu próxima Embestida aérea te vuelve Indetectable: los enemigos te ignoran y atraviesas muros. Dura 4s +1s por cada Embestida durante el efecto.',
    color: '#cc44cc', stats: STATS.GBA, effect: 'GBA',
  },
  AAG: {
    id: 'AAG', name: 'One-Two', components: ['A','A','G'],
    desc: 'Cada 2ª Embestida inflige 25% del daño total de la Embestida anterior como daño extra al primer enemigo golpeado. Los multiplicadores de daño aplican.',
    color: '#ff4488', stats: STATS.AAG, effect: 'AAG',
  },
  CBG: {
    id: 'CBG', name: 'Event Horizon', components: ['C','B','G'],
    desc: '10% prob. al matar: crea un agujero negro (200px) que atrae enemigos a 50px/s. Si un enemigo muere dentro, +10% área y reinicia duración.',
    color: '#8844cc', stats: STATS.CBG, effect: 'CBG',
  },
  CCG: {
    id: 'CCG', name: 'Builder', components: ['C','C','G'],
    desc: '2× daño a muros. Romper un muro da +1 carga (máx 10). Shift sin moverte gasta 1 carga para colocar un muro de 200px frente a ti.',
    color: '#44cc88', stats: STATS.CCG, effect: 'CCG',
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
