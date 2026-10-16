// landmarksOktyabrsky/art.js - the canvas paintings of the module (docs/research/oktyabrsky.md sections 5, 7, 8; oktyabrsky-square.md sections 3, 4, 9; photos refs/oktyabrsky 01 02 03 05 06 08 12 13 sq_01 sq_03).
//   hall:     dolomite strips of the cube (0.5 m wide, 1.0 m joints, alternate strips shifted, four tones), the larger mixed slabs of the end blocks / slab fascia / flanks, the soffit with
//             its recessed round downlights (one per bay, three rows), the row of small square louvred apertures at the foot of the cube, the roof membrane, the honey parquet of the
//             foyer, the 26 m dark bronze relief frieze (rifles and a crowd, no banners), poster sheets, the citylight stand, the white fluted annex, the paving of the forecourt
//             (pavers + red-brown bands 0.9 m wide every 6 m) and the granite slabs of the platform.
//   monument: the verdigris bronze (teal, streaks on up-facing surfaces), the pale granite, the shield plaque (ИОАННИСУ КАПОДИСТРИЯ / ПАТРИОТЫ ГРЕЦИИ И РОССИИ under a coronet), the engraved text
//             on the back, the begonia beds, the brick-red garden pavers.
// Every key starts with 'lmOkt-' (the texture cache is scene-wide: a prefix that matches another module silently takes its textures).
const TAU = Math.PI * 2;
export const COL = {
  dolo: '#d6cfbb', doloLit: '#ece3cf', doloShade: '#b5ae9c', mull: '#7a6340', doorFrame: '#4a3a2a', frieze: '#2f3436', spandrel: '#d4dbc8', glassDay: '#6d8591',
  tread: '#8d9093', riser: '#74777b', platform: '#b8b2a6', plinth: '#8a8a86', paving: '#9a8f86', band: '#a46d5f', roof: '#4b4944', lamp: '#232326', globe: '#f0efe6',
  parquet: '#c99c58', bronzeOct: '#3d3a35', graniteOct: '#74777b',
  granite: '#d9d4c6', graniteShade: '#b9b3a3', verdi: '#3f8576', verdiLit: '#6fb3a3', verdiDark: '#1f433d', kerb: '#9a948e', slope: '#c3beb2', slab: '#cfcabd',
};

