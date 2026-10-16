// node tools/models-test.mjs : builds every vehicle model (both LODs) and prints triangle counts + bounds (no GPU)
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ARCH } = await import(pathToFileURL(path.join(root, 'src/world/traffic/fleetdata.js')).href);
const { makeModel, triCount } = await import(pathToFileURL(path.join(root, 'src/world/traffic/models.js')).href);
for (const k of Object.keys(ARCH)) {
  const row = [k.padEnd(10)];
  for (const lod of [0, 1]) {
    const m = makeModel(k, lod); m.paint.computeBoundingBox(); const b = m.paint.boundingBox;
    row.push(`L${lod}: paint ${triCount(m.paint)} glass ${triCount(m.glass)} lamps ${triCount(m.lamps)}`);
    if (lod === 0) row.push(`size ${(b.max.x - b.min.x).toFixed(2)} x ${(b.max.y - b.min.y).toFixed(2)} x ${(b.max.z - b.min.z).toFixed(2)} (want ${ARCH[k].wid} x ${ARCH[k].hgt} x ${ARCH[k].len})`);
  }
  console.log(row.join(' | '));
}
