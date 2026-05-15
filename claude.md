# Compass Run — Project Reference

> Arena momentum-based action game built with Phaser 3 (v3.60).
> Canvas-rendered, Spanish-language UI. Loaded as `index.html` → `js/main.js`.

## Quick Start

Open `index.html` in a browser. Phaser loads from CDN. The game starts at `MainMenu`.
- **Play**: MainMenu → Stage Select → `Game` scene.
- **Editor**: MainMenu → `StageEditor` scene.
- **Enemy Creator**: `js/enemy-creator/index.html` (separate page).

---

## Architecture Map

```
index.html
  └─ js/main.js                  Phaser config, scene list
       ├─ js/constants.js         All tuning constants (one source of truth)
       ├─ js/scenes/
       │    ├─ MainMenu.js        Title screen, stage select, import
       │    ├─ Game.js            Core game loop, orchestration
       │    ├─ GameRenderer.js    Composition root for all renderers
       │    ├─ Camera.js          World→screen transforms, zoom, smooth follow
       │    ├─ MomentumSystem.js  Stack-based level (1→2→3), speed/damage scaling
       │    ├─ CompassSystem.js   Rotating directions + buff ticks
       │    ├─ RewardSystem.js    Credits (passive + speed-based)
       │    ├─ OrbManager.js      Healing orb spawn/collect
       │    ├─ EnemyManager.js    Enemy lifecycle, spawn orchestration
       │    ├─ Enemy.js           Base enemy class (hp, damage, multipliers)
       │    ├─ ShopUI.js          Full shop panel (buy/sell components & items)
       │    ├─ StageEditor.js     Timeline-based stage editor
       │    ├─ StageEditorUI.js   Editor HUD and controls
       │    └─ player/
       │         ├─ Player.js     Movement, dash, jump, wall stick, states
       │         ├─ PlayerInput.js     WASD + gamepad input
       │         ├─ PlayerHealth.js    HP, regen, invincibility, void
       │         └─ PlayerCombat.js    Slam, attack payloads, damage calcs
       ├─ js/enemies/
       │    ├─ EnemyRegistry.js   Type registration, factory
       │    ├─ core/
       │    │    └─ DynamicEnemy.js   AI: seek/flee/orbit/wander/dashOnly, paths, hate
       │    └─ definitions/
       │         ├─ index.js      Registers all custom enemies
       │         ├─ ant.js        Ground wanderer, hates others, flees on damage
       │         ├─ anti.js       Ground wanderer, hates nearly all types
       │         ├─ bee.js        Flying seeker, phantom, sees through walls
       │         ├─ wasp.js       Flying seeker, faster, fights bees
       │         ├─ cricket.js    Ground dashOnly, impenetrable
       │         ├─ spider.js     Ambush seeker, resists dash, weak to slam
       │         ├─ beetle.js     Flee-style, push attack
       │         └─ dummy.js      Immobile target, respawns
       ├─ js/spawn/
       │    └─ EnemySpawner.js    Timeline, triggers, density fill, waypoints
       ├─ js/systems/
       │    ├─ CollisionSystem.js Wall collision, wall stick, ADD rebound
       │    ├─ CombatSystem.js    Player↔enemy damage, aura, stick
       │    ├─ ItemSystem.js      Component & item definitions, stats, pricing
       │    ├─ ItemEffects.js     Registry delegating to 22 effect classes
       │    ├─ ShopSystem.js      Inventory, buy/sell, shop stock, reroll
       │    ├─ ZoneSystem.js      Zone types: void/shop/damage/slow/trap/death/heal/fire
       │    ├─ SVGMapLoader.js    Parses SVG into walls + zones
       │    ├─ GeometryUtils.js   Line math helpers
       │    └─ effects/           22 individual item effect classes
       │         ├─ AAA_Berserker.js     AAB_Grapple.js    AAD_Explosive.js
       │         ├─ AAG_OneTwo.js        ABC_ActiveCompass.js  ACC_Propulsor.js
       │         ├─ ADD_ShockAbsorber.js BBB_DemonMode.js  BBC_Rebound.js
       │         ├─ CAD_Vampire.js       CBG_EventHorizon.js   CCB_Accelerator.js
       │         ├─ CCC_Incendiary.js    CCG_Builder.js     DAB_Mastery.js
       │         ├─ DBB_Patience.js      DDC_SandKing.js    DDD_Fenix.js
       │         ├─ GBA_Acrobatic.js     GGC_Auspice.js     GGD_Clockmaker.js
       │         └─ GGG_Flipcoin.js
       ├─ js/renderers/
       │    ├─ ArenaRenderer.js     Arena background + grid + border
       │    ├─ MapRenderer.js        SVG walls + zones (incl. destructible)
       │    ├─ PlayerRenderer.js     Triangle player with effects
       │    ├─ EnemyRenderer.js      Circle/rect enemies + HP bars
       │    ├─ TrailRenderer.js      Player movement trail
       │    ├─ Compass.js            Compass direction visual
       │    ├─ HealthBar.js          HP bar HUD
       │    ├─ MomentumBar.js        Momentum level bar
       │    ├─ DashIndicator.js      Dash cooldown indicator
       │    ├─ UIManager.js          HUD: timer, speed, credits, items, pause, game over
       │    └─ DamageNumberManager.js Floating damage numbers
       └─ js/utils/
            └─ SpatialGrid.js      O(1) wall queries
```

