// environment/water.js - the water of every waterway: Fontanka (surface y = -3.2), Griboedov Canal (-2.9), Moika (-3.0), Winter Canal (-3.1), Swan Canal (-2.8) and the Neva (-3.4),
// each between its granite quay walls, plus the continuations beyond the data and the Neva to the horizon (river.js waterCuts).
// Toon water shader, adapted from the Yakutsk lake: deep body with large soft patches and short wind chop, sky reflection in four painted steps (stronger at grazing angles), drifting
// ripple iso-lines, a light edge line along the walls (stained olive-brown instead), WALL SHADOW computed from the sun direction (uSunDir), the nearest bank (gradient of the signed-
// distance texture of field.js) and the wall height, so the strip under a wall is olive / dark teal exactly where the real water is shaded (docs/research/fontanka.md: sunlit deep blue
// #27507f with short chop, in shade olive-brown #4a4a37 + dark teal #22404a; west-canals-bridges.md 6.3: canals olive-brown to slate, the Neva #1f3f78-#26509a under a blue sky), foam
// at the cutwaters of the Anichkov Bridge, darkening under every bridge deck (BRIDGE_ZONES: a tunnel-like soffit shadow, the Blue Bridge is 97 m long) and a low-sun glitter sheet.
// `ctx.noOutline`, never merged. One mesh (and one material) per waterway, each at its own water level. The mesh is the water cut into the ground grid (16 m cells over the data, growing
// outward: no giant triangles, the shader uses world positions) and clipped against the SAME convex pieces as the ground holes, so its edge IS the quay line.
import * as THREE from 'three';
import { axisFor } from './ground.js';
import { subtractConvex, bucketCuts } from './clip.js';
import { waterCuts, parkPonds, POND_Y, bridgeZones } from './river.js';
import { inIslands } from './islands.js';      // (owner A) the ground of the round-2 islands outside every older play rectangle
import { triangulateRing } from './clip.js';
import { registerLOD, FAR_L_LOW, RANGE_AUDIT } from '../../core/spatial.js';
import * as L from '../layout.js';
import { WATERWAYS, BRIDGE_ZONES, BRIDGE_SHADES } from './waterways.js';
import { DIST_ATLAS_GLSL, distanceUniforms } from './distance-atlas.js';

/** the cutwaters of the Anichkov Bridge piers (x of the pier axes, z of the up- / downstream tips): the bridge owner may publish better numbers in services.landmarksC.bridge */
function foamPoints(ctx) {
  const b = ctx.services && ctx.services.landmarksC && ctx.services.landmarksC.bridge;
  if (b && Array.isArray(b.cutwaters) && b.cutwaters.length) return b.cutwaters.slice(0, 4).map((c) => [c.x, c.z]);
  const cx = -442.5, cz = -92.2;
  return [[cx - 9, cz - 19], [cx - 9, cz + 19], [cx + 9, cz - 19], [cx + 9, cz + 19]];
}

