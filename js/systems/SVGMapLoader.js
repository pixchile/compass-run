// Archivo: SVGMapLoader.js

export default class SVGMapLoader {
  constructor() {
    // IMPORTANTE: Estos colores deben coincidir en formato HEX con los de tu SVG
    this.colorMap = {
      '#000000': 'wall_solid',     // Negro
      '#00ff00': 'wall_jumpable',  // Verde
      '#ff0000': 'wall_breakable', // Rojo
      '#ff00ff': 'void',           // Magenta
      '#ffa500': 'damage_zone',    // Naranja
      '#0000ff': 'trap',           // Azul
      '#00ffff': 'wind_zone',      // Cian/Celeste
      '#ffff00': 'trigger'         // Amarillo
    };
  }

  async loadMapFromURL(url) {
    try {
      const response = await fetch(url);
      const svgText = await response.text();
      return this.parseSVG(svgText, url.split('/').pop()); // usa el nombre del archivo
    } catch (error) {
      console.error('Error cargando el SVG:', error);
      return null;
    }
  }

  parseSVG(svgText, mapName) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    
    const mapData = {
      name: mapName,
      version: 4,
      arena: { x: 0, y: 0, w: 2000, h: 2000 }, 
      lines: [],    // <-- IMPORTANTE: Cambiamos 'walls' por 'lines' para tu motor físico
      zones: [],    // Aquí irán magenta, azul, cian, naranja
      triggers: [], // Aquí irán amarillos
      objects: []
    };

    const svgElement = doc.querySelector('svg');
    if (svgElement && svgElement.getAttribute('viewBox')) {
      const [, , w, h] = svgElement.getAttribute('viewBox').split(' ').map(Number);
      mapData.arena.w = w;
      mapData.arena.h = h;
    }

    const shapes = doc.querySelectorAll('rect, circle, polygon, path, polyline, line');

    shapes.forEach(shape => {
      let color = shape.getAttribute('fill') || shape.style.fill;
      if (!color || color === 'none') {
        color = shape.getAttribute('stroke') || shape.style.stroke;
      }
      color = this.normalizeColor(color);

      const type = this.colorMap[color] || 'unknown';
      const id = shape.getAttribute('id') || shape.parentElement.getAttribute('id') || '';
      const tags = id.toLowerCase().split('_');

      const geometry = this.extractGeometry(shape);

      if (geometry && type !== 'unknown') {
        const entity = { type, color, tags, geometry };
        this.extractThresholds(entity); 
        this.categorizeEntity(entity, mapData);
      }
    });

    return mapData;
  }

  // --- MÉTODOS DE LA CLASE VAN AQUÍ AFUERA ---

  convertToLines(entity) {
    const lines = [];
    const geo = entity.geometry;
    
    if (geo.shapeType === 'rect') {
      lines.push({ start: { x: geo.x, y: geo.y }, end: { x: geo.x + geo.w, y: geo.y }, thickness: geo.thickness });
      lines.push({ start: { x: geo.x + geo.w, y: geo.y }, end: { x: geo.x + geo.w, y: geo.y + geo.h }, thickness: geo.thickness });
      lines.push({ start: { x: geo.x + geo.w, y: geo.y + geo.h }, end: { x: geo.x, y: geo.y + geo.h }, thickness: geo.thickness });
      lines.push({ start: { x: geo.x, y: geo.y + geo.h }, end: { x: geo.x, y: geo.y }, thickness: geo.thickness });
    } 
    else if (geo.shapeType === 'polygon') {
      // Expresión regular mejorada para Clip Studio (/[\s,]+/)
      const pts = geo.points.trim().split(/[\s,]+/).map(Number);
      for (let i = 0; i < pts.length; i += 2) {
        const x1 = pts[i], y1 = pts[i+1];
        const nextIdx = (i + 2) % pts.length;
        const x2 = pts[nextIdx], y2 = pts[nextIdx+1];
        lines.push({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: geo.thickness });
      }
    }
    else if (geo.shapeType === 'line') {
      lines.push({ start: geo.start, end: geo.end, thickness: geo.thickness });
    }

    return lines.map(l => ({
      ...l,
      type: entity.type,
      color: entity.color,
      momentumRequired: entity.momentumRequired,
      speedRequired: entity.speedRequired
    }));
  }

  normalizeColor(colorString) {
    if (!colorString) return null;
    return colorString.toLowerCase().trim();
  }

  extractGeometry(shape) {
    const tagName = shape.tagName.toLowerCase();
    let thickness = shape.getAttribute('stroke-width') || shape.style.strokeWidth || 2;
    thickness = parseFloat(thickness);

    if (tagName === 'rect') {
      return {
        shapeType: 'rect',
        x: parseFloat(shape.getAttribute('x') || 0),
        y: parseFloat(shape.getAttribute('y') || 0),
        w: parseFloat(shape.getAttribute('width') || 0),
        h: parseFloat(shape.getAttribute('height') || 0),
        thickness
      };
    } 
    else if (tagName === 'line') {
      return {
        shapeType: 'line',
        start: { x: parseFloat(shape.getAttribute('x1')), y: parseFloat(shape.getAttribute('y1')) },
        end: { x: parseFloat(shape.getAttribute('x2')), y: parseFloat(shape.getAttribute('y2')) },
        thickness
      };
    }
    else if (tagName === 'polyline' || tagName === 'polygon') {
      return {
        shapeType: 'polygon',
        points: shape.getAttribute('points'),
        thickness
      };
    }
    else if (tagName === 'path') {
      return {
        shapeType: 'path',
        pathData: shape.getAttribute('d'),
        thickness
      };
    }
    return null;
  }

  extractThresholds(entity) {
    entity.momentumRequired = 0; 
    entity.speedRequired = 0; 

    const momIndex = entity.tags.indexOf('momentum');
    if (momIndex !== -1 && entity.tags.length > momIndex + 1) {
      entity.momentumRequired = parseInt(entity.tags[momIndex + 1], 10);
    }

    const spdIndex = entity.tags.indexOf('speed');
    if (spdIndex !== -1 && entity.tags.length > spdIndex + 1) {
      entity.speedRequired = parseInt(entity.tags[spdIndex + 1], 10);
    }
  }

  categorizeEntity(entity, mapData) {
    // AQUÍ ES DONDE SUCEDE LA MAGIA
    // Si es un muro, lo troceamos en líneas matemáticas para que tu `Game.js` no se rompa
    if (entity.type.startsWith('wall_')) {
      const generatedLines = this.convertToLines(entity);
      mapData.lines.push(...generatedLines);
    } 
    // Si es una zona (rectángulos de daño, vacío), las dejamos enteras
    else if (['void', 'damage_zone', 'trap', 'wind_zone'].includes(entity.type)) {
      mapData.zones.push(entity);
    } 
    else if (entity.type === 'trigger') {
      mapData.triggers.push(entity);
    }
  }
}