export default class JSONMapLoader {
  async loadMapFromURL(url) {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const json = await resp.json();
    return {
      name: json.name || url.split('/').pop(),
      version: json.version || 5,
      arena: json.arena || { x: 55, y: 58, w: 4000, h: 4000 },
      lines: json.lines || [],
      zones: json.zones || [],
      triggers: json.triggers || [],
      objects: json.objects || [],
      background: json.background || null
    };
  }
}
