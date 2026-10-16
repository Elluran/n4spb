// landmarksPetroMonuments/run.js - the piece runner (adapted from landmarksVOStatues/run.js): a PIECE is one monument { id, key, name, x, z, yaw?, h, share?, solid?, lod?, build(P, M, K) }; `placePiece(K, pc)` builds
// its geometry once in a local frame (origin on the ground, +z = front, figures face +z), puts it at (x, z) turned by yaw ('auto' = toward the nearest way, so that a visitor on the path sees the front, or a number
// of radians), adds its solid colliders (plinths and basins block, nobody walks onto a pedestal) and publishes it in the monuments list.  A piece that repeats (the medics' pillars) passes `share: key`.
// ROAD RULE: nothing on a carriageway: the final spot is tested with streets.net.cover(x, z) < -0.5 and layout.isOnRoad; a failing spot slides (spiral search, 0.5 m steps up to 6 m) or the piece is skipped and
// listed in svc.skipped.  Collider frame: { w, d, h, ox, oz, rot, y0 } boxes and { r, h, ox, oz, y0 } cylinders (local metres, rot about y).
import { geosOf, put } from './objs.js';

const SHARED = new WeakMap();

/** yaw (rotY, 0 faces south) toward the nearest way (footway / road) within `reach` metres, or toward the south when none */
export function yawToWay(L, x, z, reach = 40) {
  let best = null;
  try { const list = L.roadsNear(x, z, reach, {}); if (list.length) best = list[0]; } catch (e) { best = null; }
  if (!best) return 0;
  const dx = best.x - x, dz = best.z - z; if (Math.hypot(dx, dz) < 0.2) return 0;
  return Math.atan2(dx, dz);
}

/** is (x, z) clear of every carriageway (radius r)?  The streets net first, the layout lookup as the fallback */
export function onCarriageway(ctx, x, z, r = 0.6) {
  const net = ctx.services.streets && ctx.services.streets.net;
  const pts = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]];
  for (const [dx, dz] of pts) {
    if (net && net.cover) { try { if (net.cover(x + dx, z + dz, {}) >= -0.5) return true; } catch (e) { /* no streets */ } }
    else { try { if (ctx.L.isOnRoad(x + dx, z + dz, -0.1)) return true; } catch (e) { /* no layout */ } }
  }
  return false;
}
export function safeSpot(ctx, x, z, r = 0.6) {
  if (!onCarriageway(ctx, x, z, r)) return { x, z, moved: 0 };
  for (let d = 0.5; d <= 6.01; d += 0.5) for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (!onCarriageway(ctx, px, pz, r)) return { x: px, z: pz, moved: d }; }
  return null;
}

/** how far in front of the footprint line a wall piece stands: the facades have bands, plinths and shop-front frames that protrude ~0.1 m beyond the polygon (review 2026-10-14: a plate at 0.02 m was buried); the piece builds a backing of this depth */
export const WALL_GAP = 0.15;

/** the nearest building wall around (x, z) within  m: { x, z, yaw } with yaw turned OUT of the wall (the piece front +z points away from the building) */
export function wallNear(ctx, x, z, reach = 12) {
  const L = ctx.L; let best = null;
  if (L.insideBuilding(x, z, 0)) {                                         // the OSM node lies inside the footprint (the Shostakovich plaque node is 1 m in): start from the nearest free point outside, else every ray hits at 0.1 m and the piece faces the wrong way inside the wall (review 2026-10-15)
    let out = null;
    for (let d = 0.25; d <= reach && !out; d += 0.25) for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d; if (!L.insideBuilding(px, pz, 0)) { const qx = px + Math.sin(a) * 0.6, qz = pz + Math.cos(a) * 0.6; out = L.insideBuilding(qx, qz, 0) ? [px, pz] : [qx, qz]; break; } }
    if (!out) return null;
    [x, z] = out;
  }
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2, dx = Math.sin(a), dz = Math.cos(a);
    for (let r = 0.1; r <= reach; r += 0.1) { if (L.insideBuilding(x + dx * r, z + dz * r, 0)) { if (!best || r < best.r) best = { r, dx, dz }; break; } }
  }
  if (!best) return null;
  // the wall may run oblique to the 7.5 deg ray grid (an OSM footprint edge): measure its tangent from two hits 0.5 rad either side of the nearest ray and face the plate along the true normal (review 2026-10-15)
  const hit = (ang) => { const dx = Math.sin(ang), dz = Math.cos(ang); for (let r = 0.02; r <= reach; r += 0.02) if (L.insideBuilding(x + dx * r, z + dz * r, 0)) return [x + dx * r, z + dz * r]; return null; };
  const a0 = Math.atan2(best.dx, best.dz), h1 = hit(a0 - 0.5), h2 = hit(a0 + 0.5), h0 = hit(a0);
  if (h0 && h1 && h2) {
    let tx = h2[0] - h1[0], tz = h2[1] - h1[1]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    let nx = -tz, nz = tx; if (nx * best.dx + nz * best.dz > 0) { nx = -nx; nz = -nz; }                        // normal pointing out of the wall (towards the start point)
    if (-nx * best.dx - nz * best.dz > 0.5 && Math.abs(h0[0] - h1[0]) + Math.abs(h0[1] - h1[1]) < 3 * reach) {
      const d = (x - h0[0]) * nx + (z - h0[1]) * nz;                                                       // distance of the start point from the wall line
      if (d > 0.05) return { x: x - nx * (d - WALL_GAP), z: z - nz * (d - WALL_GAP), yaw: Math.atan2(nx, nz) };
    }
  }
  return { x: x + best.dx * (best.r - WALL_GAP), z: z + best.dz * (best.r - WALL_GAP), yaw: Math.atan2(-best.dx, -best.dz) };
}

