// Enemigo generado con Enemy Creator (v2.0)
// Nombre: bee
// Fecha: 09-04-2026, 2:17:23 p. m.

export default {
    id: 'bee',
    name: 'bee', // <--- AÑADE ESTA LÍNEA AQUÍ
    config: {
    id: "bee",
    name: "bee",
    basic: {
        hp: 30,
        hpRegen: 0,
        color: "0xFFEA00",
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
        speed: 4,
        scaling: {
            timeBase: false,
            timeMultiplier: 1,
            hpBase: "none",
            hpPercentage: 0
        },
        style: "orbit",
        orbitRange: 120,
        erraticTime: 2000,
        distanceMin: 0,
        distanceMax: 100,
        ignoreWalls: true,
        isPhantom: true
    },
    damageMultipliers: {
        dash: 1,
        aerialDash: 1,
        momentum3: 10,
        slam: 10,
        slam3: 10,
        void: 100,
        wallCrash: 0,
        explosion: 1
    },
    onDeath: [],
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
            pattern: "radial",
            count: 32
        }
    }
}
};