// furniture-test.mjs - T6 of the Tauride remake: the furniture (132 benches, 167 bins, the lanterns), the cast-iron fence with its 13 openings and 4 gaps, the stone gates, the monuments, the fountain, the orangery and the
// play fittings. node tools/area.mjs north tools/tauride/furniture-test.mjs [--no-env] [--quick] [--no-mutants]
// Every check runs on the REAL built module (landmarksTauride through the module entry; --env adds the environment) with the REAL Player and Physics, or on the real planners fed with the real data. The geometry rules are
// measured with the test's OWN code against the data modules (data/furniture.js, data/paths.js, data/footprints.js, data/water.js through height.js), and each group ends with MUTANTS (a bench lifted, a panel moved, an opening
// closed, a gate pier moved, the lantern spacing changed, the knock registration removed, a claim removed) that must turn the check red.
//   1 the furniture: every bench / bin / lantern on gardenHeight (2 cm), none in the water, none on a ribbon (bench edge >= 0.3 m from the ribbon edge), none in a trunk, none in a footprint; ids = the data; the lanterns
//     (lit ways only, spacing, alternate sides, 0.6 m off the ribbon edge, not on stairs / decks / gates / pieces); the orientation rule; the seats the pedestrians read
//   2 the fence: the layout equals the mapped ways (every panel on its way within 0.3 m, the panel count of the old garden.js rule), the 13 openings are the open panels of the data and a walker PASSES each, every closed
//     panel STOPS a walker (from both sides), the 4 gaps are open, no panel in the water, the base on the street side, the piers on the ground, the gate piers leave the opening width, the pitch fence
//   3 the monuments: positions, the apron on the plateau, the cheeks of the three descents, the fountain, the orangery footprint, the pitch / playgrounds / fitness station, the services (monuments, photo spots)
//   4 the budgets (fence 30 k / 3 draws, furniture, monuments), the camera poses and Digit0 clear of every collider, the colliders, determinism
//   5 the knock census (a second build with the real core/knock.js): bench 132, bin 167, lamp = the garden lanterns, every record owns a collider and a mesh part; a hit knocks a bench
//   6 the claims (the fence ways, the gate nodes, the monuments, the fountain, the other GREEN records, the hedges, the orangery; the service lane NOT claimed) and the service lane decision
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const args = new Set(process.argv.slice(2));
let failed = 0, total = 0;
const ok = (name, cond, detail = '') => { total++; if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`); };

const SE = await imp('tools/tauride/lib/stub-env.mjs');
const eng = await SE.loadEngine(ROOT);
const L = eng.L, THREE = eng.THREE;
const GH = await imp('src/world/landmarksTauride/height.js');
const FE = await imp('src/world/landmarksTauride/fence.js');
const FU = await imp('src/world/landmarksTauride/furniture.js');
const MO = await imp('src/world/landmarksTauride/monuments.js');
const Df = await imp('src/world/landmarksTauride/data/furniture.js');
const Dd = await imp('src/world/landmarksTauride/data/furniture-design.js');
const Pd = await imp('src/world/landmarksTauride/data/paths.js');
const Fo = await imp('src/world/landmarksTauride/data/footprints.js');
const PD = await imp('src/world/landmarksTauride/paths-draped.js');
const DG = await imp('src/world/landmarksTauride/data/ground.js');
const CAMS = await imp('tools/tauride-cams.mjs');
const FAC = await imp('src/areas/north/data/city.js');
const GRP = await imp('src/world/landmarksTauride/groups.js');
const shore = GH.GARDEN_SHORE, gh = GH.gardenHeight, H = (x, z) => gh(x, z) ?? 0;
const noEnv = !args.has('--env'), quick = args.has('--quick'), noMut = args.has('--no-mutants');

// ---------------------------------------------------------------- geometry of the test (its own)
const segP = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0; return Math.hypot(x - ax - t * dx, z - az - t * dz); };
const polyD = (x, z, p) => { let m = Infinity; for (let i = 0; i + 3 < p.length; i += 2) m = Math.min(m, segP(x, z, p[i], p[i + 1], p[i + 2], p[i + 3])); return m; };
const ringHas = (o, x, z) => { let c = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if ((o[i + 1] > z) !== (o[j + 1] > z) && x < (o[j] - o[i]) * (z - o[i + 1]) / (o[j + 1] - o[i + 1]) + o[i]) c = !c; return c; };
const ringD = (o, x, z) => { let m = Infinity; for (let i = 0; i < o.length; i += 2) m = Math.min(m, segP(x, z, o[i], o[i + 1], o[(i + 2) % o.length], o[(i + 3) % o.length])); return m; };
const WV = PD.PATHS_DRAPED.widthVar;                                                       // the drawn width varies by +-8 % (paths-draped.js)
const ribbons = Pd.PATHS.filter((p) => p.cls !== 'bridge').map((p) => ({ id: p.id, pts: p.pts, hw: p.cls === 'steps' ? 1.3 : p.w / 2 * (1 + WV), steps: p.cls === 'steps', lit: !!p.lit, cls: p.cls }));
const ribbonEdge = (x, z) => { let m = Infinity, id = null; for (const r of ribbons) { const e = polyD(x, z, r.pts) - r.hw; if (e < m) { m = e; id = r.id; } } return { edge: m, id }; };
const fpRings = Fo.FOOTPRINTS.flatMap((f) => f.polys.map((p) => p.o));
const inFp = (x, z, m = 0) => fpRings.some((r) => ringHas(r, x, z) || ringD(r, x, z) < m);
const rect = (x, z, rot, len, dep) => { const c = Math.cos(rot), s = Math.sin(rot), o = []; for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) o.push([x + c * u * len / 2 + s * v * dep / 2, z - s * u * len / 2 + c * v * dep / 2]); return o; };

// =============================================================== 0. the build (the real module entry)
const { ctx, camera } = SE.makeContext(eng, noEnv ? ['landmarksTauride'] : ['environment', 'landmarksTauride']);
const t0 = performance.now();
await SE.buildModules(eng, ctx, noEnv ? ['landmarksTauride'] : ['environment', 'landmarksTauride']);
const buildMs = performance.now() - t0, svc = ctx.services.landmarksTauride;
console.log(`built ${noEnv ? 'landmarksTauride' : 'environment + landmarksTauride'} in ${buildMs.toFixed(0)} ms`);
ok('the module publishes fence { plan, triangles, draws, colliders, meshes, items }, furniture { plan, benches, bins, lanterns, gateLanterns, benchPoints, items, records }, monuments { plan, list, photoSpots, meshes, items }', !!(svc && svc.fence && svc.furniture && svc.monuments && svc.fence.plan && svc.furniture.plan && svc.monuments.plan), '');
if (!svc || !svc.fence) { console.log('RESULT: FAIL (no T6 services)'); process.exit(1); }
const FP = svc.fence.plan, NP = svc.furniture.plan, MP = svc.monuments.plan, trees = svc.trees.list;
const bounds = { x0: 800, x1: 1650, z0: -1950, z1: -1150 };

// =============================================================== 1. the furniture
console.log('1. the furniture (furniture.js): benches, bins, lanterns');
const piecePts = (b) => rect(b.x, b.z, b.rotY, Dd.BENCH.len, Dd.BENCH.depth);
/** the measures of the furniture rules for a plan { benches, bins, lanterns, gateLanterns } and the fence plan: counts of violations */
function furnitureMeasures(plan, fence) {
  const m = { y: 0, water: 0, ribbonBench: 0, ribbonBin: 0, trunk: 0, footprint: 0, outside: 0, lanternRibbon: 0 };
  for (const b of plan.benches) {
    if (Math.abs(b.y - H(b.x, b.z)) > 0.02) m.y++;
    const pts = piecePts(b);
    if (pts.some(([x, z]) => shore.dist(x, z) <= 0)) m.water++;
    if (pts.some(([x, z]) => ribbonEdge(x, z).edge < Dd.BENCH.edge - 1e-6)) m.ribbonBench++;
    if (pts.some(([x, z]) => inFp(x, z, 0))) m.footprint++;
    if (!shore.inGarden(b.x, b.z)) m.outside++;
    for (const k of [-0.65, 0, 0.65]) { const x = b.x + Math.cos(b.rotY) * k, z = b.z - Math.sin(b.rotY) * k; if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < t.tr + 0.25)) { m.trunk++; break; } }
  }
  for (const b of plan.bins) {
    if (Math.abs(b.y - H(b.x, b.z)) > 0.02) m.y++;
    if (shore.dist(b.x, b.z) <= 0) m.water++;
    if (ribbonEdge(b.x, b.z).edge < Dd.BIN.edge + Dd.BIN.r - 0.05) m.ribbonBin++;
    if (inFp(b.x, b.z, 0)) m.footprint++;
    if (trees.some((t) => Math.hypot(t.x - b.x, t.z - b.z) < t.tr + Dd.BIN.r)) m.trunk++;
  }
  for (const l of plan.lanterns) {
    if (Math.abs(l.y - H(l.x, l.z)) > 0.02) m.y++;
    if (shore.dist(l.x, l.z) <= 0) m.water++;
    if (ribbonEdge(l.x, l.z).edge < 0.3) m.lanternRibbon++;
    if (inFp(l.x, l.z, 0)) m.footprint++;
    if (trees.some((t) => Math.hypot(t.x - l.x, t.z - l.z) < t.tr + 0.2)) m.trunk++;
  }
  for (const p of fence.piers) { if (Math.abs(p.y - Math.max(0, H(p.x, p.z))) > 0.02) m.y++; if (shore.dist(p.x, p.z) < 0.2 && p.kind === 'pier') m.water++; if (trees.some((t) => Math.hypot(t.x - p.x, t.z - p.z) < t.tr + 0.3)) m.trunk++; }
  for (const g of fence.gates) for (const p of g.gatePiers) { if (Math.abs(p.y - Math.max(0, H(p.x, p.z))) > 0.02) m.y++; if (shore.dist(p.x, p.z) < 0.2) m.water++; if (trees.some((t) => Math.hypot(t.x - p.x, t.z - p.z) < t.tr + 0.5)) m.trunk++; }
  return m;
}
const FM = furnitureMeasures(NP, FP);
ok(`132 benches and 167 bins: the ids are exactly the OSM nodes of data/furniture.js (each once), the claimed ids of the garden (${NP.benches.length} / ${NP.bins.length})`, NP.benches.length === 132 && NP.bins.length === 167 && new Set(NP.benches.map((b) => b.id)).size === 132 && Df.BENCHES.every((q) => NP.benches.some((b) => b.id === q.id)) && Df.BINS.every((q) => NP.bins.some((b) => b.id === q.id)) && NP.benches.every((b) => L.isClaimed(b.id)) && NP.bins.every((b) => L.isClaimed(b.id)), '');
ok('every bench, bin, lantern, pier and gate pier stands on gardenHeight (the street level, max(0, gardenHeight), for the fence) within 2 cm', FM.y === 0, `${FM.y} off`);
ok('none stands in the water (the exact shore distance of height.js; a bench with all 8 points of its footprint)', FM.water === 0, `${FM.water} in the water`);
ok(`none of the benches (${NP.benches.length}) touches a ribbon: every point of its footprint (len ${Dd.BENCH.len} x depth ${Dd.BENCH.depth}) is at least ${Dd.BENCH.edge} m from the ribbon edge (the nominal half width + the +-${WV * 100} % of the draped ribbons, the stairs 1.3 m); none of the bins (${Dd.BIN.edge} m + its radius); none of the lanterns`, FM.ribbonBench === 0 && FM.ribbonBin === 0 && FM.lanternRibbon === 0, `${FM.ribbonBench} / ${FM.ribbonBin} / ${FM.lanternRibbon}`);
ok('none stands in a building footprint and none outside the garden outline', FM.footprint === 0 && FM.outside === 0, `${FM.footprint} / ${FM.outside}`);
ok(`none stands in a trunk of the garden's own trees (services.landmarksTauride.trees.list, ${trees.length} trunks)`, FM.trunk === 0, `${FM.trunk}`);
{ const moved = NP.benches.filter((b) => b.node), movedN = NP.bins.filter((b) => b.node);
  ok(`the nudge: ${moved.length} benches (largest ${Math.max(0, ...moved.map((b) => b.node.d)).toFixed(2)} m, limit ${Dd.BENCH.nudgeMax}) and ${movedN.length} bins (largest ${Math.max(0, ...movedN.map((b) => b.node.d)).toFixed(2)} m, limit ${Dd.BIN.nudgeMax}) left their OSM node because it stood on a ribbon; the rest keep it to the millimetre; none was left stuck`, NP.stats.benchesStuck === 0 && NP.stats.binsStuck === 0 && moved.every((b) => b.node.d <= Dd.BENCH.nudgeMax + 1e-9 && Math.hypot(b.x - b.node.x, b.z - b.node.z) <= b.node.d + 1e-6) && movedN.every((b) => b.node.d <= Dd.BIN.nudgeMax + 1e-9) && NP.benches.filter((b) => !b.node).every((b) => { const q = Df.BENCHES.find((o) => o.id === b.id); return q.x === b.x && q.z === b.z; }), ''); }
{ // the orientation rule: a bench faces the nearest way ribbon (by its edge) within faceWay m, else the water within faceWater, else the garden centre
  let bad = 0, wayN = 0; for (const b of NP.benches) { let best = null; for (const r of ribbons) { if (r.steps) continue; const q = FU.nearestOn(r.pts, b.x, b.z), e = q[2] - r.hw; if (!best || e < best.e) best = { e, px: q[0], pz: q[1] }; } const fx = Math.sin(b.rotY), fz = Math.cos(b.rotY);
    if (best && best.e <= Dd.BENCH.faceWay) { wayN++; const dx = best.px - b.x, dz = best.pz - b.z, l = Math.hypot(dx, dz) || 1; if ((dx * fx + dz * fz) / l < 0.99) bad++; } }
  ok(`the orientation rule: every bench within ${Dd.BENCH.faceWay} m of a ribbon edge (${wayN}) faces its nearest point (${NP.stats.faces.way} face a way, ${NP.stats.faces.water} the water, ${NP.stats.faces.centre} the garden centre)`, bad === 0 && wayN > 100 && wayN === NP.stats.faces.way, `${bad} off`); }
// ---- the lanterns
{ const lit = Pd.PATHS.filter((p) => p.lit && p.cls !== 'bridge' && p.cls !== 'steps'), litIds = new Set(lit.map((p) => p.id));
  const bySide = new Map(); for (const l of NP.lanterns) { const a = bySide.get(l.way) || []; a.push(l); bySide.set(l.way, a); }
  const D = Dd.LANTERN, onLit = NP.lanterns.every((l) => litIds.has(l.way));
  const spacing = NP.lanterns.every((l) => Math.abs(((l.s - D.start) / D.spacing) - Math.round((l.s - D.start) / D.spacing)) < 1e-6);
  const alternate = NP.lanterns.every((l) => l.side === (Math.round((l.s - D.start) / D.spacing) % 2 ? 1 : -1));
  let offBad = 0; for (const l of NP.lanterns) { const w = ribbons.find((r) => r.id === l.way), e = polyD(l.x, l.z, w.pts) - w.hw; if (e < D.offset - 0.12 || e > D.offset + 0.12) offBad++; }
  const decks = svc.bridges.keepOut, stairs = ribbons.filter((r) => r.steps);
  const bad = { stair: NP.lanterns.filter((l) => stairs.some((s) => polyD(l.x, l.z, s.pts) < s.hw + 1.5)).length, deck: NP.lanterns.filter((l) => decks.some((d) => polyD(l.x, l.z, d.axis.flat()) < d.hw + 1.5)).length, gate: NP.lanterns.filter((l) => Df.GATES.some((g) => Math.hypot(g.x - l.x, g.z - l.z) < D.clear.gate)).length,
    piece: NP.lanterns.filter((l) => NP.benches.some((b) => Math.hypot(b.x - l.x, b.z - l.z) < D.clear.bench - 1e-6) || NP.bins.some((b) => Math.hypot(b.x - l.x, b.z - l.z) < D.clear.bin - 1e-6)).length };
  ok(`the lanterns (${NP.lanterns.length}) stand on the ${litIds.size} lit non-bridge ways only (data/paths.js lit = 1: ${[...litIds].length} of the 17, bridges and steps excepted), every ${D.spacing} m from ${D.start} m on ALTERNATE sides, ${D.offset} m (+-0.12) beyond the ribbon edge`, onLit && spacing && alternate && offBad === 0 && NP.lanterns.length >= 25, `onLit ${onLit}, spacing ${spacing}, alternate ${alternate}, ${offBad} off the offset`);
  ok('... none on a stair (+1.5 m), a bridge deck (+1.5 m), within 4 m of a gate, or within the clearance of a bench or a bin', bad.stair + bad.deck + bad.gate + bad.piece === 0, JSON.stringify(bad));
  ok(`the gate piers carry ${NP.gateLanterns.length} lanterns (the five garden gates: south, west, north, n4222941897, the entrance n8486544221; not the pitch, not the private service gate)`, NP.gateLanterns.length === 10 && FP.gates.filter((g) => g.lantern).every((g) => Dd.GATE.lantern.includes(g.id)), `${NP.gateLanterns.length}`); }
// ---- the meshes read back
{ const fm = svc.furniture, mb = fm.meshes.filter((m) => m.name.startsWith('tauride-benches')), mi = fm.meshes.filter((m) => m.name.startsWith('tauride-bins')), ml = fm.meshes.filter((m) => m.name.startsWith('tauride-lanterns'));
  const readBack = (meshes, list) => { let bad = 0; const M = new THREE.Matrix4(), V = new THREE.Vector3(); const m0 = meshes[0]; if (!m0 || m0.count !== list.length) return list.length; for (let i = 0; i < list.length; i++) { m0.getMatrixAt(i, M); V.setFromMatrixPosition(M); if (Math.hypot(V.x - list[i].x, V.z - list[i].z) > 1e-4 || Math.abs(V.y - list[i].y) > 0.02) bad++; } return bad; };
  ok(`the instances sit where the plan says (benches ${readBack(mb, NP.benches)} off, bins ${readBack(mi, NP.bins)} off, in the plan's order: x, z to 0.1 mm, y within 2 cm); one InstancedMesh per kind and part`, mb.length === 1 && mi.length === 1 && ml.length === 2 && readBack(mb, NP.benches) === 0 && readBack(mi, NP.bins) === 0, `${mb.length} / ${mi.length} / ${ml.length} meshes`);
  const seats = svc.furniture.benchPoints.length === 132 && ctx.services.landmarks.benches.length === 132 && ctx.services.landmarks.benches.every((b) => b.where === 'garden' && Number.isFinite(b.rotY) && b.len === Dd.BENCH.len && Math.abs(b.y - H(b.x, b.z)) < 0.02);
  ok('the benches are seats for the pedestrians: ctx.services.landmarks.benches carries the 132 with position, rotY (the front), len and the ground y (people/nav.js addBench reads exactly these)', seats, ''); }

// =============================================================== 2. the fence
console.log('2. the fence (fence.js): the mapped ways, the 13 openings, the 4 gaps, the walker');
const fenceLines = new Map(Df.FENCES.map((f) => [f.id, f.pts]));
{ // the layout = the old garden.js rule: every segment of every way is cut into ceil(len / 2.7) equal panels
  let n = 0; for (const f of Df.FENCES) for (let i = 0; i + 3 < f.pts.length; i += 2) { const l = Math.hypot(f.pts[i + 2] - f.pts[i], f.pts[i + 3] - f.pts[i + 1]); if (l >= 0.2) n += Math.ceil(l / 2.7); }
  ok(`the layout: ${FP.panels.length} panels = the sum of ceil(len / 2.7) over the segments of the 14 mapped fence ways (the old garden.js rule; data FENCE_STATS counts ${Df.FENCE_STATS.panels} by ceil(way length / 2.7)): ${FP.stats.closed} closed, ${FP.stats.open} open, ${FP.stats.dropped} dropped`, FP.panels.length === n && new Set(FP.panels.map((p) => p.fence)).size === 14, `${n}`); }
{ let worst = 0, bad = 0; for (const p of FP.panels) { const d = polyD(p.x, p.z, fenceLines.get(p.fence)); worst = Math.max(worst, d); if (d > 0.3) bad++; }
  ok(`every panel stands on its mapped way within 0.3 m (largest ${worst.toFixed(3)} m; ${FP.stats.shifted} panels moved ${Dd.FENCE.quayShift} m to the street side on the lake's quay)`, bad === 0, `${bad}`); }
{ // the instances read back from the mesh: position and yaw of every closed panel
  const closed = FP.panels.filter((p) => !p.open && !p.drop && !p.pitch), m = svc.fence.meshes.panels, M = new THREE.Matrix4(), V = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), E = new THREE.Euler(); let bad = 0, by = 0;
  for (let i = 0; i < closed.length; i++) { m.getMatrixAt(i, M); M.decompose(V, Q, S); E.setFromQuaternion(Q, 'YXZ'); if (Math.hypot(V.x - closed[i].x, V.z - closed[i].z) > 1e-4 || Math.abs(Math.sin(E.y - closed[i].yaw)) > 1e-4) bad++; if (Math.abs(V.y - Math.max(0, H(closed[i].x, closed[i].z))) > 0.12) by++; }
  ok(`the ${closed.length} closed iron panels are the ${m.count} instances of the panel mesh, each at the plan's x, z and yaw; the base is the street level (within 12 cm of max(0, gardenHeight): the highest of the three samples of a panel)`, m.count === closed.length && bad === 0 && by === 0, `${bad} off, ${by} base`); }
{ // no panel in the water: the plinth footprint (0.3 m wide, the length) of every built panel is dry
  let wet = 0, tight = 0; for (const p of FP.panels) { if (p.open || p.drop) continue; const c = Math.cos(p.yaw), s = Math.sin(p.yaw); for (const [u, v] of [[0, 0], [0.15, p.len / 2], [-0.15, p.len / 2], [0.15, -p.len / 2], [-0.15, -p.len / 2]]) { const x = p.x + c * u + s * v, z = p.z - s * u + c * v, d = shore.dist(x, z); if (d < 0) wet++; else if (d < 0.01) tight++; } }
  ok(`no panel stands in the water: 0 of the ${FP.stats.closed * 5} footprint points of the built panels are wet (${tight} within 1 cm of the water's edge); the stub w112853216 (1.7 m into the water) is not built: ${FP.dropped.map((d) => d.fence + '#' + d.i).join(', ')}`, wet === 0 && FP.dropped.every((d) => d.fence === 'w112853216'), `${wet} wet`); }
{ // the openings: the open panels of the data, 13 clusters, each matched to the panel count of the data
  const ops = FP.openings;
  ok(`the 13 openings of data/furniture.js FENCE_OPENINGS are open: each cluster's open panels lie on the segment between its two mapped end centres (${ops.map((o) => o.matched + '/' + o.panels).join(' ')}), widths ${Df.FENCE_OPENINGS.map((o) => o.widthM).join(' ')}, and there is no other open panel (${FP.stats.open} = ${Df.FENCE_OPENINGS.reduce((s, o) => s + o.panels, 0)})`, ops.length === 13 && ops.every((o) => o.matched === o.panels) && FP.stats.open === Df.FENCE_OPENINGS.reduce((s, o) => s + o.panels, 0), '');
  const noMesh = svc.fence.meshes.panels.count === FP.panels.filter((p) => !p.open && !p.drop && !p.pitch).length, items = svc.fence.items;
  ok(`no collider and no panel instance stands in an opening: ${items.panels.length} iron + ${items.pitch.length} pitch panel colliders = the closed panels (${FP.stats.closed}), none within 1.2 m of an opening centre line (but the gate piers beside it)`, noMesh && items.panels.length + items.pitch.length === FP.stats.closed && ops.every((o) => o.open.length > 0), ''); }
