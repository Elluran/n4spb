// roofdetail.js - what the street sees above the cornice: sheet-iron MANSARDS with gable dormers on ~18 % of the rent houses (inset ring rising 2.3 m, a flat deck on top), brick chimney
// stacks (painted in the facade colour, some with metal caps) in a regular comb along the walls, as in the roofline photos (architecture.md E: "chimneys appear as a regular comb").
//   Mansard validity: the inset rings must keep their orientation / edge directions and shrink (outer) or grow (courtyard holes); otherwise the house keeps its flat deck.
import * as THREE from 'three';
import { hash01 } from '../lib/massing.js';
import { ColorBuilder, miterAt } from './cornice.js';
import { addDeck } from './roofs.js';
import { templateOf, stamp } from './meshes.js';
import { insideBy } from './kit.js';

const RISE = 2.3, OFF0 = 0.15;
const signedArea = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
const insetRing = (pts, d) => pts.map((p, i) => { const M = miterAt(pts, i); return [p[0] - M[0] * d, p[1] - M[1] * d]; });
function validInset(orig, ins, hole) {
  const A0 = Math.abs(signedArea(orig)), A1 = Math.abs(signedArea(ins));
  if (!hole && (A1 > A0 * 0.97 || A1 < A0 * 0.3)) return false;
  if (hole && (A1 < A0 || A1 > A0 * 6)) return false;
  if (Math.sign(signedArea(orig)) !== Math.sign(signedArea(ins))) return false;
  for (let i = 0; i < orig.length; i++) {
    const j = (i + 1) % orig.length;
    const d0x = orig[j][0] - orig[i][0], d0z = orig[j][1] - orig[i][1], d1x = ins[j][0] - ins[i][0], d1z = ins[j][1] - ins[i][1];
    const l0 = Math.hypot(d0x, d0z) || 1, l1 = Math.hypot(d1x, d1z) || 1;
    if (l0 < 2.2) continue;                                   // the micro edges of rounded corners may flip: only the long edges must keep their direction
    if ((d0x * d1x + d0z * d1z) / (l0 * l1) < 0.95) return false;
  }
  return true;
}

function dormerGeo() {
  const cb = new ColorBuilder();
  const W = 0.72, D = 1.1, h = 1.4, rh = 0.55;
  const trim = new THREE.Color('#ffffff'), roof = new THREE.Color('#5d6165'), glass = new THREE.Color('#2e3d4d'), frame = new THREE.Color('#f2efe6');
  const P = (x, y, z) => [x, y, z];
  // front wall (z = 0), gable, glass
  cb.quad([P(-W, 0, 0), P(W, 0, 0), P(W, h, 0), P(-W, h, 0)], [0, 0, 1], trim);
  cb.tri(P(-W, h, 0), P(W, h, 0), P(0, h + rh, 0), [0, 0, 1], trim);
  cb.quad([P(-0.42, 0.4, 0.02), P(0.42, 0.4, 0.02), P(0.42, 1.25, 0.02), P(-0.42, 1.25, 0.02)], [0, 0, 1], frame);
  cb.quad([P(-0.36, 0.46, 0.04), P(0.36, 0.46, 0.04), P(0.36, 1.19, 0.04), P(-0.36, 1.19, 0.04)], [0, 0, 1], glass);
  // side walls (+ gable triangles)
  for (const sx of [-1, 1]) { cb.quad([P(sx * W, 0, 0), P(sx * W, 0, -D), P(sx * W, h, -D), P(sx * W, h, 0)], [sx, 0, 0], trim); cb.tri(P(sx * W, h, 0), P(sx * W, h, -D), P(sx * W, h + rh * 0.2, -D), [sx, 0, 0], trim); }
  // roof: two slopes to the ridge, overhanging the front a little
  const rn = Math.hypot(rh, W); const nx = rh / rn, ny = W / rn;
  cb.quad([P(-W - 0.12, h - 0.06, 0.14), P(0, h + rh, 0.14), P(0, h + rh * 0.2, -D), P(-W - 0.12, h - 0.06, -D)], [-nx, ny, 0], roof);
  cb.quad([P(W + 0.12, h - 0.06, 0.14), P(0, h + rh, 0.14), P(0, h + rh * 0.2, -D), P(W + 0.12, h - 0.06, -D)], [nx, ny, 0], roof);
  return cb.build();
}
function chimneyGeo() {
  const cb = new ColorBuilder();
  const w = new THREE.Color('#ffffff'), dark = new THREE.Color('#55595d');
  cb.boxLite([0, 0, -0.475], 1, 0, 0, 1, 0.75, 1.55, 0.95, w, false);
  cb.boxLite([0, 1.55, -0.6], 1, 0, 0, 1, 1.0, 0.12, 1.2, dark, false);
  return cb.build();
}

