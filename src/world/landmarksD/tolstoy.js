// landmarksD/tolstoy.js - the Tolstoy House (Доходный дом графа М. П. Толстого, Рубинштейна 15-17 / Фонтанка 54, Fyodor Lidval 1910-12, northern Art Nouveau with classical touches; OSM r1588827) and the
// neighbouring block Rubinshteyna 13 (r368263).  Sources: ru.wikipedia "Толстовский дом" (a red brick lower tier, grained grey plaster above with YELLOW-painted sandriks / panels, simple geometric mansards,
// the three-span limestone gate arches with pilasters and obelisks; the courtyard fronts are dressed like the street fronts) and refs/landmarksD/tolstoy 02 03 04 10 14.
//   Lower tier (two brick storeys, 8.4 m) with beige piers, four plastered storeys above (cornice 23.4 m), a white / zinc mansard storey with a railing and a grey sheet roof (top 28 m);
//   windows on a 3.3 m pitch, entrances with stone surrounds, a three-span arch (centre 5.4 m wide, 9.5 m high) in the middle of the Fontanka front and of the long Rubinshteyna front.
//   NOTE: no tower is visible on the Fontanka / Rubinshteyna fronts in any photo, so none is built.  Heights are from the research, not OSM (levels 5).
import { buildHouse } from './house.js';
import { findEdge } from './kit.js';

const BRICK = '#b4603e', PIER = '#c9b48c', PLASTER = '#b3a589', PLASTER_C = '#a89a82', YELLOW = '#d9b46a', ZINC = '#d6dadc', ROOF = '#9aa1a5', STONE = '#b9aa8e';
const LOW = 8.4, HC = 23.4, ATT = 4.6, UP = 0.45;

export function build(K) {
  const L = K.L, M = K.mats;
  const recs = L.groupMembers('tolstoy').filter((r) => !r.skip);
  K.svc.houses.push({ id: 'r1588827', name: 'Толстовский дом', nameEn: 'Tolstoy House (Rubinshteyna 15-17 / Fontanka 54)', x: -517, z: 335 }, { id: 'r368263', name: 'Рубинштейна, 13', nameEn: 'Rubinshteyna 13', x: -430, z: 320 });
  K.svc.monuments.push({ id: 'r1588827', name: 'Толстовский дом', x: -540, z: 310, h: 28 });
  K.svc.photoSpots.push({ x: -672, z: 292, yaw: L.yawToward(-672, 292, -615, 282), pitch: 6, name: 'Толстовский дом с Фонтанки' });
  const gateEdge = (e) => !!findEdge([e], -626.8, 298.7, -596.5, 262.5, 0.6) || !!findEdge([e], -449.4, 404.6, -532.9, 366.9, 0.6);
  for (const rec of recs) {
    const hc = rec.id === 'r368263' ? 20.8 : HC;
    buildHouse(K, {
      name: 'tolstoy', recs: [rec], hc, wall: PLASTER, court: PLASTER_C, plinth: 0.0, cornice: 'none', roofMat: K.mat(ROOF, { name: 'lmD-roof-tol' }), roofHc: hc + ATT,
      upstand: UP, railing: false, bands: [{ y0: hc - 0.7, y1: hc, d: 0.3, mat: M.cream }],
      front: (e, c) => { front(K, e, c.len, hc, gateEdge(e)); return true; },
    });
  }
}

