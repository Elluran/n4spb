// Page-side draw audit (runs inside the scene page; tools/perf-scan.mjs loads it through shot.mjs --eval).
// For the current camera it lists what the colour pass would draw: triangles per distance band, per root / name family and the biggest meshes,
// using the same frustum + layer tests as three.js (bounding sphere vs the camera frustum).
import * as THREE from 'three';

const bands = [50, 100, 200, 400, 800, 1600, 3200, 1e9];
export function scan({ mask = (1 << 0) | (1 << 1) | (1 << 3), far = null, top = 40 } = {}) {
  const ctx = window.__ctx, cam = ctx.camera, scene = ctx.scene;
  const cam2 = cam.clone(); if (far) { cam2.far = far; cam2.updateProjectionMatrix(); }
  cam2.updateMatrixWorld();
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam2.projectionMatrix, cam2.matrixWorldInverse));
  const sphere = new THREE.Sphere();
  const rows = [], byBand = new Array(bands.length).fill(0), byFamily = {}, byRoot = {};
  let total = 0, calls = 0, culled = 0, hiddenTris = 0;
  const topOf = (o) => { let p = o; while (p.parent && p.parent !== ctx.staticRoot && p.parent !== ctx.dynamicRoot && p.parent !== scene) p = p.parent; return p; };
  const walk = (o, vis) => {
    vis = vis && o.visible;
    if (o.isMesh || o.isLine || o.isPoints) {
      const g = o.geometry; if (!g || !g.attributes.position) return;
      const n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      if (!vis) { hiddenTris += n; return; }
      if (!(o.layers.mask & mask)) return;
      if (o.frustumCulled) {
        if (o.isInstancedMesh) { if (!o.boundingSphere) o.computeBoundingSphere(); sphere.copy(o.boundingSphere); }
        else { if (!g.boundingSphere) g.computeBoundingSphere(); sphere.copy(g.boundingSphere); }
        sphere.applyMatrix4(o.matrixWorld);
        if (!frustum.intersectsSphere(sphere)) { culled += n; return; }
      } else { if (!g.boundingSphere) g.computeBoundingSphere(); sphere.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); }
      const d = Math.max(0, sphere.center.distanceTo(cam.position) - sphere.radius);
      let b = 0; while (d > bands[b]) b++;
      byBand[b] += n; total += n; calls++;
      const t = topOf(o), root = o.parent === null ? '?' : (ctx.staticRoot.children.includes(t) ? 'static' : ctx.dynamicRoot.children.includes(t) ? 'dynamic' : 'scene');
      const fam = (o.name || t.name || o.type).replace(/[-_|: ]?\d+.*$/, '') || t.type;
      const key = root + '/' + fam;
      byFamily[key] = (byFamily[key] || 0) + n; byRoot[root] = (byRoot[root] || 0) + n;
      rows.push({ n: Math.round(n), d: Math.round(d), r: Math.round(sphere.radius), name: o.name || '', top: t.name || t.type, inst: o.isInstancedMesh ? o.count : 0, mat: (o.material && o.material.type) || '?', cast: !!o.castShadow, sources: o.userData.sources || 0 });
    }
    for (const c of o.children) walk(c, vis);
  };
  walk(scene, true);
  rows.sort((a, b) => b.n - a.n);
  const fam = Object.entries(byFamily).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => [k, Math.round(v)]);
  return {
    cam: [cam.position.x, cam.position.y, cam.position.z].map(v => Math.round(v)),
    total: Math.round(total), calls, culled: Math.round(culled), hidden: Math.round(hiddenTris),
    bands: bands.map((b, i) => [b >= 1e9 ? 'inf' : b, Math.round(byBand[i])]),
    roots: byRoot, families: fam, top: rows.slice(0, top),
  };
}
