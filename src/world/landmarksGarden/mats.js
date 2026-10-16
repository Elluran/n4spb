// landmarksGarden/mats.js - the materials of the Summer Garden module (dossier docs/research/summer-garden.md 3.4, 5, 6, 7).
// Colours: Karelian pink-grey granite #c5a98f (shade #a08a80), plinth #b49a88, wrought iron #2b2b28, gilding #d9a830, Moika fence blue-grey #6c747c, lattice green #3f7f4a with lime foliage #4f9a45,
// terracotta gravel #a56a56, white statue marble #ece8e0 on pale pedestals #cfc4bc, palace ochre #e8c068 with terracotta #c4604a, Coffee House yellow #f0c33a, Tea House #e2cf7e.
// Textures are painted here with ctx.tex.draw (<= 512 px, shared by key).
const lcg = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

export function makeMats(ctx) {
  const T = ctx.mat.toon;
  const tex = (w, h, key, fn, repeat = [1, 1]) => ctx.tex.draw(w, h, fn, { key: 'lmGd-' + key, repeat });
  const speckle = (g, w, h, r, n, cols, smin = 1, smax = 3) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[(r() * cols.length) | 0]; const s = smin + r() * (smax - smin); g.fillRect(r() * w, r() * h, s, s * (0.6 + r() * 0.8)); } };

  // ---- coarse rapakivi granite: pink-grey ground with dark and pale grains
  const graniteTex = tex(256, 256, 'granite', (g, w, h) => {
    const r = lcg(11); g.fillStyle = '#c9ae98'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 1400, ['#8a7a72', '#e6d8c8', '#b98e7c', '#d9c0a8', '#6f625e'], 1.2, 3.4);
    g.globalAlpha = 0.18; speckle(g, w, h, r, 120, ['#f2e8dc', '#8d6e62'], 5, 12); g.globalAlpha = 1;
  });
  const rockTex = tex(256, 256, 'rock', (g, w, h) => {                                  // rock-faced plinth blocks with dark joints
    const r = lcg(23); g.fillStyle = '#b79c8a'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 1200, ['#7d6d66', '#d8c4b4', '#a07c6c'], 1.5, 4);
    g.strokeStyle = 'rgba(70,56,52,0.75)'; g.lineWidth = 3;
    for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); const off = (y / 64) % 2 ? 0 : 64; for (let x = off; x <= w; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); } }
  });
  const gravelTex = tex(256, 256, 'gravel', (g, w, h) => {
    const r = lcg(31); g.fillStyle = '#b87e68'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 2200, ['#cc9078', '#a06a58', '#c08670', '#aa7662', '#d8a690'], 1.2, 3.2);
  });
  const lawnTex = tex(256, 256, 'lawn', (g, w, h) => {
    const r = lcg(41); g.fillStyle = '#5e9a38'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 1800, ['#74ae46', '#4c8630', '#6aa63e', '#82b850'], 1.5, 4);
  });
  const woodFloorTex = tex(256, 256, 'woodfloor', (g, w, h) => {                       // shaded ground under the limes: dark green with leaf litter
    const r = lcg(43); g.fillStyle = '#4a7a32'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 1400, ['#3c6a2a', '#58883a', '#5b4a30', '#436f2e'], 1.5, 4);
  });
  // ---- the lattice hedge: a green timber lattice overgrown by clipped limes (opaque; foliage lumps over the lattice)
  const hedgeTex = tex(256, 256, 'hedge', (g, w, h) => {
    const r = lcg(53); g.fillStyle = '#2d5a37'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#5aa05c'; g.lineWidth = 6;                                          // square mesh 0.35 m, a tile = 1.4 m
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
    for (let i = 0; i < 2200; i++) { const y = r() * h; g.fillStyle = ['#4f9a45', '#3e8239', '#5aa84a', '#356f32', '#68b455'][(r() * 5) | 0]; g.beginPath(); g.ellipse(r() * w, y, 2 + r() * 3.5, 1.5 + r() * 2.5, r() * 3, 0, 6.3); g.fill(); }
  });
  const hedgeTop = tex(128, 128, 'hedgeTop', (g, w, h) => { const r = lcg(59); g.fillStyle = '#4a8f40'; g.fillRect(0, 0, w, h); speckle(g, w, h, r, 700, ['#5aa84a', '#3e8239', '#68b455'], 2, 5); });
  // ---- gilded S-scroll band (alpha cut-out) of the panel tops
  const scrollTex = tex(512, 64, 'scroll', (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, h * 0.78); g.lineTo(w, h * 0.78); g.stroke();
    for (let i = 0; i < 8; i++) {
      const x0 = i * 64 + 4;
      g.lineWidth = 5;
      g.beginPath(); g.moveTo(x0 + 2, h * 0.78); g.bezierCurveTo(x0 + 6, h * 0.1, x0 + 30, h * 0.1, x0 + 32, h * 0.5); g.bezierCurveTo(x0 + 33, h * 0.7, x0 + 22, h * 0.7, x0 + 22, h * 0.5); g.stroke();
      g.beginPath(); g.moveTo(x0 + 62, h * 0.78); g.bezierCurveTo(x0 + 58, h * 0.1, x0 + 34, h * 0.1, x0 + 32, h * 0.5); g.bezierCurveTo(x0 + 31, h * 0.7, x0 + 42, h * 0.7, x0 + 42, h * 0.5); g.stroke();
      g.beginPath(); g.ellipse(x0 + 32, h * 0.22, 5, 9, 0, 0, 6.3); g.fill();
    }
  });
  // ---- the Greek-key (meander) lintel of the gates: gold key on black
  const meanderTex = tex(512, 64, 'meander', (g, w, h) => {
    g.fillStyle = '#16171a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e4b838'; g.lineWidth = 5; g.lineJoin = 'miter';
    const u = 64;
    for (let i = 0; i < 8; i++) {
      const x = i * u + 6;
      g.beginPath(); g.moveTo(x, h - 8); g.lineTo(x, 8); g.lineTo(x + 46, 8); g.lineTo(x + 46, h - 20); g.lineTo(x + 20, h - 20); g.lineTo(x + 20, 24); g.lineTo(x + 32, 24); g.stroke();
      g.beginPath(); g.moveTo(x + 46, h - 8); g.lineTo(x + u, h - 8); g.stroke();
    }
  });
  // ---- statue pedestal panel with a carved garland
  const pedTex = tex(128, 128, 'pedestal', (g, w, h) => {
    const r = lcg(61); g.fillStyle = '#d3c8c0'; g.fillRect(0, 0, w, h); speckle(g, w, h, r, 500, ['#bfb2a8', '#e4dcd4', '#c8b8ae'], 1, 2.5);
    g.strokeStyle = '#b3a69c'; g.lineWidth = 3; g.strokeRect(24, 30, 80, 70);
    g.strokeStyle = '#a89a90'; g.lineWidth = 2; g.beginPath(); g.moveTo(26, 40); g.quadraticCurveTo(64, 78, 102, 40); g.stroke();
    for (let i = 0; i < 9; i++) { const t = i / 8; g.fillStyle = '#b9ab9f'; g.beginPath(); g.arc(26 + t * 76, 40 + Math.sin(t * Math.PI) * 28, 3, 0, 6.3); g.fill(); }
  });
  const latticeTex = tex(128, 128, 'lattice', (g, w, h) => {                                // green timber lattice (alpha cut-out, diagonal)
    g.clearRect(0, 0, w, h); g.strokeStyle = '#ffffff'; g.lineWidth = 7;
    for (let i = -2; i <= 4; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 128, 128); g.stroke(); g.beginPath(); g.moveTo(i * 32 + 128, 0); g.lineTo(i * 32, 128); g.stroke(); }
    g.lineWidth = 10; g.strokeRect(0, 0, w, h);
  });
  const waterTex = tex(128, 128, 'water', (g, w, h) => { const r = lcg(71); g.fillStyle = '#3f6670'; g.fillRect(0, 0, w, h); speckle(g, w, h, r, 300, ['#4c7a84', '#34585f', '#5c8892'], 3, 9); });
  const pondTex = tex(128, 128, 'pond', (g, w, h) => { const r = lcg(73); g.fillStyle = '#7a5a34'; g.fillRect(0, 0, w, h); speckle(g, w, h, r, 300, ['#8a6a40', '#6a4c2c', '#8f7048'], 3, 9); });

  const M = {
    granite: T('#ffffff', { map: graniteTex, name: 'lmGd-granite', paint: 0.03 }),
    graniteRock: T('#ffffff', { map: rockTex, name: 'lmGd-rock', paint: 0.03 }),
    graniteShade: T('#a08a80', { name: 'lmGd-graniteShade', paint: 0.03 }),
    graniteGrey: T('#8f8f90', { name: 'lmGd-graniteGrey', paint: 0.03 }),
    graniteDark: T('#55575a', { name: 'lmGd-graniteDark', paint: 0.03 }),
    kerb: T('#9a928c', { name: 'lmGd-kerb', paint: 0.03 }),
    iron: T('#2b2b28', { name: 'lmGd-iron' }),
    ironGrey: T('#6c747c', { name: 'lmGd-ironGrey' }),
    gold: T('#d9a830', { name: 'lmGd-gold', emissive: '#6a4a08', emissiveIntensity: 0.45 }),
    goldBright: T('#f0c850', { name: 'lmGd-goldBright', emissive: '#7a5a10', emissiveIntensity: 0.5 }),
    scroll: T('#d9a830', { map: scrollTex, alphaTest: 0.5, side: 'double', name: 'lmGd-scroll', emissive: '#6a4a08', emissiveIntensity: 0.45 }),
    meander: T('#ffffff', { map: meanderTex, name: 'lmGd-meander', emissive: '#2a1e04', emissiveIntensity: 0.3 }),
    gravel: T('#ffffff', { map: gravelTex, name: 'lmGd-gravel', paint: 0.05, polygonOffset: -2 }),
    lawn: T('#ffffff', { map: lawnTex, name: 'lmGd-lawn', paint: 0.06, polygonOffset: -1 }),
    woodFloor: T('#ffffff', { map: woodFloorTex, name: 'lmGd-woodFloor', paint: 0.06, polygonOffset: -1 }),
    hedge: T('#ffffff', { map: hedgeTex, name: 'lmGd-hedge', paint: 0.04 }),
    hedgeTop: T('#ffffff', { map: hedgeTop, name: 'lmGd-hedgeTop', paint: 0.04 }),
    lattice: T('#3f7f4a', { map: latticeTex, alphaTest: 0.5, side: 'double', name: 'lmGd-lattice', paint: 0.02 }),
    boxHedge: T('#3a7a3a', { name: 'lmGd-boxHedge', paint: 0.1 }),
    marble: T('#f0ece4', { name: 'lmGd-marble', paint: 0.03 }),
    marbleShade: T('#cbc6c4', { name: 'lmGd-marbleShade', paint: 0.03 }),
    pedestal: T('#ffffff', { map: pedTex, name: 'lmGd-pedestal', paint: 0.03 }),
    pedestalPlain: T('#cfc4bc', { name: 'lmGd-pedestalPlain', paint: 0.03 }),
    porphyry: T('#a8685a', { name: 'lmGd-porphyry', paint: 0.03 }),
    porphyryPlinth: T('#7a4a42', { name: 'lmGd-porphyryPlinth', paint: 0.03 }),
    bronze: T('#4a4f46', { name: 'lmGd-bronze', paint: 0.02 }),
    verdigris: T('#5a8a74', { name: 'lmGd-verdigris', paint: 0.03 }),
    water: T('#ffffff', { map: waterTex, name: 'lmGd-water', paint: 0.02, emissive: '#10303a', emissiveIntensity: 0.25, polygonOffset: -3 }),
    pond: T('#ffffff', { map: pondTex, name: 'lmGd-pond', paint: 0.02, emissive: '#2a1a08', emissiveIntensity: 0.2, polygonOffset: -3 }),
    marbleCoping: T('#f2eee8', { name: 'lmGd-coping', paint: 0.03 }),
    booth: T('#e6e8e6', { name: 'lmGd-booth', paint: 0.02 }),
    boothGlass: T('#6c8ca0', { name: 'lmGd-boothGlass', polygonOffset: -1 }),
    green: T('#3f7f4a', { name: 'lmGd-green', paint: 0.03 }),
    greenDark: T('#2d5a37', { name: 'lmGd-greenDark', paint: 0.03 }),
    white: T('#f2eee6', { name: 'lmGd-white', paint: 0.03 }), whiteShade: T('#d8d2c6', { name: 'lmGd-whiteShade', paint: 0.03 }),
    black: T('#16171a', { name: 'lmGd-black' }),
  };
  M.cutouts = new Set([M.scroll, M.lattice]);
  M.decals = new Set([M.meander]);
  return M;
}
