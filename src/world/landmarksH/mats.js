// landmarksH/mats.js - materials and canvas textures of the Admiralty / Alexander Garden / Senate Square beyond the shared stucco vocabulary (common.js).
// Colours are the lit photographic albedos of docs/research/admiralty-stisaac.md section 3.4 (sampled on refs/admiralty 007 004 001 026 014 029 025):
// wall yellow ochre #E9B55A with white joints in the rustication, white trim #F1EEE6, red-painted iron roofs #B5524C, pink-grey granite #8A7068, gold #E3B93E, cream sculpture #E4DABB.
import * as THREE from 'three';

export const HC = {
  wall: '#e9b55a', wallShade: '#d9a54a', wallPale: '#edc277', white: '#f2eee5', whiteShade: '#d9d5c8', granite: '#8c7a72', graniteDark: '#6e5a54', graniteLight: '#a08f88',
  roof: '#b5524c', roofZinc: '#9aa3aa', gold: '#e3b93e', goldDeep: '#c99a2a', cream: '#e6dcbc', creamShade: '#c9bd98', bronze: '#2f3d38', patina: '#5c8f78',
  lantern: '#8f9a97', lanternCap: '#555a5e', iron: '#1b1f20', sashBrown: '#3a2e2a',
  senateWall: '#ebd27e', senateShade: '#d9c070', synodWall: '#ebd27e', gravel: '#b07a66', gravelShade: '#a06e5c', paveGrey: '#b4afa6',
};

