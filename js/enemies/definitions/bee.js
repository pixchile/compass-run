// Enemigo generado con Enemy Creator (v2.0)
// Nombre: bee
// Fecha: 06-05-2026, 7:23:15 p. m.

export default {
    id: 'bee',
    name: 'bee',
    config: {
    id: "bee",
    name: "bee",
    basic: {
        hp: 199,
        hpRegen: 0,
        color: "0xFFD500",
        shape: "circle",
        radius: 16,
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
        speed: 2,
        scaling: {
            timeBase: true,
            timeMultiplier: 1.1,
            hpBase: "proportional",
            hpPercentage: 50
        },
        style: "flee",
        orbitRange: 120,
        erraticTime: 2000,
        distanceMin: 0,
        distanceMax: 7,
        ignoreWalls: true,
        isPhantom: true
    },
    damageMultipliers: {
        dash: 1,
        aerialDash: 2,
        momentum3: 0,
        slam: 1,
        slam3: 2,
        void: 0,
        wallCrash: 1,
        explosion: 2
    },
    onDeath: [],
    ambitious: {
        isWall: false,
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
        }
    }
}
};