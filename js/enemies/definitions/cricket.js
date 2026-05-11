// Enemigo generado con Enemy Creator (v2.0)
// Nombre: cricket
// Fecha: 09-05-2026, 6:03:44 p. m.

export default {
    id: 'cricket',
    name: 'cricket',
    config: {
    id: "cricket",
    name: "cricket",
    basic: {
        hp: 500,
        hpRegen: 0,
        color: "0xB30000",
        shape: "rectangle",
        radius: 20,
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
        speed: 150,
        activeSpeed: 200,
        scaling: {
            timeBase: true,
            timeMultiplier: 1.1,
            hpBase: "none",
            hpPercentage: 100
        },
        style: "dashOnly",
        orbitRange: 120,
        erraticTime: 2000,
        ignoreWalls: false,
        isPhantom: false,
        reactionRadius: 250,
        disengageRadius: 500,
        reactions: []
    },
    damageMultipliers: {
        dash: 1,
        aerialDash: 2,
        wallJumpDash: 4,
        momentum3: 1,
        slam: 4,
        slam3: 4,
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
                amount: 50
            }
        }
    ],
    ambitious: {
        isWall: false,
        seeThroughWalls: false,
        attack: {
            type: "dash",
            effect: "none",
            damage: 1,
            cooldown: 3
        },
        defense: {
            invulnerableAura: false,
            evade: false
        },
        spawn: {
            pattern: "normal",
            count: 3
        },
        hates: [],
        hateRadius: 0,
        hateDamage: 5
    }
}
};