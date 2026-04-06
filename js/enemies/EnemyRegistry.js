// js/enemies/EnemyRegistry.js
import DynamicEnemy from './core/DynamicEnemy.js';

class EnemyRegistry {
    constructor() {
        this.definitions = new Map();
        this.configs = new Map();
        // Ya no hay _registerDefaults()
    }
    
    // Eliminar este método o dejarlo vacío
    // _registerDefaults() { }
    
    register(name, factoryFn, config = null) {
        this.definitions.set(name, factoryFn);
        if (config) {
            this.configs.set(name, config);
        }
    }
    
    create(name, x, y, scene, extraConfig = {}) {
        const factory = this.definitions.get(name);
        if (!factory) {
            console.error(`❌ Enemy type "${name}" not found`);
            return null;
        }
        return factory(x, y, scene, extraConfig);
    }
    
    has(name) {
        return this.definitions.has(name);
    }
    
    registerCustom(name, config) {
        this.configs.set(name, config);
        this.definitions.set(name, (x, y, scene) => {
            return new DynamicEnemy(x, y, scene, config);
        });
        console.log(`✅ Enemigo personalizado registrado: ${name}`);
    }
    
    getAllTypes() {
        return Array.from(this.definitions.keys());
    }
    
    getTypeDefinition(type) {
        return this.configs.get(type) || null;
    }
    
    getTypeRadius(type) {
        const def = this.getTypeDefinition(type);
        return def ? (def.radius || 12) : 12;
    }
    
    getTypeColor(type) {
        const def = this.getTypeDefinition(type);
        return def ? (def.color || 0xff6666) : 0xff6666;
    }
}

const enemyRegistry = new EnemyRegistry();
export default enemyRegistry;