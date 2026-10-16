// landmarksC/closure.js - closes the quay beside the Anichkov Bridge deck.  environment/quay.js leaves the coping, the parapet and the collider OPEN wherever a bank piece lies inside the
// deck polygon r5537267 (+1.2 m); the deck itself only covers |v| < 18.95, so a few metres of quay at each of the four corners would be missing (and a hole in the collision: nobody must
// fall into the river).  This file re-derives exactly the same bank pieces (frames() is copied from quay.js) and, for every piece the environment skipped, draws what it would have drawn
// (a grey granite coping, pale pink-grey granite posts every ~3.2 m and lattice panels) and adds the same solid collider (1.6 m thick, y -6 ... 1.25) outside the deck (|v| > 18.9).
// Also exports bankU(side, v): the u of the real bank line (east side = +1) from the OSM bank polylines, used for the railing stubs and by boats.js.
import * as L from '../layout.js';
import { EXTENT } from '../data/city.js';
import { riverBanks, deckPoly } from '../environment/river.js';
import { pointInRing, distToRing } from '../environment/util.js';
import { toUV, FACE, EDGE } from './frame.js';

const Y_TOP = 0.17, COP_BOT = -0.34, COP_OUT = 0.10, COP_IN = 0.62;
const NEAR_M = 150;
const near = (x, z) => x > EXTENT.x0 - NEAR_M && x < EXTENT.x1 + NEAR_M && z > EXTENT.z0 - NEAR_M && z < EXTENT.z1 + NEAR_M;

/** copy of environment/quay.js frames(): the densified bank with per-piece tangent / landward normal */
function frames(bank) {
  const pts = [];
  for (let i = 0; i < bank.pts.length; i++) {
    const p = bank.pts[i];
    if (i === 0) { pts.push([p[0], p[1]]); continue; }
    const q = bank.pts[i - 1], l = Math.hypot(p[0] - q[0], p[1] - q[1]), isNear = near(p[0], p[1]) || near(q[0], q[1]), max = isNear ? 9 : 120, n = Math.max(1, Math.ceil(l / max));
    for (let k = 1; k <= n; k++) pts.push([q[0] + (p[0] - q[0]) * k / n, q[1] + (p[1] - q[1]) * k / n]);
  }
  const seg = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dz) || 1e-6, tx = dx / l, tz = dz / l;
    seg.push({ tx, tz, nx: -tz * bank.landSide, nz: tx * bank.landSide, len: l });
  }
  return { pts, seg };
}

let _lines = null;
/** the east (+1) and west (-1) bank lines near the bridge as [[v, u]...] sorted by v (local frame) */
function bankLines() {
  if (_lines) return _lines;
  const out = { 1: [], '-1': [] };
  try {
    for (const b of riverBanks()) for (const p of b.pts) {
      const q = toUV(p[0], p[1]); if (Math.abs(q.v) > 90 || Math.abs(q.u) > 45) continue;
      out[q.u > 0 ? 1 : -1].push([q.v, q.u]);
    }
  } catch (e) { /* no river data: fall back to the nominal line */ }
  for (const k of [1, -1]) { out[k].sort((a, b) => a[0] - b[0]); if (out[k].length < 2) out[k] = [[-60, 27.3 * k], [60, 27.3 * k]]; }
  return (_lines = out);
}
/** u of the bank on side (+1 east / -1 west) at cross coordinate v (linear between the OSM vertices, extended beyond) */
export function bankU(side, v) {
  const a = bankLines()[side];
  if (v <= a[0][0]) { const b = a[1], s = (b[1] - a[0][1]) / (b[0] - a[0][0] || 1); return a[0][1] + s * (v - a[0][0]); }
  for (let i = 0; i + 1 < a.length; i++) if (v <= a[i + 1][0]) { const t = (v - a[i][0]) / (a[i + 1][0] - a[i][0] || 1); return a[i][1] + (a[i + 1][1] - a[i][1]) * t; }
  const n = a.length, s = (a[n - 1][1] - a[n - 2][1]) / (a[n - 1][0] - a[n - 2][0] || 1); return a[n - 1][1] + s * (v - a[n - 1][0]);
}

