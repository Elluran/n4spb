// landmarksK/square.js - Arts Square (площадь Искусств): the garden of the square (OSM park w28670794, the square polygon w638329070 is claimed so that the generic ground does not pave the garden): limes, maples and
// elms in the two lobes beside the central allee (instanced), the parterre with the Pushkin monument (M. Anikushin 1957: a bronze figure 4 m on a pedestal of pink-red coarse granite with steps, a platform in a flower
// bed of burgundy coleus; the poet in a long frock coat, the right arm held out), and the Ostap Bender statue by the Italian street.  Dossier 9.5, photos refs/saviour 112 113 116 117 118.
import * as THREE from 'three';
import { GREEN, ROADS, FURNITURE, LAMPS } from '../data/city.js';
import { PF } from './frame.js';
import * as G from './geo.js';
import { plantTrees } from './trees.js';
import { human, extend, cached, figureMats, V } from '../lib/figures.js';

const ring = (flat) => { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i], flat[i + 1]]); return r; };
const pointIn = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > z) !== (r[j][1] > z) && x < (r[j][0] - r[i][0]) * (z - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };

function pushkin() {
  return cached('lmK-pushkin', () => {
    const base = human({
      detail: 0.7, body: { muscle: 0.25, bulk: 0.96 },
      pose: {
        pelvisRot: [0, 0.06, -0.03], spine: [-0.04, -0.12, 0.03], head: [-0.1, 0.22, 0],
        legs: { L: { foot: [0.1, 0, 0.0], yaw: 0.12 }, R: { foot: [-0.12, 0, -0.08], yaw: -0.2 } },
        arms: { R: { hand: [-0.62, 1.22, 0.55], pole: [-0.4, -0.6, -0.2], grip: 'open', palm: [0, 0.2, 1] }, L: { hand: [0.3, 0.8, 0.1], pole: [0.5, -0.3, -0.6], grip: 'relaxed' } },
      },
      outfit: { torso: 'coat', hem: 0.62, flare: 0.1, folds: 0.03, sleeves: 'long', trousers: 'long', boots: 0.3, collar: 'stand', buttons: true, hair: 'curly' },
      face: { age: 0.3, hair: 'curly', beard: 'sideburns', brow: 0.7, jaw: 0.95, mouth: 'calm', seed: 7 },
    });
    return extend(base, () => {});
  });
}

function bender() {
  return cached('lmK-bender', () => human({ detail: 0.55, body: { muscle: 0.2, bulk: 0.95 },
    pose: { pelvisRot: [0, 0.1, 0.02], spine: [0.02, -0.1, 0], head: [0.05, -0.25, 0.04], legs: { L: { foot: [0.11, 0, 0.05], yaw: 0.2 }, R: { foot: [-0.11, 0, -0.04], yaw: -0.15 } },
      arms: { R: { hand: [-0.28, 0.98, 0.1], pole: [-0.4, -0.5, -0.4], grip: 'relaxed' }, L: { hand: [0.12, 0.98, -0.08], pole: [0.4, -0.5, -0.6], grip: 'fist' } } },
    outfit: { torso: 'coat', hem: 0.5, flare: 0.05, sleeves: 'long', trousers: 'long', boots: 0.25, collar: 'fall', buttons: true }, face: { age: 0.35, hair: 'short', mouth: 'calm', seed: 11 } }));
}

