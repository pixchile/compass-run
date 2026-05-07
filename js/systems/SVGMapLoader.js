// SVGMapLoader.js
export default class SVGMapLoader {
  _VALID_PREFIXES = ['wall', 'pit', 'shop', 'trap', 'damage', 'void', 'trigger', 'slow'];

  _HP_REGEX = /hp_(\d+)/;

  constructor() {
    const NS = 'http://www.w3.org/2000/svg';
    // Persistent off-screen element reused by samplePath to avoid per-call DOM churn
    this._sampleSvg = document.createElementNS(NS, 'svg');
    this._sampleSvg.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
    this._samplePath = document.createElementNS(NS, 'path');
    this._sampleSvg.appendChild(this._samplePath);
    document.body.appendChild(this._sampleSvg);
  }

  async loadMapFromURL(url) {
    try {
      const cacheBusted = url + '?t=' + Date.now();
      const response = await fetch(cacheBusted);
      const svgText = await response.text();
      return this.parseSVG(svgText, url.split('/').pop());
    } catch (error) {
      console.error('Error cargando el SVG:', error);
      return null;
    }
  }

  _validPrefix(name) {
    return this._VALID_PREFIXES.some(p => name.startsWith(p));
  }

  /** Collect cumulative transform from element and all ancestors. */
  getCumulativeTransform(element) {
    const transforms = [];
    let current = element;
    while (current && current.getAttribute) {
      const t = current.getAttribute('transform');
      if (t) transforms.unshift(t);
      if (current.tagName && current.tagName.toLowerCase() === 'svg') break;
      current = current.parentElement;
    }
    return transforms.length > 0 ? transforms.join(' ') : null;
  }

  /** Apply a 2D affine transform string to {x,y} points using raw matrix math. */
  transformPoints(points, transformStr) {
    if (!transformStr || !points) return points;
    try {
      const m = new DOMMatrix(transformStr);
      const { a, b, c, d, e, f } = m;
      return points.map(p => ({
        x: a * p.x + c * p.y + e,
        y: b * p.x + d * p.y + f
      }));
    } catch (err) {
      console.warn('transformPoints failed:', err);
      return points;
    }
  }

