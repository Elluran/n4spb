// rail/car.js - parametric rolling stock for the Moscow station: one hull builder (side cells merged per colour, recessed windows and door openings, flat
// ends or a streamlined / cab nose, bogies, roof gear) and the livery table of the train families that serve the station:
//   velaro  - Sapsan (Siemens Velaro RUS): white, red nose, blue / red stripes, black windows          (docs/research/station.md section 8, photos 22, 27, 41, 44, 86)
//   desiro  - long-distance "Ласточка": light grey, black window band, red nose
//   coach   - RZD single-deck carriage: grey with red end panels (photo 22 right)
//   dd      - RZD double-deck carriage (photo 43)
//   strela  - "Красная стрела" carriage: carmine with silver stripes (photo 32)
//   ep2k    - electric locomotive ЭП2К: magenta red, white zig-zag, grey skirt, orange nose (photo 28)
//   ep20    - the same body in carmine for the Red Arrow
// Car frame: +Z = toward the car front (the nose), +X = the car's LEFT, y = 0 at the rail top, z = 0 at the car centre. Geometry is non-indexed with per-face vertex colours.
import * as THREE from 'three';

const C = new Map();
const cc = (hex) => { let c = C.get(hex); if (!c) C.set(hex, (c = new THREE.Color(hex))); return c; };

class Acc {
  constructor() { this.p = []; this.n = []; this.c = []; }
  tri(a, b, c, col, na, nb, nc) {
    const k = cc(col);
    const g = normal(a, b, c); na = na || g; nb = nb || g; nc = nc || g;
    const s = [na[0] + nb[0] + nc[0], na[1] + nb[1] + nc[1], na[2] + nb[2] + nc[2]];
    if (g[0] * s[0] + g[1] * s[1] + g[2] * s[2] < 0) { [b, c] = [c, b]; [nb, nc] = [nc, nb]; }
    for (const [v, n] of [[a, na], [b, nb], [c, nc]]) { this.p.push(v[0], v[1], v[2]); this.n.push(n[0], n[1], n[2]); this.c.push(k.r, k.g, k.b); }
  }
  quad(a, b, c, d, col, na, nb, nc, nd) { this.tri(a, b, c, col, na, nb, nc); this.tri(a, c, d, col, na, nc, nd); }
  /** quad with an explicit outward normal n (winding is fixed to agree with it) */
  quadN(a, b, c, d, col, n) { this.quad(a, b, c, d, col, n, n, n, n); }
  box(x0, x1, y0, y1, z0, z1, col) {
    const P = (x, y, z) => [x, y, z];
    this.quadN(P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1), col, [1, 0, 0]);
    this.quadN(P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), P(x0, y0, z0), col, [-1, 0, 0]);
    this.quadN(P(x0, y1, z0), P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), col, [0, 1, 0]);
    this.quadN(P(x0, y0, z1), P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), col, [0, -1, 0]);
    this.quadN(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), col, [0, 0, 1]);
    this.quadN(P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), col, [0, 0, -1]);
  }
  /** cylinder along X (wheels) */
  wheel(cx, cy, cz, r, len, col, seg = 8) {
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      const P = (a, s) => [cx + s * len / 2, cy + Math.cos(a) * r, cz + Math.sin(a) * r];
      const N = (a) => [0, Math.cos(a), Math.sin(a)];
      this.quad(P(a0, -1), P(a1, -1), P(a1, 1), P(a0, 1), col, N(a0), N(a1), N(a1), N(a0));
      this.tri([cx + len / 2, cy, cz], P(a0, 1), P(a1, 1), col, [1, 0, 0], [1, 0, 0], [1, 0, 0]);
      this.tri([cx - len / 2, cy, cz], P(a1, -1), P(a0, -1), col, [-1, 0, 0], [-1, 0, 0], [-1, 0, 0]);
    }
  }
  rod(a, b, r, col) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d);
    const t = d.map((v) => v / L), up = Math.abs(t[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    let s = [t[1] * up[2] - t[2] * up[1], t[2] * up[0] - t[0] * up[2], t[0] * up[1] - t[1] * up[0]]; const sl = Math.hypot(...s); s = s.map((v) => v / sl);
    const u = [s[1] * t[2] - s[2] * t[1], s[2] * t[0] - s[0] * t[2], s[0] * t[1] - s[1] * t[0]];
    const c = (p, i, j) => [p[0] + (s[0] * i + u[0] * j) * r, p[1] + (s[1] * i + u[1] * j) * r, p[2] + (s[2] * i + u[2] * j) * r];
    for (const [i0, j0, i1, j1, n] of [[1, 1, 1, -1, s], [-1, -1, -1, 1, s.map((v) => -v)], [-1, 1, 1, 1, u], [1, -1, -1, -1, u.map((v) => -v)]]) this.quadN(c(a, i0, j0), c(a, i1, j1), c(b, i1, j1), c(b, i0, j0), col, n);
  }
  get tris() { return this.p.length / 9; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere();
    return g;
  }
}
function normal(a, b, c) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n) || 1;
  return n.map((x) => x / l);
}

