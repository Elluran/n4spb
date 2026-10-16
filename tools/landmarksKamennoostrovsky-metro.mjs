// tools/landmarksKamennoostrovsky-metro.mjs - does any wall of the houses of landmarksKamennoostrovsky cross the Petrogradskaya ticket hall (metro/st-petr.js: the room polygon in the escalator frame)
// or the shaft mouth?  Prints the world polygon, every footprint edge of r1256096 / r1256097 / r1257106 that enters it (with the entering interval) and the doorway on the west front.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const M = await imp('src/world/data/metro.js');
const L = await imp('src/world/layout.js');
const { ringEdges } = await imp('src/world/landmarksKamennoostrovsky/kit.js');
const E = M.ESC2.petrogradskaya, W = (x, z) => { const p = M.toWorld(E.eframe, x, z); return [p.x ?? p[0], p.z ?? p[1]]; };
const room = [[-16.94, -14], [5.6, -14], [5.6, 15], [-15.24, 15]].map(([x, z]) => W(x, z));
const shaft = [[-E.A, 0], [E.A, 0], [E.A, 13], [-E.A, 13]].map(([x, z]) => W(x, z));
const fmt = (r) => r.map((p) => `(${p[0].toFixed(1)}, ${p[1].toFixed(1)})`).join(' ');
console.log('head', E.head, 'e', E.e, 'A', E.A, '\nroom ', fmt(room), '\nshaft', fmt(shaft));
const inside = (poly, x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
let bad = 0;
for (const id of ['r1256096', 'r1256097', 'r1257106']) {
  const b = L.buildingById(id);
  for (const p of b.polys) for (const e of ringEdges(p, 0.05)) {
    let t0 = null, t1 = null; const n = Math.max(4, Math.ceil(e.len / 0.1));
    for (let i = 0; i <= n; i++) { const t = i / n, x = e.a[0] + (e.b[0] - e.a[0]) * t - e.n[0] * 0.3, z = e.a[1] + (e.b[1] - e.a[1]) * t - e.n[1] * 0.3; if (inside(room, x, z) && inside(room, x + e.n[0] * 0.6, z + e.n[1] * 0.6)) { if (t0 === null) t0 = t; t1 = t; } }
    if (t0 !== null) { bad++; console.log(`CROSSES the room: ${id} edge ${e.i} (${e.a[0].toFixed(1)}, ${e.a[1].toFixed(1)}) -> (${e.b[0].toFixed(1)}, ${e.b[1].toFixed(1)}) len ${e.len.toFixed(1)}: ${(t0 * e.len).toFixed(1)} .. ${(t1 * e.len).toFixed(1)} m`); }
  }
}
console.log(bad ? `RESULT: ${bad} wall(s) inside the ticket hall` : 'RESULT: OK (no wall of these houses stands inside the ticket hall)');
for (const d of M.DOORWAYS.filter((q) => q.station === 'petrogradskaya')) console.log('doorway', d.id, d.x, d.z, 'w', d.w, 'insideBuilding 1 m in:', L.insideBuilding(d.x + 0.9073, d.z - 0.4205));
