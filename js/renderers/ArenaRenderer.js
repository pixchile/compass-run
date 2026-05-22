import { ARENA } from '../constants.js';

const ARENA_BG   = 0x2a2a2a;
const GRID_COLOR = 0x131825;
const WALL_COLOR = 0x28384e;
const L3_COLOR   = 0xff3322;

export default class ArenaRenderer {
  render(graphics, level, time, hasBackground) {
    // Arena base (skip fill if a background image is shown)
    if (!hasBackground) {
      graphics.fillStyle(ARENA_BG, 1);
      graphics.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
    }
    
    // Paredes (borde)
    graphics.lineStyle(4, WALL_COLOR, 1);
    graphics.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
    
    // Efecto nivel 3 (borde brillante)
    if (level === 3) {
      graphics.lineStyle(10, L3_COLOR, 0.15 + 0.12 * time.sinSlow);
      graphics.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
    }
  }
}