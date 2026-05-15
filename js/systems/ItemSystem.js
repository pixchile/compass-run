// js/systems/ItemSystem.js
// Definiciones de componentes e items terminados
// ─────────────────────────────────────────────────────────────────────────────
// GUÍA DE BALANCE — todas las cifras están aquí, no busques en otro lugar.
//
// Stats disponibles:
//   dashCDReduction  : ms que se restan al CD base del dash (base: DASH_CD)
//   hpRegen          : HP regenerados por segundo (el engine divide /60 internamente)
//   derapeReduction  : fracción (0–1) de reducción de fricción lateral al derrapar
//   stackRateBonus   : fracción (0–1) de stacks extra por kill
//
// Componentes: stats modestos, un solo stat cada uno, coherente con su letra.
// Items terminados: stats combinados que reflejan sus componentes + bonus por efecto.
// ─────────────────────────────────────────────────────────────────────────────

export const COMPONENT_PRICE = 500;
export const ITEM_BASE_PRICE  = 2500;
export const SELL_RATE        = 0.5;
export const DROP_CHANCE      = 0.04;

// ── Stats de componentes individuales ─────────────────────────────────────────
// Cada componente otorga un pequeño bonus al equiparse (comprarse o dropearse).
export const COMPONENTS = {
  A: { id: 'A', name: 'Catalizador A', desc: '−200ms CD Dash',       color: '#ff4444', stats: { dashCDReduction: 200  } },
  B: { id: 'B', name: 'Catalizador B', desc: '−8% derrape',          color: '#4488ff', stats: { derapeReduction:  0.08 } },
  C: { id: 'C', name: 'Catalizador C', desc: '+8% stacks por kill',  color: '#44ff88', stats: { stackRateBonus:   0.08 } },
  D: { id: 'D', name: 'Catalizador D', desc: '+0.4 HP/s regeneración', color: '#ffdd44', stats: { hpRegen: 0.4 } },
  G: { id: 'G', name: 'Catalizador G', desc: '+0.5 créditos/s',         color: '#cc44ff', stats: { creditPerSec: 2   } },
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
  BBC: { derapeReduction: 0.24, stackRateBonus: 0.12, attackRadius: 0.5 }, // BB+C
  CCB: { stackRateBonus:  0.24, derapeReduction: 0.12 },   // CC+B
  ACC: { dashCDReduction: 300,  stackRateBonus: 0.24 },    // A+CC
  DBB: { hpRegen: 0.6,  derapeReduction: 0.24, amplitude: 10 }, // D+BB
  DDC: { hpRegen: 1.2,  stackRateBonus: 0.12, attackRadius: 0.5 }, // DD+C
  AAB: { dashCDReduction: 600,  derapeReduction: 0.12 },   // AA+B

  // Uno de cada — suma +50%
  ABC: { dashCDReduction: 300,  derapeReduction: 0.12, stackRateBonus: 0.12 },
  CAD: { stackRateBonus:  0.12, dashCDReduction: 300,  hpRegen: 0.6 },
  DAB: { hpRegen: 0.6,  dashCDReduction: 300, derapeReduction: 0.12 },
  GGG: { creditPerSec: 2.25 },                                   // 3G: 6+50%
  GGC: { creditPerSec: 6, stackRateBonus: 0.12 },             // GG+C
  GGD: { creditPerSec: 1.5, hpRegen: 0.6 },                     // GG+D
  GBA: { creditPerSec: 0.75, derapeReduction: 0.12, dashCDReduction: 300 },  // G+B+A
  AAG: { dashCDReduction: 600, creditPerSec: 3 },             // AA+G
  CBG: { stackRateBonus: 0.12, derapeReduction: 0.12, creditPerSec: 3 },  // C+B+G
  CCG: { stackRateBonus: 0.24, creditPerSec: 3 },                         // CC+G: 0.16+50% / 2+50%
};

