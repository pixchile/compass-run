import { W, H } from '../constants.js';

export default class MainMenu extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    const centerX = W / 2;
    const centerY = H / 2;

    // Título
    this.add.text(centerX, centerY - 100, 'COMPASS RUN', {
      fontSize: '48px',
      fill: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(centerX, centerY - 50, 'Momentum-based Arena Game', {
      fontSize: '18px',
      fill: '#aaa',
    }).setOrigin(0.5);

    // Botones
    const playBtn = this.add.text(centerX, centerY + 20, '▶ JUGAR', {
      fontSize: '24px',
      fill: '#44ff88',
      backgroundColor: '#000000aa',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    const editorBtn = this.add.text(centerX, centerY + 90, '✎ EDITOR DE MAPAS', {
      fontSize: '24px',
      fill: '#ffaa44',
      backgroundColor: '#000000aa',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    const stageBtn = this.add.text(centerX, centerY + 150, '⚙ EDITOR DE STAGES', {
      fontSize: '20px',
      fill: '#4488ff',
      backgroundColor: '#000000aa',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    // Eventos de botones
    playBtn.on('pointerover', () => playBtn.setStyle({ fill: '#ffffff' }));
    playBtn.on('pointerout', () => playBtn.setStyle({ fill: '#44ff88' }));
    playBtn.on('pointerdown', () => {
      this.scene.start('Game', { mapName: 'default' });
    });

    editorBtn.on('pointerover', () => editorBtn.setStyle({ fill: '#ffffff' }));
    editorBtn.on('pointerout', () => editorBtn.setStyle({ fill: '#ffaa44' }));
    editorBtn.on('pointerdown', () => {
      this.scene.start('MapEditor');
    });

    stageBtn.on('pointerover', () => stageBtn.setStyle({ fill: '#ffffff' }));
    stageBtn.on('pointerout', () => stageBtn.setStyle({ fill: '#4488ff' }));
    stageBtn.on('pointerdown', () => {
      this.scene.start('StageEditor');
    });

    // Instrucciones
    this.add.text(centerX, H - 30, 'Use WASD to move | Momentum = Speed + Direction', {
      fontSize: '12px',
      fill: '#666'
    }).setOrigin(0.5);
  }
}