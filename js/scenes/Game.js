// js/scenes/Game.js

import Player from './Player.js';
import MomentumSystem from './MomentumSystem.js';
import GameRenderer from './GameRenderer.js';
import Camera from './Camera.js';
import enemyRegistry from '../enemies/EnemyRegistry.js';
import EnemyManager from './EnemyManager.js';
import SVGMapLoader from '../systems/SVGMapLoader.js'; 
import RewardSystem from './RewardSystem.js';
import OrbManager   from './OrbManager.js';
import { HP_DMG_DASH_WALL, DASH_WALL_STUN_DUR } from '../constants.js';
import { registerAllCustomEnemies } from '../enemies/definitions/index.js';

export default class Game extends Phaser.Scene {
  constructor() {
    super('Game');
    this._p1 = { x: 0, y: 0 };
    this._p2 = { x: 0, y: 0 };
    this._closest = { x: 0, y: 0 };
    this._colResult = { collided: false, hitX: 0, hitY: 0, distance: 0 };
  }

  init(data) {
    this.mapName = data?.mapName || 'default';
  }

  async create() {
    registerAllCustomEnemies(enemyRegistry);
    this.mapLoader = new SVGMapLoader();
    this.currentMap = await this.mapLoader.loadMapFromURL(`assets/maps/${this.mapName}.svg`);

    if (!this.currentMap) {
      console.warn("No se pudo cargar el SVG. Usando mapa vacío.");
      this.currentMap = { arena: {x:50, y:50, w:2000, h:2000}, lines: [], zones: [] };
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

    this.renderer = new GameRenderer(this, this.camera, this);
    this.renderer.setCustomLines(this.currentMap.lines || []);
    this.renderer.setCustomZones(this.currentMap.zones || []);

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

    this.player.prevX = this.player.px;
    this.player.prevY = this.player.py;

    this.player.update(delta, this.momentum); 
    this.momentum.update(delta, this.player);
    this.enemyManager.update(delta, this.time.now, this.player, this.currentMap.lines || []);
    this.rewardSystem.update(delta, this.player);
    this.orbManager.update(delta, this.player);

    this.enemyManager.processPlayerInteractions(this.player, delta, this.time.now, this.momentum.level);
    this.enemyManager.cleanupDead();

    // 1. ZONAS (Incluyendo el Viento)
    this.checkZones();

    if (!this.player.dashing && !this.player.jumping) {
      this.enemyManager.checkSolidCollision(this.player, 12);
    }

    // 2. COLISIONES SÓLIDAS
    this.checkLineCollisions();

    this._wallEnemyLines = this.enemyManager.getWallEnemyLines();
    if (this._wallEnemyLines.length > 0) {
      const savedLines = this.currentMap.lines;
      this.currentMap.lines = savedLines.concat(this._wallEnemyLines);
      this.checkLineCollisions();
      this.currentMap.lines = savedLines;
    }

    if (this.player.activeSlam) {
      this.enemyManager.processSlam(this.player.activeSlam, this.time.now);
      this.player.activeSlam = null; 
    }

    const playerSpeed = Math.hypot(this.player.vx, this.player.vy);
    this.camera.update(this.player.px, this.player.py, playerSpeed);
    const visibleLines = (this.currentMap.lines || []).filter(line => !line._broken);
    this.renderer.setCustomLines(visibleLines);

    this.renderer.render(this.player, this.momentum, false, 0, this.gameOverReason, this.timeRemaining, delta);
  }

  checkZones() {
    const zones = this.currentMap.zones || [];
    const now = this.time.now;

    for (const zone of zones) {
      const g = zone.geometry;
      let inside = false;

      if (g.bbox) {
        inside = this.player.px >= g.bbox.x && this.player.px <= g.bbox.x + g.bbox.w &&
                 this.player.py >= g.bbox.y && this.player.py <= g.bbox.y + g.bbox.h;
      } else if (g.shapeType === 'rect') {
        inside = this.player.px >= g.x && this.player.px <= g.x + g.w &&
                 this.player.py >= g.y && this.player.py <= g.y + g.h;
      }

      if (!inside) continue;

      if (zone.type === 'void') {
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
      } else if (zone.type === 'wind_zone') {
        const tags = zone.tags || [];
        const dir = tags.indexOf('right') !== -1 ? 'right'
                  : tags.indexOf('left')  !== -1 ? 'left'
                  : tags.indexOf('up')    !== -1 ? 'up'
                  : tags.indexOf('down')  !== -1 ? 'down' : null;
        
        // FIX BUG: El viento ahora inyecta aceleración directamente a la velocidad (vx/vy).
        // Si chocas contra él te frena, si vas a favor, tu inercia y velocidad máxima aumentan.
        let windAccel = 3000; // Valor por defecto si no le pones número
        const numTag = tags.find(t => !isNaN(t) && t.trim() !== '');
        if (numTag) windAccel = parseFloat(numTag);

        const deltaSec = (this.lastDelta || 16) / 1000;
        const force = windAccel * deltaSec;

        if (dir === 'right') this.player.vx += force;
        else if (dir === 'left')  this.player.vx -= force;
        else if (dir === 'up')    this.player.vy -= force;
        else if (dir === 'down')  this.player.vy += force;
      }
    }
  }

  checkLineCollisions() {
    const allLines = this.currentMap.lines || [];
    if (allLines.length === 0) return;

    const playerSpeed = Math.hypot(this.player.vx, this.player.vy);
    const playerMomentum = this.momentum.level;

    const lines = allLines.filter(line => !line._broken);
    if (lines.length === 0) return;

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
        
        // FIX BUG: Muros verdes estrictos.
        // Si el jugador NO está saltando, O su velocidad es menor a la requerida (600), actuará como muro sólido.
        if (line.type === 'wall_jumpable') {
            const reqSpeed = line.speedRequired > 0 ? line.speedRequired : 600; // Default a 600
            if (this.player.jumping && playerSpeed >= reqSpeed) {
                continue; // Condición cumplida: Atraviesa el muro.
            }
        }

        if (!canStick && isWallRunning) continue; 

        this.player.px = this._colResult.hitX;
        this.player.py = this._colResult.hitY;

        const dx = line.end.x - line.start.x;
        const dy = line.end.y - line.start.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) continue;

        let nx = -dy / len;
        let ny = dx / len;
        
        const p1xToLine = this._p1.x - line.start.x;
        const p1yToLine = this._p1.y - line.start.y;
        if (p1xToLine * nx + p1yToLine * ny < 0) {
            nx = -nx;
            ny = -ny;
        }
        
        const finalNx = nx;
        const finalNy = ny;

        this.closestPointOnLine(this._p2, line.start, line.end);
        const cx = this._closest.x;
        const cy = this._closest.y;
        const distNow = Math.hypot(this.player.px - cx, this.player.py - cy);
        const targetDist = playerRadius + line.thickness / 2;
        
        if (distNow < targetDist) {
          if (distNow === 0) {
            this.player.px += finalNx * targetDist;
            this.player.py += finalNy * targetDist;
          } else {
            const pushX = (this.player.px - cx) / distNow;
            const pushY = (this.player.py - cy) / distNow;
            this.player.px += pushX * (targetDist - distNow);
            this.player.py += pushY * (targetDist - distNow);
          }
        }

        const currentSpeed = Math.hypot(this.player.vx, this.player.vy);

        if (canStick) {
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
        this._colResult.hitX = p2.x;
        this._colResult.hitY = p2.y;
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