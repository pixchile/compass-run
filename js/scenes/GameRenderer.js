import { W, H, ARENA, SMAX, L2, L3, DASH_CD, C, DIRS, HP_MAX, SLAM, ATTACK_RADIOS } from '../constants.js';

// Importar todos los renderers
import HealthBar from '../renderers/HealthBar.js';
import MomentumBar from '../renderers/MomentumBar.js';
import DashIndicator from '../renderers/DashIndicator.js';
import Compass from '../renderers/Compass.js';
import UIManager from '../renderers/UIManager.js';
import TrailRenderer from '../renderers/TrailRenderer.js';
import ArenaRenderer from '../renderers/ArenaRenderer.js';
import PlayerRenderer from '../renderers/PlayerRenderer.js';
import EnemyRenderer from '../renderers/EnemyRenderer.js';
import MapRenderer from '../renderers/MapRenderer.js';

export default class GameRenderer {
  constructor(scene, camera, gameScene) {
    this.scene = scene;
    this.camera = camera;
    this.gameScene = gameScene;
    this.g = scene.add.graphics();
    this.enemyRenderer = new EnemyRenderer();
    
    this.healthBar = new HealthBar(scene);
    this.momentumBar = new MomentumBar(scene);
    this.dashIndicator = new DashIndicator(scene);
    this.compass = new Compass(scene);
    this.uiManager = new UIManager(scene);
    this.trailRenderer = new TrailRenderer();
    this.arenaRenderer = new ArenaRenderer();
    this.playerRenderer = new PlayerRenderer();
    this.mapRenderer = new MapRenderer();
    
    this.customLines = [];
    this.customZones = [];
    
    // SLAM: Efectos visuales
    this.slamEffects = [];
    
    // DEBUG: Radio de ataque (solo si está activado el modo debug)
    this.showAttackRadius = false;
  }

  setCustomLines(lines) {
    this.customLines = lines || [];
  }

  setCustomZones(zones) {
    this.customZones = zones || [];
  }

  // SLAM: Añadir efecto visual de onda expansiva
  addSlamEffect(x, y, isHighSpeed) {
    this.slamEffects.push({
      x, y,
      radius: 0,
      maxRadius: SLAM.RADIUS,
      alpha: 0.8,
      isHighSpeed: isHighSpeed,
      life: SLAM.EFFECT_DURATION || 300
    });
  }

  // SLAM: Actualizar efectos
  updateSlamEffects(delta) {
    for (let i = this.slamEffects.length - 1; i >= 0; i--) {
      const effect = this.slamEffects[i];
      effect.life -= delta;
      if (effect.life <= 0) {
        this.slamEffects.splice(i, 1);
        continue;
      }
      
      const progress = 1 - (effect.life / (SLAM.EFFECT_DURATION || 300));
      effect.radius = effect.maxRadius * progress;
      effect.alpha = 0.8 * (1 - progress);
    }
  }

  // SLAM: Dibujar efectos
  drawSlamEffects() {
    for (const effect of this.slamEffects) {
      const color = effect.isHighSpeed ? 0xff4400 : 0xffaa44;
      this.g.lineStyle(3, color, effect.alpha);
      this.g.strokeCircle(effect.x, effect.y, effect.radius);
      
      this.g.lineStyle(1, 0xffcc88, effect.alpha * 0.6);
      this.g.strokeCircle(effect.x, effect.y, effect.radius * 0.6);
    }
  }

