// streets/lamps.js - street lamp posts along the kerbs (docs/research/streets.md section 3 and 9, nevsky.md section 3, west-life-furniture.md section 4.1; photos P03 P07 P12 P13 P15 P16 P49 P67 P70):
//   A 'Nevsky pedestal lamp' (L1: Nevsky, Ligovsky, Sadovaya, the square approaches): black cast iron, fluted vase pedestal 2 m ending in a FLOWER BOWL (petunias / geraniums, 3 colour
//     variants), a slim shaft, a head at ~7.6 m with TWO S-curved arms each carrying a milky globe (70 %), or two stacked globes on the shaft (30 %). One pole per ~36 m per side.
//   D 'swan-neck lamp' (L10: side streets: Marata, Pushkinskaya, Bolshaya Morskaya, Gorokhovaya ...): slim dark pole 5 m, a curved crook with a hanging opal lantern; every ~50 m.
//   S 'Admiralty swan neck' (L3 / L4: Admiralteysky pr., Dvortsovaya / Admiralteyskaya embankments, Dvortsovy proezd, the Palace Square roads): slim black pole 8.7 m, curled crook, ONE opal
//     globe in a dark cup, a hanging petunia basket on every third pole (S1); one per ~32 m.
//   L 'embankment lantern' (L7: Moika and Griboedov Canal embankments, Isaac's Square): black pole 4.3 m with a gold collar and a tapered glass lantern on a scroll crook; one per ~34 m.
// TRIANGLE DIET (streets budget): every model is a handful of OPEN cylinders / 8-20 triangle balls (A 160, A stacked 150, D 60, S 55 / 95, L 56 triangles instead of 420 / 340 / 250),
// the silhouette (pedestal + bowl, S-arms with globes, crook with the lantern) is kept; globes are 20-triangle icosahedra. Instanced; the globes glow at night (shared uNight) and drop
// additive light pools on the road. Lamps keep clear of zebra crossings, junction mouths, bus stops, the owned square plazas and the facades.
// Returns { list: [{x, z, h, kind, nx, nz, ...}], count }.
import * as THREE from 'three';
import { VB } from './vb.js';
import { clamp, PointGrid } from './util.js';
import { instances, alongKerbs, hash2, nodeNear, inMergedStrip, TRACK_CLEAR, furnZone } from './furn.js';
import { nearCrossing, streetTrackDist } from './net.js';
import { isOpen } from './region.js';
import { WALK_Y, KERB_W } from './surface.js';
import { facadeDist } from './bld.js';
import { lampFamily } from './style.js';
import { deckAt } from './decks.js';
import { LANDUSE } from '../data/city.js';

const DBG = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('st')) || '';
const IRON = '#1b1f20', IRON_D = '#2c3133', GOLD = '#b8943a', GREEN_D = '#2f4a38';
const FLOWERS = [['#e0457b', '#f08cb4', '#d6336c'], ['#d0242e', '#e8667a', '#f08cb4'], ['#f5f1f0', '#c0306f', '#f4a9c6']];
const GLOBE = '#fff3d6';

