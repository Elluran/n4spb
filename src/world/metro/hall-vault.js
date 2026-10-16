// metro/hall-vault.js — a SINGLE-VAULT deep station of the 1990s (Chkalovskaya; the upper level of Sportivnaya): docs/research/metro-petro.md, photos refs/metro-petro 20, 30, 31.
//   one wide elliptical vault of broad white rings over an island platform, the two tracks open at its sides, track walls clad in pale marble with a dark name band, tunnel mouths in both end
//   walls, an arched opening in an end wall where the incline arrives. The station module adds its own lamps, floor pattern and furniture.
//   cross-section: island platform |x| < EDGE, tracks at x = +-TRK (the train that runs toward +z uses x = -TRK), track walls at +-WALL, vault spring FY + SPRING, vertical semi-axis B.
//   The tracks are 7.6 m from the axis so that the running tunnels (R 2.7) pass clear of the escalator tube (half width 4.55) that leaves the hall end between them.
//   cfg: { id, FY, PZ, dims, name, nameEn, skin: { vault, rib, wallMat, floorMat, band }, endHole: { N, S: { halfW, spring } }, tracks: { neg, pos } (false = a reserve side: bed without rails,
//          a fence along the platform edge, no tunnel mouths), holes: [{ z0, z1, x0, x1, r? }] openings in the platform floor (round wells when r is set), vault: false (a flat ceiling is the caller's) }
import * as THREE from 'three';
import { extrudeZ, extrudeX, archRing, archHole, floorGeo } from './lib.js';
import { TUBE_R, TUBE_CY } from './tunnel.js';
import { serviceStairs } from './stairs.js';
import { MeshBuilder, addCap } from '../lib/massing.js';

export const VAULT = { EDGE: 6.1, TRK: 7.6, WALL: 10.3, SPRING: 3.0, B: 6.4 };
/** the grey granite of the generic hall (one canvas for every new floor), tinted by the material colour */
export const sharedFloor = (ctx, M, tint = '#ffffff') => ctx.mat.toon(tint, { map: M.T.granite('gen-floor', '#8b8782', 'rgba(25,25,28,0.35)', 'rgba(255,255,255,0.30)') });
export const circlePoly = (cx, cz, r, n = 28) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(i * 2 * Math.PI / n), cz + r * Math.sin(i * 2 * Math.PI / n)]);

