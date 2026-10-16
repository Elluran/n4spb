// metro/st-tekhnolog.js — Tekhnologichesky Institut 1 + 2, the two halls (docs/research/metro-south-vitebsky-tekhnolog.md sections 3, 6, 7; photos refs/tekhnolog 01-18, x03-x05).
//   hall 1     (tekhnolog, WEST, 1955) three vaults, an ARCADE of round arches on massive piers of pale pink-beige Ural marble; bronze laurel wreaths and bronze portrait medallions of
//              scientists on the spandrels (alternating), a bronze lattice cornice with white glass lamps at the springing of the ribbed barrel vault, the round lit skylight at its centre,
//              dark-grey granite floor with lighter bands; cream marble track walls on a black base, bronze letters, bronze honeycomb door grilles. In the MIDDLE of the hall the +x (ESE) arcade
//              opens on the transfer stair (three flights between two pairs of fluted twin columns, 4.2 m up) that crosses over the side hall and the track to the cross passage.
//   hall 2     (tekhnolog2, EAST, 1961) "strict functional" PYLON hall with a SHORT central hall (64 m, dossier 7): grey-cream marble ashlar pylons with black chronology letters (1920-1970),
//              a projecting ledge with cove lights under a flat white vault, grey floor with transverse dark stripes, white marble track walls, plain dark doors. The central hall ends at its
//              SSW end in the wide axial stair up to the landing of the cross passage, which turns WNW over the +x side hall and its track.
//   inclines   hall 1: 4 lanes from the NNE end (turned 8 deg about the foot: data/metro-tekhnolog.js), a trapezoid lower hall between the tube and the end wall; hall 2: 3 lanes, axial, from
//              a 20 m lower hall behind the NNE end of the central hall (as at Gorkovskaya). Both heads lie in the shared vestibule (metro/hub-tekhnolog.js).
//   KNOWN SIMPLIFICATION: the real station is a cross-platform interchange (each hall carries one track of EACH line: hall 1 both southbound, hall 2 both northbound). The ride engine keeps
//   both tracks of a line in ONE hall, so hall 1 is built as the LINE 1 station (both line-1 tracks, red bands) and hall 2 as the LINE 2 station (both line-2 tracks, blue bands); the
//   halls, the cross passage between them (stairs + bridges + 21 m passage) and the shared vestibule are geometrically faithful, and the cross passage is signed as the transfer.
// Own hall builder (not hall-pylon.js): the +x side vault, the +x track-wall collider and the +x row are cut where the transfer stair / bridge crosses the side hall.
// Static geometry only; textures are shared through ctx.tex keys 'ti-*'.
import * as THREE from 'three';
import { FRAMES, ESC2 } from '../data/metro.js';
import { TK } from '../data/metro-tekhnolog.js';
import { Space, extrudeZ, extrudeX, archHole, floorGeo } from './lib.js';
import { TUBE_R, TUBE_CY } from './tunnel.js';
import { serviceStairs } from './stairs.js';
import { buildEscalator } from './escalator.js';
import { createPlatform } from './platform.js';
import { lowerHall, panelTex } from './petro-kit.js';
import { buildPolyRoom } from './proom.js';
import { makeSigns } from './signs.js';

export const TI = { C: 4.4, PY: 6.2, EDGE: 8.5, TRK: 10.0, WALL: 13.4, RS: 3.6 };
const SERIF = '"Noto Serif","Times New Roman",serif', FONT = '"Rubik","Noto Sans",sans-serif';
const NAME1 = 'Технологический институт', NAME1_EN = 'Tekhnologicheskiy institut', NAME2 = 'Технологический институт 2', NAME2_EN = 'Tekhnologicheskiy institut 2';
const EXIT_STREETS = { streets: [['Московский проспект', 'Moskovskiy prospekt'], ['Загородный проспект', 'Zagorodny prospekt']], esc: true };

