// Before / after signature of the streets module (headless node, no GPU): proves that a change of the generator did not touch an area the user has already reviewed.
// Builds ONLY streets (with the page's claims: ctx.buildList = src/main.js MODULES) and digests everything it produced per 640 m cell and per zone:
//   * every mesh of the module: triangles (by centroid) + an order-independent hash of the vertex positions rounded to 1 cm; instanced meshes: instances + a hash of their matrices,
//   * the colliders it registered, the overhead wire polylines (ctx.wires),
//   * the service lists (lanes, connectors, stop lines, signals, crosswalks, lamps, plates, bus stops, parked slots, wire pairs / spans / masts / anchors, guard rails, pavements).
// Zones: 'new' = the open districts of src/world/streets/region.js (isOpen: the extent of the regions from FIRST_OPEN on, outside every reviewed PLAY rectangle: where the rules of the latest
//        extension apply) PLUS the deck of the Blagoveshchensky Bridge (bridges/sites-vo.js blagDeckY != null: the bridge reaches into a reviewed district, its deck is new ground, 2026-10-08);
//        'old' = the reviewed districts. `--diff a.json b.json` lists every (zone, cell, item) whose count or hash differs and exits 1 when an 'old' entry differs.
// usage: node tools/streets-signature.mjs --out file.json [--src dir] [--cell 640] [--dump lists.json]
//          --src dir : load <dir>/streets.js instead of src/world/streets.js (a copy of an older revision whose imports point at this tree: tools/streets-signature.mjs --export-rev <git rev> <dir>)
//        node tools/streets-signature.mjs --export-rev <rev> <dir>     write the streets module of a git revision to <dir> with absolute imports (read-only git: git show)
//          --build a,b : ctx.buildList (default: every module of src/main.js MODULES = the claims and bridge decks of the page)
//        node tools/streets-signature.mjs --diff before.json after.json [--verbose] [--allow "cx,cz;cx,cz"]
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { mainModules } from './modules-list.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf('--' + k); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '1') : d; };
const VERBOSE = argv.includes('--verbose');

