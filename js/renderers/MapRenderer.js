export default class MapRenderer {
  constructor() {
    // No necesita propiedades especiales
  }
  
  // Renderizar líneas (muros del nuevo sistema)
  renderLines(g, lines) {
    if (!lines || lines.length === 0) return;
    
    for (const line of lines) {
      // Relleno de la línea (grosor)
      g.lineStyle(line.thickness, 0x4a6a8a, 0.8);
      g.lineBetween(line.start.x, line.start.y, line.end.x, line.end.y);
      
      // Borde más claro para mejor visibilidad
      g.lineStyle(1, 0x8abaff, 0.6);
      g.lineBetween(line.start.x, line.start.y, line.end.x, line.end.y);
    }
  }
  
  // Método legacy para compatibilidad (si alguien llama a render con walls)
  render(graphics, walls) {
    console.warn('MapRenderer.render está obsoleto. Usa renderLines() en su lugar.');
    if (!walls || walls.length === 0) return;
    
    // Fallback: intentar convertir walls antiguos a líneas
    for (const wall of walls) {
      if (wall.w && wall.h) {
        // Convertir rectángulo a línea (solo para no romper el juego)
        const line = {
          start: { x: wall.x, y: wall.y },
          end: { x: wall.x + wall.w, y: wall.y + wall.h },
          thickness: Math.min(wall.w, wall.h)
        };
        graphics.lineStyle(line.thickness, 0x4a6a8a, 0.8);
        graphics.lineBetween(line.start.x, line.start.y, line.end.x, line.end.y);
      }
    }
  }
}