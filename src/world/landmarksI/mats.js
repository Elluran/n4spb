// landmarksI/mats.js - materials and canvas decals of the Winter Palace / Hermitage (docs/research/palace-square-hermitage.md section 7.3, photos 016 031 042 052 067).
// Colours (albedo, sampled medians moved toward the sunlit look): wall mint-turquoise #80c2b0, white order #f1efe9, gold ornament #c9a455, roof green #4f7a4a, statues #9fa890.
// Decals (gold cartouches, shells, masks, the double-headed eagle, the iron gate lattice, the roof balustrade, the clock) are alpha-cut planes lifted 3-5 cm off the wall (noOutline via K.decalMats).
import * as THREE from 'three';

export const PAL = {
  wall: '#88c9b8', wallShade: '#6fb09e', white: '#f1efe9', whiteShade: '#dcdcd4', gold: '#c9a455', goldDeep: '#a88a45', goldBright: '#d9a54a',
  granite: '#9a9184', graniteTop: '#a49a95', roof: '#4f7a4a', chimney: '#7aa894', statue: '#9fa890', iron: '#10191b', ironLace: '#454a4a',
  cream: '#e0cb93', ochre: '#cfc47c', yellow: '#e3cf7a', smallH: '#b7d0bc', theatre: '#d4dcc9', roofGreen2: '#6f8e65',
};

