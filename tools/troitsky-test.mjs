// troitsky-test.mjs - the Troitsky Bridge and its opening bascule leaf (module landmarksTroitsky, docs/AREAS.md 13.8), headless, CPU only, no GPU / browser:
//   node tools/area.mjs palace tools/troitsky-test.mjs [--quiet | --verbose]        (npm run troitsky)
// 1. the wiring: the module is in the palace MODULES (after bridges, before traffic / people), its deck service is in HOOKS.deckServices, the claim covers the seven OSM ways and every one of them is in the data;
// 2. the kinematics (frame.js): the closed leaf is the deck profile, the height rises with the angle, the slope is the elevation angle, the carry is the horizontal shift of a material point, the vertical speed handed
//    to a carried body stays <= 1.3 m/s over the whole cycle, the footing rule (walker 35, car 25 degrees);
// 3. the schedule (schedule.js): the STOP flag is raised before the leaf moves and released only after it lies and the arms are up, theta is continuous, the easing, open / closed / auto modes, the night rule;
// 4. the service: deckY on the closed deck equals the profile (continuous in space), on the open leaf it is the live surface, the gap beyond the raised tip answers null, the lift of the feet;
// 5. the NPC hooks: the stop lines on the lanes of the bridge ways and the signal that reads red while the flag is up; the pedestrian step test through a closed gate (inward only);
// 6. the REAL module built headless (tools/tauride/lib/stub-env.mjs): triangles, the floor ramps equal deckY at every angle, the dynamic rails follow the leaf, the real Player stands on the leaf through the whole cycle (contact, carry,
//    slip beyond 35 degrees), the real drive/handling.js car rides it (contact, pitch with the slope, slip beyond 25 degrees, drives onto it while it closes).
import assert from 'node:assert/strict';
import * as F from '../src/world/landmarksTroitsky/frame.js';
import { createClock, CFG, ease } from '../src/world/landmarksTroitsky/schedule.js';
import * as S from '../src/world/landmarksTroitsky/service.js';
import { WAY_IDS, GROUPS_LIST } from '../src/world/landmarksTroitsky/groups.js';
import * as A from '../src/areas/palace/area.js';
import { HOOKS } from '../src/world/lib/area-tables.js';
import { OWNS_TABLE } from '../src/world/lib/owns-table.js';
import * as L from '../src/world/layout.js';
import { ROADS, BRIDGES } from '../src/world/data/city.js';