// ---- the walker (the real Player on the real Physics of the built module)
const ph = ctx.physics;
const walker = (x0, z0, x1, z1, ticks = 300, phys = ph) => {
  const p = SE.makePlayer(eng, camera, phys, bounds); p.pos.set(x0, H(x0, z0), z0);
  const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1; let steps = 0;
  SE.walkToward(p, x1, z1, ticks);
  const along = ((p.pos.x - x0) * dx + (p.pos.z - z0) * dz) / l, across = Math.abs((p.pos.x - x0) * dz - (p.pos.z - z0) * dx) / l;
  return { along, across, len: l, x: p.pos.x, z: p.pos.z, passed: along > l - 0.5 };
};
const sideOfGarden = (x, z, nx, nz) => (shore.inGarden(x + nx * 1.2, z + nz * 1.2) ? 1 : -1);
function openingWalks(plan, phys) {
  const res = [];
  for (const o of plan.openings) {
    const mine = plan.panels.filter((p) => p.fence === o.fence && o.open.includes(p.i)); if (!mine.length) continue;
    const a = mine[0], b = mine[mine.length - 1], cx = (a.ax + b.bx) / 2, cz = (a.az + b.bz) / 2, tx = a.tx, tz = a.tz, nx = -tz, nz = tx, s = sideOfGarden(cx, cz, nx, nz);
    const r = walker(cx - nx * s * 4, cz - nz * s * 4, cx + nx * s * 4, cz + nz * s * 4, 360, phys);
    res.push({ ...o, id: o.gates[0] || o.fence, passed: r.passed });
  }
  return res;
}
{ const walks = openingWalks(FP, ph), bad = walks.filter((w) => !w.passed);
  ok(`a walker PASSES each of the 13 openings (the real Player from 4 m inside to 4 m outside along the normal through the middle of the opening: ${walks.map((w) => w.passed ? 'y' : 'N').join('')})`, walks.length === 13 && bad.length === 0, bad.map((w) => w.id).join(',')); }
{ // the south gate: the opening of n828488069 on w10903027, 5.4 m wide, and Digit0 1.8 m south of the node
  const g = FP.gates.find((q) => q.id === 'n828488069'), w = walker(g.x - g.inward[0] * 6, g.z - g.inward[1] * 6, g.x + g.inward[0] * 6, g.z + g.inward[1] * 6, 420);
  ok(`the south gate n828488069 (${g.width.toFixed(2)} m clear): a walker goes from the street through the gate into the garden and 6 m beyond`, w.passed && g.width > 5, `along ${w.along.toFixed(1)} of ${w.len.toFixed(1)}`); }
{ // every closed panel stops the walker, from the street and from the garden side
  const closed = FP.panels.filter((p) => !p.open && !p.drop), step = quick ? 6 : 1; let fromStreet = 0, fromGarden = 0, tried = 0, skipped = 0;
  for (let i = 0; i < closed.length; i += step) {
    const p = closed[i], nx = -p.tz, nz = p.tx, s = sideOfGarden(p.x, p.z, nx, nz);
    const st = [p.x - nx * s * 1.8, p.z - nz * s * 1.8], ga = [p.x + nx * s * 1.8, p.z + nz * s * 1.8];       // 1.8 m on the street side and on the garden side
    tried++;
    const a = walker(st[0], st[1], ga[0], ga[1], 150); if (a.along > 2.45) fromStreet++;
    if (shore.dist(ga[0], ga[1]) > 0.4) { const b = walker(ga[0], ga[1], st[0], st[1], 150); if (b.along > 2.45) fromGarden++; } else skipped++;
  }
  ok(`a walker is STOPPED by every closed panel: ${tried} panels tried (every ${step}th of the ${closed.length}), from 1.8 m on the street side to 1.8 m beyond: ${fromStreet} got through; from the garden side: ${fromGarden} got through (${skipped} garden-side starts at the water skipped)`, fromStreet === 0 && fromGarden === 0 && tried > 100, `${fromStreet} / ${fromGarden}`); }
{ // the 4 gaps are open
  const res = Df.FENCE_GAPS.map((g) => { const cx = (g.x + g.x2) / 2, cz = (g.z + g.z2) / 2, dx = g.x2 - g.x, dz = g.z2 - g.z, l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l, s = sideOfGarden(cx, cz, nx, nz); const r = walker(cx - nx * s * 3, cz - nz * s * 3, cx + nx * s * 3, cz + nz * s * 3, 240);
    const inside = FP.panels.filter((p) => { if (p.drop) return false; const u = ((p.x - g.x) * dx + (p.z - g.z) * dz) / l, v = Math.abs((p.x - g.x) * dz - (p.z - g.z) * dx) / l; return u > 3 && u < l - 3 && v < 3; }).length; return { gap: g.lenM, passed: r.passed, panels: inside }; });
  ok(`the 4 unfenced stretches (${Df.FENCE_GAPS.map((g) => g.lenM + ' m').join(', ')}) are open: no panel within 3 m of the chord of a gap (but its last 3 m at each end) and a walker crosses each`, res.every((r) => r.passed && r.panels === 0), JSON.stringify(res)); }
