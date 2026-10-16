// city-signature.mjs - headless geometry signature of the generic city, per data region (docs/city-api.md "Regression signature").
//   node tools/city-signature.mjs --out file.json            build the city alone (no landmark module owns anything) and write the signature
//   node tools/city-signature.mjs --ref HEAD --out base.json  the same for the module as committed at a git ref (read-only `git show`), over the CURRENT data and claims
//   node tools/city-signature.mjs --diff before.json after.json [--list N]     compare two signatures; exit 1 when a region outside --new changed
//   node tools/city-signature.mjs [--ref HEAD] --dump id,id   print the raw style + wall records of these ids (with and without --ref: why did a record change)
//   options: --new P1,P2,... (regions that MAY change; default = district.NEW_REGIONS of the working tree, stored in every signature: the Petrograd side + the Spit, P6 included)
// Why: a change of the facade grammar for one district must not move a single vertex anywhere else ("the old regions must not change at all").
// Two layers of proof:
//   1. STYLES: for every drawn record the style that archetypes.describe + assignColours produced (archetype, storeys, heights, colours, mansard, erkers, turret, gate ...) and every wall
//      record of walls.js (ends, bays, flags, masks, shop units, doors, balconies) -> one hash per record, grouped by the region of the record (data/city.js REGIONS part files).
//   2. GEOMETRY: the vertex buffers of every mesh the module adds (walls / core / fine / roof / rails streams per 320 m cell, sign atlas quads) -> one hash per (stream, cell).
//      A cell that no record of a --new region touches (bounding boxes + 6 m) must hash the same: that covers the detail passes (erkers, mansards, balconies, shops, pipes ...).
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = []; while (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) v.push(process.argv[++i]); args[k] = v.length ? v : ['1']; } }
const NEW_DEFAULT = 'P1,P2,P3,P4,P5,P6,V1,V2';              // fallback for signatures written before `newRegions` was stored
let NEW = new Set((args.new ? args.new[0] : NEW_DEFAULT).split(','));
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);

// ---------------------------------------------------------------- diff mode
if (args.diff) {
  const A = JSON.parse(fs.readFileSync(args.diff[0], 'utf8')), B = JSON.parse(fs.readFileSync(args.diff[1], 'utf8'));
  if (!args.new && (B.newRegions || A.newRegions)) NEW = new Set([...(A.newRegions || []), ...(B.newRegions || [])]);      // the union: a region that is new in either build may change
  const list = Number((args.list || [12])[0]);
  let bad = 0;
  const regions = [...new Set([...Object.keys(A.regions), ...Object.keys(B.regions)])];
  console.log('region      records(before/after)  changed  added  removed');
  for (const r of regions) {
    const a = A.regions[r] || {}, b = B.regions[r] || {};
    const ch = Object.keys(a).filter((id) => b[id] !== undefined && b[id] !== a[id]), add = Object.keys(b).filter((id) => a[id] === undefined), rem = Object.keys(a).filter((id) => b[id] === undefined);
    const isNew = NEW.has(r);
    console.log(`${r.padEnd(10)} ${String(Object.keys(a).length).padStart(6)} / ${String(Object.keys(b).length).padEnd(6)} ${String(ch.length).padStart(10)} ${String(add.length).padStart(6)} ${String(rem.length).padStart(8)}${isNew ? '   (new region: may change)' : ''}`);
    if (!isNew && (ch.length || add.length || rem.length)) { bad += ch.length + add.length + rem.length; console.log('   changed:', ch.slice(0, list).join(' '), add.length ? ' added: ' + add.slice(0, list).join(' ') : '', rem.length ? ' removed: ' + rem.slice(0, list).join(' ') : ''); }
  }
  // geometry: cells that only old regions touch
  let cells = 0, cellBad = 0, mixed = 0, mixedChanged = 0; const badCells = [];
  for (const k of new Set([...Object.keys(A.cells), ...Object.keys(B.cells)])) {
    const touched = (A.newCells || []).includes(k.split('|')[1]) || (B.newCells || []).includes(k.split('|')[1]);
    if (touched) { mixed++; if (A.cells[k] !== B.cells[k]) mixedChanged++; continue; }
    cells++;
    if (A.cells[k] !== B.cells[k]) { cellBad++; badCells.push(k); }
  }
  console.log(`geometry: ${cells} (stream, cell) meshes of old-only cells compared, ${cellBad} differ; ${mixed} meshes of cells that hold new-region houses (${mixedChanged} changed, expected)`);
  if (cellBad) console.log('   differing old-only meshes:', badCells.slice(0, list).join('  '));
  if (A.byStream && B.byStream) console.log('triangles by stream: ' + Object.keys(B.byStream).map((k) => `${k} ${A.byStream[k] || 0} -> ${B.byStream[k]} (${B.byStream[k] - (A.byStream[k] || 0) >= 0 ? '+' : ''}${B.byStream[k] - (A.byStream[k] || 0)})`).join(', '));
  console.log(`totals: triangles ${A.triangles} -> ${B.triangles} (${B.triangles - A.triangles >= 0 ? '+' : ''}${B.triangles - A.triangles}), records ${A.records} -> ${B.records}`);
  const ok = !bad && !cellBad;
  console.log(ok ? 'SIGNATURE: old regions unchanged' : 'SIGNATURE: OLD REGIONS CHANGED');
  process.exit(ok ? 0 : 1);
}

