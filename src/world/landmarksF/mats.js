// landmarksF/mats.js - palette, canvas textures and materials of Kazan Cathedral, the garden and Singer House.
// Colours: docs/research/kazan-cathedral.md 3.2 (hex are lit photographic colours: limestone #d9ccaa, drum #c3a96f, dome #5f9482, gold #e2b643, bases #4c4f57, bronze #2f2c29).
import * as THREE from 'three';

export const C = {
  stone: '#d6c8a4', stoneWarm: '#d3c6a3', stoneShade: '#cbbd98', stoneDark: '#b9aa84', balustrade: '#dcd5bf', drum: '#c3a96f', drumLight: '#cdb479',
  baseGranite: '#5b5e66', stepGranite: '#8f9091', floorGranite: '#9a968f', slab: '#a6a49d', slabPink: '#aa9d97', pinkGranite: '#a8837a', pinkGraniteDark: '#8a6a64', pinkRim: '#a98f88',
  dome: '#5f9482', domeRib: '#3f6f5e', domeNeck: '#4e7f6c', gold: '#e2b643', rays: '#d9a93a', bronze: '#2f2c29', bronzeStatue: '#3a4a42', patina: '#4b5a52',
  iron: '#1f2224', ironFence: '#25282a', roofLead: '#5d6166', glass: '#3b4650', doorWood: '#8c5a2b', white: '#e8e6dc',
  lawn: '#5e9a3c', lawnLit: '#6fa844', hedge: '#2f5a34', hedge2: '#3a6a3a', gravel: '#b18f83', gravelDark: '#a06a60', soil: '#3a2f28', rose1: '#d8456f', rose2: '#c8283a', rose3: '#e8809a',
  water: '#4a7f80', jet: '#eef6ff',
};

