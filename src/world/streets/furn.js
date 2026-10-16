// streets/furn.js - shared helpers of the road-furniture builders: instanced meshes, textured sign panels merged per texture,
// positions along the kerb runs, the common colours. (VB = vertex-colour merged geometry, streets/vb.js.)
import * as THREE from 'three';
import { MB, UP } from './util.js';
import { hash2, clamp } from './util.js';
import { atlasableTex, buildAtlas } from '../../core/batch2.js';
import * as L from '../layout.js';
import { deckAt } from './decks.js';
import { segInfo, trackDist, streetTrackDist, coverLocal } from './net.js';
import { isOpen } from './region.js';
import { whsdDeckY } from '../bridges/sites-vo2.js';                                 // (pure data, no imports: the footprint of the Western High-Speed Diameter viaduct / ramp that the bridges module draws)
import { cg, mtx } from './vb.js';

export const COL = {
  pole: '#8d9298', poleD: '#6e747b', black: '#2a2c31', blackL: '#3a3d43', base: '#a3a8ae', lampBody: '#9aa0a6', steel: '#7f858c',
  lime: '#cfe03a', blue: '#1f56a8', plate: '#27409a', white: '#f2f1ec', wood: '#7d3b24', woodS: '#5b2d1f', rail: '#25282c',
};

/** instanced mesh of `geo` / `mat` at list [{x, y?, z, rotY?, s?}] (static scenery, kept out of the merge: instanced) */
export const INST_STATS = {};
export function instances(ctx, geo, mat, list, name, o = {}) {
  if (!list.length || !geo) return null;
  INST_STATS[name] = { n: list.length, tris: Math.round((geo.index ? geo.index.count : geo.attributes.position.count) / 3 * list.length) };
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();
  list.forEach((it, i) => { E.set(0, it.rotY || 0, 0); Q.setFromEuler(E); P.set(it.x, it.y || 0, it.z); S.set(it.sx ?? it.scale ?? 1, it.sy ?? it.scale ?? 1, it.sz ?? it.scale ?? 1); M.compose(P, Q, S); im.setMatrixAt(i, M); });
  im.instanceMatrix.needsUpdate = true; im.castShadow = o.shadow !== false; im.receiveShadow = true; im.name = name;
  im.computeBoundingSphere();
  ctx.addStatic(im);
  return im;
}

