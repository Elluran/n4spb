// tools/krestovsky-wall-probe.mjs - headless walk probe of the Krestovsky stadium surroundings (invisible-wall hunt, 2026-10-13).
// Builds environment + streets + city + landmarksKrestovsky (override with --mods a,b) on the real Physics, tags every collider with the module that created it,
// walks the four directions from a pose like the player (ph.resolve + surfaceAt) and prints an ASCII map of blocked cells with the owner of the blocker.
// usage: node tools/krestovsky-wall-probe.mjs [--pose x,z,yaw] [--r 70] [--step 2] [--map 0] [--mods environment,streets,city,landmarksKrestovsky]
//   --verify                     what the module promises: 16 stair flights walk up to the plinth (1.15 m), plinth wall / glass envelope / columns / water still block, nothing blocks 150 m from the pose,
//                                no 250 m fallback-deck parapet within 700 m (exit code 1 on a failure)
//   --survey [--survey-x/-z/-r]  long (>= 12 m) free-standing solids that do not come from city, with the number of water samples beside them (DRY = a wall on dry ground = invisible wall candidate)
//   --inspect x,z,r              every collider within r m of a point (owner, type, size, height range)
//   --shore x0,x1,z0,z1          every shore point of the window: walk from the land into the water (wall / fell = no bank collider)
//   --apron                      why each 4 m cell round the arena is (not) paved: r outside the ring, w water, a asphalt, b building, g lawn, p car park, s paving area
//   the 2026-10-13 finding: environment/quay.js built two 261 m invisible parapets (bounding rectangle of the bent deck polygon w636982567, no water beneath); the module now claims that id.
//   (a full build with city takes ~5 min and ~10 GB; --mods environment,streets,landmarksKrestovsky takes ~2 min and is enough for --verify / --apron)
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- DOM stubs
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
globalThis.performance = globalThis.performance || { now: () => Date.now() };


