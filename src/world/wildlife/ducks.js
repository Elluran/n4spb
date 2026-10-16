// wildlife/ducks.js - mallards on the canals (July: drakes in eclipse plumage are not modelled, hens lead broods of ducklings). Six groups swim slow back-and-forth lanes along the
// quay walls of the Fontanka, the Moika, the Griboedov Canal, the Winter Canal and the Swan Canal: a LANE is a stretch of a bank line (environment/waterways.js bank chains: the water
// on the left of travel) offset 3.8-4.6 m into the water, 36-64 m long, validated sample by sample (every 2.5 m): in the water with 2.5 m of free water beyond it, inside the play area,
// never nearer than 3.6 m to a boat hull at any time of the boats' lap (boats.js: the hulls of every boat, spatial hash), 16.5 m of a landing stage, 12 m + half the deck width of a bridge
// or 7 m of a descent. The groups FOLLOW THE PLAYER like the birds: every 2 s a group whose lane is farther than 230 m moves to a free lane 60-190 m away (out of the view cone when it is
// closer than 170 m). Everything is a PURE FUNCTION of t inside a lane: s(t) = span (1 - cos(w t + phi)) / 2 along the lane, the heading follows the direction of travel and turns through the
// side while the group nearly stops at the end of its lane; members hold a small formation (pair / hen with 4-6 ducklings / trio) with their own bobbing and slow dabbling (head down, tail
// up). Instanced (drake / hen bodies, heads, folded wings), a pale wake ellipse under each (decal, no outline). ~23 ducks, ~8 k triangles.
import * as THREE from 'three';
import { birdModel, shadowGeometry } from './models.js';
import { instanced } from './geom.js';
import { collectBoats, hullBoxes, makeHullIndex } from './boats.js';
import { allBanks } from '../environment/waterways.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sm = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const LANE_KEYS = new Set(['fontanka', 'moika', 'griboedov', 'winter-canal', 'swan-canal']);
const STEP = 2.5;

