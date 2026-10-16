// landmarksK/art.js - the canvas paintings of the Church of the Saviour on Spilled Blood and its surroundings: brick, granite, the five enamel onions, the tent tiles, porch roof tiles, spire scales,
// arcades, tile belts, the exterior MOSAICS (Christ in Glory, the Resurrection, the four Vasnetsov tympana, the Holy Face lunette, the Calvary niche, the gold-ground icons, the coats of arms of the
// governorates) and the Winkler fence panel.  Painted impressions (readable colours and compositions of docs/research/saviour-mikhailovsky.md 3.2 - 3.8, photos refs/saviour 011 007 039 078 027 029 041), not copies.
// Everything returns a THREE.CanvasTexture (cached by key).  The mosaics get a faint tesserae grid.  Texture sizes <= 1024.
import * as THREE from 'three';

const TAU = Math.PI * 2;
export const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), r = Math.min(255, Math.round(((n >> 16) & 255) * k)), g = Math.min(255, Math.round(((n >> 8) & 255) * k)), b = Math.min(255, Math.round((n & 255) * k));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
};
const mix = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
};

export function makeArt(ctx) {
  const tex = ctx.tex, A = {};
  const D = (w, h, fn, key, repeat = [1, 1]) => tex.draw(w, h, fn, { key: 'lmK-' + key, repeat });
  const ell = (g, cx, cy, rx, ry, fill, rot = 0) => { g.fillStyle = fill; g.beginPath(); g.ellipse(cx, cy, rx, ry, rot, 0, TAU); g.fill(); };
  const poly = (g, pts, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); };
  const tess = (g, w, h, cell = 4, a = 0.1) => {                                         // tesserae grid of a mosaic
    g.fillStyle = `rgba(30,20,10,${a})`;
    for (let x = 0; x < w; x += cell) g.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += cell) g.fillRect(0, y, w, 1);
  };

  // ---------------------------------------------------------------------------------------------- walls
  /** red Siegersdorf brick: courses of 11 px (6.5 cm at 170 px/m), a tile of 3 m, with ochre diamond diapers; colours painted, the material is white */
  A.brick = D(512, 512, (g, w, h) => {
    const r = ctx.rng(31);
    g.fillStyle = '#6e5246'; g.fillRect(0, 0, w, h);
    const ch = 11, bw = 40;
    for (let row = 0; row * ch < h; row++) {
      const off = (row % 2) * bw / 2;
      for (let x = -bw; x < w + bw; x += bw) {
        const k = 0.86 + r() * 0.26, hue = r();
        g.fillStyle = hue < 0.12 ? `rgb(${186 * k | 0},${124 * k | 0},${98 * k | 0})` : `rgb(${170 * k | 0},${108 * k | 0},${86 * k | 0})`;
        g.fillRect(x + off + 1, row * ch + 1, bw - 2, ch - 2);
      }
    }
    // ochre glazed diamonds (zig-zag diaper): 4 per tile
    g.fillStyle = '#d6aa5c';
    const dia = (cx, cy, s) => { for (let i = -s; i <= s; i++) { const k = s - Math.abs(i); for (let j = -k; j <= k; j++) { if ((i + j) & 1) continue; g.fillRect(cx + i * 10 - 4, cy + j * ch - 5, 8, ch - 3); } } };
    dia(128, 128, 3); dia(384, 128, 3); dia(128, 384, 3); dia(384, 384, 3);
    g.fillStyle = 'rgba(40,20,10,0.08)'; g.fillRect(0, 0, w, h);
  }, 'brick');
  /** rock-faced grey granite blocks 1.1 x 0.6 m, tile 4.4 x 2.4 m (4 columns x 4 rows) */
  A.rock = D(512, 512, (g, w, h) => {
    const r = ctx.rng(7);
    g.fillStyle = '#3c3e42'; g.fillRect(0, 0, w, h);
    const bw = w / 4, bh = h / 4;
    for (let row = 0; row < 4; row++) {
      const off = (row % 2) * bw / 2;
      for (let c = -1; c < 5; c++) {
        const x = c * bw + off, k = 0.82 + r() * 0.3;
        g.fillStyle = `rgb(${168 * k | 0},${170 * k | 0},${172 * k | 0})`; g.fillRect(x + 4, row * bh + 4, bw - 8, bh - 8);
        for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)'; g.fillRect(x + 6 + r() * (bw - 14), row * bh + 6 + r() * (bh - 14), 3 + r() * 9, 2 + r() * 6); }
      }
    }
  }, 'rock');
  /** dressed pink-red granite blocks (fence plinth, vases): tile 3.2 x 1.4 m, joints */
  A.pinkBlocks = D(256, 128, (g, w, h) => {
    const r = ctx.rng(17);
    g.fillStyle = '#5a4140'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 2; row++) for (let c = 0; c < 2; c++) {
      const k = 0.88 + r() * 0.2, x = c * 128 + (row ? 64 : 0) - (row ? 64 : 0);
      g.fillStyle = `rgb(${190 * k | 0},${132 * k | 0},${124 * k | 0})`; g.fillRect(((x + (row ? 64 : 0)) % w) + 2, row * 64 + 2, 124, 60);
      for (let i = 0; i < 30; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,230,220,0.18)' : 'rgba(40,20,20,0.2)'; g.fillRect(r() * w, row * 64 + 4 + r() * 54, 2 + r() * 5, 1 + r() * 3); }
    }
  }, 'pinkBlocks');
  /** smooth light-grey granite plinth with faint joints, tile 3 x 3 m */
  A.slab = D(256, 256, (g, w, h) => {
    const r = ctx.rng(5);
    g.fillStyle = '#d8d6d2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(90,86,84,${0.04 + r() * 0.07})`; g.fillRect(r() * w, r() * h, 2 + r() * 5, 2 + r() * 4); }
    g.fillStyle = 'rgba(70,64,60,0.45)'; for (let i = 0; i < 2; i++) g.fillRect(0, i * 128, w, 2); g.fillRect(0, 0, 2, 128); g.fillRect(128, 128, 2, 128);
  }, 'slab');
  /** blue-grey setts in fans (fence base), tile 2.4 m */
  A.sett = D(256, 256, (g, w, h) => {
    const r = ctx.rng(9);
    g.fillStyle = '#2a2c36'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) { const k = 0.8 + r() * 0.45; g.fillStyle = `rgb(${76 * k | 0},${82 * k | 0},${104 * k | 0})`; g.beginPath(); g.ellipse(x + 8 + (y / 16 % 2) * 6, y + 8, 7, 6.5, 0, 0, TAU); g.fill(); }
  }, 'sett');

  // ---------------------------------------------------------------------------------------------- bands, arcades, ornaments
  /** belt of plus-shaped glazed bricks: blue / green / yellow on a brown band; tile 2.8 m x 0.4 m (8 pluses) */
  A.belt = D(256, 36, (g, w, h) => {
    g.fillStyle = '#8a5038'; g.fillRect(0, 0, w, h);
    const col = ['#2f5cb0', '#78b838', '#e8c030'];
    for (let i = 0; i < 8; i++) { const cx = i * 32 + 16, cy = h / 2; g.fillStyle = col[i % 3]; g.fillRect(cx - 4, cy - 12, 8, 24); g.fillRect(cx - 12, cy - 4, 24, 8); g.fillStyle = '#d8b060'; g.fillRect(cx - 2, cy - 2, 4, 4); }
  }, 'belt');
  /** two rows of tiny ochre blind arches over a dentil line: tile 2.4 m x 1.2 m (6 arches) */
  A.arcature = D(256, 128, (g, w, h) => {
    g.fillStyle = '#9a5a42'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 6; i++) {
        const x = i * w / 6 + w / 12, y = 14 + row * 52;
        g.fillStyle = '#e0cfa8'; g.beginPath(); g.moveTo(x - 14, y + 34); g.lineTo(x - 14, y + 14); g.arc(x, y + 14, 14, Math.PI, 0); g.lineTo(x + 14, y + 34); g.fill();
        g.fillStyle = '#6a3a2c'; g.beginPath(); g.moveTo(x - 8, y + 34); g.lineTo(x - 8, y + 16); g.arc(x, y + 16, 8, Math.PI, 0); g.lineTo(x + 8, y + 34); g.fill();
      }
    }
    g.fillStyle = '#e8dcc0'; for (let i = 0; i < 12; i++) g.fillRect(i * 21 + 4, 0, 11, 8);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 118, w, 10);
  }, 'arcature');
  /** chequer of ochre and violet-brown squares (gable ring), tile 0.8 m (2 x 2 squares) */
  A.checker = D(64, 64, (g) => { g.fillStyle = '#d8b060'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#5a4040'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, 64, 4); }, 'checker');
  /** limestone saw-tooth / pyramid-faced stones, tile 0.9 m (2 teeth) */
  A.teeth = D(128, 64, (g, w, h) => {
    g.fillStyle = '#6a5a48'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) { g.fillStyle = '#ddd4b8'; g.fillRect(i * 64 + 4, 4, 52, 56); g.fillStyle = '#f4efe0'; g.beginPath(); g.moveTo(i * 64 + 4, 4); g.lineTo(i * 64 + 56, 4); g.lineTo(i * 64 + 30, 32); g.fill(); g.fillStyle = '#b8ae92'; g.beginPath(); g.moveTo(i * 64 + 56, 4); g.lineTo(i * 64 + 56, 60); g.lineTo(i * 64 + 30, 32); g.fill(); }
  }, 'teeth');
  /** Greek-key meander, white on brown: tile 0.8 x 0.4 m */
  A.meander = D(128, 64, (g, w, h) => {
    g.fillStyle = '#5a3a30'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#eee4d0'; g.lineWidth = 7; g.lineCap = 'square';
    g.beginPath(); g.moveTo(8, 56); g.lineTo(8, 8); g.lineTo(56, 8); g.lineTo(56, 40); g.lineTo(32, 40); g.lineTo(32, 24); g.moveTo(72, 56); g.lineTo(72, 8); g.lineTo(120, 8); g.lineTo(120, 40); g.lineTo(96, 40); g.lineTo(96, 24); g.stroke();
  }, 'meander');

  /** the forecourt paving of the Mikhailovsky Palace: granite tiles in two tones (#b8a8a0 / #d8d0c8), modules of 4 m; tile 8 x 8 m (2 x 2 modules, each cut in 2 x 2 slabs) */
  A.forecourt = D(256, 256, (g, w, h) => {
    const r = ctx.rng(61);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const base = (i + j) % 2 ? '#c4b8b0' : '#dcd4ca', k = 0.97 + r() * 0.06;
      g.fillStyle = shade(base, k); g.fillRect(i * 64, j * 64, 64, 64);
      g.fillStyle = 'rgba(80,66,60,0.35)'; g.fillRect(i * 64, j * 64, 64, 2); g.fillRect(i * 64, j * 64, 2, 64); g.fillRect(i * 64 + 32, j * 64, 1, 64); g.fillRect(i * 64, j * 64 + 32, 64, 1);
    }
  }, 'forecourt');
  /** a baluster band (turned balusters in cream on a dark shadow), tile 0.8 x 0.8 m (2 balusters) */
  A.balusters = D(128, 128, (g, w, h) => {
    g.fillStyle = '#5a4a3c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8dfc6'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
    for (let i = 0; i < 2; i++) { const x = i * 64 + 32; g.fillStyle = '#e8dfc6'; g.beginPath(); g.moveTo(x - 9, 16); g.lineTo(x + 9, 16); g.quadraticCurveTo(x + 6, 36, x + 8, 50); g.quadraticCurveTo(x + 22, 66, x + 8, 82); g.quadraticCurveTo(x + 4, 96, x + 9, 112); g.lineTo(x - 9, 112); g.quadraticCurveTo(x - 4, 96, x - 8, 82); g.quadraticCurveTo(x - 22, 66, x - 8, 50); g.quadraticCurveTo(x - 6, 36, x - 9, 16); g.fill(); g.fillStyle = '#c8bea4'; g.fillRect(x + 2, 20, 6, 90); }
  }, 'balusters');
  /** a drum arcade: n round white arches on turned colonnettes over a brick wall (one tile = the whole circumference), 1024 x 256 */
  const arcade = (n, key) => D(1024, 256, (g, w, h) => {
    g.fillStyle = '#b88670'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(70,30,20,0.25)'; for (let y = 0; y < h; y += 11) g.fillRect(0, y, w, 1);
    const pw = w / n;
    for (let i = 0; i < n; i++) {
      const x = i * pw + pw / 2, aw = pw * 0.62;
      g.fillStyle = '#1e2430'; g.beginPath(); g.moveTo(x - aw / 2, 224); g.lineTo(x - aw / 2, 100); g.arc(x, 100, aw / 2, Math.PI, 0); g.lineTo(x + aw / 2, 224); g.fill();
      g.strokeStyle = '#ece4d0'; g.lineWidth = 11; g.beginPath(); g.moveTo(x - aw / 2 - 6, 230); g.lineTo(x - aw / 2 - 6, 100); g.arc(x, 100, aw / 2 + 6, Math.PI, 0); g.lineTo(x + aw / 2 + 6, 230); g.stroke();
      g.fillStyle = '#ece4d0'; g.fillRect(i * pw - 7, 70, 14, 170); g.beginPath(); g.ellipse(i * pw, 120, 11, 9, 0, 0, TAU); g.ellipse(i * pw, 180, 11, 9, 0, 0, TAU); g.fill();
    }
    g.fillStyle = '#e8dfc6'; g.fillRect(0, 0, w, 34); g.fillStyle = '#b8ae92'; for (let i = 0; i < 64; i++) g.fillRect(i * 16 + 3, 8, 8, 18);
    g.fillStyle = '#e8dfc6'; g.fillRect(0, 238, w, 18);
  }, key);
  A.arcade6 = arcade(6, 'arcade6'); A.arcade8 = arcade(8, 'arcade8'); A.arcade12 = arcade(12, 'arcade12');
  /** the ring of brick kokoshniks with blue saint roundels (circumference tile): 12 arches, 1024 x 128 */
  A.kokoshnik = D(1024, 128, (g, w, h) => {
    g.fillStyle = '#a86a54'; g.fillRect(0, 0, w, h);
    const n = 12, pw = w / n;
    for (let i = 0; i < n; i++) {
      const x = i * pw + pw / 2;
      g.fillStyle = '#e4dcc4'; g.beginPath(); g.moveTo(x - pw * 0.46, 126); g.quadraticCurveTo(x - pw * 0.46, 40, x, 6); g.quadraticCurveTo(x + pw * 0.46, 40, x + pw * 0.46, 126); g.fill();
      g.fillStyle = '#b86a48'; g.beginPath(); g.moveTo(x - pw * 0.38, 126); g.quadraticCurveTo(x - pw * 0.38, 48, x, 18); g.quadraticCurveTo(x + pw * 0.38, 48, x + pw * 0.38, 126); g.fill();
      g.fillStyle = '#2a58a8'; g.beginPath(); g.arc(x, 76, pw * 0.2, 0, TAU); g.fill();
      g.fillStyle = '#e8c070'; g.beginPath(); g.arc(x, 72, pw * 0.07, 0, TAU); g.fill(); g.fillStyle = '#d8b898'; g.fillRect(x - pw * 0.05, 78, pw * 0.1, pw * 0.1);
    }
  }, 'kokoshnik');
  /** belfry / tent-drum wall with three tall dark arched openings and white pilaster strips: one face, 256 x 512 */
  A.belfry = D(256, 512, (g, w, h) => {
    g.fillStyle = '#b07458'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(70,30,20,0.22)'; for (let y = 0; y < h; y += 11) g.fillRect(0, y, w, 1);
    for (let i = 0; i < 3; i++) {
      const x = 42 + i * 86, aw = 56;
      g.fillStyle = '#1c2230'; g.beginPath(); g.moveTo(x - aw / 2, 480); g.lineTo(x - aw / 2, 150); g.arc(x, 150, aw / 2, Math.PI, 0); g.lineTo(x + aw / 2, 480); g.fill();
      g.strokeStyle = '#ece4d0'; g.lineWidth = 8; g.beginPath(); g.moveTo(x - aw / 2 - 5, 490); g.lineTo(x - aw / 2 - 5, 150); g.arc(x, 150, aw / 2 + 5, Math.PI, 0); g.lineTo(x + aw / 2 + 5, 490); g.stroke();
    }
    g.fillStyle = '#ece4d0'; g.fillRect(0, 0, 12, h); g.fillRect(w - 12, 0, 12, h); g.fillRect(0, 0, w, 40); g.fillRect(0, 60, w, 8);
  }, 'belfry');
  /** the tower belt of arches with blue roundels (23 - 29 m): 4 arches per face, 512 x 256 */
  A.archBelt = D(512, 256, (g, w, h) => {
    g.fillStyle = '#a86a54'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(70,30,20,0.22)'; for (let y = 0; y < h; y += 11) g.fillRect(0, y, w, 1);
    for (let i = 0; i < 4; i++) {
      const x = i * 128 + 64;
      g.fillStyle = '#e8dfc6'; g.beginPath(); g.moveTo(x - 58, 256); g.lineTo(x - 58, 110); g.arc(x, 110, 58, Math.PI, 0); g.lineTo(x + 58, 256); g.fill();
      g.fillStyle = '#9a5a40'; g.beginPath(); g.moveTo(x - 46, 256); g.lineTo(x - 46, 112); g.arc(x, 112, 46, Math.PI, 0); g.lineTo(x + 46, 256); g.fill();
      g.fillStyle = '#2a58a8'; g.beginPath(); g.arc(x, 150, 30, 0, TAU); g.fill();
      g.fillStyle = '#e8c070'; g.beginPath(); g.arc(x, 144, 11, 0, TAU); g.fill(); g.fillStyle = '#d8a888'; g.fillRect(x - 8, 152, 16, 16);
    }
    g.fillStyle = '#e8dfc6'; g.fillRect(0, 0, w, 22);
  }, 'archBelt');
  /** a majolica tile atlas 4 x 2 cells (64 px): eagle, cartouche, lyre, bird, vase, rosette, cross, star on turquoise */
  A.majolica = D(256, 128, (g, w, h) => {
    const bg = ['#2aa0d8', '#3aa8c8', '#2a98c0', '#38b0a0', '#2aa0d8', '#3aa8c8', '#e8c040', '#2a98c0'];
    for (let i = 0; i < 8; i++) {
      const cx = (i % 4) * 64, cy = Math.floor(i / 4) * 64;
      g.fillStyle = '#5a2a20'; g.fillRect(cx, cy, 64, 64); g.fillStyle = '#b8402a'; g.fillRect(cx + 3, cy + 3, 58, 58); g.fillStyle = bg[i]; g.fillRect(cx + 6, cy + 6, 52, 52);
      g.fillStyle = i === 6 ? '#2a58a8' : '#f4ecd0'; g.strokeStyle = g.fillStyle; g.lineWidth = 3;
      const x = cx + 32, y = cy + 32;
      if (i === 0) { g.fillStyle = '#2a2a30'; g.beginPath(); g.moveTo(x - 20, y - 8); g.lineTo(x, y + 14); g.lineTo(x + 20, y - 8); g.lineTo(x + 10, y - 14); g.lineTo(x, y - 6); g.lineTo(x - 10, y - 14); g.fill(); g.fillStyle = '#e8c030'; g.fillRect(x - 3, y - 18, 6, 6); }
      else if (i === 1) { g.fillStyle = '#e8c030'; g.beginPath(); g.ellipse(x, y, 20, 14, 0, 0, TAU); g.fill(); g.fillStyle = '#b8402a'; g.fillRect(x - 8, y - 5, 16, 10); }
      else if (i === 2) { g.beginPath(); g.arc(x - 8, y, 14, -1.2, 1.2); g.moveTo(x + 8, y - 13); g.arc(x + 8, y, 14, Math.PI - 1.2, Math.PI + 1.2); g.stroke(); g.fillRect(x - 12, y + 12, 24, 4); }
      else if (i === 3) { g.beginPath(); g.ellipse(x, y, 14, 9, 0, 0, TAU); g.fill(); g.fillStyle = '#9a2030'; g.fillRect(x + 10, y - 3, 14, 6); }
      else if (i === 4) { g.beginPath(); g.moveTo(x - 10, y + 16); g.quadraticCurveTo(x - 20, y, x - 4, y - 8); g.lineTo(x + 4, y - 8); g.quadraticCurveTo(x + 20, y, x + 10, y + 16); g.fill(); g.fillStyle = '#e8c030'; g.fillRect(x - 3, y - 20, 6, 12); }
      else if (i === 5) { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.ellipse(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 7, 4, a, 0, TAU); g.fill(); } g.fillStyle = '#e8c030'; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
      else if (i === 6) { g.fillRect(x - 5, y - 20, 10, 40); g.fillRect(x - 20, y - 5, 40, 10); }
      else { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 8 : 20; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); }
    }
  }, 'majolica');
  /** pilaster strip of stacked tile squares (one tile = 1 square 0.4 m + a brick pad, 64 px): 64 x 512 for 8 squares, v = height / 3.2 m */
  A.pilasterTiles = D(64, 512, (g, w, h) => {
    g.fillStyle = '#a86a54'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      const y = i * 64 + 8, k = i % 4, bg = ['#2aa0d8', '#3aa8c8', '#e8c040', '#38b0a0'][k];
      g.fillStyle = '#5a2a20'; g.fillRect(4, y, 56, 48); g.fillStyle = '#b8402a'; g.fillRect(7, y + 3, 50, 42); g.fillStyle = bg; g.fillRect(10, y + 6, 44, 36);
      g.fillStyle = k === 2 ? '#2a58a8' : '#f4ecd0'; g.beginPath(); g.arc(32, y + 24, 11, 0, TAU); g.fill(); g.fillStyle = bg; g.beginPath(); g.arc(32, y + 24, 5, 0, TAU); g.fill();
    }
  }, 'pilasterTiles');

  // ---------------------------------------------------------------------------------------------- roofs and enamel
  /** fish-scale roof tiles of the porches, cobalt / yellow / moss / white in a diagonal chequer (tile 3 x 3 m = 12 x 12 scales); roof slope uv = metres / 3 */
  A.roofTiles = D(512, 512, (g, w, h) => {
    const r = ctx.rng(23), col = ['#3a5ca8', '#d8c040', '#6a9a50', '#e4e4dc', '#3a5ca8', '#6a9a50'];
    g.fillStyle = '#34503c'; g.fillRect(0, 0, w, h);
    const n = 16, s = w / n;
    for (let row = n - 1; row >= 0; row--) for (let i = -1; i < n + 1; i++) {
      const x = i * s + (row % 2) * s / 2, y = row * s * 0.78, c = col[(Math.floor(r() * 7) + i + row) % col.length];
      g.fillStyle = c; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y); g.lineTo(x + s, y + s * 0.55); g.arc(x + s / 2, y + s * 0.55, s / 2, 0, Math.PI); g.lineTo(x, y); g.fill();
      g.strokeStyle = 'rgba(20,30,20,0.55)'; g.lineWidth = 1.5; g.stroke();
    }
  }, 'roofTiles');
  /** scale texture for the tent / spires (white, tinted by the material): rows of scales, 128 x 256 */
  A.scales = D(128, 256, (g, w, h) => {
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h);
    const s = 16;
    for (let row = 15; row >= 0; row--) for (let i = -1; i < 9; i++) {
      const x = i * s + (row % 2) * s / 2, y = row * 13;
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y); g.lineTo(x + s, y + 8); g.arc(x + s / 2, y + 8, s / 2, 0, Math.PI); g.fill();
      g.strokeStyle = 'rgba(40,50,80,0.4)'; g.lineWidth = 1; g.stroke();
    }
  }, 'scales');
  /** the blue tent pyramid, ONE face (u across 0..1, v up 0..1): blue scales with white dots and gold-yellow ribs at both edges, 256 x 512 */
  A.tent = D(256, 512, (g, w, h) => {
    const r = ctx.rng(41);
    g.fillStyle = '#2c4a90'; g.fillRect(0, 0, w, h);
    const s = 32;
    for (let row = 0; row < 32; row++) for (let i = -1; i < 9; i++) {
      const x = i * s + (row % 2) * s / 2, y = row * 16, k = 0.9 + r() * 0.25;
      g.fillStyle = `rgb(${(46 + (row % 2) * 12) * k | 0},${(82 + (row % 2) * 14) * k | 0},${(150 + (row % 2) * 14) * k | 0})`; g.fillRect(x + 1, y + 1, s - 2, 14);
      g.fillStyle = '#e8eef8'; g.beginPath(); g.arc(x + s / 2, y + 8, 3, 0, TAU); g.fill();
    }
    g.fillStyle = '#d8b030'; g.fillRect(0, 0, 12, h); g.fillRect(w - 12, 0, 12, h); g.fillStyle = '#f0d060'; g.fillRect(3, 0, 4, h); g.fillRect(w - 9, 0, 4, h);
  }, 'tent');
  /** faceted enamel: a grid of cols x rows square pyramids (each split into four shaded triangles); colour(i, j) -> hex.  1024 x 512; j counts from the TOP (the tip) */
  const enamel = (key, colour) => D(1024, 512, (g, w, h) => {
    const cols = 48, rows = 24, cw = w / cols, ch = h / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const base = colour(i, j, rows), x = i * cw, y = j * ch;
      const tri = (pts, k) => poly(g, pts, shade(base, k));
      tri([[x, y], [x + cw, y], [x + cw / 2, y + ch / 2]], 1.16);
      tri([[x, y], [x, y + ch], [x + cw / 2, y + ch / 2]], 1.0);
      tri([[x + cw, y], [x + cw, y + ch], [x + cw / 2, y + ch / 2]], 0.8);
      tri([[x, y + ch], [x + cw, y + ch], [x + cw / 2, y + ch / 2]], 0.66);
    }
  }, key);
  const GOLD = '#e0b030';
  const hash = (i, j, s) => { let h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  A.enamelNW = enamel('enNW', (i, j, rows) => {                                                      // alternating blue / green lobes, white studs on the borders
    if (j < 2 || j > rows - 3) return GOLD;
    const lobe = Math.floor(i / 6), c = i % 6, base = lobe % 2 ? '#80b030' : '#3aa0d0';
    return (c === 0 || c === 5) && j % 2 === 0 ? '#e8e8e0' : base;
  });
  A.enamelNE = enamel('enNE', (i, j, rows) => {                                                      // green / white / turquoise studs, gold crosses of 3 x 3 squares
    if (j < 2 || j > rows - 3) return GOLD;
    for (let k = 0; k < 4; k++) { const i0 = 12 * k + 5; if ((i >= i0 && i <= i0 + 2 && j === 11) || (i === i0 + 1 && j >= 9 && j <= 13)) return '#d8b050'; }
    const h = hash(i, j, 3); return h < 0.4 ? '#6aa840' : h < 0.7 ? '#40a8c8' : '#eceae0';
  });
  A.enamelSW = enamel('enSW', (i, j, rows) => {                                                      // diagonal chequer of turquoise, green, white, yellow outlines
    if (j < 2 || j > rows - 3) return GOLD;
    if (i % 8 === 0) return '#e8d040';
    const k = (i + j) % 4; return k === 0 || k === 3 ? '#3aa8d8' : k === 1 ? '#78b040' : '#f0f0ea';
  });
  A.enamelSE = enamel('enSE', (i, j, rows) => {                                                      // white / blue / green squares with gold rhombi, lime-yellow bias
    if (j < 2 || j > rows - 3) return GOLD;
    if (i % 6 === 3 && j % 4 === 1) return '#e8b838';
    const h = hash(i, j, 9); return h < 0.3 ? '#f0f0ea' : h < 0.5 ? '#3a90c8' : h < 0.75 ? '#6aaa40' : '#c8d048';
  });
  /** the central onion: three twisted stripes white / green / blue, glossy; 512 x 512 (u around, v up; the stripes make about one turn) */
  A.twist = D(512, 512, (g, w, h) => {
    const cols = ['#f0f0f0', '#78b040', '#3aa0d8'];
    g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 3; k++) for (let s = -1; s <= 1; s++) {
      const x0 = k * w / 3 + s * w, tw = 0.9 * w;
      const gr = g.createLinearGradient(x0, 0, x0 + w / 3, 0); gr.addColorStop(0, shade(cols[k], 0.78)); gr.addColorStop(0.35, shade(cols[k], 1.12)); gr.addColorStop(1, shade(cols[k], 0.82));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0, h); g.lineTo(x0 + w / 3, h); g.lineTo(x0 + w / 3 + tw, 0); g.lineTo(x0 + tw, 0); g.closePath(); g.fill();
    }
  }, 'twist');
  /** gilded copper: soft vertical gores (24 around), 256 x 64 */
  A.gold = D(256, 64, (g, w, h) => {
    for (let i = 0; i < 24; i++) { const x = i * w / 24, gr = g.createLinearGradient(x, 0, x + w / 24, 0); gr.addColorStop(0, '#caa028'); gr.addColorStop(0.45, '#f4d460'); gr.addColorStop(1, '#c09620'); g.fillStyle = gr; g.fillRect(x, 0, w / 24 + 1, h); }
  }, 'gold');
  /** gold fringe (fleur-de-lis cut-outs hanging from the eaves), alpha: 256 x 64 = 1.9 m x 0.5 m */
  A.fringe = D(256, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, 10);
    for (let i = 0; i < 8; i++) { const x = i * 32 + 16; g.beginPath(); g.moveTo(x, 62); g.quadraticCurveTo(x - 14, 38, x - 10, 16); g.lineTo(x + 10, 16); g.quadraticCurveTo(x + 14, 38, x, 62); g.fill(); g.beginPath(); g.arc(x - 12, 28, 6, 0, TAU); g.arc(x + 12, 28, 6, 0, TAU); g.fill(); }
  }, 'fringe');

  // ---------------------------------------------------------------------------------------------- mosaics
  /** a standing / seated figure in a robe: x,y = feet / seat centre, h height; robe colours; halo gold */
  const figure = (g, x, y, h, robe, o = {}) => {
    const w = h * (o.wide ?? 0.34), skin = o.skin || '#d8b898';
    poly(g, [[x - w * 0.5, y], [x - w * 0.36, y - h * 0.62], [x - w * 0.2, y - h * 0.76], [x + w * 0.2, y - h * 0.76], [x + w * 0.36, y - h * 0.62], [x + w * 0.5, y]], robe);
    if (o.inner) poly(g, [[x - w * 0.12, y], [x - w * 0.08, y - h * 0.7], [x + w * 0.08, y - h * 0.7], [x + w * 0.12, y]], o.inner);
    ell(g, x, y - h * 0.86, h * 0.075, h * 0.095, skin);
    if (o.hair) ell(g, x, y - h * 0.9, h * 0.08, h * 0.06, o.hair);
    if (o.beard) poly(g, [[x - h * 0.05, y - h * 0.84], [x + h * 0.05, y - h * 0.84], [x, y - h * 0.76]], o.beard);
    g.strokeStyle = '#e8c030'; g.lineWidth = Math.max(2, h * 0.02); g.beginPath(); g.arc(x, y - h * 0.88, h * 0.125, 0, TAU); g.stroke();
    if (o.arms === 'up') { g.strokeStyle = robe; g.lineWidth = h * 0.07; g.beginPath(); g.moveTo(x - w * 0.3, y - h * 0.6); g.lineTo(x - w * 0.62, y - h * 0.8); g.moveTo(x + w * 0.3, y - h * 0.6); g.lineTo(x + w * 0.62, y - h * 0.8); g.stroke(); }
  };
  const goldGround = (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#d8b030'); gr.addColorStop(0.5, '#ecc848'); gr.addColorStop(1, '#c89c20'); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
  const seraph = (g, x, y, r) => { ell(g, x, y, r * 1.5, r * 0.8, '#d8505a'); ell(g, x, y, r * 0.55, r * 0.6, '#f0c8a8'); };
  const cloudsLow = (g, w, h, c0 = '#f4f4f8', c1 = '#b8c4dc') => { for (let i = 0; i < 14; i++) { ell(g, i * w / 12, h * 0.92 + (i % 3) * 3, w * 0.07, h * 0.09, i % 2 ? c0 : c1); } };

  A.mosChristGlory = D(512, 208, (g, w, h) => {                                                      // Christ in Glory (Koshelev): S gable
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#c8d4e8'); sky.addColorStop(0.6, '#e8b8c0'); sky.addColorStop(1, '#8aa0c8'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.12 + 0.76 * i / 8); g.strokeStyle = 'rgba(255,240,170,0.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h * 0.5); g.lineTo(w / 2 + Math.cos(a) * w * 0.5, h * 0.5 - Math.sin(a) * h * 0.9); g.stroke(); }
    g.strokeStyle = '#d8d040'; g.lineWidth = 7; g.beginPath(); g.ellipse(w / 2, h * 0.5, 62, 78, 0, 0, TAU); g.stroke(); g.strokeStyle = '#a8c050'; g.lineWidth = 5; g.beginPath(); g.ellipse(w / 2, h * 0.5, 50, 66, 0, 0, TAU); g.stroke();
    for (const [sx, sy] of [[150, 90], [190, 50], [330, 50], [370, 95], [210, 120], [310, 120], [140, 140], [380, 140]]) seraph(g, sx, sy, 11);
    figure(g, w / 2, h * 0.84, h * 0.82, '#e8e8f0', { inner: '#c8d0e8', wide: 0.5 });                // Christ, seated
    g.fillStyle = '#c8b898'; g.fillRect(w / 2 + 6, h * 0.55, 36, 30); g.fillStyle = '#7a5a40'; g.fillRect(w / 2 + 10, h * 0.58, 28, 22);   // book
    figure(g, 108, h * 0.92, h * 0.6, '#6a5a90', { inner: '#c04a58', hair: '#4a3020' });            // St Alexander Nevsky (kneeling, with a model of the church)
    ell(g, 142, h * 0.76, 10, 12, '#b86a48');
    figure(g, 404, h * 0.92, h * 0.6, '#c8b068', { inner: '#e8e0c0', beard: '#e8e8e8', hair: '#e8e8e8' });   // St Nicholas
    cloudsLow(g, w, h); tess(g, w, h, 4, 0.09);
  }, 'mosGlory');
  A.mosResurrection = D(512, 216, (g, w, h) => {                                                     // the Resurrection (Nesterov): N gable, night blue
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#1c2c58'); sky.addColorStop(0.7, '#3a4c84'); sky.addColorStop(1, '#6a6a8c'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    poly(g, [[0, h], [0, h * 0.7], [90, h * 0.62], [190, h * 0.78], [260, h], ], '#5a5c64'); poly(g, [[230, h], [330, h * 0.74], [420, h * 0.8], [512, h * 0.72], [512, h]], '#4a4e5c');
    for (const bx of [410, 440, 470, 495]) { g.fillStyle = '#e8e8e0'; g.fillRect(bx, h * 0.28, 5, h * 0.55); ell(g, bx + 2, h * 0.28, 16, 22, '#385a4a'); }
    g.fillStyle = '#d8a828'; g.fillRect(190, h * 0.46, 60, h * 0.44); g.fillStyle = '#7a5a20'; g.fillRect(196, h * 0.52, 48, h * 0.36);
    figure(g, 268, h * 0.9, h * 0.78, '#f0f0f4', { inner: '#e8e0e8', hair: '#6a4a30' });
    g.strokeStyle = '#c03030'; g.lineWidth = 4; g.beginPath(); g.moveTo(300, h * 0.92); g.lineTo(300, h * 0.2); g.stroke();
    ell(g, 160, h * 0.76, 30, 38, '#e8c8d0'); poly(g, [[140, h * 0.6], [60, h * 0.4], [90, h * 0.8], [140, h * 0.82]], '#b8a8b8'); ell(g, 160, h * 0.62, 12, 14, '#e8c8a8');
    tess(g, w, h, 4, 0.1);
  }, 'mosResurrection');
  const tympanum = (key, kind) => D(256, 256, (g, w, h) => {
    if (kind === 'carry') { const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#e8a848'); sky.addColorStop(1, '#f0d088'); g.fillStyle = sky; g.fillRect(0, 0, w, h); poly(g, [[0, h], [0, h * 0.8], [256, h * 0.85], [256, h]], '#8a6a4a'); figure(g, 130, h * 0.95, h * 0.7, '#9a6050', { inner: '#c88a68', hair: '#4a3020' }); g.strokeStyle = '#5a3a20'; g.lineWidth = 9; g.beginPath(); g.moveTo(70, h * 0.42); g.lineTo(190, h * 0.9); g.stroke(); figure(g, 60, h * 0.95, h * 0.5, '#4a5a98', {}); figure(g, 205, h * 0.95, h * 0.5, '#6a4a80', {}); }
    else if (kind === 'cruc') { const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#5a78b8'); sky.addColorStop(0.55, '#b898c8'); sky.addColorStop(1, '#f0b8a0'); g.fillStyle = sky; g.fillRect(0, 0, w, h); g.fillStyle = '#3a2a30'; g.fillRect(122, 20, 12, 200); g.fillRect(96, 60, 64, 11); g.fillRect(50, 70, 8, 150); g.fillRect(36, 96, 36, 8); g.fillRect(196, 70, 8, 150); g.fillRect(180, 96, 36, 8); poly(g, [[0, h], [0, h * 0.86], [256, h * 0.9], [256, h]], '#4a4a38'); figure(g, 100, h * 0.97, h * 0.42, '#7a4a8a', {}); figure(g, 160, h * 0.97, h * 0.42, '#4a7a50', {}); figure(g, 215, h * 0.97, h * 0.4, '#a03a30', {}); }
    else if (kind === 'hell') { g.fillStyle = '#262a44'; g.fillRect(0, 0, w, h); ell(g, 128, 120, 70, 100, '#cfd8ec'); ell(g, 128, 120, 52, 84, '#eef2fa'); figure(g, 128, 200, 150, '#f4f4fa', { inner: '#c8d8f0', hair: '#5a3a20' }); for (let i = 0; i < 6; i++) ell(g, 30 + i * 40, 230, 22, 12, '#3a3a50'); }
    else { g.fillStyle = '#1a2454'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.fillStyle = '#e8e0a0'; g.fillRect((i * 97) % 256, (i * 53) % 150, 3, 3); } poly(g, [[40, 40], [120, 60], [200, 230], [90, 240]], '#f0f0f4'); figure(g, 70, h * 0.98, h * 0.55, '#6a3a60', {}); figure(g, 205, h * 0.98, h * 0.55, '#3a5a80', {}); ell(g, 130, 100, 16, 18, '#e8c8a8'); }
    tess(g, w, h, 4, 0.1);
  }, key);
  A.mosCarry = tympanum('mosCarry', 'carry'); A.mosCruc = tympanum('mosCruc', 'cruc'); A.mosHell = tympanum('mosHell', 'hell'); A.mosDepos = tympanum('mosDepos', 'depos');
  A.mosLunette = D(512, 256, (g, w, h) => {                                                          // the Holy Face on the cloth held by two angels (Nesterov): grey-blue, red wings
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#7890b0'); sky.addColorStop(1, '#a8b8c8'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) ell(g, i * 56, h * 0.88 + (i % 2) * 8, 60, 22, i % 2 ? '#e0e8f0' : '#8aa4c8');
    poly(g, [[70, 40], [20, 90], [40, 190], [110, 120]], '#c0302a'); poly(g, [[442, 40], [492, 90], [472, 190], [402, 120]], '#c0302a');
    figure(g, 105, 220, 150, '#98a8c8', { inner: '#e8e8f0', hair: '#c88040' }); figure(g, 407, 220, 150, '#98a8c8', { inner: '#e8e8f0', hair: '#c88040' });
    g.fillStyle = '#e8e4d8'; g.fillRect(170, 110, 172, 90); ell(g, 256, 130, 38, 48, '#d8b890'); g.fillStyle = '#4a3020'; g.beginPath(); g.ellipse(256, 108, 40, 28, 0, Math.PI, TAU); g.fill(); poly(g, [[236, 140], [276, 140], [256, 186]], '#4a3020');
    g.strokeStyle = '#e8c030'; g.lineWidth = 5; g.beginPath(); g.arc(256, 128, 56, 0, TAU); g.stroke();
    tess(g, w, h, 4, 0.09);
  }, 'mosLunette');
  A.mosCalvary = D(256, 400, (g, w, h) => {                                                          // the Calvary in the open chapel: gold apse, blue field, white cross, Christ, Virgin, John
    goldGround(g, w, h); g.fillStyle = '#2a4a98'; g.fillRect(56, 60, 144, 300);
    g.fillStyle = '#f0f0f4'; g.fillRect(118, 80, 20, 250); g.fillRect(78, 120, 100, 18); g.fillStyle = '#f0f0f4'; poly(g, [[118, 80], [138, 80], [150, 66], [106, 66]], '#f0f0f4');
    figure(g, 128, 220, 120, '#e8d8c8', { wide: 0.5, skin: '#e8c8a8' });
    figure(g, 80, 340, 130, '#4a3a8a', { hair: '#3a2a50' }); figure(g, 176, 340, 130, '#586a38', { hair: '#4a3020' });
    g.fillStyle = '#2a2018'; g.fillRect(100, 24, 56, 20); g.fillStyle = '#e8c030'; g.font = 'bold 14px serif'; g.textAlign = 'center'; g.fillText('INЦI', 128, 40);
    ell(g, 128, 10, 40, 14, '#4a6ab8');
    tess(g, w, h, 4, 0.1);
  }, 'mosCalvary');
  const icon = (key, robe, inner, hair) => D(128, 384, (g, w, h) => { goldGround(g, w, h); figure(g, 64, 370, 330, robe, { inner, hair, arms: 'up', wide: 0.42 }); g.fillStyle = '#2a2018'; g.fillRect(14, 14, 28, 6); g.fillRect(86, 14, 28, 6); tess(g, w, h, 4, 0.1); }, key);
  A.iconMother = icon('iconMother', '#4a3a8a', '#6a5aa8', '#2a2040'); A.iconJohn = icon('iconJohn', '#586a38', '#7a8a4a', '#4a3020');
  A.mosDeesis = D(256, 320, (g, w, h) => { goldGround(g, w, h); figure(g, 128, 270, 230, '#8ab4e0', { inner: '#e8f0fa', wide: 0.5, hair: '#5a3a20' }); figure(g, 52, 300, 250, '#4a3a8a', { hair: '#2a2040', arms: 'up' }); figure(g, 206, 300, 250, '#586a38', { hair: '#4a3020', arms: 'up' }); tess(g, w, h, 4, 0.1); }, 'mosDeesis');
  A.mosVirgin = D(256, 320, (g, w, h) => { goldGround(g, w, h); g.fillStyle = '#8a5a30'; g.fillRect(78, 190, 100, 90); figure(g, 128, 290, 270, '#7a3a8a', { inner: '#a860b0', wide: 0.55, hair: '#2a1a3a' }); ell(g, 128, 190, 28, 30, '#e8c8a0'); tess(g, w, h, 4, 0.1); }, 'mosVirgin');
  A.mosApse = D(128, 320, (g, w, h) => { goldGround(g, w, h); figure(g, 64, 300, 270, '#c02a28', { inner: '#e8d0b0', hair: '#4a3020', beard: '#4a3020' }); tess(g, w, h, 4, 0.1); }, 'mosApse');
  /** the roundel atlas (4 x 2): saint busts on blue or gold ground */
  A.roundels = D(256, 128, (g) => {
    for (let i = 0; i < 8; i++) {
      const x = (i % 4) * 64 + 32, y = Math.floor(i / 4) * 64 + 32;
      g.fillStyle = '#e8dfc6'; g.beginPath(); g.arc(x, y, 31, 0, TAU); g.fill();
      g.fillStyle = i % 3 === 2 ? '#d8b030' : '#2a58a8'; g.beginPath(); g.arc(x, y, 26, 0, TAU); g.fill();
      figure(g, x, y + 24, 44, ['#a03a30', '#e8e0d0', '#4a3a8a', '#586a38'][i % 4], { hair: '#4a3020', skin: '#e0c0a0', wide: 0.8 });
    }
  }, 'roundels');
  /** gilded text on dark red Norwegian granite, a round bronze disc at each corner (one plaque, 1.5 x 1.0 m); six different reign records */
  const PLAQUES = [
    ['19 ФЕВРАЛЯ 1855 ГОДА', 'ВСТУПЛЕНИЕ НА ПРЕСТОЛ', 'ИМПЕРАТОРА', 'АЛЕКСАНДРА ВТОРОГО'],
    ['19 ФЕВРАЛЯ 1861 ГОДА', 'МАНИФЕСТ ОБ ОСВОБОЖДЕНИИ', 'КРЕСТЬЯН ОТ', 'КРЕПОСТНОЙ ЗАВИСИМОСТИ'],
    ['1 ЯНВАРЯ 1864 ГОДА', 'УЧРЕЖДЕНЫ ЗЕМСКИЕ', 'УЧРЕЖДЕНИЯ', ''],
    ['20 НОЯБРЯ 1864 ГОДА', 'ВВЕДЕНЫ', 'СУДЕБНЫЕ УСТАВЫ', ''],
    ['16 ИЮНЯ 1870 ГОДА', 'ВВЕДЕНО', 'ГОРОДОВОЕ ПОЛОЖЕНИЕ', ''],
    ['1 ЯНВАРЯ 1874 ГОДА', 'ВОИНСКАЯ ПОВИННОСТЬ', 'ВСЕХ СОСЛОВИЙ ВВЕДЕНА', 'ПО УСТАВУ ГОСУДАРЯ'],
  ];
  A.plaques = PLAQUES.map((lines, k) => D(512, 340, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#7a2c2a'); gr.addColorStop(1, '#5a1e20'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = ctx.rng(99 + k); for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,200,180,0.08)' : 'rgba(20,0,0,0.12)'; g.fillRect(r() * w, r() * h, 2 + r() * 6, 2 + r() * 4); }
    g.fillStyle = '#6a5030'; for (const [x, y] of [[22, 22], [w - 22, 22], [22, h - 22], [w - 22, h - 22]]) { g.beginPath(); g.arc(x, y, 10, 0, TAU); g.fill(); }
    g.fillStyle = '#d8b830'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ls = lines.filter(Boolean), y0 = h / 2 - (ls.length - 1) * 32;
    ls.forEach((t, i) => { g.font = `bold ${i === 0 ? 34 : 28}px "Noto Serif", serif`; tex.fitText(g, t, w / 2, y0 + i * 64, w * 0.8, i === 0 ? 34 : 28, tex.FONTS.serif, 700); });
  }, 'plaque' + k));
  A.plaque = A.plaques[5];
  /** grids of coats of arms (the 134 governorates / cities): cols x rows cells of 48 px, dark-brown lattice, a random heraldic motif per cell; holes = [{x0,y0,x1,y1}] in cells are left brick coloured */
  const arms = (key, cols, rows, seed, holes) => D(cols * 48, rows * 48, (g, w, h) => {
    const r = ctx.rng(seed);
    g.fillStyle = '#5a3228'; g.fillRect(0, 0, w, h);
    const bgs = ['#a8403a', '#3a5a98', '#d0aa40', '#ddd8c8', '#3a7a52', '#2e2e34'], fgs = ['#ddd8c8', '#d0aa40', '#a8403a', '#2e2e34', '#3a5a98'];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * 48, y = j * 48;
      if (holes && holes.some((q) => i >= q.x0 && i < q.x1 && j >= q.y0 && j < q.y1)) { g.fillStyle = '#a86a54'; g.fillRect(x, y, 48, 48); continue; }
      g.fillStyle = '#7a4a3a'; g.fillRect(x + 3, y + 3, 42, 42);
      const bg = bgs[Math.floor(r() * bgs.length)]; let fg = fgs[Math.floor(r() * fgs.length)]; if (fg === bg) fg = '#eeeadb';
      g.fillStyle = bg; g.fillRect(x + 9, y + 9, 30, 30);
      g.save(); g.beginPath(); g.rect(x + 9, y + 9, 30, 30); g.clip();
      g.fillStyle = fg; const cx = x + 24, cy = y + 24, m = Math.floor(r() * 9);
      if (m === 0) { g.beginPath(); g.ellipse(cx, cy + 2, 8, 11, 0, 0, TAU); g.fill(); g.fillRect(cx - 12, cy - 2, 24, 4); g.fillRect(cx + 6, cy + 10, 8, 4); }          // lion
      else if (m === 1) { poly(g, [[cx - 15, cy - 6], [cx, cy + 12], [cx + 15, cy - 6], [cx + 6, cy - 10], [cx, cy - 2], [cx - 6, cy - 10]], fg); g.fillRect(cx - 2, cy - 14, 4, 5); }   // eagle
      else if (m === 2) { g.fillRect(cx - 3, cy - 14, 6, 28); g.fillRect(cx - 14, cy - 3, 28, 6); }                                                                              // cross
      else if (m === 3) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 6 : 14; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.fill(); }   // star
      else if (m === 4) { g.beginPath(); g.arc(cx, cy, 12, 0.7, TAU - 0.7); g.arc(cx + 6, cy, 9, TAU - 0.9, 0.9, true); g.fill(); g.fillRect(cx - 14, cy + 8, 28, 3); }     // crescent and sword
      else if (m === 5) { g.fillRect(cx - 11, cy - 4, 22, 16); for (let k = 0; k < 4; k++) g.fillRect(cx - 11 + k * 6.5, cy - 10, 4, 6); g.fillStyle = bg; g.fillRect(cx - 3, cy + 2, 6, 10); }        // tower
      else if (m === 6) { g.beginPath(); g.ellipse(cx - 2, cy, 12, 6, 0, 0, TAU); g.fill(); poly(g, [[cx + 8, cy], [cx + 16, cy - 7], [cx + 16, cy + 7]], fg); }                    // fish
      else if (m === 7) { g.beginPath(); g.ellipse(cx, cy + 5, 7, 9, 0, 0, TAU); g.fill(); ell(g, cx + 5, cy - 7, 5, 5, fg); g.fillRect(cx - 12, cy + 2, 6, 3); g.fillRect(cx + 4, cy + 12, 4, 6); }  // bear / horse
      else { g.fillRect(cx - 12, cy - 12, 24, 24); g.fillStyle = bg; g.fillRect(cx - 7, cy - 7, 14, 14); g.fillStyle = fg; g.fillRect(cx - 3, cy - 3, 6, 6); }
      g.restore();
    }
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, 0, w, 3);
  }, key);
  A.armsW = arms('armsW', 16, 20, 71, [{ x0: 4, y0: 3, x1: 12, y1: 17 }]);
  A.armsNS = arms('armsNS', 12, 20, 83, [{ x0: 3, y0: 7, x1: 9, y1: 16 }]);
  A.armsStrip = arms('armsStrip', 12, 6, 91, null);

  // ---------------------------------------------------------------------------------------------- fences
  /** the Winkler wrought-iron panel (3.74 x 4.0 m): top rail with buds, giant S-scroll vines with rosettes, bottom rail; white-on-alpha (the material colours it gunmetal) 512 x 512 */
  A.winkler = D(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = 6; g.beginPath(); g.moveTo(0, 150); g.lineTo(w, 150); g.moveTo(0, 460); g.lineTo(w, 460); g.moveTo(0, 505); g.lineTo(w, 505); g.stroke();
    g.lineWidth = 4; for (let i = 0; i <= 16; i++) { const x = 4 + i * 31.5; g.beginPath(); g.moveTo(x, 150); g.lineTo(x, 505); g.stroke(); }
    for (let i = 0; i <= 8; i++) { const x = 4 + i * 63; g.beginPath(); g.moveTo(x, 150); g.quadraticCurveTo(x - 10, 80, x, 34); g.stroke(); g.beginPath(); g.moveTo(x, 30); g.lineTo(x - 8, 60); g.lineTo(x + 8, 60); g.closePath(); g.fill(); g.beginPath(); g.arc(x, 24, 5, 0, TAU); g.fill(); }
    g.lineWidth = 7;
    for (let k = 0; k < 4; k++) {                                                                       // S-scrolls in two mirrored rows
      const cx = 64 + k * 128;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx, 455); g.bezierCurveTo(cx + s * 70, 440, cx + s * 70, 340, cx, 320); g.bezierCurveTo(cx - s * 30, 310, cx - s * 20, 260, cx + s * 14, 266); g.stroke(); g.beginPath(); g.arc(cx + s * 14, 276, 12, 0, TAU * 0.8); g.stroke(); }
      g.beginPath(); g.arc(cx, 330, 22, 0, TAU); g.stroke(); g.lineWidth = 3; for (let q = 0; q < 8; q++) { const a = q * Math.PI / 4; g.beginPath(); g.moveTo(cx + Math.cos(a) * 8, 330 + Math.sin(a) * 8); g.lineTo(cx + Math.cos(a) * 22, 330 + Math.sin(a) * 22); g.stroke(); } g.lineWidth = 7;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx, 266); g.bezierCurveTo(cx + s * 50, 240, cx + s * 60, 190, cx + s * 20, 175); g.stroke(); g.beginPath(); g.moveTo(cx + s * 20, 175); g.lineTo(cx + s * 8, 155); g.stroke(); }
    }
  }, 'winkler');
  /** spear fence panel (2.5 x 1.3 m): rails and pickets with fleur-de-lis finials, alpha */
  A.spears = D(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#fff';
    g.fillRect(0, 36, w, 5); g.fillRect(0, h - 22, w, 5);
    for (let i = 0; i < 13; i++) { const x = 8 + i * 20; g.fillRect(x - 2, 20, 4, h - 20); g.beginPath(); g.moveTo(x - 5, 20); g.lineTo(x, 2); g.lineTo(x + 5, 20); g.fill(); if (i % 3 === 1) { g.beginPath(); g.arc(x - 7, 26, 3, 0, TAU); g.arc(x + 7, 26, 3, 0, TAU); g.fill(); } }
  }, 'spears');
  /** the Rossi palace fence panel (3.7 x 3.2 m): tall spears with gilt tips and sunflower discs; alpha white (the tips are tinted by a second material) */
  A.rossiFence = D(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#fff'; g.strokeStyle = '#fff';
    g.fillRect(0, 70, w, 6); g.fillRect(0, 205, w, 6); g.fillRect(0, 248, w, 6);
    for (let i = 0; i < 30; i++) { const x = 4 + i * 8.4; g.fillRect(x - 1.2, 20, 2.4, h - 24); g.beginPath(); g.moveTo(x - 2.5, 20); g.lineTo(x, 2); g.lineTo(x + 2.5, 20); g.fill(); }
    for (let k = 0; k < 4; k++) { const cx = 32 + k * 64; g.lineWidth = 3; g.beginPath(); g.arc(cx, 140, 22, 0, TAU); g.stroke(); for (let q = 0; q < 12; q++) { const a = q * TAU / 12; g.beginPath(); g.ellipse(cx + Math.cos(a) * 28, 140 + Math.sin(a) * 28, 7, 3, a, 0, TAU); g.fill(); } g.beginPath(); g.arc(cx, 140, 8, 0, TAU); g.fill(); }
  }, 'rossiFence');
  A.mix = mix;
  return A;
}
