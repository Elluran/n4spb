// bridges/rails.js - the cast-iron railing patterns of the bridges as white-on-clear canvas panels (alpha cut-out, tinted by the material colour) and the instancer that stands them
// in a row along a bridge face.  Patterns (docs/research/west-canals-bridges.md section 3 / 4, photos refs/canals 11 18 21 23 24 26 30 35 42 43 45 50 54 95):
//   moika     the Moika / Green / Red pattern: frieze of 16 small double rings under the top rail, three pointed arcs each holding a 4-lobed quatrefoil, three turned vase balusters, a bottom band
//             of crossing diagonals with rosettes
//   greenrings the Green Bridge: a row of 7 big rope rings under the rail, a lozenge lattice below
//   palmette  Pevchesky: ring frieze (12 rings), one big arch field with five palmette fans and scrolls, lion-head roundels at the ends, ball feet
//   blue      Blue Bridge: 11 beaded rings, two catenary swags meeting at a lance baluster with a pineapple bud, a trefoil each side, an apron plate with rosette bosses
//   fan       Bankovsky: sunburst fans of nine rods alternating with C-scrolls, ball finials
//   loops     stadium loops on a bottom rail with small balusters, flat top rail (Italyansky, Novo-Konyushenny, Mucny scrolls)
// A pattern is drawn at 400 px / m, white (#fff) with grey (#8c8c8c) shadow lines offset by 1.5 px: the material colour tints it (cast iron #202428, green, blue, red ...).
import * as THREE from 'three';
import { PATTERNS2, paint2 } from './rails2.js';
import { splitInstanced } from '../../core/spatial.js';

const PX = 400;
/** pattern table: bay width W (m), height H (m), draw(g, W, H) in px with 0,0 top left */
const PATTERNS = {
  moika: { W: 2.4, H: 1.0 }, greenrings: { W: 2.4, H: 1.0 }, palmette: { W: 1.8, H: 1.0 }, blue: { W: 2.2, H: 1.0 }, fan: { W: 1.8, H: 1.1 }, loops: { W: 2.0, H: 1.0 }, scroll: { W: 2.0, H: 1.0 }, palace: { W: 2.0, H: 1.1 }, ...PATTERNS2,
};