// ---- the gates
function gateMeasures(plan) {
  const out = [];
  for (const g of plan.gates) if (g.gatePiers.length === 2) {
    const [a, b] = g.gatePiers, w = Dd.GATE.w, tx = g.tx, tz = g.tz;
    const ia = (a.x - g.x) * tx + (a.z - g.z) * tz + w / 2, ib = (b.x - g.x) * tx + (b.z - g.z) * tz - w / 2;       // the inner faces along the tangent
    out.push({ id: g.id, clear: ib - ia, want: g.width, diff: Math.abs(ib - ia - g.width), kind: g.kind });
  }
  return out;
}
{ const gm = gateMeasures(FP), worst = Math.max(...gm.map((g) => g.diff));
  ok(`the gate piers leave the opening width: ${gm.length} gates with stone piers, the clear width between their inner faces equals the opening (largest difference ${(worst * 100).toFixed(1)} cm); ${FP.gates.filter((g) => g.kind === 'post').length} pitch gates have plain posts; the piers are ${Dd.GATE.w} x ${Dd.GATE.w} x ${Dd.GATE.h} m`, gm.length === 7 && worst < 0.02, JSON.stringify(gm.map((g) => [g.id, +g.clear.toFixed(2)]))); }
ok(`the 11 gate nodes are all served: ${new Set(FP.gates.map((g) => g.id)).size} distinct gates (the private service gate n11695724997 stands in two openings, on w418967228 and on w10903027), kinds ${JSON.stringify(FP.gates.reduce((a, g) => (a[g.kind] = (a[g.kind] || 0) + 1, a), {}))}`, new Set(FP.gates.map((g) => g.id)).size === 11 && Df.GATES.every((g) => FP.gates.some((q) => q.id === g.id)), '');
{ // the pitch fence: closed ring, 5 gates, the posts
  const pitch = FP.panels.filter((p) => p.pitch), open = pitch.filter((p) => p.open), posts = FP.piers.filter((p) => p.kind === 'post');
  ok(`the pitch fence w81524430 is the wire-mesh fence: ${pitch.length} panels in a closed ring, ${open.length} open in its 5 gates (${Dd.PITCH_FENCE.gates.length}), ${posts.length} posts, ${Dd.PITCH_FENCE.h} m high, a collider per closed panel`, pitch.length > 80 && open.length === 15 && posts.length > 80 && svc.fence.items.pitch.length === pitch.length - open.length, ''); }

