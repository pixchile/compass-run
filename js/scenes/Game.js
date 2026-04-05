import Player from './Player.js';
import MomentumSystem from './MomentumSystem.js';
import GameRenderer from './GameRenderer.js';
import Camera from './Camera.js';
import EnemyManager from './EnemyManager.js';
import MapLoader from '../systems/MapLoader.js';
import RewardSystem from './RewardSystem.js';
import OrbManager   from './OrbManager.js';
import { HP_DMG_DASH_WALL, DASH_WALL_STUN_DUR } from '../constants.js';

export default class Game extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.mapName = data?.mapName || 'default';
  }

  create() {
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

    // NUEVO: conectar momentum al enemyManager para dar stacks al matar enemigos
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

      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.restartGame();
      }
      if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
        this.scene.start('MainMenu');
      }
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

    this.player.update(delta, this.momentum, this.enemyManager);
    this.momentum.update(delta, this.player);
    this.enemyManager.update(delta, this.time.now);
    this.rewardSystem.update(delta, this.player);
    this.orbManager.update(delta, this.player);

    if (!this.player.dashing && !this.player.isInvincible) {
      this.enemyManager.checkNormalCollisions(this.player, this.time.now, (enemy) => {
        this.player.takeEnemyDamage();
      });
    }

    this.checkLineCollisions();

    const playerSpeed = Math.hypot(this.player.vx, this.player.vy);
    this.camera.update(this.player.px, this.player.py, playerSpeed);
    this.renderer.render(this.player, this.momentum, false, 0, this.gameOverReason, this.timeRemaining, delta);
  }

  checkLineCollisions() {
      const lines = this.currentMap.lines || [];
      if (!lines || lines.length === 0) return;

      const playerRadius = 12;

      const canStick = !this.player.wallJump.wallStick && 
                       !this.player.isStunned && 
                       !this.player.dashing && 
                       this.player.wallJump.wallStickCooldown <= 0 && 
                       (this.player.jumping || !this.player.wallJump.wallStick); 

      if (canStick) {
        for (const line of lines) {
          const collision = this.lineCollisionBetween(
            { x: this.player.prevX, y: this.player.prevY },
            { x: this.player.px, y: this.player.py },
            line,
            playerRadius + (line.thickness / 2)
          );

          if (collision.collided) {
            this.player.px = collision.hitX;
            this.player.py = collision.hitY;

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
            const normalAngle = Math.atan2(finalNy, finalNx);

            const overlap = (playerRadius + line.thickness / 2) - collision.distance;
            if (overlap > 0) {
              this.player.px += finalNx * overlap;
              this.player.py += finalNy * overlap;
            }

            const currentSpeed = Math.hypot(this.player.vx, this.player.vy);
            
            this.player.vx = 0;
            this.player.vy = 0;

            this.player.stickToWall(normalAngle, currentSpeed);
            return; 
          }
        }
      }

      for (const line of lines) {
        const collision = this.lineCollisionBetween(
          { x: this.player.prevX, y: this.player.prevY },
          { x: this.player.px, y: this.player.py },
          line,
          playerRadius + (line.thickness / 2)
        );

        if (collision.collided) {
          this.player.px = collision.hitX;
          this.player.py = collision.hitY;

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

          const overlap = (playerRadius + line.thickness / 2) - collision.distance;
          if (overlap > 0) {
            this.player.px += finalNx * overlap;
            this.player.py += finalNy * overlap;
          }

          const dotV = this.player.vx * finalNx + this.player.vy * finalNy;
          let impactSpeed = 0;
          
          if (dotV < 0) { 
            impactSpeed = -dotV;
            this.player.vx -= dotV * finalNx;
            this.player.vy -= dotV * finalNy;
          }

          if (this.player.dashing) {
              const wallDamage = Math.floor(HP_DMG_DASH_WALL * impactSpeed);
              
              this.player.stunT = DASH_WALL_STUN_DUR;
              this.momentum.halveStacks();
              this.player.takeDamage(wallDamage);
              this.player.dashing = false;
              this.player.vx = 0;
              this.player.vy = 0;
          }
          break;
        }
      }
  }

  lineCollisionBetween(p1, p2, line, radius) {
    const start = line.start;
    const end = line.end;

    const closestPoint = this.closestPointOnLine(p1, start, end);
    const toClosestX = closestPoint.x - p1.x;
    const toClosestY = closestPoint.y - p1.y;

    const distToClosest = Math.hypot(toClosestX, toClosestY);

    const moveX = p2.x - p1.x;
    const moveY = p2.y - p1.y;
    const moveLen = Math.hypot(moveX, moveY);

    if (distToClosest < radius) {
      const dotInit = moveX * toClosestX + moveY * toClosestY;
      
      if (moveLen === 0 || dotInit > 0) {
        return {
          collided: true,
          hitX: p1.x,
          hitY: p1.y,
          distance: distToClosest
        };
      }
    }

    if (moveLen === 0) return { collided: false };

    const dirX = moveX / moveLen;
    const dirY = moveY / moveLen;
    const dot = toClosestX * dirX + toClosestY * dirY;

    if (dot <= 0) return { collided: false };

    const perpX = toClosestX - dot * dirX;
    const perpY = toClosestY - dot * dirY;
    const perpDist = Math.hypot(perpX, perpY);

    if (perpDist >= radius) return { collided: false };

    const tCollide = dot - Math.sqrt(radius * radius - perpDist * perpDist);

    if (tCollide < 0 || tCollide > moveLen) return { collided: false };

    const hitX = p1.x + dirX * tCollide;
    const hitY = p1.y + dirY * tCollide;

    return {
      collided: true,
      hitX: hitX,
      hitY: hitY,
      distance: radius
    };
  }

  closestPointOnLine(p, a, b) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;

    if (len2 === 0) return { x: a.x, y: a.y };

    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
    t = Math.max(0, Math.min(1, t));

    return {
      x: a.x + t * abx,
      y: a.y + t * aby
    };
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

    // NUEVO: reconectar momentum tras el restart
    this.enemyManager.setMomentumSystem(this.momentum);

    this.renderer.clearGameOver();
  }
}