// people/west.js - the scripted life of the WEST (docs/research/west-life-furniture.md section 2: the tourist centre between Gostiny Dvor and the Admiralty).  Everything here is anchored on the
// positions the landmark modules publish (services.landmarksE / F / G / H / J, props.kiosks, metro entrances, environment.quay.allStairs, bridges/sites.js frames) with the dossier's spot table
// (S1-S20) as the fallback; every place is a function that places only on FREE walkable spots (nav.walkable, obstacle distance, off the asphalt: the steps, stylobates, plinths and fountain rims
// are obstacles / keep-outs of the nav), and each is wrapped in its own try / catch so one missing service never breaks the others.
//   Kazan:       the fountain ring (kids at the rim, couples, photographers of the cathedral), guided groups at the Kutuzov / Barclay plinths, the colonnade forecourt, the crowd anchors, the Singer House
//                kerb, the Kazan Bridge parapets (~26 per 10 m: the densest crowd of the area), the boat-landing queue, the caricaturists on the Griboedov embankment, the Green Bridge parapets.
//   Palace Sq.:  the Alexander Column ring, three guided groups (a plain umbrella, NO flag), selfie groups, the field scatter, the General Staff arch (guitar busker with listeners, costume characters),
//                the Winter Palace front, portrait painters (landmarksG.spots.painters), the Hermitage ticket queue in the Great Courtyard, the police pair.
//   Gardens:     Alexander Garden fountain, Admiralty garden couples, St Isaac's (the crowd anchors of landmarksJ + pigeon feeders), the Catherine garden (chess players on the benches, the artists at the
//                monument), the Horseman, wedding parties (Alexander Garden fountain, Horseman, Palace Bridge landing).
//   Streets:     Gostiny Dvor (shoppers in the arcade, the metro stairs, the excursion tout), vendors with customers at the kiosks / carts of the props module, couples at the canal descents, the cosplay group.
// Nobody carries a flag (guides: a plain coloured umbrella); no sounds.
import { makeSpec } from './chars.js';
import { GESTURE as G } from './contract.js';
import { SITES, toWorld } from '../bridges/sites.js';

const TAU = Math.PI * 2;
const GP = [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.LOOKAROUND, G.POINT, G.NONE];       // admiring a sight
const GT = [G.TALK, G.NONE, G.PHONE, G.WATCH, G.LOOKAROUND, G.NONE];                    // chatting / waiting
const GW = [G.WATCH, G.NONE, G.LOOKAROUND, G.POINT, G.PHONE];                           // looking at the water / a show

