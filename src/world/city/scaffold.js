// scaffold.js - restoration scaffolding on the ~2 % of street houses flagged st.restore (the Nevsky restoration programme 2024-26, architecture.md I): galvanised tube lattice 2 x 2 m
// 0.45 m off the facade from the pavement to the roof, plank platforms on every second level, a pavement gallery (plywood hoarding + roof boards) at the foot. The printed canvas / green
// mesh that hangs on it is painted by the wall shader (F.NET). Instanced, light: ~200 triangles per wall.
import * as THREE from 'three';
import { templateOf, stamp } from './meshes.js';

export function buildScaffolds(ctx, { M, info }) {
  const T = templateOf(new THREE.BoxGeometry(1, 1, 1));
  const steelC = '#9aa0a4';
  const poles = { count: 0, add(it) { this.count++; stamp(M.fine(it.x, it.z), T, { color: steelC, ...it }); } }, ledgers = { count: 0, add(it) { this.count++; stamp(M.fine(it.x, it.z), T, { color: steelC, ...it }); } }, planks = { count: 0, add(it) { this.count++; stamp(M.fine(it.x, it.z), T, it); } }, hoard = { count: 0, add(it) { this.count++; stamp(M.fine(it.x, it.z), T, it); } };
  let n = 0, walls = 0;
  for (const rec of info) {
    const { b, st } = rec;
    if (!st.restore || b.minH > 0.5) continue;
    for (const w of rec.walls) {
      if (!w.street || w.hole || w.gate || w.len < 4) continue;
      walls++;
      const rotY = Math.atan2(w.nx, w.nz), top = w.H + 1.2, off = 0.45;
      const cx = w.midX + w.nx * off, cz = w.midZ + w.nz * off;
      // standards every 2 m
      const k = Math.max(2, Math.round(w.len / 2));
      for (let i = 0; i <= k; i++) {
        const s = (i / k) * w.len;
        poles.add({ x: w.a[0] + w.dx * s + w.nx * off, y: w.base + top / 2, z: w.a[1] + w.dz * s + w.nz * off, rotY, sx: 0.06, sy: top, sz: 0.06 });
      }
      // ledgers every 2 m of height (two rows: inner and outer), planks on every second level
      for (let y = 2.0, lv = 0; y < top; y += 2.0, lv++) {
        ledgers.add({ x: cx, y: w.base + y, z: cz, rotY: Math.atan2(w.dx, w.dz), sx: 0.05, sy: 0.05, sz: w.len });
        if (lv % 3 === 0) planks.add({ x: cx + w.nx * 0.25, y: w.base + y + 0.03, z: cz + w.nz * 0.25, rotY: Math.atan2(w.dx, w.dz), sx: 0.95, sy: 0.05, sz: w.len, color: '#b8a27a' });
      }
      // pavement gallery: plywood hoarding on the street side, roof boards at 2.8 m
      hoard.add({ x: w.midX + w.nx * 1.5, y: w.base + 1.2, z: w.midZ + w.nz * 1.5, rotY: Math.atan2(w.dx, w.dz), sx: 0.06, sy: 2.4, sz: w.len, color: n % 2 ? '#2f6d54' : '#355a8a' });
      hoard.add({ x: w.midX + w.nx * 0.75, y: w.base + 2.8, z: w.midZ + w.nz * 0.75, rotY: Math.atan2(w.dx, w.dz), sx: 1.6, sy: 0.08, sz: w.len, color: '#7b6a4e' });
      n++;
    }
  }
  return { triangles: (poles.count + ledgers.count + planks.count + hoard.count) * 12, scaffolds: n, walls };
}
