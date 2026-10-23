// landmarksTauride/reeds.js - THE REED BELTS of the Tauride ponds (docs/TAURIDE-REMAKE.md, phase T4b; plan C3 "reed belts (~500 instanced cards)"): clumps of reed on the shore band, in belts along the calm shores.
//   planReeds(o)                PURE and DETERMINISTIC: { instances: [{ x, y, z, yaw, scale, tint }], stats }. o = { union (data/water.js), shore (GARDEN_SHORE), gh (gardenHeight), paths (data/paths.js), garden (the outline), keepOut (bridges.js plan.keepOut: the deck axes), design (data/bridge-design.js REEDS) }
//   buildReeds(ctx, parent, plan)   ONE InstancedMesh (a clump of `blades` triangles in three sub-clumps, vertex colours base -> tip, an instance tint and a non-uniform scale), toon, double-sided, out of the outline pass, LOD 700 m.
// T5 (the T4b GPU QA: the reeds read as a single row of identical thin tufts at 5-12 m): the clump is three sub-clumps of different heights (one geometry, one draw), each instance is scaled wide / tall on its own, a clump stands either in the
// shallows or on the wet foot (two rows), the belts are denser (REEDS.spacing 0.7, threshold 0.58) and the count is 700.
// PLACEMENT: every ring of the water union (the two ponds with the canals, the three islands) is walked by arc length; a slow noise of the arc length (REEDS.belt) switches the belts on and off (reeds come in stretches of 10 .. 25 m with
// open water between, not as a hedge round the pond); inside a belt a clump every REEDS.spacing m (jittered) at a shore distance drawn from REEDS.band (in the shallows and on the wet foot of the bank), its feet on the terrain (the bed).
// NONE: within REEDS.keepOut of an alley end (the paths that end at the water), of any alley, of a bridge deck (the extended deck rectangles of bridges.js + a margin), of the dam axis, of the stairs (the memorial descents, the wooden
// bridge's steps), of the garden outline (the quay and the kerb skirt stretches: the water meets the street there, no bank), and none outside the garden polygon. The Small Pond's open centre is empty by construction (shore band only).
// Deterministic: a hash of the ring index and the arc-length step, no Math.random.
import * as THREE from 'three';
import { registerLOD } from '../../core/spatial.js';
import { REEDS } from './data/bridge-design.js';
import { WATER_UNION } from './data/water.js';
import { GARDEN } from './data/footprints.js';
import { PATHS } from './data/paths.js';
import { gardenHeight, GARDEN_SHORE } from './height.js';

function hash1(n, seed) { let h = (Math.imul(n | 0, 374761393) + Math.imul(seed | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
const segDist = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0; return Math.hypot(x - ax - t * dx, z - az - t * dz); };
const ringDist = (x, z, r) => { let m = Infinity; for (let i = 0; i < r.length; i += 2) m = Math.min(m, segDist(x, z, r[i], r[i + 1], r[(i + 2) % r.length], r[(i + 3) % r.length])); return m; };
const polyDist = (x, z, pts) => { let m = Infinity; for (let i = 0; i + 3 < pts.length; i += 2) m = Math.min(m, segDist(x, z, pts[i], pts[i + 1], pts[i + 2], pts[i + 3])); return m; };

/** the rings of the union as [[x, z], ...] with the unit normal to the LAND per vertex (the mitre of the two edge normals); shared with vegetation.js (the shore planting walks the same rings) */
export function shoreRings(union = WATER_UNION) {
  const out = [];
  for (const p of union) for (const [r, hole] of [[p.o, false], ...(p.h || []).map((h) => [h, true])]) {
    const v = []; for (let i = 0; i < r.length; i += 2) { const q = v[v.length - 1]; if (!q || Math.hypot(r[i] - q[0], r[i + 1] - q[1]) > 1e-6) v.push([r[i], r[i + 1]]); }
    if (v.length > 1 && Math.hypot(v[0][0] - v[v.length - 1][0], v[0][1] - v[v.length - 1][1]) <= 1e-6) v.pop();
    let area = 0; for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length]; area += a[0] * b[1] - b[0] * a[1]; }
    const sg = (area > 0 ? 1 : -1) * (hole ? 1 : -1), m = v.length, nrm = [];
    for (let i = 0; i < m; i++) { const a = v[i], b = v[(i + 1) % m], ex = b[0] - a[0], ez = b[1] - a[1], l = Math.hypot(ex, ez) || 1; nrm.push([-ez / l * sg, ex / l * sg]); }
    out.push({ v, nrm, hole });
  }
  return out;
}

