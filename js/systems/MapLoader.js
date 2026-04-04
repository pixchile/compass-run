export default class MapLoader {
  constructor() {
    this.storageKey = 'game_maps';
    this.defaultMap = this.createDefaultMap();
  }

  createDefaultMap() {
    return {
      name: 'default',
      version: 3, // Versión 3 con enemigos programados y tiempo límite
      arena: { x: 50, y: 50, w: 1100, h: 700 },
      timeLimit: 300, // 5 minutos por defecto (en segundos)
      lines: [
        // Paredes del borde (4 líneas)
        { start: { x: 50, y: 50 }, end: { x: 1150, y: 50 }, thickness: 10 },
        { start: { x: 1150, y: 50 }, end: { x: 1150, y: 750 }, thickness: 10 },
        { start: { x: 1150, y: 750 }, end: { x: 50, y: 750 }, thickness: 10 },
        { start: { x: 50, y: 750 }, end: { x: 50, y: 50 }, thickness: 10 },
        // Algunas líneas de ejemplo internas
        { start: { x: 300, y: 200 }, end: { x: 500, y: 200 }, thickness: 8 },
        { start: { x: 800, y: 600 }, end: { x: 1000, y: 600 }, thickness: 8 },
        { start: { x: 400, y: 500 }, end: { x: 400, y: 650 }, thickness: 8 },
        { start: { x: 900, y: 150 }, end: { x: 900, y: 350 }, thickness: 8 },
      ],
      enemies: [
        // Enemigos de ejemplo: type, x, y, spawnTime (segundos)
        { type: 'small', x: 300, y: 300, spawnTime: 0 },
        { type: 'medium', x: 800, y: 400, spawnTime: 0 },
        { type: 'big', x: 600, y: 600, spawnTime: 0 },
        { type: 'small', x: 1000, y: 200, spawnTime: 0 },
        { type: 'small', x: 150, y: 650, spawnTime: 0 },
      ],
      spawn: { x: 600, y: 400 },
      createdAt: new Date().toISOString()
    };
  }

  loadMap(mapName) {
    try {
      const maps = this.getAllMaps();
      const map = maps.find(m => m.name === mapName);
      
      if (map) {
        // Convertir mapas antiguos (versión 1 o 2) al nuevo formato
        if (map.version === 1 || map.walls) {
          return this.convertOldMap(map);
        }
        if (map.version === 2) {
          return this.convertV2Map(map);
        }
        return map;
      }
    } catch (error) {
      console.error('Error loading map:', error);
    }
    
    return this.defaultMap;
  }

  convertOldMap(oldMap) {
    console.log('Convirtiendo mapa antiguo (v1) a nuevo formato...');
    const newMap = {
      name: oldMap.name,
      version: 3,
      arena: oldMap.arena,
      timeLimit: 300,
      lines: [],
      enemies: [],
      spawn: oldMap.spawn,
      createdAt: new Date().toISOString()
    };
    
    // Convertir muros rectangulares a líneas
    if (oldMap.walls && oldMap.walls.length > 0) {
      for (const wall of oldMap.walls) {
        newMap.lines.push({
          start: { x: wall.x, y: wall.y },
          end: { x: wall.x + wall.w, y: wall.y + wall.h },
          thickness: Math.min(wall.w, wall.h)
        });
      }
    }
    
    return newMap;
  }

  convertV2Map(oldMap) {
    console.log('Convirtiendo mapa antiguo (v2) a nuevo formato...');
    return {
      name: oldMap.name,
      version: 3,
      arena: oldMap.arena,
      timeLimit: 300,
      lines: oldMap.lines || [],
      enemies: [],
      spawn: oldMap.spawn,
      createdAt: new Date().toISOString()
    };
  }

  saveMap(mapData) {
    try {
      const maps = this.getAllMaps();
      const existingIndex = maps.findIndex(m => m.name === mapData.name);
      
      if (existingIndex !== -1) {
        maps[existingIndex] = mapData;
      } else {
        maps.push(mapData);
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(maps));
      console.log('Mapa guardado:', mapData.name);
      return true;
    } catch (error) {
      console.error('Error saving map:', error);
      return false;
    }
  }

  getAllMaps() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading maps:', error);
    }
    return [this.defaultMap];
  }

  listMaps() {
    return this.getAllMaps().map(map => ({
      name: map.name,
      lines: map.lines?.length || 0,
      enemies: map.enemies?.length || 0,
      timeLimit: map.timeLimit || 300,
      createdAt: map.createdAt
    }));
  }

  deleteMap(mapName) {
    if (mapName === 'default') return false;
    
    try {
      let maps = this.getAllMaps();
      maps = maps.filter(m => m.name !== mapName);
      localStorage.setItem(this.storageKey, JSON.stringify(maps));
      return true;
    } catch (error) {
      console.error('Error deleting map:', error);
      return false;
    }
  }
}