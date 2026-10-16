// Ribbon audit (headless node, no GPU): does anything that people walk on, or the walls under it, lie ON a carriageway or cut across a kerb?   (road integrity rules, docs/AGENT-BRIEF.md:
// "every drivable road is asphalt, nothing is laid over a carriageway"; the defect class found at Vosstaniya Square 2026-10-07: a vertical wall of a traffic-island polygon ran over the asphalt, across
// the kerb and on through the paving, drawn as a pale 0.4 m "beveled ribbon" by the outline pass; the island's paver polygon ended in a chord that did not meet the kerb arc.)
// Builds ONLY the streets module (the page's claims: ctx.buildList = src/main.js MODULES, as tools/streets-signature.mjs) and measures its own meshes against net.cover (the real asphalt):
//   W1  wall-on-asphalt   a vertical face (pt-skirt: the edge of raised paving / islands) whose base runs over asphalt (cover > 0) for more than 0.5 m          -> OFFENDER
//   W2  wall-across-kerb  a wall base that is on asphalt AND continues on the pavement side (cover < -0.3): the ribbon of the Vosstaniya report                     -> OFFENDER (subset of W1)
//   S1  surface-on-asphalt a triangle of a walking surface (slabs, pavers, strips, footways, steps, ramps, raised areas, islands) whose middle or two corners lie
//                          more than 0.35 m inside the asphalt (net.cover; fillets and strip patches included)                                                        -> OFFENDER
//   G1  cap-kerb gap      a boundary edge of a raised paving polygon (pt-area-paver / pt-area-island) that runs 0.3 - 1.5 m beside a stone kerb without meeting it   -> reported (a strip of bare
//                          ground / flat paving between the paving and the kerb); G2 = the same edge 1.5 - 4 m from a kerb (a free edge hovering inside a kerbed refuge: the island chord)
//   P1  scrap polygons    connected pieces of pt-area-paver / pt-area-island smaller than 1.5 m2 (leftovers of the carving: slivers)                                 -> reported
// usage: node tools/streets-ribbon-audit.mjs [--near x,z,r] [--all] [--json file] [--src dir] [--verbose] [--census] [--max-walls N] [--max-surf N]
//   --near x,z,r   audit only the metres within r of the point (default: the play area, layout.inPlay);   --all: the whole map
//   --src dir      load <dir>/streets.js instead of src/world/streets.js (a copy of an older revision: tools/streets-signature.mjs --export-rev <rev> <dir>) for before / after runs
//   --json file    every offender with its position, mesh and a screenshot pose;   --max-walls / --max-surf: the exit code is 1 when W1 offenders or S1 triangles exceed these counts (default 10 / 1000)
//   W3  interior seams     a wall whose two sides both carry a walking surface as high as its top (hidden by the paving; the outline pass draws it as a thin dark line across the pavement) -> reported
//   W4  orphan walls       a wall with no walking surface on either side (it stands alone on the ground) -> reported
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { mainModules } from './modules-list.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const NEAR = flag('near', null) ? String(flag('near')).split(',').map(Number) : null, ALL = !!flag('all', false), JSON_OUT = flag('json', null), SRC = flag('src', null);
const VERBOSE = !!flag('verbose', false), CENSUS = !!flag('census', false);
const MAX_WALLS = Number(flag('max-walls', 10)), MAX_SURF = Number(flag('max-surf', 1000));      // (2026-10-07 state of the play area: 4 wall segments, 936 surface triangles = 364 m2 of pavement strips over side-street mouths, see S1)
const log = (...a) => console.log(...a);

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
const L = await imp('src/world/layout.js');
const { deckAt } = await imp('src/world/streets/decks.js');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio: null, quality, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
ctx.buildList = mainModules();
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
const t0 = Date.now();
const mod = SRC ? await import(pathToFileURL(path.resolve(String(SRC), 'streets.js')).href) : await imp('src/world/streets.js');
await mod.build(ctx);
scene.updateMatrixWorld(true);
const net = ctx.services.streets && ctx.services.streets.net;
if (!net) { log('FAIL: no streets service'); process.exit(1); }
log(`streets built in ${Date.now() - t0} ms${SRC ? ' (from ' + SRC + ')' : ''}; ${net.ways.length} ways`);

