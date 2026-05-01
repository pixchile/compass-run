// js/systems/ShopSystem.js

import {
  COMPONENTS, ITEMS, COMPONENT_PRICE, ITEM_BASE_PRICE, SELL_RATE,
  DROP_CHANCE, rollShopStock, getItemPrice
} from './ItemSystem.js';

export default class ShopSystem {
  constructor() {
    this.components   = [];   // ['A','B','A',...] — max 6 slots totales entre comps e items
    this.equippedItems = [];  // [{ id:'AAA', ... }]
    this.shopStocks   = {};   // { shopId: ['AAA','BBC',...] }
    this.scene        = null;
  }

  setScene(scene) { this.scene = scene; }

  // ─── Inventario ─────────────────────────────────────────────
  get totalSlots() { return 6; }
  get usedSlots()  { return this.components.length + this.equippedItems.length; }
  get freeSlots()  { return this.totalSlots - this.usedSlots; }
  get allItems()   { return this.equippedItems; }

  hasItem(id)      { return this.equippedItems.some(i => i.id === id); }
  hasEffect(id)    { return this.hasItem(id); }

  // ─── Generación de stock de tiendas ─────────────────────────
  initShops(shopIds) {
    for (const id of shopIds) {
      this.shopStocks[id] = rollShopStock();
    }
  }

  getShopStock(shopId) {
    return (this.shopStocks[shopId] || []).map(itemId => ITEMS[itemId]).filter(Boolean);
  }

  // ─── Compra / Venta ─────────────────────────────────────────
  buyComponent(compId, credits) {
    if (!COMPONENTS[compId]) return { ok: false, msg: 'Componente inválido' };
    if (this.freeSlots <= 0) return { ok: false, msg: 'Inventario lleno' };
    if (credits < COMPONENT_PRICE) return { ok: false, msg: 'Créditos insuficientes' };
    this.components.push(compId);
    return { ok: true, cost: COMPONENT_PRICE };
  }

  buyItem(itemId, shopId, credits) {
    const item = ITEMS[itemId];
    if (!item) return { ok: false, msg: 'Item inválido' };
    if (!this.shopStocks[shopId]?.includes(itemId)) return { ok: false, msg: 'No disponible en esta tienda' };
    if (this.freeSlots <= 0) return { ok: false, msg: 'Inventario lleno' };

    const price = getItemPrice(itemId, this.components);
    if (credits < price) return { ok: false, msg: 'Créditos insuficientes' };

    // Consumir componentes coincidentes del inventario
    const needed = [...item.components];
    const remaining = [...this.components];
    for (const c of needed) {
      const idx = remaining.indexOf(c);
      if (idx !== -1) remaining.splice(idx, 1);
    }
    this.components = remaining;

    this.equippedItems.push({ ...item });
    this._applyPassiveStats(item);

    return { ok: true, cost: price };
  }

  sellComponent(index) {
    if (index < 0 || index >= this.components.length) return { ok: false };
    const compId = this.components[index];
    this.components.splice(index, 1);
    return { ok: true, gain: Math.floor(COMPONENT_PRICE * SELL_RATE) };
  }

  sellItem(index) {
    if (index < 0 || index >= this.equippedItems.length) return { ok: false };
    const item = this.equippedItems.splice(index, 1)[0];
    this._removePassiveStats(item);
    const gain = Math.floor(ITEM_BASE_PRICE * SELL_RATE);
    return { ok: true, gain };
  }

  // ─── Drop de componentes por kill ───────────────────────────
  tryDrop(x, y) {
    if (Math.random() > DROP_CHANCE) return null;
    const keys = Object.keys(COMPONENTS);
    const compId = keys[Math.floor(Math.random() * keys.length)];
    return { compId, x, y };
  }

  // ─── Stats pasivas ───────────────────────────────────────────
  _applyPassiveStats(item) {
    if (!this.scene?.player) return;
    const p = this.scene.player;
    const s = item.stats || {};
    if (s.dashCDReduction)   p._dashCDBase = (p._dashCDBase || 2500) - s.dashCDReduction;
    if (s.hpRegen)           p.health.regenRate = (p.health.regenRate || 0.2) + s.hpRegen / 60;
    if (s.stackRateBonus && this.scene.momentum)    this.scene.momentum._stackRateBonus = ((this.scene.momentum._stackRateBonus) || 0) + s.stackRateBonus;
    if (s.stackRateReduction && this.scene.momentum) this.scene.momentum._stackRateMalus = ((this.scene.momentum._stackRateMalus) || 0) + s.stackRateReduction;
    if (s.derapeReduction)   p._derapeReduction = (p._derapeReduction || 0) + s.derapeReduction;
    if (s.controlReduction)  p._controlReduction = (p._controlReduction || 0) + s.controlReduction;
  }

  _removePassiveStats(item) {
    if (!this.scene?.player) return;
    const p = this.scene.player;
    const s = item.stats || {};
    if (s.dashCDReduction)   p._dashCDBase = (p._dashCDBase || 2500) + s.dashCDReduction;
    if (s.hpRegen)           p.health.regenRate = Math.max(0, (p.health.regenRate || 0.2) - s.hpRegen / 60);
    if (s.stackRateBonus && this.scene.momentum)    this.scene.momentum._stackRateBonus  = Math.max(0, (this.scene.momentum._stackRateBonus  || 0) - s.stackRateBonus);
    if (s.stackRateReduction && this.scene.momentum)this.scene.momentum._stackRateMalus  = Math.max(0, (this.scene.momentum._stackRateMalus  || 0) - s.stackRateReduction);
    if (s.derapeReduction)   p._derapeReduction  = Math.max(0, (p._derapeReduction  || 0) - s.derapeReduction);
    if (s.controlReduction)  p._controlReduction = Math.max(0, (p._controlReduction || 0) - s.controlReduction);
  }

  // ─── Reset ───────────────────────────────────────────────────
  reset() {
    this.components    = [];
    this.equippedItems = [];
    this.shopStocks    = {};
  }
}