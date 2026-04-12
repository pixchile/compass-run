// js/scenes/Player.js
import { W, H, TRAIL_MAX, MAX_SPD, TURN_K, STOP_K, JUMP_DUR, JUMP_HMAX, JUMP_DIST_K,
         DASH_DUR, DASH_CD, DASH_SPD,
         HP_MAX, HP_DMG_ENEMY_HIT, HP_DMG_VOID, HP_LOW_SPD,
         HP_REGEN_DELAY, HP_REGEN_RATE, DIRS, SLAM, ATTACK_RADIOS, ATTACK_DAMAGE_MULTIPLIERS } from '../constants.js';
import { WallJumpSystem } from './PlayerWallJump.js';
import { WallRunSystem } from './PlayerWallRun.js';

export default class Player {
    constructor(scene) {
        this.scene = scene;
        this.px = W / 2;  this.py = H / 2;
        this.vx = 0;      this.vy = 0;
        this.facing = 0;

        this.jumping = false; this.jumpT = 0; this.jumpDur = 0; this.jumpHMax = 0; this.jumpVx = 0; this.jumpVy = 0; this.jumpLv = 1;
        this.landFx = 0;

        this.dashing = false; this.dashT = 0; this.dashVx = 0; this.dashVy = 0; this.dashCD = 0; this.dashInitialSpeed = 0;
        this.stunT = 0;

        this.wallJump = new WallJumpSystem(scene, this);
        this.wallRun = new WallRunSystem(scene, this, this.wallJump);

        this.isInvincible = false;
        this.invincibleTimer = 0;

        this.hp = HP_MAX;
        this.hpRegenT = 0;
        this.hpHitFlash = 0;

        this.prevSpace = false; this.prevShift = false;
        
        this.moveDir = { x: 0, y: 0 };
        this.trail = []; 

        this.wasJumpingWhenDashed = false;
        this.canSlam = true;              
        this.hasSlammedThisJump = false;  
        this.slamCooldown = 0;            
        this.preSlamSpeed = 0;            
        this.activeSlam = null;

        this.currentWallLine = null;

        this.kb = scene.input.keyboard.addKeys('W,A,S,D,SPACE,SHIFT');
    }

    lerpK(k, dt) { return 1 - Math.pow(1 - k, dt * 60); }
    get isStunned() { return this.stunT > 0; }
    get isDead() { return this.hp <= 0; }
    get isGrounded() { return !this.jumping && !this.wallJump.wallStick && !this.wallRun.isWallRunning; }

    // --- NUEVO: Obtener radio de ataque según momentum ---
    getAttackRadius(momentumLevel) {
        return ATTACK_RADIOS[momentumLevel] || ATTACK_RADIOS[1];
    }

    // --- NUEVO: Obtener multiplicador de daño según momentum ---
    getDamageMultiplier(momentumLevel) {
        return ATTACK_DAMAGE_MULTIPLIERS[momentumLevel] || ATTACK_DAMAGE_MULTIPLIERS[1];
    }

    takeDamage(amount) {
        if (this.isInvincible) return;
        this.hp = Math.max(0, this.hp - amount);
        this.hpRegenT = 0;
        this.hpHitFlash = 280;
        this.isInvincible = true;
        this.invincibleTimer = 50;
    }

    takeEnemyDamage() {
        if (this.isInvincible) return;
        this.takeDamage(HP_DMG_ENEMY_HIT);
    }

    fallIntoVoid() {
        this.takeDamage(HP_DMG_VOID);
        this.px = W / 2; this.py = H / 2;
        this.vx = 0; this.vy = 0;
        this.jumping = false; this.dashing = false;
        this.activeSlam = null;
        this.wallJump.reset();
        this.wallRun.reset();
    }

    updateMoveDirection() {
        const U = this.kb.W.isDown;
        const Dn = this.kb.S.isDown;
        const L = this.kb.A.isDown;
        const R = this.kb.D.isDown;
        
        this.moveDir.x = (R ? 1 : 0) - (L ? 1 : 0);
        this.moveDir.y = (Dn ? 1 : 0) - (U ? 1 : 0);
        
        if (this.moveDir.x && this.moveDir.y) { 
            this.moveDir.x *= 0.7071; 
            this.moveDir.y *= 0.7071; 
        }
        return this.moveDir;
    }