export function buildRoofDetail(ctx, { M, info }) {
  const dormerT = templateOf(dormerGeo()), chimT = templateOf(chimneyGeo());
  const dormers = { add: (it) => stamp(M.fine(it.x, it.z), dormerT, it) }, chimneys = { add: (it) => stamp(M.fine(it.x, it.z), chimT, it) };
  let nMansard = 0, nDormer = 0, nChim = 0, tris = 0;
  for (const rec of info) {
    const { b, st } = rec;
    if (b.minH > 0.5 || st.deckY == null) continue;
    const nearPlay = ctx.L.inPlay(st.ob.cx, st.ob.cz, -30);
    let deckY = st.deckY;
    // ---- mansard
    if (st.mansard && nearPlay) {
      let OFF1 = 1.7, base = null;
      for (const off of st.knownMansard ? [1.7, 1.2, 0.8] : [1.7]) { OFF1 = off; base = rec.rings.map((r) => ({ r, ins: insetRing(r.pts, off) })); if (base.every(({ r, ins }) => validInset(r.pts, ins, r.hole))) break; base = null; }
      if (base) {
        const hex = st.roofHex, B = M.roof(st.ob.cx, st.ob.cz); B.cur.set(hex);
        for (const { r } of base) {
          const n = r.pts.length, lo = insetRing(r.pts, OFF0), hi = insetRing(r.pts, OFF1);
          for (let i = 0; i < n; i++) {
            const j = (i + 1) % n, a0 = lo[i], b0 = lo[j], a1 = hi[i], b1 = hi[j];
            const len = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]); if (len < 0.2) continue;
            const dx = (b0[0] - a0[0]) / len, dz = (b0[1] - a0[1]) / len, nx = dz, nz = -dx;
            B.quad3([a0[0], deckY, a0[1]], [b0[0], deckY, b0[1]], [b1[0], deckY + RISE, b1[1]], [a1[0], deckY + RISE, a1[1]], [[0, 0], [len / 1.2, 0], [len / 1.2, 1.9], [0, 1.9]], [nx, 0.6, nz]);
          }
        }
        const top = { o: [], h: [] };
        base.forEach(({ r, ins }) => { const flat = []; for (const p of ins) flat.push(p[0], p[1]); if (!r.hole) top.o = flat; else top.h.push(flat); });
        addDeck(B, top, deckY + RISE);
        st.deckTop = deckY + RISE; st.mansardOn = true; nMansard++; tris += 40;
        // dormers over the street walls
        for (const w of rec.walls) {
          if (!w.street || w.hole || w.gate || w.len < 5) continue;
          for (let k = 1; k < w.N - 1; k += 2) {
            const s = (k + 0.5) * w.bw;
            dormers.add({ x: w.a[0] + w.dx * s - w.nx * 0.5, y: deckY + 0.02, z: w.a[1] + w.dz * s - w.nz * 0.5, rotY: Math.atan2(w.nx, w.nz), color: '#' + st.trim.getHexString() }); nDormer++;
          }
        }
        deckY = deckY + RISE;
      }
    }
    // ---- chimney comb: stacks 3 m behind the walls, ~7.5 m apart
    if (nearPlay && st.arch !== 12) {
      let count = 0;
      const poly = b.polys[0], outer = rec.rings.find((r) => !r.hole).pts, holes = rec.rings.filter((r) => r.hole).map((r) => r.pts);
      const stackCol = hash01(b.id + 'ch') < 0.65 ? '#' + st.color.clone().lerp(new THREE.Color('#ffffff'), 0.25).getHexString() : '#a65a44';
      for (const ring of rec.rings) {
        for (const e of ring.edges) {
          if (e.len < 8 || !e.street || ring.hole || !e.pieces.some((p) => p.yLow < 0.2)) continue;
          const n = Math.floor(e.len / 9);
          for (let k = 0; k < n && count < 10; k++) {
            if (hash01(b.id + ':ck' + e.i + ':' + k) > 0.6) continue;
            const t = (k + 0.5 + (hash01(b.id + ':cj' + e.i + k) - 0.5) * 0.5) / n * e.len, inset = (st.mansardOn ? 2.6 : 1.5) + hash01(b.id + ':ci' + e.i + k) * 0.8;
            const x = e.a[0] + e.dx * t - e.nx * inset, z = e.a[1] + e.dz * t - e.nz * inset;
            if (!insideBy(outer, holes, x, z, 1.8)) continue;
            chimneys.add({ x, y: deckY, z, rotY: Math.atan2(e.dx, e.dz) + (hash01(b.id + e.i + k) < 0.5 ? 0 : Math.PI / 2), color: stackCol, sx: 1, sy: 1.0 + hash01(b.id + ':cs' + e.i + k) * 0.6 }); count++; nChim++;
          }
        }
      }
    }
  }
  tris += nDormer * 26 + nChim * 16;
  return { triangles: tris, mansards: nMansard, dormers: nDormer, chimneys: nChim };
}
