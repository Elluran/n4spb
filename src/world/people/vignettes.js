// people/vignettes.js - the scripted places and scenes (simulation half; docs/research/people.md S9 "behaviour vignettes", S4 spots, O6 service personnel):
//   Moscow Station: seated passengers with suitcases on the hall benches, people under the departure boards, the Peter I bust photographers, smokers and staff at the doors, the taxi queues
//     on the forecourt (the head of the queue gets into a taxi every ~25 s and the line shuffles up), a police pair patrolling the front, and the PASSENGER pool: ~90 travellers who
//     arrive by train (they step out of the open doors of the real trains - services.rail trains[].doorsAt(t) / state(t) windows -, walk the platform, the ramp, the apron, the turnstiles
//     and the hall, then take the metro / a taxi / walk off) and who come back from the town, cross the hall and board a train at an open door (they vanish into it until its next stop).
//   Vosstaniya rotunda: friends waiting at the heavy doors, a selfie group of four girls; the metro flows themselves are the goal type 'metro' (nav.metroDoors).
//   Anichkov Bridge: couples photographing each other at the Klodt plinths, a tour group (guide with a plain umbrella + 14 in matching caps) gathering at a plinth, a guitar busker with an audience of 7,
//     a living statue with photographers, a wedding party, an excursion tout with customers; Pushkinskaya / Mayakovskaya: a portrait painter at an easel with a sitter and three onlookers,
//     a second busker; tourists reading a phone map at a kerb; street cleaners with brooms (scenes.js).
// Nobody carries a flag; no sounds; the police pair shows no weapons.
import { makeSpec } from './chars.js';
import { GESTURE as G } from './contract.js';
import { addWest } from './west.js';
import { addMars } from './mars.js';
import { addSW } from './sw.js';
import { addPetro } from './petro.js';
import { addVO } from './vo.js';
import { addIsl } from './isl2.js';
import { addMetroLife } from './metrolife.js';

