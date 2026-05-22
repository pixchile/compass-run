import { ARENA } from '../constants.js';
import Camera from './Camera.js';
import MapRenderer from '../renderers/MapRenderer.js';
import MapData from '../editor/MapData.js';
import MapHistory from '../editor/MapHistory.js';
import MapSnap from '../editor/MapSnap.js';
import * as Tools from '../editor/MapTools.js';
import MapEditorUI from './MapEditorUI.js';

export default class MapEditor extends Phaser.Scene {
    constructor() { super('MapEditor'); }

    create() {
        // ── Camera (reused from game) ──
        this.camera3 = new Camera();
        this.camera3.scene = this;
        this.camera3.centerOn(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2);
        this.camera3.targetZoom = 0.25;
        this.camera3.zoom = 0.25;
        this.camera3.edgeScrollSpeed = 0;
        this.camera3.edgeThreshold = -1; // disable edge scrolling

        // ── Map renderer (reused from game) ──
        this.mapRenderer = new MapRenderer();

        // ── Data / History / Snap ──
        this.mapData = new MapData();
        this.history = new MapHistory();
        this.snap = new MapSnap();

        // ── Editor state ──
        this.activeColor = '#000000';
        this.activeHP = 300;
        this.activeZoneType = 'void';
        this.polygonSides = 4;
        this._snappedPoint = null; // visual feedback for snap
        this._isPanning = false;
        this._panStart = null;
        this._panCamStart = null;
        this._worldMouse = { x: 0, y: 0 };

        // ── Tools ──
        this.tools = {
            select: new Tools.SelectTool(this),
            line: new Tools.LineTool(this),
            polygon: new Tools.PolygonTool(this),
            zone: new Tools.ZoneTool(this),
            rotate: new Tools.RotateTool(this),
            eraser: new Tools.EraserTool(this)
        };
        this.currentTool = this.tools.select;

        // ── UI (DOM sidebar) ──
        this.ui = new MapEditorUI(this);

        // ── Graphics (top layer, after UI so it's below DOM) ──
        this.graphics = this.add.graphics();
        this._bgImage = null;

        // ── Mouse input ──
        this.input.on('pointerdown', (p) => this._handleMouseDown(p));
        this.input.on('pointermove', (p) => this._handleMouseMove(p));
        this.input.on('pointerup', (p) => this._handleMouseUp(p));
        this.input.on('wheel', (_p, _go, _dx, dy) => {
            if (dy < 0) this.camera3.zoomIn(0.05);
            else this.camera3.zoomOut(0.05);
        });

        // ── Keyboard shortcuts ──
        this.input.keyboard.on('keydown', (e) => this._handleKeyDown(e));

        // Prevent context menu on right-click
        this.input.mouse.disableContextMenu();

        // Cleanup UI when leaving scene
        this.events.once('shutdown', () => {
            this.ui?.destroy();
        });
    }

    update(_time, _delta) {
        const ptr = this.input.activePointer;
        const mx = ptr.x;
        const my = ptr.y;

        // Update camera (edge scroll etc.)
        this.camera3.updateEditor(mx, my);

        // Convert mouse to world coordinates
        this._worldMouse = this.camera3.screenToWorld(mx, my);

        // If panning, update camera position
        if (this._isPanning && this._panStart) {
            const dx = (mx - this._panStart.x) / this.camera3.zoom;
            const dy = (my - this._panStart.y) / this.camera3.zoom;
            this.camera3.centerOn(
                this._panCamStart.x - dx,
                this._panCamStart.y - dy
            );
        }

        // Snap visual feedback (for line/polygon/zone tools)
        if (['line', 'polygon', 'zone'].includes(this._currentToolName()) && !this._isPanning) {
            this._updateSnapIndicator();
        } else {
            this._snappedPoint = null;
        }

        // Update tool mouse position (in world coords)
        if (!this._isPanning) {
            this.currentTool.onMouseMove(this._worldMouse.x, this._worldMouse.y);
        }

        // ── RENDER ──
        this.graphics.clear();

        // Sync background image with custom camera (position + zoom)
        if (this._bgImage) {
            const cam = this.camera3;
            const screenOrigin = cam.worldToScreen(this.mapData.arena.x, this.mapData.arena.y);
            this._bgImage.setPosition(screenOrigin.x, screenOrigin.y);
            this._bgImage.setScale(this._bgImage._worldScale * cam.zoom);
        }

        this.camera3.apply(this.graphics);

        // Background image sits at depth 0 (same as grid/walls)
        this._renderGrid();
        this._renderZones();
        this._renderWalls();
        this._renderSnapIndicator();
        this._renderSelectionHighlight();
        this.currentTool.renderPreview(this.graphics);

        this.camera3.restore(this.graphics);

        // Keep UI selection info updated
        if (this.ui) this.ui._updateSelectionInfo();
    }

