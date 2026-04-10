// Enemigo generado con Enemy Creator (v2.0)
// Nombre: mibombo
// Fecha: 09-04-2026, 10:20:47 p. m.

export default {
    id: 'mibombo',
    name: 'mibombo', // <--- AÑADE ESTA LÍNEA AQUÍ
    config: {
    id: "mibombo",
    name: "mibombo",
    basic: {
        hp: 1,
        hpRegen: 0,
        color: "0xFFEA00",
        shape: "circle",
        radius: 80,
        isBoss: false,
        selfDestruct: {
            type: "time",
            value: 25
        },
        spawnTrigger: {
            type: "kills",
            value: "5"
        }
    },
    movement: {
        mobile: true,
        speed: 6,
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
        distanceMax: 20,
        ignoreWalls: false,
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
    onDeath: [
        {
            type: "explode",
            chance: 100,
            condition: "any",
            params: {
                delay: 2,
                damage: 200,
                radius: 300
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
            count: 32
        }
    }
}
};