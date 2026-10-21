// tools/north-env-snapshot.mjs - the SNAPSHOT oracle of the hook set (docs/AREAS.md section 9, milestone M6): what the keep-out hooks (trees, grass tufts, props, parked-car slots, pedestrian-only ways) change in an area.
// Builds the static modules of the page (headless node, no GPU) in the area's own order - environment, the landmark modules, streets, city, props ... (the dynamic modules metro / traffic / people / wildlife / drive
// are left out; ctx.buildList is the FULL list of the page, as main.js sets it, so the hooks see what they see in the browser) - and dumps, deterministically and compactly (no time stamp, no timing):
//   trees         every trunk of environment (after the door / lamp clearings): [x, z, species] (species + '*' = shrub), plus the placement counters env.treeStats (per source: planted / rejected by reason: 'osm:campus' ...)
//   tufts         the grass-tuft pool of environment: (a) the FULL tuft list around a few probe cameras (the keep-out places and a control), (b) a lattice of 36 m cells over the play area: [count, hash] of the tufts
//                 of the cell when the camera stands at its centre (the pool is camera-centred; within 28 m of the camera it is complete)
//   props         every instance of the props module (PROPS_DUMP): [x, z, rotation] per type
//   parking       the parked-car slots and bay lines of streets/parking.js
//   streets       the ids of the pedestrian-only ways, the lanes (id + first point), the lamps; counts
//   node tools/area.mjs north tools/north-env-snapshot.mjs --out file.json [--mods a,b,c] [--also landmarksTauride] [--q high|medium|low] [--lattice 36] [--no-tufts]
//   node tools/north-env-snapshot.mjs --diff a.json b.json [--allow campus,suvorov,smolny,paradny | x0,x1,z0,z1;...] [--expect-empty paradny,campus,suvorov] [--margin 8] [--moved 4] [--verbose]
//   node tools/north-env-snapshot.mjs --regions        the regions the hooks of M6 may change (named boxes for --allow)
// --also adds names to ctx.buildList WITHOUT building them (a what-if for the dormant hooks: `--also landmarksTauride` switches the Paradny keep-outs on; the parking and height hooks are gated by the page's
// MODULES list, not by the build list, and stay off). --diff lists what was added / removed / moved per category; with --allow every change must lie inside one of the boxes grown by --margin metres, or the
// result is FAIL (exit 1); without --allow any difference fails. CASCADE: a candidate that a hook rejects inside a wood / park polygon shifts the random stream of the rest of that polygon (placeTrees seeds
// ONE stream per polygon), so trees elsewhere in the same polygon change although no hook covers them. The snapshot records the GREEN polygons that touch each named region (`cascade`); with --allow naming a
// region, a TREE change inside such a polygon is accepted and marked "(cascade)". The PROPS are one sequential random stream for the whole map (props/world.js fits() decides, the next placement draws on): once
// a hook has removed a prop inside an allowed region, props elsewhere change as well ("(cascade)"); a change of the props with NO change inside the regions is a stray hook and fails. Tufts, parking and ways
// have no such coupling: they must change inside the boxes only. --expect-empty names regions that must hold NOTHING of B afterwards (the positive proof of the keep-out): paradny = no tree or tuft probe
// point inside the podium ring (the props inside are only reported: the benches mapped in OSM are placed by props/osm.js, not by fits(), and stay), campus = no tree or tuft probe point inside the CAMPUS polygon,
// suvorov = no tree inside its rectangle (smolny is a soft clearing: no claim).
// NODE_OPTIONS=--max-old-space-size=8000. The strip works as well (the same tool, AREA unset): a hook-free snapshot before / after is the strongest inertness proof of the tufts / props / parking.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf('--' + k); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '1') : d; };
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);

