// js/scenes/Game.js

import Player from './Player.js';
import MomentumSystem from './MomentumSystem.js';
import GameRenderer from './GameRenderer.js';
import Camera from './Camera.js';
import enemyRegistry from '../enemies/EnemyRegistry.js';
import EnemyManager from './EnemyManager.js';
import SVGMapLoader from '../systems/SVGMapLoader.js'; // <-- CORREGIDO: Importa el nuevo cargador
import RewardSystem from './RewardSystem.js';
import OrbManager   from './OrbManager.js';
import { HP_DMG_DASH_WALL, DASH_WALL_STUN_DUR } from '../constants.js';
import { registerAllCustomEnemies } from '../enemies/definitions/index.js';

export default class Game extends Phaser.Scene {
  constructor() {
    super('Game');
    
    // OPTIMIZACIÓN: Objetos pre-asignados para evitar Garbage Collection
    this._p1 = { x: 0, y: 0 };
    this._p2 = { x: 0, y: 0 };
    this._closest = { x: 0, y: 0 };
    this._colResult = { collided: false, hitX: 0, hitY: 0, distance: 0 };
  }

  init(data) {
    this.mapName  = data?.mapName  || 'default';
    this.stageName = data?.stageName || null;
  }

  async create() {
    registerAllCustomEnemies(enemyRegistry);
    this.mapLoader = new SVGMapLoader();
    
    this.currentMap = await this.mapLoader.loadMapFromURL(`assets/maps/${this.mapName}.svg`);

    if (!this.currentMap) {
      console.warn("No se pudo cargar el SVG. Usando mapa vacío.");
      this.currentMap = { arena: {x:50, y:50, w:2000, h:2000}, lines: [], zones: [] };
    }

    // Fusionar datos del stage si se especificó uno
    if (this.stageName) {
      try {
        const stages = JSON.parse(localStorage.getItem('cr_stages') || '[]');
        const stage  = stages.find(s => s.name === this.stageName);
        if (stage) {
          this.currentMap.enemies  = stage.enemies  || [];
          this.currentMap.spawners = stage.spawners || [];
          this.currentMap.density  = stage.density  || null;
          if (stage.timeLimit) this.currentMap.timeLimit = stage.timeLimit;
        }
      } catch {}
    }

    this.gameOver = false;
    this.gameOverAlpha = 0;
    this.gameOverReason = null; 

    this.timeLimit = this.currentMap.timeLimit || 300;
    this.timeRemaining = this.timeLimit;
    this.lastTimeUpdate = this.time.now;

    this.player = new Player(this);
    this.momentum = new MomentumSystem();
    this.camera = new Camera();

    this.player.prevX = this.player.px;
    this.player.prevY = this.player.py;

    const arenaBounds = this.currentMap.arena || { x: 55, y: 58, w: 4000, h: 4000 };

    this.enemyManager = new EnemyManager(this, arenaBounds);
    this.enemyManager.setSpawnList(this.currentMap.enemies || []);
    this.enemyManager.setDensity(this.currentMap.density || null);
    this.enemyManager.setSpawners(this.currentMap.spawners || []);

    this.renderer = new GameRenderer(this, this.camera, this);
    this.renderer.setCustomLines(this.currentMap.lines || []);
    this.renderer.setCustomZones(this.currentMap.zones || []);

    // CORREGIDO: Se quitó la llave '}' que cortaba la función por la mitad
    this.restartKey = this.input.keyboard.addKey('SPACE');
    this.menuKey = this.input.keyboard.addKey('M');

    this.rewardSystem = new RewardSystem();
    this.orbManager   = new OrbManager();
    this.enemyManager.setRewardHandlers(this.rewardSystem, this.orbManager);
    this.momentum.setRewardSystem(this.rewardSystem);

    this.enemyManager.setMomentumSystem(this.momentum);
  }

  update(t, delta) {
    if (!this.currentMap) return;
    this.lastDelta = delta;
    
    if (!this.gameOver && !this.player.isDead) {
      const now = this.time.now;
      if (now - this.lastTimeUpdate >= 1000) {
        this.timeRemaining--;
        this.lastTimeUpdate = now;
        if (this.timeRemaining <= 0) {
          this.gameOver = true;
          this.gameOverReason = 'timeout';
        }
      }
    }

    if (this.gameOver) {
      this.gameOverAlpha = Math.min(1, this.gameOverAlpha + delta / 500);
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) this.restartGame();
      if (Phaser.Input.Keyboard.JustDown(this.menuKey)) this.scene.start('MainMenu');
      this.renderer.render(this.player, this.momentum, true, this.gameOverAlpha, this.gameOverReason, this.timeRemaining, delta);
      return;
    }

    if (this.player.isDead) {
      this.gameOver = true;
      this.gameOverReason = 'death';
      this.renderer.render(this.player, this.momentum, true, this.gameOverAlpha, this.gameOverReason, this.timeRemaining, delta);
      return;
    }

