// Archivo: SVGMapLoader.js

export default class SVGMapLoader {
  constructor() {
    this.colorMap = {
      '#000000': 'wall_solid',     
      '#00ff00': 'wall_jumpable',  
      '#ff0000': 'wall_breakable', 
      '#ff00ff': 'void',           
      '#ffa500': 'damage_zone',    
      '#0000ff': 'trap',           
      '#00ffff': 'wind_zone',      
      '#ffff00': 'trigger'         
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

      let type = this.colorMap[color] || 'unknown';
      
      // FIX BUG: Búsqueda Recursiva Segura de IDs (para solucionar el error de las capas agrupadas).
      let currentNode = shape;
      let resolvedId = '';
      while (currentNode && currentNode.nodeName.toLowerCase() !== 'svg') {
        if (currentNode.getAttribute) {
            const id = currentNode.getAttribute('id');
            if (id) {
                resolvedId = id;
                // Si encontramos una etiqueta de sistema, detenemos la búsqueda hacia arriba
                if (id.toLowerCase().match(/wall|jump|break|void|damage|trap|wind|trigger/)) {
                    break;
                }
            }
        }
        currentNode = currentNode.parentNode;
      }

      const layerId = resolvedId;
      const layerLower = layerId.toLowerCase();

      if (type === 'unknown' && layerId) {
        if (layerLower.startsWith('wall') || layerLower === 'walls') type = 'wall_solid';
        else if (layerLower.startsWith('jump'))    type = 'wall_jumpable';
        else if (layerLower.startsWith('break'))   type = 'wall_breakable';
        else if (layerLower.startsWith('void'))    type = 'void';
        else if (layerLower.startsWith('damage'))  type = 'damage_zone';
        else if (layerLower.startsWith('trap'))    type = 'trap';
        else if (layerLower.startsWith('wind'))    type = 'wind_zone';
        else if (layerLower.startsWith('trigger')) type = 'trigger';
      }

      const tags = layerLower.split('_');
      const geometry = this.extractGeometry(shape);

      if (geometry && type !== 'unknown') {
        const entity = { type, color, tags, geometry };
        this.extractThresholds(entity);
        this.categorizeEntity(entity, mapData);
      }
    });

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
      for (let i = 0; i < pts.length - 1; i++) {
        lines.push({
          start: pts[i],
          end: pts[i + 1],
          thickness: geo.thickness,
          noStickStart: i > 0,
          noStickEnd: i < pts.length - 2
        });
      }
    }

    return lines.map(l => ({
      ...l,
      type: entity.type,
      color: entity.color,
      momentumRequired: entity.momentumRequired,
      speedRequired: entity.speedRequired
    }));
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
    if (entity.type.startsWith('wall_')) {
      const generatedLines = this.convertToLines(entity);
      mapData.lines.push(...generatedLines);
    } else if (['void', 'damage_zone', 'trap', 'wind_zone'].includes(entity.type)) {
      if (entity.geometry.shapeType !== 'rect') {
        let xs = [], ys = [];
        if (entity.geometry.shapeType === 'polygon') {
          const pts = entity.geometry.points.trim().split(/[\s,]+/).map(Number);
          for (let i = 0; i < pts.length; i += 2) {
            xs.push(pts[i]); ys.push(pts[i + 1]);
          }
        } else if (entity.geometry.shapeType === 'path') {
          const pts = this.samplePath(entity.geometry.pathData, 20);
          pts.forEach(p => { xs.push(p.x); ys.push(p.y); });
        }
        
        if (xs.length > 0) {
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