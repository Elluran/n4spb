// rail/trains.js - the trains of the Moscow Railway Station: consists on the platform tracks, a schedule that is a PURE FUNCTION of t
// (arrive: brake from the throat, dwell with doors open and lamps lit, depart: accelerate south; some tracks stay empty, some trains idle),
// instanced cars (one InstancedMesh per car type and part: body, windows, door leaves, lamps), colliders for the car bodies (physics.addDynamic).
// Every train is a front (north end, arc length s along the track) plus a list of cars hanging south of it; cars sit on two bogie points of the track path.
// Families / liveries: rail/car.js. Pure kinematics: constant-deceleration braking from 11 m/s, constant acceleration to 14 m/s.
import * as THREE from 'three';
import { buildCar, CAR_LENGTH, halfW } from './car.js';
import { RAIL_TOP } from './geom.js';
import { RAMP } from './platform.js';

const GAP = 0.55, CAR_H = { velaroHead: 4.0, velaroMid: 4.0, velaroMidP: 4.0, desiroHead: 4.1, desiroMid: 4.1, coach: 4.1, dd: 4.8, strela: 4.1, ep2k: 4.3, ep20: 4.3 };

const rep = (fam, n) => Array.from({ length: n }, () => ({ fam }));
const sapsan = () => [{ fam: 'velaroHead' }, { fam: 'velaroMid' }, { fam: 'velaroMidP' }, ...rep('velaroMid', 4), { fam: 'velaroMidP' }, { fam: 'velaroMid' }, { fam: 'velaroHead', flip: true }];
const lastochka = () => [{ fam: 'desiroHead' }, ...rep('desiroMid', 6), { fam: 'desiroHead', flip: true }];
const hauled = (loco, car, n, twoLocos = true) => [{ fam: loco }, ...rep(car, n), ...(twoLocos ? [{ fam: loco, flip: true }] : [])];
const CONSISTS = {
  sapsan, lastochka,
  rzdDD: (n) => hauled('ep2k', 'dd', n),
  rzd: (n) => hauled('ep2k', 'coach', n),
  strela: (n) => hauled('ep20', 'strela', n),
};

// Timetable (seconds in a cycle; `arrive` = the moment the train stands, `depart` = the moment it starts to roll). Tracks not listed are empty.
//   mode 'cycle': arrives, dwells, departs, is away for the rest of the period;  'idle': stands all day (doors shut, lamps lit).
const PLAN = [
  { track: 2, kind: 'rzdDD', cars: 8, mode: 'cycle', period: 780, arrive: 60, depart: 400, dest: 'Москва · Ленинградский вокзал' },
  { track: 3, kind: 'sapsan', mode: 'cycle', period: 640, arrive: 38, depart: 300, dest: 'Москва · Ленинградский вокзал' },
  { track: 4, kind: 'strela', cars: 14, mode: 'idle', dest: 'Красная стрела · Москва' },
  { track: 6, kind: 'sapsan', mode: 'cycle', period: 700, arrive: 455, depart: 9, dest: 'Москва · Ленинградский вокзал' },
  { track: 7, kind: 'lastochka', mode: 'cycle', period: 860, arrive: 20, depart: 340, dest: 'Великий Новгород' },
  { track: 8, kind: 'rzd', cars: 15, mode: 'idle', single: true, dest: 'Адлер' },
  { track: 10, kind: 'rzdDD', cars: 12, mode: 'cycle', period: 900, arrive: 700, depart: 150, dest: 'Москва · Ленинградский вокзал' },
  { track: 11, kind: 'sapsan', mode: 'cycle', period: 720, arrive: 130, depart: 520, dest: 'Москва · Ленинградский вокзал' },
  // stabled rakes on the electrified sidings west of the throat
  { pathId: 'w1388432786', sStart: 14, kind: 'rzd', cars: 6, mode: 'idle', single: true, dest: 'Резерв' },
  { pathId: 'w1388432789', sStart: 14, kind: 'lastochka', mode: 'idle', dest: 'Резерв' },
];

