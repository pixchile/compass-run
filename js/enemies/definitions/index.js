// js/enemies/definitions/index.js

// 1. Necesitamos importar la clase base que construirá a los enemigos custom
import DynamicEnemy from '../core/DynamicEnemy.js';

// 2. Importa aquí todos tus archivos generados por el editor
import angel from './angel.js';
import devil from './devil.js';
import bee from './bee.js';
import mibombo from './mibombo.js'

// 3. Añádelos al array
const customEnemies = [
    angel,
    devil,
    bee,
    mibombo
];

export function registerAllCustomEnemies(registry) {
    customEnemies.forEach(def => {
        // Asegurar compatibilidad entre V1 (.name) y V2 (.id)
        const enemyId = def.id || def.name;
        
        if (enemyId && def.config) {
            // AQUÍ ESTÁ EL ARREGLO: 
            // Envolvemos la configuración en una función (factory) que devuelve un new DynamicEnemy
            registry.register(enemyId, (x, y, scene) => {
                return new DynamicEnemy(x, y, scene, def.config);
            });

            registry.configs[enemyId] = def.config;
            
            // console.log(`✅ Enemigo registrado exitosamente: ${enemyId}`);
        } else {
            console.warn('⚠️ Enemigo inválido en la lista: ', def);
        }
    });
}