export function planReeds(o = {}) {
  const D = o.design || REEDS, union = o.union || WATER_UNION, shore = o.shore || GARDEN_SHORE, gh = o.gh || gardenHeight, paths = o.paths || PATHS, garden = o.garden || GARDEN.o, keepOut = o.keepOut || [];
  const K = D.keepOut, ends = [], ways = [], steps = [];
  for (const p of paths) { if (p.cls === 'bridge') continue; const q = p.pts; ends.push([q[0], q[1]], [q[q.length - 2], q[q.length - 1]]); (p.cls === 'steps' ? steps : ways).push(q); }
  const decks = keepOut.map((k) => ({ pts: k.axis.flat(), r: k.hw + (k.type === 'weir' ? K.dam : K.deck) }));
  const instances = [], belts = []; let considered = 0, rejected = { belt: 0, wayEnd: 0, way: 0, deck: 0, steps: 0, outline: 0, garden: 0 };
  const rings = shoreRings(union);
  rings.forEach((ring, ri) => {
    const v = ring.v, m = v.length, cum = [0]; for (let i = 1; i <= m; i++) cum.push(cum[i - 1] + Math.hypot(v[i % m][0] - v[i - 1][0], v[i % m][1] - v[i - 1][1]));
    const total = cum[m], ph1 = hash1(ri, 11) * 6.283, ph2 = hash1(ri, 12) * 6.283;
    let inBelt = false, beltStart = 0;
    for (let k = 0, s = hash1(ri, 13) * D.spacing; s < total; k++, s += D.spacing * (0.7 + 0.6 * hash1(k, ri * 7 + 1))) {
      considered++;
      const n = 0.5 + 0.5 * Math.sin(s * 6.283 / D.belt.period + ph1) * Math.sin(s * 6.283 / (D.belt.period * 1.73) + ph2) + 0.25 * (hash1(Math.floor(s / 4), ri * 3 + 5) - 0.5);
      const on = n > D.belt.threshold;
      if (on && !inBelt) { inBelt = true; beltStart = s; } else if (!on && inBelt) { inBelt = false; belts.push({ ring: ri, from: beltStart, to: s }); }
      if (!on) { rejected.belt++; continue; }
      // the point of the ring at s, its land normal (mitre at the vertices, the edge normal between), the clump at the shore distance d
      let i = 0; while (i < m - 1 && cum[i + 1] < s) i++;
      const a = v[i], b = v[(i + 1) % m], seg = cum[i + 1] - cum[i] || 1, t = (s - cum[i]) / seg, nx = ring.nrm[i][0], nz = ring.nrm[i][1];
      // T5: two rows: a clump stands in the shallows (band[0] .. split) or on the wet foot (split .. band[1]), shallowShare of them in the shallows (the one row of T4b read as a line of tufts)
      const u = hash1(k, ri * 5 + 2), lo = D.split === undefined ? D.band[0] : (u < (D.shallowShare ?? 0.5) ? D.band[0] : D.split), hi = D.split === undefined ? D.band[1] : (u < (D.shallowShare ?? 0.5) ? D.split : D.band[1]);
      const d = lo + (hi - lo) * hash1(k, ri * 9 + 8), along = (hash1(k, ri * 5 + 3) - 0.5) * 0.6;
      const tx = (b[0] - a[0]) / seg, tz = (b[1] - a[1]) / seg, x = a[0] + (b[0] - a[0]) * t + nx * d + tx * along, z = a[1] + (b[1] - a[1]) * t + nz * d + tz * along;
      if (!shore.inGarden(x, z)) { rejected.garden++; continue; }
      if (ringDist(x, z, garden) < K.outline) { rejected.outline++; continue; }
      if (ends.some((e) => Math.hypot(e[0] - x, e[1] - z) < K.wayEnd)) { rejected.wayEnd++; continue; }
      if (ways.some((w) => polyDist(x, z, w) < K.way)) { rejected.way++; continue; }
      if (steps.some((w) => polyDist(x, z, w) < K.steps)) { rejected.steps++; continue; }
      if (decks.some((dk) => polyDist(x, z, dk.pts) < dk.r)) { rejected.deck++; continue; }
      const y = gh(x, z) ?? 0, scale = 0.8 + 0.4 * hash1(k, ri * 5 + 4), yaw = hash1(k, ri * 5 + 6) * 6.283, tint = hash1(k, ri * 5 + 7);
      const W = D.wide || [1, 1], Tl = D.tall || [1, 1], wide = W[0] + (W[1] - W[0]) * hash1(k, ri * 9 + 9), tall = Tl[0] + (Tl[1] - Tl[0]) * hash1(k, ri * 9 + 10);      // T5: a non-uniform scale per clump (the footprint and the height apart)
      instances.push({ x, y, z, yaw, scale, wide, tall, tint, ring: ri, d, s });
    }
    if (inBelt) belts.push({ ring: ri, from: beltStart, to: total });
  });
  // the target count: thin evenly when there are more (deterministic), report when there are fewer
  let list = instances;
  if (instances.length > D.count) { const keep = []; const step = instances.length / D.count; for (let q = 0; q < D.count; q++) keep.push(instances[Math.floor(q * step)]); list = keep; }
  const beltM = belts.reduce((s, b) => s + (b.to - b.from), 0);
  return { instances: list, belts, stats: { considered, placed: instances.length, instances: list.length, belts: belts.length, beltLengthM: +beltM.toFixed(1), rejected, rings: rings.length } };
}

