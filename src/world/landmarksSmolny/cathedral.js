import * as THREE from 'three';
import * as L from '../layout.js';
import { buildHouse } from '../landmarksD/house.js';
import { dome, onion, cross, drum, ringWindows, roundCornice } from '../landmarksD/parts.js';

// A thick curved Baroque gable; a closed extrusion, never a one-sided plane.
export function gable(K, x, y, w, h, z = 0.15) {
  const s = new THREE.Shape();
  s.moveTo(x - w / 2, y); s.quadraticCurveTo(x - w * 0.28, y + h * 0.05, x - w * 0.21, y + h * 0.65);
  s.quadraticCurveTo(x, y + h * 1.35, x + w * 0.21, y + h * 0.65);
  s.quadraticCurveTo(x + w * 0.28, y + h * 0.05, x + w / 2, y); s.closePath();
  K.P.extrude(K.mats.trim, s, z, 0.3, 1, 12);
}

function bell(K, x, z) {
  const P = K.P, M = K.mats, blue = K.wall('#8eafbe');
  // Two narrowing stages above the main cornice: paired columns, tall belfry
  // recesses, projecting white cornices, silver onion with gilded finial.
  for (const [y0, y1, half] of [[30, 46, 4.25], [47, 60, 3.8]]) {
    P.box(blue, x - half, x + half, y0, y1, z - half, z + half);
    for (let side = 0; side < 4; side++) {
      P.push(x, 0, z, side * Math.PI / 2); P.push(0, 0, half + 0.05);
      K.window({ x: 0, y: y0 + 2, w: 2.45, h: y1 - y0 - 4.1, head: 'arch', sw: 0.32, frame: 'white' });
      for (const u of [-half + 0.6, half - 0.6]) K.column(M.trim, u, 0.25, y0 + 0.6, y1 - 0.6, 0.36, { seg: 10 });
      gable(K, 0, y1 - 0.9, 5.9, 2.0, 0.4);
      P.pop(); P.pop();
    }
    P.box(M.trim, x - half - 0.45, x + half + 0.45, y1, y1 + 0.7, z - half - 0.45, z + half + 0.45);
  }
  dome(K, M.roofSilver, x, 60.8, z, 4.1, 0.5);
  drum(K, M.trim, x, z, 62.9, 65, 1.2, 16);
  onion(K, M.trim, x, 65, z, 2.65, 1.0);
  onion(K, M.brass, x, 71.25, z, 0.62, 1);
  cross(K, M.brass, x, 72.65, z, 3.2);
}

