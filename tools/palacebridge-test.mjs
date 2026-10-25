// palacebridge-test.mjs - the Palace Bridge and its TWO opening bascule leaves (module landmarksPalaceBridge, docs/AREAS.md 13.10), headless, CPU only, no GPU / browser:
//   node tools/area.mjs palace tools/palacebridge-test.mjs [--quiet | --verbose]        (npm run palacebridge)
// 1. the wiring: the module is in the palace MODULES (after streets and bridges, before traffic / people), its deck service is in HOOKS.deckServices, it claims nothing (the bridges module keeps the ways), the claims table
//    lists it, the whole bridge lies in the territory, the bridges module draws all of the bridge but the bascule span when the module is in the build list (and the whole bridge when it is not);
// 2. the kinematics (lib/bascule.js makeLeaf + landmarksPalaceBridge/frame.js): the two hinges are the pier faces, the closed leaves are the deck profile and meet at the midspan, the heights rise with the angle, the slope is the
//    elevation, the carry, the vertical speed of a carried body <= 1.3 m/s over the cycle, the two leaves rotate in OPPOSITE senses, the footing rule (walker 35, car 25 degrees);
// 3. the schedule (schedule.js + lib/bascule.js createClock): the STOP flag is raised before the leaves move and released only after they lie and the arms are up, theta is continuous, the easing, the modes, the night rule,
//    the offset from the Troitsky Bridge (they never warn at the same moment);
// 4. the service: deckY on the closed bascule span equals the closed bridge's profile, on an open bridge it is the live surface of each leaf, null in the gap, the lift of the feet;
// 5. the NPC hooks: the stop lines on the lanes of the two carriageways (real geometry) and the signal that reads red while the flag is up; the pedestrian step test through a closed gate (inward only), the people hooks;
// 6. the REAL modules built headless (tools/tauride/lib/stub-env.mjs: bridges + landmarksPalaceBridge): triangles, the closed deck is the same as before at every point (services.bridges.deckY, the physics floor), the gap is empty
//    when open, the transform chain of the leaves (both senses), the floor ramps equal deckY at every angle, the dynamic rails follow the leaves, the real Player and the real drive/handling.js car on each leaf through a cycle
//    (contact, carry, slip at 35 / 25 degrees, the car drives onto a closing leaf), and the module's own frame loop carries a walker.
import assert from 'node:assert/strict';
import * as F from '../src/world/landmarksPalaceBridge/frame.js';
import * as BA from '../src/world/lib/bascule.js';
import { CFG, createPalaceClock, ease } from '../src/world/landmarksPalaceBridge/schedule.js';
import * as S from '../src/world/landmarksPalaceBridge/service.js';
import { createClock as createTroitskyClock } from '../src/world/landmarksTroitsky/schedule.js';
import * as A from '../src/areas/palace/area.js';
import { REGISTRY } from '../src/areas/registry.js';
import { HOOKS } from '../src/world/lib/area-tables.js';
import { OWNS_TABLE } from '../src/world/lib/owns-table.js';
import * as L from '../src/world/layout.js';
import { ROADS, BRIDGES } from '../src/world/data/city.js';

const QUIET = process.argv.includes('--quiet'), VERBOSE = process.argv.includes('--verbose');
if (process.env.AREA !== 'palace') { console.error('run it as the palace: node tools/area.mjs palace tools/palacebridge-test.mjs'); process.exit(2); }
const fails = []; let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails.push(msg); console.log('  FAIL', msg); } };
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: ${typeof a === 'number' ? a.toFixed(4) : a} vs ${b} (+-${tol})`);
const say = (s) => { if (!QUIET) console.log(s); };
const section = (s) => say('\n' + s);
const DEG = Math.PI / 180;
const W = (u, v) => F.toWorld(u, v, {});
const [LA, LB] = S.LEAVES, TH = F.THETA_MAX;

// ------------------------------------------------------------------ 1. the wiring
section('1. the wiring');
{
  const m = A.MODULES, i = m.indexOf('landmarksPalaceBridge');
  ok(i > m.indexOf('bridges') && i > m.indexOf('streets') && i < m.indexOf('traffic') && i < m.indexOf('people'), `landmarksPalaceBridge is after streets and bridges, before traffic and people (index ${i})`);
  ok(HOOKS.deckServices.includes('landmarksPalaceBridge'), `HOOKS.deckServices names the service: [${HOOKS.deckServices}]`);
  ok(!A.GROUPS.landmarksPalaceBridge, 'the module claims nothing: no GROUPS key (the bridges module keeps the ways)');
  ok(Array.isArray(OWNS_TABLE.landmarksPalaceBridge) && OWNS_TABLE.landmarksPalaceBridge.length === 0, 'the generated claims table lists the module with an empty claim (node tools/owns-table.mjs)');
  ok(A.LABELS.landmarksPalaceBridge && /[а-я]/i.test(A.LABELS.landmarksPalaceBridge), 'the loading label is in Russian');
  const ids = new Set([...ROADS.map((r) => r.id), ...BRIDGES.map((r) => r.id)]);
  for (const id of F.WAY_IDS) { ok(ids.has(id), `OSM way ${id} is in the data of the palace`); ok(L.groupOf(id) === 'palace', `${id} belongs to the bridges group 'palace'`); }
  // the territory holds the whole bridge (the registry row was not changed)
  let out = 0, nPts = 0; for (let u = -1; u <= 255.5; u += 4) for (const v of [-13.85, 0, 13.85]) { const w = W(u, v); nPts++; if (!L.inPlay(w.x, w.z, 0)) out++; }
  ok(out === 0, `the deck u -1 .. 255.5 lies inside the play rectangles (${out} of ${nPts} sample points outside; REGISTRY.palace.play)`);
  ok(REGISTRY.palace.play.length > 0, 'REGISTRY.palace.play exists');
  const ex = A.WATER.bridgeZones.find((z) => z.id === 'palace');
  ok(ex && ex.own && ex.key === 'neva', 'the quay stays open for the bridge: the BRIDGE_ZONES row "palace" is unchanged (own, neva)');
  ok(A.WATER.bridgeShades.some((z) => z.id === 'palace-deck'), 'the water shade of the whole deck (BRIDGE_SHADES "palace-deck") is unchanged');
  // the frame is the bridges module's frame
  const P = (await import('../src/world/bridges/palace.js')).PALACE;
  ok(P.cx === F.PALACE.cx && P.cz === F.PALACE.cz && P.b === F.PALACE.b, 'the frame of the module is the frame of bridges/palace.js');
}

// ------------------------------------------------------------------ 2. the kinematics
section('2. the kinematics of the two leaves (lib/bascule.js, frame.js)');
{
  near(F.U0, 96.5, 1e-9, 'leaf A hinges on the inner face of the first bascule pier (u 96.5, the pier body is u 85.3 .. 96.5)'); near(F.U1, 153.9, 1e-9, 'leaf B hinges on the inner face of the second bascule pier (u 153.9 .. 165.1)');
  near(F.U1 - F.U0, 57.4, 1e-9, 'the bascule span between the pier faces is 57.4 m (the real central 55 m + the pier fillets)'); near(LA.S + LB.S, 57.4, 0.02, `the two leaves are ${(LA.S).toFixed(2)} + ${(LB.S).toFixed(2)} m of deck (~28.7 m each)`);
  ok(LA.dir === 1 && LB.dir === -1, 'A points toward +u, B toward -u');
  near(LA.yAt(F.UM, 0), LB.yAt(F.UM, 0), 1e-9, 'closed: the two tips meet at the midspan at one height'); near(LA.yAt(F.UM, 0), F.yDeck(F.UM), 1e-9, 'closed: the tips meet at the deck height of the midspan');
  near(LA.yAt(F.U0, 0), F.yDeck(F.U0), 1e-9, 'closed: leaf A meets the pier deck at its hinge'); near(LB.yAt(F.U1, 0), F.yDeck(F.U1), 1e-9, 'closed: leaf B meets the pier deck at its hinge');
  let dev = 0; for (let u = F.U0; u <= F.UM; u += 0.25) dev = Math.max(dev, Math.abs(LA.yAt(u, 0) - F.yDeck(u))); for (let u = F.UM; u <= F.U1; u += 0.25) dev = Math.max(dev, Math.abs(LB.yAt(u, 0) - F.yDeck(u)));
  ok(dev < 0.04, `closed: the rigid leaves stay within ${dev.toFixed(4)} m of the humped deck profile (the profile is the source's, a leaf is its chord)`);
  for (const lf of [LA, LB]) {
    for (const du of [3, 12, 25]) {
      const u = lf.uHinge + lf.dir * du; let prev = -1e9, mono = true;
      for (let th = 0; th <= TH; th += 0.02) { const y = lf.yAt(u, th); if (!(y === y)) continue; if (y < prev - 1e-9) mono = false; prev = y; }
      ok(mono, `leaf ${lf.id}: the height at ${du} m from the hinge rises with theta while the leaf covers it`);
    }
    const f70 = lf.foot(TH); near(Math.abs(f70.far - lf.uHinge), lf.S * Math.cos(TH + lf.alpha0), 1e-9, `leaf ${lf.id}: the footprint at 70 degrees`);
    near(lf.slope(TH) / DEG, 70 + lf.alpha0 / DEG, 1e-9, `leaf ${lf.id}: the slope of the surface = the elevation angle`);
    for (const th of [0.2, 0.7, 1.1]) { const u = lf.uHinge + lf.dir * 8, y0 = lf.yAt(u, th), y1 = lf.yAt(u + lf.dir * 0.1, th); near(Math.atan2(y1 - y0, 0.1), lf.phi(th), 1e-6, `leaf ${lf.id}: slope at theta ${th}`); }
    // the carry of a material point equals the displacement of the rotating rigid line, toward its own hinge
    for (const [dd, a, b] of [[5, 0, 0.3], [12, 0.3, 0.9], [20, 0, 0.1]]) {
      const u0 = lf.uHinge + lf.dir * dd, s = dd / Math.cos(lf.phi(a)), uNew = lf.uHinge + lf.dir * s * Math.cos(lf.phi(b)), yNew = lf.yHinge + s * Math.sin(lf.phi(b));
      near(lf.carryDu(u0, a, b), uNew - u0, 1e-9, `leaf ${lf.id}: carryDu(${dd}, ${a} -> ${b})`); near(lf.yAt(uNew, b), yNew, 1e-9, `leaf ${lf.id}: the carried point stays on the surface`);
      ok(lf.dir * lf.carryDu(u0, a, b) < 0, `leaf ${lf.id}: a body is carried toward its hinge as the leaf rises`);
    }
  }
  // THE TWO SENSES: the tip of A moves toward -u (back over its pier) and the tip of B toward +u while both rise; the gap opens in the middle
  const tipA = (th) => LA.uHinge + LA.dir * LA.S * Math.cos(LA.phi(th)), tipB = (th) => LB.uHinge + LB.dir * LB.S * Math.cos(LB.phi(th));
  ok(tipA(TH) < tipA(0) - 15 && tipB(TH) > tipB(0) + 15, `opposite senses: the tip of A goes from u ${tipA(0).toFixed(1)} to ${tipA(TH).toFixed(1)}, the tip of B from ${tipB(0).toFixed(1)} to ${tipB(TH).toFixed(1)}`);
  ok(LA.yHinge + LA.S * Math.sin(LA.phi(TH)) > 25 && LB.yHinge + LB.S * Math.sin(LB.phi(TH)) > 25, 'both tips RISE high (the raised leaves stand about 29 m above the street)');
  near(tipB(TH) - tipA(TH), 57.4 - 2 * LA.S * Math.cos(LA.phi(TH)), 0.4, `the gap at 70 degrees is ${(tipB(TH) - tipA(TH)).toFixed(1)} m wide (the real bridge opens its 55 m span wide)`);
  ok(tipB(TH) - tipA(TH) > 35, 'the gap is wide enough to see the Neva through');
  // the vertical speed handed to a carried body (the eased cycle): at most (28.7 m) * max omega
  const clk = createPalaceClock({ mode: 'open' }); let vmax = 0, vfix = 0, wmax = 0;
  for (let i = 0; i < 4000; i++) { clk.step(0.05, 0); for (const lf of [LA, LB]) { vmax = Math.max(vmax, Math.abs(lf.vy(lf.uHinge + lf.dir * lf.S * Math.cos(lf.phi(clk.theta)), clk.omega))); vfix = Math.max(vfix, Math.abs(lf.vy(lf.uHinge + lf.dir * 5, clk.omega))); } wmax = Math.max(wmax, Math.abs(clk.omega)); }
  ok(vmax <= 1.3, `the vertical speed handed to a body carried at the free end stays <= 1.3 m/s (${vmax.toFixed(2)}), max angular speed ${(wmax / DEG).toFixed(2)} deg/s`);
  say(`  max vertical speed of a carried body: ${vmax.toFixed(2)} m/s at the tip, ${vfix.toFixed(2)} m/s 5 m from the hinge; max angular speed ${(wmax / DEG).toFixed(2)} deg/s`);
  // the footing rule
  const c = createPalaceClock({ mode: 'open' }); let thWalk = null, thCar = null;
  for (let i = 0; i < 5000; i++) { c.step(0.02, 0); if (thCar === null && LA.slips(BA.CAR_SLIP_DEG, c.theta)) thCar = c.theta; if (thWalk === null && LA.slips(BA.WALK_SLIP_DEG, c.theta)) thWalk = c.theta; }
  say(`  slip onset: car at theta ${(thCar / DEG).toFixed(1)} (slope ${(LA.slope(thCar) / DEG).toFixed(1)}), walker at theta ${(thWalk / DEG).toFixed(1)} (slope ${(LA.slope(thWalk) / DEG).toFixed(1)})`);
  ok(thCar < thWalk && LA.slope(thCar) / DEG - 25 < 0.2 && LA.slope(thWalk) / DEG - 35 < 0.2, 'the car slips first, both at their limits (25 / 35 degrees)');
  ok(BA.slideAccel(25, 25 * DEG) === 0 && BA.slideAccel(25, 40 * DEG) > 0 && BA.slideAccel(35, 34 * DEG) === 0 && BA.slideAccel(35, 70 * DEG) > BA.slideAccel(35, 40 * DEG), 'the slide acceleration is zero inside the limit, continuous at it, and grows with the slope');
}

