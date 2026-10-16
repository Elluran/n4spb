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
import { WATER as WATER_POLYS } from '../data/city.js';
import { PETRO_OFF, ISL_OFF } from './zones.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sm = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const LANE_KEYS = new Set(['fontanka', 'moika', 'griboedov', 'winter-canal', 'swan-canal', 'smolenka', 'gavan']);       // (+ Vasilievsky Island: the Smolenka and Galerny Harbour; the Kovsh is an open 330 m basin of the reclaimed land, ducks keep to the banks of the first two)
// the Petrograd side: the quiet waters only (the Zhdanovka, the moat of the Kronverk, the Kronverksky strait behind the fortress: its banks are part of the 'neva' chains, a lane must lie inside the box),
// and the two ponds of Alexander Park (still water 0.35 m below the lawn: environment/river.js POND_Y; a lane is a stretch of the pond outline pulled towards the middle)
const PETRO_KEYS = new Set(['zhdanovka', 'kronverk-moat', 'karpovka']), STRAIT = [-2385, -1575, -2300, -1985], PARK_PONDS = ['w138155241', 'w609619503'], POND_Y = -0.35;
const ISLAND_KEYS = new Set(['smolenka', 'gavan']);      // their banks are slopes and grass: a lane sample must also be on the water surface the environment draws (waterAt), not only inside the data polygon
// the ponds of the islands of round 2 (WATER ids of data/city.js): the Yelagin ponds (the 1st - 5th Northern and Southern: a lane each, two on the biggest), the ponds of Kamenny, the Lopukhinsky pond (Aptekarsky), the Petrovsky pond. A lane is a stretch of the pond
// outline pulled towards the middle (like the ponds of Alexander Park), validated sample by sample against the water surface the environment really draws (waterAt: a pond without water in the world gives no lane) and the pedal-boat piers.
// The SWANS (models.js swan: a pair with three grey cygnets / a pair) live on SWAN_PONDS only: the 4th Southern pond (the cape of the Hercules), the 3rd Northern pond, the Petrovsky pond, the 3rd Southern, the Lopukhinsky.
const ISL_PONDS = ['r9176723', 'r1567031', 'r1567613', 'r9176724', 'r18509887', 'r1567678', 'r18509892', 'r17596784', 'r17596789', 'r9176722', 'r943898', 'r943899', 'w10372677', 'w100139287', 'r20743485', 'w5052616', 'r8605286', 'r8605286#1', 'w141260105', 'w414026238'];      // (r8605286: the two ponds of the Botanical Garden, `#k` = the k-th polygon of the record); w141260105 / w414026238 the two small garden ponds at the east end of Aptekarsky (2026-10-15: aptekarsky request 26; lanes only where the environment draws the water; the Lopukhinsky pond r1312676 is NOT drawn as one pond: 7 of 22 lane samples fell outside its water, left out)
const SWAN_PONDS = new Set(['r9176723', 'r1567031', 'w5052616', 'r1567613', 'r20743485']);
const ISL_OBST = [[-5546, -5409, 46], [-4871, -4967, 26]];      // the boat rental of the 4th Northern pond (trunk 33 m + T-bar 68 m, ~25 pedal boats), the catamaran pier of the 2nd Southern pond
const STEP = 2.5;