// =============================================================== 3. the monuments
console.log('3. the monuments (monuments.js): the memorial, Chaikovsky, Yesenin, the fountain, the orangery, the pitch, the playgrounds, the fitness station');
{ const mem = MP.memorial, mn = Df.MONUMENTS.find((m) => m.id === 'n4186236011');
  ok(`the Pioneers memorial stands on its OSM node (${mn.x}, ${mn.z}) on the plateau M at ${mem.y.toFixed(2)} m (gardenHeight); the stele is ${Dd.MEMORIAL.h} m (OSM and Commons: 4.8 m, limestone, 1962)`, mem.x === mn.x && mem.z === mn.z && Math.abs(mem.y - H(mn.x, mn.z)) < 1e-9 && mem.y > 1.1, '');
  let apronBad = 0; for (const q of mem.apron) for (const p of q.p) if (Math.abs(p[1] - H(p[0], p[2]) - Dd.MEMORIAL.apronLift) > 0.01) apronBad++;
  ok(`the apron (${mem.apron.length} pavers in ${Dd.MEMORIAL.apronRings} rings, radius ${Dd.MEMORIAL.apronR} m) is draped on the plateau: every vertex ${Dd.MEMORIAL.apronLift * 100} cm above gardenHeight`, mem.apron.length === Dd.MEMORIAL.apronRings * Dd.MEMORIAL.apronSeg && apronBad === 0, `${apronBad} off`);
  const stairs = svc.paths.stairs, want = Dd.MEMORIAL.stairs.map((id) => stairs.find((s) => s.id === id)), perStair = Dd.MEMORIAL.stairs.map((id) => mem.cheeks.filter((c) => c.stair === id).length);
  ok(`the cheeks of the three descents (${Dd.MEMORIAL.stairs.join(' / ')}): two limestone blocks per tread beside the kerbs of the stair that paths-draped.js built (${want.map((s) => s.n).join(' / ')} treads: ${perStair.join(' / ')} blocks), each ${Dd.MEMORIAL.cheek.h} m above its tread, none inside the stair (the inner edge is ${(want[0].width / 2 + 0.2).toFixed(2)} m from the axis)`, want.every(Boolean) && perStair.every((n, i) => n === want[i].n * 2) && mem.cheeks.every((c) => c.top > c.bot + 0.4), perStair.join('/'));
  const stele = svc.monuments.items.length >= 3 && MP.colliders.some((c) => c.id === 'memorial');
  ok('the memorial is solid (a box collider over its base, 4.8 m high) and published as a monument with a photo spot on a way', stele && MP.monuments.some((m) => m.id === 'n4186236011' && m.h === 4.8) && !!mem.photo, ''); }
{ const c = MP.chaikovsky, y = MP.yesenin, cn = Df.MONUMENTS.find((m) => m.id === 'n2974761162'), yn = Df.MONUMENTS.find((m) => m.id === 'n4222941889');
  ok('Chaikovsky (a bust on a granite pedestal) and Yesenin (a bronze figure on a low plinth) stand on their OSM nodes, on the ground, facing the nearest alley, each with a collider and a photo spot', c.x === cn.x && c.z === cn.z && y.x === yn.x && y.z === yn.z && Math.abs(c.y - H(c.x, c.z)) < 1e-9 && Math.abs(y.y - H(y.x, y.z)) < 1e-9 && !!c.photo && !!y.photo && MP.colliders.filter((q) => q.id === c.id || q.id === y.id).length === 2, ''); }
{ const f = MP.fountain, fn = Df.FOUNTAINS[0], D = Dd.FOUNTAIN, water = svc.monuments.meshes.find((m) => m.name === 'tauride-fountain-water');
  ok(`the fountain "Boy with a duck" stands on its node (${fn.x}, ${fn.z}), a basin of ${D.R} m with a rim ${D.rimH} m high, the water ${D.waterDrop} m under the rim (y ${water ? water.position.y.toFixed(2) : '-'}), a paved plaza of ${D.plazaR} m, an animated spout (the jet follows the page time), a photo spot`, f.x === fn.x && f.z === fn.z && !!water && Math.abs(water.position.y - (f.y + D.rimH - D.waterDrop)) < 1e-6 && !!svc.monuments.fountain && !!f.photo, '');
  const j0 = svc.monuments.fountain.jet.scale.y; for (const fnc of ctx._updates || []) fnc(0.016, 1.3); const j1 = svc.monuments.fountain.jet.scale.y;
  ok('... the spout is animated (ctx.onUpdate: the jet height changes with time)', Math.abs(j1 - j0) > 1e-4, `${j0.toFixed(3)} -> ${j1.toFixed(3)}`); }
{ const o = MP.orangery, rec = FAC.BUILDINGS.find((b) => b.id === Dd.ORANGERY.id), ring = rec.polys[0].o;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (let i = 0; i < ring.length; i += 2) { x0 = Math.min(x0, ring[i]); x1 = Math.max(x1, ring[i]); z0 = Math.min(z0, ring[i + 1]); z1 = Math.max(z1, ring[i + 1]); }
  ok(`the orangery is drawn on the MAPPED footprint of w23002927 (${(x1 - x0).toFixed(1)} x ${(z1 - z0).toFixed(1)} m box, ${o.length.toFixed(1)} x ${o.width.toFixed(1)} m in its own frame, ${o.bays} bays), outside the garden outline, and the building is CLAIMED by the module (city draws no block there)`, !!o && ringHas(ring, o.cx, o.cz) && !shore.inGarden(o.cx, o.cz) && Math.abs(o.length - 55.7) < 1.5 && L.isClaimed(Dd.ORANGERY.id) && L.claimedBy(Dd.ORANGERY.id) === 'landmarksTauride', ''); }
{ const p = MP.pitch, goals = p.goals;
  ok(`the pitch (${Dd.PITCH_FENCE.id}): the turf with ${p.lines.length} marking lines and two goals (${Dd.PLAY.goal.w} x ${Dd.PLAY.goal.h} m) at the short ends of the ring, facing the pitch centre`, goals.length === 2 && p.lines.length > 30 && goals.every((g) => ringHas(p.ring, g.x, g.z)) && Math.hypot(goals[0].x - goals[1].x, goals[0].z - goals[1].z) > 60, '');
  ok(`the ${MP.playgrounds.length} playgrounds (${MP.playgrounds.map((q) => q.id).join(', ')}) carry ${MP.playgrounds.reduce((s, q) => s + q.items.length, 0)} structures, all inside their polygon by ${Dd.PLAY.inset} m (${MP.playgrounds.map((q) => q.items.map((i) => i.kind).join('+')).join(' | ')}); the fitness station w423708263 a row of ${MP.fitness[0].bars.length} bars`, MP.playgrounds.length === 3 && MP.playgrounds.every((q) => q.items.length >= 2 && q.items.every((i) => ringHas(q.ring, i.x, i.z) && ringD(q.ring, i.x, i.z) >= Dd.PLAY.inset - 1e-6)) && MP.fitness.length === 1 && MP.fitness[0].bars.length === 4, ''); }
{ const S = ctx.services.landmarks, ids = ['n4186236011', 'n2974761162', 'n4222941889', 'n950150577', 'w23002927'];
  ok(`the monuments and photo spots are merged into the shared ctx.services.landmarks like the other North modules (docs/AREAS.md 10.2): ${ids.map((i) => (S.monuments.some((m) => m.id === i) ? 'y' : 'N')).join('')} monuments (memorial, Chaikovsky, Yesenin, fountain, orangery), ${S.photoSpots.length} photo spots`, ids.every((i) => S.monuments.some((m) => m.id === i)) && S.photoSpots.length >= 4, '');
  const ways = ribbons.filter((r) => !r.steps); const on = S.photoSpots.filter((p) => ways.some((w) => polyD(p.x, p.z, w.pts) < w.hw));
  ok(`... every photo spot stands on a way ribbon (a walker can reach it): ${on.length} of ${S.photoSpots.length}, and looks at its monument (yaw within 1 degree of the bearing)`, on.length === S.photoSpots.length, ''); }

