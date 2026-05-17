// js/boss/definitions/boss_centinela.js
// Centinela: boss estático/defensivo. Usa muros de laser (orbit_ring + wall_spawn)
// y barrage dirigido. Se mueve poco, fuerza al player a acercarse.
// Fase 2 (<40% HP): se vuelve pursue + summons minions.

export default {
    id:   'centinela',
    name: 'Centinela',

    basic: {
        hp:     2400,
        radius: 32,
        color:  '#0055cc',
        shape:  'rectangle',
        isBoss: true,
        damageMultipliers: {
            dash:       1.0,
            aerialDash: 1.5,
            momentum3:  2.0,   // recompensa la velocidad
            slam:       1.2,
            slam3:      2.0,
            void:       100,
            wallCrash:  0,
            explosion:  1.5,
        },
    },

    phases: [
        {
            threshold: 100,
            movement: { style: 'hold_center', speed: 60 },
            attackPool: [
                { attack: 'orbit_ring',       weight: 3, cooldown: 5000, opts: { count: 8, orbitRadius: 110, orbitSpeed: 1.8, despawnMs: 5000 } },
                { attack: 'targeted_barrage', weight: 3, cooldown: 3500, opts: { count: 4, speed: 400 } },
                { attack: 'wall_spawn',       weight: 2, cooldown: 7000, opts: { count: 7, spacing: 44, despawnMs: 3000 } },
                { attack: 'radial_burst',     weight: 1, cooldown: 8000, opts: { count: 12, speed: 220 } },
            ],
            minAttackInterval: 1200,
            maxAttackInterval: 3000,
        },
        {
            threshold: 40,
            movement: { style: 'pursue', speed: 200 },
            attackPool: [
                { attack: 'orbit_ring',       weight: 3, cooldown: 4000, opts: { count: 10, orbitRadius: 100, orbitSpeed: 2.2, despawnMs: 4500 } },
                { attack: 'targeted_barrage', weight: 3, cooldown: 2500, opts: { count: 5, speed: 440 } },
                { attack: 'minion_summon',    weight: 2, cooldown: 9000, opts: { minionType: 'ant', count: 4 } },
                { attack: 'radial_burst',     weight: 2, cooldown: 5000, opts: { count: 14, speed: 260 } },
                { attack: 'wall_spawn',       weight: 1, cooldown: 6000, opts: { count: 9, spacing: 40, despawnMs: 2500 } },
            ],
            minAttackInterval: 800,
            maxAttackInterval: 2000,
        },
    ],

    onDeath: {
        credits: 400,
    },

    arenaConstraint: 'loose',
};
