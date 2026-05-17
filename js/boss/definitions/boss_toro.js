// js/boss/definitions/boss_toro.js
// Toro: boss de carga. Alterna entre strafear y cargar.
// Fase 2 (<50% HP): más agresivo, añade radial burst y orbit ring.
// Mecánica especial: durante el charge el boss es invulnerable,
// y acumula daño que se libera al final (implementado con damageMultipliers).

export default {
    id:   'toro',
    name: 'El Toro',

    basic: {
        hp:     3000,
        radius: 38,
        color:  '#cc2200',
        shape:  'circle',
        isBoss: true,
        // Durante el charge el boss absorbe menos daño (no es el momento de golpearlo)
        damageMultipliers: {
            dash:        1.5,   // el dash del player hace más daño
            aerialDash:  2.0,
            momentum3:   1.5,
            slam:        1.2,
            slam3:       1.8,
            void:        100,
            wallCrash:   0,
            explosion:   1.0,
        },
    },

    phases: [
        {
            threshold: 100,   // HP% para entrar a esta fase (siempre la primera)
            movement: { style: 'strafe', distance: 280, speed: 240 },
            attackPool: [
                { attack: 'charge',      weight: 4, cooldown: 4500 },
                { attack: 'cone',        weight: 2, cooldown: 6000, opts: { count: 5, speed: 300 } },
                { attack: 'ground_slam', weight: 1, cooldown: 9000 },
            ],
            minAttackInterval: 1500,
            maxAttackInterval: 3500,
        },
        {
            threshold: 50,   // se activa cuando HP cae por debajo del 50%
            movement: { style: 'strafe', distance: 240, speed: 320 },
            attackPool: [
                { attack: 'charge',           weight: 4, cooldown: 3000 },
                { attack: 'radial_burst',     weight: 2, cooldown: 5000, opts: { count: 10, speed: 300 } },
                { attack: 'cone',             weight: 2, cooldown: 4500, opts: { count: 7, speed: 340 } },
                { attack: 'orbit_ring',       weight: 1, cooldown: 8000, opts: { count: 6, orbitRadius: 90 } },
                { attack: 'ground_slam',      weight: 1, cooldown: 7000 },
            ],
            minAttackInterval: 1000,
            maxAttackInterval: 2500,
        },
    ],

    onDeath: {
        credits: 500,
    },

    arenaConstraint: 'loose',
};
