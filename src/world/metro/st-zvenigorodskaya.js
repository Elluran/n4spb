// metro/st-zvenigorodskaya.js — Zvenigorodskaya (line 5, -57 m, 2008, vestibule 2009; docs/research/metro-south-vitebsky-tekhnolog.md section 5, photos refs/vitebsky z01-z16).
//   hall       COLUMN-WALL three-vault station (hall-pylon.js, plain + dims / arcade of data/metro-vitebsky.js: 1.3 m piers, 3.8 m pitch, 2.5 m arches): cream-grey Koelga piers, a backlit FAN-LIGHT
//              (bronze frame, radial spokes and star tips) in every arch with gilt scroll brackets at the springing, the steel visor cornice with a warm strip and a bracket at every pier, the
//              white metal panel vault, the floor of grey granite fields in rose-red bands (one field per bay), track walls of dark-green marble under white Koelga with brass rails, the
//              purple band of line 5 with the name, bronze letters, bronze doors with one ring
//   WSW end    (-z) the Semyonovsky mosaic in a gilt frame (soldiers, NO banners: no flags), two marble seats
//   incline    4 lanes (A 5.05 is wider than the central hall): it leaves the ENE (+z) end axially through a bulkhead and a short lower hall behind the platform end
//   vestibule  the ground floor of the shopping centre «Звенигородский» (part w1304314360 of w88216896, inset): white walls, the pink-red / grey granite floor, the blue attendant booth, turnstile
//              rows on both sides of the head. The passage to Pushkinskaya (three stairs on the -x side) is built by hub-vitebsky.js.
import * as THREE from 'three';
import { FRAMES, ESC2, DOORWAYS, toWorld } from '../data/metro.js';
import { ZV_PZ, ZV_DIMS, ZV_ARCADE, VIT_FOOTPRINTS, VIT_ROOMS, ZVEN_STREETS, PUSH_STREETS, XFER } from '../data/metro-vitebsky.js';
import { Space, extrudeZ, archHole, floorGeo } from './lib.js';
import { buildPylonHall } from './hall-pylon.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { createPlatform } from './platform.js';
import { turnstile } from './st-nevsky.js';
import { panelTex, lowerHall, shaftParapet, insetPoly, doorFrame } from './petro-kit.js';
import { makeSigns } from './signs.js';
import { STUB_VISIBLE } from './stubs.js';
import { vitGranite } from './st-pushkinskaya.js';

const SERIF = '"Noto Serif","Times New Roman",serif';