// ------------------------------------------------------------------ 3. the schedule
section('3. the schedule (schedule.js)');
{
  const dump = (clk) => { const log = []; let t = 0, prevTh = 0, maxStep = 0, firstWarn = -1, firstMove = -1, release = -1, upAtRelease = 0;
    for (let i = 0; i < 24000 && release < 0; i++) {
      clk.step(0.05, 0); t += 0.05;
      const th = clk.theta; maxStep = Math.max(maxStep, Math.abs(th - prevTh)); prevTh = th;
      if (clk.stop && firstWarn < 0) firstWarn = t;
      if (th > 1e-6 && firstMove < 0) firstMove = t;
      if (firstWarn >= 0 && !clk.stop && release < 0) { release = t; upAtRelease = clk.barrier; }
      if (log.length < 1 || clk.stage !== log[log.length - 1].stage) log.push({ t: +t.toFixed(2), stage: clk.stage });
    }
    return { log, maxStep, firstWarn, firstMove, release, upAtRelease }; };
  const r = dump(createPalaceClock({ mode: 'auto' })); say('  ' + r.log.map((e) => `${e.t}s ${e.stage}`).join(' | '));
  near(r.firstWarn, CFG.FIRST_AT, 0.3, `the first daytime opening is announced FIRST_AT = ${CFG.FIRST_AT} s after the start`);
  ok(r.firstMove - r.firstWarn >= CFG.WARN - 0.3, `the STOP flag is up ${(r.firstMove - r.firstWarn).toFixed(1)} s (>= WARN ${CFG.WARN}) before the leaves move`);
  ok(r.release > 0, 'the cycle ends: the flag drops'); ok(r.upAtRelease === 0, `the arms are up (${r.upAtRelease}) when the flag drops`);
  ok(r.maxStep < 0.0018, `theta is continuous: the largest 0.05 s step is ${(r.maxStep / DEG).toFixed(4)} degrees`);
  const order = r.log.map((e) => e.stage).join('>');
  ok(order === 'idle>warn>opening>hold>closing>clear>idle', `the stages in order: ${order}`);
  const tOpen = r.log.find((e) => e.stage === 'opening').t, tHold = r.log.find((e) => e.stage === 'hold').t, tClose = r.log.find((e) => e.stage === 'closing').t, tClear = r.log.find((e) => e.stage === 'clear').t;
  near(tHold - tOpen, CFG.OPEN_T, 0.2, `OPENING lasts OPEN_T (${CFG.OPEN_T} s)`); near(tClose - tHold, CFG.HOLD, 0.2, 'HOLD'); near(tClear - tClose, CFG.CLOSE_T, 0.2, 'CLOSING lasts CLOSE_T');
  near(r.release - tClear, CFG.RELEASE, 0.2, 'the flag drops RELEASE s after the leaves lie down');
  // the angle: 0 -> 70 degrees with zero speed at both ends (smootherstep)
  const c2 = createPalaceClock({ mode: 'open' }); let peak = 0, wAtEnd = 1, wMid = 0; for (let i = 0; i < 3000; i++) { c2.step(0.05, 0); peak = Math.max(peak, c2.theta); if (c2.stage === 'opening' && Math.abs(c2.p - 0.5) < 0.01) wMid = Math.abs(c2.omega); if (c2.stage === 'hold') wAtEnd = Math.abs(c2.omega); }
  near(peak, TH, 1e-9, 'the leaves open to 70 degrees'); ok(wAtEnd === 0 && wMid > 0, `the easing: still at the end of the opening, ${(wMid / DEG).toFixed(3)} deg/s in the middle`);
  near(ease(0.5), 0.5, 1e-12, 'ease(0.5) = 0.5'); ok(ease(0) === 0 && ease(1) === 1 && ease(0.1) < 0.02, 'ease is 0..1 with a slow start');
  // modes
  const c3 = createPalaceClock({ mode: 'open' }); for (let i = 0; i < 2400; i++) c3.step(0.05, 0);
  ok(c3.stage === 'hold' && c3.stop, `mode open: held open (${c3.stage})`);
  c3.setMode('closed'); let th0 = c3.theta, jump = 0; for (let i = 0; i < 4000 && c3.stage !== 'idle'; i++) { c3.step(0.05, 0); jump = Math.max(jump, Math.abs(c3.theta - th0)); th0 = c3.theta; }
  ok(c3.stage === 'idle' && c3.theta === 0 && !c3.stop && jump < 0.0018, 'mode closed: the leaves lower smoothly and the flag drops');
  const c4 = createPalaceClock({ mode: 'open' }); for (let i = 0; i < 1250; i++) c4.step(0.05, 0);       // 62.5 s: well into the opening
  ok(c4.stage === 'opening', 'opening in progress'); c4.setMode('closed'); const thA = c4.theta; c4.step(0.05, 0); ok(c4.stage === 'closing' && Math.abs(c4.theta - thA) < 0.0018, 'mode closed during the opening: it reverses with no jump');
  // the leaves wait for the span to clear (ready()), at most WARN_MAX; the STOP flag stays up meanwhile and theta stays 0
  const gate = { v: false }, c6 = createPalaceClock({ mode: 'open', ready: () => gate.v }); c6.step(CFG.WARN + 20, 0);
  ok(c6.stage === 'warn' && c6.stop && c6.theta === 0, 'the span is not clear: the warning goes on past WARN, the leaves stay down');
  gate.v = true; c6.step(1, 0); ok(c6.stage === 'opening', 'the span is clear: the leaves start');
  const c7 = createPalaceClock({ mode: 'open', ready: () => false }); c7.step(CFG.WARN_MAX - 1, 0); const stillWarn = c7.stage === 'warn'; c7.step(2, 0);
  ok(stillWarn && c7.stage === 'opening', `a span that never clears does not hold the bridge for ever: it opens after WARN_MAX = ${CFG.WARN_MAX} s`);
  const c5 = createPalaceClock({ mode: 'closed' }); for (let i = 0; i < 20000; i++) c5.step(0.05, 0); ok(c5.stage === 'idle' && c5.theta === 0 && !c5.stop, 'mode closed: never opens');
  // the night rule: the gap is NIGHT_GAP in the white night, DAY_GAP by day (after the first opening)
  const cyc = CFG.WARN + CFG.OPEN_T + CFG.HOLD + CFG.CLOSE_T + CFG.RELEASE;
  const gapOf = (night) => { const c = createPalaceClock({ mode: 'auto' }); let tt = 0, st = [], prev = 'idle'; for (let i = 0; i < 80000 && st.length < 2; i++) { c.step(0.25, night); tt += 0.25; if (prev === 'idle' && c.stage === 'warn') st.push(tt); prev = c.stage; } return { gap: st[1] - st[0] - cyc, first: st[0] }; };
  near(gapOf(1).gap, CFG.NIGHT_GAP, 0.6, `night: a new opening ${CFG.NIGHT_GAP} s after the leaves lay down`); near(gapOf(0).gap, CFG.DAY_GAP, 0.6, `day: a new opening ${CFG.DAY_GAP} s after the leaves lay down`);
  near(gapOf(1).first, CFG.FIRST_NIGHT, 0.3, `night: the first opening comes FIRST_NIGHT = ${CFG.FIRST_NIGHT} s after the start`);
  const ev = createPalaceClock({ mode: 'auto' }); const names = []; for (let i = 0; i < 6000; i++) { ev.step(0.1, 0); names.push(...ev.takeEvents()); }
  ok(names.slice(0, 6).join() === 'warn,opening,open,closing,closed,released', `events of one cycle: ${names.slice(0, 6)}`);
  ok(createPalaceClock({}).state().phase === 'closed', 'the service phase of an idle bridge is closed');
  const st1 = createPalaceClock({ mode: 'open' }); st1.step(CFG.WARN - 2, 0); ok(st1.state().phase === 'closed' && st1.state().stop, 'warn: phase closed, stop up'); st1.step(10, 0); ok(st1.state().phase === 'opening', 'phase opening');
  // OFFSET FROM THE TROITSKY BRIDGE: the two clocks (the real constants of both files) never warn within 30 s of each other over two hours, in either preset
  for (const night of [0, 1]) {
    const a = createTroitskyClock({ mode: 'auto' }), b = createPalaceClock({ mode: 'auto' }); let t = 0, pa = 'idle', pb = 'idle'; const wa = [], wb = [];
    for (let i = 0; i < 28800; i++) { a.step(0.25, night); b.step(0.25, night); t += 0.25; if (pa === 'idle' && a.stage === 'warn') wa.push(t); if (pb === 'idle' && b.stage === 'warn') wb.push(t); pa = a.stage; pb = b.stage; }
    let min = 1e9; for (const x of wa) for (const y of wb) min = Math.min(min, Math.abs(x - y));
    ok(min >= 30 && wa.length > 5 && wb.length > 5, `${night ? 'white night' : 'day'}: the Palace and Troitsky bridges never start a warning within ${min.toFixed(1)} s (< 30 s) of each other over 2 h (${wa.length} / ${wb.length} openings)`);
    near(wb[0] - wa[0], night ? CFG.FIRST_NIGHT - 90 : CFG.FIRST_AT - 100, 0.6, `${night ? 'white night' : 'day'}: the Palace Bridge is ${(wb[0] - wa[0]).toFixed(1)} s behind the Troitsky Bridge`);
  }
}

