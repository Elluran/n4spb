// landmarksTauride/ponds.js - the WATER of the Tauride Garden (docs/TAURIDE-REMAKE.md, phase T4a): the water surface at the one level of the datum table, the impassable shore (colliders) and the numbers the tests read.
// Everything is DERIVED from data/ponds.js (the single datum table: water level, beds, bank top, collider tops and contour) and data/water.js (the union outline of the two ponds and the canals, 3 island holes).
// The bowls and the banks themselves are not built here: they are the ground (height.js is the profile, terrain-mesh.js samples it into the garden floor, ground-material.js paints the wet band and the bed).
//   planPonds(o)    PURE: { water: { pos, idx, nrm, area, triangles, holes }, colliders: [{ cx, cz, w, d, rot, y0, y1, len }], stats }
//   buildPonds(ctx, parent, plan, opts)  the water mesh (waterMaterial of environment/water.js, LOOK key 'tauride-pond', one draw, never batched, out of the outline pass) + the shore colliders on ctx.physics
// The colliders: physics.js blocks a walker whose feet + STEP_HEIGHT (0.45) is below the top of a box, at every feet height down to the box's bottom: the top (data COLLIDER.top) is far above the contour's feet + 0.45, so a
// walker (or a jump from the crest: apex +0.73) cannot step or hop over it, and the bottom is below the bed so that nobody can slip under it either. The old module's trap (a 0.22 m box that ignored a walker at y = 0 and
// blocked one at feet -1.4) is NOT reproduced: the box stands INLAND of the shore on the contour where the bank is at COLLIDER.contourY, so nobody ever stands in the water in the first place.
// BRIDGES ARE T4b: `gaps` (a list of { x, z, r }) removes the colliders that start within r m of a deck head; T4a passes none, so the 8 bridge ways cross a closed shore until the decks exist.
import * as THREE from 'three';
import { waterMaterial } from '../environment/water.js';
import { WATER_UNION } from './data/water.js';
import * as PONDS from './data/ponds.js';
import { pondProfile } from './height.js';

/** the bank slope (1 : s) at a point, from the table */
const slopeOf = (P) => pondProfile(P).slopeAt;

/** the distance d (m) from the shore, on the land side, at which the bank profile stands at height y (the quadratic ease of the land side; y within WATER_Y .. BANK_TOP) at slope 1 : s */
export function landOffsetAt(y, s, P = PONDS) {
  const k = (y - P.WATER_Y) / (P.BANK_TOP - P.WATER_Y);
  if (!(k >= 0 && k < 1)) throw new Error('landOffsetAt: y ' + y + ' is not on the bank (' + P.WATER_Y + ' .. ' + P.BANK_TOP + ')');
  return 2 * (P.BANK_TOP - P.WATER_Y) * s * (1 - Math.sqrt(1 - k));
}

/** the rings of a union as lists of [x, z] vertices (consecutive duplicates removed), with the side of the land: sg = +1 when the land normal is rotate(-90) of the edge, as shoreSegments computes it */
function ringsOf(union) {
  const out = [];
  for (const p of union) { out.push({ r: p.o, hole: false }); for (const h of p.h || []) out.push({ r: h, hole: true }); }
  return out.map(({ r, hole }) => {
    const v = []; for (let i = 0; i < r.length; i += 2) { const q = v[v.length - 1]; if (!q || Math.hypot(r[i] - q[0], r[i + 1] - q[1]) > 1e-6) v.push([r[i], r[i + 1]]); }
    if (v.length > 1 && Math.hypot(v[0][0] - v[v.length - 1][0], v[0][1] - v[v.length - 1][1]) <= 1e-6) v.pop();
    let area = 0; for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length]; area += a[0] * b[1] - b[0] * a[1]; }
    return { v, hole, sg: (area > 0 ? 1 : -1) * (hole ? 1 : -1) };
  });
}

/** The contour ring at the land distance d(x, z) from a shore ring: every vertex moved along the mitre of the two land normals (the mitre length capped at 3 d). Returns [[x, z], ...] */
function offsetRing(ring, dAt) {
  const { v, sg } = ring, m = v.length, nrm = [];
  for (let i = 0; i < m; i++) { const a = v[i], b = v[(i + 1) % m], ex = b[0] - a[0], ez = b[1] - a[1], l = Math.hypot(ex, ez) || 1; nrm.push([-ez / l * sg, ex / l * sg]); }
  return v.map((p, i) => {
    const n1 = nrm[(i + m - 1) % m], n2 = nrm[i], k = Math.max(1 + n1[0] * n2[0] + n1[1] * n2[1], 1 / 9), d = dAt(p[0], p[1]);
    return [p[0] + d * (n1[0] + n2[0]) / k, p[1] + d * (n1[1] + n2[1]) / k];
  });
}