/** textured quads merged per texture: panel(tex, x, y, z, nx, nz, w, h) with the normal (nx,nz) pointing at the viewer; double-sided basic material that brightens at night */
export function makePanels(ctx) {
  const map = new Map(), mats = [];
  const get = (tex, opts = {}) => {
    let m = map.get(tex); if (m) return m;
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false, name: 'pt-sign', alphaTest: 0.45 });
    mats.push(mat); m = { tex, mb: new MB(), mat }; map.set(tex, m); return m;
  };
  const panel = (tex, x, y, z, nx, nz, wd, ht, o = {}) => {
    const { mb } = get(tex, o); const tx = nz, tz = -nx;
    const hx = tx * wd / 2, hz = tz * wd / 2;
    const flip = o.flip ? -1 : 1;
    const [u0, v0, u1, v1] = o.uv || [0, 0, 1, 1];
    const a = mb.vert(x - hx * flip, y - ht / 2, z - hz * flip, u0, v0, [nx, 0, nz]), b = mb.vert(x + hx * flip, y - ht / 2, z + hz * flip, u1, v0, [nx, 0, nz]);
    const c = mb.vert(x + hx * flip, y + ht / 2, z + hz * flip, u1, v1, [nx, 0, nz]), d = mb.vert(x - hx * flip, y + ht / 2, z - hz * flip, u0, v1, [nx, 0, nz]);
    mb.quad(a, b, c, d, [nx, 0, nz]);
  };
  const finish = (root) => {
    // ~90 sign textures would be ~90 draw calls (a mesh per texture): the canvases are packed into 4096 px atlas pages (core/batch2.js buildAtlas) and merged into ONE mesh per page
    const entries = [...map.values()].filter((e) => !e.mb.empty);
    const packable = entries.filter((e) => atlasableTex(e.tex) && e.mb.uv.every((u) => u >= -0.002 && u <= 1.002));
    const atlas = packable.length > 1 ? buildAtlas(new Set(packable.map((e) => e.tex))) : { map: new Map(), texs: [] };
    const pageMB = atlas.texs.map(() => new MB()), pageMat = atlas.texs.map((t) => { const m = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false, name: 'pt-sign-atlas', alphaTest: 0.45 }); mats.push(m); return m; });
    const done = new Set();
    for (const e of packable) {
      const tile = atlas.map.get(e.tex); if (!tile) continue;
      const P = pageMB[tile.page], mb = e.mb, base = P.n;
      for (let i = 0; i < mb.pos.length; i++) P.pos.push(mb.pos[i]);
      for (let i = 0; i < mb.nrm.length; i++) P.nrm.push(mb.nrm[i]);
      for (let i = 0; i < mb.uv.length; i += 2) P.uv.push(tile.u0 + Math.min(1, Math.max(0, mb.uv[i])) * tile.su, tile.v0 + Math.min(1, Math.max(0, mb.uv[i + 1])) * tile.sv);
      for (let i = 0; i < mb.idx.length; i++) P.idx.push(mb.idx[i] + base);
      P.n += mb.n; done.add(e);
    }
    pageMB.forEach((P, i) => { if (P.empty) return; const m = new THREE.Mesh(P.build(), pageMat[i]); m.name = 'pt-signpanel'; m.castShadow = false; m.receiveShadow = false; ctx.noBatch(m); ctx.noOutline(m); root.add(m); });
    for (const e of entries) {
      if (done.has(e)) continue;
      const m = new THREE.Mesh(e.mb.build(), e.mat); m.name = 'pt-signpanel'; m.castShadow = false; m.receiveShadow = false; ctx.noBatch(m); ctx.noOutline(m); root.add(m);
    }
    ctx.onUpdate(() => { const n = ctx.shared.uNight ? ctx.shared.uNight.value : 0; for (const m of mats) m.color.setScalar(0.86 + 0.5 * n); });
  };
  /** A sign bolted to a pole: mount(poles, tex, x, y, z, nx, nz, w, h, { pole: radius, round }) with (x, z) = the pole axis, (nx, nz) = the face normal. The face stands in front of the pole on a thin
   *  galvanised back plate (hides the mirrored back of the quad) held by TWO CLAMP BANDS around the pole (flat strips 4 cm high, seen from behind; 4 triangles: the bands of the real mount, without the
   *  geometry of a ring); pole = 0: a sign hanging from a rod / wire, back plate only. Standard poles: plain grey round tube (streets/signals.js post()). Same as the Yakutsk fix fafd4c9. */
  const mount = (poles, tex, x, y, z, nx, nz, wd, ht, o = {}) => {
    const r = o.pole || 0, th = 0.028, gap = 0.008, ry = Math.atan2(nx, nz);
    panel(tex, x + nx * (r + th + gap), y, z + nz * (r + th + gap), nx, nz, wd, ht, o);
    const cx = x + nx * (r + th / 2), cz = z + nz * (r + th / 2);
    // the back plate = ONE one-sided quad (a disc for round signs) just behind the face, facing away: it hides the mirrored back of the face from behind, edge-on from the side (a 12-triangle box x 5000 signs was 60 k triangles)
    const bx = x + nx * (r + th * 0.4), bz = z + nz * (r + th * 0.4);
    if (o.round) poles.add(cg('backdisc', () => new THREE.CircleGeometry(1, 8)), COL.steel, mtx([bx, y, bz], [0, ry + Math.PI, 0], [wd * 0.5, wd * 0.5, 1]));
    else poles.add(cg('band', () => new THREE.PlaneGeometry(1, 1)), COL.steel, mtx([bx, y, bz], [0, ry + Math.PI, 0], [wd * 0.985, ht * 0.985, 1]));
    if (r > 0 && o.kind !== 'plate') for (const f of [-0.28, 0.28]) {                              // the clamp bands: a lighter strip across the pole on the rear of the plate, 4 cm high, a little wider than the pole
      poles.add(cg('band', () => new THREE.PlaneGeometry(1, 1)), '#b9bec4', mtx([x - nx * (r + 0.004), y + ht * f, z - nz * (r + 0.004)], [0, ry + Math.PI, 0], [2 * r + 0.03, 0.04, 1]));
    }
  };
  return { panel, mount, finish };
}

