// traffic/wireindex.js - spatial index of the contact-wire pair centre lines of streets.wires.pairs (pure data, no three.js: also used by the node simulation test).
//   buildWireIndex(pairs).query(x, z, tx, tz, maxD, minDot) -> { x, y, z, tx, tz, d } | null
//   the nearest point (in plan) of a wire pair whose direction is within acos(minDot) of (tx, tz) (either sense), y interpolated along the segment: the trolleybus poles end there;
//   the simulation marks the lanes that run under the wires (trolleybuses only drive on those).
export function buildWireIndex(pairs) {
  const CS = 8, grid = new Map(), segs = [];
  const reg = (i, x0, z0, x1, z1) => {
    const c0 = Math.floor(Math.min(x0, x1) / CS), c1 = Math.floor(Math.max(x0, x1) / CS), r0 = Math.floor(Math.min(z0, z1) / CS), r1 = Math.floor(Math.max(z0, z1) / CS);
    for (let a = c0; a <= c1; a++) for (let b = r0; b <= r1; b++) { const k = a * 65536 + b; (grid.get(k) || grid.set(k, []).get(k)).push(i); }
  };
  for (const p of pairs || []) {
    const pts = p.pts;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay, az] = pts[i], [bx, by, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
      if (len < 0.05) continue;
      segs.push({ ax, ay, az, bx, by, bz, tx: dx / len, tz: dz / len, len });
      reg(segs.length - 1, ax, az, bx, bz);
    }
  }
  function query(x, z, tx, tz, maxD = 3, minDot = 0.8) {
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS), r = Math.ceil(maxD / CS);
    let best = null, bd = maxD;
    for (let a = cx - r; a <= cx + r; a++) for (let b = cz - r; b <= cz + r; b++) {
      const list = grid.get(a * 65536 + b); if (!list) continue;
      for (const i of list) {
        const s = segs[i];
        if (Math.abs(s.tx * tx + s.tz * tz) < minDot) continue;
        let u = ((x - s.ax) * s.tx + (z - s.az) * s.tz) / s.len; u = u < 0 ? 0 : u > 1 ? 1 : u;
        const px = s.ax + (s.bx - s.ax) * u, pz = s.az + (s.bz - s.az) * u, d = Math.hypot(px - x, pz - z);
        if (d < bd) { bd = d; best = { x: px, y: s.ay + (s.by - s.ay) * u, z: pz, tx: s.tx, tz: s.tz, d }; }
      }
    }
    return best;
  }
  return { query, count: segs.length };
}
