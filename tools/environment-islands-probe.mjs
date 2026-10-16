// tools/environment-islands-probe.mjs - headless probe of the shores / quays / pits of the islands of round 2 (Yelagin, Kamenny, Aptekarsky, Petrovsky, Serny, Krestovsky), owner (B) water-banks, 2026-10-14.
// Builds ONLY environment + bridges (+ the sight modules named in --modules) in node (no GPU) and answers:
//   --at x z [r] [step]     a map of what a walker meets round a point: . street level, v a drop (surface below -0.5), # inside a collider, W water flag, ~ other water
//   --walk x,z;x,z;...      one probe walk (feet y at the end, blocked or reached)
//   --survey [names]        the natural shores: every 8 m along the coast ring of an island (yelagin, kamenny, aptekarsky, petrovsky, serny, krestovsky; default: all) a walker starts 3 m inland and
//                           walks 8 m toward the water: OK (stopped on land: a collider / wall), FELL (feet below -0.5 or in the water: an OPEN shore), the count per island + the first rows (--verbose: all)
//   --fallback              the invisible fallback decks of the island zones (quay.fallbackIds / dryDecks) with their wetness
// usage: NODE_OPTIONS=--max-old-space-size=14000 node tools/environment-islands-probe.mjs [--modules landmarksYelaginRossi,...] [--no-bridges] --survey --at -4334 -5391 12
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
const U = (p) => pathToFileURL(path.join(root, p)).href;
const { createContext } = await import(U('src/core/ctx.js'));
const { STEP_HEIGHT, DROP_MAX } = await import(U('src/core/physics.js'));
const L = await import(U('src/world/layout.js'));
const W = await import(U('src/world/environment/waterways.js'));
const args = process.argv.slice(2), has = (k) => args.includes(k), opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
const ctx = createContext({ scene, camera, renderer: null, audio: null, quality: { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 }, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
const ISLAND_MODULES = ['landmarksYelaginPalace', 'landmarksYelaginKitchen', 'landmarksYelaginServices', 'landmarksYelaginRossi', 'landmarksYelaginSpits', 'landmarksYelaginPark', 'landmarksKamennyPalace', 'landmarksKamennyChurch', 'landmarksBotanicalGreenhouses', 'landmarksBotanicalGarden', 'landmarksPetrovskyStadium', 'landmarksPetrovskyYacht'];
const mods = [...(has('--islands') ? ISLAND_MODULES : []), ...(opt('--modules', '') || '').split(',').filter(Boolean)];
ctx.buildList = ['environment', ...(has('--no-bridges') ? [] : ['bridges']), ...mods, ...(has('--claims-all') ? L.MODULE_KEYS : [])]; ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
const env = await import(U('src/world/environment.js'));
await env.build(ctx);
for (const m of ['bridges', ...mods].filter((k) => !has('--no-bridges') || k !== 'bridges')) { try { const mm = await import(U('src/world/' + m + '.js')); await mm.build(ctx); } catch (e) { console.log('MODULE FAILED', m, e.message); } }
const ph = ctx.physics, quay = ctx.services.environment.quay;

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
const wet = (x, z) => !!(L.waterwayAt(x, z) || L.inRiver(x, z));
for (let ai = args.indexOf('--at'); ai >= 0; ai = args.indexOf('--at', ai + 1)) {      // --at may be repeated
  const i = ai, cx = Number(args[i + 1]), cz = Number(args[i + 2]), rr = Number(args[i + 3]) || 8, st = Number(args[i + 4]) || 1;
  console.log('MAP at', cx, cz);
  for (let z = cz - rr; z <= cz + rr; z += st) { let s = String(Math.round(z)).padStart(6) + ' '; for (let x = cx - rr; x <= cx + rr; x += st) { const S = ph.surfaceAt(x, z, 0.6, true, { y: 0, kind: null, item: null }), p = { x, z }; ph.resolve(p, 0.3, 0, 1.7); const hit = Math.hypot(p.x - x, p.z - z) > 0.05; s += hit ? '#' : S.y < -0.5 ? (wet(x, z) ? 'W' : 'v') : S.y < -0.05 ? ',' : '.'; } console.log(s); }
  console.log('columns x', cx - rr, '..', cx + rr, 'step', st);
}
if (has('--walk')) {
  const pts = opt('--walk').split(';').map((p) => p.split(',').map(Number)), w = new Walker(pts[0][0], pts[0][1], Number(opt('--y0', 0))); let ok = true;
  for (const p of pts.slice(1)) {
    for (let t = 0; t < 30; t += 1 / 60) { const dx = p[0] - w.x, dz = p[1] - w.z, d = Math.hypot(dx, dz); if (d < 0.05) break; w.step(dx / d * 3.6, dz / d * 3.6); if (has('--trace') && Math.round(t * 60) % 20 === 0) console.log('  trace', w.x.toFixed(2), w.z.toFixed(2), 'y', w.y.toFixed(2)); }
    ok = Math.hypot(p[0] - w.x, p[1] - w.z) < 0.1; if (!ok) break;
  }
  console.log('walk', ok ? 'reached' : 'BLOCKED', 'at', w.x.toFixed(1), w.z.toFixed(1), 'y', w.y.toFixed(2), 'minY', w.minY.toFixed(2));
}
for (let ai = args.indexOf('--items'); ai >= 0; ai = args.indexOf('--items', ai + 1)) {      // --items x z r: the colliders / walk surfaces within r of a point
  const cx = Number(args[ai + 1]), cz = Number(args[ai + 2]), rr = Number(args[ai + 3]) || 10;
  console.log('ITEMS near', cx, cz);
  for (const it of ph._query(cx, cz, rr)) console.log('  ', it.type, 'c', it.cx.toFixed(1), it.cz.toFixed(1), 'hw', it.hw !== undefined ? it.hw.toFixed(2) : '', 'hd', it.hd !== undefined ? it.hd.toFixed(2) : '', 'rot', it.rotY !== undefined ? it.rotY.toFixed(2) : '', 'y', it.y0, it.y1, it.top !== undefined ? 'top ' + it.top : '');
}
if (has('--decks')) {      // every deck polygon of the islands (bridge zones with a polygon, inside inIslands): three walkers cross it along its long axis from 6 m before the first to 6 m after the last vertex: BLOCKED = the deck cannot be crossed (a collider across it)
  const { inIslands } = await import(U('src/world/environment/islands.js')), zones = (await import(U('src/world/environment/river.js'))).bridgeZones().filter((zn) => zn.petro && zn.deck && inIslands(zn.c[0], zn.c[1]));
  let ok = 0, bad = 0, skip = 0;
  for (const zn of zones) {
    const o = zn.deck, n = o.length / 2; let cx = 0, cz = 0; for (let q = 0; q < n; q++) { cx += o[q * 2]; cz += o[q * 2 + 1]; } cx /= n; cz /= n;
    let sxx = 0, sxz = 0, szz = 0; for (let q = 0; q < n; q++) { const dx = o[q * 2] - cx, dz = o[q * 2 + 1] - cz; sxx += dx * dx; sxz += dx * dz; szz += dz * dz; }
    const th = 0.5 * Math.atan2(2 * sxz, sxx - szz), ax = Math.cos(th), az = Math.sin(th); let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (let q = 0; q < n; q++) { const dx = o[q * 2] - cx, dz = o[q * 2 + 1] - cz, u = dx * ax + dz * az, v = -dx * az + dz * ax; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    // a deck over water crosses the water: try both axes, take the one whose ends lie on land
    const tryAxis = (ux, uz, lo, hi, vlo, vhi) => {
      const res = [];
      for (const f of [-0.3, 0, 0.3]) {
        const vm = (vlo + vhi) / 2 + f * (vhi - vlo), W = (u, v) => [cx + ux * u - uz * v, cz + uz * u + ux * v], A = W(lo - 6, vm), B = W(hi + 6, vm);
        const sA = ph.surfaceAt(A[0], A[1], 0.6, true, { y: 0, kind: null, item: null }), sB = ph.surfaceAt(B[0], B[1], 0.6, true, { y: 0, kind: null, item: null });
        if (!(sA.y > -0.5) || !(sB.y > -0.5) || wet(A[0], A[1]) || wet(B[0], B[1])) { res.push(null); continue; }
        const w = new Walker(A[0], A[1], sA.y); const reached = w.walkTo(B[0], B[1], 3.6, (hi - lo + 12) / 3.0 + 6);
        res.push({ reached, at: [w.x, w.z] });
      }
      return res;
    };
    let r = tryAxis(ax, az, u0, u1, v0, v1); if (r.every((q) => q === null)) r = tryAxis(-az, ax, v0, v1, -u1, -u0);
    const run = r.filter(Boolean);
    if (!run.length) { skip++; if (has('--verbose')) console.log('  DECK skipped (no land ends)', zn.id); continue; }
    if (run.every((q) => q.reached)) ok++; else { bad++; console.log('  DECK BLOCKED', zn.id, 'c', Math.round(zn.c[0]), Math.round(zn.c[1]), 'walkers', run.map((q) => (q.reached ? 'ok' : 'stuck@' + q.at.map(Math.round).join(','))).join(' ')); }
  }
  console.log('DECKS', zones.length, 'crossed', ok, 'blocked', bad, 'skipped', skip);
}
if (has('--fallback')) {
  console.log('fallback decks', quay.fallbackDecks, 'polygon decks', quay.polygonDecks, 'gangways', quay.gangways, '| dry decks', (quay.dryDecks || []).join(' '), '| ids', (quay.fallbackIds || []).filter((id) => !String(id).startsWith('pz-w2') && !String(id).startsWith('pz-w3') && !String(id).startsWith('pz-w4')).join(' '));
  if (has('--verbose')) {      // every island zone that stands on an invisible fallback deck or was found dry: centre, deck size, wet samples round it
    const { inIslands } = await import(U('src/world/environment/islands.js')), zs = (await import(U('src/world/environment/river.js'))).bridgeZones(), want = new Set([...(quay.fallbackIds || []), ...(quay.dryDecks || [])]);
    for (const zn of zs) {
      if (!want.has(zn.id) || !inIslands(zn.c[0], zn.c[1])) continue;
      let nw = 0, nt = 0; for (let x = zn.c[0] - 25; x <= zn.c[0] + 25; x += 3) for (let z = zn.c[1] - 25; z <= zn.c[1] + 25; z += 3) { nt++; if (wet(x, z)) nw++; }
      console.log('  ZONE', zn.id, 'c', Math.round(zn.c[0]), Math.round(zn.c[1]), 'len', Math.round(zn.len), 'w', Math.round(zn.w), zn.deck ? 'deck' : zn.line ? 'line' : '-', (quay.dryDecks || []).includes(zn.id) ? 'DRY (no fallback)' : 'fallback', 'wet', nw + '/' + nt);
    }
  }
}
if (has('--survey')) {
  const C = await import(U('src/world/environment/islands2-context.js')), K = await import(U('src/world/environment/krestovsky-context.js'));
  const want = (args[args.indexOf('--survey') + 1] || '').startsWith('--') ? [] : (args[args.indexOf('--survey') + 1] || '').split(',').filter(Boolean);
  const rings = { ...C.ISLANDS2_COAST, krestovsky: K.KRESTOVSKY_ISLAND }, step = Number(opt('--step', 8)), verbose = has('--verbose'), out = [];
  const zones = (await import(U('src/world/environment/river.js'))).bridgeZones();
  for (const [name, o0] of Object.entries(rings)) {
    if (want.length && !want.includes(name)) continue;
    const o = Array.isArray(o0[0]) ? o0.flat() : o0; let a = 0; for (let i = 0; i < o.length; i += 2) { const j = (i + 2) % o.length; a += o[i] * o[j + 1] - o[j] * o[i + 1]; }
    const sgn = a > 0 ? 1 : -1;      // landward normal = into the island polygon
    let n = 0, ok = 0, fell = 0, skipped = 0; const rows = [];
    for (let i = 0; i < o.length; i += 2) {
      const j = (i + 2) % o.length, ax = o[i], az = o[i + 1], bx = o[j], bz = o[j + 1], l = Math.hypot(bx - ax, bz - az); if (l < 1) continue;
      const tx = (bx - ax) / l, tz = (bz - az) / l, nx = -tz * sgn, nz = tx * sgn;
      for (let s = step / 2; s < l; s += step) {
        const x = ax + tx * s, z = az + tz * s;
        if (!L.inPlay(x, z, 0)) { skipped++; continue; }
        if (zones.some((zn) => zn.test(x, z, 4))) { skipped++; continue; }      // bridge zones belong to the bridge owners
        // the coast ring of the data may lie a little off the real water edge: find the water edge along the normal (within +-6 m)
        // start well inland (a natural slope barrier stands 5.7-7.2 m behind the water edge): the first of 12 / 10 / 8 / 6 / 3 m that is dry land, free of colliders and at street level
        let sx = 0, sz = 0, found = false;
        for (const back of [12, 10, 8, 6, 3]) { sx = x + nx * back; sz = z + nz * back; if (wet(sx, sz)) continue; const S0 = ph.surfaceAt(sx, sz, 0.6, true, { y: 0, kind: null, item: null }); if (!(S0.y > -0.5 && S0.y < 3)) continue; const pp = { x: sx, z: sz }; ph.resolve(pp, R, S0.y, H); if (Math.hypot(pp.x - sx, pp.z - sz) > 0.05) continue; found = true; break; }
        if (!found) { skipped++; continue; }
        n++;
        const w = new Walker(sx, sz, Math.max(0, Math.min(1, ph.heightAt(sx, sz) ?? 0)));
        w.y = ph.surfaceAt(sx, sz, 0.6, true, { y: 0, kind: null, item: null }).y; if (!(w.y > -0.6)) { skipped++; n--; continue; }
        w.walkTo(x - nx * 6, z - nz * 6, 3.6, 8);
        const bad = w.fell || w.y < -0.5 || (wet(w.x, w.z) && w.y < -0.3);
        if (bad) { fell++; rows.push([Math.round(x), Math.round(z), +w.y.toFixed(2)]); } else ok++;
      }
    }
    out.push({ name, n, ok, fell, skipped });
    console.log('SURVEY', name, 'points', n, 'blocked/ok', ok, 'OPEN (fell)', fell, 'skipped (outside play / zones / water)', skipped);
    for (const r of rows.slice(0, verbose ? 1e9 : 25)) console.log('  OPEN', r.join(' '));
  }
}
process.exit(0);
