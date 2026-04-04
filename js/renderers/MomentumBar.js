import { W, H, SMAX, L2, L3, C } from '../constants.js';

export default class MomentumBar {
  constructor(scene) {
    this.scene = scene;
    
    // Ancho fijo centrado
    this.width = Math.min(600, W - 40);
    this.x = (W - this.width) / 2;
    this.y = H - 34;
    this.height = 16;
  }
  
  render(graphics, momentum, time) {
    const lv = momentum.level;
    const col = momentum.lColor;
    const bx = this.x;
    const by = this.y;
    const bw = this.width;
    const bh = this.height;
    
    // Fondo
    graphics.fillStyle(0x0d111e, 1);
    graphics.fillRect(bx, by, bw, bh);
    
    // Relleno (stacks actuales)
    if (momentum.stacks > 0) {
      const fw = (momentum.stacks / SMAX) * bw;
      graphics.fillStyle(col, 0.88);
      graphics.fillRect(bx, by, fw, bh);
      graphics.fillStyle(0xffffff, 0.08);
      graphics.fillRect(bx, by, fw, bh * 0.38);
    }
    
    // Marcadores de nivel en la barra
    const s1x = bx + (L2 / SMAX) * bw;
    const s2x = bx + (L3 / SMAX) * bw;
    
    if (lv > 1) {
      const sepX = lv === 2 ? s1x : s2x;
      const pA = momentum.levelProtectPct;
      graphics.lineStyle(4, 0x1a2535, 1);
      graphics.beginPath();
      graphics.arc(sepX, by + bh / 2, bh * 0.85, -Math.PI * 0.7, Math.PI * 0.7, false);
      graphics.strokePath();
      
      if (pA > 0) {
        graphics.lineStyle(4, pA > 0.5 ? 0x44ff99 : pA > 0.25 ? 0xffcc00 : 0xff4422, 0.85);
        graphics.beginPath();
        graphics.arc(sepX, by + bh / 2, bh * 0.85, -Math.PI * 0.7, -Math.PI * 0.7 + Math.PI * 1.4 * pA, false);
        graphics.strokePath();
      }
    }
    
    // Líneas divisorias de nivel
    graphics.lineStyle(2, 0xffffff, 0.45);
    graphics.lineBetween(s1x, by - 4, s1x, by + bh + 4);
    graphics.lineBetween(s2x, by - 4, s2x, by + bh + 4);
    
    // Borde exterior
    graphics.lineStyle(2, 0x222c3e, 1);
    graphics.strokeRect(bx, by, bw, bh);
    
    // Efecto nivel 3
    if (lv === 3) {
      graphics.lineStyle(3, C.L3, 0.25 + 0.2 * time.sinNormal);
      graphics.strokeRect(bx - 2, by - 2, bw + 4, bh + 4);
    }
  }
  
  getX() { return this.x; }
  getWidth() { return this.width; }
}