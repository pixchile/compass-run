import { DASH_DUR, L2, SMAX, C } from '../constants.js';

export default class PlayerRenderer {
  render(graphics, player, momentum, time) {
    const lv = momentum.level;
    const col = momentum.lColor;
    
    // Altura del salto
    const jumpPct = player.jumping ? Math.sin((player.jumpT / player.jumpDur) * Math.PI) : 0;
    const heightOff = jumpPct * player.jumpHMax;
    const pScale = 1 + jumpPct * 0.38;
    const drawY = player.py - heightOff;
    
    // Sombra durante el salto
    if (heightOff > 2) {
      graphics.fillStyle(0x000000, 0.28 - jumpPct * 0.2);
      graphics.fillEllipse(player.px, player.py + 5, 28 * (1 - jumpPct * 0.6), 12 * (1 - jumpPct * 0.6));
    }
    
    // Efecto de aterrizaje (landFx)
    if (player.landFx > 0) {
      const maxD = player.jumpLv >= 3 ? 420 : 210;
      const lPct = 1 - player.landFx / maxD;
      const lR = lPct * (player.jumpLv >= 3 ? 58 : 32);
      const lA = (1 - lPct) * (player.jumpLv >= 3 ? 0.6 : 0.35);
      graphics.lineStyle(3, col, lA);
      graphics.strokeCircle(player.px, player.py, lR);
      
      if (player.jumpLv >= 3) {
        graphics.lineStyle(2, col, lA * 0.5);
        graphics.strokeCircle(player.px, player.py, lR * 1.5);
      }
    }
    
    // Efecto stun (pantalla roja alrededor)
    if (player.isStunned) {
      graphics.fillStyle(0xff4422, (player.stunT % 120) < 60 ? 0.32 : 0);
      // Nota: Esto debería ser pantalla completa, pero está dentro del mundo con cámara
      // Lo dejamos como estaba originalmente
      graphics.fillRect(0, 0, 2000, 2000);
    }
    
    // Aura de nivel 2 y 3
    if (lv >= 2 && !player.isStunned) {
      const stackPct = (momentum.stacks - L2) / (SMAX - L2);
      const ar = (16 + stackPct * 14) * pScale;
      graphics.fillStyle(col, 0.07);
      graphics.fillCircle(player.px, drawY, ar + 16);
      graphics.fillStyle(col, 0.14);
      graphics.fillCircle(player.px, drawY, ar);
      
      if (lv === 3) {
        graphics.fillStyle(col, 0.09 + 0.07 * Math.sin(time.now * 0.009));
        graphics.fillCircle(player.px, drawY, ar + 26);
      }
    }
    
    // Efecto dash (brillo)
    if (player.dashing) {
      const t01 = player.dashT / DASH_DUR;
      graphics.fillStyle(0xffffff, 0.07 * (1 - t01));
      graphics.fillCircle(player.px, drawY, 46 * (1 + t01 * 0.4));
      graphics.lineStyle(3, 0xffffff, 0.45 * (1 - t01));
      graphics.strokeCircle(player.px, drawY, 20 * pScale);
    }
    
    // Cuerpo del jugador (triángulo que apunta en la dirección)
    const r = 12 * pScale;
    const a = player.facing;
    const fc = player.isStunned ? 0xff4422 : (player.dashing ? 0xffffff : col);
    
    graphics.fillStyle(fc, 1);
    graphics.fillTriangle(
      player.px + Math.cos(a) * r * 1.3, drawY + Math.sin(a) * r * 1.3,
      player.px + Math.cos(a + 2.2) * r, drawY + Math.sin(a + 2.2) * r,
      player.px + Math.cos(a - 2.2) * r, drawY + Math.sin(a - 2.2) * r
    );
    
    // Ojo/punto central
    graphics.fillStyle(0xffffff, 0.8);
    graphics.fillCircle(player.px, drawY, 3.5);
  }
}