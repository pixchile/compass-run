// js/scenes/ShopUI.js

import { COMPONENTS, ITEMS, COMPONENT_PRICE, getItemPrice } from '../systems/ItemSystem.js';
import { W, H } from '../constants.js';

const PAD   = 32;
const COL_W = 260;
const ROW_H = 52;

export default class ShopUI {
  constructor(scene) {
    this.scene    = scene;
    this.visible  = false;
    this.shopId   = null;

    this._tab     = 'buy';    // 'buy' | 'sell'
    this._cursor  = 0;
    this._items   = [];       // lista actual visible

    this._keys = {
      up:    scene.input.keyboard.addKey('W'),
      down:  scene.input.keyboard.addKey('S'),
      left:  scene.input.keyboard.addKey('A'),
      right: scene.input.keyboard.addKey('D'),
      enter: scene.input.keyboard.addKey('SPACE'),
      close: scene.input.keyboard.addKey('ESC'),
    };
    this._prev = {};

    this._root = scene.add.container(0, 0).setDepth(2000).setAlpha(0);
    this._build();
  }

  _build() {
    const cx = W / 2, cy = H / 2;
    const bw = COL_W * 2 + PAD * 3, bh = 480;
    const bx = cx - bw / 2, by = cy - bh / 2;

    // Fondo
    this._bg = this.scene.add.graphics();
    this._bg.fillStyle(0x0a0a0f, 0.97);
    this._bg.fillRoundedRect(bx, by, bw, bh, 12);
    this._bg.lineStyle(1.5, 0x334455, 1);
    this._bg.strokeRoundedRect(bx, by, bw, bh, 12);

    this._title = this.scene.add.text(cx, by + 22, 'TIENDA', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    this._credits = this.scene.add.text(cx, by + 46, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffdd44'
    }).setOrigin(0.5);

    this._slots = this.scene.add.text(cx, by + 64, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#888888'
    }).setOrigin(0.5);

    // Tabs
    this._tabBuy  = this._makeTab('COMPRAR', bx + PAD, by + 84, () => this._setTab('buy'));
    this._tabSell = this._makeTab('VENDER',  bx + COL_W + PAD * 2, by + 84, () => this._setTab('sell'));

    // Lista
    this._listContainer = this.scene.add.container(0, 0);

