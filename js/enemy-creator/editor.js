// enemy-creator/editor.js

class EnemyEditor {
    constructor() {
        this.setupTabs();
        this.setupEventListeners();
        this.setupDynamicFields();
        this.generate();
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                // Cambiar tabs
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                // Cambiar paneles
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });
                document.getElementById(`tab-${tabName}`).classList.add('active');
            });
        });
    }

    setupEventListeners() {
        // Sliders con visualización
        const sliders = ['hp', 'radius', 'speed', 'wanderSpeed'];
        sliders.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    const span = document.getElementById(`${id}Val`);
                    if (span) span.textContent = input.value;
                    this.generate();
                });
            }
        });

        // Todos los inputs que generan cambio
        const inputs = ['enemyName', 'typeId', 'color', 'mobile', 'movementStyle', 
                        'orbitRadius', 'distanceMin', 'distanceMax', 'ignoreWalls',
                        'dashDamage', 'slamVulnerable', 'slamDamage', 'teleportOnHit',
                        'deathEffect', 'wanderSpeed'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.generate());
        });

        // Botones
        document.getElementById('generateBtn').addEventListener('click', () => this.generate());
        document.getElementById('downloadBtn').addEventListener('click', () => this.download());
        document.getElementById('copyBtn').addEventListener('click', () => this.copyToClipboard());

        // Rango de wanderSpeed
        const wanderSpeed = document.getElementById('wanderSpeed');
        if (wanderSpeed) {
            wanderSpeed.addEventListener('input', (e) => {
                document.getElementById('wanderSpeedVal').textContent = e.target.value;
            });
        }
    }

    setupDynamicFields() {
        const movementStyle = document.getElementById('movementStyle');
        movementStyle.addEventListener('change', () => {
            const orbitField = document.getElementById('orbitRadiusField');
            orbitField.style.display = movementStyle.value === 'circle' ? 'block' : 'none';
            this.generate();
        });

        const deathEffect = document.getElementById('deathEffect');
        deathEffect.addEventListener('change', () => this.updateDeathParams());
    }

    updateDeathParams() {
        const effect = document.getElementById('deathEffect').value;
        const container = document.getElementById('deathParams');
        
        let html = '';
        switch(effect) {
            case 'explode':
                html = `
                    <div class="field">
                        <label>💥 Radio de explosión</label>
                        <input type="number" id="explodeRadius" value="80">
                    </div>
                    <div class="field">
                        <label>💥 Daño de explosión</label>
                        <input type="number" id="explodeDamage" value="25">
                    </div>
                `;
                break;
            case 'healPlayer':
                html = `
                    <div class="field">
                        <label>💚 Cantidad de curación</label>
                        <input type="number" id="healAmount" value="20">
                    </div>
                `;
                break;
            case 'buffPlayer':
                html = `
                    <div class="field">
                        <label>✨ Tipo de buff</label>
                        <select id="buffType">
                            <option value="speed">Velocidad</option>
                            <option value="damage">Daño</option>
                            <option value="invincibility">Invulnerabilidad</option>
                        </select>
                    </div>
                    <div class="field">
                        <label>⏱️ Duración (ms)</label>
                        <input type="number" id="buffDuration" value="5000">
                    </div>
                    <div class="field">
                        <label>📈 Multiplicador</label>
                        <input type="number" id="buffValue" value="1.5" step="0.1">
                    </div>
                `;
                break;
            case 'spawnMinions':
                html = `
                    <div class="field">
                        <label>🦟 Cantidad de minions</label>
                        <input type="number" id="minionCount" value="3" min="1" max="10">
                    </div>
                    <div class="field">
                        <label>🏷️ Tipo de minion</label>
                        <input type="text" id="minionType" value="small" placeholder="small, medium, big, o custom">
                    </div>
                    <div class="field">
                        <label>📏 Dispersión (px)</label>
                        <input type="number" id="minionSpread" value="100">
                    </div>
                `;
                break;
            case 'dropLoot':
                html = `
                    <div class="field">
                        <label>💎 Items a soltar</label>
                        <select id="lootItems" multiple size="3">
                            <option value="credit">Crédito</option>
                            <option value="orb">Orbe</option>
                            <option value="health">Salud</option>
                        </select>
                        <small>Ctrl+Click para múltiple selección</small>
                    </div>
                `;
                break;
            case 'extraCredit':
                html = `
                    <div class="field">
                        <label>💰 Cantidad de crédito extra</label>
                        <input type="number" id="creditAmount" value="50">
                    </div>
                `;
                break;
            default:
                html = '<small>Sin efectos adicionales</small>';
        }
        
        container.innerHTML = html;
        
        // Añadir event listeners a los nuevos inputs
        container.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('input', () => this.generate());
        });
        
        this.generate();
    }

    getConfig() {
        const effect = document.getElementById('deathEffect').value;
        let onDeath = [];
        
        switch(effect) {
            case 'dropOrb':
                onDeath = [{ type: 'dropOrb' }];
                break;
            case 'extraCredit':
                onDeath = [{ type: 'extraCredit', amount: parseInt(document.getElementById('creditAmount')?.value || 50) }];
                break;
            case 'explode':
                onDeath = [{
                    type: 'explode',
                    radius: parseInt(document.getElementById('explodeRadius')?.value || 80),
                    damage: parseInt(document.getElementById('explodeDamage')?.value || 25)
                }];
                break;
            case 'healPlayer':
                onDeath = [{ type: 'healPlayer', amount: parseInt(document.getElementById('healAmount')?.value || 20) }];
                break;
            case 'buffPlayer':
                onDeath = [{
                    type: 'buffPlayer',
                    buffType: document.getElementById('buffType')?.value || 'speed',
                    duration: parseInt(document.getElementById('buffDuration')?.value || 5000),
                    value: parseFloat(document.getElementById('buffValue')?.value || 1.5)
                }];
                break;
            case 'spawnMinions':
                const items = document.getElementById('lootItems');
                onDeath = [{
                    type: 'spawnMinions',
                    count: parseInt(document.getElementById('minionCount')?.value || 3),
                    minionType: document.getElementById('minionType')?.value || 'small',
                    spread: parseInt(document.getElementById('minionSpread')?.value || 100)
                }];
                break;
            case 'dropLoot':
                const selected = Array.from(document.getElementById('lootItems')?.selectedOptions || [])
                    .map(opt => opt.value);
                onDeath = [{ type: 'dropLoot', items: selected.length ? selected : ['credit'] }];
                break;
            default:
                onDeath = [];
        }
        
        const movementStyle = document.getElementById('movementStyle').value;
        const orbitRadius = movementStyle === 'circle' ? parseInt(document.getElementById('orbitRadius')?.value || 120) : undefined;
        
        return {
            name: document.getElementById('enemyName').value || 'CustomEnemy',
            typeId: document.getElementById('typeId').value || 'custom_enemy',
            hp: parseInt(document.getElementById('hp').value),
            radius: parseInt(document.getElementById('radius').value),
            speed: parseInt(document.getElementById('speed').value),
            color: document.getElementById('color').value,
            mobile: document.getElementById('mobile').value === 'true',
            movementStyle: movementStyle,
            orbitRadius: orbitRadius,
            distanceMin: parseInt(document.getElementById('distanceMin').value),
            distanceMax: parseInt(document.getElementById('distanceMax').value),
            ignoreWalls: document.getElementById('ignoreWalls').value === 'true',
            wanderSpeed: parseFloat(document.getElementById('wanderSpeed').value),
            dashDamage: parseInt(document.getElementById('dashDamage').value),
            slamVulnerable: document.getElementById('slamVulnerable').value === 'true',
            slamDamage: document.getElementById('slamDamage').value ? parseInt(document.getElementById('slamDamage').value) : undefined,
            teleportOnHit: document.getElementById('teleportOnHit').value === 'true',
            onDeath: onDeath
        };
    }

    generate() {
        const config = this.getConfig();
        const code = this.generateCode(config);
        const preview = document.getElementById('codePreview');
        preview.innerHTML = this.highlightCode(code);
    }

    generateCode(config) {
        const className = this.toClassName(config.name);
        const typeId = config.typeId;
        
        // Construir objeto de configuración
        const configObj = {
            type: typeId,
            radius: config.radius,
            maxHp: config.hp,
            hp: config.hp,
            color: config.color,
            speed: config.speed,
            movementStyle: config.movementStyle,
            behaviors: { mobile: config.mobile },
            distanceMin: config.distanceMin,
            distanceMax: config.distanceMax,
            ignoreWalls: config.ignoreWalls,
            wanderSpeed: config.wanderSpeed,
            dashDamage: config.dashDamage,
            slamVulnerable: config.slamVulnerable,
            teleportOnHit: config.teleportOnHit
        };
        
        if (config.orbitRadius) configObj.orbitRadius = config.orbitRadius;
        if (config.slamDamage) configObj.slamDamage = config.slamDamage;
        if (config.onDeath.length > 0) configObj.onDeath = config.onDeath;
        
        const configStr = JSON.stringify(configObj, null, 4)
            .replace(/"([^"]+)":/g, '$1:')
            .replace(/: "([^"]+)"/g, ': "$1"');
        
        return `// Enemigo generado con Enemy Creator
// Nombre: ${config.name}
// Fecha: ${new Date().toLocaleString()}

export default {
    name: '${typeId}',
    config: ${configStr}
};`;
    }

    toClassName(name) {
        return name.split(/[-\s_]+/).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join('');
    }

    highlightCode(code) {
        return code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/(\/\/.*)/g, '<span style="color:#6a9955;">$1</span>')
            .replace(/(export|default|const|let|return|function|if|else)/g, '<span style="color:#569cd6;">$1</span>')
            .replace(/("[^"]*")/g, '<span style="color:#ce9178;">$1</span>')
            .replace(/(\d+)/g, '<span style="color:#b5cea8;">$1</span>');
    }

    download() {
        const config = this.getConfig();
        const code = this.generateCode(config);
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.typeId || 'enemy'}.js`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showMessage('✅ Archivo descargado');
    }

    copyToClipboard() {
        const config = this.getConfig();
        const code = this.generateCode(config);
        navigator.clipboard.writeText(code).then(() => {
            this.showMessage('📋 Código copiado al portapapeles');
        });
    }

    showMessage(msg) {
        const div = document.createElement('div');
        div.textContent = msg;
        div.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 1000;
            animation: fadeOut 2s ease forwards;
        `;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 2000);
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new EnemyEditor();
});