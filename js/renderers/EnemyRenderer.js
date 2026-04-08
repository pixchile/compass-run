// js/scenes/EnemyRenderer.js

export default class EnemyRenderer {
  render(graphics, enemies) {
    for (let i = 0, len = enemies.length; i < len; i++) {
      const enemy = enemies[i];
      const type = enemy.type;
      
      // OPTIMIZACIÓN: Calculamos el porcentaje de vida 1 sola vez
      const hpPct = enemy.hp / enemy.maxHp;
      let color = enemy.color;
      
      // OPTIMIZACIÓN: Variables predefinidas para la barra de vida
      let barWidth = 0, barHeight = 0, barYOffset = 0;
      let showBar = false;
      let barColor = 0xff6666;
      let borderAlpha = 0; // Para el borde de la barra del 'big'
      
      if (type === 'medium') {
        if (hpPct > 0.6) color = 0xff6666;
        else if (hpPct > 0.3) color = 0xff8844;
        else color = 0xffaa66;
        
        barWidth = enemy.radius * 1.6;
        barHeight = 5;
        barYOffset = 7;
        showBar = true;
        barColor = hpPct > 0.5 ? 0x44ff44 : (hpPct > 0.25 ? 0xffaa44 : 0xff4444);
      } 
      else if (type === 'big') {
        if (hpPct > 0.6) color = 0xaa2222;
        else if (hpPct > 0.3) color = 0xcc4422;
        else color = 0xff6644;
        
        barWidth = enemy.radius * 2.2;
        barHeight = 8;
        barYOffset = 12;
        showBar = true;
        borderAlpha = 0.5;
        barColor = hpPct > 0.6 ? 0x44ff44 : (hpPct > 0.3 ? 0xffaa44 : 0xff4444);
      } 
      else { // type === 'small' (o fallback)
        if (hpPct < 1) { // Solo si está dañado
          barWidth = enemy.radius * 1.2;
          barHeight = 3;
          barYOffset = 4;
          showBar = true;
          barColor = 0xff6666;
        }
      }
      
      // --- DIBUJADO DEL CUERPO (Común para todos) ---
      graphics.fillStyle(0x000000, 0.25);
      graphics.fillCircle(enemy.x, enemy.y + 3, enemy.radius); // Sombra
      
      graphics.fillStyle(color, 0.95);
      graphics.fillCircle(enemy.x, enemy.y, enemy.radius); // Cuerpo
      
      graphics.fillStyle(0xffffff, 0.15);
      graphics.fillCircle(enemy.x - 2, enemy.y - 2, enemy.radius * 0.35); // Brillo
      
      graphics.lineStyle(2, 0x000000, 0.3);
      graphics.strokeCircle(enemy.x, enemy.y, enemy.radius); // Borde
      
      // --- DIBUJADO DE LA BARRA (DRY - No Repeat Yourself) ---
      if (showBar) {
        const barX = enemy.x - barWidth / 2;
        const barY = enemy.y - enemy.radius - barYOffset;
        
        graphics.fillStyle(type === 'big' ? 0x220000 : 0x331100, type === 'big' ? 0.9 : 0.8);
        graphics.fillRect(barX, barY, barWidth, barHeight);
        
        if (borderAlpha > 0) {
          graphics.lineStyle(1, 0xff8866, borderAlpha);
          graphics.strokeRect(barX, barY, barWidth, barHeight);
        }
        
        graphics.fillStyle(barColor, 0.95);
        graphics.fillRect(barX, barY, barWidth * hpPct, barHeight);
      }
      
      // --- ANILLOS EXTRA (Solo Big) ---
      if (type === 'big') {
        graphics.lineStyle(3, 0xff6644, 0.4);
        graphics.strokeCircle(enemy.x, enemy.y, enemy.radius + 4);
        graphics.lineStyle(2, 0xffaa88, 0.3);
        graphics.strokeCircle(enemy.x, enemy.y, enemy.radius + 2);
      }
    }
  }
}