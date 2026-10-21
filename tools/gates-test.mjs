// CPU test of the gate geometry and state machine (src/core/gates.js, docs/AREAS.md section "Arming, hysteresis"). node tools/gates-test.mjs
// Synthetic gate: the border is the segment z = 0, x 0..200; "inward" (0, +1) points into the gate's own area (z > 0). A player at z = d is d metres inside.
import assert from 'node:assert/strict';
import { DEFAULTS, depthFor, chipFor, gateCoords, createGateMachine } from '../src/core/gates.js';

let fails = 0, passes = 0;
const check = (name, fn) => { try { fn(); passes++; console.log('  ok   ' + name); } catch (e) { fails++; console.log('  FAIL ' + name + '\n       ' + String(e.message).split('\n').slice(0, 5).join('\n       ')); } };
const G = { id: 'g', from: 'a', to: 'b', seg: [[0, 0], [200, 0]], inward: [0, 1], zone: 30 };
const H = { id: 'h', from: 'a', to: 'c', seg: [[300, 0], [500, 0]], inward: [0, 1], zone: 30 };
const DT = 1 / 30;

/** move from (x, z0) to (x, z1) at `speed` m/s in `mode`; returns the log of { d, chip, offer } per step (stops at the first offer when stopAtOffer) */
function run(m, { x = 100, z0, z1, speed, mode = 'walk', blocked = false, stopAtOffer = true, settle = 2 }) {
  const out = []; const n = Math.ceil(Math.abs(z1 - z0) / speed / DT); let z = z0;
  for (let i = 0; i < settle / DT; i++) m.update({ dt: DT, x, z, mode, blocked });       // stand still first, so that the speed estimate is 0 at the start
  for (let i = 0; i <= n; i++) {
    z = z0 + (z1 - z0) * Math.min(1, i / n);
    const r = m.update({ dt: DT, x, z, mode, blocked }); out.push({ z, d: z, chip: !!r.chip, offer: r.offer, v: r.v });
    if (stopAtOffer && r.offer) break;
  }
  return out;
}
const firstOffer = (log) => log.find((s) => s.offer);
const firstChip = (log) => log.find((s) => s.chip);
const fresh = (gates = [G], cfg = {}) => { const m = createGateMachine({ gates, config: { graceS: 0, ...cfg } }); return m; };

console.log('geometry:');
check('gateCoords: d is the depth into the own area, s the position along the border', () => { const c = gateCoords(G, 50, 12); assert.equal(c.d, 12); assert.equal(c.s, 50); assert.equal(c.len, 200); const w = gateCoords({ ...G, inward: [1, 0], seg: [[0, 0], [0, 100]] }, 30, 40); assert.equal(w.d, 30); assert.equal(w.s, 40); });
check('depth: a walker 30 m, a vehicle clamp(30 + 0.5 v + v^2/60, 40, 160)', () => {
  assert.equal(depthFor('walk', 20), 30); assert.equal(depthFor('car', 0), 40); assert.equal(Math.round(depthFor('car', 48)), 92); assert.equal(depthFor('car', 79), 160); assert.equal(depthFor('car', 200), 160); assert.equal(depthFor('fly', 30), depthFor('car', 30));
});
check('chip distance: 90 m for a walker, depth + 30 for a vehicle', () => { assert.equal(chipFor('walk', 0), 90); assert.equal(Math.round(chipFor('car', 48)), 122); });

console.log('a walker:');
check('the chip shows from 90 m, the question at 30 m while approaching', () => {
  const log = run(fresh(), { z0: 150, z1: 0, speed: 1.5 });
  assert(Math.abs(firstChip(log).d - 90) < 2, 'chip at ' + firstChip(log).d); const o = firstOffer(log); assert(o, 'no offer'); assert(o.d <= 30 && o.d > 27, 'offer at ' + o.d);
});
check('standing still at 29 m asks nothing; standing within 8 m asks', () => {
  assert.equal(firstOffer(run(fresh(), { z0: 29, z1: 29.01, speed: 0.01, stopAtOffer: false, settle: 5 })), undefined);
  assert(firstOffer(run(fresh(), { z0: 7, z1: 7.01, speed: 0.01, settle: 1 })));
});
check('walking AWAY inside the zone asks nothing', () => assert.equal(firstOffer(run(fresh(), { z0: 12, z1: 80, speed: 1.5, stopAtOffer: false })), undefined));
check('outside the segment (lateral) nothing happens, even close to the border', () => { const log = run(fresh(), { x: -30, z0: 100, z1: 0, speed: 1.5, stopAtOffer: false }); assert(!firstChip(log) && !firstOffer(log)); });
check('a blocked player (panel open, travelling, underground, not started) is never asked and sees no chip', () => { const log = run(fresh(), { z0: 100, z1: 0, speed: 1.5, blocked: true, stopAtOffer: false }); assert(!firstChip(log) && !firstOffer(log)); });
check('no question in the first graceS seconds', () => { const m = createGateMachine({ gates: [G], config: { graceS: 6 } }); let asked = null; for (let i = 0; i < 6 / DT - 2; i++) { const r = m.update({ dt: DT, x: 100, z: 5, mode: 'walk', blocked: false }); if (r.offer) asked = i * DT; } assert.equal(asked, null); assert(m.update({ dt: DT * 4, x: 100, z: 5, mode: 'walk', blocked: false }).offer, 'asked after the grace'); });

