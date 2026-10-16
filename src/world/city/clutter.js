// clutter.js - the small stuff that makes the walls look lived in (architecture.md G: "Air conditioners & cables ... AC outdoor units on the street facade of 30 % of houses ... 5-10 % of the
// windows on courtyard walls"): white split-system condensers on the courtyard and side-street walls (instanced, distance-LOD 110 m so they cost nothing on the street).
import * as THREE from 'three';
import { hash01 } from '../lib/massing.js';
import { ColorBuilder } from './cornice.js';
import { templateOf, stamp } from './meshes.js';
import { ARCH } from './wallmat.js';
import { labelRegistry } from './slots.js';

function acGeo() {
  const cb = new ColorBuilder(), c = new THREE.Color('#ffffff'), g = new THREE.Color('#c9ccce');
  cb.boxLite([0, 0, 0], 1, 0, 0, 1, 0.74, 0.46, 0.24, c, false);
  cb.quad([[-0.3, 0.1, 0.245], [0.3, 0.1, 0.245], [0.3, 0.38, 0.245], [-0.3, 0.38, 0.245]], [0, 0, 1], g);
  return cb.build();
}

export function buildClutter(ctx, { M, info }) {
  const T = templateOf(acGeo());
  const acs = { add: (it) => stamp(M.fine(it.x, it.z), T, it) };
  const labels = labelRegistry(ctx);
  let n = 0, skipped = 0;
  for (const rec of info) {
    const { b, st } = rec, tab = st.tab;
    if (b.minH > 0.5 || tab.floors < 2) continue;
    for (const w of rec.walls) {
      if (w.gate || w.len < 5) continue;
      const court = w.arch === ARCH.COURT;
      const p = court ? 0.035 : (w.street ? 0.008 : 0.02);
      const rotY = Math.atan2(w.nx, w.nz);
      for (let f = 1; f < tab.floors; f++) {
        const yb = w.base + w.plinth + w.G + (f === 1 ? 0 : tab.PN + (f - 2) * tab.UF);
        const fh = f === 1 ? tab.PN : tab.UF;
        for (let k = 0; k < w.N; k++) {
          if (hash01(b.id + ':ac' + w.id + ':' + f + ':' + k) > p) continue;
          const side = hash01(b.id + ':as' + w.id + f + k) < 0.5 ? -1 : 1;
          const s = (k + 0.5) * w.bw + side * Math.min(0.95, w.bw * 0.3);
          if (s < 0.6 || s > w.len - 0.6) continue;                              // 0.74 m wide: never over a corner
          const px = w.a[0] + w.dx * s + w.nx * 0.06, pz = w.a[1] + w.dz * s + w.nz * 0.06;
          if (!labels.reserve(b.id, px, yb + fh * 0.32 + 0.23, pz, 0.74, 0.46, w.nx, w.nz, 'ac')) { skipped++; continue; }
          acs.add({ x: px, y: yb + fh * 0.32, z: pz, rotY }); n++;
        }
      }
    }
  }
  return { triangles: n * 12, acs: n, skipped };
}
