// landmarksH/thunder_rock.js - the Thunder Stone (Грозовой камень) of the Bronze Horseman, modelled as a signed distance field and polygonised with surface nets (so the prow
// really overhangs a scooped trough, which a height field cannot do).  Frame of the statue: local +z = towards the Neva (the prow), x = the horse's LEFT, origin on the statue axis, y = 0 ground.
// Dossier docs/research/admiralty-stisaac.md section 6.2; photos refs/admiralty 056 057 059 060 063 066 (the side views 057 / 060 give the profile: a flat crest 5.0 m above the ground carrying the
// hooves, a broad prow whose upper lip overhangs a deep scoop and curves round both flanks, a long rear ramp falling to a rounded tail, steep faceted flanks with crisp diagonal ridges).
//   body   = smooth intersection of a flank wedge (half width falls with height), the crest profile yt(z), the front profile zf(y) (lip + scoop + foot bulge) and the ground;
//   detail = ~24 chisel planes cut into the body (flat facets with crisp creases), a few dents, low noise; the crest stays flat so the hooves sit on it (rockH());
//   panels = two flat windows on the flanks carry the inscriptions (Russian on x < 0, Latin on x > 0): the field is exactly planar there, the text quad lies 2.5 cm above the plane.
// Review pass (2026-10-04): the rear ramp is longer (tail end at z = -8.2, ~12.5 m in all, photos 057 060), ~30 large crisp split planes + 11 flutes / scoops + saw-wave weathering ribs on the rear flanks; the cuts fade out
// towards the ground (smooth flared foot); the shading normal is the smooth body normal (a toon band edge on 10-cm facets broke the grazing flank into speckles) and the facets / scoops are BAKED into the vertex tint
// (fixed light from the left-rear + cavity darkening); the winding is the one the surface nets produce (the old per-triangle gradient test left see-through holes); grids FM (macro) / FB (body) give the normals cheaply.
// Offline test: node tools/landmarksH-rock.mjs (triangles, ms); node tools/landmarksH-statue.mjs (bronze group).
// Granite = the speckled rapakivi map of horseman.js + vertex tints (#C2AA98 lit / #A98F80 shade, a darker pinker lower-front block, dark fissures).
import * as THREE from 'three';

const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const smax = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };
export const PLATEAU = 5.0;

/** monotone cubic interpolation through knots [[t, v], ...] (flat where the data is flat) */
function mono(K) {
  const n = K.length, h = [], d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) { h[i] = K[i + 1][0] - K[i][0]; d[i] = (K[i + 1][1] - K[i][1]) / h[i]; }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  const f = (x) => {
    if (x <= K[0][0]) return K[0][1]; if (x >= K[n - 1][0]) return K[n - 1][1];
    let i = 0; while (K[i + 1][0] < x) i++;
    const t = (x - K[i][0]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * K[i][1] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * K[i + 1][1] + (t3 - t2) * h[i] * m[i + 1];
  };
  f.d = (x) => (f(x + 0.02) - f(x - 0.02)) / 0.04;
  return f;
}
const WZ = mono([[-8.0, 0.15], [-7.1, 0.9], [-5.9, 1.75], [-4.5, 2.5], [-2.9, 3.05], [-1.2, 3.42], [0.6, 3.5], [2.0, 3.35], [3.0, 3.0], [3.7, 2.4], [4.15, 1.2]]);       // half width at the ground
const YT = mono([[-8.2, -0.3], [-7.8, 0.1], [-6.8, 0.9], [-5.6, 1.9], [-4.2, 3.0], [-2.8, 3.95], [-1.4, 4.65], [-0.5, 4.93], [0, PLATEAU], [2.3, PLATEAU], [3.2, 4.92], [4.0, 4.7]]);  // crest height along the rock
const ZF = mono([[-0.5, 4.15], [0.3, 4.05], [1.0, 3.85], [1.8, 3.45], [2.6, 3.05], [3.3, 2.85], [3.8, 3.0], [4.1, 3.6], [4.3, 3.98], [5.6, 4.0]]);           // front face z(y): foot bulge, scoop, lip
const SLOPE_Y = (z) => Math.hypot(1, YT.d(z)), SLOPE_Z = (y) => Math.hypot(1, ZF.d(y));