  // --- NUEVO: Dibujar radio de ataque para debug ---
  drawAttackRadius(player, momentumLevel) {
    if (!this.showAttackRadius) return;
    
    const attackRadius = player.getAttackRadius(momentumLevel);
    const screenPos = this.camera.worldToScreen(player.px, player.py);
    
    // Círculo base según nivel de momentum
    let baseColor = 0x44ff44;
    if (momentumLevel === 2) baseColor = 0xffaa44;
    if (momentumLevel === 3) baseColor = 0xff4444;
    
    this.g.lineStyle(2, baseColor, 0.5);
    this.g.strokeCircle(screenPos.x, screenPos.y, attackRadius);
    
    // Si está atacando, mostrar radio más brillante
    const attackPayload = player.getCurrentAttackPayload(momentumLevel);
    if (attackPayload) {
      this.g.lineStyle(3, 0xff6600, 0.8);
      this.g.strokeCircle(screenPos.x, screenPos.y, attackPayload.radius);
      
      // Texto indicador del radio actual
      this.scene.add.text(screenPos.x + 15, screenPos.y - 15, 
        `⚔️ ${Math.floor(attackPayload.radius)}px`, {
        fontSize: '10px',
        fill: '#ffaa44',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5).setDepth(1000).setScrollFactor(0);
    }
  }

  // --- NUEVO: Dibujar indicador de nivel de ataque ---
  drawAttackLevelIndicator(player, momentumLevel) {
    const screenPos = this.camera.worldToScreen(player.px, player.py);
    const attackRadius = player.getAttackRadius(momentumLevel);
    
    // Pequeño indicador circular alrededor del jugador
    this.g.lineStyle(1, 0xffffff, 0.3);
    this.g.strokeCircle(screenPos.x, screenPos.y, attackRadius + 2);
    
    // Puntos según nivel
    const dotCount = momentumLevel;
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2 + Date.now() * 0.005;
      const dotX = screenPos.x + Math.cos(angle) * (attackRadius + 5);
      const dotY = screenPos.y + Math.sin(angle) * (attackRadius + 5);
      
      this.g.fillStyle(0xffaa44, 0.8);
      this.g.fillCircle(dotX, dotY, 2);
    }
  }

  render(player, momentum, gameOver = false, gameOverAlpha = 0, gameOverReason = null, timeRemaining = null, delta = 16) {
    const g = this.g;
    const now = this.scene.time.now;
    
    this.updateSlamEffects(delta);
    
    g.clear();
    const time = {
      now: now,
      sinSlow: Math.sin(now * 0.007),
      sinNormal: Math.sin(now * 0.008),
      sinFast: Math.sin(now * 0.012),
      sinHeartbeat: Math.sin(now * 0.006)
    };

    this.camera.apply(g);
    
    this.arenaRenderer.render(g, momentum.level, time);
    
    if (this.customZones && this.customZones.length > 0) {
      this.mapRenderer.renderZones(g, this.customZones);
    }

    if (this.customLines && this.customLines.length > 0) {
      this.mapRenderer.renderLines(g, this.customLines);
    }
    
    this.trailRenderer.render(g, player);
    this.playerRenderer.render(g, player, momentum, time);
    this.enemyRenderer.render(g, this.gameScene.enemyManager.getEnemies());
    this.gameScene.orbManager.render(g);
    
    // Dibujar efectos visuales de ataque
    if (!gameOver && !player.isDead) {
      this.drawAttackRadius(player, momentum.level);
      this.drawAttackLevelIndicator(player, momentum.level);
    }
    
    this.drawSlamEffects();
    
    this.compass.render(g, player, momentum, this.camera);
    
    this.camera.restore(g);

    this.healthBar.render(g, player, time);
    this.momentumBar.render(g, momentum, time);
    this.dashIndicator.render(g, player);
    
    this.uiManager.updateTexts(player, momentum, this.camera, gameOver, gameOverAlpha, gameOverReason, timeRemaining, time, this.gameScene.rewardSystem?.displayCredits ?? 0);
    
    this.uiManager.updateLevelLabels(this.momentumBar.getWidth(), this.momentumBar.getX());
  }
  
  clearGameOver() {
    this.uiManager.clearGameOver();
  }
  
  // Método para activar/desactivar debug de radios
  toggleAttackRadiusDebug() {
    this.showAttackRadius = !this.showAttackRadius;
  }
}