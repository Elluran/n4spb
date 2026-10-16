// tools/landmarksBotanicalGarden-houses.mjs - prints the baked footprints of the buildings of landmarksBotanicalGarden in their own minimum-area box frame: the long front that faces SOUTH
// (or the long side's other normal with --north) is local +z (out), local x runs along it to the right as seen from outside.  Output: centre, the Parts.push rotation, the ring in local metres.
// usage: node tools/landmarksBotanicalGarden-houses.mjs [--north] [id ...]      (default: every building of the module)
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = globalThis;
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksBotanicalGarden/frame.js')).href);
const args = process.argv.slice(2), north = args.includes('--north'), list = args.filter((a) => !a.startsWith('--'));
for (const id of list.length ? list : Object.values(F.IDS)) {
  const b = L.buildingById(id);
  if (!b) { console.log(id, 'MISSING'); continue; }
  const ring = F.ringOf(id), o = F.obbOf(ring);
  let nx = -o.uz, nz = o.ux; if ((nz > 0) === north) { nx = -nx; nz = -nz; }
  const fr = new F.Frame(o.cx, o.cz, Math.atan2(nx, nz));
  console.log(`${id} ${b.name || ''} kind=${b.kind} h=${b.h} levels=${b.levels} roof=${b.roof} colour=${b.colour} area=${Math.round(b.area)}  centre (${o.cx.toFixed(1)}, ${o.cz.toFixed(1)}) long ${o.len.toFixed(1)} x ${o.wid.toFixed(1)}  normal (${nx.toFixed(3)}, ${nz.toFixed(3)})  rot ${fr.rot.toFixed(4)}`);
  console.log('  ring (local x, z):', ring.map((p) => fr.l(p[0], p[1]).map((v) => v.toFixed(1)).join(',')).join(' | '));
}
