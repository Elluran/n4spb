// landmarksD/fences.js - the iron fences of the sights, from the OSM BARRIERS (kind 'fence') that lie inside the church yard of the Vladimirsky cathedral, in front of the Mariinsky hospital
// (Liteyny pr.: dark green cast iron with granite posts, refs/landmarksD/hospital 01 03) and beside the National Library.  Nobody else draws OSM fences.  Thin colliders follow every segment.
import { BARRIERS } from '../data/city.js';
import { fence } from './parts.js';

const REGIONS = [
  { name: 'church yard', box: [-206, -108, 388, 526], iron: '#1d1f22', h: 1.8, post: '#b9b4a6' },
  { name: 'hospital', box: [-140, -52, -372, -236], iron: '#2f5a42', h: 2.0, post: '#a9a79f' },
  { name: 'library', box: [-382, -282, -400, -196], iron: '#1d1f22', h: 1.6, post: '#a9a79f' },
];

export function build(K) {
  const ctx = K.ctx;
  let n = 0;
  for (const rg of REGIONS) {
    const [x0, x1, z0, z1] = rg.box;
    const inb = (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
    for (const b of BARRIERS) {
      if (b.kind !== 'fence' || !b.pts || b.pts.length < 4) continue;
      const pts = []; for (let i = 0; i < b.pts.length; i += 2) pts.push([b.pts[i], b.pts[i + 1]]);
      if (b.closed) pts.push(pts[0]);
      // keep the part of the polyline inside the region box
      let run = [];
      const flush = () => { if (run.length >= 2) for (const r of clearRuns(run)) { draw(r, rg); n++; } run = []; };
      for (const p of pts) { if (inb(p[0], p[1])) run.push(p); else flush(); }
      flush();
    }
  }
  // Road integrity: a mapped fence that crosses a lane (OSM has no gate there) is opened over the asphalt (streets is built before this module; net.cover > -0.1 = on the carriageway incl. pocket / fillet):
  // neither the footing nor the collider closes the lane.
  function clearRuns(run) {
    const st = ctx.services && ctx.services.streets; if (!st) return [run];
    const out = []; let cur = [];
    const end = () => { if (cur.length >= 2) out.push(cur); cur = []; };
    for (let i = 0; i + 1 < run.length; i++) {
      const a = run[i], b = run[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(l / 0.4));
      const P = (k) => [a[0] + (b[0] - a[0]) * k / m, a[1] + (b[1] - a[1]) * k / m];
      const bad = []; for (let k = 0; k <= m; k++) { const p = P(k); bad.push(st.net.cover(p[0], p[1], {}) > -0.1); }
      if (!bad.some(Boolean)) { if (!cur.length) cur.push(a); cur.push(b); continue; }
      let k = 0;
      while (k <= m) {
        if (bad[k]) { k++; continue; }
        let k1 = k; while (k1 + 1 <= m && !bad[k1 + 1]) k1++;
        if (k === 0 && cur.length) { /* the stretch continues the previous segment */ } else { end(); cur = [P(k)]; }
        if (k1 === m) cur.push(b); else { cur.push(P(k1)); end(); }
        k = k1 + 1;
      }
    }
    end();
    return out;
  }
  function draw(run, rg) {
    fence(K, run, { h: rg.h, iron: rg.iron, postMat: K.mat(rg.post), gap: 3.4 });
    for (let i = 0; i + 1 < run.length; i++) {
      const a = run[i], b = run[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.5) continue;
      ctx.physics.addBox((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, l, 0.3, Math.atan2(-dz, dx), 0, rg.h);
    }
  }
  K.svc.fences = n;
}
