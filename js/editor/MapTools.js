import { 
    AddWallCommand, RemoveWallCommand, MoveWallCommand, 
    AddZoneCommand, RemoveZoneCommand, CompositeCommand 
} from './MapHistory.js';

class Tool {
    constructor(editor) {
        this.editor = editor;
        this.mapData = editor.mapData;
        this.history = editor.history;
        this.snap = editor.snap;
    }
    activate() {}
    deactivate() {}
    onMouseDown(x, y, shift, ctrl) {}
    onMouseMove(x, y) {}
    onMouseUp(x, y) {}
    onKeyDown(key) {}
    renderPreview(g) {}
    getCursor() { return 'default'; }

    _computePolyVerts(center, radius, baseAngle, sides) {
        const verts = [];
        for (let i = 0; i < sides; i++) {
            const a = baseAngle + (2 * Math.PI * i) / sides - Math.PI / 2;
            verts.push({ x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius });
        }
        return verts;
    }
}

export class SelectTool extends Tool {
    constructor(editor) {
        super(editor);
        this.dragStart = null;
        this.isDraggingItem = false;
        this.isDraggingRect = false;
        this.isDraggingVertex = false;
        this.vertexDrag = null; // { wallId, endpoint: 'start'|'end' } or { zoneId, vertexIndex }
        this.initialState = [];
    }

    onMouseDown(x, y, shift, ctrl) {
        // 1. Check for vertex grab on selected items first (tighter threshold)
        const vtx = this._vertexAt(x, y, 12);
        if (vtx) {
            this.isDraggingVertex = true;
            this.vertexDrag = vtx;
            this.dragStart = { x, y };
            if (!shift && vtx.wallId && !this.mapData.selection.walls.has(vtx.wallId)) {
                this.mapData.selectWall(vtx.wallId, false);
            }
            if (!shift && vtx.zoneId && !this.mapData.selection.zones.has(vtx.zoneId)) {
                this.mapData.selectZone(vtx.zoneId, false);
            }
            return;
        }

        // 2. Check wall body
        const wall = this.mapData.wallAtPoint(x, y, 15);
        if (wall) {
            this.mapData.selectWall(wall.id, shift);
            this.isDraggingItem = true;
            this._captureInitialState();
            this.dragStart = { x, y };
            return;
        }

        // 3. Check zone body
        const zone = this.mapData.zoneAtPoint(x, y);
        if (zone) {
            this.mapData.selectZone(zone.id, shift);
            this.isDraggingItem = true;
            this._captureInitialState();
            this.dragStart = { x, y };
            return;
        }

        // 4. Empty area → rubber band
        if (!shift) this.mapData.clearSelection();
        this.isDraggingRect = true;
        this.dragStart = { x, y };
    }

    onMouseMove(x, y) {
        if (!this.dragStart) return;
        const dx = x - this.dragStart.x;
        const dy = y - this.dragStart.y;

        if (this.isDraggingVertex && this.vertexDrag) {
            this._moveVertex(this.vertexDrag, x, y);
        } else if (this.isDraggingItem) {
            this.mapData.selection.walls.forEach(id => {
                const init = this.initialState.find(i => i.id === id);
                if (init) this.mapData.moveWall(id, {x: init.start.x + dx, y: init.start.y + dy}, {x: init.end.x + dx, y: init.end.y + dy});
            });
            this.mapData.selection.zones.forEach(id => {
                 const init = this.initialState.find(i => i.id === id);
                 if (init) {
                     const zone = this.mapData.zones.find(z => z.id === id);
                     zone.geometry.vertices = init.vertices.map(v => ({x: v.x + dx, y: v.y + dy}));
                 }
            });
            this.mapData._updateSelectionBounds();
        }
        this.currentMouse = { x, y };
    }

