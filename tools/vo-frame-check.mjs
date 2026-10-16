// vo-frame-check.mjs - does the play area (the union of the PLAY rectangles of tools/osm-lib.mjs) hold the WHOLE of Vasilievsky Island?
//   node tools/vo-frame-check.mjs [--step 3] [--json out.json]
// Reads the island polygon docs/reference/vo-island-polygon.json (OSM relation 1576083, 684 points, local frame) and prints
//   1. the share of the polygon inside the union (sampling step in m; target >= 99.5 %, exit 1 below it or when a polygon vertex is outside),
//   2. the table of the rectangles V3..V12: box, area, polygon area inside, new ground (not held by an earlier rectangle),
//   3. the margin of water between the shore line and the boundary of the union (min / 5 % / median, m),
//   4. named streets of the raw roads layer (data/osm-raw/roads.json, when present) whose length leaves the union (the ZSD viaducts run on over the Gulf),
//   5. named bridges of the raw bridges layer that touch the island and leave the union (none expected).
// Written for docs/reference/vo-frame.md; rerun it after any change of the V rectangles.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const lib = await import(pathToFileURL(ROOT + 'tools/osm-lib.mjs').href);
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const S = Number(arg('step', 3));
const poly = JSON.parse(fs.readFileSync(ROOT + 'docs/reference/vo-island-polygon.json', 'utf8')).points;
const inside = (x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const names = lib.RECT_NAMES, R = lib.PLAY_RECTS;
const iv = names.indexOf('V3');
if (iv < 0) { console.log('no rectangle V3: the frame is not in tools/osm-lib.mjs'); process.exit(1); }
const old = R.slice(0, iv), V = R.slice(iv);
const inR = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
let tot = 0, cov = 0, covOld = 0;
const per = V.map(() => ({ poly: 0, fresh: 0 }));
for (let x = -9710; x < -2430; x += S) for (let z = -2460; z < 1560; z += S) {
  const cx = x + S / 2, cz = z + S / 2; if (!inside(cx, cz)) continue; tot++;
  const o = old.some((r) => inR(r, cx, cz)); let any = o;
  V.forEach((r, i) => { if (inR(r, cx, cz)) { any = true; per[i].poly++; if (!o) per[i].fresh++; } });
  if (any) cov++; if (o) covOld++;
}
const km2 = (n) => n * S * S / 1e6, pct = 100 * cov / tot;
console.log(`island polygon ${km2(tot).toFixed(3)} km2 (step ${S} m): ${pct.toFixed(3)} % inside the union of the ${R.length} PLAY rectangles (${(100 * covOld / tot).toFixed(2)} % inside the ${old.length} older ones)`);
const vOut = poly.filter(([x, z]) => !R.some((r) => inR(r, x, z)));
console.log(`polygon vertices outside the union: ${vOut.length} of ${poly.length}${vOut.length ? ' ' + JSON.stringify(vOut.slice(0, 10)) : ''}`);
const rows = V.map((r, i) => ({ name: names[iv + i], box: `x ${r.x0}..${r.x1}, z ${r.z0}..${r.z1}`, areaKm2: +((r.x1 - r.x0) * (r.z1 - r.z0) / 1e6).toFixed(2), polygonKm2: +km2(per[i].poly).toFixed(2), polygonPct: Math.round(100 * km2(per[i].poly) / ((r.x1 - r.x0) * (r.z1 - r.z0) / 1e6)), newGroundKm2: +km2(per[i].fresh).toFixed(2) }));
console.table(rows);
const margins = [];
for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 25)); for (let k = 0; k < n; k++) margins.push(lib.distToBoundary(R, a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n)); }
margins.sort((p, q) => p - q);
console.log(`shore margin to the boundary of the union (m): min ${margins[0].toFixed(0)}, 5 % ${margins[Math.floor(margins.length * 0.05)].toFixed(0)}, median ${margins[Math.floor(margins.length / 2)].toFixed(0)}`);
const near = (x, z) => inside(x, z);
const rawLayer = (n) => { const f = ROOT + 'data/osm-raw/' + n + '.json'; return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).elements : null; };
const roads = rawLayer('roads');
if (roads) {
  const byName = new Map(); let ways = 0;
  for (const e of roads) {
    const t = e.tags || {}; if (e.type !== 'way' || !t.highway || !t.name || !e.geometry) continue;
    const pts = e.geometry.map((p) => lib.proj(p.lon, p.lat)); if (!pts.some((p) => near(p[0], p[1]))) continue; ways++;
    let out = 0, len = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); len += l; if (!lib.inPlay((pts[i][0] + pts[i - 1][0]) / 2, (pts[i][1] + pts[i - 1][1]) / 2)) out += l; }
    const o = byName.get(t.name) || { len: 0, out: 0 }; o.len += len; o.out += out; byName.set(t.name, o);
  }
  const leaving = [...byName.entries()].filter(([, o]) => o.out > 1);
  console.log(`named streets touching the island: ${byName.size} names in ${ways} ways; ${leaving.length} leave the union: ${leaving.map(([n, o]) => `${n} (${Math.round(o.out)} m of ${Math.round(o.len)})`).join('; ') || 'none'}`);
} else console.log('(data/osm-raw/roads.json is not here: the street check is skipped)');
const bridges = rawLayer('bridges');
if (bridges) {
  const bad = [];
  for (const e of bridges) { const t = e.tags || {}; if (e.type !== 'way' || !t.name || !e.geometry || !(t.bridge && t.bridge !== 'no')) continue; const pts = e.geometry.map((p) => lib.proj(p.lon, p.lat)); if (!pts.some((p) => near(p[0], p[1]))) continue; const out = pts.filter((p) => !lib.inPlay(p[0], p[1])).length; if (out) bad.push(`${t.name} w${e.id} (${out} of ${pts.length} vertices outside)`); }
  console.log(`named bridges touching the island that leave the union: ${bad.join('; ') || 'none'}`);
}
if (process.argv.includes('--json')) fs.writeFileSync(arg('json'), JSON.stringify({ coveragePct: pct, polygonKm2: km2(tot), rows, margins: { min: margins[0], median: margins[Math.floor(margins.length / 2)] } }, null, 1));
process.exit(pct >= 99.5 && !vOut.length ? 0 : 1);