const near = (x, z) => (!NEAR || Math.hypot(x - NEAR[0], z - NEAR[1]) <= NEAR[2]) && (ALL || L.inPlay(x, z));
const cover = (x, z) => net.cover(x, z, {});
const WALK = /^pt-(slab|paver|strip|ramp|foot|steps|foot-slab|foot-paver|foot-gravel|area-paver|area-island)$/;
const RAISED = /^pt-area-(paver|island)$/;

// ---------------------------------------------------------------- collect the meshes of the streets module
const meshes = []; const v3 = new THREE.Vector3();
scene.traverse((o) => {
  if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.geometry.attributes.position) return;
  const g = o.geometry, pos = g.attributes.position, idx = g.index, n = pos.count, P = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { v3.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); P[i * 3] = v3.x; P[i * 3 + 1] = v3.y; P[i * 3 + 2] = v3.z; }
  const seen = meshes.filter((q) => q.name === o.name).length;       // (two meshes are called pt-skirt: the pavement skirts of walks.js, then the area skirts of paths.js buildAreas: the second one reports as pt-skirt#2)
  meshes.push({ name: o.name, tag: seen ? `${o.name}#${seen + 1}` : o.name, P, idx: idx ? idx.array : null, nTri: idx ? idx.count / 3 : n / 3 });
});
if (CENSUS || VERBOSE) for (const m of meshes) log(`  mesh ${m.name.padEnd(18)} ${String(m.nTri).padStart(8)} tris`);
const V = (m, i) => { const k = m.idx ? m.idx[i] : i; return [m.P[k * 3], m.P[k * 3 + 1], m.P[k * 3 + 2]]; };
const offenders = [];
const poseOf = (x, z) => `${(x - 4).toFixed(1)},1.7,${(z + 4).toFixed(1)},-45,-12`;
const zoneTag = () => 'strip';                                                      // (the eight regions of the strip are all reviewed districts: one zone)

// ---------------------------------------------------------------- W1 / W2: walls
const walls = new Map();
for (const m of meshes) {
  if (m.name !== 'pt-skirt') continue;
  for (let t = 0; t < m.nTri; t++) {
    const a = V(m, t * 3), b = V(m, t * 3 + 1), c = V(m, t * 3 + 2);
    const ps = [a, b, c];
    // a vertical triangle projects onto a segment: the two most distant corners in plan
    let best = null, bd = 0;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) { const d = Math.hypot(ps[i][0] - ps[j][0], ps[i][2] - ps[j][2]); if (d > bd) { bd = d; best = [ps[i], ps[j]]; } }
    if (!best || bd < 0.3) continue;
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    if (Math.abs(ny) > 0.3 * Math.hypot(nx, ny, nz)) continue;          // only the vertical faces
    const [p, q] = best, key = m.tag + [p[0].toFixed(2), p[2].toFixed(2), q[0].toFixed(2), q[2].toFixed(2)].join(',');
    const key2 = m.tag + [q[0].toFixed(2), q[2].toFixed(2), p[0].toFixed(2), p[2].toFixed(2)].join(',');
    if (walls.has(key) || walls.has(key2)) { const w = walls.get(key) || walls.get(key2); w.top = Math.max(w.top, ps[0][1], ps[1][1], ps[2][1]); continue; }
    walls.set(key, { p: [p[0], p[2]], q: [q[0], q[2]], len: bd, top: Math.max(a[1], b[1], c[1]), src: m.tag });
  }
}
let nWall = 0, mWall = 0, nCross = 0, mCross = 0;
const wallSrc = {};
const wallOff = [];
for (const w of walls.values()) {
  const n = Math.max(1, Math.ceil(w.len / 0.4));
  let on = 0, off = 0, depth = 0, cx = 0, cz = 0, k = 0;
  for (let i = 0; i <= n; i++) {
    const x = w.p[0] + (w.q[0] - w.p[0]) * i / n, z = w.p[1] + (w.q[1] - w.p[1]) * i / n;
    if (!near(x, z) || deckAt(x, z, 0.3)) continue;
    const c = cover(x, z);
    if (c > 0) { on++; depth = Math.max(depth, c); cx += x; cz += z; k++; } else if (c < -0.3) off++;
  }
  const lenOn = on * w.len / n;
  if (lenOn < 0.5) continue;
  nWall++; mWall += lenOn;
  const cross = off > 0;
  if (cross) { nCross++; mCross += lenOn; }
  wallSrc[w.src] = (wallSrc[w.src] || 0) + 1;
  wallOff.push({ kind: cross ? 'W2' : 'W1', mesh: w.src, x: +(cx / k).toFixed(1), z: +(cz / k).toFixed(1), len: +w.len.toFixed(1), onAsphalt: +lenOn.toFixed(1), depth: +depth.toFixed(2), h: +w.top.toFixed(2), pose: poseOf(cx / k, cz / k), zone: zoneTag(cx / k, cz / k) });
}
offenders.push(...wallOff);

