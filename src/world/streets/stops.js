// streets/stops.js - bus / trolleybus stops (BUS_STOPS platforms): small black steel shelter with glass sides, a slatted back, bench, route board, bin, and a blue stop sign on a black post
// 2.4 m before it; the stop name on the fascia. Sources: docs/research/streets.md section 5 and nevsky.md section 7 (photos nevsky 59 61, P25 P18), transport.md section 8 (kerb-lane bays
// with yellow zig-zag marking). planStops() also gives the bay position (kerb lane, travel direction) that the traffic module needs.
import * as THREE from 'three';
import { VB } from './vb.js';
import { MB, UP, clamp } from './util.js';
import { COL, instances, hash2, nodeNear, TRACK_CLEAR, setStopRects } from './furn.js';
import { BUS_STOPS, PLATFORMS } from '../data/city.js';
import { nearestWay, wayAt, segInfo, trackDist, streetTrackDist } from './net.js';
import { WALK_Y, KERB_W } from './surface.js';
import { isOpen } from './region.js';
import * as L from '../layout.js';

const SHEL_W = 3.0, SHEL_D = 1.4;                                      // the shelter (shelterModel): along the road x deep
/** the shelter place of a stop beside way w at arclength s on `side`: the platform node is a hint (its lateral distance is kept when it lies 1.4 .. 6 m behind the kerb, else 1.0 m + half the depth) */
function kerbSpot(b, w, s, side) {
  const at = wayAt(w, s), edge = side > 0 ? at.hR : at.hL, nOut = [-at.tz * side, at.tx * side];
  const dNode = Math.hypot(b.x - at.x, b.z - at.z) - edge;
  const d = clamp(dNode > 1.4 && dNode < 6 ? dNode : KERB_W + 1.0 + SHEL_D / 2, KERB_W + 1.0 + SHEL_D / 2, 6);
  return { at, edge, cx: at.x + nOut[0] * (edge + d), cz: at.z + nOut[1] * (edge + d), tx: at.tx, tz: at.tz, nOut, dirT: w.oneway ? 1 : (side > 0 ? 1 : -1) };
}
/** ROAD CLEARANCE RULE of the stops: the footprint of the shelter (3.5 x 1.7 m with its bin) and the stop pole stand on no asphalt (any way, its pocket, a fillet, a tram bed) and on no tram track.
 *  gap = 0: not ON the carriageway (the measure of the audit); gap > 0 (a stop that is being re-placed): that far off every asphalt, 1.3 m off a track axis, outside buildings and water. */
function spotClear(net, p, gap, bld = false) {
  const hx = SHEL_W / 2 + 0.25, hz = SHEL_D / 2 + 0.15;
  const pts = [[0, 0], [-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz], [0, hz], [0, -hz], [-2.4 * p.dirT, -(SHEL_D / 2 - 0.1)]];       // (along the road, away from it): centre, corners, mid edges, the pole
  for (const [a, o] of pts) {
    const x = p.cx + p.tx * a + p.nOut[0] * o, z = p.cz + p.tz * a + p.nOut[1] * o;
    if (net.cover(x, z, {}) > (gap ? -gap : 0.03) || streetTrackDist(x, z) < TRACK_CLEAR) return false;
    if (gap && (L.insideBuilding(x, z, 0.2) || L.inRiver(x, z))) return false;
    if (bld && L.insideBuilding(x, z, 0.25)) return false;                     // (third-pass review: the OSM platform node may lie against a facade / a metro pavilion ring: the Gorny Institut lift pavilion hid half of the shelter at (-5042, -19.5); the stop slides along the kerb as for a shelter on the road)
  }
  return true;
}
/** Open districts (region.js): a stop whose shelter would stand on a carriageway or on the tram tracks (the platform belongs to the OTHER carriageway of a paired street, to a side street, or it is a
 *  tram platform beside a reservation) is re-placed: a tram platform beside its track gets the shelter on the platform, on the side away from the rails; else the stop moves to the kerb of the way
 *  the platform really stands at (the nearest ranked way it lies behind), sliding along it by up to 9 m. Mutates rec; false = nothing clear (the stop gets no furniture and no bay). */
