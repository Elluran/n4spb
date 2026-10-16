// streets/debug.js - verification helpers of the streets specialist, active only with ?st=ground (flat ground) and / or ?st=bld (blockout houses of every footprint,
// heights by layout.heightOf). They let the module be judged alone, while environment / city are not built yet. Nothing here is part of the shipped scene.
import * as THREE from 'three';
import { MeshBuilder, addPrism } from '../lib/massing.js';
import { BUILDINGS, RIVER } from '../data/city.js';

export function debugScene(ctx, root, flags) {
  const { L, mat } = ctx;
  if (flags.includes('ground')) {
    // flat ground with the Fontanka cut out (and a water plane 3.2 m down), roughly what the environment module will draw
    const shape = new THREE.Shape([new THREE.Vector2(-1180, -1020), new THREE.Vector2(1420, -1020), new THREE.Vector2(1420, 1580), new THREE.Vector2(-1180, 1580)]);
    for (const r of RIVER || []) for (const p of r.polys || []) { const o = p.o; if (o.length >= 6) shape.holes.push(new THREE.Path(Array.from({ length: o.length / 2 }, (_, i) => new THREE.Vector2(o[i * 2], o[i * 2 + 1])))); }
    const g = new THREE.ShapeGeometry(shape); g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, mat.toon('#8f9a78', { name: 'dbg-ground', side: 'double' })); m.position.y = -0.02; m.receiveShadow = true; m.name = 'dbg-ground'; root.add(m);
    const w = new THREE.PlaneGeometry(2600, 2600); w.rotateX(-Math.PI / 2);
    const wm = new THREE.Mesh(w, mat.toon('#3d5a8a', { name: 'dbg-water' })); wm.position.set(120, -3.2, 280); root.add(wm);
  }
  if (flags.includes('bld')) {
    const walls = new MeshBuilder(), roofs = new MeshBuilder();
    for (const b of BUILDINGS) {
      if (b.skip || (b.minH || 0) > 3 || b.underground || b.dupOf) continue;
      const h = Math.max(3, L.heightOf(b));
      for (const p of b.polys) addPrism(walls, roofs, p, 0, h, {});
    }
    const wm = new THREE.Mesh(walls.build(), mat.toon('#dccaa4', { name: 'dbg-walls' })), rm = new THREE.Mesh(roofs.build(), mat.toon('#7d8288', { name: 'dbg-roofs' }));
    for (const m of [wm, rm]) { m.castShadow = true; m.receiveShadow = true; root.add(m); }
  }
}
