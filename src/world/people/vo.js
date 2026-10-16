// people/vo.js - the scripted life of VASILIEVSKY ISLAND (docs/VO-BRIEF.md, docs/research/vo-roster-metro.md section 4, the dossiers academy.md, menshikov.md, mining.md, andrew.md, smolensky.md, kirova.md, sevkabel.md,
// seaterminal.md, pribaltiyskaya.md, gavan.md, makarova.md, sredny.md).  Same recipe as people/petro.js: the building blocks come from west.js makeHelpers, the resident walkers from mars.js (their goals stay in their
// stay zone: voarea.js VO_ZONES, global index PETRO_ZONE0 + 10 + position), the anchors are read from the sight services (crowd discs, photoSpots, monuments, entrances, benches, bridges, metro doors) with the dossier
// positions as the fallback; every place is its own try / catch and everybody stands on FREE walkable spots (never on asphalt, in a building, behind a fence, in the water, on a lawn).
//   Crowd discs:  every street-level disc a sight publishes (Academy front, Menshikov forecourt / gate queue / garden, Mining stair and terrace, Andrew cathedral / market / boulevard, Kirova, Sevkabel promenade, Sea Terminal,
//                 Pribaltiyskaya, Gavan, Sredny hubs ...) gets its head count n (thinned like the generic crowd); discs below street level (the sphinx pier landing, the Mining descents, the Rumyantsev apron) get people
//                 standing on the real surface (lowStand: they never walk, at night they vanish).  Photographers face the nearest monument of the service.
//   Flows:        tourists at the Academy sphinxes, the Menshikov Palace, the Mining University; students at the Academy / Mining / Sredny; Xenia PILGRIMS (women : men 5 : 1) at the chapel in the quiet cemetery (the
//                 crowd discs `xenia-*`); the Vasileostrovskaya forecourt and the 6-7 line boulevard (weight 5); Sredny tram stops, window shoppers and cafe groups; the metro doors of Sportivnaya-2 / Gorny; the Blagoveshchensky
//                 Bridge railings; the Sevkabel promenade in the summer evening; anglers on the embankments of the island.
// Nobody carries a flag (guides: a plain coloured umbrella); no sounds; closed territory (the Naval Corps, the shipyard, CHP-7, the Lenexpo site, the port) gets no goal.
import { makeSpec } from './chars.js';
import { GESTURE as G } from './contract.js';
import { makeHelpers } from './west.js';
import { PETRO_ZONE0 } from './area.js';
import { VO_ZONES } from './voarea.js';
import { VO_SIGHTS } from './petroarea.js';

const TAU = Math.PI * 2;
const GP = [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.LOOKAROUND, G.POINT, G.NONE];
const GT = [G.TALK, G.NONE, G.PHONE, G.WATCH, G.LOOKAROUND, G.NONE];
const GW = [G.WATCH, G.NONE, G.LOOKAROUND, G.POINT, G.PHONE, G.PHOTO];

