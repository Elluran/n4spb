// metro/hall-pylon.js — a three-vault PYLON station of the 1950s (Ploshchad Vosstaniya, Vladimirskaya): docs/research/metro.md sections 2 and C, photos 01-04 / 60-62.
//
//   cross-section (local x, symmetric about the axis): central hall |x| < 4.4 (vault R 4.4, spring +4.0 m over the platform), pylon rows 4.4 .. 6.2 with 3.4 m arched openings every 6 m
//   (pylons 2.6 m), side halls 6.2 .. 13.4 (vault R 3.6, spring +3.6) with the platform strip to x = 8.5 and the track at x = +-10 (right-hand running: the train that goes toward +z uses
//   x = -10), track walls clad in marble to platform level + 1.0, black tile skirting, plaster above, bronze letters, grille doors "1955".
//   z: platform 165 m (+-82.5; trains stop within +-77 so the end caps carry the service stairs), a lower hall behind the north bulkhead where the escalator tube arrives.
//   Everything below the street: the caller passes a Space (tag 'under').
import * as THREE from 'three';
import { extrudeZ, extrudeX, archRing, archHole, floorGeo, loft } from './lib.js';
import { buildTunnel, TUBE_R, TUBE_CY } from './tunnel.js';
import { serviceStairs } from './stairs.js';

export const PYLON = { C: 4.4, PY: 6.2, EDGE: 8.5, TRK: 10.0, WALL: 13.4, PZ: 82.5, ZTRAIN: 77, RS: 3.6 };