    // ── Tool switching ──
    setTool(toolName) {
        if (this.currentTool.deactivate) this.currentTool.deactivate();
        this.currentTool = this.tools[toolName];
        if (this.currentTool.activate) this.currentTool.activate();
        if (this.ui) this.ui._updateToolButtons();
    }

    // Refresh tool references after mapData/history is replaced
    _rebindTools() {
        for (const name of Object.keys(this.tools)) {
            const tool = this.tools[name];
            tool.mapData = this.mapData;
            tool.history = this.history;
        }
    }

    _currentToolName() {
        for (const [name, tool] of Object.entries(this.tools)) {
            if (tool === this.currentTool) return name;
        }
        return 'select';
    }

    // ── Mouse handlers ──
    _handleMouseDown(ptr) {
        // Right button → start pan
        if (ptr.rightButtonDown()) {
            this._isPanning = true;
            this._panStart = { x: ptr.x, y: ptr.y };
            this._panCamStart = { x: this.camera3.x, y: this.camera3.y };
            return;
        }

        // Middle button → also pan
        if (ptr.middleButtonDown()) {
            this._isPanning = true;
            this._panStart = { x: ptr.x, y: ptr.y };
            this._panCamStart = { x: this.camera3.x, y: this.camera3.y };
            return;
        }

        if (this._isPanning) return;

        this.currentTool.onMouseDown(
            this._worldMouse.x, this._worldMouse.y,
            ptr.event?.shiftKey || false,
            ptr.event?.ctrlKey || false
        );
    }

    _handleMouseMove(ptr) {
        if (this._isPanning) return;
        // onMouseMove is called in update() with world coords
    }

    _handleMouseUp(ptr) {
        if (this._isPanning) {
            this._isPanning = false;
            this._panStart = null;
            this._panCamStart = null;
            return;
        }
        this.currentTool.onMouseUp(this._worldMouse.x, this._worldMouse.y);
    }

    // ── Keyboard ──
    _handleKeyDown(e) {
        // Ctrl+Z → undo
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            this.history.undo();
            this.mapData._updateSelectionBounds();
            return;
        }

