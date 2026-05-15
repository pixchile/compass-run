// Enemigo generado con Enemy Creator (v2.0)
// Nombre: wasp
// Fecha: 14-05-2026, 11:38:52 p. m.

export default {
    id: 'wasp',
    name: 'wasp',
    config: {
    id: "wasp",
    name: "wasp",
    basic: {
        hp: 100,
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
            timeMultiplier: 1.3,
            hpBase: "inverse",
            hpPercentage: 100
        },
        locomotion: "fly",
        intention: "chase",
        fleeOn: {
            damaged: false,
            lowHp: 0,
            chaseOnDamaged: false
        },
        orbitRange: 120,
        erraticTime: 2000,
        ignoreWalls: true,
        isPhantom: true,
        reactionRadius: 300,
        disengageRadius: 600,
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
        aerialDash: 2,
        wallJumpDash: 1,
        momentum3: 0.5,
        slam: 1,
        slam3: 1,
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
                amount: 4
            }
        }
    ],
    ambitious: {
        impenetrable: false,
        seeThroughWalls: true,
        attack: {
            type: "contact",
            effect: "none",
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
        hateRadius: 100,
        hateDamage: 5,
        hateOverridesFleeOnDamage: false
    }
}
};