// ---------------------------------------------------------------- --export-rev: the module of a git revision, importable from anywhere
if (argv.includes('--export-rev')) {
  const i = argv.indexOf('--export-rev'), rev = argv[i + 1], dir = path.resolve(argv[i + 2]);
  const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).trim();
  const rel = path.relative(repo, root).replace(/\\/g, '/');
  const show = (p) => execFileSync('git', ['show', `${rev}:${rel}/${p}`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', rev, `${rel}/src/world/streets/`], { cwd: repo, encoding: 'utf8' }).split('\n').filter(Boolean).map((f) => f.slice(rel.length + 1));
  /** every relative import that leaves the module becomes an absolute file URL of THIS tree (three: the URL node resolves here, so it is the same instance); imports inside the module stay relative */
  const fix = (src, fromRel) => src.replace(/(from\s+|import\s*\(\s*|import\s+)(['"])([^'"]+)\2/g, (m, pre, q, spec) => {
    if (spec === 'three' || spec.startsWith('three/')) return `${pre}${q}${import.meta.resolve(spec)}${q}`;
    if (!spec.startsWith('.')) return m;
    const abs = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
    if (abs === 'src/world/streets.js' || abs.startsWith('src/world/streets/')) return m;
    return `${pre}${q}${pathToFileURL(path.join(root, abs)).href}${q}`;
  });
  fs.mkdirSync(path.join(dir, 'streets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'streets.js'), fix(show('src/world/streets.js'), 'src/world/streets.js'));
  for (const f of files) { const out = path.join(dir, f.slice('src/world/'.length)); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, fix(show(f), f)); }
  console.log(`exported streets of ${rev}: ${files.length + 1} files -> ${dir}`);
  process.exit(0);
}

// ---------------------------------------------------------------- --diff
if (argv.includes('--diff')) {
  const i = argv.indexOf('--diff'), A = JSON.parse(fs.readFileSync(argv[i + 1], 'utf8')), B = JSON.parse(fs.readFileSync(argv[i + 2], 'utf8'));
  let bad = 0, allowed = 0;
  const ALLOW = new Set(String(opt('allow', '')).split(';').map((c) => c.trim()).filter(Boolean));       // --allow "cx,cz;cx,cz": cells of the reviewed zone whose change is intended (they are listed, not counted)
  for (const zone of ['old', 'new']) {
    const a = A.zones[zone] || {}, b = B.zones[zone] || {}, cells = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    let same = 0, diff = 0, items = 0; const rows = [];
    for (const c of cells) {
      const ca = a[c] || {}, cb = b[c] || {}, names = [...new Set([...Object.keys(ca), ...Object.keys(cb)])].sort(), d = [];
      for (const n of names) { items++; const x = ca[n] || [0, 0], y = cb[n] || [0, 0]; if (x[0] !== y[0] || x[1] !== y[1]) d.push(`${n} ${x[0]}->${y[0]}${x[0] === y[0] ? ' (moved)' : ''}`); }
      if (d.length) { const ok = zone === 'old' && ALLOW.has(c); if (ok) allowed++; else diff++; rows.push(`  cell ${c} (x ${c.split(',')[0] * A.cell}.., z ${c.split(',')[1] * A.cell}..)${ok ? ' [allowed]' : ''}: ${d.join('; ')}`); } else same++;
    }
    const ta = Object.values(a).reduce((s, c) => s + Object.entries(c).reduce((q, [n, v]) => q + (n.startsWith('mesh:') ? v[0] : 0), 0), 0), tb = Object.values(b).reduce((s, c) => s + Object.entries(c).reduce((q, [n, v]) => q + (n.startsWith('mesh:') ? v[0] : 0), 0), 0);
    console.log(`zone ${zone}: ${cells.length} cells, ${same} identical, ${diff} differ; triangles ${ta} -> ${tb} (${tb - ta >= 0 ? '+' : ''}${tb - ta})`);
    if (zone === 'old' || VERBOSE) for (const r of rows.slice(0, VERBOSE ? 1e9 : 60)) console.log(r);
    if (zone === 'old') bad = diff;
  }
  console.log(`total triangles ${A.triangles} -> ${B.triangles} (${B.triangles - A.triangles >= 0 ? '+' : ''}${B.triangles - A.triangles})`);
  console.log(bad ? `RESULT: FAIL (${bad} old cells changed)` : allowed ? `RESULT: OK (the old zone is identical except the ${allowed} allowed cells listed above)` : 'RESULT: OK (the old zone is identical)');
  process.exit(bad ? 1 : 0);
}

// ---------------------------------------------------------------- DOM stubs (same as tools/check.mjs)
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
globalThis.window = globalThis; globalThis.self = globalThis;
globalThis.document = {
  createElement: (t) => (t === 'canvas' ? new FakeCanvas() : { style: {}, addEventListener() {}, appendChild() {}, setAttribute() {} }),
  createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }),
  fonts: { load: async () => [] }, body: { appendChild() {} }, addEventListener() {},
};
globalThis.Image = class { constructor() { this.width = 1; this.height = 1; } addEventListener() {} };
globalThis.HTMLCanvasElement = FakeCanvas; globalThis.OffscreenCanvas = FakeCanvas;
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16);
globalThis.addEventListener = () => {};
globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
globalThis.performance = globalThis.performance || { now: () => Date.now() };

const THREE = await import('three');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const { createContext } = await imp('src/core/ctx.js');
const { createAudio } = await imp('src/core/audio.js');
const L = await imp('src/world/layout.js');
const { REGIONS } = await imp('src/world/data/city.js');

const OUT = opt('out'), SRC = opt('src'), CELL = Number(opt('cell', 640));
if (!OUT) { console.log('usage: node tools/streets-signature.mjs --out file.json [--src dir] | --diff a.json b.json | --export-rev <rev> <dir>'); process.exit(1); }
const { isOpen, FIRST_OPEN } = await imp('src/world/streets/region.js');       // the zones are the generator's own: 'new' = the open districts (streets/region.js), 'old' = the reviewed ones
// the Blagoveshchensky Bridge reaches into a reviewed district (its south half), but the DECK is new ground (bridges/blag.js draws it; the wires over its humped deck are redone, 2026-10-08): everything that lies on the deck rectangle
// (bridges/sites-vo.js blagDeckY: |v| <= 19.0, u -1.2 .. 333.8) counts as the 'new' zone. Nothing off the deck changes zone.
const { blagDeckY } = await imp('src/world/bridges/sites-vo.js');
const zoneOf = (x, z) => (isOpen(x, z) || blagDeckY(x, z) != null ? 'new' : 'old');
void REGIONS;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
let audio; try { audio = createAudio(); } catch { audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
ctx.buildList = opt('build') ? String(opt('build')).split(',') : mainModules();      // the page's claims and bridge decks (--build streets: no claims, as `node tools/check.mjs streets`)
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };

const zones = { old: {}, new: {} };
const q = (v) => Math.round(v * 100) | 0;
const mix = (a, b, c) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b ^ 0x7f4a7c15, 0xc2b2ae35) ^ Math.imul(c ^ 0x165667b1, 0x27d4eb2f); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return h >>> 0; };
const put = (name, x, z, h) => {
  if (!Number.isFinite(x) || !Number.isFinite(z)) { x = 0; z = 0; }
  const zn = zones[zoneOf(x, z)], k = Math.floor(x / CELL) + ',' + Math.floor(z / CELL), c = zn[k] || (zn[k] = {}), e = c[name] || (c[name] = [0, 0]);
  e[0]++; e[1] = (e[1] + h) >>> 0;
};