export function square(K) {
  const P = K.P, M = K.M, ph = K.ctx.physics, ctx = K.ctx, rng = ctx.rng(9131);
  // ---- the monument in frame P: centre (u, v) = (-0.2, 80.6)
  const cu = -0.2, cv = 80.6;
  P.push(PF.O.x, 0, PF.O.z, PF.rot);
  // flower bed 17 x 12 with a granite kerb, the platform 9 x 6
  const coleus = ctx.mat.toon('#ffffff', { map: ctx.tex.draw(128, 128, (g, w, h) => { const r = ctx.rng(5); g.fillStyle = '#5a7a30'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.6 ? '#f2eab8' : r() < 0.5 ? '#c8d868' : '#3f5a22'; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 6, 2 + r() * 4, r() * 3, 0, 6.3); g.fill(); } }, { key: 'lmK-chrysanthemums', repeat: [1, 1] }), name: 'lmK-chrysanthemums', paint: 0.03 });
  const bw = 17, bd = 12;
  P.quad(coleus, [cu - bw / 2, 0.16, cv - bd / 2], [cu + bw / 2, 0.16, cv - bd / 2], [cu + bw / 2, 0.16, cv + bd / 2], [cu - bw / 2, 0.16, cv + bd / 2], [0, 1, 0], [[0, 0], [bw / 3, 0], [bw / 3, bd / 3], [0, bd / 3]]);
  for (const [x0, x1, z0, z1] of [[cu - bw / 2 - 0.15, cu + bw / 2 + 0.15, cv - bd / 2 - 0.15, cv - bd / 2 + 0.15], [cu - bw / 2 - 0.15, cu + bw / 2 + 0.15, cv + bd / 2 - 0.15, cv + bd / 2 + 0.15], [cu - bw / 2 - 0.15, cu - bw / 2 + 0.15, cv - bd / 2 + 0.15, cv + bd / 2 - 0.15], [cu + bw / 2 - 0.15, cu + bw / 2 + 0.15, cv - bd / 2 + 0.15, cv + bd / 2 - 0.15]]) P.box(M.granite, x0, x1, 0, 0.22, z0, z1, 'b');
  PF.box(ph, cu, cv, bw + 0.5, bd + 0.5, 0, 0, 0.3);                                                      // the bed edge (a low step: the player can step over it)
  const plat = (x, d, y0, y1, mat = M.pinkDark) => G.tbox(P, mat, cu - x / 2, cu + x / 2, y0, y1, cv - d / 2, cv + d / 2, 3, 3, 'b');
  plat(9, 6, 0.0, 0.2, M.graniteDark);
  plat(4.8, 3.9, 0.2, 0.5); plat(4.0, 3.2, 0.5, 0.8);
  plat(3.2, 2.5, 0.8, 1.6); P.box(M.whiteShade, cu - 1.7, cu + 1.7, 1.6, 1.72, cv - 1.35, cv + 1.35, 'b');
  plat(2.0, 1.7, 1.72, 3.0);
  P.box(M.whiteShade, cu - 1.2, cu + 1.2, 3.0, 3.14, cv - 1.0, cv + 1.0, 'b'); plat(1.7, 1.3, 3.14, 3.4);
  P.box(M.black, cu - 0.55, cu + 0.55, 3.4, 3.5, cv - 0.5, cv + 0.5, 'b');
  // the gilt inscription on the front (south, +v) of the middle die
  const insc = ctx.mat.toon('#ffffff', { map: ctx.tex.draw(256, 96, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#d8b830'; g.textAlign = 'center'; g.textBaseline = 'middle'; ctx.tex.fitText(g, 'Александру', w / 2, 28, w * 0.9, 36, ctx.tex.FONTS.serif, 700); ctx.tex.fitText(g, 'Сергеевичу', w / 2, 52, w * 0.9, 34, ctx.tex.FONTS.serif, 700); ctx.tex.fitText(g, 'Пушкину', w / 2, 76, w * 0.9, 36, ctx.tex.FONTS.serif, 700); }, { key: 'lmK-pushkin-text' }), transparent: true, alphaTest: 0.4, name: 'lmK-pushkin-text', polygonOffset: -2, side: 'double' });
  M.decals.add(insc);
  P.quad(insc, [cu - 0.85, 1.95, cv + 0.88], [cu + 0.85, 1.95, cv + 0.88], [cu + 0.85, 2.75, cv + 0.88], [cu - 0.85, 2.75, cv + 0.88], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  // the bronze figure
  const mk = figureMats(ctx).keys('bronze', 'bronze');
  pushkin().place(P, mk, cu, 3.5, cv, 0, 2.28);                                                    // faces south (+v, the square's entrance)
  PF.box(ph, cu, cv, 3.6, 2.9, 0, 0, 7);
  P.pop();
  const w = PF.W(cu, cv);
  K.svc.pushkin = { x: w.x, z: w.z, h: 7.4, faces: 'south (toward Arts Square entrance)' };
  K.svc.monuments.push({ id: 'n477027518', name: 'Памятник А. С. Пушкину', x: w.x, z: w.z, h: 7.4 });
  K.svc.photoSpots.push({ x: PF.W(cu, cv + 22).x, z: PF.W(cu, cv + 22).z, yaw: Math.atan2(-(w.x - PF.W(cu, cv + 22).x), -(w.z - PF.W(cu, cv + 22).z)) * 180 / Math.PI, pitch: 8, name: 'Памятник Пушкину на площади Искусств' });

  // the Ostap Bender statue (A. Charkin 2000, 1.9 m) by the Italian street: n2426962446
  { const mkb = figureMats(ctx).keys('bronze', 'bronze'); { K.P.push(0, 0, 0, 0); bender().place(K.P, mkb, -1267.5, 0.12, -520.0, Math.PI / 2, 1.9 / 1.75); K.P.pop(); } ph.addCylinder(-1267.5, -520.0, 0.5, 0, 2); K.svc.monuments.push({ id: 'n2426962446', name: 'Остап Бендер', x: -1267.5, z: -520, h: 1.9 }); }
  // ---- trees of the two lobes (limes, maples, elms) on the park polygon; the central axis (|u| < 16) stays open
  const park = GREEN.find((g) => g.id === 'w28670794'); if (!park) return;
  const pr = ring(park.polys[0].o);
  const foot = []; for (const r of ROADS) if ((r.hw === 'footway' || r.hw === 'path') && r.pts.length >= 4) { const q = []; for (let i = 0; i < r.pts.length; i += 2) q.push([r.pts[i], r.pts[i + 1]]); foot.push(q); }
  const dSeg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
  const nearPath = (x, z) => { for (const q of foot) { let bb = false; for (const p of q) if (Math.abs(p[0] - x) < 30 && Math.abs(p[1] - z) < 30) { bb = true; break; } if (!bb) continue; for (let i = 0; i + 1 < q.length; i++) if (dSeg(x, z, q[i], q[i + 1]) < 2.6) return true; } return false; };
  const solid = FURNITURE.filter((f) => Math.abs(f.x + 1099) < 110 && Math.abs(f.z + 520) < 90).map((f) => [f.x, f.z]).concat(LAMPS.filter((l) => Math.abs(l.x + 1099) < 110 && Math.abs(l.z + 520) < 90).map((l) => [l.x, l.z]));
  const FAM = [['limeA', 0.42], ['limeB', 0.18], ['mapleA', 0.2], ['elm', 0.1], ['ash', 0.1]];
  const pick = () => { let r = rng(), s = 0; for (const [f, wgt] of FAM) { s += wgt; if (r < s) return f; } return 'limeA'; };
  const trees = [];
  for (let v = 24; v <= 138; v += 6.6) for (let u = -92; u <= 92; u += 6.6) {
    const pu = u + (rng() - 0.5) * 3.8, pv = v + (rng() - 0.5) * 3.8, wp = PF.W(pu, pv);
    if (Math.abs(pu) < 17 || !pointIn(pr, wp.x, wp.z) || nearPath(wp.x, wp.z)) continue;
    if (rng() > 0.78) continue;
    if (solid.some((s) => Math.hypot(s[0] - wp.x, s[1] - wp.z) < 2.4)) continue;
    if (trees.some((t) => Math.hypot(t.x - wp.x, t.z - wp.z) < 5.0)) continue;
    trees.push({ x: wp.x, z: wp.z, fam: pick(), s: 0.78 + rng() * 0.45, yaw: rng() * Math.PI * 2, y: 0.04 });
  }
  K.svc.squareTrees = trees.length;
  plantTrees(K, trees, 'lmK-square-trees');
  void THREE; void V;
}
export const build = square;
