import { W, H, TRAIL_MAX, MAX_SPD, TURN_K, STOP_K, JUMP_DUR, JUMP_HMAX, JUMP_DIST_K,
         DASH_DUR, DASH_CD, DASH_SPD,
         HP_MAX, HP_DMG_ENEMY_HIT, HP_DMG_VOID, HP_LOW_SPD,
         HP_REGEN_DELAY, HP_REGEN_RATE, DIRS, SLAM } from '../constants.js';
import { WallJumpSystem } from './PlayerWallJump.js';

export default class Player {
    constructor(scene) {
        this.scene = scene;
        this.px = W / 2;  this.py = H / 2;
        this.vx = 0;      this.vy = 0;
        this.facing = 0;

        this.jumping = false; this.jumpT = 0; this.jumpDur = 0; this.jumpHMax = 0; this.jumpVx = 0; this.jumpVy = 0; this.jumpLv = 1;
        this.landFx = 0;

        this.dashing = false; this.dashT = 0; this.dashVx = 0; this.dashVy = 0; this.dashCD = 0;
        this.stunT = 0;

        // Wall Jump System
        this.wallJump = new WallJumpSystem();

        // Invincibilidad
        this.isInvincible = false;
        this.invincibleTimer = 0;

        // Vida
        this.hp = HP_MAX;
        this.hpRegenT = 0;
        this.hpHitFlash = 0;

        this.prevSpace = false; this.prevShift = false;
        this.trail = [];

        this.wasJumpingWhenDashed = false;

this.canSlam = true;              // Habilidad desbloqueada (siempre true)
this.hasSlammedThisJump = false;  // Una vez por salto
this.slamCooldown = 0;            // Cooldown después de slam
this.preSlamSpeed = 0;            // Velocidad guardada (debug/efectos)

        this.kb = scene.input.keyboard.addKeys('W,A,S,D,SPACE,SHIFT');
    }

    lerpK(k, dt) { return 1 - Math.pow(1 - k, dt * 60); }
    get isStunned() { return this.stunT > 0; }
    get isDead() { return this.hp <= 0; }
    get isGrounded() { return !this.jumping && !this.wallJump.wallStick; }

    takeDamage(amount) {
        if (this.isInvincible) return;
        this.hp = Math.max(0, this.hp - amount);
        this.hpRegenT = 0;
        this.hpHitFlash = 280;

        this.isInvincible = true;
        this.invincibleTimer = 500;
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
        this.wallJump.reset();
    }

    getMoveDirection() {
        const U = this.kb.W.isDown;
        const Dn = this.kb.S.isDown;
        const L = this.kb.A.isDown;
        const R = this.kb.D.isDown;

        let ix = (R ? 1 : 0) - (L ? 1 : 0);
        let iy = (Dn ? 1 : 0) - (U ? 1 : 0);

        if (ix && iy) {
            ix *= 0.7071;
            iy *= 0.7071;
        }

        return { x: ix, y: iy };
    }

    isMovingInCompassDirection(momentum) {
        if (!momentum || momentum.cIdx === undefined) return false;

        const currentSpeed = Math.hypot(this.vx, this.vy);
        if (currentSpeed < 15) return false;

        const cd = DIRS[momentum.cIdx];
        if (!cd) return false;

        let diff = Math.abs(Math.atan2(this.vy, this.vx) - Math.atan2(cd.dy, cd.dx));
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        const degDiff = diff * (180 / Math.PI);

        return degDiff <= 22.5;
    }

    stickToWall(wallNormalAngle, currentSpeed) {
    // No pegar si está en cooldown
    if (this.wallJump.wallStickCooldown > 0) return false;

    if (!this.wallJump.canStick(this.jumping, this.wallJump.wallStickCooldown)) return false;

    // Congelar movimiento
    this.vx = 0;
    this.vy = 0;
    this.jumpVx = 0;
    this.jumpVy = 0;
    this.dashing = false;
    this.jumping = false;  // Salir de estado jumping

    return this.wallJump.stick(wallNormalAngle, currentSpeed);
}

