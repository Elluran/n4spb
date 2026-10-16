// tools/bridges-krestovsky-aptekarsky-at.mjs - builds environment + bridges once and prints 1 m maps of what a walker meets round several points (. street level, v a drop, W water flag, # inside a collider, = a built deck
// at >= 0.3 m). usage: node tools/bridges-krestovsky-aptekarsky-at.mjs "x,z,r;x,z,r"   (headless, ~90 s)
import { makeEnv } from './bridges-krestovsky-aptekarsky-env.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ctx, L } = await makeEnv(['environment', 'bridges']);
const bm = await import(pathToFileURL(path.join(root, 'src/world/bridges.js')).href); const t0 = Date.now(); await bm.build(ctx); console.log('bridges build ms', Date.now() - t0, 'failed', JSON.stringify(ctx.services.bridges && ctx.services.bridges.failed));
const P = ctx.physics, B = ctx.services.bridges;
for (const spec of process.argv[2].split(';')) {
  const [cx, cz, rr] = spec.split(',').map(Number), r = rr || 10; console.log('--- at', cx, cz, 'r', r);
  for (let z = cz - r; z <= cz + r; z += 1) { let s = String(Math.round(z)).padStart(6) + ' '; for (let x = cx - r; x <= cx + r; x += 1) { const S = P.surfaceAt(x, z, 0.6, true, { y: 0, kind: null, item: null }), p = { x, z }; P.resolve(p, 0.3, 0, 1.7); const hit = Math.hypot(p.x - x, p.z - z) > 0.05; const dy = B && B.deckY ? B.deckY(x, z) : null; s += hit ? '#' : S.y < -0.5 ? (L.waterwayAt(x, z) ? 'W' : 'v') : (dy !== null && dy !== undefined ? '=' : '.'); } console.log(s); }
  console.log('        columns x', cx - r, '..', cx + r);
}
process.exit(0);