export function buildVaultHall(ctx, M, S, cfg) {
  const { mat } = ctx, k = S.k;
  const { EDGE, TRK, WALL, SPRING, B } = { ...VAULT, ...(cfg.dims || {}) }, PZ = cfg.PZ, FY = cfg.FY, BED = FY - 1.1, SPS = FY + SPRING, ID = cfg.id, sk = cfg.skin || {};
  const live = { '-1': cfg.tracks ? !!cfg.tracks.neg : true, 1: cfg.tracks ? !!cfg.tracks.pos : true };
  const top = cfg.top ?? SPS;                                                    // height of the track walls (a flat-ceiling hall passes its ceiling level)
  const colTop = cfg.vault === false ? top : FY + 12;                            // colliders of a flat-ceiling hall stop at its ceiling: another level lies above it (Sportivnaya)
  // ---------------------------------------------------------------- the vault and its broad rings
  const vaultMat = mat.toon(sk.vault || '#f1efe8', { side: 'double' }), ribMat = mat.toon(sk.rib || '#fbfaf4', { side: 'double' });
  if (cfg.vault !== false) {
    S.group.add(new THREE.Mesh(extrudeZ(archRing(WALL, SPS, 0.5, SPS, 0, 44, B), -PZ - 0.6, PZ + 0.6), vaultMat));
    const pitch = cfg.ribPitch || 4.4, n = Math.floor((2 * PZ - 1) / pitch), geo = extrudeZ(archRing(WALL - 0.2, SPS + 0.02, 0.34, SPS + 0.02, 0, 26, B - 0.2), -pitch * 0.29, pitch * 0.29);
    const im = new THREE.InstancedMesh(geo, ribMat, n), d = new THREE.Object3D();
    for (let i = 0; i < n; i++) { d.position.set(0, 0, -((n - 1) * pitch) / 2 + i * pitch); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
    im.instanceMatrix.needsUpdate = true; im.userData.noBatch = true; im.castShadow = false; im.frustumCulled = false; S.group.add(im);
    for (const sx of [-1, 1]) S.bx(sx * (WALL - 0.42) - 0.05, sx * (WALL - 0.42) + 0.05, SPS + 0.25, SPS + 0.37, -PZ + 1, PZ - 1, M.lampWarm);        // cove strips at the vault foot
  }
  // ---------------------------------------------------------------- the platform: floor (with the openings), body, edges
  const holes = (cfg.holes || []).slice().sort((a, b) => a.z0 - b.z0), hx = holes.length ? Math.max(...holes.map((h) => Math.max(-h.x0, h.x1))) + 0.05 : 0;
  const floorMat = sk.floorMat || sharedFloor(ctx, M);
  {
    const fb = new MeshBuilder(), outer = [[-EDGE, -PZ - 0.6], [EDGE, -PZ - 0.6], [EDGE, PZ + 0.6], [-EDGE, PZ + 0.6]];
    const hp = holes.map((h) => (h.r ? circlePoly((h.x0 + h.x1) / 2, (h.z0 + h.z1) / 2, h.r, 32) : [[h.x0, h.z0], [h.x1, h.z0], [h.x1, h.z1], [h.x0, h.z1]]));
    addCap(fb, { o: outer.flat(), h: hp.map((p) => p.flat()) }, FY, { uvScale: 2 });
    const fm = new THREE.Mesh(fb.build(), floorMat); fm.receiveShadow = true; S.group.add(fm);
  }
  // rectangles of the solid platform: the two side strips + the centre strip between the openings
  const pieces = [];
  if (!holes.length) pieces.push([-EDGE, EDGE, -PZ - 0.7, PZ + 0.7]);
  else {
    pieces.push([-EDGE, -hx, -PZ - 0.7, PZ + 0.7], [hx, EDGE, -PZ - 0.7, PZ + 0.7]);
    let z = -PZ - 0.7; for (const h of holes) { if (h.z0 - z > 0.05) pieces.push([-hx, hx, z, h.z0]); z = h.z1; } if (PZ + 0.7 - z > 0.05) pieces.push([-hx, hx, z, PZ + 0.7]);
    for (const h of holes) { if (h.x0 > -hx + 0.06) pieces.push([-hx, h.x0, h.z0, h.z1]); if (h.x1 < hx - 0.06) pieces.push([h.x1, hx, h.z0, h.z1]); }
  }
  const thick = cfg.slab ?? 1.1;
  for (const [x0, x1, z0, z1] of pieces) { S.walk(x0, x1, z0, z1, FY, thick); S.bx(x0, x1, FY - thick, FY - 0.02, Math.max(z0, -PZ - 0.6), Math.min(z1, PZ + 0.6), M.concrete); }
  const bedMat = mat.toon('#ffffff', { map: M.T.bed() });
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? EDGE : -WALL + 0.15, x1 = sx > 0 ? WALL - 0.15 : -EDGE, on = live[sx];
    S.bx(x0, x1, BED - 0.4, BED - 0.01, -PZ, PZ, M.concreteDark);
    if (on) {
      S.group.add(new THREE.Mesh(floorGeo(x0, x1, -PZ, PZ, BED, 1 / 4.2, true, 1 / 1.3), bedMat)); S.walk(x0, x1, -PZ, PZ, BED + 0.12, 1.0);
      const tx = sx * TRK; for (const dx of [-0.76, 0.76]) S.bx(tx + dx - 0.04, tx + dx + 0.04, BED + 0.01, BED + 0.17, -PZ, PZ, M.railTop);
      const cx = tx + sx * 1.45; S.bx(cx - 0.07, cx + 0.07, BED + 0.01, BED + 0.13, -PZ, PZ, M.thirdRail); S.bx(cx - 0.12, cx + 0.12, BED + 0.13, BED + 0.17, -PZ, PZ, M.woodDark);
      S.bx(sx > 0 ? EDGE - 0.6 : -EDGE, sx > 0 ? EDGE : -EDGE + 0.6, FY - 0.02, FY + 0.03, -PZ, PZ, M.black); S.bx(sx > 0 ? EDGE - 0.45 : -EDGE + 0.35, sx > 0 ? EDGE - 0.35 : -EDGE + 0.45, FY + 0.03, FY + 0.045, -PZ, PZ, M.yellow);
    } else {                                                       // reserve side: an empty bed behind a steel fence
      S.group.add(new THREE.Mesh(floorGeo(x0, x1, -PZ, PZ, BED, 1), M.concreteDark));
      const fx = sx * (EDGE - 0.12);
      for (const y of [FY + 0.5, FY + 1.05]) S.bx(fx - 0.025, fx + 0.025, y - 0.025, y + 0.025, -PZ + 0.3, PZ - 0.3, M.stainless);
      S.col(fx - 0.12, fx + 0.12, FY - 0.3, FY + 1.25, -PZ, PZ);
    }
  }
  // fence posts of the reserve side(s): instanced
  { const sides = [-1, 1].filter((sx) => !live[sx]); if (sides.length) { const n = Math.floor((2 * PZ - 1) / 2.4) + 1, im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 1.1, 0.06), M.stainless, n * sides.length), d = new THREE.Object3D(); let i = 0;
    for (const sx of sides) for (let j = 0; j < n; j++) { d.position.set(sx * (EDGE - 0.12), FY + 0.55, -PZ + 0.5 + j * 2.4); d.updateMatrix(); im.setMatrixAt(i++, d.matrix); }
    im.instanceMatrix.needsUpdate = true; im.userData.noBatch = true; im.castShadow = false; im.frustumCulled = false; S.group.add(im); } }
  // ---------------------------------------------------------------- track walls with the name band
  const wallMat = sk.wallMat || mat.toon('#ffffff', { map: M.T.trackWall(ID + '-wall', { plaster: '#e4ddcb', marble: '#c8bda4', vein: '#8e8470', skirt: '#1b1b21', corn: '#efe9d8' }) });
  const bandCol = sk.band || '#2a2548', bandMat = mat.toon(bandCol), bandY = sk.bandY ?? 2.75, bandTex = M.board(M.nameBoard(cfg.name, cfg.nameEn, bandCol, sk.bandKey || ID + '-band'), 1.0);
  for (const sx of [-1, 1]) {
    const g = extrudeX([[-PZ, 0], [PZ, 0], [PZ, top - BED], [-PZ, top - BED]], sx > 0 ? WALL - 0.15 : -WALL, sx > 0 ? WALL : -WALL + 0.15); g.translate(0, BED, 0);
    S.group.add(new THREE.Mesh(g, wallMat));
    S.bx(sx > 0 ? WALL - 0.2 : -WALL + 0.14, sx > 0 ? WALL - 0.14 : -WALL + 0.2, BED, FY - 0.1, -PZ, PZ, M.blackTile);                                  // dark plinth below the platform level
    S.col(sx > 0 ? WALL - 0.15 : -WALL - 1.0, sx > 0 ? WALL + 1.0 : -WALL + 0.15, BED - 1.2, colTop, -PZ, PZ);
    const fx = sx > 0 ? WALL - 0.17 : -WALL + 0.17, rotY = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    k.box(0.03, 0.3, 2 * PZ, bandMat, [fx - sx * 0.015, FY + bandY, 0]);
    for (let z = -PZ + 14; z < PZ - 6; z += 26) { const p = k.plane(3.4, 0.4, bandTex, [fx - sx * 0.04, FY + bandY, z], [0, rotY, 0]); p.castShadow = false; }
    if (live[sx]) for (const hh of [FY + 0.25, FY + 0.45]) S.bx(fx - (sx > 0 ? 0.07 : 0), fx + (sx > 0 ? 0 : 0.07), hh, hh + 0.06, -PZ + 1, PZ - 1, M.cable);
  }
  // ---------------------------------------------------------------- end walls: tunnel mouths of the live tracks, the arched opening of the incline
  const outline = () => { const p = [[-WALL, BED - 0.5], [-WALL, SPS]]; if (cfg.vault !== false) for (let i = 1; i < 44; i++) { const t = Math.PI - i * Math.PI / 44; p.push([WALL * Math.cos(t), SPS + B * Math.sin(t)]); } p.push([WALL, SPS], [WALL, BED - 0.5]); return p; };
  const circle = (cx, cy, r, n = 26) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(-i * 2 * Math.PI / n), cy + r * Math.sin(-i * 2 * Math.PI / n)]);
  const endMat = sk.endMat || M.plasterWarm, mouths = [];
  for (const zs of [-1, 1]) {
    const z0 = zs > 0 ? PZ : -PZ - 0.6, eh = cfg.endHole && cfg.endHole[zs > 0 ? 'S' : 'N'], hs = [];
    for (const sx of [-1, 1]) if (live[sx]) { hs.push(circle(sx * TRK, BED + TUBE_CY, TUBE_R + 0.02)); mouths.push({ sx, zs }); }
    if (eh) hs.push(archHole(0, eh.halfW, FY, FY + eh.spring, 12));
    S.group.add(new THREE.Mesh(extrudeZ(outline(), z0, z0 + 0.6, hs), endMat));
    // colliders: the wall is solid except the opening of the incline (the tunnel mouths are closed for walkers)
    if (eh) { S.col(-WALL, -eh.halfW, BED - 1.2, colTop, z0, z0 + 0.6); S.col(eh.halfW, WALL, BED - 1.2, colTop, z0, z0 + 0.6); } else S.col(-WALL, WALL, BED - 1.2, colTop, z0, z0 + 0.6);
  }
  const sides = [-1, 1].filter((sx) => live[sx]);
  if (sides.length) serviceStairs(ctx, M, S, { FY, BED, EDGE, zs: [-(PZ - 2.6), PZ - 2.6], sides });
  return { FY, BED, SPS, EDGE, TRK, WALL, PZ, B, mouths, floorMat, wallMat, vaultMat, live, pieces };
}
