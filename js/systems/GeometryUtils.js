export function closestPointOnLine(p, a, b, out) {
    if (!a || !b) {
        out.x = p.x; out.y = p.y;
        return;
    }
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;
    
    if (len2 === 0) {
        out.x = a.x; out.y = a.y;
        return;
    }
    
    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    
    out.x = a.x + t * abx;
    out.y = a.y + t * aby;
}