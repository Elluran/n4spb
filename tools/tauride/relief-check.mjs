// The authoring loop of the Tauride relief (docs/TAURIDE-REMAKE.md T2): run the rules of lib/relief-rules.mjs against the relief data and print every violation.
//   node tools/tauride/relief-check.mjs [--features path/to/relief.js] [--step 1]
// tools/tauride-height-test.mjs asserts the same rules (against the real built module); this is the fast version without three.js.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, parseArgs } from './lib/common.mjs';
import { checkMargins, slopes, MARGINS, MAX_SLOPE } from './lib/relief-rules.mjs';

const args = parseArgs();
const relMod = await import(pathToFileURL(path.resolve(ROOT, String(args.features ?? 'src/world/landmarksTauride/data/relief.js'))).href);
const { makeGardenHeight } = await import(pathToFileURL(path.join(ROOT, 'src/world/landmarksTauride/height.js')).href);
const gh = makeGardenHeight(relMod.FEATURES, relMod.RELIEF_BOX);
const step = Number(args.step ?? 1);
const m = checkMargins(gh, undefined, step);
console.log(`${relMod.FEATURES.length} features; ${m.lifted} lifted cells of ${m.cells} (step ${step} m), highest ${m.maxH.toFixed(2)} m`);
let bad = 0;
for (const k of Object.keys(MARGINS)) { const v = m.violations.find((q) => q.rule === k); if (v) { bad++; console.log(`  FAIL margin ${k} ${MARGINS[k]} m: ${v.n} cells, worst ${v.worst} m at ${JSON.stringify(v.at)} (h ${v.h})`); } else console.log(`  ok   margin ${k} ${MARGINS[k]} m`); }
const s = slopes(gh);
const lo = s.land.max <= MAX_SLOPE, wo = s.ways.max <= MAX_SLOPE;
console.log(`  ${lo ? 'ok  ' : 'FAIL'} land slope max ${s.land.max.toFixed(3)} at ${JSON.stringify(s.land.at)} (limit ${MAX_SLOPE})`);
console.log(`  ${wo ? 'ok  ' : 'FAIL'} ways slope max ${s.ways.max.toFixed(3)} at ${JSON.stringify(s.ways.at)} way ${s.ways.id}`);
for (const f of relMod.FEATURES) {
  const per = Math.max(f.rx, f.rz), minr = Math.min(f.rx, f.rz), w = minr * (1 - (f.top || 0)), peak = 1.5 * f.h / w;
  console.log(`    ${f.key} ${f.id}: h ${f.h}, ${f.rx}x${f.rz} rot ${f.rot || 0} top ${f.top || 0}, design peak slope ${peak.toFixed(3)}`);
  void per;
}
process.exit(bad || !lo || !wo ? 1 : 0);
