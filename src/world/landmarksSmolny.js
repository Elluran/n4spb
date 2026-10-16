// Real mapped Smolny footprints with photo-derived Baroque/Classical articulation.
// Sources and approximation boundaries: docs/research/north-smolny.md.
import * as THREE from 'three';
import * as L from './layout.js';
import { makeKit } from './landmarksD/common.js';
import { buildHouse } from './landmarksD/house.js';
import { portico } from './landmarksD/parts.js';
import { cathedral, cornerChurch, gable } from './landmarksSmolny/cathedral.js';
export const OWNS_GROUPS = true;

function ensemble(K) {
  const P = K.P, M = K.mats;
  buildHouse(K, { recs: L.groupMembers('north-smolny-ensemble'), hc: 18.5, wall: '#93b7c7', railing: false, roofMat: M.roofSilver,
    front(e, { len }) {
      // Quarenghi's southern Institute joins the older convent in the OSM relation.
      const south = (e.a[1] + e.b[1]) / 2 > -1705;
      const wall = K.wall(south ? '#e0ce99' : '#93b7c7');
      K.wallQuad(wall, 0, len, 0, 18.95, 3);
      if (len < 2.4) return true;
      const n = Math.max(1, Math.round(len / (south ? 4.0 : 4.5))), pitch = len / n;
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) * pitch;
        K.window({ x: u, y: 1.0, w: Math.min(1.35, pitch * 0.5), h: 2.5, head: 'arch', sw: 0.16, frame: 'white' });
        K.window({ x: u, y: 5.4, w: Math.min(1.6, pitch * 0.6), h: 4.0, head: south ? 'flat' : 'arch', sw: 0.22, frame: 'white', hood: south ? 'tri' : 'seg', hoodH: 0.6 });
        K.window({ x: u, y: 12.6, w: Math.min(1.25, pitch * 0.5), h: 3.1, sw: 0.15, frame: 'white' });
        if (!south) K.pilaster(M.trim, i * pitch + 0.25, 0.55, 4.5, 17.6, 0.2, 0.5);
      }
      for (const y of [4.3, 10.4]) P.box(M.trim, 0, len, y, y + 0.3, 0.08, 0.25, 'k');
      if (!south && e.n[0] < -0.8 && len > 11 && len < 34) gable(K, len / 2, 18.9, len + 0.2, 3.1);
      return true;
    },
  });
  // Four smaller churches at the convent corners, their centres read from OSM.
  for (const [x, z] of [[2409.94, -1765.75], [2545.42, -1765.75], [2409.38, -1908.36], [2545.25, -1908.36]]) cornerChurch(K, x, z);

  // The Institute's eight-column west-facing portico, at the mapped projecting
  // centre of the 1806–08 facade. No invented buildings behind the facade.
  P.push(2517.85, 0, -1544.49, -Math.PI / 2 + 0.022);
  P.box(K.wall('#e0ce99'), -15, 15, 0.1, 4.35, 0, 6.8);
  P.push(0, 0, 6.86);
  for (const x of [-10.7, -5.35, 0, 5.35, 10.7]) K.gate(x, 0.2, 2.7, 3.8, { sw: 0.28 });
  P.pop();
  portico(K, { x0: -15, x1: 15, depth: 6.2, y0: 4.35, y1: 19.1, r: 0.64,
    xs: [-12.8, -9.15, -5.5, -1.83, 1.83, 5.5, 9.15, 12.8], ent: 1.8, ped: 4.9,
    ionic: true, steps: false, wallMat: K.wall('#e0ce99') });
  P.pop();
}

export function build(ctx) {
  const K = makeKit(ctx), root = new THREE.Group(); root.name = 'landmarksSmolny';
  K.svc = { houses: [], entrances: [], monuments: [], photoSpots: [] };
  K.begin(); cathedral(K); K.flush(root, 'smolny-cathedral');
  K.begin(); ensemble(K); K.flush(root, 'smolny-ensemble');
  ctx.addStatic(root);
  ctx.services.landmarksSmolny = { triangles: K.tris, entrances: [{ x: 2425, z: -1833, clearance: 12, bldg: 'r2864743' }],
    photoSpots: [{ x: 2335, z: -1833, yaw: -90, name: 'Смольный собор' }] };
}
