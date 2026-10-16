// Headless behaviour test of the people module (no GPU). Builds environment, streets, city, rail, landmarks, metro, props / traffic (when they build) and people in node, then
//   node tools/people-test.mjs [--minutes 10] [--night] [--q high|medium|low] [--at name | --player x,z] (names: kazan palace gostiny admiralty isaac catherine alexander hermitage kazanbridge square nevsky station moika gdarcade horseman
//   admmetro gdmetro nevskymetro peter castle); --tour a,b,c visits several places in ONE build (equal shares of --minutes, per-leg head counts); --marsoff = without the castle population (A / B);
//   --mods a,b,c builds only these modules (quick probes with --eval script.mjs).
//   node tools/people-test.mjs [--minutes 10] [--night] [--player x,z] [--trace agentIndex --t0 s --t1 s]
// simulates N minutes (micro steps of 1/60 s, the player stands still at --player, default the hero view) and asserts / prints:
//   * nobody inside a building footprint (the station hall is a floor), nobody on a carriageway outside a zebra corridor (sampled every second), nobody entering a signalised zebra on
//     'dont', no NaN, a constant head count, at most 45 % hidden (inside / in a train / in the metro),
//   * pose continuity: no position jump > 0.8 m per step except the known teleports (sit / stand up / emerge / approach / recycle / mass placement), yaw change per step < 0.9 rad,
//   * density: people near the obelisk, people on Nevsky between Mayakovskaya and Vosstaniya (per 10 m of pavement), the number of people in the play area, stuck walkers,
//   * statistics: crossings started, mean waiting time at the kerb, sit / door counts.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

globalThis.__peopleCpu = process.argv.includes('--cpu');
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

