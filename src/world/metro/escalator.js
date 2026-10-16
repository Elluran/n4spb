// metro/escalator.js — the long escalator tunnel of a deep station (docs/research/metro.md section D, photos 19 / 144 / 145 / 146).
//
//   * a plastered vault with cove lamps whose cross-sections are VERTICAL (the arch profile is sheared along the 30 degree slope), so its lower end is a vertical plane that meets the
//     bulkhead of the lower hall exactly; three lanes (1.1 m belts at x = -2 / 0 / +2 in the station frame; -2 and 0 run down, +2 up; the middle one is reversible), steel balustrades with black
//     handrails, 0.9 m dividers carrying frosted-glass "light columns" on dark bronze bases and lit advertising stands;
//   * the steps are REAL geometry: instanced treads / risers / yellow comb edges moving along the slope (integrated from each lane's direction), updated only while the camera is near;
//     the physics surface is the straight ramp the engine gives (physics.addEscalator), the treads stay within +-0.12 m of it;
//   * colliders: outer walls and dividers in 3 m pieces with the y range of the slope (nothing else in the plan area is touched); the hole over the shaft mouth comes from addEscalator.
// Everything lives in the station frame: x lateral, z along the hall axis (the slope rises toward -z), y absolute (platform level FY at the bottom, 0 at the street).
import * as THREE from 'three';
import { extrudeZ, extrudeX, archRing } from './lib.js';
import { TAN, COS, SLOPE } from '../data/metro.js';

const STEP = 0.4;          // horizontal tread depth (m)
const LANE_W = 1.1;

