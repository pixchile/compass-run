import { HP_DMG_DASH_WALL, DASH_WALL_STUN_DUR } from '../constants.js';
import { closestPointOnLine } from './GeometryUtils.js';

export default class CollisionSystem {
    constructor() {
        this._p1 = { x: 0, y: 0 };
        this._p2 = { x: 0, y: 0 };
        this._closest = { x: 0, y: 0 };
        this._colResult = { collided: false, hitX: 0, hitY: 0, distance: 0 };
    }

    checkLineCollisions(player, momentum, lines) {
        if (!lines || lines.length === 0) return;

        const currentSpeed = Math.hypot(player.vx, player.vy);
        const playerMomentum = momentum ? momentum.level : 0;
        const playerRadius = 12;

        const canStick = player.wallJump && 
                         !player.wallJump.wallStick && 
                         !player.isStunned && 
                         !player.dashing && 
                         player.wallJump.wallStickCooldown <= 0 && 
                         (player.jumping || !player.wallJump.wallStick);

        this._p1.x = player.prevX; this._p1.y = player.prevY;
        this._p2.x = player.px; this._p2.y = player.py;

        for (const line of lines) {
            if (!line) continue;
            
            const isNormalWall = !line.type || line.type === 'default';
            if (isNormalWall && player.isSurfing) continue;

            this.lineCollisionBetween(this._p1, this._p2, line, playerRadius + ((line.thickness || 0) / 2));
            
            if (this._colResult.collided) {
                player.px = this._colResult.hitX;
                player.py = this._colResult.hitY;

                const dx = line.end.x - line.start.x;
                const dy = line.end.y - line.start.y;
                const len = Math.hypot(dx, dy);
                if (len === 0) continue;

                let nx = -dy / len;
                let ny = dx / len;
                const px = player.px - line.start.x;
                const py = player.py - line.start.y;
                const lado = (dx * py - dy * px);
                
                const finalNx = lado > 0 ? nx : -nx;
                const finalNy = lado > 0 ? ny : -ny;
                const overlap = (playerRadius + (line.thickness || 0) / 2) - this._colResult.distance;

                if (overlap > 0) {
                    player.px += finalNx * overlap;
                    player.py += finalNy * overlap;
                }

                if (canStick) {
                    if (line.type === 'wall_breakable') {
                        if (playerMomentum >= (line.momentumRequired || 3)) {
                            line._broken = true; continue;
                        }
                    }
                    player.vx = 0; player.vy = 0;
                    const normalAngle = Math.atan2(finalNy, finalNx);
                    if (player.stickToWall) player.stickToWall(normalAngle, currentSpeed, line);
                    return; 
                } else {
                    if (line.type === 'wall_breakable') {
                        if (playerMomentum >= (line.momentumRequired || 3)) { 
                            line._broken = true; continue; 
                        }
                    }
                    const dotV = player.vx * finalNx + player.vy * finalNy;
                    let impactSpeed = 0;
                    if (dotV < 0) {
                        impactSpeed = -dotV;
                        player.vx -= dotV * finalNx;
                        player.vy -= dotV * finalNy;
                    }
                    if (player.dashing) {
                        player.stunT = DASH_WALL_STUN_DUR;
                        if (momentum) momentum.halveStacks();
                        if (player.health) player.health.takeDamage(Math.floor(HP_DMG_DASH_WALL * impactSpeed));
                        player.dashing = false;
                        player.vx = 0; player.vy = 0;
                    }
                    break;
                }
            }
        }
    }

    lineCollisionBetween(p1, p2, line, radius) {
        if (!line || !line.start || !line.end) {
            this._colResult.collided = false; return;
        }

        this._colResult.collided = false;
        closestPointOnLine(p1, line.start, line.end, this._closest);
        
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
                this._colResult.hitX = p1.x; this._colResult.hitY = p1.y;
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
}