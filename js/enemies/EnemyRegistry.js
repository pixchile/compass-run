// js/enemies/EnemyRegistry.js
import DynamicEnemy from './core/DynamicEnemy.js';

class EnemyRegistry {
    constructor() {
        this.definitions = new Map();
        this.configs = new Map();
    }

    register(name, factoryFn) {
        this.definitions.set(name, factoryFn);
    }

    create(name, x, y, scene, extraConfig = {}) {
        const factory = this.definitions.get(name);
        if (!factory) {
            console.error(`Enemy type "${name}" not found`);
            return null;
        }
        return factory(x, y, scene, extraConfig);
    }

    has(name) {
        return this.definitions.has(name);
    }

    getAllTypes() {
        return Array.from(this.definitions.keys());
    }

    getTypeDefinition(type) {
        return this.configs.get(type) || null;
    }

    getTypeRadius(type) {
        const def = this.getTypeDefinition(type);
        return def?.basic?.radius || 12;
    }

    getTypeColor(type) {
        const def = this.getTypeDefinition(type);
        const c = def?.basic?.color;
        if (!c) return 0xff6666;
        if (typeof c === 'string') return parseInt(c.replace('#', '').replace('0x', ''), 16);
        return c;
    }
}

const enemyRegistry = new EnemyRegistry();
export default enemyRegistry;
