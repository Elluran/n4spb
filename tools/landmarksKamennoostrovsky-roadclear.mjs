// tools/landmarksKamennoostrovsky-roadclear.mjs - which footprint edges of the houses of landmarksKamennoostrovsky stand closer than 0.5 m to the asphalt of streets (net.cover > -0.5)? Headless: builds streets only.
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
const { ringEdges } = await import(pathToFileURL(root + 'src/world/landmarksKamennoostrovsky/kit.js').href);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
const ctx = createContext({ scene, camera, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize(), quality: { name: 'high', petals: 1 }, audio: null });
ctx.buildList = ['streets', 'landmarksKamennoostrovsky'];
const t0 = Date.now();
await (await import(pathToFileURL(root + 'src/world/streets.js').href)).build(ctx);
const net = ctx.services.streets.net; console.log('streets built in', Date.now() - t0, 'ms; net.cover:', typeof net.cover);
const ids = L.GROUPS.landmarksKamennoostrovsky.flatMap((g) => g.ids);
const { clearOfRoad } = await import(pathToFileURL(root + 'src/world/landmarksKamennoostrovsky/house.js').href);
const { ringFromFlat } = await import(pathToFileURL(root + 'src/world/lib/massing.js').href);
const FINAL = process.argv.includes('--final');
const RK = { minRank: 1 };                                             // real streets only: service lanes and the passages through the houses (rank 0) do not count
let n = 0;
for (const id of ids) {
  const b = L.buildingById(id); if (!b) continue;
  for (const p0 of b.polys) {
   const p = FINAL ? clearOfRoad(ctx, p0, id) : p0;                       // --final: the footprint as house.js builds it (corners on the asphalt pulled back)
   if (p !== p0) { const a = ringFromFlat(p0.o), q = ringFromFlat(p.o); a.forEach((v, i) => { if (Math.hypot(v[0] - q[i][0], v[1] - q[i][1]) > 0.005) console.log(`${id}: corner (${v[0]}, ${v[1]}) -> (${q[i][0]}, ${q[i][1]}) moved ${Math.hypot(v[0] - q[i][0], v[1] - q[i][1]).toFixed(2)} m, cover ${net.cover(v[0], v[1], RK).toFixed(2)} -> ${net.cover(q[i][0], q[i][1], RK).toFixed(2)}`); }); }
   for (const e of ringEdges(p, 0.05)) {
    if (e.hole) continue;
    let c0 = -99, c1 = -99; const k = Math.max(2, Math.ceil(e.len / 0.3));
    for (let i = 0; i <= k; i++) { const t = i / k, x = e.a[0] + (e.b[0] - e.a[0]) * t, z = e.a[1] + (e.b[1] - e.a[1]) * t; const a = net.cover(x, z, RK), o = net.cover(x + e.n[0] * 0.45, z + e.n[1] * 0.45, RK); if (a > c0) c0 = a; if (o > c1) c1 = o; }
    if (c1 > -0.5 || c0 > -0.5) { n++; console.log(`${id} edge ${e.i} (${e.a[0].toFixed(1)}, ${e.a[1].toFixed(1)}) -> (${e.b[0].toFixed(1)}, ${e.b[1].toFixed(1)}) len ${e.len.toFixed(1)}: cover at the wall ${c0.toFixed(2)}, at the collider face (+0.45) ${c1.toFixed(2)}`); }
   }
  }
}
console.log(n, 'edges of the claimed houses closer than 0.5 m to the asphalt of a street (cover > -0.5, rank >= 1)');
// the round corner bodies that start at the ground (tolstoy.js Chubakov corner, austrian.js Lipgart tower)
for (const [name, cx, cz, r] of [['Chubakov corner', -2222.7, -3699.4, 3.1], ['Lipgart tower', -1904.4, -3028.0, 2.7]]) { let c = -99; for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r; if (!L.insideBuilding(x, z)) c = Math.max(c, net.cover(x, z, RK)); } console.log(name, 'max cover on its ground outline', c.toFixed(2)); }
// ---- detail of one edge: node tools/landmarksKamennoostrovsky-roadclear.mjs --edge <id>,<edge index>
{
  const arg = process.argv.find((a) => a.startsWith('--edge=')); if (arg) {
    const [id, k] = arg.slice(7).split(','), b = L.buildingById(id);
    for (const p of b.polys) for (const e of ringEdges(p, 0.05)) {
      if (e.hole || Math.abs(e.i - Number(k)) > 1) continue;
      const row = []; for (let i = 0; i <= 8; i++) { const t = i / 8, x = e.a[0] + (e.b[0] - e.a[0]) * t, z = e.a[1] + (e.b[1] - e.a[1]) * t; row.push([0, 0.45, -0.3, -0.6, -0.9].map((o) => net.cover(x + e.n[0] * o, z + e.n[1] * o, RK).toFixed(2)).join('/')); }
      console.log(`edge ${e.i} len ${e.len.toFixed(1)} n (${e.n[0].toFixed(2)}, ${e.n[1].toFixed(2)}): cover at offsets 0 / +0.45 / -0.3 / -0.6 / -0.9 along the edge:\n   ` + row.join('  '));
    }
  }
}
// ---- the facade labels (street plates) that streets hung near a point: --labels=x,z,r
{
  const arg = process.argv.find((a) => a.startsWith('--labels=')); if (arg && ctx.services.labels) {
    const [x, z, r] = arg.slice(9).split(',').map(Number);
    for (const l of ctx.services.labels.list()) if (Math.hypot(l.x - x, l.z - z) < r) console.log('label', l.kind, 'bld', l.bld, 'at', l.x.toFixed(2), l.y.toFixed(2), l.z.toFixed(2), 'size', l.w, l.h, 'n', l.nx.toFixed(2), l.nz.toFixed(2));
  }
}