// ------------------------------------------------------------------ 4. the service
section('4. the service (service.js)');
const svc = S.createService({ mode: 'closed' });
const withTheta = (th) => { const s2 = S.createService({ mode: 'closed' }); Object.defineProperty(s2.clock, 'theta', { get: () => th }); return s2; };
{
  // closed: deckY = the profile over the whole bascule span (continuous in space), null on the fixed deck (the bridges module answers there), null beside the railing
  let maxDiff = 0, maxJump = 0, nPts = 0;
  for (let v = -13.5; v <= 13.5; v += 2.7) {
    let prev = null;
    for (let u = F.U0 + 0.05; u <= F.U1 - 0.05; u += 0.5) {
      const w = W(u, v), y = svc.deckY(w.x, w.z); nPts++;
      ok(y !== null, `deckY is defined at u ${u} v ${v}`); if (y === null) continue;
      maxDiff = Math.max(maxDiff, Math.abs(y - F.yDeck(u))); if (prev !== null) maxJump = Math.max(maxJump, Math.abs(y - prev)); prev = y;
    }
  }
  ok(maxDiff < 0.04, `closed: deckY matches the deck profile within ${maxDiff.toFixed(4)} m on ${nPts} points`);
  ok(maxJump < 0.5 * 0.06 + 0.02, `closed: deckY is continuous along the bascule span (largest 0.5 m step ${maxJump.toFixed(4)} m)`);
  ok(svc.deckY(...Object.values(W(F.U0 - 5, 0))) === null && svc.deckY(...Object.values(W(F.U1 + 5, 0))) === null && svc.deckY(...Object.values(W(125, 15))) === null && svc.deckY(...Object.values(W(40, 0))) === null, 'no service deck on the fixed spans or beside the railing (null: the bridges module answers there)');
  ok(svc.deckLift(...Object.values(W(110, 12.5))) === F.PAVE && svc.deckLift(...Object.values(W(110, 0))) === 0.03, 'the feet stand 0.12 m on the pavement, 0.03 m on the asphalt');
  // the leaf region at several angles: deckY = the surface of the covering leaf, null in the gap, and every point of a footprint is on the leaf of its own side
  for (const th of [0, 0.3, 0.8, TH]) {
    const s2 = withTheta(th); let bad = 0, gap = 0, inFoot = 0; const fa = LA.foot(th), fb = LB.foot(th);
    for (let u = F.U0 + 0.2; u < F.U1 - 0.2; u += 0.7) {
      const w = W(u, 3), y = s2.deckY(w.x, w.z);
      if (u <= fa.far) { inFoot++; if (y === null || Math.abs(y - LA.yAt(u, th)) > 1e-9) bad++; }
      else if (u >= fb.far) { inFoot++; if (y === null || Math.abs(y - LB.yAt(u, th)) > 1e-9) bad++; }
      else { gap++; if (y !== null) bad++; }
    }
    ok(bad === 0, `theta ${(th / DEG).toFixed(0)}: deckY = the leaf surface over the footprints (${inFoot} pts) and null in the gap (${gap} pts)`);
    ok(s2.onLeaf(...Object.values(W(F.U0 + 1, 0))) && s2.onLeaf(...Object.values(W(F.U1 - 1, 0))) && (th === 0 ? true : !s2.onLeaf(...Object.values(W(F.UM, 0)))), `onLeaf at theta ${(th / DEG).toFixed(0)}`);
    ok(s2.leafAt(...Object.values(W(F.U0 + 1, 0))) === 0 && s2.leafAt(...Object.values(W(F.U1 - 1, 0))) === 1, `leafAt: A at its hinge, B at its hinge (theta ${(th / DEG).toFixed(0)})`);
  }
  // time continuity at fixed points on each leaf during the real cycle
  for (const u of [105, 118, 140, 150]) {
    const s3 = S.createService({ mode: 'open' }); const w = W(u, 4); let prev = s3.deckY(w.x, w.z), worst = 0, nulls = 0;
    for (let i = 0; i < 5000; i++) { s3.advance(0.05, 0); const y = s3.deckY(w.x, w.z); if (y === null) { nulls++; prev = null; continue; } if (prev !== null) worst = Math.max(worst, Math.abs(y - prev)); prev = y; }
    ok(worst < 0.12, `time: deckY at u ${u} changes by at most ${worst.toFixed(4)} m per 0.05 s while a leaf is over it (${nulls} frames in the gap)`);
  }
  // the gates
  ok(svc.gates.length === 2 && Math.abs(svc.gates[0].u - F.GATE_S) < 1e-9 && Math.abs(svc.gates[1].u - F.GATE_N) < 1e-9, `two gates: u ${F.GATE_S} (south) and u ${F.GATE_N} (north)`);
  ok(svc.gates[0].u < 85.3 && svc.gates[1].u > 165.1, 'the gates stand outside the two bascule piers');
}