    onMouseUp(x, y) {
        if (this.isDraggingRect && this.dragStart) {
            const rect = {
                x: Math.min(this.dragStart.x, x),
                y: Math.min(this.dragStart.y, y),
                w: Math.abs(x - this.dragStart.x),
                h: Math.abs(y - this.dragStart.y)
            };
            if (rect.w > 5 || rect.h > 5) this.mapData.selectAllInRect(rect);
        } else if (this.isDraggingVertex && this.vertexDrag && this.dragStart && (Math.abs(x - this.dragStart.x) > 1 || Math.abs(y - this.dragStart.y) > 1)) {
            // Commit vertex move
            const vd = this.vertexDrag;
            if (vd.wallId) {
                const wall = this.mapData.walls.find(w => w.id === vd.wallId);
                const init = this._vertexDragInitial;
                if (wall && init) {
                    this.history.execute(new MoveWallCommand(this.mapData, wall, init.start, init.end, wall.start, wall.end));
                }
            } else if (vd.zoneId) {
                const zone = this.mapData.zones.find(z => z.id === vd.zoneId);
                const init = this._vertexDragInitial;
                if (zone && init) {
                    this.history.execute(new MoveZoneCommand(this.mapData, vd.zoneId, init.vertices, zone.geometry.vertices));
                }
            }
        } else if (this.isDraggingItem && this.dragStart && (Math.abs(x - this.dragStart.x) > 1 || Math.abs(y - this.dragStart.y) > 1)) {
            const commands = [];
            this.mapData.selection.walls.forEach(id => {
                const init = this.initialState.find(i => i.id === id);
                const wall = this.mapData.walls.find(w => w.id === id);
                if (init && wall) commands.push(new MoveWallCommand(this.mapData, wall, init.start, init.end, wall.start, wall.end));
            });
            this.mapData.selection.zones.forEach(id => {
                const init = this.initialState.find(i => i.id === id);
                const zone = this.mapData.zones.find(z => z.id === id);
                if (init && zone) commands.push(new MoveZoneCommand(this.mapData, id, init.vertices, zone.geometry.vertices));
            });
            if (commands.length > 0) this.history.execute(new CompositeCommand(commands));
        }

        this.isDraggingItem = false;
        this.isDraggingRect = false;
        this.isDraggingVertex = false;
        this.vertexDrag = null;
        this._vertexDragInitial = null;
        this.dragStart = null;
    }

    onKeyDown(key) {
        if (key === 'Delete' || key === 'Backspace') {
            const cmds = [];
            this.mapData.selection.walls.forEach(id => {
                const w = this.mapData.walls.find(x => x.id === id);
                if (w) cmds.push(new RemoveWallCommand(this.mapData, w));
            });
            this.mapData.selection.zones.forEach(id => {
                const z = this.mapData.zones.find(x => x.id === id);
                if (z) cmds.push(new RemoveZoneCommand(this.mapData, z));
            });
            if (cmds.length > 0) this.history.execute(new CompositeCommand(cmds));
            this.mapData.clearSelection();
        }
    }

    renderPreview(g) {
        if (this.isDraggingRect && this.dragStart && this.currentMouse) {
            g.lineStyle(1, 0x00aaff, 0.8);
            g.fillStyle(0x00aaff, 0.2);
            const x = Math.min(this.dragStart.x, this.currentMouse.x);
            const y = Math.min(this.dragStart.y, this.currentMouse.y);
            const w = Math.abs(this.currentMouse.x - this.dragStart.x);
            const h = Math.abs(this.currentMouse.y - this.dragStart.y);
            g.fillRect(x, y, w, h);
            g.strokeRect(x, y, w, h);
        }
        
        const bounds = this.mapData.selectedToolBounds;
        if (bounds) {
            g.lineStyle(2, 0xffaa00, 1);
            g.strokeRect(bounds.x - 5, bounds.y - 5, bounds.w + 10, bounds.h + 10);

            this.mapData.selection.walls.forEach(id => {
                const w = this.mapData.walls.find(x => x.id === id);
                if (w) {
                    g.lineStyle(4, 0xffaa00, 0.5);
                    g.lineBetween(w.start.x, w.start.y, w.end.x, w.end.y);
                    // Vertex handles
                    g.fillStyle(0xffffff, 1);
                    g.fillCircle(w.start.x, w.start.y, 4);
                    g.fillCircle(w.end.x, w.end.y, 4);
                }
            });
            this.mapData.selection.zones.forEach(id => {
                const z = this.mapData.zones.find(x => x.id === id);
                if (z) {
                    for (const v of z.geometry.vertices) {
                        g.fillStyle(0xffffff, 1);
                        g.fillCircle(v.x, v.y, 4);
                    }
                }
            });
        }
    }