if (process.argv.includes('--marsoff')) globalThis.__marsOff = true;                 // the population without the castle work (A / B)
const THREE = await import('three');
const { createContext } = await import(pathToFileURL(path.join(root, 'src/core/ctx.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? Number(args[i + 1]) || args[i + 1] : true); };
const AT = { kazan: [-1469, -300], palace: [-2010, -770], gostiny: [-1100, -240], admiralty: [-2440, -740], isaac: [-2449, -90], catherine: [-805, -86], alexander: [-2335, -500], hermitage: [-2097, -893], kazanbridge: [-1391, -331], square: [-2000, -690], nevsky: [-1650, -400], station: [592, 165], moika: [-1768, -420], gdarcade: [-1060, -215], horseman: [-2745, -420], admmetro: [-2030, -420], gdmetro: [-985, -192], nevskymetro: [-1360, -340],
  peter: [-712, -757], castle: [-740, -830] };
const atName = flag('at', null);
const PL = atName && AT[atName] ? AT[atName].join(',') : flag('player', null); let PLX = PL ? String(PL).split(',').map(Number) : null;
const TOUR = typeof flag('tour', null) === 'string' ? String(flag('tour', '')).split(',').filter((k) => AT[k]) : null;        // --tour a,b,c: the player visits the places one after the other (equal shares of --minutes)
const MIN = Number(flag('minutes', 10)), TRACE = Number(flag('trace', -1)), T0 = Number(flag('t0', 0)), T1 = Number(flag('t1', 0));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
camera.position.set(L.HERO.x, 1.6, L.HERO.z); camera.rotation.set(0, 0, 0); camera.updateMatrixWorld(true);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
const quality = { name: String(flag('q', 'high')), pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };         // --q high | medium | low (population x 1 / 0.7 / 0.45)
const ctx = createContext({ scene, camera, renderer: null, audio: null, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
const wanted = ['environment', 'streets', 'city', 'rail', 'landmarksA', 'landmarksB', 'landmarksC', 'landmarksD', 'landmarksE', 'landmarksF', 'landmarksG', 'landmarksH', 'landmarksI', 'landmarksJ', 'landmarksK', 'landmarksBelinsky', 'landmarksCastle', 'landmarksOktyabrsky',
  'bridges', 'metro', 'props', 'traffic', 'people'];
{ const mods = flag('mods', null); if (typeof mods === 'string') { const keep = new Set(mods.split(',')); for (let i = wanted.length - 1; i >= 0; i--) if (!keep.has(wanted[i])) wanted.splice(i, 1); } }       // --mods a,b,c: build only these (in the page order): quick probes
ctx.buildList = wanted;
const built = [], times = {};
if (args.includes('--night')) ctx.shared.uNight.value = 1;
for (const m of wanted) {
  const t0 = Date.now();
  try { const mod = await import(pathToFileURL(path.join(root, `src/world/${m}.js`)).href); await mod.build(ctx); built.push(m); times[m] = Date.now() - t0; }
  catch (e) { console.log(`(module ${m} failed to build: ${String(e && e.message).split('\n')[0]})`); if (m === 'people' || m === 'environment' || m === 'streets') { console.log(e.stack); process.exit(1); } }
}
console.log('built', built.join(','), JSON.stringify(times));
if (args.includes('--probe')) {                                  // dump the shapes of the services the people module reads (debug aid)
  const sv = ctx.services, shape = (v, d = 0) => Array.isArray(v) ? `[${v.length}] ` + (v.length && d < 2 ? JSON.stringify(v[0]).slice(0, 260) : '') : v && typeof v === 'object' ? '{' + Object.keys(v).slice(0, 30).join(',') + '}' : typeof v;
  for (const k of ['landmarks', 'landmarksE', 'landmarksF', 'landmarksG', 'landmarksH', 'landmarksI', 'landmarksJ', 'metro', 'bridges', 'environment', 'streets', 'props']) { console.log('== ' + k); for (const [kk, v] of Object.entries(sv[k] || {})) console.log('  ' + kk + ': ' + shape(v)); }
  if (args.includes('--dump')) { const fs = await import('node:fs'); const sv2 = ctx.services; const o = { landmarksE: { spots: sv2.landmarksE.spots, entrances: sv2.landmarksE.entrances, benches: sv2.landmarksE.benches }, landmarksF: { crowd: sv2.landmarksF.crowd, entrances: sv2.landmarksF.entrances, benchPoints: sv2.landmarksF.benchPoints, vorBenches: sv2.landmarksF.vorBenches, photoSpots: sv2.landmarksF.photoSpots, monuments: sv2.landmarksF.monuments }, landmarksG: { spots: sv2.landmarksG.spots }, landmarksH: { spots: sv2.landmarksH.spots, lamps: sv2.landmarksH.lamps, tower: sv2.landmarksH.tower }, landmarksI: { courtyard: sv2.landmarksI.courtyard }, landmarksJ: { crowd: sv2.landmarksJ.crowd, photoSpots: sv2.landmarksJ.photoSpots, monuments: sv2.landmarksJ.monuments }, metro: { entrances: sv2.metro.entrances, stations: sv2.metro.stations.map((s) => ({ id: s.id, name: s.name, frame: s.frame })) }, bridges: sv2.bridges.list, landmarks: { monuments: sv2.landmarks.monuments, photoSpots: sv2.landmarks.photoSpots }, quay: { stairs: sv2.environment.quay.allStairs, bridges: sv2.environment.quay.bridges, fallbackDecks: sv2.environment.quay.fallbackDecks } }; o.walk = ctx.physics.items.filter((it) => (it.type === 'walk' && it.top > 0.2 && it.top < 80 && it.y0 > -3) || it.type === 'ramp').map((it) => [it.type[0], +it.cx.toFixed(1), +it.cz.toFixed(1), +it.hw.toFixed(2), +it.hd.toFixed(2), +Math.atan2(it.s, it.c).toFixed(2), it.top !== undefined ? +it.top.toFixed(2) : +it.yA.toFixed(2) + '>' + +it.yB.toFixed(2), +it.y0.toFixed(1)]); fs.writeFileSync(args[args.indexOf('--dump') + 1], JSON.stringify(o)); }
  process.exit(0);
}
if (args.includes('--eval')) { const m = await import(pathToFileURL(path.resolve(String(flag('eval', '')))).href); await m.default(ctx, L, THREE); process.exit(0); }
if (args.includes('--items')) {                                  // list the colliders near x,z,r (debug aid)
  for (const grp of String(flag('items', '0,0,10')).split(';')) { const [ix, iz, ir] = grp.split(',').map(Number); console.log('== items near', ix, iz, ir);
  for (const it of ctx.physics.items) { const cx = it.cx, cz = it.cz; if (Math.hypot(cx - ix, cz - iz) > ir) continue; console.log(it.type, 'c', cx.toFixed(1), cz.toFixed(1), it.type === 'cyl' ? 'r' + it.r.toFixed(2) : 'hw' + (it.hw || 0).toFixed(2) + ' hd' + (it.hd || 0).toFixed(2) + ' rot' + Math.atan2(it.s || 0, it.c || 1).toFixed(2), 'y0', (it.y0 ?? 0).toFixed(2), 'y1', (it.y1 ?? it.top ?? it.yB ?? 0).toFixed(2), it.top !== undefined ? 'top' + it.top.toFixed(2) : ''); } }
  process.exit(0);
}
const P = ctx.services.people, sim = P.sim;
if (!sim) { console.log('RESULT: FAIL (no sim)'); process.exit(1); }
const N0 = sim.agents.length;
console.log('phases (ms since people start)', JSON.stringify(P.phases), 'heap MB', Math.round(process.memoryUsage().heapUsed / 1048576), 'nav cpu ms', JSON.stringify(P.nav && P.nav.ms));
console.log('people', N0, JSON.stringify(P.plan), 'triangles', P.triangles, 'drawCalls', P.drawCalls, 'nav', JSON.stringify(P.nav));
// ---------------------------------------------------------------- run
const st = ctx.services.streets;
let fails = 0; const fail = (m) => { fails++; if (fails < 40) console.log('FAIL:', m); };
sim.debugNaN = (a, t, ph) => { console.log('DEBUG NaN agent', a.i, a.scene, a.kind, 't', t.toFixed(2), 'goal', a.goal && a.goal.type, 'prev', a.px, a.pz, 'speed', a.speed, 'rt', a.rt && [a.rt.seg, a.rt.n, a.rt.x[a.rt.seg], a.rt.z[a.rt.seg]], 'vpref', a.vpref, 'r', a.r, 'lane', a.lane, 'crossIdx', a.crossIdx, 'ps', a.ps, 'hidden', a.hidden, 'comp', a.comp, 'dist', a.dist); };
const upd = ctx._updates;
const viol = { building: 0, road: 0, nan: 0, jump: 0, turn: 0, signal: 0, hiddenMax: 0, step: 0, water: 0, deep: 0, low: 0 };
/** a scripted person off street level (the roof walk, a descent landing): really on a walk surface at its own height? */
const lowOK = (a) => { const yy = a.kind === 'sit' ? a.y + 0.45 : a.y, h = ctx.physics.groundHeight(a.x, a.z, yy + 0.5, false); return Number.isFinite(h) && Math.abs(h - yy) < 0.3; };       // (a sitter on the edge of a landing: the seat is the surface)
const first = {}; const prev = sim.agents.map((a) => ({ x: a.x, z: a.z, yaw: a.yaw, dyaw: 0, kind: a.kind, hidden: a.hidden, seat: !!a.seat, cross: a.crossIdx, rec: (a.recycled | 0) + (a.leader ? (a.leader.recycled | 0) : 0) }));
const startPos = sim.agents.map((a) => ({ x: a.x, z: a.z })); const progress = sim.agents.map(() => ({ x: 0, z: 0, d: 0, kind: '' }));
let playerMin = 9, playerNear = 0;
let t = 0, steps = Math.round(MIN * 60 / 0.1); const dt = 0.1; const stats = { crossStart: 0, crossStartBad: 0, waits: 0, waitTime: 0, sits: 0, doors: 0, cars: 0 };
const waitStart = new Map();
const t0w = Date.now(); let densAcc = { square: 0, lenina: 0, n: 0, play: 0 };
const REGIONS = [['Kazan garden r30', -1469, -285, 30], ['Kazan colonnade r35', -1500, -235, 35], ['Kazan bridge r25', -1391, -331, 25], ['Palace Sq field r90', -2010, -740, 90], ['Winter Palace courtyard r45', -2097, -893, 45], ['Admiralty garden r60', -2440, -740, 60], ['Alexander Garden fountain r40', -2335, -494, 40], ['Isaac square r60', -2449, -63, 60], ['Catherine garden r50', -805, -86, 50], ['Gostiny arcade+promenade r60', -1100, -230, 60], ['Moika Green Bridge r25', -1768, -420, 25], ['Station square r70', 592, 165, 70],
  ['Peter I monument r35', -712, -757, 35], ['Castle forecourt r40', -740, -830, 40]];
let tourLeg = -1, legN = 0, legAcc = null; const legs = [];
const gTest = sim.nav.passageTests && sim.nav.passageTests['gostiny-gallery'], cTest = sim.nav.passageTests && sim.nav.passageTests['kazan-colonnade']; let galN = 0, colN = 0; const metroFlow = {}; let ugN = 0; const bhist = {}; const secPrev = []; const regAcc = REGIONS.map(() => 0); let regN = 0;
const sampleOn = ctx.services.bridges && ctx.services.bridges.deckY;
const PB = (sim.nav.longs || []).find((q) => q.id === 'palace') || null;           // the Palace Bridge (nav.longs): who stands / walks on its deck (counted every second; the carriageway between the pavement bands is a violation)
const pb = { n: 0, steps: 0, max: 0, seen: new Set(), scenes: {}, bins: new Array(8).fill(0), carriage: 0, outside: 0, yMin: 9, yMax: -9, jumps: 0, jumpF: 0, jumpT: new Array(10).fill(0) };
const onPB = (x, z, m = 0.5) => { if (!PB) return false; const dx = x - PB.ax, dz = z - PB.az, u = dx * PB.ux + dz * PB.uz, v = -dx * PB.uz + dz * PB.ux; return u > -2 && u < PB.len + 2 && Math.abs(v) <= PB.hw + m; };
const nearSq = (x, z) => Math.hypot(x - 592, z - 165) < 70, lenina = (x, z) => { const g = L.toGrid(x, z); return g.u > -400 && g.u < 0 && P.nav && sim.nav.zones.dNev(x, z) < 25; };
for (let i = 1; i <= steps; i++) {
  t = i * dt; ctx.time = t; ctx.shared.uTime.value = t;
  if (TOUR && TOUR.length) { const leg = Math.min(TOUR.length - 1, Math.floor((i - 1) / steps * TOUR.length)); if (leg !== tourLeg) { tourLeg = leg; PLX = AT[TOUR[leg]]; legN = 0; legAcc = REGIONS.map(() => 0); legs.push({ name: TOUR[leg], acc: legAcc, n: 0, t0: Date.now(), near: 0 }); } }
  if (PLX) { ctx.player.position.set(PLX[0], 0, PLX[1]); camera.position.set(PLX[0], 1.7, PLX[1]); camera.updateMatrixWorld(true); }
  { const w0 = performance.now(); for (const f of upd) f(dt, t); if (legs.length) { const lg0 = legs[legs.length - 1]; lg0.wall = (lg0.wall || 0) + performance.now() - w0; lg0.ns = (lg0.ns || 0) + 1; } }          // (the wall time of the update callbacks per leg)
  if (TRACE >= 0 && t >= T0 && t <= T1) { const a = sim.agents[TRACE]; console.log(t.toFixed(1), a.kind, 'pos', a.x.toFixed(2), a.z.toFixed(2), 'cov', sim.nav.cover(a.x, a.z).toFixed(2), 'sp', a.speed.toFixed(2), 'cross', a.crossIdx, 'waitCw', a.waitCw, 'seg', a.rt && a.rt.seg + '/' + a.rt.n, 'stuck', a.stuck, 'goal', a.goal && a.goal.type, 'scene', a.scene); }
  sim.agents.forEach((a, k) => {
    const p = prev[k];
    if (!Number.isFinite(a.x) || !Number.isFinite(a.z) || !Number.isFinite(a.yaw) || !Number.isFinite(a.speed)) { viol.nan++; if (viol.nan < 6) console.log(`  NaN agent ${k} scene=${a.scene} kind=${a.kind} t=${t.toFixed(1)} x=${a.x} z=${a.z} yaw=${a.yaw} speed=${a.speed} leader=${!!a.leader} goal=${a.goal && a.goal.type}`); return; }
    if (!a.hidden && !p.hidden) {
      const d = Math.hypot(a.x - p.x, a.z - p.z), kindChange = a.kind !== p.kind || (!!a.seat !== p.seat) || ((a.recycled | 0) + (a.leader ? (a.leader.recycled | 0) : 0)) !== p.rec || sim.mass > 0 || a.kind === 'approach' || p.kind === 'approach';
      if (d > 0.8 && !kindChange) { viol.jump++; if (onPB(a.x, a.z, 3)) { pb.jumps++; if (a.leader) pb.jumpF++; pb.jumpT[Math.min(9, Math.floor(t / (MIN * 6)))]++; if (pb.jumps < 5) console.log(`  jump ON THE PALACE BRIDGE ${d.toFixed(2)} m agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) t=${t.toFixed(1)} scene=${a.scene} leader=${!!a.leader}`); } if (viol.jump < 8) console.log(`  jump ${d.toFixed(2)} m agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) t=${t.toFixed(1)} scene=${a.scene}`); }
      let dy = a.yaw - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      if (Math.abs(dy) > 0.9 && !kindChange && d < 0.8) { viol.turn++; if (viol.turn < 6) console.log(`  turn ${dy.toFixed(2)} agent ${k} ${a.kind} t=${t.toFixed(1)}`); }
      p.dyaw = dy;
    }
    // crossing starts: must be on 'walk' (signalised) / free
    if (a.crossIdx >= 0 && p.cross < 0 && !a.leader) {
      stats.crossStart++; const c = sim.nav.crosswalks[a.crossIdx], ps = st.pedState(c.id, t);
      if (ps !== 'walk' && ps !== 'free') { viol.signal++; stats.crossStartBad++; if (viol.signal < 6) console.log(`  entered zebra ${c.id} on '${ps}' t=${t.toFixed(1)}`); }
    }
    if (a.kind === 'wait' && p.kind !== 'wait') { waitStart.set(k, t); }
    if (a.kind !== 'wait' && p.kind === 'wait' && waitStart.has(k)) { stats.waits++; stats.waitTime += t - waitStart.get(k); waitStart.delete(k); }
    if (a.kind === 'sit' && p.kind !== 'sit') stats.sits++;
    if (a.hidden && !p.hidden) stats.doors++;
    if (a.hidden !== p.hidden && !a.ug) { for (const e of sim.nav.metroDoors || []) if (Math.hypot(e.x - a.x, e.z - a.z) < 4) { const kk = e.metro.id + (a.hidden ? ' in' : ' out'); metroFlow[kk] = (metroFlow[kk] || 0) + 1; break; } }
    p.x = a.x; p.z = a.z; p.yaw = a.yaw; p.kind = a.kind; p.hidden = a.hidden; p.seat = !!a.seat; p.cross = a.crossIdx; p.rec = (a.recycled | 0) + (a.leader ? (a.leader.recycled | 0) : 0);
  });
  if (PLX) for (const a of sim.agents) if (!a.hidden) { const d = Math.hypot(a.x - PLX[0], a.z - PLX[1]); if (d < playerMin) playerMin = d; if (d < 1.2) playerNear++; }
  if (i % 10 === 0) {                                              // once per second: containment, density
    let hid = 0, n = 0, sq = 0, ln = 0, pl = 0, pbNow = 0;
    sim.agents.forEach((a, k) => {
      if (a.hidden) { hid++; return; }
      if (a.ug) { ugN++; if (!(a.y < -10 && a.y > -100) || !Number.isFinite(a.x)) viol.ugbad = (viol.ugbad || 0) + 1; return; }
      n++;
      if (a.low) { if (!lowOK(a)) { viol.low++; if (viol.low < 8) console.log(`  off-level person not on its surface: agent ${k} y=${a.y.toFixed(2)} (${a.x.toFixed(1)},${a.z.toFixed(1)}) scene=${a.scene}`); } for (let q = 0; q < REGIONS.length; q++) if (Math.hypot(a.x - REGIONS[q][1], a.z - REGIONS[q][2]) < REGIONS[q][3]) regAcc[q]++; return; }
      if (L.insideBuilding(a.x, a.z, 0) && !(sim.nav.inHall && sim.nav.inHall(a.x, a.z, 0.3)) && !(sim.nav.inPassage && sim.nav.inPassage(a.x, a.z))) { viol.building++; { const kk = a.scene + '@' + Math.round(a.x / 20) * 20 + ',' + Math.round(a.z / 20) * 20; bhist[kk] = (bhist[kk] || 0) + 1; } if (viol.building < 6) console.log(`  inside building agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) t=${t.toFixed(0)} scene=${a.scene} goal=${a.goal && a.goal.type} rec=${a.recycled | 0} leader=${!!a.leader} lead.kind=${a.leader && a.leader.kind} prevSec=${secPrev[k] ? secPrev[k].x.toFixed(1) + ',' + secPrev[k].z.toFixed(1) + ' ' + secPrev[k].kind : '-'}`); }
      secPrev[k] = { x: a.x, z: a.z, kind: a.kind };
      const cov = sim.nav.cover(a.x, a.z);
      for (let q = 0; q < REGIONS.length; q++) if (Math.hypot(a.x - REGIONS[q][1], a.z - REGIONS[q][2]) < REGIONS[q][3]) { regAcc[q]++; if (legAcc) legAcc[q]++; }
      if (legs.length && PLX && Math.hypot(a.x - PLX[0], a.z - PLX[1]) < 100) legs[legs.length - 1].near++;
      if (gTest && gTest(a.x, a.z)) galN++; if (cTest && cTest(a.x, a.z)) colN++;
      if (a.y > -1 && !(sim.nav.inHall && sim.nav.inHall(a.x, a.z, 0.3)) && a.scene !== 'passenger' && !String(a.scene).startsWith('hall') && a.kind !== 'sit') {
        const dk = sampleOn ? sampleOn(a.x, a.z) : null, gh = ctx.physics.groundHeight(a.x, a.z, 1.0, false);
        if (dk == null && !(sim.nav.onDeck && sim.nav.onDeck(a.x, a.z, 0)) && !(sim.nav.inPassage && sim.nav.inPassage(a.x, a.z)) && !(sim.nav.inColonnade && sim.nav.inColonnade(a.x, a.z, 41.5, 58.5)) && a.x < 400 && Number.isFinite(gh) && gh > 0.4) { viol.step++; if (viol.step < 10) console.log(`  on a step / raised walk box ${gh.toFixed(2)} agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) scene=${a.scene}`); }
        if (dk == null && !(sim.nav.onDeck && sim.nav.onDeck(a.x, a.z, 0)) && !(Number.isFinite(gh) && gh > 0.02 && gh < 1.2) && ctx.services.environment.waterAt && ctx.services.environment.waterAt(a.x, a.z)) { viol.water++; if (viol.water < 10) { const nn = sim.nav.nearestNode(a.x, a.z, 8); console.log(`  on water agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) scene=${a.scene} home=${a.home} nearest node ${nn} kind=${nn >= 0 ? sim.nav.N.k[nn] : '-'} at ${nn >= 0 ? sim.nav.N.x[nn].toFixed(1) + ',' + sim.nav.N.z[nn].toFixed(1) + ' y=' + sim.nav.N.y[nn].toFixed(2) + ' longK=' + sim.nav.longK.has(nn) + ' deep=' + sim.nav.deepAt(sim.nav.N.x[nn], sim.nav.N.z[nn]) : '-'} gh=${ctx.physics.groundHeight(a.x, a.z, 1.0, false)}`); } }
        if (Number.isFinite(gh) && gh < -0.6 && a.x < 400 && dk == null && !(sim.nav.onDeck && sim.nav.onDeck(a.x, a.z, 0.3))) { viol.deep++; if (viol.deep < 10) console.log(`  below street level ${gh.toFixed(2)} agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) scene=${a.scene}`); }
      }
      if (cov > 0.06 && a.y < 0.7 && /* a platform / deck above a road is no carriageway */ sim.nav.crosswalkAt(a.x, a.z, 0.8) < 0) { viol.road++; if (viol.road < 8) console.log(`  on carriageway agent ${k} ${a.kind} cover ${cov.toFixed(2)} (${a.x.toFixed(1)},${a.z.toFixed(1)}) t=${t.toFixed(0)} scene=${a.scene} cross=${a.crossIdx} inAsph=${a.inAsph} leader=${!!a.leader} rt=${a.rt ? a.rt.x[a.rt.seg].toFixed(1) + ',' + a.rt.z[a.rt.seg].toFixed(1) + '>' + a.rt.x[Math.min(a.rt.seg + 1, a.rt.n - 1)].toFixed(1) + ',' + a.rt.z[Math.min(a.rt.seg + 1, a.rt.n - 1)].toFixed(1) : '-'}`); }
      if (PB) { const dx = a.x - PB.ax, dz = a.z - PB.az, u = dx * PB.ux + dz * PB.uz, v = -dx * PB.uz + dz * PB.ux; if (u > -2 && u < PB.len + 2 && Math.abs(v) <= PB.hw + 0.5) { pbNow++; pb.seen.add(k); pb.scenes[a.scene] = (pb.scenes[a.scene] || 0) + 1; pb.bins[Math.max(0, Math.min(7, Math.floor(u / 25)))]++; pb.yMin = Math.min(pb.yMin, a.y); pb.yMax = Math.max(pb.yMax, a.y); if (Math.abs(v) < PB.v0 - 0.3 && sim.nav.crosswalkAt(a.x, a.z, 0.8) < 0) pb.carriage++; if (!L.inPlay(a.x, a.z, -1.5)) pb.outside++; } }
      if (nearSq(a.x, a.z)) sq++; if (lenina(a.x, a.z)) ln++; if (L.areaAt && a.x > L.WORLD.play.x0 && a.x < L.WORLD.play.x1 && a.z > L.WORLD.play.z0 && a.z < L.WORLD.play.z1) pl++;
    });
    pb.n += pbNow; pb.steps++; pb.max = Math.max(pb.max, pbNow);
    regN++; if (legs.length) legs[legs.length - 1].n++;
    viol.hiddenMax = Math.max(viol.hiddenMax, hid); densAcc.square += sq; densAcc.lenina += ln; densAcc.play += pl; densAcc.n++;
    if (sim.agents.length !== N0) fail('head count changed');
    if (i % 600 === 0) sim.agents.forEach((a, k) => { const pr = progress[k]; if (Math.hypot(a.x - pr.x, a.z - pr.z) > 3 || a.kind !== 'walk' && a.kind !== 'wait') pr.d = 0; else pr.d += 1; pr.x = a.x; pr.z = a.z; });
  }
}
const stuck = progress.filter((p, k) => p.d >= 3 && sim.agents[k].kind === 'walk').length;
const wallMs = Date.now() - t0w;
console.log(`simulated ${MIN} min in ${(wallMs / 1000).toFixed(1)} s (${(wallMs / steps).toFixed(2)} ms per 0.1 s step incl. render)`);
progress.forEach((p, k) => { const a = sim.agents[k]; if (p.d >= 3 && a.kind === 'walk') console.log('  stuck', k, a.scene, '(' + a.x.toFixed(1) + ',' + a.z.toFixed(1) + ')', 'goal', a.goal && a.goal.type, 'seg', a.rt && a.rt.seg + '/' + a.rt.n, 'leader', !!a.leader, 'cov', sim.nav.cover(a.x, a.z).toFixed(1), 'obstDist', sim.nav.obstDist(a.x, a.z, 3).toFixed(2), 'sideT', a.sideT.toFixed(1), 'blk', a.blk, 'rt', a.rt ? [a.rt.x[a.rt.seg].toFixed(1), a.rt.z[a.rt.seg].toFixed(1), a.rt.x[Math.min(a.rt.seg + 1, a.rt.n - 1)].toFixed(1), a.rt.z[Math.min(a.rt.seg + 1, a.rt.n - 1)].toFixed(1)].join(',') : '-'); if (p.d >= 3 && a.kind === 'walk' && process.argv.includes('--items')) { const items = ctx.physics.items.filter((it) => { if (it.type === 'cyl') return Math.hypot(it.cx - a.x, it.cz - a.z) < it.r + 1.2; if (it.type === 'box' || it.type === 'walk') { const dx = a.x - it.cx, dz = a.z - it.cz, lx = dx * it.c - dz * it.s, lz = dx * it.s + dz * it.c; return Math.abs(lx) < it.hw + 1.2 && Math.abs(lz) < it.hd + 1.2; } return false; }); console.log('     items', items.map((it) => it.type + ' c(' + it.cx.toFixed(1) + ',' + it.cz.toFixed(1) + ') ' + (it.type === 'cyl' ? 'r' + it.r.toFixed(2) : 'hw' + it.hw.toFixed(2) + ' hd' + it.hd.toFixed(2) + ' y' + (it.y0 ?? it.top))).join(' | ')); } });
if (args.includes('--night')) console.log('night: hidden at the end', sim.agents.filter((a) => a.hidden).length, 'of', N0);
if (PLX) { console.log('player at', PLX.join(','), 'closest approach', playerMin.toFixed(2), 'm; agent-steps within 1.2 m', playerNear); if (playerMin < 0.4 && !TOUR) fail('somebody walked into the player (' + playerMin.toFixed(2) + ' m)'); }
if (viol.building) console.log('building violations by scene@cell:', Object.entries(bhist).sort((p, q) => q[1] - p[1]).slice(0, 14).map((e) => e.join('=')).join(' | '));
if (PB) { console.log(`Palace Bridge deck (u -2 .. ${PB.len.toFixed(0)} m, |v| <= ${PB.hw}): mean ${(pb.n / Math.max(1, pb.steps)).toFixed(1)} people, max ${pb.max}, distinct ${pb.seen.size}; per 25 m of u (samples) ${pb.bins.join(' ')}; position jumps on it ${pb.jumps} (${pb.jumpF} of followers; per tenth of the run ${pb.jumpT.join(' ')}), on the carriageway ${pb.carriage}, outside the play area ${pb.outside}; y ${pb.yMin.toFixed(2)} .. ${pb.yMax.toFixed(2)}; by scene ${JSON.stringify(pb.scenes)}`); if (pb.carriage) fail(pb.carriage + ' samples on the Palace Bridge carriageway'); if (pb.outside) fail(pb.outside + ' samples beyond the play border on the Palace Bridge'); }
console.log('metro platform people (underground, mean visible):', ugN / Math.max(1, regN));
console.log('violations', JSON.stringify(viol), 'stuck walkers (no 3 m in 3 min):', stuck);
console.log('mean people: visible in play area', (densAcc.play / densAcc.n).toFixed(0), 'within 70 m of the obelisk', (densAcc.square / densAcc.n).toFixed(0), 'on Nevsky Mayakovskaya - Vosstaniya (400 m x both pavements)', (densAcc.lenina / densAcc.n).toFixed(0), '= per 10 m of pavement', (densAcc.lenina / densAcc.n / 80).toFixed(1));
console.log('people inside the Gostiny arcade (mean)', (galN / Math.max(1, regN)).toFixed(1), '| under the Kazan colonnade (mean)', (colN / Math.max(1, regN)).toFixed(1));
console.log('metro door flows (people entering / leaving, whole run):', JSON.stringify(Object.fromEntries(Object.entries(metroFlow).sort((p2, q) => p2[0] < q[0] ? -1 : 1))));
console.log('crossings started', stats.crossStart, 'bad starts', stats.crossStartBad, 'waits', stats.waits, 'mean wait', stats.waits ? (stats.waitTime / stats.waits).toFixed(1) + ' s' : '-', 'sit-downs', stats.sits, 'building / bus entries', stats.doors);
if (sim.marsCount) { const mz = sim.nav.marsCfg.zones.map((z, k) => z.name + ' ' + sim.marsCount[k] + '/' + z.maxPeople); console.log('mars zones (visible at the end / cap):', mz.join(' | ')); const byScene = {}; for (const a of sim.agents) { if (a.hidden) continue; const k = sim.nav.marsZone(a.x, a.z); if (k >= 0) { const key = sim.nav.marsCfg.zones[k].name + ':' + (a.noMass ? 'script' : 'walker'); byScene[key] = (byScene[key] || 0) + 1; } } console.log('  by kind', JSON.stringify(byScene)); }
for (const lg of legs) console.log(`leg ${lg.name}: update callbacks ${((lg.wall || 0) / Math.max(1, lg.ns || 1)).toFixed(2)} ms per 0.1 s step over ${lg.ns || 0} steps; mean people within 100 m of the player ${(lg.near / Math.max(1, lg.n)).toFixed(0)}; regions within 400 m: ` + REGIONS.map((r, q) => [r, lg.acc[q] / Math.max(1, lg.n)]).filter(([r]) => Math.hypot(r[1] - AT[lg.name][0], r[2] - AT[lg.name][1]) < 400).map(([r, v]) => r[0] + ' ' + v.toFixed(0)).join(' | '));
console.log('people per region (mean visible):', REGIONS.map((r, q) => r[0] + ' ' + (regAcc[q] / Math.max(1, regN)).toFixed(0)).join(' | '));
if (viol.nan) fail('NaN');
if (viol.building > Math.max(5, N0 * MIN * 60 * 1e-5)) fail(`${viol.building} samples inside a building`);
if (viol.step > N0 * MIN * 60 * 0.001) fail(`${viol.step} samples on steps / raised walk boxes`);
if (viol.water) fail(`${viol.water} samples on water`);
if (viol.deep) fail(`${viol.deep} samples below street level`);
if (viol.low) fail(`${viol.low} samples of off-level people without a surface`);
if (viol.road > N0 * MIN * 60 * 0.002) fail(`${viol.road} samples on a carriageway outside a zebra`);
if (viol.signal > Math.max(3, stats.crossStart * 0.003)) fail(`${viol.signal} zebra entries on a red pedestrian head`);
if (viol.jump > N0 * MIN * 0.05) fail(`${viol.jump} position jumps > 0.8 m`);
if (viol.turn > N0 * MIN * 0.05) fail(`${viol.turn} turns > 0.9 rad per step`);
if (viol.hiddenMax > N0 * (args.includes('--night') ? 0.95 : 0.45)) fail(`${viol.hiddenMax} hidden at once`);
if (stuck > N0 * 0.12) fail(`${stuck} stuck walkers`);
console.log(fails ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(fails ? 1 : 0);