// ---------------------------------------------------------------- the regions the hooks of M6 declare (static coordinates, as in hooks/keep-out.js and the source); the Paradny podium is dormant until landmarksTauride
const REGIONS = {
  'smolny-a': [2320, 2440, -1847, -1820],               // Smolny: the ceremonial approach to the cathedral (soft tree clearing, H02)
  'smolny-b': [2400, 2520, -1553, -1533],               // Smolny: the approach to the Institute
  suvorov: [1384, 1442, -1226, -1208],                  // Suvorov Museum: hard tree reject (H03)
  campus: [1110, 1343.1, -1242.2, -1047],               // Kirochnaya campus: the bounding box of the 8-point CAMPUS polygon (landmarksKirochnaya/groups.js): trees, tufts (H03, H04)
  paradny: [741, 1058.51, -1205, -873],                 // the podium + stair box (hooks/paradny.js PARADNY_BOX): trees, tufts, props, ways, parking (dormant)
};
const ACTIVE = ['smolny-a', 'smolny-b', 'suvorov', 'campus'];      // switched on by the modules the North builds since M5
/** the exact shapes behind --expect-empty: the podium ring (the source's paradny-surface.js, hooks/paradny.js PARADNY_PODIUM) and the CAMPUS polygon (landmarksKirochnaya/groups.js) as flat rings; hooks-test pins both */
const PODIUM_RING = [744, -884, 741, -970, 777, -995, 777, -1095, 839, -1095, 840, -1137, 978, -1137, 983, -1205, 1055, -1203, 1041, -905, 974, -898, 965, -881, 900, -873, 820, -875];
const CAMPUS_RING = [1118, -1237.6, 1150.5, -1242.2, 1241.6, -1239.8, 1343.1, -1237, 1336.5, -1068.8, 1244, -1047, 1134.4, -1048.8, 1110.1, -1100.5];
const rectRing = (b) => [b[0], b[2], b[1], b[2], b[1], b[3], b[0], b[3]];
const EMPTY = { paradny: { ring: PODIUM_RING, cats: ['trees', 'tufts'], info: ['props'] }, campus: { ring: CAMPUS_RING, cats: ['trees', 'tufts'], info: [] }, suvorov: { ring: rectRing(REGIONS.suvorov), cats: ['trees'], info: [] } };      // (info: reported, not graded - the props mapped in OSM (props/osm.js) do not pass fits())
/** --allow spec: region names (campus,suvorov,smolny,paradny,active,all) and / or boxes "x0,x1,z0,z1", separated by ; -> { boxes, names (the named regions) } */
const parseAllow = (spec) => {
  const boxes = [], names = [];
  for (const part of String(spec).split(';')) {
    const t = part.split(',').map((s) => s.trim()).filter(Boolean);
    if (t.length === 4 && t.every((s) => Number.isFinite(Number(s)))) { boxes.push(t.map(Number)); continue; }
    for (const n of t.flatMap((q) => (q === 'smolny' ? ['smolny-a', 'smolny-b'] : q === 'active' ? ACTIVE : q === 'all' ? Object.keys(REGIONS) : [q]))) { if (!REGIONS[n]) throw new Error('unknown region ' + n); boxes.push(REGIONS[n]); names.push(n); }
  }
  return { boxes, names };
};
/** even-odd ring test over [x, z, ...] */
const ringHas = (o, x, z) => { let c = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if ((o[i + 1] > z) !== (o[j + 1] > z) && x < (o[j] - o[i]) * (z - o[i + 1]) / (o[j + 1] - o[i + 1]) + o[i]) c = !c; return c; };

if (argv.includes('--regions')) { for (const [k, b] of Object.entries(REGIONS)) console.log(k.padEnd(10), b.join(', '), ACTIVE.includes(k) ? '(active in the North since M5)' : '(dormant: landmarksTauride)'); process.exit(0); }

