// tools/landmarksVOStatues-walk.mjs - headless probe of landmarksVOStatues (no GPU, the module alone: ground = layout.js, colliders of the module):
//   1. every drawn piece: the pieces list with position, yaw, and the camera strings for tools/shot.mjs (close 3 m eye level, medium 8 m, overview 22 m up) -> --cams
//   2. WALK: from 3.2 m in front of each piece the walker goes straight at its centre: it must be stopped by the collider before it gets within 0.35 m of the centre (plinths and basins are solid)
//   3. every piece must stand off the carriageway: layout.isOnRoad(x, z, 0.4) false
// usage: node tools/landmarksVOStatues-walk.mjs [--json out.json] [--only key,key]
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), opt = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };

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

const THREE = await import('three');
const { createContext } = await import(pathToFileURL(path.join(root, 'src/core/ctx.js')).href);
const { createAudio } = await import(pathToFileURL(path.join(root, 'src/core/audio.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
camera.position.set(0, 1.6, 30);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio; try { audio = createAudio(); } catch (e) { audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.buildList = ['landmarksVOStatues'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksVOStatues.js')).href);
await mod.build(ctx);
const ph0 = ctx.physics; void ph0;

const svc = ctx.services.landmarksVOStatues, ph = ctx.physics, out = [];
const deg = (r) => (((r * 180 / Math.PI) % 360) + 540) % 360 - 180;
let bad = 0;
const only = opt('only') ? new Set(opt('only').split(',')) : null;
for (const m of svc.monuments) {
  const key = Object.keys(svc.parts).find((k) => svc.parts[k] && svc.parts[k].id === m.id) || m.id;
  if (only && !only.has(key)) continue;
  const yaw = svc.parts[key] && svc.parts[key].yaw !== undefined ? svc.parts[key].yaw : 0;
  const fx = Math.sin(yaw), fz = Math.cos(yaw), cam = (d, eye, pitch) => `${(m.x + fx * d).toFixed(1)},${(m.z + fz * d).toFixed(1)},${deg(yaw).toFixed(0)},${pitch}`;
  const cams = { close: cam(3, 0, 6), medium: cam(8, 0, 6), over: `${(m.x + fx * 22).toFixed(1)},14,${(m.z + fz * 22).toFixed(1)},${deg(yaw).toFixed(0)},-22` };
  // walk straight at the centre from 3.2 m in front
  const d0 = (svc.parts[key] && svc.parts[key].probe) || 3.2, p = { x: m.x + fx * d0, z: m.z + fz * d0 }; let y = 0, stopped = null;
  for (let i = 0; i < Math.round(d0 * 12); i++) {
    const tx = p.x - fx * 0.1, tz = p.z - fz * 0.1; p.x = tx; p.z = tz;
    ph.resolve(p, 0.35, y, 1.7);
    if (Math.hypot(p.x - tx, p.z - tz) > 0.04) { stopped = Math.hypot(p.x - m.x, p.z - m.z); break; }
    const g = ph.groundHeight(p.x, p.z, y, false); if (Number.isFinite(g)) y = g;
  }
  const dEnd = Math.hypot(p.x - m.x, p.z - m.z), onRoad = L.isOnRoad(m.x, m.z, 0.4);
  const open = svc.parts[key] && svc.parts[key].open, ok = (open || (stopped !== null && dEnd > 0.3)) && !onRoad;
  if (!ok) bad++;
  out.push({ key, id: m.id, name: m.name, h: m.h, x: +m.x.toFixed(1), z: +m.z.toFixed(1), yawDeg: +deg(yaw).toFixed(0), cams, blockedAt: stopped === null ? null : +stopped.toFixed(2), onRoad, ok });
  console.log((ok ? 'ok   ' : 'FAIL ') + key.padEnd(18) + `(${m.x.toFixed(1)}, ${m.z.toFixed(1)}) yaw ${deg(yaw).toFixed(0).padStart(4)}  ` + (stopped === null ? 'NOT BLOCKED' : `blocked at ${stopped.toFixed(2)} m`) + (onRoad ? '  ON ROAD' : ''));
}
// claims vs drawn: every claimed id must have been drawn (a claim of an undrawn object makes a hole in the city) and every drawn id must be claimed
{
  const G = await import(pathToFileURL(path.join(root, 'src/world/landmarksVOStatues/groups.js')).href);
  const claimed = new Set(G.GROUPS_LIST.flatMap((g) => [...(g.ids || []), ...(g.osm || [])])), drawn = new Set(svc.drawn);
  const missing = [...claimed].filter((i) => !drawn.has(i)), extra = [...drawn].filter((i) => !claimed.has(i));
  console.log(missing.length || extra.length ? `CLAIMS MISMATCH: claimed but not drawn [${missing.join(' ')}], drawn but not claimed [${extra.join(' ')}]` : `claims OK (${claimed.size} ids claimed and drawn)`);
  if (missing.length || extra.length) bad++;
}
if (opt('json')) fs.writeFileSync(opt('json'), JSON.stringify(out, null, 1));
console.log(bad ? `PROBE: ${bad} problem(s)` : 'PROBE OK', `(${out.length} pieces, drawn ids ${svc.drawn.length}, tris ${svc.triangles})`);
process.exit(bad ? 1 : 0);
