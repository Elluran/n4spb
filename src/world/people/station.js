// people/station.js - the walkable graph of the Moscow Railway Station (simulation half): the three doors in the facade, the vestibule, the main hall and the concourse (floor 0.03), the
// turnstile line (d = 150), the apron under / behind the canopy, the six high platforms (deck 1.38 m, head / tail ramps 16 m rising from 0.08), and the benches, photo spots, door points
// and train door points that vignettes.js uses.  Built through the node / edge helpers of nav.js (api) and attached to the street graph through the door nodes.
// Sources: landmarksA/interior.js (IN, benches (u, d), turnstile line d = 150, doors u -6.145 / 0 / 6.145), landmarksA/halls.js (CANOPY), landmarksA/square.js (forecourt benches),
// rail service (platforms rows, gates, lanes, benches, trains[].doorsAt). The station frame (u along the facade, d into the building) comes from services.landmarks.stationFrame.
import { makeFrame } from './frame.js';

const FLOOR_Y = 0.03, STEP0 = 0.08, DECK_TOP = 1.38, RAMP = 16;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** the hall floor rectangles in the station frame (u0, u1, d0, d1): vestibule, hall + concourse, canopy floor behind the turnstiles */
const RECTS = [{ u0: -13.4, u1: 11.4, d0: 0.0, d1: 20.2, n: 'vest' }, { u0: -16.9, u1: 12.9, d0: 19.6, d1: 143.4, n: 'hall' }, { u0: -34.2, u1: 10.8, d0: 143.0, d1: 168.8, n: 'canopy' }];

