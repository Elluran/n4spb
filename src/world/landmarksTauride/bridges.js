// landmarksTauride/bridges.js - THE BRIDGES AND THE DAM of the Tauride Garden (docs/TAURIDE-REMAKE.md, phase T4b; plan C6): the five numbered bridges and the dam on the six crossing sites of data/bridges.js, as a kit of three types
// (iron arch No.3 / No.4, humped wooden No.1, flat metal No.2 / No.5) and the weir, with ONE deck height function for the engine (the deck service: cars, pedestrians, the harness) and the walking surface of the player.
//   planBridges(o)              PURE and DETERMINISTIC: { sites, deckY, colliders, decks, zones, keepOut, geometry, water, stats }. o = { sites (data/bridges.js BRIDGE_SITES), design (data/bridge-design.js), ponds (data/ponds.js), gh (gardenHeight), shore (GARDEN_SHORE), paths (data/paths.js: the stairs at the heads) }
//   buildBridges(ctx, parent, plan)   the two meshes (the solids with vertex colours; the dam's water sheet and foam as a decal) and the colliders (walk ramps along every deck, rail boxes along both edges) on ctx.physics.
// THE AXIS of a site is the data's deck polyline EXTENDED at both ends until the end stands on dry land past the shore colliders of ponds.js (the contour -0.3 + a margin: five of the twelve data ends stand ON the contour), or to the foot of
// the stair that the data draws at the end (the wooden bridge: the 4 + 4 steps of w415779498 / w420650661). deckY(u) is the WALKING PROFILE along the whole axis: the approach (a ramp from the ground + HEAD_LIFT = the ribbon surface of the
// alley, or the stair, rising to the head), the deck (the hump, the arch, the flat), the far approach; so a walker finds no step and no gap between the alley, the approach and the deck, and nav.surfaceY stands him on it (+ WALK_LIFT).
// The profile is sampled into a table every WALK.sample m: deckY(x, z) is a bbox reject, a projection onto the axis segments (|v| <= half width + pad) and one linear interpolation: pure, no allocation, the same bits on every call. The
// player walks the same profile as 1 m sticky ramps (core/physics.js addWalkRamp: 4 mm from the table on the arch); the rails are invisible 0.5 m boxes along both edges, tall enough that a hop cannot clear them; the shore colliders of ponds.js are
// cut away inside the deck rectangle (+ WALK.pad), where the rails take over, so the head of a bridge is the one place where the shore ring opens and it opens onto the deck between two rails.
// Budgets (data/bridge-design.js BUDGET): the six sites ~10 k triangles in 2 draws. Stone only where real (the abutments, the dam, the memorial descent of T2 / T3).
import * as THREE from 'three';
import { knockBays } from '../lib/fence-bays.js';
import { registerLOD } from '../../core/spatial.js';
import { BRIDGE_SITES, BRIDGE_DECK_WIDTH, DAM as DAM_DATA } from './data/bridges.js';
import * as DESIGN from './data/bridge-design.js';
import * as PONDS from './data/ponds.js';
import { PATHS } from './data/paths.js';
import { gardenHeight, GARDEN_SHORE, pondProfile } from './height.js';
import { landOffsetAt } from './ponds.js';

const col3 = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** the vertex kit of the solids: flat-shaded quads with a colour, wound to face the side the hint vector points to */
function makeKit() {
  const pos = [], nrm = [], col = [], idx = [];
  const tri = (p, q, r, c, hx, hy, hz) => {
    const e1 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], e2 = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
    const l = Math.hypot(nx, ny, nz); if (l < 1e-9) return;
    nx /= l; ny /= l; nz /= l;
    let flip = false; if (nx * hx + ny * hy + nz * hz < 0) { flip = true; nx = -nx; ny = -ny; nz = -nz; }
    const base = pos.length / 3;
    for (const v of [p, q, r]) { pos.push(v[0], v[1], v[2]); nrm.push(nx, ny, nz); col.push(c[0], c[1], c[2]); }
    if (flip) idx.push(base, base + 2, base + 1); else idx.push(base, base + 1, base + 2);
  };
  /** a quad a-b-c-d (around the face), facing the hint direction (hx, hy, hz) */
  const quad = (a, b, c, d, color, hx, hy, hz) => { tri(a, b, c, color, hx, hy, hz); tri(a, c, d, color, hx, hy, hz); };
  /** an oriented box: centre (cx, cz), unit axis (dx, dz) with half length hl along it, half width hw across, y0 .. y1 */
  const obb = (cx, cz, dx, dz, hl, hw, y0, y1, color) => {
    const px = -dz, pz = dx, P = (s, t, y) => [cx + dx * s * hl + px * t * hw, y, cz + dz * s * hl + pz * t * hw];
    quad(P(-1, -1, y1), P(1, -1, y1), P(1, 1, y1), P(-1, 1, y1), color, 0, 1, 0);          // top
    quad(P(-1, -1, y0), P(1, -1, y0), P(1, 1, y0), P(-1, 1, y0), color, 0, -1, 0);         // bottom
    quad(P(1, -1, y0), P(1, 1, y0), P(1, 1, y1), P(1, -1, y1), color, dx, 0, dz);          // the end at +axis
    quad(P(-1, -1, y0), P(-1, 1, y0), P(-1, 1, y1), P(-1, -1, y1), color, -dx, 0, -dz);    // the end at -axis
    quad(P(-1, 1, y0), P(1, 1, y0), P(1, 1, y1), P(-1, 1, y1), color, px, 0, pz);          // the side at +perp
    quad(P(-1, -1, y0), P(1, -1, y0), P(1, -1, y1), P(-1, -1, y1), color, -px, 0, -pz);    // the side at -perp
  };
  /** a tube along a 3-D polyline of centre points with the perpendicular (px, pz) per point: a rectangular cross-section hw across x hh up, 4 faces + 2 caps */
  const tube = (pts, perps, hw, hh, color, caps = true) => {
    const C = (i, s, t) => [pts[i][0] + perps[i][0] * s * hw, pts[i][1] + t * hh, pts[i][2] + perps[i][1] * s * hw];
    for (let i = 0; i + 1 < pts.length; i++) {
      const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][2] - pts[i][2], l = Math.hypot(dx, dz) || 1, ox = perps[i][0], oz = perps[i][1];
      quad(C(i, -1, 1), C(i + 1, -1, 1), C(i + 1, 1, 1), C(i, 1, 1), color, 0, 1, 0);
      quad(C(i, -1, -1), C(i + 1, -1, -1), C(i + 1, 1, -1), C(i, 1, -1), color, 0, -1, 0);
      quad(C(i, 1, -1), C(i + 1, 1, -1), C(i + 1, 1, 1), C(i, 1, 1), color, ox, 0, oz);
      quad(C(i, -1, -1), C(i + 1, -1, -1), C(i + 1, -1, 1), C(i, -1, 1), color, -ox, 0, -oz);
      if (caps && i === 0) quad(C(0, -1, -1), C(0, 1, -1), C(0, 1, 1), C(0, -1, 1), color, -dx / l, 0, -dz / l);
      if (caps && i + 2 === pts.length) { const j = i + 1; quad(C(j, -1, -1), C(j, 1, -1), C(j, 1, 1), C(j, -1, 1), color, dx / l, 0, dz / l); }
    }
  };
  return { pos, nrm, col, idx, tri, quad, obb, tube, get triangles() { return idx.length / 3; } };
}

