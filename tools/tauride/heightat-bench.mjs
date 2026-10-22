// heightat-bench.mjs - what does layout.heightAt cost at start-up over the lattice of the garden box? (docs/TAURIDE-REMAKE.md T2: the scout measured 70 ms for 82,500 calls with the Paradny patch; the garden relief
// must stay within +30 % of it). A child of tools/tauride-height-test.mjs, also usable alone:
//   node tools/area.mjs north tools/tauride/heightat-bench.mjs [--mode full|paradny|old]      the North (modes: the page's patch list | only the Paradny patch (= before T2) | no patch)
//   node tools/tauride/heightat-bench.mjs                                                       the strip (HEIGHT_PATCHES = []: the code path of heightAt is the same bytes as before T2)
// Prints ONE JSON line: { area, mode, patches, calls, coldMs (the first pass of this process: cold caches and JIT), warmMs (best of 9 later passes), sum (a checksum so that nothing is optimised away) }.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
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