console.log('decline:');
check('after a decline: not asked again for 45 s AND until the player has left the zone by 20 m', () => {
  const m = fresh(); const log = run(m, { z0: 60, z1: 0, speed: 1.5 }); const g = firstOffer(log).offer; m.markOpen(g); m.decline(g);
  // the player stays put in the zone for 60 s: no question (time passes but the zone was never left)
  let asked = false; for (let i = 0; i < 60 / DT; i++) if (m.update({ dt: DT, x: 100, z: 5, mode: 'walk', blocked: false }).offer) asked = true; assert(!asked, 'asked while still in the zone');
  // leaves by 25 m beyond the zone (z = 55 + ...), waits out the time, comes back: asked again
  for (let i = 0; i < 2 / DT; i++) m.update({ dt: DT, x: 100, z: 60, mode: 'walk', blocked: false });
  const again = run(m, { z0: 60, z1: 0, speed: 1.5, settle: 0 }); assert(firstOffer(again), 'not asked after leaving the zone and waiting');
});
check('leaving the zone is not enough before the 45 s have passed', () => {
  const m = fresh(); const log = run(m, { z0: 60, z1: 0, speed: 1.5 }); const g = firstOffer(log).offer; m.markOpen(g); m.decline(g);
  for (let i = 0; i < 1 / DT; i++) m.update({ dt: DT, x: 100, z: 70, mode: 'walk', blocked: false });          // left by 40 m after ~1 s
  const again = run(m, { z0: 70, z1: 0, speed: 3, stopAtOffer: false, settle: 0 }); assert(!firstOffer(again), 'asked inside the cooldown');
});
check('a failed preflight cools the gate for 30 s without needing an exit', () => {
  const m = fresh(); const log = run(m, { z0: 60, z1: 0, speed: 1.5 }); const g = firstOffer(log).offer; m.markOpen(g); m.cooldown(g);
  let asked = false; for (let i = 0; i < 29 / DT; i++) if (m.update({ dt: DT, x: 100, z: 5, mode: 'walk', blocked: false }).offer) asked = true; assert(!asked);
  for (let i = 0; i < 3 / DT; i++) if (m.update({ dt: DT, x: 100, z: 5, mode: 'walk', blocked: false }).offer) asked = true; assert(asked, 'asked after 30 s');
});
check('a question that is open is not asked twice', () => { const m = fresh(); m.update({ dt: DT, x: 100, z: 90, mode: 'walk', blocked: false }); const r = run(m, { z0: 60, z1: 0, speed: 1.5 }); const g = firstOffer(r).offer; m.markOpen(g); let n = 0; for (let i = 0; i < 100; i++) if (m.update({ dt: DT, x: 100, z: 3, mode: 'walk', blocked: false }).offer) n++; assert.equal(n, 0); });

console.log('vehicles and flyers:');
check('a car at 30 m/s is asked at its stopping depth (30 + 15 + 15 = 60 m), a car at 60 m/s at 120 m', () => {
  const a = firstOffer(run(fresh(), { z0: 300, z1: 0, speed: 30, mode: 'car' })); assert(a && Math.abs(a.d - 60) < 3, 'at ' + a?.d);
  const b = firstOffer(run(fresh(), { z0: 400, z1: 0, speed: 60, mode: 'car' })); assert(b && Math.abs(b.d - 120) < 4, 'at ' + b?.d);
});
check('the chip of a car shows 30 m before its question', () => { const l = run(fresh(), { z0: 300, z1: 0, speed: 30, mode: 'car', stopAtOffer: false }); const c = firstChip(l), o = firstOffer(l); assert(c.d - o.d > 25 && c.d - o.d < 40, `${c.d} ${o.d}`); });
check('a flyer may overshoot the border by up to 100 m and is still asked, a walker beyond the segment end is not', () => {
  const fly = firstOffer(run(fresh(), { x: 260, z0: 150, z1: 20, speed: 10, mode: 'fly' })); assert(fly, 'a flyer 60 m beyond the end of the segment is asked');
  const walk = firstOffer(run(fresh(), { x: 260, z0: 60, z1: 5, speed: 1.5, mode: 'walk', stopAtOffer: false })); assert(!walk, 'a walker 60 m beyond the end is not');
});
check('a flyer that is past the border (d < 0) is still asked', () => { const m = fresh(); const r = firstOffer(run(m, { z0: 10, z1: -40, speed: 10, mode: 'fly' })); assert(r, 'no offer'); });