/** Nevsky pedestal lamp. variant: 0 pink / 1 red / 2 white-magenta bowl; stacked: two stacked globes on the shaft instead of two arms. Arms run along local +-X. */
function lampA(variant, stacked) {
  const V = new VB(), G = new VB(), H = stacked ? 8.4 : 7.6;
  // pedestal: plinth, fluted vase (both open: nobody sees the caps), rim + bowl
  V.cyl(0.36, 0.42, 0.62, IRON, [0, 0.31, 0], null, 6, null, true);
  V.cyl(0.41, 0.3, 0.9, IRON, [0, 1.07, 0], null, 6, null, true);
  V.cyl(0.46, 0.3, 0.42, IRON, [0, 1.7, 0], null, 6);
  const fl = FLOWERS[variant % 3];
  V.ball(0.27, fl[0], [-0.1, 2.02, 0.04], [1, 0.85, 1]);
  V.ball(0.23, fl[1], [0.14, 2.06, -0.06], [1, 0.85, 1]);
  // shaft
  V.cyl(0.075, 0.14, H - 1.9, IRON, [0, 1.9 + (H - 1.9) / 2, 0], null, 6, null, true);
  const globe = (x, y, z) => {
    G.ball(0.23, GLOBE, [x, y, z]);                                              // milky globe (glows at night)
    V.cyl(0.1, 0.1, 0.5, IRON_D, [x, y + 0.02, z], null, 4, null, true);       // cap + socket in one
  };
  if (!stacked) {
    V.ball(0.13, IRON_D, [0, H - 0.2, 0], null, 'oct');
    for (const sg of [-1, 1]) {                                                  // S-curved arm: out, up, curl, globe hanging at the end
      V.rod([sg * 0.08, H - 0.2, 0], [sg * 0.45, H - 0.42, 0], 0.035, IRON, 3, true);
      V.rod([sg * 0.45, H - 0.42, 0], [sg * 0.92, H - 0.4, 0], 0.03, IRON, 3, true);
      globe(sg * 0.92, H - 0.78, 0);
    }
    V.cyl(0.02, 0.06, 0.4, IRON, [0, H + 0.05, 0], null, 5, null, true);        // finial
  } else {
    V.cyl(0.14, 0.1, 0.12, IRON_D, [0, H - 1.6, 0], null, 6, null, true); globe(0, H - 1.3, 0);
    V.cyl(0.1, 0.14, 0.14, IRON_D, [0, H - 0.8, 0], null, 6, null, true); globe(0, H - 0.45, 0);
    V.cyl(0.02, 0.07, 0.4, IRON, [0, H + 0.0, 0], null, 5, null, true);
  }
  return { body: V.build(), glow: G.build(), H, arm: stacked ? 0 : 0.92 };
}

/** swan-neck lamp of the side streets: pole 5.2 m, curved crook out over the street (+Z), hanging ornate lantern with opal glass */
function lampD() {
  const V = new VB(), G = new VB(), H = 5.2, out = 1.25, C = '#25282a';
  V.cyl(0.14, 0.17, 0.5, '#2a2d2f', [0, 0.25, 0], null, 6, null, true);
  V.cyl(0.05, 0.1, H - 0.5, C, [0, 0.5 + (H - 0.5) / 2, 0], null, 5, null, true);
  V.rod([0, H - 0.1, 0], [0, H + 0.4, 0.4], 0.05, C, 3, true);
  V.rod([0, H + 0.4, 0.4], [0, H + 0.45, 0.95], 0.04, C, 3, true);
  V.rod([0, H + 0.45, 0.95], [0, H + 0.38, out], 0.035, C, 3, true);
  V.cyl(0.02, 0.17, 0.12, '#33373a', [0, H + 0.0, out], null, 5, null, true);   // cap
  V.cyl(0.1, 0.04, 0.1, '#33373a', [0, H - 0.5, out], null, 5, null, true);
  G.cyl(0.14, 0.12, 0.38, '#fff0cf', [0, H - 0.26, out], null, 5);
  return { body: V.build(), glow: G.build(), H: H + 0.4, arm: out };
}