export function buildDucks(ctx, W, say, opts = {}) {
  const T = THREE, rng = ctx.rng('wildlife-ducks'), rngI = ctx.rng('wildlife-ducks-isl'), L = ctx.L, WATER = L.RIVER_Y.water;
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
  const nearStrait = (pts) => { for (const p of pts) if (p[0] > STRAIT[0] - 30 && p[0] < STRAIT[1] + 30 && p[1] > STRAIT[2] - 30 && p[1] < STRAIT[3] + 30) return true; return false; };
  for (const bank of allBanks()) {
    const petro = !PETRO_OFF && (PETRO_KEYS.has(bank.key) || bank.key === 'neva');
    if ((!LANE_KEYS.has(bank.key) && !petro) || bank.far || bank.len < 60) continue;
    if (bank.key === 'neva' && !nearStrait(bank.pts)) continue;                     // of the Neva chains only the Kronverksky strait is used: the other chains (tens of km) are not even resampled
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
        if (bank.key === 'neva' && (x < STRAIT[0] || x > STRAIT[1] || z < STRAIT[2] || z > STRAIT[3])) { good = false; break; }
        if ((ISLAND_KEYS.has(bank.key) || petro && !LANE_KEYS.has(bank.key)) && env?.waterAt && !env.waterAt(x, z)) { good = false; break; }                              // (a deck / a bank the water surface does not reach)          // of the Neva chains only the Kronverksky strait
        xs.push(x); zs.push(z); tx.push(p.tx); tz.push(p.tz);
      }
      if (!good) continue;
      const mid = (xs.length >> 1);
      lanes.push({ id: lanes.length, key: bank.key, n: xs.length, span: (xs.length - 1) * STEP, xs, zs, tx, tz, cx: xs[mid], cz: zs[mid], taken: null, bank: bank.id });
    }
  }
  if (!PETRO_OFF) for (const id of PARK_PONDS) {                      // the ponds of Alexander Park: one lane each
    const w = WATER_POLYS.find((q) => q.id === id), o = w && w.polys[0] && w.polys[0].o; if (!o || o.length < 8) continue;
    let cx = 0, cz = 0; const n0 = o.length / 2; for (let i = 0; i < n0; i++) { cx += o[2 * i]; cz += o[2 * i + 1]; } cx /= n0; cz /= n0;
    if (!L.inPlay(cx, cz, 6)) continue;
    const ring = []; for (let i = 0; i <= n0; i++) { const j = i % n0, dx = o[2 * j] - cx, dz = o[2 * j + 1] - cz, d = Math.hypot(dx, dz) || 1, k = Math.max(0.25, (d - 3.2) / d) * 0.86; ring.push([cx + dx * k, cz + dz * k]); }
    const P = resample(ring), n = Math.min(P.length, 22); if (n < 8) continue;
    const i0 = Math.floor(rng() * Math.max(1, P.length - n)), xs = [], zs = [], tx = [], tz = [];
    for (let k = 0; k < n; k++) { const p = P[i0 + k]; xs.push(p.x); zs.push(p.z); tx.push(p.tx); tz.push(p.tz); }
    const mid = xs.length >> 1; lanes.push({ id: lanes.length, key: 'pond', y: POND_Y, n: xs.length, span: (xs.length - 1) * STEP, xs, zs, tx, tz, cx: xs[mid], cz: zs[mid], taken: null, bank: id });
  }
  if (!ISL_OFF) for (const id of ISL_PONDS) {                      // the ponds of the islands: one lane each (two on the biggest), only where the environment draws water
    const [pid, pk] = String(id).split('#'), w = WATER_POLYS.find((q) => q.id === pid), o = w && w.polys[Number(pk || 0)] && w.polys[Number(pk || 0)].o; if (!o || o.length < 8) continue;
    let cx = 0, cz = 0, ar = 0; const n0 = o.length / 2; for (let i = 0; i < n0; i++) { cx += o[2 * i]; cz += o[2 * i + 1]; const j = (i + 1) % n0; ar += o[2 * i] * o[2 * j + 1] - o[2 * j] * o[2 * i + 1]; } cx /= n0; cz /= n0; ar = Math.abs(ar) / 2;
    if (!L.inPlay(cx, cz, 6)) continue;
    const ring = []; for (let i = 0; i <= n0; i++) { const j = i % n0, dx = o[2 * j] - cx, dz = o[2 * j + 1] - cz, d = Math.hypot(dx, dz) || 1, k = Math.max(0.25, (d - 3.2) / d) * 0.86; ring.push([cx + dx * k, cz + dz * k]); }
    const P = resample(ring), nl = ar > 20000 ? 2 : 1, n = Math.min(P.length >> 1, 22); if (n < 8) continue;
    for (let q = 0; q < nl; q++) {
      for (let tries = 0; tries < 6; tries++) {
        const i0 = Math.floor(rngI() * Math.max(1, P.length - n)), xs = [], zs = [], tx = []; const tz = []; let good = true;
        for (let k = 0; k < n && good; k++) {
          const p = P[i0 + k]; if (!p) { good = false; break; }
          if (!L.inPlay(p.x, p.z, 4) || !(env?.waterAt && env.waterAt(p.x, p.z)) || !env.waterAt(p.x + p.tx * 2, p.z + p.tz * 2) || blocked(p.x, p.z) || ISL_OBST.some((b) => Math.hypot(b[0] - p.x, b[1] - p.z) < b[2])) { good = false; break; }
          xs.push(p.x); zs.push(p.z); tx.push(p.tx); tz.push(p.tz);
        }
        if (!good || lanes.some((l) => l.key === 'pond' && Math.hypot(l.cx - xs[xs.length >> 1], l.cz - zs[zs.length >> 1]) < 30)) continue;
        const mid = xs.length >> 1; lanes.push({ id: lanes.length, key: 'pond', y: POND_Y, n: xs.length, span: (xs.length - 1) * STEP, xs, zs, tx, tz, cx: xs[mid], cz: zs[mid], taken: null, bank: id, swan: SWAN_PONDS.has(id) }); break;
      }
    }
  }
  out.lanes = lanes;
  const near = (a, b) => Math.hypot(a.cx - b.cx, a.cz - b.cz) < (a.span + b.span) / 2 + 14;
  const free = (lane, g) => { if (lane.taken && lane.taken !== g) return false; for (const o of groups) if (o !== g && o.lane && near(o.lane, lane)) return false; return true; };
  const laneAt = (lane, u) => {                                            // position / tangent at u metres along the lane
    const f = clamp(u / STEP, 0, lane.n - 1.001), i = Math.floor(f), k = f - i;
    return { x: lane.xs[i] * (1 - k) + lane.xs[i + 1] * k, z: lane.zs[i] * (1 - k) + lane.zs[i + 1] * k, tx: lane.tx[i], tz: lane.tz[i] };
  };

  const rngMain = rng;
  const kinds = ['pair', 'family', 'pair', 'family', 'trio', 'family'];
  const nGroups = lanes.length ? Math.max(3, Math.round(kinds.length * Q)) : 0;
  const groups = [];
  // the swans first (they take their ponds): a pair with three grey cygnets on the first swan pond that has a lane, a pair on the second (one group at 'low')
  { const sl = lanes.filter((l) => l.swan); const sk = sl.length ? (Q < 0.6 ? ['swans'] : ['swans', 'swanpair']) : [];
    for (const kind of sk) { const g = { kind, swan: true, lane: null, w: 0, phi: 0, seed: rngI(), members: [], span: 0 }; const cand = sl.filter((l) => !l.taken && free(l, g)); if (!cand.length) continue; assign(g, cand[Math.floor(rngI() * cand.length)]); groups.push(g); } }
  const swanGroups = groups.slice();
  const dP = (l) => Math.hypot(l.cx - start.x, l.cz - start.z);
  for (let gi = 0; gi < nGroups; gi++) {
    const g = { kind: kinds[gi], lane: null, w: 0, phi: 0, seed: rng(), members: [], span: 0 };
    const cand = lanes.filter((l) => !l.taken && free(l, g) && !l.swan).sort((a, b) => dP(a) - dP(b));
    const pick = cand.length ? cand[Math.min(cand.length - 1, Math.floor(rng() * rng() * Math.min(cand.length, 12)))] : null;
    if (!pick) continue;
    assign(g, pick);
    groups.push(g);
  }
  function assign(g, lane) {
    if (g.lane) g.lane.taken = null;
    const rg = g.swan ? rngI : rng;
    g.lane = lane; lane.taken = g; g.span = lane.span; g.w = Math.PI * rg.range(0.28, 0.4) / lane.span; g.phi = rg() * TAU;
  }

  // ---- members ------------------------------------------------------------------------------
  const specs = [];                                    // { model, scale, off:[ox, oz], tint }
  const addGroup = (g) => {
    const m = [], rng = g.swan ? rngI : rngMain;                                   // (the swans draw from their own stream: the mallard groups of the older lanes stay as they were)
    if (g.kind === 'pair') m.push({ model: 'drake', scale: 1, off: [0.0, 0.0] }, { model: 'hen', scale: 1, off: [0.55, -0.7] });
    else if (g.kind === 'trio') m.push({ model: 'drake', scale: 1, off: [0.0, 0.2] }, { model: 'drake', scale: 1, off: [0.8, -0.6] }, { model: 'hen', scale: 1, off: [-0.7, -0.5] });
    else if (g.kind === 'swans') { m.push({ model: 'swan', scale: 1, off: [0, 0.3] }, { model: 'swan', scale: 1, off: [1.4, -0.9] }); for (let i = 0; i < 3; i++) m.push({ model: 'swan', scale: 0.4, duck: true, cyg: true, off: [(i % 2 ? 0.45 : -0.45) + rng.range(-0.1, 0.1), -1.5 - 0.6 * Math.floor(i / 2) + rng.range(-0.1, 0.1)] }); }
    else if (g.kind === 'swanpair') m.push({ model: 'swan', scale: 1, off: [0, 0.2] }, { model: 'swan', scale: 1, off: [1.5, -0.8] });
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
  const tint = new T.Color(); const duckling = new T.Color('#e8d18a'), cygnet = new T.Color('#b9b1a2');
  for (const q of specs) {
    q.slot = M[q.model].n++;
    if (q.duck) { const dc = q.cyg ? cygnet : duckling; for (const k of ['body', 'head']) M[q.model][k].setColorAt(q.slot, dc); M[q.model].wing.setColorAt(q.slot * 2, dc); M[q.model].wing.setColorAt(q.slot * 2 + 1, dc); }
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
    const wl = g.lane.y ?? L.WATERWAYS[g.lane.key]?.water ?? WATER;
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
      const cand = lanes.filter((l) => { const d = Math.hypot(l.cx - P.x, l.cz - P.z); return d > (init ? 10 : 60) && d < (init ? 300 : 190) && free(l, g) && (init || !seen(l)) && (!g.swan || l.swan) && (g.swan || !l.swan); });
      if (!cand.length) continue;
      assign(g, cand[Math.floor(rng() * cand.length)]); moves++;
      if (!init) return;
    }
  }
  // an occasional quack, from the nearest group of the player
  function update(dt, t) {
    if (!opts.noDirector) direct(t);
    let swanOn = true;
    if (M.swan) { let nd = 1e9; for (const g of swanGroups) { groupPose(g, t); nd = Math.min(nd, Math.hypot(pose.x - P.x, pose.z - P.z)); } swanOn = nd < 320 || !(P.x || P.z); for (const k of [M.swan.body, M.swan.head, M.swan.wing]) k.visible = swanOn; }      // the swan meshes are drawn only while a swan group is within 320 m of the player: no draw call elsewhere
    for (const q of specs) { if (q.g.swan && !swanOn) continue; write(q, t); }
    for (const o of Object.values(M)) { o.body.instanceMatrix.needsUpdate = true; o.head.instanceMatrix.needsUpdate = true; o.wing.instanceMatrix.needsUpdate = true; }
    wakes.instanceMatrix.needsUpdate = true;
    if (t >= tcall.next) {
      tcall.next = t + 14 + rng.range(0, 26);
      let best = null, bd = 1e9; for (const q of specs) { if (q.duck || q.model === 'drake' || q.model === 'swan') continue; groupPose(q.g, t); const d = Math.hypot(pose.x - W.player.x, pose.z - W.player.z); if (d < bd) { bd = d; best = { x: pose.x, y: WATER + 0.2, z: pose.z }; } }
      if (best && bd < 90) say('duck', best, 0.7 + 0.3 * rng());
    }
  }
  if (specs.length) update(0, 0);
  out.update = update; out.ducks = specs; out.groups = groups; out.groupPose = (g, t) => ({ ...groupPose(g, t) }); out.triangles = specs.length * 330;
  Object.defineProperty(out, 'moves', { get: () => moves });
  return out;
}
