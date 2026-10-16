// landmarksE/houses.js - the houses round Ostrovsky Square that the dossier describes (docs/research/gostiny-dvor-ostrovsky.md section 5.7, photos refs/ostrovsky 038-056, 158, 044):
//   * Ostrovsky 7, the St Petersburg City Credit Society (Schroeter 1876-78, w66519297): cream-beige limestone (#d8c6a6) neo-Renaissance, rusticated ground floor with oculi, tall arched windows,
//     two corner balconies on pairs of atlantes each carrying two statues, a balustraded roof with urns;
//   * Ostrovsky 5 (w66519259): salmon-pink "Russian style" house with an olive-green domed turret and a spire;
//   * Ostrovsky 2 (w66583112): grey granite Art Nouveau house (lion-mask consoles, bay windows); 2A (r1494149): the black granite gate house with a big glazed arch; litB (w66583099, w105365009) plain.
// Everything else on the square is the city module's.
import * as THREE from 'three';
import * as L from '../layout.js';
import { buildHouse } from './house.js';
import { toUV, toWorld, ringOf } from './frame.js';
import { archPath } from './kit.js';
import { figure } from './monument.js';

export function build(K, ctx) {
  const M = K.G.M, P = K.P, white = M.white;
  const get = (id) => L.buildingById(id);
  const lookEast = (e, u0 = 20) => { const a = toUV(e.a[0], e.a[1]), b = toUV(e.b[0], e.b[1]); return Math.abs(a.u - b.u) < 3 && e.len > u0; };

  // ---- Ostrovsky 7: the Credit Society house
  const cr = get('w66519297');
  if (cr) {
    const cream = K.wall('#d8c6a6'), creamRust = K.rust('#d2bf9c'), plinth = K.mat('#4a4c52', { name: 'lmE-darkGranite' });
    buildHouse(K, {
      name: 'credit', recs: [cr], hc: 19.5, wall: '#d8c6a6', court: '#d2c2a2', plinth: 1.2, plinthMat: plinth, floors: [5.2, 4.8, 4.4, 3.6], courtPitch: 3.6, upstand: 0.9, roofMat: M.roofDark, railing: false, collide: true, collideH: 22,
      front: (e, c) => {
        const a = toUV(e.a[0], e.a[1]), b = toUV(e.b[0], e.b[1]);
        if (!(e.len > 30 && Math.abs(a.u - 417.3) < 2 && Math.abs(b.u - 417.3) < 2)) return false;
        creditFront(K, M, c.len, cream, creamRust);
        return true;
      },
    });
    const [x, z] = toWorld(430, 272);
    K.svc.houses.push({ id: 'w66519297', name: 'Здание Городского кредитного общества', nameEn: 'City Credit Society house', x, z });
  }
  // ---- Ostrovsky 5: pink house with the green turret
  const pk = get('w66519259');
  if (pk) {
    buildHouse(K, {
      name: 'ostr5', recs: [pk], hc: 16.5, wall: '#e0a0a0', court: '#dcae9e', plinth: 1.0, plinthMat: M.plinth, floors: [4.4, 4.0, 3.6, 3.2], courtPitch: 3.6, upstand: 0.8, roofMat: M.roofGreen, railing: false, collide: true, collideH: 20,
    });
    const ring = ringOf(pk.polys[0].o); let best = null, bd = 1e9; for (const p of ring) { const q = toUV(p[0], p[1]), d = Math.hypot(q.u - 418, q.v - 228); if (d < bd) { bd = d; best = p; } }
    if (best) {
      const [tx, tz] = [best[0], best[1]], olive = K.mat('#6b7a3e', { name: 'lmE-olive' }), cr0 = K.mat('#e8b0a8', { name: 'lmE-turret' });
      P.cyl(cr0, [tx, 12, tz], [tx, 18.5, tz], 2.1, 2.0, 12, true); P.cyl(M.white, [tx, 18.5, tz], [tx, 18.8, tz], 2.4, 2.4, 12, true);
      P.geo(olive, new THREE.SphereGeometry(2.3, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), tx, 18.8, tz, 0, 0, 0, 1, 1.15, 1);
      P.cyl(olive, [tx, 21.3, tz], [tx, 25.0, tz], 0.4, 0.04, 8, false);
    }
  }
  // ---- Ostrovsky 2 (grey granite Art Nouveau), 2A (black granite gate house), the plain rear blocks
  const g2 = get('w66583112'), g2a = get('r1494149'), lb = get('w66583099'), lc = get('w105365009');
  if (g2) buildHouse(K, { name: 'ostr2', recs: [g2], hc: 20.0, wall: '#a39f98', court: '#b6b1a8', plinth: 1.6, plinthMat: K.mat('#5a5a5e', { name: 'lmE-graniteDark' }), floors: [5.0, 4.4, 4.2, 3.6, 3.4], courtPitch: 3.4, upstand: 0.9, roofMat: M.roofDark, railing: false, collide: true, collideH: 23 });
  if (g2a) {
    buildHouse(K, {
      name: 'ostr2a', recs: [g2a], hc: 18.5, wall: '#34363a', court: '#44464a', plinth: 1.0, plinthMat: K.mat('#202226', { name: 'lmE-blackGranite' }), floors: [4.6, 4.2, 4.0, 3.6], courtPitch: 3.8, upstand: 0.8, roofMat: M.roofDark, railing: false, collide: true, collideH: 21,
      front: (e, c) => {
        const a = toUV(e.a[0], e.a[1]), b = toUV(e.b[0], e.b[1]);
        if (!(e.len > 12 && Math.abs(a.u - b.u) < 3 && (a.u + b.u) / 2 > 255)) return false;
        const KM = K.mats, w = c.len, cx = w / 2;
        const dark = K.wall('#34363a');
        K.wallWithHoles(dark, 0, w, 1.0, 19.3, [{ x: cx, y0: 1.2, w: Math.min(7.0, w - 4), h: 14.0, head: 'arch' }], 4);
        K.glass(KM.winBrown, cx, 1.2, Math.min(7.0, w - 4) - 0.2, 13.8, 'arch', 3, 0.1);
        const aw = Math.min(7.0, w - 4);
        const s = new THREE.Shape(); archPath(s, cx, 1.2, aw + 0.9, 14.0 - aw / 2, false); const h = new THREE.Path(); archPath(h, cx, 1.2, aw, 14.0 - aw / 2, true); s.holes.push(h); P.face(K.mat('#5a5c60', { name: 'lmE-blackGraniteTrim' }), s, 0.06, 1, 10);
        for (let k = 0; k < Math.max(1, Math.round(w / 4)); k++) { const x = (k + 0.5) * w / Math.max(1, Math.round(w / 4)); if (Math.abs(x - cx) < aw / 2 + 1.2) continue; K.window({ x, y: 3.0, w: 1.3, h: 2.3, sw: 0.12, d: 0.06, frame: 'white', surMat: M.whiteShade, sillMat: M.whiteShade }); K.window({ x, y: 8.0, w: 1.3, h: 2.3, sw: 0.12, d: 0.06, frame: 'white', surMat: M.whiteShade, sillMat: M.whiteShade }); K.window({ x, y: 13.2, w: 1.3, h: 2.3, sw: 0.12, d: 0.06, frame: 'white', surMat: M.whiteShade, sillMat: M.whiteShade }); }
        return true;
      },
    });
  }
  const rest = [lb, lc].filter(Boolean);
  if (rest.length) buildHouse(K, { name: 'ostrB', recs: rest, hc: 14.5, wall: '#d6cba8', court: '#d6cba8', plinth: 1.0, plinthMat: M.plinth, floors: [4.4, 3.8, 3.6, 3.2], courtPitch: 3.6, upstand: 0.8, roofMat: M.roofDark, railing: false, collide: true, collideH: 17 });
}