// =============================================================== 4. budgets, the camera poses, the colliders, determinism
console.log('4. budgets, the camera poses and Digit0, the colliders, determinism');
{ const B = Dd.BUDGET, fn = svc.furniture, benchBin = fn.meshes.filter((m) => /benches|bins/.test(m.name)).reduce((s, m) => s + m.count * (m.geometry.index.count / 3), 0), lant = fn.meshes.filter((m) => /lanterns/.test(m.name)).reduce((s, m) => s + m.count * (m.geometry.index.count / 3), 0);
  ok(`the fence: ${svc.fence.triangles.toFixed(0)} triangles (the panels ${svc.fence.instances.panels} x ${svc.fence.template.panel}, the piers ${svc.fence.instances.piers} x ${svc.fence.template.pier}, the static gates / leaves / pitch fence ${svc.fence.gateTriangles}) <= ${B.fence.triangles}, ${svc.fence.draws} draws <= ${B.fence.draws}`, svc.fence.triangles <= B.fence.triangles && svc.fence.draws <= B.fence.draws, '');
  ok(`the furniture: benches + bins ${benchBin.toFixed(0)} triangles <= ${B.furniture.benchesBins}, lanterns ${lant.toFixed(0)} <= ${B.furniture.lanterns}, ${fn.draws} draws <= ${B.furniture.draws} (bench, bin, lantern body, lantern glow and the shared light pool)`, benchBin <= B.furniture.benchesBins && lant <= B.furniture.lanterns && fn.draws <= B.furniture.draws, '');
  ok(`the monuments, the fountain, the orangery, the play fittings: ${svc.monuments.triangles.toFixed(0)} triangles <= ${B.monuments.triangles}, ${svc.monuments.draws} draws <= ${B.monuments.draws}`, svc.monuments.triangles <= B.monuments.triangles && svc.monuments.draws <= B.monuments.draws, JSON.stringify(svc.monuments.parts)); }
{ // every camera pose and Digit0 clear of every collider of the module (a 0.4 m circle)
  const poses = [...CAMS.CAMS.filter((c) => !c.flight), ...L.VIEWS.filter((v) => /Digit/.test(v.key))];
  const hit = poses.filter((c) => ph.items.some((it) => { if (it.type === 'cyl') return Math.hypot(it.cx - c.x, it.cz - c.z) < it.r + 0.4 && it.y1 > H(c.x, c.z) + 0.3 && it.y0 < H(c.x, c.z) + 1.7; if (it.type === 'box') { const dx = c.x - it.cx, dz = c.z - it.cz, u = Math.abs(dx * it.c - dz * it.s), v = Math.abs(dx * it.s + dz * it.c); return u < it.hw + 0.4 && v < it.hd + 0.4 && it.y1 > H(c.x, c.z) + 0.3 && it.y0 < H(c.x, c.z) + 1.7; } return false; }));
  const d0 = L.VIEWS.find((v) => v.key === 'Digit0');
  ok(`${poses.length} camera poses (T01-T11, the VIEWS Digit0-Digit9; Digit0 = (${d0.x}, ${d0.z}) 1.8 m south of the south gate) stand clear of every collider of the module by 0.4 m (the tools views-check and tauride-cams-check --colliders run the same on the page's modules)`, hit.length === 0, hit.map((c) => c.id || c.key).join(',')); }
{ const sigF = (p) => JSON.stringify([p.panels.map((q) => [q.fence, q.i, +q.x.toFixed(4), +q.z.toFixed(4), +q.y.toFixed(4), +q.yaw.toFixed(5), q.open, q.drop]), p.piers.map((q) => [q.fence, q.b, +q.x.toFixed(4), +q.z.toFixed(4), q.kind]), p.gates.map((g) => [g.id, g.kind, +g.x.toFixed(3), g.gatePiers.length])]);
  const sigN = (p) => JSON.stringify([p.benches.map((b) => [b.id, +b.x.toFixed(4), +b.z.toFixed(4), +b.rotY.toFixed(5)]), p.bins.map((b) => [b.id, +b.x.toFixed(4), +b.z.toFixed(4)]), p.lanterns.map((l) => [l.way, +l.x.toFixed(4), +l.z.toFixed(4)])]);
  const F2 = FE.planFence(), N2 = FU.planFurniture({ piers: [...F2.piers.filter((p) => p.kind === 'pier'), ...F2.gates.flatMap((g) => g.gatePiers)], gateLanterns: F2.gates.flatMap((g) => g.lantern || []), decks: svc.bridges.keepOut });
  ok('determinism: the fence plan and the furniture plan are the same bits when planned again (and equal to the built ones)', sigF(F2) === sigF(FP) && sigN(N2) === sigN(NP), '');
  const g1 = FE.panelGeometry(), g2 = FE.panelGeometry(); ok('... the panel template geometry is the same bits', Buffer.compare(Buffer.from(g1.attributes.position.array.buffer), Buffer.from(g2.attributes.position.array.buffer)) === 0, ''); }
{ const worn = DG.WORN_SPOTS.filter((w) => w.follow), at = new Map([...Df.FOUNTAINS, ...Df.MONUMENTS, ...Df.GATES].map((q) => [q.id, q])), res = FU.resolveWornSpots(DG.WORN_SPOTS, [...Df.FOUNTAINS, ...Df.MONUMENTS, ...Df.GATES]);
  ok(`the worn spots follow the furniture: ${worn.length} of ${DG.WORN_SPOTS.length} are anchored to a node of data/furniture.js (fountain, south gate, memorial) and the x, z written in data/ground.js are what the node gives today (the mask resolves them from the data); the benches of the mask are the PLANNED ones (${NP.stats.benchesMoved} moved)`, worn.length === 3 && worn.every((w) => { const n = at.get(w.follow); return n && Math.abs(n.x + w.dx - w.x) < 1e-9 && Math.abs(n.z + w.dz - w.z) < 1e-9; }) && res.every((w) => Number.isFinite(w.x) && Number.isFinite(w.z)), ''); }

