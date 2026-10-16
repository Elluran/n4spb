// undertest.js — SELF-CONTAINED TEST WORLD for the underground engine (not in main.js MODULES: load it with ?only=undertest). See docs/UNDERGROUND.md.
//
//   street (y = 0)   a concrete slab with a hole at (0, 0..14.5) and a small pavilion over it (vestibule zone, sign, interact points)
//   shaft            three lanes 104 m long at 30 degrees heading south, 60 m deep: DOWN escalator (x = -2.6), fixed STAIRS (x = 0, 353 steps), UP escalator (x = +2.6),
//                    inside a round-vaulted tunnel with lamps; the physics is a terrain hole + two conveyors + addStairs
//   station A        z = 104..224, hall with a vault, island platform at y = -60 (x -4..4), two track beds at y = -61.1, lamps, wall signs
//   tunnel           z = 224..304 (round shell, lamps every 12 m)
//   station B        z = 304..424, the same hall (the destination)
//   train            3 cars on the east track (x = 5.4), a pure function of the simulation time: dwell 45 s with doors open, 27 s ride, dwell, back
//   zones            'vestibule' (daylight through the doors) and 'under' (the whole volume below y = -0.3 m)
//   interact         board (platform A, train doors open), get off (in the train at B, doors open), escalator toggle, map panel
// Everything below the street is tagged undergroundOnly (one group) and the street group surfaceOnly, so batch2 / zones keep them apart.
// ctx.undertest exposes the handles the tests (tools/under-test.mjs) use.
import * as THREE from 'three';

const SLOPE = 30 * Math.PI / 180, TAN = Math.tan(SLOPE), COS = Math.cos(SLOPE);
const DEPTH = 60, RUN = DEPTH / TAN;                    // 103.92 m horizontal run for 60 m of depth
const FY = -DEPTH;                                       // platform level
const BED = FY - 1.1;                                    // track bed (rail foot) level
const ZA0 = 104, ZA1 = 224, ZB0 = 304, ZB1 = 424;        // hall A / hall B extents (z)
const ZA = (ZA0 + ZA1) / 2, ZB = (ZB0 + ZB1) / 2;        // stopping points of the train centre (200 m apart)
const TRACK_X = 5.4, PLAT_X = 4.0, HALL_W = 10.3;
const DWELL = 45, ACC = 1.1, DIST = ZB - ZA, T_RIDE = 2 * Math.sqrt(DIST / ACC), PERIOD = 2 * (DWELL + T_RIDE);
const CAR_LEN = 19, CAR_GAP = 0.5, CAR_W = 2.7, N_CARS = 3;
const TRAIN_HALF = (N_CARS * CAR_LEN + (N_CARS - 1) * CAR_GAP) / 2;     // 29 m

