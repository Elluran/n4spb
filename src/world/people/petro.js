// people/petro.js - the scripted life of the PETROGRAD SIDE and the SPIT of Vasilievsky Island (docs/PETRO-BRIEF.md; the dossiers docs/research/fortress.md, strelka.md, troitskaya.md, aurora.md, kronverk.md,
// kamennoostrovsky.md, vladimir.md, university-embankment.md, petro-bridges.md).  Same recipe as people/mars.js and sw.js: the building blocks come from west.js makeHelpers, the resident walkers from mars.js (their
// goals stay in their own zone: petroarea.js PETRO_ZONES, global index PETRO_ZONE0 + local), the anchors are read from the sight services (crowd, photoSpots, monuments, gates, bridges, roofWalk, beach, descent,
// entrances) with the dossier positions as the fallback; every place is its own try / catch and everybody stands on FREE walkable spots (never on asphalt, in a building, a fence, a plinth or the water).
//   Fortress:   the Ioannovsky bridge and the Hare, the Petrovsky gate (a tour group with a plain umbrella), the main alley (resident strollers, prams, a school excursion), the cathedral square (photographers of the
//               spire, two tour groups), Shemyakin's Peter I, the Mint, the Nevsky gate, the ROOF WALK of the Neva curtain (y 10.5), the BEACH (sunbathers standing against the granite wall, facing the sun; strollers
//               on the sand), the lawn of the Ioannovsky ravelin, bench sitters.  The island is shut at night (DENSITY.petro.zones 'fortress').
//   Spit:       the viewpoint at the tip, NEWLYWEDS with a photographer and guests at both granite spheres, couples on the descent landing by the water (y -2.8), photographers and a tour group at the Rostral
//               columns, the garden (residents, bench sitters), the Exchange steps, families at the Zoological Museum, the Pushkin House.
//   University: Kunstkamera (photographers, a tour group), students at the Lomonosov monument and the University door.
//   Bridges:    resident walkers on both pavements of the Trinity, Palace, Birzhevoy, Tuchkov and Sampsonievsky bridges and people at the railings looking at the Neva (everybody at DECK height).
//   Troitskaya: garden strollers and bench sitters, the chapel, the Solovetsky stone, the Kshesinskaya balcony (a tour group), the Mosque portal and gate, Gorky, the Gorkovskaya metro forecourt (a busker).
//   Kronverk:   Alexander Park joggers / prams / dog walkers / pairs, the Artillery Museum gate and court, Steregushchy, the mini-city, Narodny Dom theatre-goers, the queue of families at the zoo gate.
//   Aurora:     tourists and a tour group on the quay, the gangway queue, a marching column of NAKHIMOV CADETS and cadets at the school, the Cabin bust, the Shi-Tsza lions and their descent.
//   Avenues:    window shoppers and standing cafe groups along Bolshoy pr. P.S. and Kamennoostrovsky pr., Lev Tolstoy Square (metro, theatre), Austrian Square, Sytny market.
//   West:       Prince Vladimir Cathedral (porch, worshippers, the garden), Yubileyny, the Sportivnaya exits, two joggers and a dog walker at the quiet stadium.
//   Embankments: ANGLERS with rods at the granite parapets (Petrovskaya, Kronverkskaya, Mytninskaya, Universitetskaya, Makarova, Zhdanovskaya).
// Nobody carries a flag (guides: a plain coloured umbrella); no sounds.
import { makeSpec } from './chars.js';
import { GESTURE as G } from './contract.js';
import { makeHelpers } from './west.js';
import { PETRO_ZONE0 } from './area.js';

const TAU = Math.PI * 2;
const GP = [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.LOOKAROUND, G.POINT, G.NONE];
const GT = [G.TALK, G.NONE, G.PHONE, G.WATCH, G.LOOKAROUND, G.NONE];
const GW = [G.WATCH, G.NONE, G.LOOKAROUND, G.POINT, G.PHONE, G.PHOTO];

