// tools/environment-vo-seal.mjs - SEALED SHORE and CROSSABLE DECKS of Vasilievsky Island (review-water, 2026-10-07). Two proofs that the walk probe of environment-vo-walk.mjs cannot give:
//   --decks   every bridge zone of the island that has a deck polygon and no built owner (river.js bridgeZones, petro zones): the direction of the bridge road at the deck centre is the bridge axis; five parallel
//             walkers (offsets -0.35 .. +0.35 of the deck width) cross from 10 m before the deck to 10 m beyond it: they must arrive. (A road bridge that cannot be crossed is a defect: the review found the long
//             invisible parapets of Nalichny / Korablestroiteley standing across the abutments, quay.js "THE DECK AXIS".) Footbridges narrower than 5 m are only reported: their opening is closed by the slope
//             barriers until the bridge owner draws them.
//   --flood   y-aware flood fill: from a land seed behind every wall / slope piece (inside the play area) a walker of radius 0.3 explores a 0.25 m grid (8 neighbours). A move is BLOCKED when physics.resolve pushes
//             the walker out of a solid at the height of the cell it stands on, FREE when the highest surface not above feet + step lies above -3.3, a LEAK when it drops to the water bed or to no surface. A component
//             counts only when it touches a road or a building (anchored = certainly real land; the strips between a slope-top barrier and the water are enclosed by the barrier and never anchored). Leaks within 12 m
//             of a sight module's water ring (owners.js WATER_RINGS: the owner draws its own walls) are listed as OWNER PITS and do not fail the run.
//   --modules a,b   (water-2 2026-10-08) also BUILD these sight modules (landmarksMining,landmarksAcademy ...) before the proofs: their WATER_RINGS pits are then drawn (walls, flights, colliders), so a leak within 12 m of
//             the ring of a BUILT module is a REAL leak (a seam between the generic quay and the owner's pit), not an owner pit; the pits of modules that are not built stay OWNER PITS
// usage: NODE_OPTIONS=--max-old-space-size=14000 node tools/environment-vo-seal.mjs [--decks] [--flood] [--only neva|smolenka|gavan|kovsh] [--modules landmarksMining,...] [--verbose]      (default: both)
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
class Ctx2D {
  constructor(c) { this.canvas = c; this.font = '10px sans-serif'; }
  measureText(t) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); const s = m ? Number(m[1]) : 10; return { width: [...String(t)].length * s * 0.92, actualBoundingBoxAscent: s * 0.8, actualBoundingBoxDescent: s * 0.2 }; }
  createLinearGradient() { return { addColorStop() {} }; } createRadialGradient() { return { addColorStop() {} }; } createConicGradient() { return { addColorStop() {} }; } createPattern() { return {}; }
  getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; } createImageData(w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
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
const { STEP_HEIGHT, DROP_MAX } = await import(pathToFileURL(path.join(root, 'src/core/physics.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const args = process.argv.slice(2), only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null, verbose = args.includes('--verbose');
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
const ctx = createContext({ scene, camera, renderer: null, audio: null, quality: { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 }, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
const ZON = !process.argv.includes('--no-zones');      // the zone walk needs the bridge owner's decks: `bridges` is built as well
// (water-3 2026-10-09) the modules of --modules are part of the build list FROM THE START: their claims then count for environment (the invisible fallback deck of a bridge that a sight draws, e.g. the Shkipersky bridge of landmarksGavan, is gone) as in the real scene
const MODS = process.argv.includes('--modules') ? process.argv[process.argv.indexOf('--modules') + 1].split(',').filter(Boolean) : [];
ctx.buildList = [...(ZON ? ['environment', 'bridges'] : ['environment']), ...MODS]; ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
const mod = await import(pathToFileURL(path.join(root, 'src/world/environment.js')).href);
await mod.build(ctx);
let zonesBuilt = false;
if (ZON) { try { const bm = await import(pathToFileURL(path.join(root, 'src/world/bridges.js')).href); await bm.build(ctx); zonesBuilt = true; } catch (e) { console.log('ZONE WALK SKIPPED: bridges did not build:', e.message); } }
const BUILT = new Set();                                          // sight modules built by --modules
if (process.argv.includes('--modules')) {
  for (const name of process.argv[process.argv.indexOf('--modules') + 1].split(',').filter(Boolean)) {
    try { const sm = await import(pathToFileURL(path.join(root, 'src/world', name + '.js')).href); await sm.build(ctx); BUILT.add(name); console.log('built', name); } catch (e) { console.log('MODULE NOT BUILT', name, ':', e && e.message); }
  }
}
if (process.argv.includes('--at')) {                              // --at x z [r]: a 1 m map of what a walker meets round a point: . street level, v a drop (surface below -0.5), # inside a collider, W water flag
  const i = process.argv.indexOf('--at'), cx = Number(process.argv[i + 1]), cz = Number(process.argv[i + 2]), rr = Number(process.argv[i + 3]) || 8, P = ctx.physics;
  const res = process.argv.includes('--res') ? Number(process.argv[process.argv.indexOf('--res') + 1]) || 1 : 1;      // --res 0.25: a finer map (a slit between two collider boxes is thinner than 1 m)
  for (let z = cz - rr; z <= cz + rr + 1e-6; z += res) { let s = (Math.round(z * 100) / 100).toFixed(res < 1 ? 2 : 0).padStart(8) + ' '; for (let x = cx - rr; x <= cx + rr + 1e-6; x += res) { const S = P.surfaceAt(x, z, 0.6, true, { y: 0, kind: null, item: null }), p = { x, z }; P.resolve(p, 0.3, 0, 1.7); const hit = Math.hypot(p.x - x, p.z - z) > 0.05; s += hit ? '#' : S.y < -0.5 ? (L.waterwayAt(x, z) ? 'W' : 'v') : '.'; } console.log(s); }
  console.log('columns x', cx - rr, '..', cx + rr); process.exit(0);
}
const ph = ctx.physics, quay = ctx.services.environment.quay;
if (process.argv.includes('--items')) {                          // --items x z [r]: every physics item whose box reaches within r (default 2.5 m) of the point: type, centre, size, rotation, y range (what stands in a slit)
  const i = process.argv.indexOf('--items'), cx = Number(process.argv[i + 1]), cz = Number(process.argv[i + 2]), rr = Number(process.argv[i + 3]) || 2.5;
  for (const it of ph.items) { const rad = it.type === 'cyl' ? it.r : Math.hypot(it.hw, it.hd); if (Math.hypot(it.cx - cx, it.cz - cz) > rad + rr) continue; if (it.type !== 'cyl') { const dx = cx - it.cx, dz = cz - it.cz, lx = dx * it.c - dz * it.s, lz = dx * it.s + dz * it.c; if (Math.abs(lx) > it.hw + rr || Math.abs(lz) > it.hd + rr) continue; }
    console.log(it.type.padEnd(5), 'c', it.cx.toFixed(2), it.cz.toFixed(2), it.type === 'cyl' ? 'r ' + it.r.toFixed(2) : 'size ' + (2 * it.hw).toFixed(2) + ' x ' + (2 * it.hd).toFixed(2) + ' rot ' + it.rotY.toFixed(3), 'y', it.y0, it.y1 ?? it.top ?? ''); }
  process.exit(0);
}

// ---- a walker with the substep logic of Player.update
const R = 0.3, H = 1.7, STICK_DOWN = 0.75, UNDER_EPS = 0.05;
class Walker {
  constructor(x, z, y = 0) { this.x = x; this.z = z; this.y = y; this.vy = 0; this.onGround = true; this.stick = false; this.minY = y; this.fell = false; }
  step(dx, dz, dt = 1 / 60) {
    const sx = dx * dt, sz = dz * dt, n = Math.max(1, Math.ceil(Math.hypot(sx, sz) / 0.12)), p = { x: this.x, z: this.z };
    let feet = this.y; const track = this.onGround && this.stick;
    for (let i = 0; i < n; i++) {
      const ox = p.x, oz = p.z; p.x += sx / n; p.z += sz / n;
      ph.resolve(p, R, feet, H);
      const S = ph.surfaceAt(p.x, p.z, feet, true, { y: 0, kind: null, item: null }), g = S.y;
      let refuse = g - feet > STEP_HEIGHT;
      if (!refuse && this.onGround && feet - g > DROP_MAX && S.kind !== 'terrain' && (feet < ph.heightAt(p.x, p.z) - UNDER_EPS || ph.inHole(p.x, p.z))) refuse = true;
      if (refuse) { p.x = ox; p.z = oz; } else if (track && g > feet) feet = g;
    }
    this.x = p.x; this.z = p.z;
    const S2 = ph.surfaceAt(this.x, this.z, this.y, true, { y: 0, kind: null, item: null }), g = S2.y, item = S2.item;
    if (this.onGround && (this.stick || (item && item.sticky)) && this.vy <= 0 && this.y > g && this.y - g <= STICK_DOWN) { this.y = g; this.vy = 0; this.onGround = true; }
    else {
      this.vy -= 12 * dt; this.y += this.vy * dt;
      if (this.y <= g) { this.y = g; this.vy = 0; this.onGround = true; } else if (this.y - g < 0.06 && this.vy <= 0) { this.y = g; this.vy = 0; this.onGround = true; } else this.onGround = false;
    }
    this.stick = this.onGround && !!(item && item.sticky);
    if (g === -Infinity) this.fell = true;
    this.minY = Math.min(this.minY, this.y);
  }
  walkTo(tx, tz, speed = 3.6, maxT = 12) {
    for (let t = 0; t < maxT; t += 1 / 60) { const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz); if (d < 0.05) return true; this.step(dx / d * speed, dz / d * speed); }
    return false;
  }
}

const env = ctx.services.environment;
const { inVO } = await import(pathToFileURL(path.join(root, 'src/world/environment/vo-banks.js')).href);
const { bridgeZones } = await import(pathToFileURL(path.join(root, 'src/world/environment/river.js')).href);
const W = await import(pathToFileURL(path.join(root, 'src/world/environment/waterways.js')).href);
const zonesAll = bridgeZones().filter((zn) => zn.petro);
const MINE = new Set(['neva', 'smolenka', 'gavan', 'kovsh']);        // the waterways of the island round (the Zhdanovka and the other keys that reach into the V rectangles belong to the earlier rounds)
const step = args.includes('--step') ? Number(args[args.indexOf('--step') + 1]) : 3;
const inZone = (x, z, m = 3) => zonesAll.some((zn) => zn.test(x, z, m));
const nearStair = (x, z) => quay.allStairs.some((q) => Math.hypot(q.x - x, q.z - z) < 24);
const wet = (x, z) => L.inRiver(x, z) || L.waterwayAt(x, z) || W.slopeAt(x, z);
let tested = 0, bad = 0, skippedBelt = 0, skippedOut = 0; const per = {};
const note = (key, ok) => { const r = per[key] || (per[key] = { n: 0, bad: 0 }); r.n++; if (!ok) r.bad++; };
const fails = [];
const fail = (what, key, x, z, w, len = 99) => { bad++; fails.push({ what, key, x, z, len }); if (verbose) console.log('FELL', what, key, Math.round(x), Math.round(z), 'y', w.y.toFixed(2), 'at', w.x.toFixed(1), w.z.toFixed(1)); };


const modeDecks = args.includes('--decks') || !args.includes('--flood'), modeFlood = args.includes('--flood') || !args.includes('--decks');
let failures = 0;
if (modeDecks) {
  const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
  const zs = bridgeZones().filter((zn) => zn.petro && zn.deck && inVO(zn.c[0], zn.c[1]));
  const { ownedGroups, isOwned } = await import(pathToFileURL(path.join(root, 'src/world/lib/claims.js')).href), ownedSet = await ownedGroups(ctx), fallbackIds = [];
  const roadById = new Map(D.ROADS.map((r) => [r.id, r]));
  let decks = 0, bad = 0;
  for (const zn of zs) {
    const o = zn.deck, n = o.length / 2; let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += o[i * 2]; cz += o[i * 2 + 1]; } cx /= n; cz /= n;
    let best = null;
    for (const id of zn.ids) {
      const r = roadById.get(id); if (!r || r.pts.length < 4) continue;
      for (let i = 0; i + 3 < r.pts.length; i += 2) { const ax = r.pts[i], az = r.pts[i + 1], dx = r.pts[i + 2] - ax, dz = r.pts[i + 3] - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / l2)), d = Math.hypot(ax + dx * t - cx, az + dz * t - cz); if (!best || d < best.d) best = { d, dx: dx / Math.sqrt(l2), dz: dz / Math.sqrt(l2), hw: r.hw }; }
    }
    if (!best) { if (verbose) console.log('DECK', zn.id, 'no road on the deck: skipped'); continue; }
    const ux = best.dx, uz = best.dz, vx = -uz, vz = ux; let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (let i = 0; i < n; i++) { const dx = o[i * 2] - cx, dz = o[i * 2 + 1] - cz, u = dx * ux + dz * uz, v = dx * vx + dz * vz; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const res = []; let blocked = 0, fell = 0;
    for (const f of [-0.35, -0.175, 0, 0.175, 0.35]) {
      const v = (v0 + v1) / 2 + f * (v1 - v0), xa = cx + ux * (u0 - 10) + vx * v, za = cz + uz * (u0 - 10) + vz * v, xb = cx + ux * (u1 + 10) + vx * v, zb = cz + uz * (u1 + 10) + vz * v;
      const w = new Walker(xa, za, ph.surfaceAt(xa, za, 0.6, false, { y: 0, kind: null, item: null }).y); let lx = w.x, lz = w.z, stuck = 0; const dd = Math.hypot(xb - xa, zb - za);
      for (let t = 0; t < dd / 3.6 + 8; t += 1 / 60) {
        const dx = xb - w.x, dz = zb - w.z, d2 = Math.hypot(dx, dz); if (d2 < 0.2) break;
        w.step(dx / d2 * 3.6, dz / d2 * 3.6);
        if (Math.hypot(w.x - lx, w.z - lz) < 0.002) stuck++; else { stuck = 0; lx = w.x; lz = w.z; }
        if (stuck > 40) break;
      }
      const reached = Math.hypot(w.x - xb, w.z - zb) < 0.5; if (!reached) blocked++; if (w.minY < -1) fell++;
      res.push(reached ? 'ok' : 'BLOCKED@' + ((w.x - xa) * ux + (w.z - za) * uz).toFixed(0) + 'm');
    }
    decks++;
    const narrowFoot = (v1 - v0) < 5 && /footway|steps|path|cycleway|pedestrian/.test(best.hw), isBad = (blocked || fell) && !narrowFoot;
    if (isBad) bad++;
    const own = (zn.ids || []).find((id) => isOwned(ownedSet, id)), ownedBy = own ? (L.claimedBy(own) || 'claimed') : null; if (!ownedBy) fallbackIds.push(zn.id);
    console.log('DECK', zn.id.padEnd(16), (ownedBy ? 'OWNED ' + ownedBy : 'FALLBACK').padEnd(22), String(best.hw).padEnd(12), 'u', (u1 - u0).toFixed(0), 'x v', (v1 - v0).toFixed(0), 'at', cx.toFixed(0), cz.toFixed(0), ' ', res.join(' '), fell ? 'FELL' : '', isBad ? '  <<< FAIL' : (blocked ? '  (narrow footbridge, sealed until drawn)' : ''));
  }
  console.log('decks tested', decks, 'failed', bad); failures += bad;
  console.log('decks still on the invisible fallback (no built module claims them):', fallbackIds.length ? fallbackIds.join(' ') : 'none');
}
if (modeFlood) {
  const STEP = 0.25, RAD = 18, SURF = { y: 0, kind: null, item: null };
  const probe = (yA, x, z) => { const p = { x, z }; ph.resolve(p, R, yA, H); if (Math.hypot(p.x - x, p.z - z) > 0.02) return null; const S = ph.surfaceAt(x, z, yA, false, SURF); return (S.y === -Infinity || S.y < -3.3) ? 'F' : S.y; };
  const segD = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)); return Math.hypot(ax + dx * t - px, az + dz * t - pz); };
  const owner = W.ownerWater().filter((w) => !BUILT.has(w.owner)).map((w) => w.o), nearOwner = (x, z) => owner.some((o) => { for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if (segD(x, z, o[j], o[j + 1], o[i], o[i + 1]) < 12) return true; return false; });
  const leaks = []; let seeds = 0, cells = 0, visited = new Set(); const key = (i, j) => i * 400000 + j;
  const segs = quay.segments.filter((sg) => inVO(sg.ax, sg.az) && L.inPlay(sg.ax, sg.az) && (!only || sg.key === only));
  let chunk = 0;
  for (const sg of segs) {
    if (++chunk % 300 === 0) visited = new Set();
    const dx = sg.bx - sg.ax, dz = sg.bz - sg.az, run = sg.slope || 0;
    for (const f of [0.25, 0.5, 0.75]) {
      const d = run ? run + 0.2 + 2.5 : 2.5, sx = sg.ax + dx * f + sg.nx * d, sz = sg.az + dz * f + sg.nz * d;
      if (!L.inPlay(sx, sz)) continue; const y0 = probe(0, sx, sz); if (y0 === null || y0 === 'F') continue;
      seeds++;
      const q = [[Math.round(sx / STEP), Math.round(sz / STEP), y0]], si = q[0][0], sj = q[0][1]; visited.add(key(si, sj)); let anchored = false, nvis = 0; const own = [];
      while (q.length) {
        const [i, j, yA] = q.pop(); cells++;
        if ((++nvis & 7) === 0 && !anchored) { const px = i * STEP, pz = j * STEP; if (L.insideBuilding(px, pz, 0.5) || L.isOnRoad(px, pz, 0)) anchored = true; }
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
          if (!a && !b) continue; const ni = i + a, nj = j + b, k = key(ni, nj); if (visited.has(k)) continue;
          if ((ni - si) * (ni - si) + (nj - sj) * (nj - sj) > (RAD / STEP) * (RAD / STEP)) continue;
          const x = ni * STEP, z = nj * STEP; if (!L.inPlay(x, z)) continue;
          visited.add(k); const c = probe(yA, x, z);
          if (c === null) continue;
          if (c === 'F') { if (probe(yA, x + a * STEP * 2, z + b * STEP * 2) === 'F') own.push({ x, z, key: sg.key }); }      // (a crack narrower than 0.5 m between two walk boxes is not a leak: a stride crosses it before gravity acts)
          else q.push([ni, nj, c]);
        }
      }
      if (anchored) for (const lk of own) leaks.push(lk);
    }
  }
  const real = leaks.filter((l) => !nearOwner(l.x, l.z)), pits = leaks.length - real.length;
  const cl = new Map(); for (const lk of real) { const k = lk.key + ' ' + Math.round(lk.x / 8) * 8 + ',' + Math.round(lk.z / 8) * 8; const c = cl.get(k) || { n: 0, x: lk.x, z: lk.z }; c.n++; cl.set(k, c); }
  console.log('FLOOD segments', segs.length, 'seeds', seeds, 'cells', cells, '| anchored leak cells', leaks.length, '(owner pits:', pits, ') real:', real.length, 'in', cl.size, 'clusters');
  for (const [k, c] of [...cl.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 40)) console.log('  LEAK', k, 'cells', c.n, 'e.g.', c.x.toFixed(2), c.z.toFixed(2));
  failures += cl.size;
}
console.log(failures ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(failures ? 1 : 0);
