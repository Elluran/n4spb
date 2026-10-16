// landmarksGavan/bridge.js - the SHKIPERSKY BRIDGE (Шкиперский мост, 1997, R. R. Shipov, the first Bailey-type bridge in Russia, British Mabey panels): a single-span galvanised through truss over the canal head
// (dossier docs/research/gavan.md section 6; photos refs/gavan 22 26 27 30; OSM deck r5576714, road w374845529, footway w697242808).  Frame B: origin (-7009.5, -31.0), u east (bearing 79.4), v south, NORTH = -v.
//   CROSS-SECTION (corrected, C10; outer width 9.0 m, v -4.5 .. +4.5): W-beam barrier 0.15 + north truss 0.45 + plank footway 1.5 + divider rail 0.2 + steel-sheet roadway 5.8 (two lanes) + south truss 0.45 + outer rail 0.45.
//   TRUSS     two through trusses, 8 panels of 3.05 m (24.4 m, bearings at u +-11.25 = the 22.5 m span), height 2.1 m between the chords + 0.3 top chord, vertical posts, X diagonals with a mid post (the diamond lattice),
//             galvanised steel; deck girders and cross beams under the roadway rusted brown; the underside at -0.84 (2.5 m above the water at -3.4); four steel-tube piles per bearing with a cross beam and X bracing.
//   DECK      34.6 m long over the water (the drawn deck stops at u +-16.6: the approach asphalt of the streets starts at +-17.2), flat at DECK = 0.12 over the quay top; walk box over the whole width; the truss, the divider rail and the outer rails are solid.  No lamps (the cobra-head poles belong to streets), no pipes.
//   The 1997 truss still stands in October 2026 (BRIDGE_STATE = 'mabey'); a temporary parallel bridge is not modelled.  Publishes svc.bridge = { deckY } and chains landmarksC.bridge.deckY (the car's road query).
import { FB, SW } from './frame.js';
import { bar } from './prims.js';

export const DECK = 0.12, HL = 16.6, HWALK = 17.45, TRUSS_HL = 12.2, BEARING = 11.25, PANEL = 3.05;
const ZN = { out: -4.5, trN0: -4.35, trN1: -3.9, foot0: -3.9, foot1: -2.4, div0: -2.4, div1: -2.2, road0: -2.2, road1: 3.6, trS0: 3.6, trS1: 4.05, outS: 4.5 };

