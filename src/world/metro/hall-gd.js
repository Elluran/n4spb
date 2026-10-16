// metro/hall-gd.js — the CLOSED-TYPE hall of Gostiny Dvor (line 3, 56 m deep; docs/research/metro-west.md section 3, photos refs/metro-west 26-50): ONE wide white elliptical vault of ~45 ribbed rings over a
// 13.9 m wide platform; the two tracks run in separate tubes BEHIND cream-marble walls that have a black door recess every 4.4 m (the pitch of the train doors); a brushed-steel cornice shelf at 3.4 m hides the lamps,
// a green name band under it, hanging pill signs, dark granite floor. The platform doors are drawn as black panels that slide away while a train stands with open doors (dynamic colliders keep them shut
// otherwise). The ends open into the escalator arches (east: lower hall of the 4-lane incline; west: the bank of four short escalators to the Nevsky Prospekt chamber).
// Frame: origin = the middle of the platform, +z toward Mayakovskaya (ESE), x lateral, y absolute (platform level FY).
import * as THREE from 'three';
import { extrudeX, extrudeZ, archRing, floorGeo } from './lib.js';
import { STOCK, carOffset } from './train.js';
import { MeshBuilder, addCap } from '../lib/massing.js';

export const GDH = { EDGE: 6.95, WT: 0.5, TRK: 8.8, SPRING: 4.0, A: 5.75, B: 5.2, PZ: 70 };