// ---------------------------------------------------------------- build the stack (environment + streets + city + landmarksKrestovsky ...) with the real physics
const THREE = await import('three');
const { createContext } = await import(pathToFileURL(path.join(root, 'src/core/ctx.js')).href);
const { createAudio } = await import(pathToFileURL(path.join(root, 'src/core/audio.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const MODS = (opt('mods', 'environment,streets,city,landmarksKrestovsky')).split(',');
const POSE = (opt('pose', '-7123.4,-4154.3,237.7')).split(',').map(Number);      // x, z, yaw (deg)
const R = Number(opt('r', 70)), STEP = Number(opt('step', 2));
const MAP = opt('map', '1') !== '0';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio; try { audio = createAudio(); } catch (e) { audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.buildList = MODS;
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
const ph = ctx.physics;
const t0 = Date.now();
for (const name of MODS) {
  const before = ph.items.length;
  const mod = await import(pathToFileURL(path.join(root, `src/world/${name}.js`)).href);
  await mod.build(ctx);
  for (let i = before; i < ph.items.length; i++) ph.items[i].owner = name;
  console.log(`built ${name}: +${ph.items.length - before} colliders (${Date.now() - t0} ms)`);
}
for (const f of ctx._updates.slice(0, 0)) f(0, 0);


// ------------------------------------------------ 0. the bridge zones of the water owner near the pose (their fallback decks put invisible parapets on the ground)
{
  const q = ctx.services.environment?.quay;
  if (q) {
    const near = (q.bridges || []).filter((z) => Math.hypot(z.c[0] - POSE[0], z.c[1] - POSE[1]) < 600);
    console.log('quay bridge zones within 600 m:', JSON.stringify(near.map((z) => ({ id: z.id, name: z.name, key: z.key, c: z.c.map((v) => +v.toFixed(1)), axis: z.axis, w: z.w, len: z.len, own: z.own }))));
    console.log('fallback decks:', q.fallbackDecks, 'ids:', JSON.stringify(q.fallbackIds || []));
  }
}

// ------------------------------------------------ 0b. survey: long free-standing solids that stand on DRY ground (parapets / bank walls with no water beside them are invisible walls)
if (args.includes('--survey')) {
  const SR = Number(opt('survey-r', 450)), cx0 = Number(opt('survey-x', POSE[0])), cz0 = Number(opt('survey-z', POSE[1]));
  const rows = [];
  for (const it of ph.items) {
    if (it.type !== 'box' || it.owner === 'city') continue;
    if (Math.hypot(it.cx - cx0, it.cz - cz0) > SR || it.hw * 2 < 12) continue;
    let wet = 0, tot = 0;
    for (let k = -4; k <= 4; k++) for (const side of [-2.5, 2.5]) { const lx = k / 4 * (it.hw - 0.2), lz = side * Math.sign(it.hd || 1); const x = it.cx + lx * it.c + lz * it.s, z = it.cz - lx * it.s + lz * it.c; tot++; if (L.heightAt(x, z) < -0.5) wet++; }
    rows.push({ id: describe(it), wet: `${wet}/${tot}` });
  }
  rows.sort((a, b) => a.wet.localeCompare(b.wet));
  console.log(`long boxes (>= 12 m) within ${SR} m of ${cx0},${cz0}, not from city: ${rows.length}; wet samples beside them:`);
  for (const r of rows.filter((r) => r.wet.startsWith('0/')).slice(0, 80)) console.log('  DRY  ' + r.wet + ' ' + r.id);
  console.log('  (' + rows.filter((r) => !r.wet.startsWith('0/')).length + ' beside water)');
}

// ------------------------------------------------ 0c. --inspect x,z,r: every collider within r metres of a point (owner, type, size, height range), and the ground height there
if (opt('inspect', null)) {
  const [ix, iz, ir = 8] = opt('inspect').split(',').map(Number);
  console.log(`inspect ${ix},${iz} r${ir}: heightAt ${L.heightAt(ix, iz)} groundHeight ${ph.groundHeight(ix, iz, 1.0, false)}`);
  for (const it of ph._query(ix, iz, ir)) { const d = it.type === 'cyl' ? Math.hypot(ix - it.cx, iz - it.cz) - it.r : (() => { const dx = ix - it.cx, dz = iz - it.cz, lx = dx * it.c - dz * it.s, lz = dx * it.s + dz * it.c; return Math.hypot(Math.max(0, Math.abs(lx) - it.hw), Math.max(0, Math.abs(lz) - it.hd)); })(); if (d <= ir) console.log('  ' + d.toFixed(1).padStart(6) + ' m  ' + describe(it)); }
}

const PLAYER_R = 0.3, H = 1.7;
const ownerLetter = { environment: 'e', streets: 's', city: 'c', landmarksKrestovsky: 'K', bridges: 'b', props: 'p' };
const touching = (x, z, r, feet) => {
  const out = [];
  for (const it of ph._query(x, z, r + 0.5)) {
    if (it.type === 'hole') continue;
    let y0 = it.y0, y1 = it.y1;
    if (it.type === 'walk') { if (it.top <= feet + 0.45 || feet + H <= it.y0) continue; y1 = it.top; }
    else if (it.type === 'ramp') continue;
    else if (feet + 0.45 >= y1 || feet + H <= y0) continue;
    let d;
    if (it.type === 'cyl') d = Math.hypot(x - it.cx, z - it.cz) - it.r;
    else { const dx = x - it.cx, dz = z - it.cz, lx = dx * it.c - dz * it.s, lz = dx * it.s + dz * it.c; const qx = Math.max(-it.hw, Math.min(it.hw, lx)), qz = Math.max(-it.hd, Math.min(it.hd, lz)); d = Math.hypot(lx - qx, lz - qz); if (d < 1e-6) d = -Math.min(it.hw - Math.abs(lx), it.hd - Math.abs(lz)); }
    if (d < r) out.push({ it, d });
  }
  return out.sort((a, b) => a.d - b.d);
};
function describe(it) { return it.type === 'cyl' ? `cyl@${it.cx.toFixed(1)},${it.cz.toFixed(1)} r${it.r} y${it.y0}..${it.y1} [${it.owner}]` : `${it.type}@${it.cx.toFixed(1)},${it.cz.toFixed(1)} ${(it.hw * 2).toFixed(2)}x${(it.hd * 2).toFixed(2)} rot${(it.rotY * 57.2958).toFixed(0)} y${it.y0 ?? ''}..${it.y1 ?? it.top} [${it.owner}]` }

/** walk a straight line like the player (substeps 0.1 m): stuck / fell / ok */
const walk = (ax, az, bx, bz) => {
  const p = { x: ax, z: az }; let feet = ph.groundHeight(ax, az, 1.0, false);
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.1));
  for (let i = 1; i <= n; i++) {
    const tx = ax + (bx - ax) * i / n, tz = az + (bz - az) * i / n; p.x = tx; p.z = tz;
    ph.resolve(p, PLAYER_R, feet, H);
    if (Math.hypot(p.x - tx, p.z - tz) > 0.02) return { stuck: true, x: tx, z: tz, feet };
    const S = ph.surfaceAt(p.x, p.z, feet, true, {}); const g = S.y;
    if (g - feet > 0.45) return { stuck: true, x: tx, z: tz, feet, step: g - feet };
    if (!(g > feet - 1.3)) return { fell: true, x: tx, z: tz, feet, g };
    feet = g;
    if (!L.inPlay(tx, tz, 0)) return { edge: true, x: tx, z: tz, feet };
  }
  return { ok: true, x: bx, z: bz, feet };
};


// ------------------------------------------------ 4. --shore x0,x1,z0,z1: every shore point in the window: walk from 5 m inland into the water; counts how it ends (wall / dropped into the water)
if (opt('shore', null)) {
  const [sx0, sx1, sz0, sz1] = opt('shore').split(',').map(Number), step = Number(opt('shore-step', 6));
  const wet = (x, z) => L.heightAt(x, z) < -0.8, res = { wall: 0, fell: 0, edge: 0, ok: 0 }, falls = [];
  for (let z = sz0; z <= sz1; z += step) for (let x = sx0; x <= sx1; x += step) {
    if (wet(x, z) || !L.inPlay(x, z, 3)) continue;
    // a land point whose 4-neighbours at 5 m reach water
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!wet(x + dx * 5, z + dz * 5)) continue;
      if (wet(x - dx * 2, z - dz * 2)) continue;
      const r = walk(x - dx * 4, z - dz * 4, x + dx * 12, z + dz * 12);
      const k = r.stuck ? 'wall' : r.fell ? 'fell' : r.edge ? 'edge' : 'ok'; res[k]++; if (k === 'fell' || k === 'ok') falls.push([Math.round(x), Math.round(z), k]);
      break;
    }
  }
  console.log('shore walk (land -> water, ' + step + ' m grid):', JSON.stringify(res));
  console.log('  walked into water (no bank wall) at:', falls.slice(0, 60).map((f) => f.join(',')).join(' | '));
}


