// js/scenes/PlayerRenderer.js

import { DASH_DUR, L2, SMAX, C } from '../constants.js';

// OPTIMIZACIÓN: Precalculamos los senos y cosenos del ángulo del triángulo (2.2 radianes)
const COS_2_2 = Math.cos(2.2); // -0.5885
const SIN_2_2 = Math.sin(2.2); //  0.8084
const PI_MULT = 1 / Math.PI;

export default class PlayerRenderer {
  render(graphics, player, momentum, time) {
    const lv = momentum.level;
    const col = momentum.lColor;
    
    // Altura del salto (Optimizada división)
    const jumpPct = player.jumping ? Math.sin((player.jumpT / player.jumpDur) * Math.PI) : 0;
    const heightOff = jumpPct * player.jumpHMax;
    const pScale = 1 + jumpPct * 0.38;
    const drawY = player.py - heightOff;
    
    // Sombra durante el salto
    if (heightOff > 2) {
      const shPct = 1 - jumpPct * 0.6;
      graphics.fillStyle(0x000000, 0.28 - jumpPct * 0.2);
      graphics.fillEllipse(player.px, player.py + 5, 28 * shPct, 12 * shPct);
    }
    
    // Efecto de aterrizaje
    if (player.landFx > 0) {
      const isL3 = player.jumpLv >= 3;
      const maxD = isL3 ? 420 : 210;
      const lPct = 1 - (player.landFx / maxD);
      const lR = lPct * (isL3 ? 58 : 32);
      const lA = (1 - lPct) * (isL3 ? 0.6 : 0.35);
      
      graphics.lineStyle(3, col, lA);
      graphics.strokeCircle(player.px, player.py, lR);
      
      if (isL3) {
        graphics.lineStyle(2, col, lA * 0.5);
        graphics.strokeCircle(player.px, player.py, lR * 1.5);
      }
    }
    
    // Efecto stun
    if (player.isStunned && (player.stunT % 120) < 60) {
      graphics.fillStyle(0xff4422, 0.32);
      graphics.fillRect(0, 0, 2000, 2000); // Mantenido por retrocompatibilidad
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
    
    // Efecto dash
    if (player.dashing) {
      const t01 = player.dashT / DASH_DUR;
      const invT = 1 - t01;
      graphics.fillStyle(0xffffff, 0.07 * invT);
      graphics.fillCircle(player.px, drawY, 46 * (1 + t01 * 0.4));
      graphics.lineStyle(3, 0xffffff, 0.45 * invT);
      graphics.strokeCircle(player.px, drawY, 20 * pScale);
    }
    
    // --- CUERPO DEL JUGADOR (Triángulo) ---
    const r = 12 * pScale;
    const a = player.facing;
    const fc = player.isStunned ? 0xff4422 : (player.dashing ? 0xffffff : col);
    
    // OPTIMIZACIÓN: Solo 2 llamadas trigonométricas en lugar de 6.
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    
    // Identidad de suma/resta de ángulos: cos(A ± B) y sin(A ± B)
    const cosPlus  = cosA * COS_2_2 - sinA * SIN_2_2;
    const sinPlus  = sinA * COS_2_2 + cosA * SIN_2_2;
    const cosMinus = cosA * COS_2_2 + sinA * SIN_2_2;
    const sinMinus = sinA * COS_2_2 - cosA * SIN_2_2;
    
    graphics.fillStyle(fc, 1);
    graphics.fillTriangle(
      player.px + cosA * r * 1.3, drawY + sinA * r * 1.3,
      player.px + cosPlus * r,    drawY + sinPlus * r,
      player.px + cosMinus * r,   drawY + sinMinus * r
    );
    
    // Ojo/punto central
    graphics.fillStyle(0xffffff, 0.8);
    graphics.fillCircle(player.px, drawY, 3.5);
  }
}