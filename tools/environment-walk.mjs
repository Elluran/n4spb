// tools/environment-walk.mjs - walks a simulated player (the substep logic of core/player.js) down every walkable descent of the canals / the Neva and tries to fall into the water.
// usage: node tools/environment-walk.mjs [--only key] [--verbose] | --push pu pv [--at x z] (trace one push from the lower landing of the descent at x,z)
// For every descent in services.environment.quay.allStairs (walk: true): street -> gate -> flight -> lower landing must be walkable (final feet y = landing level), and from the landing the
// walker pushes toward the water (u+), out (v+), back (u-) and into the wall: the feet may never go below the landing (no fall into the trench) and never leave the descent.
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
ctx.buildList = ['environment']; ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
const mod = await import(pathToFileURL(path.join(root, 'src/world/environment.js')).href);
await mod.build(ctx);
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
let bad = 0, tested = 0;
if (args.includes('--trace')) {
  const st = quay.allStairs.find((q) => q.walk && (!only || q.key === only)), t = [st.tx, st.tz], n = [st.nx, st.nz], P = (u, v) => [st.x + t[0] * u - n[0] * v, st.z + t[1] * u - n[1] * v];
  const w = new Walker(...P(0, -1.6), 0); for (const [u, v] of [[0, -0.3], [0.2, 0.95], [2.2, 0.95], [st.length - 3.2, 0.95]]) w.walkTo(...P(u, v));
  const tg = P(st.length - 0.5, 0.95);
  for (let k = 0; k < 90; k++) { const dx = tg[0] - w.x, dz = tg[1] - w.z, d = Math.hypot(dx, dz); w.step(dx / d * 3.6, dz / d * 3.6); const uu = (w.x - st.x) * t[0] + (w.z - st.z) * t[1]; if (k % 6 === 0) console.log(k, 'u', uu.toFixed(2), 'y', w.y.toFixed(2), 'ground', w.onGround); }
  for (const uu of [9.2, 9.5, 9.6, 9.8, 10.0, 10.2]) { const q = P(uu, 0.95), S = ph.surfaceAt(q[0], q[1], -2.78, true, { y: 0, kind: null, item: null }); const pp = { x: q[0], z: q[1] }; ph.resolve(pp, 0.3, -2.78, 1.7); console.log('u', uu, 'surface', S.y, S.kind, 'resolve shift', (pp.x - q[0]).toFixed(2), (pp.z - q[1]).toFixed(2)); }
  process.exit(0);
}
if (args.includes('--probe')) {                                  // list the physics items near a point of the first descent: u, v given as --probe u v
  const i = args.indexOf('--probe'), uu = Number(args[i + 1]), vv = Number(args[i + 2]); const st = quay.allStairs.find((q) => q.walk && (!only || q.key === only) && (!args.includes('--at') || Math.hypot(q.x - Number(args[args.indexOf('--at') + 1]), q.z - Number(args[args.indexOf('--at') + 2])) < 3));
  const x = st.x + st.tx * uu - st.nx * vv, z = st.z + st.tz * uu - st.nz * vv;
  for (const it of ph._query(x, z, 0.6)) { const tu = (it.cx - st.x) * st.tx + (it.cz - st.z) * st.tz, tv = -((it.cx - st.x) * st.nx + (it.cz - st.z) * st.nz); console.log(it.type, 'top', it.top, 'y0', it.y0, 'y1', it.y1, 'hw', it.hw?.toFixed(2), 'hd', it.hd?.toFixed(2), 'at u,v', tu.toFixed(1), tv.toFixed(1), 'rot', (it.rotY || 0).toFixed(2)); }
  console.log('stair', st.x, st.z, 'u,v->', x, z, 'L', st.length); process.exit(0);
}
if (args.includes('--push')) {                                   // trace one push from the lower landing: --push pu pv --at x z (the walker's u, v, feet, the surface under it and the terrain height)
  const i = args.indexOf('--push'), pu = Number(args[i + 1]), pv = Number(args[i + 2]), ai = args.indexOf('--at');
  const st = quay.allStairs.find((q) => q.walk && (ai < 0 || Math.hypot(q.x - Number(args[ai + 1]), q.z - Number(args[ai + 2])) < 3)), t = [st.tx, st.tz], n = [st.nx, st.nz], P = (u, v) => [st.x + t[0] * u - n[0] * v, st.z + t[1] * u - n[1] * v];
  const q = P(st.length - 1.5, st.w / 2), w = new Walker(q[0], q[1], st.landingY), tg = P(st.length - 1.5 + pu * 6, st.w / 2 + pv * 6);
  for (let k = 0; k < 240; k++) {
    const dx = tg[0] - w.x, dz = tg[1] - w.z, d = Math.hypot(dx, dz); if (d < 0.05) break; w.step(dx / d * 3.6, dz / d * 3.6);
    if (k % 6 === 0) { const S = ph.surfaceAt(w.x, w.z, w.y, true, { y: 0, kind: null, item: null }); console.log(k, 'u', ((w.x - st.x) * t[0] + (w.z - st.z) * t[1]).toFixed(2), 'v', (-((w.x - st.x) * n[0] + (w.z - st.z) * n[1])).toFixed(2), 'feet', w.y.toFixed(2), 'surface', S.y.toFixed(2), S.kind, 'terrain', ph.heightAt(w.x, w.z).toFixed(2), 'water', L.waterwayAt(w.x, w.z) ? L.waterwayAt(w.x, w.z).key : '-', 'xz', w.x.toFixed(1), w.z.toFixed(1)); }
  }
  process.exit(0);
}
for (const st of quay.allStairs) {
  if (!st.walk || (only && st.key !== only)) continue;
  tested++;
  const t = [st.tx, st.tz], n = [st.nx, st.nz], Wd = st.w, P = (u, v) => [st.x + t[0] * u - n[0] * v, st.z + t[1] * u - n[1] * v];
  const gA = 2.0, gB = 1.8, uE = st.length, uL = uE - 3.0;
  const w = new Walker(...P(0, -1.6), 0);
  const log = [];
  const route = [[0, -0.3], [0.2, Wd / 2], [gB + 0.4, Wd / 2], [uL - 0.3, Wd / 2], [uE - 1.0, Wd / 2]];
  let ok = true;
  for (const [u, v] of route) { const q = P(u, v); const r = w.walkTo(q[0], q[1]); const uu = (w.x - st.x) * t[0] + (w.z - st.z) * t[1], vv = -((w.x - st.x) * n[0] + (w.z - st.z) * n[1]); log.push(`${u.toFixed(1)},${v.toFixed(1)} -> y=${w.y.toFixed(2)} at u=${uu.toFixed(2)} v=${vv.toFixed(2)} ${r ? '' : 'STUCK'}`); if (!r) ok = false; }
  const landY = st.landingY;
  if (Math.abs(w.y - landY) > 0.06) { ok = false; log.push(`end y ${w.y.toFixed(2)} != landing ${landY.toFixed(2)}`); }
  // push on from the lower landing: toward the water, out, back toward the wall
  const probes = [[1, 0], [0, 1], [0, -1], [1, 1], [1, -1]];
  for (const [pu, pv] of probes) {
    const q = P(uE - 1.5, Wd / 2), w2 = new Walker(q[0], q[1], landY); w2.onGround = true;
    const tgt = P(uE - 1.5 + pu * 6, Wd / 2 + pv * 6); w2.walkTo(tgt[0], tgt[1], 3.6, 4);
    if (w2.y < landY - 0.3 || w2.fell) { ok = false; log.push(`FELL pushing (${pu},${pv}): y ${w2.y.toFixed(2)}`); }
  }
  // push from the top landing: out and back (u-)
  for (const [pu, pv] of [[-1, 0], [0, 1], [-1, 1]]) {
    const q = P(0, Wd / 2), w3 = new Walker(q[0], q[1], 0.1); const tgt = P(pu * 8, Wd / 2 + pv * 8); w3.walkTo(tgt[0], tgt[1], 3.6, 4);
    if (w3.y < -0.3 || w3.fell) { ok = false; log.push(`FELL from top pushing (${pu},${pv}): y ${w3.y.toFixed(2)}`); }
  }
  if (st.pier) {                                                    // on to the pier deck: reachable, and no way off its edges
    const pr = st.pier, pc = P(pr.u0 + pr.len / 2, pr.v0 + pr.wid / 2), wp = new Walker(...P(uE - 1.0, Wd / 2), landY);
    const okReach = wp.walkTo(...P(uE + 0.6, Math.min(Wd - 0.4, pr.v0 + 0.8))) && wp.walkTo(...pc);
    if (!okReach || Math.abs(wp.y - pr.y) > 0.06) { ok = false; log.push(`pier not reached: y ${wp.y.toFixed(2)} (deck ${pr.y.toFixed(2)}) at u ${(((wp.x - st.x) * t[0] + (wp.z - st.z) * t[1])).toFixed(1)}`); }
    else for (let a = 0; a < 8; a++) {
      const w5 = new Walker(wp.x, wp.z, wp.y), tg = [pc[0] + Math.cos(a * 0.785) * 40, pc[1] + Math.sin(a * 0.785) * 40]; w5.walkTo(tg[0], tg[1], 3.6, 12);
      const q = { u: (w5.x - st.x) * t[0] + (w5.z - st.z) * t[1], v: -((w5.x - st.x) * n[0] + (w5.z - st.z) * n[1]) };
      if (w5.fell || w5.y < pr.y - 0.3) { ok = false; log.push(`FELL off the pier dir ${a}: y ${w5.y.toFixed(2)} at u ${q.u.toFixed(1)} v ${q.v.toFixed(1)}`); }
    }
    log.push(`pier ${pr.len.toFixed(0)}x${pr.wid.toFixed(1)}`);
  }
  // a full run down and back up must work too
  const w4 = new Walker(...P(0, -1.6), 0); for (const [u, v] of route) w4.walkTo(...P(u, v)); for (const [u, v] of route.slice().reverse()) w4.walkTo(...P(u, v)); w4.walkTo(...P(0, -1.6));
  if (Math.abs(w4.y) > 0.15) { ok = false; log.push(`back up: y ${w4.y.toFixed(2)}`); }
  if (!ok) { bad++; console.log(`FAIL ${st.key} (${st.x.toFixed(0)}, ${st.z.toFixed(0)}):`, log.join(' | ')); } else if (verbose) console.log(`ok ${st.key} (${st.x.toFixed(0)}, ${st.z.toFixed(0)}) ${log.join(' | ')}`);
}
console.log(`descents tested: ${tested}, failed: ${bad}`);
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
