export default class MapData {
  constructor() {
    this.arena = { x: 55, y: 58, w: 4000, h: 4000 };
    this.walls = [];
    this.zones = [];
    this.background = null;
    this.selection = { walls: new Set(), zones: new Set() };
    this.selectedToolBounds = null;
  }

  _generateId() {
    return crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).substring(2, 10);
  }

  addWall(start, end, thickness = 20, color = '#000000', hp = 300) {
    const wall = { id: this._generateId(), start: { ...start }, end: { ...end }, thickness, color, hp };
    this.walls.push(wall);
    return wall;
  }

  addZone(type, color, vertices) {
    const zone = { 
        id: this._generateId(), 
        type, 
        color, 
        geometry: { shapeType: 'polygon', vertices: vertices.map(v => ({...v})) } 
    };
    this.zones.push(zone);
    return zone;
  }

  removeWall(id) {
    this.walls = this.walls.filter(w => w.id !== id);
    this.selection.walls.delete(id);
    this._updateSelectionBounds();
  }

  removeZone(id) {
    this.zones = this.zones.filter(z => z.id !== id);
    this.selection.zones.delete(id);
    this._updateSelectionBounds();
  }

  moveWall(id, newStart, newEnd) {
    const wall = this.walls.find(w => w.id === id);
    if (wall) { 
        wall.start = { ...newStart }; 
        wall.end = { ...newEnd }; 
        this._updateSelectionBounds(); 
    }
  }

  moveZone(id, deltaX, deltaY) {
    const zone = this.zones.find(z => z.id === id);
    if (zone) {
      zone.geometry.vertices.forEach(v => { v.x += deltaX; v.y += deltaY; });
      this._updateSelectionBounds();
    }
  }

  rotateSelection(angleDeg) {
    if (!this.selectedToolBounds) return;
    const cx = this.selectedToolBounds.centerX;
    const cy = this.selectedToolBounds.centerY;
    const rad = angleDeg * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const rotatePoint = (p) => {
        const rx = p.x - cx;
        const ry = p.y - cy;
        return { x: cx + rx * cos - ry * sin, y: cy + rx * sin + ry * cos };
    };

    this.selection.walls.forEach(id => {
        const w = this.walls.find(wall => wall.id === id);
        if (w) { w.start = rotatePoint(w.start); w.end = rotatePoint(w.end); }
    });
    
    this.selection.zones.forEach(id => {
        const z = this.zones.find(zone => zone.id === id);
        if (z) z.geometry.vertices.forEach(v => { 
            const rotated = rotatePoint(v); 
            v.x = rotated.x; 
            v.y = rotated.y; 
        });
    });
    this._updateSelectionBounds();
  }

  selectWall(id, additive = false) {
    if (!additive) this.clearSelection();
    this.selection.walls.add(id);
    this._updateSelectionBounds();
  }

  selectZone(id, additive = false) {
    if (!additive) this.clearSelection();
    this.selection.zones.add(id);
    this._updateSelectionBounds();
  }

  selectAllInRect(worldRect) {
    this.clearSelection();
    this.wallsInRect(worldRect).forEach(w => this.selection.walls.add(w.id));
    this.zonesInRect(worldRect).forEach(z => this.selection.zones.add(z.id));
    this._updateSelectionBounds();
  }

  clearSelection() {
    this.selection.walls.clear();
    this.selection.zones.clear();
    this.selectedToolBounds = null;
  }

  deleteSelected() {
    this.selection.walls.forEach(id => this.removeWall(id));
    this.selection.zones.forEach(id => this.removeZone(id));
    this.clearSelection();
  }

  wallAtPoint(worldX, worldY, threshold = 10) {
    return this.walls.find(w => 
        this._pointToSegmentDist(worldX, worldY, w.start.x, w.start.y, w.end.x, w.end.y) <= threshold + (w.thickness/2)
    ) || null;
  }

  zoneAtPoint(worldX, worldY) {
    return this.zones.find(z => this._pointInPolygon(worldX, worldY, z.geometry.vertices)) || null;
  }

  wallsInRect(rect) {
    return this.walls.filter(w => this._segmentInRect(w.start, w.end, rect));
  }

  zonesInRect(rect) {
    return this.zones.filter(z => 
        z.geometry.vertices.some(v => v.x >= rect.x && v.x <= rect.x + rect.w && v.y >= rect.y && v.y <= rect.y + rect.h)
    );
  }

  wallsStrokedBy(points, brushRadius) {
    const affected = new Set();
    for (let i = 0; i < points.length - 1; i++) {
       const p1 = points[i], p2 = points[i+1];
       this.walls.forEach(w => {
           if (this._segmentToSegmentDist(w.start, w.end, p1, p2) <= brushRadius + (w.thickness/2)) {
               affected.add(w);
           }
       });
    }
    return Array.from(affected);
  }

  toMapDataJSON() {
    return {
      arena: this.arena,
      lines: this.walls.map(w => ({ start: w.start, end: w.end, thickness: w.thickness, color: w.color, hp: w.hp })),
      zones: this.zones.map(z => ({ type: z.type, color: z.color, geometry: z.geometry })),
      background: this.background
    };
  }

  fromMapDataJSON(json) {
    this.clearSelection();
    this.arena = json.arena || { x: 55, y: 58, w: 4000, h: 4000 };
    this.background = json.background || null;
    this.walls = (json.lines || []).map(l => ({ 
        id: this._generateId(), start: { ...l.start }, end: { ...l.end }, thickness: l.thickness, color: l.color, hp: l.hp 
    }));
    this.zones = (json.zones || []).map(z => ({ 
        id: this._generateId(), type: z.type, color: z.color, 
        geometry: { shapeType: z.geometry.shapeType, vertices: z.geometry.vertices.map(v=>({...v})) } 
    }));
  }

  getAllEndpoints() {
    const pts = [];
    this.walls.forEach(w => {
        pts.push({ x: w.start.x, y: w.start.y, wallId: w.id, isStart: true });
        pts.push({ x: w.end.x, y: w.end.y, wallId: w.id, isStart: false });
    });
    return pts;
  }

  _updateSelectionBounds() {
    if (this.selection.walls.size === 0 && this.selection.zones.size === 0) {
        this.selectedToolBounds = null;
        return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    this.selection.walls.forEach(id => {
        const w = this.walls.find(wall => wall.id === id);
        if (w) {
            minX = Math.min(minX, w.start.x, w.end.x);
            minY = Math.min(minY, w.start.y, w.end.y);
            maxX = Math.max(maxX, w.start.x, w.end.x);
            maxY = Math.max(maxY, w.start.y, w.end.y);
        }
    });
    
    this.selection.zones.forEach(id => {
        const z = this.zones.find(zone => zone.id === id);
        if (z) z.geometry.vertices.forEach(v => {
            minX = Math.min(minX, v.x); minY = Math.min(minY, v.y);
            maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y);
        });
    });
    
    this.selectedToolBounds = { 
        x: minX, y: minY, w: maxX - minX, h: maxY - minY, 
        centerX: minX + (maxX - minX)/2, centerY: minY + (maxY - minY)/2 
    };
  }

  // Utils
  _pointToSegmentDist(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1)**2 + (y2 - y1)**2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1)*(x2 - x1) + (py - y1)*(y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t*(x2 - x1)), py - (y1 + t*(y2 - y1)));
  }

  _pointInPolygon(x, y, vertices) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
  }

  _segmentInRect(p1, p2, rect) {
    return (p1.x >= rect.x && p1.x <= rect.x + rect.w && p1.y >= rect.y && p1.y <= rect.y + rect.h) ||
           (p2.x >= rect.x && p2.x <= rect.x + rect.w && p2.y >= rect.y && p2.y <= rect.y + rect.h);
  }

  _segmentToSegmentDist(p1, p2, p3, p4) {
      return Math.min(
          this._pointToSegmentDist(p3.x, p3.y, p1.x, p1.y, p2.x, p2.y),
          this._pointToSegmentDist(p4.x, p4.y, p1.x, p1.y, p2.x, p2.y),
          this._pointToSegmentDist(p1.x, p1.y, p3.x, p3.y, p4.x, p4.y),
          this._pointToSegmentDist(p2.x, p2.y, p3.x, p3.y, p4.x, p4.y)
      );
  }
}