// js/enemies/definitions/index.js

import DynamicEnemy from '../core/DynamicEnemy.js';

// Add editor-generated enemy imports here:
import anti from './anti.js';
import ant from './ant.js';
import beetle from './beetle.js';
import spider from './spider.js';
import cricket from './cricket.js';
import wasp from './wasp.js';
import dummy from './dummy.js';
import bee from './bee.js';
import zancudo from './zancudo.js';
// import myEnemy from './myEnemy.js';

const customEnemies = [
    // Add editor-generated enemies here:
    anti,
    ant,
    beetle,
    spider,
    cricket,
    wasp,
    dummy,
    bee,
    zancudo,
    // myEnemy,
];

export function registerAllCustomEnemies(registry) {
    customEnemies.forEach(def => {
        const enemyId = def.id || def.name;

        if (enemyId && def.config) {
            registry.register(enemyId, def.factory
                ? def.factory
                : (x, y, scene) => new DynamicEnemy(x, y, scene, def.config));
            registry.configs.set(enemyId, def.config);
        } else {
            console.warn('Invalid enemy definition:', def);
        }
    });
}
