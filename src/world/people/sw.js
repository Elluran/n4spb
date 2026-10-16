// people/sw.js - the scripted life of the SOUTH-WEST extension (docs/SW-BRIEF.md; docs/research/mariinsky.md S9, yusupov.md, new-holland.md S10, nikolsky.md).  Same recipe as people/mars.js: the building blocks come from
// west.js makeHelpers, the resident walkers from mars.js (their goals stay in their own zone), the anchors are read from the services (landmarksMariinsky / Yusupov / NewHolland / Nikolsky: entrances, crowd, benches,
// photoSpots, monuments, pier, bridges) with the dossier positions as the fallback; every place is its own try / catch; everybody stands on FREE walkable spots (people/area.js vetoes the garden lawns).
//   Mariinsky:  theatre-goers waiting at the three doors (bouquets, smart summer clothes), two ticket checkers, photographers at the portico, Glinka (a tour group with a plain umbrella) and Rimsky-Korsakov, students at the
//               Conservatory door, the Mariinsky-2 terrace, canal-side strollers.
//   Yusupov:    the excursion queue under the portico, a tour group (plain umbrella), photographers in front of the Moika facade, a small group in the courtyard, garden walkers on the gravel, the mound.
//   New Holland: the lawn bowl (groups on the grass), the stage lawn, the Kovsh pier (a few on the deck, shut at night), the Frigate playground, the cafe kiosks, photographers of the Arch from the Moika quay, a tour group at the
//               Bottle, bench sitters, residents on the sett paths (pairs, a pram, a dog).  The island is shut at night (DENSITY.mars.zones 'newholland').
//   Nikolsky:   the worshippers at the west door, photographers at the porch / pylon fence / bell tower, a tour group on the avenue, bench sitters, residents.
//   Bridges:    photographers on the parapets of the Lviny and Dekabristov bridges.  Nobody carries a flag; no sounds.
import { makeHelpers } from './west.js';
import { GESTURE as G } from './contract.js';

const GP = [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.LOOKAROUND, G.POINT, G.NONE];