function fixStop(net, b, rec) {
  const first = kerbSpot(b, rec.w, rec.s, rec.side);
  if (spotClear(net, first, 0, true)) return true;
  const asMapped = spotClear(net, first, 0);                                   // (clear of the road but against a building: it stays where it is when no better place exists, a stop is never dropped for that)
  const nearNode = (x, z) => net.nodes.some((n) => n.arms.length >= 3 && Math.hypot(n.x - x, n.z - z) < 14);
  // a tram platform: the line of the platform (PLATFORMS way), 1 - 3.5 m from the track axis
  if (b.tram) {
    const pl = PLATFORMS.find((q) => q.id === b.id && q.pts && q.pts.length >= 4), n = pl ? pl.pts.length : 0;
    const px = pl ? (pl.pts[0] + pl.pts[n - 2]) / 2 : b.x, pz = pl ? (pl.pts[1] + pl.pts[n - 1]) / 2 : b.z;
    let tx = pl ? pl.pts[n - 2] - pl.pts[0] : 0, tz = pl ? pl.pts[n - 1] - pl.pts[1] : 0; const tl = Math.hypot(tx, tz), dTrack = trackDist(px, pz);
    if (tl > 1 && dTrack < 3.5) {
      tx /= tl; tz /= tl;
      const sg = trackDist(px, pz, -tz, tx, 1) < trackDist(px, pz, -tz, tx, -1) ? -1 : 1, nOut = [-tz * sg, tx * sg];          // away from the nearer track
      for (let d = 1.0 + SHEL_D / 2; d <= 3.3; d += 0.4) {
        const p = { cx: px + nOut[0] * d, cz: pz + nOut[1] * d, tx, tz, nOut, dirT: 1 };
        if (!spotClear(net, p, 0.3)) continue;
        rec.spot = p; rec.noMark = true;                              // (no kerb, no zigzag: the trams stop on their track)
        return true;
      }
    }
  }
  // the ranked ways the platform stands behind, nearest kerb first
  const cand = [];
  net.each(b.x, b.z, 22, (w, i) => {
    if (w.rank < 1 || w.pedestrianOnly || w.tramBed) return;
    const q = segInfo(w, i, b.x, b.z), off = q.c.d - q.h; if (off < -1.5 || off > 14) return;
    const e = cand.find((c) => c.w === w); if (e && e.off <= off) return;
    const c = { w, off, side: q.side >= 0 ? 1 : -1, s: w.s[i] + (w.s[i + 1] - w.s[i]) * q.t };
    if (e) Object.assign(e, c); else cand.push(c);
  });
  cand.sort((p, q) => p.off - q.off);
  for (const c of cand) for (const ds of [0, 3, -3, 6, -6, 9, -9]) {
    const s = c.s + ds; if (s < 2 || s > c.w.L - 2) continue;
    const p = kerbSpot(b, c.w, s, c.side);
    if (nearNode(p.at.x, p.at.z) || !spotClear(net, p, 0.3)) continue;
    Object.assign(rec, { w: c.w, s, side: c.side, at: p.at, edge: p.edge, cx: p.at.x, cz: p.at.z, spot: p });
    return true;
  }
  return asMapped;
}

/** stops whose platform lies beside a road: { x, z, name, shelter, w, side, s } (the cycle track gives way to the shelter there) */
export function planStops(net) {
  const out = [];
  for (const b of BUS_STOPS) {
    if (b.kind !== 'platform') continue;
    const h = nearestWay(net, b.x, b.z, 22, 2); if (!h) continue;
    const { w, i, q } = h;
    const s = w.s[i] + (w.s[i + 1] - w.s[i]) * q.t, at = wayAt(w, s);
    const side = q.side >= 0 ? 1 : -1, edge = side > 0 ? at.hR : at.hL;
    // skip platforms that sit in the middle of a junction mouth
    if (nodeNear(net, at.x, at.z, 14)) continue;                        // (furn.js: the junction nodes hashed once; this scanned every node per platform)
    const rec = { id: b.id, x: b.x, z: b.z, name: b.name || '', shelter: !!b.shelter, bench: !!b.bench, bin: !!b.bin, bus: !!b.bus, trolley: !!b.trolley, tram: !!b.tram, routes: b.routes || {}, w, s, side, at, edge, cx: at.x, cz: at.z };
    if (isOpen(b.x, b.z) && !fixStop(net, b, rec)) continue;          // (open districts: never a shelter on a carriageway or on the rails)
    out.push(rec);
  }
  // (open districts: the footprints of the shelters keep every pole of streets out, furn.js setStopRects: the same place buildStops uses)
  setStopRects(out.filter((r) => r.shelter && isOpen(r.x, r.z)).map((r) => { const sp = r.spot || kerbSpot(r, r.w, r.s, r.side); return { cx: sp.cx, cz: sp.cz, tx: sp.tx, tz: sp.tz, a: SHEL_W / 2 + 0.8, b: SHEL_D / 2 + 0.3 }; }));
  return out;
}

