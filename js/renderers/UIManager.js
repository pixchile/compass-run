import { W, H, ARENA, HP_MAX, SMAX, HP_REGEN_RATE, HP_REGEN_DELAY } from '../constants.js';
import { ITEMS, COMPONENTS } from '../systems/ItemSystem.js';

export default class UIManager {
  constructor(scene) {
    this.scene = scene;

    const mono = { fontFamily: 'monospace', fontSize: '13px', color: '#7788aa' };

    this.hudMoment = scene.add.text(20, H - 44, '', mono);
    this.hudSpeed = scene.add.text(W - 20, H - 44, '', { ...mono, align: 'right' }).setOrigin(1, 0);
    this.hudKey = scene.add.text(W - 90, 164, '', { fontFamily: 'monospace', fontSize: '15px', color: '#ffff88' }).setOrigin(0.5);
    this.hudAction = scene.add.text(W / 2, H - 72, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    this.hudHp = scene.add.text(20, 54, '', { fontFamily: 'monospace', fontSize: '11px', color: '#44dd77' });
    this.hudCredits = scene.add.text(20, 66, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffdd44'
    });

    this.hudTimer = scene.add.text(W / 2, 44, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffaa44', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.hudElapsed = scene.add.text(W / 2, 56, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#667799'
    }).setOrigin(0.5);

    this._elapsedStart = null;

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

    this.pauseMenuBtn = scene.add.text(W / 2, H / 2 + 200, '← MENÚ PRINCIPAL', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ff8844',
      backgroundColor: '#00000088', padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setAlpha(0).setDepth(1001).setInteractive();
    this.pauseMenuBtn.on('pointerover', () => this.pauseMenuBtn.setStyle({ color: '#ffffff' }));
    this.pauseMenuBtn.on('pointerout',  () => this.pauseMenuBtn.setStyle({ color: '#ff8844' }));
    this.pauseMenuBtn.on('pointerdown', () => scene.scene.start('MainMenu'));

    // ── HUD de items (esquina superior derecha) ──
    this._itemSlots = [];   // { gfx, label } por slot
    this._itemSlotsBuilt = false;
  }

