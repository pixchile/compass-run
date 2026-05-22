const COLORS = [
    { label: 'Walls', color: '#000000' },
    { label: 'Void', color: '#800080' },
    { label: 'Damage', color: '#ff0000' },
    { label: 'Slow', color: '#000080' },
    { label: 'Shop', color: '#f7ff00' },
    { label: 'Trap', color: '#ffffff' }
];

const ZONE_TYPES = ['void', 'damage_zone', 'slow_zone', 'trap', 'shop', 'heal', 'death', 'fire'];
const ZONE_COLORS = {
    void: '#800080', damage_zone: '#ff0000', slow_zone: '#000080',
    trap: '#ffffff', shop: '#f7ff00', heal: '#00ff00', death: '#ff4400', fire: '#ff6600'
};

export default class MapEditorUI {
    constructor(scene) {
        this.scene = scene;
        this._injectCSS();
        this._build();
        this._updateToolButtons();
    }

    _injectCSS() {
        if (document.getElementById('me-styles')) return;
        const css = document.createElement('style');
        css.id = 'me-styles';
        css.textContent = `
            #me-sidebar {
                position: absolute; left: 0; top: 0; width: 260px; height: 100%;
                background: #0d1117cc; color: #ccc; font: 13px 'Segoe UI', sans-serif;
                padding: 12px; overflow-y: auto; z-index: 100;
                border-right: 1px solid #222;
            }
            #me-sidebar .me-section {
                margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #1a1a2e;
            }
            #me-sidebar .me-label {
                font-size: 11px; color: #888; margin-bottom: 6px; letter-spacing: 1px;
            }
            #me-sidebar .me-input {
                width: 100%; box-sizing: border-box; background: #161b22; border: 1px solid #30363d;
                color: #ccc; padding: 5px 8px; font-size: 13px; border-radius: 4px;
            }
            #me-sidebar .me-input:focus { outline: none; border-color: #58a6ff; }
            #me-sidebar .me-input-sm { width: 60px; padding: 3px 6px; font-size: 12px; }
            #me-sidebar .me-select {
                width: 100%; box-sizing: border-box; background: #161b22; border: 1px solid #30363d;
                color: #ccc; padding: 5px 8px; font-size: 13px; border-radius: 4px;
            }
            #me-sidebar .me-select:focus { outline: none; border-color: #58a6ff; }
            #me-sidebar .me-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
            #me-sidebar .me-row label { font-size: 12px; color: #aaa; }
            #me-sidebar .me-btn {
                background: #21262d; border: 1px solid #30363d; color: #ccc;
                padding: 5px 10px; font-size: 12px; border-radius: 4px; cursor: pointer;
            }
            #me-sidebar .me-btn:hover { background: #30363d; }
            #me-sidebar .me-btn.active { background: #1f6feb; border-color: #58a6ff; color: #fff; }
            #me-sidebar .me-tool-row { display: flex; flex-wrap: wrap; gap: 4px; }
            #me-sidebar .me-tool-row .me-btn { flex: 0 0 auto; min-width: 70px; text-align: center; }
            #me-sidebar .me-swatch {
                width: 32px; height: 32px; border-radius: 4px; cursor: pointer;
                border: 2px solid transparent; display: inline-block; margin: 2px;
            }
            #me-sidebar .me-swatch.active { border-color: #fff; }
            #me-sidebar .me-swatch-row { display: flex; gap: 6px; flex-wrap: wrap; }
            #me-sidebar .me-info { font-size: 11px; color: #888; }
            #me-sidebar .me-toggle { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
            #me-sidebar .me-toggle input { margin: 0; }
        `;
        document.head.appendChild(css);
    }

