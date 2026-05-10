// Enemigo generado con Enemy Creator (v2.0)
// Nombre: beetle
// Fecha: 09-05-2026, 9:45:53 p. m.

export default {
    id: 'beetle',
    name: 'beetle',
    config: {
    id: "beetle",
    name: "beetle",
    basic: {
        hp: 200,
        hpRegen: 0,
        color: "0x4F38FF",
        shape: "circle",
        radius: 15,
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
        speed: 55,
        activeSpeed: 200,
        scaling: {
            timeBase: true,
            timeMultiplier: 1.2,
            hpBase: "none",
            hpPercentage: 0
        },
        style: "flee",
        orbitRange: 120,
        erraticTime: 2000,
        ignoreWalls: false,
        isPhantom: false,
        reactionRadius: 100,
        disengageRadius: 100,
        reactions: [
            {
                event: "enemyHit",
                action: "flee",
                radius: 300,
                duration: 2000,
                speed: 0
            }
        ]
    },
    damageMultipliers: {
        dash: 2,
        aerialDash: 0.5,
        momentum3: 1,
        slam: 2,
        slam3: 2,
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
        isWall: false,
        seeThroughWalls: false,
        attack: {
            type: "contact",
            effect: "push",
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
        hates: [],
        hateRadius: 0,
        hateDamage: 5
    }
}
};