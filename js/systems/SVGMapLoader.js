export default class SVGMapLoader {
  constructor() {
    // Solo zonas/triggers y muro genérico (negro). Sin verde ni rojo.
    this.colorMap = {
      '#000000': 'wall',       // Negro -> muro normal
      '#ff00ff': 'void',       // Magenta
      '#ffa500': 'damage_zone',// Naranja
      '#0000ff': 'trap',       // Azul
      '#00ffff': 'trigger',    // Cian
      '#ffff00': 'trigger'     // Amarillo
    };
  }

  async loadMapFromURL(url) {
    try {
      const response = await fetch(url);
      const svgText = await response.text();
      return this.parseSVG(svgText, url.split('/').pop());
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
      lines: [],
      zones: [],
      triggers: [],
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

      let type = this.colorMap[color] || 'wall'; // por defecto, muro normal

      const shapeId   = shape.getAttribute('id') || '';
      const parentId  = shape.parentElement?.getAttribute('id') || '';
      const layerId   = shapeId || parentId;

      // Si el color no es específico, intentar por nombre de capa para zonas/triggers
      if (type === 'wall' && layerId) {
        const layerLower = layerId.toLowerCase();
        if (layerLower.startsWith('void'))    type = 'void';
        else if (layerLower.startsWith('damage')) type = 'damage_zone';
        else if (layerLower.startsWith('trap'))   type = 'trap';
        else if (layerLower.startsWith('trigger'))type = 'trigger';
        // cualquier otra cosa sigue siendo 'wall'
      }

      const tags = layerId.toLowerCase().split('_');
      const geometry = this.extractGeometry(shape);

      if (geometry) {
        const entity = { type, color, tags, geometry };
        this.extractThresholds(entity);
        this.categorizeEntity(entity, mapData);
      }
    });

    // DEPURACIÓN OPCIONAL: imprime las primeras líneas con HP
    // const linesWithHP = mapData.lines.filter(l => l.hp != null);
    // console.log(`Líneas con HP: ${linesWithHP.length}`, linesWithHP.slice(0,5).map(l => ({hp: l.hp, broken: l._broken})));

    return mapData;
  }

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
    else if (geo.shapeType === 'path') {
      const pts = this.samplePath(geo.pathData, 12);
      const merged = this.mergeCollinearPoints(pts, 1.5);
      for (let i = 0; i < merged.length - 1; i++) {
        lines.push({
          start: merged[i],
          end: merged[i + 1],
          thickness: geo.thickness
        });
      }
    }

    // Mapear a líneas finales con tipo 'wall' y HP si existe
    return lines.map(l => ({
      ...l,
      type: 'wall',                        // siempre wall genérico
      color: entity.color,
      hp: entity.hp != null ? entity.hp : null,  // número o null (indestructible)
    }));
  }

  // Colapsa puntos colineales en segmentos más largos.
  // angleTolerance en grados: si el cambio de dirección es menor a esto, se fusionan.
  mergeCollinearPoints(pts, angleTolerance = 1.5) {
    if (pts.length < 3) return pts;
    const thresh = Math.cos((angleTolerance * Math.PI) / 180);
    const result = [pts[0]];

    for (let i = 1; i < pts.length - 1; i++) {
      const prev = result[result.length - 1];
      const curr = pts[i];
      const next = pts[i + 1];

      const ax = curr.x - prev.x, ay = curr.y - prev.y;
      const bx = next.x - curr.x, by = next.y - curr.y;
      const lenA = Math.hypot(ax, ay), lenB = Math.hypot(bx, by);
      if (lenA === 0 || lenB === 0) continue;

      const dot = (ax / lenA) * (bx / lenB) + (ay / lenA) * (by / lenB);
      // Si el ángulo entre segmentos es menor a la tolerancia, saltar el punto intermedio
      if (dot < thresh) result.push(curr);
    }

    result.push(pts[pts.length - 1]);
    return result;
  }

  samplePath(d, samplesPerSegment = 12) {
    try {
      const svgNS = 'http://www.w3.org/2000/svg';
      const tmpSvg = document.createElementNS(svgNS, 'svg');
      const tmpPath = document.createElementNS(svgNS, 'path');
      tmpPath.setAttribute('d', d);
      tmpSvg.appendChild(tmpPath);
      document.body.appendChild(tmpSvg);

      const totalLength = tmpPath.getTotalLength();
      const numSamples = Math.max(2, Math.ceil(totalLength / samplesPerSegment));
      const points = [];

      for (let i = 0; i <= numSamples; i++) {
        const pt = tmpPath.getPointAtLength((i / numSamples) * totalLength);
        points.push({ x: pt.x, y: pt.y });
      }

      document.body.removeChild(tmpSvg);
      return points;
    } catch (e) {
      console.warn('samplePath falló:', e);
      return [];
    }
  }

  normalizeColor(colorString) {
    if (!colorString) return null;
    colorString = colorString.toLowerCase().trim();

    const rgbMatch = colorString.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
      const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
      const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }

    if (colorString.match(/^#[0-9a-f]{3}$/)) {
      return `#${colorString[1]}${colorString[1]}${colorString[2]}${colorString[2]}${colorString[3]}${colorString[3]}`;
    }

    return colorString;
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
  entity.hp = null;
  
  // Método 1: buscar 'hp' en los tags separados por '_'
  if (entity.tags && Array.isArray(entity.tags)) {
    const hpIndex = entity.tags.findIndex(tag => tag === 'hp');
    if (hpIndex !== -1 && entity.tags.length > hpIndex + 1) {
      const hpVal = parseInt(entity.tags[hpIndex + 1], 10);
      if (!isNaN(hpVal)) {
        entity.hp = hpVal;
        return;
      }
    }
  }
  
  // Método 2 (respaldo): buscar 'hp_' en el nombre completo de la capa
  // Reconstruimos el nombre original uniendo los tags
  const fullName = (entity.tags || []).join('_');
  const hpMatch = fullName.match(/hp_(\d+)/);
  if (hpMatch) {
    const hpVal = parseInt(hpMatch[1], 10);
    if (!isNaN(hpVal)) {
      entity.hp = hpVal;
    }
  }
}

  categorizeEntity(entity, mapData) {
    if (entity.type === 'wall') {
      const generatedLines = this.convertToLines(entity);
      mapData.lines.push(...generatedLines);
    } else if (['void', 'damage_zone', 'trap'].includes(entity.type)) {
      if (entity.geometry.shapeType === 'path') {
        const pts = this.samplePath(entity.geometry.pathData, 20);
        if (pts.length > 0) {
          const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
          entity.geometry.bbox = {
            x: Math.min(...xs), y: Math.min(...ys),
            w: Math.max(...xs) - Math.min(...xs),
            h: Math.max(...ys) - Math.min(...ys)
          };
        }
      }
      mapData.zones.push(entity);
    } else if (entity.type === 'trigger') {
      mapData.triggers.push(entity);
    }
  }
}