---

## Core Systems

### Player (`js/scenes/player/Player.js`)

| State | Trigger | Behavior |
|-------|---------|----------|
| Grounded | Default | WASD movement, turning/stopping curves |
| Jumping | Space (ground/air) | Ballistic arc scaled by momentum level (L1/L2/L3) |
| Dashing | Shift | High-speed burst, aerial dashes have no CD |
| Wall Stick | Collide with wall while jumping + holding Space | Stick up to 2s, grace 100ms, jump off |
| Slam | Space mid-jump at speed >= 500 | Ground-pound AoE, self-damage, knockback |
| Stunned | Dash into wall (no ADD) | 250ms stun |

Key properties mutated by items:
- `_dashCDBase` — base dash cooldown
- `_derapeReduction` — lateral friction reduction
- `_controlReduction` — turning responsiveness penalty
- `attackRadiusMultiplier` — attack hitbox size
- `trueDamage` — flat damage bypassing enemy multipliers
- `_demonMode` — BBB active (speed cap 150%, perfect control)
- `_undetectable` — GBA active (enemies ignore, pass through walls)
- `_stickState` / `_stickEnemy` — BBC active (riding enemy)
- `trapped` — inside trap zone

### Momentum System (`js/scenes/MomentumSystem.js`)

```
stacks -> level:  <40 = L1 (blue)  |  40-50 = L2 (orange)  |  >50 = L3 (red)
```

- Stacks gain: +1 per kill (modified by stackRateBonus/malus)
- Decay: -2 stacks/sec after 5s inactivity
- L3 passive: enemies in contact radius take damage
- Permanent upgrades: `addMaxSpeed(amount)` per kill, `addAmplitude(amount)` widens L2 range
- Halved on wall collision

### Compass System (`js/scenes/CompassSystem.js`)

Two rotating directions with assigned buffs:
- **Primary**: cardinal (N/S/E/O), changes every ~6s (faster with momentum stacks, scales over time)
- **Secondary**: diagonal (NE/NO/SE/SO), changes 2x faster

Moving aligned with the direction (+/-22.5 degrees for primary, stricter for secondary) ticks the buff every 100ms:

| Buff | Primary/100ms | Secondary/100ms |
|------|---------------|-----------------|
| heal | +0.2 HP | +0.4 HP |
| credit | +0.7 | +1.4 |
| momentum | +0.5 stacks | +1 stack |
| dashCd | -100ms from current CD | -200ms |
| trueDamage | +0.03 flat damage | +0.06 |

Speed-based multiplier: linear 1x->3x from speed 300->1000. Enemy proximity multiplier: up to 2x when enemies < 35px (credit buff only).

### Reward System (`js/scenes/RewardSystem.js`)

- Credits accumulate from: base 1/s + speed-based factor + component/item bonuses
- Orbs: spawn on enemy kill (with delay), heal 1-25 HP based on player speed when collected
- Kill rewards: +1 max speed permanently, credits, vampire orb (CAD), component drop (4% chance)

---

## Enemy System

### Base Enemy (`js/scenes/Enemy.js`)
- `hp`, `maxHp`, `hpRegen`, `radius`, `shape` (circle/rectangle), `color`
- `damageMultipliers`: per-type multipliers (dash, aerialDash, wallJumpDash, momentum3, slam, slam3, void, wallCrash, explosion, fire)
- `onDeathEffects`: array of post-death actions (extra credits, respawn)

### DynamicEnemy (`js/enemies/core/DynamicEnemy.js`) — extends Enemy

**Movement styles**: `seek`, `flee`, `orbit`, `wander`, `circle`, `axisX`, `axisY`, `dashOnly`

