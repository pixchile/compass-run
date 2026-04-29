// Enemigo generado con Enemy Creator (v2.0)
// Nombre: bee2
// Fecha: 28-04-2026, 9:10:44 p. m.

export default {
    id: 'bee2',
    name: 'bee2', // <--- AÑADE ESTA LÍNEA AQUÍ
    config: {
    id: "bee2",
    name: "bee2",
    basic: {
        hp: 10,
        hpRegen: 0,
        color: "0xFF0045",
        shape: "circle",
        radius: 16,
        isBoss: false,
        selfDestruct: {
            type: "none",
            value: 0
        },
        spawnTrigger: {
            type: "immediate",
            value: "0"
        }
    },
    movement: {
        mobile: true,
        speed: 2,
        scaling: {
            timeBase: false,
            timeMultiplier: 1,
            hpBase: "none",
            hpPercentage: 0
        },
        style: "seek",
        orbitRange: 120,
        erraticTime: 2000,
        distanceMin: 0,
        distanceMax: 0,
        ignoreWalls: true,
        isPhantom: true
    },
    damageMultipliers: {
        dash: 1,
        aerialDash: 4,
        momentum3: 1,
        slam: 1,
        slam3: 2,
        void: 100,
        wallCrash: 0,
        explosion: 1
    },
    onDeath: [
        {
            type: "momentumStack",
            chance: 100,
            condition: "any",
            params: {
                amount: 1
            }
        }
    ],
    ambitious: {
        isWall: false,
        attack: {
            type: "contact",
            effect: "none"
        },
        defense: {
            invulnerableAura: false,
            evade: false
        },
        spawn: {
            pattern: "normal",
            count: 3
        }
    }
}
};