export function addPetro(ctx, nav, sim, S, H, kit) {
  const { R, rr, count } = S, N = nav.N, P = S.P, sv = ctx.services, cfg = S.petro || { scale: 1 }, ph = ctx.physics;
  const W = makeHelpers(ctx, nav, sim, S, H, cfg.scale ?? 1);
  const { pick, standNear, freeNear, spots, guided, show } = W;
  const { mk, fixed, free, lookAt, dist } = H;
  const { resident, residentPair, homeScript, walkerNodes, WANDER, JOG, qk, skipQ } = kit;
  const KEEP = (cfg.keep ?? 0.66) * (qk < 1 ? qk : 1), rs = (k) => (k ? Math.max(1, Math.round(k * (cfg.keep ?? 0.66))) : 0);          // the scripted crowd is thinned like the generic population (people.js DENSITY.global)
  const crowd = (list, scene, o = {}) => W.crowd(list, scene, o.keep === undefined ? { ...o, keep: KEEP } : o);
  const couple = (...a) => { if (!skipQ()) W.couple(...a); };
  const wedding = (...a) => { if (qk > 0.5 || R() < 0.5) W.wedding(...a); };
  const Z = { fortress: PETRO_ZONE0, strelka: PETRO_ZONE0 + 1, university: PETRO_ZONE0 + 2, troitskaya: PETRO_ZONE0 + 3, kronverk: PETRO_ZONE0 + 4, aurora: PETRO_ZONE0 + 5, petro: PETRO_ZONE0 + 6, vladimir: PETRO_ZONE0 + 7, bridges: PETRO_ZONE0 + 8, vo: PETRO_ZONE0 + 9 };
  const F = sv.landmarksFortress || {}, SK = sv.landmarksStrelka || {}, U = sv.landmarksUniversity || {}, T = sv.landmarksTroitskaya || {}, K = sv.landmarksKronverk || {}, AU = sv.landmarksAurora || {}, KM = sv.landmarksKamennoostrovsky || {}, V = sv.landmarksVladimir || {};
  const st = sv.streets || {}, env = sv.environment || {};
  const out = { places: {}, failed: [], ms: {}, total: 0 }, n0 = sim.agents.length;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const place = (name, fn) => { const before = sim.agents.length, t0 = now(); try { fn(); } catch (e) { out.failed.push(name); console.error('[people] petro vignette ' + name + ' failed:', e); } out.places[name] = sim.agents.length - before; out.ms[name] = Math.round(now() - t0); };
  const find = (list, re, fb) => (list || []).find((q) => re.test(String(q.id || '') + ' ' + String(q.key || '') + ' ' + String(q.name || '') + ' ' + String(q.kind || ''))) || fb;
  const kq = (k) => Math.max(1, Math.round(k * (qk < 1 ? qk : 1)));
  const TOURISTS = [['tourist', 6], ['asian', 1.5], ['walk', 3], ['student', 1.5], ['elder', 1], ['parent', 0.6]], LOCALS = [['walk', 5], ['student', 2], ['elder', 2], ['parent', 1], ['tourist', 1]], FAMILY = [['parent', 3], ['kid', 4], ['walk', 3], ['elder', 1]];
  /** people round a sight: k free spots r0..r1 m from (cx, cz), looking at (tx, tz) */
  const ring = (cx, cz, k, r0, r1, scene, tx, tz, o = {}) => crowd(spots(cx, cz, k, r0, r1, { sp: o.sp ?? 1.5, clr: o.clr ?? 0.5 }), scene, { tx, tz, gest: o.gest || GP, dur: o.dur || [40, 300], mix: o.mix || TOURISTS, role: o.role, jit: o.jit });
  /** a line of people from a door / gate outwards (two abreast), facing it */
  const queue = (x, z, nx, nz, k, scene, o = {}) => {
    const rx = nz, rz = -nx, q = [];
    for (let i = 0; i < k * 2; i++) { const d = (o.d0 ?? 2) + Math.floor(i / 2) * 0.95, sd = i % 2 ? 0.55 : -0.55, px = x + nx * d + rx * sd + rr(-0.1, 0.1), pz = z + nz * d + rz * sd + rr(-0.1, 0.1); if (free(px, pz, 0.3)) q.push([px, pz]); }
    return crowd(q.slice(0, k), scene, { yaw: () => Math.atan2(-nx, -nz), gest: [G.PHONE, G.NONE, G.WATCH, G.TALK, G.LOOKAROUND, G.NONE], jit: 0.2, dur: [200, 900], mix: o.mix || TOURISTS, role: o.role });
  };
  /** bench sitters: up to k of the free seats within r of (cx, cz) */
  const sitters = (cx, cz, r, k, scene, roles = ['elder', 'walk', 'student', 'tourist']) => {
    const seats = []; for (const b of nav.benches) if (dist(b.x, b.z, cx, cz) < r && b.where !== 'hall' && b.where !== 'platform') b.seats.forEach((s, si) => { if (s.taken < 0) seats.push([b, si]); });
    for (let i = seats.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [seats[i], seats[j]] = [seats[j], seats[i]]; }
    let ns = 0; for (const [b, si] of seats) { if (ns >= k) break; if (b.seats[si].taken >= 0 || skipQ()) continue; const role = pick(roles), a = mk({ role }, scene, role === 'elder' ? P.P_ELDER : P.P_STROLL); fixed(a); sim.sitAt(a, b, si, 0); a.until = rr(300, 1500); count(scene); ns++; }
  };
  /** people standing on a surface that is NOT street level (the roof walk, a descent landing, the lower beach): the spot must be a real walk surface within tol of y; they never walk (at night they vanish) */
  const lowStand = (list, y, tol, scene, o = {}) => {
    let k = 0;
    for (const [x, z] of list) {
      const h = ph.groundHeight(x, z, y + 0.6, false); if (!Number.isFinite(h) || Math.abs(h - y) > tol || (o.ok && !o.ok(x, z, h))) continue;
      let solid = false; try { solid = ph.columnBlocked(x, z, 0.3, h + 0.5, h + 1.6); } catch (e) { solid = false; } if (solid) continue;
      { let edge = false; for (const [dx, dz] of [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]]) { const h2 = ph.groundHeight(x + dx, z + dz, h + 0.6, false); if (!Number.isFinite(h2) || h2 < h - 0.5) { edge = true; break; } } if (edge && !o.edgeOK) continue; }        // not on the very edge of the surface
      if (R() > (o.keep ?? KEEP)) continue;
      const role = o.role ? (typeof o.role === 'function' ? o.role() : o.role) : W.roleOf(o.mix || TOURISTS), a = mk({ role }, scene, P.P_TOURIST);
      const yaw = (o.yaw ? o.yaw(x, z) : o.tx !== undefined ? lookAt(x, z, o.tx, o.tz) : R() * TAU) + rr(-(o.jit ?? 0.4), o.jit ?? 0.4);
      sim.standAt(a, x, z, yaw, o.gest || GW, 1e6, null, 0, h + 0.02); a.y = a.py = h + 0.02; fixed(a); a.standG = o.gest || GW; a.pier = true; a.low = true; a.comp = -1; count(scene); k++;
    }
    return k;
  };
  /** spots along a polyline, at least sp m apart */
  const alongLine = (pts, k, sp, e0 = 4) => {
    const segs = []; let tot = 0; for (let i = 0; i + 1 < pts.length; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push([pts[i], pts[i + 1], l, tot]); tot += l; }
    const list = []; for (let t = 0; t < k * 12 && list.length < k; t++) { const s = e0 + R() * Math.max(0, tot - 2 * e0), sg = segs.find((q) => s <= q[3] + q[2]) || segs[segs.length - 1], f = Math.max(0, Math.min(1, (s - sg[3]) / (sg[2] || 1))), x = sg[0][0] + (sg[1][0] - sg[0][0]) * f, z = sg[0][1] + (sg[1][1] - sg[0][1]) * f; if (!list.some((p) => dist(p[0], p[1], x, z) < sp)) list.push([x, z]); }
    return list;
  };
  /** people at the railing of a long bridge deck (nav.longs): side -1 / +1, u range in metres from the first bank, looking outward */
  const railing = (id, side, k, u0, u1, scene, o = {}) => {
    const s = (nav.longs || []).find((q) => q.id === id); if (!s) return [];
    const list = [];
    for (let t = 0; t < k * 14 && list.length < k; t++) {
      const u = Math.max(4, u0) + R() * (Math.min(s.len - 4, u1) - Math.max(4, u0));
      for (let inset = 0.45; inset < Math.min(1.5, s.v1 - s.v0 - 0.3); inset += 0.12) {                 // as close to the railing as the colliders allow
        const v = side * (s.v1 - inset), x = s.ax + s.ux * u - s.uz * v, z = s.az + s.uz * u + s.ux * v; if (!free(x, z, 0.26)) continue;
        if (!list.some((p) => dist(p[0], p[1], x, z) < (o.sp ?? 1.6))) list.push([x, z]); break;
      }
    }
    const face = Math.atan2(-s.uz * side, s.ux * side);
    return crowd(list, scene, { yaw: () => face, gest: o.gest || GW, jit: 0.5, dur: [60, 500], mix: o.mix || TOURISTS });
  };
  /** the first resident of a walking party starts at the walker node of `zone` nearest to (x, z) */
  const nodeNear = (zone, x, z, rmax = 120) => { let best = -1, bd = rmax; for (const id of walkerNodes[zone] || []) { const d = dist(N.x[id], N.z[id], x, z); if (d < bd) { bd = d; best = id; } } return best; };
  /** a walking column: a leader with followers two abreast (a school excursion with a teacher and an umbrella, a column of cadets); lives in `zone` */
  const column = (zone, x, z, leadOpts, followRole, k, scene, o = {}) => {
    const nd = nodeNear(zone, x, z); if (nd < 0 || skipQ()) return;
    const lead = sim.spawn(makeSpec(R, leadOpts), { prefs: P.P_TOUR, scene }); fixed(lead); lead.vpref = o.v ?? 0.95; lead.home = zone; lead.script = homeScript; sim.placeAtNode(lead, nd, 0.5); count(scene);
    for (let j = 0; j < k; j++) { const row = Math.floor(j / 2), b = sim.spawn(makeSpec(R, { role: followRole }), { prefs: P.P_TOUR, scene }); fixed(b); b.vpref = lead.vpref * 1.04; sim.follow(b, lead, (j % 2 ? 1 : -1) * (o.side ?? 0.6), (o.back ?? 0.9) + (o.gap ?? 0.75) * row); b.delay = Math.round((1.2 + 0.8 * row) / (lead.vpref * 0.1)); sim.place(b, lead.x, lead.z, lead.yaw, lead.y); b.comp = lead.comp; count(scene); }
  };
  const residents = (zone, pre, o = {}) => {
    for (let i = 0; i < rs(o.pairs); i++) residentPair(zone, i % 2 ? 'tourist' : 'walk', 'walk', pre + '-pair', WANDER);
    for (let i = 0; i < rs(o.family); i++) residentPair(zone, 'walk', 'kid', pre + '-family', WANDER);
    for (let i = 0; i < rs(o.prams); i++) resident(zone, { role: 'parent' }, WANDER, pre + '-pram');
    for (let i = 0; i < rs(o.dogs); i++) resident(zone, { role: 'dogwalker' }, WANDER, pre + '-dog');
    for (let i = 0; i < rs(o.joggers); i++) resident(zone, { role: 'sport' }, JOG, pre + '-jogger', (sp) => { sp.speed = 2.3 + R() * 0.7; });
    for (let i = 0; i < rs(o.singles); i++) resident(zone, { role: pick(o.roles || ['walk', 'tourist', 'walk', 'student']) }, { ...WANDER, spot: 1.2 }, pre + '-single');
    for (let i = 0; i < rs(o.elders); i++) resident(zone, { role: 'elder' }, WANDER, pre + '-elder');
  };

  // ============================================================================== THE PETER AND PAUL FORTRESS
  const CATH = F.cathedral && F.cathedral.tower ? { x: F.cathedral.tower[0], z: F.cathedral.tower[1] } : { x: -1970.6, z: -1970 };
  const gate = (key, fb) => find(F.gates, new RegExp(key), fb);
  place('fortress-bridge', () => {
    // the Ioannovsky bridge: people stop above the Hare (a bronze hare on a pile beside the bridge: they throw coins) and at the lamps; photographers of the bridge and the gate from the far bank
    const hare = find(F.monuments, /n1521079740|Зайчик/, { x: -1600, z: -2218.8 }), b = find(F.bridges, /ioannovsky/, { a: [-1642.25, -2117.2], b: [-1596.45, -2260.65], w: 9.8 });
    const dx = b.b[0] - b.a[0], dz = b.b[1] - b.a[1], l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, uh = (hare.x - b.a[0]) * ux + (hare.z - b.a[1]) * uz, sd = Math.sign(-(hare.x - b.a[0]) * uz + (hare.z - b.a[1]) * ux) || 1, list = [];
    for (let t = 0; t < 60 && list.length < 5; t++) { const u = uh + rr(-4.5, 4.5), v = sd * ((b.w || 9.8) / 2 - 0.75), x = b.a[0] + ux * u - uz * v, z = b.a[1] + uz * u + ux * v; if (free(x, z, 0.28) && !list.some((p) => dist(p[0], p[1], x, z) < 1.0)) list.push([x, z]); }
    crowd(list, 'hare', { tx: hare.x, tz: hare.z, gest: [G.POINT, G.PHOTO, G.WATCH, G.PHONE, G.WAVE, G.NONE], dur: [40, 300], mix: FAMILY.concat([['tourist', 5]]), jit: 0.3 });
    const ps = find(F.photoSpots, /Иоанновский мост/, { x: -1602.5, z: -2241.6 }); ring(ps.x, ps.z, 3, 0.5, 6, 'ioannovsky-photo', b.a[0], b.a[1]);
  });
  place('fortress-gates', () => {
    const pg = gate('petrovsky', { outer: [-1729.2, -2049.5], inner: [-1750.2, -2043.3] }), ps = find(F.photoSpots, /Петровские/, { x: -1706.2, z: -2056.3 });
    ring(ps.x, ps.z, 4, 0.5, 7, 'petrovsky-gate', pg.outer[0], pg.outer[1], { sp: 1.3 });                                                          // the gate with the lead eagle
    guided(ps.x + 6, ps.z - 7, pg.outer[0], pg.outer[1], { n: 14, col: '#d33a2a', asian: false });                                                 // a tour group with a plain umbrella in front of the gate
    const ng = gate('nevsky', { inner: [-1849.2, -1890.1] }); ring(ng.inner[0] - 6, ng.inner[1] - 8, 3, 1, 8, 'nevsky-gate', ng.inner[0], ng.inner[1]);
  });
  place('fortress-alley', () => {
    // the main alley from the Petrovsky gate to the cathedral and round the squares: strollers in pairs, prams, families, pensioners (resident walkers of the island), a school excursion with a teacher
    residents(Z.fortress, 'fortress', { pairs: 5, family: 2, prams: 2, singles: 4, elders: 1, roles: ['tourist', 'tourist', 'walk', 'asian', 'student'] });
    column(Z.fortress, -1800, -2025, { role: 'guide', guideCol: '#e8892b' }, 'kid', 6, 'fortress-school');
    sitters(CATH.x, CATH.z, 420, 9, 'fortress-sitter', ['elder', 'walk', 'tourist', 'tourist', 'parent']);
  });
  place('cathedral-square', () => {
    const sq = find(F.crowd, /photo/, { x: -1990.4, z: -1960.5 }), ps = find(F.photoSpots, /Соборной площади/, { x: -2008.5, z: -1945.1 });
    ring(sq.x, sq.z, 9, 0, 12, 'cathedral-square', CATH.x, CATH.z, { sp: 1.6, gest: [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.POINT, G.LOOKAROUND, G.NONE] });        // the spire needs the whole square to fit into a frame
    guided(ps.x - 3, ps.z + 6, CATH.x, CATH.z, { n: 16, col: '#2f6fc0', asian: true });
    guided(-1930, -1948, CATH.x, CATH.z, { n: 12, col: '#f0cf45', asian: false });
    for (let i = 0; i < 2; i++) { const q = spots(sq.x, sq.z, 1, 6, 20, { clr: 0.6 })[0]; if (q) couple(q[0], q[1], CATH.x, CATH.z, 'cathedral-couple'); }
    const door = (F.entrances || [])[0] || { x: -1979.2, z: -1965.8, rotY: -1.122 }; queue(door.x, door.z, Math.sin(door.rotY), Math.cos(door.rotY), 5, 'cathedral-queue', { d0: 2.4 });   // the ticket check at the west door
    const mint = (F.crowd || []).filter((c) => c.kind === 'photo')[1] || { x: -2022.6, z: -1989.5 }; ring(mint.x, mint.z, 3, 0, 7, 'mint-photo', -2046.8, -1911.3);
  });
  place('peter-shemyakin', () => {
    const pm = find(F.monuments, /n1955770752|Шемякин/, { x: -1869.8, z: -1974.6 });
    ring(pm.x, pm.z, 5, 2.2, 5.5, 'shemyakin-peter', pm.x, pm.z, { sp: 1.1, clr: 0.4, gest: [G.PHOTO, G.SELFIE, G.POINT, G.PHONE, G.POSE, G.NONE] });           // everybody is photographed with the bronze Peter
    const q = spots(pm.x, pm.z, 1, 4, 9, { clr: 0.6 })[0]; if (q) couple(q[0], q[1], pm.x, pm.z, 'shemyakin-couple');
  });
  place('roof-walk', () => {
    // the Neva Panorama: the walk on the roof of the Neva curtain between the Naryshkin and the Gosudarev bastions (10.5 m up): visitors at the parapet look at the Neva and the Palace Embankment
    const rw = F.roofWalk; if (!rw || !rw.pts || rw.pts.length < 2) return;
    lowStand(alongLine(rw.pts, 11, 5, 5), rw.y ?? 10.5, 0.6, 'roof-walk', { tx: -1700, tz: -1500, gest: [G.PHOTO, G.WATCH, G.POINT, G.PHONE, G.SELFIE, G.NONE], jit: 0.6, edgeOK: true });
  });
  place('beach', () => {
    // the beach under the Neva curtain: the famous sunbathers STAND with their backs against the warm granite wall, facing the sun (south); others stroll on the sand or look at the water
    const solidAt = (x, z) => { if (nav.rawInBuilding(x, z)) return true; try { return ph.columnBlocked(x, z, 0.25, 0.6, 2.6); } catch (e) { return false; } };
    const wallFoot = (x, zN, zS) => { let run = 0, last = null; for (let z = zN; z <= zS; z += 0.35) { if (solidAt(x, z)) { run++; continue; } if (run >= 4) { for (let d = 0.5; d < 1.6; d += 0.25) if (free(x, z + d, 0.3)) { last = [x, z + d]; break; } } run = 0; } return last; };
    const beaches = (F.crowd || []).filter((c) => c.kind === 'beach'); if (!beaches.length) beaches.push({ x: -2040, z: -1740, r: 30, n: 26 }, { x: -1960, z: -1752, r: 16, n: 12 });
    for (const c of beaches) {
      const k = Math.round((c.n || 12) * 0.8 * (qk < 1 ? qk : 1)), list = [];
      for (let t = 0; t < k * 12 && list.length < k; t++) { const x = c.x + rr(-c.r, c.r), q = wallFoot(x, c.z - 90, c.z + 4); if (q && !list.some((p) => dist(p[0], p[1], q[0], q[1]) < 1.0)) list.push(q); }
      crowd(list, 'beach-wall', { keep: 1, yaw: () => 0, role: () => (R() < 0.8 ? 'beach' : pick(['walk', 'elder', 'tourist'])), gest: [G.NONE, G.NONE, G.NONE, G.LOOKAROUND, G.PHONE, G.TALK], jit: 0.45, dur: [600, 2400] });
      crowd(spots(c.x, c.z, Math.max(2, Math.round(k * 0.4)), 0, c.r, { sp: 2.2, clr: 0.5 }), 'beach-sand', { tx: c.x, tz: c.z + 200, role: () => pick(['beach', 'walk', 'tourist', 'parent', 'kid', 'beach']), gest: [G.WATCH, G.NONE, G.PHOTO, G.POINT, G.TALK], jit: 0.9, dur: [120, 900] });
    }
    const lw = find(F.crowd, /lawn/, null); if (lw) { const list = []; for (let t = 0; t < 80 && list.length < 5; t++) { const a = R() * TAU, r = Math.sqrt(R()) * (lw.r || 12), x = lw.x + Math.sin(a) * r, z = lw.z + Math.cos(a) * r; if (nav.walkable(x, z) && nav.obstDist(x, z, 0.8) > 0.5 && nav.cover(x, z) < -1 && !list.some((p) => dist(p[0], p[1], x, z) < 2.2)) list.push([x, z]); }
      crowd(list, 'ravelin-lawn', { yaw: () => rr(-0.6, 0.6), role: () => pick(['beach', 'beach', 'student', 'walk']), gest: [G.NONE, G.PHONE, G.TALK, G.EAT, G.LOOKAROUND], dur: [600, 2400], y: 0.04 }); }
  });

  // ============================================================================== THE SPIT OF VASILIEVSKY ISLAND
  const TIP = find(SK.crowd, /viewpoint/, { x: -2462, z: -1320.7 }), FORT = { x: CATH.x, z: CATH.z };
  place('strelka-point', () => {
    ring(TIP.x, TIP.z, 7, 0, 9, 'strelka-point', FORT.x, FORT.z, { sp: 1.2, gest: [G.PHOTO, G.PHOTO, G.SELFIE, G.WATCH, G.POINT, G.PHONE, G.NONE] });          // the panorama of the fortress and the Hermitage from the tip
    guided(TIP.x - 14, TIP.z + 10, FORT.x, FORT.z, { n: 16, col: '#2f9f6a', asian: true });
    const q = spots(TIP.x, TIP.z, 1, 5, 14, { clr: 0.6 })[0]; if (q) couple(q[0], q[1], FORT.x, FORT.z, 'strelka-couple', { roleA: 'date', roleB: 'walk' });
  });
  place('strelka-weddings', () => {
    // newlyweds with a photographer and guests at the granite spheres (the wedding stop of the city: champagne at the water)
    for (const id of ['strelka-sphere-south', 'strelka-sphere-north']) {
      const s = find(SK.monuments, new RegExp(id), id.endsWith('south') ? { x: -2439.4, z: -1271.7 } : { x: -2494.3, z: -1364 }); let q = null;
      for (let t = 0; t < 700 && !q; t++) { const a = R() * TAU, r = 4 + (t < 350 ? 18 : 30) * R(), x = s.x + Math.sin(a) * r, z = s.z + Math.cos(a) * r, c = t < 350 ? 1.6 : 1.0; if (free(x, z, c) && free(x + 2.2, z, 0.4) && free(x - 2.2, z, 0.4) && free(x, z + 2.2, 0.4) && free(x, z - 2.2, 0.4)) q = [x, z]; }
      if (q) wedding(q[0], q[1], id, 0, 1.2);
    }
  });
  place('strelka-descent', () => {
    // the semicircular granite descent: couples and photographers on the lower landing by the water (the landing lies 2.8 m below the square)
    const d = SK.descent, c = find(SK.crowd, /quay/, d && d.landing ? { x: d.landing.x, z: d.landing.z, r: 9 } : null); if (!c) return;
    const y = (d && Number.isFinite(d.landingY)) ? d.landingY : (c.y ?? -2.8), list = []; for (let t = 0; t < 160 && list.length < 9; t++) { const a = R() * TAU, r = Math.sqrt(R()) * ((c.r || 9) + 3), x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r; if (!list.some((p) => dist(p[0], p[1], x, z) < 1.5)) list.push([x, z]); }
    // ... and people SITTING on the granite edge of the landing, their legs hanging over the water (the seat is the landing itself: a bench record without a bench)
    { const on = (x, z) => { const h = ph.groundHeight(x, z, y + 0.6, false); return Number.isFinite(h) && Math.abs(h - y) < 0.2; }, got = [];
      for (let t = 0; t < 220 && got.length < kq(6); t++) {
        const a = R() * TAU, r = 2 + 14 * R(); let x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r; if (!on(x, z)) continue; let ob = null;
        { let bd = 9; for (let q = 0; q < 16; q++) { const b = q * 0.3927, ox = Math.sin(b), oz = Math.cos(b); if (on(x + ox * 1.2, z + oz * 1.2) || !on(x - ox * 1.0, z - oz * 1.0) || !env.waterAt || !env.waterAt(x + ox * 2.2, z + oz * 2.2) || ph.groundHeight(x + ox * 1.6, z + oz * 1.6, y + 0.6, false) > y - 0.8) continue; let lo = 0, hi = 1.2; for (let i = 0; i < 5; i++) { const m = (lo + hi) / 2; if (on(x + ox * m, z + oz * m)) lo = m; else hi = m; } if (hi < bd) { bd = hi; ob = b; } } }
        if (ob === null) continue; const ox = Math.sin(ob), oz = Math.cos(ob); let lo = 0, hi = 1.2; for (let i = 0; i < 6; i++) { const m = (lo + hi) / 2; if (on(x + ox * m, z + oz * m)) lo = m; else hi = m; } x += ox * (lo - 0.2); z += oz * (lo - 0.2);
        if (got.some((p) => dist(p[0], p[1], x, z) < 1.3) || list.some((p) => dist(p[0], p[1], x, z) < 0.9)) continue; got.push([x, z]);
        const role = pick(['student', 'date', 'walk', 'tourist', 'student']), s = mk({ role }, 'strelka-edge', P.P_STROLL); fixed(s);
        sim.sitAt(s, { x, z, rotY: ob, len: 0.8, seats: [{ x, z, taken: -1 }], node: -1, ax: x - ox * 0.8, az: z - oz * 0.8, y: y - 0.45 }, 0, 0); s.until = 1e6; s.y = s.py = y - 0.45; s.comp = -1; s.pier = true; s.low = true; count('strelka-edge');
      } }
    lowStand(list, y, 0.35, 'strelka-descent', { tx: FORT.x, tz: FORT.z, gest: [G.WATCH, G.PHOTO, G.SELFIE, G.POINT, G.TALK, G.NONE], jit: 0.9, mix: [['tourist', 4], ['date', 2], ['walk', 3], ['student', 2]], keep: 1 });
  });
  place('rostral-columns', () => {
    const cn = find(SK.monuments, /rostral-north/, { x: -2585.1, z: -1364.3 }), cs = find(SK.monuments, /rostral-south/, { x: -2481.4, z: -1190.1 });
    const pn = find(SK.photoSpots, /Северная ростральная/, { x: -2554.5, z: -1358.8 }), psn = find(SK.photoSpots, /Южная ростральная/, { x: -2472.6, z: -1221.3 });
    ring(pn.x, pn.z, 4, 0, 8, 'rostral-photo', cn.x, cn.z); ring(psn.x, psn.z, 4, 0, 8, 'rostral-photo', cs.x, cs.z);
    guided(psn.x + 7, psn.z + 6, cs.x, cs.z, { n: 14, col: '#f0cf45', asian: false });                                                               // the excursion buses stop at the south column
  });
  place('strelka-garden', () => {
    const g = find(SK.crowd, /park/, { x: -2480.9, z: -1309.5, r: 26 });
    residents(Z.strelka, 'strelka', { pairs: 3, family: 1, prams: 1, singles: 3, roles: ['tourist', 'tourist', 'walk', 'asian'] });
    sitters(g.x, g.z, 110, 6, 'strelka-sitter');
    const an = find(SK.monuments, /strelka-anchor/, null); if (an) ring(an.x, an.z, 2, 3.6, 7, 'strelka-anchor', an.x, an.z, { mix: FAMILY });
  });
  place('exchange', () => {
    const e = (SK.entrances || [])[0] || { x: -2579.2, z: -1251, rotY: 2.108 }, nx = Math.sin(e.rotY), nz = Math.cos(e.rotY);
    ring(e.x + nx * 22, e.z + nz * 22, 4, 0, 9, 'exchange-photo', e.x - nx * 20, e.z - nz * 20);                                                    // the temple front of the Exchange from the square
    const zm = find(SK.monuments, /warehouse-r19826133|Зоологический/, { x: -2606.8, z: -1112 }); ring(zm.x + 16, zm.z + 18, 5, 0, 12, 'zoo-museum', zm.x, zm.z, { mix: FAMILY, gest: GT, dur: [100, 600] });        // families at the Zoological Museum
    const ph2 = find(SK.photoSpots, /Пушкинский/, { x: -2783.1, z: -1423.2 }); ring(ph2.x, ph2.z, 2, 0, 6, 'pushkin-house', -2797.2, -1380.1);
  });

  // ============================================================================== UNIVERSITETSKAYA EMBANKMENT
  place('university', () => {
    const kt = U.tower || { x: -2613.3, z: -1012.9 }, kp = find(U.photoSpots, /Кунсткамера/, { x: -2592.8, z: -995.3 });
    ring(kp.x, kp.z, 4, 0, 8, 'kunstkamera-photo', kt.x, kt.z); guided(kp.x + 9, kp.z - 4, kt.x, kt.z, { n: 12, col: '#d33a2a', asian: false });
    const lo = find(U.monuments, /n1584459525|Ломоносов/, { x: -2777.2, z: -905.9 }), lc = find(U.crowd, /Ломоносов/, { x: -2769.9, z: -895.2 });
    ring(lc.x, lc.z, 5, 0, 7, 'lomonosov-students', lo.x, lo.z, { role: 'student', gest: GT, dur: [100, 600], jit: 1.4 });                               // the students' meeting place
    const ud = find(U.entrances, /университет/i, { x: -2890.5, z: -1026 }); ring(ud.x, ud.z, 5, 2.5, 10, 'university-door', ud.x, ud.z, { role: 'student', gest: GT, dur: [100, 600], jit: 1.6 });
    const ac = find(U.photoSpots, /Академия/, { x: -2691.2, z: -918.2 }); ring(ac.x, ac.z, 2, 0, 6, 'academy-photo', -2705.1, -940.4);
    residents(Z.university, 'university', { pairs: 2, singles: 3, roles: ['student', 'student', 'tourist', 'walk'] });
  });

  // ============================================================================== THE NEVA BRIDGES (everybody at deck height: nav.longs / services.bridges.deckY)
  place('bridges', () => {
    // walkers who live on the decks (pairs, singles, a jogger: the chains of both pavements of every long bridge are the nodes of the zone) and people at the railings
    residents(Z.bridges, 'bridge', { pairs: 5, singles: 8, joggers: 2, family: 1, roles: ['tourist', 'walk', 'tourist', 'student', 'walk'] });
    railing('troitsky', -1, 7, 150, 420, 'trinity-railing'); railing('troitsky', 1, 4, 120, 430, 'trinity-railing');          // west pavement: the fortress and the Spit; east: the Neva upstream
    railing('palace', 1, 3, 60, 200, 'palace-railing'); railing('palace', -1, 3, 60, 200, 'palace-railing');
    railing('birzhevoy', 1, 3, 50, 190, 'birzhevoy-railing'); railing('birzhevoy', -1, 2, 50, 190, 'birzhevoy-railing');
    railing('tuchkov', 1, 2, 50, 170, 'tuchkov-railing'); railing('tuchkov', -1, 2, 50, 170, 'tuchkov-railing');
  });

  // ============================================================================== TROITSKAYA SQUARE, THE MOSQUE, KSHESINSKAYA
  place('troitskaya', () => {
    residents(Z.troitskaya, 'troitskaya', { pairs: 4, family: 1, prams: 2, dogs: 1, joggers: 1, singles: 4, elders: 2 });
    const c = find(T.crowd, /troitskaya-centre/, { x: -1442.8, z: -2296.5 }); sitters(c.x, c.z, 150, 15, 'troitskaya-sitter');
    const ch = find(T.crowd, /trinity-chapel/, { x: -1441.9, z: -2155 }), chm = find(T.monuments, /w116398370|Часовня/, { x: -1428.9, z: -2155 }); ring(ch.x, ch.z, 3, 0, 6, 'trinity-chapel', chm.x, chm.z, { mix: LOCALS, gest: [G.NONE, G.LOOKAROUND, G.PHOTO, G.NONE] });
    const so = find(T.crowd, /solovetsky/, { x: -1410.9, z: -2215.8 }), som = find(T.monuments, /n973767127|Соловецкий/, { x: -1405.9, z: -2216.8 }); ring(so.x, so.z, 3, 1.5, 6, 'solovetsky-stone', som.x, som.z, { mix: LOCALS, gest: [G.NONE, G.NONE, G.LOOKAROUND, G.WATCH], dur: [100, 500] });
  });
  place('kshesinskaya-mosque', () => {
    const kb = find(T.crowd, /kshesinskaya/, { x: -1493.9, z: -2441.7 }), km = find(T.monuments, /w43679385|Кшесинской/, { x: -1492, z: -2446.8 });
    ring(kb.x, kb.z, 4, 3, 10, 'kshesinskaya', km.x, km.z); guided(kb.x - 2, kb.z + 12, km.x, km.z, { n: 12, col: '#2f6fc0', asian: false });               // the balcony of 1917
    const mp = find(T.crowd, /mosque-portal/, { x: -1562, z: -2546 }), mc = T.mosque && T.mosque.centre ? { x: T.mosque.centre[0], z: T.mosque.centre[1] } : { x: -1527.5, z: -2530.7 };
    ring(mp.x, mp.z, 6, 0, 9, 'mosque-photo', mc.x, mc.z, { gest: [G.PHOTO, G.PHOTO, G.POINT, G.PHONE, G.LOOKAROUND, G.NONE] });                               // the turquoise dome and the minarets
    const fg = ((T.fences || []).find((f) => f.kind === 'mosque') || {}).gates; if (fg && fg[0]) ring(fg[0].x, fg[0].z, 3, 2, 7, 'mosque-gate', mc.x, mc.z, { role: () => pick(['elder', 'walk', 'walk']), gest: [G.NONE, G.TALK, G.NONE, G.LOOKAROUND], dur: [200, 900] });
    const go = find(T.crowd, /gorky/, { x: -1751.6, z: -2704.5 }), gm = find(T.monuments, /n1029463448|Горьком/, { x: -1757.5, z: -2711.3 }); ring(go.x, go.z, 5, 0, 8, 'gorky', gm.x, gm.z, { mix: LOCALS, gest: GT, dur: [100, 600], jit: 1.5 });                 // "at Gorky": a meeting place
  });

  // ============================================================================== ALEXANDER PARK, THE KRONVERK, NARODNY DOM, THE ZOO
  place('alexander-park', () => {
    residents(Z.kronverk, 'park', { pairs: 4, family: 2, prams: 3, dogs: 2, joggers: 3, singles: 3, elders: 2 });                                        // joggers, prams and dogs on the alleys
    const mg = find(K.crowd, /у ворот музея/, { x: -2056, z: -2284 }), gt = find(K.gates, /main/, { x: -2059.9, z: -2295.7 }); ring(mg.x, mg.z, 4, 0, 9, 'artillery-gate', gt.x, gt.z, { mix: FAMILY.concat([['tourist', 4]]) });
    const ct = find(K.crowd, /двор Артиллерийского/, null); if (ct) ring(ct.x, ct.z, 6, 0, ct.r || 14, 'artillery-court', ct.x - 10, ct.z - 40, { mix: FAMILY.concat([['tourist', 3]]), gest: [G.POINT, G.PHOTO, G.WATCH, G.PHONE, G.NONE], jit: 1.6 });
    for (const [re, k, fb, mix] of [[/Стерегущ/, 4, { x: -1688, z: -2568.8 }, TOURISTS], [/Мини-город/, 6, { x: -1946, z: -2598 }, FAMILY.concat([['tourist', 4]])], [/Зодчих/, 2, { x: -1923.1, z: -2563.8 }, TOURISTS], [/декабрист/, 2, { x: -1852.8, z: -2331.9 }, LOCALS]]) {
      const c = find(K.crowd, re, fb), m = find(K.monuments, re, null) || c; ring(c.x, c.z, k, re.source === 'Мини-город' ? 3 : 0, Math.max(5, (c.r || 5) + 2), 'park-' + (k === 6 ? 'minicity' : 'monument'), m.x, m.z, { mix, sp: 1.3 });
    }
    sitters(-1900, -2560, 260, 6, 'park-sitter');
  });
  place('gorkovskaya', () => {
    const mi = find(K.crowd, /у метро/, { x: -1821.2, z: -2672.7 }), mo = find(K.crowd, /выход метро/, { x: -1789.7, z: -2651.8 }), ms = K.metro || { x: -1818.3, z: -2642.8 };
    ring(mi.x, mi.z, 6, 0, 9, 'gorkovskaya-wait', ms.x, ms.z, { mix: LOCALS, gest: [G.PHONE, G.WATCH, G.TALK, G.LOOKAROUND, G.NONE, G.PHONE], dur: [60, 400], jit: 1.6 });        // the meeting place at the "flying saucer"
    ring(mo.x, mo.z, 3, 0, 7, 'gorkovskaya-wait', ms.x, ms.z, { mix: LOCALS, gest: GT, dur: [60, 400], jit: 1.6 });
    show(mi.x + 14, mi.z - 16, 'gorkovskaya-busker', { role: 'busker', gest: G.PLAY, k: 7, r: 26 });
  });
  place('narodny-dom-zoo', () => {
    for (const [re, k, fb] of [[/Балтийского дома/, 4, { x: -2148.8, z: -2630.7 }], [/Планетари/, 3, { x: -2244.8, z: -2591.9 }], [/Мюзик-холл/, 3, { x: -2308.8, z: -2591.6 }]]) { const c = find(K.crowd, re, null) || find(K.photoSpots, re, fb); ring(c.x, c.z, k, 0, 9, 'narodny-dom', c.x, c.z - 30, { mix: [['date', 2], ['walk', 4], ['elder', 1.5], ['parent', 1], ['kid', 1]], gest: GT, dur: [100, 700], jit: 1.4 }); }
    const zg = find(K.entrances, /зоопарк/i, { x: -2370.8, z: -2349.7, rotY: Math.PI }), nx = Math.sin(zg.rotY ?? Math.PI), nz = Math.cos(zg.rotY ?? Math.PI);
    queue(zg.x, zg.z, nx, nz, 7, 'zoo-queue', { mix: FAMILY, d0: 4.4 }); ring(zg.x + nx * 12, zg.z + nz * 12, 3, 0, 7, 'zoo-gate', zg.x, zg.z, { mix: FAMILY, gest: [G.POINT, G.PHOTO, G.WAVE, G.TALK, G.NONE] });           // families at the zoo ticket office
  });

  // ============================================================================== PETROVSKAYA EMBANKMENT: THE CABIN, THE LIONS, THE AURORA, THE NAKHIMOV SCHOOL
  place('aurora', () => {
    const ship = AU.ship || { x: -753.05, z: -2561.8 }, q0 = (AU.crowd || [])[0] || { x: -769.8, z: -2516.7 }, q1 = (AU.crowd || [])[1] || { x: -789.2, z: -2578.2 };
    ring(q0.x, q0.z, 8, 0, 11, 'aurora-quay', ship.x, ship.z, { sp: 1.2, gest: [G.PHOTO, G.PHOTO, G.SELFIE, G.POINT, G.PHONE, G.WATCH, G.NONE] });                       // the cruiser from the quay
    guided(q0.x - 9, q0.z - 8, ship.x, ship.z, { n: 16, col: '#d33a2a', asian: true }); guided(q1.x - 10, q1.z + 12, ship.x, ship.z, { n: 12, col: '#2f6fc0', asian: false });
    const gw = AU.gangway || { x: -785.9, z: -2582.5 }, gl = Math.hypot(gw.x - ship.x, gw.z - ship.z) || 1; queue(gw.x, gw.z, (gw.x - ship.x) / gl, (gw.z - ship.z) / gl, 6, 'aurora-gangway', { d0: 1.6 });                 // the queue to the gangway
    for (let i = 0; i < 2; i++) { const q = spots(q0.x, q0.z, 1, 6, 22, { clr: 0.6 })[0]; if (q) couple(q[0], q[1], ship.x, ship.z, 'aurora-couple'); }
    const sm = find(AU.monuments, /n1830948973|морякам/, { x: -782, z: -2441.7 }); ring(sm.x, sm.z, 2, 4, 9, 'sailors-monument', sm.x, sm.z);
    residents(Z.aurora, 'aurora', { pairs: 3, family: 1, prams: 1, singles: 3, roles: ['tourist', 'tourist', 'walk', 'asian'] });
  });
  place('cadets', () => {
    // the Nakhimov Naval School: a column of cadets in summer whites marching along the embankment, a few more at the bronze "Young Nakhimov cadet"
    const yn = find(AU.monuments, /n6548233166|нахимовец/, { x: -828.3, z: -2537.8 });
    column(Z.aurora, yn.x + 14, yn.z - 4, { role: 'cadet' }, 'cadet', 9, 'cadets', { v: 1.3, side: 0.45, back: 0.95, gap: 0.95 });
    ring(yn.x, yn.z, 4, 2.5, 7, 'cadets-school', yn.x, yn.z, { role: 'cadet', gest: [G.TALK, G.NONE, G.LOOKAROUND, G.NONE], dur: [200, 900], jit: 1.2, sp: 1.0 });
  });
  place('cabin-lions', () => {
    const bust = find(AU.monuments, /n1558527389|Бюст Петра/, { x: -1127.8, z: -2286.6 }), bc = (AU.crowd || [])[2] || { x: -1124.1, z: -2278.4 }; ring(bc.x, bc.z, 4, 0, 6, 'cabin-bust', bust.x, bust.z);
    const li = AU.lions || { x: -1111.7, z: -2246.4 }, lc = (AU.crowd || [])[4] || { x: -1117.4, z: -2249.3 };
    ring(lc.x, lc.z, 5, 0, 7, 'shitsza-lions', li.x, li.z, { gest: [G.PHOTO, G.SELFIE, G.POINT, G.POSE, G.PHONE, G.NONE] });                                         // the Manchurian lions: everybody poses with them
    const ld = find(AU.crowd, /descent/, null); if (ld) { const list = []; for (let t = 0; t < 80 && list.length < 5; t++) { const a = R() * TAU, r = Math.sqrt(R()) * ((ld.r || 5) + 1), x = ld.x + Math.sin(a) * r, z = ld.z + Math.cos(a) * r; if (!list.some((p) => dist(p[0], p[1], x, z) < 1.3)) list.push([x, z]); } lowStand(list, ld.y ?? -1.7, 0.9, 'lions-descent', { tx: ld.x + 60, tz: ld.z + 160, edgeOK: true }); }
    const door = find(AU.entrances, /w28712275/, null) || (AU.entrances || [])[1]; if (door) ring(door.x, door.z, 3, 2.5, 8, 'cabin-door', door.x, door.z, { mix: TOURISTS, gest: GT });
  });

  // ============================================================================== KAMENNOOSTROVSKY PR., BOLSHOY PR. P.S., THE SQUARES
  place('avenues', () => {
    // window shoppers and standing cafe groups along the two avenues: a spot on the pavement about a metre from a facade, found by walking from the kerb to the wall
    const facade = (x, z, nx, nz) => { let last = null; for (let d = 0; d < 16; d += 0.4) { const px = x + nx * d, pz = z + nz * d; if (nav.inBuilding(px, pz)) return last && d - last[2] < 1.3 ? [x + nx * (d - 1.15), z + nz * (d - 1.15), Math.atan2(nx, nz)] : null; if (free(px, pz, 0.35)) last = [px, pz, d]; } return null; };
    const along = (name, step, k, scene) => {
      const got = [];
      for (const r of st.roads || []) { if (r.name !== name || !r.pts) continue; let acc = step * R();
        for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, tx = (b[0] - a[0]) / l, tz = (b[1] - a[1]) / l; while (acc < l) { const sd = R() < 0.5 ? 1 : -1, q = facade(a[0] + tx * acc, a[1] + tz * acc, -tz * sd, tx * sd); if (q && nav.area.zone(q[0], q[1]) === Z.petro && !got.some((p) => dist(p[0], p[1], q[0], q[1]) < 18)) got.push([q[0], q[1], q[2], tx, tz]); acc += step * (0.6 + 0.8 * R()); } acc -= l; } }
      for (let i = got.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [got[i], got[j]] = [got[j], got[i]]; }
      for (const [x, z, yaw, tx, tz] of got.slice(0, k)) {
        if (R() < 0.55) { const list = [[x, z]]; if (free(x + tx * 0.85, z + tz * 0.85, 0.3)) list.push([x + tx * 0.85, z + tz * 0.85]); crowd(list, scene + '-window', { yaw: () => yaw, mix: LOCALS, gest: [G.LOOKAROUND, G.POINT, G.PHONE, G.TALK, G.NONE, G.WATCH], jit: 0.35, dur: [20, 160] }); }        // looking into a shop window
        else { const cx = x - Math.sin(yaw) * 0.9, cz = z - Math.cos(yaw) * 0.9, list = [0, 1, 2].slice(0, R() < 0.5 ? 2 : 3).map((i) => [cx + Math.sin(i * 2.1 + 0.4) * 0.75, cz + Math.cos(i * 2.1 + 0.4) * 0.75]).filter((p) => free(p[0], p[1], 0.3)); crowd(list, scene + '-cafe', { yaw: (px, pz) => lookAt(px, pz, cx, cz), mix: [['walk', 4], ['student', 3], ['office', 2], ['date', 1]], gest: [G.EAT, G.TALK, G.PHONE, G.TALK, G.NONE], jit: 0.3, dur: [150, 800] }); }   // coffee / ice cream at a cafe door
      }
    };
    along('Большой проспект П.С.', 45, 11, 'bolshoy'); along('Каменноостровский проспект', 55, 11, 'kamennoostrovsky');
  });
  place('tolstoy-austrian', () => {
    const hs = find(KM.photoSpots, /Дом с башнями/, { x: -2196, z: -3712 }), ht = find(KM.houses, /r2139268|башнями/, { x: -2161, z: -3719 }); ring(hs.x, hs.z, 4, 0, 9, 'tolstoy-photo', ht.x, ht.z);                          // the House with Towers
    const me = find(KM.entrances, /metro|Петроградская/, { x: -2227.8, z: -3770.7 }); ring(me.x, me.z, 7, 2.5, 11, 'petrogradskaya-wait', me.x, me.z, { mix: LOCALS, gest: [G.PHONE, G.WATCH, G.TALK, G.LOOKAROUND, G.NONE], dur: [60, 400], jit: 1.6 });
    const th = find(KM.entrances, /theatre|Миронова/, null); if (th) ring(th.x + Math.sin(th.rotY || 0) * 4, th.z + Math.cos(th.rotY || 0) * 4, 3, 0, 5, 'theatre-door', th.x, th.z, { mix: [['date', 3], ['walk', 3], ['elder', 1]], gest: GT, dur: [100, 700] });
    const au = find(KM.photoSpots, /Австрийская/, { x: -1906, z: -3064 }); ring(au.x, au.z, 4, 6, 22, 'austrian-photo', au.x, au.z, { sp: 2.5 }); { const q = spots(au.x, au.z, 1, 10, 24, { clr: 0.6 })[0]; if (q) couple(q[0], q[1], au.x, au.z, 'austrian-couple'); }
    for (const re of [/Бенуа/, /совами/]) { const p = find(KM.photoSpots, re, null); if (p) ring(p.x, p.z, 2, 0, 7, 'nouveau-photo', p.x + Math.sin((p.yaw || 0) * Math.PI / 180) * -20, p.z + Math.cos((p.yaw || 0) * Math.PI / 180) * -20); }
    ring(-2324, -2745, 5, 4, 26, 'sytny-market', -2324, -2745, { mix: [['elder', 3], ['walk', 4], ['parent', 1]], gest: GT, dur: [60, 400], jit: 1.8, sp: 2.5 });                 // Sytny market: shoppers with bags
  });

  // ============================================================================== THE WEST: PRINCE VLADIMIR CATHEDRAL, YUBILEYNY, THE STADIUM
  place('vladimir', () => {
    const pc = find(V.crowd, /vladimir-porch/, { x: -3185.3, z: -2158.5 }), cm = find(V.monuments, /w109067002|Владимирский/, { x: -3113.5, z: -2145.4 });
    ring(pc.x, pc.z, 4, 0, 9, 'vladimir-photo', cm.x, cm.z); const cd = find(V.entrances, /cathedral/, null); if (cd) queue(cd.x, cd.z, Math.sin(cd.rotY), Math.cos(cd.rotY), 3, 'vladimir-worshippers', { role: 'elder', d0: 2.6 });
    residents(Z.vladimir, 'vladimir', { pairs: 1, prams: 1, dogs: 1, joggers: 2, singles: 2, elders: 1 });                                               // the cathedral garden; joggers and a dog walker at the quiet stadium
    const yf = find(V.crowd, /yubileyny/, { x: -3278.5, z: -2047.9 }); ring(yf.x, yf.z, 6, 0, 14, 'yubileyny', yf.x, yf.z, { role: () => pick(['student', 'sport', 'student', 'walk', 'kid']), gest: GT, dur: [100, 600], jit: 1.8, sp: 1.6 });
    for (const e of (V.metroExits || []).slice(0, 3)) ring(e.x, e.z, 2, 2, 8, 'sportivnaya-wait', e.x, e.z, { mix: LOCALS, gest: [G.PHONE, G.WATCH, G.NONE, G.LOOKAROUND], dur: [60, 400], jit: 1.6 });
  });

  // ============================================================================== P6..P9: THE KARPOVKA (Ioannovsky convent, the First Lensovet House), THE MEDICAL UNIVERSITY
  place('karpovka', () => {
    const KP = sv.landmarksKarpovka || {};
    for (const c of (KP.crowd || []).slice(0, 6)) { if (!Number.isFinite(c.x) || (c.y !== undefined && Math.abs(c.y) > 0.5)) continue; ring(c.x, c.z, Math.max(2, Math.min(5, Math.round((c.n || 6) / 2))), 0, (c.r || 5) + 3, 'karpovka-sight', c.x, c.z, { mix: LOCALS.concat([['tourist', 3]]), gest: GP, jit: 1.6 }); }
    for (const p of (KP.photoSpots || []).slice(0, 4)) if (Number.isFinite(p.x) && p.y === undefined) ring(p.x, p.z, 2, 0, 6, 'karpovka-photo', p.x - Math.sin((p.yaw || 0) * Math.PI / 180) * 20, p.z - Math.cos((p.yaw || 0) * Math.PI / 180) * 20);
    ring(-2700, -4050, 7, 0, 30, 'medical-students', -2700, -4050, { role: 'student', gest: GT, dur: [100, 600], jit: 1.8, sp: 1.4 });                 // students of the Medical University on the Karpovka
  });

  // ============================================================================== ANGLERS ON THE EMBANKMENTS
  place('anglers', () => {
    // fishermen at the granite parapets of the Neva arms (a rod over the water): on a quay segment near each anchor, a metre behind the wall line, facing the water; they come in twos
    const segs = ((env.quay && env.quay.segments) || []).filter((s) => s.slope === undefined && s.key !== 'kronverk-moat' && Math.hypot(s.bx - s.ax, s.bz - s.az) > 5);
    const anchors = [[-1250, -2190, 150, 2], [-1000, -2300, 140, 2], [-2000, -2215, 220, 3], [-2519, -1795, 120, 2], [-2660, -945, 150, 2], [-3100, -1560, 200, 2], [-3500, -2300, 160, 2], [-3250, -1730, 160, 1], [-800, -2700, 110, 1],
      [-2700, -4010, 260, 2], [-2100, -3990, 260, 1], [-3350, -3980, 300, 2], [-700, -3350, 300, 2], [-4100, -3300, 350, 1], [-3900, -2900, 300, 1]];       // P6..P9: the Karpovka, the Bolshaya Nevka and the Malaya Nevka embankments
    for (const [ax, az, ar, k] of anchors) {
      const near = segs.filter((s) => dist((s.ax + s.bx) / 2, (s.az + s.bz) / 2, ax, az) < ar); let got = 0; const pts = [];
      for (let t = 0; t < 60 && got < k && near.length; t++) {
        const s = near[Math.floor(R() * near.length)], f = 0.1 + 0.8 * R(), wx = s.ax + (s.bx - s.ax) * f, wz = s.az + (s.bz - s.az) * f, x = wx + s.nx * 1.05, z = wz + s.nz * 1.05;
        if (!free(x, z, 0.3) || (env.waterAt && !env.waterAt(wx - s.nx * 2.5, wz - s.nz * 2.5)) || pts.some((p) => dist(p[0], p[1], x, z) < 3.2) || nav.area.zone(x, z) < PETRO_ZONE0) continue;
        if (skipQ()) { got++; continue; }
        const a = mk({ role: 'angler', age: R() < 0.4 ? 'elder' : undefined }, 'angler', P.P_STROLL); standNear(a, x, z, Math.atan2(-s.nx, -s.nz) + rr(-0.15, 0.15), [G.NONE, G.NONE, G.WATCH, G.LOOKAROUND], 1e6); a.standG = [G.NONE, G.NONE, G.WATCH, G.LOOKAROUND]; count('angler'); pts.push([x, z]); got++;
      }
    }
  });
  out.total = sim.agents.length - n0;
  return out;
}
