// landmarksTauride/paths-draped.js - THE ALLEYS OF THE TAURIDE GARDEN (docs/TAURIDE-REMAKE.md, phase T3): the 112 mapped ways (data/paths.js: main 3.5-4.5 m / side 2.4 m / trail 1.4 m / steps) as ribbons DRAPED on the terrain
// mesh, in pink-brown gravel (T7: #bf9884 .. #b58c78, the user's photos), darker earth for the trails, lighter grey for the paving stones and the concrete plates, and the 6 STEPS ways as real stairs.
//   planPaths(paths, ground)   PURE and DETERMINISTIC: { ribbons, steps, ways, stats }. `ground` = { meshHeight (the height of the PLANNED terrain mesh, terrain-mesh.js makeMeshHeight), gh (gardenHeight) }.
//   buildPaths(ctx, parent, plan, noise)   the two meshes (ribbons, steps) and the ribbon material.
// RIBBONS: one mesh, one draw. Each way is smoothed (one pass of corner cutting: the OSM polyline is a few vertices per alley; the ends and every vertex that another way shares are PINNED, so the joins stay where the
//   data has them), cut into rows of three vertices (left edge, centre, right edge; five where the terrain curves across the ribbon: the extra vertices keep it on a crest) at a spacing that adapts to the terrain (a row is added wherever the chord of the ribbon would dip more
//   than 1.2 cm under the mesh, at most 8 m and at least 1 m), and DRAPED: every vertex is the height of the planned terrain mesh at its own (x, z) + 0.03 m (+ a few mm per class: main over side over trail, so a join has a
//   deterministic winner). The ribbon is wider than the way by PAD (0.28 m each side): the SHADER cuts the ragged edge (a noise of the world position, +-0.17 m, no texture) and paints three tonal bands (a darker worn
//   centre line, lighter edges) that fade out within 2.5 m of a junction, so two ribbons that overlap there show the same colour (nothing darkens). The width varies along the way by +-8 % (a 1-D noise of the arc length,
//   settling to the nominal width at the ends). A JUNCTION (a vertex that two or more ways share) gets a disc of 8 triangles under the ends, in the colour of its widest way, so that a bend or a Y leaves no wedge.
//   No kerbs on the ribbons: kerbs are only at the stairs and the bridges. The 8 BRIDGE ways are NOT drawn here: the decks are bridges.js (T4b).
//   T4b (the bank-zone pass): a row has five vertices across only where IT needs them (the T3 rule made a whole way five wide when one of its rows did: 30 of 106 ways, 8,560 of 13,768 triangles), two rows of different
//   width are zipped, and a triangle that would fold over (a sharp bend of a wide ribbon at a way end: the 2 .. 4 slivers the T4a log counted) is dropped: the neighbouring triangles overlap there anyway.
// STAIRS (the steps ways): the treads and risers follow the terrain: n = round(drop / 0.15) steps between the two ends (at least 2; the ends are the height of the mesh + the ribbon offset), the tread tops equal steps of the
//   drop (never under the mesh), the risers reach down to the mesh, a kerb (0.2 m wide, the tread + 0.16 m) on both sides. A stair at a bridge head (the way ends on a bridge way) rises from the ground at its foot to the DECK
//   HEAD (`ground.deckAt(x, z)`, the bridge kit's walking profile, T4b: the wooden bridge No.1 stands 0.6 m above the lawn at its heads, data/bridge-design.js; the foot of w420650661 is on the lawn and its head on the bank
//   foot, so the stair stands on a plinth over the bank); without a deck function the stair rises the tag's count of risers (4 x 0.15).
import * as THREE from 'three';
import { registerLOD } from '../../core/spatial.js';
import { FAR_FOG } from '../environment/farconf.js';