// ------------------------------------------------------------------ 5. the NPC hooks
section('5. the NPC hooks: stop lines, signal, pedestrian step test, people hooks');
{
  const s = S.createService({ mode: 'open' });
  // the REAL geometry of the two one-way carriageways (w362796524 runs toward the Admiralty bank = -u, w362796525 toward the island = +u), one lane each, offset to the lane centre
  const way = (id) => (ROADS.find((r) => r.id === id) || BRIDGES.find((r) => r.id === id));
  const lane = (id, road, dv) => { const w = way(road), a = [w.pts[0], w.pts[1]], b = [w.pts[2], w.pts[3]]; const q0 = F.toUV(a[0], a[1], {}), q1 = F.toUV(b[0], b[1], {}), p = []; for (let k = 0; k <= 40; k++) { const t = k / 40, ww = W(q0.u + (q1.u - q0.u) * t, q0.v + (q1.v - q0.v) * t + dv); p.push([ww.x, ww.z]); } return { id, road, dir: 1, idx: 0, width: 3.6, pts: p, len: Math.hypot(q1.u - q0.u, q1.v - q0.v), speed: 12, u0: q0.u, u1: q1.u }; };
  const lw = lane('LW', 'w362796524', 0), le = lane('LE', 'w362796525', 0), lx = { ...lw, id: 'LX', road: 'w999' };
  ok(lw.u0 > 200 && lw.u1 < 20 && le.u0 < 20 && le.u1 > 200, `the real ways run the length of the bridge (w362796524 u ${lw.u0.toFixed(0)} -> ${lw.u1.toFixed(0)}, w362796525 u ${le.u0.toFixed(0)} -> ${le.u1.toFixed(0)})`);
  const streets = { lanes: [lw, le, lx], stopLines: [], signalState: () => 'amber', signalInfo: () => ({ state: 'amber', remain: 3 }) };
  const n = S.addStopLines(streets, s, F.WAY_IDS);
  ok(n === 2 && streets.stopLines.length === 2, `one stop line per carriageway lane toward the span: ${n}`);
  const sw = streets.stopLines.find((q) => q.lane === 'LW'), se = streets.stopLines.find((q) => q.lane === 'LE');
  near(sw.s, lw.len * (lw.u0 - F.GATE_N) / (lw.u0 - lw.u1), 1.2, 'the island-to-Admiralty carriageway (u 254 -> 1) is stopped at the north gate u 171.5'); near(se.s, le.len * (F.GATE_S - le.u0) / (le.u1 - le.u0), 1.2, 'the Admiralty-to-island carriageway (u 1 -> 254) is stopped at the south gate u 79');
  ok(sw.signal === 'palacebridge-n' && se.signal === 'palacebridge-s', 'the signals are the gate ids');
  ok(streets.signalState('palacebridge-s', 0, 5) === 'green', 'idle bridge: green');
  s.advance(1, 0); ok(s.stop && streets.signalState('palacebridge-s', 0, 5) === 'red' && streets.signalState('palacebridge-n', 0, 5) === 'red', 'the flag is up (warning): both signals red at once, before the leaves move');
  ok(s.theta === 0, 'theta is still 0 in the first second of the warning');
  ok(streets.signalState('other', 0, 5) === 'amber' && streets.signalInfo('other', 0, 5).remain === 3, 'the other signals of the city are untouched');
  ok(S.addStopLines(streets, s, F.WAY_IDS) === 2 && streets.signalState['__palacebridge-'], 'a second call adds lines again but wraps the signals once (the mark)');
  // pedestrians: a step from the outside into the closed span is a wall, the other ways are not
  const so = W(F.GATE_S - 1, 3), si = W(F.GATE_S + 1, 3), no = W(F.GATE_N + 1, -4), ni = W(F.GATE_N - 1, -4);
  ok(s.stepBlocked(so.x, so.z, si.x, si.z), 'south gate: a step in is blocked'); ok(!s.stepBlocked(si.x, si.z, so.x, so.z), 'south gate: a step OUT is free (those already on the span walk off)');
  ok(s.stepBlocked(no.x, no.z, ni.x, ni.z) && !s.stepBlocked(ni.x, ni.z, no.x, no.z), 'north gate: in blocked, out free');
  const wide = W(F.GATE_S - 1, 20), wide2 = W(F.GATE_S + 1, 20); ok(!s.stepBlocked(wide.x, wide.z, wide2.x, wide2.z), 'a step beside the deck is not this gate');
  ok(s.nearGate(so.x, so.z, 3) && !s.nearGate(...Object.values(W(125, 0)), 3), 'nearGate marks only the neighbourhood of the lines');
  ok(s.inGated(...Object.values(W(125, 0))) && !s.inGated(...Object.values(W(40, 0))) && !s.inGated(...Object.values(W(200, 0))), 'inGated: the part between the gates');
  ok(s.inSpan(...Object.values(W(125, 0))) && s.inSpan(...Object.values(W(F.U0 - 2, 5))) && !s.inSpan(...Object.values(W(60, 0))), 'inSpan: the leaves and 3 m beyond their hinges');
  // the people hooks (idempotent, wrap four functions of the nav)
  const calls = []; const nav = { densityFactor: () => 1, fenceNear: () => false, segBlocked: () => false, reliefY: () => null };
  ok(BA.hookPeople(nav, s, 'test') === true && BA.hookPeople(nav, s, 'test') === true, 'hookPeople wraps once (idempotent)');
  const mid = W(125, 0), pavement = W(F.U0 + 3, 12.5);
  ok(nav.densityFactor(mid.x, mid.z) === 0 && nav.densityFactor(...Object.values(W(40, 0))) === 1, 'while the flag is up the part between the gates is a thinned zone (nobody placed there)');
  ok(nav.fenceNear(so.x, so.z) === true && nav.segBlocked(so.x, so.z, si.x, si.z) === true && nav.segBlocked(si.x, si.z, so.x, so.z) === false, 'the gate lines are walls for a step in, not for a step out');
  void calls;
  for (let i = 0; i < 100000 && s.state().stage !== 'hold'; i++) s.advance(0.1, 0);
  ok(Math.abs(nav.reliefY(pavement.x, pavement.z) - (LA.yAt(F.U0 + 3, TH) + 0.12)) < 1e-9, 'the people on a raised leaf ride its surface (reliefY: deckY + the pavement lift)');
  ok(nav.reliefY(mid.x, mid.z) === null, 'no relief in the gap');
  s.setMode('closed'); for (let i = 0; i < 30000 && s.stop; i++) s.advance(0.1, 0);
  ok(!s.stop && s.theta === 0 && streets.signalState('palacebridge-s', 0, 5) === 'green' && !s.stepBlocked(so.x, so.z, si.x, si.z) && nav.densityFactor(mid.x, mid.z) === 1, 'after the leaves lie down the flag drops: green, steps free, the zone is open');
  // the set-down of an NPC person on a steep leaf (sweepPeople): the agent goes outside the gate of its own hinge side
  const placed = []; const sim = { agents: [{ x: W(105, 4).x, z: W(105, 4).z, yaw: 0, hidden: false }, { x: W(145, -4).x, z: W(145, -4).z, yaw: 0, hidden: false }, { x: W(125, 0).x, z: W(125, 0).z, yaw: 0, hidden: false }], place(a, x, z, yaw, lift) { placed.push({ x, z, lift, a }); } };
  const s4 = S.createService({ mode: 'open' }); for (let i = 0; i < 100000 && s4.state().stage !== 'hold'; i++) s4.advance(0.1, 0);
  const swept = BA.sweepPeople(sim, s4.B, s4, F.SET_DOWN), qa = F.toUV(placed[0].x, placed[0].z, {}), qb = F.toUV(placed[1].x, placed[1].z, {});
  ok(swept === 2 && placed.length === 2, `the two NPC people on the raised leaves are set down (${swept}); the one in the gap is not on a leaf`);
  near(qa.u, F.SET_DOWN.A, 1e-6, 'the person on A goes outside the south gate'); near(qb.u, F.SET_DOWN.B, 1e-6, 'the person on B goes outside the north gate');
  // spanClear: traffic / people on the span hold the leaves
  const fake = { services: { traffic: { vehicles: [{ x: mid.x, z: mid.z }] }, people: { sim: { agents: [] } } } };
  ok(BA.spanClear(fake, s) === false, 'a vehicle on the span: not clear'); fake.services.traffic.vehicles = [{ x: W(40, 0).x, z: W(40, 0).z }]; ok(BA.spanClear(fake, s) === true, 'a vehicle on a fixed span far from the leaves: clear');
  fake.services.people.sim.agents = [{ x: W(100, 5).x, z: W(100, 5).z, hidden: false }]; ok(BA.spanClear(fake, s) === false, 'a pedestrian on a leaf: not clear'); fake.services.people.sim.agents[0].hidden = true; ok(BA.spanClear(fake, s) === true, 'a hidden pedestrian does not count');
}