export function makeArt(ctx) {
  const tex = ctx.tex, A = {}, C = COL;
  const D = (w, h, fn, key, repeat = [1, 1]) => tex.draw(w, h, fn, { key: 'lmOkt-' + key, repeat });
  const R = (seed) => ctx.rng(seed);
  const F = tex.FONTS;
  const speckle = (g, w, h, seed, n, a = 0.1) => { const r = R(seed); for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '40,36,32'},${a})`; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2); } };

  // ------------------------------------------------------------------------------------------ the cube: strips 0.5 m wide, 4 m tall tile (photo 03: long vertical strips, one tone each, faint cross joints at irregular heights)
  A.strips = D(512, 512, (g, w, h) => {
    const r = R(7101), tones = ['#d9d1bc', '#d3cab4', '#d6cdb7', '#cfc6ae', '#dbd3be', '#d4cbb2'];
    g.fillStyle = '#c6bda3'; g.fillRect(0, 0, w, h);
    const joints = [];
    for (let i = 0; i < 8; i++) {
      const cuts = [0, (h * (0.22 + r() * 0.2)) | 0, (h * (0.62 + r() * 0.25)) | 0, h];
      for (let c = 0; c < 3; c++) {
        const ya = cuts[c], yb = cuts[c + 1];
        g.fillStyle = tones[(r() * tones.length) | 0]; g.fillRect(i * 64 + 1, ya + 1, 62, yb - ya - 1);
        g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(i * 64 + 1, ya + 1, 22, yb - ya - 1);                          // a lit edge: fine vertical streaking
        g.fillStyle = 'rgba(80,70,50,0.07)'; g.fillRect(i * 64 + 40 + (r() * 14 | 0), ya + 1, 2 + (r() * 3 | 0), yb - ya - 1);
        if (c > 0) joints.push([i * 64, ya]);
      }
    }
    g.fillStyle = 'rgba(108,96,72,0.55)';
    for (let i = 0; i < 8; i++) g.fillRect(i * 64, 0, 2, h);
    g.fillStyle = 'rgba(120,108,84,0.16)';
    for (const [x, y] of joints) g.fillRect(x, y, 64, 2);
    speckle(g, w, h, 7102, 900, 0.06);
  }, 'strips');
  /** the larger slabs 1.2 x 0.7 m (end blocks, fascia, flank walls): tile 4.8 x 2.8 m, running bond, a few brown-ochre slabs */
  A.slabs = D(512, 299, (g, w, h) => {
    const r = R(7111);
    const cw = w / 4, rh = h / 4;
    g.fillStyle = '#b3a98f'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 4; row++) for (let c = -1; c < 5; c++) {
      const x = c * cw + (row % 2) * cw / 2, v = 0.965 + r() * 0.06, ochre = r() < 0.06;
      const base = ochre ? [209, 197, 168] : [214, 207, 187];
      g.fillStyle = `rgb(${base[0] * v | 0},${base[1] * v | 0},${base[2] * v | 0})`; g.fillRect(x + 1.5, row * rh + 1.5, cw - 3, rh - 3);
      g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x + 1.5, row * rh + 1.5, cw - 3, 4);
    }
    speckle(g, w, h, 7112, 520, 0.06);
  }, 'slabs');
  /** soffit of the slab: one bay = 2.17 x 3.0 m (u = bay index), three recessed round downlights per bay */
  A.soffit = D(128, 178, (g, w, h) => {
    g.fillStyle = '#dad5c6'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(120,110,90,0.3)'; g.fillRect(0, 0, 2, h);
    for (const yy of [30, 89, 148]) { g.fillStyle = '#8f8a7c'; g.beginPath(); g.arc(w / 2, yy, 9.5, 0, TAU); g.fill(); g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(w / 2, yy, 6.5, 0, TAU); g.fill(); }
    speckle(g, w, h, 7121, 60, 0.06);
  }, 'soffit');
  /** the row of small square louvred apertures at the foot of the cube: tile 0.71 x 0.4 m */
  A.apert = D(64, 36, (g, w, h) => {
    g.fillStyle = '#d3cab0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2d30'; g.fillRect(15, 1, 33, 33);
    g.fillStyle = '#5a5f62'; for (let k = 0; k < 4; k++) g.fillRect(15, 6 + k * 7, 33, 2);
    g.fillStyle = 'rgba(120,108,84,0.5)'; g.fillRect(0, 0, 2, h);
  }, 'apert');
  /** flat roof membrane with seams every 1 m: tile 2 x 2 m */
  A.roof = D(128, 128, (g, w, h) => { g.fillStyle = '#d8d6d0'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(70,66,60,0.35)'; g.fillRect(0, 0, 2, h); g.fillRect(64, 0, 2, h); g.fillRect(0, 0, w, 2); g.fillRect(0, 64, w, 2); speckle(g, w, h, 7131, 160, 0.08); }, 'roof');
  /** honey parquet: planks 0.2 m, tile 2 x 2 m */
  A.parquet = D(256, 256, (g, w, h) => {
    const r = R(7141); g.fillStyle = '#b88a4e'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 10; row++) for (let c = -1; c < 4; c++) { const x = c * 100 + (row % 3) * 33; g.fillStyle = `rgb(${201 + (r() - 0.5) * 22 | 0},${156 + (r() - 0.5) * 20 | 0},${88 + (r() - 0.5) * 14 | 0})`; g.fillRect(x + 1, row * 25.6 + 1, 98, 23.6); }
  }, 'parquet');
  /** white fluted annex: vertical ribs every 0.5 m (tile 2.0 x 2.0 m) */
  A.ribs = D(128, 128, (g, w, h) => { g.fillStyle = '#e9e7e0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) { g.fillStyle = '#c9c6bc'; g.fillRect(i * 32, 0, 4, h); g.fillStyle = '#f6f4ee'; g.fillRect(i * 32 + 4, 0, 6, h); } }, 'ribs');

  /** the glazed bay of the SSW flank: green-grey glass in aluminium frames, tile 3.2 x 6.2 m (a door pair below, a transom at 2.5 m and 4.2 m) */
  A.sideGlass = D(128, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5d7470'); gr.addColorStop(1, '#2f403f'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.moveTo(0, h * 0.7); g.lineTo(w, h * 0.3); g.lineTo(w, h * 0.42); g.lineTo(0, h * 0.82); g.closePath(); g.fill();
    g.fillStyle = '#b8bcbc'; for (const y of [0, h * 0.6, h * 0.32]) g.fillRect(0, y, w, 5); g.fillRect(0, h - 5, w, 5);
    for (const x of [0, w / 2 - 2, w - 5]) g.fillRect(x, 0, 5, h);
  }, 'sideGlass');
  // ------------------------------------------------------------------------------------------ the frieze (M. K. Anikushin 1967): 25.9 x 1.2 m, a crowd of figures with rifles, no banners
  A.frieze = D(1024, 48, (g, w, h) => {
    const r = R(7151);
    g.fillStyle = '#2a2f32'; g.fillRect(0, 0, w, h);
    /** one figure of the crowd at (x, y0 = feet), scale s: shadowed body, then a lit copy shifted up-left (light from the upper left) */
    const fig = (x, y0, s, a, lit) => {
      const ox = lit ? -0.9 : 0.7, oy = lit ? -0.9 : 0.7;
      g.fillStyle = lit ? `rgba(122,134,138,${a})` : `rgba(10,13,15,${a})`;
      g.beginPath(); g.arc(x + ox, y0 - 30 * s + oy, 3.4 * s, 0, TAU); g.fill();                                                    // head
      g.beginPath(); g.moveTo(x - 6.5 * s + ox, y0 + oy); g.quadraticCurveTo(x - 7 * s + ox, y0 - 24 * s + oy, x - 3 * s + ox, y0 - 26 * s + oy); g.lineTo(x + 3 * s + ox, y0 - 26 * s + oy); g.quadraticCurveTo(x + 7.5 * s + ox, y0 - 22 * s + oy, x + 7 * s + ox, y0 + oy); g.closePath(); g.fill();   // torso
    };
    const list = []; for (let i = 0; i < 150; i++) list.push({ x: r() * w, y: 40 + r() * 26, s: 0.7 + r() * 0.65, a: 0.5 + r() * 0.4 });
    list.sort((p, q) => p.y - q.y);
    for (const f of list) { fig(f.x, f.y, f.s, f.a, false); fig(f.x, f.y, f.s, f.a * 0.55, true); }
    g.lineCap = 'round';
    for (let i = 0; i < 70; i++) {                                                                                                  // rifles and raised arms
      const x = r() * w, y = 8 + r() * 26, l = 14 + r() * 18, a = -1.2 + r() * 0.8 + (r() < 0.5 ? 0 : 1.9);
      g.strokeStyle = 'rgba(8,10,12,0.75)'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(x + 0.8, y + 0.8); g.lineTo(x + 0.8 + Math.cos(a) * l, y + 0.8 + Math.sin(a) * l); g.stroke();
      g.strokeStyle = 'rgba(122,134,138,0.5)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    speckle(g, w, h, 7152, 500, 0.12);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
  }, 'frieze', [1, 1]);

  // ------------------------------------------------------------------------------------------ the mirrored street in the glass front (photo 03: the Ligovsky houses across the road, sky above): 43.4 x 9.3 m
  A.reflect = D(1024, 256, (g, w, h) => {
    const r = R(7165), pal = ['#d8a67a', '#c9a590', '#e2c872', '#d9cc9a', '#a9b0ad', '#c98a78', '#d6ae98', '#dc9e8e', '#d6c29a'];
    const sky = g.createLinearGradient(0, 0, 0, h * 0.55); sky.addColorStop(0, '#9dc3e8'); sky.addColorStop(1, '#dcebf5'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    let x = -40;
    while (x < w) {
      const fw = 120 + r() * 150, top = h * (0.2 + r() * 0.2), col = pal[(r() * pal.length) | 0];
      g.fillStyle = col; g.fillRect(x, top, fw, h * 0.9 - top);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x, top, fw, 6);
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + fw - 4, top, 4, h * 0.9 - top);
      for (let wy = top + 18; wy < h * 0.86; wy += 38) for (let wx = x + 14; wx < x + fw - 20; wx += 34) { g.fillStyle = 'rgba(40,52,68,0.8)'; g.fillRect(wx, wy, 17, 25); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(wx, wy + 11, 17, 2); }
      x += fw + 3;
    }
    g.fillStyle = '#50565d'; g.fillRect(0, h * 0.9, w, h * 0.1);
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.moveTo(i * 190 + 40, 0); g.lineTo(i * 190 + 120, 0); g.lineTo(i * 190 - 60, h); g.lineTo(i * 190 - 140, h); g.closePath(); g.fill(); }
  }, 'reflect', [1, 1]);
  // ------------------------------------------------------------------------------------------ posters (generic sheets, no logos): a group of 8 x 2 sheets 0.6 x 0.85 m = 4.8 x 1.7 m
  A.posters = D(768, 272, (g, w, h) => {
    const r = R(7161), pal = [['#c8402e', '#f2e6c8'], ['#2e5a9e', '#f1f1ea'], ['#1f1f24', '#e8b83a'], ['#e7d9b4', '#6a2330'], ['#3f6c56', '#f2efe0'], ['#8a2f57', '#f4e3ea'], ['#e49b2e', '#26283a'], ['#d9dde0', '#2a4f8f']];
    const words = ['БАЛЕТ', 'ОПЕРА', 'ГАЛА', 'РОК', 'ДЖАЗ', 'ШОУ', 'ОРКЕСТР', 'ТАНЕЦ'];
    g.fillStyle = '#20232a'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 2; row++) for (let c = 0; c < 8; c++) {
      const x = c * 96 + 3, y = row * 136 + 3, p = pal[(c + row * 3) % pal.length];
      g.fillStyle = p[0]; g.fillRect(x, y, 90, 130);
      g.fillStyle = p[1]; g.beginPath(); g.ellipse(x + 45, y + 52 + r() * 8, 24 + r() * 6, 30 + r() * 6, 0, 0, TAU); g.fill();
      g.fillStyle = p[0]; g.beginPath(); g.ellipse(x + 38 + r() * 14, y + 46, 5, 6, 0, 0, TAU); g.fill();
      g.fillStyle = p[1]; g.font = `700 ${words[(c * 2 + row) % 8].length > 5 ? 12 : 16}px ${F.sans}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(words[(c * 2 + row) % 8], x + 45, y + 108);
      g.fillRect(x + 12, y + 120, 66, 3);
    }
  }, 'posters');
  /** a citylight stand: 1.2 x 1.9 m, header bar, one luminous poster */
  A.stand = D(128, 192, (g, w, h) => {
    g.fillStyle = '#17181c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8e4d4'; g.fillRect(8, 22, w - 16, h - 30);
    g.fillStyle = '#c8402e'; g.fillRect(8, 22, w - 16, 46); g.fillStyle = '#f2e6c8'; g.beginPath(); g.ellipse(w / 2, 58, 22, 30, 0, 0, TAU); g.fill();
    g.fillStyle = '#2e5a9e'; g.fillRect(8, 100, w - 16, 54); g.fillStyle = '#f1f1ea'; g.font = `700 22px ${F.sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('КОНЦЕРТ', w / 2, 126);
    g.fillStyle = '#ced2d6'; g.fillRect(14, 8, w - 28, 8);
  }, 'stand', [1, 1]);

  // ------------------------------------------------------------------------------------------ ground: forecourt paving, platform slabs
  /** pavers in running bond (20 x 10 cm) with red-brown bands 0.9 m wide every 6.0 m in both directions: tile 6 x 6 m */
  A.paving = D(512, 512, (g, w, h) => {
    const r = R(7171), ppm = w / 6;
    g.fillStyle = '#8b8179'; g.fillRect(0, 0, w, h);
    const bw = 0.9 * ppm;
    const cell = (x0, y0, x1, y1, col) => {
      const pw = 0.2 * ppm, ph = 0.1 * ppm;
      for (let y = y0, row = 0; y < y1; y += ph, row++) for (let x = x0 - (row % 2) * pw / 2; x < x1; x += pw) {
        const xa = Math.max(x, x0), xb = Math.min(x + pw, x1); if (xb <= xa) continue;
        const v = 0.92 + r() * 0.16; g.fillStyle = `rgb(${col[0] * v | 0},${col[1] * v | 0},${col[2] * v | 0})`; g.fillRect(xa + 0.4, y + 0.4, xb - xa - 0.8, ph - 0.8);
      }
    };
    cell(0, 0, w, h, [154, 143, 134]);
    cell(0, 0, bw, h, [164, 109, 95]); cell(0, 0, w, bw, [164, 109, 95]);
  }, 'paving');
  /** brick-red garden pavers (the path east of the monument) and the apron: tile 3 x 3 m */
  A.pavingRed = D(256, 256, (g, w, h) => {
    const r = R(7181), ppm = w / 3, pw = 0.2 * ppm, ph = 0.1 * ppm;
    g.fillStyle = '#7a5148'; g.fillRect(0, 0, w, h);
    for (let y = 0, row = 0; y < h; y += ph, row++) for (let x = -(row % 2) * pw / 2; x < w; x += pw) { const v = 0.9 + r() * 0.2; g.fillStyle = `rgb(${176 * v | 0},${123 * v | 0},${110 * v | 0})`; g.fillRect(x + 0.4, y + 0.4, pw - 0.8, ph - 0.8); }
  }, 'pavingRed');
  /** pale granite slabs 1.2 x 0.6 m (the platform of the stylobate, the monument apron slabs): tile 2.4 x 2.4 m */
  A.slabLight = D(256, 256, (g, w, h) => {
    const r = R(7191), cw = w / 2, rh = h / 4;
    g.fillStyle = '#9a9488'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 4; row++) for (let c = -1; c < 3; c++) { const x = c * cw + (row % 2) * cw / 2, v = 0.95 + r() * 0.1; g.fillStyle = `rgb(${184 * v | 0},${178 * v | 0},${166 * v | 0})`; g.fillRect(x + 1, row * rh + 1, cw - 2, rh - 2); }
    speckle(g, w, h, 7192, 200, 0.07);
  }, 'slabLight');
  /** granite sett strips for the kerb course of the monument platform: tile 2 x 0.5 m */
  A.kerb = D(256, 64, (g, w, h) => { const r = R(7195); for (let i = 0; i < 2; i++) { const v = 0.93 + r() * 0.12; g.fillStyle = `rgb(${154 * v | 0},${148 * v | 0},${142 * v | 0})`; g.fillRect(i * 128 + 1, 1, 126, h - 2); } g.fillStyle = 'rgba(40,36,32,0.5)'; g.fillRect(0, 0, 2, h); g.fillRect(128, 0, 2, h); speckle(g, w, h, 7196, 60, 0.08); }, 'kerb');

  // ------------------------------------------------------------------------------------------ the monument: verdigris bronze, plaque, engraved back
  /** teal verdigris bronze read by the figure kit's patina uv (u = horizontal position, v = normal.y: the TOP rows are the up-facing surfaces) */
  A.verdi = D(256, 256, (g, w, h) => {
    const r = R(7201); g.fillStyle = '#34796b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 360; i++) { g.globalAlpha = 0.2; g.fillStyle = r() < 0.5 ? '#1f433d' : '#4f9686'; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 8, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(122,188,170,0.3)'; g.fillRect(0, 0, w, h * 0.22);
    for (let x = 0; x < w; x += 3) { const s = r(); if (s < 0.3) continue; const gr = g.createLinearGradient(0, 0, 0, h * (0.25 + s * 0.4)); gr.addColorStop(0, `rgba(138,200,182,${0.2 + 0.3 * s})`); gr.addColorStop(1, 'rgba(138,200,182,0)'); g.fillStyle = gr; g.fillRect(x, 0, 3, h * (0.25 + s * 0.4)); }
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.2; g.fillStyle = '#6a553f'; g.beginPath(); g.ellipse(r() * w, h * (0.5 + r() * 0.4), 3 + r() * 6, 2 + r() * 5, r() * 3, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
  }, 'verdi');
  /** unpolished pale granite: fine speckle, a faint algae bloom toward the bottom rows; tile 1.6 x 1.6 m (the pedestal lathe, the plinth) */
  A.graniteGrain = D(128, 128, (g, w, h) => {
    const r = R(7231); g.fillStyle = '#ddd8ca'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const v = r(); g.fillStyle = v < 0.45 ? `rgba(160,152,138,${0.18 + r() * 0.2})` : v < 0.85 ? `rgba(255,255,250,${0.2 + r() * 0.25})` : `rgba(90,84,76,${0.15 + r() * 0.15})`; g.fillRect(r() * w, r() * h, 1 + r() * 1.8, 1 + r() * 1.6); }
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(143,160,138,0)'); gr.addColorStop(1, 'rgba(143,160,138,0.16)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, 'graniteGrain');
  /** the shield plaque on the front of the pedestal: heater shield under a count's coronet, 0.45 x 0.71 m (canvas 288 x 456), capitals in relief */
  A.plaque = D(288, 456, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cx = w / 2, top = 96, bot = h - 8, wd = w - 20;
    // coronet: band + nine pearl-tipped points
    g.fillStyle = '#3f8576'; g.fillRect(cx - 74, 54, 148, 34); g.fillStyle = '#6fb3a3'; g.fillRect(cx - 74, 54, 148, 5);
    for (let i = 0; i < 9; i++) { const x = cx - 66 + i * 16.5; g.fillStyle = '#4a9484'; g.beginPath(); g.moveTo(x - 6, 56); g.lineTo(x + 6, 56); g.lineTo(x + 3, 26); g.lineTo(x - 3, 26); g.closePath(); g.fill(); g.fillStyle = '#9fd3c4'; g.beginPath(); g.arc(x, 22, 5, 0, TAU); g.fill(); }
    // heater shield
    g.beginPath(); g.moveTo(10, top); g.lineTo(w - 10, top); g.lineTo(w - 10, top + 190); g.quadraticCurveTo(w - 16, bot - 70, cx, bot); g.quadraticCurveTo(16, bot - 70, 10, top + 190); g.closePath();
    g.fillStyle = '#3f8576'; g.fill(); g.lineWidth = 7; g.strokeStyle = '#6fb3a3'; g.stroke();
    g.lineWidth = 3; g.strokeStyle = '#1f433d'; g.beginPath(); g.moveTo(28, top + 14); g.lineTo(w - 28, top + 14); g.lineTo(w - 28, top + 188); g.quadraticCurveTo(w - 32, bot - 84, cx, bot - 22); g.quadraticCurveTo(32, bot - 84, 28, top + 188); g.closePath(); g.stroke();
    for (const [rx, ry] of [[24, top + 24], [w - 24, top + 24], [30, top + 200], [w - 30, top + 200]]) { g.fillStyle = '#9fd3c4'; g.beginPath(); g.arc(rx, ry, 5, 0, TAU); g.fill(); g.fillStyle = '#1f433d'; g.beginPath(); g.arc(rx + 1, ry + 1, 2.4, 0, TAU); g.fill(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const line = (t, y, sz, wt) => { g.font = `${wt} ${sz}px ${F.serif}`; let s = sz; while (s > 8 && g.measureText(t).width > wd - 54) { s -= 1; g.font = `${wt} ${s}px ${F.serif}`; } g.fillStyle = '#10261f'; g.fillText(t, cx + 1.5, y + 1.5); g.fillStyle = '#8fcfbd'; g.fillText(t, cx - 0.5, y - 0.5); g.fillStyle = '#2a5a4e'; g.fillText(t, cx, y); };
    line('ИОАННИСУ', top + 52, 34, 700); line('КАПОДИСТРИЯ', top + 96, 33, 700);
    line('ПАТРИОТЫ', top + 166, 19, 700); line('ГРЕЦИИ И РОССИИ', top + 192, 19, 700);
  }, 'plaque', [1, 1]);
  /** the four small engraved lines on the back of the shaft (the opening-day sentence "В год 300-летия Санкт-Петербурга от Греции"), dark grey letters on transparent, 0.62 x 0.4 m */
  A.back = D(256, 160, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    const L4 = ['В ГОД', '300-ЛЕТИЯ', 'САНКТ-ПЕТЕРБУРГА', 'ОТ ГРЕЦИИ'];
    L4.forEach((t, i) => { let s = 28; g.font = `600 ${s}px ${F.serif}`; while (s > 8 && g.measureText(t).width > w - 20) { s -= 1; g.font = `600 ${s}px ${F.serif}`; } g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillText(t, w / 2 + 1, 22 + i * 38 + 1); g.fillStyle = '#6a665c'; g.fillText(t, w / 2, 22 + i * 38); });
  }, 'back', [1, 1]);
  /** the bed of red begonias: tile 1 x 1 m, ruby blooms over dark green leaves */
  A.begonia = D(128, 128, (g, w, h) => {
    const r = R(7211); g.fillStyle = '#2f5a24'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.7 ? '#c8281e' : '#a81c16'; g.beginPath(); g.arc(r() * w, r() * h, 3 + r() * 4, 0, TAU); g.fill(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = '#e6463a'; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 2, 0, TAU); g.fill(); }
  }, 'begonia');
  /** the information board beside the monument: white panel with a few lines (no emblem) */
  A.board = D(128, 160, (g, w, h) => { g.fillStyle = '#f2f1ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#6a6e74'; for (let i = 0; i < 9; i++) g.fillRect(12, 36 + i * 12, 104 - (i % 3) * 18, 4); g.fillStyle = '#2e5a9e'; g.fillRect(12, 10, 60, 14); }, 'board');
  return A;
}