// ---------------------------------------------------------------- S1: walking surfaces on asphalt
const surf = { tris: 0, area: 0, byMesh: {}, list: [] };
const SURF_ON = 0.35, cells = new Map();
let nScan = 0;
for (const m of meshes) {
  if (!WALK.test(m.name)) continue;
  for (let t = 0; t < m.nTri; t++) {
    const a = V(m, t * 3), b = V(m, t * 3 + 1), c = V(m, t * 3 + 2);
    if (a[1] < 0.05 && b[1] < 0.05 && c[1] < 0.05) continue;             // (flush decals and under-pavement fills)
    const ux = b[0] - a[0], uz = b[2] - a[2], vx = c[0] - a[0], vz = c[2] - a[2], ar = Math.abs(ux * vz - uz * vx) / 2;
    if (ar < 1e-6) continue;
    const mx = (a[0] + b[0] + c[0]) / 3, mz = (a[2] + b[2] + c[2]) / 3;
    if (!near(mx, mz) || deckAt(mx, mz, 0.3)) continue;
    nScan++;
    const e = Math.max(Math.hypot(ux, uz), Math.hypot(vx, vz), Math.hypot(c[0] - b[0], c[2] - b[2])), n = e > 2.5 ? Math.ceil(e / 2) : 1;
    let on = 0, tot = 0, worst = -9;
    for (let i = 0; i <= n; i++) for (let j = 0; i + j <= n; j++) {
      const u = i / n, v = j / n, w = 1 - u - v, x = a[0] * w + b[0] * u + c[0] * v, z = a[2] * w + b[2] * u + c[2] * v, cv = cover(x, z);
      tot++; if (cv > SURF_ON) on++; if (cv > worst) worst = cv;
    }
    const cm = cover(mx, mz), isOff = n === 1 ? (cm > SURF_ON || on >= 2) : on * 2 > tot;
    if (!isOff) continue;
    surf.tris++; surf.area += ar; surf.byMesh[m.name] = (surf.byMesh[m.name] || 0) + 1;
    const key = Math.floor(mx / 12) + ',' + Math.floor(mz / 12) + ',' + m.name;
    let cl = cells.get(key); if (!cl) cells.set(key, (cl = { kind: 'S1', mesh: m.name, x: 0, z: 0, tris: 0, area: 0, depth: 0 }));
    cl.x += mx * ar; cl.z += mz * ar; cl.area += ar; cl.tris++; cl.depth = Math.max(cl.depth, worst);
  }
}
for (const cl of cells.values()) { cl.x = +(cl.x / cl.area).toFixed(1); cl.z = +(cl.z / cl.area).toFixed(1); cl.area = +cl.area.toFixed(1); cl.depth = +cl.depth.toFixed(2); cl.pose = poseOf(cl.x, cl.z); cl.zone = zoneTag(cl.x, cl.z); offenders.push(cl); }

