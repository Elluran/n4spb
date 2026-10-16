// instances.js - InstancedMesh helpers for the city details: items are grouped in 96 m cells (frustum culling works per cell) and every cell registers with the distance LOD,
// so balconies / dormers / chimneys ... beyond ~260 m are not drawn at all (the wall shader already fades its own detail to the average colour).
//   const set = new InstanceSet();  set.add({ x, y, z, rotY, sx, sy, sz, color });  set.flush(root, geometry, material, 'name', { lodFar: 260 })
//   LOD.update(cameraPos) runs from city.js (ctx.onUpdate).
import * as THREE from 'three';

export { LOD } from '../../core/lod.js';      // the scene-wide distance LOD registry (core/lod.js; scale = the quality tier, ctx.quality.lod): the static batches and the street furniture register there too

const Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0);
const CELL = (typeof location !== 'undefined' && Number(new URLSearchParams(location.search).get('icell'))) || 192;

export class InstanceSet {
  constructor() { this.cells = new Map(); this.count = 0; }
  add(it) { const k = Math.floor(it.x / CELL) + ',' + Math.floor(it.z / CELL); let a = this.cells.get(k); if (!a) this.cells.set(k, (a = [])); a.push(it); this.count++; }
  /** one InstancedMesh per cell; geometry / material shared. opts: cast (shadow), lodFar (m), noOutline */
  flush(root, geometry, material, name, opts = {}) {
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
    let made = 0;
    for (const [, items] of this.cells) {
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      let anyColor = false, cx = 0, cz = 0;
      items.forEach((it, i) => {
        if (!Number.isFinite(it.x + it.y + it.z + (it.rotY || 0) + (it.sx ?? 1) + (it.sy ?? 1) + (it.sz ?? 1))) console.warn('[city] non-finite instance in', name, JSON.stringify(it));
        q.setFromAxisAngle(Y, it.rotY || 0);
        if (it.tilt) q.multiply(new THREE.Quaternion().setFromAxisAngle(X, it.tilt));
        p.set(it.x, it.y, it.z); sc.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
        M.compose(p, q, sc); mesh.setMatrixAt(i, M);
        if (it.color) { anyColor = true; mesh.setColorAt(i, c.set(it.color)); } else if (anyColor) mesh.setColorAt(i, c.set('#ffffff'));
        cx += it.x; cz += it.z;
      });
      cx /= items.length; cz /= items.length;
      let r = 0; for (const it of items) r = Math.max(r, Math.hypot(it.x - cx, it.z - cz));
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = opts.cast !== false; mesh.receiveShadow = true; mesh.name = name;
      mesh.frustumCulled = true;
      mesh.computeBoundingSphere();
      if (opts.noOutline) mesh.layers.set(1);
      root.add(mesh);
      if (opts.lodFar !== 0) LOD.add(mesh, cx, cz, r + 6, opts.lodFar || 260);
      made++;
    }
    return made;
  }
}

/** Collect the merged-parts geometry helper (coloured boxes) from kit.js */
export { mergeParts } from './kit.js';
