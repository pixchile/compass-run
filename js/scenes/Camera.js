import { W, H, ARENA } from '../constants.js';

export default class Camera {
  constructor() {
    // Dimensiones de la vista (pantalla)
    this.viewWidth = W;
    this.viewHeight = H;
    
    // Posición de la cámara en el mundo (centro)
    this.x = W / 2;
    this.y = H / 2;
    
    // Zoom
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.minZoom = 0.3;
    this.maxZoom = 2.0;
    
    // Suavizado
    this.followSmooth = 0.1;
    this.zoomSmooth = 0.15;
    
    // Configuración para el editor
    this.edgeScrollSpeed = 8;
    this.edgeThreshold = 30;
    this.followMouse = true;
    
    // Para el modo juego
    this.followTarget = null;
    this.followSmoothTarget = 0.08;
    
    // Últimos valores
    this.lastTargetX = this.x;
    this.lastTargetY = this.y;
    this.lastTargetZoom = this.zoom;
  }

  updateEditor(pointer) {
    let dx = 0, dy = 0;
    
    const cursors = this.scene?.input?.keyboard?.createCursorKeys();
    if (cursors) {
      if (cursors.left.isDown) dx = -1;
      if (cursors.right.isDown) dx = 1;
      if (cursors.up.isDown) dy = -1;
      if (cursors.down.isDown) dy = 1;
    }
    
    if (dx === 0 && dy === 0 && pointer && this.edgeThreshold > 0) {
      const mouseX = pointer.x;
      const mouseY = pointer.y;
      
      if (mouseX < this.edgeThreshold) dx = -1;
      else if (mouseX > this.viewWidth - this.edgeThreshold) dx = 1;
      
      if (mouseY < this.edgeThreshold) dy = -1;
      else if (mouseY > this.viewHeight - this.edgeThreshold) dy = 1;
    }
    
    if (dx !== 0 || dy !== 0) {
      const speed = this.edgeScrollSpeed / this.zoom;
      this.x += dx * speed;
      this.y += dy * speed;
    }
    
    this.x = Math.max(ARENA.x, Math.min(ARENA.x + ARENA.w, this.x));
    this.y = Math.max(ARENA.y, Math.min(ARENA.y + ARENA.h, this.y));
    
    this.zoom += (this.targetZoom - this.zoom) * this.zoomSmooth;
  }

  updateGame(playerX, playerY, playerSpeed) {
    const speedMaxZoom = 550;
    const speedNorm = Math.min(1, playerSpeed / speedMaxZoom);
    const minZoomGame = 0.65;
    const maxZoomGame = 1.15;
    this.targetZoom = maxZoomGame - (maxZoomGame - minZoomGame) * speedNorm;
    this.targetZoom = Math.max(minZoomGame, Math.min(maxZoomGame, this.targetZoom));
    
    this.zoom += (this.targetZoom - this.zoom) * this.zoomSmooth;
    
    this.lastTargetX = playerX;
    this.lastTargetY = playerY;
    this.x += (this.lastTargetX - this.x) * this.followSmoothTarget;
    this.y += (this.lastTargetY - this.y) * this.followSmoothTarget;
  }

  // ⭐ MÉTODO DE COMPATIBILIDAD - Esto soluciona el error
  update(playerX, playerY, playerSpeed) {
    this.updateGame(playerX, playerY, playerSpeed);
  }

  setZoom(value) {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, value));
  }

  zoomIn(delta = 0.1) {
    this.setZoom(this.targetZoom + delta);
  }

  zoomOut(delta = 0.1) {
    this.setZoom(this.targetZoom - delta);
  }

  centerOn(x, y) {
    this.x = x;
    this.y = y;
    this.lastTargetX = x;
    this.lastTargetY = y;
  }

  apply(graphics) {
    graphics.save();
    const offsetX = this.viewWidth / 2 - this.x * this.zoom;
    const offsetY = this.viewHeight / 2 - this.y * this.zoom;
    graphics.translateCanvas(offsetX, offsetY);
    graphics.scaleCanvas(this.zoom, this.zoom);
  }

  restore(graphics) {
    graphics.restore();
  }

  worldToScreenX(worldX) {
    return (worldX - this.x) * this.zoom + this.viewWidth / 2;
  }

  worldToScreenY(worldY) {
    return (worldY - this.y) * this.zoom + this.viewHeight / 2;
  }

  screenToWorldX(screenX) {
    return (screenX - this.viewWidth / 2) / this.zoom + this.x;
  }

  screenToWorldY(screenY) {
    return (screenY - this.viewHeight / 2) / this.zoom + this.y;
  }

  screenToWorld(screenX, screenY) {
    return {
      x: this.screenToWorldX(screenX),
      y: this.screenToWorldY(screenY)
    };
  }

  isVisible(x, y, radius = 0) {
    const margin = radius * this.zoom + 50;
    const left = this.x - (this.viewWidth / 2) / this.zoom - margin;
    const right = this.x + (this.viewWidth / 2) / this.zoom + margin;
    const top = this.y - (this.viewHeight / 2) / this.zoom - margin;
    const bottom = this.y + (this.viewHeight / 2) / this.zoom + margin;
    
    return x + radius > left && x - radius < right && 
           y + radius > top && y - radius < bottom;
  }
}