/** the design values of a site: the type's row of data/bridge-design.js TYPES with the SITE_OVERRIDES of the site */
export function designOf(site, D = DESIGN) { return { ...D.TYPES[site.type], ...(D.SITE_OVERRIDES[site.site] || {}) }; }

/**
 * The plan (pure). For every site: the axis (the data deck polyline extended to dry land or to the stair feet), the walking profile along it (a table), the colliders, the solids.
 *   o.sites, o.design, o.ponds, o.gh (x, z) -> number | null, o.shore ({ dist, inGarden }), o.paths (the data ways: the steps ways at the heads), o.deckW
 */
export function planBridges(o = {}) {
  const sites = o.sites || BRIDGE_SITES, D = o.design || DESIGN, P = o.ponds || PONDS, gh = o.gh || gardenHeight, shore = o.shore || GARDEN_SHORE, paths = o.paths || PATHS, deckW = o.deckW ?? BRIDGE_DECK_WIDTH.value;
  const prof = pondProfile(P), slopeAt = prof.slopeAt, C = P.COLLIDER, W = D.WALK, R = D.RAIL, hw = deckW / 2;
  const G = (x, z) => gh(x, z) ?? 0;                                             // the ground: the terrain, the street (0) outside the garden
  const dryNeed = (x, z) => landOffsetAt(C.contourY, slopeAt(x, z), P) + D.EXTEND.margin;
  const stairsWays = paths.filter((p) => p.cls === 'steps');
  const plans = [], colliders = [], decks = [], zones = [], keepOut = [];
  const K = makeKit(), KW = makeKit();
  let worstRamp = 0;
  for (const site of sites) {
    const d = site.deck, pts = []; for (let i = 0; i < d.length; i += 2) pts.push([d[i], d[i + 1]]);
    const DS = designOf(site, D);
    // ---- the ends: a stair of the data (its far end = the foot) or the dry extension along the axis
    const endOf = (end, prev) => {
      const dx = end[0] - prev[0], dz = end[1] - prev[1], l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
      const st = stairsWays.find((p) => { const q = p.pts; return Math.hypot(q[0] - end[0], q[1] - end[1]) < 0.35 || Math.hypot(q[q.length - 2] - end[0], q[q.length - 1] - end[1]) < 0.35; });
      if (st) { const q = st.pts, atStart = Math.hypot(q[0] - end[0], q[1] - end[1]) < 0.35, foot = atStart ? [q[q.length - 2], q[q.length - 1]] : [q[0], q[1]]; return { x: foot[0], z: foot[1], ext: Math.hypot(foot[0] - end[0], foot[1] - end[1]), stair: { id: st.id, n: st.steps || 4, foot }, ux, uz }; }
      let x = end[0], z = end[1], ext = 0;
      while (ext < D.EXTEND.max && shore.dist(x, z) < dryNeed(x, z)) { x += ux * D.EXTEND.step; z += uz * D.EXTEND.step; ext += D.EXTEND.step; }
      return { x, z, ext, stair: null, ux, uz };
    };
    const A = endOf(pts[0], pts[1]), B = endOf(pts[pts.length - 1], pts[pts.length - 2]);
    const axis = [[A.x, A.z], ...pts, [B.x, B.z]];
    // (an extension of 0 duplicates the data point: drop it)
    if (A.ext < 1e-6) axis.shift(); if (B.ext < 1e-6) axis.pop();
    const cum = [0]; for (let i = 1; i < axis.length; i++) cum.push(cum[i - 1] + Math.hypot(axis[i][0] - axis[i - 1][0], axis[i][1] - axis[i - 1][1]));
    const L = cum[cum.length - 1];
    const at = (u) => { u = clamp(u, 0, L); let i = 1; while (i < cum.length - 1 && cum[i] < u) i++; const a = axis[i - 1], b = axis[i], seg = cum[i] - cum[i - 1] || 1, t = (u - cum[i - 1]) / seg; return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, dx: (b[0] - a[0]) / seg, dz: (b[1] - a[1]) / seg, i }; };
    // ---- the water crossing and the abutment faces along the axis (0.1 m walk)
    let uWetA = -1, uWetB = -1, uFaceA = -1, uFaceB = -1; const face = DS.abutmentFace ?? 0.4;
    for (let u = 0; u <= L; u += 0.1) { const q = at(u), dd = shore.dist(q.x, q.z); if (dd < 0) { if (uWetA < 0) uWetA = u; uWetB = u; } if (dd <= face) { if (uFaceA < 0) uFaceA = u; uFaceB = u; } }
    if (uWetA < 0) { uWetA = L / 2; uWetB = L / 2; }
    if (uFaceA < 0) { uFaceA = uWetA; uFaceB = uWetB; }
    // ---- the walking profile: the approaches, the deck
    const gA = G(A.x, A.z) + D.HEAD_LIFT, gB = G(B.x, B.z) + D.HEAD_LIFT, maxS = D.MAX_RAMP_SLOPE;
    let hA, hB, uA, uB, level, crown = 0, kind = site.type;
    if (kind === 'wood-humped') {
      hA = gA + DS.headRise; hB = gB + DS.headRise; crown = DS.crown;
      uA = A.stair ? A.ext : Math.max(A.ext, (hA - gA) / maxS); uB = B.stair ? B.ext : Math.max(B.ext, (hB - gB) / maxS); level = null;
    } else if (kind === 'iron-arch') {
      level = Math.max(gA, gB) + DS.headRise; hA = hB = level; crown = DS.crown;
      uA = Math.max(uFaceA, (level - gA) / maxS); uB = Math.max(L - uFaceB, (level - gB) / maxS);
    } else if (kind === 'metal-flat') {
      level = Math.max(gA, gB) + DS.headRise; hA = hB = level;
      uA = Math.max(DS.rampMin, (level - gA) / maxS); uB = Math.max(DS.rampMin, (level - gB) / maxS);
    } else {                                                                     // the weir: the walkway on the crest of the dam
      level = D.DAM.crest; hA = hB = level;
      uA = Math.max(0.5, (level - gA) / maxS); uB = Math.max(0.5, (level - gB) / maxS);
    }
    if (uA + uB > L - 1) { const k = (L - 1) / (uA + uB); uA *= k; uB *= k; }
    // the profile table: n knots over the axis, the last one exactly at L; the kinks of the profile (the ends of the approaches) are moved OUT to a knot, so the table is exact between knots on the ramps and the flats (the arch
    // between knots is off by crown (pi / span)^2 sample^2 / 8 < 0.2 mm); deckY, the walk ramps and the solids all read the table (`h`), so the four agree bit for bit
    const nSeg = Math.max(4, Math.ceil(L / W.sample)), sample = L / nSeg, n = nSeg + 1;
    uA = Math.ceil(uA / sample - 1e-9) * sample; uB = Math.ceil(uB / sample - 1e-9) * sample;
    const hAnalytic = (u) => {
      if (u <= uA) return gA + (hA - gA) * (uA > 0 ? u / uA : 1);
      if (u >= L - uB) return gB + (hB - gB) * (uB > 0 ? (L - u) / uB : 1);
      const s = (u - uA) / (L - uA - uB); return hA + (hB - hA) * s + crown * Math.sin(Math.PI * s);
    };
    const table = new Float64Array(n); for (let k = 0; k < n; k++) table[k] = hAnalytic(k === nSeg ? L : k * sample);
    const h = (u) => { const f = (u < 0 ? 0 : u > L ? L : u) / sample, j = f | 0, t = f - j; return j + 1 < n ? table[j] + (table[j + 1] - table[j]) * t : table[n - 1]; };
    worstRamp = Math.max(worstRamp, A.stair || uA <= 0 ? 0 : Math.abs(hA - gA) / uA, B.stair || uB <= 0 ? 0 : Math.abs(hB - gB) / uB);      // the stairs are steps, not ramps (their rise is the T3 stair of paths-draped.js)
    // ---- the box of the site (the axis grown by the half width + pad)
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const p of axis) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const grow = hw + W.pad + 0.1, box = [x0 - grow, x1 + grow, z0 - grow, z1 + grow];
    const sx = new Float64Array(axis.length), sz = new Float64Array(axis.length), su = Float64Array.from(cum);
    for (let i = 0; i < axis.length; i++) { sx[i] = axis[i][0]; sz[i] = axis[i][1]; }
    const rec = { site: site.site, type: site.type, ways: site.ways.slice(), hw, pad: W.pad, axis, cum, L, uA, uB, uWetA, uWetB, uFaceA, uFaceB, gA, gB, hA, hB, level, crown, ends: { a: A, b: B }, table, sample, box, sx, sz, su, design: DS, at, h, hAnalytic };
    plans.push(rec);
    // ---- the colliders: ramps along the axis (pieces of up to W.rampLen between the knots of the table, never across a polyline vertex or a kink of the profile: a piece is then linear like the table, so the ramp IS deckY between
    // its ends except on the arch, where a 1 m chord is off by crown (pi / span)^2 / 8 < 3 mm), the rail boxes per segment and side
    const kinks = [uA, L - uB], bounds = [...new Set([...cum, ...kinks, ...Array.from({ length: n }, (_, k) => (k === nSeg ? L : k * sample))].map((v) => +v.toFixed(9)))].sort((p, q) => p - q);
    for (let i = 0; i + 1 < axis.length; i++) {
      const a = axis[i], b = axis[i + 1], len = cum[i + 1] - cum[i], dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, rot = Math.atan2(dx, dz), s0 = +cum[i].toFixed(9), s1 = +cum[i + 1].toFixed(9);
      const inner = bounds.filter((v) => v >= s0 && v <= s1), hard = new Set([s0, s1, ...kinks.map((v) => +v.toFixed(9))]);
      let u0 = inner[0];
      for (let k = 1; k < inner.length; k++) { const u1 = inner[k]; if (u1 - u0 > W.rampLen + 1e-9 || hard.has(u1) || k === inner.length - 1) { if (u1 - u0 > 1e-6) { const um = (u0 + u1) / 2, q = at(um); colliders.push({ kind: 'ramp', site: site.site, cx: q.x, cz: q.z, w: deckW - 2 * W.widthInset, d: u1 - u0, rot, yA: h(u0), yB: h(u1), thick: W.rampThick, u0, u1 }); } u0 = u1; } }
      let lo = Infinity, hi = -Infinity; for (let u = cum[i]; u <= cum[i + 1] + 1e-9; u += 0.1) { const y = h(u); lo = Math.min(lo, y); hi = Math.max(hi, y); }
      const px = -dz, pz = dx, mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, off = hw + R.colliderIn + R.colliderThick / 2;
      // (the rail boxes of before are gone: WATER IS REACHABLE, docs/AREAS.md 13.7: every rail bay of buildSiteSolids is a breakable bay with its own collider, see buildBridges)
      decks.push({ ax: a[0], az: a[1], bx: b[0], bz: b[1], hw: hw + W.pad, site: site.site });
    }
    zones.push({ c: [site.centre[0], site.centre[1]], axis: site.bearingDeg, w: deckW, len: site.deckLenM, site: site.site });
    keepOut.push({ axis: axis.map((p) => p.slice()), hw: hw + W.pad, site: site.site, type: site.type });
    // ---- the solids
    const t0 = K.triangles; buildSiteSolids(K, KW, rec, D, P, G, shore); rec.triangles = K.triangles - t0;
  }
  // ---- deckY: bbox-first over the union box, then the sites
  let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity; for (const p of plans) { bx0 = Math.min(bx0, p.box[0]); bx1 = Math.max(bx1, p.box[1]); bz0 = Math.min(bz0, p.box[2]); bz1 = Math.max(bz1, p.box[3]); }
  const NS = plans.length, boxes = new Float64Array(NS * 4), reach = new Float64Array(NS), invS = new Float64Array(NS);
  plans.forEach((p, i) => { boxes[4 * i] = p.box[0]; boxes[4 * i + 1] = p.box[1]; boxes[4 * i + 2] = p.box[2]; boxes[4 * i + 3] = p.box[3]; reach[i] = p.hw + p.pad; invS[i] = 1 / p.sample; });
  const tables = plans.map((p) => p.table), SX = plans.map((p) => p.sx), SZ = plans.map((p) => p.sz), SU = plans.map((p) => p.su), LS = plans.map((p) => p.L);
  function deckY(x, z) {
    if (!(x >= bx0 && x <= bx1 && z >= bz0 && z <= bz1)) return null;
    for (let i = 0; i < NS; i++) {
      if (x < boxes[4 * i] || x > boxes[4 * i + 1] || z < boxes[4 * i + 2] || z > boxes[4 * i + 3]) continue;
      const sx = SX[i], sz = SZ[i], su = SU[i], r = reach[i], tb = tables[i], inv = invS[i], L = LS[i];
      let best = Infinity, bu = 0;
      for (let k = 0; k + 1 < sx.length; k++) {
        const ax = sx[k], az = sz[k], ex = sx[k + 1] - ax, ez = sz[k + 1] - az, len = su[k + 1] - su[k]; if (!(len > 0)) continue;
        const dx = x - ax, dz = z - az, u = (dx * ex + dz * ez) / len, v = (dx * -ez + dz * ex) / len;
        if (u < -0.05 || u > len + 0.05) continue;
        const av = v < 0 ? -v : v; if (av > r || av >= best) continue;
        best = av; bu = su[k] + (u < 0 ? 0 : u > len ? len : u);
      }
      if (best === Infinity) continue;
      const f = (bu > L ? L : bu) * inv, j = f | 0, t = f - j;
      return j + 1 < tb.length ? tb[j] + (tb[j + 1] - tb[j]) * t : tb[tb.length - 1];      // (the same expression as the plan's h(u): the service, the ramps and the solids agree)
    }
    return null;
  }
  deckY.box = [bx0, bx1, bz0, bz1];
  const stats = { sites: plans.length, triangles: K.triangles + KW.triangles, solidTriangles: K.triangles, waterTriangles: KW.triangles, colliders: colliders.length, ramps: colliders.filter((c) => c.kind === 'ramp').length, rails: plans.reduce((n, p) => n + (p.railBays ? p.railBays.length : 0), 0), worstRampSlope: worstRamp, draws: 1 + (KW.triangles ? 1 : 0),
    perSite: Object.fromEntries(plans.map((p) => [p.site, { L: +p.L.toFixed(2), extA: +p.ends.a.ext.toFixed(2), extB: +p.ends.b.ext.toFixed(2), stairA: !!p.ends.a.stair, stairB: !!p.ends.b.stair, gA: +p.gA.toFixed(3), gB: +p.gB.toFixed(3), hA: +p.hA.toFixed(3), hB: +p.hB.toFixed(3), level: p.level === null ? null : +p.level.toFixed(3), crown: p.crown, uA: +p.uA.toFixed(2), uB: +p.uB.toFixed(2), wet: [+p.uWetA.toFixed(1), +p.uWetB.toFixed(1)], top: +Math.max(...p.table).toFixed(3), triangles: p.triangles }])) };
  const pack = (Kt) => ({ pos: Float32Array.from(Kt.pos), nrm: Float32Array.from(Kt.nrm), col: Float32Array.from(Kt.col), idx: Kt.pos.length / 3 > 65535 ? Uint32Array.from(Kt.idx) : Uint16Array.from(Kt.idx), triangles: Kt.triangles });
  return { sites: plans, deckY, colliders, decks, zones, keepOut, geometry: pack(K), water: pack(KW), stats, railBays: plans.flatMap((p) => p.railBays || []) };
}

