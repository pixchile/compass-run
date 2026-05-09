// StageEditor.js — Editor de stages con línea de tiempo
import enemyRegistry from '../enemies/EnemyRegistry.js';
import { registerAllCustomEnemies } from '../enemies/definitions/index.js';
import SVGMapLoader from '../systems/SVGMapLoader.js';
import MapRenderer from '../renderers/MapRenderer.js';
import Camera from './Camera.js';
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
    this.camera.edgeThreshold = 0; // disable edge-scroll in favor of drag-to-pan

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
    this.svgName      = null;        // nombre del SVG cargado
    this.currentMap   = null;        // mapa parseado del SVG
    this.enemies      = [];          // { type, x, y, spawnTime }
    this.spawners     = [];          // { x, y, types, interval, path, pathMode }
    this.timeLimit    = 300;         // segundos totales

    this.maxBase      = 20;          // máximo enemigos simultáneos base
    this.maxPerMin    = 5;           // +X por minuto
    this.minBase      = 0;           // mínimo (relleno automático)
    this.minPerMin    = 0;
    this.fillTypes    = [];           // tipos que participan en el relleno automático
    this._fillRoundRobin = 0;        // índice para rotación proporcional

    // --- Estado del editor ---
    this.currentTime   = 0;          // segundo actual en la línea de tiempo
    this.selectedType  = null;       // tipo de enemigo activo para colocar
    this.placingMode   = false;      // true = clicks colocan enemigos
    this.selectedEnemy = null;       // enemigo seleccionado para editar/borrar
    this.placingSpawner = false;
	    this.selectedSpawner = null;
	    this.editingPath = false;

    this.g = this.add.graphics();

    this._dragActive = false;
    this._isDragging = false;
    this._dragStartScreenX = 0;
    this._dragStartScreenY = 0;
    this._dragStartCamX = 0;
    this._dragStartCamY = 0;

    this._buildUI();
    this._bindInput();
  }

  // ─── UI ────────────────────────────────────────────────────────────────────

  _buildUI() {
    this._injectCSS();

    const root = document.createElement('div');
    root.id = 'se-root';
    root.innerHTML = `
      <div id="se-sidebar">
        <div class="se-section">
          <div class="se-label">STAGE</div>
          <input id="se-stage-name" class="se-input" value="${this.stageName}" placeholder="nombre del stage">
          <button class="se-btn se-btn-load" id="se-load-svg">📂 Cargar SVG</button>
          <input type="file" id="se-file-input" accept=".svg" style="display:none">
          <div id="se-svg-name" class="se-dim">sin mapa</div>
        </div>

        <div class="se-section">
          <div class="se-label">TIEMPO</div>
          <div class="se-row">
            <span class="se-dim">Duración</span>
            <input id="se-timelimit" class="se-input se-input-sm" type="number" value="${this.timeLimit}" min="30" max="3600" step="30">
            <span class="se-dim">s</span>
          </div>
        </div>

        <div class="se-section">
          <div class="se-label">ENEMIGOS</div>
          <div id="se-type-list"></div>
          <button class="se-btn se-btn-spawner" id="se-place-spawner">+ Spawner</button>
        </div>

        <div class="se-section">
          <div class="se-label">DENSIDAD</div>
          <div class="se-row"><span class="se-dim">Máx base</span><input id="se-max-base" class="se-input se-input-sm" type="number" value="${this.maxBase}" min="1"></div>
          <div class="se-row"><span class="se-dim">+/min</span><input id="se-max-per-min" class="se-input se-input-sm" type="number" value="${this.maxPerMin}" min="0"></div>
          <div class="se-row"><span class="se-dim">Mín base</span><input id="se-min-base" class="se-input se-input-sm" type="number" value="${this.minBase}" min="0"></div>
          <div class="se-row"><span class="se-dim">+/min</span><input id="se-min-per-min" class="se-input se-input-sm" type="number" value="${this.minPerMin}" min="0"></div>
          <div class="se-label" style="margin-top:10px">RELLENO</div>
          <div class="se-dim" style="font-size:9px;margin-bottom:4px">Tipos que aparecen al estar bajo el mínimo</div>
          <div id="se-fill-list"></div>
        </div>

        <div class="se-section">
          <button class="se-btn se-btn-play" id="se-play">▶ Probar Stage</button>
          <button class="se-btn se-btn-save" id="se-save">💾 Guardar Stage</button>
          <button class="se-btn se-btn-load" id="se-load-stage">📂 Cargar Stage</button>
          <button class="se-btn se-btn-delete" id="se-delete-stage" style="background:#552222;color:#ff8888;">🗑 Borrar Stage</button>
          <button class="se-btn se-btn-export" id="se-export">📤 Exportar</button>
          <button class="se-btn se-btn-import" id="se-import">📥 Importar</button>
          <input type="file" id="se-import-file" accept=".json" style="display:none">
          <button class="se-btn se-btn-exit" id="se-exit">✕ Salir</button>
        </div>
      </div>

      <div id="se-timeline-bar">
        <div id="se-timeline-wrap">
          <div id="se-timeline-track">
            <div id="se-timeline-cursor"></div>
            <div id="se-timeline-markers"></div>
          </div>
        </div>
        <div id="se-time-display">00:00</div>
        <div id="se-count-display">0 enemigos</div>
      </div>

      <div id="se-selected-info"></div>
      <div id="se-spawner-info"></div>
    `;
    document.body.appendChild(root);
    this._root = root;

    this._refreshTypeList();
    this._refreshFillList();
    this._refreshTimeline();

    this.events.once('shutdown', () => this._cleanup());
  }

  _injectCSS() {
    if (document.getElementById('se-css')) return;
    const s = document.createElement('style');
    s.id = 'se-css';
    s.textContent = `
      #se-root { position:fixed; inset:0; pointer-events:none; z-index:500; font-family:'Share Tech Mono',monospace; }

      #se-sidebar {
        position:absolute; top:0; left:0; width:200px; height:100%;
        background:rgba(5,8,18,0.96); border-right:1px solid #192840;
        overflow-y:auto; pointer-events:auto; padding:8px 0;
      }
      .se-section { padding:10px 12px; border-bottom:1px solid #0e1824; }
      .se-label { color:#253545; font-size:9px; letter-spacing:2px; margin-bottom:6px; }
      .se-dim { color:#2a4060; font-size:10px; }
      .se-row { display:flex; align-items:center; gap:6px; margin:4px 0; }
      .se-input { background:#050c16; border:1px solid #192840; color:#8ab4cc;
        font-family:inherit; font-size:12px; padding:5px 8px; width:100%; box-sizing:border-box;
        outline:none; margin-top:4px; }
      .se-input:focus { border-color:#4488ff; }
      .se-input-sm { width:60px; flex-shrink:0; margin:0; padding:3px 6px; }
      .se-btn { width:100%; padding:7px; margin-top:4px; background:#050c16;
        border:1px solid #192840; color:#5a80a0; font-family:inherit; font-size:10px;
        letter-spacing:1px; cursor:pointer; pointer-events:auto; }
      .se-btn:hover { border-color:#4488ff; color:#8ab4cc; }
      .se-btn-play { border-color:#44ff88; color:#44ff88; font-size:13px; }
      .se-btn-play:hover { background:rgba(68,255,136,.08); }
      .se-btn-save:hover { background:rgba(68,255,136,.08); }
      .se-btn-exit { border-color:#ff4444; color:#ff4444; }
      .se-btn-exit:hover { background:rgba(255,68,68,.08); }
      .se-btn-spawner { border-color:#ffaa22; color:#ffaa22; }
      .se-btn-export { border-color:#44ff88; color:#44ff88; }
      .se-btn-export:hover { background:rgba(68,255,136,.08); }
      .se-btn-import { border-color:#ffaa22; color:#ffaa22; }
      .se-btn-import:hover { background:rgba(255,170,34,.08); }

      /* Lista de tipos de enemigo */
      #se-type-list { display:flex; flex-direction:column; gap:4px; margin-top:6px; }
      .se-type-item {
        display:flex; align-items:center; gap:8px; padding:6px 8px;
        background:#080f1c; border:1px solid #192840; cursor:pointer;
        pointer-events:auto; transition:all .12s;
      }
      .se-type-item:hover { border-color:#4488ff; }
      .se-type-item.active { border-color:#ffaa22; background:rgba(255,170,34,.06); }
      .se-type-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
      .se-type-name { color:#8ab4cc; font-size:11px; flex:1; }
      .se-type-count { color:#253545; font-size:10px; }
      #se-fill-list { display:flex; flex-direction:column; gap:3px; margin-top:4px; }
      .se-fill-item {
        display:flex; align-items:center; gap:8px; padding:5px 8px;
        background:#080f1c; border:1px solid #192840; cursor:pointer;
        pointer-events:auto; transition:all .12s;
      }
      .se-fill-item.active { border-color:#ffaa22; background:rgba(255,170,34,.06); }
      .se-fill-item:hover { border-color:#4488ff; }
      .se-fill-check { width:10px; height:10px; border:1px solid #4488ff; flex-shrink:0; }
      .se-fill-item.active .se-fill-check { background:#ffaa22; border-color:#ffaa22; }

      /* Línea de tiempo */
      #se-timeline-bar {
        position:absolute; bottom:0; left:200px; right:0; height:80px;
        background:rgba(5,8,18,0.94); border-top:1px solid #192840;
        pointer-events:auto; display:flex; align-items:center; gap:12px; padding:0 16px;
      }
      #se-timeline-wrap { flex:1; height:48px; position:relative; }
      #se-timeline-track {
        position:absolute; inset:0; background:#080f1c;
        border:1px solid #192840; border-radius:2px; overflow:hidden; cursor:crosshair;
      }
      #se-timeline-cursor {
        position:absolute; top:0; bottom:0; width:2px;
        background:#ffaa22; box-shadow:0 0 6px #ffaa22; pointer-events:none;
      }
      #se-timeline-markers { position:absolute; inset:0; pointer-events:none; }
      .se-tmarker {
        position:absolute; top:0; bottom:0; width:6px; margin-left:-3px;
        display:flex; flex-direction:column; align-items:center; cursor:pointer;
        pointer-events:auto;
      }
      .se-tmarker-dot {
        width:6px; height:6px; border-radius:50%; margin-top:4px; flex-shrink:0;
      }
      .se-tmarker-line { width:1px; flex:1; opacity:0.3; }
      .se-tmarker:hover .se-tmarker-dot { transform:scale(1.6); }
      #se-time-display { color:#ffaa22; font-size:14px; min-width:48px; text-align:right; }
      #se-count-display { color:#253545; font-size:10px; min-width:70px; }

      /* Info del enemigo seleccionado */
      #se-selected-info {
        position:absolute; top:12px; right:12px;
        background:rgba(5,8,18,0.94); border:1px solid #192840; border-top:2px solid #ffaa22;
        padding:10px 14px; min-width:180px; pointer-events:auto;
        display:none;
      }
      #se-selected-info .se-label { margin-bottom:8px; }
      #se-sel-time-row { display:flex; align-items:center; gap:8px; margin:6px 0; }
      #se-sel-time { width:70px; }
      #se-sel-delete { border-color:#ff4444; color:#ff4444; margin-top:8px; }

      #se-spawner-info {
        position:absolute; top:12px; right:12px;
        background:rgba(5,8,18,0.96); border:1px solid #192840; border-top:2px solid #ffaa22;
        padding:10px 14px; min-width:200px; max-width:260px; pointer-events:auto;
        display:none; z-index:510;
      }
      #se-spawner-info .se-label { margin-bottom:8px; }
    `;
    document.head.appendChild(s);
  }

  _refreshTypeList() {
    const container = document.getElementById('se-type-list');
    if (!container) return;
    const types = enemyRegistry.getAllTypes();
    container.innerHTML = types.map(t => {
      const color = '#' + (enemyRegistry.getTypeColor(t) >>> 0).toString(16).padStart(6,'0').slice(-6);
      const count = this.enemies.filter(e => e.type === t).length;
      return `<div class="se-type-item ${this.selectedType === t ? 'active' : ''}" data-type="${t}">
        <div class="se-type-dot" style="background:${color}"></div>
        <span class="se-type-name">${t}</span>
        <span class="se-type-count">${count}</span>
      </div>`;
    }).join('');

    container.querySelectorAll('.se-type-item').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedType = el.dataset.type;
        this.placingMode  = true;
        this.placingSpawner = false;
        this._refreshTypeList();
        this._updateCursor();
      });
    });
  }

  _refreshFillList() {
    const container = document.getElementById('se-fill-list');
    if (!container) return;
    const types = enemyRegistry.getAllTypes();
    container.innerHTML = types.map(t => {
      const active = this.fillTypes.includes(t);
      const color  = '#' + (enemyRegistry.getTypeColor(t) >>> 0).toString(16).padStart(6,'0').slice(-6);
      return `<div class="se-fill-item ${active ? 'active' : ''}" data-type="${t}">
        <div class="se-fill-check"></div>
        <div class="se-type-dot" style="background:${color}"></div>
        <span class="se-type-name">${t}</span>
      </div>`;
    }).join('');

    container.querySelectorAll('.se-fill-item').forEach(el => {
      el.addEventListener('click', () => {
        const t = el.dataset.type;
        const idx = this.fillTypes.indexOf(t);
        if (idx === -1) this.fillTypes.push(t);
        else this.fillTypes.splice(idx, 1);
        this._fillRoundRobin = 0;
        this._refreshFillList();
      });
    });
  }

  _refreshTimeline() {
    const markers = document.getElementById('se-timeline-markers');
    if (!markers) return;

    // Agrupar por tipo para colorear
    const typeColors = {};
    for (const t of enemyRegistry.getAllTypes()) {
      typeColors[t] = '#' + (enemyRegistry.getTypeColor(t) >>> 0).toString(16).padStart(6,'0').slice(-6);
    }

    markers.innerHTML = this.enemies.map((e, i) => {
      const pct = this.timeLimit > 0 ? (e.spawnTime / this.timeLimit) * 100 : 0;
      const color = typeColors[e.type] || '#888';
      return `<div class="se-tmarker" data-idx="${i}" style="left:${pct}%">
        <div class="se-tmarker-dot" style="background:${color}"></div>
        <div class="se-tmarker-line" style="background:${color}"></div>
      </div>`;
    }).join('') + this.spawners.map((s, i) => {
      const pct = 0; // spawners no tienen tiempo
      return `<div class="se-tmarker" style="left:2%;opacity:0.5" title="spawner">
        <div class="se-tmarker-dot" style="background:#ffaa22"></div>
        <div class="se-tmarker-line" style="background:#ffaa22"></div>
      </div>`;
    }).join('');

    // Click en marcador = seleccionar enemigo
    markers.querySelectorAll('.se-tmarker[data-idx]').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this._selectEnemy(parseInt(el.dataset.idx));
      });
    });

    // Cursor
    const pct = this.timeLimit > 0 ? (this.currentTime / this.timeLimit) * 100 : 0;
    const cursor = document.getElementById('se-timeline-cursor');
    if (cursor) cursor.style.left = pct + '%';

    // Displays
    const mm = String(Math.floor(this.currentTime / 60)).padStart(2,'0');
    const ss = String(this.currentTime % 60).padStart(2,'0');
    const td = document.getElementById('se-time-display');
    const cd = document.getElementById('se-count-display');
    if (td) td.textContent = `${mm}:${ss}`;
    if (cd) cd.textContent = `${this.enemies.length} enemigos`;
  }

  _selectEnemy(idx) {
    this.selectedEnemy = idx;
    this.placingMode   = false;
    this._deselectSpawner();
    const e   = this.enemies[idx];
    const box = document.getElementById('se-selected-info');
    if (!box || !e) return;
    box.style.display = 'block';
    box.innerHTML = `
      <div class="se-label">ENEMIGO SELECCIONADO</div>
      <div class="se-dim">${e.type}</div>
      <div id="se-sel-time-row" class="se-row">
        <span class="se-dim">Tiempo</span>
        <input id="se-sel-time" class="se-input se-input-sm" type="number"
          value="${e.spawnTime}" min="0" max="${this.timeLimit}" step="1">
        <span class="se-dim">s</span>
      </div>
      <button class="se-btn se-btn-exit" id="se-sel-delete">🗑 Eliminar</button>
      <button class="se-btn" id="se-sel-close" style="margin-top:4px">Cerrar</button>
    `;
    box.querySelector('#se-sel-time').addEventListener('input', ev => {
      this.enemies[idx].spawnTime = parseInt(ev.target.value) || 0;
      this._refreshTimeline();
    });
    box.querySelector('#se-sel-delete').addEventListener('click', () => {
      this.enemies.splice(idx, 1);
      this._deselectEnemy();
      this._refreshTypeList();
      this._refreshTimeline();
    });
    box.querySelector('#se-sel-close').addEventListener('click', () => this._deselectEnemy());
  }

  _deselectEnemy() {
    this.selectedEnemy = null;
    const box = document.getElementById('se-selected-info');
    if (box) box.style.display = 'none';
  }

  _updateCursor() {
    if (this.editingPath) document.body.style.cursor = 'cell';
    else if (this.placingMode || this.placingSpawner) document.body.style.cursor = 'crosshair';
    else document.body.style.cursor = 'grab';
  }

  // ─── INPUT ────────────────────────────────────────────────────────────────

  _bindInput() {
    // Cargar SVG
    document.getElementById('se-load-svg')?.addEventListener('click', () => {
      document.getElementById('se-file-input')?.click();
    });
    document.getElementById('se-file-input')?.addEventListener('change', ev => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async e => {
        this.currentMap = this.svgLoader.parseSVG(e.target.result, file.name);
        this.svgName = file.name;
        this.svgContent = e.target.result;
        document.getElementById('se-svg-name').textContent = file.name;
      };
      reader.readAsText(file);
      ev.target.value = '';
    });

    // Nombre del stage
    document.getElementById('se-stage-name')?.addEventListener('input', ev => {
      this.stageName = ev.target.value;
    });

    // Límite de tiempo
    document.getElementById('se-timelimit')?.addEventListener('input', ev => {
      this.timeLimit = parseInt(ev.target.value) || 300;
      this.currentTime = Math.min(this.currentTime, this.timeLimit);
      this._refreshTimeline();
    });

    // Densidad
    ['max-base','max-per-min','min-base','min-per-min'].forEach(id => {
      document.getElementById(`se-${id}`)?.addEventListener('input', ev => {
        const key = id.replace(/-([a-z])/g, (_,c) => c.toUpperCase());
        this[key] = parseInt(ev.target.value) || 0;
      });
    });

    // Spawner
    document.getElementById('se-place-spawner')?.addEventListener('click', () => {
      this.placingSpawner = true;
      this.placingMode    = false;
      this.selectedType   = null;
      this._refreshTypeList();
      this._updateCursor();
    });

    // Guardar / cargar / salir
    document.getElementById('se-play')?.addEventListener('click', () => {
      if (!this.svgName) { this._toast('Carga un SVG primero', 'err'); return; }
      this._save(); // guardar antes de probar
      const mapName = this.svgName.replace('.svg', '');
      this.scene.start('Game', { mapName, stageName: this.stageName });
    });

    document.getElementById('se-save')?.addEventListener('click', () => this._save());
    document.getElementById('se-load-stage')?.addEventListener('click', () => this._loadStage());
    document.getElementById('se-delete-stage')?.addEventListener('click', () => this._deleteStage());
    document.getElementById('se-export')?.addEventListener('click', () => this._exportStage());
    document.getElementById('se-import')?.addEventListener('click', () => document.getElementById('se-import-file').click());
    document.getElementById('se-import-file')?.addEventListener('change', (ev) => this._importStage(ev));
    document.getElementById('se-exit')?.addEventListener('click', () => this.scene.start('MainMenu'));

    // Línea de tiempo — click y drag para mover el cursor
    const track = document.getElementById('se-timeline-track');
    if (track) {
      const setTime = (ev) => {
        const rect = track.getBoundingClientRect();
        const pct  = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        this.currentTime = Math.round(pct * this.timeLimit);
        this._refreshTimeline();
      };
      let draggingTimeline = false;
      track.addEventListener('mousedown', ev => { draggingTimeline = true; setTime(ev); });
      document.addEventListener('mousemove', ev => { if (draggingTimeline) setTime(ev); });
      document.addEventListener('mouseup', () => { draggingTimeline = false; });
    }

    // ── Canvas click/drag ──
    // pointerdown: right-click cancels; left-click starts drag tracking
    this.input.on('pointerdown', (ptr) => {
      if (ptr.rightButtonDown?.()) {
        ptr.event?.preventDefault();
        if (this.editingPath) {
          this.editingPath = false;
          this._updateCursor();
          return;
        }
        this.placingMode = false;
        this.placingSpawner = false;
        this._deselectEnemy();
        this._deselectSpawner();
        this._updateCursor();
        return;
      }

      if (ptr.x < 210) return;
      if (ptr.y > this.scale.height - 90) return;

      this._dragActive = true;
      this._isDragging = false;
      this._dragStartScreenX = ptr.x;
      this._dragStartScreenY = ptr.y;
      this._dragStartCamX = this.camera.x;
      this._dragStartCamY = this.camera.y;
    });

    // pointermove: pan camera while dragging
    this.input.on('pointermove', (ptr) => {
      if (!this._dragActive || !ptr.isDown) return;

      const dx = ptr.x - this._dragStartScreenX;
      const dy = ptr.y - this._dragStartScreenY;
      if (!this._isDragging && Math.hypot(dx, dy) > 3) {
        this._isDragging = true;
        document.body.style.cursor = 'grabbing';
      }
      if (this._isDragging) {
        this.camera.x = this._dragStartCamX - dx / this.camera.zoom;
        this.camera.y = this._dragStartCamY - dy / this.camera.zoom;
        this.camera.x = Math.max(ARENA.x, Math.min(ARENA.x + ARENA.w, this.camera.x));
        this.camera.y = Math.max(ARENA.y, Math.min(ARENA.y + ARENA.h, this.camera.y));
      }
    });

    // pointerup: if click (no drag), place enemy/spawner/waypoint
    this.input.on('pointerup', (ptr) => {
      if (!this._dragActive) return;
      const wasDrag = this._isDragging;
      this._dragActive = false;
      this._isDragging = false;
      this._updateCursor();

      if (wasDrag) return;

      if (ptr.x < 210) return;
      if (ptr.y > this.scale.height - 90) return;

      const wp = this.camera.screenToWorld(ptr.x, ptr.y);

      if (this.editingPath && this.selectedSpawner !== null) {
        const sp = this.spawners[this.selectedSpawner];
        if (!sp.path) sp.path = [];
        sp.path.push({ x: wp.x, y: wp.y, wait: 0 });
        this._refreshSpawnerInfo();
        return;
      }

      if (this.placingSpawner) {
        this.spawners.push({ x: wp.x, y: wp.y, types: [], interval: 0, path: [], pathMode: 'loop' });
        this._refreshTimeline();
        return;
      }

      if (this.placingMode && this.selectedType) {
        if (ptr.event?.altKey) {
          this._trySelectAt(wp);
        } else {
          this.enemies.push({ type: this.selectedType, x: wp.x, y: wp.y, spawnTime: this.currentTime });
          this._refreshTypeList();
          this._refreshTimeline();
        }
        return;
      }

      if (!this._trySelectSpawnerAt(wp)) {
        this._trySelectAt(wp);
      }
    });

    // Prevent context menu on the DOM overlay
    this._root?.addEventListener('contextmenu', (ev) => ev.preventDefault());

    // Teclas
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.editingPath) {
        this.editingPath = false;
        this._updateCursor();
        this._refreshSpawnerInfo();
        return;
      }
      if (this.placingMode || this.placingSpawner) {
        this.placingMode = false;
        this.placingSpawner = false;
        this._updateCursor();
      } else {
        this.scene.start('MainMenu');
      }
    });
    this.input.keyboard.on('keydown-DELETE', () => {
      if (this.selectedSpawner !== null) {
        this.spawners.splice(this.selectedSpawner, 1);
        this._deselectSpawner();
        this._refreshTimeline();
        return;
      }
      if (this.selectedEnemy !== null) {
        this.enemies.splice(this.selectedEnemy, 1);
        this._deselectEnemy();
        this._refreshTypeList();
        this._refreshTimeline();
      }
    });
    this.input.keyboard.on('keydown-G', () => { this.showGrid = !this.showGrid; });

    // Zoom con rueda
    this.input.on('wheel', (ptr, _, __, deltaY) => {
      deltaY > 0 ? this.camera.zoomOut(0.05) : this.camera.zoomIn(0.05);
    });
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

  _selectSpawner(idx) {
    this.selectedSpawner = idx;
    this.placingMode = false;
    this.placingSpawner = false;
    this._deselectEnemy();
    this._refreshSpawnerInfo();
  }

  _deselectSpawner() {
    this.selectedSpawner = null;
    this.editingPath = false;
    this._hideSpawnerInfo();
    this._updateCursor();
  }

  _refreshSpawnerInfo() {
    if (this.selectedSpawner === null) {
      this._hideSpawnerInfo();
      return;
    }
    const s = this.spawners[this.selectedSpawner];
    const box = document.getElementById('se-spawner-info');
    if (!box) return;
    box.style.display = 'block';

    const typesList = enemyRegistry.getAllTypes();
    const typesHtml = typesList.map(t => {
      const active = (s.types || []).includes(t);
      const color = '#' + (enemyRegistry.getTypeColor(t) >>> 0).toString(16).padStart(6, '0').slice(-6);
      return `<div class="se-fill-item ${active ? 'active' : ''}" data-type="${t}">
        <div class="se-fill-check"></div>
        <div class="se-type-dot" style="background:${color}"></div>
        <span style="font-size:10px;color:#8ab4cc">${t}</span>
      </div>`;
    }).join('');

    const pathCount = (s.path || []).length;
    const waypointsHtml = (s.path || []).map((wp, i) =>
      `<div class="se-row" style="margin:2px 0;font-size:10px;color:#8ab4cc">
        <span>${i}</span><span>(${wp.x.toFixed(0)}, ${wp.y.toFixed(0)})</span>
        <input id="se-wp-wait-${i}" class="se-input se-input-sm" type="number"
          value="${wp.wait}" style="width:50px" min="0" max="30000" step="100">
        <span style="color:#445566">ms</span>
        <button class="se-btn se-btn-exit" style="width:auto;padding:2px 6px;font-size:9px;margin-left:4px"
          id="se-wp-del-${i}">✕</button>
      </div>`
    ).join('');

    box.innerHTML = `
      <div class="se-label">SPAWNER</div>
      <div class="se-dim">Pos: (${s.x.toFixed(0)}, ${s.y.toFixed(0)})</div>
      <div class="se-row" style="margin-top:6px">
        <span class="se-dim">Intervalo</span>
        <input id="se-spawn-interval" class="se-input se-input-sm" type="number"
          value="${s.interval || 0}" min="0" max="60000" step="500">
        <span class="se-dim">ms</span>
      </div>
      <div class="se-label" style="margin-top:10px">TIPOS PERMITIDOS</div>
      <div id="se-spawner-types">${typesHtml}</div>
      <div class="se-label" style="margin-top:10px">RUTA</div>
      <div id="se-spawner-path">${s.path && s.path.length > 0
        ? waypointsHtml + `<div class="se-dim" style="margin-top:4px">${pathCount} waypoints</div>`
        : '<div class="se-dim">Sin ruta definida</div>'}
      </div>
      <div class="se-row" style="margin-top:6px;gap:4px">
        <select id="se-path-mode" class="se-input se-input-sm" style="width:auto;flex:1">
          <option value="loop" ${(s.pathMode || 'loop') === 'loop' ? 'selected' : ''}>Loop</option>
          <option value="pingpong" ${s.pathMode === 'pingpong' ? 'selected' : ''}>Pingpong</option>
          <option value="once" ${s.pathMode === 'once' ? 'selected' : ''}>Once</option>
          <option value="chase" ${s.pathMode === 'chase' ? 'selected' : ''}>Chase</option>
        </select>
      </div>
      <button class="se-btn se-btn-spawner" id="se-edit-path" style="margin-top:6px">${this.editingPath ? '■ Detener edición' : '✎ Editar Ruta'}</button>
      <button class="se-btn se-btn-exit" id="se-delete-spawner" style="margin-top:4px">🗑 Eliminar Spawner</button>
      <button class="se-btn" id="se-close-spawner" style="margin-top:4px">Cerrar</button>
    `;

    // Event handlers
    box.querySelector('#se-spawn-interval')?.addEventListener('input', ev => {
      s.interval = parseInt(ev.target.value) || 0;
    });
    box.querySelector('#se-path-mode')?.addEventListener('change', ev => {
      s.pathMode = ev.target.value;
    });
    box.querySelector('#se-edit-path')?.addEventListener('click', () => {
      this.editingPath = !this.editingPath;
      this._updateCursor();
      this._refreshSpawnerInfo();
    });
    box.querySelector('#se-delete-spawner')?.addEventListener('click', () => {
      this.spawners.splice(this.selectedSpawner, 1);
      this._deselectSpawner();
      this._refreshTimeline();
    });
    box.querySelector('#se-close-spawner')?.addEventListener('click', () => this._deselectSpawner());

    // Type toggle handlers
    box.querySelectorAll('#se-spawner-types .se-fill-item').forEach(el => {
      el.addEventListener('click', () => {
        const t = el.dataset.type;
        if (!s.types) s.types = [];
        const idx2 = s.types.indexOf(t);
        if (idx2 === -1) s.types.push(t); else s.types.splice(idx2, 1);
        this._refreshSpawnerInfo();
      });
    });

    // Waypoint wait input handlers
    (s.path || []).forEach((wp, i) => {
      box.querySelector(`#se-wp-wait-${i}`)?.addEventListener('input', ev => {
        wp.wait = parseInt(ev.target.value) || 0;
      });
      box.querySelector(`#se-wp-del-${i}`)?.addEventListener('click', () => {
        s.path.splice(i, 1);
        this._refreshSpawnerInfo();
      });
    });
  }

  _hideSpawnerInfo() {
    const box = document.getElementById('se-spawner-info');
    if (box) box.style.display = 'none';
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
  }

  // ─── GUARDAR / CARGAR ─────────────────────────────────────────────────────

  _save() {
    const stage = {
      name:          this.stageName,
      svgName:       this.svgName,
      svgContent:    this.svgContent || null,
      version:       4,
      timeLimit:     this.timeLimit,
      enemies:       this.enemies,
      spawners:      this.spawners,
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
    this._toast(`Stage "${this.stageName}" guardado`, 'ok');
  }

  _deleteStage() {
    const all = this._getAllStages();
    if (!all.length) { this._toast('No hay stages guardados', 'err'); return; }
    const name = prompt('Stages disponibles:\n' + all.map(s=>s.name).join('\n') + '\n\nEscribe el nombre a BORRAR:');
    if (!name) return;
    const idx = all.findIndex(s => s.name === name);
    if (idx === -1) { this._toast('No encontrado', 'err'); return; }
    if (!confirm(`¿Borrar stage "${name}"? Esto no se puede deshacer.`)) return;
    all.splice(idx, 1);
    localStorage.setItem('cr_stages', JSON.stringify(all));
    this._toast(`Stage "${name}" borrado`, 'ok');
  }

  _exportStage() {
    const stage = {
      name:         this.stageName,
      svgName:      this.svgName || null,
      svgContent:   this.svgContent || null,
      version:      4,
      timeLimit:    this.timeLimit,
      enemies:      this.enemies,
      spawners:     this.spawners,
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
    this._toast(`Stage "${this.stageName}" exportado`, 'ok');
  }

  _importStage(ev) {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const stage = JSON.parse(e.target.result);
        if (!stage.name || !stage.svgContent) {
          this._toast('Archivo inválido: falta name o svgContent', 'err');
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
        this._toast(`Stage "${stage.name}" importado`, 'ok');
      } catch {
        this._toast('Error al leer el archivo JSON', 'err');
      }
    };
    reader.readAsText(file);
    ev.target.value = '';
  }

  _loadStage() {
    const all = this._getAllStages();
    if (!all.length) { this._toast('No hay stages guardados', 'err'); return; }
    const name = prompt('Stages disponibles:\n' + all.map(s=>s.name).join('\n') + '\n\nEscribe el nombre:');
    const stage = all.find(s => s.name === name);
    if (!stage) { this._toast('No encontrado', 'err'); return; }
    this._applyStage(stage);
  }

  _applyStage(stage) {
    this.stageName  = stage.name;
    this.svgName    = stage.svgName;
    this.svgContent = stage.svgContent || null;
    if (this.svgContent && this.svgName) {
      this.currentMap = this.svgLoader.parseSVG(this.svgContent, this.svgName);
    }
    this.timeLimit  = stage.timeLimit || 300;
    this.enemies    = stage.enemies  || [];
    this.spawners   = stage.spawners || [];
    const d = stage.density || {};
    this.maxBase    = d.maxBase   ?? 20;
    this.maxPerMin  = d.maxPerMin ?? 5;
    this.minBase    = d.minBase   ?? 0;
    this.minPerMin  = d.minPerMin ?? 0;
    this.fillTypes  = d.fillTypes || [];
    this._fillRoundRobin = 0;

    document.getElementById('se-stage-name').value  = this.stageName;
    document.getElementById('se-timelimit').value   = this.timeLimit;
    document.getElementById('se-max-base').value    = this.maxBase;
    document.getElementById('se-max-per-min').value = this.maxPerMin;
    document.getElementById('se-min-base').value    = this.minBase;
    document.getElementById('se-min-per-min').value = this.minPerMin;
    document.getElementById('se-svg-name').textContent = this.svgName || 'sin mapa';

    this._refreshTypeList();
    this._refreshFillList();
    this._refreshTimeline();
    this._toast(`Stage "${this.stageName}" cargado`, 'ok');
  }

  _getAllStages() {
    try { return JSON.parse(localStorage.getItem('cr_stages') || '[]'); } catch { return []; }
  }

  _toast(msg, type = 'inf') {
    const colors = { ok:'#44ff88', err:'#ff4444', inf:'#4488ff' };
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);
      background:#07101c;border:1px solid ${colors[type]};color:${colors[type]};
      padding:8px 20px;font-family:monospace;font-size:11px;z-index:9999;pointer-events:none;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
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

      // Selection circle
      if (sel) {
        g.lineStyle(2, 0xffff44, 1);
        g.strokeCircle(s.x, s.y, 22);
      }

      // Path lines (solo modo edicion o si está seleccionado)
      if (s.path && s.path.length > 1 && (sel || this.editingPath)) {
        g.lineStyle(2, 0xffaa22, sel ? 0.8 : 0.4);
        for (let pi = 0; pi < s.path.length - 1; pi++) {
          g.lineBetween(s.path[pi].x, s.path[pi].y, s.path[pi + 1].x, s.path[pi + 1].y);
        }
        if (s.pathMode === 'loop') {
          const first2 = s.path[0], last2 = s.path[s.path.length - 1];
          g.lineStyle(1, 0xffaa22, 0.2);
          g.lineBetween(last2.x, last2.y, first2.x, first2.y);
        }
      }
      // Waypoint dots (solo seleccionado o editando)
      if (s.path && (sel || this.editingPath)) {
        for (let wi = 0; wi < s.path.length; wi++) {
          const wp = s.path[wi];
          g.fillStyle(0xffaa22, sel ? 0.9 : 0.5);
          g.fillCircle(wp.x, wp.y, 5);
        }
      }

      // Spawner crosshair
      g.lineStyle(2, sel ? 0xffff44 : 0xffaa22, sel ? 1 : 0.8);
      g.strokeCircle(s.x, s.y, 16);
      g.lineBetween(s.x - 10, s.y, s.x + 10, s.y);
      g.lineBetween(s.x, s.y - 10, s.x, s.y + 10);
    }

    // Enemigos — solo los del tiempo actual ±5s resaltados, el resto más tenues
    for (let i = 0; i < this.enemies.length; i++) {
      const e     = this.enemies[i];
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
    this._root?.remove();
    document.body.style.cursor = 'default';
  }
}