/** walk along the kerb runs of the net (kind 'edge'): cb({x,z,nx,nz,w,side,s}) at ~spacing m with a per-run phase; nx,nz = outward normal at the kerb */
export function alongKerbs(net, spacing, cb, o = {}) {
  let runIdx = -1;
  for (const run of net.kerbRuns) {
    runIdx++;
    if (run.kind !== 'edge') continue;
    const w = run.w;
    if (o.rank && w.rank < o.rank) continue;
    if (o.filter && !o.filter(w)) continue;
    const sp = typeof spacing === 'function' ? spacing(w) : spacing;
    let acc = sp * (0.3 + 0.35 * hash2(w.i, run.side === 'L' ? 1 : 2)) * (o.phase ?? 1);
    for (let i = 1; i < run.pts.length; i++) {
      const a = run.pts[i - 1], b = run.pts[i], seg = Math.hypot(b.x - a.x, b.z - a.z); if (seg < 1e-6) continue;
      acc += seg;
      while (acc > sp) {
        acc -= sp;
        const f = 1 - acc / seg, x = a.x + (b.x - a.x) * f, z = a.z + (b.z - a.z) * f;
        const nx = a.ox + (b.ox - a.ox) * f, nz = a.oz + (b.oz - a.oz) * f, nl = Math.hypot(nx, nz) || 1;
        cb({ x, z, nx: nx / nl, nz: nz / nl, w, side: run.side, s: a.s + (b.s - a.s) * f, run: runIdx });
      }
    }
  }
}
/** true when a junction node (3+ arms) lies within r of (x, z); the nodes are hashed once per net (the placers asked every node for every candidate) */
function nodeGrid(net) {
  if (net._ng && net._ngN === net.nodes.length) return net._ng;
  const g = new Map();
  for (const n of net.nodes) if (n.arms.length >= 3) { const k = Math.floor(n.x / 16) * 4096 + Math.floor(n.z / 16); let l = g.get(k); if (!l) g.set(k, (l = [])); l.push(n); }
  net._ng = g; net._ngN = net.nodes.length; return g;
}
/** distance to the nearest junction node (3+ arms) within maxR (maxR + 1 when none) */
export function nodeDist(net, x, z, maxR = 48) {
  const g = nodeGrid(net); let best = maxR + 1;
  for (let cx = Math.floor((x - maxR) / 16); cx <= Math.floor((x + maxR) / 16); cx++) for (let cz = Math.floor((z - maxR) / 16); cz <= Math.floor((z + maxR) / 16); cz++) for (const n of g.get(cx * 4096 + cz) || []) { const d = Math.hypot(n.x - x, n.z - z); if (d < best) best = d; }
  return best;
}
export const nodeNear = (net, x, z, r) => nodeDist(net, x, z, r) < r;

/** MERGED STRIP: the ground between two carriageways of ONE street that are closer than 7.5 m (streets/net.js fillMedians merges them into one roadway) is no median and no pavement: no furniture base there
 *  (the audit tools/roads-furniture-audit.mjs 'median gap<7.5' rows). Same measure as the audit, in the asphalt of the network (net.cover / segInfo, incl. pockets and fillets): from the point, along the normal
 *  of its nearest way, the first asphalt on each side within 9 m; two DIFFERENT ways of the same name that run in opposite directions with an asphalt-to-asphalt gap < 7.5 m (0.2 m ray steps: tested < 7.9 m). */
