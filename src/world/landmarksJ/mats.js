// landmarksJ/mats.js - palette, canvas textures and materials of St Isaac's Cathedral, the Nicholas I monument and the garden of St Isaac's Square.
// Colours (docs/research/admiralty-stisaac.md 7.3, photos refs/admiralty 080 085 094 095 098; hex are lit photographic colours): Ruskeala marble #c5c0b6 (shade #a8a298), columns of red-pink Finnish granite
// #a65b47, bronze capitals #3d4a41 with verdigris #5c8f78, gilded dome #dbb13f, green-grey roof sheet #6e8a78, stylobate #8a867e, statues verdigris #5e9582; Nicholas I pedestal Shoksha quartzite #7c3342.
import * as THREE from 'three';

export const C = {
  marble: '#d2cbc0', marbleShade: '#bab2a6', marbleWarm: '#cfc2b4', marbleDark: '#a7a299', cornice: '#b9aca2', corniceHi: '#c9bdb2',
  granite: '#8a867e', graniteDark: '#6f6c68', graniteBase: '#8b857d', graniteDrum: '#a69a90',
  column: '#8c4938', columnShade: '#793c30', frieze: '#8a4838', bronze: '#3f4c43', bronzeDark: '#2c332f', patina: '#5e9582', patinaDark: '#4a7766', door: '#5f7a70',
  gold: '#cc9a30', goldRib: '#dcb042', goldDark: '#a67f28', roof: '#6e8a78', roofDark: '#5e7868', relief: '#35362f',
  glass: '#2b333a', iron: '#1b1f20', ironGreen: '#26382f',
  white: '#ece8de', black: '#15171a',
  crimson: '#7c3342', crimsonDark: '#5e2431', slab: '#a9a49b', gravel: '#b18f83', lawn: '#5e9a3c', lawnLit: '#6fa844', hedge: '#2f5a34', soil: '#3a2f28', rose1: '#d8456f', rose2: '#c8283a', rose3: '#e8809a',
};

