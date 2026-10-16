// metro/proom.js — a vestibule room of ANY plan: a polygon (inner faces, world coordinates) inside somebody else's hollow building (or under the street): floor with holes (the escalator
// shaft), ceiling, thin wall slabs with doors (rectangular / arched openings), wall colliders split at the doors, a lamp grid. Used by the Gostiny Dvor ticket hall, the Engelhardt-house canal
// exit and the Admiralteyskaya oval hall (the older rect-only builder is room.js). Everything is added with ctx.addStatic; a room is a surface interior (no underground tag) unless o.under.
//   const R = buildPolyRoom(ctx, M, { id, poly: [[x, z], ...], ceil: 5.6, doors: [{ x, z, w, h, arch }], holes: [[[x, z], ...]], floorMat, wallMat, ceilMat, y0: 0.05, lamps: { step: 5 } });
//   R.group  (a THREE.Group in world coordinates, y absolute)   R.k (kit)   R.edges  R.inside(x, z)
import * as THREE from 'three';
import { extrudeZ } from './lib.js';
import { MeshBuilder, addCap } from '../lib/massing.js';

const inPolyArr = (poly, x, z) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };

export function buildPolyRoom(ctx, M, o) {
  const { mat, physics } = ctx;
  const poly = o.poly, n = poly.length, CEIL = o.ceil ?? 5.6, y0 = o.y0 ?? 0.05, WT = o.wallThick ?? 0.3, doors = o.doors || [], holes = o.holes || [];
  const group = new THREE.Group(); group.name = o.id + '-room'; group.userData.zone = o.id + '-room';
  if (o.under) group.userData.undergroundOnly = true;
  ctx.addStatic(group);
  const k = ctx.kit(group);
  const floorMat = o.floorMat || mat.toon('#ffffff', { map: M.T.granite(o.id + '-vfloor', '#cfc6b0', 'rgba(70,55,40,0.28)', 'rgba(255,255,255,0.40)', { tint: '#8a6a50' }) });
  const wallMat = o.wallMat || M.rotundaInner, ceilMat = o.ceilMat || M.ceiling;
  // ---- floor (with the holes) and ceiling
  const fb = new MeshBuilder();
  addCap(fb, { o: poly.flat(), h: holes.map((h) => h.flat()) }, y0, { uvScale: o.floorUv ?? 1 });
  const fm = new THREE.Mesh(fb.build(), floorMat); fm.receiveShadow = true; group.add(fm);
  if (!o.noCeiling) { const cb = new MeshBuilder(); addCap(cb, { o: poly.flat(), h: [] }, CEIL, { up: false, uvScale: 6 }); group.add(new THREE.Mesh(cb.build(), ceilMat)); }
  // ---- walls
  const edges = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.05) continue;
    const ux = dx / l, uz = dz / l, n1 = [-uz, ux], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const inward = inPolyArr(poly, mx + n1[0] * 0.2, mz + n1[1] * 0.2) ? n1 : [-n1[0], -n1[1]];
    // doors on this edge: the door point projected onto the edge
    const ds = [];
    for (const d of doors) { const px = d.x - a[0], pz = d.z - a[1], t = px * ux + pz * uz, off = Math.abs(px * -uz + pz * ux); if (off < (o.doorSnap ?? 2.2) && t > 0 && t < l) ds.push({ ...d, t }); }
    ds.sort((p, q) => p.t - q.t);
    edges.push({ a, b, l, ux, uz, inward, doors: ds, i });
    const wallH = o.wallH ?? CEIL, rect = [[0, y0], [l, y0], [l, wallH], [0, wallH]];
    const hs = ds.map((d) => {
      const w = d.w ?? 3.4, hh = d.h ?? 3.3, r = (d.arch ?? true) ? Math.min(w / 2, 1.6) : 0, p = [[d.t - w / 2, y0], [d.t + w / 2, y0]];   // QA: was y0 - 0.001 (outside the slab: earcut dropped the hole, the wall stayed closed in front of every door)
      if (r > 0) { p.push([d.t + w / 2, y0 + hh - r]); for (let q = 1; q < 10; q++) { const th = q * Math.PI / 10; p.push([d.t + (w / 2) * Math.cos(th), y0 + hh - r + r * Math.sin(th)]); } p.push([d.t - w / 2, y0 + hh - r]); }
      else p.push([d.t + w / 2, y0 + hh], [d.t - w / 2, y0 + hh]);
      return p;
    });
    // the extrusion's local +z is (-uz, ux) = n1: the slab goes OUTSIDE the inner face
    const outIsPlus = inward[0] === -n1[0] && inward[1] === -n1[1];
    const m = new THREE.Mesh(extrudeZ(rect, outIsPlus ? 0 : -WT, outIsPlus ? WT : 0, hs.length ? hs : null), wallMat);
    m.position.set(a[0], 0, a[1]); m.rotation.y = -Math.atan2(dz, dx); m.receiveShadow = true; group.add(m);
    // colliders: the wall between the doors
    let s0 = 0; const cols = [];
    for (const d of ds) { const w = d.w ?? 3.4; if (d.t - w / 2 > s0 + 0.05) cols.push([s0, d.t - w / 2]); s0 = Math.max(s0, d.t + w / 2); }
    if (s0 < l - 0.05) cols.push([s0, l]);
    for (const [t0, t1] of cols) {
      const len = t1 - t0, c = (t0 + t1) / 2, cx = a[0] + ux * c - inward[0] * 0.15, cz = a[1] + uz * c - inward[1] * 0.15;
      physics.addBox(cx, cz, len + 0.4, 0.5, Math.atan2(-dz, dx), o.colY?.[0] ?? -1.5, o.colY?.[1] ?? 8);
    }
  }
  // ---- lamp panels on a grid
  if (o.lamps !== false && !o.noCeiling) {
    const st = o.lamps?.step ?? 5; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const ang = o.lamps?.rot ?? 0, c = Math.cos(ang), s = Math.sin(ang), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = Math.hypot(x1 - x0, z1 - z0) / 2;
    const lampMat = o.lamps?.mat || M.lampWhite, sz = o.lamps?.size || [1.8, 0.9];
    for (let u = -R; u <= R; u += st) for (let v = -R; v <= R; v += st) {
      const x = cx + u * c - v * s, z = cz + u * s + v * c;
      if (!inPolyArr(poly, x, z) || holes.some((h) => inPolyArr(h, x, z))) continue;
      const m = k.box(sz[0], 0.08, sz[1], lampMat, [x, CEIL - 0.06, z], [0, -ang, 0]); m.castShadow = false;
    }
  }
  return { group, k, edges, poly, CEIL, y0, inside: (x, z) => inPolyArr(poly, x, z) };
}

/** a rectangle [[x, z] x 4] from a centre, a unit direction (the "length" axis) and half sizes */
export function rectPoly(cx, cz, ux, uz, hl, hw) { const vx = -uz, vz = ux; return [[cx - ux * hl - vx * hw, cz - uz * hl - vz * hw], [cx + ux * hl - vx * hw, cz + uz * hl - vz * hw], [cx + ux * hl + vx * hw, cz + uz * hl + vz * hw], [cx - ux * hl + vx * hw, cz - uz * hl + vz * hw]]; }
/** polygon (flat inside test exported for modules) */
export const polyHas = inPolyArr;
