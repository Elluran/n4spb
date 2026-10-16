// people/mars.js - the scripted life of the MARS FIELD, the SUMMER GARDEN and the ENGINEERING CASTLE (docs/research/mars-field.md S12, summer-garden.md S10 + the CRITIC LOG, MARS-BRIEF.md).  Precedent: people/west.js;
// the building blocks (crowds at spots, couples, guided groups with a plain umbrella, shows, weddings, bridge parapets) come from west.js makeHelpers; the surfaces / zone caps from area.js + people.js DENSITY.mars.
// Anchors are read from the services (landmarksMars: memorial, crowd, benches, photoSpots; landmarksGarden: entrances, crowd, statues, fountains, fences; landmarksCastle: crowd, court, monument) with the dossier
// positions as the fallback; every place is wrapped in its own try / catch, and everybody is placed only on FREE walkable spots (nav.walkable, obstacle distance, off the asphalt; the Summer Garden lawns are vetoed
// by area.js: people stand on the gravel, there are NO benches in the garden: they walk and photograph).  Nobody carries a flag (guides: a plain coloured umbrella); no sounds; no weapons.
//   Mars Field:   the Eternal Flame (a steady stream of tourists + photographers round the platform, readers at the inscription slabs, one laying flowers, a wedding photo session, a tour group, a selfie trio),
//                 strollers / prams / dog walkers / joggers on the alleys (resident walkers), pensioners on the white benches, students on the lawn, Suvorov Square photographers, the Marble Palace fence.
//   Embankment:   the Trinity Bridge approach (photographers of the Peter and Paul spire), the Upper Swan Bridge parapets.
//   Summer Garden: the central gate (queue at the security booth, two guards in dark uniform, photographers at the gold-and-black gate and the pink columns, a tour group, a wedding on the embankment), the small
//                 gates, the main alley (strollers, prams, couples, a school group), the statues (admirers), the fountains, Krylov (kids round the pedestal), Coffee / Tea House, the Summer Palace, the ponds.
//   Castle:       the Peter I monument (busker with listeners, photographers, couples on the benches), the south portal (tour group, a school excursion), the court (a small excursion at the Paul I statue).
import { makeSpec } from './chars.js';
import { GESTURE as G } from './contract.js';
import { makeHelpers } from './west.js';
import { SITES, toWorld } from '../bridges/sites.js';

const TAU = Math.PI * 2;
const GP = [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.LOOKAROUND, G.POINT, G.NONE];