// ---------------------------------------------------------------- geometry helpers
/** inner surface of a half-elliptic barrel (centre cx, springing y0, half width a, rise b) from z0 to z1: uv = (arc metres, z metres); use a double-sided material */
function vaultGeo(cx, y0, a, b, z0, z1, n = 32) {
  const ring = []; let s = 0, px = null, py = null;
  for (let i = 0; i <= n; i++) { const t = Math.PI - i * Math.PI / n, x = cx + a * Math.cos(t), y = y0 + b * Math.sin(t); if (px !== null) s += Math.hypot(x - px, y - py); px = x; py = y; ring.push([x, y, s]); }
  const pos = [], uv = [], idx = [], m = n + 1;
  for (const z of [z0, z1]) for (const [x, y, ss] of ring) { pos.push(x, y, z); uv.push(ss, z); }
  for (let i = 0; i < n; i++) idx.push(i, i + 1, m + i, i + 1, m + i + 1, m + i);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** vertical quad in the plane x = const along z (faces +x when fx > 0), uv (z, y) in metres */
function quadX(x, z0, z1, y0, y1, fx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(Array(4).fill([fx > 0 ? 1 : -1, 0, 0]).flat(), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([z0, y0, z1, y0, z1, y1, z0, y1], 2));
  g.setIndex(fx > 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
  return g;
}
const rectHole = (a0, a1, b0, b1) => [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
/** a profile of n risers from (a0, y0) to (a0 + dir * run, y0 + rise): [[a, y], ...] (the first point is the foot) */
/** height above the foot of the tread that lies d metres (along the flight) from the foot of such a flight */
const treadY = (d, run, rise, n) => Math.min(n, Math.max(1, Math.floor(d / (run / n)) + 1)) * rise / n;
function stepProfile(a0, dir, run, y0, rise, n) { const tr = run / n, rh = rise / n, p = [[a0, y0]]; for (let i = 0; i < n; i++) { const a = a0 + dir * i * tr; p.push([a, y0 + (i + 1) * rh], [a + dir * tr, y0 + (i + 1) * rh]); } return p; }

// ---------------------------------------------------------------- shared textures (keys 'ti-*')
function textures(ctx, M) {
  if (M.__ti) return M.__ti;
  const { tex, mat } = ctx, T = {};
  T.pier1 = panelTex(ctx, M, 'ti-pier1', { base: '#d9c9b3', w: 1.2, h: 0.6, cols: 2, rows: 4, veins: 26, vein: 'rgba(150,120,95,0.25)', joint: 'rgba(120,100,80,0.38)' });
  T.track1 = panelTex(ctx, M, 'ti-track1', { base: '#e4dac6', w: 0.6, h: 0.6, cols: 4, rows: 4, veins: 18, joint: 'rgba(130,115,95,0.32)' });
  T.pylon2 = panelTex(ctx, M, 'ti-pylon2', { base: '#cbc0ac', w: 0.9, h: 0.6, cols: 3, rows: 4, veins: 22, vein: 'rgba(110,100,85,0.22)', joint: 'rgba(90,82,70,0.42)' });
  T.track2 = panelTex(ctx, M, 'ti-track2', { base: '#eceae4', w: 1.2, h: 0.6, cols: 2, rows: 4, veins: 10, joint: 'rgba(140,140,140,0.30)' });
  T.vest = panelTex(ctx, M, 'ti-vest', { base: '#ece8e0', w: 1.0, h: 0.5, cols: 2, rows: 4, veins: 16, joint: 'rgba(120,115,105,0.30)' });
  T.tile = M.rep(tex.draw(128, 128, (g, w, h) => { g.fillStyle = '#f2f1ec'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(150,150,145,0.55)'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * w / 8, 0); g.lineTo(i * w / 8, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 8); g.lineTo(w, i * h / 8); g.stroke(); } }, { key: 'ti-tile' }), 1 / 1.2, 1 / 1.2);
  // hall 1 vault: a ribbed barrel (rib pitch 1.4 m along z): uv = (arc m, z m)
  T.vault1 = M.rep(tex.draw(64, 128, (g, w, h) => { g.fillStyle = '#dedcd5'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2f1ec'; g.fillRect(0, h * 0.18, w, h * 0.52); g.fillStyle = 'rgba(120,115,105,0.45)'; g.fillRect(0, h * 0.70, w, h * 0.08); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, h * 0.14, w, h * 0.04); }, { key: 'ti-vault1' }), 1 / 2, 1 / 1.4);
  // hall 1 floor: dark-grey granite slabs with a lighter chequer and bands (2 m tile, uv metres)
  T.floor1 = M.rep(tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#4a4a4d'; g.fillRect(0, 0, w, h); const r = ctx.rng('ti-floor1');
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { if ((i + j) % 2) { g.fillStyle = '#6d6d70'; g.fillRect(i * w / 4, j * h / 4, w / 4, h / 4); } }
    for (let i = 0; i < 1800; i++) { g.fillStyle = r() < 0.5 ? 'rgba(20,20,22,0.30)' : 'rgba(220,220,215,0.18)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    g.strokeStyle = 'rgba(25,25,28,0.5)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
  }, { key: 'ti-floor1' }), 1 / 2, 1 / 2);
  T.band1 = M.rep(tex.draw(64, 64, (g, w, h) => { g.fillStyle = '#8a8a88'; g.fillRect(0, 0, w, h); const r = ctx.rng('ti-band1'); for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? 'rgba(40,40,40,0.25)' : 'rgba(255,255,255,0.2)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }, { key: 'ti-band1' }), 1, 1);
  // hall 2 floor: grey granite with transverse dark stripes (0.7 m dark / 0.7 m light)
  T.floor2 = M.rep(tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#8e8d8a'; g.fillRect(0, 0, w, h); g.fillStyle = '#4b4b4d'; g.fillRect(0, 0, w, h / 2); const r = ctx.rng('ti-floor2');
    for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(20,20,22,0.28)' : 'rgba(230,230,225,0.18)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    g.strokeStyle = 'rgba(30,30,30,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  }, { key: 'ti-floor2' }), 1 / 2, 1 / 1.4);
  // bronze lattice cornice with gold rosettes (uv: z metres, y metres; 1.4 m x 0.35 m tile)
  T.cornice = M.rep(tex.draw(256, 64, (g, w, h) => {
    g.fillStyle = '#4c3b26'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a6a3a'; g.lineWidth = 3;
    for (let x = -h; x < w + h; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h, h); g.stroke(); g.beginPath(); g.moveTo(x + h, 0); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = '#d6b45a'; for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, h / 2, 7, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#2e2416'; g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4);
  }, { key: 'ti-cornice' }), 1 / 1.4, 1 / 0.35);
  T.wreath = mat.decal('#ffffff', { map: tex.draw(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); const leaf = (x, y, a, s) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 13 * s, 5 * s, 0, 0, Math.PI * 2); g.fill(); g.restore(); };
    for (const side of [-1, 1]) for (let i = 0; i < 13; i++) { const t = -Math.PI / 2 + side * (0.25 + i * 0.2), R = 92, x = w / 2 + R * Math.cos(t), y = h / 2 + 8 + R * Math.sin(t) * -1;
      g.fillStyle = i % 2 ? '#7a5a2c' : '#a07a3a'; leaf(x + side * 9, y, t + side * 0.9, 1.1); leaf(x - side * 9, y + 4, t - side * 0.6, 1.0); }
    g.strokeStyle = '#5c4320'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2 + 8, 92, Math.PI * 0.62, Math.PI * 2.38, false); g.stroke();
    g.fillStyle = '#b08a44'; g.beginPath(); g.moveTo(w / 2 - 30, h - 34); g.lineTo(w / 2, h - 52); g.lineTo(w / 2 + 30, h - 34); g.lineTo(w / 2 + 18, h - 14); g.lineTo(w / 2, h - 30); g.lineTo(w / 2 - 18, h - 14); g.closePath(); g.fill();
  }, { key: 'ti-wreath' }) });
  // bronze portrait medallions: 12 scientists (generic profile reliefs, the name round the rim)
  const SCI = ['ЛОМОНОСОВ', 'МЕНДЕЛЕЕВ', 'ПОПОВ', 'ЖУКОВСКИЙ', 'ЛОБАЧЕВСКИЙ', 'ПАВЛОВ', 'ЦИОЛКОВСКИЙ', 'БУТЛЕРОВ', 'ЯБЛОЧКОВ', 'ЛОДЫГИН', 'ПОЛЗУНОВ', 'КУЛИБИН'];
  T.medals = SCI.map((nm, k) => mat.decal('#ffffff', { map: tex.draw(160, 160, (g, w0, h0) => {
    g.clearRect(0, 0, w0, h0); g.save(); g.scale(w0 / 256, h0 / 256); const w = 256, h = 256, r = ctx.rng('ti-medal-' + k), cx = w / 2, cy = h / 2;
    g.fillStyle = '#6a5230'; g.beginPath(); g.ellipse(cx, cy, 118, 124, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#8c6c3c'; g.beginPath(); g.ellipse(cx, cy, 104, 110, 0, 0, Math.PI * 2); g.fill();
    // a profile head facing left (forehead, nose, lips, chin, neck), hair / beard varied
    const sx = (v) => cx - 40 + v, sy = (v) => cy - 70 + v;
    g.fillStyle = '#b8955a'; g.beginPath(); g.moveTo(sx(40), sy(10)); g.bezierCurveTo(sx(95), sy(5), sx(110), sy(60), sx(98), sy(95)); g.lineTo(sx(92), sy(150)); g.lineTo(sx(48), sy(150));
    g.lineTo(sx(44), sy(118)); g.lineTo(sx(30), sy(108)); g.lineTo(sx(26), sy(96)); g.lineTo(sx(18), sy(90)); g.lineTo(sx(22), sy(80)); g.lineTo(sx(12), sy(70)); g.lineTo(sx(20), sy(48)); g.bezierCurveTo(sx(18), sy(30), sx(26), sy(14), sx(40), sy(10)); g.closePath(); g.fill();
    g.fillStyle = '#7a5c30'; g.beginPath(); g.moveTo(sx(40), sy(10)); g.bezierCurveTo(sx(95), sy(0), sx(115), sy(50), sx(100), sy(90)); g.bezierCurveTo(sx(90), sy(60), sx(70), sy(40), sx(44), sy(30)); g.closePath(); g.fill();
    if (r() < 0.6) { g.beginPath(); g.moveTo(sx(26), sy(96)); g.bezierCurveTo(sx(30), sy(135 + r() * 15), sx(70), sy(140), sx(80), sy(105)); g.lineTo(sx(44), sy(110)); g.closePath(); g.fill(); }
    g.fillStyle = '#e3c27a'; g.font = `700 22px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, nm, cx, h - 34, 170, 22, SERIF, 700); g.restore();
  }, { key: 'ti-medal-' + k }) }));
  T.grille1 = tex.draw(128, 224, (g, w, h) => {
    g.fillStyle = '#6a5230'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d1a16'; g.fillRect(10, 10, w - 20, h - 20); g.strokeStyle = '#a8823a'; g.lineWidth = 4;
    const R = 13; for (let row = 0; row < 12; row++) for (let col = 0; col < 6; col++) { const x = 14 + col * R * 1.5 * 1.15, y = 18 + row * R * 1.5 + (col % 2) * R * 0.75; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(x + R * 0.8 * Math.cos(a), y + R * 0.8 * Math.sin(a)); } g.closePath(); g.stroke(); }
    g.strokeStyle = '#c9a24b'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
  }, { key: 'ti-grille1' });
  T.door2 = tex.draw(64, 128, (g, w, h) => { g.fillStyle = '#8f949a'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2a2e'; g.fillRect(5, 5, w - 10, h - 10); g.fillStyle = '#5c6066'; g.fillRect(w - 16, h * 0.5, 6, 14); }, { key: 'ti-door2' });
  T.skylight = mat.emissive('#ffffff', 1.4, { map: tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#4b3a22'; g.fillRect(0, 0, w, h); const cx = w / 2, cy = h / 2; g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(cx, cy, 120, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#6a5230'; g.lineWidth = 6; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; g.beginPath(); g.moveTo(cx + 22 * Math.cos(a), cy + 22 * Math.sin(a)); g.lineTo(cx + 120 * Math.cos(a), cy + 120 * Math.sin(a)); g.stroke(); }
    for (const rr of [22, 62, 96, 120]) { g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.stroke(); }
  }, { key: 'ti-skylight' }) });
  // hall 2: the chronology on the pylons (black dark-metal capitals); no flags anywhere
  const CHRONO = [
    ['1920', 'ПРИНЯТ ПЛАН ЭЛЕКТРИФИКАЦИИ РОССИИ — ГОЭЛРО'], ['1934', 'СОВЕТСКИЕ УЧЁНЫЕ ПЕРВЫМИ СОЗДАЛИ ТЕОРИЮ ЦЕПНОЙ РЕАКЦИИ'], ['1954', 'В СССР ПУЩЕНА ПЕРВАЯ В МИРЕ АТОМНАЯ ЭЛЕКТРОСТАНЦИЯ'],
    ['1957', 'ЗАПУЩЕН ПЕРВЫЙ В МИРЕ ИСКУССТВЕННЫЙ СПУТНИК ЗЕМЛИ'], ['1957', 'СПУЩЕН НА ВОДУ ПЕРВЫЙ В МИРЕ АТОМНЫЙ ЛЕДОКОЛ «ЛЕНИН»'], ['1959', 'СОВЕТСКАЯ КОСМИЧЕСКАЯ РАКЕТА СФОТОГРАФИРОВАЛА НЕВИДИМУЮ СТОРОНУ ЛУНЫ'],
    ['1961', 'ЧЕЛОВЕК ВПЕРВЫЕ В МИРЕ СОВЕРШИЛ ПОЛЁТ В КОСМОС'], ['1965', 'ВПЕРВЫЕ ЧЕЛОВЕК ВЫШЕЛ В ОТКРЫТЫЙ КОСМОС'], ['1966', 'СОВЕРШЕНА ПЕРВАЯ МЯГКАЯ ПОСАДКА НА ЛУНУ'],
    ['1970', 'ВПЕРВЫЕ В ИСТОРИИ НА ЛУНУ ДОСТАВЛЕН САМОХОДНЫЙ АППАРАТ «ЛУНОХОД-1»'],
  ];
  const wrap = (s, n) => { const out = []; let line = ''; for (const wd of s.split(' ')) { if ((line + ' ' + wd).trim().length > n && line) { out.push(line); line = wd; } else line = (line + ' ' + wd).trim(); } if (line) out.push(line); return out; };
  T.chrono = CHRONO.map(([yr, txt], k) => mat.decal('#ffffff', { map: tex.draw(384, 144, (g, w0, h0) => {
    g.clearRect(0, 0, w0, h0); g.save(); g.scale(w0 / 512, h0 / 192); const w = 512, h = 192; g.fillStyle = '#1e1e20'; g.textAlign = 'left'; g.textBaseline = 'middle'; const lines = wrap(yr + ' — ' + txt, 24).slice(0, 4), lh = h / Math.max(3, lines.length);
    lines.forEach((l, i) => tex.fitText(g, l, 10, lh * (i + 0.5), w - 20, Math.min(40, lh * 0.8), SERIF, 700)); g.restore();
  }, { key: 'ti-chrono-' + k }) }));
  T.posters = ['Театр', 'Музей', 'Выставка'].map((t, k) => mat.emissive('#ffffff', 1.1, { map: tex.draw(128, 192, (g, w, h) => {
    const bg = ['#f3e2c8', '#dfe9f3', '#e8f0de'][k], fg = ['#8a2b1e', '#1d4e9b', '#2c6e3a'][k]; g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.fillRect(14, 20, w - 28, 92);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w / 2, 66, 28, 0, Math.PI * 2); g.fill(); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, t, w / 2, 140, w - 20, 26, FONT, 800); tex.fitText(g, 'Санкт-Петербург', w / 2, 170, w - 20, 13, FONT, 500);
  }, { key: 'ti-poster-' + k }) }));
  const toon = (map, o) => mat.toon('#ffffff', { map, ...(o || {}) });
  M.__ti = { T, CHRONO,
    pier1: toon(T.pier1), track1: toon(T.track1), pylon2: toon(T.pylon2), track2: toon(T.track2), vest: toon(T.vest, { side: 'double' }), tile: toon(T.tile, { side: 'double' }),
    vault1: toon(T.vault1, { side: 'double' }), vault2: mat.toon('#f2f0ea', { side: 'double' }), sideVault: mat.toon('#eeebe4', { side: 'double' }),
    floor1: toon(T.floor1), band1: toon(T.band1), floor2: toon(T.floor2), side: M.corridorFloor, cornice: toon(T.cornice), steps: mat.toon('#58554f'), ledge: mat.toon('#e9e6de'),
    grille1: toon(T.grille1), door2: toon(T.door2), plaster: mat.toon('#efece4'), black: M.blackTile,
  };
  return M.__ti;
}

// ---------------------------------------------------------------- the hall shell
/**
 * cfg: { FY, PZ, SPC (spring of the central vault above FY), CB (its rise), cen: [zA, zB] | null, openZ: [centres], openW, arch: { spring } | rect: { top } (relative to FY),
 *        cut: [z0, z1, top] (+x row: one opening, hall 1 stair), notch: [z0, z1, y] (+x row lowered to FY + y, hall 2 bridge), gap: [z0, z1] (+x side vault split, +x track-wall collider lowered),
 *        endN / endS: { halfW, spring } (arch) | { halfW, top, rect: true } | null (closed), mats: { pylon, track, floor, side, vault, sideVault, end } }
 */
function hallShell(ctx, M, S, cfg) {
  const { C, PY, EDGE, TRK, WALL, RS } = TI, k = S.k, FY = cfg.FY, PZ = cfg.PZ, BED = FY - 1.1, SPC = FY + cfg.SPC, SPS = FY + 3.6, CXS = (PY + WALL) / 2, H = cfg.SPC, mats = cfg.mats;
  const cen = cfg.cen || [-PZ, PZ], gap = cfg.gap || null, OW = cfg.openW, PASSY = FY + TK.PASS;
  // ---- vaults: the central one over the central hall, the side ones (the +x one split at the gap)
  S.mesh(vaultGeo(0, SPC, C, cfg.CB, cen[0] - 0.6, cen[1] + 0.6, 40), mats.vault);
  for (const sx of [-1, 1]) {
    const parts = sx > 0 && gap ? [[-PZ - 0.6, gap[0]], [gap[1], PZ + 0.6]] : [[-PZ - 0.6, PZ + 0.6]];
    for (const [a, b] of parts) S.mesh(vaultGeo(sx * CXS, SPS, RS, RS, a, b, 24), mats.sideVault);
  }
  // ---- the rows (arcade / pylons): extruded profiles with the openings; colliders between them
  const openZs = { '-1': [], '1': [] };
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? C : -PY, x1 = sx > 0 ? PY : -C, cut = sx > 0 ? cfg.cut : null, notch = sx > 0 ? cfg.notch : null;
    const zs = cfg.openZ.filter((z) => z - OW / 2 > cen[0] + 0.4 && z + OW / 2 < cen[1] - 0.4 && !(cut && z + OW / 2 > cut[0] - 1.0 && z - OW / 2 < cut[1] + 1.0) && !(notch && z + OW / 2 > notch[0] - 0.4 && z - OW / 2 < notch[1] + 0.4));
    openZs[sx] = zs;
    const holes = zs.map((z) => (cfg.arch ? archHole(z, OW / 2, -0.3, cfg.arch.spring, 12) : rectHole(z - OW / 2, z + OW / 2, -0.3, cfg.rect.top)));
    if (cut) holes.push(rectHole(cut[0], cut[1], -0.3, cut[2]));
    const prof = notch ? [[-PZ, -0.5], [PZ, -0.5], [PZ, H], [notch[1], H], [notch[1], notch[2]], [notch[0], notch[2]], [notch[0], H], [-PZ, H]] : [[-PZ, -0.5], [PZ, -0.5], [PZ, H], [-PZ, H]];
    const g = extrudeX(prof, x0, x1, holes); g.translate(0, FY, 0); S.group.add(new THREE.Mesh(g, mats.pylon));
    // colliders: the solid parts between the openings (the cut is closed by the stair walls of the caller; under the notch the row is lower)
    const iv = zs.map((z) => [z - OW / 2, z + OW / 2]); if (cut) iv.push([cut[0], cut[1]]); iv.sort((p, q) => p[0] - q[0]);
    let za = -PZ; const solid = []; for (const [a, b] of iv) { if (a > za + 0.01) solid.push([za, a]); za = Math.max(za, b); } if (PZ > za + 0.01) solid.push([za, PZ]);
    for (const [a, b] of solid) {
      if (notch && b > notch[0] && a < notch[1]) { if (notch[0] > a) S.col(x0, x1, FY - 1.2, FY + H, a, notch[0]); S.col(x0, x1, FY - 1.2, FY + notch[2], Math.max(a, notch[0]), Math.min(b, notch[1])); if (b > notch[1]) S.col(x0, x1, FY - 1.2, FY + H, notch[1], b); }
      else S.col(x0, x1, FY - 1.2, FY + H, a, b);
    }
  }
  // ---- floors: the central hall (pattern), the side platforms (plain granite), black edge strip + yellow line, walk boxes
  S.group.add(new THREE.Mesh(floorGeo(-C, C, cen[0] - 0.6, cen[1] + 0.6, FY, 1), mats.floor));
  for (const sx of [-1, 1]) S.group.add(new THREE.Mesh(floorGeo(sx > 0 ? C : -EDGE, sx > 0 ? EDGE : -C, -PZ, PZ, FY, 1), mats.side));
  S.bx(-EDGE, EDGE, BED, FY - 0.02, -PZ, PZ, M.concrete);
  S.walk(-C, C, cen[0] - 0.6, cen[1] + 0.6, FY, 1.1);
  for (const sx of [-1, 1]) S.walk(sx > 0 ? C : -EDGE, sx > 0 ? EDGE : -C, -PZ, PZ, FY, 1.1);
  for (const sx of [-1, 1]) {
    S.bx(sx > 0 ? EDGE - 0.7 : -EDGE, sx > 0 ? EDGE : -EDGE + 0.7, FY - 0.02, FY + 0.03, -PZ, PZ, M.black);
    S.bx(sx > 0 ? EDGE - 0.5 : -EDGE + 0.4, sx > 0 ? EDGE - 0.4 : -EDGE + 0.5, FY + 0.03, FY + 0.045, -PZ, PZ, M.yellow);
  }
  // ---- track beds, rails, contact rails
  const bedMat = ctx.mat.toon('#ffffff', { map: M.T.bed() });
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? EDGE : -WALL + 0.15, x1 = sx > 0 ? WALL - 0.15 : -EDGE;
    S.group.add(new THREE.Mesh(floorGeo(x0, x1, -PZ, PZ, BED, 1 / 4.75, true, 1 / 1.3), bedMat));
    S.bx(x0, x1, BED - 0.4, BED - 0.01, -PZ, PZ, M.concreteDark); S.walk(x0, x1, -PZ, PZ, BED + 0.12, 1.0);
    const tx = sx * TRK; for (const dx of [-0.76, 0.76]) S.bx(tx + dx - 0.04, tx + dx + 0.04, BED + 0.01, BED + 0.17, -PZ, PZ, M.railTop);
    const cx = tx + (sx > 0 ? 1.45 : -1.45); S.bx(cx - 0.07, cx + 0.07, BED + 0.01, BED + 0.13, -PZ, PZ, M.thirdRail); S.bx(cx - 0.12, cx + 0.12, BED + 0.13, BED + 0.17, -PZ, PZ, M.woodDark);
  }
  // ---- track walls (marble to the springing of the side vault, black base); colliders (the +x one lowered under the gap)
  for (const sx of [-1, 1]) {
    const g = extrudeX([[-PZ, 0], [PZ, 0], [PZ, SPS - BED], [-PZ, SPS - BED]], sx > 0 ? WALL - 0.15 : -WALL, sx > 0 ? WALL : -WALL + 0.15); g.translate(0, BED, 0); S.group.add(new THREE.Mesh(g, mats.track));
    S.bx(sx > 0 ? WALL - 0.2 : -WALL + 0.15, sx > 0 ? WALL - 0.15 : -WALL + 0.2, BED, FY + 0.45, -PZ, PZ, mats.black);
    const xa = sx > 0 ? WALL - 0.15 : -WALL - 1.0, xb = sx > 0 ? WALL + 1.0 : -WALL + 0.15;
    if (sx > 0 && gap) S.bx(WALL - 0.15, WALL, SPS - 0.02, PASSY - 0.3, gap[0], gap[1], mats.track);              // under the bridge: the wall up to its slab (the side vault is cut there)
    if (sx > 0 && gap) { S.col(xa, xb, BED - 1.2, FY + 8, -PZ, gap[0]); S.col(xa, xb, BED - 1.2, PASSY - 0.35, gap[0], gap[1]); S.col(xa, xb, BED - 1.2, FY + 8, gap[1], PZ); }
    else S.col(xa, xb, BED - 1.2, FY + 8, -PZ, PZ);
    for (const hh of [FY + 0.55, FY + 0.75]) { const fx = sx > 0 ? WALL - 0.17 : WALL * -1 + 0.17; S.bx(fx - (sx > 0 ? 0.07 : 0), fx + (sx > 0 ? 0 : 0.07), hh, hh + 0.06, -PZ + 1, PZ - 1, M.cable); }
  }
  // ---- the side-hall end walls with the tunnel mouths
  const circle = (cx, cy, r, n = 28) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(-i * 2 * Math.PI / n), cy + r * Math.sin(-i * 2 * Math.PI / n)]);
  const mouths = [];
  for (const zs of [-1, 1]) for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? PY : -WALL, x1 = sx > 0 ? WALL : -PY, z0 = zs > 0 ? PZ : -PZ - 0.6;
    const outl = [[x0, BED - 0.5], [x0, SPS], ...Array.from({ length: 23 }, (_, i) => { const t = Math.PI - (i + 1) * Math.PI / 24; return [sx * CXS + RS * Math.cos(t), SPS + RS * Math.sin(t)]; }), [x1, SPS], [x1, BED - 0.5]];
    S.group.add(new THREE.Mesh(extrudeZ(outl, z0, z0 + 0.6, [circle(sx * TRK, BED + TUBE_CY, TUBE_R + 0.02)]), mats.end || M.plasterWarm));
    S.col(x0, x1, BED - 1.2, FY + 8, z0, z0 + 0.6);
    mouths.push({ sx, zs });
  }
  // ---- the central end walls (an opening where a passage / the escalator hall leaves)
  for (const zs of [-1, 1]) {
    const z0 = zs > 0 ? cen[1] : cen[0] - 0.6, hole = zs > 0 ? cfg.endS : cfg.endN, top = SPC + cfg.CB + 0.3;
    const outl = [[-C, FY - 0.5], [-C, SPC], ...Array.from({ length: 23 }, (_, i) => { const t = Math.PI - (i + 1) * Math.PI / 24; return [C * Math.cos(t), SPC + (cfg.CB + 0.3) * Math.sin(t)]; }), [C, SPC], [C, FY - 0.5]];
    void top;
    const hp = hole ? (hole.rect ? rectHole(-hole.halfW, hole.halfW, FY, FY + hole.top) : archHole(0, hole.halfW, FY, FY + hole.spring, 14)) : null;
    S.group.add(new THREE.Mesh(extrudeZ(outl, z0, z0 + 0.6, hp ? [hp] : null), mats.end || M.plasterWarm));
    if (hole) { S.col(-C, -hole.halfW, FY - 1.2, FY + 12, z0, z0 + 0.6); S.col(hole.halfW, C, FY - 1.2, FY + 12, z0, z0 + 0.6); } else S.col(-C, C, FY - 1.2, FY + 12, z0, z0 + 0.6);
  }
  serviceStairs(ctx, M, S, { FY, BED, EDGE, zs: [-(PZ - 2.6), PZ - 2.6] });
  return { FY, BED, SPC, SPS, PZ, C, PY, EDGE, TRK, WALL, CXS, mouths, openZs, cen };
}

/** hall info for platform.js / ride.js */
const infoOf = (X, sh, openings) => ({ openings, FY: sh.FY, TRK: sh.TRK, EDGE: sh.EDGE, PZ: sh.PZ, mouth: sh.PZ + 0.6, discNeg: sh.PZ + 0.6 + X.STUB_VISIBLE, discPos: sh.PZ + 0.6 + X.STUB_VISIBLE, activeRadius: 260 });
/** the stubs of one end, or their deferral when that end gets a real tunnel (metro.js REAL_ENDS + metro/links-tekhnolog.js) */
function stubsAt(ctx, M, X, S, sh, zs, key) {
  const go = () => { for (const m of sh.mouths) if (m.zs === zs) X.buildStub(ctx, M, S, m.sx * sh.TRK, zs * (sh.PZ + 0.6), zs, sh.BED, {}); };
  if (key && X.realEnd && X.realEnd(key) && X.deferStub) X.deferStub(key, go); else go();
}
/** the plate between the end of a sheared escalator tube and a lower hall: the tube profile with an arched opening (escalator frame Se, plate from z1 - 0.5 to z1) */
function tubePlate(Se, M, A, FY, z1, halfW, mat) {
  const outl = [[-A, FY - 1.4], [-A, FY + 1.0]]; for (let i = 1; i < 36; i++) { const t = Math.PI - i * Math.PI / 36; outl.push([A * Math.cos(t), FY + 1.0 + 4.9 * Math.sin(t)]); } outl.push([A, FY + 1.0], [A, FY - 1.4]);
  Se.group.add(new THREE.Mesh(extrudeZ(outl, z1 - 0.5, z1, [archHole(0, halfW, FY, FY + 0.6, 14)]), mat || M.plasterWarm));
  for (const sx of [-1, 1]) Se.col(sx > 0 ? halfW : -A - 0.3, sx > 0 ? A + 0.3 : -halfW, FY - 1.2, FY + 6.2, z1 - 0.5, z1);
}

// ================================================================================================================================================ hall 1
export function buildTekhnolog1(ctx, M, X) {
  if (!FRAMES.tekhnolog || !ESC2.tekhnolog) return null;
  const { mat } = ctx, F = FRAMES.tekhnolog, FY = F.y, PZ = TK.PZ1, E = ESC2.tekhnolog, ti = textures(ctx, M), sg = makeSigns(ctx, M);
  const { C, PY, EDGE, WALL } = TI, PASS = TK.PASS, SW = TK.SW1, XS0 = TK.XS0, XS1 = TK.XS0 + TK.RUN, res = {};
  const S = new Space(ctx, F, { name: 'tekhnolog' }), k = S.k;
  const sy = (x) => Math.max(0, Math.min(PASS, (x - XS0) / TK.RUN * PASS));                                      // stair height above FY at local x
  const openZ = []; for (let z = -72; z <= 72.01; z += 6) openZ.push(z);
  const CUT = [-SW / 2 - 0.3, SW / 2 + 0.3, sy(C) + 3.0];
  const sh = hallShell(ctx, M, S, { FY, PZ, SPC: 5.6, CB: 3.0, cen: null, openZ, openW: 3.4, arch: { spring: 2.9 }, cut: CUT, gap: [CUT[0], CUT[1]],
    endN: { halfW: 3.8, top: 4.4, rect: true }, endS: null,
    mats: { pylon: ti.pier1, track: ti.track1, floor: ti.floor1, side: ti.side, vault: ti.vault1, sideVault: ti.sideVault, end: ti.pier1, black: ti.black } });
  res.sh = sh;
  stubsAt(ctx, M, X, S, sh, 1, null);                                   // SSW end: toward Baltiyskaya (no hall in this map)
  stubsAt(ctx, M, X, S, sh, -1, 'tekhnolog:-1');                        // NNE end: toward Pushkinskaya (real tunnel when that hall exists: links-tekhnolog.js)
  const info = infoOf(X, sh, { z0: 6, step: 12 });

  // ---- decoration: spandrel wreaths / medallions, bronze cornice with lamps, ribbed vault (texture), the skylight, floor bands
  {
    const piers = []; for (let z = -75; z <= 75.01; z += 6) piers.push(z);
    let mi = 0;
    for (const sx of [-1, 1]) for (const [i, z] of piers.entries()) {
      if (sx > 0 && Math.abs(z) < CUT[1] + 3.5) continue;
      const fx = sx * (C - 0.03), rot = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      if (i % 2 === 0) k.plane(1.25, 1.25, ti.T.wreath, [fx, FY + 4.0, z], [0, rot, 0]);
      else { k.cyl(0.46, 0.46, 0.06, M.bronzeDark, [fx - sx * 0.02, FY + 4.0, z], [0, 0, Math.PI / 2], 18); k.plane(0.86, 0.9, ti.T.medals[mi++ % ti.T.medals.length], [fx - sx * 0.06, FY + 4.0, z], [0, rot, 0]); }
    }
    // the bronze lattice cornice on both central faces + white glass vases (instanced), the band under it
    for (const sx of [-1, 1]) {
      const zs = sx > 0 ? [[-PZ + 0.3, CUT[0]], [CUT[1], PZ - 0.3]] : [[-PZ + 0.3, PZ - 0.3]];
      for (const [a, b] of zs) { S.mesh(quadX(sx * (C - 0.25), a, b, FY + 5.25, FY + 5.6, -sx), ti.cornice); S.bx(sx > 0 ? C - 0.27 : -C, sx > 0 ? C : -C + 0.27, FY + 5.18, FY + 5.25, a, b, M.bronzeDark); }
    }
    const spots = []; for (const sx of [-1, 1]) for (let z = -PZ + 1; z < PZ - 0.8; z += 1.4) { if (sx > 0 && z > CUT[0] - 0.2 && z < CUT[1] + 0.2) continue; spots.push([sx * (C - 0.18), FY + 5.82, z]); }
    const vase = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.07, 0.36, 8), M.lampWhite, spots.length), d = new THREE.Object3D();
    spots.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.updateMatrix(); vase.setMatrixAt(i, d.matrix); }); vase.instanceMatrix.needsUpdate = true; vase.userData.noBatch = true; vase.castShadow = false; vase.frustumCulled = false; S.group.add(vase);
    // the round glass skylight at the crown of the vault (z 0) in a bronze ring
    const crown = FY + 5.6 + 3.0;
    { const sk = new THREE.Mesh(new THREE.CircleGeometry(1.25, 32), ti.T.skylight); sk.rotation.x = Math.PI / 2; sk.position.set(0, crown - 0.04, 0); sk.castShadow = false; S.group.add(sk);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.09, 6, 32), M.bronze); ring.rotation.x = Math.PI / 2; ring.position.set(0, crown - 0.06, 0); S.group.add(ring); }
    // floor: lighter bands along the pier lines and round the skylight
    for (const sx of [-1, 1]) S.group.add(new THREE.Mesh(floorGeo(sx * 3.2 - 0.3, sx * 3.2 + 0.3, -PZ, PZ, FY + 0.006, 1), ti.band1));
    { const disc = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 32), ti.band1); disc.rotation.x = -Math.PI / 2; disc.position.set(0, FY + 0.007, 0); S.group.add(disc); }
    // side halls: lamp strips at the crown of the side vaults, cornice lamps over the platforms
    for (const sx of [-1, 1]) for (let z = -PZ + 5; z < PZ - 3; z += 6) { if (sx > 0 && z > CUT[0] - 1 && z < CUT[1] + 1) continue; k.box(1.3, 0.07, 0.45, M.lampWhite, [sx * sh.CXS, FY + 7.08, z]).castShadow = false; }
    // benches on the -x side of the central hall
    for (const z of [-48, -24, 24, 48]) { k.box(0.55, 0.45, 2.0, mat.toon('#cbbca6'), [-3.3, FY + 0.225, z]); k.box(0.58, 0.05, 2.05, M.woodDark, [-3.3, FY + 0.47, z]); S.col(-3.6, -3.0, FY, FY + 0.5, z - 1.0, z + 1.0); }
  }
  // ---- track walls: bronze letters, honeycomb door grilles, bands / schemes (signs kit)
  {
    const letters = mat.decal('#ffffff', { map: M.bronzeName('Технологический институт', 'ti1-bronze', { fill: '#5a4630' }) });
    for (const sx of [-1, 1]) {
      const fx = sx > 0 ? WALL - 0.17 : -WALL + 0.17, rotY = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      for (let z = -60; z <= 60; z += 30) k.plane(5.4, 0.42, letters, [fx, FY + 3.05, z], [0, rotY, 0]);
      for (let z = -45; z <= 45; z += 30) k.plane(1.1, 1.9, ti.grille1, [fx - sx * 0.02, FY + 1.0, z], [0, rotY, 0]);
      sg.trackBand(S, { x: fx, y: FY + 2.45, z0: -PZ + 2, z1: PZ - 2, rotY, line: '1', name: NAME1, nameEn: NAME1_EN, every: 12 });
      for (const z of [-15, 15]) sg.lineScheme(S, { x: fx, y: FY + 1.25, z, rotY, line: '1', currentId: 'tekhnolog', dir: sx > 0 ? -1 : 1, ahead: sg.aheadOf(rotY, sx > 0 ? -1 : 1), res: 0.5 });
    }
  }
  // ---- the +z (SSW) end wall: the network map and the name; the -z (NNE) end: forged gates beside the opening
  { sg.networkMap(S, { x: 0, y: FY + 1.8, z: PZ - 0.05, rotY: Math.PI, w: 1.6, res: 0.5 });
    k.plane(5.0, 0.5, mat.decal('#ffffff', { map: M.bronzeName('Технологический институт', 'ti1-bronze') }), [0, FY + 3.6, PZ - 0.04], [0, Math.PI, 0]);
    for (const sx of [-1, 1]) k.plane(1.9, 3.9, ti.grille1, [sx * 3.72, FY + 2.05, -PZ - 0.65 - 0.95], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); }       // the two leaves of the forged gates, folded back against the jambs

  // ---- hanging boards (signs kit)
  sg.hangBoard(S, { x: 0, y: FY + 4.3, z: -PZ + 5, rotY: 0, rodLen: 3.6, sections: [sg.sec.exit(EXIT_STREETS, 'u', true), sg.sec.rules('right')] });
  for (const z of [-40, 40]) sg.hangBoard(S, { x: 0, y: FY + 4.3, z, rotY: 0, rodLen: 3.6, sections: [sg.sec.trains('1', 1, 'l'), sg.sec.transfer({ to: 'tekhnolog2', line: '2', plain: true }, 'r'), sg.sec.trains('1', -1, 'r')] });
  sg.hangBoard(S, { x: C - 0.25, y: FY + 3.7, z: 0, rotY: -Math.PI / 2, rodLen: 0.2, sections: [sg.sec.trains('2', -1, 'u'), sg.sec.transfer({ to: 'tekhnolog2', line: '2' }, 'u'), sg.sec.trains('2', 1, 'u')] });

  // ---- the transfer stair: three flights between two pairs of fluted twin columns, from the central hall up over the side platform and the track to the landing (FY + PASS)
  {
    const stepMat = ti.steps, wallMat = ti.pier1, PY_ = FY + PASS;
    const prof = [...stepProfile(XS0, 1, TK.RUN, FY, PASS, TK.STEPS), [WALL, PY_], [WALL, PY_ - 0.3], [XS1, PY_ - 0.3], [EDGE, FY + sy(EDGE) - 0.3], [EDGE, FY]];
    S.group.add(new THREE.Mesh(extrudeZ(prof, -SW / 2, SW / 2), stepMat));
    S.mesh(floorGeo(XS1, WALL, -SW / 2, SW / 2, PY_ + 0.004, 1), M.corridorFloor);
    for (const x of [XS0 + 0.15, XS1 - 0.15]) { const y = FY + treadY(x - XS0, TK.RUN, PASS, TK.STEPS); S.bx(x - 0.12, x + 0.12, y + 0.002, y + 0.012, -SW / 2, SW / 2, M.yellow); }
    // the side walls of the stair tube (marble outside, seen from the side hall; up past the side vault) and the sloped ceiling inside
    const side = [[C, FY], [EDGE, FY], [EDGE, FY + sy(EDGE) - 0.35], [XS1, PY_ - 0.35], [WALL + 0.3, PY_ - 0.35], [WALL + 0.3, FY + 7.9], [C, FY + 7.9]];
    for (const sz of [-1, 1]) { const z0 = sz > 0 ? SW / 2 : -SW / 2 - 0.3; S.group.add(new THREE.Mesh(extrudeZ(side, z0, z0 + 0.3), wallMat)); S.col(C, WALL + 0.3, FY - 1.2, PY_ + 3.2, z0, z0 + 0.3); }
    const ceil = (x) => FY + sy(x) + 3.0, cp = [[C, ceil(C)], [XS1, PY_ + 3.0], [WALL + 0.3, PY_ + 3.0], [WALL + 0.3, PY_ + 3.15], [XS1, PY_ + 3.15], [C, ceil(C) + 0.15]];
    S.group.add(new THREE.Mesh(extrudeZ(cp, -SW / 2, SW / 2), ti.plaster));
    for (let x = C + 1.2; x < WALL; x += 2.4) { k.box(0.5, 0.06, 1.4, M.lampWhite, [x, Math.min(ceil(x), PY_ + 3.0) - 0.05, -1.6]).castShadow = false; k.box(0.5, 0.06, 1.4, M.lampWhite, [x, Math.min(ceil(x), PY_ + 3.0) - 0.05, 1.6]).castShadow = false; }
    // the twin columns (fluted marble, capitals, bases) carrying the lintel of the opening; handrails between the flights
    const xc = C + 0.45, base = FY + sy(xc), colH = CUT[2] - (base - FY);
    for (const zc of [-1.45, 1.45]) {
      for (const dz of [-0.3, 0.3]) { k.cyl(0.24, 0.24, colH, M.marbleWhite, [xc, base + colH / 2, zc + dz], null, 16); k.box(0.62, 0.22, 0.62, M.marbleWhite, [xc, base + colH - 0.11, zc + dz]); k.box(0.6, 0.18, 0.6, M.marbleWhite, [xc, base + 0.09, zc + dz]); }
      S.col(xc - 0.35, xc + 0.35, FY - 1.2, FY + CUT[2], zc - 0.62, zc + 0.62);
    }
    const ang = Math.atan2(PASS, TK.RUN), len = Math.hypot(PASS, TK.RUN);
    for (const zr of [-SW / 2 + 0.12, -1.45, 1.45, SW / 2 - 0.12]) k.cyl(0.03, 0.03, len, M.stainless, [(XS0 + XS1) / 2, FY + PASS / 2 + 0.95, zr], [0, 0, ang - Math.PI / 2], 6);
    // physics: the flight, the landing, the plate at the track wall (the passage is narrower than the stair)
    { const [cx, cz] = S.W((XS0 + XS1) / 2, 0); ctx.physics.addStairs(cx, cz, SW, TK.RUN, F.yaw + Math.PI / 2, FY, PY_, TK.STEPS); }
    S.walk(XS1 - 0.1, WALL + 0.35, -SW / 2, SW / 2, PY_, 0.3);
    for (const sz of [-1, 1]) { const a = sz > 0 ? TK.PW / 2 : -SW / 2 - 0.3, b = sz > 0 ? SW / 2 + 0.3 : -TK.PW / 2; S.bx(WALL, WALL + 0.3, PY_ - 0.35, FY + 7.9, a, b, ti.tile); S.col(WALL, WALL + 0.3, PY_ - 0.5, PY_ + 3.2, a, b); }
    S.bx(WALL, WALL + 0.3, PY_ + 3.0, FY + 7.9, -TK.PW / 2, TK.PW / 2, ti.tile);
    res.stair = { XS0, XS1, PY: PY_, SW };
  }

  // ---- the incline (4 lanes) and the trapezoid lower hall between its foot and the NNE end wall
  const Se = new Space(ctx, E.eframe, { name: 'tekhnolog-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, zTop: 0, zBottom: E.run, shellStart: 12, lanes: E.lanes, halfW: E.A });
  tubePlate(Se, M, E.A, FY, E.run, 4.0);
  {
    const zEnd = -PZ - 0.65, poly = [S.W(-4.0, zEnd), S.W(4.0, zEnd), Se.W(E.A, E.run + 0.05), Se.W(-E.A, E.run + 0.05)];
    const dIn = S.W(0, zEnd), dEsc = Se.W(0, E.run + 0.05);
    const room = buildPolyRoom(ctx, M, { id: 'tekhnolog-lower', poly, y0: FY, ceil: FY + 4.7, under: true, doors: [{ x: dIn[0], z: dIn[1], w: 7.6, h: 4.4, arch: false }, { x: dEsc[0], z: dEsc[1], w: 8.0, h: 4.4, arch: true }], doorSnap: 0.6,
      wallMat: ti.pier1, ceilMat: ti.plaster, floorMat: ti.floor1, colY: [FY - 1.5, FY + 5], lamps: { step: 2.6, mat: M.lampWhite, size: [1.2, 0.5], rot: -F.yaw } });
    S.walk(-4.4, 4.4, -PZ - 6.2, -PZ + 0.2, FY, 1.1); Se.walk(-E.A, E.A, E.run - 0.4, E.run + 6, FY, 1.1);
    // the attendant booth (blue glass) beside the foot
    { const [bx, bz] = Se.W(-E.A + 0.9, E.run + 1.6); const g = ctx.kit(room.group); g.box(1.2, 2.2, 1.6, mat.toon('#1b2e96', { transparent: true, opacity: 0.7 }), [bx, FY + 1.1, bz], [0, E.yaw, 0]); ctx.physics.addBox(bx, bz, 1.3, 1.7, E.yaw, FY - 0.5, FY + 2.3); }
    res.lower = room;
  }

  // ---- the station object
  const rt = X.rtOf('tekhnolog', X.net.tekhnolog, F, info, null);
  rt.platform = createPlatform(ctx, M, { id: 'tekhnolog', name: NAME1, nameEn: 'Tekhnologichesky Institut', frame: F, stock: 'baltiets', line: '1', idx: X.net.tekhnolog.idx }, info, X.protos, {
    onArrive: () => X.toast('Станция «Технологический институт». Переход на станцию «Технологический институт 2» Московско-Петроградской линии'),
  });
  X.stations.tekhnolog = rt;
  Object.assign(res, { S, Se, esc, E, rt, info, hall: sh });
  return res;
}

// ================================================================================================================================================ hall 2
export function buildTekhnolog2(ctx, M, X) {
  if (!FRAMES.tekhnolog2 || !ESC2.tekhnolog2 || TK.ZC2 === null) return null;
  const { mat } = ctx, F = FRAMES.tekhnolog2, FY = F.y, PZ = TK.PZ2, E = ESC2.tekhnolog2, ti = textures(ctx, M), sg = makeSigns(ctx, M);
  const { C, PY, WALL } = TI, PASS = TK.PASS, ZC = TK.ZC2, PW = TK.PW, SW = TK.SW2, res = {};
  const S = new Space(ctx, F, { name: 'tekhnolog2' }), k = S.k;
  const zTop = ZC + PW / 2, zA = zTop + TK.RUN, zB = zA + TK.CEN2, zFoot = PZ + TK.LOW2;                       // the stair from the landing (zTop) down to the central hall (zA); the central hall zA .. zB
  const PIT = 5.6, OW = 2.8, openZ = []; for (let i = 0; i < 11; i++) openZ.push(zA + 4.0 + i * PIT);              // 11 openings, end pylons 2.6 m
  const NOTCH = [ZC - PW / 2 - 0.3, ZC + PW / 2 + 0.3, PASS - 0.3];
  const sh = hallShell(ctx, M, S, { FY, PZ, SPC: 4.3, CB: 2.6, cen: [zA, zB], openZ, openW: OW, rect: { top: 3.6 }, notch: NOTCH, gap: [NOTCH[0], NOTCH[1]],
    endN: { halfW: SW / 2, spring: 3.4 }, endS: { halfW: 3.6, spring: 0.8 },
    mats: { pylon: ti.pylon2, track: ti.track2, floor: ti.floor2, side: ti.side, vault: ti.vault2, sideVault: ti.sideVault, end: ti.pylon2, black: ti.black } });
  res.sh = sh;
  stubsAt(ctx, M, X, S, sh, -1, null);                                  // SSW end: toward Moskovskiye Vorota (Frunzenskaya is closed since 2024)
  stubsAt(ctx, M, X, S, sh, 1, 'tekhnolog2:1');                         // NNE end: toward Sennaya (real tunnel when that hall exists)
  const zc = sh.openZs['-1'];
  const info = infoOf(X, sh, { z0: zc[0], step: PIT });

  // ---- decoration: the ledge with cove lights over the pylons, chronology letters and lit boxes on the pylon faces, side-hall lamps
  {
    for (const sx of [-1, 1]) {
      S.bx(sx > 0 ? C - 0.55 : -C, sx > 0 ? C : -C + 0.55, FY + 3.85, FY + 4.3, zA + 0.1, zB - 0.1, ti.ledge);
      S.bx(sx > 0 ? C - 0.45 : -C + 0.3, sx > 0 ? C - 0.3 : -C + 0.45, FY + 4.3, FY + 4.36, zA + 0.4, zB - 0.4, M.lampCool);
      for (let z = -PZ + 4; z < PZ - 3; z += 6) { if (sx > 0 && z > NOTCH[0] - 1 && z < NOTCH[1] + 1) continue; k.box(1.3, 0.07, 0.45, M.lampWhite, [sx * sh.CXS, FY + 7.08, z]).castShadow = false; }
    }
    // pylon faces toward the central hall: the letters at the top, a lit box (poster / map) below
    let ci = 0, pi = 0;
    for (const sx of [-1, 1]) {
      const fx = sx * (C - 0.03), rot = sx > 0 ? -Math.PI / 2 : Math.PI / 2, ps = []; let za = zA; for (const z of sh.openZs[sx]) { ps.push((za + z - OW / 2) / 2); za = z + OW / 2; } ps.push((za + zB) / 2);
      for (const [i, z] of ps.entries()) {
        k.plane(2.6, 0.95, ti.T.chrono[ci++ % ti.T.chrono.length], [fx, FY + 3.25, z], [0, rot, 0]);
        if (i % 3 === 1) sg.networkMap(S, { x: fx, y: FY + 1.55, z, rotY: rot, w: 1.2, res: 0.5, lit: true });
        else { k.box(0.08, 1.85, 1.25, M.steelBlack, [fx - sx * 0.04, FY + 1.55, z]); k.plane(1.15, 1.75, ti.T.posters[pi++ % ti.T.posters.length], [fx - sx * 0.085, FY + 1.55, z], [0, rot, 0]); }
      }
    }
  }
  // ---- track walls: blue band names (signs kit), bronze letters, plain dark doors, line schemes
  {
    const letters = mat.decal('#ffffff', { map: M.bronzeName('Технологический институт', 'ti2-bronze', { fill: '#3a3226' }) });
    for (const sx of [-1, 1]) {
      const fx = sx > 0 ? WALL - 0.17 : -WALL + 0.17, rotY = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      for (let z = -55; z <= 55; z += 27.5) k.plane(5.2, 0.4, letters, [fx, FY + 3.05, z], [0, rotY, 0]);
      for (let z = -40; z <= 60; z += 25) { if (sx > 0 && Math.abs(z - ZC) < 5) continue; k.plane(1.0, 1.9, ti.door2, [fx - sx * 0.02, FY + 0.95, z], [0, rotY, 0]); }
      sg.trackBand(S, { x: fx, y: FY + 2.45, z0: -PZ + 2, z1: PZ - 2, rotY, line: '2', name: NAME2, nameEn: NAME2_EN, every: 12 });
      for (const z of [-40, 30]) sg.lineScheme(S, { x: fx, y: FY + 1.25, z, rotY, line: '2', currentId: 'tekhnolog2', dir: sx > 0 ? -1 : 1, ahead: sg.aheadOf(rotY, sx > 0 ? -1 : 1), res: 0.5 });
    }
  }
  // ---- hanging boards: at the stair (photo 14: «Парнас ← | Проспект Ветеранов M1 Купчино M2 ↑ | Девяткино →», here: line 2 both ways + the transfer up the stair), mid hall, the exit end
  sg.hangBoard(S, { x: 0, y: FY + 4.6, z: zA + 2.0, rotY: 0, rodLen: 1.8, sections: [sg.sec.trains('2', 1, 'l'), sg.sec.transfer({ to: 'tekhnolog', line: '1' }, 'u'), sg.sec.trains('2', -1, 'r')] });
  sg.hangBoard(S, { x: 0, y: FY + 4.6, z: (zA + zB) / 2, rotY: 0, rodLen: 1.8, sections: [sg.sec.trains('2', 1, 'l'), sg.sec.trains('2', -1, 'r')] });
  sg.hangBoard(S, { x: 0, y: FY + 4.6, z: zB - 4, rotY: Math.PI, rodLen: 1.8, sections: [sg.sec.exit(EXIT_STREETS, 'u', true), sg.sec.transfer({ to: 'tekhnolog', line: '1', plain: true }, 'l')] });

  // ---- the transfer: the axial stair at the SSW end of the central hall, the landing, the bridge over the +x side hall and its track
  {
    const PY_ = FY + PASS, CEIL = PY_ + 3.0, x0 = -SW / 2, x1 = SW / 2;
    S.group.add(new THREE.Mesh(extrudeX([...stepProfile(zA, -1, TK.RUN, FY, PASS, TK.STEPS), [zTop, FY]], x0, x1), ti.steps));
    for (const z of [zA - 0.15, zTop + 0.15]) { const y = FY + treadY(zA - z, TK.RUN, PASS, TK.STEPS); S.bx(x0, x1, y + 0.002, y + 0.012, z - 0.12, z + 0.12, M.yellow); }
    S.bx(x0, WALL + 0.3, PY_ - 0.35, PY_ - 0.002, ZC - PW / 2 - 0.3, ZC + PW / 2 + 0.3, ti.plaster);                    // the landing / bridge slab
    S.mesh(floorGeo(x0, WALL + 0.3, ZC - PW / 2, ZC + PW / 2, PY_ + 0.004, 1), M.corridorFloor);
    // walls: the far wall (newspaper kiosk), the near wall of the bridge, the stair sides; the ceiling over all of it
    const far = [[x0 - 0.3, FY], [PY, FY], [PY, PY_ - 0.35], [WALL + 0.3, PY_ - 0.35], [WALL + 0.3, FY + 7.9], [x0 - 0.3, FY + 7.9]];
    const near = [[x1, FY], [PY, FY], [PY, PY_ - 0.35], [WALL + 0.3, PY_ - 0.35], [WALL + 0.3, FY + 7.9], [x1, FY + 7.9]];
    S.group.add(new THREE.Mesh(extrudeZ(far, ZC - PW / 2 - 0.3, ZC - PW / 2), ti.tile)); S.group.add(new THREE.Mesh(extrudeZ(near, ZC + PW / 2, ZC + PW / 2 + 0.3), ti.tile));
    S.group.add(new THREE.Mesh(extrudeX([[ZC - PW / 2 - 0.3, FY], [zA - 0.6, FY], [zA - 0.6, CEIL + 0.15], [ZC - PW / 2 - 0.3, CEIL + 0.15]], x0 - 0.3, x0), ti.tile));
    S.group.add(new THREE.Mesh(extrudeX([[ZC + PW / 2, FY], [zA - 0.6, FY], [zA - 0.6, CEIL + 0.15], [ZC + PW / 2, CEIL + 0.15]], x1, x1 + 0.3), ti.tile));
    S.bx(x0 - 0.3, WALL + 0.3, CEIL, CEIL + 0.15, ZC - PW / 2 - 0.3, ZC + PW / 2 + 0.3, ti.plaster); S.bx(x0 - 0.3, x1 + 0.3, CEIL, CEIL + 0.15, ZC + PW / 2, zA - 0.6, ti.plaster);
    for (let z = ZC + PW / 2 + 1.2; z < zA - 0.8; z += 2.0) k.box(1.6, 0.06, 0.5, M.lampWhite, [0, CEIL - 0.04, z]).castShadow = false;
    for (let x = x0 + 1.4; x < WALL; x += 2.4) k.box(0.5, 0.06, 1.4, M.lampWhite, [x, CEIL - 0.04, ZC]).castShadow = false;
    k.box(2.4, 2.4, 1.0, M.kiosk, [x0 + 1.5, PY_ + 1.2, ZC - PW / 2 + 0.5]); S.col(x0 + 0.3, x0 + 2.7, PY_ - 0.2, PY_ + 2.4, ZC - PW / 2, ZC - PW / 2 + 1.0);
    const ang = Math.atan2(PASS, TK.RUN), len = Math.hypot(PASS, TK.RUN);
    for (const xr of [x0 + 0.12, 0, x1 - 0.12]) k.cyl(0.03, 0.03, len, M.stainless, [xr, FY + PASS / 2 + 0.95, (zA + zTop) / 2], [ang - Math.PI / 2, 0, 0], 6);
    // physics
    { const [cx, cz] = S.W(0, (zA + zTop) / 2); ctx.physics.addStairs(cx, cz, SW, TK.RUN, F.yaw + Math.PI, FY, PY_, TK.STEPS); }
    S.walk(x0, WALL + 0.35, ZC - PW / 2, ZC + PW / 2, PY_, 0.3);
    S.col(x0 - 0.3, WALL + 0.3, PY_ - 0.5, PY_ + 3.2, ZC - PW / 2 - 0.3, ZC - PW / 2); S.col(x1, WALL + 0.3, PY_ - 0.5, PY_ + 3.2, ZC + PW / 2, ZC + PW / 2 + 0.3);
    S.col(x0 - 0.3, x0, FY - 1.2, PY_ + 3.2, ZC - PW / 2 - 0.3, zA - 0.6); S.col(x1, x1 + 0.3, FY - 1.2, PY_ + 3.2, ZC + PW / 2, zA - 0.6);
    // the board over the top of the stair, toward the passage (seen when coming from hall 1: down to the line-2 trains)
    sg.hangBoard(S, { x: 0, y: PY_ + 2.55, z: zTop + 0.4, rotY: Math.PI, rodLen: 0.1, sections: [sg.sec.trains('2', 1, 'l'), sg.sec.trains('2', -1, 'r')] });
    res.stair = { zA, zTop, PY: PY_, SW };
  }

  // ---- the incline (3 lanes, axial) from the lower hall behind the NNE end of the central hall
  lowerHall(ctx, M, S, { A: E.A, FY, z0: zB + 0.5, z1: zFoot + 0.7, floorMat: ti.floor2 });
  const Se = new Space(ctx, E.eframe, { name: 'tekhnolog2-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, zTop: 0, zBottom: E.run, shellStart: 12, lanes: E.lanes, halfW: E.A });
  for (let z = zB + 3; z < zFoot; z += 3) k.box(1.4, 0.06, 0.5, M.lampWhite, [0, FY + 5.6, z]).castShadow = false;

  // ---- the station object
  const rt = X.rtOf('tekhnolog2', X.net.tekhnolog2, F, info, null);
  rt.platform = createPlatform(ctx, M, { id: 'tekhnolog2', name: NAME2, nameEn: 'Tekhnologichesky Institut 2', frame: F, stock: '717-l2', line: '2', idx: X.net.tekhnolog2.idx }, info, X.protos, {
    onArrive: () => X.toast('Станция «Технологический институт 2». Переход на станцию «Технологический институт» Кировско-Выборгской линии'),
  });
  X.stations.tekhnolog2 = rt;
  Object.assign(res, { S, Se, esc, E, rt, info, hall: sh, zA, zB, zFoot });
  return res;
}


/** the shared materials / textures of both halls and the hub (memoised on M) */
export const tekhMats = (ctx, M) => textures(ctx, M);