/** the building blocks of the scripted places (crowds at spots, couples, guided groups, shows, weddings, bridge parapets, descent queues); `scale` multiplies the counts that go through n() */
export function makeHelpers(ctx, nav, sim, S, H, scale = 1) {
  const { R, rr, count } = S, N = nav.N, P = S.P, sv = ctx.services;
  const n = (base) => S.n(base) * scale;
  const { mk, fixed, free, lookAt, dist, openSpot, arcPlan } = H;
  const pick = (a) => a[Math.floor(R() * a.length)];
  const standNear = (a, x, z, yaw, gest, dur, y) => { sim.standAt(a, x, z, yaw, gest, dur, null, 0, y ?? (nav.area && nav.area.y(x, z)) ?? 0.12); fixed(a); return a; };
  const freeNear = (x, z, rmax = 10, clr = 0.5) => {                     // the nearest free walkable spot around (x, z), spiralling out
    if (free(x, z, clr)) return [x, z];
    for (let r = 1; r <= rmax; r += 1) for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU + r * 0.7, px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r; if (free(px, pz, clr)) return [px, pz]; }
    return null;
  };
  const roleOf = (mix) => { let t = R() * mix.reduce((s, m) => s + m[1], 0); for (const [r, w] of mix) { t -= w; if (t <= 0) return r; } return mix[0][0]; };
  const TOUR_MIX = [['tourist', 5], ['walk', 3], ['student', 1.5], ['asian', 1.5], ['elder', 0.6], ['date', 0.5]];
  /** k free spots in an annulus r0..r1 around (cx, cz), at least `sp` m apart, passing the optional test ok(x, z) */
  const spots = (cx, cz, k, r0, r1, o = {}) => {
    const sp = o.sp ?? 0.85, list = [];
    for (let tries = 0; tries < k * 16 && list.length < k; tries++) {
      const a = R() * TAU, r = Math.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * R()), x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;
      if (!free(x, z, o.clr ?? 0.4) || (o.ok && !o.ok(x, z)) || list.some((p) => dist(p[0], p[1], x, z) < sp)) continue;
      list.push([x, z]);
    }
    return list;
  };
  /** people standing at the given spots facing (tx, tz) (or the yaw function); the scale n() applies to k when o.scale */
  const crowd = (list, scene, o = {}) => {
    const mix = o.mix || TOUR_MIX, gest = o.gest || GP, out2 = [];
    for (const [x, z] of list) {
      if (o.keep !== undefined && R() > o.keep) continue;
      const role = o.role ? (typeof o.role === 'function' ? o.role() : o.role) : roleOf(mix), a = mk({ role, fem: o.fem }, scene, role === 'tourist' || role === 'asian' ? P.P_TOURIST : P.P_STROLL);
      const yaw = (o.yaw ? o.yaw(x, z) : o.tx !== undefined ? lookAt(x, z, o.tx, o.tz) : R() * TAU) + rr(-(o.jit ?? 0.5), o.jit ?? 0.5);
      standNear(a, x, z, yaw, gest, o.dur ? rr(o.dur[0], o.dur[1]) : rr(90, 700), o.y); count(scene); out2.push(a);
    }
    return out2;
  };
  const couple = (x, z, tx, tz, scene, o = {}) => {                       // two people side by side looking at (tx, tz): one photographs the other / both pose / selfie
    const yaw = lookAt(x, z, tx, tz), sx = Math.cos(yaw) * 0.85, sz = -Math.sin(yaw) * 0.85, a = mk({ role: o.roleA || 'tourist', fem: o.femA }, scene, P.P_TOURIST), b = mk({ role: o.roleB || 'tourist', fem: o.femB === undefined ? !a.spec.fem : o.femB }, scene, P.P_TOURIST);
    standNear(a, x, z, yaw + rr(-0.3, 0.3), o.gA || GP, rr(80, 500)); const bx = x + sx, bz = z + sz;
    if (free(bx, bz, 0.35)) standNear(b, bx, bz, yaw + rr(-0.4, 0.4), o.gB || [G.POSE, G.WAVE, G.SELFIE, G.PHONE, G.NONE], rr(80, 500)); else standNear(b, x - sx, z - sz, yaw, o.gB || [G.POSE, G.NONE], rr(80, 500));
    count(scene); count(scene);
  };
  /** a guide with a plain coloured umbrella in front of a group of followers (the group arcs round the guide while it talks; afterwards the guide walks to the next sight and the group follows) */
  const guided = (x, z, tx, tz, o = {}) => {
    const sp = freeNear(x, z, 12, 0.6); if (!sp) return;
    const col = o.col || pick(['#d33a2a', '#f0cf45', '#2f6fc0', '#e8892b']), asian = o.asian ?? R() < 0.3, capCol = asian ? pick(['#d94a3a', '#2f6fc0', '#f0cf45']) : (R() < 0.5 ? col : '#f0eee8');
    const lead = mk({ role: 'guide', guideCol: col }, 'tour-w', P.P_TOUR); lead.vpref = 0.95;
    sim.standAt(lead, sp[0], sp[1], lookAt(sp[0], sp[1], tx, tz) + Math.PI, [G.GUIDE], rr(90, 220), null, 0, 0.12); lead.goal = null; fixed(lead); count('tour-w');
    const m = Math.round(n(o.n ?? 11));
    for (let j = 0; j < m; j++) {
      const row = Math.floor(j / 2), side = (j % 2 ? 1 : -1) * 0.62, b = sim.spawn(makeSpec(R, { role: asian && R() < 0.8 ? 'asian' : 'follower', cap: capCol }), { prefs: P.P_TOUR, scene: 'tour-w' });
      sim.follow(b, lead, side, 0.9 + 0.75 * row); b.delay = Math.round((1.2 + 0.8 * row) / (lead.vpref * 0.1)); b.arc = { ang: (j - (m - 1) / 2) * 0.3, rad: 2.3 + 0.5 * row };
      const ang = lead.yaw + Math.PI + b.arc.ang, px = lead.x + Math.sin(ang) * b.arc.rad, pz = lead.z + Math.cos(ang) * b.arc.rad, ok = free(px, pz, 0.3);
      sim.place(b, ok ? px : lead.x, ok ? pz : lead.z, lookAt(px, pz, lead.x, lead.z), 0.12); b.kind = 'stand'; b.comp = lead.comp; count('tour-w');
    }
  };
  /** performer + audience (a busker, a painter with a sitter and onlookers ...) around a free spot near (cx, cz) */
  const show = (cx, cz, scene, o = {}) => {
    const nd = openSpot(cx, cz, o.r ?? 20); if (nd < 0) return false; const x = N.x[nd], z = N.z[nd], plan = arcPlan(x, z, o.k ?? 8, 2.4, 4.8, 1.0);
    const a = mk({ role: o.role || 'busker' }, scene, P.P_STROLL); standNear(a, x, z, plan.yaw, [o.gest || G.PLAY], 1e6); a.standG = [o.gest || G.PLAY]; count(scene);
    plan.pos.slice(0, Math.max(3, Math.round(n(o.k ?? 8)))).forEach((p, i) => { const b = mk({ role: i % 4 === 0 ? 'elder' : i % 3 === 0 ? 'student' : 'tourist' }, scene + '-fans', P.P_STROLL); standNear(b, p[0], p[1], lookAt(p[0], p[1], x, z) + rr(-0.3, 0.3), i % 3 === 0 ? [G.PHONE, G.PHOTO, G.NONE] : [G.NONE, G.TALK, G.WATCH, G.NONE], rr(60, 400)); count(scene + '-fans'); });
    return [x, z, plan];
  };

  /** people on the parapets of a west bridge (site id): side -1 / +1 = the v0 / v1 edge, facing outward along the canal */
  const parapet = (id, side, k, scene, o = {}) => {
    const s = SITES.find((q) => q.id === id); if (!s) return;
    const v = side < 0 ? s.v0 + (o.inset ?? 0.9) : s.v1 - (o.inset ?? 0.9), list = [];
    for (let tries = 0; tries < k * 14 && list.length < k; tries++) {
      const u = (o.u0 ?? -8) + R() * ((o.u1 ?? 7) - (o.u0 ?? -8)), vv = v + (R() - 0.5) * (o.band ?? 1.4), w = toWorld(s, u, vv);
      if (!nav.deckWalk(w.x, w.z) || !free(w.x, w.z, 0.3) || list.some((p) => dist(p[0], p[1], w.x, w.z) < (o.sp ?? 0.7))) continue;
      list.push([w.x, w.z]);
    }
    const out0 = toWorld(s, 0, v + side), c0 = toWorld(s, 0, v), face = Math.atan2(out0.x - c0.x, out0.z - c0.z);
    return crowd(list, scene, { yaw: () => face, gest: o.gest || [G.WATCH, G.PHOTO, G.PHOTO, G.SELFIE, G.POINT, G.PHONE, G.NONE], jit: 0.6 });
  };
  const stairNear = (key, x, z, rmax = 60) => { let best = null, bd = rmax; for (const q of (sv.environment && sv.environment.quay && sv.environment.quay.allStairs) || []) { if (key && q.key !== key) continue; const d = dist(q.x, q.z, x, z); if (d < bd) { bd = d; best = q; } } return best; };
  /** a queue that starts at the top of a descent (x, z) and runs inland along the stair axis */
  const queueAt = (q, k, scene) => {                                  // a crowd waiting round the top landing of a descent (the flight and the landing are keep-outs: the people stand on the quay beside it)
    const list = spots(q.x, q.z, k, 2.0, 12, { sp: 0.95 }).sort((p, r) => dist(p[0], p[1], q.x, q.z) - dist(r[0], r[1], q.x, q.z));
    return crowd(list, scene, { tx: q.x, tz: q.z, gest: [G.PHONE, G.WATCH, G.NONE, G.TALK, G.LOOKAROUND], jit: 0.5, dur: [200, 900] });
  };
  /** a wedding party: bride + groom posing (the guests photograph them in a half circle) on the free spot nearest to the preferred ring around a sight */
  function wedding(cx, cz, scene, r0, r1) {
    const q = spots(cx, cz, 1, r0, r1, { clr: 0.8 })[0]; if (!q) return;
    const plan = arcPlan(q[0], q[1], 7, 3.0, 5.0, 0.9), br = mk({ role: 'bride' }, scene + '-wedding', P.P_STROLL), gr = mk({ role: 'groom' }, scene + '-wedding', P.P_STROLL);
    standNear(br, q[0], q[1], plan.yaw, [G.POSE, G.WAVE, G.POSE], 1e6); standNear(gr, q[0] + Math.cos(plan.yaw) * 0.8, q[1] - Math.sin(plan.yaw) * 0.8, plan.yaw, [G.POSE, G.NONE, G.POSE], 1e6); br.standG = [G.POSE, G.WAVE, G.POSE]; gr.standG = [G.POSE, G.NONE]; count('wedding-w'); count('wedding-w');
    plan.pos.forEach((p, i) => { const b = mk({ role: i === 0 ? 'walk' : 'guest' }, scene + '-wedding', P.P_STROLL); standNear(b, p[0], p[1], lookAt(p[0], p[1], q[0], q[1]), i === 0 ? [G.PHOTO] : [G.TALK, G.PHONE, G.WAVE, G.NONE], rr(100, 500)); b.standG = i === 0 ? [G.PHOTO] : [G.TALK, G.PHONE, G.WAVE, G.NONE]; count('wedding-w'); });
  }
  return { n, pick, standNear, freeNear, roleOf, spots, crowd, couple, guided, show, parapet, stairNear, queueAt, wedding, TOUR_MIX };
}