export function buildPylonHall(ctx, M, S, cfg) {
  const { mat, tex, physics } = ctx;
  const { C, PY, EDGE, TRK, WALL, RS } = { ...PYLON, ...(cfg.dims || {}) }, PZ = cfg.PZ ?? PYLON.PZ, PIT = cfg.pitch ?? 6, OW = cfg.openW ?? 3.4;      // cfg.dims: another cross-section (Gorny Institut), cfg.pitch / openW: pylon pitch and opening width
  const FY = cfg.FY, BED = FY - 1.1, SPC = FY + 4.0, SPS = FY + 3.6, CXS = (PY + WALL) / 2;
  const nOpen = 2 * Math.floor((PZ - 9) / PIT) + 1, openZ = Array.from({ length: nOpen }, (_, i) => (i - (nOpen - 1) / 2) * PIT), pylonZ = Array.from({ length: nOpen + 1 }, (_, i) => openZ[0] - PIT / 2 + i * PIT);
  const column = !!cfg.column, plain = !!cfg.plain;                  // plain: structure only, the station module adds its own decoration (ribs, medallions, doors, lamps, benches ...)
  const ZL = cfg.zLow ?? -PZ;                                         // north end of the (lower) central hall
  const CEN = cfg.central || null;                                    // [zA, zB]: a SHORTENED central hall (Gorkovskaya): the central vault and the openings exist only between zA and zB, the pylon rows are blind walls elsewhere
  const openZc = CEN ? openZ.filter((z) => z - OW / 2 > CEN[0] + 0.4 && z + OW / 2 < CEN[1] - 0.4) : openZ;
  const skin = cfg.skin || {};
  const k = S.k;
  const toonMap = (map, o) => mat.toon('#ffffff', { map, ...o });
  const pylonMat = cfg.pylonMat || toonMap(M.T.pylonWall(cfg.id + '-pylon', skin.pylon)), trackMat = cfg.trackMat || toonMap(M.T.trackWall(cfg.id + '-track', skin.track));      // cfg.pylonMat / trackMat / floorMat: ready materials (uv in metres)
  const fsp = skin.floorSpeck || ['rgba(40,10,5,0.35)', 'rgba(255,225,200,0.30)', '#5a2a20'];
  const floorTex = cfg.floorMat ? null : M.T.granite(cfg.id + '-floor', skin.floor || '#9b4f3f', fsp[0], fsp[1], fsp[2] ? { tint: fsp[2] } : {});
  const floorMat = cfg.floorMat || toonMap(floorTex);
  let sideFloorMat = null;      // painted on first use only: no hall builder uses it today (six unused 512 px granite canvases, 1.6 M px, before 2026-10-15)
  const sideFloor = () => sideFloorMat || (sideFloorMat = cfg.floorMat || toonMap(M.T.granite(cfg.id + '-sfloor', skin.sideFloor || '#7d7a78', 'rgba(20,20,22,0.35)', 'rgba(255,255,255,0.28)')));
  const bedTex = M.T.bed ? M.T.bed : null; void bedTex;

  // ---------------------------------------------------------------- vaults
  const noLower = ZL > -PZ - 0.1;
  const centralShell = new THREE.Mesh(extrudeZ(archRing(C, SPC, 0.5, SPC, 0, 40), CEN ? CEN[0] - 0.6 : (noLower ? -PZ - 0.6 : ZL), CEN ? CEN[1] + 0.6 : PZ + 0.6), cfg.vaultMat || M.ceiling); S.group.add(centralShell);
  for (const sx of [-1, 1]) {
    const sm = new THREE.Mesh(extrudeZ(archRing(RS, SPS, 0.5, SPS, sx * CXS, 36), -PZ, PZ + 0.6), cfg.sideVaultMat || cfg.vaultMat || M.ceiling); S.group.add(sm);
  }
  // arch ribs over every pylon with a light ring on the inner edge (the nested arcs of photo 04)
  const ribGeo = extrudeZ(archRing(C - 0.28, SPC, 0.31, SPC, 0, 28), -0.35, 0.35), glowGeo = extrudeZ(archRing(C - 0.38, SPC, 0.12, SPC, 0, 28), -0.17, 0.17);
  if (!plain) for (const z of pylonZ.slice(1, -1)) {
    const r = new THREE.Mesh(ribGeo, M.white); r.position.z = z; S.group.add(r);
    const gl = new THREE.Mesh(glowGeo, M.lampWhite); gl.position.z = z; S.group.add(gl);
  }
  // lower-hall ribs (no pylons there)
  if (!plain) for (let z = ZL + 4; z < -PZ - 2; z += 6) { const r = new THREE.Mesh(ribGeo, M.white); r.position.z = z; S.group.add(r); const gl = new THREE.Mesh(glowGeo, M.lampWhite); gl.position.z = z; S.group.add(gl); }
  // cove strips along the vault base of the central hall
  for (const sx of [-1, 1]) S.bx(sx * (C - 0.14) - 0.07, sx * (C - 0.14) + 0.07, SPC + 0.05, SPC + 0.15, (CEN ? CEN[0] : ZL) + 0.5, (CEN ? CEN[1] : PZ) - 0.5, M.lampWarm);

  // ---------------------------------------------------------------- pylon rows (extruded profile with arched openings, uv in metres)
  const holes = openZc.map((z) => archHole(z, column ? 2.0 : OW / 2, -0.3, column ? 1.6 : (cfg.openSpring ?? 1.9), 10));   // 3.4 m openings between 2.6 m pylons (column station: 4 m between 2 m columns)
  const pylonProfile = [[-PZ, -0.5], [PZ, -0.5], [PZ, 4.0], [-PZ, 4.0]];
  for (const sx of [-1, 1]) {
    const g = extrudeX(pylonProfile, sx > 0 ? C : -PY, sx > 0 ? PY : -C, holes); g.translate(0, FY, 0);
    const m = new THREE.Mesh(g, pylonMat); S.group.add(m);
    // colliders: the pylons (the openings stay free)
    const x0 = sx > 0 ? C : -PY, x1 = sx > 0 ? PY : -C;
    if (CEN) { let zc = -PZ; for (const z of openZc) { S.col(x0, x1, FY - 1.2, FY + 4.0, zc, z - OW / 2); zc = z + OW / 2; } S.col(x0, x1, FY - 1.2, FY + 4.0, zc, PZ); }
    else {
    S.col(x0, x1, FY - 1.2, FY + 4.0, -PZ, openZ[0] - (column ? 2.0 : OW / 2));
    for (const z of pylonZ.slice(1, -1)) S.col(x0, x1, FY - 1.2, FY + 4.0, z - (column ? 1.0 : (PIT - OW) / 2), z + (column ? 1.0 : (PIT - OW) / 2));
    S.col(x0, x1, FY - 1.2, FY + 4.0, openZ[nOpen - 1] + (column ? 2.0 : OW / 2), PZ);
    }
    // medallions (bronze grilles with a gold ring) on the pylon faces toward the central hall
    if (plain) { /* decorated by the station module */ } else if (column) for (const z of pylonZ.slice(1, -1)) {            // old-style wall lanterns (black iron, opal glass, pyramidal cap) on brackets, one per column
      const fx = sx > 0 ? C - 0.02 : -C + 0.02;
      k.box(0.5, 0.06, 0.06, M.steelBlack, [fx - sx * 0.25, FY + 3.0, z]); k.box(0.34, 0.5, 0.34, M.lampWarm, [fx - sx * 0.6, FY + 3.05, z]); k.cyl(0.02, 0.27, 0.22, M.steelBlack, [fx - sx * 0.6, FY + 3.4, z], null, 4); k.box(0.38, 0.05, 0.38, M.steelBlack, [fx - sx * 0.6, FY + 2.78, z]);
    }
    else for (const z of pylonZ.slice(1, -1)) {
      const face = sx > 0 ? C - 0.02 : -C + 0.02;
      const ring = k.cyl(0.78, 0.78, 0.05, M.gold, [face - sx * 0.025, FY + 2.75, z], [0, 0, Math.PI / 2], 20);
      k.cyl(0.66, 0.66, 0.08, M.bronze, [face - sx * 0.05, FY + 2.75, z], [0, 0, Math.PI / 2], 20); void ring;
      k.cyl(0.07, 0.07, 0.1, M.gold, [face - sx * 0.1, FY + 2.75, z], [0, 0, Math.PI / 2], 8);
    }
  }
  // lower hall walls (plain, same cladding): z from ZL to -PZ
  for (const sx of [-1, 1]) {
    const lp = [[ZL, -0.5], [-PZ, -0.5], [-PZ, 4.0], [ZL, 4.0]];
    const g = extrudeX(lp, sx > 0 ? C - 0.3 : -C, sx > 0 ? C : -C + 0.3); g.translate(0, FY, 0);
    S.group.add(new THREE.Mesh(g, pylonMat));
    S.col(sx > 0 ? C - 0.3 : -C - 0.5, sx > 0 ? C + 0.5 : -C + 0.3, FY - 1.2, FY + 9, ZL, -PZ);
  }

  // ---------------------------------------------------------------- floors
  const platform = new THREE.Mesh(floorGeo(-EDGE, EDGE, ZL, PZ, FY, 0.5), floorMat); platform.receiveShadow = true; S.group.add(platform);   // uv: 2 m tile
  S.bx(-EDGE, EDGE, BED, FY - 0.02, ZL, PZ, M.concrete);
  for (const sx of [-1, 1]) {
    // black border with the Greek-key meander along the pylons, platform-edge strip + yellow safety line
    const stripX0 = sx > 0 ? 3.3 : -4.1, stripX1 = sx > 0 ? 4.1 : -3.3;
    if (!cfg.noMeander) { const st = new THREE.Mesh(floorGeo(stripX0, stripX1, ZL, PZ, FY + 0.02, 1 / 0.8, true, 1 / 1.6), mat.toon('#ffffff', { map: M.T.meander })); S.group.add(st); }
    else if (!plain) S.bx(stripX0 + 0.4, stripX1 - 0.4, FY - 0.0, FY + 0.02, ZL, PZ, M.black);
    S.bx(sx > 0 ? EDGE - 0.7 : -EDGE, sx > 0 ? EDGE : -EDGE + 0.7, FY - 0.02, FY + 0.03, -PZ, PZ, M.black);
    S.bx(sx > 0 ? EDGE - 0.5 : -EDGE + 0.4, sx > 0 ? EDGE - 0.4 : -EDGE + 0.5, FY + 0.03, FY + 0.045, -PZ, PZ, M.yellow);
  }
  S.walk(-EDGE, EDGE, ZL, PZ, FY, 1.1);
  // side platform strips are part of the same slab; the track beds
  const bedMat = toonMap(M.T.bed());
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? EDGE : -WALL + 0.15, x1 = sx > 0 ? WALL - 0.15 : -EDGE;
    const bed = new THREE.Mesh(floorGeo(x0, x1, -PZ, PZ, BED, 1 / 4.75, true, 1 / 1.3), bedMat); S.group.add(bed);
    S.bx(x0, x1, BED - 0.4, BED - 0.01, -PZ, PZ, M.concreteDark);
    S.walk(x0, x1, -PZ, PZ, BED + 0.12, 1.0);
    const tx = sx * TRK;
    for (const dx of [-0.76, 0.76]) S.bx(tx + dx - 0.04, tx + dx + 0.04, BED + 0.01, BED + 0.17, -PZ, PZ, M.railTop);
    const cx = tx + sx * 1.55 * (sx > 0 ? 1 : 1) * 0 + (sx > 0 ? 1.45 : -1.45);
    S.bx(cx - 0.07, cx + 0.07, BED + 0.01, BED + 0.13, -PZ, PZ, M.thirdRail); S.bx(cx - 0.12, cx + 0.12, BED + 0.13, BED + 0.17, -PZ, PZ, M.woodDark);
  }

  // ---------------------------------------------------------------- track walls (marble to platform + 1.0, black skirt, plaster), cable runs, doors, names
  for (const sx of [-1, 1]) {
    const prof = [[-PZ, 0], [PZ, 0], [PZ, SPS - BED], [-PZ, SPS - BED]];
    const g = extrudeX(prof, sx > 0 ? WALL - 0.15 : -WALL, sx > 0 ? WALL : -WALL + 0.15); g.translate(0, BED, 0);
    S.group.add(new THREE.Mesh(g, trackMat));
    S.col(sx > 0 ? WALL - 0.15 : -WALL - 1.0, sx > 0 ? WALL + 1.0 : -WALL + 0.15, BED - 1.2, FY + 8, -PZ, PZ);
    const fx = sx > 0 ? WALL - 0.17 : -WALL + 0.17, rotY = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    for (const hh of [FY + 0.55, FY + 0.75]) S.bx(fx - (sx > 0 ? 0.07 : 0), fx + (sx > 0 ? 0 : 0.07), hh, hh + 0.06, -PZ + 1, PZ - 1, M.cable);
    // grille doors with the year (gold frame, navy enamel, spear points), name boards in bronze capitals between them
    const door = grilleTex(ctx);
    if (!column && !plain) for (let z = -60; z <= 60; z += 30) {
      const p = k.plane(1.1, 1.85, mat.toon('#ffffff', { map: door }), [fx - sx * 0.02, FY + 1.05, z], [0, rotY, 0]); p.castShadow = false;
    }
    const nameTex = column || plain ? null : M.bronzeName(cfg.name, cfg.id + '-bronze', { fill: skin.letters });
    if (!column && !plain) for (let z = -45; z <= 75; z += 30) { if (Math.abs(z) > 70) continue; const p = k.plane(3.6, 0.45, mat.decal('#ffffff', { map: nameTex }), [fx - sx * 0.025, FY + 2.15, z], [0, rotY, 0]); p.castShadow = false; }
  }

  if (column && !plain) for (const sx of [-1, 1]) for (let z = -PZ + 12; z < PZ - 8; z += 24) { const fx = sx > 0 ? WALL - 0.2 : -WALL + 0.2; const p = k.plane(3.6, 0.5, M.board(M.nameBoard(cfg.name, cfg.nameEn || '', '#ea7125', cfg.id + '-trackband'), 1.0), [fx, FY + 2.3, z], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); p.castShadow = false; }
  // ---------------------------------------------------------------- lights: chandeliers in the side halls (bronze rings with eight opal globes)
  const chand = (x, z) => {
    const y = FY + 5.1;
    k.cyl(0.02, 0.02, 1.4, M.bronzeDark, [x, y + 0.7 + 0.2, z], null, 5);
    k.cyl(0.52, 0.52, 0.06, M.bronze, [x, y, z], null, 18);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; k.sphere(0.16, M.lampWarm, [x + 0.5 * Math.cos(a), y - 0.08, z + 0.5 * Math.sin(a)], 8); }
    k.cyl(0.1, 0.1, 0.4, M.bronzeDark, [x, y - 0.2, z], null, 8);
  };
  if (plain) { /* own lamps */ } else if (!column) for (let z = -PZ + 9; z < PZ - 4; z += 9) for (const sx of [-1, 1]) chand(sx * CXS, z);
  else for (const sx of [-1, 1]) { S.bx(sx * (C - 0.04) - 0.02, sx * (C - 0.04) + 0.02, FY + 3.5, FY + 3.95, -PZ + 0.5, PZ - 0.5, M.orange); for (let z = -PZ + 14; z < PZ - 8; z += 40) for (const f of [1, -1]) { const p = k.plane(3.2, 0.42, M.board(M.nameBoard(cfg.name, cfg.nameEn || '', '#ea7125', cfg.id + '-band'), 1.0), [sx * (C - 0.07), FY + 3.73, z], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); p.castShadow = false; void f; } }

  // ---------------------------------------------------------------- ends: side-hall walls with the tunnel mouths, the central S end cap (door frame for the passages later), the N bulkhead
  const sideOutline = (x0, x1) => [[x0, BED - 0.5], [x0, SPS], ...Array.from({ length: 25 }, (_, i) => { const t = Math.PI - i * Math.PI / 24; return [CXS_of(x0, x1) + (RS) * Math.cos(t), SPS + RS * Math.sin(t)]; }).slice(1, -1), [x1, SPS], [x1, BED - 0.5]];
  function CXS_of(x0, x1) { return (x0 + x1) / 2; }
  const circle = (cx, cy, r, n = 28) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(-i * 2 * Math.PI / n), cy + r * Math.sin(-i * 2 * Math.PI / n)]);
  const mouths = [];
  for (const zs of [-1, 1]) for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? PY : -WALL, x1 = sx > 0 ? WALL : -PY;
    const z0 = zs > 0 ? PZ : -PZ - 0.6, z1 = z0 + 0.6;
    const g = extrudeZ(sideOutline(x0, x1), z0, z1, [circle(sx * TRK, BED + TUBE_CY, TUBE_R + 0.02)]);
    S.group.add(new THREE.Mesh(g, M.plasterWarm));
    S.col(x0, x1, BED - 1.2, FY + 8, z0, z1);
    // the tunnel behind the mouth: 40 m stub (a gate board closes it)
    const path = zs > 0 ? [[sx * TRK, BED, PZ + 0.6], [sx * TRK, BED, PZ + 0.6 + 40]] : [[sx * TRK, BED, -PZ - 0.6], [sx * TRK, BED, -PZ - 0.6 - 40]];
    mouths.push({ sx, zs, path });
  }
  // central end walls (the north one only when there is no lower hall), with an arched opening for a passage when cfg.endHole.S / .N is set
  for (const zs of [-1, 1]) {
    if (zs < 0 && !noLower) continue;
    const z0 = zs > 0 ? (CEN ? CEN[1] : PZ) : (CEN ? CEN[0] : -PZ) - 0.6, hole = cfg.endHole && cfg.endHole[zs > 0 ? 'S' : 'N'];
    const outl = [[-C, FY - 0.5], [-C, SPC], ...Array.from({ length: 23 }, (_, i) => { const t = Math.PI - (i + 1) * Math.PI / 24; return [C * Math.cos(t), SPC + C * Math.sin(t)]; }), [C, SPC], [C, FY - 0.5]];
    S.group.add(new THREE.Mesh(extrudeZ(outl, z0, z0 + 0.6, hole ? [archHole(0, hole.halfW, FY, FY + hole.spring, 12)] : null), M.plasterWarm));
    if (hole) { S.col(-C, -hole.halfW, FY - 1.2, FY + 12, z0, z0 + 0.6); S.col(hole.halfW, C, FY - 1.2, FY + 12, z0, z0 + 0.6); } else S.col(-C, C, FY - 1.2, FY + 12, z0, z0 + 0.6);
  }
  const centralOutline = (x) => [[-C, FY - 0.5], [-C, SPC], ...Array.from({ length: 23 }, (_, i) => { const t = Math.PI - (i + 1) * Math.PI / 24; return [C * Math.cos(t), SPC + C * Math.sin(t)]; }), [C, SPC], [C, FY - 0.5]];
  void centralOutline;

  // platform furniture: granite benches in the central hall (between the openings), hanging blue boards, a clock on the pylon at each hall end
  if (!plain) for (const sx of [-1, 1]) for (let i = 0; i < openZ.length; i += 3) { const z = openZ[i] + 3 * (i % 2 ? 1 : -1) * 0 + 0; k.box(0.55, 0.45, 2.0, M.concrete, [sx * 3.4, FY + 0.225, z], [0, 0, 0]); k.box(0.58, 0.05, 2.05, M.steelDark, [sx * 3.4, FY + 0.47, z]); S.col(sx * 3.4 - 0.3, sx * 3.4 + 0.3, FY, FY + 0.5, z - 1.0, z + 1.0); }
  for (const hg of cfg.hang || []) for (const f of [1, -1]) { const p = k.plane(2.4, 0.6, M.board(M.blueBoard(hg.text, hg.sub || '', null, cfg.id + '-hang-' + hg.z), 1.0), [0, FY + 3.2, hg.z + f * 0.06], [0, f > 0 ? 0 : Math.PI, 0]); p.castShadow = false; k.cyl(0.015, 0.015, 1.2, M.steelBlack, [0, FY + 4.1, hg.z], null, 4); }
  serviceStairs(ctx, M, S, { FY, BED, EDGE, zs: [-(PZ - 2.6), PZ - 2.6] });
  return { openings: { z0: openZc[0], step: PIT }, openZ, openZc, nOpen, centralShell, pylonMat, trackMat, floorMat, get sideFloorMat() { return sideFloor(); }, FY, BED, SPC, SPS, EDGE, TRK, WALL, PZ, C, PY, ZL, mouths, pylonZ, trackX: { plus: TRK, minus: -TRK }, buildTunnelStub: (parent, path, o) => buildTunnel(ctx, M, parent, path, o) };
}

// grille door texture (navy enamel, gold frame, spear points, the year in a laurel cartouche)
function grilleTex(ctx) {
  return ctx.tex.draw(128, 256, (g, w, h) => {
    g.fillStyle = '#c9a24b'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e2a55'; g.fillRect(9, 9, w - 18, h - 18);
    g.fillStyle = '#d6b45a'; for (let x = 18; x < w - 12; x += 12) { g.fillRect(x - 1.5, 26, 3, h - 52); g.beginPath(); g.moveTo(x, 16); g.lineTo(x - 5, 34); g.lineTo(x + 5, 34); g.closePath(); g.fill(); }
    g.fillStyle = '#c9a24b'; g.fillRect(24, h * 0.42, w - 48, 40); g.fillStyle = '#2a2a30'; g.font = '700 26px "Rubik",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1955', w / 2, h * 0.42 + 21);
  }, { key: 'metro-grille-1955' });
}
