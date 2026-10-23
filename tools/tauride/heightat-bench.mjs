// heightat-bench.mjs - what does layout.heightAt cost at start-up over the lattice of the garden box? (docs/TAURIDE-REMAKE.md T2: the scout measured 70 ms for 82,500 calls with the Paradny patch; the garden relief
// must stay within +30 % of it). A child of tools/tauride-height-test.mjs, also usable alone:
//   node tools/area.mjs north tools/tauride/heightat-bench.mjs [--mode full|paradny|old]      the North (modes: the page's patch list | only the Paradny patch (= before T2) | no patch)
//   node tools/tauride/heightat-bench.mjs                                                       the strip (HEIGHT_PATCHES = []: the code path of heightAt is the same bytes as before T2)
// Prints ONE JSON line: { area, mode, patches, calls, coldMs (the first pass of this process: cold caches and JIT), warmMs (best of 9 later passes), sum (a checksum so that nothing is optimised away) }.
//   --repeat N   (T2 fix round 1) the gate measure: N fresh processes per mode, the modes interleaved (old, paradny, full for the North), then ONE line with the mean / median / min of coldMs and warmMs per mode and
//                "full vs paradny" in per cent (the gate of the plan: within +30 % of before T2 = the Paradny patch alone). A single process is noisy by +-1 ms on a quiet machine and the JIT adds more on a busy one:
//                use N >= 25 and run it when nothing else does. Take the numbers of the median.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
if (arg('repeat', null)) {
  const N = Number(arg('repeat')), north = (process.env.AREA || 'strip') === 'north', modes = north ? ['old', 'paradny', 'full'] : ['full'], res = Object.fromEntries(modes.map((m) => [m, { cold: [], warm: [] }]));
  for (let k = 0; k < N; k++) for (const m of modes) {
    const r = spawnSync(process.execPath, north ? [path.join(root, 'tools/area.mjs'), 'north', fileURLToPath(import.meta.url), '--mode', m] : [fileURLToPath(import.meta.url), '--mode', m], { encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=8000' } });
    try { const j = JSON.parse(r.stdout.trim().split('\n').pop()); res[m].cold.push(j.coldMs); res[m].warm.push(j.warmMs); } catch (e) { console.error('bad output of a child: ' + r.stdout + r.stderr); process.exit(2); }
  }
  const st = (a) => { const s = a.slice().sort((x, y) => x - y); return { mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), median: +s[s.length >> 1].toFixed(2), min: +s[0].toFixed(2), max: +s[s.length - 1].toFixed(2) }; };
  const out = { area: process.env.AREA || 'strip', repeat: N, modes: Object.fromEntries(modes.map((m) => [m, { cold: st(res[m].cold), warm: st(res[m].warm) }])) };
  if (north) { const p = out.modes.paradny, f = out.modes.full, pc = (a, b) => +((a / b - 1) * 100).toFixed(1); out.fullVsParadnyPercent = { coldMean: pc(f.cold.mean, p.cold.mean), coldMedian: pc(f.cold.median, p.cold.median), warmMean: pc(f.warm.mean, p.warm.mean), warmMedian: pc(f.warm.median, p.warm.median), addedColdMs: +(f.cold.median - p.cold.median).toFixed(2), gate: 30 }; out.fullVsParadnyPercent.pass = out.fullVsParadnyPercent.coldMedian <= 30; }      // T4a fix round 1: the verdict is part of the line (the T4a terrain breaches the gate: the garden patch hull is 97 % of the garden box, see docs/TAURIDE-REMAKE.md)
  console.log(JSON.stringify(out));
  process.exit(0);
}
const AT = await import(pathToFileURL(path.join(root, 'src/world/lib/area-tables.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const mode = arg('mode', 'full'), live = AT.HEIGHT_PATCHES;
if (mode === 'paradny') for (let i = live.length - 1; i >= 0; i--) if (live[i].id !== 'paradny') live.splice(i, 1);
if (mode === 'old') live.length = 0;
const pts = [];
for (let x = 915; x <= 1500; x += 2) for (let z = -1800; z <= -1250; z += 2) pts.push(x, z);
const pass = () => { let s = 0; for (let i = 0; i < pts.length; i += 2) s += L.heightAt(pts[i], pts[i + 1]); return s; };
const t0 = performance.now(); let sum = pass(); const cold = performance.now() - t0;
let best = Infinity; for (let k = 0; k < 9; k++) { const t = performance.now(); sum += pass(); best = Math.min(best, performance.now() - t); }
console.log(JSON.stringify({ area: process.env.AREA || 'strip', mode, patches: live.map((p) => p.id), calls: pts.length / 2, coldMs: +cold.toFixed(2), warmMs: +best.toFixed(2), sum: +sum.toFixed(3) }));
