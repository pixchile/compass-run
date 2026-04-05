import { W, H } from '../constants.js';

// ══════════════════════════════════════════════════════════════════════════════
//  STYLES — inyectados en el DOM una sola vez
// ══════════════════════════════════════════════════════════════════════════════

const EDITOR_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Exo+2:wght@600;700&display=swap');

#cr-editor-overlay {
  position: fixed; inset: 0;
  pointer-events: none;
  z-index: 500;
  font-family: 'Share Tech Mono', 'Courier New', monospace;
}

#cr-info-panel {
  position: absolute;
  top: 12px; left: 12px;
  width: 228px;
  background: rgba(7,9,16,0.94);
  border: 1px solid #192840;
  border-top: 2px solid #4488ff;
  pointer-events: auto;
  box-shadow: 4px 4px 0 rgba(0,0,0,.5), 0 0 28px rgba(68,136,255,.07);
}

.cr-ph {
  padding: 7px 12px;
  background: rgba(68,136,255,.06);
  border-bottom: 1px solid #0e1e30;
  display: flex; align-items: center; gap: 8px;
}
.cr-ph-dot {
  width: 5px; height: 5px;
  background: #4488ff; border-radius: 50%;
  box-shadow: 0 0 5px #4488ff; flex-shrink: 0;
}
.cr-ph-title {
  color: #4488ff; font-size: 9px;
  letter-spacing: 3px; text-transform: uppercase;
}

.cr-pb { padding: 10px 12px; }

.cr-row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,.025);
}
.cr-row:last-child { border-bottom: none; }