// ---------------------------------------------------------------- --diff
if (argv.includes('--diff')) {
  const i = argv.indexOf('--diff'), A = JSON.parse(fs.readFileSync(argv[i + 1], 'utf8')), B = JSON.parse(fs.readFileSync(argv[i + 2], 'utf8'));
  if (A.schema !== B.schema) { console.log('schema differs: ' + A.schema + ' / ' + B.schema); process.exit(2); }
  const allowSpec = opt('allow');
  let allow = { boxes: [], names: [] };
  try { if (allowSpec) allow = parseAllow(allowSpec); } catch (e) { console.log(`${e.message} (regions: ${Object.keys(REGIONS).join(', ')}, smolny, active, all; or a box x0,x1,z0,z1)`); process.exit(2); }
  const boxes = allow.boxes, margin = Number(opt('margin', 8)), moveMax = Number(opt('moved', 4)), verbose = argv.includes('--verbose');
  const inside = (x, z, pad = 0) => boxes.some((b) => x >= b[0] - margin - pad && x <= b[1] + margin + pad && z >= b[2] - margin - pad && z <= b[3] + margin + pad);
  /** the wood / park polygons (GREEN) that touch an allowed named region, recorded in the snapshots: a tree rejected there shifts the random stream of the rest of that polygon (see the header) */
  const cascadePolys = allow.names.flatMap((n) => [...((A.cascade || {})[n] || []), ...((B.cascade || {})[n] || [])]);
  const inPoly = (x, z) => cascadePolys.some((p) => ringHas(p.o, x, z));
  const show = (n) => (verbose ? n : 8);
  let outside = 0, changes = 0;
  const say = (s) => console.log(s);
  console.log(`A: ${A.area} ${A.modules.length} modules, buildList ${A.buildList.length}${A.also.length ? ' (+' + A.also.join(',') + ')' : ''}, quality ${A.quality}   B: ${B.area} ${B.modules.length} modules, buildList ${B.buildList.length}${B.also.length ? ' (+' + B.also.join(',') + ')' : ''}, quality ${B.quality}`);
  if (JSON.stringify(A.modules) !== JSON.stringify(B.modules)) say('NOTE: the built module lists differ');
  /** point lists: rows [x, z, tag, ...extra]; identity = tag + position; leftovers are paired by distance (moved) */
  function diffPts(name, a, b) {
    const key = (r) => r[2] + '@' + r[0] + ',' + r[1], map = new Map();
    for (const r of a) map.set(key(r), (map.get(key(r)) || []).concat([r]));
    const bOnly = [];
    for (const r of b) { const l = map.get(key(r)); if (l && l.length) l.pop(); else bOnly.push(r); }
    const aOnly = [...map.values()].flat();
    const grid = new Map(), cell = 4, gk = (x, z, t) => t + '|' + Math.floor(x / cell) + ',' + Math.floor(z / cell);
    for (const r of bOnly) { const k = gk(r[0], r[1], r[2]); (grid.get(k) || grid.set(k, []).get(k)).push(r); }
    const moved = [], removed = [], used = new Set();
    for (const r of aOnly) {
      let best = null, bd = moveMax + 1e-9;
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const q of grid.get(gk(r[0] + dx * cell, r[1] + dz * cell, r[2])) || []) { if (used.has(q)) continue; const d = Math.hypot(q[0] - r[0], q[1] - r[1]); if (d < bd) { bd = d; best = q; } }
      if (best) { used.add(best); moved.push([r, best, bd]); } else removed.push(r);
    }
    const added = bOnly.filter((q) => !used.has(q));
    report(name, a.length, b.length, added, removed, moved.map((m) => ({ a: m[0], b: m[1], d: m[2] })), (r) => [r[0], r[1]], (r) => `${r[2]} (${r[0]}, ${r[1]})`, name === 'trees' ? 'trees' : name.startsWith('props:') ? 'props' : false);
  }
  /** id lists: rows [id, x, z, ...extra]; identity = id + the number of the row with that id (the data has a few ids twice, a way cut by the clip) */
  function diffIds(name, a, b, extra = null) {
    const keyed = (rows) => { const seen = new Map(); return new Map(rows.map((r) => { const n = seen.get(r[0]) || 0; seen.set(r[0], n + 1); return [r[0] + '#' + n, r]; })); };
    const ma = keyed(a), mb = keyed(b), removed = [...ma].filter(([k]) => !mb.has(k)).map(([, r]) => r), added = [...mb].filter(([k]) => !ma.has(k)).map(([, r]) => r);
    const changed = [...ma].filter(([k, r]) => mb.has(k) && JSON.stringify(r) !== JSON.stringify(mb.get(k))).map(([k, r]) => ({ a: r, b: mb.get(k), d: Math.hypot(r[1] - mb.get(k)[1], r[2] - mb.get(k)[2]) }));
    report(name, a.length, b.length, added, removed, changed, (r) => [r[1], r[2]], (r) => `${r[0]} (${r[1]}, ${r[2]})`, false, extra);
  }
  /** cascade: 'trees' | 'props' | false; extra(row) -> true when something other than the position explains the change of the row (a lane of a way that turned pedestrian-only) */
  function report(name, na, nb, added, removed, moved, at, label, cascade = false, extra = null) {
    const by = (x, z) => (cascade === 'trees' ? inPoly(x, z) : cascade === 'props' ? propsActed : false);          // the change is explained by the cascade of an allowed change
    const ok = (x, z, r) => inside(x, z) || by(x, z) || !!(extra && extra(r)), casc = (x, z, r) => !inside(x, z) && (by(x, z) || !!(extra && extra(r)));
    const bad = (rows) => rows.filter((r) => !ok(...at(r), r));
    const badMoved = moved.filter((m) => !(ok(...at(m.a), m.a) && ok(...at(m.b), m.b)));
    const n = added.length + removed.length + moved.length, nOut = bad(added).length + bad(removed).length + badMoved.length;
    const nCasc = [...added, ...removed, ...moved.map((m) => m.a)].filter((r) => casc(...at(r.a || r), r.a || r)).length;
    changes += n; outside += (boxes.length ? nOut : n);
    say(`${name.padEnd(12)} A ${String(na).padStart(6)}  B ${String(nb).padStart(6)}  added ${added.length}  removed ${removed.length}  moved/changed ${moved.length}${boxes.length && n ? `   (${nOut} outside the allowed regions${nCasc ? `, ${nCasc} of the allowed ones outside the boxes as a cascade: ${cascade === 'trees' ? 'a wood / park polygon that touches a region' : cascade === 'props' ? 'the one random stream of the props' : 'the way that turned pedestrian-only'}` : ''})` : ''}`);
    const lines = (tag, rows, f) => { for (const r of rows.slice(0, show(rows.length))) say(`    ${tag} ${f(r)}${boxes.length ? (ok(...at(r.a || r), r.a || r) ? (casc(...at(r.a || r), r.a || r) ? '   (cascade)' : '') : '   <-- OUTSIDE') : ''}`); if (rows.length > show(rows.length)) say(`    ... ${rows.length - show(rows.length)} more ${tag}`); };
    lines('added  ', added, label); lines('removed', removed, label); lines('moved  ', moved, (m) => `${label(m.a)} -> ${label(m.b)}  ${m.d.toFixed(2)} m`);
  }
  function diffCells(name, a, b, cellSize) {                 // lattice cells { "ci,cj": [count, hash] }
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort(), diff = keys.filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    const bad = diff.filter((k) => { const [ci, cj] = k.split(',').map(Number); return !inside(ci * cellSize, cj * cellSize, cellSize / 2 + 1); });
    changes += diff.length; outside += boxes.length ? bad.length : diff.length;
    say(`${name.padEnd(12)} A ${String(Object.keys(a).length).padStart(6)} cells  B ${String(Object.keys(b).length).padStart(6)} cells  differing ${diff.length}${boxes.length && diff.length ? `   (${bad.length} outside the allowed regions)` : ''}`);
    for (const k of diff.slice(0, show(diff.length))) { const [ci, cj] = k.split(',').map(Number); say(`    cell (${ci * cellSize}, ${cj * cellSize}) count ${a[k] ? a[k][0] : '-'} -> ${b[k] ? b[k][0] : '-'}${boxes.length && !inside(ci * cellSize, cj * cellSize, cellSize / 2 + 1) ? '   <-- OUTSIDE' : ''}`); }
    if (diff.length > show(diff.length)) say(`    ... ${diff.length - show(diff.length)} more cells`);
  }
  // did a hook change a prop INSIDE an allowed region? (the props are one sequential random stream: only then may props elsewhere change as its cascade)
  const propsActed = (() => {
    const rows = (S) => Object.entries(S.props).flatMap(([k, l]) => l.map((r) => [r[0], r[1], k])), key = (r) => r[2] + '@' + r[0] + ',' + r[1];
    const ra = rows(A), rb = rows(B), ka = new Set(ra.map(key)), kb = new Set(rb.map(key));
    return ra.some((r) => !kb.has(key(r)) && inside(r[0], r[1])) || rb.some((r) => !ka.has(key(r)) && inside(r[0], r[1]));
  })();
  diffPts('trees', A.trees.rows, B.trees.rows);
  { const ka = JSON.stringify(A.trees.stats), kb = JSON.stringify(B.trees.stats); if (ka !== kb) { const sa = A.trees.stats, sb = B.trees.stats, d = []; for (const k of new Set([...Object.keys(sa.rej || {}), ...Object.keys(sb.rej || {})])) if ((sa.rej || {})[k] !== (sb.rej || {})[k]) d.push(`rej ${k} ${(sa.rej || {})[k] || 0} -> ${(sb.rej || {})[k] || 0}`); for (const k of new Set([...Object.keys(sa), ...Object.keys(sb)])) if (k !== 'rej' && sa[k] !== sb[k]) d.push(`planted ${k} ${sa[k] || 0} -> ${sb[k] || 0}`); say('    tree counters: ' + d.join('; ')); } }
  if (A.trees.pruned !== B.trees.pruned) say(`    trees pruned by the door / lamp clearings ${A.trees.pruned} -> ${B.trees.pruned}`);
  if (A.tufts && B.tufts) {
    for (const k of new Set([...Object.keys(A.tufts.probes), ...Object.keys(B.tufts.probes)])) diffPts('tufts@' + k, ((A.tufts.probes[k] || {}).pts || []).map((p) => [p[0], p[1], 't']), ((B.tufts.probes[k] || {}).pts || []).map((p) => [p[0], p[1], 't']));
    diffCells('tuft cells', A.tufts.cells, B.tufts.cells, A.tufts.lattice);
  } else say('tufts        (not in both snapshots)');
  for (const k of new Set([...Object.keys(A.props), ...Object.keys(B.props)])) diffPts('props:' + k, (A.props[k] || []).map((r) => [r[0], r[1], k, r[2]]), (B.props[k] || []).map((r) => [r[0], r[1], k, r[2]]));
  diffPts('parking slots', A.parking.slots, B.parking.slots);
  diffPts('parking lines', A.parking.lines, B.parking.lines);
  diffIds('ped-only ways', A.streets.pedestrianOnly, B.streets.pedestrianOnly);
  { const pa = new Set(A.streets.pedestrianOnly.map((r) => r[0])), pb = new Set(B.streets.pedestrianOnly.map((r) => r[0])), flipped = new Set([...pa].filter((id) => !pb.has(id)).concat([...pb].filter((id) => !pa.has(id))));
    diffIds('lanes', A.streets.lanes, B.streets.lanes, (r) => flipped.has(r[3])); }                  // (a lane that vanishes with a way that turned pedestrian-only is explained by that way)
  diffPts('lamps', A.streets.lamps, B.streets.lamps);
  const ca = JSON.stringify(A.streets.counts), cb = JSON.stringify(B.streets.counts);
  if (ca !== cb) { say('streets counts: ' + ca + '\n          -> ' + cb); changes++; if (!boxes.length) outside++; }
  let notEmpty = 0;
  for (const n of opt('expect-empty') ? String(opt('expect-empty')).split(',') : []) {         // the positive proof: the keep-out leaves nothing of B inside the exact shape
    const E = EMPTY[n]; if (!E) { say(`expect-empty ${n}: unknown region (known: ${Object.keys(EMPTY).join(', ')})`); notEmpty++; continue; }
    const has = (x, z) => ringHas(E.ring, x, z), cnt = { trees: B.trees.rows.filter((r) => has(r[0], r[1])).length, tufts: B.tufts ? Object.values(B.tufts.probes).reduce((s, p) => s + p.pts.filter((q) => has(q[0], q[1])).length, 0) : 0,
      props: Object.values(B.props).reduce((s, l) => s + l.filter((r) => has(r[0], r[1])).length, 0) };
    const bad = E.cats.filter((c) => cnt[c] > 0); notEmpty += bad.length ? 1 : 0;
    say(`expect-empty ${n.padEnd(8)} B holds ${E.cats.map((c) => `${cnt[c]} ${c}`).join(', ')} inside the exact shape${E.info.length ? ` (not graded: ${E.info.map((c) => `${cnt[c]} ${c}`).join(', ')} - mapped OSM objects that props/osm.js places without fits())` : ''}${bad.length ? '   <-- NOT EMPTY: ' + bad.join(', ') : ''}`);
  }
  const ok = !notEmpty && (!changes || (boxes.length && !outside));
  console.log(!changes && !notEmpty ? 'RESULT: OK (identical)' : ok ? `RESULT: OK (${changes} changes, all inside the allowed regions grown by ${margin} m or their cascade)` : `RESULT: FAIL (${changes} changes${boxes.length ? `, ${outside} outside the allowed regions` : '; pass --allow to name the regions that may change'}${notEmpty ? `, ${notEmpty} region(s) not empty` : ''})`);
  process.exit(ok ? 0 : 1);
}

