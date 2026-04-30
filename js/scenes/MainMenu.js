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

    const hint = this.add.text(cx, H - 30, 'WASD · SPACE para navegar', {
      fontSize: '12px', fill: '#555'
    }).setOrigin(0.5);

    this._container.add([title, sub, hint]);

    const options = [
      { label: '▶  JUGAR',             color: '#44ff88', action: () => this._buildStageSelect() },
      { label: '⚙  EDITOR DE STAGES',  color: '#4488ff', action: () => this.scene.start('StageEditor') },
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

  _launchStage(stage) {
    this.scene.start('Game', {
      mapName: stage.mapName,
      stageName: stage.stageName
    });
  }

  update() {
    const up    = this._keys.up.isDown;
    const down  = this._keys.down.isDown;
    const enter = this._keys.enter.isDown;
    const esc   = this._keys.esc.isDown;

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
