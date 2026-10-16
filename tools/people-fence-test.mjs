// Headless fence test of the people module (no GPU): do pedestrians walk through guard rails, chains and wall colliders?  (written 2026-10-07: "people walk through the fences" at Vosstaniya Square)
//   node tools/people-fence-test.mjs [--minutes 5] [--at x,z | --at station] [--mods a,b,c] [--q high|medium|low] [--json out.json] [--why] [--plot "x0,x1,z0,z1,px_per_m,file.png;..."] [--strict]
//   node tools/people-fence-test.mjs --fenceoff ...                 A/B: the world WITHOUT the rail / chain colliders (streets/barriers.js: ?fences=off), the old behaviour
//   node tools/people-fence-test.mjs --mods environment,streets,city,rail,landmarksA --walk [--fenceoff]    the PLAYER's detours (breadth-first search with the real collision, radius 0.3 m) from the start pose to the places of the square
//   node tools/people-fence-test.mjs --mods environment,streets --eval probe.mjs                           builds the modules and runs probe.mjs (default export (ctx, L, THREE, fences)); --probe lists the fence-like meshes
// Builds environment, streets, city, rail, landmarksA, metro, props, traffic and people in node (like tools/people-test.mjs; ~2 min, needs --max-old-space-size=10000), then
//   1. STATIC: lists the fence-like segments (guard rails = services.streets.guardRails polylines minus 0.3 m at the run ends; chain spans = the chain colliders (or, with --fenceoff, consecutive
//      bollards closer than 3.2 m); thin wall colliders = physics boxes <= 0.45 m thick and >= 0.6 m long, 0.45 .. 1.7 m up) and counts the edges of the pedestrian routing graph that cross each
//      class, plus the graph nodes that stand ON a rail (< 0.3 m) or between a rail and its kerb (--why prints the first offending edges with the colliders near the crossing point);
//   2. DYNAMIC: runs the simulation for --minutes (the player stands at --at, default the station square 592,165) and records every visible pedestrian step (0.1 s) that crosses a
//      fence segment (steps longer than 0.8 m are teleports and are counted apart), with the cause (scene / kind / crossing state) and the place; plus the people near the rails (RUBBING:
//      steps within 0.45 m, walkers that stand still or are blocked there, the STALLED agents), the kerb queues (KERB QUEUES: waits, biggest queues) and the busiest 2 m cells (HEAT);
//   3. prints the table by class and cause, crossings per simulated minute, the worst places (6 m cells) and the people build time (ms); --plot writes a PNG plan of the area (asphalt grey,
//      buildings dark, rails red, chains orange, colliders blue, routing graph green, nodes of other components purple, crossing events magenta, people black, people heat orange).
// --strict exits 1 when a rail / chain / wall crossing survives.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

globalThis.__peopleCpu = process.argv.includes('--cpu');
if (process.argv.includes('--isloff')) globalThis.__islOff = true;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

