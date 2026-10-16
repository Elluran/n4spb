// landmarksE/mats.js - materials and canvas textures of the Ostrovsky ensemble beyond the shared stucco vocabulary (common.js): the yellow of Gostiny Dvor and the theatre, the blue-grey
// library, the cream Rossi street, the green copper roofs, granite, gravel, bronze and iron.  Colours: docs/research/gostiny-dvor-ostrovsky.md (suggested palette keys, sections 3, 5, 6, 7, 11).
import * as THREE from 'three';

export const GE = {
  gdWall: '#e8c46c', gdWallShade: '#d8b25c', white: '#f2efe6', whiteShade: '#dcd7c8', vault: '#eed08a', plinth: '#9a9c92', plinthDark: '#7d8078',
  roofGreen: '#5d9b7c', roofGreenDark: '#4f8a5a', roofZinc: '#8f949c', slab: '#7c7a76', slabDark: '#4a4c50',
  theatre: '#e8c070', theatreShade: '#dcb868', rossiGround: '#e6cc90', libWall: '#b8bec8', libWallLit: '#c8ccd6', libTrim: '#ecebe6',
  palace: '#ecd0a8', cabinet: '#e0e2c4', pavilion: '#bdb9a6', fenceIron: '#6a6055', gold: '#d6ac4e', bronzeGreen: '#3a5040', monumentBronze: '#2b3330', redGranite: '#7a3d36', redGraniteLight: '#8a5a52',
  graniteGrey: '#8d807c', gravel: '#b0807a', lawn: '#5f9a40', lawnDark: '#4e8636', ironBlack: '#1b1f20', ironGreen: '#25382d', bench: '#f0ede4', door: '#8a6a3a',
};

