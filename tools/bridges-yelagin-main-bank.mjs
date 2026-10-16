// tools/bridges-yelagin-main-bank.mjs - headless bank probe of the 1st and 3rd Yelagin bridge (src/world/bridges/yelaginMain.js): the wet intervals along both axes, and a WALK from the land beside every abutment
// toward the water (lateral lines at v = +-(hw + 0.3 ... 14) m, 3 m back from the bank line, walking 8 m on): the feet must never fall into the trench (an open edge of the quay opening).  Needs no browser.
// usage: node tools/bridges-yelagin-main-bank.mjs
// tools/environment-banks.mjs - walks a simulated player at the banks of the Mars Field reach (Swan Canal, Moika slope reach / garden quay, Fontanka north of the Moika source, Neva south bank x -1800..-800)
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
const bm = await import(pathToFileURL(path.join(root, 'src/world/bridges.js')).href); await bm.build(ctx);
const ph = ctx.physics;
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
const M = await import(pathToFileURL(path.join(root, 'src/world/bridges/yelaginMain.js')).href), S = await import(pathToFileURL(path.join(root, 'src/world/bridges/sites.js')).href);
let tested = 0, bad = 0;
const LG = await import(pathToFileURL(path.join(root, 'src/world/bridges/long.js')).href);
for (const q of ['yelagin1', 'yelagin3']) console.log(q, 'info', JSON.stringify(ctx.services[q].info));
for (const sp of [M.Y1, M.Y3]) {
  const HL = sp.len / 2, wet = (u, v) => { const w = S.toWorld(sp, u, v); return !!L.waterwayAt(w.x, w.z); };
  let b0 = null, b1 = null; for (let u = -HL - 20; u <= HL + 20; u += 0.25) if (wet(u, 0)) { if (b0 === null) b0 = u; b1 = u; }
  console.log(sp.id, 'wet interval on the axis u', b0, '..', b1, 'deck', -HL, '..', HL);
  for (const [dir, ub] of [[1, b0], [-1, b1]]) {
    if (process.argv.includes('--bank')) { const o = []; for (let v = -16; v <= 16; v += 2) o.push(v + ':' + (LG.bankU(L, sp, v, ub, dir) ?? 'null') ); console.log(sp.id, 'bankU end', dir > 0 ? 'A' : 'B', o.join(' ')); }
    for (let v = -(sp.hw + 0.3); Math.abs(v) <= 16; v += (v < 0 ? -1 : 1) * 0 + 1) {
      // lines parallel to the axis: start 3 m on the land side of the bank line, walk across the bank line and 8 m beyond
      if (Math.abs(v) < 0) continue;
    }
    for (const v of [-14, -10, -8, -7, -6.8, -6.5, -6.3, -6, 6, 6.3, 6.5, 6.8, 7, 8, 10, 14]) {
      const a = S.toWorld(sp, ub - dir * 3.5, v), t = S.toWorld(sp, ub + dir * 7, v), w = new Walker(a.x, a.z, 0); tested++;
      const wet0 = L.waterwayAt(a.x, a.z); if (wet0) continue;
      w.walkTo(t.x, t.z, 3.6, 4);
      const fell = w.fell || w.y < -0.8;
      if (fell) { bad++; console.log('OPEN EDGE', sp.id, 'end', dir > 0 ? 'A' : 'B', 'v', v, 'feet y', w.y.toFixed(2), 'at', w.x.toFixed(1), w.z.toFixed(1)); }
    }
  }
}
console.log('lateral walks', tested, 'open edges', bad, bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