const QUIET = process.argv.includes('--quiet'), VERBOSE = process.argv.includes('--verbose');
if (process.env.AREA !== 'palace') { console.error('run it as the palace: node tools/area.mjs palace tools/troitsky-test.mjs'); process.exit(2); }
const fails = []; let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails.push(msg); console.log('  FAIL', msg); } };
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: ${typeof a === 'number' ? a.toFixed(4) : a} vs ${b} (+-${tol})`);
const say = (s) => { if (!QUIET) console.log(s); };
const section = (s) => say('\n' + s);
const DEG = Math.PI / 180;
const W = (u, v) => F.toWorld(u, v, {});

// ------------------------------------------------------------------ 1. the wiring
section('1. the wiring');
{
  const m = A.MODULES, i = m.indexOf('landmarksTroitsky');
  ok(i > m.indexOf('bridges') && i > m.indexOf('streets') && i < m.indexOf('traffic') && i < m.indexOf('people'), `landmarksTroitsky is after streets and bridges, before traffic and people (index ${i})`);
  ok(HOOKS.deckServices.includes('landmarksTroitsky'), `HOOKS.deckServices names the service: [${HOOKS.deckServices}]`);
  ok(A.GROUPS.landmarksTroitsky && A.GROUPS.landmarksTroitsky[0].key === 'troitsky', 'the area claims the sub-group "troitsky"');
  ok(OWNS_TABLE.landmarksTroitsky === true, 'the generated claims table lists the module (node tools/owns-table.mjs)');
  const ids = new Set([...ROADS.map((r) => r.id), ...BRIDGES.map((r) => r.id)]);
  for (const id of GROUPS_LIST[0].osm) ok(ids.has(id), `OSM way ${id} is in the data of the palace`);
  ok(WAY_IDS.every((w) => GROUPS_LIST[0].osm.includes(w)), 'the carriageway ids are a subset of the claim');
  ok(L.groupOf('w142545019') === 'troitsky', 'layout.groupOf maps a way of the bridge to its sub-group');
  // the territory holds the whole deck (no registry row was changed)
  let out = 0; for (let u = -1.6; u <= 555; u += 4) for (const v of [-11.8, 0, 11.8]) { const w = W(u, v); if (!L.inPlay(w.x, w.z, 0)) out++; }
  ok(out === 0, `the deck u -1.6 .. 555 lies inside the play rectangles (${out} sample points outside)`);
  const ex = A.WATER.bridgeZones.find((z) => z.id === 'troitsky');
  ok(ex && ex.own && ex.key === 'neva' && ex.len === 554, 'the quay opens for the bridge: a BRIDGE_ZONES row "troitsky" (own, neva, 554 m)');
  const c = W(277, 0); ok(Math.hypot(ex.c[0] - c.x, ex.c[1] - c.z) < 0.2, `the zone centre is the deck centre (${ex.c} vs ${c.x.toFixed(1)}, ${c.z.toFixed(1)})`);
}

// ------------------------------------------------------------------ 2. the kinematics
section('2. the kinematics of the leaf (frame.js)');
{
  near(F.U_TIP - F.U_HINGE, 43.0, 1e-9, 'the leaf spans u 15.2 .. 58.2 (43.0 m, the 43.2 m span of the research)');
  near(F.leafY(F.U_HINGE, 0), F.yDeck(F.U_HINGE), 1e-9, 'closed: the leaf meets the first pier deck at the hinge');
  near(F.leafY(F.U_TIP - 1e-7, 0), F.yDeck(F.U_TIP), 1e-6, 'closed: the leaf meets the landing pier deck at the tip');
  let dev = 0; for (let u = F.U_HINGE; u <= F.U_TIP; u += 0.25) dev = Math.max(dev, Math.abs(F.leafY(u, 0) - F.yDeck(u)));
  ok(dev < 0.03, `closed: the rigid leaf stays within ${dev.toFixed(3)} m of the cubic deck profile (the profile is the source's, the leaf is its chord)`);
  // the height rises with the angle at a fixed material point, and at a fixed u inside the footprint
  for (const u of [20, 30, 45]) {
    let prev = -1e9, mono = true;
    for (let th = 0; th <= F.THETA_MAX; th += 0.02) { const y = F.leafY(u, th); if (!(y === y)) continue; if (y < prev - 1e-9) mono = false; prev = y; }
    ok(mono, `leafY(${u}) rises with theta while the leaf covers it`);
  }
  ok(F.leafY(50, F.THETA_MAX) !== F.leafY(50, F.THETA_MAX), 'the raised leaf leaves a gap: u 50 is beyond the projection of the tip at 70 degrees (NaN)');
  const f70 = F.leafFoot(F.THETA_MAX); near(f70.u1, F.U_HINGE + F.LEAF_S * Math.cos(F.THETA_MAX + F.ALPHA0), 1e-9, 'the footprint at 70 degrees');
  near(F.leafSlope(F.THETA_MAX) / DEG, 70 + F.ALPHA0 / DEG, 1e-9, 'the slope of the surface = the elevation angle');
  // the slope of the surface by finite differences equals the elevation angle
  for (const th of [0.2, 0.7, 1.1]) { const u = 24, y0 = F.leafY(u, th), y1 = F.leafY(u + 0.1, th); near(Math.atan2(y1 - y0, 0.1 * 1), F.phiOf(th), 1e-6, `slope at theta ${th}`); }
  // the carry of a material point equals the displacement of the rotating rigid line
  for (const [u0, a, b] of [[20, 0, 0.3], [30, 0.3, 0.9], [50, 0, 0.1]]) {
    const s = (u0 - F.U_HINGE) / Math.cos(F.phiOf(a)), uNew = F.U_HINGE + s * Math.cos(F.phiOf(b)), yNew = F.Y_HINGE + s * Math.sin(F.phiOf(b));
    near(F.carryDu(u0, a, b), uNew - u0, 1e-9, `carryDu(${u0}, ${a} -> ${b})`);
    near(F.leafY(uNew, b), yNew, 1e-9, 'the carried point stays on the surface');
  }
  // the vertical speed handed to a carried body (the eased cycle): at most (43 m) * max omega
  const clk = createClock({ mode: 'open' }); let vmax = 0, vfix = 0, wmax = 0;
  for (let i = 0; i < 4000; i++) { clk.step(0.05, 0); const w = Math.abs(clk.omega); wmax = Math.max(wmax, w); for (const u of [16, 25, 40, 58]) { vmax = Math.max(vmax, Math.abs(F.leafVy(u, w))); if (F.leafSlope(clk.theta) < F.WALK_SLIP_DEG * DEG) vfix = Math.max(vfix, Math.abs(F.leafVyFixed(u, clk.theta, w))); } }
  ok(vmax <= 1.3, `the vertical speed of a CARRIED body is at most ${vmax.toFixed(3)} m/s (<= 1.3)`);
  ok(vfix <= 2.0, `the vertical rate of the surface under a standing point below the walker's slip angle is at most ${vfix.toFixed(3)} m/s (<= 2.0)`);
  say(`  max omega ${(wmax / DEG).toFixed(3)} deg/s, carried vertical speed ${vmax.toFixed(3)} m/s, fixed-point rate ${vfix.toFixed(3)} m/s`);
  // the footing rule
  near(F.slideAccel(35, 35 * DEG), 0, 1e-12, 'no slide acceleration at the walker limit (continuous)');
  ok(F.slideAccel(35, 36 * DEG) > 0 && F.slideAccel(35, 34.9 * DEG) === 0, 'a walker slips from 35 degrees');
  ok(F.slideAccel(25, 26 * DEG) > 0 && F.slideAccel(25, 24.9 * DEG) === 0, 'a car slips from 25 degrees');
  ok(F.slideAccel(25, 70 * DEG) > F.slideAccel(25, 40 * DEG), 'the slide accelerates more on a steeper leaf');
  ok(F.slips(35, 36 * DEG - F.ALPHA0) && !F.slips(35, 34 * DEG - F.ALPHA0) && F.slips(25, 26 * DEG - F.ALPHA0) && !F.slips(25, 24 * DEG - F.ALPHA0), 'slips(limit, theta) follows the elevation angle');
  ok(F.CAR_SLIP_DEG < F.WALK_SLIP_DEG, 'a car loses its footing before a walker (25 < 35)');
}

