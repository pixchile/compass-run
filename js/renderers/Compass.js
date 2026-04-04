import { C, DIRS } from '../constants.js';

export default class Compass {
  constructor(scene) {
    this.scene = scene;
    this.distance = 42;
    this.arrowSize = 18;
  }
  
  render(graphics, player, momentum) {
    if (!player || !momentum) return;
    
    const cx = player.px;
    const cy = player.py;
    
    const cIdx = momentum.cIdx;
    const nextIdx = momentum.nextCIdx;
    
    if (cIdx === undefined || nextIdx === undefined) return;
    
    const cd = DIRS[cIdx];
    const nextCd = DIRS[nextIdx];
    
    if (!cd || !nextCd) return;
    
    // Flecha actual
    const angle = Math.atan2(cd.dy, cd.dx);
    const arrowX = cx + Math.cos(angle) * this.distance;
    const arrowY = cy + Math.sin(angle) * this.distance;
    this.drawArrow(graphics, arrowX, arrowY, angle, 0xffaa44, 0.95);
    
    // Flecha siguiente
    const nextAngle = Math.atan2(nextCd.dy, nextCd.dx);
    const nextArrowX = cx + Math.cos(nextAngle) * this.distance;
    const nextArrowY = cy + Math.sin(nextAngle) * this.distance;
    this.drawArrow(graphics, nextArrowX, nextArrowY, nextAngle, 0x88aaff, 0.45);
  }
  
  drawArrow(graphics, x, y, angle, color, alpha) {
    const size = this.arrowSize;
    const wing = size * 0.55;
    
    const tipX = x + Math.cos(angle) * size;
    const tipY = y + Math.sin(angle) * size;
    
    const leftAngle = angle + Math.PI * 0.75;
    const rightAngle = angle - Math.PI * 0.75;
    
    const leftX = x + Math.cos(leftAngle) * wing;
    const leftY = y + Math.sin(leftAngle) * wing;
    
    const rightX = x + Math.cos(rightAngle) * wing;
    const rightY = y + Math.sin(rightAngle) * wing;
    
    graphics.lineStyle(4, color, alpha);
    graphics.lineBetween(x, y, tipX, tipY);
    
    graphics.fillStyle(color, alpha);
    graphics.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
    
    graphics.fillStyle(0xffffff, 0.3);
    graphics.fillCircle(x, y, 4);
  }
}