export const PATHS_DRAPED = Object.freeze({
  offset: 0.03,                  // m above the terrain mesh (the streets' footways are at 0.04: environment ground +2 polygon offset, ribbons -1.4)
  classBias: { main: 0.004, side: 0.002, trail: 0.0, steps: 0.0 },
  pad: 0.28,                     // m: the geometric ribbon is wider than the way by this much on each side (the shader cuts the ragged edge inside it)
  rag: 0.17,                     // m: the amplitude of the ragged edge
  stepMax: 8, stepMin: 1,        // m: the row spacing
  chord: 0.014,                  // m: a row is added where the chord of the ribbon is more than this off the mesh (under it on a crest, over it in a hollow)
  cut: 0.25, cutMax: 4,          // corner cutting: the ratio of the adjacent segment and its cap in metres
  widthVar: 0.08,                // +-: the width variation along a way
  endFade: 2.5,                  // m: the tonal bands fade out this close to a junction
  riser: 0.15, kerbW: 0.2, kerbH: 0.16,       // (T4b: the rise of a bridge-head stair comes from the deck: ground.deckAt; bridgeRise is gone)
  discSegments: 8,
  levelStep: 0.0004, levelMax: 4, levelCell: 0.5,   // T8a: two ways of one class that cover the same ground (a way that ends on another, an acute fork) were coplanar and z-fought (diagonal hatching at the west gate): each gets its own LEVEL, +0.4 mm per level (at most 4 = 1.6 mm, under the 2 mm between the classes)
  trianglesMax: 12000, drawsMax: 4,
});
export const PATH_COLORS = Object.freeze({ gravel: '#bf9884', earth: '#917658', paved: '#aaa7a1', wood: '#8a6446', metal: '#6d747c', unknown: '#bf9884' });      // T7: the alleys are a warm PINK-BROWN gravel (the user's photos of the round plaza and the roses bridge), not pale beige
export const STEP_COLORS = Object.freeze({ tread: '#a29d94', riser: '#8d8880', kerb: '#8b8783' });

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function hash1(n, seed) { let h = (Math.imul(n | 0, 374761393) + Math.imul(seed | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function hashId(id) { let h = 2166136261; for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619); return h >>> 0; }
/** smooth 1-D value noise in [-1, 1] */
function noise1(t, seed) { const i = Math.floor(t), f = t - i, s = f * f * (3 - 2 * f); return (hash1(i, seed) * (1 - s) + hash1(i + 1, seed) * s) * 2 - 1; }
const col3 = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

/** one pass of corner cutting on a polyline of [x, z]; vertices with pinned[i] stay (the ends and the shared vertices) */
function smoothLine(pts, pinned, P) {
  const out = [pts[0]], pin = [true];
  for (let i = 1; i + 1 < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const l1 = Math.hypot(a[0] - b[0], a[1] - b[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const cos = ((a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1])) / Math.max(1e-9, l1 * l2);
    if (pinned[i] || cos > 0.985 || l1 < 3 || l2 < 3) { out.push(b); pin.push(!!pinned[i]); continue; }          // pinned, nearly straight, or a short segment: keep
    const k1 = Math.min(P.cut, P.cutMax / l1), k2 = Math.min(P.cut, P.cutMax / l2);
    out.push([b[0] + (a[0] - b[0]) * k1, b[1] + (a[1] - b[1]) * k1], [b[0] + (c[0] - b[0]) * k2, b[1] + (c[1] - b[1]) * k2]); pin.push(false, false);
  }
  out.push(pts[pts.length - 1]); pin.push(true);
  return { pts: out, pinned: pin };
}

/**
 * T8a: the LEVELS of overlapping ways. Two ribbons of ONE class that cover the same ground lie exactly in one plane (the draping gives the same height to both: mesh height + 0.03 + the class bias), and their different tonal
 * bands (the dark centre line, the ragged edge) then fight pixel by pixel: the diagonal hatching on the alley at the west gate, where the south alley ends on the main alley and the two run together for 5 m. A way of a
 * different class is 2 mm above or under, which the depth buffer resolves. Here: the ground is cut into cells of `levelCell` m (the centre of the cell inside a triangle = covered), two ways of the same class that share a
 * cell are neighbours, and the ways are coloured greedily (stubs first: a way whose end lies on another goes UNDER it, then narrow first, then by index: deterministic) so that neighbours never share a level; a level is `levelStep` m of height. Returns { level: Int8Array per way, maxLevel,
 * neighbours (pairs), overflow (ways that needed more than levelMax levels: their tie stays), cells }.
 *   pos / idx / wayOf: the ribbon arrays (wayOf < 0 = a junction disc: not a way), ways: [{ bias, w, stub? }] indexed like wayOf.
 */
export function overlapLevels(pos, idx, wayOf, ways, P = PATHS_DRAPED) {
  const cell = P.levelCell, cells = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2], w = wayOf[a]; if (w < 0) continue;
    const ax = pos[3 * a], az = pos[3 * a + 2], bx = pos[3 * b], bz = pos[3 * b + 2], cx = pos[3 * c], cz = pos[3 * c + 2];
    const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-12) continue;
    const i0 = Math.floor(Math.min(ax, bx, cx) / cell), i1 = Math.floor(Math.max(ax, bx, cx) / cell), j0 = Math.floor(Math.min(az, bz, cz) / cell), j1 = Math.floor(Math.max(az, bz, cz) / cell);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const x = (i + 0.5) * cell, z = (j + 0.5) * cell;
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
      if (l1 < 0 || l2 < 0 || 1 - l1 - l2 < 0) continue;
      const k = i * 262144 + j; let set = cells.get(k); if (!set) cells.set(k, (set = new Set())); set.add(w);
    }
  }
  const adj = ways.map(() => new Set());
  for (const set of cells.values()) {
    if (set.size < 2) continue;
    const arr = [...set];
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) if (ways[arr[i]].bias === ways[arr[j]].bias) { adj[arr[i]].add(arr[j]); adj[arr[j]].add(arr[i]); }
  }
  const order = ways.map((_, i) => i).sort((p, q) => ((ways[q].stub ? 1 : 0) - (ways[p].stub ? 1 : 0)) || (ways[p].w - ways[q].w) || (p - q));        // a way that ends on another (a stub) first = lowest: the through way lies over its end
  const level = new Int8Array(ways.length), done = new Uint8Array(ways.length);
  let maxLevel = 0, overflow = 0;
  for (const w of order) {
    const used = new Set(); for (const n of adj[w]) if (done[n]) used.add(level[n]);
    let l = 0; while (used.has(l)) l++;
    if (l > P.levelMax) { overflow++; l = P.levelMax; }
    level[w] = l; done[w] = 1; maxLevel = Math.max(maxLevel, l);
  }
  return { level, maxLevel, neighbours: adj.reduce((s, a) => s + a.size, 0) / 2, overflow, cells: cells.size };
}