export function addSW(ctx, nav, sim, S, H, kit) {
  const { R, rr, count } = S, N = nav.N, P = S.P, sv = ctx.services, cfg = S.mars || { scale: 1 };
  const W = makeHelpers(ctx, nav, sim, S, H, cfg.scale ?? 1);
  const { pick, standNear, freeNear, spots, guided, parapet } = W;
  const { mk, fixed, free, lookAt, dist } = H;
  const { resident, residentPair, WANDER, qk, skipQ } = kit;
  const crowd = (list, scene, o = {}) => W.crowd(list, scene, qk < 1 && o.keep === undefined ? { ...o, keep: qk } : o);
  const couple = (...a) => { if (!skipQ()) W.couple(...a); };
  const MA = sv.landmarksMariinsky || {}, YU = sv.landmarksYusupov || {}, NH = sv.landmarksNewHolland || {}, NK = sv.landmarksNikolsky || {};
  const out = { places: {}, failed: [], ms: {} };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const place = (name, fn) => { const before = sim.agents.length, t0 = now(); try { fn(); } catch (e) { out.failed.push(name); console.error('[people] south-west vignette ' + name + ' failed:', e); } out.places[name] = sim.agents.length - before; out.ms[name] = Math.round(now() - t0); };
  const normal = (e) => [Math.sin(e.rotY || 0), Math.cos(e.rotY || 0)];                // outward normal of an entrance record
  /** a line of people from a door outwards (two abreast), facing the door */
  const queue = (e, k, scene, o = {}) => {
    const [nx, nz] = normal(e), rx = nz, rz = -nx, q = [];
    for (let i = 0; i < k * 2; i++) { const d = (o.d0 ?? 1.8) + Math.floor(i / 2) * 0.95, side = (i % 2 ? 0.55 : -0.55) + (o.lat ?? 0), x = e.x + nx * d + rx * side + rr(-0.1, 0.1), z = e.z + nz * d + rz * side + rr(-0.1, 0.1); if (free(x, z, 0.3)) q.push([x, z]); }
    return crowd(q.slice(0, k), scene, { yaw: () => Math.atan2(-nx, -nz), gest: [G.PHONE, G.NONE, G.WATCH, G.TALK, G.LOOKAROUND, G.NONE], jit: 0.2, dur: [200, 900], ...o });
  };

  // ============================================================================== MARIINSKY
  const doors = (MA.entrances || []).filter((e) => e.kind === 'main' && e.rotY !== undefined && e.x < -3040), D0 = doors[1] || doors[0] || { x: -3056.2, z: 735.7, rotY: 2 };
  place('mariinsky-doors', () => {
    for (const e of doors.length ? doors : [D0]) {                                       // theatre-goers waiting at the doors: smart clothes, flowers (role 'date' carries a bouquet)
      const [nx, nz] = normal(e); crowd(spots(e.x + nx * 3.4, e.z + nz * 3.4, 2, 0.5, 3.0, { sp: 1.1 }), 'theatre-door', { tx: e.x, tz: e.z, gest: [G.PHONE, G.WATCH, G.TALK, G.NONE, G.LOOKAROUND, G.WAVE], mix: [['date', 3], ['walk', 3], ['elder', 1.5], ['tourist', 1]], dur: [100, 700] });
    }
    for (const o of [-1.3, 1.3]) { const [nx, nz] = normal(D0), k = freeNear(D0.x + nx * 1.3 + nz * o, D0.z + nz * 1.3 - nx * o, 2.5, 0.35); if (k) { const g = mk({ role: 'staff' }, 'theatre-checker', P.P_STROLL); standNear(g, k[0], k[1], Math.atan2(nx, nz), [G.LOOKAROUND, G.NONE, G.TALK, G.NONE], 1e6); g.standG = [G.LOOKAROUND, G.NONE, G.TALK, G.NONE]; count('theatre-checker'); } }
    const [nx, nz] = normal(D0); crowd(spots(D0.x + nx * 12, D0.z + nz * 12, 3, 0, 6, { sp: 2.0, clr: 0.5 }), 'portico-photo', { tx: D0.x - nx * 2, tz: D0.z - nz * 2, gest: [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.POINT, G.NONE], dur: [40, 300] });     // photographers of the portico
  });
  place('mariinsky-monuments', () => {
    const GL = (MA.monuments || []).find((m) => m.id === 'glinka') || { x: -2970.4, z: 786.4 }, RK = (MA.monuments || []).find((m) => m.id === 'rimsky-korsakov') || { x: -3025.9, z: 661.5 };
    crowd(spots(GL.x, GL.z, 2, 3.5, 8, { sp: 2.0, clr: 0.5 }), 'glinka-photo', { tx: GL.x, tz: GL.z, gest: GP, dur: [30, 240] });
    guided(GL.x + 8, GL.z - 6, GL.x, GL.z, { n: 16, col: '#f0cf45', asian: false });       // a guide with a plain umbrella at the Glinka monument
    crowd(spots(RK.x, RK.z, 2, 3.5, 8, { sp: 2.0, clr: 0.5 }), 'rk-photo', { tx: RK.x, tz: RK.z, gest: GP, dur: [30, 240] });
  });
  place('conservatory', () => {
    const C = (MA.entrances || []).find((e) => e.name && /Консерватор.*главный/.test(e.name)) || { x: -2993.2, z: 676.8, rotY: -2.7 };       // students talk at the north door and in the gardens
    crowd(spots(C.x, C.z, 2, 2.5, 8, { sp: 1.3 }), 'conservatory-students', { role: 'student', tx: C.x, tz: C.z, gest: [G.TALK, G.PHONE, G.NONE, G.TALK, G.LOOKAROUND], dur: [100, 600], jit: 2 });
    const T = (MA.entrances || []).find((e) => e.name && /Мариинский-2/.test(e.name)) || { x: -3162, z: 745 }; crowd(spots(T.x, T.z, 1, 3, 9, { sp: 1.5 }), 'mariinsky2', { tx: T.x, tz: T.z, gest: GP });
    residentPair(3, 'walk', 'walk', 'mariinsky-pair', WANDER); resident(3, { role: 'walk' }, WANDER, 'mariinsky-single'); resident(3, { role: 'student' }, WANDER, 'mariinsky-student');       // the canal-side strollers
  });

  // ============================================================================== YUSUPOV PALACE
  const YD = (YU.entrances || [])[0] || { x: -2950, z: 326, rotY: -2.4 };
  place('yusupov-front', () => {
    queue(YD, 4, 'yusupov-queue', { mix: [['tourist', 5], ['walk', 3], ['asian', 2], ['student', 1.5], ['elder', 1]], d0: 2.2 });                  // the excursion queue under the portico
    const [nx, nz] = normal(YD);
    guided(YD.x + nx * 9 + nz * 6, YD.z + nz * 9 - nx * 6, YD.x, YD.z, { n: 16, col: '#2f6fc0', asian: true });                                        // a tour group (plain umbrella)
    crowd(spots(YD.x + nx * 13, YD.z + nz * 13, 3, 0, 8, { sp: 2.0, clr: 0.5 }), 'yusupov-photo', { tx: YD.x, tz: YD.z, gest: [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.POINT, G.NONE], dur: [40, 300] });   // photographers in front of the Moika facade
  });
  place('yusupov-court-garden', () => {
    const c = (YU.crowd || []).find((q) => q.name === 'court') || { x: -2900, z: 366 }, g = (YU.crowd || []).find((q) => q.name === 'garden') || { x: -2931, z: 442 };
    crowd(spots(c.x, c.z, 2, 2, 8, { sp: 1.5 }), 'yusupov-court', { tx: -2915, tz: 340, gest: [G.WATCH, G.PHOTO, G.POINT, G.TALK, G.NONE], dur: [100, 600] });
    resident(4, { role: R() < 0.5 ? 'elder' : 'walk' }, WANDER, 'yusupov-garden'); resident(4, { role: 'tourist' }, { ...WANDER, spot: 1.5 }, 'yusupov-garden');
    const m = YU.mound; if (m) crowd(spots(m.x, m.z, 1, 3, 9, { sp: 1.5 }), 'yusupov-mound', { tx: m.x, tz: m.z, gest: GP });
    void g;
  });

  // ============================================================================== NEW HOLLAND
  const MIX_NH = [['student', 3], ['walk', 3], ['date', 1.5], ['parent', 1.5], ['tourist', 2], ['kid', 1]];
  place('nh-lawn', () => {
    const bowl = (NH.crowd || []).find((q) => q.kind === 'lawn' && q.r > 15) || { x: -3440, z: 275 }, st = (NH.crowd || []).find((q) => q.kind === 'lawn' && q.r <= 15) || { x: -3405, z: 248 };
    for (const [cx, cz, k] of [[bowl.x, bowl.z, 3], [bowl.x - 10, bowl.z + 8, 3], [bowl.x + 12, bowl.z - 6, 3]]) {                                           // groups of friends on the lawn (the rig has no lying pose: they stand, eat, talk)
      const q = spots(cx, cz, 1, 0, 12, { clr: 0.7 })[0]; if (!q) continue;
      crowd([0, 1, 2].slice(0, k).map((i) => [q[0] + Math.sin(i * 2.1) * 1.2, q[1] + Math.cos(i * 2.1) * 1.2]).filter((p) => free(p[0], p[1], 0.35)), 'nh-lawn-group', { mix: MIX_NH, yaw: (x, z) => lookAt(x, z, q[0], q[1]), gest: [G.EAT, G.TALK, G.PHONE, G.TALK, G.NONE, G.WAVE], dur: [200, 900], jit: 0.4 });
    }
    crowd(spots(st.x, st.z, 3, 4, 14, { sp: 2.0 }), 'nh-stage-lawn', { mix: MIX_NH, tx: -3395, tz: 236, gest: [G.WATCH, G.TALK, G.PHONE, G.NONE, G.EAT], dur: [100, 600] });
  });
  const edgeD = (ring, x, z) => { let best = 1e9; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[j], b = ring[i], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); best = Math.min(best, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return best; };
  place('nh-pier', () => {
    const ring = NH.pier && NH.pier.ring; if (!ring || !nav.area.inPier) return; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const list = []; for (let t = 0; t < 400 && list.length < Math.round(5 * qk); t++) { const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0); if (nav.area.inPier(x, z) && edgeD(ring, x, z) > 0.75 && !list.some((p) => dist(p[0], p[1], x, z) < 1.6)) list.push([x, z]); }
    for (const [x, z] of list) { const a = mk({ role: pick(['student', 'walk', 'tourist', 'date']) }, 'nh-pier', P.P_STROLL); standNear(a, x, z, lookAt(x, z, -3395, 380) + rr(-1, 1), [G.WATCH, G.PHONE, G.NONE, G.TALK, G.PHOTO], 1e6, (NH.pier && typeof NH.pier.deckY === 'number') ? NH.pier.deckY : -2); a.standG = [G.WATCH, G.PHONE, G.NONE, G.TALK, G.PHOTO]; a.pier = true; count('nh-pier'); }
  });
  place('nh-playground', () => {
    const c = (NH.crowd || []).find((q) => q.kind === 'playground') || { x: -3443, z: 350 };
    crowd(spots(c.x, c.z, 4, 1.5, 8, { sp: 1.3 }), 'nh-frigate-kids', { role: 'kid', tx: c.x, tz: c.z, gest: [G.POINT, G.WAVE, G.NONE, G.TALK], dur: [100, 600] });     // kids at the wooden Frigate, parents on the edge
    crowd(spots(c.x, c.z, 2, 8, 13, { sp: 2.0 }), 'nh-frigate-parents', { role: 'parent', tx: c.x, tz: c.z, gest: [G.WATCH, G.PHONE, G.TALK, G.NONE], dur: [200, 900] });
  });
  place('nh-cafes', () => {
    const cafes = (NH.crowd || []).filter((q) => q.kind === 'cafe'); let k = 0;
    for (const c of cafes) { if (R() > 0.3) continue; crowd(spots(c.x, c.z, 1, 0.3, c.r || 2.2, { sp: 1.0, clr: 0.4 }), 'nh-cafe', { tx: c.x, tz: c.z, gest: [G.EAT, G.TALK, G.PHONE, G.EAT, G.NONE], dur: [100, 700], mix: MIX_NH }); k++; }
  });
  place('nh-arch-bottle', () => {
    const ph = (NH.photoSpots || []).find((q) => /Арка/.test(q.name || '')) || { x: -3395.7, z: 471.6 };
    crowd(spots(ph.x, ph.z, 3, 0, 9, { sp: 2.0, clr: 0.5 }), 'nh-arch-photo', { tx: -3391, tz: 456, gest: [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.POINT, G.NONE], dur: [40, 300] });   // photographers of the Arch from the Moika quay
    const b = NH.bottle || { x: -3548, z: 337.5 }; guided(b.x + 22, b.z + 25, b.x, b.z, { n: 14, col: '#d33a2a', asian: false });
    const seats = []; for (const q of nav.benches) if (q.where === 'sw' && q.x > -3665 && q.x < -3285 && q.z > 155 && q.z < 480) q.seats.forEach((s, si) => { if (s.taken < 0) seats.push([q, si]); });
    for (let i = seats.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [seats[i], seats[j]] = [seats[j], seats[i]]; }
    let ns = 0; for (const [q, si] of seats) { if (ns >= 3 || skipQ()) break; const role = pick(['student', 'walk', 'elder', 'date']); const a = mk({ role }, 'nh-sitter', role === 'elder' ? P.P_ELDER : P.P_STROLL); fixed(a); sim.sitAt(a, q, si, 0); a.until = rr(300, 1500); count('nh-sitter'); ns++; }
  });
  place('nh-residents', () => {
    residentPair(5, 'tourist', 'walk', 'nh-pair', WANDER); residentPair(5, 'student', 'student', 'nh-pair', WANDER);
    resident(5, { role: 'parent' }, WANDER, 'nh-pram'); resident(5, { role: 'dogwalker' }, WANDER, 'nh-dog'); resident(5, { role: 'student' }, WANDER, 'nh-single');
  });

  // ============================================================================== NIKOLSKY CATHEDRAL
  const NE = (NK.entrances || []).find((e) => e.kind === 'cathedral') || { x: -2885.1, z: 1114.8, rotY: -1.2 };
  place('nikolsky', () => {
    queue(NE, 2, 'nikolsky-worshippers', { role: 'elder', gest: [G.NONE, G.TALK, G.NONE, G.LOOKAROUND], d0: 2.5, dur: [300, 1200] });          // the worshippers at the west door
    const porch = (NK.crowd || []).find((q) => q.id === 'nikolsky-porch') || { x: -2896.4, z: 1119.8 }, tw = (NK.crowd || []).find((q) => q.id === 'nikolsky-tower') || { x: -2946, z: 1141 }, av = (NK.crowd || []).find((q) => q.id === 'nikolsky-avenue') || { x: -2926, z: 1131.5 };
    crowd(spots(porch.x, porch.z, 4, 2, 10, { sp: 1.6, clr: 0.5 }), 'nikolsky-photo', { tx: -2862, tz: 1105, gest: GP, dur: [40, 300] });            // photographers at the porch / the pylon fence
    crowd(spots(tw.x, tw.z, 3, 2, 8, { sp: 1.8, clr: 0.5 }), 'nikolsky-tower', { tx: -2958, tz: 1147, gest: [G.PHOTO, G.PHOTO, G.POINT, G.PHONE, G.NONE], dur: [40, 300] });
    guided(av.x - 4, av.z + 5, -2900, 1118, { n: 16, col: '#2f9f6a', asian: false });                                                                // a tour group with a plain umbrella on the avenue
    const gate = (NK.crowd || []).find((q) => q.id === 'nikolsky-north-gate') || { x: -2877.6, z: 1068 }; crowd(spots(gate.x, gate.z, 2, 1.5, 6, { sp: 1.5 }), 'nikolsky-gate', { tx: -2862, tz: 1090, gest: GP });
    const seats = []; for (const q of nav.benches) if (q.where === 'sw' && Math.hypot(q.x + 2900, q.z - 1100) < 200) q.seats.forEach((s, si) => { if (s.taken < 0) seats.push([q, si]); });
    for (let i = seats.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [seats[i], seats[j]] = [seats[j], seats[i]]; }
    let ns = 0; for (const [q, si] of seats) { if (ns >= 3 || skipQ()) break; const role = pick(['elder', 'walk', 'student']); const a = mk({ role }, 'nikolsky-sitter', role === 'elder' ? P.P_ELDER : P.P_STROLL); fixed(a); sim.sitAt(a, q, si, 0); a.until = rr(300, 1500); count('nikolsky-sitter'); ns++; }
    resident(6, { role: 'walk' }, WANDER, 'nikolsky-single'); resident(6, { role: 'tourist' }, { ...WANDER, spot: 1.5 }, 'nikolsky-single');
  });

  // ============================================================================== BRIDGES
  place('sw-bridges', () => {
    parapet('lviny', -1, 2, 'lviny-bridge', { u0: -3, u1: 3, sp: 1.2, band: 0.6, inset: 0.4 });          // the four lions: photographers
    parapet('dekabristov', -1, 2, 'dekabristov-bridge', { u0: -6, u1: 6, sp: 1.6, band: 1.2, inset: 1.0 }); parapet('dekabristov', 1, 1, 'dekabristov-bridge', { u0: -6, u1: 6, sp: 1.6, band: 1.2, inset: 1.0 });
  });
  return out;
}
