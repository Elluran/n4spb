// landmarksA/mall.js - ТРЦ «Галерея» (Ligovsky pr. 30, opened 2010, OSM r8522850 + parts w434622477 / 79 / 81 / 82 / 84), the biggest mall of the city.
// Photo SP/refs/galereya/01 (facade), station photo 51 (roof): cream natural-stone cladding, five levels (22 m), flat roof behind a dark sloping cornice band, a rhythm of
// ~6 m bays between flat stone pilasters: ground floor = dark shop arcade (lit at night), levels 2-4 = tall blue glazed windows with white mullions (some with banners), small
// square windows under a deep stone cornice, the plain wordmark "GALERIA" on the frieze.  The round entrance pavilion w434622477 (r 17) sticks out of the north end: three real
// portals lead into a round atrium (r 15.6: shop ring, two gallery levels, glazed skylight, benches) which opens south into a 14 m wide mall street (shopfront units, skylight strip).
// The remaining parts of the OSM group are the long skylight strips on the roof.  All coordinates are WORLD (x east, z south).  Colliders: wall boxes of the outline (no doors: only
// the rotunda is walkable), the rotunda ring with its portals and the south opening, the mall street.  Night: lit arcades / windows / wordmark, floodlit stone (uNight).
import * as THREE from 'three';
import { Parts, C } from './common.js';
import { wallRun, cellCap, ringOf, inside } from './geom.js';
import * as L from '../layout.js';

const H = 22, PIER = 0.55;
const CX = 518, CZ = 470, R_OUT = 17, R_IN = 15.6;
const PORT = { x: 518.4, z: 422.7, w: 7.5 };          // the main portal on the north front (OSM edge (516.3,423.1)-(520.5,422.4)); a corridor leads south to the round atrium
// the mall street: local frame at the rotunda centre, local +z toward the south end (bearing 190 deg)
const GAL = { rotY: Math.atan2(-16, 88), len: 74, w: 14, h: 10.5 };

