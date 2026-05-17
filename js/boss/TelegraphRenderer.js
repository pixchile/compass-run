// js/boss/TelegraphRenderer.js
// Dibuja las telegrafías visuales ANTES de que ejecute cada ataque.
// Puro visual, sin lógica de juego.

import { BOSS } from '../constants.js';

export default class TelegraphRenderer {
    constructor() {
        this._active = []; // lista de telegrafías activas
    }

    /**
     * Agrega una telegrafía de cono.
     * @param {number} x       - origen x (posición del boss)
     * @param {number} y       - origen y
     * @param {number} angle   - ángulo central (rad)
     * @param {number} halfArc - semi-apertura del cono (rad)
     * @param {number} length  - largo del cono (px)
     * @param {number} durationMs
     */
    telegraphCone(x, y, angle, halfArc, length, durationMs) {
        this._active.push({
            type: 'cone', x, y, angle, halfArc, length,
            ms: durationMs, total: durationMs,
        });
    }

    /**
     * Agrega una telegrafía de círculo expandiéndose.
     * @param {number} x
     * @param {number} y
     * @param {number} maxRadius
     * @param {number} durationMs
     */
    telegraphCircle(x, y, maxRadius, durationMs) {
        this._active.push({
            type: 'circle', x, y, maxRadius,
            ms: durationMs, total: durationMs,
        });
    }

    /**
     * Telegrafía de línea (para charges).
     * @param {number} x1 @param {number} y1 - origen
     * @param {number} x2 @param {number} y2 - destino
     * @param {number} width
     * @param {number} durationMs
     */
    telegraphLine(x1, y1, x2, y2, width, durationMs) {
        this._active.push({
            type: 'line', x1, y1, x2, y2, width,
            ms: durationMs, total: durationMs,
        });
    }

    /**
     * Telegrafía de crosshair (barrage / targeted).
     * @param {number} x @param {number} y - posición objetivo
     * @param {number} radius
     * @param {number} durationMs
     */
    telegraphCrosshair(x, y, radius, durationMs) {
        this._active.push({
            type: 'crosshair', x, y, radius,
            ms: durationMs, total: durationMs,
        });
    }

    /**
     * Telegrafía de pulsación en el suelo (ground slam / AoE zone).
     * @param {number} x @param {number} y
     * @param {number} radius
     * @param {number} durationMs
     */
    telegraphGround(x, y, radius, durationMs) {
        this._active.push({
            type: 'ground', x, y, radius,
            ms: durationMs, total: durationMs,
        });
    }

    /** Elimina todas las telegrafías activas */
    clear() {
        this._active = [];
    }

    /**
     * Avanza timers y retorna true si alguna telegrafía terminó.
     * @param {number} delta ms
     * @returns {boolean} alguna completó
     */
    update(delta) {
        let completed = false;
        for (let i = this._active.length - 1; i >= 0; i--) {
            this._active[i].ms -= delta;
            if (this._active[i].ms <= 0) {
                this._active.splice(i, 1);
                completed = true;
            }
        }
        return completed;
    }

    /**
     * Dibuja todas las telegrafías sobre el Graphics.
     * Llamar ANTES de renderizar enemies, DESPUÉS de mapa.
     * @param {Phaser.GameObjects.Graphics} g
     */
    render(g) {
        const now  = Date.now();
        const tc   = BOSS.TELEGRAPH;

        for (const t of this._active) {
            const pct     = 1 - (t.ms / t.total);     // 0→1 a medida que pasa el tiempo
            const alpha   = tc.ALPHA * (0.5 + 0.5 * Math.sin(pct * Math.PI * 6)); // parpadeo
            const danger  = pct > 0.75;
            const color   = danger ? tc.COLOR_DANGER : tc.COLOR;

            switch (t.type) {

                case 'cone': {
                    const steps  = 24;
                    const len    = t.length * (0.3 + 0.7 * pct);
                    g.lineStyle(2, color, alpha);
                    g.beginPath();
                    g.moveTo(t.x, t.y);
                    for (let i = 0; i <= steps; i++) {
                        const a = t.angle - t.halfArc + (t.halfArc * 2 * i / steps);
                        g.lineTo(t.x + Math.cos(a) * len, t.y + Math.sin(a) * len);
                    }
                    g.lineTo(t.x, t.y);
                    g.strokePath();

                    // Fill semitransparente
                    g.fillStyle(color, alpha * 0.2);
                    g.beginPath();
                    g.moveTo(t.x, t.y);
                    for (let i = 0; i <= steps; i++) {
                        const a = t.angle - t.halfArc + (t.halfArc * 2 * i / steps);
                        g.lineTo(t.x + Math.cos(a) * len, t.y + Math.sin(a) * len);
                    }
                    g.closePath();
                    g.fillPath();
                    break;
                }

                case 'circle': {
                    const r = t.maxRadius * (0.2 + 0.8 * pct);
                    g.lineStyle(2, color, alpha);
                    g.strokeCircle(t.x, t.y, r);
                    g.fillStyle(color, alpha * 0.1);
                    g.fillCircle(t.x, t.y, r);
                    break;
                }

                case 'line': {
                    const w = (t.width || 20) * (0.4 + 0.6 * pct);
                    g.lineStyle(w, color, alpha * 0.35);
                    g.beginPath();
                    g.moveTo(t.x1, t.y1);
                    g.lineTo(t.x2, t.y2);
                    g.strokePath();

                    // Flecha en el destino
                    g.lineStyle(2, color, alpha);
                    g.beginPath();
                    g.moveTo(t.x1, t.y1);
                    g.lineTo(t.x2, t.y2);
                    g.strokePath();
                    break;
                }

                case 'crosshair': {
                    const r  = t.radius * (0.5 + 0.5 * pct);
                    const armLen = r * 1.4;
                    g.lineStyle(2, color, alpha);
                    g.strokeCircle(t.x, t.y, r);
                    // Cruz
                    g.beginPath();
                    g.moveTo(t.x - armLen, t.y); g.lineTo(t.x + armLen, t.y);
                    g.moveTo(t.x, t.y - armLen); g.lineTo(t.x, t.y + armLen);
                    g.strokePath();
                    break;
                }

                case 'ground': {
                    // Pulsación: 3 anillos concéntricos que se expanden
                    for (let ring = 0; ring < 3; ring++) {
                        const ringPct = (pct + ring / 3) % 1;
                        const r       = t.radius * ringPct;
                        const a       = alpha * (1 - ringPct);
                        g.lineStyle(3, color, a);
                        g.strokeCircle(t.x, t.y, r);
                    }
                    g.fillStyle(color, alpha * 0.08);
                    g.fillCircle(t.x, t.y, t.radius);
                    break;
                }
            }
        }
    }

    get hasActive() { return this._active.length > 0; }
}