if (process.argv.includes('--fenceoff')) globalThis.__fenceOff = true;             // A/B: the world without the guard rail / chain colliders
if (process.argv.includes('--vooff')) globalThis.__voOff = true;                   // the population without Vasilievsky Island (the old reach)
const THREE = await import('three');
const { createContext } = await import(pathToFileURL(path.join(root, 'src/core/ctx.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? Number(args[i + 1]) || args[i + 1] : true); };
const MIN = Number(flag('minutes', 5));
const AT = { station: [592, 165], square: [592, 165], ligovsky: [640, 250], hotel: [575, 190] };
const atArg = flag('at', 'station'); let PL = AT[atArg] || String(atArg).split(',').map(Number);
// --tour "x,z;x,z;..." (or --vo --tour island): the player visits the places one after the other, equal shares of --minutes (the fences of the island are everywhere: one build, many places)
const ISLAND_TOUR = '-3395,-535;-3090,-700;-3800,-820;-4080,-1145;-3765,-1690;-4562,362;-5040,0;-5430,-110;-5586,-1330;-5600,-1510;-6232,912;-6495,640;-7560,-760;-6968,20';
const ISL2_TOUR = '-6405,-5309;-4570,-5226;-4625,-5262;-5233,-5343;-5537,-5384;-5545,-5120;-5921,-5211;-5214,-4909;-2880,-5338;-2861,-5413;-1503,-4160;-1560,-4250;-1757,-4055;-4200,-2680;-4758,-2866;-7310,-4380;-2964,-5040;-1466,-4534;-1565,-4404;-5343,-3256;-3550,-2370';      // --isl2 --tour islands2: the islands of round 2 (people/isl2.js)
const tourArg = flag('tour', null); const TOURP = tourArg ? String(tourArg === 'island' ? ISLAND_TOUR : tourArg === 'islands2' ? ISL2_TOUR : tourArg).split(';').map((s) => s.split(',').map(Number)) : null; if (TOURP) PL = TOURP[0];

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
camera.position.set(L.HERO.x, 1.6, L.HERO.z); camera.rotation.set(0, 0, 0); camera.updateMatrixWorld(true);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
const quality = { name: String(flag('q', 'high')), pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio: null, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
// --vo: the Vasilievsky Island build (all sixteen island sight modules in the page order of main.js + bridges); --mods overrides; --vooff = the old reach
const VO_MODS = 'environment,streets,city,rail,landmarksA,landmarksOktyabrsky,landmarksModernVO,landmarksMarineFacade,landmarksPribaltiyskaya,landmarksGavan,landmarksSredny,landmarksMakarova,landmarksKirova,landmarksSevkabel,landmarksSeaTerminal,landmarksSmolensky,landmarksNavalCorps,landmarksAndrew,landmarksMining,landmarksMenshikov,landmarksAcademy,bridges,metro,props,traffic,people';
const ISL2_MODS = 'environment,streets,city,rail,landmarksA,landmarksKrestovsky,landmarksYelaginPalace,landmarksYelaginKitchen,landmarksYelaginServices,landmarksYelaginRossi,landmarksYelaginSpits,landmarksYelaginPark,landmarksKamennyPalace,landmarksKamennyChurch,landmarksBotanicalGreenhouses,landmarksBotanicalGarden,landmarksPetrovskyStadium,landmarksPetrovskyYacht,landmarksKamennyTheatre,landmarksKamennyDachasEast,landmarksKamennyDachasWest,landmarksTVTower,landmarksLETI,landmarksTransfiguration,landmarksPetrovskyWest,landmarksZhdanovka,bridges,metro,props,traffic,people';
const wanted = String(flag('mods', args.includes('--vo') ? VO_MODS : args.includes('--isl2') ? ISL2_MODS : 'environment,streets,city,rail,landmarksA,metro,props,traffic,people')).split(',');
ctx.buildList = wanted;
const times = {};
for (const m of wanted) {
  const t0 = Date.now();
  try { const mod = await import(pathToFileURL(path.join(root, `src/world/${m}.js`)).href); await mod.build(ctx); times[m] = Date.now() - t0; }
  catch (e) { console.log(`(module ${m} failed to build: ${String(e && e.message).split('\n')[0]})`); if (m === 'people' || m === 'environment' || m === 'streets') { console.log(e.stack); process.exit(1); } }
}
console.log('built', JSON.stringify(times));

// ---------------------------------------------------------------- the fence segments
const st = ctx.services.streets;
const fences = [];                                           // { cls, id, ax, az, bx, bz }
for (const g of st.guardRails || []) for (let i = 0; i + 1 < g.pts.length; i++) {          // (the first / last 0.3 m of a run are not tested: an end post is walked around, and a stretch below 0.3 m is not drawn)
  let [ax, az] = g.pts[i], [bx, bz] = g.pts[i + 1]; const l = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / l, uz = (bz - az) / l;
  if (i === 0 && l > 0.9) { ax += ux * 0.3; az += uz * 0.3; } if (i + 2 === g.pts.length && l > 0.9) { bx -= ux * 0.3; bz -= uz * 0.3; }
  fences.push({ cls: 'rail', id: g.id, ax, az, bx, bz }); }
const chainBoxes = ctx.physics.items.filter((it) => it.fence && it.type === 'box' && it.y1 < 1);          // the chain colliders of barriers.js (when they exist): the exact spans
for (const it of chainBoxes) { const hw = it.hw, hd = it.hd, ux = hw >= hd ? it.c : it.s, uz = hw >= hd ? -it.s : it.c, l = Math.max(hw, hd); fences.push({ cls: 'chain', id: 'cb', ax: it.cx - ux * l, az: it.cz - uz * l, bx: it.cx + ux * l, bz: it.cz + uz * l }); }
// the TALL fence runs a sight module builds (flagged `fence` like the chain colliders, 1 m and higher: the Academy garden fence, the cemetery bars, the Menshikov iron fence, the Kirova garden ring, the Sevkabel plates ...)
for (const it of ctx.physics.items) { if (!(it.fence && it.type === 'box' && it.y1 >= 1 && it.y0 < 1.7)) continue; const hw = it.hw, hd = it.hd, ux = hw >= hd ? it.c : it.s, uz = hw >= hd ? -it.s : it.c, l = Math.max(hw, hd); fences.push({ cls: 'fence', id: 'fb', ax: it.cx - ux * l, az: it.cz - uz * l, bx: it.cx + ux * l, bz: it.cz + uz * l }); }
if (!chainBoxes.length) { // (without colliders: the bollard pairs) chain spans: consecutive chain bollards (a cylinder r 0.11 .. 0.85 m high) within 3.2 m, each post linked to its nearest unlinked neighbours on its run
  const posts = ctx.physics.items.filter((it) => it.type === 'cyl' && Math.abs(it.r - 0.11) < 1e-6 && Math.abs(it.y1 - 0.85) < 1e-6);
  const G = new Map(), key = (x, z) => Math.floor(x / 4) * 8192 + Math.floor(z / 4);
  posts.forEach((p, i) => { const k = key(p.cx, p.cz); let a = G.get(k); if (!a) G.set(k, (a = [])); a.push(i); });
  const seen = new Set();
  posts.forEach((p, i) => {
    for (let cx = Math.floor((p.cx - 3.3) / 4); cx <= Math.floor((p.cx + 3.3) / 4); cx++) for (let cz = Math.floor((p.cz - 3.3) / 4); cz <= Math.floor((p.cz + 3.3) / 4); cz++) for (const j of G.get(cx * 8192 + cz) || []) {
      if (j <= i) continue; const q = posts[j], d = Math.hypot(q.cx - p.cx, q.cz - p.cz); if (d > 3.2 || d < 0.5) continue;
      const k = i + '_' + j; if (seen.has(k)) continue; seen.add(k); fences.push({ cls: 'chain', id: 'c' + i, ax: p.cx, az: p.cz, bx: q.cx, bz: q.cz });
    }
  });
}
for (const it of ctx.physics.items) {                          // thin wall colliders (fences, low walls, shelter panels): the control group, nav.pushOut already stops people there
  if (it.type !== 'box' || it.fence || it.y1 <= 0.45 || it.y0 >= 1.7 || it.y0 < -1) continue;       // (the fence boxes of barriers.js are the rails / chains themselves, counted as such)
  const hw = it.hw, hd = it.hd, thin = Math.min(hw, hd) <= 0.225, len = Math.max(hw, hd); if (!thin || len < 0.6) continue;
  const ux = hw >= hd ? it.c : it.s, uz = hw >= hd ? -it.s : it.c;       // long axis in world: local x = (c, -s), local z = (s, c)
  const ex = ux * len, ez = uz * len; if (it.y1 > 1.7 && it.y0 < 0.2 && len > 25) continue;       // (a house wall is no fence)
  fences.push({ cls: 'wall', id: 'w', ax: it.cx - ex, az: it.cz - ez, bx: it.cx + ex, bz: it.cz + ez, hw: Math.min(hw, hd) });
}
const FG = new Map(), FC = 4, fkey = (cx, cz) => cx * 8192 + cz;
fences.forEach((f, i) => { for (let cx = Math.floor((Math.min(f.ax, f.bx) - 0.5) / FC); cx <= Math.floor((Math.max(f.ax, f.bx) + 0.5) / FC); cx++) for (let cz = Math.floor((Math.min(f.az, f.bz) - 0.5) / FC); cz <= Math.floor((Math.max(f.az, f.bz) + 0.5) / FC); cz++) { const k = fkey(cx, cz); let a = FG.get(k); if (!a) FG.set(k, (a = [])); a.push(i); } });
const byClass = {}; for (const f of fences) byClass[f.cls] = (byClass[f.cls] || 0) + 1;
console.log('barriers stats', JSON.stringify(ctx.services.streetsStats && ctx.services.streetsStats.barriers));
console.log('fence segments by class', JSON.stringify(byClass), '| guard rail runs', (st.guardRails || []).length, '| colliders', ctx.physics.items.length);
const cross2 = (ax, az, bx, bz, cx, cz, dx, dz) => {          // do the segments ab and cd properly cross?
  const d1 = (bx - ax) * (cz - az) - (bz - az) * (cx - ax), d2 = (bx - ax) * (dz - az) - (bz - az) * (dx - ax), d3 = (dx - cx) * (az - cz) - (dz - cz) * (ax - cx), d4 = (dx - cx) * (bz - cz) - (dz - cz) * (bx - cx);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
};
const segsHit = (ax, az, bx, bz) => {                           // the fences crossed by the segment ab (indices, deduplicated)
  let out = null;
  for (let cx = Math.floor(Math.min(ax, bx) / FC); cx <= Math.floor(Math.max(ax, bx) / FC); cx++) for (let cz = Math.floor(Math.min(az, bz) / FC); cz <= Math.floor(Math.max(az, bz) / FC); cz++) {
    const l = FG.get(fkey(cx, cz)); if (!l) continue;
    for (const i of l) { const f = fences[i]; if (cross2(ax, az, bx, bz, f.ax, f.az, f.bx, f.bz)) { if (!out) out = []; if (out.indexOf(i) < 0) out.push(i); } }
  }
  return out;
};
const distToFence = (x, z, f) => { const dx = f.bx - f.ax, dz = f.bz - f.az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - f.ax) * dx + (z - f.az) * dz) / l2)); return Math.hypot(x - f.ax - dx * t, z - f.az - dz * t); };
const nearFences = (x, z, r) => { const out = []; for (let cx = Math.floor((x - r) / FC); cx <= Math.floor((x + r) / FC); cx++) for (let cz = Math.floor((z - r) / FC); cz <= Math.floor((z + r) / FC); cz++) for (const i of FG.get(fkey(cx, cz)) || []) if (out.indexOf(i) < 0 && distToFence(x, z, fences[i]) <= r) out.push(i); return out; };

