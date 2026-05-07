// Enemigo generado con Enemy Creator (v2.0)
// Nombre: CustomEnemy
// Fecha: 06-05-2026, 7:01:11 p. m.

export default {
    id: 'custom_enemy',
    name: 'CustomEnemy',
    config: {
    id: "custom_enemy",
    name: "CustomEnemy",
    basic: {
        hp: 100,
        hpRegen: 0,
        color: "0xFF6666",
        shape: "circle",
        radius: 16,
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
        speed: 50,
        scaling: {
            timeBase: false,
            timeMultiplier: 1,
            hpBase: "none",
            hpPercentage: 0
        },
        style: "seek",
        orbitRange: 120,
        erraticTime: 2000,
        distanceMin: 0,
        distanceMax: 0,
        ignoreWalls: false,
        isPhantom: false
    },
    damageMultipliers: {
        dash: 1,
        aerialDash: 4,
        momentum3: 1,
        slam: 1,
        slam3: 2,
        void: 100,
        wallCrash: 0,
        explosion: 1
    },
    onDeath: [],
    ambitious: {
        isWall: false,
        seeThroughWalls: false,
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