/** body field from precomputed lookups: ax = |x|, wz = ground half width at z, yt = crest at z, isy = 1 / slope scale of yt, zf / isz = front profile at y, gy = flank profile at y, cc = plan rounding at y */
function bodyF(ax, y, z, wz, yt, isy, zf, isz, gy, cc) {
  const fx = (ax - wz * gy) * 0.95;
  const fy = (y - yt) * isy;
  const q = ax / 2.2, fz = (z - zf + cc * q * q) * isz;
  let f = smax(fx, fy, 0.34);
  f = smax(f, fz, 0.3);
  return Math.max(f, -0.3 - y);
}
const GYK = mono([[-0.5, 1.0], [0, 1.0], [1.5, 0.97], [2.5, 0.88], [3.5, 0.72], [4.3, 0.58], [5.0, 0.5], [5.6, 0.48]]);
const gyOf = (y) => GYK(y);
const ccOf = (y) => 0.5 - 0.38 * ss(2.8, 4.4, y);
function body(x, y, z) {
  const xs = x - 0.18 * Math.sin(0.5 * z + 1.0) * ss(0.5, 3.5, y);
  return bodyF(Math.abs(xs), y, z, WZ(z), YT(z), 1 / SLOPE_Y(z), ZF(y), 1 / SLOPE_Z(y), gyOf(y), ccOf(y));
}
const grad = (f, x, y, z, e = 0.03) => {
  const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
  return [gx / (2 * e), gy / (2 * e), gz / (2 * e)];
};
const snap = (f, p, it = 4) => {
  for (let i = 0; i < it; i++) { const g = grad(f, p[0], p[1], p[2]), l2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2] || 1, v = f(p[0], p[1], p[2]); p = [p[0] - v * g[0] / l2, p[1] - v * g[1] / l2, p[2] - v * g[2] / l2]; }
  return p;
};