export function buildClosure(K, M, ctx) {
  const P = K.P, T = ctx.mat.toon, pal = ctx.palette || {};
  const deck = deckPoly();
  const info = { pieces: 0, colliders: 0, posts: 0, panels: 0 };
  if (!deck) return info;
  const inDeck = (x, z) => pointInRing(x, z, deck) || distToRing(x, z, deck) < 1.2;
  const coping = T(pal.graniteCoping || '#a49a95', { paint: 0.05, name: 'lmC-quay-coping' });
  const post = T('#a89a96', { paint: 0.05, name: 'lmC-quay-post' }), postCap = T('#b4a8a4', { paint: 0.05, name: 'lmC-quay-post-cap' });
  const lattice = ctx.tex.draw(512, 168, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#202428'; g.strokeStyle = '#202428'; g.lineCap = 'round';
    g.fillRect(0, 6, w, 10); g.fillRect(0, h - 22, w, 12); g.fillRect(0, 30, w, 4); g.fillRect(0, h - 40, w, 4); g.lineWidth = 4;
    for (let x = -h; x < w + h; x += 30) { g.beginPath(); g.moveTo(x, 36); g.lineTo(x + (h - 78), h - 42); g.stroke(); g.beginPath(); g.moveTo(x + (h - 78), 36); g.lineTo(x, h - 42); g.stroke(); }
    for (let x = 10; x < w; x += 98) g.fillRect(x, 6, 6, h - 12);
  }, { key: 'lmC-quay-lattice', repeat: [1, 1], anisotropy: 4 });
  const rail = T('#ffffff', { map: lattice, alphaTest: 0.5, side: 'double', paint: 0.02, name: 'lmC-quay-lattice' });
  K.decalMats.add(rail);

  for (const bank of riverBanks()) {
    const { pts, seg } = frames(bank);
    const flag = seg.map((sg, i) => inDeck((pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2) || (inDeck(pts[i][0], pts[i][1]) && inDeck(pts[i + 1][0], pts[i + 1][1])));
    for (let i = 0; i < seg.length; i++) {
      if (!flag[i]) continue;
      const a = pts[i], b = pts[i + 1], sg = seg[i], qa = toUV(a[0], a[1]), qb = toUV(b[0], b[1]), c = FACE + 0.35;
      // sub-intervals (in t) where |v| > c
      const iv = [];
      const solve = (v0, v1, sgn) => { // v*sgn > c
        const f0 = v0 * sgn - c, f1 = v1 * sgn - c;
        if (f0 <= 0 && f1 <= 0) return null;
        if (f0 > 0 && f1 > 0) return [0, 1];
        const t = f0 / (f0 - f1); return f0 > 0 ? [0, t] : [t, 1];
      };
      for (const sgn of [1, -1]) { const r = solve(qa.v, qb.v, sgn); if (r && r[1] - r[0] > 0.02) iv.push(r); }
      for (const [t0, t1] of iv) {
        const A = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], B = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
        const len = Math.hypot(B[0] - A[0], B[1] - A[1]); if (len < 0.4) continue;
        // frame: local +x along the tangent (flipped on the right-hand bank so that +z is always landward), the wall plane at z = 0
        const ls = bank.landSide, tx = sg.tx * ls, tz = sg.tz * ls, mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2, rot = Math.atan2(-tz, tx);
        ctx.physics.addBox(mx - sg.nx * 0.4, mz - sg.nz * 0.4, len + 0.9, 1.6, Math.atan2(-sg.tz, sg.tx), -6, 1.25); info.colliders++;
        P.push(mx, 0, mz, rot);
        P.box(coping, -len / 2 - 0.05, len / 2 + 0.05, COP_BOT, Y_TOP, -COP_OUT, COP_IN, 'b', 1);
        const n = Math.max(1, Math.ceil(len / 3.2));
        for (let k = 0; k <= n; k++) {
          const x = -len / 2 + len * k / n;
          P.box(post, x - 0.225, x + 0.225, Y_TOP - 0.03, Y_TOP + 0.97, 0.26 - 0.225, 0.26 + 0.225, 'b', 1);
          P.box(postCap, x - 0.26, x + 0.26, Y_TOP + 0.97, Y_TOP + 1.04, 0.26 - 0.26, 0.26 + 0.26, 'b', 1);
          P.cyl(postCap, [x, Y_TOP + 1.04, 0.26], [x, Y_TOP + 1.17, 0.26], 0.3, 0.12, 4, true);
          info.posts++;
          if (k < n) { const x1 = -len / 2 + len * (k + 1) / n; P.quad(rail, [x + 0.25, Y_TOP + 0.12, 0.26], [x1 - 0.25, Y_TOP + 0.12, 0.26], [x1 - 0.25, Y_TOP + 1.0, 0.26], [x + 0.25, Y_TOP + 1.0, 0.26], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]); info.panels++; }
        }
        P.pop(); info.pieces++;
      }
    }
  }
  return info;
}
void L; void EDGE;