if (args.includes('--eval')) { const m = await import(pathToFileURL(path.resolve(String(flag('eval', '')))).href); await m.default(ctx, L, THREE, fences); process.exit(0); }       // debug aid: a script that gets the built world
if (args.includes('--probe')) {
  const near = (x, z) => Math.hypot(x - 592, z - 165) < 130;
  const names = {}; scene.traverse((o) => { if (!o.name || !/fence|rail|barrier|balust|chain|bollard|guard|grille|gate|parapet/i.test(o.name)) return; const p = new THREE.Vector3(); if (o.geometry && o.geometry.boundingSphere === null) o.geometry.computeBoundingSphere(); const c = o.geometry && o.geometry.boundingSphere ? o.geometry.boundingSphere.center : p; o.getWorldPosition(p); names[o.name] = (names[o.name] || 0) + 1; void c; });
  console.log('fence-like mesh names', JSON.stringify(names));
  console.log('rails within 130 m of the square:'); (st.guardRails || []).forEach((g) => { if (near(g.pts[0][0], g.pts[0][1])) { let len = 0; for (let i = 0; i + 1 < g.pts.length; i++) len += Math.hypot(g.pts[i + 1][0] - g.pts[i][0], g.pts[i + 1][1] - g.pts[i][1]); console.log(' ', g.id, 'pts', g.pts.length, 'len', len.toFixed(1), 'from', g.pts[0].map((v) => v.toFixed(1)).join(','), 'to', g.pts[g.pts.length - 1].map((v) => v.toFixed(1)).join(',')); } });
  const cl = {}; for (const it of ctx.physics.items) if (near(it.cx, it.cz)) { const k = it.type + (it.type === 'box' ? (Math.min(it.hw, it.hd) <= 0.225 ? '-thin' : '') : ''); cl[k] = (cl[k] || 0) + 1; } console.log('colliders within 130 m', JSON.stringify(cl));
  process.exit(0);
}

