// canopies.js - the two kinds of OSM "buildings" that are not houses (Petrograd side / Vasilievsky Island only: district.js; the older regions keep their sheds, see docs/city-api.md):
//   * CANOPIES (`building=roof`: st.special === 'canopy'): the glazed roofs over the underpass stairs at Petrogradskaya (w160015873 / w160015874, in front of the House of Fashion) and
//     over the stairs of Sportivnaya (w938411790 / w938411789), filling-station and stadium-gate canopies, porch roofs. OSM: "a structure that consists of a roof with open sides".
//     Drawn as ONE slab (top + soffit + fascia) on thin posts: NO wall faces and NO wall colliders (only the posts collide), and the record takes no part in the street-wall graph
//     (edges.analyse), so the wall of a house behind a porch roof is drawn in full. A post is left out where it would stand against a house (the roof hangs on the wall there), on a
//     carriageway (road integrity rule: a missing post is better than a pole in the roadway) or in a ground hole (the open stairwell of a metro pit).
//     Before: a solid 5 m service shed with windows and wall colliders (shots/metro-petro/sv_3.png: a 3 m lane was left between the House of Fashion and the box).
//   * MOORED SHIPS (`building=ship` / `boat`: st.special === 'ship'): the restaurant frigates at Mytninskaya nab. 6 (w173528736) and Kronverkskaya nab. (w184437635) were drawn as
//     houses. Now a dark wooden hull on the OSM outline from the water to a deck, a deckhouse, three bare masts with yards (no sails, NO flags), colliders along the hull.
// Triangles: a canopy 30-120, a ship ~220.
import * as THREE from 'three';
import * as L from '../layout.js';
import { addCap, addPolyColliders, ringFromFlat, signedArea } from '../lib/massing.js';
import { miterAt } from './cornice.js';

const C = (h) => new THREE.Color(h);
const inHole = (x, z, m = 0.3) => {
  for (const s of L.GROUND_HOLES || []) {
    const dx = x - s.x, dz = z - s.z, sn = Math.sin(s.rotY || 0), cs = Math.cos(s.rotY || 0);
    if (Math.abs(dx * cs - dz * sn) <= s.w / 2 + m && Math.abs(dx * sn + dz * cs) <= s.d / 2 + m) return true;
  }
  return false;
};

function canopy(ctx, M, b, st, near) {
  const top = st.H, big = st.area >= 150, T = big ? 0.32 : 0.2, pw = big ? 0.3 : st.area >= 40 ? 0.16 : 0.1;
  const glass = b.layer > 0;                                             // mapped on layer 1 = a light roof over an open stairwell / platform: steel and glass
  const topC = glass ? '#a9c0cc' : '#8c9195', underC = glass ? '#93a8b4' : '#c9c6bd', frame = C(glass ? '#4a5058' : '#dedbd2'), postC = C(glass ? '#4a5058' : '#8d8a82');
  const net = ctx.services && ctx.services.streets && ctx.services.streets.net;
  const onRoad = (x, z) => { try { if (net && net.cover) return net.cover(x, z, {}) > -0.5; } catch (e) { /* fall through */ } return L.isOnRoad(x, z, -0.1); };
  const attached = (x, z) => { const g = L.buildingAt(x, z); return !!g && g.id !== b.id && g.kind !== 'roof' && !((g.minH || 0) > 0.5); };
  let posts = 0, tris = 0;
  for (const poly of b.polys) {
    let pts = ringFromFlat(poly.o); if (pts.length < 3) continue;
    if (signedArea(pts) < 0) pts = pts.slice().reverse();
    const n = pts.length, RB = M.roof(b.cx, b.cz), CB = M.core(b.cx, b.cz);
    RB.cur.set(topC); addCap(RB, poly, top, { uvScale: 1.2 });
    RB.cur.set(underC); addCap(RB, poly, top - T, { up: false, uvScale: 1.2 });
    tris += 2 * Math.max(1, n - 2);
    const spots = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i], q = pts[(i + 1) % n], dx = q[0] - a[0], dz = q[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.05) continue;
      const ux = dx / len, uz = dz / len, nx = uz, nz = -ux;
      CB.quad([[a[0], top - T, a[1]], [q[0], top - T, q[1]], [q[0], top, q[1]], [a[0], top, a[1]]], [nx, 0, nz], frame);
      tris += 2;
      // posts: at the corners (the outline turns by more than 25 degrees) and every ~6 m along a long edge, 0.2 m inside the outline
      const p = pts[(i + n - 1) % n], d1x = a[0] - p[0], d1z = a[1] - p[1], l1 = Math.hypot(d1x, d1z) || 1;
      if ((d1x * dx + d1z * dz) / (l1 * len) < 0.906) { const m = miterAt(pts, i); spots.push({ x: a[0] - m[0] * 0.2, z: a[1] - m[1] * 0.2, ox: a[0] + m[0] * 0.5, oz: a[1] + m[1] * 0.5 }); }
      for (let k = 1, nk = Math.ceil(len / 6); k < nk && len > 8; k++) { const t = len * k / nk; spots.push({ x: a[0] + ux * t - nx * 0.2, z: a[1] + uz * t - nz * 0.2, ox: a[0] + ux * t + nx * 0.5, oz: a[1] + uz * t + nz * 0.5 }); }
    }
    for (const s of spots.slice(0, 20)) {
      if (attached(s.ox, s.oz) || attached(s.x, s.z) || onRoad(s.x, s.z) || inHole(s.x, s.z)) continue;
      CB.box([s.x, 0, s.z - pw / 2], 1, 0, 0, 1, pw, top - T, pw, postC, false);
      tris += 10; posts++;
      if (near && st.area >= 12) ctx.physics.addCylinder(s.x, s.z, Math.max(0.1, pw * 0.7), 0, top);
    }
  }
  return { posts, tris };
}

