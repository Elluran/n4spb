// Golden dump of the strip-level world definition: every export of src/world/layout.js (constants canonicalised, large ones hashed) PLUS the values of its functions on a fixed
// probe set, PLUS the export summary of the data facade (src/world/data/city.js). It is the CPU oracle of docs/AREAS.md: the area seam (src/world/area.js, milestone M1) moves
// the strip literals out of layout.js and must not change one of them.
//   node tools/layout-golden.mjs                       -> prints the summary (counts) of the current tree
//   node tools/layout-golden.mjs --out <file>          -> writes the dump (deterministic JSON)
//   node tools/layout-golden.mjs --diff [<file>]       -> compares the current tree with a dump (default tools/golden/layout-<area>.json); exit 1 and the first differences when it changed
//   --area <id>                                        -> dump another area (docs/AREAS.md; default: the area tools/area.mjs runs as, else 'strip'); the probe grid follows the area's play bounding box
// Another area runs through the loader remap of its page: `node tools/area.mjs north tools/layout-golden.mjs --diff` (golden tools/golden/layout-north.json, M6 oracle: the hook set of the North must not move it),
// `node tools/area.mjs north tools/layout-golden.mjs --out tools/golden/layout-north.json` writes it. `--area <id>` without the remap of that area would dump the strip's world under another name: refused. So is an `AREA=<id>` exported in the shell without the remap:
// dump() checks the ID of the area module it really loaded (src/world/area.js) against the area it labels the dump with, and exits 2 on a mismatch (tools/north-hooks-test.mjs, group tools, tests it).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const r6 = (n) => (Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : n === Infinity ? 'Infinity' : n === -Infinity ? '-Infinity' : String(n));

/** canonical, JSON-safe, order-independent copy of a value; functions become '[fn name/arity]', Maps and Sets sorted, cycles cut */
function canon(v, seen = new WeakSet()) {
  if (v === null || v === undefined) return v === undefined ? '[undefined]' : null;
  const t = typeof v;
  if (t === 'number') return r6(v);
  if (t === 'string' || t === 'boolean') return v;
  if (t === 'bigint') return String(v);
  if (t === 'function') return `[fn ${v.name || 'anonymous'}/${v.length}]`;
  if (ArrayBuffer.isView(v)) return `[${v.constructor.name} ${v.length} ${sha(Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString('base64'))}]`;
  if (seen.has(v)) return '[cycle]'; seen.add(v);
  let out;
  if (Array.isArray(v)) out = v.map((x) => canon(x, seen));
  else if (v instanceof Set) out = { '[Set]': [...v].map((x) => canon(x, seen)).sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1)) };
  else if (v instanceof Map) out = { '[Map]': [...v].map(([k, x]) => [canon(k, seen), canon(x, seen)]).sort((a, b) => (JSON.stringify(a[0]) < JSON.stringify(b[0]) ? -1 : 1)) };
  else out = Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k], seen)]));
  seen.delete(v);
  return out;
}
/** small values stay readable; big ones become { n, hash } so a diff names the export that moved */
function summarise(v) {
  const c = canon(v); const s = JSON.stringify(c);
  if (s.length <= 3000) return c;
  return { '[hashed]': true, kind: Array.isArray(v) ? 'array' : typeof v, n: Array.isArray(v) ? v.length : Object.keys(v || {}).length, bytes: s.length, hash: sha(s) };
}

