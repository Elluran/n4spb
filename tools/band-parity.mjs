// The band-parity hook of tools/areas-test.mjs (docs/AREAS.md section 5.2, docs/AREAS-DATA.md section 5): bandParity({ gate, root, REGISTRY }) -> a list of problem strings (empty = fine).
// The North holds a one-sided 200 m band of the strip's own territory (x -420 .. 835, z -405 .. -205), so an arrival through the gates g1 / g2 lands on streets that exist on both pages. The comparison itself
// (every record of every array, clipped to the band, in the strip's facade and in the area's: same ids, fields and geometry) is check 4 of tools/area-data-test.mjs; this hook runs that test for the area on the
// OTHER side of the gate (once per area per process) and reports the band check, so a data cut that drifts from the strip fails `node tools/areas-test.mjs` as well.
// The second hook, bandLandmarks({ gate, root, REGISTRY }), is the LANDMARK parity (M5 of the areas plan): a landmark of the strip that stands in the band is drawn by a specialist module of the strip, so the
// North page, which holds the band as its own territory, must draw it with a module too, or an arrival in the band shows a plain block where the strip shows a landmark. Every claim of the strip (a sub-group
// of src/world/area.js GROUPS whose module is in the strip's MODULES and owns it) whose record lies inside the band must be claimed in the other area by a module of ITS MODULES that owns the sub-group, with
// the same id and the same sub-group key (NOT the same module name: the strip's landmarksNorth is the North's landmarksNorthFull). The claims of both areas come from tools/lib/claims-dump.mjs, run as
// `node tools/area.mjs <area> tools/lib/claims-dump.mjs` (two children, in parallel, once per area per process); landmarkBandProblems is the pure comparison (synthetic fixtures in tools/areas-test.mjs).
import { spawn, spawnSync } from 'node:child_process';
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

// ---------------------------------------------------------------------------------------------- landmark parity (M5)
/** The landmark ids that the plan pins in the band x -420 .. 835, z -405 .. -205 (4 strip groups): the National Library and the Mariinsky block (landmarksD / library), Podpisnye Izdaniya (landmarksNorth / north-podpisnye),
 *  three corridor houses (landmarksNorth / north-corridor-houses), the concert hall Oktyabrsky with its part w929214560 (landmarksOktyabrsky / oktyabrsky-hall, the part follows through its parent).
 *  A tripwire, not the rule: the rule is every claim of the strip in the band; if the strip's claims move, this list must be updated (and the message says so). */
export const PLAN_BAND_IDS = ['r3801087', 'w60353337', 'w96123542', 'w60354379', 'w96364627', 'r1394323', 'w30324279', 'w929214560'];
/** Module names that differ between the areas although the module is "the same" (only used to word the failure message): destination area -> { strip module: the module of that area }. */
export const MODULE_ALIASES = { north: { landmarksNorth: 'landmarksNorthFull' } };

/** The band between two areas: the intersections (with an area) of their play rectangles, [{ x0, x1, z0, z1 }]. strip x north = x -420 .. 835, z -405 .. -205. */
export function bandRects(rectsA, rectsB) {
  const out = [];
  for (const a of rectsA) for (const b of rectsB) {
    const r = { x0: Math.max(a.x0, b.x0), x1: Math.min(a.x1, b.x1), z0: Math.max(a.z0, b.z0), z1: Math.min(a.z1, b.z1) };
    if (r.x1 > r.x0 && r.z1 > r.z0) out.push(r);
  }
  return out;
}

/**
 * The landmark parity of the band, pure: `source` and `dest` are the dumps of tools/lib/claims-dump.mjs ({ area, modules, rows }), `band` the rectangles. Returns the problems (empty = fine):
 * every row of `source` that is OWNED there (its module is built and owns the sub-group) with its record inside the band must be claimed in `dest` under the same id and the same sub-group key, by a module
 * that is in the MODULES of `dest` and owns the sub-group, and the record must exist in the data of `dest`. `expect`: ids that must be among those rows (so that a broken dump or band cannot pass vacuously).
 */
