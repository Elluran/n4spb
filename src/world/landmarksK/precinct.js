// landmarksK/precinct.js - the small buildings of the church precinct: the ticket kiosk "КАССЫ" (OSM r15746223, 7.8 x 5.2 m), the public toilets (w623509603), and the Iverskaya chapel-sacristy (r15746145: an octagon
// on a cube, tan-yellow glazed brick, four white ogee gables on the diagonals, a steep dark-green copper octagonal roof with a gold cross; now the Museum of Stone).  The School of Folk Art (r15746147) is a stucco
// house in houses.js.  Dossier 4, 5.3, photos refs/saviour 043 044 045 061 072.
import * as L from '../layout.js';
import { addPolyColliders } from '../lib/massing.js';
import * as G from './geo.js';
import { ringEdges, onEdge } from './kit.js';

/** extrude a footprint record into walls (one quad per edge) + a flat roof cap with a small overhang; returns the edges */
function prism(K, rec, h, wallMat, roofMat, o = {}) {
  const P = K.P, edges = [];
  for (const poly of rec.polys) {
    const es = ringEdges(poly, 0.05); edges.push(...es);
    for (const e of es) {
      if (e.hole) continue;
      const len = e.len;
      P.quad(wallMat, [e.a[0], o.y0 || 0, e.a[1]], [e.b[0], o.y0 || 0, e.b[1]], [e.b[0], h, e.b[1]], [e.a[0], h, e.a[1]], [e.n[0], 0, e.n[1]], [[0, 0], [len / 3, 0], [len / 3, h / 3], [0, h / 3]]);
    }
    const ring = []; for (let i = 0; i < poly.o.length; i += 2) ring.push([poly.o[i], poly.o[i + 1]]);
    P.cap(roofMat, ring, h + 0.05, true, 4);
    addPolyColliders(K.ctx, poly, 0, h + 1, 0.6);
  }
  return edges;
}

function kiosk(K) {
  const P = K.P, M = K.M, rec = L.buildingById('r15746223'); if (!rec) return;
  const wall = K.ctx.mat.toon('#a8a69e', { name: 'lmK-kioskWall', paint: 0.04 }), roof = K.ctx.mat.toon('#6c7076', { name: 'lmK-kioskRoof' });
  const edges = prism(K, rec, 3.3, wall, roof);
  const signMat = K.ctx.mat.toon('#ffffff', { map: K.ctx.tex.sign({ w: 256, h: 64, bg: '#1e3a6e', fg: '#f4efe2', text: 'КАССЫ', font: K.ctx.tex.FONTS.round, radius: 4, key: 'lmK-kassy' }), name: 'lmK-kassy', polygonOffset: -1 });
  // the two long edges facing N / S-ish get a glass band and the sign on the longest
  const long = edges.filter((e) => !e.hole).sort((a, b) => b.len - a.len).slice(0, 2);
  for (const e of long) {
    onEdge(P, e, (len) => {
      const x0 = 0.5, x1 = len - 0.5;
      P.quad(M.glassBlue, [x0, 1.0, 0.04], [x1, 1.0, 0.04], [x1, 2.6, 0.04], [x0, 2.6, 0.04], [0, 0, 1]);
      P.box(M.gun, x0 - 0.1, x1 + 0.1, 0.9, 1.0, 0, 0.1, 'k'); P.box(M.gun, x0 - 0.1, x1 + 0.1, 2.6, 2.7, 0, 0.1, 'k');
      for (let x = x0 + 1.3; x < x1 - 0.3; x += 1.3) P.box(M.gun, x - 0.04, x + 0.04, 1.0, 2.6, 0, 0.08, 'kb');
      P.quad(signMat, [len / 2 - 1.1, 2.75, 0.06], [len / 2 + 1.1, 2.75, 0.06], [len / 2 + 1.1, 3.25, 0.06], [len / 2 - 1.1, 3.25, 0.06], [0, 0, 1]);
    });
  }
  K.svc.entrances.push({ id: 'saviour-kiosk', x: -1254.5, z: -877.0, rotY: 0, kind: 'ticket', label: 'Кассы' });
}

function toilets(K) {
  const rec = L.buildingById('w623509603'); if (!rec) return;
  const wall = K.ctx.mat.toon('#9aa59a', { name: 'lmK-wcWall', paint: 0.04 }), roof = K.ctx.mat.toon('#5a6a62', { name: 'lmK-wcRoof' });
  prism(K, rec, 2.7, wall, roof);
}