    // Detalle
    this._detail = this.scene.add.text(cx, by + bh - 60, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#aaaaaa',
      wordWrap: { width: bw - PAD * 2 }, align: 'center'
    }).setOrigin(0.5);

    this._hint = this.scene.add.text(cx, by + bh - 24, 'W/S navegar  ·  ESPACIO comprar/vender  ·  ESC cerrar', {
      fontFamily: 'monospace', fontSize: '11px', color: '#445566'
    }).setOrigin(0.5);

    this._root.add([this._bg, this._title, this._credits, this._slots,
      this._tabBuy, this._tabSell, this._listContainer, this._detail, this._hint]);
  }

  _makeTab(label, x, y, onClick) {
    const t = this.scene.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa',
      backgroundColor: '#1a1a2a', padding: { x: 14, y: 6 }
    }).setInteractive();
    t.on('pointerdown', onClick);
    t.on('pointerover', () => t.setStyle({ color: '#ffffff' }));
    t.on('pointerout',  () => this._refreshTabs());
    this._root.add(t);
    return t;
  }

  _refreshTabs() {
    this._tabBuy.setStyle({ color: this._tab === 'buy' ? '#ffdd44' : '#aaaaaa' });
    this._tabSell.setStyle({ color: this._tab === 'sell' ? '#ffdd44' : '#aaaaaa' });
  }

  _setTab(tab) {
    this._tab = tab;
    this._cursor = 0;
    this._refreshTabs();
    this._buildList();
  }

  _buildList() {
    this._listContainer.removeAll(true);
    this._items = [];

    const shop  = this.scene.shopSystem;
    const cx = W / 2, cy = H / 2;
    const bh = 480;
    const startY = cy - bh / 2 + 115;

    if (this._tab === 'buy') {
      // Sección componentes
      this._addSectionLabel('─── Componentes ───', cx, startY);
      const comps = Object.values(COMPONENTS);
      comps.forEach((comp, i) => {
        this._addRow({
          label: `[${comp.id}] ${comp.name}`,
          sub:   comp.desc,
          price: COMPONENT_PRICE,
          color: comp.color,
          y: startY + 22 + i * ROW_H,
          onBuy: () => this._buyComponent(comp.id),
        });
      });

      // Sección items terminados de la tienda
      const stock = shop.getShopStock(this.shopId);
      if (stock.length > 0) {
        this._addSectionLabel('─── Items disponibles ───', cx, startY + 22 + comps.length * ROW_H + 8);
        stock.forEach((item, i) => {
          const price = getItemPrice(item.id, shop.components);
          this._addRow({
            label: item.name,
            sub:   `[${item.id}] ${item.components.join('+')}`,
            price,
            color: item.color,
            y: startY + 22 + comps.length * ROW_H + 30 + i * ROW_H,
            onBuy: () => this._buyItem(item.id),
          });
        });
      }
    } else {
      // Vender componentes
      if (shop.components.length === 0 && shop.equippedItems.length === 0) {
        this.scene.add.text(cx, startY + 20, 'Inventario vacío', {
          fontFamily: 'monospace', fontSize: '13px', color: '#555555'
        }).setOrigin(0.5);
        return;
      }

      this._addSectionLabel('─── Componentes ───', cx, startY);
      shop.components.forEach((compId, i) => {
        const comp = COMPONENTS[compId];
        this._addRow({
          label: `[${comp.id}] ${comp.name}`,
          sub:   `Vender por ${Math.floor(COMPONENT_PRICE * 0.7)} cr`,
          price: null,
          color: comp.color,
          y: startY + 22 + i * ROW_H,
          onBuy: () => this._sellComponent(i),
        });
      });

      const baseY = startY + 22 + shop.components.length * ROW_H + 8;
      if (shop.equippedItems.length > 0) {
        this._addSectionLabel('─── Items equipados ───', cx, baseY);
        shop.equippedItems.forEach((item, i) => {
          this._addRow({
            label: item.name,
            sub:   `Vender por ${Math.floor(2500 * 0.7)} cr`,
            price: null,
            color: item.color,
            y: baseY + 22 + i * ROW_H,
            onBuy: () => this._sellItem(i),
          });
        });
      }
    }

    this._refreshCursor();
  }

  _addSectionLabel(text, x, y) {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: 'monospace', fontSize: '11px', color: '#445566'
    }).setOrigin(0.5);
    this._listContainer.add(t);
  }

  _addRow({ label, sub, price, color, y, onBuy }) {
    const cx = W / 2;
    const idx = this._items.length;

    const bg = this.scene.add.graphics();
    bg.setInteractive(new Phaser.Geom.Rectangle(cx - 260, y - 2, 520, ROW_H - 6), Phaser.Geom.Rectangle.Contains);
    bg.on('pointerover', () => { this._cursor = idx; this._refreshCursor(); });
    bg.on('pointerdown', onBuy);

    const nameText = this.scene.add.text(cx - 240, y + 4, label, {
      fontFamily: 'monospace', fontSize: '13px', color
    });
    const subText = this.scene.add.text(cx - 240, y + 22, sub, {
      fontFamily: 'monospace', fontSize: '11px', color: '#666666'
    });
    const priceText = price !== null ? this.scene.add.text(cx + 240, y + 12, `${price} cr`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffdd44'
    }).setOrigin(1, 0.5) : null;

    this._listContainer.add([bg, nameText, subText]);
    if (priceText) this._listContainer.add(priceText);

    this._items.push({ bg, nameText, subText, priceText, onBuy });
  }

  _refreshCursor() {
    this._items.forEach((row, i) => {
      const sel = i === this._cursor;
      row.bg.clear();
      if (sel) {
        row.bg.fillStyle(0x1a2a3a, 0.9);
        row.bg.fillRoundedRect(W / 2 - 260, row.nameText.y - 4, 520, ROW_H - 4, 6);
        row.bg.lineStyle(1, 0x4488ff, 0.6);
        row.bg.strokeRoundedRect(W / 2 - 260, row.nameText.y - 4, 520, ROW_H - 4, 6);
      }
    });

    // Detalle del item seleccionado
    const cur = this._items[this._cursor];
    if (!cur) return;
    // Buscar item completo para mostrar descripción
    const shop = this.scene.shopSystem;
    let desc = '';
    if (this._tab === 'buy') {
      const stock = shop.getShopStock(this.shopId);
      const compKeys = Object.keys(COMPONENTS);
      const allBuyable = [...compKeys.map(k => ({ type:'comp', id:k })), ...stock.map(s => ({ type:'item', id:s.id }))];
      const entry = allBuyable[this._cursor];
      if (entry?.type === 'item') desc = ITEMS[entry.id]?.desc || '';
    }
    this._detail.setText(desc);
  }

  _buyComponent(compId) {
    const shop  = this.scene.shopSystem;
    const cr    = this.scene.rewardSystem.credits;
    const result = shop.buyComponent(compId, cr);
    if (result.ok) {
      this.scene.rewardSystem.credits -= result.cost;
      this._toast(`+[${compId}] comprado`);
      this._refresh();
    } else {
      this._toast(result.msg, true);
    }
  }

  _buyItem(itemId) {
    const shop   = this.scene.shopSystem;
    const cr     = this.scene.rewardSystem.credits;
    const result = shop.buyItem(itemId, this.shopId, cr);
    if (result.ok) {
      this.scene.rewardSystem.credits -= result.cost;
      this._toast(`✓ ${ITEMS[itemId].name} equipado`);
      this._refresh();
    } else {
      this._toast(result.msg, true);
    }
  }

  _sellComponent(index) {
    const shop   = this.scene.shopSystem;
    const result = shop.sellComponent(index);
    if (result.ok) {
      this.scene.rewardSystem.credits += result.gain;
      this._toast(`+${result.gain} cr`);
      this._refresh();
    }
  }

  _sellItem(index) {
    const shop   = this.scene.shopSystem;
    const result = shop.sellItem(index);
    if (result.ok) {
      this.scene.rewardSystem.credits += result.gain;
      this._toast(`+${result.gain} cr`);
      this._refresh();
    }
  }

  _toast(msg, isError = false) {
    const t = this.scene.add.text(W / 2, H / 2 - 200, msg, {
      fontFamily: 'monospace', fontSize: '14px',
      color: isError ? '#ff4444' : '#44ff88',
      backgroundColor: '#00000099', padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setDepth(2100);
    this.scene.tweens.add({ targets: t, alpha: 0, y: t.y - 30, duration: 1200, onComplete: () => t.destroy() });
  }

  _refresh() {
    this._credits.setText(`Créditos: ${Math.floor(this.scene.rewardSystem.credits)}`);
    this._slots.setText(`Slots: ${this.scene.shopSystem.usedSlots} / ${this.scene.shopSystem.totalSlots}`);
    this._buildList();
  }

  // ─── Abrir / Cerrar ─────────────────────────────────────────
  open(shopId) {
    this.shopId  = shopId;
    this.visible = true;
    this._tab    = 'buy';
    this._cursor = 0;
    this._root.setAlpha(1);
    this._refreshTabs();
    this._refresh();
  }

  close() {
    this.visible = false;
    this._root.setAlpha(0);
    this._listContainer.removeAll(true);
    this._items = [];
  }

  // ─── Update (llamado desde Game.update) ─────────────────────
  update() {
    if (!this.visible) return;

    const up    = this._keys.up.isDown;
    const down  = this._keys.down.isDown;
    const enter = this._keys.enter.isDown;
    const close = this._keys.close.isDown;
    const left  = this._keys.left.isDown;
    const right = this._keys.right.isDown;

    if (up && !this._prev.up && this._items.length > 0) {
      this._cursor = (this._cursor - 1 + this._items.length) % this._items.length;
      this._refreshCursor();
    }
    if (down && !this._prev.down && this._items.length > 0) {
      this._cursor = (this._cursor + 1) % this._items.length;
      this._refreshCursor();
    }
    if ((left && !this._prev.left)) this._setTab('buy');
    if ((right && !this._prev.right)) this._setTab('sell');
    if (enter && !this._prev.enter && this._items[this._cursor]) {
      this._items[this._cursor].onBuy();
    }
    if (close && !this._prev.close) this.close();

    this._prev = { up, down, enter, close, left, right };
  }
}