// ------------------------------------------------------------------ 6. the real modules, built headless
section('6. the real modules (stub engine): bridges + landmarksPalaceBridge: build, floor, rails, the real Player and the real car');
const SE = await import('./tauride/lib/stub-env.mjs');
const eng = await SE.loadEngine();
const NAMES = ['bridges', 'landmarksPalaceBridge'];
const { ctx, camera } = SE.makeContext(eng, NAMES);
const { createKnock } = await import('../src/core/knock.js');
const { createHandling } = await import('../src/world/drive/handling.js');
globalThis.document = { pointerLockElement: null, createElement: globalThis.document.createElement };
ctx.knock = createKnock(ctx);
const t0 = Date.now();
await SE.buildModules(eng, ctx, NAMES);
const T = ctx.services.landmarksPalaceBridge, ph = ctx.physics, BR = ctx.services.bridges;
{
  ok(!!T && typeof T.deckY === 'function' && typeof T.state === 'function' && typeof T.setMode === 'function', 'ctx.services.landmarksPalaceBridge = { state, deckY, setMode, ... }');
  say(`  built in ${Date.now() - t0} ms: the module ${T.stats.tris} triangles (${T.stats.rails} rail panels, ${T.stats.arms} barrier arms, ${T.stats.ramps} floor ramps), bridges drew ${BR.stats.per.palace} triangles of the Palace Bridge`);
  ok(T.stats.tris >= 3e3 && T.stats.tris <= 5.7e3, `triangles ${T.stats.tris} within 3 .. 5.7 k`);
  ok(T.stats.arms === 8, `8 barrier arms (2 gates x (2 carriageway booms + 2 pavement booms)): ${T.stats.arms}`);
  ok(T.stats.ramps === 2, 'two floor ramps (one per leaf)');
  ok(ctx._updates.length >= 2, `the module registered its frame update (knock + the module: ${ctx._updates.length})`);
  ok(['palacebridge-leaf-A', 'palacebridge-leaf-B', 'palacebridge-barriers'].every((n) => ctx.dynamicRoot.children.some((c) => c.name === n)), 'the two leaves and the barriers are in the dynamic root (moved by transform)');
  ok(BR.stats.per.palace < 122024 - 2000, `the bridges module no longer draws the bascule span (the Palace Bridge ${BR.stats.per.palace} triangles, 122,024 - 119,022 = ~3,000 less in the whole module)`);
  ok(typeof T.deckAt === 'function', 'the service also answers as deckAt (the Troitsky convention)');
  // the closed bridge is the SAME as before everywhere: services.bridges.deckY (the old chain: traffic, parked cars, nav build) equals the profile, along the whole length and across, and is null beyond
  let maxd = 0, nP = 0, nulls = 0;
  for (const v of [-13.5, -11, -5.7, 0, 5.7, 11, 13.5]) for (let u = -0.9; u <= 255.4; u += 0.6) { const w = W(u, v), y = BR.deckY(w.x, w.z); nP++; if (y === null) { nulls++; continue; } maxd = Math.max(maxd, Math.abs(y - F.yDeck(Math.max(0, Math.min(254.5, u))))); }
  ok(nulls === 0 && maxd < 0.04, `closed: services.bridges.deckY equals the old deck profile within ${maxd.toFixed(4)} m on ${nP} points, no hole (${nulls} nulls)`);
  ok(BR.deckY(...Object.values(W(-8, 0))) === null && BR.deckY(...Object.values(W(265, 0))) === null && BR.deckY(...Object.values(W(125, 15))) === null, 'no deck beyond the abutments or beside the railing');
}
const update = ctx._updates[ctx._updates.length - 1], leaf = T.leaf;
const ud = (th) => { leaf.set(th); leaf.outers.forEach((o) => o.updateMatrixWorld(true)); };
{
  // the transform chain of the moving groups: the tip of each leaf (body x = S) and the foot of its counterweight (body x = -8) in WORLD coordinates equal the formulas of the leaf kinematics at several angles
  const THREE = eng.THREE;
  for (const [i, lf] of [LA, LB].entries()) {
    const body = leaf.bodies[i];
    for (const th of [0, 0.4, 1.0, TH]) {
      ud(th);
      const tip = body.localToWorld(new THREE.Vector3(lf.S, 0, 5)), phi = lf.phi(th), want = W(lf.uHinge + lf.dir * lf.S * Math.cos(phi), 5 * lf.dir);       // (leaf B's local z is -v)
      near(tip.x, want.x, 1e-6, `leaf ${lf.id}, theta ${(th / DEG).toFixed(0)}: the world x of the tip`); near(tip.z, want.z, 1e-6, `leaf ${lf.id}: the world z of the tip`); near(tip.y, lf.yHinge + lf.S * Math.sin(phi), 1e-6, `leaf ${lf.id}: the world y of the tip (it RISES)`);
      const cw = body.localToWorld(new THREE.Vector3(-8, 0, 0)); near(cw.y, lf.yHinge - 8 * Math.sin(phi), 1e-6, `leaf ${lf.id}, theta ${(th / DEG).toFixed(0)}: the counterweight end swings DOWN`);
      const cu = F.toUV(cw.x, cw.z, {}).u; near(cu, lf.uHinge - lf.dir * 8 * Math.cos(phi), 1e-6, `leaf ${lf.id}: the counterweight stays on its pier side of the hinge`);
    }
    const tip70 = F.toUV(...(() => { ud(TH); const p = body.localToWorld(new THREE.Vector3(lf.S, 0, 0)); return [p.x, p.z]; })(), {}).u, tip0 = (() => { ud(0); const p = body.localToWorld(new THREE.Vector3(lf.S, 0, 0)); return F.toUV(p.x, p.z, {}).u; })();
    ok(lf.dir * (tip70 - tip0) < -15, `leaf ${lf.id}: the tip moves BACK toward its own pier (opposite senses of A and B): u ${tip0.toFixed(1)} -> ${tip70.toFixed(1)}`);
  }
  ud(0);
  // the deck surface of each leaf in the world: a point of the deck (body 12, 0, 3) at theta 0 is at the asphalt height of the bridge
  const bodyA = leaf.bodies[0], p0 = bodyA.localToWorld(new THREE.Vector3(12, 0, 3)), q0 = F.toUV(p0.x, p0.z, {}); near(p0.y, F.yDeck(q0.u), 0.04, 'the drawn deck of leaf A at theta 0 is at the closed profile height (the rigid chord: up to 3.5 cm under the arch)');
  // the barrier arms: lifted (idle) they stand up, lowered (flag up) they lie across the lane
  const bar = ctx.dynamicRoot.children.find((c) => c.name === 'palacebridge-barriers'), box = new THREE.Box3();
  T.setMode('closed'); for (let i = 0; i < 100000 && T.state().stop; i++) T.advance(0.1, 0); update(0, 0); bar.updateMatrixWorld(true); const up = box.setFromObject(bar).max.y;
  T.setMode('open'); T.advance(7, 0); update(0, 1); bar.updateMatrixWorld(true); const down = box.setFromObject(bar).max.y;
  ok(T.state().stop && T.state().barrier === 1 && up - down > 5, `the arms: up they reach ${up.toFixed(1)} m, down ${down.toFixed(1)} m (the post), the flag is up`);
  T.setMode('closed'); for (let i = 0; i < 100000 && T.state().stop; i++) T.advance(0.1, 0); update(0, 2); ud(0);
}
const floorAt = (u, v, feet = 60) => { const w = W(u, v); return ph.surfaceAt(w.x, w.z, feet, false, { y: -Infinity, kind: null, item: null }); };
{
  // closed: the physics floor equals deckY on the bascule span and the leaf ramps are the floor there; the fixed spans' ramps are the old ones
  let worst = 0, n = 0, wrongKind = 0, worstOld = 0, nOld = 0;
  for (const v of [-13, -11.4, -9.3, -5.7, 0, 5.7, 9.3, 11.4, 13]) for (let u = F.U0 + 0.3; u < F.U1 - 0.3; u += 1.3) {
    const w = W(u, v), y = T.deckY(w.x, w.z); if (y === null) continue;
    const S2 = floorAt(u, v, y + 0.3); n++; worst = Math.max(worst, Math.abs(S2.y - y)); if (!(S2.item && S2.item.leaf)) wrongKind++;
  }
  for (const v of [-13, -5.7, 0, 5.7, 13]) for (let u = 3; u < 255; u += 2.7) { if (u > F.U0 - 1 && u < F.U1 + 1) continue; const S2 = floorAt(u, v, F.yDeck(u) + 0.3); nOld++; worstOld = Math.max(worstOld, Math.abs(S2.y - F.yDeck(u))); }
  ok(worst < 0.03, `closed: the physics floor equals deckY within ${worst.toFixed(4)} m on ${n} points of the bascule span`);
  ok(wrongKind === 0, `closed: the floor on the bascule span is the leaf ramps (${wrongKind} points are not)`);
  ok(worstOld < 0.05, `closed: the fixed spans' floor is the deck profile within ${worstOld.toFixed(4)} m on ${nOld} points (the old ramps: chords of 5.9 m, unchanged)`);
  // at every angle: the floor over each footprint = leafY, the gap has no leaf floor
  for (const th of [0.2, 0.5, 0.9, 1.2, TH]) {
    ud(th); let w1 = 0, nn = 0, leafOnGap = 0; const fa = LA.foot(th), fb = LB.foot(th);
    for (const v of [-12.5, -3, 0, 4, 12.5]) for (let u = F.U0 + 0.3; u < F.U1 - 0.3; u += 1.1) {
      const lf = u < F.UM ? LA : LB, f = lf === LA ? fa : fb, inside = lf === LA ? u < f.far - 0.15 : u > f.far + 0.15, outside = lf === LA ? u > f.far + 0.2 : u < f.far - 0.2;
      if (inside) { const S2 = floorAt(u, v, lf.yAt(u, th) + 0.3); nn++; w1 = Math.max(w1, Math.abs(S2.y - lf.yAt(u, th))); }
      else if (outside) { const S2 = floorAt(u, v, 60); if (S2.item && S2.item.leaf) leafOnGap++; }
    }
    ok(w1 < 0.01 && leafOnGap === 0, `theta ${(th / DEG).toFixed(0)}: the floor follows the leaves within ${w1.toFixed(4)} m (${nn} pts), no leaf floor in the gap (${leafOnGap})`);
  }
  ud(TH);
  // the gap is OPEN whatever the old chain says: no deck, no ramp (terrain / water bed only); the whole chain agrees
  { T.setMode('open'); for (let i = 0; i < 100000 && T.state().stage !== 'hold'; i++) T.advance(0.1, 0); ud(T.theta);
    const w = W(F.UM, 0); ok(T.theta === TH && T.deckY(w.x, w.z) === null && BR.deckY(w.x, w.z) === null, 'open: the middle of the bridge has no deck in the service nor in services.bridges.deckY');
    for (const [u, v] of [[F.UM, 0], [F.UM - 3, 10], [F.UM + 3, -12]]) { const S2 = floorAt(u, v, 60); ok(S2.kind !== 'ramp' && S2.kind !== 'walk', `open: the floor in the gap at u ${u.toFixed(1)} is the ground (${S2.kind}, y ${S2.y})`); }
    const wa = W(F.U0 + 3, 0), wb = W(F.U1 - 3, 0); ok(Math.abs(BR.deckY(wa.x, wa.z) - LA.yAt(F.U0 + 3, TH)) < 1e-9 && Math.abs(BR.deckY(wb.x, wb.z) - LB.yAt(F.U1 - 3, TH)) < 1e-9, 'open: services.bridges.deckY (traffic, parked cars) reads the live raised leaves');
    T.setMode('closed'); for (let i = 0; i < 100000 && T.state().stop; i++) T.advance(0.1, 0); }
  ud(0);
  // the dynamic rails: at theta = 40 degrees a point on the rail line at s = 14 m is pushed out of each leaf, and the same point on the closed leaf too
  ctx.player.position.set(W(110, 0).x, 0, W(110, 0).z);
  for (const [lf, tag] of [[LA, 'A'], [LB, 'B']]) for (const th of [0, 0.35, 0.7]) {
    ud(th); ph.refreshDynamic();
    const phi = lf.phi(th), s = 14, u = lf.uHinge + lf.dir * s * Math.cos(phi), y = lf.yHinge + s * Math.sin(phi) + F.PAVE, w = W(u, F.HW - 0.14), p = { x: w.x, z: w.z };
    ph.resolve(p, 0.3, y, 1.7); const moved = Math.hypot(p.x - w.x, p.z - w.z);
    ok(moved > 0.25, `leaf ${tag}, theta ${(th / DEG).toFixed(0)}: the railing is a collider at s = 14 m on the moving leaf (a walker on the rail line is pushed ${moved.toFixed(2)} m)`);
    const w2 = W(u, 0), p2 = { x: w2.x, z: w2.z }; ph.resolve(p2, 0.3, y - F.PAVE, 1.7); ok(Math.hypot(p2.x - w2.x, p2.z - w2.z) < 1e-6, `leaf ${tag}, theta ${(th / DEG).toFixed(0)}: the middle of the roadway is free`);
  }
  ud(0); ph.refreshDynamic();
  ctx.player.position.set(W(110, 0).x + 400, 0, W(110, 0).z);
  ph.refreshDynamic(); ok(ph._dynItems.length === 0, 'nobody within 160 m: the leaves add no dynamic boxes (nothing to refresh)');
  ctx.player.position.set(W(110, 0).x, 0, W(110, 0).z); ph.refreshDynamic(); ok(ph._dynItems.length >= 64, `near the leaves: ${ph._dynItems.length} dynamic boxes (rails + kerbs of both leaves, cut to the slope)`);
}