export async function build(ctx) {
  const { mat, physics, tex, THREE: T } = ctx;
  const pal = ctx.palette;
  const U = new THREE.Group(); U.name = 'under'; U.userData.undergroundOnly = true; U.userData.zone = 'under-test'; ctx.addStatic(U);   // everything below the street
  const S = new THREE.Group(); S.name = 'street'; S.userData.surfaceOnly = true; ctx.addStatic(S);                                      // everything on the street
  const ku = ctx.kit(U), ks = ctx.kit(S);

  // ------------------------------------------------------------------ materials
  const M = {
    concrete: mat.toon('#b9b4ac'), concreteDark: mat.toon('#7d7a75'), asphalt: mat.toon('#5d5e62'), curb: mat.toon('#cfcac2'),
    wallPink: mat.toon('#d9b7a6'), wallCream: mat.toon('#eadfca'), vault: mat.toon('#efe7d6', { side: 'double' }), vaultTunnel: mat.toon('#d6cfc2', { side: 'double' }),
    ring: mat.toon('#e6d8c4', { side: 'double' }), base: mat.toon('#5c4a45'), steel: mat.toon('#9aa1a8'), steelDark: mat.toon('#6b7480'), ballast: mat.toon('#4a4741'),
    yellow: mat.toon('#f2c230'), lampWarm: mat.emissive('#ffe3b3', 1.5), lampCool: mat.emissive('#f2f8ff', 1.15), red: mat.toon('#c8392f'), blue: mat.toon('#2f64b5'),
    slab: mat.toon('#5a5754'), stairs: mat.toon('#c9c2b6'), rail: mat.toon('#8b9199'),
    trainBody: mat.toon('#d4dde6'), trainStripe: mat.toon('#2f64b5'), trainDoor: mat.toon('#7e9bb6'), trainFloor: mat.toon('#555a63'), trainGlass: mat.emissive('#a7c6dc', 0.95),
    seat: mat.toon('#c4622d'), seatBlue: mat.toon('#3e6aa8'), pole: mat.toon('#c9ced3'), roof: mat.toon('#aeb8c2'), under: mat.toon('#2f3238'),
  };
  const checker = tex.draw(64, 64, (g, w, h) => { g.fillStyle = '#d9cfc2'; g.fillRect(0, 0, w, h); g.fillStyle = '#a99d90'; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2); }, { key: 'ut-checker-platform', repeat: [8, 120] });
  const checkerHall = tex.draw(64, 64, (g, w, h) => { g.fillStyle = '#d9cfc2'; g.fillRect(0, 0, w, h); g.fillStyle = '#a99d90'; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2); }, { key: 'ut-checker-hall', repeat: [8, 120] });
  const matPlatform = mat.toon('#ffffff', { map: checker }), matFloor = mat.toon('#ffffff', { map: checkerHall });
  const signTex = (txt, sub, key) => tex.sign({ text: txt, sub, w: 512, h: 128, bg: '#1f4aa8', fg: '#ffffff', radius: 10, border: 6, borderColor: '#ffffff', key });
  const metroSign = tex.draw(512, 160, (g, w, h) => {
    g.fillStyle = '#1f4aa8'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.fillRect(8, 8, w - 16, 6); g.fillRect(8, h - 14, w - 16, 6);
    g.fillStyle = '#d22d2d'; g.beginPath(); g.arc(88, h / 2, 56, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.font = '700 84px "Rubik","Noto Sans",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('M', 88, h / 2 + 4);
    g.font = '900 78px "Rubik","Noto Sans",sans-serif'; g.fillText('МЕТРО', 318, h / 2 + 4);
  }, { key: 'ut-metro-sign' });

  // ------------------------------------------------------------------ helpers
  /** extruded profile; pts = [[a,b],...] in the (a,b) plane, extruded `depth` along local +z (centred = false: z from 0 to depth) */
  const prism = (parent, pts, depth, material, pos, rotY = 0, cast = true) => {
    const m = new THREE.Mesh(ctx.geo.extrude(pts, depth, { center: false }), material);
    m.position.set(pos[0], pos[1], pos[2]); m.rotation.y = rotY; m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
  };
  /** arch ring (a vaulted tunnel shell) in the (x, y) plane, local y = 0 at the floor; extruded along +z */
  const archRing = (halfW, wallH, th, yBottom, n = 28) => {
    const arc = (R) => { const a = []; for (let i = 0; i <= n; i++) { const t = Math.PI - i * Math.PI / n; a.push([R * Math.cos(t), wallH + R * Math.sin(t)]); } return a; };
    const inner = [[-halfW, yBottom], ...arc(halfW), [halfW, yBottom]], R2 = halfW + th;
    const outer = [[-R2, yBottom], ...arc(R2), [R2, yBottom]];
    return [...outer, ...inner.reverse()];
  };
  const wallBox = (x0, x1, z0, z1, y0, y1, material, collide = true) => {
    ku.box(x1 - x0, y1 - y0, z1 - z0, material, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
    if (collide) physics.addAABB(x0, z0, x1, z1);
  };

  // ------------------------------------------------------------------ the street: slab with a hole, pavilion
  const GZ0 = -120, GZ1 = 640, HX = 3.9, HZ1 = 14.5;
  const slab = (x0, x1, z0, z1) => ks.box(x1 - x0, 1, z1 - z0, M.concrete, [(x0 + x1) / 2, -0.5, (z0 + z1) / 2]);
  slab(-160, 160, GZ0, 0); slab(-160, 160, HZ1, GZ1); slab(-160, -HX, 0, HZ1); slab(HX, 160, 0, HZ1);
  // a road with kerb strips and a crossing, so the street has something to read against
  ks.box(320, 0.04, 14, M.asphalt, [0, 0.02, -34]); ks.box(320, 0.14, 0.3, M.curb, [0, 0.07, -26.9]); ks.box(320, 0.14, 0.3, M.curb, [0, 0.07, -41.1]);
  for (let i = 0; i < 9; i++) ks.box(0.5, 0.05, 6, mat.toon('#ecebe4'), [-4 + i * 1.0, 0.045, -34]);
  // buildings around (flat boxes: the street side of the contrast)
  const blocks = [[-60, -12, 30, 20, '#d9a8a0'], [48, -8, 40, 24, '#e3d29a'], [-40, 70, 22, 18, '#a9c2d9'], [55, 70, 26, 30, '#e8dcc0']];
  for (const [x, z, w, d, c] of blocks) { const h = 22; ks.box(w, h, d, mat.toon(c), [x, h / 2, z]); physics.addAABB(x - w / 2, z - d / 2, x + w / 2, z + d / 2, 0, h); }
  // pavilion: two side walls, a roof, a back wall, a sign; open to the north
  const PX = 6.2, PZ0 = -10, PH = 4.8;
  ks.box(0.5, PH, HZ1 - PZ0, M.wallCream, [-PX, PH / 2, (PZ0 + HZ1) / 2]); ks.box(0.5, PH, HZ1 - PZ0, M.wallCream, [PX, PH / 2, (PZ0 + HZ1) / 2]);
  physics.addAABB(-PX - 0.25, PZ0, -PX + 0.25, HZ1, 0, PH); physics.addAABB(PX - 0.25, PZ0, PX + 0.25, HZ1, 0, PH);
  ks.box(2 * PX + 1.2, 0.5, HZ1 - PZ0 + 0.6, M.concreteDark, [0, PH + 0.25, (PZ0 + HZ1) / 2 + 0.3]);
  ks.box(2 * PX, PH, 0.5, M.wallCream, [0, PH / 2, HZ1 + 0.25]); physics.addAABB(-PX, HZ1, PX, HZ1 + 0.5, 0, PH);
  const signMat = mat.emissive('#ffffff', 1.0, { map: metroSign }); const sign = ks.plane(7.5, 2.34, signMat, [0, PH + 1.55, PZ0 - 0.1], [0, Math.PI, 0]); sign.castShadow = false;
  ks.box(0.3, 2.4, 0.3, M.steel, [-3.4, PH + 1.2, PZ0 - 0.1]); ks.box(0.3, 2.4, 0.3, M.steel, [3.4, PH + 1.2, PZ0 - 0.1]);
  // shaft side walls from the street down to the slope (z 0 .. HZ1): triangles in the (z, y) plane, extruded along x
  const tri = [[0, 0], [-HZ1, 0], [-HZ1, -HZ1 * TAN - 0.3], [0, -0.3]];   // sx = -z (rotation.y = PI/2 maps local x to -z)
  for (const sx of [-1, 1]) prism(U, tri, 0.5, M.wallCream, [sx > 0 ? HX - 0.05 : -HX - 0.45, -0.02, 0], Math.PI / 2);   // 5 cm inside the slab edge: no coplanar faces

  // ------------------------------------------------------------------ the shaft: shell, lane visuals
  const L_S = (RUN - HZ1) / COS;                          // slope length of the vaulted part (m)
  const slopeFrame = new THREE.Group(); slopeFrame.position.set(0, -HZ1 * TAN, HZ1); slopeFrame.rotation.x = SLOPE; U.add(slopeFrame);
  const ringPts = archRing(3.6, 3.2, 0.4, -0.7);
  prism(slopeFrame, ringPts, L_S, M.ring, [0, 0, 0]);
  // lamps along the vault: two cove strips and ceiling lamps every 6 m
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, L_S), M.lampWarm); m.position.set(sx * 3.5, 2.2, L_S / 2); slopeFrame.add(m); }
  for (let z = 4; z < L_S; z += 6) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.5), M.lampWarm); m.position.set(0, 6.72, z); slopeFrame.add(m); }
  // the lane frame starts at the street edge (z = 0, y = 0): floor slab under the lanes, balustrades between and beside them (visual boxes 1 m high; colliders below)
  const L_TOP = RUN / COS;                                 // slope length from the street edge to the bottom
  const laneFrame = new THREE.Group(); laneFrame.position.set(0, 0, 0); laneFrame.rotation.x = SLOPE; U.add(laneFrame);
  const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.3, L_TOP), M.slab); floorSlab.position.set(0, -0.2, L_TOP / 2); floorSlab.receiveShadow = true; laneFrame.add(floorSlab);
  for (const x of [-3.4, -1.78, 1.78, 3.4]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, L_TOP), M.steelDark); m.position.set(x, 0.5, L_TOP / 2); laneFrame.add(m); }
  // fixed stairs: a sawtooth profile in the (z, y) plane, extruded across x (353 steps)
  const N_ST = 353, tread = RUN / N_ST, rise = DEPTH / N_ST;
  const toothPts = []; for (let i = 0; i < N_ST; i++) { toothPts.push([-(i * tread), -(i + 1) * rise], [-((i + 1) * tread), -(i + 1) * rise]); }
  toothPts.push([-RUN, -DEPTH - 0.6], [0, -0.6]);
  prism(U, toothPts, 2.96, M.stairs, [-1.48, 0, 0], Math.PI / 2);
  const stairsWalk = physics.addStairs(0, RUN / 2, 2.96, RUN, 0, 0, -DEPTH, N_ST);
  // escalators: a ribbed belt strip that scrolls along the slope; the physics is a conveyor
  const comb = (key) => tex.draw(32, 64, (g, w, h) => { g.fillStyle = '#9ba2aa'; g.fillRect(0, 0, w, h); g.fillStyle = '#5d636b'; g.fillRect(0, 0, w, h * 0.22); g.fillStyle = '#c9ced4'; g.fillRect(0, h * 0.22, w, 3); }, { key, repeat: [1, L_TOP / 0.4] });
  const belts = [];
  const mkEsc = (x, dir, key) => {
    const esc = physics.addEscalator({ bottom: { x, y: -DEPTH, z: RUN }, top: { x, y: 0, z: 0 }, w: 1.1, dir, speed: 0.9 });
    const map = comb(key).clone(); map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(1, L_TOP / 0.4);
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, L_TOP), new THREE.MeshToonMaterial({ map, gradientMap: mat.gradientMap, color: 0xffffff }));
    m.castShadow = false; m.receiveShadow = true; m.userData.noBatch = true;
    m.position.set(x, -0.05, L_TOP / 2); laneFrame.add(m);
    belts.push({ esc, map, phase: 0 });
    return esc;
  };
  const escDown = mkEsc(-2.6, -1, 'ut-comb-down'), escUp = mkEsc(2.6, +1, 'ut-comb-up');
  // colliders: the walls / balustrades of the shaft (full height) and the terrain hole over the whole footprint
  physics.addHole(0, RUN / 2, 7.4, RUN, 0);
  for (const x of [-3.4, -1.78, 1.78, 3.4]) physics.addAABB(x - 0.2, 0, x + 0.2, RUN);
  physics.addAABB(-3.9, 0, -3.6, RUN); physics.addAABB(3.6, 0, 3.9, RUN);

  // ------------------------------------------------------------------ stations and the tunnel
  const hall = (z0, z1, name, nameEn, withNorthSlot) => {
    const len = z1 - z0;
    const g = new THREE.Group(); g.position.set(0, FY, z0); U.add(g);
    prism(g, archRing(HALL_W, 4.4, 0.5, -1.7), len, M.vault, [0, 0, 0]);
    // floors
    ku.box(2 * HALL_W, 0.3, len, M.slab, [0, BED - 0.15, (z0 + z1) / 2]);                    // bed slab, top at BED
    const plat = ku.box(2 * PLAT_X, 1.1, len, matPlatform, [0, FY - 0.55, (z0 + z1) / 2]);   // platform volume, top at FY
    physics.addWalkBox(0, (z0 + z1) / 2, 2 * PLAT_X, len + (withNorthSlot ? 6 : 0), 0, FY, FY - 1.1);
    for (const sx of [-1, 1]) {
      ku.box(HALL_W - PLAT_X, 0.1, len, M.ballast, [sx * (PLAT_X + (HALL_W - PLAT_X) / 2), BED + 0.05, (z0 + z1) / 2]);                    // ballast, top at BED + 0.1
      physics.addWalkBox(sx * (PLAT_X + (HALL_W - PLAT_X) / 2), (z0 + z1) / 2, HALL_W - PLAT_X, len, 0, BED + 0.1, BED - 1);
      ku.box(0.5, 0.04, len, M.yellow, [sx * (PLAT_X - 0.25), FY + 0.02, (z0 + z1) / 2]);       // safety line (inside the platform edge)
      // rails + sleepers
      for (const dx of [-0.72, 0.72]) ku.box(0.1, 0.16, len, M.rail, [sx * TRACK_X + dx, BED + 0.18, (z0 + z1) / 2]);
      // walls
      wallBox(sx > 0 ? HALL_W - 0.15 : -HALL_W - 0.3, sx > 0 ? HALL_W + 0.3 : -HALL_W + 0.15, z0, z1, BED - 0.3, FY + 2.8, M.wallPink);       // wall cladding 15 cm in front of the vault ring (no coplanar faces)
      ku.box(0.06, 1.6, len, M.base, [sx * (HALL_W - 0.18), FY - 0.2, (z0 + z1) / 2]);                                                   // dark skirting band
      // wall signs
      for (let k = 0; k < 4; k++) {
        const z = z0 + 16 + k * 30;
        const sm = mat.emissive('#ffffff', 1.0, { map: signTex(name, nameEn, 'ut-name-' + name) });
        const p = ku.plane(6, 1.5, sm, [sx * (HALL_W - 0.2), FY + 3.5, z], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); p.castShadow = false;
      }
    }
    // cove lamp strips along the vault (on the arch, both sides, plus the crown)
    for (const x of [-7.4, -3.6, 0, 3.6, 7.4]) {
      const y = 4.4 + Math.sqrt(HALL_W * HALL_W - x * x) - 0.1, tilt = Math.atan2(x, Math.sqrt(HALL_W * HALL_W - x * x));
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, len - 2), M.lampWarm); m.position.set(x, y, len / 2); m.rotation.z = -tilt; g.add(m);
    }
    // platform furniture: benches, a pillar row (visual + collision)
    for (let k = 0; k < 6; k++) {
      const z = z0 + 14 + k * 18;
      ku.box(0.9, 0.5, 2.4, M.seatBlue, [0, FY + 0.25, z]); ku.box(0.1, 0.5, 2.4, M.steelDark, [0.5, FY + 0.7, z]);
      physics.addAABB(-0.45, z - 1.2, 0.45, z + 1.2, FY, FY + 0.6);
      ku.box(0.7, 3.4, 0.7, M.wallCream, [-3.0, FY + 1.7, z + 9]); ku.box(0.7, 3.4, 0.7, M.wallCream, [3.0, FY + 1.7, z + 9]);
      physics.addAABB(-3.35, z + 9 - 0.35, -2.65, z + 9 + 0.35, FY, FY + 3.4); physics.addAABB(2.65, z + 9 - 0.35, 3.35, z + 9 + 0.35, FY, FY + 3.4);
    }
    return g;
  };
  hall(ZA0, ZA1, 'Тестовая', 'Test station A', true);
  hall(ZB0, ZB1, 'Вторая', 'Second station B', false);
  // hall end walls: north of A has the shaft slot, south of A / north of B open to the tunnel, south of B closed
  const endWall = (z, slotHalf, slotTop) => {
    wallBox(-HALL_W, -slotHalf, z - 0.3, z + 0.3, BED - 0.3, FY + 16, M.wallCream);
    wallBox(slotHalf, HALL_W, z - 0.3, z + 0.3, BED - 0.3, FY + 16, M.wallCream);
    ku.box(2 * slotHalf, FY + 16 - slotTop, 0.6, M.wallCream, [0, (slotTop + FY + 16) / 2, z]);
  };
  endWall(ZA0, 3.95, FY + 7.9);
  endWall(ZA1, 6.4, FY + 5.0); endWall(ZB0, 6.4, FY + 5.0);
  wallBox(-HALL_W, HALL_W, ZB1 - 0.3, ZB1 + 0.3, BED - 0.3, FY + 16, M.wallCream);
  // tunnel between the halls
  const tun = new THREE.Group(); tun.position.set(0, BED, ZA1); U.add(tun);
  prism(tun, archRing(6.4, 2.6, 0.5, -0.8), ZB0 - ZA1, M.vaultTunnel, [0, 0, 0]);
  ku.box(12.8, 0.3, ZB0 - ZA1, M.slab, [0, BED - 0.15, (ZA1 + ZB0) / 2]); ku.box(12.8, 0.1, ZB0 - ZA1, M.ballast, [0, BED + 0.05, (ZA1 + ZB0) / 2]);
  physics.addWalkBox(0, (ZA1 + ZB0) / 2, 12.8, ZB0 - ZA1, 0, BED + 0.1, BED - 1);
  for (const sx of [-1, 1]) { wallBox(sx > 0 ? 6.25 : -6.7, sx > 0 ? 6.7 : -6.25, ZA1, ZB0, BED - 0.3, FY + 6, M.wallPink); }
  for (const x of [-TRACK_X, TRACK_X]) for (const dx of [-0.72, 0.72]) ku.box(0.1, 0.16, ZB0 - ZA1, M.rail, [x + dx, BED + 0.18, (ZA1 + ZB0) / 2]);       // (rails on both tracks)
  for (let z = ZA1 + 6; z < ZB0; z += 12) for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 1.2), M.lampWarm); m.position.set(sx * 6.2, 2.4, z - ZA1); tun.add(m); }
  // service stairs at the south end of platform A: from the track bed up to the platform (so a walker that stepped off the edge can climb back)
  physics.addStairs(0, ZA1 + 1.5, 2, 3, Math.PI, BED, FY, 5);       // rotY = PI: rising toward north; first step ~0.22 above the bed
  for (let i = 0; i < 5; i++) { const top = BED + (FY - BED) * (i + 1) / 5, h = top - BED; ku.box(2, h, 0.6, M.steel, [0, BED + h / 2, ZA1 + 1.5 + 1.2 - i * 0.6]); }

  // ------------------------------------------------------------------ the train (dynamic: a pure function of the simulation time)
  // ~420 boxes merged by material into ~14 meshes (the four door-leaf groups move: leaves of one side and direction slide together)
  const train = new THREE.Group(); train.name = 'train'; train.userData.undergroundOnly = true;
  const parts = new Map(), leafParts = new Map();
  const put = (map, key, material, g) => { let a = map.get(key); if (!a) map.set(key, (a = { material, list: [] })); a.list.push(g); };
  const B = (map, key, w, h, d, material, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); put(map, key, material, g); };
  const car = (cz, front, rear) => {
    const b = (w, h, d, material, x, y, z) => B(parts, material.uuid, w, h, d, material, x, y, z + cz);
    b(CAR_W, 0.25, CAR_LEN, M.trainFloor, 0, -0.125, 0); b(CAR_W, 0.15, CAR_LEN, M.roof, 0, 2.5, 0);
    b(CAR_W - 0.4, 0.5, CAR_LEN - 2, M.under, 0, -0.5, 0);                                        // under-frame
    for (const z of [-6.5, 6.5]) b(2.2, 0.55, 2.2, M.steelDark, 0, -0.7, z);                      // bogies
    for (const e of [-1, 1]) {                                                                    // end walls with a gangway gap (or a closed cab front)
      const closed = e < 0 ? rear : front;
      if (closed) b(CAR_W, 2.45, 0.12, M.trainBody, 0, 1.2, e * (CAR_LEN / 2 - 0.06));
      else for (const sx of [-1, 1]) b(0.7, 2.45, 0.12, M.trainBody, sx * 1.0, 1.2, e * (CAR_LEN / 2 - 0.06));
    }
    const doorZ = [-6.6, -2.2, 2.2, 6.6], segs = [[-9.5, -7.25], [-5.95, -2.85], [-1.55, 1.55], [2.85, 5.95], [7.25, 9.5]];
    for (const sx of [-1, 1]) {
      for (const [a, c] of segs) {
        const zc = (a + c) / 2, len = c - a;
        b(0.1, 2.3, len, M.trainBody, sx * 1.3, 1.15, zc);
        b(0.04, 0.7, len - 0.4, M.trainGlass, sx * 1.355, 1.5, zc); b(0.04, 0.7, len - 0.4, M.trainGlass, sx * 1.245, 1.5, zc);
        b(0.05, 0.16, len, M.trainStripe, sx * 1.36, 0.55, zc);
        b(0.5, 0.45, len - 0.1, zc < 0 ? M.seat : M.seatBlue, sx * 1.0, 0.45, zc);               // seat bench along the wall
        b(0.12, 0.5, len - 0.1, M.seatBlue, sx * 1.21, 0.95, zc);
      }
      for (const dz of doorZ) {
        b(0.1, 0.35, 1.3, M.trainBody, sx * 1.3, 2.125, dz);                                      // lintel
        for (const e of [-1, 1]) B(leafParts, sx + '|' + e, 0.05, 1.95, 0.64, M.trainDoor, sx * 1.375, 0.975, cz + dz + e * 0.32);
      }
    }
    for (const sx of [-1, 1]) b(0.3, 0.06, CAR_LEN - 2.2, M.lampCool, sx * 0.55, 2.4, 0);   // ceiling lamp strips
    for (const dz of [-6.6, -2.2, 2.2, 6.6]) { const g = new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8); g.translate(0, 1.2, cz + dz * 0.5); put(parts, M.pole.uuid, M.pole, g); }
    b(0.05, 0.05, CAR_LEN - 1, M.pole, -0.45, 2.1, 0); b(0.05, 0.05, CAR_LEN - 1, M.pole, 0.45, 2.1, 0);
    if (front) { const hl = mat.emissive('#fffbe8', 2.0); for (const sx of [-0.8, 0.8]) B(parts, hl.uuid, 0.3, 0.22, 0.05, hl, sx, 0.7, cz + CAR_LEN / 2 + 0.03); b(CAR_W - 0.3, 0.75, 0.04, M.trainGlass, 0, 1.65, CAR_LEN / 2 + 0.02); }
    if (rear) { const tl = mat.emissive('#ff4a3a', 2.0); for (const sx of [-0.8, 0.8]) B(parts, tl.uuid, 0.3, 0.22, 0.05, tl, sx, 0.7, cz - CAR_LEN / 2 - 0.03); }
  };
  for (let i = 0; i < N_CARS; i++) car((i - (N_CARS - 1) / 2) * (CAR_LEN + CAR_GAP), i === N_CARS - 1, i === 0);
  const solid = (a) => { const mesh = new THREE.Mesh(ctx.geo.mergeGeometries(a.list, false), a.material); mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = true; return mesh; };
  for (const a of parts.values()) train.add(solid(a));
  const leafMeshes = [];
  for (const [key, a] of leafParts) { const mesh = solid(a); mesh.userData.e = Number(key.split('|')[1]); train.add(mesh); leafMeshes.push(mesh); }
  ctx.add(train);

  // schedule: phases A dwell -> A to B -> B dwell -> B to A ... as a pure function of t (+ shift, set when a rider boards so the departure follows soon)
  let shift = 0;
  const tauOf = (t) => (((t + shift) % PERIOD) + PERIOD) % PERIOD;
  const prof = (u) => (u < T_RIDE / 2 ? 0.5 * ACC * u * u : DIST - 0.5 * ACC * (T_RIDE - u) * (T_RIDE - u));     // distance covered after u seconds of the ride
  const openFrac = (u) => (u < 1 ? 0 : u < 3 ? (u - 1) / 2 : u < DWELL - 4 ? 1 : u < DWELL - 1 ? (DWELL - 1 - u) / 3 : 0);
  /** { z (train centre), at: 'A' | 'B' | null, open 0..1, speed } */
  function trainState(t) {
    const tau = tauOf(t);
    if (tau < DWELL) return { z: ZA, at: 'A', open: openFrac(tau), tau, speed: 0 };
    if (tau < DWELL + T_RIDE) { const u = tau - DWELL; return { z: ZA + prof(u), at: null, open: 0, tau, speed: Math.min(u, T_RIDE - u) * ACC }; }
    if (tau < 2 * DWELL + T_RIDE) return { z: ZB, at: 'B', open: openFrac(tau - DWELL - T_RIDE), tau, speed: 0 };
    const u = tau - 2 * DWELL - T_RIDE; return { z: ZB - prof(u), at: null, open: 0, tau, speed: Math.min(u, T_RIDE - u) * ACC };
  }
  /** the ride frame handed to player.board (pure function of t) */
  const trainFrame = (t) => ({ x: TRACK_X, y: FY, z: trainState(t).z, yaw: 0 });
  ctx.onUpdate((dt, t) => {
    const st = trainState(t); train.position.set(TRACK_X, FY, st.z);
    for (const m of leafMeshes) m.position.z = m.userData.e * 0.66 * st.open;                 // the leaves slide apart: 0.66 m each
    for (const b of belts) { b.phase += -b.esc.dir * b.esc.speed * dt / 0.4; b.map.offset.y = b.phase; }
  });

  // ------------------------------------------------------------------ zones
  ctx.zones.add({ id: 'vestibule', box: { x0: -PX + 0.3, x1: PX - 0.3, y0: -0.3, y1: PH, z0: PZ0, z1: HZ1 }, indoor: { name: 'vestibule', sun: 0.4, sky: false, shadows: false,
    ambient: { color: '#fff2dc', ground: '#e6d6c0', intensity: 1.7 }, fog: { color: '#cdbfa8', density: 0.003 }, key: { color: '#fff1d8', intensity: 1.8, dir: [0.3, 0.8, 0.5] }, bloom: 0.3 } });
  ctx.zones.add({ id: 'under', box: { x0: -12, x1: 12, y0: -75, y1: -0.3, z0: -6, z1: ZB1 + 4 }, indoor: { name: 'metro', sun: 0, sky: false, shadows: false, far: 420,
    ambient: { color: '#fff1e0', ground: '#d9c9b6', intensity: 1.9 }, fog: { color: '#bfae93', density: 0.006 }, key: { color: '#fff0da', intensity: 1.5, dir: [0.35, 0.8, 0.5] }, bloom: { bloom: 0.34, glow: 0.18, threshold: 0.95 }, vignette: 0.22 } });

  // ------------------------------------------------------------------ interaction
  const cam = ctx.camera.position, pl = () => ctx.playerObj;
  const boardable = () => { const s = trainState(ctx.time); return !pl().riding && s.at === 'A' && s.open > 0.9; };
  ctx.interact.add({ id: 'board', label: 'Войти в вагон', labelEn: 'Board the train', radius: 3.4, enabled: boardable,
    at: () => ({ x: TRACK_X - CAR_W / 2, y: FY + 1.0, z: Math.max(ZA - TRAIN_HALF + 2, Math.min(ZA + TRAIN_HALF - 2, cam.z)) }),
    onUse: () => {
      const s = trainState(ctx.time); if (s.tau < DWELL - 6) shift += DWELL - 6 - s.tau;           // the doors close in a few seconds, the train leaves
      ctx.ui.toast('Осторожно, двери закрываются · Doors closing');
      let arrivedToast = false;
      pl().board({ frame: trainFrame, bounds: { x0: -CAR_W / 2 + 0.3, x1: CAR_W / 2 - 0.3, z0: -TRAIN_HALF + 1, z1: TRAIN_HALF - 1 }, lookRelative: true, onExit: () => { arrivedToast = true; } });
      ctx.undertest.lastBoard = { t: ctx.time };
    } });
  ctx.interact.add({ id: 'alight', label: 'Выйти на платформу', labelEn: 'Get off', radius: 6, enabled: () => { const s = trainState(ctx.time); return pl().riding && s.at === 'B' && s.open > 0.9; },
    at: () => ({ x: cam.x, y: cam.y, z: cam.z }),
    onUse: () => { const p = pl(); p.alight({ x: PLAT_X - 1.0, y: FY, z: p.pos.z, yaw: 90 }); ctx.ui.toast('Станция «Вторая» · Station B'); ctx.undertest.alighted = { x: PLAT_X - 1.0, z: p.pos.z }; } });
  ctx.interact.add({ id: 'esc', label: () => (escDown.dir === 0 ? 'Пустить эскалатор' : 'Остановить эскалатор'), labelEn: () => (escDown.dir === 0 ? 'Start the escalator' : 'Stop the escalator'), radius: 2.6,
    at: () => ({ x: -2.6, y: 1.0, z: 1.2 }), onUse: () => { escDown.setDir(escDown.dir === 0 ? -1 : 0); ctx.ui.toast(escDown.dir === 0 ? 'Эскалатор остановлен · Escalator stopped' : 'Эскалатор идёт вниз · Escalator running down'); } });
  ctx.interact.add({ id: 'map', label: 'Схема метро', labelEn: 'Metro map', radius: 3, at: () => ({ x: 0, y: 1.5, z: -7 }),
    onUse: () => ctx.ui.panel('<p><b>Тестовая</b> — <b>Вторая</b>: 200 м, 27 с.</p><p>Test station A to station B, 200 m, 27 s.</p>', { title: 'Схема метро · Metro map' }) });

  ctx.undertest = {
    constants: { SLOPE, DEPTH, RUN, FY, BED, ZA, ZB, ZA0, ZA1, ZB0, ZB1, TRACK_X, PLAT_X, HALL_W, DWELL, T_RIDE, PERIOD, TRAIN_HALF, HX, HZ1 },
    escDown, escUp, stairs: stairsWalk, trainState, trainFrame, group: U, street: S, train,
    get shift() { return shift; }, set shift(v) { shift = v; },
    boardable, lastBoard: null, alighted: null,
  };
}