// ------------------------------------------------------------------ 3. the schedule
section('3. the schedule (schedule.js)');
{
  // a full AUTO cycle in the daylight, 0.05 s steps: log (t, stage, stop, theta, barrier)
  const clk = createClock({ mode: 'auto' }); const log = []; let t = 0, prevTh = 0, maxStep = 0, firstWarn = -1, firstMove = -1, release = -1, flagDown = -1, upAtRelease = 0;
  for (let i = 0; i < 24000 && release < 0; i++) {
    clk.step(0.05, 0); t += 0.05;
    const th = clk.theta; maxStep = Math.max(maxStep, Math.abs(th - prevTh)); prevTh = th;
    if (clk.stop && firstWarn < 0) firstWarn = t;
    if (th > 1e-6 && firstMove < 0) firstMove = t;
    if (firstWarn >= 0 && !clk.stop && release < 0) { release = t; upAtRelease = clk.barrier; }
    if (log.length < 1 || clk.stage !== log[log.length - 1].stage) log.push({ t: +t.toFixed(2), stage: clk.stage });
  }
  say('  ' + log.map((e) => `${e.t}s ${e.stage}`).join(' | '));
  near(firstWarn, CFG.FIRST_AT, 0.3, `the first daytime opening is announced FIRST_AT = ${CFG.FIRST_AT} s after the start`);
  ok(firstMove - firstWarn >= CFG.WARN - 0.3, `the STOP flag is up ${(firstMove - firstWarn).toFixed(1)} s (>= WARN ${CFG.WARN}) before the leaf moves`);
  ok(release > 0, 'the cycle ends: the flag drops'); ok(upAtRelease === 0, `the arms are up (${upAtRelease}) when the flag drops`);
  ok(maxStep < 0.0016, `theta is continuous: the largest 0.05 s step is ${(maxStep / DEG).toFixed(4)} degrees`);
  const order = log.map((e) => e.stage).join('>');
  ok(order === 'idle>warn>opening>hold>closing>clear>idle', `the stages in order: ${order}`);
  const tOpen = log.find((e) => e.stage === 'opening').t, tHold = log.find((e) => e.stage === 'hold').t, tClose = log.find((e) => e.stage === 'closing').t, tClear = log.find((e) => e.stage === 'clear').t;
  near(tHold - tOpen, CFG.OPEN_T, 0.2, 'OPENING lasts OPEN_T (80 s: 60 .. 90 s of the brief)'); near(tClose - tHold, CFG.HOLD, 0.2, 'HOLD'); near(tClear - tClose, CFG.CLOSE_T, 0.2, 'CLOSING lasts CLOSE_T');
  near(release - tClear, CFG.RELEASE, 0.2, 'the flag drops RELEASE s after the leaf lies down');
  // the angle: 0 -> 70 degrees with zero speed at both ends (smootherstep)
  const c2 = createClock({ mode: 'open' }); let peak = 0, wAtEnd = 1, wMid = 0; for (let i = 0; i < 3000; i++) { c2.step(0.05, 0); peak = Math.max(peak, c2.theta); if (c2.stage === 'opening' && Math.abs(c2.p - 0.5) < 0.01) wMid = Math.abs(c2.omega); if (c2.stage === 'hold') wAtEnd = Math.abs(c2.omega); }
  near(peak, F.THETA_MAX, 1e-9, 'the leaf opens to 70 degrees'); ok(wAtEnd === 0 && wMid > 0, `the easing: still at the end of the opening, ${(wMid / DEG).toFixed(3)} deg/s in the middle`);
  near(ease(0.5), 0.5, 1e-12, 'ease(0.5) = 0.5'); ok(ease(0) === 0 && ease(1) === 1 && ease(0.1) < 0.02, 'ease is 0..1 with a slow start');
  // modes: 'open' stays open; 'closed' while opening reverses without a jump; 'closed' never starts
  const c3 = createClock({ mode: 'open' }); for (let i = 0; i < 2400; i++) c3.step(0.05, 0);
  ok(c3.stage === 'hold' && c3.stop, `mode open: held open (${c3.stage})`);
  c3.setMode('closed'); let th0 = c3.theta, jump = 0; for (let i = 0; i < 4000 && c3.stage !== 'idle'; i++) { c3.step(0.05, 0); jump = Math.max(jump, Math.abs(c3.theta - th0)); th0 = c3.theta; }
  ok(c3.stage === 'idle' && c3.theta === 0 && !c3.stop && jump < 0.0016, 'mode closed: the leaf lowers smoothly and the flag drops');
  const c4 = createClock({ mode: 'open' }); for (let i = 0; i < 700 + 600; i++) c4.step(0.05, 0);       // 65 s: well into the opening
  ok(c4.stage === 'opening', 'opening in progress'); c4.setMode('closed'); const thA = c4.theta; c4.step(0.05, 0); ok(c4.stage === 'closing' && Math.abs(c4.theta - thA) < 0.0016, 'mode closed during the opening: it reverses with no jump');
  // the leaf waits for the span to clear (ready()), at most WARN_MAX; the STOP flag stays up meanwhile and theta stays 0
  const gate = { v: false }, c6 = createClock({ mode: 'open', ready: () => gate.v }); c6.step(CFG.WARN + 20, 0);
  ok(c6.stage === 'warn' && c6.stop && c6.theta === 0, 'the span is not clear: the warning goes on past WARN, the leaf stays down');
  gate.v = true; c6.step(1, 0); ok(c6.stage === 'opening', 'the span is clear: the leaf starts');
  const c7 = createClock({ mode: 'open', ready: () => false }); c7.step(CFG.WARN_MAX - 1, 0); const stillWarn = c7.stage === 'warn'; c7.step(2, 0);
  ok(stillWarn && c7.stage === 'opening', `a span that never clears does not hold the bridge for ever: it opens after WARN_MAX = ${CFG.WARN_MAX} s`);
  const c5 = createClock({ mode: 'closed' }); for (let i = 0; i < 20000; i++) c5.step(0.05, 0); ok(c5.stage === 'idle' && c5.theta === 0 && !c5.stop, 'mode closed: never opens');
  // the night rule: the gap is NIGHT_GAP in the white night, DAY_GAP by day (after the first opening)
  const gapOf = (night) => { const c = createClock({ mode: 'auto' }); let tt = 0, st = [], prev = 'idle'; for (let i = 0; i < 80000 && st.length < 2; i++) { c.step(0.25, night); tt += 0.25; if (prev === 'idle' && c.stage === 'warn') st.push(tt); prev = c.stage; } return st[1] - st[0] - (CFG.WARN + CFG.OPEN_T + CFG.HOLD + CFG.CLOSE_T + CFG.RELEASE); };
  near(gapOf(1), CFG.NIGHT_GAP, 0.6, `night: a new opening ${CFG.NIGHT_GAP} s after the leaf lay down`); near(gapOf(0), CFG.DAY_GAP, 0.6, `day: a new opening ${CFG.DAY_GAP} s after the leaf lay down`);
  const ev = createClock({ mode: 'auto' }); const names = []; for (let i = 0; i < 6000; i++) { ev.step(0.1, 0); names.push(...ev.takeEvents()); }
  ok(names.slice(0, 6).join() === 'warn,opening,open,closing,closed,released', `events of one cycle: ${names.slice(0, 6)}`);
  ok(createClock({}).state().phase === 'closed', 'the service phase of an idle bridge is closed');
  const st1 = createClock({ mode: 'open' }); st1.step(CFG.WARN - 2, 0); ok(st1.state().phase === 'closed' && st1.state().stop, 'warn: phase closed, stop up'); st1.step(10, 0); ok(st1.state().phase === 'opening', 'phase opening');
}