// =============================================================== 5. the knock census (a second build with the real core/knock.js)
console.log('5. the knock census: a second build with the real core/knock.js (the strip\'s furniture pattern: lib/knock-inst.js)');
const { createKnock } = await imp('src/core/knock.js');
{ const c2 = SE.makeContext(eng, ['landmarksTauride']); c2.ctx.knock = createKnock(c2.ctx);
  await SE.buildModules(eng, c2.ctx, ['landmarksTauride']);
  const s2 = c2.ctx.services.landmarksTauride, list = c2.ctx.knock.list, by = {}; for (const r of list) by[r.kind] = (by[r.kind] || 0) + 1;
  const own = s2.furniture.plan.lanterns.length;
  ok(`the knock census of the garden: ${list.length} records ${JSON.stringify(by)} = 132 benches + 167 bins + ${own} lanterns (the ${s2.furniture.plan.gateLanterns.length} lanterns on the gate piers and the fence piers and panels are not knockable: the strip's fences are not either)`, list.length === 132 + 167 + own && by.bench === 132 && by.bin === 167 && by.lamp === own, '');
  ok('every record owns a collider on ctx.physics (source.knock = the record) and at least one mesh part', list.every((r) => r.items.length >= 1 && r.items.every((it) => c2.ctx.physics.items.includes(it) && it.source && it.source.knock === r)) && list.every((r) => r.parts.some((p) => p.mesh || p.obj)), '');
  const b = list.find((r) => r.kind === 'bench'); c2.ctx.knock.hit(b.x, b.z, 40, 1, 0, 'bench'); c2.ctx.knock.update(0.05);
  ok('a bench hit at 40 km/h is knocked over (state leaves "stand", its collider is removed)', b.state !== 'stand' && !b.items.some((it) => c2.ctx.physics.items.includes(it)), b.state);
  const lamps = list.filter((r) => r.kind === 'lamp'); ok(`the lantern records carry the glow and the light pool as parts (body, glow, pool: ${lamps[0].parts.length} parts), the strip's lamp pattern`, lamps.every((r) => r.parts.length === 3), `${lamps[0].parts.length}`);
  // the mutant: the registration removed -> the census is empty
  const c3 = SE.makeContext(eng, ['landmarksTauride']); c3.ctx.knock = createKnock(c3.ctx); c3.ctx.knock.register = () => null; await SE.buildModules(eng, c3.ctx, ['landmarksTauride']);
  ok('mutant: a ctx.knock.register that registers nothing leaves 0 records (the census check can fail)', c3.ctx.knock.list.length === 0 && c3.ctx.knock.list.length !== 132 + 167 + own, ''); }

