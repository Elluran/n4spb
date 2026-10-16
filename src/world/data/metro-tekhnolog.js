// Static metro data of Tekhnologichesky Institut 1 + 2 (docs/research/metro-south-vitebsky-tekhnolog.md sections 1, 3, 6, 7, 9; frames: docs/research/metro-frames-south-east.md).
// Plain data + pure functions, no three.js and NO import of data/metro.js: data/metro.js calls define() with its own tables and helpers (one line at its end):
//   import { define as defineTekhnolog } from './metro-tekhnolog.js';
//   defineTekhnolog({ FRAMES, ESC2, DOORWAYS, SHAFTS, STATIONS, LINES, esc2, toWorld, toLocal, dirOf, TAN, SIN, COS, SHAFT_LEN, SHAFT_W });
//
//   FRAMES.tekhnolog   hall 1 (WEST, column / arcade hall), line 1, +z SSW toward Baltiyskaya; PCA of the OSM platform w192592694 (frames tool), level -40 (dossier correction 3: ~40 m, not 60)
//   FRAMES.tekhnolog2  hall 2 (EAST, pylon hall), line 2, +z NNE toward Sennaya / Parnas; PCA of w418563876, level -40
//   KNOWN SIMPLIFICATION: the real station is a cross-platform interchange (hall 1 = both SOUTHBOUND tracks of lines 1 and 2, hall 2 = both NORTHBOUND tracks). The ride engine keeps both
//   tracks of a line in ONE hall, so hall 1 carries both line-1 tracks and hall 2 both line-2 tracks (the two halls, the cross passage and the vestibule are geometrically faithful).
//   ESC2.tekhnolog     4 lanes from the shared vestibule (r2163775) to the NNE end of hall 1. The axial head (OSM (-1836, 1782)) puts the 13 m shaft mouth 4.5 m outside the west facade (the
//                      4-lane tube is 10 m wide): the incline is turned 8 deg about its foot (descent compass 211.9 instead of 203.9), head (-1826.5, 1781.7), the mouth 3.5 m inside the walls.
//   ESC2.tekhnolog2    3 lanes, AXIAL with hall 2 (OSM head (-1793, 1798)); the foot 4 m beyond the NNE end of the platform (head (-1790.1, 1790.5), 2.0 m inside the walls).
//   DOORWAYS           the OSM nodes n4189476668 (entrance, -1835, 1800.9) and n4189482980 (exit, -1818.8, 1758) lie 6.0 / 7.0 m INSIDE the footprint of r2163775: they are snapped onto the
//                      nearest STREET front (TK_FRONT: the west wall on Moskovsky pr. and the curved corner front onto the square) so that lib/massing.js can split the wall colliders
//                      there. Only those edges: the exit node is 4.4 m from the party wall (-1819.3, 1749.7)-(-1810.3, 1762.2) shared with w62395210, and a door there opened into that
//                      building (tools/metro-tekhnolog-test.mjs section 1: "doorway not on the facade"); on the curved front it is at (-1822.9, 1752.4), 4.5 m from that corner.
// Everything that is a decision of the hall builders (central hall length of hall 2, the transfer stair and bridge) is in TK, shared by metro/st-tekhnolog.js and metro/hub-tekhnolog.js.

