// tools/bridges-krestovsky-aptekarsky-leaks.mjs - finds the land / drop boundaries without a collider (leaks) round given points, in the real environment + bridges (headless, ~90 s), and prints them as simplified
// polylines [[x,z],...] ready for krestAptek2.js PATCHES.  A leak edge = a land cell (surface >= -0.5, not inside a collider) beside a drop cell (surface < -0.5, not inside a collider).
// usage: node tools/bridges-krestovsky-aptekarsky-leaks.mjs "x,z,r;x,z,r" [step in m, default 0.5]
import { makeEnv } from './bridges-krestovsky-aptekarsky-env.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ctx, L } = await makeEnv(['environment', 'bridges']);
const bm = await import(pathToFileURL(path.join(root, 'src/world/bridges.js')).href); await bm.build(ctx);
const P = ctx.physics, ST = Number(process.argv[3]) || 0.5;
const cls = (x, z) => { const S = P.surfaceAt(x, z, 0.6, true, { y: 0, kind: null, item: null }), p = { x, z }; P.resolve(p, 0.3, 0, 1.7); if (Math.hypot(p.x - x, p.z - z) > 0.05) return 'C'; return S.y < -0.5 ? 'D' : 'L'; };
for (const spec of process.argv[2].split(';')) {
  const [cx, cz, rr] = spec.split(',').map(Number), r = rr || 12, n = Math.round(2 * r / ST), grid = [];
  for (let j = 0; j <= n; j++) { const row = []; for (let i = 0; i <= n; i++) row.push(cls(cx - r + i * ST, cz - r + j * ST)); grid.push(row); }
  const E = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    for (const [di, dj] of [[1, 0], [0, 1]]) {
      const i2 = i + di, j2 = j + dj; if (i2 > n || j2 > n) continue;
      const a = grid[j][i], b = grid[j2][i2]; if (!((a === 'L' && b === 'D') || (a === 'D' && b === 'L'))) continue;
      E.push([cx - r + (i + i2) / 2 * ST, cz - r + (j + j2) / 2 * ST]);
    }
  }
  // chain by nearest neighbour
  const used = new Array(E.length).fill(false), chains = [];
  for (let s = 0; s < E.length; s++) {
    if (used[s]) continue; used[s] = true; const ch = [E[s]];
    for (const dirn of [1, -1]) { let cur = E[s]; for (;;) { let bi = -1, bd = ST * 2.1; for (let k = 0; k < E.length; k++) if (!used[k]) { const d = Math.hypot(E[k][0] - cur[0], E[k][1] - cur[1]); if (d < bd) { bd = d; bi = k; } } if (bi < 0) break; used[bi] = true; cur = E[bi]; if (dirn > 0) ch.push(cur); else ch.unshift(cur); } }
    chains.push(ch);
  }
  const simp = (pts, tol) => { if (pts.length < 3) return pts.length === 2 && Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]) < 0.01 ? [pts[0], pts[1]] : pts; let m = 0, md = -1; const a = pts[0], b = pts[pts.length - 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs((pts[i][0] - a[0]) * dz - (pts[i][1] - a[1]) * dx) / l; if (d > md) { md = d; m = i; } } if (md <= tol) return [a, b]; return simp(pts.slice(0, m + 1), tol).slice(0, -1).concat(simp(pts.slice(m), tol)); };
  console.log('--- at', cx, cz, 'r', r, 'leak edges', E.length, 'chains', chains.length);
  for (const ch of chains) { if (ch.length < 1) continue; const sp = simp(ch, 0.35).map((p) => [+p[0].toFixed(1), +p[1].toFixed(1)]); console.log(ch.length, 'pts ->', JSON.stringify(sp)); }
}
process.exit(0);