**Key features**:
- Reaction radius with hysteresis (detection/2x disengage), LOS-gated
- Custom reaction radius per enemy type (0 = always aware, null = use global default)
- Path following (legacy single-path + new multi-path waypoints)
- Hate system: enemies attack other enemy types within `hateRadius`
- Flee triggers: `proximity` (default), `damage` (flee when hit), `chase`
- Self-destruct: timer-based or proximity-based
- Speed scaling: time-based (speeds up over game duration) or HP-based (faster when low)
- Attack effects: slow, push, noJump

### Enemy Definitions (8 types)

| Type | HP | Style | Special |
|------|-----|-------|---------|
| dummy | 2000 | immobile | Regenerates 100 HP/s, respawns on death |
| ant | 50 | wander | Flees on damage, hates 5 types, 2 credits on kill |
| anti | 50 | wander | Flees on damage, hates 5 types, 2 credits |
| spider | 110 | seek | 0.1x dash damage, 4x slam3, 10 contact dmg, 100 credits |
| beetle | 200 | flee | Push attack, 2x dash dmg, 0.5x aerial dash |
| bee | 100 | seek | Flying, phantom, sees through walls, 5 credits |
| wasp | 100 | seek | Flying, phantom, faster than bee, 5 credits |
| cricket | 500 | dashOnly | Impenetrable (blocks player), 5x wallJumpDash, 10 contact dmg, 50 credits |

### Enemy Spawner (`js/spawn/EnemySpawner.js`)

- **Timeline spawns**: enemies sorted by `spawnTime`, spawned when elapsed game time reaches it
- **Trigger spawns**: `kills` threshold or `coords` proximity
- **Interval spawners**: repeat spawn at fixed intervals with round-robin type selection
- **Density fill**: maintains minimum enemy count by spawning from filler types
- **Hardcap**: max enemies = `maxBase + maxPerMin * minutes`, capped at 300
- Path assignment: multi-path waypoints (patrol routes)

### Design Doc Intent (from `ENEMIGOS Y QUE DEBEN HACER.txt`)

Planned/desired enemies not yet implemented:
- **Spider2** (tiger spider): ranged web attacks, slow + no-jump stacking
- **Slug**: wall-dwelling, tanky, leaves slowing slime
- **Moth**: fast flying, harmless, high reward
- **Centipede**: wall-hugger, high HP, only head takes last-hit
- **Mantis**: jumping melee, immune to most attacks
- **Stalker**: spawns when player stands still, sits on player dealing damage
- **Bull** (semiboss): invulnerable, damage accumulates per dodge before attacking

---

## Shop & Item System

### Components

| ID | Name | Stat | Price |
|----|------|------|-------|
| A | Catalizador A | -200ms dash CD | 500 |
| B | Catalizador B | -8% drift (derrape) | 500 |
| C | Catalizador C | +8% stacks per kill | 500 |
| D | Catalizador D | +0.4 HP/s regen | 500 |
| G | Catalizador G | +2 credits/s | 500 |

Components drop from enemies (4% chance), can be bought in shop (500 credits), and are consumed when crafting items.

### Items (23 total)

| ID | Name | Components | Effect Summary |
|----|------|------------|----------------|
| AAA | Berserker | A,A,A | Up to +100% damage based on missing HP, costs 3 HP per attack |
| BBB | Demon Mode | B,B,B | Every 30s: aerial dash activates 2s demon mode (speed cap 150%, perfect control) |
| CCC | Incendiary | C,C,C | Skidding leaves fire trails (20 dmg/s), -50% control |
| DDD | Fenix | D,D,D | Lethal damage: revive + explode + freeze enemies 3s, CD 60s, +10 max HP |
| ADD | Amortiguador | A,D,D | Dash into wall rebounds, -40% wall/slam self-damage |
| AAD | Explosivo | A,A,D | 25% chance enemies explode on death, damaging nearby |
| BBC | Rebotar | B,B,C | Land on enemy from jump: damage + auto-bounce, +5 dmg per consecutive bounce |
| CCB | Acelerador | C,C,B | Max speed scales with current credits (cap 3000 px/s) |
| ACC | Propulsor | A,C,C | 2x dash distance and speed |
| DBB | Paciencia | D,B,B | 5s without taking/dealing damage: next dash up to +999% damage, CD 5s |
| DDC | Sand King | D,D,C | L3 slam: applies damage twice, +3 dmg per enemy hit |
| AAB | Gancho | A,A,B | First dash enemy gets grabbed; next dash launches it as projectile |
| ABC | Brujula Activa | A,B,C | Dash toward primary compass: +10 stacks; secondary: +20 stacks |
| CAD | Vampiro | C,A,D | 6% chance to spawn purple orb on kill; move near it for +40% speed; touch heals |
| DAB | Maestria | D,A,B | Instant dash redirects, each redirect +10% dash damage |
| GGG | Flipcoin | G,G,G | Damage fluctuates x0.5-x2.5; >x2.0 gives 25-50 credits; <x1.0 pays to force x1.0 |
| GGC | Auspice | G,G,C | Prices drop 1% per enemy killed in last 10s |
| GGD | Clockmaker | G,G,D | Timer 2x faster, kills +6s, compass buffs doubled |
| GBA | Acrobatic | G,B,A | Every 12s: aerial dash makes you undetectable 4s (ignore enemies, pass walls) |
| AAG | One-Two | A,A,G | Every 2nd dash: +25% of previous dash damage to first enemy hit |
| CBG | Event Horizon | C,B,G | 10% chance on kill: create black hole (200px) that pulls enemies at 50px/s |
| CCG | Builder | C,C,G | 2x wall damage, breaking walls gives charges; Shift stationary places a wall |

