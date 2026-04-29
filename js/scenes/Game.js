import Player from './player/Player.js';
import MomentumSystem from './MomentumSystem.js';
import CompassSystem from './CompassSystem.js';
import GameRenderer from './GameRenderer.js';
import Camera from './Camera.js';
import enemyRegistry from '../enemies/EnemyRegistry.js';
import EnemyManager from './EnemyManager.js';
import SVGMapLoader from '../systems/SVGMapLoader.js';
import RewardSystem from './RewardSystem.js';
import OrbManager from './OrbManager.js';
import CollisionSystem from '../systems/CollisionSystem.js';

import ZoneSystem from '../systems/ZoneSystem.js';
import { registerAllCustomEnemies } from '../enemies/definitions/index.js';

export default class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        this._visibleLines = [];
        this._wallEnemyLines = [];

        this.collisionSystem = new CollisionSystem();
        this.zoneSystem = new ZoneSystem();
        this.isPaused = false;   // NUEVO
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
            this.currentMap = { arena: { x: 50, y: 50, w: 2000, h: 2000 }, lines: [], zones: [] };
        }

        if (this.stageName) {
            try {
                const stages = JSON.parse(localStorage.getItem('cr_stages') || '[]');
                const stage = stages.find(s => s.name === this.stageName);
                if (stage) {
                    this.currentMap.enemies = stage.enemies || [];
                    this.currentMap.spawners = stage.spawners || [];
                    this.currentMap.density = stage.density || null;
                    if (stage.timeLimit) this.currentMap.timeLimit = stage.timeLimit;
                }
            } catch (e) { console.warn("Error loading stage:", e); }
        }

        this.gameOver = false;
        this.gameOverAlpha = 0;
        this.gameOverReason = null;

        this.timeLimit = this.currentMap.timeLimit || 300;
        this.timeRemaining = this.timeLimit;
        this.lastTimeUpdate = this.time.now;

        this.player = new Player(this);

        this.momentum = new MomentumSystem();
        this.compass = new CompassSystem();
        this.compass.setReferences(this.momentum, null, this);

        this.camera = new Camera();

        const arenaBounds = this.currentMap.arena || { x: 55, y: 58, w: 4000, h: 4000 };
        this.enemyManager = new EnemyManager(this, arenaBounds);
        this.enemyManager.setSpawnList(this.currentMap.enemies || []);
        this.enemyManager.setDensity(this.currentMap.density || null);
        this.enemyManager.setSpawners(this.currentMap.spawners || []);

        this.renderer = new GameRenderer(this, this.camera, this);
        this.renderer.setCustomLines(this.currentMap.lines || []);
        this.renderer.setCustomZones(this.currentMap.zones || []);

        this.restartKey = this.input.keyboard.addKey('SPACE');
        this.menuKey = this.input.keyboard.addKey('M');
        this.pauseKey = this.input.keyboard.addKey('ESC');   // NUEVO
        this.pKey = this.input.keyboard.addKey('P');         // NUEVO

        this.rewardSystem = new RewardSystem();
        this.orbManager = new OrbManager();
        this.enemyManager.setRewardHandlers(this.rewardSystem, this.orbManager);

        this.compass.setReferences(this.momentum, this.rewardSystem, this);
        this.enemyManager.setMomentumSystem(this.momentum);
    }

    update(t, delta) {
        if (!this.currentMap) return;

        // ── Toggle pausa ──
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey) || Phaser.Input.Keyboard.JustDown(this.pKey)) {
            this.isPaused = !this.isPaused;
            if (!this.isPaused) {
                this.renderer.uiManager.hidePauseStats();
            }
        }

        if (this.isPaused) {
            // Mostrar panel de estadísticas y congelar el juego
            this.renderer.uiManager.showPauseStats(this.player, this.compass);
            this.renderer.render(this.player, this.compass, false, 0, null, this.timeRemaining, delta);
            return;
        }

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

        if (this.gameOver || this.player.isDead) {
            if (this.player.isDead) { this.gameOver = true; this.gameOverReason = 'death'; }
            this.gameOverAlpha = Math.min(1, this.gameOverAlpha + delta / 500);
            if (Phaser.Input.Keyboard.JustDown(this.restartKey)) this.restartGame();
            if (Phaser.Input.Keyboard.JustDown(this.menuKey)) this.scene.start('MainMenu');
            this.renderer.render(this.player, this.compass, true, this.gameOverAlpha, this.gameOverReason, this.timeRemaining, delta);
            return;
        }

        // Capturar posición antes del movimiento para el sweep de colisión
        this.player.update(delta, this.momentum);
        this.compass.update(delta, this.player, this.time.now);
        this.momentum.updateDecay(delta, this.time.now);

        this._visibleLines = (this.currentMap.lines || []).filter(l => !l._broken);

        this.enemyManager.update(delta, this.time.now, this.player, this._visibleLines);
        this.rewardSystem.update(delta, this.player);
        this.orbManager.update(delta, this.player);

        this.enemyManager.processPlayerInteractions(this.player, delta, this.time.now, this.momentum);
        this.enemyManager.cleanupDead();

        if (!this.player.dashing && !this.player.jumping) {
            this.enemyManager.checkSolidCollision(this.player, 12);
        }

        // Capturar posición post-física pre-colisión.
        this.player.prevX = this.player.px - this.player.vx * (delta / 1000);
        this.player.prevY = this.player.py - this.player.vy * (delta / 1000);

        const frameDist = Math.hypot(this.player.px - this.player.prevX, this.player.py - this.player.prevY);
        const steps = frameDist > 16 ? 2 : 1;

        if (steps > 1) {
            const midX = (this.player.prevX + this.player.px) / 2;
            const midY = (this.player.prevY + this.player.py) / 2;
            const endX = this.player.px; const endY = this.player.py;

            this.player.px = midX; this.player.py = midY;
            this.collisionSystem.checkLineCollisions(this.player, this.momentum, this._visibleLines);

            this.player.prevX = this.player.px; this.player.prevY = this.player.py;
            this.player.px = endX; this.player.py = endY;
            this.collisionSystem.checkLineCollisions(this.player, this.momentum, this._visibleLines);
        } else {
            this.collisionSystem.checkLineCollisions(this.player, this.momentum, this._visibleLines);
        }

        this.zoneSystem.checkZones(this.player, this.currentMap.zones);

        this._wallEnemyLines = this.enemyManager.getWallEnemyLines();
        if (this._wallEnemyLines && this._wallEnemyLines.length > 0) {
            this.collisionSystem.checkLineCollisions(this.player, this.momentum, this._wallEnemyLines);
        }

        if (this.player.activeSlam) {
            this.enemyManager.processSlam(this.player.activeSlam, this.time.now);
            this.player.activeSlam = null;
        }

        const playerSpeed = Math.hypot(this.player.vx, this.player.vy);
        this.camera.update(this.player.px, this.player.py, playerSpeed);
        this.renderer.setCustomLines(this._visibleLines);
        this.renderer.render(this.player, this.compass, false, 0, this.gameOverReason, this.timeRemaining, delta);
    }

    restartGame() {
        this.gameOver = false; this.gameOverAlpha = 0; this.gameOverReason = null;
        this.timeRemaining = this.timeLimit; this.lastTimeUpdate = this.time.now;

        this.player = new Player(this);
        this.momentum = new MomentumSystem();
        this.compass = new CompassSystem();
        this.compass.setReferences(this.momentum, this.rewardSystem, this);
        this.rewardSystem.reset();
        this.orbManager.reset();

        this.camera.x = this.camera.viewWidth / 2; this.camera.y = this.camera.viewHeight / 2;
        this.camera.zoom = 1.0; this.camera.targetZoom = 1.0;

        this.enemyManager.clearAll();
        this.enemyManager.setSpawnList(this.currentMap.enemies || []);
        this.enemyManager.setMomentumSystem(this.momentum);
        if (this.renderer && this.renderer.clearGameOver) this.renderer.clearGameOver();

        this.isPaused = false;   // Asegurar que no quede en pausa tras reiniciar
    }
}