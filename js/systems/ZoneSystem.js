export default class ZoneSystem {
    checkZones(player, zones) {
        if (!zones) return;
        
        for (const zone of zones) {
            if (player.px >= zone.x && player.px <= zone.x + zone.w &&
                player.py >= zone.y && player.py <= zone.y + zone.h) {
                
                if (zone.type === 'death') {
                    player.health.takeDamage(9999); // Instakill
                } else if (zone.type === 'heal' && player.health) {
                    player.health.heal(zone.amount || 10);
                }
            }
        }
    }
}