// js/scenes/GameRenderer.js

import { W, H, ARENA, SMAX, L2, L3, DASH_CD, HP_MAX, SLAM, ATTACK_RADIOS } from '../constants.js';

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
import DamageNumberManager from '../renderers/DamageNumberManager.js';

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
    this.damageNumbers = new DamageNumberManager(scene);

    this.customLines = [];
    this.customZones = [];
    this._bgImage = null;

    this.slamEffects = [];
    this.showAttackRadius = false;

    this._spawnerTimerTexts = new Map();
    this._spawnerTimerPool = [];
  }

  setCustomLines(lines) {
    this.customLines = lines || [];
  }

  setCustomZones(zones) {
    this.customZones = zones || [];
  }

  loadBackground(path) {
    if (this._bgImage) {
      this._bgImage.destroy();
      this._bgImage = null;
    }
    const key = 'mapbg';
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    const a = this.gameScene?.currentMap?.arena || { x: 55, y: 58, w: 4000, h: 4000 };
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scaleX = a.w / img.width;
      const scaleY = a.h / img.height;
      const worldScale = Math.min(scaleX, scaleY);
      const drawW = Math.floor(img.width * worldScale);
      const drawH = Math.floor(img.height * worldScale);

      const cvs = document.createElement('canvas');
      cvs.width = drawW;
      cvs.height = drawH;
      const ctx = cvs.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, drawW, drawH);

      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
      this.scene.textures.addCanvas(key, cvs);
      this.scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);

      this._bgImage = this.scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1);
      this._bgImage._worldScale = 1;
    };
    img.src = path;
  }

  addSlamEffect(x, y, isHighSpeed, maxRadius) {
    this.slamEffects.push({
      x, y,
      radius: 0,
      maxRadius: maxRadius || SLAM.RADIUS,
      alpha: 0.8,
      isHighSpeed: isHighSpeed,
      life: SLAM.EFFECT_DURATION || 300
    });
  }

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

  drawSlamEffects() {
    for (const effect of this.slamEffects) {
      const color = effect.isHighSpeed ? 0xff4400 : 0xffaa44;
      this.g.lineStyle(3, color, effect.alpha);
      this.g.strokeCircle(effect.x, effect.y, effect.radius);

      this.g.lineStyle(1, 0xffcc88, effect.alpha * 0.6);
      this.g.strokeCircle(effect.x, effect.y, effect.radius * 0.6);
    }
  }

  drawBounceHighlights(player, enemies, time) {
    if (!player._stickState) return;
    const fx = this.gameScene.itemEffects;
    if (!fx?.has('BBC')) return;

    // Dibujar el enemigo stuck con un anillo brillante
    const se = player._stickEnemy;
    if (se && se.hp > 0) {
      const pulse = 0.8 + 0.2 * Math.sin(time.now * 0.01);
      const r = (se.radius || 12) + 6;
      this.g.lineStyle(2, 0xff8844, pulse);
      this.g.strokeCircle(se.x, se.y, r);
    }
  }

  drawSandKingIndicator(player) {
    const fx = this.gameScene.itemEffects;
    if (!fx?.has('DDC')) return;
    const radius = SLAM.RADIUS * SLAM.SANDKING_RADIUS_MULT;
    const alpha = 0.15 + 0.05 * Math.sin(this.scene.time.now * 0.003);
    this.g.lineStyle(1.5, 0xc8a860, alpha);
    this.g.strokeCircle(player.px, player.py, radius);
  }

  drawAttackRadius(player, momentumLevel) {
    if (!this.showAttackRadius) return;

    const attackRadius = player.getAttackRadius(momentumLevel);
    const screenPos = this.camera.worldToScreen(player.px, player.py);

    let baseColor = 0x44ff44;
    if (momentumLevel === 2) baseColor = 0xffaa44;
    if (momentumLevel === 3) baseColor = 0xff4444;

    this.g.lineStyle(2, baseColor, 0.5);
    this.g.strokeCircle(screenPos.x, screenPos.y, attackRadius);

    const attackPayload = player.getCurrentAttackPayload(momentumLevel);
    if (attackPayload) {
      this.g.lineStyle(3, 0xff6600, 0.8);
      this.g.strokeCircle(screenPos.x, screenPos.y, attackPayload.radius);
    }
  }

  drawAttackLevelIndicator(player, momentumLevel) {
    const screenPos = this.camera.worldToScreen(player.px, player.py);
    const attackRadius = player.getAttackRadius(momentumLevel);

    this.g.lineStyle(1, 0xffffff, 0.3);
    this.g.strokeCircle(screenPos.x, screenPos.y, attackRadius + 2);

    const dotCount = momentumLevel;
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2 + Date.now() * 0.005;
      const dotX = screenPos.x + Math.cos(angle) * (attackRadius + 5);
      const dotY = screenPos.y + Math.sin(angle) * (attackRadius + 5);

      this.g.fillStyle(0xffaa44, 0.8);
      this.g.fillCircle(dotX, dotY, 2);
    }
  }

  render(player, compassSystem, gameOver = false, gameOverAlpha = 0, gameOverReason = null, timeRemaining = null, delta = 16, elapsedSeconds = 0) {
    const g = this.g;
    const now = this.scene.time.now;

    // Extraer el sistema de momentum desde el compass para compatibilidad con renderers antiguos
    const momentum = compassSystem?.momentum || null;

    this.updateSlamEffects(delta);
    this.damageNumbers.update(delta);

    // Sync background image with custom camera
    if (this._bgImage) {
      const a = this.gameScene.currentMap?.arena || { x: 55, y: 58, w: 4000, h: 4000 };
      const screenOrigin = this.camera.worldToScreen(a.x, a.y);
      this._bgImage.setPosition(screenOrigin.x, screenOrigin.y);
      const ws = this._bgImage._worldScale || 1;
      this._bgImage.setScale(ws * this.camera.zoom);
    }

    g.clear();
    const time = {
      now: now,
      sinSlow: Math.sin(now * 0.007),
      sinNormal: Math.sin(now * 0.008),
      sinFast: Math.sin(now * 0.012),
      sinHeartbeat: Math.sin(now * 0.006)
    };

    this.camera.apply(g);

    this.arenaRenderer.render(g, momentum?.level || 1, time, !!this._bgImage);

    // Zones are invisible in-game — they're collision-only, visuals come from the background image
    if (this.customLines && this.customLines.length > 0) {
      this.mapRenderer.renderLines(g, this.customLines);
    }

    this.trailRenderer.render(g, player);

    // ── Telegrafías del boss (debajo de enemies y del boss) ──
    this.gameScene.bossManager?.renderTelegraph(g);

    this.playerRenderer.render(g, player, momentum, time);
    this.enemyRenderer.render(g, this.gameScene.enemyManager.getEnemies());
    this.gameScene.orbManager.render(g);

    if (!gameOver && !player.isDead) {
      this.drawAttackRadius(player, momentum?.level || 1);
    }

    this.drawSlamEffects();
    this.drawBounceHighlights(player, this.gameScene.enemyManager.getEnemies(), time);
    this.drawSandKingIndicator(player);
    this.gameScene.itemEffects?.renderVampireOrbs(g);
    this.gameScene.itemEffects?.renderEventHorizons(g);

    // Brújula nueva: pasar compassSystem
    this.compass.render(g, player, compassSystem, this.camera);

    this._renderSpawnerTimers(elapsedSeconds);

    this.camera.restore(g);

    // ── Boss HP bar (coordenadas de pantalla, sobre todo lo demás) ──
    this.gameScene.bossManager?.renderHUD(g);

    // ── Boss name flash ──
    if (this.gameScene.bossManager?.hasBoss) {
      const nameAlpha = this.gameScene.bossManager.bossNameAlpha;
      if (nameAlpha > 0) {
        this._renderBossName(g, this.gameScene.bossManager.bossName, nameAlpha);
      }
    }

    this.healthBar.render(g, player, time);
    this.momentumBar.render(g, momentum, time);
    this.dashIndicator.render(g, player);

    // UI usa compassSystem para acceder a créditos, stacks, etc.
    this.uiManager.updateTexts(
      player,
      compassSystem,
      this.camera,
      gameOver,
      gameOverAlpha,
      gameOverReason,
      timeRemaining,
      time,
      this.gameScene.rewardSystem?.displayCredits ?? 0
    );

    this.uiManager.updateLevelLabels(this.momentumBar.getWidth(), this.momentumBar.getX(), momentum);
  }

  clearGameOver() {
    this.uiManager.clearGameOver();
  }

  toggleAttackRadiusDebug() {
    this.showAttackRadius = !this.showAttackRadius;
  }

  _renderSpawnerTimers(elapsedSeconds) {
    const timers = this.gameScene.enemyManager.getSpawnerTimers(elapsedSeconds);
    const usedKeys = new Set();

    for (const t of timers) {
      const key = `${t.x}_${t.y}`;
      usedKeys.add(key);

      let textObj = this._spawnerTimerTexts.get(key);
      if (!textObj) {
        if (this._spawnerTimerPool.length > 0) {
          textObj = this._spawnerTimerPool.pop();
          textObj.setVisible(true);
        } else {
          textObj = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#cccccc',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
          }).setOrigin(0.5, 0).setDepth(5);
        }
        this._spawnerTimerTexts.set(key, textObj);
      }

      let label;
      if (t.state === 'max_alive') {
        label = 'MAX';
      } else if (t.state === 'waiting_start') {
        label = `${Math.ceil(t.remainingMs / 1000)}s`;
      } else {
        const sec = Math.max(0, t.remainingMs / 1000);
        label = sec >= 1 ? `${sec.toFixed(1)}s` : 'NOW';
      }

      textObj.setText(label);
      const screen = this.camera.worldToScreen(t.x, t.y);
      textObj.setPosition(screen.x, screen.y - 18 * this.camera.zoom);
      textObj.setScale(this.camera.zoom);
      textObj.setAlpha(0.8);
    }

    for (const [key, textObj] of this._spawnerTimerTexts) {
      if (!usedKeys.has(key)) {
        textObj.setVisible(false);
        this._spawnerTimerTexts.delete(key);
        this._spawnerTimerPool.push(textObj);
      }
    }
  }

  _renderBossName(g, name, alpha) {
    // Texto del nombre del boss centrado en pantalla — usando Phaser Text
    // Solo creamos el objeto una vez y lo reusamos
    if (!this._bossNameTextObj) {
      this._bossNameTextObj = this.scene.add.text(440, 110, '', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ff6633',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(100);
    }
    this._bossNameTextObj.setText(name);
    this._bossNameTextObj.setAlpha(alpha);
  }
}