/** the clump geometry: ONE geometry of `blades` tapering triangles in `clumps` sub-clumps side by side (T5: three sub-clumps of different heights and blade counts: under the random yaw and the non-uniform scale of the instances
 *  they read as different shapes, still one draw), each standing on a small ring, leaning outward, vertex colours base -> tip (a dry tip now and then) */
export function reedClumpGeometry(D = REEDS) {
  const pos = [], col = [], nrm = [], base = new THREE.Color(D.color.base), tip = new THREE.Color(D.color.tip), dry = new THREE.Color(D.color.dry);
  const clumps = D.clumps || [{ dx: 0, dz: 0, h: 1, n: D.blades }];
  let k = 0;
  for (const C of clumps) for (let b = 0; b < C.n; b++, k++) {
    const a = b * 6.283 / C.n + 0.3 * hash1(k, 41), r = 0.06 + 0.08 * hash1(k, 42), h = (D.height[0] + (D.height[1] - D.height[0]) * hash1(k, 43)) * (C.h || 1), w = 0.035 + 0.02 * hash1(k, 44), lean = D.lean * (0.6 + 0.8 * hash1(k, 45));
    const cx = C.dx + Math.cos(a) * r, cz = C.dz + Math.sin(a) * r, px = -Math.sin(a), pz = Math.cos(a), tc = hash1(k, 46) < 0.3 ? dry : tip;
    const P = [[cx + px * w, 0, cz + pz * w], [cx - px * w, 0, cz - pz * w], [cx + Math.cos(a) * lean * h, h, cz + Math.sin(a) * lean * h]];
    for (const [q, c] of [[P[0], base], [P[1], base], [P[2], tc]]) { pos.push(q[0], q[1], q[2]); col.push(c.r, c.g, c.b); nrm.push(-Math.cos(a) * 0.3, 0.95, -Math.sin(a) * 0.3); }
  }
  if (k !== D.blades) throw new Error('reeds: REEDS.blades (' + D.blades + ') must be the blades of the sub-clumps together (' + k + ')');
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

/** the instanced mesh of a plan: { mesh, triangles, draws, instances } */
export function buildReeds(ctx, parent, plan, D = REEDS) {
  const geo = reedClumpGeometry(D), n = plan.instances.length;
  const mat = ctx.mat.toon('#ffffff', { vertexColors: true, side: 'double', paint: 0.02, name: 'tauride-reeds' });
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); mesh.name = 'tauride-reeds'; mesh.castShadow = false; mesh.receiveShadow = false;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(), C = new THREE.Color();
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  plan.instances.forEach((q, i) => {
    E.set(0, q.yaw, 0, 'YXZ'); Q.setFromEuler(E); M.compose(V.set(q.x, q.y, q.z), Q, S.set(q.scale * (q.wide ?? 1), q.scale * (q.tall ?? 1), q.scale * (q.wide ?? 1))); mesh.setMatrixAt(i, M);
    C.setRGB(0.82 + 0.25 * q.tint, 0.9 + 0.1 * q.tint, 0.72 + 0.3 * (1 - q.tint)); mesh.setColorAt(i, C);
    x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z);
  });
  mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  if (n) { mesh.frustumCulled = true; geo.boundingSphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, 0.5, (z0 + z1) / 2), Math.hypot(x1 - x0, z1 - z0) / 2 + 3); geo.boundingBox = new THREE.Box3(new THREE.Vector3(x0 - 2, -1.5, z0 - 2), new THREE.Vector3(x1 + 2, 3.5, z1 + 2)); }
  ctx.noBatch(mesh); ctx.noOutline(mesh); parent.add(mesh); registerLOD(mesh, 700);
  return { mesh, triangles: n * D.blades, draws: 1, instances: n };
}
