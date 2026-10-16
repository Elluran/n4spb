// tools/landmarksZhdanovka-measure.mjs - prints the footprints (ring, edges with outward normals) of the four houses of the Zhdanovskaya embankment from the baked data.
// usage: node tools/landmarksZhdanovka-measure.mjs [h9|h7|h11|h3]
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksZhdanovka/frame.js')).href);
const want = process.argv[2];
for (const [k, id] of Object.entries(F.HOUSES)) {
  if (want && want !== k) continue;
  const fp = F.footprint(id);
  if (!fp) { console.log(k, id, 'MISSING'); continue; }
  const b = fp.b;
  console.log(`== ${k} ${id} verts=${fp.ring.length} levels=${b.levels ?? b.l ?? '?'} keys=${Object.keys(b).join(',')} holes=${(fp.poly.h || []).length}`);
  fp.edges.forEach((e) => console.log(`  e${e.i} len=${e.len.toFixed(1)} n=(${e.n[0].toFixed(2)},${e.n[1].toFixed(2)}) a=(${e.a[0].toFixed(1)},${e.a[1].toFixed(1)}) b=(${e.b[0].toFixed(1)},${e.b[1].toFixed(1)})`));
}
