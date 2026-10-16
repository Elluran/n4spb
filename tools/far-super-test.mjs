// Far super-cells and the large-piece range audit (plan 2026-10-15 items 1a / 1b). CPU only; no WebGL context.
//  * LOD.addSuper: for every camera / quality scale exactly one of {merged super draw, member} is on for each member; near the player members behave as before.
//  * batchStatic: far proxies of 4 x 4 sectors merge into one 'far-super' draw; the super only shows where every member far proxy would show; merged triangles are the
//    members' triangles (minus sub-0.05 m2 triangles below the skyline top), positions/colours exact.
//  * largePieceFar: skyline, tall masses, deep and large surfaces keep Infinity; fine / low detail pieces get FAR_L_FINE / FAR_L_LOW.
//  * concatGeometries / superCells (ground) / silhouetteBins.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LOD, SECTOR } from '../src/core/lod.js';
import { batchStatic, SUPER, mergeFarGeometries } from '../src/core/batch2.js';
import { createMaterials } from '../src/core/materials.js';
import { largePieceFar, concatGeometries, superCells, registerLOD, FAR_SWITCH, FAR_L_FINE, FAR_L_LOW } from '../src/core/spatial.js';
import { silhouetteBins } from '../src/core/region-streamer.js';

let seed = 90210; const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const visible = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };

// ---- 1. batchStatic: a far district of building blocks (far proxies) plus low detail pieces
const root = new THREE.Group(); LOD.init(root);
const mat = createMaterials({});
const facade = mat.toon('#b0a090'), glass = mat.toon('#88aacc', { transparent: true, opacity: 0.5 });
const X0 = 3000, Z0 = -2600;
for (let i = 0; i < 90; i++) {
  const w = 20 + rand() * 30, h = 12 + rand() * 18, b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 18), facade);
  b.position.set(X0 + rand() * 2400, h / 2, Z0 + rand() * 2400); root.add(b);
  const g = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 1, 4), glass); g.position.set(b.position.x, 3.5, b.position.z + 11); root.add(g);      // low transparent canopy (an L piece outside the far proxies): range audit
}
const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 2, 70, 6), glass); spire.position.set(X0 + 600, 35, Z0 + 600); root.add(spire);      // tall transparent: skyline keeps Infinity
const stats = batchStatic(root, { mat, atlasTextures: false, nearCell: 192, farCell: 640 });
assert(stats.farProxies > 4, 'far proxies built'); assert(stats.farSuper.cells >= 1, 'super cells built');
assert(stats.rangeAudit.pieces > 0 && (stats.rangeAudit.why.low || stats.rangeAudit.why.fine), 'low transparent pieces audited to a finite range');
assert(stats.rangeAudit.why.skyline >= 1, 'spire kept on the skyline');
const proxies = [], supers = [];
root.traverse(o => { if (o.name === 'far-proxy') proxies.push(o); if (o.name === 'far-super') supers.push(o); });
const members = new Map(); for (const s of supers) members.set(s, proxies.filter(p => { const it = LOD.of(p); return it.until && it.ux === LOD.of(s).cx && it.uz === LOD.of(s).cz; }));
for (const [s, list] of members) {
  assert.equal(s.userData.superCell, list.length); assert(list.length >= 2);
  // geometry: every merged triangle exists in a member (exact positions and colours)
  const key = (p, c, i) => [p.getX(i), p.getY(i), p.getZ(i), c.getX(i), c.getY(i), c.getZ(i)].map(v => v.toFixed(4)).join();
  const pool = new Set(); let memberTris = 0;
  for (const m of list) { const g = m.geometry, ia = g.index.array; memberTris += ia.length / 3; for (let t = 0; t < ia.length; t += 3) pool.add([0, 1, 2].map(j => key(g.attributes.position, g.attributes.color, ia[t + j])).join('|')); }
  const g = s.geometry, ia = g.index.array;
  for (let t = 0; t < ia.length; t += 3) assert(pool.has([0, 1, 2].map(j => key(g.attributes.position, g.attributes.color, ia[t + j])).join('|')), 'merged triangle comes from a member');
  assert(ia.length / 3 <= memberTris);
}
const undecimated = mergeFarGeometries(proxies.slice(0, 2).map(p => p.geometry), 0);
assert.equal(undecimated.index.count, proxies[0].geometry.index.count + proxies[1].geometry.index.count, 'no decimation keeps every triangle');
// switching: random cameras and scales
const camera = new THREE.PerspectiveCamera(62, 1.7, 0.25, 7000), p = new THREE.Vector3();
let checks = 0, superOn = 0, memberOn = 0; const frustum = new THREE.Frustum();
for (let n = 0; n < 1500; n++) {
  LOD.scale = [1, 0.8, 0.56, 0.6, 1.3][n % 5];
  p.set(X0 - 3000 + rand() * 8400, 1.7, Z0 - 3000 + rand() * 8400); camera.position.set(p.x, 2 + rand() * 80, p.z);
  camera.lookAt(X0 + 1200 + (rand() - 0.5) * 600, 10, Z0 + 1200 + (rand() - 0.5) * 600); camera.updateMatrixWorld();
  LOD.update(p, camera, { shadowR: 110, ndFar: 150 }); frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  for (const [s, list] of members) {
    const sIt = LOD.of(s), dS = Math.hypot(p.x - sIt.cx, p.z - sIt.cz), lim = sIt.near * LOD.scale + sIt.nearR;
    for (const m of list) {
      const it = LOD.of(m), sec = { x: (Math.floor(it.cx / SECTOR) + 0.5) * SECTOR, z: (Math.floor(it.cz / SECTOR) + 0.5) * SECTOR };
      const rec = LOD.sectors.get((Math.floor(it.cx / SECTOR) + 4096) * 8192 + Math.floor(it.cz / SECTOR) + 4096);
      const inView = frustum.intersectsSphere(new THREE.Sphere(new THREE.Vector3(rec.cx, camera.position.y, rec.cz), rec.r));
      const own = inView && Math.hypot(p.x - sec.x, p.z - sec.z) >= FAR_SWITCH * LOD.scale;      // the member's own (old) rule, effective visibility
      if (dS >= lim) { assert.equal(visible(m), false, 'member hidden under its super'); if (visible(s)) assert(Math.hypot(p.x - sec.x, p.z - sec.z) >= FAR_SWITCH * LOD.scale, 'super only replaces members past their switch'); }
      else assert.equal(visible(m), own, 'member keeps its own rule near the player');
      assert.notEqual(visible(s) && visible(m), true, 'never both');
      checks++;
    }
    if (visible(s)) superOn++;
  }
  for (const m of proxies) if (visible(m)) memberOn++;
}
assert(superOn > 0 && memberOn > 0, 'both regimes exercised');
LOD.scale = 1;

