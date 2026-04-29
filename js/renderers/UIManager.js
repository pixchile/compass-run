import { W, H, ARENA, HP_MAX, SMAX, L2, L3, BUFF_COLORS } from '../constants.js';

export default class UIManager {
  constructor(scene) {
    this.scene = scene;

    const mono = { fontFamily: 'monospace', fontSize: '13px', color: '#7788aa' };
    const monoBig = { fontFamily: 'monospace', fontSize: '21px', color: '#ffffff', fontStyle: 'bold' };

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

    this.hudTimer = scene.add.text(W / 2, 60, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffaa44', fontStyle: 'bold'
    }).setOrigin(0.5);

    const lblY = H - 58;
    const lbl = { fontFamily: 'monospace', fontSize: '10px', color: '#445566' };
    scene.add.text(20, lblY, 'NV.1', lbl);

    this.momentumBarWidth = null;
    this.labelsCreated = false;

    this.gameOverText = scene.add.text(W / 2, H / 2 - 40, '', {
      fontFamily: 'monospace', fontSize: '42px', color: '#ff3322', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    this.gameOverSubtext = scene.add.text(W / 2, H / 2 + 20, '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff'
    }).setOrigin(0.5).setAlpha(0);

    this.restartText = scene.add.text(W / 2, H / 2 + 60, 'PRESIONA [ ESPACIO ] PARA JUGAR DE NUEVO', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff'
    }).setOrigin(0.5).setAlpha(0);

    // ── Panel de pausa (inicialmente invisible) ──
    this.pausePanel = scene.add.graphics();
    this.pausePanel.setDepth(1000);
    this.pauseTitle = scene.add.text(W / 2, H / 2 - 140, 'JUEGO EN PAUSA', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0).setDepth(1001);

    this.pauseStats = scene.add.text(W / 2, H / 2 - 80, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#cccccc', lineSpacing: 8
    }).setOrigin(0.5, 0).setAlpha(0).setDepth(1001);

    this.pauseHint = scene.add.text(W / 2, H / 2 + 160, 'ESC o P para reanudar', {
      fontFamily: 'monospace', fontSize: '13px', color: '#888888'
    }).setOrigin(0.5).setAlpha(0).setDepth(1001);
  }

  updateTexts(player, compassSystem, camera, gameOver, gameOverAlpha, gameOverReason, timeRemaining, time, credits = 0) {
    const momentum = compassSystem?.momentum;
    const lv = momentum ? momentum.level : 1;
    const spd = Math.hypot(player.vx, player.vy);
    const hpPct = Math.max(0, player.hp / HP_MAX);

    this.hudLevel.setText(`── NIVEL ${lv} ──`).setColor(momentum ? momentum.lHex : '#ffffff');
    this.hudCredits.setText(`⬡ ${credits} créditos`);

    if (momentum) {
      this.hudMoment.setText(`momentum  ${Math.round(momentum.stacks)} / ${SMAX}   NV.${lv}`);
      this.hudMoment.setColor('#aaaaff');
    } else {
      this.hudMoment.setText('');
    }

    this.hudSpeed.setText(`${Math.round(spd)} px/s`);
    this.hudZoom.setText(`zoom: ${(camera.zoom * 100).toFixed(0)}%`);

    const hpInt = Math.ceil(player.hp);
    const regenStr = (player.hpRegenT > 0 && player.hp < HP_MAX) ? (player.hpRegenT < 4000 ? '' : ' ♥') : '';
    const hpColor = hpPct > 0.5 ? '#44dd77' : hpPct > 0.25 ? '#ffcc22' : '#ff3322';
    this.hudHp.setText(`HP  ${hpInt} / ${HP_MAX}${regenStr}`).setColor(hpColor);

    if (timeRemaining !== undefined && !gameOver) {
      const totalSeconds = Math.floor(timeRemaining);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
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
      this.hudTimer.setAlpha(0);
    }

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

  // ── Métodos para el panel de pausa ──

  showPauseStats(player, compassSystem) {
    const momentum = compassSystem?.momentum;
    const lv = momentum?.level || 1;
    const stacks = momentum?.stacks || 0;
    const spd = Math.hypot(player.vx, player.vy);
    const hp = Math.ceil(player.hp || 0);
    const creditsText = this.hudCredits?.text || '0 créditos';
    const creditsNum = creditsText.replace(/[^0-9]/g, '');

    const attackRadiusMult = ((player.attackRadiusMultiplier || 0) * 100).toFixed(1);
    const damageBonus = (player.damageMultiplierBonus || 0).toFixed(3);
    const payload = player.combat?.getCurrentAttackPayload(lv);
    const currentRadius = payload?.radius?.toFixed(0) || '-';

    // Velocidad máxima: base según nivel + bonus permanente acumulado
    const maxSpeedBonus = momentum?._maxSpeedBonus || 0;
    const finalMaxSpeed = momentum ? momentum.getEffectiveMaxSpeed(lv).toFixed(0) : '300';

    const lines = [
        `── ESTADÍSTICAS ──`,
        ``,
        `Nivel: ${lv}    Stacks: ${Math.round(stacks)} / ${SMAX}`,
        `Velocidad: ${Math.round(spd)} px/s`,
        `Velocidad máx: ${finalMaxSpeed} px/s`,
        `HP: ${hp} / ${HP_MAX}`,
        `Créditos: ${creditsNum}`,
        ``,
        `── BUFFS PERMANENTES ──`,
        ``,
        `Radio de ataque: +${attackRadiusMult}%`,
        `Mult. daño:     +${damageBonus}`,
        `Radio actual:    ${currentRadius} px`,
        `Velocidad máx:  +${maxSpeedBonus.toFixed(1)} px/s`,
    ];

    this.pausePanel.clear();
    this.pausePanel.fillStyle(0x000000, 0.75);
    this.pausePanel.fillRect(0, 0, W, H);

    this.pauseStats.setText(lines.join('\n'));

    this.pausePanel.setAlpha(1);
    this.pauseTitle.setAlpha(1);
    this.pauseStats.setAlpha(1);
    this.pauseHint.setAlpha(1);
  }

  hidePauseStats() {
    this.pausePanel.clear();
    this.pausePanel.setAlpha(0);
    this.pauseTitle.setAlpha(0);
    this.pauseStats.setAlpha(0);
    this.pauseHint.setAlpha(0);
  }
}