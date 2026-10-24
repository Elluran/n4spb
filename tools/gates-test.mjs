// CPU test of the gate geometry and state machine (src/core/gates.js, docs/AREAS.md section "Arming, hysteresis"). node tools/gates-test.mjs
// Synthetic gate: the border is the segment z = 0, x 0..200; "inward" (0, +1) points into the gate's own area (z > 0). A player at z = d is d metres inside.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEFAULTS, depthFor, chipFor, gateCoords, createGateMachine, createGates, planArrival, promptTexts, crossPlaces, isDoor, backLink } from '../src/core/gates.js';
import { REGISTRY, GATES } from '../src/areas/registry.js';
import { decodeHo, makeHo, encodeHo, camParam, parseCamParam } from '../src/core/handoff.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
/** a createGates with fakes for the DOM: over.ctx / player / ui / A ... replace the defaults; the fake ui records every confirm() in ui.asked */
const fakeDoc = () => ({ getElementById: () => null, documentElement: { classList: { contains: () => false } }, body: { classList: { contains: () => false } }, createElement: () => ({ className: '', textContent: '', append() {} }) });
const fakeUi = () => ({ open: false, asked: [], confirm(o) { this.asked.push(o); } });
const mkGates = (over = {}, params = new URLSearchParams('devgates=1')) => {
  const doc = fakeDoc(), win = { location: { href: 'http://h/index.html', search: '' }, addEventListener() {} };
  const ctx = { onUpdate() {}, drive: null };
  return createGates({ ctx, player: { inputLock: 0, riding: false, fly: false, pos: { x: 0, z: 0 }, yaw: 0, pitch: 0, isUnderground: () => false }, camera: { position: {} }, ui: fakeUi(), tod: { k: 0, variant: null }, audio: { muted: false }, guard: null, params, A: { ID: 'strip' }, isStarted: () => true, toast() {}, win, doc, ...over });
};
{
  const mk = mkGates;
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

// ---------------------------------------------------------------------------------------------- M7: indoors, the metro door g3, the places of the other area
const G2 = GATES.find((g) => g.id === 'g2'), G3 = GATES.find((g) => g.id === 'g3'), G1 = GATES.find((g) => g.id === 'g1');
const stripA = await import(pathToFileURL(path.join(root, 'src/world/area.js')).href);
console.log('indoors (M7, docs/AREAS.md 8.7: the Podpisnye Izdaniya bookstore of the North lies inside the prompt zone of g2):');
// the bookstore's interior (w96123542, docs/AREAS.md 8.7: z -249 .. -206; its facade stands on Liteyny at x -201, the shop extends west of it, its middle is (-204.9, -227.8)): an approximate rectangle stands in for the zone
// test of core/zones.js (the real zone is proven by tools/cross-places-test.mjs under the North); the gate g2 is the real row: border z = -205, inward (0, -1), zone 30 m
const inShop = (x, z) => x > -214 && x < -201.5 && z > -249 && z < -206;
/** stand 2 s at (x, z0), then walk to (x, z1) at `speed` (toward the border of g2 when z1 > z0: the strip lies south, z = -205); `indoors(x, z)` feeds the machine's indoors flag */
const walkToBorder = (m, x, z0, z1, { indoors = () => false, speed = 1.5 } = {}) => {
  const out = []; const n = Math.ceil(Math.abs(z1 - z0) / speed / DT); let z = z0;
  for (let i = 0; i < 2 / DT; i++) m.update({ dt: DT, x, z, mode: 'walk', blocked: false, indoors: indoors(x, z) });
  for (let i = 0; i <= n; i++) { z = z0 + (z1 - z0) * Math.min(1, i / n); const r = m.update({ dt: DT, x, z, mode: 'walk', blocked: false, indoors: indoors(x, z) }); out.push({ z, chip: !!r.chip, offer: r.offer }); }
  return out;
};
check('g2 is a border gate and g3 a door; the machine runs border gates only', () => { assert(G2 && !isDoor(G2)); assert(G3 && isDoor(G3)); assert(G1 && !isDoor(G1)); });
check('a walker inside the bookstore at (-206, -230) walking toward the border gets no chip and no offer; on the street at the same depth (-175, -230) he does', () => {
  const inside = walkToBorder(fresh([G2]), -206, -245, -210, { indoors: inShop });
  assert(!firstChip(inside) && !firstOffer(inside), 'offered inside the shop');
  assert(inShop(-206, -230) && !inShop(-175, -230), 'the fixture itself');
  const street = walkToBorder(fresh([G2]), -175, -245, -210, { indoors: inShop });
  assert(firstChip(street), 'no chip on the street'); const o = firstOffer(street); assert(o, 'no offer on the street'); assert(o.z <= -210 && o.z >= -235, 'offered at z ' + o.z);
});
check('stepping out of the shop re-arms the gate: the walk continues on the street and is offered', () => {
  const m = fresh([G2]);
  const inside = walkToBorder(m, -206, -245, -210, { indoors: inShop }); assert(!firstOffer(inside));
  for (let i = 0; i < 1 / DT; i++) m.update({ dt: DT, x: -206 + i * DT * 20, z: -222, mode: 'walk', blocked: false, indoors: inShop(-206 + i * DT * 20, -222) });      // out through the door, eastward
  const street = walkToBorder(m, -190, -222, -208, { indoors: inShop, speed: 1.5 }); assert(firstOffer(street), 'not offered after stepping out');
});
check('indoors does not touch the decline state: a decline inside the zone, then leaving the zone indoors still counts as leaving', () => {
  const m = fresh([G2]); const o = firstOffer(walkToBorder(m, -175, -245, -210)); m.markOpen(o.offer); m.decline(o.offer);
  for (let i = 0; i < 50 / DT; i++) m.update({ dt: DT, x: -175, z: -270, mode: 'walk', blocked: false, indoors: true });      // 65 m from the border (beyond zone + margin), 50 s, "indoors"
  assert(firstOffer(walkToBorder(m, -175, -270, -210)), 'not re-armed');
});
check('the DOM layer: ctx.indoor.zone (core/zones.js) silences the chip and the question; the strip never has it (no zone: isIndoors() is false)', () => {
  const ctx = { onUpdate() {}, drive: null, indoor: { amount: 1, zone: { id: 'podpisnye-shop' } } };
  const player = { inputLock: 0, riding: false, fly: false, pos: { x: -175, z: -210 }, yaw: 0, pitch: 0, isUnderground: () => false };
  const api = mkGates({ ctx, player, A: { ID: 'north' } }, new URLSearchParams(''));
  assert(api && api.gates.map((g) => g.id).join() === 'g2' && api.doors.map((g) => g.id).join() === 'g3', 'the North has g2 and the door g3');
  assert.equal(api.isIndoors(), true);
  for (let i = 0; i < 8 / DT; i++) api.tick(DT);      // 5 m from the border, standing: an offer after the 6 s grace, were he outdoors
  assert.equal(api.chipGate, null); assert.equal(player.inputLock, 0);
  ctx.indoor.zone = null;
  let asked = 0; const api2 = mkGates({ ctx, player, A: { ID: 'north' }, ui: { open: false, confirm() { asked++; } } }, new URLSearchParams(''));
  for (let i = 0; i < 8 / DT; i++) api2.tick(DT);
  assert.equal(asked, 1, 'outdoors at 5 m the question is asked once');
  assert.equal(mkGates({}).isIndoors(), false, 'a ctx without indoor state is outdoors');
});
check('the strip page is unchanged: g1 and the dev gate g0, no door, the default isIndoors is false, the machine knows no door', () => {
  const api = mkGates({}); assert.deepEqual(api.gates.map((g) => g.id), ['g1', 'g0']); assert.deepEqual(api.doors, []); assert.equal(api.isIndoors(), false);
  assert.equal(api.machine.state(G3), null); api.machine.markOpen(G3); api.machine.decline(G3); api.machine.cooldown(G3);      // (no throw: a door is not the machine's)
});

console.log('the metro door g3 (M7, plan 3.3: north -> strip, an interact item at the Chernyshevskaya vestibule):');
check('the registry row: at the vestibule (461.05, -1350.15), r 4, the pose of the strip VIEWS AltDigit1, via door, no reverse', () => {
  assert.equal(G3.from, 'north'); assert.equal(G3.to, 'strip'); assert.deepEqual(G3.at, { x: 461.05, z: -1350.15 }); assert.equal(G3.r, 4); assert.equal(G3.reverse, null);
  assert.deepEqual(G3.pose, { x: 534, z: 125, yaw: 28.61, pitch: 10 }); assert.equal(G3.view, 'AltDigit1');
});
check('the prompt texts of the door name the metro and the page load; a border gate keeps the area texts', () => {
  const T = promptTexts('strip', { gate: G3 }); assert(/Чернышевская/.test(T.title) && /Восстания/.test(T.title), T.title); assert(/25–40/.test(T.scene) && /перезагруз/.test(T.scene), T.scene); assert(/Пешком/.test(T.fine));
  const U = promptTexts('strip', { gate: G2 }); assert(/Новая область/.test(U.title)); assert.equal(U.scene, promptTexts('strip').scene);
});
check('a PLACE asked through the door keeps the area title / scene (no metro ride, no rotunda), names the place and keeps the door\'s walk-out line', () => {
  const place = { key: 'p', label: 'Площадь Восстания', labelEn: 'Vosstaniya Square' }, T = promptTexts('strip', { gate: G3, place }), A = promptTexts('strip');
  assert.equal(T.title, A.title); assert.equal(T.scene, A.scene); assert(/Сразу к месту: Площадь Восстания · Straight to Vosstaniya Square/.test(T.sights), T.sights); assert.equal(T.fine, G3.prompt.fine);
  assert(/Чернышевская/.test(promptTexts('strip', { gate: G3 }).title), 'the door itself still names the metro');
});
{
  const items = [], interact = { add(d) { items.push(d); return d; } };
  const ctx = { onUpdate() {}, drive: null, interact };
  const player = { inputLock: 0, riding: false, fly: false, pos: { x: 458, z: -1350 }, yaw: -Math.PI / 2, pitch: 0, isUnderground: () => false };
  const api = mkGates({ ctx, player, A: { ID: 'north' } }, new URLSearchParams('devgates=1&baked=0'));
  check('createGates registers ONE interact item for the door: id gate-g3 at the door point, radius 4, Russian and English labels, enabled while the game runs', () => {
    assert.equal(items.length, 1); const it = items[0];
    assert.equal(it.id, 'gate-g3'); assert.equal(it.x, 461.05); assert.equal(it.z, -1350.15); assert.equal(it.radius, 4); assert(/Метро/.test(it.label) && /Metro/.test(it.labelEn)); assert.equal(it.enabled(), true);
  });
  const ui = fakeUi(); const api2 = mkGates({ ctx: { onUpdate() {}, drive: null, interact: { add(d) { ctx.door = d; } } }, player, ui, A: { ID: 'north' } }, new URLSearchParams('devgates=1&baked=0'));
  check('E at the door: ui.confirm with the metro title; "Not now" leaves g2 untouched (no decline booked)', () => {
    ctx.door.onUse(); assert.equal(ui.asked.length, 1); assert(/Чернышевская/.test(ui.asked[0].title), ui.asked[0].title); assert.equal(ui.asked[0].yes, 'Загрузить · Load');
    ui.asked[0].onNo(); assert.deepEqual(api2.machine.state(G2), { until: -1e9, needExit: false, open: false });
  });
  let url = null; api2.navigate = (u) => { url = u; };
  const went = await api2.go(G3, 'door');
  check('accepting hands off to index.html at the AltDigit1 pose ON FOOT: cam = 534,125,28.61,10, no fly, ho { via door, gate g3, car null, ret = the vestibule pose }', () => {
    assert.equal(went, true); assert(url, 'no navigation'); const [page, qs] = url.split('?'); assert.equal(page, 'index.html');
    const q = new URLSearchParams(qs); assert.equal(q.get('cam'), '534,125,28.61,10'); assert(!q.has('fly'));
    const ho = decodeHo(q.get('ho'), { to: 'strip' }); assert(ho.ok, ho.why); assert.equal(ho.ho.via, 'door'); assert.equal(ho.ho.gate, 'g3'); assert.equal(ho.ho.car, null); assert.equal(ho.ho.from, 'north');
    assert.deepEqual(ho.ho.ret, { x: 458, z: -1350, yaw: -90, pitch: 0 });
  });
  // a driver at the door: the car stays behind (no car in the hand-off, the pose is the door's, not the car's)
  const drive = { active: true, car: { x: 470, z: -1370, yaw: 0 }, vehicle: { id: 'lada' }, view: { mode: 0 }, damage: { state: { front: 0, rear: 0, left: 0, right: 0 } } };
  let url2 = null; const api3 = mkGates({ ctx: { onUpdate() {}, drive, interact: { add() {} } }, player, A: { ID: 'north' } }, new URLSearchParams('devgates=1&baked=0')); api3.navigate = (u) => { url2 = u; };
  await api3.go(G3, 'door');
  check('a driver who uses the door walks: the hand-off carries no car and the door pose, the return pose is the car\'s', () => {
    const q = new URLSearchParams(url2.split('?')[1]); assert.equal(q.get('cam'), '534,125,28.61,10'); const ho = decodeHo(q.get('ho'), { to: 'strip' }).ho; assert.equal(ho.car, null); assert.equal(ho.ret.x, 470);
  });
  const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
  check('the strip page entered through g3 offers the way back to the North AT THE DOOR: backLink(ho) is north.html?cam=<where he stood> (within the use radius of the door point), the quality tier kept', () => {
    const ho = decodeHo(new URLSearchParams(url.split('?')[1]).get('ho'), { to: 'strip' }).ho, b = backLink(ho, { qName: 'performance', base: 'http://h/index.html' });
    assert(b, 'no link'); const u = new URL(b.url); assert.equal(u.pathname, '/north.html'); assert.equal(u.searchParams.get('q'), 'performance');
    const [x, z, yaw, pitch] = u.searchParams.get('cam').split(',').map(Number); assert.deepEqual([x, z, yaw, pitch], [458, -1350, -90, 0]);
    assert(Math.hypot(x - G3.at.x, z - G3.at.z) <= G3.r, 'the return pose is not within the door radius'); assert(/Север/.test(b.text) && /North/.test(b.text), b.text);
    assert.equal(parseCamParam(u.searchParams.get('cam')).x, 458, 'the URL parses back with the page\'s own ?cam= reader');
  });
  check('planArrival on the strip accepts ho=g3 and places the player at that pose on foot (direct, no rectangle, no car even if a forged ho carries one)', () => {
    const q = new URLSearchParams(url.split('?')[1]);
    const h = planArrival({ L, A: { ID: 'strip' }, params: q }); assert(h && !h.invalid, JSON.stringify(h)); assert.equal(h.mode, 'walk'); assert.equal(h.how, 'direct'); assert.equal(h.gate.id, 'g3');
    assert.deepEqual(h.pose, { x: 534, y: null, z: 125, yaw: 28.61, pitch: 10 });
    const forged = makeHo({ from: 'north', to: 'strip', via: 'door', gate: 'g3', car: { id: 'lada', view: 0, d: [0, 0, 0, 0] } });
    const q2 = new URLSearchParams({ cam: camParam(G3.pose, false), fly: '1', ho: encodeHo(forged) });
    const h2 = planArrival({ L, A: { ID: 'strip' }, params: q2 }); assert.equal(h2.mode, 'walk'); assert.equal(h2.fly, false); assert.equal(h2.pose.y, null); assert.equal(h2.how, 'direct');
  });
  check('a border gate still clamps into its rectangle: g2 with the same ho fields but gate g2 and the strip pose (-1985, -715) lands in the rectangle z -300 .. -230', () => {
    const ho = makeHo({ from: 'north', to: 'strip', via: 'gate', gate: 'g2' });
    const h = planArrival({ L, A: { ID: 'strip' }, params: new URLSearchParams({ cam: '-1985,-715,31.52,6', ho: encodeHo(ho) }) });
    assert(h.pose.z >= -300 && h.pose.z <= -230 && h.pose.x >= -225, JSON.stringify(h.pose));
  });
  check('planArrival via place skips the rectangle: the same pose with via place lands at the place itself; with a car the pose is still the walker\'s (Palace Square has no lane) and the mode is car', () => {
    const ho = makeHo({ from: 'north', to: 'strip', via: 'place', gate: 'g2' });
    const h = planArrival({ L, A: { ID: 'strip' }, params: new URLSearchParams({ cam: '-1985,-715,31.52,6', ho: encodeHo(ho) }) });
    assert.equal(h.how, 'direct'); assert.deepEqual([h.pose.x, h.pose.z, h.pose.yaw], [-1985, -715, 31.52]); assert.equal(h.mode, 'walk');
    const hc = makeHo({ from: 'north', to: 'strip', via: 'place', gate: 'g2', car: { id: 'coupe', view: 0, d: [0, 0, 0, 0] } });
    const h2 = planArrival({ L, A: { ID: 'strip' }, params: new URLSearchParams({ cam: '-1985,-715,31.52,6', ho: encodeHo(hc) }) });
    assert.equal(h2.how, 'direct'); assert.equal(h2.mode, 'car'); assert.deepEqual([h2.pose.x, h2.pose.z], [-1985, -715]);
    const hg = planArrival({ L, A: { ID: 'strip' }, params: new URLSearchParams({ cam: '-1985,-715,31.52,6', ho: encodeHo({ ...hc, via: 'gate' }) }) });
    assert.notEqual(hg.pose.z, -715, 'a border crossing with a car still goes through the rectangle and a lane');
  });
}

console.log('the places of the other area (M7, plan 3.5: CROSS_PLACES -> an optgroup of the HUD list -> the gate question via place):');
check('crossPlaces keeps only rows whose gate leaves this area and leads to the row\'s area; an empty or missing table gives nothing', () => {
  const rows = [{ key: 'a', area: 'north', gate: 'g1' }, { key: 'b', area: 'north', gate: 'g2' }, { key: 'c', area: 'strip', gate: 'g1' }, { key: 'd', area: 'north', gate: 'nope' }, null, { area: 'north', gate: 'g1' }];
  assert.deepEqual(crossPlaces(rows, 'strip').map((p) => p.key), ['a']); assert.deepEqual(crossPlaces(rows, 'north'), []); assert.deepEqual(crossPlaces(undefined, 'strip'), []); assert.deepEqual(crossPlaces([], 'strip'), []);
});
check('the strip\'s table lists 4-6 places of the North through g1, every row with key, Russian label, view, x, z, yaw, pitch; the North\'s lists 4-6 places of the strip through g2', () => {
  const t = stripA.CROSS_PLACES; assert(t.length >= 4 && t.length <= 6, String(t.length));
  for (const p of t) { assert.equal(p.area, 'north'); assert.equal(p.gate, 'g1'); assert(/[А-Яа-я]/.test(p.label), p.key); for (const k of ['x', 'z', 'yaw', 'pitch']) assert(Number.isFinite(p[k]), `${p.key}.${k}`); assert(typeof p.view === 'string'); }
  assert.equal(new Set(t.map((p) => p.key)).size, t.length);
  assert.equal(crossPlaces(t, 'strip').length, t.length, 'every strip row travels through a gate the strip has');
});
{
  const ui = fakeUi(); const player = { inputLock: 0, riding: false, fly: false, pos: { x: 560, z: 192 }, yaw: 0.5, pitch: 0.1, isUnderground: () => false };
  const api = mkGates({ ui, player, A: stripA }, new URLSearchParams('devgates=1&baked=0'));
  const smolny = stripA.CROSS_PLACES.find((p) => p.key === 'smolny-cathedral');
  check('createGates lists the strip\'s places; the gates and doors are as before (g1, g0; none)', () => { assert.equal(api.places.length, stripA.CROSS_PLACES.length); assert.deepEqual(api.gates.map((g) => g.id), ['g1', 'g0']); assert.deepEqual(api.doors, []); });
  check('offerPlace(key) asks the area question with the place in the sights line; "Not now" books nothing on g1; an unknown key asks nothing', () => {
    assert.equal(api.offerPlace('smolny-cathedral'), true); assert.equal(ui.asked.length, 1); assert(/Новая область: Север/.test(ui.asked[0].title));
    ui.asked[0].onNo(); assert.deepEqual(api.machine.state(G1), { until: -1e9, needExit: false, open: false });
    assert.equal(api.offerPlace('nowhere'), false); assert.equal(ui.asked.length, 1);
    assert(/Смольный собор/.test(promptTexts('north', { place: smolny }).sights));
  });
  let url = null; api.navigate = (u) => { url = u; };
  await api.go(G1, 'place', smolny);
  check('accepting lands at the place: north.html?cam=<the place pose>, ho { via place, gate g1 }, the return pose where the player stood', () => {
    const [page, qs] = url.split('?'); assert.equal(page, 'north.html'); const q = new URLSearchParams(qs); assert.equal(q.get('cam'), '2335,-1833,-90,21'); assert(!q.has('fly'));
    const ho = decodeHo(q.get('ho'), { to: 'north' }).ho; assert.equal(ho.via, 'place'); assert.equal(ho.gate, 'g1'); assert.equal(ho.car, null); assert.deepEqual([ho.ret.x, ho.ret.z], [560, 192]);
  });
  player.fly = true; const camera = { position: { x: 560, y: 80, z: 192 } }; let url2 = null;
  const apiF = mkGates({ ui: fakeUi(), player, camera, A: stripA }, new URLSearchParams('devgates=1&baked=0')); apiF.navigate = (u) => { url2 = u; }; await apiF.go(G1, 'place', smolny);
  check('a flyer who picks a place arrives standing at it (no fly, a 4-number cam)', () => { const q = new URLSearchParams(url2.split('?')[1]); assert(!q.has('fly')); assert.equal(q.get('cam'), '2335,-1833,-90,21'); });
  player.fly = false; const drive = { active: true, car: { x: 579, z: 219, yaw: 1 }, vehicle: { id: 'coupe' }, view: { mode: 1 }, damage: { state: { front: 0, rear: 0, left: 0, right: 0 } } }; let url3 = null;
  const apiD = mkGates({ ui: fakeUi(), player, ctx: { onUpdate() {}, drive }, A: stripA }, new URLSearchParams('devgates=1&baked=0')); apiD.navigate = (u) => { url3 = u; }; await apiD.go(G1, 'place', smolny);
  check('a driver who picks a place takes the car along to the place (the arrival resolves the viewpoint as a walker\'s, drive.arrive parks the car beside it: tools/cross-places-test.mjs)', () => { const q = new URLSearchParams(url3.split('?')[1]); assert.equal(q.get('cam'), '2335,-1833,-90,21'); const ho = decodeHo(q.get('ho'), { to: 'north' }).ho; assert.equal(ho.car.id, 'coupe'); assert.equal(ho.ret.x, 579); });
  let url4 = null; const apiG = mkGates({ ui: fakeUi(), player, ctx: { onUpdate() {}, drive }, A: stripA }, new URLSearchParams('devgates=1&baked=0')); apiG.navigate = (u) => { url4 = u; }; await apiG.go(G1, 'gate');
  check('a border crossing (via gate) is unchanged: cam = the car\'s own pose, the car along', () => { const q = new URLSearchParams(url4.split('?')[1]); assert.equal(q.get('cam').split(',')[0], '579'); assert.equal(decodeHo(q.get('ho'), { to: 'north' }).ho.via, 'gate'); });
}

console.log(`gates-test: ${passes} passed, ${fails} failed`);
console.log(fails ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(fails ? 1 : 0);
