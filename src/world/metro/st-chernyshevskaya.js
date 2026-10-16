// metro/st-chernyshevskaya.js — Chernyshevskaya (line 1, -70 m, 1 Sep 1958; incline and vestibule rebuilt 2022-24): docs/research/metro-east.md section 7, photos refs/east che-01 .. che-28.
//   hall       three-vault PYLON station with a SHORTENED central hall (52.6 m, data/metro-chernyshevskaya.js CH_ZA .. CH_ZB, the dossier's recommendation: it starts at the incline foot) and two full
//              length side halls (8 cars). The engine's pylon hall (hall-pylon.js, `central`, `plain`) carries the structure; this file replaces its arched pylon openings by the RECTANGULAR openings of
//              the photos and dresses the station (DEVIATION from the dossier, section 7: the side halls run the whole 165 m, PZ 82.5, instead of ~100 m from the incline foot to the OSM south end;
//              an 8-car train needs the full length): grey-green marble with dark swirling veins on the pylons, stainless ventilation grilles at head height, a marble cornice band with a white lip and
//              the LED tubes of 2017, glowing half-oval lunettes in the vault over every opening (no chandeliers: the first Leningrad station without lamps), the black / cream granite checker floor;
//              the side halls: a long louvre strip and the red line band on the platform faces of the pylon rows, white 15 cm tile over a black polished band on the track walls, a grey marble
//              cornice, letter-spaced CHROME capitals «ЧЕРНЫШЕВСКАЯ» over the red band, line schemes below it, a comb of black granite rectangles along the pylon walls.
//   incline    4 lanes (KTP-5 since July 2024), axial: from the north end of the central hall (marble arch, a 12 m lower hall) to the vestibule. Modelled 70 m rise / 140 m slope (platform -70); the
//              real record 65.8 m / 131.6 m is ESC2.chernyshevskaya.recordRise / recordLen (DEPTH note in data/metro-chernyshevskaya.js; CH_FOOT_Y above the platform adds a stair in the lower hall)
//   vestibule  INSIDE the pavilion w22999175 (pr. Chernyshevskogo 20, drawn by landmarksNorth): a ticket hall with pale stone blocks over a dark marble dado, a white shelf with brass torch sconces,
//              the glazed west front seen from inside, the entrance (west) and exit (north) doorways, a row of 16 turnstiles, glass partitions, ticket machines, the parapet round the shaft mouth.
// Static geometry only (no per-frame work besides the escalator kit), textures shared by key ('che-*'); wayfinding through metro/signs.js. No flags, no alarm sounds.
import * as THREE from 'three';
import { FRAMES, ESC2, DOORWAYS, toWorld } from '../data/metro.js';
import { CH_PZ, CH_ZA, CH_ZB, CH_PIT, CH_OW, CH_OH, CH_BLDG, CH_FOOT, CH_STREETS } from '../data/metro-chernyshevskaya.js';
import { Space, extrudeZ, extrudeX, archRing, floorGeo, wallGeoZ } from './lib.js';
import { buildPylonHall, PYLON } from './hall-pylon.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { createPlatform } from './platform.js';
import { turnstile } from './st-nevsky.js';
import { insetPoly, ringOf, lowerHall, shaftParapet } from './petro-kit.js';
import { sharedFloor } from './hall-vault.js';
import { makeSigns } from './signs.js';

const SERIF = '"Noto Serif","Times New Roman",serif', FONT = '"Rubik","Noto Sans",sans-serif', HAIR = String.fromCharCode(8202);
const ID = 'chernyshevskaya', NAME = 'Чернышевская', NAME_EN = 'Chernyshevskaya', LINE = '1';

/** a horizontal strip whose u runs 0..1 ACROSS (x) and v = z / vLen along the hall (a pattern that must keep its phase across the strip on both sides) */
function stripGeo(x0, x1, z0, z1, y, vLen) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, z0 / vLen, 1, z0 / vLen, 1, z1 / vLen, 0, z1 / vLen], 2));
  g.setIndex([0, 2, 1, 0, 3, 2]);
  return g;
}