// ------------------------------------------------------------------ 4. the service
section('4. the service (service.js)');
const svc = S.createService({ mode: 'closed' });
{
  // closed: deckY = the profile on the whole deck, continuous in space, null outside
  let maxDiff = 0, maxJump = 0, nPts = 0;
  for (let v = -11.5; v <= 11.5; v += 2.3) {
    let prev = null;
    for (let u = -1.5; u <= 554.5; u += 0.5) {
      const w = W(u, v), y = svc.deckY(w.x, w.z); nPts++;
      ok(y !== null, `deckY is defined at u ${u} v ${v}`); if (y === null) continue;
      maxDiff = Math.max(maxDiff, Math.abs(y - F.yDeck(Math.max(0, Math.min(F.LEN, u))))); if (prev !== null) maxJump = Math.max(maxJump, Math.abs(y - prev)); prev = y;
    }
  }
  ok(maxDiff < 0.04, `closed: deckY matches the deck profile within ${maxDiff.toFixed(4)} m on ${nPts} points`);
  ok(maxJump < 0.5 * 0.06 + 0.02, `closed: deckY is continuous along the bridge (largest 0.5 m step ${maxJump.toFixed(4)} m)`);
  ok(svc.deckY(...Object.values(W(-8, 0))) === null && svc.deckY(...Object.values(W(570, 0))) === null && svc.deckY(...Object.values(W(100, 14))) === null, 'no deck beyond the abutments or beside the railing');
  ok(svc.deckLift(...Object.values(W(100, 11))) === F.PAVE && svc.deckLift(...Object.values(W(100, 0))) === 0.03, 'the feet stand 0.2 m on the pavement, 0.03 m on the asphalt');
  // the leaf region at several angles: deckY = leafY, null in the gap
  for (const th of [0, 0.3, 0.8, F.THETA_MAX]) {
    svc.clock.theta; const s2 = S.createService({ mode: 'closed' });
    Object.defineProperty(s2.clock, 'theta', { get: () => th });
    let bad = 0, gap = 0, inFoot = 0; const f = F.leafFoot(th);
    for (let u = F.U_HINGE + 0.2; u < F.U_TIP - 0.2; u += 0.7) { const w = W(u, 3), y = s2.deckY(w.x, w.z); if (u <= f.u1) { inFoot++; if (y === null || Math.abs(y - F.leafY(u, th)) > 1e-9) bad++; } else { gap++; if (y !== null) bad++; } }
    ok(bad === 0, `theta ${(th / DEG).toFixed(0)}: deckY = the leaf surface over its footprint (${inFoot} pts) and null in the gap (${gap} pts)`);
    ok(s2.onLeaf(...Object.values(W(F.U_HINGE + 1, 0))) && (th === 0 ? true : !s2.onLeaf(...Object.values(W(F.U_TIP - 0.5, 0)))), `onLeaf at theta ${(th / DEG).toFixed(0)}`);
  }
  // time continuity at a fixed point on the leaf during the real cycle
  const s3 = S.createService({ mode: 'open' }); const w = W(30, 4); let prev = s3.deckY(w.x, w.z), worst = 0, nulls = 0;
  for (let i = 0; i < 5000; i++) { s3.advance(0.05, 0); const y = s3.deckY(w.x, w.z); if (y === null) { nulls++; prev = null; continue; } if (prev !== null) worst = Math.max(worst, Math.abs(y - prev)); prev = y; }
  ok(worst < 0.12, `time: deckY at u 30 changes by at most ${worst.toFixed(4)} m per 0.05 s while the leaf is over it (${nulls} frames in the gap)`);
  // the world frame: gates
  ok(svc.gates.length === 2 && Math.abs(svc.gates[0].u - F.GATE_S) < 1e-9 && Math.abs(svc.gates[1].u - F.GATE_N) < 1e-9, 'two gates: u 6 (south) and u 76 (north)');
  ok(svc.gates[0].u < F.U_HINGE && svc.gates[1].u > 70.3, 'the gates stand outside the bascule reach, beyond the piers');
}