/** the solids of one site into the kit K (and the dam's water sheet into KW) */
function buildSiteSolids(K, KW, rec, D, P, G, shore) {
  const { type, hw, axis, cum, L, uA, uB, uFaceA, uFaceB, design: DS, at, h } = rec, R = D.RAIL, C = DS.color, cols = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, col3(v)]));
  const rows = (u0, u1, step) => { const out = []; const n = Math.max(1, Math.ceil((u1 - u0) / step)); for (let k = 0; k <= n; k++) out.push(u0 + (u1 - u0) * k / n); for (let i = 1; i < cum.length - 1; i++) if (cum[i] > u0 + 1e-6 && cum[i] < u1 - 1e-6) out.push(cum[i]); return out.sort((a, b) => a - b); };
  const perp = (u) => { const q = at(u); return [-q.dz, q.dx]; };
  const P3 = (u, v, y) => { const q = at(u), p = perp(u); return [q.x + p[0] * v, y, q.z + p[1] * v]; };
  /** a slab (the deck): rows along the axis, top at h(u) (+ dy), thickness t, half width w; alternate colours per row when c2 is given (planks) */
  const slab = (u0, u1, step, w, t, c, c2 = null, dy = 0) => {
    const us = rows(u0, u1, step);
    for (let i = 0; i + 1 < us.length; i++) {
      const a = us[i], b = us[i + 1], ya = h(a) + dy, yb = h(b) + dy, cc = c2 && i % 2 ? c2 : c, q = at((a + b) / 2), p = perp((a + b) / 2);
      K.quad(P3(a, -w, ya), P3(b, -w, yb), P3(b, w, yb), P3(a, w, ya), cc, 0, 1, 0);
      K.quad(P3(a, -w, ya - t), P3(b, -w, yb - t), P3(b, w, yb - t), P3(a, w, ya - t), cc, 0, -1, 0);
      K.quad(P3(a, w, ya - t), P3(b, w, yb - t), P3(b, w, yb), P3(a, w, ya), cc, p[0], 0, p[1]);
      K.quad(P3(a, -w, ya - t), P3(b, -w, yb - t), P3(b, -w, yb), P3(a, -w, ya), cc, -p[0], 0, -p[1]);
      if (i === 0) K.quad(P3(a, -w, ya - t), P3(a, w, ya - t), P3(a, w, ya), P3(a, -w, ya), cc, -q.dx, 0, -q.dz);
      if (i + 2 === us.length) K.quad(P3(b, -w, yb - t), P3(b, w, yb - t), P3(b, w, yb), P3(b, -w, yb), cc, q.dx, 0, q.dz);
    }
  };
  /** the rails of both sides between u0 and u1: posts, a top rail, a mid rail; iron: an X in every bay. WATER IS REACHABLE (docs/AREAS.md 13.7): recorded as BAYS (rec.railBays, one per post-to-post span: x0, z0, x1, z1 on the rail line,
   *  the deck height at both ends), drawn and given colliders by buildBridges (lib/fence-bays.js), no longer merged into the kit */
  const rails = (u0, u1, c, iron) => {
    const v = hw - R.railW / 2 - 0.02, list = rec.railBays || (rec.railBays = []);
    for (const s of [-1, 1]) {
      const nPost = Math.max(2, Math.round((u1 - u0) / R.postSpacing));
      const us = []; for (let k = 0; k <= nPost; k++) us.push(u0 + (u1 - u0) * k / nPost);
      for (let i = 1; i + 1 < cum.length; i++) if (cum[i] > u0 + 0.05 && cum[i] < u1 - 0.05) us.push(cum[i]);      // a bend of the axis is a bay boundary too: a straight bay must not cut the corner and leave a wedge to slip through
      us.sort((p, q) => p - q);
      for (let k = 0; k + 1 < us.length; k++) {
        const a = us[k], b = us[k + 1]; if (b - a < 0.05) continue; const pa = P3(a, s * v, 0), pb = P3(b, s * v, 0);
        list.push({ x0: pa[0], z0: pa[2], x1: pb[0], z1: pb[2], y: h(a), ye: h(b), first: k === 0, iron, railH: DS.railH, color: C.rail, site: rec.site });
      }
    }
    void c;
  };
  /** a granite block under the deck at an abutment face: from uIn (inland) to uOut (water side), full width + 0.3, from the ground - 0.4 (the bed at the face) to the deck underside */
  const abutment = (uIn, uOut, t, c) => { const u0 = Math.min(uIn, uOut), u1 = Math.max(uIn, uOut), um = (u0 + u1) / 2, q = at(um), base = G(q.x, q.z) - 0.4, top = Math.min(h(u0), h(u1)) - t + 0.01; if (top > base) K.obb(q.x, q.z, q.dx, q.dz, (u1 - u0) / 2, hw + 0.3, base, top, c); };
  const posts = (u, c, size, hgt) => { for (const s of [-1, 1]) { const q = at(u), p = perp(u), v = hw + 0.12; K.obb(q.x + p[0] * s * v, q.z + p[1] * s * v, q.dx, q.dz, size / 2, size / 2, h(u) - 0.3, h(u) + hgt, c); } };
  if (type === 'iron-arch') {
    slab(0, uA, 1, hw, DS.deckThick, cols.ramp); slab(uA, L - uB, 1, hw, DS.deckThick, cols.deck); slab(L - uB, L, 1, hw, DS.deckThick, cols.ramp);
    rails(0, L, cols.rail, true);
    abutment(uFaceA - DS.abutmentLen, uFaceA + 0.2, DS.deckThick, cols.abutment); abutment(uFaceB - 0.2, uFaceB + DS.abutmentLen, DS.deckThick, cols.abutment);
    posts(uFaceA, cols.post, 0.36, DS.postMarble); posts(uFaceB, cols.post, 0.36, DS.postMarble);
    // the iron arches: ribs from the abutment faces (at the water) up to the deck underside at the crown
    const nR = DS.ribs, spring = P.WATER_Y - 0.05, mid = (uFaceA + uFaceB) / 2, under = h(mid) - DS.deckThick - 0.06;
    for (let r = 0; r < nR; r++) {
      const v = nR === 1 ? 0 : -(hw - 0.25) + (2 * (hw - 0.25)) * r / (nR - 1), pts = [], pp = [];
      for (let k = 0; k <= 12; k++) { const s = k / 12, u = uFaceA + (uFaceB - uFaceA) * s, y = spring + (under - spring) * Math.sin(Math.PI * s); pts.push(P3(u, v, y)); pp.push(perp(u)); }
      K.tube(pts, pp, 0.07, 0.11, cols.rib, false);
    }
  } else if (type === 'wood-humped') {
    slab(uA, L - uB, DS.plank, hw, DS.deckThick, cols.deck, cols.deck2);
    if (!rec.ends.a.stair) slab(0, uA, 1, hw, DS.deckThick, cols.deck); if (!rec.ends.b.stair) slab(L - uB, L, 1, hw, DS.deckThick, cols.deck);
    rails(0, L, cols.rail, false);
    for (const v of [-(hw - 0.35), hw - 0.35]) { const us = rows(uA, L - uB, 1), pts = us.map((u) => P3(u, v, h(u) - DS.deckThick - 0.12)), pp = us.map((u) => perp(u)); K.tube(pts, pp, 0.09, 0.12, cols.beam); }
    abutment(uA, uA + 0.9, DS.deckThick, cols.abutment); abutment(L - uB - 0.9, L - uB, DS.deckThick, cols.abutment);
  } else if (type === 'metal-flat') {
    slab(0, L, 1, hw, DS.deckThick, cols.deck);
    rails(0, L, cols.rail, false);
    abutment(uFaceA - DS.abutmentLen, uFaceA + 0.2, DS.deckThick, cols.abutment); abutment(uFaceB - 0.2, uFaceB + DS.abutmentLen, DS.deckThick, cols.abutment);
    posts(uFaceA, cols.post, 0.3, 0.9); posts(uFaceB, cols.post, 0.3, 0.9);
  } else {                                                                       // the weir (fix round 1: a granite mass proud of the water on both faces, the coping above the deck line, a nappe in streaks, broken foam)
    const DM = D.DAM, t = 0.25;
    slab(0, L, 1, hw, t, cols.deck);                                              // the walkway: its sides are inside the stone body (hidden), its top wins over the body top by 1 cm
    rails(0, L, cols.rail, false);
    const u0 = Math.max(0, uFaceA - 0.3), u1 = Math.min(L, uFaceB + 0.3), um = (u0 + u1) / 2, q = at(um), p = perp(um), hl = (u1 - u0) / 2;
    let bed = Infinity; for (let u = u0; u <= u1; u += 0.25) { const w = at(u); bed = Math.min(bed, G(w.x, w.z)); }
    // fix round 2: the faces from the DATA, not from a compass guess. The lake (the Big Pond) lies on the side of the axis where the channel meets it (DAM_DATA.mouthOnLake: +z, SOUTH of the dam); the other face
    // is the Small Pond (north). The sill and the nappe are on the face the water spills TO (DM.spillToLake false: the lake is upstream, the Small Pond face carries them), the body's bodyOut on the other face.
    const M = DAM_DATA.mouthOnLake, lakeSide = ((M[0] - q.x) * p[0] + (M[1] - q.z) * p[1]) >= 0 ? 1 : -1, spill = DM.spillToLake ? lakeSide : -lakeSide, base = bed - DM.bodyBelowBed, crest = h(um);
    // the stone body across the channel: from under the bed up to the crest, the deck width + bodyOut on the upstream face: the granite stands crest - WATER_Y above the water, not the slab edge
    K.obb(q.x - p[0] * spill * DM.bodyOut / 2, q.z - p[1] * spill * DM.bodyOut / 2, q.dx, q.dz, hl, hw + DM.bodyOut / 2, base, crest - 0.01, cols.body);
    // T7 (the GPU QA of the lake face: 'a plain grey slab'): the lake face gets a low coping kerb 7 cm over the walkway (a stone edge the rail stands behind) and a darker wet course at the waterline, so the mass reads as laid stone
    { const face = hw + (spill === lakeSide ? 0 : DM.bodyOut), wet = cols.abutment.map((c) => c * 0.72), kw = Math.min(0.25, face - hw + 0.1) / 2;
      K.obb(q.x + p[0] * lakeSide * (hw + kw - 0.02), q.z + p[1] * lakeSide * (hw + kw - 0.02), q.dx, q.dz, hl, kw, base, crest + 0.07, cols.coping);
      K.obb(q.x + p[0] * lakeSide * (face + 0.008), q.z + p[1] * lakeSide * (face + 0.008), q.dx, q.dz, hl, 0.01, base, P.WATER_Y + 0.12, wet); }
    // the coping on the SPILL face: from under the bed to copingRise ABOVE the crest, copingW beyond the deck edge (overlapping the slab side by 2 cm): the overflow sill, seen from the deck and from the water it falls into
    const vIn = hw - 0.02, vOut = hw + DM.copingW, lipY = crest + DM.copingRise;
    K.obb(q.x + p[0] * spill * (vIn + vOut) / 2, q.z + p[1] * spill * (vIn + vOut) / 2, q.dx, q.dz, hl, (vOut - vIn) / 2, base, lipY, cols.coping);
    // the nappe (the water level is one: a visual): ONE translucent pale tone from the lip down to the water in two rows, bulging `bulge` m out from the face (falling water, not a plank seen edge-on; the granite shows through),
    // with a narrow brighter thread per metre at a hashed place (the streaks of a sheet: two tones in regular stripes read as a striped curtain on software GL); the foam strip on the water at its foot, its far edge a wavy
    // polyline (the width at every column boundary from a hash: steps read as a sawtooth)
    const uS0 = u0 + 0.4, uS1 = u1 - 0.4, nCol = Math.max(2, Math.round(uS1 - uS0)), cS = col3(DM.sheet.color), cK = col3(DM.sheet.streak), cF = col3(DM.foam.color), hash = (k) => ((k * 7919 + 13) % 17) / 16;
    const vF = vOut + 0.01, yTop = lipY - 0.02, yMid = (lipY + P.WATER_Y) / 2, yBot = P.WATER_Y - 0.03, vMid = vF + DM.sheet.bulge * 0.6, vBot = vF + DM.sheet.bulge, yF = P.WATER_Y + 0.015, nx = p[0] * spill, nz = p[1] * spill;
    const fw = (k) => DM.foamW * (1 - DM.foam.jitter * hash(k)), o = 0.015;
    for (let k = 0; k < nCol; k++) {
      const a = uS0 + (uS1 - uS0) * k / nCol, b = uS0 + (uS1 - uS0) * (k + 1) / nCol;
      KW.quad(P3(a, spill * vF, yTop), P3(b, spill * vF, yTop), P3(b, spill * vMid, yMid), P3(a, spill * vMid, yMid), cS, nx, 0, nz);
      KW.quad(P3(a, spill * vMid, yMid), P3(b, spill * vMid, yMid), P3(b, spill * vBot, yBot), P3(a, spill * vBot, yBot), cS, nx, 0, nz);
      const s0 = a + (b - a - DM.sheet.streakW) * hash(k + 5), s1 = s0 + DM.sheet.streakW;
      KW.quad(P3(s0, spill * (vF + o), yTop), P3(s1, spill * (vF + o), yTop), P3(s1, spill * (vMid + o), yMid), P3(s0, spill * (vMid + o), yMid), cK, nx, 0, nz);
      KW.quad(P3(s0, spill * (vMid + o), yMid), P3(s1, spill * (vMid + o), yMid), P3(s1, spill * (vBot + o), yBot), P3(s0, spill * (vBot + o), yBot), cK, nx, 0, nz);
      KW.quad(P3(a, spill * vF, yF), P3(b, spill * vF, yF), P3(b, spill * (vF + fw(k + 1)), yF), P3(a, spill * (vF + fw(k)), yF), cF, 0, 1, 0);
    }
    abutment(0, Math.max(0.6, u0), t, cols.abutment); abutment(Math.min(L - 0.6, u1), L, t, cols.abutment);
  }
}