// ---------------------------------------------------------------- DOM stubs (as tools/check.mjs)
class Ctx2D {
  constructor(c) { this.canvas = c; this.font = '10px sans-serif'; }
  measureText(t) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); const s = m ? Number(m[1]) : 10; return { width: [...String(t)].length * s * 0.92, actualBoundingBoxAscent: s * 0.8, actualBoundingBoxDescent: s * 0.2 }; }
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
  createConicGradient() { return { addColorStop() {} }; }
  createPattern() { return {}; }
  getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  createImageData(w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  putImageData() {} getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
  isPointInPath() { return false; }
  getLineDash() { return []; }
}
const ctxProxy = (c) => new Proxy(new Ctx2D(c), { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
class FakeCanvas {
  constructor() { this.width = 300; this.height = 150; this.style = {}; this._ctx = null; }
  getContext(type) { if (type !== '2d') return null; return this._ctx || (this._ctx = ctxProxy(this)); }
  toDataURL() { return 'data:,'; } addEventListener() {} removeEventListener() {}
}
globalThis.window = globalThis;
globalThis.self = globalThis;
const stubEl = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, children: [], textContent: '', innerHTML: '', addEventListener() {}, removeEventListener() {}, appendChild() {}, setAttribute() {}, querySelector: () => stubEl(), querySelectorAll: () => [], getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1 }), setPointerCapture() {}, remove() {}, width: 1, height: 1, getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }) });
globalThis.document = {
  createElement: (t) => (t === 'canvas' ? new FakeCanvas() : stubEl()),
  createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }),
  fonts: { load: async () => [] }, body: { appendChild() {} }, head: { appendChild() {} }, addEventListener() {},
};
globalThis.Image = class { constructor() { this.width = 1; this.height = 1; } addEventListener() {} };
globalThis.HTMLCanvasElement = FakeCanvas; globalThis.OffscreenCanvas = FakeCanvas;
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16);
globalThis.addEventListener = () => {};
globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
globalThis.performance = globalThis.performance || { now: () => Date.now() };

