// js/systems/effects/CCG_Builder.js
// C+C+G: 2x wall damage. Breaking a wall gives +1 charge (cap 10).
// Shift while stationary spends 1 charge to place a 200px wall.

export default class CCGEffect {
  constructor(scene) {
    this.scene = scene;
    this.charges = 0;
    this.maxCharges = 10;
    this._placedWalls = [];
  }

  getPlacementCost() { return 1; }

  addCharge() {
    if (this.charges < this.maxCharges) this.charges++;
  }

  tryPlace(player) {
    if (this.charges < this.getPlacementCost()) return false;

    const halfLen = 100;
    const perpX = Math.cos(player.facing + Math.PI / 2);
    const perpY = Math.sin(player.facing + Math.PI / 2);

    const line = {
      start: { x: player.px + perpX * halfLen, y: player.py + perpY * halfLen },
      end: { x: player.px - perpX * halfLen, y: player.py - perpY * halfLen },
      hp: 200,
      _origHp: 200,
      _placed: true,
      thickness: 4,
      color: '#44cc88',
      type: 'wall_placed',
    };

    const lines = this.scene?.currentMap?.lines;
    if (lines) lines.push(line);
    this._placedWalls.push(line);
    this.charges--;
    return true;
  }

  reset() {
    this.charges = 0;
    // Remove placed walls from the map
    const lines = this.scene?.currentMap?.lines;
    if (lines) {
      for (const wall of this._placedWalls) {
        const idx = lines.indexOf(wall);
        if (idx !== -1) lines.splice(idx, 1);
      }
    }
    this._placedWalls = [];
  }
}