export function addVignettes(ctx, nav, sim, S) {
  const { R, rr, n, count } = S, N = nav.N, st = nav.station, rail = ctx.services.rail, FR = nav.frame, P = S.P;
  const SFAC = nav.stationCfg ? nav.stationCfg.factor : 1, ns = (base) => Math.max(0, Math.round(n(base) * SFAC));      // station-zone population (people.js DENSITY.station.factor)
  const mk = (opts, scene, prefs) => sim.spawn(makeSpec(R, opts), { prefs: prefs || P.P_STROLL, scene });
  const fixed = (a) => { a.noMass = true; return a; };
  const dist = (x0, z0, x1, z1) => Math.hypot(x0 - x1, z0 - z1);
  const nodeAt = (x, z, r, kinds = 'sapkh') => nav.nearestNode(x, z, r, (id) => kinds.includes(N.k[id]));
  const floorOK = (x, z) => { if (x > -600) return true; const h = ctx.physics.groundHeight(x, z, 1.0, false); return !Number.isFinite(h) || (h > -0.3 && h < 0.5) || (nav.deckWalk && nav.deckWalk(x, z)); };   // west: no stairs down, quay trenches, steps
  const free = (x, z, clr = 0.45) => nav.walkable(x, z) && nav.obstDist(x, z, clr + 0.2) > clr && nav.cover(x, z) < -0.6 && floorOK(x, z) && !(nav.area && nav.area.veto(x, z));      // (area.veto: the Summer Garden lawns)
  const standNear = (a, x, z, yaw, gest, dur, y) => { sim.standAt(a, x, z, yaw, gest, dur, null, 0, y ?? 0.12); fixed(a); };

  // the start pose and the five view poses of layout.js stay free (nobody scripted within 14 m: the player arrives there)
  const KEEP = [ctx.L.HERO, ...(ctx.L.VIEWS || [])].filter(Boolean);
  const keepFree = (x, z) => KEEP.some((v) => dist(x, z, v.x, v.z) < 14);
  /** the most open street node near (x, z): plenty of room around (no obstacles, off the asphalt) */
  const openSpot = (x, z, r, kinds = 'sap') => {
    let best = -1, bs = -1;
    for (let i = 0; i < N.x.length; i++) {
      if (!kinds.includes(N.k[i]) || !nav.mainOK(i)) continue; const dx = N.x[i] - x, dz = N.z[i] - z; if (dx * dx + dz * dz > r * r || keepFree(N.x[i], N.z[i])) continue;
      const sc = nav.obstDist(N.x[i], N.z[i], 7) + 0.8 * Math.min(6, -nav.cover(N.x[i], N.z[i])); if (sc > bs) { bs = sc; best = i; }
    }
    return best;
  };
  /** positions on an arc of radius r0..r1 in front of (x, z) looking toward `yaw` (rotY), within +-span rad, that are free; picks the yaw with most room */
  const arcPlan = (x, z, k, r0 = 2.3, r1 = 4.2, span = 1.1) => {
    let bestYaw = 0, bestN = -1, bestPos = [];
    for (let q = 0; q < 24; q++) {
      const yaw = (q / 24) * Math.PI * 2, pos = [];
      for (let ring = 0; ring < 3 && pos.length < k; ring++) {
        const r = r0 + (r1 - r0) * ring / 2, m = Math.max(3, Math.round(span * 2 * r / 0.95));
        for (let j = 0; j < m && pos.length < k + 8; j++) { const ang = yaw + (-span + (2 * span * (j + 0.5)) / m), px = x + Math.sin(ang) * r, pz = z + Math.cos(ang) * r; if (free(px, pz, 0.4) && !pos.some((p) => dist(p[0], p[1], px, pz) < 0.75)) pos.push([px, pz]); }
      }
      if (pos.length > bestN) { bestN = pos.length; bestYaw = yaw; bestPos = pos; }
    }
    return { yaw: bestYaw, pos: bestPos.slice(0, k) };
  };
  const lookAt = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

  // =================================================================== the Moscow Station
  if (st) {
    const W = FR.W;
    // ---- seated passengers on the hall benches (40 % of the seats), standing luggage owners, people under the departure boards
    {
      const seats = []; for (const b of nav.benches) if (b.where === 'hall') b.seats.forEach((s, si) => seats.push([b, si]));
      for (let i = seats.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [seats[i], seats[j]] = [seats[j], seats[i]]; }
      const want = Math.min(seats.length, ns(40));
      for (let i = 0, k = 0; k < want && i < seats.length; i++) {
        const [b, si] = seats[i]; if (b.seats[si].taken >= 0) continue;
        const a = mk({ role: 'traveler', suitcase: R() < 0.8 }, 'hall-sit', P.P_STROLL); fixed(a); sim.sitAt(a, b, si, 0); a.until = rr(60, 420); count('hallsit'); k++;
      }
      for (const bd of st.boards || []) for (let k = 0; k < ns(3.2); k++) {
        const u = bd.u - 2 + k * 2 + rr(-0.5, 0.5), [x, z] = W(u, bd.d - 5.5 - rr(0, 2)); if (!free(x, z, 0.4)) continue;
        const a = mk({ role: 'traveler' }, 'boards', P.P_STROLL); standNear(a, x, z, FR.yawOf(0, 1), [G.WATCH, G.LOOKAROUND, G.PHONE, G.NONE], rr(30, 200), 0.03); count('boards');
      }
      for (const p of nav.spots.filter((q) => q.type === 'bust').slice(0, ns(6))) {
        const a = mk({ role: 'tourist' }, 'bust', P.P_TOURIST); p.taken = a.i; sim.standAt(a, p.x, p.z, p.yaw, [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.LOOKAROUND], rr(10, 60), { type: 'spot', p }, 0, 0.03); fixed(a); count('bust');
      }
      for (let k = 0; k < ns(14); k++) { const a = mk({ role: 'traveler' }, 'hallwalk', P.P_STROLL); const hid = st.hall.nodes[Math.floor(R() * st.hall.nodes.length)]; sim.placeAtNode(a, hid, 0.8); count('hallwalk'); }
    }
    // ---- the doors of the facade: smokers, waiting relatives, staff
    for (const uc of [-6.145, 0, 6.145]) {
      for (let k = 0; k < ns(2.6); k++) { const [x, z] = W(uc + (k ? 2.2 : -2.2) + rr(-0.4, 0.4), -4.8 - rr(0, 1.2)); if (!free(x, z, 0.4)) continue; const sp = makeSpec(R, { role: 'tout' }); sp.smokes = true; const a = sim.spawn(sp, { prefs: P.P_BUSY, scene: 'door-smoker' }); standNear(a, x, z, FR.yawOf(0, -1) + rr(-0.8, 0.8), [G.SMOKE, G.SMOKE, G.PHONE, G.WATCH], rr(20, 120)); count('smoker'); }
      const [x, z] = W(uc + 3.4, -3.4); if (uc === 0 && free(x, z, 0.4)) { const a = mk({ role: 'staff' }, 'staff', P.P_STROLL); standNear(a, x, z, FR.yawOf(0, -1), [G.LOOKAROUND, G.NONE, G.TALK], rr(60, 300)); count('staff'); }
      for (let k = 0; k < ns(3); k++) { const [x2, z2] = W(uc + rr(-3, 3), -8 - rr(0, 5)); if (!free(x2, z2, 0.4)) continue; const a = mk({ role: 'walk' }, 'meeting', P.P_STROLL); standNear(a, x2, z2, FR.yawOf(0, 1), [G.WATCH, G.PHONE, G.LOOKAROUND, G.WAVE], rr(20, 90)); count('meeting'); }
    }
    // ---- taxi queues on the forecourt: the head gets into a taxi every ~25 s (vanishes at the kerb), the others shuffle up, a new passenger arrives from the station doors at the tail
    {
      const mkQueue = (ux, dd, dir) => {
        const pts = []; for (let k = 0; k < 7; k++) { const [x, z] = W(ux + dir * k * 0.95, dd); pts.push([x, z]); }
        const ok = pts.filter((p) => free(p[0], p[1], 0.3)); if (ok.length < 5) return null;
        return { pts: ok, ag: [], face: FR.yawOf(0, -1) };
      };
      const queues = [mkQueue(-58, -34, 1), mkQueue(60, -34, -1)].filter(Boolean);
      for (const Q of queues) {
        const doorOut = st.doors[1] ? st.doors[1].outside : -1, kerb = Q.pts[0], kx = kerb[0] + Math.sin(Q.face) * 2.6, kz = kerb[1] + Math.cos(Q.face) * 2.6, kerbOK = free(kx, kz, 0.3);
        const idle = (a2, t2) => { a2.yaw = Q.face; sim.standFor(a2, t2, 1e5, [G.PHONE, G.LOOKAROUND, G.NONE], null); };
        const refill = (a, t) => {                          // a new passenger comes out of the station doors and walks to the tail of the line
          const slot = Q.ag.length, p = Q.pts[Math.min(slot, Q.pts.length - 1)]; Q.ag.push(a); a.script = null;
          const fin = (a2, t2) => sim.approach(a2, p[0], p[1], idle), gn = nodeAt(p[0], p[1], 6);
          if (gn >= 0 && sim.goTo(a, gn, fin)) return; fin(a, t);
        };
        const advance = (t) => {
          const head = Q.ag.shift(); if (!head) return;
          const gone = (a, t2) => { const e = doorOut >= 0 ? { x: N.x[doorOut], z: N.z[doorOut], yaw: FR.yawOf(0, 1), node: doorOut, door: { visibleOK: true, y: 0.12 } } : null; sim.vanish(a, t2, rr(70, 200), e); a.script = refill; };
          sim.approach(head, kerbOK ? kx : kerb[0], kerbOK ? kz : kerb[1], gone);
          Q.ag.forEach((a, i) => { const p = Q.pts[Math.min(i, Q.pts.length - 1)]; sim.approach(a, p[0], p[1], idle); });
        };
        for (let i = 0; i < Math.min(Q.pts.length - 1, Math.max(2, ns(5))); i++) { const a = mk({ role: 'traveler', suitcase: R() < 0.85 }, 'taxi', P.P_STROLL); fixed(a); const p = Q.pts[i]; sim.standAt(a, p[0], p[1], Q.face, [G.PHONE, G.LOOKAROUND, G.NONE], 1e6, null, 0, 0.12); Q.ag.push(a); count('taxi'); }
        let nextT = rr(8, 25); sim.hooks.push((t) => { if (t >= nextT) { nextT = t + rr(20, 34); advance(t); } });
      }
    }
    // ---- a police pair patrolling the front of the station (plain uniform, no weapons)
    {
      const lead = mk({ role: 'police' }, 'police', { wander: 8, door: 0, bench: 0, stop: 0, spot: 1, metro: 0 }); lead.vpref = 0.9; fixed(lead);
      const [x, z] = W(10, -9), nd = nodeAt(x, z, 16); if (nd >= 0) { sim.placeAtNode(lead, nd, 0.5); const b = mk({ role: 'police' }, 'police', lead.prefs); sim.follow(b, lead, 0.75, 0.2); b.vpref = 0.92; sim.placeAtNode(b, nd, 1.2); b.comp = lead.comp; count('police'); count('police'); }
    }
    // ---- the passenger pool: arrive by train, cross the station, leave by metro / taxi / on foot, come back and board a train at an open door
    platformLife();
  }

  function platformLife() {
    const trains = ((rail && rail.trains) || []).filter((T) => T.mode === 'cycle' && T.sides && T.sides.length && T.track != null && T.state);
    const plats = st.platforms; if (!trains.length || !plats.length) return;
    const SAMPLE = 3, HORIZON = 2400;
    for (const T of trains) {
      T.win = []; let open = -1;
      for (let t = 0; t <= HORIZON; t += SAMPLE) { const s2 = T.state(t), o = s2.phase === 'dwell' && s2.doors > 0.05; if (o && open < 0) open = t; if (!o && open >= 0) { T.win.push([open, t]); open = -1; } }
      T.period = T.win.length > 1 ? T.win[1][0] - T.win[0][0] : 900;                       // the schedule is exactly periodic (rail/trains.js)
      const mid = T.win.length ? (T.win[0][0] + T.win[0][1]) / 2 : 0;
      T.doors = T.win.length ? T.doorsAt(mid).filter((d) => d.open > 0.5) : [];
      const rp = rail.platforms.find((p) => p.tracks.includes(T.track)); T.plat = rp ? plats.find((p) => p.ref === rp.ref) : null;
      T.access = T.doors.map((d) => { const dx = Math.sin(d.rotY), dz = Math.cos(d.rotY), px = d.x + dx * 0.9, pz = d.z + dz * 0.9; return { door: d, px, pz, node: nav.nearestNode(px, pz, 6, (id) => N.k[id] === 'f') }; }).filter((q) => q.node >= 0);
    }
    const live = trains.filter((T) => T.win.length && T.access.length && T.plat);
    if (!live.length) return;
    /** the first window of T (periodic) that is still open for more than `need` s after t: [open, close] */
    const nextWin = (T, t, need = 0) => {
      const w0 = T.win[0], k0 = Math.floor((t - w0[1]) / T.period);
      for (let k = k0; k < k0 + 3; k++) { const o = w0[0] + k * T.period, c = w0[1] + k * T.period; if (c - Math.max(t, o) > need) return [o, c]; }
      return [t + T.period, t + T.period + 250];
    };
    const emergeAt = (T) => {
      let q = T.access[Math.floor(R() * T.access.length)], d = q.door, dx = Math.sin(d.rotY), dz = Math.cos(d.rotY);
      for (let k = 0; k < 6 && nav.cover(d.x + dx * 0.35, d.z + dz * 0.35) > -0.3; k++) { q = T.access[Math.floor(R() * T.access.length)]; d = q.door; dx = Math.sin(d.rotY); dz = Math.cos(d.rotY); }      // (not at a door that opens on the apron road)
      return { x: d.x + dx * 0.35, z: d.z + dz * 0.35, yaw: Math.atan2(dx, dz) + Math.PI / 2 * (R() < 0.5 ? 1 : -1), node: q.node, door: { visibleOK: true, y: T.plat.deckY(d.z) } };
    };
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const metroDoor = () => { const g = nav.doorGroups['metro-vosstaniya']; return g && g.length ? pick(g) : null; };
    const frontDoor = () => st.doors[Math.floor(R() * st.doors.length)];
    // ---- the script of a passenger: what to do next when the previous thing is done
    const board = (a, t) => {                                   // choose a train that is open now (>= 40 s left) or opens within 5 minutes, walk to a door, vanish into the car
      const cands = []; for (const T of live) { const w = nextWin(T, t, 40); if (w[0] - t < 320) cands.push([T, w]); }
      if (!cands.length) { a.ps = 'wait'; sim.standFor(a, t, rr(25, 60), [G.PHONE, G.LOOKAROUND, G.WATCH], (a2, t2) => board(a2, t2)); a.kind = 'stand'; return; }
      const [T, w] = pick(cands), q = pick(T.access), x = q.door.x, z = q.door.z;
      a.ps = 'toboard'; a.T = T;
      const onBoard = (a2, t2) => {
        sim.approach(a2, x, z, (a3, t3) => { const w2 = nextWin(T, t3, 0); sim.vanish(a3, t3, Math.max(5, w2[0] + 4 + rr(0, 25) - t3), emergeAt(T)); a3.ps = 'train'; });
      };
      if (!sim.goTo(a, q.node, onBoard)) { sim.standFor(a, t, 8, [G.PHONE], (a2, t2) => board(a2, t2)); }
    };
    const leave = (a, t) => {                                   // after stepping out of a train: to the metro, the taxi rank or a hotel (vanish), then back as a new traveller
      a.ps = 'exit'; a.T = null;
      const x = R();
      const back = (a2, t2, dur) => {                           // vanish 'away', come back through a door of the station
        const d = frontDoor(), nd = d.outside, p = N;
        sim.vanish(a2, t2, dur, { x: p.x[nd], z: p.z[nd], yaw: FR.yawOf(0, 1), node: nd, door: { visibleOK: true, y: 0.12 } }); a2.ps = 'away'; a2.script = (a3, t3) => board(a3, t3);
      };
      if (x < 0.5) { const m = metroDoor(); if (m && sim.goTo(a, m.node, (a2, t2) => { sim.approach(a2, m.x + Math.sin(m.rotY) * 0.1, m.z + Math.cos(m.rotY) * 0.1, (a3, t3) => back(a3, t3, rr(60, 240))); })) return; }
      if (x < 0.75 && st.taxi) { /* the queue is scripted separately: walk away on foot */ }
      const nd = nodeAt(...FR.W(rr(-40, 40), -rr(25, 70)), 30, 'as');
      if (nd >= 0 && sim.goTo(a, nd, (a2, t2) => { back(a2, t2, rr(40, 200)); })) return;
      back(a, t, rr(40, 120));
    };
    const script = (a, t) => { if (a.ps === 'train' || a.ps === 'exit' || !a.ps) leave(a, t); else board(a, t); };
    // ---- spawn the pool (initial mix: in the trains, waiting on the platforms, in the hall, on the apron, away)
    const POOL = ns(92), halls = st.benches.filter((b) => b.where === 'hall' && b.seats.some((s) => s.taken < 0));
    for (let i = 0; i < POOL; i++) {
      const T = live[i % live.length], a = mk({ role: 'traveler', suitcase: R() < 0.7 }, 'passenger', P.P_STROLL); fixed(a); a.script = script; a.vpref *= 1.05; count('passenger');
      const x = R(), plt = T.plat;
      if (x < 0.34) {                                             // inside the train until its next stop
        const w = nextWin(T, 0, 30); sim.vanish(a, 0, Math.max(1, w[0] + 4 + rr(0, 30)), emergeAt(T)); a.ps = 'train'; a.T = T;
      } else if (x < 0.62) {                                      // waiting on the platform next to a door of a train that opens soon / is open
        const q = pick(T.access), px = q.px + rr(-1.5, 1.5), pz = q.pz + rr(-5, 5), nd = nav.nearestNode(px, pz, 5, (id) => N.k[id] === 'f');
        if (nd < 0) { a.ps = 'wait'; sim.vanish(a, 0, rr(5, 60), emergeAt(T)); continue; }
        sim.standAt(a, N.x[nd] + rr(-0.4, 0.4), N.z[nd] + rr(-0.4, 0.4), Math.atan2(Math.sin(q.door.rotY), Math.cos(q.door.rotY)) + Math.PI, [G.PHONE, G.LOOKAROUND, G.WATCH, G.NONE], rr(5, 120), { type: 'custom', fn: (a2, t2) => board(a2, t2) }, 0, plt.deckY(N.z[nd])); a.comp = nav.comp[nd]; a.ps = 'toboard'; a.T = T;
      } else if (x < 0.74 && halls.length) {                      // seated in the hall until it is time to go
        const b = pick(halls), si = b.seats.findIndex((s) => s.taken < 0); if (si >= 0) { sim.sitAt(a, b, si, 0); a.until = rr(30, 240); a.ps = 'toboard'; } else { sim.vanish(a, 0, rr(20, 90), emergeAt(T)); a.ps = 'train'; a.T = T; }
      } else if (x < 0.90) {                                      // walking: the hall / the apron
        const pool = x < 0.82 ? st.hall.nodes : st.apron, nd = pool[Math.floor(R() * pool.length)]; sim.placeAtNode(a, nd, 0.8); a.ps = 'toboard'; a.comp = nav.comp[nd]; a.kind = 'walk';
      } else { const d = frontDoor(); sim.vanish(a, 0, rr(10, 150), { x: N.x[d.outside], z: N.z[d.outside], yaw: FR.yawOf(0, 1), node: d.outside, door: { visibleOK: true, y: 0.12 } }); a.ps = 'away'; }
    }
    st.live = live.map((T) => ({ id: T.id, windows: T.win.length, period: T.period, doors: T.access.length }));
  }

  // =================================================================== the metro rotunda
  {
    for (const g of Object.values(nav.doorGroups || {})) for (const e of g) {
      for (let k = 0; k < ns(4); k++) {
        const a0 = rr(-1.2, 1.2), r = rr(2.6, 5.5), px = e.x + Math.sin(e.rotY + a0) * r, pz = e.z + Math.cos(e.rotY + a0) * r; if (!free(px, pz, 0.4)) continue;
        const a = mk({ role: R() < 0.3 ? 'student' : 'walk' }, 'meeting', P.P_STROLL); standNear(a, px, pz, lookAt(px, pz, e.x, e.z) + rr(-0.5, 0.5), [G.PHONE, G.WATCH, G.LOOKAROUND, G.TALK, G.WAVE], rr(25, 140)); count('meeting');
      }
    }
    // a selfie group of four girls near the rotunda / the obelisk
    for (const [x, z] of [[516, 72], [570, 186]]) {
      const nd = openSpot(x, z, 30); if (nd < 0) continue; const cx = N.x[nd], cz = N.z[nd], pl = arcPlan(cx, cz, 1, 1.0, 1.0, 0.1).yaw;
      for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * Math.PI * 2 + 0.4, px = cx + Math.sin(ang) * 0.85, pz = cz + Math.cos(ang) * 0.85; if (!free(px, pz, 0.3)) continue;
        const a = mk({ role: 'student', fem: true }, 'selfie', P.P_STROLL); standNear(a, px, pz, lookAt(px, pz, cx, cz), k === 0 ? [G.SELFIE] : [G.POSE, G.WAVE, G.POSE], rr(30, 90)); a.standG = k === 0 ? [G.SELFIE] : [G.POSE, G.WAVE, G.POSE, G.NONE]; count('selfie');
      }
      void pl;
    }
  }

  // =================================================================== the Anichkov Bridge and the Fontanka end of Nevsky
  {
    const plinths = nav.spots.filter((p) => p.type === 'plinth');
    // couples photographing each other at the plinths
    for (let k = 0; k < n(5) && plinths.length; k++) {
      const p = plinths[Math.floor(R() * plinths.length)]; if (p.taken >= 0) continue;
      const a = mk({ role: 'tourist' }, 'photo-couple', P.P_TOURIST), b = mk({ role: 'tourist', fem: !a.spec.fem }, 'photo-couple', P.P_TOURIST); p.taken = a.i;
      standNear(a, p.x, p.z, p.yaw + Math.PI, [G.POSE, G.POSE, G.WAVE, G.NONE], rr(30, 80)); const px = p.x + Math.sin(p.yaw + Math.PI) * 3.4, pz = p.z + Math.cos(p.yaw + Math.PI) * 3.4;
      if (free(px, pz, 0.4)) standNear(b, px, pz, p.yaw, [G.PHOTO, G.PHOTO, G.PHONE], rr(30, 80)); else { sim.standAt(b, p.x + 1, p.z + 0.5, p.yaw, [G.PHOTO], 60); fixed(b); }
      count('photo-couple');
    }
    const klodt = (ctx.services.landmarks && ctx.services.landmarks.monuments || []).filter((m) => String(m.id).startsWith('klodt'));
    const east = klodt.length ? klodt.reduce((s, m) => (m.x > s.x ? m : s), klodt[0]) : { x: -413, z: -100 };
    // a tour group of 14 in matching caps gathers at a plinth: the guide with a yellow umbrella in the middle, followers photographing in turns
    {
      const target = plinths.find((p) => p.taken < 0 && p.id === east.id && dist(p.x, p.z, east.x, east.z) > 7) || plinths.find((p) => p.taken < 0);
      if (target) {
        const lead = mk({ role: 'guide', guideCol: '#f0cf45' }, 'tour-asian', P.P_TOUR); lead.vpref = 0.95; target.taken = lead.i;
        sim.standAt(lead, target.x, target.z, target.yaw + Math.PI, [G.GUIDE], rr(70, 120), null, 0, 0.12); lead.goal = null;
        const m = Math.round(n(14));
        for (let j = 0; j < m; j++) {
          const b = sim.spawn(makeSpec(R, { role: 'asian', cap: '#d94a3a' }), { prefs: P.P_TOUR, scene: 'tour-asian' }); sim.follow(b, lead, (j % 2 ? 1 : -1) * 0.62, 0.9 + 0.7 * Math.floor(j / 2)); b.delay = 10 + 7 * Math.floor(j / 2); b.arc = { ang: (j - (m - 1) / 2) * 0.3, rad: 2.3 + 0.45 * Math.floor(j / 4) };
          const ang = lead.yaw + Math.PI + b.arc.ang, px = lead.x + Math.sin(ang) * b.arc.rad, pz = lead.z + Math.cos(ang) * b.arc.rad; sim.place(b, free(px, pz, 0.3) ? px : lead.x, free(px, pz, 0.3) ? pz : lead.z, lead.yaw, 0.12); b.kind = 'stand'; b.comp = lead.comp; count('tour-asian');
        }
        fixed(lead);
      }
    }
    // a guitar busker with an audience of 7 (open space near the east end of the bridge)
    const busk = (cx, cz, scene) => {
      const nd = openSpot(cx, cz, 38); if (nd < 0) return; const x = N.x[nd], z = N.z[nd], plan = arcPlan(x, z, 8, 2.4, 4.8, 1.0);
      const a = mk({ role: 'busker' }, scene, P.P_STROLL); standNear(a, x, z, plan.yaw, [G.PLAY], 1e6); a.standG = [G.PLAY]; count('busker');
      plan.pos.slice(0, Math.max(4, n(7))).forEach((p, i) => { const b = mk({ role: i % 4 === 0 ? 'elder' : i % 3 === 0 ? 'student' : 'tourist' }, scene, P.P_STROLL); standNear(b, p[0], p[1], lookAt(p[0], p[1], x, z) + rr(-0.3, 0.3), i % 3 === 0 ? [G.PHONE, G.PHOTO, G.NONE] : [G.NONE, G.TALK, G.WATCH, G.NONE], rr(40, 240)); count('audience'); });
    };
    busk(east.x + 28, east.z + 22, 'busker'); busk(405, 128, 'busker');
    // a living statue with photographers; a wedding party; an excursion tout with two customers
    {
      const nd = openSpot(east.x + 12, east.z + 34, 30); if (nd >= 0) { const x = N.x[nd], z = N.z[nd], plan = arcPlan(x, z, 4, 2.0, 3.6, 0.9), a = mk({ role: 'statue' }, 'statue', P.P_STROLL); standNear(a, x, z, plan.yaw, [G.POSE], 1e6); a.standG = [G.POSE]; count('statue'); plan.pos.slice(0, 3).forEach((p) => { const b = mk({ role: 'tourist' }, 'statue-fans', P.P_TOURIST); standNear(b, p[0], p[1], lookAt(p[0], p[1], x, z), [G.PHOTO, G.PHONE, G.SELFIE], rr(20, 90)); count('statue-fans'); }); }
      const nd2 = openSpot(east.x + 40, east.z - 18, 36); if (nd2 >= 0) {
        const x = N.x[nd2], z = N.z[nd2], plan = arcPlan(x, z, 8, 3.0, 5.0, 0.9);
        const br = mk({ role: 'bride' }, 'wedding', P.P_STROLL), gr = mk({ role: 'groom' }, 'wedding', P.P_STROLL); standNear(br, x, z, plan.yaw, [G.POSE, G.WAVE, G.POSE], 1e6); standNear(gr, x + Math.cos(plan.yaw) * 0.8, z - Math.sin(plan.yaw) * 0.8, plan.yaw, [G.POSE, G.NONE, G.POSE], 1e6); br.standG = [G.POSE, G.WAVE, G.POSE]; gr.standG = [G.POSE, G.NONE]; count('wedding'); count('wedding');
        plan.pos.forEach((p, i) => { const b = mk({ role: i === 0 ? 'walk' : 'guest' }, 'wedding', P.P_STROLL); standNear(b, p[0], p[1], lookAt(p[0], p[1], x, z), i === 0 ? [G.PHOTO] : [G.TALK, G.PHONE, G.WAVE, G.NONE], rr(40, 200)); b.standG = i === 0 ? [G.PHOTO] : [G.TALK, G.PHONE, G.WAVE, G.NONE]; count('wedding'); });
      }
      const nd3 = openSpot(east.x + 34, east.z + 6, 30); if (nd3 >= 0) { const x = N.x[nd3], z = N.z[nd3], t0 = mk({ role: 'tout' }, 'tout', P.P_STROLL); standNear(t0, x, z, 0.5, [G.TALK, G.LOOKAROUND, G.WAVE], 1e6); t0.standG = [G.TALK, G.LOOKAROUND, G.WAVE]; count('tout'); for (let k = 0; k < 2; k++) { const px = x + Math.sin(k * 1.4 + 0.2) * 1.4, pz = z + Math.cos(k * 1.4 + 0.2) * 1.4; if (free(px, pz, 0.3)) { const c = mk({ role: 'tourist' }, 'tout', P.P_TOURIST); standNear(c, px, pz, lookAt(px, pz, x, z), [G.TALK, G.POINT, G.NONE], rr(30, 120)); count('tout'); } } }
    }
    // a portrait painter at an easel with a sitter and three onlookers (Pushkinskaya side of Nevsky)
    {
      const nd = openSpot(300, 106, 40); if (nd >= 0) {
        const x = N.x[nd], z = N.z[nd], plan = arcPlan(x, z, 5, 2.4, 3.8, 0.8), painter = mk({ role: 'painter' }, 'painter', P.P_STROLL); standNear(painter, x, z, plan.yaw, [G.PAINT], 1e6); painter.standG = [G.PAINT]; count('painter');
        plan.pos.slice(0, 1).forEach((p) => { const sit = mk({ role: 'tourist' }, 'painter-model', P.P_STROLL); standNear(sit, p[0], p[1], lookAt(p[0], p[1], x, z), [G.NONE, G.POSE], rr(120, 400)); sit.standG = [G.NONE, G.NONE, G.POSE]; count('painter-model'); });
        plan.pos.slice(1, 4).forEach((p) => { const b = mk({ role: 'walk' }, 'painter-fans', P.P_STROLL); standNear(b, p[0], p[1], lookAt(p[0], p[1], x, z), [G.WATCH, G.NONE, G.PHONE], rr(30, 120)); count('painter-fans'); });
      }
    }
    // tourists reading a map on the phone at a kerb (the kerb nodes of the zebras are the waiting places)
    {
      const cs = nav.crosswalks.filter((c) => c.edge >= 0 && !c.virtual && nav.zoneW(c.x, c.z) > 0.9).sort(() => R() - 0.5).slice(0, n(3));
      for (const c of cs) {
        const nodeId = R() < 0.5 ? c.na : c.nb, bx = N.x[nodeId], bz = N.z[nodeId], ux = (nodeId === c.na ? 1 : -1) * c.ux, uz = (nodeId === c.na ? 1 : -1) * c.uz;
        for (let k = 0; k < 3; k++) { const px = bx - ux * (1.4 + 0.5 * k) + -uz * (k - 1) * 0.8, pz = bz - uz * (1.4 + 0.5 * k) + ux * (k - 1) * 0.8; if (!free(px, pz, 0.3)) continue; const a = mk({ role: 'tourist' }, 'mapreaders', P.P_TOURIST); standNear(a, px, pz, Math.atan2(ux, uz) + rr(-0.4, 0.4), [G.PHONE, G.POINT, G.LOOKAROUND, G.PHONE], rr(25, 90)); count('mapreaders'); }
      }
    }
  }
  // =================================================================== the WEST (west.js) and the platforms of the west metro stations (metrolife.js)
  try { S.westInfo = addWest(ctx, nav, sim, S, { mk, fixed, free, lookAt, dist, openSpot, arcPlan, standNear, nodeAt }); } catch (e) { console.error('[people] west vignettes failed:', e); }
  if (!(nav.marsCfg && nav.marsCfg.off)) try { S.marsInfo = addMars(ctx, nav, sim, S, { mk, fixed, free, lookAt, dist, openSpot, arcPlan, standNear, nodeAt }); } catch (e) { console.error('[people] mars vignettes failed:', e); }
  if (S.marsInfo && S.marsInfo.kit && !globalThis.__swOff) try { S.swInfo = addSW(ctx, nav, sim, S, { mk, fixed, free, lookAt, dist, openSpot, arcPlan, standNear, nodeAt }, S.marsInfo.kit); } catch (e) { console.error('[people] south-west vignettes failed:', e); }
  if (S.petro && S.marsInfo && S.marsInfo.kit && nav.area && nav.area.petro) try { S.petroInfo = addPetro(ctx, nav, sim, S, { mk, fixed, free, lookAt, dist, openSpot, arcPlan, standNear, nodeAt }, S.marsInfo.kit); } catch (e) { console.error('[people] petro vignettes failed:', e); }
  if (S.vo && S.marsInfo && S.marsInfo.kit && nav.area && nav.area.petro && nav.area.petro.voZone0 >= 0) try { S.voInfo = addVO(ctx, nav, sim, S, { mk, fixed, free, lookAt, dist, openSpot, arcPlan, standNear, nodeAt }, S.marsInfo.kit); } catch (e) { console.error('[people] island vignettes failed:', e); }
  if (S.isl && S.marsInfo && S.marsInfo.kit && nav.area && nav.area.isl) try { S.islInfo = addIsl(ctx, nav, sim, S, { mk, fixed, free, lookAt, dist, openSpot, arcPlan, standNear, nodeAt }, S.marsInfo.kit); } catch (e) { console.error('[people] islands vignettes failed:', e); }
  try { S.metroInfo = addMetroLife(ctx, nav, sim, S); } catch (e) { console.error('[people] metro platforms failed:', e); }

}
