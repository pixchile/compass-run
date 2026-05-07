// js/systems/ZoneSystem.js
export default class ZoneSystem {
    constructor() {
        this._scene = null;
        this._inShopZone = false; // si el jugador está dentro de alguna zona shop
    }

    setScene(scene) {
        this._scene = scene;
    }

    _pointInPolygon(px, py, vertices) {
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;
            if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    }

    _isInsideZone(px, py, zone) {
        const geo = zone.geometry;
        const bbox = geo?.bbox || geo || zone;
        const bx = bbox.x ?? zone.x;
        const by = bbox.y ?? zone.y;
        const bw = bbox.w ?? zone.w;
        const bh = bbox.h ?? zone.h;

        if (bx === undefined || by === undefined) return false;

        // Fast AABB rejection
        if (px < bx || px > bx + bw || py < by || py > by + bh) return false;

        // If zone has polygon vertices, do accurate point-in-polygon
        const verts = geo?.vertices;
        if (verts && verts.length >= 3) return this._pointInPolygon(px, py, verts);

        return true; // simple rect
    }

    checkZones(player, zones, delta) {
        if (!zones || !this._scene) return;

        let playerInShop = false;

        for (const zone of zones) {
            if (!this._isInsideZone(player.px, player.py, zone)) continue;

            switch (zone.type) {
                case 'void':
                    if (!player.jumping && player.health) player.health.takeDamage(9999);
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
                    if (!zone._isFire && player.health) {
                        const dps = zone.damagePerSec ?? 30;
                        player.health.takeDamage(dps * (delta / 1000));
                    }
                    break;

                case 'slow_zone':
                    player.slowTimer = (player.slowTimer || 0) + delta * 1.5;
                    break;

                case 'trap':
                    player.trapped = true;
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

        // Void zones matan enemigos que no pueden ignorar muros (terrestres)
        const enemies = this._scene.enemyManager?.enemies;
        if (enemies) {
            for (const z of zones) {
                if (z.type !== 'void') continue;
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const e = enemies[j];
                    if (e.ignoreWalls) continue;
                    if (this._isInsideZone(e.x, e.y, z)) {
                        const hpBefore = e.hp;
                        const died = e.receiveDamage
                            ? e.receiveDamage({ type: 'void', baseDamage: 9999, now: this._scene?.time?.now ?? Date.now() })
                            : (() => { e.hp = (e.hp || 1) - 9999; return e.hp <= 0; })();
                        const actualDmg = hpBefore - e.hp;
                        if (actualDmg > 0) this._scene?.spawnDamageNumber?.(e.x, e.y, actualDmg, 'voidDamage');
                        if (died) this._scene.enemyManager.killEnemy(j, e, 'void');
                    }
                }
            }
        }

        // Trap zones freeze grounded enemies
        if (enemies) {
            for (const z of zones) {
                if (z.type !== 'trap') continue;
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const e = enemies[j];
                    if (e.ignoreWalls) continue;
                    if (this._isInsideZone(e.x, e.y, z)) {
                        e.trapped = true;
                    }
                }
            }
        }

        // Expirar zonas temporales (ej: rastro de fuego de CCC)
        for (let i = zones.length - 1; i >= 0; i--) {
            const z = zones[i];
            if (z.timeLeft !== undefined) {
                // CCC: zonas de fuego dañan enemigos
                if (z._isFire && enemies) {
                    const dps  = z.damagePerSec ?? 20;
                    const dmg  = dps * (delta / 1000);
                    for (let j = enemies.length - 1; j >= 0; j--) {
                        const e = enemies[j];
                        if (this._isInsideZone(e.x, e.y, z)) {
                            const hpBefore = e.hp;
                            const died = e.receiveDamage
                                ? e.receiveDamage({ type: 'fire', baseDamage: dmg, now: this._scene?.time?.now ?? Date.now() })
                                : (() => { e.hp = (e.hp || 1) - dmg; return e.hp <= 0; })();
                            const actualDmg = hpBefore - e.hp;
                            if (actualDmg > 0) this._scene?.spawnDamageNumber?.(e.x, e.y, actualDmg, 'fireDamage');
                            if (died) this._scene.enemyManager.killEnemy(j, e, 'fire');
                        }
                    }
                }
                z.timeLeft -= delta;
                if (z.timeLeft <= 0) zones.splice(i, 1);
            }
        }
    }
}