// enemy-creator/editor.js

class EnemyEditor {
    constructor() {
        this.deathEffects = []; // Array para guardar múltiples efectos al morir
        this.setupTabs();
        this.setupEventListeners();
        this.setupDynamicFields();
        this.setupDeathEffectsManager();
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
            'mobile', 'speed', 'speedTimeScale', 'speedTimeMulti', 'speedHpScale', 'speedHpMulti',
            'movementStyle', 'orbitRange', 'erraticTime', 'distanceMin', 'distanceMax', 
            'ignoreWalls', 'isPhantom',
            // Ambitious (Avanzados)
            'isWall', 'attackType', 'attackEffect', 'defenseAura', 'evade', 
            'spawnPattern', 'spawnCount'
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
    }

    setupDynamicFields() {
        // Mostrar/Ocultar campos de movimiento según estilo
        const movementStyle = document.getElementById('movementStyle');
        if (movementStyle) {
            movementStyle.addEventListener('change', () => {
                const style = movementStyle.value;
                document.getElementById('orbitRangeField').style.display = style === 'orbit' ? 'block' : 'none';
                document.getElementById('erraticTimeField').style.display = style === 'erratic' ? 'block' : 'none';
                this.generate();
            });
        }

        // Patrones de Spawn
        const spawnPattern = document.getElementById('spawnPattern');
        if (spawnPattern) {
            spawnPattern.addEventListener('change', () => {
                const showCount = ['horde', 'radial'].includes(spawnPattern.value);
                document.getElementById('spawnCountField').style.display = showCount ? 'block' : 'none';
                this.generate();
            });
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
    // ---------------------------------------------

    // Helper para obtener valores del DOM de forma segura
    getVal(id, type = 'string') {
        const el = document.getElementById(id);
        if (!el) return null;
        if (type === 'number') return parseFloat(el.value) || 0;
        if (type === 'boolean') return el.value === 'true';
        return el.value;
    }

    getConfig() {
        return {
            id: this.getVal('typeId'),
            name: this.getVal('enemyName'),
            basic: {
                hp: this.getVal('hp', 'number'),
                hpRegen: this.getVal('hpRegen', 'number'),
                color: this.getVal('color'),
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
                scaling: {
                    timeBase: this.getVal('speedTimeScale', 'boolean'),
                    timeMultiplier: this.getVal('speedTimeMulti', 'number'),
                    hpBase: this.getVal('speedHpScale'), // 'none', 'proportional', 'inverse'
                    hpPercentage: this.getVal('speedHpMulti', 'number')
                },
                style: this.getVal('movementStyle'), // 'chase', 'flee', 'erratic', 'orbit', 'axisX', 'axisY', 'dashOnly'
                orbitRange: this.getVal('orbitRange', 'number'),
                erraticTime: this.getVal('erraticTime', 'number'),
                distanceMin: this.getVal('distanceMin', 'number'),
                distanceMax: this.getVal('distanceMax', 'number'),
                ignoreWalls: this.getVal('ignoreWalls', 'boolean'),
                isPhantom: this.getVal('isPhantom', 'boolean')
            },
            damageMultipliers: {
                dash: this.getVal('dmgDash', 'number'),
                aerialDash: this.getVal('dmgAerialDash', 'number'),
                momentum3: this.getVal('dmgMomentum3', 'number'),
                slam: this.getVal('dmgSlam', 'number'),
                slam3: this.getVal('dmgSlam3', 'number'),
                void: this.getVal('dmgVoid', 'number'),
                wallCrash: this.getVal('dmgWall', 'number'),
                explosion: this.getVal('dmgExplosion', 'number')
            },
            onDeath: this.deathEffects,
            ambitious: {
                isWall: this.getVal('isWall', 'boolean'),
                attack: {
                    type: this.getVal('attackType'), // 'contact', 'shoot', 'dash'
                    effect: this.getVal('attackEffect') // 'none', 'slow', 'push', 'noJump'
                },
                defense: {
                    invulnerableAura: this.getVal('defenseAura', 'boolean'),
                    evade: this.getVal('evade', 'boolean')
                },
                spawn: {
                    pattern: this.getVal('spawnPattern'), // 'normal', 'horde', 'radial', 'follower'
                    count: this.getVal('spawnCount', 'number')
                }
            }
        };
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
    name: '${config.id}', // <--- AÑADE ESTA LÍNEA AQUÍ
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

    copyToClipboard() {
        const code = this.generateCode(this.getConfig());
        navigator.clipboard.writeText(code).then(() => alert('Copiado!'));
    }
}

// Global para los eventos onclick en el HTML inyectado
let editor;
document.addEventListener('DOMContentLoaded', () => {
    editor = new EnemyEditor();
});