  /** Compute bounding box and assign to geometry from an array of vertices. */
  _setBBox(geo, vertices) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const v of vertices) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
    geo.bbox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    geo.vertices = vertices;
  }

  /** Gets the layer identifier, walking up ancestors. Single traversal with fallback. */
  getLayerId(element) {
    const INKSCAPE_NS = 'http://www.inkscape.org/namespaces/inkscape';

    const getLabel = (el) => {
      const nsLabel = el.getAttributeNS?.(INKSCAPE_NS, 'label');
      if (nsLabel) return nsLabel.toLowerCase();
      const plainLabel = el.getAttribute?.('inkscape:label');
      if (plainLabel) return plainLabel.toLowerCase();
      return null;
    };

    let fallback = '';
    let current = element;
    while (current && current.getAttribute) {
      const label = getLabel(current);
      if (label) {
        if (this._validPrefix(label)) return label;
        if (!fallback) fallback = label;
      }

      const id = current.getAttribute('id');
      if (id) {
        const idLower = id.toLowerCase();
        if (this._validPrefix(idLower)) return idLower;
        if (!fallback) fallback = idLower;
      }

      if (current.tagName && current.tagName.toLowerCase() === 'svg') break;
      current = current.parentElement;
    }

    return fallback;
  }

  parseSVG(svgText, mapName) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');

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
      const layerId = this.getLayerId(shape);
      if (!layerId) return;

      let type = 'wall';
      if (layerId.startsWith('wall'))           type = 'wall';
      else if (layerId.startsWith('pit'))       type = 'shop';
      else if (layerId.startsWith('shop'))      type = 'shop';
      else if (layerId.startsWith('trap'))      type = 'trap';
      else if (layerId.startsWith('damage'))    type = 'damage_zone';
      else if (layerId.startsWith('void'))      type = 'void';
      else if (layerId.startsWith('trigger'))   type = 'trigger';
      else if (layerId.startsWith('slow'))      type = 'slow_zone';

      const geometry = this.extractGeometry(shape);
      if (!geometry) return;

      const tags = layerId.split('_');
      const color = this.extractColor(shape);
      const entity = { type, tags, geometry, color };
      this.extractThresholds(entity);
      this.categorizeEntity(entity, mapData);
    });

    return mapData;
  }

  convertToLines(entity) {
    const lines = [];
    const geo = entity.geometry;
    const xf = geo.transform;

    if (geo.shapeType === 'rect') {
      const corners = this.transformPoints([
        { x: geo.x, y: geo.y },
        { x: geo.x + geo.w, y: geo.y },
        { x: geo.x + geo.w, y: geo.y + geo.h },
        { x: geo.x, y: geo.y + geo.h }
      ], xf);
      for (let i = 0; i < 4; i++) {
        lines.push({ start: corners[i], end: corners[(i + 1) % 4], thickness: geo.thickness });
      }
    } else if (geo.shapeType === 'polygon') {
      const rawPts = geo.points.trim().split(/[\s,]+/).map(Number);
      const pts = new Array(rawPts.length / 2);
      for (let i = 0; i < rawPts.length; i += 2) {
        pts[i >> 1] = { x: rawPts[i], y: rawPts[i + 1] };
      }
      const tpts = this.transformPoints(pts, xf);
      for (let i = 0; i < tpts.length; i++) {
        lines.push({ start: tpts[i], end: tpts[(i + 1) % tpts.length], thickness: geo.thickness });
      }
    } else if (geo.shapeType === 'line') {
      const [s, e] = this.transformPoints([geo.start, geo.end], xf);
      lines.push({ start: s, end: e, thickness: geo.thickness });
    } else if (geo.shapeType === 'path') {
      const localPts = this.samplePath(geo.pathData, 12);
      const pts = this.transformPoints(localPts, xf);
      const merged = this.mergeCollinearPoints(pts, 1.5);
      for (let i = 0; i < merged.length - 1; i++) {
        lines.push({ start: merged[i], end: merged[i + 1], thickness: geo.thickness });
      }
    }

    const hp = entity.hp != null ? entity.hp : null;
    for (const l of lines) {
      l.type = 'wall';
      l.color = '#000000';
      l.hp = hp;
      l._origHp = hp;
    }
    return lines;
  }

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

      const dot = (ax * bx + ay * by) / (lenA * lenB);
      if (dot < thresh) result.push(curr);
    }

    result.push(pts[pts.length - 1]);
    return result;
  }

  /** Sample a path string into {x,y} points. Uses a persistent off-screen element. */
  samplePath(d, samplesPerSegment = 12) {
    try {
      this._samplePath.setAttribute('d', d);
      const totalLength = this._samplePath.getTotalLength();
      const numSamples = Math.max(2, Math.ceil(totalLength / samplesPerSegment));
      const points = new Array(numSamples + 1);

      for (let i = 0; i <= numSamples; i++) {
        const pt = this._samplePath.getPointAtLength((i / numSamples) * totalLength);
        points[i] = { x: pt.x, y: pt.y };
      }

      return points;
    } catch (e) {
      console.warn('samplePath falló:', e);
      return [];
    }
  }

  extractColor(shape) {
    const fill = shape.getAttribute('fill');
    if (fill && fill !== 'none' && fill.startsWith('#')) return fill;

    const stroke = shape.getAttribute('stroke');
    if (stroke && stroke !== 'none' && stroke.startsWith('#')) return stroke;

    const style = shape.getAttribute('style') || '';
    const fillMatch = style.match(/fill:\s*(#[0-9a-fA-F]{3,6})/);
    if (fillMatch) return fillMatch[1];

    const strokeMatch = style.match(/stroke:\s*(#[0-9a-fA-F]{3,6})/);
    if (strokeMatch) return strokeMatch[1];

    return '#ffffff';
  }

  extractGeometry(shape) {
    const tagName = shape.tagName.toLowerCase();
    let thickness = shape.getAttribute('stroke-width') || shape.style.strokeWidth || 2;
    thickness = parseFloat(thickness);
    const transform = this.getCumulativeTransform(shape);

    if (tagName === 'rect') {
      return {
        shapeType: 'rect',
        x: parseFloat(shape.getAttribute('x') || 0),
        y: parseFloat(shape.getAttribute('y') || 0),
        w: parseFloat(shape.getAttribute('width') || 0),
        h: parseFloat(shape.getAttribute('height') || 0),
        thickness,
        transform
      };
    }
    if (tagName === 'line') {
      return {
        shapeType: 'line',
        start: { x: parseFloat(shape.getAttribute('x1')), y: parseFloat(shape.getAttribute('y1')) },
        end: { x: parseFloat(shape.getAttribute('x2')), y: parseFloat(shape.getAttribute('y2')) },
        thickness,
        transform
      };
    }
    if (tagName === 'polyline' || tagName === 'polygon') {
      return {
        shapeType: 'polygon',
        points: shape.getAttribute('points'),
        thickness,
        transform
      };
    }
    if (tagName === 'path') {
      return {
        shapeType: 'path',
        pathData: shape.getAttribute('d'),
        thickness,
        transform
      };
    }
    return null;
  }

  extractThresholds(entity) {
    entity.hp = null;

    if (entity.tags && entity.tags.length) {
      const hpIndex = entity.tags.indexOf('hp');
      if (hpIndex !== -1 && entity.tags.length > hpIndex + 1) {
        const hpVal = parseInt(entity.tags[hpIndex + 1], 10);
        if (!isNaN(hpVal)) { entity.hp = hpVal; return; }
      }
    }

    const fullName = entity.tags ? entity.tags.join('_') : '';
    const hpMatch = fullName.match(this._HP_REGEX);
    if (hpMatch) {
      const hpVal = parseInt(hpMatch[1], 10);
      if (!isNaN(hpVal)) entity.hp = hpVal;
    }
  }

  categorizeEntity(entity, mapData) {
    if (entity.type === 'wall') {
      const generatedLines = this.convertToLines(entity);
      mapData.lines.push(...generatedLines);
    } else if (entity.type === 'trigger') {
      mapData.triggers.push(entity);
    } else {
      // zone types: void, damage_zone, slow_zone, shop, trap
      const geo = entity.geometry;
      const xf = geo.transform;

      if (geo.shapeType === 'path') {
        const localPts = this.samplePath(geo.pathData, 20);
        const vertices = this.transformPoints(localPts, xf);
        if (vertices.length > 0) this._setBBox(geo, vertices);
      } else if (geo.shapeType === 'rect') {
        const vertices = this.transformPoints([
          { x: geo.x, y: geo.y },
          { x: geo.x + geo.w, y: geo.y },
          { x: geo.x + geo.w, y: geo.y + geo.h },
          { x: geo.x, y: geo.y + geo.h }
        ], xf);
        this._setBBox(geo, vertices);
      } else if (geo.shapeType === 'polygon' && geo.points) {
        const rawPts = geo.points.trim().split(/[\s,]+/).map(Number);
        const pts = new Array(rawPts.length / 2);
        for (let i = 0; i < rawPts.length; i += 2) {
          pts[i >> 1] = { x: rawPts[i], y: rawPts[i + 1] };
        }
        const vertices = this.transformPoints(pts, xf);
        this._setBBox(geo, vertices);
      } else if (geo.shapeType === 'line') {
        const [s, e] = this.transformPoints([geo.start, geo.end], xf);
        this._setBBox(geo, [s, e]);
      }

      mapData.zones.push(entity);
    }
  }
}
