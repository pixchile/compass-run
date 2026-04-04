import { W, H, ARENA, HP_MAX, C } from '../constants.js';

export default class HealthBar {
  constructor(scene) {
    this.scene = scene;
    
    // Dimensiones fijas de la barra
    this.width = 180;
    this.height = 8;
    this.x = 20;
    this.y = ARENA.y - 14;
  }
  
  render(graphics, player, time) {
    const hpPct = Math.max(0, player.hp / HP_MAX);
    const hpCol = hpPct > 0.5 ? C.hpHigh : hpPct > 0.25 ? C.hpMid : C.hpLow;
    
    // Flash rojo cuando recibe daño (pantalla completa)
    if (player.hpHitFlash > 0) {
      const flashA = (player.hpHitFlash / 280) * 0.22;
      graphics.fillStyle(0xff2200, flashA);
      graphics.fillRect(0, 0, W, H);
    }
    
    // Fondo de la barra
    graphics.fillStyle(0x0d111e, 1);
    graphics.fillRect(this.x, this.y, this.width, this.height);
    
    // Relleno (vida actual)
    if (hpPct > 0) {
      graphics.fillStyle(hpCol, 0.90);
      graphics.fillRect(this.x, this.y, this.width * hpPct, this.height);
      
      // Brillo superior (efecto visual)
      graphics.fillStyle(0xffffff, 0.10);
      graphics.fillRect(this.x, this.y, this.width * hpPct, this.height * 0.4);
    }
    
    // Borde
    graphics.lineStyle(1, 0x222c3e, 1);
    graphics.strokeRect(this.x, this.y, this.width, this.height);
    
    // Pulso cuando la vida es baja (≤25%)
    if (hpPct <= 0.25) {
               const pulse = 0.12 + 0.12 * time.sinFast;
      graphics.lineStyle(2, C.hpLow, pulse);
      graphics.strokeRect(this.x - 1, this.y - 1, this.width + 2, this.height + 2);
    }
  }
}