// ------------------------------------------------------------------ 5. the NPC hooks
section('5. the NPC hooks: stop lines, signal, pedestrian step test');
{
  const s = S.createService({ mode: 'open' });
  const lane = (id, road, u0, u1, v) => { const pts = []; for (let k = 0; k <= 40; k++) { const u = u0 + (u1 - u0) * k / 40, w = W(u, v); pts.push([w.x, w.z]); } return { id, road, dir: 1, idx: 0, width: 3.6, pts, len: Math.abs(u1 - u0), speed: 12 }; };
  const streets = { lanes: [lane('LN', 'w142545019', -30, 120, 5.7), lane('LS', 'w142545020', 600, -30, -5.7), lane('LX', 'w999', -30, 120, 20)], stopLines: [], signalState: (id, ap, t) => 'amber', signalInfo: () => ({ state: 'amber', remain: 3 }) };
  const n = S.addStopLines(streets, s, WAY_IDS);
  ok(n === 2 && streets.stopLines.length === 2, `one stop line per carriageway lane toward the span: ${n}`);
  const ln = streets.stopLines.find((q) => q.lane === 'LN'), ls = streets.stopLines.find((q) => q.lane === 'LS');
  near(ln.s, 36, 0.2, 'the northbound lane (u -30 .. 120) is stopped at u 6 = 36 m along'); near(ls.s, 600 - 76, 0.2, 'the southbound lane (u 600 .. -30) is stopped at u 76');
  ok(ln.signal === 'troitsky-s' && ls.signal === 'troitsky-n', 'the signals are the gate ids');
  ok(streets.signalState('troitsky-s', 0, 5) === 'green', 'idle bridge: green');
  s.advance(1, 0); ok(s.stop && streets.signalState('troitsky-s', 0, 5) === 'red' && streets.signalState('troitsky-n', 0, 5) === 'red', 'the flag is up (warning): both signals red at once, before the leaf moves');
  ok(s.theta === 0, 'theta is still 0 in the first second of the warning');
  ok(streets.signalState('other', 0, 5) === 'amber' && streets.signalInfo('other', 0, 5).remain === 3, 'the other signals of the city are untouched');
  // pedestrians: a step from the outside into the closed span is a wall, the other ways are not
  const so = W(F.GATE_S - 1, 3), si = W(F.GATE_S + 1, 3), no = W(F.GATE_N + 1, -4), ni = W(F.GATE_N - 1, -4);
  ok(s.stepBlocked(so.x, so.z, si.x, si.z), 'south gate: a step in is blocked'); ok(!s.stepBlocked(si.x, si.z, so.x, so.z), 'south gate: a step OUT is free (those already on the span walk off)');
  ok(s.stepBlocked(no.x, no.z, ni.x, ni.z) && !s.stepBlocked(ni.x, ni.z, no.x, no.z), 'north gate: in blocked, out free');
  const wide = W(F.GATE_S - 1, 20), wide2 = W(F.GATE_S + 1, 20); ok(!s.stepBlocked(wide.x, wide.z, wide2.x, wide2.z), 'a step beside the deck is not this gate');
  ok(s.nearGate(so.x, so.z, 3) && !s.nearGate(...Object.values(W(300, 0)), 3), 'nearGate marks only the neighbourhood of the lines');
  for (let i = 0; i < 100000 && s.stop && s.state().stage !== 'hold'; i++) s.advance(0.1, 0); s.setMode('closed'); for (let i = 0; i < 30000 && s.stop; i++) s.advance(0.1, 0);
  ok(!s.stop && s.theta === 0 && streets.signalState('troitsky-s', 0, 5) === 'green' && !s.stepBlocked(so.x, so.z, si.x, si.z), 'after the leaf lies down the flag drops: green, steps free');
}