export function landmarkBandProblems({ source, dest, band, expect = PLAN_BAND_IDS, aliases = MODULE_ALIASES }) {
  const problems = [];
  if (!band || !band.length) return [`no band between ${source.area} and ${dest.area}: their play rectangles do not overlap`];
  const inBand = (r) => Number.isFinite(r.cx) && Number.isFinite(r.cz) && band.some((b) => r.cx >= b.x0 && r.cx <= b.x1 && r.cz >= b.z0 && r.cz <= b.z1);
  const claims = source.rows.filter((r) => r.owned && inBand(r));
  if (!claims.length) return [`${source.area} claims no landmark inside the band: nothing to compare (the claims dump or the band is wrong)`];
  const have = new Set(claims.map((r) => r.id)), lost = expect.filter((id) => !have.has(id));
  if (lost.length) problems.push(`the landmarks that the plan pins in the band (${lost.join(', ')}) are no claims of ${source.area} in the band any more: update PLAN_BAND_IDS in tools/band-parity.mjs`);
  const byId = new Map();
  for (const r of dest.rows) { const l = byId.get(r.id); if (l) l.push(r); else byId.set(r.id, [r]); }
  const groups = new Map();      // `${module}/${group}` -> { module, group, none: [], wrong: [], absent: [], notBuilt: [], notOwned: [] } so that one message names every id of a sub-group
  const bucket = (r, kind, text) => { const k = r.module + '/' + r.group; if (!groups.has(k)) groups.set(k, { module: r.module, group: r.group, none: [], wrong: [], absent: [], notBuilt: [], notOwned: [] }); groups.get(k)[kind].push(text); };
  for (const r of claims) {
    const ds = byId.get(r.id) || [];
    if (!ds.length) { bucket(r, 'none', r.id); continue; }
    const same = ds.filter((d) => d.group === r.group);
    if (!same.length) { bucket(r, 'wrong', `${r.id} (${dest.area}: sub-group ${ds.map((d) => `"${d.group}" of ${d.module}`).join(', ')})`); continue; }
    const owner = same.find((d) => d.owned);
    if (!owner) { const d = same[0]; bucket(r, d.inModules ? 'notOwned' : 'notBuilt', `${r.id} (${d.module})`); continue; }
    if (!owner.present) bucket(r, 'absent', `${r.id} (${owner.module})`);
  }
  const alias = (m) => (aliases && aliases[dest.area] && aliases[dest.area][m]) || m;
  for (const g of groups.values()) {
    const pl = (l) => (l.length > 1 ? 'are' : 'is'), at = `${source.area} ${g.module} / ${g.group}`;
    const owner = alias(g.module), nameIt = owner === g.module ? owner : `${owner} (the ${dest.area} copy of ${g.module})`;
    if (g.none.length) problems.push(`${g.none.join(', ')} (${at}, inside the band) ${pl(g.none)} claimed by no sub-group of ${dest.area}: the module that should own ${g.none.length > 1 ? 'them' : 'it'} is ${nameIt}; list the sub-group "${g.group}" in GROUPS.${owner} of src/areas/${dest.area}/area.js and put ${owner} in its MODULES`);
    if (g.wrong.length) problems.push(`${g.wrong.join('; ')} (${at}): ${dest.area} claims ${g.wrong.length > 1 ? 'them' : 'it'} under another sub-group key than "${g.group}" (the comparison is by id AND sub-group key)`);
    if (g.notBuilt.length) problems.push(`${g.notBuilt.join(', ')} (${at}) ${pl(g.notBuilt)} claimed in ${dest.area}, but that module is not in the MODULES of src/areas/${dest.area}/area.js (should be ${owner}): the generic city would draw a block instead of the landmark`);
    if (g.notOwned.length) problems.push(`${g.notOwned.join(', ')} (${at}) ${pl(g.notOwned)} claimed in ${dest.area} by a module that does not own the sub-group "${g.group}" (OWNS_GROUPS must be true or list it; should be ${owner})`);
    if (g.absent.length) problems.push(`${g.absent.join(', ')} (${at}) ${pl(g.absent)} claimed in ${dest.area} but there is no record with ${g.absent.length > 1 ? 'those ids' : 'that id'} in its data facade (the band must be identical in both facades: docs/AREAS-DATA.md section 5)`);
  }
  return problems;
}

const dumps = new Map();
/** The claims of one area: `node tools/area.mjs <area> tools/lib/claims-dump.mjs` in a child (the loader remap of that area), parsed from its CLAIMS_DUMP line. Cached per area per process; rejects with the child's stderr. */
function claimsDump(root, area) {
  if (!dumps.has(area)) {
    dumps.set(area, new Promise((resolve, reject) => {
      const env = { ...process.env }; delete env.AREA;      // tools/area.mjs sets it itself
      const child = spawn(process.execPath, [path.join(root, 'tools/area.mjs'), area, path.join(root, 'tools/lib/claims-dump.mjs')], { env, cwd: root });
      let out = '', err = '';
      child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { err += d; });
      child.on('error', reject);
      child.on('close', (code) => {
        const line = out.split('\n').find((l) => l.startsWith('CLAIMS_DUMP '));
        if (!line) return reject(new Error(`the claims dump of ${area} printed nothing (exit ${code}): ${(err || out).trim().slice(0, 300)}`));
        try { resolve(JSON.parse(line.slice(12))); } catch (e) { reject(new Error(`the claims dump of ${area} is not JSON: ${e.message}`)); }
      });
    }));
  }
  return dumps.get(area);
}

/** The hook of tools/areas-test.mjs for a gate: the landmark parity of the band between the strip and the area on the other side (a gate without the strip, or without a band, has none). */
export async function bandLandmarks({ gate, root, REGISTRY }) {
  const area = gate.from === 'strip' ? gate.to : gate.to === 'strip' ? gate.from : null;
  if (!area || area === 'strip') return [];
  const band = bandRects(REGISTRY.strip.play, REGISTRY[area].play);
  if (!band.length) return [];
  let source, dest;
  try { [source, dest] = await Promise.all([claimsDump(root, 'strip'), claimsDump(root, area)]); } catch (e) { return [`the landmark claims could not be read: ${e.message}`]; }
  return landmarkBandProblems({ source, dest, band });
}
