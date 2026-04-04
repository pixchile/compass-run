import { W, DASH_CD } from '../constants.js';

export default class DashIndicator {
  constructor(scene) {
    this.scene = scene;
  }
  
  render(graphics, player) {
    if (player.dashCD > 0 || player.dashing) {
      const cdX = W / 2 - 60;
      const cdY = 0; // La Y la calculamos dinámicamente porque depende de la barra de momentum
      const fill = player.dashing ? 1 : 1 - (player.dashCD / DASH_CD);
      
      graphics.fillStyle(0x0d111e, 0.9);
      graphics.fillRect(cdX, cdY, 120, 7);
      graphics.fillStyle(player.dashing ? 0xffffff : 0xff8833, 0.85);
      graphics.fillRect(cdX, cdY, 120 * fill, 7);
      graphics.lineStyle(1, 0x334455, 1);
      graphics.strokeRect(cdX, cdY, 120, 7);
    }
  }
}