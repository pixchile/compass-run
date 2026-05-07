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
    this._scrollY = 0;
    this._contentHeight = 0;

    // Reutilizar las keys del PlayerInput para evitar conflictos con Phaser
    this._kb = scene.player?.input?.kb || scene.input.keyboard.addKeys('W,A,S,D,SPACE');
    this._prev = {};

    this._root = scene.add.container(0, 0).setDepth(2000).setAlpha(0);
    this._build();
  }

  _build() {
    const cx = W / 2, cy = H / 2;
    const bw = COL_W * 2 + PAD * 3, bh = 480;
    const bx = cx - bw / 2, by = cy - bh / 2;

    // Viewport del listado (entre tabs y hint)
    this._listTop = by + 110;
    this._listBottom = by + bh - 36;
    this._listBx = bx;
    this._listBw = bw;

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

    // Lista con mask para que no se salga del panel
    this._listContainer = this.scene.add.container(0, 0);
    const maskShape = this.scene.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(this._listBx + 8, this._listTop, this._listBw - 16, this._listBottom - this._listTop);
    maskShape.setVisible(false);
    this._listMask = maskShape.createGeometryMask();
    this._listContainer.setMask(this._listMask);

    // Scrollbar
    this._scrollbar = this.scene.add.graphics().setDepth(2100);

    this._hint = this.scene.add.text(cx, by + bh - 24, 'W/S navegar  ·  A/D cambiar tab  ·  ESPACIO comprar/vender  ·  ESC salir  ·  Rueda scroll', {
      fontFamily: 'monospace', fontSize: '11px', color: '#445566'
    }).setOrigin(0.5);

    // Tooltip flotante (empieza invisible, se posiciona junto al cursor)
    this._tooltipBg  = this.scene.add.graphics().setDepth(2200);
    this._tooltipTxt = this.scene.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#dddddd',
      wordWrap: { width: 220 }, lineSpacing: 4,
      backgroundColor: null,
      padding: { x: 10, y: 8 }
    }).setDepth(2201).setAlpha(0);

    this._root.add([this._bg, this._title, this._credits, this._slots,
      this._tabBuy, this._tabSell, this._listContainer, this._hint]);
    // scrollbar y tooltip viven fuera del root para no heredar alpha

    // Wheel scroll
    this._setupWheel();
  }

  _setupWheel() {
    this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.visible) return;
      this._scrollY += deltaY * 0.5;
      this._clampScroll();
      this._buildList();
    });
  }

  _clampScroll() {
    const viewH = this._listBottom - this._listTop;
    const maxScroll = Math.max(0, this._contentHeight - viewH);
    this._scrollY = Math.max(0, Math.min(this._scrollY, maxScroll));
  }

  _drawScrollbar() {
    this._scrollbar.clear();
    const viewH = this._listBottom - this._listTop;
    if (this._contentHeight <= viewH) return;
    const barH = Math.max(20, viewH * viewH / this._contentHeight);
    const maxScroll = this._contentHeight - viewH;
    const barY = this._listTop + (this._scrollY / maxScroll) * (viewH - barH);
    this._scrollbar.fillStyle(0x334455, 0.5);
    this._scrollbar.fillRoundedRect(W / 2 + COL_W + PAD + 4, barY, 4, barH, 2);
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
    this._scrollY = 0;
    this._hideTooltip();
    this._refreshTabs();
    this._buildList();
  }

  _buildList() {
    this._listContainer.removeAll(true);
    this._items = [];
    this._hideTooltip();

    const shop   = this.scene.shopSystem;
    const cx     = W / 2;
    const startY = this._listTop + 6 - this._scrollY;

    if (this._tab === 'buy') {
      let y = startY;

      // ── Items terminados PRIMERO ──
      const stock = shop.getShopStock(this.shopId);
      if (stock.length > 0) {
        this._addSectionLabel('─── Items disponibles ───', cx, y);
        y += 22;
        stock.forEach(item => {
          const price = getItemPrice(item.id, shop.components);
          this._addRow({
            label:   item.name,
            sub:     `[${item.id}]  ${item.components.join(' + ')}`,
            desc:    item.desc,
            price,
            color:   item.color,
            isBig:   true,
            y,
            onBuy:   () => this._buyItem(item.id),
          });
          y += ROW_H;
        });
        y += 10;
      } else {
        this._addSectionLabel('─── Sin stock disponible ───', cx, y);
        y += 28;
      }

      // ── Componentes ABAJO ──
      this._addSectionLabel('─── Componentes ───', cx, y);
      y += 22;
      Object.values(COMPONENTS).forEach(comp => {
        this._addRow({
          label:  `[${comp.id}]  ${comp.desc}`,
          sub:    '',
          desc:   null,
          price:  COMPONENT_PRICE,
          color:  comp.color,
          isBig:  false,
          y,
          onBuy:  () => this._buyComponent(comp.id),
        });
        y += ROW_H - 10;
      });

      this._contentHeight = y - startY;

    } else {
      // ── Vender ──
      let y = startY;

      if (shop.components.length === 0 && shop.equippedItems.length === 0) {
        const emptyText = this.scene.add.text(cx, y + 20, 'Inventario vacío', {
          fontFamily: 'monospace', fontSize: '13px', color: '#555555'
        }).setOrigin(0.5);
        this._listContainer.add(emptyText);
        this._contentHeight = 60;
        this._clampScroll();
        this._drawScrollbar();
        return;
      }

      // Items equipados primero
      if (shop.equippedItems.length > 0) {
        this._addSectionLabel('─── Items equipados ───', cx, y);
        y += 22;
        shop.equippedItems.forEach((item, i) => {
          this._addRow({
            label:  item.name,
            sub:    `[${item.id}]  ${item.components.join(' + ')}`,
            desc:   item.desc,
            price:  null,
            gain:   Math.floor(2500 * 0.7),
            color:  item.color,
            isBig:  true,
            y,
            onBuy:  () => this._sellItem(i),
          });
          y += ROW_H;
        });
        y += 10;
      }

      // Componentes al final
      if (shop.components.length > 0) {
        this._addSectionLabel('─── Componentes ───', cx, y);
        y += 22;
        shop.components.forEach((compId, i) => {
          const comp = COMPONENTS[compId];
          this._addRow({
            label:  `[${comp.id}]  ${comp.desc}`,
            sub:    '',
            desc:   null,
            price:  null,
            gain:   Math.floor(COMPONENT_PRICE * 0.7),
            color:  comp.color,
            isBig:  false,
            y,
            onBuy:  () => this._sellComponent(i),
          });
          y += ROW_H - 10;
        });
      }

      this._contentHeight = y - startY;
    }

    this._clampScroll();
    this._drawScrollbar();
    this._refreshCursor();
  }

  _addSectionLabel(text, x, y) {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: 'monospace', fontSize: '11px', color: '#445566'
    }).setOrigin(0.5);
    this._listContainer.add(t);
  }

  _addRow({ label, sub, desc, price, gain, color, isBig, y, onBuy }) {
    const cx  = W / 2;
    const idx = this._items.length;
    const rowH = isBig ? ROW_H : ROW_H - 10;

    const bg = this.scene.add.graphics();
    bg.setInteractive(new Phaser.Geom.Rectangle(cx - 260, y - 2, 520, rowH - 4), Phaser.Geom.Rectangle.Contains);
    bg.on('pointerover', () => {
      this._cursor = idx;
      this._refreshCursor();
      if (desc) this._showTooltip(desc, cx + 260, y);
      else      this._hideTooltip();
    });
    bg.on('pointerout',  () => this._hideTooltip());
    bg.on('pointerdown', onBuy);

    const fontSize = isBig ? '13px' : '12px';
    const nameText = this.scene.add.text(cx - 240, y + (isBig ? 4 : 2), label, {
      fontFamily: 'monospace', fontSize, color
    });

    let subText = null;
    if (sub) {
      subText = this.scene.add.text(cx - 240, y + (isBig ? 22 : 16), sub, {
        fontFamily: 'monospace', fontSize: '11px', color: '#555566'
      });
    }

    // Precio (compra) o ganancia (venta)
    let priceText = null;
    if (price !== null && price !== undefined) {
      priceText = this.scene.add.text(cx + 240, y + rowH / 2 - 6, `${price} cr`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffdd44'
      }).setOrigin(1, 0.5);
    } else if (gain !== null && gain !== undefined) {
      priceText = this.scene.add.text(cx + 240, y + rowH / 2 - 6, `+${gain} cr`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#44dd88'
      }).setOrigin(1, 0.5);
    }

    this.scene.sys.displayList.remove(bg);
    this.scene.sys.displayList.remove(nameText);
    if (subText)   this.scene.sys.displayList.remove(subText);
    if (priceText) this.scene.sys.displayList.remove(priceText);

    this._listContainer.add([bg, nameText]);
    if (subText)   this._listContainer.add(subText);
    if (priceText) this._listContainer.add(priceText);

    this._items.push({ bg, nameText, subText, priceText, onBuy, rowH });
  }

  _refreshCursor() {
    this._items.forEach((row, i) => {
      const sel = i === this._cursor;
      row.bg.clear();
      if (sel) {
        row.bg.fillStyle(0x1a2a3a, 0.9);
        row.bg.fillRoundedRect(W / 2 - 260, row.nameText.y - 4, 520, row.rowH - 4, 6);
        row.bg.lineStyle(1, 0x4488ff, 0.6);
        row.bg.strokeRoundedRect(W / 2 - 260, row.nameText.y - 4, 520, row.rowH - 4, 6);
      }
    });
  }

  _scrollCursorIntoView() {
    if (this._items.length === 0) return;
    const row = this._items[this._cursor];
    if (!row) return;
    const viewH = this._listBottom - this._listTop;
    const rowScreenY = row.nameText.y;
    const rowTop = rowScreenY - 6;
    const rowBottom = rowScreenY + row.rowH + 4;
    if (rowTop < this._listTop) {
      this._scrollY -= (this._listTop - rowTop) + 8;
    } else if (rowBottom > this._listBottom) {
      this._scrollY += (rowBottom - this._listBottom) + 8;
    }
    this._clampScroll();
    this._buildList();
  }

  _showTooltip(text, anchorX, anchorY) {
    this._tooltipTxt.setText(text);
    this._tooltipTxt.setAlpha(1);

    const tw = this._tooltipTxt.width  + 20;
    const th = this._tooltipTxt.height + 16;

    // Posicionar a la derecha del panel; si se sale, a la izquierda
    let tx = anchorX + 10;
    if (tx + tw > W - 10) tx = anchorX - tw - 10;
    let ty = anchorY - th / 2;
    if (ty < 10) ty = 10;
    if (ty + th > H - 10) ty = H - 10 - th;

    this._tooltipTxt.setPosition(tx + 10, ty + 8);

    this._tooltipBg.clear();
    this._tooltipBg.fillStyle(0x0d1520, 0.97);
    this._tooltipBg.fillRoundedRect(tx, ty, tw, th, 6);
    this._tooltipBg.lineStyle(1, 0x334466, 1);
    this._tooltipBg.strokeRoundedRect(tx, ty, tw, th, 6);
    this._tooltipBg.setAlpha(1);
  }

  _hideTooltip() {
    this._tooltipBg.clear();
    this._tooltipTxt.setAlpha(0);
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
    this.manuallyClosed = false;
    this._tab    = 'buy';
    this._cursor = 0;
    this._root.setAlpha(1);
    this._refreshTabs();
    this._refresh();
  }

  close(manual = false) {
    this.visible = false;
    this.manuallyClosed = manual;
    this._scrollY = 0;
    this._root.setAlpha(0);
    this._listContainer.removeAll(true);
    this._items = [];
    this._scrollbar.clear();
    this._hideTooltip();
  }

  // ─── Update (llamado desde Game.update) ─────────────────────
  update() {
    if (!this.visible) return;

    const up    = this._kb.W.isDown;
    const down  = this._kb.S.isDown;
    const enter = this._kb.SPACE.isDown;
    const left  = this._kb.A.isDown;
    const right = this._kb.D.isDown;

    if (up && !this._prev.up && this._items.length > 0) {
      this._cursor = (this._cursor - 1 + this._items.length) % this._items.length;
      this._scrollCursorIntoView();
    }
    if (down && !this._prev.down && this._items.length > 0) {
      this._cursor = (this._cursor + 1) % this._items.length;
      this._scrollCursorIntoView();
    }
    if ((left && !this._prev.left)) this._setTab('buy');
    if ((right && !this._prev.right)) this._setTab('sell');
    if (enter && !this._prev.enter && this._items[this._cursor]) {
      this._items[this._cursor].onBuy();
    }

    this._prev = { up, down, enter, left, right };
  }
}