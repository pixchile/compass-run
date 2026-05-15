// Enemigo generado con Enemy Creator (v2.0)
// Nombre: beetle
// Fecha: 14-05-2026, 3:12:33 p. m.

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
        speed: 80,
        activeSpeed: 200,
        scaling: {
            timeBase: true,
            timeMultiplier: 1.2,
            hpBase: "none",
            hpPercentage: 0
        },
        locomotion: "ground",
        intention: "chase",
        fleeOn: {
            damaged: true,
            lowHp: 0,
            chaseOnDamaged: false
        },
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
                duration: 5000,
                speed: 150,
                allyType: "beetle"
            }
        ],
        dash: {
            speedMultiplier: 2.5,
            windupTime: 400,
            dashTime: 350,
            cooldownMin: 600,
            cooldownMax: 1500
        }
    },
    damageMultipliers: {
        dash: 0,
        aerialDash: 0,
        wallJumpDash: 0,
        momentum3: 1,
        slam: 0,
        slam3: 0,
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
                amount: 3
            }
        },
        {
            type: "spawnEnemies",
            chance: 20,
            condition: "any",
            params: {
                type: "beetle",
                count: 5
            }
        }
    ],
    ambitious: {
        impenetrable: false,
        seeThroughWalls: false,
        attack: {
            type: "contact",
            effect: "slow",
            damage: 1,
            cooldown: 500
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