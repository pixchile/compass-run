export class AddWallCommand {
  constructor(mapData, wall) { this.mapData = mapData; this.wall = wall; }
  execute() { if (!this.mapData.walls.find(w => w.id === this.wall.id)) this.mapData.walls.push(this.wall); }
  undo() { this.mapData.removeWall(this.wall.id); }
}

export class RemoveWallCommand {
  constructor(mapData, wall) { this.mapData = mapData; this.wall = wall; }
  execute() { this.mapData.removeWall(this.wall.id); }
  undo() { this.mapData.walls.push(this.wall); }
}

export class MoveWallCommand {
  constructor(mapData, wall, oldStart, oldEnd, newStart, newEnd) {
    this.mapData = mapData; this.wallId = wall.id; 
    this.oldStart = oldStart; this.oldEnd = oldEnd;
    this.newStart = newStart; this.newEnd = newEnd;
  }
  execute() { this.mapData.moveWall(this.wallId, this.newStart, this.newEnd); }
  undo() { this.mapData.moveWall(this.wallId, this.oldStart, this.oldEnd); }
}

export class AddZoneCommand {
  constructor(mapData, zone) { this.mapData = mapData; this.zone = zone; }
  execute() { if (!this.mapData.zones.find(z => z.id === this.zone.id)) this.mapData.zones.push(this.zone); }
  undo() { this.mapData.removeZone(this.zone.id); }
}

export class RemoveZoneCommand {
  constructor(mapData, zone) { this.mapData = mapData; this.zone = zone; }
  execute() { this.mapData.removeZone(this.zone.id); }
  undo() { this.mapData.zones.push(this.zone); }
}

export class MoveZoneCommand {
  constructor(mapData, zoneId, oldVertices, newVertices) {
    this.mapData = mapData; this.zoneId = zoneId;
    this.oldVertices = oldVertices; this.newVertices = newVertices;
  }
  execute() { 
      const z = this.mapData.zones.find(z => z.id === this.zoneId);
      if (z) z.geometry.vertices = this.newVertices.map(v => ({...v}));
      this.mapData._updateSelectionBounds();
  }
  undo() {
      const z = this.mapData.zones.find(z => z.id === this.zoneId);
      if (z) z.geometry.vertices = this.oldVertices.map(v => ({...v}));
      this.mapData._updateSelectionBounds();
  }
}

export class CompositeCommand {
  constructor(commands) { this.commands = commands; }
  execute() { this.commands.forEach(cmd => cmd.execute()); }
  undo() { for (let i = this.commands.length - 1; i >= 0; i--) this.commands[i].undo(); }
}

export default class MapHistory {
  constructor() {
    this._stack = [];
    this._pointer = -1;
  }

  execute(command) {
    command.execute();
    this._stack.splice(this._pointer + 1);
    this._stack.push(command);
    this._pointer++;
  }

  undo() {
    if (!this.canUndo()) return;
    this._stack[this._pointer].undo();
    this._pointer--;
  }

  redo() {
    if (!this.canRedo()) return;
    this._pointer++;
    this._stack[this._pointer].execute();
  }

  canUndo() { return this._pointer >= 0; }
  canRedo() { return this._pointer < this._stack.length - 1; }
}