export function buildZvenigorodskaya(ctx, M, X) {
  const { mat, tex, physics } = ctx;
  const Z = FRAMES.zvenigorodskaya, PZ = ZV_PZ, FY = Z.y, D = ZV_DIMS, E = ESC2.zvenigorodskaya, AR = ZV_ARCADE, res = {};
  const { C, PY, EDGE, TRK, WALL, RS } = D, CXS = (PY + WALL) / 2, SPS = FY + 3.6;
  const name = 'Звенигородская', nameEn = 'Zvenigorodskaya';
  const S = new Space(ctx, Z, { name: 'zvenigorodskaya' }), k = S.k;
  const zFoot = S.L(E.bottom.x, E.bottom.z)[1];
  const sg = makeSigns(ctx, M), bay = XFER.zven.bay, inBay = (z, m = 0) => z > bay[0] - m && z < bay[1] + m, stairSet = new Set(XFER.zven.stairs.map((z) => z.toFixed(1)));

  // ================================================================ materials
  const pierMat = mat.toon('#ffffff', { map: panelTex(ctx, M, 'zven-pier', { base: '#cfcabd', w: 0.6, h: 0.3, cols: 4, rows: 8, veins: 12, vein: 'rgba(130,120,105,0.2)', joint: 'rgba(110,100,85,0.32)' }) });
  const trackMat = mat.toon('#ffffff', { map: panelTex(ctx, M, 'zven-track', { base: '#d2cec4', w: 0.6, h: 0.3, cols: 4, rows: 8, veins: 10, vein: 'rgba(130,120,105,0.18)', joint: 'rgba(110,100,85,0.3)' }) });
  const greenMat = mat.toon('#ffffff', { map: panelTex(ctx, M, 'zven-green', { base: '#263a2f', w: 0.6, h: 0.6, cols: 4, rows: 4, veins: 34, vein: 'rgba(170,205,180,0.16)', joint: 'rgba(8,16,12,0.65)', lite: 'rgba(255,255,255,0.05)' }) });
  const vaultMat = mat.toon('#ffffff', { map: panelTex(ctx, M, 'zven-vault', { base: '#f4f4f0', w: 1.9, h: 1.2, cols: 2, rows: 2, veins: 0, joint: 'rgba(150,150,162,0.55)', lite: 'rgba(255,255,255,0.0)', dark: 'rgba(0,0,0,0.0)' }), side: 'double' });
  const floorTex = tex.draw(340, 190, (g, w, h) => {                                                    // one bay of the floor: 6.8 m (x) x 3.8 m (z), the rose-red bands on the edges (0.6 m wide in all)
    const r = ctx.rng('zven-floor'); g.fillStyle = '#a9a89d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(40,42,38,0.28)' : 'rgba(255,255,250,0.30)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    g.fillStyle = '#a25f59'; g.fillRect(0, 0, 15, h); g.fillRect(w - 15, 0, 15, h); g.fillRect(0, 0, w, 15); g.fillRect(0, h - 15, w, 15);
    g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 2; for (let x = 15; x < w - 15; x += 54) { g.beginPath(); g.moveTo(x, 15); g.lineTo(x, h - 15); g.stroke(); } g.beginPath(); g.moveTo(15, h / 2); g.lineTo(w - 15, h / 2); g.stroke();
  }, { key: 'zven-floor' });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(1 / (0.5 * 2 * C), 1 / (0.5 * AR.pitch)); floorTex.offset.set(0.5, 0.5);        // bands on the pier faces and across every pier
  const floorMat = mat.toon('#ffffff', { map: floorTex });
  const marble = mat.toon('#e8e4da'), bronze = mat.toon('#8a6a3a'), gilt = mat.toon('#b08a3e'), steel = mat.toon('#a9adb2'), brass = M.brass;

  // ================================================================ the hall
  const hall = buildPylonHall(ctx, M, S, { id: 'zven', FY, PZ, name, nameEn, plain: true, noMeander: true, dims: D, pitch: AR.pitch, openW: AR.openW, openSpring: AR.openSpring,
    pylonMat: pierMat, trackMat, floorMat, vaultMat, endHole: { S: { halfW: 3.0, spring: 0.8 } } });
  const BED = hall.BED;
  res.endStubs = (zs) => { for (const m of hall.mouths) if (m.zs === zs) X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, BED, {}); };   // -z: the real tunnel to Sadovaya (links-vitebsky.js) or these
  if (X.realEnd && X.realEnd('zvenigorodskaya:1')) X.deferStub('zvenigorodskaya:1', () => res.endStubs(1)); else res.endStubs(1);          // +z: toward Obvodny Kanal (a real end only if another link claims it)
  const vInfo = { openings: hall.openings, FY, TRK, EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + STUB_VISIBLE, discPos: PZ + 0.6 + STUB_VISIBLE, activeRadius: 260 };

  // ---- the arcade: a backlit fan-light in every arch (in the middle of the pier depth; at the stair arches of the passage on the central face, so that the climbers pass under it),
  //      the bronze transom, gilt scroll brackets at the springing on the central face
  {
    const fan = tex.draw(256, 256, (g, w, h) => {
      const c = w / 2; g.fillStyle = '#fff0c8'; g.fillRect(0, 0, w, h); const gr = g.createRadialGradient(c, c, 10, c, c, c); gr.addColorStop(0, 'rgba(255,255,240,0.9)'); gr.addColorStop(1, 'rgba(230,200,140,0.35)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#7a5a2a'; g.lineWidth = 9; g.beginPath(); g.arc(c, c, c - 6, 0, 7); g.stroke(); g.lineWidth = 6; g.beginPath(); g.arc(c, c, c * 0.42, 0, 7); g.stroke();
      g.lineWidth = 4; for (let i = 0; i <= 12; i++) { const a = Math.PI + i * Math.PI / 12; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.42, c + Math.sin(a) * c * 0.42); g.lineTo(c + Math.cos(a) * (c - 6), c + Math.sin(a) * (c - 6)); g.stroke();
        const sx = c + Math.cos(a) * c * 0.72, sy = c + Math.sin(a) * c * 0.72; g.fillStyle = '#7a5a2a'; g.beginPath(); for (let q = 0; q < 8; q++) { const b = q * Math.PI / 4, rr = q % 2 ? 4 : 13; g.lineTo(sx + Math.cos(b) * rr, sy + Math.sin(b) * rr); } g.closePath(); g.fill(); }
    }, { key: 'zven-fan' });
    const fanMat = M.board(fan, 1.0), fanDbl = mat.emissive('#ffffff', 1.0, { map: fan, side: 'double' }), semi = new THREE.CircleGeometry(AR.openW / 2, 16, 0, Math.PI);
    for (const z of hall.openZc) for (const sx of [-1, 1]) {
      const stair = sx < 0 && stairSet.has(z.toFixed(1)), y = FY + AR.openSpring;
      if (stair) { const p = k.mesh(semi, fanMat, [-C + 0.03, y, z], [0, Math.PI / 2, 0]); p.castShadow = false; }
      else { const p = k.mesh(semi, fanDbl, [sx * (C + PY) / 2, y, z], [0, Math.PI / 2, 0]); p.castShadow = false; k.box(PY - C, 0.1, AR.openW, bronze, [sx * (C + PY) / 2, y - 0.05, z]); }
      for (const f of [-1, 1]) k.box(0.12, 0.34, 0.14, gilt, [sx * (C - 0.06), y - 0.08, z + f * (AR.openW / 2 - 0.06)]);
    }
  }
  // ---- the steel visor cornice over both arcades (central side) with the warm strip on top and a bracket at every pier; strips along the crowns of the side vaults
  for (const sx of [-1, 1]) {
    S.bx(sx > 0 ? C - 0.7 : -C, sx > 0 ? C : -C + 0.7, FY + 4.0, FY + 4.16, -PZ, PZ, steel);
    S.bx(sx > 0 ? C - 0.62 : -C + 0.5, sx > 0 ? C - 0.5 : -C + 0.62, FY + 4.16, FY + 4.22, -PZ + 0.4, PZ - 0.4, M.lampWarm);
    for (const z of hall.pylonZ.slice(1, -1)) k.box(0.1, 0.42, 0.12, steel, [sx * (C - 0.3), FY + 3.8, z], [0, 0, sx * 0.6]);
    for (const [z0, z1] of sx < 0 ? [[-PZ + 1, bay[0] - 0.5], [bay[1] + 0.5, PZ - 1]] : [[-PZ + 1, PZ - 1]]) S.bx(sx * CXS - 0.18, sx * CXS + 0.18, SPS + RS - 0.12, SPS + RS - 0.06, z0, z1, M.lampWhite);
  }
  // ---- track walls: dark-green marble with brass rails, the purple band, bronze letters, bronze doors with one ring, the schemes, the network map
  {
    const letters = mat.decal('#ffffff', { map: tex.draw(1024, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#8a6a2a'; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, [...name.toUpperCase()].join(String.fromCharCode(8202, 8202)), w / 2, h / 2, w - 20, 64, SERIF, 700); }, { key: 'zven-letters' }) });
    const door = mat.toon('#ffffff', { map: tex.draw(128, 224, (g, w, h) => { g.fillStyle = '#9a7a44'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d211f'; g.fillRect(12, 12, w - 24, h - 24); g.strokeStyle = '#a8823a'; g.lineWidth = 7; g.beginPath(); g.arc(w / 2, h * 0.48, 18, 0, 7); g.stroke(); }, { key: 'zven-door' }) });
    for (const sx of [-1, 1]) {
      const fx = sx > 0 ? WALL - 0.15 : -WALL + 0.15, rotY = sx > 0 ? -Math.PI / 2 : Math.PI / 2, gx = fx - sx * 0.03;
      S.bx(Math.min(fx, gx), Math.max(fx, gx), BED, FY + 2.0, -PZ, PZ, greenMat);
      for (const y of [FY + 0.04, FY + 2.0]) S.bx(gx - sx * 0.04 - 0.02, gx - sx * 0.04 + 0.02, y - 0.02, y + 0.03, -PZ, PZ, brass);
      sg.trackBand(S, { x: fx, y: FY + 2.35, z0: -PZ + 2, z1: PZ - 2, rotY, line: '5', name, nameEn, every: 12, h: 0.35 });
      for (const z of [-60, -30, 0, 30, 60]) { const p = k.plane(1.0, 1.9, door, [gx - sx * 0.01, FY + 0.98, z], [0, rotY, 0]); p.castShadow = false; }
      for (const z of [-45, 15, 45]) { const p = k.plane(4.6, 0.42, letters, [fx - sx * 0.02, FY + 3.0, z], [0, rotY, 0]); p.castShadow = false; }
    }
    sg.lineScheme(S, { x: -WALL + 0.2, y: FY + 0.75, z: 15, rotY: Math.PI / 2, line: '5', currentId: 'zvenigorodskaya', dir: 1, ahead: sg.aheadOf(Math.PI / 2, 1), res: 0.5, w: 4.0, h: 1.1 });
    sg.lineScheme(S, { x: WALL - 0.2, y: FY + 0.75, z: -15, rotY: -Math.PI / 2, line: '5', currentId: 'zvenigorodskaya', dir: -1, ahead: sg.aheadOf(-Math.PI / 2, -1), res: 0.5, w: 4.0, h: 1.1 });
    sg.networkMap(S, { x: WALL - 0.2, y: FY + 1.3, z: 45, rotY: -Math.PI / 2, res: 0.5 });
  }

  // ================================================================ the WSW end (-z): the Semyonovsky mosaic (A. Bystrov, 2008) in a gilt frame, two seats
  {
    const z0 = -PZ, W2 = 2.2, yR = FY + 4.4;
    const mos = tex.draw(512, 448, (g, w, h) => {
      const r = ctx.rng('zven-mosaic'); g.fillStyle = '#c9a24b'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { g.fillStyle = ['#d8b25a', '#b8913c', '#e4c372', '#a8823a'][(r() * 4) | 0]; g.fillRect((r() * w) | 0, (r() * h) | 0, 4, 4); }
      g.fillStyle = '#6a5a3a'; g.fillRect(0, h * 0.86, w, h * 0.14);                                                        // the ground
      for (let i = 0; i < 6; i++) {                                                                                           // the soldiers: dark-green coats, white belts, black tricorns, muskets with bayonets
        const x = 50 + i * 82 + (i % 2) * 10, y = h * 0.86, s = 1 + (i % 3) * 0.06;
        g.fillStyle = '#1e3a2c'; g.fillRect(x - 18 * s, y - 150 * s, 36 * s, 92 * s); g.fillStyle = '#2b2b2b'; g.fillRect(x - 15 * s, y - 60 * s, 12 * s, 60 * s); g.fillRect(x + 3 * s, y - 60 * s, 12 * s, 60 * s);
        g.strokeStyle = '#f0ece0'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 18 * s, y - 145 * s); g.lineTo(x + 18 * s, y - 70 * s); g.stroke(); g.beginPath(); g.moveTo(x + 18 * s, y - 145 * s); g.lineTo(x - 18 * s, y - 70 * s); g.stroke();
        g.fillStyle = '#e9c9a8'; g.beginPath(); g.arc(x, y - 166 * s, 14 * s, 0, 7); g.fill(); g.fillStyle = '#141414'; g.beginPath(); g.moveTo(x - 24 * s, y - 176 * s); g.lineTo(x + 24 * s, y - 176 * s); g.lineTo(x, y - 196 * s); g.closePath(); g.fill();
        g.strokeStyle = '#3a2a1a'; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 24 * s, y - 40 * s); g.lineTo(x + 30 * s, y - 210 * s); g.stroke(); g.strokeStyle = '#d0d4d8'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 30 * s, y - 210 * s); g.lineTo(x + 31 * s, y - 240 * s); g.stroke();
      }
    }, { key: 'zven-mosaic' });
    const mosMat = mat.toon('#ffffff', { map: mos, emissive: '#3a2a10', emissiveIntensity: 0.25 });
    { const p = k.plane(2 * W2, yR - FY - 0.8, mosMat, [0, (FY + 0.8 + yR) / 2, z0 + 0.05], [0, 0, 0]); p.castShadow = false; }
    { const p = k.mesh(new THREE.CircleGeometry(W2, 20, 0, Math.PI), mat.toon('#d4ad55', { emissive: '#3a2a10', emissiveIntensity: 0.25 }), [0, yR, z0 + 0.05]); p.castShadow = false; }
    for (const sx of [-1, 1]) S.bx(sx * W2 - 0.12, sx * W2 + 0.12, FY + 0.7, yR, z0, z0 + 0.12, gilt);
    S.bx(-W2 - 0.12, W2 + 0.12, FY + 0.62, FY + 0.8, z0, z0 + 0.12, gilt);
    { const ring = []; for (let i = 0; i <= 20; i++) { const t = Math.PI - i * Math.PI / 20; ring.push([(W2 + 0.12) * Math.cos(t), yR + (W2 + 0.12) * Math.sin(t)]); } for (let i = 20; i >= 0; i--) { const t = Math.PI - i * Math.PI / 20; ring.push([(W2 - 0.08) * Math.cos(t), yR + (W2 - 0.08) * Math.sin(t)]); } S.group.add(new THREE.Mesh(extrudeZ(ring, z0, z0 + 0.12), gilt)); }
    S.bx(-W2, W2, FY + 0.3, FY + 0.42, z0, z0 + 0.3, M.lampWarm);
    const stripe = mat.toon('#ffffff', { map: tex.draw(128, 32, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#141414' : '#f2c500'; g.beginPath(); g.moveTo(i * 20 - 10, h); g.lineTo(i * 20 + 6, 0); g.lineTo(i * 20 + 22, 0); g.lineTo(i * 20 + 6, h); g.closePath(); g.fill(); } }, { key: 'zven-seat-stripe' }) });
    for (const sx of [-1, 1]) { const x = sx * 2.9; S.bx(x - 0.3, x + 0.3, FY, FY + 0.45, z0 + 1.0, z0 + 3.2, marble); const p = k.plane(2.2, 0.08, stripe, [x - sx * 0.301, FY + 0.38, z0 + 2.1], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); p.castShadow = false; S.col(x - 0.3, x + 0.3, FY - 0.5, FY + 0.5, z0 + 1.0, z0 + 3.2); }
  }

  // ================================================================ the incline (ENE end, behind the platform): the bulkhead, the lower hall, the 4-lane escalator
  {
    const A = E.A, zb = PZ + 0.6, outl = [[-A - 0.5, FY - 1.4], [A + 0.5, FY - 1.4], [A + 0.5, FY + 1.0]];
    for (let i = 1; i < 24; i++) { const t = i * Math.PI / 24; outl.push([(A + 0.5) * Math.cos(t), FY + 1.0 + 5.4 * Math.sin(t)]); }
    outl.push([-A - 0.5, FY + 1.0]);
    S.group.add(new THREE.Mesh(extrudeZ(outl, zb, zb + 0.3, [archHole(0, 3.0, FY, FY + 0.8, 12)]), M.plasterWarm));
    S.col(-A - 0.6, -3.0, FY - 1.2, FY + 8, zb, zb + 0.3); S.col(3.0, A + 0.6, FY - 1.2, FY + 8, zb, zb + 0.3);
    S.group.add(new THREE.Mesh(floorGeo(-3.0, 3.0, PZ, zb + 0.3, FY, 0.5), floorMat)); S.walk(-3.1, 3.1, PZ - 0.3, zb + 0.6, FY, 1.1);
    lowerHall(ctx, M, S, { A, FY, z0: zb + 0.3, z1: zFoot + 0.7, floorMat, vaultMat: mat.toon('#f2f1ec', { side: 'double' }) });
  }
  const Se = new Space(ctx, E.eframe, { name: 'zvenigorodskaya-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, yTop: E.yTop, zTop: 0, zBottom: E.run, shellStart: 12, lanes: E.lanes, halfW: E.A, shellMat: mat.toon('#f2f1ec', { side: 'double' }) });

  // ================================================================ hanging signs (signs.js; at most ~5 m: the central hall is 6.8 m wide)
  {
    const tr = (arrow) => sg.sec.transfer({ to: 'pushkinskaya', line: '1' }, arrow), yb = FY + 3.3;
    sg.hangBoard(S, { x: 0, y: yb, z: PZ - 5, rotY: 0, rodLen: 1.2, both: false, sections: [sg.sec.trains('5', -1, 'r')] });
    sg.hangBoard(S, { x: 0, y: yb, z: PZ - 5.3, rotY: Math.PI, rodLen: 1.2, both: false, sections: [sg.sec.exit({ streets: ZVEN_STREETS }, 'u', true)] });
    sg.hangBoard(S, { x: 0, y: yb, z: PZ - 14, rotY: 0, rodLen: 1.2, both: false, sections: [sg.sec.trains('5', 1, 'l'), tr('l')] });
    sg.hangBoard(S, { x: 0, y: yb, z: -15.2, rotY: 0, rodLen: 1.2, sections: [tr('l')] });
    sg.hangBoard(S, { x: 0, y: yb, z: -40, rotY: Math.PI, rodLen: 1.2, both: false, sections: [tr('r'), sg.sec.city('u', true)] });
    sg.hangBoard(S, { x: 0, y: yb, z: -60, rotY: Math.PI, rodLen: 1.2, both: false, sections: [sg.sec.exit({ streets: ZVEN_STREETS }, 'u', true)] });
    void PUSH_STREETS;
  }

  // ================================================================ the vestibule: the ground floor of the shopping centre (floor 5 cm over the street)
  const VR = VIT_ROOMS.zvenigorodskaya, CEIL = VR.ceil, FV = 0.05;
  const Sv = new Space(ctx, E.eframe, { name: 'zven-vestibule', tag: null, zone: 'zven-vestibule-fx' }), kv = Sv.k;
  const poly = insetPoly(VIT_FOOTPRINTS[VR.ring], 0.45);
  const dws = DOORWAYS.filter((d) => d.station === 'zvenigorodskaya'), dIn = dws.find((d) => d.kind === 'entrance'), dOut = dws.find((d) => d.kind === 'exit');
  const hole = [[-E.A, 0], [E.A, 0], [E.A, 13], [-E.A, 13]].map(([x, z]) => Sv.W(x, z));
  const vfloor = mat.toon('#b0aea4', { map: vitGranite(M) });
  const room = buildPolyRoom(ctx, M, { id: 'zven-vest', poly, ceil: CEIL, y0: FV, doors: dws.map((d) => ({ x: d.x, z: d.z, w: d.w, h: 3.0, arch: false })), holes: [hole],
    wallMat: mat.toon('#ffffff', { map: panelTex(ctx, M, 'zven-vwall', { base: '#efeee8', w: 1.2, h: 0.6, cols: 2, rows: 4, veins: 4 }), side: 'double' }), ceilMat: mat.toon('#f4f4f0', { side: 'double' }), floorMat: vfloor,
    lamps: { step: 4.6, mat: M.lampWhite, size: [1.4, 0.5], rot: -E.yaw } });
  res.room = room; res.FV = FV;
  const free = (x, z, r = 0.7) => [[r, 0], [-r, 0], [0, r], [0, -r], [0, 0]].every(([dx, dz]) => room.inside(...Sv.W(x + dx, z + dz)));
  shaftParapet(Sv, M, { A: E.A, len: 13, y: FV, mat: marble });
  for (let z = -6.0; z <= 6.0; z += 1.2) { if (free(-9, z, 0.4)) turnstile(kv, M, -9, FV, z, Math.PI / 2); }
  for (let z = -6.0; z <= 2.4; z += 1.2) { if (free(10, z, 0.4)) turnstile(kv, M, 10, FV, z, Math.PI / 2); }
  for (const [x, z] of [[-12.5, -6.0], [-12.5, -4.6], [-12.5, -3.2]]) if (free(x, z, 0.8)) { kv.box(0.6, 1.9, 0.8, M.kiosk, [x, FV + 0.95, z]); kv.box(0.05, 0.5, 0.6, M.lampCool, [x + 0.32, FV + 1.4, z]); Sv.col(x - 0.4, x + 0.4, FV - 0.5, FV + 2.1, z - 0.45, z + 0.45); }
  if (free(7.6, 4.2, 1.0)) { kv.box(1.3, 2.2, 1.7, mat.toon('#1b2e96'), [7.6, FV + 1.1, 4.2]); kv.box(1.34, 0.9, 1.6, M.glass, [7.6, FV + 1.6, 4.2]); Sv.col(6.9, 8.3, FV - 0.5, FV + 2.3, 3.3, 5.1); }          // the blue attendant booth
  { const p = kv.plane(3.0, 0.66, M.board(M.blueBoard('К поездам', 'To the trains', 'd', 'zven-v-trains', { bg: '#6E0A78' }), 1.0), [0, 3.0, -1.2], [0, Math.PI, 0]); p.castShadow = false; }
  { const p = kv.plane(2.8, 0.62, M.board(M.blueBoard('Выход в город', 'Way out · Звенигородская ул.', 'r', 'zven-v-exit', { bg: '#6E0A78' }), 1.0), [6.5, 3.0, -0.4], [0, 0, 0]); p.castShadow = false; }
  X.addVestZone('zvenigorodskaya', room.inside, CEIL + 2);
  { const g = new THREE.Group(); g.name = 'zvenigorodskaya-street'; ctx.addStatic(g); const kg = ctx.kit(g); for (const d of dws) doorFrame(kg, M, d, { h: 3.0 }); }

  // ================================================================ the station object, the ways out and in (tests)
  const rt = X.rtOf('zvenigorodskaya', X.net.zvenigorodskaya, Z, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: 'zvenigorodskaya', name, nameEn, frame: Z, stock: '717-l5', line: '5', idx: X.net.zvenigorodskaya.idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Звенигородская». Переход на станцию «Пушкинская». Выход на Звенигородскую улицу'),
  });
  X.stations.zvenigorodskaya = rt;
  const SeW = (x, z, tol) => { const q = Se.W(x, z); return tol ? [q[0], q[1], tol] : q; };
  const nOf = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)];
  res.exitRoute = () => { const [nx, nz] = nOf(dOut);
    return { start: [...toWorld(Z, 0, 30), FY], points: [toWorld(Z, 0, PZ - 3), toWorld(Z, 1, PZ + 1.5), SeW(3, E.run + 2.2, 0.4), SeW(3, E.run - 3, 0.3), SeW(3, 60, 0.3), SeW(3, 6, 0.3), SeW(3, -1.4), SeW(10, -2.2), [dOut.x - nx * 2.5, dOut.z - nz * 2.5], [dOut.x - nx * 0.6, dOut.z - nz * 0.6], [dOut.x + nx * 3.5, dOut.z + nz * 3.5]],
      door: [dOut.x, dOut.z], out: [dOut.x + nx * 3.5, dOut.z + nz * 3.5], outward: [nx, nz] }; };
  res.entryRoute = () => { const [nx, nz] = nOf(dIn);
    return { start: [dIn.x + nx * 4, dIn.z + nz * 4, 0], points: [[dIn.x - nx * 1.5, dIn.z - nz * 1.5], [dIn.x - nx * 3.0, dIn.z - nz * 3.0], SeW(-9, -3.5), SeW(-1, -2.2), SeW(-1, 3, 0.4), SeW(-1, E.run - 2, 0.5), SeW(-1, E.run + 3), toWorld(Z, 0, PZ - 4), toWorld(Z, 0, 30)], end: { station: 'zvenigorodskaya', y: FY } }; };
  Object.assign(res, { S, Se, Sv, hall, esc, rt, frame: Z, dims: D, FY, PZ, zFoot, vInfo });
  return res;
}