/**
 * paths: [{ id, hw, cls, w, surfaceClass, steps?, pts: [x, z, ...] }] (data/paths.js PATHS), ground: { meshHeight(x, z) -> number | null, gh(x, z) -> number | null }
 * -> { ribbons: { pos, nrm, col, path (vec3: across, end fade, geometric half width), idx, wayOf }, steps: { pos, nrm, col, idx }, ways: [{ id, cls, surfaceClass, w, rows, length, from, to }], junctions, stats }
 */
export function planPaths(paths, ground, P = PATHS_DRAPED) {
  const t0 = Date.now();
  const H = (x, z) => { const m = ground.meshHeight(x, z); return m !== null && m !== undefined ? m : (ground.gh(x, z) ?? 0); };
  const keyOf = (x, z) => Math.round(x * 20) + ',' + Math.round(z * 20);
  const flat = (a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };
  const ways = paths.filter((p) => p.cls !== 'bridge' && p.cls !== 'steps'), stairs = paths.filter((p) => p.cls === 'steps'), bridges = paths.filter((p) => p.cls === 'bridge');
  // ---- junctions and pinned vertices: a vertex that two ways share
  const inc = new Map();
  for (const p of paths) {
    if (p.cls === 'bridge') continue;
    const q = p.pts, n = q.length / 2;
    for (let i = 0; i < n; i++) { const k = keyOf(q[2 * i], q[2 * i + 1]); let e = inc.get(k); if (!e) inc.set(k, (e = { x: q[2 * i], z: q[2 * i + 1], list: [] })); e.list.push({ p, end: i === 0 || i === n - 1 }); }
  }
  const junctions = [...inc.values()].filter((e) => new Set(e.list.map((l) => l.p.id)).size >= 2 && e.list.some((l) => l.p.cls !== 'steps'));
  const junctionKey = new Set(junctions.map((e) => keyOf(e.x, e.z)));
  const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1) : 0; return Math.hypot(px - ax - t * dx, pz - az - t * dz); };
  const endOnWay = (pt, self) => ways.some((q) => { if (q === self) return false; const a = q.pts, lim = q.w / 2 + P.pad; for (let i = 0; i + 3 < a.length; i += 2) if (segDist(pt[0], pt[1], a[i], a[i + 1], a[i + 2], a[i + 3]) < lim) return true; return false; });
  // ---- the ribbons
  const pos = [], nrm = [], col = [], pth = [], idx = [], wayOf = [], outWays = [], stubOf = [];       // stubOf[wi]: an end of the way lies on another way (T8a: it goes under the through way in the levels)
  let rowsTotal = 0, foldedDropped = 0;
  const colOf = (p) => col3(PATH_COLORS[p.surfaceClass] || PATH_COLORS.gravel);
  const push = (x, y, z, c, a, e, hw, w) => { pos.push(x, y, z); nrm.push(0, 1, 0); col.push(c[0], c[1], c[2]); pth.push(a, e, hw); wayOf.push(w); return pos.length / 3 - 1; };
  ways.forEach((p, wi) => {
    const raw = flat(p.pts);
    const pinned = raw.map((v, i) => i === 0 || i === raw.length - 1 || (inc.get(keyOf(v[0], v[1])) && inc.get(keyOf(v[0], v[1])).list.length >= 2));
    const sm = smoothLine(raw, pinned, P), line = sm.pts;
    // arc length of the smoothed line
    const cum = [0]; for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
    const L = cum[cum.length - 1];
    if (L < 0.5) return;
    const seed = hashId(p.id), bias = P.classBias[p.cls] || 0, base = colOf(p), hwN = p.w / 2;
    const at = (s) => {                                       // the point and the unit tangent at arc length s
      s = clamp(s, 0, L); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
      const a = line[i - 1], b = line[i], seg = cum[i] - cum[i - 1] || 1, t = (s - cum[i - 1]) / seg;
      return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / seg, tz: (b[1] - a[1]) / seg, i };
    };
    const halfW = (s) => { const win = Math.min(1, s / 6, (L - s) / 6); return hwN * (1 + P.widthVar * noise1(s / 9, seed) * win) + P.pad; };
    // the normal of a row: the bisector at a vertex of the line (mitre capped at 1.6), the segment normal elsewhere
    const rowAt = (s) => {
      const q = at(s); let tx = q.tx, tz = q.tz;
      for (let i = 1; i + 1 < line.length; i++) if (Math.abs(cum[i] - s) < 1e-6) { const a = line[i - 1], b = line[i], c = line[i + 1], l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]); tx = (b[0] - a[0]) / l1 + (c[0] - b[0]) / l2; tz = (b[1] - a[1]) / l1 + (c[1] - b[1]) / l2; const m = Math.hypot(tx, tz) || 1; tx /= m; tz /= m; break; }
      const nx = -tz, nz = tx, hw = halfW(s);
      let mit = 1;
      if (tx !== q.tx || tz !== q.tz) mit = clamp(1 / Math.max(0.01, tx * q.tx + tz * q.tz), 1, 1.6);
      const ox = nx * hw * mit, oz = nz * hw * mit;
      return { s, x: q.x, z: q.z, lx: q.x + ox, lz: q.z + oz, rx: q.x - ox, rz: q.z - oz, hw };
    };
    // the arc lengths of the rows: every vertex of the line, then subdivided by the chord rule
    const heights = (r) => [H(r.lx, r.lz), H(r.x, r.z), H(r.rx, r.rz)];
    const needSplit = (a, b) => {
      if (b.s - a.s <= P.stepMin) return false;
      if (b.s - a.s > P.stepMax) return true;
      const m = rowAt((a.s + b.s) / 2), ha = a.h, hb = b.h, hm = heights(m);
      for (let k = 0; k < 3; k++) if (Math.abs(hm[k] - (ha[k] + hb[k]) / 2) > P.chord) return true;          // the chord under the mesh on a crest, over it in a hollow
      return false;
    };
    const stations = [0]; for (let i = 1; i < cum.length; i++) if (cum[i] - stations[stations.length - 1] > 1e-6) stations.push(cum[i]);
    let rows = stations.map((s) => { const r = rowAt(s); r.h = heights(r); return r; });
    for (let again = true, guard = 0; again && guard < 12; guard++) {
      again = false; const next = [rows[0]];
      for (let k = 1; k < rows.length; k++) { const a = rows[k - 1], b = rows[k]; if (needSplit(a, b)) { const m = rowAt((a.s + b.s) / 2); m.h = heights(m); next.push(m); again = true; } next.push(b); }
      rows = next;
    }
    // the end fade of the tonal bands: only at a junction end
    // T8a: an end that lies ON another way (a T: the south alley ends on the main alley at the west gate, no shared vertex) is a junction end too: its bands fade out, so the overlap shows one tone (no seam of the ribbon's edge across the other)
    const onA = endOnWay(raw[0], p), onB = endOnWay(raw[raw.length - 1], p); stubOf[wi] = onA || onB;
    const fadeA = junctionKey.has(keyOf(raw[0][0], raw[0][1])) || onA, fadeB = junctionKey.has(keyOf(raw[raw.length - 1][0], raw[raw.length - 1][1])) || onB;
    // three vertices across (left, centre, right); five where the terrain is curved ACROSS the ribbon at THIS row (a crest or a flank, the bank of a pond: the chord of three would dip under the mesh by more than the chord rule).
    // T4b: per row (T3 made the whole way wide); two rows of different width are zipped; a triangle that folds over (clockwise seen from above) is dropped.
    const WIDE = [-1, -0.5, 0, 0.5, 1], NARROW = [-1, 0, 1];
    let prev = null, prevU = null, wideRows = 0;
    const ccw = (a, b, c) => (pos[3 * b + 2] - pos[3 * a + 2]) * (pos[3 * c] - pos[3 * a]) - (pos[3 * b] - pos[3 * a]) * (pos[3 * c + 2] - pos[3 * a + 2]) > 1e-9;
    const tri = (a, b, c) => { if (ccw(a, b, c)) idx.push(a, b, c); else foldedDropped++; };
    const curved = rows.map((r) => { const mL = H((r.lx + r.x) / 2, (r.lz + r.z) / 2), mR = H((r.rx + r.x) / 2, (r.rz + r.z) / 2); return Math.abs(mL - (r.h[0] + r.h[1]) / 2) > P.chord || Math.abs(mR - (r.h[2] + r.h[1]) / 2) > P.chord; });
    for (let ri = 0; ri < rows.length; ri++) {
      const r = rows[ri], ef = Math.min(fadeA ? clamp(r.s / P.endFade, 0, 1) : 1, fadeB ? clamp((L - r.s) / P.endFade, 0, 1) : 1);
      const wide = curved[ri] || (ri > 0 && curved[ri - 1]) || (ri + 1 < rows.length && curved[ri + 1]), across = wide ? WIDE : NARROW; if (wide) wideRows++;     // (a row beside a curved one is wide too: the zip of a 3- and a 5-row then happens where the terrain is flat across)
      const row = across.map((u) => {
        const t = Math.abs(u), side = u < 0 ? [r.lx, r.lz] : [r.rx, r.rz], x = r.x + (side[0] - r.x) * t, z = r.z + (side[1] - r.z) * t;
        const y = (t === 1 ? r.h[u < 0 ? 0 : 2] : t === 0 ? r.h[1] : H(x, z)) + P.offset + bias;
        return push(x, y, z, base, u, ef, r.hw, wi);
      });
      if (prev) {                                                     // zip the two rows by their across parameter (-1 .. 1): counter-clockwise seen from above (the left edge is on the +n side, n = (-tz, tx))
        let i = 0, j = 0;
        while (i + 1 < prev.length || j + 1 < row.length) {
          const advPrev = j + 1 >= row.length || (i + 1 < prev.length && prevU[i + 1] <= across[j + 1]);
          if (advPrev) { tri(prev[i], row[j], prev[i + 1]); i++; } else { tri(prev[i], row[j], row[j + 1]); j++; }
        }
      }
      prev = row; prevU = across; rowsTotal++;
    }
    outWays.push({ id: p.id, cls: p.cls, surfaceClass: p.surfaceClass, w: p.w, rows: rows.length, wideRows, across: wideRows ? 5 : 3, length: L, from: [line[0][0], line[0][1]], to: [line[line.length - 1][0], line[line.length - 1][1]], index: wi, seed });
  });
  // ---- the discs under the junctions
  let discTris = 0;
  for (const j of junctions) {
    const ws = j.list.map((l) => l.p).filter((p) => p.cls !== 'steps' && p.cls !== 'bridge'); if (!ws.length) continue;
    const wide = ws.reduce((a, b) => (b.w > a.w ? b : a)), R = wide.w / 2 + P.pad, c = colOf(wide), bias = Math.max(...ws.map((p) => P.classBias[p.cls] || 0)) - 0.0005;
    const c0 = push(j.x, H(j.x, j.z) + P.offset + bias, j.z, c, 0, 0, R, -1);
    const ring = [];
    for (let k = 0; k < P.discSegments; k++) { const a = k / P.discSegments * 2 * Math.PI, x = j.x + Math.cos(a) * R, z = j.z + Math.sin(a) * R; ring.push(push(x, H(x, z) + P.offset + bias, z, c, 1, 0, R, -1)); }
    for (let k = 0; k < P.discSegments; k++) { idx.push(c0, ring[(k + 1) % P.discSegments], ring[k]); discTris++; }
  }
  // ---- the stairs
  const S = { pos: [], nrm: [], col: [], idx: [] }, stairInfo = [];
  const bridgeEnds = []; for (const b of bridges) { const q = b.pts; bridgeEnds.push([q[0], q[1]], [q[q.length - 2], q[q.length - 1]]); }
  const nearBridge = (x, z) => bridgeEnds.some((e) => Math.hypot(e[0] - x, e[1] - z) < 1.2);
  const deckAt = typeof ground.deckAt === 'function' ? ground.deckAt : null;        // T4b: the walking profile of the bridge kit at a bridge head (bridges.js deckY), null = no deck there
  const quad = (a, b, c, d, nx, ny, nz, color) => {            // a, b, c, d around the face; the face is wound to look to the side the normal (nx, ny, nz) points to (the order is flipped when it does not)
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const gx = e1[1] * e2[2] - e1[2] * e2[1], gy = e1[2] * e2[0] - e1[0] * e2[2], gz = e1[0] * e2[1] - e1[1] * e2[0];
    if (gx * nx + gy * ny + gz * nz < 0) { const t = b; b = d; d = t; }
    const base = S.pos.length / 3;
    for (const v of [a, b, c, d]) { S.pos.push(v[0], v[1], v[2]); S.nrm.push(nx, ny, nz); S.col.push(color[0], color[1], color[2]); }
    S.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const cT = col3(STEP_COLORS.tread), cR = col3(STEP_COLORS.riser), cK = col3(STEP_COLORS.kerb);
  for (const p of stairs) {
    const q = flat(p.pts), A = q[0], B = q[q.length - 1], len = Math.hypot(B[0] - A[0], B[1] - A[1]); if (len < 0.3) continue;
    const hA = H(A[0], A[1]) + P.offset, hB = H(B[0], B[1]) + P.offset, drop = hB - hA;
    let lowEnd = A, highEnd = B, hLow = hA, hHigh = hB, n, bridgeHead = false, level = false;
    const bA = nearBridge(A[0], A[1]), bB = nearBridge(B[0], B[1]);
    if (bA || bB) {                                              // a stair at a bridge head: from the ground at its foot up to the deck head (T4b: ground.deckAt), whatever the terrain does under it
      bridgeHead = true; if (bA) { lowEnd = B; highEnd = A; hLow = hB; }
      const dh = deckAt ? deckAt(highEnd[0], highEnd[1]) : null;
      if (dh !== null && dh !== undefined && Number.isFinite(dh)) { hHigh = dh; n = Math.max(2, p.steps || Math.round(Math.abs(hHigh - hLow) / P.riser)); }
      else { n = Math.max(2, p.steps || 4); hHigh = hLow + n * P.riser; }
    } else if (Math.abs(drop) < 0.1) {                           // level ground: the tag's count of treads and NO rise (review fix: n x riser drew a 0.30 m pad on flat ground that the Player walks through)
      n = Math.max(2, p.steps || 2); hHigh = hLow; level = true;
    } else {
      if (drop < 0) { lowEnd = B; highEnd = A; hLow = hB; hHigh = hA; }
      n = Math.max(2, Math.round(Math.abs(drop) / P.riser));
    }
    const ux = (highEnd[0] - lowEnd[0]) / len, uz = (highEnd[1] - lowEnd[1]) / len, vx = -uz, vz = ux, hw = (p.w || 2.2) / 2, d = len / n;
    const tops = [];                                              // tread tops: equal steps of the rise, never under the mesh
    let floor = hLow;
    for (let k = 0; k < n; k++) {
      let top = hLow + (k + 1) * (hHigh - hLow) / n, mh = -Infinity;
      for (let m = 0; m <= 4; m++) { const s = (k + m / 4) * d, x = lowEnd[0] + ux * s, z = lowEnd[1] + uz * s; for (const o of [-hw, 0, hw]) mh = Math.max(mh, H(x + vx * o, z + vz * o)); }
      top = level ? Math.max(top, mh + 0.01) : Math.max(top, mh + 0.01, floor + 0.05); tops.push(top); floor = top;
    }
    const at3 = (s, o, y) => [lowEnd[0] + ux * s + vx * o, y, lowEnd[1] + uz * s + vz * o + 0];
    const low = (s, o) => H(lowEnd[0] + ux * s + vx * o, lowEnd[1] + uz * s + vz * o) - 0.03;     // the mesh under a point of the stair (the risers and kerbs reach down to it)
    for (let k = 0; k < n; k++) {
      const s0 = k * d, s1 = (k + 1) * d, t = tops[k], t0 = k ? tops[k - 1] : hLow;
      quad(at3(s0, -hw, t), at3(s0, hw, t), at3(s1, hw, t), at3(s1, -hw, t), 0, 1, 0, cT);      // tread (the winding is the top face: x east, z south, up = +y)
      const b0 = Math.min(low(s0, -hw), low(s0, hw), t0);
      quad(at3(s0, -hw, b0), at3(s0, -hw, t), at3(s0, hw, t), at3(s0, hw, b0), -ux, 0, -uz, cR);  // riser, facing the low end
      for (const side of [-1, 1]) {                                                              // the kerb: a box of the tread + kerbH over the length of this tread, on the outside of the stair
        const o0 = side * hw, o1 = side * (hw + P.kerbW), top = t + P.kerbH, bot = Math.min(low(s0, o0), low(s1, o0), low(s0, o1), low(s1, o1), t0);
        quad(at3(s0, o0, top), at3(s0, o1, top), at3(s1, o1, top), at3(s1, o0, top), 0, 1, 0, cK);
        quad(at3(s0, o1, bot), at3(s0, o1, top), at3(s1, o1, top), at3(s1, o1, bot), side * vx, 0, side * vz, cK);                // outer face
        quad(at3(s1, o0, bot), at3(s1, o0, top), at3(s0, o0, top), at3(s0, o0, bot), -side * vx, 0, -side * vz, cK);              // inner face
        quad(at3(s0, o0, bot), at3(s0, o0, top), at3(s0, o1, top), at3(s0, o1, bot), -ux, 0, -uz, cK);                           // face towards the low end
        if (k === n - 1) quad(at3(s1, o1, bot), at3(s1, o1, top), at3(s1, o0, top), at3(s1, o0, bot), ux, 0, uz, cK);             // the back of the last kerb
      }
    }
    stairInfo.push({ id: p.id, n, level, riser: (hHigh - hLow) / n, treadDepth: d, width: hw * 2, hLow, hHigh, bridgeHead, tops, from: lowEnd, to: highEnd, drop: hHigh - hLow });
  }
  // T8a: the levels of overlapping ways of one class (see overlapLevels): the vertices of a way at level k are lifted by k x levelStep
  const lv = overlapLevels(pos, idx, wayOf, ways.map((p, i) => ({ bias: P.classBias[p.cls] || 0, w: p.w, stub: !!stubOf[i] })), P);
  for (let v = 0; v < wayOf.length; v++) { const w = wayOf[v]; if (w >= 0 && lv.level[w]) pos[3 * v + 1] += lv.level[w] * P.levelStep; }
  for (const ow of outWays) ow.level = lv.level[ow.index];
  const R = { pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), col: Float32Array.from(col), path: Float32Array.from(pth), wayOf: Int16Array.from(wayOf) };
  R.idx = pos.length / 3 > 65535 ? Uint32Array.from(idx) : Uint16Array.from(idx);
  const stairs3 = { pos: Float32Array.from(S.pos), nrm: Float32Array.from(S.nrm), col: Float32Array.from(S.col) };
  stairs3.idx = S.pos.length / 3 > 65535 ? Uint32Array.from(S.idx) : Uint16Array.from(S.idx);
  const stats = { levels: lv.maxLevel + 1, levelOverflow: lv.overflow, levelNeighbours: lv.neighbours, ways: outWays.length, rows: rowsTotal, wideRows: outWays.reduce((s, w) => s + w.wideRows, 0), foldedDropped, ribbonTriangles: R.idx.length / 3, discTriangles: discTris, stairTriangles: stairs3.idx.length / 3, stairs: stairInfo.length, bridgeHeadStairs: stairInfo.filter((s) => s.bridgeHead).length, junctions: junctions.length, bridgesSkipped: bridges.length, vertices: R.pos.length / 3 + stairs3.pos.length / 3, ms: Date.now() - t0 };
  return { ribbons: R, steps: stairs3, ways: outWays, stairs: stairInfo, junctions, stats };
}