        // Ctrl+Y → redo
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            this.history.redo();
            this.mapData._updateSelectionBounds();
            return;
        }

        // Ctrl+S → save/export
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (this.ui) this.ui._saveMap();
            return;
        }

        // Tool shortcuts (only when not typing in an input)
        const tag = e.originalEvent?.target?.tagName || '';
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

        switch (e.key.toLowerCase()) {
            case 's': this.setTool('select'); break;
            case 'l': this.setTool('line'); break;
            case 'p': this.setTool('polygon'); break;
            case 'z': this.setTool('zone'); break;
            case 'r': this.setTool('rotate'); break;
            case 'e': this.setTool('eraser'); break;
            case 'delete':
            case 'backspace':
                this.currentTool.onKeyDown('Delete');
                break;
            case 'c':
                if (!e.ctrlKey) {
                    const count = this.snap.calibrateSelection(this.mapData);
                    if (count > 0) console.log(`Calibrated ${count} walls`);
                }
                break;
            case 'escape':
                this.mapData.clearSelection();
                this.currentTool.onKeyDown('Escape');
                break;
        }

        if (this.ui) this.ui._updateToolButtons();
    }

    // ── Background image management ──
    loadBackgroundImage(url, filename) {
        if (this._bgImage) {
            this._bgImage.destroy();
            this._bgImage = null;
        }

        const arena = this.mapData.arena;
        const key = 'editor_bg_' + Date.now();

        // Use native Image to bypass Phaser downscaling on large textures
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const scaleX = arena.w / img.width;
            const scaleY = arena.h / img.height;
            const worldScale = Math.min(scaleX, scaleY);
            const drawW = Math.floor(img.width * worldScale);
            const drawH = Math.floor(img.height * worldScale);

            // Draw into an offscreen canvas at the scaled arena size
            const cvs = document.createElement('canvas');
            cvs.width = drawW;
            cvs.height = drawH;
            const ctx = cvs.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, drawW, drawH);

            // Add to Phaser textures as a canvas texture
            if (this.textures.exists(key)) this.textures.remove(key);
            this.textures.addCanvas(key, cvs);
            this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);

            this._bgImage = this.add.image(arena.x, arena.y, key)
                .setOrigin(0, 0)
                .setDepth(-1)
                .setScale(1);

            this._bgImage._worldScale = 1;
            this._bgImage._imgW = drawW;
            this._bgImage._imgH = drawH;
        };
        img.src = url;
    }

    removeBackgroundImage() {
        if (this._bgImage) {
            this._bgImage.destroy();
            this._bgImage = null;
        }
        this._bgTexKey = null;
    }

    // ── Rendering ──
    _renderGrid() {
        const cam = this.camera3;
        if (cam.zoom < 0.08) return;

        const arena = this.mapData.arena;
        const ax = arena.x, ay = arena.y, aw = arena.w, ah = arena.h;

        // ── Arena background ──
        if (!this._bgImage) {
            this.graphics.fillStyle(0x0a0a12, 1);
            this.graphics.fillRect(ax, ay, aw, ah);
        }

        const viewLeft = cam.x - (cam.viewWidth / 2) / cam.zoom;
        const viewTop = cam.y - (cam.viewHeight / 2) / cam.zoom;
        const viewRight = cam.x + (cam.viewWidth / 2) / cam.zoom;
        const viewBottom = cam.y + (cam.viewHeight / 2) / cam.zoom;

        // Adaptive grid
        let gridSize;
        if (cam.zoom < 0.2) gridSize = 200;
        else if (cam.zoom < 0.4) gridSize = 100;
        else if (cam.zoom < 0.8) gridSize = 50;
        else gridSize = this.snap.gridSize;

        const startX = Math.floor(viewLeft / gridSize) * gridSize;
        const startY = Math.floor(viewTop / gridSize) * gridSize;

        // Grid lines — more visible
        const gridAlpha = Math.min(0.6, cam.zoom * 1.2);
        this.graphics.lineStyle(1, 0x334455, gridAlpha);

        for (let x = startX; x <= viewRight; x += gridSize) {
            if (x >= ax && x <= ax + aw) {
                this.graphics.lineBetween(x, Math.max(viewTop, ay), x, Math.min(viewBottom, ay + ah));
            }
        }
        for (let y = startY; y <= viewBottom; y += gridSize) {
            if (y >= ay && y <= ay + ah) {
                this.graphics.lineBetween(Math.max(viewLeft, ax), y, Math.min(viewRight, ax + aw), y);
            }
        }

        // Major grid lines (every 5th) — bolder
        const majorGrid = gridSize * 5;
        if (majorGrid >= gridSize * 2) {
            this.graphics.lineStyle(1.5, 0x445566, gridAlpha * 0.8);
            const majorStartX = Math.floor(viewLeft / majorGrid) * majorGrid;
            const majorStartY = Math.floor(viewTop / majorGrid) * majorGrid;
            for (let x = majorStartX; x <= viewRight; x += majorGrid) {
                if (x >= ax && x <= ax + aw) {
                    this.graphics.lineBetween(x, Math.max(viewTop, ay), x, Math.min(viewBottom, ay + ah));
                }
            }
            for (let y = majorStartY; y <= viewBottom; y += majorGrid) {
                if (y >= ay && y <= ay + ah) {
                    this.graphics.lineBetween(Math.max(viewLeft, ax), y, Math.min(viewRight, ax + aw), y);
                }
            }
        }

        // Arena border — prominent
        this.graphics.lineStyle(3, 0x667788, 1);
        this.graphics.strokeRect(ax, ay, aw, ah);

        // Arena border glow
        this.graphics.lineStyle(1, 0x334466, 0.5);
        this.graphics.strokeRect(ax - 2, ay - 2, aw + 4, ah + 4);
    }

    _renderZones() {
        if (this.mapData.zones.length === 0) return;
        // Convert internal zones to the format MapRenderer expects
        const renderZones = this.mapData.zones.map(z => ({
            type: z.type,
            color: z.color,
            geometry: z.geometry
        }));
        this.mapRenderer.renderZones(this.graphics, renderZones);

        // Highlight selected zones
        this.mapData.selection.zones.forEach(id => {
            const z = this.mapData.zones.find(zone => zone.id === id);
            if (z && z.geometry.vertices && z.geometry.vertices.length >= 3) {
                const v = z.geometry.vertices;
                this.graphics.lineStyle(3, 0xffaa00, 0.7);
                this.graphics.beginPath();
                this.graphics.moveTo(v[0].x, v[0].y);
                for (let i = 1; i < v.length; i++) {
                    this.graphics.lineTo(v[i].x, v[i].y);
                }
                this.graphics.closePath();
                this.graphics.strokePath();
            }
        });
    }

    _renderWalls() {
        if (this.mapData.walls.length === 0) return;
        // Convert walls to lines format MapRenderer expects
        const wallsData = this.mapData.walls.map(w => ({
            start: w.start,
            end: w.end,
            thickness: w.thickness,
            color: w.color,
            hp: w.hp,
            _origHp: w.hp
        }));
        this.mapRenderer.renderLines(this.graphics, wallsData);

        // White outline on top for visibility
        for (const w of this.mapData.walls) {
            this.graphics.lineStyle(w.thickness + 2, 0xffffff, 0.25);
            this.graphics.lineBetween(w.start.x, w.start.y, w.end.x, w.end.y);
        }
    }

    _renderSelectionHighlight() {
        const bounds = this.mapData.selectedToolBounds;
        if (!bounds) return;

        // Bounding box
        this.graphics.lineStyle(2, 0xffaa00, 1);
        this.graphics.strokeRect(bounds.x - 5, bounds.y - 5, bounds.w + 10, bounds.h + 10);

        // Rotate handle (shown only when RotateTool is active or selection exists)
        const isRotating = this.currentTool === this.tools.rotate;
        if (isRotating) {
            const handleX = bounds.centerX;
            const handleY = bounds.y - 40;
            this.graphics.lineStyle(2, 0x00aaff, 1);
            this.graphics.lineBetween(bounds.centerX, bounds.y, handleX, handleY);
            this.graphics.fillStyle(0x00aaff, 0.8);
            this.graphics.fillCircle(handleX, handleY, 10);
            this.graphics.lineStyle(1, 0xffffff, 1);
            this.graphics.strokeCircle(handleX, handleY, 10);
        }
    }

    _renderSnapIndicator() {
        if (!this._snappedPoint) return;
        const s = this._snappedPoint;
        const size = 8;
        this.graphics.lineStyle(2, 0x00ffff, 0.8);
        // Crosshair
        this.graphics.lineBetween(s.x - size, s.y, s.x + size, s.y);
        this.graphics.lineBetween(s.x, s.y - size, s.x, s.y + size);
        this.graphics.fillStyle(0x00ffff, 0.3);
        this.graphics.fillCircle(s.x, s.y, 3);
    }

    _updateSnapIndicator() {
        const mx = this._worldMouse.x;
        const my = this._worldMouse.y;
        const endpoints = this.mapData.getAllEndpoints();
        const result = this.snap.snap(mx, my, endpoints);
        if (result.snapped) {
            this._snappedPoint = { x: result.x, y: result.y };
        } else {
            this._snappedPoint = null;
        }
    }
}
