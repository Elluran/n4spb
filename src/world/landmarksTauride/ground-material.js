// landmarksTauride/ground-material.js - THE GROUND OF THE TAURIDE GARDEN (docs/TAURIDE-REMAKE.md, phase T3): a garden-owned, painterly toon ground and the mask that drives it.
//   planGroundMask(inputs)       PURE and DETERMINISTIC (no three.js object, no Math.random, nothing committed as a binary): one RGBA8 raster of the garden box at 1 m from the authored zones
//                                (data/ground.js), the relief (gardenHeight), the water outline (data/water.js), the woods, the ways, the benches, the gates and the footprints:
//                                  R  canopy weight        0 open .. 1 deep wood: the shader paints the dim shade fringe below 0.5 and the leaf litter above it (T5 plants the trees that this shade belongs to)
//                                  G  shore                128 = the waterline, +12 per metre on land, -12 per metre in the water (signed distance, +-10.6 m): the muddy shore band, the 0.5 m wet band of T4,
//                                                          and for now the bed of the future ponds
//                                  B  wear                 0 grass .. 1 packed earth: benches, gates, junctions, plazas, the verge of every path, the apron of a building, the playgrounds
//                                  A  mown-stripe code     (block << 5) | weight 0..31: the block picks the stripe direction and period (a uniform table), the weight is the openness of the lawn there
//                                (bilinear for R, G, B; the code is read NEAREST with texelFetch: it is categorical).
//   gardenGroundMaterial(ctx, ..)  the toon material with its own onBeforeCompile (the pattern of environment/ground.js: ONE category per pixel from noise fields, cel-hard edges, no repeating
//                                  texture, no blur): lawn (the ground's own four greens, clover patches, mown stripes), litter under the canopy, mud and the wet band at the shore, worn and packed earth, and the
//                                  RELIEF read from the vertex normal and the height: darker and greener on the flanks, lit side / shade side (the REAL sun; from 90 to 280 m the soft term turns into three cel tones with a
//                                  warm lit and a cool shade side so that the hills read from the aerials: reliefTone is the JS port the tests use), drier crowns, a contour tone drawn at any distance while a band
//                                  is at least ~6 px wide. polygonOffset +2 like the environment's ground
//                                  (everything above the ground at 0.02 .. 0.12 m keeps winning over it), no vertex colour, the far fog of the environment (FAR_FOG) and the melt to the mean colour at distance.
// The garden terrain (terrain-mesh.js) covers the WHOLE garden polygon and the environment ground is cut out there (HOOKS.groundHoles), so this is the only ground inside the fence.
import * as THREE from 'three';
import { FAR_FOG } from '../environment/farconf.js';
import { MEADOWS, CANOPY_BELT, WORN_SPOTS, WORN_GREEN_IDS, GROUND_TUNING } from './data/ground.js';
import * as PONDS from './data/ponds.js';

export const GROUND = Object.freeze({ res: 1, pad: 3, shoreLevels: 12, maxStripeBlocks: 8, noiseSize: 128 });
/** The look numbers that the shader text carries as constants (DESIGN values; QA round 1 of T3 moved them): where the litter starts in the canopy weight (litA .. litB: it used to start at the edge of a wood, 0.48 .. 0.58,
 *  and the noise of the belt tipped it into litter), the dim of the shade fringe, the opacity of worn earth, the gain and amplitude of the hill's light and shade side, the crown tone and the contour tone. */
export const LOOK = Object.freeze({
  litA: 0.62, litB: 0.78, shadeDim: 0.88, wornOpacity: 0.78, shadeGain: 5.0, shadeAmp: 0.42, crown: 0.38, contour: 0.09, jitter: 0.8,
  // QA round 2 of T3 (the hills at 250-480 m were soft dark smudges): the relief is read with the REAL sun (sun = layout.SUN_DIR, x and z, to the light; ctx.sunDir replaces it) and from farA to farB metres the
  // soft shading turns into three cel tones (shade / flat / lit, the engine's own crisp light-and-shadow split) whose steps are celLo..celHi in the shading term, with the amplitude farAmp, the warm lit side and the
  // cool shade side (warm / cool), a crown lifted by farCrown, the lawn's own patchwork calmed by the melt (meltA..meltB, meltK: the hills must not compete with it) before the relief is applied.
  sun: Object.freeze([-0.473, 0.526]), farA: 90, farB: 280, gainFar: 10.0, cel: 0.45, celLo: 0.10, celHi: 0.45, farAmp: 0.40, farCrown: 0.9, flankFar: 0.7, farContour: 0.3,
  warm: Object.freeze([0.06, 0.04, -0.07]), cool: Object.freeze([-0.07, -0.02, 0.06]), meltA: 100, meltB: 520, meltK: 0.45,
});
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const V3 = (a) => 'vec3(' + a.map((v) => v.toFixed(2)).join(', ') + ')';
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** integer cell hash -> [0, 1) (deterministic) */
function hash2(ix, iz, seed = 0) { let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967296; }

// ------------------------------------------------------------------------------------------------ the mask (pure)
/**
 * inputs: { garden: ring, woods: [{ o, h }], water: [{ o, h }], paths: [{ id, cls, w, pts }], benches: [{ x, z }], gates: [{ x, z }], monuments: [{ x, z }], footprints: [ring], playRings: [{ o, h }],
 *           gh: (x, z) => number | null (the relief), zones: { meadows, belt, worn, tuning } (default: data/ground.js) }
 * -> { box: { x0, z0, x1, z1, W, H, res }, data: Uint8Array(W * H * 4), stats }
 */