// ---------------------------------------------------------------- W3: interior seams (walls that stand inside paving)
// a wall whose two sides both carry a walking surface as high as its top is a seam: hidden by the paving, but the outline pass draws its top edge as a thin dark line across the pavement
// (the "second polygon cutting across the paving" of the Vosstaniya report; pavements of two ways / a corner patch and its neighbours overlap, the walls are not subtracted).
const TG = 4, tgrid = new Map(), tlist = [];
for (const m of meshes) {
  if (!WALK.test(m.name)) continue;
  for (let t = 0; t < m.nTri; t++) {
    const a = V(m, t * 3), b = V(m, t * 3 + 1), c = V(m, t * 3 + 2), y = (a[1] + b[1] + c[1]) / 3;
    if (y < 0.08 || y > 0.17 || Math.max(a[1], b[1], c[1]) - Math.min(a[1], b[1], c[1]) > 0.02) continue;      // (the flat raised tops: pavements 0.12, areas 0.10, islands 0.15; no ramps)
    const id = tlist.length; tlist.push([a[0], a[2], b[0], b[2], c[0], c[2], y]);
    for (let cx = Math.floor(Math.min(a[0], b[0], c[0]) / TG); cx <= Math.floor(Math.max(a[0], b[0], c[0]) / TG); cx++) for (let cz = Math.floor(Math.min(a[2], b[2], c[2]) / TG); cz <= Math.floor(Math.max(a[2], b[2], c[2]) / TG); cz++) { const k = cx * 8192 + cz; let l = tgrid.get(k); if (!l) tgrid.set(k, (l = [])); l.push(id); }
  }
}
const topAt = (x, z) => {
  let best = 0;
  for (const id of tgrid.get(Math.floor(x / TG) * 8192 + Math.floor(z / TG)) || []) {
    const t = tlist[id], d = (t[3] - t[5]) * (t[0] - t[4]) + (t[4] - t[2]) * (t[1] - t[5]); if (Math.abs(d) < 1e-12) continue;
    const l1 = ((t[3] - t[5]) * (x - t[4]) + (t[4] - t[2]) * (z - t[5])) / d, l2 = ((t[5] - t[1]) * (x - t[4]) + (t[0] - t[4]) * (z - t[5])) / d, l3 = 1 - l1 - l2;
    if (l1 >= -1e-3 && l2 >= -1e-3 && l3 >= -1e-3 && t[6] > best) best = t[6];
  }
  return best;
};
let nSeam = 0, mSeam = 0, nOrph = 0, mOrph = 0; const seamSrc = {}, seamList = [], orphSrc = {};
for (const w of walls.values()) {
  if (w.top < 0.08 || w.top > 0.17) continue;
  const dx = w.q[0] - w.p[0], dz = w.q[1] - w.p[1], l = w.len, nx = -dz / l, nz = dx / l;
  let hid = 0, orph = 0, tot = 0, cx = 0, cz = 0, ox = 0, oz = 0;
  const n = Math.max(1, Math.ceil(l / 1.0));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = w.p[0] + dx * t, z = w.p[1] + dz * t;
    if (!near(x, z) || deckAt(x, z, 0.3)) continue;
    const hi = (px, pz) => topAt(px, pz) >= w.top - 0.03, A = hi(x + nx * 0.1, z + nz * 0.1), B = hi(x - nx * 0.1, z - nz * 0.1);
    tot++; if (A && B) { hid++; cx += x; cz += z; } else if (!A && !B) { orph++; ox += x; oz += z; }
  }
  if (tot && hid * 2 >= tot) { nSeam++; mSeam += hid * l / n; seamSrc[w.src] = (seamSrc[w.src] || 0) + 1;
    seamList.push({ kind: 'W3', mesh: w.src, x: +(cx / hid).toFixed(1), z: +(cz / hid).toFixed(1), len: +(hid * l / n).toFixed(1), h: +w.top.toFixed(2), pose: poseOf(cx / hid, cz / hid), zone: zoneTag(cx / hid, cz / hid) }); }
  // W4 orphan walls: neither side carries a walking surface (a wall standing alone on the ground: the end cap of a pavement that a landmark square owns, a polygon wall whose cap was carved away)
  if (tot && orph * 2 >= tot && l >= 0.6) { nOrph++; mOrph += orph * l / n; orphSrc[w.src] = (orphSrc[w.src] || 0) + 1;
    seamList.push({ kind: 'W4', mesh: w.src, x: +(ox / orph).toFixed(1), z: +(oz / orph).toFixed(1), len: +(orph * l / n).toFixed(1), h: +w.top.toFixed(2), pose: poseOf(ox / orph, oz / orph), zone: zoneTag(ox / orph, oz / orph) }); }
}
offenders.push(...seamList);