function front(K, e, len, hc, gate) {
  const M = K.mats, P = K.P, brick = K.wall(BRICK), plaster = K.wall(e.hole ? PLASTER_C : PLASTER), yel = K.mat(YELLOW), pier = K.mat(PIER);
  if (len < 2.6) { K.wallQuad(plaster, 0, len, 0, hc + UP, 3); return; }
  const top = hc + UP, low = LOW;
  const mid = len / 2, rows = hc > 22 ? [9.9, 13.65, 17.4, 21.0] : [9.9, 13.65, 17.4];
  let holes = [];
  if (gate && len > 24) holes = [{ x: mid, y0: 0, w: 5.4, h: 6.8, head: 'arch' }, { x: mid - 4.7, y0: 0, w: 2.5, h: 4.4, head: 'arch' }, { x: mid + 4.7, y0: 0, w: 2.5, h: 4.4, head: 'arch' }];
  if (holes.length) K.wallWithHoles(plaster, 0, len, 0, top, holes, 3); else K.wallQuad(plaster, 0, len, 0, top, 3);
  const g0 = gate && holes.length ? mid - 7.2 : 1e9, g1 = gate && holes.length ? mid + 7.2 : -1e9;
  // brick tier: two quads either side of the gate (or one)
  const seg = holes.length ? [[0, g0], [g1, len]] : [[0, len]];
  for (const [a, b] of seg) if (b - a > 0.3) P.box(brick, a, b, 0, low, 0, 0.02, 'kbtlr');
  if (holes.length) {
    P.push(0, 0, 0.04, 0); K.wallWithHoles(K.wall(STONE), g0, g1, 0, 10.6, holes.map((h) => ({ ...h })), 2.4, 1.2); P.pop();
    P.box(K.mats.doorDark, mid - 2.7, mid + 2.7, 0, 9.4, -0.6, -0.5, 'kb');
    for (const dx of [-4.7, 4.7]) P.box(K.mats.doorDark, mid + dx - 1.25, mid + dx + 1.25, 0, 5.6, -0.6, -0.5, 'kb');
    // obelisks over the side arches
    for (const dx of [-4.7, 4.7]) { const x = mid + dx; const ob = new K.THREE.Shape(); ob.moveTo(x - 0.45, 10.6); ob.lineTo(x + 0.45, 10.6); ob.lineTo(x + 0.12, 13.2); ob.lineTo(x - 0.12, 13.2); ob.lineTo(x - 0.45, 10.6); P.extrude(K.wall(STONE), ob, 0.0, 0.5, 1, 4); }
    P.box(K.wall(STONE), g0, g1, 10.6, 10.95, 0, 0.5, 'k');
  }
  const bays = K.bays(0.9, len - 0.9, 3.3), n = bays.length;
  bays.forEach((x, i) => {
    if (x > g0 - 1.0 && x < g1 + 1.0) return;
    const door = i % 4 === 2 && !e.hole;
    // brick tier
    if (door) K.gate(x, 0.0, 1.5, 2.7, { sw: 0.25, d: 0.12, ring: true, ringMat: K.mat(STONE) });
    else K.window({ x, y: 1.0, w: 1.05, h: 1.9, sw: 0.1, d: 0.06, frame: 'white', surMat: pier, sill: false });
    K.window({ x, y: 4.9, w: 1.05, h: 2.1, sw: 0.1, d: 0.06, frame: 'white', surMat: pier, sill: true });
    // plaster tiers
    rows.forEach((y, r) => {
      if (y + 2.0 > hc) return;
      K.window({ x, y, w: 1.05, h: 1.9, head: r === 1 && i % 2 === 0 ? 'arch' : 'flat', sw: 0.12, d: 0.07, frame: 'white', surMat: yel, sill: false, hood: r === 0 && i % 5 === 3 ? 'tri' : null, hoodH: 0.5 });
      if (r % 2 === 0) P.box(yel, x - 0.55, x + 0.55, y - 0.75, y - 0.35, 0, 0.05, 'kb');                    // yellow panel under the window
    });
    // attic windows
    K.window({ x, y: hc + UP + 1.4, w: 0.95, h: 1.3, sw: 0.08, d: 0.05, frame: 'white', surMat: M.cream, sill: false });
  });
  for (let i = 0; i <= n; i++) { const x = i === 0 ? 0.45 : i === n ? len - 0.45 : 0.9 + (len - 1.8) * i / n; if (x > g0 - 0.8 && x < g1 + 0.8) continue; P.box(pier, x - 0.35, x + 0.35, 0.0, low - 0.1, 0, 0.08, 'kbtlr'); }
  P.box(M.cream, 0, len, low - 0.35, low + 0.15, 0, 0.12, 'k');                                              // frieze over the brick tier
  P.box(yel, 0, len, low + 0.15, low + 0.4, 0, 0.1, 'k');
  // mansard storey: a white / zinc wall in the plane of the facade above the cornice (the sheet roof is the flat cap of buildHouse)
  K.wallQuad(K.mat(ZINC), 0, len, hc + UP, hc + UP + ATT, 3);
  P.box(M.cream, 0, len, hc + UP, hc + UP + 0.2, 0, 0.18, 'k');
  for (const x of [0.5, len - 0.5]) K.downpipe(x, 0.2, hc - 1.0, M.shade);
}