const stripProbe = (net, x, z) => {
  let best = null;
  net.each(x, z, 3, (w, i) => {
    if (w.skipDraw || w.pedestrianOnly) return;
    const q = segInfo(w, i, x, z), m = q.h - q.c.d;
    if (!best || m > best.m) best = { m, w, tx: q.dx, tz: q.dz };
  });
  if (!best) return null;
  const f = net.cover(x, z, {});
  if (f > best.m + 0.01) best.m = f;
  return best;
};
export const inMergedStrip = (net, x, z, step = 0.2, lim = 7.9) => {       // (step 0.15, lim 7.5: exactly the audit's measure, for a rule that must not touch a real median of 7.5 m)
  const cen = stripProbe(net, x, z); if (!cen) return false;
  // The march (up to 90 probes on the pavement): a local cover round the base (net.js coverLocal, exact above -0.3) says 'no asphalt here' without the segment walk of stripProbe.
  // Exact: net.cover is >= the segInfo measure of every way stripProbe sees (same segments, same arithmetic, no exclusions), so a probe whose cover is <= 0.02 can never be a hit; only a
  // probe that can be a hit runs the full stripProbe (the hit itself, the same way / direction as before).
  const cl = coverLocal(net, x, z, 9.4, {});
  const probe = (px, pz) => (cl(px, pz) > 0.02 - 1e-6 ? stripProbe(net, px, pz) : null);
  const nx = -cen.tz, nz = cen.tx; let kr = null, kl = null, pr = null, pl = null;
  for (let k = step; k < 9; k += step) {
    if (kr == null) { const p = probe(x + nx * k, z + nz * k); if (p && p.m > 0.02) { kr = k; pr = p; } }
    if (kl == null) { const p = probe(x - nx * k, z - nz * k); if (p && p.m > 0.02) { kl = k; pl = p; } }
    if (kr != null && kl != null) break;
    if ((kr == null) !== (kl == null) && (kr == null ? kl : kr) + (k + step) >= lim) return false;      // the other side can only be found at k + step or beyond: kr + kl would reach lim (the same answer, sooner)
  }
  if (kr == null || kl == null || pl.w === pr.w || kr + kl >= lim) return false;
  return !!pl.w.name && pl.w.name === pr.w.name && pl.tx * pr.tx + pl.tz * pr.tz <= -0.5;
};
const RING = [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]], DIAG = [[0.21, 0.21], [-0.21, 0.21], [0.21, -0.21], [-0.21, -0.21]];

/** FURNITURE KEEP-CLEAR ZONES (Vasilievsky Island, 2026-10-08; open districts only): places a sight module dresses itself, where no generic lamp, sign, mast or other pole of this module may stand (pure data: streets builds
 *  before the landmark modules). Rows: { id, o: [x, z], u: [ux, uz], w: [wx, wz], u0, u1, w0, w1 } = a rectangle in a frame (origin o, the two axes as world unit vectors) or { id, c: [x, z], r } = a circle.
 *  Sources: docs/research/vo-requests-landmarksMining.md "streets" 1, vo-requests-landmarksAcademy.md 3, vo-requests-landmarksMenshikov.md "streets" 4. */