// ------------------------------------------------------------------------------------------------ specs
const GLASS = '#1b222b', GLASS_LIT = '#23303d';
const range = (a, b, step) => { const o = []; for (let v = a; v <= b + 1e-6; v += step) o.push(v); return o; };
const winSpans = (cs, w, doors, dhw) => cs.filter((c) => !doors.some((d) => Math.abs(c - d) < dhw + w / 2 + 0.12)).map((c) => [c - w / 2, c + w / 2]);

/** The car specs. `build` fills in everything derived (windows, doors, colour function). */
const SPEC = {
  velaro: (head) => {
    const L = 25.0, nose = head ? 5.4 : 0;
    const doors = head ? [-6.4, 1.6] : [-6.4, 6.4];
    const spans = winSpans(range(-10.6, head ? 3.0 : 10.6, 1.75), 1.15, doors, 0.65);
    return {
      L, nose, head, doors, doorHW: 0.62, doorY: [1.12, 3.05], win: [{ y0: 1.82, y1: 2.72, spans, pane: 0.05 }],
      prof: [[1.35, 0.40], [1.52, 0.52], [1.635, 0.85], [1.64, 1.10], [1.64, 3.00], [1.59, 3.30], [1.43, 3.62], [1.05, 3.84], [0, 3.93]],
      yBreaks: [1.17, 1.24, 1.82, 2.72],
      color: (y, z) => (y < 0.85 ? '#4d5a6b' : y < 1.10 ? '#2d5aa0' : y < 1.17 ? '#f3f5f7' : y < 1.24 ? '#d63a2f' : y > 3.3 ? '#cfd4d9' : '#f3f5f7'),
      noseCol: (u, y) => (y < 0.85 ? '#4d5a6b' : y < 1.5 ? '#d9452f' : y < 2.2 ? '#d9452f' : (y < 3.3 && Math.abs(u) < 0.84) ? GLASS : y > 3.6 ? '#d4d9de' : '#f3f5f7'),
      noseD: (y) => (y <= 1.0 ? 5.1 : y <= 2.1 ? 5.4 : y <= 3.5 ? 5.4 - (y - 2.1) * 2.1 : Math.max(0.3, (5.4 - 1.4 * 2.1) * Math.sqrt(Math.max(0, 1 - ((y - 3.5) / 0.43) ** 2)))),
      bogies: [-8.6, 8.6 - (head ? 5.6 : 0)], skirt: true, panto: null, ends: '#e6e9ec', gang: '#2f3238', roof: [[-0.8, 0.8, 3.93, 4.2, -2.4, 2.4, '#c4c9ce']],
    };
  },
  desiro: (head) => {
    const L = 22.5, nose = head ? 3.4 : 0;
    const doors = head ? [-5.6, 2.6] : [-5.4, 5.4];
    const spans = winSpans(range(-9.6, head ? 4.5 : 9.6, 1.6), 1.1, doors, 0.65);
    return {
      L, nose, head, doors, doorHW: 0.65, doorY: [1.12, 3.0], win: [{ y0: 1.9, y1: 2.78, spans, pane: 0.05 }],
      prof: [[1.2, 0.45], [1.5, 0.55], [1.6, 0.9], [1.62, 1.2], [1.62, 3.05], [1.58, 3.35], [1.45, 3.62], [1.15, 3.85], [0.8, 3.98], [0, 4.02]],
      yBreaks: [1.55, 1.62, 1.9, 2.78],
      color: (y, z) => (y < 0.9 ? '#555b63' : y < 1.55 ? '#d9dcdf' : y < 1.62 ? '#cf3a2d' : y > 3.3 ? '#b7bdc4' : '#e9ecee'),
      noseCol: (u, y) => (y < 0.9 ? '#555b63' : y < 1.5 ? '#e8672c' : y < 2.0 ? '#d4d8dc' : (y < 3.5 && Math.abs(u) < 0.85) ? GLASS : '#cf3a2d'),
      noseD: (y) => (y <= 1.2 ? 3.15 : y <= 2.0 ? 3.4 : y <= 3.7 ? 3.4 - (y - 2.0) * 1.2 : (3.4 - 2.04) * Math.sqrt(Math.max(0, 1 - ((y - 3.7) / 0.35) ** 2))),
      bogies: [-7.4, 7.4 - (head ? 3.3 : 0)], skirt: true, panto: head ? null : -6.5, ends: '#e9ecee', gang: '#2f3238', roof: [[-0.8, 0.8, 4.0, 4.3, -2.0, 2.0, '#b4bac1']],
    };
  },
  coach: () => {
    const L = 24.5, doors = [-11.0, 11.0];
    const spans = winSpans(range(-9.0, 9.0, 1.75), 1.2, doors, 0.5);
    return {
      L, nose: 0, doors, doorHW: 0.45, doorY: [1.1, 3.2], win: [{ y0: 1.85, y1: 2.8, spans, pane: 0.05 }],
      prof: [[1.2, 0.55], [1.5, 0.62], [1.56, 0.85], [1.56, 3.05], [1.5, 3.35], [1.35, 3.68], [1.0, 3.9], [0, 3.98]],
      yBreaks: [1.1, 1.25, 1.85, 2.8],
      color: (y, z) => (y < 0.85 ? '#4a4e55' : y < 1.1 ? '#6b7076' : y > 3.3 ? '#8a8f96' : Math.abs(z) > L / 2 - 2.6 ? '#d2232a' : y < 1.25 ? '#d2232a' : '#a9adb3'),
      bogies: [-8.8, 8.8], skirt: false, ends: '#8a8f96', gang: '#33363c', roof: [[-0.7, 0.7, 3.98, 4.22, -1.8, 1.8, '#7b8087']],
    };
  },
  dd: () => {
    const L = 24.5, doors = [-11.0, 11.0];
    const spans = winSpans(range(-9.5, 9.5, 1.45), 0.85, doors, 0.5);
    return {
      L, nose: 0, doors, doorHW: 0.45, doorY: [1.1, 3.2], win: [{ y0: 1.75, y1: 2.55, spans, pane: 0.05 }, { y0: 3.1, y1: 3.9, spans, pane: 0.05 }],
      prof: [[1.2, 0.55], [1.5, 0.62], [1.56, 0.85], [1.56, 4.15], [1.5, 4.45], [1.3, 4.65], [0.9, 4.74], [0, 4.78]],
      yBreaks: [1.1, 1.25, 1.75, 2.55, 3.1, 3.9],
      color: (y, z) => (y < 0.85 ? '#4a4e55' : y < 1.1 ? '#6b7076' : y > 4.4 ? '#7d828a' : Math.abs(z) > L / 2 - 3.2 && y < 3.6 ? '#d2232a' : y < 1.25 ? '#d2232a' : '#b3b6bb'),
      bogies: [-8.8, 8.8], skirt: false, ends: '#8a8f96', gang: '#33363c', roof: [[-0.7, 0.7, 4.78, 4.98, -1.8, 1.8, '#7b8087']],
    };
  },
  strela: () => {
    const L = 24.5, doors = [-11.0, 11.0];
    const spans = winSpans(range(-9.0, 9.0, 1.75), 1.2, doors, 0.5);
    return {
      L, nose: 0, doors, doorHW: 0.45, doorY: [1.1, 3.2], win: [{ y0: 1.85, y1: 2.8, spans, pane: 0.05 }],
      prof: [[1.2, 0.55], [1.5, 0.62], [1.56, 0.85], [1.56, 3.05], [1.5, 3.35], [1.35, 3.68], [1.0, 3.9], [0, 3.98]],
      yBreaks: [1.1, 1.22, 1.3, 1.85, 2.8, 3.0, 3.08],
      color: (y, z) => (y < 0.85 ? '#4a4e55' : y < 1.1 ? '#7d8288' : y > 3.3 ? '#9a9ea4' : (y > 1.22 && y < 1.3) || (y > 3.0 && y < 3.08) ? '#bfc3c7' : '#b3162a'),
      bogies: [-8.8, 8.8], skirt: false, ends: '#9a9ea4', gang: '#33363c', roof: [[-0.7, 0.7, 3.98, 4.2, -1.8, 1.8, '#85898f']],
    };
  },
  ep2k: (liv) => {
    const L = 17.6, nose = 1.6;
    const red = liv === 'red' ? '#c4162a' : '#b3173f';
    return {
      L, nose, both: true, head: true, fixedDoors: true, doors: [-5.2, 5.2], doorHW: 0.4, doorY: [1.2, 3.2],
      win: [{ y0: 2.3, y1: 3.3, spans: [[-7.5, -6.2], [-4.9, -3.9], [3.9, 4.9], [6.2, 7.5]], pane: 0.04, kind: 'win' },
        { y0: 2.4, y1: 3.2, spans: [[-3.3, -1.5], [-0.6, 1.2], [1.8, 3.4]], pane: 0.04, kind: 'louvre' }],
      prof: [[1.3, 0.62], [1.52, 0.72], [1.58, 1.0], [1.58, 3.4], [1.52, 3.95], [1.2, 4.15], [0.9, 4.2], [0, 4.2]],
      yBreaks: [1.5, 1.9, 2.3, 3.2, 3.3],
      color: (y, z) => {
        if (y < 1.0) return '#6a6f77';
        if (y < 1.5) return '#7f848b';
        if (y > 3.95) return '#8a8f96';
        if (liv !== 'red' && y > 1.9 && y < 3.2 && ((z > -6.4 && z < -4.6) || (z > -2.2 && z < -0.6) || (z > 2.6 && z < 4.2))) return '#f2f0ec';
        return red;
      },
      noseCol: (u, y) => (y < 0.95 ? '#6a6f77' : y < 1.55 ? '#e9632a' : (y > 2.35 && y < 3.5 && Math.abs(u) < 0.8) ? GLASS : y > 3.9 ? '#8a8f96' : y < 2.0 ? '#7f848b' : red),
      noseD: (y) => (y <= 1.3 ? 1.5 : y <= 2.4 ? 1.6 : y <= 3.6 ? 1.6 - (y - 2.4) * 0.9 : Math.max(0.1, (1.6 - 1.08) * Math.sqrt(Math.max(0, 1 - ((y - 3.6) / 0.6) ** 2)))),
      bogies: [-5.4, 5.4], skirt: true, panto: [-3.4, 3.4], ends: red, gang: '#33363c', roof: [[-0.9, 0.9, 4.2, 4.36, -6.0, -3.0, '#8a8f96'], [-0.9, 0.9, 4.2, 4.36, 3.0, 6.0, '#8a8f96']],
    };
  },
};
export const FAMILIES = {
  velaroHead: () => SPEC.velaro(true), velaroMid: () => SPEC.velaro(false), desiroHead: () => SPEC.desiro(true), desiroMid: () => SPEC.desiro(false),
  velaroMidP: () => ({ ...SPEC.velaro(false), panto: -3.2 }),
  coach: SPEC.coach, dd: SPEC.dd, strela: SPEC.strela, ep2k: () => SPEC.ep2k('magenta'), ep20: () => SPEC.ep2k('red'),
};
export { halfW };
export const CAR_LENGTH = { velaroHead: 25.0, velaroMid: 25.0, velaroMidP: 25.0, desiroHead: 22.5, desiroMid: 22.5, coach: 24.5, dd: 24.5, strela: 24.5, ep2k: 17.6, ep20: 17.6 };