console.log('teleports:');
check('a jump of hundreds of metres does not look like speed: no question on landing next to the border while the estimate is held', () => {
  const m = fresh(); for (let i = 0; i < 60; i++) m.update({ dt: DT, x: 100, z: 300, mode: 'walk', blocked: false });
  m.teleported();
  let asked = false; for (let i = 0; i < 1.4 / DT; i++) { const r = m.update({ dt: DT, x: 100, z: 25, mode: 'walk', blocked: false }); if (r.offer) asked = true; }
  assert(!asked, 'asked in the hold');
});
check('an unannounced jump is detected as one', () => { const m = fresh(); for (let i = 0; i < 60; i++) m.update({ dt: DT, x: 100, z: 300, mode: 'car', blocked: false }); const r = m.update({ dt: DT, x: 100, z: 25, mode: 'car', blocked: false }); assert.equal(r.v, 0); });

console.log('several gates:');
check('the nearest gate is the chip, each gate has its own state', () => {
  const m = fresh([G, H]); const l = run(m, { x: 400, z0: 100, z1: 0, speed: 1.5, stopAtOffer: false }); const o = firstOffer(l); assert.equal(o.offer.id, 'h');
  m.markOpen(o.offer); m.decline(o.offer);
  const g = firstOffer(run(m, { x: 100, z0: 100, z1: 0, speed: 1.5, settle: 0 })); assert.equal(g.offer.id, 'g');          // declining h says nothing about g
});


console.log('preflight (the real logic, fakes for the network):');
{
  const { createGates } = await import('../src/core/gates.js');
  const { REGISTRY } = await import('../src/areas/registry.js');
  const mk = (over = {}, params = new URLSearchParams('devgates=1')) => {
    const doc = { getElementById: () => null, documentElement: { classList: { contains: () => false } }, body: { classList: { contains: () => false } } };
    const win = { location: { href: 'http://h/index.html', search: '' }, addEventListener() {} };
    const ctx = { onUpdate() {}, drive: null };
    return createGates({ ctx, player: { inputLock: 0, riding: false, isUnderground: () => false }, camera: { position: {} }, ui: { open: false }, tod: { k: 0, variant: null }, audio: { muted: false }, guard: null, params, A: { ID: 'strip' }, isStarted: () => true, toast() {}, win, doc, ...over });
  };
  const head = (ok) => async () => ({ ok, status: ok ? 200 : 404 });
  const fresh = { revision: 'r1', area: 'strip' };
  const cases = [
    ['a reachable page and a fresh manifest pass', { fetchImpl: head(true), peekManifest: async () => fresh, bakedRevision: 'r1' }, { ok: true }],
    ['a missing page fails as "page"', { fetchImpl: head(false), peekManifest: async () => fresh, bakedRevision: 'r1' }, { ok: false, why: 'page' }],
    ['an unreadable manifest fails as "manifest"', { fetchImpl: head(true), peekManifest: async () => null, bakedRevision: 'r1' }, { ok: false, why: 'manifest' }],
    ['a manifest of another area fails as "area"', { fetchImpl: head(true), peekManifest: async () => ({ revision: 'r1', area: 'north' }), bakedRevision: 'r1' }, { ok: false, why: 'area' }],
    ['a stale manifest fails as "stale"', { fetchImpl: head(true), peekManifest: async () => ({ revision: 'old', area: 'strip' }), bakedRevision: 'r1' }, { ok: false, why: 'stale' }],
    ['a network error fails as "offline"', { fetchImpl: async () => { throw new TypeError('Failed to fetch'); }, peekManifest: async () => fresh, bakedRevision: 'r1' }, { ok: false, why: 'offline' }],
  ];
  for (const [name, deps, want] of cases) {
    const g = mk(deps); const got = await g.preflight('strip');
    check('preflight: ' + name, () => { assert.equal(got.ok, want.ok); if (want.why) assert.equal(got.why, want.why); });
  }
  { const g = mk({}); const got = await g.preflight('nowhere'); check('preflight: an unknown area is refused (no throw)', () => assert.equal(got.ok, false)); }
  { const g = mk({ fetchImpl: head(false) }, new URLSearchParams('devgates=1&baked=0')); const got = await g.preflight('strip'); check('preflight: development flags (baked=0) skip the manifest check', () => assert(got.ok && got.dev)); }
  check('the registry has the area the dev gate leads to', () => assert(REGISTRY.strip));
}

console.log(`gates-test: ${passes} passed, ${fails} failed`);
console.log(fails ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(fails ? 1 : 0);
