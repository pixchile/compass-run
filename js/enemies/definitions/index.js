// js/enemies/definitions/index.js

import DynamicEnemy from '../core/DynamicEnemy.js';

// Add editor-generated enemy imports here:
import ant from './ant.js';
import beetle from './beetle.js';
import spider from './spider.js';
import cricket from './cricket.js';
import wasp from './wasp.js';
import dummy from './dummy.js';
import bee from './bee.js';
import custom_enemy from './custom_enemy.js';
// import myEnemy from './myEnemy.js';

const customEnemies = [
    // Add editor-generated enemies here:
    ant,
    beetle,
    spider,
    cricket,
    wasp,
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
