// js/systems/ZoneSystem.js
export default class ZoneSystem {
    constructor() {
        this._scene = null;   // referencia a la escena
    }

    setScene(scene) {
        this._scene = scene;
    }

    checkZones(player, zones, delta) {
        if (!zones || !this._scene) return;

        for (const zone of zones) {
            const bbox = zone.geometry?.bbox || zone;
            const x = bbox.x ?? zone.x;
            const y = bbox.y ?? zone.y;
            const w = bbox.w ?? zone.w;
            const h = bbox.h ?? zone.h;

            if (x === undefined || y === undefined) continue;

            const inside = player.px >= x && player.px <= x + w &&
                           player.py >= y && player.py <= y + h;

            if (!inside) continue;

            switch (zone.type) {
                case 'void':
                    if (player.health) player.health.takeDamage(9999);
                    break;

                case 'shop':
                case 'pit_stop': {
                    // Usar el nombre completo de la capa como shopId (ej: "pit_n")
                    const shopId = zone.tags?.join('_') || 'shop_default';
                    
                    // Solo abrir si no está ya abierta
                    if (this._scene.shopUI && !this._scene.shopUI.visible) {
                        this._scene.shopUI.open(shopId);
                    }
                    break;
                }

                case 'damage_zone':
                    // Daño continuo moderado
                    if (player.health) player.health.takeDamage(0.5 * (delta / 1000) * 60);
                    break;

                case 'slow_zone':
                    // Aplica slow timer para reducir velocidad
                    player.slowTimer = (player.slowTimer || 0) + delta * 1.5;
                    break;

                case 'death':
                    if (player.health) player.health.takeDamage(9999);
                    break;

                case 'heal':
                    if (player.health) player.health.heal(zone.amount || 10);
                    break;
            }
        }
    }
}