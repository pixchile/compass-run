const POOL_SIZE = 50;
const FLOAT_SPEED = -0.4;
const FADE_START = 0.5;
const BASE_LIFETIME = 600;
const HORIZONTAL_JITTER = 18;

const COLORS = {
    playerDamage: '#ff4422',
    enemyDamage:  '#ffffc8',
    heal:         '#44dd77',
    slamDamage:   '#ffaa22',
    voidDamage:   '#ff0000',
    fireDamage:   '#ff8844',
    creditGain:   '#44ffcc',
    creditCost:   '#ff44cc',
};

export default class DamageNumberManager {
    constructor(scene) {
        this.scene = scene;
        this.pool = [];
        this.freeIndices = [];

        for (let i = 0; i < POOL_SIZE; i++) {
            const text = scene.add.text(0, 0, '', {
                fontFamily: 'monospace',
                fontSize: '16px',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2,
            });
            text.setOrigin(0.5).setAlpha(0).setVisible(false).setDepth(500);
            this.pool.push({ text, screenX: 0, screenY: 0, vy: 0, lifetime: 0, maxLife: 0, active: false });
            this.freeIndices.push(i);
        }
    }

    spawn(worldX, worldY, value, colorKey, camera) {
        if (value <= 0 && colorKey !== 'heal' && colorKey !== 'creditCost') return;
        const idx = this.freeIndices.pop();
        if (idx === undefined) return;

        const entry = this.pool[idx];
        const screen = camera.worldToScreen(worldX, worldY);
        const jitterX = (Math.random() - 0.5) * HORIZONTAL_JITTER * 2;

        entry.screenX = screen.x + jitterX;
        entry.screenY = screen.y;
        entry.vy = FLOAT_SPEED;
        entry.lifetime = BASE_LIFETIME;
        entry.maxLife = BASE_LIFETIME;
        entry.active = true;

        const displayVal = value < 1 ? value.toFixed(1) : Math.round(value).toString();
        entry.text.setPosition(entry.screenX, entry.screenY);
        entry.text.setText(displayVal);
        entry.text.setStyle({ color: COLORS[colorKey] || '#ffffff' });
        const scale = Math.min(1.8, 1.0 + Math.abs(value) * 0.012);
        entry.text.setAlpha(1).setVisible(true).setScale(scale);
    }

    update(delta) {
        for (let i = 0; i < this.pool.length; i++) {
            const entry = this.pool[i];
            if (!entry.active) continue;

            entry.lifetime -= delta;
            entry.screenY += entry.vy * delta;

            const lifeFrac = Math.max(0, entry.lifetime / entry.maxLife);
            if (lifeFrac <= FADE_START) {
                entry.text.setAlpha(lifeFrac / FADE_START);
            }

            entry.text.setPosition(entry.screenX, entry.screenY);

            if (entry.lifetime <= 0) {
                entry.active = false;
                entry.text.setVisible(false).setAlpha(0);
                this.freeIndices.push(i);
            }
        }
    }

    reset() {
        for (const entry of this.pool) {
            if (entry.active) {
                entry.active = false;
                entry.text.setVisible(false).setAlpha(0);
            }
        }
        this.freeIndices = [];
        for (let i = 0; i < this.pool.length; i++) {
            this.freeIndices.push(i);
        }
    }

    destroy() {
        for (const entry of this.pool) {
            entry.text.destroy();
        }
        this.pool = [];
        this.freeIndices = [];
    }
}