const DEG = Math.PI / 180, AX = (rad) => ({ u: [Math.cos(rad), -Math.sin(rad)], w: [Math.sin(rad), Math.cos(rad)] });          // (axes of a three.js rotation.y frame: world = o + u * (cos, -sin) + w * (sin, cos))
export const FURN_CLEAR = [
  // Mining University: the stair forecourt (frame P: origin (-4566.8, 358.4), rotation 0.9320: u (0.5958, -0.8031) along the front, w (0.8031, 0.5958) towards the Neva): the portico stair, the cheeks and the bollard strip
  // (u -40 .. 40, w 0 .. 9; the asphalt edge in front of it is at w about 8.5); 3.5 m round each of the two ornate teal lamps at P (+-25.2, 2.6)
  { id: 'mining-forecourt', o: [-4566.8, 358.4], u: [0.5958, -0.8031], w: [0.8031, 0.5958], u0: -40, u1: 40, w0: 0, w1: 9 },
  { id: 'mining-lamp-west', c: [-4579.7, 380.2], r: 3.5 },
  { id: 'mining-lamp-east', c: [-4549.7, 339.7], r: 3.5 },
  // Academy of Arts: the pavement block in front of the sphinx pier (frame A: origin (-3432.0, -601.6), u (0.8643, -0.5030) along the river front, v (0.5030, 0.8643) towards the Neva): u -26 .. 24, v 100 .. 108
  { id: 'academy-pier-block', o: [-3432.0, -601.6], u: [0.8643, -0.5030], w: [0.5030, 0.8643], u0: -26, u1: 24, w0: 100, w1: 108 },
  // Menshikov apron (frame D: origin (-3306.2, -555.1), rotation 30 deg: a (0.866, -0.5) along the wall, b (0.5, 0.866) towards the river): the railing and the pylons stand at b -0.3 (0.55 m square every 5.44 m)
  { id: 'menshikov-apron-wall', o: [-3306.2, -555.1], u: [0.866, -0.5], w: [0.5, 0.866], u0: -20, u1: 150, w0: -1.8, w1: 0.6 },
  // Sea Terminal (frame T: origin (-6542.4, 652.9), u (0.87327, 0.48723) along the long faces, v (-0.48723, 0.87327) towards the sea; docs/research/vo-requests-landmarksSeaTerminal.md streets 4): the asphalt under the NE deck
  // (u 3.4 .. 117.5, v -21 .. 0) and the row of mushroom piers / Jersey barriers at v -23: no lamp, sign or pole there or within 1 m of it (v -24.5 .. 0.3, u 2.4 .. 118.5)
  { id: 'seaterminal-deck', o: [-6542.4, 652.9], u: [0.87327, 0.48723], w: [-0.48723, 0.87327], u0: 2.4, u1: 118.5, w0: -24.5, w1: 0.3 },
  // Sevkabel (frame M of landmarksSevkabel: origin (-5654.3, 1078.0), rotation.y -0.4189: u (0.9135, 0.4067), w (-0.4067, 0.9135); docs/research/vo-requests-landmarksSevkabel.md "-> streets" 2): the abutments of the skyway w335462132
  // over Kozhevennaya line (u 9.8 .. 14.4, w 0 .. 15.1, clear height 5.0 m): no lamp, wire mast or sign within 1.5 m of them (second-pass review of streets-2; 0 objects of streets stood there before: a guard, no change of output)
  { id: 'sevkabel-skyway', o: [-5654.3, 1078.0], u: [0.9135, 0.4067], w: [-0.4067, 0.9135], u0: 8.3, u1: 15.9, w0: -1.5, w1: 16.6 },
  // ---- third pass (streets-3, 2026-10-09): the sights built since the second pass. Most rows are GUARDS (a census of the finished build found 0 streets objects inside: tools in docs/research/streets-vo.md "THIRD PASS"),
  // the metro doors of the island are the exception (a trolleybus mast stood 4 m beside the door of exit 6).
  // Kirova Palace of Culture (frame FD of landmarksKirova: origin (-5449, -145), rotation 30.57 deg, plan (r, q): u = r, w = -q): the module paves the first 9.6 m of the forecourt and stands its own lamp row 3 - 4 m from the wall
  // (vo-requests-landmarksKirova.md "streets"): nothing of ours from the wall line (q -32.4, portal bump -35.5) to q -45 along the whole front (r -74 .. 131)
  { id: 'kirova-dk-front', o: [-5449, -145], ...AX(30.57 * DEG), u0: -74, u1: 131, w0: 31, w1: 45 },
  // Erarta (frame FE: origin (-5582.8, 23.7), rotation 119.67 deg, u = q', w = r'): the portal stair with the two steel figures (cheek walls q' +-5.5 .. 8.2, figures at +-7.1) and the museum forecourt
  { id: 'erarta-stair', o: [-5582.8, 23.7], ...AX(119.67 * DEG), u0: -14, u1: 14, w0: -2, w1: 10 },
  // Sevkabel Port (frame H: origin (-6172.2, 921.0), rotation -0.6458): the paved yard, the sea square, the timber promenade and the pier plaza (claims `sevkabel-yard`; the Kozhevennaya line lamps stand at lz -94 .. -99, outside)
  { id: 'sevkabel-yard', o: [-6172.2, 921.0], ...AX(-0.6458), u0: -128, u1: 111, w0: -92, w1: 52 },
  // Sredny: the depot east apron behind the open tram gate (frame D: origin (-5110, -760), rotation 29.6 deg: a 39 .. 95, b -80 .. 103) and the Brush plot
  { id: 'sredny-depot-apron', o: [-5110, -760], ...AX(29.6 * DEG), u0: 39, u1: 95, w0: -80, w1: 103 },
  { id: 'sredny-brush-plot', c: [-4985, -697], r: 9 },
  // Makarova: the nine steps of the Catherine church tower stair beside the footway w359152358 (frame C: origin (-3647.3, -1557.6), rotation 30 deg; u -39.7 .. -36.8, v -3.2 .. 2.8), the Lions pier head and the Lutheran gravel square
  { id: 'catherine-stair', o: [-3647.3, -1557.6], ...AX(0.5236), u0: -42, u1: -34.5, w0: -5, w1: 4.5 },
  { id: 'lions-pier-head', c: [-2851, -1441], r: 10 },
  { id: 'lutheran-gravel-square', c: [-3445, -1001], r: 8 },
  // Pribaltiyskaya Hotel: the granite plaza (frame HF: origin (-7573.07, -746.9), rotation 1.9966 rad: a -31 .. 31, b 9 .. 88) and the Kirov memorial platform (frame KF: origin (-7987.21, -1067.85), rotation 2.0017 rad)
  { id: 'pribaltiyskaya-plaza', o: [-7573.07, -746.9], ...AX(1.9966), u0: -31, u1: 31, w0: 9, w1: 88 },
  { id: 'kirov-memorial', o: [-7987.21, -1067.85], ...AX(2.0017), u0: -26, u1: 26, w0: -10, w1: 26 },
  // Gavan: the courtyard A-B of the workers' town (-6290, -654) and the fire reserve forecourt (frame F: origin (-6176.3, -625.3))
  { id: 'gavan-courtyard-ab', c: [-6290, -654], r: 10 },
  // the island metro doors (data/metro.js DOORWAYS, 4.4 m wide; "keep street furniture 2 m clear", vo-requests-metro.md): 4.5 m round the door anchor of each pavilion, 3.5 m round the mouth of the three Sportivnaya-2 pits
  { id: 'metro-gorny-in', c: [-5057.89, 12.22], r: 4.5 }, { id: 'metro-gorny-out', c: [-5024.66, -25.56], r: 4.5 },
  { id: 'metro-sport2-6', c: [-3758.5, -1677.7], r: 5.2 }, { id: 'metro-sport2-7', c: [-3792.0, -1699.6], r: 4.5 },
  { id: 'metro-vo-in', c: [-4072.88, -1140.65], r: 4.5 }, { id: 'metro-vo-out', c: [-4089.10, -1147.70], r: 4.5 },
  { id: 'metro-sport2-pit-8', c: [-3804.7, -1768.5], r: 3.5 }, { id: 'metro-sport2-pit-9', c: [-3765.5, -1754.7], r: 3.5 }, { id: 'metro-sport2-pit-10', c: [-3713.4, -1717.5], r: 3.5 },
];
const _fc = FURN_CLEAR.map((z) => ({ ...z, b: z.c ? [z.c[0] - z.r, z.c[0] + z.r, z.c[1] - z.r, z.c[1] + z.r] : (() => { const xs = [], zs = []; for (const [a, b] of [[z.u0, z.w0], [z.u1, z.w0], [z.u1, z.w1], [z.u0, z.w1]]) { xs.push(z.o[0] + a * z.u[0] + b * z.w[0]); zs.push(z.o[1] + a * z.u[1] + b * z.w[1]); } return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]; })() }));
/** THE METRO GROUND HOLES (layout.GROUND_HOLES: street stair pits, escalator shafts; review of streets-3, 2026-10-09): the metro module draws a granite well with parapets, a steel-and-glass canopy and a lit sign round and beyond the hole rectangle, and asked
 *  for 2 m of clear pavement all round it (docs/research/vo-requests-metro.md). The circles of FURN_CLEAR cover the door anchors and the pit MOUTHS only: a trolleybus mast stood inside the Sportivnaya stair pit 4 (-3324.3, -2153.7) and two masts and a
 *  sign pole hugged the far end of pit 9 of Sportivnaya-2 (-3754.7, -1761.2): no pole of ours within HOLE_CLEAR of any hole rectangle (open districts only, like every row above). */