    update(delta, momentum, enemyManager) {
        const dt = delta / 1000;
        const lv = momentum.level;
        const now = this.scene.time.now;

    // Decrementar cooldown de slam
    this.slamCooldown = Math.max(0, this.slamCooldown - delta);

        const U = this.kb.W.isDown, Dn = this.kb.S.isDown;
        const L = this.kb.A.isDown, R = this.kb.D.isDown;
        const spaceJust = this.kb.SPACE.isDown && !this.prevSpace;
        const shiftJust = this.kb.SHIFT.isDown && !this.prevShift;
        this.prevSpace = this.kb.SPACE.isDown;
        this.prevShift = this.kb.SHIFT.isDown;

        let ix = (R ? 1 : 0) - (L ? 1 : 0);
        let iy = (Dn ? 1 : 0) - (U ? 1 : 0);
        if (ix && iy) { ix *= 0.7071; iy *= 0.7071; }
        const moving = ix !== 0 || iy !== 0;

        // Actualizar wall stick (timeout)
        const wallResult = this.wallJump.update(delta, (vx, vy) => {
            // Callback cuando el timer expira sin input
            this.vx = vx;
            this.vy = vy;
            this.jumping = true;
        });
        if (wallResult?.timeout) {
            this.jumping = true;
        }

        this.stunT = Math.max(0, this.stunT - delta);
        this.dashCD = Math.max(0, this.dashCD - delta);

        if (this.isInvincible) {
            this.invincibleTimer -= delta;
            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
            }
        }

        if (this.dashing) {
            this.dashT += delta;
            if (this.dashT >= DASH_DUR) {
                this.dashing = false;
            }
        }

        if (this.jumping && !this.wallJump.wallStick) {
            this.jumpT += delta;
            if (this.jumpT >= this.jumpDur) {
                this.jumping = false;
                this.landFx = this.jumpLv >= 3 ? 420 : this.jumpLv >= 2 ? 210 : 0;
            }
        }
        this.landFx = Math.max(0, this.landFx - delta);
        this.hpHitFlash = Math.max(0, this.hpHitFlash - delta);

        // TRIGGER: SPACE (Jump / Wall Jump)
if (spaceJust && !this.isStunned && !this.dashing) {
    // Prioridad 1: Wall Jump si está pegado
    if (this.wallJump.wallStick) {
        const jumpResult = this.wallJump.tryJump(
            this.getMoveDirection(),
            momentum,
            () => this.getMoveDirection(),
            (m) => this.isMovingInCompassDirection(m)
        );
        if (jumpResult?.success) {
            this.vx = jumpResult.vx;
            this.vy = jumpResult.vy;
            this.jumping = true;
            this.jumpT = 0;
            this.jumpDur = JUMP_DUR[lv];
            this.jumpLv = lv;
            this.jumpVx = this.vx;
            this.jumpVy = this.vy;
            // Resetear flag de slam para este nuevo salto
            this.hasSlammedThisJump = false;
        }
    }
    // Prioridad 2: Slam (aterrizaje forzoso) - solo en aire y si no se ha usado este salto
    else if (this.jumping && !this.hasSlammedThisJump && this.slamCooldown <= 0) {
        const currentSpeed = Math.hypot(this.vx, this.vy);
        if (currentSpeed >= SLAM.MIN_SPEED) {
            this.performSlam(currentSpeed, momentum);
        }
    }
    // Prioridad 3: Normal jump (suelo)
    else if (!this.jumping && !this.wallJump.wallStick) {
        this.jumping = true;
        this.jumpT = 0;
        this.jumpDur = JUMP_DUR[lv];
        this.jumpHMax = JUMP_HMAX[lv];
        this.jumpLv = lv;
        const spd = Math.hypot(this.vx, this.vy);
        if (spd > 8) {
            this.jumpVx = this.vx * JUMP_DIST_K[lv];
            this.jumpVy = this.vy * JUMP_DIST_K[lv];
        } else {
            this.jumpVx = Math.cos(this.facing) * MAX_SPD[1] * 0.45;
            this.jumpVy = Math.sin(this.facing) * MAX_SPD[1] * 0.45;
        }
        // Resetear flag de slam para el próximo salto
        this.hasSlammedThisJump = false;
    }
}

// DASH
if (shiftJust && !this.dashing && !this.isStunned && this.dashCD === 0 && !this.wallJump.wallStick) {
    this.dashing = true;
    this.dashT = 0;
    this.dashCD = DASH_CD;
    this.wasJumpingWhenDashed = this.jumping;

    if (enemyManager && enemyManager.resetDashDamageTracking) {
        enemyManager.resetDashDamageTracking();
    }

    const currentSpeed = Math.hypot(this.vx, this.vy);
    const dashSpeed = currentSpeed * DASH_SPD;  // Multiplica velocidad actual por 3
    const dirX = currentSpeed > 8 ? this.vx / currentSpeed : Math.cos(this.facing);
    const dirY = currentSpeed > 8 ? this.vy / currentSpeed : Math.sin(this.facing);
    this.dashVx = dirX * dashSpeed;
    this.dashVy = dirY * dashSpeed;
}

// COLISIONES DE DASH
if (this.dashing && enemyManager) {
    const currentSpeed = Math.hypot(this.vx, this.vy);
    const isAirDash = this.wasJumpingWhenDashed;

    const { hitAny, killedAny } = enemyManager.checkDashCollisions(
        this,
        currentSpeed,  // ← velocidad actual
        now,
        (enemyType) => { }
    );

    if (hitAny && !killedAny && !isAirDash) {
        momentum.halveStacks();
    }
}
        // FÍSICAS (solo si no está pegado al muro)
        if (!this.isStunned && !this.wallJump.wallStick) {
            if (this.jumping) {
                // Durante el salto, se puede steer ligeramente
                const steer = moving ? 0.04 : 0;
                this.vx = this.jumpVx + (moving ? ix * MAX_SPD[this.jumpLv] * steer : 0);
                this.vy = this.jumpVy + (moving ? iy * MAX_SPD[this.jumpLv] * steer : 0);
                if (moving) this.facing = Math.atan2(iy, ix);
            } else if (this.dashing) {
                const ease = 1 - Math.pow(this.dashT / DASH_DUR, 2);
                this.vx = this.dashVx * ease;
                this.vy = this.dashVy * ease;
            } else {
                // Movimiento normal en suelo
                const vLen = Math.hypot(this.vx, this.vy);
                let af = 1;
                if (moving && vLen > 15) {
                    const dot = (this.vx * ix + this.vy * iy) / vLen;
                    af = 0.12 + 0.88 * Math.pow((dot + 1) / 2, 1.6);
                }
                const tk = this.lerpK(TURN_K[lv] * af, dt);
                const sk = this.lerpK(STOP_K[lv], dt);
                if (moving) {
                    this.vx += (ix * MAX_SPD[lv] - this.vx) * tk;
                    this.vy += (iy * MAX_SPD[lv] - this.vy) * tk;
                    this.facing = Math.atan2(iy, ix);
                } else {
                    this.vx -= this.vx * sk;
                    this.vy -= this.vy * sk;
                }
            }

            this.px += this.vx * dt;
            this.py += this.vy * dt;

            // Colisiones con enemigos
            if (enemyManager) {
                enemyManager.checkPierceKills(this, lv);

                if (!this.dashing && !this.jumping) {
                    enemyManager.checkSolidCollision(this, 12);
                }

                if (!this.jumping && !this.dashing) {
                    enemyManager.checkNormalCollisions(this, now, (enemy) => {
                        this.takeEnemyDamage();
                    });
                }
            }
        }

