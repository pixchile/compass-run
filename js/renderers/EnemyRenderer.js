// js/scenes/EnemyRenderer.js

export default class EnemyRenderer {
  render(graphics, enemies) {
    for (let i = 0, len = enemies.length; i < len; i++) {
      const enemy = enemies[i];

      // BossAttackEnemy: visual simplificado (translúcido, borde de color boss)
      if (enemy._isBossAttack) {
        this._renderBossAttack(graphics, enemy);
        continue;
      }

      // OPTIMIZACIÓN: Solo usamos datos del Editor V2
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
      const color = enemy.color; 
      const shape = enemy.shape;
      const isBoss = enemy.isBoss;

      // Configuraciones dinámicas de la barra de vida
      const barWidth = enemy.radius * (isBoss ? 2.2 : 1.2);
      const barHeight = isBoss ? 8 : 3;
      const barYOffset = isBoss ? 12 : 4;
      
      // Mostrar la barra si es Boss, si es muy tanque, o si ha recibido daño
      const showBar = isBoss || enemy.maxHp >= 100 || hpPct < 1.0;
      
      // Color de la barra según porcentaje de HP
      const barColor = hpPct > 0.5 ? 0x44ff44 : (hpPct > 0.25 ? 0xffaa44 : 0xff4444);

      const angle = enemy.facingAngle ?? enemy._facingAngle ?? Math.PI * -0.5;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // --- DIBUJADO DEL CUERPO ---
      if (shape === 'triangle') {
        const r = enemy.radius;

        const tipX = enemy.x + cos * r;
        const tipY = enemy.y + sin * r;
        const backX = enemy.x - cos * r * 0.7;
        const backY = enemy.y - sin * r * 0.7;
        const perpX = -sin * r * 0.7;
        const perpY = cos * r * 0.7;

        graphics.fillStyle(color, 0.95);
        graphics.fillTriangle(tipX, tipY, backX + perpX, backY + perpY, backX - perpX, backY - perpY);

        graphics.lineStyle(2, 0x000000, 0.3);
        graphics.strokeTriangle(tipX, tipY, backX + perpX, backY + perpY, backX - perpX, backY - perpY);
      } else if (shape === 'rectangle') {
        const diam = enemy.radius * 2;
        const cx = enemy.x - enemy.radius;
        const cy = enemy.y - enemy.radius;

        // Cuerpo principal (Color del Editor)
        graphics.fillStyle(color, 0.95);
        graphics.fillRect(cx, cy, diam, diam); 

        // Direccional frontal (arco brillante)
        this._drawFacingArc(graphics, enemy, color, cos, sin);
        
        // Borde oscuro
        graphics.lineStyle(2, 0x000000, 0.3);
        graphics.strokeRect(cx, cy, diam, diam); 
      } else {
        // Por defecto: Círculo
        graphics.fillStyle(color, 0.95);
        graphics.fillCircle(enemy.x, enemy.y, enemy.radius);
        
        // Direccional frontal (arco brillante)
        this._drawFacingArc(graphics, enemy, color, cos, sin);
        
        graphics.lineStyle(2, 0x000000, 0.3);
        graphics.strokeCircle(enemy.x, enemy.y, enemy.radius);
      }
      
      // --- DIBUJADO DE LA BARRA DE VIDA ---
      if (showBar) {
        const barX = enemy.x - barWidth / 2;
        const barY = enemy.y - enemy.radius - barYOffset;
        
        // Fondo de la barra
        graphics.fillStyle(isBoss ? 0x220000 : 0x331100, isBoss ? 0.9 : 0.8);
        graphics.fillRect(barX, barY, barWidth, barHeight);
        
        // Marco brillante (Solo Bosses)
        if (isBoss) {
          graphics.lineStyle(1, 0xff8866, 0.5);
          graphics.strokeRect(barX, barY, barWidth, barHeight);
        }
        
        // Vida actual
        graphics.fillStyle(barColor, 0.95);
        graphics.fillRect(barX, barY, barWidth * hpPct, barHeight);
      }
      
      // --- AURA / ANILLOS DE JEFE ---
      if (isBoss) {
        if (shape === 'rectangle') {
          // Aura cuadrada del color del enemigo
          graphics.lineStyle(3, color, 0.4);
          graphics.strokeRect(enemy.x - enemy.radius - 4, enemy.y - enemy.radius - 4, (enemy.radius * 2) + 8, (enemy.radius * 2) + 8);
        } else {
          // Aura circular
          graphics.lineStyle(3, color, 0.4);
          graphics.strokeCircle(enemy.x, enemy.y, enemy.radius + 4);
          graphics.lineStyle(2, 0xffffff, 0.3); // Aro interno blanco
          graphics.strokeCircle(enemy.x, enemy.y, enemy.radius + 2);
        }
      }
    }
  }

  _drawFacingArc(graphics, enemy, color, cos, sin) {
    const r = enemy.radius * 0.65;
    const cx = enemy.x + cos * r * 0.55;
    const cy = enemy.y + sin * r * 0.55;

    const isBright = this._isBrightColor(color);
    const arcColor = isBright ? 0x000000 : 0xffffff;
    const alpha = isBright ? 0.55 : 0.65;

    graphics.fillStyle(arcColor, alpha);
    graphics.fillCircle(cx, cy, r * 0.55);
  }

  _isBrightColor(hex) {
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    return (r * 0.299 + g * 0.587 + b * 0.114) > 140;
  }

  _renderBossAttack(graphics, enemy) {
    const alpha     = typeof enemy.getAlpha === 'function' ? enemy.getAlpha() : 0.7;
    const bossColor = enemy.bossColor || 0xff4400;
    const r         = enemy.radius || 12;
    const pct       = enemy._despawnTimer / (enemy._maxDespawnMs || 2000);
    const pulse     = 0.55 + 0.2 * Math.sin(Date.now() * 0.008);

    // Sombra
    graphics.fillStyle(0x000000, 0.2 * alpha);
    graphics.fillCircle(enemy.x, enemy.y + 3, r);

    // Cuerpo translúcido con color del boss
    graphics.fillStyle(bossColor, 0.45 * alpha * pulse);
    graphics.fillCircle(enemy.x, enemy.y, r);

    // Borde brillante del color del boss
    graphics.lineStyle(2.5, bossColor, 0.9 * alpha);
    graphics.strokeCircle(enemy.x, enemy.y, r);

    // Aro interior blanco (amenaza visual)
    graphics.lineStyle(1, 0xffffff, 0.3 * alpha);
    graphics.strokeCircle(enemy.x, enemy.y, r * 0.55);
  }
}