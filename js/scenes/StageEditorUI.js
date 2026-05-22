// js/scenes/StageEditorUI.js — DOM UI for StageEditor
import enemyRegistry from '../enemies/EnemyRegistry.js';

export default class StageEditorUI {
  constructor(editor) {
    this.editor = editor;
    this._root = null;
  }

  // ─── BUILD ──────────────────────────────────────────────────────────

  build() {
    this._injectCSS();

    const root = document.createElement('div');
    root.id = 'se-root';
    root.innerHTML = `
      <div id="se-sidebar">
        <div class="se-section">
          <div class="se-label">STAGE</div>
          <input id="se-stage-name" class="se-input" value="${this.editor.stageName}" placeholder="nombre del stage">
          <button class="se-btn se-btn-load" id="se-load-svg">📂 Cargar Mapa</button>
          <input type="file" id="se-file-input" accept=".json,.svg" style="display:none">
          <div id="se-svg-name" class="se-dim">sin mapa</div>
        </div>

        <div class="se-section">
          <div class="se-label">TIEMPO</div>
          <div class="se-row">
            <span class="se-dim">Duración</span>
            <input id="se-timelimit" class="se-input se-input-sm" type="number" value="${this.editor.timeLimit}" min="30" max="3600" step="30">
            <span class="se-dim">s</span>
          </div>
        </div>

        <div class="se-section">
          <div class="se-label">ENEMIGOS</div>
          <div id="se-type-list"></div>
          <button class="se-btn se-btn-spawner" id="se-place-spawner">+ Spawner</button>
          <div id="se-squad-list"></div>
          <button class="se-btn se-btn-squad" id="se-create-squad">+ Squad</button>
        </div>

        <div class="se-section">
          <div class="se-label">DENSIDAD</div>
          <div class="se-row"><span class="se-dim">Máx base</span><input id="se-max-base" class="se-input se-input-sm" type="number" value="${this.editor.maxBase}" min="1"></div>
          <div class="se-row"><span class="se-dim">+/min</span><input id="se-max-per-min" class="se-input se-input-sm" type="number" value="${this.editor.maxPerMin}" min="0"></div>
          <div class="se-row"><span class="se-dim">Mín base</span><input id="se-min-base" class="se-input se-input-sm" type="number" value="${this.editor.minBase}" min="0"></div>
          <div class="se-row"><span class="se-dim">+/min</span><input id="se-min-per-min" class="se-input se-input-sm" type="number" value="${this.editor.minPerMin}" min="0"></div>
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
      <div id="se-squad-editor"></div>
      <div id="se-squad-info"></div>
    `;
    document.body.appendChild(root);
    this._root = root;

    this.refreshTypeList();
    this.refreshFillList();
    this.refreshTimeline();

    this._bindEvents();
  }

  destroy() {
    this._root?.remove();
    this._root = null;
    document.body.style.cursor = 'default';
  }

