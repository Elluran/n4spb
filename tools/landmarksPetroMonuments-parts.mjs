// tools/landmarksPetroMonuments-parts.mjs - prints the triangles / position of every piece of landmarksPetroMonuments (headless, the module alone): usage: node tools/landmarksPetroMonuments-parts.mjs
// Reads the check.mjs harness through a thin wrapper: PM_DEBUG=1 prints; here we import check's ctx builder indirectly by running check with the env var and reading svc.parts through a global.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = spawnSync(process.execPath, [path.join(root, 'tools/check.mjs'), 'landmarksPetroMonuments'], { env: { ...process.env, PM_DEBUG: '2', NODE_OPTIONS: '--max-old-space-size=14000' }, encoding: 'utf8' });
const lines = (r.stdout || '').split('\n').filter((l) => l.startsWith('PM_PART'));
const rows = lines.map((l) => JSON.parse(l.slice(8)));
rows.sort((a, b) => b.tris - a.tris);
let sum = 0; for (const p of rows) { sum += p.tris; console.log(String(p.tris).padStart(7), p.key.padEnd(14), p.id.padEnd(14), p.x, p.z); }
console.log('total', sum, 'pieces', rows.length);

// cameras: node tools/landmarksPetroMonuments-parts.mjs --cams key1,key2 [--d 6 --pitch 5]: walking-eye cameras d metres in front of the piece looking at it (for tools/shot.mjs --cams)
const a = process.argv.slice(2), ci = a.indexOf('--cams');
if (ci >= 0) {
  const keys = a[ci + 1].split(','), di = a.indexOf('--d'), d = di >= 0 ? Number(a[di + 1]) : 6, pi = a.indexOf('--pitch'), pitch = pi >= 0 ? Number(a[pi + 1]) : 6;
  console.log(keys.map((k) => { const p = rows.find((r) => r.key === k); if (!p) return 'missing:' + k; return [(p.x + Math.sin(p.yaw) * d).toFixed(1), (p.z + Math.cos(p.yaw) * d).toFixed(1), (p.yaw * 180 / Math.PI).toFixed(1), pitch].join(','); }).join(';'));
}