export const HOLE_CLEAR = 2.0;
const _holes = (L.GROUND_HOLES || []).map((h) => { const r = Math.hypot(h.w, h.d) / 2 + HOLE_CLEAR; return { h, c: Math.cos(h.rotY), s: Math.sin(h.rotY), b: [h.x - r, h.x + r, h.z - r, h.z + r] }; });
/** SHELTER FOOTPRINTS (review of streets-3, 2026-10-10; open districts only): stops.js registers the footprint of every bus shelter (3.0 x 1.4 m + the bin at its end + 0.3 m: 4.6 x 2.0 m) BEFORE the lamps, wire masts and signs are placed, so no pole
 *  base stands inside a shelter (a trolleybus mast stood in the middle of the Gorny Institut shelter after it moved off the metro pavilion; two more at (-3289, -2170)). One rectangle: centre, unit tangent along the road, half sizes. */
let _stopRects = [], _stopGrid = new Map();
export function setStopRects(list) {
  _stopRects = list; _stopGrid = new Map();
  for (const r of list) { const e = Math.abs(r.tx) * r.a + Math.abs(r.tz) * r.b + 0.2, f = Math.abs(r.tz) * r.a + Math.abs(r.tx) * r.b + 0.2; for (let i = Math.floor((r.cx - e) / 8); i <= Math.floor((r.cx + e) / 8); i++) for (let j = Math.floor((r.cz - f) / 8); j <= Math.floor((r.cz + f) / 8); j++) { const k = i * 65536 + j; let g = _stopGrid.get(k); if (!g) _stopGrid.set(k, (g = [])); g.push(r); } }
}
const inStopRect = (x, z, m) => { const g = _stopGrid.get(Math.floor(x / 8) * 65536 + Math.floor(z / 8)); if (!g) return false; for (const r of g) { const dx = x - r.cx, dz = z - r.cz, a = dx * r.tx + dz * r.tz, b = dx * -r.tz + dz * r.tx; if (Math.abs(a) < r.a + m && Math.abs(b) < r.b + m) return true; } return false; };
/** true when (x, z) lies inside a keep-clear zone of FURN_CLEAR (open districts only; m = extra margin) */
export function furnZone(x, z, m = 0) {
  if (!isOpen(x, z)) return false;
  if (_stopRects.length && inStopRect(x, z, m)) return true;
  for (const q of _holes) {
    if (x < q.b[0] - m || x > q.b[1] + m || z < q.b[2] - m || z > q.b[3] + m) continue;
    const dx = x - q.h.x, dz = z - q.h.z, lx = dx * q.c - dz * q.s, lz = dx * q.s + dz * q.c;                       // (the frame of physics.js _obb: local z = (sin rotY, cos rotY))
    if (Math.abs(lx) < q.h.w / 2 + HOLE_CLEAR + m && Math.abs(lz) < q.h.d / 2 + HOLE_CLEAR + m) return true;
  }
  // the WHSD (bridges/sites-vo2.js whsdDeckY): the deck of the viaduct and its ramps carries the bridges module's own lamps on the median barrier; a lamp of ours inside the footprint stood in the middle of the carriageway
  // (second-pass review of streets-2, docs/research/vo-requests-streets.md "FROM bridges-2" 1: ten M lamps at z -300 .. 180, one at (-7864.1, -279.7) that the red car hit)
  if (whsdDeckY(x, z) !== null) return true;
  for (const f of _fc) {
    if (x < f.b[0] - m || x > f.b[1] + m || z < f.b[2] - m || z > f.b[3] + m) continue;
    if (f.c) { if (Math.hypot(x - f.c[0], z - f.c[1]) < f.r + m) return true; continue; }
    const dx = x - f.o[0], dz = z - f.o[1], u = dx * f.u[0] + dz * f.u[1], w = dx * f.w[0] + dz * f.w[1];
    if (u > f.u0 - m && u < f.u1 + m && w > f.w0 - m && w < f.w1 + m) return true;
  }
  return false;
}
/** ROAD CLEARANCE RULE of the furniture: a pole base at (x, z) stands clear of every asphalt (own way with its pocket, other carriageways, junction fillets: net.cover without a skip), of a bridge deck and of a facade */
export const TRACK_CLEAR = 1.35;                      // nothing stands closer than this to the axis of a tram track (open districts): the half width of a tram body is 1.3 m
export const poleClear = (net, x, z, gap = 0.5) => {
  // one local cover for the base and its 0.3 m ring (net.js coverLocal: with R = 0.5 + gap it is exact above -(0.5 + gap) for probes within 0.3 m; every test here is at -gap or 0.3 - gap)
  const cl = coverLocal(net, x, z, 0.5 + gap, {});
  return cl(x, z) <= -gap && !deckAt(x, z, 1) && !L.insideBuilding(x, z, 0.3)
  && RING.every(([dx, dz]) => cl(x + dx, z + dz) <= 0.3 - gap) && !inMergedStrip(net, x, z)        // (a base right on the edge of a junction fillet polygon is not clear: its footprint would straddle it)
  && !furnZone(x, z) && !(isOpen(x, z) && (streetTrackDist(x, z) < TRACK_CLEAR || DIAG.some(([dx, dz]) => cl(x + dx, z + dz) > 0.3 - gap)));       // (open districts, region.js: nor in a keep-clear zone of a sight (FURN_CLEAR), nor on the rails of a tram track that runs off the asphalt,
                                                                                                                   // nor with a DIAGONAL of the 0.3 m ring on a fillet / strip patch: a sliver between the four axis probes)
};

