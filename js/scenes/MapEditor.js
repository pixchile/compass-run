import { W, H, ARENA } from '../constants.js';
import MapLoader from '../systems/MapLoader.js';
import Camera from './Camera.js';
import MapEditorUI from './MapEditorUI.js';
import enemyRegistry from '../enemies/EnemyRegistry.js';
import { registerAllCustomEnemies } from '../enemies/definitions/index.js';

export default class MapEditor extends Phaser.Scene {
  constructor() { super('MapEditor'); }

  create() {
    registerAllCustomEnemies(enemyRegistry);
    this.camera = new Camera();
    this.mapLoader = new MapLoader();
    this.currentMap = this.mapLoader.loadMap('default');
    this.lines    = [...(this.currentMap.lines   || [])];
    this.enemies  = [...(this.currentMap.enemies || [])];
    this.timeLimit      = this.currentMap.timeLimit || 300;
    this.lineThickness  = 10;
    this.showGrid       = true;
    this.mode           = 'draw';
    this.currentLine    = null;
    this.selectedLine   = null;
    this.selectedHandle = null;
    this.dragStart      = null;
    this.enemyTexts     = [];

    this.ui = new MapEditorUI(this);

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      deltaY > 0 ? this.camera.zoomOut(0.05) : this.camera.zoomIn(0.05);
    });

    this.g = this.add.graphics();
    this.isDrawing = false;

    this.ui.createUI();

    this.input.on('pointerdown', this.startDrawing, this);
    this.input.on('pointermove', this.draw, this);
    this.input.on('pointerup',   this.stopDrawing, this);

    const kb = this.input.keyboard;
    kb.on('keydown-G', () => { this.showGrid = !this.showGrid; });
    kb.on('keydown-S', () => this.saveMap());
    kb.on('keydown-L', () => this.loadMap());
    kb.on('keydown-D', () => { this.mode = 'draw';  this.ui.updateModeText(); });
    kb.on('keydown-E', () => { this.mode = 'edit';  this.ui.updateModeText(); });
    kb.on('keydown-R', () => { this.mode = 'erase'; this.ui.updateModeText(); });
    kb.on('keydown-N', () => { this.mode = 'enemy'; this.ui.updateModeText(); });
    kb.on('keydown-T',             () => this.ui.editTimeLimit());
    kb.on('keydown-ESC',           () => this.scene.start('MainMenu'));
    kb.on('keydown-BRACKET_RIGHT', () => { this.lineThickness = Math.min(30, this.lineThickness + 2); this.ui.updateThicknessText(); });
    kb.on('keydown-BRACKET_LEFT',  () => { this.lineThickness = Math.max(4,  this.lineThickness - 2); this.ui.updateThicknessText(); });

    this.ui.updateModeText();
    this.ui.updateThicknessText();
  }

  // ─── INPUT ───────────────────────────────────────────────────────────────

  startDrawing(pointer) {
    this.isDrawing = true;
    const wp = this.camera.screenToWorld(pointer.x, pointer.y);

    if (this.mode === 'draw') {
      this.currentLine = { start: { x: wp.x, y: wp.y }, end: { x: wp.x, y: wp.y }, thickness: this.lineThickness };

    } else if (this.mode === 'edit') {
      const handle = this.findHandleAt(wp);
      if (handle) { this.selectedHandle = handle; }
      else {
        const line = this.findLineAt(wp);
        if (line) { this.selectedLine = line; this.dragStart = wp; }
      }

    } else if (this.mode === 'erase') {
      const line = this.findLineAt(wp);
      if (line) { this.lines.splice(this.lines.indexOf(line), 1); this.ui.updateInfoText(); }

    } else if (this.mode === 'enemy') {
      const idx = this.findEnemyAt(wp);
      if (idx !== -1) {
        this.ui.editEnemy(idx);
      } else if (wp.x >= ARENA.x && wp.x <= ARENA.x + ARENA.w &&
                 wp.y >= ARENA.y && wp.y <= ARENA.y + ARENA.h) {
        this.ui.createEnemyPanel(wp.x, wp.y, null);
      }
    }
  }

getAllEnemyTypes() {
    // Esto requiere modificar EnemyRegistry para que exponga las claves
    return enemyRegistry.getAllTypes(); // Necesita implementar este método
}

  draw(pointer) {
    if (!this.isDrawing) return;
    const wp = this.camera.screenToWorld(pointer.x, pointer.y);

    if (this.mode === 'draw' && this.currentLine) {
      this.currentLine.end = { x: wp.x, y: wp.y };
    } else if (this.mode === 'edit') {
      if (this.selectedHandle) {
        this.selectedHandle.line[this.selectedHandle.point] = { x: wp.x, y: wp.y };
      } else if (this.selectedLine && this.dragStart) {
        const dx = wp.x - this.dragStart.x, dy = wp.y - this.dragStart.y;
        this.selectedLine.start.x += dx; this.selectedLine.start.y += dy;
        this.selectedLine.end.x   += dx; this.selectedLine.end.y   += dy;
        this.dragStart = wp;
      }
    }
  }

  stopDrawing() {
    if (this.mode === 'draw' && this.currentLine) {
      const dx = this.currentLine.end.x - this.currentLine.start.x;
      const dy = this.currentLine.end.y - this.currentLine.start.y;
      if (Math.hypot(dx, dy) > 10) {
        if (this.isLineInArena(this.currentLine)) this.lines.push(this.currentLine);
        else this.ui.showNotification('La línea está fuera del arena', 0xff4444);
      }
      this.currentLine = null;
    }
    this.isDrawing = false;
    this.selectedHandle = this.selectedLine = this.dragStart = null;
    this.ui.updateInfoText();
  }

  // ─── GEOMETRÍA ───────────────────────────────────────────────────────────

  findHandleAt(point, radius = 10) {
    for (const line of this.lines) {
      if (Math.hypot(point.x - line.start.x, point.y - line.start.y) < radius) return { line, point: 'start' };
      if (Math.hypot(point.x - line.end.x,   point.y - line.end.y)   < radius) return { line, point: 'end' };
    }
    return null;
  }

  findLineAt(point, threshold = 10) {
    for (const line of this.lines) {
      if (this.distanceToSegment(point, line.start, line.end) < threshold) return line;
    }
    return null;
  }