export function makeMats(ctx) {
  const T = ctx.mat.toon, tex = ctx.tex;
  const M = {};
  // -------------------------------------------------------------------------------------------- textures
  /** marble slabs: tile 2.4 m, 4 courses of 0.6 m, slabs 1.2 m, staggered joints, pink-grey veins; white so the material colour tints it */
  const texMarble = tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(901);
    for (let i = 0; i < 90; i++) { g.strokeStyle = r() < 0.5 ? `rgba(150,110,100,${0.05 + r() * 0.08})` : `rgba(90,95,105,${0.05 + r() * 0.07})`; g.lineWidth = 1 + r() * 2.5; g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + 8 + r() * 30, y + (r() - 0.4) * 22); g.stroke(); }
    for (let i = 0; i < 10; i++) { g.fillStyle = `rgba(110,108,104,${0.03 + r() * 0.04})`; g.fillRect(r() * w, Math.floor(r() * 4) * 64, 60 + r() * 60, 64); }
    g.fillStyle = 'rgba(88,82,76,0.32)';
    for (let c = 0; c < 4; c++) g.fillRect(0, c * 64, w, 2);
    for (let c = 0; c < 4; c++) { const o = (c % 2) * 64; g.fillRect(o, c * 64, 2, 64); g.fillRect(o + 128, c * 64, 2, 64); }
    g.fillStyle = 'rgba(255,255,255,0.25)'; for (let c = 0; c < 4; c++) g.fillRect(0, c * 64 + 2, w, 2);
  }, { key: 'lmJ-marble', repeat: [1, 1] });
  /** big granite blocks (tile 4.8 x 2.4 m shown on a 256 px tile 2.4 m): two courses of 1.2 m */
  const texGranite = tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(903);
    for (let i = 0; i < 520; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,66,62' : '255,250,245'},${0.05 + r() * 0.08})`; g.fillRect(r() * w, r() * h, 2 + r() * 5, 2 + r() * 4); }
    g.fillStyle = 'rgba(55,50,48,0.55)'; for (let c = 0; c < 2; c++) g.fillRect(0, c * 128, w, 3);
    g.fillRect(0, 0, 3, 128); g.fillRect(128, 128, 3, 128);
  }, { key: 'lmJ-granite', repeat: [1, 1] });
  /** coffered ceiling of the porticos: tile 3 m, 3 x 3 coffers with rosettes */
  const texCoffer = tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const x = i * 85 + 8, y = j * 85 + 8;
      g.fillStyle = 'rgba(70,64,56,0.5)'; g.fillRect(x, y, 70, 70);
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x + 8, y + 8, 54, 54);
      g.fillStyle = 'rgba(110,100,86,0.8)'; g.beginPath(); g.arc(x + 35, y + 35, 11, 0, 7); g.fill();
      g.fillStyle = 'rgba(235,228,214,0.9)'; g.beginPath(); g.arc(x + 35, y + 35, 5, 0, 7); g.fill();
    }
  }, { key: 'lmJ-coffer', repeat: [1, 1] });
  /** gilded lettering on the dark-red granite frieze (aspect 20 : 1) */
  const lettering = (text, key) => tex.draw(1024, 64, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d9a93a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    tex.fitText(g, text, w / 2, h * 0.54, w * 0.93, h * 0.62, tex.FONTS.serif, 600);
  }, { key });
  const texTextN = lettering('ГОСПОДИ, СИЛОЮ ТВОЕЮ ВОЗВЕСЕЛИТСЯ ЦАРЬ', 'lmJ-textN');
  const texTextS = lettering('ХРАМ МОЙ ХРАМ МОЛИТВЫ НАРЕЧЕТСЯ', 'lmJ-textS');
  const texTextW = lettering('ГОСПОДИ, ВОЗЛЮБИХ БЛАГОЛЕПИЕ ДОМА ТВОЕГО', 'lmJ-textW');
  const texTextE = lettering('ДОМУ ТВОЕМУ ПОДОБАЕТ СВЯТЫНЯ, ГОСПОДИ', 'lmJ-textE');
  /** bronze high relief of a pediment (a triangle's bounding box 36 x 6.6 m, aspect 5.5): dark bronze ground, patina-lit figures: a standing centre, kneeling and reclining groups */
  const texRelief = tex.draw(1024, 192, (g, w, h) => {
    g.fillStyle = '#3a3c34'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(907);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '96,120,100' : '22,24,20'},${0.05 + r() * 0.1})`; g.fillRect(r() * w, r() * h, 2 + r() * 9, 2 + r() * 5); }
    // groups of figures: lumpy patina-lit masses that rise towards the centre (an impression of a high relief, not a copy)
    const blob = (x, y, rx, ry, a0) => { g.fillStyle = `rgba(122,150,128,${a0})`; g.beginPath(); g.ellipse(x, y, rx, ry, (r() - 0.5) * 0.6, 0, 7); g.fill(); g.fillStyle = 'rgba(24,26,22,0.45)'; g.beginPath(); g.ellipse(x + rx * 0.25, y + ry * 0.3, rx * 0.8, ry * 0.7, 0, 0, 7); g.fill(); };
    const base = h - 8;
    for (let k = 0; k < 170; k++) {
      const t = r(), x = 30 + t * (w - 60), up = Math.max(0.05, 1 - Math.abs(t - 0.5) * 1.9), y = base - r() * (24 + 120 * up), rx = 8 + r() * 26, ry = 5 + r() * 16;
      blob(x, y, rx, ry, 0.3 + r() * 0.28);
    }
    for (let k = 0; k < 17; k++) {                                                              // standing figures: robe, head, raised arm
      const t = 0.2 + 0.6 * r(), x = t * w, hh = 62 + 100 * Math.max(0.1, 1 - Math.abs(t - 0.5) * 2.2), ww = 20 + hh * 0.12;
      g.fillStyle = 'rgba(28,30,26,0.8)'; g.beginPath(); g.moveTo(x - ww, base); g.lineTo(x - ww * 0.35, base - hh * 0.75); g.lineTo(x + ww * 0.35, base - hh * 0.75); g.lineTo(x + ww, base); g.fill();
      g.fillStyle = 'rgba(130,158,136,0.6)'; g.beginPath(); g.moveTo(x - ww * 0.8, base); g.lineTo(x - ww * 0.28, base - hh * 0.72); g.lineTo(x + ww * 0.15, base - hh * 0.72); g.lineTo(x + ww * 0.6, base); g.fill();
      g.beginPath(); g.arc(x, base - hh * 0.84, hh * 0.1, 0, 7); g.fill();
      g.strokeStyle = 'rgba(130,158,136,0.55)'; g.lineWidth = 6; g.beginPath(); g.moveTo(x + ww * 0.2, base - hh * 0.68); g.lineTo(x + ww * 0.9, base - hh * 0.98); g.stroke();
    }
    g.fillStyle = 'rgba(160,190,168,0.4)'; g.beginPath(); g.arc(w / 2, base - 150, 30, Math.PI, 0); g.fill();
  }, { key: 'lmJ-relief' });
  /** bronze door: 2 leaves x 6 panels, verdigris frames (tile = one door 3.7 x 9 m) */
  const texDoor = tex.draw(256, 512, (g, w, h) => {
    g.fillStyle = '#3c4a44'; g.fillRect(0, 0, w, h);
    for (let c = 0; c < 2; c++) for (let rw = 0; rw < 6; rw++) {
      const x = c * 128 + 10, y = rw * 84 + 12;
      g.fillStyle = '#6f8c80'; g.fillRect(x, y, 108, 68); g.fillStyle = '#2f3b36'; g.fillRect(x + 8, y + 8, 92, 52);
      g.fillStyle = '#7fa293'; g.fillRect(x + 38, y + 20, 32, 28);
    }
    g.fillStyle = '#20282a'; g.fillRect(126, 0, 4, h);
  }, { key: 'lmJ-door', repeat: [1, 1] });
  /** gravel (tile 3 m) */
  const texGravel = tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(909);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,60,50' : '255,235,220'},${0.05 + r() * 0.09})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
  }, { key: 'lmJ-gravel', repeat: [1, 1] });
  const texLawn = tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,70,0,0.07)'; for (let i = 0; i < 4; i++) g.fillRect(0, i * 32, w, 16);
    const r = ctx.rng(913);
    for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? 'rgba(20,80,20,0.12)' : 'rgba(210,255,150,0.14)'; g.fillRect(r() * w, r() * h, 1, 2 + r() * 2); }
  }, { key: 'lmJ-lawn', repeat: [1, 1] });
  const texLeaf = tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(921);
    for (let i = 0; i < 160; i++) { const x = r() * w, y = r() * h, rr = 4 + r() * 9; g.fillStyle = r() < 0.5 ? 'rgba(10,50,10,0.16)' : 'rgba(190,240,120,0.2)'; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
  }, { key: 'lmJ-leaf', repeat: [1, 1] });
  /** quartzite pedestal: crimson with fine speckle (tile 2.4 m) */
  const texQuartz = tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(931);
    for (let i = 0; i < 380; i++) { g.fillStyle = `rgba(${r() < 0.6 ? '50,10,20' : '255,190,200'},${0.05 + r() * 0.09})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    g.fillStyle = 'rgba(40,10,15,0.35)'; g.fillRect(0, 62, w, 2);
  }, { key: 'lmJ-quartz', repeat: [1, 1] });
  /** wrought-iron fence panel for the monument ring and the garden: tile 2.5 x 1.1 m, spear pickets + a scroll band (alpha-cut) */
  const texPickets = tex.draw(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.lineWidth = 6;
    g.fillRect(0, 56, w, 8); g.fillRect(0, h - 40, w, 8); g.fillRect(0, 150, w, 5);
    for (let i = 0; i < 21; i++) { const x = 12 + i * (w - 24) / 20; g.fillRect(x - 3, 40, 6, h - 40); g.beginPath(); g.moveTo(x - 8, 40); g.lineTo(x, 4); g.lineTo(x + 8, 40); g.fill(); }
    for (let i = 0; i < 10; i++) { const cx = 26 + i * 51; g.beginPath(); g.arc(cx, 104, 22, 0, Math.PI * 2); g.stroke(); }
  }, { key: 'lmJ-pickets', repeat: [1, 1] });
  /** a stone / granite slab pavement for the plaza of the monument and the garden edge */
  const texSlab = tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(5);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(90,80,75,${0.04 + r() * 0.07})`; g.fillRect(r() * w, r() * h, 2 + r() * 5, 2 + r() * 4); }
    g.fillStyle = 'rgba(70,64,60,0.5)'; for (let i = 0; i < 3; i++) g.fillRect(0, i * 85, w, 2);
    for (let i = 0; i < 3; i++) { const o = (i % 2) * 64; g.fillRect(o, i * 85, 2, 85); g.fillRect(o + 128, i * 85, 2, 85); }
  }, { key: 'lmJ-slab', repeat: [1, 1] });

  // -------------------------------------------------------------------------------------------- materials
  Object.assign(M, {
    marble: T(C.marble, { map: texMarble, name: 'lmJ-marble', paint: 0.05 }), marbleShade: T(C.marbleShade, { map: texMarble, name: 'lmJ-marbleS', paint: 0.05 }),
    marblePlain: T(C.marbleWarm, { name: 'lmJ-marbleP', paint: 0.04 }), marbleDark: T(C.marbleDark, { map: texMarble, name: 'lmJ-marbleD', paint: 0.05 }),
    cornice: T(C.cornice, { name: 'lmJ-cornice', paint: 0.04 }), corniceHi: T(C.corniceHi, { name: 'lmJ-corniceH', paint: 0.04 }),
    stylobate: T(C.granite, { map: texGranite, name: 'lmJ-stylobate', paint: 0.05 }), stylobateTop: T('#938e86', { map: texGranite, name: 'lmJ-stylobateT', paint: 0.05 }),
    drumBase: T(C.graniteDrum, { map: texGranite, name: 'lmJ-drumBase', paint: 0.05 }),
    column: T(C.column, { name: 'lmJ-column', paint: 0.05 }), columnShade: T(C.columnShade, { name: 'lmJ-columnS', paint: 0.04 }), frieze: T(C.frieze, { name: 'lmJ-frieze', paint: 0.04 }),
    bronze: T(C.bronze, { name: 'lmJ-bronze', paint: 0.03 }), bronzeDark: T(C.bronzeDark, { name: 'lmJ-bronzeD' }), patina: T(C.patina, { name: 'lmJ-patina', paint: 0.04 }), patinaDark: T(C.patinaDark, { name: 'lmJ-patinaD', paint: 0.04 }),
    door: T('#ffffff', { map: texDoor, name: 'lmJ-doorM', paint: 0.02 }),
    gold: T(C.gold, { emissive: '#7a4e0c', emissiveIntensity: 0.75, name: 'lmJ-gold', paint: 0.02 }), goldRib: T(C.goldRib, { emissive: '#7a520e', emissiveIntensity: 0.6, name: 'lmJ-goldRib' }),
    goldDark: T(C.goldDark, { emissive: '#5a3c0a', emissiveIntensity: 0.4, name: 'lmJ-goldDark' }),
    roof: T(C.roof, { name: 'lmJ-roof', paint: 0.04 }), roofDark: T(C.roofDark, { name: 'lmJ-roofD' }),
    relief: T('#ffffff', { map: texRelief, name: 'lmJ-reliefM', paint: 0.02 }), coffer: T('#b8b3a8', { map: texCoffer, name: 'lmJ-cofferM', paint: 0.03 }),
    textN: T('#8e4c3e', { map: texTextN, name: 'lmJ-tN' }), textS: T('#8e4c3e', { map: texTextS, name: 'lmJ-tS' }), textW: T('#8e4c3e', { map: texTextW, name: 'lmJ-tW' }), textE: T('#8e4c3e', { map: texTextE, name: 'lmJ-tE' }),
    glass: T(C.glass, { name: 'lmJ-glass' }), iron: T(C.iron, { name: 'lmJ-iron' }), ironGreen: T(C.ironGreen, { name: 'lmJ-ironG', paint: 0.02 }), black: T(C.black, { name: 'lmJ-black' }), white: T(C.white, { name: 'lmJ-white' }),
    crimson: T(C.crimson, { map: texQuartz, name: 'lmJ-crimson', paint: 0.03 }), crimsonDark: T(C.crimsonDark, { map: texQuartz, name: 'lmJ-crimsonD', paint: 0.03 }),
    slab: T(C.slab, { map: texSlab, name: 'lmJ-slabs', paint: 0.04, polygonOffset: -2 }), slabRim: T('#9a948c', { map: texSlab, name: 'lmJ-slabRim', paint: 0.04 }),
    gravel: T(C.gravel, { map: texGravel, name: 'lmJ-gravel', paint: 0.05, polygonOffset: -4 }),
    lawn: T(C.lawn, { map: texLawn, name: 'lmJ-lawn', paint: 0.06, polygonOffset: -2 }), hedge: T(C.hedge, { map: texLeaf, name: 'lmJ-hedge', paint: 0.1 }), hedge2: T('#3a6a3a', { map: texLeaf, name: 'lmJ-hedge2', paint: 0.1 }),
    lawnOval: T('#6aa83c', { map: texLawn, name: 'lmJ-lawnOval', paint: 0.06, polygonOffset: -3 }),
    soil: T(C.soil, { name: 'lmJ-soil', polygonOffset: -6 }), rose1: T(C.rose1, { name: 'lmJ-rose1' }), rose2: T(C.rose2, { name: 'lmJ-rose2' }), rose3: T(C.rose3, { name: 'lmJ-rose3' }),
    white2: T('#f0eee6', { name: 'lmJ-white2' }), bark: T('#4a3d32', { name: 'lmJ-bark' }), crown: T('#4a7a36', { map: texLeaf, name: 'lmJ-crown', paint: 0.1 }),
    pickets: T('#25282a', { map: texPickets, alphaTest: 0.5, side: 'double', name: 'lmJ-pickets', paint: 0.02 }),
    lampGlass: T('#f2efe4', { emissive: '#ffd9a0', emissiveIntensity: 0.0, name: 'lmJ-lampglass' }),
  });
  ctx.onUpdate(() => { const n = ctx.shared.uNight ? ctx.shared.uNight.value : 0; M.lampGlass.emissiveIntensity = Math.min(1, Math.max(0, (n - 0.08) / 0.4)) * 1.1; });
  M.tex = { marble: texMarble, granite: texGranite, slab: texSlab };
  void THREE;
  return M;
}