/** the nearest clear base to (x, z) within maxR (rings of 1 m): ok(px, pz) narrows the search (e.g. one side of a road); null when none.
 *  A pole is moved to the nearest clear pavement instead of standing in the roadway and is only dropped when nothing is clear within reach. */
export function clearNear(net, x, z, maxR, ok = null, gap = 0.5) {
  for (let R = 1; R <= maxR; R++) {
    const n = Math.max(6, Math.round(R * 6.283));
    for (let i = 0; i < n; i++) { const a = i / n * 6.283, px = x + Math.cos(a) * R, pz = z + Math.sin(a) * R; if ((!ok || ok(px, pz)) && poleClear(net, px, pz, gap)) return [px, pz]; }
  }
  return null;
}

/** a clear base near (x, z) found by shifting along the kerb (unit t, +-1 m steps up to `reach`, `first` = the preferred sign) and outward (unit n, 0.4 m steps up to 1.2 m); null when none */
export function nudgeClear(net, x, z, tx, tz, nx, nz, reach = 6, first = 1, gap = 0.5) {
  for (let a = 0; a <= reach; a++) for (const sg of a ? [first, -first] : [1]) for (let o = 0; o <= 1.21; o += 0.4) {
    const px = x + tx * a * sg + nx * o, pz = z + tz * a * sg + nz * o;
    if (poleClear(net, px, pz, gap)) return [px, pz];
  }
  return null;
}
export { hash2, clamp, UP };
