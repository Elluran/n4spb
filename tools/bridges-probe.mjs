// Collider probe (in the real page, through tools/shot.mjs --eval): lists the physics items round given points and the walk surface there. For the bridge heads: what blocks a pavement, where a
// quay collider is missing beside a deck.
//   node tools/bridges-probe.mjs "x,z,r;x,z,r" [--only environment,streets,city,bridges]
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pts = (process.argv[2] || '').split(';').map((s) => s.split(',').map(Number)).filter((p) => p.length >= 2 && p.every(Number.isFinite));
const oi = process.argv.indexOf('--only'), only = oi > 0 ? process.argv[oi + 1] : 'environment,streets,city,bridges';
const expr = `(() => {
  const ctx = window.__ctx, ph = ctx.physics, L = ctx.L, out = [];
  for (const [x, z, r = 4] of ${JSON.stringify(pts)}) {
    const items = [];
    for (const it of ph.items) {
      const R = it.type === 'cyl' ? it.r : Math.hypot(it.hw || 0, it.hd || 0);
      if (Math.hypot(it.cx - x, it.cz - z) > r + R) continue;
      if (it.type !== 'cyl' && R > 400) continue;
      items.push([it.type, +it.cx.toFixed(1), +it.cz.toFixed(1), it.type === 'cyl' ? +it.r.toFixed(2) : +(it.hw * 2).toFixed(1) + 'x' + +(it.hd * 2).toFixed(1), it.rot !== undefined ? +(it.rot * 180 / Math.PI).toFixed(0) : (it.c !== undefined ? +(Math.atan2(it.s, it.c) * 180 / Math.PI).toFixed(0) : 0), it.y0 !== undefined ? +(+it.y0).toFixed(1) : null, it.y1 !== undefined ? +(+it.y1).toFixed(2) : it.top !== undefined ? 'top ' + (+it.top).toFixed(2) : it.yA !== undefined ? 'ramp ' + (+it.yA).toFixed(2) + '..' + (+it.yB).toFixed(2) : null, it.name || '']);
    }
    const S = ph.surfaceAt(x, z, 2, false, {});
    out.push({ at: [x, z], surface: S && Number.isFinite(S.y) ? [+S.y.toFixed(2), S.kind] : null, height: +L.heightAt(x, z).toFixed(2), water: L.waterwayAt ? L.waterwayAt(x, z) : null, deck: ctx.services.bridges ? ctx.services.bridges.deckY(x, z) : null, items });
  }
  return out;
})()`;
const r = spawnSync('node', [path.join(root, 'tools/shot.mjs'), '--only', only, '--cams', '-1493,-90,0,2', '--out', 'shots/bridges/_probe', '--eval', expr], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const line = r.stdout.split('\n').find((l) => l.startsWith('eval:'));
if (!line) { console.log(r.stdout.slice(-2000), r.stderr.slice(-1500)); process.exit(1); }
for (const o of JSON.parse(line.slice(5))) {
  console.log(`--- (${o.at.join(', ')})  surface ${JSON.stringify(o.surface)}  heightAt ${o.height}  water ${o.water}  deck ${o.deck === null ? null : (+o.deck).toFixed(2)}`);
  for (const it of o.items) console.log('   ', it.join('  '));
}