function shelterModel(width = 3.0) {
  const V = new VB(), W = new VB(), G = new MB(), G2 = new MB();
  const D = 1.4, H = 2.6;                                              // local frame: +Z toward the road (open side), X along the road
  const steel = COL.black, wood = COL.woodS, bench = COL.wood;
  for (const x of [-width / 2 + 0.05, 0, width / 2 - 0.05]) for (const z of [-D / 2 + 0.05, D / 2 - 0.05]) V.box(0.08, H, 0.08, steel, [x, H / 2, z]);
  V.box(width + 0.3, 0.12, D + 0.3, steel, [0, H + 0.04, 0.05]);                            // flat roof slab
  V.box(width + 0.3, 0.34, 0.06, steel, [0, H - 0.17, D / 2 + 0.2]);                         // fascia with the name (panel added separately)
  V.box(width, 0.06, 0.06, steel, [0, 0.12, D / 2 - 0.05]); V.box(width, 0.06, 0.06, steel, [0, 0.12, -D / 2 + 0.05]);
  // wood slat panel in the back (centre part), glass elsewhere
  for (let k = 0; k < 9; k++) W.box(0.17, 1.9, 0.04, wood, [-0.9 + k * 0.225, 1.2, -D / 2 + 0.04]);
  V.box(2.1, 0.06, 0.07, steel, [0, 2.2, -D / 2 + 0.05]); V.box(2.1, 0.06, 0.07, steel, [0, 0.22, -D / 2 + 0.05]);
  // bench: three slats on a black frame, against the back
  for (let k = 0; k < 3; k++) W.box(1.7, 0.05, 0.12, bench, [-0.25, 0.46, -D / 2 + 0.2 + k * 0.14]);
  V.box(0.05, 0.45, 0.45, steel, [-1.0, 0.22, -D / 2 + 0.38]); V.box(0.05, 0.45, 0.45, steel, [0.5, 0.22, -D / 2 + 0.38]);
  // route map board (white) + litter bin
  V.box(0.62, 0.86, 0.03, '#f0efe9', [-1.15, 1.45, -D / 2 + 0.07]);
  // glass: back, left, right (centre of the back is wood: leave the panes beside it)
  const quadTo = (M, a, b, c, d, n) => { const v = [a, b, c, d].map((p, i) => M.vert(p[0], p[1], p[2], i === 1 || i === 2 ? 1 : 0, i > 1 ? 1 : 0, n)); M.quad(v[0], v[1], v[2], v[3], n); };
  const quad = (a, b, c, d, n) => quadTo(G, a, b, c, d, n);
  quad([-width / 2 + 0.05, 0.15, -D / 2 + 0.02], [width / 2 - 0.05, 0.15, -D / 2 + 0.02], [width / 2 - 0.05, 2.45, -D / 2 + 0.02], [-width / 2 + 0.05, 2.45, -D / 2 + 0.02], [0, 0, 1]);
  quad([-width / 2 + 0.05, 0.15, -D / 2 + 0.05], [-width / 2 + 0.05, 0.15, D / 2 - 0.05], [-width / 2 + 0.05, 2.45, D / 2 - 0.05], [-width / 2 + 0.05, 2.45, -D / 2 + 0.05], [1, 0, 0]);
  quad([width / 2 - 0.05, 0.15, D / 2 - 0.05], [width / 2 - 0.05, 0.15, -D / 2 + 0.05], [width / 2 - 0.05, 2.45, -D / 2 + 0.05], [width / 2 - 0.05, 2.45, D / 2 - 0.05], [-1, 0, 0]);
  // the same panes for the OPEN districts (region.js; docs/research/vo-requests-landmarksAndrew.md 12): the back pane lay in the plane of the BACK FACES of the wooden slats (z = -D/2 + 0.02: the slats are 0.04 deep at -D/2 + 0.04): coplanar,
  // 172 noisy pixels at 34 m (the Vasileostrovskaya shelter at (-4080, -1164)). Here it stands 1 cm behind every face of the frame (z = -D/2 - 0.01).
  quadTo(G2, [-width / 2 + 0.05, 0.15, -D / 2 - 0.01], [width / 2 - 0.05, 0.15, -D / 2 - 0.01], [width / 2 - 0.05, 2.45, -D / 2 - 0.01], [-width / 2 + 0.05, 2.45, -D / 2 - 0.01], [0, 0, 1]);
  quadTo(G2, [-width / 2 + 0.05, 0.15, -D / 2 + 0.05], [-width / 2 + 0.05, 0.15, D / 2 - 0.05], [-width / 2 + 0.05, 2.45, D / 2 - 0.05], [-width / 2 + 0.05, 2.45, -D / 2 + 0.05], [1, 0, 0]);
  quadTo(G2, [width / 2 - 0.05, 0.15, D / 2 - 0.05], [width / 2 - 0.05, 0.15, -D / 2 + 0.05], [width / 2 - 0.05, 2.45, -D / 2 + 0.05], [width / 2 - 0.05, 2.45, D / 2 - 0.05], [-1, 0, 0]);
  return { body: V.build(), wood: W.build(), glass: G, glassOpen: G2, W: width, D, H };
}

