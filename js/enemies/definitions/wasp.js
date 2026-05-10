// Enemigo generado con Enemy Creator (v2.0)
// Nombre: wasp
// Fecha: 10-05-2026, 2:03:28 a. m.

export default {
    id: 'wasp',
    name: 'wasp',
    config: {
    id: "wasp",
    name: "wasp",
    basic: {
        hp: 200,
        hpRegen: 0,
        color: "0xFFFF00",
        shape: "circle",
        radius: 15,
        isBoss: false,
        selfDestruct: {
            type: "none",
            value: 0
        },
        spawnTrigger: {
            type: "immediate",
            value: ""
        }
    },
    movement: {
        mobile: true,
        speed: 200,
        activeSpeed: 250,
        scaling: {
            timeBase: true,
            timeMultiplier: 1.1,
            hpBase: "inverse",
            hpPercentage: 100
        },
        style: "seek",
        orbitRange: 120,
        erraticTime: 2000,
        ignoreWalls: true,
        isPhantom: true,
        reactionRadius: 300,
        disengageRadius: 600,
        reactions: []
    },
    damageMultipliers: {
        dash: 1,
        aerialDash: 2,
        momentum3: 1,
        slam: 1,
        slam3: 2,
        void: 0,
        wallCrash: 1,
        explosion: 2
    },
    onDeath: [
        {
            type: "extraCredits",
            chance: 100,
            condition: "any",
            params: {
                amount: 3
            }
        }
    ],
    ambitious: {
        isWall: false,
        seeThroughWalls: true,
        attack: {
            type: "contact",
            effect: "push",
            damage: 2,
            cooldown: 1000
        },
        defense: {
            invulnerableAura: false,
            evade: false
        },
        spawn: {
            pattern: "normal",
            count: 3
        },
        hates: [
            "bee"
        ],
        hateRadius: 25,
        hateDamage: 5
    }
}
};