        // Regeneración pasiva de vida
        if (this.hp < HP_MAX && this.hp > 0 && !this.wallJump.wallStick) {
            this.hpRegenT += delta;
            if (this.hpRegenT >= HP_REGEN_DELAY) {
                this.hp = Math.min(HP_MAX, this.hp + HP_REGEN_RATE * dt);
            }
        }

        // Trail para efectos visuales
        this.trail.push({ x: this.px, y: this.py, lv, dash: this.dashing, jump: this.jumping, wallStick: this.wallJump.wallStick });
        if (this.trail.length > TRAIL_MAX) this.trail.shift();
    }
performSlam(speed, momentum) {
    // Guardar velocidad para posibles efectos visuales
    this.preSlamSpeed = speed;
    
    // Punto de impacto (posición actual)
    const slamX = this.px;
    const slamY = this.py;
    
    // Verificar si es high speed (para efectos extra)
    const isHighSpeed = speed >= SLAM.HIGH_SPEED_THRESHOLD;
    
    // Verificar si puede pagar el costo de vida (para high speed)
    const canPayHealth = this.hp > SLAM.SELF_DAMAGE;
    const applyKnockback = isHighSpeed && canPayHealth;
    
    // Aplicar efectos a enemigos (daño y knockback condicional)
    if (this.scene.enemyManager) {
        this.scene.enemyManager.applySlamDamage(slamX, slamY, speed, applyKnockback);
    }
    
    // Aplicar daño propio solo si es high speed y puede pagar
    if (isHighSpeed && canPayHealth) {
        this.takeDamage(SLAM.SELF_DAMAGE);
    }
    
    // Efecto visual (onda expansiva)
    if (this.scene.renderer) {
        this.scene.renderer.addSlamEffect(slamX, slamY, isHighSpeed && canPayHealth);
    }
    
    // Resetear velocidad (aterrizaje forzoso)
    this.vx = 0;
    this.vy = 0;
    
    // Forzar estado en suelo
    this.jumping = false;
    
    // Marcar que ya se usó slam en este salto
    this.hasSlammedThisJump = true;
    
    // Activar cooldown
    this.slamCooldown = SLAM.COOLDOWN;
}
    
    // Opcional: Reducir momentum al hacer slam (para balance)
    // momentum.halveStacks(); // Descomentar si se desea
}