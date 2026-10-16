// Headless behaviour test of the people module (no GPU). Builds environment, streets, city, rail, landmarks, metro, props / traffic (when they build) and people in node, then
//   node tools/people-test.mjs [--minutes 10] [--night] [--q high|medium|low] [--at name | --player x,z] (names: kazan palace ... flame field garden krylov peter swan suvorov castle palace marble embankment)
//   Petrograd side / Spit (people/petro.js): --at spit rostral beach cathedral petrovsky trinity palacebridge birzhevoy tuchkov aurora cabin troitskaya mosque gorkovskaya alexpark zoo kamenno austrian tolstoy
//   bolshoy vladimir kunstkamera university; --tour a,b,c visits several places in ONE build (equal shares of --minutes, per-leg head counts); --petrooff = the population without the new reach (A / B);
//   --mods a,b,c builds only these modules (quick probes with --eval tools/people-petro-probe.mjs). Extra asserts there: everybody on a long bridge stands at deck height on the pavement band
//   (services.bridges.deckY), people off street level (roof walk, descent landings) stand on a real walk surface.
//   (the old header line follows)
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

if (process.argv.includes('--swoff')) globalThis.__swOff = true;                 // Mars Field work only (no south-west)
if (process.argv.includes('--petrooff')) globalThis.__petroOff = true;                 // the population without the Petrograd side / the Spit (A / B)
if (process.argv.includes('--marsoff')) globalThis.__marsOff = true;                 // the population without the Mars Field / Summer Garden / castle work (A / B)
if (process.argv.includes('--isloff')) globalThis.__islOff = true;                   // the population without the islands of round 2 (Yelagin, Kamenny, Aptekarsky, Petrovsky; A / B)
if (process.argv.includes('--vooff')) globalThis.__voOff = true;                     // the population without Vasilievsky Island (the old reach: A / B; --voff = also without the island modules)
const THREE = await import('three');
const { createContext } = await import(pathToFileURL(path.join(root, 'src/core/ctx.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? Number(args[i + 1]) || args[i + 1] : true); };
const AT = { kazan: [-1469, -300], palace: [-2010, -770], gostiny: [-1100, -240], admiralty: [-2440, -740], isaac: [-2449, -90], catherine: [-805, -86], alexander: [-2335, -500], hermitage: [-2097, -893], kazanbridge: [-1391, -331], square: [-2000, -690], nevsky: [-1650, -400], station: [592, 165], moika: [-1768, -420], gdarcade: [-1060, -215], horseman: [-2745, -420], admmetro: [-2030, -420], gdmetro: [-985, -192], nevskymetro: [-1360, -340],
  flame: [-1086, -1243], field: [-1190, -1330], garden: [-963, -1626], krylov: [-909, -1537], peter: [-712, -757], swan: [-1069, -1611], suvorov: [-1197, -1502], castle: [-740, -830], palace: [-849, -1640], marble: [-1330, -1450], embankment: [-1000, -1650],
  // the Petrograd side / the Spit (people/petro.js)
  spit: [-2470, -1318], rostral: [-2480, -1215], beach: [-2030, -1738], cathedral: [-1995, -1955], petrovsky: [-1712, -2058], trinity: [-1330, -1820], palacebridge: [-2415, -977], birzhevoy: [-2679, -1545], tuchkov: [-3677, -1842],
  aurora: [-772, -2512], cabin: [-1122, -2270], troitskaya: [-1443, -2296], mosque: [-1566, -2548], gorkovskaya: [-1815, -2680], alexpark: [-1900, -2560], zoo: [-2371, -2362], kamenno: [-1838, -2905], austrian: [-1906, -3064],
  karpovka: [-2700, -4020], chkalovsky: [-3181, -3410], zelenina: [-3258, -3169], levashovsky: [-2710, -3838],
  tolstoy: [-2196, -3712], bolshoy: [-2962, -2795], vladimir: [-3185, -2158], kunstkamera: [-2593, -995], university: [-2880, -1020],
  mariinsky: [-3040, 745], glinka: [-2975, 780], yusupov: [-2950, 335], nh: [-3440, 290], nhpier: [-3398, 350], nikolsky: [-2900, 1115], kryukov: [-3000, 930], sennaya: [-1746, 718],
  // Vasilievsky Island (people/vo.js)
  academy: [-3395, -535], sphinxes: [-3379, -508], menshikov: [-3090, -700], rumyantsev: [-3260, -630], mining: [-4562, 362], krasin: [-4606, 495], ltschmidt: [-4000, -240], andrew: [-3800, -820], market: [-3708, -671], vasil: [-4080, -1145], boulevard: [-3990, -1020],
  sredny: [-4125, -1125], sportivnaya2: [-3765, -1690], gorny: [-5040, 0], tram: [-5020, -690], kirova: [-5430, -110], erarta: [-5590, 25], xenia: [-5586, -1330], smolensky: [-5600, -1510], sevkabel: [-6232, 912], seaterminal: [-6495, 640], pribaltiyskaya: [-7560, -760],
  gavan: [-6968, 20], blag: [-3440, -265], pavilion: [-4072, -1141], catherine: [-3690, -1545],
  // the islands of round 2 (people/isl2.js)
  yspit: [-6405, -5309], ypalace: [-4570, -5226], ykitchen: [-4625, -5262], ystable: [-4818, -5268], yrossi: [-4362, -5378], ytheatre: [-5233, -5343], yboats: [-5537, -5384], yhercules: [-5545, -5120], ybeach: [-5921, -5211], yzoo: [-5890, -5325], ykirov: [-5214, -4909], ymeadow: [-4625, -5226], ymiddle: [-5400, -5200],
  kavenue: [-2880, -5338], kchurch: [-2861, -5413], ktheatre: [-4250, -4942], kolympic: [-2925, -5425], apalm: [-1503, -4160], agarden: [-1560, -4250], ainstitute: [-1757, -4055], aleti: [-1560, -4395], ppark: [-4200, -2680], pbetancourt: [-4758, -2866], psavina: [-5398, -3379], kstadium: [-7165, -4519], ksphinx: [-2964, -5040], atransfig: [-1466, -4534], atower: [-1680, -4900], pwest: [-5343, -3256], pzhdanovka: [-3550, -2370], aletic1: [-1770, -4281] };
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
const wanted = ['environment', 'streets', 'city', 'rail', 'landmarksA', 'landmarksB', 'landmarksC', 'landmarksD', 'landmarksE', 'landmarksF', 'landmarksG', 'landmarksH', 'landmarksI', 'landmarksJ', 'landmarksK', 'landmarksMars', 'landmarksGarden', 'landmarksCastle', 'landmarksNikolsky', 'landmarksMariinsky', 'landmarksNewHolland', 'landmarksYusupov',
  'landmarksFortress', 'landmarksStrelka', 'landmarksUniversity', 'landmarksTroitskaya', 'landmarksAurora', 'landmarksKronverk', 'landmarksKamennoostrovsky', 'landmarksVladimir', 'landmarksKarpovka',
  // Vasilievsky Island (page order of main.js MODULES; --voff builds the old list without them)
  'landmarksOktyabrsky', 'landmarksModernVO', 'landmarksMarineFacade', 'landmarksPribaltiyskaya', 'landmarksGavan', 'landmarksSredny', 'landmarksMakarova', 'landmarksKirova', 'landmarksSevkabel', 'landmarksSeaTerminal', 'landmarksSmolensky', 'landmarksNavalCorps', 'landmarksAndrew', 'landmarksMining', 'landmarksMenshikov', 'landmarksAcademy',
  // the islands of round 2 (Krestovsky, Yelagin, Kamenny, Aptekarsky, Petrovsky; people/isl2.js): --noisl2 builds without them
  ...(process.argv.includes('--noisl2') ? [] : ['landmarksKrestovsky', 'landmarksYelaginPalace', 'landmarksYelaginKitchen', 'landmarksYelaginServices', 'landmarksYelaginRossi', 'landmarksYelaginSpits', 'landmarksYelaginPark', 'landmarksKamennyPalace', 'landmarksKamennyChurch',
    'landmarksBotanicalGreenhouses', 'landmarksBotanicalGarden', 'landmarksPetrovskyStadium', 'landmarksPetrovskyYacht',
    'landmarksKamennyTheatre', 'landmarksKamennyDachasEast', 'landmarksKamennyDachasWest', 'landmarksTVTower', 'landmarksLETI', 'landmarksTransfiguration', 'landmarksPetrovskyWest', 'landmarksZhdanovka']),
  'bridges', 'metro', 'props', 'traffic', 'people'];
if (process.argv.includes('--voff')) for (let i = wanted.length - 1; i >= 0; i--) if (/^landmarks(Oktyabrsky|ModernVO|MarineFacade|Pribaltiyskaya|Gavan|Sredny|Makarova|Kirova|Sevkabel|SeaTerminal|Smolensky|NavalCorps|Andrew|Mining|Menshikov|Academy)$/.test(wanted[i])) wanted.splice(i, 1);
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
// ---------------------------------------------------------------- Vasilievsky Island: static checks (people/voarea.js, vo.js)
const VOON = !!(sim.nav.area && sim.nav.area.petro && sim.nav.area.petro.voZone0 >= 0);
const SM = ctx.services.landmarksSmolensky || {}, alleys = (SM.paths || []).filter((p) => p.pts && p.pts.length > 1);
const onAlley = (x, z) => { for (const p of alleys) { const hw = (p.w || 3) / 2 + 1.7; for (let i = 0; i + 1 < p.pts.length; i++) { const a = p.pts[i], b = p.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) <= hw) return true; } } for (const c of SM.crowd || []) if (Math.hypot(x - c.x, z - c.z) < (c.r || 5) + 2.5) return true; return false; };
let isleFails = 0;
if (VOON) {
  const nv = sim.nav, got = new Set((nv.metroDoors || []).map((e) => e.metro.id)), want = ['vasileostrovskaya-in', 'vasileostrovskaya-out', 'gorny-in', 'gorny-out', 'sportivnaya2-6', 'sportivnaya2-7'];
  const miss = want.filter((w) => !got.has(w)); console.log('ISLAND metro doors attached:', want.map((w) => w + (got.has(w) ? ' ok' : ' MISSING')).join(' | ')); if (miss.length) { isleFails++; console.log('FAIL: island metro doors without a routing node: ' + miss.join(',')); }
  const fp = nv.foyer || [0, 0, 0, 0, 0, 0, 0, 0], fcx = (fp[0] + fp[2] + fp[4] + fp[6]) / 4, fcz = (fp[1] + fp[3] + fp[5] + fp[7]) / 4, fo = [[771, -355.9], [fcx, fcz], [(fp[0] + fcx) / 2, (fp[1] + fcz) / 2], [(fp[4] + fcx) / 2, (fp[5] + fcz) / 2]], fw = nv.foyer ? fo.filter(([x, z]) => nv.walkable(x, z)) : []; console.log('ISLAND-adjacent: Oktyabrsky foyer points walkable for the routing (expected 0 of ' + fo.length + '):', fw.length); if (fw.length) { isleFails++; console.log('FAIL: pedestrians may path into the Oktyabrsky foyer'); }
  const cs = nv.stats.cemeteryMasked; let cemNodes = 0, cemLat = 0; for (let i = 0; i < nv.N.x.length; i++) if (nv.inCemetery(nv.N.x[i], nv.N.z[i])) { cemNodes++; if (nv.N.k[i] === 'a' && !onAlley(nv.N.x[i], nv.N.z[i])) cemLat++; }
  console.log('ISLAND cemetery: colliders masked out of the nav ' + cs + ', obstacles in the nav ' + nv.obstacles + ', routing nodes inside ' + cemNodes + ' (lattice nodes off the alleys: ' + cemLat + ')'); if (cemLat > 0) { isleFails++; console.log('FAIL: lattice nodes between the graves'); }
  let clN = 0; for (let i = 0; i < nv.N.x.length; i++) if (nv.N.k[i] === 'a' && nv.area.closed(nv.N.x[i], nv.N.z[i])) clN++; console.log('ISLAND closed territory: lattice nodes inside ' + clN); if (clN) { isleFails++; console.log('FAIL: lattice nodes in closed territory'); }
  { const { WHSD } = await import(pathToFileURL(path.join(root, 'src/world/bridges/sites-vo2.js')).href), sg = []; for (const k of ['W', 'E']) { const q = WHSD.lines[k]; for (let i = 0; i + 1 < q.length; i++) sg.push([q[i], q[i + 1]]); }       // the WHSD viaduct is no walking surface: no routing node may stand at deck height inside its footprint (surfaceY lifted the pavements that pass under it)
    let up = 0, ex = null; for (let i = 0; i < nv.N.x.length; i++) { const x = nv.N.x[i], z = nv.N.z[i]; if (x > -7700 || x < -8500 || nv.N.y[i] < 1.2) continue; for (const [a, b] of sg) { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < WHSD.hw + 0.4) { up++; ex = ex || [x.toFixed(0), z.toFixed(0), nv.N.y[i].toFixed(1)]; break; } } }
    console.log('ISLAND WHSD viaduct: routing nodes lifted onto the viaduct ' + up + (ex ? ' (first ' + ex.join(',') + ')' : '')); if (up) { isleFails++; console.log('FAIL: routing nodes on the WHSD viaduct'); } }
  { // the gates of the island sights (services .gates: x, z, open): a graph edge that passes through a CLOSED gate is a leak; an open gate should have at least one edge through it
    const gates = []; for (const k of ['landmarksAcademy', 'landmarksMenshikov', 'landmarksSmolensky', 'landmarksGavan', 'landmarksKirova', 'landmarksSevkabel', 'landmarksSeaTerminal', 'landmarksMakarova', 'landmarksAndrew', 'landmarksMining', 'landmarksSredny', 'landmarksPribaltiyskaya']) for (const g of (ctx.services[k] && ctx.services[k].gates) || []) if (Number.isFinite(g.x) && typeof g.open === 'boolean') gates.push({ k, id: g.id, x: g.x, z: g.z, open: g.open, n: 0 });
    for (const e of nv.E) { const mx = (nv.N.x[e.a] + nv.N.x[e.b]) / 2, mz = (nv.N.z[e.a] + nv.N.z[e.b]) / 2; for (const g of gates) { if (Math.abs(mx - g.x) > 9 || Math.abs(mz - g.z) > 9) continue; const ax = nv.N.x[e.a], az = nv.N.z[e.a], dx = nv.N.x[e.b] - ax, dz = nv.N.z[e.b] - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((g.x - ax) * dx + (g.z - az) * dz) / l2)); if (Math.hypot(g.x - ax - dx * t, g.z - az - dz * t) <= 0.9) g.n++; } }
    const closedLeak = gates.filter((g) => !g.open && g.n > 0), openUsed = gates.filter((g) => g.open && g.n > 0);
    console.log('ISLAND gates: ' + gates.length + ' (' + gates.filter((g) => g.open).length + ' open, ' + openUsed.length + ' of them with a routing edge through; ' + closedLeak.length + ' closed gates crossed by an edge)'); for (const g of closedLeak) console.log('   closed gate crossed: ' + g.k + ' ' + g.id + ' (' + g.x.toFixed(1) + ',' + g.z.toFixed(1) + ') edges ' + g.n); if (closedLeak.length) { isleFails++; console.log('FAIL: routing edges through closed gates'); }
  }
  console.log('ISLAND raster (petroarea.js) ms:', JSON.stringify(nv.area.info && nv.area.info.petro && nv.area.info.petro.ms), '| info', JSON.stringify(nv.area.info && nv.area.info.petro && { ...nv.area.info.petro, ms: undefined }));
  console.log('ISLAND long decks:', (nv.stats.longDecks || '').split(' ').filter((q) => /blagov/.test(q)).join(' ') || 'blagoveshchensky MISSING');
  const zc = (nv.marsCfg.zones || []).map((z, i) => (i >= 8 ? z.name + ' ' + z.maxPeople : null)).filter(Boolean); console.log('zone caps (after quality):', zc.join(' | '));
  // the decks of the island (sites of bridges/sites.js: Uralsky, Smolensky, Nalichny, Korablestroiteley, the four mouth bridges, the Novo-Andreevsky footbridge): routing nodes on the deck at deck height, and a route from bank to bank
  { const { SITES: SS, toWorld: tw, toUV: tuv } = await import(pathToFileURL(path.join(root, 'src/world/bridges/sites.js')).href), bdY = ctx.services.bridges && ctx.services.bridges.deckY, rows = [];
    for (const id of ['uralsky', 'smolensky', 'nalichny', 'korablestroiteley', 'smol1', 'smol2', 'smol3', 'smol4', 'novo-andreevsky']) {
      const s = id === 'novo-andreevsky' ? (() => { const FT = nv.novoFoot; return FT ? { ...FT, v0: -FT.hw, v1: FT.hw, zones: [] } : null; })() : SS.find((q) => q.id === id); if (!s) { rows.push(id + ': no site'); continue; }
      const c0 = tw(s, 0, 0); let n = 0, maxdy = 0;
      for (let i = 0; i < nv.N.x.length; i++) { const x = nv.N.x[i], z = nv.N.z[i]; if (Math.abs(x - c0.x) > 70 || Math.abs(z - c0.z) > 70) continue; const q = tuv(s, x, z); if (Math.abs(q.u) > 22 || q.v < s.v0 || q.v > s.v1) continue; const dk = bdY ? bdY(x, z) : null; if (dk == null) continue; n++; maxdy = Math.max(maxdy, Math.abs(nv.N.y[i] - dk)); }
      const zone = (s.zones || []).find((z2) => z2[2] !== 'asphalt') || [s.v0, s.v1], vp = (zone[0] + zone[1]) / 2, A = tw(s, -38, vp), B = tw(s, 38, vp), na = nv.nearestNode(A.x, A.z, 16, (j) => nv.mainOK(j)), nb = nv.nearestNode(B.x, B.z, 16, (j) => nv.mainOK(j));
      const rt = na >= 0 && nb >= 0 ? nv.route(na, nb) : null; let len = 0; if (rt) for (let i = 0; i + 1 < rt.length; i++) len += Math.hypot(nv.N.x[rt[i + 1]] - nv.N.x[rt[i]], nv.N.z[rt[i + 1]] - nv.N.z[rt[i]]);
      rows.push(id + ': ' + n + ' nodes on the deck (max |y - deckY| ' + maxdy.toFixed(2) + ' m), ' + (rt ? 'route ' + len.toFixed(0) + ' m for ' + Math.hypot(A.x - B.x, A.z - B.z).toFixed(0) + ' m' : 'NO ROUTE bank to bank (A ' + A.x.toFixed(0) + ',' + A.z.toFixed(0) + ' node ' + na + (na >= 0 ? ' comp ' + nv.compSize[nv.comp[na]] : '') + ' | B ' + B.x.toFixed(0) + ',' + B.z.toFixed(0) + ' node ' + nb + (nb >= 0 ? ' comp ' + nv.compSize[nv.comp[nb]] : '') + ')'));
      if (n && maxdy > 0.6) { isleFails++; console.log('FAIL: nodes off the deck height on ' + id); }
    }
    console.log('ISLAND decks:'); for (const r of rows) console.log('   ' + r); }
}