    _captureInitialState() {
        this.initialState = [];
        this.mapData.selection.walls.forEach(id => {
            const w = this.mapData.walls.find(x => x.id === id);
            if (w) this.initialState.push({ id, start: {...w.start}, end: {...w.end} });
        });
        this.mapData.selection.zones.forEach(id => {
            const z = this.mapData.zones.find(x => x.id === id);
            if (z) this.initialState.push({ id, vertices: z.geometry.vertices.map(v=>({...v})) });
        });
    }

    _vertexAt(x, y, threshold) {
        // Check wall endpoints of selected walls
        for (const id of this.mapData.selection.walls) {
            const w = this.mapData.walls.find(ww => ww.id === id);
            if (!w) continue;
            if (Math.hypot(x - w.start.x, y - w.start.y) <= threshold)
                return { wallId: id, endpoint: 'start' };
            if (Math.hypot(x - w.end.x, y - w.end.y) <= threshold)
                return { wallId: id, endpoint: 'end' };
        }
        // Check zone vertices of selected zones
        for (const id of this.mapData.selection.zones) {
            const z = this.mapData.zones.find(zz => zz.id === id);
            if (!z) continue;
            for (let i = 0; i < z.geometry.vertices.length; i++) {
                const v = z.geometry.vertices[i];
                if (Math.hypot(x - v.x, y - v.y) <= threshold)
                    return { zoneId: id, vertexIndex: i };
            }
        }
        return null;
    }

    _moveVertex(vtx, x, y) {
        const pt = this.snap.snap(x, y, this.mapData.getAllEndpoints());
        if (!this._vertexDragInitial) {
            // Capture initial state on first move
            if (vtx.wallId) {
                const w = this.mapData.walls.find(ww => ww.id === vtx.wallId);
                if (w) this._vertexDragInitial = { start: {...w.start}, end: {...w.end} };
            } else if (vtx.zoneId) {
                const z = this.mapData.zones.find(zz => zz.id === vtx.zoneId);
                if (z) this._vertexDragInitial = { vertices: z.geometry.vertices.map(v => ({...v})) };
            }
        }
        if (vtx.wallId) {
            const w = this.mapData.walls.find(ww => ww.id === vtx.wallId);
            if (w) {
                if (vtx.endpoint === 'start') w.start = { x: pt.x, y: pt.y };
                else w.end = { x: pt.x, y: pt.y };
            }
        } else if (vtx.zoneId) {
            const z = this.mapData.zones.find(zz => zz.id === vtx.zoneId);
            if (z && z.geometry.vertices[vtx.vertexIndex]) {
                z.geometry.vertices[vtx.vertexIndex] = { x: pt.x, y: pt.y };
            }
        }
        this.mapData._updateSelectionBounds();
    }
}

export class LineTool extends Tool {
    constructor(editor) {
        super(editor);
        this.startPoint = null;
        this.currentMouse = null;
    }
    onMouseDown(x, y, shift) {
        const pt = this.snap.snap(x, y, this.mapData.getAllEndpoints());
        if (!this.startPoint) {
            this.startPoint = pt;
        } else {
            let endPt = pt;
            if (shift) endPt = this._constrainAngle(this.startPoint, pt);
            
            const wall = { id: this.mapData._generateId(), start: this.startPoint, end: endPt, thickness: 20, color: this.editor.activeColor, hp: this.editor.activeHP };
            this.history.execute(new AddWallCommand(this.mapData, wall));
            this.startPoint = endPt; // Chaining
        }
    }
    onMouseMove(x, y) {
        this.currentMouse = this.snap.snap(x, y, this.mapData.getAllEndpoints());
    }
    onKeyDown(key) {
        if (key === 'Escape') this.startPoint = null;
    }
    renderPreview(g) {
        if (this.startPoint && this.currentMouse) {
            g.lineStyle(2, 0xffffff, 0.5);
            g.lineBetween(this.startPoint.x, this.startPoint.y, this.currentMouse.x, this.currentMouse.y);
        }
    }
    getCursor() { return 'crosshair'; }
    
    _constrainAngle(p1, p2) {
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const snappedAngle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12); // 15 deg
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        return { x: p1.x + Math.cos(snappedAngle) * dist, y: p1.y + Math.sin(snappedAngle) * dist };
    }
}