// ---- the real Player on each leaf through a whole cycle (the order of the engine: player.update, then the module's update)
{
  const dom = { addEventListener() {}, removeEventListener() {} };
  const fresh = () => { T.setMode('closed'); for (let i = 0; i < 50000 && T.state().stop; i++) T.advance(0.1, 0); ud(0); };
  const run = (leafIx, du, v0, label) => {
    fresh();
    const lf = [LA, LB][leafIx], u0 = lf.uHinge + lf.dir * du;
    const pl = new eng.Player(camera, dom, ph, eng.L.WORLD.play); pl.enabled = true;
    const w = W(u0, v0); pl.setPose(w.x, w.z, 0, 0); ctx.player.position.set(w.x, 0, w.z);
    const st = S.bodyState(); T.setMode('open');
    let holdT = 0, enginePre = 0; const dt = 1 / 30; let t = 0, worstContact = 0, vmax = 0, vmaxCarry = 0, slipFrames = 0, prevY = pl.pos.y, minY = 1e9, falls = 0, uAtSlip = null;
    for (let i = 0; i < 9000; i++) {
      t += dt; ph.refreshDynamic(); pl.update(dt); ctx.player.position.copy(pl.pos);
      if (st.on) { const yy = T.deckY(pl.pos.x, pl.pos.z); if (yy !== null) enginePre = Math.max(enginePre, Math.abs(pl.pos.y - yy)); }      // the ENGINE's own floor (core/player.js on the live ramps) before the module corrects anything
      if (T.state().stage === 'hold') { holdT += dt; if (holdT > 6) T.setMode('closed'); }
      const r = T.advance(dt, 0); if (r.th1 !== r.th0) leaf.set(r.th1);
      const how = S.stepWalker(pl, r.th0, r.th1, dt, st);
      const q = F.toUV(pl.pos.x, pl.pos.z, {}), y = T.deckY(pl.pos.x, pl.pos.z);
      if (y !== null && how) worstContact = Math.max(worstContact, Math.abs(pl.pos.y - y));
      const vy = Math.abs(pl.pos.y - prevY) / dt; prevY = pl.pos.y; if (how === 'carry') vmaxCarry = Math.max(vmaxCarry, vy); if (how) vmax = Math.max(vmax, vy);
      if (how === 'slip') { slipFrames++; if (uAtSlip === null) uAtSlip = q.u; }
      minY = Math.min(minY, pl.pos.y); if (pl.pos.y < -1.5) falls++;
      if (VERBOSE && i % 300 === 0) say(`    t ${t.toFixed(0)} stage ${T.state().stage} theta ${(r.th1 / DEG).toFixed(1)} u ${q.u.toFixed(2)} y ${pl.pos.y.toFixed(2)} how ${how}`);
      if (T.state().stage === 'idle' && t > 20) break;
    }
    const q = F.toUV(pl.pos.x, pl.pos.z, {});
    say(`  ${label}: contact <= ${worstContact.toFixed(3)} m (the engine floor alone: <= ${enginePre.toFixed(3)} m), vertical speed carried <= ${vmaxCarry.toFixed(2)} m/s (slipping <= ${vmax.toFixed(2)}), slip frames ${slipFrames}, slipped from u ${uAtSlip === null ? '-' : uAtSlip.toFixed(1)}, ends at u ${q.u.toFixed(2)}`);
    return { worstContact, vmax, vmaxCarry, slipFrames, uEnd: q.u, falls, minY, enginePre, lf };
  };
  for (const [ix, du, v0, label] of [[0, 8, 4, 'walker on A, 8 m from the hinge'], [1, 8, -4, 'walker on B, 8 m from the hinge'], [0, 3, 12.5, 'walker on the pavement of A near its hinge'], [1, 15, 12.5, 'walker on the pavement of B, 15 m from the hinge']]) {
    const a = run(ix, du, v0, label);
    ok(a.worstContact < 0.06, `${label}: the walker keeps contact with the moving leaf (worst ${a.worstContact.toFixed(3)} m)`);
    ok(a.enginePre < 0.6, `${label}: the engine's own floor under the live ramps never lets the walker drift by more than ${a.enginePre.toFixed(3)} m between two frames (< 0.6)`);
    ok(a.vmaxCarry <= 1.35, `${label}: the vertical speed handed to the carried walker stays <= 1.35 m/s (${a.vmaxCarry.toFixed(2)})`);
    ok(a.slipFrames > 20, `${label}: beyond 35 degrees the walker slips (${a.slipFrames} frames)`);
    ok(a.lf.dir * (a.uEnd - a.lf.uHinge) < 1.0, `${label}: the slipping walker ends at the hinge side of its leaf (u ${a.uEnd.toFixed(2)})`);
    ok(a.falls === 0 && a.minY > -1.5, `${label}: the walker never falls through (min y ${a.minY.toFixed(2)})`);
    ok(a.vmax <= BA.WALK_SLIDE_MAX + 1.5, `${label}: while slipping the contact speed is capped (${a.vmax.toFixed(2)} <= ${BA.WALK_SLIDE_MAX + 1.5} m/s)`);
  }
  // the module's OWN frame loop (clock + leaves + the carry of ctx.playerObj): a walker at the middle of leaf A rides the cycle and is set down at the hinge
  {
    fresh();
    const pl = new eng.Player(camera, dom, ph, eng.L.WORLD.play); pl.enabled = true; const w = W(F.U0 + 10, 3); pl.setPose(w.x, w.z, 0, 0); ctx.player.position.set(w.x, 0, w.z);
    ctx.playerObj = pl; ctx.drive = null; T.setMode('open');
    let t = 0, worst = 0, rode = 0, holdT = 0; const dt = 1 / 30;
    for (let i = 0; i < 9000; i++) {
      t += dt; ph.refreshDynamic(); pl.update(dt); ctx.player.position.copy(pl.pos);
      if (T.state().stage === 'hold') { holdT += dt; if (holdT > 4) T.setMode('closed'); }
      update(dt, t);
      const y = T.deckY(pl.pos.x, pl.pos.z); if (y !== null && T.theta > 0.05 && T.leafAt(pl.pos.x, pl.pos.z) === 0) { worst = Math.max(worst, Math.abs(pl.pos.y - y)); rode++; }
      if (T.state().stage === 'idle' && t > 20) break;
    }
    const q = F.toUV(pl.pos.x, pl.pos.z, {});
    ok(rode > 300 && worst < 0.06, `the module's frame loop carries the walker: ${rode} frames on the rising leaf, contact <= ${worst.toFixed(3)} m, ends at u ${q.u.toFixed(2)}`);
    ok(q.u < F.U0 + 1.0, 'the module set the walker down on the pier side (the slide)');
    ctx.playerObj = null;
  }
  // a walker steps into the gap of the open bridge and does not stand on air: the floor there is the bed (the water is reachable)
  {
    T.setMode('open'); for (let i = 0; i < 100000 && T.state().stage !== 'hold'; i++) T.advance(0.1, 0); leaf.set(T.theta);
    const pl = new eng.Player(camera, dom, ph, eng.L.WORLD.play); pl.enabled = true; const w = W(F.UM, 0); pl.setPose(w.x, w.z, 0, 0); pl.pos.y = 3; ctx.player.position.set(w.x, 0, w.z);
    for (let i = 0; i < 300; i++) { ph.refreshDynamic(); pl.update(1 / 60); }
    ok(pl.pos.y < 0.5, `a walker dropped into the gap falls (y ${pl.pos.y.toFixed(2)}) and is on the ground / the river bed, not on a phantom deck`);
  }
}

// ---- the real car (drive/handling.js) on the leaves
{
  const cctx = { L: eng.L, physics: ph, services: { landmarksPalaceBridge: T, bridges: BR } };
  const NONE = { thr: 0, brk: 0, steer: 0, hand: false, nitro: false, jump: false, flip: false };
  const yawN = Math.atan2(F.FR.c, F.FR.s);                      // faces +u (toward Vasilyevsky Island)
  const fresh = () => { T.setMode('closed'); for (let i = 0; i < 50000 && T.state().stop; i++) T.advance(0.1, 0); ud(0); };
  // (a) a car parked on a leaf near the hinge, facing uphill (away from the hinge): carried by the opening, slips off beyond 25 degrees, never leaves the surface while carried
  for (const [ix, label] of [[0, 'A'], [1, 'B']]) {
    const lf = [LA, LB][ix]; fresh();
    const car = createHandling(cctx, null), w = W(lf.uHinge + lf.dir * 4, -5.7); car.reset(w.x, w.z, ix === 0 ? yawN : yawN + Math.PI); car.y = T.deckY(w.x, w.z) + 0.03; ctx.player.position.set(w.x, 0, w.z);
    const st = S.bodyState(); T.setMode('open'); const dt = 1 / 60;
    let worst = 0, vmaxC = 0, slip = 0, prevY = car.y, pitchErr = 0, nC = 0, air = 0, t = 0, uEnd = 0, pitchOk = 0;
    for (let i = 0; i < 20000; i++) {
      t += dt; ph.refreshDynamic();
      const r = T.advance(dt, 0); if (r.th1 !== r.th0) leaf.set(r.th1);
      const how = S.stepCar(car, r.th0, r.th1, dt, st);
      car.step(dt, NONE);
      const y = T.deckY(car.x, car.z); if (car.air) air++;
      if (how === 'carry' && y !== null) { worst = Math.max(worst, Math.abs(car.y - (y + 0.03))); vmaxC = Math.max(vmaxC, Math.abs(car.y - prevY) / dt); const pe = Math.abs(car.pitch - lf.phi(r.th1)); pitchErr = Math.max(pitchErr, pe); if (pe < 0.07) pitchOk = Math.max(pitchOk, lf.phi(r.th1)); nC++; }
      if (how === 'slip') slip++; prevY = car.y; uEnd = F.toUV(car.x, car.z, {}).u;
      if (t > 400) break;
      if (VERBOSE && i % 120 === 0) say(`    t ${t.toFixed(0)} theta ${(r.th1 / DEG).toFixed(1)} u ${uEnd.toFixed(2)} y ${car.y.toFixed(3)} pitch ${(car.pitch / DEG).toFixed(2)} how ${how}`);
      if (T.state().stage === 'hold') break;
    }
    say(`  car on leaf ${label}, 4 m from the hinge: carried frames ${nC}, worst contact ${worst.toFixed(3)} m, vertical speed <= ${vmaxC.toFixed(2)} m/s, pitch error <= ${(pitchErr / DEG).toFixed(2)} deg (the engine's pitch follows the slope up to ${(pitchOk / DEG).toFixed(1)} deg), slip frames ${slip}, ends at u ${uEnd.toFixed(1)}`);
    ok(nC > 100 && worst < 0.08, `leaf ${label}: the car keeps contact with the rising leaf while carried (${nC} frames, worst ${worst.toFixed(3)} m)`);
    ok(vmaxC <= 1.4, `leaf ${label}: the vertical speed handed to the car is <= 1.4 m/s (${vmaxC.toFixed(2)})`);
    ok(pitchErr < 0.07, `leaf ${label}: the body pitches with the slope (pitch error <= ${(pitchErr / DEG).toFixed(2)} deg)   [handling.js: fails with the DROP_MAX merge problem, not with this module]`);
    ok(pitchOk > 8 * DEG, `leaf ${label}: the pitch follows the slope at least up to 8 degrees (${(pitchOk / DEG).toFixed(1)}): the part of the contract that holds with and without the handling.js fix`);
    ok(slip > 5, `leaf ${label}: beyond 25 degrees the car slips (${slip} frames)`);
    ok(lf.dir * (uEnd - lf.uHinge) < 1.5, `leaf ${label}: the slipping car ends at the hinge side (u ${uEnd.toFixed(1)})`);
    ok(air === 0, `leaf ${label}: the car is never airborne`);
  }
  // (b) drive onto a leaf while it CLOSES: from the pier at a few m/s once the slope is below 25 degrees
  for (const [ix, label] of [[0, 'A'], [1, 'B']]) {
    const lf = [LA, LB][ix];
    T.setMode('open'); for (let i = 0; i < 100000 && T.state().stage !== 'hold'; i++) T.advance(0.1, 0); leaf.set(T.theta);
    const car = createHandling(cctx, null), w = W(lf.uHinge - lf.dir * 6, -5.7); car.reset(w.x, w.z, ix === 0 ? yawN : yawN + Math.PI); car.y = BR.deckY(w.x, w.z) + 0.03; ctx.player.position.set(w.x, 0, w.z);
    const st = S.bodyState(), dt = 1 / 60; T.setMode('closed');
    let t = 0, onLeafFrames = 0, worst = 0, pitchErr = 0, vmaxC = 0, prevY = 0, maxS = 0, climbed = false;
    for (let i = 0; i < 40000; i++) {
      t += dt; ph.refreshDynamic();
      const r = T.advance(dt, 0); if (r.th1 !== r.th0) leaf.set(r.th1);
      const how = S.stepCar(car, r.th0, r.th1, dt, st);
      const q = F.toUV(car.x, car.z, {}), y = T.deckY(car.x, car.z), sh = lf.dir * (q.u - lf.uHinge); maxS = Math.max(maxS, sh);
      const go = lf.slope(r.th1) < (BA.CAR_SLIP_DEG - 3) * DEG && sh < 14;                              // the driver waits (handbrake) at the pier until the leaf is low enough, creeps at 9 km/h onto it and stops 14 m from the hinge
      car.step(dt, go ? { ...NONE, thr: car.speed < 9 ? 0.5 : 0 } : { ...NONE, hand: true, brk: car.speed > 3 ? 1 : 0 });
      if (how === 'carry' && y !== null && sh > 3) { onLeafFrames++; worst = Math.max(worst, Math.abs(car.y - (y + 0.03))); pitchErr = Math.max(pitchErr, Math.abs(car.pitch - lf.phi(r.th1))); const er = car.y - (y + 0.03); vmaxC = Math.max(vmaxC, Math.abs(er - prevY) / dt); prevY = er; }      // (the rate of the contact error: the car's own climb up the slope is not the leaf's)
      if (sh > 6) climbed = true;
      if (VERBOSE && i % 60 === 0 && sh > -2 && T.state().stage !== 'idle') say(`    b t ${t.toFixed(1)} theta ${(r.th1 / DEG).toFixed(1)} sh ${sh.toFixed(2)} y ${car.y.toFixed(2)} deck ${y === null ? 'null' : y.toFixed(2)} how ${how} fall ${car.fall} v ${car.speed.toFixed(1)} pitch ${(car.pitch / DEG).toFixed(1)}`);
      if (T.state().stage === 'idle' && t > 10) break;
    }
    say(`  car driving onto the closing leaf ${label}: ${onLeafFrames} frames on it, contact <= ${worst.toFixed(3)} m, pitch error <= ${(pitchErr / DEG).toFixed(2)} deg, vertical <= ${vmaxC.toFixed(2)} m/s, reached ${maxS.toFixed(1)} m from the hinge`);
    ok(climbed && onLeafFrames > 60, `leaf ${label}: the car drives onto the leaf while it is closing (reached ${maxS.toFixed(1)} m, ${onLeafFrames} frames on it)`);
    ok(worst < 0.1 && pitchErr < 0.08 && vmaxC <= 1.6, `leaf ${label}: on the closing leaf the car keeps contact (${worst.toFixed(3)} m), pitch (${(pitchErr / DEG).toFixed(2)} deg) and vertical speed (${vmaxC.toFixed(2)} m/s)   [handling.js: the pitch / contact part fails with the merge problem, not with this module]`);
  }
  // (c) the car driving along the CLOSED bridge from the Admiralty bank to the island crosses the bascule span without a bump (the deck is continuous through the hinge lines)
  {
    fresh();
    const car = createHandling(cctx, null), w = W(60, -5.7); car.reset(w.x, w.z, yawN); car.y = BR.deckY(w.x, w.z) + 0.03; ctx.player.position.set(w.x, 0, w.z); const dt = 1 / 60;
    let maxJerk = 0, prevY = car.y, minU = 1e9, reached = 0;
    for (let i = 0; i < 2400; i++) {
      ph.refreshDynamic(); T.advance(dt, 0); car.step(dt, { ...NONE, thr: 0.6 });
      const q = F.toUV(car.x, car.z, {}); reached = Math.max(reached, q.u); if (q.u > F.U0 - 8 && q.u < F.U1 + 8) maxJerk = Math.max(maxJerk, Math.abs(car.y - prevY)); prevY = car.y; minU = Math.min(minU, q.u);
      if (q.u > F.U1 + 12) break;
    }
    ok(reached > F.U1 + 5, `the car drives across the closed bascule span (reached u ${reached.toFixed(1)})`);
    ok(maxJerk < 0.04, `no bump at the hinge lines: the largest height change per 1/60 s over the bascule span is ${maxJerk.toFixed(4)} m`);
  }
}

