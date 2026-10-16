// landmarksC/lamps.js - the pendant street lamps of the Anichkov Bridge area: grey "cobra-head" luminaires hung on the trolleybus cross-span wires (there are no lamp posts on the bridge:
// docs/research/fontanka.md summary 14, photos refs/fontanka 01 15 04).  streets/wires.js publishes its cross-spans as ctx.services.streets.wires.spans ({ a, b, mid } = [x, y, z]); every
// span within 85 m of the bridge centre gets two lamps (at 0.3 and 0.7 of its length) on a 0.55 m hanger.  The lens glows with uNight (K.nightMats).
import * as THREE from 'three';
import { toWorld } from './frame.js';

export function buildLamps(K, M, ctx) {
  const P = K.P, T = ctx.mat.toon, c = toWorld(0, 0);
  const spans = (ctx.services.streets && ctx.services.streets.wires && ctx.services.streets.wires.spans) || [];
  const grey = T('#8d9096', { paint: 0.03, name: 'lmC-pendant' }), lens = T('#e8e4d0', { emissive: '#ffd89a', emissiveIntensity: 0, paint: 0.02, name: 'lmC-pendant-lens' });
  K.nightMats.push(lens);
  const ball = new THREE.SphereGeometry(1, 8, 5);
  let n = 0;
  for (const sp of spans) {
    if (Math.hypot(sp.mid[0] - c.x, sp.mid[2] - c.z) > 85 || sp.len < 14) continue;
    const tx = (sp.b[0] - sp.a[0]) / sp.len, tz = (sp.b[2] - sp.a[2]) / sp.len, sag = (sp.a[1] + sp.b[1]) / 2 - sp.mid[1];
    for (const t of [0.3, 0.7]) {
      const x = sp.a[0] + (sp.b[0] - sp.a[0]) * t, z = sp.a[2] + (sp.b[2] - sp.a[2]) * t, y = sp.a[1] + (sp.b[1] - sp.a[1]) * t - 4 * sag * t * (1 - t);
      P.push(x, 0, z, Math.atan2(-tz, tx));
      P.cyl(grey, [0, y - 0.55, 0], [0, y, 0], 0.02, 0.02, 4, false);
      P.geo(grey, ball, 0, y - 0.72, 0, 0, 0, 0, 0.62, 0.15, 0.24);
      P.geo(lens, ball, 0, y - 0.82, 0, 0, 0, 0, 0.5, 0.06, 0.18);
      P.pop(); n++;
    }
  }
  return n;
}
