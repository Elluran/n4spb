// metro/st-pushkinskaya.js — Pushkinskaya (line 1, -57 m, 1955 / 1956; docs/research/metro-south-vitebsky-tekhnolog.md section 4, photos refs/vitebsky 01-19).
//   hall       three-vault PYLON station (hall-pylon.js, plain + dims of data/metro-vitebsky.js): warm cream ashlar pylons, a black-and-gold TORCHERE in front of every pylon (white marble drum with
//              a gilt band, black shaft, gilt shields and spears, opal bowl), transverse ribs with stucco wreaths and LUNETTES over every opening (the groin look), white cornice shelves with warm
//              strips, the dark-red granite carpet with the wave border down the middle of the central hall on beige stone, side halls with brass chandeliers (opal bowl + six cups),
//              track walls of white glazed tile above black tile, the red band of line 1 with the name, bronze letters, gilt grille doors with the plate "1955"
//   ENE end    (-z) the painted autumn park of Tsarskoye Selo in an arch behind the seated white marble Pushkin on his podium, red rope on brass stanchions, four torcheres
//   incline    3 lanes, axial: it lands in the WSW (+z) end of the central hall (the hall ends 3 m before the foot, as at Gorkovskaya) and climbs to the pavilion on Zagorodny pr.
//   vestibule  INSIDE the pavilion r11737909 (the whole footprint, inset): Gazgan-marble walls, the coffered round ceiling over the ticket hall, turnstile rows (entrance / exit), the two white
//              columns with the architrave and the medallion of Pushkin over the incline head. The passage to Zvenigorodskaya (the -x side) is built by hub-vitebsky.js.
import * as THREE from 'three';
import { FRAMES, ESC2, DOORWAYS, toWorld } from '../data/metro.js';
import { PS_PZ, PS_DIMS, PS_ARCADE, VIT_FOOTPRINTS, VIT_ROOMS, PUSH_STREETS, XFER } from '../data/metro-vitebsky.js';
import { Space, extrudeZ, extrudeX, archRing, floorGeo } from './lib.js';
import { buildPylonHall } from './hall-pylon.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { createPlatform } from './platform.js';
import { turnstile } from './st-nevsky.js';
import { panelTex, lowerHall, shaftParapet, insetPoly, doorFrame } from './petro-kit.js';
import { makeSigns } from './signs.js';
import { STUB_VISIBLE } from './stubs.js';
import { human, figureMats } from '../lib/figures.js';

const SERIF = '"Noto Serif","Times New Roman",serif';
/** the one granite texture of the Vitebsky node (floors, stairs, decks are tinted copies of it: 0.26 M px instead of eight) */
export const vitGranite = (M) => M.T.granite('vit-granite', '#ece6da', 'rgba(40,30,25,0.30)', 'rgba(255,255,255,0.35)');