export function cathedral(K) {
  const P = K.P, M = K.mats, blue = K.wall('#8eafbe');
  const recs = L.groupMembers('north-smolny-cathedral').filter(b => b.id === 'r2864743');
  buildHouse(K, { recs, hc: 27.7, wall: '#8eafbe', roofMat: M.roofSilver, railing: false, corniceScale: 1.3,
    front(e, { len }) {
      K.wallQuad(blue, 0, len, 0, 28.15, 3);
      // The west apse has a bespoke portal and oval oculus below. Do not run a
      // generic window/pilaster bay through the centre of its wooden doors.
      const mx = (e.a[0] + e.b[0]) / 2, mz = (e.a[1] + e.b[1]) / 2;
      if (mx < 2434 && mz > -1843 && mz < -1823) return true;
      if (len < 3) return true;
      const n = Math.max(1, Math.round(len / 6)), p = len / n;
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) * p;
        K.window({ x: u, y: 3.0, w: Math.min(2.2, p * 0.5), h: 7.4, head: 'arch', sw: 0.28, frame: 'white', hood: 'seg', hoodH: 1.1 });
        K.window({ x: u, y: 16, w: Math.min(2.3, p * 0.5), h: 6.7, head: 'arch', sw: 0.32, frame: 'white' });
        gable(K, u, 23.0, Math.min(p - 0.3, 4.5), 1.8);
        for (const y of [1, 14.3]) K.pilaster(M.trim, i * p + 0.28, 0.7, y, y + 11.3, 0.25, 0.65);
      }
      for (const [y, h, d] of [[12.6, 0.5, 0.45], [13.3, 0.6, 0.6], [26.5, 0.4, 0.4]]) P.box(M.trim, 0, len, y, y + h, 0.05, d, 'k');
      return true;
    } });
  P.push(2469.65, 0, -1833.27, -Math.PI / 2 + 0.022);
  // Upper central volume, the windowed drum, and the tall silver cupola.
  P.box(blue, -12.5, 12.5, 28.2, 43.2, -13.1, 13.1);
  P.box(M.trim, -13.1, 13.1, 43.2, 44.1, -13.7, 13.7);
  drum(K, blue, 0, 0, 44, 63.5, 11.1, 32);
  ringWindows(K, 0, 0, 11.15, 12, { x: 0, y: 47, w: 2.0, h: 11.4, head: 'arch', sw: 0.3, frame: 'white' }, 0, 32);
  roundCornice(K, M.trim, M.cream, 0, 0, 63.5, 11.25, 1.1);
  dome(K, M.roofSilver, 0, 64.6, 0, 11.65, 1.05);
  // Raised sheet-metal ribs (none are coplanar with the cupola surface).
  for (let i = 0; i < 20; i++) {
    const a = i * Math.PI / 10; let prev;
    for (let j = 0; j <= 10; j++) {
      const t = j * Math.PI / 20, r = 11.72 * Math.cos(t), q = [r * Math.cos(a), 64.8 + 14.05 * Math.sin(t), r * Math.sin(a)];
      if (prev) P.cyl(M.trim, prev, q, 0.08, 0.08, 5, true); prev = q;
    }
  }
  drum(K, M.trim, 0, 0, 77.8, 84.3, 2.5, 24);
  ringWindows(K, 0, 0, 2.55, 8, { x: 0, y: 78.8, w: 0.85, h: 4.3, head: 'arch', sw: 0.15, frame: 'white' });
  onion(K, M.trim, 0, 84.3, 0, 2.35, 0.95);
  onion(K, M.brass, 0, 89.56, 0, 0.62, 0.95);
  cross(K, M.brass, 0, 90.95, 0, 2.75);
  for (const x of [-8.4, 8.4]) for (const z of [-10.7, 10.7]) bell(K, x, z);
  // West portal is on the actual western bulge, its mouldings sit forward of it.
  P.push(0, 0, 41.3);
  K.gate(0, 0.15, 4.8, 9.0, { sw: 0.5 });
  for (const x of [-4.4, 4.4]) K.column(M.trim, x, 0.8, 0.3, 12.2, 0.65, { seg: 14 });
  gable(K, 0, 12.6, 12.2, 3.8, 0.3);
  P.geo(K.wall('#445c69'), new THREE.CircleGeometry(2.05, 32), 0, 21, 0.18, 0, 0, 0, 1, 1.35, 1);
  P.geo(M.trim, new THREE.TorusGeometry(2.18, 0.25, 8, 32), 0, 21, 0.22, 0, 0, 0, 1, 1.35, 1);
  P.geo(M.cream, new THREE.TorusGeometry(1.76, 0.06, 6, 32), 0, 21, 0.27, 0, 0, 0, 1, 1.35, 1);
  for (const x of [-0.85, 0, 0.85]) P.box(M.cream, x - 0.04, x + 0.04, 18.75, 23.25, 0.23, 0.33);
  for (const y of [19.7, 21, 22.3]) P.box(M.cream, -1.7, 1.7, y - 0.04, y + 0.04, 0.24, 0.34);
  P.pop(); P.pop();
}

export function cornerChurch(K, x, z) {
  const P = K.P, M = K.mats, blue = K.wall('#93b7c7');
  P.box(blue, x - 5.8, x + 5.8, 16, 22.6, z - 5.8, z + 5.8);
  for (let side = 0; side < 4; side++) {
    P.push(x, 0, z, side * Math.PI / 2); P.push(0, 0, 5.85);
    K.window({ x: 0, y: 19.2, w: 1.8, h: 2.5, head: 'arch', sw: 0.24, frame: 'white' });
    for (const u of [-4.9, 4.9]) K.pilaster(M.trim, u, 0.65, 18.9, 22.4, 0.3, 0.5);
    gable(K, 0, 22.7, 11.8, 2.6);
    P.pop(); P.pop();
  }
  drum(K, blue, x, z, 22.6, 27.6, 4.3, 24);
  ringWindows(K, x, z, 4.35, 8, { x: 0, y: 23.1, w: 1.2, h: 3.4, head: 'arch', sw: 0.22, frame: 'white' });
  roundCornice(K, M.trim, M.cream, x, z, 27.6, 4.4, 0.7);
  dome(K, M.roofSilver, x, 28.3, z, 4.8, 0.7);
  onion(K, M.brass, x, 32.25, z, 0.9, 0.9); cross(K, M.brass, x, 34.1, z, 2.1);
}
