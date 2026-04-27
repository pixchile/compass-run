export default class Compass {
  constructor(scene) {
    this.scene = scene;
    this.distance = 42;
    this.arrowSize = 18;

    // Colores actuales interpolados (inicialmente blanco)
    this._currentPrimaryColor = 0xffffff;
    this._targetPrimaryColor = 0xffffff;
    this._currentSecondaryColor = 0xffffff;
    this._targetSecondaryColor = 0xffffff;
  }

  render(graphics, player, compassSystem) {
    if (!player || !compassSystem) return;

    const cx = player.px;
    const cy = player.py;

    const primaryDir = compassSystem.primaryDir;
    const secondaryDir = compassSystem.secondaryDir;
    if (!primaryDir || !secondaryDir) return;

    // Colores objetivo desde el sistema de brújula
    this._targetPrimaryColor = compassSystem.getPrimaryColor();
    this._targetSecondaryColor = compassSystem.getSecondaryColor();

    // Interpolar suavemente (lerp manual de componentes RGB)
    this._currentPrimaryColor = this._lerpColor(
      this._currentPrimaryColor,
      this._targetPrimaryColor,
      0.08
    );
    this._currentSecondaryColor = this._lerpColor(
      this._currentSecondaryColor,
      this._targetSecondaryColor,
      0.08
    );

    // Flecha primaria (tamaño normal)
    const primAngle = Math.atan2(primaryDir.dy, primaryDir.dx);
    const primArrowX = cx + Math.cos(primAngle) * this.distance;
    const primArrowY = cy + Math.sin(primAngle) * this.distance;
    this.drawArrow(graphics, primArrowX, primArrowY, primAngle, this._currentPrimaryColor, 0.95, this.arrowSize);

    // Flecha secundaria (más pequeña)
    const secAngle = Math.atan2(secondaryDir.dy, secondaryDir.dx);
    const secArrowX = cx + Math.cos(secAngle) * this.distance;
    const secArrowY = cy + Math.sin(secAngle) * this.distance;
    this.drawArrow(graphics, secArrowX, secArrowY, secAngle, this._currentSecondaryColor, 0.9, this.arrowSize * 0.65);
  }

  // Interpolación manual entre dos colores enteros (0xRRGGBB)
  _lerpColor(from, to, factor) {
    const r1 = (from >> 16) & 0xff;
    const g1 = (from >> 8) & 0xff;
    const b1 = from & 0xff;
    const r2 = (to >> 16) & 0xff;
    const g2 = (to >> 8) & 0xff;
    const b2 = to & 0xff;
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    return (r << 16) | (g << 8) | b;
  }

  drawArrow(graphics, x, y, angle, color, alpha, size) {
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

    // Punto central
    graphics.fillStyle(0xffffff, 0.3);
    graphics.fillCircle(x, y, 3);
  }
}