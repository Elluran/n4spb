// tools/petrovsky-bridge-piers.mjs - which pier positions of the Betancourt approach are free (not on a carriageway, not inside a building): node tools/petrovsky-bridge-piers.mjs
import { makeCtx } from './petrovsky-bridge-env.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { L } = await makeCtx(['bridges']);
const { betanRoute } = await import(pathToFileURL(path.join(root, 'src/world/bridges/petrovsky/betancourt.js')).href);
const R = betanRoute();
for (let s = 30; s < 430; s += 14) {
  const row = [];
  for (const v of [-12, -10, -8.4, -6, 6, 8.4, 10, 12]) { const p = R.pos(s, v); row.push(L.insideBuilding(p.x, p.z, 1.4) ? 'B' : L.isOnRoad(p.x, p.z, 1.7) ? 'R' : '.'); }
  console.log(String(s).padStart(4), row.join(' '));
}
process.exit(0);