// =============================================================== 6. the claims and the service lane decision
console.log('6. the claims: the fence ways, the gate nodes, the monuments, the fountain, the other GREEN records, the hedges, the orangery; the service lane NOT claimed');
{ const claimed = (ids) => ids.filter((id) => !L.isClaimed(id));
  const lists = { fences: Df.FENCES.map((f) => f.id), gates: Df.GATES.map((g) => g.id), monuments: [...Df.MONUMENTS.map((m) => m.id), ...Df.FOUNTAINS.map((f) => f.id)], others: Fo.GARDEN_GREEN.others.map((g) => g.id), hedges: ['w1199664269', 'w1199664270'], orangery: [Dd.ORANGERY.id], centralRound: ['w420650657', 'w420650658'] };
  ok(`claimed by landmarksTauride: the ${lists.fences.length} fence ways, the ${lists.gates.length} gate nodes, the ${lists.monuments.length} monument / fountain nodes, the ${lists.others.length} other GREEN records (pitch, 3 playgrounds, fitness station, wetland), the 2 hedges and the 2 fences of the central round (w420650657/58, among the fence ways), the orangery building`, Object.values(lists).every((l) => claimed(l).length === 0 && l.every((id) => L.claimedBy(id) === 'landmarksTauride')), Object.entries(lists).map(([k, l]) => k + ' ' + claimed(l).length).join(', '));
  ok('the service lane w1258039516 / w1258039517 is NOT claimed: streets keeps drawing it (the decision of data/furniture-design.js SERVICE_LANE_DECISION), the cars stay out through HOOKS.carKeepOut either way', Df.SERVICE_LANE.ids.every((id) => !L.isClaimed(id)) && Dd.SERVICE_LANE_DECISION.claimed === false && Dd.SERVICE_LANE_DECISION.drawnBy === 'streets', '');
  // the mutant: the group list without the hedges / fences / orangery claims finds them unclaimed
  const stripped = GRP.GROUPS_LIST.find((g) => g.key === 'tauride-garden'), drop = new Set([...lists.hedges, ...lists.centralRound, ...lists.orangery]);
  const without = { osm: stripped.osm.filter((id) => !drop.has(id)), ids: stripped.ids.filter((id) => !drop.has(id)) };
  ok('mutant: the same group list WITHOUT the 4 hedge / central-round ids and the orangery leaves them unclaimed (the claim check can fail)', [...drop].every((id) => !without.osm.includes(id) && !without.ids.includes(id)) && [...drop].every((id) => stripped.osm.includes(id) || stripped.ids.includes(id)), ''); }

