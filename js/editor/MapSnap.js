export default class MapSnap {
  constructor() {
    this.gridSize = 20;
    this.enableEndpoints = true;
    this.enableGrid = true;
  }

  snapEndpoint(worldX, worldY, endpoints, threshold = 15) {
    let closest = null;
    let minDist = threshold;

    for (const ep of endpoints) {
      const dist = Math.hypot(ep.x - worldX, ep.y - worldY);
      if (dist < minDist) {
        minDist = dist;
        closest = { x: ep.x, y: ep.y, snapped: true };
      }
    }
    return closest || { x: worldX, y: worldY, snapped: false };
  }

  snapGrid(worldX, worldY) {
    return {
      x: Math.round(worldX / this.gridSize) * this.gridSize,
      y: Math.round(worldY / this.gridSize) * this.gridSize
    };
  }

  snap(worldX, worldY, endpoints) {
    if (this.enableEndpoints) {
      const epSnap = this.snapEndpoint(worldX, worldY, endpoints);
      if (epSnap.snapped) return { ...epSnap, snappedToWhat: 'endpoint' };
    }
    
    if (this.enableGrid) {
      const gSnap = this.snapGrid(worldX, worldY);
      return { ...gSnap, snapped: true, snappedToWhat: 'grid' };
    }

    return { x: worldX, y: worldY, snapped: false, snappedToWhat: 'none' };
  }

  calibrateLine(start, end, angleThreshold = 3) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    const isHorizontal = Math.abs(angle) <= angleThreshold || Math.abs(Math.abs(angle) - 180) <= angleThreshold;
    const isVertical = Math.abs(Math.abs(angle) - 90) <= angleThreshold;

    if (!isHorizontal && !isVertical) return { start, end, wasCalibrated: false };

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const halfLen = Math.hypot(dx, dy) / 2;

    if (isHorizontal) {
      return {
        start: { x: midX - halfLen * Math.sign(dx || 1), y: midY },
        end: { x: midX + halfLen * Math.sign(dx || 1), y: midY },
        wasCalibrated: true
      };
    } else {
      return {
        start: { x: midX, y: midY - halfLen * Math.sign(dy || 1) },
        end: { x: midX, y: midY + halfLen * Math.sign(dy || 1) },
        wasCalibrated: true
      };
    }
  }

  calibrateSelection(mapData) {
    let count = 0;
    mapData.selection.walls.forEach(id => {
      const w = mapData.walls.find(wall => wall.id === id);
      if (w) {
        const cal = this.calibrateLine(w.start, w.end);
        if (cal.wasCalibrated) {
          w.start = cal.start;
          w.end = cal.end;
          count++;
        }
      }
    });
    if (count > 0) mapData._updateSelectionBounds();
    return count;
  }
}