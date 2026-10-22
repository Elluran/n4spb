// landmarksTauride/paths-draped.js - THE ALLEYS OF THE TAURIDE GARDEN (docs/TAURIDE-REMAKE.md, phase T3): the 112 mapped ways (data/paths.js: main 3.5-4.5 m / side 2.4 m / trail 1.4 m / steps) as ribbons DRAPED on the terrain
// mesh, in pale pink-beige gravel (#c9a98a .. #b58c78), darker earth for the trails, lighter grey for the paving stones and the concrete plates, and the 6 STEPS ways as real stairs.
//   planPaths(paths, ground)   PURE and DETERMINISTIC: { ribbons, steps, ways, stats }. `ground` = { meshHeight (the height of the PLANNED terrain mesh, terrain-mesh.js makeMeshHeight), gh (gardenHeight) }.
//   buildPaths(ctx, parent, plan, noise)   the two meshes (ribbons, steps) and the ribbon material.
// RIBBONS: one mesh, one draw. Each way is smoothed (one pass of corner cutting: the OSM polyline is a few vertices per alley; the ends and every vertex that another way shares are PINNED, so the joins stay where the
//   data has them), cut into rows of three vertices (left edge, centre, right edge; five where the terrain curves across the ribbon: the extra vertices keep it on a crest) at a spacing that adapts to the terrain (a row is added wherever the chord of the ribbon would dip more
//   than 1.2 cm under the mesh, at most 8 m and at least 1 m), and DRAPED: every vertex is the height of the planned terrain mesh at its own (x, z) + 0.03 m (+ a few mm per class: main over side over trail, so a join has a
//   deterministic winner). The ribbon is wider than the way by PAD (0.28 m each side): the SHADER cuts the ragged edge (a noise of the world position, +-0.17 m, no texture) and paints three tonal bands (a darker worn
//   centre line, lighter edges) that fade out within 2.5 m of a junction, so two ribbons that overlap there show the same colour (nothing darkens). The width varies along the way by +-8 % (a 1-D noise of the arc length,
//   settling to the nominal width at the ends). A JUNCTION (a vertex that two or more ways share) gets a disc of 8 triangles under the ends, in the colour of its widest way, so that a bend or a Y leaves no wedge.
//   No kerbs on the ribbons: kerbs are only at the stairs and (T4) the bridges. The 8 BRIDGE ways are NOT drawn here: the decks are T4.
// STAIRS (the steps ways): the treads and risers follow the terrain: n = round(drop / 0.15) steps between the two ends (at least 2; the ends are the height of the mesh + the ribbon offset), the tread tops equal steps of the
//   drop (never under the mesh), the risers reach down to the mesh, a kerb (0.2 m wide, the tread + 0.16 m) on both sides. A stair at a bridge head (the way ends on a bridge way, the terrain is level there) rises 0.6 m
//   (4 x 0.15) towards the deck: the deck height of T4 must be 0.6 m above the lawn at the bridge ends (the steps of the wooden bridge, docs/TAURIDE-REMAKE.md 7.1).
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
  riser: 0.15, bridgeRise: 0.6, kerbW: 0.2, kerbH: 0.16,
  discSegments: 8,
  trianglesMax: 12000, drawsMax: 4,
});
export const PATH_COLORS = Object.freeze({ gravel: '#c9a98a', earth: '#917658', paved: '#aaa7a1', wood: '#8a6446', metal: '#6d747c', unknown: '#c9a98a' });
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
  // ---- the ribbons
  const pos = [], nrm = [], col = [], pth = [], idx = [], wayOf = [], outWays = [];
  let rowsTotal = 0;
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
    const fadeA = junctionKey.has(keyOf(raw[0][0], raw[0][1])), fadeB = junctionKey.has(keyOf(raw[raw.length - 1][0], raw[raw.length - 1][1]));
    // three vertices across (left, centre, right); five where the terrain is curved ACROSS the ribbon (a way over a crest or along a flank: the chord of three would dip under the mesh by more than the chord rule)
    let wide = false;
    for (const r of rows) { const mL = H((r.lx + r.x) / 2, (r.lz + r.z) / 2), mR = H((r.rx + r.x) / 2, (r.rz + r.z) / 2); if (Math.abs(mL - (r.h[0] + r.h[1]) / 2) > P.chord || Math.abs(mR - (r.h[2] + r.h[1]) / 2) > P.chord) { wide = true; break; } }
    const across = wide ? [-1, -0.5, 0, 0.5, 1] : [-1, 0, 1];
    let prev = null;
    for (const r of rows) {
      const ef = Math.min(fadeA ? clamp(r.s / P.endFade, 0, 1) : 1, fadeB ? clamp((L - r.s) / P.endFade, 0, 1) : 1);
      const row = across.map((u) => {
        const t = Math.abs(u), side = u < 0 ? [r.lx, r.lz] : [r.rx, r.rz], x = r.x + (side[0] - r.x) * t, z = r.z + (side[1] - r.z) * t;
        const y = (t === 1 ? r.h[u < 0 ? 0 : 2] : t === 0 ? r.h[1] : H(x, z)) + P.offset + bias;
        return push(x, y, z, base, u, ef, r.hw, wi);
      });
      if (prev) for (let k = 0; k + 1 < row.length; k++) { idx.push(prev[k], row[k], prev[k + 1]); idx.push(prev[k + 1], row[k], row[k + 1]); }          // counter-clockwise seen from above (the left edge is on the +n side, n = (-tz, tx))
      prev = row; rowsTotal++;
    }
    outWays.push({ id: p.id, cls: p.cls, surfaceClass: p.surfaceClass, w: p.w, rows: rows.length, across: across.length, length: L, from: [line[0][0], line[0][1]], to: [line[line.length - 1][0], line[line.length - 1][1]], index: wi, seed });
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
    let lowEnd = A, highEnd = B, hLow = hA, hHigh = hB, n, bridgeHead = false;
    if (Math.abs(drop) < 0.1) {                                  // level ground: a stair at a bridge head rises to the deck (T4), else the tag's count at the ordinary riser
      const bA = nearBridge(A[0], A[1]), bB = nearBridge(B[0], B[1]);
      n = Math.max(2, p.steps || Math.round(P.bridgeRise / P.riser));
      if (bA || bB) { bridgeHead = true; if (bA) { lowEnd = B; highEnd = A; hLow = hB; } hHigh = hLow + n * P.riser; } else { n = Math.max(2, p.steps || 2); hHigh = hLow + n * P.riser; }
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
      top = Math.max(top, mh + 0.01, floor + 0.05); tops.push(top); floor = top;
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
    stairInfo.push({ id: p.id, n, riser: (hHigh - hLow) / n, treadDepth: d, width: hw * 2, hLow, hHigh, bridgeHead, tops, from: lowEnd, to: highEnd, drop: hHigh - hLow });
  }
  const R = { pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), col: Float32Array.from(col), path: Float32Array.from(pth), wayOf: Int16Array.from(wayOf) };
  R.idx = pos.length / 3 > 65535 ? Uint32Array.from(idx) : Uint16Array.from(idx);
  const stairs3 = { pos: Float32Array.from(S.pos), nrm: Float32Array.from(S.nrm), col: Float32Array.from(S.col) };
  stairs3.idx = S.pos.length / 3 > 65535 ? Uint32Array.from(S.idx) : Uint16Array.from(S.idx);
  const stats = { ways: outWays.length, rows: rowsTotal, ribbonTriangles: R.idx.length / 3, discTriangles: discTris, stairTriangles: stairs3.idx.length / 3, stairs: stairInfo.length, junctions: junctions.length, bridgesSkipped: bridges.length, vertices: R.pos.length / 3 + stairs3.pos.length / 3, ms: Date.now() - t0 };
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
  tone *= 1.0 - 0.07 * smoothstep(lim - 0.10 / hwG, lim, a);                    // a thin darker rim
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
  mat.customProgramCacheKey = () => 'paint|tauride-paths-t3';
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
