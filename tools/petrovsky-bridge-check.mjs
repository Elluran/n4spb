// tools/petrovsky-bridge-check.mjs - headless build of the bridges module WITHOUT the environment (fast, ~10 s): per-bridge triangles / info / failures of the Petrovsky group + the build time of bridges/petrovsky.js
// usage: node tools/petrovsky-bridge-check.mjs [--env (build the environment first: water queries are real, ~100 s)]
import { makeCtx, makeEnv } from './petrovsky-bridge-env.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ctx, L } = process.argv.includes('--env') ? await makeEnv(['environment', 'bridges']) : await makeCtx(['bridges']);
const bm = await import(pathToFileURL(path.join(root, 'src/world/bridges.js')).href);
const t0 = Date.now();
try { await bm.build(ctx); } catch (e) { console.log('BUILD ERROR', e.message.slice(0, 1500)); }
const B = ctx.services.bridges;
console.log('bridges build ms', Date.now() - t0, 'failed', B && B.failed.length);
const mine = ['betancourt', 'serny-bridge', 'bolshoy-petrovsky', 'whsd-petrovsky'];
for (const id of mine) { const e = B && B.list.find((b) => b.id === id); console.log(id, e ? 'listed' : 'MISSING', 'tris', B && B.stats.per[id], 'info', JSON.stringify((ctx.services[id] && ctx.services[id].info) || null)); }
console.log('total tris', B && B.stats.tris, 'masts', B && B.masts.filter((m) => mine.includes(m.id)).length);
const P = await import(pathToFileURL(path.join(root, 'src/world/bridges/petrovsky.js')).href);
const t1 = Date.now(); void P; void L;
process.exit(0);
