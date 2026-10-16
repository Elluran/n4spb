// props/ads.js - advertising, wayfinding and time on the pavements of central Saint Petersburg (docs/research/streets.md section 5 + 9, nevsky.md section 7):
//   * round advertising pillars (афишные тумбы): dark base, 1.9 m lit poster wrap (a textured open cylinder, 10 generic posters), domed cap: the 10 OSM `advertising=column`
//     nodes (the two that landmarksA built on the square / forecourt are skipped), plus a few at the big crossings;
//   * city-light boxes 1.2 x 1.8 m (lit posters on both faces) near stops and crossings of Nevsky and the main streets, one per ~60 m of pavement near the attractors;
//   * tourist wayfinding posts (brown plates with arrows to the real sights, the arrow direction computed from the bearing to the sight);
//   * street clocks: black cast-iron poles (OSM `clock` nodes on the open pavement) and bracket wall clocks (OSM clocks next to a facade) with hands that run as a pure
//     function of the sim time t (two instanced hand meshes).
// Depth clearance (Yakutsk fafd4c9): every lit face stands 8 cm in front of its box core, back ribs sit 7 cm behind the faces; the wrap cylinder is 4 cm outside the drum.
import * as THREE from 'three';
import * as L from '../layout.js';
import { Geo, nightMat } from './kit.js';
import { COL, cityLightBox, pillarGeo, clockPole, wayPost } from './furniture.js';
import { faceRot, nearestWall, walk, streetClass } from './sites.js';

export function registerAdTypes(S) {
  const T = S.type;
  T('cityLight', () => cityLightBox());
  T('pillar', () => pillarGeo());
  T('clockPole', () => clockPole());
  T('wayPost', () => wayPost());
}

const DEST = [
  { n: 'Московский вокзал', sub: 'Площадь Восстания', at: [612, 300] },
  { n: 'Аничков мост', sub: 'Фонтанка', at: [-441, -93] },
  { n: 'Площадь Восстания', sub: 'Метро · обелиск', at: [592, 165] },
  { n: 'Владимирский собор', sub: 'Владимирская пл.', at: [-165, 470] },
  { n: 'Гостиный двор', sub: 'Невский проспект', at: null, grid: [-1650, 0] },
  { n: 'Дворцовая площадь', sub: 'Эрмитаж', at: null, grid: [-3200, 0] },
];
for (const d of DEST) if (!d.at) { const p = L.fromGrid(d.grid[0], d.grid[1]); d.at = [p.x, p.z]; }

/** a round pillar at (x, z): drum / cap geometry as an instance, the poster wrap as a textured open cylinder (one mesh per pillar) */
export function addPillar(S, x, z, i = 0) {
  S.add('pillar', x, z, 0);
  const y = S.levelAt(x, z), tex = S.sign.wrap(i);
  const mat = nightMat(S.ctx, '#ffffff', 0.92, 1.35, { map: tex, side: 'double' });
  const geo = new THREE.CylinderGeometry(0.62, 0.62, 1.88, 20, 1, true);
  geo.rotateY(S.R() * Math.PI * 2); geo.translate(x, y + 1.44, z);
  const m = new THREE.Mesh(geo, mat); m.name = 'pr-wrap'; m.castShadow = false; m.receiveShadow = false; S.ctx.noOutline(m); S.root.add(m);
  S.solidCyl(x, z, 0.68, 3.1); S.occupy(x, z, 1.4, 'pillar'); S.svc.pillars.push({ x, z });
  S.tris += 80;
}