// ------------------------------------------------ 5. --apron: why every 4 m cell of the arena apron is (not) paved: '.' slab, r outside the ring, w water, a asphalt, b building, g lawn, p car park, s paving area
if (args.includes('--apron')) {
  const { apronRules } = await import(pathToFileURL(path.join(root, 'src/world/landmarksKrestovsky/plaza.js')).href);
  const NL = String.fromCharCode(10), st = ctx.services.landmarksKrestovsky.stadium, { why } = apronRules(ctx, { cx: st.x, cz: st.z }, st.rx, st.rz), cnt = {};
  const stepA = 4, ext = Math.round(1.5 * Math.max(st.rx, st.rz) / stepA);
  let rowsA = '';
  for (let j = -ext; j <= ext; j++) { let row = ''; for (let i = -ext; i <= ext; i++) { const x = st.x + i * stepA, z = st.z + j * stepA, w = why(x, z); const ch = w === '' ? '.' : w; cnt[ch] = (cnt[ch] || 0) + 1; row += ch; } rowsA += row + NL; }
  console.log('apron reasons (north up, east right, 4 m cells):' + NL + rowsA + JSON.stringify(cnt));
}

// ------------------------------------------------ 1. the line of sight of the report
const yaw = POSE[2] * Math.PI / 180, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
console.log(`\npose ${POSE[0]},${POSE[1]} yaw ${POSE[2]} -> forward ${fx.toFixed(3)},${fz.toFixed(3)}; ground ${ph.groundHeight(POSE[0], POSE[1], 1.0, false)}; inPlay ${L.inPlay(POSE[0], POSE[1])}`);
for (const [label, dyaw] of [['forward', 0], ['back', 180], ['left', 90], ['right', -90]]) {
  const a = (POSE[2] + dyaw) * Math.PI / 180, dx = -Math.sin(a), dz = -Math.cos(a);
  const r = walk(POSE[0], POSE[1], POSE[0] + dx * 150, POSE[1] + dz * 150);
  const at = r.x != null ? `${r.x.toFixed(1)},${r.z.toFixed(1)} (${Math.hypot(r.x - POSE[0], r.z - POSE[1]).toFixed(1)} m)` : '';
  console.log(`  ${label.padEnd(8)} ${r.ok ? 'open 150 m' : r.stuck ? 'STUCK at ' + at + (r.step ? ' step ' + r.step.toFixed(2) : '') : r.fell ? 'FELL at ' + at + ' g ' + r.g : 'play edge at ' + at}`);
  if (r.stuck) for (const t of touching(r.x, r.z, PLAYER_R + 0.05, r.feet).slice(0, 4)) console.log('      ' + t.d.toFixed(2) + ' ' + describe(t.it));
}

