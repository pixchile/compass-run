// Enemigo generado con Enemy Creator (v2.0)
// Nombre: spider
// Fecha: 11-05-2026, 2:23:36 a. m.

export default {
    id: 'spider',
    name: 'spider',
    config: {
    id: "spider",
    name: "spider",
    basic: {
        hp: 110,
        hpRegen: 0,
        color: "0xFF00EA",
        shape: "circle",
        radius: 20,
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
        speed: 0,
        activeSpeed: 300,
        scaling: {
            timeBase: true,
            timeMultiplier: 1.2,
            hpBase: "none",
            hpPercentage: 0
        },
        style: "seek",
        locomotion: "ground",
        intention: "chase",
        fleeOn: { damaged: false, lowHp: 0 },
        orbitRange: 120,
        erraticTime: 2000,
        ignoreWalls: false,
        isPhantom: false,
        reactionRadius: 75,
        disengageRadius: 200,
        reactions: []
    },
    damageMultipliers: {
        dash: 0.1,
        aerialDash: 0.1,
        momentum3: 0,
        slam: 2,
        slam3: 4,
        void: 100,
        wallCrash: 1,
        explosion: 1
    },
    onDeath: [
        {
            type: "extraCredits",
            chance: 100,
            condition: "any",
            params: {
                amount: 100
            }
        }
    ],
    ambitious: {
        impenetrable: false,
        seeThroughWalls: false,
        attack: {
            type: "contact",
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
        hateDamage: 0,
        hateOverridesFleeOnDamage: false
    }
}
};