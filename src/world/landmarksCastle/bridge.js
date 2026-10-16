// landmarksCastle/bridge.js - the THREE-PART BRIDGE (Трёхчастный мост) in front of the castle portal: three short humped stone bridges (OSM decks w568786528 south, w568786525 south-west, w568786527 east-south-east,
// 4 m wide) fan out from the paved terrace in front of the gate across the restored Voskresensky canal (the moat water, OSM r15750440, belongs to environment).  Pale pink-grey granite fascias with a shallow arch,
// sett carriageways, granite posts + black iron railings (photos refs/summer-garden 111, 176) and the same railing along the two banks and the two small islands (OSM fences w459074433 / 34 / 35 / 37 / 568786516).
// The decks and the terrace are walk boxes; the railings are colliders.  The pedestrian approach footways of the group are replaced by this paving.
import { ROADS, BARRIERS } from '../data/city.js';
import * as L from '../layout.js';
import { pointIn } from './geo.js';

const DECKS = ['w568786528', 'w568786525', 'w568786527'];
const FENCES = ['w459074435', 'w459074437', 'w459074433', 'w459074434', 'w568786516'];
export const TERRACE = [[-743.7, -832.3], [-746.9, -826.2], [-741.1, -824.3], [-731.2, -827.5], [-728.5, -833.6], [-733.6, -835.8]];

export function railPosts(P, M, a, b, o = {}) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.3) return;
  const rot = Math.atan2(dx, dz), h = o.h ?? 1.05, gap = o.gap ?? 2.8, y0 = o.y0 ?? 0, yb = o.yb;
  P.push(a[0], 0, a[1], rot);
  try {
    const n = Math.max(1, Math.round(len / gap));
    for (let k = 0; k <= n; k++) {
      const z = len * k / n, y = yb ? yb(z / len) : y0;
      P.box(M.graniteWarm, -0.17, 0.17, y, y + h, z - 0.17, z + 0.17, 'b'); P.box(M.granite, -0.21, 0.21, y + h, y + h + 0.1, z - 0.21, z + 0.21, 'b');
    }
    const m = Math.max(2, Math.round(len / 0.9));
    const ya = (z) => (yb ? yb(z / len) : y0);
    for (let k = 0; k < m; k++) { const z0 = len * k / m, z1 = len * (k + 1) / m;
      P.cyl(M.iron, [0, ya(z0) + h - 0.12, z0], [0, ya(z1) + h - 0.12, z1], 0.028, 0.028, 5, false);
      P.cyl(M.iron, [0, ya(z0) + 0.3, z0], [0, ya(z1) + 0.3, z1], 0.025, 0.025, 5, false);
    }
    const pk = Math.max(2, Math.round(len / 0.22));
    for (let k = 1; k < pk; k++) { const z = len * k / pk, y = ya(z); P.box(M.iron, -0.012, 0.012, y + 0.3, y + h - 0.12, z - 0.012, z + 0.012, 'tb'); }
  } finally { P.pop(); }
}

export function build(K, M, D, svc) {
  const P = K.P, ph = K.ctx.physics;
  const hump = (t) => 0.14 + 0.22 * (1 - (2 * t - 1) ** 2);
  for (const id of DECKS) {
    const r = ROADS.find((q) => q.id === id); if (!r) continue;
    const a = [r.pts[0], r.pts[1]], b = [r.pts[r.pts.length - 2], r.pts[r.pts.length - 1]];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), rot = Math.atan2(dx, dz), hw = 2.2, N = 8;
    P.push(a[0], 0, a[1], rot);
    try {
      for (let k = 0; k < N; k++) {
        const t0 = k / N, t1 = (k + 1) / N, z0 = len * t0, z1 = len * t1, y0 = hump(t0), y1 = hump(t1);
        P.quad(M.sett, [-hw, y0, z0], [hw, y0, z0], [hw, y1, z1], [-hw, y1, z1], [0, 1, 0], [[0, z0 / 2], [2, z0 / 2], [2, z1 / 2], [0, z1 / 2]]);
        for (const s of [-1, 1]) P.quad(M.marblePink, [s * hw, -1.3, z0], [s * hw, -1.3, z1], [s * hw, y1, z1], [s * hw, y0, z0], [s, 0, 0]);
        P.quad(M.graniteDark, [-hw, -1.2, z0], [hw, -1.2, z0], [hw, -1.2, z1], [-hw, -1.2, z1], [0, -1, 0]);
        const c = [a[0] + dx * (t0 + t1) / 2, a[1] + dz * (t0 + t1) / 2];
        ph.addWalkBox(c[0], c[1], hw * 2, len / N + 0.05, rot, Math.max(y0, y1), -1.3);
      }
    } finally { P.pop(); }
    for (const s of [-1, 1]) {
      const ox = Math.cos(rot) * s * (hw - 0.05) * -1, oz = Math.sin(rot) * s * (hw - 0.05);
      // lateral offset vector of the local +x axis: (cos rot, -sin rot)
      const lx = Math.cos(rot) * s * (hw - 0.17), lz = -Math.sin(rot) * s * (hw - 0.17);
      railPosts(P, M, [a[0] + lx, a[1] + lz], [b[0] + lx, b[1] + lz], { h: 1.05, gap: 2.6, yb: (t) => hump(t) });
      const mid = [(a[0] + b[0]) / 2 + lx, (a[1] + b[1]) / 2 + lz];
      ph.addBox(mid[0], mid[1], len, 0.35, Math.atan2(-dz, dx), 0, 1.3);
      void ox; void oz;
    }
  }
  // the terrace in front of the portal (pink-grey setts), railings on both banks and the islands
  // paving of the terrace: 1.2 m cells that are inside the polygon and clear of every carriageway (the service strips to the bridges stay asphalt: road integrity rules)
  { const cover = K.ctx.services.streets && K.ctx.services.streets.net && K.ctx.services.streets.net.cover;
    const onRoad = (x, z) => (cover ? cover(x, z, {}) >= -0.5 : L.isOnRoad(x, z, 0.1));
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of TERRACE) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const c = 1.2; let cells = 0;
    for (let x = x0; x < x1; x += c) for (let z = z0; z < z1; z += c) {
      const cx = x + c / 2, cz = z + c / 2; if (!pointIn(TERRACE, cx, cz) || onRoad(cx, cz) || [[0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]].some(([a, b]) => onRoad(cx + a * c, cz + b * c))) continue;
      P.quad(M.settPink, [x, 0.07, z], [x + c, 0.07, z], [x + c, 0.07, z + c], [x, 0.07, z + c], [0, 1, 0], [[x / 2, z / 2], [(x + c) / 2, z / 2], [(x + c) / 2, (z + c) / 2], [x / 2, (z + c) / 2]]); cells++;
    }
    svc.terraceCells = cells; }
  const tc = TERRACE.reduce((s, p) => [s[0] + p[0] / TERRACE.length, s[1] + p[1] / TERRACE.length], [0, 0]);
  let n = 0;
  for (const id of FENCES) {
    const f = BARRIERS.find((q) => q.id === id); if (!f) continue;
    for (let i = 0; i + 3 < f.pts.length; i += 2) {
      const a = [f.pts[i], f.pts[i + 1]], b = [f.pts[i + 2], f.pts[i + 3]], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 0.5) continue;
      railPosts(P, M, a, b, { h: 1.0, gap: 2.7, y0: 0.1 });
      ph.addBox((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, len + 0.2, 0.3, Math.atan2(-(b[1] - a[1]), b[0] - a[0]), 0, 1.2); n++;
    }
  }
  svc.bridge = { terrace: tc, decks: DECKS, fenceSegments: n };
}