/** Admiralty swan neck: slim black pole 8.7 m, curled crook, ONE opal globe in a dark cup; basket = a hanging petunia basket at 3.6 m (every third pole) */
function lampS(basket) {
  const V = new VB(), G = new VB(), H = 8.7, out = 1.1;
  V.cyl(0.2, 0.27, 0.8, IRON, [0, 0.4, 0], null, 6, null, true);
  V.cyl(0.07, 0.13, H - 0.8, IRON, [0, 0.8 + (H - 0.8) / 2, 0], null, 6, null, true);
  V.rod([0, H - 0.1, 0], [0, H + 0.38, 0.25], 0.06, IRON, 3, true);
  V.rod([0, H + 0.38, 0.25], [0, H + 0.5, 0.75], 0.045, IRON, 3, true);
  V.rod([0, H + 0.5, 0.75], [0, H + 0.2, out], 0.04, IRON, 3, true);
  V.cyl(0.2, 0.1, 0.16, IRON_D, [0, H + 0.1, out], null, 6, null, true);        // the cup
  G.ball(0.27, GLOBE, [0, H + 0.34, out]);
  if (basket === 2) {
    // (open districts, docs/research/vo-requests-landmarksMenshikov.md 6: the one-sided basket on an arm read as a pink-and-green PENNANT when seen edge-on against the sky) a flower BOWL ON THE POLE: a dark-green
    // ring band round the shaft at 3.5 m with a wreath of six blooms on it, the same from every side
    V.cyl(0.36, 0.3, 0.26, GREEN_D, [0, 3.5, 0], null, 6, null, true);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3; V.ball(0.15, k % 2 ? '#d6336c' : '#f08cb4', [Math.cos(a) * 0.3, 3.7, Math.sin(a) * 0.3], [1, 0.8, 1], 'oct'); }
  } else if (basket) {
    V.rod([0, 3.85, 0], [0, 3.85, 0.5], 0.03, IRON, 3, true);
    V.cyl(0.33, 0.2, 0.3, GREEN_D, [0, 3.55, 0.55], null, 6, null, true);
    V.ball(0.36, '#d6336c', [0, 3.78, 0.55], [1, 0.55, 1]);
  }
  return { body: V.build(), glow: G.build(), H: H + 0.5, arm: out };
}

/** embankment lantern: black pole 4.3 m with a gold collar, a short scroll crook and a tapered glass lantern */
function lampL() {
  const V = new VB(), G = new VB(), H = 4.1, out = 0.5;
  V.cyl(0.2, 0.25, 0.6, IRON, [0, 0.3, 0], null, 6, null, true);
  V.cyl(0.045, 0.09, H - 0.6, IRON, [0, 0.6 + (H - 0.6) / 2, 0], null, 6, null, true);
  V.cyl(0.095, 0.095, 0.08, GOLD, [0, 1.25, 0], null, 6, null, true);           // gold collar ring
  V.rod([0, H - 0.1, 0], [0, H + 0.3, 0.2], 0.04, IRON, 3, true);
  V.rod([0, H + 0.3, 0.2], [0, H + 0.12, out], 0.035, IRON, 3, true);
  V.cyl(0.02, 0.2, 0.14, IRON_D, [0, H - 0.2, out], null, 4, null, true);        // cap
  G.cyl(0.15, 0.2, 0.4, '#fff0cf', [0, H - 0.5, out], null, 4);
  return { body: V.build(), glow: G.build(), H: H + 0.35, arm: out };
}

/** Gostiny Dvor lantern (L2): dark green-black pole 4.8 m with an acanthus collar, a short scroll crook and ONE square tapered clear lantern with a pierced pyramid cap (docs/research/west-life-furniture.md 4.1) */
function lampL2() {
  const V = new VB(), G = new VB(), H = 4.6, C = '#1d2924';
  V.cyl(0.17, 0.22, 0.5, C, [0, 0.25, 0], null, 6, null, true);
  V.cyl(0.05, 0.1, H - 0.5, C, [0, 0.5 + (H - 0.5) / 2, 0], null, 6, null, true);
  V.cyl(0.11, 0.11, 0.1, GOLD, [0, 3.7, 0], null, 6, null, true);                // acanthus collar
  V.rod([0, H - 0.05, 0], [0, H + 0.25, 0.22], 0.04, C, 3, true);
  V.rod([0, H + 0.25, 0.22], [0, H + 0.1, 0.5], 0.035, C, 3, true);
  V.cyl(0.02, 0.24, 0.2, C, [0, H - 0.1, 0.5], null, 4, null, true);              // pierced pyramid cap
  V.ball(0.04, GOLD, [0, H + 0.05, 0.5], null, 'oct');                            // ball finial
  G.cyl(0.18, 0.12, 0.42, '#fff0cf', [0, H - 0.42, 0.5], null, 4);
  return { body: V.build(), glow: G.build(), H: H + 0.1, arm: 0.5 };
}

