import { closestPointOnLine } from './GeometryUtils.js';

export default class SurfSystem {
    constructor() {
        this._closest = { x: 0, y: 0 };
        this._prevJumping = false;
    }

    update(delta, player, momentum, visibleLines) {
        if (!visibleLines) return;

        const mountRadius = 20; 
        let isOverWall = false;
        let bestLine = null;
        let bestDist = Infinity;

        const playerPos = { x: player.px, y: player.py };
        
        for (const line of visibleLines) {
            if (line.type && line.type !== 'default') continue; 
            closestPointOnLine(playerPos, line.start, line.end, this._closest);
            const dist = Math.hypot(player.px - this._closest.x, player.py - this._closest.y);
            
            if (dist < bestDist) {
                bestDist = dist;
                bestLine = line;
            }
        }

        if (bestLine && bestDist <= mountRadius) {
            isOverWall = true;
            player.lastSurfedLine = bestLine;
        }

        const isJumping = player.jumping;
        const wasJumping = this._prevJumping;
        this._prevJumping = isJumping;

        if (isJumping) {
            if (player.isSurfing) {
                player.isSurfing = false;
                player.surfGraceTimer = 0;
            }
        } else {
            if (player.isSurfing) {
                if (!isOverWall) {
                    player.surfGraceTimer = (player.surfGraceTimer || 0) + delta;
                    if (player.surfGraceTimer > 100) {
                        player.isSurfing = false;
                        player.surfGraceTimer = 0;
                        if (momentum) momentum.reduceStacks(2); // applySurfFallPenalty
                    } else if (player.lastSurfedLine) {
                        closestPointOnLine(playerPos, player.lastSurfedLine.start, player.lastSurfedLine.end, this._closest);
                        const dx = player.px - this._closest.x;
                        const dy = player.py - this._closest.y;
                        const currentDist = Math.hypot(dx, dy);
                        
                        if (currentDist > mountRadius && currentDist > 0) {
                            player.px = this._closest.x + (dx / currentDist) * mountRadius;
                            player.py = this._closest.y + (dy / currentDist) * mountRadius;
                        }
                    }
                } else {
                    player.surfGraceTimer = 0; 
                    const speed = Math.hypot(player.vx, player.vy);
                    if (speed > 1 && momentum) momentum.addSurfingMomentum(delta);
                }
            } else {
                if (wasJumping && isOverWall && player.input.isSpaceDown()) {
                    player.isSurfing = true;
                    player.surfGraceTimer = 0;
                    player.vx *= 1.2;
                    player.vy *= 1.2;
                }
            }
        }
    }
}