export class PolygonTool extends Tool {
    constructor(editor) {
        super(editor);
        this.center = null;
        this.currentMouse = null;
        this.isDragging = false;
        this.sides = 4; // default square, can be set via editor.polygonSides
    }
    onMouseDown(x, y, shift) {
        const pt = this.snap.snap(x, y, this.mapData.getAllEndpoints());
        this.center = pt;
        this.isDragging = true;
    }
    onMouseMove(x, y) {
        this.currentMouse = x !== undefined ? { x, y } : null;
    }
    onMouseUp(x, y) {
        if (!this.isDragging || !this.center) return;
        this.isDragging = false;
        const pt = { x, y };
        const radius = Math.hypot(pt.x - this.center.x, pt.y - this.center.y);
        if (radius < 5) { this.center = null; return; } // too small, cancel

        const sides = this.editor.polygonSides || this.sides;
        const angle = Math.atan2(pt.y - this.center.y, pt.x - this.center.x);
        this._createPolygon(this.center, radius, angle, sides);

        this.center = null;
        this.currentMouse = null;
    }
    onKeyDown(key) {
        if (key === 'Escape') { this.center = null; this.isDragging = false; }
    }
    renderPreview(g) {
        if (!this.center || !this.currentMouse) return;
        const radius = Math.hypot(this.currentMouse.x - this.center.x, this.currentMouse.y - this.center.y);
        if (radius < 3) return;
        const sides = this.editor.polygonSides || this.sides;
        const angle = Math.atan2(this.currentMouse.y - this.center.y, this.currentMouse.x - this.center.x);
        const verts = this._computePolyVerts(this.center, radius, angle, sides);

        // Preview fill
        g.fillStyle(0xffffff, 0.08);
        g.beginPath();
        g.moveTo(verts[0].x, verts[0].y);
        for (let i = 1; i < verts.length; i++) g.lineTo(verts[i].x, verts[i].y);
        g.closePath();
        g.fillPath();

        // Preview outline
        g.lineStyle(2, 0xffffff, 0.5);
        for (let i = 0; i < verts.length; i++) {
            g.lineBetween(verts[i].x, verts[i].y, verts[(i + 1) % verts.length].x, verts[(i + 1) % verts.length].y);
        }

        // Radius line from center to mouse
        g.lineStyle(1, 0x888888, 0.3);
        g.lineBetween(this.center.x, this.center.y, this.currentMouse.x, this.currentMouse.y);
    }
    _createPolygon(center, radius, baseAngle, sides) {
        const verts = this._computePolyVerts(center, radius, baseAngle, sides);
        const snappedVerts = verts.map(v => this.snap.snap(v.x, v.y, this.mapData.getAllEndpoints()));
        const cmds = [];
        for (let i = 0; i < snappedVerts.length; i++) {
            const start = snappedVerts[i];
            const end = snappedVerts[(i + 1) % snappedVerts.length];
            const wall = { id: this.mapData._generateId(), start, end, thickness: 20, color: this.editor.activeColor, hp: this.editor.activeHP };
            cmds.push(new AddWallCommand(this.mapData, wall));
        }
        this.history.execute(new CompositeCommand(cmds));
    }
    getCursor() { return 'crosshair'; }
}

