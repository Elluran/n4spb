// Helpers for the water-context bakes (bake-krestovsky-context.mjs, bake-islands2-context.mjs). environment/waterways.js collects the OUTER rings only and ignores holes, so an OSM water
// polygon with islands in it (the Malaya Nevka round the two islets of the Krestovsky shore, the Srednyaya Nevka round Yelagin, the Krestovka) would flood every island. `splitHoles` cuts such a
// polygon along two straight slits per hole into SIMPLE rings that share the slits: the generator reads coinciding edges of two rings of one waterway as an open join (no quay) and keeps the
// outline of the hole as a bank (the island shore).
import { ringArea, simplify } from './osm-lib.mjs';
const open = (r) => (r.length > 1 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] ? r.slice(0, -1) : r.slice());
const cross = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
const crossesRing = (a, b, ring, skip = []) => { for (let i = 0; i < ring.length; i++) { const c = ring[i], d = ring[(i + 1) % ring.length]; if (skip.includes(c) || skip.includes(d)) continue; if (cross(a, b, c, d)) return true; } return false; };
const segDist = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz; let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dz - p[1]); };
// a slit must keep >= CLEAR m away from every other vertex of both rings: a slit that runs along a bank edge would read as the join of two waters there (no bank), and the generator would lose that shore
const CLEAR = 3;
const clearOf = (a, b, ring, skip) => ring.every((q) => skip.includes(q) || segDist(q, a, b) >= CLEAR);
/** Remove back-tracking spikes / thin wedges (a vertex where the ring turns back along its own previous edge, within 3 m: OSM relations whose outer ways meet at a mouth line leave such a tip, e.g. the Krestovka at (-3746, -4523)):
 *  the spike edge would lie on another ring's edge and read as a shore there. Closed ring in, closed ring out. */
export function dropSpikes(ring) {
  let r = open(ring), changed = true;
  while (changed && r.length > 4) {
    changed = false;
    for (let i = 0; i < r.length; i++) {
      const a = r[(i + r.length - 1) % r.length], b = r[i], c = r[(i + 1) % r.length];
      const dot = (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]);
      if (dot < 0 && segDist(c, a, b) < 3) {      // the tip b goes; c is snapped onto the line a-b (so that a-c lies exactly on the edge it ran along: a join of the two waters, no bank)
        const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((c[0] - a[0]) * dx + (c[1] - a[1]) * dz) / l));
        const ci = (i + 1) % r.length; r[ci] = [a[0] + dx * t, a[1] + dz * t]; r.splice(i, 1); changed = true; break;
      }
    }
  }
  return [...r, r[0]];
}
/** poly = { o: closed ring, h: [closed ring...] } -> list of closed simple rings. */
export function splitHoles(poly) {
  let rings = [open(poly.o)];
  for (const h0 of poly.h) {
    const H = open(h0);
    // the ring that holds this hole
    const ri = rings.findIndex((r) => { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { if ((r[i][1] > H[0][1]) !== (r[j][1] > H[0][1]) && H[0][0] < (r[j][0] - r[i][0]) * (H[0][1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) ins = !ins; } return ins; });
    if (ri < 0) throw Error('hole outside every ring');
    const O = rings[ri], sgn = Math.sign(ringArea([...O, O[0]]));
    const Hd = Math.sign(ringArea([...H, H[0]])) === sgn ? H.slice().reverse() : H.slice();   // the hole runs against the outer ring
    // candidate cuts: for every hole vertex the nearest outer vertex whose slit crosses nothing; take the pair of cuts that are far apart on the hole (~ opposite)
    const cuts = [];
    for (let hi = 0; hi < Hd.length; hi++) {
      let best = null;
      for (let oi = 0; oi < O.length; oi++) { const d = Math.hypot(O[oi][0] - Hd[hi][0], O[oi][1] - Hd[hi][1]); if (best && d >= best.d) continue; if (crossesRing(Hd[hi], O[oi], O, [O[oi]]) || crossesRing(Hd[hi], O[oi], Hd, [Hd[hi]]) || !clearOf(Hd[hi], O[oi], O, [O[oi]]) || !clearOf(Hd[hi], O[oi], Hd, [Hd[hi]])) continue; best = { hi, oi, d }; }
      if (best) cuts.push(best);
    }
    let pick = null;
    for (const c1 of cuts) for (const c2 of cuts) {
      if (c1.oi === c2.oi || c1.hi === c2.hi || cross(Hd[c1.hi], O[c1.oi], Hd[c2.hi], O[c2.oi])) continue;
      const sep = Math.min(Math.abs(c1.hi - c2.hi), Hd.length - Math.abs(c1.hi - c2.hi)); const score = sep * 1000 - (c1.d + c2.d);
      if (!pick || score > pick.score) pick = { c1, c2, score };
    }
    if (!pick) throw Error('no valid slits for a hole');
    const build = (a, b) => {          // ring: outer a.oi -> b.oi (forward), slit to hole b.hi, hole b.hi -> a.hi (forward along Hd), slit back to a.oi
      const r = []; for (let i = a.oi; ; i = (i + 1) % O.length) { r.push(O[i]); if (i === b.oi) break; }
      for (let i = b.hi; ; i = (i + 1) % Hd.length) { r.push(Hd[i]); if (i === a.hi) break; }
      return r;
    };
    let A = build(pick.c1, pick.c2), B = build(pick.c2, pick.c1);
    const tot = Math.abs(ringArea([...O, O[0]])) - Math.abs(ringArea([...Hd, Hd[0]]));
    if (Math.abs(Math.abs(ringArea([...A, A[0]])) + Math.abs(ringArea([...B, B[0]])) - tot) > 1) {   // wrong pairing of the slits: swap the second pair
      A = build(pick.c1, pick.c2); B = build(pick.c2, pick.c1);
      throw Error('hole split area mismatch ' + (Math.abs(ringArea([...A, A[0]])) + Math.abs(ringArea([...B, B[0]]))).toFixed(1) + ' vs ' + tot.toFixed(1));
    }
    rings.splice(ri, 1, A, B);
  }
  return rings.map((r) => dropSpikes([...r, r[0]]));
}