// ---------------------------------------------------------------- textures (all keyed 'che-*', uv in metres unless noted)
function textures(ctx, M) {
  const { tex } = ctx, T = {};
  // pylon marble: blocks 1.2 x 0.8 m (2 x 3 per 2.4 m tile, staggered), grey with a green-violet cast, dark swirling veins and pale streaks (photos che-05, che-16, che-19)
  T.marble = M.rep(tex.draw(512, 512, (g, w, h) => {
    const r = ctx.rng('che-marble'), cw = w / 2, ch = h / 3;
    for (let j = 0; j < 3; j++) for (let i = -1; i < 2; i++) {
      const x = i * cw + (j % 2) * cw / 2, y = j * ch;
      g.save(); g.beginPath(); g.rect(x, y, cw, ch); g.clip();
      g.fillStyle = ['#a3a6a2', '#9a9d9a', '#aaaca8', '#979a99'][(r() * 4) | 0]; g.fillRect(x, y, cw, ch);
      const ang = -0.6 + r() * 1.2;
      for (let q = 0; q < 26; q++) {                                                                   // dark bands that swirl across the block
        g.strokeStyle = r() < 0.7 ? `rgba(62,70,68,${0.18 + r() * 0.3})` : `rgba(96,88,104,${0.15 + r() * 0.2})`; g.lineWidth = 1 + r() * 5;
        let px = x + r() * cw, py = y + r() * ch; g.beginPath(); g.moveTo(px, py);
        for (let s = 0; s < 6; s++) { const a = ang + Math.sin(s * 1.3 + q) * 0.9; px += Math.cos(a) * 28; py += Math.sin(a) * 18; g.lineTo(px, py); }
        g.stroke();
      }
      for (let q = 0; q < 10; q++) { g.strokeStyle = `rgba(232,236,232,${0.18 + r() * 0.25})`; g.lineWidth = 1 + r() * 2; g.beginPath(); let px = x + r() * cw, py = y + r() * ch; g.moveTo(px, py); for (let s = 0; s < 4; s++) { px += (r() - 0.3) * 40; py += (r() - 0.5) * 24; g.lineTo(px, py); } g.stroke(); }
      g.restore();
    }
    g.strokeStyle = 'rgba(55,58,58,0.45)'; g.lineWidth = 1.5;
    for (let j = 0; j <= 3; j++) { g.beginPath(); g.moveTo(0, j * ch); g.lineTo(w, j * ch); g.stroke(); }
    for (let j = 0; j < 3; j++) for (let i = 0; i <= 2; i++) { const x = (i * cw + (j % 2) * cw / 2) % w; g.beginPath(); g.moveTo(x, j * ch); g.lineTo(x, (j + 1) * ch); g.stroke(); }
  }, { key: 'che-marble' }), 1 / 2.4, 1 / 2.4);
  // track wall, 1.2 m x 4.7 m (track bed .. side-vault spring): black polished band to platform + 0.8, white 15 cm tile, a steel line, the grey marble cornice (photos che-18, che-22)
  T.track = M.rep(tex.draw(128, 512, (g, w, h) => {
    const r = ctx.rng('che-track'), Y = (m) => h - m / 4.7 * h;                                        // metres above the track bed -> canvas y
    g.fillStyle = '#1c1c20'; g.fillRect(0, Y(1.9), w, h - Y(1.9));
    for (let i = 0; i < 2; i++) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(i * w / 2 + 3, Y(1.85), w / 2 - 6, Y(0.05) - Y(1.85)); }
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, Y(1.9), w, 2);
    g.fillStyle = '#f0f0ec'; g.fillRect(0, Y(4.4), w, Y(1.9) - Y(4.4));
    const tp = w / 8;
    for (let y = Y(1.9); y > Y(4.4); y -= tp) for (let i = 0; i < 8; i++) { const v = (r() - 0.5) * 10; g.fillStyle = `rgba(${v > 0 ? 255 : 120},${v > 0 ? 255 : 125},${v > 0 ? 255 : 130},${Math.abs(v) / 100})`; g.fillRect(i * tp, y - tp, tp, tp); }
    g.strokeStyle = 'rgba(140,146,152,0.55)'; g.lineWidth = 1;
    for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * tp, Y(4.4)); g.lineTo(i * tp, Y(1.9)); g.stroke(); }
    for (let y = Y(1.9); y > Y(4.4); y -= tp) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#8f9291'; g.fillRect(0, 0, w, Y(4.4));
    for (let q = 0; q < 14; q++) { g.strokeStyle = `rgba(${r() < 0.5 ? '235,238,236' : '70,76,80'},0.35)`; g.lineWidth = 1 + r() * 2; g.beginPath(); let px = r() * w, py = r() * Y(4.4); g.moveTo(px, py); for (let s = 0; s < 4; s++) { px += 20 + r() * 30; py += (r() - 0.5) * 12; g.lineTo(px, py); } g.stroke(); }
    g.fillStyle = '#c5cacf'; g.fillRect(0, Y(4.4) - 2, w, 3);
  }, { key: 'che-track' }), 1 / 1.2, 1 / 4.7);
  // central-hall checker: 0.9 m (across) x 0.6 m (along) rectangles of black and cream-grey granite; one tile = 1.8 x 1.2 m; floorGeo uv = metres x 0.5
  T.checker = M.rep(tex.draw(256, 256, (g, w, h) => {
    const r = ctx.rng('che-checker');
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const dark = (i + j) % 2 === 0; g.fillStyle = dark ? '#2b2b2e' : '#c2bda8'; g.fillRect(i * w / 2, j * h / 2, w / 2, h / 2);
      for (let q = 0; q < 220; q++) { g.fillStyle = dark ? 'rgba(200,200,205,0.18)' : 'rgba(60,55,45,0.18)'; g.fillRect(i * w / 2 + r() * w / 2, j * h / 2 + r() * h / 2, 1 + r() * 2, 1 + r() * 2); }
    }
    g.strokeStyle = 'rgba(30,30,30,0.35)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  }, { key: 'che-checker' }), 2 / 1.8, 2 / 1.2);
  // the comb along the pylon walls of the side platforms: black rectangles 1.0 m long on cream, u = across the 0.9 m strip, v = 1.3 m along
  T.comb = M.rep(tex.draw(128, 256, (g, w, h) => { g.fillStyle = '#c4bfab'; g.fillRect(0, 0, w, h); g.fillStyle = '#26262a'; g.fillRect(w * 0.12, 0, w * 0.76, h * 1.0 / 1.3); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(w * 0.12, 4, w * 0.76, 3); }, { key: 'che-comb' }), 1, 1);
  // louvres (horizontal bars only: the plane may stretch along z) and the framed ventilation grille of the central-hall pylon faces
  T.louvre = tex.draw(64, 64, (g, w, h) => { g.fillStyle = '#25272b'; g.fillRect(0, 0, w, h); for (let y = 2; y < h; y += 8) { g.fillStyle = '#c9cdd1'; g.fillRect(0, y, w, 3); g.fillStyle = '#7d8288'; g.fillRect(0, y + 3, w, 1); } }, { key: 'che-louvre' });
  T.grille = tex.draw(256, 128, (g, w, h) => {
    g.fillStyle = '#d6dadd'; g.fillRect(0, 0, w, h); g.fillStyle = '#9da3a8'; g.fillRect(9, 9, w - 18, h - 18); g.fillStyle = '#22252a'; g.fillRect(14, 14, w - 28, h - 28);
    for (let y = 18; y < h - 16; y += 8) { g.fillStyle = '#c4c8cc'; g.fillRect(16, y, w - 32, 3); g.fillStyle = '#6f757b'; g.fillRect(16, y + 3, w - 32, 1); }
    for (const x of [w / 3, 2 * w / 3]) { g.fillStyle = '#9da3a8'; g.fillRect(x - 2, 14, 4, h - 28); }
  }, { key: 'che-grille' });
  // chrome capitals on white tile (photo che-22): letter-spaced serif, a light-dark-light gradient, a thin dark outline and a soft shadow
  T.letters = tex.draw(1024, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    const t = [...NAME.toUpperCase()].join(HAIR + HAIR + HAIR + HAIR + HAIR + HAIR);
    g.fillStyle = 'rgba(40,44,50,0.28)'; tex.fitText(g, t, w / 2 + 3, h / 2 + 4, w - 30, 92, SERIF, 500);
    const gr = g.createLinearGradient(0, h * 0.15, 0, h * 0.85); gr.addColorStop(0, '#fbfcfd'); gr.addColorStop(0.45, '#9ba2aa'); gr.addColorStop(0.55, '#7f868e'); gr.addColorStop(1, '#e4e8ec');
    g.fillStyle = gr; tex.fitText(g, t, w / 2, h / 2, w - 30, 92, SERIF, 500, { stroke: 2, strokeStyle: '#4c535b' });
  }, { key: 'che-letters' });
  // the wrought-iron grille of the ticket-machine alcove in the south end wall and of the service doors in the track walls
  T.iron = tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#3b3835'; g.fillRect(0, 0, w, h); g.strokeStyle = '#131314'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.lineWidth = 5; for (let x = 30; x < w - 20; x += 28) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, h - 10); g.stroke(); }
    g.lineWidth = 6; g.beginPath(); g.moveTo(10, h * 0.32); g.lineTo(w - 10, h * 0.32); g.moveTo(10, h * 0.7); g.lineTo(w - 10, h * 0.7); g.stroke();
    g.lineWidth = 4; for (const cx of [w * 0.3, w * 0.7]) { g.beginPath(); g.arc(cx, h * 0.51, 26, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(cx, h * 0.51, 12, Math.PI, Math.PI * 2.6); g.stroke(); }
  }, { key: 'che-iron' });
  // ticket hall walls, 2.7 m x 6 m (v = height above the floor): dark brown-black marble dado to 1.5 m, a brass line, pale pinkish stone blocks 0.9 x 0.45 m above (photo che-28)
  T.vwall = M.rep(tex.draw(256, 512, (g, w, h) => {
    const r = ctx.rng('che-vwall'), Y = (m) => h - m / 6 * h, bw = w / 3, bh = h / 6 * 0.45;
    g.fillStyle = '#e1d3c6'; g.fillRect(0, 0, w, Y(1.5));
    for (let j = 0; Y(1.5) - (j + 1) * bh > -bh; j++) for (let i = -1; i < 3; i++) { const x = i * bw + (j % 2) * bw / 2, y = Y(1.5) - (j + 1) * bh; g.fillStyle = ['#e3d5c8', '#dccbbd', '#e7dacd', '#d8c9bc'][(r() * 4) | 0]; g.fillRect(x + 1, y + 1, bw - 2, bh - 2); }
    g.fillStyle = '#2e2826'; g.fillRect(0, Y(1.5), w, h - Y(1.5));
    for (let q = 0; q < 26; q++) { g.strokeStyle = `rgba(225,215,205,${0.12 + r() * 0.25})`; g.lineWidth = 1 + r() * 1.5; g.beginPath(); let px = r() * w, py = Y(1.5) + r() * (h - Y(1.5)); g.moveTo(px, py); for (let s = 0; s < 4; s++) { px += (r() - 0.3) * 50; py += (r() - 0.5) * 30; g.lineTo(px, py); } g.stroke(); }
    for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(i * bw, Y(1.5), 2, h - Y(1.5)); }
    g.fillStyle = '#c8a64a'; g.fillRect(0, Y(1.5) - 3, w, 5);
  }, { key: 'che-vwall' }), 1 / 2.7, 1 / 6);
  // the glazed west front seen from inside: 1.5 m bays, transoms at 3.4 / 5.2 m, daylight panes (v = height 0..6 m)
  T.glaze = M.rep(tex.draw(128, 512, (g, w, h) => {
    const Y = (m) => h - m / 6 * h, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#dfe9f0'); gr.addColorStop(1, '#b7c8d3');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#2f3438'; g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h);
    for (const m of [0.4, 3.4, 5.2]) g.fillRect(0, Y(m) - 5, w, 9);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(20, Y(3.2)); g.lineTo(46, Y(3.2)); g.lineTo(96, Y(0.6)); g.lineTo(70, Y(0.6)); g.closePath(); g.fill();
  }, { key: 'che-glaze' }), 1 / 1.5, 1 / 6);
  // the 2024 name format of the vestibule: a light box, white letters on black
  T.nameBox = tex.draw(768, 120, (g, w, h) => { g.fillStyle = '#121214'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, NAME, w / 2, h * 0.42, w - 60, 64, FONT, 700); g.globalAlpha = 0.85; tex.fitText(g, NAME_EN, w / 2, h * 0.8, w - 60, 26, FONT, 400); g.globalAlpha = 1; }, { key: 'che-namebox' });
  return T;
}

