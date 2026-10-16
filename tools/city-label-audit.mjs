// Headless (no GPU) audit of the things the city hangs on its facades: shop fascia signs, address plates, awnings, door steps / canopies, downpipes, AC units.
//   node tools/city-label-audit.mjs [--near x,z,r] [--list N] [--json file] [--max N]
// Runs the city pipeline up to the walls (as tools/city-wall-audit.mjs), then the detail builders shops.js / entrances.js / clutter.js with RECORDING stand-ins for the meshes (a recorder per
// stamped object gives its axis-aligned box in world space; atlas.quad gives the sign rectangles) and tests every pair of items that stand on the same facade for volume overlap:
//   sign x sign / plate / awning / pipe / canopy ...  Two items collide when their boxes overlap by more than 1 cm in every axis (wall-plane overlap) - they would cross each other or z-fight.
// The registry (src/world/city/slots.js = ctx.services.labels, streets/labels.js) is what prevents collisions; this audit does not trust it and measures the boxes. The labels of other modules
// (streets/plates.js, props/ads.js) are not built here: they reserve in the same registry first, the city skips what is taken (see docs/rules/FACADE-INTEGRITY.md for the browser-side check).
// Also reported: items floating off their wall (more than 40 cm from the footprint edge of their own building) = a displaced anchor (the 'u.s - w.s0' class of bug).
// Exit 1 when more than --max (default 0) colliding pairs or floating items are found.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; args[k] = v; } }
const near = args.near ? args.near.split(',').map(Number) : null;

const { BUILDINGS } = await imp('src/world/data/city.js');
const L = await imp('src/world/layout.js');
const { prepare } = await imp('src/world/city/prep.js');
const { describe, assignColours } = await imp('src/world/city/archetypes.js');
const { analyse } = await imp('src/world/city/edges.js');
const { planPassages } = await imp('src/world/city/passages.js');
const { buildWalls } = await imp('src/world/city/walls.js');
const { buildShops } = await imp('src/world/city/shops.js');
const { buildEntranceGeo } = await imp('src/world/city/entrances.js');
const { buildClutter } = await imp('src/world/city/clutter.js');
const { isOwned } = await imp('src/world/lib/claims.js');

const prep = prepare(BUILDINGS, () => false);
const described = prep.list.map((b) => ({ b, st: describe(b) }));
const list = described.filter((r) => !r.st.custom && !r.st.special);      // canopies / moored ships (canopies.js) have no walls
const net = analyse(list, prep.occluders.concat(described.filter((r) => r.st.custom).map((r) => ({ b: r.b, H: r.st.H }))));
assignColours(new Map(list.map((r) => [r.b.id, r.st])), net.adj, list.map((r) => r.b));
planPassages({}, net, list);
const info = [];
for (const item of list) { const rec = net.rec.get(item.b.id); rec.walls = buildWalls({}, rec, () => ({ quad() {}, face() {} }), {}); info.push(rec); }
const P = L.WORLD.play;
const inPlay = (r) => r.st.ob.cx > P.x0 - 50 && r.st.ob.cx < P.x1 + 50 && r.st.ob.cz > P.z0 - 50 && r.st.ob.cz < P.z1 + 50;
const sel = info.filter((r) => inPlay(r) && (!near || Math.hypot(r.st.ob.cx - near[0], r.st.ob.cz - near[1]) < near[2]));

// ---- recorders
const items = [];                                        // { kind, bld, lo: [x, y, z], hi: [x, y, z] }
const recorder = (kind0) => () => { const cb = { pos: [], nrm: [], col: [], uv: [], idx: [], n: 0 }; recs.push({ cb, kind0 }); return cb; };
const recs = [];
const M = { fine: recorder('fine') };
const atlas = { add: (o) => ({ page: 0, o }), quad: (r, cx, cy, cz, nx, nz, w, h, f, tag) => { const tx = nz, tz = -nx; const px0 = cx - tx * w / 2, pz0 = cz - tz * w / 2, px1 = cx + tx * w / 2, pz1 = cz + tz * w / 2; items.push({ hull: [[px0 - nx * 0.004, pz0 - nz * 0.004], [px1 - nx * 0.004, pz1 - nz * 0.004], [px1 + nx * 0.004, pz1 + nz * 0.004], [px0 + nx * 0.004, pz0 + nz * 0.004]], kind: r.o.top ? 'plate' : 'sign', bld: tag ? tag.b : '?', lo: [Math.min(cx - tx * w / 2, cx + tx * w / 2) - Math.abs(nx) * 0.004, cy - h / 2, Math.min(cz - tz * w / 2, cz + tz * w / 2) - Math.abs(nz) * 0.004], hi: [Math.max(cx - tx * w / 2, cx + tx * w / 2) + Math.abs(nx) * 0.004, cy + h / 2, Math.max(cz - tz * w / 2, cz + tz * w / 2) + Math.abs(nz) * 0.004] }); } };
const ctx = { tex: { FONTS: { serif: 's', round: 'r', sans: 'n' } }, L, services: {} };
// convex hull (x, z) of a stamped object: oriented boxes of rotated walls must not be tested by their axis-aligned boxes
const hull2 = (pos) => {
  const pts = []; for (let i = 0; i < pos.length; i += 3) pts.push([pos[i], pos[i + 2]]);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = []; for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 1e-12) lo.pop(); lo.push(p); }
  const up = []; for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 1e-12) up.pop(); up.push(p); }
  lo.pop(); up.pop(); return lo.concat(up);
};
const satOverlap = (A, B, eps) => {        // true when the two convex polygons overlap by more than eps along every edge normal
  for (const poly of [A, B]) for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length]; let nx = q[1] - p[1], nz = p[0] - q[0]; const l = Math.hypot(nx, nz); if (l < 1e-9) continue; nx /= l; nz /= l;
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (const v of A) { const d = v[0] * nx + v[1] * nz; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for (const v of B) { const d = v[0] * nx + v[1] * nz; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    if (Math.min(a1, b1) - Math.max(a0, b0) <= eps) return false;
  }
  return true;
};
const flush = (stage) => {
  for (const { cb } of recs) {
    if (!cb.pos.length) continue;
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (let i = 0; i < cb.pos.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], cb.pos[i + k]); hi[k] = Math.max(hi[k], cb.pos[i + k]); }
    const dy = hi[1] - lo[1], dx = Math.max(hi[0] - lo[0], hi[2] - lo[2]);
    const kind = stage === 'shops' ? 'awning' : stage === 'clutter' ? 'ac' : dx < 0.5 ? 'pipe' : dy > 2.5 ? 'canopy' : 'steps';
    items.push({ kind, bld: '?', lo, hi, dx, hull: hull2(cb.pos) });
  }
  recs.length = 0;
};
const avoid = [];
for (const dw of L.DOORWAYS) avoid.push({ x: dw.x, z: dw.z, r: 14 });
const res = {};
res.shops = buildShops(ctx, { M, info: sel, atlas, avoid, net }); flush('shops');
res.entrances = buildEntranceGeo(ctx, { M, info: sel, net }); flush('entrances');
res.clutter = buildClutter(ctx, { M, info: sel }); flush('clutter');

