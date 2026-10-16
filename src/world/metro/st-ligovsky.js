// metro/st-ligovsky.js — Ligovsky Prospekt (line 4, -66 m, 1991; docs/research/metro-east.md section 6, photos refs/east lig-*; data: data/metro-east.js). Called by metro/hub-east.js.
//   hall       SINGLE VAULT (hall-vault.js, spring raised to 3.6 m): white vault of flat ribs every 3 m, the brass lattice trough along the crown, pendant lanterns (three opal boxes in a brass frame
//              on a rod) over both platform edges, polished RED granite: track walls in three bands (grey-green plinth, red-brown speckled panels, cream marble strip with the bronze capitals
//              «ЛИГОВСКИЙ ПРОСПЕКТ») and the orange band of line 4 with the name, pink-grey granite floor, granite benches with black-yellow ends on the axis; the +z end arch with the
//              stained-glass window (blue / gold / violet figure), the -z end wall with the clock mosaic over the mouth of the S-passage.
//   passage    33 steps up from the -z end (5.5 m), a white marble corridor with a light trough to the foot of the incline (~95 m in all, dossier ~84 m)
//   incline    3 lanes, 60.5 m of rise, from the OSM head inside Ligovsky 88 (w53573863, the Metro administration) toward NE
//   vestibule  inside Ligovsky 88: the lobby behind the six-door glazed portal on the Ligovsky front (DOORWAYS ligovsky-in) and the exit on Transportny per. (ligovsky-out): beige tile, pyramid-
//              coffered white ceiling, the steel space frame with yellow node balls over the mouth of the incline, turnstiles.
import * as THREE from 'three';
import { FRAMES, ESC2, DOORWAYS, toWorld } from '../data/metro.js';
import { LG_PZ, LG_FOOT_Y, LG_STEPS, LG_BLDG } from '../data/metro-east.js';
import { Space, extrudeZ, archRing, bezierPath, minRadius } from './lib.js';
import { buildVaultHall, sharedFloor } from './hall-vault.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { createPlatform } from './platform.js';
import { turnstile } from './st-nevsky.js';
import { panelTex, shaftParapet, doorFrame } from './petro-kit.js';
import { makeSigns } from './signs.js';

const FONT = '"Rubik","Noto Sans",sans-serif', SERIF = '"Noto Serif","Times New Roman",serif', ORANGE = '#e8741f';
const DIMS = { SPRING: 3.6, B: 5.9 };                                                                   // crown 9.5 m over the platform, inner width 20.6 m (dossier ~19 m / ~9.5 m)