// ---------------------------------------------------------------- G1 / G2 / P1: the raised paving polygons against the stone kerb, and their scraps
// kerb top faces (pt-kerb, y 0.15, facing up): a grid of segments of their edges
const KG = 4, kgrid = new Map(), ksegs = [];
for (const m of meshes) {
  if (m.name !== 'pt-kerb') continue;
  for (let t = 0; t < m.nTri; t++) {
    const a = V(m, t * 3), b = V(m, t * 3 + 1), c = V(m, t * 3 + 2);
    if (Math.min(a[1], b[1], c[1]) < 0.14) continue;
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      if (Math.hypot(p[0] - q[0], p[2] - q[2]) < 1e-6) continue;
      const id = ksegs.length; ksegs.push([p[0], p[2], q[0], q[2]]);
      for (let cx = Math.floor((Math.min(p[0], q[0]) - 0.1) / KG); cx <= Math.floor((Math.max(p[0], q[0]) + 0.1) / KG); cx++) for (let cz = Math.floor((Math.min(p[2], q[2]) - 0.1) / KG); cz <= Math.floor((Math.max(p[2], q[2]) + 0.1) / KG); cz++) { const k = cx * 8192 + cz; let l = kgrid.get(k); if (!l) kgrid.set(k, (l = [])); l.push(id); }
    }
  }
}
const kerbDist = (x, z, R) => {
  let best = 1e9; const c0 = Math.floor((x - R) / KG), c1 = Math.floor((x + R) / KG), d0 = Math.floor((z - R) / KG), d1 = Math.floor((z + R) / KG);
  for (let cx = c0; cx <= c1; cx++) for (let cz = d0; cz <= d1; cz++) for (const id of kgrid.get(cx * 8192 + cz) || []) {
    const s = ksegs[id], dx = s[2] - s[0], dz = s[3] - s[1], l2 = dx * dx + dz * dz; let t = l2 < 1e-12 ? 0 : ((x - s[0]) * dx + (z - s[1]) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t); if (d < best) best = d;
  }
  return best;
};
const gaps = { G1: 0, G2: 0, mG1: 0, mG2: 0, scraps: 0, over: 0 }, gapList = [];
for (const m of meshes) {
  if (!RAISED.test(m.name)) continue;
  // weld, boundary edges (used once), components (union-find on welded vertices)
  const key = (p) => Math.round(p[0] * 200) + ',' + Math.round(p[2] * 200), ids = new Map(), par = [], pts = [];
  const vid = (p) => { const k = key(p); let i = ids.get(k); if (i === undefined) { i = pts.length; ids.set(k, i); pts.push(p); par.push(i); } return i; };
  const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const edges = new Map(), tris = [];
  for (let t = 0; t < m.nTri; t++) {
    const w = [V(m, t * 3), V(m, t * 3 + 1), V(m, t * 3 + 2)].map(vid);
    tris.push(w);
    for (let i = 0; i < 3; i++) { const p = w[i], q = w[(i + 1) % 3], k = p < q ? p + '_' + q : q + '_' + p; edges.set(k, (edges.get(k) || 0) + 1); const rp = find(p), rq = find(q); if (rp !== rq) par[rp] = rq; }
  }
  const area = new Map();
  for (const w of tris) { const a = pts[w[0]], b = pts[w[1]], c = pts[w[2]], ar = Math.abs((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0])) / 2, r = find(w[0]); const e = area.get(r) || { ar: 0, x: 0, z: 0 }; e.ar += ar; e.x += (a[0] + b[0] + c[0]) / 3 * ar; e.z += (a[2] + b[2] + c[2]) / 3 * ar; area.set(r, e); }
  for (const e of area.values()) if (e.ar < 1.5 && e.ar > 0) { const x = e.x / e.ar, z = e.z / e.ar; if (!near(x, z)) continue; gaps.scraps++; offenders.push({ kind: 'P1', mesh: m.name, x: +x.toFixed(1), z: +z.toFixed(1), area: +e.ar.toFixed(2), pose: poseOf(x, z), zone: zoneTag(x, z) }); }
  for (const [k, c] of edges) {
    if (c !== 1) continue;
    const [i, j] = k.split('_').map(Number), p = pts[i], q = pts[j], len = Math.hypot(p[0] - q[0], p[2] - q[2]), n = Math.max(1, Math.ceil(len / 0.5));
    let g1 = 0, g2 = 0, ov = 0, gx = 0, gz = 0, gk = 0;
    for (let s = 0; s <= n; s++) {
      const x = p[0] + (q[0] - p[0]) * s / n, z = p[2] + (q[2] - p[2]) * s / n;
      if (!near(x, z)) continue;
      const cv = cover(x, z); if (cv > 0.15) ov++;
      const d = kerbDist(x, z, 4.2);
      if (cv < -0.3 && d > 0.3 && d <= 1.5) { g1++; gx += x; gz += z; gk++; } else if (cv < -0.3 && d > 1.5 && d <= 4) { g2++; gx += x; gz += z; gk++; }
    }
    const m1 = g1 * len / n, m2 = g2 * len / n;
    if (m1 >= 1) { gaps.G1++; gaps.mG1 += m1; gapList.push({ kind: 'G1', mesh: m.name, x: +(gx / gk).toFixed(1), z: +(gz / gk).toFixed(1), len: +m1.toFixed(1), pose: poseOf(gx / gk, gz / gk), zone: zoneTag(gx / gk, gz / gk) }); }
    if (m2 >= 1.5) { gaps.G2++; gaps.mG2 += m2; gapList.push({ kind: 'G2', mesh: m.name, x: +(gx / gk).toFixed(1), z: +(gz / gk).toFixed(1), len: +m2.toFixed(1), pose: poseOf(gx / gk, gz / gk), zone: zoneTag(gx / gk, gz / gk) }); }
    if (ov * len / n >= 0.5) gaps.over++;
  }
}
offenders.push(...gapList);

