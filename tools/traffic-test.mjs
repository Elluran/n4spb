// Headless traffic test (no GPU): builds environment + streets + traffic in node, then
//   node tools/traffic-test.mjs --dump            lane graph statistics only
//   node tools/traffic-test.mjs [--minutes 10]    simulates the traffic for N simulated minutes (default 10) and asserts:
//     (violations) overlaps <= 20 per simulated minute (the tight Fontanka / Liteyny / Vosstaniya junction clusters of the lane graph; the collision net keeps them from lasting), nobody further than
//     2.2 m off the asphalt, red-light runs <= max(6, minutes) (cars already committed on amber / spawned past a mid-block line), no NaN, no teleport (> 4 m per step), < 4 % of the vehicles stationary for 4 min,
//     bounded vehicle count; prints the mean speed, the stopped share, the vehicle count timeline and the overlap hotspots
//   --region x,z[,x2,z2] regional simulation around that point (the camera; a second point = it moves there at 12 m/s) - how the game runs it;  --density f  scales the traffic;  --peds  synthetic pedestrians
//   --diag [--chains] [--heads] [--old] [--near x,z]  why are the stopped vehicles stopped: causes, queue heads per signal, wait chains (red light / cycle / moving), vehicles held at a green, the oldest vehicles
//   --plan x0,z0,x1,z1,px,out.png [--lanes] [--withparked]  top-down plan with the vehicles (red = stopped), lane / connector lines;  --sigdump x,z  signals + junction arms near a point;  --parked  parked-car plan
//   TRAFFIC_BUILDLIST=environment,streets,bridges,traffic  also builds the bridges (deck heights: the open-water rule of sim.js is then tested as the page runs it);  --notram  no trams
//   trams (traffic/trams.js) are part of every run: they count in the overlaps, and each must stay on its rails (--tramdump prints the routes: length, stops, lights)
//   (the whole-network run seeds ~800 cars at t = 0 because the region logic is off: that is why the count limit is 2600 (--maxcount); CAP only stops new arrivals)
//   SINCE VASILIEVSKY ISLAND (2026-10-10) the whole-network run at full density seeds 7133 cars, jams (54 % stopped, 539 overlaps, 96 "stuck" at the 4-minute check) and takes 43 minutes: it is no longer a meaningful gate.
//   Use --density 0.4 (6 min: ~2 600 cars, 8 minutes of real time, RESULT OK) for the whole network, and tools/traffic-regions.mjs (the regional runs round the camera, as the page runs the traffic) for the places.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

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

