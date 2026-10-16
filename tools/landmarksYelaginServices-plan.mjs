// tools/landmarksYelaginServices-plan.mjs - prints the baked OSM footprints of the Rossi service court (Stable, Orangery, the five houses) in the model frames of landmarksYelaginServices (ST, OR and the house frames):
// local x to the right of the main front, local z out of it (south-ish), metres.  These are the numbers of frame.js (STB, ORN) and of the rectangles in houses.js.  Also prints the world ring of the apse (w736544126).
// usage: node tools/landmarksYelaginServices-plan.mjs
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginServices/frame.js')).href);

function dump(title, fr, ids) {
  console.log(`== ${title}  origin (${fr.x}, ${fr.z})  rot ${(fr.rot * 180 / Math.PI).toFixed(2)} deg`);
  for (const id of ids) {
    const b = D.BUILDINGS.find((q) => q.id === id); if (!b) { console.log(id, 'missing'); continue; }
    for (const p of b.polys) {
      const pts = []; for (let i = 0; i < p.o.length; i += 2) { const q = F.toLocal(fr, p.o[i], p.o[i + 1]); pts.push(`${q.x.toFixed(1)},${q.z.toFixed(1)}`); }
      console.log(id, 'outer:', pts.join(' '));
      for (const h of p.h) { const hp = []; for (let i = 0; i < h.length; i += 2) { const q = F.toLocal(fr, h[i], h[i + 1]); hp.push(`${q.x.toFixed(1)},${q.z.toFixed(1)}`); } console.log(id, 'hole :', hp.join(' ')); }
    }
  }
}
dump('STABLE (ST)', F.ST, ['r2420060', 'w736544124', 'w736544126', 'w736544149']);
dump('ORANGERY (OR)', F.OR, ['w23150126', 'w736544144', 'w736544134', 'w736544122', 'w736544136', 'w736544128']);
dump('STONE STOREROOMS facing NNE', F.frameFacing(-4907, -5335, 0.344, -0.939), ['w181423911']);
dump('FRAULEIN HOUSE facing SSW', F.frameFacing(-4955, -5337, -0.35, 0.937), ['w100820382']);
dump('CAVALIER HOUSE facing N', F.frameFacing(-4902.65, -5380, 0, -1), ['w181423910']);
dump('GARDENER BUK HOUSE', { x: -4694.7, z: -5440.2, rot: 3.38 * Math.PI / 180 }, ['w181423909']);
dump('GLASS-BLOWING WORKSHOP', F.frameFacing(-4885, -5348, 0, 1), ['w181423904']);
