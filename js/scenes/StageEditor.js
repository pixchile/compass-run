// StageEditor.js — Editor de stages con línea de tiempo
import enemyRegistry from '../enemies/EnemyRegistry.js';
import { registerAllCustomEnemies } from '../enemies/definitions/index.js';
import SVGMapLoader from '../systems/SVGMapLoader.js';
import MapRenderer from '../renderers/MapRenderer.js';
import Camera from './Camera.js';
import StageEditorUI from './StageEditorUI.js';
import { ARENA } from '../constants.js';

export default class StageEditor extends Phaser.Scene {
  constructor() { super('StageEditor'); }

  create() {
    registerAllCustomEnemies(enemyRegistry);
    this.camera   = new Camera();
    this.svgLoader = new SVGMapLoader();
    this.mapRenderer = new MapRenderer();

    this.input.mouse.disableContextMenu();
    this.sys.game.canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
    this.camera.edgeThreshold = 0;

    this._mouseX = this.scale.width / 2;
    this._mouseY = this.scale.height / 2;
    this._onDocMouseMove = (ev) => {
      const rect = this.sys.game.canvas.getBoundingClientRect();
      this._mouseX = ev.clientX - rect.left;
      this._mouseY = ev.clientY - rect.top;
    };
    document.addEventListener('mousemove', this._onDocMouseMove);

    // --- Estado del stage ---
    this.stageName    = 'nuevo_stage';
    this.svgName      = null;
    this.currentMap   = null;
    this.enemies      = [];
    this.spawners     = [];
    this.timeLimit    = 300;

    this.maxBase      = 20;
    this.maxPerMin    = 5;
    this.minBase      = 0;
    this.minPerMin    = 0;
    this.fillTypes    = [];
    this._fillRoundRobin = 0;

    this.squads         = [];
    this.squadInstances = [];
    this.editingSquad   = false;
    this._squadDraft     = null;
    this.selectedSquad  = null;
    this.placingSquad   = false;

    // --- Estado del editor ---
    this.currentTime   = 0;
    this.selectedType  = null;
    this.placingMode   = false;
    this.selectedEnemy = null;
    this.placingSpawner = false;
    this.selectedSpawner = null;
    this.editingPath = false;
    this._editingPathIndex = 0;
    this._copiedSpawner = null;
    this._pathMode = null;           // null | 'rotate' | 'moveAll'
    this._pathModeStartAngle = 0;
    this._pathModeStartWp = null;
    this._pathModeStartMouse = null;

    this.g = this.add.graphics();

    this._dragActive = false;
    this._isDragging = false;
    this._dragStartScreenX = 0;
    this._dragStartScreenY = 0;
    this._dragStartCamX = 0;
    this._dragStartCamY = 0;

    this.ui = new StageEditorUI(this);
    this.ui.build();
    this._bindInput();
    this.events.once('shutdown', () => this._cleanup());
  }

  // ─── TIMELINE ────────────────────────────────────────────────────────

  _getTimelineMax() {
    let maxT = this.timeLimit || 60;
    for (const e of this.enemies) {
      if (e.spawnTime > maxT) maxT = e.spawnTime;
    }
    return Math.max(maxT + 30, 60);
  }

  // ─── SELECTION ───────────────────────────────────────────────────────

  _selectEnemy(idx) {
    this.selectedEnemy = idx;
    this.placingMode   = false;
    this._deselectSpawner();
    this.ui.showEnemyInfo(idx);
  }

  _deselectEnemy() {
    this.selectedEnemy = null;
    this.ui.hideEnemyInfo();
  }

  _selectSpawner(idx) {
    this.selectedSpawner = idx;
    this.placingMode = false;
    this.placingSpawner = false;
    this._deselectEnemy();
    this.ui.refreshSpawnerInfo();
  }

  _deselectSpawner() {
    this.selectedSpawner = null;
    this.editingPath = false;
    this._editingPathIndex = 0;
    this._pathMode = null;
    this._pathModeStartWp = null;
    this._pathModeStartMouse = null;
    this.ui.hideSpawnerInfo();
    this.ui.updateCursor();
  }

  /** Return the waypoint array for the currently selected spawner + path. */
  _getActiveWaypoints() {
    if (this.selectedSpawner === null) return null;
    const s = this.spawners[this.selectedSpawner];
    if (s.paths && s.paths.length > 0) {
      const ap = s.paths[this._editingPathIndex];
      return ap ? (ap.path || (ap.path = [])) : null;
    }
    return s.path || (s.path = []);
  }