/** greedy polyline simplification of a CLOSED ring of points: from a vertex extend the chord while every skipped vertex stays within `tol` of it and the chord is at most `maxLen` long. Returns the chain of points [[x, z], ...] (closed implicitly). */
function simplifyClosed(pts, tol, maxLen) {
  const n = pts.length, out = [];
  const dev = (a, b, p) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); };
  let i = 0;
  while (i < n) {
    out.push(pts[i]);
    let j = i + 1;
    while (j + 1 <= n) {                                   // try to reach vertex j + 1
      const a = pts[i], b = pts[(j + 1) % n]; let ok = Math.hypot(b[0] - a[0], b[1] - a[1]) <= maxLen;
      for (let k = i + 1; ok && k <= j; k++) if (dev(a, b, pts[k % n]) > tol) ok = false;
      if (!ok) break;
      j++;
    }
    i = j;
  }
  return out;
}

/**
 * The plan of the ponds (pure, deterministic).
 *   o.union (data/water.js WATER_UNION), o.ponds (a datum table), o.gaps ([{ x, z, r }]: no collider starts within r of it; T4b), o.slopeAt (the bank slope function, default the table's)
 * water: the surface at P.WATER_Y over the union with its holes (earcut), counter-clockwise seen from above (normal +y); area = the sum of the triangle areas.
 * colliders: boxes along the contour ring at P.COLLIDER.contourY, inland of the shore, merged (chord tolerance, maximum length), each { cx, cz, w (thickness), d (length), rot, y0, y1, len }.
 */
