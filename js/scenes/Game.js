import Player from './player/Player.js';
import MomentumSystem from './MomentumSystem.js';
import CompassSystem from './CompassSystem.js';
import GameRenderer from './GameRenderer.js';
import Camera from './Camera.js';
import enemyRegistry from '../enemies/EnemyRegistry.js';
import EnemyManager from './EnemyManager.js';
import JSONMapLoader from '../systems/JSONMapLoader.js';
import RewardSystem from './RewardSystem.js';
import OrbManager from './OrbManager.js';
import CollisionSystem from '../systems/CollisionSystem.js';
import SpatialGrid from '../utils/SpatialGrid.js';
import ZoneSystem from '../systems/ZoneSystem.js';
import ShopSystem from '../systems/ShopSystem.js';
import ShopUI from './ShopUI.js';
import ItemEffects from '../systems/ItemEffects.js';
import { registerAllCustomEnemies } from '../enemies/definitions/index.js';
import BossManager from '../boss/BossManager.js';
import bossRegistry from '../boss/BossDefinitions.js';

export default class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        this._visibleLines = [];

        this.collisionSystem = new CollisionSystem();
        this.zoneSystem      = new ZoneSystem();
        this.shopSystem      = new ShopSystem();
        this.itemEffects     = null; // se instancia en create()
    }

    init(data) {
        this.mapName  = data?.mapName  || 'default';
        this.stageName = data?.stageName || null;
    }

    async create() {
        registerAllCustomEnemies(enemyRegistry);
        this.mapLoader = new JSONMapLoader();

        this.currentMap = await this.mapLoader.loadMapFromURL(`assets/maps/${this.mapName}.json`);
        
        if (!this.currentMap) {
            this.currentMap = { arena: { x: 50, y: 50, w: 2000, h: 2000 }, lines: [], zones: [] };
        }

        // Spatial grid para consultas de muros O(1)
        this.wallGrid = new SpatialGrid(250);
        this.wallGrid.build(this.currentMap.lines || []);

        // ─── Cargar datos de stage (enemigos, etc.) ──────────────────
        if (this.stageName) {
            try {
                const stages = JSON.parse(localStorage.getItem('cr_stages') || '[]');
                const stage = stages.find(s => s.name === this.stageName);
                if (stage) {
                    this.currentMap.enemies = stage.enemies || [];
                    this.currentMap.spawners = stage.spawners || [];
                    this.currentMap.density = stage.density || null;
                    this.currentMap.squads = stage.squads || [];
                    this.currentMap.squadInstances = stage.squadInstances || [];
                    this.currentMap.boss = stage.boss || null;
                    if (stage.timeLimit) this.currentMap.timeLimit = stage.timeLimit;
                }
            } catch (e) { console.warn("Error loading stage:", e); }
        }

        this.gameOver = false;
        this.gameOverAlpha = 0;
        this.gameOverReason = null;
        this._gpPrevA = false;
        this._gpPrevStart = false;

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
        this.enemyManager.setSquads(this.currentMap.squads || [], this.currentMap.squadInstances || []);

        this.renderer = new GameRenderer(this, this.camera, this);
        this.renderer.setCustomLines(this.currentMap.lines || []);
        this.renderer.setCustomZones(this.currentMap.zones || []);

        // Load background image if specified
        if (this.currentMap.background) {
            this.renderer.loadBackground(`assets/maps/backgrounds/${this.currentMap.background}`);
        }

        this.restartKey = this.input.keyboard.addKey('SPACE');
        this.menuKey = this.input.keyboard.addKey('M');
        this.pauseKey = this.input.keyboard.addKey('ESC');
        this.pauseKey2 = this.input.keyboard.addKey('P');
        this.isPaused = false;

        this.rewardSystem = new RewardSystem();
        this.orbManager = new OrbManager();
        this.enemyManager.setRewardHandlers(this.rewardSystem, this.orbManager);

        this.compass.setReferences(this.momentum, this.rewardSystem, this);
        this.enemyManager.setMomentumSystem(this.momentum);

        // ─── Boss System ──────────────────────────────────────────
        const bossArena = this.currentMap.arena || { x: 55, y: 58, w: 4000, h: 4000 };
        this.bossManager = new BossManager(this, bossArena, this.enemyManager);

        // Si el stage tiene un boss definido, registrarlo en el spawner para activación por timeline
        if (this.currentMap.boss) {
            const bossDef = bossRegistry.get(this.currentMap.boss.type);
            if (bossDef) {
                this._pendingBossSpawn = {
                    def:  bossDef,
                    time: this.currentMap.boss.spawnTime ?? 0,
                    x:    this.currentMap.boss.x ?? (bossArena.x + bossArena.w / 2),
                    y:    this.currentMap.boss.y ?? (bossArena.y + bossArena.h / 2),
                    spawned: false,
                };
            }
        }
        this.shopSystem.reset();
        this.shopSystem.setScene(this);
        this.itemEffects = new ItemEffects(this);
        this.shopUI = new ShopUI(this);

        // Inicializar solo las tiendas que existen en el mapa
        const shopIds = this._collectShopIds(this.currentMap.zones || []);
        this.shopSystem.initShops(shopIds);

        // Dar referencia de la escena al ZoneSystem
        this.zoneSystem.setScene(this);
    }

    spawnDamageNumber(x, y, value, colorKey) {
        this.renderer?.damageNumbers?.spawn(x, y, value, colorKey, this.camera);
    }

    /**
     * Extrae los shopId únicos de las zonas de tipo 'shop'
     */
    _collectShopIds(zones) {
        const ids = new Set();
        for (const zone of zones) {
            if (zone.type === 'shop' && zone.tags) {
                ids.add(zone.tags.join('_'));
            }
        }
        // Si no hay ninguna, ponemos una por defecto para que no falle
        if (ids.size === 0) {
            ids.add('shop_default');
        }
        return Array.from(ids);
    }

    hasLineOfSight(x1, y1, x2, y2, lines) {
        const gridWalls = this.wallGrid?.queryLine(x1, y1, x2, y2);
        const walls = (gridWalls && gridWalls.length > 0) ? gridWalls : (lines || []);
        for (const line of walls) {
            if (line._broken) continue;
            if (this._segmentsIntersect(
                x1, y1, x2, y2,
                line.start.x, line.start.y, line.end.x, line.end.y
            )) return false;
        }
        return true;
    }

    _segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        const d1 = this._orient(x1, y1, x2, y2, x3, y3);
        const d2 = this._orient(x1, y1, x2, y2, x4, y4);
        const d3 = this._orient(x3, y3, x4, y4, x1, y1);
        const d4 = this._orient(x3, y3, x4, y4, x2, y2);
        if (d1 !== d2 && d3 !== d4) return true;
        if (d1 === 0 && this._inRange(x3, x1, x2) && this._inRange(y3, y1, y2)) return true;
        if (d2 === 0 && this._inRange(x4, x1, x2) && this._inRange(y4, y1, y2)) return true;
        if (d3 === 0 && this._inRange(x1, x3, x4) && this._inRange(y1, y3, y4)) return true;
        if (d4 === 0 && this._inRange(x2, x3, x4) && this._inRange(y2, y3, y4)) return true;
        return false;
    }

    _orient(px, py, qx, qy, rx, ry) {
        const v = (qy - py) * (rx - qx) - (qx - px) * (ry - qy);
        if (v === 0) return 0;
        return v > 0 ? 1 : -1;
    }

    _inRange(v, a, b) { return v >= Math.min(a, b) && v <= Math.max(a, b); }

    update(t, delta) {
        if (!this.currentMap) return;

        if (!this.gameOver && !this.player.isDead && !this.shopUI?.visible) {
            const now = this.time.now;
            const tickInterval = 1000;
            if (now - this.lastTimeUpdate >= tickInterval) {
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
            if (Phaser.Input.Keyboard.JustDown(this.restartKey) || this._gamepadAJustPressed())
              this.restartGame();
            if (Phaser.Input.Keyboard.JustDown(this.menuKey)) this.scene.start('MainMenu');
            this.renderer.render(this.player, this.compass, true, this.gameOverAlpha, this.gameOverReason, this.timeRemaining, delta);
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.pauseKey) || Phaser.Input.Keyboard.JustDown(this.pauseKey2) || this._gamepadStartJustPressed()) {
            if (this.shopUI?.visible) {
                this.shopUI.close(true); // ESC = cierre manual
                return;
            }
            this.isPaused = !this.isPaused;
            if (this.isPaused) {
                this.renderer.uiManager.showPauseStats(this.player, this.compass);
            } else {
                this.renderer.uiManager.hidePauseStats();
            }
        }
        if (this.isPaused) return;

        // Zonas (daño, void, tienda...) - siempre correr para detectar salida de shop
        this.zoneSystem.checkZones(this.player, this.currentMap.zones, delta);

        if (this.shopUI?.visible) {
            this.shopUI.update();
            const elapsedSeconds = (this.time.now - (this.enemyManager.spawner.gameStartTime || this.time.now)) / 1000;
            this.renderer.render(this.player, this.compass, false, 0, this.gameOverReason, this.timeRemaining, delta, elapsedSeconds);
            return;
        }

        // Capturar posición antes del movimiento para el sweep de colisión
        this.player.update(delta, this.momentum);
        this.compass.update(delta, this.player, this.time.now);
        this.momentum.updateDecay(delta);

        this._visibleLines = (this.currentMap.lines || []).filter(l => !l._broken);

        this.enemyManager.update(delta, this.time.now, this.player, this._visibleLines);
        this.bossManager?.update(delta, this.player);

        // Spawn de boss por timeline
        if (this._pendingBossSpawn && !this._pendingBossSpawn.spawned) {
            const elapsed = this.timeLimit - this.timeRemaining;
            if (elapsed >= this._pendingBossSpawn.time) {
                this._pendingBossSpawn.spawned = true;
                console.log(`[Game] Spawning boss at elapsed=${elapsed}s, pos=(${this._pendingBossSpawn.x}, ${this._pendingBossSpawn.y})`);
                this.bossManager.spawn(
                    this._pendingBossSpawn.def,
                    this._pendingBossSpawn.x,
                    this._pendingBossSpawn.y
                );
            }
        }
        this.itemEffects?.update(delta, this.player, this.momentum, this.enemyManager);
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

        const playerWallLines = this.wallGrid.query(this.player.px, this.player.py, 80);

        if (steps > 1) {
            const midX = (this.player.prevX + this.player.px) / 2;
            const midY = (this.player.prevY + this.player.py) / 2;
            const endX = this.player.px; const endY = this.player.py;

            this.player.px = midX; this.player.py = midY;
            this.collisionSystem.checkLineCollisions(this.player, this.momentum, playerWallLines, this.itemEffects);

            this.player.prevX = this.player.px; this.player.prevY = this.player.py;
            this.player.px = endX; this.player.py = endY;
            this.collisionSystem.checkLineCollisions(this.player, this.momentum, playerWallLines, this.itemEffects);
        } else {
            this.collisionSystem.checkLineCollisions(this.player, this.momentum, playerWallLines, this.itemEffects);
        }

        this.enemyManager.checkImpenetrableCollision(this.player, 12);

        if (this.player.activeSlam) {
            this.enemyManager.processSlam(this.player.activeSlam, this.time.now, this.momentum);
            this.player.activeSlam = null;
        }

        const playerSpeed = Math.hypot(this.player.vx, this.player.vy);
        this.camera.update(this.player.px, this.player.py, playerSpeed);
        this.renderer.setCustomLines(this._visibleLines);
        const elapsedSeconds = (this.time.now - (this.enemyManager.spawner.gameStartTime || this.time.now)) / 1000;
        this.renderer.render(this.player, this.compass, false, 0, this.gameOverReason, this.timeRemaining, delta, elapsedSeconds);
    }

    _gamepadAJustPressed() {
        const gamepads = navigator.getGamepads();
        if (!gamepads) return false;
        for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i];
            if (!gp) continue;
            const down = gp.buttons[0]?.pressed || false;
            const just = down && !this._gpPrevA;
            this._gpPrevA = down;
            return just;
        }
        this._gpPrevA = false;
        return false;
    }

    _gamepadStartJustPressed() {
        const gamepads = navigator.getGamepads();
        if (!gamepads) return false;
        for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i];
            if (!gp) continue;
            const down = gp.buttons[9]?.pressed || false;
            const just = down && !this._gpPrevStart;
            this._gpPrevStart = down;
            return just;
        }
        this._gpPrevStart = false;
        return false;
    }

    restartGame() {
        this.isPaused = false;
        this.renderer.uiManager.hidePauseStats();
        this.gameOver = false; this.gameOverAlpha = 0; this.gameOverReason = null;
        this.timeRemaining = this.timeLimit; this.lastTimeUpdate = this.time.now;

        this.player = new Player(this);
        this.momentum = new MomentumSystem();
        this.compass = new CompassSystem();
        this.compass.setReferences(this.momentum, this.rewardSystem, this);
        this.rewardSystem.reset();
        this.orbManager.reset();
        this.shopSystem.reset();
        this.itemEffects?.reset();
        if (this.shopUI?.visible) this.shopUI.close();

        // Reinicializar tiendas con los mismos shopIds del mapa
        const shopIds = this._collectShopIds(this.currentMap.zones || []);
        this.shopSystem.initShops(shopIds);

        this.camera.x = this.camera.viewWidth / 2; this.camera.y = this.camera.viewHeight / 2;
        this.camera.zoom = 1.0; this.camera.targetZoom = 1.0;

        // Limpiar zonas dinamicas (fuego CCC) y restaurar muros destruidos
        this.currentMap.zones = this.currentMap.zones.filter(z => !z._isFire);
        for (const line of this.currentMap.lines) {
            if (line._broken) { line._broken = false; line.hp = line._origHp; }
        }
        this.renderer?.setCustomZones(this.currentMap.zones);
        this.renderer?.setCustomLines(this.currentMap.lines);

        this.renderer?.damageNumbers?.reset();
        this.renderer?.uiManager?.resetElapsedTime();
        this.enemyManager.clearAll();
        this.enemyManager.setSpawnList(this.currentMap.enemies || []);
        this.enemyManager.setMomentumSystem(this.momentum);
        // Reset BossManager
        if (this.bossManager) {
            const bossArena = this.currentMap.arena || { x: 55, y: 58, w: 4000, h: 4000 };
            this.bossManager = new BossManager(this, bossArena, this.enemyManager);
        }
        if (this._pendingBossSpawn) this._pendingBossSpawn.spawned = false;
        // Reload background image on restart
        if (this.currentMap.background) {
            this.renderer.loadBackground(`assets/maps/backgrounds/${this.currentMap.background}`);
        }
        if (this.renderer && this.renderer.clearGameOver) this.renderer.clearGameOver();
    }
}