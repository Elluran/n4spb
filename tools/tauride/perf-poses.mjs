// perf-poses.mjs - the CPU half of the performance acceptance of the Tauride Garden (docs/TAURIDE-REMAKE.md T7, section 9): what the module costs in triangles and draws at the 12 acceptance poses, in both tiers.
// An --eval script of tools/people-test.mjs (it receives the built page chain: environment .. people):
//   node tools/area.mjs north tools/people-test.mjs --q medium --eval tools/tauride/perf-poses.mjs       (the medium tier)
//   node tools/area.mjs north tools/people-test.mjs --q low    --eval tools/tauride/perf-poses.mjs       (the performance tier: quality.level 'low')
// Per pose (tools/tauride-cams.mjs CAMS): the trees are re-assigned to their LODs for the camera there (the module's own rule, vegetation.js assign(x, z)); the line prints the module's triangles (static parts + the
// trees at that assignment) and its draws (static meshes + the LOD buckets in use). The GPU frame time is NOT measured here (needs the GPU lock: the GPU QA agent). Also printed: the static parts, the budgets of
// data/furniture-design.js BUDGET and tools/check.mjs BUDGET.landmarksTauride, the heap after a forced collection when node runs with --expose-gc, the build time of the module.
// RESULT: OK when the module total (at the HERO, what `npm run check:north` counts) is within BUDGET.landmarksTauride of tools/check.mjs and the trees stay within the vegetation LOD budget of vegetation-test (330 k) at every pose.
// The module total of a POSE is not frustum-aware (Paradny, 550 k of it, lies 200 .. 400 m behind the south gate and is mostly out of the view from the garden): it is printed to show what the gate would be if everything were drawn.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function (ctx, L, THREE) {
  const root = process.cwd(), S = ctx.services.landmarksTauride, T = S.trees, tier = (ctx.quality.level || ctx.quality.name);
  const { CAMS } = await import(pathToFileURL(path.join(root, 'tools/tauride-cams.mjs')).href);
  const checkSrc = (await import('node:fs')).readFileSync(path.join(root, 'tools/check.mjs'), 'utf8'), bm = /landmarksTauride:\s*([0-9.e]+)/.exec(checkSrc), BUDGET = bm ? Number(bm[1]) : 815e3;
  const draws = (o) => (typeof o === 'number' ? o : typeof o === 'function' ? o() : 0), parts = {
    terrain: S.terrain, paths: S.paths, ponds: S.ponds, bridges: S.bridges, reeds: S.reeds, fence: S.fence, furniture: S.furniture, monuments: S.monuments,
  };
  const rows = []; let staticTris = 0, staticDraws = 0;
  for (const [k, v] of Object.entries(parts)) { const tr = Number(v?.triangles ?? 0), dr = draws(v?.draws); staticTris += tr; staticDraws += dr; rows.push(`${k} ${Math.round(tr)} / ${dr}`); }
  const total = Number(S.triangles ?? 0), treeTris0 = typeof T.triangles === 'function' ? T.triangles() : T.triangles;
  const rest = total - staticTris - treeTris0;      // Paradny + the Palace + whatever the parts above do not list
  console.log(`tier ${tier}: module total ${Math.round(total)} triangles (budget ${BUDGET}); static parts ${rows.join(', ')}; trees ${T.instances} instances; the rest (Paradny, Palace, floor ...) ${Math.round(rest)}`);
  const fails = [], TREE_BUDGET = 330e3;
  if (total > BUDGET) fails.push(`module ${Math.round(total)} > ${BUDGET}`);
  let worst = 0;
  for (const c of CAMS) {
    const x = c.x ?? c.plan?.x, z = c.z ?? c.plan?.z; if (!Number.isFinite(x)) continue;
    T.assign(x, z);
    const tt = T.triangles(), td = T.draws(), tris = staticTris + rest + tt, dr = staticDraws + td;
    worst = Math.max(worst, tris);
    console.log(`  ${c.id} ${String(c.name || '').padEnd(22)} (${x}, ${z}): trees ${Math.round(tt)} tris in ${td} draws; module ${Math.round(tris)} tris, ${dr} draws (static ${staticDraws})`);
    if (tt > TREE_BUDGET) fails.push(`${c.id}: trees ${Math.round(tt)} > ${TREE_BUDGET}`);
  }
  T.assign(0, 0);
  console.log(`worst pose ${Math.round(worst)} triangles; every tree at LOD0 would be ${Math.round(T.trianglesWorst)} (not reachable: the LOD bands); ${T.instances} tree instances, ${T.colliders} trunk colliders`);
  if (global.gc) { global.gc(); console.log(`heap after gc ${Math.round(process.memoryUsage().heapUsed / 1048576)} MB`); } else console.log(`heap now ${Math.round(process.memoryUsage().heapUsed / 1048576)} MB (no --expose-gc)`);
  console.log(fails.length ? `RESULT: FAIL ${fails.join('; ')}` : 'RESULT: OK');
  process.exit(fails.length ? 1 : 0);
}