    _build() {
        const root = document.createElement('div');
        root.id = 'me-sidebar';
        root.innerHTML = `
            <div class="me-section">
                <div class="me-label">MAP EDITOR</div>
                <input id="me-map-name" class="me-input" value="map" placeholder="map name">
                <div class="me-row" style="margin-top:8px">
                    <label>Tamaño</label>
                    <input id="me-arena-w" class="me-input me-input-sm" type="number" value="4000" min="200" max="20000" step="100">
                    <span>×</span>
                    <input id="me-arena-h" class="me-input me-input-sm" type="number" value="4000" min="200" max="20000" step="100">
                </div>
            </div>

            <div class="me-section">
                <div class="me-label">HERRAMIENTAS</div>
                <div class="me-tool-row" id="me-tools"></div>
            </div>

            <div class="me-section" id="me-zone-section">
                <div class="me-label">ZONE TYPE</div>
                <select class="me-select" id="me-zone-type"></select>
                <div class="me-row" style="margin-top:4px">
                    <span class="me-info" id="me-zone-color-preview" style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#800080;vertical-align:middle;"></span>
                    <span class="me-info" id="me-zone-color-label">#800080</span>
                </div>
            </div>

            <div class="me-section" id="me-wall-section">
                <div class="me-label">WALL</div>
                <div class="me-row">
                    <span class="me-info" style="min-width:45px;">HP</span>
                    <input id="me-wall-hp" class="me-input me-input-sm" type="number" value="300" min="1" step="50">
                </div>
                <div class="me-row" id="me-poly-sides-row" style="margin-top:4px;display:none">
                    <span class="me-info" style="min-width:45px;">Sides</span>
                    <input id="me-poly-sides" class="me-input me-input-sm" type="number" value="4" min="3" max="32" step="1">
                </div>
                <div class="me-row" style="margin-top:4px">
                    <span class="me-info" style="min-width:45px;">Color</span>
                    <span class="me-swatch" id="me-wall-color" style="background:#000000;width:24px;height:24px;" title="Wall color"></span>
                </div>
            </div>

            <div class="me-section">
                <div class="me-label">COLOR PALETTE</div>
                <div class="me-swatch-row" id="me-swatches"></div>
            </div>

            <div class="me-section">
                <div class="me-label">SNAP</div>
                <div class="me-toggle">
                    <input type="checkbox" id="me-snap-endpoints" checked>
                    <label for="me-snap-endpoints">Endpoints</label>
                </div>
                <div class="me-toggle">
                    <input type="checkbox" id="me-snap-grid" checked>
                    <label for="me-snap-grid">Grid</label>
                    <input id="me-grid-size" class="me-input me-input-sm" type="number" value="20" min="5" max="200" step="5">
                </div>
            </div>

            <div class="me-section">
                <div class="me-label">SELECTION</div>
                <div id="me-sel-info" class="me-info">Nothing selected</div>
                <div class="me-row" style="margin-top:6px">
                    <button class="me-btn" id="me-calibrate">⟂ Calibrate</button>
                    <button class="me-btn" id="me-delete-sel" style="background:#552222;color:#ff8888;">🗑 Delete</button>
                </div>
            </div>

            <div class="me-section">
                <div class="me-label">BACKGROUND</div>
                <div class="me-row">
                    <button class="me-btn" id="me-load-bg">🖼 Load Image</button>
                    <button class="me-btn" id="me-remove-bg" style="background:#552222;color:#ff8888;">✕ Remove</button>
                </div>
                <div class="me-row" style="margin-top:4px">
                    <span class="me-info" style="min-width:45px;">Opacity</span>
                    <input id="me-bg-opacity" class="me-input me-input-sm" type="range" min="0" max="1" step="0.05" value="1" style="flex:1">
                    <span id="me-bg-opacity-val" class="me-info" style="width:28px">100%</span>
                </div>
                <div id="me-bg-info" class="me-info" style="margin-top:4px">None</div>
            </div>

            <div class="me-section" style="border-bottom:none">
                <div class="me-row" style="margin-bottom:6px">
                    <button class="me-btn" id="me-new">✦ New</button>
                    <button class="me-btn" id="me-load">📂 Load</button>
                </div>
                <div class="me-row" style="margin-bottom:6px">
                    <button class="me-btn" id="me-save" style="background:#1a6b1a;border-color:#2ea02e;">💾 Save</button>
                    <button class="me-btn" id="me-export">📤 Export</button>
                </div>
                <button class="me-btn" id="me-exit" style="width:100%;background:#552222;color:#ff8888;">✕ Exit</button>
            </div>

            <input type="file" id="me-file-input" accept=".json" style="display:none">
            <input type="file" id="me-bg-file-input" accept=".jpg,.jpeg,.png,.webp" style="display:none">
        `;

        document.body.appendChild(root);

        // ── Tool buttons ──
        const toolNames = ['select', 'line', 'polygon', 'zone', 'rotate', 'eraser'];
        const toolLabels = { select: '[S] Select', line: '[L] Line', polygon: '[P] Polygon', zone: '[Z] Zone', rotate: '[R] Rotate', eraser: '[E] Erase' };
        const toolsDiv = document.getElementById('me-tools');
        toolNames.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'me-btn';
            btn.textContent = toolLabels[t];
            btn.dataset.tool = t;
            btn.addEventListener('click', () => this.scene.setTool(t));
            toolsDiv.appendChild(btn);
        });

        // ── Zone type dropdown (primary — drives color for zones) ──
        const sel = document.getElementById('me-zone-type');
        ZONE_TYPES.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            sel.appendChild(opt);
        });
        sel.value = 'void';
        sel.addEventListener('change', () => {
            this.scene.activeZoneType = sel.value;
            const color = ZONE_COLORS[sel.value] || '#800080';
            this.scene.activeColor = color;
            document.getElementById('me-zone-color-preview').style.background = color;
            document.getElementById('me-zone-color-label').textContent = color;
            this._updateSwatches();
        });

        // ── Color swatches (palette — sets activeColor, zone type follows if it's a zone color) ──
        const swatchesDiv = document.getElementById('me-swatches');
        COLORS.forEach((c, i) => {
            const span = document.createElement('span');
            span.className = 'me-swatch';
            span.style.backgroundColor = c.color;
            if (c.color === '#ffffff') span.style.border = '1px solid #555';
            span.title = c.label;
            span.addEventListener('click', () => {
                this.scene.activeColor = c.color;
                // If it's a zone color, also set the zone type to match
                if (c.label !== 'Walls') {
                    const type = c.label === 'Void' ? 'void'
                        : c.label === 'Damage' ? 'damage_zone'
                        : c.label === 'Slow' ? 'slow_zone'
                        : c.label === 'Shop' ? 'shop'
                        : 'trap';
                    this.scene.activeZoneType = type;
                    sel.value = type;
                    document.getElementById('me-zone-color-preview').style.background = c.color;
                    document.getElementById('me-zone-color-label').textContent = c.color;
                }
                this._updateSwatches();
            });
            swatchesDiv.appendChild(span);
        });
        this._updateSwatches();

        // ── HP input ──
        const hpInput = document.getElementById('me-wall-hp');
        hpInput.addEventListener('input', () => {
            this.scene.activeHP = parseInt(hpInput.value) || 300;
        });

        // ── Polygon sides ──
        const sidesInput = document.getElementById('me-poly-sides');
        sidesInput.addEventListener('input', () => {
            this.scene.polygonSides = parseInt(sidesInput.value) || 4;
        });

        // ── Snap toggles ──
        document.getElementById('me-snap-endpoints').addEventListener('change', (e) => {
            this.scene.snap.enableEndpoints = e.target.checked;
        });
        document.getElementById('me-snap-grid').addEventListener('change', (e) => {
            this.scene.snap.enableGrid = e.target.checked;
        });
        document.getElementById('me-grid-size').addEventListener('input', (e) => {
            this.scene.snap.gridSize = parseInt(e.target.value) || 20;
        });

        // ── Calibrate ──
        document.getElementById('me-calibrate').addEventListener('click', () => {
            const count = this.scene.snap.calibrateSelection(this.scene.mapData);
            console.log(`Calibrated ${count} walls`);
        });

        // ── Delete selected ──
        document.getElementById('me-delete-sel').addEventListener('click', () => {
            this.scene.currentTool.onKeyDown('Delete');
        });

        // ── Background image ──
        document.getElementById('me-load-bg').addEventListener('click', () => {
            document.getElementById('me-bg-file-input').click();
        });
        document.getElementById('me-bg-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            this.scene.loadBackgroundImage(url, file.name);
            this.scene.mapData.background = file.name;
            document.getElementById('me-bg-info').textContent = file.name;
            e.target.value = '';
        });
        document.getElementById('me-remove-bg').addEventListener('click', () => {
            this.scene.removeBackgroundImage();
            this.scene.mapData.background = null;
            document.getElementById('me-bg-info').textContent = 'None';
        });

        // ── Background opacity ──
        document.getElementById('me-bg-opacity').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('me-bg-opacity-val').textContent = Math.round(val * 100) + '%';
            if (this.scene._bgImage) {
                this.scene._bgImage.setAlpha(val);
            }
        });

        // ── New ──
        document.getElementById('me-new').addEventListener('click', () => {
            if (confirm('Start a new map? All unsaved changes will be lost.')) {
                this.scene.mapData = new (this.scene.mapData.constructor)();
                this.scene.mapData.arena.w = parseInt(document.getElementById('me-arena-w').value) || 4000;
                this.scene.mapData.arena.h = parseInt(document.getElementById('me-arena-h').value) || 4000;
                this.scene.history = new (this.scene.history.constructor)();
                this.scene._rebindTools();
                this.scene.currentTool = this.scene.tools.select;
                this.scene.camera3.centerOn(this.scene.mapData.arena.x + this.scene.mapData.arena.w / 2, this.scene.mapData.arena.y + this.scene.mapData.arena.h / 2);
                this.scene.removeBackgroundImage();
                document.getElementById('me-bg-info').textContent = 'None';
                this._updateToolButtons();
                this._updateSelectionInfo();
            }
        });

        // ── Load ──
        document.getElementById('me-load').addEventListener('click', () => {
            document.getElementById('me-file-input').click();
        });
        document.getElementById('me-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const json = JSON.parse(ev.target.result);
                    this.scene.mapData = new (this.scene.mapData.constructor)();
                    this.scene.mapData.fromMapDataJSON(json);
                    this.scene.history = new (this.scene.history.constructor)();
                    this.scene._rebindTools();
                    this.scene.currentTool = this.scene.tools.select;
                    const name = file.name.replace('.json', '');
                    document.getElementById('me-map-name').value = name;
                    document.getElementById('me-arena-w').value = this.scene.mapData.arena.w;
                    document.getElementById('me-arena-h').value = this.scene.mapData.arena.h;
                    this.scene.camera3.centerOn(this.scene.mapData.arena.x + this.scene.mapData.arena.w / 2, this.scene.mapData.arena.y + this.scene.mapData.arena.h / 2);
                    // Restore background if map has one
                    const bgFile = this.scene.mapData.background;
                    if (bgFile) {
                        document.getElementById('me-bg-info').textContent = bgFile;
                        this.scene.loadBackgroundImage(`assets/maps/backgrounds/${bgFile}`, bgFile);
                    } else {
                        document.getElementById('me-bg-info').textContent = 'None';
                    }
                    this._updateToolButtons();
                    console.log('Map loaded:', name);
                } catch (err) {
                    console.error('Failed to load map:', err);
                    alert('Invalid JSON file');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        // ── Save (downloads JSON) ──
        document.getElementById('me-save').addEventListener('click', () => this._saveMap());

        // ── Export (also downloads, same as save for now) ──
        document.getElementById('me-export').addEventListener('click', () => this._saveMap());

        // ── Exit ──
        document.getElementById('me-exit').addEventListener('click', () => {
            this.scene.scene.start('MainMenu');
        });

        // ── Map name ──
        document.getElementById('me-map-name').addEventListener('input', (e) => {
            this.scene.mapName = e.target.value || 'map';
        });

        // ── Arena size ──
        const arenaW = document.getElementById('me-arena-w');
        const arenaH = document.getElementById('me-arena-h');
        const updateArena = () => {
            this.scene.mapData.arena.w = parseInt(arenaW.value) || 4000;
            this.scene.mapData.arena.h = parseInt(arenaH.value) || 4000;
        };
        arenaW.addEventListener('input', updateArena);
        arenaH.addEventListener('input', updateArena);

        this._root = root;
    }

    _saveMap() {
        const data = this.scene.mapData.toMapDataJSON();
        const mapName = document.getElementById('me-map-name').value || 'map';
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = mapName + '.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    _updateSwatches() {
        const swatches = document.querySelectorAll('#me-swatches .me-swatch');
        swatches.forEach(s => {
            s.classList.toggle('active', s.style.backgroundColor === this.scene.activeColor
                || this._colorsMatch(s.style.backgroundColor, this.scene.activeColor));
        });

        const toolName = this._getCurrentToolName();
        const isLineTool = toolName === 'line';
        const isPolyTool = toolName === 'polygon';
        const isWallTool = isLineTool || isPolyTool;
        const isZoneTool = toolName === 'zone';

        // Show/hide sections based on active tool
        document.getElementById('me-zone-section').style.display = isZoneTool ? 'block' : 'none';
        document.getElementById('me-wall-section').style.display = isWallTool ? 'block' : 'none';
        document.getElementById('me-poly-sides-row').style.display = (isPolyTool || isZoneTool) ? 'flex' : 'none';
    }

    _colorsMatch(c1, c2) {
        return c1.toLowerCase() === c2.toLowerCase();
    }

    _updateToolButtons() {
        const btns = document.querySelectorAll('#me-tools .me-btn');
        const currentName = this._getCurrentToolName();
        btns.forEach(b => {
            b.classList.toggle('active', b.dataset.tool === currentName);
        });

        // Update cursor
        const cursor = this.scene.currentTool.getCursor ? this.scene.currentTool.getCursor() : 'default';
        document.getElementById('me-sidebar').style.cursor = cursor;

        this._updateSelectionInfo();
        this._updateSwatches();
    }

    _getCurrentToolName() {
        for (const [name, tool] of Object.entries(this.scene.tools)) {
            if (tool === this.scene.currentTool) return name;
        }
        return 'select';
    }

    _updateSelectionInfo() {
        const info = document.getElementById('me-sel-info');
        if (!info) return;
        const sel = this.scene.mapData.selection;
        const wc = sel.walls.size;
        const zc = sel.zones.size;
        if (wc === 0 && zc === 0) {
            info.textContent = 'Nothing selected';
        } else {
            const parts = [];
            if (wc > 0) parts.push(`${wc} wall${wc > 1 ? 's' : ''}`);
            if (zc > 0) parts.push(`${zc} zone${zc > 1 ? 's' : ''}`);
            info.textContent = parts.join(', ');
        }
    }

    destroy() {
        if (this._root) {
            this._root.remove();
            this._root = null;
        }
    }
}
