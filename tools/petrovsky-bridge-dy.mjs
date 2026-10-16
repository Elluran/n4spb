// tools/petrovsky-bridge-dy.mjs - headless deckY probe of the Petrovsky bridges (no browser, ~10 s): prints holes / jumps of deckY along an axis at lateral offsets v.
// usage: node tools/petrovsky-bridge-dy.mjs [betancourt|bolshoy|serny] [v1,v2,...] [step]
import { makeCtx } from './petrovsky-bridge-env.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const which = process.argv[2] || 'betancourt', vs = (process.argv[3] || '0,-8,8').split(',').map(Number), step = Number(process.argv[4] || 4);
const owners = []; Object.defineProperty(Object.prototype, 'deckAt', { configurable: true, set(f) { Object.defineProperty(this, 'deckAt', { value: f, writable: true, configurable: true, enumerable: true }); owners.push(this); } });
const { ctx } = await makeCtx(['bridges']);
const bm = await imp('src/world/bridges.js');
await bm.build(ctx);
const B = ctx.services.bridges;
let R;
if (which === 'betancourt') R = (await imp('src/world/bridges/petrovsky/betancourt.js')).betanRoute();
else if (which === 'bolshoy') R = (await imp('src/world/bridges/petrovsky/bolshoy.js')).bolshRoute();
for (const v of vs) {
  let line = '', prev = null, holes = [], jumps = [];
  for (let s = -14; s <= R.len + 14; s += step) {
    const p = R.pos(Math.max(0, Math.min(R.len, s)), v), d = s < 0 ? s : s > R.len ? s - R.len : 0, x = p.x + p.tx * d, z = p.z + p.tz * d, y = B.deckY(x, z);
    if (process.env.WHO) { const w = owners.filter((o) => o.deckAt(x, z) !== null).map((o) => o.id || '?').join('+'); if (w !== (globalThis.__lw || '')) { console.log('  s', s, 'v', v, 'answered by', w || '-', y); globalThis.__lw = w; } }
    if (y === null) holes.push(s); else if (prev !== null && Math.abs(y - prev) > 0.5) jumps.push([s, +prev.toFixed(2), +y.toFixed(2)]);
    prev = y;
  }
  console.log('v', v, 'holes at s', JSON.stringify(holes), 'jumps', JSON.stringify(jumps));
}
process.exit(0);