// ------------------------------------------------ 2. grid of cells around the pose: solid cells (resolve pushes), cliffs (surface step), each with the owner
if (MAP) {
  const n = Math.round(R / STEP), cells = [];
  let rows = '';
  const owners = {};
  for (let j = -n; j <= n; j++) {
    let row = '';
    for (let i = -n; i <= n; i++) {
      const x = POSE[0] + i * STEP, z = POSE[1] + j * STEP;
      const g = ph.groundHeight(x, z, 1.0, false);
      const t = touching(x, z, PLAYER_R, Number.isFinite(g) ? g : 0);
      let ch = L.inPlay(x, z, 0) ? '.' : '~';
      if (L.insideBuilding(x, z, 0)) ch = 'B';
      if (g < -0.5) ch = 'w';
      if (g > 0.45) ch = '+';
      if (t.length) { const o = t[0].it.owner; ch = ownerLetter[o] || '?'; const key = o + ' ' + t[0].it.type; owners[key] = (owners[key] || 0) + 1; cells.push({ x, z, owner: o, d: describe(t[0].it) }); }
      if (i === 0 && j === 0) ch = '@';
      row += ch;
    }
    rows += row + `  z${(POSE[1] + j * STEP).toFixed(0)}\n`;
  }
  console.log(`\nmap ${STEP} m cells, x ${(POSE[0] - R).toFixed(0)} .. ${(POSE[0] + R).toFixed(0)} (west left? NO: east is +x, to the right); legend: @ pose, .free, B building, w low ground (water), + high ground, ~ outside play, letters = blocked by owner (e env, s streets, c city, K Krestovsky, b bridges, p props, ? other)`);
  console.log(rows);
  console.log('blocked cells by owner/type:', JSON.stringify(owners));
  const uniq = new Map(); for (const c of cells) uniq.set(c.d, (uniq.get(c.d) || 0) + 1);
  console.log('distinct blocking colliders (cells): ');
  for (const [d, c] of [...uniq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log('  ' + String(c).padStart(4) + '  ' + d);
}

// ------------------------------------------------ 3. verification of what the module promises (--verify): stairs open, the real walls still solid
let FAILS = 0, st0;
const T = (label, cond, extra = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + label + (extra ? '  ' + extra : '')); if (!cond) FAILS++; };
if (args.includes('--verify')) {
  const svc = ctx.services.landmarksKrestovsky, st = svc?.stadium;
  console.log('stadium service:', st ? JSON.stringify({ x: st.x, z: st.z, rx: +st.rx.toFixed(1), rz: +st.rz.toFixed(1), stairs: st.stairs?.length, apron: st.apron, plinthSupports: st.plinth?.supports }) : 'none', 'triangles', svc?.triangles);
  if (st) {
    const at = (rho, a) => [st.x + rho * st.rx * Math.cos(a), st.z + rho * st.rz * Math.sin(a)];
    // (a) every built flight: from 6 m outside up the steps onto the plinth and along 9 m inside; ends at 1.15 m
    let up = 0, bad = [];
    for (const f of st.stairs || []) {
      const a = f.angle * Math.PI / 180, [x1, z1] = at(1.0, a), [x2, z2] = at(.86, a), [x3, z3] = at(.83, a);
      const o1 = at(.9, a), dx = Math.cos(a), dz = Math.sin(a);
      const r = walk(o1[0] + dx * 6, o1[1] + dz * 6, x3, z3);
      if (r.ok && Math.abs(r.feet - 1.15) < 0.05) up++; else bad.push(f.angle + (r.stuck ? ' stuck@' + r.x.toFixed(1) + ',' + r.z.toFixed(1) : ' y' + (r.feet ?? 0).toFixed(2)));
    }
    T(`stairs: ${up}/${(st.stairs || []).length} flights walk from the plaza onto the plinth (y 1.15)`, up === (st.stairs || []).length && up > 0, bad.slice(0, 4).join('; '));
    // (b) the plinth edge between two flights is a wall (angle 13.5 deg: a gap between columns, no flight)
    let walls = 0, nw = 0;
    for (const deg of [14, 37, 59, 83, 104, 150, 200, 260, 310]) {
      const a = deg * Math.PI / 180, taken = (st.stairs || []).some((f) => Math.abs(((f.angle - deg + 540) % 360) - 180) < 5); if (taken) continue; nw++;
      const o1 = at(.9, a), dx = Math.cos(a), dz = Math.sin(a), r = walk(o1[0] + dx * 6, o1[1] + dz * 6, at(.83, a)[0], at(.83, a)[1]); if (r.stuck) walls++;
    }
    T(`plinth wall: ${walls}/${nw} sample bearings away from a flight are still blocked`, walls === nw);
    // (c) glass envelope: from the plinth top straight to the centre stops at the glass (0.76 rho)
    let glass = 0;
    for (const f of (st.stairs || []).slice(0, 4)) { const a = f.angle * Math.PI / 180, p0 = at(.86, a), r = walk(p0[0], p0[1], st.x, st.z); const rho = Math.hypot((r.x - st.x) / st.rx, (r.z - st.z) / st.rz); if (r.stuck && rho > .74) glass++; }
    T('glass envelope still stops the walker at rho .76 (4 bearings)', glass === Math.min(4, (st.stairs || []).length));
    // (d) a column
    const [cx0, cz0] = at(.89, 0); T('column (0 deg) is solid', walk(cx0 + 8, cz0, cx0 - 2, cz0).stuck);
  }
  // (e) the reported wall: nothing blocks 150 m forward / left / right / back from the user pose except real solids; the fallback-deck parapets are gone
  const rr = walk(POSE[0], POSE[1], POSE[0] + fx * 150, POSE[1] + fz * 150);
  T('user pose: 150 m along yaw ' + POSE[2] + ' is open', !!rr.ok || (rr.edge === true), rr.stuck ? 'stuck at ' + rr.x.toFixed(1) + ',' + rr.z.toFixed(1) : '');
  const wetBeside = (it) => { let wet = 0; for (let k = -4; k <= 4; k++) for (const side of [-2.5, 2.5]) { const lx = k / 4 * (it.hw - 0.2), lz = side; if (L.heightAt(it.cx + lx * it.c + lz * it.s, it.cz - lx * it.s + lz * it.c) < -0.5) wet++; } return wet; };
  const parapets = ph.items.filter((it) => it.owner === 'environment' && it.type === 'box' && it.hw * 2 > 100 && Math.abs(it.hd * 2 - .5) < 1e-6 && Math.hypot(it.cx - POSE[0], it.cz - POSE[1]) < 700 && wetBeside(it) === 0);
  T('no long (>= 100 m) fallback-deck parapet on DRY ground within 700 m of the pose (the 507 m ones of the Petrovsky fairway bridge stand over water)', parapets.length === 0, parapets.map(describe).join(' | '));
  // (f) water still blocks: nearest water cell to the arena, walked into from the land side
  let best = null;
  for (let rad = 120; rad < 900 && !best; rad += 6) for (let k = 0; k < 360 && !best; k += 3) { const a = k * Math.PI / 180, x = ((st0 ??= ctx.services.landmarksKrestovsky.stadium).x) + Math.cos(a) * rad, z = st0.z + Math.sin(a) * rad; if (L.inPlay(x, z, 0) && L.heightAt(x, z) < -0.8) best = [x, z, a]; }
  if (best) { const a = best[2], r = walk(best[0] - Math.cos(a) * 12, best[1] - Math.sin(a) * 12, best[0] + Math.cos(a) * 6, best[1] + Math.sin(a) * 6); T(`water at ${best[0].toFixed(0)},${best[1].toFixed(0)}: walking in is stopped (bank wall) or the ground drops`, r.stuck || r.fell, JSON.stringify({ stuck: r.stuck, fell: r.fell })); }
  else console.log('no water within 900 m of the arena (inPlay)');
  console.log(FAILS ? `VERIFY: ${FAILS} FAIL` : 'VERIFY: ALL OK');
}

process.exit(FAILS ? 1 : 0);
