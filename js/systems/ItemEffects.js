// js/systems/ItemEffects.js
// Thin registry that delegates to individual effect classes in effects/

import AAAEffect from './effects/AAA_Berserker.js';
import AABEffect from './effects/AAB_Grapple.js';
import AADEffect from './effects/AAD_Explosive.js';
import ABCEffect from './effects/ABC_ActiveCompass.js';
import ACCEffect from './effects/ACC_Propulsor.js';
import ADDEffect from './effects/ADD_ShockAbsorber.js';
import BBBEffect from './effects/BBB_DemonMode.js';
import BBCEffect from './effects/BBC_Rebound.js';
import BCDEffect from './effects/BCD_Equilibrium.js';
import CADEffect from './effects/CAD_Vampire.js';
import CBGEffect from './effects/CBG_EventHorizon.js';
import CCGEffect from './effects/CCG_Builder.js';
import CCBEffect from './effects/CCB_Accelerator.js';
import CCCEffect from './effects/CCC_Incendiary.js';
import DBBEffect from './effects/DBB_Patience.js';
import DDCEffect from './effects/DDC_SandKing.js';
import DDDEffect from './effects/DDD_Fenix.js';
import GGGEffect from './effects/GGG_Flipcoin.js';
import GGCEffect from './effects/GGC_Auspice.js';
import GGDEffect from './effects/GGD_Clockmaker.js';
import GBAEffect from './effects/GBA_Acrobatic.js';
import AAGEffect from './effects/AAG_OneTwo.js';

export default class ItemEffects {
  constructor(scene) {
    this.scene = scene;

    this._aaa = new AAAEffect(scene);
    this._aab = new AABEffect(scene);
    this._aad = new AADEffect(scene);
    this._abc = new ABCEffect(scene);
    this._acc = new ACCEffect(scene);
    this._add = new ADDEffect(scene);
    this._bbb = new BBBEffect(scene);
    this._bbc = new BBCEffect(scene);
    this._bcd = new BCDEffect(scene);
    this._cad = new CADEffect(scene);
    this._cbg = new CBGEffect(scene);
    this._ccg = new CCGEffect(scene);
    this._ccb = new CCBEffect(scene);
    this._ccc = new CCCEffect(scene);
    this._dbb = new DBBEffect(scene);
    this._ddc = new DDCEffect(scene);
    this._ddd = new DDDEffect(scene);
    this._ggg = new GGGEffect(scene);
    this._ggc = new GGCEffect(scene);
    this._ggd = new GGDEffect(scene);
    this._gba = new GBAEffect(scene);
    this._aag = new AAGEffect(scene);
  }

  // ── Property proxies (external code reads these directly) ──────

  // BBB
  get bbbActive()   { return this._bbb.active; }
  get bbbTimer()    { return this._bbb.timer; }
  get bbbCooldown() { return this._bbb.cooldown; }

  // BBC
  get bbcActive()  { return this._bbc.active; }
  get bbcBounces() { return this._bbc.bounces; }

  // DBB
  get dbbLastMult()  { return this._dbb.lastMult; }
  get dbbCooldown()  { return this._dbb.cooldown; }
  get dbbReady()     { return this._dbb.ready; }
  get dbbBonus()     { return this._dbb.bonus; }
  get dbbIdleTimer() { return this._dbb.idleTimer; }

  // DDD
  get dddCD() { return this._ddd.cd; }

  // AAB
  get aabGrabbed() { return this._aab.grabbed; }

  // Stats (read + written externally)
  get statAADExplosions()  { return this._aad.explosions; }
  set statAADExplosions(v) { this._aad.explosions = v; }
  get statADDMitigated()   { return this._add.mitigated; }
  set statADDMitigated(v)  { this._add.mitigated = v; }

  // ── Core ────────────────────────────────────────────────────────

  has(id) {
    return this.scene.shopSystem?.hasEffect(id) || false;
  }

  update(delta, player, momentum, enemyManager) {
    if (this.has('BBB')) this._bbb.update(delta, player, momentum);
    if (this.has('DBB')) this._dbb.update(delta, player);
    if (this.has('DDD')) this._ddd.update(delta, player);
    if (this.has('AAB')) this._aab.update(delta);
    if (this.has('GGG')) this._ggg.update(delta);
    if (this.has('CAD')) this._cad.update(delta, player);
    if (this.has('CCB')) this._ccb.update(momentum);
    if (this.has('GGC')) this._ggc.update();
    if (this.has('GGD')) this._ggd.update(delta);
    if (this.has('GBA')) this._gba.update(delta, player);
    if (this.has('CBG')) this._cbg.update(delta);
  }

  // ── BBB: Demon Mode ──────────────────────────────────────────────

  onAerialDash(player, momentum) {
    if (this.has('BBB')) this._bbb.onAerialDash(player, momentum);
    if (this.has('GBA')) this._gba.onAerialDash(player);
  }

  onEnemyKilledInDemon() {
    if (this.has('BBB')) this._bbb.onEnemyKilledInDemon();
  }

  // ── BBC: Rebound ─────────────────────────────────────────────────

  onStickEnemy(player, enemy, now, momentumSystem) {
    if (!this.has('BBC')) return false;
    return this._bbc.onStickEnemy(player, enemy, now, momentumSystem);
  }

  onJumpOffEnemy(player, enemy, dirX, dirY, momentumSystem) {
    if (this.has('BBC')) this._bbc.onJumpOffEnemy(player, enemy, dirX, dirY, momentumSystem);
  }

  onStickExpired(enemy) {
    if (this.has('BBC')) this._bbc.onStickExpired(enemy);
  }