export function buildStops(ctx, net, stops, shared, root) {
  const { panels, poles } = shared;
  const F = ctx.tex.FONTS;
  const out = { stops: 0, shelters: 0, list: [], bollards: 0, rails: 0, tris: 0 };
  const busTex = shared.signs.tex('5.16'), [BUS_W, BUS_H] = shared.signs.size('5.16');
  const tramTex = shared.signs.tex('5.17');                                      // a stop that only trams serve (BUS_STOPS tram:1, no bus / trolleybus route) carries the tram sign 5.17 (open districts only: the reviewed ones keep the sign they have)
  const nameTex = (name) => ctx.tex.draw(512, 64, (g, w, h) => {
    g.fillStyle = '#16181c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f3f2ee'; g.textAlign = 'center'; g.textBaseline = 'middle'; ctx.tex.fitText(g, name, w / 2, h / 2 + 2, w - 40, 40, F.sans, 500);
  }, { key: 'pt-stopname-' + name, anisotropy: 4 });
  const shel = shelterModel(3.0);
  const mVC = ctx.mat.toon('#ffffff', { vertexColors: true, paint: 0.02, name: 'pt-shelter' });
  const glassM = ctx.mat.glass({ tint: '#a9bccb', opacity: 0.26, streaks: true });
  const woodM = mVC;
  const list = [];
  const dummy = new THREE.Object3D();
  const placed = [];
  for (const st of stops) {
    const { at, side, edge } = st;
    // the shelter place: beside the kerb of the stop's way, away from the road on the stop's side (kerbSpot), or the place planStops found for a stop that had to move (st.spot)
    const sp = st.spot || kerbSpot(st, st.w, st.s, side);
    const tx = sp.tx, tz = sp.tz, nOut = sp.nOut;
    const frontX = -nOut[0], frontZ = -nOut[1];
    const cx = sp.cx, cz = sp.cz;
    if (placed.some((p) => Math.hypot(p[0] - cx, p[1] - cz) < 6)) continue;
    placed.push([cx, cz]);
    const rotY = Math.atan2(frontX, frontZ);
    // pole + blue sign 2.4 m before the shelter (looking along the travel direction of the nearest lane)
    const dirT = sp.dirT;                                                         // direction the traffic nearest the stop travels (one-way carriageways: with the polyline)
    const px = cx + tx * dirT * -2.4 + frontX * (shel.D / 2 - 0.1), pz = cz + tz * dirT * -2.4 + frontZ * (shel.D / 2 - 0.1);
    ctx.physics.addCylinder(px, pz, 0.1, 0, 3);
    poles.cyl(0.05, 0.06, 3.0, COL.black, [px, WALK_Y + 1.5, pz], null, 6, null, true); poles.cyl(0.09, 0.1, 0.1, COL.blackL, [px, WALK_Y + 0.05, pz], null, 6, null, true);
    panels.mount(poles, st.tram && !st.bus && !st.trolley && isOpen(cx, cz) ? tramTex : busTex, px, WALK_Y + 2.58, pz, tx * dirT * -1, tz * dirT * -1, BUS_W, BUS_H, { pole: 0.05 });
    st.pole = { x: px, z: pz };
    if (st.shelter) {
      list.push({ x: cx, z: cz, rotY, st });
      { const c = Math.cos(rotY), sn = Math.sin(rotY), back = -shel.D / 2 + 0.05;       // colliders: back panel + the two glass sides (the front stays open)
        ctx.physics.addBox(cx + back * sn, cz + back * c, shel.W, 0.14, rotY, 0, 2.6);
        for (const sx of [-1, 1]) { const lx = sx * (shel.W / 2 - 0.05); ctx.physics.addBox(cx + lx * c, cz - lx * sn, 0.12, shel.D, rotY, 0, 2.6); } }
      // name band on the front fascia
      const ntex = nameTex(st.name || 'Остановка');
      panels.panel(ntex, cx + frontX * (shel.D / 2 + 0.24), WALK_Y + shel.H - 0.17, cz + frontZ * (shel.D / 2 + 0.24), frontX, frontZ, 3.1, 0.31);
      // litter bin beside the shelter
      poles.cyl(0.17, 0.15, 0.78, COL.black, [cx + tx * 1.95 + nOut[0] * 0.2, WALK_Y + 0.39, cz + tz * 1.95 + nOut[1] * 0.2], null, 6);
      out.shelters++;
    } else {
      // no shelter: a bench + bin
      const bx = cx + nOut[0] * 0.3, bz = cz + nOut[1] * 0.3, ry = Math.atan2(frontX, frontZ);
      poles.box(1.6, 0.05, 0.4, COL.wood, [bx, WALK_Y + 0.45, bz], [0, ry, 0]);
      poles.box(0.06, 0.45, 0.36, COL.black, [bx + tx * 0.7, WALK_Y + 0.22, bz + tz * 0.7], [0, ry, 0]); poles.box(0.06, 0.45, 0.36, COL.black, [bx - tx * 0.7, WALK_Y + 0.22, bz - tz * 0.7], [0, ry, 0]);
    }
    out.stops++;
    // the bay on the kerb lane where the vehicles stop: 1.75 m inside the road edge, and the direction they travel there (one-way carriageways: with the polyline)
    const bayT = st.w.oneway ? 1 : (side > 0 ? 1 : -1), kn = [-at.tz * side, at.tx * side];
    out.list.push({ id: st.id, name: st.name, x: cx, z: cz, rotY, shelter: st.shelter, side, road: st.w.id, kind: st.trolley ? (st.bus ? 'both' : 'trolley') : 'bus', routes: st.routes, tram: st.tram ? 1 : 0, s: st.s,
      bay: { x: at.x + kn[0] * (edge - 1.75), z: at.z + kn[1] * (edge - 1.75), tx: at.tx * bayT, tz: at.tz * bayT }, pole: st.pole || null });
  }
  // shelters: bake the model into every placement and merge (one mesh per material instead of one per shelter)
  const bake = (geo) => {
    const geos = [];
    for (const it of list) { dummy.position.set(it.x, WALK_Y, it.z); dummy.rotation.set(0, it.rotY, 0); dummy.updateMatrix(); const g = geo.clone(); g.applyMatrix4(dummy.matrix); geos.push(g); }
    return geos;
  };
  const bodies = bake(shel.body), woods = bake(shel.wood);
  const mergeG = (gs) => { if (!gs.length) return null; const m = ctx.geo.mergeGeometries(gs.map((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); return g; }), false); return m; };
  const bodyG = mergeG(bodies), woodG = mergeG(woods);
  if (bodyG) { const m = new THREE.Mesh(bodyG, mVC); m.castShadow = true; m.receiveShadow = true; m.name = 'pt-shelters'; root.add(m); out.tris += bodyG.index.count / 3; }
  if (woodG) { const m = new THREE.Mesh(woodG, woodM); m.castShadow = true; m.receiveShadow = true; m.name = 'pt-shelter-wood'; root.add(m); }
  // glass panes
  {
    const gb = new MB();
    for (const it of list) {
      const c = Math.cos(it.rotY), s = Math.sin(it.rotY);
      const g = isOpen(it.x, it.z) ? shel.glassOpen : shel.glass;
      const base = gb.n;
      for (let i = 0; i < g.n; i++) {
        const x = g.pos[i * 3], y = g.pos[i * 3 + 1], z = g.pos[i * 3 + 2];
        const nx = g.nrm[i * 3], nz = g.nrm[i * 3 + 2];
        gb.vert(it.x + x * c + z * s, WALK_Y + y, it.z - x * s + z * c, g.uv[i * 2], g.uv[i * 2 + 1], [nx * c + nz * s, 0, -nx * s + nz * c]);
      }
      for (let i = 0; i < g.idx.length; i++) gb.idx.push(base + g.idx[i]);
    }
    if (!gb.empty) { const m = new THREE.Mesh(gb.build(), glassM); m.name = 'pt-shelter-glass'; ctx.noOutline(m); ctx.noBatch(m); root.add(m); }
  }
  return out;
}

export { hash2, UP };