export function build(Q) {
  const errs = [];
  const stage = (name, fn) => { try { fn(); } catch (e) { console.error(`[landmarksGavan] bridge/${name}:`, e); errs.push(`${name}: ${e && e.stack || e}`); } };
  const P = Q.P, M = Q.M, ph = Q.ctx.physics;
  if (SW.BRIDGE_STATE !== 'mabey') return;
  FB.on(P, () => {
    stage('deck', () => {
      P.box(M.deckSteel, -HL, HL, DECK - 0.1, DECK, ZN.road0, ZN.road1, 'b', 2);                                   // steel-sheet roadway (two 2.9 m lanes)
      P.box(M.plank, -HL, HL, DECK - 0.08, DECK + 0.03, ZN.foot0, ZN.foot1, 'b', 2);                               // plank footway on the upstream (north) side
      // longitudinal girders and cross beams under the deck, rusted brown (the trusses themselves are galvanised)
      for (const z of [-3.2, -0.9, 1.5, 3.3]) { P.box(M.rust, -HL, HL, DECK - 0.88, DECK - 0.12, z - 0.07, z + 0.07, 't', 2); P.box(M.rust, -HL, HL, DECK - 0.92, DECK - 0.86, z - 0.2, z + 0.2, '', 2); }
      for (let x = -HL + 0.7; x < HL; x += 1.5) P.box(M.rust, x - 0.07, x + 0.07, DECK - 0.55, DECK - 0.1, ZN.out, ZN.outS, 't', 2);
      P.box(M.rust, -HL, HL, DECK - 0.1, DECK - 0.04, ZN.out, ZN.foot0, 'bt', 2); P.box(M.rust, -HL, HL, DECK - 0.1, DECK - 0.04, ZN.road1, ZN.outS, 'bt', 2);       // the deck edge strips under the trusses
      // the W-beam barrier on the north (upstream) side, the low outer rail with posts on the south side
      P.box(M.steel, -HL, HL, DECK + 0.45, DECK + 0.9, ZN.out, ZN.out + 0.15, '', 2);
      for (let x = -HL + 0.4; x <= HL; x += 2.0) P.box(M.steel, x - 0.05, x + 0.05, DECK, DECK + 0.95, ZN.out + 0.15, ZN.out + 0.27, 'b', 1);
      P.box(M.steel, -HL, HL, DECK + 0.0, DECK + 0.2, ZN.trS1, ZN.outS, 't', 2);
      for (let x = -HL + 0.4; x <= HL; x += 2.0) P.box(M.steel, x - 0.04, x + 0.04, DECK, DECK + 1.0, ZN.outS - 0.08, ZN.outS, 'b', 1);
      P.box(M.steel, -HL, HL, DECK + 0.95, DECK + 1.02, ZN.outS - 0.08, ZN.outS, '', 2); P.box(M.steel, -HL, HL, DECK + 0.5, DECK + 0.55, ZN.outS - 0.08, ZN.outS, '', 2);
    });
    stage('trusses', () => {
      for (const [z0, z1] of [[ZN.trN0, ZN.trN1], [ZN.trS0, ZN.trS1]]) {
        const zc = (z0 + z1) / 2, yb = DECK + 0.3, yt = DECK + 2.2;
        P.box(M.steel, -TRUSS_HL, TRUSS_HL, DECK, DECK + 0.3, z0, z1, '', 2);                                    // bottom chord
        P.box(M.steel, -TRUSS_HL, TRUSS_HL, yt, yt + 0.3, z0, z1, '', 2);                                        // top chord
        for (let i = 0; i <= 8; i++) { const x = -TRUSS_HL + i * PANEL; P.box(M.steel, x - 0.07, x + 0.07, yb, yt, z0 + 0.06, z1 - 0.06, '', 2); }          // posts
        for (let i = 0; i < 8; i++) {
          const xa = -TRUSS_HL + i * PANEL, xb = xa + PANEL, xm = (xa + xb) / 2;
          bar(P, M.steel, [xa, yb, zc], [xb, yt, zc], 0.05, 4); bar(P, M.steel, [xa, yt, zc], [xb, yb, zc], 0.05, 4);                                     // the X of the panel
          P.box(M.steel, xm - 0.06, xm + 0.06, yb, yt, z0 + 0.08, z1 - 0.08, '', 2);                                                                        // mid post
        }
        // top bracing between the two trusses at the ends is omitted (through truss: the roof is open)
      }
      // portal sway frames at both ends: a cross bar over the roadway at the end posts
      for (const s of [-1, 1]) P.box(M.steel, s * TRUSS_HL - 0.1, s * TRUSS_HL + 0.1, DECK + 2.25, DECK + 2.5, ZN.trN0, ZN.trS1, '', 2);
      // the divider rail between the footway and the roadway (1.1 m, galvanised) under the truss span
      for (let x = -TRUSS_HL; x <= TRUSS_HL + 0.01; x += 1.525) P.box(M.steel, x - 0.05, x + 0.05, DECK, DECK + 1.1, ZN.div0 + 0.04, ZN.div1 - 0.04, 'b', 1);
      P.box(M.steel, -TRUSS_HL, TRUSS_HL, DECK + 1.0, DECK + 1.12, ZN.div0, ZN.div1, '', 2); P.box(M.steel, -TRUSS_HL, TRUSS_HL, DECK + 0.5, DECK + 0.57, ZN.div0 + 0.04, ZN.div1 - 0.04, '', 2);
    });
    stage('piles', () => {
      // at each bearing: four steel tubes (dia 0.52) in the water, a cross beam, X bracing between the tubes
      for (const x of [-BEARING, BEARING]) {
        const zs = [-3.3, -1.1, 1.1, 3.3];
        for (const z of zs) P.col(M.pile, x, z, -4.6, DECK - 0.88, 0.26, 0.26, 8, false);
        P.box(M.pile, x - 0.25, x + 0.25, DECK - 1.38, DECK - 0.88, -4.2, 4.2, '', 2);
        for (let k = 0; k + 1 < zs.length; k++) { bar(P, M.rust, [x, -1.6, zs[k]], [x, -3.4, zs[k + 1]], 0.04, 4); bar(P, M.rust, [x, -3.4, zs[k]], [x, -1.6, zs[k + 1]], 0.04, 4); }
      }
    });
  });
  stage('physics', () => {
    FB.walk(ph, 0, 0, 2 * HWALK, 8.9, DECK, -8);                                                              // the deck (the quay opens under it: nobody falls)
    for (const [z0, z1] of [[ZN.trN0, ZN.trN1], [ZN.trS0, ZN.trS1]]) FB.box(ph, 0, (z0 + z1) / 2, 2 * TRUSS_HL, z1 - z0 + 0.1, DECK, DECK + 2.7);       // the two trusses
    for (const z of [ZN.out + 0.1, ZN.outS - 0.05]) FB.box(ph, 0, z, 2 * HL + 0.6, 0.3, DECK - 1, DECK + 1.1);                                            // the outer rails
    FB.box(ph, 0, (ZN.div0 + ZN.div1) / 2, 2 * TRUSS_HL, 0.28, DECK, DECK + 1.15);                                                                       // the divider rail
    // wing walls of the 1997 abutments (review fix, request of bridges-3): the quay opens by the deck polygon + 1 m, the outer rail stops at |u| 16.9, so a 2 m slit of the opened quay stayed on the NORTH
    // (upstream) side at both ends: a solid block across it, u +-(16.5 .. 18.6), v -6.0 .. -4.3, from the water bed to 1.3 m above the deck
    for (const s of [-1, 1]) FB.box(ph, s * 17.55, -5.15, 2.1, 1.7, -8, 1.3);
  });
  // services: deckY for the car (the invisible fallback deck is gone once the deck is claimed); the pedestrians' footway is the north strip
  const mine = (x, z) => { const p = FB.M(x, z); return Math.abs(p.u) <= HWALK && Math.abs(p.v) <= 4.7 ? DECK : null; };
  Q.svc.bridge = { deckY: mine, centre: FB.W(0, 0), halfLength: HWALK, width: 9.0, footway: 'north', maxWeight: 8 };
  try {
    const lc = Q.ctx.services.landmarksC && Q.ctx.services.landmarksC.bridge;
    if (lc && typeof lc.deckY === 'function' && !lc.deckY.__gavan) { const orig = lc.deckY, w = (x, z) => { const y = mine(x, z); return y !== null ? y : orig(x, z); }; w.__gavan = true; w.__bridges = orig.__bridges; lc.deckY = w; }
  } catch (e) { console.warn('[landmarksGavan] deckY chain:', e && e.message); }
  const c = FB.W(0, 0);
  Q.svc.photoSpots.push({ x: c.x, z: c.z, yaw: 173, pitch: 0, name: 'Шкиперский мост: вниз по каналу' });
  Q.svc.monuments.push({ id: 'r5576714', name: 'Шкиперский мост', x: c.x, z: c.z, h: 3 });
  Q.svc.crowd.push({ id: 'bridge', kind: 'photo', x: c.x, z: c.z, r: 8, n: 3, y: DECK });
  if (errs.length) throw new Error(errs.join('\n'));
}