async function dump(area) {
  // The golden is named after the area it holds: refuse to dump a world that is not that area's (`AREA=north node tools/layout-golden.mjs --out tools/golden/layout-north.json` without the remap of tools/area.mjs
  // would write the strip's world into the North golden). src/world/area.js is the module the loader remap replaces, so its ID is the area that layout.js and the facade are really built from.
  const AM = await import(pathToFileURL(path.join(root, 'src/world/area.js')).href);
  if (AM.ID !== area) { console.error(`layout-golden: the area module loaded is "${AM.ID}", not "${area}": nothing dumped. Run  node tools/area.mjs ${area} tools/layout-golden.mjs ...  (the loader remap of that area)`); process.exit(2); }
  const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
  const C = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
  const out = { schema: 1, area, layout: { consts: {}, fns: {} }, facade: {}, probes: {} };
  for (const k of Object.keys(L).sort()) {
    if (typeof L[k] === 'function') out.layout.fns[k] = `arity ${L[k].length}`;
    else out.layout.consts[k] = summarise(L[k]);
  }
  for (const k of Object.keys(C).sort()) out.facade[k] = Array.isArray(C[k]) || (C[k] && typeof C[k] === 'object') ? summarise(C[k]) : canon(C[k]);

  // ---- probes: the functions on fixed points (a lattice over the play bounding box + the named poses)
  const b = L.WORLD.play, pts = [];
  const nx = 24, nz = 18;
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) pts.push([r6(b.x0 - 150 + (b.x1 - b.x0 + 300) * i / nx), r6(b.z0 - 150 + (b.z1 - b.z0 + 300) * j / nz)]);
  for (const v of L.VIEWS) pts.push([v.x, v.z]);
  pts.push([L.HERO.x, L.HERO.z]);
  for (const g of Object.values(L.SUBGROUPS)) if (g.at) pts.push([g.at[0], g.at[1]]);
  const P = out.probes;
  const col = (name, fn) => { const a = pts.map(([x, z]) => { try { return canon(fn(x, z)); } catch (e) { return `[throws ${e.message.slice(0, 60)}]`; } }); P[name] = { n: a.length, hash: sha(JSON.stringify(a)), head: a.slice(0, 8) }; };
  col('inPlay', (x, z) => L.inPlay(x, z)); col('inPlay25', (x, z) => L.inPlay(x, z, 25)); col('inPlay-40', (x, z) => L.inPlay(x, z, -40));
  col('inExtent', (x, z) => L.inExtent(x, z)); col('inExtent60', (x, z) => L.inExtent(x, z, 60));
  col('clampToPlay', (x, z) => L.clampToPlay(x, z)); col('clampToPlay30', (x, z) => L.clampToPlay(x, z, 30));
  col('heightAt', L.heightAt); col('groundAt', L.groundAt); col('inRiver', L.inRiver); col('waterwayAt', L.waterwayAt); col('waterLevelAt', L.waterLevelAt); col('shoreDist', L.shoreDist);
  col('insideBuilding', (x, z) => L.insideBuilding(x, z)); col('insideBuilding1.5', (x, z) => L.insideBuilding(x, z, 1.5));
  col('buildingAt', (x, z) => { const q = L.buildingAt(x, z); return q ? q.id : null; });
  col('areaAt', L.areaAt);
  col('isOnRoad', (x, z) => L.isOnRoad(x, z, 2)); col('isOnRoadAll', (x, z) => L.isOnRoad(x, z, 6, { all: true }));
  col('nearestRoad', (x, z) => { const q = L.nearestRoad(x, z); return q ? [q.road && (q.road.id ?? q.road.name), r6(q.d ?? q.dist ?? 0)] : null; });
  col('toGrid', (x, z) => L.toGrid(x, z)); col('fromGrid', (x, z) => L.fromGrid(x, z));
  col('yawToward', (x, z) => L.yawToward(x, z, L.SQUARE.x, L.SQUARE.z)); col('rotYToward', (x, z) => L.rotYToward(L.SQUARE.x - x, L.SQUARE.z - z));
  col('groundHeight', (x, z) => (L.groundHeight ? L.groundHeight(x, z) : null));
  // groups / claims: every sub-group key and the claim table on the first thousand claimed ids
  const keys = Object.keys(L.SUBGROUPS).sort();
  P.groups = { n: keys.length, keys, members: Object.fromEntries(keys.map((k) => [k, L.groupMembers(k).length])), osm: Object.fromEntries(keys.map((k) => [k, sha(JSON.stringify(L.groupOsm(k)))])),
    bounds: Object.fromEntries(keys.map((k) => [k, canon(L.groupBounds(k))])), modules: L.MODULE_KEYS };
  const claimIds = keys.flatMap((k) => L.SUBGROUPS[k].ids.concat(L.SUBGROUPS[k].osm)).sort();
  P.claims = { n: claimIds.length, hash: sha(JSON.stringify(claimIds.map((id) => [id, L.groupOf(id), L.claimedBy(id), L.isClaimed(id)]))) };
  const bs = C.BUILDINGS || []; const step = Math.max(1, Math.floor(bs.length / 600));
  P.buildings = { n: bs.length, sample: sha(JSON.stringify(bs.filter((_, i) => i % step === 0).map((q) => [q.id, L.eraOf(q), r6(L.heightOf(q)), !!L.buildingById(q.id)]))) };
  P.groundFootprints = { n: L.groundFootprints().length };
  P.roadWidth = sha(JSON.stringify((C.ROADS || []).filter((_, i) => i % 7 === 0).map((r) => [r.id, L.roadWidth(r), L.isDrivable(r)])));
  P.views = L.VIEWS.map((v) => [v.key, v.x, v.z, r6(v.yaw), v.pitch, v.label, L.areaAt(v.x, v.z)]);
  return out;
}

/** flat list of leaf differences between two dumps */
function diff(a, b, p = '', acc = []) {
  if (acc.length > 80) return acc;
  if (JSON.stringify(a) === JSON.stringify(b)) return acc;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], p ? `${p}.${k}` : k, acc);
  } else acc.push(`${p}: ${JSON.stringify(a)?.slice(0, 160)}  ->  ${JSON.stringify(b)?.slice(0, 160)}`);
  return acc;
}

const running = process.env.AREA || 'strip';                                // tools/area.mjs sets AREA and registers the loader remap of that area
const area = args.area && args.area !== '1' ? args.area : running;
if (area !== running) { console.error(`layout-golden: --area ${area} needs the remap of that area: run  node tools/area.mjs ${area} tools/layout-golden.mjs ...`); process.exit(2); }
const goldenOf = (id) => path.join(root, `tools/golden/layout-${id}.json`);
const cur = await dump(area);
const summary = () => `layout-golden[${area}]: ${Object.keys(cur.layout.consts).length} consts, ${Object.keys(cur.layout.fns).length} functions, ${Object.keys(cur.facade).length} facade exports, ${Object.keys(cur.probes).length} probe sets`;
if (args.out) {
  fs.mkdirSync(path.dirname(path.resolve(root, args.out)), { recursive: true });
  fs.writeFileSync(path.resolve(root, args.out), JSON.stringify(cur, null, 1) + '\n');
  console.log(summary()); console.log('wrote ' + args.out);
} else if (args.diff) {
  const file = args.diff === '1' ? goldenOf(area) : path.resolve(root, args.diff);
  const gold = JSON.parse(fs.readFileSync(file, 'utf8'));
  const d = diff(gold, JSON.parse(JSON.stringify(cur)));
  console.log(summary());
  if (d.length) { console.log(`DIFFERS from ${path.relative(root, file)} (${d.length}${d.length > 80 ? '+' : ''} leaves):`); for (const l of d.slice(0, 40)) console.log('  ' + l); console.log('RESULT: FAIL'); process.exitCode = 1; }
  else console.log(`RESULT: OK (identical to ${path.relative(root, file)})`);
} else console.log(summary());