export function buildDucks(ctx, W, say, opts = {}) {
  const T = THREE, rng = ctx.rng('wildlife-ducks'), L = ctx.L, WATER = L.RIVER_Y.water;
  const qn = ctx.quality?.name, Q = qn === 'low' ? 0.5 : qn === 'medium' ? 0.75 : 1;
  const group = new T.Group(); group.name = 'wildlife-ducks';
  const out = { group, ducks: [], groups: [], lanes: [], update() {}, triangles: 0 };
  const matSolid = ctx.mat.toon('#ffffff', { vertexColors: true, paint: 0, name: 'wl-duck' });
  const matWing = ctx.mat.toon('#ffffff', { vertexColors: true, paint: 0, name: 'wl-duck-wing', side: 'double' });
  const matWake = ctx.mat.decal('#e8f0f4', { transparent: true, opacity: 0.34, name: 'wl-wake' });
  const start = (() => { const p = W.player; return (p.x || p.z) && L.inPlay(p.x, p.z) ? { x: p.x, z: p.z } : { x: L.HERO.x, z: L.HERO.z }; })();

  // ---- obstacles: boats (every hull of every lap), landing stages, bridge decks, descents ----------------------------------------
  const boats = collectBoats(ctx, L);
  const hullGap = makeHullIndex(hullBoxes(boats, 480, 2.5));
  out.hullGap = hullGap;
  const S = ctx.services, env = S.environment;
  const piers = [...(env?.piers || []).map((p) => ({ x: p.x, z: p.z, r: p.len / 2 + 9 })), ...(S.landmarksC?.piers || []).map((p) => ({ x: p.x, z: p.z, r: 16.5 }))];
  const decks = [...(env?.quay?.bridges || []).map((z) => ({ x: z.c[0], z: z.c[1], r: (z.w || 12) / 2 + 12 }))];
  const bd = S.landmarksC?.bridge?.deck; if (bd) decks.push({ x: bd.x, z: bd.z, r: 50 });
  const stairs = (env?.quay?.allStairs || []).map((s) => ({ x: s.x, z: s.z, r: 7 }));
  // the obstacles go into a 40 m hash (an obstacle is entered into every cell its circle's box touches): every lane sample used to be tested against all piers, decks and stairs of the map (~150 ms)
  const OC = 40, ogrid = new Map(), okey = (i, j) => i * 40009 + j;
  for (const o of [...piers, ...decks, ...stairs]) {
    const i0 = Math.floor((o.x - o.r) / OC), i1 = Math.floor((o.x + o.r) / OC), j0 = Math.floor((o.z - o.r) / OC), j1 = Math.floor((o.z + o.r) / OC);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = okey(i, j); (ogrid.get(k) || ogrid.set(k, []).get(k)).push(o); }
  }
  const blocked = (x, z) => { const a = ogrid.get(okey(Math.floor(x / OC), Math.floor(z / OC))); if (a) for (const o of a) if (Math.hypot(o.x - x, o.z - z) < o.r) return true; return false; };

  // ---- lanes ------------------------------------------------------------------------------------------------------------------
  /** the points of a bank chain every STEP metres: { x, z, tx, tz, wx, wz } (wx, wz = the unit normal into the water) */
  function resample(pts) {
    const o = []; let nextAt = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 1e-6) continue;
      const tx = (b[0] - a[0]) / len, tz = (b[1] - a[1]) / len;
      while (nextAt < len) { o.push({ x: a[0] + tx * nextAt, z: a[1] + tz * nextAt, tx, tz, wx: -tz, wz: tx }); nextAt += STEP; }
      nextAt -= len;
    }
    return o;
  }
  const lanes = [];
  for (const bank of allBanks()) {
    if (!LANE_KEYS.has(bank.key) || bank.far || bank.len < 60) continue;
    const P = resample(bank.pts);
    const d0 = bank.key === 'fontanka' ? 4.6 : 3.9;
    for (let i0 = Math.floor(rng.range(6, 22)); i0 + 20 < P.length; i0 += Math.floor(rng.range(26, 38))) {
      const n = Math.min(P.length - i0, Math.floor(rng.range(15, 26))), xs = [], zs = [], tx = [], tz = [];
      let good = n >= 15;
      for (let k = 0; k < n && good; k++) {
        const p = P[i0 + k], d = d0 + 0.4 * Math.sin(k * 0.5);
        const x = p.x + p.wx * d, z = p.z + p.wz * d;
        if (!L.inPlay(x, z, 6) || !L.inRiver(x, z) || !L.inRiver(p.x + p.wx * (d + 2.5), p.z + p.wz * (d + 2.5)) || !L.inRiver(x + p.tx * 2, z + p.tz * 2)) { good = false; break; }
        if (hullGap(x, z) < 3.6 || blocked(x, z)) { good = false; break; }
        xs.push(x); zs.push(z); tx.push(p.tx); tz.push(p.tz);
      }
      if (!good) continue;
      const mid = (xs.length >> 1);
      lanes.push({ id: lanes.length, key: bank.key, n: xs.length, span: (xs.length - 1) * STEP, xs, zs, tx, tz, cx: xs[mid], cz: zs[mid], taken: null, bank: bank.id });
    }
  }
  out.lanes = lanes;
  const near = (a, b) => Math.hypot(a.cx - b.cx, a.cz - b.cz) < (a.span + b.span) / 2 + 14;
  const free = (lane, g) => { if (lane.taken && lane.taken !== g) return false; for (const o of groups) if (o !== g && o.lane && near(o.lane, lane)) return false; return true; };
  const laneAt = (lane, u) => {                                            // position / tangent at u metres along the lane
    const f = clamp(u / STEP, 0, lane.n - 1.001), i = Math.floor(f), k = f - i;
    return { x: lane.xs[i] * (1 - k) + lane.xs[i + 1] * k, z: lane.zs[i] * (1 - k) + lane.zs[i + 1] * k, tx: lane.tx[i], tz: lane.tz[i] };
  };

  const kinds = ['pair', 'family', 'pair', 'family', 'trio', 'family'];
  const nGroups = lanes.length ? Math.max(3, Math.round(kinds.length * Q)) : 0;
  const groups = [];
  const dP = (l) => Math.hypot(l.cx - start.x, l.cz - start.z);
  for (let gi = 0; gi < nGroups; gi++) {
    const g = { kind: kinds[gi], lane: null, w: 0, phi: 0, seed: rng(), members: [], span: 0 };
    const cand = lanes.filter((l) => !l.taken && free(l, g)).sort((a, b) => dP(a) - dP(b));
    const pick = cand.length ? cand[Math.min(cand.length - 1, Math.floor(rng() * rng() * Math.min(cand.length, 12)))] : null;
    if (!pick) continue;
    assign(g, pick);
    groups.push(g);
  }
  function assign(g, lane) {
    if (g.lane) g.lane.taken = null;
    g.lane = lane; lane.taken = g; g.span = lane.span; g.w = Math.PI * rng.range(0.28, 0.4) / lane.span; g.phi = rng() * TAU;
  }

  // ---- members ------------------------------------------------------------------------------
  const specs = [];                                    // { model, scale, off:[ox, oz], tint }
  const addGroup = (g) => {
    const m = [];
    if (g.kind === 'pair') m.push({ model: 'drake', scale: 1, off: [0.0, 0.0] }, { model: 'hen', scale: 1, off: [0.55, -0.7] });
    else if (g.kind === 'trio') m.push({ model: 'drake', scale: 1, off: [0.0, 0.2] }, { model: 'drake', scale: 1, off: [0.8, -0.6] }, { model: 'hen', scale: 1, off: [-0.7, -0.5] });
    else { m.push({ model: 'hen', scale: 1, off: [0, 0.3] }); const n = Math.max(3, Math.round(rng.range(4, 7) * (0.6 + 0.4 * Q))); for (let i = 0; i < n; i++) m.push({ model: 'hen', scale: 0.3, duck: true, off: [(i % 2 ? 0.28 : -0.28) + rng.range(-0.1, 0.1), -0.7 - 0.38 * Math.floor(i / 2) + rng.range(-0.1, 0.1)] }); }
    for (const q of m) { q.g = g; q.seed = rng(); q.ph = rng() * TAU; g.members.push(q); specs.push(q); }
  };
  groups.forEach(addGroup);
  const count = {}; for (const q of specs) count[q.model] = (count[q.model] || 0) + 1;
  const M = {};
  for (const [name, cnt] of Object.entries(count)) {
    const m = birdModel(name);
    M[name] = { sp: m.sp, body: instanced(m.body, matSolid, cnt, 'wl-' + name + '-body'), head: instanced(m.head, matSolid, cnt, 'wl-' + name + '-head'), wing: instanced(m.wing, matWing, cnt * 2, 'wl-' + name + '-wing'), n: 0 };
    for (const x of [M[name].body, M[name].head, M[name].wing]) group.add(x);
  }
  const wakeGeo = shadowGeometry();
  const wakes = instanced(wakeGeo, matWake, Math.max(1, specs.length), 'wl-wakes'); ctx.noOutline(wakes); group.add(wakes);
  const tint = new T.Color(); const duckling = new T.Color('#e8d18a');
  for (const q of specs) {
    q.slot = M[q.model].n++;
    if (q.duck) { for (const k of ['body', 'head']) M[q.model][k].setColorAt(q.slot, duckling); M[q.model].wing.setColorAt(q.slot * 2, duckling); M[q.model].wing.setColorAt(q.slot * 2 + 1, duckling); }
    else { tint.setRGB(1, 1, 1); for (const k of ['body', 'head']) M[q.model][k].setColorAt(q.slot, tint); M[q.model].wing.setColorAt(q.slot * 2, tint); M[q.model].wing.setColorAt(q.slot * 2 + 1, tint); }
  }
  for (const o of Object.values(M)) { o.body.count = o.n; o.head.count = o.n; o.wing.count = o.n * 2; for (const x of [o.body, o.head, o.wing]) if (x.instanceColor) x.instanceColor.needsUpdate = true; }
  wakes.count = specs.length;

  // ---- the pure function of t ---------------------------------------------------------------
  const _M0 = new T.Matrix4(), _A = new T.Matrix4(), _B = new T.Matrix4(), _Q = new T.Quaternion(), _E = new T.Euler(), _V = new T.Vector3(), _S = new T.Vector3(), _wing = new T.Matrix4();
  const pose = { x: 0, z: 0, yaw: 0 };
  /** position and heading of the centre of group g at t (written into `pose`) */
  function groupPose(g, t) {
    const ph = g.w * t + g.phi, u = g.span * 0.5 * (1 - Math.cos(ph)), sg = Math.sin(ph), p = laneAt(g.lane, u);
    const side = 0.35 * Math.sin(0.11 * t + g.seed * 20);                       // a little drift across the lane (the lane keeps 2.5 m of free water beyond it)
    pose.x = p.x - p.tz * side; pose.z = p.z + p.tx * side;
    pose.yaw = Math.atan2(p.tx, p.tz) + Math.PI * (1 - sm((sg + 0.12) / 0.24));
    return pose;
  }
  const tcall = { next: 25 };
  function write(q, t) {
    const g = q.g, E = M[q.model].sp, o = M[q.model];
    const gp = groupPose(g, t), cy = Math.cos(gp.yaw), sy = Math.sin(gp.yaw);
    const tt = t + q.seed * 60, wob = 0.12 * Math.sin(tt * 0.35 + q.ph);
    const ox = q.off[0] + wob, oz = q.off[1] + 0.1 * Math.sin(tt * 0.27 + q.ph * 2);
    const x = gp.x + ox * cy + oz * sy, z = gp.z - ox * sy + oz * cy;
    const dab = (() => { const per = 17 + q.seed * 12, u = ((tt / per) % 1) * per; return u < 2.2 && !q.duck ? Math.sin(Math.PI * u / 2.2) : (q.duck ? Math.max(0, Math.sin(tt * 1.1)) * 0.5 * (Math.sin(tt * 0.13) > 0.6 ? 1 : 0) : 0); })();
    const bob = 0.012 * Math.sin(tt * 1.6 + q.ph), s = q.scale;
    const pitch = 0.04 * Math.sin(tt * 0.9 + q.ph) + 0.6 * dab, roll = 0.03 * Math.sin(tt * 1.15 + q.ph * 3);
    const wl = L.WATERWAYS[g.lane.key]?.water ?? WATER;
    const y = wl - 0.035 * s + bob - 0.02 * dab;
    _E.set(pitch, gp.yaw, roll, 'YXZ'); _Q.setFromEuler(_E);
    _M0.compose(_V.set(x, y, z), _Q, _S.set(s, s, s));
    o.body.setMatrixAt(q.slot, _M0);
    _B.copy(_M0).multiply(_A.makeTranslation(0, E.neck[1], E.neck[0]));
    _E.set(0.1 + 1.0 * dab, 0.5 * Math.sin(tt * 0.5 + q.ph) * (Math.sin(tt * 0.21) > 0 ? 1 : 0.2), 0, 'YXZ'); _B.multiply(_A.makeRotationFromEuler(_E));
    o.head.setMatrixAt(q.slot, _B);
    const sh = E.wing.shoulder;
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? 1 : -1;
      _wing.copy(_M0).multiply(_A.makeTranslation(side * sh[0], sh[1], sh[2]));
      _E.set(0, side * 1.42, side * -0.95, 'ZYX'); _wing.multiply(_A.makeRotationFromEuler(_E));
      _wing.multiply(_A.makeScale(side * 0.82, 1, 1));
      o.wing.setMatrixAt(q.slot * 2 + k, _wing);
    }
    // the wake: a pale ellipse a little longer than the body, drifting behind
    _E.set(0, gp.yaw, 0, 'YXZ'); _Q.setFromEuler(_E);
    const ws = (0.42 + 0.1 * Math.sin(tt * 0.8)) * s * (q.duck ? 1.4 : 1);
    _A.compose(_V.set(x - sy * 0.12 * s, wl + 0.02, z - cy * 0.12 * s), _Q, _S.set(ws * 0.9, 1, ws * 1.5));
    wakes.setMatrixAt(q.slot + q.wOff, _A);
  }
  // wake slots follow the global order of `specs`
  specs.forEach((q, i) => { q.wOff = i - q.slot; });

  // ---- the groups follow the player: every 2 s a group left more than 230 m behind moves to a free lane 60-190 m away
  const P = W.player, cam = ctx.camera, fwd = new T.Vector3();
  let nextDir = 0, inited = false, moves = 0, lastX = 0, lastZ = 0;
  function direct(t) {
    if (t < nextDir || !(P.x || P.z) || !lanes.length) return;
    nextDir = t + 2;
    const jump = inited && Math.hypot(P.x - lastX, P.z - lastZ) > 90; lastX = P.x; lastZ = P.z;      // a teleport: populate the new place at once
    const init = !inited || jump; inited = true;
    try { cam.getWorldDirection(fwd); } catch (e) { fwd.set(0, 0, -1); }
    const seen = (l) => { const dx = l.cx - P.x, dz = l.cz - P.z, d = Math.hypot(dx, dz); return d < 80 && (dx * fwd.x + dz * fwd.z) / (d || 1) > 0.25; };
    for (const g of groups) {
      const d0 = Math.hypot(g.lane.cx - P.x, g.lane.cz - P.z);
      if (d0 < (init ? 150 : 230)) continue;
      const cand = lanes.filter((l) => { const d = Math.hypot(l.cx - P.x, l.cz - P.z); return d > (init ? 10 : 60) && d < (init ? 300 : 190) && free(l, g) && (init || !seen(l)); });
      if (!cand.length) continue;
      assign(g, cand[Math.floor(rng() * cand.length)]); moves++;
      if (!init) return;
    }
  }
  // an occasional quack, from the nearest group of the player
  function update(dt, t) {
    if (!opts.noDirector) direct(t);
    for (const q of specs) write(q, t);
    for (const o of Object.values(M)) { o.body.instanceMatrix.needsUpdate = true; o.head.instanceMatrix.needsUpdate = true; o.wing.instanceMatrix.needsUpdate = true; }
    wakes.instanceMatrix.needsUpdate = true;
    if (t >= tcall.next) {
      tcall.next = t + 14 + rng.range(0, 26);
      let best = null, bd = 1e9; for (const q of specs) { if (q.duck || q.model === 'drake') continue; groupPose(q.g, t); const d = Math.hypot(pose.x - W.player.x, pose.z - W.player.z); if (d < bd) { bd = d; best = { x: pose.x, y: WATER + 0.2, z: pose.z }; } }
      if (best && bd < 90) say('duck', best, 0.7 + 0.3 * rng());
    }
  }
  if (specs.length) update(0, 0);
  out.update = update; out.ducks = specs; out.groups = groups; out.groupPose = (g, t) => ({ ...groupPose(g, t) }); out.triangles = specs.length * 330;
  Object.defineProperty(out, 'moves', { get: () => moves });
  return out;
}