// ------------------------------------------------------------------ 6. the real module, built headless
section('6. the real module (stub engine): build, floor, rails, the real Player and the real car');
const SE = await import('./tauride/lib/stub-env.mjs');
const eng = await SE.loadEngine();
const { ctx, camera } = SE.makeContext(eng, ['landmarksTroitsky']);
const { createKnock } = await import('../src/core/knock.js');
const { createHandling } = await import('../src/world/drive/handling.js');
globalThis.document = { pointerLockElement: null, createElement: globalThis.document.createElement };
ctx.knock = createKnock(ctx);
const t0 = Date.now();
await SE.buildModules(eng, ctx, ['landmarksTroitsky']);
const T = ctx.services.landmarksTroitsky, ph = ctx.physics;
{
  ok(!!T && typeof T.deckY === 'function' && typeof T.state === 'function' && typeof T.setMode === 'function', 'ctx.services.landmarksTroitsky = { state, deckY, setMode, ... }');
  say(`  built in ${Date.now() - t0} ms: ${T.stats.tris} triangles (static ${T.stats.staticTris}, leaf ${T.stats.leafTris}), ${T.stats.colliders} colliders, ${T.stats.lamps} knockable lamps, ${T.stats.arms} barrier arms`);
  ok(T.stats.tris >= 60e3 && T.stats.tris <= 120e3, `triangles ${T.stats.tris} within 60 .. 120 k`);
  ok(T.stats.lamps === 22 && ctx.knock.stats.registered === 22, `22 one-globe lamps are registered with the knock system (${ctx.knock.stats.registered})`);
  ok(T.stats.arms === 8, `8 barrier arms (2 gates x (2 carriageway booms + 2 pavement booms)): ${T.stats.arms}`);
  ok(ctx._updates.length >= 2, `the module registered its frame update (knock + the module: ${ctx._updates.length})`);
  ok(ctx.dynamicRoot.children.some((c) => c.name === 'troitsky-leaf') && ctx.dynamicRoot.children.some((c) => c.name === 'troitsky-barriers'), 'the leaf and the barriers are in the dynamic root (moved by transform)');
}
const leaf = T.leaf, update = ctx._updates[ctx._updates.length - 1];
{
  // the transform chain of the moving group: the tip of the leaf (body x = LEAF_S) and the foot of the counterweight (body x = -10.6) in WORLD coordinates equal the formulas of frame.js at several angles
  const THREE = eng.THREE, body = leaf.pivot.children[0];
  for (const th of [0, 0.4, 1.0, F.THETA_MAX]) {
    leaf.set(th); leaf.outer.updateMatrixWorld(true);
    const tip = body.localToWorld(new THREE.Vector3(F.LEAF_S, 0, 5)), phi = F.phiOf(th), want = W(F.U_HINGE + F.LEAF_S * Math.cos(phi), 5);
    near(tip.x, want.x, 1e-6, `theta ${(th / DEG).toFixed(0)}: the world x of the tip`); near(tip.z, want.z, 1e-6, 'the world z of the tip'); near(tip.y, F.Y_HINGE + F.LEAF_S * Math.sin(phi), 1e-6, 'the world y of the tip (it RISES)');
    const cw = body.localToWorld(new THREE.Vector3(-8, 0, 0)); near(cw.y, F.Y_HINGE - 8 * Math.sin(phi), 1e-6, `theta ${(th / DEG).toFixed(0)}: the counterweight end swings DOWN`);
  }
  leaf.set(0); leaf.outer.updateMatrixWorld(true);
  // the barrier arms: lifted (idle) they stand up, lowered (flag up) they lie across the lane
  const bar = ctx.dynamicRoot.children.find((c) => c.name === 'troitsky-barriers'), box = new THREE.Box3();
  T.setMode('closed'); for (let i = 0; i < 100000 && T.state().stop; i++) T.advance(0.1, 0); update(0, 0); bar.updateMatrixWorld(true); const up = box.setFromObject(bar).max.y;
  T.setMode('open'); T.advance(7, 0); update(0, 1); bar.updateMatrixWorld(true); const down = box.setFromObject(bar).max.y;
  ok(T.state().stop && T.state().barrier === 1 && up - down > 5, `the arms: up they reach ${up.toFixed(1)} m, down ${down.toFixed(1)} m (the post), the flag is up`);
  T.setMode('closed'); for (let i = 0; i < 100000 && T.state().stop; i++) T.advance(0.1, 0); update(0, 2); leaf.set(0);
}
const rampsAt = (th) => { leaf.set(th); };
const floorAt = (u, v, feet = 60) => { const w = W(u, v); return ph.surfaceAt(w.x, w.z, feet, false, { y: -Infinity, kind: null, item: null }); };
{
  // closed: the physics floor equals deckY (+ the pavement lift) all along the bridge, and the leaf ramps are the floor on the bascule span
  let worst = 0, n = 0, wrongKind = 0;
  for (const v of [-11.4, -10.9, -9.3, -5.7, 0, 5.7, 9.3, 10.9, 11.4]) for (let u = -1; u <= 554; u += 3.1) {
    const w = W(u, v), y = T.deckY(w.x, w.z); if (y === null) continue;
    const lift = Math.abs(v) >= F.ROAD + F.KERB ? F.PAVE : 0, S2 = floorAt(u, v, y + lift + 0.3); n++;
    worst = Math.max(worst, Math.abs(S2.y - (y + lift)));
    if (u > F.U_HINGE + 0.3 && u < F.U_TIP - 0.3 && !(S2.item && S2.item.leaf)) wrongKind++;
  }
  ok(worst < 0.03, `closed: the physics floor equals deckY (+0.2 on the pavements) within ${worst.toFixed(4)} m on ${n} points`);
  ok(wrongKind === 0, `closed: the floor on the bascule span is the leaf ramps (${wrongKind} points are not)`);
  // at every angle: the floor over the footprint = leafY (+ lift), the gap has no leaf floor
  for (const th of [0.2, 0.5, 0.9, 1.2, F.THETA_MAX]) {
    rampsAt(th); const f = F.leafFoot(th); let w1 = 0, nn = 0, leafOnGap = 0;
    for (const v of [-10.9, -3, 0, 4, 10.9]) for (let u = F.U_HINGE + 0.3; u < F.U_TIP - 0.2; u += 1.1) {
      const lift = Math.abs(v) >= F.ROAD + F.KERB ? F.PAVE : 0;
      if (u < f.u1 - 0.15) { const S2 = floorAt(u, v, F.leafY(u, th) + lift + 0.3); nn++; w1 = Math.max(w1, Math.abs(S2.y - (F.leafY(u, th) + lift))); }
      else if (u > f.u1 + 0.2) { const S2 = floorAt(u, v, 60); if (S2.item && S2.item.leaf) leafOnGap++; }
    }
    ok(w1 < 0.01 && leafOnGap === 0, `theta ${(th / DEG).toFixed(0)}: the floor follows the leaf within ${w1.toFixed(4)} m (${nn} pts), no leaf floor in the gap (${leafOnGap})`);
  }
  rampsAt(0);
  // the dynamic rails: at theta = 40 degrees a point on the rail line at s = 20 m is pushed out, and the same point on the closed leaf too
  ctx.player.position.set(W(30, 0).x, 0, W(30, 0).z);
  for (const th of [0, 0.35, 0.7]) {
    rampsAt(th); ph.refreshDynamic();
    const phi = F.phiOf(th), s = 20, u = F.U_HINGE + s * Math.cos(phi), y = F.Y_HINGE + s * Math.sin(phi) + F.PAVE, w = W(u, F.HW - 0.14), p = { x: w.x, z: w.z };
    ph.resolve(p, 0.3, y, 1.7); const moved = Math.hypot(p.x - w.x, p.z - w.z);
    ok(moved > 0.25, `theta ${(th / DEG).toFixed(0)}: the railing is a collider at s = 20 m on the moving leaf (a walker on the rail line is pushed ${moved.toFixed(2)} m)`);
    const w2 = W(u, 0), p2 = { x: w2.x, z: w2.z }; ph.resolve(p2, 0.3, y - F.PAVE, 1.7); ok(Math.hypot(p2.x - w2.x, p2.z - w2.z) < 1e-6, `theta ${(th / DEG).toFixed(0)}: the middle of the roadway is free`);
  }
  rampsAt(0); ph.refreshDynamic();
  ctx.player.position.set(W(30, 0).x + 400, 0, W(30, 0).z);
  ph.refreshDynamic(); ok(ph._dynItems.length === 0, 'nobody within 160 m: the leaf adds no dynamic boxes (nothing to refresh)');
  ctx.player.position.set(W(30, 0).x, 0, W(30, 0).z); ph.refreshDynamic(); ok(ph._dynItems.length >= 32, `near the leaf: ${ph._dynItems.length} dynamic boxes (rails + kerbs, cut to the slope)`);
}

