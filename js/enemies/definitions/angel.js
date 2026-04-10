// Enemigo generado con Enemy Creator (v2.0)
// Nombre: bot01
// Fecha: 08-04-2026, 11:36:03 a. m.

export default {
    id: 'angel',
    config: {
    id: "angel",
    name: "angel",
    basic: {
        hp: 300,
        hpRegen: 30,
        color: "0x98FF00",
        shape: "rectangle",
        radius: 20,
        isBoss: false,
        selfDestruct: {
            type: "none",
            value: 0
        },
        spawnTrigger: {
            type: "time",
            value: "5"
        }
    },
    movement: {
        mobile: true,
        speed: 1,
        scaling: {
            timeBase: true,
            timeMultiplier: 1,
            hpBase: "inverse",
            hpPercentage: 500
        },
        style: "seek",
        orbitRange: 120,
        erraticTime: 2000,
        distanceMin: 8,
        distanceMax: 300,
        ignoreWalls: false,
        isPhantom: false
    },
    damageMultipliers: {
        dash: 1,
        aerialDash: 4,
        momentum3: 1,
        slam: 1,
        slam3: 2,
        void: 1000,
        wallCrash: 400,
        explosion: 1
    },
    onDeath: [
        {
            type: "dropOrb",
            chance: 100,
            condition: "dash",
            params: {}
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