export class ZoneTool extends Tool {
    constructor(editor) {
        super(editor);
        this.center = null;
        this.currentMouse = null;
        this.isDragging = false;
    }
    onMouseDown(x, y) {
        const pt = this.snap.snap(x, y, []);
        this.center = pt;
        this.isDragging = true;
    }
    onMouseMove(x, y) {
        this.currentMouse = x !== undefined ? { x, y } : null;
    }
    onMouseUp(x, y) {
        if (!this.isDragging || !this.center) return;
        this.isDragging = false;
        const radius = Math.hypot(x - this.center.x, y - this.center.y);
        if (radius < 5) { this.center = null; return; }

        const sides = this.editor.polygonSides || 4;
        const angle = Math.atan2(y - this.center.y, x - this.center.x);
        const verts = this._computePolyVerts(this.center, radius, angle, sides);

        const zone = {
            id: this.mapData._generateId(),
            type: this.editor.activeZoneType,
            color: this.editor.activeColor,
            geometry: { shapeType: 'polygon', vertices: verts }
        };
        this.history.execute(new AddZoneCommand(this.mapData, zone));
        this.center = null;
        this.currentMouse = null;
    }
    onKeyDown(key) {
        if (key === 'Escape') { this.center = null; this.isDragging = false; }
    }
    renderPreview(g) {
        if (!this.center || !this.currentMouse) return;
        const radius = Math.hypot(this.currentMouse.x - this.center.x, this.currentMouse.y - this.center.y);
        if (radius < 3) return;
        const sides = this.editor.polygonSides || 4;
        const angle = Math.atan2(this.currentMouse.y - this.center.y, this.currentMouse.x - this.center.x);
        const verts = this._computePolyVerts(this.center, radius, angle, sides);

        // Preview fill with zone color
        const colorNum = parseInt(this.editor.activeColor.replace('#', '0x'), 16);
        g.fillStyle(colorNum, 0.15);
        g.beginPath();
        g.moveTo(verts[0].x, verts[0].y);
        for (let i = 1; i < verts.length; i++) g.lineTo(verts[i].x, verts[i].y);
        g.closePath();
        g.fillPath();

        // Preview outline
        g.lineStyle(2, colorNum, 0.6);
        for (let i = 0; i < verts.length; i++) {
            g.lineBetween(verts[i].x, verts[i].y, verts[(i + 1) % verts.length].x, verts[(i + 1) % verts.length].y);
        }

        // Radius line
        g.lineStyle(1, 0x888888, 0.3);
        g.lineBetween(this.center.x, this.center.y, this.currentMouse.x, this.currentMouse.y);
    }
    getCursor() { return 'crosshair'; }
}

export class RotateTool extends Tool {
    constructor(editor) {
        super(editor);
        this.isDragging = false;
        this.startAngle = 0;
    }
    onMouseDown(x, y) {
        const bounds = this.mapData.selectedToolBounds;
        if (!bounds) return;
        const handleX = bounds.centerX;
        const handleY = bounds.y - 40;
        if (Math.hypot(x - handleX, y - handleY) < 20) {
            this.isDragging = true;
            this.startAngle = Math.atan2(y - bounds.centerY, x - bounds.centerX);
        }
    }
    onMouseMove(x, y) {
        if (!this.isDragging) return;
        const bounds = this.mapData.selectedToolBounds;
        const currentAngle = Math.atan2(y - bounds.centerY, x - bounds.centerX);
        let delta = (currentAngle - this.startAngle) * 180 / Math.PI;
        // Apply rotation directly for preview (history omitted for brevity, would require snapshotting)
        this.mapData.rotateSelection(delta);
        this.startAngle = currentAngle;
    }
    onMouseUp() { this.isDragging = false; }
    renderPreview(g) {
        const bounds = this.mapData.selectedToolBounds;
        if (bounds) {
            const handleX = bounds.centerX;
            const handleY = bounds.y - 40;
            g.lineStyle(2, 0xffffff, 1);
            g.lineBetween(bounds.centerX, bounds.y, handleX, handleY);
            g.fillStyle(0x00aaff, 1);
            g.fillCircle(handleX, handleY, 8);
        }
    }
}

export class EraserTool extends Tool {
    constructor(editor) {
        super(editor);
        this.isDragging = false;
        this.strokePoints = [];
    }
    onMouseDown(x, y) {
        this.isDragging = true;
        this.strokePoints = [{x, y}];
        this._eraseAt(x, y);
    }
    onMouseMove(x, y) {
        if (this.isDragging) {
            this.strokePoints.push({x, y});
            this._eraseAt(x, y);
        }
        this.currentMouse = {x, y};
    }
    onMouseUp() {
        this.isDragging = false;
        this.strokePoints = [];
    }
    renderPreview(g) {
        if (this.currentMouse) {
            g.lineStyle(2, 0xff0000, 0.8);
            g.strokeCircle(this.currentMouse.x, this.currentMouse.y, 15);
        }
    }
    _eraseAt(x, y) {
        const wall = this.mapData.wallAtPoint(x, y, 15);
        if (wall) this.history.execute(new RemoveWallCommand(this.mapData, wall));
        const zone = this.mapData.zoneAtPoint(x, y);
        if (zone) this.history.execute(new RemoveZoneCommand(this.mapData, zone));
    }
    getCursor() { return 'url(assets/eraser.png) 10 10, crosshair'; } // Fallback to crosshair
}