/** the meshes and the colliders of a plan: { group, mesh, waterMesh, triangles, draws, colliders }. opts.physics (default ctx.physics). The solids are one never-batched mesh with vertex colours (toon), the dam water a transparent decal out of the outline pass. */
export function buildBridges(ctx, parent, plan, opts = {}) {
  const group = new THREE.Group(); group.name = 'tauride-bridges';
  const geo = (g) => { const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(g.pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(g.nrm, 3)); bg.setAttribute('color', new THREE.BufferAttribute(g.col, 3)); bg.setIndex(new THREE.BufferAttribute(g.idx, 1)); bg.computeBoundingBox(); bg.computeBoundingSphere(); return bg; };
  const mesh = new THREE.Mesh(geo(plan.geometry), ctx.mat.toon('#ffffff', { vertexColors: true, paint: 0.03, name: 'tauride-bridges' }));
  mesh.name = 'tauride-bridges'; mesh.castShadow = true; mesh.receiveShadow = true; ctx.noBatch(mesh); group.add(mesh);
  let waterMesh = null;
  if (plan.water.triangles) {
    waterMesh = new THREE.Mesh(geo(plan.water), ctx.mat.decal('#ffffff', { vertexColors: true, transparent: true, opacity: DESIGN.DAM.sheet.opacity, name: 'tauride-dam-water', side: 'double' }));
    waterMesh.name = 'tauride-dam-water'; waterMesh.renderOrder = 2; waterMesh.castShadow = false; waterMesh.receiveShadow = false; ctx.noBatch(waterMesh); ctx.noOutline(waterMesh); group.add(waterMesh);
  }
  parent.add(group); group.updateMatrixWorld(true);
  for (const m of group.children) registerLOD(m, 1500);
  const ph = opts.physics || ctx.physics; let n = 0;
  if (ph) for (const c of plan.colliders) { if (c.kind === 'ramp') ph.addWalkRamp(c.cx, c.cz, c.w, c.d, c.rot, c.yA, c.yB, c.thick); else ph.addBox(c.cx, c.cz, c.w, c.d, c.rot, c.y0, c.y1); n++; }
  // the rails: breakable bays (a top and a mid tube, a post per bay, the iron X of the arch / flat bridges), a collider each (0.5 m thick, from 1 m under the deck to 1.3 m over it: R.collider*), one knock record each
  let railN = 0;
  if (plan.railBays && plan.railBays.length && ph) {

    const RR = (opts.design && opts.design.RAIL) || DESIGN.RAIL, T = ctx.mat.toon, colors = [...new Set(plan.railBays.map((q) => q.color))], parts = [];
    const tube = (r) => new THREE.CylinderGeometry(r, r, 1, 4, 1).rotateZ(Math.PI / 2).translate(0.5, 0, 0);
    const xg = new THREE.BufferGeometry(), px = [], ix = [];
    for (const [ya, yb] of [[0.12, RR.midH - 0.04], [RR.midH - 0.04, 0.12]]) { const k = px.length / 3; px.push(0, ya, 0, 1, yb, 0, 1, yb + 0.05, 0, 0, ya + 0.05, 0); ix.push(k, k + 1, k + 2, k, k + 2, k + 3); }
    xg.setAttribute('position', new THREE.Float32BufferAttribute(px, 3)); xg.setIndex(ix); xg.computeVertexNormals();
    for (const col of colors) {
      const m = T(col, { paint: 0.03, name: 'tauride-bridge-rail-' + col }), md = T(col, { paint: 0.03, side: 'double', name: 'tauride-bridge-rail-x-' + col });
      parts.push({ geo: tube(RR.railW / 2), mat: m, name: 'top', far: 320, stretch: true, y: (q) => q.railH, when: (q) => q.color === col });
      parts.push({ geo: tube(RR.railW * 0.4), mat: m, name: 'mid', far: 320, stretch: true, y: RR.midH, when: (q) => q.color === col });
      parts.push({ geo: new THREE.BoxGeometry(RR.postW, 1, RR.postW).translate(0, 0.5, 0), mat: m, name: 'post', far: 320, at: 'end', y: -0.05, sy: (q) => q.railH + 0.05, when: (q) => q.color === col });
      parts.push({ geo: new THREE.BoxGeometry(RR.postW, 1, RR.postW).translate(0, 0.5, 0), mat: m, name: 'post0', far: 320, at: 'start', y: -0.05, sy: (q) => q.railH + 0.05, when: (q) => q.color === col && q.first });
      parts.push({ geo: xg, mat: md, name: 'lattice', far: 240, stretch: true, noOutline: true, when: (q) => q.color === col && q.iron });
    }
    const r = knockBays(ctx, { name: 'tauride-bridge-rail', bays: plan.railBays, parts, far: 320,
      collider: (q) => ({ y0: Math.min(q.y, q.ye) - RR.colliderBelow, y1: Math.max(q.y, q.ye) + RR.colliderAbove, thick: RR.colliderThick, off: RR.colliderThick / 2 * 0, e0: 0.3, e1: 0.3 }),
      rec: () => ({ kind: 'fence', mass: 120, h: 1.0, r: 0.06, anchored: 12, hitK: 0.25, metal: true, minDv: 0 }) });
    railN = r.items.filter(Boolean).length; n += railN;
  }
  return { group, mesh, waterMesh, triangles: plan.geometry.triangles + plan.water.triangles, draws: group.children.length, colliders: n, railBays: railN };
}

export { DAM_DATA };
