// Real page regression: normal shipping bake -> Start -> walk through each
// Sevkabel fair door -> programme prompt -> E -> Escape -> restored input.
// Run after npm run bake: node tools/sevkabel-culture-test.mjs
// Screenshots/JSON use the existing GPU harness, under ignored shots/.
import { spawnSync } from 'node:child_process';
const out = process.argv[2] || 'shots/sevkabel-culture/final-play';

const expression = `(async () => {
  const ctx = __ctx, player = ctx.playerObj;
  if (!ctx.baked) throw Error('Normal shipping bake was not selected');
  if (__errors.length) throw Error('Module failures: ' + JSON.stringify(__errors));
  const { H } = await import('./src/world/landmarksSevkabel/frame.js');
  const results = [];
  const toward = (a, b) => ctx.L.yawToward(a.x, a.z, b.x, b.z);
  const walk = (seconds) => {
    dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }));
    for (let i = 0; i < seconds * 60; i++) player.update(1 / 60);
    dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w' }));
  };
  for (const [name, a, b, seconds] of [
    ['NW', [-84, -9.65], [-72, -9.65], 3.1],
    ['SE', [84, 1.6], [72, 1.6], 3.1],
    ['alley', [4, -31], [4, -6], 6],
  ]) {
    const start = H.W(...a), aim = H.W(...b);
    await __regions?.ensureAt(start.x, start.z);
    __setCam(start.x, null, start.z, toward(start, aim), 0);
    walk(seconds);
    const local = H.M(player.pos.x, player.pos.z);
    if (Math.abs(local.u) >= 78 || Math.abs(local.v) >= 24.5) throw Error(name + ' entrance did not admit the player: ' + JSON.stringify(local));
    if (player.fly || !player.onGround || Math.abs(player.pos.y - .08) > .02 || player.inputLock) throw Error(name + ' entrance lost grounded walking');
    results.push({ door: name, local, feet: player.pos.y, grounded: player.onGround });
  }
  // Traverse the entire central aisle using the real player movement/physics.
  const start = H.W(-72, 0), end = H.W(72, 0);
  __setCam(start.x, null, start.z, toward(start, end), 0); walk(38);
  const aisle = H.M(player.pos.x, player.pos.z);
  if (aisle.u < 60 || Math.abs(aisle.v) > .4 || !player.onGround) throw Error('Central aisle blocked: ' + JSON.stringify(aisle));
  const { DINING, diningEdge } = await import('./src/world/landmarksSevkabel/public-life-plan.js');
  const { frameOf } = await import('./src/world/landmarksSevkabel/kit.js');
  const terraces = [];
  for (const d of DINING) {
    const e = diningEdge(d), f = frameOf(e), at = depth => ({ x: f.x + f.xa[0] * d.u + e.n[0] * depth, z: f.z + f.xa[1] * d.u + e.n[1] * depth });
    const a = at(d.depth + .7), b = at(1.1);
    await __regions?.ensureAt(a.x, a.z); __setCam(a.x, null, a.z, toward(a, b), 0);
    walk((d.depth + .7 - 1.1) / 3.5);
    const depth = (player.pos.x - f.x - f.xa[0] * d.u) * e.n[0] + (player.pos.z - f.z - f.xa[1] * d.u) * e.n[1];
    const tables = ctx.services.landmarksSevkabel.restaurants.find(r => r.id === d.id)?.terraceTables;
    if (depth > 1.5 || Math.abs(player.pos.y - .14) > .025 || !player.onGround || tables < 2) throw Error('Terrace entry blocked ' + d.id);
    terraces.push({ id: d.id, depth, feet: player.pos.y, tables });
  }
  for (const name of ['ТРДЕЛЬНИКИ', 'КОФЕ И ЧУРРОС']) if (!ctx.services.landmarksSevkabel.foodTrucks.some(t => t.name === name)) throw Error('Missing requested trailer ' + name);
  const at = H.W(-69, -5), board = H.W(-69, -9.5);
  __setCam(at.x, null, at.z, toward(at, board), 0); ctx.interact.update();
  if (ctx.interact.target?.id !== 'sevkabel-fair-programme') throw Error('Programme prompt missing');
  dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e' }));
  dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e' }));
  if (!ctx.ui.open || document.getElementById('panel').hidden || player.inputLock !== 1) throw Error('E did not open programme');
  if (!document.querySelector('.panel-title').textContent.includes('Ярмарка')) throw Error('Wrong panel');
  dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
  dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', key: 'Escape' }));
  if (ctx.ui.open || player.inputLock !== 0) throw Error('Escape did not restore walking');
  ctx.zones.update(0);
  if (ctx.indoor.zone?.id !== 'sevkabel-fair') throw Error('Fair indoor lighting did not activate');
  const outside = H.W(-88, -10); __setCam(outside.x, null, outside.z, -127, 0); ctx.zones.update(0);
  if (ctx.indoor.zone) throw Error('Indoor lighting leaked outside the hall');
  if (__regions?.stats.failed || ctx.services.baked.failures.length) throw Error('Baked/streaming failures');
  return { ok: true, entrances: results, aisle, terraces, programme: 'E opened, Escape restored input',
    lighting: 'fair zone entered and left', fair: ctx.services.landmarksSevkabel.fair,
    trucks: ctx.services.landmarksSevkabel.foodTrucks.length,
    restaurants: ctx.services.landmarksSevkabel.restaurants.length,
    bulbs: ctx.services.landmarksSevkabel.festoonBulbs, regions: __regions?.stats,
    revision: ctx.baked.manifest.revision };
})()`;

const result = spawnSync(process.execPath, ['tools/shot.mjs', '--load', '--play', '--q', 'medium',
  '--cams', '-6236.46,0,860.05,-127,2,1;-6223.31,0,882.48,-127,2,1;-6131.76,0,903.89,166.96,4,1',
  '--out', out, '--eval', expression,
  '--evalout', out + '.json'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
