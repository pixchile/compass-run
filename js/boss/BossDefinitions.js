// js/boss/BossDefinitions.js
// Registry de definiciones de boss. Mirrors EnemyRegistry pattern.
// Importa y registra todas las definiciones de js/boss/definitions/*.

import toroDef from './definitions/boss_toro.js';
import centinelaDef from './definitions/boss_centinela.js';

class BossDefinitions {
    constructor() {
        this._defs = new Map();
        // Registrar todos los bosses
        [toroDef, centinelaDef].forEach(def => this.register(def));
    }

    register(def) {
        if (!def?.id) { console.warn('[BossDefinitions] def sin id:', def); return; }
        this._defs.set(def.id, def);
    }

    get(id) {
        return this._defs.get(id) || null;
    }

    has(id) {
        return this._defs.has(id);
    }

    list() {
        return Array.from(this._defs.values());
    }
}

export default new BossDefinitions();