if (args.includes('--walk')) {                                  // the PLAYER's detours: breadth-first search over a 0.4 m grid (radius 0.3 m, feet on the ground) from the start pose to the places of the square
  const R = 0.3, G = 0.4, X0 = 470, X1 = 740, Z0 = 40, Z1 = 300, W = Math.round((X1 - X0) / G), H = Math.round((Z1 - Z0) / G), blocked = new Uint8Array(W * H), p = { x: 0, z: 0 };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { p.x = X0 + (i + 0.5) * G; p.z = Z0 + (j + 0.5) * G; const x = p.x, z = p.z; ctx.physics.resolve(p, R, 0, 1.7); if (Math.hypot(p.x - x, p.z - z) > 0.02) blocked[j * W + i] = 1; }
  const cell = (x, z) => { let i = Math.floor((x - X0) / G), j = Math.floor((z - Z0) / G); if (!blocked[j * W + i]) return j * W + i; for (let r = 1; r < 12; r++) for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) { const k = (j + b) * W + i + a; if (Math.max(Math.abs(a), Math.abs(b)) === r && !blocked[k]) return k; } return -1; };
  const start = cell(L.HERO.x, L.HERO.z), dist = new Float32Array(W * H).fill(-1), q = [start]; dist[start] = 0;
  for (let h = 0; h < q.length; h++) { const c = q[h], ci = c % W, cj = (c - ci) / W; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { if (!a && !b) continue; const ni = ci + a, nj = cj + b; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue; const k = nj * W + ni; if (blocked[k] || dist[k] >= 0) continue; if (a && b && (blocked[cj * W + ni] || blocked[nj * W + ci])) continue; dist[k] = dist[c] + (a && b ? 1.4142 : 1) * G; q.push(k); } }
  const T = { 'red car (579,219)': [579, 219], 'station front doors (600,231)': [600.6, 231.1], 'obelisk plaza S (592,178)': [592, 178], 'obelisk plaza N (592,152)': [592, 152], 'metro rotunda (516,100)': [516, 100], 'Nevsky east (670,188)': [670, 188], 'Ligovsky pavement (545,232)': [545, 232], 'north island (586,118)': [586, 118], 'sliver island (585,196)': [585, 196] };
  console.log('PLAYER from the start pose (' + L.HERO.x + ',' + L.HERO.z + '), radius 0.3 m, ' + (globalThis.__fenceOff ? 'WITHOUT' : 'WITH') + ' rail / chain colliders; reachable cells ' + q.length + ' of ' + (W * H - blocked.reduce((s, v) => s + v, 0)));
  for (const [name, [x, z]] of Object.entries(T)) { const c = cell(x, z), d = c >= 0 ? dist[c] : -1, st = Math.hypot(x - L.HERO.x, z - L.HERO.z); console.log('  ' + name.padEnd(32) + (d < 0 ? 'UNREACHABLE' : 'walk ' + d.toFixed(0) + ' m (straight ' + st.toFixed(0) + ' m, detour x' + (d / Math.max(st, 1)).toFixed(2) + ')')); }
  process.exit(0);
}
const P = ctx.services.people, sim = P.sim, nav = sim.nav, N = nav.N;
if (!sim) { console.log('RESULT: FAIL (no sim)'); process.exit(1); }
console.log('people', sim.agents.length, 'build ms (phases)', JSON.stringify(P.phases), 'nav ms', JSON.stringify(nav.stats && nav.stats.ms), 'obstacles', nav.obstacles, 'nodes', N.x.length, 'edges', nav.E.length, 'components', nav.nComp, 'main', nav.compSize[nav.main], 'lattice', nav.stats.lattice, 'crossings', nav.stats.crossings, 'bridging', nav.stats.bridgingCrossings);