  _selectSquad(idx) {
    this.selectedSquad = idx;
    this.placingMode = false;
    this.placingSpawner = false;
    this._deselectEnemy();
    this._deselectSpawner();
    this.ui.showSquadInfo(idx);
  }

  _deselectSquad() {
    this.selectedSquad = null;
    this.ui.hideSquadInfo();
  }

  _trySelectSquadAt(wp) {
    return false;
  }

  mirrorPath(axis) {
    const wpList = this._getActiveWaypoints();
    if (!wpList || wpList.length === 0) return;
    const s = this.spawners[this.selectedSpawner];
    const cx = s.x, cy = s.y;
    for (const wp of wpList) {
      if (axis === 'v' || axis === 'both') wp.y = cy - (wp.y - cy);
      if (axis === 'h' || axis === 'both') wp.x = cx - (wp.x - cx);
    }
    this.ui.refreshSpawnerInfo();
  }

  _trySelectAt(wp) {
    const threshold = 20;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Math.hypot(e.x - wp.x, e.y - wp.y) < threshold) {
        this._selectEnemy(i);
        return;
      }
    }
    this._deselectEnemy();
    this._trySelectSquadAt(wp);
  }

  _trySelectSpawnerAt(wp) {
    const threshold = 22;
    for (let i = this.spawners.length - 1; i >= 0; i--) {
      const s = this.spawners[i];
      if (Math.hypot(s.x - wp.x, s.y - wp.y) < threshold) {
        this._selectSpawner(i);
        return true;
      }
    }
    this._deselectSpawner();
    return false;
  }

  // ─── INPUT (canvas / Phaser handlers) ────────────────────────────────

  _bindInput() {
    // pointerdown: right-click cancels; left-click starts drag tracking
    this.input.on('pointerdown', (ptr) => {
      if (ptr.rightButtonDown?.()) {
        ptr.event?.preventDefault();
        if (this._pathMode) { this._pathMode = null; this.ui.updateCursor(); return; }
        if (this.editingPath) {
          this.editingPath = false;
          this.ui.updateCursor();
          return;
        }
        this.placingMode = false;
        this.placingSpawner = false;
        this.placingSquad = false;
        this._deselectEnemy();
        this._deselectSpawner();
        this._deselectSquad();
        this.ui.updateCursor();
        return;
      }

      if (ptr.x < 210) return;
      if (ptr.y > this.scale.height - 90) return;

      // Path mode operations (rotate / moveAll)
      if (this._pathMode && this.selectedSpawner !== null) {
        const wp = this.camera.screenToWorld(ptr.x, ptr.y);
        const s = this.spawners[this.selectedSpawner];
        if (this._pathMode === 'moveAll') {
          this._pathModeStartMouse = { sx: wp.x, sy: wp.y };
          const wpList = this._getActiveWaypoints();
          this._pathModeStartWp = wpList ? wpList.map(w => ({ x: w.x, y: w.y })) : null;
        } else if (this._pathMode === 'rotate') {
          this._pathModeStartAngle = Math.atan2(wp.y - s.y, wp.x - s.x);
          // snapshot waypoints
          const wpList = this._getActiveWaypoints();
          this._pathModeStartWp = wpList ? wpList.map(w => ({ x: w.x, y: w.y })) : null;
        }
        this._dragActive = true;
        this._isDragging = false;
        return;
      }

      this._dragActive = true;
      this._isDragging = false;
      this._dragStartScreenX = ptr.x;
      this._dragStartScreenY = ptr.y;
      this._dragStartCamX = this.camera.x;
      this._dragStartCamY = this.camera.y;

      this._draggingEntity = null;
      const wpDown = this.camera.screenToWorld(ptr.x, ptr.y);

      if (this.selectedSpawner !== null && !this.editingPath) {
        const s = this.spawners[this.selectedSpawner];
        if (s && Math.hypot(s.x - wpDown.x, s.y - wpDown.y) < 22) {
          this._draggingEntity = 'spawner';
        }
      }

      if (!this._draggingEntity && this.selectedEnemy !== null) {
        const e = this.enemies[this.selectedEnemy];
        if (e && Math.hypot(e.x - wpDown.x, e.y - wpDown.y) < 22) {
          this._draggingEntity = 'enemy';
        }
      }
    });

    // pointermove: drag entity or pan camera
    this.input.on('pointermove', (ptr) => {
      if (!this._dragActive || !ptr.isDown) return;

      // Path mode drag (rotate / moveAll)
      if (this._pathMode && this.selectedSpawner !== null && this._pathModeStartWp) {
        const wp = this.camera.screenToWorld(ptr.x, ptr.y);
        const s = this.spawners[this.selectedSpawner];
        const wpList = this._getActiveWaypoints();
        if (!wpList) return;

        if (this._pathMode === 'moveAll') {
          const dx = wp.x - this._pathModeStartMouse.sx;
          const dy = wp.y - this._pathModeStartMouse.sy;
          for (let i = 0; i < wpList.length; i++) {
            if (i < this._pathModeStartWp.length) {
              wpList[i].x = this._pathModeStartWp[i].x + dx;
              wpList[i].y = this._pathModeStartWp[i].y + dy;
            }
          }
        } else if (this._pathMode === 'rotate') {
          const curAngle = Math.atan2(wp.y - s.y, wp.x - s.x);
          const delta = curAngle - this._pathModeStartAngle;
          const cosD = Math.cos(delta), sinD = Math.sin(delta);
          for (let i = 0; i < wpList.length; i++) {
            if (i < this._pathModeStartWp.length) {
              const rx = this._pathModeStartWp[i].x - s.x;
              const ry = this._pathModeStartWp[i].y - s.y;
              wpList[i].x = s.x + rx * cosD - ry * sinD;
              wpList[i].y = s.y + rx * sinD + ry * cosD;
            }
          }
        }
        return;
      }

      const dx = ptr.x - this._dragStartScreenX;
      const dy = ptr.y - this._dragStartScreenY;
      if (!this._isDragging && Math.hypot(dx, dy) > 3) {
        this._isDragging = true;
        document.body.style.cursor = 'grabbing';
      }
      if (this._isDragging) {
        if (this._draggingEntity === 'spawner') {
          const wp = this.camera.screenToWorld(ptr.x, ptr.y);
          const s = this.spawners[this.selectedSpawner];
          if (s) { s.x = wp.x; s.y = wp.y; }
        } else if (this._draggingEntity === 'enemy') {
          const wp = this.camera.screenToWorld(ptr.x, ptr.y);
          const e = this.enemies[this.selectedEnemy];
          if (e) { e.x = wp.x; e.y = wp.y; }
        } else {
          this.camera.x = this._dragStartCamX - dx / this.camera.zoom;
          this.camera.y = this._dragStartCamY - dy / this.camera.zoom;
          this.camera.x = Math.max(ARENA.x, Math.min(ARENA.x + ARENA.w, this.camera.x));
          this.camera.y = Math.max(ARENA.y, Math.min(ARENA.y + ARENA.h, this.camera.y));
        }
      }
    });

    // pointerup: if click (no drag), place enemy/spawner/waypoint
    this.input.on('pointerup', (ptr) => {
      if (!this._dragActive) return;

      // Path mode drag finished
      if (this._pathMode) {
        this._dragActive = false;
        this._isDragging = false;
        this.ui.refreshSpawnerInfo();
        return;
      }

      const wasDrag = this._isDragging;
      const dragEntity = this._draggingEntity;
      this._dragActive = false;
      this._isDragging = false;
      this._draggingEntity = null;
      this.ui.updateCursor();

      if (wasDrag) {
        if (dragEntity === 'spawner') {
          this.ui.refreshSpawnerInfo();
        }
        return;
      }

      if (ptr.x < 210) return;
      if (ptr.y > this.scale.height - 90) return;

      const wp = this.camera.screenToWorld(ptr.x, ptr.y);

      if (this.editingPath && this.selectedSpawner !== null) {
        const sp = this.spawners[this.selectedSpawner];
        if (sp.paths && sp.paths.length > 0) {
          const activePath = sp.paths[this._editingPathIndex];
          if (!activePath.path) activePath.path = [];
          activePath.path.push({ x: wp.x, y: wp.y, wait: 0 });
        } else {
          if (!sp.path) sp.path = [];
          sp.path.push({ x: wp.x, y: wp.y, wait: 0 });
        }
        this.ui.refreshSpawnerInfo();
        return;
      }

      if (this.placingSpawner) {
        this.spawners.push({ x: wp.x, y: wp.y, types: [], interval: 0, waveInterval: 0, waveCount: 0, waveDelay: 0, startTime: 0, expireTime: 0, path: [], pathMode: 'loop', pathCycles: 0, waypointWait: 0 });
        this.ui.refreshTimeline();
        return;
      }

      if (this.placingSquad) {
        const squadName = this._placingSquadName;
        if (squadName && this.squads.find(s => s.name === squadName)) {
          this.squadInstances.push({ squadName, spawnTime: this.currentTime });
          this.placingSquad = false;
          this._placingSquadName = null;
          this.ui.refreshTimeline();
          this.ui.updateCursor();
          this.ui.refreshSquadList();
        }
        return;
      }

      if (this.editingSquad && this._squadDraft) {
        if (this.selectedType) {
          this._squadDraft.members.push({
            type: this.selectedType,
            offsetX: wp.x - this._squadCenterX,
            offsetY: wp.y - this._squadCenterY
          });
          this.ui.refreshSquadEditor();
        }
        return;
      }

      if (this.placingMode && this.selectedType) {
        if (ptr.event?.altKey) {
          this._trySelectAt(wp);
        } else {
          this.enemies.push({ type: this.selectedType, x: wp.x, y: wp.y, spawnTime: this.currentTime });
          this.ui.refreshTypeList();
          this.ui.refreshTimeline();
        }
        return;
      }

      if (!this._trySelectSpawnerAt(wp)) {
        this._trySelectAt(wp);
      }
    });

    // Teclas
    this.input.keyboard.on('keydown-ESC', () => {
      if (this._pathMode) {
        this._pathMode = null;
        this.ui.updateCursor();
        return;
      }
      if (this.editingPath) {
        this.editingPath = false;
        this.ui.updateCursor();
        this.ui.refreshSpawnerInfo();
        return;
      }
      if (this.editingSquad) {
        this.cancelSquadEdit();
        return;
      }
      if (this.placingMode || this.placingSpawner || this.placingSquad) {
        this.placingMode = false;
        this.placingSpawner = false;
        this.placingSquad = false;
        this._placingSquadName = null;
        this.ui.updateCursor();
      } else {
        this.scene.start('MainMenu');
      }
    });
    this.input.keyboard.on('keydown-DELETE', () => {
      if (this.selectedSpawner !== null) {
        this.spawners.splice(this.selectedSpawner, 1);
        this._deselectSpawner();
        this.ui.refreshTimeline();
        return;
      }
      if (this.selectedEnemy !== null) {
        this.enemies.splice(this.selectedEnemy, 1);
        this._deselectEnemy();
        this.ui.refreshTypeList();
        this.ui.refreshTimeline();
        return;
      }
      if (this.selectedSquad !== null) {
        this.squadInstances.splice(this.selectedSquad, 1);
        this._deselectSquad();
        this.ui.refreshTimeline();
      }
    });

    // Ctrl+C: copiar spawner seleccionado
    this.input.keyboard.on('keydown-C', (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (this.selectedSpawner !== null) {
        this._copiedSpawner = JSON.parse(JSON.stringify(this.spawners[this.selectedSpawner]));
        this.ui.toast('Spawner copiado (Ctrl+V para pegar)', 'inf');
      }
    });

    // Ctrl+V: pegar spawner copiado en posicion del mouse
    this.input.keyboard.on('keydown-V', (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (!this._copiedSpawner) return;
      const wp = this.camera.screenToWorld(this._mouseX, this._mouseY);
      const clone = JSON.parse(JSON.stringify(this._copiedSpawner));
      clone.x = wp.x;
      clone.y = wp.y;
      this.spawners.push(clone);
      this._selectSpawner(this.spawners.length - 1);
      this.ui.refreshTimeline();
      this.ui.toast('Spawner pegado', 'ok');
    });

    this.input.keyboard.on('keydown-G', () => { this.showGrid = !this.showGrid; });

    // Zoom con rueda
    this.input.on('wheel', (ptr, _, __, deltaY) => {
      deltaY > 0 ? this.camera.zoomOut(0.05) : this.camera.zoomIn(0.05);
    });
  }

  // ─── GUARDAR / CARGAR ─────────────────────────────────────────────────────

  _save() {
    const stage = {
      name:          this.stageName,
      svgName:       this.svgName,
      svgContent:    this.svgContent || null,
      version:       5,
      timeLimit:     this.timeLimit,
      enemies:       this.enemies,
      spawners:      this.spawners,
      squads:        this.squads,
      squadInstances: this.squadInstances,
      density: {
        maxBase:     this.maxBase,
        maxPerMin:   this.maxPerMin,
        minBase:     this.minBase,
        minPerMin:   this.minPerMin,
        fillTypes:   this.fillTypes,
      }
    };
    const all = this._getAllStages();
    const idx = all.findIndex(s => s.name === stage.name);
    if (idx !== -1) all[idx] = stage; else all.push(stage);
    localStorage.setItem('cr_stages', JSON.stringify(all));
    this.ui.toast(`Stage "${this.stageName}" guardado`, 'ok');
  }

  _deleteStage() {
    const all = this._getAllStages();
    if (!all.length) { this.ui.toast('No hay stages guardados', 'err'); return; }
    const name = prompt('Stages disponibles:\n' + all.map(s=>s.name).join('\n') + '\n\nEscribe el nombre a BORRAR:');
    if (!name) return;
    const idx = all.findIndex(s => s.name === name);
    if (idx === -1) { this.ui.toast('No encontrado', 'err'); return; }
    if (!confirm(`¿Borrar stage "${name}"? Esto no se puede deshacer.`)) return;
    all.splice(idx, 1);
    localStorage.setItem('cr_stages', JSON.stringify(all));
    this.ui.toast(`Stage "${name}" borrado`, 'ok');
  }

  _exportStage() {
    const stage = {
      name:         this.stageName,
      svgName:      this.svgName || null,
      svgContent:   this.svgContent || null,
      version:      5,
      timeLimit:    this.timeLimit,
      enemies:      this.enemies,
      spawners:     this.spawners,
      squads:       this.squads,
      squadInstances: this.squadInstances,
      density: {
        maxBase:    this.maxBase,
        maxPerMin:  this.maxPerMin,
        minBase:    this.minBase,
        minPerMin:  this.minPerMin,
        fillTypes:  this.fillTypes,
      }
    };
    const blob = new Blob([JSON.stringify(stage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.stageName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.ui.toast(`Stage "${this.stageName}" exportado`, 'ok');
  }

  _importStage(ev) {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const stage = JSON.parse(e.target.result);
        if (!stage.name || !stage.svgContent) {
          this.ui.toast('Archivo inválido: falta name o svgContent', 'err');
          return;
        }
        const all = this._getAllStages();
        const idx = all.findIndex(s => s.name === stage.name);
        if (idx !== -1) {
          if (!confirm(`El stage "${stage.name}" ya existe. ¿Sobrescribir?`)) return;
          all[idx] = stage;
        } else {
          all.push(stage);
        }
        localStorage.setItem('cr_stages', JSON.stringify(all));
        this.ui.toast(`Stage "${stage.name}" importado`, 'ok');
      } catch {
        this.ui.toast('Error al leer el archivo JSON', 'err');
      }
    };
    reader.readAsText(file);
    ev.target.value = '';
  }

  _loadStage() {
    const all = this._getAllStages();
    if (!all.length) { this.ui.toast('No hay stages guardados', 'err'); return; }
    const name = prompt('Stages disponibles:\n' + all.map(s=>s.name).join('\n') + '\n\nEscribe el nombre:');
    const stage = all.find(s => s.name === name);
    if (!stage) { this.ui.toast('No encontrado', 'err'); return; }
    this._applyStage(stage);
  }

  _applyStage(stage) {
    this.stageName  = stage.name;
    this.svgName    = stage.svgName;
    this.svgContent = stage.svgContent || null;
    if (this.svgContent && this.svgName) {
      this.currentMap = this.svgLoader.parseSVG(this.svgContent, this.svgName);
    }
    this.timeLimit      = stage.timeLimit || 300;
    this.enemies        = stage.enemies  || [];
    this.spawners       = stage.spawners || [];
    this.squads         = stage.squads || [];
    this.squadInstances = stage.squadInstances || [];
    const d = stage.density || {};
    this.maxBase    = d.maxBase   ?? 20;
    this.maxPerMin  = d.maxPerMin ?? 5;
    this.minBase    = d.minBase   ?? 0;
    this.minPerMin  = d.minPerMin ?? 0;
    this.fillTypes  = d.fillTypes || [];
    this._fillRoundRobin = 0;

    this.ui.syncAll();
    this.ui.toast(`Stage "${this.stageName}" cargado`, 'ok');
  }

  _getAllStages() {
    try { return JSON.parse(localStorage.getItem('cr_stages') || '[]'); } catch { return []; }
  }

  // ─── SQUADS ──────────────────────────────────────────────────────────

  startSquadEdit() {
    this.editingSquad = true;
    this.placingMode = false;
    this.placingSpawner = false;
    this.placingSquad = false;
    this._placingSquadName = null;
    this._deselectEnemy();
    this._deselectSpawner();
    this._deselectSquad();
    this._squadDraft = { name: '', members: [] };
    this._squadCenterX = ARENA.x + ARENA.w / 2;
    this._squadCenterY = ARENA.y + ARENA.h / 2;
    this.selectedType = null;
    this.ui.updateCursor();
    this.ui.refreshSquadEditor();
  }

  saveSquad() {
    if (!this._squadDraft || !this._squadDraft.name.trim()) {
      this.ui.toast('Asigna un nombre al squad', 'err');
      return;
    }
    if (this._squadDraft.members.length === 0) {
      this.ui.toast('Agrega al menos un enemigo al squad', 'err');
      return;
    }
    this.squads.push({
      name: this._squadDraft.name.trim(),
      members: [...this._squadDraft.members]
    });
    this.editingSquad = false;
    this._squadDraft = null;
    this.placingMode = false;
    this.selectedType = null;
    this.ui.hideSquadEditor();
    this.ui.refreshSquadList();
    this.ui.refreshTypeList();
    this.ui.updateCursor();
    this.ui.toast(`Squad "${this.squads[this.squads.length - 1].name}" guardado`, 'ok');
  }

  cancelSquadEdit() {
    this.editingSquad = false;
    this._squadDraft = null;
    this.placingMode = false;
    this.selectedType = null;
    this.ui.hideSquadEditor();
    this.ui.refreshTypeList();
    this.ui.updateCursor();
  }

  deleteSquadTemplate(idx) {
    const name = this.squads[idx].name;
    this.squads.splice(idx, 1);
    this.squadInstances = this.squadInstances.filter(inst => inst.squadName !== name);
    if (this.selectedSquad !== null) {
      if (this.selectedSquad >= this.squadInstances.length) {
        this._deselectSquad();
      }
    }
    this.ui.refreshSquadList();
    this.ui.refreshTimeline();
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  update(t, delta) {
    this.camera.updateEditor(this._mouseX, this._mouseY);
    this._render();
  }

  _render() {
    const g = this.g;
    g.clear();
    this.camera.apply(g);

    // Fondo
    g.fillStyle(0x0c1020, 1);
    if (this.currentMap?.arena) {
      const a = this.currentMap.arena;
      g.fillRect(a.x, a.y, a.w, a.h);
    } else {
      g.fillRect(-2000, -2000, 8000, 8000);
    }

    // Grid
    if (this.showGrid) {
      g.lineStyle(1, 0x1a2235, 0.4);
      const step = 50;
      for (let x = -2000; x < 6000; x += step) g.lineBetween(x, -2000, x, 6000);
      for (let y = -2000; y < 6000; y += step) g.lineBetween(-2000, y, 6000, y);
    }

    // Muros del SVG
    if (this.currentMap?.lines) {
      for (const line of this.currentMap.lines) {
        const color = parseInt((line.color || '#4a6a8a').replace('#',''), 16);
        g.lineStyle(line.thickness || 4, color, 0.8);
        g.lineBetween(line.start.x, line.start.y, line.end.x, line.end.y);
      }
    }

    // Zones del SVG
    if (this.currentMap?.zones) {
      this.mapRenderer.renderZones(g, this.currentMap.zones);
    }

    // Spawners
    for (let si = 0; si < this.spawners.length; si++) {
      const s = this.spawners[si];
      const sel = this.selectedSpawner === si;

      if (sel) {
        g.lineStyle(2, 0xffff44, 1);
        g.strokeCircle(s.x, s.y, 22);
      }

      if (sel || this.editingPath) {
        if (s.paths && s.paths.length > 0) {
          for (let pi = 0; pi < s.paths.length; pi++) {
            const pdata = s.paths[pi];
            const wpList = pdata.path || [];
            const isActive = pi === this._editingPathIndex;
            const hues = [0xffaa22, 0xffcc44, 0x88cc44, 0x44aacc, 0xcc8844, 0xaa66cc];
            const pathColor = isActive ? 0xffaa22 : (hues[pi % hues.length]);
            const alpha = isActive ? 0.9 : 0.5;

            if (wpList.length > 1) {
              g.lineStyle(2, pathColor, alpha);
              for (let wi = 0; wi < wpList.length - 1; wi++) {
                g.lineBetween(wpList[wi].x, wpList[wi].y, wpList[wi + 1].x, wpList[wi + 1].y);
              }
              if ((pdata.mode || 'loop') === 'loop') {
                const first2 = wpList[0], last2 = wpList[wpList.length - 1];
                g.lineStyle(1, pathColor, alpha * 0.3);
                g.lineBetween(last2.x, last2.y, first2.x, first2.y);
              }
            }
            for (let wi = 0; wi < wpList.length; wi++) {
              const wp = wpList[wi];
              g.fillStyle(pathColor, alpha);
              g.fillCircle(wp.x, wp.y, isActive ? 5 : 4);
            }
          }
        } else if (s.path && s.path.length >= 1) {
          if (s.path.length > 1) {
            g.lineStyle(2, 0xffaa22, sel ? 0.8 : 0.4);
            for (let pi = 0; pi < s.path.length - 1; pi++) {
              g.lineBetween(s.path[pi].x, s.path[pi].y, s.path[pi + 1].x, s.path[pi + 1].y);
            }
            if (s.pathMode === 'loop' || s.pathMode === 'flee') {
              const first2 = s.path[0], last2 = s.path[s.path.length - 1];
              g.lineStyle(1, 0xffaa22, 0.2);
              g.lineBetween(last2.x, last2.y, first2.x, first2.y);
            }
          }
          for (let wi = 0; wi < s.path.length; wi++) {
            const wp = s.path[wi];
            g.fillStyle(0xffaa22, sel ? 0.9 : 0.5);
            g.fillCircle(wp.x, wp.y, 5);
          }
        }
      }

      // Spawner crosshair
      g.lineStyle(2, sel ? 0xffff44 : 0xffaa22, sel ? 1 : 0.8);
      g.strokeCircle(s.x, s.y, 16);
      g.lineBetween(s.x - 10, s.y, s.x + 10, s.y);
      g.lineBetween(s.x, s.y - 10, s.x, s.y + 10);
    }

    // Squad draft (editing mode)
    if (this.editingSquad && this._squadDraft) {
      // Center crosshair
      g.lineStyle(1, 0x44ccff, 0.6);
      g.strokeCircle(this._squadCenterX, this._squadCenterY, 24);
      g.lineBetween(this._squadCenterX - 10, this._squadCenterY, this._squadCenterX + 10, this._squadCenterY);
      g.lineBetween(this._squadCenterX, this._squadCenterY - 10, this._squadCenterX, this._squadCenterY + 10);

      for (const member of this._squadDraft.members) {
        const mx = this._squadCenterX + (member.offsetX || 0);
        const my = this._squadCenterY + (member.offsetY || 0);
        const r = enemyRegistry.getTypeRadius(member.type) || 10;
        const color = enemyRegistry.getTypeColor(member.type) || 0x44ccff;
        g.fillStyle(color, 0.85);
        g.fillCircle(mx, my, r);
        g.lineStyle(2, 0x44ccff, 1);
        g.strokeCircle(mx, my, r + 4);
      }
    }

    // Enemigos
    for (let i = 0; i < this.enemies.length; i++) {
      const e     = this.enemies[i];
      if (e.spawnTime > this.currentTime) continue;
      const near  = Math.abs(e.spawnTime - this.currentTime) <= 5;
      const sel   = this.selectedEnemy === i;
      const alpha = near || sel ? 1.0 : 0.3;
      const r     = enemyRegistry.getTypeRadius(e.type) || 12;
      const color = enemyRegistry.getTypeColor(e.type)  || 0xff6666;

      g.fillStyle(color, alpha * 0.85);
      g.fillCircle(e.x, e.y, r);

      if (sel) {
        g.lineStyle(2, 0xffff44, 1);
        g.strokeCircle(e.x, e.y, r + 5);
      } else if (near) {
        g.lineStyle(1, 0xffffff, 0.4);
        g.strokeCircle(e.x, e.y, r);
      }
    }

    this.camera.restore(g);
  }

  _cleanup() {
    document.removeEventListener('mousemove', this._onDocMouseMove);
    this.ui?.destroy();
  }
}