export function addStation(ctx, nav, H) {
  const { api, gridNode, attach, near, interiors, FR } = H;
  const lm = ctx.services.landmarks || {}, rail = ctx.services.rail;
  if (!lm.stationFrame) return null;
  const { N, adj, addEdge, edgeOK, segFree } = api;
  const W = FR.W, UV = FR.UV;
  const out = { benches: [], hall: { nodes: [] }, platforms: [], apron: [], doors: [], stats: {} };
  const inRect = (x, z, m = 0) => { const [u, d] = UV(x, z); for (const r of RECTS) if (u >= r.u0 - m && u <= r.u1 + m && d >= r.d0 - m && d <= r.d1 + m) return true; return false; };
  nav.inHall = inRect;
  interiors.push((x, z) => inRect(x, z, 0.2));

  // ------------------------------------------------------------------ hall lattice (2.2 m): vestibule, hall, concourse, canopy floor
  const LS = 2.2, hall = new Map(), list = [];
  const addLattice = (r) => {
    for (let u = r.u0 + 0.9; u <= r.u1 - 0.9 + 1e-6; u += LS) for (let d = r.d0 + 0.9; d <= r.d1 - 0.9 + 1e-6; d += LS) {
      const [x, z] = W(u, d), key = Math.round(u / LS * 4) + ',' + Math.round(d / LS * 4);
      if (hall.has(key) || nav.obstDist(x, z, 0.7) < 0.5) continue;
      const id = gridNode(x, z, FLOOR_Y, 'h', 9100); hall.set(key, id); list.push({ id, u, d, key });
    }
  };
  for (const r of RECTS) addLattice(r);
  // 8-neighbour edges between lattice nodes closer than 3.4 m (the node positions are regular within a rectangle)
  const NC = 3.4;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j]; if (Math.abs(a.u - b.u) > NC || Math.abs(a.d - b.d) > NC) continue;
    const dd = Math.hypot(a.u - b.u, a.d - b.d); if (dd > NC) continue;
    if (edgeOK(N.x[a.id], N.z[a.id], N.x[b.id], N.z[b.id], false, 1.1) && segFree(N.x[a.id], N.z[a.id], N.x[b.id], N.z[b.id], 0.3)) addEdge(a.id, b.id, 0, -1, 0, 1.0);
  }
  out.hall.nodes = list.map((e) => e.id); out.stats.hallNodes = list.length;

  // ------------------------------------------------------------------ the three doors: forecourt node -> door sill -> vestibule
  const DOORS = [-6.145, 0, 6.145];
  for (const uc of DOORS) {
    const chain = [[uc, -3.2, 0.12], [uc, -1.4, 0.1], [uc, 0.5, FLOOR_Y + 0.03], [uc, 2.0, FLOOR_Y]];
    let prev = -1; const ids = [];
    for (const [u, d, y] of chain) { const [x, z] = W(u, d); const id = gridNode(x, z, y, d < 0 ? 'e' : 'h', 9200); ids.push(id); if (prev >= 0) addEdge(prev, id, 0, -1, 0, 1.0); prev = id; }
    // join the inner end to the vestibule lattice, the outer end to the forecourt graph
    const last = ids[ids.length - 1]; near(N.x[last], N.z[last], 4.2, (j) => { if (N.k[j] === 'h' && !ids.includes(j)) addEdge(last, j, 0, -1, 0, 1.0); });
    const first = ids[0]; let k = 0; const cand = []; near(N.x[first], N.z[first], 18, (j, dd) => { if (N.k[j] !== 'h' && N.k[j] !== 'e' && N.k[j] !== 'f' && N.k[j] !== 'g') cand.push([j, dd]); }); cand.sort((p, q) => p[1] - q[1]);
    for (const [j] of cand) { if (k >= 3) break; if (edgeOK(N.x[first], N.z[first], N.x[j], N.z[j], false, 1.2)) { addEdge(first, j, 0, -1, 0, 1.0); k++; } }
    out.doors.push({ u: uc, outside: first, inside: last, linked: k });
  }
  out.stats.doorLinks = out.doors.map((d) => d.linked).join('/');

  // ------------------------------------------------------------------ the apron between the turnstiles and the platform heads (ground 0.02), outside the decks
  const plats = (rail && rail.platforms) || [];
  const rowAt = (pl, z) => {
    const R = pl.rows; if (z <= R[0].z) return R[0]; if (z >= R[R.length - 1].z) return R[R.length - 1];
    let lo = 0, hi = R.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (R[m].z <= z) lo = m; else hi = m; }
    const a = R[lo], b = R[hi], k = (z - a.z) / (b.z - a.z); return { z, xl: a.xl + (b.xl - a.xl) * k, xr: a.xr + (b.xr - a.xr) * k };
  };
  const onDeck = (x, z, m = 0.8) => { for (const pl of plats) { if (z < pl.zHead - m || z > pl.zTail + m) continue; const r = rowAt(pl, z); if (x > r.xl - m && x < r.xr + m) return true; } return false; };
  const ap = new Map(), aplist = [];
  {
    const AS = 3.0;
    for (let u = -72; u <= 48; u += AS) for (let d = 151.5; d <= 270; d += AS) {
      const [x, z] = W(u, d); if (inRect(x, z, 0.3) || onDeck(x, z, 0.9) || nav.obstDist(x, z, 0.8) < 0.55 || nav.rawInBuilding(x, z) || nav.blocked(x, z)) continue;
      const id = gridNode(x, z, 0.02, 'g', 9300); ap.set(Math.round(u / AS) + ',' + Math.round(d / AS), id); aplist.push({ id, u, d });
    }
    for (let i = 0; i < aplist.length; i++) for (let j = i + 1; j < aplist.length; j++) {
      const a = aplist[i], b = aplist[j]; if (Math.abs(a.u - b.u) > 4.5 || Math.abs(a.d - b.d) > 4.5) continue;
      if (edgeOK(N.x[a.id], N.z[a.id], N.x[b.id], N.z[b.id], false, 1.2) && segFree(N.x[a.id], N.z[a.id], N.x[b.id], N.z[b.id], 0.3)) addEdge(a.id, b.id, 0, -1, 0, 1.05);
    }
    // seam to the canopy floor (hall nodes with d >= 150)
    for (const a of aplist) near(N.x[a.id], N.z[a.id], 4.6, (j) => { if (N.k[j] === 'h' && out.hall.nodes.includes(j) && UV(N.x[j], N.z[j])[1] > 146 && edgeOK(N.x[a.id], N.z[a.id], N.x[j], N.z[j], false, 1.2)) addEdge(a.id, j, 0, -1, 0, 1.0); });
  }
  out.apron = aplist.map((e) => e.id); out.stats.apronNodes = aplist.length;

  // ------------------------------------------------------------------ the platforms: lattice on the deck, ramps, joined to the apron through the gate node at the head
  const deckY = (pl, z) => { const a = clamp((z - pl.zHead) / RAMP, 0, 1), b = clamp((pl.zTail - z) / RAMP, 0, 1); return STEP0 + (DECK_TOP - STEP0) * Math.min(a, b); };
  for (const pl of plats) {
    const P = { ref: pl.ref, zHead: pl.zHead, zTail: pl.zTail, rows: [], nodes: [], head: -1, deckY: (z) => deckY(pl, z), rowAt: (z) => rowAt(pl, z) };
    const grid = []; // rows of node id arrays
    for (let z = pl.zHead + 1.6; z <= pl.zTail - 1.6 + 1e-6; z += 2.5) {
      const r = rowAt(pl, z), x0 = r.xl + 1.45, x1 = r.xr - 1.45, w = x1 - x0, nc = w < 0.5 ? 1 : Math.floor(w / 2.1) + 1, ids = [];
      for (let c = 0; c < nc; c++) {
        const x = nc === 1 ? (r.xl + r.xr) / 2 : x0 + (w * c) / (nc - 1);
        if (nav.obstDist(x, z, 0.7) < 0.5) { ids.push(-1); continue; }
        const id = gridNode(x, z, deckY(pl, z), 'f', 9400 + P.rows.length); ids.push(id); P.nodes.push(id);
      }
      grid.push({ z, ids, x0, x1 });
      P.rows.push({ z, ids });
    }
    for (let i = 0; i < grid.length; i++) {
      const A = grid[i], B = grid[i + 1];
      for (let a = 0; a < A.ids.length; a++) {
        const ia = A.ids[a]; if (ia < 0) continue;
        if (a + 1 < A.ids.length && A.ids[a + 1] >= 0) addEdge(ia, A.ids[a + 1], 0, -1, 0, 1.0);
        if (!B) continue;
        for (let b = 0; b < B.ids.length; b++) { const ib = B.ids[b]; if (ib < 0) continue; if (Math.abs(a / Math.max(1, A.ids.length - 1) - b / Math.max(1, B.ids.length - 1)) > 0.55) continue; if (segFree(N.x[ia], N.z[ia], N.x[ib], N.z[ib], 0.3)) addEdge(ia, ib, 0, -1, 0, 1.0); }
      }
    }
    // the head: a ground node just before the ramp, joined to the first row and to the apron
    const gz = pl.zHead - 0.5, r0 = rowAt(pl, pl.zHead + 1.6), gx = (r0.xl + r0.xr) / 2;
    const gate = gridNode(gx, gz, 0.02, 'g', 9500); P.head = gate;
    for (const id of (grid[0] ? grid[0].ids : [])) if (id >= 0) addEdge(gate, id, 0, -1, 0, 1.0);
    const cand = []; near(gx, gz, 14, (j, d) => { if (N.k[j] === 'g' && j !== gate) cand.push([j, d]); }); cand.sort((p, q) => p[1] - q[1]);
    let jn = 0; for (const [j] of cand) { if (jn >= 3) break; if (edgeOK(gx, gz, N.x[j], N.z[j], false, 1.2)) { addEdge(gate, j, 0, -1, 0, 1.0); jn++; } }
    P.joins = jn; out.platforms.push(P);
  }
  out.stats.platformNodes = out.platforms.reduce((s, p) => s + p.nodes.length, 0); out.stats.platformJoins = out.platforms.map((p) => p.joins).join('/');
  nav.platformOf = (ref) => out.platforms.find((p) => p.ref === ref);

  // ------------------------------------------------------------------ benches: the hall (landmarksA/interior.js), the forecourt (square.js), the platforms (rail service)
  const bAdd = (b) => { const rec = nav.addBench(b, b.kind || 'b'); if (rec) out.benches.push(rec); return rec; };
  const hallBench = (u, d, rot, len = 2.6) => { const [x, z] = W(u, d), yaw = rot + FR.TH + Math.PI; const nodeNear = nav.nearestNode(x + Math.sin(yaw) * 1.0, z + Math.cos(yaw) * 1.0, 3.2, (id) => N.k[id] === 'h'); if (nodeNear >= 0) bAdd({ x, z, rotY: yaw, len, y: FLOOR_Y, node: nodeNear, where: 'hall', w: 1 }); };
  for (const [u, d] of [[-9, 32], [-1, 32], [5.5, 32], [-9, 46], [-1, 46], [5.5, 46]]) { hallBench(u, d, 0); hallBench(u, d + 1.1, Math.PI); }
  for (const d of [76, 84, 108, 116, 126]) { hallBench(-8, d, Math.PI / 2); hallBench(-6.8, d, -Math.PI / 2); hallBench(4.5, d, Math.PI / 2); hallBench(5.7, d, -Math.PI / 2); }
  for (const u of [-46, -43.6, -41.2, 41.2, 43.6, 46]) { const [x, z] = W(u, -14), yaw = Math.PI + FR.TH + Math.PI; if (nav.cover(x, z) > -0.6 || !nav.walkable(x, z)) continue; bAdd({ x, z, rotY: yaw, len: 1.8, y: 0.12, where: 'forecourt' }); }
  for (const b of (rail && rail.benches) || []) {
    const pl = out.platforms.find((p) => p.ref === b.platform); if (!pl) continue;
    let best = -1, bd = 1e9; for (const id of pl.nodes) { const d = Math.hypot(N.x[id] - b.x, N.z[id] - b.z); if (d < bd) { bd = d; best = id; } }
    if (best >= 0 && bd < 5) bAdd({ x: b.x, z: b.z, rotY: b.rotY, len: b.len, y: b.y, node: best, where: 'platform', w: 0.5 });
  }
  out.stats.benches = out.benches.length;

  // ------------------------------------------------------------------ the Peter I bust: photograph it from the hall entrance side (the bust faces the vestibule: smaller d)
  const bust = (lm.monuments || []).find((m) => m.id === 'peter-bust');
  if (bust) {
    const [ub, db] = UV(bust.x, bust.z); out.bust = { x: bust.x, z: bust.z, u: ub, d: db };
    for (const [du, dd] of [[0, -5], [-2.4, -6.5], [2.4, -6.5], [0.6, -8.2], [-4, -9], [4, -9], [-1.4, -11], [1.8, -11]]) {
      const [x, z] = W(ub + du, db + dd), node = nav.nearestNode(x, z, 2.0, (id) => N.k[id] === 'h');
      if (node >= 0 && nav.obstDist(x, z, 1) > 0.5) nav.spots.push({ type: 'bust', x, z, yaw: Math.atan2(bust.x - x, bust.z - z), node, taken: -1, w: 1, tx: bust.x, tz: bust.z, th: 4, id: 'peter-bust' });
    }
  }
  // departure boards (landmarksA/interior.js: d = 70, 104, 134, hung over u -5.3..2.3): people stand under them and look up
  out.boards = [70, 104, 134].map((d) => { const [x, z] = W(-1.5, d); return { x, z, u: -1.5, d }; });

  // ------------------------------------------------------------------ the taxi booths of the forecourt (square.js: u -73 / 72.7, d -46): queue spots along the kerb
  out.taxi = []; for (const [u, d, du] of [[-66, -43, 1], [66, -42, -1]]) { const spots = []; for (let k = 0; k < 6; k++) { const [x, z] = W(u + du * k * 0.9, d); if (nav.walkable(x, z) && nav.obstDist(x, z, 1) > 0.4) spots.push({ x, z }); } if (spots.length > 3) out.taxi.push({ u, d, spots, yaw: FR.yawOf(0, -1) }); }
  out.stats.taxiQueues = out.taxi.length;
  return out;
}