export function buildEscalator(ctx, M, S, o) {
  const { physics } = ctx;
  const FY = o.FY, zTop = o.zTop, zBottom = o.zBottom, RUN = zBottom - zTop, LEN = RUN / COS;
  const yTopAbs = o.yTop ?? 0, mouth = o.mouth !== false;                       // o.mouth = false: the top end is NOT at the street (a gallery / an underpass hall): no shaft mouth, no terrain hole
  const stepNo = (v) => v;
  const yAt = (z) => FY + (zBottom - z) * TAN;                                   // lane surface height at local z
  const lanes = o.lanes || [{ x: -2, dir: -1 }, { x: 0, dir: -1 }, { x: 2, dir: 1 }];
  const A = o.halfW || 4.05, SPV = o.spv ?? 1.0, BV = o.bv ?? 4.9, shellStart = o.shellStart ?? (mouth ? 12 : 0), trench = o.trench ?? mouth;   // vault: half width, spring above the lane line, vertical semi-axis, first z (from the top)

  // the tilted frame: origin at the TOP of the lanes, +z' down the slope, y' perpendicular (for everything that sits ON the lanes)
  const lf = S.sub([0, yTopAbs, zTop], 0); lf.rotation.x = SLOPE;                  // (was y = 0: the balustrades / handrails / slab of every flight that starts below the street hung -yTop metres too high)
  const lk = ctx.kit(lf);
  const box = (w, h, d, mat, x, y, z) => lk.box(w, h, d, mat, [x, y, z]);

  // ---- the vault: a vertical-section ring sheared along the slope
  const z0 = zTop + shellStart, z1 = zBottom - 0.5;
  const ring = extrudeZ(archRing(A, SPV, 0.5, -1.4, 0, 36, BV), z0, z1);
  { const p = ring.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + FY + (zBottom - p.getZ(i)) * TAN); ring.computeVertexNormals(); ring.computeBoundingSphere(); ring.computeBoundingBox(); }
  const shell = new THREE.Mesh(ring, o.shellMat || M.plasterVault); shell.receiveShadow = true; if (o.shell !== false) S.group.add(shell);          // o.shell = false: an open flight between two levels of one hall (Sportivnaya): no tube
  // floor slab under all lanes (top 5 cm below the lane surface) + dark skirting
  box(2 * A, 0.5, LEN, M.steelDark, 0, -0.3, LEN / 2);
  const sk0 = shellStart / COS;
  for (const sx of [-1, 1]) box(0.3, 0.9, LEN - sk0, M.concreteDark, sx * (A - 0.05), 0.25, sk0 + (LEN - sk0) / 2);

  // ---- lamps along the vault: two cove strips + ceiling lamps (tilted boxes in the station frame)
  const tilted = (w, h, d, mat, x, zc, hv) => { const m = S.k.box(w, h, d, mat, [x, yAt(zc) + hv, zc], [SLOPE, 0, 0]); m.castShadow = false; return m; };
  const zA = z0 + 1, zB = z1 - 1;
  if (o.shell !== false) for (const sx of [-1, 1]) tilted(0.2, 0.14, (zB - zA) / COS, M.lampWarm, sx * (A - 0.12), (zA + zB) / 2, 3.15);
  if (o.shell !== false) for (let z = z0 + 5; z < z1 - 3; z += 8) tilted(1.1, 0.1, 0.55, M.lampWhite, 0, z, SPV + BV - 0.1);

  // ---- balustrades, dividers, handrails
  const BH = 1.0;                                                                 // balustrade height above the lane plane
  const lanesX = lanes.map((l) => l.x).sort((a, b) => a - b), dividers = [];
  for (let i = 0; i < lanesX.length - 1; i++) dividers.push((lanesX[i] + lanesX[i + 1]) / 2);
  const outerX = lanesX[lanesX.length - 1] + LANE_W / 2 + 0.35, outerXm = lanesX[0] - LANE_W / 2 - 0.35;
  for (const x of dividers) {
    box(0.9, BH + 0.05, LEN, M.steel, x, BH / 2 - 0.02, LEN / 2);
    box(0.3, 0.02, LEN, M.steelDark, x, BH + 0.035, LEN / 2);
  }
  for (const x of [outerX, outerXm]) {
    box(0.7, BH, LEN, M.steel, x, BH / 2 - 0.05, LEN / 2);
  }
  // light columns on the dividers (frosted cylinders, dark bronze base, gold crown) and lit advertising stands
  const adTex = adTextures(ctx);
  let ai = 0;
  // everything that stands on a divider is built in the WORLD frame (vertical, gravity aligned), only its position follows the slope: base on the balustrade top line
  const wk = S.k, baseAt = (zp) => { const zw = zTop + zp * COS; return [zw, yAt(zw) + BH / COS]; };
  for (const [di, x] of dividers.entries()) {
    for (let zp = 5 + di * 3; zp < LEN - 4; zp += 6) {
      const [zw, y0] = baseAt(zp);
      wk.cyl(0.13, 0.2, 0.34, M.bronzeDark, [x, y0 + 0.17, zw], null, 10); wk.cyl(0.15, 0.15, 0.62, M.lampCylinder, [x, y0 + 0.65, zw], null, 10); wk.cyl(0.19, 0.12, 0.12, M.gold, [x, y0 + 1.02, zw], null, 10);
    }
    for (let zp = 9 + di * 6; zp < LEN - 6; zp += 12) {
      const [zw, y0] = baseAt(zp);
      wk.cyl(0.03, 0.03, 1.1, M.steelBlack, [x, y0 + 0.55, zw], null, 6);
      wk.box(0.06, 0.95, 0.62, M.steelBlack, [x, y0 + 1.45, zw]);
      wk.plane(0.62, 0.9, M.board(adTex[ai++ % adTex.length], 0.95), [x + 0.035, y0 + 1.45, zw], [0, Math.PI / 2, 0]);
      wk.plane(0.62, 0.9, M.board(adTex[ai++ % adTex.length], 0.95), [x - 0.035, y0 + 1.45, zw], [0, -Math.PI / 2, 0]);
    }
  }
  // comb plates at both ends of every lane (the steps are drawn between 1.05 m from each end)
  for (const l of lanes) for (const [a, b] of [[0, 1.0], [LEN - 1.0, LEN]]) box(LANE_W, 0.1, b - a, M.steelDark, l.x, -0.05, (a + b) / 2);
  for (const x of dividers) for (const z of [0.1, LEN - 0.1]) box(0.9, 0.2, 0.2, M.steelBlack, x, BH + 0.1, z);                 // newel posts

  // ---- the shaft mouth (street end): trench walls from the street plane down to the vault
  const wallZ = shellStart + 0.4;
  if (trench) for (const sx of [-1, 1]) {
    const prof = [[zTop, yTopAbs], [zTop + wallZ, yTopAbs], [zTop + wallZ, yTopAbs - wallZ * TAN - 1.4], [zTop, yTopAbs - 1.4]];     // (z, y) in the station frame
    const m = new THREE.Mesh(extrudeX(prof, 0, 0.5), M.plaster); m.position.set(sx > 0 ? A - 0.02 : -A - 0.48, 0, 0); m.receiveShadow = true; S.group.add(m);
  }

  // ---- physics: lanes, walls, dividers (3 m pieces following the slope)
  const items = [];
  const esc = lanes.map((l) => {
    const [bx, bz] = S.W(l.x, zBottom), [tx, tz] = S.W(l.x, zTop);
    return physics.addEscalator({ bottom: { x: bx, y: FY, z: bz }, top: { x: tx, y: yTopAbs, z: tz }, w: LANE_W, dir: l.dir, speed: o.speed ?? 0.9, hole: false });
  });
  if (mouth) { // the terrain is cut only over the shaft mouth (the first 13 m, where the street floor is open); everywhere else the street above the tunnel stays solid
    const [hx, hz] = S.W(0, zTop + (o.holeLen ?? 13) / 2); physics.addHole(hx, hz, 2 * A, (o.holeLen ?? 13), S.frame.yaw);
  }
  const piece = (x0, x1) => { for (let z = zTop; z < zBottom; z += 3) { const zz = Math.min(zBottom, z + 3); items.push(S.col(x0, x1, yAt(zz) - 1.6, yAt(z) + 3.2, z, zz)); } };
  for (const x of dividers) piece(x - 0.45, x + 0.45);
  piece(outerX - 0.35, outerX + 0.4); piece(outerXm - 0.4, outerXm + 0.35);
  piece(A - 0.1, A + 0.7); piece(-A - 0.7, -A + 0.1);

  // ---- moving handrails (black rubber with faint ribs, scrolled with the lane direction)
  const railTex = ctx.tex.draw(16, 64, (g, w, h) => { g.fillStyle = '#17181c'; g.fillRect(0, 0, w, h); g.fillStyle = '#2c2e34'; for (let y = 4; y < h; y += 16) g.fillRect(3, y, w - 6, 3); }, { key: 'metro-handrail' });
  const rails = [];
  for (const [i, l] of lanes.entries()) {
    const map = railTex.clone(); map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(1, LEN / 0.8);
    const rm = new THREE.MeshToonMaterial({ map, gradientMap: ctx.mat.gradientMap, color: 0xffffff });
    for (const dx of [-0.7, 0.7]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, LEN), rm); m.position.set(l.x + dx, BH + 0.06, LEN / 2); m.userData.noBatch = true; m.castShadow = false; lf.add(m); }
    rails.push({ map, lane: i });
  }
  // ---- the steps: instanced treads / risers / yellow edges, one set per lane
  const pitch = STEP / COS, nSteps = Math.ceil(LEN / pitch) + 2, loop = nSteps * pitch;
  // one step = tread (top quad), yellow comb edge, riser (front quad): 6 triangles with vertex colours, one InstancedMesh per lane (the old build used three box meshes = 36 triangles per step)
  const stepGeo = (() => {
    const g = new THREE.BufferGeometry(), P = [], C = [], N = [], I = [];
    const col = { t: new THREE.Color('#5c6672'), r: new THREE.Color('#2f343b'), e: new THREE.Color('#f2c500') };
    const quad = (a, b, c, d, color, n) => { const k = P.length / 3; for (const p of [a, b, c, d]) { P.push(...p); C.push(color.r, color.g, color.b); N.push(...n); } I.push(k, k + 1, k + 2, k, k + 2, k + 3); };
    const hz = STEP / 2 - 0.012, ze = STEP / 2 - 0.085;
    quad([-0.5, 0, -hz], [-0.5, 0, ze], [0.5, 0, ze], [0.5, 0, -hz], col.t, [0, 1, 0]);                      // tread (y = 0 = the lane surface)
    quad([-0.5, 0.012, ze], [-0.5, 0.012, STEP / 2 - 0.02], [0.5, 0.012, STEP / 2 - 0.02], [0.5, 0.012, ze], col.e, [0, 1, 0]);   // yellow edge
    quad([-0.5, -STEP * TAN, STEP / 2 - 0.02], [-0.5, 0.012, STEP / 2 - 0.02], [0.5, 0.012, STEP / 2 - 0.02], [0.5, -STEP * TAN, STEP / 2 - 0.02], col.r, [0, 0, 1]);   // riser (faces the lower neighbour)
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I);
    return g;
  })();
  const stepMat = ctx.mat.toon('#ffffff', { vertexColors: true, side: 'double' });
  const sets = lanes.map((l, i) => {
    const t = new THREE.InstancedMesh(stepGeo, stepMat, nSteps);
    t.frustumCulled = false; t.userData.noBatch = true; t.castShadow = false; t.receiveShadow = false; S.group.add(t);
    return { l, t, esc: esc[i], phase: 0 };
  });
  const dummy = new THREE.Object3D(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const place = (set) => {
    const { l } = set;
    for (let i = 0; i < nSteps; i++) {
      const p = ((i * pitch + set.phase) % loop + loop) % loop - pitch;             // metres along the slope from the top
      if (p < 1.05 || p > LEN - 1.05) { set.t.setMatrixAt(i, zero); continue; }
      const z = zTop + p * COS, y = yAt(z);
      dummy.rotation.set(0, 0, 0); dummy.scale.set(1.0, 1, 1); dummy.position.set(l.x, y, z); dummy.updateMatrix(); set.t.setMatrixAt(i, dummy.matrix);
    }
    set.t.instanceMatrix.needsUpdate = true;
  };
  const cam = ctx.camera.position, [mx, mz] = S.W(0, (zTop + zBottom) / 2);
  let dirty = true;
  ctx.onUpdate((dt) => {
    for (const s of sets) s.phase -= s.esc.dir * s.esc.speed * dt;
    for (const r of rails) r.map.offset.y += esc[r.lane].dir * esc[r.lane].speed * dt / 0.8;                  // steps move toward the top for dir = +1: p (from the top) decreases
    const near = Math.hypot(cam.x - mx, cam.z - mz) < 125 && cam.y < 6 && cam.y > FY - 12;
    if (!near && !dirty) return;
    for (const s of sets) place(s);
    dirty = false;
  });

  return { esc, lanes, items, yAt, outerX, outerXm, dividers, LEN, RUN, A, shellStart, zTop, zBottom, FY };
}