export function planGroundMask(inp, T = GROUND) {
  const t0 = Date.now();
  const Zn = inp.zones || {}, MEAD = Zn.meadows || MEADOWS, BELT = Zn.belt || CANOPY_BELT, WORN = Zn.worn || WORN_SPOTS, TU = { ...GROUND_TUNING, ...(Zn.tuning || {}) };
  if (MEAD.length > T.maxStripeBlocks) throw new Error(`planGroundMask: ${MEAD.length} stripe blocks, the shader table holds ${T.maxStripeBlocks}`);
  const ring = inp.garden;
  let gx0 = Infinity, gx1 = -Infinity, gz0 = Infinity, gz1 = -Infinity;
  for (let i = 0; i < ring.length; i += 2) { gx0 = Math.min(gx0, ring[i]); gx1 = Math.max(gx1, ring[i]); gz0 = Math.min(gz0, ring[i + 1]); gz1 = Math.max(gz1, ring[i + 1]); }
  const res = T.res, x0 = Math.floor(gx0) - T.pad, z0 = Math.floor(gz0) - T.pad, x1 = Math.ceil(gx1) + T.pad, z1 = Math.ceil(gz1) + T.pad;
  const W = Math.ceil((x1 - x0) / res), H = Math.ceil((z1 - z0) / res), N = W * H;
  const box = { x0, z0, x1: x0 + W * res, z1: z0 + H * res, W, H, res };

  // ---- raster primitives (cell centres at x0 + (i + 0.5) * res)
  /** even-odd scanline fill of rings: fn(j, i0, i1) per run of cell centres inside */
  function fillRings(rings, fn) {
    let zmin = Infinity, zmax = -Infinity;
    for (const r of rings) for (let k = 1; k < r.length; k += 2) { zmin = Math.min(zmin, r[k]); zmax = Math.max(zmax, r[k]); }
    const j0 = Math.max(0, Math.ceil((zmin - z0) / res - 0.5)), j1 = Math.min(H - 1, Math.floor((zmax - z0) / res - 0.5)), xs = [];
    for (let j = j0; j <= j1; j++) {
      const z = z0 + (j + 0.5) * res; xs.length = 0;
      for (const o of rings) for (let a = 0, b = o.length - 2; a < o.length; b = a, a += 2) {
        const za = o[a + 1], zb = o[b + 1];
        if ((za > z) !== (zb > z)) xs.push(o[a] + (z - za) * (o[b] - o[a]) / (zb - za));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const i0 = Math.max(0, Math.ceil((xs[k] - x0) / res - 0.5)), i1 = Math.min(W - 1, Math.floor((xs[k + 1] - x0) / res - 0.5));
        if (i1 >= i0) fn(j, i0, i1);
      }
    }
  }
  /** the cells whose centre lies within m of the segment a-b: fn(k, distance) */
  function nearSeg(ax, az, bx, bz, m, fn) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - m - x0) / res)), i1 = Math.min(W - 1, Math.ceil((Math.max(ax, bx) + m - x0) / res));
    const j0 = Math.max(0, Math.floor((Math.min(az, bz) - m - z0) / res)), j1 = Math.min(H - 1, Math.ceil((Math.max(az, bz) + m - z0) / res));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = x0 + (i + 0.5) * res, pz = z0 + (j + 0.5) * res;
      const t = l2 > 0 ? clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1) : 0, ex = ax + t * dx - px, ez = az + t * dz - pz, d = Math.hypot(ex, ez);
      if (d <= m) fn(j * W + i, d);
    }
  }
  const scrIn = new Uint8Array(N), scrD = new Float32Array(N).fill(99);
  /** the signed distance to a polygon (rings: outer + holes, even-odd; > 0 inside) for every cell inside it or within `margin` of its edge: cb(k, d); deep inside cells get 99 */
  function polySigned(rings, margin, cb) {
    let ax = Infinity, az = Infinity, bx = -Infinity, bz = -Infinity;
    for (const r of rings) for (let i = 0; i < r.length; i += 2) { ax = Math.min(ax, r[i]); bx = Math.max(bx, r[i]); az = Math.min(az, r[i + 1]); bz = Math.max(bz, r[i + 1]); }
    const i0 = Math.max(0, Math.floor((ax - margin - x0) / res)), i1 = Math.min(W - 1, Math.ceil((bx + margin - x0) / res)), j0 = Math.max(0, Math.floor((az - margin - z0) / res)), j1 = Math.min(H - 1, Math.ceil((bz + margin - z0) / res));
    fillRings(rings, (j, a, b) => { for (let i = Math.max(a, i0); i <= Math.min(b, i1); i++) scrIn[j * W + i] = 1; });
    for (const r of rings) for (let e = 0; e < r.length; e += 2) { const f = (e + 2) % r.length; nearSeg(r[e], r[e + 1], r[f], r[f + 1], margin, (k, d) => { if (d < scrD[k]) scrD[k] = d; }); }
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * W + i, d = scrD[k];
      if (scrIn[k]) cb(k, d >= 99 ? 99 : d); else if (d <= margin) cb(k, -d);
      scrIn[k] = 0; scrD[k] = 99;
    }
  }

  // ---- the garden polygon
  const ins = new Uint8Array(N);
  fillRings([ring], (j, a, b) => ins.fill(1, j * W + a, j * W + b + 1));

  // ---- shore: signed distance to the water (R of the shader's "d": + land, - water)
  const shore = new Uint8Array(N).fill(255), dWater = new Float32Array(N).fill(99);      // dWater: + land distance, - water depth (99 = far)
  const SR = (255 - 128) / T.shoreLevels - 0.02;
  for (const w of inp.water || []) polySigned([w.o, ...(w.h || [])], SR, (k, d) => { const v = -d; if (Math.abs(v) < Math.abs(dWater[k])) dWater[k] = v; });
  for (let k = 0; k < N; k++) { const d = dWater[k]; if (d < 99) shore[k] = clamp(Math.round(128 + d * T.shoreLevels), 0, 255); }
  // deep water cells (polySigned gives 99 for "deep inside": the sign must survive): mark them with the lowest byte
  { const deep = new Uint8Array(N); for (const w of inp.water || []) fillRings([w.o, ...(w.h || [])], (j, a, b) => { for (let i = a; i <= b; i++) deep[j * W + i] = 1; }); for (let k = 0; k < N; k++) if (deep[k] && dWater[k] === 99) { shore[k] = 0; dWater[k] = -99; } }

  // ---- canopy: the woods (leaf litter), the authored belt along the fence
  const can = new Float32Array(N);
  const F = TU.canopyFeather;
  for (const w of inp.woods || []) polySigned([w.o, ...(w.h || [])], F * 0.5, (k, d) => { const c = clamp(0.5 + d / F, 0, 1); if (c > can[k]) can[k] = c; });
  let beltCells = 0;
  if (BELT && BELT.k > 0) {
    const dOut = new Float32Array(N).fill(99), reach = BELT.width + BELT.feather + 1;
    for (let e = 0; e < ring.length; e += 2) { const f = (e + 2) % ring.length; nearSeg(ring[e], ring[e + 1], ring[f], ring[f + 1], reach, (k, d) => { if (d < dOut[k]) dOut[k] = d; }); }
    const gates = inp.gates || [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i; if (!ins[k] || dOut[k] >= reach) continue;
      let c = BELT.k * clamp((BELT.width - dOut[k]) / BELT.feather + 0.5, 0, 1);
      if (c <= 0) continue;
      const px = x0 + (i + 0.5) * res, pz = z0 + (j + 0.5) * res;
      for (const g of gates) { const dg = Math.hypot(px - g.x, pz - g.z); if (dg < BELT.gateClear + 6) c *= sstep(BELT.gateClear * 0.5, BELT.gateClear + 6, dg); }
      if (c > can[k]) { can[k] = c; beltCells++; }
    }
  }
  for (let k = 0; k < N; k++) { if (!ins[k] || dWater[k] < 0.5) can[k] = 0; }          // no canopy outside the fence or on the water and its first half metre

  // ---- wear
  const wear = new Float32Array(N);
  const bump = (k, v) => { if (v > wear[k]) wear[k] = v; };
  const disc = (x, z, r, kk) => {
    const i0 = Math.max(0, Math.floor((x - r - x0) / res)), i1 = Math.min(W - 1, Math.ceil((x + r - x0) / res)), j0 = Math.max(0, Math.floor((z - r - z0) / res)), j1 = Math.min(H - 1, Math.ceil((z + r - z0) / res));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(x0 + (i + 0.5) * res - x, z0 + (j + 0.5) * res - z); if (d >= r) continue;
      const t = d / r, v = kk * (1 - t * t) * (1 - t * t) * 1.0; bump(j * W + i, v);
    }
  };
  for (const b of inp.benches || []) disc(b.x, b.z, TU.benchR, TU.benchK);
  for (const g of inp.gates || []) disc(g.x, g.z, TU.gateR, TU.gateK);
  for (const m of inp.monuments || []) disc(m.x, m.z, TU.monumentR, TU.monumentK);
  for (const s of WORN) disc(s.x, s.z, s.r, s.k);
  // junctions: a vertex where the ways meet with a degree of three or more (an end counts 1, an inner vertex 2)
  const deg = new Map(), keyOf = (x, z) => Math.round(x * 20) + ',' + Math.round(z * 20);
  let junctions = 0;
  for (const p of inp.paths || []) { if (p.cls === 'bridge') continue; const q = p.pts; for (let i = 0; i < q.length; i += 2) { const k = keyOf(q[i], q[i + 1]), e = deg.get(k) || { x: q[i], z: q[i + 1], n: 0 }; e.n += (i === 0 || i === q.length - 2) ? 1 : 2; deg.set(k, e); } }
  for (const e of deg.values()) if (e.n >= 3) { disc(e.x, e.z, TU.junctionR, TU.junctionK); junctions++; }
  // the worn edge of every path (the ribbon covers its width; the grass beside it is trampled)
  for (const p of inp.paths || []) {
    if (p.cls === 'bridge') continue;
    const hw = p.cls === 'steps' ? 1.1 : (p.w || 2.4) / 2, q = p.pts;
    for (let i = 0; i + 3 < q.length; i += 2) nearSeg(q[i], q[i + 1], q[i + 2], q[i + 3], hw + TU.verge, (k, d) => { const dd = d - hw; bump(k, dd <= 0 ? TU.vergeK : TU.vergeK * (1 - dd / TU.verge)); });
  }
  for (const f of inp.footprints || []) polySigned([f], TU.apron, (k, d) => { if (d < 0) bump(k, TU.apronK * (1 + d / TU.apron)); });
  for (const p of inp.playRings || []) polySigned([p.o, ...(p.h || [])], 1.5, (k, d) => { bump(k, d >= 0 ? 1 : clamp(1 + d / 1.5, 0, 1)); });

  // ---- mown stripes: the weight of the nearest meadow block times the openness of the ground
  const sw = new Float32Array(N), blk = new Uint8Array(N);
  MEAD.forEach((b, bi) => polySigned([b.o], TU.stripeFeather, (k, d) => { const s = clamp(d / TU.stripeFeather, 0, 1); if (s > sw[k]) { sw[k] = s; blk[k] = bi + 1; } }));
  const gh = inp.gh || null;
  let stripeCells = 0, slopeCut = 0;
  const data = new Uint8Array(N * 4);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, o = k * 4;
    data[o + 1] = shore[k];
    if (!ins[k]) continue;
    data[o] = Math.round(can[k] * 255);
    data[o + 2] = Math.round(clamp(wear[k], 0, 1) * 255);
    let s = sw[k];
    if (s > 0) {
      const c = can[k] >= 0.5 ? 0 : 1 - can[k], px = x0 + (i + 0.5) * res, pz = z0 + (j + 0.5) * res;          // no stripe in the territory of the litter
      s *= c * c * clamp(1 - wear[k] * 1.4, 0, 1) * sstep(TU.shoreClear, TU.shoreClear + 1.5, dWater[k]);
      if (gh && s > 0) {
        const h = gh(px, pz);
        if (h !== null && h !== undefined) { const gxp = (gh(px + 0.5, pz) ?? 0) - (gh(px - 0.5, pz) ?? 0), gzp = (gh(px, pz + 0.5) ?? 0) - (gh(px, pz - 0.5) ?? 0), slope = Math.hypot(gxp, gzp); const f = 1 - sstep(0.05, 0.14, slope); if (f < 1) slopeCut++; s *= f; }
      }
      const q = Math.round(clamp(s, 0, 1) * 31);
      if (q > 0) { data[o + 3] = ((blk[k] - 1) << 5) | q; stripeCells++; }
    }
  }
  const cnt = (f) => { let n = 0; for (let k = 0; k < N; k++) if (ins[k] && f(k)) n++; return n; };
  const stats = {
    W, H, bytes: data.length, cells: N, insideCells: cnt(() => true),
    canopyCells: cnt((k) => can[k] >= 0.5), shadeCells: cnt((k) => can[k] >= 0.12 && can[k] < 0.5), beltCells,
    mudCells: cnt((k) => dWater[k] >= 0 && dWater[k] < TU.shoreBand), waterCells: cnt((k) => dWater[k] < 0), wetCells: cnt((k) => dWater[k] >= 0 && dWater[k] < 0.5),
    wornCells: cnt((k) => wear[k] >= 0.5), packedCells: cnt((k) => wear[k] >= 0.8), stripeCells, slopeCut, junctions, ms: Date.now() - t0,
  };
  return { box, data, stats };
}