export function addWest(ctx, nav, sim, S, H) {
  const { R, rr, count } = S, N = nav.N, P = S.P, sv = ctx.services;
  const { mk, fixed, free, lookAt, dist, openSpot, arcPlan } = H;
  const hh = makeHelpers(ctx, nav, sim, S, H, (S.west && S.west.scale) || 1);
  const { n, pick, standNear, freeNear, roleOf, spots, crowd, couple, guided, show, parapet, stairNear, queueAt, wedding } = hh;
  const out = { places: {}, failed: [] };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  out.ms = {};
  const place = (name, fn) => { const before = sim.agents.length, t0 = now(); try { fn(); } catch (e) { out.failed.push(name); console.error('[people] west vignette ' + name + ' failed:', e); } out.places[name] = sim.agents.length - before; out.ms[name] = Math.round(now() - t0); };

  // ============================================================================== KAZAN
  const KAZ = { fountain: [-1469, -279], cathedral: [-1484, -231], kutuzov: [-1415.6, -284.9], barclay: [-1510.4, -314.6], singer: [-1422, -379] };
  place('kazan-fountain', () => {
    const [fx, fz] = KAZ.fountain, ring = spots(fx, fz, 14, 11, 19, { sp: 1.0 });
    crowd(ring.slice(0, 8), 'kazan-fountain', { tx: fx, tz: fz, gest: [G.PHOTO, G.SELFIE, G.PHONE, G.NONE, G.TALK, G.POINT] });
    crowd(ring.slice(8), 'kazan-cathedral', { tx: KAZ.cathedral[0], tz: KAZ.cathedral[1], gest: GP });
    crowd(spots(fx, fz, 3, 10.5, 16, { sp: 1.2 }), 'kazan-kids', { role: 'kid', tx: fx, tz: fz, gest: [G.SPLASH, G.POINT, G.NONE, G.WAVE] });
    for (let i = 0; i < n(3); i++) { const q = spots(fx, fz, 1, 14, 28)[0]; if (q) couple(q[0], q[1], KAZ.cathedral[0], KAZ.cathedral[1], 'kazan-couple'); }
    for (const c of (sv.landmarksF && sv.landmarksF.crowd) || []) crowd(spots(c.x, c.z, 4, 1.5, 7, { sp: 1.0 }), 'kazan-anchor', { mix: [['tourist', 4], ['walk', 3], ['elder', 1.5], ['student', 1], ['parent', 0.6]], gest: [G.EAT, G.TALK, G.PHONE, G.WATCH, G.LOOKAROUND, G.NONE], tx: fx, tz: fz, jit: 1.8 });
  });
  place('kazan-plinths', () => {
    guided(KAZ.kutuzov[0] + 5, KAZ.kutuzov[1] + 5, KAZ.kutuzov[0], KAZ.kutuzov[1], { n: 12, col: '#d33a2a' });
    guided(KAZ.barclay[0] - 5, KAZ.barclay[1] + 4, KAZ.barclay[0], KAZ.barclay[1], { n: 9, col: '#2f6fc0', asian: true });
    crowd(spots(KAZ.kutuzov[0], KAZ.kutuzov[1], 4, 6, 11), 'kazan-kutuzov', { tx: KAZ.kutuzov[0], tz: KAZ.kutuzov[1] });
    crowd(spots(KAZ.barclay[0], KAZ.barclay[1], 3, 6, 11), 'kazan-barclay', { tx: KAZ.barclay[0], tz: KAZ.barclay[1] });
  });
  place('kazan-colonnade', () => {
    crowd(spots(-1500, -235, 12, 4, 34, { sp: 1.3 }), 'kazan-colonnade', { tx: KAZ.cathedral[0] - 10, tz: KAZ.cathedral[1] + 12, gest: GP });
    for (let i = 0; i < n(3); i++) { const q = spots(-1500, -240, 1, 5, 30)[0]; if (q) couple(q[0], q[1], KAZ.cathedral[0], KAZ.cathedral[1] + 10, 'kazan-couple2'); }
  });
  place('singer-kerb', () => {
    const c = KAZ.singer, k = freeNear(-1420, -347, 6); if (!k) return;
    crowd(spots(k[0], k[1], 9, 0.5, 8, { sp: 1.0 }), 'singer', { tx: c[0], tz: c[1], gest: [G.PHOTO, G.PHOTO, G.PHONE, G.SELFIE, G.POINT, G.WATCH] });
    couple(k[0] + 3, k[1] + 1, c[0], c[1], 'singer-couple');
  });
  place('kazan-bridge', () => {
    parapet('kazansky', -1, n(36), 'kazan-bridge', { u0: -9.5, u1: 6.5, sp: 0.62, band: 2.4 });
    parapet('kazansky', +1, n(26), 'kazan-bridge', { u0: -6.5, u1: 8.5, sp: 0.62, band: 1.8 });
  });
  place('kazan-landing', () => { const q = stairNear('griboedov', -1374, -385, 50); if (q) queueAt(q, Math.round(n(7)), 'kazan-landing'); });
  place('green-bridge', () => {
    parapet('green', -1, n(6), 'green-bridge', { u0: -9, u1: 9, sp: 0.8, band: 1.6 }); parapet('green', +1, n(5), 'green-bridge', { u0: -9, u1: 9, sp: 0.8, band: 1.6 });
    const q = stairNear('moika', -1785, -425, 50); if (q) queueAt(q, Math.round(n(5)), 'green-landing');
  });
  place('griboedov-painters', () => { show(-1500, -470, 'caricature', { role: 'painter', gest: G.PAINT, k: 5, r: 30 }); });

  // ============================================================================== PALACE SQUARE
  const COL = { x: -1983, z: -738 }, ARCH = { x: -1903, z: -618 };
  place('column', () => {
    crowd(spots(COL.x, COL.z, 22, 10.5, 24, { sp: 1.2 }), 'column', { tx: COL.x, tz: COL.z - 6, gest: GP });
    for (const p of (sv.landmarksG && sv.landmarksG.spots && sv.landmarksG.spots.tourists) || []) if (R() < 0.8) couple(p.x, p.z, COL.x, COL.z, 'column-couple');
    guided(COL.x + 14, COL.z + 12, COL.x, COL.z, { n: 13, col: '#f0cf45', asian: true });
    guided(COL.x - 16, COL.z - 6, COL.x, COL.z, { n: 11, col: '#d33a2a', asian: false });
    for (let i = 0; i < n(3); i++) { const q = spots(COL.x, COL.z, 1, 14, 40)[0]; if (q) { const sp = [0, 1, 2, 3].map((k) => [q[0] + Math.sin(k * 1.6) * 0.9, q[1] + Math.cos(k * 1.6) * 0.9]).filter((p) => free(p[0], p[1], 0.3)); crowd(sp, 'selfie-w', { role: () => pick(['student', 'tourist', 'asian']), tx: q[0], tz: q[1], yaw: (x, z) => lookAt(x, z, q[0], q[1]), gest: [G.SELFIE, G.POSE, G.WAVE, G.POSE] }); } }
  });
  place('field', () => {
    crowd(spots(-2010, -740, 38, 14, 80, { sp: 2.2 }), 'palace-field', { gest: [G.PHONE, G.TALK, G.WATCH, G.PHOTO, G.SELFIE, G.NONE, G.LOOKAROUND, G.EAT], mix: [['tourist', 5], ['walk', 3], ['student', 2], ['asian', 1.5], ['parent', 1], ['kid', 1], ['elder', 0.6]], dur: [60, 500] });
    // the south front of the Winter Palace: groups at the edge of the sett field, facing the palace (the edge A -> B of the stone field, the palace beyond it)
    const A = [-2068.2, -739], B = [-1959.2, -821.3], ex = B[0] - A[0], ez = B[1] - A[1], el = Math.hypot(ex, ez), nx0 = ez / el, nz0 = -ex / el, sgn = (nx0 * (-1990 - A[0]) + nz0 * (-720 - A[1])) > 0 ? 1 : -1;
    const wl = [];
    for (let i = 0; i < 12; i++) { const t = 0.08 + 0.84 * R(), d = 5 + 9 * R(), x = A[0] + ex * t + nx0 * sgn * d, z = A[1] + ez * t + nz0 * sgn * d; if (free(x, z, 0.4) && wl.every((p) => dist(p[0], p[1], x, z) > 1.5)) wl.push([x, z]); }
    crowd(wl, 'wp-front', { yaw: () => Math.atan2(-nx0 * sgn, -nz0 * sgn), gest: [G.PHOTO, G.PHONE, G.TALK, G.SELFIE, G.NONE, G.WATCH], dur: [100, 700] });
    guided(A[0] + ex * 0.45 + nx0 * sgn * 12, A[1] + ez * 0.45 + nz0 * sgn * 12, A[0] + ex * 0.45, A[1] + ez * 0.45, { n: 12, col: '#2f6fc0' });
  });
  place('ga-arch', () => {
    const r = show(ARCH.x, ARCH.z, 'busker-arch', { role: 'busker', gest: G.PLAY, k: 7, r: 24 });
    // costume characters 30 m from the busker: a gold living statue with admirers + a tout with the photo fee
    const nd = openSpot(ARCH.x - 14, ARCH.z + 22, 28); if (nd >= 0) { const x = N.x[nd], z = N.z[nd], plan = arcPlan(x, z, 4, 2.0, 3.6, 0.9), a = mk({ role: 'statue' }, 'costume', P.P_STROLL); standNear(a, x, z, plan.yaw, [G.POSE], 1e6); a.standG = [G.POSE]; count('costume'); plan.pos.slice(0, 3).forEach((p) => { const b = mk({ role: 'tourist' }, 'costume-fans', P.P_TOURIST); standNear(b, p[0], p[1], lookAt(p[0], p[1], x, z), [G.PHOTO, G.PHONE, G.SELFIE], rr(30, 200)); count('costume-fans'); }); }
    void r;
  });
  place('palace-painters', () => {
    for (const p of (sv.landmarksG && sv.landmarksG.spots && sv.landmarksG.spots.painters) || []) {
      const k = freeNear(p.x, p.z, 8, 0.8); if (!k) continue; const plan = arcPlan(k[0], k[1], 4, 2.4, 3.8, 0.8), a = mk({ role: 'painter' }, 'painter-w', P.P_STROLL);
      standNear(a, k[0], k[1], plan.yaw, [G.PAINT], 1e6); a.standG = [G.PAINT]; count('painter-w');
      plan.pos.slice(0, 1).forEach((q) => { const sit = mk({ role: 'tourist' }, 'painter-model', P.P_STROLL); standNear(sit, q[0], q[1], lookAt(q[0], q[1], k[0], k[1]), [G.NONE, G.POSE], rr(200, 600)); sit.standG = [G.NONE, G.NONE, G.POSE]; count('painter-model'); });
      plan.pos.slice(1, 4).forEach((q) => { const b = mk({ role: 'walk' }, 'painter-fans', P.P_STROLL); standNear(b, q[0], q[1], lookAt(q[0], q[1], k[0], k[1]), [G.WATCH, G.NONE, G.PHONE], rr(60, 300)); count('painter-fans'); });
    }
  });
  place('hermitage-queue', () => {
    // the ticket queue: 3-abreast rows along the long axis of the Great Courtyard, facing the door end; security man at the head
    const cy = sv.landmarksI && sv.landmarksI.courtyard; if (!cy || cy.length < 6) return;
    let sx = 0, sz = 0; for (const q of cy) { sx += q[0]; sz += q[1]; } sx /= cy.length; sz /= cy.length;
    let best = null; for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI, ux = Math.sin(ang), uz = Math.cos(ang); let cnt = 0;
      for (let d = -16; d <= 16; d += 1.2) for (const lat of [-0.5, 0.5]) if (free(sx + ux * d - uz * lat * 0.95, sz + uz * d + ux * lat * 0.95, 0.3)) cnt++;
      if (!best || cnt > best.cnt) best = { ang, cnt, ux, uz };
    }
    if (!best || best.cnt < 16) return;
    const list = []; for (let d = -16; d <= 16; d += 1.0) for (const lat of [-0.5, 0.5]) { const x = sx + best.ux * d - best.uz * lat * 0.95 + rr(-0.1, 0.1), z = sz + best.uz * d + best.ux * lat * 0.95 + rr(-0.1, 0.1); if (free(x, z, 0.3)) list.push([x, z]); }
    const face = Math.atan2(-best.ux, -best.uz);
    crowd(list.slice(0, Math.round(n(46))), 'hermitage-queue', { yaw: () => face, jit: 0.25, gest: [G.PHONE, G.WATCH, G.NONE, G.TALK, G.LOOKAROUND, G.NONE], dur: [300, 1200], mix: [['tourist', 5], ['walk', 3], ['asian', 2], ['student', 1.5], ['parent', 1], ['elder', 0.5]] });
    const head = freeNear(sx - best.ux * 18.5, sz - best.uz * 18.5, 4, 0.4); if (head) { const g = mk({ role: 'police' }, 'security', P.P_STROLL); standNear(g, head[0], head[1], Math.atan2(best.ux, best.uz), [G.LOOKAROUND, G.NONE, G.TALK], 1e6); count('security'); }
  });
  place('palace-police', () => {
    const k = freeNear(-2005, -700, 20, 0.8); if (!k) return; const nd = nav.nearestNode(k[0], k[1], 10, (id) => 'sap'.includes(N.k[id]) && nav.mainOK(id)); if (nd < 0) return;
    const lead = mk({ role: 'police' }, 'police-w', { wander: 8, door: 0, bench: 0, stop: 0, spot: 1, metro: 0 }); lead.vpref = 0.9; fixed(lead); sim.placeAtNode(lead, nd, 0.5);
    const b = mk({ role: 'police' }, 'police-w', lead.prefs); sim.follow(b, lead, 0.75, 0.2); b.vpref = 0.92; sim.placeAtNode(b, nd, 1.2); b.comp = lead.comp; count('police-w'); count('police-w');
  });

  // ============================================================================== GARDENS
  place('alexander-fountain', () => {
    const F = [-2335, -495]; crowd(spots(F[0], F[1], 16, 9, 19, { sp: 1.0 }), 'alex-fountain', { tx: F[0], tz: F[1], gest: [G.PHOTO, G.SELFIE, G.PHONE, G.TALK, G.WATCH, G.NONE, G.EAT] });
    for (let i = 0; i < n(3); i++) { const q = spots(F[0], F[1], 1, 6, 16)[0]; if (q) couple(q[0], q[1], F[0], F[1], 'alex-couple'); }
  });
  place('admiralty-garden', () => {
    crowd(spots(-2440, -766, 16, 4, 45, { sp: 3 }), 'adm-garden', { gest: [G.TALK, G.PHONE, G.WATCH, G.NONE, G.LOOKAROUND, G.EAT, G.PHOTO], mix: [['walk', 3], ['tourist', 3], ['elder', 1.5], ['date', 1.5], ['student', 1.5], ['parent', 1]], dur: [60, 500] });
    for (let i = 0; i < n(3); i++) { const q = spots(-2440, -766, 1, 6, 40, { clr: 0.8 })[0]; if (q) couple(q[0], q[1], -2440 + rr(-30, 30), -740 + rr(-30, 30), 'adm-date', { roleA: 'date', roleB: 'walk', gA: [G.TALK, G.NONE, G.POSE], gB: [G.TALK, G.NONE, G.PHONE] }); }
  });
  place('isaac', () => {
    for (const c of (sv.landmarksJ && sv.landmarksJ.crowd) || []) { if (R() > 0.85) continue; const p = freeNear(c.x, c.z, 4, 0.4); if (!p) continue; const tx = c.z > 0 ? -2396 : -2500, tz = c.z > 0 ? 35 : -185; crowd([p], 'isaac', { tx, tz, gest: GP, jit: 1.0 }); }
    crowd(spots(-2449, -66, 6, 1.5, 9, { sp: 1.1 }), 'isaac-pigeons', { gest: [G.EAT, G.NONE, G.POINT, G.EAT], role: () => pick(['elder', 'walk', 'parent', 'tourist']), jit: 2 });
    crowd(spots(-2396, 35, 10, 12, 20, { sp: 1.3 }), 'nicholas-rim', { tx: -2396, tz: 35, gest: GP });
  });
  place('catherine-garden', () => {
    const g = sv.landmarksE && sv.landmarksE.spots && sv.landmarksE.spots.garden; if (!g) return;
    // chess players on the benches around the board, watchers behind
    const ch = g.chess, seats = []; for (const b of nav.benches) { if (dist(b.x, b.z, ch[0], ch[1]) > 12) continue; b.seats.forEach((s, si) => { if (s.taken < 0) seats.push([b, si, dist(s.x, s.z, ch[0], ch[1])]); }); }
    seats.sort((p, q) => p[2] - q[2]);
    for (const [b, si] of seats.slice(0, Math.round(n(6)))) { const a = mk({ role: R() < 0.5 ? 'elder' : 'walk', fem: false }, 'chess', P.P_ELDER); fixed(a); sim.sitAt(a, b, si, 0); a.until = rr(300, 1500); count('chess'); }
    crowd(spots(ch[0], ch[1], 5, 1.5, 6, { sp: 1.0 }), 'chess-watchers', { tx: ch[0], tz: ch[1], gest: [G.WATCH, G.NONE, G.TALK, G.POINT], role: () => pick(['elder', 'walk', 'tourist']) });
    for (const art of (g.artists || []).slice(0, 4)) {
      const k = freeNear(art.x, art.z, 5, 0.6); if (!k) continue; const plan = arcPlan(k[0], k[1], 3, 2.4, 3.6, 0.8), a = mk({ role: 'painter' }, 'artist-c', P.P_STROLL);
      standNear(a, k[0], k[1], plan.yaw, [G.PAINT], 1e6); a.standG = [G.PAINT]; count('artist-c');
      plan.pos.slice(0, 1).forEach((q) => { const s2 = mk({ role: 'tourist' }, 'artist-model', P.P_STROLL); standNear(s2, q[0], q[1], lookAt(q[0], q[1], k[0], k[1]), [G.NONE, G.POSE], rr(200, 600)); count('artist-model'); });
      plan.pos.slice(1, 3).forEach((q) => { const b = mk({ role: 'walk' }, 'artist-fans', P.P_STROLL); standNear(b, q[0], q[1], lookAt(q[0], q[1], k[0], k[1]), [G.WATCH, G.NONE], rr(60, 300)); count('artist-fans'); });
    }
    if (g.monument) crowd(spots(g.monument[0], g.monument[1], 7, 7, 14, { sp: 1.4 }), 'catherine-monument', { tx: g.monument[0], tz: g.monument[1], gest: GP });
  });
  place('horseman', () => {
    const h = sv.landmarksH && sv.landmarksH.spots && sv.landmarksH.spots.horseman || { x: -2745.5, z: -444.2, ring: 13.3 };
    crowd(spots(h.x, h.z, 16, (h.ring || 13) + 2, (h.ring || 13) + 11, { sp: 1.3 }), 'horseman', { tx: h.x, tz: h.z, gest: GP });
    wedding(h.x, h.z, 'horseman', (h.ring || 13) + 4, 28);
  });
  place('weddings', () => { wedding(-2335, -495, 'alex', 11, 22); const q = stairNear('neva', -2407, -822, 40); if (q) wedding(q.x - q.tx * 3, q.z - q.tz * 3, 'palacebridge', 0, 14); });

  // ============================================================================== STREETS
  place('gostiny', () => {
    // shoppers in the open arcade (graph nodes inside the gallery passage) and at the shop windows (face the wall), a crowd at the metro stairs, the excursion tout
    const pas = nav.passages.find((q) => q.name === 'gostiny-gallery');
    if (pas) {
      const ids = []; const inGal = nav.passageTests['gostiny-gallery']; for (let i = 0; i < N.x.length; i++) if (N.k[i] === 'a' && inGal(N.x[i], N.z[i]) && nav.mainOK(i) && nav.obstDist(N.x[i], N.z[i], 1) > 0.65 && [0, 1, 2, 3, 4, 5].every((k) => nav.walkable(N.x[i] + Math.cos(k * 1.047) * 0.9, N.z[i] + Math.sin(k * 1.047) * 0.9))) ids.push(i);          // (clear of the piers: a person placed in a pier pocket cannot move)
      for (let k = 0; k < Math.min(ids.length, Math.round(n(80))); k++) { const a = mk({ role: roleOf([['walk', 4], ['tourist', 3], ['student', 1.5], ['elder', 1], ['parent', 1]]) }, 'arcade', P.P_STROLL); sim.placeAtNode(a, pick(ids), 0.6); count('arcade'); }
      const wl = []; for (let tries = 0; tries < 200 && wl.length < Math.round(n(20)); tries++) { const id = pick(ids), x = N.x[id] + rr(-0.5, 0.5), z = N.z[id] + rr(-0.5, 0.5); if (inGal(x, z) && free(x, z, 0.35) && wl.every((p) => dist(p[0], p[1], x, z) > 2)) wl.push([x, z]); }
      const ux = (pas.bx - pas.ax), uz = (pas.bz - pas.az), ul = Math.hypot(ux, uz) || 1, wall = Math.atan2(uz / ul, -ux / ul);       // the shops are on the building side (-q: south of the arcade axis)
      crowd(wl, 'arcade-window', { yaw: () => wall, gest: [G.WATCH, G.POINT, G.TALK, G.PHONE, G.NONE], role: () => pick(['walk', 'tourist', 'student', 'elder']), jit: 0.4 });
    }
    crowd(spots(-1050, -215, 10, 3, 10, { sp: 1.2 }), 'gd-stairs', { gest: GT, mix: [['walk', 4], ['student', 3], ['tourist', 2]], jit: 3 });
    const tk = freeNear(-1012, -216, 5, 0.6); if (tk) { const t0 = mk({ role: 'tout' }, 'tout-w', P.P_STROLL); standNear(t0, tk[0], tk[1], 0.5, [G.TALK, G.LOOKAROUND, G.WAVE], 1e6); t0.standG = [G.TALK, G.LOOKAROUND, G.WAVE]; count('tout-w'); crowd(spots(tk[0], tk[1], 2, 1.4, 2.4), 'tout-w', { tx: tk[0], tz: tk[1], gest: [G.TALK, G.POINT, G.NONE], role: 'tourist' }); }
  });
  place('vendors', () => {
    // a vendor + customers at the kiosks / carts of the props module (the tourist-centre stretch of Nevsky, the gardens)
    const KIND = { cartRed: 1, cartHot0: 1, cartHot1: 1, cartSouv: 1, iceCartHood: 1, cafeKiosk: 0.9, stall0: 1, press: 0.7, excKiosk: 0.5, ticketBooth: 0.5 };
    for (const kk of (sv.props && sv.props.kiosks) || []) {
      if (kk.x > -600 || !(kk.kind in KIND) || R() > KIND[kk.kind] * 0.8) continue;
      const fx = Math.sin(kk.rotY), fz = Math.cos(kk.rotY), rx = Math.cos(kk.rotY), rz = -Math.sin(kk.rotY); let spot = null;
      for (const [f, r] of [[1.4, 0], [0.5, 1.7], [0.5, -1.7], [-1.5, 0], [1.9, 1.2]]) { const x = kk.x + fx * f + rx * r, z = kk.z + fz * f + rz * r; if (free(x, z, 0.35)) { spot = [x, z]; break; } }
      if (!spot) continue;
      const v = mk({ role: kk.kind === 'excKiosk' ? 'tout' : kk.kind === 'ticketBooth' ? 'staff' : 'vendor' }, 'vendor-w', P.P_STROLL); standNear(v, spot[0], spot[1], lookAt(spot[0], spot[1], kk.x, kk.z) + Math.PI * (R() < 0.5 ? 1 : 0) * 0.5, [G.TALK, G.LOOKAROUND, G.NONE, G.WATCH], 1e6); v.standG = [G.TALK, G.LOOKAROUND, G.NONE, G.WATCH]; count('vendor-w');
      const cs = spots(kk.x + fx * 2.4, kk.z + fz * 2.4, Math.round(n(kk.kind === 'iceCartHood' || kk.kind === 'cartHot0' ? 3 : 1.5)), 0.2, 1.7, { sp: 0.8 });
      crowd(cs, 'customer', { tx: kk.x, tz: kk.z, gest: [G.NONE, G.TALK, G.EAT, G.POINT, G.PHONE], jit: 0.4, dur: [20, 160] });
    }
  });
  place('canal-banks', () => {
    // couples at the descents to the water (they stand 2-3 m back from the top of the stair and look along the canal), the odd single photographer
    const all = ((sv.environment && sv.environment.quay && sv.environment.quay.allStairs) || []).filter((q) => q.x < -700 && q.walk !== false);
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    let made = 0; const want = Math.round(n(13));
    for (const q of all) {
      if (made >= want) break;
      const side = (R() < 0.5 ? -1 : 1) * ((q.w || 2) / 2 + 1.3); let x = 0, z = 0, found = false;
      for (let back = 1.2; back <= 6.5 && !found; back += 0.7) { x = q.x - q.tx * back + q.nx * side; z = q.z - q.tz * back + q.nz * side; found = free(x, z, 0.4); }
      if (!found) continue;
      if (R() < 0.7) couple(x, z, q.x + q.tx * 6, q.z + q.tz * 6, 'canal-couple', { roleA: R() < 0.5 ? 'date' : 'tourist', gA: [G.POSE, G.TALK, G.SELFIE, G.PHOTO, G.NONE], gB: [G.TALK, G.POSE, G.WATCH, G.PHONE, G.NONE] });
      else crowd([[x, z]], 'canal-single', { tx: q.x + q.tx * 6, tz: q.z + q.tz * 6, gest: [G.PHOTO, G.WATCH, G.PHONE, G.POINT] });
      made++;
    }
  });
  place('cosplay', () => {                                            // the Passage doors (Nevsky 48): a young group in costumes poses in front of the nearest door
    let best = null, bd = 90; for (const e of nav.entrances) { if (e.kind !== 'door') continue; const d = dist(e.ax, e.az, -948, -288); if (d < bd) { bd = d; best = e; } }
    if (!best) return; const k = freeNear(best.ax, best.az, 6, 0.5); if (!k) return;
    crowd(spots(k[0], k[1], 5, 1, 5, { sp: 1.0 }), 'cosplay', { role: () => pick(['student', 'student', 'tourist']), tx: best.x, tz: best.z, jit: 1.5, gest: [G.POSE, G.SELFIE, G.POSE, G.PHONE, G.WAVE] });
  });
  place('hermitage-embankment', () => { crowd(spots(-2060, -950, 8, 5, 40, { sp: 3 }), 'embankment', { gest: GW, mix: [['tourist', 4], ['walk', 3], ['date', 1.5], ['student', 1]] }); crowd(spots(-2400, -830, 6, 3, 14, { sp: 1.5 }), 'bridge-landing', { gest: GW, mix: [['tourist', 4], ['date', 2], ['walk', 2]] }); });
  out.helpers = hh;
  return out;
}
