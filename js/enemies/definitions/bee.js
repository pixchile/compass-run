// Enemigo generado con Enemy Creator (v2.0)
// Nombre: bee
// Fecha: 14-05-2026, 11:39:29 p. m.

export default {
    id: 'bee',
    name: 'bee',
    config: {
    id: "bee",
    name: "bee",
    basic: {
        hp: 100,
        hpRegen: 2,
        color: "0xFFBB00",
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
        speed: 160,
        activeSpeed: 200,
        scaling: {
            timeBase: true,
            timeMultiplier: 1.1,
            hpBase: "proportional",
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
            damage: 1,
            cooldown: 250
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
            "wasp"
        ],
        hateRadius: 400,
        hateDamage: 5,
        hateOverridesFleeOnDamage: false
    }
}
};