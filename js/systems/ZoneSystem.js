// js/systems/ZoneSystem.js
export default class ZoneSystem {
    constructor() {
        this._scene = null;
        this._inShopZone = false; // si el jugador está dentro de alguna zona shop
    }

    setScene(scene) {
        this._scene = scene;
    }

    checkZones(player, zones, delta) {
        if (!zones || !this._scene) return;

        let playerInShop = false;

        for (const zone of zones) {
            const geo = zone.geometry;
            const bbox = geo?.bbox || geo || zone;
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
                    playerInShop = true;
                    const shopId = zone.tags?.join('_') || 'shop_default';
                    const ui = this._scene.shopUI;
                    if (ui && !ui.visible && !ui.manuallyClosed) {
                        ui.open(shopId);
                    }
                    break;
                }

                case 'damage_zone':
                    if (player.health) {
                        const dps = zone.damagePerSec ?? 30;
                        player.health.takeDamage(dps * (delta / 1000));
                    }
                    break;

                case 'slow_zone':
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

        // Al salir del área: cerrar shop si estaba abierto, y limpiar flag manual
        if (!playerInShop) {
            if (this._inShopZone && this._scene.shopUI?.visible) {
                this._scene.shopUI.close();
            }
            if (this._scene.shopUI) this._scene.shopUI.manuallyClosed = false;
        }
        this._inShopZone = playerInShop;

        // Expirar zonas temporales (ej: rastro de fuego de CCC)
        // El parámetro "zones" ya contiene la referencia al array necesario
        for (let i = zones.length - 1; i >= 0; i--) {
            const z = zones[i];
            if (z.timeLeft !== undefined) {
                z.timeLeft -= delta;
                if (z.timeLeft <= 0) zones.splice(i, 1);
            }
        }
    }
}