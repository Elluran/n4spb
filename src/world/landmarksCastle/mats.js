// landmarksCastle/mats.js - the materials of the Engineering Castle, the Peter I monument, the Three-part bridge and the guardhouses.
// Colours: docs/research/summer-garden.md 8.1 (outside orange-peach #e8a060, court pink-salmon #e8a094 with beige #d8c8a8 trims, grey-green marble trim #bcc2b6, copper roofs #5e9a62, dark grey granite
// plinth #4a4e50), 8.2 (pink Olonets marble #d9b8b0 / #e6e0d6 / #a8c0a8, bronze #2b3030 with verdigris #5b7e6e), 8.3 (guardhouse cream-yellow columns #ecd9a0).
export const C = {
  wall: '#e8a060', wallLight: '#f0a860', court: '#e8a094', courtTrim: '#d8c8a8', trim: '#bcc2b6', trimShade: '#a2a99f',
  plinth: '#4a4e50', plinthTop: '#5a5e60', marble: '#b9b4ac', marbleLight: '#cdc7bd', marbleDark: '#8e8a84', marblePink: '#c4aaa0',
  roof: '#5e9a62', roofDark: '#4c8450', chimney: '#d88a4e', chimneyCap: '#4f7f58', gold: '#d9a830', asphalt: '#55565a', sett: '#8f8a84', settPink: '#a8928a',
  bronze: '#2b3030', verdigris: '#5b7e6e', pinkMarble: '#d9b8b0', whiteMarble: '#e6e0d6', greenMarble: '#a8c0a8', granite: '#8c8f92', graniteDark: '#5d5f62', graniteWarm: '#9a948c',
  iron: '#1b1f20', inscr: '#6e2523',
};