/** Ostrovsky 7: rusticated ground floor with oculi, arched windows, balustrade; the two end pavilions carry balconies on pairs of atlantes with two statues each */
function creditFront(K, M, len, cream, creamRust) {
  const P = K.P, white = M.white, trim = K.wall('#efe6d2');
  K.wallQuad(creamRust, 0, len, 1.2, 5.4, 1.8);
  K.wallQuad(cream, 0, len, 5.4, 19.5, 4);
  const n = Math.max(3, Math.round(len / 4.2)), p = len / n;
  P.box(trim, -0.15, len + 0.15, 5.2, 5.7, 0, 0.35, 'kb'); P.box(trim, -0.15, len + 0.15, 10.0, 10.3, 0, 0.3, 'kb'); P.box(trim, -0.2, len + 0.2, 17.6, 19.0, 0, 0.9, 'b');
  for (let k = 0; k < n; k++) {
    const x = (k + 0.5) * p, end = k === 0 || k === n - 1;
    if (end) continue;
    K.window({ x, y: 1.7, w: 1.6, h: 2.6, head: 'flat', sw: 0.18, d: 0.08, frame: 'white', surMat: trim, sillMat: trim });
    P.cyl(trim, [x, 4.6, 0.02], [x, 4.6, 0.12], 0.45, 0.45, 12, true);                               // oculus in a shell niche
    K.window({ x, y: 6.3, w: 1.8, h: 3.4, head: 'arch', sw: 0.25, d: 0.1, frame: 'white', surMat: trim, sillMat: trim, sill: false });
    K.balustrade(x - 0.9, x + 0.9, 5.9, 0.8, 0.25, trim);
    K.window({ x, y: 11.3, w: 1.6, h: 3.6, head: 'arch', sw: 0.22, d: 0.09, frame: 'white', surMat: trim, sillMat: trim, sill: false });
    K.window({ x, y: 15.4, w: 1.1, h: 1.6, head: 'flat', sw: 0.14, d: 0.06, frame: 'white', surMat: trim, sillMat: trim, sill: false });
  }
  // corner pavilions: balconies on two atlantes each, two statues on the balcony, urns on the roof
  for (const cx of [3.4, len - 3.4]) {
    P.box(cream, cx - 3.4, cx + 3.4, 5.4, 19.5, 0, 1.0, 'b');
    K.window({ x: cx, y: 6.8, w: 2.0, h: 3.6, head: 'arch', sw: 0.25, d: 0.1, frame: 'white', surMat: trim, sillMat: trim, sill: false });
    K.window({ x: cx, y: 11.6, w: 1.8, h: 3.4, head: 'arch', sw: 0.22, d: 0.1, frame: 'white', surMat: trim, sillMat: trim, sill: false });
    P.box(trim, cx - 2.6, cx + 2.6, 5.7, 6.2, 0, 2.4, 'b');                                               // balcony slab
    for (const dx of [-1.6, 1.6]) { figure(P, M.whiteShade, cx + dx, 1.2, 1.7, 0, 1.15, 0); P.box(trim, cx + dx - 0.5, cx + dx + 0.5, 4.3, 5.7, 1.2, 2.2, 'b'); }
    for (const dx of [-1.6, 1.6]) figure(P, M.white, cx + dx, 6.2, 2.0, 0, 0.75, 1);
    K.balustrade(cx - 2.6, cx + 2.6, 6.2, 0.9, 2.4, trim);
    for (const dx of [-2.8, 2.8]) P.cyl(trim, [cx + dx, 19.5, 0.5], [cx + dx, 21.0, 0.5], 0.4, 0.55, 8, true);
  }
  K.balustrade(0, len, 19.0, 1.0, 0.4, trim);
}