export function makePalaceMats(K) {
  const ctx = K.ctx, T = ctx.mat.toon, tex = ctx.tex;
  const M = {};
  const toon = (c, o) => T(c, o);
  M.wall = toon(PAL.wall, { name: 'lmI-wall', paint: 0.03 });
  M.wallShade = toon(PAL.wallShade);
  M.white = toon(PAL.white, { name: 'lmI-white', paint: 0.02 });
  M.whiteShade = toon(PAL.whiteShade);
  M.gold = toon(PAL.gold, { emissive: '#3a2c0a', emissiveIntensity: 0.35, name: 'lmI-gold' });
  M.goldBright = toon(PAL.goldBright, { emissive: '#4a3408', emissiveIntensity: 0.55, name: 'lmI-goldB' });
  M.granite = toon(PAL.granite, { map: K.texRust, name: 'lmI-granite' });
  M.graniteFlat = toon(PAL.granite, { name: 'lmI-graniteF' });
  M.graniteTop = toon(PAL.graniteTop);
  M.roof = toon(PAL.roof, { name: 'lmI-roof', side: 'double' });
  M.chimney = toon(PAL.chimney);
  M.roofGreen = toon(PAL.roofGreen2, { name: 'lmI-roofG' });
  M.statue = toon(PAL.statue, { name: 'lmI-statue' });
  M.iron = toon(PAL.iron, { name: 'lmI-iron' });
  M.ironLace = toon(PAL.ironLace);
  M.cobble = toon('#77757a', { name: 'lmI-cobble' });
  M.court = toon('#b8ad98', { name: 'lmI-court', paint: 0.05 });
  M.cream = toon(PAL.cream, { paint: 0.03 });
  M.dark = toon('#1e2630');
  M.interior = toon('#e6e3d9', { name: 'lmI-interior', side: 'double' });

  // ---------------------------------------------------------------- gold decals (colour baked in the texture)
  const dec = (key, w, h, fn, o = {}) => {
    const map = tex.draw(w, h, (g) => { g.clearRect(0, 0, w, h); fn(g, w, h); }, { key: 'lmI-pal-' + key, repeat: [1, 1] });
    const m = T('#ffffff', { map, alphaTest: 0.45, side: 'double', name: 'lmI-pal-' + key, ...o });
    K.decalMats.add(m); return m;
  };
  const GOLD = '#d2ab52', DEEP = '#8f7436', LITE = '#efd48a';
  const two = (g, fn) => { g.save(); g.translate(4, 4); g.fillStyle = DEEP; g.strokeStyle = DEEP; fn(); g.restore(); g.fillStyle = GOLD; g.strokeStyle = GOLD; fn(); };
  /** scallop shell over the ground-floor arches (2 : 1) */
  M.shell = dec('shell', 256, 128, (g) => {
    two(g, () => {
      g.beginPath(); g.moveTo(24, 118); g.quadraticCurveTo(24, 20, 128, 12); g.quadraticCurveTo(232, 20, 232, 118); g.closePath(); g.fill();
      g.lineWidth = 12; g.beginPath(); g.moveTo(10, 112); g.quadraticCurveTo(20, 80, 44, 96); g.moveTo(246, 112); g.quadraticCurveTo(236, 80, 212, 96); g.stroke();
    });
    g.strokeStyle = '#7a6128'; g.lineWidth = 4;
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.1 + 0.8 * i / 8); g.beginPath(); g.moveTo(128, 118); g.lineTo(128 - Math.cos(a) * 104, 118 - Math.sin(a) * 100); g.stroke(); }
  });
  /** second-floor cartouche: oval + crown with two C scrolls and acanthus (2 : 1) */
  M.cart = dec('cart', 256, 128, (g) => {
    two(g, () => {
      g.beginPath(); g.ellipse(128, 70, 30, 40, 0, 0, Math.PI * 2); g.fill();
      g.lineWidth = 14; g.lineCap = 'round';
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(128 + sx * 36, 40); g.bezierCurveTo(128 + sx * 90, 20, 128 + sx * 120, 70, 128 + sx * 84, 104); g.bezierCurveTo(128 + sx * 70, 116, 128 + sx * 56, 98, 128 + sx * 66, 86); g.stroke(); }
      g.beginPath(); g.moveTo(98, 28); g.lineTo(104, 10); g.lineTo(116, 20); g.lineTo(128, 4); g.lineTo(140, 20); g.lineTo(152, 10); g.lineTo(158, 28); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(128, 120, 22, 8, 0, 0, Math.PI * 2); g.fill();
    });
    g.fillStyle = '#8f7436'; g.beginPath(); g.ellipse(128, 70, 16, 24, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = LITE; g.beginPath(); g.ellipse(128, 66, 8, 14, 0, 0, Math.PI * 2); g.fill();
  });
  /** small third-floor mask: scalloped mask with two leaves (2 : 1) */
  M.mask = dec('mask', 256, 128, (g) => {
    two(g, () => {
      g.beginPath(); g.moveTo(128, 20); g.bezierCurveTo(168, 18, 176, 60, 150, 92); g.lineTo(128, 110); g.lineTo(106, 92); g.bezierCurveTo(80, 60, 88, 18, 128, 20); g.fill();
      g.lineWidth = 12; g.lineCap = 'round';
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(128 + sx * 40, 70); g.bezierCurveTo(128 + sx * 90, 40, 128 + sx * 114, 70, 128 + sx * 100, 100); g.stroke(); }
    });
    g.fillStyle = DEEP; g.beginPath(); g.ellipse(112, 58, 8, 6, 0, 0, Math.PI * 2); g.ellipse(144, 58, 8, 6, 0, 0, Math.PI * 2); g.fill(); g.fillRect(124, 72, 8, 18);
  });
  /** sun disc (gilded round cartouche at the cornice of the end risalits), square */
  M.sun = dec('sun', 256, 256, (g) => {
    two(g, () => {
      g.beginPath(); g.arc(128, 128, 78, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; g.beginPath(); g.moveTo(128 + Math.cos(a - 0.12) * 80, 128 + Math.sin(a - 0.12) * 80); g.lineTo(128 + Math.cos(a) * 124, 128 + Math.sin(a) * 124); g.lineTo(128 + Math.cos(a + 0.12) * 80, 128 + Math.sin(a + 0.12) * 80); g.closePath(); g.fill(); }
    });
    g.fillStyle = DEEP; g.beginPath(); g.arc(128, 128, 46, 0, Math.PI * 2); g.fill(); g.fillStyle = LITE; g.beginPath(); g.arc(128, 128, 30, 0, Math.PI * 2); g.fill();
  });
  /** the big pediment cartouche of the Neva front (shield with scrolls), 4 : 3 */
  M.bigCart = dec('bigcart', 256, 192, (g) => {
    two(g, () => {
      g.beginPath(); g.moveTo(128, 20); g.bezierCurveTo(200, 20, 210, 100, 168, 150); g.lineTo(128, 176); g.lineTo(88, 150); g.bezierCurveTo(46, 100, 56, 20, 128, 20); g.fill();
      g.lineWidth = 16; g.lineCap = 'round';
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(128 + sx * 70, 40); g.bezierCurveTo(128 + sx * 130, 20, 128 + sx * 140, 90, 128 + sx * 100, 150); g.stroke(); g.beginPath(); g.moveTo(128 + sx * 40, 170); g.bezierCurveTo(128 + sx * 100, 190, 128 + sx * 126, 150, 128 + sx * 112, 130); g.stroke(); }
      g.beginPath(); g.moveTo(98, 20); g.lineTo(106, 2); g.lineTo(118, 14); g.lineTo(128, 0); g.lineTo(138, 14); g.lineTo(150, 2); g.lineTo(158, 20); g.closePath(); g.fill();
    });
    g.fillStyle = DEEP; g.beginPath(); g.moveTo(128, 50); g.bezierCurveTo(170, 50, 176, 100, 150, 134); g.lineTo(128, 148); g.lineTo(106, 134); g.bezierCurveTo(80, 100, 86, 50, 128, 50); g.fill();
    g.fillStyle = LITE; g.fillRect(116, 70, 24, 40);
  });
  const eagle = (g, cx, cy, s, col) => {
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 4 * s; g.lineCap = 'round';
    g.beginPath(); g.ellipse(cx, cy + 4 * s, 11 * s, 20 * s, 0, 0, Math.PI * 2); g.fill();                                                                 // body
    g.beginPath(); g.moveTo(cx - 11 * s, cy + 20 * s); g.lineTo(cx - 5 * s, cy + 44 * s); g.lineTo(cx, cy + 38 * s); g.lineTo(cx + 5 * s, cy + 44 * s); g.lineTo(cx + 11 * s, cy + 20 * s); g.closePath(); g.fill();   // tail
    for (const sx of [-1, 1]) {
      const W = [[8, -4], [20, -24], [42, -34], [60, -28], [57, -16], [60, -8], [52, -6], [54, 5], [44, 2], [42, 13], [32, 8], [26, 18], [12, 8]];
      g.beginPath(); W.forEach(([x, y], i) => (i ? g.lineTo(cx + sx * x * s, cy + y * s) : g.moveTo(cx + sx * x * s, cy + y * s))); g.closePath(); g.fill();             // wing with feather steps
      g.beginPath(); g.moveTo(cx + sx * 4 * s, cy - 12 * s); g.quadraticCurveTo(cx + sx * 14 * s, cy - 20 * s, cx + sx * 15 * s, cy - 30 * s); g.stroke();      // neck
      g.beginPath(); g.arc(cx + sx * 15 * s, cy - 32 * s, 5.5 * s, 0, Math.PI * 2); g.fill();                                                                     // head
      g.beginPath(); g.moveTo(cx + sx * 19 * s, cy - 35 * s); g.lineTo(cx + sx * 28 * s, cy - 31 * s); g.lineTo(cx + sx * 19 * s, cy - 29 * s); g.closePath(); g.fill();   // beak
      g.beginPath(); g.moveTo(cx + sx * 6 * s, cy + 20 * s); g.lineTo(cx + sx * 14 * s, cy + 36 * s); g.lineTo(cx + sx * 10 * s, cy + 36 * s); g.closePath(); g.fill();       // leg
    }
    g.beginPath(); g.moveTo(cx - 10 * s, cy - 40 * s); g.lineTo(cx - 8 * s, cy - 50 * s); g.lineTo(cx - 4 * s, cy - 45 * s); g.lineTo(cx, cy - 53 * s); g.lineTo(cx + 4 * s, cy - 45 * s); g.lineTo(cx + 8 * s, cy - 50 * s); g.lineTo(cx + 10 * s, cy - 40 * s); g.closePath(); g.fill();   // crown
  };
  M.eagle = dec('eagle', 128, 128, (g) => { eagle(g, 64, 70, 1.15, DEEP); eagle(g, 62, 68, 1.15, GOLD); });
  /** the iron lattice of the gateways: dark graphite scrollwork with a gilded crowned eagle and two cyphers (square-ish, 2 : 3 portrait) */
  M.gate = dec('gate', 256, 384, (g, w, h) => {
    g.strokeStyle = '#1b2528'; g.fillStyle = '#1b2528'; g.lineWidth = 7; g.lineCap = 'round';
    g.strokeRect(6, 6, w - 12, h - 12);
    for (let x = 22; x < w - 10; x += 22) { g.lineWidth = 4; g.beginPath(); g.moveTo(x, h - 8); g.lineTo(x, h * 0.58); g.stroke(); }
    g.lineWidth = 5;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { const cx = 28 + c * 50 + (r % 2) * 25, cy = h * 0.58 + 22 + r * 56; if (cx > w - 22) continue; g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 1.65); g.stroke(); g.beginPath(); g.arc(cx + 18, cy + 8, 9, Math.PI, Math.PI * 2.7); g.stroke(); }
    g.lineWidth = 6; g.beginPath(); g.moveTo(10, h * 0.58); g.lineTo(w - 10, h * 0.58); g.stroke();
    for (let c = 0; c < 6; c++) { g.beginPath(); g.moveTo(14 + c * 45, h * 0.58); g.bezierCurveTo(14 + c * 45, h * 0.36, 40 + c * 45, h * 0.30, 40 + c * 45, h * 0.12); g.stroke(); }
    g.beginPath(); g.arc(w / 2, h * 0.34, 62, Math.PI, 0); g.stroke();
    g.fillStyle = '#d2ab52'; g.font = 'bold 30px serif'; g.fillText('МА', 40, h * 0.7); g.fillText('III', w - 92, h * 0.7);
  });
  /** the roof balustrade: 2.8 m tile (white rails + bottle balusters, transparent between), 4 : 1.6 */
  M.balust = dec('balust', 512, 128, (g, w, h) => {
    g.fillStyle = '#f1efe9';
    g.fillRect(0, 0, w, 14); g.fillRect(0, 14, w, 8); g.fillRect(0, h - 22, w, 22);
    const n = 10, step = w / n;
    for (let i = 0; i < n; i++) {
      const cx = step * (i + 0.5);
      g.beginPath(); g.moveTo(cx - 4, 22); g.lineTo(cx + 4, 22); g.bezierCurveTo(cx + 5, 40, cx + 17, 50, cx + 17, 66); g.bezierCurveTo(cx + 17, 84, cx + 6, 90, cx + 5, 106); g.lineTo(cx - 5, 106); g.bezierCurveTo(cx - 6, 90, cx - 17, 84, cx - 17, 66); g.bezierCurveTo(cx - 17, 50, cx - 5, 40, cx - 4, 22); g.fill();
    }
    g.fillStyle = '#d6d6cd'; for (let i = 0; i < n; i++) g.fillRect(step * (i + 0.5) + 5, 24, 3, 80);
  });
  /** dark clock face with gold hands and numerals (square) */
  M.clock = dec('clock', 128, 128, (g) => {
    g.fillStyle = '#d2ab52'; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#243038'; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e3c26a'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.fillRect(64 + Math.sin(a) * 44 - 3, 64 - Math.cos(a) * 44 - 3, 6, 6); }
    g.strokeStyle = '#e3c26a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 24, 64 - 14); g.moveTo(64, 64); g.lineTo(64 - 6, 64 + 34); g.stroke();
  });
  /** black wrought-iron balcony / grille panel (alpha, 4 : 1) */
  M.grille = dec('grille', 256, 64, (g, w, h) => {
    g.strokeStyle = '#2a2f30'; g.fillStyle = '#2a2f30'; g.lineWidth = 4;
    g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
    for (let x = 8; x < w; x += 16) { g.beginPath(); g.moveTo(x, 6); g.lineTo(x, h - 6); g.stroke(); }
    g.lineWidth = 3; for (let x = 0; x < w; x += 32) { g.beginPath(); g.arc(x + 16, h / 2, 12, 0, Math.PI * 2); g.stroke(); }
  });
  return M;
}