// ---------------------------------------------------------------- report
log(`\nstreets-ribbon-audit${NEAR ? ' near ' + NEAR.join(',') : ALL ? ' (whole map)' : ' (play area)'}: ${walls.size} wall segments, ${nScan} walking-surface triangles scanned`);
log(`  W1 walls over asphalt        ${String(nWall).padStart(5)} segments  ${mWall.toFixed(0).padStart(6)} m   (of them W2: across the kerb onto the pavement: ${nCross} segments, ${mCross.toFixed(0)} m)   by mesh ${JSON.stringify(wallSrc)}  (pt-skirt = walks.js pavement skirts, pt-skirt#2 = paths.js area walls)`);
log(`  S1 surfaces over asphalt     ${String(surf.tris).padStart(5)} triangles ${surf.area.toFixed(0).padStart(6)} m2  by mesh ${JSON.stringify(surf.byMesh)}`);
log(`  W3 interior seams (walls inside paving: thin dark lines across the pavement)  ${nSeam} segments  ${mSeam.toFixed(0)} m  by mesh ${JSON.stringify(seamSrc)}   (reported only)`);
log(`  W4 orphan walls (no walking surface on either side: a wall standing alone)   ${nOrph} segments  ${mOrph.toFixed(0)} m  by mesh ${JSON.stringify(orphSrc)}   (reported only)`);
log(`  G1 cap edge 0.3-1.5 m off kerb ${String(gaps.G1).padStart(4)} edges   ${gaps.mG1.toFixed(0).padStart(6)} m   G2 free edge 1.5-4 m off kerb ${gaps.G2} edges ${gaps.mG2.toFixed(0)} m   (reported only)`);
log(`  P1 scrap polygons (< 1.5 m2) ${String(gaps.scraps).padStart(5)}       cap edges over asphalt (> 0.15 m): ${gaps.over}`);
const top = offenders.filter((o) => o.kind === 'W1' || o.kind === 'W2' || o.kind === 'S1').sort((a, b) => (b.onAsphalt || b.area || 0) - (a.onAsphalt || a.area || 0)).slice(0, 25);
if (top.length) { log('\nlargest offenders (W1 / W2 / S1):'); for (const o of top) log(`  ${o.kind} ${o.zone} ${o.mesh || 'pt-skirt'} at ${o.x},${o.z}  ${o.onAsphalt !== undefined ? `${o.onAsphalt} m of a ${o.len} m wall, ${o.h} m high, ${o.depth} m deep` : `${o.tris} tris ${o.area} m2, ${o.depth} m deep`}   pose ${o.pose}`); }
const g = gapList.slice().sort((a, b) => b.len - a.len).slice(0, 10);
if (g.length) { log('\nlargest gaps (G1 / G2):'); for (const o of g) log(`  ${o.kind} ${o.zone} ${o.mesh} at ${o.x},${o.z}  ${o.len} m   pose ${o.pose}`); }
const byZone = {}; for (const o of offenders) { const z = o.zone + ':' + o.kind; byZone[z] = (byZone[z] || 0) + 1; }
log('\nby zone and kind:', JSON.stringify(byZone));
if (JSON_OUT) { fs.mkdirSync(path.dirname(path.resolve(String(JSON_OUT))), { recursive: true }); fs.writeFileSync(String(JSON_OUT), JSON.stringify({ summary: { walls: nWall, wallMetres: +mWall.toFixed(1), across: nCross, surfTris: surf.tris, surfArea: +surf.area.toFixed(1), byMesh: surf.byMesh, gaps, scraps: gaps.scraps }, offenders }, null, 1)); log('json ->', JSON_OUT); }
const fail = nWall > MAX_WALLS || surf.tris > MAX_SURF;
log(fail ? `RESULT: FAIL (${nWall} wall segments over asphalt, max ${MAX_WALLS}; ${surf.tris} surface triangles over asphalt, max ${MAX_SURF})` : 'RESULT: OK');
process.exit(fail ? 1 : 0);