// ------------------------------------------------------------------------------------------------ the hull builder
function halfW(prof, y) { for (let j = 0; j < prof.length - 1; j++) { const a = prof[j], b = prof[j + 1]; if (y >= a[1] - 1e-9 && y <= b[1] + 1e-9) return b[1] === a[1] ? a[0] : a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); } return 0; }
const se = (u) => Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(u)), 2.4)), 1 / 2.4);

export function buildCar(famKey) {
  const S = FAMILIES[famKey]();
  const A = new Acc(), W = new Acc(), LL = new Acc(), LR = new Acc(), LA = new Acc(), LB = new Acc();
  const L2 = S.L / 2, prof = S.prof, ytop = prof[prof.length - 1][1], ybot = prof[0][1];
  const ys = new Set(prof.map((p) => p[1]));
  for (const y of S.yBreaks || []) ys.add(y);
  for (const w of S.win) { ys.add(w.y0); ys.add(w.y1); }
  ys.add(S.doorY[0]); ys.add(S.doorY[1]);
  const Y = [...ys].filter((y) => y >= ybot - 1e-6 && y <= ytop + 1e-6).sort((a, b) => a - b);
  const zFront = S.head || S.both ? L2 - S.nose : L2, zBack = S.both ? -L2 + S.nose : -L2;
  const zs = new Set([zBack, zFront]);
  for (const d of S.doors) { zs.add(d - S.doorHW); zs.add(d + S.doorHW); }
  for (const w of S.win) for (const [a, b] of w.spans) { zs.add(a); zs.add(b); }
  for (const z of [-L2 + 2.6, L2 - 2.6, -L2 + 3.2, L2 - 3.2, -6.4, -4.6, -2.2, -0.6, 2.6, 4.2]) zs.add(z);
  const Z = [...zs].filter((z) => z >= zBack - 1e-6 && z <= zFront + 1e-6).sort((a, b) => a - b);
  const kindAt = (y, z) => {
    for (const w of S.win) if (y > w.y0 - 1e-6 && y < w.y1 + 1e-6) for (const [a, b] of w.spans) if (z > a && z < b) return { kind: w.kind || 'win', pane: w.pane };
    if (!S.fixedDoors && y > S.doorY[0] && y < S.doorY[1]) for (const d of S.doors) if (Math.abs(z - d) < S.doorHW) return { kind: 'door' };
    return { kind: 'wall', col: S.color(y, z) };
  };
  // ---- side walls
  for (const sx of [1, -1]) {
    for (let r = 0; r < Y.length - 1; r++) {
      const yA = Y[r], yB = Y[r + 1]; if (yB - yA < 1e-5) continue;
      const xa = halfW(prof, yA + 1e-6), xb = halfW(prof, yB - 1e-6);
      const nx = sx * (yB - yA), ny = -(xb - xa), nl = Math.hypot(nx, ny) || 1, nrm = [nx / nl, ny / nl, 0];
      const runs = [];
      for (let i = 0; i < Z.length - 1; i++) {
        const z0 = Z[i], z1 = Z[i + 1]; if (z1 - z0 < 1e-5) continue;
        const k = kindAt((yA + yB) / 2, (z0 + z1) / 2), last = runs[runs.length - 1];
        if (last && last.k.kind === k.kind && last.k.col === k.col) last.z1 = z1; else runs.push({ z0, z1, k });
      }
      const P = (x, y, z) => [sx * x, y, z];
      for (const { z0, z1, k } of runs) {
        if (k.kind === 'wall') A.quad(P(xa, yA, z0), P(xa, yA, z1), P(xb, yB, z1), P(xb, yB, z0), k.col, nrm, nrm, nrm, nrm);
        else if (k.kind === 'door') { const ip = 0.07; A.quadN(P(xa - ip, yA, z0), P(xa - ip, yA, z1), P(xb - ip, yB, z1), P(xb - ip, yB, z0), '#2e3139', nrm); }
        else { const ip = k.pane || 0.05, e = 0.09; (k.kind === 'louvre' ? A : W).quadN(P(xa - ip, yA - e, z0 - e), P(xa - ip, yA - e, z1 + e), P(xb - ip, yB + e, z1 + e), P(xb - ip, yB + e, z0 - e), k.kind === 'louvre' ? '#3a2a2e' : GLASS, nrm); }
      }
    }
  }
  // ---- flat end caps + gangway
  const endCap = (z, sg) => {
    for (let r = 0; r < prof.length - 1; r++) {
      const [xa, ya] = prof[r], [xb, yb] = prof[r + 1]; if (yb - ya < 1e-5 && xb === xa) continue;
      A.quadN([-xa, ya, z], [xa, ya, z], [xb, yb, z], [-xb, yb, z], S.ends, [0, 0, sg]);
    }
  };
  if (!S.both) { endCap(-L2, -1); if (!S.head) endCap(L2, 1); }
  if (!S.both) { A.box(-1.2, 1.2, 1.0, 3.3, -L2 - 0.28, -L2, S.gang); if (!S.head) A.box(-1.2, 1.2, 1.0, 3.3, L2, L2 + 0.28, S.gang); }
  // ---- noses
  const noses = S.both ? [1, -1] : S.head ? [1] : [];
  const nys = [...new Set([ybot, ...Y.filter((y) => y > ybot && y < ytop), ytop, ...[1.2, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6, 3.9].filter((y) => y > ybot && y < ytop)])].sort((a, b) => a - b);
  const us = [-1, -0.93, -0.84, -0.7, -0.5, -0.25, 0, 0.25, 0.5, 0.7, 0.84, 0.93, 1];
  for (const sg of noses) {
    const pt = (u, y) => [u * halfW(prof, Math.min(ytop - 1e-6, Math.max(ybot + 1e-6, y))), y, sg * (L2 - S.nose + S.noseD(y) * se(u))];
    const nm = (u, y) => {
      const e = 1e-3, a = pt(Math.max(-1, u - e), y), b = pt(Math.min(1, u + e), y), c = pt(u, Math.max(ybot, y - e)), d = pt(u, Math.min(ytop, y + e));
      const du = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], dy = [d[0] - c[0], d[1] - c[1], d[2] - c[2]];
      let n = [du[1] * dy[2] - du[2] * dy[1], du[2] * dy[0] - du[0] * dy[2], du[0] * dy[1] - du[1] * dy[0]];
      const l = Math.hypot(...n); if (l < 1e-9) return [0, 0, sg];
      n = n.map((v) => v / l); if (n[2] * sg < -0.2 && Math.abs(u) < 0.95) n = n.map((v) => -v);
      return n;
    };
    for (let j = 0; j < nys.length - 1; j++) for (let i = 0; i < us.length - 1; i++) {
      const u0 = us[i], u1 = us[i + 1], y0 = nys[j], y1 = nys[j + 1];
      const col = S.noseCol((u0 + u1) / 2, (y0 + y1) / 2);
      A.quad(pt(u0, y0), pt(u1, y0), pt(u1, y1), pt(u0, y1), col, nm(u0, y0), nm(u1, y0), nm(u1, y1), nm(u0, y1));
    }
    for (let i = 0; i < us.length - 1; i++) A.tri([0, ybot, sg * (L2 - S.nose)], pt(us[i + 1], ybot), pt(us[i], ybot), '#3d4046', [0, -1, 0], [0, -1, 0], [0, -1, 0]);
    // lamps on the nose (head lamps / tail lamps share the geometry: colour per instance)
    const lamps = sg > 0 ? LA : LB;
    for (const sx of [-1, 1]) {
      const yl = S.lampY ?? (famKey.startsWith('ep') ? 1.2 : 1.35), u = famKey.startsWith('ep') ? 0.78 : 0.7;
      const p = pt(sx * u, yl), n = nm(sx * u, yl), o = 0.02;
      const t = [n[2], 0, -n[0]], tl = Math.hypot(...t) || 1, tt = t.map((v) => v / tl);
      const c0 = [p[0] + n[0] * o, p[1] + n[1] * o, p[2] + n[2] * o], w = 0.3, hh = 0.09;
      const Q = (a, b) => [c0[0] + tt[0] * a, c0[1] + b, c0[2] + tt[2] * a];
      lamps.quadN(Q(-w / 2, -hh), Q(w / 2, -hh), Q(w / 2, hh), Q(-w / 2, hh), '#ffffff', n);
    }
  }
  // ---- underframe, bogies
  const uz0 = S.bogies[0] + 2.2, uz1 = S.bogies[1] - 2.2;
  if (uz1 > uz0) A.box(-1.18, 1.18, ybot - 0.02, ybot + 0.32, uz0, uz1, '#3a3d43');
  for (const bz of S.bogies) {
    A.box(-1.05, 1.05, 0.36, 0.82, bz - 1.45, bz + 1.45, '#33363c');
    for (const wz of [-1.25, 1.25]) A.wheel(0, 0.46, bz + wz, 0.46, 1.5, '#5f646c', 6);
  }
  // ---- roof gear and pantographs
  for (const [x0, x1, y0, y1, z0, z1, c] of S.roof || []) A.box(x0, x1, y0, y1, z0, z1, c);
  const pz = S.panto == null ? [] : Array.isArray(S.panto) ? S.panto : [S.panto];
  pz.forEach((z, i) => {
    const raised = i === (S.pantoUp ?? 0), y0 = ytop + 0.12;
    const g = '#6d737b', hy = raised ? 5.82 : y0 + 0.5;
    A.box(-0.55, 0.55, ytop, y0, z - 0.9, z + 0.9, g);
    A.rod([0, y0, z - 0.7], [0, raised ? 5.0 : y0 + 0.28, z + 0.55], 0.045, g);
    A.rod([0, raised ? 5.0 : y0 + 0.28, z + 0.55], [0, hy - 0.04, z - 0.4], 0.04, g);
    A.box(-0.95, 0.95, hy - 0.05, hy + 0.02, z - 0.5, z - 0.3, '#2a2c30');
    for (const sx of [-0.4, 0.4]) A.box(sx - 0.06, sx + 0.06, ytop, y0 + 0.2, z - 1.1, z - 0.95, '#8a5b48');
  });
  // ---- door leaves (slide along -Z in the instance transform): +X side and -X side
  if (!S.fixedDoors) {
    const [d0, d1] = S.doorY;
    for (const d of S.doors) for (const sx of [1, -1]) {
      const T = sx > 0 ? LL : LR, hw = halfW(prof, (d0 + d1) / 2) + 0.012;
      const col = S.color((d0 + d1) / 2, d), hw1 = S.doorHW - 0.02;
      T.box(sx * hw, sx * (hw + 0.045), d0, d1, d - hw1, d + hw1, col);
      const gx = sx * (hw + 0.047);
      T.quadN([gx, 2.0, d - hw1 + 0.12], [gx, 2.0, d + hw1 - 0.12], [gx, Math.min(d1 - 0.2, 3.0), d + hw1 - 0.12], [gx, Math.min(d1 - 0.2, 3.0), d - hw1 + 0.12], GLASS, [sx, 0, 0]);
    }
  }
  const geo = (a) => (a.p.length ? a.geometry() : null);
  return { S, body: A.geometry(), windows: geo(W), leafL: geo(LL), leafR: geo(LR), lampsA: geo(LA), lampsB: geo(LB), tris: (A.p.length + W.p.length + LL.p.length * 2 + LA.p.length) / 9, length: S.L, doors: S.doors, hasLeaves: !S.fixedDoors };
}
