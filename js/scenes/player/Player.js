import { W, H, TRAIL_MAX, MAX_SPD, TURN_K, STOP_K, JUMP_DUR, JUMP_HMAX, JUMP_DIST_K, DASH_DUR, DASH_CD, DASH_SPD, SLAM } from '../../constants.js';
import { WallJumpSystem } from '../PlayerWallJump.js';
import PlayerInput from './PlayerInput.js';
import PlayerHealth from './PlayerHealth.js';
import PlayerCombat from './PlayerCombat.js';

export default class Player {
    constructor(scene) {
        this.scene = scene;
        this.px = W / 2;  this.py = H / 2;
        this.prevX = this.px; this.prevY = this.py;
        this.vx = 0;      this.vy = 0;
        this.facing = 0;

        // Sub-sistemas
        this.input = new PlayerInput(scene);
        this.health = new PlayerHealth(this);
        this.combat = new PlayerCombat(this);
        this.wallJump = new WallJumpSystem(scene, this);

        // Estados
        this.jumping = false; this.jumpT = 0; this.jumpDur = 0; this.jumpHMax = 0; this.jumpVx = 0; this.jumpVy = 0; this.jumpLv = 1;
        this.landFx = 0;
        this.dashing = false; this.dashT = 0; this.dashVx = 0; this.dashVy = 0; this.dashCD = 0; this.dashInitialSpeed = 0;
        this.stunT = 0;
        this.holdingSpace = false;   // NUEVO: si mantiene Espacio presionado
        this._stickState = false;        // BBC: stuck to enemy
        this._stickTimer = 0;           // remaining ms before auto-kick
        this._stickEnemy = null;        // enemy reference while stuck
        this.attackRadiusMultiplier = 0;
        this.damageMultiplierBonus = 0;
        this._addRebound = false;  // ADD: Amortiguador — rebote tras dash contra muro
        this._dabBreaks = 0;      // DAB: Maestría — quiebres durante el dash
        this._vampireSpeed = false; // CAD: Vampiro — +40% vel. cerca de orbe
        
        this.moveDir = { x: 0, y: 0 };
        this.trail = []; 
        this.wasJumpingWhenDashed = false;
        this.currentWallLine = null;
    }

    // Getters / Delegaciones
    get isStunned() { return this.stunT > 0; }
    get isDead() { return this.health.isDead; }
    get isGrounded() { return !this.jumping && !this.wallJump.wallStick; }
    get hp() { return this.health.hp; }
    get activeSlam() { return this.combat.activeSlam; }
    set activeSlam(val) { this.combat.activeSlam = val; }

    takeEnemyDamage(mult) { this.health.takeEnemyDamage(mult); }
    getCurrentAttackPayload(lvl) { return this.combat.getCurrentAttackPayload(lvl); }
    lerpK(k, dt) { return 1 - Math.pow(1 - k, dt * 60); }

    isMovingInCompassDirection(momentum, currentSpeed) {
        if (currentSpeed < 15) return false;
        const compass = this.scene?.compass;
        if (!compass) return false;
        const pd = compass.primaryDir;
        if (!pd) return false;
        let diff = Math.abs(Math.atan2(this.vy, this.vx) - Math.atan2(pd.dy, pd.dx));
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        return (diff * (180 / Math.PI)) <= 22.5;
    }

    stickToWall(wallNormalAngle, currentSpeed, wallLine) {
        if (this.wallJump.wallStickCooldown > 0 || !this.wallJump.canStick(this.jumping, this.wallJump.wallStickCooldown)) return false;

        this.vx = 0; this.vy = 0; this.jumpVx = 0; this.jumpVy = 0;
        this.dashing = false; this.jumping = false;
        this.combat.activeSlam = null;
        this._stickState = false; this._stickTimer = 0; this._stickEnemy = null;
        this.currentWallLine = wallLine;

        return this.wallJump.stick(wallNormalAngle, currentSpeed);
    }