const THREE = await import('three');
const { createContext } = await import(pathToFileURL(path.join(root, 'src/core/ctx.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio: null, quality, sunDir });
ctx.buildList = (process.env.TRAFFIC_BUILDLIST || 'environment,streets,traffic').split(',');       // (TRAFFIC_BUILDLIST=environment,streets,traffic,landmarksNewHolland: ways claimed by a landmark carry no lanes)
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
for (const m of ctx.buildList.filter((q) => q !== 'traffic')) { const mod = await import(pathToFileURL(path.join(root, `src/world/${m}.js`)).href); await mod.build(ctx); }
const st = ctx.services.streets;

if (flag('parked', false)) {
  const { planParked } = await import(pathToFileURL(path.join(root, 'src/world/traffic/parking.js')).href);
  const t0 = Date.now(); const plan = planParked(ctx, st);
  console.log('parked cars', plan.cars.length, JSON.stringify({ ...plan.stats, dbg: undefined }), (plan.stats.dbg || []).join(' | '), (Date.now() - t0) + ' ms');
  for (const c of plan.cars) if (c.slot === 'tour' || c.slot === 'rank' || c.taxi && c.x < -880) console.log('  ', c.slot, c.kind, c.x.toFixed(1), c.z.toFixed(1), (c.rotY * 57.3).toFixed(0));
  const by = {}; for (const c of plan.cars) by[c.slot] = (by[c.slot] || 0) + 1; console.log('by slot kind', by);
  const kk = {}; for (const c of plan.cars) kk[c.kind] = (kk[c.kind] || 0) + 1; console.log('by archetype', kk);
  const sq = { x: -163.5, z: 97.8 };
  const near = plan.cars.filter((c) => c.slot === 'bay' || c.slot === 'parallel').sort((a, b) => Math.hypot(a.x - sq.x, a.z - sq.z) - Math.hypot(b.x - sq.x, b.z - sq.z)).slice(0, 12);
  for (const c of near) console.log(c.slot, c.kind, c.x.toFixed(1), c.z.toFixed(1), (c.rotY * 180 / Math.PI).toFixed(0));
  process.exit(0);
}
if (flag('bench', false)) {
  const tm = await import(pathToFileURL(path.join(root, 'src/world/traffic.js')).href);
  const t0 = Date.now(); await tm.build(ctx); console.log('traffic build', Date.now() - t0, 'ms; parked', ctx.services.traffic.parked.length, 'moving', ctx.services.traffic.vehicles.length);
  const upd = ctx._updates[ctx._updates.length - 1];
  { const bc = String(flag("cam", "-150,2")).split(",").map(Number); camera.position.set(bc[0], 1.7, bc[1]); camera.updateMatrixWorld(); }
  let t = 0; const tt = Date.now(); const N = 600;
  for (let i = 0; i < N; i++) { upd(1 / 60, t); t += 1 / 60; }
  console.log('update per frame (60 fps stepping)', ((Date.now() - tt) / N).toFixed(3), 'ms; stats', JSON.stringify(ctx.services.traffic.stats));
  if (flag("noff", false)) process.exit(0);
  const t2 = Date.now(); upd(0, 300); console.log('fast-forward to t=300 s', Date.now() - t2, 'ms');
  const t3 = Date.now(); upd(0, 20); console.log('restart + fast-forward to t=20 s', Date.now() - t3, 'ms');
  process.exit(0);
}
if (flag('cdetail', false)) {
  const id = String(flag('cdetail')); const c = st.connectors.find((q) => q.id === id);
  console.log(id, 'turn', c.turn, 'len', c.len.toFixed(1));
  for (const p of c.pts) console.log(p.map((x) => x.toFixed(1)).join(','), 'cover', st.net.cover(p[0], p[1], {}).toFixed(2));
  const a = st.lanes.find((l) => l.id === c.from), b = st.lanes.find((l) => l.id === c.to);
  console.log('from lane end', a.pts[a.pts.length - 1].map((x) => x.toFixed(1)).join(','), 'to lane start', b.pts[0].map((x) => x.toFixed(1)).join(','));
  process.exit(0);
}
if (flag('lcover', false)) {
  for (const id of String(flag('lcover')).split(',')) { const l = st.lanes.find((q) => q.id === id); if (!l) continue; console.log(id, l.hw, 'w', l.width, 'len', l.len.toFixed(0), 'rank', l.rank); for (const p of l.pts) console.log('  ', p.map((x) => x.toFixed(1)).join(','), 'cover', st.net.cover(p[0], p[1], {}).toFixed(2)); }
  process.exit(0);
}
if (flag('connectors', false)) {
  const rows = [];
  const sm0 = await import(pathToFileURL(path.join(root, 'src/world/traffic/sim.js')).href); const sm1 = sm0.createSim(st, () => ctx.rng('x'), { extent: L.EXTENT, atEdge: (x, z, m = 70) => !L.inExtent(x, z, m) }); for (const c of st.connectors) { const seg = sm1.connSeg.get(c.id); if (!seg) continue; let m = 1e9, at = null; for (let i = 0; i < seg.n; i++) { const cv = st.net.cover(seg.xs[i], seg.zs[i], {}); if (cv < m) { m = cv; at = [seg.xs[i], seg.zs[i]]; } } rows.push([m, c.id, c.turn, c.len, at]); }
  rows.sort((a, b) => a[0] - b[0]);
  if (typeof flag('connectors') === 'string') { const seg = sm1.connSeg.get(String(flag('connectors'))); if (seg) for (let i = 0; i < seg.n; i++) console.log(seg.xs[i].toFixed(1), seg.zs[i].toFixed(1), 'cover', st.net.cover(seg.xs[i], seg.zs[i], {}).toFixed(2)); process.exit(0); }
  console.log('connectors with the worst road cover (negative = centreline outside the asphalt):');
  for (const r of rows.slice(0, 25)) console.log(r[0].toFixed(2), r[1], r[2], 'len', r[3].toFixed(1), r[4].map((x) => x.toFixed(0)).join(','));
  console.log('connectors below -1.0:', rows.filter((r) => r[0] < -1).length, 'of', rows.length);
  process.exit(0);
}
if (flag('lanesnear', false)) {
  const [cx, cz] = String(flag('lanesnear')).split(',').map(Number);
  const near = (pts) => pts.some((p) => Math.hypot(p[0] - cx, p[1] - cz) < 25);
  for (const l of st.lanes) if (near(l.pts)) console.log('lane', l.id, l.hw, 'len', l.len.toFixed(0), 'from', l.from, 'to', l.to, l.pts[0].map((x) => x.toFixed(0)).join(','), '->', l.pts[l.pts.length - 1].map((x) => x.toFixed(0)).join(','));
  for (const c of st.connectors) if (near(c.pts)) console.log('conn', c.id, c.turn, 'junction', c.junction, 'len', c.len.toFixed(0));
  process.exit(0);
}
if (flag('dups', false)) {
  const by = new Map(); for (const l of st.lanes) (by.get(l.id) || by.set(l.id, []).get(l.id)).push(l);
  const dup = [...by.values()].filter((a) => a.length > 1);
  console.log('lane ids', by.size, 'of', st.lanes.length, 'duplicated ids:', dup.length);
  for (const a of dup.slice(0, 15)) console.log(' ', a.map((l) => `${l.id} len ${l.len.toFixed(0)} from ${l.from} to ${l.to} ${l.pts[0].map(Math.round)}->${l.pts[l.pts.length - 1].map(Math.round)}`).join('  |  '));
  const bad = []; const lm = new Map(st.lanes.map((l) => [l.id, l]));
  for (const c of st.connectors) { const a = lm.get(c.from), b = lm.get(c.to); if (!a || !b) { bad.push([c.id, 'missing lane']); continue; } const e0 = a.pts[a.pts.length - 1], s0 = c.pts[0], e1 = c.pts[c.pts.length - 1], s1 = b.pts[0]; const d0 = Math.hypot(e0[0] - s0[0], e0[1] - s0[1]), d1 = Math.hypot(e1[0] - s1[0], e1[1] - s1[1]); if (d0 > 1.5 || d1 > 1.5) bad.push([c.id, d0.toFixed(1), d1.toFixed(1)]); }
  console.log('connectors not matching their lane ends:', bad.length, bad.slice(0, 12).map((b) => b.join('/')).join(' '));
  process.exit(0);
}
if (flag('routes', false)) {
  const tr = new Map(); for (const r of st.roads) if (r.trolley && r.trolley.length) for (const q of r.trolley) tr.set(q, (tr.get(q) || 0) + 1);
  console.log('trolley refs on roads', JSON.stringify([...tr]));
  const br = new Map(), tt = new Map(); for (const b of st.busStops) { for (const q of (b.routes && b.routes.bus) || []) br.set(q, (br.get(q) || 0) + 1); for (const q of (b.routes && b.routes.trolley) || []) tt.set(q, (tt.get(q) || 0) + 1); }
  console.log('bus refs at stops', JSON.stringify([...br])); console.log('trolley refs at stops', JSON.stringify([...tt]));
  console.log('stops with coords', JSON.stringify(st.busStops.map((b) => [b.name, Math.round(b.x), Math.round(b.z), b.kind, JSON.stringify(b.routes)])).slice(0, 6000));
  process.exit(0);
}
if (flag('lanefields', false)) {
  const hw = {}; for (const l of st.lanes) { const k = (l.hw || '?') + '/' + l.rank; hw[k] = (hw[k] || 0) + 1; } console.log('hw/rank', JSON.stringify(hw));
  const nm = {}; for (const l of st.lanes) if (l.rank >= 3 && l.pts[0][0] < -880) nm[l.name || '?'] = (nm[l.name || '?'] || 0) + 1; console.log('west rank>=3 lane names', JSON.stringify(nm));
  console.log(JSON.stringify(st.lanes.find((l) => l.name && l.name.includes('Невск') && l.pts[0][0] < -1100)).slice(0, 700));
  console.log('road keys', Object.keys(st.roads[0]).join(','), JSON.stringify(st.roads.find((r) => r.name === 'Дворцовая площадь')).slice(0, 300));
  process.exit(0);
}
if (flag('svcnames', false)) {
  const nm = {}; for (const l of st.lanes) if (l.rank === 0 && l.name) nm[l.name] = (nm[l.name] || 0) + l.len; const arr = Object.entries(nm).sort((a, b) => b[1] - a[1]);
  console.log('named service lanes (name: metres)', arr.length, JSON.stringify(arr.slice(0, 60).map(([k, v]) => k + ':' + Math.round(v))));
  const r = {}; for (const l of st.lanes) if (l.rank === 0) { const k = l.pts[0][0] < -600 ? 'west' : 'east'; r[k] = (r[k] || 0) + l.len; } console.log('service lane metres', JSON.stringify(r));
  process.exit(0);
}
if (flag('conn', false)) {            // static: every connector / lane point that lies more than 2.2 m outside the asphalt (the off-lane rule of the simulation)
  let bad = 0;
  for (const c of st.connectors) { const q = c.pts.filter((p) => st.net.cover(p[0], p[1], {}) < -2.2); if (q.length) { bad++; console.log('connector', c.id, c.turn, 'len', c.len.toFixed(1), 'points off', q.length + '/' + c.pts.length, 'e.g.', q[0].map((v) => v.toFixed(0)).join(',')); } }
  console.log('connectors', st.connectors.length, 'off the asphalt:', bad);
  process.exit(bad ? 1 : 0);
}
if (flag('dump', false)) {
  const byHw = {};
  for (const l of st.lanes) { const k = l.hw + ' r' + l.rank + ' v' + l.speed; (byHw[k] ||= { n: 0, len: 0 }); byHw[k].n++; byHw[k].len += l.len; }
  console.log('lanes', st.lanes.length, 'junctions', st.junctions.length, 'connectors', st.connectors.length, 'stopLines', st.stopLines.length, 'signals', st.signals.length, 'slots', st.parkedSlots.length);
  console.log(byHw);
  const src = st.lanes.filter((l) => l.from === null), snk = st.lanes.filter((l) => l.to === null);
  console.log('sources', src.length, 'sinks', snk.length);
  const outC = new Map(); for (const c of st.connectors) outC.set(c.from, (outC.get(c.from) || 0) + 1);
  const deadEnds = st.lanes.filter((l) => l.to !== null && !outC.has(l.id));
  console.log('lanes with a node end but no connector (dead ends):', deadEnds.length, deadEnds.slice(0, 12).map((l) => `${l.id} ${l.hw} len${l.len.toFixed(0)}`));
  const inC = new Set(st.connectors.map((c) => c.to));
  const orphans = st.lanes.filter((l) => l.from !== null && !inC.has(l.id));
  console.log('lanes with a node start but nothing feeding them:', orphans.length, orphans.slice(0, 12).map((l) => `${l.id} ${l.hw} len${l.len.toFixed(0)}`));
  console.log('bus stops', st.busStops.length, st.busStops.slice(0, 3));
  console.log('slots by kind', st.parkedSlots.reduce((a, s) => (a[s.kind] = (a[s.kind] || 0) + 1, a), {}));
  console.log('connector turns', st.connectors.reduce((a, s) => (a[s.turn] = (a[s.turn] || 0) + 1, a), {}));
  console.log('signals', st.signals.map((s) => `${s.id}${s.mid ? 'm' : ''}@${s.x.toFixed(0)},${s.z.toFixed(0)}`).join(' '));
  process.exit(0);
}

// ------------------------------------------------------------------ plan image (no GPU): --plan x0,z0,x1,z1,pxPerM,out.png [--parked] draws roads, buildings, the parked cars and (after the run) the moving vehicles
async function writePlan(spec, vehicles, parkedCars) {
  const fs = await import('node:fs'); const zlib = await import('node:zlib');
  const [x0, z0, x1, z1, sc, out] = spec.split(',');
  const X0 = +x0, Z0 = +z0, S = +sc, Wd = Math.ceil((+x1 - X0) * S), Hd = Math.ceil((+z1 - Z0) * S);
  const img = new Uint8Array(Wd * Hd * 3).fill(240);
  const px = (x, z, c) => { const i = Math.round((x - X0) * S), j = Math.round((z - Z0) * S); if (i < 0 || j < 0 || i >= Wd || j >= Hd) return; const o = (j * Wd + i) * 3; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; };
  const line = (ax, az, bx, bz, c) => { const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) * S * 1.5)); for (let k = 0; k <= n; k++) px(ax + (bx - ax) * k / n, az + (bz - az) * k / n, c); };
  const rect = (cx, cz, rotY, hl, hw, c) => { const fx = Math.sin(rotY), fz = Math.cos(rotY), rx = Math.cos(rotY), rz = -Math.sin(rotY); for (let a = -hl; a <= hl; a += 0.5 / S) for (let b = -hw; b <= hw; b += 0.5 / S) px(cx + fx * a + rx * b, cz + fz * a + rz * b, c); };
  for (const r of st.roads) for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1]; for (let o = -r.w / 2; o <= r.w / 2; o += 1 / S) { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; line(a[0] - dz / l * o, a[1] + dx / l * o, b[0] - dz / l * o, b[1] + dx / l * o, r.rank === 0 ? [214, 214, 218] : [196, 196, 204]); } }
  for (const p of L.groundFootprints()) for (const ring of [p.o, ...p.h]) for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) line(ring[j], ring[j + 1], ring[i], ring[i + 1], [130, 120, 110]);
  if (args.includes('--lanes')) {
    for (const l of st.lanes) for (let i = 0; i + 1 < l.pts.length; i++) line(l.pts[i][0], l.pts[i][1], l.pts[i + 1][0], l.pts[i + 1][1], l.rank === 0 ? [170, 170, 120] : [120, 140, 230]);
    for (const c of st.connectors) for (let i = 0; i + 1 < c.pts.length; i++) line(c.pts[i][0], c.pts[i][1], c.pts[i + 1][0], c.pts[i + 1][1], c.turn === 'straight' ? [240, 160, 60] : c.turn === 'left' ? [200, 60, 200] : [60, 200, 200]);
  }
  for (const c of st.crosswalks || []) line(c.pts[0][0], c.pts[0][1], c.pts[1][0], c.pts[1][1], [255, 255, 255]);
  for (const sl of st.parkedSlots || []) px(sl.x, sl.z, [150, 200, 150]);
  for (const c of parkedCars || []) rect(c.x + Math.sin(c.rotY) * 0.1, c.z + Math.cos(c.rotY) * 0.1, c.rotY, c.hl || 2.2, c.hw || 0.9, c.taxi ? [240, 210, 40] : [150, 120, 90]);
  for (const b of st.busStops || []) for (let a = -2; a <= 2; a++) for (let d = -2; d <= 2; d++) px(b.x + a / S, b.z + d / S, [0, 90, 220]);
  for (const v of vehicles || []) {
    const A = v.arch, mid = (A.front + A.rear) / 2, fx = Math.sin(v.rot), fz = Math.cos(v.rot);
    const c = v.trolley ? [0, 120, 255] : v.bus ? (v.arch.tour ? [200, 0, 160] : [0, 170, 150]) : v.taxi ? [240, 190, 0] : v.v < 0.3 ? [220, 40, 40] : [40, 150, 60];
    rect(v.x + fx * mid, v.z + fz * mid, v.rot, A.len / 2, A.wid / 2, c);
    if (v.arch.parts) { const x2 = v.x2, z2 = v.z2; rect(x2 - Math.sin(v.rot2) * 2, z2 - Math.cos(v.rot2) * 2, v.rot2, 4.4, 1.27, c); }
  }
  const raw = Buffer.alloc((Wd * 3 + 1) * Hd); for (let j = 0; j < Hd; j++) { raw[j * (Wd * 3 + 1)] = 0; Buffer.from(img.buffer, j * Wd * 3, Wd * 3).copy(raw, j * (Wd * 3 + 1) + 1); }
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4); d.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(Wd, 0); ihdr.writeUInt32BE(Hd, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  console.log('plan image written', out, Wd + 'x' + Hd);
}