/** look of each waterway: [deep, mid, shallow(near the walls), shade (in the wall shadow), shade teal, chop scale] */
const LOOK = {
  fontanka: ['#163a62', '#26527f', '#4d6d62', '#3d4637', '#22404a', 1.0],
  griboedov: ['#1b3a52', '#2c5272', '#4a5a48', '#3a4232', '#21383e', 1.15],
  moika: ['#1b3a58', '#2b5478', '#4a5c52', '#3a4434', '#22393f', 1.1],
  'winter-canal': ['#1a3752', '#2a4f70', '#485a48', '#38402f', '#20363c', 1.2],
  kryukov: ['#1b3a52', '#2c5272', '#4a5a48', '#3a4232', '#21383e', 1.15],
  admiralty: ['#1d3a52', '#2d5270', '#4a5c4a', '#3a4432', '#22393f', 1.2],
  'nh-inner': ['#1d3a52', '#2d5270', '#4a5c4a', '#3a4432', '#22393f', 1.2],
  moat: ['#1d3a52', '#2d5270', '#4a5c4a', '#3a4432', '#22393f', 1.3],
  'swan-canal': ['#1d3a52', '#2d5270', '#4a5c4a', '#3a4432', '#22393f', 1.2],
  neva: ['#17356e', '#26509a', '#3c6a88', '#3a4a52', '#22404e', 0.55],
  // the Petrograd side: the Zhdanovka is a quiet arm of the Malaya Neva (the Neva blue, a little greener and choppier), the Kronverk moat a still green-brown ditch
  zhdanovka: ['#1a3866', '#28508c', '#42665e', '#3a4a4a', '#22404a', 0.8],
  karpovka: ['#1a3866', '#28508c', '#42665e', '#3a4a4a', '#22404a', 0.8],
  'kronverk-moat': ['#1f3a4c', '#2f5266', '#4a5c48', '#3a4432', '#22393f', 1.2],
  // Vasilievsky Island: the Smolenka is a murky green-brown canal river, Galerny Harbour and the Shkipersky canal the same, a little bluer, the Kovsh a still basin
  // (close to the Neva / Zhdanovka palette: the Smolenka joins the Malaya Neva without a step and a hard colour edge at the join would show; only the shallows near the banks turn green)
  smolenka: ['#1a3a68', '#2a5690', '#46685c', '#3a4a46', '#22404a', 0.85],
  gavan: ['#1b3b66', '#2b5788', '#46685a', '#3a4a46', '#22404a', 0.9],
  kovsh: ['#1b3b66', '#2b5788', '#46685a', '#3a4a46', '#22404a', 1.0],
};

