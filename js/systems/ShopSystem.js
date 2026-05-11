// js/systems/ShopSystem.js

import {
  COMPONENTS, ITEMS, COMPONENT_PRICE, ITEM_BASE_PRICE, SELL_RATE,
  DROP_CHANCE, rollShopStock, getItemPrice
} from './ItemSystem.js';
import { DASH_CD } from '../constants.js';

// â”€â”€ Service costs (easy to tweak) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const REROLL_COST = 300;
export const MYSTERY_BOX_COST = 1800;
export const FIRST_ITEM_TIME_BONUS = 180;

export default class ShopSystem {
  constructor() {
    this.components   = [];   // ['A','B','A',...] â€” max 6 slots totales entre comps e items
    this.equippedItems = [];  // [{ id:'AAA', ... }]
    this.shopStocks   = {};   // { shopId: ['AAA','BBC',...] }
    this._shopHistory  = {};   // { shopId: ['AAA','BBC',...] } â€” items ever seen in this shop
    this._ownedItems   = new Set();
    this._mysteryUsed  = {};
    this.scene        = null;
  }

  setScene(scene) { this.scene = scene; }

  // â”€â”€â”€ Inventario â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  get totalSlots() { return 6; }
  get usedSlots()  { return this.components.length + this.equippedItems.length; }
  get freeSlots()  { return this.totalSlots - this.usedSlots; }
  get allItems()   { return this.equippedItems; }

  hasItem(id)      { return this.equippedItems.some(i => i.id === id); }
  hasEffect(id)    { return this.hasItem(id); }

