// tools/landmarksKirova-kinds.mjs - draw-call account of landmarksKirova WITHOUT a GPU: builds the module alone (DOM stubs, as tools/check.mjs), runs the real static batching (core/batch2.js) and reports
//   * the module totals: triangles, meshes, instanced meshes, materials created / used, build ms
//   * the batched meshes (= the draw calls of the colour pass) by material KIND, and for each postcard pose the number of them inside the view frustum (eye 1.7 m, fov 62, aspect 16/9, far 700)
// usage: node tools/landmarksKirova-kinds.mjs [--list] [--parts dk,erarta,garden,sobchak]       (KIR_PARTS also works)
// The emulation counts only the module's own meshes: the measured delta of tools/shot.mjs (module on - off) is this number minus the generic objects that the claims replace.
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
globalThis.HTMLCanvasElement = FakeCanvas; globalThis.OffscreenCanvas = FakeCanvas; globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16); globalThis.addEventListener = () => {};
globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1; globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
const args = process.argv.slice(2);
const pi = args.indexOf('--parts'); if (pi >= 0) process.env.KIR_PARTS = args[pi + 1];
const THREE = await import('three');
const { createContext } = await import(pathToFileURL(path.join(root, 'src/core/ctx.js')).href);
const { createAudio } = await import(pathToFileURL(path.join(root, 'src/core/audio.js')).href);
const { batchStatic } = await import(pathToFileURL(path.join(root, 'src/core/batch2.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const { POST, DETAIL, parseCam } = await import(pathToFileURL(path.join(root, 'tools/landmarksKirova-cams.mjs')).href);

const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 700);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio; try { audio = createAudio(); } catch (e) { audio = null; }
const ctx = createContext({ scene, camera, renderer: null, audio, quality: { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 }, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} }; ctx.buildList = ['landmarksKirova'];
const before = new Set(); scene.traverse((o) => before.add(o));
const t0 = Date.now();
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksKirova.js')).href);
await mod.build(ctx);
const buildMs = Date.now() - t0;
scene.updateMatrixWorld(true);
let tris = 0, meshes = 0, inst = 0; const mats = new Set();
scene.traverse((o) => { if (before.has(o) || !o.isMesh) return; meshes++; if (o.isInstancedMesh) inst++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); mats.add(o.material); });
const names = [...mats].map((m) => m.name || '?').sort();
const kindOfPre = (m) => { const t = m.userData && m.userData.toon; return `${m.type.replace('Material', '')}${m.map ? '+map' : ''}${m.transparent ? '+tr' : ''}${m.alphaTest ? '+at' : ''}${m.side === THREE.DoubleSide ? '+dbl' : ''}${t && t.polygonOffset ? '+po' + t.polygonOffset : ''}${m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0 ? '+em' + m.emissiveIntensity : ''}`; };
const mapName = new Map(); for (const m of mats) if (m.map) mapName.set(m.map, (m.name || '?').replace('lmKir-', ''));
const members = new Map();
scene.traverse((o) => { if (before.has(o) || !o.isMesh || o.isInstancedMesh) return; const m = o.material; const lab = kindOfPre(m) + (o.castShadow ? '' : '/nc') + (o.layers.mask === 1 ? '' : '/noOL'); if (!members.has(lab)) members.set(lab, new Set()); members.get(lab).add((m.name || '?').replace('lmKir-', '')); });
const b = batchStatic(ctx.staticRoot, { mat: ctx.mat });
const out = []; ctx.staticRoot.updateMatrixWorld(true); ctx.staticRoot.traverse((o) => { if (o.isMesh) out.push(o); });          // every drawable of the module: the merged meshes, the cut single ones and the instanced meshes (a call each)
const box = new THREE.Box3(), c = new THREE.Vector3();
const kindOf = (m) => { const t = m.userData && m.userData.toon; return `${m.type.replace('Material', '')}${m.map ? (m.map.image && m.map.image.width === 4096 ? '+atlas' : '+map:' + (mapName.get(m.map) || '?')) : ''}${m.transparent ? '+tr' : ''}${m.alphaTest ? '+at' : ''}${m.side === THREE.DoubleSide ? '+dbl' : ''}${t && t.polygonOffset ? '+po' + t.polygonOffset : ''}${m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0 ? '+em' : ''}${m.userData && m.userData.fkind ? '+' + m.userData.fkind : ''}`; };
const rows = out.map((o) => { o.geometry.computeBoundingBox(); if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); box.copy(o.geometry.boundingBox); box.getCenter(c); return { o, kind: kindOf(o.material) + (o.isInstancedMesh ? '/inst' : '') + (o.castShadow ? '' : '/nc'), n: (o.geometry.index ? o.geometry.index.count / 3 : 0) | 0, cx: c.x, cz: c.z, sph: o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld) }; });
const hist = {}; for (const r of rows) hist[r.kind] = (hist[r.kind] || 0) + 1;
console.log(JSON.stringify({ buildMs, triangles: Math.round(tris), meshes, instancedMeshes: inst, materialsCreated: mats.size, drawables: rows.length, batch: { merged: b.merged, sharedMaterials: b.sharedMaterials, atlas: b.atlasTextures } }));
console.log('kinds:', JSON.stringify(hist));
if (args.includes('--list')) console.log('materials:', names.join(' '));
if (args.includes('--members')) for (const [k, v] of [...members].sort()) console.log('  ' + k + ': ' + [...v].join(' '));
const frustumCount = (cam) => {
  camera.position.set(cam[0], cam.length === 4 ? 1.7 : cam[1], cam.length === 4 ? cam[1] : cam[2]);
  const yaw = cam.length === 4 ? cam[2] : cam[3], pitch = cam.length === 4 ? cam[3] : cam[4];
  camera.rotation.order = 'YXZ'; camera.rotation.set(pitch * Math.PI / 180, yaw * Math.PI / 180, 0); camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
  const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const k = {}; let n = 0;
  for (const r of rows) { if (!fr.intersectsSphere(r.sph)) continue; n++; k[r.kind] = (k[r.kind] || 0) + 1; }
  return { n, k };
};
for (const [grp, list] of [['post', POST], ['detail', DETAIL]]) for (const [name, s] of Object.entries(list)) {
  if (grp === 'detail' && !args.includes('--detail')) continue;
  const r = frustumCount(parseCam(s)); console.log(`${grp}.${name}: ${r.n} meshes in view`, args.includes('--list') ? JSON.stringify(r.k) : '');
}