  // ─── Construir slots de items (llamado la primera vez que hay items) ─────
  _buildItemSlots(count) {
    // Destruir slots viejos si cambia la cantidad
    for (const s of this._itemSlots) { s.gfx.destroy(); s.label.destroy(); s.name.destroy(); }
    this._itemSlots = [];

    const SIZE   = 36;
    const PAD    = 4;
    const MARGIN = 8;
    const startX = W - MARGIN - SIZE;
    const startY = MARGIN;

    for (let i = 0; i < count; i++) {
      const x = startX - i * (SIZE + PAD);
      const y = startY;

      const gfx = this.scene.add.graphics().setDepth(200);
      // Número de cooldown / rebotes encima del icono
      const label = this.scene.add.text(x + SIZE / 2, y - 2, '', {
        fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(202);
      // Nombre corto debajo (solo primeras 3 letras)
      const name = this.scene.add.text(x + SIZE / 2, y + SIZE + 2, '', {
        fontFamily: 'monospace', fontSize: '8px', color: '#aaaaaa',
      }).setOrigin(0.5, 0).setDepth(202);

      this._itemSlots.push({ gfx, label, name, x, y, size: SIZE });
    }
    this._itemSlotsBuilt = true;
  }

  // ─── Actualizar HUD de items ─────────────────────────────────
  _updateItemHUD(player) {
    const shop = this.scene.shopSystem;
    const fx   = this.scene.itemEffects;
    if (!shop || !fx) return;

    const items = shop.equippedItems;
    if (items.length === 0) {
      if (this._itemSlotsBuilt) {
        for (const s of this._itemSlots) { s.gfx.clear(); s.label.setText(''); s.name.setText(''); }
      }
      return;
    }

    if (!this._itemSlotsBuilt || this._itemSlots.length !== items.length) {
      this._buildItemSlots(items.length);
    }

    const SIZE = 36;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const slot = this._itemSlots[i];
      const { gfx, label, name, x, y } = slot;

      // Color del item
      const hexColor = item.color || '#888888';
      const intColor = parseInt(hexColor.replace('#', ''), 16);

      // Calcular cooldown / estado especial
      let overlayAlpha = 0;   // 0 = listo, >0 = en CD (oscurecer)
      let labelText    = '';

      switch (item.id) {
        case 'BBB': {
          if (fx.bbbActive) {
            overlayAlpha = 0;
            labelText = `${(fx.bbbTimer / 1000).toFixed(1)}s`;
          } else if (fx.bbbCooldown > 0) {
            overlayAlpha = 0.6;
            labelText = `${Math.ceil(fx.bbbCooldown / 1000)}`;
          } else {
            labelText = '✓';
          }
          break;
        }
        case 'BBC': {
          if (player._stickState) {
            labelText = `${(player._stickTimer / 1000).toFixed(1)}s ×${fx.bbcBounces}`;
          } else if (fx.bbcBounces > 0) {
            labelText = `×${fx.bbcBounces}`;
          } else {
            labelText = '';
          }
          break;
        }
        case 'DDD': {
          if (fx.dddCD > 0) {
            overlayAlpha = 0.6;
            labelText = `${Math.ceil(fx.dddCD / 1000)}`;
          } else {
            labelText = '✓';
          }
          break;
        }
        case 'AAA': {
          const mult = fx.getAAAMultiplier(player);
          labelText = `×${mult.toFixed(1)}`;
          break;
        }
        case 'DBB': {
          if (fx.dbbCooldown > 0) {
            overlayAlpha = 0.6;
            // Mostrar el último mult usado + CD restante
            const cdSec = Math.ceil(fx.dbbCooldown / 1000);
            labelText = fx.dbbLastMult > 1 ? `×${fx.dbbLastMult.toFixed(1)} ${cdSec}s` : `${cdSec}s`;
          } else if (fx.dbbReady) {
            labelText = `×${(1 + fx.dbbBonus / 100).toFixed(1)}`;
          } else {
            const secs = (fx.dbbIdleTimer / 1000).toFixed(1);
            labelText = `${secs}s`;
          }
          break;
        }
        case 'ADD': {
          labelText = fx.statADDMitigated > 0 ? `-${fx.statADDMitigated.toFixed(0)}` : '';
          break;
        }
        case 'AAD': {
          labelText = fx.statAADExplosions > 0 ? `${fx.statAADExplosions}💥` : '';
          break;
        }
        case 'CAD': {
          labelText = fx.statCADHealed > 0 ? `+${fx.statCADHealed.toFixed(1)}` : '';
          break;
        }
        default: {
          // Items sin CD — sin etiqueta
          labelText = '';
          break;
        }
      }

      // Dibujar slot
      gfx.clear();

      // Fondo oscuro
      gfx.fillStyle(0x111111, 0.85);
      gfx.fillRect(x, y, SIZE, SIZE);

      // Relleno de color del item (si listo)
      if (overlayAlpha < 0.5) {
        gfx.fillStyle(intColor, 0.35);
        gfx.fillRect(x + 2, y + 2, SIZE - 4, SIZE - 4);
      }

      // Texto del ID del item centrado
      // (lo hacemos con gfx no — usamos el label con el id)
      // Border
      gfx.lineStyle(2, overlayAlpha > 0 ? 0x444444 : intColor, 1);
      gfx.strokeRect(x, y, SIZE, SIZE);

      // Overlay oscuro si en CD
      if (overlayAlpha > 0) {
        gfx.fillStyle(0x000000, overlayAlpha);
        gfx.fillRect(x, y, SIZE, SIZE);
      }

      // Texto con el ID del item (letras pequeñas centradas en el cuadro)
      // Reutilizamos el campo 'name' para el ID centrado dentro del cuadro
      name.setText(item.id);
      name.setPosition(x + SIZE / 2, y + SIZE / 2);
      name.setOrigin(0.5, 0.5);
      name.setStyle({ fontSize: '11px', color: overlayAlpha > 0 ? '#555555' : hexColor, fontStyle: 'bold' });
      name.setDepth(201);

      label.setText(labelText);
      label.setPosition(x + SIZE / 2, y + 1);
      label.setOrigin(0.5, 0);
      label.setDepth(202);
    }
  }

  updateTexts(player, compassSystem, camera, gameOver, gameOverAlpha, gameOverReason, timeRemaining, time, credits = 0) {
    const momentum = compassSystem?.momentum;
    const lv = momentum ? momentum.level : 1;
    const spd = Math.hypot(player.vx, player.vy);

    this.hudCredits.setText(`⬡ ${credits} créditos`);

    if (momentum) {
      this.hudMoment.setText(`momentum  ${Math.round(momentum.stacks)} / ${SMAX}   NV.${lv}`);
      this.hudMoment.setColor('#aaaaff');
    } else {
      this.hudMoment.setText('');
    }

    this.hudSpeed.setText(`${Math.round(spd)} px/s`);

    // HUD de items
    this._updateItemHUD(player);

    const maxHp = player.health?.maxHp || HP_MAX;
    const hpPct = Math.max(0, player.hp / maxHp);
    const hpInt = Math.ceil(player.hp);
    const regenActive = (player.health?.hpRegenT || 0) >= HP_REGEN_DELAY && player.hp < maxHp && player.hp > 0;
    let regenStr = '';
    if (regenActive && hpPct <= 0.5) {
      regenStr = `  +${HP_REGEN_RATE.toFixed(1)}/s`;
    } else if (regenActive) {
      regenStr = ' ♥';
    }
    const hpColor = hpPct > 0.5 ? '#44dd77' : hpPct > 0.25 ? '#ffcc22' : '#ff3322';
    this.hudHp.setText(`HP  ${hpInt} / ${maxHp}${regenStr}`).setColor(hpColor);
    if (regenActive && hpPct <= 0.25) {
      this.hudHp.setFontStyle('bold');
    } else {
      this.hudHp.setFontStyle('normal');
    }

    if (timeRemaining !== undefined && !gameOver) {
      const totalSeconds = Math.floor(timeRemaining);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      const timeColor = timeRemaining < 30 ? '#ff4444' : timeRemaining < 60 ? '#ffaa44' : '#44ff88';
      this.hudTimer.setText(`⏱ ${timeStr}`).setColor(timeColor);
      this.hudTimer.setAlpha(1);

      if (this._elapsedStart === null) this._elapsedStart = this.scene.time.now;
      const elapsed = (this.scene.time.now - this._elapsedStart) / 1000;
      const eMin = Math.floor(elapsed / 60);
      const eSec = Math.floor(elapsed % 60);
      this.hudElapsed.setText(`elapsed  ${eMin.toString().padStart(2, '0')}:${eSec.toString().padStart(2, '0')}`);
      this.hudElapsed.setAlpha(1);
    } else if (gameOver && timeRemaining !== undefined && timeRemaining <= 0) {
      this.hudTimer.setText(`⏱ 00:00`).setColor('#ff4444');
      this.hudTimer.setAlpha(1);
      this.hudElapsed.setAlpha(0);
    } else if (gameOver) {
      this.hudTimer.setAlpha(0);
      this.hudElapsed.setAlpha(0);
    } else {
      this.hudTimer.setAlpha(0);
      this.hudElapsed.setAlpha(0);
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
    } else if (player._stickState) {
      const bounces = this.scene?.itemEffects?.bbcBounces || 1;
      actStr = `● REBOTE ×${bounces}  WASD + SPACE`;
      actCol = '#ff8844';
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

  updateLevelLabels(momentumBarWidth, momentumBarX, momentum) {
    if (!this.labelsCreated && momentumBarWidth) {
      this.momentumBarWidth = momentumBarWidth;
      const lblY = H - 58;
      const lbl = { fontFamily: 'monospace', fontSize: '10px', color: '#445566' };
      this.nv2Label = this.scene.add.text(0, lblY, 'NV.2', lbl).setOrigin(0.5, 0);
      this.nv3Label = this.scene.add.text(0, lblY, 'NV.3', lbl).setOrigin(0.5, 0);
      this.labelsCreated = true;
    }
    if (this.labelsCreated && momentum) {
      const l2x = momentumBarX + (momentum.l2Min / SMAX) * momentumBarWidth;
      const l3x = momentumBarX + (momentum.l2Max / SMAX) * momentumBarWidth;
      this.nv2Label.setX(l2x);
      this.nv3Label.setX(l3x);
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

    // HP regen actual
    const hpRegenActive = player.health?.hpRegenT >= HP_REGEN_DELAY && player.hp < HP_MAX && player.hp > 0;
    const hpRegenStr = hpRegenActive ? `  (+${HP_REGEN_RATE.toFixed(1)}/s)` : '';

    // Récords de partida
    const totalTimeEarned = compassSystem?.totalTimeEarned || 0;
    const highestHit = compassSystem?.highestHitDamage || 0;

    const lines = [
        `── ESTADÍSTICAS ──`,
        ``,
        `Nivel: ${lv}    Stacks: ${Math.round(stacks)} / ${SMAX}`,
        `Velocidad: ${Math.round(spd)} px/s`,
        `Velocidad máx: ${finalMaxSpeed} px/s`,
        `HP: ${hp} / ${HP_MAX}${hpRegenStr}`,
        `Créditos: ${creditsNum}`,
        ``,
        `── COMBATE ──`,
        ``,
        `Radio de ataque: +${attackRadiusMult}%`,
        `Mult. daño:     +${damageBonus}`,
        `Radio actual:    ${currentRadius} px`,
        `Mayor golpe:     ${highestHit.toFixed(1)}`,
        `Velocidad máx:  +${maxSpeedBonus.toFixed(1)} px/s`,
        ``,
        `── PARTIDA ──`,
        ``,
        `Tiempo extra:   +${totalTimeEarned.toFixed(1)}s`,
    ];

    // Items equipados
    const shop = this.scene.shopSystem;
    const fx   = this.scene.itemEffects;
    const equippedItems = shop?.equippedItems || [];
    const components    = shop?.components    || [];
    if (equippedItems.length > 0 || components.length > 0) {
      lines.push(``, `── ITEMS EQUIPADOS ──`, ``);
      for (const item of equippedItems) {
        lines.push(`[${item.id}] ${item.name}`);
        lines.push(`  ${item.desc}`);
        // Estadísticas específicas por item
        if (fx) {
          if (item.id === 'AAD' && fx.statAADExplosions > 0)
            lines.push(`  Explosiones: ${fx.statAADExplosions}`);
          if (item.id === 'ADD' && fx.statADDMitigated > 0)
            lines.push(`  Daño mitigado: ${fx.statADDMitigated.toFixed(1)}`);
          if (item.id === 'CAD' && fx.statCADHealed > 0)
            lines.push(`  HP curado: ${fx.statCADHealed.toFixed(1)}`);
          if (item.id === 'DBB') {
            if (fx.dbbCooldown > 0)
              lines.push(`  CD: ${(fx.dbbCooldown / 1000).toFixed(1)}s`);
            else if (fx.dbbReady)
              lines.push(`  Mult listo: ×${(1 + fx.dbbBonus / 100).toFixed(2)}`);
            else
              lines.push(`  Acumulando: ${(fx.dbbIdleTimer / 1000).toFixed(1)}s`);
          }
        }
        lines.push(``);
      }
      if (components.length > 0) {
        const compNames = components.map(c => COMPONENTS[c]?.name || c).join(', ');
        lines.push(`Componentes: ${compNames}`);
      }
    }

    this.pausePanel.clear();
    this.pausePanel.fillStyle(0x000000, 0.82);
    this.pausePanel.fillRect(0, 0, W, H);

    const fontSize = lines.length > 25 ? '11px' : '14px';
    this.pauseStats.setStyle({ fontSize, color: '#cccccc', lineSpacing: lines.length > 25 ? 4 : 8 });
    this.pauseStats.setPosition(W / 2, 60);
    this.pauseStats.setText(lines.join('\n'));

    this.pausePanel.setAlpha(1);
    this.pauseTitle.setAlpha(1);
    this.pauseStats.setAlpha(1);
    this.pauseHint.setAlpha(1);
    this.pauseMenuBtn.setAlpha(1);
  }

  resetElapsedTime() {
    this._elapsedStart = null;
  }

  hidePauseStats() {
    this.pausePanel.clear();
    this.pausePanel.setAlpha(0);
    this.pauseTitle.setAlpha(0);
    this.pauseStats.setAlpha(0);
    this.pauseHint.setAlpha(0);
    this.pauseMenuBtn.setAlpha(0);
  }
}