  // â”€â”€â”€ GeneraciÃ³n de stock de tiendas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  initShops(shopIds) {
    for (const id of shopIds) {
      const stock = rollShopStock();
      this.shopStocks[id] = stock;
      // Seed history with the initial stock so Re-Roll excludes them
      if (!this._shopHistory[id]) this._shopHistory[id] = [];
      for (const itemId of stock) {
        if (!this._shopHistory[id].includes(itemId)) {
          this._shopHistory[id].push(itemId);
        }
      }
    }
  }

  getShopStock(shopId) {
    return (this.shopStocks[shopId] || []).map(itemId => ITEMS[itemId]).filter(Boolean);
  }

  // â”€â”€â”€ Compra / Venta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  buyComponent(compId, credits) {
    if (!COMPONENTS[compId]) return { ok: false, msg: 'Componente invÃ¡lido' };
    if (this.freeSlots <= 0) return { ok: false, msg: 'Inventario lleno' };
    const auspiceDisc = this.scene?.itemEffects?.getAuspiceDiscount() || 0;
    const finalPrice = Math.floor(COMPONENT_PRICE * (1 - auspiceDisc));
    if (credits < finalPrice) return { ok: false, msg: 'CrÃ©ditos insuficientes' };
    this.components.push(compId);
    this._applyComponentStats(compId, +1);
    return { ok: true, cost: finalPrice };
  }

  buyItem(itemId, shopId, credits) {
    const item = ITEMS[itemId];
    if (!item) return { ok: false, msg: 'Item invÃ¡lido' };
    if (!this.shopStocks[shopId]?.includes(itemId)) return { ok: false, msg: 'No disponible en esta tienda' };
    if (this.freeSlots <= 0) return { ok: false, msg: 'Inventario lleno' };

    // Bloquear duplicados si el toggle estÃ¡ OFF
    const allowDupes = localStorage.getItem('cr_allow_duplicates') === 'true';
    if (!allowDupes && this.hasItem(itemId)) return { ok: false, msg: 'Ya tienes este item' };

    const basePrice = getItemPrice(itemId, this.components);
    const auspiceDisc = this.scene?.itemEffects?.getAuspiceDiscount() || 0;
    const price = Math.floor(basePrice * (1 - auspiceDisc));
    if (credits < price) return { ok: false, msg: 'CrÃ©ditos insuficientes' };

    // Consumir componentes coincidentes del inventario y retirar sus stats
    const needed = [...item.components];
    const remaining = [...this.components];
    for (const c of needed) {
      const idx = remaining.indexOf(c);
      if (idx !== -1) {
        remaining.splice(idx, 1);
        this._applyComponentStats(c, -1);  // retirar stat del componente consumido
      }
    }
    this.components = remaining;

    // Retirar del stock de la tienda
    const stockIdx = this.shopStocks[shopId].indexOf(itemId);
    if (stockIdx !== -1) this.shopStocks[shopId].splice(stockIdx, 1);

    // Guardar referencia a la tienda de origen para poder devolver al stock al vender
    this.equippedItems.push({ ...item, _shopId: shopId });
    this._applyPassiveStats(item);

    if (!this._ownedItems.has(itemId)) {
      this._ownedItems.add(itemId);
      if (this.scene) this.scene.timeRemaining += FIRST_ITEM_TIME_BONUS;
    }

    return { ok: true, cost: price };
  }

  sellComponent(index) {
    if (index < 0 || index >= this.components.length) return { ok: false };
    const compId = this.components[index];
    this.components.splice(index, 1);
    this._applyComponentStats(compId, -1);
    return { ok: true, gain: Math.floor(COMPONENT_PRICE * SELL_RATE) };
  }

  sellItem(index) {
    if (index < 0 || index >= this.equippedItems.length) return { ok: false };
    const item = this.equippedItems.splice(index, 1)[0];
    this._removePassiveStats(item);

    // Devolver al stock de la tienda de origen si sigue existiendo
    const originShop = item._shopId;
    if (originShop && this.shopStocks[originShop] && !this.shopStocks[originShop].includes(item.id)) {
      this.shopStocks[originShop].push(item.id);
    }

    const gain = Math.floor(ITEM_BASE_PRICE * SELL_RATE);
    return { ok: true, gain };
  }

  // â”€â”€â”€ Drop de componentes por kill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  tryDrop(x, y) {
    if (Math.random() > DROP_CHANCE) return null;
    const keys = Object.keys(COMPONENTS);
    const compId = keys[Math.floor(Math.random() * keys.length)];
    return { compId, x, y };
  }

  // â”€â”€â”€ Stats pasivas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Aplica stats de un componente individual (sign: +1 al comprar, -1 al vender)
  _applyComponentStats(compId, sign) {
    if (!this.scene?.player) return;
    const comp = COMPONENTS[compId];
    if (!comp?.stats) return;
    const s = comp.stats;
    const p = this.scene.player;
    if (s.dashCDReduction) p._dashCDBase = (p._dashCDBase || DASH_CD) - sign * s.dashCDReduction;
    if (s.hpRegen)         p.health.regenRate = Math.max(0, (p.health.regenRate || 0.2) + sign * s.hpRegen / 60);
    if (s.stackRateBonus && this.scene.momentum)
      this.scene.momentum._stackRateBonus = Math.max(0, (this.scene.momentum._stackRateBonus || 0) + sign * s.stackRateBonus);
    if (s.derapeReduction) p._derapeReduction = Math.max(0, (p._derapeReduction || 0) + sign * s.derapeReduction);
    if (s.creditPerSec && this.scene?.rewardSystem) {
      this.scene.rewardSystem._creditPerSecBonus = Math.max(0, (this.scene.rewardSystem._creditPerSecBonus || 0) + sign * s.creditPerSec);
    }
  }

  _applyPassiveStats(item) {
    if (!this.scene?.player) return;
    const p = this.scene.player;
    const s = item.stats || {};
    if (s.dashCDReduction)   p._dashCDBase = (p._dashCDBase || DASH_CD) - s.dashCDReduction;
    if (s.hpRegen)           p.health.regenRate = (p.health.regenRate || 0.2) + s.hpRegen / 60;
    if (s.stackRateBonus && this.scene.momentum)    this.scene.momentum._stackRateBonus = ((this.scene.momentum._stackRateBonus) || 0) + s.stackRateBonus;
    if (s.stackRateReduction && this.scene.momentum) this.scene.momentum._stackRateMalus = ((this.scene.momentum._stackRateMalus) || 0) + s.stackRateReduction;
    if (s.derapeReduction)   p._derapeReduction = (p._derapeReduction || 0) + s.derapeReduction;
    if (s.controlReduction)  p._controlReduction = (p._controlReduction || 0) + s.controlReduction;
    if (s.attackRadius)  p.attackRadiusMultiplier = (p.attackRadiusMultiplier || 0) + s.attackRadius;
    if (s.amplitude && this.scene?.momentum) this.scene.momentum.addAmplitude(s.amplitude);
    if (s.creditPerSec && this.scene?.rewardSystem) {
      this.scene.rewardSystem._creditPerSecBonus = (this.scene.rewardSystem._creditPerSecBonus || 0) + s.creditPerSec;
    }
  }

  _removePassiveStats(item) {
    if (!this.scene?.player) return;
    const p = this.scene.player;
    const s = item.stats || {};
    if (s.dashCDReduction)   p._dashCDBase = (p._dashCDBase || DASH_CD) + s.dashCDReduction;
    if (s.hpRegen)           p.health.regenRate = Math.max(0, (p.health.regenRate || 0.2) - s.hpRegen / 60);
    if (s.stackRateBonus && this.scene.momentum)    this.scene.momentum._stackRateBonus  = Math.max(0, (this.scene.momentum._stackRateBonus  || 0) - s.stackRateBonus);
    if (s.stackRateReduction && this.scene.momentum)this.scene.momentum._stackRateMalus  = Math.max(0, (this.scene.momentum._stackRateMalus  || 0) - s.stackRateReduction);
    if (s.derapeReduction)   p._derapeReduction  = Math.max(0, (p._derapeReduction  || 0) - s.derapeReduction);
    if (s.controlReduction)  p._controlReduction = Math.max(0, (p._controlReduction || 0) - s.controlReduction);
    if (s.attackRadius)  p.attackRadiusMultiplier = Math.max(0, (p.attackRadiusMultiplier || 0) - s.attackRadius);
    if (s.amplitude && this.scene?.momentum) this.scene.momentum.addAmplitude(-s.amplitude);
    if (s.creditPerSec && this.scene?.rewardSystem) {
      this.scene.rewardSystem._creditPerSecBonus = Math.max(0, (this.scene.rewardSystem._creditPerSecBonus || 0) - s.creditPerSec);
    }
  }

  // â”€â”€â”€ Servicios de tienda â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Re-Roll: Replace shop stock with 1 random item never seen in this shop. */
  rerollShop(shopId, credits) {
    if (credits < REROLL_COST) return { ok: false, msg: 'CrÃ©ditos insuficientes' };
    if (!this.shopStocks[shopId]) return { ok: false, msg: 'Tienda no encontrada' };

    // Collect items never seen in this shop
    const seen = this._shopHistory[shopId] || [];
    const allItemIds = Object.keys(ITEMS);
    const candidates = allItemIds.filter(id => !seen.includes(id));

    if (candidates.length === 0) return { ok: false, msg: 'Ya viste todos los items en esta tienda' };

    const picked = candidates[Math.floor(Math.random() * candidates.length)];

    // Replace stock with just this one item
    this.shopStocks[shopId] = [picked];
    if (!this._shopHistory[shopId]) this._shopHistory[shopId] = [];
    this._shopHistory[shopId].push(picked);

    return { ok: true, cost: REROLL_COST, item: ITEMS[picked] };
  }

  buyMysteryItem(shopId, credits) {
    if (this._mysteryUsed[shopId]) return { ok: false, msg: 'Ya usaste la caja misteriosa en esta tienda' };
    if (this.freeSlots <= 0) return { ok: false, msg: 'Inventario lleno' };
    const auspiceDisc = this.scene?.itemEffects?.getAuspiceDiscount() || 0;
    const finalPrice = Math.floor(MYSTERY_BOX_COST * (1 - auspiceDisc));
    if (credits < finalPrice) return { ok: false, msg: 'Créditos insuficientes' };

    const allowDupes = localStorage.getItem('cr_allow_duplicates') === 'true';
    const allItemIds = Object.keys(ITEMS);
    const candidates = allowDupes
      ? allItemIds
      : allItemIds.filter(id => !this.hasItem(id));

    if (candidates.length === 0) return { ok: false, msg: 'Ya tienes todos los items' };

    const pickedId = candidates[Math.floor(Math.random() * candidates.length)];
    const item = ITEMS[pickedId];

    this.equippedItems.push({ ...item, _shopId: shopId });
    this._applyPassiveStats(item);

    if (!this._ownedItems.has(pickedId)) {
      this._ownedItems.add(pickedId);
      if (this.scene) this.scene.timeRemaining += FIRST_ITEM_TIME_BONUS;
    }

    this._mysteryUsed[shopId] = true;
    return { ok: true, cost: finalPrice, item };
  }



  // â”€â”€â”€ Reset â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  reset() {
    this.components    = [];
    this.equippedItems = [];
    this.shopStocks    = {};
    this._shopHistory   = {};
    this._ownedItems    = new Set();
    this._mysteryUsed   = {};
  }
}