    // --- CICLO PRINCIPAL DE JUEGO ---
    this.player.prevX = this.player.px;
    this.player.prevY = this.player.py;

    this.player.update(delta, this.momentum); 
    this.momentum.update(delta, this.player);

    // Calcular líneas activas una sola vez — reutilizar en colisión, wallEnemy y render
    this._visibleLines = this.currentMap.lines.filter(l => !l._broken);

    this.enemyManager.update(delta, this.time.now, this.player, this._visibleLines);
    this.rewardSystem.update(delta, this.player);
    this.orbManager.update(delta, this.player);

    this.enemyManager.processPlayerInteractions(this.player, delta, this.time.now, this.momentum);
    this.enemyManager.cleanupDead();

    if (!this.player.dashing && !this.player.jumping) {
      this.enemyManager.checkSolidCollision(this.player, 12);
    }

    // Sub-stepping: si el jugador se movió mucho este frame, dividir la colisión
    // para evitar tunneling a través de muros delgados a alta velocidad
    const frameDist = Math.hypot(this.player.px - this.player.prevX, this.player.py - this.player.prevY);
    const steps = frameDist > 16 ? 2 : 1;
    if (steps > 1) {
      const midX = (this.player.prevX + this.player.px) / 2;
      const midY = (this.player.prevY + this.player.py) / 2;
      const endX = this.player.px;
      const endY = this.player.py;

      // Paso 1: prevX → midpoint
      this.player.px = midX; this.player.py = midY;
      this.checkLineCollisions(this._visibleLines);

      // Paso 2: midpoint → endX (actualizar prev para el segundo sweep)
      this.player.prevX = this.player.px; this.player.prevY = this.player.py;
      this.player.px = endX; this.player.py = endY;
      this.checkLineCollisions(this._visibleLines);
    } else {
      this.checkLineCollisions(this._visibleLines);
    }

    this.checkZones();

    // isWall enemies como líneas extra
    this._wallEnemyLines = this.enemyManager.getWallEnemyLines();
    if (this._wallEnemyLines.length > 0) {
      this.checkLineCollisions(this._wallEnemyLines);
    }

    if (this.player.activeSlam) {
      this.enemyManager.processSlam(this.player.activeSlam, this.time.now);
      this.player.activeSlam = null; 
    }