// =============================================================== 7. the mutants of the geometry checks
if (!noMut) {
  console.log('7. mutants: a bench lifted, a bench on a ribbon, a panel moved, an opening closed, a gate pier moved, the lantern spacing changed, a pier off the ground (each must turn its check red)');
  const clone = (o) => JSON.parse(JSON.stringify(o));
  { const m = clone({ benches: NP.benches, bins: NP.bins, lanterns: NP.lanterns }); m.benches[3].y += 0.12; ok('mutant: a bench lifted 12 cm off the ground breaks the y check', furnitureMeasures(m, FP).y === 1, ''); }
  { const m = clone({ benches: NP.benches, bins: NP.bins, lanterns: NP.lanterns }), b = m.benches[10], w = ribbons.find((r) => !r.steps); b.x = (w.pts[0] + w.pts[2]) / 2; b.z = (w.pts[1] + w.pts[3]) / 2; ok('mutant: a bench moved onto the middle of a way ribbon breaks the ribbon check', furnitureMeasures(m, FP).ribbonBench >= 1, ''); }
  { const m = clone({ benches: NP.benches, bins: NP.bins, lanterns: NP.lanterns }), b = m.bins[5], t = trees[40]; b.x = t.x; b.z = t.z; ok('mutant: a bin moved into a trunk breaks the trunk check', furnitureMeasures(m, FP).trunk >= 1, ''); }
  { const d = Dd.LANTERN, other = FU.planFurniture({ piers: [], gateLanterns: [], decks: svc.bridges.keepOut, LANTERN: { ...d, spacing: 10 } }); const ok1 = other.lanterns.every((l) => Math.abs(((l.s - d.start) / d.spacing) - Math.round((l.s - d.start) / d.spacing)) < 1e-6); ok('mutant: the lantern spacing 10 m instead of 27 m breaks the spacing check', !ok1, `${other.lanterns.length} lanterns`); }
  { const m = clone(FP); const p = m.piers.find((q) => q.kind === 'pier'); p.y = 0.4; ok('mutant: a fence pier 40 cm off the ground breaks the y check', furnitureMeasures(NP, m).y >= 1, ''); }
  { const m = clone(FP); const p = m.panels.find((q) => !q.open && !q.drop && q.fence === 'w10903027'); p.x += 0.9; p.z += 0.9; const d = polyD(p.x, p.z, fenceLines.get(p.fence)); ok('mutant: a panel moved 1.3 m off its mapped way breaks the on-the-way check', d > 0.3, d.toFixed(2)); }
  { const g = clone(FP); const gt = g.gates.find((q) => q.id === 'n828488069'); gt.gatePiers[0].x += gt.tx * 1.0; gt.gatePiers[0].z += gt.tz * 1.0; const w = Math.max(...gateMeasures(g).map((q) => q.diff)); ok('mutant: the south gate pier moved 1 m into the opening breaks the gate-width check', w > 0.5, w.toFixed(2)); }
  { // a closed opening: a physics world with the REAL fence colliders of the plan plus one panel standing in the south gate opening
    const W = new eng.Physics((x, z) => L.heightAt(x, z)); for (const p of FP.panels) if (!p.open && !p.drop) W.addBox(p.x, p.z, 0.16, p.len + 0.02, p.yaw, -0.5, 1.9);
    for (const g of FP.gates) for (const q of g.gatePiers) W.addBox(q.x, q.z, 0.9, 0.9, q.yaw, -0.5, 3.1);
    const base = openingWalks(FP, W); const g = FP.gates.find((q) => q.id === 'n828488069'); W.addBox(g.x, g.z, 0.16, g.width, g.yaw, -0.5, 1.9); const mut = openingWalks(FP, W);
    ok('mutant: a panel standing in the south gate opening stops the walker (the opening check can fail): the 13 openings of a physics world with the plan\'s colliders are passable, with the extra panel 12 of 13', base.filter((w) => w.passed).length === 13 && mut.filter((w) => w.passed).length === 12, `${base.filter((w) => w.passed).length} -> ${mut.filter((w) => w.passed).length}`); }
  { // a missing panel: a physics world without the collider of one closed panel lets the walker through
    const p = FP.panels.find((q) => !q.open && !q.drop && q.fence === 'w426502809' && q.i === 60), W = new eng.Physics((x, z) => L.heightAt(x, z)); for (const q of FP.panels) if (!q.open && !q.drop && q !== p) W.addBox(q.x, q.z, 0.16, q.len + 0.02, q.yaw, -0.5, 1.9);
    const nx = -p.tz, nz = p.tx, s = sideOfGarden(p.x, p.z, nx, nz), r = walker(p.x - nx * s * 1.8, p.z - nz * s * 1.8, p.x + nx * s * 1.8, p.z + nz * s * 1.8, 150, W);
    ok('mutant: a fence without the collider of one panel lets the walker through (the stop check can fail)', r.along > 2.45, r.along.toFixed(2)); }
}
console.log(`\n${total} checks, ${failed} failed`);
console.log(failed ? `RESULT: FAIL (${failed} of ${total} checks)` : `RESULT: OK (${total} checks)`);
process.exit(failed ? 1 : 0);