// ---------------------------------------------------------------- DOM stubs (as tools/check.mjs)
class Ctx2D {
  constructor(c) { this.canvas = c; this.font = '10px sans-serif'; }
  measureText(t) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); const s = m ? Number(m[1]) : 10; return { width: [...String(t)].length * s * 0.92, actualBoundingBoxAscent: s * 0.8, actualBoundingBoxDescent: s * 0.2 }; }
  createLinearGradient() { return { addColorStop() {} }; } createRadialGradient() { return { addColorStop() {} }; } createConicGradient() { return { addColorStop() {} }; }
  createPattern() { return {}; }
  getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  createImageData(w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  putImageData() {} getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; } isPointInPath() { return false; } getLineDash() { return []; }
}
const ctxProxy = (c) => new Proxy(new Ctx2D(c), { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
class FakeCanvas { constructor() { this.width = 300; this.height = 150; this.style = {}; this._ctx = null; } getContext(type) { if (type !== '2d') return null; return this._ctx || (this._ctx = ctxProxy(this)); } toDataURL() { return 'data:,'; } addEventListener() {} removeEventListener() {} }
globalThis.window = globalThis; globalThis.self = globalThis;
globalThis.document = { createElement: (t) => (t === 'canvas' ? new FakeCanvas() : { style: {}, addEventListener() {}, appendChild() {}, setAttribute() {} }), createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }), fonts: { load: async () => [] }, body: { appendChild() {} }, addEventListener() {} };
globalThis.Image = class { constructor() { this.width = 1; this.height = 1; } addEventListener() {} };
globalThis.HTMLCanvasElement = FakeCanvas; globalThis.OffscreenCanvas = FakeCanvas;
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16);
globalThis.addEventListener = () => {};
globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });

// ---------------------------------------------------------------- build the city alone
const THREE = await import('three');
const { createContext } = await imp('src/core/ctx.js');
const { createAudio } = await imp('src/core/audio.js');
const L = await imp('src/world/layout.js');
const D = await imp('src/world/data/city.js');
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
let audio; try { audio = createAudio(); } catch (e) { audio = null; }
const ctx = createContext({ scene, camera, renderer: null, audio, quality: { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 }, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
ctx.buildList = ['city'];
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
const t0 = Date.now();
// --ref <git ref>: build the module AS COMMITTED at that ref (read with `git show`, nothing is checked out) against the CURRENT data, layout and claims. The landmark agents change their
// claims while you work: a baseline taken an hour ago differs in the records they claimed since. A baseline built from the old CODE over today's DATA differs only by your code.
let modulePath = 'src/world/city.js', ref = null;
if (args.ref) {
  const { extractCityRef } = await imp('tools/city-ref.mjs');
  ref = extractCityRef(root, args.ref[0]);
  modulePath = ref.path('city.js');
  console.log('built from', args.ref[0], '(' + ref.files.length + ' files) over the current data');
}
let city;
try { city = await imp(modulePath); await city.build(ctx); } finally { if (ref) ref.cleanup(); }
const buildMs = Date.now() - t0;
const svc = ctx.services.city;

// ---- region of every record id (the part files of data/city.js)
const regionOf = new Map();
for (const r of D.REGIONS) { const M = await imp('src/world/data/' + r.file); for (const b of M.BUILDINGS) regionOf.set(b.id, r.name); }
const regOf = (id) => regionOf.get(String(id).replace(/~f$/, '')) || '?';
if (!args.new) { try { NEW = new Set((await imp('src/world/city/district.js')).NEW_REGIONS); } catch (e) { /* a tree without district.js: the default list */ } }

// ---- 1. styles + walls per record
const num = (v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v);
const styleSig = (st) => JSON.stringify([st.arch, st.floors, num(st.H), st.tab && [num(st.tab.plinth), num(st.tab.G), num(st.tab.PN), num(st.tab.UF), st.tab.floors], st.hex, st.color && st.color.getHexString(), st.courtColor && st.courtColor.getHexString(), st.trim && st.trim.getHexString(),
  st.trimClass, st.roofHex, st.roofKnown, !!st.mansard, !!st.mansardOn, num(st.deckY), num(st.deckTop), !!st.erkers, st.turret, !!st.rich, st.gfTint, st.wear, st.restore, !!st.railing, !!st.granite, st.gate, st.shop, num(st.bayTarget), st.custom, !!st.noDeck, !!st.known]);
const wallSig = (w) => JSON.stringify([w.a.map(num), w.b.map(num), w.N, num(w.bw), w.arch, w.flags, w.balM, w.centre, w.shop, w.gate, num(w.base), num(w.plinth), num(w.G), num(w.PN), w.floors, num(w.H), (w.units || []).map((u) => [u.b0, u.b1, num(u.door)]), (w.doors || []).map((d) => num(d.s)), (w.bal || []).map((g) => [g.b0, g.b1])]);
const perRec = new Map();
for (const [id, st] of svc.styles) perRec.set(id, [styleSig(st)]);
for (const w of svc.walls) { const id = w.rec && w.rec.b ? w.rec.b.id : String(w.id).split(':')[0]; (perRec.get(id) || perRec.set(id, ['?']).get(id)).push(wallSig(w)); }
// --dump id,id: print the raw style / wall records of these ids (run once with --ref and once without, then compare: WHY did a record change)
if (args.dump) for (const id of args.dump.join(',').split(',')) { const p = perRec.get(id); console.log('DUMP', id, p ? p.length - 1 + ' walls' : 'not a city record'); if (p) for (const s of p) console.log('   ', s); }
const regions = {};
for (const [id, parts] of perRec) { const r = regOf(id); (regions[r] || (regions[r] = {}))[id] = sha(parts.join('|')); }

// ---- 2. geometry per (stream, cell)
const CELL = 320;
const cells = {};
let triangles = 0;
const cityRoot = scene.getObjectByName('city');
const byStream = {};                  // triangles per stream (walls / core / fine / roofs / railings / signs): where a change of the total comes from
const signQuads = new Map();          // cell -> ['x,y,z;...' per quad]: the atlas page / uv of a sign depends on every sign made before it, the place of the board does not
cityRoot.traverse((o) => {
  if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
  const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
  if (o.name === 'city-signs') {
    const p = g.attributes.position.array;
    triangles += g.index.count / 3; byStream['city-signs'] = (byStream['city-signs'] || 0) + g.index.count / 3;
    for (let i = 0; i + 11 < p.length; i += 12) {
      const cx = (p[i] + p[i + 3]) / 2, cz = (p[i + 2] + p[i + 5]) / 2, k = Math.floor(cx / CELL) + ',' + Math.floor(cz / CELL);
      let a = signQuads.get(k); if (!a) signQuads.set(k, (a = []));
      a.push(Array.from(p.subarray(i, i + 12), (v) => v.toFixed(3)).join(','));
    }
    return;
  }
  const h = crypto.createHash('sha1');
  for (const name of Object.keys(g.attributes).sort()) { const a = g.attributes[name].array; h.update(name); h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)); }
  if (g.index) h.update(Buffer.from(g.index.array.buffer, g.index.array.byteOffset, g.index.array.byteLength));
  { const t = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); triangles += t; byStream[o.name || 'mesh'] = (byStream[o.name || 'mesh'] || 0) + t; }
  // the streams are keyed by the cell of the point that created them; recover the cell from the first vertex (always inside or within a few metres of its cell)
  const p = g.attributes.position.array; let key = null;
  if (/^city-(walls|core|fine|roofs|railings)$/.test(o.name)) { let sx = 0, sz = 0, n = Math.min(p.length / 3, 2000); for (let i = 0; i < n; i++) { sx += p[i * 3]; sz += p[i * 3 + 2]; } key = Math.floor(sx / n / CELL) + ',' + Math.floor(sz / n / CELL); }
  let k = (o.name || 'mesh') + '|' + (key || 'all'); for (let n = 2; cells[k] !== undefined; n++) k = (o.name || 'mesh') + '|' + (key || 'all') + '|#' + n;
  cells[k] = h.digest('hex').slice(0, 16);
});
for (const [k, a] of signQuads) cells['city-signs|' + k] = sha(a.sort().join(';'));
// cells a new-region record may write into: its bounding box grown by 6 m, and the neighbouring cells of the centre (the stream key is a point of the building)
const newCells = new Set();
for (const b of D.BUILDINGS) {
  if (!NEW.has(regionOf.get(b.id))) continue;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const p of b.polys) for (let i = 0; i < p.o.length; i += 2) { x0 = Math.min(x0, p.o[i]); x1 = Math.max(x1, p.o[i]); z0 = Math.min(z0, p.o[i + 1]); z1 = Math.max(z1, p.o[i + 1]); }
  for (let cx = Math.floor((x0 - 6) / CELL); cx <= Math.floor((x1 + 6) / CELL); cx++) for (let cz = Math.floor((z0 - 6) / CELL); cz <= Math.floor((z1 + 6) / CELL); cz++) newCells.add(cx + ',' + cz);
}
// the sign atlas pages / LOD meshes that are not per cell ('all') count as mixed
newCells.add('all');

const out = { made: new Date().toISOString(), buildMs, serviceBuildMs: svc.buildMs, triangles: Math.round(triangles), byStream, newRegions: [...NEW], records: perRec.size, report: svc.report, regions, cells, newCells: [...newCells] };
const counts = Object.fromEntries(Object.entries(regions).map(([r, o]) => [r, Object.keys(o).length]));
console.log(JSON.stringify({ buildMs, serviceBuildMs: svc.buildMs, triangles: out.triangles, records: out.records, meshes: Object.keys(cells).length, regions: counts }));
if (args.out) { fs.mkdirSync(path.dirname(path.resolve(args.out[0])), { recursive: true }); fs.writeFileSync(args.out[0], JSON.stringify(out)); console.log('wrote', args.out[0]); }
process.exit(0);