// ---- 2. range audit classes
const box = (w, h, d, y, segs = 1) => { const g = new THREE.BoxGeometry(w, h, d, segs, segs, segs); g.translate(0, y, 0); return g; };
assert.equal(largePieceFar(box(4, 70, 4, 35)).why, 'skyline');
assert.equal(largePieceFar(box(60, 20, 30, 10)).why, 'mass', 'a building block keeps Infinity');
assert.equal(largePieceFar(box(60, 1, 2, -6), null, -3).why, 'deep');
assert.equal(largePieceFar(box(400, 0.3, 300, 0)).far, Infinity, 'a large flat surface with large triangles stays');
assert.equal(largePieceFar(box(60, 1.2, 0.3, 0.6, 60)).far, FAR_L_FINE, 'a railing with fine features');
assert.equal(largePieceFar(box(80, 0.3, 60, 0)).far, FAR_L_LOW, 'a pond-sized low piece');

// ---- 3. concat + ground-style super cells + silhouette bins
const a = new THREE.PlaneGeometry(10, 10, 2, 2), b = new THREE.PlaneGeometry(10, 10, 3, 1).translate(30, 0, 0);
const c = concatGeometries([a, b]);
assert.equal(c.attributes.position.count, a.attributes.position.count + b.attributes.position.count);
assert.equal(c.index.count, a.index.count + b.index.count);
for (let i = 0; i < b.index.count; i++) assert.equal(c.index.getX(a.index.count + i), b.index.getX(i) + a.attributes.position.count);
assert.equal(concatGeometries([a, new THREE.BufferGeometry().setAttribute('position', a.attributes.position)]), null, 'different layouts are refused');
const groundRoot = new THREE.Group(); root.add(groundRoot); const gm = mat.toon('#556644'), pieces = [];
for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2).translate(-8000 + i * 640, 0, 9000 + j * 640), gm); groundRoot.add(m); m.updateMatrixWorld(true); registerLOD(m, Infinity); pieces.push(m); }
const made = superCells(pieces, 1920, 1500); assert(made >= 2, 'ground super cells');
const gs = groundRoot.children.filter(m => m.userData.superCell);
for (let n = 0; n < 400; n++) {
  LOD.scale = [1, 0.8, 0.56][n % 3]; p.set(-9000 + rand() * 7000, 1.7, 8000 + rand() * 7000); camera.position.set(p.x, 3, p.z); camera.lookAt(-6000, 0, 10500); camera.updateMatrixWorld();
  LOD.update(p, camera, {}); frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  for (const s of gs) { const it = LOD.of(s); for (const m of pieces) { const mi = LOD.of(m); if (mi.ux !== it.cx || mi.uz !== it.cz) continue; checks++;
    const under = !(Math.hypot(p.x - it.cx, p.z - it.cz) < it.near * LOD.scale + it.nearR);
    if (under) assert.equal(m.visible, false, 'ground member hidden under its super'); else if (frustum.intersectsObject(m)) assert.equal(m.visible, true, 'ground member in view draws near the player');
    assert(!(s.visible && m.visible), 'never both');
    const outside = Math.max(0, Math.abs(p.x - it.cx) - 960, Math.abs(p.z - it.cz) - 960); if (s.visible) assert(outside > 0, 'super ground never under the player'); } }
}
const bins = silhouetteBins([{ key: '0_0' }, { key: '2_2' }, { key: '3_0' }, { key: '-1_-1' }, { key: '-3_-3' }, { key: '-4_0' }]);
assert.deepEqual([...bins.keys()].sort(), ['-1_-1', '-2_0', '0_0', '1_0'].sort()); assert.equal(bins.get('0_0').length, 2); assert.equal(bins.get('-1_-1').length, 2);
console.log(`RESULT: OK (${stats.farProxies} far proxies -> ${stats.farSuper.cells} super cells for ${stats.farSuper.members} members, triangles ${stats.farSuper.trianglesIn} -> ${stats.farSuper.trianglesOut}; range audit ${JSON.stringify(stats.rangeAudit.why)}; ${made} ground supers; ${checks} exclusive-switch checks)`);
