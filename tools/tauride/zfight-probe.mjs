// zfight-probe.mjs - T8a: build environment, landmarksTauride, streets, city (the real modules, stub env) and cast rays DOWN over a box (or the 11 gate zones): every pair of opaque surfaces that cover the same (x, z) within `eps` metres in height is a z-fight candidate (the layers of the meshes are all enabled; instanced meshes and decals are skipped).
// node tools/area.mjs north tools/tauride/zfight-probe.mjs --box x0,x1,z0,z1 | --gates [--step 0.5] [--eps 0.02] [--mods environment,landmarksTauride,streets,city] [--dump "x,z;x,z"]
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const args = Object.fromEntries(process.argv.slice(2).reduce((a, s, i, all) => (s.startsWith('--') ? [...a, [s.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const SE = await imp('tools/tauride/lib/stub-env.mjs');
const eng = await SE.loadEngine(ROOT);
const { THREE } = eng;
const names = String(args.mods || 'environment,landmarksTauride,streets,city').split(',');
const { ctx } = SE.makeContext(eng, names);
for (const n of names) await SE.buildModules(eng, ctx, [n]);
const Fu = await imp('src/world/landmarksTauride/data/furniture.js');
const boxes = args.gates ? Fu.GATES.map((g) => [g.id, g.x - 12, g.x + 12, g.z - 12, g.z + 12]) : [['box', ...String(args.box || '925,945,-1420,-1404').split(',').map(Number)]];
const step = Number(args.step || 0.5), eps = Number(args.eps || 0.02);
const meshes = []; ctx.staticRoot.traverse((o) => { if (o.isMesh && o.geometry.getAttribute('position')) { o.updateWorldMatrix(true, false); meshes.push(o); } });
console.log('meshes', meshes.length);
const rc = new THREE.Raycaster(); rc.firstHitOnly = false; rc.layers.enableAll();
let rays = 0;
if (args.dump) { for (const s of String(args.dump).split(';')) { const [x, z] = s.split(',').map(Number); rc.set(new THREE.Vector3(x, 80, z), new THREE.Vector3(0, -1, 0)); rc.near = 0; rc.far = 200; const hits = rc.intersectObjects(meshes, false); console.log(`stack at ${x},${z}:`); for (const h of hits) console.log(`  y ${h.point.y.toFixed(4)} ${h.object.name} mat=${h.object.material.name || h.object.material.type} layers=${h.object.layers.mask} side=${h.object.material.side} tr=${h.object.material.transparent}`); } }
const side = (m) => (Array.isArray(m) ? m[0] : m).side;
for (const [bid, x0, x1, z0, z1] of boxes) {
const pairs = new Map();
const wb = new THREE.Box3(), mine = meshes.filter((m) => { if (m.isInstancedMesh) return false; if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); wb.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); return wb.max.x >= x0 && wb.min.x <= x1 && wb.max.z >= z0 && wb.min.z <= z1; });
for (let x = x0; x <= x1; x += step) for (let z = z0; z <= z1; z += step) {
  rc.set(new THREE.Vector3(x, 80, z), new THREE.Vector3(0, -1, 0)); rc.near = 0; rc.far = 200; rays++;
  const hits = rc.intersectObjects(mine, false).filter((h) => { const m = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material; return !/treeblob/.test(h.object.name) && (!m.transparent || (m.opacity ?? 1) > 0.9); });
  hits.sort((a, b) => b.point.y - a.point.y);
  for (let i = 0; i + 1 < hits.length; i++) for (let j = i + 1; j < hits.length; j++) {
    const d = hits[i].point.y - hits[j].point.y; if (d > eps) break;
    const a = hits[i].object, b = hits[j].object; if (a === b && hits[i].faceIndex === hits[j].faceIndex) continue;
    const key = `${a.name}|${b.name}`; const e = pairs.get(key) || { n: 0, minD: 9, maxD: 0, ya: hits[i].point.y, la: a.layers.mask, lb: b.layers.mask, ma: (a.material.name || a.material.type), mb: (b.material.name || b.material.type), x0: x, x1: x, z0: z, z1: z };
    e.n++; e.minD = Math.min(e.minD, Math.abs(d)); e.maxD = Math.max(e.maxD, Math.abs(d)); e.x0 = Math.min(e.x0, x); e.x1 = Math.max(e.x1, x); e.z0 = Math.min(e.z0, z); e.z1 = Math.max(e.z1, z); pairs.set(key, e);
  }
}
console.log('== ' + bid + ' rays so far ' + rays);
for (const [k, e] of [...pairs].sort((a, b) => b[1].n - a[1].n)) console.log(`${k}  n=${e.n} dy ${e.minD.toFixed(4)}..${e.maxD.toFixed(4)} x ${e.x0}..${e.x1} z ${e.z0}..${e.z1} y~${e.ya.toFixed(3)} layers ${e.la}/${e.lb} mats ${e.ma} / ${e.mb}`);
}