if (flag('twdebug', false)) {
  const sm = await import(pathToFileURL(path.join(root, 'src/world/traffic/sim.js')).href);
  const s1 = sm.createSim(st, () => ctx.rng('x'), { extent: L.EXTENT, atEdge: (x, z, m = 70) => !L.inExtent(x, z, m) });
  const [cx, cz] = String(flag('twdebug')).split(',').map(Number);
  for (const l of s1.laneSeg.values()) { const mx = (l.xs[0] + l.xs[l.n - 1]) / 2, mz = (l.zs[0] + l.zs[l.n - 1]) / 2; if (Math.hypot(mx - cx, mz - cz) > 350 || l.rank < 3 || l.idx !== 0) continue; console.log(l.id, (l.lane.name || '').slice(0, 20), 'len', l.len.toFixed(0), 'rank', l.rank, 'idx', l.idx, 'wired', l.wired, 'tw', l.tw, 'twReach', l.twReach, 'twEdge', l.twEdge, 'reach', l.reach, 'sink', l.sink, 'conns', l.conns.length, 'twOkConns', l.conns.filter((c) => c.twOk).length, 'trolleyRoad', (st.roads.find((r) => r.id === l.lane.road) || {}).trolley); }
  process.exit(0);
}
if (flag('twends', false)) {
  const sm = await import(pathToFileURL(path.join(root, 'src/world/traffic/sim.js')).href);
  const s1 = sm.createSim(st, () => ctx.rng('x'), { extent: L.EXTENT, atEdge: (x, z, m = 70) => !L.inExtent(x, z, m) });
  const ends = [];
  for (const l of s1.laneSeg.values()) { if (!l.tw) continue; const onward = l.conns.filter((c) => c.to.tw); if (onward.length) continue; ends.push(`${l.id} ${(l.lane.name || '').slice(0, 18)} end ${l.xs[l.n - 1].toFixed(0)},${l.zs[l.n - 1].toFixed(0)} len ${l.len.toFixed(0)} conns ${l.conns.length} sink ${l.sink} reach ${l.reach} twReach ${l.twReach} idx ${l.idx} rank ${l.rank}`); }
  console.log('wired lanes without a wired successor:', ends.length); console.log(ends.join(String.fromCharCode(10)));
  const starts = []; const hasPred = new Set(); for (const c of s1.connSeg.values()) if (c.from.tw && c.to.tw) hasPred.add(c.to);
  for (const l of s1.laneSeg.values()) { if (!l.tw || hasPred.has(l)) continue; starts.push(`${l.id} ${(l.lane.name || '').slice(0, 18)} start ${l.xs[0].toFixed(0)},${l.zs[0].toFixed(0)} len ${l.len.toFixed(0)} from ${l.lane.from} idx ${l.idx}`); }
  console.log('wired lanes without a wired predecessor:', starts.length); console.log(starts.join(String.fromCharCode(10)));
  process.exit(0);
}
if (flag('twconn', false)) {
  const sm = await import(pathToFileURL(path.join(root, 'src/world/traffic/sim.js')).href);
  const s1 = sm.createSim(st, () => ctx.rng('x'), { extent: L.EXTENT, atEdge: (x, z, m = 70) => !L.inExtent(x, z, m) });
  for (const id of String(flag('twconn')).split(',')) {
    const l = s1.laneSeg.get(id); if (!l) { console.log(id, 'not found'); continue; }
    console.log(id, 'tw', l.tw, 'wired', l.wired, 'len', l.len.toFixed(0), 'idx', l.idx, 'rank', l.rank, 'road', l.lane.road, 'to node', l.lane.to);
    for (const c of l.conns) console.log('   ->', c.id, c.turn, 'to', c.to.id, 'tw', c.to.tw, 'rank', c.to.rank, 'idx', c.to.idx, 'len', c.to.len.toFixed(0), 'road', c.to.lane.road, 'reach', c.to.reach, 'twOk', c.twOk, c.to.lane.name);
    for (const c of l.inConns) console.log('   <-', c.id, c.turn, 'from', c.from.id, 'tw', c.from.tw, 'rank', c.from.rank, 'idx', c.from.idx);
  }
  process.exit(0);
}
if (flag('sigdump', false)) {
  const [cx, cz] = String(flag('sigdump')).split(',').map(Number);
  for (const sg of st.signals) if (Math.hypot(sg.x - cx, sg.z - cz) < 90) { console.log('signal', sg.id, sg.x.toFixed(0), sg.z.toFixed(0), 'mid', sg.mid, 'cycle', sg.cycle, 'ofs', sg.ofs, 'complex', sg.complex); for (const a of sg.approaches) console.log('   approach', a.index, 'bearing', Math.round(a.bearing), 'group', a.group, a.name, 'lanes', a.lanes.join(',')); }
  for (const j of st.junctions) if (Math.hypot(j.x - cx, j.z - cz) < 60) console.log('junction', j.id, j.x.toFixed(0), j.z.toFixed(0), 'signal', j.signal, 'arms', j.arms.map((a) => `${a.index}:${Math.round(a.bearing)}:${a.name}:in${a.in.length}/out${a.out.length}`).join(' | '));
  process.exit(0);
}
if (flag('sigdump', false)) {
  const [cx, cz] = String(flag('sigdump')).split(',').map(Number);
  for (const sg of st.signals) if (Math.hypot(sg.x - cx, sg.z - cz) < 90) { console.log('signal', sg.id, sg.x.toFixed(0), sg.z.toFixed(0), 'mid', sg.mid, 'cycle', sg.cycle, 'ofs', sg.ofs, 'complex', sg.complex); for (const a of sg.approaches) console.log('   approach', a.index, 'bearing', Math.round(a.bearing), 'group', a.group, a.name, 'lanes', a.lanes.join(',')); }
  for (const j of st.junctions) if (Math.hypot(j.x - cx, j.z - cz) < 60) console.log('junction', j.id, j.x.toFixed(0), j.z.toFixed(0), 'signal', j.signal, 'arms', j.arms.map((a) => `${a.index}:${Math.round(a.bearing)}:${a.name}:in${a.in.length}/out${a.out.length}`).join(' | '));
  process.exit(0);
}
if (flag('lanedump', false)) {
  for (const id of String(flag('lanedump')).split(',')) for (const l of st.lanes.filter((q) => q.id === id)) console.log(id, l.name, 'rank', l.rank, 'idx', l.idx, 'w', l.width, 'len', l.len.toFixed(0), 'from', l.from, 'to', l.to, 'dir', l.dir, l.pts.filter((_, i) => i % Math.max(1, Math.floor(l.pts.length / 5)) === 0 || i === l.pts.length - 1).map((p) => p.map(Math.round).join(',')).join(' > '));
  for (const id of String(flag('lanedump')).split(',')) for (const c of st.connectors.filter((q) => q.from === id || q.to === id)) console.log('   conn', c.id, c.turn, c.junction, 'len', c.len.toFixed(0), c.pts.filter((_, i) => i % Math.max(1, Math.floor(c.pts.length / 3)) === 0).map((p) => p.map(Math.round).join(',')).join(' > '));
  process.exit(0);
}
// ------------------------------------------------------------------ simulation test
const { createSim, DT } = await import(pathToFileURL(path.join(root, 'src/world/traffic/sim.js')).href);
const minutes = Number(flag('minutes', 10));
const t0 = Date.now();
// synthetic pedestrians: every zebra is busy for 6 s out of 24 with a per-crosswalk phase (exercises the give-way logic; `simRef` is the sim for its clock)
let simRef = null;
const pedBusy = flag('peds', false) ? (id) => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return simRef && ((simRef.time + h % 24) % 24) < 6; } : null;
const regionArg = flag('region', false) ? String(flag('region')).split(',').map(Number) : null;      // --region x,z[,x2,z2]: regional simulation around that point (a second point = the camera drives there at 12 m/s)
const camPos = regionArg ? [regionArg[0], regionArg[1]] : null;
const { STATIONS } = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const BR = ctx.services.bridges, deckOf = BR && BR.deckY ? (x, z) => BR.deckY(x, z) : null;
const sim = createSim(st, () => ctx.rng('traffic-sim'), { extent: L.EXTENT, atEdge: (x, z, m = 70) => !L.inExtent(x, z, m), pedBusy, trams: !flag('notram', false), tramStops: STATIONS.filter((q) => q.kind === 'tram'),
  wet: deckOf ? (x, z) => L.inRiver(x, z) && deckOf(x, z) === null : undefined, inPlay: (x, z) => L.inPlay(x, z, 0), density: flag('density', false) ? Number(flag('density')) : undefined, centre: regionArg ? () => camPos : undefined, radius: flag('radius', false) ? Number(flag('radius')) : undefined }); simRef = sim;