// ------------------------------------------------------------------------------------------------ chisel facets: [x0, y0, z0, depth, tx, ty, tz] (a point near the surface, how deep the plane cuts, tilt added to the surface normal)
const FACET_SPECS = [
  [-2.0, 4.3, 2.6, 0.12, -0.1, 0.25, 0.35], [-2.4, 3.4, 0.2, 0.2, 0.0, 0.45, 0.1], [-3.0, 1.8, -1.5, 0.2, 0.0, 0.3, 0.3], [-3.2, 1.0, 1.8, 0.15, -0.2, 0.2, -0.3], [-2.0, 3.2, -3.0, 0.15, 0.0, 0.3, -0.35],
  [2.0, 4.2, 1.6, 0.12, 0.1, 0.25, -0.3], [2.5, 3.2, -0.4, 0.2, 0.0, 0.4, 0.15], [2.9, 1.9, 1.2, 0.2, 0.0, 0.3, -0.3], [3.2, 1.0, -1.8, 0.15, 0.2, 0.2, 0.3], [1.9, 3.0, -3.3, 0.15, 0.0, 0.3, 0.35],
  [0.5, 3.5, -3.9, 0.12, 0.3, 0.2, 0.2], [-0.8, 2.2, -4.8, 0.12, -0.3, 0.2, 0.2], [0.9, 4.8, 3.4, 0.1, 0.3, 0.0, 0.4], [-0.9, 0.9, 3.8, 0.12, -0.3, -0.1, 0.1], [1.3, 1.0, 3.7, 0.12, 0.3, -0.1, 0.1],
  // large crisp planes (the split faces of the real boulder: photos 057 060 066); depth 0.3-0.6 m, strongly tilted along the slope of the ramp
  [3.0, 2.6, -1.2, 0.5, 0.25, 0.8, -0.55], [3.3, 1.4, -3.2, 0.45, 0.3, 0.7, -0.5], [2.4, 3.6, -4.6, 0.4, 0.15, 0.6, -0.7], [3.0, 3.9, 2.0, 0.4, 0.4, 0.7, 0.3], [3.3, 0.8, 0.8, 0.4, 0.5, -0.5, -0.4],
  [-3.0, 2.4, -1.8, 0.5, -0.25, 0.8, -0.55], [-3.3, 1.2, -3.8, 0.45, -0.3, 0.7, -0.5], [-2.2, 3.4, -5.4, 0.4, -0.15, 0.6, -0.7], [-3.0, 3.8, 1.4, 0.4, -0.4, 0.7, 0.3], [-3.3, 0.9, 1.0, 0.4, -0.5, -0.5, -0.4],
  [0.0, 2.2, -6.3, 0.4, 0.3, 0.5, -0.3], [1.2, 1.2, -6.4, 0.35, 0.5, 0.2, -0.5], [-1.3, 1.0, -5.8, 0.35, -0.5, 0.2, -0.5], [1.0, 3.2, -4.0, 0.3, 0.8, 0.2, 0.0], [-1.1, 2.9, -3.6, 0.3, -0.8, 0.2, 0.0],
];
const DENTS = [
  // flutes and conchoidal scoops of the lower flanks / foot (photos 060 066)
  [2.8, 0.9, 2.2, 0.8, 0.45, 1.3, 0.34], [3.0, 1.7, 1.2, 0.8, 0.4, 1.2, 0.3], [2.9, 0.7, -0.2, 0.8, 0.45, 1.4, 0.28], [3.1, 1.3, -2.4, 0.9, 0.7, 1.2, 0.36], [3.0, 2.1, -4.3, 0.9, 0.6, 1.3, 0.3],
  [-2.8, 0.8, 2.0, 0.8, 0.45, 1.3, 0.32], [-3.0, 1.6, 0.9, 0.8, 0.4, 1.2, 0.3], [-2.9, 0.8, -0.8, 0.8, 0.45, 1.4, 0.26], [-3.1, 1.2, -2.8, 0.9, 0.7, 1.2, 0.34], [-2.9, 2.2, -5.0, 0.9, 0.6, 1.3, 0.3],
  [2.55, 3.5, -1.9, 1.0, 0.85, 1.5, 0.28], [-2.5, 3.3, -2.3, 1.0, 0.8, 1.4, 0.26], [2.9, 1.7, 1.9, 0.8, 0.8, 1.2, 0.2], [-2.8, 1.9, 0.6, 0.8, 0.8, 1.3, 0.2], [0.0, 3.4, 3.9, 1.5, 0.45, 0.9, 0.12], [1.9, 3.1, 3.3, 0.8, 0.8, 0.9, 0.1], [-1.9, 3.1, 3.3, 0.8, 0.8, 0.9, 0.1]];
let FACETS = null;
function initFacets() {
  FACETS = FACET_SPECS.map(([x0, y0, z0, depth, tx, ty, tz]) => {
    const p = snap(body, [x0, y0, z0]), g = grad(body, p[0], p[1], p[2]), l = Math.hypot(g[0], g[1], g[2]) || 1, nb = [g[0] / l, g[1] / l, g[2] / l];
    const n = [nb[0] + tx, nb[1] + ty, nb[2] + tz], nl = Math.hypot(n[0], n[1], n[2]); n[0] /= nl; n[1] /= nl; n[2] /= nl;
    const c = [p[0] - nb[0] * depth, p[1] - nb[1] * depth, p[2] - nb[2] * depth];
    return { n, d: n[0] * c[0] + n[1] * c[1] + n[2] * c[2] };
  });
}

