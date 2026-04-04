import { ARENA, C } from '../constants.js';

export default class ArenaRenderer {
  render(graphics, level, time) {
    // Arena base
    graphics.fillStyle(C.arena, 1);
    graphics.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
    
    // Grid (cuadrícula)
    graphics.lineStyle(1, C.grid, 1);
    for (let x = ARENA.x + 55; x < ARENA.x + ARENA.w; x += 55) {
      graphics.lineBetween(x, ARENA.y, x, ARENA.y + ARENA.h);
    }
    for (let y = ARENA.y + 55; y < ARENA.y + ARENA.h; y += 55) {
      graphics.lineBetween(ARENA.x, y, ARENA.x + ARENA.w, y);
    }
    
    // Paredes (borde)
    graphics.lineStyle(4, C.wall, 1);
    graphics.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
    
    // Efecto nivel 3 (borde brillante)
    if (level === 3) {
      graphics.lineStyle(10, C.L3, 0.15 + 0.12 * time.sinSlow);
      graphics.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
    }
  }
}