sim.debugWhy = flag("diag", false) || flag("why", false); sim.start();
console.log('cross-junction conflicts', sim.stats.nCross, 'conflicts with micro lanes', sim.stats.nConfLanes);
console.log(`sim built in ${Date.now() - t0} ms: segs ${sim.segs.length}, conflicts ${sim.stats.nConf}, bus stops on lanes ${sim.stats.busStops}, vehicles at t=0: ${sim.vehicles.length}`);
console.log('wired lanes', sim.stats.wired.lanes, 'reaching the edge', sim.stats.wired.reach, 'trolley sources now', sim.stats.srcTrolley, 'dup lane ids', sim.stats.dupLaneIds, 'bad connectors', sim.stats.badConnectors);
console.log('sim build phases (cumulative ms)', JSON.stringify(sim.stats.timing));
console.log('trams', JSON.stringify(sim.stats.trams), 'cars now', sim.trams ? sim.trams.count() : 0, '| tram lanes (left to the trams)', sim.stats.tramLanes, '| lanes cut at open water', sim.stats.wetLanes);
if (flag('tramdump', false) && sim.trams) { for (const g of sim.trams.segs) { const r = g.route; console.log(`  ${r.id} ${Math.round(r.len)} m, ${r.pts.length} pts, from ${r.pts[0].map(Math.round)} to ${r.pts[r.pts.length - 1].map(Math.round)}, stops ${r.stops.length}: ${r.stops.map((q) => q.name + '@' + Math.round(q.s)).join(', ')}`); console.log(`     lights ${r.lights.length}: ${r.lights.map((q) => q.signal + '@' + Math.round(q.s) + '/' + q.d.toFixed(0)).join(' ')}; slowest ${Math.min(...r.vlim).toFixed(1)} m/s`); } process.exit(0); }
const railDist = (v) => { const g = v.seg; let m = 1e9; for (let i = 0; i + 1 < g.n; i++) { const dx = g.xs[i + 1] - g.xs[i], dz = g.zs[i + 1] - g.zs[i], l2 = dx * dx + dz * dz || 1e-9; let u = ((v.x - g.xs[i]) * dx + (v.z - g.zs[i]) * dz) / l2; u = u < 0 ? 0 : u > 1 ? 1 : u; const d = Math.hypot(g.xs[i] + dx * u - v.x, g.zs[i] + dz * u - v.z); if (d < m) m = d; } return m; };
const frontKeys = {};
const traceLane = flag('trace', false) ? String(flag('trace')) : null, traceN = {}, traceWhy = [];
const viol = { red: 0, nan: 0, overlap: 0, offlane: 0, teleport: 0, stuck: 0, count: 0, offrail: 0 };
const { inPetro } = await import(pathToFileURL(path.join(root, 'src/world/traffic/region.js')).href);
const split = { overlapOld: 0, overlapPetro: 0, overlapTram: 0, overlapBus: 0, stuckOld: 0, stuckPetro: 0 };      // the districts reviewed before 2026-10-06 against the Petrograd side / Spit extension
let tramSum = 0, tramStop = 0, tramMax = 0;
const lastMove = new Map();
const msgs = [], omsgs = [], fmsgs = [], redSeen = new Set();
sim.onCross = (v, sl, state, t) => { if (traceLane && v.seg.id === traceLane) { const w = Math.floor(t / 80); traceN[w] = (traceN[w] || 0) + 1; } if (state === 'red') { const rk = v.id + '|' + sl.signal; if (!redSeen.has(rk)) { redSeen.add(rk); viol.red++; if (msgs.length < 8) msgs.push(`red run: veh ${v.id} ${v.kind} at ${sl.signal} t=${t.toFixed(1)} lane ${v.seg.id} s=${v.s.toFixed(1)} line=${sl.s.toFixed(1)}/${v.seg.len.toFixed(1)} v=${v.v.toFixed(1)} atEnd=${sl.atEnd} age=${v.age ?? '-'} why=${v.why} at ${v.x.toFixed(0)},${v.z.toFixed(0)}`); } } };
const corners = (v) => { const c = Math.cos(v.rot), s = Math.sin(v.rot), hl = v.len / 2, hw = v.wid / 2; const fx = Math.sin(v.rot), fz = Math.cos(v.rot), rx = Math.cos(v.rot), rz = -Math.sin(v.rot); void c; void s; return { fx, fz, rx, rz, hl, hw }; };
function overlap(a, b) {
  const A = corners(a), B = corners(b), dx = b.x - a.x, dz = b.z - a.z;
  for (const [ax, az, h1, h2] of [[A.fx, A.fz, A.hl, A.hw], [A.rx, A.rz, A.hw, A.hl], [B.fx, B.fz, B.hl, B.hw], [B.rx, B.rz, B.hw, B.hl]]) {
    const ra = (Math.abs(A.fx * ax + A.fz * az) * A.hl + Math.abs(A.rx * ax + A.rz * az) * A.hw) - 0.15;
    const rb = (Math.abs(B.fx * ax + B.fz * az) * B.hl + Math.abs(B.rx * ax + B.rz * az) * B.hw) - 0.15;
    if (Math.abs(dx * ax + dz * az) > ra + rb) return false;
    void h1; void h2;
  }
  return true;
}
let nearSum = 0, nearStop = 0, nearN = 0; let nevSum = 0, nevStop = 0, nevN = 0, wSum = 0, wStop = 0, wBus = 0, wN = 0; const tl = []; const hot = {}; const pairs = new Set(); let stoppedSum = 0, speedSum = 0, bigSum = 0, bigStop = 0;
let maxCount = 0, sumCount = 0, n = 0, minCount = 1e9, stoppedMax = 0;
const byRank = {};
const steps = Math.round(minutes * 60 / DT);
const tRun = Date.now();
for (let k = 0; k < steps; k++) {
  if (regionArg && regionArg.length >= 4) { const f = Math.min(1, sim.time * 12 / Math.hypot(regionArg[2] - regionArg[0], regionArg[3] - regionArg[1])); camPos[0] = regionArg[0] + (regionArg[2] - regionArg[0]) * f; camPos[1] = regionArg[1] + (regionArg[3] - regionArg[1]) * f; }
  if (regionArg && k % 15 === 0) sim.recentre(false);
  sim.step();
  if (traceLane && k % 3 === 0) { const sg = sim.laneSeg.get(traceLane); const f = sg && sg.veh[sg.veh.length - 1]; if (f && f.v < 0.3 && f.next) { const sl = sg.stops.find((x) => x.atEnd); const stt = sl && sl.signal ? sim.signalState(sl.signal, sl.approach, sim.time) : '-'; const es = sim.entryState(f, f.next, sim.time); const key = `${stt}/entry${es}/${String(f.why).split(' ')[0]}/${f.next.turn}`; frontKeys[key] = (frontKeys[key] || 0) + 1; } }
  const vs = sim.vehicles;
  for (const v of vs) if (!Number.isFinite(v.x) || !Number.isFinite(v.z) || !Number.isFinite(v.rot) || !Number.isFinite(v.v)) { viol.nan++; }
  for (const v of vs) { const d = Math.hypot(v.x - v.px, v.z - v.pz); if (d > 4 + v.v * DT * 2) { viol.teleport++; if (fmsgs.length < 8) fmsgs.push(`teleport ${v.kind}#${v.id} ${v.seg.id} ${d.toFixed(1)} m in one step t=${sim.time.toFixed(1)} s=${v.s.toFixed(1)}/${v.seg.len.toFixed(1)} trail=${v.trail.map((q) => q.id + ':' + q.len.toFixed(0)).join(',')} v=${v.v.toFixed(1)} from ${v.px.toFixed(0)},${v.pz.toFixed(0)} to ${v.x.toFixed(0)},${v.z.toFixed(0)}`); } }
  if (k % 15 === 0) for (const v of vs) if (v.v > 0.4 || !lastMove.has(v.id)) lastMove.set(v.id, sim.time);
  if (k % 5 === 0) {
    const inX = (v) => L.inPlay(v.x, v.z, -40);
    // spatial hash for the overlap check
    const g = new Map();
    for (const v of vs) { const key = Math.floor(v.x / 12) * 4096 + Math.floor(v.z / 12); (g.get(key) || g.set(key, []).get(key)).push(v); }
    for (const v of vs) {
      const cx = Math.floor(v.x / 12), cz = Math.floor(v.z / 12);
      for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iz = cz - 1; iz <= cz + 1; iz++) for (const u of g.get(ix * 4096 + iz) || []) {
        if (u.id <= v.id || !inX(v)) continue;
        if (Math.hypot(u.x - v.x, u.z - v.z) > 14) continue;
        if (overlap(u, v)) { const pk = u.id + '-' + v.id; if (!pairs.has(pk)) { pairs.add(pk); viol.overlap++; split[inPetro(v.x, v.z, 120) ? 'overlapPetro' : 'overlapOld']++; if (u.tram || v.tram) split.overlapTram++; else if (u.bus || v.bus) split.overlapBus++; { const hk = Math.round(v.x / 30) * 30 + ',' + Math.round(v.z / 30) * 30; hot[hk] = (hot[hk] || 0) + 1; } if (omsgs.length < (flag("ovl", false) ? 400 : 14)) omsgs.push(`overlap t=${sim.time.toFixed(1)} ${v.kind}#${v.id}(${v.seg.id} s${v.s.toFixed(1)}/${v.seg.len.toFixed(0)} v${v.v.toFixed(1)}) vs ${u.kind}#${u.id}(${u.seg.id} s${u.s.toFixed(1)}/${u.seg.len.toFixed(0)} v${u.v.toFixed(1)}) at ${v.x.toFixed(0)},${v.z.toFixed(0)} rot ${(v.rot * 57.3).toFixed(0)}/${(u.rot * 57.3).toFixed(0)}`); } }
      }
      if (v.tram) { tramSum++; if (v.v < 0.3) tramStop++; if (k % 150 === 0 && v.s < v.seg.len - 1 && v.s > v.len + 1 && railDist(v) > 1.2) { viol.offrail++; if (fmsgs.length < 8) fmsgs.push(`off-rail tram#${v.id} ${v.seg.id} at ${v.x.toFixed(0)},${v.z.toFixed(0)} t=${sim.time.toFixed(1)}`); } continue; }
      if (inX(v) && st.net.cover(v.x, v.z, {}) < -2.2) { viol.offlane++; if (fmsgs.length < 8) fmsgs.push(`off-lane ${v.kind}#${v.id} ${v.seg.id} at ${v.x.toFixed(0)},${v.z.toFixed(0)} t=${sim.time.toFixed(1)} (len ${v.len} s ${v.s.toFixed(1)}/${v.seg.len.toFixed(1)} next ${v.next && v.next.id} came from ${(v.trail || []).map((q) => q.id).join(' < ')} cover ${st.net.cover(v.x, v.z, {}).toFixed(1)})`); }
    }
    if (k % 900 === 0) tl.push(`${(sim.time / 60).toFixed(0)}m:${vs.length}/${vs.filter((v) => v.v < 0.3).length}`);
    maxCount = Math.max(maxCount, vs.length); minCount = Math.min(minCount, vs.length); sumCount += vs.length; n++;
    { const nv = vs.filter((v) => v.x > 100 && v.x < 700 && v.z > 0 && v.z < 300 && ((v.seg.lane || v.seg.from.lane).name || '') === 'Невский проспект'); nevSum += nv.length; nevStop += nv.filter((v) => v.v < 0.3).length; nevN++; }
    { const nw = vs.filter((v) => v.x > -2100 && v.x < -1050 && v.z > -560 && v.z < -230 && ((v.seg.lane || v.seg.from.lane).name || '') === 'Невский проспект'); wSum += nw.length; wStop += nw.filter((v) => v.v < 0.3).length; wBus += nw.filter((v) => v.bus).length; wN++; }
    if (camPos) { const nn = vs.filter((v) => Math.hypot(v.x - camPos[0], v.z - camPos[1]) < 250 && ((v.seg.lane || v.seg.from.lane).name || '') === 'Невский проспект'); nearSum += nn.length; nearStop += nn.filter((v) => v.v < 0.3).length; nearN++; }
    { const st0 = vs.filter((v) => v.v < 0.3).length; stoppedMax = Math.max(stoppedMax, st0); stoppedSum += st0; speedSum += vs.reduce((a, v) => a + v.v, 0) / Math.max(1, vs.length); const bk = vs.filter((v) => v.seg.rank >= 3 || (v.seg.from && v.seg.from.rank >= 3)); bigSum += bk.length; bigStop += bk.filter((v) => v.v < 0.3).length; }
    if (k > steps / 2) for (const v of vs) { const r = v.seg.rank; byRank[r] = (byRank[r] || 0) + 1; }
  }
}
if (traceLane) console.log('front vehicle stopped (signal/entryState/why/turn):', JSON.stringify(frontKeys));
if (traceLane) console.log('crossings of', traceLane, 'per 80 s window:', JSON.stringify(traceN));
if (sim.stats.tCollide) console.log('collide ms/step', (sim.stats.tCollide / steps).toFixed(3));
console.log(`simulated ${minutes} min in ${Date.now() - tRun} ms (${((Date.now() - tRun) / steps).toFixed(3)} ms/step)`);
if (regionArg) console.log('region: active lanes', sim.stats.activeLanes, 'active segs', sim.stats.activeSegs, 'jumps', sim.stats.regionJumps, 'camera now', camPos.map(Math.round).join(','));
console.log(`vehicles: min ${minCount} avg ${(sumCount / n).toFixed(0)} max ${maxCount}; max stopped ${stoppedMax}; spawned ${sim.stats.spawned} despawned ${sim.stats.despawned}`);
console.log(`Nevsky x 100..700: ${(nevSum / (nevN || 1)).toFixed(1)} vehicles on average (both carriageways, 600 m), ${(100 * nevStop / (nevSum || 1)).toFixed(0)} % stopped`);
if (camPos) console.log(`Nevsky within 250 m of the camera (a ~500 m stretch, both carriageways): ${(nearSum / (nearN || 1)).toFixed(1)} vehicles = ${(nearSum / (nearN || 1) / 10).toFixed(1)} per 100 m of one carriageway, ${(100 * nearStop / (nearSum || 1)).toFixed(0)} % stopped`);
console.log(`Nevsky WEST (x -2100..-1050, ~1.1 km, both carriageways): ${(wSum / (wN || 1)).toFixed(1)} vehicles on average = ${(wSum / (wN || 1) / 22).toFixed(1)} per 100 m of one carriageway, ${(100 * wStop / (wSum || 1)).toFixed(0)} % stopped, ${(wBus / (wN || 1)).toFixed(1)} public-transport vehicles`);
console.log('timeline (min:vehicles/stopped)', tl.join(' '), 'deadlock kills', sim.stats.deadlocks || 0);
console.log('vehicle-samples by segment rank (second half):', byRank);
console.log(`stopped share avg ${(100 * stoppedSum / (sumCount || 1)).toFixed(0)} %, mean speed ${(speedSum / n).toFixed(1)} m/s; on rank>=3 roads: stopped ${(100 * bigStop / (bigSum || 1)).toFixed(0)} %`);
if (flag('diag', false)) {
  const stuck = sim.vehicles.filter((v) => v.v < 0.3);
  const bySeg = {}; for (const v of stuck) bySeg[v.seg.id] = (bySeg[v.seg.id] || 0) + 1;
  console.log('stopped vehicles', stuck.length, 'of', sim.vehicles.length);
  console.log(Object.entries(bySeg).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, n]) => `${k}:${n}`).join(' | '));
  const long = sim.vehicles.filter((v) => v.wait > 40).map((v) => `${v.kind}#${v.id} ${v.seg.id} s=${v.s.toFixed(0)}/${v.seg.len.toFixed(0)} wait=${v.wait.toFixed(0)} next=${v.next ? v.next.id : '-'} at ${v.x.toFixed(0)},${v.z.toFixed(0)}`);
  for (const v of sim.vehicles.filter((q) => q.wait > 55).slice(0, 6)) {
    const c = v.next; if (!c) continue;
    const sl = v.seg.stops.find((x) => x.atEnd);
    console.log(`WHY ${v.kind}#${v.id} why=[${v.why}] on ${v.seg.id}: stop signal=${sl && sl.signal} state=${sl && sl.signal ? sim.signalState(sl.signal, sl.approach, sim.time) : '-'} approach=${sl && sl.approach} junction=${c.junction}`);
    console.log(`    entryState=${sim.entryState(v, c, sim.time)} room=${sim.roomAhead(c, v.len + 1.5).toFixed(1)} need=${(v.len + 1.5).toFixed(1)} t=${sim.time.toFixed(1)}`);
    for (const o of c.conf) console.log(`    conflict ${o.id} turn=${o.turn} occupied=${o.veh.map((q) => q.kind + '#' + q.id + ' v' + q.v.toFixed(1)).join(',') || '-'} yieldTo=${c.yieldTo.includes(o)}`);
    console.log(`    exit lane ${c.to.id} len ${c.to.len.toFixed(1)} veh ${c.to.veh.map((q) => q.kind + '#' + q.id + ' s' + q.s.toFixed(0) + ' v' + q.v.toFixed(1)).join(',') || '-'}; defNext ${c.to.defNext ? c.to.defNext.id : '-'}`);
  }
  if (flag('near', false)) {
  const [cx, cz] = String(flag('near')).split(',').map(Number);
  for (const g of sim.segs) { if (g.kind !== 'lane') continue; const mx = (g.xs[0] + g.xs[g.n - 1]) / 2, mz = (g.zs[0] + g.zs[g.n - 1]) / 2; if (Math.hypot(mx - cx, mz - cz) > 80) continue;
    console.log(`lane ${g.id} len ${g.len.toFixed(1)} rank ${g.rank} ${g.sink ? 'SINK ' : ''}from ${g.lane.from} to ${g.lane.to} stops ${g.stops.map((x) => (x.implicit ? 'imp' : x.signal || (x.give ? 'give' : 'line')) + '@' + x.s.toFixed(0)).join(',')} veh ${g.veh.map((q) => q.kind + '#' + q.id + ' s' + q.s.toFixed(0) + ' v' + q.v.toFixed(1)).join(',')} conns ${g.conns.map((c) => c.id.split('>')[1] + (c.to.reach ? '' : '(x)')).join(' ')}`); }
}
{
  // why are the stopped vehicles stopped? (red light / box or exit blocked at a green / leader / collision net / bus stop)
  const kinds = {}, heads = {};
  for (const v of sim.vehicles) {
    if (v.v >= 0.3) continue;
    const sl = v.seg.kind === 'lane' ? v.seg.stops.find((x) => x.atEnd) : null;
    const stt = sl && sl.signal ? sim.signalState(sl.signal, sl.approach, sim.time) : '-';
    const k = String(v.why || '?').split(' ')[0] + (String(v.why).startsWith('stop') ? '/' + stt + (v.entryBlock ? '/entry' : '') : '');
    kinds[k] = (kinds[k] || 0) + 1;
    if (String(v.why).startsWith('stop') && stt !== 'red' && v.wait > 30) { const j = v.next ? v.next.junction : v.seg.junction; heads[j] = (heads[j] || 0) + 1; }
  }
  console.log('stopped vehicles by cause', JSON.stringify(kinds));
  if (flag('old', false)) { const ol = sim.vehicles.slice().sort((a, b) => a.born - b.born).slice(0, 25); console.log('OLDEST', ol.map((v) => `${v.kind}#${v.id} age ${Math.round(sim.time - v.born)} s on ${v.seg.id} ${Math.round(v.x)},${Math.round(v.z)} v${v.v.toFixed(1)} ${String(v.why).split(' ')[0]}`).join(' | ')); }
  if (flag('chains', false)) {
    // follow every stopped vehicle to what it waits for: leader -> ... -> a red light (normal), a cycle (gridlock), a moving vehicle / nothing
    const leaderOf = (v) => {
      const arr = v.seg.veh, i = arr.indexOf(v); if (i + 1 < arr.length) return arr[i + 1];
      let ns = v.seg.kind === 'lane' ? v.next : v.seg.to, hop = 0;
      while (ns && hop++ < 5) { if (ns.veh.length) return ns.veh[0]; ns = ns.kind === 'conn' ? ns.to : ns.defNext; }
      return null;
    };
    const blockerOf = (v) => {
      const w = String(v.why || '');
      if (w.startsWith('lead')) return leaderOf(v);
      if (w.startsWith('col')) return null;
      if (w.startsWith('stop') && v.entryBlock && v.next) { const c = v.next; for (const o of c.conf) if (sim.occupied(o)) return o.veh[0] || o.to.veh[0]; return c.to.veh[0] || leaderOf(v); }
      return null;
    };
    const term = {}, cyc = new Map(), hd = {};
    for (const v of sim.vehicles) {
      if (v.v >= 0.3) continue;
      let u = v, n = 0; const seen = new Set();
      while (u && n++ < 600) {
        if (seen.has(u)) { cyc.set(u.seg.id, (cyc.get(u.seg.id) || 0) + 1); u = 'cycle'; break; }
        seen.add(u);
        if (u.v >= 0.3) { u = 'moving'; break; }
        const b = blockerOf(u); if (!b) { const w = String(u.why || ''); u = w.startsWith('stop') ? (u.entryBlock ? 'entry-open' : (u.at ? 'busstop' : 'red/stop')) : w.startsWith('col') ? 'collision-net' : 'other:' + w.split(' ')[0]; break; }
        u = b;
      }
      const k = typeof u === 'string' ? u : 'long'; term[k] = (term[k] || 0) + 1;
      if (k === 'red/stop') { const e = [...seen].pop(); const sl = e.seg.kind === 'lane' ? e.seg.stops.find((x) => x.atEnd) : null; const hk = (sl && sl.signal ? sl.signal + '/' + sl.approach : (e.at ? 'busstop' : 'line')) + '@' + Math.round(e.x) + ',' + Math.round(e.z); hd[hk] = (hd[hk] || 0) + 1; }
    }
    console.log('queue heads (signal/approach@x,z: vehicles queued)', JSON.stringify(Object.entries(hd).sort((a, b) => b[1] - a[1]).slice(0, 25)));
    console.log('wait chains end at', JSON.stringify(term), 'cycle lanes', JSON.stringify([...cyc].sort((a, b) => b[1] - a[1]).slice(0, 12)));
  }
  if (flag('heads', false)) for (const v of sim.vehicles) {
    if (v.v >= 0.3 || !String(v.why).startsWith('stop') || !v.entryBlock) continue;
    const c = v.next; if (!c) continue;
    const occ = c.conf.filter((o) => sim.occupied(o)).map((o) => o.id + '[' + o.veh.map((q) => q.kind + '#' + q.id).join(',') + ']');
    console.log(`HEAD ${v.kind}#${v.id} wait ${Math.round(v.wait)} on ${v.seg.id} at ${v.x.toFixed(0)},${v.z.toFixed(0)} -> ${c.id} room ${Math.min(999, sim.roomAhead(c, v.len + 1.5)).toFixed(1)}/${(v.len + 1.5).toFixed(1)} entry ${sim.entryState(v, c, sim.time)} exitlane ${c.to.id} len ${c.to.len.toFixed(0)} veh ${c.to.veh.length} conflictsOccupied ${occ.join(' ') || '-'}`);
  }
  console.log('junctions with vehicles held > 30 s at a non-red stop', JSON.stringify(Object.entries(heads).sort((a, b) => b[1] - a[1]).slice(0, 14)));
}
console.log('long waits', long.length); for (const l of long.slice(0, 15)) console.log('  ' + l);
}
const kinds = {}; for (const v of sim.vehicles) kinds[v.kind] = (kinds[v.kind] || 0) + 1; console.log('final mix', kinds);
for (const m of [...msgs, ...omsgs, ...fmsgs]) console.log('  ' + m);
for (const v of sim.vehicles) if (sim.time - (lastMove.get(v.id) ?? sim.time) > 240) { viol.stuck++; split[inPetro(v.x, v.z, 120) ? 'stuckPetro' : 'stuckOld']++; if (viol.stuck <= 6) console.log(`  stuck ${v.kind}#${v.id} on ${v.seg.id} s=${v.s.toFixed(0)}/${v.seg.len.toFixed(0)} at ${v.x.toFixed(0)},${v.z.toFixed(0)} why=[${v.why}] col=${v.cgOn ? v.cgGap.toFixed(1) : '-'}`); }
if (sim.trams) { const slow = sim.vehicles.filter((v) => v.tram && v.wait > 45); if (slow.length) console.log('trams standing > 45 s:', slow.map((v) => `${v.seg.id} s=${v.s.toFixed(0)} at ${v.x.toFixed(0)},${v.z.toFixed(0)} wait ${v.wait.toFixed(0)} why=${v.why} col=${v.cgOn ? v.cgGap.toFixed(1) : '-'}${v.why === 'col' && v.obs ? ` behind ${v.obs.kind}#${v.obs.id} on ${v.obs.seg.id} s=${v.obs.s.toFixed(0)}/${v.obs.seg.len.toFixed(0)} v=${v.obs.v.toFixed(1)} why=[${v.obs.why}] wait=${(v.obs.wait || 0).toFixed(0)} next=${v.obs.next ? v.obs.next.id : '-'}` : ''}`).join(' | ')); }
if (sim.stats.wetLanes) { const nm = new Map(); for (const g of sim.laneSeg.values()) if (g.wet) { const k = (g.lane.name || g.lane.hw) + (g.cut < Infinity ? ' (ends)' : ' (starts)'); nm.set(k, (nm.get(k) || 0) + 1); } console.log('lanes cut at open water outside the play area:', [...nm].map(([k, c]) => k + ' x' + c).join(', ')); }
const OVL_MAX = Number(flag('overlaps', (regionArg ? 20 : 60) * minutes)),      // (whole network: the limit grew with the map: the committed simulation counted 449 in 10 min on the map of 2026-10-06, this one 480 - 510 from run to run)
       RED_MAX = Number(flag('reds', Math.max(6, minutes)));
console.log(`trams: ${(tramSum / (n || 1)).toFixed(1)} on the map on average, ${(100 * tramStop / (tramSum || 1)).toFixed(0)} % standing (stops, lights); pushed through a standing queue ${sim.trams ? sim.trams.pushes() : 0} times, ended the trip of an unseen car on the rails ${sim.trams ? sim.trams.retired() : 0} times`);
const bad = viol.nan + viol.offlane + viol.offrail + viol.teleport + (viol.red > RED_MAX ? 1 : 0) + (viol.overlap > OVL_MAX ? 1 : 0) + (viol.stuck > 0.04 * sim.vehicles.length ? 1 : 0);
console.log('overlap hotspots (30 m cells)', Object.entries(hot).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => k + ':' + n).join(' '));
console.log('violations', JSON.stringify(viol), '| old districts / Petrograd side:', JSON.stringify(split));
if (flag('plan', false)) {
  let parkedCars = null;
  if (args.includes('--withparked')) { const { planParked } = await import(pathToFileURL(path.join(root, 'src/world/traffic/parking.js')).href); parkedCars = planParked(ctx, st).cars; }
  await writePlan(String(flag('plan')), sim.vehicles, parkedCars);
}
const MAXC = Number(flag('maxcount', regionArg ? 2600 : 6500));      // the whole-network run seeds the cars of the whole map at t = 0 (~800 on the first 2.1 km2, 2100 on the 13 km2 east + west + north map, ~4 500 with the south-west, the Mars Field and the Petrograd side)
const ok = bad === 0 && maxCount < MAXC && minCount > 15;
console.log(ok ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(ok ? 0 : 1);
