import { W, H } from './constants.js';
import MainMenu from './scenes/MainMenu.js';
import Game from './scenes/Game.js';
import MapEditor from './scenes/MapEditor.js';

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#070910',
  scene: [MainMenu, Game, MapEditor],
  scale: { 
    mode: Phaser.Scale.FIT, 
    autoCenter: Phaser.Scale.CENTER_BOTH, 
    width: W, 
    height: H 
  }
};

new Phaser.Game(config);