    getMoveDirection() { return this.updateMoveDirection(); }

    isMovingInCompassDirection(momentum, currentSpeed) {
        if (!momentum || momentum.cIdx === undefined) return false;
        if (currentSpeed < 15) return false;
        const cd = DIRS[momentum.cIdx];
        if (!cd) return false;
        let diff = Math.abs(Math.atan2(this.vy, this.vx) - Math.atan2(cd.dy, cd.dx));
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        return (diff * (180 / Math.PI)) <= 22.5;
    }

    stickToWall(wallNormalAngle, currentSpeed, wallLine) {
        if (this.wallJump.wallStickCooldown > 0) return false;
        if (!this.wallJump.canStick(this.jumping, this.wallJump.wallStickCooldown)) return false;

        this.vx = 0; this.vy = 0;
        this.jumpVx = 0; this.jumpVy = 0;
        this.dashing = false; this.jumping = false;  
        this.activeSlam = null;

        this.wallRun.reset();
        this.currentWallLine = wallLine;

        return this.wallJump.stick(wallNormalAngle, currentSpeed);
    }

    performSlam(speed, momentum) {
        this.preSlamSpeed = speed;
        const isHighSpeed = speed >= SLAM.HIGH_SPEED_THRESHOLD;
        const canPayHealth = this.hp > SLAM.SELF_DAMAGE;
        const applyKnockback = isHighSpeed && canPayHealth;
        
        if (applyKnockback) this.takeDamage(SLAM.SELF_DAMAGE);
        if (this.scene.renderer) this.scene.renderer.addSlamEffect(this.px, this.py, applyKnockback);
        
        this.activeSlam = {
            x: this.px, y: this.py,
            speed: speed,
            isHighSpeed: isHighSpeed,
            applyKnockback: applyKnockback
        };

        this.vx = 0; this.vy = 0;
        this.jumping = false;
        this.hasSlammedThisJump = true;
        this.slamCooldown = SLAM.COOLDOWN;
    }

    // --- NUEVO: Construye el Payload de Ataque con radio y daño mejorado ---
    getCurrentAttackPayload(momentumLevel) {
        const currentSpeed = Math.hypot(this.vx, this.vy);
        const now = Date.now();
        const attackRadius = this.getAttackRadius(momentumLevel);
        const damageMultiplier = this.getDamageMultiplier(momentumLevel);

        // 1. Slam: Tiene máxima prioridad si está activo
        if (this.activeSlam) {
            return {
                type: this.activeSlam.isHighSpeed ? 'slam3' : 'slam',
                baseDamage: this.activeSlam.speed * 0.1 * damageMultiplier,
                radius: attackRadius * 1.5, // Slam tiene radio más grande
                now: now
            };
        }

        // 2. Momentum 3: Si tiene nivel máximo, hace el daño % que pediste
        if (momentumLevel === 3) {
            return {
                type: 'momentum3',
                baseDamage: currentSpeed * 0.025 * damageMultiplier,
                radius: attackRadius,
                now: now
            };
        }

        // 3. Dash: Si está haciendo dash normal o aéreo
        if (this.dashing) {
            return {
                type: this.wasJumpingWhenDashed ? 'aerialDash' : 'dash',
                baseDamage: this.dashInitialSpeed * 0.1 * damageMultiplier,
                radius: attackRadius,
                now: now
            };
        }

        // Si no está haciendo nada de lo anterior, el jugador NO ESTÁ ATACANDO
        return null;
    }

