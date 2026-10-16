// tools/landmarksKamennoostrovsky-svc.mjs - service sanity (headless): entrances / photo spots of landmarksKamennoostrovsky are outside buildings; counts by kind
import { pathToFileURL } from 'node:url';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').split(path.sep).join('/') + '/';
class Ctx2D { constructor(c) { this.canvas = c; this.font = '10px sans-serif'; } measureText(t) { return { width: String(t).length * 9 }; } createLinearGradient() { return { addColorStop() {} }; } createRadialGradient() { return { addColorStop() {} }; } getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; } }
const proxy = (c) => new Proxy(new Ctx2D(c), { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
class FakeCanvas { constructor() { this.width = 300; this.height = 150; this.style = {}; } getContext(t) { return t === '2d' ? (this._c ||= proxy(this)) : null; } addEventListener() {} }
globalThis.window = globalThis; globalThis.self = globalThis;
globalThis.document = { createElement: (t) => (t === 'canvas' ? new FakeCanvas() : { style: {}, addEventListener() {}, appendChild() {} }), createElementNS: (n, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }), fonts: { load: async () => [] }, body: { appendChild() {} }, addEventListener() {} };
globalThis.Image = class { addEventListener() {} }; globalThis.HTMLCanvasElement = FakeCanvas; globalThis.OffscreenCanvas = FakeCanvas; globalThis.addEventListener = () => {}; globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1; globalThis.matchMedia = () => ({ matches: false, addEventListener() {} }); globalThis.requestAnimationFrame = (f) => setTimeout(f, 16);
const THREE = await import('three');
const { createContext } = await import(pathToFileURL(root + 'src/core/ctx.js').href);
const L = await import(pathToFileURL(root + 'src/world/layout.js').href);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
let ctx;
try { ctx = createContext({ scene, camera, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize(), quality: { name: 'high', petals: 1 }, audio: null }); } catch (e) { console.log('createContext signature differs:', e.message); process.exit(0); }
ctx.buildList = ['landmarksKamennoostrovsky'];
const mod = await import(pathToFileURL(root + 'src/world/landmarksKamennoostrovsky.js').href);
await mod.build(ctx);
const s = ctx.services.landmarksKamennoostrovsky;
const kinds = {}; for (const e of s.entrances) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
console.log('houses', s.houses.length, 'entrances', JSON.stringify(kinds), 'photoSpots', s.photoSpots.length, 'triangles', s.triangles, 'ms', s.buildMs);
console.log('entrances inside a building:', s.entrances.filter((e) => L.insideBuilding(e.x, e.z)).length, '| photo spots inside:', s.photoSpots.filter((p) => L.insideBuilding(p.x, p.z, 1)).map((p) => p.name).join('; ') || 0);
console.log('metro', JSON.stringify(s.entrances.filter((e) => e.kind === 'metro')));
// ---- walk probe of the Petrogradskaya doorway in the House of Fashion (data/metro.js DOORWAYS row petrogradskaya-in): the three middle leaves are open, the wall beside them is solid
{
  const Mt = await import(pathToFileURL(root + 'src/world/data/metro.js').href);
  const d = Mt.DOORWAYS.find((q) => q.id === 'petrogradskaya-in'), ph = ctx.physics;
  if (!d) console.log('no DOORWAYS row petrogradskaya-in: the doors stay closed');
  else {
    const n = [Math.sin(d.rotY), Math.cos(d.rotY)], xa = [n[1], -n[0]];                      // outward normal of the front, wall axis
    const walk = (x0, z0, x1, z1, label, open) => {
      const p = { x: x0, z: z0 }; let stuck = false; const k = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.1);
      for (let i = 1; i <= k; i++) { const t = i / k, tx = x0 + (x1 - x0) * t, tz = z0 + (z1 - z0) * t; p.x = tx; p.z = tz; ph.resolve(p, 0.4, 0, 1.7); if (Math.hypot(p.x - tx, p.z - tz) > 0.15) { stuck = true; break; } }
      const ok = open ? !stuck : stuck; console.log((ok ? 'ok   ' : 'FAIL ') + label + (stuck ? ' (blocked)' : ' (open)')); return ok;
    };
    const at = (u, o) => [d.x + xa[0] * u + n[0] * o, d.z + xa[1] * u + n[1] * o];
    let all = true;
    all &= walk(-2238, -3776, ...at(0, 1.5), 'pavement (-2238,-3776) -> in front of the doors', true);
    all &= walk(...at(0, 3), ...at(0, -4), 'through the middle leaf, 4 m into the ticket hall', true);
    all &= walk(...at(-1.5, 3), ...at(-1.5, -4), 'through the left open leaf', true);
    all &= walk(...at(1.5, 3), ...at(1.5, -4), 'through the right open leaf', true);
    all &= walk(...at(3.0, 3), ...at(3.0, -3), 'through an outer (closed) leaf', false);
    all &= walk(...at(-8, 3), ...at(-8, -3), 'through the wall 8 m beside the doors', false);
    console.log(all ? 'WALK: OK' : 'WALK: FAIL');
  }
}
// ---- walk probe of the Lenfilm portico (lenfilm.js): the way from the alley between the middle columns to the door is open, a column blocks, the podium is a walk box
{
  const en = s.entrances.find((e) => e.name === 'Ленфильм'), ph = ctx.physics;
  if (en) {
    const n = [Math.sin(en.rotY), Math.cos(en.rotY)], xa = [n[1], -n[0]], w0 = [en.x - n[0] * 4.6, en.z - n[1] * 4.6];          // w0 = the middle of the east front on the wall line
    const at = (u, o) => [w0[0] + xa[0] * u + n[0] * o, w0[1] + xa[1] * u + n[1] * o];
    const walk = (a, b, label, open) => { const p = { x: a[0], z: a[1] }; let stuck = false; const k = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1); for (let i = 1; i <= k; i++) { const t = i / k, tx = a[0] + (b[0] - a[0]) * t, tz = a[1] + (b[1] - a[1]) * t; p.x = tx; p.z = tz; ph.resolve(p, 0.4, 0, 1.7); if (Math.hypot(p.x - tx, p.z - tz) > 0.15) { stuck = true; break; } } const ok = open ? !stuck : stuck; console.log((ok ? 'ok   ' : 'FAIL ') + label + (stuck ? ' (blocked)' : ' (open)')); return ok; };
    let all = true;
    all &= walk(at(0, 22), at(0, 0.9), 'Lenfilm: alley -> between the middle columns -> in front of the door', true);
    all &= walk(at(1.5, 9), at(1.5, 0.9), 'Lenfilm: straight into a column', false);
    all &= walk(at(0, 0.9), at(0, -3), 'Lenfilm: through the closed door', false);
    const g = ph.groundHeight ? ph.groundHeight(...at(0, 2.0), 2) : null; console.log('Lenfilm podium height under the columns:', g);
    console.log(all ? 'LENFILM WALK: OK' : 'LENFILM WALK: FAIL');
  }
}