  // ─── CSS ────────────────────────────────────────────────────────────

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
      .se-fill-time { display:flex; align-items:center; gap:4px; margin-left:auto; font-size:9px; }
      .se-fill-time input { width:38px; }

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
        width:8px;height:8px;border-radius:50%;margin-top:6px;box-shadow:0 0 4px rgba(0,0,0,0.7);
      }
      .se-tmarker-line {
        width:1px; flex:1; min-height:8px; opacity:0.5;
      }
      #se-time-display, #se-count-display {
        font-family:'Share Tech Mono',monospace; color:#2a4060; font-size:13px; width:55px;
      }
      #se-selected-info {
        position:absolute; top:0; right:0; width:180px; padding:12px;
        background:rgba(5,8,18,0.96); border-left:1px solid #192840; border-bottom:1px solid #192840;
        pointer-events:auto; display:none;
      }
      #se-spawner-info {
        position:absolute; top:0; right:0; width:280px; max-height:100%;
        overflow-y:auto; pointer-events:auto; display:none;
        background:rgba(5,8,18,0.97); border-left:1px solid #192840;
        padding:12px;
      }
      .se-btn-squad { border-color:#44ccff; color:#44ccff; }
      .se-btn-squad:hover { background:rgba(68,204,255,.08); }
      #se-squad-list { display:flex; flex-direction:column; gap:4px; margin:6px 0; }
      .se-squad-item {
        display:flex; align-items:center; gap:8px; padding:5px 8px;
        background:#080f1c; border:1px solid #192840; cursor:pointer;
        pointer-events:auto; transition:all .12s; font-size:10px;
      }
      .se-squad-item:hover { border-color:#44ccff; }
      .se-squad-item .se-squad-dot { width:8px; height:8px; border-radius:50%; background:#44ccff; flex-shrink:0; }
      .se-squad-item .se-squad-name { color:#8ab4cc; flex:1; }
      .se-squad-item .se-squad-count { color:#2a5577; font-size:9px; }
      .se-squad-item .se-squad-del {
        color:#ff4444; cursor:pointer; font-size:14px; line-height:1;
        padding:0 4px; opacity:0.5;
      }
      .se-squad-item .se-squad-del:hover { opacity:1; }
      #se-squad-editor {
        position:absolute; top:0; right:0; width:240px;
        pointer-events:auto; display:none;
        background:rgba(5,8,18,0.97); border-left:1px solid #192840;
        padding:12px; max-height:100%; overflow-y:auto;
      }
      #se-squad-info {
        position:absolute; top:0; right:0; width:200px;
        pointer-events:auto; display:none;
        background:rgba(5,8,18,0.97); border-left:1px solid #192840;
        border-bottom:1px solid #192840;
        padding:12px;
      }
    `;
    document.head.appendChild(s);
  }

  // ─── DOM EVENT BINDING ──────────────────────────────────────────────

  _bindEvents() {
    const ed = this.editor;

    // Cargar mapa (SVG o JSON)
    document.getElementById('se-load-svg')?.addEventListener('click', () => {
      document.getElementById('se-file-input')?.click();
    });
    document.getElementById('se-file-input')?.addEventListener('change', ev => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async e => {
        if (file.name.endsWith('.json')) {
          // Parse JSON map file
          try {
            const json = JSON.parse(e.target.result);
            ed.svgName = file.name;
            ed.svgContent = e.target.result;
            ed.currentMap = {
              name: file.name,
              version: json.version || 5,
              arena: json.arena || { x: 55, y: 58, w: 4000, h: 4000 },
              lines: json.lines || [],
              zones: json.zones || [],
              triggers: json.triggers || [],
              objects: json.objects || [],
              background: json.background || null
            };
            document.getElementById('se-svg-name').textContent = file.name;
          } catch (err) {
            this.toast('Error al leer el archivo JSON', 'err');
          }
        } else {
          // Legacy SVG path
          ed.currentMap = ed.svgLoader.parseSVG(e.target.result, file.name);
          ed.svgName = file.name;
          ed.svgContent = e.target.result;
          document.getElementById('se-svg-name').textContent = file.name;
        }
      };
      reader.readAsText(file);
      ev.target.value = '';
    });

    // Nombre del stage
    document.getElementById('se-stage-name')?.addEventListener('input', ev => {
      ed.stageName = ev.target.value;
    });

    // Límite de tiempo
    document.getElementById('se-timelimit')?.addEventListener('input', ev => {
      ed.timeLimit = parseInt(ev.target.value) || 300;
      this.refreshTimeline();
    });

    // Densidad
    ['max-base','max-per-min','min-base','min-per-min'].forEach(id => {
      document.getElementById(`se-${id}`)?.addEventListener('input', ev => {
        const key = id.replace(/-([a-z])/g, (_,c) => c.toUpperCase());
        ed[key] = parseInt(ev.target.value) || 0;
      });
    });

    // Spawner
    document.getElementById('se-place-spawner')?.addEventListener('click', () => {
      ed.placingSpawner = true;
      ed.placingMode    = false;
      ed.selectedType   = null;
      this.refreshTypeList();
      this.updateCursor();
    });

    // Squad
    document.getElementById('se-create-squad')?.addEventListener('click', () => {
      ed.startSquadEdit();
    });

    // Guardar / cargar / salir
    document.getElementById('se-play')?.addEventListener('click', () => {
      if (!ed.svgName) { this.toast('Carga un mapa primero', 'err'); return; }
      ed._save();
      // Derive map name from the loaded file (strip extension)
      const mapName = ed.svgName.replace(/\.(svg|json)$/, '');
      ed.scene.start('Game', { mapName, stageName: ed.stageName });
    });

    document.getElementById('se-save')?.addEventListener('click', () => ed._save());
    document.getElementById('se-load-stage')?.addEventListener('click', () => ed._loadStage());
    document.getElementById('se-delete-stage')?.addEventListener('click', () => ed._deleteStage());
    document.getElementById('se-export')?.addEventListener('click', () => ed._exportStage());
    document.getElementById('se-import')?.addEventListener('click', () => document.getElementById('se-import-file').click());
    document.getElementById('se-import-file')?.addEventListener('change', (ev) => ed._importStage(ev));
    document.getElementById('se-exit')?.addEventListener('click', () => ed.scene.start('MainMenu'));

    // Línea de tiempo — click y drag para mover el cursor
    const track = document.getElementById('se-timeline-track');
    if (track) {
      const setTime = (ev) => {
        const rect = track.getBoundingClientRect();
        const pct  = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        ed.currentTime = Math.round(pct * ed._getTimelineMax());
        this.refreshTimeline();
      };
      let draggingTimeline = false;
      track.addEventListener('mousedown', ev => { draggingTimeline = true; setTime(ev); });
      document.addEventListener('mousemove', ev => { if (draggingTimeline) setTime(ev); });
      document.addEventListener('mouseup', () => { draggingTimeline = false; });
    }

    // Prevent context menu on the DOM overlay
    this._root?.addEventListener('contextmenu', (ev) => ev.preventDefault());
  }

  // ─── REFRESH METHODS ────────────────────────────────────────────────

  refreshTypeList() {
    const container = document.getElementById('se-type-list');
    if (!container) return;
    const types = enemyRegistry.getAllTypes();
    container.innerHTML = types.map(t => {
      const color = '#' + (enemyRegistry.getTypeColor(t) >>> 0).toString(16).padStart(6,'0').slice(-6);
      const count = this.editor.enemies.filter(e => e.type === t).length;
      return `<div class="se-type-item ${this.editor.selectedType === t ? 'active' : ''}" data-type="${t}">
        <div class="se-type-dot" style="background:${color}"></div>
        <span class="se-type-name">${t}</span>
        <span class="se-type-count">${count}</span>
      </div>`;
    }).join('');

    container.querySelectorAll('.se-type-item').forEach(el => {
      el.addEventListener('click', () => {
        this.editor.selectedType = el.dataset.type;
        this.editor.placingMode  = true;
        this.editor.placingSpawner = false;
        this.refreshTypeList();
        this.updateCursor();
      });
    });
  }

  refreshFillList() {
    const container = document.getElementById('se-fill-list');
    if (!container) return;
    const types = enemyRegistry.getAllTypes();
    const fillMap = {};
    for (const entry of this.editor.fillTypes) {
      const t = typeof entry === 'string' ? entry : entry.type;
      fillMap[t] = typeof entry === 'string' ? { type: t, startSec: 0 } : entry;
    }
    container.innerHTML = types.map(t => {
      const entry = fillMap[t];
      const active = !!entry;
      const startSec = entry?.startSec ?? 0;
      const color  = '#' + (enemyRegistry.getTypeColor(t) >>> 0).toString(16).padStart(6,'0').slice(-6);
      return `<div class="se-fill-item ${active ? 'active' : ''}" data-type="${t}">
        <div class="se-fill-check"></div>
        <div class="se-type-dot" style="background:${color}"></div>
        <span class="se-type-name">${t}</span>
        ${active ? `<div class="se-fill-time"><span class="se-dim">inicia</span><input class="se-input se-input-sm se-fill-startsec" type="number" value="${startSec}" min="0" max="3600" step="5"><span class="se-dim">s</span></div>` : ''}
      </div>`;
    }).join('');

    container.querySelectorAll('.se-fill-item').forEach(el => {
      el.addEventListener('click', (ev) => {
        if (ev.target.classList.contains('se-fill-startsec')) return;
        const t = el.dataset.type;
        const idx = this.editor.fillTypes.findIndex(e => (typeof e === 'string' ? e : e.type) === t);
        if (idx === -1) this.editor.fillTypes.push({ type: t, startSec: 0 });
        else this.editor.fillTypes.splice(idx, 1);
        this.editor._fillRoundRobin = 0;
        this.refreshFillList();
      });
    });

    container.querySelectorAll('.se-fill-startsec').forEach(input => {
      input.addEventListener('click', ev => ev.stopPropagation());
      input.addEventListener('input', ev => {
        const t = ev.target.closest('.se-fill-item').dataset.type;
        const entry = this.editor.fillTypes.find(e => (typeof e === 'string' ? e : e.type) === t);
        if (entry) entry.startSec = parseInt(ev.target.value) || 0;
      });
    });
  }

  refreshSquadList() {
    const container = document.getElementById('se-squad-list');
    if (!container) return;
    const ed = this.editor;

    if (ed.squads.length === 0) {
      container.innerHTML = '<div class="se-dim" style="font-size:9px;padding:4px 8px">Sin squads</div>';
      return;
    }

    container.innerHTML = ed.squads.map((sq, i) => {
      const instCount = ed.squadInstances.filter(inst => inst.squadName === sq.name).length;
      return `<div class="se-squad-item" data-idx="${i}">
        <div class="se-squad-dot"></div>
        <span class="se-squad-name">${sq.name}</span>
        <span class="se-squad-count">${sq.members.length}e / ${instCount} inst</span>
        <span class="se-squad-del" data-idx="${i}">×</span>
      </div>`;
    }).join('');

    container.querySelectorAll('.se-squad-item').forEach(el => {
      el.addEventListener('click', (ev) => {
        if (ev.target.classList.contains('se-squad-del')) return;
        const idx = parseInt(el.dataset.idx);
        const squad = ed.squads[idx];
        if (squad) {
          ed.squadInstances.push({ squadName: squad.name, spawnTime: ed.currentTime });
          ed.placingMode = false;
          ed.placingSpawner = false;
          ed.placingSquad = false;
          ed.editingSquad = false;
          ed._squadDraft = null;
          this.hideSquadEditor();
          this.refreshTimeline();
          this.updateCursor();
          this.toast(`Squad "${squad.name}" colocado en ${ed.currentTime}s`, 'ok');
        }
      });
    });

    container.querySelectorAll('.se-squad-del').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const idx = parseInt(el.dataset.idx);
        if (confirm(`¿Borrar squad "${ed.squads[idx].name}"?`)) {
          ed.deleteSquadTemplate(idx);
        }
      });
    });
  }

  refreshSquadEditor() {
    const box = document.getElementById('se-squad-editor');
    if (!box) return;
    const ed = this.editor;
    if (!ed.editingSquad || !ed._squadDraft) {
      box.style.display = 'none';
      return;
    }
    box.style.display = 'block';

    const draft = ed._squadDraft;
    const membersHtml = draft.members.map((m, i) => {
      const color = '#' + (enemyRegistry.getTypeColor(m.type) >>> 0).toString(16).padStart(6, '0').slice(-6);
      return `<div class="se-row" style="margin:2px 0;font-size:10px;color:#8ab4cc">
        <div class="se-type-dot" style="background:${color}"></div>
        <span>${m.type}</span>
        <span style="color:#2a4060;font-size:9px">(${m.offsetX.toFixed(0)}, ${m.offsetY.toFixed(0)})</span>
        <button class="se-btn se-btn-exit" style="width:auto;padding:2px 6px;font-size:9px;margin-left:auto"
          id="se-sqd-rm-${i}">✕</button>
      </div>`;
    }).join('');

    box.innerHTML = `
      <div class="se-label">CREAR SQUAD</div>
      <input id="se-squad-name" class="se-input" value="${draft.name}" placeholder="Nombre del squad" style="margin-top:4px">
      <div class="se-dim" style="font-size:9px;margin:4px 0">Selecciona un tipo de enemigo y haz click en el mapa para posicionarlo</div>
      <div style="margin-top:6px;max-height:200px;overflow-y:auto">${membersHtml || '<div class="se-dim" style="font-size:9px">Sin miembros</div>'}</div>
      <div class="se-dim" style="font-size:9px;margin-top:4px">${draft.members.length} enemigos en el squad</div>
      <button class="se-btn se-btn-squad" id="se-save-squad" style="margin-top:8px">💾 Guardar Squad</button>
      <button class="se-btn se-btn-exit" id="se-cancel-squad">Cancelar</button>
    `;

    box.querySelector('#se-squad-name')?.addEventListener('input', ev => {
      draft.name = ev.target.value;
    });

    box.querySelector('#se-save-squad')?.addEventListener('click', () => {
      ed.saveSquad();
    });

    box.querySelector('#se-cancel-squad')?.addEventListener('click', () => {
      ed.cancelSquadEdit();
    });

    draft.members.forEach((m, i) => {
      box.querySelector(`#se-sqd-rm-${i}`)?.addEventListener('click', () => {
        draft.members.splice(i, 1);
        this.refreshSquadEditor();
      });
    });
  }

  hideSquadEditor() {
    const box = document.getElementById('se-squad-editor');
    if (box) box.style.display = 'none';
  }

  refreshTimeline() {
    const markers = document.getElementById('se-timeline-markers');
    if (!markers) return;

    const ed = this.editor;
    const tMax = ed._getTimelineMax();

    const typeColors = {};
    for (const t of enemyRegistry.getAllTypes()) {
      typeColors[t] = '#' + (enemyRegistry.getTypeColor(t) >>> 0).toString(16).padStart(6,'0').slice(-6);
    }

    markers.innerHTML = ed.enemies.map((e, i) => {
      const pct = tMax > 0 ? (e.spawnTime / tMax) * 100 : 0;
      const color = typeColors[e.type] || '#888';
      return `<div class="se-tmarker" data-idx="${i}" style="left:${pct}%">
        <div class="se-tmarker-dot" style="background:${color}"></div>
        <div class="se-tmarker-line" style="background:${color}"></div>
      </div>`;
    }).join('') + ed.spawners.map((s, i) => {
      const pct = 0;
      return `<div class="se-tmarker" style="left:2%;opacity:0.5" title="spawner">
        <div class="se-tmarker-dot" style="background:#ffaa22"></div>
        <div class="se-tmarker-line" style="background:#ffaa22"></div>
      </div>`;
    }).join('') + ed.squadInstances.map((inst, i) => {
      const pct = tMax > 0 ? (inst.spawnTime / tMax) * 100 : 0;
      return `<div class="se-tmarker" data-squad-idx="${i}" style="left:${pct}%">
        <div class="se-tmarker-dot" style="background:#44ccff"></div>
        <div class="se-tmarker-line" style="background:#44ccff"></div>
      </div>`;
    }).join('');

    markers.querySelectorAll('.se-tmarker[data-idx]').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ed._selectEnemy(parseInt(el.dataset.idx));
      });
    });

    markers.querySelectorAll('.se-tmarker[data-squad-idx]').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ed._selectSquad(parseInt(el.dataset.squadIdx));
      });
    });

    const pct = tMax > 0 ? (ed.currentTime / tMax) * 100 : 0;
    const cursor = document.getElementById('se-timeline-cursor');
    if (cursor) cursor.style.left = pct + '%';

    const mm = String(Math.floor(ed.currentTime / 60)).padStart(2,'0');
    const ss = String(ed.currentTime % 60).padStart(2,'0');
    const td = document.getElementById('se-time-display');
    const cd = document.getElementById('se-count-display');
    if (td) td.textContent = `${mm}:${ss}`;
    if (cd) cd.textContent = `${ed.enemies.length} enemigos`;
  }

  // ─── ENEMY INFO PANEL ──────────────────────────────────────────────

  showEnemyInfo(idx) {
    const e = this.editor.enemies[idx];
    const box = document.getElementById('se-selected-info');
    if (!box || !e) return;
    box.style.display = 'block';
    box.innerHTML = `
      <div class="se-label">ENEMIGO SELECCIONADO</div>
      <div class="se-dim">${e.type}</div>
      <div id="se-sel-time-row" class="se-row">
        <span class="se-dim">Tiempo</span>
        <input id="se-sel-time" class="se-input se-input-sm" type="number"
          value="${e.spawnTime}" min="0" step="1">
        <span class="se-dim">s</span>
      </div>
      <button class="se-btn se-btn-exit" id="se-sel-delete">🗑 Eliminar</button>
      <button class="se-btn" id="se-sel-close" style="margin-top:4px">Cerrar</button>
    `;
    box.querySelector('#se-sel-time').addEventListener('input', ev => {
      this.editor.enemies[idx].spawnTime = parseInt(ev.target.value) || 0;
      this.refreshTimeline();
    });
    box.querySelector('#se-sel-delete').addEventListener('click', () => {
      this.editor.enemies.splice(idx, 1);
      this.editor._deselectEnemy();
      this.refreshTypeList();
      this.refreshTimeline();
    });
    box.querySelector('#se-sel-close').addEventListener('click', () => {
      this.editor._deselectEnemy();
    });
  }

  hideEnemyInfo() {
    const box = document.getElementById('se-selected-info');
    if (box) box.style.display = 'none';
  }

  // ─── SQUAD INFO PANEL ─────────────────────────────────────────────────

  showSquadInfo(idx) {
    const inst = this.editor.squadInstances[idx];
    const box = document.getElementById('se-squad-info');
    if (!box || !inst) return;
    box.style.display = 'block';

    const template = this.editor.squads.find(s => s.name === inst.squadName);
    const memberCount = template ? template.members.length : 0;

    box.innerHTML = `
      <div class="se-label">SQUAD</div>
      <div class="se-dim">${inst.squadName} (${memberCount} enemigos)</div>
      <div class="se-row" style="margin-top:6px">
        <span class="se-dim">Tiempo</span>
        <input id="se-sqd-time" class="se-input se-input-sm" type="number"
          value="${inst.spawnTime}" min="0" step="1">
        <span class="se-dim">s</span>
      </div>
      <button class="se-btn se-btn-exit" id="se-sqd-delete" style="margin-top:6px">🗑 Eliminar</button>
      <button class="se-btn" id="se-sqd-close" style="margin-top:4px">Cerrar</button>
    `;

    box.querySelector('#se-sqd-time')?.addEventListener('input', ev => {
      inst.spawnTime = parseInt(ev.target.value) || 0;
      this.refreshTimeline();
    });

    box.querySelector('#se-sqd-delete')?.addEventListener('click', () => {
      this.editor.squadInstances.splice(idx, 1);
      this.editor._deselectSquad();
      this.refreshTimeline();
    });

    box.querySelector('#se-sqd-close')?.addEventListener('click', () => {
      this.editor._deselectSquad();
    });
  }

  hideSquadInfo() {
    const box = document.getElementById('se-squad-info');
    if (box) box.style.display = 'none';
  }

  // ─── CURSOR ─────────────────────────────────────────────────────────

  updateCursor() {
    if (this.editor._pathMode) document.body.style.cursor = 'move';
    else if (this.editor.editingPath) document.body.style.cursor = 'cell';
    else if (this.editor.editingSquad) document.body.style.cursor = 'crosshair';
    else if (this.editor.placingMode || this.editor.placingSpawner || this.editor.placingSquad) document.body.style.cursor = 'crosshair';
    else document.body.style.cursor = 'grab';
  }

  // ─── SPAWNER INFO PANEL ─────────────────────────────────────────────

  refreshSpawnerInfo() {
    const ed = this.editor;
    if (ed.selectedSpawner === null) {
      this.hideSpawnerInfo();
      return;
    }
    const s = ed.spawners[ed.selectedSpawner];
    const box = document.getElementById('se-spawner-info');
    if (!box) return;
    box.style.display = 'block';

    const hasMultiPath = !!(s.paths && s.paths.length > 0);
    const totalPaths = hasMultiPath ? s.paths.length : (s.path && s.path.length > 0 ? 1 : 0);

    if (hasMultiPath && ed._editingPathIndex >= s.paths.length) {
      ed._editingPathIndex = 0;
    }

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

    let pathHtml = '';
    let modeHtml = '';

    if (hasMultiPath) {
      const pathOpts = s.paths.map((p, i) =>
        `<option value="${i}" ${ed._editingPathIndex === i ? 'selected' : ''}>Path ${i + 1} (${(p.path || []).length} wp)</option>`
      ).join('');

      const activePath = s.paths[ed._editingPathIndex] || { path: [], mode: 'loop' };
      const wpList = activePath.path || [];
      const wpCount = wpList.length;

      const waypointsHtml = wpList.map((wp, i) =>
        `<div class="se-row" style="margin:1px 0;font-size:10px;color:#8ab4cc">
          <span>${i}</span><span>(${wp.x.toFixed(0)}, ${wp.y.toFixed(0)})</span>
          <input id="se-wp-wait-${i}" class="se-input se-input-sm" type="number"
            value="${wp.wait}" style="width:50px" min="0" max="30000" step="100">
          <span style="color:#445566">ms</span>
          <button class="se-btn se-btn-exit" style="width:auto;padding:2px 6px;font-size:9px;margin-left:4px"
            id="se-wp-del-${i}">✕</button>
        </div>`
      ).join('');

      pathHtml = `
        <div class="se-row" style="margin-top:4px;gap:4px">
          <select id="se-path-select" class="se-input se-input-sm" style="flex:1">${pathOpts}</select>
          <button class="se-btn se-btn-spawner" id="se-add-path" style="width:auto;padding:4px 8px;font-size:9px;margin:0">+</button>
          <button class="se-btn se-btn-exit" id="se-remove-path" style="width:auto;padding:4px 8px;font-size:9px;margin:0" ${s.paths.length <= 1 ? 'disabled' : ''}>-</button>
        </div>
        <div id="se-spawner-path" style="margin-top:4px">${wpCount > 0
          ? waypointsHtml + `<div class="se-dim" style="margin-top:4px">${wpCount} waypoints</div>`
          : '<div class="se-dim">Sin waypoints</div>'}
        </div>
      `;

      modeHtml = `
        <select id="se-path-mode" class="se-input se-input-sm" style="width:auto;flex:1">
          <option value="loop" ${(activePath.mode || 'loop') === 'loop' ? 'selected' : ''}>Loop</option>
          <option value="pingpong" ${activePath.mode === 'pingpong' ? 'selected' : ''}>Pingpong</option>
          <option value="once" ${activePath.mode === 'once' ? 'selected' : ''}>Once</option>
          <option value="patrol" ${activePath.mode === 'patrol' ? 'selected' : ''}>Patrol (pausa global)</option>
          <option value="random" ${activePath.mode === 'random' ? 'selected' : ''}>Random</option>
          <option value="chase" ${activePath.mode === 'chase' ? 'selected' : ''}>Chase</option>
          <option value="flee" ${activePath.mode === 'flee' ? 'selected' : ''}>Flee</option>
        </select>
        <span class="se-dim">Ciclos</span>
        <input id="se-path-cycles" class="se-input se-input-sm" type="number"
          value="${activePath.cycles || 0}" min="0" max="999" step="1"
          style="width:45px">
      `;
    } else {
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

      pathHtml = `
        <div id="se-spawner-path">${s.path && s.path.length > 0
          ? waypointsHtml + `<div class="se-dim" style="margin-top:4px">${pathCount} waypoints</div>`
          : '<div class="se-dim">Sin ruta definida</div>'}
        </div>
      `;

      modeHtml = `
        <select id="se-path-mode" class="se-input se-input-sm" style="width:auto;flex:1">
          <option value="loop" ${(s.pathMode || 'loop') === 'loop' ? 'selected' : ''}>Loop</option>
          <option value="pingpong" ${s.pathMode === 'pingpong' ? 'selected' : ''}>Pingpong</option>
          <option value="once" ${s.pathMode === 'once' ? 'selected' : ''}>Once</option>
          <option value="patrol" ${s.pathMode === 'patrol' ? 'selected' : ''}>Patrol (pausa global)</option>
          <option value="random" ${s.pathMode === 'random' ? 'selected' : ''}>Random</option>
          <option value="chase" ${s.pathMode === 'chase' ? 'selected' : ''}>Chase</option>
          <option value="flee" ${s.pathMode === 'flee' ? 'selected' : ''}>Flee</option>
        </select>
        <span class="se-dim">Ciclos</span>
        <input id="se-path-cycles" class="se-input se-input-sm" type="number"
          value="${s.pathCycles || 0}" min="0" max="999" step="1"
          style="width:45px">
        <span class="se-dim" id="se-wp-wait-label" style="${s.pathMode === 'patrol' ? '' : 'display:none'}">Pausa</span>
        <input id="se-wp-wait-global" class="se-input se-input-sm" type="number"
          value="${s.waypointWait || 1000}" min="0" max="30000" step="100"
          style="width:60px;${s.pathMode === 'patrol' ? '' : 'display:none'}">
        <span class="se-dim" id="se-wp-wait-ms" style="${s.pathMode === 'patrol' ? '' : 'display:none'}">ms</span>
      `;
    }

    box.innerHTML = `
      <div class="se-label">SPAWNER</div>
      <div class="se-dim">Pos: (${s.x.toFixed(0)}, ${s.y.toFixed(0)})</div>
      <div class="se-section" style="margin-top:6px;padding:8px 0;border-bottom:1px solid #0e1824">
        <div class="se-label" style="font-size:9px;letter-spacing:2px;margin-bottom:4px">OLEADA</div>
        <div class="se-row" style="margin:3px 0">
          <span class="se-dim">Cada</span>
          <input id="se-wave-interval" class="se-input se-input-sm" type="number"
            value="${s.waveInterval ? Math.floor(s.waveInterval / 1000) : 0}" min="0" max="3600" step="1">
          <span class="se-dim">s</span>
        </div>
        <div class="se-row" style="margin:3px 0">
          <span class="se-dim">Cantidad</span>
          <input id="se-wave-count" class="se-input se-input-sm" type="number"
            value="${s.waveCount || 0}" min="0" max="100" step="1">
          <span class="se-dim">enemigos</span>
        </div>
        <div class="se-row" style="margin:3px 0">
          <span class="se-dim">Retraso</span>
          <input id="se-wave-delay" class="se-input se-input-sm" type="number"
            value="${s.waveDelay || 0}" min="0" max="30000" step="100">
          <span class="se-dim">ms</span>
        </div>
        <div class="se-dim" style="font-size:9px;color:#2a4060;margin-top:3px">Retraso 0 = todos a la vez</div>
        <div class="se-row" style="margin:3px 0">
          <span class="se-dim">Max vivos</span>
          <input id="se-max-alive" class="se-input se-input-sm" type="number"
            value="${s.maxAlive || 0}" min="0" max="300" step="1">
          <span class="se-dim">(0 = sin limite)</span>
        </div>
      </div>
      <div class="se-row" style="margin-top:4px">
        <span class="se-dim">Inicia</span>
        <input id="se-spawn-start" class="se-input se-input-sm" type="number"
          value="${s.startTime || 0}" min="0" max="3600" step="5">
        <span class="se-dim">s</span>
        <span class="se-dim">Expira</span>
        <input id="se-spawn-expire" class="se-input se-input-sm" type="number"
          value="${s.expireTime || 0}" min="0" max="3600" step="5">
        <span class="se-dim">s</span>
      </div>
      <div class="se-row" style="margin-top:4px">
        <label style="display:flex;align-items:center;gap:6px;font-size:10px;color:#8ab4cc;cursor:pointer">
          <input type="checkbox" id="se-show-timer" ${s.showTimer ? 'checked' : ''}>
          Mostrar temporizador en juego
        </label>
      </div>
      <div class="se-label" style="margin-top:10px">TIPOS PERMITIDOS</div>
      <div id="se-spawner-types">${typesHtml}</div>
      <div class="se-label" style="margin-top:10px">RUTA ${hasMultiPath ? `(${totalPaths} paths)` : ''}</div>
      ${pathHtml}
      <div class="se-row" style="margin-top:6px;gap:4px">
        ${modeHtml}
      </div>
      <div class="se-label" style="margin-top:10px">TRANSFORMAR RUTA</div>
      <div class="se-row" style="gap:4px;margin-top:4px">
        <button class="se-btn se-btn-spawner" id="se-mirror-v" style="flex:1;padding:4px;font-size:9px">V</button>
        <button class="se-btn se-btn-spawner" id="se-mirror-h" style="flex:1;padding:4px;font-size:9px">H</button>
        <button class="se-btn se-btn-spawner" id="se-mirror-both" style="flex:1;padding:4px;font-size:9px">V+H</button>
      </div>
      <div class="se-row" style="gap:4px;margin-top:4px">
        <button class="se-btn se-btn-spawner ${ed._pathMode === 'rotate' ? 'active' : ''}" id="se-rotate-path" style="flex:1;padding:4px;font-size:9px">${ed._pathMode === 'rotate' ? 'Rotando' : 'Rotar'}</button>
        <button class="se-btn se-btn-spawner ${ed._pathMode === 'moveAll' ? 'active' : ''}" id="se-moveall-path" style="flex:1;padding:4px;font-size:9px">${ed._pathMode === 'moveAll' ? 'Moviendo' : 'Mover todo'}</button>
      </div>
      <div class="se-dim" style="font-size:8px;color:#2a4060;margin-top:2px">Rotar/Mover: arrastra en el mapa</div>
      <button class="se-btn se-btn-spawner" id="se-add-multi-path" style="margin-top:6px">+ Multipath</button>
      <button class="se-btn se-btn-spawner" id="se-edit-path" style="margin-top:2px">${ed.editingPath ? '■ Detener edición' : '✎ Editar Ruta'}</button>
      <button class="se-btn se-btn-exit" id="se-delete-spawner" style="margin-top:4px">🗑 Eliminar Spawner</button>
      <button class="se-btn" id="se-close-spawner" style="margin-top:4px">Cerrar</button>
    `;

    // ── Event handlers ──

    box.querySelector('#se-wave-interval')?.addEventListener('input', ev => {
      s.waveInterval = (parseInt(ev.target.value) || 0) * 1000; // s -> ms
    });

    box.querySelector('#se-wave-count')?.addEventListener('input', ev => {
      s.waveCount = parseInt(ev.target.value) || 0;
    });

    box.querySelector('#se-wave-delay')?.addEventListener('input', ev => {
      s.waveDelay = parseInt(ev.target.value) || 0;
    });

    box.querySelector('#se-max-alive')?.addEventListener('input', ev => {
      s.maxAlive = parseInt(ev.target.value) || 0;
    });

    box.querySelector('#se-spawn-start')?.addEventListener('input', ev => {
      s.startTime = parseInt(ev.target.value) || 0;
    });

    box.querySelector('#se-spawn-expire')?.addEventListener('input', ev => {
      s.expireTime = parseInt(ev.target.value) || 0;
    });

    box.querySelector('#se-show-timer')?.addEventListener('change', ev => {
      s.showTimer = ev.target.checked;
    });

    box.querySelector('#se-path-select')?.addEventListener('change', ev => {
      ed._editingPathIndex = parseInt(ev.target.value) || 0;
      this.refreshSpawnerInfo();
    });

    box.querySelector('#se-add-path')?.addEventListener('click', () => {
      if (!s.paths) s.paths = [];
      s.paths.push({ path: [], mode: 'loop', cycles: 0 });
      ed._editingPathIndex = s.paths.length - 1;
      this.refreshSpawnerInfo();
    });

    box.querySelector('#se-remove-path')?.addEventListener('click', () => {
      if (!s.paths || s.paths.length <= 1) return;
      s.paths.splice(ed._editingPathIndex, 1);
      if (ed._editingPathIndex >= s.paths.length) ed._editingPathIndex = s.paths.length - 1;
      this.refreshSpawnerInfo();
    });

    box.querySelector('#se-add-multi-path')?.addEventListener('click', () => {
      if (!s.paths) {
        s.paths = [];
        if (s.path && s.path.length > 0) {
          s.paths.push({ path: [...s.path], mode: s.pathMode || 'loop', cycles: s.pathCycles || 0 });
        }
        s.paths.push({ path: [], mode: 'loop', cycles: 0 });
        ed._editingPathIndex = 0;
        this.refreshSpawnerInfo();
      }
    });

    box.querySelector('#se-path-mode')?.addEventListener('change', ev => {
      if (hasMultiPath) {
        const activePath = s.paths[ed._editingPathIndex];
        if (activePath) activePath.mode = ev.target.value;
      } else {
        s.pathMode = ev.target.value;
        const isPatrol = ev.target.value === 'patrol';
        const lbl = box.querySelector('#se-wp-wait-label');
        const inp = box.querySelector('#se-wp-wait-global');
        const ms  = box.querySelector('#se-wp-wait-ms');
        if (lbl) lbl.style.display = isPatrol ? '' : 'none';
        if (inp) inp.style.display = isPatrol ? '' : 'none';
        if (ms)  ms.style.display  = isPatrol ? '' : 'none';
      }
    });

    box.querySelector('#se-path-cycles')?.addEventListener('input', ev => {
      const val = parseInt(ev.target.value) || 0;
      if (hasMultiPath) {
        const activePath = s.paths[ed._editingPathIndex];
        if (activePath) activePath.cycles = Math.max(0, val);
      } else {
        s.pathCycles = Math.max(0, val);
      }
    });

    box.querySelector('#se-wp-wait-global')?.addEventListener('input', ev => {
      s.waypointWait = parseInt(ev.target.value) || 0;
    });

    box.querySelector('#se-edit-path')?.addEventListener('click', () => {
      ed.editingPath = !ed.editingPath;
      this.updateCursor();
      this.refreshSpawnerInfo();
    });

    box.querySelector('#se-delete-spawner')?.addEventListener('click', () => {
      ed.spawners.splice(ed.selectedSpawner, 1);
      ed._deselectSpawner();
      this.refreshTimeline();
    });
    box.querySelector('#se-close-spawner')?.addEventListener('click', () => ed._deselectSpawner());

    box.querySelectorAll('#se-spawner-types .se-fill-item').forEach(el => {
      el.addEventListener('click', () => {
        const t = el.dataset.type;
        if (!s.types) s.types = [];
        const idx2 = s.types.indexOf(t);
        if (idx2 === -1) s.types.push(t); else s.types.splice(idx2, 1);
        this.refreshSpawnerInfo();
      });
    });

    if (hasMultiPath) {
      const activePath = s.paths[ed._editingPathIndex];
      const wpList = activePath ? (activePath.path || []) : [];
      wpList.forEach((wp, i) => {
        box.querySelector(`#se-wp-wait-${i}`)?.addEventListener('input', ev => {
          wp.wait = parseInt(ev.target.value) || 0;
        });
        box.querySelector(`#se-wp-del-${i}`)?.addEventListener('click', () => {
          wpList.splice(i, 1);
          this.refreshSpawnerInfo();
        });
      });
    } else {
      (s.path || []).forEach((wp, i) => {
        box.querySelector(`#se-wp-wait-${i}`)?.addEventListener('input', ev => {
          wp.wait = parseInt(ev.target.value) || 0;
        });
        box.querySelector(`#se-wp-del-${i}`)?.addEventListener('click', () => {
          s.path.splice(i, 1);
          this.refreshSpawnerInfo();
        });
      });
    }

    // Mirror buttons
    box.querySelector('#se-mirror-v')?.addEventListener('click', () => {
      ed.mirrorPath('v');
    });
    box.querySelector('#se-mirror-h')?.addEventListener('click', () => {
      ed.mirrorPath('h');
    });
    box.querySelector('#se-mirror-both')?.addEventListener('click', () => {
      ed.mirrorPath('both');
    });

    // Rotate button
    box.querySelector('#se-rotate-path')?.addEventListener('click', () => {
      if (ed._pathMode === 'rotate') { ed._pathMode = null; }
      else { ed._pathMode = 'rotate'; ed.editingPath = false; }
      this.updateCursor();
      this.refreshSpawnerInfo();
    });

    // Move all button
    box.querySelector('#se-moveall-path')?.addEventListener('click', () => {
      if (ed._pathMode === 'moveAll') { ed._pathMode = null; }
      else { ed._pathMode = 'moveAll'; ed.editingPath = false; }
      this.updateCursor();
      this.refreshSpawnerInfo();
    });
  }

  hideSpawnerInfo() {
    const box = document.getElementById('se-spawner-info');
    if (box) box.style.display = 'none';
  }

  // ─── SYNC ALL (from _applyStage) ────────────────────────────────────

  syncAll() {
    const ed = this.editor;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

    setVal('se-stage-name', ed.stageName);
    setVal('se-timelimit', ed.timeLimit);
    setVal('se-max-base', ed.maxBase);
    setVal('se-max-per-min', ed.maxPerMin);
    setVal('se-min-base', ed.minBase);
    setVal('se-min-per-min', ed.minPerMin);
    const svgEl = document.getElementById('se-svg-name');
    if (svgEl) svgEl.textContent = ed.svgName || 'sin mapa';

    this.refreshTypeList();
    this.refreshFillList();
    this.refreshSquadList();
    this.refreshTimeline();
  }

  // ─── TOAST ──────────────────────────────────────────────────────────

  toast(msg, type = 'inf') {
    const colors = { ok:'#44ff88', err:'#ff4444', inf:'#4488ff' };
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);
      background:#07101c;border:1px solid ${colors[type]};color:${colors[type]};
      padding:8px 20px;font-family:monospace;font-size:11px;z-index:9999;pointer-events:none;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
}
