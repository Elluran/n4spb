// landmarksG/mats.js - materials and canvas textures of Palace Square beyond the shared stucco vocabulary (common.js): the pale-yellow General Staff wall, the olive-green bronze of the
// Triumphal Arch sculpture, red Pyterlahti granite of the Alexander Column, the stone-field paving tile, coffers, meander / balustrade / palmette strips, the dome.
// Colours: docs/research/palace-square-hermitage.md sections 4-6 (sampled on refs/palace-square 082 090 093 105 117; all are lit photographic albedos).
import * as THREE from 'three';

export const GC = {
  wall: '#ebd091', wallShade: '#d9bd7c', white: '#f2eee3', whiteShade: '#d9d5c8', plinth: '#a98b80', plinthDark: '#8c726a',
  olive: '#7b7d43', oliveDark: '#565a31', oliveLight: '#8f9150', bronze: '#33302b', bronzeDark: '#26231f', patina: '#566e64',
  gold: '#d6ac4e', graniteRed: '#b57e6e', graniteRedDark: '#8e5d52', graniteStep: '#9b8f88', graniteGrey: '#a9a4a0', fenceGreen: '#2f5f4b',
  roofGrey: '#8f969b', domeGrey: '#7b838c', guardsWall: '#e6dc9c', guardsWhite: '#ebe8dc', lampIron: '#1b1f20', globe: '#f2efe4',
  asphalt: '#6c6e6f', asphaltLight: '#7e807f', sett: '#4b4e56', settLight: '#62656b', band: '#b5ada7', pink: '#b4796c',
};