    const playerSpeed = Math.hypot(this.player.vx, this.player.vy);
    this.camera.update(this.player.px, this.player.py, playerSpeed);
    this.renderer.setCustomLines(this._visibleLines);
    this.renderer.render(this.player, this.momentum, false, 0, this.gameOverReason, this.timeRemaining, delta);
  }

  checkZones() {
    const zones = this.currentMap.zones || [];
    const now = this.time.now;

    for (const zone of zones) {
      const g = zone.geometry;
      let inside = false;

      if (g.shapeType === 'rect') {
        inside = this.player.px >= g.x && this.player.px <= g.x + g.w &&
                 this.player.py >= g.y && this.player.py <= g.y + g.h;
      } else if (g.bbox) {
        inside = this.player.px >= g.bbox.x && this.player.px <= g.bbox.x + g.bbox.w &&
                 this.player.py >= g.bbox.y && this.player.py <= g.bbox.y + g.bbox.h;
      }

      if (!inside) continue;

      if (zone.type === 'void') {
        // Solo mata si el jugador toca el suelo — puede saltar sobre el vacío
        if (!this.player.jumping && !this.player.wallJump?.wallStick) {
          this.player.fallIntoVoid();
        }
      } else if (zone.type === 'damage_zone') {
        if (!zone._lastDmg || now - zone._lastDmg > 500) {
          zone._lastDmg = now;
          this.player.takeDamage(zone.damage || 5);
        }
      } else if (zone.type === 'trap') {
        this.player.slowTimer   = Math.max(this.player.slowTimer   || 0, 300);
        this.player.noJumpTimer = Math.max(this.player.noJumpTimer || 0, 300);
      }
    }
  }

  checkLineCollisions(lines) {
    if (!lines || lines.length === 0) return;

    const playerSpeed = Math.hypot(this.player.vx, this.player.vy);
    const playerMomentum = this.momentum.level;

    const playerRadius = 12;
    const isWallRunning = this.player.wallRun?.isWallRunning;

    const canStick = this.player.wallJump && 
                     !this.player.wallJump.wallStick && 
                     !this.player.isStunned && 
                     !this.player.dashing && 
                     this.player.wallJump.wallStickCooldown <= 0 && 
                     (this.player.jumping || !this.player.wallJump.wallStick);

    this._p1.x = this.player.prevX; this._p1.y = this.player.prevY;
    this._p2.x = this.player.px; this._p2.y = this.player.py;

    for (const line of lines) {
      this.lineCollisionBetween(this._p1, this._p2, line, playerRadius + (line.thickness / 2));
      
      if (this._colResult.collided) {
        if (!canStick && isWallRunning) continue; 

        this.player.px = this._colResult.hitX;
        this.player.py = this._colResult.hitY;

        const dx = line.end.x - line.start.x;
        const dy = line.end.y - line.start.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) continue;

        let nx = -dy / len;
        let ny = dx / len;
        const px = this.player.px - line.start.x;
        const py = this.player.py - line.start.y;
        const lado = (dx * py - dy * px);
        
        const finalNx = lado > 0 ? nx : -nx;
        const finalNy = lado > 0 ? ny : -ny;
        const overlap = (playerRadius + line.thickness / 2) - this._colResult.distance;

        if (overlap > 0) {
          this.player.px += finalNx * overlap;
          this.player.py += finalNy * overlap;
        }

        const currentSpeed = Math.hypot(this.player.vx, this.player.vy);

        if (canStick) {
          // Romper muro breakable si el jugador impacta con momentum suficiente
          if (line.type === 'wall_breakable') {
            const required = line.momentumRequired > 0 ? line.momentumRequired : 3;
            if (playerMomentum >= required) {
              line._broken = true;
              continue;
            }
          }
          this.player.vx = 0;
          this.player.vy = 0;
          const normalAngle = Math.atan2(finalNy, finalNx);
          this.player.stickToWall(normalAngle, currentSpeed, line);
          return; 
        } else {
          // Romper breakable también en rebote
          if (line.type === 'wall_breakable') {
            const required = line.momentumRequired > 0 ? line.momentumRequired : 3;
            if (playerMomentum >= required) { line._broken = true; continue; }
          }
          const dotV = this.player.vx * finalNx + this.player.vy * finalNy;
          let impactSpeed = 0;
          if (dotV < 0) {
            impactSpeed = -dotV;
            this.player.vx -= dotV * finalNx;
            this.player.vy -= dotV * finalNy;
          }
          if (this.player.dashing) {
            this.player.stunT = DASH_WALL_STUN_DUR;
            this.momentum.halveStacks();
            this.player.takeDamage(Math.floor(HP_DMG_DASH_WALL * impactSpeed));
            this.player.dashing = false;
            this.player.vx = 0;
            this.player.vy = 0;
          }
          break; 
        }
      }
    }
  }

  lineCollisionBetween(p1, p2, line, radius) {
    this._colResult.collided = false;

    this.closestPointOnLine(p1, line.start, line.end);
    const toClosestX = this._closest.x - p1.x;
    const toClosestY = this._closest.y - p1.y;
    const distToClosest = Math.hypot(toClosestX, toClosestY);
    
    const moveX = p2.x - p1.x;
    const moveY = p2.y - p1.y;
    const moveLen = Math.hypot(moveX, moveY);
    
    if (distToClosest < radius) {
      const dotInit = moveX * toClosestX + moveY * toClosestY;
      if (moveLen === 0 || dotInit > 0) {
        this._colResult.collided = true;
        this._colResult.hitX = p1.x;
        this._colResult.hitY = p1.y;
        this._colResult.distance = distToClosest;
        return;
      }
    }
    
    if (moveLen === 0) return;
    
    const dirX = moveX / moveLen;
    const dirY = moveY / moveLen;
    const dot = toClosestX * dirX + toClosestY * dirY;
    
    if (dot <= 0) return;
    
    const perpX = toClosestX - dot * dirX;
    const perpY = toClosestY - dot * dirY;
    const perpDist = Math.hypot(perpX, perpY);
    
    if (perpDist >= radius) return;
    
    const tCollide = dot - Math.sqrt(radius * radius - perpDist * perpDist);
    if (tCollide < 0 || tCollide > moveLen) return;
    
    this._colResult.collided = true;
    this._colResult.hitX = p1.x + dirX * tCollide;
    this._colResult.hitY = p1.y + dirY * tCollide;
    this._colResult.hitT = moveLen > 0 ? tCollide / moveLen : 0.5;
    this._colResult.distance = radius;
  }

  closestPointOnLine(p, a, b) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;
    
    if (len2 === 0) {
      this._closest.x = a.x;
      this._closest.y = a.y;
      return;
    }
    
    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    
    this._closest.x = a.x + t * abx;
    this._closest.y = a.y + t * aby;
  }

  restartGame() {
    this.gameOver = false;
    this.gameOverAlpha = 0;
    this.gameOverReason = null;
    this.timeRemaining = this.timeLimit;
    this.lastTimeUpdate = this.time.now;
    this.player = new Player(this);
    this.player.prevX = this.player.px;
    this.player.prevY = this.player.py;
    this.momentum = new MomentumSystem();
    this.momentum.setRewardSystem(this.rewardSystem);
    this.rewardSystem.reset();
    this.orbManager.reset();
    this.camera.x = this.camera.viewWidth / 2;
    this.camera.y = this.camera.viewHeight / 2;
    this.camera.zoom = 1.0;
    this.camera.targetZoom = 1.0;
    this.enemyManager.clearAll();
    this.enemyManager.setSpawnList(this.currentMap.enemies || []);
    this.enemyManager.setMomentumSystem(this.momentum);
    this.renderer.clearGameOver();
  }
}