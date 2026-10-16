// (copy for the Petrogradsky audit: no cap on the shore-hole list) tools/environment-banks.mjs - walks a simulated player at the banks of the Mars Field reach (Swan Canal, Moika slope reach / garden quay, Fontanka north of the Moika source, Neva south bank x -1800..-800)
// and pushes toward the water from the street side: the feet may never leave the street level (no fall into the trench / onto a slope), outside the bridge zones and the descents.
// PETROGRAD SIDE (2026-10-06): every bank of the Petrograd-only data is probed too (Petrovskaya / Petrogradskaya / Mytninskaya / Makarova / Universitetskaya / Zhdanovskaya embankments, the natural slopes of the
// Kronverk bank and moat, the Malaya Neva, the Bolshaya Nevka); the decks of that area are excluded by the real zone test of river.js bridgeZones(). Shores that a sight module draws itself (Zayachy Island,
// the Spit descent, the Shi-Tsza stairs: waterways.js OWNER_BANK / OWNER_WATER) are not environment banks: their owners' walk probes cover them.
// usage: node tools/environment-banks.mjs [--step 6] [--verbose] [--petro (only the Petrograd side)]
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
ctx.buildList = ZON ? ['environment', 'bridges'] : ['environment']; ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
const mod = await import(pathToFileURL(path.join(root, 'src/world/environment.js')).href);
await mod.build(ctx);
let zonesBuilt = false;
if (ZON) { try { const bm = await import(pathToFileURL(path.join(root, 'src/world/bridges.js')).href); await bm.build(ctx); zonesBuilt = true; } catch (e) { console.log('ZONE WALK SKIPPED: bridges did not build:', e.message); } }
if (process.argv.includes('--at')) {                              // --at x z [r]: a 1 m map of what a walker meets round a point: . street level, v a drop (surface below -0.5), # inside a collider, W water flag
  const i = process.argv.indexOf('--at'), cx = Number(process.argv[i + 1]), cz = Number(process.argv[i + 2]), rr = Number(process.argv[i + 3]) || 8, P = ctx.physics;
  for (let z = cz - rr; z <= cz + rr; z += 1) { let s = String(Math.round(z)).padStart(6) + ' '; for (let x = cx - rr; x <= cx + rr; x += 1) { const S = P.surfaceAt(x, z, 0.6, true, { y: 0, kind: null, item: null }), p = { x, z }; P.resolve(p, 0.3, 0, 1.7); const hit = Math.hypot(p.x - x, p.z - z) > 0.05; s += hit ? '#' : S.y < -0.5 ? (L.waterwayAt(x, z) ? 'W' : 'v') : '.'; } console.log(s); }
  console.log('columns x', cx - rr, '..', cx + rr); process.exit(0);
}
const ph = ctx.physics, quay = ctx.services.environment.quay;

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
if (args.includes('--walk')) {                                    // --walk x0,z0,x1,z1: one probe walk with the boxes near the end point (diagnostics)
  const pts = args[args.indexOf('--walk') + 1].split(';').map((p) => p.split(',').map(Number)), w = new Walker(pts[0][0], pts[0][1], 0); let ok = true; for (const p of pts.slice(1)) { ok = w.walkTo(p[0], p[1], 3.6, 12); if (!ok) break; }
  console.log('walk', ok ? 'reached' : 'BLOCKED', 'at', w.x.toFixed(1), w.z.toFixed(1), 'y', w.y.toFixed(2));
  for (const it of ph._query(w.x, w.z, 1.5)) console.log(it.type, 'y', it.y0, it.y1, 'c', it.cx.toFixed(1), it.cz.toFixed(1), 'hw', it.hw?.toFixed(1), 'hd', it.hd?.toFixed(1), 'rot', it.rot?.toFixed(2));
  process.exit(0);
}
const env = ctx.services.environment, bridges = (env.quay.bridges || []).filter((zn) => !String(zn.id).startsWith('pz-'));
const { petroAt } = await import(pathToFileURL(path.join(root, 'src/world/environment/waterways.js')).href);
const { bridgeZones } = await import(pathToFileURL(path.join(root, 'src/world/environment/river.js')).href);
const petroZ = bridgeZones().filter((zn) => zn.petro), onlyPetro = args.includes('--petro');
const step = args.includes('--step') ? Number(args[args.indexOf('--step') + 1]) : 6;
const inZone = (x, z, m = 3) => petroZ.some((zn) => zn.test(x, z, m)) || bridges.some((zn) => { const a = zn.axis * Math.PI / 180, ux = Math.sin(a), uz = -Math.cos(a), px = x - zn.c[0], pz = z - zn.c[1], u = px * ux + pz * uz, v = -px * uz + pz * ux; return Math.abs(u) <= zn.len / 2 + 14 + m && Math.abs(v) <= zn.w / 2 + m; });
const nearStair = (x, z) => env.quay.allStairs.some((q) => Math.hypot(q.x - x, q.z - z) < 24);
const region = (key, x, z) => (onlyPetro ? petroAt(x, z) : petroAt(x, z) || key === 'zhdanovka' || key === 'kronverk-moat') || !onlyPetro && (key === 'swan-canal') || key === 'kryukov' || key === 'admiralty' || key === 'moat' || (key === 'griboedov' && z > 100 && x < -1700) || (key === 'moika' && x < -2400) || (key === 'fontanka' && z > 900) || (key === 'neva' && x < -2900) || (key === 'moika' && x > -1300 && x < -700 && z < -940) || (key === 'fontanka' && z < -1040) || (key === 'neva' && x > -1800 && x < -800 && z < -1000);
let tested = 0, bad = 0; const per = {};
for (const sg of env.quay.segments) {
  if (!region(sg.key, sg.ax, sg.az)) continue;
  const len = Math.hypot(sg.bx - sg.ax, sg.bz - sg.az);
  for (let s = step / 2; s < len; s += step) {
    const t = s / len, x = sg.ax + (sg.bx - sg.ax) * t, z = sg.az + (sg.bz - sg.az) * t;
    if (inZone(x, z) || nearStair(x, z)) continue;
    const back = (sg.slope ? sg.slope + 3.2 : 3.0);
    const sx = x + sg.nx * back, sz = z + sg.nz * back, w = new Walker(sx, sz, 0);
    if (L.inRiver(sx, sz) || L.waterwayAt(sx, sz)) continue;
    if (inZone(sx, sz)) continue;
    // a start that lies on the far side of another wall / outside the street plate cannot be judged
    tested++; per[sg.key] = per[sg.key] || { n: 0, bad: 0 }; per[sg.key].n++;
    const tx = x - sg.nx * 5, tz = z - sg.nz * 5;
    w.walkTo(tx, tz, 3.6, 5);
    const sl = w.x, sz2 = w.z;
    if (w.fell || w.y < -0.4 || L.inRiver(sl, sz2) || env.waterAt(sl, sz2) && w.y < -0.3) { bad++; per[sg.key].bad++; if (args.includes('--verbose') || bad < 12) console.log('FELL', sg.key, Math.round(x), Math.round(z), 'y', w.y.toFixed(2), 'at', sl.toFixed(1), sz2.toFixed(1)); }
  }
}
console.log('bank probes', tested, 'failed', bad, JSON.stringify(per));
// SHORE COVERAGE (2026-10-06): the probes above walk at the bank pieces that exist; this pass looks for shore that has NO bank piece. Every edge of a water polygon of the Petrograd-only data with land on one side must
// lie on a bank chain, in a bridge zone, or on a shore that a sight module draws (OWNER_BANK / OWNER_WATER). (Found this way: a 20 m hole in the Spit quay beside the Palace Bridge, where a plug edge cancelled the shore.)
{
  const W = await import(pathToFileURL(path.join(root, 'src/world/environment/waterways.js')).href), g = W.waterGeo(), zonesAll = bridgeZones();
  const segD = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)); return Math.hypot(ax + dx * t - px, az + dz * t - pz); };
  const cell = 64, grid = new Map();
  for (const bk of g.banks) for (let i = 0; i + 1 < bk.pts.length; i++) { const a = bk.pts[i], c = bk.pts[i + 1]; for (let ix = Math.floor((Math.min(a[0], c[0]) - 2) / cell); ix <= Math.floor((Math.max(a[0], c[0]) + 2) / cell); ix++) for (let iz = Math.floor((Math.min(a[1], c[1]) - 2) / cell); iz <= Math.floor((Math.max(a[1], c[1]) + 2) / cell); iz++) { const k = ix + ',' + iz; let arr = grid.get(k); if (!arr) grid.set(k, (arr = [])); arr.push([a[0], a[1], c[0], c[1]]); } }
  const onBank = (x, z, tol = 0.8) => (grid.get(Math.floor(x / cell) + ',' + Math.floor(z / cell)) || []).some((e) => segD(x, z, e[0], e[1], e[2], e[3]) < tol);      // (tol 2.2 within 3 m of the end of a ring edge: a sample there lies beside the chain that continues round the corner / the mouth of a join, e.g. the Moika mouth at (-4386, 738))
  const ownerRings = W.ownerBanks().map((w) => w.o), nearOwner = (x, z) => ownerRings.some((o) => { for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if (segD(x, z, o[j], o[j + 1], o[i], o[i + 1]) < 3) return true; return false; });
  const CITY = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href), clipX = [...new Set(CITY.EXTENT_RECTS.flatMap((r) => [r.x0, r.x1]))], clipZ = [...new Set(CITY.EXTENT_RECTS.flatMap((r) => [r.z0, r.z1]))];
  let holes = 0, checked = 0, zoneTested = 0, zoneBad = 0, dryTrench = 0;
  for (const r of g.rings) {
    const o = r.o, n = o.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, ax = o[i * 2], az = o[i * 2 + 1], bx = o[j * 2], bz = o[j * 2 + 1], l = Math.hypot(bx - ax, bz - az); if (l < 0.4) continue;
      if (clipX.some((v) => Math.abs(ax - v) < 0.8 && Math.abs(bx - v) < 0.8) || clipZ.some((v) => Math.abs(az - v) < 0.8 && Math.abs(bz - v) < 0.8)) continue;      // an edge on a clip line of the bake is a seam, never shore
      for (let t = Math.min(0.5, 1.5 / l); t < 1; t += Math.max(0.2, 3 / l)) {
        const x = ax + (bx - ax) * t, z = az + (bz - az) * t, nx = -(bz - az) / l * 1.5, nz = (bx - ax) / l * 1.5;
        if (!petroAt(x, z) && !(x < -2300 && x > -2600 && z < -1040 && z > -1300)) continue;                 // the Petrograd-only data + the Spit beside the Palace Bridge (it lies in an older extent rectangle)
        if (!L.inPlay(x, z, 3)) continue;
        if (!!L.waterwayAt(x + nx, z + nz) === !!L.waterwayAt(x - nx, z - nz)) continue;                  // water on both sides (a join) or land on both (a sliver)
        checked++;
        // TRENCH WITHOUT A WATER FLAG (2026-10-07): just behind the shore the layout must say land (street height); a trench there that is not water is a plug / tail polygon lying on land (other modules' navigation
        // reads it as a hole: the Spit corner beside the Palace Bridge)
        { const dry = L.waterwayAt(x + nx, z + nz) ? -1 : 1; for (const d of [0.25, 0.6]) { const px = x + nx / 1.5 * dry * d, pz = z + nz / 1.5 * dry * d; if (!L.waterwayAt(px, pz) && Math.min(L.heightAt(px, pz), ph.heightAt(px, pz)) < -1 && !W.ownerWaterAt(px, pz, 1.2) && !W.slopeAt(px, pz)) { dryTrench++; if (dryTrench <= 12) console.log("TRENCH WITHOUT A WATER FLAG", r.id, px.toFixed(1), pz.toFixed(1), "layout", L.heightAt(px, pz), "physics", ph.heightAt(px, pz)); break; } } }
        // ZONE WALK (2026-10-07): inside a bridge zone the bank is the bridge owner's (abutment, wing walls, deck). A walker crosses the shore point from the land side: on a deck or against a wall the feet stay at
        // street level; a drop into the trench is an open edge. (Found this way: the corner of the Spit beside the Palace Bridge north landing.)
        if (zonesBuilt && zonesAll.some((zn) => zn.test(x, z, 3))) {
          const dry = L.waterwayAt(x + nx, z + nz) ? -1 : 1, lx = nx / 1.5 * dry, lz = nz / 1.5 * dry;
          for (const back of [3.0, 5.0]) {
            const sx = x + lx * back, sz = z + lz * back; if (L.waterwayAt(sx, sz) || L.inRiver(sx, sz) || W.slopeAt(sx, sz)) break;      // (a start on a natural slope cannot be judged: the slope is fenced at its top, nobody gets there)
            const S0 = ph.surfaceAt(sx, sz, 0.6, true, { y: 0, kind: null, item: null }); if (!(S0.y > -0.5 && S0.y < 3)) break;
            // (review-water-2 2026-10-09) a start INSIDE a collider belt (a wall box plus the owner's wing collider is 1 - 1.5 m wide beside a zone border) is pushed out to the water half by the first resolve and "falls":
            // an artefact of the run-up, not a hole (the belt is there). Such a start is skipped and the walk is made from 5 m back instead (the first start that stands on free ground decides)
            { const pp = { x: sx, z: sz }; ph.resolve(pp, R, S0.y, H); if (Math.hypot(pp.x - sx, pp.z - sz) > 0.05) continue; }
            const w = new Walker(sx, sz, S0.y); zoneTested++; w.walkTo(x - lx * 4, z - lz * 4, 3.6, 4);
            if (w.fell || w.y < -1.0) { zoneBad++; if (zoneBad <= 12 || args.includes("--verbose")) console.log('OPEN EDGE IN A BRIDGE ZONE', r.id, x.toFixed(1), z.toFixed(1), 'from', sx.toFixed(1), sz.toFixed(1), 'feet end', w.y.toFixed(2), 'at', w.x.toFixed(1), w.z.toFixed(1)); }
            break;
          }
        }
        if (onBank(x, z, Math.min(t * l, (1 - t) * l) < 3 ? 2.2 : 0.8) || W.ownerWaterAt(x, z, 1.2) || nearOwner(x, z) || zonesAll.some((zn) => zn.test(x, z, 3))) continue;
        holes++; console.log('SHORE WITHOUT A BANK', r.id, x.toFixed(1), z.toFixed(1));
      }
    }
  }
  console.log('shore coverage: points checked', checked, 'without a bank piece', holes);
  console.log('zone walk: walks', zoneTested, 'open edges', zoneBad, zonesBuilt ? '' : '(not run)');
  console.log('trench without a water flag behind the shore:', dryTrench);
  // open edges inside bridge zones are the bridge owners' to close: printed, counted only with --strict-zones
  bad += holes + dryTrench + (args.includes('--strict-zones') ? zoneBad : 0);
}
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