export function makeG(K) {
  const ctx = K.ctx, tex = ctx.tex, T = ctx.mat.toon;
  const G = {};
  G.pavePitch = 9.7;                                                      // one field of the stone paving (m); the column stands on a crossing of the bands

  const alphaMat = (key, w, h, fn, o = {}) => {
    const map = tex.draw(w, h, (g) => { g.clearRect(0, 0, w, h); fn(g, w, h); }, { key: 'lmG-' + key, repeat: [1, 1] });
    const m = T(o.color || '#ffffff', { map, alphaTest: 0.45, side: 'double', name: 'lmG-' + key });
    K.decalMats.add(m); return m;
  };

  // ---- Greek key (meander) strip: white relief on the wall, tile = 2 : 1 (two key units of 1 : 1)
  G.meander = alphaMat('meander', 256, 64, (g, w, h) => {
    g.fillStyle = '#f4f0e6';
    const u = 64;
    for (let i = 0; i < 4; i++) {
      const x = i * u;
      g.fillRect(x + 6, 6, 52, 7);                  // top bar
      g.fillRect(x + 51, 6, 7, 52);                 // right bar down
      g.fillRect(x + 14, 51, 44, 7);                // bottom bar back
      g.fillRect(x + 14, 20, 7, 38);                // left bar up
      g.fillRect(x + 14, 20, 30, 7);                // inner bar
      g.fillRect(x + 37, 20, 7, 24);                // inner bar down
    }
  });
  // ---- balustrade (balusters seen from the front on a white rail), tile 1 : 1 = 1.1 m x 1.1 m (alpha cut-out)
  G.balust = alphaMat('balust', 128, 128, (g, w, h) => {
    g.fillStyle = '#f1ede2';
    g.fillRect(0, 0, w, 12); g.fillRect(0, h - 14, w, 14);
    for (let i = 0; i < 4; i++) {
      const cx = i * 32 + 16;
      g.beginPath(); g.moveTo(cx - 4, 12); g.lineTo(cx + 4, 12); g.quadraticCurveTo(cx + 12, 40, cx + 5, 58); g.quadraticCurveTo(cx + 15, 80, cx + 5, h - 14);
      g.lineTo(cx - 5, h - 14); g.quadraticCurveTo(cx - 15, 80, cx - 5, 58); g.quadraticCurveTo(cx - 12, 40, cx - 4, 12); g.fill();
    }
  });
  // ---- palmette / anthemion frieze under the cornice (white on the wall), tile 3 : 1
  G.palmette = alphaMat('palmette', 384, 64, (g, w, h) => {
    g.fillStyle = '#f2eee2';
    for (let i = 0; i < 6; i++) {
      const cx = i * 64 + 32;
      for (let k = -3; k <= 3; k++) { g.save(); g.translate(cx, 54); g.rotate(k * 0.3); g.beginPath(); g.ellipse(0, -22, 5, 18, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
      g.beginPath(); g.arc(cx, 54, 7, 0, Math.PI * 2); g.fill();
    }
    g.fillRect(0, 56, w, 5);
  });
  // ---- window-head lace panels: small white cartouches (tile 1 : 1)
  G.lace = alphaMat('lace', 128, 128, (g) => {
    g.fillStyle = '#f4f0e6';
    g.fillRect(34, 14, 60, 100);
    g.fillStyle = '#d6cfbd'; g.fillRect(44, 24, 40, 80);
    g.fillStyle = '#f4f0e6'; g.beginPath(); g.ellipse(64, 64, 15, 28, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(58, 14, 12, 100);
  });
  // ---- attic frieze of the arch: 12 fasces + garlands with helmets (olive on the wall), tile 1 : 1 per fasces pitch
  G.fasces = alphaMat('fasces', 256, 128, (g) => {
    g.fillStyle = '#82844a';
    g.fillRect(14, 8, 26, 112);                                     // fasces bundle
    g.fillStyle = '#5b5e33'; for (let y = 22; y < 112; y += 22) g.fillRect(10, y, 34, 6);
    g.fillStyle = '#82844a';
    g.beginPath(); g.moveTo(27, 2); g.lineTo(36, 14); g.lineTo(18, 14); g.fill();
    g.lineWidth = 9; g.strokeStyle = '#82844a';
    g.beginPath(); g.moveTo(40, 36); g.quadraticCurveTo(128, 120, 216, 36); g.stroke();          // garland
    g.beginPath(); g.arc(128, 60, 24, Math.PI, 0); g.lineTo(150, 86); g.lineTo(106, 86); g.closePath(); g.fill();       // helmet
    g.fillRect(122, 28, 12, 16);
  });
  // ---- spandrel victory: a winged figure on a globe (olive on the wall), 1 : 1
  G.victory = alphaMat('victory', 256, 256, (g) => {
    const A = '#82844a', B = '#5b5e33', C = '#a2a463';                                            // olive bronze: body, shade, highlight (the sculpture colour of photo 093)
    g.fillStyle = A; g.strokeStyle = A;
    g.beginPath(); g.arc(64, 222, 26, 0, Math.PI * 2); g.fill();                                // globe
    g.fillStyle = C; g.beginPath(); g.arc(56, 213, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = A;
    // big wing swept up behind the body, feathers as dark lines
    g.beginPath(); g.moveTo(130, 140); g.quadraticCurveTo(40, 120, 18, 30); g.quadraticCurveTo(70, 52, 96, 40); g.quadraticCurveTo(100, 70, 140, 80); g.closePath(); g.fill();
    g.strokeStyle = B; g.lineWidth = 4;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(128 - i * 6, 138 - i * 3); g.quadraticCurveTo(70 - i * 6, 110 - i * 12, 26 + i * 8, 40 + i * 6); g.stroke(); }
    g.strokeStyle = A;
    // second wing, smaller, to the right and up
    g.beginPath(); g.moveTo(138, 130); g.quadraticCurveTo(190, 110, 214, 150); g.quadraticCurveTo(170, 150, 150, 168); g.closePath(); g.fill();
    // body: a flying figure, robe trailing down-left to the globe
    g.beginPath(); g.moveTo(150, 92); g.quadraticCurveTo(176, 110, 160, 150); g.quadraticCurveTo(130, 190, 84, 208); g.lineTo(60, 196); g.quadraticCurveTo(110, 170, 122, 130); g.quadraticCurveTo(130, 104, 150, 92); g.closePath(); g.fill();
    g.strokeStyle = B; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(148 - i * 6, 112 + i * 10); g.quadraticCurveTo(116 - i * 8, 160, 76, 200 - i * 3); g.stroke(); }
    g.fillStyle = A; g.strokeStyle = A;
    g.beginPath(); g.arc(150, 80, 14, 0, Math.PI * 2); g.fill();                                  // head
    g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); g.moveTo(158, 100); g.quadraticCurveTo(200, 84, 230, 64); g.stroke();   // arm with the wreath
    g.lineWidth = 5; g.beginPath(); g.arc(238, 60, 13, 0, Math.PI * 2); g.stroke();
    g.fillStyle = C; g.beginPath(); g.arc(154, 76, 5, 0, Math.PI * 2); g.fill();
  });
  // ---- coffered vault of the arch (ochre panels in olive frames): tile 2 x 2 coffers
  G.coffer = T('#ffffff', { map: tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#6b6e3a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x = i * 128 + 14, y = j * 128 + 14;
      g.fillStyle = '#e1c485'; g.fillRect(x, y, 100, 100);
      g.fillStyle = '#c8aa68'; g.fillRect(x + 8, y + 8, 84, 84);
      g.fillStyle = '#9a8040'; g.fillRect(x + 8, y + 8, 84, 8);
    }
  }, { key: 'lmG-coffer', repeat: [1, 1] }), name: 'lmG-coffer' });
  // ---- bronze relief panel of the column pedestal: figures on a dark ground, 3 : 2
  G.reliefPanel = T('#ffffff', { map: tex.draw(384, 256, (g, w, h) => {
    g.fillStyle = '#3a342d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6a5f50';
    g.fillRect(8, 8, w - 16, 6); g.fillRect(8, h - 14, w - 16, 6); g.fillRect(8, 8, 6, h - 16); g.fillRect(w - 14, 8, 6, h - 16);
    const fig = (cx, flip) => {                                                                // a winged Victory + river god, abstract
      g.save(); g.translate(cx, 128); g.scale(flip, 1);
      g.beginPath(); g.ellipse(0, -30, 14, 52, 0.3, 0, Math.PI * 2); g.fill();                  // wing
      g.beginPath(); g.moveTo(-14, -30); g.lineTo(18, -30); g.lineTo(26, 80); g.lineTo(-24, 80); g.closePath(); g.fill();
      g.beginPath(); g.arc(2, -48, 11, 0, Math.PI * 2); g.fill();
      g.restore();
    };
    g.fillStyle = '#6f6453';
    fig(70, 1); fig(314, -1);
    // central trophy: fan of spears and standards (bare staffs), two helmets, big round shield with a boss, laurel at the foot
    g.strokeStyle = '#8a7c64'; g.lineWidth = 6; g.lineCap = 'round';
    for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(192 + i * 6, 200); g.lineTo(192 + i * 22, 30 + Math.abs(i) * 10); g.stroke(); }
    g.fillStyle = '#8a7c64';
    for (let i = -4; i <= 4; i++) { g.beginPath(); g.arc(192 + i * 22, 30 + Math.abs(i) * 10, 5, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.arc(192, 118, 46, 0, Math.PI * 2); g.fill();                                // central round shield
    g.fillStyle = '#4a4238'; g.beginPath(); g.arc(192, 118, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8a7c64'; g.beginPath(); g.arc(192, 118, 14, 0, Math.PI * 2); g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.arc(192 + s * 74, 150, 20, Math.PI, 0); g.lineTo(192 + s * 94, 176); g.lineTo(192 + s * 54, 176); g.closePath(); g.fill(); }   // helmets
    for (let i = 0; i < 12; i++) { g.beginPath(); g.ellipse(112 + i * 14, 214 - Math.abs(i - 5.5) * 1.5, 9, 4, (i - 5.5) * 0.12, 0, Math.PI * 2); g.fill(); }  // laurel
  }, { key: 'lmG-relief', repeat: [1, 1] }), name: 'lmG-relief' });

  // ---- the stone field: one field of 9.7 m (1024 px, 105 px/m): diabase setts (10 x 12 cm) laid in concentric arcs, grey granite bands (1.6 m) on the four edges with a thin pink inlay, a pink diagonal belt
  // across every crossing (photos 082 090 003 + aerial 005: ~14 x 14 fields, light bands, pink inlays).  The tile edges are the band centre lines, so the column stands on a crossing.
  G.paveTex = tex.draw(1024, 1024, (g, w, h) => {
    const px = w / G.pavePitch;                                                                  // px per metre
    let sd = 1234567; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
    g.fillStyle = '#2a2c32'; g.fillRect(0, 0, w, h);                                             // joints
    const cx = w / 2, cy = h / 2, step = 0.088 * px, sl = 0.104 * px, gap = 1.2;
    const tones = ['#454850', '#4a4d56', '#4f525a', '#40434b', '#53565e', '#484b53', '#565961', '#42454d'];
    const maxR = Math.hypot(w, h) / 2 + step;
    for (let r = step * 0.5; r < maxR; r += step) {
      const n = Math.max(6, Math.round(2 * Math.PI * r / sl)), da = 2 * Math.PI / n, off = rnd() * da, r0 = r - step / 2 + gap * 0.5, r1 = r + step / 2 - gap * 0.5, ga = gap / r;
      for (let k = 0; k < n; k++) {
        const q = rnd();
        g.fillStyle = q < 0.025 ? '#665c60' : q < 0.06 ? '#60636a' : tones[(rnd() * tones.length) | 0];
        g.beginPath(); g.arc(cx, cy, r1, off + k * da + ga, off + (k + 1) * da - ga); g.arc(cx, cy, r0, off + (k + 1) * da - ga, off + k * da + ga, true); g.closePath(); g.fill();
      }
    }
    // the bands on the four edges (half of the band on each side: the neighbour tile adds the other half)
    const hb = 0.8 * px;
    const slab = (x, y, ww, hh, vertical) => {
      const n = Math.max(1, Math.round((vertical ? hh : ww) / (1.35 * px))), L = (vertical ? hh : ww) / n;
      for (let i = 0; i < n; i++) {
        const t = 168 + Math.floor(rnd() * 22);
        g.fillStyle = `rgb(${t + 6},${t},${t - 5})`;
        if (vertical) g.fillRect(x, y + i * L, ww, L - 2); else g.fillRect(x + i * L, y, L - 2, hh);
      }
    };
    g.fillStyle = '#7f7771'; g.fillRect(0, 0, w, hb); g.fillRect(0, h - hb, w, hb); g.fillRect(0, 0, hb, h); g.fillRect(w - hb, 0, hb, h);   // slab joints show through the gaps
    slab(0, 0, w, hb - 2, false); slab(0, h - hb + 2, w, hb - 2, false); slab(0, 0, hb - 2, h, true); slab(w - hb + 2, 0, hb - 2, h, true);
    g.fillStyle = '#4a433f';                                                                     // dark kerb line between band and setts
    g.fillRect(0, hb, w, 2.5); g.fillRect(0, h - hb - 2.5, w, 2.5); g.fillRect(hb, 0, 2.5, h); g.fillRect(w - hb - 2.5, 0, 2.5, h);
    // pink granite inlay in the centre of the bands (wider on the bands that run along the palace axis)
    g.fillStyle = '#b48478';
    g.fillRect(0, 0, 0.2 * px, h); g.fillRect(w - 0.2 * px, 0, 0.2 * px, h);                     // along the axis (u)
    g.fillStyle = '#b48e83';
    g.fillRect(0, 0, w, 0.11 * px); g.fillRect(0, h - 0.11 * px, w, 0.11 * px);
    // the pink diagonal belt through every crossing (the tile corner), 0.6 m x 2.6 m
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      g.save(); g.translate(x, y); g.rotate(-Math.PI / 4);
      g.fillStyle = '#a79f98'; g.fillRect(-1.5 * px, -0.62 * px, 3.0 * px, 1.24 * px);          // grey margins
      g.fillStyle = '#ad7f73'; g.fillRect(-1.5 * px, -0.3 * px, 3.0 * px, 0.6 * px);            // pink core
      g.restore();
    }
  }, { key: 'lmG-pave2', repeat: [1, 1], anisotropy: 16 });
  G.pave = T('#ffffff', { map: G.paveTex, polygonOffset: -4, paint: 0.035, name: 'lmG-pave' });
  // granite band that outlines the stone field and rings the column (2 m): slabs 1.2 m, dark joints; uv = (length / 4.8 m, across 0..1)
  G.bandTex = tex.draw(512, 64, (g, w, h) => {
    let sd = 777; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
    g.fillStyle = '#6e6761'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { const t = 170 + Math.floor(rnd() * 20); g.fillStyle = `rgb(${t + 6},${t},${t - 5})`; g.fillRect(i * 128 + 2, 3, 124, h - 6); }
    g.fillStyle = 'rgba(80,72,66,0.5)'; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
  }, { key: 'lmG-bandTex', repeat: [1, 1], anisotropy: 8 });
  G.band = T('#ffffff', { map: G.bandTex, polygonOffset: -5, paint: 0.04, name: 'lmG-band' });
  G.pinkInlay = T('#b08275', { polygonOffset: -6, paint: 0.04, name: 'lmG-pinkInlay' });
  // worn asphalt of the open square (photo 011: patched, blotchy, darker where wet): one 10 m tile with fine aggregate, hair cracks and a few rubber smears; the big blotches are vertex colours
  G.asphaltTex = tex.draw(512, 512, (g, w, h) => {
    let sd = 4242; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
    g.fillStyle = '#686b6e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const t = 90 + Math.floor(rnd() * 70); g.fillStyle = `rgba(${t},${t + 2},${t + 4},0.32)`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2.5, 1 + rnd() * 2); }
    for (let i = 0; i < 1500; i++) { g.fillStyle = 'rgba(28,30,34,0.35)'; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
    g.lineCap = 'round';
    for (let c = 0; c < 7; c++) {                                                                // hair cracks (drawn 3 x 3 so that the tile repeats seamlessly)
      let x = rnd() * w, y = rnd() * h, a = rnd() * 6.28; const pts = [[x, y]];
      for (let k = 0; k < 14; k++) { a += (rnd() - 0.5) * 1.1; x += Math.cos(a) * (8 + rnd() * 16); y += Math.sin(a) * (8 + rnd() * 16); pts.push([x, y]); }
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.strokeStyle = 'rgba(30,32,36,0.34)'; g.lineWidth = 1.0; g.beginPath(); pts.forEach((p, k) => (k ? g.lineTo(p[0] + ox, p[1] + oy) : g.moveTo(p[0] + ox, p[1] + oy))); g.stroke(); }
    }
    for (let i = 0; i < 0; i++) {                                                                // (rubber smears: off, they read as blobs)
      const x = rnd() * w, y = rnd() * h, rx = 20 + rnd() * 50, ry = 6 + rnd() * 14, a = rnd() * 3.14;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.fillStyle = 'rgba(40,42,48,0.16)'; g.beginPath(); g.ellipse(x + ox, y + oy, rx, ry, a, 0, 6.283); g.fill(); }
    }
  }, { key: 'lmG-asphalt2', repeat: [1, 1], anisotropy: 8 });
  G.asphalt = T('#ffffff', { map: G.asphaltTex, polygonOffset: -3, paint: 0.1, name: 'lmG-asphalt' });                              // flat (bands along the General Staff)
  G.asphaltV = T('#ffffff', { map: G.asphaltTex, vertexColors: true, polygonOffset: -3, paint: 0.1, name: 'lmG-asphaltV' });          // the square (vertex colour blotches)
  G.asphaltPatch = T('#ffffff', { map: G.asphaltTex, vertexColors: true, polygonOffset: -3.3, paint: 0.1, name: 'lmG-asphaltPatch' });
  G.mark = T('#e6e5df', { polygonOffset: -4.5, paint: 0.03, name: 'lmG-mark' });
  G.flags = T('#a39f98', { polygonOffset: -3, paint: 0.06, name: 'lmG-flagstone' });
  // the pavement in front of the General Staff (aerial 005: a lattice of light diagonal joints on grey-pink granite), tile 4 m x 4 m
  G.flagTex = tex.draw(256, 256, (g, w, h) => {
    let sd = 99; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
    g.fillStyle = '#8f8883'; g.fillRect(0, 0, w, h);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const t = 132 + Math.floor(rnd() * 20); g.fillStyle = `rgb(${t + 6},${t},${t - 3})`; g.fillRect(i * 64 + 1.5, j * 64 + 1.5, 61, 61); }
    g.strokeStyle = '#c3bcb5'; g.lineWidth = 7;
    for (const [x0, y0, x1, y1] of [[-64, 0, 192, 256], [64, 0, 320, 256], [192, 0, 448, 256], [-192, 0, 64, 256], [-64, 256, 192, 0], [64, 256, 320, 0], [192, 256, 448, 0], [-192, 256, 64, 0]]) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  }, { key: 'lmG-flagTex2', repeat: [1, 1], anisotropy: 8 });
  G.flagMat = T('#ffffff', { map: G.flagTex, paint: 0.05, polygonOffset: -3, name: 'lmG-flagMat' });
  G.flagMatFlat = T('#ffffff', { map: G.flagTex, paint: 0.05, polygonOffset: -3.6, name: 'lmG-flagMatFlat' });                       // same stone, for ribbons without a kerb face

  // ---- fence fan panel: a sunburst semicircle row (alpha cut-out), 1 : 0.22
  G.fanMat = alphaMat('fan', 256, 64, (g, w, h) => {
    g.strokeStyle = '#2f5f4b'; g.fillStyle = '#2f5f4b'; g.lineWidth = 3;
    g.fillRect(0, h - 5, w, 5);
    for (let i = 0; i < 2; i++) {
      const cx = i * 128 + 64, r = 58;
      g.beginPath(); g.arc(cx, h - 3, r, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(cx, h - 3, r * 0.6, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(cx, h - 3, r * 0.25, Math.PI, 0); g.fill();
      for (let k = 0; k <= 8; k++) { const a = Math.PI + k * Math.PI / 8; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.25, h - 3 + Math.sin(a) * r * 0.25); g.lineTo(cx + Math.cos(a) * r, h - 3 + Math.sin(a) * r); g.stroke(); }
    }
  });
  K.spearGeo = new THREE.ConeGeometry(0.03, 0.17, 4); K.spearGeo.translate(0, 0.085, 0);

  // ---- plain materials
  const M = {};
  M.wall = K.wall(GC.wall); M.wallShade = K.wall(GC.wallShade);
  M.white = T(GC.white); M.whiteShade = T(GC.whiteShade);
  M.plinth = T(GC.plinth, { name: 'lmG-plinth' }); M.plinthDark = T(GC.plinthDark);
  M.olive = T(GC.olive, { name: 'lmG-olive' }); M.oliveDark = T(GC.oliveDark); M.oliveLight = T(GC.oliveLight);
  M.bronze = T(GC.bronze, { name: 'lmG-bronze' }); M.bronzeDark = T(GC.bronzeDark); M.patina = T(GC.patina);
  M.gold = T(GC.gold, { emissive: '#4a3508', emissiveIntensity: 0.35, name: 'lmG-gold' });
  M.graniteRed = T(GC.graniteRed, { name: 'lmG-graniteRed' }); M.graniteRedDark = T(GC.graniteRedDark);
  M.graniteStep = T(GC.graniteStep); M.graniteGrey = T(GC.graniteGrey);
  M.fence = T(GC.fenceGreen, { name: 'lmG-fence' });
  G.roofTex = tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#9aa1a5'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(70,78,84,0.45)'; g.fillRect(i * 36 + 2, 0, 3, h); g.fillStyle = 'rgba(210,216,220,0.35)'; g.fillRect(i * 36 + 5, 0, 2, h); }
    for (let j = 0; j < 4; j++) { g.fillStyle = 'rgba(70,78,84,0.25)'; g.fillRect(0, j * 64 + 30, w, 2); }
  }, { key: 'lmG-roofTex', repeat: [1, 1] });
  M.roof = T('#ffffff', { map: G.roofTex, name: 'lmG-roof' }); M.dome = T(GC.domeGrey, { side: 'double', name: 'lmG-dome' });
  M.guards = K.wall(GC.guardsWall); M.guardsWhite = T(GC.guardsWhite);
  M.lamp = T(GC.lampIron, { name: 'lmG-lamp' });
  M.globe = ctx.mat.emissive ? ctx.mat.emissive(GC.globe, 0.55) : T(GC.globe);
  G.domeTex = tex.draw(512, 256, (g, w, h) => {
    g.fillStyle = '#6f7a86'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 24; i++) { const x = i * w / 24; g.fillStyle = '#9aa4ad'; g.fillRect(x - 5, 0, 10, h); g.fillStyle = '#586470'; for (let y = 10; y < h; y += 14) g.fillRect(x + 8, y, w / 24 - 16, 2); }
    g.fillStyle = '#9aa4ad'; for (const y of [60, 130, 190]) g.fillRect(0, y, w, 6);
  }, { key: 'lmG-domeTex', repeat: [1, 1] });
  M.domeRibbed = T('#ffffff', { map: G.domeTex, side: 'double', name: 'lmG-domeRibbed' });
  M.domeRib = T('#8e98a2', { name: 'lmG-domeRib' });
  M.dark = T('#1c2024'); M.black = T('#101214');
  M.shaft = T('#c78d7b', { name: 'lmG-shaft' });
  M.reliefMat = G.reliefPanel;
  M.door = T('#8a5a30'); M.glassDark = T('#222a33');
  G.M = M;
  G.THREE = THREE;
  return G;
}