/** numbers shared by the data rows and the builders (metres; FY = platform level) */
export const TK = {
  FY: -40,                    // both platforms (dossier: ~40 m; escalator rides 98 / 91 s)
  PZ1: 81,                    // hall 1 half length: an 8-car 81-725.1 train is 157 m (OSM polygon 149.4 m)
  PZ2: 75,                    // hall 2 half length (6 cars of 81-717 line 2 = 118 m; OSM 149 m)
  LOW1: 6,                    // hall 1: escalator foot this far beyond the NNE end of the platform (a trapezoid lower hall between the turned tube and the end wall)
  LOW2: 4,                    // hall 2: escalator foot beyond the NNE end of the platform (axial lower hall)
  ROT1: -8 * Math.PI / 180,   // turn of the hall-1 incline about its foot (see the header)
  A1: 5.05, A2: 4.05,         // half widths of the escalator tubes (4 / 3 lanes)
  PASS: 4.2,                  // the transfer passage floor above the platforms (dossier 3-4 m; 4.2 keeps the hall-1 stair clear of the roof of a standing train and of the auto-board band)
  RUN: 7.0, STEPS: 24,        // both transfer stairs: 24 risers of 0.175 m, 0.29 m treads
  SW1: 7.0,                   // hall 1: width of the three-flight stair (two pairs of twin fluted columns)
  XS0: 2.4,                   // hall 1: the stair starts 2.0 m inside the central hall (local x) and climbs toward hall 2 (+x): every tread within 2.6 m of the +x track is > 3 m up
                              // (metro.js auto-board looks at walkers within 3 m of the platform level) and its underside clears the roof of a standing train by 0.8 m
  SW2: 6.4,                   // hall 2: width of the axial stair at the SSW end of its central hall
  PW: 4.2,                    // clear width of the cross passage and of the hall-2 bridge
  CEN2: 64,                   // hall 2: length of the central hall (dossier: ~64 m, OSM footway w193031796)
  ZC2: null,                  // hall 2: local z of the cross passage axis (= hall 1 z 0), set by define()
  VEST: { bldg: 'r2163775', ceil: 5.6, floor: 0.05 },
};
// the footprint of r2163775 (city data BUILDINGS, outer ring) for the door snapping and the vestibule room; the metro draws the rooms INSIDE it (docs/research/metro-south-vitebsky-tekhnolog.md 9.3)
export const TK_FOOTPRINT = [[-1810.9, 1797.6], [-1811.5, 1798.2], [-1805.4, 1803.7], [-1812, 1810.8], [-1818.1, 1805.2], [-1824.8, 1803.2], [-1826.7, 1804], [-1826.1, 1823.7], [-1840.5, 1830.9],
  [-1841.5, 1777.8], [-1840.7, 1772.2], [-1838.6, 1767.2], [-1835.2, 1762.3], [-1830.6, 1758], [-1819.3, 1749.7], [-1810.3, 1762.2], [-1808, 1767], [-1804.4, 1765.4], [-1802.1, 1768.2],
  [-1795, 1771.6], [-1796.5, 1775.7], [-1782.3, 1782.2], [-1783.3, 1784.4], [-1778.5, 1786.5], [-1785, 1800.9], [-1784, 1801.4], [-1785.2, 1804.3], [-1786.3, 1803.8], [-1788.1, 1808]];

// the street front of r2163775: edge i runs from TK_FOOTPRINT[i] to [i + 1]. 8 = the west wall on Moskovsky pr., 9..13 = the curved corner front (Moskovsky / Zagorodny) up to the
// party wall with w62395210 (edge 14); the other edges are party walls or yard walls, never a metro door
export const TK_FRONT = [8, 9, 10, 11, 12, 13];