export function planPonds(o = {}) {
  const P = o.ponds || PONDS, union = o.union || WATER_UNION, slopeAt = o.slopeAt || slopeOf(P), C = P.COLLIDER, gaps = o.gaps || [];
  // ---- the water surface
  const pos = [], idx = []; let area = 0, holes = 0;
  for (const poly of union) {
    const flat = []; const rings = [poly.o, ...(poly.h || [])];
    for (const r of rings) for (let i = 0; i < r.length; i += 2) flat.push(new THREE.Vector2(r[i], r[i + 1]));
    const contour = flat.slice(0, poly.o.length / 2), hs = []; let at = poly.o.length / 2;
    for (const h of poly.h || []) { hs.push(flat.slice(at, at + h.length / 2)); at += h.length / 2; holes++; }
    const faces = THREE.ShapeUtils.triangulateShape(contour, hs), base = pos.length / 3;
    for (const p of flat) pos.push(p.x, P.WATER_Y, p.y);
    for (const f of faces) {
      let [a, b, c] = f; const A = flat[a], B = flat[b], Cc = flat[c];
      const cr = (B.x - A.x) * (Cc.y - A.y) - (B.y - A.y) * (Cc.x - A.x);       // z-component of the cross product in the (x, z) plane; the normal y of (B - A) x (C - A) is -cr
      if (cr > 0) { const t = b; b = c; c = t; }                                  // make the winding such that the face normal points up
      idx.push(base + a, base + b, base + c); area += Math.abs(cr) / 2;
    }
  }
  const nrm = new Float32Array(pos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  const water = { pos: Float32Array.from(pos), nrm, idx: Uint32Array.from(idx), area, triangles: idx.length / 3, holes, y: P.WATER_Y };
  // ---- the colliders
  const colliders = []; let chords = 0;
  for (const ring of ringsOf(union)) {
    const contour = offsetRing(ring, (x, z) => landOffsetAt(C.contourY, slopeAt(x, z), P)), chain = simplifyClosed(contour, C.chord, C.maxLen), m = chain.length;
    // the land side of the chain: the same land normal as the ring, from the chord itself
    for (let i = 0; i < m; i++) {
      const a = chain[i], b = chain[(i + 1) % m], ex = b[0] - a[0], ez = b[1] - a[1], len = Math.hypot(ex, ez); if (len < 1e-3) continue;
      const nx = -ez / len * ring.sg, nz = ex / len * ring.sg;                    // toward the land
      const mx = (a[0] + b[0]) / 2 + nx * C.thick / 2, mz = (a[1] + b[1]) / 2 + nz * C.thick / 2;
      chords++;
      if (gaps.some((g) => Math.hypot(a[0] - g.x, a[1] - g.z) < g.r || Math.hypot(b[0] - g.x, b[1] - g.z) < g.r || Math.hypot(mx - g.x, mz - g.z) < g.r)) continue;
      colliders.push({ cx: mx, cz: mz, w: C.thick, d: len + 2 * C.gap, rot: Math.atan2(ex, ez), y0: C.y0, y1: C.top, len });
    }
  }
  const shoreM = colliders.reduce((s, c) => s + c.len, 0);
  return { water, colliders, stats: { waterTriangles: water.triangles, waterArea: water.area, holes, colliders: colliders.length, chords, colliderLengthM: shoreM, y: P.WATER_Y, top: C.top, contourY: C.contourY } };
}

/** The material of the pond water: waterMaterial of environment/water.js with the LOOK key of the datum table, no wall shadow and no bridge zones, plus the duckweed mat of the Small Pond (a patch of the fragment shader: the key is the only edit of environment/water.js) */
export function pondMaterial(ctx, field, P = PONDS) {
  const m = waterMaterial(ctx, field, { key: P.WATER_LOOK_KEY, wallH: 0, cut: false, zones: [] });
  const S = P.SMALL_POND;
  m.uniforms.uSmall = { value: new THREE.Vector4(S.mouthZ, S.eastX, S.blendZ, S.blendX) };
  m.uniforms.uDuck = { value: new THREE.Vector2(P.DUCKWEED.band, P.DUCKWEED.cover) };
  const fs = m.fragmentShader;
  const withUniforms = fs.replace('varying vec3 vW;', 'varying vec3 vW; uniform vec4 uSmall; uniform vec2 uDuck;');
  const mat = `
        // the duckweed mat of the Small Pond (T4a): green flecks on the water within uDuck.x metres of the bank (the distance field of the field mask), patchy
        float smallW = 1.0 - smoothstep(uSmall.x, uSmall.x + uSmall.z, vW.z) * smoothstep(uSmall.y - uSmall.w, uSmall.y, vW.x);
        float bankK = 1.0 - smoothstep(0.4, uDuck.x, dsh);
        float dwn = vn(vW.xz * 0.7) * 0.55 + vn(vW.xz * 2.3 + 9.0) * 0.45;
        float weed = smoothstep(0.38, 0.62, dwn + 0.30 * bankK - 0.12) * bankK * smallW * uDuck.y;
        col = mix(col, vec3(0.36, 0.52, 0.17) * mix(1.0, 0.42, uNight), weed * 0.8);
        `;
  if (!withUniforms.includes('gl_FragColor = vec4(col, 1.0);') || withUniforms === fs) throw new Error('ponds.js pondMaterial: the fragment shader of environment/water.js changed (cannot place the duckweed)');
  m.fragmentShader = withUniforms.replace('gl_FragColor = vec4(col, 1.0);', mat + 'gl_FragColor = vec4(col, 1.0);');
  m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4;           // the Small Pond is 5 cm deep: the surface must win against the bed on any depth buffer
  m.name = 'tauride-pond-water';
  return m;
}

/** The meshes and colliders of a plan. opts.field = the environment's field (the water shader reads its distance atlas for the shallow tint and the duckweed band), opts.physics (default ctx.physics), opts.ponds (a table). Returns { mesh, triangles, draws, colliders, buildMs }. */
export function buildPonds(ctx, parent, plan, opts = {}) {
  const t0 = performance.now(), P = opts.ponds || PONDS, W = plan.water;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(W.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(W.nrm, 3)); g.setIndex(new THREE.BufferAttribute(W.idx, 1));
  g.computeBoundingBox(); g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, pondMaterial(ctx, opts.field ?? ctx.services?.environment?.field ?? null, P));
  mesh.name = 'tauride-pond-water'; mesh.receiveShadow = false; mesh.castShadow = false; mesh.renderOrder = 1;
  ctx.noBatch(mesh); ctx.noOutline(mesh); parent.add(mesh);
  const ph = opts.physics || ctx.physics; let n = 0;
  if (ph) for (const c of plan.colliders) { ph.addBox(c.cx, c.cz, c.w, c.d, c.rot, c.y0, c.y1); n++; }
  return { mesh, triangles: W.triangles, draws: 1, colliders: n, buildMs: performance.now() - t0 };
}