  onPlayerLanded() {
    if (this.has('BBC')) this._bbc.onPlayerLanded();
  }

  // ── DBB: Patience ────────────────────────────────────────────────

  onPlayerTookDamage() {
    if (this.has('DBB')) this._dbb.onPlayerTookDamage();
  }

  getDashDamageMultiplier(player) {
    if (!this.has('DBB')) return 1;
    return this._dbb.getDashDamageMultiplier(player);
  }

  // ── DDD: Fenix ───────────────────────────────────────────────────

  onLethalDamage(player) {
    if (!this.has('DDD')) return false;
    return this._ddd.onLethalDamage(player);
  }

  // ── AAA: Berserker ───────────────────────────────────────────────

  getAAAMultiplier(player) {
    if (!this.has('AAA')) return 1;
    return this._aaa.getMultiplier(player);
  }

  getAAACost(player) {
    if (!this.has('AAA')) return 0;
    return this._aaa.getCost(player);
  }

  // ── ADD: Shock Absorber ──────────────────────────────────────────

  getADDDamageReduction() {
    return this.has('ADD') ? this._add.getDamageReduction() : 0;
  }

  // ── AAD: Explosive ────────────────────────────────────────────────

  onEnemyDied(enemy, enemyManager) {
    if (this.has('AAD')) this._aad.onEnemyDied(enemy, enemyManager);
    if (this.has('CBG')) {
      this._cbg.spawnHole(enemy.x, enemy.y);
      this._cbg.onEnemyKilledInHole(enemy);
    }
  }

  // ── DDC: Sand King ───────────────────────────────────────────────

  applySandKingBonus(slamX, slamY, baseDamage, enemyManager, now) {
    if (this.has('DDC')) this._ddc.applySandKingBonus(slamX, slamY, baseDamage, enemyManager, now);
  }

  // ── ACC: Propulsor ───────────────────────────────────────────────

  getDashSpeedMult()     { return this.has('ACC') ? this._acc.getDashSpeedMult() : 1.0; }
  getDashDistanceMult()  { return this.has('ACC') ? this._acc.getDashDistanceMult() : 1.0; }

  // ── CAD: Vampire ─────────────────────────────────────────────────

  spawnVampireOrb(x, y) {
    if (this.has('CAD')) this._cad.spawnOrb(x, y);
  }

  renderVampireOrbs(g) {
    if (this.has('CAD')) this._cad.render(g);
  }

  renderEventHorizons(g) {
    if (this.has('CBG')) this._cbg.render(g);
  }

  // ── ABC: Active Compass ──────────────────────────────────────────

  onDashInCompassDir(player, momentum, isPrimary) {
    if (this.has('ABC')) this._abc.onDashInCompassDir(player, momentum, isPrimary);
  }

  // ── AAB: Grapple ─────────────────────────────────────────────────

  tryGrab(enemy, player) {
    if (!this.has('AAB')) return false;
    return this._aab.tryGrab(enemy, player);
  }

  onDashWhileGrabbing(player, dashDirX, dashDirY, dashSpeed) {
    if (!this.has('AAB')) return false;
    return this._aab.onDashWhileGrabbing(player, dashDirX, dashDirY, dashSpeed);
  }

  // ── BCD: Equilibrium ─────────────────────────────────────────────

  onDerape(momentum) {
    if (this.has('BCD')) this._bcd.onDerape(momentum);
  }

  // ── CCC: Incendiary ──────────────────────────────────────────────

  onSkid(x, y) {
    if (this.has('CCC')) this._ccc.onSkid(x, y);
  }

  // ── GGG: Flipcoin ────────────────────────────────────────────────

  lockGGGForAttack() {
    if (this.has('GGG')) this._ggg.lockForAttack();
  }

  getGGGMultiplier() {
    if (!this.has('GGG')) return null;
    return this._ggg.getMultiplier();
  }

  applyGGGCreditEffect(px, py) {
    if (this.has('GGG')) this._ggg.applyCreditEffect(px, py);
  }

  // ── AAG: One-Two ────────────────────────────────────────────────

  onDashStarted(baseDamage) {
    if (this.has('AAG')) this._aag.onDashStarted(baseDamage);
  }

  consumeAAGBonus() {
    if (!this.has('AAG')) return 0;
    return this._aag.consumeBonus();
  }

  // ── GGC: Auspice ────────────────────────────────────────────────

  onEnemyKilled() {
    if (this.has('GGC')) this._ggc.onEnemyKilled();
    if (this.has('GGD')) this._ggd.onEnemyKilled();
  }

  getAuspiceDiscount() {
    if (!this.has('GGC')) return 0;
    return this._ggc.getDiscount();
  }

  // ── CCG: Builder ─────────────────────────────────────────────────

  addBuilderCharge() {
    if (this.has('CCG')) this._ccg.addCharge();
  }

  get builderCharges() {
    return this._ccg.charges;
  }

  tryPlaceBuilderWall(player) {
    if (!this.has('CCG')) return false;
    return this._ccg.tryPlace(player);
  }

  // ── Reset ────────────────────────────────────────────────────────

  reset() {
    this._aaa.reset();
    this._aab.reset();
    this._aad.reset();
    this._abc.reset();
    this._acc.reset();
    this._add.reset();
    this._bbb.reset();
    this._bbc.reset();
    this._bcd.reset();
    this._cad.reset();
    this._cbg.reset();
    this._ccb.reset();
    this._ccg.reset();
    this._ccc.reset();
    this._dbb.reset();
    this._ddc.reset();
    this._ddd.reset();
    this._ggg.reset();
    this._ggc.reset();
    this._ggd.reset();
    this._gba.reset();
    this._aag.reset();
  }
}
