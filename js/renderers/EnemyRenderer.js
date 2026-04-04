export default class EnemyRenderer {
  render(graphics, enemies) {
    for (const enemy of enemies) {
      // Color según tipo y vida (efecto visual)
      let color = enemy.color;
      
      // Para enemigos medianos, cambia de color según vida
      if (enemy.type === 'medium') {
        const healthPercent = enemy.hp / enemy.maxHp;
        if (healthPercent > 0.6) color = 0xff6666;
        else if (healthPercent > 0.3) color = 0xff8844;
        else color = 0xffaa66;
      }
      
      // Para enemigos grandes, cambia de color según vida
      if (enemy.type === 'big') {
        const healthPercent = enemy.hp / enemy.maxHp;
        if (healthPercent > 0.6) color = 0xaa2222;
        else if (healthPercent > 0.3) color = 0xcc4422;
        else color = 0xff6644;
      }
      
      // Sombra suave
      graphics.fillStyle(0x000000, 0.25);
      graphics.fillCircle(enemy.x, enemy.y + 3, enemy.radius);
      
      // Cuerpo
      graphics.fillStyle(color, 0.95);
      graphics.fillCircle(enemy.x, enemy.y, enemy.radius);
      
      // Brillo superior
      graphics.fillStyle(0xffffff, 0.15);
      graphics.fillCircle(enemy.x - 2, enemy.y - 2, enemy.radius * 0.35);
      
      // Borde según tipo
      graphics.lineStyle(2, 0x000000, 0.3);
      graphics.strokeCircle(enemy.x, enemy.y, enemy.radius);
      
      // ============================================================
      // BARRA DE VIDA (para todos los tipos)
      // ============================================================
      
      const healthPercent = enemy.hp / enemy.maxHp;
      
      // Solo mostrar barra si no está con vida completa (o siempre, como prefieras)
      // Para small: solo mostrar si tiene daño (aunque tiene 1 HP, casi nunca se ve)
      if (enemy.type === 'small' && enemy.hp < enemy.maxHp) {
        const barWidth = enemy.radius * 1.2;
        const barHeight = 3;
        const barX = enemy.x - barWidth / 2;
        const barY = enemy.y - enemy.radius - 4;
        
        graphics.fillStyle(0x331100, 0.8);
        graphics.fillRect(barX, barY, barWidth, barHeight);
        
        graphics.fillStyle(0xff6666, 0.9);
        graphics.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      }
      
      // Barra para MEDIUM
      if (enemy.type === 'medium') {
        const barWidth = enemy.radius * 1.6;
        const barHeight = 5;
        const barX = enemy.x - barWidth / 2;
        const barY = enemy.y - enemy.radius - 7;
        
        graphics.fillStyle(0x331100, 0.8);
        graphics.fillRect(barX, barY, barWidth, barHeight);
        
        const fillColor = healthPercent > 0.5 ? 0x44ff44 : (healthPercent > 0.25 ? 0xffaa44 : 0xff4444);
        graphics.fillStyle(fillColor, 0.9);
        graphics.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      }
      
      // NUEVO: Barra para BIG (más grande y visible)
      if (enemy.type === 'big') {
        const barWidth = enemy.radius * 2.2;
        const barHeight = 8;
        const barX = enemy.x - barWidth / 2;
        const barY = enemy.y - enemy.radius - 12;
        
        // Fondo oscuro
        graphics.fillStyle(0x220000, 0.9);
        graphics.fillRect(barX, barY, barWidth, barHeight);
        
        // Borde
        graphics.lineStyle(1, 0xff8866, 0.5);
        graphics.strokeRect(barX, barY, barWidth, barHeight);
        
        // Color según porcentaje de vida
        let fillColor;
        if (healthPercent > 0.6) fillColor = 0x44ff44;      // Verde
        else if (healthPercent > 0.3) fillColor = 0xffaa44; // Amarillo
        else fillColor = 0xff4444;                          // Rojo
        
        graphics.fillStyle(fillColor, 0.95);
        graphics.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Texto de vida (opcional, muestra número)
        // Descomentar si quieres ver el número exacto
        /*
        graphics.fillStyle(0xffffff, 0.8);
        const hpText = `${Math.ceil(enemy.hp)}/${enemy.maxHp}`;
        // Nota: para texto necesitarías un objeto de texto de Phaser,
        // no se puede con graphics simple. Mejor omitir o usar scene.add.text()
        */
      }
      
      // Anillo para grandes (imponentes)
      if (enemy.type === 'big') {
        graphics.lineStyle(3, 0xff6644, 0.4);
        graphics.strokeCircle(enemy.x, enemy.y, enemy.radius + 4);
        graphics.lineStyle(2, 0xffaa88, 0.3);
        graphics.strokeCircle(enemy.x, enemy.y, enemy.radius + 2);
      }
    }
  }
}