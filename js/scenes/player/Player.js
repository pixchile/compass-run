import { W, H, TRAIL_MAX, MAX_SPD, TURN_K, STOP_K, JUMP_DUR, JUMP_HMAX, JUMP_DIST_K, DASH_DUR, DASH_CD, DASH_SPD, DIRS, SLAM } from '../../constants.js';
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

    takeEnemyDamage() { this.health.takeEnemyDamage(); }
    getCurrentAttackPayload(lvl) { return this.combat.getCurrentAttackPayload(lvl); }
    lerpK(k, dt) { return 1 - Math.pow(1 - k, dt * 60); }

    isMovingInCompassDirection(momentum, currentSpeed) {
        if (!momentum || momentum.cIdx === undefined || currentSpeed < 15) return false;
        const cd = DIRS[momentum.cIdx];
        if (!cd) return false;
        let diff = Math.abs(Math.atan2(this.vy, this.vx) - Math.atan2(cd.dy, cd.dx));
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        return (diff * (180 / Math.PI)) <= 22.5;
    }

    stickToWall(wallNormalAngle, currentSpeed, wallLine) {
        if (this.wallJump.wallStickCooldown > 0 || !this.wallJump.canStick(this.jumping, this.wallJump.wallStickCooldown)) return false;

        this.vx = 0; this.vy = 0; this.jumpVx = 0; this.jumpVy = 0;
        this.dashing = false; this.jumping = false; 
        this.combat.activeSlam = null;
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
        const moving = this.moveDir.x !== 0 || this.moveDir.y !== 0;

        // NUEVO: guardar si mantiene Espacio presionado (para atravesar muros en salto)
        this.holdingSpace = this.input.isSpaceDown();

        this.stunT = Math.max(0, this.stunT - delta);
        this.slowTimer  = Math.max(0, (this.slowTimer  || 0) - delta);
        this.noJumpTimer = Math.max(0, (this.noJumpTimer || 0) - delta);
        this.dashCD = Math.max(0, this.dashCD - delta);
        this.landFx = Math.max(0, this.landFx - delta);

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
            } else if (this.jumping && !this.combat.hasSlammedThisJump && this.combat.slamCooldown <= 0) {
                if (currentSpeed >= SLAM.MIN_SPEED) this.combat.performSlam(currentSpeed);
            } else if (this.dashing && !this.jumping) {
                this.jumping = true; this.jumpT = 0; this.jumpDur = JUMP_DUR[lv]; this.jumpHMax = JUMP_HMAX[lv]; this.jumpLv = lv;
                this.jumpVx = this.vx; this.jumpVy = this.vy;
                this.dashing = false; this.combat.hasSlammedThisJump = false; 
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

        if (this.input.isShiftJustPressed() && !this.dashing && !this.isStunned && this.dashCD === 0 && !this.wallJump.wallStick) {
            // No permitir dash aéreo si mantiene Espacio presionado
            if (!this.holdingSpace) {
                const dashCDValue = this._dashCDBase || DASH_CD;
                this.dashing = true; this.dashT = 0; this.dashCD = dashCDValue;
                this.wasJumpingWhenDashed = this.jumping;
                
                this.dashInitialSpeed = currentSpeed * DASH_SPD;  
                const dirX = currentSpeed > 8 ? this.vx / currentSpeed : Math.cos(this.facing);
                const dirY = currentSpeed > 8 ? this.vy / currentSpeed : Math.sin(this.facing);
                this.dashVx = dirX * this.dashInitialSpeed;
                this.dashVy = dirY * this.dashInitialSpeed;
                if (this.jumping) { this.jumpVx = this.dashVx; this.jumpVy = this.dashVy; }
            }
        }

        // Físicas
        if (!this.isStunned && !this.wallJump.wallStick) {
            if (this.jumping) {
                const steer = moving ? 0.04 : 0;
                const maxSpd = this._demonMode ? 1000 : momentum.getEffectiveMaxSpeed(this.jumpLv);
                this.vx = this.jumpVx + (moving ? this.moveDir.x * maxSpd * steer : 0);
                this.vy = this.jumpVy + (moving ? this.moveDir.y * maxSpd * steer : 0);
                if (moving) this.facing = Math.atan2(this.moveDir.y, this.moveDir.x);
            } else if (this.dashing) {
                const ease = 1 - Math.pow(this.dashT / DASH_DUR, 2);
                this.vx = this.dashVx * ease; this.vy = this.dashVy * ease;
            } else {
                let af = 1;
                if (moving && currentSpeed > 5) {
                    const dot = (this.vx * this.moveDir.x + this.vy * this.moveDir.y) / currentSpeed;
                    af = 0.35 + 0.65 * Math.pow((dot + 1) / 2, 1.6);
                }

                // DAB: giro instantáneo al seguir la brújula
                const fx = this.scene.itemEffects;
                if (fx?.has('DAB') && moving && this.isMovingInCompassDirection(momentum, currentSpeed)) {
                    this.vx = this.moveDir.x * currentSpeed;
                    this.vy = this.moveDir.y * currentSpeed;
                }

                // Control reduction (CCC malus)
                const controlMalus = 1 - (this._controlReduction || 0);
                const turnK_mod = TURN_K[lv] * af * controlMalus;
                const tk = this.lerpK(turnK_mod, dt);
                const sk = this.lerpK(STOP_K[lv], dt);

                const slowMult = this.slowTimer > 0 ? 0.4 : 1.0;
                const finalMult = slowMult;

                if (moving) {
                    const effSpd = this._demonMode ? 1000 : momentum.getEffectiveMaxSpeed(lv);
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
    }
}