/** the two inscription panels, planes through a flank point (filled in by initPanels): side 'ru' on x < 0, 'la' on x > 0 */
export const PANELS = [
  { id: 'ru', sgn: -1, cz: -0.55, y0: 3.9, w: 1.75, h: 0.78 },
  { id: 'la', sgn: 1, cz: 0.95, y0: 4.0, w: 1.5, h: 0.68 },
];
function initPanels() {
  for (const p of PANELS) {
    // surface point of the body on the horizontal line (y0, cz): bisect along x
    let a = 0.5 * p.sgn, b = 5 * p.sgn;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (body(m, p.y0, p.cz) < 0) a = m; else b = m; }
    const x = a, g = grad(body, x, p.y0, p.cz), l = Math.hypot(g[0], g[1]);
    const nx = g[0] / l, ny = g[1] / l;                                                         // plane normal: the flank normal without its z part
    p.nx = nx; p.ny = ny;
    p.tx = ny * p.sgn; p.ty = -nx * p.sgn;                                                      // up-slope tangent (y > 0)
    if (p.ty < 0) { p.tx = -p.tx; p.ty = -p.ty; }
    // chord plane: it touches the lowest body point of the window, so the panel is a flat cut into the rock (never a bulge)
    let dmin = 1e9;
    for (let iu = -2; iu <= 2; iu++) for (let iz = -2; iz <= 2; iz++) {
      const u = iu * (p.h / 2 + 0.15) / 2, zz = p.cz + iz * (p.w / 2 + 0.15) / 2, q0 = [x + p.tx * u, p.y0 + p.ty * u];
      let a2 = -1.2, b2 = 1.2;                                                                 // bisect along the normal for the body surface
      for (let i = 0; i < 30; i++) { const m = (a2 + b2) / 2; if (body(q0[0] + nx * m, q0[1] + ny * m, zz) < 0) a2 = m; else b2 = m; }
      dmin = Math.min(dmin, (q0[0] + nx * a2) * nx + (q0[1] + ny * a2) * ny);
    }
    p.dmin = dmin; const off = dmin - (x * nx + p.y0 * ny); p.cx = x + nx * off; p.cy = p.y0 + ny * off; p.uc = p.cx * p.tx + p.cy * p.ty;
  }
}
const panelPlane = (p, x, y) => x * p.nx + y * p.ny - p.dmin;                         // signed distance to the panel plane (positive outside)
const panelWin = (p, x, y, z) => {
  const dz = Math.abs(z - p.cz), du = Math.abs(x * p.tx + y * p.ty - p.uc);
  const w = (1 - ss(p.w / 2 + 0.12, p.w / 2 + 0.75, dz)) * (1 - ss(p.h / 2 + 0.12, p.h / 2 + 0.7, du));
  return w * (1 - ss(0.5, 1.1, Math.abs(panelPlane(p, x, y))));
};

/** weathering ribs of the rear flanks (photo 066): an asymmetric saw wave across the descent direction of the ramp, crisp ridges 8-12 cm high, period ~0.9 m */
function ribs(x, y, z) {
  const ax = Math.abs(x), w = ss(1.2, 2.4, ax) * ss(1.2, -0.6, z) * ss(0.5, 1.4, y) * ss(4.6, 3.6, y) * ss(-7.4, -5.6, z);
  if (w <= 0) return 0;
  const sg = x < 0 ? 1.3 : 0, s = (0.482 * z - 0.876 * y) / (0.95 + 0.12 * Math.sin(0.7 * z + sg)) + 0.35 * Math.sin(0.8 * z + 1.7 * y + sg) + sg;
  const u = s - Math.floor(s), v = u < 0.82 ? u / 0.82 : (1 - u) / 0.18;
  return 0.1 * (v - 0.5) * w;
}

