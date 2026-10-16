// tools/streets-fillet-probe.mjs - fast (data only, ~20 s, no scene) answer to "which way / corner patch draws pavement over this point?" (streets/walks.js buildWalks run against a collecting builder).
// Written for the roads-surface-audit cause `pavement-paver/paired-carriageway` / `corner-patch` on a fillet sample (islands round 2, streets owner 2): the audit needs the whole scene (12 min), this
// probe needs the street network only.
//   usage: node tools/streets-fillet-probe.mjs x,z [x,z ...] [--r 1.5] [--noisl] [--all]
//   per point: the net.cover value, the ways within 25 m (id, class, half widths) and every pavement triangle (strip of a way side / corner patch of a fillet) that contains the point or lies within --r metres of it;
//   with --all (and no point) every pavement triangle whose centroid is on asphalt (net.cover > 0.15, the fillets included) is listed per way: the audit's offenders of this kind for the whole network.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
globalThis.window = globalThis; globalThis.self = globalThis;
const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
if (argv.includes('--noisl')) globalThis.location = { search: '?st=noisl' };
const R = Number(flag('r', 1.5)), ALL = !!flag('all', false);
const pts = argv.filter((a) => /^-?\d/.test(a) && a.includes(',')).map((a) => a.split(',').map(Number));
const L = await imp('src/world/layout.js');
const { buildNet } = await imp('src/world/streets/net.js');
const { buildWalks } = await imp('src/world/streets/walks.js');
const net = buildNet(L);
let tag = null;
const T = [];
const mk = (name) => { const V = []; return { vert: (x, y, z) => V.push([x, z]) - 1, tri: (a, b, c) => T.push({ b: name, tag, t: [...V[a], ...V[b], ...V[c]] }), quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }, empty: true }; };
const MBs = { slab: mk('slab'), paver: mk('paver'), strip: mk('strip'), ramp: mk('ramp'), skirt: mk('skirt'), paint: mk('paint') };
buildWalks(net, MBs, { isOwned: () => false, nearStop: () => false, trace: (o, side) => { tag = o.arms ? { fillet: o.ways.map((w) => w.id).join('+') } : { way: o.id, side }; } });
const inTri = (t, x, z, m = 0) => { const [ax, az, bx, bz, cx, cz] = t, d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-12) return false; const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, l3 = 1 - l1 - l2; return !(l1 < -m || l2 < -m || l3 < -m); };
const cen = (t) => [(t[0] + t[2] + t[4]) / 3, (t[1] + t[3] + t[5]) / 3];
console.log(`${T.length} pavement triangles (${net.fillets.length} fillets, ${net.ways.length} ways)`);
for (const [x, z] of pts) {
  console.log(`== (${x}, ${z})  cover ${net.cover(x, z, {}).toFixed(2)}  noFillets ${net.cover(x, z, { noFillets: true }).toFixed(2)}`);
  net.each(x, z, 25, (w, i) => { if (!w._pp) { w._pp = 1; console.log(`  way ${w.id} ${w.hw} "${w.name || ''}" rank ${w.rank} oneway ${w.oneway} hL ${w.hL[i].toFixed(2)} hR ${w.hR[i].toFixed(2)} n ${w.n} start ${w.x[0].toFixed(0)},${w.z[0].toFixed(0)} end ${w.x[w.n - 1].toFixed(0)},${w.z[w.n - 1].toFixed(0)}`); } });
  for (const w of net.ways) delete w._pp;
  for (const e of T) {
    const hit = inTri(e.t, x, z, 0), nearHit = !hit && R > 0 && [[R, 0], [-R, 0], [0, R], [0, -R]].some(([dx, dz]) => inTri(e.t, x + dx, z + dz, 0));
    if (hit || nearHit) console.log(`  ${hit ? 'ON ' : 'near'} ${e.b} ${JSON.stringify(e.tag)} tri ${e.t.map((v) => v.toFixed(1)).join(' ')}`);
  }
}
if (ALL && !pts.length) {
  const by = new Map();
  for (const e of T) { if (e.b === 'skirt' || e.b === 'paint' || e.b === 'ramp') continue; const [cx, cz] = cen(e.t); if (!L.inPlay(cx, cz)) continue; if (net.cover(cx, cz, {}) > 0.15) { const k = JSON.stringify(e.tag); let l = by.get(k); if (!l) by.set(k, (l = [])); l.push([cx, cz]); } }
  for (const [k, l] of by) console.log(`  ${k}: ${l.length} triangles on asphalt, first ${l[0].map((v) => v.toFixed(1)).join(',')}`);
  console.log(`${by.size} tags`);
}
process.exit(0);
