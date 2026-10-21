// The band-parity hook of tools/areas-test.mjs (docs/AREAS.md section 5.2, docs/AREAS-DATA.md section 5): bandParity({ gate, root, REGISTRY }) -> a list of problem strings (empty = fine).
// The North holds a one-sided 200 m band of the strip's own territory (x -420 .. 835, z -405 .. -205), so an arrival through the gates g1 / g2 lands on streets that exist on both pages. The comparison itself
// (every record of every array, clipped to the band, in the strip's facade and in the area's: same ids, fields and geometry) is check 4 of tools/area-data-test.mjs; this hook runs that test for the area on the
// OTHER side of the gate (once per area per process) and reports the band check, so a data cut that drifts from the strip fails `node tools/areas-test.mjs` as well.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const cache = new Map();
const CHECK = 'band parity: every array agrees';

export async function bandParity({ gate, root }) {
  const area = gate.from === 'strip' ? gate.to : gate.to === 'strip' ? gate.from : null;
  if (!area || area === 'strip') return [];      // a gate between two non-strip areas (or a dev loop) has no band
  if (!cache.has(area)) cache.set(area, spawnSync(process.execPath, [path.join(root, 'tools/area-data-test.mjs'), '--area', area], { encoding: 'utf8', maxBuffer: 1 << 26 }));
  const r = cache.get(area), lines = String(r.stdout || '').split('\n');
  const i = lines.findIndex((l) => l.includes(CHECK));
  if (i < 0) return [`the band check did not run (tools/area-data-test.mjs --area ${area} exit ${r.status}): ${String(r.stderr || r.stdout).trim().slice(0, 300)}`];
  if (/^\s*ok\b/.test(lines[i])) return [];
  const out = [lines[i].trim()];      // FAIL line + the indented detail lines that follow it
  for (let j = i + 1; j < lines.length && /^\s{6,}\S/.test(lines[j]); j++) out.push(lines[j].trim());
  return out;
}