// ------------------------------------------------------------------------------------------------ the full field
const nz3 = (x, y, z) => 0.5 * Math.sin(1.3 * x + 1.7 * y + 0.7) * Math.sin(1.5 * z - 1.2 * y + 1.3) + 0.2 * Math.sin(2.9 * x - 2.1 * z + 1.4 * y);
let OUT_F = 0, OUT_M = 0;
/** the detailed field at a point.  Fills OUT_F (full: planes, dents, ribs, noise) and OUT_M (macro: the same without ribs / noise, whose gradient is the shading normal) */
function detailBoth(x, y, z, fb) {
  let f = fb;
  if (globalThis.__rockNoDetail) { OUT_F = OUT_M = f; return; }
  for (const t of FACETS) { const pl = t.n[0] * x + t.n[1] * y + t.n[2] * z - t.d; if (pl > f - 0.05) f = smax(f, pl, 0.05); }
  for (const d of DENTS) {
    const dx = (x - d[0]) / d[3], dy = (y - d[1]) / d[4], dz = (z - d[2]) / d[5], r = dx * dx + dy * dy + dz * dz;
    if (r < 6) f += d[6] * Math.exp(-r * 1.1);                                                  // a shallow dent: the surface moves inward by up to d[6]
  }
  const wy = ss(0.1, 1.5, y), sw = (1 - ss(0.9, 1.5, Math.abs(x))) * ss(-1.8, -1.3, z) * (1 - ss(1.3, 1.9, z));
  const fin = (g) => {
    for (const p of PANELS) { const w = panelWin(p, x, y, z); if (w > 0) g = g * (1 - w) + smax(g, panelPlane(p, x, y), 0.02) * w; }   // the panels are exactly flat
    if (wy < 1) g = fb + (g - fb) * wy;                  // the foot flares out: the cuts fade towards the ground (a deep plane cut left an overhanging ledge, a dark band, round the base)
    if (sw > 0) g += (fb - g) * sw;                      // the flat seat of the hooves keeps the plain body
    return g;
  };
  OUT_M = fin(f);
  OUT_F = fin(f + 0.012 * nz3(x, y, z) * (0.35 + 0.65 * ss(4.9, 4.2, y)) + ribs(x, y, z));
}
function detail(x, y, z, f, micro = true) { detailBoth(x, y, z, f); return micro ? OUT_F : OUT_M; }
const BAND = 0.62;
let READY = false;
function ensure() { if (!READY) { initFacets(); initPanels(); READY = true; } }
/** the same field without the micro relief (ribs, noise): its gradient is the shading normal */
export function macroF(x, y, z) {
  ensure();
  const fb = body(x, y, z);
  const f = Math.abs(fb) < BAND ? detail(x, y, z, fb, false) : fb;
  return Math.max(f, y - PLATEAU);
}
export function rockF(x, y, z) {
  ensure();
  const fb = body(x, y, z);
  const f = Math.abs(fb) < BAND ? detail(x, y, z, fb) : fb;
  return Math.max(f, y - PLATEAU);
}
/** surface height of the rock at (x, z): the first crossing below y = 6 (hooves, tail tip and the snake follow it) */
export function rockH(x, z) {
  let y = 5.6; while (y > 0 && rockF(x, y, z) > 0) y -= 0.1;
  if (y <= 0) return 0.1;
  let a = y, b = y + 0.1; for (let i = 0; i < 24; i++) { const m = (a + b) / 2; if (rockF(x, m, z) < 0) a = m; else b = m; }
  return a;
}