export function waterMaterial(ctx, field, opts = {}) {
  const C = (c) => new THREE.Color(c);
  const f = field, look = LOOK[opts.key || 'fontanka'], zones = (opts.zones || []).slice(0, 24);
  const br = Array.from({ length: 24 }, (_, i) => { const z = zones[i]; if (!z) return new THREE.Vector4(0, 0, 1, 0); const a = z.axis * Math.PI / 180; return new THREE.Vector4(z.c[0], z.c[1], Math.sin(a), -Math.cos(a)); });
  const brS = Array.from({ length: 24 }, (_, i) => { const z = zones[i]; return z ? new THREE.Vector2(z.w / 2 + 1.0, z.len / 2 + 6) : new THREE.Vector2(-1, -1); });
  const cut = opts.cut === false ? [[1e7, 1e7], [1e7, 1e7], [1e7, 1e7], [1e7, 1e7]] : foamPoints(ctx);
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uDeep: { value: C(look[0]) }, uMid: { value: C(look[1]) }, uShallow: { value: C(look[2]) }, uShade: { value: C(look[3]) }, uShadeTeal: { value: C(look[4]) }, uFoam: { value: C('#e8eef0') },
    uFlow: { value: new THREE.Vector2(0.2, 0.95) }, uChop: { value: look[5] },
    uDist: { value: f ? f.dist.texture : null }, uBox: { value: f ? new THREE.Vector4(f.box.x0, f.box.z0, f.box.x1, f.box.z1) : new THREE.Vector4() },
    uDistInv: { value: f ? new THREE.Vector2(1 / (f.dist.W * f.dist.res), 1 / (f.dist.H * f.dist.res)) : new THREE.Vector2() },
    uWallH: { value: opts.wallH ?? 3.4 }, uHasField: { value: f ? 1 : 0 }, uCut: { value: cut.map((p) => new THREE.Vector2(p[0], p[1])) },
    uBr: { value: br }, uBrS: { value: brS }, uNBr: { value: zones.length },
    uSkyLow: { value: C('#e6e2e4') }, uSkyMid: { value: C('#86b4e6') }, uSkyHigh: { value: C('#3f7fd2') },
  }]);
  // Share the field's canonical texture objects rather than keeping the texture
  // clones made by UniformsUtils.merge; atlas/metadata/palette have one lifetime.
  Object.assign(uniforms, distanceUniforms(f?.dist));
  uniforms.uDist.value = f?.dist.texture || null;
  uniforms.uTime = ctx.shared.uTime; uniforms.uSunDir = ctx.shared.uSunDir; uniforms.uNight = ctx.shared.uNight || { value: 0 };
  if (ctx.shared.uSkyLow) { uniforms.uSkyLow = ctx.shared.uSkyLow; uniforms.uSkyMid = ctx.shared.uSkyMid; uniforms.uSkyHigh = ctx.shared.uSkyTop; }
  const m = new THREE.ShaderMaterial({
    uniforms, fog: true,
    vertexShader: /* glsl */`
      #include <common>
      #include <fog_pars_vertex>
      varying vec3 vW;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime, uNight, uWallH, uHasField, uChop, uNBr; uniform vec3 uSunDir, uDeep, uMid, uShallow, uShade, uShadeTeal, uSkyLow, uSkyMid, uSkyHigh, uFoam; uniform vec2 uFlow;
      uniform sampler2D uDist; uniform vec4 uBox; uniform vec2 uDistInv; uniform vec2 uCut[4]; uniform vec4 uBr[24]; uniform vec2 uBrS[24];
      ${DIST_ATLAS_GLSL}
      varying vec3 vW;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      // the same noise on a WRAPPED lattice (period 251 cells): the hash above multiplies the lattice index by 123 / 456, which eats the float mantissa far from the origin at the high frequencies of the
      // sun glints (z * 8.5 at z -2500 = 9.7 million after the multiply: the hash no longer depends on z) - the glints lined up in straight dotted rows x = const across the Neva of the Petrograd side
      float h21w(vec2 p){ p = mod(p, 251.0); p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
      float vnw(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21w(i), h21w(i + vec2(1, 0)), f.x), mix(h21w(i + vec2(0, 1)), h21w(i + vec2(1, 1)), f.x), f.y); }
      // distance (m) from a water point to the nearest bank; 16 far from any
      float dl(vec2 w){ vec2 q = w - uBox.xy; float raw = distFiltered(q * uDistInv).b * 255.0; return clamp((128.0 - raw) / 8.0, 0.0, 16.0); }
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        vec3 S = normalize(uSunDir);
        float t = uTime;
        float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
        vec2 q = vW.xz - uBox.xy;
        float inside = uHasField * step(0.0, q.x) * step(0.0, q.y) * step(vW.x, uBox.z) * step(vW.z, uBox.w);
        float dsh = mix(16.0, dl(vW.xz), inside);
        vec2 g = vec2(dl(vW.xz + vec2(1.2, 0.0)) - dl(vW.xz - vec2(1.2, 0.0)), dl(vW.xz + vec2(0.0, 1.2)) - dl(vW.xz - vec2(0.0, 1.2)));
        vec2 nb = length(g) > 0.05 ? -normalize(g) : vec2(0.0);                    // toward the nearest bank
        // the quay wall casts its shadow on the water: reach perpendicular to the wall = H * (S.xz . nb) / S.y
        float reach = uWallH * max(dot(S.xz, nb), 0.0) / max(S.y, 0.06);
        float shade = inside * (1.0 - smoothstep(reach - 0.35, reach + 0.35, dsh)) * step(0.01, reach);
        shade = max(shade, uNight * 0.6);
        // calm-to-choppy ripple normal bends the reflection lookup
        vec2 w = vW.xz * vec2(0.34, 0.52) * uChop - uFlow * t * 0.25;
        float rn = vn(w) + 0.5 * vn(w * 2.3 + 5.0);
        vec3 N = normalize(vec3((rn - 0.75) * 0.22, 1.0, (vn(w.yx * 1.7) - 0.5) * 0.26));
        vec3 R = reflect(-V, N);
        vec3 sky = mix(uSkyLow, uSkyMid, smoothstep(0.02, 0.28, R.y));
        sky = mix(sky, uSkyHigh, smoothstep(0.25, 0.8, R.y));
        sky = mix(sky, vec3(1.0, 0.88, 0.7), pow(max(dot(normalize(R), S), 0.0), 6.0) * 0.5);
        // body: large soft patches of deep / mid blue, olive-green near the walls, olive-brown / dark teal in the wall's shade
        float body = vn(vW.xz * 0.012 + 3.0) * 0.6 + vn(vW.xz * 0.06 - uFlow * t * 0.012) * 0.4;
        vec3 col = mix(uDeep, uMid, smoothstep(0.25, 0.8, body));
        col = mix(col, uShallow, (1.0 - smoothstep(0.5, 5.0, dsh)) * 0.45 * inside);
        vec3 shd = mix(uShade, uShadeTeal, smoothstep(0.3, 0.7, vn(vW.xz * 0.05 + 11.0)));
        col = mix(col, shd, shade * 0.85);
        // sky reflection in painted steps, stronger at grazing angles, weaker in the shade
        sky = mix(sky, uDeep, 0.22);
        float k = clamp(0.08 + 0.46 * fres, 0.0, 0.5) * (1.0 - 0.55 * shade);
        k = k + 0.04 * (vn(vW.xz * 0.02 + 7.0) - 0.5);                           // smooth (a quantised k drew visible rings of constant view angle around the camera)
        col = mix(col, sky, k);
        // drifting ripple iso-lines (short chop)
        vec2 q1 = vec2(vW.x * 0.16, vW.z * 0.26) * uChop - uFlow * t * 0.07;
        float n1 = vn(q1 + vec2(0.0, vn(q1 * 0.6 + 3.0) * 1.6));
        float lineA = 1.0 - smoothstep(0.0, 0.03, abs(n1 - 0.5));
        vec2 q2 = vec2(vW.x * 0.42, vW.z * 0.66 + 11.0) * uChop - uFlow * t * 0.16;
        float n2 = vn(q2 + vec2(0.0, vn(q2 * 0.5) * 1.2));
        float lineB = (1.0 - smoothstep(0.0, 0.022, abs(n2 - 0.5))) * 0.8;
        col = mix(col, mix(sky, vec3(1.0), 0.45), clamp(lineA * 0.32 + lineB * 0.32, 0.0, 1.0) * (0.2 + 0.4 * fres) * (1.0 - 0.5 * shade));
        // a thin pale-brown tide line along the wall, wobbling with the chop
        float wob = (vn(vec2(vW.x * 0.6 - t * 0.2, vW.z * 0.6)) - 0.5) * 0.4;
        float edge = (1.0 - smoothstep(0.06, 0.45, dsh + wob)) * (0.55 + 0.45 * vn(vec2(vW.x * 1.3 - t * 0.3, vW.z * 1.1))) * inside;
        col = mix(col, vec3(0.55, 0.52, 0.42), edge * 0.45);
        // white foam round the four cutwaters of the Anichkov Bridge piers: a tail downstream (south), broken by noise
        for (int i = 0; i < 4; i++) {
          vec2 d = (vW.xz - uCut[i]) * vec2(1.0, 0.55);
          float r = length(d);
          float ring = (1.0 - smoothstep(0.0, 0.42, abs(r - 1.5 + 0.15 * sin(t * 1.3 + float(i)) - vn(vW.xz * 1.5 + t * 0.4) * 0.6)));
          float tail = (1.0 - smoothstep(1.0, 7.0, r)) * smoothstep(0.4, 0.7, vn(vW.xz * vec2(1.4, 0.5) - uFlow * t * 0.9));
          col = mix(col, uFoam, clamp(ring * 0.55 + tail * 0.4, 0.0, 1.0) * 0.7);
        }
        // low sun: glitter sheet
        vec2 vd = normalize(-V.xz + 1e-5), sd = normalize(S.xz);
        float toward = pow(max(dot(vd, sd), 0.0), 2.0) * 0.9 + 0.1;
        float sheet = smoothstep(0.9, 0.985, dot(normalize(R), S));
        col += vec3(1.0, 0.88, 0.7) * sheet * 0.26 * (1.0 - uNight) * (1.0 - shade);
        float sp = vnw(vec2(vW.x * 1.9 - t * 0.5, vW.z * 6.2 + t * 0.3)) * vnw(vec2(vW.x * 3.1 + t * 0.4, vW.z * 8.5));
        float glint = smoothstep(0.6, 0.72, sp) * toward * (0.5 + 0.5 * fres) * smoothstep(0.3, 1.6, dsh) * (1.0 - shade);
        col += vec3(1.0, 0.93, 0.8) * glint * 1.1 * (1.0 - 0.7 * uNight);
        // under a bridge deck: nearly black water, soft edge (the deck shadows the water for a few metres beyond its footprint)
        float under = 0.0;
        for (int bi = 0; bi < 24; bi++) {
          if (float(bi) >= uNBr) break;
          vec4 B = uBr[bi]; vec2 BS = uBrS[bi]; vec2 p = vW.xz - B.xy;
          float da = abs(dot(p, B.zw)) - BS.y, dp = abs(dot(p, vec2(-B.w, B.z))) - BS.x;
          under = max(under, 1.0 - smoothstep(0.0, 5.0, max(max(da, dp), 0.0)));
        }
        col = mix(col, col * vec3(0.16, 0.2, 0.26), under);
        col *= mix(1.0, 0.42, uNight);
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
  });
  m.name = 'env-water-' + (opts.key || 'fontanka');
  return m;
}

export function buildWater(ctx, root, field) {
  const T = ctx.THREE || THREE;
  // the water reaches the horizon of the Gulf in the WEST (the ground plane stops at the data box: its grid has no cells west of it): cells growing x1.35 out to x -17.6 km (the camera far plane is 7 km)
  const west = (xs0) => { const lo = [], far = -17600; let r = xs0[0], st = 48; while (r > far) { st = Math.min(st * 1.35, 400); r = Math.max(far, r - st); lo.push(r); } return [...lo.reverse(), ...xs0]; };
  const all = waterCuts(), xs = west(axisFor(field.box.x0, field.box.x1)), zs = axisFor(field.box.z0, field.box.z1), nx = xs.length - 1;
  const out = { bodies: 0, triangles: 0, meshes: [] };
  for (const key of Object.keys(WATERWAYS)) {
    const cutsAll = all.filter((c) => c.key === key && c.kind !== 'slope'); if (!cutsAll.length) continue;
    const cuts = cutsAll.filter((c) => !c.raw), buckets = bucketCuts(cuts, xs, zs), y = WATERWAYS[key].water, P = [];
    let n = 0;
    for (const c of cutsAll) { if (!c.raw) continue; const poly = c.poly; for (let q = 1; q + 1 < poly.length; q++) { for (const v of [poly[0], poly[q + 1], poly[q]]) P.push(v[0], y, v[1]); n++; } }      // the island's open water (Gulf, Neva Bay, Malaya Neva tail): the cut triangles themselves
    for (const [k, list] of buckets) {
      const j = Math.floor(k / nx), i = k - j * nx, xa = xs[i], xb = xs[i + 1], za = zs[j], zb = zs[j + 1];
      for (const c of list) {
        const b = c.box; if (b[1] <= xa || b[0] >= xb || b[3] <= za || b[2] >= zb) continue;
        let poly = [[xa, za], [xb, za], [xb, zb], [xa, zb]];
        // intersect the cell with the convex cut = subtract its complement: clip against every edge (keep the inside)
        for (let e = 0; e < c.poly.length && poly.length >= 3; e++) poly = clipInside(poly, c.poly[e], c.poly[(e + 1) % c.poly.length]);
        if (poly.length < 3) continue;
        for (let q = 1; q + 1 < poly.length; q++) { if (Math.abs((poly[q][0] - poly[0][0]) * (poly[q + 1][1] - poly[0][1]) - (poly[q + 1][0] - poly[0][0]) * (poly[q][1] - poly[0][1])) < 1e-3) continue; for (const v of [poly[0], poly[q + 1], poly[q]]) P.push(v[0], y, v[1]); n++; }
      }
    }
    if (!n) continue;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    const nor = new Float32Array(P.length); for (let q = 1; q < nor.length; q += 3) nor[q] = 1; g.setAttribute('normal', new T.BufferAttribute(nor, 3));
    g.computeBoundingSphere();
    const zones = [...BRIDGE_ZONES.filter((z) => z.key === key && !z.noShade && !(key === 'neva' && z.id === 'palace')), ...BRIDGE_SHADES.filter((z) => z.key === key)];      // (the whole Palace deck replaces the half that the old row shaded)
    const m = new T.Mesh(g, waterMaterial(ctx, field, { key, wallH: WATERWAYS[key].shadeH, zones, cut: key === 'fontanka' }));
    m.name = 'env-water-' + key; m.receiveShadow = false; m.castShadow = false; m.frustumCulled = false; ctx.noBatch(m); ctx.noOutline(m); root.add(m);
    out.bodies++; out.triangles += n; out.meshes.push(m);
  }
  // ---- park ponds (river.js parkPonds: Alexander Park, the Zoo): a still surface POND_Y below the lawn, an earth / grass rim that slopes 1.1 m inward to 0.25 m under the water (mitred strip along the outline and
  // round the island), and a collider along the outer edge (nobody walks on the water)
  const ponds = parkPonds();
  const DECKS = bridgeZones().filter((zn) => zn.petro && zn.deck), deckAt = (x, z) => DECKS.some((zn) => zn.test(x, z, 0.6));
  if (ponds.length) {
    const pondMaterial = waterMaterial(ctx, field, { key: 'kronverk-moat', wallH: 0.4, zones: [], cut: false });
    for (const pd of ponds) {
      const P = [], RP = [], RN = [];
      for (const tri of triangulateRing(pd.o, pd.h)) for (const v of [tri[0], tri[2], tri[1]]) P.push(v[0], POND_Y, v[1]);
      const rings = [[pd.o, 1], ...pd.h.map((h) => [h, -1])];
      for (const [o, sgn] of rings) {
        const m = o.length / 2; let a2 = 0; for (let i = 0; i < m; i++) { const j = (i + 1) % m; a2 += o[i * 2] * o[j * 2 + 1] - o[j * 2] * o[i * 2 + 1]; }
        const side = (a2 > 0 ? 1 : -1) * sgn, nrm = [];            // toward the water: the interior of the outline, the exterior of an island
        for (let i = 0; i < m; i++) { const j = (i + 1) % m, dx = o[j * 2] - o[i * 2], dz = o[j * 2 + 1] - o[i * 2 + 1], l = Math.hypot(dx, dz) || 1; nrm.push([-dz / l * side, dx / l * side]); }
        const low = [];
        for (let i = 0; i < m; i++) { const a = nrm[(i + m - 1) % m], b = nrm[i]; let mx = a[0] + b[0], mz = a[1] + b[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml; const k = Math.min(2.5, 1 / Math.max(0.3, mx * b[0] + mz * b[1])); low.push([o[i * 2] + mx * 1.1 * k, o[i * 2 + 1] + mz * 1.1 * k]); }
        for (let i = 0; i < m; i++) {
          const j = (i + 1) % m, n = nrm[i], A = [o[i * 2], 0.0, o[i * 2 + 1]], B = [o[j * 2], 0.0, o[j * 2 + 1]], C = [low[j][0], POND_Y - 0.25, low[j][1]], D = [low[i][0], POND_Y - 0.25, low[i][1]];
          const quad = side > 0 ? [A, C, B, A, D, C] : [A, B, C, A, C, D];
          for (const v of quad) { RP.push(v[0], v[1], v[2]); RN.push(n[0] * 0.45, 0.89, n[1] * 0.45); }
          if (sgn > 0 && L.inPlay((A[0] + B[0]) / 2, (A[2] + B[2]) / 2, -30)) {
            const dx = B[0] - A[0], dz = B[2] - A[2], l = Math.hypot(dx, dz);
            if (l > 0.05) {
              // (islands 2026-10-14) the outline collider is left out under the deck of a bridge (the island canals, the Yelagin channels: the decks cross water now and a 0.4 m box along the bank would stop the walker on the deck): the edge is cut
              // into pieces outside the deck zones (+ 0.6 m). The older districts keep the whole box.
              const mx = (A[0] + B[0]) / 2, mz = (A[2] + B[2]) / 2, rot = Math.atan2(-dz, dx);
              if (!inIslands(mx, mz) && !inIslands(A[0], A[2]) && !inIslands(B[0], B[2])) ctx.physics.addBox(mx, mz, l + 0.3, 0.4, rot, -2, 1.25);
              else {
                const tx = dx / l, tz = dz / l, st = 0.5, n = Math.max(1, Math.ceil(l / st)); let a0 = null;
                for (let q = 0; q <= n; q++) {
                  const t = Math.min(l, q * st), x = A[0] + tx * t, z = A[2] + tz * t, free = !deckAt(x, z);
                  if (free && a0 === null) a0 = t;
                  if ((!free || q === n) && a0 !== null) { const t1 = free ? t : Math.max(a0, t - st); if (t1 - a0 > 0.05) { const c = (a0 + t1) / 2; ctx.physics.addBox(A[0] + tx * c, A[2] + tz * c, t1 - a0 + (a0 === 0 ? 0.15 : 0) + (t1 === l ? 0.15 : 0), 0.4, rot, -2, 1.25); } a0 = null; }
                }
              }
            }
          }
        }
      }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    const nor = new Float32Array(P.length); for (let q = 1; q < nor.length; q += 3) nor[q] = 1; g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.computeBoundingSphere();
    const pm = new T.Mesh(g, pondMaterial);
    // Transparent ripple water retains per-pond sorting, with conservative
    // bounds for shader displacement. A distant park no longer draws city-wide.
    g.boundingSphere.radius += 1;
    pm.name = 'env-water-pond-' + pd.id; pm.receiveShadow = false; pm.castShadow = false; ctx.noBatch(pm); ctx.noOutline(pm); root.add(pm);
    if (RANGE_AUDIT) { pm.updateWorldMatrix(true, false); registerLOD(pm, FAR_L_LOW); }      // (plan item 1a: a park pond is sub-pixel beyond ~2 km; it drew city-wide. ?lrange=0 = old)
    const gr = new T.BufferGeometry(); gr.setAttribute('position', new T.Float32BufferAttribute(RP, 3)); gr.setAttribute('normal', new T.Float32BufferAttribute(RN, 3)); gr.computeBoundingSphere();
    const rim = new T.Mesh(gr, ctx.mat.toon('#62803f', { paint: 0.05, side: 'double', name: 'env-pond-rim' })); rim.name = 'env-pond-rim'; rim.receiveShadow = true; rim.castShadow = false; ctx.noOutline(rim); root.add(rim);
    out.triangles += P.length / 9 + RP.length / 9;
    }
    out.bodies += ponds.length; out.ponds = ponds.map((pd) => pd.osm);
  }
  return out;
}
import { clipHalf } from './clip.js';
const clipInside = (poly, a, b) => clipHalf(poly, a, b, true);
void subtractConvex;
