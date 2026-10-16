// Real GPU scene regression: crossings in both directions on both pavements,
// the roadway, and by car; rail containment; specialist claims and deck services.
// node tools/belinsky-test.mjs [--full] [--out <screenshot prefix>]
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

async function verify() {
  const { siteById, toWorld, toUV } = await import('/src/world/bridges/sites.js');
  const { bridgeZones } = await import('/src/world/environment/river.js');
  const { groupOf } = await import('/src/world/layout.js');
  const ctx = window.__ctx, P = ctx.playerObj, bridge = ctx.services.bridges;
  const site = siteById('belinsky'), failures = [], results = [];
  const check = (condition, msg) => { if (!condition) failures.push(msg); };
  check(bridge.failed.length === 0, 'bridge builder failures');
  check(ctx.services.landmarksBelinsky?.triangles > 0, 'landmarks missing');
  check(groupOf('w28691685') === 'ciniselli-circus', 'circus claim missing');
  check(groupOf('w96148838') === 'simeon-anna', 'church claim missing');
  check(groupOf('w375582775') === 'belinsky', 'roadway claim missing');
  const gap = bridgeZones().find(z => z.id === 'belinsky');
  check(gap?.own && gap.test(site.cx, site.cz), 'quay gap missing');
  for (const v of [-8.1, 0, 8.1]) for (const direction of [-1, 1]) {
    const start = toWorld(site, -34 * direction, v), end = toWorld(site, 34 * direction, v);
    P.enabled = true; P.inputLock = 0; P.fly = false;
    window.__setCam(start.x, null, start.z, 0, 0);
    P.keys.clear(); P.keys.add('KeyW'); P.keys.add('ShiftLeft');
    let minY = Infinity, maxY = -Infinity, reached = false, rescues = 0;
    const rescue = P.onRescue; P.onRescue = () => rescues++;
    for (let i = 0; i < 1500; i++) {
      const dx = end.x - P.pos.x, dz = end.z - P.pos.z;
      if (Math.hypot(dx, dz) < 0.75) { reached = true; break; }
      P.yaw = Math.atan2(-dx, -dz); P.turn.yaw = 0; P.update(1 / 60);
      minY = Math.min(minY, P.pos.y); maxY = Math.max(maxY, P.pos.y);
    }
    P.keys.clear(); P.onRescue = rescue;
    const result = { walk: v, direction, reached, minY, maxY, rescues, end: toUV(site, P.pos.x, P.pos.z) };
    results.push(result); check(reached && minY > -0.4 && rescues === 0, 'walking crossing failed: ' + JSON.stringify(result));
  }
  // A pedestrian pushing at the outer railing stays on the deck.
  for (const side of [-1, 1]) {
    const start = toWorld(site, 0, side * 8.2);
    window.__setCam(start.x, null, start.z, 0, 0);
    P.enabled = true; P.keys.clear(); P.keys.add('KeyW');
    const outward = toWorld(site, 0, side * 20);
    for (let i = 0; i < 180; i++) { P.yaw = Math.atan2(-(outward.x - P.pos.x), -(outward.z - P.pos.z)); P.turn.yaw = 0; P.update(1 / 60); }
    P.keys.clear(); const uv = toUV(site, P.pos.x, P.pos.z);
    check(Math.abs(uv.v) < 9.53 && P.pos.y > 0, 'railing containment failed');
  }
  const drive = window.__drive;
  for (const direction of [-1, 1]) {
    const start = toWorld(site, -34 * direction, 2.0);
    drive.teleport(start.x, start.z, Math.atan2(direction * Math.cos((site.b - 90) * Math.PI / 180), direction * Math.sin((site.b - 90) * Math.PI / 180)));
    let worstError = 0, deckFrames = 0, minY = Infinity;
    drive.sim(4, { thr: 1 }, (i, car) => {
      const dy = bridge.deckY(car.x, car.z); minY = Math.min(minY, car.y);
      if (dy !== null) { deckFrames++; worstError = Math.max(worstError, Math.abs(car.y - dy - 0.03)); }
    });
    const end = toUV(site, drive.car.x, drive.car.z);
    const result = { car: direction, end, minY, deckFrames, worstError };
    results.push(result);
    check(end.u * direction > 29 && minY > -0.1 && deckFrames > 30 && worstError < 0.08, 'car crossing failed: ' + JSON.stringify(result));
    drive.exit(true);
  }
  // The dedicated service is bounded: adjacent open river never becomes road.
  for (const v of [-13, 13]) { const w = toWorld(site, 0, v); check(bridge.deckY(w.x, w.z) === null, 'deck leaks into river'); }
  check((window.__errors || []).length === 0, 'scene module errors');
  if (failures.length) throw new Error(failures.join('\n'));
  return { passed: true, results };
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), oi = argv.indexOf('--out');
const out = oi < 0 ? path.join(os.tmpdir(), 'piter-belinsky-qa') : argv[oi + 1];
const args = ['tools/shot.mjs', '--q', 'medium', '--cams', '-451,-0.2,-573,0,2;-526,3,-635,30,12;-273,5,-650,35,22;-550,37,-631,35,-12', '--out', out, '--eval', '(' + verify.toString() + ')()'];
if (!argv.includes('--full')) args.push('--only', 'environment,streets,city,landmarksBelinsky,bridges,drive');
try { execFileSync(process.execPath, args, { cwd: root, stdio: 'inherit' }); }
catch (e) { process.exit(e.status || 1); }
