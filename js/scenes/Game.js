// js/scenes/Game.js

import Player from './Player.js';
import MomentumSystem from './MomentumSystem.js';
import GameRenderer from './GameRenderer.js';
import Camera from './Camera.js';
import enemyRegistry from '../enemies/EnemyRegistry.js';
import EnemyManager from './EnemyManager.js';
import MapLoader from '../systems/MapLoader.js';
import RewardSystem from './RewardSystem.js';
import OrbManager   from './OrbManager.js';
import { HP_DMG_DASH_WALL, DASH_WALL_STUN_DUR } from '../constants.js';
import { registerAllCustomEnemies } from '../enemies/definitions/index.js';

export default class Game extends Phaser.Scene {
  constructor() {
    super('Game');
    
    // OPTIMIZACIÓN: Objetos pre-asignados para evitar Garbage Collection en el bucle de colisiones
    this._p1 = { x: 0, y: 0 };
    this._p2 = { x: 0, y: 0 };
    this._closest = { x: 0, y: 0 };
    this._colResult = { collided: false, hitX: 0, hitY: 0, distance: 0 };
  }

  init(data) {
    this.mapName = data?.mapName || 'default';
  }

  create() {
    registerAllCustomEnemies(enemyRegistry);
    this.mapLoader = new MapLoader();
    this.currentMap = this.mapLoader.loadMap(this.mapName);

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

    this.restartKey = this.input.keyboard.addKey('SPACE');
    this.menuKey = this.input.keyboard.addKey('M');

    this.rewardSystem = new RewardSystem();
    this.orbManager   = new OrbManager();
    this.enemyManager.setRewardHandlers(this.rewardSystem, this.orbManager);
    this.momentum.setRewardSystem(this.rewardSystem);

    this.enemyManager.setMomentumSystem(this.momentum);
  }

  update(t, delta) {
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
    this.enemyManager.update(delta, this.time.now, this.player, this.currentMap.lines || []);
    this.rewardSystem.update(delta, this.player);
    this.orbManager.update(delta, this.player);

    this.enemyManager.processPlayerInteractions(this.player, delta, this.time.now, this.momentum.level);
    this.enemyManager.cleanupDead();

    if (!this.player.dashing && !this.player.jumping) {
      this.enemyManager.checkSolidCollision(this.player, 12);
    }

    this.checkLineCollisions();

    if (this.player.activeSlam) {
      this.enemyManager.processSlam(this.player.activeSlam, this.time.now);
      this.player.activeSlam = null; 
    }

    const playerSpeed = Math.hypot(this.player.vx, this.player.vy);
    this.camera.update(this.player.px, this.player.py, playerSpeed);
    this.renderer.render(this.player, this.momentum, false, 0, this.gameOverReason, this.timeRemaining, delta);
  }

  checkLineCollisions() {
    const lines = this.currentMap.lines || [];
    if (lines.length === 0) return;
    
    const playerRadius = 12;
    const isWallRunning = this.player.wallRun?.isWallRunning;

    // Evaluado 1 vez en lugar de hacerlo en cada iteración
    const canStick = this.player.wallJump && 
                     !this.player.wallJump.wallStick && 
                     !this.player.isStunned && 
                     !this.player.dashing && 
                     this.player.wallJump.wallStickCooldown <= 0 && 
                     (this.player.jumping || !this.player.wallJump.wallStick);

    // Evitamos instanciar variables dentro del loop
    this._p1.x = this.player.prevX; this._p1.y = this.player.prevY;
    this._p2.x = this.player.px; this._p2.y = this.player.py;

    // OPTIMIZACIÓN: 1 solo bucle en lugar de 2. Resolvemos choque y decidimos si nos pegamos o rebotamos.
    for (const line of lines) {
      this.lineCollisionBetween(this._p1, this._p2, line, playerRadius + (line.thickness / 2));
      
      if (this._colResult.collided) {
        if (!canStick && isWallRunning) continue; // Si está corriendo por la pared y no se puede pegar, ignorar rebote

        this.player.px = this._colResult.hitX;
        this.player.py = this._colResult.hitY;

        // Matemáticas de la línea (calculadas solo si hay colisión comprobada)
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

        // Separar de la pared
        if (overlap > 0) {
          this.player.px += finalNx * overlap;
          this.player.py += finalNy * overlap;
        }

        const currentSpeed = Math.hypot(this.player.vx, this.player.vy);

        if (canStick) {
          // Lógica 1: Pegarse a la pared
          this.player.vx = 0;
          this.player.vy = 0;
          const normalAngle = Math.atan2(finalNy, finalNx);
          this.player.stickToWall(normalAngle, currentSpeed, line);
          return; // Salimos de la función al pegarnos
        } else {
          // Lógica 2: Rebote y Daño por Dash
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
          break; // Detenemos la evaluación de colisiones este frame
        }
      }
    }
  }

  // OPTIMIZACIÓN: Zero Allocation (muta `this._colResult` en vez de crear nuevos objetos `{}`)
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
    this._colResult.distance = radius;
  }

  // OPTIMIZACIÓN: Muta `this._closest` en vez de devolver nuevos objetos
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