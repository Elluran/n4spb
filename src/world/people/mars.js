// people/mars.js - the scripted life of the ENGINEERING (MIKHAILOVSKY) CASTLE precinct (docs/MARS-BRIEF.md; the Mars Field and the Summer Garden of that brief lie north of the strip and are not built).  Precedent: people/west.js;
// the building blocks (crowds at spots, couples, guided groups with a plain umbrella, shows) come from west.js makeHelpers; the surfaces / zone cap from area.js + people.js DENSITY.mars.
// Anchors are read from the services (landmarksCastle: crowd, court, monument, entrances) with the dossier positions as the fallback; every place is wrapped in its own try / catch, and everybody is placed only on FREE
// walkable spots (nav.walkable, obstacle distance, off the asphalt).  Nobody carries a flag (guides: a plain coloured umbrella); no sounds; no weapons.
//   Castle:       the Peter I monument (busker with listeners, photographers, couples on the benches), the south portal (tour group, a school excursion), the court (a small excursion at the Paul I statue).
import { makeSpec } from './chars.js';
import { GESTURE as G } from './contract.js';
import { makeHelpers } from './west.js';

const GP = [G.PHOTO, G.PHOTO, G.SELFIE, G.PHONE, G.LOOKAROUND, G.POINT, G.NONE];

export function addMars(ctx, nav, sim, S, H) {
  const { R, rr, count } = S, P = S.P, sv = ctx.services, cfg = S.mars || { scale: 1 };
  const W = makeHelpers(ctx, nav, sim, S, H, cfg.scale ?? 1);
  const { freeNear, guided, show, spots } = W;
  // quality tiers (people.js: 1 / 0.7 / 0.45): the scripted places keep that share of their people (the couples are skipped as a whole)
  const qk = S.qf ?? 1, skipQ = () => qk < 1 && R() > qk;
  const crowd = (list, scene, o = {}) => W.crowd(list, scene, qk < 1 && o.keep === undefined ? { ...o, keep: qk } : o);
  const couple = (...a) => { if (!skipQ()) W.couple(...a); };
  const { mk, fixed, free, lookAt, dist } = H;
  const CS = sv.landmarksCastle || {};
  const out = { places: {}, failed: [], ms: {} };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const place = (name, fn) => { const before = sim.agents.length, t0 = now(); try { fn(); } catch (e) { out.failed.push(name); console.error('[people] castle vignette ' + name + ' failed:', e); } out.places[name] = sim.agents.length - before; out.ms[name] = Math.round(now() - t0); };

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
  return out;
}