// ---------------------------------------------------------------- the islands of round 2 (people/isl2area.js, people/isl2.js): static checks
const SPF = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginSpits/frame.js')).href);
const spitSide = (x, z) => { const [a, b] = SPF.local(x, z); return Math.abs(a) < SPF.HL - 0.2 ? SPF.faceB(a) - SPF.PARAPET_T - b : 99; };      // metres from the inner face of the spit parapet on the land side (negative: west of it); 99 beyond the ends of the wall
const ISLON = !!(sim.nav.area && sim.nav.area.isl); let islFails = 0; const { islandAt: islandAt2, ISL_ZONES: ISLZ } = await import(pathToFileURL(path.join(root, 'src/world/people/isl2area.js')).href);
if (ISLON) {
  const nv = sim.nav, byIsl = {}, kinds = {}; let closedN = 0, deepN = 0, spitW = 0, pitS = 0; const exs = [], pitEx = [];
  for (let i = 0; i < nv.N.x.length; i++) {
    const x = nv.N.x[i], z = nv.N.z[i], isl = islandAt2(x, z); if (!isl) continue;
    const k = nv.N.k[i]; (byIsl[isl] ||= {})[k] = ((byIsl[isl] || {})[k] || 0) + 1;
    if ((k === 'a' || k === 'p') && nv.area.closed(x, z)) { closedN++; if (exs.length < 4) exs.push([x.toFixed(0), z.toFixed(0), k]); }
    if ((k === 'a' || k === 'p' || k === 's') && !nv.deckWalk(x, z)) { const h = ctx.physics.groundHeight(x, z, 0.6, false); if (Number.isFinite(h) && h < -0.5) deepN++; }
    if ((k === 'a' || k === 'p') && Math.abs(x + 6412) < 30 && Math.abs(z + 5309) < 30 && spitSide(x, z) < 0.15) spitW++;
    if (k === 's' && !nv.deckWalk(x, z)) { let pit = false; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const h2 = ctx.physics.groundHeight(x + dx, z + dz, 0.6, false); if (Number.isFinite(h2) && h2 < -0.9) { pit = true; break; } } if (pit) { pitS++; if (pitEx.length < 6) pitEx.push([x.toFixed(0), z.toFixed(0)]); } }          // a pavement node with a pit (< -0.9 m) within 1 m: a walker's lateral offset can leave the street there
  }
  console.log('ISLANDS2 pavement nodes with a pit within 1 m:', pitS, JSON.stringify(pitEx));
  console.log('ISLANDS2 routing nodes per island (kind: s pavement, p footway, a lattice):', JSON.stringify(byIsl));
  { // coverage by frame rectangle: routing nodes (s pavement, p footway, a lattice) and people-scale density of the new regions YE1 KA1..KA5 AP1..AP7 PE1..PE6 (+ K1..K4)
    const OL = await import(pathToFileURL(path.join(root, 'tools/osm-lib.mjs')).href), names = OL.RECT_NAMES, rects = OL.PLAY_RECTS, want = new Set(['YE1', 'KA1', 'KA2', 'KA3', 'KA4', 'KA5', 'AP1', 'AP2', 'AP3', 'AP4', 'AP5', 'AP6', 'AP7', 'PE1', 'PE2', 'PE3', 'PE4', 'PE5', 'PE6', 'K1', 'K2', 'K3', 'K4']);
    const rowsR = []; names.forEach((nm, ri) => { if (!want.has(nm)) return; const r = rects[ri]; let s = 0, p = 0, a = 0, big = 0; for (let i = 0; i < nv.N.x.length; i++) { const x = nv.N.x[i], z = nv.N.z[i]; if (x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1) continue; const k = nv.N.k[i]; if (k === 's') s++; else if (k === 'p') p++; else if (k === 'a') a++; if (nv.mainOK(i)) big++; } rowsR.push(nm + ' s' + s + ' p' + p + ' a' + a + ' main' + big); });
    console.log('ISLANDS2 routing nodes by frame rectangle (s pavement / p footway / a lattice / in a big component):', rowsR.join(' | '));
  }
  { // the requests: the Kamenny palace garden footways (access=permissive: islands2-requests-landmarksKamennyPalace.md 7) and the covered passage of the Kitchen block are no walking ground; every point of them must be closed territory / unrouted
    const st2 = ctx.services.streets, ids = ['w546166965', 'w640402009', 'w640402010', 'w640402011', 'w739448361'], rows2 = [];
    for (const id of ids) { const p = ((st2 && st2.paths) || []).find((q) => q.id === id); if (!p) { rows2.push(id + ': not a street path (claimed / not drawn)'); continue; } let closed = 0, routed = 0; for (const q of p.pts) { if (nv.area.closed(q[0], q[1])) closed++; const nn = nv.nearestNode(q[0], q[1], 1.5, (j) => nv.N.k[j] === 'p'); if (nn >= 0) routed++; } rows2.push(id + ': ' + p.pts.length + ' points, ' + closed + ' closed, ' + routed + ' with a footway node within 1.5 m'); }
    console.log('ISLANDS2 requested closed footways:', rows2.join(' | '));
  }
  { const rowsP = []; for (const nm of ['yspit', 'ypalace', 'ykitchen', 'ystable', 'yrossi', 'ytheatre', 'yboats', 'yhercules', 'ybeach', 'yzoo', 'ykirov', 'ymeadow', 'kavenue', 'kchurch', 'ktheatre', 'kolympic', 'apalm', 'agarden', 'ainstitute', 'aleti', 'ppark', 'pbetancourt', 'psavina', 'kstadium', 'ksphinx', 'atransfig', 'atower', 'pwest', 'pzhdanovka', 'aletic1']) { const [px, pz] = AT[nm]; let s = 0, p = 0, a = 0, big = 0; for (let i = 0; i < nv.N.x.length; i++) { if (Math.abs(nv.N.x[i] - px) > 40 || Math.abs(nv.N.z[i] - pz) > 40 || Math.hypot(nv.N.x[i] - px, nv.N.z[i] - pz) > 40) continue; const k = nv.N.k[i]; if (k === 's') s++; else if (k === 'p') p++; else if (k === 'a') a++; if (nv.mainOK(i)) big++; } rowsP.push(nm + ' s' + s + ' p' + p + ' a' + a + ' main' + big); } console.log('ISLANDS2 routing nodes within 40 m of the places:', rowsP.join(' | ')); }
  console.log('ISLANDS2 area info:', JSON.stringify(nv.area.info && nv.area.info.isl && { ...nv.area.info.isl, ms: nv.area.info.isl.ms }), 'zone base', nv.area.islBase);
  console.log('ISLANDS2 lattice / footway nodes in closed territory:', closedN, exs.length ? JSON.stringify(exs) : '', '| nodes below -0.5 m off a deck:', deepN, '| nodes west of the spit parapet chord:', spitW);
  if (closedN) { islFails++; console.log('FAIL: routing nodes in closed territory of the islands'); }
  if (deepN) { islFails++; console.log('FAIL: island routing nodes in a trench / flight'); }
  if (spitW) { islFails++; console.log('FAIL: nodes west of the Yelagin spit parapet'); }
  const zc = (nv.marsCfg.zones || []).slice(nv.area.islBase).map((z) => z.name + ' ' + z.maxPeople); console.log('island zone caps (after quality):', zc.join(' | '));
}
// ---------------------------------------------------------------- run
const st = ctx.services.streets;
let fails = 0; const fail = (m) => { fails++; if (fails < 40) console.log('FAIL:', m); };
sim.debugNaN = (a, t, ph) => { console.log('DEBUG NaN agent', a.i, a.scene, a.kind, 't', t.toFixed(2), 'goal', a.goal && a.goal.type, 'prev', a.px, a.pz, 'speed', a.speed, 'rt', a.rt && [a.rt.seg, a.rt.n, a.rt.x[a.rt.seg], a.rt.z[a.rt.seg]], 'vpref', a.vpref, 'r', a.r, 'lane', a.lane, 'crossIdx', a.crossIdx, 'ps', a.ps, 'hidden', a.hidden, 'comp', a.comp, 'dist', a.dist); };
const upd = ctx._updates;
const viol = { building: 0, road: 0, nan: 0, jump: 0, turn: 0, signal: 0, hiddenMax: 0, step: 0, water: 0, deep: 0, deck: 0, low: 0, cemOff: 0, closed: 0, islClosed: 0, islWalkClosed: 0, spitW: 0, islDeep: 0, islN: 0 };
// the long Neva bridges: everybody on a deck must stand at deck height (services.bridges.deckY + the pavement lift), on the pavement band
const LONGS = (sim.nav.longs || []).filter((s) => !s.own), deckAcc = Object.fromEntries(LONGS.map((s) => [s.id, { n: 0, dy: 0, bad: 0 }]));
/** a scripted person off street level (the roof walk, a descent landing): really on a walk surface at its own height? */
const lowOK = (a) => { const yy = a.kind === 'sit' ? a.y + 0.45 : a.y, h = ctx.physics.groundHeight(a.x, a.z, yy + 0.5, false); return Number.isFinite(h) && Math.abs(h - yy) < 0.3; };       // (a sitter on the edge of a landing: the seat is the surface)
const first = {}; const prev = sim.agents.map((a) => ({ x: a.x, z: a.z, yaw: a.yaw, dyaw: 0, kind: a.kind, hidden: a.hidden, seat: !!a.seat, cross: a.crossIdx, rec: (a.recycled | 0) + (a.leader ? (a.leader.recycled | 0) : 0) }));
const startPos = sim.agents.map((a) => ({ x: a.x, z: a.z })); const progress = sim.agents.map(() => ({ x: 0, z: 0, d: 0, kind: '' }));
let playerMin = 9, playerNear = 0;
let t = 0, steps = Math.round(MIN * 60 / 0.1); const dt = 0.1; const stats = { crossStart: 0, crossStartBad: 0, waits: 0, waitTime: 0, sits: 0, doors: 0, cars: 0 };
const waitStart = new Map();
const t0w = Date.now(); let densAcc = { square: 0, lenina: 0, n: 0, play: 0 };
const REGIONS = [['Kazan garden r30', -1469, -285, 30], ['Kazan colonnade r35', -1500, -235, 35], ['Kazan bridge r25', -1391, -331, 25], ['Palace Sq field r90', -2010, -740, 90], ['Winter Palace courtyard r45', -2097, -893, 45], ['Admiralty garden r60', -2440, -740, 60], ['Alexander Garden fountain r40', -2335, -494, 40], ['Isaac square r60', -2449, -63, 60], ['Catherine garden r50', -805, -86, 50], ['Gostiny arcade+promenade r60', -1100, -230, 60], ['Moika Green Bridge r25', -1768, -420, 25], ['Station square r70', 592, 165, 70],
  ['Eternal Flame r35', -1086, -1243, 35], ['Field alleys r50', -1190, -1330, 50], ['Garden gate + main alley r40', -963, -1626, 40], ['Garden Krylov r30', -909, -1537, 30], ['Garden whole r170', -905, -1330, 170], ['Peter I monument r35', -712, -757, 35], ['Castle forecourt r40', -740, -830, 40], ['Upper Swan Bridge r30', -1069, -1611, 30], ['Suvorov Square r35', -1197, -1502, 35], ['Marble Palace forecourt r30', -1330, -1450, 30], ['Neva embankment r45', -1000, -1650, 45],
  ['Mariinsky doors r30', -3056, 735, 30], ['Glinka + Conservatory r45', -2980, 770, 45], ['Teatralnaya Sq r120', -3030, 720, 120], ['Yusupov portico + court r40', -2940, 340, 40], ['Yusupov garden r40', -2925, 440, 40], ['New Holland lawn r50', -3440, 280, 50], ['New Holland island r190', -3475, 315, 190], ['NH Kovsh pier r30', -3398, 350, 30], ['Nikolsky porch r40', -2900, 1115, 40], ['Nikolsky garden r120', -2910, 1100, 120], ['Sennaya Sq r60', -1746, 718, 60],
  ['Spit tip + garden r60', -2475, -1310, 60], ['Rostral S r30', -2475, -1215, 30], ['Fortress cathedral sq r45', -1985, -1962, 45], ['Fortress beach r60', -2020, -1740, 60], ['Fortress island r420', -1980, -1960, 420], ['Ioannovsky bridge r50', -1620, -2190, 50],
  ['Trinity Bridge mid r140', -1331, -1820, 140], ['Palace Bridge mid r90', -2415, -977, 90], ['Birzhevoy Bridge mid r90', -2679, -1545, 90], ['Tuchkov Bridge mid r90', -3677, -1842, 90], ['Aurora quay r45', -772, -2530, 45], ['Cabin + lions r45', -1122, -2265, 45],
  ['Troitskaya Sq r110', -1443, -2270, 110], ['Mosque + Kshesinskaya r80', -1525, -2500, 80], ['Gorkovskaya r45', -1812, -2665, 45], ['Alexander Park r300', -2010, -2450, 300], ['Zoo gate r35', -2371, -2360, 35], ['Kamennoostrovsky r150', -1838, -2905, 150],
  ['Austrian Sq r50', -1906, -3064, 50], ['Lev Tolstoy Sq r70', -2196, -3725, 70], ['Bolshoy pr r150', -2962, -2795, 150], ['Vladimir Cathedral r90', -3150, -2145, 90], ['Kunstkamera r50', -2593, -995, 50], ['University r80', -2850, -960, 80],
  ['VO Academy front r60', -3400, -545, 60], ['VO Menshikov r80', -3095, -700, 80], ['VO Mining stair r45', -4562, 362, 45], ['VO Lt Schmidt emb r150', -4150, -90, 150], ['VO Andrew cathedral r80', -3797, -822, 80], ['VO Andreevsky market r45', -3708, -671, 45], ['VO Vasileostrovskaya r90', -4080, -1145, 90],
  ['VO Sredny 6-10 line r120', -4125, -1125, 120], ['VO Sportivnaya-2 r60', -3770, -1695, 60], ['VO Gorny Institut r70', -5040, 0, 70], ['VO tram depot r60', -5020, -690, 60], ['VO Erarta r50', -5590, 25, 50], ['VO DK Kirova r60', -5430, -110, 60], ['VO Xenia chapel r30', -5586, -1330, 30], ['VO cemetery r500', -5700, -1250, 500],
  ['VO Sevkabel r90', -6200, 900, 90], ['VO Sea Terminal r90', -6495, 640, 90], ['VO Pribaltiyskaya r120', -7560, -760, 120], ['VO Gavan promenade r60', -6968, 20, 60], ['VO Blagoveshchensky mid r120', -3450, -262, 120],
  ['ISL Yelagin spit terrace r30', -6405, -5309, 30], ['ISL Yelagin palace stairs r45', -4546, -5226, 45], ['ISL Kitchen + stable r70', -4700, -5285, 70], ['ISL Estradny theatre r45', -5233, -5343, 45], ['ISL boat rental r35', -5537, -5384, 35], ['ISL Hercules r35', -5545, -5114, 35], ['ISL Green Beach + zoo r90', -5900, -5280, 90], ['ISL Kirov bust + 2nd bridge r45', -5214, -4890, 45], ['ISL Yelagin whole r950', -5400, -5200, 950],
  ['ISL Kamenny avenue r120', -2880, -5340, 120], ['ISL Kamenny church r40', -2861, -5413, 40], ['ISL Kamenny island r900', -3500, -5100, 900], ['ISL Botanical Garden r260', -1560, -4230, 260], ['ISL Palm House r40', -1503, -4162, 40], ['ISL Petrovsky Park r140', -4200, -2680, 140], ['ISL Betancourt Plaza r40', -4758, -2866, 40], ['ISL Krestovsky arena apron r230', -7310, -4519, 230]];
