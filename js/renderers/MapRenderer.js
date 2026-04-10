export default class MapRenderer {
  constructor() {
    // No necesita propiedades especiales
  }

  // Utilidad para convertir colores de Clip Studio (#ff0000) a Phaser (0xff0000)
  hexToNumber(hexStr) {
    if (!hexStr) return 0x4a6a8a; // Color por defecto si falla
    return parseInt(hexStr.replace('#', '0x'), 16);
  }
  
  // Renderizar líneas (muros del nuevo sistema)
  renderLines(g, lines) {
    if (!lines || lines.length === 0) return;
    
    for (const line of lines) {
      const color = this.hexToNumber(line.color);

      // Relleno de la línea (grosor) usando el color original del SVG
      g.lineStyle(line.thickness, color, 0.9);
      g.lineBetween(line.start.x, line.start.y, line.end.x, line.end.y);
      
      // Efectos visuales según el tipo de muro
      if (line.type === 'wall_jumpable') {
        // Brillo blanco interior para los verdes
        g.lineStyle(2, 0xffffff, 0.7); 
      } else if (line.type === 'wall_breakable') {
        // Brillo amarillo/naranja interior para los rojos
        g.lineStyle(2, 0xffaa00, 0.7); 
      } else {
        // Brillo suave estándar
        g.lineStyle(1, 0xffffff, 0.3); 
      }
      g.lineBetween(line.start.x, line.start.y, line.end.x, line.end.y);
    }
  }

  // NUEVO: Renderizar las zonas de efecto (Vacío, Trampas, Daño)
  renderZones(g, zones) {
    if (!zones || zones.length === 0) return;

    for (const zone of zones) {
      const color = this.hexToNumber(zone.color);
      const geo = zone.geometry;

      // Dibujamos las zonas con baja opacidad (20%) para no tapar a los enemigos ni la cuadrícula
      g.fillStyle(color, 0.2); 
      
      if (geo.shapeType === 'rect') {
        g.fillRect(geo.x, geo.y, geo.w, geo.h);
        // Borde suave para delimitar la zona
        g.lineStyle(2, color, 0.4);
        g.strokeRect(geo.x, geo.y, geo.w, geo.h);
      } 
      // Soporte extra por si en el futuro haces zonas con polígonos
      else if (geo.shapeType === 'polygon' && geo.points) {
        const pts = geo.points.trim().split(/[\s,]+/).map(Number);
        g.beginPath();
        g.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) {
          g.lineTo(pts[i], pts[i+1]);
        }
        g.closePath();
        g.fillPath();
        g.lineStyle(2, color, 0.4);
        g.strokePath();
      }
    }
  }
  
  // Método legacy para compatibilidad (por si algo viejo lo llama)
  render(graphics, walls) {
    console.warn('MapRenderer.render está obsoleto. Usa renderLines() y renderZones().');
    if (!walls || walls.length === 0) return;
    
    for (const wall of walls) {
      if (wall.w && wall.h) {
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