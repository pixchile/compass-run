// Enemigo generado con Enemy Creator (v2.0)
// Nombre: ant
// Fecha: 10-05-2026, 5:08:31 p. m.

export default {
    id: 'ant',
    name: 'ant',
    config: {
    id: "ant",
    name: "ant",
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
        speed: 75,
        activeSpeed: 100,
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
        reactionRadius: 10,
        disengageRadius: 10,
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
            "spider"
        ],
        hateRadius: 200,
        hateDamage: 5
    }
}
};