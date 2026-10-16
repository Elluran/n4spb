// people/isl2.js - the scripted life of the ISLANDS of round 2 (docs/research/people-isl2.md; the sight dossiers yelagin-park-2026.md section 6, yelagin-palace-2026.md, kamenny-2026.md, aptekarsky-2026.md, petrovsky-zhdanovka-2026.md and the
// requests files docs/research/islands2-requests-*.md "people" sections).  Same recipe as people/vo.js: the building blocks come from west.js makeHelpers, the resident walkers from mars.js (their goals stay in their stay zone: isl2area.js
// ISL_ZONES, global index nav.area.islBase + position), the anchors are read from the sight services (crowd discs, photoSpots, monuments, entrances, benches) with the dossier positions as the fallback; every place is its own try / catch
// and everybody stands on FREE walkable spots (never on asphalt, in a building, behind a fence, in the water; people on a raised surface - the spit plaza at 0.30, the theatre terraces, a pier - stand on the REAL surface height).
//   Yelagin: the sunset gathering on the west spit terrace (nobody west of the parapet, nobody on the flights), tourists at the palace west / east stair and on the Butter Meadow, the Kitchen portico forecourt, the Stable gate and the round court, the
//            Orangery door, a wedding on the East pavilion terrace, the Estradny theatre audience on the terraces, the boat-rental queue (-5537.5,-5384), the Hercules cape, Green Beach, the mini-zoo, the rope park, the Kirov bust, joggers / strollers / families
//   Kamenny: the avenue pavements, the church forecourt and the chapel, Starogo Teatra square, the Olympic alley (the palace garden and the service yard are closed: nobody, only a pair of guards at the gate)
//   Aptekarsky: strollers on the alleys, excursion groups at the Palm House portal, the museum door and the vestibule, benches of the north court, LETI students; Petrovsky: the park walkers, skaters at Betancourt Plaza, the Savina garden; the Krestovsky arena apron.
// Nobody carries a flag (guides: a plain coloured umbrella); no sounds; the closed territory (isl2area.js) gets no goal.
import { makeSpec } from './chars.js';
import { GESTURE as G } from './contract.js';
import { makeHelpers } from './west.js';
import { ISL_ZONES, ISL_SIGHTS, islandAt } from './isl2area.js';
import { world as spitWorld, local as spitLocal, faceB as spitFace, HL as SPIT_HL, TERRACE_E as SPIT_E, PARAPET_T as SPIT_PT } from '../landmarksYelaginSpits/frame.js';       // pure data: the local frame of the west spit (wall arc, plaza)

const TAU = Math.PI * 2;
const GP = [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.LOOKAROUND, G.POINT, G.NONE];
const GT = [G.TALK, G.NONE, G.PHONE, G.WATCH, G.LOOKAROUND, G.NONE];
const GW = [G.WATCH, G.NONE, G.LOOKAROUND, G.POINT, G.PHONE, G.PHOTO];
const GSUN = [G.WATCH, G.PHOTO, G.SELFIE, G.NONE, G.TALK, G.LOOKAROUND, G.POSE, G.WATCH];