function ship(ctx, M, b, st, near) {
  const ob = st.ob, ux = ob.ux, uz = ob.uz, nx = -uz, nz = ux;
  const water = (L.waterLevelAt && L.waterLevelAt(ob.cx, ob.cz)) ?? -3.4, deck = 0.9, rail = deck + 0.75;
  const hull = C(st.knownHex || '#4a3324'), strake = C('#a8894e'), wood = '#a8855a', house = C('#6b4a32'), spar = C('#4d3a2a');
  let tris = 0;
  for (const poly of b.polys) {
    let pts = ringFromFlat(poly.o); if (pts.length < 3) continue;
    if (signedArea(pts) < 0) pts = pts.slice().reverse();
    const CB = M.core(ob.cx, ob.cz), RB = M.roof(ob.cx, ob.cz);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], q = pts[(i + 1) % pts.length], dx = q[0] - a[0], dz = q[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.05) continue;
      const n = [dz / len, 0, -dx / len];
      CB.quad([[a[0], water - 0.6, a[1]], [q[0], water - 0.6, q[1]], [q[0], deck - 1.3, q[1]], [a[0], deck - 1.3, a[1]]], n, hull);
      CB.quad([[a[0], deck - 1.3, a[1]], [q[0], deck - 1.3, q[1]], [q[0], deck - 0.2, q[1]], [a[0], deck - 0.2, a[1]]], n, strake);           // the pale gun-deck strake
      CB.quad([[a[0], deck - 0.2, a[1]], [q[0], deck - 0.2, q[1]], [q[0], rail, q[1]], [a[0], rail, a[1]]], n, hull);                       // bulwark
      CB.quad([[a[0], deck, a[1]], [q[0], deck, q[1]], [q[0], rail, q[1]], [a[0], rail, a[1]]], [-n[0], 0, -n[2]], hull);                   // its inner face
      tris += 8;
    }
    RB.cur.set(wood); addCap(RB, poly, deck, { uvScale: 0.5 });
    tris += Math.max(1, pts.length - 2);
    if (near) addPolyColliders(ctx, poly, water - 1, rail + 0.6, 0.6);
  }
  const P = (s, t) => [ob.cx + ux * s + nx * t, 0, ob.cz + uz * s + nz * t];
  const CB = M.core(ob.cx, ob.cz), Lh = ob.w, Bm = ob.d;
  // deckhouse abaft the main mast, masts (fore, main, mizzen) with two yards each; nothing flies from them
  const dh = P(-Lh * 0.2, 0);
  CB.box([dh[0] - nx * Bm * 0.26, deck, dh[2] - nz * Bm * 0.26], ux, uz, nx, nz, Lh * 0.26, 2.7, Bm * 0.52, house, true);
  tris += 12;
  for (const [s, h] of [[Lh * 0.27, 21], [Lh * 0.02, 25], [-Lh * 0.3, 18]]) {
    const m = P(s, 0);
    CB.box([m[0] - nx * 0.2, deck, m[2] - nz * 0.2], ux, uz, nx, nz, 0.4, h, 0.4, spar, true);
    for (const [f, yl] of [[0.5, Bm * 1.25], [0.78, Bm * 0.85]]) { const y = deck + h * f; CB.box([m[0] - nx * yl / 2, y, m[2] - nz * yl / 2], ux, uz, nx, nz, 0.22, 0.22, yl, spar, true); tris += 12; }
    tris += 12;
  }
  return { tris };
}

export function buildCanopies(ctx, { M, items, near }) {
  const out = { triangles: 0, canopies: 0, posts: 0, ships: 0 };
  for (const { b, st } of items) {
    if ((b.minH || 0) > 0.5 && !(b._raised && st.special === 'canopy')) continue;                // (a raised `roof` part of a house is a roof on posts too: it floated over nothing, wall audit FLOOR)
    const isNear = near ? near(st.ob.cx, st.ob.cz, 40) : true;
    try {
      if (st.special === 'ship') { const r = ship(ctx, M, b, st, isNear); out.ships++; out.triangles += r.tris; }
      else { const r = canopy(ctx, M, b, st, isNear); out.canopies++; out.posts += r.posts; out.triangles += r.tris; }
    } catch (e) { console.warn('[city] canopy failed', b.id, e && e.message); }
  }
  return out;
}