/** the Iverskaya chapel-sacristy in its own frame: centre c, local +x along the long side */
function chapel(K) {
  const P = K.P, M = K.M, rec = L.buildingById('r15746145'); if (!rec) return;
  const o = rec.polys[0].o; const pts = [[o[0], o[1]], [o[2], o[3]], [o[4], o[5]], [o[6], o[7]]];
  const cx = pts.reduce((s, p) => s + p[0], 0) / 4, cz = pts.reduce((s, p) => s + p[1], 0) / 4;
  const ux = pts[0][0] - pts[1][0], uz = pts[0][1] - pts[1][1], ul = Math.hypot(ux, uz), rot = Math.atan2(-uz / ul, ux / ul);
  const hx = 8.0;
  const tan = K.ctx.mat.toon('#c8a868', { name: 'lmK-chapelTan', paint: 0.05 }), tanDark = K.ctx.mat.toon('#a07848', { name: 'lmK-chapelDark', paint: 0.04 }), roofG = K.ctx.mat.toon('#4a6a50', { name: 'lmK-chapelRoof', paint: 0.03 });
  P.push(cx, 0, cz, rot);
  // plinth + walls of the cube (the long faces carry two arched windows with grilles, an ogee gable on each face)
  G.tbox(P, M.pinkPlain, -hx - 0.2, hx + 0.2, 0, 1.0, -hx - 0.2, hx + 0.2, 3, 3, 'b');
  G.tbox(P, tan, -hx, hx, 1.0, 8.4, -hx, hx, 3, 3, 'b');
  P.box(M.white, -hx - 0.3, hx + 0.3, 8.4, 8.9, -hx - 0.3, hx + 0.3, 'b');
  for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    const rx = nz, rz = -nx;                                                                          // right = (nz, -nx)
    G.onFace(P, nx * hx - rx * hx, nz * hx - rz * hx, nx, nz, () => {
      const len = 2 * hx;
      for (const x of [len * 0.28, len * 0.72]) {
        G.planeShape(P, M.glass, G.archPts(x, 2.2, 1.1, 3.4, 8), 0.08);
        G.frameRing(P, M.white, G.archPts(x, 2.1, 1.7, 3.7, 8), G.archPts(x, 2.2, 1.1, 3.4, 8), 0.03, 0.18, 1);
        for (let k = 0; k < 4; k++) P.box(M.iron, x - 0.55, x + 0.55, 2.8 + k * 0.6, 2.84 + k * 0.6, 0.1, 0.13, '');
      }
      // white-stone ogee gable on the face, with a mosaic icon
      P.push(len / 2, 8.9, 0, 0);
      G.frameRing(P, M.white, G.ogeePts(7.0, 3.0, 8), G.scalePts(G.ogeePts(7.0, 3.0, 8), 0.8, 0.7, 0, 0.2), 0.0, 0.35, 1);
      G.planeShape(P, tan, G.scalePts(G.ogeePts(7.0, 3.0, 8), 0.8, 0.7, 0, 0.2), 0.05);
      P.cyl(M.goldFlat, [0, 1.2, 0.12], [0, 1.2, 0.18], 0.5, 0.5, 10, true);
      P.pop();
      P.box(tanDark, 0.2, len - 0.2, 7.2, 7.5, 0, 0.1, 'kb');
    });
  }
  // the octagon drum (to 13) and the steep dark-green copper octagonal roof with a gold cross
  const a0 = -Math.PI / 8;
  G.frustum(P, tan, 0, 0, 8.9, 13.0, 8, 5.4, 5.4, a0, 4.2 / 3, 4.1 / 3);
  G.frustum(P, M.white, 0, 0, 13.0, 13.5, 8, 5.8, 5.8, a0, 3, 0.3, { capTop: M.white });
  G.frustum(P, roofG, 0, 0, 13.5, 20.0, 8, 5.4, 0, a0, 1, 2.2);
  P.box(M.copperDark, -0.12, 0.12, 20.0, 20.3, -0.12, 0.12, '');
  G.cross(P, M.goldFlat, 0, 20.2, 0, 1.8, 0);
  P.pop();
  addPolyColliders(K.ctx, rec.polys[0], 0, 14, 0.6);
}

const FENCE_RING = [[-1284.5, -821.0], [-1274.6, -818.8], [-1272.6, -821.6], [-1269.0, -823.9], [-1264.5, -824.5], [-1245.0, -820.8], [-1237.7, -821.1], [-1231.1, -823.1], [-1225.1, -826.7], [-1220.5, -831.7], [-1217.2, -837.7], [-1215.4, -844.3], [-1215.4, -852.1], [-1217.4, -859.2], [-1220.8, -865.3], [-1225.2, -870.2], [-1231.3, -873.7], [-1237.8, -875.8], [-1250.2, -878.5]];