// ---------------------------------------------------------------- build
const OUT = opt('out');
if (!OUT) { console.log('usage: node tools/area.mjs north tools/north-env-snapshot.mjs --out file.json [--mods a,b] [--also landmarksTauride] [--q high] [--lattice 36] [--no-tufts]\n       node tools/north-env-snapshot.mjs --diff a.json b.json [--allow campus,suvorov,smolny,paradny] [--margin 8] [--verbose]\n       --regions'); process.exit(1); }
process.env.PROPS_DUMP = '1';                                                   // props: ctx.services.props.inst = every instance by type (the frozen-district proof of tools/props-islands.mjs)
const THREE = await import('three');
const { createContext } = await imp('src/core/ctx.js');
const { createKnock } = await imp('src/core/knock.js');
const L = await imp('src/world/layout.js');
const { mainModules, DYNAMIC } = await imp('tools/modules-list.mjs');
const AREA = process.env.AREA || 'strip';
const pageList = mainModules(), also = String(opt('also', '')).split(',').filter(Boolean);
const mods = opt('mods') ? String(opt('mods')).split(',') : pageList.filter((m) => !DYNAMIC.includes(m));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
camera.position.set(L.HERO.x, 1.6, L.HERO.z);
const q = opt('q', 'high');
const quality = { name: q, pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };      // (tree density follows the quality: high = the quality of the bake)
const ctx = createContext({ scene, camera, renderer: null, audio: null, quality, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
ctx.buildList = [...pageList, ...also];
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.knock = createKnock(ctx);
let envUpdates = [];
const t0 = Date.now();
for (const name of mods) {
  const u0 = ctx._updates.length;
  try { const mod = await imp(`src/world/${name}.js`); await mod.build(ctx); }
  catch (e) { console.log(`BUILD ERROR in ${name}:\n${e.stack || e}`); process.exit(1); }
  if (name === 'environment') envUpdates = ctx._updates.slice(u0);
}
console.log(`built ${mods.join(',')} in ${Date.now() - t0} ms`);
scene.updateMatrixWorld(true);

const r2 = (v) => Math.round(v * 100) / 100, r1 = (v) => Math.round(v * 10) / 10, r3 = (v) => Math.round(v * 1000) / 1000;
const byPos = (a, b) => a[0] - b[0] || a[1] - b[1] || (String(a[2]) < String(b[2]) ? -1 : String(a[2]) > String(b[2]) ? 1 : 0);
const out = { schema: 1, area: AREA, modules: mods, buildList: ctx.buildList.filter((m) => !also.includes(m)), also, quality: q };

// ---- the wood / park polygons (GREEN) that touch a declared region: a tree rejected inside one shifts the random stream of the rest of the polygon (placeTrees seeds one stream per polygon), so --diff --allow
//      accepts a tree change anywhere in these polygons as the cascade of an allowed change
{
  const D = await imp('src/world/data/city.js'), SKIP = new Set(['flowerbed', 'pitch', 'playground', 'garden', 'fitness_station', 'track']), cascade = {};       // (the kinds placeTrees skips)
  const touches = (o, b) => { for (let i = 0; i < o.length; i += 2) if (o[i] >= b[0] && o[i] <= b[1] && o[i + 1] >= b[2] && o[i + 1] <= b[3]) return true; for (let x = b[0]; x <= b[1]; x += 4) for (let z = b[2]; z <= b[3]; z += 4) if (ringHas(o, x, z)) return true; return false; };
  for (const [name, b] of Object.entries(REGIONS)) cascade[name] = (D.GREEN || []).filter((g) => !SKIP.has(g.kind)).flatMap((g) => g.polys.filter((p) => touches(p.o, b)).map((p) => ({ id: g.id, kind: g.kind, o: p.o.map(r2) })));
  out.cascade = cascade;
}

// ---- trees (after the door / lamp / bus-stop clearings: reading env.trees runs them)
const env = ctx.services.environment;
{
  const trees = env.trees || [];
  out.trees = { rows: trees.map((t) => [r2(t.x), r2(t.z), t.sp + (t.shrub ? '*' : '')]).sort(byPos), stats: env.treeStats || {}, pruned: env.treesPruned || 0 };
}

// ---- grass tufts: the camera-centred pool of environment/lawns.js buildTufts. The pool is re-scattered by the update callback of the module when the camera has moved 2.2 m: find that callback by its effect
if (!argv.includes('--no-tufts')) {
  const mesh = scene.getObjectByName('env-tufts');
  const pool = () => { const A = mesh.instanceMatrix.array, n = mesh.count, pts = []; for (let i = 0; i < n; i++) pts.push([A[i * 16 + 12], A[i * 16 + 14]]); return pts; };
  const sig = () => { let s = mesh.count; for (const p of pool()) s += p[0] * 1.37 + p[1] * 0.73; return s; };
  const place = (x, z) => { camera.position.set(x, 1.6, z); camera.updateMatrixWorld(true); };
  let tuft = null;
  if (mesh) for (const [i, f] of envUpdates.entries()) { place(L.HERO.x + 331 * (i + 1), L.HERO.z + 217 * (i + 1)); const s0 = sig(); try { f(0, 0); } catch { continue; } if (sig() !== s0) { tuft = f; break; } }
  if (!tuft) { console.log('ERROR: the tuft update callback of environment was not found (no env-tufts mesh, or none of its ' + envUpdates.length + ' update callbacks changes it): rerun with --no-tufts'); process.exit(1); }
  const at = (x, z) => { place(x, z); tuft(0, 1); return pool(); };
  const PROBES = { podium: [900, -1000], 'campus-n': [1230, -1150], 'campus-edge': [1180, -1236], suvorov: [1413, -1217], 'smolny-a': [2380, -1833], 'smolny-b': [2460, -1543], garden: [1200, -1500], hero: [L.HERO.x, L.HERO.z], control: [300, -700] };
  const probes = {};
  for (const [k, [x, z]] of Object.entries(PROBES)) { probes[k] = { camera: [x, z], pts: at(x, z).filter((p) => Math.hypot(p[0] - x, p[1] - z) <= 28).map((p) => [r2(p[0]), r2(p[1])]).sort(byPos) }; }
  const CELL = Number(opt('lattice', 36)), half = CELL / 2, P = L.WORLD.play, cells = {};
  const hash = (pts) => { let h = 0; for (const p of pts) { let a = Math.imul(Math.round(p[0] * 100) | 0, 0x9e3779b1) ^ Math.imul(Math.round(p[1] * 100) | 0, 0x85ebca6b); a ^= a >>> 15; a = Math.imul(a, 0x2c1b3c6d); a ^= a >>> 12; h = (h + (a >>> 0)) >>> 0; } return h; };
  for (let ci = Math.floor(P.x0 / CELL) - 1; ci <= Math.ceil(P.x1 / CELL) + 1; ci++) for (let cj = Math.floor(P.z0 / CELL) - 1; cj <= Math.ceil(P.z1 / CELL) + 1; cj++) {
    const cx = ci * CELL, cz = cj * CELL;                       // (the lattice is anchored at the origin; the camera stands at the cell centre, so the cell square is within 25.5 m of it: inside the complete 28 m of the pool)
    if (!L.inPlay(cx, cz, half)) continue;
    const mine = at(cx, cz).filter((p) => Math.abs(p[0] - cx) <= half && Math.abs(p[1] - cz) <= half);
    if (mine.length) cells[ci + ',' + cj] = [mine.length, hash(mine)];
  }
  out.tufts = { lattice: CELL, probes, cells };
}

// ---- props: every instance by type
{
  const inst = (ctx.services.props && ctx.services.props.inst) || {}, props = {};
  for (const k of Object.keys(inst).sort()) props[k] = inst[k].map((m) => [r1(m[0]), r1(m[1]), m[2]]).sort(byPos);
  out.props = props;
}

// ---- streets: parked-car slots, bay lines, the pedestrian-only ways, the lanes, the lamps
{
  const st = ctx.services.streets, slots = st ? st.parkedSlots : [];
  const byId = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1] || a[2] - b[2]);
  const lanes = st ? st.lanes.map((l) => [l.id, r2(l.pts[0][0]), r2(l.pts[0][1]), l.road]).sort(byId) : [];       // (+ the way the lane belongs to: a way that turns pedestrian-only takes its lanes with it)
  const ways = st ? st.net.ways : [], ped = ways.filter((w) => w.pedestrianOnly).map((w) => { let sx = 0, sz = 0; for (let i = 0; i < w.x.length; i++) { sx += w.x[i]; sz += w.z[i]; } return [w.id, r2(sx / w.x.length), r2(sz / w.x.length)]; }).sort(byId);
  out.parking = { slots: slots.map((s) => [r2(s.x), r2(s.z), s.kind, r3(s.rotY)]).sort(byPos), lines: (slots.lines || []).map((p) => [r2((p[0] + p[2]) / 2), r2((p[1] + p[3]) / 2), 'line', r2(p[0]), r2(p[1]), r2(p[2]), r2(p[3])]).sort(byPos) };
  out.streets = { pedestrianOnly: ped, lanes, lamps: st ? st.lamps.map((l) => [r2(l.x), r2(l.z), l.kind || 'lamp']).sort(byPos) : [],
    counts: st ? { ways: ways.length, pedestrianOnly: ped.length, lanes: st.lanes.length, connectors: st.connectors.length, junctions: st.junctions.length, signals: st.signals.length, crosswalks: st.crosswalks.length, lamps: st.lamps.length, busStops: st.busStops.length, parkedSlots: slots.length, bayLines: (slots.lines || []).length } : {} };
}

fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
fs.writeFileSync(path.resolve(OUT), JSON.stringify(out));
const nProps = Object.values(out.props).reduce((s, a) => s + a.length, 0);
console.log(`north-env-snapshot[${AREA}]: ${out.trees.rows.length} trees, ${out.tufts ? Object.keys(out.tufts.cells).length + ' tuft cells (lattice ' + out.tufts.lattice + ' m), ' + Object.values(out.tufts.probes).reduce((s, p) => s + p.pts.length, 0) + ' probe tufts' : 'no tufts'}, ${nProps} props in ${Object.keys(out.props).length} types, ${out.parking.slots.length} parking slots / ${out.parking.lines.length} lines, ${out.streets.pedestrianOnly.length} pedestrian-only ways, ${out.streets.lanes.length} lanes, ${out.streets.lamps.length} lamps -> ${OUT} (${Math.round(fs.statSync(path.resolve(OUT)).size / 1024)} KB)`);
process.exit(0);