    update(delta, momentum) {
        const dt = delta / 1000;
        const lv = momentum.level;
        const now = this.scene.time.now;
        const currentSpeed = Math.hypot(this.vx, this.vy);

        // Actualizar Subsistemas
        this.input.update();
        this.health.update(delta, dt, this.wallJump.wallStick);
        this.combat.update(delta);

        this.moveDir = this.input.getMoveDirection();
        // Bloquear movimiento si el shop está abierto
        if (this.scene?.shopUI?.visible) {
            this.moveDir = { x: 0, y: 0 };
            this.holdingSpace = false;
        } else {
            this.holdingSpace = this.input.isSpaceDown();
        }
        // Trap: no horizontal input while grounded (can still jump to escape)
        if (this.trapped && this.isGrounded) {
            this.moveDir = { x: 0, y: 0 };
        }
        const moving = this.moveDir.x !== 0 || this.moveDir.y !== 0;

        this.stunT = Math.max(0, this.stunT - delta);
        this.slowTimer  = Math.max(0, (this.slowTimer  || 0) - delta);
        this.noJumpTimer = Math.max(0, (this.noJumpTimer || 0) - delta);
        this.dashCD = Math.max(0, this.dashCD - delta);
        this.landFx = Math.max(0, this.landFx - delta);

        // BBC: stick timer — auto-kick tras 1s sin saltar
        if (this._stickState) {
            this._stickTimer -= delta;
            if (this._stickTimer <= 0) {
                this._stickState = false;
                this._stickTimer = 0;
                this.scene?.itemEffects?.onStickExpired(this._stickEnemy);
                this._stickEnemy = null;
            }
        }

        // Limpiar stick si se entra en estado incompatible
        if (this._stickState && (this.dashing || this.wallJump.wallStick || this.isStunned)) {
            this.scene?.itemEffects?.onStickExpired(this._stickEnemy);
            this._stickState = false;
            this._stickTimer = 0;
            this._stickEnemy = null;
        }

        const wallResult = this.wallJump.update(delta, (vx, vy) => {
            this.vx = vx; this.vy = vy; this.jumping = true;
        });
        if (wallResult?.timeout) this.jumping = true;

        if (this.dashing) {
            this.dashT += delta;
            if (this.dashT >= DASH_DUR) this.dashing = false;
        }

        if (this.jumping && !this.wallJump.wallStick) {
            this.jumpT += delta;
            if (this.jumpT >= this.jumpDur) {
                this.jumping = false; this.combat.activeSlam = null;
                this._addRebound = false;
                this.landFx = this.jumpLv >= 3 ? 420 : this.jumpLv >= 2 ? 210 : 0;
            }
        }

        // Lógica de Inputs
        if (this.input.isSpaceJustPressed() && !this.isStunned && this.noJumpTimer <= 0) {
            if (this.wallJump.wallStick) {
                const jumpResult = this.wallJump.tryJump(
                    this.moveDir, momentum, () => this.moveDir,
                    (m) => this.isMovingInCompassDirection(m, currentSpeed), now
                );
                if (jumpResult?.success) {
                    this.vx = jumpResult.vx; this.vy = jumpResult.vy;
                    this.jumping = true; this.jumpT = 0; this.jumpDur = JUMP_DUR[lv]; this.jumpLv = lv;
                    this.jumpVx = this.vx; this.jumpVy = this.vy;
                    this.combat.hasSlammedThisJump = false; 
                }
            } else if (this.jumping && !this.combat.hasSlammedThisJump && (this.combat.slamCooldown <= 0 || this._addRebound)) {
                if (currentSpeed >= SLAM.MIN_SPEED) this.combat.performSlam(currentSpeed, this._addRebound);
                this._addRebound = false;
            } else if (this.dashing && !this.jumping) {
                this.jumping = true; this.jumpT = 0; this.jumpDur = JUMP_DUR[lv]; this.jumpHMax = JUMP_HMAX[lv]; this.jumpLv = lv;
                this.jumpVx = this.vx; this.jumpVy = this.vy;
                this.dashing = false; this.combat.hasSlammedThisJump = false;
            } else if (this._stickState) {
                // BBC: Space durante stick — saltar del enemigo en 8 direcciones
                let dirX = 0, dirY = 0;
                const kb = this.input.kb;
                if (kb.W.isDown) dirY -= 1;
                if (kb.S.isDown) dirY += 1;
                if (kb.A.isDown) dirX -= 1;
                if (kb.D.isDown) dirX += 1;
                // Sin input direccional: saltar hacia arriba
                if (dirX === 0 && dirY === 0) dirY = -1;
                const len = Math.hypot(dirX, dirY);
                dirX /= len; dirY /= len;

                const enemy = this._stickEnemy;
                this._stickState = false;
                this._stickTimer = 0;
                this._stickEnemy = null;
                this.scene?.itemEffects?.onJumpOffEnemy(this, enemy, dirX, dirY, this.scene.momentum);
            } else if (!this.jumping && !this.wallJump.wallStick) {
                this.jumping = true; this.jumpT = 0; this.jumpDur = JUMP_DUR[lv]; this.jumpHMax = JUMP_HMAX[lv]; this.jumpLv = lv;
                if (currentSpeed > 8) {
                    this.jumpVx = this.vx * JUMP_DIST_K[lv]; this.jumpVy = this.vy * JUMP_DIST_K[lv];
                } else {
                    this.jumpVx = Math.cos(this.facing) * MAX_SPD[1] * 0.45; this.jumpVy = Math.sin(this.facing) * MAX_SPD[1] * 0.45;
                }
                this.combat.hasSlammedThisJump = false; 
            }
        }

        if (this.input.isShiftJustPressed() && !this.dashing && !this.isStunned) {
            if (this.wallJump.wallStick) {
                this.wallJump._release();
            } else if (!this.holdingSpace) {
                const fx = this.scene?.itemEffects;

                // CCG Builder: Shift while stationary → place wall
                const kb = this.input.kb;
                const isStationary = !kb.W.isDown && !kb.A.isDown && !kb.S.isDown && !kb.D.isDown;
                if (isStationary && fx?.tryPlaceBuilderWall(this)) {
                    // wall placed, skip dash
                } else {

                // Calcular dirección y velocidad del dash (independiente de si hay agarre)
                const dashDirX  = currentSpeed > 8 ? this.vx / currentSpeed : Math.cos(this.facing);
                const dashDirY  = currentSpeed > 8 ? this.vy / currentSpeed : Math.sin(this.facing);
                const speedMult = fx?.getDashSpeedMult() ?? 1;
                const dashSpeed = currentSpeed * DASH_SPD * speedMult;

                // AAB: si hay enemigo agarrado, lanzarlo — el dash NO ocurre, sin CD
                if (fx?.aabGrabbed && fx.onDashWhileGrabbing(this, dashDirX, dashDirY, dashSpeed)) {
                    // lanzamiento ejecutado

                } else if (!fx?.aabGrabbed && (this.jumping || this.dashCD === 0)) {
                    // dash: aéreo sin CD, terrestre requiere CD
                    const dashCDValue = this._dashCDBase || DASH_CD;
                    this.dashing = true; this.dashT = 0;
                    if (!this.jumping) this.dashCD = dashCDValue;
                    this.wasJumpingWhenDashed = this.jumping;
                    this.dashInitialSpeed = dashSpeed;
                    this._dabBreaks = 0;

                    // AAA: Berserker — coste de HP
                    if (fx?.has('AAA')) {
                        const cost = fx.getAAACost(this);
                        if (cost > 0) this.health.takeDamage(cost);
                    }

                    this.dashVx = dashDirX * this.dashInitialSpeed;
                    this.dashVy = dashDirY * this.dashInitialSpeed;
                    if (this.jumping) { this.jumpVx = this.dashVx; this.jumpVy = this.dashVy; }
                    this.facing = Math.atan2(dashDirY, dashDirX);

                    // ABC: Brújula Activa — dar stacks si el dash va en dirección de la brújula
                    if (fx?.has('ABC')) {
                        const compass = this.scene?.compass;
                        if (compass) {
                            const dot = (dir, vx, vy) => (dir.dx ?? 0) * vx + (dir.dy ?? 0) * vy;
                            const pd = compass.primaryDir;
                            const sd = compass.secondaryDir;
                            if (pd && dot(pd, dashDirX, dashDirY) > 0.7)      fx.onDashInCompassDir(this, this.scene.momentum, true);
                            else if (sd && dot(sd, dashDirX, dashDirY) > 0.7) fx.onDashInCompassDir(this, this.scene.momentum, false);
                        }
                    }

                    // BBB: dash aéreo activa Modo Demonio
                    if (this.jumping) fx?.onAerialDash(this, this.scene.momentum);
                }
                } // end else (builder skip)
            }
        }

        // Físicas
        if (!this.isStunned && !this.wallJump.wallStick) {
            if (this.jumping) {
                const steer = moving ? 0.04 : 0;
                let maxSpd = this._demonMode ? 1000 : momentum.getEffectiveMaxSpeed(this.jumpLv);
                if (this._vampireSpeed) maxSpd *= 1.4;
                this.vx = this.jumpVx + (moving ? this.moveDir.x * maxSpd * steer : 0);
                this.vy = this.jumpVy + (moving ? this.moveDir.y * maxSpd * steer : 0);
                if (moving) this.facing = Math.atan2(this.moveDir.y, this.moveDir.x);
            } else if (this.dashing) {
                // DAB: Maestría — cambio de dirección instantáneo durante el dash
                const fx = this.scene.itemEffects;
                if (fx?.has('DAB') && moving) {
                    const spd = Math.hypot(this.dashVx, this.dashVy);
                    const curDirX = this.dashVx / spd;
                    const curDirY = this.dashVy / spd;
                    const dot = this.moveDir.x * curDirX + this.moveDir.y * curDirY;
                    if (dot < 0.9) { // ~25° de diferencia
                        this.dashVx = this.moveDir.x * spd;
                        this.dashVy = this.moveDir.y * spd;
                        this._dabBreaks++;
                        this.facing = Math.atan2(this.moveDir.y, this.moveDir.x);
                    }
                }
                const ease = 1 - Math.pow(this.dashT / DASH_DUR, 2);
                this.vx = this.dashVx * ease; this.vy = this.dashVy * ease;
            } else if (this._stickState && this._stickEnemy) {
                // Si el enemigo murio, salir del stick
                if (this._stickEnemy.hp <= 0) {
                    this._stickState = false;
                    this._stickTimer = 0;
                    this._stickEnemy = null;
                } else {
                    // BBC stick: pegado al centro del enemigo, vel cero
                    this.vx = 0; this.vy = 0;
                    this.px = this._stickEnemy.x;
                    this.py = this._stickEnemy.y - (this._stickEnemy.radius || 12) - 8;
                }
            } else {
                let af = 1;
                if (moving && currentSpeed > 5) {
                    const dot = (this.vx * this.moveDir.x + this.vy * this.moveDir.y) / currentSpeed;
                    af = 0.35 + 0.65 * Math.pow((dot + 1) / 2, 1.6);
                }

                const fx = this.scene.itemEffects;

                // Control: derapeReduction mejora respuesta, controlReduction la empeora
                const derapeBonus  = 1 + (this._derapeReduction || 0);
                const controlMalus = 1 - (this._controlReduction || 0);
                const turnK_mod = TURN_K[lv] * af * controlMalus * derapeBonus;

                // CCC: detectar derrapaje y emitir rastro de fuego
                const fxCCC = this.scene.itemEffects;
                if (fx?.has('CCC') && moving && currentSpeed > 20 && lv >= 2 && af < 0.85) {
                    this._skidTimer = (this._skidTimer || 0) + delta;
                    if (this._skidTimer >= 100) {
                        this._skidTimer = 0;
                        fx.onSkid(this.px, this.py);
                    }
                } else {
                    this._skidTimer = 0;
                }
                const tk = this.lerpK(turnK_mod, dt);
                const sk = this.lerpK(STOP_K[lv], dt);

                const slowMult = this.slowTimer > 0 ? 0.4 : 1.0;
                const finalMult = slowMult;

                if (moving) {
                    let effSpd = this._demonMode ? 1000 : momentum.getEffectiveMaxSpeed(lv);
                    if (this._vampireSpeed) effSpd *= 1.4;
                    this.vx += (this.moveDir.x * effSpd * finalMult - this.vx) * tk;
                    this.vy += (this.moveDir.y * effSpd * finalMult - this.vy) * tk;
                    this.facing = Math.atan2(this.moveDir.y, this.moveDir.x);
                } else {
                    this.vx -= this.vx * sk; this.vy -= this.vy * sk;
                }
            }
            this.px += this.vx * dt; this.py += this.vy * dt;
        }

        // Rastros
        if (this.trail.length >= TRAIL_MAX) {
            const t = this.trail.shift(); 
            t.x = this.px; t.y = this.py; t.lv = lv; t.dash = this.dashing; 
            t.jump = this.jumping; t.wallStick = this.wallJump.wallStick;
            this.trail.push(t); 
        } else {
            this.trail.push({ x: this.px, y: this.py, lv, dash: this.dashing, jump: this.jumping, wallStick: this.wallJump.wallStick});
        }

        this.trapped = false;
    }
}