/** modern street light (M): the galvanised steel pole with a straight arm and a cobra-head luminaire over the kerb lane that lights the superblock streets of the island's west (Nalichnaya, Korablestroiteley,
 *  Kruzenshterna, the land-fill boulevards: Commons "Nalichnaya street(1).jpg"): 9 m tapered 8-sided pole, arm 2.2 m reaching out over the roadway, flat head; the Petersburg pedestal lamps stand in the old town only */
function lampM() {
  const V = new VB(), G = new VB(), H = 9.2, out = 2.1, C = '#8f9499', C2 = '#6f7479';
  V.cyl(0.14, 0.2, 0.6, C2, [0, 0.3, 0], null, 8, null, true);
  V.cyl(0.07, 0.13, H - 0.6, C, [0, 0.6 + (H - 0.6) / 2, 0], null, 8, null, true);
  V.rod([0, H - 0.25, 0], [0, H + 0.35, out * 0.55], 0.055, C, 4, true);
  V.rod([0, H + 0.35, out * 0.55], [0, H + 0.38, out], 0.045, C, 4, true);
  V.box(0.34, 0.13, 0.78, C2, [0, H + 0.4, out]);                                 // the luminaire
  G.box(0.26, 0.04, 0.62, '#fff0cf', [0, H + 0.33, out]);
  return { body: V.build(), glow: G.build(), H: H + 0.5, arm: out };
}

const SPACING = { A: 36, S: 32, L: 34, D: 50, M: 32 };

/** THE PORT ROADS (third pass, docs/research/vo-requests-landmarksMarineFacade.md streets 5; photos V 10 / 33 / 34 / 40): the service ways inside the fenced passenger-port landuse w704134882 (rank 0, lit=0 in OSM: no kerb run, no family)
 *  carry 11 m single-arm cobra heads (family M) every ~35 m on one side. Synthetic kerb points at the asphalt edge; the placer of buildLamps applies every rule of the kerb lamps (road clearance, junctions, facades, FURN_CLEAR, tram rails). Open districts only. */
const PORT_RING = (() => { const l = LANDUSE.find((q) => q.id === 'w704134882'); return l && l.polys && l.polys[0] ? l.polys[0].o : null; })();
const inPort = (x, z) => { const o = PORT_RING; if (!o) return false; let ins = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; };
export const PORT_LAMP_SPACING = 35;
function portRows(net, consider) {
  if (!PORT_RING) return;
  for (const w of net.ways) {
    if (w.rank !== 0 || w.hw !== 'service' || w.skipDraw || w.pedestrianOnly || w.bridge || w.L < 40 || !w.n) continue;
    const m = w.n >> 1; if (!isOpen(w.x[m], w.z[m]) || !inPort(w.x[m], w.z[m])) continue;
    const side = hash2(w.i, 7) < 0.5 ? 1 : -1, hw = Math.max(1.5, (w.w || 4) / 2);
    let acc = 12 + 10 * hash2(w.i, 9);
    for (let i = 1; i < w.n; i++) {
      const ax = w.x[i - 1], az = w.z[i - 1], bx = w.x[i], bz = w.z[i], seg = Math.hypot(bx - ax, bz - az); if (seg < 1e-6) continue;
      const tx = (bx - ax) / seg, tz = (bz - az) / seg, nx = -tz * side, nz = tx * side;
      acc += seg;
      while (acc > PORT_LAMP_SPACING) {
        acc -= PORT_LAMP_SPACING;
        const f = 1 - acc / seg, sx = ax + (bx - ax) * f, sz = az + (bz - az) * f, s = w.s[i - 1] + (w.s[i] - w.s[i - 1]) * f;
        if (s < 10 || w.L - s < 10 || !inPort(sx, sz)) continue;
        consider({ x: sx + nx * hw, z: sz + nz * hw, nx, nz, w, side: side > 0 ? 'R' : 'L', s, run: -1 }, 'M');
      }
    }
  }
}

