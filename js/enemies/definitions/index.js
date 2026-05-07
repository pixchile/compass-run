// js/enemies/definitions/index.js

import DynamicEnemy from '../core/DynamicEnemy.js';

// Add editor-generated enemy imports here:
import dummy from './dummy.js';
import bee from './bee.js';
import custom_enemy from './custom_enemy.js';
// import myEnemy from './myEnemy.js';

const customEnemies = [
    // Add editor-generated enemies here:
    dummy,
    bee,
    custom_enemy,
    // myEnemy,
];

export function registerAllCustomEnemies(registry) {
    customEnemies.forEach(def => {
        const enemyId = def.id || def.name;

        if (enemyId && def.config) {
            registry.register(enemyId, (x, y, scene) => {
                return new DynamicEnemy(x, y, scene, def.config);
            });
            registry.configs.set(enemyId, def.config);
        } else {
            console.warn('Invalid enemy definition:', def);
        }
    });
}