function paint(g, W, H, kind) {
  const p = (m) => m * PX;                                           // metres -> px
  g.clearRect(0, 0, W, H);
  const stroke = (fn) => {                                           // shadow pass then light pass
    g.save(); g.translate(1.6, 1.6); g.fillStyle = '#8c8c8c'; g.strokeStyle = '#8c8c8c'; g.lineCap = 'round'; fn(); g.restore();
    g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.lineCap = 'round'; fn();
  };
  const ring = (x, y, r, t) => { g.lineWidth = p(t); g.beginPath(); g.arc(p(x), p(y), p(r), 0, 6.3); g.stroke(); };
  const disc = (x, y, r) => { g.beginPath(); g.arc(p(x), p(y), p(r), 0, 6.3); g.fill(); };
  const line = (x0, y0, x1, y1, t) => { g.lineWidth = p(t); g.beginPath(); g.moveTo(p(x0), p(y0)); g.lineTo(p(x1), p(y1)); g.stroke(); };
  const quad = (x0, y0, cx, cy, x1, y1, t) => { g.lineWidth = p(t); g.beginPath(); g.moveTo(p(x0), p(y0)); g.quadraticCurveTo(p(cx), p(cy), p(x1), p(y1)); g.stroke(); };
  const rect = (x0, y0, x1, y1) => g.fillRect(p(x0), p(y0), p(x1 - x0), p(y1 - y0));
  const w = W / PX, h = H / PX;
  const vase = (x, y0, y1, r) => {                                   // turned baluster: neck, bulb, foot
    const hh = y1 - y0; g.beginPath(); g.ellipse(p(x), p(y0 + hh * 0.5), p(r), p(hh * 0.22), 0, 0, 6.3); g.fill();
    line(x, y0, x, y1, 0.026); rect(x - r * 0.6, y0, x + r * 0.6, y0 + 0.02); rect(x - r * 0.8, y1 - 0.025, x + r * 0.8, y1);
    g.beginPath(); g.ellipse(p(x), p(y0 + hh * 0.18), p(r * 0.55), p(hh * 0.07), 0, 0, 6.3); g.fill();
  };
  const quatrefoil = (x, y, r) => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ring(x + dx * r * 0.5, y + dy * r * 0.5, r * 0.5, 0.018); disc(x, y, r * 0.14); };
  const rosette = (x, y, r) => { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.ellipse(p(x + Math.cos(a) * r * 0.55), p(y + Math.sin(a) * r * 0.55), p(r * 0.5), p(r * 0.26), a, 0, 6.3); g.fill(); } disc(x, y, r * 0.3); };
  stroke(() => {
    if (kind === 'moika') {
      rect(0, 0, w, 0.06);                                           // top rail
      for (let i = 0; i < 16; i++) { const x = (i + 0.5) * w / 16; ring(x, 0.14, 0.058, 0.02); ring(x, 0.14, 0.033, 0.014); }
      line(0, 0.215, w, 0.215, 0.022);
      for (let i = 0; i < 3; i++) {                                  // pointed arc + quatrefoil + vase
        const x0 = i * w / 3, x1 = x0 + w / 3, xc = (x0 + x1) / 2;
        quad(x0 + 0.03, 0.74, x0 + 0.06, 0.28, xc, 0.25, 0.034); quad(xc, 0.25, x1 - 0.06, 0.28, x1 - 0.03, 0.74, 0.034);
        quatrefoil(xc, 0.46, 0.2); vase(xc, 0.64, 0.9, 0.05);
      }
      rect(0, 0.9, w, 0.935);                                        // bottom band: diagonals + rosettes
      for (let x = 0; x < w; x += 0.1) { line(x, 0.935, x + 0.065, 0.995, 0.012); line(x + 0.065, 0.935, x, 0.995, 0.012); }
      for (let i = 0; i < 12; i++) rosette((i + 0.5) * w / 12, 0.965, 0.03);
      rect(0, 0.99, w, h);
    } else if (kind === 'greenrings') {
      rect(0, 0, w, 0.065); line(0, 0.09, w, 0.09, 0.02);
      for (let i = 0; i < 7; i++) { const x = (i + 0.5) * w / 7; ring(x, 0.27, 0.13, 0.026); ring(x, 0.27, 0.095, 0.014); disc(x - 0.14 * 0.0 + w / 14, 0.27, 0.017); }
      line(0, 0.42, w, 0.42, 0.02);
      for (let k = -2; k < 24; k++) { const x = k * 0.12; line(x, 0.43, x + 0.4, 0.9, 0.016); line(x + 0.4, 0.43, x, 0.9, 0.016); }
      for (let k = 0; k < 20; k++) disc(k * 0.12 + 0.2, 0.665, 0.012);
      rect(0, 0.9, w, h);
    } else if (kind === 'palmette') {
      rect(0, 0, w, 0.06);
      for (let i = 0; i < 12; i++) { const x = (i + 0.5) * w / 12; ring(x, 0.13, 0.05, 0.018); ring(x, 0.13, 0.027, 0.012); }
      line(0, 0.19, w, 0.19, 0.02);
      quad(0.08, 0.9, 0.04, 0.3, w / 2, 0.24, 0.03); quad(w / 2, 0.24, w - 0.04, 0.3, w - 0.08, 0.9, 0.03);          // big arch field
      for (let i = 0; i < 5; i++) {                                  // palmette fans
        const x = 0.22 + i * (w - 0.44) / 4, y = 0.82, R = 0.34;
        for (let k = 0; k < 9; k++) { const a = Math.PI + (k + 0.5) * Math.PI / 9; g.beginPath(); g.ellipse(p(x + Math.cos(a) * R * 0.55), p(y + Math.sin(a) * R * 0.55), p(R * 0.5), p(0.026), a, 0, 6.3); g.fill(); }
        line(x, y, x, y - 0.1, 0.02); disc(x, y - 0.02, 0.03);
        for (const sx of [-1, 1]) { g.lineWidth = p(0.016); g.beginPath(); g.arc(p(x + sx * 0.1), p(y + 0.02), p(0.045), 0, 5); g.stroke(); }
      }
      ring(0.1, 0.6, 0.065, 0.02); disc(0.1, 0.6, 0.032); ring(w - 0.1, 0.6, 0.065, 0.02); disc(w - 0.1, 0.6, 0.032);   // lion-head roundels
      rect(0, 0.9, w, 0.945); for (let i = 0; i <= 6; i++) disc(i * w / 6, 0.97, 0.03);
      rect(0, 0.985, w, h);
    } else if (kind === 'blue') {
      rect(0, 0, w, 0.06);
      for (let i = 0; i < 11; i++) { const x = (i + 0.5) * w / 11, r = 0.085; ring(x, 0.17, r, 0.022); for (let k = 0; k < 14; k++) { const a = k * 6.283 / 14; disc(x + Math.cos(a) * r, 0.17 + Math.sin(a) * r, 0.014); } }
      line(0, 0.28, w, 0.28, 0.022);
      quad(0.05, 0.4, w * 0.25, 0.82, w / 2, 0.4, 0.03); quad(w / 2, 0.4, w * 0.75, 0.82, w - 0.05, 0.4, 0.03);         // two catenary swags
      vase(w / 2, 0.3, 0.88, 0.045); g.beginPath(); g.ellipse(p(w / 2), p(0.34), p(0.04), p(0.07), 0, 0, 6.3); g.fill();   // lance baluster with a pineapple bud
      for (const cx of [w * 0.25, w * 0.75]) { for (const [dx, dy] of [[0, -1], [-0.87, 0.5], [0.87, 0.5]]) ring(cx + dx * 0.06, 0.5 + dy * 0.06, 0.06, 0.02); disc(cx, 0.5, 0.02); }   // trefoils
      rect(0, 0.88, w, h); g.save(); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(p((i + 0.5) * w / 10), p(0.94), p(0.022), 0, 6.3); g.fill(); } g.restore();
    } else if (kind === 'fan') {
      rect(0, 0, w, 0.05); line(0, 0.09, w, 0.09, 0.016);
      for (let i = 0; i < 2; i++) {                                   // two fans, a scroll between
        const x = i * w / 2 + w / 4, y = 0.98, R = 0.42;
        for (let k = 0; k <= 9; k++) { const a = Math.PI + k * Math.PI / 9; line(x, y, x + Math.cos(a) * R, y + Math.sin(a) * R, 0.022); }
        g.lineWidth = p(0.03); g.beginPath(); g.arc(p(x), p(y), p(R), Math.PI, 0); g.stroke(); g.beginPath(); g.arc(p(x), p(y), p(R * 0.45), Math.PI, 0); g.stroke();
      }
      for (const cx of [0, w / 2, w]) for (const s of [-1, 1]) { g.lineWidth = p(0.016); g.beginPath(); g.arc(p(cx + s * 0.07), p(0.38), p(0.06), 0, 5.3); g.stroke(); }
      for (const cx of [0.02, w / 2, w - 0.02]) disc(cx, 0.045, 0.03);
      rect(0, 1.04, w, h);
    } else if (kind === 'loops') {
      rect(0, 0, w, 0.07); rect(0, 0.93, w, h);
      const n = 10, pw = w / n;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * pw, lw = pw * 0.36;
        g.lineWidth = p(0.02); g.beginPath(); g.roundRect(p(x - lw), p(0.13), p(2 * lw), p(0.72), p(lw)); g.stroke();
        g.beginPath(); g.roundRect(p(x - lw * 0.55), p(0.2), p(lw * 1.1), p(0.58), p(lw * 0.55)); g.stroke();
        disc(x, 0.9, 0.032);
        if (i < n - 1) line(x + pw / 2, 0.1, x + pw / 2, 0.93, 0.02);
      }
    } else if (kind === 'palace') {
      rect(0, 0, w, 0.07); rect(0, 0.075, w, 0.1);
      for (let i = 0; i < 8; i++) { const x = (i + 0.5) * w / 8; for (const s of [-1, 1]) { for (let k = 0; k < 5; k++) { const a = Math.PI + (k + 0.5) * Math.PI / 5; g.beginPath(); g.ellipse(p(x + s * 0.06 + Math.cos(a) * 0.03), p(0.185 + Math.sin(a) * 0.03), p(0.032), p(0.009), a, 0, 6.3); g.fill(); } } disc(x, 0.17, 0.012); }
      line(0, 0.2, w, 0.2, 0.018);
      for (let i = 0; i < 14; i++) vase((i + 0.5) * w / 14, 0.22, 0.92, 0.035);
      ring(w / 2, 0.52, 0.2, 0.026); ring(w / 2, 0.52, 0.15, 0.016);
      rect(0, 0.92, w, 0.96); for (let i = 0; i < 10; i++) { const x = (i + 0.5) * w / 10; g.lineWidth = p(0.016); g.beginPath(); g.arc(p(x), p(1.0), p(w / 20 - 0.008), Math.PI, 0); g.stroke(); }
      rect(0, 1.06, w, h);
    } else if (kind === 'scroll') {
      rect(0, 0, w, 0.05); rect(0, 0.95, w, h);
      for (let i = 0; i < 5; i++) {
        const x = (i + 0.5) * w / 5;
        g.lineWidth = p(0.02); g.beginPath(); g.arc(p(x - 0.12), p(0.5), p(0.14), 0.4, 5.6); g.stroke(); g.beginPath(); g.arc(p(x + 0.12), p(0.5), p(0.14), 3.55, 8.7); g.stroke();
        line(x, 0.07, x, 0.95, 0.014); ring(x, 0.2, 0.05, 0.012);
      }
    }
  });
}