export function buildLamps(ctx, net, T, root, opts = {}) {
  const { owned = new Set(), inPlaza = () => false, avoid = [], tPool, skipAt = null, extra = [] } = opts;
  const out = { count: 0, list: [], tris: 0 };
  const taken = new PointGrid(12);                                          // (every candidate asked every lamp placed so far)
  const free = (x, z, d) => !taken.any(x, z, d);
  const sites = { A0: [], A1: [], A2: [], S0: [], S1: [], S2: [], L: [], D: [], L2: [], M: [] };
  const consider = (k, famOv) => {
    const w = k.w; if (w.pedestrianOnly) return;                           // the Paradny Quarter pedestrian ways: landmarksTauride draws its own lighting
    const fam = famOv || lampFamily(w); if (!fam || w.bridge) return;
    // road clearance rule: the base stands off every OTHER carriageway (1.2 m) and off the asphalt of its own way INCLUDING the parking pocket and its ramps (0.55 m; the kerb run does
    // not follow the pocket taper): a lamp on the asphalt moves outward in 0.3 m steps (up to 0.6 m) and is dropped when it still stands on it
    let off = fam === 'A' ? KERB_W + 0.55 : KERB_W + 0.4, x = k.x + k.nx * off, z = k.z + k.nz * off;
    for (let m = 0; m < 2 && net.cover(x, z, {}) > -0.55; m++) { off += 0.3; x = k.x + k.nx * off; z = k.z + k.nz * off; }
    if (nearCrossing(net, x, z, 5.5) || net.cover(x, z, { skip: w }) > -1.2 || net.cover(x, z, {}) > -0.55 || !free(x, z, fam === 'A' ? 12 : fam === 'D' ? 10 : 11)) return;
    if (inPlaza(x, z) && owned.has('square')) return;                     // landmarksA places the square's own lamps
    if (skipAt && skipAt(x, z)) return;
    if (isOpen(x, z) && streetTrackDist(x, z) < TRACK_CLEAR) return;                    // not on the rails of a tram reservation beside the kerb (open districts, region.js)
    if (furnZone(x, z)) return;                                           // a place a sight module dresses itself (furn.js FURN_CLEAR: the Mining stair forecourt, the Academy pier block, the Menshikov apron wall)
    if (deckAt(x, z, 1.5)) return;                                        // bridge decks carry the bridges module's own lamp standards                                   // inside a square paved by a landmark module (it places its own lamps)
    for (const a of avoid) if (Math.hypot(a[0] - x, a[1] - z) < 6) return;
    if (facadeDist(x, z, 2.5) < (fam === 'A' ? 1.2 : 1.0)) return;
    if (nodeNear(net, x, z, 10)) return;
    if (net.cover(x, z, { skip: w }) > -7.7 && inMergedStrip(net, x, z, 0.15, 7.5)) return;                    // the strip between two carriageways of one street that fillMedians merged (gap < 7.5 m) is roadway: no lamp on it (furn.js; a median of 7.5 m and more keeps its lamps)
    const hsh = hash2(Math.round(x * 3), Math.round(z * 3));
    const key = fam === 'A' ? (hsh < 0.3 ? 'A2' : hsh < 0.62 ? 'A0' : 'A1') : fam === 'S' ? (hsh < 0.34 ? (isOpen(x, z) ? 'S2' : 'S1') : 'S0') : fam;       // (S2 = the flower bowl on the pole: the open districts; the reviewed ones keep the basket on its arm)
    // arms of A run along the street normal (across the pavement and the carriageway); D / S / L crooks lean over the road
    const rotY = fam === 'A' ? Math.atan2(-k.nz, k.nx) : Math.atan2(-k.nx, -k.nz);
    sites[key].push({ x, y: WALK_Y, z, rotY, way: w.i, kind: fam, nx: k.nx, nz: k.nz, run: k.run, s: k.s }); taken.add(x, z);
  };
  alongKerbs(net, (w) => SPACING[lampFamily(w)] || 50, (k) => consider(k));
  portRows(net, consider);
  for (const e of extra) {                                                  // mapped OSM lamps that stand where the generator has no kerb (the Gostiny Dvor promenade): the lantern model, facing the street
    if (deckAt(e.x, e.z, 1.5) || (skipAt && skipAt(e.x, e.z))) continue;
    sites.L2.push({ x: e.x, y: WALK_Y, z: e.z, rotY: e.rotY || 0, way: -1, kind: 'L2', nx: e.nx || 0, nz: e.nz || 1, run: -1, s: 0 }); taken.add(e.x, e.z);
  }
  for (const key of Object.keys(sites)) for (const s of sites[key]) ctx.physics.addCylinder(s.x, s.z, key === 'D' || key === 'L' || key === 'L2' || key === 'M' ? 0.16 : 0.34, 0, key === 'L' || key === 'L2' ? 2.5 : 3);

  const mVC = ctx.mat.toon('#ffffff', { vertexColors: true, paint: 0.02, name: 'pt-lamp' });
  const mGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff0cc'), toneMapped: false, name: 'pt-lamp-glow' });
  const models = { A0: lampA(0, false), A1: lampA(1, false), A2: lampA(2, true), D: lampD(), S0: lampS(false), S1: lampS(true), S2: lampS(2), L: lampL(), L2: lampL2(), M: lampM() };
  for (const key of Object.keys(sites)) {
    const m = models[key]; if (!m || !sites[key].length) continue;
    instances(ctx, m.body, mVC, sites[key], 'lamps-' + key);
    const g = instances(ctx, m.glow, mGlow, sites[key], 'lamps-' + key + '-glow', { shadow: false });
    if (g) ctx.noOutline(g);
    out.tris += (m.body.index.count / 3) * sites[key].length;
  }
  // light pools on the road at night
  {
    const list = [];
    for (const key of Object.keys(sites)) { const m = models[key]; if (!m) continue; for (const s of sites[key]) list.push({ x: s.x - s.nx * (m.arm || 0.5), z: s.z - s.nz * (m.arm || 0.5), y: 0.07 }); }
    if (list.length && tPool && !DBG.includes('nopool')) {
      const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
      const mPool = new THREE.MeshBasicMaterial({ map: tPool, color: new THREE.Color('#ffd9a0'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, name: 'pt-lamp-pool' });
      const im = new THREE.InstancedMesh(geo, mPool, list.length);
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(15, 1, 15);
      list.forEach((p, i) => { M.compose(new THREE.Vector3(p.x, p.y, p.z), Q, S); im.setMatrixAt(i, M); });
      im.frustumCulled = false; im.renderOrder = 5; ctx.noOutline(im); ctx.addStatic(im); im.visible = false;
      ctx.onUpdate(() => {
        const n = ctx.shared.uNight ? ctx.shared.uNight.value : 0, k = clamp((n - 0.05) / 0.5, 0, 1);
        im.visible = k > 0.01; mPool.opacity = 0.5 * k;
        mGlow.color.setRGB(1.0, 0.9, 0.7).multiplyScalar(0.7 + 1.5 * n);
      });
    } else ctx.onUpdate(() => { const n = ctx.shared.uNight ? ctx.shared.uNight.value : 0; mGlow.color.setRGB(1.0, 0.9, 0.7).multiplyScalar(0.7 + 1.5 * n); });
  }
  for (const key of Object.keys(sites)) for (const s of sites[key]) out.list.push({ x: s.x, z: s.z, h: models[key].H, kind: s.kind, arm: models[key].arm, rotY: s.rotY, nx: s.nx, nz: s.nz, run: s.run, s: s.s, way: s.way });
  out.count = out.list.length;
  return out;
}
