// metro/hall-generic.js — the shared "future district" platform hall (docs/METRO.md): a single-vault island station hidden under the play area. Every station of lines 1 / 3 / 4 that has no real hall
// in this map is shown here: the name boards, the line band and the train livery are switched to the destination (`show(station)`), the exits are closed with a polite Russian sign. When a
// district is built later, its station gets its own hall (FRAMES row + a builder) and the ride goes there instead; this hall stays for the stations that are still missing.
//   cross-section: vault (half width 8.6, elliptical, crown +9 m over the platform), island platform |x| < 4.4, tracks at x = +-5.9, track walls clad in light stone with the line band + name boards,
//   hanging lanterns, cove lamps. z: platform 165 m (+-82.5), both ends closed by walls with the two tunnel mouths (stubs with the black disc) and a shuttered exit alcove in the north wall.
import * as THREE from 'three';
import { extrudeZ, extrudeX, archRing, archHole, floorGeo } from './lib.js';
import { carOffset, STOCK } from './train.js';
import { buildStub } from './stubs.js';
import { serviceStairs } from './stairs.js';

export const GEN = { EDGE: 4.4, TRK: 5.9, WALL: 8.6, PZ: 82.5, ZTRAIN: 77, SPRING: 3.8, B: 5.2 };

export function buildGenericHall(ctx, M, S, cfg) {
  const { mat, tex, physics } = ctx;
  const { EDGE, TRK, WALL, PZ, SPRING, B } = { ...GEN, ...(cfg.dims || {}) }, FY = cfg.FY, BED = FY - 1.1, k = S.k;
  const SPS = FY + SPRING;
  // ---- shell
  S.group.add(new THREE.Mesh(extrudeZ(archRing(WALL, SPS, 0.5, SPS, 0, 44, B), -PZ - 0.6, PZ + 0.6), M.ceiling));
  // ---- floors, beds
  const stoneFloor = mat.toon('#ffffff', { map: M.T.granite('gen-floor', '#8b8782', 'rgba(25,25,28,0.35)', 'rgba(255,255,255,0.30)') });
  S.group.add(new THREE.Mesh(floorGeo(-EDGE, EDGE, -PZ, PZ, FY, 0.5), stoneFloor));
  S.bx(-EDGE, EDGE, BED, FY - 0.02, -PZ, PZ, M.concrete);
  S.walk(-EDGE, EDGE, -PZ, PZ, FY, 1.1);
  const bedMat = mat.toon('#ffffff', { map: M.T.bed() });
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? EDGE : -WALL + 0.15, x1 = sx > 0 ? WALL - 0.15 : -EDGE;
    S.group.add(new THREE.Mesh(floorGeo(x0, x1, -PZ, PZ, BED, 1 / 4.2, true, 1 / 1.3), bedMat)); S.bx(x0, x1, BED - 0.4, BED - 0.01, -PZ, PZ, M.concreteDark); S.walk(x0, x1, -PZ, PZ, BED + 0.12, 1.0);
    S.bx(sx > 0 ? EDGE - 0.6 : -EDGE, sx > 0 ? EDGE : -EDGE + 0.6, FY - 0.02, FY + 0.03, -PZ, PZ, M.black); S.bx(sx > 0 ? EDGE - 0.45 : -EDGE + 0.35, sx > 0 ? EDGE - 0.35 : -EDGE + 0.45, FY + 0.03, FY + 0.045, -PZ, PZ, M.yellow);
    const tx = sx * TRK; for (const dx of [-0.76, 0.76]) S.bx(tx + dx - 0.04, tx + dx + 0.04, BED + 0.01, BED + 0.17, -PZ, PZ, M.railTop);
    const cx = tx + sx * 1.45; S.bx(cx - 0.07, cx + 0.07, BED + 0.01, BED + 0.13, -PZ, PZ, M.thirdRail); S.bx(cx - 0.12, cx + 0.12, BED + 0.13, BED + 0.17, -PZ, PZ, M.woodDark);
  }
  if (!cfg.closed) serviceStairs(ctx, M, S, { FY, BED, EDGE, zs: [-(PZ - 2.6), PZ - 2.6] });
  // ---- track walls: light stone with a coloured band (material switched per line) + name boards (switched per station)
  const stoneWall = mat.toon('#ffffff', { map: M.T.trackWall(cfg.id ? cfg.id + '-wall' : 'gen-wall', cfg.wallSkin || { plaster: '#e4ddcb', marble: '#c8bda4', vein: '#8e8470', skirt: '#1b1b21', corn: '#efe9d8' }) });
  const bands = { '1': mat.toon('#d6083b'), '2': mat.toon('#0078c9'), '3': mat.toon('#009a49'), '4': mat.toon('#ea7125'), '5': mat.toon('#702785'), '6': mat.toon('#9c5b2a') };
  const bandMeshes = [], boardMeshes = [];
  for (const sx of [-1, 1]) {
    const g = extrudeX([[-PZ, 0], [PZ, 0], [PZ, SPS - BED], [-PZ, SPS - BED]], sx > 0 ? WALL - 0.15 : -WALL, sx > 0 ? WALL : -WALL + 0.15); g.translate(0, BED, 0);
    S.group.add(new THREE.Mesh(g, stoneWall));
    S.col(sx > 0 ? WALL - 0.15 : -WALL - 1.0, sx > 0 ? WALL + 1.0 : -WALL + 0.15, BED - 1.2, FY + 12, -PZ, PZ);
    const fx = sx > 0 ? WALL - 0.17 : -WALL + 0.17, rotY = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    const band = k.box(0.03, 0.5, 2 * PZ, bands[cfg.line || '1'], [fx - sx * 0.015, FY + 2.55, 0]); ctx.noBatch(band); bandMeshes.push(band);       // noBatch: show() swaps the material at run time (a batched copy would never change)
    for (let z = -60; z <= 60; z += 30) { const p = k.plane(4.2, 0.62, M.board(M.nameBoard('—', '', '#888', 'gen-blank'), 1.0), [fx - sx * 0.04, FY + 2.55, z], [0, rotY, 0]); p.castShadow = false; ctx.noBatch(p); boardMeshes.push(p); }
  }
  // ---- end walls with the two tunnel mouths; shuttered exit in the north wall
  const outline = (x) => { const p = [[-WALL, BED - 0.5], [-WALL, SPS]]; for (let i = 1; i < 44; i++) { const t = Math.PI - i * Math.PI / 44; p.push([WALL * Math.cos(t), SPS + B * Math.sin(t)]); } p.push([WALL, SPS], [WALL, BED - 0.5]); return p; };
  const circle = (cx, cy, r, n = 26) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(-i * 2 * Math.PI / n), cy + r * Math.sin(-i * 2 * Math.PI / n)]);
  for (const zs of [-1, 1]) {
    const z0 = zs > 0 ? PZ : -PZ - 0.6;
    const eh = cfg.endHole && cfg.endHole[zs > 0 ? 'S' : 'N'];
    S.group.add(new THREE.Mesh(extrudeZ(outline(), z0, z0 + 0.6, [circle(-TRK, BED + 2.0, 2.72), circle(TRK, BED + 2.0, 2.72), ...(eh ? [archHole(0, eh.halfW, FY, FY + eh.spring, 12)] : [])]), M.plasterWarm));
    if (eh) { S.col(-WALL, -eh.halfW, BED - 1.2, FY + 12, z0, z0 + 0.6); S.col(eh.halfW, WALL, BED - 1.2, FY + 12, z0, z0 + 0.6); } else S.col(-WALL, WALL, BED - 1.2, FY + 12, z0, z0 + 0.6);
    for (const sx of [-1, 1]) if (!cfg.noStub || !cfg.noStub(sx, zs)) buildStub(ctx, M, S, sx * TRK, zs * (PZ + 0.6), zs, BED, {});
  }
  // the shutter (a closed roller gate in an arch) and the sign
  const shut = tex.draw(256, 256, (g, w, h) => { g.fillStyle = '#7e858c'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < h; y += 10) g.fillRect(0, y, w, 3); g.fillStyle = '#c9a200'; g.fillRect(0, h - 22, w, 14); }, { key: 'gen-shutter' });
  shut.wrapS = shut.wrapT = THREE.RepeatWrapping;
  if (!cfg.noShutter) {
  k.plane(4.4, 3.3, mat.toon('#ffffff', { map: shut }), [0, FY + 1.65, -PZ + 0.04], [0, 0, 0]);
  k.box(5.0, 0.4, 0.2, M.steelDark, [0, FY + 3.5, -PZ + 0.1]);
  const sign = tex.draw(768, 256, (g, w, h) => {
    g.fillStyle = '#1d4e9b'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(8, 8, w - 16, 4); g.fillRect(8, h - 12, w - 16, 4);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    tex.fitText(g, 'Выход закрыт', w / 2, 78, w - 50, 66, '"Rubik","Noto Sans",sans-serif', 700);
    tex.fitText(g, 'Эта станция за пределами карты.', w / 2, 152, w - 50, 42, '"Rubik","Noto Sans",sans-serif', 500);
    g.globalAlpha = 0.8; tex.fitText(g, 'Exit closed. This station is outside the map.', w / 2, 212, w - 50, 30, '"Rubik","Noto Sans",sans-serif', 400);
  }, { key: 'gen-closed-sign' });
  k.plane(2.8, 0.93, M.board(sign, 1.0), [0, FY + 4.35, -PZ + 0.3], [0, 0, 0]);
  S.col(-EDGE, EDGE, FY - 1, FY + 12, -PZ - 0.2, -PZ + 0.1);
  }
  // closed type: a screen wall on both platform edges with an opening at every train door (mosaic, like Mayakovskaya)
  if (cfg.closed) {
    const st = STOCK[cfg.closed.stock], mosaicMat = mat.toon('#ffffff', { map: M.T.mosaic('mosaic-' + cfg.closed.stock) });
    const holes = [];
    for (let i = 0; i < st.cars; i++) for (const dz of [-6.6, -2.2, 2.2, 6.6]) { const zc = carOffset(st, i) + dz; if (Math.abs(zc) < PZ - 3) holes.push([zc - 0.75, zc + 0.75]); }
    holes.sort((a, b) => a[0] - b[0]);
    const shape = (zs0, zs1) => [[zs0, 0], [zs1, 0], [zs1, 3.3], [zs0, 3.3]];
    for (const sx of [-1, 1]) {
      const g = extrudeX(shape(-PZ, PZ), sx > 0 ? EDGE - 0.3 : -EDGE, sx > 0 ? EDGE : -EDGE + 0.3, holes.map(([a, b]) => [[a, 0.001], [b, 0.001], [b, 2.1], [a, 2.1]])); g.translate(0, FY, 0);
      S.group.add(new THREE.Mesh(g, mosaicMat));
      let z0c = -PZ; for (const [a, b] of [...holes, [PZ, PZ]]) { if (a - z0c > 0.05) S.col(sx > 0 ? EDGE - 0.3 : -EDGE, sx > 0 ? EDGE : -EDGE + 0.3, FY - 0.5, FY + 3.4, z0c, a); z0c = b; }
      S.bx(sx > 0 ? EDGE - 0.3 : -EDGE, sx > 0 ? EDGE : -EDGE + 0.3, FY + 3.3, FY + 3.5, -PZ, PZ, M.lampWhite);
    }
  }

  // ---- furniture and lights: benches on the platform, hanging lanterns, cove lamps
  for (let z = -66; z <= 66; z += 22) for (const dx of [-1.6, 1.6]) { k.box(0.6, 0.42, 2.2, M.concrete, [dx, FY + 0.21, z]); k.box(0.62, 0.05, 2.25, M.steelDark, [dx, FY + 0.44, z]); S.col(dx - 0.3, dx + 0.3, FY, FY + 0.5, z - 1.1, z + 1.1); }
  for (const sx of [-1, 1]) S.bx(sx * (WALL - 2.6) - 0.1, sx * (WALL - 2.6) + 0.1, SPS + 3.0, SPS + 3.12, -PZ + 1, PZ - 1, M.lampWarm);
  for (let z = -PZ + 6; z < PZ - 3; z += 12) { k.cyl(0.02, 0.02, 1.6, M.bronzeDark, [0, FY + 8.2, z], null, 5); k.box(0.55, 0.55, 0.55, M.lampWarm, [0, FY + 7.2, z]); k.cyl(0.05, 0.3, 0.2, M.bronzeDark, [0, FY + 7.55, z], null, 8); }
  // info pillars with a map and an SOS column on the platform
  for (let z = -40; z <= 40; z += 40) { k.box(0.5, 2.2, 0.5, M.white, [0, FY + 1.1, z]); k.box(0.52, 0.2, 0.52, M.red, [0, FY + 2.0, z]); S.col(-0.25, 0.25, FY, FY + 2.3, z - 0.25, z + 0.25); }

  /** show a station: name boards + band + line colour */
  const lineMat = (line) => bands[line];
  function show(def, color) {
    const name = def.name, en = def.nameEn;
    for (const b of boardMeshes) b.material = M.board(M.nameBoard(name, en, color, 'nb-' + def.id), 1.0);
    for (const m of bandMeshes) m.material = lineMat(def.line);
  }
  return { FY, BED, SPS, EDGE, TRK, WALL, PZ, show, mouthZ: PZ + 0.6, boards: boardMeshes, bands: bandMeshes };
}
