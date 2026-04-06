// js/enemies/definitions/index.js
// Archivo central para registrar todos los enemigos personalizados
// 
// CÓMO USAR:
// 1. Crea un nuevo enemigo con el Enemy Creator
// 2. Guarda el archivo en esta misma carpeta (ej: mi_enemigo.js)
// 3. Importa el enemigo abajo (descomenta la línea)
// 4. Añade el enemigo al array "customEnemies"
// 5. En Game.js y MapEditor.js, llama a registerAllCustomEnemies(registry)

// ============================================================
// IMPORTS - Añade aquí tus enemigos personalizados
// ============================================================

import bot01 from './bot01.js';
// import otroEnemigo from './otro_enemigo.js';
// import enemigoEspecial from './enemigo_especial.js';
// import jefeFinal from './jefe_final.js';

// ============================================================
// LISTA DE TODOS LOS ENEMIGOS PERSONALIZADOS
// ============================================================

export const customEnemies = [
    bot01,
    // otroEnemigo,
    // enemigoEspecial,
    // jefeFinal,
];

// ============================================================
// FUNCIÓN PARA REGISTRAR TODOS EN UNA SOLA LLAMADA
// ============================================================

export function registerAllCustomEnemies(registry) {
    for (const enemy of customEnemies) {
        if (enemy && enemy.name && enemy.config) {
            registry.registerCustom(enemy.name, enemy.config);
            console.log(`✅ Enemigo registrado: ${enemy.name}`);
        } else {
            console.warn(`⚠️ Enemigo inválido en la lista:`, enemy);
        }
    }
    console.log(`📋 Total de enemigos personalizados registrados: ${customEnemies.length}`);
}

// ============================================================
// EXPORTACIÓN INDIVIDUAL (opcional, para importar específicos)
// ============================================================

export { bot01 };
// export { otroEnemigo };
// export { enemigoEspecial };
// export { jefeFinal };