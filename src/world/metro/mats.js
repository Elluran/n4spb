// metro/mats.js — materials and canvas textures of the metro (colours from docs/research/metro.md section C; all albedos <= ~0.92, the zone light does the rest).
//   const M = makeMats(ctx);  M.xxx = ctx.mat.* material;  M.sign(text, sub, opts) -> emissive board;  M.tex.* canvas textures
import * as THREE from 'three';
import { KEEP_KEY } from './release.js';

export function makeMats(ctx) {
  const { mat, tex } = ctx;
  const FONT = '"Rubik","Noto Sans",sans-serif', SERIF = '"Noto Serif","Times New Roman",serif';
  const rng = (seed) => ctx.rng(seed);
  const T = {};
  const rep = (t, x, y) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; };

  // ---------------------------------------------------------------- painters
  /** veined stone on a rect */
  const stone = (g, x, y, w, h, base, vein, seed, o = {}) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(x, y, w, h);
    const n = o.veins ?? 38;
    for (let i = 0; i < n; i++) {
      g.strokeStyle = vein; g.globalAlpha = (o.alpha ?? 0.25) * (0.4 + r() * 0.8); g.lineWidth = 0.6 + r() * (o.width ?? 2.4);
      g.beginPath(); let px = x + r() * w, py = y + r() * h; g.moveTo(px, py);
      for (let k = 0; k < 5; k++) { px += (r() - 0.35) * w * 0.35; py += (r() - 0.5) * h * 0.4; g.lineTo(px, py); }
      g.stroke();
    }
    g.globalAlpha = 1;
    const sp = o.speck ?? 0;
    for (let i = 0; i < sp; i++) { g.fillStyle = r() < 0.5 ? o.speckA || '#00000022' : o.speckB || '#ffffff22'; g.fillRect(x + r() * w, y + r() * h, 1 + r() * 2, 1 + r() * 2); }
  };
  const cornice = (g, x, y, w, h, c1, c2) => {
    g.fillStyle = c1; g.fillRect(x, y, w, h); g.fillStyle = c2; g.fillRect(x, y, w, Math.max(1, h * 0.18)); g.fillRect(x, y + h * 0.8, w, Math.max(1, h * 0.2));
    for (let xx = x; xx < x + w; xx += h * 0.5) g.fillRect(xx, y + h * 0.35, h * 0.28, h * 0.3);
  };

  // pylon wall tile: 6 m (z) x 4 m (y); uv in metres -> repeat 1/6, 1/4
  T.pylonWall = (key, o = {}) => rep(tex.draw(768, 512, (g, w, h) => {
    const ppm = 128, Y = (v) => h - v * ppm;
    g.fillStyle = o.plaster || '#efe7d1'; g.fillRect(0, 0, w, h);
    // faint plaster mottling
    const r = rng(key); for (let i = 0; i < 120; i++) { g.fillStyle = r() < 0.5 ? 'rgba(160,140,100,0.05)' : 'rgba(255,255,255,0.08)'; g.fillRect(r() * w, r() * Y(1.4), 20 + r() * 70, 10 + r() * 40); }
    stone(g, 0, Y(1.05), w, 1.05 * ppm, o.marble || '#8e3a2f', o.vein || '#e8c8a8', key + 'm', { veins: 46, alpha: 0.28 });
    g.fillStyle = o.plinth || '#2a1a18'; g.fillRect(0, Y(0.1), w, 0.1 * ppm);
    cornice(g, 0, Y(1.28), w, 0.23 * ppm, o.corn || '#f4eee0', 'rgba(150,130,100,0.4)');
  }, { key }), 1 / 6, 1 / 4);
  // track wall, measured from the TRACK BED: black tile skirting up to platform level + 0.45 (1.55 m), marble to 2.55, cornice, plaster above; 6 m x 6 m tile
  T.trackWall = (key, o = {}) => rep(tex.draw(768, 768, (g, w, h) => {
    const ppm = 128, Y = (v) => h - v * ppm;
    g.fillStyle = o.plaster || '#efe7d1'; g.fillRect(0, 0, w, h);
    const r = rng(key); for (let i = 0; i < 120; i++) { g.fillStyle = r() < 0.5 ? 'rgba(160,140,100,0.05)' : 'rgba(255,255,255,0.08)'; g.fillRect(r() * w, r() * Y(2.8), 20 + r() * 70, 10 + r() * 40); }
    stone(g, 0, Y(2.55), w, 1.0 * ppm, o.marble || '#8e3a2f', o.vein || '#e8c8a8', key + 'm', { veins: 50, alpha: 0.28 });
    g.fillStyle = o.skirt || '#15151d'; g.fillRect(0, Y(1.55), w, 1.55 * ppm);
    g.fillStyle = 'rgba(255,255,255,0.06)'; for (let xx = 0; xx < w; xx += 0.3 * ppm) g.fillRect(xx, Y(1.55), 1, 1.55 * ppm);
    cornice(g, 0, Y(2.78), w, 0.23 * ppm, o.corn || '#f4eee0', 'rgba(150,130,100,0.4)');
  }, { key }), 1 / 6, 1 / 6);

  // floors: 1 uv unit = 1 m
  T.granite = (key, base, speckA, speckB, o = {}) => rep(tex.draw(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const r = rng(key); for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? speckA : speckB; g.fillRect(r() * w, r() * h, 1 + r() * 2.4, 1 + r() * 2.4); }
    // slab joints: 1.0 m x 0.5 m slabs on a 2 m tile, every other row shifted by half a slab
    g.strokeStyle = o.joint || 'rgba(0,0,0,0.30)'; g.lineWidth = 2;
    const sw = 256, sh = 128;
    for (let yy = 0, row = 0; yy <= h; yy += sh, row++) { g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke(); for (let xx = (row % 2) * sw / 2; xx <= w; xx += sw) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + sh); g.stroke(); } }
    if (o.tint) { for (let i = 0; i < 14; i++) { g.fillStyle = o.tint; g.globalAlpha = 0.07; g.fillRect(((i * 97) % 4) * sw, ((i * 53) % 4) * sh, sw, sh); } g.globalAlpha = 1; }
  }, { key }), 0.5, 0.5);
  // track bed: ballast speckle with concrete sleepers every 0.65 m along v (one tile = 1.3 m), u across the bed
  T.bed = () => rep(tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#5b5750'; g.fillRect(0, 0, w, h);
    const r = rng('bed'); for (let i = 0; i < 700; i++) { g.fillStyle = r() < 0.5 ? 'rgba(20,18,15,0.35)' : 'rgba(210,200,185,0.20)'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
    g.fillStyle = '#8f8b84'; for (let y of [10, 74]) { g.fillRect(8, y, w - 16, 26); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(8, y + 22, w - 16, 4); g.fillStyle = '#8f8b84'; }
  }, { key: 'metro-bed' }), 1, 1);
  // the central-hall border: black strip with a white Greek-key (meander); repeats every 1.4 m along v
  T.meander = rep(tex.draw(128, 256, (g, w, h) => {
    g.fillStyle = '#25232a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e8e0c8'; g.lineWidth = 9; g.lineJoin = 'miter';
    const a = 16, b = 112; g.beginPath(); g.moveTo(a, 20); g.lineTo(b, 20); g.lineTo(b, 70); g.lineTo(a + 30, 70); g.lineTo(a + 30, 44); g.lineTo(a + 60, 44);
    g.moveTo(a, 20 + 128); g.lineTo(b, 20 + 128); g.lineTo(b, 70 + 128); g.lineTo(a + 30, 70 + 128); g.lineTo(a + 30, 44 + 128); g.lineTo(a + 60, 44 + 128); g.stroke();
  }, { key: 'metro-meander' }), 1, 1);

  // tunnel lining: ring seams every 1 m along u, bolt flange dots; u = path metres, v = profile metres
  T.lining = rep(tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#9a9488'; g.fillRect(0, 0, w, h);
    const r = rng('lining'); for (let i = 0; i < 320; i++) { g.fillStyle = r() < 0.5 ? 'rgba(40,36,30,0.16)' : 'rgba(255,250,235,0.10)'; g.fillRect(r() * w, r() * h, 2 + r() * 5, 1 + r() * 3); }
    g.fillStyle = 'rgba(30,27,22,0.55)'; g.fillRect(0, 0, 5, h); g.fillStyle = 'rgba(255,245,220,0.18)'; g.fillRect(5, 0, 3, h);
    g.fillStyle = 'rgba(30,27,22,0.28)'; g.fillRect(0, h * 0.5 - 1, w, 2);                             // longitudinal joint of the segments
  }, { key: 'metro-lining' }), 1, 1);
  // painted tunnel vault of the escalator tube (plaster, soft mottling), 1 uv unit = 1 m
  T.plasterVault = rep(tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#e9e1cb'; g.fillRect(0, 0, w, h);
    const r = rng('pvault'); for (let i = 0; i < 150; i++) { g.fillStyle = r() < 0.5 ? 'rgba(150,130,90,0.07)' : 'rgba(255,255,250,0.10)'; g.fillRect(r() * w, r() * h, 8 + r() * 40, 4 + r() * 20); }
  }, { key: 'metro-pvault' }), 1 / 2, 1 / 2);
  // escalator belt (steps seen from above): comb ribs + the yellow demarcation strip, scrolls along v
  T.belt = (key) => tex.draw(64, 128, (g, w, h) => {
    g.fillStyle = '#7d848c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5b626a'; for (let x = 4; x < w - 4; x += 6) g.fillRect(x, 0, 3, h);
    g.fillStyle = '#d9dde0'; g.fillRect(0, 0, w, 5); g.fillStyle = '#f2c500'; g.fillRect(0, h - 22, w, 10); g.fillStyle = '#3a3f46'; g.fillRect(0, h - 12, w, 12);
  }, { key });

  // vestibule interior wall (inward faces of the rotunda): cream marble dado to 1.3 m, plaster above, a cornice at 6.4 m; tile 6 m x 6.8 m (u = 6 m along the wall, v = metres / 6.8)
  T.vestWall = rep(tex.draw(384, 436, (g, w, h) => {
    const ppm = 64, Y = (v) => h - v * ppm;
    g.fillStyle = '#f0e8d0'; g.fillRect(0, 0, w, h);
    stone(g, 0, Y(1.3), w, 1.3 * ppm, '#cfc2a8', '#9a8c74', 'vestdado', { veins: 30, alpha: 0.25 });
    g.fillStyle = '#7a5a40'; g.fillRect(0, Y(0.12), w, 0.12 * ppm);
    cornice(g, 0, Y(1.5), w, 0.2 * ppm, '#f6f0e0', 'rgba(150,130,100,0.4)'); cornice(g, 0, Y(6.8), w, 0.4 * ppm, '#f6f0e0', 'rgba(150,130,100,0.4)');
  }, { key: 'metro-vest-wall' }), 1, 1);

  // corridor wall tile 4 m x 4 m: brown-red glazed dado 1.1 m, a cream band, plaster above
  T.corridorWall = rep(tex.draw(512, 512, (g, w, h) => {
    const ppm = 128, Y = (v) => h - v * ppm;
    g.fillStyle = '#eee4cc'; g.fillRect(0, 0, w, h);
    const r = rng('corridor'); for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? 'rgba(150,130,90,0.06)' : 'rgba(255,255,250,0.10)'; g.fillRect(r() * w, r() * h, 20 + r() * 60, 10 + r() * 30); }
    g.fillStyle = '#7a3a2c'; g.fillRect(0, Y(1.1), w, 1.1 * ppm);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 0.3 * ppm) { g.beginPath(); g.moveTo(x, Y(1.1)); g.lineTo(x, h); g.stroke(); } for (let v = 0.3; v < 1.1; v += 0.3) { g.beginPath(); g.moveTo(0, Y(v)); g.lineTo(w, Y(v)); g.stroke(); }
    g.fillStyle = '#e6dcc0'; g.fillRect(0, Y(1.32), w, 0.22 * ppm); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, Y(1.1), w, 3);
  }, { key: 'metro-corridor-wall' }), 1, 1);

  // smalt mosaic (Mayakovskaya): small glossy squares in red / orange / dark red, uv in metres (tile 4 m x 4 m)
  T.mosaic = (key) => rep(tex.draw(512, 512, (g, w, h) => {
    const r = rng(key), cols = ['#b22a1e', '#c4351f', '#d4452a', '#a02218', '#8c1d14', '#d9582e', '#7a1812'], n = 64, c = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = cols[(r() * cols.length) | 0]; g.fillRect(x * c, y * c, c, c); if (r() < 0.04) { g.fillStyle = '#ffb347'; g.fillRect(x * c + 1, y * c + 1, c - 2, c - 2); } }
    g.strokeStyle = 'rgba(40,10,6,0.35)'; g.lineWidth = 1; for (let i = 0; i <= n; i += 2) { g.beginPath(); g.moveTo(i * c, 0); g.lineTo(i * c, h); g.stroke(); g.beginPath(); g.moveTo(0, i * c); g.lineTo(w, i * c); g.stroke(); }
  }, { key }), 1 / 4, 1 / 4);

  // ---------------------------------------------------------------- signs
  const sgn = (key, w, h, fn) => tex.draw(w, h, fn, { key });
  // CONTENT KEYS (plan 2026-10-15 item 5): the boards below were keyed per placement ('<hall>-hang-<z>'), so identical boards got their own canvas, material and batch group
  // in every hall. A key made of what is painted shares one canvas (and one batch material) per distinct picture. ?metroboardkeys=0 = the old per-placement keys (A/B).
  const CONTENT_KEYS = typeof location === 'undefined' || new URLSearchParams(location.search).get('metroboardkeys') !== '0';
  // runtime keys (KEEP_KEY: the generic hall's 'nb-<id>', painted lazily by show()) keep their own canvas: release.js keeps it on the CPU, and a shared content key could hand show() a real hall's canvas already shrunk after upload
  const ck = (kind, key, ...parts) => CONTENT_KEYS && !KEEP_KEY.test(key || '') ? 'mb-' + kind + '|' + parts.map((x) => x == null ? '' : String(x)).join('|') : key;
  /** blue direction board: white text, optional arrow ('l' | 'r' | 'u' | 'd') */
  const blueBoard = (text, sub, arrow, key, o = {}) => sgn(ck('blue', key, text, sub, arrow, o.bg), 512, 128, (g, w, h) => {
    g.fillStyle = o.bg || '#1d4e9b'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.fillRect(6, 6, w - 12, 3); g.fillRect(6, h - 9, w - 12, 3);
    g.fillStyle = '#ffffff'; g.textBaseline = 'middle'; g.textAlign = arrow ? 'left' : 'center';
    const x0 = arrow ? 112 : w / 2; tex.fitText(g, text, x0, sub ? h * 0.38 : h * 0.52, w - (arrow ? 130 : 40), 54, FONT, 700);
    if (sub) { g.globalAlpha = 0.85; tex.fitText(g, sub, x0, h * 0.74, w - (arrow ? 130 : 40), 30, FONT, 500); g.globalAlpha = 1; }
    if (arrow) {
      g.save(); g.translate(58, h / 2); g.rotate({ r: 0, d: Math.PI / 2, l: Math.PI, u: -Math.PI / 2 }[arrow] || 0); g.fillRect(-34, -6, 56, 12);
      g.beginPath(); g.moveTo(34, 0); g.lineTo(8, -22); g.lineTo(8, 22); g.closePath(); g.fill(); g.restore();
    }
  });
  /** station name board in the line colour (white Cyrillic + Latin) */
  const nameBoard = (name, nameEn, color, key) => sgn(ck('name', key, name, nameEn, color), 1024, 160, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, h - 10, w, 10);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    tex.fitText(g, name, w / 2, h * 0.38, w - 80, 76, FONT, 700); g.globalAlpha = 0.9; tex.fitText(g, nameEn, w / 2, h * 0.76, w - 80, 40, FONT, 500); g.globalAlpha = 1;
  });
  /** station name in dark bronze classical capitals on the plaster wall (Vosstaniya / Vladimirskaya track walls) */
  const bronzeName = (name, key, o = {}) => sgn(ck('bronze', key, name, o.fill), 1024, 128, (g, w, h) => {
    g.fillStyle = o.fill || '#5a4630'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const t = [...name.toUpperCase()].join(String.fromCharCode(8202, 8202, 8202)); tex.fitText(g, t, w / 2, h / 2, w - 20, 60, SERIF, 600);
  });
  const lineBadge = (num, color, key) => sgn(ck('badge', key, num, color), 128, 128, (g, w, h) => {
    g.fillStyle = color; tex.roundRect(g, 4, 4, w - 8, h - 8, 26); g.fill(); g.fillStyle = '#fff'; g.font = `700 ${h * 0.62}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(num), w / 2, h * 0.54);
  });

  // ---------------------------------------------------------------- materials
  const toon = (c, o) => mat.toon(c, o), em = (c, i, o) => mat.emissive(c, i, o);
  const M = {
    T, blueBoard, nameBoard, bronzeName, lineBadge, stone, rep,
    plaster: toon('#efe7d1'), plasterWarm: toon('#e9e1c9'), ceiling: toon('#f1ead8', { side: 'double' }), ceilingDouble: toon('#efe7d6', { side: 'double' }),
    white: toon('#f4efe4'), cream: toon('#e6dcc4'), pink: toon('#d9b7a6'),
    marbleRed: toon('#8e3a2f'), redGranite: toon('#9b4f3f'), blackTile: toon('#1a1a22'), black: toon('#23232b'), skirt: toon('#2b2024'),
    gold: toon('#c9a24b'), goldEm: em('#e8c868', 1.0), bronze: toon('#5a4630'), bronzeDark: toon('#3a2e20'), navy: toon('#1e2a55'),
    steel: toon('#b8bcc0'), steelDark: toon('#6b7480'), steelBlack: toon('#3a3f46'), concrete: toon('#8d8a83'), concreteDark: toon('#6d6a65'),
    yellow: toon('#f2c500'), yellowEm: em('#ffd21a', 0.6),
    rail: toon('#8b9199'), railTop: toon('#aab0b6'), sleeper: toon('#7a746b'), ballast: toon('#4a4741'), bed: toon('#6a665f'), cable: toon('#2d2d33'), thirdRail: toon('#5b4a3a'),
    lampWarm: em('#ffe3b3', 1.5), lampWhite: em('#fff4dc', 1.45), lampCool: em('#eef6ff', 1.2), lampCylinder: em('#fff2c8', 1.35), lampRed: em('#ff4a3a', 1.6), lampGreen: em('#4aff7a', 1.5), lampAmber: em('#ffb040', 1.5),
    blue: toon('#1d4e9b'), green: toon('#0a8f4d'), red: toon('#c8392f'), orange: toon('#ea7125'),
    glass: toon('#9cc2d6', { transparent: true, opacity: 0.32, depthWrite: false }), glassDark: toon('#3a4c5a', { transparent: true, opacity: 0.55, depthWrite: false }),
    wood: toon('#8c5a32'), woodDark: toon('#5b3a22'), kiosk: toon('#4a4d55'),
    corridorWall: toon('#ffffff', { map: T.corridorWall, side: 'double' }), corridorVault: toon('#efe8d4', { side: 'double' }), corridorFloor: toon('#ffffff', { map: T.granite('corridor-floor', '#8d8a86', 'rgba(25,25,28,0.35)', 'rgba(255,255,255,0.30)'), side: 'double' }),
    discBlack: em('#000000', 1), lining: toon('#ffffff', { map: T.lining, side: 'double' }), plasterVault: toon('#ffffff', { map: T.plasterVault, side: 'double' }),
    skin: toon('#e2b99a'),
    rotundaInner: toon('#ffffff', { map: T.vestWall }),
    // west extension
    brass: toon('#c8a64a'), columnBlack: toon('#1b1514'), marbleWhite: toon('#ebe6da'), purple: toon('#7a1fd0'), stainless: toon('#c7cbcf'), graniteGrey: toon('#7e7a76'), graniteLight: toon('#a8a39b'),
    leninBronze: toon('#7a6a4a'), glassWarm: toon('#d9c9a0', { transparent: true, opacity: 0.38, depthWrite: false }),
  };
  /** emissive board with a canvas map (signs, ads, name boards): cached by the texture */
  M.board = (map, intensity = 1.0) => mat.emissive('#ffffff', intensity, { map });
  M.boardToon = (map) => toon('#ffffff', { map });
  return M;
}