.cr-lbl { color: #253545; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; }
.cr-val { color: #5a80a0; font-size: 11px; }
.cr-val.hi  { color: #ffaa22; }
.cr-val.blu { color: #4488ff; }
.cr-val.grn { color: #44ff88; }

.cr-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, #192840, transparent);
  margin: 6px 0;
}

.cr-keys {
  padding: 8px 12px 10px;
  border-top: 1px solid #0e1824;
  display: flex; flex-wrap: wrap; gap: 5px 8px;
}
.cr-k { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.cr-kbadge {
  background: #080f1c; border: 1px solid #192840;
  color: #ffaa22; font-size: 8px; padding: 1px 5px;
  border-radius: 2px; letter-spacing: .5px;
  font-family: 'Share Tech Mono','Courier New',monospace;
}
.cr-kdesc { color: #1e3040; font-size: 8px; }

#cr-mode-panel {
  position: absolute; top: 12px; right: 12px;
  display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
  pointer-events: none;
}

#cr-mode-badge {
  padding: 7px 18px 7px 14px;
  background: rgba(7,9,16,.93);
  border: 1px solid; border-right-width: 3px;
  font-size: 13px; letter-spacing: 4px; text-transform: uppercase;
  backdrop-filter: blur(6px);
  transition: color .2s, border-color .2s, box-shadow .2s;
  font-family: 'Share Tech Mono','Courier New',monospace;
}
#cr-mode-badge.draw  { color:#44ff88; border-color:#44ff88; box-shadow:0 0 18px rgba(68,255,136,.14); }
#cr-mode-badge.edit  { color:#ffaa44; border-color:#ffaa44; box-shadow:0 0 18px rgba(255,170,68,.14); }
#cr-mode-badge.erase { color:#ff4444; border-color:#ff4444; box-shadow:0 0 18px rgba(255,68,68,.14); }
#cr-mode-badge.enemy { color:#ff66ff; border-color:#ff66ff; box-shadow:0 0 18px rgba(255,102,255,.14); }

#cr-thick-badge {
  padding: 3px 10px;
  background: rgba(7,9,16,.88); border: 1px solid #192840;
  color: #253545; font-size: 9px; letter-spacing: 1.5px;
  font-family: 'Share Tech Mono','Courier New',monospace;
}
#cr-thick-badge em { color: #ffaa22; font-style: normal; }

#cr-toasts {
  position: absolute; bottom: 52px; left: 50%;
  transform: translateX(-50%);
  display: flex; flex-direction: column; gap: 6px; align-items: center;
  pointer-events: none;
}
.cr-toast {
  padding: 9px 24px; background: rgba(7,9,16,.97);
  border: 1px solid; font-size: 11px; letter-spacing: 2px;
  backdrop-filter: blur(8px);
  font-family: 'Share Tech Mono','Courier New',monospace;
  animation: cr-tin .2s ease-out, cr-tout .3s ease-in 1.7s forwards;
  white-space: nowrap;
}
.cr-toast.ok  { color:#44ff88; border-color:#44ff88; box-shadow:0 0 14px rgba(68,255,136,.16); }
.cr-toast.err { color:#ff4444; border-color:#ff4444; box-shadow:0 0 14px rgba(255,68,68,.16); }
.cr-toast.inf { color:#4488ff; border-color:#4488ff; box-shadow:0 0 14px rgba(68,136,255,.16); }
@keyframes cr-tin  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
@keyframes cr-tout { from{opacity:1;transform:none} to{opacity:0;transform:translateY(-6px)} }

.cr-overlay {
  position: fixed; inset: 0;
  background: rgba(3,5,12,.78);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; backdrop-filter: blur(7px);
  animation: cr-fin .15s ease;
}
@keyframes cr-fin { from{opacity:0} to{opacity:1} }

.cr-modal {
  background: #07101c;
  border: 1px solid #192840; border-top: 2px solid #4488ff;
  min-width: 340px;
  animation: cr-min .22s cubic-bezier(.22,1,.36,1);
  font-family: 'Share Tech Mono','Courier New',monospace;
  box-shadow: 0 28px 64px rgba(0,0,0,.85), 0 0 36px rgba(68,136,255,.05);
}
.cr-modal.grn { border-top-color: #44ff88; }
.cr-modal.org { border-top-color: #ffaa22; }
@keyframes cr-min { from{opacity:0;transform:scale(.95) translateY(-10px)} to{opacity:1;transform:none} }

.cr-mhdr {
  padding: 13px 18px 10px; border-bottom: 1px solid #0c1828;
  display: flex; align-items: center; gap: 10px;
}
.cr-mhdr-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  background: #4488ff; box-shadow: 0 0 7px #4488ff;
}
.cr-modal.grn .cr-mhdr-dot { background:#44ff88; box-shadow:0 0 7px #44ff88; }
.cr-modal.org .cr-mhdr-dot { background:#ffaa22; box-shadow:0 0 7px #ffaa22; }
.cr-mhdr-title { color: #5a80a0; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; }

.cr-mbody { padding: 18px 20px; }

.cr-flbl {
  color: #253545; font-size: 9px; letter-spacing: 2px;
  text-transform: uppercase; display: block; margin-bottom: 7px;
}

.cr-finput {
  background: #050c16; border: 1px solid #192840; border-radius: 2px;
  color: #8ab4cc; font-family: 'Share Tech Mono','Courier New',monospace;
  font-size: 14px; padding: 8px 12px; outline: none;
  transition: border-color .15s; box-sizing: border-box;
}
.cr-finput.sm   { width: 120px; text-align: center; display: block; margin: 0 auto; }
.cr-finput:focus { border-color: #4488ff; box-shadow: 0 0 0 1px rgba(68,136,255,.2); }

.cr-type-row { display: flex; gap: 8px; margin-top: 6px; }
.cr-type-btn {
  flex: 1; padding: 12px 4px; background: #050c16;
  border: 1px solid #192840; color: #253545;
  font-family: 'Share Tech Mono','Courier New',monospace;
  font-size: 9px; letter-spacing: 1.5px; text-align: center;
  cursor: pointer; transition: all .15s; text-transform: uppercase;
  user-select: none; display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.cr-type-btn:hover { background: #0a1428; color: #5a80a0; }
.cr-circle { border-radius: 50%; background: currentColor; display: block; flex-shrink: 0; }
.cr-type-btn.s { color:#ff8888; border-color:#ff8888; background:rgba(255,136,136,.05); }
.cr-type-btn.m { color:#ff5555; border-color:#ff5555; background:rgba(255,85,85,.05); }
.cr-type-btn.b { color:#dd3333; border-color:#dd3333; background:rgba(221,51,51,.05); }

.cr-mftr {
  padding: 10px 20px 15px; border-top: 1px solid #0c1828;
  display: flex; gap: 8px; justify-content: flex-end;
}
.cr-btn {
  padding: 7px 16px; background: #050c16; border: 1px solid;
  font-family: 'Share Tech Mono','Courier New',monospace;
  font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
  cursor: pointer; transition: all .15s;
}
.cr-btn:hover { background: #0a1428; }
.cr-btn-ok  { color:#44ff88; border-color:#44ff88; }
.cr-btn-ok:hover  { box-shadow: 0 0 12px rgba(68,255,136,.22); }
.cr-btn-del { color:#ff4444; border-color:#ff4444; }
.cr-btn-del:hover { box-shadow: 0 0 12px rgba(255,68,68,.22); }
.cr-btn-x   { color:#253545; border-color:#192840; }
.cr-btn-x:hover { color:#5a80a0; border-color:#2a4060; }

.cr-map-list {
  display: flex; flex-direction: column; gap: 4px;
  max-height: 260px; overflow-y: auto; padding-right: 2px;
}
.cr-map-list::-webkit-scrollbar { width: 3px; }
.cr-map-list::-webkit-scrollbar-track { background: #050c16; }
.cr-map-list::-webkit-scrollbar-thumb { background: #192840; border-radius: 2px; }

.cr-map-item {
  padding: 11px 14px; background: #050c16;
  border: 1px solid #0e1e30; cursor: pointer; transition: all .15s;
  display: flex; justify-content: space-between; align-items: center;
}
.cr-map-item:hover { border-color: #4488ff; background: rgba(68,136,255,.04); }
.cr-map-name { color: #8ab4cc; font-size: 12px; letter-spacing: .5px; }
.cr-map-meta { color: #253545; font-size: 9px; letter-spacing: 1px; text-align: right; line-height: 1.7; }
.cr-empty { color: #253545; font-size: 11px; padding: 12px 0; text-align: center; }
`;

// ══════════════════════════════════════════════════════════════════════════════

export default class MapEditorUI {
  constructor(editor) {
    this.editor = editor;
    this.infoText      = null;   // legacy stubs
    this.modeText      = null;
    this.thicknessText = null;
    this._overlay = null;
    this._injectCSS();
  }

  _injectCSS() {
    if (document.getElementById('cr-editor-css')) return;
    const tag = document.createElement('style');
    tag.id = 'cr-editor-css';
    tag.textContent = EDITOR_CSS;
    document.head.appendChild(tag);
  }

  // ─── CREAR UI PRINCIPAL ────────────────────────────────────────────────────

  createUI() {
    document.getElementById('cr-editor-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'cr-editor-overlay';
    overlay.innerHTML = `
      <div id="cr-info-panel">
        <div class="cr-ph">
          <div class="cr-ph-dot"></div>
          <span class="cr-ph-title">Map Editor</span>
        </div>
        <div class="cr-pb" id="cr-info-body"></div>
        <div class="cr-keys" id="cr-keys"></div>
      </div>
      <div id="cr-mode-panel">
        <div id="cr-mode-badge" class="draw">DRAW</div>
        <div id="cr-thick-badge">GROSOR: <em>10</em>px</div>
      </div>
      <div id="cr-toasts"></div>
    `;
    document.body.appendChild(overlay);
    this._overlay = overlay;

    this.editor.events.once('shutdown', () => this._cleanup());

    this._renderKeys();
    this.updateInfoText();
    this.updateModeText();
    this.updateThicknessText();
  }

  _cleanup() {
    this._overlay?.remove();
    this._overlay = null;
    document.querySelectorAll('.cr-overlay').forEach(el => el.remove());
  }

  _renderKeys() {
    const el = document.getElementById('cr-keys');
    if (!el) return;
    const shortcuts = [
      ['D','Dibujar'],['E','Editar'],['R','Borrar'],['N','Enemigo'],
      ['G','Grid'],['S','Guardar'],['L','Cargar'],['T','Tiempo'],
      ['[ ]','Grosor'],['ESC','Salir'],
    ];
    el.innerHTML = shortcuts.map(([k, d]) =>
      `<span class="cr-k"><span class="cr-kbadge">${k}</span><span class="cr-kdesc">${d}</span></span>`
    ).join('');
  }

  // ─── INFO PANEL ────────────────────────────────────────────────────────────

  updateInfoText() {
    const el = document.getElementById('cr-info-body');
    if (!el) return;
    const e = this.editor;
    const mm = Math.floor(e.timeLimit / 60);
    const ss = (e.timeLimit % 60).toString().padStart(2, '0');
    el.innerHTML = `
      <div class="cr-row">
        <span class="cr-lbl">Mapa</span>
        <span class="cr-val hi">${e.currentMap.name || '—'}</span>
      </div>
      <div class="cr-row">
        <span class="cr-lbl">Tiempo</span>
        <span class="cr-val blu">${mm}:${ss}</span>
      </div>
      <div class="cr-divider"></div>
      <div class="cr-row">
        <span class="cr-lbl">Muros</span>
        <span class="cr-val">${e.lines.length}</span>
      </div>
      <div class="cr-row">
        <span class="cr-lbl">Enemigos</span>
        <span class="cr-val">${e.enemies.length}</span>
      </div>
    `;
  }

  // ─── MODE BADGE ────────────────────────────────────────────────────────────

  updateModeText() {
    const el = document.getElementById('cr-mode-badge');
    if (!el) return;
    const labels = { draw:'DRAW', edit:'EDIT', erase:'ERASE', enemy:'ENEMY' };
    el.className = this.editor.mode;
    el.textContent = labels[this.editor.mode] || this.editor.mode.toUpperCase();
  }

  // ─── THICKNESS BADGE ───────────────────────────────────────────────────────

  updateThicknessText() {
    const el = document.getElementById('cr-thick-badge');
    if (!el) return;
    el.innerHTML = `GROSOR: <em>${this.editor.lineThickness}</em>px`;
  }

  // ─── MODAL: TIEMPO LÍMITE ──────────────────────────────────────────────────

  editTimeLimit() {
    const e = this.editor;
    const overlay = this._createModalOverlay();
    const minutes = Math.floor(e.timeLimit / 60);

    overlay.innerHTML = `
      <div class="cr-modal org">
        <div class="cr-mhdr">
          <div class="cr-mhdr-dot"></div>
          <span class="cr-mhdr-title">Tiempo Límite</span>
        </div>
        <div class="cr-mbody">
          <label class="cr-flbl">Duración en minutos (1 – 60)</label>
          <input id="cr-time-input" class="cr-finput sm" type="number"
            value="${minutes}" min="1" max="60">
        </div>
        <div class="cr-mftr">
          <button class="cr-btn cr-btn-x"  id="cr-t-cancel">Cancelar</button>
          <button class="cr-btn cr-btn-ok" id="cr-t-confirm">Confirmar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#cr-time-input');
    input.focus(); input.select();

    overlay.querySelector('#cr-t-confirm').onclick = () => {
      const v = parseInt(input.value);
      if (isNaN(v) || v < 1 || v > 60) { this.showNotification('Valor inválido', 'err'); return; }
      e.timeLimit = v * 60;
      this.updateInfoText();
      this.showNotification(`Tiempo: ${v} min`, 'ok');
      this._closeModal(overlay);
    };
    overlay.querySelector('#cr-t-cancel').onclick = () => this._closeModal(overlay);
    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter')  overlay.querySelector('#cr-t-confirm').click();
      if (ev.key === 'Escape') this._closeModal(overlay);
    });
  }

  // ─── MODAL: ENEMIGO ────────────────────────────────────────────────────────

  editEnemy(index) {
    const en = this.editor.enemies[index];
    this.createEnemyPanel(en.x, en.y, index);
  }

  createEnemyPanel(x, y, editIndex) {
    const e      = this.editor;
    const isEdit = editIndex !== null && editIndex !== undefined;
    const ex     = isEdit ? e.enemies[editIndex] : null;
    let selectedType = ex?.type || 'small';

    const overlay = this._createModalOverlay();
    overlay.innerHTML = `
      <div class="cr-modal ${isEdit ? '' : 'grn'}">
        <div class="cr-mhdr">
          <div class="cr-mhdr-dot"></div>
          <span class="cr-mhdr-title">${isEdit ? 'Editar Enemigo' : 'Nuevo Enemigo'}</span>
        </div>
        <div class="cr-mbody">
          <label class="cr-flbl">Tipo</label>
          <div class="cr-type-row">
            <div class="cr-type-btn ${selectedType==='small'?'s':''}" data-type="small">
              <span class="cr-circle" style="width:10px;height:10px"></span>
              Small<br><span style="font-size:8px;opacity:.55">HP: 1</span>
            </div>
            <div class="cr-type-btn ${selectedType==='medium'?'m':''}" data-type="medium">
              <span class="cr-circle" style="width:17px;height:17px"></span>
              Medium<br><span style="font-size:8px;opacity:.55">HP: 100</span>
            </div>
            <div class="cr-type-btn ${selectedType==='big'?'b':''}" data-type="big">
              <span class="cr-circle" style="width:26px;height:26px"></span>
              Big<br><span style="font-size:8px;opacity:.55">HP: 300</span>
            </div>
          </div>
          <label class="cr-flbl" style="margin-top:18px">Spawn (segundos desde inicio)</label>
          <input id="cr-spawn-input" class="cr-finput sm" type="number"
            value="${ex?.spawnTime ?? 0}" min="0" max="${e.timeLimit}" step="1">
        </div>
        <div class="cr-mftr">
          ${isEdit ? '<button class="cr-btn cr-btn-del" id="cr-en-del">Eliminar</button>' : ''}
          <button class="cr-btn cr-btn-x"  id="cr-en-cancel">Cancelar</button>
          <button class="cr-btn cr-btn-ok" id="cr-en-save">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const typeBtns = overlay.querySelectorAll('.cr-type-btn');
    const classMap = { small:'s', medium:'m', big:'b' };
    typeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        selectedType = btn.dataset.type;
        typeBtns.forEach(b => b.className = 'cr-type-btn');
        btn.classList.add(classMap[selectedType]);
      });
    });

    overlay.querySelector('#cr-spawn-input').focus();

    overlay.querySelector('#cr-en-save').onclick = () => {
      const spawnTime = parseInt(overlay.querySelector('#cr-spawn-input').value);
      if (isNaN(spawnTime) || spawnTime < 0 || spawnTime > e.timeLimit) {
        this.showNotification('Tiempo de spawn inválido', 'err'); return;
      }
      if (isEdit) {
        e.enemies[editIndex] = { ...e.enemies[editIndex], type: selectedType, spawnTime };
        this.showNotification('Enemigo actualizado', 'ok');
      } else {
        e.enemies.push({ type: selectedType, x, y, spawnTime });
        this.showNotification('Enemigo añadido', 'ok');
      }
      this.updateInfoText();
      this._closeModal(overlay);
    };

    if (isEdit) {
      overlay.querySelector('#cr-en-del').onclick = () => {
        e.enemies.splice(editIndex, 1);
        this.updateInfoText();
        this.showNotification('Enemigo eliminado', 'err');
        this._closeModal(overlay);
      };
    }
    overlay.querySelector('#cr-en-cancel').onclick = () => this._closeModal(overlay);
    overlay.addEventListener('keydown', ev => { if (ev.key === 'Escape') this._closeModal(overlay); });
  }

  // ─── MODAL: SELECTOR DE MAPA ───────────────────────────────────────────────

  createMapSelector(maps) {
    const e = this.editor;
    const overlay = this._createModalOverlay();

    const items = maps.length
      ? maps.map(m => {
          const mm = Math.floor(m.timeLimit / 60);
          const ss = (m.timeLimit % 60).toString().padStart(2, '0');
          return `<div class="cr-map-item" data-name="${m.name}">
            <span class="cr-map-name">${m.name}</span>
            <span class="cr-map-meta">${m.lines} muros · ${m.enemies} enemigos<br>${mm}:${ss}</span>
          </div>`;
        }).join('')
      : `<div class="cr-empty">No hay mapas guardados</div>`;

    overlay.innerHTML = `
      <div class="cr-modal" style="min-width:400px">
        <div class="cr-mhdr">
          <div class="cr-mhdr-dot"></div>
          <span class="cr-mhdr-title">Cargar Mapa</span>
        </div>
        <div class="cr-mbody">
          <div class="cr-map-list">${items}</div>
        </div>
        <div class="cr-mftr">
          <button class="cr-btn cr-btn-x" id="cr-map-close">Cerrar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.cr-map-item').forEach(item => {
      item.addEventListener('click', () => {
        const name = item.dataset.name;
        e.currentMap = e.mapLoader.loadMap(name);
        e.lines      = [...(e.currentMap.lines   || [])];
        e.enemies    = [...(e.currentMap.enemies || [])];
        e.timeLimit  = e.currentMap.timeLimit || 300;
        this.updateInfoText();
        this.showNotification(`Cargado: ${name}`, 'ok');
        this._closeModal(overlay);
      });
    });

    overlay.querySelector('#cr-map-close').onclick = () => this._closeModal(overlay);
    overlay.addEventListener('keydown', ev => { if (ev.key === 'Escape') this._closeModal(overlay); });
  }

  // ─── NOTIFICACIÓN TOAST ────────────────────────────────────────────────────

  showNotification(msg, colorOrHex) {
    const container = document.getElementById('cr-toasts');
    if (!container) return;
    let cls = 'inf';
    if (colorOrHex === 'ok'  || colorOrHex === 0x44ff88) cls = 'ok';
    if (colorOrHex === 'err' || colorOrHex === 0xff4444) cls = 'err';
    const toast = document.createElement('div');
    toast.className = `cr-toast ${cls}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  _createModalOverlay() {
    const div = document.createElement('div');
    div.className = 'cr-overlay';
    return div;
  }

  _closeModal(overlay) {
    overlay.style.animation = 'cr-fin .15s ease reverse forwards';
    setTimeout(() => overlay.remove(), 150);
  }

  // Legacy no-op (los modales se auto-gestionan ahora)
  cleanupPanel() {}
}
