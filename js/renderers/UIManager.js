import { W, H, ARENA, HP_MAX, C, DIRS, SMAX, L2, L3 } from '../constants.js';

export default class UIManager {
  constructor(scene) {
    this.scene = scene;
    
    // Configuración de textos
    const mono = { fontFamily: 'monospace', fontSize: '13px', color: '#7788aa' };
    const monoBig = { fontFamily: 'monospace', fontSize: '21px', color: '#ffffff', fontStyle: 'bold' };
    
    // Crear todos los textos
    this.hudLevel = scene.add.text(W / 2, 27, '', monoBig).setOrigin(0.5);
    this.hudMoment = scene.add.text(20, H - 44, '', mono);
    this.hudSpeed = scene.add.text(W - 20, H - 44, '', { ...mono, align: 'right' }).setOrigin(1, 0);
    this.hudKey = scene.add.text(W - 90, 164, '', { fontFamily: 'monospace', fontSize: '15px', color: '#ffff88' }).setOrigin(0.5);
    this.hudAction = scene.add.text(W / 2, H - 72, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    this.hudHp = scene.add.text(20, ARENA.y - 26, '', { fontFamily: 'monospace', fontSize: '11px', color: '#44dd77' });
    this.hudZoom = scene.add.text(W - 80, 30, '', { fontFamily: 'monospace', fontSize: '10px', color: '#88aaff' });
    this.hudCredits = scene.add.text(20, ARENA.y - 42, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffdd44'
    });
    
    // ⭐ TIMER - esta es la línea que faltaba
    this.hudTimer = scene.add.text(W / 2, 60, '', { 
      fontFamily: 'monospace', 
      fontSize: '16px', 
      color: '#ffaa44', 
      fontStyle: 'bold' 
    }).setOrigin(0.5);
    
    // Textos de niveles en la barra
    const lblY = H - 58;
    const lbl = { fontFamily: 'monospace', fontSize: '10px', color: '#445566' };
    scene.add.text(20, lblY, 'NV.1', lbl);
    
    this.momentumBarWidth = null;
    this.labelsCreated = false;
    
    // ─── TEXTO GAME OVER ───
    this.gameOverText = scene.add.text(W / 2, H / 2 - 40, '', {
      fontFamily: 'monospace',
      fontSize: '42px',
      color: '#ff3322',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);
    
    this.gameOverSubtext = scene.add.text(W / 2, H / 2 + 20, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5).setAlpha(0);
    
    this.restartText = scene.add.text(W / 2, H / 2 + 60, 'PRESIONA [ ESPACIO ] PARA JUGAR DE NUEVO', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5).setAlpha(0);
  }
  
  updateTexts(player, momentum, camera, gameOver, gameOverAlpha, gameOverReason, timeRemaining, time, credits = 0) {
    const lv = momentum.level;
    const spd = Math.hypot(player.vx, player.vy);
    const hpPct = Math.max(0, player.hp / HP_MAX);
    
    // Texto de nivel
    this.hudLevel.setText(`── NIVEL ${lv} ──`).setColor(momentum.lHex);
    this.hudCredits.setText(`⬡ ${credits} créditos`);
    
    // Texto de momentum
    const modeStr = momentum.stackMode === 'gain' ? '▲ ganando' : momentum.stackMode === 'neutral' ? '◆ neutral' : '▼ drenando';
    const modeCol = momentum.stackMode === 'gain' ? '#44ff88' : momentum.stackMode === 'neutral' ? '#aaaaff' : '#ff5544';
    this.hudMoment.setText(`momentum  ${momentum.stacks} / ${SMAX}   ${modeStr}`).setColor(modeCol);
    
    // Texto de velocidad
    this.hudSpeed.setText(`${Math.round(spd)} px/s`);
    
    // Texto de zoom
    this.hudZoom.setText(`zoom: ${(camera.zoom * 100).toFixed(0)}%`);
    
    // Texto de vida
    const hpInt = Math.ceil(player.hp);
    const regenStr = (player.hpRegenT > 0 && player.hp < HP_MAX) ? (player.hpRegenT < 4000 ? '' : ' ♥') : '';
    const hpColor = hpPct > 0.5 ? '#44dd77' : hpPct > 0.25 ? '#ffcc22' : '#ff3322';
    this.hudHp.setText(`HP  ${hpInt} / ${HP_MAX}${regenStr}`).setColor(hpColor);
    
    // ⭐ TEXTO DEL TIMER - actualizar aquí
    if (timeRemaining !== undefined && !gameOver) {
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = timeRemaining % 60;
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      const timeColor = timeRemaining < 30 ? '#ff4444' : timeRemaining < 60 ? '#ffaa44' : '#44ff88';
      this.hudTimer.setText(`⏱ ${timeStr}`).setColor(timeColor);
      this.hudTimer.setAlpha(1);
    } else if (gameOver && timeRemaining !== undefined && timeRemaining <= 0) {
      this.hudTimer.setText(`⏱ 00:00`).setColor('#ff4444');
      this.hudTimer.setAlpha(1);
    } else if (gameOver) {
      this.hudTimer.setAlpha(0);
    } else {
      // Si no hay timeRemaining, ocultar timer
      this.hudTimer.setAlpha(0);
    }
    
    // Texto de acción
    let actStr = '', actCol = '#ffffff';
    if (player.isDead) { 
      actStr = '✖ SIN VIDA'; 
      actCol = '#ff2200'; 
    } else if (player.isStunned) { 
      actStr = `⚡ ATURDIDO  ${(player.stunT / 1000).toFixed(1)}s`; 
      actCol = '#ff4422'; 
    } else if (player.dashing) { 
      actStr = '▶▶ EMBESTIDA'; 
      actCol = '#ffffff'; 
    } else if (player.jumping) {
      const jumpPct = Math.sin((player.jumpT / player.jumpDur) * Math.PI);
      actStr = `↑ SALTO NV${player.jumpLv}  ${Math.round(jumpPct * 100)}%`; 
      actCol = player.jumpLv === 3 ? '#ff3322' : player.jumpLv === 2 ? '#ffaa22' : '#4488ff'; 
    } else if (lv >= 2 && player.dashCD === 0) { 
      actStr = 'SHIFT · embestida lista'; 
      actCol = '#334466'; 
    }
    this.hudAction.setText(actStr).setColor(actCol);
    
    // ─── PANTALLA GAME OVER ───
    if (gameOver) {
      const textAlpha = Math.max(0, Math.min(1, (gameOverAlpha - 0.3) / 0.7));
      
      let mainText = 'JUEGO TERMINADO';
      let subText = '';
      
      if (gameOverReason === 'timeout') {
        mainText = 'TIEMPO AGOTADO';
        subText = 'El tiempo límite ha expirado';
      } else if (gameOverReason === 'death') {
        mainText = 'HAS MUERTO';
        subText = 'El enemigo te ha derrotado';
      }
      
      this.gameOverText.setText(mainText);
      this.gameOverSubtext.setText(subText);
      
      this.gameOverText.setAlpha(textAlpha);
      this.gameOverSubtext.setAlpha(textAlpha);
      this.restartText.setAlpha(textAlpha);
      
      if (gameOverAlpha > 0.8) {
        const blink = 0.6 + 0.4 * time.sinNormal;
        this.restartText.setAlpha(textAlpha * blink);
      }
    } else {
      this.gameOverText.setAlpha(0);
      this.gameOverSubtext.setAlpha(0);
      this.restartText.setAlpha(0);
    }
  }
  
  updateLevelLabels(momentumBarWidth, momentumBarX) {
    if (!this.labelsCreated && momentumBarWidth) {
      this.momentumBarWidth = momentumBarWidth;
      const lblY = H - 58;
      const lbl = { fontFamily: 'monospace', fontSize: '10px', color: '#445566' };
      
      const l2x = momentumBarX + (L2 / SMAX) * momentumBarWidth;
      const l3x = momentumBarX + (L3 / SMAX) * momentumBarWidth;
      
      this.nv2Label = this.scene.add.text(l2x, lblY, 'NV.2', lbl).setOrigin(0.5, 0);
      this.nv3Label = this.scene.add.text(l3x, lblY, 'NV.3', lbl).setOrigin(0.5, 0);
      this.labelsCreated = true;
    }
  }
  
  clearGameOver() {
    this.gameOverText.setAlpha(0);
    this.gameOverSubtext.setAlpha(0);
    this.restartText.setAlpha(0);
  }
}