// ------------------------------------------------------------------ 7. the rails and kerbs of the leaves are breakable (docs/AREAS.md 13.10, the owner's rule of 13.7)
section('7. the fences of the LEAVES break: every rail panel and kerb piece is a knock record that rides on its leaf; a car breaks a standing bay of the closed bridge and falls into the Neva; the rule for what lies on a moving leaf');
{
  const THREE = eng.THREE, bays = leaf.bays, DT = 1 / 60;
  const kUpd = (s) => { for (let t = 0; t < s; t += DT) ctx.knock.update(DT); };
  const settleClosed = () => { T.setMode('closed'); for (let i = 0; i < 100000 && (T.state().stop || T.theta > 0); i++) { const r = T.advance(0.1, 0); if (r.th1 !== r.th0) leaf.set(r.th1); } leaf.set(0); };
  const nearLeaf = () => { const w = W(125, 0); ctx.player.position.set(w.x, 0, w.z); };
  const nBoxes = () => { ph.refreshDynamic(); return ph._dynItems.length; };
  const rails = bays.filter((b) => b.rail), kerbs = bays.filter((b) => !b.rail), RESTING = (r) => r.state === 'rest' || r.state === 'lost';
  settleClosed(); nearLeaf(); ph.refreshDynamic();
  // (a) the audit: every bay of both leaves is a knock record of kind fence whose box is the dynamic one (the record's own source); no plain solid of the module stands on the span; the numbers
  ok(bays.length === T.stats.rails + T.stats.kerbs && rails.length === T.stats.rails && kerbs.length === T.stats.kerbs, `${bays.length} bays: ${rails.length} rail panels + ${kerbs.length} kerb pieces (stats ${T.stats.rails} + ${T.stats.kerbs})`);
  ok(bays.every((b) => b.rec && b.rec.dynamic && b.rec.kind === 'fence' && b.rec.items.length === 0 && b.box === b.rec.src), 'every bay of the leaves is a knock record of kind fence, owns no static collider, and its box is the record\'s own source');
  ok([LA, LB].every((lf) => bays.filter((b) => b.leaf === lf).length === bays.length / 2), 'the two leaves have the same number of bays');
  ok(rails.every((b) => b.len <= 2.5 && b.rec.mass === 60) && kerbs.every((b) => b.len <= 3.7 && b.len > 1.9 && b.rec.mass === 900), 'rail panels <= 2.5 m (60 kg), kerb pieces <= 3.7 m (900 kg, wider than a car): short enough for the slope under them');
  ok(nBoxes() === bays.length && ph._dynItems.every((b) => b.source && b.source.knock && b.source.knock.kind === 'fence' && b.source.knock.state === 'stand'), `${ph._dynItems.length} dynamic boxes near the leaves, every one the source of a standing fence record`);
  {
    const span = ph.items.filter((it) => (it.type === 'box' || it.type === 'cyl') && (() => { const q = F.toUV(it.cx, it.cz, {}); return q.u > F.U0 + 0.3 && q.u < F.U1 - 0.3 && Math.abs(q.v) < F.HV + 1; })());
    ok(span.length === 0, `no solid box or post of the module (or the bridges module) stands on the bascule span: ${span.length}`);
  }
  // the dynamic OBBs are built once and kept while the leaves rest: the same objects at the next refresh (nothing allocated, nothing rewritten); a moving leaf rewrites them in place
  {
    ph.refreshDynamic(); const first = ph._dynItems.slice(); ph.refreshDynamic();
    ok(ph._dynItems.length === first.length && ph._dynItems.every((it, i) => it === first[i]), 'while the leaves rest refreshDynamic hands out the very same collider objects (no per-frame OBB allocation)');
    const y10 = first[0].y1; leaf.set(0.2); ph.refreshDynamic();
    ok(ph._dynItems.every((it, i) => it === first[i]) && first[0].y1 !== y10 && Math.abs(first[0].y1 - first[0].source.y1) < 1e-12, 'a moving leaf rewrites the colliders in place (same objects, new numbers equal to the box they stand for)');
    leaf.set(0);
  }
  // the bay is where the rail / kerb line is at every angle: the record origin, the part offsets, the instance matrix and the box follow the leaf (both leaves, both senses)
  {
    const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), qq = new THREE.Quaternion(), sc = new THREE.Vector3();
    for (const th of [0, 0.3, 0.9, TH, 0.5, 0]) {
      leaf.set(th); let worst = 0, worstBox = 0, worstEnd = 0, n = 0;
      for (const b of bays) {
        if (b.rec.state !== 'stand') continue; n++;
        const lf = b.leaf, phi = lf.phi(th), c = Math.cos(phi), s = Math.sin(phi), uu = lf.uHinge + lf.dir * (b.s0 * c - b.n * s), y = lf.yHinge + b.s0 * s + b.n * c, w = W(uu, b.v), p0 = b.rec.parts[0];
        p0.mesh.getMatrixAt(p0.index, m4); m4.decompose(pos, qq, sc);
        worst = Math.max(worst, Math.hypot(pos.x - w.x, pos.z - w.z, pos.y - y));
        worst = Math.max(worst, Math.hypot(p0.off.x - (pos.x - b.rec.x), p0.off.y - (pos.y - b.rec.y), p0.off.z - (pos.z - b.rec.z)));      // (the rest offset of the knock part is the instance relative to the record origin)
        const t = S.leafBayAt(lf, th, b.s0 + b.len / 2, b.len, b.v, b.k, {}); worstBox = Math.max(worstBox, Math.hypot(b.box.cx - t.cx, b.box.cz - t.cz), Math.abs(b.box.y1 - t.y1), Math.abs(b.box.y0 - t.y0));
        const e = new THREE.Vector3(1, 0, 0).applyQuaternion(qq).multiplyScalar(b.len).add(pos), ue = F.toUV(e.x, e.z, {}).u, want = lf.uHinge + lf.dir * ((b.s0 + b.len) * c - b.n * s);      // the far end of the instance lies on the leaf too
        worstEnd = Math.max(worstEnd, Math.abs(ue - want), Math.abs(e.y - (lf.yHinge + (b.s0 + b.len) * s + b.n * c)));
        const fb = F.toUV(b.rec.x, b.rec.z, {}); worst = Math.max(worst, Math.abs(b.rec.y - (lf.yHinge + (b.s0 + b.len / 2) * s + b.n * c)), Math.abs(fb.u - (lf.uHinge + lf.dir * ((b.s0 + b.len / 2) * c - b.n * s))));
      }
      ok(n === bays.length && worst < 5e-4 && worstBox < 1e-6 && worstEnd < 5e-4, `theta ${(th / DEG).toFixed(0)}: the ${n} standing bays of both leaves sit on them (instance and record <= ${worst.toExponential(1)} m, far end <= ${worstEnd.toExponential(1)}, box <= ${worstBox.toExponential(1)})`);
    }
  }
  // the knock instances live in WORLD space: they are not inside the moving groups (no double transform)
  ok(bays.every((b) => { let o = b.rec.parts[0].mesh; while (o) { if (o === leaf.outers[0] || o === leaf.outers[1]) return false; o = o.parent; } return true; }), 'the knock meshes of the bays are not inside the moving groups (world-frame instances)');
  { settleClosed(); let worst = 0; for (const b of bays) { const q = F.toUV(b.rec.x, b.rec.z, {}); worst = Math.max(worst, Math.abs(b.rec.y - (F.yDeck(q.u) + b.n))); } ok(worst < 0.05, `closed: every bay foot is on the closed deck profile (${worst.toFixed(3)} m)`); }

  // (b) a car on the CLOSED bridge breaks the barrier kerb and a rail panel of a leaf and falls into the Neva (both leaves, both sides); a slow car is held
  const cctx = { L: eng.L, physics: ph, services: { landmarksPalaceBridge: T, bridges: BR } };
  const wl = (x, z) => (eng.L.waterLevelAt ? eng.L.waterLevelAt(x, z) : null);
  const drive = (lf, du, sg, kmh, label, thr = 1, v0 = 8) => {
    settleClosed(); nearLeaf();
    const dir = { x: -sg * F.FR.s, z: sg * F.FR.c }, yaw = Math.atan2(dir.x, dir.z), st = W(lf.uHinge + lf.dir * du, sg * v0), y0 = T.deckY(st.x, st.z);
    const car = createHandling(cctx, null); car.reset(st.x, st.z, yaw); car.y = y0 + 0.03; car.vx = dir.x * kmh / 3.6; car.vz = dir.z * kmh / 3.6;
    ctx.drive = { active: true, car, fx: { sparks() {} } };
    const input = { thr, brk: 0, steer: 0, hand: false, nitro: false }, ev = []; let fell = false, depth = 0;
    const was = new Set(bays.filter((b) => b.rec.state === 'stand').map((b) => b.rec));
    for (let t = 0; t < 7; t += DT) { ph.refreshDynamic(); car.step(DT, input); ctx.knock.update(DT); for (const e of car.events) ev.push({ type: e.type, v: e.v }); if (car.fall) fell = true; depth = Math.max(depth, car.depth); }
    const broke = [...was].filter((r) => r.state !== 'stand' && Math.hypot(r.x - st.x, r.z - st.z) < 14), w = wl(car.x, car.z), q = F.toUV(car.x, car.z, {});
    say(`  ${label}: ${broke.length} bays broke (${broke.map((r) => r.state + ' ' + (r.mass >= 900 ? 'kerb' : 'rail')).join(', ')}), the car ended at u ${q.u.toFixed(1)} v ${q.v.toFixed(1)} y ${car.y.toFixed(2)} (water ${w}), fell ${fell}, events ${JSON.stringify(ev.filter((e) => e.type === 'hit' || e.type === 'land').map((e) => e.type[0] + e.v.toFixed(1)))}`);
    ctx.drive = null;
    return { car, fell, depth, broke, w, q };
  };
  // (65 km/h: the pavement between the kerb and the railing is only 2.4 m wide, so a car loses its speed on the 900 kg kerb piece and needs about 60 km/h to carry on through the railing; the car is centred on a kerb piece: one hit, one piece)
  for (const [lf, sg, label] of [[LA, 1, 'leaf A, east rail'], [LA, -1, 'leaf A, west rail'], [LB, 1, 'leaf B, east rail'], [LB, -1, 'leaf B, west rail']]) {
    const kb = kerbs.filter((b) => b.leaf === lf && Math.sign(b.v) === sg)[3], r = drive(lf, kb.s0 + kb.len / 2, sg, 65, 'closed bridge, ' + label);
    ok(r.broke.some((b) => b.mass < 900), `${label}: a rail panel of the leaf broke`);
    ok(r.broke.some((b) => b.mass >= 900), `${label}: the barrier kerb piece in front of it broke`);
    ok(r.fell && r.w !== null && r.car.y < r.w - 0.5 && Math.abs(r.q.v) > F.HW, `${label}: the car left the bridge through the leaf's rail and is in the Neva (v ${r.q.v.toFixed(1)}, y ${r.car.y.toFixed(2)}, water ${r.w})`);
  }
  { const kb = kerbs.filter((b) => b.leaf === LB && b.v > 0)[2], r = drive(LB, kb.s0 + kb.len / 2, 1, 8, 'a slow car on leaf B at 8 km/h, coasting into the kerb', 0, 7.6); ok(r.broke.length === 0 && Math.abs(r.q.v) < F.ROAD + F.KERB && !r.fell, `a car at 8 km/h is held by the kerb: it breaks nothing and stays on the roadway (v ${r.q.v.toFixed(1)}, broke ${r.broke.length})`); }

  // (c) the rule for what lies on a moving leaf (the same as the Troitsky leaf, 13.8), on leaf A and on leaf B
  for (const lf of [LA, LB]) {
    const mine = (list) => list.filter((b) => b.leaf === lf), pick = (list, sg, s) => mine(list).filter((b) => Math.sign(b.v) === sg && b.rec.state === 'stand').sort((a, b) => Math.abs(a.s0 - s) - Math.abs(b.s0 - s))[0];
    const hitDir = (side) => ({ x: -F.FR.s * side, z: F.FR.c * side }), kn = (b, side, kmh = 40) => { const d = hitDir(side); return ctx.knock.hit(b.rec.x, b.rec.z, kmh, d.x, d.z, 'fence'); };
    const tag = 'leaf ' + lf.id;
    settleClosed(); nearLeaf();
    const total = nBoxes(), standing0 = bays.filter((b) => b.rec.state === 'stand').length;
    ok(total === standing0, `${tag}: closed: one dynamic box per standing bay (${total})`);
    const A = pick(rails, 1, 8), B = pick(rails, -1, 14), K = pick(kerbs, 1, 6);
    ok(kn(A, -1) === A.rec && kn(B, -1) === B.rec && kn(K, -1, 45) === K.rec, `${tag}: the two panels and the kerb piece are the records that were hit`);
    kUpd(5);
    ok(A.rec.state === 'rest' && A.rec.items.length === 1 && A.rec.items[0].y1 - A.rec.y <= 0.45, `${tag}: the east panel hit toward the roadway lies on the pavement as a low rest box (${A.rec.state}, ${A.rec.items.length} box)`);
    ok(B.rec.state === 'lost', `${tag}: the west panel hit toward the water sinks (${B.rec.state})`);
    ok(RESTING(K.rec), `${tag}: the kerb piece broke (${K.rec.state})`);
    ok(nBoxes() === total - 3, `${tag}: the three broken bays gave their dynamic boxes up (${nBoxes()} of ${total})`);
    const restBox = A.rec.items[0];
    // the leaf starts to move: the debris is swept, the standing bays ride along
    T.setMode('open'); for (let i = 0; i < 100000 && T.theta < 0.4; i++) { const r = T.advance(0.1, 0); if (r.th1 !== r.th0) leaf.set(r.th1); }
    ok(A.rec.state === 'lost' && A.rec.items.length === 0 && !ph.items.includes(restBox), `${tag}, moving: the debris of the broken panel is swept (${A.rec.state}, its rest box is out of the physics)`);
    { const p0 = A.rec.parts[0], m = new THREE.Matrix4(); p0.mesh.getMatrixAt(p0.index, m); ok(Math.abs(m.elements[0]) + Math.abs(m.elements[5]) + Math.abs(m.elements[10]) < 1e-9, `${tag}: its instance is hidden`); }
    // a hit at theta = 23 degrees breaks the standing bay from the pose it has NOW, and its box is gone
    const C = pick(rails, 1, 20); ok(C.rec.y > lf.yHinge + 3, `${tag}: the east panel at s ${C.s0.toFixed(1)} m stands ${(C.rec.y - lf.yHinge).toFixed(1)} m above the hinge on the leaf at ${(T.theta / DEG).toFixed(0)} degrees`);
    const nb0 = nBoxes(), y0 = C.rec.y; ok(kn(C, -1, 40) === C.rec, `${tag}: the raised panel is hit`);
    kUpd(0.5); ok(C.rec.state === 'fly' || RESTING(C.rec), `${tag}: ...and breaks from its current pose (${C.rec.state}, started at y ${y0.toFixed(1)})`);
    ok(nBoxes() === nb0 - 1, `${tag}: its dynamic box is gone (${nBoxes()} left of ${nb0})`);
    kUpd(8);
    // the leaf closes: nothing broken comes back, every standing bay is exactly where it started
    settleClosed();
    ok([A, B, C, K].every((b) => b.rec.state !== 'stand'), `${tag}, closed again: the four broken bays stay broken (${[A, B, C, K].map((b) => b.rec.state)})`);
    { let worst = 0, n = 0; for (const b of mine(bays)) { if (b.rec.state !== 'stand') continue; n++; const al = lf.alpha0, uu = lf.uHinge + lf.dir * ((b.s0 + b.len / 2) * Math.cos(al) - b.n * Math.sin(al)), y = lf.yHinge + (b.s0 + b.len / 2) * Math.sin(al) + b.n * Math.cos(al), w = W(uu, b.v); worst = Math.max(worst, Math.hypot(b.rec.x - w.x, b.rec.z - w.z, b.rec.y - y)); } ok(n > 20 && worst < 1e-6, `${tag}: the ${n} standing bays are back on the closed leaf (${worst.toExponential(1)} m)`); }
  }
  // (d) the broken bays are a way off the leaf: a walker on the pavement beside the gap of an east rail of leaf A walks off the closed leaf into the Neva; an intact neighbour holds him
  {
    settleClosed(); nearLeaf();
    const dom = { addEventListener() {}, removeEventListener() {} }, gone = rails.filter((b) => b.leaf === LA && Math.sign(b.v) === 1 && b.rec.state !== 'stand'), stand = rails.filter((b) => b.leaf === LA && Math.sign(b.v) === 1 && b.rec.state === 'stand' && b.s0 > 14);
    ok(gone.length >= 1 && stand.length >= 1, `leaf A has broken east panels (${gone.length}) and standing ones (${stand.length})`);
    const dirx = -F.FR.s, dirz = F.FR.c;
    const go = (b) => {
      const m = W(LA.uHinge + b.s0 + b.len / 2, F.HW - 1.4), pl = new eng.Player(camera, dom, ph, eng.L.WORLD.play); pl.enabled = true; pl.setPose(m.x, m.z, 0, 0); pl.yaw = Math.atan2(-dirx, -dirz); pl.keys.add('KeyW');
      for (let i = 0; i < 180; i++) { ctx.player.position.copy(pl.pos); ph.refreshDynamic(); pl.time += DT; pl.update(DT); } pl.keys.clear(); return F.toUV(pl.pos.x, pl.pos.z, {});
    };
    const q = go(gone[0]); ok(q.v > F.HW + 0.5, `a walker leaves the closed leaf through the gap of the broken panel (v ${q.v.toFixed(2)})`);
    const q2 = go(stand[0]); ok(q2.v < F.HW, `an intact panel still stops him (v ${q2.v.toFixed(2)})`);
  }
  settleClosed();
}

console.log(`\npalacebridge-test: ${checks} checks, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log('  FAIL', f); process.exit(1); }
console.log('OK');
process.exit(0);
assert.ok(true);