export function makeH(K) {
  const ctx = K.ctx, tex = ctx.tex, T = ctx.mat.toon;
  const H = {};
  const alphaMat = (key, w, h, fn, o = {}) => {
    const map = tex.draw(w, h, (g) => { g.clearRect(0, 0, w, h); fn(g, w, h); }, { key: 'lmH-' + key, repeat: [1, 1] });
    const m = T(o.color || '#ffffff', { map, alphaTest: 0.45, side: 'double', name: 'lmH-' + key });
    K.decalMats.add(m); return m;
  };
  const opaqueMat = (key, w, h, fn, o = {}) => T('#ffffff', { map: tex.draw(w, h, fn, { key: 'lmH-' + key, repeat: [1, 1] }), name: 'lmH-' + key, ...o });
  const M = {};
  M.wall = K.wall(HC.wall); M.wallShade = K.wall(HC.wallShade); M.wallPale = K.wall(HC.wallPale);
  M.white = T(HC.white); M.whiteShade = T(HC.whiteShade);
  M.granite = T(HC.granite, { name: 'lmH-granite' }); M.graniteDark = T(HC.graniteDark); M.graniteLight = T(HC.graniteLight);
  M.roof = T(HC.roof, { name: 'lmH-roof' }); M.zinc = T(HC.roofZinc);
  M.gold = T(HC.gold, { emissive: '#6a4a08', emissiveIntensity: 0.55, name: 'lmH-gold' });
  M.goldD = T(HC.gold, { emissive: '#6a4a08', emissiveIntensity: 0.55, side: 'double', name: 'lmH-goldD' });
  M.gold.fog = false; M.goldD.fog = false;                      // the gilded needle / cupola glint through the haze (the sight lines of Nevsky end on them)
  M.goldDeep = T(HC.goldDeep, { emissive: '#4a3205', emissiveIntensity: 0.4, name: 'lmH-goldDeep' });
  M.cream = T(HC.cream, { name: 'lmH-cream' }); M.creamShade = T(HC.creamShade);
  M.bronze = T(HC.bronze, { name: 'lmH-bronze' }); M.patina = T(HC.patina);
  M.lantern = T(HC.lantern, { name: 'lmH-lantern' }); M.lanternCap = T(HC.lanternCap);
  M.iron = T(HC.iron, { name: 'lmH-iron' }); M.dark = T('#1c2024'); M.black = T('#101214');
  M.glass = T('#2a3744', { name: 'lmH-glass' });
  M.door = T('#4a2f26');

  // ---- rustication: ochre blocks 1.2 m x 0.55 m with white joints (tile 2.4 m x 1.1 m, four courses of two blocks)
  H.rustTex = tex.draw(256, 128, (g, w, h) => {
    g.fillStyle = '#f1ece0'; g.fillRect(0, 0, w, h);
    g.fillStyle = HC.wall;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
      const x0 = c * 128 + (r ? 64 : 0) + 2.5, y0 = r * 64 + 2.5;
      for (const xo of [0, -128]) g.fillRect(x0 + xo, y0, 123, 59);
    }
    g.fillStyle = 'rgba(120,80,20,0.10)'; for (let r = 0; r < 2; r++) g.fillRect(0, r * 64 + 56, w, 6);
  }, { key: 'lmH-rustOchre', repeat: [1, 1] });
  M.rust = T('#ffffff', { map: H.rustTex, name: 'lmH-rustMat', paint: 0.03 });
  // the same in pink granite (plinths of the portico blocks): joints darker
  H.granTex = tex.draw(256, 128, (g, w, h) => {
    g.fillStyle = '#6a5650'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#8f7e77';
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { const x0 = c * 128 + (r ? 64 : 0) + 2, y0 = r * 64 + 2; for (const xo of [0, -128]) g.fillRect(x0 + xo, y0, 124, 60); }
  }, { key: 'lmH-granTex', repeat: [1, 1] });
  M.granRust = T('#ffffff', { map: H.granTex, name: 'lmH-granRust' });

  // ---- Doric frieze: white triglyphs (3 flutes) and ochre metopes with a trophy roundel (helmet / anchor / sword). tile = 1 triglyph + 1 metope = 2.4 m x 1.3 m (512 x 128 px for two units)
  H.friezeTex = tex.draw(512, 128, (g, w, h) => {
    g.fillStyle = HC.wall; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) {
      const x0 = i * 256;
      g.fillStyle = '#f2eee5'; g.fillRect(x0 + 6, 0, 78, h);
      g.fillStyle = '#c9c4b6'; for (let k = 0; k < 3; k++) g.fillRect(x0 + 18 + k * 22, 8, 8, h - 40);
      g.fillStyle = '#f2eee5'; g.fillRect(x0 + 0, h - 22, 100, 6);
      // metope trophy
      const cx = x0 + 176, cy = 62;
      g.fillStyle = '#f2eee5'; g.beginPath(); g.arc(cx, cy, 40, 0, Math.PI * 2); g.fill();
      g.fillStyle = HC.wall; g.beginPath(); g.arc(cx, cy, 30, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8e2d4';
      if (i === 0) { g.beginPath(); g.arc(cx, cy + 4, 15, Math.PI, 0); g.fill(); g.fillRect(cx - 15, cy + 4, 30, 8); g.fillRect(cx - 3, cy - 24, 6, 14); }
      else { g.fillRect(cx - 3, cy - 24, 6, 50); g.fillRect(cx - 16, cy - 14, 32, 6); g.beginPath(); g.arc(cx, cy + 16, 18, 0.1, Math.PI - 0.1); g.lineWidth = 6; g.strokeStyle = '#e8e2d4'; g.stroke(); }
    }
  }, { key: 'lmH-friezeTex', repeat: [1, 1] });
  M.frieze = T('#ffffff', { map: H.friezeTex, name: 'lmH-frieze' });

  // ---- mutule block under the cornice: tile 1.2 m (two blocks with gaps) in white / shade
  H.mutuleTex = tex.draw(128, 64, (g, w, h) => {
    g.fillStyle = '#d4cdbd'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2eee5'; for (let i = 0; i < 2; i++) g.fillRect(i * 64 + 8, 6, 48, 52);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 2; i++) g.fillRect(i * 64 + 8, 48, 48, 10);
  }, { key: 'lmH-mutule', repeat: [1, 1] });
  M.mutule = T('#ffffff', { map: H.mutuleTex, name: 'lmH-mutule' });

  // ---- white relief panels (white on ochre, own background so that they read as sunk panels)
  const W = '#f2eee5', S = '#b9ae94';
  const sh = (g, fn) => { g.save(); g.translate(3, 3); g.fillStyle = S; g.strokeStyle = S; fn(); g.restore(); g.fillStyle = W; g.strokeStyle = W; fn(); };
  // trophy panel: three laurel wreaths between two torches (photo 014), 3.2 : 1
  H.panelWreaths = opaqueMat('wreaths', 512, 160, (g, w, h) => {
    g.fillStyle = '#f2eee5'; g.fillRect(0, 0, w, h);
    g.fillStyle = HC.wall; g.fillRect(8, 8, w - 16, h - 16);
    sh(g, () => {
      for (let i = 0; i < 3; i++) {
        const cx = 92 + i * 164, cy = 82;
        g.lineWidth = 16; g.beginPath(); g.arc(cx, cy, 50, 0, Math.PI * 2); g.stroke();
        for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283; g.beginPath(); g.ellipse(cx + Math.cos(a) * 52, cy + Math.sin(a) * 52, 10, 5, a + 1.57, 0, 6.283); g.fill(); }
      }
      for (const x of [30, 174, 338, 482]) { g.fillRect(x - 5, 30, 10, 110); g.beginPath(); g.moveTo(x - 12, 30); g.lineTo(x + 12, 30); g.lineTo(x, 8); g.fill(); }
    });
  });
  // the flying Glory (trumpeting angel) in relief, facing right: alpha cut-out 2 : 1 (placed twice, mirrored)
  H.glory = alphaMat('glory', 512, 256, (g) => {
    sh(g, () => {
      // wings
      g.beginPath(); g.moveTo(190, 120); g.quadraticCurveTo(150, 20, 250, 10); g.quadraticCurveTo(270, 60, 270, 120); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(230, 120); g.quadraticCurveTo(250, 40, 330, 52); g.quadraticCurveTo(320, 110, 270, 150); g.closePath(); g.fill();
      // flowing robe and legs trailing down-left
      g.beginPath(); g.moveTo(190, 110); g.quadraticCurveTo(250, 140, 280, 150); g.quadraticCurveTo(210, 200, 90, 236); g.quadraticCurveTo(40, 246, 30, 226); g.quadraticCurveTo(90, 190, 150, 130); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(70, 228, 36, 12, -0.35, 0, 6.283); g.fill();
      // torso, head, arm with the trumpet
      g.beginPath(); g.ellipse(262, 98, 34, 26, -0.5, 0, 6.283); g.fill();
      g.beginPath(); g.arc(300, 78, 17, 0, 6.283); g.fill();
      g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(280, 100); g.quadraticCurveTo(330, 100, 360, 84); g.stroke();
      g.lineWidth = 9; g.beginPath(); g.moveTo(316, 74); g.lineTo(470, 52); g.stroke();
      g.beginPath(); g.moveTo(470, 36); g.lineTo(496, 28); g.lineTo(496, 78); g.lineTo(470, 66); g.closePath(); g.fill();
    });
  });
  // attic relief "Founding of the fleet in Russia": a long white band of figures, ships, waves (stylised): 12 : 1
  H.attic = opaqueMat('attic', 1024, 96, (g, w, h) => {
    g.fillStyle = HC.wall; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2eee5'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5);
    let sd = 7; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
    sh(g, () => {
      for (let i = 0; i < 26; i++) {
        const cx = 20 + i * 38 + rnd() * 10, base = h - 12;
        const hh = 34 + rnd() * 30;
        g.beginPath(); g.ellipse(cx, base - hh / 2, 8 + rnd() * 4, hh / 2, 0, 0, 6.283); g.fill();
        g.beginPath(); g.arc(cx, base - hh - 5, 6, 0, 6.283); g.fill();
        if (rnd() < 0.5) { g.fillRect(cx + 8, base - hh - 10, 3, hh); }
      }
      for (const cx of [190, 520, 830]) { g.beginPath(); g.moveTo(cx - 60, h - 20); g.lineTo(cx + 60, h - 20); g.lineTo(cx + 40, h - 8); g.lineTo(cx - 44, h - 8); g.closePath(); g.fill(); g.fillRect(cx - 2, 14, 4, h - 34); g.beginPath(); g.moveTo(cx, 18); g.lineTo(cx + 36, 44); g.lineTo(cx, 60); g.closePath(); g.fill(); }
    });
  });
  M.attic = H.attic;
  // clock face: white dial, roman numerals as bars, two hands
  H.clock = T('#ffffff', { map: tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#d9a93b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4f0e6'; g.beginPath(); g.arc(64, 64, 56, 0, 6.283); g.fill();
    g.fillStyle = '#2a2a2e';
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; g.save(); g.translate(64 + Math.sin(a) * 46, 64 - Math.cos(a) * 46); g.rotate(a); g.fillRect(-3, -6, 6, 12); g.restore(); }
    g.fillRect(61, 22, 6, 46); g.save(); g.translate(64, 64); g.rotate(2.2); g.fillRect(-3, -34, 6, 38); g.restore();
  }, { key: 'lmH-clock', repeat: [1, 1] }), name: 'lmH-clock' });
  // coffered barrel vault of the gate: ochre coffers in white frames (2 x 2 coffers per tile)
  H.coffer = T('#ffffff', { map: tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#e8e2d4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x = i * 128 + 12, y = j * 128 + 12;
      g.fillStyle = '#d3a14a'; g.fillRect(x, y, 104, 104);
      g.fillStyle = '#e1b15c'; g.fillRect(x + 12, y + 12, 80, 80);
      g.fillStyle = '#f2eee5'; g.beginPath(); g.arc(x + 52, y + 52, 14, 0, 6.283); g.fill();
    }
  }, { key: 'lmH-coffer', repeat: [1, 1] }), name: 'lmH-coffer' });
  // brick soffit of the Neva pavilion arches: courses of yellow brick with white joints
  H.brick = T('#ffffff', { map: tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#efe9da'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { g.fillStyle = r % 2 ? '#e2ae52' : '#e6b459'; g.fillRect(c * 64 + (r % 2 ? 32 : 0) + 2, r * 32 + 2, 60, 28); g.fillRect(c * 64 + (r % 2 ? 32 : 0) - 62, r * 32 + 2, 60, 28); }
  }, { key: 'lmH-brickTex', repeat: [1, 1] }), name: 'lmH-brick' });
  // red roof with seams
  H.roofTex = tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = HC.roof; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(70,20,20,0.28)'; g.fillRect(i * 32 + 2, 0, 3, h); g.fillStyle = 'rgba(240,150,140,0.22)'; g.fillRect(i * 32 + 5, 0, 2, h); }
  }, { key: 'lmH-roofTex', repeat: [1, 1] });
  M.roofTex = T('#ffffff', { map: H.roofTex, name: 'lmH-roofTexMat' });
  H.zincTex = tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = HC.roofZinc; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(60,70,80,0.3)'; g.fillRect(i * 32 + 2, 0, 3, h); g.fillStyle = 'rgba(220,226,232,0.25)'; g.fillRect(i * 32 + 5, 0, 2, h); }
  }, { key: 'lmH-zincTex', repeat: [1, 1] });
  M.zincTex = T('#ffffff', { map: H.zincTex, name: 'lmH-zincTexMat' });
  /** rusticated wall material for any stucco colour: blocks 1.2 x 0.55 m with white joints (tile 2.4 x 1.1 m) */
  H.rustMat = (hex, key) => T('#ffffff', { map: tex.draw(256, 128, (g, w, h) => {
    g.fillStyle = '#f1ece0'; g.fillRect(0, 0, w, h);
    g.fillStyle = hex;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { const x0 = c * 128 + (r ? 64 : 0) + 2.5, y0 = r * 64 + 2.5; for (const xo of [0, -128]) g.fillRect(x0 + xo, y0, 123, 59); }
  }, { key: 'lmH-rustHex-' + key, repeat: [1, 1] }), name: 'lmH-rustHex-' + key, paint: 0.03 });
  H.M = M; H.HC = HC; H.THREE = THREE; H.alphaMat = alphaMat; H.opaqueMat = opaqueMat;
  return H;
}