// ------------------------------------------------------------------------------------------------ the ribbon shader
const PRE = /* glsl */`
uniform sampler2D uNoise; uniform vec2 uFogK; uniform vec2 uRag;
varying vec3 vPath;
vec4 gz(vec2 p, float s) { return texture2D(uNoise, p * s); }
`;
const BODY = /* glsl */`
{
  vec2 P = vPWorld.xz;
  float a = abs(vPath.x), hwG = vPath.z;
  vec2 Pw = P + (gz(P + vec2(17.0, 43.0), 0.019).rg - 0.5) * 11.0;                // the same warped domain as the ground: the noise tile repeats every 2.7 m at 0.37 per metre
  vec4 n3 = gz(vec2(Pw.x * 0.857 - Pw.y * 0.515, Pw.x * 0.515 + Pw.y * 0.857), 0.43), n5 = gz(Pw, 1.9), n2 = gz(Pw, 0.083), n6 = gz(P, 6.1);
  // the ragged edge: the ribbon is wider than the way by uRag.x; the cut is a noise of the world position (+- uRag.y), so two ribbons that overlap cut the same line
  float rag = (n5.g * 0.55 + n3.b * 0.45 - 0.5) * 2.0;
  float lim = (hwG - uRag.x + uRag.y * rag) / hwG;
  if (a > lim) discard;
  float mpp = max(length(dFdx(P)), length(dFdy(P)));
  float patF = 1.0 - smoothstep(0.012, 0.085, mpp);
  float tone = 0.93 + 0.11 * n2.g;                                              // patches of the gravel
  tone *= 1.0 - 0.10 * (1.0 - smoothstep(0.0, 0.50, a)) * vPath.y;              // the darker worn centre line (fades out at junctions)
  tone *= 1.0 + 0.05 * smoothstep(0.55, 0.92, a) * vPath.y;                     // lighter edges
  tone *= 1.0 - 0.07 * smoothstep(lim - 0.10 / hwG, lim, a) * vPath.y;          // a thin darker rim (T8a: gone at a junction end too: the rim of a way that ends on another would draw a line across it)
  tone *= 1.0 + (n6.a - 0.5) * 0.07 * patF;                                     // the fine grain, gone at distance
  diffuseColor.rgb *= tone;
}
`;
const FOG = /* glsl */`
#ifdef USE_FOG
  float efd = min(vFogDepth, uFogK.x) + uFogK.y * max(vFogDepth - uFogK.x, 0.0);
  float fogFactor = 1.0 - exp(-fogDensity * fogDensity * efd * efd);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif
`;