const cache = new Map();
/** the tinted alpha material of a pattern: colour hex, one per (pattern, colour) */
export function railMat(ctx, kind, hex) {
  const key = kind + hex;
  if (cache.has(key)) return cache.get(key);
  const spec = PATTERNS[kind], W = Math.round(spec.W * PX), H = Math.round(spec.H * PX);
  const map = ctx.tex.draw(W, H, (g) => (PATTERNS2[kind] ? paint2(g, W, H, kind) : paint(g, W, H, kind)), { key: 'brg-rail-' + kind, repeat: [1, 1], anisotropy: 8 });
  const m = ctx.mat.toon(hex, { map, alphaTest: 0.5, side: 'double', paint: 0.02, name: 'brg-rail-' + kind + hex });
  cache.set(key, m); return m;
}
export const railSpec = (kind) => PATTERNS[kind];
/** bays of a railing along a straight WORLD segment (x0, z0) -> (x1, z1) with its bottom at y: adds the panels to `batch`, returns { n, bw, dir } */
export function railWorld(batch, x0, z0, x1, z1, y, kind, hex, o = {}) {
  const spec = PATTERNS[kind], len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / (o.bay ?? spec.W))), bw = len / n, dx = (x1 - x0) / len, dz = (z1 - z0) / len, gap = 0.05;
  const rotY = Math.atan2(-dz, dx);
  for (let i = 0; i < n; i++) batch.add({ kind, hex, x: x0 + dx * (bw * i + gap), y, z: z0 + dz * (bw * i + gap), rotY, roll: o.roll || 0, len: bw - 2 * gap, h: o.h });
  return { n, bw, dx, dz, rotY };
}