// ------------------------------------------------------------------------------------------------ the noise tile (deterministic, 128^2 RGBA8, repeating)
/** the bytes of the noise tile: R, G, B smooth patch fields of different seeds (octaves 3 / 6 / 12 / 24 cells over the tile), A fine speckle; the shader samples them at 0.021 .. 6.1 tiles per metre */
export function noiseTileData(N = GROUND.noiseSize) {
  const lat = (f, seed) => {
    const l = new Float32Array(f * f); for (let j = 0; j < f; j++) for (let i = 0; i < f; i++) l[j * f + i] = hash2(i, j, seed);
    const out = new Float32Array(N * N);
    for (let y = 0; y < N; y++) {
      const v = y / N * f, j = Math.floor(v), fy = v - j, sy = fy * fy * (3 - 2 * fy), j1 = (j + 1) % f;
      for (let x = 0; x < N; x++) {
        const u = x / N * f, i = Math.floor(u), fx = u - i, sx = fx * fx * (3 - 2 * fx), i1 = (i + 1) % f;
        const a = l[j * f + i], b = l[j * f + i1], c = l[j1 * f + i], d = l[j1 * f + i1];
        out[y * N + x] = (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
      }
    }
    return out;
  };
  const chan = (octs, seed) => {
    const out = new Float32Array(N * N); let ws = 0;
    for (const [f, w] of octs) { const a = lat(f, seed + f); for (let i = 0; i < out.length; i++) out[i] += a[i] * w; ws += w; }
    let lo = 1, hi = 0; for (let i = 0; i < out.length; i++) { out[i] /= ws; lo = Math.min(lo, out[i]); hi = Math.max(hi, out[i]); }
    const k = 1 / Math.max(1e-6, hi - lo); for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) * k;
    return out;
  };
  const R = chan([[3, 0.46], [6, 0.28], [12, 0.16], [24, 0.10]], 11), G = chan([[3, 0.46], [6, 0.28], [12, 0.16], [24, 0.10]], 71), B = chan([[4, 0.4], [8, 0.3], [16, 0.2], [32, 0.1]], 131), A = chan([[48, 0.6], [24, 0.4]], 5);
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) { data[i * 4] = Math.round(R[i] * 255); data[i * 4 + 1] = Math.round(G[i] * 255); data[i * 4 + 2] = Math.round(B[i] * 255); data[i * 4 + 3] = Math.round(A[i] * 255); }
  return data;
}
/** the noise tile as a texture (repeat, trilinear) */
export function makeNoiseTexture(data = noiseTileData()) {
  const N = Math.round(Math.sqrt(data.length / 4)), tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 2; tex.needsUpdate = true;
  return tex;
}
/** the mask as a texture: RGBA8, bilinear + mipmaps (clamped; the mip chain is the mean mask at distance) */
export function makeMaskTexture(mask) {
  const tex = new THREE.DataTexture(mask.data, mask.box.W, mask.box.H, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.colorSpace = THREE.NoColorSpace; tex.flipY = false; tex.needsUpdate = true;
  return tex;
}

// ------------------------------------------------------------------------------------------------ the relief tone (JS port of the shader's relief term, for the tests)
/** the shader's relief term for a surface that FACES (fx, fz) (the horizontal part of the normal over its y = minus the gradient of the height; its length is the slope) seen from `dist` metres, as a luminance factor
 *  and the cel level: { tone, lvl, hs, farK }. The same numbers as the GLSL below (LOOK is the only source of both; tools/tauride/ground-test.mjs reads the shader text and compares). `light` = the x, z direction to the sun. */
export function reliefTone(fx, fz, dist, light = null, L = LOOK) {
  const lx = light ? light[0] : L.sun[0] / Math.hypot(...L.sun), lz = light ? light[1] : L.sun[1] / Math.hypot(...L.sun);
  const farK = sstep(L.farA, L.farB, dist), sl = sstep(0.010, 0.080, Math.hypot(fx, fz));
  const hs = clamp((fx * lx + fz * lz) * (L.shadeGain + (L.gainFar - L.shadeGain) * farK), -1, 1);
  const lvl = sstep(-L.celHi, -L.celLo, hs) + sstep(L.celLo, L.celHi, hs) - 1, hsc = hs + (lvl - hs) * farK * L.cel;
  const lum = (v) => 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  const flank = 1 + (lum([0.90, 0.95, 0.86]) - 1) * sl * 0.7 * (1 - L.flankFar * farK);
  const tint = 1 + farK * (lum(L.warm) * Math.max(lvl, 0) + lum(L.cool) * Math.max(-lvl, 0));
  return { tone: flank * (1 + (L.shadeAmp + (L.farAmp - L.shadeAmp) * farK) * hsc) * tint, lvl, hs, farK };
}

// ------------------------------------------------------------------------------------------------ the shader
const PRE = /* glsl */`
uniform sampler2D uMask; uniform sampler2D uNoise;
uniform vec4 uMB; uniform vec2 uMS; uniform vec4 uStripe[${GROUND.maxStripeBlocks}]; uniform vec2 uLight; uniform vec2 uFogK;
uniform vec3 uGA; uniform vec3 uGB; uniform vec3 uGC; uniform vec3 uGD; uniform vec3 uClover; uniform vec3 uEarth;
uniform vec3 uLA; uniform vec3 uLB; uniform vec3 uLC; uniform vec3 uLD;
uniform vec3 uMA; uniform vec3 uMB2; uniform vec3 uBed; uniform vec3 uSilt; uniform vec3 uSand; uniform vec3 uWet; uniform vec3 uWA; uniform vec3 uWB; uniform vec3 uWC;
varying vec3 vNW;
vec4 gz(vec2 p, float s) { return texture2D(uNoise, p * s); }
`;

const BODY = /* glsl */`
{
  vec2 P = vPWorld.xz;
  float mpp = max(length(dFdx(P)), length(dFdy(P)));                        // metres per pixel
  float patF = 1.0 - smoothstep(0.012, 0.085, mpp);                         // fine detail fades out with distance (no shimmer)
  vec2 q = (P - uMB.xy) * uMB.zw;
  vec4 M = texture2D(uMask, q);                                              // R canopy, G shore, B wear (bilinear)
  ivec2 tc = ivec2(clamp(floor(q * uMS), vec2(0.0), uMS - 1.0));
  float code = floor(texelFetch(uMask, tc, 0).a * 255.0 + 0.5);              // A: (block << 5) | weight, nearest
  // the clump fields are read in a WARPED domain (a smooth displacement of +-5.5 m with a 52 m period): the tile repeats every 2.7 m at 0.37 per metre, and the thresholds below would show that lattice
  vec4 n1 = gz(P + vec2(23.0, 71.0), 0.021);
  vec2 Pw = P + (gz(P + vec2(17.0, 43.0), 0.019).rg - 0.5) * 11.0;
  vec4 n2 = gz(Pw, 0.083);
  vec4 n3 = gz(vec2(Pw.x * 0.857 - Pw.y * 0.515, Pw.x * 0.515 + Pw.y * 0.857), 0.37);
  vec4 n4 = gz(P, 0.17);
  // The fine field repeats every 0.53 m, and a threshold of it alone prints that lattice (QA round 1: identical stamps in rows on the world axes, 1.000 correlation at the tile lag). Two measures break it
  // (tools/tauride/ground-test.mjs, group 6, measures the correlation of the mark at the lag of the tile): n5 is read in a lightly JITTERED domain (the +-0.4 m of the 5.9 m field n4: neighbouring cells move
  // by different amounts; the big warp of Pw, ten times as wide, would only slide the whole lattice, and a much stronger one streams into feathers), and the second read n6 is turned by 29 degrees and has
  // another period (0.70 m): a mark that needs BOTH fields (the flecks) is the product of two lattices that do not beat into a pattern; nf is the same idea for the soft brightness.
  vec4 n5 = gz(P + (n4.rg - 0.5) * ${LOOK.jitter.toFixed(2)}, 1.9);
  vec4 n6 = gz(vec2(P.x * 0.8746 + P.y * 0.4848, P.y * 0.8746 - P.x * 0.4848) + vec2(37.0, 11.0), 1.43);
  float nf = 0.5 * (n5.r + n6.r);
  // ---- lawn: the ground's own four greens, lighter and darker mown patches, clumps, clover patches, mown stripes
  vec3 cg = mix(uGA, uGB, smoothstep(0.48, 0.66, n2.g));
  cg = mix(cg, uGC, smoothstep(0.62, 0.78, n3.r) * 0.45);
  cg = mix(cg, uGD, smoothstep(0.66, 0.84, n2.r) * 0.35);
  cg *= 0.95 + 0.10 * nf;
  float clo = smoothstep(0.64, 0.72, 0.5 * gz(vec2(Pw.x * 0.857 - Pw.y * 0.515, Pw.x * 0.515 + Pw.y * 0.857), 0.113).g + 0.5 * gz(Pw, 0.071).r);
  cg = mix(cg, uClover * (0.97 + 0.06 * n6.g), clo * 0.4);
  float bIdx = floor(code / 32.0), sW = (code - bIdx * 32.0) / 31.0;
  if (sW > 0.0) {
    vec4 SP = uStripe[int(bIdx)];
    float ph = dot(P, SP.xy) / SP.z + SP.w + (n2.g - 0.5) * 0.3;
    float band = smoothstep(0.36, 0.64, abs(fract(ph) - 0.5) * 2.0);        // soft-edged band, 0 .. 1 across one period
    cg *= 1.0 + sW * (band - 0.5) * 0.19;
  }
  // ---- under the canopy: dim fringe, then leaf litter (dark olive / brown with dry-leaf flecks)
  float cw = M.r + (n2.g - 0.5) * 0.45 + (nf - 0.5) * 0.12;
  float litK = smoothstep(${LOOK.litA.toFixed(3)}, ${LOOK.litB.toFixed(3)}, cw);
  float shadeK = smoothstep(0.10, 0.48, M.r) * (1.0 - litK);
  vec3 cl = mix(uLA, uLB, smoothstep(0.40, 0.70, n2.g));
  cl = mix(cl, uLC, smoothstep(0.62, 0.80, n3.r) * 0.5);
  // dry-leaf flecks: both fine fields at once (no lattice), in patches of a few metres, fewer and softer than before (QA: stamps that read as a printed pattern)
  float fleck = smoothstep(0.58, 0.72, n5.g) * smoothstep(0.44, 0.64, n6.b) * smoothstep(0.30, 0.62, n2.r + (n4.g - 0.5) * 0.5) * patF;
  cl = mix(cl, uLD, fleck * 0.30);
  cl *= 0.94 + 0.12 * nf;
  vec3 col = cg * mix(1.0, ${LOOK.shadeDim.toFixed(3)}, shadeK);
  col = mix(col, cl, litK);
  // ---- the shore (T4a: the ponds are cut into the floor, data/ponds.js): the mud band, the pale sand / silt strip above the wet band, the wet band of the waterline (WET_BAND m) and the bed under the water (mud / silt)
  float d = (M.g * 255.0 - 128.0) / ${GROUND.shoreLevels.toFixed(1)};
  float dn = d + (n3.r - 0.5) * 1.8 + (n6.g - 0.5) * 0.35;
  // T4a fix round 1 (the GPU QA: the bank read as ONE flat dark olive-brown strip with a ruled edge to the grass and an equally hard edge to the water, a mud cut, not turf running down to the water): the bank is now damp TURF (the
  // grass itself, darkened and yellowed toward the water over ~3 m, so its edge to the lawn has no line), the mud is BLOTCHES at the waterline (a threshold of the clump fields, lighter and browner than before, never a continuous band), the pale
  // sand strip is patchy and the wet band is a soft multiply, not a replacement colour; the edges are jittered by the slow fields (n3, n4: +-0.9 m) so that the polygon facets of the shore do not print as ruled lines.
  vec3 mud = mix(uMA, uMB2, smoothstep(0.35, 0.65, n3.g)) * (0.94 + 0.12 * nf);
  float damp = 1.0 - smoothstep(0.1, 3.4, dn + (n2.g - 0.5) * 1.2);
  col = mix(col, col * vec3(0.80, 0.85, 0.62), damp * 0.9);
  float mudN = smoothstep(0.36, 0.66, 0.55 * n2.g + 0.45 * n3.g + (nf - 0.5) * 0.3);
  float mudK = (1.0 - smoothstep(0.4, 2.1, dn)) * mudN * 0.8;
  col = mix(col, mud, mudK);
  float wetK = 1.0 - smoothstep(${(PONDS.WET_BAND - 0.32).toFixed(3)}, ${(PONDS.WET_BAND + 0.12).toFixed(3)}, d + (n4.g - 0.5) * 0.5 + (n3.g - 0.5) * 0.3);       // the wet band along the waterline: darker, WET_BAND m wide, a soft multiply with a jittered edge
  float sandK = (1.0 - smoothstep(${PONDS.WET_BAND.toFixed(3)}, ${(PONDS.WET_BAND + PONDS.SHORE_SAND).toFixed(3)}, d + (n4.g - 0.5) * 0.7 + (n3.g - 0.5) * 0.3)) * (1.0 - wetK) * smoothstep(0.30, 0.62, n2.r + (n4.g - 0.5) * 0.5) * (0.40 + 0.35 * n3.g);
  col = mix(col, uSand * (0.94 + 0.12 * nf), sandK);
  col = mix(col, col * 0.78, wetK * 0.55);
  col = mix(col, uWet * (0.92 + 0.16 * n3.g), wetK * 0.45);
  float inW = 1.0 - smoothstep(-0.35, 0.0, d + (n4.g - 0.5) * 0.25);
  col = mix(col, mix(uBed, uSilt, smoothstep(0.30, 0.70, n3.g)) * (0.90 + 0.20 * n3.g), inW);
  // ---- worn ground: trampled patches, then packed earth (benches, gates, junctions, plazas, the verge of the paths)
  float wn = M.b + (n2.r - 0.5) * 0.5 + (n4.g - 0.5) * 0.18;
  float wornK = smoothstep(0.34, 0.50, wn) * (1.0 - inW);
  float packK = smoothstep(0.72, 0.86, wn) * (1.0 - inW);
  vec3 earth = mix(uWA, uWB, smoothstep(0.35, 0.65, n3.g)) * (0.94 + 0.12 * nf) * mix(1.0, 0.88, litK);
  col = mix(col, earth, wornK * ${LOOK.wornOpacity.toFixed(3)});
  col = mix(col, mix(earth, uWC, 0.5), packK * 0.85);
  // ---- far away the patchwork melts into its mean colour (atmospheric perspective, no shimmer). It melts BEFORE the relief is applied (QA round 2: the relief used to melt with it, and the lawn's own
  //      blotches, the lighter meadows and the darker patches, were as strong as a hill from 250 m up)
  float dist = length(vViewPosition);
  vec3 mean = mix(uGA * 0.97, uLA * 1.05, M.r);
  col = mix(col, mean, max(smoothstep(160.0, 1100.0, dist) * 0.8, smoothstep(${LOOK.meltA.toFixed(1)}, ${LOOK.meltB.toFixed(1)}, dist) * ${LOOK.meltK.toFixed(2)}));
  // ---- the relief, read from above: darker and greener on the flanks, the lit side and the shade side, drier crowns, a faint contour tone
  // (QA round 1: the hills did not read from above, under the litter least of all. The light and shade term follows the SLOPE (0.25 = a slope of 1:4), not 1 - normal.y, which is only 0.01 at
  //  1:7 and so left a hill of 4 m with a few percent of shading; it multiplies the colour AFTER the litter and the wear, so a hill under a wood reads like a hill under a meadow.
  //  QA round 2: the light was a painter's light from the north-west, not the sun (SW: layout.SUN_DIR, which draws the shadows of the buildings), and at 250-480 m the smooth term was a soft dark smudge.
  //  The term now faces the real sun (uLight = to the sun, x z) and from farA to farB it steps into three cel tones, the engine's own crisp light / shade split, with a warm lit and a cool shade side.
  //  gr is the horizontal part of the normal over its y = the direction the surface FACES (minus the gradient of the height), its length the slope: 0.25 = 1:4; + hs = facing the light.)
  vec3 nW = normalize(vNW);
  vec2 gr = nW.xz / max(nW.y, 0.2);
  gr *= 1.0 - 0.55 * (1.0 - smoothstep(1.0, 5.0, d));                                       // T4a fix round 1: the banks (1:3 .. 1:5, the steepest ground of the garden) are turf, not hills: little flank shade within 5 m of the water
  float farK = smoothstep(${LOOK.farA.toFixed(1)}, ${LOOK.farB.toFixed(1)}, dist);
  float sl = smoothstep(0.010, 0.080, length(gr));
  float hs = clamp(dot(gr, uLight) * mix(${LOOK.shadeGain.toFixed(2)}, ${LOOK.gainFar.toFixed(2)}, farK), -1.0, 1.0);
  float lvl = smoothstep(-${LOOK.celHi.toFixed(2)}, -${LOOK.celLo.toFixed(2)}, hs) + smoothstep(${LOOK.celLo.toFixed(2)}, ${LOOK.celHi.toFixed(2)}, hs) - 1.0;
  float hsc = mix(hs, lvl, farK * ${LOOK.cel.toFixed(2)});
  col *= mix(vec3(1.0), vec3(0.90, 0.95, 0.86), sl * 0.7 * (1.0 - ${LOOK.flankFar.toFixed(2)} * farK));
  col *= 1.0 + mix(${LOOK.shadeAmp.toFixed(2)}, ${LOOK.farAmp.toFixed(2)}, farK) * hsc;
  col *= 1.0 + farK * (${V3(LOOK.warm)} * max(lvl, 0.0) + ${V3(LOOK.cool)} * max(-lvl, 0.0));
  float crown = smoothstep(0.5, 3.0, vPWorld.y);
  col = mix(col, col * vec3(1.10, 1.09, 0.93) + vec3(0.03, 0.03, 0.0), crown * ${LOOK.crown.toFixed(2)} * (1.0 + ${LOOK.farCrown.toFixed(2)} * farK) * (1.0 - wornK));
  float cf = 1.0 - smoothstep(0.10, 0.30, fwidth(vPWorld.y) * 1.4);                       // a band is drawn while it is at least ~6 px wide (no moire), at any distance
  col *= 1.0 - ${LOOK.contour.toFixed(2)} * (1.0 + ${LOOK.farContour.toFixed(2)} * farK) * smoothstep(0.50, 0.58, fract(vPWorld.y * 1.4 + n3.g * 0.12)) * sl * cf;
  diffuseColor.rgb = col;
}
`;

const FOG = /* glsl */`
#ifdef USE_FOG
  float efd = min(vFogDepth, uFogK.x) + uFogK.y * max(vFogDepth - uFogK.x, 0.0);
  float fogFactor = 1.0 - exp(-fogDensity * fogDensity * efd * efd);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif
`;

/** the colours of the ground (sRGB hex, converted to the linear working space by THREE.Color): the lawn is the environment ground's own palette, so that the garden and the lawns outside it agree */
export const GROUND_COLORS = Object.freeze({
  uGA: '#5f8a34', uGB: '#78a043', uGC: '#4a7430', uGD: '#8ba84a', uClover: '#74a350', uEarth: '#7a6a50',
  uLA: '#5c7832', uLB: '#6a6e3a', uLC: '#4b6a2c', uLD: '#8b8048',
  uMA: '#6c5b42', uMB2: '#564630', uBed: PONDS.BED_COLORS.mud, uSilt: PONDS.BED_COLORS.silt, uSand: PONDS.BED_COLORS.sand, uWet: PONDS.BED_COLORS.wet, uWA: '#988462', uWB: '#a69370', uWC: '#b4a686',
});

/** the direction TO the sun on the ground plane (x, z), normalised: the engine's own sun (ctx.sunDir = layout.SUN_DIR at the day preset), LOOK.sun when the context has none */
export function sunXZ(ctx) {
  const d = ctx && ctx.sunDir, x = d && Number.isFinite(d.x) ? d.x : LOOK.sun[0], z = d && Number.isFinite(d.z) ? d.z : LOOK.sun[1], l = Math.hypot(x, z) || 1;
  return new THREE.Vector2(x / l, z / l);
}

/** the stripe table of the shader: [normal x, normal z, period, phase] per block (the normal is across the stripes) */
export function stripeTable(meadows = MEADOWS) {
  const out = [];
  for (let i = 0; i < GROUND.maxStripeBlocks; i++) {
    const m = meadows[i];
    if (!m) { out.push(new THREE.Vector4(1, 0, 3, 0)); continue; }
    const a = (m.angle || 0) * Math.PI / 180;
    out.push(new THREE.Vector4(-Math.sin(a), Math.cos(a), m.period || 3.2, hash2(i, 7, 3)));
  }
  return out;
}

/**
 * The garden's ground material: a second ctx.mat.toon (polygonOffset +2 like the environment's ground) with its own onBeforeCompile. Returns { mat, uniforms, maskTexture, noiseTexture }.
 * `noise` (a texture, shared with the path ribbons) defaults to a new tile.
 */
export function gardenGroundMaterial(ctx, mask, noise = null, meadows = MEADOWS) {
  const maskTexture = makeMaskTexture(mask), noiseTexture = noise || makeNoiseTexture(), b = mask.box;
  const mat = ctx.mat.toon('#ffffff', { paint: 0, polygonOffset: 2, name: 'tauride-ground' });
  const prev = mat.onBeforeCompile;
  const U = {
    uMask: { value: maskTexture }, uNoise: { value: noiseTexture },
    uMB: { value: new THREE.Vector4(b.x0, b.z0, 1 / (b.W * b.res), 1 / (b.H * b.res)) }, uMS: { value: new THREE.Vector2(b.W, b.H) },
    uStripe: { value: stripeTable(meadows) }, uLight: { value: sunXZ(ctx) },
    uFogK: { value: new THREE.Vector2(FAR_FOG.D0, FAR_FOG.K) },
  };
  for (const [k, hex] of Object.entries(GROUND_COLORS)) U[k] = { value: new THREE.Color(hex) };
  mat.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(mat, shader, renderer);
    Object.assign(shader.uniforms, U);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vNW;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvNW = normalize(mat3(modelMatrix) * normal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + PRE)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + BODY)
      .replace('#include <fog_fragment>', FOG);
  };
  mat.customProgramCacheKey = () => 'paint|tauride-ground-t4a';
  mat.userData.tauride = 'ground';
  return { mat, uniforms: U, maskTexture, noiseTexture };
}

