// js/systems/ItemSystem.js
// Definiciones de componentes e items terminados

export const COMPONENT_PRICE = 500;
export const ITEM_BASE_PRICE  = 2500;
export const SELL_RATE        = 0.7;  // 70% del valor al vender
export const DROP_CHANCE      = 0.04; // 4% por kill

export const COMPONENTS = {
  A: { id: 'A', name: 'Catalizador A', desc: '-CD Dash',         color: '#ff4444' },
  B: { id: 'B', name: 'Catalizador B', desc: '-Derrape',         color: '#4488ff' },
  C: { id: 'C', name: 'Catalizador C', desc: '+Stacks',          color: '#44ff88' },
  D: { id: 'D', name: 'Catalizador D', desc: '+HP Reg',          color: '#ffdd44' },
};

// Stats base que dan los componentes al combinarse en un item terminado
const STATS = {
  AAA: { dashCDReduction: 1500 },
  BBB: { derapeReduction: 0.20, stackRateReduction: 0.50 },
  CCC: { stackRateBonus: 0.30, controlReduction: 0.40 },
  DDD: { hpRegen: 1.0 },
  ADD: { dashCDReduction: 1000, hpRegen: 0.6 },
  AAD: { dashCDReduction: 1000, hpRegen: 0.4 },
  BBC: { derapeReduction: 0.20 },
  CCB: { stackRateBonus: 0.15, derapeReduction: 0.10 },
  ACC: { dashCDReduction: 1000, stackRateBonus: 0.20 },
  DBB: { hpRegen: 0.4, derapeReduction: 0.15 },
  DDC: { hpRegen: 0.6, stackRateBonus: 0.10 },
  AAB: { dashCDReduction: 2000, derapeReduction: 0.10 },
  ABC: { derapeReduction: 0.10 },   // stats mixtos
  CAD: {},
  DAB: { derapeReduction: 0.10, hpRegen: 0.3 },
};

export const ITEMS = {
  AAA: {
    id: 'AAA', name: 'Berserker', components: ['A','A','A'],
    desc: 'Embestida y Caída Forzada infligen hasta +70% de daño según vida faltante (mín 30%). Cuestan +3 HP (no si HP<30).',
    color: '#ff4444', stats: STATS.AAA,
    effect: 'AAA',
  },
  BBB: {
    id: 'BBB', name: 'Modo Demonio', components: ['B','B','B'],
    desc: 'Cada 30s, próximo dash aéreo activa Modo Demonio 2s: vel. máx. 1000px/s y control perfecto. Matar reinicia duración. -50% cadencia stacks.',
    color: '#4444ff', stats: STATS.BBB,
    effect: 'BBB',
  },
  CCC: {
    id: 'CCC', name: 'Incendiario', components: ['C','C','C'],
    desc: 'Derrapar puede incendiar el suelo (20 dmg/s a enemigos). -40% control.',
    color: '#44ff44', stats: STATS.CCC,
    effect: 'CCC',
  },
  DDD: {
    id: 'DDD', name: 'Fénix', components: ['D','D','D'],
    desc: 'Daño letal recupera HP al límite (baja a 10 en 3s). Cada activación +10 HP máx. CD 60s. Si HP>99: Embestida tiene alcance reducido.',
    color: '#ffdd44', stats: STATS.DDD,
    effect: 'DDD',
  },
  ADD: {
    id: 'ADD', name: 'Amortiguador', components: ['A','D','D'],
    desc: 'Embestida y Caída Forzada reciben -10 de daño por choque.',
    color: '#ff8844', stats: STATS.ADD,
    effect: 'ADD',
  },
  AAD: {
    id: 'AAD', name: 'Explosivo', components: ['A','A','D'],
    desc: 'Posibilidad de que enemigos exploten al morir, dañando a cercanos.',
    color: '#ff6644', stats: STATS.AAD,
    effect: 'AAD',
  },
  BBC: {
    id: 'BBC', name: 'Rebotar', components: ['B','B','C'],
    desc: 'Cada 3s, próximo slam sobre enemigo rebota. +10 dmg por rebote consecutivo (máx 300).',
    color: '#4466ff', stats: STATS.BBC,
    effect: 'BBC',
  },
  CCB: {
    id: 'CCB', name: 'Acelerador', components: ['C','C','B'],
    desc: 'Tu velocidad límite en todos los niveles aumenta a tu cantidad de créditos actuales (cap 3000).',
    color: '#44ff66', stats: STATS.CCB,
    effect: 'CCB',
  },
  ACC: {
    id: 'ACC', name: 'Propulsor', components: ['A','C','C'],
    desc: 'Duplica la distancia y velocidad de Embestida.',
    color: '#88ff44', stats: STATS.ACC,
    effect: 'ACC',
  },
  DBB: {
    id: 'DBB', name: 'Paciencia', components: ['D','B','B'],
    desc: 'Tras 5s sin dar ni recibir daño, próxima Embestida inflige +100% dmg/s hasta 999%.',
    color: '#ffaa44', stats: STATS.DBB,
    effect: 'DBB',
  },
  DDC: {
    id: 'DDC', name: 'Sand King', components: ['D','D','C'],
    desc: 'Slam a lvl3 aplica el daño una vez más, +3 dmg por enemigo impactado.',
    color: '#ffcc44', stats: STATS.DDC,
    effect: 'DDC',
  },
  AAB: {
    id: 'AAB', name: 'Gancho', components: ['A','A','B'],
    desc: 'Primer enemigo impactado por Embestida es arrastrado 4s. Siguiente Embestida lo eyecta como proyectil.',
    color: '#ff4488', stats: STATS.AAB,
    effect: 'AAB',
  },
  ABC: {
    id: 'ABC', name: 'Brújula Activa', components: ['A','B','C'],
    desc: 'Embestir hacia brújula primaria (lenta): +10 stacks. Hacia secundaria (rápida): +20 stacks.',
    color: '#88aaff', stats: STATS.ABC,
    effect: 'ABC',
  },
  CAD: {
    id: 'CAD', name: 'Vampiro', components: ['C','A','D'],
    desc: 'Embestida recupera hasta 3 HP según nivel de momentum (1/2/3).',
    color: '#aa44ff', stats: STATS.CAD,
    effect: 'CAD',
  },
  DAB: {
    id: 'DAB', name: 'Maestría', components: ['D','A','B'],
    desc: 'Al girar hacia la dirección de la brújula, el giro es instantáneo.',
    color: '#ffaa88', stats: STATS.DAB,
    effect: 'DAB',
  },
};

// Cuántos items terminados aparecen por tienda (aleatorio entre min y max)
export const SHOP_STOCK_MIN = 2;
export const SHOP_STOCK_MAX = 4;

export function rollShopStock() {
  const keys = Object.keys(ITEMS);
  const count = SHOP_STOCK_MIN + Math.floor(Math.random() * (SHOP_STOCK_MAX - SHOP_STOCK_MIN + 1));
  const shuffled = [...keys].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getItemPrice(itemId, playerComponents) {
  const comps = playerComponents || [];
  const item = ITEMS[itemId];
  if (!item) return ITEM_BASE_PRICE;
  const needed = [...item.components]; // e.g. ['A','A','D']
  const owned  = [...comps];
  let discount = 0;
  for (const c of owned) {
    const idx = needed.indexOf(c);
    if (idx !== -1) { needed.splice(idx, 1); discount += COMPONENT_PRICE; }
  }
  return Math.max(COMPONENT_PRICE, ITEM_BASE_PRICE - discount);
}
