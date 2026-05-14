// Enemigo generado con Enemy Creator (v2.0)
// Nombre: bee
// Fecha: 12-05-2026, 11:59:52 p. m.

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
        speed: 150,
        activeSpeed: 180,
        scaling: {
            timeBase: true,
            timeMultiplier: 1.1,
            hpBase: "proportional",
            hpPercentage: 100
        },
        style: "seek",
        locomotion: "fly",
        intention: "chase",
        fleeOn: { damaged: false, lowHp: 0 },
        orbitRange: 120,
        erraticTime: 2000,
        ignoreWalls: true,
        isPhantom: true,
        reactionRadius: 250,
        disengageRadius: 500,
        reactions: []
    },
    damageMultipliers: {
        dash: 1,
        aerialDash: 2,
        wallJumpDash: 2,
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
                amount: 5
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