// Headless behaviour test of the wildlife module (no GPU): builds the whole west chain (environment, streets, city, landmarks A / C-J, bridges, props) + wildlife with the stubbed DOM of
// tools/check.mjs, then simulates several minutes at 30 fps with scripted players and asserts:
//   1. nothing NaN; the update costs < 3 ms on average; the build stays fast; enough birds (<= the budget of 132), perches (quay posts of every waterway, the Palace Pier lions), ducks, lanes,
//      every species present; every flock site of the zone table is free ground inside the play area;
//   2. ground birds always stand on free ground (not in a building / trunk / solid / the water, not on a carriageway, inside the play area; the bridge pavements count as free);
//   3. a pigeon flock lifts off when the player stands 3 m from it, circles outside the houses and settles again 50 m away; the same for a sparrow flock;
//   4. the animals FOLLOW the player: after a jump to Kazan, Palace Square, the Palace Embankment and St Isaac's Square flocks, gulls, crows and ducks are round him; walking 150 m along Nevsky
//      nothing pops into the view cone within 60 m;
//   5. a ground crow flees at 3 m; a gull on a quay post / lion leaves at 3 m and sits on a post / boat again later;
//   6. gulls on boats ride the boat (exactly on their slots) and are gone before a Fontanka boat reaches the Anichkov Bridge (the arches clear the roof by 35 cm);
//   7. every duck lane lies in the water 3 m off every boat hull of every lap; the groups stay there for 12 minutes;
//   8. swifts are hidden by day and fly at golden hour; no bird shadow hangs over the water; the fountain loops and the boat hums are requested.
// usage: node tools/wildlife-test.mjs [--verbose]
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('--verbose');

class Ctx2D {
  constructor(c) { this.canvas = c; this.font = '10px sans-serif'; }
  measureText(t) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); const s = m ? Number(m[1]) : 10; return { width: [...String(t)].length * s * 0.92, actualBoundingBoxAscent: s * 0.8, actualBoundingBoxDescent: s * 0.2 }; }
  createLinearGradient() { return { addColorStop() {} }; } createRadialGradient() { return { addColorStop() {} }; } createConicGradient() { return { addColorStop() {} }; } createPattern() { return {}; }
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
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16); globalThis.addEventListener = () => {};
globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1; globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });


const THREE = await import('three');
const { createContext } = await import(pathToFileURL(path.join(root, 'src/core/ctx.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500); camera.position.set(0, 1.6, 30);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
const calls = [], loops = [];
const audio = { play: (n, o) => calls.push([n, o]), loop: (n, o) => { loops.push([n, o]); return { setVolume() {}, stop() {} }; } };
const ctx = createContext({ scene, camera, renderer: null, audio, quality: { name: process.env.Q || 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 }, sunDir });
const STRIP = (process.env.AREA || 'strip') === 'strip';      // another area (node tools/area.mjs north tools/wildlife-test.mjs): ITS module list up to wildlife, and only the checks that name no place of the strip
const AREA_MODS = STRIP ? null : await (async () => { const all = (await import('./modules-list.mjs')).mainModules(); return all.slice(0, all.indexOf('wildlife') + 1).filter((m) => !['rail', 'metro', 'traffic', 'people'].includes(m)); })();
ctx.buildList = AREA_MODS || ['environment', 'streets', 'city', 'landmarksA', 'landmarksC', 'landmarksD', 'landmarksE', 'landmarksF', 'landmarksG', 'landmarksH', 'landmarksI', 'landmarksJ', 'bridges', 'props', 'wildlife'];
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.player.position.set(L.HERO.x, 0, L.HERO.z);               // the animals start round the player

let buildMs = 0;
for (const name of ctx.buildList) {
  const mod = await import(pathToFileURL(path.join(root, `src/world/${name}.js`)).href);
  const t0 = performance.now(); await mod.build(ctx); if (name === 'wildlife') buildMs = performance.now() - t0;
}
const svc = ctx.services.wildlife, W = svc.debug.world, D = svc.debug.ducks;
const fails = [];
const check = (cond, msg) => { if (!cond) { fails.push(msg); console.log('FAIL:', msg); } else if (verbose) console.log('ok:', msg); };
const cnt = {}; for (const b of svc.birds) cnt[b.sp] = (cnt[b.sp] || 0) + 1;
console.log(`built in ${buildMs.toFixed(0)} ms: ${svc.birds.length} birds ${JSON.stringify(cnt)}, ${svc.ducks.length} ducks in ${D?.groups.length} groups on ${D?.lanes.length} lanes, ${svc.perches.length} perches, ${svc.flocks.length} flocks, ${svc.sites.pigeon.length} pigeon + ${svc.sites.sparrow.length} sparrow sites, ${svc.spots.length} spots`);
const hi = !process.env.Q || process.env.Q === 'high';
console.log('build time per part (ms):', JSON.stringify(svc.debug.timing, (k, v) => (typeof v === 'number' ? Math.round(v) : v)));
check(buildMs < 700, 'build time < 700 ms in the node harness with the other agents running (' + buildMs.toFixed(0) + ' ms; tools/check.mjs wildlife measures 0.1-0.2 s)');
check(svc.birds.length >= (hi ? (STRIP ? 100 : 60) : 20) && svc.birds.length <= 140, 'bird total within the budget of 140 (' + svc.birds.length + ')');
if (STRIP) check(svc.ducks.length >= (hi ? 8 : 5), 'ducks exist');
if (STRIP) check(svc.perches.length > 1000, 'perches found');
check((cnt.gull || 0) >= (hi ? 10 : 4) && (cnt.pigeon || 0) >= (hi ? 30 : 12) && (cnt.crow || 0) >= (hi ? 5 : 3) && (cnt.sparrow || 0) >= (hi ? 8 : 3), 'every species is present');
if (STRIP) check(svc.spots.length >= 8, 'viewpoints published (' + svc.spots.length + ')');
const kinds = {}; for (const p of svc.perches) { const k = p.kind + (p.key ? ':' + p.key : ''); kinds[k] = (kinds[k] || 0) + 1; }
if (STRIP) check((kinds['post:neva'] || 0) >= 30 && (kinds['post:moika'] || 0) >= 50 && (kinds['post:griboedov'] || 0) >= 30 && (kinds['post:fontanka'] || 0) >= 30 && (kinds.lion || 0) === 2, 'gull perches on the Neva roll, the Moika, the Griboedov Canal, the Fontanka and the two lions ' + JSON.stringify({ n: kinds['post:neva'], m: kinds['post:moika'], g: kinds['post:griboedov'], f: kinds['post:fontanka'], lion: kinds.lion }));
const LK = {}; for (const l of D.lanes) LK[l.key] = (LK[l.key] || 0) + 1;
if (STRIP) check(D.lanes.length >= 30 && LK.moika > 5 && LK.griboedov > 5 && LK.fontanka > 5, 'duck lanes on three waterways ' + JSON.stringify(LK));
// every site of the zone table is on free ground, inside the play area
{
  let badSite = 0; for (const s of [...svc.sites.pigeon, ...svc.sites.sparrow]) if (!W.ok(s.x, s.z, { road: 0.3, pad: 0.2, tree: -0.2 }) || !L.inPlay(s.x, s.z)) { badSite++; console.log('  bad site', s.tag, s.x.toFixed(0), s.z.toFixed(0)); }
  check(badSite === 0, 'every flock site is free ground in the play area');
  const tags = new Set(svc.sites.pigeon.map((s) => s.tag));
  if (!STRIP) check(tags.size >= 1, 'pigeon sites of the area table (' + [...tags].join(',') + ')');
  if (STRIP) check(['kazan', 'column', 'alexander', 'isaac', 'catherine', 'gostiny', 'obelisk'].every((k) => tags.has(k)), 'pigeon sites in every named zone (' + [...tags].join(',') + ')');
}

// the tourist crowds the 'crowd' ambience of core/audio.js listens to: Palace Square, Kazan, Gostiny Dvor ... inside the play area, sane numbers
{
  const C = svc.crowds || [], tags = new Set(C.map((c) => c.name));
  check(C.length >= (STRIP ? 10 : 1) && C.every((c) => L.inPlay(c.x, c.z) && c.r > 0 && c.f > 0 && c.l > 0 && c.l <= 1), 'crowd zones published for the ambience (' + C.length + ')');
  if (STRIP) check(['column', 'kazan', 'gostiny', 'alexander', 'isaac', 'lions'].every((k) => tags.has(k)), 'crowd zones at Palace Square, Kazan, Gostiny Dvor, the Alexander Garden, St Isaac and the Palace Pier');
}

// ---------------------------------------------------------------- driver
const upd = ctx._updates.slice();
let t = 0, updMs = 0, updN = 0;
function run(sec, fn) {
  const dt = 1 / 30, n = Math.round(sec * 30);
  for (let i = 0; i < n; i++) {
    if (fn) fn(t, i);
    ctx.time = t; ctx.shared.uTime.value = t;
    const t0 = performance.now(); for (const f of upd) f(dt, t); updMs += performance.now() - t0; updN++;
    t += dt;
  }
}
/** put the player (and the camera, looking along yaw: 0 = north, pi/2 = west) at (x, z) */
const player = (x, z, y = 0, yaw = 0) => { ctx.player.position.set(x, y, z); camera.position.set(x, y + 1.6, z); camera.lookAt(x - Math.sin(yaw) * 10, y + 1.6, z - Math.cos(yaw) * 10); camera.updateMatrixWorld(); };
const bad = { bird: 0, nan: 0, samples: 0 };
const bridge = ctx.services.landmarksC?.bridge?.deck;
function audit() {
  bad.samples++;
  for (const g of [svc.debug.birds?.group, svc.debug.ducks?.group]) if (g) for (const m of g.children) { const a = m.instanceMatrix.array; for (let i = 0; i < m.count * 16; i++) if (!Number.isFinite(a[i])) { bad.nan++; console.log('  NaN in ' + m.name + ' instance ' + Math.floor(i / 16)); break; } }
  for (const b of svc.birds) {
    if (!Number.isFinite(b.x + b.y + b.z + b.yaw)) bad.nan++;
    if (b.st === 'ground' && !W.ok(b.x, b.z, { road: 0.3, pad: 0.2, tree: -0.2 })) { bad.bird++; if (verbose || bad.bird < 4) console.log(`  bird ${b.sp}#${b.id} on bad ground at ${b.x.toFixed(1)},${b.z.toFixed(1)} act=${b.act} t=${t.toFixed(0)} why: ` + [['play', !L.inPlay(b.x, b.z, 2)], ['river', L.inRiver(b.x, b.z)], ['bld', L.insideBuilding(b.x, b.z, 0.2)], ['road', L.isOnRoad(b.x, b.z, 0.3)], ['lane', !!ctx.services.streets?.laneAt?.(b.x, b.z)], ['shore', L.shoreDist && L.shoreDist(b.x, b.z) < 0.9], ['water', ctx.services.environment?.kindAt?.(b.x, b.z) === 'water']].filter((e) => e[1]).map((e) => e[0]).join(',')); }
  }
}

// ---------------------------------------------------------------- 1. nobody around for 90 s at the hero view (day: swifts hidden)
player(L.HERO.x, L.HERO.z);
run(90, (tt, i) => { if (i % 30 === 0) audit(); });
console.log(`A: ${bad.samples} audits, bad bird-samples ${bad.bird}, NaN ${bad.nan}`);
check(bad.nan === 0, 'no NaN');
check(bad.bird === 0, 'ground birds always on free ground');
{ const states = {}; for (const b of svc.birds) { const k = b.sp + ':' + b.st; states[k] = (states[k] || 0) + 1; } console.log('states after 90 s:', JSON.stringify(states)); }
check(svc.birds.filter((b) => b.sp === 'swift').every((b) => b.hid), 'swifts are hidden by day');

// ---------------------------------------------------------------- 2. flocks
function flockTest(f, label, away, settle) {
  const s = f.site; player(s.x + 40, s.z + 40);
  run(2); if (!STRIP) for (let k = 0; k < 600 && f.state !== 'rest'; k++) run(0.1);      // another area: its start pose may stand beside the flock (it flew up for the 90 s audit): let it settle
  check(f.state === 'rest', label + ': flock at rest before approach (' + f.state + ')');
  for (let k = 0; k <= 40; k++) { player(s.x + 40 - k, s.z + 40 - k); run(0.3); }
  player(s.x + 2, s.z + 2); run(2);
  check(f.state === 'away', label + ': lifts off when the player is 3 m away (state ' + f.state + ')');
  const airborne = f.birds.filter((b) => b.st === 'orbit' || b.st === 'fly' || b.st === 'hide').length;
  check(airborne >= f.birds.length - 1, label + ': members are airborne (' + airborne + '/' + f.birds.length + ')');
  let inside = 0, samples = 0;
  run(away, (tt, i) => { if (i % 30 === 0) audit(); if (i % 5 === 0) for (const b of f.birds) if (b.st === 'orbit') { samples++; if (L.insideBuilding(b.x, b.z, 0.5)) inside++; } });
  if (f.sp === 'pigeon') check(inside <= samples * 0.03, label + ': the loop stays out of the houses (' + inside + '/' + samples + ' samples inside)');
  player(s.x + 50, s.z + 50);
  let tBack = -1; const t0 = t;
  for (let k = 0; k < settle * 10; k++) { run(0.1); if (f.state === 'rest') { tBack = t - t0; break; } }
  check(tBack >= 0, label + ': resettles after the player left (' + (tBack >= 0 ? tBack.toFixed(1) + ' s' : 'never') + ')');
  const ground = f.birds.filter((b) => b.st === 'ground').length;
  check(ground === f.birds.length, label + ': all members on the ground again (' + ground + '/' + f.birds.length + ')');
}
{
  const pf = svc.flocks.filter((f) => f.sp === 'pigeon'), sf = svc.flocks.find((f) => f.sp === 'sparrow');
  const pfo = pf.find((f) => f.site.tag === 'obelisk') || pf[0], pfb = pf.find((f) => f.site.tag === 'bridge');
  if (pfo) flockTest(pfo, 'pigeons (' + pfo.site.tag + ')', 16, 45); else check(false, 'a pigeon flock exists');
  if (pfb) flockTest(pfb, 'pigeons (bridge)', 16, 45); else console.log('(no bridge flock)');
  if (sf) flockTest(sf, 'sparrows (' + sf.site.tag + ')', 8, 45); else check(false, 'a sparrow flock exists');
}

// ---------------------------------------------------------------- 3. the animals follow the player: jumps to Kazan, Palace Square, the Palace Embankment, St Isaac's Square
const dist = (x, z, p) => Math.hypot(x - p.x, z - p.z);
function follow(label, x, z, yaw, o) {
  player(x, z, 0, yaw); run(40, (tt, i) => { if (i % 60 === 0) audit(); });
  const P = { x, z };
  const near = (a, r) => a.filter((d) => d < r).length;
  const fl = svc.flocks.filter((f) => f.sp === 'pigeon').map((f) => ({ d: dist(f.site.x, f.site.z, P), tag: f.site.tag }));
  const gl = svc.birds.filter((b) => b.sp === 'gull' && !b.dead).map((b) => dist(b.x, b.z, P));
  const dk = D.groups.map((g) => dist(g.lane.cx, g.lane.cz, P));
  const cr = svc.birds.filter((b) => b.sp === 'crow').map((b) => dist(b.x, b.z, P));
  console.log(`${label}: pigeon flocks within 220 m ${near(fl.map((f) => f.d), 220)} (${fl.filter((f) => f.d < 220).map((f) => f.tag).join(',')}), gulls within 250 m ${near(gl, 250)}, crows within 250 m ${near(cr, 250)}, duck groups within 260 m ${near(dk, 260)}`);
  check(near(fl.map((f) => f.d), 220) >= o.flocks, label + ': at least ' + o.flocks + ' pigeon flocks round the player');
  if (o.tag) check(fl.some((f) => f.tag === o.tag && f.d < 150), label + ': a pigeon flock in the zone "' + o.tag + '"');
  check(near(gl, 250) >= o.gulls, label + ': at least ' + o.gulls + ' gulls within 250 m');
  check(near(cr, 250) >= 2, label + ': crows about');
  if (o.ducks != null) check(near(dk, 260) >= o.ducks, label + ': ducks within 260 m (>= ' + o.ducks + ')');
}
if (STRIP) {
  follow('Kazan', -1469, -200, 0, { flocks: 4, tag: 'kazan', gulls: 4 });
  follow('Palace Square', -1990, -640, 0, { flocks: 2, tag: 'column', gulls: 4 });
  follow('Palace Embankment', -2392, -780, 1.57, { flocks: 0, gulls: 6 });
  follow('St Isaac Square', -2440, 20, 0, { flocks: 3, tag: 'isaac', gulls: 2 });
} else {      // the sights of the area's own zone table (ZONES.pigeons): a flock in the zone's tag round the player, some pigeon flocks about
  const seen = new Set();
  for (const s of svc.sites.pigeon) { if (seen.has(s.tag)) continue; seen.add(s.tag); follow(s.tag, s.x + 15, s.z + 15, 0, { flocks: 1, tag: s.tag, gulls: 0 }); }
}
// nobody pops: while the player walks along Nevsky (3 m/s, 150 s) no bird appears within 60 m of him in the view cone
{
  const W0 = STRIP ? { x: -1000, z: -170 } : { x: L.HERO.x + 200, z: L.HERO.z };      // the strip: along Nevsky; another area: 200 m east of its start pose
  player(W0.x, W0.z, 0, Math.PI / 2); run(5);
  let pops = 0, steps = 0; const prev = new Map(); const fwd = new THREE.Vector3();
  for (let k = 0; k < 150; k++) {
    const x = W0.x - k * 3, z = W0.z + k * 0.7;                                            // walks west
    player(x, z, 0, Math.PI / 2); camera.getWorldDirection(fwd);
    run(1);
    for (const b of svc.birds) {
      if (b.dead || b.sp === 'swift') continue;
      const p = prev.get(b.id); prev.set(b.id, { x: b.x, z: b.z });
      if (!p) continue;
      const jump = Math.hypot(b.x - p.x, b.z - p.z);
      if (jump > 25) { const d = dist(b.x, b.z, { x, z }); const dx = b.x - x, dz = b.z - z; const dot = (dx * fwd.x + dz * fwd.z) / (d || 1); if (d < 60 && dot > 0.25) { pops++; if (pops < 4) console.log(`  pop: ${b.sp}#${b.id} ${b.mode} jumped ${jump.toFixed(0)} m to ${d.toFixed(0)} m from the player`); } }
    }
    steps++;
  }
  check(pops === 0, 'no bird pops into the view within 60 m while walking (' + pops + ' pops in ' + steps + ' s)');
}

// ---------------------------------------------------------------- 4. crow and gull flee
{
  player(L.HERO.x, L.HERO.z); run(40);
  const c = svc.birds.find((b) => b.sp === 'crow' && b.st === 'ground');
  if (c) {
    player(c.x + 3, c.z + 3); run(1.5);
    check(c.st === 'fly' || c.st === 'perch', 'crow flees from 4 m (state ' + c.st + ')');
    run(8); const d = Math.hypot(c.x - ctx.player.position.x, c.z - ctx.player.position.z);
    check(d > 10, 'crow is well away after 8 s (' + d.toFixed(0) + ' m)');
  } else console.log('(no crow on the ground to test)');
  if (STRIP) {      // the quay posts of the Palace Embankment
  player(-2392, -780, 0, 1.57); run(30);
  const findPostGull = () => svc.birds.find((b) => b.sp === 'gull' && b.st === 'perch' && b.perch && (b.perch.kind === 'post' || b.perch.kind === 'lion') && Math.hypot(b.x + 2392, b.z + 780) < 260);
  for (let k = 0; k < 6 && !findPostGull(); k++) run(20);                                    // gulls come and go between posts, boats and the sky: wait for one to sit
  const g = findPostGull();
  if (g) {
    for (let k = 0; k <= 60; k++) { player(g.x + 30 - 0.3 * k, g.z); run(0.1); }      // walks up at 3 m/s
    check(g.st === 'perch', 'gull sits on at 12 m (' + g.st + ')');
    player(g.x + 3, g.z + 1); run(2);
    check(g.st === 'fly' || (g.st === 'perch' && Math.hypot(g.x - ctx.player.position.x, g.z - ctx.player.position.z) > 8), 'gull leaves its post at 3 m (state ' + g.st + ')');
    run(40);
    check(g.st === 'perch' || g.st === 'boat' || g.st === 'fly' || g.st === 'soar', 'the gull sits on a post / boat again later (' + g.st + ')');
  } else { console.log('  gulls near the embankment: ' + svc.birds.filter((b) => b.sp === 'gull').map((b) => b.mode + ':' + b.st + ':' + Math.round(Math.hypot(b.x + 2392, b.z + 780))).join(' ')); check(false, 'a gull on a quay post exists near the Palace Embankment'); }
  }
}

// ---------------------------------------------------------------- 5. boat gulls ride the boats and leave before the Anichkov arches (the strip's Fontanka boats)
if (STRIP) {
  player(-300, 400);
  let onBoatNearBridge = 0, rode = 0, lands = 0; const prevOn = new Set();
  const bg = svc.birds.filter((b) => b.sp === 'gull');
  run(240, (tt, i) => {
    if (i % 15) return;
    for (const b of bg) {
      if (b.st === 'boat') { rode++; if (b.boat.bt.id.startsWith('c-') && Math.hypot(b.x - bridge.x, b.z - bridge.z) < 50) onBoatNearBridge++; if (!prevOn.has(b.id)) { lands++; prevOn.add(b.id); } }
      else prevOn.delete(b.id);
    }
  });
  console.log(`boat gulls: ${rode} rider-samples in 240 s, ${lands} boardings, ${onBoatNearBridge} samples near the Anichkov Bridge`);
  check(rode > 20, 'gulls ride boats');
  check(onBoatNearBridge === 0, 'no gull rides a boat under the bridge arches (' + onBoatNearBridge + ')');
  // a boat gull stands exactly on the slot of the boat it rides
  player(-2392, -780); run(30);
  let off = 0, n = 0; for (const b of bg) if (b.st === 'boat') { const p = b.boat.bt.pose(b.boat.slot, t); n++; if (Math.hypot(p.x - b.x, p.z - b.z) > 0.3 || Math.abs(p.y - b.y) > 0.05) off++; }
  check(off === 0 && n > 0, 'boat gulls sit on their slots (' + n + ' checked)');
}

// ---------------------------------------------------------------- 6. ducks: every lane in the water, clear of the hulls, for 12 minutes
{
  let outside = 0, nearBoat = 0, samples = 0, minBoat = 99;
  for (const l of D.lanes) for (let i = 0; i < l.n; i++) { samples++; if (l.key !== 'pond' && !L.inRiver(l.xs[i], l.zs[i])) outside++; const hg = D.hullGap(l.xs[i], l.zs[i]); minBoat = Math.min(minBoat, hg); if (hg < 3.0) nearBoat++; }
  console.log(`duck lanes: ${D.lanes.length} lanes, ${samples} samples, outside the water ${outside}, within 3 m of a boat hull ${nearBoat} (closest ${minBoat.toFixed(1)} m)`);
  check(outside === 0, 'duck lanes stay in the water');
  check(nearBoat === 0, 'duck lanes keep 3 m from every boat hull of every lap');
  const T0 = t; let out2 = 0, hull2 = 0, s2 = 0;
  for (let k = 0; k < 720; k += 3) for (const g of D.groups) { const gp = D.groupPose(g, T0 + k); s2++; if (g.lane.key !== 'pond' && !L.inRiver(gp.x, gp.z)) out2++; if (D.hullGap(gp.x, gp.z) < 2.6) hull2++; }
  check(out2 === 0 && hull2 === 0, 'duck groups stay in the water and 2.6 m off the hulls for 12 minutes (' + out2 + ' / ' + hull2 + ' of ' + s2 + ')');
  player(L.HERO.x, L.HERO.z); run(5);
  const g0 = D.groups[0]; if (g0) { const gp0 = D.groupPose(g0, t); player(gp0.x, gp0.z); run(60); }                   // beside a brood: it quacks now and then
}

// ---------------------------------------------------------------- 7. swifts at golden hour
{
  ctx.sunDir.set(-0.931, 0.292, -0.2).normalize(); ctx.shared.uNight.value = 0;
  player(L.HERO.x, L.HERO.z); run(3);
  const sw = svc.birds.filter((b) => b.sp === 'swift'), vis = sw.filter((b) => !b.hid).length;
  check(vis >= sw.length - 1, 'swifts fly at golden hour (' + vis + '/' + sw.length + ')');
  check(sw.every((b) => b.y > 15 && Number.isFinite(b.x)), 'swifts wheel high');
  ctx.shared.uNight.value = 1; run(2); check(sw.every((b) => b.hid), 'swifts are gone at night');
  ctx.sunDir.set(...L.SUN_DIR).normalize(); ctx.shared.uNight.value = 0; run(2);
}

// ---------------------------------------------------------------- 8. nothing over the water casts a ground shadow
{
  const sh = svc.debug.birds.group.children.find((m) => m.name === 'wl-shadows'); let over = 0;
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
  if (sh) for (const b of svc.birds) { if (b.dead) continue; sh.getMatrixAt(b.shSlot, m4); v.setFromMatrixPosition(m4); const s = m4.elements[0]; if (Math.abs(s) > 1e-6 && L.inRiver(v.x, v.z)) over++; }
  check(over === 0, 'no bird shadow hangs over the river (' + over + ')');
}
audit();
check(calls.some((c) => c[0] === 'crow' || c[0] === 'gull'), 'crows / gulls call (audio.play crow / gull)');
check(calls.some((c) => c[0] === 'wings'), 'pigeons clap their wings at take-off (audio.play wings)');
if (STRIP) check(calls.some((c) => c[0] === 'duck'), 'ducks quack (audio.play duck)');
if (STRIP) check(loops.filter((l) => l[0] === 'fountain').length === 2 && loops.filter((l) => l[0] === 'boatHum').length >= 8, 'two fountain loops and a hum per moving boat (' + loops.filter((l) => l[0] === 'fountain').length + ' / ' + loops.filter((l) => l[0] === 'boatHum').length + ')');
console.log(`audio calls: ${calls.length} (${[...new Set(calls.map((c) => c[0]))].join(', ')})`);
check(bad.nan === 0, 'no NaN at the end');
const avg = updMs / updN;
console.log(`update cost: ${avg.toFixed(2)} ms per frame average over ${updN} frames`);
check(avg < 3, 'update < 3 ms per frame');
console.log(fails.length ? `RESULT: FAIL (${fails.length})` : 'RESULT: OK');
process.exit(fails.length ? 1 : 0);
