// js/systems/DeathPuddleSystem.js
// Al morir un enemigo, chance de dejar un pozo temporal de slow+daño.
// La frecuencia, tamaño y duración escalan con el tiempo de partida.

export default class DeathPuddleSystem {
    constructor(scene) {
        this.scene = scene;
        this.puddles = []; // lista local para renderizado propio
    }

    // ─── Configuración escalada con tiempo ───────────────────────
    // gameElapsed: segundos transcurridos desde inicio de partida

    _getChance(elapsed) {
        // 0–3 min: 0%
        if (elapsed < 180) return 0;

        // 3–8 min: 0% → 10%
        if (elapsed < 480) {
            return 0.10 * ((elapsed - 180) / 300);
        }

        // 8–20 min: 10% → 33%
        return Math.min(
            0.33,
            0.10 + (0.23 * ((elapsed - 480) / 720))
        );
    }

    _getRadius(elapsed) {
        return 40 + Math.min(60, (elapsed / 600) * 60);
    }

    _getDuration(elapsed) {
        return 3000 + Math.min(7000, (elapsed / 600) * 7000);
    }

    _getDamagePerSec(elapsed) {
        return Math.min(5, 1 + (elapsed / 300) * 4);
    }

    // ─── API pública ─────────────────────────────────────────────

    /**
     * Llamar desde EnemyManager.killEnemy() tras cada muerte.
     * @param {number} x  posición mundial del enemigo muerto
     * @param {number} y
     */
    onEnemyDeath(x, y) {
        const elapsed = this._getElapsed();
        const chance  = this._getChance(elapsed);
        if (Math.random() > chance) return;

        const R        = this._getRadius(elapsed);
        const duration = this._getDuration(elapsed);
        const dps      = this._getDamagePerSec(elapsed);

        // Leve offset aleatorio para que no todos queden centrados igual
        const ox = (Math.random() - 0.5) * 20;
        const oy = (Math.random() - 0.5) * 20;
        const cx = x + ox;
        const cy = y + oy;

        const puddle = {
            x: cx, y: cy, r: R,
            timeLeft:  duration,
            totalTime: duration,
            dps,
            // slow y damage en zona unificada — manejamos nosotros mismos el efecto
            _isPuddle: true,
            // Formato compatible con ZoneSystem para slow:
            type:     'slow_zone',
            geometry: { bbox: { x: cx - R, y: cy - R, w: R * 2, h: R * 2 } },
        };

        this.puddles.push(puddle);

        // También registramos en currentMap.zones para que ZoneSystem aplique el slow
        this.scene.currentMap?.zones?.push(puddle);
    }

    // ─── Update ──────────────────────────────────────────────────

    update(delta) {
        if (this.puddles.length === 0) return;

        const player = this.scene.player;
        const now    = this.scene.time?.now ?? Date.now();

        for (let i = this.puddles.length - 1; i >= 0; i--) {
            const p = this.puddles[i];
            p.timeLeft -= delta;

            // Daño continuo al jugador si está dentro
            if (player && !player.isDead) {
                const dx = player.px - p.x;
                const dy = player.py - p.y;
                if (dx * dx + dy * dy <= p.r * p.r) {
                    player.health?.takeDamage(p.dps * (delta / 1000));
                }
            }

            if (p.timeLeft <= 0) {
                // Quitar de currentMap.zones también
                const zones = this.scene.currentMap?.zones;
                if (zones) {
                    const idx = zones.indexOf(p);
                    if (idx !== -1) zones.splice(idx, 1);
                }
                this.puddles.splice(i, 1);
            }
        }
    }

    // ─── Render ──────────────────────────────────────────────────
    // Llamar con cámara ya aplicada (dentro del bloque world-space).

    render(g, now) {
        for (const p of this.puddles) {
            const life   = p.timeLeft / p.totalTime; // 1→0
            const fade   = Math.min(1, life * 3);    // fade out en el último tercio
            const pulse  = 0.55 + 0.15 * Math.sin(now * 0.006 + p.x * 0.01);

            // Núcleo oscuro morado-verdoso
            g.fillStyle(0x220033, fade * pulse * 0.85);
            g.fillCircle(p.x, p.y, p.r);

            // Anillo exterior
            g.lineStyle(2, 0x881155, fade * 0.7);
            g.strokeCircle(p.x, p.y, p.r);

            // Anillo interior pulsante (slow indicator)
            const innerR = p.r * (0.4 + 0.1 * Math.sin(now * 0.009 + p.y * 0.01));
            g.fillStyle(0x552244, fade * pulse * 0.5);
            g.fillCircle(p.x, p.y, innerR);
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────

    _getElapsed() {
        // timeRemaining cuenta hacia abajo desde timeLimit
        const limit = this.scene.timeLimit || 300;
        const remaining = this.scene.timeRemaining ?? limit;
        return limit - remaining; // segundos transcurridos
    }

    reset() {
        // Quitar pozos activos de zones
        const zones = this.scene.currentMap?.zones;
        if (zones) {
            for (const p of this.puddles) {
                const idx = zones.indexOf(p);
                if (idx !== -1) zones.splice(idx, 1);
            }
        }
        this.puddles = [];
    }
}