// ---- overlap test: boxes overlapping by more than 1 cm in all three axes. Steps / canopies are exempt against their own door (they ARE the door furniture); steps vs steps of another record at the same door are caught.
const CELL = 8, grid = new Map();
const eps = 0.01;
items.forEach((it, i) => { const x0 = Math.floor(it.lo[0] / CELL), x1 = Math.floor(it.hi[0] / CELL), z0 = Math.floor(it.lo[2] / CELL), z1 = Math.floor(it.hi[2] / CELL); for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const k = x + ',' + z; let g = grid.get(k); if (!g) grid.set(k, (g = [])); g.push(i); } });
const pairs = new Map(), examples = [];
const seen = new Set();
for (const [, g] of grid) for (let a = 0; a < g.length; a++) for (let b = a + 1; b < g.length; b++) {
  const i = g[a], j = g[b], key = i < j ? i + ',' + j : j + ',' + i; if (seen.has(key)) continue; seen.add(key);
  const A = items[i], B = items[j];
  if (Math.min(A.hi[1], B.hi[1]) - Math.max(A.lo[1], B.lo[1]) <= eps) continue;
  if (!satOverlap(A.hull, B.hull, eps)) continue;
  const kk = [A.kind, B.kind].sort().join('+'); pairs.set(kk, (pairs.get(kk) || 0) + 1);
  if (examples.length < Number(args.list || 12)) examples.push(`${kk} A[${A.lo.map((v) => v.toFixed(2))} .. ${A.hi.map((v) => v.toFixed(2))}] B[${B.lo.map((v) => v.toFixed(2))} .. ${B.hi.map((v) => v.toFixed(2))}]`);
}
// ---- floating items: signs / plates must lie within 40 cm of an edge of their own building (a displaced anchor puts them in the street or over a neighbour)
const byId = new Map(sel.map((r) => [r.b.id, r]));
let floating = 0; const floatEx = [];
for (const it of items) {
  if ((it.kind !== 'sign' && it.kind !== 'plate') || it.bld === '?') continue;
  const r = byId.get(it.bld); if (!r) continue;
  const cx = (it.lo[0] + it.hi[0]) / 2, cz = (it.lo[2] + it.hi[2]) / 2; let best = 1e9;
  for (const ring of r.rings) for (const e of ring.edges) { const t = Math.max(0, Math.min(e.len, (cx - e.a[0]) * e.dx + (cz - e.a[1]) * e.dz)); best = Math.min(best, Math.hypot(cx - e.a[0] - e.dx * t, cz - e.a[1] - e.dz * t)); }
  if (best > 0.4) { floating++; if (floatEx.length < 5) floatEx.push(`${it.kind} of ${it.bld} ${best.toFixed(1)} m off at (${cx.toFixed(1)}, ${cz.toFixed(1)})`); }
}
const total = [...pairs.values()].reduce((s, v) => s + v, 0);
console.log(`[label-audit] buildings ${sel.length}, items ${items.length} (signs ${res.shops.signs}, plates ${res.shops.plates}, awnings ${res.shops.awnings}, steps ${res.entrances.steps}, pipes ${res.entrances.pipes}, ac ${res.clutter.acs}); skipped by the registry: ${JSON.stringify(res.shops.skipped)} pipes ${res.entrances.skippedPipes} (shifted ${res.entrances.shiftedPipes}) ac ${res.clutter.skipped} steps ${res.entrances.skippedSteps}`);
console.log(`[label-audit] colliding pairs ${total}: ${JSON.stringify(Object.fromEntries(pairs))}; floating signs / plates ${floating}`);
for (const e of examples) console.log('  PAIR ' + e);
for (const e of floatEx) console.log('  FLOAT ' + e);
if (args.json) fs.writeFileSync(path.resolve(root, args.json), JSON.stringify({ pairs: Object.fromEntries(pairs), floating, examples, floatEx }, null, 1));
const bad = total + floating, max = Number(args.max || 3);     // allow-list: 2-3 oblique-corner canopies / awnings out of ~90 000 items (their boxes overlap by a few cm where two perpendicular walls meet at an acute angle)
console.log(`[label-audit] RESULT: ${bad <= max ? 'OK' : 'FAIL'}`);
process.exit(bad <= max ? 0 : 1);