export function addMars(ctx, nav, sim, S, H) {
  const { R, rr, count } = S, N = nav.N, P = S.P, sv = ctx.services, cfg = S.mars || { scale: 1 };
  const W = makeHelpers(ctx, nav, sim, S, H, cfg.scale ?? 1);
  const { pick, standNear, freeNear, spots, guided, show, parapet } = W;
  // quality tiers (people.js: 1 / 0.7 / 0.45): the scripted places keep that share of their people (the couples, weddings and residents are skipped as a whole)
  const qk = S.qf ?? 1, skipQ = () => qk < 1 && R() > qk;
  const crowd = (list, scene, o = {}) => W.crowd(list, scene, qk < 1 && o.keep === undefined ? { ...o, keep: qk } : o);
  const couple = (...a) => { if (!skipQ()) W.couple(...a); };
  const wedding = (...a) => { if (qk > 0.5 || R() < 0.5) W.wedding(...a); };
  const { mk, fixed, free, lookAt, dist } = H;
  const A = nav.area, M = sv.landmarksMars || {}, GD = sv.landmarksGarden || {}, CS = sv.landmarksCastle || {};
  const out = { places: {}, failed: [], ms: {} };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const place = (name, fn) => { const before = sim.agents.length, t0 = now(); try { fn(); } catch (e) { out.failed.push(name); console.error('[people] mars vignette ' + name + ' failed:', e); } out.places[name] = sim.agents.length - before; out.ms[name] = Math.round(now() - t0); };
  const NZONE = Math.max(8, ((nav.marsCfg && nav.marsCfg.zones) || []).length), walkerNodes = Array.from({ length: NZONE }, () => []);          // lattice / footway nodes of the zones (resident walkers start there); the pavement chains of the long bridges count too
  for (let i = 0; i < N.x.length; i++) { const k = N.k[i]; if ((k === 'a' || k === 'p' || (k === 'k' && nav.longK && nav.longK.has(i))) && nav.mainOK(i)) { const z = A.zone(N.x[i], N.z[i]); if (z >= 0 && z < NZONE) walkerNodes[z].push(i); } }
  const WANDER = { wander: 10, door: 0, bench: 0.15, stop: 0, spot: 0.6, metro: 0 }, JOG = { wander: 10, door: 0, bench: 0, stop: 0, spot: 0, metro: 0 }, TOURIST = P.P_TOURIST;
  /** a resident walker: lives in its zone (not re-placed round the camera), wanders over the zone weights */
  const resident = (zone, opts, prefs, scene, tweak = null) => {
    const ids = walkerNodes[zone]; if (!ids.length || skipQ()) return null;
    const spec = makeSpec(R, opts); if (tweak) tweak(spec);
    const a = sim.spawn(spec, { prefs, scene }); fixed(a); a.home = zone; a.script = homeScript; sim.placeAtNode(a, ids[Math.floor(R() * ids.length)], 0.8); count(scene); return a;
  };
  /** the goals of a resident: a place of its own zone 25-220 m away (weighted by the zone field), never out of the zone; at night (retire) the ordinary goals take over (the garden is shut, the others go home) */
  function homeScript(a, t) {
    if (a.retire) { a.script = null; a.home = -1; sim.newGoal(a, t); return; }
    const ids = walkerNodes[a.home]; let best = -1, bw = -1;
    for (let k = 0; k < 10 && ids.length; k++) {
      const id = ids[Math.floor(R() * ids.length)]; if (nav.comp[id] !== a.comp) continue;
      const d = dist(N.x[id], N.z[id], a.x, a.z); if (d < 25 || d > 220) continue;
      const w = nav.zoneW(N.x[id], N.z[id]) * (0.4 + R()); if (w > bw) { bw = w; best = id; }
    }
    if (best >= 0 && sim.routeTo(a, best)) { a.goal = { type: 'wander', node: best }; a.kind = 'walk'; }
    else { a.kind = 'stand'; a.until = t + 3 + R() * 6; a.standG = [G.NONE, G.LOOKAROUND, G.WATCH]; a.goal = null; }
  }
  /** residents in pairs (the follower walks beside the leader) */
  const residentPair = (zone, roleA, roleB, scene, prefs = WANDER) => {
    const a = resident(zone, { role: roleA }, prefs, scene); if (!a) return;
    const kid = roleB === 'kid', b = sim.spawn(makeSpec(R, { role: roleB, fem: kid ? undefined : R() < 0.55 ? !a.spec.fem : a.spec.fem }), { prefs, scene }); fixed(b);
    b.vpref = Math.min(b.vpref, a.vpref * (kid ? 1.15 : 1)); if (!kid) a.vpref = b.vpref; sim.follow(b, a, (R() < 0.5 ? 1 : -1) * (kid ? 0.7 : 0.8), 0.2);
    sim.place(b, a.x + Math.cos(a.yaw) * 0.8, a.z - Math.sin(a.yaw) * 0.8, a.yaw, a.y); b.comp = a.comp; count(scene);
  };
  
  // ============================================================================== MARS FIELD
  const FL = (M.memorial && M.memorial.flame) || { x: -1086.2, z: -1242.5 };
  place('flame', () => {
    // the ring of the memorial: the OSM crowd spots of the module (flame ring + slab spots) are the anchors; the photographers face the flame, the readers face the inscription slabs
    const ringSpots = (M.crowd || []).filter((c) => c.kind === 'flame'), slabSpots = (M.crowd || []).filter((c) => c.kind === 'slab');
    const ringList = ringSpots.length ? ringSpots.map((c) => [c.x + rr(-0.5, 0.5), c.z + rr(-0.5, 0.5)]) : spots(FL.x, FL.z, 10, 7.5, 10.5);
    crowd(ringList.filter((p) => free(p[0], p[1], 0.4)).sort(() => R() - 0.5).slice(0, 7), 'flame-ring', { tx: FL.x, tz: FL.z, gest: [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.PHOTO, G.POINT, G.NONE], jit: 0.35, dur: [60, 400], mix: [['tourist', 6], ['asian', 2], ['walk', 3], ['student', 1.5], ['elder', 1]] });
    for (const s of (slabSpots.length ? slabSpots : []).slice(0, 4)) if (R() < 0.8) { const k = freeNear(s.x, s.z, 3, 0.4); if (k) crowd([k], 'flame-slab', { tx: s.x + (s.x - FL.x) * 0.15, tz: s.z + (s.z - FL.z) * 0.15, gest: [G.LOOKAROUND, G.NONE, G.WATCH, G.NONE, G.PHONE], role: () => pick(['elder', 'walk', 'tourist', 'student']), dur: [40, 300] }); }
    // one lays flowers (a bouquet; a quiet pose at the rim of the platform) with a companion
    const fl = freeNear(FL.x + 7.5, FL.z + 3, 5, 0.4); if (fl) { const a = mk({ role: 'date' }, 'flame-flowers', TOURIST); standNear(a, fl[0], fl[1], lookAt(fl[0], fl[1], FL.x, FL.z), [G.NONE, G.NONE, G.POSE], rr(200, 700)); count('flame-flowers'); const b = freeNear(fl[0] + 0.9, fl[1] + 0.5, 3, 0.35); if (b) crowd([b], 'flame-flowers', { role: 'elder', tx: FL.x, tz: FL.z, gest: [G.NONE, G.LOOKAROUND] }); }
    wedding(FL.x, FL.z, 'flame', 14, 24);                                              // the wedding party on the plaza (the dossier: a wedding photo session at the memorial)
    guided(FL.x - 15, FL.z + 11, FL.x, FL.z, { n: 13, col: '#2f6fc0', asian: false });  // a tour group with a plain umbrella
    const q = spots(FL.x, FL.z, 1, 12, 22, { clr: 0.7 })[0]; if (q) { const sp = [0, 1, 2].map((k) => [q[0] + Math.sin(k * 2.1) * 0.9, q[1] + Math.cos(k * 2.1) * 0.9]).filter((p) => free(p[0], p[1], 0.3)); crowd(sp, 'flame-selfie', { role: () => pick(['student', 'tourist', 'asian']), yaw: (x, z) => lookAt(x, z, q[0], q[1]), gest: [G.SELFIE, G.POSE, G.WAVE, G.POSE] }); }
  });
  place('field-alleys', () => {
    // the dossier: strollers in pairs, families with prams, dog walkers, joggers on the long alleys, pensioners on the white benches, students on the lawn; vendors with carts are the props module's kiosks
    for (let i = 0; i < 3; i++) residentPair(0, i % 2 ? 'tourist' : 'walk', 'walk', 'field-pair');
    residentPair(0, 'walk', 'kid', 'field-family');
    resident(0, { role: 'parent' }, WANDER, 'field-pram');
    for (let i = 0; i < 2; i++) resident(0, { role: 'dogwalker' }, WANDER, 'field-dog');
    for (let i = 0; i < 3; i++) resident(0, { role: 'sport' }, JOG, 'field-jogger', (sp) => { sp.speed = 2.3 + R() * 0.7; });
    for (let i = 0; i < 2; i++) resident(0, { role: 'walk' }, WANDER, 'field-single');
    // pensioners and couples on the white benches round the plaza (the dossier: 4 on the benches in a frame): a third of the seats within 70 m of the memorial
    const seats = []; for (const b of nav.benches) if (b.where === 'street' && dist(b.x, b.z, FL.x, FL.z) < 80) b.seats.forEach((s, si) => { if (s.taken < 0) seats.push([b, si]); });
    for (let i = seats.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [seats[i], seats[j]] = [seats[j], seats[i]]; }
    let ns = 0; for (const [b, si] of seats) { if (ns >= 5) break; if (b.seats[si].taken >= 0) continue; const role = R() < 0.4 ? 'elder' : R() < 0.5 ? 'walk' : 'tourist'; const a = mk({ role }, 'field-sitter', role === 'elder' ? P.P_ELDER : P.P_STROLL); fixed(a); sim.sitAt(a, b, si, 0); a.until = rr(300, 1500); count('field-sitter'); ns++; }
    // students / young people on the grass with picnic bags: standing groups of 3 on the lawn between the alleys (eating, talking)
    for (const c of [[-1135, -1330], [-1010, -1205]]) { const q = spots(c[0], c[1], 1, 4, 30, { clr: 0.7 })[0]; if (!q) continue; const sp = [0, 1, 2].map((k) => [q[0] + Math.sin(k * 2.1) * 1.1, q[1] + Math.cos(k * 2.1) * 1.1]).filter((p) => free(p[0], p[1], 0.35)); crowd(sp, 'field-lawn', { role: () => pick(['student', 'student', 'walk']), yaw: (x, z) => lookAt(x, z, q[0], q[1]), gest: [G.EAT, G.TALK, G.PHONE, G.TALK, G.NONE], dur: [200, 900], jit: 0.4 }); }
  });
  place('suvorov-square', () => {
    const SV = (M.suvorov && M.suvorov.x !== undefined) ? M.suvorov : { x: -1196.7, z: -1501.9 };
    // photographers of the monument stand on the pavements round the roundabout (the island is surrounded by carriageways), facing it
    crowd(spots(SV.x, SV.z, 6, 16, 34, { sp: 2.4, clr: 0.5 }), 'suvorov-photo', { tx: SV.x, tz: SV.z, gest: [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.POINT, G.NONE], dur: [30, 240], mix: [['tourist', 6], ['asian', 2], ['walk', 2], ['student', 1]] });
    const q = spots(SV.x, SV.z, 1, 20, 34, { clr: 0.6 })[0]; if (q) couple(q[0], q[1], SV.x, SV.z, 'suvorov-couple');
  });
  place('marble-palace', () => {
    const AL = { x: -1332.4, z: -1444.6 };                                             // the Alexander III monument behind the forecourt fence
    crowd(spots(AL.x, AL.z, 5, 9, 20, { sp: 2.2, clr: 0.5 }), 'marble-fence', { tx: AL.x, tz: AL.z, gest: [G.PHOTO, G.PHONE, G.POINT, G.WATCH, G.NONE], dur: [30, 240] });
    const q = spots(AL.x, AL.z, 1, 12, 24, { clr: 0.6 })[0]; if (q) couple(q[0], q[1], AL.x, AL.z, 'marble-couple', { roleA: 'date', roleB: 'walk' });
  });
  place('trinity-approach', () => {
    // the Trinity Bridge: the first span rises from (-1217, -1567); the photographers shoot the Peter and Paul spire down the axis (bearing to (-1434, -2077))
    const bx = -1217.4, bz = -1567.2, ax = -1433.9 - bx, az = -2076.9 - bz, al = Math.hypot(ax, az) || 1;
    crowd(spots(bx - ax / al * 4, bz - az / al * 4, 6, 3, 14, { sp: 1.8, clr: 0.5 }), 'trinity-photo', { tx: bx + ax / al * 120, tz: bz + az / al * 120, gest: [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.POINT, G.WATCH], dur: [40, 300] });
    const q = spots(bx, bz, 1, 6, 16, { clr: 0.6 })[0]; if (q) couple(q[0], q[1], bx + ax / al * 100, bz + az / al * 100, 'trinity-couple', { roleA: 'date', roleB: 'walk' });
  });
  place('swan-bridge', () => {
    parapet('swan-upper', -1, 4, 'swan-bridge', { u0: -5, u1: 5, sp: 1.0, band: 1.0, inset: 0.7 }); parapet('swan-upper', 1, 3, 'swan-bridge', { u0: -5, u1: 5, sp: 1.1, band: 1.0, inset: 0.7 });
    const s = SITES.find((q) => q.id === 'swan-upper');
    if (s) { const a = toWorld(s, -14, -9.5), q = freeNear(a.x, a.z, 8, 0.5); if (q) couple(q[0], q[1], s.cx, s.cz, 'swan-couple'); }
  });

  // ============================================================================== SUMMER GARDEN
  const EN = (GD.entrances || []).reduce((m, e) => (m[e.id] = e, m), {});
  const CG = EN['neva-central'] || { x: -967.6, z: -1639.2, rotY: 3.565 };
  const fx = Math.sin(CG.rotY), fz = Math.cos(CG.rotY), rx = Math.cos(CG.rotY), rz = -Math.sin(CG.rotY);         // outward normal (towards the embankment) and the gate axis
  place('garden-gate', () => {
    // the queue at the security booth: two abreast, from the turnstiles outwards on the embankment pavement, facing the gate; the booth staff in dark uniform
    const q = []; for (let i = 0; i < 6; i++) for (const s of [-0.55, 0.55]) { const d = 1.8 + i * 0.95, x = CG.x + fx * d + rx * (s + 1.4) + rr(-0.12, 0.12), z = CG.z + fz * d + rz * (s + 1.4) + rr(-0.12, 0.12); if (free(x, z, 0.3)) q.push([x, z]); }
    crowd(q.slice(0, 11), 'garden-queue', { yaw: () => Math.atan2(-fx, -fz), gest: [G.PHONE, G.NONE, G.WATCH, G.TALK, G.LOOKAROUND, G.NONE], jit: 0.2, dur: [200, 900], mix: [['tourist', 5], ['walk', 4], ['student', 1.5], ['parent', 1], ['elder', 1]] });
    for (const [o, who] of [[-2.6, 'staff'], [2.9, 'staff']]) { const k = freeNear(CG.x - fx * 1.2 + rx * o, CG.z - fz * 1.2 + rz * o, 3, 0.4); if (k) { const g = mk({ role: who }, 'garden-guard', P.P_STROLL); standNear(g, k[0], k[1], Math.atan2(fx, fz), [G.LOOKAROUND, G.NONE, G.TALK, G.NONE], 1e6); g.standG = [G.LOOKAROUND, G.NONE, G.TALK, G.NONE]; count('garden-guard'); } }
    // photographers and posers at the gold-and-black gate and the pink granite columns (from the fence points of the module)
    const nf = (GD.fences || []).find((f) => f.id === 'neva-fence');
    if (nf) {
      const cols = nf.pts, seen = [];
      for (let k = 0; k < 5; k++) {
        const i = 2 + Math.floor(R() * (cols.length - 4)), a = cols[i], b = cols[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = dz / l, nz = -dx / l, d = 3.2 + R() * 2.2;
        const x = a[0] + nx * d + dx * 0.4, z = a[1] + nz * d + dz * 0.4; if (!free(x, z, 0.4) || seen.some((p) => dist(p[0], p[1], x, z) < 6)) continue; seen.push([x, z]);
        if (k % 2 === 0) couple(x, z, a[0] - nx * 2, a[1] - nz * 2, 'garden-fence-couple', { gA: [G.PHOTO, G.PHOTO, G.SELFIE], gB: [G.POSE, G.WAVE, G.POSE, G.NONE] });
        else crowd([[x, z]], 'garden-fence-single', { tx: a[0], tz: a[1], gest: [G.PHOTO, G.PHOTO, G.PHONE, G.POINT] });
      }
    }
    guided(CG.x + fx * 7 + rx * 6, CG.z + fz * 7 + rz * 6, CG.x, CG.z, { n: 13, col: '#d33a2a', asian: true });       // a tour group with a plain umbrella in front of the gate
    wedding(CG.x + fx * 6 - rx * 28, CG.z + fz * 6 - rz * 28, 'garden-emb', 0, 10);                                   // a wedding party on the embankment, 
    for (const id of ['neva-west', 'neva-east']) { const e = EN[id]; if (e) crowd(spots(e.x + Math.sin(e.rotY) * 2.5, e.z + Math.cos(e.rotY) * 2.5, 2, 0.8, 4.5, { sp: 1.2 }), 'garden-small-gate', { tx: e.x, tz: e.z, gest: [G.PHONE, G.WATCH, G.TALK, G.NONE, G.LOOKAROUND], role: () => pick(['tourist', 'walk', 'student']) }); }
  });
  place('garden-alleys', () => {
    // strollers on the alleys (the Main alley: a person every ~4 m on a summer afternoon): couples, mothers with prams (very common), schoolchildren with backpacks, no cyclists / joggers on the Main alley
    for (let i = 0; i < 4; i++) residentPair(1, i % 2 ? 'tourist' : 'walk', 'walk', 'garden-pair', WANDER);
    residentPair(1, 'parent', 'walk', 'garden-pram', WANDER); residentPair(1, 'walk', 'kid', 'garden-family', WANDER);
    for (let i = 0; i < 2; i++) resident(1, { role: 'parent' }, WANDER, 'garden-pram');
    for (let i = 0; i < 3; i++) resident(1, { role: R() < 0.5 ? 'tourist' : 'walk' }, { ...WANDER, spot: 1.5 }, 'garden-single');
    resident(1, { role: 'elder' }, WANDER, 'garden-elder'); resident(1, { role: 'student' }, WANDER, 'garden-student');
    // a school group with backpacks and a teacher (an umbrella) crossing the garden
    const ids = walkerNodes[1]; if (ids.length) {
      const lead = sim.spawn(makeSpec(R, { role: 'guide', guideCol: '#e8892b' }), { prefs: P.P_TOUR, scene: 'garden-school' }); fixed(lead); lead.vpref = 0.95; lead.home = 1; lead.script = homeScript; sim.placeAtNode(lead, ids[Math.floor(R() * ids.length)], 0.6); count('garden-school');
      for (let j = 0; j < 6; j++) { const row = Math.floor(j / 2), b = sim.spawn(makeSpec(R, { role: 'kid' }), { prefs: P.P_TOUR, scene: 'garden-school' }); fixed(b); b.vpref = lead.vpref * 1.04; sim.follow(b, lead, (j % 2 ? 1 : -1) * 0.62, 0.9 + 0.75 * row); b.delay = Math.round((1.2 + 0.8 * row) / (lead.vpref * 0.1)); sim.place(b, lead.x, lead.z, lead.yaw, lead.y); b.comp = lead.comp; count('garden-school'); }
    }
  });
  place('garden-statues', () => {
    // admirers of the white marble statues (they photograph and read, never touch): a few statues chosen along the alleys, 1-2 people each at 2.4-3.8 m
    const st = (GD.statues || []).filter((s) => s.x !== undefined && s.type !== 'bust'); const picked = [];
    for (let k = 0; k < 10 && st.length; k++) {
      const s = st[Math.floor(R() * st.length)]; if (picked.some((p) => dist(p.x, p.z, s.x, s.z) < 25)) continue; picked.push(s);
      const q = spots(s.x, s.z, R() < 0.5 ? 2 : 1, 2.4, 4.0, { sp: 1.2, clr: 0.45 }); crowd(q, 'garden-statue', { tx: s.x, tz: s.z, gest: [G.PHOTO, G.LOOKAROUND, G.POINT, G.WATCH, G.NONE, G.PHONE], dur: [30, 220], role: () => pick(['tourist', 'walk', 'elder', 'student', 'tourist']) });
    }
  });
  place('garden-fountains', () => {
    for (const f of (GD.fountains || []).slice(0, 6)) { const r = (f.r || 4) + 1.2; crowd(spots(f.x, f.z, 2, r, r + 5, { sp: 1.3 }), 'garden-fountain', { tx: f.x, tz: f.z, gest: [G.PHOTO, G.WATCH, G.PHONE, G.SELFIE, G.NONE, G.TALK], dur: [60, 400] }); }
  });
  place('krylov', () => {
    const K = (GD.monuments || []).find((m) => /Крылов/.test(m.name || '')) || { x: -909, z: -1537 };
    crowd(spots(K.x, K.z, 2, 3.4, 6.5, { sp: 1.3 }), 'krylov-kids', { role: 'kid', tx: K.x, tz: K.z, gest: [G.POINT, G.NONE, G.WAVE, G.TALK], dur: [80, 400] });         // the kids round the pedestal (the fables: animals)
    crowd(spots(K.x, K.z, 3, 3.6, 8.5, { sp: 1.4 }), 'krylov-photo', { tx: K.x, tz: K.z, gest: GP, dur: [40, 260] });
  });
  place('garden-cafes', () => {
    // Coffee House / Tea House: people with cups and ice-cream, standing (there are no chairs in the module): talking, eating
    for (const c of (GD.crowd || []).filter((q) => q.kind === 'cafe')) crowd(spots(c.x, c.z, 3, 1.0, c.r || 5, { sp: 1.1 }), 'garden-cafe', { tx: c.x, tz: c.z, gest: [G.EAT, G.TALK, G.PHONE, G.NONE, G.EAT, G.WATCH], dur: [100, 600], jit: 2, mix: [['walk', 3], ['tourist', 3], ['student', 2], ['elder', 1], ['parent', 1]] });
  });
  place('garden-palace', () => {
    const p = GD.palace || { x: -849.3, z: -1650.1 };
    crowd(spots(p.x, p.z, 5, 7, 16, { sp: 1.7, clr: 0.5 }), 'garden-palace', { tx: p.x, tz: p.z, gest: [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.POINT, G.NONE], dur: [40, 300] });
    const q = spots(p.x, p.z, 1, 9, 18, { clr: 0.5 })[0]; if (q) couple(q[0], q[1], p.x, p.z, 'palace-couple');
  });
  place('garden-ponds', () => {
    for (const pd of (GD.ponds || [])) crowd(spots(pd.x, pd.z, /Менажер|4162600/.test((pd.name || '') + pd.id) ? 3 : 2, 6, 24, { sp: 1.4, ok: (x, z) => !(nav.blocked && nav.blocked(x, z)) }), 'garden-pond', { tx: pd.x, tz: pd.z, gest: [G.WATCH, G.POINT, G.PHOTO, G.PHONE, G.NONE], dur: [60, 400], role: () => pick(['parent', 'kid', 'walk', 'tourist', 'elder']) });
  });

  // ============================================================================== ENGINEERING CASTLE
  const PETER = (CS.monument && CS.monument.x !== undefined) ? CS.monument : { x: -712, z: -757 };
  const PORTAL = (CS.entrances && CS.entrances[0]) || { x: -739.4, z: -833.8 };
  place('castle-peter', () => {
    show(PETER.x, PETER.z + 18, 'castle-busker', { role: 'busker', gest: G.PLAY, k: 8, r: 26 });                       // the dossier: buskers at the Peter monument
    crowd(spots(PETER.x, PETER.z, 5, 9, 18, { sp: 2.2, clr: 0.5 }), 'castle-peter-photo', { tx: PETER.x, tz: PETER.z, gest: [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.POINT, G.NONE], dur: [40, 300] });
    for (let i = 0; i < 2; i++) { const q = spots(PETER.x, PETER.z, 1, 10, 24, { clr: 0.5 })[0]; if (q) couple(q[0], q[1], PETER.x, PETER.z, 'castle-couple'); }
    const seats = []; for (const b of nav.benches) if (b.where === 'street' && dist(b.x, b.z, PETER.x, PETER.z) < 50) b.seats.forEach((s, si) => { if (s.taken < 0) seats.push([b, si]); });
    for (let i = seats.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [seats[i], seats[j]] = [seats[j], seats[i]]; }
    let k = 0; for (const [b, si] of seats) { if (k >= 3) break; const role = R() < 0.4 ? 'elder' : 'walk'; const a = mk({ role }, 'castle-sitter', role === 'elder' ? P.P_ELDER : P.P_STROLL); fixed(a); sim.sitAt(a, b, si, 0); a.until = rr(300, 1500); count('castle-sitter'); k++; }
  });
  place('castle-portal', () => {
    guided(PORTAL.x + 3, PORTAL.z + 14, PORTAL.x, PORTAL.z - 8, { n: 12, col: '#f0cf45', asian: false });               // a tour group at the south portal (a plain umbrella)
    // a school excursion: a teacher with an umbrella and eight kids in a column
    const k0 = freeNear(PORTAL.x - 6, PORTAL.z + 17, 8, 0.7); if (k0) {
      const lead = mk({ role: 'guide', guideCol: '#2f9f6a' }, 'castle-school', P.P_TOUR); lead.vpref = 0.95;
      sim.standAt(lead, k0[0], k0[1], lookAt(k0[0], k0[1], PORTAL.x, PORTAL.z) + Math.PI, [G.GUIDE], rr(90, 220), null, 0, 0.12); lead.goal = null; fixed(lead); count('castle-school');
      for (let j = 0; j < 5; j++) { const row = Math.floor(j / 2), b = sim.spawn(makeSpec(R, { role: 'kid' }), { prefs: P.P_TOUR, scene: 'castle-school' }); sim.follow(b, lead, (j % 2 ? 1 : -1) * 0.62, 0.9 + 0.75 * row); b.delay = Math.round((1.2 + 0.8 * row) / (lead.vpref * 0.1)); b.arc = { ang: (j - 3) * 0.3, rad: 2.2 + 0.5 * row };
        const ang = lead.yaw + Math.PI + b.arc.ang, px = lead.x + Math.sin(ang) * b.arc.rad, pz = lead.z + Math.cos(ang) * b.arc.rad, ok = free(px, pz, 0.3); sim.place(b, ok ? px : lead.x, ok ? pz : lead.z, lookAt(px, pz, lead.x, lead.z), 0.12); b.kind = 'stand'; b.comp = lead.comp; count('castle-school'); }
    }
    crowd(spots(PORTAL.x, PORTAL.z + 12, 2, 3, 12, { sp: 1.6, clr: 0.5 }), 'castle-portal-photo', { tx: PORTAL.x, tz: PORTAL.z - 6, gest: GP, dur: [40, 300] });
  });
  place('castle-court', () => {
    // the inner court (museum visitors): a small excursion round the Paul I statue
    const c = CS.court; if (!c || !c.statue) return;
    crowd(spots(c.statue.x, c.statue.z, 5, 3.2, 8, { sp: 1.5, clr: 0.5 }), 'castle-court', { tx: c.statue.x, tz: c.statue.z, gest: [G.WATCH, G.PHOTO, G.POINT, G.TALK, G.NONE], dur: [100, 600] });
  });
  out.kit = { resident, residentPair, homeScript, walkerNodes, WANDER, JOG, TOURIST, qk, skipQ };             // shared with people/sw.js
  return out;
}