export function addVO(ctx, nav, sim, S, H, kit) {
  const { R, rr, count } = S, N = nav.N, P = S.P, sv = ctx.services, cfg = S.vo || { scale: 1 }, ph = ctx.physics;
  const W = makeHelpers(ctx, nav, sim, S, H, cfg.scale ?? 1);
  const { pick, standNear, spots, guided } = W;
  const { mk, fixed, free, lookAt, dist } = H;
  const { resident, residentPair, homeScript, WANDER, JOG, qk, skipQ } = kit;
  const KEEP = (cfg.keep ?? 0.66) * (qk < 1 ? qk : 1), rs = (k) => (k ? Math.max(1, Math.round(k * (cfg.keep ?? 0.66))) : 0);
  const crowd = (list, scene, o = {}) => W.crowd(list, scene, o.keep === undefined ? { ...o, keep: KEEP } : o);
  const couple = (...a) => { if (!skipQ()) W.couple(...a); };
  const Z = {}; VO_ZONES.forEach((z, i) => { Z[z.name.slice(3)] = PETRO_ZONE0 + 10 + i; }); Z.vo = PETRO_ZONE0 + 9;
  const st = sv.streets || {}, env = sv.environment || {};
  const out = { places: {}, failed: [], ms: {}, total: 0 }, n0 = sim.agents.length;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const place = (name, fn) => { const before = sim.agents.length, t0 = now(); try { fn(); } catch (e) { out.failed.push(name); console.error('[people] vo vignette ' + name + ' failed:', e); } out.places[name] = sim.agents.length - before; out.ms[name] = Math.round(now() - t0); };
  const TOURISTS = [['tourist', 6], ['asian', 1.5], ['walk', 3], ['student', 1.5], ['elder', 1], ['parent', 0.6]], LOCALS = [['walk', 5], ['student', 2], ['elder', 2], ['parent', 1], ['tourist', 1]], FAMILY = [['parent', 3], ['kid', 4], ['walk', 3], ['elder', 1]];
  const STUDENTS = [['student', 8], ['walk', 1], ['tourist', 1]];
  const ring = (cx, cz, k, r0, r1, scene, tx, tz, o = {}) => crowd(spots(cx, cz, k, r0, r1, { sp: o.sp ?? 1.5, clr: o.clr ?? 0.5 }), scene, { tx, tz, gest: o.gest || GP, dur: o.dur || [40, 300], mix: o.mix || TOURISTS, role: o.role, jit: o.jit });
  const queue = (x, z, nx, nz, k, scene, o = {}) => {
    const rx = nz, rz = -nx, q = [];
    for (let i = 0; i < k * 2; i++) { const d = (o.d0 ?? 2) + Math.floor(i / 2) * 0.95, sd = i % 2 ? 0.55 : -0.55, px = x + nx * d + rx * sd + rr(-0.1, 0.1), pz = z + nz * d + rz * sd + rr(-0.1, 0.1); if (free(px, pz, 0.3)) q.push([px, pz]); }
    return crowd(q.slice(0, k), scene, { yaw: () => Math.atan2(-nx, -nz), gest: [G.PHONE, G.NONE, G.WATCH, G.TALK, G.LOOKAROUND, G.NONE], jit: 0.2, dur: [200, 900], mix: o.mix || TOURISTS, role: o.role });
  };
  const sitters = (cx, cz, r, k, scene, roles = ['elder', 'walk', 'student', 'tourist']) => {
    const seats = []; for (const b of nav.benches) if (dist(b.x, b.z, cx, cz) < r && b.where !== 'hall' && b.where !== 'platform') b.seats.forEach((s, si) => { if (s.taken < 0) seats.push([b, si]); });
    for (let i = seats.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [seats[i], seats[j]] = [seats[j], seats[i]]; }
    let ns = 0; for (const [b, si] of seats) { if (ns >= k) break; if (b.seats[si].taken >= 0 || skipQ()) continue; const role = pick(roles), a = mk({ role }, scene, role === 'elder' ? P.P_ELDER : P.P_STROLL); fixed(a); sim.sitAt(a, b, si, 0); a.until = rr(300, 1500); count(scene); ns++; }
  };
  /** people standing on a surface that is NOT street level (the sphinx pier landing, the Mining and Rumyantsev descents, a portico stair): the spot must be a real walk surface within tol of y; they never walk */
  const lowStand = (list, y, tol, scene, o = {}) => {
    let k = 0;
    for (const [x, z] of list) {
      const h = ph.groundHeight(x, z, y + 0.6, false); if (!Number.isFinite(h) || Math.abs(h - y) > tol) continue;
      let solid = false; try { solid = ph.columnBlocked(x, z, 0.3, h + 0.5, h + 1.6); } catch (e) { solid = false; } if (solid) continue;
      { let edge = false; for (const [dx, dz] of [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]]) { const h2 = ph.groundHeight(x + dx, z + dz, h + 0.6, false); if (!Number.isFinite(h2) || h2 < h - 0.5) { edge = true; break; } } if (edge && !o.edgeOK) continue; }
      if (R() > (o.keep ?? KEEP)) continue;
      const role = o.role ? (typeof o.role === 'function' ? o.role() : o.role) : W.roleOf(o.mix || TOURISTS), a = mk({ role }, scene, P.P_TOURIST);
      const yaw = (o.tx !== undefined ? lookAt(x, z, o.tx, o.tz) : R() * TAU) + rr(-(o.jit ?? 0.4), o.jit ?? 0.4);
      sim.standAt(a, x, z, yaw, o.gest || GW, 1e6, null, 0, h + 0.02); a.y = a.py = h + 0.02; fixed(a); a.standG = o.gest || GW; a.pier = true; a.low = true; a.comp = -1; count(scene); k++;
    }
    return k;
  };
  const railing = (id, side, k, u0, u1, scene, o = {}) => {
    const s = (nav.longs || []).find((q) => q.id === id); if (!s) return [];
    const list = [];
    for (let t = 0; t < k * 14 && list.length < k; t++) {
      const u = Math.max(4, u0) + R() * (Math.min(s.len - 4, u1) - Math.max(4, u0));
      for (let inset = 0.45; inset < Math.min(1.5, s.v1 - s.v0 - 0.3); inset += 0.12) {
        const v = side * (s.v1 - inset), x = s.ax + s.ux * u - s.uz * v, z = s.az + s.uz * u + s.ux * v; if (!free(x, z, 0.26)) continue;
        if (!list.some((p) => dist(p[0], p[1], x, z) < (o.sp ?? 1.6))) list.push([x, z]); break;
      }
    }
    const face = Math.atan2(-s.uz * side, s.ux * side);
    return crowd(list, scene, { yaw: () => face, gest: o.gest || GW, jit: 0.5, dur: [60, 500], mix: o.mix || TOURISTS });
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
  };
  const svc = (k) => sv[k] || {};
  const nearestMon = (s, x, z, rmax = 70) => { let best = null, bd = rmax; for (const m of s.monuments || []) { if (!Number.isFinite(m.x)) continue; const d = dist(m.x, m.z, x, z); if (d < bd && d > 1) { bd = d; best = m; } } return best; };
  const DISC_K = 0.6, DISC_SIGHT = { landmarksSevkabel: 0.55, landmarksAndrew: 0.75, landmarksAcademy: 0.8, landmarksMenshikov: 0.85, landmarksKirova: 0.8 };            // the head counts n of the crowd discs are design numbers: scaled like the other scripted places
  const streetLevel = (c) => !(c.y !== undefined && Math.abs(c.y) > 0.5);

  // ============================================================================== THE CROWD DISCS OF THE SIGHTS (one pass over the services; the kind of a disc says how people stand)
  place('crowd-discs', () => {
    for (const sk of VO_SIGHTS) {
      const s = svc(sk);
      for (const c of s.crowd || []) {
        if (!Number.isFinite(c.x) || /^xenia/.test(c.id || '')) continue;                                   // (the pilgrims have their own place below)
        const kind = String(c.kind || ''), mon = nearestMon(s, c.x, c.z) || c, scene = 'vo-' + (c.id || kind || sk);
        const quiet = /quiet|visitors/.test(kind) || /kirov-visitors/.test(c.id || '');
        const k = Math.max(1, Math.round((c.n ?? 4) * DISC_K * (DISC_SIGHT[sk] ?? 1) * (quiet ? 0.7 : 1)));
        if (!streetLevel(c)) {                                                                                 // a landing, a stair, an apron below / above the street: people stand on the real surface
          const rawList = []; for (let t = 0; t < 160 && rawList.length < k + 3; t++) { const a = R() * TAU, r = Math.sqrt(R()) * ((c.r || 6) + 1); const x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r; if (!rawList.some((p) => dist(p[0], p[1], x, z) < 1.4)) rawList.push([x, z]); }
          lowStand(rawList, c.y, 0.45, scene, { tx: mon.x, tz: mon.z, gest: [G.WATCH, G.PHOTO, G.SELFIE, G.POINT, G.TALK, G.NONE], jit: 0.9, mix: kind === 'stair' ? STUDENTS.concat(TOURISTS) : TOURISTS, keep: 1 });
          continue;
        }
        if (kind === 'queue') {                                                                                // a queue in front of a door / gate: out along the door normal
          const e = (s.entrances || []).filter((q) => Number.isFinite(q.x)).sort((p, q) => dist(p.x, p.z, c.x, c.z) - dist(q.x, q.z, c.x, c.z))[0];
          if (e && dist(e.x, e.z, c.x, c.z) < 14 && Number.isFinite(e.rotY)) { queue(e.x, e.z, Math.sin(e.rotY), Math.cos(e.rotY), k, scene, { d0: 2.2, mix: TOURISTS }); continue; }
        }
        const photo = /photo|view/.test(kind), seaside = /promenade|stroll|plaza|sea-square|rest|lawn|alley/.test(kind);
        ring(c.x, c.z, k, 0, Math.max(3, c.r || 5), scene, mon.x, mon.z, { mix: quiet ? LOCALS : photo ? TOURISTS : seaside ? LOCALS.concat([['tourist', 3], ['date', 1]]) : TOURISTS, gest: photo ? GP : seaside ? GT.concat([G.WATCH]) : GT, sp: photo ? 1.3 : 1.7, dur: quiet ? [200, 900] : undefined, jit: seaside ? 1.6 : 0.4 });
      }
    }
  });

  // ============================================================================== TOURISTS AND STUDENTS
  place('academy', () => {
    const A = svc('landmarksAcademy'), front = (A.photoSpots || [])[0] || { x: -3394.8, z: -535.3 }, mon = (A.monuments || []).find((m) => m.id === 'academy-of-arts') || { x: -3401.8, z: -547.4 };
    ring(front.x, front.z, 7, 0, 12, 'academy-front', mon.x, mon.z, { sp: 1.3, gest: GP });                                                                // photographers of the peach facade and the dome
    guided(front.x - 10, front.z + 8, mon.x, mon.z, { n: 14, col: '#2f6fc0', asian: true });
    const door = (A.entrances || [])[0]; if (door) ring(door.x + Math.sin(door.rotY || 0) * 5, door.z + Math.cos(door.rotY || 0) * 5, 6, 1, 9, 'repin-students', door.x, door.z, { role: 'student', gest: GT, dur: [100, 600], jit: 1.6 });          // students of the Repin Institute
    const q = spots(front.x, front.z, 1, 8, 22, { clr: 0.6 })[0]; if (q) couple(q[0], q[1], mon.x, mon.z, 'academy-couple');
    const g = (A.gates || []).find((q2) => q2.open); if (g) ring(g.x, g.z, 3, 2, 8, 'academy-garden-gate', g.x, g.z, { mix: LOCALS, gest: GT, dur: [100, 700] });
    sitters(-3560, -690, 110, 5, 'academy-sitter');
    residents(Z.academy, 'academy', { pairs: 2, singles: 3, students: 3, roles: ['student', 'tourist', 'walk'] });
  });
  place('menshikov', () => {
    const M = svc('landmarksMenshikov'), mon = (M.monuments || [])[0] || { x: -3098.3, z: -719.4 }, gate = (M.gates || []).find((q) => q.open);
    guided(mon.x + 6, mon.z + 22, mon.x, mon.z, { n: 14, col: '#d33a2a', asian: false });
    if (gate) queue(gate.x, gate.z, -0.5, 0.86, 4, 'menshikov-queue', { d0: 2.4 });                                                                         // the visitors' queue at the west gate
    sitters(-3250, -640, 130, 6, 'rumyantsev-sitter');
    residents(Z.menshikov, 'rumyantsev', { pairs: 3, family: 1, prams: 1, dogs: 1, joggers: 1, singles: 2, elders: 1 });
  });
  place('mining', () => {
    const Mi = svc('landmarksMining'), mon = (Mi.monuments || [])[0] || { x: -4554, z: 344.4 }, sp = (Mi.photoSpots || [])[0] || { x: -4562.1, z: 364.9 };
    ring(sp.x, sp.z, 6, 0, 10, 'mining-photo', mon.x, mon.z, { sp: 1.3 });
    const e = (Mi.entrances || [])[0]; if (e) ring(e.x + Math.sin(e.rotY || 0) * 5, e.z + Math.cos(e.rotY || 0) * 5, 8, 1, 10, 'mining-students', e.x, e.z, { role: 'student', gest: GT, dur: [100, 600], jit: 1.6 });         // the students of the Mining University
    const gw = Mi.gangway; if (gw && gw.foot && gw.top) { const gx = gw.foot.x - gw.top.x, gz = gw.foot.z - gw.top.z, gl = Math.hypot(gx, gz) || 1; queue(gw.foot.x, gw.foot.z, gx / gl, gz / gl, 5, 'krasin-queue', { d0: 1.8, mix: FAMILY.concat([['tourist', 4]]) }); }    // the museum ship opens Wed-Sun
    sitters(-4600, 480, 80, 3, 'krasin-sitter');
  });
  place('ltschmidt', () => {
    const Nc = svc('landmarksNavalCorps'), kr = (Nc.monuments || [])[0] || { x: -3984.5, z: -240.9 }, kp = (Nc.photoSpots || [])[0] || { x: -3988.4, z: -248.1 };
    ring(kp.x, kp.z, 4, 0, 8, 'krusenstern', kr.x, kr.z, { sp: 1.3 });
    residents(Z.ltschmidt, 'ltschmidt', { pairs: 3, family: 1, prams: 1, dogs: 2, joggers: 2, singles: 3, elders: 1 });
  });
  place('andrew', () => {
    const An = svc('landmarksAndrew'), cat = (An.monuments || [])[0] || { x: -3794.3, z: -824.9 }, e = (An.entrances || []).find((q) => /west/.test(q.id || '')), ph0 = (An.photoSpots || [])[0];
    if (ph0) ring(ph0.x, ph0.z, 5, 0, 9, 'andrew-photo', cat.x, cat.z, { sp: 1.3 });
    if (e && Number.isFinite(e.rotY)) queue(e.x, e.z, Math.sin(e.rotY), Math.cos(e.rotY), 4, 'andrew-worshippers', { role: 'elder', d0: 2.6 });
    ring(-3708, -671, 6, 0, 12, 'andreevsky-market', -3708, -671, { mix: [['elder', 3], ['walk', 4], ['parent', 1]], gest: GT, dur: [60, 400], jit: 1.8, sp: 2.2 });             // shoppers at the arcaded market with bags
    guided(cat.x + 12, cat.z + 20, cat.x, cat.z, { n: 12, col: '#f0cf45', asian: false });
    sitters(-3880, -900, 140, 7, 'boulevard-sitter');
    residents(Z.andrew, 'andrew', { pairs: 3, family: 1, prams: 1, dogs: 1, singles: 3, elders: 1, students: 2 });
  });
  place('vasileostrovskaya', () => {
    const doors = ((sv.metro && sv.metro.entrances) || []).filter((q) => /^vasileostrovskaya/.test(q.id || ''));
    for (const e of doors) ring(e.x + Math.sin(e.rotY || 0) * 4, e.z + Math.cos(e.rotY || 0) * 4, 6, 2, 11, 'vasil-wait', e.x, e.z, { mix: LOCALS, gest: [G.PHONE, G.WATCH, G.TALK, G.LOOKAROUND, G.NONE], dur: [60, 400], jit: 1.6 });     // the meeting place at the pavilion
    sitters(-4040, -1080, 110, 7, 'boulevard-sitter');
    residents(Z.vasil, 'vasil', { pairs: 4, family: 1, prams: 1, dogs: 1, joggers: 1, singles: 4, elders: 2, students: 3 });
  });
  place('sredny', () => {
    // window shoppers and cafe groups along Sredny pr. (a spot about a metre from a facade, found from the kerb to the wall), the cafe groups at the corner bakeries
    const facade = (x, z, nx, nz) => { let last = null; for (let d = 0; d < 16; d += 0.4) { const px = x + nx * d, pz = z + nz * d; if (nav.inBuilding(px, pz)) return last && d - last[2] < 1.3 ? [x + nx * (d - 1.15), z + nz * (d - 1.15), Math.atan2(nx, nz)] : null; if (free(px, pz, 0.35)) last = [px, pz, d]; } return null; };
    const along = (name, zones, step, k, scene) => {
      const got = [];
      for (const r of st.roads || []) {
        if (r.name !== name || !r.pts) continue; let acc = step * R();
        for (let i = 0; i + 1 < r.pts.length; i++) {
          const a = r.pts[i], b = r.pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, tx = (b[0] - a[0]) / l, tz = (b[1] - a[1]) / l;
          while (acc < l) { const sd = R() < 0.5 ? 1 : -1, q = facade(a[0] + tx * acc, a[1] + tz * acc, -tz * sd, tx * sd); if (q && zones.includes(nav.area.zone(q[0], q[1])) && !got.some((p) => dist(p[0], p[1], q[0], q[1]) < 18)) got.push([q[0], q[1], q[2], tx, tz]); acc += step * (0.6 + 0.8 * R()); }
          acc -= l;
        }
      }
      for (let i = got.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [got[i], got[j]] = [got[j], got[i]]; }
      for (const [x, z, yaw, tx, tz] of got.slice(0, k)) {
        if (R() < 0.55) { const list = [[x, z]]; if (free(x + tx * 0.85, z + tz * 0.85, 0.3)) list.push([x + tx * 0.85, z + tz * 0.85]); crowd(list, scene + '-window', { yaw: () => yaw, mix: LOCALS, gest: [G.LOOKAROUND, G.POINT, G.PHONE, G.TALK, G.NONE, G.WATCH], jit: 0.35, dur: [20, 160] }); }
        else { const cx = x - Math.sin(yaw) * 0.9, cz = z - Math.cos(yaw) * 0.9, list = [0, 1, 2].slice(0, R() < 0.5 ? 2 : 3).map((i) => [cx + Math.sin(i * 2.1 + 0.4) * 0.75, cz + Math.cos(i * 2.1 + 0.4) * 0.75]).filter((p) => free(p[0], p[1], 0.3)); crowd(list, scene + '-cafe', { yaw: (px, pz) => lookAt(px, pz, cx, cz), mix: [['walk', 4], ['student', 3], ['office', 2], ['date', 1]], gest: [G.EAT, G.TALK, G.PHONE, G.TALK, G.NONE], jit: 0.3, dur: [150, 800] }); }
      }
    };
    along('Средний проспект В.О.', [Z.sredny, Z.vasil], 40, 10, 'sredny');
    along('Большой проспект В.О.', [Z.andrew, Z.vo], 55, 6, 'bolshoy-vo');
    along('Малый проспект В.О.', [Z.vo, Z.vasil], 60, 4, 'maly-vo');
    residents(Z.sredny, 'sredny', { pairs: 4, family: 1, prams: 1, dogs: 1, singles: 5, elders: 2, students: 2 });
  });
  place('sportivnaya', () => {
    for (const e of ((sv.metro && sv.metro.entrances) || []).filter((q) => /^sportivnaya2-\d/.test(q.id || ''))) ring(e.x + Math.sin(e.rotY || 0) * 4, e.z + Math.cos(e.rotY || 0) * 4, 3, 2, 8, 'sportivnaya-wait', e.x, e.z, { mix: LOCALS, gest: [G.PHONE, G.WATCH, G.NONE, G.LOOKAROUND], dur: [60, 400], jit: 1.6 });
    const Mk = svc('landmarksMakarova'); for (const p of (Mk.photoSpots || []).slice(0, 5)) if (Number.isFinite(p.x) && p.y === undefined && !/Спортивная/.test(p.name || '')) ring(p.x, p.z, 2, 0, 6, 'makarova-photo', p.x - Math.sin((p.yaw || 0) * Math.PI / 180) * 20, p.z - Math.cos((p.yaw || 0) * Math.PI / 180) * 20);
    residents(Z.sportivnaya, 'sportivnaya', { pairs: 3, singles: 4, prams: 1, students: 2 });
  });
  place('gorny', () => {
    for (const e of ((sv.metro && sv.metro.entrances) || []).filter((q) => /^gorny-/.test(q.id || ''))) ring(e.x + Math.sin(e.rotY || 0) * 4, e.z + Math.cos(e.rotY || 0) * 4, 4, 2, 9, 'gorny-wait', e.x, e.z, { role: 'student', gest: [G.PHONE, G.WATCH, G.TALK, G.LOOKAROUND, G.NONE], dur: [60, 400], jit: 1.6 });          // the students of the Mining University
    ring(-5117, 70, 6, 0, 16, 'baltiysky-mall', -5117, 70, { mix: LOCALS, gest: GT, dur: [60, 400], jit: 1.8, sp: 2.4 });                                    // the mall and the cinema
    residents(Z.gorny, 'gorny', { pairs: 2, singles: 3, students: 2, prams: 1 });
    residents(Z.tram, 'depot', { pairs: 1, singles: 2, family: 1 });
  });
  place('kirova', () => {
    const Ki = svc('landmarksKirova'); const e = (Ki.entrances || []).find((q) => /erarta/i.test((q.id || '') + (q.name || ''))) || (Ki.entrances || [])[0];
    if (e && Number.isFinite(e.rotY)) ring(e.x + Math.sin(e.rotY) * 4, e.z + Math.cos(e.rotY) * 4, 6, 1, 10, 'erarta-visitors', e.x, e.z, { mix: [['walk', 3], ['student', 2], ['tourist', 2], ['date', 2], ['elder', 1]], gest: GT, dur: [100, 600], jit: 1.4 });
    sitters(-5300, -250, 160, 6, 'vasileostrovets-sitter');
    residents(Z.kirova, 'kirova', { pairs: 3, family: 3, prams: 2, dogs: 1, joggers: 1, singles: 3, elders: 2 });
  });
  place('seaterminal-pribaltiyskaya-gavan', () => {
    const St = svc('landmarksSeaTerminal'), tp = (St.photoSpots || [])[0] || { x: -6469, z: 613.7 }, tm = (St.monuments || [])[0] || { x: -6512, z: 701.7 };
    ring(tp.x, tp.z, 5, 0, 14, 'seaterminal-photo', tm.x, tm.z, { sp: 1.6 });
    const Pb = svc('landmarksPribaltiyskaya'), hm = (Pb.monuments || [])[0] || { x: -7635, z: -719 }, hp = (Pb.photoSpots || [])[0] || { x: -7516.6, z: -772.5 };
    ring(hp.x, hp.z, 5, 0, 12, 'pribaltiyskaya-photo', hm.x, hm.z, { sp: 1.5 });
    sitters(hp.x, hp.z, 120, 8, 'pribaltiyskaya-sitter');
    residents(Z.pribaltiyskaya, 'pribaltiyskaya', { pairs: 3, family: 2, prams: 1, singles: 3, elders: 1 });
    const Gv = svc('landmarksGavan'); for (const p of (Gv.photoSpots || []).slice(0, 4)) if (Number.isFinite(p.x) && p.y === undefined) ring(p.x, p.z, 2, 0, 6, 'gavan-photo', p.x - Math.sin((p.yaw || 0) * Math.PI / 180) * 20, p.z - Math.cos((p.yaw || 0) * Math.PI / 180) * 20);
    residents(Z.gavan, 'gavan', { pairs: 2, family: 2, prams: 1, dogs: 1, singles: 2, elders: 2 });
  });
  place('sevkabel', () => {
    // the summer-evening crowd of Sevkabel Port: the promenade along the river face of the hall (benches), the sea square, the lawn (picnics), the pier plaza
    const Sk = svc('landmarksSevkabel'), hall = (Sk.monuments || [])[0] || { x: -6172, z: 921 };
    sitters(-6244.7, 898, 70, 7, 'sevkabel-sitter', ['student', 'walk', 'date', 'tourist']);
    residents(Z.sevkabel, 'sevkabel', { pairs: 3, family: 1, prams: 1, dogs: 1, singles: 3, students: 2, roles: ['student', 'walk', 'tourist', 'date'] });
    void hall;
  });
  place('smolensky', () => {
    // the cemetery is quiet: a few visitors with flowers on the alleys (resident walkers of the zone, slow), the church portico (the crowd discs above)
    residents(Z.smolensky, 'smolensky', { pairs: 1, singles: 2, elders: 3 });
  });
  place('xenia', () => {
    // the pilgrims at the chapel of Blessed Xenia (women : men 5 : 1, elder women in the majority): a queue to the door, people at the ENE end wall (the plaque: palms on the plaster), at the note box and the candle
    // chest, flowers at the statue, a phone photo, groups of older women on the forecourt among the pigeons.  The discs `xenia-*` of the Smolensky service say where; all hours (the chapel is open day and night).
    const Sm = svc('landmarksSmolensky'), discs = (Sm.crowd || []).filter((c) => /^xenia/.test(c.id || '')), ch = (Sm.monuments || []).find((m) => /Ксени|xenia/i.test((m.id || '') + (m.name || ''))) || { x: -5588, z: -1326 };
    const pilgrim = () => (R() < 0.8 ? 'elder' : pick(['walk', 'elder', 'tourist', 'walk']));
    for (const c of discs) {
      const kind = String(c.id || ''), k = Math.max(1, Math.round((c.n ?? 6) * 0.9)), wall = /plaque|east|end/.test(kind);
      const list = spots(c.x, c.z, k, 0, Math.max(2.5, c.r || 4), { sp: wall ? 0.75 : 1.0, clr: 0.3 }), women = list.filter((q, i) => i % 6 !== 5), men = list.filter((q, i) => i % 6 === 5), scene = 'xenia-' + (kind.replace(/^xenia-?/, '') || 'pilgrims');
      const o = { tx: ch.x, tz: ch.z, role: () => (/forecourt|pigeon/.test(kind) ? pick(['elder', 'elder', 'walk', 'parent']) : pilgrim()), gest: wall ? [G.NONE, G.NONE, G.LOOKAROUND] : [G.NONE, G.PHONE, G.LOOKAROUND, G.NONE, G.PHOTO], dur: wall ? [300, 1500] : [120, 900], jit: wall ? 0.15 : 0.6, keep: 0.9 };
      for (const a of [...crowd(women, scene, { ...o, fem: true }), ...crowd(men, scene, { ...o, fem: false })]) a.rank = 0.1;          // women : men = 5 : 1; the chapel is visited at ALL hours (rank 0.1 < the 22 % who stay at night)
    }
    if (!discs.length) ring(ch.x, ch.z, 14, 2, 14, 'xenia-pilgrims', ch.x, ch.z, { role: 'elder', gest: [G.NONE, G.PHONE, G.LOOKAROUND, G.NONE], dur: [200, 1200], jit: 0.8, sp: 1.0 });
  });
  place('blagoveshchensky', () => {
    residents(Z.blag, 'blag', { pairs: 3, singles: 4, joggers: 1, students: 3, roles: ['student', 'tourist', 'walk'] });
    railing('blagoveshchensky', 1, 4, 40, 300, 'blag-railing', { mix: STUDENTS.concat(TOURISTS) }); railing('blagoveshchensky', -1, 4, 40, 300, 'blag-railing', { mix: STUDENTS.concat(TOURISTS) });     // the Neva from the bridge: students and tourists
  });
  place('generic-island', () => {
    residents(Z.vo, 'vo', { pairs: 4, family: 2, prams: 2, dogs: 2, joggers: 1, singles: 5, elders: 2, students: 2 });                                           // the ordinary streets and courtyards' edges of the island
  });

  // ============================================================================== ANGLERS ON THE EMBANKMENTS OF THE ISLAND
  place('anglers-vo', () => {
    const segs = ((env.quay && env.quay.segments) || []).filter((s) => s.slope === undefined && Math.hypot(s.bx - s.ax, s.bz - s.az) > 5);
    const anchors = [[-4300, 40, 140, 2], [-4540, 330, 110, 2], [-3300, -400, 130, 2], [-3250, -1560, 160, 2], [-5300, -1690, 150, 1], [-7520, -1830, 220, 2], [-5800, 1250, 200, 1]];
    for (const [ax, az, ar, k] of anchors) {
      const near = segs.filter((s) => dist((s.ax + s.bx) / 2, (s.az + s.bz) / 2, ax, az) < ar); let got = 0; const pts = [];
      for (let t = 0; t < 60 && got < k && near.length; t++) {
        const s = near[Math.floor(R() * near.length)], f = 0.1 + 0.8 * R(), wx = s.ax + (s.bx - s.ax) * f, wz = s.az + (s.bz - s.az) * f, x = wx + s.nx * 1.05, z = wz + s.nz * 1.05;
        if (!free(x, z, 0.3) || (env.waterAt && !env.waterAt(wx - s.nx * 2.5, wz - s.nz * 2.5)) || pts.some((p) => dist(p[0], p[1], x, z) < 3.2) || nav.area.zone(x, z) < PETRO_ZONE0 + 9) continue;
        if (skipQ()) { got++; continue; }
        const a = mk({ role: 'angler', age: R() < 0.4 ? 'elder' : undefined }, 'angler-vo', P.P_STROLL); standNear(a, x, z, Math.atan2(-s.nx, -s.nz) + rr(-0.15, 0.15), [G.NONE, G.NONE, G.WATCH, G.LOOKAROUND], 1e6); a.standG = [G.NONE, G.NONE, G.WATCH, G.LOOKAROUND]; count('angler-vo'); pts.push([x, z]); got++;
      }
    }
  });
  void makeSpec;
  out.total = sim.agents.length - n0;
  return out;
}