// ------------------------------------------------------------------------------------------------ surface nets
function surfaceNets(F, nx, ny, nz, X0, Y0, Z0, h, field) {
  const sx = nx + 1, sy = ny + 1, at = (i, j, k) => i + sx * (j + sy * k);
  const cell = new Int32Array(nx * ny * nz).fill(-1), pos = [];
  const cid = (i, j, k) => i + nx * (j + ny * k);
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const val = F[at(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))]; v[c] = val; if (val < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let px = 0, py = 0, pz = 0, n = 0;
    for (const [a, b] of E) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      const ax = a & 1, ay = (a >> 1) & 1, az = (a >> 2) & 1, bx = b & 1, by = (b >> 1) & 1, bz = (b >> 2) & 1;
      px += ax + (bx - ax) * t; py += ay + (by - ay) * t; pz += az + (bz - az) * t; n++;
    }
    cell[cid(i, j, k)] = pos.length / 3;
    pos.push(X0 + (i + px / n) * h, Y0 + (j + py / n) * h, Z0 + (k + pz / n) * h);
  }
  // project the vertices onto the zero set (exact on the flat panels and the crest)
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2], e = 0.04, v0 = field(x, y, z);
    const gx = (field(x + e, y, z) - v0) / e, gy = (field(x, y + e, z) - v0) / e, gz = (field(x, y, z + e) - v0) / e, l = Math.hypot(gx, gy, gz);
    if (l < 1e-3) continue;
    const st = Math.max(-0.7 * h, Math.min(0.7 * h, v0 / l));
    pos[i] = x - st * gx / l; pos[i + 1] = y - st * gy / l; pos[i + 2] = z - st * gz / l;
  }
  const idx = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++) {
    const p0 = F[at(i, j, k)] < 0;
    // x edge (i,j,k)-(i+1,j,k): cells (i,j-1,k-1) (i,j,k-1) (i,j,k) (i,j-1,k)
    if (i < nx && p0 !== (F[at(i + 1, j, k)] < 0)) quad(cell[cid(i, j - 1, k - 1)], cell[cid(i, j, k - 1)], cell[cid(i, j, k)], cell[cid(i, j - 1, k)], p0);
    if (j < ny && p0 !== (F[at(i, j + 1, k)] < 0)) quad(cell[cid(i - 1, j, k - 1)], cell[cid(i - 1, j, k)], cell[cid(i, j, k)], cell[cid(i, j, k - 1)], p0);
    if (k < nz && p0 !== (F[at(i, j, k + 1)] < 0)) quad(cell[cid(i - 1, j - 1, k)], cell[cid(i, j - 1, k)], cell[cid(i, j, k)], cell[cid(i - 1, j, k)], p0);
  }
  return { pos, idx };
}

/** vertex tint of the granite (multiplies the speckle map): smooth colour patches, a pinker darker lower-front block, darker foot, ambient occlusion in the scoop */
function tintAt(x, y, z, nyv) {
  const n = 0.5 * Math.sin(1.3 * x + 0.7 * z + 2) * Math.sin(0.9 * z - 1.1 * x + 0.5) + 0.25 * Math.sin(3.1 * x + 2.3 * z) + 0.12 * Math.sin(7.3 * x - 5.1 * z + y);
  let k = 0.9 + 0.07 * n, r = k * 1.02, g = k * 0.995, b = k * 0.965;
  const f = ss(2.4, 3.0, z + 0.25 * Math.sin(x * 1.6)) * (1 - ss(2.4, 3.5, y));
  r *= 1 - 0.03 * f; g *= 1 - 0.1 * f; b *= 1 - 0.08 * f; const dk = 1 - 0.06 * f; r *= dk; g *= dk; b *= dk;
  const ao = 0.86 + 0.14 * ss(0.0, 1.0, y); r *= ao; g *= ao; b *= ao;
  // under the lip (the scooped trough) is in shadow
  const sc = ss(2.9, 3.4, z) * ss(4.3, 3.6, y) * ss(1.6, 0.6, Math.abs(x)) * (nyv < 0.3 ? 1 : 0.4); r *= 1 - 0.12 * sc; g *= 1 - 0.12 * sc; b *= 1 - 0.1 * sc;
  return [Math.min(1, r), Math.min(1, g), Math.min(1, b)];
}