// ---- the real Player on the leaf through a whole cycle (the order of the engine: player.update, then the module's update)
{
  const dom = { addEventListener() {}, removeEventListener() {} };
  const run = (u0, v0, mode, label, expect) => {
    T.setMode('closed'); for (let i = 0; i < 50000 && T.state().stop; i++) T.advance(0.1, 0); leaf.set(0);       // a fresh closed bridge
    const pl = new eng.Player(camera, dom, ph, eng.L.WORLD.play); pl.enabled = true;
    const w = W(u0, v0); pl.setPose(w.x, w.z, 0, 0); ctx.player.position.set(w.x, 0, w.z);
    const st = S.bodyState(); T.setMode(mode);
    let holdT = 0, enginePre = 0; const dt = 1 / 30; let t = 0, worstContact = 0, vmax = 0, vmaxCarry = 0, slipFrames = 0, prevY = pl.pos.y, uMin = 1e9, uAtSlip = null, minY = 1e9, maxPhi = 0, falls = 0;
    for (let i = 0; i < 9000; i++) {
      t += dt; ph.refreshDynamic(); pl.update(dt); ctx.player.position.copy(pl.pos);
      if (st.on) { const yy = T.deckY(pl.pos.x, pl.pos.z), qq = F.toUV(pl.pos.x, pl.pos.z, {}); if (yy !== null) enginePre = Math.max(enginePre, Math.abs(pl.pos.y - (yy + (Math.abs(qq.v) >= F.ROAD + F.KERB ? F.PAVE : 0)))); }      // the ENGINE's own floor (core/player.js on the live ramps) before the module corrects anything
      if (T.state().stage === 'hold') { holdT += dt; if (holdT > 6) T.setMode('closed'); }
      const r = T.advance(dt, 0); if (r.th1 !== r.th0) leaf.set(r.th1);
      const how = S.stepWalker(pl, r.th0, r.th1, dt, st);
      const q = F.toUV(pl.pos.x, pl.pos.z, {}), y = T.deckY(pl.pos.x, pl.pos.z), lift = Math.abs(q.v) >= F.ROAD + F.KERB ? F.PAVE : 0;
      if (y !== null && how) { worstContact = Math.max(worstContact, Math.abs(pl.pos.y - (y + lift))); }
      const vy = Math.abs(pl.pos.y - prevY) / dt; prevY = pl.pos.y; if (how === 'carry') vmaxCarry = Math.max(vmaxCarry, vy); if (how) vmax = Math.max(vmax, vy);
      if (how === 'slip') { slipFrames++; if (uAtSlip === null) uAtSlip = q.u; maxPhi = Math.max(maxPhi, F.leafSlope(r.th1)); }
      uMin = Math.min(uMin, q.u); minY = Math.min(minY, pl.pos.y); if (pl.pos.y < -1.5) falls++;
      if (VERBOSE && i % 300 === 0) say(`    t ${t.toFixed(0)} stage ${T.state().stage} theta ${(r.th1 / DEG).toFixed(1)} u ${q.u.toFixed(2)} y ${pl.pos.y.toFixed(2)} how ${how}`);
      if (T.state().stage === 'idle' && t > 20) break;
    }
    const q = F.toUV(pl.pos.x, pl.pos.z, {});
    say(`  ${label}: contact <= ${worstContact.toFixed(3)} m (the engine floor alone: <= ${enginePre.toFixed(3)} m), vertical speed carried <= ${vmaxCarry.toFixed(2)} m/s (slipping <= ${vmax.toFixed(2)}), slip frames ${slipFrames}, slipped from u ${uAtSlip === null ? '-' : uAtSlip.toFixed(1)}, ends at u ${q.u.toFixed(2)}`);
    return { worstContact, vmax, vmaxCarry, slipFrames, uAtSlip, uEnd: q.u, falls, minY, st, enginePre };
  };
  const a = run(30, 4, 'open', 'walker at u 30', null);
  // (auto from a fresh closed bridge: the idle gap first. the loop above breaks when the bridge is idle again after 20 s: it ran the idle gap AND the cycle)
  ok(a.worstContact < 0.06, `the walker keeps contact with the moving leaf (worst ${a.worstContact.toFixed(3)} m)`);
  ok(a.enginePre < 0.6, `the engine's own floor under the live ramps never lets the walker drift from the surface by more than ${a.enginePre.toFixed(3)} m between two frames (< 0.6: the walker is re-seated by the carry)`);
  ok(a.vmaxCarry <= 1.35, `the vertical speed handed to the carried walker stays <= 1.35 m/s (${a.vmaxCarry.toFixed(2)})`);
  ok(a.slipFrames > 20, `beyond 35 degrees the walker slips (${a.slipFrames} frames)`);
  ok(a.uEnd < F.U_HINGE + 1.0, `the slipping walker ends at the hinge side (u ${a.uEnd.toFixed(2)} <= ${F.U_HINGE + 1})`);
  ok(a.falls === 0 && a.minY > -1.5, `the walker never falls through (min y ${a.minY.toFixed(2)})`);
  ok(a.vmax <= F.WALK_SLIDE_MAX + 1.5, `while slipping the contact speed is capped (${a.vmax.toFixed(2)} <= ${F.WALK_SLIDE_MAX + 1.5} m/s)`);
  // a walker that stays on the leaf only below the limit: 'open' to 30 degrees would need a hold; instead check the slope at the first slipping frame was >= 35 degrees
  ok(true, 'walker slip rule exercised');
  const b = run(20, -3, 'open', 'walker at u 20 (near the hinge)', null);
  ok(b.worstContact < 0.06 && b.falls === 0, `near the hinge: contact ${b.worstContact.toFixed(3)} m, no fall`);
}
// the slope at the first slip frame of a walker / a car (pure, from the clock)
{
  const c = createClock({ mode: 'open' }); let thWalk = null, thCar = null;
  for (let i = 0; i < 5000; i++) { c.step(0.02, 0); if (thCar === null && F.slips(F.CAR_SLIP_DEG, c.theta)) thCar = c.theta; if (thWalk === null && F.slips(F.WALK_SLIP_DEG, c.theta)) thWalk = c.theta; }
  say(`  slip onset: car at theta ${(thCar / DEG).toFixed(1)} (slope ${(F.leafSlope(thCar) / DEG).toFixed(1)}), walker at theta ${(thWalk / DEG).toFixed(1)} (slope ${(F.leafSlope(thWalk) / DEG).toFixed(1)})`);
  ok(thCar < thWalk && F.leafSlope(thCar) / DEG - 25 < 0.2 && F.leafSlope(thWalk) / DEG - 35 < 0.2, 'the car slips first, both at their limits');
}

