import { ARENA, HP_MAX } from '../constants.js';

const HP_HIGH = 0x44dd77;
const HP_MID  = 0xffcc22;
const HP_LOW  = 0xff3322;

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
    const maxHp = player.health?.maxHp ?? HP_MAX;
    const hpPct = Math.max(0, player.hp / maxHp);
    const hpCol = hpPct > 0.5 ? HP_HIGH : hpPct > 0.25 ? HP_MID : HP_LOW;
    
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
      graphics.lineStyle(2, HP_LOW, pulse);
      graphics.strokeRect(this.x - 1, this.y - 1, this.width + 2, this.height + 2);
    }
  }
}