export function buildLigovsky(ctx, M, X, K) {
  const { mat, tex } = ctx;
  const LG = FRAMES.ligovsky, PZ = LG_PZ, FY = LG.y, E = ESC2.ligovsky, res = {};
  const name = 'Лиговский проспект', nameEn = 'Ligovskiy prospekt';
  const S = new Space(ctx, LG, { name: 'ligovsky' }), k = S.k;
  // ---------------------------------------------------------------- materials: the track wall from the track bed (uv in metres): pit, grey-green plinth, a cream joint, red-brown panels, the band, cream marble
  const wallTex = M.rep(tex.draw(256, 602, (g, w, h) => {
    const ppm = 128, Y = (v) => h - v * ppm, r = ctx.rng('lig-wall');
    g.fillStyle = '#1c1c20'; g.fillRect(0, Y(1.1), w, 1.1 * ppm);
    const speck = (y0, y1, base, a, b, n) => { g.fillStyle = base; g.fillRect(0, Y(y1), w, (y1 - y0) * ppm); for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? a : b; g.fillRect(r() * w, Y(y1) + r() * (y1 - y0) * ppm, 1 + r() * 2.5, 1 + r() * 2.5); } };
    speck(1.1, 1.9, '#4f5648', 'rgba(20,24,18,0.45)', 'rgba(210,215,200,0.25)', 900);
    g.fillStyle = '#d6cfba'; g.fillRect(0, Y(2.0), w, 0.1 * ppm);
    speck(2.0, 3.75, '#7a4638', 'rgba(30,10,6,0.45)', 'rgba(240,190,170,0.28)', 2400);
    g.strokeStyle = 'rgba(30,12,8,0.6)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 1.0 * ppm) { g.beginPath(); g.moveTo(x, Y(3.75)); g.lineTo(x, Y(2.0)); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, Y(3.75), w, 6);
    g.fillStyle = '#c8a64a'; g.fillRect(0, Y(3.8), w, 0.05 * ppm); g.fillStyle = ORANGE; g.fillRect(0, Y(4.1), w, 0.3 * ppm);
    g.fillStyle = '#d9d2bf'; g.fillRect(0, Y(4.7), w, 0.6 * ppm); g.fillStyle = 'rgba(120,110,90,0.3)'; for (let x = 0; x < w; x += 0.9 * ppm) g.fillRect(x, Y(4.7), 1.5, 0.6 * ppm);
  }, { key: 'lig-wall' }), 1 / 2, 1 / 4.7);
  const wallMat = mat.toon('#ffffff', { map: wallTex });
  const floorMat = sharedFloor(ctx, M, '#b8968a');                                                    // pink-grey granite (the shared canvas, tinted)
  const brass = mat.toon('#c8a04a');
  // ---------------------------------------------------------------- the hall
  const hall = buildVaultHall(ctx, M, S, { id: 'lig', FY, PZ, name, nameEn, dims: DIMS, ribPitch: 3.0, skin: { wallMat, floorMat, band: ORANGE, bandY: 2.85, vault: '#f1efe9', rib: '#faf9f4', endMat: mat.toon('#e6e1d6') }, endHole: { N: { halfW: 2.4, spring: 1.0 } } });
  const { EDGE, TRK, WALL, SPS, B } = hall;
  const vInfo = { FY, TRK, EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + X.STUB_VISIBLE, discPos: PZ + 0.6 + X.STUB_VISIBLE, activeRadius: 260 };
  // both ends carry real tunnels (Dostoevskaya at -z, PAN-2 at +z: links-east.js); the stubs wait for the ends that do not get one
  for (const m of hall.mouths) { const go = () => X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, hall.BED, {}); K.defer('ligovsky:' + m.zs, go); }
  const vaultY = (x) => SPS + B * Math.sqrt(Math.max(0, 1 - (x / WALL) ** 2));
  // the bronze capitals on the cream strip of both track walls
  {
    const letters = mat.decal('#ffffff', { map: tex.draw(1024, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#6a4f22'; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, [...'ЛИГОВСКИЙ ПРОСПЕКТ'].join(String.fromCharCode(8202, 8202)), w / 2, h / 2, w - 30, 78, SERIF, 600); }, { key: 'lig-letters' }) });
    for (const sx of [-1, 1]) for (let z = -PZ + 20; z < PZ - 10; z += 40) { const fx = sx > 0 ? WALL - 0.17 : -WALL + 0.17, p = k.plane(4.4, 0.42, letters, [fx, FY + 3.3, z], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); p.castShadow = false; }
  }
  // the brass lattice trough along the crown (two rails, cross bars every 1.5 m, a lit strip) and the pendant lanterns over both platform edges
  {
    const yc = SPS + B - 0.35, n = Math.floor((2 * PZ - 4) / 1.5);
    for (const sx of [-1, 1]) S.bx(sx * 0.62 - 0.04, sx * 0.62 + 0.04, yc - 0.04, yc + 0.04, -PZ + 2, PZ - 2, brass);
    S.bx(-0.2, 0.2, yc + 0.06, yc + 0.1, -PZ + 2, PZ - 2, M.lampWarm);
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1.32, 0.05, 0.05), brass, n), d = new THREE.Object3D();
    for (let i = 0; i < n; i++) { d.position.set(0, yc, -PZ + 2.75 + i * 1.5); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
    im.instanceMatrix.needsUpdate = true; im.userData.noBatch = true; im.castShadow = false; im.frustumCulled = false; S.group.add(im);
    const yL = FY + 4.5;
    for (const sx of [-1, 1]) for (let z = -PZ + 7; z < PZ - 4; z += 12) {
      const x = sx * (EDGE - 1.1), top = vaultY(x);
      k.cyl(0.02, 0.02, top - yL - 0.4, brass, [x, (top + yL + 0.4) / 2, z], null, 5);
      k.box(0.06, 0.06, 1.1, brass, [x, yL + 0.42, z]); k.box(1.1, 0.06, 0.06, brass, [x, yL + 0.42, z]);
      for (const [dx, dz, dy] of [[0.42, 0, 0], [-0.21, 0.36, -0.15], [-0.21, -0.36, 0.1]]) { const l = k.box(0.34, 0.5, 0.34, M.lampWarm, [x + dx, yL + dy, z + dz]); l.castShadow = false; k.box(0.38, 0.05, 0.38, brass, [x + dx, yL + dy + 0.27, z + dz]); }
    }
  }
  // granite benches with black-yellow ends on the axis
  {
    const stripe = mat.toon('#ffffff', { map: tex.draw(64, 64, (g, w, h) => { g.fillStyle = '#f2c500'; g.fillRect(0, 0, w, h); g.fillStyle = '#151515'; for (let i = -2; i < 4; i++) { g.beginPath(); g.moveTo(i * 22, h); g.lineTo(i * 22 + 11, h); g.lineTo(i * 22 + 11 + h, 0); g.lineTo(i * 22 + h, 0); g.closePath(); g.fill(); } }, { key: 'lig-hazard' }) }), granite = mat.toon('#6e6660');
    for (const z of [-46, -16, 14, 44]) { k.box(0.9, 0.48, 2.2, granite, [0, FY + 0.24, z]); for (const s of [-1, 1]) k.box(0.92, 0.12, 0.04, stripe, [0, FY + 0.38, z + s * 1.11]); S.col(-0.45, 0.45, FY, FY + 0.5, z - 1.1, z + 1.1); }
  }
  // the +z end: the granite-framed arch with the stained-glass window (back-lit); the -z end: the clock mosaic over the passage arch
  {
    const glass = tex.draw(384, 512, (g, w, h) => {
      const r = ctx.rng('lig-glass'), cols = ['#3e65b5', '#2c4e9a', '#5b3a8c', '#7a5aa8', '#f0c040', '#e8a830', '#8fb3dd', '#c9d8ee'];
      g.fillStyle = '#1b2448'; g.fillRect(0, 0, w, h);
      for (let j = 0; j < 14; j++) for (let i = 0; i < 8; i++) { g.fillStyle = cols[(r() * 4) | 0]; g.fillRect(i * w / 8 + 2, j * h / 14 + 2, w / 8 - 4, h / 14 - 4); }
      // the stylised figure: a gold sun-disc halo over a tall violet / blue figure with raised arms
      g.fillStyle = '#f0c040'; g.beginPath(); g.arc(w / 2, 150, 88, 0, 7); g.fill(); g.fillStyle = '#e8a830'; g.beginPath(); g.arc(w / 2, 150, 54, 0, 7); g.fill();
      g.fillStyle = '#5b3a8c'; g.beginPath(); g.moveTo(w / 2 - 40, 210); g.lineTo(w / 2 + 40, 210); g.lineTo(w / 2 + 70, h - 20); g.lineTo(w / 2 - 70, h - 20); g.closePath(); g.fill();
      g.fillStyle = '#3e65b5'; g.beginPath(); g.moveTo(w / 2 - 36, 230); g.lineTo(70, 120); g.lineTo(52, 150); g.lineTo(w / 2 - 30, 290); g.closePath(); g.fill(); g.beginPath(); g.moveTo(w / 2 + 36, 230); g.lineTo(w - 70, 120); g.lineTo(w - 52, 150); g.lineTo(w / 2 + 30, 290); g.closePath(); g.fill();
      g.strokeStyle = '#11162c'; g.lineWidth = 4; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(i * w / 8, 0); g.lineTo(i * w / 8, h); g.stroke(); } for (let j = 1; j < 14; j++) { g.beginPath(); g.moveTo(0, j * h / 14); g.lineTo(w, j * h / 14); g.stroke(); }
      g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, w / 2); g.arc(w / 2, w / 2, w / 2, Math.PI, 0); g.lineTo(w, h); g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over';
    }, { key: 'lig-glass' });
    const z = PZ - 0.03, frame = mat.toon('#8a8478');
    S.group.add(new THREE.Mesh(extrudeZ(archRing(2.25, FY + 4.4, 0.55, FY + 0.3, 0, 24), PZ - 0.35, PZ - 0.01), frame));
    S.bx(-2.8, 2.8, FY, FY + 0.3, PZ - 0.35, PZ - 0.01, frame);
    const p = k.plane(4.5, 6.4, mat.emissive('#ffffff', 0.9, { map: glass, alphaTest: 0.5 }), [0, FY + 3.5, z - 0.02], [0, Math.PI, 0]); p.castShadow = false;
    S.col(-2.8, 2.8, FY - 0.5, FY + 7, PZ - 0.4, PZ);
    const clock = tex.draw(256, 256, (g, w, h) => {
      const r = ctx.rng('lig-clock'); g.clearRect(0, 0, w, h); g.save(); g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, 7); g.clip();
      for (let i = 0; i < 1600; i++) { g.fillStyle = ['#e8e2d0', '#d9cfb8', '#f2ecdc', '#c9bfa6'][(r() * 4) | 0]; g.fillRect(r() * w, r() * h, 4, 4); }
      g.strokeStyle = '#8a6a2a'; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 10, 0, 7); g.stroke();
      g.fillStyle = '#3a3226'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.save(); g.translate(w / 2 + Math.cos(a) * 96, h / 2 + Math.sin(a) * 96); g.rotate(a); g.fillRect(-10, -4, 20, 8); g.restore(); }
      g.strokeStyle = '#2a241c'; g.lineCap = 'round'; g.lineWidth = 9; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + 40, h / 2 - 50); g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 - 68, h / 2 + 14); g.stroke();
      g.restore();
    }, { key: 'lig-clock' });
    const c = k.plane(2.6, 2.6, mat.decal('#ffffff', { map: clock }), [0, FY + 6.0, -PZ + 0.02], [0, 0, 0]); c.castShadow = false;
  }
  K.sill(S, { x0: -2.4, x1: 2.4, z0: -PZ - 0.8, z1: -PZ + 0.2, y: FY });

  // ---------------------------------------------------------------- the S-passage: 33 steps up from the -z end, the white marble corridor to the foot of the incline
  const marble = mat.toon('#ffffff', { map: panelTex(ctx, M, 'lig-pass-wall', { base: '#ecebe6', w: 0.9, h: 0.45, cols: 3, rows: 6, vein: 'rgba(110,112,118,0.22)' }), side: 'double' });
  const st = K.stair(S, { z0: -PZ - 0.6, z1: -PZ - 0.6 - LG_STEPS * 0.288, y0: FY, y1: LG_FOOT_Y, n: LG_STEPS, w: 4.0, wallMat: marble }), zTop = -PZ - 0.6 - st.run;
  K.plate(S, { z: zTop - 0.15, y: LG_FOOT_Y, ow: 3.8, oh: 4.4, hw: 2.3, spring: 0.7 });
  K.sill(S, { x0: -2.3, x1: 2.3, z0: zTop - 0.7, z1: zTop + 0.1, y: LG_FOOT_Y });
  const Se = new Space(ctx, E.eframe, { name: 'ligovsky-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, zTop: 0, zBottom: E.run, shellStart: 12, lanes: E.lanes, halfW: E.A, shellMat: mat.toon('#f2e9c8', { side: 'double' }) });
  K.bulkhead(Se, { A: E.A, FY: E.FY, run: E.run });
  {
    const grp = X.mkGroup('ligovsky-passage'), t1 = [Math.sin(LG.yaw), Math.cos(LG.yaw)], end = toWorld(LG, 0, zTop - 0.3);
    const pts = bezierPath([E.bottom.x, E.bottom.z], E.e, end, t1, 36, 16, 2.5); res.radius = minRadius(pts); X.debug.radii.ligovsky = res.radius;
    X.cor('ligovsky-passage', grp, pts.map((p) => [p[0], LG_FOOT_Y, p[1]]), { ...X.CORR, wallMat: marble, vaultMat: mat.toon('#f6f5f0', { side: 'double' }) });
  }

  // ---------------------------------------------------------------- the vestibule inside Ligovsky 88
  const Sv = new Space(ctx, E.eframe, { name: 'lig-vestibule', tag: null, zone: 'lig-vestibule-fx' }), kv = Sv.k;
  const dws = DOORWAYS.filter((d) => d.station === 'ligovsky'), dIn = dws.find((d) => d.kind === 'entrance'), dOut = dws.find((d) => d.kind === 'exit');
  const ex = [Math.cos(E.yaw), -Math.sin(E.yaw)];
  const poly = K.clip(K.clip(K.inset(K.foot(LG_BLDG), 0.45), ex, Sv.W(-13.5, 0)), E.e, Sv.W(0, -22));
  const hole = [[-E.A, 0], [E.A, 0], [E.A, 13], [-E.A, 13]].map(([x, z]) => Sv.W(x, z)), CEIL = 4.6;
  const tile = mat.toon('#ffffff', { map: M.rep(tex.draw(128, 128, (g, w, h) => { g.fillStyle = '#d9cdb4'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,115,105,0.6)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); } }, { key: 'lig-tile' }), 1 / 1.6, 1 / 1.2) });
  const coffer = mat.toon('#ffffff', { map: M.rep(tex.draw(128, 128, (g, w, h) => { g.fillStyle = '#f4f3ef'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(150,145,135,0.35)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, h / 2); g.lineTo(0, h); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w / 2, h / 2); g.closePath(); g.fill(); g.strokeStyle = 'rgba(120,115,105,0.5)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2); }, { key: 'lig-coffer' }), 1, 1), side: 'double' });
  const room = buildPolyRoom(ctx, M, { id: 'lig-vest', poly, ceil: CEIL, doors: dws.map((d) => ({ x: d.x, z: d.z, w: d.w, h: 3.0, arch: false })), holes: [hole], wallMat: mat.toon('#ffffff', { map: panelTex(ctx, M, 'lig-vwall', { base: '#d8d0bf', w: 0.9, h: 0.45, cols: 3, rows: 6 }), side: 'double' }),
    ceilMat: coffer, floorMat: tile, floorUv: 1, lamps: { step: 4.8, mat: M.lampWhite, size: [1.2, 1.2], rot: -E.yaw } });
  res.room = room;
  shaftParapet(Sv, M, { A: E.A, len: 13, mat: mat.toon('#4a4a4e') });
  // the steel space frame with yellow node balls under the ceiling over the mouth (photo lig-18)
  {
    const steel = mat.toon('#9aa0a6'), yellow = mat.toon('#f2c500'), y0 = CEIL - 0.9, y1 = CEIL - 0.25, nodes = [];
    for (let x = -4.5; x <= 4.51; x += 1.5) for (let z = -0.75; z <= 13.6; z += 1.5) nodes.push([x, y0, z]);
    for (let x = -3.75; x <= 3.76; x += 1.5) for (let z = 0; z <= 12.8; z += 1.5) nodes.push([x, y1, z]);
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 6), yellow, nodes.length), d = new THREE.Object3D();
    nodes.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.instanceMatrix.needsUpdate = true; im.userData.noBatch = true; im.castShadow = false; im.frustumCulled = false; Sv.group.add(im);
    for (let x = -4.5; x <= 4.51; x += 1.5) Sv.bx(x - 0.025, x + 0.025, y0 - 0.025, y0 + 0.025, -0.75, 13.5, steel);
    for (let z = -0.75; z <= 13.6; z += 1.5) Sv.bx(-4.5, 4.5, y0 - 0.025, y0 + 0.025, z - 0.025, z + 0.025, steel);
  }
  // turnstiles across the room between the portal and the head, glass partitions to the walls; the sign
  {
    const zt = -4.2, free = (x, z, r = 0.5) => [[r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dz]) => room.inside(...Sv.W(x + dx, z + dz)));
    for (let x = -6.0; x <= 6.01; x += 1.2) if (free(x, zt, 0.4)) turnstile(kv, M, x, 0.05, zt, 0);
    for (const sx of [-1, 1]) { let xe = sx * 6.6; while (free(xe + sx * 0.3, zt, 0.2) && Math.abs(xe) < 40) xe += sx * 0.3; const xa = Math.min(sx * 6.6, xe), xb = Math.max(sx * 6.6, xe); if (xb - xa < 0.2) continue;
      kv.box(xb - xa, 2.2, 0.08, M.glass, [(xa + xb) / 2, 1.15, zt]); kv.box(xb - xa, 0.1, 0.12, M.stainless, [(xa + xb) / 2, 2.3, zt]); Sv.col(xa, xb, -0.5, 2.4, zt - 0.15, zt + 0.15); }
    const q = kv.plane(3.4, 0.7, M.board(M.blueBoard('К поездам', 'To the trains', 'd', 'lig-v-trains', { bg: ORANGE }), 1.0), [0, 3.3, -1.0], [0, Math.PI, 0]); q.castShadow = false;
  }
  X.addVestZone('ligovsky', room.inside, 9);
  // street side: door frames, the bronze plate «СТАНЦИЯ ЛИГОВСКИЙ ПРОСПЕКТ» beside the portal (the travertine facade itself is the owner's: dossier section 10)
  { const g = new THREE.Group(); g.name = 'ligovsky-street'; ctx.addStatic(g); const kg = ctx.kit(g);
    const plate = mat.toon('#ffffff', { map: tex.draw(512, 160, (gg, w, h) => { gg.fillStyle = '#7a5f2c'; gg.fillRect(0, 0, w, h); gg.strokeStyle = '#c9a24b'; gg.lineWidth = 8; gg.strokeRect(6, 6, w - 12, h - 12); gg.fillStyle = '#e8cf8a'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; tex.fitText(gg, 'СТАНЦИЯ', w / 2, h * 0.32, w - 60, 44, SERIF, 600); tex.fitText(gg, 'ЛИГОВСКИЙ ПРОСПЕКТ', w / 2, h * 0.68, w - 50, 46, SERIF, 600); }, { key: 'lig-plate' }) });
    doorFrame(kg, M, dIn, { h: 3.0 }); doorFrame(kg, M, dOut, { h: 3.0 });
    const nx = Math.sin(dIn.rotY), nz = Math.cos(dIn.rotY), ux = nz, uz = -nx, px = dIn.x + nx * 0.14 + ux * (dIn.w / 2 + 1.1), pz = dIn.z + nz * 0.14 + uz * (dIn.w / 2 + 1.1);
    const p = kg.plane(1.5, 0.47, plate, [px, 2.3, pz], [0, dIn.rotY, 0]); p.castShadow = false; }

  // ---------------------------------------------------------------- wayfinding: the exit (S-passage) at -z, the blind stained-glass end at +z; S track toward +z = Улица Дыбенко
  {
    const sg = makeSigns(ctx, M), line = '4', BH = 0.62, YB = FY + 3.4;
    const board = (z, rotY, sections) => { const L = sg.textures.hangBoard(sections, { w: BH }).length, bx = Math.min(L / 2 - 0.4, L * 0.32); return sg.hangBoard(S, { x: 0, y: YB, z: z + (rotY === 0 ? 0.065 : -0.065), rotY, sections, w: BH, both: false, rodLen: vaultY(bx) + 0.04 - (YB + BH / 2) }); };
    const trS = (a) => sg.sec.trains(line, +1, a), trN = (a) => sg.sec.trains(line, -1, a);
    const exitL = { streets: [['Лиговский проспект', 'Ligovskiy prospekt'], ['Транспортный переулок', 'Transportnyy lane']], esc: true };
    board(-PZ + 6, 0, [sg.sec.exit(exitL, 'u', true)]);
    board(-PZ + 6, Math.PI, [trN('l'), trS('r')]);
    board(0, 0, [trS('l'), sg.sec.city('u', true), trN('r')]);
    board(0, Math.PI, [trN('l'), trS('r')]);
    board(PZ - 7, 0, [sg.sec.exit(exitL, 'u', true)]);
    board(PZ - 7, Math.PI, [trN('l'), trS('r')]);
    for (const [wx, rotY, travelZ] of [[-WALL + 0.15, Math.PI / 2, +1], [WALL - 0.15, -Math.PI / 2, -1]]) for (const z of [-34, 6, 46]) sg.lineScheme(S, { x: wx, y: FY + 1.45, z, rotY, line, currentId: 'ligovsky', dir: travelZ, ahead: sg.aheadOf(rotY, travelZ), res: 0.4 });
    sg.networkMap(S, { x: 3.55, y: FY + 1.7, z: -PZ + 0.002, rotY: 0, w: 1.2 });                // between the passage arch (2.4) and the N tunnel mouth (4.9)
  }

  // ---------------------------------------------------------------- the station object, the ways out and in
  const rt = X.rtOf('ligovsky', X.net.ligovsky, LG, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: 'ligovsky', name, nameEn: 'Ligovsky Prospekt', frame: LG, stock: '717', line: '4', idx: X.net.ligovsky.idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Лиговский проспект». Выход к Лиговскому проспекту и Транспортному переулку'),
  });
  X.stations.ligovsky = rt;
  const nOf = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)], at = (d, out, tol) => { const [nx, nz] = nOf(d), q = [d.x + nx * out, d.z + nz * out]; return tol ? [...q, tol] : q; };
  const SeW = (x, z, tol) => K.at(Se, x, z, tol), SvW = (x, z, tol) => K.at(Sv, x, z, tol);
  res.exitRoute = (debug) => ({ start: [...toWorld(LG, 2.5, -30), FY], points: [toWorld(LG, 2.5, -PZ + 4), toWorld(LG, 0, -PZ + 1.5), toWorld(LG, 0, -PZ - 1.4), K.at(S, 0, zTop + 1.0, 0.6), toWorld(LG, 0, zTop - 1.5), ...K.cp(debug, 'ligovsky-passage', 3, true).slice(1, -1), SeW(2, E.run + 1.0, 0.5), SeW(2, E.run - 3, 0.3), SeW(2, 60, 0.3), SeW(2, 6, 0.3), SeW(2, -1.4), SvW(6.2, -1.8), SvW(6.2, 9), SvW(Math.min(Sv.L(dOut.x, dOut.z)[0] + 1.5, 9), Sv.L(dOut.x, dOut.z)[1] - 1.8), at(dOut, -1.4), at(dOut, 0.4), at(dOut, 3.6)],
    door: [dOut.x, dOut.z], out: at(dOut, 3.6), outward: nOf(dOut) });
  res.entryRoute = (debug) => ({ start: [...at(dIn, 4.5), 0], points: [at(dIn, 1.5, 0.6), at(dIn, -1.6), SvW(Math.min(Sv.L(dIn.x, dIn.z)[0] - 3, 12), -8.5), SvW(1.0, -6.5), SvW(-2, -2.2), SvW(-2, -1.4, 0.4), SeW(-2, 3, 0.4), SeW(-2, E.run - 2, 0.5), SeW(-1, E.run + 1.2, 0.6), ...K.cp(debug, 'ligovsky-passage', 3).slice(1, -1), toWorld(LG, 0, zTop - 1.5), K.at(S, 0, zTop + 1.0, 0.6), toWorld(LG, 0, -PZ - 1.4), toWorld(LG, 0, -PZ + 6)], end: { station: 'ligovsky', y: FY } });
  Object.assign(res, { S, Se, Sv, hall, esc, rt, vInfo, E, zTop, st });
  return res;
}