/** the ribbon material: a ctx.mat.toon with vertex colours (the class base colour), polygonOffset -1.4 like the streets' footways, its own onBeforeCompile (tone, ragged edge), the environment's far fog */
export function pathMaterial(ctx, noiseTexture, P = PATHS_DRAPED) {
  const mat = ctx.mat.toon('#ffffff', { vertexColors: true, paint: 0.02, polygonOffset: -1.4, name: 'tauride-paths' });
  const prev = mat.onBeforeCompile;
  const U = { uNoise: { value: noiseTexture }, uFogK: { value: new THREE.Vector2(FAR_FOG.D0, FAR_FOG.K) }, uRag: { value: new THREE.Vector2(P.pad, P.rag) } };
  mat.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(mat, shader, renderer);
    Object.assign(shader.uniforms, U);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aPath; varying vec3 vPath;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvPath = aPath;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + PRE)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + BODY)
      .replace('#include <fog_fragment>', FOG);
  };
  mat.customProgramCacheKey = () => 'paint|tauride-paths-t8a';
  mat.userData.tauride = 'paths';
  return { mat, uniforms: U };
}

/** the meshes of a plan: { group, ribbonMesh, stepMesh, triangles, draws }. Both are noBatch, noOutline (colour pass only), registerLOD(1500), no colliders. */
export function buildPaths(ctx, parent, plan, noiseTexture) {
  const group = new THREE.Group(); group.name = 'tauride-paths';
  const { mat } = pathMaterial(ctx, noiseTexture);
  const R = plan.ribbons, ribbonGeo = new THREE.BufferGeometry();
  ribbonGeo.setAttribute('position', new THREE.BufferAttribute(R.pos, 3)); ribbonGeo.setAttribute('normal', new THREE.BufferAttribute(R.nrm, 3)); ribbonGeo.setAttribute('color', new THREE.BufferAttribute(R.col, 3)); ribbonGeo.setAttribute('aPath', new THREE.BufferAttribute(R.path, 3));
  ribbonGeo.setIndex(new THREE.BufferAttribute(R.idx, 1)); ribbonGeo.computeBoundingBox(); ribbonGeo.computeBoundingSphere();
  const ribbonMesh = new THREE.Mesh(ribbonGeo, mat); ribbonMesh.name = 'tauride-paths-ribbons'; ribbonMesh.receiveShadow = true; ribbonMesh.castShadow = false;
  ctx.noBatch(ribbonMesh); ctx.noOutline(ribbonMesh); group.add(ribbonMesh);
  let stepMesh = null;
  const S = plan.steps;
  if (S.idx.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(S.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(S.nrm, 3)); g.setAttribute('color', new THREE.BufferAttribute(S.col, 3));
    g.setIndex(new THREE.BufferAttribute(S.idx, 1)); g.computeBoundingBox(); g.computeBoundingSphere();
    stepMesh = new THREE.Mesh(g, ctx.mat.toon('#ffffff', { vertexColors: true, paint: 0.03, name: 'tauride-steps' })); stepMesh.name = 'tauride-paths-steps'; stepMesh.receiveShadow = true; stepMesh.castShadow = false;
    ctx.noBatch(stepMesh); ctx.noOutline(stepMesh); group.add(stepMesh);
  }
  parent.add(group); group.updateMatrixWorld(true);
  for (const m of group.children) registerLOD(m, 1500);
  return { group, ribbonMesh, stepMesh, triangles: plan.stats.ribbonTriangles + plan.stats.stairTriangles, draws: group.children.length };
}
