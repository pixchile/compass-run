// Enemigo generado con Enemy Creator
// Nombre: CustomEnemy
// Fecha: 07-04-2026, 1:19:22 a. m.

export default {
    name: 'custom_enemy',
    config: {
    type: "custom_enemy",
    radius: 16,
    maxHp: 100,
    hp: 100,
    color: "#fff700",
    speed: 0,
    movementStyle: "seek",
    behaviors: {
        mobile: false
    },
    distanceMin: 0,
    distanceMax: 0,
    ignoreWalls: false,
    wanderSpeed: 0.5,
    dashDamage: 10,
    slamVulnerable: true,
    teleportOnHit: false,
    pierceable: true,
    slamDamage: 1000
}
};