export function makeMats(ctx) {
  const T = ctx.mat.toon, tex = ctx.tex;
  const M = {}, rnd = ctx.rng(4417);

  // -------------------------------------------------------------------------------------------- textures
  /** ashlar of Pudost limestone: tile 2.4 m, 3 courses of 0.8 m, staggered joints, fine brown streaks; white so the material colour tints it */
  const texAshlar = tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(11);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(120,95,60,${0.03 + r() * 0.06})`; g.fillRect(r() * w, r() * h, 3 + r() * 14, 1 + r() * 2); }
    g.fillStyle = 'rgba(110,98,76,0.62)';
    for (let c = 0; c < 3; c++) g.fillRect(0, c * 85, w, 3);
    const offs = [0, 90, 40];
    for (let c = 0; c < 3; c++) g.fillRect(offs[c], c * 85, 3, 85);
    g.fillStyle = 'rgba(255,255,255,0.22)'; for (let c = 0; c < 3; c++) g.fillRect(0, c * 85 + 3, w, 3);
  }, { key: 'lmF-ashlar', repeat: [1, 1] });
  /** dentil strip (tile 0.9 m: 3 dentils) */
  const texDentil = tex.draw(128, 64, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(70,55,35,0.55)'; for (let i = 0; i < 3; i++) g.fillRect(i * 43 + 28, 14, 14, 40);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, w, 10);
  }, { key: 'lmF-dentil', repeat: [1, 1] });
  /** frieze with the three interlocked rings of the colonnade between the capitals (one tile = one bay) */
  const texRings = tex.draw(256, 64, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(95,80,55,0.85)'; g.lineWidth = 4;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(w / 2 + i * 20, h / 2, 17, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4);
  }, { key: 'lmF-rings', repeat: [1, 1] });
  /** coffered ceiling: tile 3 m, a 3 x 3 grid of recessed squares */
  const texCoffer = tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const x = i * 85 + 10, y = j * 85 + 10;
      g.fillStyle = 'rgba(80,66,44,0.42)'; g.fillRect(x, y, 66, 66);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x + 8, y + 8, 50, 50);
      g.fillStyle = 'rgba(190,150,70,0.8)'; g.beginPath(); g.arc(x + 33, y + 33, 7, 0, 7); g.fill();
    }
  }, { key: 'lmF-coffer', repeat: [1, 1] });
  /** sculpted frieze of the pavilion attics / apse: pale figures in a dark band (an impression, not a copy) */
  const texRelief = tex.draw(512, 96, (g, w, h) => {
    g.fillStyle = '#d8c9a4'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(95,80,58,0.5)'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
    const r = ctx.rng(77);
    for (let i = 0; i < 26; i++) {
      const x = 14 + i * 19 + r() * 6, hh = 40 + r() * 30;
      g.fillStyle = 'rgba(120,100,72,0.55)'; g.fillRect(x - 4, h - 12 - hh, 11, hh);
      g.fillStyle = 'rgba(245,238,214,0.8)'; g.beginPath(); g.arc(x + 1, h - 18 - hh, 6.5, 0, 7); g.fill(); g.fillRect(x - 3, h - 12 - hh, 8, hh - 2);
      if (i % 3 === 0) { g.fillStyle = 'rgba(245,238,214,0.7)'; g.fillRect(x - 12, h - 52 - r() * 20, 26, 5); }
    }
  }, { key: 'lmF-relief' });
  /** sunburst of the pediments: gilded rays on the beige tympanum (the map covers the bounding box of the triangle) */
  const texSun = tex.draw(512, 256, (g, w, h) => {
    g.fillStyle = '#c8b88f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d9a93a'; g.lineWidth = 7; g.lineCap = 'round';
    const cx = w / 2, cy = h * 0.98;
    for (let i = 0; i < 34; i++) { const a = Math.PI * (0.03 + 0.94 * i / 33); const r0 = 26 + (i % 2) * 22, r1 = 175 + (i % 3) * 38; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0 * 1.8, cy - Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1 * 1.8, cy - Math.sin(a) * r1); g.stroke(); }
    g.fillStyle = '#d9a93a'; g.beginPath(); g.arc(cx, cy, 22, Math.PI, 0); g.fill();
  }, { key: 'lmF-sun' });
  /** flutes of the column shafts: 20 flutes around (u 0..1), a darker groove with a lighter ridge */
  const texFlutes = tex.draw(160, 8, (g, w, h) => {
    for (let i = 0; i < 20; i++) { const x = i * w / 20; const gr = g.createLinearGradient(x, 0, x + w / 20, 0); gr.addColorStop(0, '#f4f4f4'); gr.addColorStop(0.55, '#ffffff'); gr.addColorStop(0.78, '#a89c84'); gr.addColorStop(1, '#f0f0f0'); g.fillStyle = gr; g.fillRect(x, 0, w / 20 + 1, h); }
  }, { key: 'lmF-flutes', repeat: [1, 1] });
  /** granite slabs of the square (tile 2.8 m, slabs 1.4 x 0.93 m) */
  const texSlab = tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(5);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(90,80,75,${0.04 + r() * 0.07})`; g.fillRect(r() * w, r() * h, 2 + r() * 5, 2 + r() * 4); }
    g.fillStyle = 'rgba(70,64,60,0.5)'; for (let i = 0; i < 3; i++) g.fillRect(0, i * 85, w, 2);
    for (let i = 0; i < 3; i++) { const o = (i % 2) * 64; g.fillRect(o, i * 85, 2, 85); g.fillRect(o + 128, i * 85, 2, 85); }
  }, { key: 'lmF-slab', repeat: [1, 1] });
  /** gravel path (tile 3 m) */
  const texGravel = tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(9);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,60,50' : '255,235,220'},${0.05 + r() * 0.09})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
  }, { key: 'lmF-gravel', repeat: [1, 1] });
  /** lawn tile (tile 4 m): mowing stripes + speckle */
  const texLawn = tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,70,0,0.07)'; for (let i = 0; i < 4; i++) g.fillRect(0, i * 32, w, 16);
    const r = ctx.rng(13);
    for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? 'rgba(20,80,20,0.12)' : 'rgba(210,255,150,0.14)'; g.fillRect(r() * w, r() * h, 1, 2 + r() * 2); }
  }, { key: 'lmF-lawn', repeat: [1, 1] });
  /** leafy clumps of the clipped hedges (tile 3 m) */
  const texLeaf = tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(21);
    for (let i = 0; i < 160; i++) { const x = r() * w, y = r() * h, rr = 4 + r() * 9; g.fillStyle = r() < 0.5 ? 'rgba(10,50,10,0.16)' : 'rgba(190,240,120,0.2)'; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
  }, { key: 'lmF-leaf', repeat: [1, 1] });
  /** iron picket panel, tile 2.5 x 1.1 m: 20 bars with spear tips, two rails (alpha-cut) */
  const texPickets = tex.draw(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff';
    g.fillRect(0, 56, w, 8); g.fillRect(0, h - 56, w, 8);
    for (let i = 0; i < 21; i++) { const x = 12 + i * (w - 24) / 20; g.fillRect(x - 3, 40, 6, h - 40); g.beginPath(); g.moveTo(x - 7, 40); g.lineTo(x, 4); g.lineTo(x + 7, 40); g.fill(); }
  }, { key: 'lmF-pickets', repeat: [1, 1] });
  /** Voronikhin fence panel, tile 3 x 3.1 m: spears with a zigzag top row, a frieze of rosettes in the upper third, bars below (alpha-cut) */
  const texVoron = tex.draw(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.lineWidth = 5;
    for (let i = 0; i < 25; i++) { const x = 10 + i * (w - 20) / 24; g.fillRect(x - 3, 150, 6, h - 150); }
    g.fillRect(0, 150, w, 8); g.fillRect(0, h - 40, w, 8); g.fillRect(0, 110, w, 6);
    for (let i = 0; i < 25; i++) { const x = 10 + i * (w - 20) / 24; g.beginPath(); g.moveTo(x - 6, 110); g.lineTo(x, 70 + (i % 2) * 34); g.lineTo(x + 6, 110); g.fill(); }
    g.lineWidth = 4;
    for (let i = 0; i < 4; i++) { const cx = 64 + i * 128; g.beginPath(); g.arc(cx, 280, 46, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, 280, 24, 0, 7); g.stroke(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(cx + Math.cos(a) * 24, 280 + Math.sin(a) * 24); g.lineTo(cx + Math.cos(a) * 46, 280 + Math.sin(a) * 46); g.stroke(); } }
    for (let i = 0; i < 8; i++) { const cx = 32 + i * 64; g.beginPath(); g.arc(cx, 200, 22, Math.PI, 0); g.stroke(); }
  }, { key: 'lmF-voron', repeat: [1, 1] });

  // -------------------------------------------------------------------------------------------- materials
  const stoneMap = (hex, name) => T(hex, { map: texAshlar, name, paint: 0.05 });
  Object.assign(M, {
    stone: stoneMap(C.stone, 'lmF-stone'), stoneWarm: T(C.stoneWarm, { name: 'lmF-stoneW', paint: 0.04 }), stonePlain: T(C.stone, { name: 'lmF-stoneP', paint: 0.04 }), stoneShade: T(C.stoneShade, { name: 'lmF-stoneS', paint: 0.04 }),
    stoneDark: T(C.stoneDark, { name: 'lmF-stoneD' }), shaft: T('#d9cca8', { map: texFlutes, name: 'lmF-shaft', paint: 0.04 }),
    dentil: T(C.stoneWarm, { map: texDentil, name: 'lmF-dentil', paint: 0.03 }), rings: T(C.stoneWarm, { map: texRings, name: 'lmF-rings', paint: 0.03 }), coffer: T('#d8cdaf', { map: texCoffer, name: 'lmF-coffer', paint: 0.03 }),
    relief: T('#ffffff', { map: texRelief, name: 'lmF-relief', paint: 0.03 }), sun: T('#ffffff', { map: texSun, name: 'lmF-sun', paint: 0.02 }),
    balustrade: T(C.balustrade, { name: 'lmF-balus', paint: 0.03 }),
    drum: T(C.drum, { name: 'lmF-drum', paint: 0.05 }), drumLight: T(C.drumLight, { name: 'lmF-drumL', paint: 0.04 }),
    baseGranite: T(C.baseGranite, { name: 'lmF-base', paint: 0.04 }), step: T(C.stepGranite, { name: 'lmF-step', paint: 0.04 }), floor: T(C.floorGranite, { name: 'lmF-floor', paint: 0.04 }),
    slab: T(C.slab, { map: texSlab, name: 'lmF-slabs', paint: 0.04 }), slabPink: T(C.slabPink, { map: texSlab, name: 'lmF-slabsP', paint: 0.04 }),
    pink: T(C.pinkGranite, { name: 'lmF-pink', paint: 0.03 }), pinkDark: T(C.pinkGraniteDark, { name: 'lmF-pinkD' }), rim: T(C.pinkRim, { name: 'lmF-rim', paint: 0.04 }),
    dome: T(C.dome, { name: 'lmF-dome', paint: 0.04 }), domeRib: T(C.domeRib, { name: 'lmF-domeRib' }), domeNeck: T(C.domeNeck, { name: 'lmF-domeNeck' }),
    gold: T(C.gold, { emissive: '#6a4a08', emissiveIntensity: 0.45, name: 'lmF-gold' }), rays: T(C.rays, { emissive: '#6a4a08', emissiveIntensity: 0.3, name: 'lmF-rays' }),
    bronze: T(C.bronze, { name: 'lmF-bronze' }), bronzeStatue: T(C.bronzeStatue, { name: 'lmF-bronzeS', paint: 0.03 }), patina: T(C.patina, { name: 'lmF-patina' }),
    iron: T(C.iron, { name: 'lmF-iron' }), roof: T(C.roofLead, { name: 'lmF-roof' }), glass: T(C.glass, { name: 'lmF-glass' }), door: T(C.doorWood, { name: 'lmF-door' }),
    white: T(C.white, { name: 'lmF-white' }), black: T('#15171a', { name: 'lmF-black' }),
    lawn: T(C.lawn, { map: texLawn, name: 'lmF-lawn', paint: 0.06, polygonOffset: -2 }), gravel: T(C.gravel, { map: texGravel, name: 'lmF-gravel', paint: 0.05 }),
    hedge: T(C.hedge, { map: texLeaf, name: 'lmF-hedge', paint: 0.1 }), hedge2: T(C.hedge2, { map: texLeaf, name: 'lmF-hedge2', paint: 0.1 }), soil: T(C.soil, { name: 'lmF-soil', polygonOffset: -2 }),
    rose1: T(C.rose1, { name: 'lmF-rose1' }), rose2: T(C.rose2, { name: 'lmF-rose2' }), rose3: T(C.rose3, { name: 'lmF-rose3' }),
    water: T(C.water, { name: 'lmF-water', paint: 0.02 }), asphalt: T('#54575b', { name: 'lmF-asphalt', paint: 0.05 }), cobble: T('#8a8680', { map: texSlab, name: 'lmF-cobble', paint: 0.05 }),
    crownC: T('#4a7a36', { map: texLeaf, name: 'lmF-crownC', paint: 0.1 }), lampGlass: T('#f2efe4', { emissive: '#ffd9a0', emissiveIntensity: 0.0, name: 'lmF-lampglass' }),
    bark: T('#4a3d32', { name: 'lmF-bark' }), canopy: T('#b8322c', { name: 'lmF-canopy', side: 'double' }), canopyW: T('#efe9dc', { name: 'lmF-canopyW' }), slabBeige: T('#b4aa94', { name: 'lmF-planter', paint: 0.04 }),
    jet: T('#ffffff', { transparent: true, opacity: 0.6, depthWrite: false, emissive: '#bcd6f0', emissiveIntensity: 0.5, name: 'lmF-jet' }),
    pickets: T('#25282a', { map: texPickets, alphaTest: 0.5, side: 'double', name: 'lmF-pickets', paint: 0.02 }), voron: T('#2a2e2c', { map: texVoron, alphaTest: 0.5, side: 'double', name: 'lmF-voron', paint: 0.02 }),
  });
  // -------------------------------------------------------------------------------------------- interior (docs/research/kazan-cathedral.md section 8, photos 19 82 79-83)
  /** floor: octagons of white and grey marble between small black squares, tile 8 m (8 x 8 cells of 1 m) */
  const texFloor = tex.draw(512, 512, (g, w, h) => {
    const c = 64, cut = 19;
    g.fillStyle = '#2c2b2e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const x = i * c, y = j * c;
      g.fillStyle = (i + j) % 2 ? '#d9d5cb' : '#8d8985';
      g.beginPath(); g.moveTo(x + cut, y); g.lineTo(x + c - cut, y); g.lineTo(x + c, y + cut); g.lineTo(x + c, y + c - cut); g.lineTo(x + c - cut, y + c); g.lineTo(x + cut, y + c); g.lineTo(x, y + c - cut); g.lineTo(x, y + cut); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(60,55,50,0.35)'; g.lineWidth = 1.5; g.stroke();
    }
  }, { key: 'lmF-floor8', repeat: [1, 1] });
  /** coffered vault: dark coffers with gold rosettes, tile 4 m */
  const texVault = tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#4a4038'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x = i * 128 + 8, y = j * 128 + 8;
      g.fillStyle = '#2f2823'; g.fillRect(x, y, 112, 112); g.strokeStyle = '#c9a14a'; g.lineWidth = 4; g.strokeRect(x + 4, y + 4, 104, 104);
      g.fillStyle = '#d9b25a'; g.beginPath(); g.arc(x + 56, y + 56, 18, 0, 7); g.fill();
      g.fillStyle = '#2f2823'; g.beginPath(); g.arc(x + 56, y + 56, 8, 0, 7); g.fill();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.fillStyle = '#d9b25a'; g.beginPath(); g.arc(x + 56 + Math.cos(a) * 28, y + 56 + Math.sin(a) * 28, 5, 0, 7); g.fill(); }
    }
  }, { key: 'lmF-vault', repeat: [1, 1] });
  /** dome painting: pale grisaille sky with 16 gilded ribs (u around, v from the rim up) */
  const texDomePaint = tex.draw(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#9fa7ae'); gr.addColorStop(0.5, '#d4d0c2'); gr.addColorStop(1, '#f0e6c8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = ctx.rng(31);
    for (let i = 0; i < 16; i++) {
      const x = i * w / 16; g.fillStyle = '#b8903c'; g.fillRect(x - 3, 0, 6, h);
      for (let k = 0; k < 5; k++) { const cx = x + w / 32, cy = 30 + k * 42 + r() * 10; g.fillStyle = 'rgba(80,72,64,0.5)'; g.beginPath(); g.ellipse(cx, cy, 14, 18, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(250,240,215,0.8)'; g.beginPath(); g.arc(cx, cy - 22, 6, 0, 7); g.fill(); }
    }
  }, { key: 'lmF-domepaint', repeat: [1, 1] });
  /** iconostasis: 1024 x 840 for 17 x 14 m: a gilded dado, five tiers of icons in gold frames, the Royal Doors in the middle */
  const texIcono = tex.draw(1024, 840, (g, w, h) => {
    g.fillStyle = '#c4993e'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(51), tiers = [[0, 150, 0], [150, 330, 1], [330, 500, 1], [500, 640, 2], [640, 760, 2], [760, 840, 3]];   // from the bottom (canvas y is flipped below)
    const Y = (y) => h - y;
    for (const [y0, y1, kind] of tiers) {
      g.fillStyle = '#a97f2c'; g.fillRect(0, Y(y1), w, 8); g.fillRect(0, Y(y0) - 8, w, 8);
      if (kind === 3) { g.fillStyle = '#d9b25a'; g.fillRect(w / 2 - 10, Y(y1) + 12, 20, y1 - y0 - 20); g.fillRect(w / 2 - 36, Y(y1) + 30, 72, 14); continue; }
      const n = kind === 0 ? 8 : kind === 1 ? 7 : kind === 2 ? 11 : 9, pw = w / n;
      for (let i = 0; i < n; i++) {
        const x = i * pw + 10, ww = pw - 20, hh = y1 - y0 - 34, top = Y(y1) + 18;
        if (kind === 0) { g.fillStyle = '#7d5a22'; g.fillRect(x, top, ww, hh); g.fillStyle = '#d9b25a'; g.fillRect(x + 10, top + 10, ww - 20, hh - 20); g.fillStyle = '#9b7430'; g.fillRect(x + 20, top + 20, ww - 40, hh - 40); continue; }
        const dark = ['#2a3556', '#5a2530', '#2a4a45', '#4a3a28'][(i + kind) % 4];
        g.fillStyle = '#e0b552'; g.beginPath(); g.moveTo(x, top + hh); g.lineTo(x, top + 26); g.quadraticCurveTo(x + ww / 2, top - 14, x + ww, top + 26); g.lineTo(x + ww, top + hh); g.fill();
        g.fillStyle = dark; g.beginPath(); g.moveTo(x + 7, top + hh - 7); g.lineTo(x + 7, top + 30); g.quadraticCurveTo(x + ww / 2, top - 4, x + ww - 7, top + 30); g.lineTo(x + ww - 7, top + hh - 7); g.fill();
        g.fillStyle = '#f2d37a'; g.beginPath(); g.arc(x + ww / 2, top + hh * 0.3, ww * 0.17, 0, 7); g.fill();
        g.fillStyle = 'rgba(235,215,185,0.9)'; g.beginPath(); g.arc(x + ww / 2, top + hh * 0.3, ww * 0.09, 0, 7); g.fill();
        g.fillStyle = r() < 0.5 ? '#b83a3a' : '#d8d2c0'; g.fillRect(x + ww * 0.25, top + hh * 0.42, ww * 0.5, hh * 0.46);
      }
    }
    // the Royal Doors: a gilded lattice with a dark opening in the middle of the first tier
    g.fillStyle = '#e0b552'; g.fillRect(w / 2 - 70, Y(330), 140, 180); g.fillStyle = '#6b4a1c'; g.fillRect(w / 2 - 60, Y(322), 120, 164);
    g.strokeStyle = '#e8c466'; g.lineWidth = 4; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(w / 2 + i * 17, Y(322)); g.lineTo(w / 2 + i * 17 + 17, Y(158)); g.stroke(); g.beginPath(); g.moveTo(w / 2 + i * 17 + 17, Y(322)); g.lineTo(w / 2 + i * 17, Y(158)); g.stroke(); }
  }, { key: 'lmF-icono', repeat: [1, 1] });
  Object.assign(M, {
    plaster: T('#e6dcc4', { name: 'lmF-plaster', paint: 0.04 }), dado: T('#a2928c', { name: 'lmF-dado', paint: 0.04 }), trim: T('#d9b25a', { name: 'lmF-trimG', emissive: '#5a4208', emissiveIntensity: 0.35 }),
    floorPat: T('#ffffff', { map: texFloor, name: 'lmF-floorPat', paint: 0.02 }), carpet: T('#8a2230', { name: 'lmF-carpet' }),
    colGranite: T('#6d5558', { name: 'lmF-colG', paint: 0.03 }), vault: T('#ffffff', { map: texVault, name: 'lmF-vaultM', paint: 0.02 }), domePaint: T('#ffffff', { map: texDomePaint, name: 'lmF-domePaint', paint: 0.02, emissive: '#b3a584', emissiveIntensity: 0.9 }),
    icono: T('#ffffff', { map: texIcono, name: 'lmF-iconoM', paint: 0.02 }),
    skylight: ctx.mat.emissive('#fff2d6', 0.9, { name: 'lmF-skylight' }), candle: ctx.mat.emissive('#ffd27a', 1.4, { name: 'lmF-candle' }), lampWarm: ctx.mat.emissive('#ffe2ad', 1.2, { name: 'lmF-lampWarm' }),
  });
  M.jetW =ctx.mat.emissive('#f4f8ff', 0.95, { name: 'lmF-jetW' });
  M.mist = T('#ffffff', { transparent: true, opacity: 0.22, depthWrite: false, side: 'double', emissive: '#d8e8f8', emissiveIntensity: 0.6, name: 'lmF-mist' });
  M.marigold = T('#e8782a', { name: 'lmF-marigold', paint: 0.05 });
  ctx.onUpdate(() => { const n = ctx.shared.uNight ? ctx.shared.uNight.value : 0; M.lampGlass.emissiveIntensity = Math.min(1, Math.max(0, (n - 0.08) / 0.4)) * 1.1; });
  M.tex = { ashlar: texAshlar, slab: texSlab, relief: texRelief };
  void THREE; void rnd;
  return M;
}
