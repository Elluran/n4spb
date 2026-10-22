// CPU walk of the eight Paradny podium stair approaches with the REAL Player and Physics (the harness of the source repository, ported): the module landmarksTauride is built headless and a walker
// climbs each mapped stair (STEPS way) from 0.5 m before its foot to 3.2 m past its top. A stair that blocks the walker, or ends more than 0.9 m from its end point, fails.
//   node tools/tauride/paradny-walk.mjs                        this repository (after the Palace + Paradny port: src/world/landmarksTauride.js must exist; run as the North: the tool does it)
//   PITER_SRC=D:/git2/agi-fun-tests/102_3d_piter node tools/tauride/paradny-walk.mjs      the source repository (read-only)
// Prints a JSON row per stair ({ id, blocked, y, endError, near: the colliders around a blocked walker }) and RESULT: OK / FAIL. Exit 2 when there is no module to test.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './lib/common.mjs';

const useSource = !!process.env.PITER_SRC;
const root = useSource ? path.resolve(process.env.PITER_SRC) : ROOT;
if (!fs.existsSync(path.join(root, 'src/world/landmarksTauride.js'))) { console.error(`paradny-walk: no src/world/landmarksTauride.js in ${root} (the module is not ported into this repository yet: set PITER_SRC to the source repository)`); process.exit(2); }
if (!useSource) { const { enterNorth } = await import('./lib/common.mjs'); await enterNorth(); }
const { loadEngine, makeContext, buildModules, makePlayer } = await import('./lib/stub-env.mjs');
const engine = await loadEngine(root), { ctx, camera } = makeContext(engine, ['landmarksTauride']);
await buildModules(engine, ctx, ['landmarksTauride']);
const { PARADNY_STAIRS } = await import(pathToFileURL(path.join(root, 'src/world/landmarksTauride/paradny-surface.js')).href);
const result = [];
for (const stair of PARADNY_STAIRS) {
  const points = Array.from({ length: stair.pts.length / 2 }, (_, i) => stair.pts.slice(i * 2, i * 2 + 2));
  const a = points[0], b = points[1], dd = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / dd, dz = (b[1] - a[1]) / dd;
  const p = makePlayer(engine, camera, ctx.physics, { x0: 700, x1: 1100, z0: -1300, z1: -800 });
  p.setPose(a[0] - dx * 0.5, a[1] - dz * 0.5, 0, 0, stair.id === 'w1303266326' ? 1.98 : 0, { stand: true });
  const last = points.at(-1), prev = points.at(-2), len = Math.hypot(last[0] - prev[0], last[1] - prev[1]);
  points.push([last[0] + (last[0] - prev[0]) / len * 3.2, last[1] + (last[1] - prev[1]) / len * 3.2]);
  let blocked = false;
  for (const target of points) {
    for (let tick = 0; tick < 1000; tick++) {
      const ex = target[0] - p.pos.x, ez = target[1] - p.pos.z; if (Math.hypot(ex, ez) < 0.09) break;
      p.yaw = Math.atan2(-ex, -ez); p.keys.add('KeyW'); p.update(1 / 60);
      if (tick === 999) blocked = true;
    }
  }
  const end = points.at(-1);
  result.push({ id: stair.id, blocked, pos: p.pos.toArray(), y: p.pos.y, endError: Math.hypot(p.pos.x - end[0], p.pos.z - end[1]),
    near: blocked ? ctx.physics.items.filter((it) => it.type === 'box' && Math.hypot(it.cx - p.pos.x, it.cz - p.pos.z) < Math.hypot(it.hw, it.hd) + 1).map((it) => ({ cx: it.cx, cz: it.cz, hw: it.hw, hd: it.hd, y0: it.y0, y1: it.y1 })) : [] });
}
console.log(JSON.stringify(result, null, 2));
const bad = result.filter((r) => r.blocked || r.endError > 0.9);
console.log(`${result.length} stairs, ${bad.length} failing${bad.length ? ': ' + bad.map((r) => r.id).join(', ') : ''}`);
console.log(bad.length ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad.length ? 1 : 0);