/** a clock face on both sides of a pole (kind 'pole') or a bracket clock on a wall (kind 'wall'): dial panels + hand records; (nx, nz) = the face normal (the second face looks the other way) */
export function addClock(S, x, y, z, nx, nz, r = 0.46, wall = false) {
  // a bracket clock hangs flat on a wall: it reserves its rectangle in the facade label registry (streets/labels.js) and is not hung where a plate / shop sign / number plate holds the place
  if (wall && S.ctx.services.labels && !S.ctx.services.labels.reserve(0, x, y, z, 2 * r + 0.1, 2 * r + 0.1, nx, nz, 'clock')) return;
  const tex = S.sign.dial(), t = r * 2 * 0.94, _clocks = (S._clocks ||= []);
  if (wall) S.addStaticGeo(new Geo().tube([x - nx * 0.1, y, z - nz * 0.1], [x + nx * 0.1, y, z + nz * 0.1], r + 0.03, COL.black, 14), 'pr-clock-body');   // the pole clock's housing is part of its geometry
  for (const f of [1, -1]) {
    S.panels.panel(tex, x + nx * 0.115 * f, y, z + nz * 0.115 * f, nx * f, nz * f, t, t, { alpha: true });
    _clocks.push({ x: x + nx * 0.13 * f, y, z: z + nz * 0.13 * f, nx: nx * f, nz: nz * f, r: r * 0.86 });
  }
  S.svc.clocks.push({ x, z, y });
}
/** the two instanced hand meshes + the per-frame update (hour = 15:00 + t, hands as a pure function of t) */
export function finishClocks(S) {
  const ctx = S.ctx, _clocks = S._clocks || []; if (!_clocks.length) return 0;
  const n = _clocks.length;
  const mk = (len, w, col) => { const g = new THREE.BoxGeometry(w, len, 0.012); g.translate(0, len / 2, 0); const m = new THREE.InstancedMesh(g, ctx.mat.toon(col, { name: 'pr-hand' }), n); m.frustumCulled = false; m.castShadow = false; ctx.noOutline(m); ctx.add(m); return m; };
  const hour = mk(0.6, 0.035, '#1c1e1d'), min = mk(0.85, 0.022, '#1c1e1d');
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), Sc = new THREE.Vector3(), E = new THREE.Euler(), BASIS = new THREE.Matrix4();
  let last = -1;
  const upd = (t) => {
    const hrs = 15 + t / 3600, mins = (t / 60) % 60;
    for (let i = 0; i < n; i++) {
      const c = _clocks[i];
      BASIS.lookAt(new THREE.Vector3(0, 0, 0), new THREE.Vector3(c.nx, 0, c.nz), new THREE.Vector3(0, 1, 0));   // local +Z -> face normal
      Q.setFromRotationMatrix(BASIS);
      for (const [mesh, ang, len] of [[hour, -((hrs % 12) / 12) * Math.PI * 2, c.r * 0.55], [min, -(mins / 60) * Math.PI * 2, c.r * 0.82]]) {
        const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang);
        const qq = Q.clone().multiply(q2);
        M.compose(P.set(c.x, c.y, c.z), qq, Sc.set(1, len, 1)); mesh.setMatrixAt(i, M);
      }
    }
    hour.instanceMatrix.needsUpdate = true; min.instanceMatrix.needsUpdate = true;
  };
  void E; void last;
  upd(0);
  ctx.onUpdate((dt, t) => { const k = Math.floor(t / 2); if (k !== last) { last = k; upd(t); } });
  return n * 24;
}

/** sum of exp(-distance / d) over a point list, through a hash grid (terms beyond 5 d are < 0.7 %: dropped) */
export function attractSum(pts, d) {
  const C = d * 5, g = new Map();
  for (const q of pts) { const k = Math.floor(q[0] / C) + ',' + Math.floor(q[1] / C); let a = g.get(k); if (!a) g.set(k, (a = [])); a.push(q); }
  return (x, z) => {
    let sum = 0; const i0 = Math.floor(x / C), j0 = Math.floor(z / C);
    for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) { const a = g.get(i + ',' + j); if (a) for (const q of a) { const r = Math.hypot(q[0] - x, q[1] - z); if (r < C) sum += Math.exp(-r / d); } }
    return sum;
  };
}