const colliders = [];
{ const ins = ctx.physics._insert.bind(ctx.physics); ctx.physics._insert = (it) => { colliders.push(it); return ins(it); }; }
const wireLists = [];
{ const add = ctx.wires.add.bind(ctx.wires); ctx.wires.add = (pts, o) => { wireLists.push(pts); return add(pts, o); }; }

const warns = [];
{ const w = console.warn; console.warn = (...a) => { warns.push(a.join(' ')); w(...a); }; }
const t0 = Date.now();
const mod = await import(SRC ? pathToFileURL(path.join(path.resolve(SRC), 'streets.js')).href : pathToFileURL(path.join(root, 'src/world/streets.js')).href);
await mod.build(ctx);
const buildMs = Date.now() - t0;
scene.updateMatrixWorld(true);

let triangles = 0;
const v = new THREE.Vector3(), M = new THREE.Matrix4();
scene.traverse((o) => {
  if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
  const g = o.geometry, P = g.attributes.position, name = 'mesh:' + (o.name || o.material?.name || '?');
  if (o.isInstancedMesh) {
    const per = g.index ? g.index.count / 3 : P.count / 3;
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, M); M.premultiply(o.matrixWorld); const e = M.elements;
      put('inst:' + (o.name || '?'), e[12], e[14], mix(q(e[12]), q(e[13]), q(e[14])) + mix(q(e[0] * 10), q(e[5] * 10), q(e[10] * 10)));
      triangles += per;
    }
    return;
  }
  const idx = g.index ? g.index.array : null, n = idx ? idx.length : P.count, a = P.array, mw = o.matrixWorld, ident = mw.equals(new THREE.Matrix4());
  const at = (i, out) => { out.set(a[3 * i], a[3 * i + 1], a[3 * i + 2]); if (!ident) out.applyMatrix4(mw); return out; };
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let i = 0; i + 2 < n; i += 3) {
    at(idx ? idx[i] : i, A); at(idx ? idx[i + 1] : i + 1, B); at(idx ? idx[i + 2] : i + 2, C);
    put(name, (A.x + B.x + C.x) / 3, (A.z + B.z + C.z) / 3, (mix(q(A.x), q(A.y), q(A.z)) + mix(q(B.x), q(B.y), q(B.z)) + mix(q(C.x), q(C.y), q(C.z))) >>> 0);
    triangles++;
  }
});
void v;
for (const it of colliders) put('collider:' + it.type, it.cx, it.cz, mix(q(it.cx), q(it.cz), q(it.r ?? (it.hw + it.hd * 7))));
for (const pts of wireLists) { const p = pts.map((x) => (Array.isArray(x) ? x : [x.x, x.y, x.z])); let h = 0; for (const x of p) h = (h + mix(q(x[0]), q(x[1]), q(x[2]))) >>> 0; put('wire', p[0][0], p[0][2], h); }