export function buildGdHall(ctx, M, S, cfg) {
  const { mat, tex, physics } = ctx;
  const { EDGE, WT, TRK, A } = GDH, B = (cfg.skin && cfg.skin.B) || GDH.B, PZ = cfg.PZ ?? GDH.PZ, FY = cfg.FY, BED = FY - 1.1, SPG = FY + ((cfg.skin && cfg.skin.spring) || GDH.SPRING), k = S.k, X0 = EDGE + WT;
  const stock = STOCK[cfg.stock || 'neva'];
  const rep = (t, x, y) => M.rep(t, x, y);
  const ID = cfg.id || 'gd', sk = cfg.skin || {};                     // cfg.skin (all optional): wallMat, floor: [base, speckA, speckB, opts], vault, rib, band, shelf (material), door, ribs: false (a smooth vault); cfg.pills, cfg.endW / endE = null (a blind end wall)
  // ---- textures: cream marble blocks (0.9 x 0.6), grey-brown granite floor, green name band
  const wallTex = rep(tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#d9c7b0'; g.fillRect(0, 0, w, h); const r = ctx.rng('gd-wall'), n = 3, cw = w / n, ch = h / 4;
    for (let j = 0; j < 4; j++) for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,245,230,0.12)' : 'rgba(120,90,60,0.10)'; g.fillRect(i * cw, j * ch, cw, ch); }
    g.strokeStyle = 'rgba(120,95,70,0.35)'; g.lineWidth = 2; for (let j = 0; j <= 4; j++) { g.beginPath(); g.moveTo(0, j * ch); g.lineTo(w, j * ch); g.stroke(); }
    for (let j = 0; j < 4; j++) for (let i = 0; i <= n; i++) { const x = (i * cw + (j % 2) * cw / 2) % w; g.beginPath(); g.moveTo(x, j * ch); g.lineTo(x, (j + 1) * ch); g.stroke(); }
    for (let i = 0; i < 26; i++) { g.strokeStyle = 'rgba(140,100,70,0.18)'; g.lineWidth = 1.5; g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let q = 0; q < 4; q++) { x += (r() - 0.4) * 40; y += (r() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
  }, { key: 'gd-wall' }), 1 / 2.7, 1 / 2.4);
  const wallMat = sk.wallMat || mat.toon('#ffffff', { map: wallTex });
  const fl = sk.floor || ['#8d8a82', 'rgba(30,28,26,0.30)', 'rgba(255,255,255,0.28)', { joint: 'rgba(255,255,255,0.20)' }];
  const floorMat = sk.floorMat || mat.toon('#ffffff', { map: M.T.granite(ID + '-floor', fl[0], fl[1], fl[2], fl[3] || {}) });
  const vaultMat = mat.toon(sk.vault || '#f3f0e6', { side: 'double' }), ribMat = mat.toon(sk.rib || '#faf8f0', { side: 'double' }), darkPlaster = mat.toon('#4b4741', { side: 'double' }), steelShelf = sk.shelf || mat.toon('#8e8a7c');
  const doorMat = mat.toon(sk.door || '#1b1b1f', {});
  // ---- the recesses: z centres of the train doors (a 6-car NeVa train stands centred: 4 doors per car, pitch 4.4 m)
  const doorZ = []; for (let i = 0; i < stock.cars; i++) for (const dz of [-6.6, -2.2, 2.2, 6.6]) doorZ.push(carOffset(stock, i) + dz);
  doorZ.sort((a, b) => a - b);
  const holes = doorZ.map((z) => [[z - 0.725, FY], [z + 0.725, FY], [z + 0.725, FY + 2.3], [z - 0.725, FY + 2.3]]);
  // ---- the platform floor (with the sunk-stair opening when given), the vault, the ribs
  const stairHole = cfg.stairHole;                                                     // { x0, x1, z0, z1 } or null
  {
    const fb = new MeshBuilder(); const outer = [[-EDGE, -PZ], [EDGE, -PZ], [EDGE, PZ], [-EDGE, PZ]], hole = stairHole ? [[stairHole.x0, stairHole.z0], [stairHole.x1, stairHole.z0], [stairHole.x1, stairHole.z1], [stairHole.x0, stairHole.z1]] : null;
    addCap(fb, { o: outer.flat(), h: hole ? [hole.flat()] : [] }, FY, { uvScale: 2 });                 // local frame coordinates: the group carries the placement
    const fm = new THREE.Mesh(fb.build(), floorMat); fm.receiveShadow = true; S.group.add(fm);
  }
  const sh = stairHole;
  if (!sh) S.walk(-EDGE, EDGE, -PZ - 0.5, PZ + 0.5, FY, 1.1);
  else { S.walk(-EDGE, EDGE, -PZ - 0.5, sh.z0, FY, 1.1); S.walk(-EDGE, EDGE, sh.z1, PZ + 0.5, FY, 1.1); S.walk(-EDGE, sh.x0, sh.z0, sh.z1, FY, 1.1); S.walk(sh.x1, EDGE, sh.z0, sh.z1, FY, 1.1); }
  S.group.add(new THREE.Mesh(extrudeZ(archRing(A, SPG, 0.35, sk.spring ? FY + 3.9 : SPG, 0, 40, B), -PZ - 0.6, PZ + 0.6), vaultMat));      // skin.spring: a higher vault over a vertical lower part (the frieze)
  // ~45 broad ribbed rings (pitch 3.1 m), instanced
  if (sk.ribs !== false) { const RP = sk.ribPitch || 3.1, geo = extrudeZ(archRing(A - 0.16, SPG, 0.32, SPG, 0, 20, B - 0.15), -(sk.ribW ?? 0.26), sk.ribW ?? 0.26), n = Math.floor((2 * PZ - 4) / RP), im = new THREE.InstancedMesh(geo, ribMat, n), d = new THREE.Object3D();
    for (let i = 0; i < n; i++) { d.position.set(0, 0, -((n - 1) * RP) / 2 + i * RP); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
    im.instanceMatrix.needsUpdate = true; im.userData.noBatch = true; im.castShadow = false; im.frustumCulled = false; S.group.add(im); }
  // ---- the walls with the 24 door recesses per side, the cornice shelf (brushed steel, 1.2 m deep) with its lamp strip, the green band
  const band = mat.toon(sk.band || '#0f9b4a'), bandTex = M.board(M.nameBoard(cfg.name, cfg.nameEn, sk.band || '#0f9b4a', ID + '-band'), 1.0);
  const panels = [];
  for (const sx of [-1, 1]) {
    const g = extrudeX([[-PZ, FY - 0.5], [PZ, FY - 0.5], [PZ, FY + 3.4], [-PZ, FY + 3.4]], sx > 0 ? EDGE : -X0, sx > 0 ? X0 : -EDGE, holes.map((h) => h.map(([z, y]) => [z, y])));
    S.group.add(new THREE.Mesh(g, wallMat));
    // colliders between the recesses
    let z0c = -PZ; for (const z of doorZ) { if (z - 0.725 - z0c > 0.1) S.col(sx > 0 ? EDGE : -X0, sx > 0 ? X0 : -EDGE, FY - 1.2, FY + 4, z0c, z - 0.725); z0c = z + 0.725; } if (PZ - z0c > 0.1) S.col(sx > 0 ? EDGE : -X0, sx > 0 ? X0 : -EDGE, FY - 1.2, FY + 4, z0c, PZ);
    S.bx(sx > 0 ? EDGE - 1.2 : -EDGE, sx > 0 ? EDGE : -EDGE + 1.2, FY + 3.4, FY + 3.95, -PZ, PZ, steelShelf);                                       // cornice shelf
    S.bx(sx * (EDGE - 1.25) - 0.04, sx * (EDGE - 1.25) + 0.04, FY + 3.3, FY + 3.4, -PZ + 0.5, PZ - 0.5, M.lampWarm);                                 // lamp strip under it
    k.box(0.03, 0.5, 2 * PZ - 6, band, [sx * (EDGE - 0.015), FY + 2.85, 0]);
    for (let z = -PZ + 14; z < PZ - 10; z += 14) { const p = k.plane(4.2, 0.46, bandTex, [sx * (EDGE - 0.04), FY + 2.85, z], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); p.castShadow = false; }
    // black door panels (merged, one mesh per side): visible while the platform doors are shut
    const gs = holes.map((h, i) => { const gg = new THREE.BoxGeometry(0.08, 2.3, 1.45); gg.translate(sx * (EDGE + 0.12), FY + 1.15, doorZ[i]); return gg; });
    const merged = ctx.geo.mergeGeometries(gs, false), pm = new THREE.Mesh(merged, doorMat); pm.userData.noBatch = true; pm.castShadow = false; S.group.add(pm); panels.push({ sx, mesh: pm });
    // the track box behind the wall (seen through the recesses): slab, bed, rails, outer wall, ceiling
    const bx0 = sx > 0 ? X0 : -X0 - 3.4, bx1 = sx > 0 ? X0 + 3.4 : -X0;
    S.bx(bx0, bx1, BED - 0.4, BED, -PZ, PZ, M.concreteDark);
    S.bx(sx > 0 ? bx1 : bx0 - 0.15, sx > 0 ? bx1 + 0.15 : bx0, BED, FY + 3.25, -PZ, PZ, darkPlaster); S.bx(bx0 - (sx < 0 ? 0.15 : 0), bx1 + (sx > 0 ? 0.15 : 0), FY + 3.1, FY + 3.25, -PZ, PZ, darkPlaster);
    const bedMat = mat.toon('#ffffff', { map: M.T.bed() });
    S.group.add(new THREE.Mesh(floorGeo(bx0, bx1, -PZ, PZ, BED + 0.01, 1 / 4.2, true, 1 / 1.3), bedMat));
    const tx = sx * TRK; for (const dx of [-0.76, 0.76]) S.bx(tx + dx - 0.04, tx + dx + 0.04, BED + 0.01, BED + 0.17, -PZ, PZ, M.railTop);
    const cx = tx + sx * 1.45; S.bx(cx - 0.07, cx + 0.07, BED + 0.01, BED + 0.13, -PZ, PZ, M.thirdRail);
    S.walk(bx0, bx1, -PZ, PZ, BED + 0.12, 1.0);
    // black caps over the recess openings seen from the platform side: rubber seals are not modelled
  }
  // ---- skin extras (Vasileostrovskaya): a smalt frieze on the vertical lower part of the vault, fins under the cornice shelf, bronze name letters on the wide piers between the cars
  if (sk.frieze) for (const sx of [-1, 1]) S.group.add(new THREE.Mesh(extrudeX([[-PZ + 0.4, FY + 3.9], [PZ - 0.4, FY + 3.9], [PZ - 0.4, SPG + 0.02], [-PZ + 0.4, SPG + 0.02]], sx > 0 ? A - 0.05 : -A, sx > 0 ? A : -A + 0.05), sk.frieze));
  if (sk.fins) {
    const nf = Math.floor((2 * PZ - 2) / 0.5), imf = new THREE.InstancedMesh(new THREE.BoxGeometry(1.0, 0.24, 0.05), sk.fins, 2 * nf), df = new THREE.Object3D(); let fi = 0;
    for (const sx of [-1, 1]) for (let j = 0; j < nf; j++) { df.position.set(sx * (EDGE - 0.7), FY + 3.28, -PZ + 1 + j * 0.5); df.updateMatrix(); imf.setMatrixAt(fi++, df.matrix); }
    imf.instanceMatrix.needsUpdate = true; imf.userData.noBatch = true; imf.castShadow = false; imf.frustumCulled = false; S.group.add(imf);
  }
  if (sk.letters) {
    const lm = mat.decal('#ffffff', { map: sk.letters });
    for (const sx of [-1, 1]) for (let i = 0; i + 1 < doorZ.length; i++) if (doorZ[i + 1] - doorZ[i] > 5) { const p = k.plane(4.6, 0.46, lm, [sx * (EDGE - 0.03), FY + 1.75, (doorZ[i] + doorZ[i + 1]) / 2], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); p.castShadow = false; }
  }
  // ---- the two ends: caps with an arched opening (west: escalator bank, east: lower hall), tunnel mouths of the two tracks
  const circle = (cx, cy, r, n = 26) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(-i * 2 * Math.PI / n), cy + r * Math.sin(-i * 2 * Math.PI / n)]);
  const outl = []; { outl.push([-X0, FY - 0.5], [-X0, SPG], [-A, SPG]); for (let i = 1; i < 28; i++) { const t = Math.PI - i * Math.PI / 28; outl.push([A * Math.cos(t), SPG + B * Math.sin(t)]); } outl.push([A, SPG], [X0, SPG], [X0, FY - 0.5]); }
  const mouths = [];
  for (const zs of [-1, 1]) {
    const z0 = zs > 0 ? PZ : -PZ - 0.6, en = zs > 0 ? cfg.endE : cfg.endW, hw = en ? en.halfW : 0, sp = en ? en.spring : 0;
    const archPts = [[-hw, FY]]; for (let i = 0; i <= 12; i++) { const t = Math.PI - i * Math.PI / 12; archPts.push([hw * Math.cos(t), FY + sp + hw * Math.sin(t)]); } archPts.push([hw, FY]);
    S.group.add(new THREE.Mesh(extrudeZ(outl, z0, z0 + 0.6, en ? [archPts] : null), sk.endMat || wallMat));
    if (en) { S.col(-X0, -hw, FY - 1.2, FY + 12, z0, z0 + 0.6); S.col(hw, X0, FY - 1.2, FY + 12, z0, z0 + 0.6); } else S.col(-X0, X0, FY - 1.2, FY + 12, z0, z0 + 0.6);
    for (const sx of [-1, 1]) {            // the tunnel mouth plate of each track
      const px0 = sx > 0 ? X0 : -X0 - 4.3, zz = zs > 0 ? PZ : -PZ - 0.6, clampX = (p) => [sx > 0 ? Math.max(p[0], X0 + 0.1) : Math.min(p[0], -X0 - 0.1), p[1]];
      S.group.add(new THREE.Mesh(extrudeZ([[px0, BED - 0.5], [px0 + 4.3, BED - 0.5], [px0 + 4.3, BED + 4.6], [px0, BED + 4.6]], zz, zz + 0.6, [circle(sx * TRK, BED + 2.0, 2.72).map(clampX)]), M.plasterWarm));
      S.col(px0, px0 + 4.3, BED - 1.2, FY + 6, zz, zz + 0.6);
      const path = zs > 0 ? [[sx * TRK, BED, PZ + 0.6], [sx * TRK, BED, PZ + 0.6 + 40]] : [[sx * TRK, BED, -PZ - 0.6], [sx * TRK, BED, -PZ - 0.6 - 40]];
      mouths.push({ sx, zs, path });
    }
  }
  // ---- platform furniture: hanging pill signs, SOS pillars, LED clocks over the arches
  const pill = (z, text, sub, key, bg, f) => { const p = k.plane(2.7, 0.62, M.board(M.blueBoard(text, sub, null, key, { bg }), 1.0), [0, FY + 3.1, z + f * 0.06], [0, f > 0 ? 0 : Math.PI, 0]); p.castShadow = false; for (const dx of [-1.1, 1.1]) k.cyl(0.012, 0.012, 1.7, M.steelBlack, [dx, FY + 4.2, z], null, 4); };
  if (cfg.pills) { for (const f of [1, -1]) for (const [i, p] of cfg.pills.entries()) pill(p.z, p.text, p.sub, ID + '-pill-' + i, p.bg, f); }
  else for (const f of [1, -1]) { pill(-44, 'Василеостровская · Vasileostrovskaya', 'Линия 3 · Гостиный двор', 'gd-pill-1', '#14a04f', f); pill(-8, 'Выход · Way out', 'Невский проспект · Садовая', 'gd-pill-2', '#1b35d8', f); pill(30, 'Площадь Александра Невского 1 · Ploshchad Aleksandra Nevskogo 1', 'Линия 3 · Гостиный двор', 'gd-pill-3', '#14a04f', f); }
  for (const [x, z] of cfg.sos || [[3.2, -48], [-3.2, 36]]) { k.box(0.5, 2.2, 0.5, M.marbleWhite, [x, FY + 1.1, z]); k.box(0.52, 0.2, 0.52, M.green, [x, FY + 2.0, z]); S.col(x - 0.25, x + 0.25, FY, FY + 2.3, z - 0.25, z + 0.25); }
  for (const zz of [-PZ + 1.0, PZ - 1.0]) k.box(0.7, 0.28, 0.06, M.lampAmber, [0, FY + 5.2, zz]);
  void physics;
  return { FY, BED, EDGE, TRK, PZ, X0, doorZ, mouths, panels, openings: { z0: doorZ[0], step: 4.4 }, SPG };
}