// ---------------------------------------------------------------- 1. static: graph edges across a fence, nodes on / behind a rail
const stat = { edge: {}, edgeKind: {}, nodeOn: 0, nodeBehind: 0, nodes: 0 }; const edgeSpots = new Map();
for (const e of nav.E) {
  const ax = N.x[e.a], az = N.z[e.a], bx = N.x[e.b], bz = N.z[e.b], hit = segsHit(ax, az, bx, bz); if (!hit) continue;
  const cls = fences[hit[0]].cls; stat.edge[cls] = (stat.edge[cls] || 0) + 1; const kk = cls + ':' + N.k[e.a] + N.k[e.b] + (e.kind === 1 ? ':zebra' : ''); stat.edgeKind[kk] = (stat.edgeKind[kk] || 0) + 1;
  const sk = Math.round((ax + bx) / 12) * 6 + ',' + Math.round((az + bz) / 12) * 6; edgeSpots.set(sk, (edgeSpots.get(sk) || 0) + 1);
}
const asphalt = (x, z) => nav.fastCover(x, z);
const railIdx = fences.map((f, i) => (f.cls === 'rail' ? i : -1)).filter((i) => i >= 0);
for (let i = 0; i < N.x.length; i++) {
  if (!nav.mainOK(i) || Math.hypot(N.x[i] - 592, N.z[i] - 165) > 450) continue; stat.nodes++;
  const near = nearFences(N.x[i], N.z[i], 0.6).filter((j) => fences[j].cls === 'rail'); if (!near.length) continue;
  const d = Math.min(...near.map((j) => distToFence(N.x[i], N.z[i], fences[j])));
  if (d < 0.3) { stat.nodeOn++; continue; }
  const f = fences[near[0]], dx = f.bx - f.ax, dz = f.bz - f.az, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l, sgn = Math.sign((N.x[i] - f.ax) * nx + (N.z[i] - f.az) * nz) || 1;
  const cOn = asphalt(f.ax + dx / 2 + nx * 0.8 * sgn, f.az + dz / 2 + nz * 0.8 * sgn), cOff = asphalt(f.ax + dx / 2 - nx * 0.8 * sgn, f.az + dz / 2 - nz * 0.8 * sgn);
  if (cOn > cOff) stat.nodeBehind++;                            // the node is on the carriageway side of the rail
}
if (args.includes('--why')) {                                   // the first offending edges with the colliders near the crossing point
  let shown = 0;
  for (const e of nav.E) {
    const ax = N.x[e.a], az = N.z[e.a], bx = N.x[e.b], bz = N.z[e.b], hit = segsHit(ax, az, bx, bz); if (!hit || fences[hit[0]].cls !== 'rail' || shown >= 12) continue; shown++;
    const f = fences[hit[0]], dx = f.bx - f.ax, dz = f.bz - f.az, ex = bx - ax, ez = bz - az, den = ex * dz - ez * dx, t = ((f.ax - ax) * dz - (f.az - az) * dx) / (den || 1), px = ax + ex * t, pz = az + ez * t;
    const boxes = ctx.physics.items.filter((it) => it.fence && Math.hypot(it.cx - px, it.cz - pz) < Math.max(it.hw, it.hd) + 1.5).map((it) => `c(${it.cx.toFixed(1)},${it.cz.toFixed(1)}) hw${it.hw.toFixed(2)} hd${it.hd.toFixed(2)} rot${Math.atan2(it.s, it.c).toFixed(2)}`);
    console.log(`  WHY edge ${e.a}-${e.b} kind=${e.kind} ${N.k[e.a]}${N.k[e.b]} (${ax.toFixed(1)},${az.toFixed(1)})->(${bx.toFixed(1)},${bz.toFixed(1)}) crosses ${f.id} (${f.ax.toFixed(1)},${f.az.toFixed(1)})-(${f.bx.toFixed(1)},${f.bz.toFixed(1)}) at (${px.toFixed(2)},${pz.toFixed(2)}) segBlocked=${nav.segBlocked(ax, az, bx, bz)} fenceBoxes=${boxes.length} ${boxes.join(' ; ')}`);
  }
}
{ const lost = nav.crosswalks.filter((c) => !c.virtual && c.ja !== undefined && c.edge < 0 && Math.hypot(c.x - 592, c.z - 165) < 700 && (nearFences(c.ax, c.az, 8).length || nearFences(c.bx, c.bz, 8).length)); console.log('CROSSINGS: zebra records without a graph edge near a fence (lost to a rail / chain?) ' + lost.length + ' of ' + nav.crosswalks.filter((c) => !c.virtual).length + ': ' + lost.slice(0, 12).map((c) => c.id + '@' + c.x.toFixed(0) + ',' + c.z.toFixed(0) + ' ja=' + c.ja + ' jb=' + c.jb).join(' | ')); }
console.log('STATIC: graph edges that cross a fence', JSON.stringify(stat.edge), JSON.stringify(stat.edgeKind), '| nodes within 450 m of the square', stat.nodes, 'ON a rail (< 0.3 m)', stat.nodeOn, 'on the road side of a rail', stat.nodeBehind);
console.log('  worst places (12 m cells): ' + [...edgeSpots].sort((p, q) => q[1] - p[1]).slice(0, 8).map((e) => e.join('=')).join(' | '));

