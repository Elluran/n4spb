// tools/petrovsky-bridge-medians.mjs - why does roads-surface-audit report bare ground / paver in a strip between two one-way carriageways near the Betancourt Bridge ends?
// Builds the street network from the data only (buildNet, a few seconds, no scene) and lists, for each probe point, the ways within R m (id, hw, width, left / right half width, direction)
// and the strip patches (net.patches) that cover the point.   usage: node tools/petrovsky-bridge-medians.mjs x,z[,R] [x,z[,R] ...]
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
globalThis.window = globalThis; globalThis.self = globalThis;
const L = await imp('src/world/layout.js');
const { buildNet } = await imp('src/world/streets/net.js');
const { isOpen } = await imp('src/world/streets/region.js');
const net = buildNet(L);
const ringHas = (o, x, z) => { let ins = false; for (let i = 0, j = o.length - 1; i < o.length; j = i++) { const a = o[i], b = o[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
for (const arg of process.argv.slice(2)) {
  const [x, z, R = 14] = arg.split(',').map(Number);
  console.log(`== (${x}, ${z}) r=${R} open=${isOpen(x, z)} cover=${net.cover ? net.cover(x, z).toFixed(2) : '?'}`);
  for (const w of net.ways) {
    let best = 1e9, bi = 0;
    for (let i = 0; i + 1 < w.n; i++) { const dx = w.x[i + 1] - w.x[i], dz = w.z[i + 1] - w.z[i], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - w.x[i]) * dx + (z - w.z[i]) * dz) / l2)), d = Math.hypot(x - w.x[i] - dx * t, z - w.z[i] - dz * t); if (d < best) { best = d; bi = i; } }
    if (best > R) continue;
    console.log(`  ${w.id} ${w.hw} "${w.name || ''}" rank ${w.rank} oneway ${w.oneway} bridge ${w.bridge} skipDraw ${!!w.skipDraw} n ${w.n} d=${best.toFixed(1)} hL ${w.hL[bi].toFixed(2)} hR ${w.hR[bi].toFixed(2)} dir ${w.tx[bi].toFixed(2)},${w.tz[bi].toFixed(2)} start ${w.x[0].toFixed(0)},${w.z[0].toFixed(0)} end ${w.x[w.n - 1].toFixed(0)},${w.z[w.n - 1].toFixed(0)} med ${w.med ? w.med[bi] : '-'}`);
  }
  const pt = (net.patches || []).filter((f) => ringHas(f.poly, x, z));
  console.log(`  patches covering: ${pt.length} of ${(net.patches || []).length}`);
  for (const f of (net.patches || [])) if (f.box[0] <= x + R && f.box[1] >= x - R && f.box[2] <= z + R && f.box[3] >= z - R) console.log(`    nearby patch ${f.ways.map((w) => w.id).join('+')} box ${f.box.map((v) => v.toFixed(0)).join(',')} pts ${f.poly.length}`);
}
process.exit(0);
