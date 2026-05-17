   1 # Boss System — Implementation Plan
    2
    3 ## Approach Decision: Hybrid System
    4
    5 **Not boss-by-boss, not purely data-driven — a BossSystem framework with parameterized configs + escape hatches
       for custom code.**
    6
    7 A data-driven core handles the common infrastructure (phases, attack scheduling, telegraphs, enemy-as-projectil
      e spawning). Individual boss definitions can be pure config OR extend the base class for unique mechanics. This
       gives AI assistants clearly scoped, parallelizable tasks.
    8
    9 ---
   10
   11 ## Architecture Overview
   12
   13 ```
   14 BossManager          — Boss lifecycle, HP bar, phase transitions, death rewards
   15   └─ BossAI          — Movement/positioning per phase (not seek/flee, but arena-aware positioning)
   16   └─ AttackScheduler — Cooldown-managed attack selection per phase
   17        └─ BossAttack[] — Reusable attack patterns, each spawns tag-marked enemies
   18             └─ TelegraphRenderer — Visual warning before attack execution
   19
   20 BossEnemy            — Minimal enemy subclass for attack-spawned entities
   21                        (ignored by density, no rewards, despawns on timer/wall-hit)
   22 BossDefinition       — JSON/config: phases, attacks, movement, visuals
   23 ```
   24
   25 ### How "enemies as attacks" works
   26
   27 A boss attack spawns one or more enemies with special tags:
   28 - `_isBossAttack = true` → skipped by `EnemyManager` for density counting, kill rewards, and death effects
   29 - `_attackTeam = 'boss'` → doesn't damage the boss or other boss attacks
   30 - `_despawnTimer` → self-destructs after N ms
   31 - Movement: ballistic (projectile), linear, orbit-around-origin, stationary (AoE zone), etc.
   32 - On collision with player: deals damage and despawns (or passes through for lingering AoE)
   33
   34 This reuses the existing enemy rendering, collision, and physics — no new rendering pipeline needed.
   35
   36 ---
   37
   38 ## Files to Create / Modify
   39
   40 ### NEW FILES
   41
   42 | File | Lines ~ | Description |
   43 |------|---------|-------------|
   44 | `js/boss/BossManager.js` | 200 | Boss lifecycle, HP thresholds, phase transitions, cleanup |
   45 | `js/boss/BossAI.js` | 150 | Per-phase movement: orbit-at-distance, strafe, charge-telegraph, flee-to-corner,
      hold-position |
   46 | `js/boss/AttackScheduler.js` | 120 | Cooldown tracking, weighted random selection, phase-gated attacks, preve
      nts overlap |
   47 | `js/boss/BossAttack.js` | 250 | Base attack class + 6-8 reusable patterns (cone, radial burst, line charge, o
      rbiting ring, ground slam wave, targeted barrage, minion summon, environmental hazard) |
   48 | `js/boss/TelegraphRenderer.js` | 100 | Draw expanding circles, cones, lines, ground markers using Phaser Grap
      hics |
   49 | `js/boss/BossDefinitions.js` | 80 | Registry of boss configs (like EnemyRegistry but for bosses) |
   50 | `js/boss/definitions/boss_toro.js` | 80 | Example boss: Toro (bull) — charge attacks, invulnerable except aft
      er dodge |
   51 | `js/boss/definitions/boss_centinela.js` | 70 | Example boss: Centinela — rotating laser walls using attack-en
      emies |
   52 | `js/enemies/core/BossAttackEnemy.js` | 60 | Minimal enemy subclass for attack-spawned entities (extends Enemy
      , skips AI) |
   53
   54 ### MODIFIED FILES
   55
   56 | File | Changes |
   57 |------|---------|
   58 | `js/scenes/EnemyManager.js` | Skip `_isBossAttack` enemies in kill rewards, density count, hate system. Add `
      addBossAttack(bossEnemy)` method. |
   59 | `js/scenes/Game.js` | Wire `BossManager` into update loop (after EnemyManager, before render). Add boss spawn
       trigger from timeline/spawner. |
   60 | `js/renderers/EnemyRenderer.js` | Small tweak: boss attack enemies get distinct visual (more translucent, col
      ored border matching boss) |
   61 | `js/scenes/GameRenderer.js` | Wire TelegraphRenderer into render pipeline (after map, before enemies) |
   62 | `js/constants.js` | Add boss section: telegraph colors, timing defaults, HP thresholds |
   63 | `js/enemies/definitions/index.js` | Register boss attack enemy type (singleton pseudo-type) |
   64 | `js/scenes/StageEditor.js` | Add boss placement to timeline (single entity, not interval/density) |
   65 | `js/spawn/EnemySpawner.js` | Add boss spawn trigger type, handle `isBoss: true` differently (max 1 active bos
      s) |
   66
   67 ---
   68
   69 ## Component Deep Dives
   70
   71 ### 1. BossDefinition (data format)
   72
   73 ```js
   74 {
   75   id: 'toro',
   76   name: 'Toro',
   77   basic: { hp: 3000, radius: 40, color: '#cc2200', shape: 'circle', isBoss: true },
   78   phases: [
   79     {
   80       threshold: 100,  // HP% to enter this phase
   81       movement: { style: 'strafe', distance: 250, speed: 300 },
   82       attackPool: [
   83         { attack: 'charge', weight: 3, cooldown: 4000 },
   84         { attack: 'radial_stomp', weight: 1, cooldown: 8000 },
   85       ],
   86       minAttackInterval: 1200,
   87       maxAttackInterval: 3000,
   88     },
   89     // ... more phases
   90   ],
   91   onDeath: { credits: 500, effects: ['explode', 'spawnMinions'] },
   92   arenaConstraint: 'loose', // boss stays within arena + margin
   93 }
   94 ```
   95
   96 ### 2. BossAttack Patterns
   97
   98 Each attack is a class with:
   99 - `telegraph(delta, boss, player)` — draws visual warning, returns true when ready
  100 - `execute(boss, player, enemyManager)` — spawns attack enemies
  101 - `duration` — how long the spawned enemies live
  102 - `damage`, `hitRadius`, `speed` — passed to spawned enemies
  103
  104 **Reusable patterns (6-8)**:
  105 | Attack | Description |
  106 |--------|-------------|
  107 | `charge` | Boss dashes toward player (or telegraph line), spawns trail behind |
  108 | `radial_burst` | N projectiles fire outward in a ring from boss |
  109 | `cone` | Expanding cone of projectiles aimed at player |
  110 | `orbit_ring` | Ring of enemies orbits around boss, slowly expanding |
  111 | `ground_slam` | Expanding circle from boss position after telegraph |
  112 | `targeted_barrage` | 3-5 rapid-fire projectiles aimed at player position |
  113 | `wall_spawn` | Line of stationary damage enemies spawns perpendicular to player movement |
  114 | `minion_summon` | Spawns N real enemies (not attack-tagged) that fight normally |
  115
  116 ### 3. BossAI Movement Styles
  117
  118 Different from DynamicEnemy intentions — boss-specific:
  119 | Style | Behavior |
  120 |-------|----------|
  121 | `strafe` | Circle player at fixed distance, occasionally switch direction |
  122 | `charge_position` | Telegraph dash, then rapid linear movement to target position |
  123 | `hold_center` | Stay near arena center, small drift |
  124 | `flee_to_edge` | Move away from player, hug walls/edges |
  125 | `pursue` | Seek toward player but with inertia (slower turning) |
  126 | `none` | Stationary (for immobile bosses) |
  127
  128 ### 4. Telegraph System
  129
  130 Before each attack executes, a telegraph is drawn:
  131 - **Charge**: widening line/arrow in charge direction (400-800ms)
  132 - **Radial burst**: expanding faint circle from boss (600ms)
  133 - **Cone**: growing translucent cone shape (500ms)
  134 - **Ground slam**: pulsing circle on ground (800ms)
  135 - **Targeted barrage**: small crosshair markers at target positions (400ms)
  136
  137 All telegraphs use `scene.add.graphics()` or the existing Graphics object, drawn during `GameRenderer.render()`
      .
  138
  139 ### 5. Boss Lifecycle (BossManager)
  140
  141 ```
  142 Spawn → Intro (brief invuln + visual) → Phase 1 → [HP threshold] → Phase 2 → ... → Death
  143 ```
  144
  145 - **Spawn**: via timeline trigger or SquadDirector adaptation
  146 - **Phases**: defined by HP% thresholds. When HP drops below threshold, switch phase (new movement, new attack
      pool).
  147 - **Intro**: 1.5s invulnerability, boss name display, camera zoom out slightly
  148 - **Death**: explosion, credit reward, component drops, minion spawn, screen shake
  149
  150 ### 6. Integration Points
  151
  152 - **EnemyManager.update()**: Skip `_isBossAttack` enemies in kill rewards, density counting, hate targeting
  153 - **CombatSystem**: Boss attack enemies damage player on contact (using existing contact damage flow)
  154 - **Rendering**: TelegraphRenderer draws BEFORE enemies (so telegraphs appear under boss and attack entities)
  155 - **Stage Editor**: Add boss to timeline as a special spawn type (like an enemy but with `isBoss: true` and a `
      bossType` field)
  156 - **Only 1 active boss** at a time enforced by BossManager
  157
  158 ---
  159
  160 ## Task Breakdown (for delegation to other AIs)
  161
  162 ### Phase A — Foundation (must be done first, sequential)
  163
  164 **Task A1: BossAttackEnemy** — Create `js/enemies/core/BossAttackEnemy.js`
  165 - Extends `Enemy` (not `DynamicEnemy`)
  166 - Constructor sets `_isBossAttack = true`, `_despawnTimer`, `_attackTeam`
  167 - Override `update()`: only handle projectile movement + wall bounce/despawn + collision with player
  168 - No AI, no path following, no hate system
  169 - Self-despawns when timer expires
  170
  171 **Task A2: EnemyManager modifications** — Modify `js/scenes/EnemyManager.js`
  172 - In `killEnemy()`: if `enemy._isBossAttack`, skip rewards, events, kill counting
  173 - In `getEnemies()`: add optional parameter to exclude boss attack enemies
  174 - Add `addBossAttack(enemy)` method that pushes to enemies array
  175
  176 **Task A3: Constants** — Add boss section to `js/constants.js`
  177 - Telegraph default durations, colors
  178 - Boss HP bar style overrides
  179 - Max active bosses
  180
  181 ### Phase B — Boss System Core (can be parallelized with awareness of each other's interfaces)
  182
  183 **Task B1: BossAI** — Create `js/boss/BossAI.js`
  184 - Implements movement styles listed above
  185 - Takes a `movement` config, updates boss position each frame
  186 - Respects arena bounds
  187 - Returns movement delta `{x, y}`
  188
  189 **Task B2: TelegraphRenderer** — Create `js/boss/TelegraphRenderer.js`
  190 - Methods: `telegraphCone()`, `telegraphCircle()`, `telegraphLine()`, `telegraphCrosshair()`
  191 - Each draws using Graphics, handled by frame countdown
  192 - Pure visual, no game logic
  193
  194 **Task B3: BossAttack base + patterns** — Create `js/boss/BossAttack.js`
  195 - Base `BossAttack` class with telegraph/execute lifecycle
  196 - 6-8 concrete attack subclasses (see list above)
  197 - Each `execute()` spawns `BossAttackEnemy` instances via `enemyManager.addBossAttack()`
  198
  199 **Task B4: AttackScheduler** — Create `js/boss/AttackScheduler.js`
  200 - Weighted random selection from phase's attack pool
  201 - Cooldown tracking per attack type
  202 - Min/max interval enforcement
  203 - Prevents overlapping attacks
  204
  205 ### Phase C — Boss Manager + Integration
  206
  207 **Task C1: BossManager** — Create `js/boss/BossManager.js`
  208 - Boss lifecycle (spawn → phases → death)
  209 - Holds current boss reference
  210 - Updates BossAI + AttackScheduler each frame
  211 - Handles phase transitions on HP thresholds
  212 - Boss HP bar (like EnemyRenderer's `isBoss` style but bigger, screen-top)
  213
  214 **Task C2: BossDefinitions registry** — Create `js/boss/BossDefinitions.js` + example bosses
  215 - Registry class (mirrors EnemyRegistry pattern)
  216 - Example: `boss_toro.js` (charge-based, invulnerable, dodge-accumulates-damage)
  217 - Example: `boss_centinela.js` (orbiting laser walls)
  218 - Both defined as config objects, no custom code needed initially
  219
  220 **Task C3: Game.js integration** — Modify `js/scenes/Game.js`
  221 - Wire `BossManager` into update loop
  222 - Check timeline/spawner for boss spawn events
  223 - Pass `enemyManager`, `player`, `currentMap` references
  224
  225 **Task C4: StageEditor** — Modify `js/scenes/StageEditor.js`
  226 - Add "Boss" spawn type to timeline
  227 - Boss spawn config: `bossType`, `spawnTime`, `x`, `y`
  228
  229 **Task C5: Rendering integration** — Modify `GameRenderer.js` + `EnemyRenderer.js`
  230 - Wire `TelegraphRenderer.render()` into pipeline
  231 - Boss attack enemies get distinct visual treatment (more translucent, colored border)
  232
  233 ### Phase D — Example Bosses (parallel, one AI per boss)
  234
  235 **Task D1-D3**: Define 2-3 complete bosses as config objects, testing the framework end-to-end.
  236
  237 ---
  238
  239 ## Answers to Key Design Questions
  240
  241 **Q: Should enemies be designed one-by-one or via a parameterized system?**
  242 A: **Parameterized system with escape hatches.** The framework handles 90% of what makes a boss (phases, attack
       scheduling, telegraphs, movement). A boss is primarily a JSON config. But if a boss needs unique logic (like T
      oro's "damage accumulates on dodge"), that goes in a boss-specific subclass of `BossDefinition` that overrides
      just the custom part.
  243
  244 **Q: How do "enemies as attacks" work?**
  245 A: Attacks spawn `BossAttackEnemy` instances with tags (`_isBossAttack`, `_attackTeam`, `_despawnTimer`). These
       bypass the normal enemy systems (rewards, density, hate, AI) and exist only as hitboxes. They render using the
       existing `EnemyRenderer` (with visual distinction) and collide using the existing `CombatSystem` contact flow.
  246
  247 **Q: How does the boss spawn?**
  248 A: Via the timeline (stage editor places it at a specific time), OR via an adapted SquadDirector that decides "
      it's time for a boss fight" based on performance. Only 1 boss active at a time.
  249
  250 ---
  249
  250 ---
  251
  252 ## Estimated Total Scope
  253
  254 | Phase | Lines | Complexity |
  255 |-------|-------|------------|
  256 | A — Foundation | ~200 | Low |
  257 | B — Core Systems | ~700 | Medium |
  258 | C — Integration | ~350 | Medium |
  259 | D — Example Bosses | ~200 | Low |
  260 | **Total** | **~1450** | |
  261
  262 ---
  263
  264 ## Risks / Mitigations
  265
  266 | Risk | Mitigation |
  267 |------|------------|
  268 | Attack enemies crowding the enemy array | Hard cap of 80 attack enemies, despawn timer is mandatory |
  269 | Performance with many telegraphs | Telegraphs are single Graphics clear+redraw per frame, not persistent obje
      cts |
  270 | Phase transitions feel jarring | 500ms transition window with visual flash, boss invuln during transition |
  271 | Boss AI looks dumb near walls | BossAI includes arena awareness and wall avoidance |