// ---------------------------------------------------------------- 2. dynamic
const upd = ctx._updates, dt = 0.1, steps = Math.round(MIN * 60 / dt);
const tab = {}, cells = new Map(), jumpTab = {}; const heat = new Map(); let heatN = 0; const qStat = new Map(), waitT0 = new Map(), waits = [], agByI = new Map(sim.agents.map((g) => [g.i, g])); const stallCells = new Map(); const stallAg = new Map(); let nSteps = 0, nCross = 0, nJump = 0, nEp = 0, rub = 0, rubStall = 0, rubStallF = 0, rubStuck = 0; const evX = [], evZ = [], epLast = new Map(), epCls = {}; const prev = sim.agents.map((a) => ({ x: a.x, z: a.z, hid: a.hidden, kind: a.kind, rec: (a.recycled | 0) + (a.leader ? (a.leader.recycled | 0) : 0) }));
const ex = []; const t0w = Date.now();
ctx.player.position.set(PL[0], 0, PL[1]); camera.position.set(PL[0], 1.7, PL[1]); camera.updateMatrixWorld(true);
for (let i = 1; i <= steps; i++) {
  const t = i * dt; ctx.time = t; ctx.shared.uTime.value = t;
  if (TOURP) PL = TOURP[Math.min(TOURP.length - 1, Math.floor((i - 1) / steps * TOURP.length))];
  ctx.player.position.set(PL[0], 0, PL[1]); camera.position.set(PL[0], 1.7, PL[1]); camera.updateMatrixWorld(true);
  for (const f of upd) f(dt, t);
  for (let k = 0; k < sim.agents.length; k++) {
    const a = sim.agents[k], p = prev[k];
    if (a.hidden || p.hid || a.ug || !Number.isFinite(a.x)) { p.x = a.x; p.z = a.z; p.hid = a.hidden || !!a.ug; p.kind = a.kind; continue; }
    nSteps++;
    if ((i % 5) === 0 && Math.abs(a.x - 592) < 150 && Math.abs(a.z - 165) < 150) { const hk = Math.round(a.x / 2) * 4096 + Math.round(a.z / 2); heat.set(hk, (heat.get(hk) || 0) + 1); heatN++; }
    if (FG.has(fkey(Math.floor(a.x / FC), Math.floor(a.z / FC))) && a.kind !== 'sit') { const nf = nearFences(a.x, a.z, 0.45).filter((j) => fences[j].cls !== 'wall'); if (nf.length) { rub++; if (a.kind === 'walk' && a.speed < 0.3 && a.leader) rubStallF++; if (a.stuck >= 20 && a.kind === 'walk') rubStuck++; if (a.kind === 'walk' && a.speed < 0.3 && !a.leader) rubStall++; { const ck = Math.round(a.x / 4) * 4 + ',' + Math.round(a.z / 4) * 4; stallCells.set(ck, (stallCells.get(ck) || 0) + 1); } stallAg.set(k, (stallAg.get(k) || 0) + 1); } }
    const d = Math.hypot(a.x - p.x, a.z - p.z); const rec = (a.recycled | 0) + (a.leader ? (a.leader.recycled | 0) : 0);
    if (d > 1e-4 && FG.has(fkey(Math.floor(a.x / FC), Math.floor(a.z / FC))) || (d > 1e-4 && FG.has(fkey(Math.floor(p.x / FC), Math.floor(p.z / FC))))) {
      const hit = segsHit(p.x, p.z, a.x, a.z);
      if (hit) {
        const f = fences[hit[0]], tele = d > 0.8 || a.kind !== p.kind && (a.kind === 'sit' || p.kind === 'sit' || a.kind === 'approach' || p.kind === 'approach') || rec !== p.rec || sim.mass > 0;
        if (tele) { nJump++; jumpTab[f.cls] = (jumpTab[f.cls] || 0) + 1; }
        else {
          nCross++; evX.push(a.x); evZ.push(a.z); { const ek = k + '|' + f.cls, last = epLast.get(ek); if (last === undefined || t - last > 4) { nEp++; epCls[f.cls] = (epCls[f.cls] || 0) + 1; } epLast.set(ek, t); }
          const cause = f.cls + ' | ' + a.scene + ' | ' + a.kind + (a.crossIdx >= 0 ? ' (zebra)' : '') + (a.leader ? ' follower' : '') + (a.waitCw >= 0 ? ' queue' : ''); tab[cause] = (tab[cause] || 0) + 1;
          const ck = f.cls + ':' + Math.round(a.x / 6) * 6 + ',' + Math.round(a.z / 6) * 6; cells.set(ck, (cells.get(ck) || 0) + 1);
          if (ex.length < 12) ex.push(`${f.cls} ${f.id} agent ${k} scene=${a.scene} kind=${a.kind} t=${t.toFixed(1)} (${p.x.toFixed(2)},${p.z.toFixed(2)})->(${a.x.toFixed(2)},${a.z.toFixed(2)}) goal=${a.goal && a.goal.type} seg=${a.rt ? a.rt.seg + '/' + a.rt.n : '-'} stuck=${a.stuck} speed=${a.speed.toFixed(2)} ${a.leader ? 'follower of ' + a.leader.i + ' side=' + a.side : 'leader'} cross=${a.crossIdx} sideT=${a.sideT.toFixed(1)} obstDist ${nav.obstDist(p.x, p.z, 1).toFixed(2)}->${nav.obstDist(a.x, a.z, 1).toFixed(2)} visible=${sim.visible ? sim.visible(a.x, a.z) : '?'}`);
        }
      }
    }
    p.x = a.x; p.z = a.z; p.hid = false; p.kind = a.kind; p.rec = rec;
  }
  if (i % 10 === 0) { const byNode = new Map(); for (const g of sim.agents) { if (g.hidden || g.kind !== 'wait' || g.waitCw < 0) continue; byNode.set(g.waitNode, (byNode.get(g.waitNode) || 0) + 1); if (!waitT0.has(g.i)) waitT0.set(g.i, t); } for (const [id, c] of byNode) { const q = qStat.get(id) || { n: 0, sum: 0, max: 0, x: N.x[id], z: N.z[id] }; q.n++; q.sum += c; q.max = Math.max(q.max, c); qStat.set(id, q); } for (const [ag, t0q] of waitT0) { const g = agByI.get(ag); if (!g || g.kind !== 'wait' || g.waitCw < 0) { waits.push(t - t0q); waitT0.delete(ag); } } }
  if (i % 600 === 0) console.log(`  ${(i * dt / 60).toFixed(1)} min: crossings ${nCross}, teleports across ${nJump}, wall ${((Date.now() - t0w) / 1000).toFixed(0)} s`);
}
const mins = Math.max(MIN, 1e-6);
{ const nsamp = Math.max(1, Math.floor(steps / 5)); const top = [...heat].sort((p, q) => q[1] - p[1]).slice(0, 10).map(([k, v]) => { const hx = Math.round(k / 4096), hz = k - hx * 4096; return '(' + hx * 2 + ',' + hz * 2 + ')=' + (v / nsamp).toFixed(2); }); console.log('HEAT: busiest 2 m cells within 150 m of the square (mean people per cell): ' + top.join(' ')); }
{ const top = [...qStat.values()].sort((p, q) => q.max - p.max).slice(0, 6).map((q) => '(' + q.x.toFixed(0) + ',' + q.z.toFixed(0) + ') max ' + q.max + ' mean ' + (q.sum / q.n).toFixed(1)); const mw = waits.length ? waits.reduce((p, q) => p + q, 0) / waits.length : 0; console.log('KERB QUEUES: crossings waited ' + waits.length + ', mean wait ' + mw.toFixed(1) + ' s, longest ' + (waits.length ? Math.max(...waits).toFixed(0) : 0) + ' s; biggest queues: ' + top.join(' | ')); }
for (const [k, v] of [...stallAg].sort((p, q) => q[1] - p[1]).slice(0, 8)) { const g = sim.agents[k]; console.log('  STALLED agent ' + k + ' x' + v + ' steps: scene=' + g.scene + ' kind=' + g.kind + ' at (' + g.x.toFixed(2) + ',' + g.z.toFixed(2) + ') speed=' + g.speed.toFixed(2) + ' goal=' + (g.goal && g.goal.type) + ' leader=' + (g.leader ? g.leader.i : '-') + ' followers=' + g.followers.length + ' stuck=' + g.stuck + ' blk=' + g.blk + ' sideT=' + g.sideT.toFixed(1) + ' obstDist=' + nav.obstDist(g.x, g.z, 1).toFixed(2) + ' hidden=' + g.hidden + ' cov=' + nav.cover(g.x, g.z).toFixed(2) + ' rt=' + (g.rt ? g.rt.seg + '/' + g.rt.n : '-') + ' waitCw=' + g.waitCw + ' crossIdx=' + g.crossIdx); }
console.log('  rail stalls by 4 m cell: ' + [...stallCells].sort((p, q) => q[1] - p[1]).slice(0, 6).map((e) => e.join('=')).join(' | '));
console.log(`RUBBING: agent steps within 0.45 m of a rail / chain: ${rub} (${(rub / mins).toFixed(0)} per min), of them a walking leader that has almost stopped (< 0.3 m/s): ${rubStall} (${(rubStall / mins).toFixed(1)} per min), followers walking in place (< 0.3 m/s): ${rubStallF} (${(rubStallF / mins).toFixed(1)} per min), walkers blocked 10+ moves in a row (stuck >= 20): ${rubStuck} (${(rubStuck / mins).toFixed(1)} per min)`);
console.log(`DYNAMIC: ${MIN} simulated min, ${nSteps} visible agent steps, step crossings of a fence: ${nCross} (${(nCross / mins).toFixed(1)} per min); distinct crossing episodes (same person + class, > 4 s apart): ${nEp} (${(nEp / mins).toFixed(1)} per min) ${JSON.stringify(epCls)}; teleports that jump over a fence: ${nJump} ${JSON.stringify(jumpTab)}`);
const byCls = {}; for (const [k, v] of Object.entries(tab)) { const c = k.split(' | ')[0]; byCls[c] = (byCls[c] || 0) + v; }
console.log('  by class', JSON.stringify(byCls), '(per minute', JSON.stringify(Object.fromEntries(Object.entries(byCls).map(([k, v]) => [k, +(v / mins).toFixed(2)]))) + ')');
console.log('  by cause:'); for (const [k, v] of Object.entries(tab).sort((p, q) => q[1] - p[1]).slice(0, 16)) console.log('   ', String(v).padStart(5), k);
console.log('  worst places (6 m cells):', [...cells].sort((p, q) => q[1] - p[1]).slice(0, 12).map((e) => e.join('=')).join(' | '));
for (const e of ex) console.log('   e.g.', e);
if (args.includes('--plot')) for (const spec of String(flag('plot', '')).split(';')) {                                 // a plan: asphalt (grey), buildings (dark), rails (red), chains (orange), colliders (blue), routing nodes / edges (green), crossing events (magenta), people now (black)
  const zlib = await import('node:zlib'); const [x0, x1, z0, z1, S, file] = spec.split(','); const X0 = +x0, X1 = +x1, Z0 = +z0, Z1 = +z1, sc = +S || 8, Wp = Math.round((X1 - X0) * sc), Hp = Math.round((Z1 - Z0) * sc);
  const img = Buffer.alloc(Wp * Hp * 4); const px = (x, z, c) => { const i = Math.round((x - X0) * sc), j = Math.round((z - Z0) * sc); if (i < 0 || j < 0 || i >= Wp || j >= Hp) return; const o = (j * Wp + i) * 4; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; img[o + 3] = 255; };
  const dot = (x, z, c, r = 1) => { for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) px(x + a / sc, z + b / sc, c); };
  const line = (ax, az, bx, bz, c, r = 0) => { const n = Math.ceil(Math.hypot(bx - ax, bz - az) * sc); for (let i = 0; i <= n; i++) dot(ax + (bx - ax) * i / Math.max(1, n), az + (bz - az) * i / Math.max(1, n), c, r); };
  for (let j = 0; j < Hp; j++) for (let i = 0; i < Wp; i++) { const x = X0 + (i + 0.5) / sc, z = Z0 + (j + 0.5) / sc; const o = (j * Wp + i) * 4; let c = [226, 222, 214]; if (nav.inBuilding(x, z)) c = [96, 92, 96]; else if (nav.fastCover(x, z) > -0.1) c = [150, 154, 160]; else if (nav.crosswalkAt(x, z, 0) >= 0) c = [230, 230, 240]; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; img[o + 3] = 255; }
  if (heat.size) { const mx = Math.max(...heat.values()); for (const [hk, v] of heat) { const hx = Math.round(hk / 4096), hz = hk - hx * 4096, k = Math.min(0.85, 0.25 + 0.6 * v / mx); for (let jj = Math.round((hz * 2 - 1 - Z0) * sc); jj < Math.round((hz * 2 + 1 - Z0) * sc); jj++) for (let ii = Math.round((hx * 2 - 1 - X0) * sc); ii < Math.round((hx * 2 + 1 - X0) * sc); ii++) { if (ii < 0 || jj < 0 || ii >= Wp || jj >= Hp) continue; const o = (jj * Wp + ii) * 4; img[o] = Math.round(img[o] * (1 - k) + 255 * k); img[o + 1] = Math.round(img[o + 1] * (1 - k) + 120 * k * (1 - v / mx)); img[o + 2] = Math.round(img[o + 2] * (1 - k) + 20 * k); } } }
  for (const it of ctx.physics.items) { if (it.cx < X0 - 20 || it.cx > X1 + 20 || it.cz < Z0 - 20 || it.cz > Z1 + 20) continue; if (it.type === 'cyl' && it.y1 > 0.45 && it.y0 < 1.7) dot(it.cx, it.cz, [40, 90, 230], Math.max(1, Math.round(it.r * sc))); else if (it.type === 'box' && it.y1 > 0.45 && it.y0 < 1.7 && it.y0 > -1 && Math.max(it.hw, it.hd) < 30) { const ux = it.hw >= it.hd ? it.c : it.s, uz = it.hw >= it.hd ? -it.s : it.c, l = Math.max(it.hw, it.hd); line(it.cx - ux * l, it.cz - uz * l, it.cx + ux * l, it.cz + uz * l, [40, 120, 230], Math.max(0, Math.round(Math.min(it.hw, it.hd) * sc) - 1)); } }
  for (const e of nav.E) { const ax = N.x[e.a], az = N.z[e.a], bx = N.x[e.b], bz = N.z[e.b]; if (Math.max(ax, bx) < X0 || Math.min(ax, bx) > X1 || Math.max(az, bz) < Z0 || Math.min(az, bz) > Z1) continue; line(ax, az, bx, bz, e.kind === 1 ? [20, 160, 60] : [110, 190, 120], 0); }
  for (let i = 0; i < N.x.length; i++) if (N.x[i] > X0 && N.x[i] < X1 && N.z[i] > Z0 && N.z[i] < Z1) dot(N.x[i], N.z[i], nav.comp[i] !== nav.main ? [150, 40, 190] : N.k[i] === 'c' ? [0, 120, 0] : [30, 140, 60], 1);
  for (const f of fences) { if (Math.max(f.ax, f.bx) < X0 || Math.min(f.ax, f.bx) > X1 || Math.max(f.az, f.bz) < Z0 || Math.min(f.az, f.bz) > Z1) continue; if (f.cls === 'rail') line(f.ax, f.az, f.bx, f.bz, [220, 30, 30], 1); else if (f.cls === 'chain') line(f.ax, f.az, f.bx, f.bz, [240, 150, 20], 0); }
  for (let i = 0; i < evX.length; i++) dot(evX[i], evZ[i], [230, 0, 230], 2);
  for (const a of sim.agents) if (!a.hidden && !a.ug) dot(a.x, a.z, [0, 0, 0], 2);
  const raw = Buffer.alloc((Wp * 4 + 1) * Hp); for (let j = 0; j < Hp; j++) { raw[j * (Wp * 4 + 1)] = 0; img.copy(raw, j * (Wp * 4 + 1) + 1, j * Wp * 4, (j + 1) * Wp * 4); }
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; }); const crc = (b) => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(Wp, 0); ihdr.writeUInt32BE(Hp, 4); ihdr[8] = 8; ihdr[9] = 6;
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true }); fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])); console.log('plot', file, Wp + 'x' + Hp);
}
if (args.includes('--json')) fs.writeFileSync(String(flag('json', 'fence.json')), JSON.stringify({ minutes: MIN, steps: nSteps, crossings: nCross, jumps: nJump, byCls, tab, cells: [...cells], stat, buildMs: P.phases, navMs: nav.stats.ms, obstacles: nav.obstacles }));
const bad = (byCls.rail || 0) + (byCls.chain || 0) + (byCls.wall || 0) + (byCls.fence || 0);
console.log(bad ? 'RESULT: FAIL (' + bad + ' crossings)' : 'RESULT: OK');
process.exit(args.includes('--strict') && bad ? 1 : 0);