// ---------------------------------------------------------------- adverts (generic, no brands)
function adTextures(ctx) {
  const { tex } = ctx;
  const FONT = '"Rubik","Noto Sans",sans-serif';
  const ad = (key, bg, fg, l1, l2, shape) => tex.draw(256, 384, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg;
    g.beginPath(); if (shape === 'c') g.arc(w / 2, 130, 70, 0, Math.PI * 2); else if (shape === 't') { g.moveTo(w / 2, 50); g.lineTo(w - 40, 200); g.lineTo(40, 200); g.closePath(); } else g.rect(50, 70, w - 100, 120); g.globalAlpha = 0.9; g.fill(); g.globalAlpha = 1;
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, l1, w / 2, 262, w - 30, 46, FONT, 800); tex.fitText(g, l2, w / 2, 320, w - 30, 28, FONT, 500);
    g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16);
  }, { key });
  return [
    ad('metro-ad-1', '#e8f1ff', '#1d4e9b', 'Музеи Невского', 'Сегодня открыто', 'r'), ad('metro-ad-2', '#fff0d8', '#b0481f', 'Горячий хлеб', 'Пекарня у дома', 'c'),
    ad('metro-ad-3', '#e3f5e8', '#1d7a46', 'Билеты на поезд', 'Касса · Приложение', 't'), ad('metro-ad-4', '#f6e4ee', '#8e2a62', 'Театр оперы', 'Вечерние спектакли', 'c'),
    ad('metro-ad-5', '#fff8d0', '#7a5b00', 'Речные прогулки', 'Каналы и мосты', 'r'), ad('metro-ad-6', '#e6e8ee', '#2a3550', 'Сохрани время', 'Новый маршрут', 't'),
  ];
}
