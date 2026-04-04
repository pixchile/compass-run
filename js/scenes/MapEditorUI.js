import { W, H } from '../constants.js';

export default class MapEditorUI {
  constructor(editor) {
    this.editor = editor;
    this.infoText = null;
    this.modeText = null;
    this.thicknessText = null;
  }

  // ─── TEXTOS PERSISTENTES ────────────────────────────────────────────────

  createUI() {
    this.infoText = this.editor.add.text(10, 10, '', {
      fontSize: '14px', fill: '#fff',
      backgroundColor: '#000000aa',
      padding: { x: 10, y: 5 }
    });
    this.updateInfoText();
  }

  updateInfoText() {
    const e = this.editor;
    const mm = Math.floor(e.timeLimit / 60);
    const ss = (e.timeLimit % 60).toString().padStart(2, '0');
    this.infoText.setText(
      `MAPA: ${e.currentMap.name || 'Sin nombre'}\n` +
      `TIEMPO: ${mm}:${ss}\n` +
      `MUROS: ${e.lines.length} líneas\n` +
      `ENEMIGOS: ${e.enemies.length}\n` +
      `MODO: ${e.mode.toUpperCase()}\n` +
      `GROSOR: ${e.lineThickness}px\n\n` +
      `[G] Grid | [S] Guardar | [L] Cargar\n` +
      `[D] Dibujar | [E] Editar | [R] Borrar | [N] Enemigo\n` +
      `[T] Tiempo límite | [ESC] Salir\n` +
      `[+] / [-] Grosor línea\n\n` +
      `ENEMIGO: Click para agregar | Click sobre enemigo para editar/eliminar`
    );
  }

  updateModeText() {
    if (this.modeText) this.modeText.destroy();
    const colors = { draw: '#44ff88', edit: '#ffaa44', erase: '#ff4444', enemy: '#ff66ff' };
    this.modeText = this.editor.add.text(W - 10, 10, `MODO: ${this.editor.mode.toUpperCase()}`, {
      fontSize: '18px', fill: colors[this.editor.mode] || '#fff',
      backgroundColor: '#000000aa', padding: { x: 10, y: 5 }
    }).setOrigin(1, 0);
  }

  updateThicknessText() {
    if (this.thicknessText) this.thicknessText.destroy();
    this.thicknessText = this.editor.add.text(W - 10, 50, `GROSOR: ${this.editor.lineThickness}px`, {
      fontSize: '14px', fill: '#ffaa44',
      backgroundColor: '#000000aa', padding: { x: 10, y: 5 }
    }).setOrigin(1, 0);
  }

  // ─── PANEL: TIEMPO LÍMITE ────────────────────────────────────────────────

  editTimeLimit() {
    const e = this.editor;
    const panel = e.add.rectangle(W/2, H/2, 300, 150, 0x000000, 0.95).setDepth(1000);
    const title = e.add.text(W/2, H/2 - 50, 'TIEMPO LÍMITE (minutos)', {
      fontSize: '16px', fill: '#fff'
    }).setOrigin(0.5).setDepth(1001);

    const input = document.createElement('input');
    Object.assign(input, { type: 'number', value: Math.floor(e.timeLimit / 60), min: 1, max: 60 });
    Object.assign(input.style, {
      position: 'absolute', left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)', padding: '10px',
      fontSize: '16px', width: '100px', textAlign: 'center'
    });
    document.body.appendChild(input);
    input.focus();

    const confirmBtn = e.add.text(W/2, H/2 + 30, 'CONFIRMAR', {
      fontSize: '14px', fill: '#44ff88',
      backgroundColor: '#000000aa', padding: { x: 20, y: 5 }
    }).setOrigin(0.5).setInteractive().setDepth(1001);

