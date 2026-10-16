// Handling numbers of the three garage cars (red coupe, taxi pickup, Lada 2106), headless, NO browser: the real drive/handling.js on an empty flat world.
//   node tools/drive-garage-handling.mjs [--json out.json] [--quiet]
// Measures per car: 0-100 km/h time, speed after 10 s, top speed over a long straight (with and without the nitro), braking distance from 60 km/h and from 100 km/h,
// the steady turning circle at 60 km/h (full lock), the lateral slide after a handbrake turn-in, and checks the ORDER the user asked for:
//   top speed truck < coupe < lada, acceleration truck < coupe < lada, braking distance truck > coupe, mass lada < coupe < truck, and the coupe's old numbers (default tuning) unchanged.
import { createHandling, COUPE_TUNING } from '../src/world/drive/handling.js';
import { SPEC as COUPE_SPEC } from '../src/world/drive/model.js';
import { EYE as COUPE_EYE } from '../src/world/drive/cockpit.js';
import { MASS, TUNING, tuningFor } from '../src/world/drive/cars/tuning.js';

const args = process.argv.slice(2), has = (k) => args.includes(k);
const flat = { inPlay: () => true, heightAt: () => 0, insideBuilding: () => false };
const ph = { surfaceAt: () => ({ y: 0.03, kind: null, item: null }), inHole: () => false, refreshDynamic() {}, querySolids: () => [] };
const ctx = { L: flat, physics: ph, services: {} };
const SPECS = {
  coupe: { ...COUPE_SPEC, mass: MASS.coupe, eye: COUPE_EYE },
  truck: { W: 2.03, R: 0.43, wb: 3.80, front: 2.63, rear: -3.05, hgt: 1.80, len: 5.68, centerZ: -0.21, mass: MASS.truck },
  lada: { W: 1.62, R: 0.285, wb: 2.42, front: 2.09, rear: -2.07, hgt: 1.40, len: 4.16, centerZ: 0.01, mass: MASS.lada },
};
const DT = 1 / 60, KMH = 3.6;
function fresh(id, legacy = false) {
  const car = legacy ? createHandling(ctx) : createHandling(ctx, tuningFor(id, SPECS[id]));
  car.reset(0, 0, 0); return car;
}
const run = (car, seconds, inp, each) => { const n = Math.round(seconds / DT); for (let i = 0; i < n; i++) { car.step(DT, typeof inp === 'function' ? inp(i * DT) : inp); if (each && each(i * DT, car) === false) break; } };
function measure(id, legacy = false) {
  const r = {}, up = { thr: 1, brk: 0, steer: 0, hand: false, nitro: false };
  let car = fresh(id, legacy);
  run(car, 40, up, (t, c) => { if (r.t100 === undefined && c.speed >= 100) r.t100 = +t.toFixed(2); if (Math.abs(t - 10) < DT / 2) { r.v10 = +c.speed.toFixed(1); r.d10 = +c.z.toFixed(0); } });
  r.top = +car.speed.toFixed(1);
  car = fresh(id, legacy); run(car, 40, { ...up, nitro: true }, (t, c) => { if (r.t100n === undefined && c.speed >= 100) r.t100n = +t.toFixed(2); r.topNitro = Math.max(r.topNitro || 0, +c.speed.toFixed(1)); });
  car = fresh(id, legacy); run(car, 6, (t) => ({ ...up, nitro: car.speed > 60 }), (t, c) => { if (Math.abs(t - 6) < 1.5 * DT) r.nitro6 = +c.speed.toFixed(1); });          // the garage test's sprint: gas, the nitro from 60 km/h on, the speed at 6 s
  for (const v0 of [60, 100]) {
    car = fresh(id, legacy);
    run(car, 40, (t) => ({ ...up, thr: car.speed < v0 ? 1 : 0 }), (t, c) => c.speed < v0 - 0.2);      // up to v0
    const z0 = car.z; run(car, 12, { thr: 0, brk: 1, steer: 0, hand: false, nitro: false }, (t, c) => c.speed > 0.5);
    r['brake' + v0] = +(car.z - z0).toFixed(1);
  }
  car = fresh(id, legacy); run(car, 40, (t) => ({ ...up, thr: car.speed < 60 ? 1 : 0.18 }), (t, c) => c.speed < 59.5);
  car.vx = Math.sin(car.yaw) * 60 / KMH; car.vz = Math.cos(car.yaw) * 60 / KMH;
  const pts = []; run(car, 8, { thr: 0.2, brk: 0, steer: 1, hand: false, nitro: false }, (t, c) => { if (t > 3) pts.push([c.x, c.z]); });
  // turning circle from the path: the radius of the circle through three points of the steady part
  const a = pts[0], b = pts[Math.floor(pts.length / 2)], c3 = pts[pts.length - 1];
  const d = 2 * (a[0] * (b[1] - c3[1]) + b[0] * (c3[1] - a[1]) + c3[0] * (a[1] - b[1]));
  const ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c3[1]) + (b[0] ** 2 + b[1] ** 2) * (c3[1] - a[1]) + (c3[0] ** 2 + c3[1] ** 2) * (a[1] - b[1])) / d, uz = ((a[0] ** 2 + a[1] ** 2) * (c3[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c3[0]) + (c3[0] ** 2 + c3[1] ** 2) * (b[0] - a[0])) / d;
  r.turn60 = +Math.hypot(a[0] - ux, a[1] - uz).toFixed(1); r.speedInTurn = +car.speed.toFixed(0);
  // handbrake + steer at 80 km/h: peak lateral slide speed, yaw swing
  car = fresh(id, legacy); run(car, 40, (t) => ({ ...up, thr: car.speed < 80 ? 1 : 0.3 }), (t, c) => c.speed < 79.5);
  let vl = 0; const yaw0 = car.yaw; run(car, 1.2, { thr: 0, brk: 0, steer: 1, hand: true, nitro: false }, (t, c) => { vl = Math.max(vl, Math.abs(c.vL)); });
  r.slideVL = +vl.toFixed(1); r.slideYawDeg = +((car.yaw - yaw0) * 180 / Math.PI).toFixed(0);
  // a hard corner at 100 km/h (full lock, throttle held at 0.3): the peak sideways slide and the speed left after 2 s: a loose car slides earlier and more
  car = fresh(id, legacy); run(car, 40, (t) => ({ ...up, thr: car.speed < 100 ? 1 : 0.3 }), (t, c) => c.speed < 99.5);
  let pk = 0, drifting = 0; run(car, 2, { thr: 0.3, brk: 0, steer: 1, hand: false, nitro: false }, (t, c) => { pk = Math.max(pk, Math.abs(c.vL)); if (c.drifting) drifting += DT; });
  r.corner100VL = +pk.toFixed(1); r.corner100Drift = +drifting.toFixed(2); r.corner100Kmh = +car.speed.toFixed(0);
  // 20 km/h turn-in: how fast the nose swings (rad/s after 0.5 s of full lock at 50 km/h)
  car = fresh(id, legacy); run(car, 40, (t) => ({ ...up, thr: car.speed < 50 ? 1 : 0.2 }), (t, c) => c.speed < 49.5);
  const y1 = car.yaw; run(car, 0.5, { thr: 0.2, brk: 0, steer: 1, hand: false, nitro: false }); r.yawRate50 = +((car.yaw - y1) / 0.5).toFixed(2);
  return r;
}
const res = {}; for (const id of ['coupe', 'truck', 'lada']) res[id] = measure(id);
const old = measure('coupe', true);
if (!has('--quiet')) {
  const rows = ['t100', 'v10', 'd10', 'top', 't100n', 'topNitro', 'nitro6', 'brake60', 'brake100', 'turn60', 'yawRate50', 'corner100VL', 'corner100Drift', 'corner100Kmh', 'slideVL', 'slideYawDeg'];
  console.log('metric'.padEnd(12), 'coupe'.padStart(9), 'truck'.padStart(9), 'lada'.padStart(9), '  truck/coupe  lada/coupe');
  for (const k of rows) console.log(k.padEnd(12), ...['coupe', 'truck', 'lada'].map((i) => String(res[i][k]).padStart(9)), '  ', (res.truck[k] / res.coupe[k]).toFixed(2).padStart(9), (res.lada[k] / res.coupe[k]).toFixed(2).padStart(10));
  console.log('mass kg'.padEnd(12), ...['coupe', 'truck', 'lada'].map((i) => String(MASS[i]).padStart(9)), '  ', (MASS.truck / MASS.coupe).toFixed(2).padStart(9), (MASS.lada / MASS.coupe).toFixed(2).padStart(10));
}
const fails = [];
const need = (ok, msg) => { if (!ok) fails.push(msg); };
const C = res.coupe, T = res.truck, Ld = res.lada;
need(T.top < C.top && C.top < Ld.top, `top speed order truck ${T.top} < coupe ${C.top} < lada ${Ld.top}`);
need(T.t100 > C.t100 && C.t100 > Ld.t100, `0-100 order truck ${T.t100} > coupe ${C.t100} > lada ${Ld.t100}`);
need(T.v10 < C.v10 && C.v10 < Ld.v10, `speed after 10 s order truck ${T.v10} < coupe ${C.v10} < lada ${Ld.v10}`);
need(T.brake60 > C.brake60, `braking from 60 km/h: truck ${T.brake60} m > coupe ${C.brake60} m`);
need(Ld.brake60 > C.brake60, `braking from 60 km/h: lada ${Ld.brake60} m > coupe ${C.brake60} m (soft old brakes)`);
need(MASS.lada < MASS.coupe && MASS.coupe < MASS.truck, 'mass order lada < coupe < truck');
need(T.top / C.top > 0.8 && T.top / C.top < 0.9, `truck top speed ${(T.top / C.top * 100).toFixed(0)} % of the coupe (about 85 %)`);
need(Ld.top / C.top > 1.05 && Ld.top / C.top < 1.12, `lada top speed ${(Ld.top / C.top * 100).toFixed(0)} % of the coupe (about 108 %)`);
need(T.nitro6 < C.nitro6 && C.nitro6 <= Ld.nitro6, `nitro sprint (speed at 6 s) order truck ${T.nitro6} < coupe ${C.nitro6} <= lada ${Ld.nitro6}`);
need(Ld.slideVL > C.slideVL, `the lada slides more than the coupe (${Ld.slideVL} vs ${C.slideVL} m/s)`);
need(Ld.corner100VL > C.corner100VL, `the lada slides sideways more in a 100 km/h corner (${Ld.corner100VL} vs ${C.corner100VL} m/s)`);
need(T.turn60 > C.turn60, `the truck turns wider than the coupe (${T.turn60} vs ${C.turn60} m at 60 km/h)`);
for (const k of Object.keys(C)) need(C[k] === old[k] || Math.abs(C[k] - old[k]) < 1e-9, `the coupe with the registry tuning differs from the legacy createHandling(ctx): ${k} ${C[k]} vs ${old[k]}`);
// ---- the registry never breaks the game: a missing / broken car file drops THAT car (placeholder boxes only on request, for tests)
{
  const { loadGarage, createPlaceholderModel } = await import('../src/world/drive/cars/index.js');
  const { createCarDamage } = await import('../src/world/drive/damage.js');
  const warn = console.warn; let warned = 0; console.warn = () => { warned++; };
  const none = await loadGarage({}, { paths: { truck: './does-not-exist.js', lada: './does-not-exist.js' } });
  need(none.map((e) => e.id).join() === 'coupe' && warned === 2, `a missing truck / lada file leaves the coupe alone (got ${none.map((e) => e.id)}, ${warned} warnings)`);
  const ph2 = await loadGarage({}, { paths: { truck: './does-not-exist.js' }, placeholders: true });
  console.warn = warn;
  need(ph2.map((e) => e.id).join() === 'coupe,truck,lada' && ph2[1].spec.mass === MASS.truck && ph2[1].spec.durability > 1, 'placeholders (tests only) stand in for a missing car with the registry spec');
  // the damage conventions on a placeholder box car: crush on its own spec, shed zones, exact repair
  const { default: THREE_ } = { default: await import('three') };
  const pm = createPlaceholderModel({}, ph2[1].spec), shed = [];
  const dm = createCarDamage(pm, { spec: ph2[1].spec, interior: true, onDetach: (f) => shed.push(f.zone) });
  const g = pm.body.geometry; g.computeBoundingBox(); const front0 = g.boundingBox.max.z;
  dm.hit({ type: 'hit', v: 30, localX: 0, localZ: ph2[1].spec.front, localNX: 0, localNZ: -1 });
  g.computeBoundingBox();
  need(front0 - g.boundingBox.max.z > 0.2 && dm.amount > 0.2, `a placeholder car with the truck's spec crushes at its own front (${(front0 - g.boundingBox.max.z).toFixed(2)} m)`);
  const soft = createCarDamage(createPlaceholderModel({}, ph2[2].spec), { spec: ph2[2].spec }); soft.hit({ type: 'hit', v: 30, localX: 0, localZ: ph2[2].spec.front, localNX: 0, localNZ: -1 });
  const stout = createCarDamage(createPlaceholderModel({}, ph2[1].spec), { spec: ph2[1].spec }); stout.hit({ type: 'hit', v: 30, localX: 0, localZ: ph2[1].spec.front, localNX: 0, localNZ: -1 });
  const mid = createCarDamage(createPlaceholderModel({}, ph2[0].spec), { spec: ph2[0].spec }); mid.hit({ type: 'hit', v: 30, localX: 0, localZ: ph2[0].spec.front, localNX: 0, localNZ: -1 });
  need(stout.amount < mid.amount && mid.amount < soft.amount, `durability order at the same hit: truck ${stout.amount.toFixed(3)} < coupe ${mid.amount.toFixed(3)} < lada ${soft.amount.toFixed(3)}`);
  void THREE_; void shed;
}
if (args.includes('--json')) { const f = args[args.indexOf('--json') + 1]; (await import('node:fs')).writeFileSync(f, JSON.stringify({ res, mass: MASS }, null, 1)); }
void COUPE_TUNING; void TUNING;
if (fails.length) { console.log('FAILED:'); for (const f of fails) console.log(' -', f); process.exit(1); }
console.log('PASS garage handling: order truck < coupe < lada (top speed, acceleration), truck brakes longer, mass order, coupe unchanged');