export function makeG(K) {
  const ctx = K.ctx, tex = ctx.tex, T = ctx.mat.toon;
  const G = {}, M = {};
  const alphaMat = (key, w, h, fn, o = {}) => {
    const map = tex.draw(w, h, (g) => { g.clearRect(0, 0, w, h); fn(g, w, h); }, { key: 'lmE-' + key, repeat: [1, 1] });
    const m = T(o.color || '#ffffff', { map, alphaTest: 0.45, side: 'double', name: 'lmE-' + key });
    K.decalMats.add(m); return m;
  };
  // ---- plain colours
  M.gd = K.wall(GE.gdWall); M.gdShade = K.wall(GE.gdWallShade);
  M.white = T(GE.white); M.whiteShade = T(GE.whiteShade);
  G.vaultTex = tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#eccf8c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f4efe2'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
    g.lineWidth = 4; g.strokeRect(2, 0, w - 4, h);
    g.fillStyle = '#f4efe2'; g.beginPath(); g.arc(w / 2, h / 2, 12, 0, 6.3); g.fill();
  }, { key: 'lmE-vaultTex', repeat: [1, 1] });
  M.vault = T('#ffffff', { map: G.vaultTex, side: 'double', name: 'lmE-vault' });
  M.vaultPlain = T(GE.vault, { side: 'double', name: 'lmE-vaultPlain' });
  M.plinth = K.rust(GE.plinth); M.plinthFlat = T(GE.plinth); M.plinthDark = T(GE.plinthDark);
  M.theatre = K.wall(GE.theatre); M.theatreShade = K.wall(GE.theatreShade); M.theatreRust = K.rust('#e8cc88');
  M.rossiGround = K.rust(GE.rossiGround);
  M.lib = K.wall(GE.libWall); M.libRust = K.rust('#aeb4be'); M.libTrim = T(GE.libTrim);
  M.palace = K.wall(GE.palace); M.cabinet = K.wall(GE.cabinet); M.pavilion = K.wall(GE.pavilion);
  M.gold = T(GE.gold, { emissive: '#4a3508', emissiveIntensity: 0.35, name: 'lmE-gold' });
  M.bronze = T(GE.monumentBronze, { name: 'lmE-bronze' }); M.bronzeGreen = T(GE.bronzeGreen, { name: 'lmE-bronzeGreen' }); M.patina = T('#566e64');
  M.redGranite = T(GE.redGranite, { name: 'lmE-redGranite' }); M.redGraniteLight = T(GE.redGraniteLight); M.graniteGrey = T(GE.graniteGrey, { name: 'lmE-graniteGrey' });
  M.iron = T(GE.ironBlack, { name: 'lmE-iron' }); M.ironGreen = T(GE.ironGreen, { name: 'lmE-ironGreen' }); M.fence = T(GE.fenceIron, { name: 'lmE-fenceIron' });
  M.door = T(GE.door); M.dark = T('#1c2024'); M.black = T('#101214'); M.glassDark = T('#222a33');
  M.globe = ctx.mat.emissive ? ctx.mat.emissive('#f2efe4', 0.55) : T('#f2efe4');
  M.bench = T(GE.bench, { name: 'lmE-bench' });
  M.lawn = T(GE.lawn, { name: 'lmE-lawn', paint: 0.08, polygonOffset: -3 });
  M.lawnDark = T(GE.lawnDark, { name: 'lmE-lawnDark', paint: 0.08, polygonOffset: -3 });

  // ---- roof of Gostiny Dvor: green standing seam (seams every 0.6 m: tile 2.4 m)
  const roofTex = (base, seam, key) => tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { g.fillStyle = seam; g.fillRect(i * 64 + 1, 0, 3, h); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(i * 64 + 4, 0, 2, h); }
    for (let j = 0; j < 3; j++) { g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, j * 85 + 40, w, 2); }
  }, { key, repeat: [1, 1] });
  M.roofGreen = T('#ffffff', { map: roofTex('#6a9680', '#46705c', 'lmE-roofGreen'), name: 'lmE-roofGreen', side: 'double' });
  M.roofZinc = T('#ffffff', { map: roofTex('#959aa2', '#6b7078', 'lmE-roofZinc'), name: 'lmE-roofZinc', side: 'double' });
  M.roofDark = T('#ffffff', { map: roofTex('#6a6e74', '#4a4e54', 'lmE-roofDark'), name: 'lmE-roofDark', side: 'double' });

  // ---- gallery floor: irregular dark grey granite slabs (tile 4 x 4 m)
  G.slabTex = tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#8b8a87'; g.fillRect(0, 0, w, h);
    let sd = 4242; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const t = 118 + Math.floor(rnd() * 34); g.fillStyle = `rgb(${t},${t - 2},${t - 5})`; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
    }
    g.strokeStyle = 'rgba(40,40,44,0.55)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
  }, { key: 'lmE-slab', repeat: [1, 1] });
  M.slab = T('#ffffff', { map: G.slabTex, name: 'lmE-slab' });

  // ---- pavement of the Nevsky promenade and the squares: pale grey granite slabs with darker strips (0.6 m slabs, tile 2.4 m)
  G.paveTex = tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#8f8c88'; g.fillRect(0, 0, w, h);
    let sd = 777; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const t = 138 + Math.floor(rnd() * 16); g.fillStyle = `rgb(${t},${t - 3},${t - 5})`; g.fillRect(i * 64 + 1.5, j * 64 + 1.5, 61, 61); }
    g.fillStyle = 'rgba(70,66,66,0.5)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
  }, { key: 'lmE-pave', repeat: [1, 1] });
  M.pave = T('#ffffff', { map: G.paveTex, name: 'lmE-pave', polygonOffset: -4, paint: 0.04 });
  // pink gravel of the garden paths (tile 3 m)
  G.gravelTex = tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#a98a82'; g.fillRect(0, 0, w, h);
    let sd = 31; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
    for (let i = 0; i < 900; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(210,160,150,0.5)' : 'rgba(120,80,76,0.35)'; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
  }, { key: 'lmE-gravel', repeat: [1, 1] });
  M.gravel = T('#ffffff', { map: G.gravelTex, name: 'lmE-gravel', polygonOffset: -5, paint: 0.04 });
  // setts of the garden ring (tile 2 m)
  G.settTex = tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#8a8683'; g.fillRect(0, 0, w, h);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const t = 120 + ((i * 7 + j * 13) % 5) * 7; g.fillStyle = `rgb(${t},${t - 3},${t - 4})`; g.fillRect(i * 8 + (j % 2) * 4 + 0.5, j * 8 + 0.5, 7, 7); }
  }, { key: 'lmE-sett', repeat: [1, 1] });
  M.sett = T('#ffffff', { map: G.settTex, name: 'lmE-sett', polygonOffset: -4, paint: 0.04 });
  // clinker brick strip (Rossi street pavements) tile 2 m
  G.brickTex = tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#7a4036'; g.fillRect(0, 0, w, h);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 8; i++) { const t = ((i * 5 + j * 3) % 4); g.fillStyle = ['#8a4a3d', '#7f4538', '#93523f', '#76392f'][t]; g.fillRect(i * 16 + (j % 2) * 8 + 0.5, j * 8 + 0.5, 15, 7); }
  }, { key: 'lmE-brick', repeat: [1, 1] });
  M.brick = T('#ffffff', { map: G.brickTex, name: 'lmE-brick', polygonOffset: -4, paint: 0.04 });

  // ---- iron balconette of the Gostiny Dvor arches: black rail with a row of circles (alpha cut-out, tile 1.0 x 1.0 m high, 1 m of rail)
  G.balcony = alphaMat('balcony', 256, 128, (g, w, h) => {
    g.strokeStyle = '#15181a'; g.fillStyle = '#15181a'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(0, 8); g.lineTo(w, 8); g.stroke();
    g.fillRect(0, 108, w, 14); g.fillRect(0, 88, w, 6);
    g.lineWidth = 5;
    for (let i = 0; i < 4; i++) {
      const cx = i * 64 + 32;
      g.beginPath(); g.arc(cx, 52, 16, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(cx, 10); g.lineTo(cx, 36); g.moveTo(cx, 68); g.lineTo(cx, 108); g.stroke();
      g.beginPath(); g.moveTo(i * 64, 8); g.lineTo(i * 64, 108); g.stroke();
    }
  });
  M.balcony = G.balcony;
  // balustrade (white balusters between yellow plinths), tile 1.1 m
  G.balust = alphaMat('balust', 128, 128, (g, w, h) => {
    g.fillStyle = '#f1ede2';
    g.fillRect(0, 0, w, 12); g.fillRect(0, h - 14, w, 14);
    for (let i = 0; i < 4; i++) {
      const cx = i * 32 + 16;
      g.beginPath(); g.moveTo(cx - 4, 12); g.lineTo(cx + 4, 12); g.quadraticCurveTo(cx + 12, 40, cx + 5, 58); g.quadraticCurveTo(cx + 15, 80, cx + 5, h - 14);
      g.lineTo(cx - 5, h - 14); g.quadraticCurveTo(cx - 15, 80, cx - 5, 58); g.quadraticCurveTo(cx - 12, 40, cx - 4, 12); g.fill();
    }
  });
  M.balust = G.balust;
  // iron spear fence panel (the Catherine garden: lattice, 1.2 m) / Anichkov pickets (2.6 m): alpha cut-outs
  G.lattice = alphaMat('lattice', 256, 128, (g, w, h) => {
    g.strokeStyle = '#17191a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 6); g.lineTo(w, 6); g.moveTo(0, h - 6); g.lineTo(w, h - 6); g.stroke();
    for (let x = -h; x < w + h; x += 40) { g.beginPath(); g.moveTo(x, 6); g.lineTo(x + h - 12, h - 6); g.stroke(); g.beginPath(); g.moveTo(x + h - 12, 6); g.lineTo(x, h - 6); g.stroke(); }
  });
  G.pickets = alphaMat('pickets', 256, 128, (g, w, h) => {
    g.fillStyle = '#4e463e'; g.fillRect(0, h * 0.18, w, 5); g.fillRect(0, h * 0.78, w, 5);
    for (let x = 4; x < w; x += 8) { g.fillRect(x, h * 0.1, 3, h * 0.9); g.beginPath(); g.moveTo(x - 2, h * 0.1); g.lineTo(x + 1.5, 0); g.lineTo(x + 5, h * 0.1); g.fill(); }
  });
  M.lattice = G.lattice; M.pickets = G.pickets;
  // hoop edging (low iron arcs) 0.45 m: tile 1.2 m
  G.hoop = alphaMat('hoop', 256, 64, (g, w, h) => {
    g.strokeStyle = '#17191a'; g.lineWidth = 4;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(i * 64 + 32, h, 28, Math.PI, 0); g.stroke(); }
  });
  M.hoop = G.hoop;
  // theatre: mask-and-garland frieze (alpha, tile 4 : 1)
  G.garland = alphaMat('garland', 512, 128, (g, w, h) => {
    g.fillStyle = '#f2efe6';
    for (let i = 0; i < 8; i++) {
      const cx = i * 64 + 32;
      g.beginPath(); g.ellipse(cx, 46, 14, 20, 0, 0, Math.PI * 2); g.fill();
      g.lineWidth = 8; g.strokeStyle = '#f2efe6'; g.beginPath(); g.moveTo(cx + 18, 22); g.quadraticCurveTo(cx + 32, 100, cx + 46, 22); g.stroke();
    }
    g.fillRect(0, 4, w, 8);
  });
  G.THREE = THREE; G.M = M;
  return G;
}
