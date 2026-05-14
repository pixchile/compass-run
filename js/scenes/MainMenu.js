import { W, H } from '../constants.js';

export default class MainMenu extends Phaser.Scene {
  constructor() {
    super('MainMenu');
    this._view = 'main'; // 'main' | 'stages'
    this._stageIndex = 0;
    this._stageItems = [];
    this._keys = {};
    this._mainItems = [];
    this._mainIndex = 0;
  }

  create() {
    this._view = 'main';
    this._mainIndex = 0;
    this._stageIndex = 0;
    this._stageItems = [];
    this._mainItems = [];
    this._container = this.add.container(0, 0);

    this._keys = {
      up:    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      enter: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      esc:   this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };
    this._prevUp = false;
    this._prevDown = false;
    this._prevEnter = false;
    this._prevEsc = false;

    this._buildMain();
  }

  _clear() {
    this._container.removeAll(true);
    this._mainItems = [];
    this._stageItems = [];
  }

  _buildMain() {
    this._clear();
    this._view = 'main';
    const cx = W / 2;
    const cy = H / 2;

    const title = this.add.text(cx, cy - 120, 'COMPASS RUN', {
      fontSize: '48px', fill: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5);

    const sub = this.add.text(cx, cy - 65, 'Momentum-based Arena Game', {
      fontSize: '18px', fill: '#888'
    }).setOrigin(0.5);

    const hint = this.add.text(cx, H - 30, 'WASD / Gamepad · SPACE / A para navegar', {
      fontSize: '12px', fill: '#555'
    }).setOrigin(0.5);

    this._container.add([title, sub, hint]);

    // Toggle: permitir items duplicados
    const allowDupes = localStorage.getItem('cr_allow_duplicates') === 'true';
    this._dupeToggle = allowDupes;
    const toggleLabel = () => `Items duplicados: ${this._dupeToggle ? '[ ON ]' : '[ OFF ]'}`;
    const toggleColor = () => this._dupeToggle ? '#ffaa22' : '#446688';
    this._toggleBtn = this.add.text(cx, cy - 155, toggleLabel(), {
      fontSize: '13px', fill: toggleColor(),
      backgroundColor: '#111111cc', padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setInteractive();
    this._toggleBtn.on('pointerdown', () => {
      this._dupeToggle = !this._dupeToggle;
      localStorage.setItem('cr_allow_duplicates', String(this._dupeToggle));
      this._toggleBtn.setText(toggleLabel());
      this._toggleBtn.setStyle({ fill: toggleColor() });
    });
    this._container.add(this._toggleBtn);

    const options = [
      { label: '▶  JUGAR',             color: '#44ff88', action: () => this._buildStageSelect() },
      { label: '⚙  EDITOR DE STAGES',  color: '#4488ff', action: () => this.scene.start('StageEditor') },
      { label: '📥  IMPORTAR STAGE',    color: '#ff8844', action: () => this._importStage() },
    ];

    options.forEach((opt, i) => {
      const y = cy - 10 + i * 70;
      const btn = this.add.text(cx, y, opt.label, {
        fontSize: '24px', fill: opt.color,
        backgroundColor: '#111111cc',
        padding: { x: 28, y: 12 }
      }).setOrigin(0.5).setInteractive();

      btn.on('pointerover', () => { this._mainIndex = i; this._refreshMain(); });
      btn.on('pointerdown', () => opt.action());
      btn._baseColor = opt.color;
      btn._action = opt.action;
      this._mainItems.push(btn);
      this._container.add(btn);
    });

    this._refreshMain();
  }

  _refreshMain() {
    this._mainItems.forEach((btn, i) => {
      const selected = i === this._mainIndex;
      btn.setStyle({ fill: selected ? '#ffffff' : btn._baseColor });
      btn.setScale(selected ? 1.06 : 1.0);
    });
  }

  _buildStageSelect() {
    this._clear();
    this._view = 'stages';
    this._stageIndex = 0;
    const cx = W / 2;

    const title = this.add.text(cx, 60, 'SELECCIONAR STAGE', {
      fontSize: '28px', fill: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5);

    const back = this.add.text(cx, H - 40, '← ESC para volver', {
      fontSize: '13px', fill: '#555'
    }).setOrigin(0.5);

    this._container.add([title, back]);

    // Cargar stages de localStorage
    const saved = JSON.parse(localStorage.getItem('cr_stages') || '[]');

    // Stage por defecto siempre disponible
    const stages = [
      { label: 'DEFAULT', mapName: 'default', stageName: null },
      ...saved.map(s => ({ label: s.name.toUpperCase(), mapName: s.svgName?.replace('.svg','') || 'default', stageName: s.name }))
    ];

    const startY = 130;
    const spacing = 58;

    stages.forEach((stage, i) => {
      const y = startY + i * spacing;
      const sub = stage.stageName
        ? this.add.text(cx, y + 18, `mapa: ${stage.mapName}`, { fontSize: '12px', fill: '#555' }).setOrigin(0.5)
        : this.add.text(cx, y + 18, 'stage por defecto', { fontSize: '12px', fill: '#555' }).setOrigin(0.5);

      const btn = this.add.text(cx, y, stage.label, {
        fontSize: '22px', fill: '#44ff88',
        backgroundColor: '#111111cc',
        padding: { x: 24, y: 10 }
      }).setOrigin(0.5).setInteractive();

      btn.on('pointerover', () => { this._stageIndex = i; this._refreshStages(); });
      btn.on('pointerdown', () => this._launchStage(stage));
      btn._stage = stage;
      this._stageItems.push(btn);
      this._container.add([btn, sub]);
    });

    this._refreshStages();
  }

  _refreshStages() {
    this._stageItems.forEach((btn, i) => {
      const selected = i === this._stageIndex;
      btn.setStyle({ fill: selected ? '#ffffff' : '#44ff88' });
      btn.setScale(selected ? 1.06 : 1.0);
    });
  }

  _importStage() {
    let input = document.getElementById('cr-import-file');
    if (!input) {
      input = document.createElement('input');
      input.id = 'cr-import-file';
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';
      input.addEventListener('change', (ev) => {
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const stage = JSON.parse(e.target.result);
            if (!stage.name || !stage.svgContent) {
              alert('Invalid file: missing name or svgContent');
              return;
            }
            const saved = JSON.parse(localStorage.getItem('cr_stages') || '[]');
            const idx = saved.findIndex(s => s.name === stage.name);
            if (idx !== -1) {
              if (!confirm(`Stage "${stage.name}" already exists. Overwrite?`)) return;
              saved[idx] = stage;
            } else {
              saved.push(stage);
            }
            localStorage.setItem('cr_stages', JSON.stringify(saved));
            alert(`Stage "${stage.name}" imported successfully!`);
          } catch {
            alert('Error reading JSON file');
          }
        };
        reader.readAsText(file);
        ev.target.value = '';
      });
      document.body.appendChild(input);
    }
    input.click();
  }

  _launchStage(stage) {
    this.scene.start('Game', {
      mapName: stage.mapName,
      stageName: stage.stageName
    });
  }

  update() {
    // Gamepad polling
    let gpUp = false, gpDown = false, gpEnter = false, gpEsc = false;
    const gamepads = navigator.getGamepads();
    if (gamepads) {
      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (!gp) continue;
        const stickY = gp.axes[1] || 0;
        const dpadY = (gp.buttons[12]?.pressed ? 1 : 0) - (gp.buttons[13]?.pressed ? 1 : 0);
        gpUp    = stickY < -0.3 || dpadY < 0;
        gpDown  = stickY > 0.3  || dpadY > 0;
        gpEnter = gp.buttons[0]?.pressed || false;  // A
        gpEsc   = gp.buttons[1]?.pressed || false;  // B
        break;
      }
    }

    const up    = this._keys.up.isDown    || gpUp;
    const down  = this._keys.down.isDown  || gpDown;
    const enter = this._keys.enter.isDown || gpEnter;
    const esc   = this._keys.esc.isDown   || gpEsc;

    if (this._view === 'main') {
      if (up && !this._prevUp) {
        this._mainIndex = (this._mainIndex - 1 + this._mainItems.length) % this._mainItems.length;
        this._refreshMain();
      }
      if (down && !this._prevDown) {
        this._mainIndex = (this._mainIndex + 1) % this._mainItems.length;
        this._refreshMain();
      }
      if (enter && !this._prevEnter && this._mainItems[this._mainIndex]) {
        this._mainItems[this._mainIndex]._action();
      }
    } else if (this._view === 'stages') {
      if (up && !this._prevUp) {
        this._stageIndex = (this._stageIndex - 1 + this._stageItems.length) % this._stageItems.length;
        this._refreshStages();
      }
      if (down && !this._prevDown) {
        this._stageIndex = (this._stageIndex + 1) % this._stageItems.length;
        this._refreshStages();
      }
      if (enter && !this._prevEnter && this._stageItems[this._stageIndex]) {
        this._launchStage(this._stageItems[this._stageIndex]._stage);
      }
      if (esc && !this._prevEsc) {
        this._buildMain();
      }
    }

    this._prevUp    = up;
    this._prevDown  = down;
    this._prevEnter = enter;
    this._prevEsc   = esc;
  }
}