    confirmBtn.on('pointerdown', () => {
      const minutes = parseInt(input.value);
      if (!isNaN(minutes) && minutes >= 1 && minutes <= 60) {
        e.timeLimit = minutes * 60;
        this.updateInfoText();
        this.showNotification(`Tiempo límite: ${minutes} minutos`, 0x44ff88);
      }
      input.remove();
      panel.destroy(); title.destroy(); confirmBtn.destroy();
    });
  }

  // ─── PANEL: ENEMIGO ──────────────────────────────────────────────────────

  editEnemy(index) {
    const enemy = this.editor.enemies[index];
    this.createEnemyPanel(enemy.x, enemy.y, index);
  }

  createEnemyPanel(x, y, editIndex) {
    const e = this.editor;
    const isEditing = editIndex !== null;
    const enemy = isEditing ? e.enemies[editIndex] : null;

    const panel = e.add.rectangle(W/2, H/2, 300, 250, 0x000000, 0.95).setDepth(1000);
    const title = e.add.text(W/2, H/2 - 100, isEditing ? 'EDITAR ENEMIGO' : 'NUEVO ENEMIGO', {
      fontSize: '18px', fill: '#fff'
    }).setOrigin(0.5).setDepth(1001);

    e.add.text(W/2 - 80, H/2 - 50, 'TIPO:', { fontSize: '14px', fill: '#aaa' }).setDepth(1001);

    const types = ['small', 'medium', 'big'];
    const typeNames = ['Small', 'Medium', 'Big'];
    const typeColors = ['#ff6666', '#ff4444', '#aa2222'];
    let selectedType = isEditing ? enemy.type : 'small';
    const typeButtons = [];
    let typeX = W/2 - 60;

    types.forEach((t, i) => {
      const btn = e.add.text(typeX, H/2 - 50, typeNames[i], {
        fontSize: '12px',
        fill: selectedType === t ? '#ffffff' : typeColors[i],
        backgroundColor: selectedType === t ? typeColors[i] : '#000000aa',
        padding: { x: 8, y: 3 }
      }).setInteractive().setDepth(1001);

      btn.on('pointerdown', () => {
        selectedType = t;
        typeButtons.forEach(b => {
          b.setFill(types[b.userData] === t ? '#ffffff' : typeColors[b.userData]);
          b.setBackgroundColor(types[b.userData] === t ? typeColors[b.userData] : '#000000aa');
        });
      });
      btn.userData = i;
      typeButtons.push(btn);
      typeX += 70;
    });

    e.add.text(W/2 - 80, H/2, 'APARECE EN (segundos):', { fontSize: '12px', fill: '#aaa' }).setDepth(1001);

    const timeInput = document.createElement('input');
    Object.assign(timeInput, { type: 'number', value: isEditing ? enemy.spawnTime : 0, min: 0, max: e.timeLimit, step: 1 });
    Object.assign(timeInput.style, {
      position: 'absolute', left: '50%', top: `${H/2 + 20}px`,
      transform: 'translateX(-50%)', padding: '5px',
      fontSize: '14px', width: '80px', textAlign: 'center'
    });
    document.body.appendChild(timeInput);
    timeInput.focus();

    const confirmBtn = e.add.text(W/2 - 60, H/2 + 70, 'GUARDAR', {
      fontSize: '14px', fill: '#44ff88',
      backgroundColor: '#000000aa', padding: { x: 15, y: 5 }
    }).setInteractive().setDepth(1001);

    const deleteBtn = isEditing ? e.add.text(W/2 + 60, H/2 + 70, 'ELIMINAR', {
      fontSize: '14px', fill: '#ff4444',
      backgroundColor: '#000000aa', padding: { x: 15, y: 5 }
    }).setInteractive().setDepth(1001) : null;

    const cancelBtn = e.add.text(W/2, H/2 + 110, 'CANCELAR', {
      fontSize: '12px', fill: '#ff8888',
      backgroundColor: '#000000aa', padding: { x: 15, y: 3 }
    }).setInteractive().setDepth(1001);

    const cleanup = () => this.cleanupPanel(panel, title, typeButtons, timeInput, confirmBtn, deleteBtn, cancelBtn);

    confirmBtn.on('pointerdown', () => {
      const spawnTime = parseInt(timeInput.value);
      if (!isNaN(spawnTime) && spawnTime >= 0 && spawnTime <= e.timeLimit) {
        if (isEditing) {
          e.enemies[editIndex] = { ...e.enemies[editIndex], type: selectedType, spawnTime };
          this.showNotification('Enemigo actualizado', 0x44ff88);
        } else {
          e.enemies.push({ type: selectedType, x, y, spawnTime });
          this.showNotification('Enemigo añadido', 0x44ff88);
        }
        this.updateInfoText();
        cleanup();
      } else {
        this.showNotification('Tiempo inválido', 0xff4444);
      }
    });

    if (deleteBtn) {
      deleteBtn.on('pointerdown', () => {
        e.enemies.splice(editIndex, 1);
        this.updateInfoText();
        this.showNotification('Enemigo eliminado', 0xff4444);
        cleanup();
      });
    }

    cancelBtn.on('pointerdown', cleanup);
  }

  cleanupPanel(panel, title, typeButtons, timeInput, confirmBtn, deleteBtn, cancelBtn) {
    panel.destroy(); title.destroy();
    typeButtons.forEach(b => b.destroy());
    if (timeInput) timeInput.remove();
    confirmBtn.destroy();
    if (deleteBtn) deleteBtn.destroy();
    cancelBtn.destroy();
  }

  // ─── PANEL: SELECTOR DE MAPA ─────────────────────────────────────────────

  createMapSelector(maps) {
    const e = this.editor;
    const panel = e.add.rectangle(W/2, H/2, 450, 350, 0x000000, 0.9).setDepth(1000);
    const title = e.add.text(W/2, H/2 - 140, 'Seleccionar Mapa', {
      fontSize: '24px', fill: '#fff'
    }).setOrigin(0.5).setDepth(1001);

    const buttons = [];
    let y = H/2 - 100;

    maps.forEach(map => {
      const mm = Math.floor(map.timeLimit / 60);
      const ss = (map.timeLimit % 60).toString().padStart(2, '0');
      const btn = e.add.text(W/2, y,
        `${map.name} (${map.lines} líneas, ${map.enemies} enemigos, ${mm}:${ss})`, {
        fontSize: '14px', fill: '#ffaa44',
        backgroundColor: '#000000aa', padding: { x: 10, y: 5 }
      }).setOrigin(0.5).setInteractive().setDepth(1001);

      btn.on('pointerdown', () => {
        e.currentMap = e.mapLoader.loadMap(map.name);
        e.lines   = [...(e.currentMap.lines   || [])];
        e.enemies = [...(e.currentMap.enemies || [])];
        e.timeLimit = e.currentMap.timeLimit || 300;
        this.updateInfoText();
        panel.destroy(); title.destroy();
        buttons.forEach(b => b.destroy());
        closeBtn.destroy();
        this.showNotification(`Cargado: ${map.name}`, 0x44ff88);
      });

      buttons.push(btn);
      y += 35;
    });

    const closeBtn = e.add.text(W/2, H/2 + 130, 'Cerrar', {
      fontSize: '14px', fill: '#ff4444',
      backgroundColor: '#000000aa', padding: { x: 20, y: 5 }
    }).setOrigin(0.5).setInteractive().setDepth(1001);

    closeBtn.on('pointerdown', () => {
      panel.destroy(); title.destroy(); closeBtn.destroy();
      buttons.forEach(b => b.destroy());
    });
  }

  // ─── NOTIFICACIÓN ────────────────────────────────────────────────────────

  showNotification(msg, color) {
    const text = this.editor.add.text(W/2, H/2, msg, {
      fontSize: '24px', fill: `#${color.toString(16)}`,
      backgroundColor: '#000000aa', padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(2000);
    this.editor.time.delayedCall(2000, () => text.destroy());
  }
}