export function buildChernyshevskaya(ctx, M, X) {
  const { mat, physics } = ctx;
  const F = FRAMES.chernyshevskaya, E = ESC2.chernyshevskaya, FY = F.y, PZ = CH_PZ, zA = CH_ZA, zB = CH_ZB, PIT = CH_PIT, OW = CH_OW, OH = CH_OH, res = {};
  const { C, PY, EDGE, TRK, WALL, RS } = PYLON, SPC = FY + 4.0, SPS = FY + 3.6, CXS = (PY + WALL) / 2, A = E.A;
  const T = textures(ctx, M), sg = makeSigns(ctx, M);
  const marble = mat.toon('#ffffff', { map: T.marble }), checker = mat.toon('#ffffff', { map: T.checker, polygonOffset: -2 }), vault = mat.toon('#f2f1ec', { side: 'double' });
  const steel = M.stainless, lunette = mat.emissive('#f4f2ea', 1.05, { side: 'double' }), ledge = mat.toon('#f3f1ea');

  // ================================================================ the hall (engine structure, plain: the dressing below)
  const S = new Space(ctx, F, { name: 'chernyshevskaya' }), k = S.k;
  const hall = buildPylonHall(ctx, M, S, { id: 'che', FY, PZ, name: NAME, nameEn: NAME_EN, plain: true, noMeander: true, central: [zA, zB], pitch: PIT, openW: OW,
    pylonMat: marble, floorMat: sharedFloor(ctx, M, '#e4e2dc'), trackMat: mat.toon('#ffffff', { map: T.track }), vaultMat: vault, endHole: { N: { halfW: 4.0, spring: 1.5 } } });
  const openZc = hall.openZc;
  // RECTANGULAR openings (photos che-05 / che-16): the arched pylon rows of hall-pylon.js are re-extruded with the same profile and openings (its colliders already leave the full width free)
  {
    const prof = [[-PZ, -0.5], [PZ, -0.5], [PZ, 4.0], [-PZ, 4.0]], holes = openZc.map((z) => [[z - OW / 2, -0.3], [z + OW / 2, -0.3], [z + OW / 2, OH], [z - OW / 2, OH]]);
    for (const m of S.group.children.slice()) {
      if (!m.isMesh || m.material !== hall.pylonMat) continue;
      m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox; if (bb.max.z - bb.min.z < 20) continue;
      const sx = bb.max.x + bb.min.x > 0 ? 1 : -1, g = extrudeX(prof, sx > 0 ? C : -PY, sx > 0 ? PY : -C, holes); g.translate(0, FY, 0);
      m.geometry.dispose(); m.geometry = g;
    }
  }
  // the stubs: both ends; the +z end gets the real tunnel to Vosstaniya (metro/links-north.js) when metro.js lists 'chernyshevskaya:1' as a real end
  for (const m of hall.mouths) {
    const key = ID + ':' + m.zs, f = () => X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, hall.BED, {});
    if (X.realEnd && X.deferStub && X.realEnd(key)) X.deferStub(key, f); else f();
  }
  const vInfo = { openings: hall.openings, FY, TRK, EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + X.STUB_VISIBLE, discPos: PZ + 0.6 + X.STUB_VISIBLE, activeRadius: 260 };

  // ---------------------------------------------------------------- central hall: floor, pylon faces, cornice, lunettes, end walls
  const nofx = (m) => { m.castShadow = false; return m; };
  S.group.add(new THREE.Mesh(floorGeo(-C + 0.01, C - 0.01, zA, zB, FY + 0.008, 0.5), checker));
  for (const sx of [-1, 1]) for (const z of openZc) S.group.add(new THREE.Mesh(floorGeo(sx > 0 ? C : -PY, sx > 0 ? PY : -C, z - OW / 2, z + OW / 2, FY + 0.008, 0.5), checker));
  // pylon segments of the central hall (between the openings and at both ends): a framed stainless grille at head height on the face toward the axis
  const segs = []; { let z0 = zA; for (const z of openZc) { segs.push([z0, z - OW / 2]); z0 = z + OW / 2; } segs.push([z0, zB]); }
  const grilleMat = mat.toon('#ffffff', { map: T.grille });
  for (const sx of [-1, 1]) for (const [a, b] of segs) nofx(k.plane(Math.min(1.6, b - a - 0.8), 0.72, grilleMat, [sx * (C - 0.012), FY + 2.6, (a + b) / 2], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]));
  // the cornice band over the openings ends in a white lip at FY + 4.0; the LED tubes of 2017 stand on it; the vault lunettes glow over every opening
  {
    const tubes = [], half = new THREE.CircleGeometry(1.5, 18, 0, Math.PI);
    for (const sx of [-1, 1]) {
      S.bx(sx > 0 ? C - 0.42 : -C, sx > 0 ? C : -C + 0.42, FY + 3.94, FY + 4.03, zA + 0.05, zB - 0.05, ledge);              // (the warm cove strip of hall-pylon.js lies on it at C - 0.21 .. C - 0.07)
      for (let z = zA + 1.6; z < zB - 1.0; z += 2.2) tubes.push([sx * (C - 0.33), FY + 4.065, z]);
      for (const z of openZc) { const ln = k.mesh(half, lunette, [sx * (C - 0.05), SPC + 0.15, z]); ln.rotation.set(0.21, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 'YXZ'); nofx(ln); ln.receiveShadow = false; }
    }
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.06, 1.5), M.lampCool, tubes.length), d = new THREE.Object3D();
    tubes.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.instanceMatrix.needsUpdate = true; im.castShadow = false; S.group.add(im);
  }
  // north end: the broad marble archivolt round the opening to the lower hall (photo che-01); south end: marble cladding, the wrought-iron grille of the alcove, the network map
  S.group.add(new THREE.Mesh(extrudeZ(archRing(4.0, FY + 1.5, 0.4, FY, 0, 24), zA, zA + 0.08), marble));
  S.group.add(new THREE.Mesh(extrudeZ([[-C, FY], [C, FY], [C, SPC], [-C, SPC]], zB - 0.04, zB), marble));
  nofx(k.plane(2.6, 2.8, mat.toon('#ffffff', { map: T.iron }), [0, FY + 1.42, zB - 0.05], [0, Math.PI, 0]));
  k.box(2.9, 0.12, 0.1, M.steelBlack, [0, FY + 2.88, zB - 0.08]);
  sg.networkMap(S, { x: -3.0, y: FY + 1.65, z: zB - 0.042, rotY: Math.PI, w: 1.2 });

  // ---------------------------------------------------------------- side halls: platform faces of the pylon rows, track walls, floor comb, lamps
  {
    // blind / pylon pieces of the platform faces (the openings interrupt the louvre strip)
    const pieces = []; { let z0 = -PZ; for (const z of openZc) { pieces.push([z0, z - OW / 2]); z0 = z + OW / 2; } pieces.push([z0, PZ]); }
    const louvre = mat.toon('#ffffff', { map: T.louvre });
    for (const sx of [-1, 1]) {
      const fx = sx * (PY + 0.012), rot = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      for (const [a, b] of pieces) { const L = b - a - 0.5; if (L < 0.6) continue; nofx(k.plane(L, 0.44, louvre, [fx, FY + 3.12, (a + b) / 2], [0, rot, 0])); for (const y of [FY + 2.88, FY + 3.36]) S.bx(sx > 0 ? PY : -PY - 0.04, sx > 0 ? PY + 0.04 : -PY, y - 0.02, y + 0.02, a + 0.25, b - 0.25, steel); }
      sg.trackBand(S, { x: sx * PY, y: FY + 3.6, z0: -PZ + 1.0, z1: PZ - 1.0, rotY: rot, line: LINE, name: NAME, nameEn: NAME_EN, every: 12 });
      S.bx(sx > 0 ? PY : -PY - 0.3, sx > 0 ? PY + 0.3 : -PY, FY + 3.74, FY + 3.84, -PZ + 0.4, PZ - 0.4, ledge);                               // the white lip over the band
      S.bx(sx > 0 ? PY + 0.06 : -PY - 0.24, sx > 0 ? PY + 0.24 : -PY - 0.06, FY + 3.84, FY + 3.87, -PZ + 0.6, PZ - 0.6, M.lampWarm);       // the uplight hidden on it
      // the comb of black granite rectangles along the pylon wall (photos che-10, che-18)
      S.group.add(new THREE.Mesh(stripGeo(sx > 0 ? PY + 0.05 : -PY - 0.95, sx > 0 ? PY + 0.95 : -PY - 0.05, -PZ + 0.3, PZ - 0.3, FY + 0.008, 1.3), mat.toon('#ffffff', { map: T.comb, polygonOffset: -2 })));
    }
    // track walls: the red band, chrome letters over it, line schemes under it, a lamp strip on the marble cornice, two service doors with iron grilles
    const letters = mat.decal('#ffffff', { map: T.letters }), iron = mat.toon('#ffffff', { map: T.iron });
    for (const [sx, travelZ] of [[-1, +1], [1, -1]]) {
      const wx = sx * (WALL - 0.15), rot = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      sg.trackBand(S, { x: wx, y: FY + 2.22, z0: -PZ + 2, z1: PZ - 2, rotY: rot, line: LINE, name: NAME, nameEn: NAME_EN, every: 9 });
      for (const z of [-45, 0, 45]) {
        nofx(k.plane(4.6, 0.42, letters, [wx - sx * 0.012, FY + 2.62, z], [0, rot, 0]));
        sg.lineScheme(S, { x: wx - sx * 0.002, y: FY + 1.4, z, rotY: rot, line: LINE, currentId: ID, dir: travelZ, ahead: sg.aheadOf(rot, travelZ), res: 0.75 });
      }
      for (const z of [-66, 66]) { nofx(k.plane(1.1, 1.9, iron, [wx - sx * 0.012, hall.BED + 1.05, z], [0, rot, 0])); S.bx(sx > 0 ? wx - 0.05 : wx, sx > 0 ? wx : wx + 0.05, hall.BED + 2.0, hall.BED + 2.12, z - 0.65, z + 0.65, M.steelBlack); }
      S.bx(sx > 0 ? wx - 0.2 : wx + 0.05, sx > 0 ? wx - 0.05 : wx + 0.2, FY + 3.62, FY + 3.66, -PZ + 1, PZ - 1, M.lampWarm);
    }
  }

  // ---------------------------------------------------------------- wayfinding (signs.js; docs/research/metro-wayfinding.md): the S track (x = -TRK) runs toward +z = Prospekt Veteranov, the N track toward
  // -z = Devyatkino. A board with rotY 0 faces +z (read walking north: the S track on the reader's left), rotY PI faces -z (read walking south: the N track on the left).
  {
    const BH = 0.62, YB = FY + 3.3;
    const lowSpring = Math.max(FY, E.FY) + 1.0;                                                     // the lower hall vault (a tall one when the foot lies above the platform)
    const vaultTop = (x, where) => where === 'side' ? SPS + Math.sqrt(Math.max(0, RS * RS - (Math.abs(x) - CXS) ** 2)) : where === 'low' ? lowSpring + 4.9 * Math.sqrt(Math.max(0, 1 - (x / A) ** 2)) : SPC + Math.sqrt(Math.max(0, C * C - x * x));
    const board = (o, where = 'central') => {
      const L = sg.textures.hangBoard(o.sections, { w: BH }).length, r = o.rotY || 0, bx = Math.min(L / 2 - 0.4, L * 0.32), top = o.y + BH / 2;
      const b = sg.hangBoard(S, { ...o, w: BH, both: false, rodLen: 0 });
      for (const s of [-1, 1]) { const rx = o.x + s * bx * Math.cos(r), rz = o.z - s * bx * Math.sin(r), len = vaultTop(rx, where) + 0.05 - top; if (len > 0.05) nofx(k.cyl(0.012, 0.012, len, M.steelBlack, [rx, top + len / 2, rz], null, 4)); }
      return b;
    };
    const trS = (a) => sg.sec.trains(LINE, +1, a), trN = (a) => sg.sec.trains(LINE, -1, a), exit = sg.sec.exit({ streets: CH_STREETS }, 'u', true);
    // the lower hall (the foot of the incline): arrivals from above see both directions; the platform side sees the way out
    board({ x: 0, y: FY + 3.0, z: zA - 2.4 - 0.065, rotY: Math.PI, sections: [trN('l'), sg.sec.rules('right'), trS('r')] }, 'low');
    board({ x: 0, y: FY + 3.0, z: zA - 2.4 + 0.065, rotY: 0, sections: [exit] }, 'low');
    // the central hall: at the arch, in the middle, at the south end
    board({ x: 0, y: YB, z: zA + 2.2 + 0.065, rotY: 0, sections: [exit] });
    board({ x: 0, y: YB, z: zA + 2.2 - 0.065, rotY: Math.PI, sections: [trN('l'), trS('r')] });
    board({ x: 0, y: YB, z: 0.065, rotY: 0, sections: [trS('l'), trN('r')] });
    board({ x: 0, y: YB, z: -0.065, rotY: Math.PI, sections: [trN('l'), trS('r')] });
    board({ x: 0, y: YB, z: zB - 2.6 + 0.065, rotY: 0, sections: [sg.sec.city('u', true)] });
    board({ x: 0, y: YB, z: zB - 2.6 - 0.065, rotY: Math.PI, sections: [trN('l'), trS('r')] });
    // the side platforms beyond the central hall: «Выход в город» toward the central hall, read by the passengers of the end cars
    for (const sx of [-1, 1]) { board({ x: sx * 7.4, y: YB, z: -60, rotY: Math.PI, sections: [sg.sec.city('u', false)] }, 'side'); board({ x: sx * 7.4, y: YB, z: 60, rotY: 0, sections: [sg.sec.city('u', false)] }, 'side'); }
    // small red direction boards on the cornice band over two openings per side, facing the axis (photo che-16)
    for (const z of [-13.2, 13.2]) {
      sg.hangBoard(S, { x: C - 0.07, y: FY + 3.7, z, rotY: -Math.PI / 2, w: 0.4, both: false, rodLen: 0, sections: [trN()] });
      sg.hangBoard(S, { x: -C + 0.07, y: FY + 3.7, z, rotY: Math.PI / 2, w: 0.4, both: false, rodLen: 0, sections: [trS()] });
    }
    // the network map on a pylon face of the central hall (west row, between the openings at z 0 and 6.6)
    sg.networkMap(S, { x: -C + 0.002, y: FY + 1.62, z: PIT / 2, rotY: Math.PI / 2, w: 1.2 });
  }

  // ================================================================ the lower hall and the incline (north end of the central hall)
  const Se = new Space(ctx, E.eframe, { name: 'chernyshevskaya-esc' });
  const zFoot = S.L(E.bottom.x, E.bottom.z)[1], footY = E.FY, dy = footY - FY, z0 = zFoot - 0.7, z1 = zA - 0.55;
  if (dy < 0.05) lowerHall(ctx, M, S, { A, FY, z0, z1, floorMat: checker, vaultMat: M.plasterVault });
  else {
    // the record rise with the foot above the platform: one tall vault over both levels, the upper landing, a granite flight down to the platform level, a plate that closes the tall vault over the
    // central end wall
    const ySp = footY + 1.0, n = Math.max(2, Math.round(dy / 0.15)), tread = 0.32, run = n * tread, zS0 = zFoot + 3.0, zS1 = zS0 + run;
    S.group.add(new THREE.Mesh(extrudeZ(archRing(A, ySp, 0.5, FY - 1.4, 0, 36, 4.9), z0, z1), M.plasterVault));
    S.group.add(new THREE.Mesh(floorGeo(-A, A, z0, zS0, footY, 0.5), checker)); S.group.add(new THREE.Mesh(floorGeo(-A, A, zS1, z1, FY, 0.5), checker));
    S.bx(-A, A, footY - 0.6, footY - 0.02, z0, zS0, M.concrete);
    S.walk(-A, A, z0 - 0.2, zS0, footY, 1.1);
    const prof = [[zS1, FY - 0.3], [zS1, FY]]; for (let i = 0; i < n; i++) prof.push([zS1 - i * tread, FY + (i + 1) * dy / n], [zS1 - (i + 1) * tread, FY + (i + 1) * dy / n]); prof.push([zS0, FY - 0.3]);
    S.group.add(new THREE.Mesh(extrudeX(prof, -A + 0.25, A - 0.25), mat.toon('#8f8a82')));
    for (const sx of [-1, 1]) nofx(k.cyl(0.03, 0.03, Math.hypot(run, dy), steel, [sx * (A - 0.45), FY + dy / 2 + 0.95, (zS0 + zS1) / 2], [Math.atan2(dy, run), 0, 0], 6));
    const [cx, cz] = S.W(0, (zS0 + zS1) / 2); physics.addStairs(cx, cz, 2 * A - 0.6, run, F.yaw + Math.PI, FY, footY, n);
    for (const sx of [-1, 1]) S.col(sx > 0 ? A - 0.1 : -A - 0.7, sx > 0 ? A + 0.7 : -A + 0.1, FY - 1.2, footY + 8, z0, z1);
    const outer = [[-A, FY - 1.4], [-A, ySp]]; for (let i = 1; i < 36; i++) { const t = Math.PI - i * Math.PI / 36; outer.push([A * Math.cos(t), ySp + 4.9 * Math.sin(t)]); } outer.push([A, ySp], [A, FY - 1.4]);
    const cen = [[-C, FY - 0.5], [-C, SPC]]; for (let i = 1; i < 24; i++) { const t = Math.PI - i * Math.PI / 24; cen.push([C * Math.cos(t), SPC + C * Math.sin(t)]); } cen.push([C, SPC], [C, FY - 0.5]);
    S.group.add(new THREE.Mesh(extrudeZ(outer, zA - 0.66, zA - 0.6, [cen]), M.plasterVault));
    res.stair = { n, zS0, zS1, dy };
  }
  const esc = buildEscalator(ctx, M, Se, { FY: footY, yTop: E.yTop, zTop: 0, zBottom: E.run, shellStart: 12, lanes: E.lanes, halfW: A });

  // ================================================================ the vestibule inside the pavilion w22999175
  const Sv = new Space(ctx, E.eframe, { name: 'che-vestibule', tag: null, zone: 'che-vestibule-fx' }), kv = Sv.k, FV = 0.05, CEIL = 6.0;
  const b = ctx.L && ctx.L.buildingById ? ctx.L.buildingById(CH_BLDG) : null, foot = b && b.polys && b.polys[0] ? ringOf(b.polys[0].o) : CH_FOOT, poly = insetPoly(foot, 0.45);
  const dws = DOORWAYS.filter((d) => d.station === ID), dIn = dws.find((d) => d.kind === 'entrance'), dOut = dws.find((d) => d.kind === 'exit');
  const hole = [[-A, 0], [A, 0], [A, 13], [-A, 13]].map(([x, z]) => Sv.W(x, z));
  const room = buildPolyRoom(ctx, M, { id: 'che-vest', poly, y0: FV, ceil: CEIL, doors: dws.map((d) => ({ id: d.id, x: d.x, z: d.z, w: d.w, h: 3.0, arch: false })), holes: [hole],
    wallMat: mat.toon('#ffffff', { map: T.vwall, side: 'double' }), ceilMat: mat.toon('#efece6', { side: 'double' }), floorMat: sharedFloor(ctx, M, '#ece8e0'),
    lamps: { step: 4.5, mat: M.lampWhite, size: [1.6, 0.6], rot: -E.yaw } });
  res.room = room;
  const brass = M.brass, flame = M.lampWarm, shelf = mat.toon('#f1eee7');
  for (const e of room.edges) {
    // the white shelf at 3.3 m round the hall and the brass torch sconces over it (photo che-28), none over a doorway
    const g = new THREE.Group(); g.position.set(e.a[0], 0, e.a[1]); g.rotation.y = -Math.atan2(e.uz, e.ux); room.group.add(g); const kg = ctx.kit(g);
    const inw = (e.inward[0] === -e.uz && e.inward[1] === e.ux) ? 1 : -1;                    // local +z of the edge group = (-uz, ux): +1 when that is the inward side
    kg.box(e.l, 0.1, 0.22, shelf, [e.l / 2, 3.3, inw * 0.11]);
    if (e.l > 5) for (let t = 2.0; t < e.l - 1.5; t += 3.6) {
      if (e.doors.some((d) => Math.abs(t - d.t) < (d.w || 3.4) / 2 + 0.8)) continue;
      kg.box(0.06, 0.06, 0.32, brass, [t, 3.9, inw * 0.16]); kg.cyl(0.05, 0.09, 0.55, brass, [t, 4.05, inw * 0.32], null, 8); nofx(kg.cyl(0.07, 0.04, 0.16, flame, [t, 4.4, inw * 0.32], null, 8));
    }
    // the glazed west front seen from inside: daylight panes either side of and above the entrance doorway
    const dIn2 = e.doors.find((d) => d.id === dIn.id);
    if (dIn2) {
      const zc = inw * 0.02, a0 = Math.max(0.4, dIn2.t - 9), a1 = Math.min(e.l - 0.4, dIn2.t + 9), d0 = dIn2.t - dIn2.w / 2, d1 = dIn2.t + dIn2.w / 2, gm = mat.emissive('#ffffff', 0.85, { map: T.glaze });
      for (const [x0, x1, y0, y1] of [[a0, d0, 0.4, CEIL - 0.1], [d1, a1, 0.4, CEIL - 0.1], [d0, d1, 3.05, CEIL - 0.1]]) if (x1 - x0 > 0.2) { const m = new THREE.Mesh(wallGeoZ(x0, x1, y0, y1, zc, inw > 0, 1), gm); m.castShadow = false; g.add(m); }
    }
  }
  shaftParapet(Sv, M, { A, len: 13, y: FV, mat: mat.toon('#3a3634') });
  // the turnstile row across the hall north of the head (16 gates at x -9 .. 9, the passages between them at x = -8.4 + 1.2 n: entry west of the axis, exit east of it), glass partitions to the
  // walls, the attendant booth, ticket machines
  const zt = -4.6, inside = (x, z) => room.inside(...Sv.W(x, z));
  for (let i = 0; i < 16; i++) turnstile(kv, M, -9 + i * 1.2, FV, zt, 0);
  for (const sx of [-1, 1]) {
    let xe = sx * 9.7; while (Math.abs(xe) < 40 && inside(xe + sx * 0.2, zt)) xe += sx * 0.2;
    const xa = Math.min(sx * 9.7, xe), xb = Math.max(sx * 9.7, xe);
    if (xb - xa > 0.3) { kv.box(xb - xa, 2.2, 0.08, M.glass, [(xa + xb) / 2, FV + 1.1, zt]); kv.box(xb - xa, 0.1, 0.12, steel, [(xa + xb) / 2, FV + 2.25, zt]); Sv.col(xa, xb, FV - 0.5, FV + 2.4, zt - 0.15, zt + 0.15); }
  }
  if (inside(11.2, -2.0) && inside(12.4, -0.6) && inside(10.0, -0.6)) { kv.box(2.4, 2.5, 2.2, M.glass, [11.2, FV + 1.25, -1.6]); kv.box(2.5, 0.12, 2.3, M.steelBlack, [11.2, FV + 2.56, -1.6]); Sv.col(10.0, 12.4, FV - 0.5, FV + 2.7, -2.7, -0.5); }
  for (const x of [-15.0, -16.3, -17.6, -18.9]) { const z = zt - 1.4; if (!(inside(x, z - 0.6) && inside(x - 0.5, z) && inside(x + 0.5, z))) continue; kv.box(0.8, 1.9, 0.6, M.kiosk, [x, FV + 0.95, z]); nofx(kv.box(0.6, 0.45, 0.04, M.lampCool, [x, FV + 1.45, z - 0.31])); Sv.col(x - 0.45, x + 0.45, -1, 2.1, z - 0.35, z + 0.35); }      // ticket machines along the partition, facing the doors
  // signs: the name light box and «К поездам» for those who come in, the way out for those who come up the incline, a «Выход» plate inside the exit door
  {
    const BH = 0.62;
    const hb = (o) => { const L = sg.textures.hangBoard(o.sections, { w: BH }).length, bx = Math.min(L / 2 - 0.4, L * 0.32); sg.hangBoard(Sv, { ...o, w: BH, both: false, rodLen: 0 }); for (const s of [-1, 1]) nofx(kv.cyl(0.012, 0.012, CEIL - o.y - BH / 2, M.steelBlack, [o.x + s * bx * Math.cos(o.rotY), (CEIL + o.y + BH / 2) / 2, o.z - s * bx * Math.sin(o.rotY)], null, 4)); };
    hb({ x: 4.5, y: 3.1, z: zt + 1.0, rotY: 0, sections: [sg.sec.exit({ streets: CH_STREETS }, 'u', false)] });
    hb({ x: -4.5, y: 3.1, z: zt - 0.9, rotY: Math.PI, sections: [sg.sec.trains(LINE, -1, 'd'), sg.sec.trains(LINE, +1, 'd')] });
    nofx(kv.plane(4.6, 0.72, mat.emissive('#ffffff', 1.0, { map: T.nameBox }), [0, 4.6, -1.0], [0, Math.PI, 0])); kv.box(4.7, 0.8, 0.12, M.steelBlack, [0, 4.6, -0.93]);
    for (const s of [-1, 1]) nofx(kv.cyl(0.015, 0.015, CEIL - 5.0, M.steelBlack, [s * 2.0, 5.5, -0.93], null, 4));
    if (dOut) { const nx = Math.sin(dOut.rotY), nz = Math.cos(dOut.rotY), p = nofx(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.5), M.board(M.blueBoard('Выход', 'Way out', 'u', 'che-v-exit'), 1.0))); p.position.set(dOut.x - nx * 0.5, 3.45, dOut.z - nz * 0.5); p.rotation.y = dOut.rotY + Math.PI; room.group.add(p); }
  }
  X.addVestZone(ID, room.inside, 7.5);
  res.pavilion = { station: ID, floor: FV, ceil: CEIL, poly: room.poly, doors: dws.map((d) => d.id), hole: ID + '-shaft' };

  // ================================================================ the station object, the ways out and in (tests: window.__walk)
  const rt = X.rtOf(ID, X.net[ID], F, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: ID, name: NAME, nameEn: NAME_EN, frame: F, stock: 'baltiets', line: LINE, idx: X.net[ID].idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Чернышевская». Выход к проспекту Чернышевского и Кирочной улице'),
  });
  X.stations[ID] = rt;
  const SeW = (x, z, tol) => { const q = Se.W(x, z); return tol ? [q[0], q[1], tol] : q; }, nOf = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)];
  // out: the N side platform -> an opening -> the central hall -> the arch -> an UP lane (x = 1) -> the exit turnstiles (the passage at x = 2.4) -> the north door
  res.exitRoute = () => { const [nx, nz] = nOf(dOut), [, lzo] = Se.L(dOut.x, dOut.z);
    return { start: [...toWorld(F, 7.3, 30), FY], points: [toWorld(F, 7.3, 6.6), toWorld(F, 2.0, 6.6), toWorld(F, 1.0, zA + 3), toWorld(F, 1.0, zA - 2.5), SeW(1, E.run + 2.2, 0.4), SeW(1, E.run - 3, 0.3), SeW(1, 60, 0.3), SeW(1, 6, 0.3), SeW(1, -1.4),
      SeW(2.4, zt + 1.6), SeW(2.4, zt - 1.6), SeW(3.6, Math.max(zt - 3, lzo + 2.5)), [dOut.x - nx * 0.8, dOut.z - nz * 0.8], [dOut.x + nx * 3.5, dOut.z + nz * 3.5]],
      door: [dOut.x, dOut.z], out: [dOut.x + nx * 3.5, dOut.z + nz * 3.5], outward: [nx, nz] }; };
  // in: from the pavement through the west doorway -> the entry turnstiles (the passage at x = -2.4) -> in front of a DOWN lane (x = -1; not across the divider at x = -2) -> the central hall
  res.entryRoute = () => { const [nx, nz] = nOf(dIn);
    return { start: [dIn.x + nx * 4, dIn.z + nz * 4, 0], points: [[dIn.x - nx * 1.5, dIn.z - nz * 1.5], SeW(-8, zt - 3.5), SeW(-2.4, zt - 1.6), SeW(-2.4, zt + 1.6), SeW(-1, -1.8), SeW(-1, 3, 0.4), SeW(-1, E.run - 2, 0.5), SeW(-1, E.run + 2.4), toWorld(F, 0, zA + 4), toWorld(F, 0, 0)], end: { station: ID, y: FY } }; };
  res.S = S; res.Se = Se; res.Sv = Sv; res.hall = hall; res.esc = esc; res.rt = rt; res.central = [zA, zB]; res.FV = FV; res.zFoot = zFoot;
  return res;
}
