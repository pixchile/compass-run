// enemy-creator/editor.js

class EnemyEditor {
    constructor() {
        this.deathEffects = []; // Array para guardar múltiples efectos al morir
        this.reactions = []; // Array para guardar reacciones a eventos
        this.setupTabs();
        this.setupEventListeners();
        this.setupDynamicFields();
        this.setupDeathEffectsManager();
        this.setupReactionsManager();
        this.generate();
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });
                document.getElementById(`tab-${tabName}`).classList.add('active');
            });
        });
    }

    setupEventListeners() {
        // Lista masiva de todos los IDs de inputs de texto/número/selects
        const inputs = [
            // Básicos
            'enemyName', 'typeId', 'hp', 'hpRegen', 'color', 'shape', 'radius', 'isBoss',
            'selfDestructType', 'selfDestructValue', 'spawnTriggerType', 'spawnTriggerValue',
            // Movimiento
            'mobile', 'speed', 'activeSpeed', 'speedTimeScale', 'speedTimeMulti', 'speedHpScale', 'speedHpMulti',
            'locomotion', 'intention', 'fleeOnDamaged', 'fleeOnLowHp', 'chaseOnDamaged',
            'orbitRange', 'erraticTime',
            'ignoreWalls', 'isPhantom', 'reactionRadius', 'disengageRadius',
            // Ambitious (Avanzados)
            'impenetrable', 'attackType', 'attackEffect', 'attackDamage', 'attackCooldown', 'defenseAura', 'evade',
            'seeThroughWalls',
            'spawnPattern', 'spawnCount',
            'hateTypes', 'hateRadius', 'hateDamage', 'hateOverridesFleeOnDamage'
        ];

        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.generate());
        });

        // Multiplicadores de Daño (agrupados)
        const dmgSources = ['dmgDash', 'dmgAerialDash', 'dmgMomentum3', 'dmgSlam', 'dmgSlam3', 'dmgVoid', 'dmgWall', 'dmgExplosion'];
        dmgSources.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.generate());
        });

        // Botones
        document.getElementById('generateBtn')?.addEventListener('click', () => this.generate());
        document.getElementById('downloadBtn')?.addEventListener('click', () => this.download());
        document.getElementById('copyBtn')?.addEventListener('click', () => this.copyToClipboard());
        document.getElementById('saveToProjectBtn')?.addEventListener('click', () => this.saveToProject());

        // Carga de archivos
        const loadBtn = document.getElementById('loadBtn');
        const loadFile = document.getElementById('loadFileInput');
        if (loadBtn && loadFile) {
            loadBtn.addEventListener('click', () => loadFile.click());
            loadFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        this.loadFromCode(event.target.result);
                    } catch (err) {
                        alert('Error al cargar el archivo: ' + err.message);
                    }
                };
                reader.readAsText(file);
            });
        }
    }

    setupDynamicFields() {
        const locomotion = document.getElementById('locomotion');
        if (locomotion) {
            locomotion.addEventListener('change', () => {
                this.updateDynamicFieldsVisibility();
                this.generate();
            });
        }
        const intention = document.getElementById('intention');
        if (intention) {
            intention.addEventListener('change', () => {
                this.updateDynamicFieldsVisibility();
                this.generate();
            });
        }

        // Patrones de Spawn
        const spawnPattern = document.getElementById('spawnPattern');
        if (spawnPattern) {
            spawnPattern.addEventListener('change', () => {
                this.updateDynamicFieldsVisibility();
                this.generate();
            });
        }
    }

    updateDynamicFieldsVisibility() {
        const locomotion = document.getElementById('locomotion');
        const intention = document.getElementById('intention');
        if (locomotion && intention) {
            const loco = locomotion.value;
            const intent = intention.value;
            const orbitField = document.getElementById('orbitRangeField');
            const erraticField = document.getElementById('erraticTimeField');
            const dashField = document.getElementById('dashOnlyField');
            if (orbitField) orbitField.style.display = intent === 'orbit' ? 'block' : 'none';
            if (erraticField) erraticField.style.display = intent === 'wander' ? 'block' : 'none';
            if (dashField) dashField.style.display = loco === 'jump' ? 'block' : 'none';
        }
        const spawnPattern = document.getElementById('spawnPattern');
        if (spawnPattern) {
            const showCount = ['horde', 'radial', 'radial_player'].includes(spawnPattern.value);
            const spawnCountField = document.getElementById('spawnCountField');
            if (spawnCountField) spawnCountField.style.display = showCount ? 'block' : 'none';
        }
    }

    // --- SISTEMA MODULAR DE EFECTOS AL MORIR ---
    setupDeathEffectsManager() {
        const btnAdd = document.getElementById('addDeathEffectBtn');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                this.deathEffects.push({
                    type: 'dropOrb',
                    chance: 100,
                    condition: 'any',
                    params: {}
                });
                this.renderDeathEffects();
                this.generate();
            });
        }
    }

    renderDeathEffects() {
        const container = document.getElementById('deathEffectsContainer');
        if (!container) return;
        container.innerHTML = '';

        this.deathEffects.forEach((effect, index) => {
            const div = document.createElement('div');
            div.className = 'death-effect-item';
            div.style.border = "1px solid #555";
            div.style.padding = "10px";
            div.style.marginBottom = "10px";

            div.innerHTML = `
                <select onchange="editor.updateEffect(${index}, 'type', this.value)">
                    <option value="dropOrb" ${effect.type === 'dropOrb' ? 'selected' : ''}>Orbe Curador</option>
                    <option value="spawnEnemies" ${effect.type === 'spawnEnemies' ? 'selected' : ''}>Generar Enemigos</option>
                    <option value="momentumStack" ${effect.type === 'momentumStack' ? 'selected' : ''}>Dar Momentum</option>
                    <option value="extraCredits" ${effect.type === 'extraCredits' ? 'selected' : ''}>Créditos Extra</option>
                    <option value="explode" ${effect.type === 'explode' ? 'selected' : ''}>Explotar</option>
                    <option value="respawn" ${effect.type === 'respawn' ? 'selected' : ''}>Respawn</option>
                </select>
                <input type="number" placeholder="% Chance" value="${effect.chance}" onchange="editor.updateEffect(${index}, 'chance', this.value)" style="width: 80px;">
                <select onchange="editor.updateEffect(${index}, 'condition', this.value)">
                    <option value="any" ${effect.condition === 'any' ? 'selected' : ''}>Cualquier muerte</option>
                    <option value="slam" ${effect.condition === 'slam' ? 'selected' : ''}>Solo por Slam</option>
                    <option value="dash" ${effect.condition === 'dash' ? 'selected' : ''}>Solo por Dash</option>
                </select>
                <button onclick="editor.removeEffect(${index})">X</button>
                <div class="effect-params" style="margin-top: 5px;">
                    ${this.getEffectParamsHTML(effect, index)}
                </div>
            `;
            container.appendChild(div);
        });
    }

    getEffectParamsHTML(effect, index) {
        switch(effect.type) {
            case 'spawnEnemies':
                return `<input type="text" placeholder="Tipo" value="${effect.params.type || ''}" onchange="editor.updateEffectParam(${index}, 'type', this.value)">
                        <input type="number" placeholder="Cantidad" value="${effect.params.count || 1}" onchange="editor.updateEffectParam(${index}, 'count', this.value)">`;
            case 'momentumStack':
                return `<input type="number" placeholder="Stacks" value="${effect.params.amount || 1}" onchange="editor.updateEffectParam(${index}, 'amount', this.value)">`;
            case 'extraCredits':
                return `<input type="number" placeholder="Cantidad" value="${effect.params.amount || 50}" onchange="editor.updateEffectParam(${index}, 'amount', this.value)">`;
            case 'explode':
                return `<input type="number" placeholder="Radio" value="${effect.params.radius || 100}" onchange="editor.updateEffectParam(${index}, 'radius', this.value)">
                        <input type="number" placeholder="Daño" value="${effect.params.damage || 25}" onchange="editor.updateEffectParam(${index}, 'damage', this.value)">
                        <input type="number" placeholder="Retraso(ms)" value="${effect.params.delay || 0}" onchange="editor.updateEffectParam(${index}, 'delay', this.value)">`;
            case 'respawn':
                return `<input type="number" placeholder="Segundos" value="${effect.params.delay || 5}" onchange="editor.updateEffectParam(${index}, 'delay', this.value)">`;
            default: return '';
        }
    }

    updateEffect(index, key, value) {
        this.deathEffects[index][key] = key === 'chance' ? parseFloat(value) : value;
        if (key === 'type') this.deathEffects[index].params = {}; // Reset params on type change
        this.renderDeathEffects();
        this.generate();
    }

    updateEffectParam(index, key, value) {
        this.deathEffects[index].params[key] = isNaN(value) ? value : parseFloat(value);
        this.generate();
    }

    removeEffect(index) {
        this.deathEffects.splice(index, 1);
        this.renderDeathEffects();
        this.generate();
    }

    // --- SISTEMA DE REACCIONES A EVENTOS ---
    setupReactionsManager() {
        const btnAdd = document.getElementById('addReactionBtn');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                this.reactions.push({
                    event: 'enemyKilled',
                    allyType: '',
                    action: 'swarm',
                    radius: 300,
                    duration: 2000,
                    speed: 0
                });
                this.renderReactions();
                this.generate();
            });
        }
    }

    renderReactions() {
        const container = document.getElementById('reactionsContainer');
        if (!container) return;
        container.innerHTML = '';

        this.reactions.forEach((r, index) => {
            const div = document.createElement('div');
            div.style.border = "1px solid #555";
            div.style.padding = "10px";
            div.style.marginBottom = "8px";
            div.style.borderRadius = "5px";
            div.style.background = "rgba(0,0,0,0.2)";

            div.innerHTML = `
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                    <span style="font-size:12px; color:#aaa;">Al</span>
                    <select onchange="editor.updateReaction(${index}, 'event', this.value)" style="flex:1;">
                        <option value="enemyKilled" ${r.event === 'enemyKilled' ? 'selected' : ''}>Aliado Muerto</option>
                        <option value="enemyHit" ${r.event === 'enemyHit' ? 'selected' : ''}>Aliado Herido</option>
                    </select>
                    <span style="font-size:12px; color:#aaa;">hacer</span>
                    <select onchange="editor.updateReaction(${index}, 'action', this.value)" style="flex:1;">
                        <option value="swarm" ${r.action === 'swarm' ? 'selected' : ''}>Swarm (ir al evento)</option>
                        <option value="retreat" ${r.action === 'retreat' ? 'selected' : ''}>Retreat (huir del evento)</option>
                        <option value="investigate" ${r.action === 'investigate' ? 'selected' : ''}>Investigate (moverse al sitio)</option>
                        <option value="flee" ${r.action === 'flee' ? 'selected' : ''}>Flee (huir del jugador)</option>
                    </select>
                    <button onclick="editor.removeReaction(${index})" style="background:#633;color:#fff;border:none;padding:2px 8px;cursor:pointer;">X</button>
                </div>
                <div style="display:flex; gap:8px; margin-top:6px; flex-wrap:wrap; align-items:center;">
                    <label style="font-size:11px; color:#aaa;">Solo si aliado es tipo: <input type="text" value="${r.allyType || ''}" placeholder="(cualquier tipo)" onchange="editor.updateReaction(${index}, 'allyType', this.value)" style="width:100px;"></label>
                </div>
                <div style="display:flex; gap:8px; margin-top:6px; flex-wrap:wrap;">
                    <label style="font-size:11px; color:#aaa;">Radio <input type="number" value="${r.radius}" min="0" step="50" onchange="editor.updateReaction(${index}, 'radius', this.value)" style="width:70px;"> px</label>
                    <label style="font-size:11px; color:#aaa;">Duración <input type="number" value="${r.duration}" min="100" step="100" onchange="editor.updateReaction(${index}, 'duration', this.value)" style="width:70px;"> ms</label>
                    <label style="font-size:11px; color:#aaa;">Velocidad <input type="number" value="${r.speed}" min="0" step="10" onchange="editor.updateReaction(${index}, 'speed', this.value)" style="width:70px;"> <small style="color:#666;">(0 = usa base)</small></label>
                </div>
            `;
            container.appendChild(div);
        });
    }

    updateReaction(index, key, value) {
        const numericKeys = ['radius', 'duration', 'speed'];
        this.reactions[index][key] = numericKeys.includes(key) ? parseFloat(value) : value;
        if (key !== 'radius' && key !== 'duration' && key !== 'speed') this.renderReactions();
        this.generate();
    }

    removeReaction(index) {
        this.reactions.splice(index, 1);
        this.renderReactions();
        this.generate();
    }
    _parseHateTypes() {
        const raw = this.getVal('hateTypes');
        if (!raw || !raw.trim()) return [];
        return raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    // ---------------------------------------------

    // Helper para obtener valores del DOM de forma segura
    getVal(id, type = 'string') {
        const el = document.getElementById(id);
        if (!el) return null;
        if (type === 'number') return parseFloat(el.value) || 0;
        if (type === 'boolean') return el.value === 'true';
        return el.value;
    }

    // Helper para establecer valores del DOM
    setVal(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        if (typeof value === 'boolean') {
            el.value = value ? 'true' : 'false';
        } else if (value !== undefined && value !== null) {
            el.value = value;
        }
    }

    _pickerToHex(c) {
        if (!c) return '0xFF6666';
        if (c.startsWith('#')) return '0x' + c.slice(1).toUpperCase();
        return c;
    }
    _hexToPicker(c) {
        if (c === undefined || c === null) return '#ff6666';
        if (typeof c === 'number') c = '0x' + c.toString(16).padStart(6, '0');
        const s = String(c).replace(/^0x/i, '');
        return '#' + s.toLowerCase();
    }

    getConfig() {
        return {
            id: this.getVal('typeId'),
            name: this.getVal('enemyName'),
            basic: {
                hp: this.getVal('hp', 'number'),
                hpRegen: this.getVal('hpRegen', 'number'),
                color: this._pickerToHex(this.getVal('color')),
                shape: this.getVal('shape'),
                radius: this.getVal('radius', 'number'),
                isBoss: this.getVal('isBoss', 'boolean'),
                selfDestruct: {
                    type: this.getVal('selfDestructType'), // 'none', 'time', 'proximity'
                    value: this.getVal('selfDestructValue', 'number')
                },
                spawnTrigger: {
                    type: this.getVal('spawnTriggerType'), // 'immediate', 'time', 'kills', 'coords'
                    value: this.getVal('spawnTriggerValue') // String o Number dependiendo del tipo
                }
            },
            movement: {
                mobile: this.getVal('mobile', 'boolean'),
                speed: this.getVal('speed', 'number'),
                activeSpeed: this.getVal('activeSpeed', 'number'),
                scaling: {
                    timeBase: this.getVal('speedTimeScale', 'boolean'),
                    timeMultiplier: this.getVal('speedTimeMulti', 'number'),
                    hpBase: this.getVal('speedHpScale'),
                    hpPercentage: this.getVal('speedHpMulti', 'number')
                },
                locomotion: this.getVal('locomotion'),
                intention: this.getVal('intention'),
                fleeOn: {
                    damaged: this.getVal('fleeOnDamaged', 'boolean'),
                    lowHp: this.getVal('fleeOnLowHp', 'number'),
                    chaseOnDamaged: this.getVal('chaseOnDamaged', 'boolean')
                },
                orbitRange: this.getVal('orbitRange', 'number'),
                erraticTime: this.getVal('erraticTime', 'number'),
                ignoreWalls: this.getVal('ignoreWalls', 'boolean'),
                isPhantom: this.getVal('isPhantom', 'boolean'),
                reactionRadius: this.getVal('reactionRadius', 'number'),
                disengageRadius: this.getVal('disengageRadius', 'number'),
                reactions: this.reactions,
                dash: {
                    speedMultiplier: this.getVal('dashSpeedMult', 'number'),
                    windupTime: this.getVal('dashWindup', 'number'),
                    dashTime: this.getVal('dashDashTime', 'number'),
                    cooldownMin: this.getVal('dashCdMin', 'number'),
                    cooldownMax: this.getVal('dashCdMax', 'number')
                }
            },
            damageMultipliers: {
                dash: this.getVal('dmgDash', 'number'),
                aerialDash: this.getVal('dmgAerialDash', 'number'),
                wallJumpDash: this.getVal('dmgWallJumpDash', 'number'),
                momentum3: this.getVal('dmgMomentum3', 'number'),
                slam: this.getVal('dmgSlam', 'number'),
                slam3: this.getVal('dmgSlam3', 'number'),
                void: this.getVal('dmgVoid', 'number'),
                wallCrash: this.getVal('dmgWall', 'number'),
                explosion: this.getVal('dmgExplosion', 'number')
            },
            onDeath: this.deathEffects,
            ambitious: {
                impenetrable: this.getVal('impenetrable', 'boolean'),
                seeThroughWalls: this.getVal('seeThroughWalls', 'boolean'),
                attack: {
                    type: this.getVal('attackType'), // 'contact', 'shoot', 'dash'
                    effect: this.getVal('attackEffect'), // 'none', 'slow', 'push', 'noJump'
                    damage: this.getVal('attackDamage', 'number'),
                    cooldown: this.getVal('attackCooldown', 'number')
                },
                defense: {
                    invulnerableAura: this.getVal('defenseAura', 'boolean'),
                    evade: this.getVal('evade', 'boolean')
                },
                spawn: {
                    pattern: this.getVal('spawnPattern'), // 'normal', 'horde', 'radial', 'follower'
                    count: this.getVal('spawnCount', 'number')
                },
                hates: this._parseHateTypes(),
                hateRadius: this.getVal('hateRadius', 'number'),
                hateDamage: this.getVal('hateDamage', 'number'),
                hateOverridesFleeOnDamage: this.getVal('hateOverridesFleeOnDamage', 'boolean')
            }
        };
    }

    populateFromConfig(config) {
        // Básico
        this.setVal('enemyName', config.name);
        this.setVal('typeId', config.id);
        
        if (config.basic) {
            this.setVal('hp', config.basic.hp);
            this.setVal('hpRegen', config.basic.hpRegen);
            this.setVal('color', this._hexToPicker(config.basic.color));
            this.setVal('shape', config.basic.shape);
            this.setVal('radius', config.basic.radius);
            this.setVal('isBoss', config.basic.isBoss);
            if (config.basic.selfDestruct) {
                this.setVal('selfDestructType', config.basic.selfDestruct.type);
                this.setVal('selfDestructValue', config.basic.selfDestruct.value);
            }
            if (config.basic.spawnTrigger) {
                this.setVal('spawnTriggerType', config.basic.spawnTrigger.type);
                this.setVal('spawnTriggerValue', config.basic.spawnTrigger.value);
            }
        }
        
        // Movimiento
        if (config.movement) {
            this.setVal('mobile', config.movement.mobile);
            this.setVal('speed', config.movement.speed);
            this.setVal('activeSpeed', config.movement.activeSpeed ?? 0);
            if (config.movement.scaling) {
                this.setVal('speedTimeScale', config.movement.scaling.timeBase);
                this.setVal('speedTimeMulti', config.movement.scaling.timeMultiplier);
                this.setVal('speedHpScale', config.movement.scaling.hpBase);
                this.setVal('speedHpMulti', config.movement.scaling.hpPercentage);
            }
            // Locomotion / Intention (new format with backward compat from old style)
            const oldStyle = config.movement.style || 'seek';
            const locoMap = { dashOnly: 'jump', default: 'ground' };
            const intentMap = { seek: 'chase', erratic: 'wander', circle: 'orbit', dashOnly: 'chase' };
            this.setVal('locomotion', config.movement.locomotion || locoMap[oldStyle] || 'ground');
            this.setVal('intention', config.movement.intention || intentMap[oldStyle] || oldStyle);

            // FleeOn (new format with backward compat from old fleeTrigger)
            const fleeOn = config.movement.fleeOn || {};
            const oldFlee = config.movement.fleeTrigger || 'proximity';
            this.setVal('fleeOnDamaged', fleeOn.damaged ?? (oldFlee === 'damage'));
            this.setVal('fleeOnLowHp', fleeOn.lowHp ?? 0);
            this.setVal('chaseOnDamaged', fleeOn.chaseOnDamaged ?? (oldFlee === 'chase'));
            this.setVal('orbitRange', config.movement.orbitRange || 120);
            this.setVal('erraticTime', config.movement.erraticTime || 2000);
            this.setVal('ignoreWalls', config.movement.ignoreWalls);
            this.setVal('isPhantom', config.movement.isPhantom);
            this.setVal('reactionRadius', config.movement.reactionRadius ?? 0);
            this.setVal('disengageRadius', config.movement.disengageRadius ?? 0);
            if (config.movement.dash) {
                this.setVal('dashSpeedMult', config.movement.dash.speedMultiplier ?? 2.5);
                this.setVal('dashWindup', config.movement.dash.windupTime ?? 400);
                this.setVal('dashDashTime', config.movement.dash.dashTime ?? 350);
                this.setVal('dashCdMin', config.movement.dash.cooldownMin ?? 600);
                this.setVal('dashCdMax', config.movement.dash.cooldownMax ?? 1500);
            }
            if (config.movement.reactions) {
                this.reactions = config.movement.reactions.map(r => ({...r}));
                this.renderReactions();
            }
        }
        
        // Daño
        if (config.damageMultipliers) {
            this.setVal('dmgDash', config.damageMultipliers.dash);
            this.setVal('dmgAerialDash', config.damageMultipliers.aerialDash);
            this.setVal('dmgWallJumpDash', config.damageMultipliers.wallJumpDash ?? config.damageMultipliers.aerialDash ?? 1);
            this.setVal('dmgMomentum3', config.damageMultipliers.momentum3);
            this.setVal('dmgSlam', config.damageMultipliers.slam);
            this.setVal('dmgSlam3', config.damageMultipliers.slam3);
            this.setVal('dmgVoid', config.damageMultipliers.void);
            this.setVal('dmgWall', config.damageMultipliers.wallCrash);
            this.setVal('dmgExplosion', config.damageMultipliers.explosion);
        }
        
        // Avanzado
        if (config.ambitious) {
            this.setVal('impenetrable', config.ambitious.impenetrable);
            this.setVal('seeThroughWalls', config.ambitious.seeThroughWalls ?? false);
            if (config.ambitious.attack) {
                this.setVal('attackType', config.ambitious.attack.type);
                this.setVal('attackEffect', config.ambitious.attack.effect || (config.ambitious.attack.effects || [])[0] || 'none');
                this.setVal('attackDamage', config.ambitious.attack.damage ?? 1.0);
                this.setVal('attackCooldown', config.ambitious.attack.cooldown ?? 250);
            }
            if (config.ambitious.defense) {
                this.setVal('defenseAura', config.ambitious.defense.invulnerableAura);
                this.setVal('evade', config.ambitious.defense.evade);
            }
            if (config.ambitious.spawn) {
                this.setVal('spawnPattern', config.ambitious.spawn.pattern);
                this.setVal('spawnCount', config.ambitious.spawn.count || 3);
            }
            if (config.ambitious.hates) {
                this.setVal('hateTypes', (config.ambitious.hates || []).join(', '));
            }
            this.setVal('hateRadius', config.ambitious.hateRadius ?? 0);
            this.setVal('hateDamage', config.ambitious.hateDamage ?? 5);
            this.setVal('hateOverridesFleeOnDamage', config.ambitious.hateOverridesFleeOnDamage ?? false);
        }
        
        this.updateDynamicFieldsVisibility();
    }

    loadFromCode(code) {
        // Quitar comentarios de una línea (//) para que no interfieran en el eval
        let processed = code.replace(/\/\/.*$/gm, '');
        // Reemplazar 'export default' por 'return' para obtener el objeto
        processed = processed.replace(/export\s+default\s*/, 'return ');
        
        try {
            const obj = new Function(processed)();
            if (!obj || !obj.config) {
                throw new Error('El archivo no contiene un objeto válido con "config".');
            }
            this.deathEffects = obj.config.onDeath ? JSON.parse(JSON.stringify(obj.config.onDeath)) : [];
            this.populateFromConfig(obj.config);
            this.renderDeathEffects();
            this.generate();
        } catch (error) {
            throw new Error('Error al procesar el archivo: ' + error.message);
        }
    }

    generate() {
        const config = this.getConfig();
        const code = this.generateCode(config);
        const preview = document.getElementById('codePreview');
        if (preview) preview.innerHTML = this.highlightCode(code);
    }

    generateCode(config) {
        const configStr = JSON.stringify(config, null, 4)
            .replace(/"([^"]+)":/g, '$1:')
            .replace(/: "([^"]+)"/g, ': "$1"');
        
        return `// Enemigo generado con Enemy Creator (v2.0)
// Nombre: ${config.name}
// Fecha: ${new Date().toLocaleString()}

export default {
    id: '${config.id}',
    name: '${config.name}',
    config: ${configStr}
};`;
    }

    highlightCode(code) {
        return code
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/(\/\/.*)/g, '<span style="color:#6a9955;">$1</span>')
            .replace(/(export|default)/g, '<span style="color:#569cd6;">$1</span>')
            .replace(/("[^"]*")/g, '<span style="color:#ce9178;">$1</span>')
            .replace(/([a-zA-Z0-9_]+)(?=:)/g, '<span style="color:#9cdcfe;">$1</span>') // keys
            .replace(/:\s*(\d+\.?\d*)/g, ': <span style="color:#b5cea8;">$1</span>') // numbers
            .replace(/:\s*(true|false)/g, ': <span style="color:#569cd6;">$1</span>'); // booleans
    }

    download() {
        const config = this.getConfig();
        const code = this.generateCode(config);
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.id || 'enemy'}.js`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async saveToProject() {
        const config = this.getConfig();
        const enemyId = config.id;
        if (!enemyId) { alert('Set a Type ID first.'); return; }

        const enemyCode = this.generateCode(config);

        // Check for File System Access API
        if (!window.showDirectoryPicker) {
            alert('Your browser does not support the File System Access API.\n\nUse the Download button instead, then move the file manually.');
            return;
        }

        try {
            // Get or reuse directory handle
            if (!this._dirHandle) {
                this._dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            }

            // Write enemy .js file
            const enemyFile = await this._dirHandle.getFileHandle(`${enemyId}.js`, { create: true });
            const enemyWritable = await enemyFile.createWritable();
            await enemyWritable.write(enemyCode);
            await enemyWritable.close();

            // Read and update index.js
            let indexPath = 'index.js';
            let indexContent;
            try {
                const indexFile = await this._dirHandle.getFileHandle(indexPath);
                const file = await indexFile.getFile();
                indexContent = await file.text();
            } catch {
                // No index.js in this folder — just save the enemy file
                alert(`Saved ${enemyId}.js to project.\n\nNo index.js found in this folder — register it manually.`);
                return;
            }

            const importLine = `import ${enemyId} from './${enemyId}.js';`;
            const arrayEntry = `    ${enemyId},`;

            // Check if already registered
            if (indexContent.includes(`'./${enemyId}.js'`)) {
                alert(`Updated ${enemyId}.js.\n\nAlready registered in index.js — no changes needed there.`);
                return;
            }

            // Insert import after marker
            if (!indexContent.includes(importLine)) {
                indexContent = indexContent.replace(
                    /(\/\/ Add editor-generated enemy imports here:)/,
                    `$1\n${importLine}`
                );
            }

            // Insert array entry after marker
            if (!indexContent.includes(arrayEntry.trim())) {
                indexContent = indexContent.replace(
                    /(\/\/ Add editor-generated enemies here:)/,
                    `$1\n${arrayEntry}`
                );
            }

            // Write updated index.js
            const indexFileHandle = await this._dirHandle.getFileHandle(indexPath, { create: false });
            const indexWritable = await indexFileHandle.createWritable();
            await indexWritable.write(indexContent);
            await indexWritable.close();

            alert(`Saved ${enemyId}.js and updated index.js. Ready to play.`);
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Save to project failed:', err);
            alert('Save failed: ' + err.message);
        }
    }

    copyToClipboard() {
        const code = this.generateCode(this.getConfig());
        navigator.clipboard.writeText(code).then(() => {
            alert('¡Código copiado al portapapeles!');
        }).catch(() => {
            alert('Error al copiar el código');
        });
    }
}

// Global para los eventos onclick en el HTML inyectado
let editor;
document.addEventListener('DOMContentLoaded', () => {
    editor = new EnemyEditor();
});