/** the point of the footprint outline nearest to (x, z) and the outward unit normal there; edges = the allowed edge indices (default: all) */
export function snapToFacade(x, z, ring = TK_FOOTPRINT, edges = null) {
  let best = null;
  for (let i = 0; i < ring.length; i++) {
    if (edges && !edges.includes(i)) continue;
    const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz; if (l2 < 1e-6) continue;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)), px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) { const l = Math.sqrt(l2); best = { d, x: px, z: pz, ux: dx / l, uz: dz / l }; }
  }
  // outward = the side of the edge away from the polygon interior (tested 0.5 m off the edge)
  const inside = (qx, qz) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j]; if ((a[1] > qz) !== (b[1] > qz) && qx < (b[0] - a[0]) * (qz - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
  let nx = best.uz, nz = -best.ux; if (inside(best.x + nx * 0.5, best.z + nz * 0.5)) { nx = -nx; nz = -nz; }
  return { x: best.x, z: best.z, nx, nz, rotY: Math.atan2(nx, nz), moved: best.d };
}

const L4 = [{ x: -3, dir: -1 }, { x: -1, dir: -1 }, { x: 1, dir: 1 }, { x: 3, dir: 1 }], L3 = [{ x: -2, dir: -1 }, { x: 0, dir: -1 }, { x: 2, dir: 1 }];

/**
 * Adds the two halls to the tables of data/metro.js (called once from there; T = its tables and helpers). Idempotent.
 * T = { FRAMES, ESC2, DOORWAYS, SHAFTS, STATIONS, LINES, esc2, toWorld, toLocal, dirOf, TAN, SIN, COS, SHAFT_LEN, SHAFT_W }
 */
export function define(T) {
  const { FRAMES, ESC2, DOORWAYS, SHAFTS, STATIONS, esc2, toWorld, toLocal, TAN, SHAFT_LEN } = T;
  if (FRAMES.tekhnolog && FRAMES.tekhnolog2 && ESC2.tekhnolog) return;
  FRAMES.tekhnolog = { x: -1898.20, z: 1920.15, yaw: -0.4163, y: TK.FY, len: 2 * TK.PZ1, line: '1' };     // +z compass 203.9 (SSW) toward Baltiyskaya; the incline hangs on the -z (NNE) end
  FRAMES.tekhnolog2 = { x: -1849.15, z: 1926.50, yaw: 2.7317, y: TK.FY, len: 2 * TK.PZ2, line: '2' };    // +z compass 23.5 (NNE) toward Sennaya; the incline hangs on the +z (NNE) end
  const F1 = FRAMES.tekhnolog, F2 = FRAMES.tekhnolog2, run = (0 - TK.FY) / TAN;
  // the cross passage: hall-1 local z = 0 (the exact middle of hall 1, dossier 3.3) is z = ZC2 in hall 2 (the axes are 0.4 deg from antiparallel)
  { const [wx, wz] = toWorld(F1, 0, 0); TK.ZC2 = toLocal(F2, wx, wz)[1]; }
  // hall 1: the incline turned ROT1 about its foot (the foot LOW1 m beyond the NNE end, on the axis)
  {
    const foot = toWorld(F1, 0, -(TK.PZ1 + TK.LOW1)), b = F1.yaw + TK.ROT1, e = [Math.sin(b), Math.cos(b)];                  // e = direction of descent (toward the hall)
    ESC2.tekhnolog = esc2('tekhnolog', { head: [foot[0] - e[0] * run, foot[1] - e[1] * run], e, yBottom: TK.FY, lanes: L4, A: TK.A1, station: 'tekhnolog', frame: 'tekhnolog' });
  }
  // hall 2: axial; the foot LOW2 m beyond the NNE (+z) end
  ESC2.tekhnolog2 = esc2('tekhnolog2', { head: toWorld(F2, 0, TK.PZ2 + TK.LOW2 + run), e: [-Math.sin(F2.yaw), -Math.cos(F2.yaw)], yBottom: TK.FY, lanes: L3, A: TK.A2, station: 'tekhnolog2', frame: 'tekhnolog2' });
  // doorways of the shared vestibule (r2163775): the OSM nodes snapped onto the street front (TK_FRONT; never the party wall with w62395210)
  for (const [id, kind, osm, x, z] of [['tekhnolog-in', 'entrance', 'n4189476668', -1835.0, 1800.9], ['tekhnolog-out', 'exit', 'n4189482980', -1818.8, 1758.0]]) {
    if (DOORWAYS.some((d) => d.id === id)) continue;
    const s = snapToFacade(x, z, TK_FOOTPRINT, TK_FRONT);
    DOORWAYS.push({ id, x: +s.x.toFixed(2), z: +s.z.toFixed(2), w: 3.4, rotY: s.rotY, station: 'tekhnolog', bldg: TK.VEST.bldg, kind, osm, osmAt: [x, z] });
  }
  // ground holes over the first SHAFT_LEN m of both inclines (inside the building)
  for (const id of ['tekhnolog', 'tekhnolog2']) {
    if (SHAFTS.some((s) => s.id === id + '-shaft')) continue;
    const e = ESC2[id]; SHAFTS.push({ id: id + '-shaft', x: e.head.x + e.e[0] * SHAFT_LEN / 2, z: e.head.z + e.e[1] * SHAFT_LEN / 2, w: 2 * e.A + 0.3, d: SHAFT_LEN, rotY: e.yaw, station: id, kind: 'escalator' });
  }
  // the network rows: built, real depth
  for (const [l, id] of [['1', 'tekhnolog'], ['2', 'tekhnolog2']]) { const s = STATIONS[l] && STATIONS[l].find((q) => q.id === id); if (s) { s.built = true; s.depth = -TK.FY; } }
}
