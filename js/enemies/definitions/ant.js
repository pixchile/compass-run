// Enemigo generado con Enemy Creator (v2.0)
// Nombre: ant
// Fecha: 12-05-2026, 2:28:05 p. m.

export default {
    id: 'ant',
    name: 'ant',
    config: {
    id: "ant",
    name: "ant",
    basic: {
        hp: 50,
        hpRegen: 0,
        color: "0x0062FF",
        shape: "circle",
        radius: 10,
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
        speed: 150,
        activeSpeed: 175,
        scaling: {
            timeBase: true,
            timeMultiplier: 1.2,
            hpBase: "inverse",
            hpPercentage: 30
        },
        style: "wander",
        locomotion: "ground",
        intention: "wander",
        fleeOn: { damaged: true, lowHp: 0 },
        orbitRange: 120,
        erraticTime: 3000,
        ignoreWalls: false,
        isPhantom: false,
        reactionRadius: 400,
        disengageRadius: 100,
        reactions: []
    },
    damageMultipliers: {
        dash: 1,
        aerialDash: 1,
        wallJumpDash: 1,
        momentum3: 1,
        slam: 1,
        slam3: 1,
        void: 100,
        wallCrash: 0,
        explosion: 1
    },
    onDeath: [
        {
            type: "extraCredits",
            chance: 100,
            condition: "any",
            params: {
                amount: 2
            }
        }
    ],
    ambitious: {
        impenetrable: false,
        seeThroughWalls: false,
        attack: {
            type: "contact",
            effect: "none",
            damage: 3,
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
            "spider",
            "anti",
            "bee",
            "wasp",
            "cricket"
        ],
        hateRadius: 50,
        hateDamage: 10,
        hateOverridesFleeOnDamage: true
    }
}
};