// side lettering (plain wordmarks) per car family: z centre, y range, length along the car
const DECALS = {
  velaroHead: { key: 'sapsan', z: -2.6, y0: 1.32, y1: 1.74, len: 3.3 }, velaroMid: { key: 'sapsan', z: 0.2, y0: 1.32, y1: 1.74, len: 3.3 }, velaroMidP: { key: 'sapsan', z: 0.2, y0: 1.32, y1: 1.74, len: 3.3 },
  strela: { key: 'strela', z: 0, y0: 1.4, y1: 1.76, len: 5.6 }, desiroHead: { key: 'lastochka', z: -3.5, y0: 1.02, y1: 1.4, len: 3.0 }, desiroMid: { key: 'lastochka', z: 0, y0: 1.02, y1: 1.4, len: 3.0 },
};
function decalTexture(ctx, key) {
  const F = ctx.tex.FONTS.round;
  return ctx.tex.draw(512, 96, (g, w, h) => {
    g.textBaseline = 'middle'; g.textAlign = 'center';
    if (key === 'sapsan') { g.fillStyle = '#d3262b'; g.font = `italic 800 78px ${F}`; g.fillText('САПСАН', w / 2 - 6, h / 2 + 2); g.fillRect(w * 0.62, h * 0.82, w * 0.3, 7); }
    else if (key === 'strela') { g.fillStyle = '#d8dbde'; g.font = `600 58px ${F}`; const t = 'КРАСНАЯ СТРЕЛА'; const step = 31; let x = w / 2 - (t.length - 1) * step / 2; for (const ch of t) { g.fillText(ch, x, h / 2 + 2); x += step; } }
    else { g.fillStyle = '#cf3a2d'; g.font = `italic 700 70px ${F}`; g.fillText('Ласточка', w / 2, h / 2 + 2); }
  }, { key: 'rail-decal-' + key, anisotropy: 4 });
}
function decalGeo(g, d) {
  const pos = [], nrm = [], uv = [], idx = [];
  const ym = (d.y0 + d.y1) / 2, x = halfW(g.S.prof, ym) + 0.014;
  for (const sx of [1, -1]) {
    const z0 = d.z - d.len / 2, z1 = d.z + d.len / 2, b = pos.length / 3;
    // +X side: u grows toward -Z (the viewer outside reads left to right); -X side: toward +Z
    const q = sx > 0 ? [[z1, 0], [z0, 1]] : [[z0, 0], [z1, 1]];
    for (const [zz, u] of [[q[0][0], 0], [q[1][0], 1]]) { pos.push(sx * x, d.y0, zz, sx * x, d.y1, zz); nrm.push(sx, 0, 0, sx, 0, 0); uv.push(u, 0, u, 1); }
    idx.push(b, b + 2, b + 3, b, b + 3, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); return geo;
}

function boardTexture(ctx, dest, no) {
  return ctx.tex.draw(256, 80, (g, w, h) => {
    g.fillStyle = '#101216'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2a93a'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = `700 24px ${ctx.tex.FONTS.sans}`; g.fillText('№ ' + no, 12, 22);
    g.font = `700 26px ${ctx.tex.FONTS.sans}`; ctx.tex.fitText(g, dest, 12, 56, w - 24, 26, ctx.tex.FONTS.sans, 700);
  }, { key: 'rail-board-' + dest + no });
}
function boardGeo(g, zc) {
  const pos = [], nrm = [], uv = [], idx = [], hw = 0.46, y0 = 2.18, y1 = 2.58, x = halfW(g.S.prof, 2.4) + 0.016;
  for (const sx of [1, -1]) {
    const b = pos.length / 3, za = sx > 0 ? zc + hw : zc - hw, zb = sx > 0 ? zc - hw : zc + hw;
    for (const [zz, u] of [[za, 0], [zb, 1]]) { pos.push(sx * x, y0, zz, sx * x, y1, zz); nrm.push(sx, 0, 0, sx, 0, 0); uv.push(u, 0, u, 1); }
    idx.push(b, b + 2, b + 3, b, b + 3, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); return geo;
}
const BOARD_FAM = new Set(['coach', 'dd', 'strela']);
const TRAIN_NO = { 2: '016А', 3: '752А', 4: '002А', 6: '764А', 7: '883Н', 8: '009А', 10: '026А', 11: '768А' };

const BRAKE = 0.6, ACC = 0.5, VC = 11, VMAX = 14;
const mod = (a, n) => ((a % n) + n) % n;
const ease = (v) => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
const brakeDist = (sig) => { const Tb = VC / BRAKE; return sig <= Tb ? 0.5 * BRAKE * sig * sig : 0.5 * BRAKE * Tb * Tb + VC * (sig - Tb); };
const accDist = (tau) => { const Ta = VMAX / ACC; return tau <= Ta ? 0.5 * ACC * tau * tau : 0.5 * ACC * Ta * Ta + VMAX * (tau - Ta); };

export function buildTrains(ctx, G, root, fenceZ = 1e9) {
  const { mat } = ctx;
  const night = ctx.shared.uNight || { value: 0 };
  // ---- geometry per family (only the families that are used)
  const used = new Set();
  const trains = [];
  for (const P of PLAN) {
    const path = P.pathId ? G.paths.find((p) => p.id === P.pathId) : G.routes[P.track]; if (!path) continue;
    const cons = P.kind === 'sapsan' || P.kind === 'lastochka' ? CONSISTS[P.kind]() : CONSISTS[P.kind](P.cars);
    if (P.single) { cons.pop(); }
    // stop position: the first door lines up with the flat deck, i.e. the nose stands ~ 10 m behind the platform head ramp
    const pl = P.pathId ? null : G.platforms.find((q) => q.tracks.includes(P.track));
    const buf = P.pathId ? null : G.buffers.find((b) => b.track === 'T' + P.track);
    let zFront = Math.max(pl ? pl.zHead + RAMP * 0.6 : 0, buf ? buf.z + 16 : 0);
    const L = cons.reduce((a, c) => a + CAR_LENGTH[c.fam], 0) + GAP * (cons.length - 1);
    const sStop = P.pathId ? P.sStart : path.project(path.xAtZ(zFront) ?? path.xs[0], zFront);
    let off = 0; const cars = cons.map((c, i) => { const len = CAR_LENGTH[c.fam]; const o = off + len / 2; off += len + GAP; used.add(c.fam); return { ...c, i, off: o, len }; });
    const sides = P.pathId ? [] : G.sides[P.track] || [];
    trains.push({ ...P, id: `${P.kind}-${P.track || P.pathId}`, path, cars, L, sStop, sides, VISEND: Math.min(path.len + 40, path.project(path.xAtZ(Math.min(fenceZ - 3, path.zs[path.zs.length - 1])) ?? path.xs[path.xs.length - 1], Math.min(fenceZ - 3, path.zs[path.zs.length - 1])) + (fenceZ < 1e8 ? 0 : 40)) });
  }
  // ---- instanced meshes per family
  const M = {
    body: mat.toon('#ffffff', { vertexColors: true, paint: 0.02, name: 'rail-train-body' }),
    win: mat.toon('#ffffff', { vertexColors: true, paint: 0, emissive: '#ffd9a0', emissiveIntensity: 0, name: 'rail-train-win' }),
    leaf: mat.toon('#ffffff', { vertexColors: true, paint: 0.02, name: 'rail-train-leaf' }),
    lamp: mat.emissive('#ffffff', 2.2),
  };
  const fam = {};
  const counts = {}; for (const T of trains) for (const c of T.cars) counts[c.fam] = (counts[c.fam] || 0) + 1;
  let tris = 0;
  for (const key of used) {
    const g = buildCar(key), n = counts[key];
    const mk = (geo, material, name, cast) => {
      if (!geo) return null;
      const im = new THREE.InstancedMesh(geo, material, n); im.name = `rail-${key}-${name}`; im.frustumCulled = false; im.castShadow = cast; im.receiveShadow = true; im.count = 0;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      ctx.add(im);
      if (name === 'lamp') im.setColorAt(0, new THREE.Color('#ffffff'));
      return im;
    };
    const dd = DECALS[key]; let dec = null;
    if (dd) { dec = new THREE.InstancedMesh(decalGeo(g, dd), mat.toon('#ffffff', { map: decalTexture(ctx, dd.key), alphaTest: 0.4, paint: 0, polygonOffset: -2, name: 'rail-decal-' + dd.key }), n); dec.name = 'rail-' + key + '-decal'; dec.frustumCulled = false; dec.count = 0; dec.instanceMatrix.setUsage(THREE.DynamicDrawUsage); ctx.add(dec); ctx.noOutline(dec); }
    fam[key] = { slide: g.S.doorHW * 2 + 0.06, dec, g, body: mk(g.body, M.body, 'body', true), win: mk(g.windows, M.win, 'win', false), L: mk(g.leafL, M.leaf, 'leafL', false), R: mk(g.leafR, M.leaf, 'leafR', false), lamp: mk(g.lampsA, M.lamp, 'lamp', false), n: 0 };
    if (fam[key].lamp) ctx.noOutline(fam[key].lamp);
    tris += g.tris * n;
  }
  for (const T of trains) {
    const nb = T.cars.filter((c) => BOARD_FAM.has(c.fam)).length;
    if (!nb) continue;
    const c0 = T.cars.find((c) => BOARD_FAM.has(c.fam)), g = fam[c0.fam].g;
    const geo = boardGeo(g, g.doors[0] + 1.35);
    const m = new THREE.InstancedMesh(geo, mat.emissive('#ffffff', 1.0, { map: boardTexture(ctx, T.dest, TRAIN_NO[T.track] || '000А') }), nb);
    m.name = `rail-board-${T.id}`; m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); ctx.add(m); ctx.noOutline(m);
    T.board = m;
  }
  // frustum culling: the instances move every frame (the automatic bounding sphere would go stale), but a train never leaves the track field: one fixed sphere over every path
  {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const T of trains) { const xs = T.path.xs, zs = T.path.zs; for (let i = 0; i < xs.length; i++) { x0 = Math.min(x0, xs[i]); x1 = Math.max(x1, xs[i]); z0 = Math.min(z0, zs[i]); z1 = Math.max(z1, zs[i]); } }
    if (x1 > x0 && z1 > z0) {
      const sph = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, RAIL_TOP + 2, (z0 + z1) / 2), Math.hypot(x1 - x0, z1 - z0) / 2 + 60);
      const fix = (im) => { if (im) { im.boundingSphere = sph; im.frustumCulled = true; } };
      for (const k in fam) { const F = fam[k]; [F.body, F.win, F.L, F.R, F.lamp, F.dec].forEach(fix); }
      for (const T of trains) fix(T.board);
    }
  }
  ctx.onUpdate(() => { M.win.emissiveIntensity = 0.9 * night.value; });

  // ---- state of a train at time t (pure function)
  function stateAt(T, t) {
    const st = { s: T.sStop, v: 0, phase: 'ready', doors: 0, visible: true, heading: -1 };
    if (T.mode === 'idle') return st;
    const tm = mod(t, T.period), dwell = mod(T.depart - T.arrive, T.period), since = mod(tm - T.arrive, T.period);
    const range = T.VISEND - T.sStop + T.L + 20;
    if (since <= dwell) {
      st.phase = 'dwell'; st.heading = 1;
      const a = since, b = dwell - since;
      st.doors = Math.min(ease((a - 3) / 2.2), ease((b - 7) / 2.2));
      if (b < 12) st.phase = 'ready';
      return st;
    }
    const tau = since - dwell, dDep = accDist(tau);
    if (dDep < range) { st.phase = 'departing'; st.heading = 1; st.s = T.sStop + dDep; st.v = Math.min(VMAX, ACC * tau); return st; }
    const sig = mod(T.arrive - tm, T.period), dArr = brakeDist(sig);
    if (dArr < range) { st.phase = 'arriving'; st.heading = -1; st.s = T.sStop + dArr; st.v = Math.min(VC, BRAKE * sig); return st; }
    st.phase = 'away'; st.visible = false; return st;
  }

  // ---- per frame
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pv = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  const white = new THREE.Color('#ffffff'), red = new THREE.Color('#ff2a1c');
  const boxes = [];
  const pF = {}, pR = {};
  function frame(t) {
    for (const k in fam) fam[k].n = 0;
    for (const T of trains) if (T.board) T.nb = 0;
    boxes.length = 0;
    for (const T of trains) {
      const st = T.state = stateAt(T, t);
      T.pub.phase = st.phase; T.pub.s = st.s; T.pub.speed = st.v; T.pub.doorsOpen = st.doors; T.pub.visible = st.visible;
      if (!st.visible) continue;
      const hasW = T.sides.includes(-1), hasE = T.sides.includes(1);
      const head = T.path.at(st.s, pF); T.pub.x = head.x; T.pub.z = head.z;
      for (const c of T.cars) {
        const sc0 = st.s + c.off; if (sc0 > T.VISEND) continue;
        const F = fam[c.fam], b = c.fam.startsWith('ep') ? 5.2 : 7.6;
        T.path.at(sc0 - b, pF); T.path.at(sc0 + b, pR);
        const x = (pF.x + pR.x) / 2, z = (pF.z + pR.z) / 2;
        const ry = Math.atan2(pF.x - pR.x, pF.z - pR.z) + (c.flip ? Math.PI : 0);
        q.setFromAxisAngle(up, ry);
        m4.compose(pv.set(x, RAIL_TOP, z), q, sc);
        const k = F.n++;
        F.body.setMatrixAt(k, m4); if (F.win) F.win.setMatrixAt(k, m4); if (F.dec) F.dec.setMatrixAt(k, m4);
        if (T.board && BOARD_FAM.has(c.fam)) T.board.setMatrixAt(T.nb++, m4);
        if (F.lamp && (c.i === 0 || c.i === T.cars.length - 1)) {
          // lamp colour: the end that leads the current heading shows white, the other red
          const northEnd = c.i === 0, leads = (st.heading < 0) === northEnd;
          F.lamp.setMatrixAt(k, m4); F.lamp.setColorAt(k, leads ? white : red);
        } else if (F.lamp) { F.lamp.setMatrixAt(k, m4.clone().scale(new THREE.Vector3(0, 0, 0))); }
        if (F.L || F.R) {
          const leftIsWest = !c.flip;
          const open = (west) => (west ? hasW : hasE) ? st.doors : 0;
          const dl = open(leftIsWest) * F.slide, dr = open(!leftIsWest) * F.slide;
          const sx = Math.sin(ry), cz = Math.cos(ry);
          if (F.L) { m4.setPosition(x - sx * dl, RAIL_TOP, z - cz * dl); F.L.setMatrixAt(k, m4); }
          if (F.R) { m4.setPosition(x - sx * dr, RAIL_TOP, z - cz * dr); F.R.setMatrixAt(k, m4); }
        }
        boxes.push({ cx: x, cz: z, w: 3.3, d: c.len, rotY: ry, y0: RAIL_TOP + 0.05, y1: RAIL_TOP + CAR_H[c.fam] });
      }
    }
    for (const T of trains) if (T.board) { T.board.count = T.nb; T.board.instanceMatrix.needsUpdate = true; }
    for (const k in fam) {
      const F = fam[k];
      for (const m of [F.body, F.win, F.L, F.R, F.lamp, F.dec]) { if (!m) continue; m.count = F.n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    }
  }
  for (const T of trains) {
    T.pub = { id: T.id, kind: T.kind, track: T.track, length: T.L, cars: T.cars.length, dest: T.dest, mode: T.mode, sides: T.sides, stopS: T.sStop, phase: 'ready', s: T.sStop, speed: 0, doorsOpen: 0, visible: true, x: 0, z: 0 };
    T.pub.state = (t) => stateAt(T, t);
    T.pub.frontAt = (s) => T.path.at(s);
    // world positions of the passenger-side doors at time t: [{x, z, rotY (facing out toward the platform), open 0..1, car, side (-1 west / +1 east)}]
    T.pub.doorsAt = (t) => {
      const st = stateAt(T, t), out = [], a = {}, b = {};
      if (!st.visible) return out;
      for (const c of T.cars) {
        const sc0 = st.s + c.off; if (sc0 > T.VISEND) continue;
        const F = fam[c.fam]; if (!F.g.hasLeaves) continue;
        const bb = c.fam.startsWith('ep') ? 5.2 : 7.6;
        T.path.at(sc0 - bb, a); T.path.at(sc0 + bb, b);
        const cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2, ry = Math.atan2(a.x - b.x, a.z - b.z) + (c.flip ? Math.PI : 0), sx = Math.sin(ry), cos = Math.cos(ry);
        for (const side of T.sides) {
          // world west (-1) is the car's +X side when the car is not flipped
          const lx = (side < 0) === !c.flip ? 1 : -1, off = lx * 1.7;
          for (const d of F.g.doors) out.push({ x: cx + sx * d + cos * off, z: cz + cos * d - sx * off, rotY: Math.atan2(side, 0), open: st.doors, car: c.i, side });
        }
      }
      return out;
    };
  }
  ctx.onUpdate((dt, t) => frame(t));
  frame(ctx.time || 0);
  ctx.physics.addDynamic(() => boxes);
  return { trains: trains.map((T) => T.pub), tris, families: Object.keys(fam).length, frame };
}
