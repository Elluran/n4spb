// tools/landmarksZhdanovka-plates.mjs - prints the ADDRESS_PLATES rows (src/world/streets/plates.js) for the four houses of the Zhdanovskaya embankment: the module claims the houses, so the streets owner
// hangs the standard plate pair (name plate above the number plate; y = centre of the number plate) at the wall points computed here: on the plain piers between two ground-floor windows.
// usage: node tools/landmarksZhdanovka-plates.mjs
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksZhdanovka/frame.js')).href);
// [house key, house number, edge near (x, z), pier lx along the edge from its left end, number-plate centre y]
const ROWS = [['h9', '9', [-3552.1, -2366.45], 10.08, 2.5], ['h7', '7', [-3530.05, -2347.8], 35.25, 2.5], ['h11', '11', [-3596.4, -2409.35], 24.2, 2.5], ['h3', '3', [-3472.9, -2298.9], 17.75, 2.5]];
const ids = F.HOUSES;
for (const [k, no, near, lx, y] of ROWS) {
  const fp = F.footprint(ids[k]), e = fp.edges[F.edgeNear(fp.edges, near[0], near[1])], f = F.edgeFrame(e), p = F.toWorld(f, lx, 0);
  console.log(`  { owner: 'landmarksZhdanovka', street: 'Ждановская набережная', no: '${no}', x: ${p.x.toFixed(2)}, z: ${p.z.toFixed(2)}, y: ${y}, nx: ${f.n[0].toFixed(4)}, nz: ${f.n[1].toFixed(4)} },   // ${k}: edge len ${f.len.toFixed(1)} m`);
}