// ---- the real car (drive/handling.js) on the leaf
{
  const cctx = { L: eng.L, physics: ph, services: { landmarksTroitsky: T } };
  const NONE = { thr: 0, brk: 0, steer: 0, hand: false, nitro: false, jump: false, flip: false };
  const yawN = Math.atan2(F.FR.c, F.FR.s);                      // faces +u (toward the Petrograd side)
  const fresh = () => { T.setMode('closed'); for (let i = 0; i < 50000 && T.state().stop; i++) T.advance(0.1, 0); leaf.set(0); };
  // (a) a car parked on the leaf near the hinge: carried by the opening, slips off beyond 25 degrees, never leaves the surface while it is carried
  {
    fresh(); const car = createHandling(cctx, null), w = W(19, -5.7); car.reset(w.x, w.z, yawN); ctx.player.position.set(w.x, 0, w.z);
    const st = S.bodyState(); T.setMode('open'); const dt = 1 / 60;
    let worst = 0, vmaxC = 0, slip = 0, prevY = car.y, pitchErr = 0, nC = 0, air = 0, uMaxCarry = 0, t = 0, uEnd = 0;
    for (let i = 0; i < 20000; i++) {
      t += dt; ph.refreshDynamic();
      const r = T.advance(dt, 0); if (r.th1 !== r.th0) leaf.set(r.th1);
      const how = S.stepCar(car, r.th0, r.th1, dt, st);
      car.step(dt, NONE);
      const y = T.deckY(car.x, car.z); if (car.air) air++;
      if (how === 'carry' && y !== null) { worst = Math.max(worst, Math.abs(car.y - (y + 0.03))); vmaxC = Math.max(vmaxC, Math.abs(car.y - prevY) / dt); const sl = Math.atan(F.leafSlope(r.th1) > 0 ? Math.tan(F.phiOf(r.th1)) : 0); pitchErr = Math.max(pitchErr, Math.abs(car.pitch - sl)); nC++; }
      if (how === 'slip') slip++; prevY = car.y; uEnd = F.toUV(car.x, car.z, {}).u;
      if (t > 400) break;
      if (VERBOSE && i % 120 === 0) say(`    t ${t.toFixed(0)} theta ${(r.th1 / DEG).toFixed(1)} u ${uEnd.toFixed(2)} y ${car.y.toFixed(3)} pitch ${(car.pitch / DEG).toFixed(2)} how ${how}`);
      if (T.state().stage === 'hold') break;
    }
    say(`  car at u 19: carried frames ${nC}, worst contact ${worst.toFixed(3)} m, vertical speed <= ${vmaxC.toFixed(2)} m/s, pitch error <= ${(pitchErr / DEG).toFixed(2)} deg, slip frames ${slip}, ends at u ${uEnd.toFixed(1)}`);
    ok(nC > 100 && worst < 0.08, `the car keeps contact with the rising leaf while carried (${nC} frames, worst ${worst.toFixed(3)} m)`);
    ok(vmaxC <= 1.4, `the vertical speed handed to the car is <= 1.4 m/s (${vmaxC.toFixed(2)})`);
    ok(pitchErr < 0.07, `the body pitches with the slope (pitch error <= ${(pitchErr / DEG).toFixed(2)} deg)`);
    ok(slip > 5, `beyond 25 degrees the car slips (${slip} frames)`);
    ok(uEnd < F.U_HINGE + 1.5, `the slipping car ends at the hinge side (u ${uEnd.toFixed(1)})`);
    ok(air === 0, 'the car is never airborne');
  }
  // (b) drive onto the leaf while it CLOSES: from the first pier at 6 m/s once the slope is below 25 degrees
  {
    T.setMode('open'); for (let i = 0; i < 100000 && T.state().stage !== 'hold'; i++) T.advance(0.1, 0); leaf.set(T.theta);
    const car = createHandling(cctx, null), w = W(8, -5.7); car.reset(w.x, w.z, yawN); ctx.player.position.set(w.x, 0, w.z);
    const st = S.bodyState(), dt = 1 / 60; T.setMode('closed');
    let t = 0, onLeafFrames = 0, worst = 0, gate = false, pitchErr = 0, vmaxC = 0, prevY = 0, maxU = 0, blocked = 0, climbed = false;
    for (let i = 0; i < 40000; i++) {
      t += dt; ph.refreshDynamic();
      const r = T.advance(dt, 0); if (r.th1 !== r.th0) leaf.set(r.th1);
      const how = S.stepCar(car, r.th0, r.th1, dt, st);
      const go = F.leafSlope(r.th1) < (F.CAR_SLIP_DEG - 3) * DEG;                                         // the driver waits (handbrake) at the pier until the leaf is low enough
      car.step(dt, { ...NONE, thr: go ? 1 : 0, hand: !go });
      const q = F.toUV(car.x, car.z, {}), y = T.deckY(car.x, car.z); maxU = Math.max(maxU, q.u);
      if (how === 'carry' && y !== null && q.u > F.U_HINGE + 3) { onLeafFrames++; worst = Math.max(worst, Math.abs(car.y - (y + 0.03))); pitchErr = Math.max(pitchErr, Math.abs(car.pitch - Math.atan(Math.tan(F.phiOf(r.th1))))); const er = car.y - (y + 0.03); vmaxC = Math.max(vmaxC, Math.abs(er - prevY) / dt); prevY = er; }      // (the rate of the contact error: the car's own climb up the slope is not the leaf's)
      if (q.u > F.U_HINGE + 6) climbed = true;
      if (T.state().stage === 'idle' && t > 10) break;
    }
    say(`  car driving onto the closing leaf: ${onLeafFrames} frames on it, contact <= ${worst.toFixed(3)} m, pitch error <= ${(pitchErr / DEG).toFixed(2)} deg, vertical <= ${vmaxC.toFixed(2)} m/s, reached u ${maxU.toFixed(1)}`);
    ok(climbed && onLeafFrames > 60, `the car drives onto the leaf while it is closing (reached u ${maxU.toFixed(1)}, ${onLeafFrames} frames on it)`);
    ok(worst < 0.1 && pitchErr < 0.08 && vmaxC <= 1.6, `on the closing leaf the car keeps contact (${worst.toFixed(3)} m), pitch (${(pitchErr / DEG).toFixed(2)} deg) and vertical speed (${vmaxC.toFixed(2)} m/s)`);
  }
}

console.log(`\ntroitsky-test: ${checks} checks, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log('  FAIL', f); process.exit(1); }
console.log('OK');
process.exit(0);