/** Builds the rock as ONE smooth-shaded geometry with vertex tints (toon material with the granite map and vertexColors) plus the panel quads (through P).  Returns { geo, tris }.  ins = { ru, la } decal materials. */
export function buildRock(P, gran, ins) {
  const T0 = performance.now(); ensure();
  const h = 0.14, X0 = -4.0, Y0 = -0.4, Z0 = -8.6, nx = 58, ny = 41, nz = 93;
  const sx = nx + 1, sy = ny + 1, F = new Float32Array(sx * sy * (nz + 1)), FM = new Float32Array(F.length), FB = new Float32Array(F.length);
  // slices of the lookups so the grid fill is cheap
  const WZs = new Float32Array(nz + 1), YTs = new Float32Array(nz + 1), ISY = new Float32Array(nz + 1);
  for (let k = 0; k <= nz; k++) { const z = Z0 + k * h; WZs[k] = WZ(z); YTs[k] = YT(z); ISY[k] = 1 / SLOPE_Y(z); }
  const ZFs = new Float32Array(ny + 1), ISZ = new Float32Array(ny + 1), GY = new Float32Array(ny + 1), CC = new Float32Array(ny + 1);
  for (let j = 0; j <= ny; j++) { const y = Y0 + j * h; ZFs[j] = ZF(y); ISZ[j] = 1 / SLOPE_Z(y); GY[j] = gyOf(y); CC[j] = ccOf(y); }
  for (let k = 0; k <= nz; k++) { const z = Z0 + k * h;
    for (let j = 0; j <= ny; j++) { const y = Y0 + j * h, skew = 0.18 * Math.sin(0.5 * z + 1.0) * ss(0.5, 3.5, y);
      for (let i = 0; i <= nx; i++) {
        const x = X0 + i * h, fb = bodyF(Math.abs(x - skew), y, z, WZs[k], YTs[k], ISY[k], ZFs[j], ISZ[j], GY[j], CC[j]);
        const n = i + sx * (j + sy * k), yp = y - PLATEAU;
        if (Math.abs(fb) < BAND) { detailBoth(x, y, z, fb); F[n] = Math.max(OUT_F, yp); FM[n] = Math.max(OUT_M, yp); } else { F[n] = FM[n] = Math.max(fb, yp); }
        FB[n] = fb;
      } } }
  const T1 = performance.now();
  const sn = surfaceNets(F, nx, ny, nz, X0, Y0, Z0, h, rockF);
  const T2 = performance.now();
  const nv = sn.pos.length / 3, pos = new Float32Array(sn.pos), nrm = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const samp = (G, x, y, z) => {                                                                          // trilinear sample of a grid field
    const fx = (x - X0) / h, fy = (y - Y0) / h, fz = (z - Z0) / h;
    const i = Math.max(0, Math.min(nx - 1, Math.floor(fx))), j = Math.max(0, Math.min(ny - 1, Math.floor(fy))), k = Math.max(0, Math.min(nz - 1, Math.floor(fz)));
    const u = fx - i, v = fy - j, w = fz - k, o = i + sx * (j + sy * k), o1 = o + sx * sy;
    const a0 = G[o] + (G[o + 1] - G[o]) * u, a1 = G[o + sx] + (G[o + sx + 1] - G[o + sx]) * u, b0 = G[o1] + (G[o1 + 1] - G[o1]) * u, b1 = G[o1 + sx] + (G[o1 + sx + 1] - G[o1 + sx]) * u;
    return (a0 + (a1 - a0) * v) * (1 - w) + (b0 + (b1 - b0) * v) * w;
  };
  const grd = (G, x, y, z, e) => [samp(G, x + e, y, z) - samp(G, x - e, y, z), samp(G, x, y + e, z) - samp(G, x, y - e, z), samp(G, x, y, z + e) - samp(G, x, y, z - e)];
  for (let i = 0; i < nv; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    // shading normal = mostly the gradient of the smooth body, plus a part of the macro field (big planes, scoops, no ribs / noise): the toon bands would otherwise break the grazing flank into isolated lit pixels at every 10-cm ridge
    const m = grd(FM, x, y, z, 0.1), ml = Math.hypot(m[0], m[1], m[2]) || 1, bq = grd(FB, x, y, z, 0.2), hl = Math.hypot(bq[0], bq[1], bq[2]) || 1;
    let gx = 0.88 * bq[0] / hl + 0.12 * m[0] / ml, gy = 0.88 * bq[1] / hl + 0.12 * m[1] / ml, gz = 0.88 * bq[2] / hl + 0.12 * m[2] / ml; const gl = Math.hypot(gx, gy, gz) || 1; gx /= gl; gy /= gl; gz /= gl;
    nrm[i * 3] = gx; nrm[i * 3 + 1] = gy; nrm[i * 3 + 2] = gz;
    const dx0 = m[0] / ml, dy0 = m[1] / ml, dz0 = m[2] / ml;                                              // the facets are BAKED into the vertex tint (a fixed light from the left-rear, painted look): lit by the toon bands they flickered
    const lam = 0.62 * dx0 + 0.6 * dy0 - 0.5 * dz0, cav = Math.max(0, Math.min(1, (0.4 - samp(FM, x + dx0 * 0.4, y + dy0 * 0.4, z + dz0 * 0.4)) / 0.4)), c = tintAt(x, y, z, gy), sh = (0.86 + 0.4 * Math.max(-0.75, Math.min(0.8, lam))) * (1 - 0.32 * cav * ss(0.4, 1.2, y)); col[i * 3] = c[0] * sh; col[i * 3 + 1] = c[1] * sh; col[i * 3 + 2] = c[2] * sh;
    let u, v; if (gy > 0.62) { u = x; v = z; } else if (Math.abs(gx) > Math.abs(gz)) { u = z; v = y; } else { u = x; v = y; }
    uv[i * 2] = u / 3.4; uv[i * 2 + 1] = v / 3.4;
  }
  if (globalThis.__rockTime) console.log('fill', (T1 - T0).toFixed(0), 'nets', (T2 - T1).toFixed(0), 'attrs', (performance.now() - T2).toFixed(0));
  // winding: surfaceNets() produces ONE consistent winding for the whole closed surface (measured: 99.6 % of the triangles disagree with the outward field gradient, the other 0.4 % are
  // noise of the numeric gradient at creases), so it is reversed for every triangle: a per-triangle gradient test turned slivers inside out and left see-through holes in the flanks
  const idx = [];
  for (let t = 0; t < sn.idx.length; t += 3) {
    const a = sn.idx[t], b = sn.idx[t + 1], c = sn.idx[t + 2];
    if (a === b || b === c || a === c) continue;
    idx.push(a, c, b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  let tris = idx.length / 3;
  // inscription quads on the flat panels
  for (const p of PANELS) {
    const c = [p.cx + p.nx * 0.025, p.cy + p.ny * 0.025, p.cz], zr = p.sgn < 0 ? 1 : -1;                // text runs towards +z on the right flank, towards -z on the left flank
    const pt = (sz, sv) => [c[0] + p.tx * sv * p.h / 2, c[1] + p.ty * sv * p.h / 2, c[2] + zr * sz * p.w / 2];
    P.quad(ins[p.id], pt(-1, -1), pt(1, -1), pt(1, 1), pt(-1, 1), [p.nx, p.ny, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    tris += 2;
  }
  return { geo, tris };
}

/** planar uv by dominant normal axis, for geometry added outside the field */
export function rockUV(g) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ny = n.getY(i), nxv = n.getX(i), nzv = n.getZ(i);
    let u, v; if (ny > 0.62) { u = x; v = z; } else if (Math.abs(nxv) > Math.abs(nzv)) { u = z; v = y; } else { u = x; v = y; }
    uv[i * 2] = u / 3.4; uv[i * 2 + 1] = v / 3.4;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