**Shop stock**: all items available (currently via `rollShopStock()` returning all keys).
**Pricing**: base 2000, minus 500 per matching component in inventory.
**Sell rate**: 50% of price.

---

## Maps & Zones

### SVG Map Format
Maps are loaded from `assets/maps/*.svg` via `SVGMapLoader`. SVG `<line>` elements become wall segments. Colored `<polygon>`/`<rect>` become zones.

### Zone Types
| Type | Effect |
|------|--------|
| void | Kills grounded player and terrestrial enemies |
| shop | Opens shop UI when player enters |
| pit_stop | Same as shop |
| damage_zone | Continuous damage per second |
| slow_zone | Slows player (unless demon mode) |
| trap | Prevents ground movement (jump to escape) |
| death | Instant kill |
| heal | Heals player by fixed amount |
| fire | Dynamic zone (CCC item), damages enemies, expires |

### Destructible Walls
- Walls can have `hp` property (default from `WALL_DEFAULT_HP` = 300)
- Dashing into walls deals `impactSpeed * 0.1` damage to wall
- CCG Builder: all walls become destructible, 2x damage
- CCG Builder: breaking a wall gives +1 charge (max 10)
- Enemies stuck on walls deal `ENEMY_WALL_DAMAGE_RATE` (15) HP/s to walls if player is within 800px
- Broken walls (`_broken = true`) are skipped by collision and rendering

---

## Rendering Pipeline

All rendering is done via Phaser `Graphics` objects (no sprite-based rendering).

Per-frame in `GameRenderer.render()`:
1. `camera.apply(g)` — translate + scale
2. `arenaRenderer` — dark background, grid, border
3. `mapRenderer.renderZones` — zone polygons
4. `mapRenderer.renderLines` — wall segments (with HP-color for destructible)
5. `trailRenderer` — player movement trail
6. `playerRenderer` — triangle with jump/power effects
7. `enemyRenderer` — circles/rectangles with HP bars
8. `orbManager.render` — healing orbs
9. Attack radius, slam effects, bounce highlights, sand king indicator
10. `itemEffects.renderVampireOrbs`, `renderEventHorizons`
11. `compass.render` — direction arrows
12. `camera.restore(g)`
13. HUD: health bar, momentum bar, dash indicator, compass HUD, UI manager

---

## Key Constants Reference

| Constant | Value | Meaning |
|----------|-------|---------|
| `W`, `H` | 880, 620 | Canvas dimensions |
| `ARENA` | {x:55, y:58, w:4000, h:4000} | Arena bounds |
| `TRAIL_MAX` | 16 | Max trail points |
| `MAX_SPD` | [0, 250, 350, 400] | Base max speed per momentum level |
| `JUMP_DUR` | [0, 400, 500, 600] | Jump duration per level (ms) |
| `JUMP_HMAX` | [0, 28, 54, 84] | Jump height per level |
| `DASH_DUR` | 500ms | Dash duration |
| `DASH_CD` | 2000ms | Ground dash cooldown |
| `HP_MAX` | 100 | Player max HP |
| `HP_REGEN_DELAY` | 4000ms | Delay before HP regen starts |
| `HP_REGEN_RATE` | 0.2/s | HP regen rate |
| `SLAM.MIN_SPEED` | 500 | Min speed to slam |
| `SLAM.HIGH_SPEED_THRESHOLD` | 1500 | Speed for "slam3" |
| `SLAM.DAMAGE` | 50 | Base slam damage |
| `SLAM.COOLDOWN` | 5000ms | Between slams |
| `WALL_DEFAULT_HP` | 300 | Destructible wall HP |
| `ENEMY_REACTION_RADIUS` | 400 | Default enemy detection radius |
| `ATTACK_RADIOS` | {1:50, 2:55, 3:60} | Base attack hitbox per level |