export function placePiece(K, pc0) {
  const { ctx, M, root, svc } = K, L = ctx.L;
  let pc = pc0;
  if (pc0.pre) { const w = pc0.pre(ctx, pc0); if (!w) { svc.skipped.push({ id: pc0.id, why: 'no wall found' }); return 0; } pc = { ...pc0, ...w }; }
  if (!pc0.wall) {                                                         // a wall-mounted piece stands against a building by design: no road test
    const sp = safeSpot(ctx, pc.x, pc.z, pc0.clear ?? Math.min(1.2, (pc0.rad || 0.6)));
    if (!sp) { svc.skipped.push({ id: pc0.id, why: 'on a carriageway' }); return 0; }
    if (sp.moved) { pc = { ...pc, x: sp.x, z: sp.z }; svc.moved.push({ id: pc0.id, by: sp.moved }); }
  }
  const yaw = pc.yaw === undefined || pc.yaw === 'auto' ? yawToWay(L, pc.x, pc.z, pc.reach || 40) : pc.yaw;
  const Kp = { ...K, x: pc.x, z: pc.z, yaw, piece: pc };
  let set;
  if (pc.share) { const cache = SHARED.get(root) || SHARED.set(root, new Map()).get(root); set = cache.get(pc.share); if (!set) cache.set(pc.share, set = geosOf((P) => pc.build(P, M, Kp))); }
  else set = geosOf((P) => pc.build(P, M, Kp));
  const lod = pc.lod || [0, 0];
  const tris = put(root, set, pc.x, pc.y || 0, pc.z, yaw, pc.scale || 1, 'pm-' + pc.key, lod[0], lod[1]);
  svc.triangles += tris; svc.parts[pc.key] = { tris, id: pc.id, yaw: Math.round(yaw * 100) / 100, x: Math.round(pc.x * 10) / 10, z: Math.round(pc.z * 10) / 10 };
  const ph = ctx.physics;
  if (ph && pc.solid) {
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    for (const s of pc.solid) {
      const ox = s.ox || 0, oz = s.oz || 0, wx = pc.x + ox * cs + oz * sn, wz = pc.z - ox * sn + oz * cs;
      if (s.r !== undefined) ph.addCylinder(wx, wz, s.r, s.y0 ?? 0, s.h);
      else ph.addBox(wx, wz, s.w, s.d, yaw + (s.rot || 0), s.y0 ?? 0, s.h);
    }
  }
  svc.monuments.push({ id: pc.id, name: pc.name, x: pc.x, z: pc.z, h: pc.h || 3 });
  if (pc.spot) svc.photoSpots.push({ x: pc.x + Math.sin(yaw) * pc.spot, z: pc.z + Math.cos(yaw) * pc.spot, yaw: (((yaw * 180 / Math.PI) % 360) + 540) % 360 - 180, name: pc.name });
  for (const id of [].concat(pc.id, pc.also || [])) svc.drawn.push(id);
  return tris;
}
