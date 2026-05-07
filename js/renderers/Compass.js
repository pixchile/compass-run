export default class Compass {
  constructor(scene) {
    this.scene = scene;
    this.distance = 42;
    this.arrowSize = 18;

    this._currentPrimaryColor = 0xffffff;
    this._targetPrimaryColor = 0xffffff;
    this._currentSecondaryColor = 0xffffff;
    this._targetSecondaryColor = 0xffffff;

    this._primaryLabel = null;
    this._secondaryLabel = null;
  }

  render(graphics, player, compassSystem, camera) {
    if (!player || !compassSystem) return;

    const cx = player.px;
    const cy = player.py;

    const primaryDir = compassSystem.primaryDir;
    const secondaryDir = compassSystem.secondaryDir;
    if (!primaryDir || !secondaryDir) return;

    this._targetPrimaryColor = compassSystem.getPrimaryColor();
    this._targetSecondaryColor = compassSystem.getSecondaryColor();

    this._currentPrimaryColor = this._lerpColor(
      this._currentPrimaryColor, this._targetPrimaryColor, 0.08
    );
    this._currentSecondaryColor = this._lerpColor(
      this._currentSecondaryColor, this._targetSecondaryColor, 0.08
    );

    const followingPrimary = compassSystem.isFollowingPrimary(player.vx, player.vy);
    const followingSecondary = compassSystem.isFollowingSecondary(player.vx, player.vy);

    const primaryIsSpd = compassSystem.primaryBuff === 'maxSpeed';
    const secondaryIsSpd = compassSystem.secondaryBuff === 'maxSpeed';

    // Flecha primaria
    const primAngle = Math.atan2(primaryDir.dy, primaryDir.dx);
    const primArrowX = cx + Math.cos(primAngle) * this.distance;
    const primArrowY = cy + Math.sin(primAngle) * this.distance;
    const primSize = primaryIsSpd ? this.arrowSize * 1.35 : this.arrowSize;
    const primAlpha = primaryIsSpd ? 1 : 0.95;
    if (primaryIsSpd) this.drawArrowGlow(graphics, primArrowX, primArrowY, primAngle, primSize);
    this.drawArrow(graphics, primArrowX, primArrowY, primAngle, this._currentPrimaryColor, primAlpha, primSize);

    // Flecha secundaria
    const secAngle = Math.atan2(secondaryDir.dy, secondaryDir.dx);
    const secArrowX = cx + Math.cos(secAngle) * this.distance;
    const secArrowY = cy + Math.sin(secAngle) * this.distance;
    const secSize = secondaryIsSpd ? this.arrowSize * 1.35 : this.arrowSize * 0.65;
    const secAlpha = secondaryIsSpd ? 1 : 0.9;
    if (secondaryIsSpd) this.drawArrowGlow(graphics, secArrowX, secArrowY, secAngle, secSize);
    this.drawArrow(graphics, secArrowX, secArrowY, secAngle, this._currentSecondaryColor, secAlpha, secSize);

    // Labels — convert world coords to screen coords so text sticks with arrows
    const labelDist = this.distance + this.arrowSize + 8;
    const primWorldX = cx + Math.cos(primAngle) * labelDist;
    const primWorldY = cy + Math.sin(primAngle) * labelDist;
    const secWorldX = cx + Math.cos(secAngle) * labelDist;
    const secWorldY = cy + Math.sin(secAngle) * labelDist;

    const primScreen = camera ? camera.worldToScreen(primWorldX, primWorldY) : { x: primWorldX, y: primWorldY };
    const secScreen = camera ? camera.worldToScreen(secWorldX, secWorldY) : { x: secWorldX, y: secWorldY };

    const primAccum = compassSystem.primaryAccum;
    const secAccum = compassSystem.secondaryAccum;
    const primLabel = compassSystem.getBuffLabel(compassSystem.primaryBuff);
    const secLabel = compassSystem.getBuffLabel(compassSystem.secondaryBuff);

    this._ensureLabels();
    const primFontSize = primaryIsSpd ? '13px' : this._primarySize;
    const secFontSize = secondaryIsSpd ? '12px' : this._secondarySize;
    this._updateLabel(
      this._primaryLabel, primScreen.x, primScreen.y,
      `${primLabel} +${this._fmtVal(primAccum)}`,
      compassSystem.getPrimaryHex(), followingPrimary, primFontSize
    );
    this._updateLabel(
      this._secondaryLabel, secScreen.x, secScreen.y,
      `${secLabel} +${this._fmtVal(secAccum)}`,
      compassSystem.getSecondaryHex(), followingSecondary, secFontSize
    );
  }

  _fmtVal(v) {
    if (v >= 10) return v.toFixed(0);
    if (v >= 1) return v.toFixed(1);
    return v.toFixed(2);
  }

  _ensureLabels() {
    if (!this._primaryLabel) {
      this._primaryLabel = this.scene.add.text(0, 0, '', {
        fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(50);
      this._primarySize = '11px';
    }
    if (!this._secondaryLabel) {
      this._secondaryLabel = this.scene.add.text(0, 0, '', {
        fontFamily: 'monospace', fontSize: '10px',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(50);
      this._secondarySize = '10px';
    }
  }

  _updateLabel(label, x, y, text, hexColor, active, size) {
    label.setPosition(x, y);
    label.setText(text);
    label.setStyle({ color: hexColor, fontSize: size });
    label.setVisible(active);
  }

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

    graphics.fillStyle(0xffffff, 0.3);
    graphics.fillCircle(x, y, 3);
  }

  drawArrowGlow(graphics, x, y, angle, size) {
    const s = size * 1.2;
    const wing = s * 0.55;
    const tipX = x + Math.cos(angle) * s;
    const tipY = y + Math.sin(angle) * s;
    const leftAngle = angle + Math.PI * 0.75;
    const rightAngle = angle - Math.PI * 0.75;
    const leftX = x + Math.cos(leftAngle) * wing;
    const leftY = y + Math.sin(leftAngle) * wing;
    const rightX = x + Math.cos(rightAngle) * wing;
    const rightY = y + Math.sin(rightAngle) * wing;
    graphics.fillStyle(0xffffff, 0.15);
    graphics.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
  }
}