// ── Items terminados ───────────────────────────────────────────────────────────
export const ITEMS = {
  AAA: {
    id: 'AAA', name: 'Berserker', components: ['A','A','A'],
    desc: 'Embestida y Caída Forzada infligen hasta el doble de daño según vida faltante, pero cuestan vida.',
    color: '#ff4444', stats: STATS.AAA, effect: 'AAA',
  },
  BBB: {
    id: 'BBB', name: 'Modo Demonio', components: ['B','B','B'],
    desc: 'Cada cierto tiempo, tu próximo dash aéreo activa el modo demonio, con velocidad aumentada y control perfecto. Matar reinicia duración.',
    color: '#4444ff', stats: STATS.BBB, effect: 'BBB',
  },
  CCC: {
    id: 'CCC', name: 'Incendiario', components: ['C','C','C'],
    desc: 'Derrapar incendia el suelo para dañar a quienes lo pisen. Tienes menor control al virar.',
    color: '#44ff44', stats: STATS.CCC, effect: 'CCC',
  },
  DDD: {
    id: 'DDD', name: 'Fénix', components: ['D','D','D'],
    desc: 'Cada cierto tiempo, al recibir daño letal, revive. Explota infligiendo daño y congelando a enemigos. Cada vez que ocurra, tu vida máxima aumenta.',
    color: '#ffdd44', stats: STATS.DDD, effect: 'DDD',
  },
  ADD: {
    id: 'ADD', name: 'Amortiguador', components: ['A','D','D'],
    desc: 'La embestidas contra muros rebotan y tienes daño reducido por chocar.',
    color: '#ff8844', stats: STATS.ADD, effect: 'ADD',
  },
  AAD: {
    id: 'AAD', name: 'Explosivo', components: ['A','A','D'],
    desc: 'Probabilidad de que enemigos exploten al morir, dañando a los cercanos.',
    color: '#ff6644', stats: STATS.AAD, effect: 'AAD',
  },
  BBC: {
    id: 'BBC', name: 'Rebotar', components: ['B','B','C'],
    desc: 'Puedes saltar entre enemigos aumentando el daño cada vez. Caer reinicia el daño acumulado.',
    color: '#4466ff', stats: STATS.BBC, effect: 'BBC',
  },
  CCB: {
    id: 'CCB', name: 'Acelerador', components: ['C','C','B'],
    desc: 'Tu velocidad límite aumenta según tus créditos actuales.',
    color: '#44ff66', stats: STATS.CCB, effect: 'CCB',
  },
  ACC: {
    id: 'ACC', name: 'Propulsor', components: ['A','C','C'],
    desc: 'Duplica la distancia y velocidad de Embestida.',
    color: '#88ff44', stats: STATS.ACC, effect: 'ACC',
  },
  DBB: {
    id: 'DBB', name: 'Paciencia', components: ['D','B','B'],
    desc: 'Tras no recibir daño unos segundos, tu próxima embestida inflige daño verdadero adicional.',
    color: '#ffaa44', stats: STATS.DBB, effect: 'DBB',
  },
  DDC: {
    id: 'DDC', name: 'Sand King', components: ['D','D','C'],
    desc: 'La caída forzada golpea una segunda vez, ampliando el daño según la cantidad de enemigos alcanzados.',
    color: '#ffcc44', stats: STATS.DDC, effect: 'DDC',
  },
  AAB: {
    id: 'AAB', name: 'Gancho', components: ['A','A','B'],
    desc: 'Embestida arrastra al enemigo alcanzado contigo. Puedes eyectarlo como proyectil y dañar a los demás.',
    color: '#ff4488', stats: STATS.AAB, effect: 'AAB',
  },
  ABC: {
    id: 'ABC', name: 'Brújula Activa', components: ['A','B','C'],
    desc: 'Embestir siguiendo una brújula aumenta tu Momentum.',
    color: '#88aaff', stats: STATS.ABC, effect: 'ABC',
  },
  CAD: {
    id: 'CAD', name: 'Vampiro', components: ['C','A','D'],
    desc: 'Hay una pequeña chance de que los enemigos suelten orbes al morir. Estar cerca de este orbe aumenta tu velocidad y puedes consumirlo para restaurar vida.',
    color: '#aa44ff', stats: STATS.CAD, effect: 'CAD',
  },
  DAB: {
    id: 'DAB', name: 'Maestría', components: ['D','A','B'],
    desc: 'Durante Embestida, cambiar de dirección es instantáneo. Por cada cambio, aumentas el daño.',
    color: '#ffaa88', stats: STATS.DAB, effect: 'DAB',
  },
  GGG: {
    id: 'GGG', name: 'Flipcoin', components: ['G','G','G'],
    desc: 'Tu daño puede multiplicarse positiva o negativamente. Si te va bien, obtienes oro, sino, pierdes.',
    color: '#cc44ff', stats: STATS.GGG, effect: 'GGG',
  },
  GGC: {
    id: 'GGC', name: 'Auspice', components: ['G','G','C'],
    desc: '1% de descuento en tu siguiente Item por cada enemigo eliminado en los últimos 10s. ¡No lo dejes pasar!',
    color: '#cc66ff', stats: STATS.GGC, effect: 'GGC',
  },
  GGD: {
    id: 'GGD', name: 'Clockmaker', components: ['G','G','D'],
    desc: 'El temporizador se agota más rápido, pero recuperas tiempo al matar enemigos.',
    color: '#cc88ff', stats: STATS.GGD, effect: 'GGD',
  },
  GBA: {
    id: 'GBA', name: 'Fantasma', components: ['G','B','A'],
    desc: 'Cada cierto tiempo,  tu próxima Embestida aérea te vuelve indetectable y atraviesas muros. La duración se extiende con embestidas.',
    color: '#cc44cc', stats: STATS.GBA, effect: 'GBA',
  },
  AAG: {
    id: 'AAG', name: 'One-Two', components: ['A','A','G'],
    desc: 'Cada segunda Embestida inflige un poco del daño total de la Embestida anterior como daño extra al primer enemigo golpeado. Es daño verdadero.',
    color: '#ff4488', stats: STATS.AAG, effect: 'AAG',
  },
  CBG: {
    id: 'CBG', name: 'Event Horizon', components: ['C','B','G'],
    desc: 'Pequeña chance de que al matar, nazca un agujero negro que atrae enemigos. Si un enemigo muere dentro, aumenta la duración y el alcance.',
    color: '#8844cc', stats: STATS.CBG, effect: 'CBG',
  },
  CCG: {
    id: 'CCG', name: 'Builder', components: ['C','C','G'],
    desc: 'Duplica el daño contra muros. Romper un muro te permite colocar muros al estar quieto y presionar Embestida',
    color: '#44cc88', stats: STATS.CCG, effect: 'CCG',
  },
};

export const SHOP_STOCK_MIN = 1;
export const SHOP_STOCK_MAX = 3;

export function rollShopStock() {
  const pool = Object.keys(ITEMS);
  const count = SHOP_STOCK_MIN + Math.floor(Math.random() * (SHOP_STOCK_MAX - SHOP_STOCK_MIN + 1));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
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
