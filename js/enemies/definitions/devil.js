// Enemigo generado con Enemy Creator
// Nombre: devil
// Fecha: 06-04-2026, 8:12:41 p. m.

export default {
    name: 'devil',
    config: {
    type: "devil",
    radius: 16,
    maxHp: 29,
    hp: 29,
    color: "0xff6666",
    speed: 2,
    movementStyle: "circle",
    behaviors: {
        mobile: true
    },
    distanceMin: 40,
    distanceMax: 100,
    ignoreWalls: true,
    wanderSpeed: 0.5,
    dashDamage: 30,
    slamVulnerable: false,
    teleportOnHit: false,
    orbitRadius: 100,
    onDeath: [
        {
            type: "explode",
            radius: 80,
            damage: 25
        }
    ]
}
};