let tourLeg = -1, legN = 0, legAcc = null; const legs = [];
const gTest = sim.nav.passageTests && sim.nav.passageTests['gostiny-gallery'], cTest = sim.nav.passageTests && sim.nav.passageTests['kazan-colonnade']; let galN = 0, colN = 0; const metroFlow = {}; let ugN = 0; const bhist = {}; const secPrev = []; const regAcc = REGIONS.map(() => 0); let regN = 0;
const sampleOn = ctx.services.bridges && ctx.services.bridges.deckY;
const nearSq = (x, z) => Math.hypot(x - 592, z - 165) < 70, lenina = (x, z) => { const g = L.toGrid(x, z); return g.u > -400 && g.u < 0 && P.nav && sim.nav.zones.dNev(x, z) < 25; };
for (let i = 1; i <= steps; i++) {
  t = i * dt; ctx.time = t; ctx.shared.uTime.value = t;
  if (TOUR && TOUR.length) { const leg = Math.min(TOUR.length - 1, Math.floor((i - 1) / steps * TOUR.length)); if (leg !== tourLeg) { tourLeg = leg; PLX = AT[TOUR[leg]]; legN = 0; legAcc = REGIONS.map(() => 0); legs.push({ name: TOUR[leg], acc: legAcc, n: 0, t0: Date.now(), near: 0 }); } }
  if (PLX) { ctx.player.position.set(PLX[0], 0, PLX[1]); camera.position.set(PLX[0], 1.7, PLX[1]); camera.updateMatrixWorld(true); }
  { const w0 = performance.now(); for (const f of upd) f(dt, t); if (legs.length) { const lg0 = legs[legs.length - 1]; lg0.wall = (lg0.wall || 0) + performance.now() - w0; lg0.ns = (lg0.ns || 0) + 1; } }          // (the wall time of the update callbacks per leg: the old-centre cost with and without the islands: --isloff)
  if (TRACE >= 0 && t >= T0 && t <= T1) { const a = sim.agents[TRACE]; console.log(t.toFixed(1), a.kind, 'pos', a.x.toFixed(2), a.z.toFixed(2), 'cov', sim.nav.cover(a.x, a.z).toFixed(2), 'sp', a.speed.toFixed(2), 'cross', a.crossIdx, 'waitCw', a.waitCw, 'seg', a.rt && a.rt.seg + '/' + a.rt.n, 'stuck', a.stuck, 'goal', a.goal && a.goal.type, 'scene', a.scene); }
  sim.agents.forEach((a, k) => {
    const p = prev[k];
    if (!Number.isFinite(a.x) || !Number.isFinite(a.z) || !Number.isFinite(a.yaw) || !Number.isFinite(a.speed)) { viol.nan++; if (viol.nan < 6) console.log(`  NaN agent ${k} scene=${a.scene} kind=${a.kind} t=${t.toFixed(1)} x=${a.x} z=${a.z} yaw=${a.yaw} speed=${a.speed} leader=${!!a.leader} goal=${a.goal && a.goal.type}`); return; }
    if (!a.hidden && !p.hidden) {
      const d = Math.hypot(a.x - p.x, a.z - p.z), kindChange = a.kind !== p.kind || (!!a.seat !== p.seat) || ((a.recycled | 0) + (a.leader ? (a.leader.recycled | 0) : 0)) !== p.rec || sim.mass > 0 || a.kind === 'approach' || p.kind === 'approach';
      if (d > 0.8 && !kindChange) { viol.jump++; if (viol.jump < 8) console.log(`  jump ${d.toFixed(2)} m agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) t=${t.toFixed(1)} scene=${a.scene}`); }
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
    let hid = 0, n = 0, sq = 0, ln = 0, pl = 0;
    sim.agents.forEach((a, k) => {
      if (a.hidden) { hid++; return; }
      if (a.ug) { ugN++; if (!(a.y < -10 && a.y > -100) || !Number.isFinite(a.x)) viol.ugbad = (viol.ugbad || 0) + 1; return; }
      n++;
      if (a.low) { if (!lowOK(a)) { viol.low++; if (viol.low < 8) console.log(`  off-level person not on its surface: agent ${k} y=${a.y.toFixed(2)} (${a.x.toFixed(1)},${a.z.toFixed(1)}) scene=${a.scene}`); } for (let q = 0; q < REGIONS.length; q++) if (Math.hypot(a.x - REGIONS[q][1], a.z - REGIONS[q][2]) < REGIONS[q][3]) regAcc[q]++; return; }
      if (LONGS.length) { const d = sim.nav.longDeck(a.x, a.z); if (d && !d.s.own) { const dk = ctx.services.bridges.deckY(a.x, a.z), acc = deckAcc[d.s.id], av = Math.abs(d.v); acc.n++;
        if (dk != null) { const e = a.y - dk; acc.dy += Math.abs(e - (d.s.ped ? 0 : 0.15)); if (e < -0.06 || e > 0.42 || (!d.s.ped && (av < d.s.v0 - 0.45 || av > d.s.v1 + 0.3) && sim.nav.crosswalkAt(a.x, a.z, 0.8) < 0)) { acc.bad++; viol.deck++; if (viol.deck < 8) console.log(`  deck: agent ${k} ${a.kind} on ${d.s.id} u=${d.u.toFixed(0)} v=${d.v.toFixed(1)} y=${a.y.toFixed(2)} deck=${dk.toFixed(2)} scene=${a.scene}`); } } } }
      if (L.insideBuilding(a.x, a.z, 0) && !(sim.nav.inHall && sim.nav.inHall(a.x, a.z, 0.3)) && !(sim.nav.inPassage && sim.nav.inPassage(a.x, a.z))) { viol.building++; { const kk = a.scene + '@' + Math.round(a.x / 20) * 20 + ',' + Math.round(a.z / 20) * 20; bhist[kk] = (bhist[kk] || 0) + 1; } if (viol.building < 6) console.log(`  inside building agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) t=${t.toFixed(0)} scene=${a.scene} goal=${a.goal && a.goal.type} rec=${a.recycled | 0} leader=${!!a.leader} lead.kind=${a.leader && a.leader.kind} prevSec=${secPrev[k] ? secPrev[k].x.toFixed(1) + ',' + secPrev[k].z.toFixed(1) + ' ' + secPrev[k].kind : '-'}`); }
      secPrev[k] = { x: a.x, z: a.z, kind: a.kind };
      if (ISLON) {                                                    // the islands of round 2: nobody stands in closed territory (walkers on a public pavement along it are counted apart), nobody west of the spit parapet, nobody below the street off a deck
        const ar = sim.nav.area, il = islandAt2(a.x, a.z);
        if (il) { viol.islN++; if (ar.closed(a.x, a.z)) { if (a.kind === 'stand' || a.kind === 'sit') { viol.islClosed++; if (viol.islClosed < 8) console.log(`  stands in closed territory: agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) scene=${a.scene}`); } else viol.islWalkClosed++; }
          if (il === 'yelagin' && Math.abs(a.x + 6412) < 30 && Math.abs(a.z + 5309) < 30) { const side = spitSide(a.x, a.z); if (side < 0.15) { viol.spitW++; if (viol.spitW < 6) console.log(`  west of the spit parapet: agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) scene=${a.scene} side=${side.toFixed(2)}`); } }
          const gh2 = ctx.physics.groundHeight(a.x, a.z, a.y + 0.6, false); if (Number.isFinite(gh2) && gh2 < -1 && !(sim.nav.deckWalk && sim.nav.deckWalk(a.x, a.z)) && a.y < gh2 + 0.5 && a.kind !== 'sit') { viol.islDeep++; if (viol.islDeep < 6) console.log(`  below -1 m on an island: agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) y=${a.y.toFixed(2)} gh=${gh2.toFixed(2)} scene=${a.scene}`); } }
      }
      if (VOON) { if (sim.nav.inCemetery(a.x, a.z) && !onAlley(a.x, a.z)) { viol.cemOff++; if (viol.cemOff < 8) console.log(`  off the alleys in the cemetery: agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) scene=${a.scene}`); } if ((a.kind === 'stand' || a.kind === 'sit') && sim.nav.area.closed(a.x, a.z)) { viol.closed++; if (viol.closed < 8) console.log(`  in closed territory: agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) scene=${a.scene}`); } }
      const cov = sim.nav.cover(a.x, a.z);
      for (let q = 0; q < REGIONS.length; q++) if (Math.hypot(a.x - REGIONS[q][1], a.z - REGIONS[q][2]) < REGIONS[q][3]) { regAcc[q]++; if (legAcc) legAcc[q]++; }
      if (legs.length && PLX && Math.hypot(a.x - PLX[0], a.z - PLX[1]) < 100) legs[legs.length - 1].near++;
      if (gTest && gTest(a.x, a.z)) galN++; if (cTest && cTest(a.x, a.z)) colN++;
      if (a.y > -1 && !(sim.nav.inHall && sim.nav.inHall(a.x, a.z, 0.3)) && a.scene !== 'passenger' && !String(a.scene).startsWith('hall') && a.kind !== 'sit') {
        const dk = sampleOn ? sampleOn(a.x, a.z) : null, gh = ctx.physics.groundHeight(a.x, a.z, 1.0, false), fb = !!(sim.nav.longDeck && sim.nav.longDeck(a.x, a.z));      // fb: on a footbridge of the fortress (its own timber deck)
        if (dk == null && !fb && !(sim.nav.onDeck && sim.nav.onDeck(a.x, a.z, 0)) && !(sim.nav.inPassage && sim.nav.inPassage(a.x, a.z)) && !(sim.nav.inColonnade && sim.nav.inColonnade(a.x, a.z, 41.5, 58.5)) && a.x < 400 && Number.isFinite(gh) && gh > 0.4) { viol.step++; if (viol.step < 10) console.log(`  on a step / raised walk box ${gh.toFixed(2)} agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) scene=${a.scene}`); }
        if (dk == null && !(sim.nav.onDeck && sim.nav.onDeck(a.x, a.z, 0)) && !(Number.isFinite(gh) && gh > 0.02 && gh < 1.2) && ctx.services.environment.waterAt && ctx.services.environment.waterAt(a.x, a.z)) { viol.water++; if (viol.water < 10) { const nn = sim.nav.nearestNode(a.x, a.z, 8); console.log(`  on water agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) scene=${a.scene} home=${a.home} nearest node ${nn} kind=${nn >= 0 ? sim.nav.N.k[nn] : '-'} at ${nn >= 0 ? sim.nav.N.x[nn].toFixed(1) + ',' + sim.nav.N.z[nn].toFixed(1) + ' y=' + sim.nav.N.y[nn].toFixed(2) + ' longK=' + sim.nav.longK.has(nn) + ' deep=' + sim.nav.deepAt(sim.nav.N.x[nn], sim.nav.N.z[nn]) : '-'} gh=${ctx.physics.groundHeight(a.x, a.z, 1.0, false)}`); } }
        if (Number.isFinite(gh) && gh < -0.6 && a.x < 400 && dk == null && !(sim.nav.onDeck && sim.nav.onDeck(a.x, a.z, 0.3))) { viol.deep++; if (viol.deep < 10) console.log(`  below street level ${gh.toFixed(2)} agent ${k} ${a.kind} (${a.x.toFixed(1)},${a.z.toFixed(1)}) scene=${a.scene}`); }
      }
      if (cov > 0.06 && a.y < 0.7 && /* a platform / deck above a road is no carriageway */ sim.nav.crosswalkAt(a.x, a.z, 0.8) < 0) { viol.road++; if (viol.road < 8) console.log(`  on carriageway agent ${k} ${a.kind} cover ${cov.toFixed(2)} (${a.x.toFixed(1)},${a.z.toFixed(1)}) t=${t.toFixed(0)} scene=${a.scene} cross=${a.crossIdx} inAsph=${a.inAsph} leader=${!!a.leader} rt=${a.rt ? a.rt.x[a.rt.seg].toFixed(1) + ',' + a.rt.z[a.rt.seg].toFixed(1) + '>' + a.rt.x[Math.min(a.rt.seg + 1, a.rt.n - 1)].toFixed(1) + ',' + a.rt.z[Math.min(a.rt.seg + 1, a.rt.n - 1)].toFixed(1) : '-'}`); }
      if (nearSq(a.x, a.z)) sq++; if (lenina(a.x, a.z)) ln++; if (L.areaAt && a.x > L.WORLD.play.x0 && a.x < L.WORLD.play.x1 && a.z > L.WORLD.play.z0 && a.z < L.WORLD.play.z1) pl++;
    });
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
console.log('metro platform people (underground, mean visible):', ugN / Math.max(1, regN));
console.log('violations', JSON.stringify(viol), 'stuck walkers (no 3 m in 3 min):', stuck);
console.log('mean people: visible in play area', (densAcc.play / densAcc.n).toFixed(0), 'within 70 m of the obelisk', (densAcc.square / densAcc.n).toFixed(0), 'on Nevsky Mayakovskaya - Vosstaniya (400 m x both pavements)', (densAcc.lenina / densAcc.n).toFixed(0), '= per 10 m of pavement', (densAcc.lenina / densAcc.n / 80).toFixed(1));
console.log('people inside the Gostiny arcade (mean)', (galN / Math.max(1, regN)).toFixed(1), '| under the Kazan colonnade (mean)', (colN / Math.max(1, regN)).toFixed(1));
console.log('metro door flows (people entering / leaving, whole run):', JSON.stringify(Object.fromEntries(Object.entries(metroFlow).sort((p2, q) => p2[0] < q[0] ? -1 : 1))));
console.log('crossings started', stats.crossStart, 'bad starts', stats.crossStartBad, 'waits', stats.waits, 'mean wait', stats.waits ? (stats.waitTime / stats.waits).toFixed(1) + ' s' : '-', 'sit-downs', stats.sits, 'building / bus entries', stats.doors);
if (sim.marsCount) { const mz = sim.nav.marsCfg.zones.map((z, k) => z.name + ' ' + sim.marsCount[k] + '/' + z.maxPeople); console.log('mars zones (visible at the end / cap):', mz.join(' | ')); const byScene = {}; for (const a of sim.agents) { if (a.hidden) continue; const k = sim.nav.marsZone(a.x, a.z); if (k >= 0) { const key = sim.nav.marsCfg.zones[k].name + ':' + (a.noMass ? 'script' : 'walker'); byScene[key] = (byScene[key] || 0) + 1; } } console.log('  by kind', JSON.stringify(byScene)); }
if (LONGS.length) console.log('long bridges (mean people on the deck | mean height error m | bad samples):', LONGS.map((s) => { const a = deckAcc[s.id]; return s.id + ' ' + (a.n / Math.max(1, regN)).toFixed(1) + ' | ' + (a.n ? (a.dy / a.n).toFixed(3) : '-') + ' | ' + a.bad; }).join('; '));
{ const by = {}; let tot = 0; for (const a of sim.agents) { if (a.hidden || a.ug) continue; const k = sim.nav.marsZone(a.x, a.z); if (k >= 8) { tot++; } } console.log('people in the Petrograd side / Spit zones at the end:', tot, 'of', sim.agents.filter((a) => !a.hidden).length, 'visible; scripted there:', P.plan && P.plan.petroTotal); void by; }
for (const lg of legs) console.log(`leg ${lg.name}: update callbacks ${((lg.wall || 0) / Math.max(1, lg.ns || 1)).toFixed(2)} ms per 0.1 s step over ${lg.ns || 0} steps; mean people within 100 m of the player ${(lg.near / Math.max(1, lg.n)).toFixed(0)}; regions within 400 m: ` + REGIONS.map((r, q) => [r, lg.acc[q] / Math.max(1, lg.n)]).filter(([r]) => Math.hypot(r[1] - AT[lg.name][0], r[2] - AT[lg.name][1]) < 400).map(([r, v]) => r[0] + ' ' + v.toFixed(0)).join(' | '));
console.log('people per region (mean visible):', REGIONS.map((r, q) => r[0] + ' ' + (regAcc[q] / Math.max(1, regN)).toFixed(0)).join(' | '));
if (viol.nan) fail('NaN');
if (viol.building > Math.max(5, N0 * MIN * 60 * 1e-5)) fail(`${viol.building} samples inside a building`);
if (viol.step > N0 * MIN * 60 * 0.001) fail(`${viol.step} samples on steps / raised walk boxes`);
if (viol.water) fail(`${viol.water} samples on water`);
if (viol.deep) fail(`${viol.deep} samples below street level`);
if (viol.deck > N0 * MIN * 60 * 0.0005) fail(`${viol.deck} samples off the deck height / pavement band of a long bridge`);
if (viol.low) fail(`${viol.low} samples of off-level people without a surface`);
if (viol.cemOff > N0 * MIN * 60 * 0.0003) fail(`${viol.cemOff} samples between the graves of the Smolensky cemetery`);
if (viol.closed > N0 * MIN * 60 * 0.0003) fail(`${viol.closed} samples in closed territory of the island`);
if (islFails) fail(islFails + ' islands-of-round-2 static check(s) failed');
if (viol.islClosed) fail(`${viol.islClosed} samples of somebody standing in closed territory of the islands`);
if (viol.spitW) fail(`${viol.spitW} samples west of the Yelagin spit parapet`);
if (viol.islDeep > 3) fail(`${viol.islDeep} samples of island people below -1 m`);
if (viol.islWalkClosed > Math.max(20, viol.islN * 0.01)) fail(`${viol.islWalkClosed} samples of walkers in closed territory of the islands (of ${viol.islN} island samples)`);
if (isleFails) fail(isleFails + ' island static check(s) failed');
if (viol.road > N0 * MIN * 60 * 0.002) fail(`${viol.road} samples on a carriageway outside a zebra`);
if (viol.signal > Math.max(3, stats.crossStart * 0.003)) fail(`${viol.signal} zebra entries on a red pedestrian head`);
if (viol.jump > N0 * MIN * 0.05) fail(`${viol.jump} position jumps > 0.8 m`);
if (viol.turn > N0 * MIN * 0.05) fail(`${viol.turn} turns > 0.9 rad per step`);
if (viol.hiddenMax > N0 * (args.includes('--night') ? 0.95 : 0.45)) fail(`${viol.hiddenMax} hidden at once`);
if (stuck > N0 * 0.12) fail(`${stuck} stuck walkers`);
console.log(fails ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(fails ? 1 : 0);
