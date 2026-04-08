// Enemigo generado con Enemy Creator
// Nombre: angel
// Fecha: 06-04-2026, 9:04:19 p. m.

export default {
    name: 'angel',
    config: {
    type: "angel",
    radius: 25,
    maxHp: 300,
    hp: 300,
    color: "0xbefefd",
    speed: 0,
    movementStyle: "flee",
    behaviors: {
        mobile: false
    },
    distanceMin: 30,
    distanceMax: 400,
    ignoreWalls: true,
    wanderSpeed: 0.5,
    dashDamage: 40,
    slamVulnerable: true,
    teleportOnHit: false,
    slamDamage: 350,
    onDeath: [
        {
            type: "healPlayer",
            amount: 100
        }
    ]
}
};