export function addIsl(ctx, nav, sim, S, H, kit) {
  const { R, rr, count } = S, N = nav.N, P = S.P, sv = ctx.services, cfg = S.isl || { scale: 1 }, ph = ctx.physics;
  const W = makeHelpers(ctx, nav, sim, S, H, cfg.scale ?? 1);
  const { pick, standNear, freeNear, spots, guided, show, wedding } = W;
  const { mk, fixed, free, lookAt, dist } = H;
  const { resident, residentPair, WANDER, JOG, qk, skipQ } = kit;
  const KEEP = (cfg.keep ?? 0.66) * (qk < 1 ? qk : 1), rs = (k) => (k ? Math.max(1, Math.round(k * (cfg.keep ?? 0.66))) : 0);
  const crowd = (list, scene, o = {}) => W.crowd(list, scene, o.keep === undefined ? { ...o, keep: KEEP } : o);
  const couple = (...a) => { if (!skipQ()) W.couple(...a); };
  const base = nav.area.islBase, Z = {}; ISL_ZONES.forEach((z, i) => { Z[z.name] = base + i; });
  const out = { places: {}, failed: [], ms: {}, total: 0 }, n0 = sim.agents.length;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  /** the standing height of ground people: a raised walk surface (the spit plaza, a stair, a stage), the gravel of a footway zone, the pavement 0.12 beside a carriageway, else the lawn / the path (0.02: the generic scripted places stand at 0.12) */
  const groundOf = (x, z) => { const h = ph.groundHeight(x, z, 0.9, false); if (Number.isFinite(h) && h > 0.06) return h + 0.02; const a = nav.area.y(x, z); if (a !== null && a !== undefined) return a; return nav.cover(x, z) > -5 ? 0.12 : 0.02; };
  const place = (name, fn) => { const before = sim.agents.length, t0 = now(); try { fn(); } catch (e) { out.failed.push(name); console.error('[people] island vignette ' + name + ' failed:', e); } for (let i = before; i < sim.agents.length; i++) { const a = sim.agents[i]; if (a.kind === 'stand' && !a.low && !a.pier) a.y = a.py = groundOf(a.x, a.z); } out.places[name] = sim.agents.length - before; out.ms[name] = Math.round(now() - t0); };
  const TOURISTS = [['tourist', 6], ['asian', 1.5], ['walk', 3], ['student', 1.5], ['elder', 1], ['parent', 0.6]], LOCALS = [['walk', 5], ['student', 2], ['elder', 2], ['parent', 1], ['tourist', 1]], FAMILY = [['parent', 3], ['kid', 4], ['walk', 3], ['elder', 1]];
  const YOUNG = [['student', 4], ['date', 2], ['walk', 3], ['tourist', 2]];
  const svc = (k) => sv[k] || {};
  const streetLevel = (c) => !(c.y !== undefined && Math.abs(c.y) > 0.5);
  const ring = (cx, cz, k, r0, r1, scene, tx, tz, o = {}) => crowd(spots(cx, cz, k, r0, r1, { sp: o.sp ?? 1.5, clr: o.clr ?? 0.5, ok: o.ok }), scene, { tx, tz, gest: o.gest || GP, dur: o.dur || [40, 300], mix: o.mix || TOURISTS, role: o.role, jit: o.jit });
  const queue = (x, z, nx, nz, k, scene, o = {}) => {
    const rx = nz, rz = -nx, q = [];
    for (let i = 0; i < k * 2; i++) { const d = (o.d0 ?? 2) + Math.floor(i / 2) * 0.95, sd = i % 2 ? 0.55 : -0.55, px = x + nx * d + rx * sd + rr(-0.1, 0.1), pz = z + nz * d + rz * sd + rr(-0.1, 0.1); if (free(px, pz, 0.3)) q.push([px, pz]); }
    return crowd(q.slice(0, k), scene, { yaw: () => Math.atan2(-nx, -nz), gest: [G.PHONE, G.NONE, G.WATCH, G.TALK, G.LOOKAROUND, G.NONE], jit: 0.2, dur: [200, 900], mix: o.mix || TOURISTS, role: o.role });
  };
  const sitters = (cx, cz, r, k, scene, roles = ['elder', 'walk', 'student', 'tourist']) => {
    const seats = []; for (const b of nav.benches) if (dist(b.x, b.z, cx, cz) < r && b.where !== 'hall' && b.where !== 'platform') b.seats.forEach((s, si) => { if (s.taken < 0) seats.push([b, si]); });
    for (let i = seats.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [seats[i], seats[j]] = [seats[j], seats[i]]; }
    let ns = 0; for (const [b, si] of seats) { if (ns >= k) break; if (b.seats[si].taken >= 0 || skipQ()) continue; const role = pick(roles), a = mk({ role }, scene, role === 'elder' ? P.P_ELDER : P.P_STROLL); fixed(a); sim.sitAt(a, b, si, 0); a.until = rr(300, 1500); count(scene); ns++; }
    return ns;
  };
  /** people standing on a RAISED or lowered surface (the spit plaza at 0.30, the theatre terraces 0.15 - 0.9, a pier deck): the spot must be a real walk surface; they never walk.  `ok(x, z, h)` may veto a spot. */
  const standOn = (list, scene, o = {}) => {
    let k = 0;
    for (const [x, z] of list) {
      const h = ph.groundHeight(x, z, (o.ref ?? 0.4) + 0.8, false); if (!Number.isFinite(h) || h < (o.hmin ?? -0.35) || h > (o.hmax ?? 1.3)) continue;
      let solid = false; try { solid = ph.columnBlocked(x, z, 0.3, h + 0.5, h + 1.6); } catch (e) { solid = false; } if (solid) continue;
      if (!o.edgeOK) { let edge = false; for (const [dx, dz] of [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]]) { const h2 = ph.groundHeight(x + dx, z + dz, h + 0.6, false); if (!Number.isFinite(h2) || h2 < h - 0.45) { edge = true; break; } } if (edge) continue; }
      if (nav.rawInBuilding(x, z) || (nav.blocked && nav.blocked(x, z)) || (nav.area.closed && nav.area.closed(x, z)) || (o.ok && !o.ok(x, z, h)) || R() > (o.keep ?? KEEP)) continue;
      const role = o.role ? (typeof o.role === 'function' ? o.role() : o.role) : W.roleOf(o.mix || TOURISTS), a = mk({ role }, scene, P.P_TOURIST);
      const yaw = (o.tx !== undefined ? lookAt(x, z, o.tx, o.tz) : R() * TAU) + rr(-(o.jit ?? 0.4), o.jit ?? 0.4);
      sim.standAt(a, x, z, yaw, o.gest || GW, 1e6, null, 0, h + 0.02); a.y = a.py = h + 0.02; fixed(a); a.standG = o.gest || GW; a.pier = true; a.low = h > 0.45 || h < -0.1; a.comp = -1; count(scene); k++;
    }
    return k;
  };
  const residents = (zone, pre, o = {}) => {
    for (let i = 0; i < rs(o.pairs); i++) residentPair(zone, i % 2 ? 'tourist' : 'walk', 'walk', pre + '-pair', WANDER);
    for (let i = 0; i < rs(o.family); i++) residentPair(zone, 'walk', 'kid', pre + '-family', WANDER);
    for (let i = 0; i < rs(o.prams); i++) resident(zone, { role: 'parent' }, WANDER, pre + '-pram');
    for (let i = 0; i < rs(o.dogs); i++) resident(zone, { role: 'dogwalker' }, WANDER, pre + '-dog');
    for (let i = 0; i < rs(o.joggers); i++) resident(zone, { role: 'sport' }, JOG, pre + '-jogger', (sp) => { sp.speed = 2.3 + R() * 0.7; });
    for (let i = 0; i < rs(o.singles); i++) resident(zone, { role: pick(o.roles || ['walk', 'tourist', 'walk', 'student']) }, { ...WANDER, spot: 1.2 }, pre + '-single');
    for (let i = 0; i < rs(o.elders); i++) resident(zone, { role: 'elder' }, WANDER, pre + '-elder');
    for (let i = 0; i < rs(o.students); i++) resident(zone, { role: 'student' }, { ...WANDER, spot: 0.8 }, pre + '-student');
    for (let i = 0; i < rs(o.bikes); i++) resident(zone, { role: 'rider', vehicle: 'bike' }, JOG, pre + '-bike');
    for (let i = 0; i < rs(o.scooters); i++) resident(zone, { role: 'rider', vehicle: R() < 0.4 ? 'kick' : 'escooter' }, JOG, pre + '-scooter');
  };
  const nearestMon = (s, x, z, rmax = 70) => { let best = null, bd = rmax; for (const m of s.monuments || []) { if (!Number.isFinite(m.x)) continue; const d = dist(m.x, m.z, x, z); if (d < bd && d > 1) { bd = d; best = m; } } return best; };
  const photoOf = (s, re) => (s.photoSpots || []).find((p) => re.test(p.name || ''));
  /** k candidate points in an annulus (no walkability test: standOn checks the real surface) at least `sp` m apart */
  const scatter = (cx, cz, k, r0, r1, sp = 1.0, ok = null) => { const list = []; for (let tries = 0; tries < k * 24 && list.length < k; tries++) { const a = R() * TAU, r = Math.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * R()), x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r; if ((ok && !ok(x, z)) || list.some((p) => dist(p[0], p[1], x, z) < sp)) continue; list.push([x, z]); } return list; };
  /** every point of a 0.9 m grid round (cx, cz) whose physics ground lies in [hmin, hmax] (a terrace, a pier deck, a stage), shuffled, at least `sp` m apart: the places a crowd can stand on a raised surface */
  const surfaceSpots = (cx, cz, r, hmin, hmax, sp = 1.0, ok = null) => {
    const all = []; for (let z = cz - r; z <= cz + r; z += 0.9) for (let x = cx - r; x <= cx + r; x += 0.9) { if ((x - cx) ** 2 + (z - cz) ** 2 > r * r) continue; const h = ph.groundHeight(x, z, hmax + 0.8, false); if (Number.isFinite(h) && h >= hmin && h <= hmax && (!ok || ok(x, z, h))) all.push([x + rr(-0.2, 0.2), z + rr(-0.2, 0.2)]); }
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    const out2 = []; for (const p of all) if (!out2.some((q) => dist(q[0], q[1], p[0], p[1]) < sp)) out2.push(p); return out2;
  };
  const sunTarget = (x, z, az = 255) => [x + Math.sin(az * Math.PI / 180) * 120, z - Math.cos(az * Math.PI / 180) * 120];

  // ============================================================================== THE CROWD DISCS OF THE SIGHTS (one pass over the services)
  place('crowd-discs', () => {
    for (const sk of ISL_SIGHTS) {
      const s = svc(sk);
      for (const c of s.crowd || []) {
        if (!Number.isFinite(c.x) || !streetLevel(c)) continue;
        const mon = nearestMon(s, c.x, c.z) || c, scene = 'isl-' + (c.id || sk), k = Math.max(1, Math.round((c.n ?? 4) * 0.6));
        ring(c.x, c.z, k, 0, Math.max(3, c.r || 5), scene, mon.x, mon.z, { sp: 1.3, gest: GP });
      }
    }
  });

  // ============================================================================== YELAGIN
  place('ye-spit-sunset', () => {
    // the west spit terrace (landmarksYelaginSpits: plaza centre (-6411.7, -5309.2), 27 x 13 m, raised 0.30 m; the wall arc R 60 between the corners A (-6424.2, -5321.6) and B (-6416.6, -5292.2), the two flights below it): the gathering place at sunset,
    // the benches of the returns, the viewpoint looks azimuth 255. Nobody west of the parapet (the chord + 3 m: the arc bulges 1.9 m), nobody on the flights (standOn keeps to y > -0.35).
    const Sp = svc('landmarksYelaginSpits'), C = { x: spitWorld(0, -6.5)[0], z: spitWorld(0, -6.5)[1] };                                    // the middle of the plaza (27 m x 13 m)
    const onPlaza = (x, z, m = 0.9) => { const [a, b] = spitLocal(x, z); return Math.abs(a) < SPIT_HL - m && b > SPIT_E + 0.3 && b < spitFace(a) - SPIT_PT - m; };       // land side of the inner parapet face, 0.9 m clear of it
    const [tx, tz] = spitWorld(0, 150);                                                                                                             // the sun: out of the wall to the water (azimuth 255)
    const list = scatter(C.x, C.z, 44, 0, 18, 1.2, (x, z) => onPlaza(x, z, 1.2));
    // the raised plaza (0.30 m): everybody stands on the real surface, never at the wall or on the flights (standOn keeps to y > 0.1 and checks the edges)
    standOn(list.slice(0, 28), 'ye-sunset', { tx, tz, gest: GSUN, jit: 0.4, dur: [200, 1100], mix: YOUNG.concat([['tourist', 3], ['elder', 0.5]]), ok: (x, z) => onPlaza(x, z, 1.0), keep: KEEP * 1.1, hmin: 0.1 });
    // couples side by side facing the sun (one photographs the other)
    for (let i = 0; i < 3; i++) { const q = list[28 + i]; if (q && onPlaza(q[0], q[1], 1.6) && !skipQ()) couple(q[0], q[1], tx, tz, 'ye-sunset-couple', { roleA: 'date', roleB: 'date' }); }
    sitters(C.x, C.z, 40, 5, 'ye-spit-sitter', ['student', 'walk', 'date', 'tourist']);
    // a guitar busker on the plaza with a few fans
    const bq = list[33]; if (bq && onPlaza(bq[0], bq[1], 2.0) && !skipQ()) { const a = mk({ role: 'busker' }, 'ye-spit-busker', P.P_STROLL); standNear(a, bq[0], bq[1], lookAt(bq[0], bq[1], tx, tz), [G.PLAY], 1e6, 0.32); a.standG = [G.PLAY]; count('ye-spit-busker'); }
    residents(Z['ye-spit'], 'spit', { pairs: 3, singles: 3, students: 2, roles: ['student', 'date', 'walk', 'tourist'] });
  });
  place('ye-palace', () => {
    const Pl = svc('landmarksYelaginPalace'), pm = (Pl.monuments || []).find((m) => /дворец|palace/i.test((m.name || '') + (m.nameEn || ''))) || Pl.monuments && Pl.monuments[0] || { x: -4543.5, z: -5225 };
    ring(-4584, -5226, 7, 0, 9, 'ye-palace-west', pm.x, pm.z, { sp: 1.4 });                                                                 // tourists at the west stair foot
    ring(-4508, -5226, 5, 0, 9, 'ye-palace-east', pm.x, pm.z, { sp: 1.4 });
    guided(-4604, -5236, pm.x, pm.z, { n: 13, col: '#d33a2a', asian: false });                                                                // a tour group with a plain umbrella on the Butter Meadow
    guided(-4492, -5214, pm.x, pm.z, { n: 9, col: '#2f6fc0', asian: true });
    for (let i = 0; i < 2; i++) { const q = spots(-4590, -5226, 1, 10, 30, { clr: 0.6 })[0]; if (q) couple(q[0], q[1], pm.x, pm.z, 'ye-palace-couple'); }
    // the Butter Meadow: families and friends on the open lawn (picnics: they stand, eat, talk), kids
    crowd(spots(-4625, -5226, 14, 3, 38, { sp: 2.2, clr: 0.6 }), 'ye-meadow', { mix: FAMILY.concat([['student', 2], ['date', 1]]), gest: [G.EAT, G.TALK, G.NONE, G.WATCH, G.PHONE, G.LOOKAROUND], jit: 1.8, dur: [200, 900] });
    crowd(spots(-4625, -5226, 3, 5, 30, { sp: 3 }), 'ye-meadow-kids', { role: 'kid', gest: [G.POINT, G.WAVE, G.NONE, G.SPLASH], jit: 2, dur: [60, 300] });
    residents(Z['ye-meadow'], 'meadow', { pairs: 3, family: 2, prams: 1, dogs: 1, singles: 2, elders: 1 });
    residents(Z['ye-palace'], 'palace', { pairs: 2, singles: 2, elders: 1 });
  });
  place('ye-court', () => {
    const Kt = svc('landmarksYelaginKitchen'), Sv = svc('landmarksYelaginServices');
    const k1 = (Kt.crowd || [])[0] || { x: -4625.5, z: -5258 }, st1 = nearestMon(Kt, k1.x, k1.z, 60) || { x: -4630, z: -5290 };
    ring(k1.x, k1.z, 5, 0, 8, 'ye-kitchen-portico', st1.x, st1.z, { sp: 1.4 });                                                               // the south portico forecourt: the 14 statues are seen from the lawn
    ring(-4650, -5272, 4, 8, 16, 'ye-kitchen-lawn', -4632, -5290, { sp: 1.8, gest: GP });
    const g = (Sv.crowd || []).find((c) => /stable-gate/.test(c.id || '')) || { x: -4818, z: -5265 };
    ring(g.x, g.z, 5, 0, 7, 'ye-stable-gate', g.x - 4, g.z - 5, { sp: 1.4 });
    ring(-4823, -5328, 4, 0, 8, 'ye-round-court', -4824, -5326, { sp: 1.6 });                                                                // the bronze Discobolus and the Discus-thrower in the round court
    const oq = (Sv.crowd || []).find((c) => /orangery/.test(c.id || '')) || { x: -4631, z: -5316 }, oe = (Sv.entrances || []).find((e) => /orange/i.test((e.id || '') + (e.name || '')));
    if (oe && Number.isFinite(oe.rotY)) queue(oe.x, oe.z, Math.sin(oe.rotY), Math.cos(oe.rotY), 4, 'ye-glass-museum-queue', { d0: 2.4, mix: FAMILY.concat([['tourist', 4]]) });
    else ring(oq.x, oq.z, 4, 0, 6, 'ye-glass-museum', oq.x, oq.z - 6, { sp: 1.4 });
    sitters(-4630, -5300, 60, 4, 'ye-court-sitter');
    residents(Z['ye-court'], 'court', { pairs: 2, singles: 2, family: 1, elders: 1 });
  });
  place('ye-rossi', () => {
    const Rs = svc('landmarksYelaginRossi'), ep = nearestMon(Rs, -4362, -5378, 60) || { x: -4362.5, z: -5376 }, mp = nearestMon(Rs, -4617, -4930, 60) || { x: -4620, z: -4920 };
    wedding(-4362, -5376, 'ye-east-pavilion', 8, 18);                                                                                          // a wedding photo session on the East pavilion terrace (photos rossi 11: tables at weddings)
    ring(-4350, -5380, 4, 0, 8, 'ye-east-photo', ep.x, ep.z, { sp: 1.5 });
    ring(-4616.75, -4923.8 + 6, 4, 0, 9, 'ye-music-photo', mp.x, mp.z, { sp: 1.6 });                                                           // in front of the Music Pavilion
    sitters(-4350, -5380, 30, 4, 'ye-east-sitter');
    residents(Z['ye-rossi'], 'rossi', { pairs: 2, singles: 2, family: 1, elders: 1 });
  });
  place('ye-theatre', () => {
    // the Estradny theatre (landmarksYelaginPark/theatre.js): 280 seats under the two glulam roofs (the audience terraces, y 0.15 - 0.9, the white benches: the east and the south arc of the arena), a round rubber arena, the stage deck (y 1.05) on the
    // north-west side; a summer concert: the audience stands on the real terraces facing the stage
    const T0 = (svc('landmarksYelaginPark').theatre && svc('landmarksYelaginPark').theatre.centre) || [-5232, -5342], stage = { x: -5247, z: -5352 };
    standOn(surfaceSpots(T0[0], T0[1], 30, 0.12, 1.0, 1.0), 'ye-theatre-audience', { tx: stage.x, tz: stage.z, gest: [G.WATCH, G.NONE, G.TALK, G.PHONE, G.WATCH, G.PHOTO], jit: 0.4, mix: LOCALS.concat([['date', 2], ['kid', 1]]), hmin: 0.1, hmax: 1.2, keep: 0.8, edgeOK: true });
    { const st0 = surfaceSpots(stage.x, stage.z, 9, 0.95, 1.25, 2.4); if (st0[0] && !skipQ()) { const a = mk({ role: 'busker' }, 'ye-theatre-musician', P.P_STROLL); sim.standAt(a, st0[0][0], st0[0][1], lookAt(st0[0][0], st0[0][1], T0[0], T0[1]), [G.PLAY], 1e6, null, 0, 1.07); a.y = a.py = 1.07; fixed(a); a.standG = [G.PLAY]; a.pier = true; a.low = true; a.comp = -1; count('ye-theatre-musician'); } }
    standOn(scatter(T0[0], T0[1], 12, 0, 9, 1.4), 'ye-theatre-arena', { tx: stage.x, tz: stage.z, gest: GT, jit: 1, mix: LOCALS, hmin: -0.1, hmax: 0.12, keep: 0.8 });
    const ph1 = photoOf(svc('landmarksYelaginPark'), /Эстрадн/); if (ph1) ring(ph1.x, ph1.z, 3, 0, 5, 'ye-theatre-photo', T0[0], T0[1], { sp: 1.5 });
    residents(Z['ye-theatre'], 'theatre', { pairs: 2, singles: 2, family: 1, students: 1 });
  });
  place('ye-boats', () => {
    // the boat rental of the 4th Northern pond: the trunk of the pier is 33 m long, the visitors queue at its root (-5537.5, -5384): 6 in the queue, couples on the T-bar; the catamaran pier on the 2nd Southern pond (-4871, -4967)
    const root = { x: -5537.5, z: -5384 };
    const q = []; for (let i = 0; i < 12; i++) q.push([root.x + rr(-0.3, 0.3), root.z - 2.2 - i * 0.95]);                                                // the trunk runs from the bank due north into the pond (a 2 m deck, y 0.15)
    standOn(q, 'ye-boat-queue', { tx: root.x, tz: root.z + 12, gest: [G.PHONE, G.NONE, G.WATCH, G.TALK, G.LOOKAROUND], jit: 0.2, mix: FAMILY.concat(YOUNG), hmin: -0.2, hmax: 0.9, keep: 0.5, edgeOK: true });
    standOn(surfaceSpots(root.x, root.z - 26, 32, 0.1, 0.5, 2.6, (x, z) => z < root.z - 8 && z > root.z - 40), 'ye-boat-pier', { gest: [G.WATCH, G.PHOTO, G.TALK, G.NONE], jit: 2.5, mix: YOUNG.concat(FAMILY), hmin: 0.1, hmax: 0.6, keep: 0.35, edgeOK: true });   // visitors on the T-bar between the moored boats
    ring(root.x + 4, root.z + 4, 3, 0, 9, 'ye-boat-photo', root.x - 6, root.z - 18, { sp: 1.8, mix: YOUNG });
    ring(-4871, -4967, 3, 0, 10, 'ye-catamaran', -4871, -4960, { sp: 1.8, mix: YOUNG });
    sitters(-5537, -5384, 55, 4, 'ye-boats-sitter');
    residents(Z['ye-boats'], 'boats', { pairs: 2, family: 1, singles: 1 });
  });
  place('ye-hercules', () => {
    // the Farnese Hercules on the grassy cape of the 4th Southern pond (the cape tip (-5549, -5132) looks over the pond): photographers 9 m ahead of him, a couple on the cape, strollers on the bank alley
    const Pk = svc('landmarksYelaginPark'), hm = (Pk.monuments || []).find((m) => /Геракл/.test(m.name || '')) || { x: -5544.9, z: -5113.7 }, hp = photoOf(Pk, /Геракл/) || { x: hm.x - 5, z: hm.z + 9 };
    ring(hp.x, hp.z, 5, 0, 8, 'ye-hercules-photo', hm.x, hm.z, { sp: 1.4 });
    const q = spots(-5547, -5124, 1, 4, 12, { clr: 0.6 })[0]; if (q) couple(q[0], q[1], -5549, -5150, 'ye-hercules-couple', { roleA: 'date', roleB: 'date' });
    sitters(-5545, -5114, 45, 4, 'ye-hercules-sitter');
    residents(Z['ye-hercules'], 'hercules', { pairs: 2, singles: 1, elders: 1, family: 1 });
  });
  place('ye-beach-zoo', () => {
    // Green Beach and the beach volleyball (-5921, -5211): sunbathers and a lively crowd; the mini-zoo and kids' zone (-5800..-5980, -5280..-5370): families at the pens; the rope park (-5966, -5366): teenagers
    crowd(spots(-5921, -5211, 8, 3, 30, { sp: 2.0, clr: 0.5 }), 'ye-green-beach', { role: 'beach', gest: [G.NONE, G.NONE, G.PHONE, G.LOOKAROUND, G.TALK], jit: 3, dur: [300, 1800] });
    crowd(spots(-5921, -5211, 8, 4, 26, { sp: 1.7, clr: 0.5 }), 'ye-volleyball', { mix: YOUNG, gest: [G.WAVE, G.POINT, G.TALK, G.NONE, G.LOOKAROUND], jit: 3, dur: [60, 300] });
    ring(-5890, -5325, 9, 0, 40, 'ye-mini-zoo', -5890, -5325, { mix: FAMILY, gest: [G.POINT, G.WATCH, G.NONE, G.WAVE, G.PHOTO, G.PHONE], sp: 2.2, jit: 2.4, dur: [100, 600] });
    ring(-5966, -5366, 5, 0, 24, 'ye-rope-park', -5966, -5366, { role: 'student', gest: GT.concat([G.WAVE, G.POINT]), sp: 2.2, jit: 2.4, dur: [100, 700] });
    sitters(-5921, -5240, 70, 4, 'ye-beach-sitter');
    residents(Z['ye-beach'], 'beach', { pairs: 3, family: 3, prams: 1, singles: 2, students: 3, scooters: 2 });
  });
  place('ye-kirov', () => {
    const Pk = svc('landmarksYelaginPark'), km = (Pk.monuments || []).find((m) => /Киров/.test(m.name || '')) || { x: -5213.7, z: -4908.7 }, kp = photoOf(Pk, /Киров/) || { x: km.x, z: km.z - 6.5 };
    ring(kp.x, kp.z, 4, 0, 6, 'ye-kirov-photo', km.x, km.z, { sp: 1.4 });
    ring(-5210, -4822, 6, 0, 26, 'ye-main-entrance', -5210, -4800, { mix: LOCALS.concat([['tourist', 3], ['kid', 1]]), gest: GT, jit: 1.6, sp: 2, dur: [60, 400] });
    sitters(-5214, -4909, 60, 5, 'ye-kirov-sitter');
    residents(Z['ye-kirov'], 'kirov', { pairs: 2, family: 1, singles: 2, elders: 1, bikes: 1 });
  });
  place('ye-island', () => {
    // the rest of the park: strollers, families, parkrun joggers on the shore alleys, rental bikes and e-scooters, dog walkers; squirrels are the wildlife owner's
    residents(Z['ye-island'], 'ye', { pairs: 6, family: 3, prams: 2, dogs: 3, joggers: 4, singles: 5, elders: 2, students: 2, bikes: 2, scooters: 2 });
  });

  // ============================================================================== KAMENNY (a closed island: the avenue and the park edge only)
  place('ka-avenue', () => {
    const Pa = svc('landmarksKamennyPalace');
    // the guardhouse corner and the gate of the palace garden: two guards at the checkpoint, a photographer or two on the avenue pavement opposite
    for (const c of Pa.crowd || []) if (Number.isFinite(c.x)) ring(c.x, c.z, 2, 0, Math.max(3, c.r || 6), 'ka-gate-photo', c.x + 3, c.z, { sp: 1.6 });
    const gt = (Pa.gates || []).find((g) => Number.isFinite(g.x) && /parade|main|gate/i.test(g.id || '')) || { x: -2870, z: -5338 };
    for (let i = 0; i < 2; i++) { const q = freeNear(gt.x + 3 + i * 1.6, gt.z + 2, 6, 0.4); if (q && !skipQ()) { const a = mk({ role: 'staff' }, 'ka-guard', P.P_STROLL); standNear(a, q[0], q[1], lookAt(q[0], q[1], gt.x, gt.z), [G.NONE, G.WATCH, G.LOOKAROUND], 1e6); a.standG = [G.NONE, G.WATCH, G.LOOKAROUND]; count('ka-guard'); } }
    residents(Z['ka-avenue'], 'ka-avenue', { pairs: 3, singles: 3, elders: 1, prams: 1, students: 1 });
  });
  place('ka-church', () => {
    const Ch = svc('landmarksKamennyChurch'), cp = photoOf(Ch, /церкв/i) || { x: -2861, z: -5413 }, cm = (Ch.monuments || [])[0] || { x: -2850, z: -5400 };
    ring(cp.x, cp.z, 4, 0, 8, 'ka-church-photo', cm.x, cm.z, { sp: 1.5 });
    const e = (Ch.entrances || [])[0]; if (e && Number.isFinite(e.rotY)) queue(e.x, e.z, Math.sin(e.rotY), Math.cos(e.rotY), 3, 'ka-church-worshippers', { role: 'elder', d0: 2.4 });
    const chp = photoOf(Ch, /Всецарица|часовн/i); if (chp) ring(chp.x, chp.z, 3, 0, 6, 'ka-chapel-photo', chp.x - 10, chp.z - 5, { sp: 1.6 });
    sitters(-2861, -5413, 50, 3, 'ka-church-sitter', ['elder', 'walk']);
    residents(Z['ka-church'], 'ka-church', { pairs: 1, elders: 2, singles: 1 });
  });
  place('ka-theatre-olympic', () => {
    // Starogo Teatra square (-4250, -4942): theatre-goers and kids on scooters; the Olympic alley (-2925, -5425) and the Oldenburg embankment path: joggers, pairs
    ring(-4250, -4942, 7, 0, 30, 'ka-theatre-square', -4250, -4942, { mix: LOCALS.concat([['date', 2]]), gest: GT, sp: 2.2, jit: 1.8, dur: [60, 400] });
    sitters(-4250, -4942, 60, 3, 'ka-theatre-sitter');
    residents(Z['ka-theatre'], 'ka-theatre', { pairs: 2, family: 1, singles: 2, scooters: 2 });
    residents(Z['ka-olympic'], 'ka-olympic', { pairs: 2, joggers: 2, singles: 1, dogs: 1 });
  });
  place('ka-island', () => {
    residents(Z['ka-island'], 'ka', { pairs: 3, dogs: 2, prams: 1, joggers: 2, singles: 3, elders: 2, bikes: 1 });
  });

  // ============================================================================== APTEKARSKY: THE BOTANICAL GARDEN
  place('ap-palm', () => {
    // excursion groups at the Palm House portal (-1503.6, -4162.8: the entrance faces east-north-east), visitors at the museum door (-1581.7, -4309.7) and the vestibule bow (-1459.5, -4280.3); nobody enters the glass houses
    const Gh = svc('botanicalGreenhouses'), pp = (Gh.crowd || []).find((c) => /palm/.test(c.id || '')) || { x: -1497, z: -4162 }, pm = (Gh.monuments || []).find((m) => /пальм|palm/i.test((m.name || '') + (m.nameEn || ''))) || { x: -1517, z: -4157 };
    guided(pp.x + 2, pp.z + 3, pm.x, pm.z, { n: 14, col: '#f0cf45', asian: false }); guided(pp.x + 8, pp.z - 6, pm.x, pm.z, { n: 10, col: '#2f6fc0', asian: true });
    ring(pp.x, pp.z, 4, 0, 6, 'ap-palm-portal', pm.x, pm.z, { sp: 1.4 });
    const md = Gh.museumDoor && Number.isFinite(Gh.museumDoor.x) ? Gh.museumDoor : { x: -1581.7, z: -4309.7, nx: 0.38, nz: 0.92 };
    queue(md.x, md.z, md.nx ?? 0.38, md.nz ?? 0.92, 5, 'ap-museum-queue', { d0: 2.4, mix: FAMILY.concat([['tourist', 4], ['student', 2]]) });
    const vb = (Gh.crowd || []).find((c) => /vestibule/.test(c.id || '')) || { x: -1454, z: -4280 }; ring(vb.x, vb.z, 3, 0, 5, 'ap-vestibule', vb.x - 8, vb.z, { sp: 1.5 });
    residents(Z['ap-palm'], 'ap-palm', { pairs: 2, singles: 2, family: 1, elders: 1 });
  });
  place('ap-garden', () => {
    // the arboretum alleys: strollers, families, students of the Botanical Institute and LETI, pensioners; the benches of the north court (nine round the Peter bust) and the Japanese garden
    const Bg = svc('landmarksBotanicalGarden'), pb = (Bg.monuments || []).find((m) => /Пётр|Петр|Peter/i.test((m.name || '') + (m.nameEn || ''))) || { x: -1572.2, z: -4282.6 };
    sitters(pb.x, pb.z, 26, 6, 'ap-court-sitter', ['elder', 'walk', 'tourist', 'student']);
    sitters(-1526, -4268, 25, 3, 'ap-terrace-sitter');
    ring(-1757, -4055, 4, 0, 10, 'ap-institute-porch', -1750, -4049, { sp: 1.6, mix: LOCALS.concat([['student', 3]]) });
    for (const p of (Bg.photoSpots || []).slice(0, 6)) if (Number.isFinite(p.x) && p.y === undefined) ring(p.x, p.z, 2, 0, 6, 'ap-garden-photo', p.x - Math.sin((p.yaw || 0) * Math.PI / 180) * 20, p.z - Math.cos((p.yaw || 0) * Math.PI / 180) * 20, { sp: 1.6 });
    residents(Z['ap-garden'], 'ap-garden', { pairs: 5, family: 2, prams: 1, singles: 4, elders: 4, students: 3, dogs: 0 });
    residents(Z['ap-institute'], 'ap-institute', { pairs: 1, singles: 2, students: 2, elders: 1 });
  });
  place('ap-leti', () => {
    // LETI (landmarksLETI, dossier aptekarsky-2026.md 16): the Corpus 5 stair (landing y 2.55: nobody on the flight, nobody on the porch landing of Corpus 1 or inside the corner fence: the nav keep-outs of the walk boxes do it) and the plaza in
    // front of it, the busts of Popov (-1587, -4404) and Vologdin (-1563, -4473), the war memorial platform (-1464, -4462, 0.3 m high), the clock corner of Corpus 1 on Professora Popova street (photo spot at (-1770.7, -4281.4))
    const Lt = svc('landmarksLETI'), pop = nearestMon(Lt, -1587, -4404, 30) || { x: -1587.3, z: -4403.7 }, vol = nearestMon(Lt, -1563, -4473, 30) || { x: -1563.3, z: -4473.4 }, mem = nearestMon(Lt, -1464, -4462, 30) || { x: -1463.9, z: -4461.9 };
    ring(-1560, -4395, 8, 0, 14, 'ap-leti-stairs', -1560, -4410, { role: 'student', gest: [G.PHONE, G.TALK, G.WATCH, G.NONE, G.LOOKAROUND, G.SMOKE], sp: 1.5, jit: 1.4, dur: [80, 500] });
    ring(pop.x, pop.z, 4, 3, 9, 'ap-leti-popov', pop.x, pop.z, { sp: 1.6, mix: LOCALS.concat([['student', 4]]) });
    ring(vol.x, vol.z, 3, 3, 8, 'ap-leti-vologdin', vol.x, vol.z, { sp: 1.6, mix: LOCALS.concat([['student', 3]]) });
    ring(mem.x, mem.z, 3, 4, 10, 'ap-leti-memorial', mem.x, mem.z, { sp: 1.8, mix: LOCALS, gest: [G.WATCH, G.NONE, G.LOOKAROUND, G.PHOTO] });
    const cp = photoOf(Lt, /угол с часами/) || { x: -1770.7, z: -4281.4 }; ring(cp.x, cp.z, 5, 0, 7, 'ap-leti-clock-corner', cp.x - 8, cp.z + 8, { sp: 1.5 });
    residents(Z['ap-leti'], 'ap-leti', { students: 3, singles: 2, pairs: 1 });
    residents(Z['ap-island'], 'ap', { pairs: 3, family: 1, prams: 1, dogs: 1, singles: 3, elders: 2, students: 2 });
  });

  // ============================================================================== PETROVSKY
  place('pe-park', () => {
    // park walkers on the sand paths (-4200, -2680), the pond (-4270, -2575); Betancourt Plaza (-4758, -2866): young people with kick / e-scooters, the 12 benches; the Savina garden
    ring(-4758, -2866, 6, 0, 22, 'pe-betancourt', -4758, -2866, { mix: YOUNG, gest: GT.concat([G.WAVE, G.PHONE]), sp: 2.0, jit: 2, dur: [60, 400] });
    sitters(-4765, -2820, 40, 5, 'pe-betancourt-sitter', ['student', 'walk', 'date']);
    residents(Z['pe-park'], 'pe-park', { pairs: 3, family: 2, prams: 1, dogs: 2, joggers: 2, singles: 3, elders: 2 });
    residents(Z['pe-betancourt'], 'pe-betancourt', { scooters: 3, students: 2, singles: 1 });
    residents(Z['pe-savina'], 'pe-savina', { elders: 3, pairs: 1 });
    residents(Z['pe-island'], 'pe', { pairs: 2, dogs: 1, singles: 2, elders: 1 });
  });
  // ============================================================================== KRESTOVSKY: THE ARENA APRON
  place('kr-stadium', () => {
    const Kr = svc('landmarksKrestovsky'), C = { x: -7310.1, z: -4518.9 };
    ring(C.x, C.z + 150, 6, 0, 22, 'kr-arena-photo', C.x, C.z, { sp: 1.6 });
    ring(C.x - 105, C.z + 140, 4, 0, 20, 'kr-arena-photo2', C.x, C.z, { sp: 1.8 });
    guided(C.x + 20, C.z + 170, C.x, C.z, { n: 11, col: '#e8892b', asian: false });
    for (const p of (Kr.photoSpots || []).slice(0, 4)) if (Number.isFinite(p.x) && p.y === undefined) ring(p.x, p.z, 3, 0, 6, 'kr-photo', p.x - Math.sin((p.yaw || 0) * Math.PI / 180) * 30, p.z - Math.cos((p.yaw || 0) * Math.PI / 180) * 30, { sp: 1.6 });
    residents(Z['kr-stadium'], 'kr', { pairs: 4, family: 3, prams: 1, singles: 3, joggers: 2, scooters: 3, bikes: 1 });
  });

  // ============================================================================== THE SECOND WAVE OF SIGHTS (2026-10-15: sphinx pier, Transfiguration church, TV tower, Petrovskaya kosa west, Zhdanovskaya embankment)
  place('ka-sphinx', () => {
    // the sphinx pier of the Oldenburg dacha (landmarksKamennyDachasEast: the flight drops 3.1 m to a landing 0.3 m over the water: everybody stays on the lawn above, the dacha plot behind its wall is closed territory)
    const De = svc('landmarksKamennyDachasEast'), pm = nearestMon(De, -2962, -5030, 40) || { x: -2962, z: -5032 };
    ring(-2962, -5043, 3, 0, 7, 'ka-sphinx-photo', pm.x, pm.z, { sp: 1.6 });
    const q = spots(-2972, -5040, 1, 3, 12, { clr: 0.6 })[0]; if (q) couple(q[0], q[1], pm.x, pm.z, 'ka-sphinx-couple', { roleA: 'date', roleB: 'date' });
    residents(Z['ka-sphinx'], 'ka-sphinx', { pairs: 1, singles: 1, elders: 1, joggers: 1 });
  });
  place('ap-transfig', () => {
    // the church of the Transfiguration (landmarksTransfiguration: a 1 m rubble terrace, closed doors): photographers on Instrumentalnaya ul. at the two photo spots, an old couple, nobody on the terrace
    const Tr = svc('landmarksTransfiguration'), cm = (Tr.monuments || [])[0] || { x: -1464, z: -4557 };
    for (const p of Tr.photoSpots || []) if (Number.isFinite(p.x)) ring(p.x, p.z, 2, 0, 5, 'ap-transfig-photo', cm.x, cm.z, { sp: 1.6, clr: 1.3 });                  // (clr: the two photo spots lie on the street edge: stay off the kerb)
    residents(Z['ap-transfig'], 'ap-transfig', { elders: 1, singles: 1, pairs: 1 });
  });
  place('ap-tower', () => {
    // the TV tower (landmarksTVTower: the fenced territory is closed, the six feet and the pedestal are solid): photographers at the four photo spots outside the fence, a jogger on the road past it
    const Tv = svc('landmarksTVTower'), O = (Tv.monuments || [])[0] || { x: -1696, z: -4915.7 };
    for (const p of Tv.photoSpots || []) if (Number.isFinite(p.x)) ring(p.x, p.z, 2, 0, 6, 'ap-tower-photo', O.x, O.z, { sp: 1.6, mix: TOURISTS.concat([['student', 2]]) });
    residents(Z['ap-tower'], 'ap-tower', { singles: 1, joggers: 1 });
  });
  place('pe-west', () => {
    // Petrovskaya kosa west (landmarksPetrovskyWest): the Almaz office front on Petrovsky pr. (photo m09: a security guard at the canopy is the only plausible vignette); the malthouse yard is a closed building site
    const Pw = svc('landmarksPetrovskyWest'), ph1 = (Pw.photoSpots || [])[0] || { x: -5343.5, z: -3256.5 }, al = { x: -5347.7, z: -3243.1 };
    const g = freeNear(ph1.x - 2, ph1.z + 1, 5, 0.4); if (g && !skipQ()) { const a = mk({ role: 'staff' }, 'pe-guard', P.P_STROLL); standNear(a, g[0], g[1], lookAt(g[0], g[1], al.x, al.z), [G.NONE, G.WATCH, G.LOOKAROUND], 1e6); a.standG = [G.NONE, G.WATCH, G.LOOKAROUND]; count('pe-guard'); }
    ring(ph1.x, ph1.z, 2, 0, 6, 'pe-west-photo', al.x, al.z, { sp: 1.6 });
    residents(Z['pe-west'], 'pe-west', { singles: 1, elders: 1 });
  });
  place('pe-zhdanovka', () => {
    // the Zhdanovskaya embankment (landmarksZhdanovka: the two squares with six white benches, the four historic houses are closed): a few sitters and strollers on the pavements (the old Petrograd-side reach routes the walkers there, no island zone)
    const Zh = svc('landmarksZhdanovka'), bs = (Zh.benches || []).filter((b) => Number.isFinite(b.x)); if (!bs.length) return;
    const cx = bs.reduce((s2, b) => s2 + b.x, 0) / bs.length, cz = bs.reduce((s2, b) => s2 + b.z, 0) / bs.length;
    sitters(cx, cz, 70, 4, 'pe-zhdanovka-sitter', ['elder', 'walk', 'parent', 'student']);
    ring(cx, cz, 4, 4, 24, 'pe-zhdanovka-walkers', cx + 12, cz + 12, { mix: LOCALS, gest: GT, sp: 2.4, jit: 1.8, dur: [60, 400] });
  });

  // ============================================================================== THE PARK CABINS (props/islands.js: the kind 'parkCabin' kiosks of the park cafes: a vendor behind the counter, a customer or two in front)
  place('isl-kiosks', () => {
    for (const kk of (sv.props && sv.props.kiosks) || []) {
      if (kk.kind !== 'parkCabin' || !Number.isFinite(kk.x) || !islandAt(kk.x, kk.z) || R() > 0.85 || skipQ()) continue;
      const fx = Math.sin(kk.rotY), fz = Math.cos(kk.rotY), rx = Math.cos(kk.rotY), rz = -Math.sin(kk.rotY); let spot = null;
      for (const [f2, r] of [[1.5, 0], [0.5, 1.7], [0.5, -1.7], [-1.5, 0], [1.9, 1.2]]) { const x = kk.x + fx * f2 + rx * r, z = kk.z + fz * f2 + rz * r; if (free(x, z, 0.35)) { spot = [x, z]; break; } }
      if (!spot) continue;
      const v = mk({ role: 'vendor' }, 'isl-vendor', P.P_STROLL); standNear(v, spot[0], spot[1], lookAt(spot[0], spot[1], kk.x, kk.z), [G.TALK, G.LOOKAROUND, G.NONE, G.WATCH], 1e6); v.standG = [G.TALK, G.LOOKAROUND, G.NONE, G.WATCH]; count('isl-vendor');
      crowd(spots(kk.x + fx * 2.6, kk.z + fz * 2.6, 2, 0.3, 1.8, { sp: 0.9 }), 'isl-customer', { tx: kk.x, tz: kk.z, gest: [G.NONE, G.TALK, G.EAT, G.POINT, G.PHONE], jit: 0.4, dur: [20, 160], keep: 0.9, mix: FAMILY.concat(YOUNG) });
    }
  });

  // ============================================================================== ANGLERS ON THE EMBANKMENTS
  place('anglers-isl', () => {
    const env = sv.environment || {}, segs = ((env.quay && env.quay.segments) || []).filter((s) => s.slope === undefined && Math.hypot(s.bx - s.ax, s.bz - s.az) > 5);
    const anchors = [[-3050, -5030, 140, 2], [-4400, -2380, 160, 2], [-2420, -5190, 120, 1], [-3560, -2380, 110, 2, true]];        // (the last: the Zhdanovskaya embankment steps, outside any island zone)
    for (const [ax, az, ar, k, anyZone] of anchors) {
      const near = segs.filter((s) => dist((s.ax + s.bx) / 2, (s.az + s.bz) / 2, ax, az) < ar); let got = 0; const pts = [];
      for (let t = 0; t < 60 && got < k && near.length; t++) {
        const s = near[Math.floor(R() * near.length)], f = 0.1 + 0.8 * R(), wx = s.ax + (s.bx - s.ax) * f, wz = s.az + (s.bz - s.az) * f, x = wx + s.nx * 1.05, z = wz + s.nz * 1.05;
        if (!free(x, z, 0.3) || (env.waterAt && !env.waterAt(wx - s.nx * 2.5, wz - s.nz * 2.5)) || pts.some((p) => dist(p[0], p[1], x, z) < 3.2) || (!anyZone && nav.area.zone(x, z) < base)) continue;
        if (skipQ()) { got++; continue; }
        const a = mk({ role: 'angler', age: R() < 0.4 ? 'elder' : undefined }, 'angler-isl', P.P_STROLL); standNear(a, x, z, Math.atan2(-s.nx, -s.nz) + rr(-0.15, 0.15), [G.NONE, G.NONE, G.WATCH, G.LOOKAROUND], 1e6); a.standG = [G.NONE, G.NONE, G.WATCH, G.LOOKAROUND]; count('angler-isl'); pts.push([x, z]); got++;
      }
    }
  });
  void makeSpec; void GW; void TAU;
  for (let i = n0; i < sim.agents.length; i++) sim.agents[i].isl = true;                 // the far-agent slowdown of sim.js steps the island groups as a unit
  out.total = sim.agents.length - n0;
  return out;
}