/** the granite plaza inside the inner spear fence (light-grey slabs) and a lawn strip with flower beds along the fence on the church side */
function ground(K) {
  const P = K.P, M = K.M;
  const ring = FENCE_RING.concat([[-1262, -883.5], [-1274, -881.5], [-1279.5, -879.0], [-1289.0, -833.5], [-1284.6, -829.0]]);
  const uv = (p) => [p[0] / 3, p[2] / 3];
  void uv;
  P.cap(M.plaza, ring, 0.04, true, 3);
  // lawn strip 3.2 m wide inside the fence (from the fence line toward the church centre C0)
  const cx = -1255.3, cz = -851.5;
  for (let i = 0; i + 1 < FENCE_RING.length; i++) {
    const a = FENCE_RING[i], b = FENCE_RING[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.5) continue;
    let nx = -dz / l, nz = dx / l; if ((cx - a[0]) * nx + (cz - a[1]) * nz < 0) { nx = -nx; nz = -nz; }
    const w0 = 0.5, w1 = 3.4, y = 0.07;
    P.quad(M.lawnTop, [a[0] + nx * w0, y, a[1] + nz * w0], [b[0] + nx * w0, y, b[1] + nz * w0], [b[0] + nx * w1, y, b[1] + nz * w1], [a[0] + nx * w1, y, a[1] + nz * w1], [0, 1, 0], [[0, 0], [l / 3, 0], [l / 3, 1], [0, 1]]);
  }
}

/** a light set of embankment souvenir stalls on the south promenade (the real ones were dismantled in Jan 2025: a gameplay choice for the summer scene): 5 kiosks with dark awnings + 2 drink carts with umbrellas */
function stalls(K) {
  const P = K.P, M = K.M, ph = K.ctx.physics, T = K.ctx.mat.toon;
  const wood = T('#8a5a36', { name: 'lmK-stallWood', paint: 0.04 }), awn = T('#5a2a2a', { name: 'lmK-stallAwn', side: 'double' }), blue = T('#4a5a78', { name: 'lmK-stallBlue', side: 'double' });
  const goods = ['#c8302a', '#e8c030', '#2a58a8', '#3a8a48', '#e8e0d0', '#b04a8a'].map((c, i) => T(c, { name: 'lmK-goods' + i }));
  const put = (x, z, rot, kind, k) => {
    P.push(x, 0, z, rot);
    if (kind === 'kiosk') {
      G.tbox(P, wood, -1.3, 1.3, 0, 1.0, -0.8, 0.8, 2, 2, 'b');
      for (const [dx, dz] of [[-1.25, -0.75], [1.25, -0.75], [-1.25, 0.75], [1.25, 0.75]]) P.box(M.iron, dx - 0.04, dx + 0.04, 1.0, 2.5, dz - 0.04, dz + 0.04, 'tb');
      P.fan(awn, [[-1.5, 2.6, -0.95], [1.5, 2.6, -0.95], [1.5, 2.45, 1.1], [-1.5, 2.45, 1.1]], [0, 1, 0]);
      P.quad(awn, [-1.5, 2.45, 1.1], [1.5, 2.45, 1.1], [1.5, 2.2, 1.1], [-1.5, 2.2, 1.1], [0, 0, 1]);
      for (let i = 0; i < 9; i++) P.box(goods[(i + k) % goods.length], -1.15 + i * 0.28, -0.9 + i * 0.28, 1.0, 1.0 + 0.25 + (i % 3) * 0.1, 0.1, 0.4, 'b');
      P.box(wood, -1.2, 1.2, 1.0, 1.06, -0.7, -0.1, 'b');
      ph.addBox(x, z, 2.7, 1.9, rot, 0, 2.6);
    } else {
      G.tbox(P, M.white, -0.6, 0.6, 0.4, 1.0, -0.4, 0.4, 2, 2, 'b'); P.cyl(M.iron, [-0.5, 0, 0.35], [-0.5, 0.4, 0.35], 0.04, 0.04, 5, false); P.cyl(M.iron, [0.5, 0, 0.35], [0.5, 0.4, 0.35], 0.04, 0.04, 5, false);
      P.cyl(M.iron, [0, 1.0, 0], [0, 2.4, 0], 0.03, 0.03, 5, false);
      G.frustum(P, k % 2 ? [M.white, M.booth] : [M.white, M.white, M.booth, M.booth], 0, 0, 2.25, 2.65, 8, 1.35, 0.05, 0, 1, 1);
      ph.addBox(x, z, 1.3, 0.9, rot, 0, 1.2);
    }
    P.pop();
  };
  const ks = [[-1233, -810.5], [-1239.5, -810.2], [-1246, -809.6], [-1252, -809.2], [-1258, -809.4]];
  ks.forEach(([x, z], i) => put(x, z, 0.0, 'kiosk', i));
  put(-1228, -813.5, 0, 'cart', 1); put(-1264, -812.5, 0, 'cart', 2);
  K.svc.stalls = ks.map(([x, z]) => ({ x, z, rotY: 0 })).concat([{ x: -1228, z: -813.5, rotY: 0 }, { x: -1264, z: -812.5, rotY: 0 }]);
}

export function precinct(K) {
  for (const [name, fn] of [['kiosk', kiosk], ['toilets', toilets], ['chapel', chapel], ['ground', ground], ['stalls', stalls]]) {
    try { fn(K); } catch (e) { console.error(`[landmarksK] precinct/${name}:`, e); throw e; }
  }
}
export const build = precinct;