export function buildPushkinskaya(ctx, M, X) {
  const { mat, tex, physics } = ctx;
  const P = FRAMES.pushkinskaya, PZ = PS_PZ, FY = P.y, D = PS_DIMS, E = ESC2.pushkinskaya, res = {};
  const { C, PY, EDGE, TRK, WALL } = D, CXS = (PY + WALL) / 2, SPC = FY + 4.0, SPS = FY + 3.6;
  const name = 'Пушкинская', nameEn = 'Pushkinskaya';
  const S = new Space(ctx, P, { name: 'pushkinskaya' }), k = S.k;
  const zFoot = S.L(E.bottom.x, E.bottom.z)[1], zB = zFoot - 3;                                               // the central hall ends 3 m before the foot of the incline
  const sg = makeSigns(ctx, M), bay = XFER.push.bay, inBay = (z, m = 0) => z > bay[0] - m && z < bay[1] + m;

  // ================================================================ materials (textures by key, uv in metres)
  const pylonMat = mat.toon('#ffffff', { map: panelTex(ctx, M, 'push-ashlar', { base: '#d8cfba', w: 0.9, h: 0.6, cols: 3, rows: 5, veins: 18, vein: 'rgba(150,130,100,0.22)', joint: 'rgba(120,105,80,0.38)' }) });
  const trackMat = mat.toon('#ffffff', { map: panelTex(ctx, M, 'push-tile', { base: '#f2f0ea', w: 0.15, h: 0.15, cols: 8, rows: 8, veins: 0, joint: 'rgba(140,140,140,0.45)', lite: 'rgba(255,255,255,0.10)', dark: 'rgba(80,80,80,0.04)' }) });
  const vg = vitGranite(M), floorMat = mat.toon('#d6c29a', { map: vg }), carpetMat = mat.toon('#86504c', { map: vg, polygonOffset: -2 });                 // one light granite texture for the whole node, tinted
  const vaultMat = mat.toon('#efebe0', { side: 'double' }), marble = mat.toon('#ece8de'), cream = mat.toon('#e4ddcc'), black = mat.toon('#1a1a1c'), gilt = mat.toon('#c9a24b'), brass = M.brass;
  const wave = M.rep(tex.draw(128, 256, (g, w, h) => {
    g.fillStyle = '#cdbe9c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a4a40'; g.beginPath(); g.moveTo(14, 0);                                                        // the running scroll ("Vitruvian wave"): a crest every tile, curling over
    for (let y = 0; y <= h; y += 4) { const t = y / h * Math.PI * 2; g.lineTo(64 + 34 * Math.sin(t), y); } g.lineTo(14, h); g.closePath(); g.fill();
    g.strokeStyle = '#5a4a40'; g.lineWidth = 11; g.beginPath(); g.arc(80, h * 0.25, 22, Math.PI * 0.9, Math.PI * 2.6); g.stroke();
    g.fillStyle = '#cdbe9c'; g.beginPath(); g.arc(48, h * 0.75, 20, 0, 7); g.fill(); g.strokeStyle = '#5a4a40'; g.beginPath(); g.arc(48, h * 0.75, 20, Math.PI * 1.9, Math.PI * 3.6); g.stroke();
    g.fillStyle = '#16161a'; g.fillRect(0, 0, 8, h); g.fillRect(w - 8, 0, 8, h); g.fillStyle = '#f0ece2'; g.fillRect(8, 0, 4, h); g.fillRect(w - 12, 0, 4, h);
  }, { key: 'push-wave' }), 1, 1);
  const waveMat = mat.toon('#ffffff', { map: wave, polygonOffset: -2 });

  // ================================================================ the hall
  const hall = buildPylonHall(ctx, M, S, { id: 'push', FY, PZ, name, nameEn, plain: true, noMeander: true, central: [-PZ, zB], dims: D, pitch: PS_ARCADE.pitch, openW: PS_ARCADE.openW, openSpring: PS_ARCADE.openSpring,
    pylonMat, trackMat, floorMat, vaultMat, endHole: { S: { halfW: 3.6, spring: 0.8 } } });
  const BED = hall.BED;
  res.endStubs = (zs) => { for (const m of hall.mouths) if (m.zs === zs) X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, BED, {}); };   // -z: the real tunnel to Vladimirskaya (links-vitebsky.js) or these
  if (X.realEnd && X.realEnd('pushkinskaya:1')) X.deferStub('pushkinskaya:1', () => res.endStubs(1)); else res.endStubs(1);                // +z: toward Tekhnologichesky Institut (links-tekhnolog.js when that end is a real end)
  const vInfo = { openings: hall.openings, FY, TRK, EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + STUB_VISIBLE, discPos: PZ + 0.6 + STUB_VISIBLE, activeRadius: 260 };

  // ---- the floor of the central hall: the red carpet with the wave border on both sides
  S.group.add(new THREE.Mesh(floorGeo(-2.65, 2.65, -PZ + 0.3, zB - 0.3, FY + 0.012, 0.5), carpetMat));
  for (const sx of [-1, 1]) S.group.add(new THREE.Mesh(floorGeo(sx > 0 ? 2.65 : -3.25, sx > 0 ? 3.25 : -2.65, -PZ + 0.3, zB - 0.3, FY + 0.012, 1 / 0.6, true, 1 / 1.2), waveMat));
  // ---- track walls: black tile up to 1.2 m over the platform, the red band with the names, bronze letters, gilt grille doors "1955"
  for (const sx of [-1, 1]) S.bx(sx > 0 ? WALL - 0.19 : -WALL + 0.15, sx > 0 ? WALL - 0.15 : -WALL + 0.19, BED, FY + 1.2, -PZ, PZ, M.blackTile);
  {
    const letters = mat.decal('#ffffff', { map: tex.draw(1024, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#8a6a2a'; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, [...name.toUpperCase()].join(String.fromCharCode(8202, 8202, 8202)), w / 2, h / 2, w - 20, 70, SERIF, 700); }, { key: 'push-letters' }) });
    const grille = mat.toon('#ffffff', { map: tex.draw(128, 224, (g, w, h) => {
      g.fillStyle = '#c9a24b'; g.fillRect(0, 0, w, h); g.fillStyle = '#121214'; g.fillRect(10, 10, w - 20, h - 20);
      g.fillStyle = '#d6b45a'; for (let x = 20; x < w - 14; x += 11) { g.fillRect(x - 1.5, 30, 3, h - 50); g.beginPath(); g.moveTo(x, 18); g.lineTo(x - 5, 34); g.lineTo(x + 5, 34); g.closePath(); g.fill(); }
      g.strokeStyle = '#d6b45a'; g.lineWidth = 5; g.beginPath(); g.arc(w / 2, h * 0.47, 30, Math.PI * 0.15, Math.PI * 0.85, true); g.stroke();                       // the laurel wreath
      g.fillStyle = '#c9a24b'; g.fillRect(30, h * 0.47 - 12, w - 60, 24); g.fillStyle = '#1a1a1c'; g.font = '700 20px "Rubik",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1955', w / 2, h * 0.47);
    }, { key: 'push-grille-1955' }) });
    for (const sx of [-1, 1]) {
      const fx = sx > 0 ? WALL - 0.2 : -WALL + 0.2, rotY = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      for (const z of [-60, -30, 0, 30, 60]) { const p = k.plane(1.1, 1.9, grille, [fx, FY + 1.05, z], [0, rotY, 0]); p.castShadow = false; }
      for (const z of [-45, 15, 45]) { const p = k.plane(4.4, 0.44, letters, [fx + sx * 0.02, FY + 3.08, z], [0, rotY, 0]); p.castShadow = false; }
      sg.trackBand(S, { x: sx > 0 ? WALL - 0.15 : -WALL + 0.15, y: FY + 2.4, z0: -PZ + 2, z1: PZ - 2, rotY, line: '1', name, nameEn, every: 15, h: 0.5 });
      // the cornice shelf over the track wall (split at the passage bay on the -x side)
      for (const [z0, z1] of sx < 0 ? [[-PZ, bay[0]], [bay[1], PZ]] : [[-PZ, PZ]]) S.bx(sx > 0 ? WALL - 0.55 : -WALL + 0.15, sx > 0 ? WALL - 0.15 : -WALL + 0.55, SPS - 0.18, SPS, z0, z1, M.white);
    }
    // the linear schemes over the black tile (one per track wall), the network map
    sg.lineScheme(S, { x: -WALL + 0.19, y: FY + 0.6, z: 15, rotY: Math.PI / 2, line: '1', currentId: 'pushkinskaya', dir: 1, ahead: sg.aheadOf(Math.PI / 2, 1), res: 0.5, w: 4.0, h: 1.1 });
    sg.lineScheme(S, { x: WALL - 0.19, y: FY + 0.6, z: -15, rotY: -Math.PI / 2, line: '1', currentId: 'pushkinskaya', dir: -1, ahead: sg.aheadOf(-Math.PI / 2, -1), res: 0.5, w: 4.0, h: 1.1 });
    sg.networkMap(S, { x: WALL - 0.19, y: FY + 1.55, z: 45, rotY: -Math.PI / 2, res: 0.5 });
  }
  // ---- the central hall: cornice shelves with warm strips, transverse ribs with stucco wreaths, lunettes over every opening
  for (const sx of [-1, 1]) { S.bx(sx > 0 ? C - 0.36 : -C, sx > 0 ? C : -C + 0.36, FY + 3.62, FY + 3.8, -PZ, zB, M.white); S.bx(sx > 0 ? C - 0.34 : -C + 0.3, sx > 0 ? C - 0.3 : -C + 0.34, FY + 3.56, FY + 3.62, -PZ + 0.5, zB - 0.5, M.lampWarm); }
  {
    const ribGeo = extrudeZ(archRing(C - 0.5, SPC, 0.5, SPC, 0, 28), -0.3, 0.3), wreath = new THREE.TorusGeometry(0.2, 0.045, 5, 14);
    for (const z of hall.pylonZ.slice(1, -1)) { if (z > zB - 1) continue; const r = new THREE.Mesh(ribGeo, M.white); r.position.z = z; S.group.add(r); for (const f of [1, -1]) k.mesh(wreath, cream, [0, SPC + C - 0.25, z + f * 0.31], null); }
    const lun = archRing(PS_ARCADE.openW / 2 + 0.05, SPC, 0.15, SPC, 0, 12, 2.5), lunL = extrudeX(lun, -C, -C + 0.85), lunR = extrudeX(lun, C - 0.85, C);
    for (const z of hall.openZc) for (const g of [lunL, lunR]) { const m = new THREE.Mesh(g, vaultMat); m.position.z = z; S.group.add(m); }
  }
  // ---- the torcheres: one in front of every pylon of the central hall (in the semicircular niche), plus four in the ENE end room
  const G = { drum: new THREE.CylinderGeometry(0.35, 0.38, 1.05, 10), band: new THREE.CylinderGeometry(0.395, 0.395, 0.07, 10), cap: new THREE.CylinderGeometry(0.3, 0.37, 0.08, 10), shaft: new THREE.CylinderGeometry(0.045, 0.07, 1.6, 6),
    shield: new THREE.SphereGeometry(0.5, 8, 4), spear: new THREE.CylinderGeometry(0.012, 0.012, 1.9, 4), tip: new THREE.ConeGeometry(0.035, 0.14, 5), crown: new THREE.CylinderGeometry(0.27, 0.17, 0.13, 10), bowl: new THREE.SphereGeometry(0.5, 10, 6) };
  const torch = (x, z) => {
    k.mesh(G.drum, marble, [x, FY + 0.525, z]); k.mesh(G.band, gilt, [x, FY + 0.83, z]); k.mesh(G.cap, marble, [x, FY + 1.09, z]); k.mesh(G.shaft, black, [x, FY + 1.92, z]);
    for (const f of [1, -1]) k.mesh(G.shield, gilt, [x, FY + 2.05, z + f * 0.08], null, [0.36, 0.5, 0.05]);
    for (const [dx, dz] of [[0.15, 0], [-0.15, 0]]) { k.mesh(G.spear, black, [x + dx, FY + 2.0, z + dz], [0, 0, dx > 0 ? -0.08 : 0.08]); k.mesh(G.tip, gilt, [x + dx * 1.5, FY + 3.0, z + dz]); }
    k.mesh(G.crown, gilt, [x, FY + 2.75, z]); const b = k.mesh(G.bowl, M.lampWhite, [x, FY + 3.08, z], null, [0.74, 0.56, 0.74]); b.castShadow = false;
    const [wx, wz] = S.W(x, z); physics.addCylinder(wx, wz, 0.42, FY - 0.5, FY + 2.2);
  };
  {
    const niche = mat.decal('#ffffff', { map: tex.draw(64, 224, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(150,135,105,0.55)'; g.beginPath(); g.moveTo(4, h); g.lineTo(4, 32); g.arc(w / 2, 32, w / 2 - 4, Math.PI, 0); g.lineTo(w - 4, h); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,250,235,0.35)'; g.fillRect(8, 40, 6, h - 44); }, { key: 'push-niche' }) });
    for (const z of hall.pylonZ.slice(1, -1)) { if (z > zB - 2) continue; for (const sx of [-1, 1]) { const p = k.plane(1.0, 3.5, niche, [sx * (C - 0.015), FY + 1.75, z], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); p.castShadow = false; torch(sx * (C - 0.45), z); } }
  }
  // ---- side halls: brass chandeliers (one big opal bowl in a ring of six cups) every 6 m on the vault crown; none over the passage bay
  {
    const ring = new THREE.CylinderGeometry(0.55, 0.55, 0.05, 10), cup = new THREE.CylinderGeometry(0.11, 0.06, 0.12, 6), rod = new THREE.CylinderGeometry(0.015, 0.015, 2.3, 4), bowl = new THREE.SphereGeometry(0.5, 8, 6), y = FY + 5.7;
    for (const sx of [-1, 1]) for (let z = -PZ + 6; z < PZ - 3; z += 6) {
      if (sx < 0 && inBay(z, 2)) continue;
      const x = sx * CXS; k.mesh(rod, M.bronzeDark, [x, y + 1.2, z]); k.mesh(ring, brass, [x, y, z]); const b = k.mesh(bowl, M.lampWhite, [x, y - 0.22, z], null, [0.62, 0.5, 0.62]); b.castShadow = false;
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const c = k.mesh(cup, M.lampWarm, [x + 0.55 * Math.cos(a), y + 0.08, z + 0.55 * Math.sin(a)]); c.castShadow = false; }
    }
  }

  // ================================================================ the ENE end (-z): the painted park in an arch, the seated Pushkin, the rope, four torcheres
  {
    const z0 = -PZ, park = tex.draw(512, 640, (g, w, h) => {
      const r = ctx.rng('push-park'), sky = g.createLinearGradient(0, 0, 0, h * 0.55); sky.addColorStop(0, '#9fb6b0'); sky.addColorStop(1, '#d9d4b8'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e9e4d2'; for (let i = 0; i < 7; i++) g.fillRect(w * 0.62 + i * 26, h * 0.3, 10, h * 0.25); g.fillRect(w * 0.6, h * 0.27, w * 0.4, 14); g.fillRect(w * 0.6, h * 0.55, w * 0.4, 10);   // the colonnade (right)
      for (let i = 0; i < 70; i++) { const x = r() * w * 0.75, y = h * 0.15 + r() * h * 0.4, rr = 26 + r() * 46; g.fillStyle = ['#c9a24a', '#b9802e', '#6b6a3a', '#8a7a3a', '#d4b060', '#5d5a30'][(r() * 6) | 0]; g.globalAlpha = 0.85; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
      g.globalAlpha = 1; g.fillStyle = '#3e3a24'; for (let i = 0; i < 9; i++) g.fillRect(r() * w * 0.7, h * 0.45, 5, h * 0.18);
      const pond = g.createLinearGradient(0, h * 0.62, 0, h); pond.addColorStop(0, '#8fa7a0'); pond.addColorStop(1, '#55705f'); g.fillStyle = pond; g.fillRect(0, h * 0.62, w, h * 0.38);
      for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? 'rgba(201,162,74,0.35)' : 'rgba(255,255,255,0.18)'; g.fillRect(r() * w, h * 0.64 + r() * h * 0.34, 20 + r() * 50, 2); }
      g.fillStyle = '#6d6a44'; g.fillRect(0, h * 0.6, w, h * 0.03);
    }, { key: 'push-park' });
    const paint = M.board(park, 0.92);
    { const p = k.plane(4.0, 5.0, paint, [0, FY + 3.1, z0 + 0.04], [0, 0, 0]); p.castShadow = false; }
    { const p = k.mesh(new THREE.CircleGeometry(2.0, 20, 0, Math.PI), mat.emissive('#c9d4c4', 0.9), [0, FY + 5.6, z0 + 0.04]); p.castShadow = false; }                      // the sky of the painting in the arch
    for (const sx of [-1, 1]) S.bx(sx * 2.0 - 0.15, sx * 2.0 + 0.15, FY, FY + 5.6, z0, z0 + 0.14, marble);
    S.group.add(new THREE.Mesh(extrudeZ(archRing(2.0, FY + 5.6, 0.3, FY + 5.6, 0, 20), z0, z0 + 0.14), marble));
    S.bx(-2.2, 2.2, FY + 0.45, FY + 0.6, z0, z0 + 0.4, M.lampWarm);                                                          // the strip that lights the painting from below
    // the podium, the bench and the seated figure (M. Anikushin): leaning back, the right arm on the back of the bench, legs crossed
    const zc = z0 + 3.4; S.bx(-1.1, 1.1, FY, FY + 1.3, zc - 0.8, zc + 0.7, marble); S.bx(-0.75, 0.75, FY + 1.3, FY + 1.85, zc - 0.65, zc + 0.05, marble); S.bx(-0.75, 0.75, FY + 1.85, FY + 2.6, zc - 0.65, zc - 0.5, marble);
    try {
      const fig = human({ detail: 0.75, pose: { pelvis: [0, 0.47, -0.05], pelvisRot: [-0.12, 0, 0], spine: [-0.12, 0.1, 0], head: [0.05, -0.25, 0], legs: { L: { foot: [0.2, 0, 0.42], pole: [0.3, 0.5, 1] }, R: { foot: [0.0, 0.12, 0.5], pole: [-0.1, 0.6, 1] } },
        arms: { R: { hand: [-0.45, 0.62, -0.2], pole: [-1, 0, -0.4], grip: 'relaxed' }, L: { hand: [0.12, 0.6, 0.3], pole: [1, -0.3, 0], grip: 'relaxed' } } }, outfit: { torso: 'coat', hem: 0.4, collar: 'fall', sleeves: 'long', trousers: 'long' }, face: { hair: 'short' } }).toGroup(figureMats(ctx).keys('marble', 'marble'));
      fig.position.set(0, FY + 1.3, zc); fig.scale.setScalar(1.25); S.group.add(fig); res.statue = true;
    } catch (e) { console.warn('[metro] Pushkinskaya: the statue was skipped', e.message); }
    // the red rope on brass stanchions round the podium, the collider of the group
    const rope = mat.toon('#9c1c22'), post = (x, z) => { k.cyl(0.035, 0.035, 0.95, brass, [x, FY + 0.475, z], null, 6); k.sphere(0.06, brass, [x, FY + 0.98, z], 6); };
    for (const [x, z] of [[-1.8, z0 + 1.2], [-1.8, zc + 1.7], [1.8, zc + 1.7], [1.8, z0 + 1.2]]) post(x, z);
    k.cyl(0.02, 0.02, 3.6, rope, [0, FY + 0.88, zc + 1.7], [0, 0, Math.PI / 2], 4); for (const sx of [-1, 1]) k.cyl(0.02, 0.02, zc + 1.7 - z0 - 1.2, rope, [sx * 1.8, FY + 0.88, (zc + 1.7 + z0 + 1.2) / 2], [Math.PI / 2, 0, 0], 4);
    S.col(-1.9, 1.9, FY - 0.5, FY + 3.2, z0, zc + 1.8);
    for (const [x, z] of [[-3.6, z0 + 1.0], [3.6, z0 + 1.0], [-3.6, zc + 3.2], [3.6, zc + 3.2]]) torch(x, z);
  }

  // ================================================================ the incline (WSW end): the stepped arch, the landing, the escalator tube
  for (const sx of [-1, 1]) { S.bx(sx > 0 ? 3.6 : -C, sx > 0 ? C : -3.6, FY, FY + 4.5, zB - 0.3, zB, marble); S.bx(sx > 0 ? 3.3 : -3.6, sx > 0 ? 3.6 : -3.3, FY, FY + 4.4, zB - 0.15, zB, cream); }
  lowerHall(ctx, M, S, { A: E.A, FY, z0: zB + 0.5, z1: zFoot + 0.7, floorMat });
  const Se = new Space(ctx, E.eframe, { name: 'pushkinskaya-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, yTop: E.yTop, zTop: 0, zBottom: E.run, shellStart: 12, lanes: E.lanes, halfW: E.A });

  // ================================================================ signs in the hall (signs.js): the landing, the middle (the transfer), the ENE end
  {
    const tr = (arrow) => sg.sec.transfer({ to: 'zvenigorodskaya', line: '5' }, arrow), yb = FY + 3.35;
    sg.hangBoard(S, { x: 0, y: yb, z: zB - 6, rotY: 0, rodLen: 1.4, both: false, sections: [sg.sec.trains('1', 1, 'l'), tr('l'), sg.sec.trains('1', -1, 'r')] });
    sg.hangBoard(S, { x: 0, y: yb, z: zB - 6.3, rotY: Math.PI, rodLen: 1.4, both: false, sections: [sg.sec.exit({ streets: PUSH_STREETS }, 'u', true), sg.sec.rules('right')] });
    sg.hangBoard(S, { x: 0, y: yb, z: -9, rotY: 0, rodLen: 1.4, sections: [tr('l')] });
    sg.hangBoard(S, { x: 0, y: yb, z: -PZ + 14, rotY: Math.PI, rodLen: 1.4, both: false, sections: [sg.sec.exit({ streets: PUSH_STREETS }, 'u', true), tr('r')] });
  }

  // ================================================================ the vestibule inside the pavilion r11737909 (floor 5 cm over the street)
  const VR = VIT_ROOMS.pushkinskaya, CEIL = VR.ceil, FV = 0.05;
  const Sv = new Space(ctx, E.eframe, { name: 'push-vestibule', tag: null, zone: 'push-vestibule-fx' }), kv = Sv.k;
  const poly = insetPoly(VIT_FOOTPRINTS[VR.ring], 0.45);
  const dws = DOORWAYS.filter((d) => d.station === 'pushkinskaya'), dIn = dws.find((d) => d.kind === 'entrance'), dOut = dws.find((d) => d.kind === 'exit');
  const hole = [[-E.A, 0], [E.A, 0], [E.A, 13], [-E.A, 13]].map(([x, z]) => Sv.W(x, z));
  const wallMat = mat.toon('#ffffff', { map: panelTex(ctx, M, 'push-vwall', { base: '#e6dcc6', w: 0.9, h: 0.6, cols: 3, rows: 4, veins: 22, vein: 'rgba(160,120,90,0.25)' }), side: 'double' });       // Gazgan marble
  const room = buildPolyRoom(ctx, M, { id: 'push-vest', poly, ceil: CEIL, y0: FV, doors: dws.map((d) => ({ x: d.x, z: d.z, w: d.w, h: d.kind === 'entrance' ? 4.2 : 3.3, arch: true })), holes: [hole], wallMat,
    ceilMat: mat.toon('#f3eee2', { side: 'double' }), floorMat: mat.toon('#958477', { map: vg }), lamps: { step: 4.8, mat: M.lampWarm, size: [1.2, 0.6], rot: -E.yaw } });
  res.room = room; res.FV = FV;
  const free = (x, z, r = 0.7) => [[r, 0], [-r, 0], [0, r], [0, -r], [0, 0]].every(([dx, dz]) => room.inside(...Sv.W(x + dx, z + dz)));
  shaftParapet(Sv, M, { A: E.A, len: 13, y: FV, mat: marble });
  // turnstiles: the entrance row (passage along +x) on the side of the entrance, the exit row on the other side
  for (let z = -9.6; z <= -2.4; z += 1.2) { if (free(-9, z, 0.4)) turnstile(kv, M, -9, FV, z, Math.PI / 2); if (free(9, z, 0.4)) turnstile(kv, M, 9, FV, z, Math.PI / 2); }
  for (const [x, z] of [[-12.5, 1.0], [-12.5, 2.3], [-12.5, 3.6]]) if (free(x, z, 0.8)) { kv.box(0.6, 1.9, 0.8, M.kiosk, [x, FV + 0.95, z]); kv.box(0.05, 0.5, 0.6, M.lampCool, [x + 0.32, FV + 1.4, z]); Sv.col(x - 0.4, x + 0.4, FV - 0.5, FV + 2.1, z - 0.45, z + 0.45); }
  // the coffered round ceiling over the ticket hall (the half-dome of the real round hall, flattened under the floor above) with its gilt ring
  {
    const cx = -7, cz = -6.5; let R = 5.2; while (R > 2.5 && !Array.from({ length: 16 }, (_, i) => [cx + R * Math.cos(i * Math.PI / 8), cz + R * Math.sin(i * Math.PI / 8)]).every(([x, z]) => room.inside(...Sv.W(x, z)))) R -= 0.4;
    const coffer = tex.draw(512, 512, (g, w, h) => { g.fillStyle = '#efe8d6'; g.fillRect(0, 0, w, h); const c = w / 2;
      for (let ring = 1; ring <= 5; ring++) { const r0 = ring * 46, n = 6 + ring * 6; for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2; g.save(); g.translate(c + r0 * Math.cos(a), c + r0 * Math.sin(a)); g.rotate(a); g.fillStyle = '#d6cbb0'; g.fillRect(-15, -15, 30, 30); g.fillStyle = '#c4b48e'; g.fillRect(-10, -10, 20, 20); g.fillStyle = '#c9a24b'; g.beginPath(); g.arc(0, 0, 4, 0, 7); g.fill(); g.restore(); } }
      g.fillStyle = '#c9a24b'; g.beginPath(); g.arc(c, c, 26, 0, 7); g.fill(); }, { key: 'push-coffers' });
    const d = kv.mesh(new THREE.CircleGeometry(R, 32), mat.toon('#ffffff', { map: coffer }), [cx, CEIL - 0.03, cz], [Math.PI / 2, 0, 0]); d.castShadow = false;
    kv.mesh(new THREE.TorusGeometry(R, 0.1, 5, 32), gilt, [cx, CEIL - 0.12, cz], [Math.PI / 2, 0, 0]);
  }
  // the two white columns with the architrave over the head of the incline, the medallion of Pushkin (M. Litovchenko) on it
  {
    const xc = E.A + 0.9, zc = -0.8, yA = CEIL - 1.1;
    for (const sx of [-1, 1]) { kv.cyl(0.32, 0.36, yA - FV, marble, [sx * xc, FV + (yA - FV) / 2, zc], null, 12); kv.box(0.85, 0.2, 0.85, marble, [sx * xc, yA - 0.1, zc]); const [wx, wz] = Sv.W(sx * xc, zc); physics.addCylinder(wx, wz, 0.38, FV - 0.5, CEIL); }
    kv.box(2 * xc + 1.0, 0.7, 0.7, marble, [0, yA + 0.35, zc]); kv.box(2 * xc + 1.2, 0.12, 0.8, cream, [0, yA + 0.76, zc]);
    const med = tex.draw(256, 256, (g, w, h) => { g.fillStyle = '#efe9dc'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 2, 0, 7); g.fill(); g.strokeStyle = '#c9b88e'; g.lineWidth = 8; g.stroke();
      g.fillStyle = '#d9cfb8'; g.beginPath(); g.moveTo(96, 70); g.bezierCurveTo(120, 40, 176, 48, 178, 96); g.bezierCurveTo(186, 120, 172, 142, 166, 150); g.lineTo(170, 178); g.lineTo(150, 196); g.lineTo(104, 200); g.lineTo(96, 170); g.lineTo(84, 150); g.lineTo(92, 132); g.lineTo(80, 118); g.closePath(); g.fill();
      g.fillStyle = 'rgba(120,100,70,0.45)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(104 + (i % 5) * 16, 64 + ((i / 5) | 0) * 12, 8, 0, 7); g.fill(); } g.fillRect(150, 120, 14, 40); }, { key: 'push-medallion' });
    const m = kv.mesh(new THREE.CircleGeometry(0.42, 24), mat.toon('#ffffff', { map: med }), [0, yA + 0.35, zc - 0.36], [0, Math.PI, 0]); m.castShadow = false;
    { const p = kv.plane(3.0, 0.66, M.board(M.blueBoard('К поездам', 'To the trains', 'd', 'push-v-trains'), 1.0), [0, 3.2, -1.25], [0, Math.PI, 0]); p.castShadow = false; }
    { const p = kv.plane(2.6, 0.62, M.board(M.blueBoard('Выход в город', 'Way out · Загородный пр.', 'r', 'push-v-exit'), 1.0), [6.5, 3.0, -0.3], [0, 0, 0]); p.castShadow = false; }
  }
  X.addVestZone('pushkinskaya', room.inside, CEIL + 2);
  // the street: door frames and the black lamp posts with three globes on both sides of the entrance portal (never on a carriageway or inside a house)
  {
    const g = new THREE.Group(); g.name = 'pushkinskaya-street'; ctx.addStatic(g); const kg = ctx.kit(g);
    for (const d of dws) doorFrame(kg, M, d, { h: d.kind === 'entrance' ? 4.0 : 3.2 });
    const nx = Math.sin(dIn.rotY), nz = Math.cos(dIn.rotY), ux = nz, uz = -nx;
    for (const s of [-1, 1]) { const x = dIn.x + nx * 1.4 + ux * s * 3.4, z = dIn.z + nz * 1.4 + uz * s * 3.4; if ((ctx.L.isOnRoad && ctx.L.isOnRoad(x, z, 0.6)) || (ctx.L.insideBuilding && ctx.L.insideBuilding(x, z, 0.3))) continue;
      kg.cyl(0.09, 0.12, 3.6, black, [x, 1.8, z], null, 8); kg.cyl(0.03, 0.03, 1.1, black, [x, 3.55, z], [0, 0, Math.PI / 2], 4); for (const q of [-0.55, 0, 0.55]) { const b = kg.sphere(0.2, M.lampWhite, [x + ux * q, q === 0 ? 3.95 : 3.75, z + uz * q], 8); b.castShadow = false; }
      physics.addCylinder(x, z, 0.15, -1, 3.8); }
  }

  // ================================================================ the station object, the ways out and in (tests)
  const rt = X.rtOf('pushkinskaya', X.net.pushkinskaya, P, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: 'pushkinskaya', name, nameEn, frame: P, stock: 'baltiets', line: '1', idx: X.net.pushkinskaya.idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Пушкинская». Переход на станцию «Звенигородская». Выход к Витебскому вокзалу и на Загородный проспект'),
  });
  X.stations.pushkinskaya = rt;
  const SeW = (x, z, tol) => { const q = Se.W(x, z); return tol ? [q[0], q[1], tol] : q; };
  const nOf = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)];
  res.exitRoute = () => { const [nx, nz] = nOf(dOut);
    return { start: [...toWorld(P, 0, 40), FY], points: [toWorld(P, 0, zB - 3), toWorld(P, 2, zB + 1), SeW(2, E.run + 2.2, 0.4), SeW(2, E.run - 3, 0.3), SeW(2, 60, 0.3), SeW(2, 6, 0.3), SeW(2, -1.4), SeW(9, -4.5), [dOut.x - nx * 2.5, dOut.z - nz * 2.5], [dOut.x - nx * 0.6, dOut.z - nz * 0.6], [dOut.x + nx * 3.5, dOut.z + nz * 3.5]],
      door: [dOut.x, dOut.z], out: [dOut.x + nx * 3.5, dOut.z + nz * 3.5], outward: [nx, nz] }; };
  res.entryRoute = () => { const [nx, nz] = nOf(dIn);
    return { start: [dIn.x + nx * 4, dIn.z + nz * 4, 0], points: [[dIn.x - nx * 1.5, dIn.z - nz * 1.5], [dIn.x - nx * 3.0, dIn.z - nz * 3.0], SeW(-9, -5.5), SeW(-2, -2.5), SeW(-2, 3, 0.4), SeW(-2, E.run - 2, 0.5), SeW(-1, E.run + 3), toWorld(P, 0, zB - 4), toWorld(P, 0, 40)], end: { station: 'pushkinskaya', y: FY } }; };
  Object.assign(res, { S, Se, Sv, hall, esc, rt, frame: P, dims: D, FY, PZ, zB, zFoot, vInfo });
  return res;
}