export function placeAds(S) {
  const { W, R, F } = S, sts = S.stations || [], T = S.sign;
  const cnt = { cityLights: 0, pillars: 0, ways: 0 };
  const attractors = [...((S.st && S.st.busStops) || []).map((b) => [b.x, b.z]), ...((S.st && S.st.crosswalks) || []).map((c) => [c.x, c.z])];
  const MAIN = /Невск|Лиговск|Владимирск|Литейн|Суворовск|Марата|Фонтанк|Восстания|Загородн|Маяковск|Адмиралтейск|Дворцов/;   // the west: city-light boxes along Admiralteysky pr. and the Palace Embankment (dossier 4.3)

  // ---- procedural round pillars at a few big junctions of Nevsky / Ligovsky (the OSM ones are placed by osm.js): at the kerb side, a pillar every ~150 m at most
  const placedP = [...(S.svc.pillars || []), { x: 609.5, z: 171.5 }, (([x, z]) => ({ x, z }))(S.stationW(-58, -26))];   // + the two of landmarksA
  const att14 = attractSum(attractors, 14), att20 = attractSum(attractors, 20);
  const scored = sts.map((st) => ({ st, a: att14(st.x, st.z) + R() * 0.25 })).sort((x, y) => y.a - x.a);
  for (const { st, a } of scored) {
    if (cnt.pillars >= 6 || a < 0.7) break;
    if (!/Невск|Лиговск|Литейн|Владимирск/.test(st.rn) || S.inForecourt(st.x, st.z, 6) || !W.inPlay(st.x, st.z, 3) || placedP.some((p) => Math.hypot(p.x - st.x, p.z - st.z) < 140)) continue;
    const off = Math.min(st.ek, 8) - 1.15;
    if (off < 0.5 || st.eb < 1.0) continue;
    const px = st.x + st.nx * off, pz = st.z + st.nz * off;
    if (!W.fits(px, pz, 1.5, 1.5, 0, { margin: 0.05, allow: F.LAWN }) || S.placed.near(px, pz, 2.2) || S.inDoorBox(px, pz, 1.2)) continue;
    if (W.span(px - st.nx * 0.8, pz - st.nz * 0.8, -st.nx, -st.nz, 8, F.BLD | F.TREE) < 2.5) continue;           // keep a 2.5 m walking lane behind it
    addPillar(S, px, pz, 3 + cnt.pillars); placedP.push({ x: px, z: pz }); cnt.pillars++;
  }

  // ---- city-light boxes: near stops and crossings (kerb side), spacing >= 45 m, faces to the road; none on the Fontanka quay
  const placedC = [];
  const scored2 = sts.map((st) => ({ st, a: att20(st.x, st.z) + R() * 0.4 })).sort((x, y) => y.a - x.a);
  for (const { st, a } of scored2) {
    if (cnt.cityLights >= 34 || a < 0.45) break;
    if (!MAIN.test(st.rn) || /Фонтанк/.test(st.rn) || S.inForecourt(st.x, st.z, 6) || !W.inPlay(st.x, st.z, 3) || placedC.some((p) => Math.hypot(p.x - st.x, p.z - st.z) < 45)) continue;
    const off = Math.min(st.ek, 8) - 1.05;
    if (off < 0.5 || st.eb < 1.0) continue;
    const px = st.x + st.nx * off, pz = st.z + st.nz * off, rot = faceRot(st.nx, st.nz);
    if (!W.fits(px, pz, 1.5, 0.6, rot, { margin: 0.05, allow: F.LAWN }) || S.placed.near(px, pz, 1.6) || S.inDoorBox(px, pz, 1.0)) continue;
    if (W.span(px - st.nx * 0.5, pz - st.nz * 0.5, -st.nx, -st.nz, 8, F.BLD | F.TREE) < 2.5) continue;           // 2.5 m walking lane behind the box
    S.add('cityLight', px, pz, rot);
    const n = [Math.sin(rot), Math.cos(rot)], y = S.levelAt(px, pz), i = cnt.cityLights;
    S.panels.panel(T.cityLight(i), px + n[0] * 0.08, y + 1.52, pz + n[1] * 0.08, n[0], n[1], 1.2, 1.8, { lit: true });
    S.panels.panel(T.cityLight(i + 3), px - n[0] * 0.08, y + 1.52, pz - n[1] * 0.08, -n[0], -n[1], 1.2, 1.8, { lit: true });
    S.box(px, pz, 1.3, 0.45, rot, 2.5, { r: 0.9, tag: 'citylight' });
    placedC.push({ x: st.x, z: st.z }); S.svc.boxes.push({ x: px, z: pz, rotY: rot }); cnt.cityLights++;
  }

  // ---- wayfinding posts: where the tourists decide (Anichkov end, Mayakovskaya, Vosstaniya, the station side, Vladimirskaya), on the kerb side of a wide pavement
  const hubs = [[-425, -85], [-205, 105], [490, 120], [560, 205], [-165, 505], [150, 40], [-300, -30]];
  const placedW = [];
  for (const h of hubs) {
    let best = null;
    for (const st of sts) {
      const d = Math.hypot(st.x - h[0], st.z - h[1]); if (d > 45 || (best && d >= best.d)) continue;
      if (!/Невск|Лиговск|Фонтанк|Владимирск|Литейн/.test(st.rn)) continue;
      if (S.inForecourt(st.x, st.z, 6) || st.eb < 3.2) continue;
      const off = Math.min(st.ek, 8) - 1.3; if (off < 0.5) continue;
      const px = st.x + st.nx * off, pz = st.z + st.nz * off;
      if (!W.fits(px, pz, 0.5, 0.5, 0, { margin: 0.1, allow: F.LAWN }) || S.placed.near(px, pz, 1.4) || S.inDoorBox(px, pz, 1.0)) continue;
      best = { d, st, px, pz };
    }
    if (!best || placedW.some((p) => Math.hypot(p[0] - best.px, p[1] - best.pz) < 80)) continue;
    const { st, px, pz } = best, y = S.levelAt(px, pz);
    S.add('wayPost', px, pz, 0);
    // plates face along the pavement; three destinations, the nearest sights first, the arrow side from the bearing
    const t = [st.tx, st.tz], dests = DEST.map((d) => ({ d, dist: Math.hypot(d.at[0] - px, d.at[1] - pz) })).filter((o) => o.dist > 60).sort((a, b) => a.dist - b.dist).slice(0, 3);
    dests.forEach((o, k) => {
      const vx = o.d.at[0] - px, vz = o.d.at[1] - pz;
      for (const f of [1, -1]) {
        const nx = t[0] * f, nz = t[1] * f;                                      // plate normal (towards a viewer walking against it)
        const fx = -nx, fz = -nz, rx = -fz, rz = fx;                              // viewer forward and right (map frame, +Z south)
        const right = (vx * rx + vz * rz) > 0;
        S.panels.panel(T.way(o.d.n, right, o.d.sub), px + nx * 0.075 - (rx) * 0.0, y + 3.0 - k * 0.36, pz + nz * 0.075, nx, nz, 1.2, 0.3, {});
      }
    });
    S.solidCyl(px, pz, 0.14, 3.3); S.occupy(px, pz, 1.0, 'way'); (S.svc.ways ||= []).push({ x: px, z: pz }); placedW.push([px, pz]); cnt.ways++;
  }
  S.stats.ads = cnt;
}
void COL; void nearestWall; void walk; void Geo;
