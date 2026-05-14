// Enemigo generado con Enemy Creator (v2.0)
// Nombre: cricket
// Fecha: 13-05-2026, 12:35:32 a. m.

export default {
    id: 'cricket',
    name: 'cricket',
    config: {
    id: "cricket",
    name: "cricket",
    basic: {
        hp: 500,
        hpRegen: 5,
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
        locomotion: "jump",
        intention: "chase",
        fleeOn: { damaged: false, lowHp: 0 },
        orbitRange: 120,
        erraticTime: 2000,
        ignoreWalls: false,
        isPhantom: false,
        reactionRadius: 250,
        disengageRadius: 500,
        reactions: [],
        dash: {
            speedMultiplier: 2.5,
            windupTime: 400,
            dashTime: 350,
            cooldownMin: 600,
            cooldownMax: 1500
        }
    },
    damageMultipliers: {
        dash: 1,
        aerialDash: 1,
        wallJumpDash: 5,
        momentum3: 1,
        slam: 1,
        slam3: 1,
        void: 1,
        wallCrash: 1,
        explosion: 1
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
        impenetrable: true,
        seeThroughWalls: false,
        attack: {
            type: "dash",
            effect: "none",
            damage: 10,
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
        hates: [],
        hateRadius: 0,
        hateDamage: 5,
        hateOverridesFleeOnDamage: false
    }
}
};