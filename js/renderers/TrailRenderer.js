export default class TrailRenderer {
  render(graphics, player) {
    for (let i = 0; i < player.trail.length; i++) {
      const t = player.trail[i];
      const pct = i / player.trail.length;
      const tc = t.dash ? 0xffffff : (t.lv === 1 ? 0x44aaff : t.lv === 2 ? 0xffaa44 : 0xff4488);
      graphics.fillStyle(tc, pct * (t.dash ? 0.55 : 0.32));
      graphics.fillCircle(t.x, t.y, 3 + pct * (t.dash ? 13 : 7));
    }
  }
}