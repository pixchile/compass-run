// Enemigo generado con Enemy Creator (v2.0)
// Nombre: dummy 
// Fecha: 07-05-2026, 1:24:32 p. m.

export default {
    id: 'dummy',
    name: 'dummy ',
    config: {
    id: "dummy",
    name: "dummy ",
    basic: {
        hp: 2000,
        hpRegen: 100,
        color: "0xB4FEB5",
        shape: "rectangle",
        radius: 25,
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
        mobile: false,
        speed: 0,
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
        ignoreWalls: false,
        isPhantom: false
    },
    damageMultipliers: {
        dash: 1,
        aerialDash: 2,
        momentum3: 0,
        slam: 1,
        slam3: 2,
        void: 100,
        wallCrash: 0,
        explosion: 1
    },
    onDeath: [
        {
            type: "respawn",
            chance: 100,
            condition: "any",
            params: {}
        }
    ],
    ambitious: {
        isWall: false,
        seeThroughWalls: false,
        attack: {
            type: "contact",
            effect: "none",
            damage: 0,
            cooldown: 60000
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