/**
 * Collector for instanced panels: add({ kind, hex, x, y, z, rotY, roll, len }) = one bay of width len (scaled) with its bottom at (x, y, z) and its length along the local direction rotY.
 * flush(ctx, root) builds one InstancedMesh per (pattern, colour).
 */
export const RAIL_FAR = 1500;
export function makeRailBatch(ctx) {
  const T = ctx.THREE || THREE, list = new Map();
  const up = new T.Vector3(0, 1, 0), zz = new T.Vector3(0, 0, 1), qa = new T.Quaternion(), qb = new T.Quaternion(), m4 = new T.Matrix4(), sc = new T.Vector3(), pos = new T.Vector3();
  const geo = new T.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  return {
    add(o) { const k = o.kind + o.hex; let a = list.get(k); if (!a) list.set(k, (a = { kind: o.kind, hex: o.hex, items: [] })); a.items.push(o); },
    count() { let n = 0; for (const a of list.values()) n += a.items.length; return n; },
    flush(root) {
      const railRoot = new T.Group(); railRoot.name = 'bridge-rail-cells'; root.add(railRoot);
      for (const a of list.values()) {
        const spec = PATTERNS[a.kind], im = new T.InstancedMesh(geo, railMat(ctx, a.kind, a.hex), a.items.length);
        a.items.forEach((o, i) => {
          qa.setFromAxisAngle(up, o.rotY); qb.setFromAxisAngle(zz, o.roll || 0); qa.multiply(qb);
          m4.compose(pos.set(o.x, o.y, o.z), qa, sc.set(o.len, (o.h || spec.H), 1)); im.setMatrixAt(i, m4);
        });
        im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = false; im.name = 'brg-rail-' + a.kind;
        im.computeBoundingBox(); im.computeBoundingSphere();
        ctx.noOutline(im); railRoot.add(im);
      }
      // One collector covers every bridge in the city. Split before registering
      // bounds, retaining the existing infinite range: this unit plane's per-bay
      // scale must not assign the full bridge a furniture LOD. The engine's later
      // pass preserves these authored ranges and finds already spatial pieces.
      // (round 3, 2026-10-15: a rail bay is a 1 x 1 m alpha-cut plane, sub-pixel beyond 1.5 km; the infinite range drew ~80 rail cells beyond 1.5 km at street level. RAIL_FAR before the quality scale.)
      splitInstanced(railRoot, { lodFar: () => RAIL_FAR });
    },
  };
}