// ------------------------------------------------------------------------------------------------ the inputs of the mask from the data modules and the North facade
/**
 * Gathers the inputs of planGroundMask from the pure data modules and the facade GREEN records (the woods and the playgrounds are polygons of the facade; the data files list only their ids).
 * `data` = { GARDEN, GARDEN_GREEN, WATER_UNION, PATHS, BENCHES, GATES, MONUMENTS, FOUNTAINS, FOOTPRINTS }, `GREEN` = the facade list, `gh` = gardenHeight.
 */
export function collectGroundInputs(data, GREEN, gh = null) {
  const byId = new Map(); for (const g of GREEN || []) byId.set(g.id, g);
  const woods = [], playRings = [];
  for (const w of data.GARDEN_GREEN.woods) { const g = byId.get(w.id); if (g) for (const p of g.polys) woods.push({ o: p.o, h: p.h || [] }); }
  for (const id of WORN_GREEN_IDS) { const g = byId.get(id); if (g) for (const p of g.polys) playRings.push({ o: p.o, h: p.h || [] }); }
  const footprints = []; for (const f of data.FOOTPRINTS) for (const p of f.polys) footprints.push(p.o);
  return {
    garden: data.GARDEN.o, woods, playRings, footprints, gh,
    water: data.WATER_UNION.map((p) => ({ o: p.o, h: p.h || [] })),
    paths: data.PATHS.map((p) => ({ id: p.id, cls: p.cls, w: p.w, pts: p.pts })),
    benches: data.BENCHES, gates: data.GATES, monuments: [...data.MONUMENTS, ...data.FOUNTAINS],
  };
}