export function makeMats(ctx, K) {
  const T = ctx.mat.toon, tex = ctx.tex;
  const M = {};
  const t = (hex, o = {}) => T(hex, { paint: 0.03, ...o });
  Object.assign(M, {
    wall: t(C.wall, { name: 'lmC-wall', paint: 0.035 }), court: t(C.court, { name: 'lmC-court', paint: 0.035 }),
    trim: t(C.trim, { name: 'lmC-trim' }), trimShade: t(C.trimShade, { name: 'lmC-trimS' }), courtTrim: t(C.courtTrim, { name: 'lmC-courtTrim' }),
    plinth: t(C.plinth, { name: 'lmC-plinth' }), plinthTop: t(C.plinthTop, { name: 'lmC-plinthTop' }),
    marble: t(C.marble, { name: 'lmC-marble' }), marbleLight: t(C.marbleLight, { name: 'lmC-marbleL' }), marbleDark: t(C.marbleDark, { name: 'lmC-marbleD' }), marblePink: t(C.marblePink, { name: 'lmC-marbleP' }),
    rustMarble: T(C.marble, { map: K.texRust, name: 'lmC-rustMarble', paint: 0.03 }), rustCourt: T('#f0a89c', { map: K.texRust, name: 'lmC-rustCourt', paint: 0.03 }), rustPlinth: T('#6a6e70', { map: K.texRust, name: 'lmC-rustPlinth', paint: 0.02 }),
    roof: T(C.roof, { name: 'lmC-roof', paint: 0.05, side: 'double' }), roofDark: t(C.roofDark, { name: 'lmC-roofD' }), copper: t('#5aa070', { name: 'lmC-copper', paint: 0.04 }),
    chimney: t(C.chimney, { name: 'lmC-chimney' }), chimneyCap: t(C.chimneyCap, { name: 'lmC-chimneyCap' }),
    gold: t(C.gold, { name: 'lmC-gold', emissive: '#6a4a08', emissiveIntensity: 0.45, paint: 0.0 }),
    asphalt: T(C.asphalt, { name: 'lmC-asphalt', paint: 0.04, polygonOffset: -2 }), sett: T(C.sett, { name: 'lmC-sett', paint: 0.05, polygonOffset: -2 }), settPink: T(C.settPink, { name: 'lmC-settPink', paint: 0.05, polygonOffset: -3 }),
    bronze: t(C.bronze, { name: 'lmC-bronze', paint: 0.02 }), granite: t(C.granite, { name: 'lmC-granite' }), graniteDark: t(C.graniteDark, { name: 'lmC-graniteD' }), graniteWarm: t(C.graniteWarm, { name: 'lmC-graniteW' }),
    pinkMarble: t(C.pinkMarble, { name: 'lmC-pinkMarble', paint: 0.04 }), whiteMarble: t(C.whiteMarble, { name: 'lmC-whiteMarble', paint: 0.03 }), greenMarble: t(C.greenMarble, { name: 'lmC-greenMarble', paint: 0.03 }),
    iron: t(C.iron, { name: 'lmC-iron', paint: 0.0 }), dark: t('#1c1a1a', { name: 'lmC-dark', paint: 0.0 }), tunnel: t('#d8d0c4', { name: 'lmC-tunnel' }), tunnelFloor: t('#6b655f', { name: 'lmC-tunnelFloor' }),
    lawn: t('#72ad45', { name: 'lmC-lawn', paint: 0.07, polygonOffset: -3 }), soil: t('#4a362c', { name: 'lmC-soil', polygonOffset: -4 }),
    green: t('#2d5a34', { name: 'lmC-greenPaint', paint: 0.02 }), lampGreen: t('#2f4a3a', { name: 'lmC-lampGreen', paint: 0.0 }), lampGlass: ctx.mat.emissive('#fff2c8', 0.5),
    guardWall: t('#e8a060', { name: 'lmC-guard' }), guardCol: t('#ecd9a0', { name: 'lmC-guardCol' }), guardRoof: t('#5e9a62', { name: 'lmC-guardRoof', side: 'double' }),
    cream: t('#e6dcc6', { name: 'lmC-cream' }),
  });
  // gilt lettering of the inscription band under the pediment / colonnades
  const inscr = (text, key) => {
    const m = T('#ffffff', { map: K.signTex(text, { w: 2048, h: 128, bg: C.inscr, fg: '#e7bf5a', font: tex.FONTS.serif, weight: 600, size: 0.62, fill: 0.97 }), name: key, paint: 0.0 });
    return m;
  };
  M.inscrW = inscr('ДОМУ ТВОЕМУ', 'lmC-inscrW'); M.inscrP = inscr('ПОДОБАЕТЪ СВЯТЫНЯ ГОСПОДНЯ', 'lmC-inscrP'); M.inscrE = inscr('ВЪ ДОЛГОТУ ДНЕЙ', 'lmC-inscrE');
  M.inscrPlain = T(C.inscr, { name: 'lmC-inscrPlain', paint: 0.0 });
  // tympanum relief: a stylised "History inscribing the glory of Russia" - a seated central figure with groups in white stucco on a grey field (alpha cut-out)
  const relMap = tex.draw(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const fig = (cx, base, hgt, wid) => { g.beginPath(); g.ellipse(cx, base - hgt * 0.38, wid * 0.5, hgt * 0.42, 0, 0, 7); g.fill(); g.beginPath(); g.arc(cx, base - hgt * 0.88, wid * 0.22, 0, 7); g.fill(); g.fillRect(cx - wid * 0.12, base - hgt * 0.8, wid * 0.24, hgt * 0.14); };
    for (const pass of [0, 1]) {
      g.save(); g.fillStyle = pass ? '#f2ede2' : '#b6b0a0'; const o = pass ? 0 : 4; g.translate(o, o);
      fig(512, 236, 190, 130);
      for (let i = 0; i < 4; i++) { fig(350 - i * 80, 236 - i * 5, 100 + (i % 2) * 20, 62); fig(674 + i * 80, 236 - i * 5, 100 + (i % 2) * 20, 62); }
      g.fillRect(40, 226, 944, 14);
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(512 + s * 150, 60, 52, 14, s * 0.25, 0, 7); g.fill(); g.beginPath(); g.ellipse(512 + s * 205, 80, 46, 12, s * 0.3, 0, 7); g.fill(); }
      g.restore();
    }
  }, { key: 'lmC-tympanum', repeat: [1, 1] });
  M.tympanum = T('#ffffff', { map: relMap, alphaTest: 0.45, side: 'double', name: 'lmC-tympanum', paint: 0.0 });
  K.decalMats.add(M.tympanum);
  // dark bronze relief panels of the pedestal (Poltava / Gangut): ships and figures in lighter bronze
  const bronzePanel = (key, ships) => tex.draw(512, 340, (g, w, h) => {
    g.fillStyle = '#242a2a'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#3a4443'); grd.addColorStop(1, '#202626'); g.fillStyle = grd; g.fillRect(8, 8, w - 16, h - 16);
    g.strokeStyle = '#59706a'; g.lineWidth = 3;
    if (ships) {
      for (let i = 0; i < 7; i++) { const x = 40 + i * 70, y = 200 + (i % 3) * 14, s = 1 - (i % 3) * 0.12; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 60 * s, y); g.lineTo(x + 48 * s, y + 18 * s); g.lineTo(x + 8 * s, y + 18 * s); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(x + 30 * s, y); g.lineTo(x + 30 * s, y - 110 * s); g.moveTo(x + 8 * s, y - 80 * s); g.lineTo(x + 52 * s, y - 80 * s); g.moveTo(x + 14 * s, y - 50 * s); g.lineTo(x + 46 * s, y - 50 * s); g.stroke(); }
      g.beginPath(); for (let x = 0; x < w; x += 12) g.lineTo(x, 262 + Math.sin(x * 0.2) * 5); g.stroke();
    } else {
      for (let i = 0; i < 9; i++) { const x = 30 + i * 52, y = 230; g.beginPath(); g.arc(x, y - 70 - (i % 3) * 8, 11, 0, 7); g.stroke(); g.strokeRect(x - 14, y - 60 - (i % 3) * 8, 28, 62); g.beginPath(); g.moveTo(x + 18, y - 90); g.lineTo(x + 18, y + 20); g.stroke(); }
      g.beginPath(); g.moveTo(40, 280); for (let x = 40; x < 480; x += 30) g.lineTo(x, 280 - (x % 60 ? 12 : 0)); g.stroke();
    }
    g.fillStyle = '#6a8a7e'; g.beginPath(); g.arc(256, 70, 22, 0, 7); g.fill(); g.fillRect(246, 90, 20, 34);
  }, { key, repeat: [1, 1] });
  M.reliefPoltava = T('#ffffff', { map: bronzePanel('lmC-relPoltava', false), name: 'lmC-relPoltava', paint: 0.02 });
  M.reliefGangut = T('#ffffff', { map: bronzePanel('lmC-relGangut', true), name: 'lmC-relGangut', paint: 0.02 });
  // gilt inscription on the south face: "ПРАДѢДУ / ПРАВНУКЪ / 1800"
  M.pedInscr = T('#ffffff', { map: tex.draw(512, 640, (g, w, h) => {
    g.fillStyle = '#7f858a'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, 'rgba(255,255,255,0.12)'); grd.addColorStop(1, 'rgba(0,0,0,0.12)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#656b70'; g.lineWidth = 5; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#e2b84a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    tex.fitText(g, 'ПРАДѢДУ', w / 2, h * 0.30, w * 0.84, 92, tex.FONTS.serif, 600);
    tex.fitText(g, 'ПРАВНУКЪ', w / 2, h * 0.52, w * 0.9, 92, tex.FONTS.serif, 600);
    tex.fitText(g, '1800', w / 2, h * 0.76, w * 0.6, 84, tex.FONTS.serif, 600);
  }, { key: 'lmC-pedInscr', repeat: [1, 1] }), name: 'lmC-pedInscr', paint: 0.0 });
  return M;
}
