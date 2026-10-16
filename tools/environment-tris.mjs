// tools/environment-tris.mjs - triangles the environment module puts on the GPU at a few camera positions (instanced meshes are not frustum-culled: counted as drawn when count > 0 and visible)
// usage: node tools/environment-tris.mjs [--top 12]
import { env, ctx, L, ms } from './environment-harness.mjs';
const args = process.argv.slice(2), TOP = args.includes('--top') ? Number(args[args.indexOf('--top') + 1]) : 8;
const SPOTS = { hero: [L.HERO.x, L.HERO.z], nevsky_gd: [-1020, -190], kazan: [-1490, -280], palace_sq: [-2000, -700], isaac: [-2424, 20], admiralty: [-2335, -495], moika: [-1700, -640], fontanka: [-440, -80] };
const tris = (o) => { const g = o.geometry; return (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? (o.count || 0) : 1); };
console.log('build ms', ms);
for (const [name, [x, z]] of Object.entries(SPOTS)) {
  ctx.camera.position.set(x, 1.7, z); ctx.camera.updateMatrixWorld(true);
  for (const f of ctx._updates) f(0.05, 100);
  for (const f of ctx._updates) f(0.05, 100.05);
  const by = {}; let total = 0, calls = 0;
  ctx.scene.traverse((o) => { if (!o.isMesh || o.visible === false) return; let v = true; for (let p = o.parent; p; p = p.parent) if (p.visible === false) { v = false; break; } if (!v) return; if (o.isInstancedMesh && !o.count) return; const n = tris(o); const m = /^env-(tree|trunk)-.*-(d)$/.exec(o.name), k = m ? 'env-' + m[1] + '-L' + m[2] : o.name.replace(/-d+$/, ''); by[k] = (by[k] || 0) + n; total += n; calls++; });
  const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([k, v]) => `${k.replace('env-', '')} ${Math.round(v / 1000)}k`).join(', ');
  console.log(`${name.padEnd(10)} ${Math.round(total / 1000)}k tris, ${calls} draws | ${top}`);
}