const st = ctx.services.streets;
const P2 = (name, x, z, extra = 0) => put('svc:' + name, x, z, mix(q(x), q(z), extra | 0));
const poly = (pts) => { let h = 0; for (const p of pts) h = (h + mix(q(p[0]), q(p[p.length - 1]), p.length === 3 ? q(p[1]) : 0)) >>> 0; return h; };
if (st) {
  for (const l of st.lanes) put('svc:lanes', l.pts[0][0], l.pts[0][1], poly(l.pts));
  for (const c of st.connectors) put('svc:connectors', c.pts[0][0], c.pts[0][1], poly(c.pts));
  for (const s of st.stopLines) P2('stopLines', s.x, s.z, s.signal ? 1 : 0);
  for (const s of st.signals) P2('signals', s.x, s.z, s.approaches.length);
  for (const j of st.junctions) P2('junctions', j.x, j.z, j.arms.length);
  for (const c of st.crosswalks) P2('crosswalks', c.x, c.z, q(c.w));
  for (const l of st.lamps) P2('lamps', l.x, l.z, q(l.h));
  for (const p of st.streetPlates) put('svc:plates', p.x, p.z, mix(q(p.x), q(p.z), q(p.y)) + [...String(p.text)].reduce((h, ch) => (Math.imul(h, 31) + ch.codePointAt(0)) | 0, 7));
  for (const b of st.busStops) P2('busStops', b.x, b.z, b.shelter ? 1 : 0);
  for (const s of st.parkedSlots) P2('parkedSlots', s.x, s.z, q(s.rotY));
  for (const g of st.guardRails) put('svc:guardRails', g.pts[0][0], g.pts[0][1], poly(g.pts));
  for (const s of st.sidewalks) put('svc:sidewalks', s.pts[0][0], s.pts[0][1], poly(s.pts));
  for (const s of st.paths) put('svc:paths', s.pts[0][0], s.pts[0][1], poly(s.pts));
  for (const t of st.tram) put('svc:tram', t.pts[0], t.pts[1], 1);
  for (const r of st.roads) put('svc:roads', r.pts[0][0], r.pts[0][1], poly(r.pts) + q(r.w));
  if (st.wires) {
    for (const p of st.wires.pairs) put('svc:wirePairs', p.pts[0][0], p.pts[0][2], poly(p.pts));
    for (const p of st.wires.arcs) put('svc:wireArcs', p.pts[0][0], p.pts[0][2], poly(p.pts));
    for (const s of st.wires.spans) put('svc:wireSpans', s.a[0], s.a[2], mix(q(s.b[0]), q(s.b[1]), q(s.b[2])));
    for (const m of st.wires.masts) P2('wireMasts', m.x ?? m[0], m.z ?? m[2] ?? m[1]);
    for (const a of st.wires.anchors) P2('wireAnchors', a.x, a.z, q(a.y));
  }
}
const count = (zn) => Object.values(zones[zn]).reduce((s, c) => s + Object.keys(c).length, 0);
if (opt('dump') && st) {                                                  // --dump file.json: the furniture lists with their zone (to see WHAT differs in a cell)
  const r2 = (v) => Math.round(v * 100) / 100, z = (x, zz) => zoneOf(x, zz);
  fs.writeFileSync(path.resolve(opt('dump')), JSON.stringify({
    lamps: st.lamps.map((l) => [r2(l.x), r2(l.z), l.kind, z(l.x, l.z)]), busStops: st.busStops.map((b) => [r2(b.x), r2(b.z), b.name, b.shelter ? 1 : 0, b.road, z(b.x, b.z)]),
    plates: st.streetPlates.map((p) => [r2(p.x), r2(p.z), r2(p.y), p.text, z(p.x, p.z), r2(p.nx || 0), r2(p.nz || 0)]), wireMasts: st.wires ? st.wires.masts.map((m) => [r2(m.x), r2(m.z), z(m.x, m.z)]) : [],
    colliders: colliders.map((it) => [r2(it.cx), r2(it.cz), it.type, r2(it.r ?? it.hw), z(it.cx, it.cz)]), stats: ctx.services.streetsStats,
  }));
}
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
fs.writeFileSync(path.resolve(OUT), JSON.stringify({ cell: CELL, src: SRC || 'src/world', firstOpen: FIRST_OPEN, triangles, buildMs, warnings: warns, zones }));
console.log(`streets signature: ${triangles} triangles, build ${buildMs} ms, ${colliders.length} colliders, ${wireLists.length} wire polylines; old zone ${Object.keys(zones.old).length} cells / ${count('old')} entries, new zone ${Object.keys(zones.new).length} cells / ${count('new')} entries${warns.length ? '; ' + warns.length + ' warnings' : ''} -> ${OUT}`);
process.exit(0);