export function buildMall(Cc) {
  const { ctx, M, T } = Cc;
  const N = Cc.night, P = new Parts(), rng = ctx.rng('mall');
  const TNm = (col, o = {}) => T(col, { ...o, name: 'gal-' + col + (o.name || '') });

  // ------------------------------------------------------------------ textures
  const arcTex = (lit) => ctx.tex.draw(128, 160, (g, w, h) => {
    g.fillStyle = lit ? '#000' : '#1b252e'; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (lit) { gr.addColorStop(0, '#ffe3a8'); gr.addColorStop(1, '#f0b060'); } else { gr.addColorStop(0, '#41566a'); gr.addColorStop(1, '#1f2c38'); }
    g.fillStyle = gr; g.fillRect(6, 6, w - 12, h - 12);
    g.fillStyle = lit ? '#7a4a18' : '#12181f'; for (let i = 0; i < 4; i++) g.fillRect(14 + i * 28, 70 + (i % 2) * 14, 18, 56);          // shelves / mannequins
    g.fillStyle = lit ? '#000' : '#cfd3d6'; g.fillRect(w / 2 - 2, 0, 4, h); g.fillRect(0, 26, w, 3);
  }, { key: lit ? 'gal_arc_lit' : 'gal_arc' });
  const glassTex = (lit, variant) => ctx.tex.draw(128, 256, (g, w, h) => {
    g.fillStyle = lit ? '#000' : '#d8dcdf'; g.fillRect(0, 0, w, h);
    const cols = 3, rows = 7, pw = (w - 8) / cols, ph = (h - 8) / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const gr = g.createLinearGradient(0, 0, 0, h);
      if (lit) { gr.addColorStop(0, '#ffe1a0'); gr.addColorStop(1, '#f2b868'); } else { gr.addColorStop(0, variant ? '#8fa7bd' : '#7fa4bd'); gr.addColorStop(1, variant ? '#5f7f99' : '#5a8099'); }
      g.fillStyle = gr; g.fillRect(4 + c * pw + 1.5, 4 + r * ph + 1.5, pw - 3, ph - 3);
    }
    if (variant) { g.fillStyle = lit ? '#ffb070' : '#e8e0d0'; g.fillRect(8, 60, w - 16, 110); g.fillStyle = lit ? '#000' : '#a2402c'; g.fillRect(18, 72, w - 36, 22); g.fillStyle = lit ? '#2a1a0a' : '#4a6a8a'; g.fillRect(18, 104, w - 36, 50); }       // a banner behind the glass
  }, { key: 'gal_glass' + (lit ? '_lit' : '') + variant });
  const upTex = (lit) => ctx.tex.draw(64, 64, (g, w, h) => { g.fillStyle = lit ? '#000' : '#2a3946'; g.fillRect(0, 0, w, h); g.fillStyle = lit ? '#ffd890' : '#7f9bb0'; g.fillRect(6, 6, w - 12, h - 12); g.fillStyle = lit ? '#000' : '#d8dcdf'; g.fillRect(w / 2 - 2, 6, 4, h - 12); }, { key: lit ? 'gal_up_lit' : 'gal_up' });
  const arc = Cc.lit('gal-arc', arcTex(false), arcTex(true), 1.1);
  const glassM = [Cc.lit('gal-g0', glassTex(false, 0), glassTex(true, 0), 0.9), Cc.lit('gal-g1', glassTex(false, 1), glassTex(true, 1), 0.9)];
  const upM = Cc.lit('gal-up', upTex(false), upTex(true), 0.9);
  const stone = N.toon(TNm('#d9cfba', { paint: 0.06 }), '#ffd9a0', 0.34), stoneD = N.toon(TNm('#b8ad97', { paint: 0.06 }), '#ffd9a0', 0.26), stoneL = N.toon(TNm('#e6ddca', { paint: 0.05 }), '#ffe2b0', 0.45);
  const roofBand = TNm('#34373c'), dark = TNm('#15191e'), metal = T('#9aa1a8', { name: 'gal-metal' });
  const word = (text, key, w, h) => {
    const mk = (col, k) => ctx.tex.draw(1024, Math.round(1024 * h / w), (g, W2, H2) => { g.clearRect(0, 0, W2, H2); g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${H2 * 0.72}px "Noto Sans", sans-serif`; g.fillText(text.split('').join(' '), W2 / 2, H2 * 0.54); }, { key: k, anisotropy: 8 });
    const tex = mk('#2f3338', key), lit = mk('#fff3d6', key + '_lit');
    const m = T('#ffffff', { map: tex, alphaTest: 0.4, side: 'double', paint: 0, name: 'gal-' + key }); m.emissiveMap = lit; m.userData.noOutline = true; return N.toon(m, '#ffffff', 1.1, 0.0);
  };
  const wordM = word('GALERIA', 'gal_word', 12, 1.5);

  // ------------------------------------------------------------------ one facade bay (frame: x along the wall, z into the building)
  let bi = 0;
  function bay(pitch, h, portal) {
    const hp = pitch / 2, k = bi++;
    P.box(stoneD, -hp, hp, 0, 0.7, -0.35, 0.5, 'bs');
    P.box(stone, -hp, -hp + PIER, 0.7, h - 2.8, -0.3, 0.5, 's'); P.box(stone, hp - PIER, hp, 0.7, h - 2.8, -0.3, 0.5, 's');
    P.box(stoneL, -hp - 0.05, -hp + PIER + 0.1, h - 3.2, h - 2.4, -0.38, -0.3, 's');                                      // pilaster capital band
    if (!portal) {
      P.quad(arc, [hp - PIER, 0.7, 0.5], [-hp + PIER, 0.7, 0.5], [-hp + PIER, 5.4, 0.5], [hp - PIER, 5.4, 0.5], [0, 0, -1], [[1, 0], [0, 0], [0, 1], [1, 1]].map(([a, b]) => [1 - a, b]));
    } else {
      P.box(dark, -hp + PIER, hp - PIER, 0.0, 5.4, 0.3, 0.6, 's');                                                      // deep opening (the doors are the gap in the colliders)
    }
    P.box(stone, -hp + PIER, hp - PIER, 5.4, 6.3, -0.25, 0.5, 's'); P.box(stoneL, -hp + PIER, hp - PIER, 5.4, 5.55, -0.32, -0.25, 's');
    // tall glazed windows, levels 2-4
    P.quad(glassM[(k * 7 + 3) % 5 === 0 ? 1 : 0], [hp - PIER, 6.3, 0.5], [-hp + PIER, 6.3, 0.5], [-hp + PIER, 15.6, 0.5], [hp - PIER, 15.6, 0.5], [0, 0, -1], [[1, 0], [0, 0], [0, 1], [1, 1]].map(([a, b]) => [1 - a, b]));
    P.box(stone, -hp + PIER, hp - PIER, 15.6, 16.5, -0.25, 0.5, 's');
    // level 5: three small square windows
    for (const s of [-1, 0, 1]) { const x = s * (pitch - 2 * PIER) / 3.4; P.quad(upM, [x + 0.55, 16.7, 0.5], [x - 0.55, 16.7, 0.5], [x - 0.55, 18.5, 0.5], [x + 0.55, 18.5, 0.5], [0, 0, -1], [[1, 0], [0, 0], [0, 1], [1, 1]].map(([a, b]) => [1 - a, b])); P.box(stoneL, x - 0.7, x + 0.7, 18.5, 18.7, -0.1, 0.5, 'bs'); }
    // deep cornice + the dark sloping band under the flat roof
    P.box(stone, -hp, hp, 19.0, 19.5, -0.45, 0.5, 'bs'); P.box(stoneL, -hp, hp, 19.5, 20.2, -0.8, 0.5, 'bs'); P.box(stoneD, -hp, hp, 20.2, 20.35, -0.7, 0.4, 'bs');
    P.quad(roofBand, [hp, 20.3, -0.6], [-hp, 20.3, -0.6], [-hp, 22.0, 1.6], [hp, 22.0, 1.6], [0, 0.9, -0.45]);
  }
  const wallBays = (ring, h, portalAt, o = {}) => wallRun(P, ring, (e) => {
    const n = Math.max(1, Math.round(e.len / (o.pitch || 6))), pitch = e.len / n;
    for (let j = 0; j < n; j++) {
      P.push((j + 0.5) * pitch, 0, 0, 0);
      // world position of the bay centre (for portals): a + (b - a) * s
      const s = (j + 0.5) * pitch / e.len, bx = e.a[0] + (e.b[0] - e.a[0]) * s, bz = e.a[1] + (e.b[1] - e.a[1]) * s;
      bay(pitch, h, portalAt && portalAt(bx, bz, pitch));
      P.pop();
    }
    if (e.len > 40 && o.words) {                         // the plain wordmark at the middle of a long frontage
      const m = e.len / 2; P.push(m, 0, 0, 0); P.quad(wordM, [6.4, 16.9, -0.5], [-6.4, 16.9, -0.5], [-6.4, 18.5, -0.5], [6.4, 18.5, -0.5], [0, 0, -1], [[1, 0], [0, 0], [0, 1], [1, 1]].map(([a, b]) => [1 - a, b])); P.pop();
    }
  }, { inside: o.inside });

  // ------------------------------------------------------------------ the main body: perimeter walls, roof, skylight strips
  const main = L.buildingById('r8522850'), outer = ringOf(main.polys[0].o);
  const circle = ringOf(L.buildingById('w434622477').polys[0].o);
  const inMain = (x, z) => inside(outer, x, z);
  wallBays(outer, H, (x, z, p) => Math.hypot(x - PORT.x, z - PORT.z) < p * 0.6, { inside: (x, z) => inMain(x, z) && !inside(circle, x, z), words: true });
  cellCap(P, T('#50545a', { name: 'gal-roof' }), outer, H + 0.05, { maxEdge: 24, uvs: 8 });
  // roof plant: skylight strips (the OSM parts) as glazed ridges, a few plant boxes
  const skyMat = ctx.mat.emissive('#9ec4dd', 0.8); N.basic(skyMat, 0.7, 1.4);
  for (const id of ['w434622479', 'w434622481', 'w434622482', 'w434622484']) {
    const r = ringOf(L.buildingById(id).polys[0].o); P.prism(skyMat, r, H, H + 1.2, 't'); P.prism(stoneD, r.map((p) => p), H, H + 0.25, '');
  }
  for (let i = 0; i < 14; i++) { const t = rng(), u = rng(); const x = 440 + t * 120, z = 500 + u * 160; if (L.insideBuilding(x, z, 3) && !L.isOnRoad(x, z, 0)) P.box(T('#8b9096', { name: 'gal-plant' }), x - 2, x + 2, H, H + 1.8 + rng() * 1.2, z - 1.5, z + 1.5); }

  // ------------------------------------------------------------------ the round atrium w434622477 sits inside the north lobe: a glazed skylight drum on the roof, the main portal gets a canopy
  const RH = H;
  P.cyl(skyMat, CX, CZ, RH, RH + 3.2, 8.5, 8.5, 20, true); P.cyl(roofBand, CX, CZ, RH + 3.2, RH + 3.5, 9.2, 8.2, 20);
  P.cyl(stoneL, CX, CZ, RH, RH + 0.6, 9.1, 9.1, 20, true);
  const canopyG = T('#9fbccb', { paint: 0, transparent: true, opacity: 0.45, depthWrite: false, name: 'gal-canopy' }); canopyG.userData.noOutline = true;
  {
    P.push(PORT.x, 0, PORT.z, 0);
    P.box(metal, -4.0, 4.0, 5.6, 5.75, -4.2, -0.3, 's'); P.quad(canopyG, [-4.0, 5.75, -4.2], [4.0, 5.75, -4.2], [4.0, 5.75, -0.3], [-4.0, 5.75, -0.3], [0, 1, 0]);
    for (const s of [-1, 1]) P.box(metal, s * 3.9 - 0.05, s * 3.9 + 0.05, 0, 5.6, -4.15, -4.05, 's');
    P.quad(wordM, [6.0, 14.0, -0.8], [-6.0, 14.0, -0.8], [-6.0, 15.4, -0.8], [6.0, 15.4, -0.8], [0, 0, -1], [[1, 0], [0, 0], [0, 1], [1, 1]].map(([a, b]) => [1 - a, b]));
    P.pop();
  }

  // ------------------------------------------------------------------ the interior: round atrium + mall street (own frames)
  const floorTex = ctx.tex.draw(256, 256, () => {}, { key: 'st_floor', repeat: [1, 1] });
  const floorM = T('#ffffff', { map: floorTex, paint: 0.02, name: 'gal-floor' });
  const plaster = TNm('#ece6d8', { name: 'in' }), woodM = T(C.wood), metalD = T(C.metal);
  const glowW = ctx.mat.emissive('#ffe7b0', 1.0); N.basic(glowW, 0.85, 1.4);
  const ledPink = ctx.mat.emissive('#ffd9a0', 1.0);
  const names = ['Одежда', 'Обувь', 'Кофейня', 'Книги', 'Аксессуары', 'Электроника', 'Подарки', 'Игрушки', 'Спорт', 'Косметика', 'Бижутерия', 'Фастфуд', 'Бельё', 'Часы', 'Сумки', 'Оптика'];
  const signCols = [['#1d1d22', '#ffffff'], ['#6b2a3a', '#fff0d6'], ['#154a3a', '#e8fff3'], ['#1d3b6b', '#ffffff'], ['#2b2b30', '#ffd24a'], ['#5a3a12', '#fff2dd']];
  let si = 0;
  const signMat = () => { const nm = names[si % names.length], col = signCols[si % signCols.length]; si++; const m = T('#ffffff', { map: ctx.tex.sign({ w: 256, h: 64, bg: col[0], fg: col[1], text: nm, size: 38, key: 'gal_s_' + nm + col[0], font: '"Noto Sans", sans-serif' }), paint: 0, name: 'gal-s-' + nm }); m.emissiveMap = m.map; return N.toon(m, '#ffffff', 0.8, 0.25); };
  // ---- rotunda hall
  {
    const seg = 24;
    const ring = (r) => Array.from({ length: seg }, (_, i) => { const a = i / seg * Math.PI * 2; return [CX + Math.cos(a) * r, CZ + Math.sin(a) * r]; });
    P.cap(floorM, ring(R_IN + 0.4), 0.03, true, 4.8);
    // inner wall (faces the centre): plaster, shop band lit, gallery rings with glass rails
    const inner = ring(R_IN);
    for (let i = 0; i < seg; i++) {
      const p = inner[i], q = inner[(i + 1) % seg], mx = (p[0] + q[0]) / 2 - CX, mz = (p[1] + q[1]) / 2 - CZ, ml = Math.hypot(mx, mz), n = [-mx / ml, 0, -mz / ml];
      P.quad(plaster, [p[0], 0, p[1]], [q[0], 0, q[1]], [q[0], 16.4, q[1]], [p[0], 16.4, p[1]], n);
      for (const y of [5.6, 10.8]) { // gallery ring slab + lit shop windows above
        const ox = n[0] * -2.2, oz = n[2] * -2.2;
        P.quad(stoneD, [p[0], y, p[1]], [q[0], y, q[1]], [q[0] + n[0] * 2.4, y, q[1] + n[2] * 2.4], [p[0] + n[0] * 2.4, y, p[1] + n[2] * 2.4], [0, 1, 0]);
        P.quad(stoneD, [p[0] + n[0] * 2.4, y - 0.4, p[1] + n[2] * 2.4], [q[0] + n[0] * 2.4, y - 0.4, q[1] + n[2] * 2.4], [q[0] + n[0] * 2.4, y, q[1] + n[2] * 2.4], [p[0] + n[0] * 2.4, y, p[1] + n[2] * 2.4], n);
        P.quad(glowW, [p[0] + n[0] * 0.05, y + 0.3, p[1] + n[2] * 0.05], [q[0] + n[0] * 0.05, y + 0.3, q[1] + n[2] * 0.05], [q[0] + n[0] * 0.05, y + 3.2, q[1] + n[2] * 0.05], [p[0] + n[0] * 0.05, y + 3.2, p[1] + n[2] * 0.05], n);
        P.quad(canopyG, [p[0] + n[0] * 2.3, y + 0.0, p[1] + n[2] * 2.3], [q[0] + n[0] * 2.3, y + 0.0, q[1] + n[2] * 2.3], [q[0] + n[0] * 2.3, y + 1.1, q[1] + n[2] * 2.3], [p[0] + n[0] * 2.3, y + 1.1, p[1] + n[2] * 2.3], n);
      }
      // ground-floor shop fronts (skip the three portals and the south opening)
      const ang = Math.atan2(mx, -mz) * 180 / Math.PI;          // bearing of the segment from the centre (0 = north)
      const open = Math.abs(((ang - 0 + 540) % 360) - 180) < 20 || Math.abs(((ang - 190 + 540) % 360) - 180) < 24;
      if (!open) {
        P.quad(glowW, [p[0] + n[0] * 0.04, 0.2, p[1] + n[2] * 0.04], [q[0] + n[0] * 0.04, 0.2, q[1] + n[2] * 0.04], [q[0] + n[0] * 0.04, 3.0, q[1] + n[2] * 0.04], [p[0] + n[0] * 0.04, 3.0, p[1] + n[2] * 0.04], n);
        const m = signMat(); P.quad(m, [p[0] + n[0] * 0.06, 3.1, p[1] + n[2] * 0.06], [q[0] + n[0] * 0.06, 3.1, q[1] + n[2] * 0.06], [q[0] + n[0] * 0.06, 3.9, q[1] + n[2] * 0.06], [p[0] + n[0] * 0.06, 3.9, p[1] + n[2] * 0.06], n, [[1, 0], [0, 0], [0, 1], [1, 1]].map(([a, b]) => [1 - a, b]));
      }
    }
    // ceiling ring + glazed skylight disc
    for (let i = 0; i < seg; i++) { const p = inner[i], q = inner[(i + 1) % seg], r2 = 8.5; const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2; P.quad(plaster, [p[0], 16.4, p[1]], [q[0], 16.4, q[1]], [CX + Math.cos(a1) * r2, 16.4, CZ + Math.sin(a1) * r2], [CX + Math.cos(a0) * r2, 16.4, CZ + Math.sin(a0) * r2], [0, -1, 0]); }
    P.cyl(glowW, CX, CZ, 16.35, 16.4, 8.5, 8.5, 24, true);
    P.quad(skyMat, [CX - 8.5, 16.3, CZ - 8.5], [CX + 8.5, 16.3, CZ - 8.5], [CX + 8.5, 16.3, CZ + 8.5], [CX - 8.5, 16.3, CZ + 8.5], [0, -1, 0]);
    // centre: round info island with a bench ring, two decorative escalator flights toward the mall street
    P.cyl(stoneD, CX, CZ, 0, 0.5, 3.4, 3.4, 18); P.cyl(woodM, CX, CZ, 0.5, 0.58, 3.4, 3.4, 18); P.cyl(metalD, CX, CZ, 0.58, 1.1, 2.0, 2.0, 14); P.cyl(glowW, CX, CZ, 1.1, 1.16, 2.0, 2.0, 14);
    ctx.physics.addCylinder(CX, CZ, 3.5, 0, 2);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2, bx = CX + Math.cos(a) * 6.2, bz = CZ + Math.sin(a) * 6.2; P.push(bx, 0, bz, -a + Math.PI / 2); P.box(woodM, -1.2, 1.2, 0.42, 0.48, -0.25, 0.25); P.box(woodM, -1.2, 1.2, 0.55, 1.0, 0.25, 0.3); for (const s of [-1, 1]) P.box(metalD, s * 1.15 - 0.04, s * 1.15 + 0.04, 0, 0.45, -0.22, 0.22); P.pop(); ctx.physics.addCylinder(bx, bz, 1.0, 0, 1.0); }
    // wall thickness pieces beside the portals (the 17 m shell is drawn as bays; interior side already covered)
  }
  // ---- entrance corridor: from the portal (z 423.3) south to the atrium (z 454.4), 8 m wide, shop windows on both walls, skylight strip
  {
    const x0 = PORT.x - 4, x1 = PORT.x + 4, z0 = PORT.z + 0.7, z1 = CZ - R_IN + 0.2, h = 8.5;
    P.quad(floorM, [x0, 0.03, z0], [x1, 0.03, z0], [x1, 0.03, z1], [x0, 0.03, z1], [0, 1, 0], [[x0 / 4.8, z0 / 4.8], [x1 / 4.8, z0 / 4.8], [x1 / 4.8, z1 / 4.8], [x0 / 4.8, z1 / 4.8]]);
    P.quad(plaster, [x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1], [0, -1, 0]);
    P.quad(skyMat, [PORT.x - 1.5, h - 0.05, z0 + 2], [PORT.x + 1.5, h - 0.05, z0 + 2], [PORT.x + 1.5, h - 0.05, z1 - 2], [PORT.x - 1.5, h - 0.05, z1 - 2], [0, -1, 0]);
    for (const s of [-1, 1]) {
      const x = s < 0 ? x0 : x1, nx = -s;
      P.quad(plaster, [x, 0, s < 0 ? z0 : z1], [x, 0, s < 0 ? z1 : z0], [x, h, s < 0 ? z1 : z0], [x, h, s < 0 ? z0 : z1], [nx, 0, 0]);
      for (let z = z0 + 2; z < z1 - 5; z += 6.2) {
        P.quad(glowW, [x + nx * 0.04, 0.3, z - 2.6], [x + nx * 0.04, 0.3, z + 2.6], [x + nx * 0.04, 3.0, z + 2.6], [x + nx * 0.04, 3.0, z - 2.6], [nx, 0, 0]);
        P.quad(signMat(), [x + nx * 0.06, 3.1, z + 2.5 * (nx > 0 ? 1 : -1)], [x + nx * 0.06, 3.1, z - 2.5 * (nx > 0 ? 1 : -1)], [x + nx * 0.06, 3.8, z - 2.5 * (nx > 0 ? 1 : -1)], [x + nx * 0.06, 3.8, z + 2.5 * (nx > 0 ? 1 : -1)], [nx, 0, 0], [[1, 0], [0, 0], [0, 1], [1, 1]].map(([a, b]) => [1 - a, b]));
        P.quad(glowW, [x + nx * 0.04, 5.0, z - 2.6], [x + nx * 0.04, 5.0, z + 2.6], [x + nx * 0.04, 7.6, z + 2.6], [x + nx * 0.04, 7.6, z - 2.6], [nx, 0, 0]);
      }
    }
    for (const z of [z0 + 10, z0 + 22]) for (const bx of [x0 + 1.2, x1 - 1.2]) { P.push(bx, 0, z, 0); P.box(woodM, -0.4, 0.4, 0.42, 0.48, -1.2, 1.2); P.box(woodM, bx < PORT.x ? -0.45 : 0.4, bx < PORT.x ? -0.4 : 0.45, 0.55, 1.0, -1.2, 1.2); P.pop(); }
  }
  // ---- mall street (frame at the rotunda centre, local +z toward the south end)
  {
    P.push(CX, 0, CZ, GAL.rotY);
    const z0 = R_IN - 0.5, z1 = GAL.len, hw = GAL.w / 2, h = GAL.h;
    P.quad(floorM, [-hw, 0.03, z0], [hw, 0.03, z0], [hw, 0.03, z1], [-hw, 0.03, z1], [0, 1, 0], [[-hw / 4.8, z0 / 4.8], [hw / 4.8, z0 / 4.8], [hw / 4.8, z1 / 4.8], [-hw / 4.8, z1 / 4.8]]);
    P.quad(plaster, [-hw, h, z0], [hw, h, z0], [hw, h, z1], [-hw, h, z1], [0, -1, 0]);
    P.quad(skyMat, [-3, h - 0.05, z0 + 2], [3, h - 0.05, z0 + 2], [3, h - 0.05, z1 - 2], [-3, h - 0.05, z1 - 2], [0, -1, 0]);
    P.quad(plaster, [hw, 0, z1], [-hw, 0, z1], [-hw, h, z1], [hw, h, z1], [0, 0, -1]);
    const endSign = word('ГАЛЕРЕЯ', 'gal_word3', 12, 1.5); P.quad(endSign, [3.2, 6.2, z1 - 0.05], [-3.2, 6.2, z1 - 0.05], [-3.2, 7.6, z1 - 0.05], [3.2, 7.6, z1 - 0.05], [0, 0, -1], [[1, 0], [0, 0], [0, 1], [1, 1]].map(([a, b]) => [1 - a, b]));
    for (const s of [-1, 1]) {
      const x = s * hw, nx = -s;
      P.quad(plaster, [x, 0, s > 0 ? z0 : z1], [x, 0, s > 0 ? z1 : z0], [x, h, s > 0 ? z1 : z0], [x, h, s > 0 ? z0 : z1], [nx, 0, 0]);
      for (let z = z0 + 4; z < z1 - 6; z += 7.4) {
        const x0 = x, x1 = x + nx * 2.4;
        P.box(dark, Math.min(x0, x1), Math.max(x0, x1), 0, 3.8, z - 3.4, z + 3.4, 't' + (s > 0 ? 'r' : 'l'));
        P.quad(glowW, [x1 + nx * 0.03, 0.2, z - 3.1], [x1 + nx * 0.03, 0.2, z + 3.1], [x1 + nx * 0.03, 2.9, z + 3.1], [x1 + nx * 0.03, 2.9, z - 3.1], [nx, 0, 0]);
        P.quad(signMat(), [x1 + nx * 0.05, 3.0, z + 3.0 * (nx > 0 ? 1 : -1)], [x1 + nx * 0.05, 3.0, z - 3.0 * (nx > 0 ? 1 : -1)], [x1 + nx * 0.05, 3.7, z - 3.0 * (nx > 0 ? 1 : -1)], [x1 + nx * 0.05, 3.7, z + 3.0 * (nx > 0 ? 1 : -1)], [nx, 0, 0]);
        // upper level windows (lit) above the units
        P.quad(glowW, [x + nx * 0.04, 5.2, z - 3.1], [x + nx * 0.04, 5.2, z + 3.1], [x + nx * 0.04, 8.8, z + 3.1], [x + nx * 0.04, 8.8, z - 3.1], [nx, 0, 0]);
      }
    }
    for (let z = z0 + 6; z < z1 - 4; z += 9) { for (const bx of [-3.2, 3.2]) { P.push(bx, 0, z, Math.PI / 2); P.box(woodM, -1.2, 1.2, 0.42, 0.48, -0.25, 0.25); P.box(woodM, -1.2, 1.2, 0.55, 1.0, 0.25, 0.3); P.pop(); P.cyl(T('#f0ede6', { name: 'gal-pot' }), bx * 1.5, z + 4.2, 0, 0.8, 0.5, 0.45, 10); P.cyl(T('#3f7a3a', { paint: 0.1, name: 'gal-plant2' }), bx * 1.5, z + 4.2, 0.8, 1.9, 0.55, 0.2, 8); } }
    P.pop();
  }

  const g = new THREE.Group(); g.name = 'galereya';
  P.build(g, {});
  ctx.addStatic(g);
  Cc.parts.mallTris = P.tris;

  // ------------------------------------------------------------------ colliders
  const boxes = (ring, gaps, th = 0.9, y1 = 25, skip = () => false) => {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.3 || skip(a, b)) continue;
      const ux = dx / l, uz = dz / l, cuts = [];
      for (const d of gaps) { const px = d.x - a[0], pz = d.z - a[1], t = px * ux + pz * uz, off = Math.abs(px * -uz + pz * ux); if (off < (d.off || 2.2) && t > -d.w / 2 && t < l + d.w / 2) cuts.push([Math.max(0, t - d.w / 2), Math.min(l, t + d.w / 2)]); }
      cuts.sort((m, n) => m[0] - n[0]);
      let s0 = 0; const pieces = [];
      for (const c of cuts) { if (c[0] > s0 + 0.05) pieces.push([s0, c[0]]); s0 = Math.max(s0, c[1]); }
      if (s0 < l - 0.05) pieces.push([s0, l]);
      for (const [t0, t1] of pieces) { const len = t1 - t0; if (len < 0.3) continue; ctx.physics.addBox(a[0] + ux * (t0 + t1) / 2, a[1] + uz * (t0 + t1) / 2, len + 0.2, th, Math.atan2(-dz, dx), 0, y1); }
    }
  };
  boxes(outer, [{ x: PORT.x, z: PORT.z, w: PORT.w, off: 3 }], 0.9, 25, (a, b) => inside(circle, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2));       // outer walls: the only door is the main portal
  const gal = (lx, lz) => [CX + lx * Math.cos(GAL.rotY) + lz * Math.sin(GAL.rotY), CZ - lx * Math.sin(GAL.rotY) + lz * Math.cos(GAL.rotY)];
  const southGap = { x: gal(0, R_IN)[0], z: gal(0, R_IN)[1], w: GAL.w + 1.5, off: 3 };
  const wallRing = Array.from({ length: 24 }, (_, i) => [CX + Math.cos(i / 24 * Math.PI * 2) * (R_IN + 0.7), CZ + Math.sin(i / 24 * Math.PI * 2) * (R_IN + 0.7)]);
  boxes(wallRing, [{ x: CX, z: CZ - R_IN, w: 9.5, off: 3 }, southGap], 1.2, 25);                                  // the atrium ring wall (north opening to the corridor, south opening to the street)
  { const cz0 = PORT.z + 0.7, cz1 = CZ - R_IN + 0.3; ctx.physics.addBox(PORT.x - 4.6, (cz0 + cz1) / 2, 1.2, cz1 - cz0, 0, 0, 25); ctx.physics.addBox(PORT.x + 4.6, (cz0 + cz1) / 2, 1.2, cz1 - cz0, 0, 0, 25); }
  // mall street walls + end wall (local rectangle)
  const rect = (lx0, lx1, lz0, lz1) => { const c = gal((lx0 + lx1) / 2, (lz0 + lz1) / 2); ctx.physics.addBox(c[0], c[1], lx1 - lx0, lz1 - lz0, GAL.rotY, 0, 25); };
  rect(-GAL.w / 2 - 1.2, -GAL.w / 2, R_IN, GAL.len + 1); rect(GAL.w / 2, GAL.w / 2 + 1.2, R_IN, GAL.len + 1); rect(-GAL.w / 2, GAL.w / 2, GAL.len, GAL.len + 1.2);
  for (let z = R_IN - 0.5 + 4; z < GAL.len - 6; z += 7.4) { rect(-GAL.w / 2, -GAL.w / 2 + 2.4, z - 3.4, z + 3.4); rect(GAL.w / 2 - 2.4, GAL.w / 2, z - 3.4, z + 3.4); }
  // zone: rotunda + street
  if (ctx.zones && ctx.zones.add) ctx.zones.add({
    id: 'galereya',
    test: (x, y, z) => { if (y > 18) return false; if (Math.hypot(x - CX, z - CZ) < R_IN + 0.3) return true; if (Math.abs(x - PORT.x) < 4.3 && z > PORT.z && z < CZ - R_IN + 1) return true; const dx = x - CX, dz = z - CZ, c = Math.cos(GAL.rotY), s = Math.sin(GAL.rotY), lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) < GAL.w / 2 + 0.3 && lz > R_IN - 1 && lz < GAL.len + 0.3; },
    indoor: { name: 'ТРЦ «Галерея»', sun: 0.0, sky: false, shadows: false, ambient: { color: '#fff4e6', ground: '#d8cbb6', intensity: 1.8 }, fog: { color: '#d9d3c6', density: 0.002 }, key: { color: '#fff0dc', intensity: 1.25, dir: [0.2, 0.9, 0.3] } },
  });
  // photo spots / monument entries
  Cc.svc.photoSpots.push({ x: PORT.x + 3, z: PORT.z - 40, yaw: L.yawToward(PORT.x + 3, PORT.z - 40, PORT.x, PORT.z), name: 'ТРЦ «Галерея» · Galereya mall, rotunda entrance' });
  return g;
}