    update(delta, momentum) {
        const dt = delta / 1000;
        const lv = momentum.level;
        const now = this.scene.time.now;

        const currentSpeed = Math.hypot(this.vx, this.vy);
        const md = this.updateMoveDirection();
        const moving = md.x !== 0 || md.y !== 0;

        const spaceJust = this.kb.SPACE.isDown && !this.prevSpace;
        const shiftJust = this.kb.SHIFT.isDown && !this.prevShift;
        this.prevSpace = this.kb.SPACE.isDown;
        this.prevShift = this.kb.SHIFT.isDown;

        this.slamCooldown = Math.max(0, this.slamCooldown - delta);
        this.stunT = Math.max(0, this.stunT - delta);
        this.slowTimer  = Math.max(0, (this.slowTimer  || 0) - delta);
        this.noJumpTimer = Math.max(0, (this.noJumpTimer || 0) - delta);
        this.dashCD = Math.max(0, this.dashCD - delta);
        this.landFx = Math.max(0, this.landFx - delta);
        this.hpHitFlash = Math.max(0, this.hpHitFlash - delta);

        if (this.isInvincible) {
            this.invincibleTimer -= delta;
            if (this.invincibleTimer <= 0) this.isInvincible = false;
        }

        const wallResult = this.wallJump.update(delta, (vx, vy) => {
            this.vx = vx; this.vy = vy; this.jumping = true;
        });
        if (wallResult?.timeout) this.jumping = true;

        if (this.dashing) {
            this.dashT += delta;
            if (this.dashT >= DASH_DUR) this.dashing = false;
        }

        if (this.jumping && !this.wallJump.wallStick && !this.wallRun.isWallRunning) {
            this.jumpT += delta;
            if (this.jumpT >= this.jumpDur) {
                this.jumping = false;
                this.activeSlam = null;
                this.landFx = this.jumpLv >= 3 ? 420 : this.jumpLv >= 2 ? 210 : 0;
            }
        }

        if (this.wallJump.wallStick && moving && !this.wallRun.isWallRunning && !this.isStunned) {
            this.wallRun.tryStartWallRun(this.wallJump.getWallNormalAngle(), lv, md, this.currentWallLine);
        }

        if (this.wallRun.isWallRunning) {
            if (!this.wallRun.update(delta, md, now, 12)) {
                if (this.wallRun.wasNaturalExit) {
                    this.wallJump._release();
                    this.jumping = true;
                    this.jumpT = 0;
                    this.jumpDur = 200;          
                    this.jumpHMax = 10;           
                    this.jumpLv = lv;
                    this.jumpVx = this.vx;
                    this.jumpVy = this.vy;
                    this.hasSlammedThisJump = false;
                    this.landFx = 140;            
                    this.wallRun.wasNaturalExit = false;
                } else {
                    this.vx = 0; this.vy = 0;
                }
            }
        }

        if (spaceJust && !this.isStunned && this.noJumpTimer <= 0) {
            if (this.wallJump.wallStick) {
                const jumpResult = this.wallJump.tryJump(
                    md, momentum,
                    () => md,
                    (m) => this.isMovingInCompassDirection(m, currentSpeed), 
                    now
                );
                if (jumpResult?.success) {
                    this.vx = jumpResult.vx; this.vy = jumpResult.vy;
                    this.jumping = true; this.jumpT = 0;
                    this.jumpDur = JUMP_DUR[lv]; this.jumpLv = lv;
                    this.jumpVx = this.vx; this.jumpVy = this.vy;
                    this.hasSlammedThisJump = false;
                    this.wallRun.reset();
                }
            }
            else if (this.jumping && !this.hasSlammedThisJump && this.slamCooldown <= 0) {
                if (currentSpeed >= SLAM.MIN_SPEED) this.performSlam(currentSpeed, momentum);
            }
            else if (this.dashing && !this.jumping) {
                this.jumping = true; this.jumpT = 0;
                this.jumpDur = JUMP_DUR[lv]; this.jumpHMax = JUMP_HMAX[lv]; this.jumpLv = lv;
                this.jumpVx = this.vx; this.jumpVy = this.vy;
                this.dashing = false; this.hasSlammedThisJump = false;
            }
            else if (!this.jumping && !this.wallJump.wallStick && !this.wallRun.isWallRunning) {
                this.jumping = true; this.jumpT = 0;
                this.jumpDur = JUMP_DUR[lv]; this.jumpHMax = JUMP_HMAX[lv]; this.jumpLv = lv;
                if (currentSpeed > 8) {
                    this.jumpVx = this.vx * JUMP_DIST_K[lv];
                    this.jumpVy = this.vy * JUMP_DIST_K[lv];
                } else {
                    this.jumpVx = Math.cos(this.facing) * MAX_SPD[1] * 0.45;
                    this.jumpVy = Math.sin(this.facing) * MAX_SPD[1] * 0.45;
                }
                this.hasSlammedThisJump = false;
            }
        }

        if (shiftJust && !this.dashing && !this.isStunned && this.dashCD === 0 && !this.wallJump.wallStick && !this.wallRun.isWallRunning) {
            this.dashing = true; this.dashT = 0; this.dashCD = DASH_CD;
            this.wasJumpingWhenDashed = this.jumping;
            
            const dashSpeed = currentSpeed * DASH_SPD;
            this.dashInitialSpeed = dashSpeed;  
            const dirX = currentSpeed > 8 ? this.vx / currentSpeed : Math.cos(this.facing);
            const dirY = currentSpeed > 8 ? this.vy / currentSpeed : Math.sin(this.facing);
            this.dashVx = dirX * dashSpeed;
            this.dashVy = dirY * dashSpeed;
            if (this.jumping) {
                this.jumpVx = this.dashVx; this.jumpVy = this.dashVy;
            }
        }

        if (!this.isStunned && !this.wallJump.wallStick && !this.wallRun.isWallRunning) {
            if (this.jumping) {
                const steer = moving ? 0.04 : 0;
                this.vx = this.jumpVx + (moving ? md.x * MAX_SPD[this.jumpLv] * steer : 0);
                this.vy = this.jumpVy + (moving ? md.y * MAX_SPD[this.jumpLv] * steer : 0);
                if (moving) this.facing = Math.atan2(md.y, md.x);
            } else if (this.dashing) {
                const ease = 1 - Math.pow(this.dashT / DASH_DUR, 2);
                this.vx = this.dashVx * ease;
                this.vy = this.dashVy * ease;
            } else {
                let af = 1;
                if (moving && currentSpeed > 15) {
                    const dot = (this.vx * md.x + this.vy * md.y) / currentSpeed;
                    af = 0.12 + 0.88 * Math.pow((dot + 1) / 2, 1.6);
                }
                const tk = this.lerpK(TURN_K[lv] * af, dt);
                const sk = this.lerpK(STOP_K[lv], dt);
                const slowMult = this.slowTimer > 0 ? 0.4 : 1.0;
                if (moving) {
                    this.vx += (md.x * MAX_SPD[lv] * slowMult - this.vx) * tk;
                    this.vy += (md.y * MAX_SPD[lv] * slowMult - this.vy) * tk;
                    this.facing = Math.atan2(md.y, md.x);
                } else {
                    this.vx -= this.vx * sk;
                    this.vy -= this.vy * sk;
                }
            }
            this.px += this.vx * dt;
            this.py += this.vy * dt;
        } else if (this.wallRun.isWallRunning) {
            this.px += this.vx * dt;
            this.py += this.vy * dt;
        }

        if (this.hp < HP_MAX && this.hp > 0 && !this.wallJump.wallStick && !this.wallRun.isWallRunning) {
            this.hpRegenT += delta;
            if (this.hpRegenT >= HP_REGEN_DELAY) {
                this.hp = Math.min(HP_MAX, this.hp + HP_REGEN_RATE * dt);
            }
        }

        if (this.trail.length >= TRAIL_MAX) {
            const t = this.trail.shift(); 
            t.x = this.px; t.y = this.py; t.lv = lv; t.dash = this.dashing; 
            t.jump = this.jumping; t.wallStick = this.wallJump.wallStick; t.wallRun = this.wallRun.isWallRunning;
            this.trail.push(t); 
        } else {
            this.trail.push({ x: this.px, y: this.py, lv, dash: this.dashing, jump: this.jumping, wallStick: this.wallJump.wallStick, wallRun: this.wallRun.isWallRunning });
        }
    }
}