---

## Controls

| Input | Action |
|-------|--------|
| WASD / Left Stick | Move |
| Space / Gamepad A | Jump, wall jump, slam (mid-air) |
| Shift / Gamepad X | Dash |
| ESC / P / Gamepad Start | Pause |
| Space (in menus) | Confirm |
| M (game over) | Main menu |

---

## Stage Editor (`StageEditor`)

- Timeline-based: place enemies at specific spawn times
- Interval spawners: define position, types, interval, start/expire time
- Density settings: min/max enemies, scaling per minute, filler types
- Path waypoints: multi-path patrol routes for spawners
- Map selection: load SVG maps
- Import/Export: JSON files via localStorage and file import
- Mouse drag to pan, scroll to zoom

---

## Enemy Creator Tool

Located at `js/enemy-creator/index.html` — separate visual editor to create enemy definition JSON files. Outputs the format used by `js/enemies/definitions/*.js`.

---

## Data Flow (per frame in Game.update)

```
1. Player.update(delta, momentum)
   |- PlayerInput.update() -> moveDir
   |- PlayerHealth.update(delta, dt, wallStick)
   |- PlayerCombat.update(delta)
   |- State transitions (jump, dash, slam, wall stick)
   |- Physics integration (vx, vy -> px, py)

2. CompassSystem.update(delta, player, now)
   |- Check direction alignment -> apply buff ticks

3. MomentumSystem.updateDecay(delta)

4. EnemyManager.update(delta, now, player, lines)
   |- Spawner.update() -> spawn new enemies
   |- Each enemy.update(delta, player, lines)

5. ItemEffects.update(delta, player, momentum, enemyManager)

6. RewardSystem.update(delta, player)
7. OrbManager.update(delta, player)

8. EnemyManager.processPlayerInteractions() -> CombatSystem
   |- Check attack range -> damage enemies
   |- Check contact -> damage player

9. CollisionSystem.checkLineCollisions() x 2 (swept)
   |- Wall collision resolution
   |- Wall stick / dash wall damage

10. ZoneSystem.checkZones()
    |- Zone effects, fire damage, shop open/close

11. EnemyManager.processSlam() if active
12. Camera.update() -> smooth follow + zoom
13. GameRenderer.render() -> draw everything
```

---

## Design Notes

- **Cache key pattern**: `cr_stages` (localStorage), `cr_allow_duplicates` (localStorage toggle)
- **Canvas size**: 880x620, Phaser Scale.FIT with auto-center
- **Shop panel**: 520x480px centered, 2-column layout (buy components / buy items), tabbed (buy/sell)
- **Damage numbers**: Float upward with color coding (enemy damage = white, slam = orange, heal = green, true damage = purple, player damage = red)
- **BBC bounce combo**: Resets when player lands without bouncing
- **DBB Patience**: Timer tracks idle time without giving/receiving damage; resets on taking damage
- **GGD Clockmaker**: Timer runs at 2x speed; killing enemies adds 6 seconds
- **SVG maps**: Stored in `assets/maps/`; `default5.svg` and `default6.svg` exist

---

## Files to Consult for Common Tasks

| Task | Files |
|------|-------|
| Tuning balance | `js/constants.js` (everything), `js/systems/ItemSystem.js` (item stats) |
| Adding an enemy | `js/enemies/definitions/` + register in `index.js` |
| Adding an item | `js/systems/ItemSystem.js` (definition) + `js/systems/effects/` (new effect class) + wire in `ItemEffects.js` |
| Modifying player physics | `js/scenes/player/Player.js` |
| Modifying collision | `js/systems/CollisionSystem.js` |
| Modifying combat | `js/systems/CombatSystem.js` |
| Modifying rendering | `js/renderers/` or `js/scenes/GameRenderer.js` |
| Modifying shop UI | `js/scenes/ShopUI.js` |
| Modifying compass/buffs | `js/scenes/CompassSystem.js` + `js/constants.js` compass section |
| Modifying enemy AI | `js/enemies/core/DynamicEnemy.js` |
| Modifying spawn logic | `js/spawn/EnemySpawner.js` |
| Modifying zones | `js/systems/ZoneSystem.js` |
| Modifying maps | `assets/maps/*.svg` |
| Stage editing | `js/scenes/StageEditor.js` + `StageEditorUI.js` |
| HUD/pause/menus | `js/renderers/UIManager.js`, `js/scenes/MainMenu.js` |