findEnemyAt(point, threshold = 20) {
    for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        const def = enemyRegistry.getTypeDefinition(e.type);
        const r = def ? (def.radius || 12) : 12;
        if (Math.hypot(point.x - e.x, point.y - e.y) < r + threshold) return i;
    }
    return -1;
}

  distanceToSegment(p, a, b) {
    const abx = b.x - a.x, aby = b.y - a.y;
    const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby);
    if (t < 0) return Math.hypot(p.x - a.x, p.y - a.y);
    if (t > 1) return Math.hypot(p.x - b.x, p.y - b.y);
    return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
  }

  isLineInArena(line, margin = 5) {
    const { x, y, w, h } = ARENA;
    return line.start.x >= x - margin && line.start.x <= x + w + margin &&
           line.start.y >= y - margin && line.start.y <= y + h + margin &&
           line.end.x   >= x - margin && line.end.x   <= x + w + margin &&
           line.end.y   >= y - margin && line.end.y   <= y + h + margin;
  }

  // ─── GUARDAR / CARGAR ────────────────────────────────────────────────────

  saveMap() {
    this.mapLoader.saveMap({
      name: this.currentMap.name || `Mapa_${Date.now()}`,
      version: 3, arena: ARENA, timeLimit: this.timeLimit,
      lines: this.lines, enemies: this.enemies,
      spawn: { x: W / 2, y: H / 2 },
      createdAt: new Date().toISOString()
    });
    this.ui.showNotification('Mapa guardado correctamente!', 0x44ff88);
    this.ui.updateInfoText();
  }

  loadMap() {
    const maps = this.mapLoader.listMaps();
    if (maps.length === 0) { this.ui.showNotification('No hay mapas guardados', 0xff4444); return; }
    this.ui.createMapSelector(maps);
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────

  update(t, delta) { this.camera.updateEditor(this.input.activePointer); this.render(); }

  render() {
    this.g.clear();
    this.camera.apply(this.g);
    this.enemyTexts.forEach(t => t.destroy());
    this.enemyTexts = [];

    // Arena base
    this.g.fillStyle(0x0c1020, 1);
    this.g.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);

    // Grid
    if (this.showGrid) {
      this.g.lineStyle(1, 0x1a2235, 0.5);
      for (let x = ARENA.x; x <= ARENA.x + ARENA.w; x += 50) this.g.lineBetween(x, ARENA.y, x, ARENA.y + ARENA.h);
      for (let y = ARENA.y; y <= ARENA.y + ARENA.h; y += 50) this.g.lineBetween(ARENA.x, y, ARENA.x + ARENA.w, y);
    }

    // Líneas
    for (const line of this.lines) {
      this.g.lineStyle(line.thickness, 0x4a6a8a, 0.8);
      this.g.lineBetween(line.start.x, line.start.y, line.end.x, line.end.y);
      this.g.lineStyle(2, 0x8abaff, 1);
      this.g.lineBetween(line.start.x, line.start.y, line.end.x, line.end.y);
    }

// Enemigos
for (const enemy of this.enemies) {
    const radius = enemyRegistry.getTypeRadius(enemy.type);
    const color = enemyRegistry.getTypeColor(enemy.type);
    
    this.g.fillStyle(color, 0.7);
    this.g.fillCircle(enemy.x, enemy.y, radius);
    this.g.lineStyle(2, 0xff8888, 0.8);
    this.g.strokeCircle(enemy.x, enemy.y, radius);
    
    if (this.mode === 'enemy') {
        this.g.lineStyle(2, 0xff66ff, 0.8);
        this.g.strokeCircle(enemy.x, enemy.y, radius + 4);
    }

    const spawnText = enemy.spawnTime === 0 ? '0s' : `${enemy.spawnTime}s`;
    const textObj = this.add.text(enemy.x, enemy.y - radius - 8, spawnText, {
        fontFamily: 'monospace', fontSize: '11px',
        fill: enemy.spawnTime === 0 ? '#44ff88' : '#ffaa44',
        backgroundColor: '#000000aa', padding: { x: 3, y: 1 }
    }).setOrigin(0.5).setDepth(100);
    this.enemyTexts.push(textObj);
}

    // Preview línea actual
    if (this.currentLine) {
      this.g.lineStyle(this.currentLine.thickness, 0x44ff88, 0.6);
      this.g.lineBetween(this.currentLine.start.x, this.currentLine.start.y, this.currentLine.end.x, this.currentLine.end.y);
      this.g.lineStyle(2, 0x88ffaa, 1);
      this.g.lineBetween(this.currentLine.start.x, this.currentLine.start.y, this.currentLine.end.x, this.currentLine.end.y);
    }

    // Handles de edición
    if (this.mode === 'edit') {
      for (const line of this.lines) {
        for (const pt of [line.start, line.end]) {
          this.g.fillStyle(0xffaa44, 1); this.g.fillCircle(pt.x, pt.y, 6);
          this.g.lineStyle(2, 0xffffff, 1); this.g.strokeCircle(pt.x, pt.y, 6);
        }
      }
    }

    // Borde arena
    this.g.lineStyle(4, 0x4a6a8a, 1);
    this.g.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);

    this.camera.restore(this.g);
  }
}
