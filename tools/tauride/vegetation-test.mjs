// vegetation-test.mjs - T5 of the Tauride remake: the garden's own trees (the border belt, the lime avenues, the groves, the solitary oaks, the shore planting, the 7 OSM trees). node tools/area.mjs north tools/tauride/vegetation-test.mjs [--no-env]
// Every check runs on the REAL built module (environment + landmarksTauride through the module entry) or on the real planter (vegetation.js planVegetation) fed with the real data; the design values come from
// src/world/landmarksTauride/data/vegetation.js, and the mutants (a keep-out margin set to 0, a species table with a crown base of 0, a mask planned without the planting) must turn a check red. The keep-outs are measured with
// the test's OWN geometry against the data modules (not with the planter's functions). --no-env builds the module alone (the environment checks are skipped).
// Fix round 1 (the reviewers): the zone geometry is pinned directly on the built list with a mutant each (2b); the head-clearance mutant uses a fixture species (3); the larch is pinned to its new row and the engine's spruce
// to its geometry hash of before (4, 6); the palace parterre clearing (HOOKS.treeCleared) and the T11 sight line are measured on the environment's real trees, with the hook switched off as the mutant (6).
// Fix round 2 (the QA gate: an OSM oak on the asphalt of the perimeter alley): the mapped trees obey every keep-out, nudged to the nearest clear spot within ZONES.osm.nudge m or refused; every tree is measured by section 2 (no forced tree).
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
const GH = await imp('src/world/landmarksTauride/height.js');
const VG = await imp('src/world/landmarksTauride/vegetation.js');
const DV = await imp('src/world/landmarksTauride/data/vegetation.js');
const DG = await imp('src/world/landmarksTauride/data/ground.js');
const GM = await imp('src/world/landmarksTauride/ground-material.js');
const PD = await imp('src/world/landmarksTauride/paths-draped.js');
const TG = await imp('src/world/environment/treegeo.js');
const Pd = await imp('src/world/landmarksTauride/data/paths.js');
const Fo = await imp('src/world/landmarksTauride/data/footprints.js');
const Fu = await imp('src/world/landmarksTauride/data/furniture.js');
const Rl = await imp('src/world/landmarksTauride/data/relief.js');
const Wd = await imp('src/world/landmarksTauride/data/water.js');
const CAMS = await imp('tools/tauride-cams.mjs');
const AT = await imp('src/world/lib/area-tables.js');
const HP = await imp('src/areas/north/hooks/people.js');
const KO = await imp('src/areas/north/hooks/keep-out.js');
const FAC = await imp('src/areas/north/data/city.js');
const { createHash } = await import('node:crypto');
const L = eng.L, shore = GH.GARDEN_SHORE, P = GH.PONDS, K = DV.KEEP_OUT, Z = DV.ZONES;
const segDist = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0; return Math.hypot(x - ax - t * dx, z - az - t * dz); };
const polyDist = (x, z, pts) => { let m = Infinity; for (let i = 0; i + 3 < pts.length; i += 2) m = Math.min(m, segDist(x, z, pts[i], pts[i + 1], pts[i + 2], pts[i + 3])); return m; };
const ringDist = (x, z, r) => { let m = Infinity; for (let i = 0; i < r.length; i += 2) m = Math.min(m, segDist(x, z, r[i], r[i + 1], r[(i + 2) % r.length], r[(i + 3) % r.length])); return m; };
const ringHas = (o, x, z) => { let c = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if ((o[i + 1] > z) !== (o[j + 1] > z) && x < (o[j] - o[i]) * (z - o[i + 1]) / (o[j + 1] - o[i + 1]) + o[i]) c = !c; return c; };
const inPoly = (x, z, p) => ringHas(p.o, x, z) && !(p.h || []).some((h) => ringHas(h, x, z));
const noEnv = args.has('--no-env');

// =============================================================== 0. the build (the real module entry)
const { ctx, camera } = SE.makeContext(eng, ['environment', 'landmarksTauride']);
const t0 = performance.now();
await SE.buildModules(eng, ctx, noEnv ? ['landmarksTauride'] : ['environment', 'landmarksTauride']);
const buildMs = performance.now() - t0, svc = ctx.services.landmarksTauride, T = svc && svc.trees, env = ctx.services.environment;
console.log(`built ${noEnv ? 'landmarksTauride' : 'environment + landmarksTauride'} in ${buildMs.toFixed(0)} ms`);
ok('the module publishes trees { list, treeList, canopy, stats, level, instances, colliders, meshes, families, triangles(), trianglesWorst, draws(), assign(), readBack() } and treeList', !!T && Array.isArray(T.list) && T.list.length > 500 && Array.isArray(T.treeList) && T.treeList.length === T.list.length && Array.isArray(T.canopy) && typeof T.triangles === 'function' && typeof T.draws === 'function' && typeof T.assign === 'function' && typeof T.readBack === 'function' && svc.treeList === T.treeList, T ? `${T.instances} trees, level ${T.level}, ${T.families.length} families` : 'no service');
if (!T) { console.log('RESULT: FAIL (no trees service)'); process.exit(1); }
const list = T.list, trees = list.filter((t) => !t.shrub), shrubs = list.filter((t) => t.shrub);
console.log(`  ${list.length} instances (${trees.length} trees, ${shrubs.length} shrubs): ${JSON.stringify(T.stats.kept)}; species ${JSON.stringify(T.stats.species)}`);
const byId = new Map(); for (const g of FAC.GREEN) byId.set(g.id, g);
const woods = Fo.GARDEN_GREEN.woods.flatMap((w) => (byId.get(w.id) ? byId.get(w.id).polys.map((p) => ({ o: p.o, h: p.h || [] })) : []));
const play = Fo.GARDEN_GREEN.others.filter((g) => g.kind !== 'wetland').flatMap((w) => (byId.get(w.id) ? byId.get(w.id).polys.map((p) => ({ o: p.o, h: p.h || [] })) : []));
const inputs = { ...VG.collectVegetationInputs(FAC.GREEN, { keepOut: svc.bridges.keepOut, sites: svc.bridges.sites }, { instances: svc.reeds.list }), level: 'medium' };
const sig = (l) => JSON.stringify(l.map((t) => [t.zone, t.species, +t.x.toFixed(4), +t.z.toFixed(4), +t.s.toFixed(4), +t.yaw.toFixed(4)]));

// =============================================================== 1. the plan: determinism, the tiers, the shares, the OSM trees, the solitary oaks
console.log('1. the plan (vegetation.js planVegetation): deterministic, the built list is the plan, the tiers, the species shares per zone, the 7 OSM trees, the solitary oaks');
{ const a = VG.planVegetation(inputs), b = VG.planVegetation(inputs);
  ok('planVegetation is deterministic (two plans with the same inputs are the same bits) and the BUILT module holds exactly that plan', sig(a.trees) === sig(b.trees) && sig(a.trees) === sig(list), `${a.trees.length} / ${b.trees.length} / ${list.length}`);
  const low = VG.planVegetation({ ...inputs, level: 'low' }), high = VG.planVegetation({ ...inputs, level: 'high' }), B = DV.BUDGET;
  const key = (t) => t.zone + ':' + t.x.toFixed(3) + ':' + t.z.toFixed(3), med = new Set(list.map(key));
  ok(`the tiers (BUDGET): medium ${list.length} <= ${B.instances.medium} (and >= 900), low (the performance tier) ${low.trees.length} <= ${B.instances.low} and a SUBSET of medium, high ${high.trees.length} <= ${B.instances.high}`, list.length <= B.instances.medium && list.length >= 900 && low.trees.length <= B.instances.low && low.trees.length >= 0.6 * list.length && low.trees.every((t) => med.has(key(t))) && high.trees.length <= B.instances.high, `low ${low.trees.length}, medium ${list.length}, high ${high.trees.length}`);
  ok('the built module planted the tier of its context (quality medium -> level medium)', T.level === 'medium' && ctx.quality.name === 'medium', T.level);
  // the species shares per zone against the authored mix (+-5 points); the grove's shrubs are a share of the candidates, the mix is among the trees
  const rows = []; let shareBad = 0;
  for (const [zone, mix] of [['belt', Z.belt.mix], ['avenue', Z.avenue.mix], ['grove', Z.grove.mix], ['shore', Z.shore.mix]]) {
    const inZone = list.filter((t) => t.zone === zone && (zone === 'grove' ? !t.shrub : true)), n = inZone.length, tot = Object.values(mix).reduce((s, v) => s + v, 0);
    for (const [k, w] of Object.entries(mix)) { const got = inZone.filter((t) => t.species === k).length / n * 100, want = w / tot * 100; if (Math.abs(got - want) > 5) shareBad++; rows.push(`${zone}.${k} ${got.toFixed(1)}/${want.toFixed(0)}`); }
    const alien = inZone.filter((t) => !(t.species in mix)).length; if (alien) shareBad++;
  }
  ok('the species shares per zone are within 5 points of the authored mix (belt oak 40 / lime 30 / larch 10 / ash 10 / maple 10, the avenues all limes, the groves, the shore), no species outside its zone\'s mix', shareBad === 0, rows.join(' '));
  // the OSM trees (fix round 2: the QA found an oak ON the asphalt of the perimeter alley, two more cutting its edge: the nodes were forced through every rule but the water): each node is planted at its position, or nudged to the
  // nearest clear spot within ZONES.osm.nudge m when a way ribbon refuses the node, or refused when no spot within that radius clears the rule; measured here with the test's OWN way geometry
  const osm = list.filter((t) => t.zone === 'osm'), ON = Z.osm.nudge, nodeOf = (t) => (t.node ? [t.node.x, t.node.z] : [t.x, t.z]), atNode = (t, q) => { const [nx, nz] = nodeOf(t); return Math.abs(nx - q.x) < 1e-9 && Math.abs(nz - q.z) < 1e-9; };
  const wayList = Pd.PATHS.filter((p) => p.cls !== 'bridge' && p.cls !== 'steps').map((p) => ({ pts: p.pts, hw: p.w / 2 + PD.PATHS_DRAPED.pad })), onWay = (x, z, tr) => wayList.some((w) => polyDist(x, z, w.pts) < w.hw + K.way + tr - 1e-6);
  const refused = Fu.OSM_TREES.filter((q) => !osm.some((t) => atNode(t, q))), trOak = osm.length ? osm[0].tr : 0.61;
  const noSpot = (q) => { for (let d = 0.25; d <= ON + 1e-9; d += 0.25) for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; if (!onWay(q.x + d * Math.cos(a), q.z + d * Math.sin(a), trOak)) return false; } return true; };
  const moved = (t) => Math.hypot(t.x - t.node.x, t.z - t.node.z);
  ok(`the OSM trees (data/furniture.js OSM_TREES, 7 nodes): each planted ONCE as an old oak (scale 1.2 .. 1.4) at its node, or nudged to the nearest clear spot within ${ON} m when a way ribbon refuses the node (the perimeter alley w425201986 runs over three nodes), or refused when no spot within ${ON} m clears the way rule (the test's own geometry); a planted oak never stands within the way rule of a ribbon`, osm.length >= 6 && osm.length <= 7 && osm.every((t) => t.species === 'oldOak' && t.fam === 'oak' && t.s >= 1.2 && t.s <= 1.4) && Fu.OSM_TREES.every((q) => osm.filter((t) => atNode(t, q)).length <= 1) && osm.every((t) => Fu.OSM_TREES.some((q) => atNode(t, q))) && osm.every((t) => (!t.node ? !onWay(t.x, t.z, t.tr) : (t.node.why === 'way' && onWay(t.node.x, t.node.z, t.tr) && !onWay(t.x, t.z, t.tr) && moved(t) <= ON + 1e-6 && Math.abs(moved(t) - t.node.d) < 1e-6))) && refused.every(noSpot), osm.map((t) => `(${t.x.toFixed(2)}, ${t.z.toFixed(2)})${t.node ? ` <- (${t.node.x}, ${t.node.z}) ${t.node.d} m` : ''} s ${t.s.toFixed(2)}`).join(' ') + (refused.length ? `; refused ${refused.map((q) => `(${q.x}, ${q.z})`).join(' ')}` : ''));
  ok(`... the numbers: 6 oaks planted (2 at their node, 4 nudged 0.5 .. 2.5 m: the SW oak (997, -1413.1) by 0.5 m for the 1.5 m margin, not for the ribbon), 1 node refused ('osm:way': (1313.4, -1530.4) lies 1.17 m off the alley's axis and 4.02 m off the trail w112881682 beside it; no spot within ${ON} m clears both, the first lies 6 m away across the alley), the stats say so`, osm.length === 6 && osm.filter((t) => t.node).length === 4 && osm.filter((t) => t.node).every((t) => t.node.d >= 0.5 && t.node.d <= 2.5) && refused.length === 1 && Math.abs(refused[0].x - 1313.4) < 1e-9 && T.stats.rejected['osm:way'] === 1 && T.stats.zones.osm.nudged === 4 && T.stats.nudged.osm.length === 4, `${osm.length} planted, ${osm.filter((t) => t.node).length} nudged, osm stats ${JSON.stringify(T.stats.zones.osm)}, rejected ${JSON.stringify(Object.fromEntries(Object.entries(T.stats.rejected).filter(([k]) => k.startsWith('osm'))))}`);
  { const m = VG.planVegetation({ ...inputs, zones: { ...Z, osm: { ...Z.osm, nudge: 0 } } }).trees.filter((t) => t.zone === 'osm'); ok('mutant: ZONES.osm.nudge 0 (no nudge at all) refuses the 4 nudged nodes too: 2 OSM oaks, none moved (the check can fail)', m.length === 2 && m.every((t) => !t.node), `${m.length}`); }
  { const m = VG.planVegetation({ ...inputs, zones: { ...Z, osm: { ...Z.osm, nudge: 6 } } }).trees.filter((t) => t.zone === 'osm'); ok('the knob: ZONES.osm.nudge 6 would keep the 7th oak as well, 6 m across the alley (the lead\'s decision; recorded, not shipped)', m.length === 7 && m.some((t) => t.node && Math.abs(t.node.x - 1313.4) < 1e-9 && t.node.d === 6), `${m.length}: ${m.filter((t) => t.node).map((t) => `${t.node.d} m`).join(' ')}`); }
  if (!noEnv) { const envIn = env.trees.filter((t) => HP.inGarden(t.x, t.z)); ok(`... and NOT by the environment: 0 environment trunks inside the garden outline (${env.trees.length} trunks in the North), its counter 'osm:garden' refused the 7 mapped trees (HOOKS.treeReject answers 'garden')`, envIn.length === 0 && env.treeStats.rej['osm:garden'] === 7, `${envIn.length} inside, rej ${JSON.stringify(env.treeStats.rej)}`); }
  const sol = list.filter((t) => t.zone === 'meadow');
  ok(`the solitary oaks of the meadows: at most ${Z.meadow.solitary.length} old oaks, each on a mown meadow block of data/ground.js (the OSM wood polygons overlap the generous meadow blocks: a solitary oak may stand in one), with a clearing of ${Z.meadow.clear} m that no other tree enters`, sol.length >= 4 && sol.length <= Z.meadow.solitary.length && sol.every((t) => t.species === 'oldOak' && DG.MEADOWS.some((m) => ringHas(m.o, t.x, t.z)) && list.every((q) => q === t || Math.hypot(q.x - t.x, q.z - t.z) >= Z.meadow.clear)), `${sol.length} of ${Z.meadow.solitary.length}: ${sol.map((t) => `(${t.x}, ${t.z})`).join(' ')}`);
  ok('no zone is empty and the groves carry the shrubs (10 .. 16 % of the grove instances)', ['osm', 'meadow', 'belt', 'avenue', 'shore', 'grove'].every((z) => T.stats.kept[z] > 0) && shrubs.filter((t) => t.zone === 'grove').length / list.filter((t) => t.zone === 'grove').length > 0.08, JSON.stringify(T.stats.kept));
}

// =============================================================== 2. the keep-outs (the test's own geometry), each with a mutant
console.log('2. the keep-outs (data/vegetation.js KEEP_OUT) measured against the data modules, and the mutants (a margin set to 0 plants trees there)');
{ const ways = Pd.PATHS.filter((p) => p.cls !== 'bridge' && p.cls !== 'steps').map((p) => ({ pts: p.pts, hw: p.w / 2 + PD.PATHS_DRAPED.pad })), stairs = Pd.PATHS.filter((p) => p.cls === 'steps').map((p) => p.pts);
  const fps = Fo.FOOTPRINTS.flatMap((f) => f.polys.map((p) => p.o)), gates = [...Fu.GATES.map((g) => [g.x, g.z]), ...Fu.FENCE_OPENINGS.map((o) => [(o.x + o.x2) / 2, (o.z + o.z2) / 2])];
  const M = Rl.FEATURES.find((f) => f.key === 'M'), decks = svc.bridges.keepOut, heads = svc.bridges.sites.flatMap((s) => [s.axis[0], s.axis[s.axis.length - 1]]), reeds = svc.reeds.list, lane = Fu.SERVICE_LANE.ways;
  const poses = [...CAMS.CAMS.filter((c) => !c.flight), ...L.VIEWS.filter((v) => v.key === 'Digit5' || v.key === 'Digit6')];
  const crest = (x, z) => 2 * (P.BANK_TOP - P.WATER_Y) * GH.gardenHeight.profile.slopeAt(x, z);
  const slopeAt = (x, z) => { const h = (a, b) => GH.gardenHeight(a, b) ?? 0; return Math.hypot(h(x + 0.5, z) - h(x - 0.5, z), h(x, z + 0.5) - h(x, z - 0.5)); };
  const V = {
    footprint: (t) => fps.some((r) => ringHas(r, t.x, t.z) || ringDist(t.x, t.z, r) < K.footprint + t.tr - 1e-6),
    way: (t) => ways.some((w) => polyDist(t.x, t.z, w.pts) < w.hw + K.way + t.tr - 1e-6),
    stair: (t) => stairs.some((s) => polyDist(t.x, t.z, s) < K.stair - 1e-6),
    lane: (t) => lane.some((w) => polyDist(t.x, t.z, w.pts) < w.w / 2 + K.lane + t.tr - 1e-6),
    water: (t) => shore.dist(t.x, t.z) <= 0,
    bank: (t) => t.zone !== 'shore' && shore.dist(t.x, t.z) < crest(t.x, t.z) + K.bankMargin - 1e-6,
    shoreBand: (t) => t.zone === 'shore' && (shore.dist(t.x, t.z) < crest(t.x, t.z) + Z.shore.d[0] - 0.06 || shore.dist(t.x, t.z) > crest(t.x, t.z) + Z.shore.d[1] + 0.31),
    deck: (t) => decks.some((d) => polyDist(t.x, t.z, d.axis.flat()) < d.hw + (d.type === 'weir' ? K.dam : K.deck) - 1e-6),
    head: (t) => heads.some((h) => Math.hypot(h[0] - t.x, h[1] - t.z) < K.head - 1e-6),
    reed: (t) => reeds.some((q) => Math.hypot(q.x - t.x, q.z - t.z) < K.reed + t.tr - 1e-6),
    pose: (t) => poses.some((c) => Math.hypot(c.x - t.x, c.z - t.z) < K.pose - 1e-6),
    play: (t) => play.some((p) => inPoly(t.x, t.z, p) || ringDist(t.x, t.z, p.o) < K.play - 1e-6),
    fountain: (t) => Fu.FOUNTAINS.some((f) => Math.hypot(f.x - t.x, f.z - t.z) < K.fountain - 1e-6),
    monument: (t) => Fu.MONUMENTS.some((m) => Math.hypot(m.x - t.x, m.z - t.z) < K.monument - 1e-6),
    memorial: (t) => { const dx = t.x - M.x, dz = t.z - M.z; return (dx / (M.rx + K.memorial)) ** 2 + (dz / (M.rz + K.memorial)) ** 2 < 1; },
    gate: (t) => gates.some((g) => Math.hypot(g[0] - t.x, g[1] - t.z) < K.gate - 1e-6),
    outline: (t) => !shore.inGarden(t.x, t.z) || ringDist(t.x, t.z, Fo.GARDEN.o) < K.outline - 1e-6,
    orangery: (t) => Math.hypot(DV.ORANGERY.x - t.x, DV.ORANGERY.z - t.z) < DV.ORANGERY.r,
    slope: (t) => slopeAt(t.x, t.z) > K.slope + 1e-6 || (t.old && slopeAt(t.x, t.z) > K.slopeOld + 1e-6),
  };
  const corr = (t) => DV.CLEARINGS.some((c) => { const a = c.yaw * Math.PI / 180, dx = -Math.sin(a), dz = -Math.cos(a), px = t.x - c.x, pz = t.z - c.z, u = px * dx + pz * dz; return u > 0 && u < c.len && Math.abs(px * dz - pz * dx) < c.hw * (1 - 0.5 * u / c.len); });
  const notForced = list;    // fix round 2: no tree is forced through the rules any more (the OSM oaks are nudged instead): EVERY tree is measured
  for (const [k, f] of Object.entries(V)) { const n = (k === 'water' ? list : notForced).filter(f).length; ok(`no tree violates the keep-out '${k}'`, n === 0, `${n} of ${notForced.length}`); }
  const osmWet = list.filter((t) => t.zone === 'osm' && shore.dist(t.x, t.z) <= 0).length; ok('the OSM oaks stand on land (the water is the one rule the nudge never answers)', osmWet === 0, '');
  // the mutants: a plan with ONE margin set to 0 (or the rule off) places trees where the rule forbids them (the independent measure above turns red)
  const mut = (keepOut, extra = {}) => VG.planVegetation({ ...inputs, keepOut, ...extra }).trees;
  // (the rules overlap: the decks, the heads, the stairs and the reeds lie on the banks, which the bank rule keeps clear by itself, and most poses stand on an alley: a mutant of one of those rules relaxes the covering rules with it, so that the measure of THAT rule is what turns red)
  const shoreLow = { ...Z, shore: { ...Z.shore, d: [-5, 2.6] } };
  const MUT = [['footprint', { footprint: -0.5 }], ['way', { way: -0.4 }], ['stair', { stair: 0, bankMargin: -6, memorial: -12, head: 0, deck: -1, dam: -1, way: -0.4, pose: 0 }], ['deck', { deck: -1, dam: -1, head: 0, bankMargin: -6 }], ['head', { head: 0, deck: -1, dam: -1, bankMargin: -6 }], ['reed', { reed: -1, bankMargin: -6 }], ['play', { play: -1 }], ['fountain', { fountain: 0 }], ['monument', { monument: 0 }], ['memorial', { memorial: -12 }], ['gate', { gate: 0 }], ['bank', { bankMargin: -4 }], ['outline', { outline: 0 }], ['slope', { slopeOld: 1, slope: 1 }]];
  for (const [k, ko] of MUT) { const n = mut(ko, k === 'reed' ? { zones: shoreLow } : {}).filter(V[k]).length; ok(`mutant: KEEP_OUT.${Object.keys(ko).join(' / ')} off plants trees where '${k}' forbids them (the check can fail)`, n > 0, `${n} violations`); }
  { const r = mut({ pose: 0, way: -0.4 }, { clearings: DV.CLEARINGS.map((c) => ({ ...c, len: 0, hw: 0 })) }); const n = r.filter(V.pose).length, m = r.filter(corr).length; ok('mutant: no camera clearing at all (and the alleys open) plants trees in the look corridors of the poses (the check can fail; the pose discs themselves lie on the alleys and the banks, which their own rules keep clear)', m > 0, `${n} at the poses, ${m} in the corridors`); }
  { const r = VG.planVegetation({ ...inputs, bridgeKeepOut: [], bridgeHeads: [], reeds: [], keepOut: { bankMargin: -6 }, zones: shoreLow }).trees; const n = r.filter(V.deck).length + r.filter(V.head).length + r.filter(V.reed).length; ok('mutant: a plan without the bridge and reed plans (and the bank rule relaxed) plants on the decks, the heads and the reed clumps (the check can fail)', n > 0, `${n}`); }
  // the look corridor of the poses (the engine clears the same shape round the VIEWS): no crown centre in the corridor of a pose
  ok(`no trunk stands in the look corridor of a camera clearing (${DV.CLEARINGS[0].len} m long, ${DV.CLEARINGS[0].hw} m half width, tapering)`, notForced.filter(corr).length === 0, `${notForced.filter(corr).length}`);
  // the packing: no two crowns closer than the pack fraction of their radii
  let packBad = 0; for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const a = list[i], b = list[j]; const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < 20 && d < (a.r + b.r) * (a.shrub || b.shrub ? Math.min(K.pack, 0.42) : K.pack) - 1e-6) packBad++; }
  ok(`the crowns are packed no closer than ${K.pack} of the sum of their radii (${Math.min(K.pack, 0.42)} with a shrub)`, packBad === 0, `${packBad} pairs`);
  // ---- 2b. the zone geometry (fix round 1, the lens finding): the zones are pinned directly on the built list, with a mutant each (a planter that ignored the wood polygons, or a belt widened to 40 m, passed the 72 checks of the first round)
  console.log('2b. the zone geometry on the built list: the groves inside the OSM woods, the belt band, the avenue offset, the shore band, the tier cap idle; a mutant each');
  ok(`the plan is not thinned by the tier cap at medium: stats.planned ${T.stats.planned} == stats.instances ${T.stats.instances} (< BUDGET.instances.medium ${DV.BUDGET.instances.medium}: the cap must not be the thing that hides a planting that ran wild)`, T.stats.planned === T.stats.instances && T.stats.instances < DV.BUDGET.instances.medium, '');
  const mains = Pd.PATHS.filter((p) => Z.avenue.classes.includes(p.cls) && p.lenM >= Z.avenue.minLen).map((p) => ({ pts: p.pts, hw: p.w / 2 + PD.PATHS_DRAPED.pad }));
  const ZV = {
    grove: (t) => woods.some((p) => inPoly(t.x, t.z, p)),
    belt: (t) => { const d = ringDist(t.x, t.z, Fo.GARDEN.o); return d >= Z.belt.inner - 1e-6 && d <= Z.belt.width + 1e-6; },
    avenue: (t) => mains.some((w) => Math.abs(polyDist(t.x, t.z, w.pts) - w.hw - Z.avenue.offset) <= 0.8 + 1e-6),
    shore: (t) => { const d = shore.dist(t.x, t.z) - crest(t.x, t.z); return d >= Z.shore.d[0] - 0.06 && d <= Z.shore.d[1] + 0.31; },
  };
  const zoneBad = (l, zone) => l.filter((t) => t.zone === zone && !ZV[zone](t)).length, zoneN = (zone) => list.filter((t) => t.zone === zone).length;
  ok(`every 'grove' tree (${zoneN('grove')}) stands INSIDE an OSM wood polygon (GARDEN_GREEN.woods, the facade's rings; the jittered point itself is tested)`, zoneN('grove') > 200 && zoneBad(list, 'grove') === 0, `${zoneBad(list, 'grove')} outside`);
  ok(`every 'belt' tree (${zoneN('belt')}) stands ${Z.belt.inner} .. ${Z.belt.width} m inside the garden outline`, zoneN('belt') > 100 && zoneBad(list, 'belt') === 0, `${zoneBad(list, 'belt')} off the band`);
  ok(`every 'avenue' tree (${zoneN('avenue')}) stands ${Z.avenue.offset} m (+- 0.8) off the ribbon edge of a '${Z.avenue.classes.join('/')}' alley of ${Z.avenue.minLen} m or more`, zoneN('avenue') > 100 && zoneBad(list, 'avenue') === 0, `${zoneBad(list, 'avenue')} off the offset`);
  ok(`every 'shore' tree (${zoneN('shore')}) stands on the crest band of the banks (crest + ${Z.shore.d[0]} .. ${Z.shore.d[1]} m)`, zoneN('shore') > 30 && zoneBad(list, 'shore') === 0, `${zoneBad(list, 'shore')} off the band`);
  const meadowGrove = list.filter((t) => t.zone === 'grove' && DG.MEADOWS.some((m) => ringHas(m.o, t.x, t.z)) && !woods.some((p) => inPoly(t.x, t.z, p))).length;
  ok('no tree of the grove zone stands on a MEADOWS block of data/ground.js outside a wood polygon', meadowGrove === 0, `${meadowGrove}`);
  { const boxes = woods.map((p) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < p.o.length; i += 2) { x0 = Math.min(x0, p.o[i]); x1 = Math.max(x1, p.o[i]); z0 = Math.min(z0, p.o[i + 1]); z1 = Math.max(z1, p.o[i + 1]); } return { o: [x0, z0, x1, z0, x1, z1, x0, z1], h: [] }; });
    const r = VG.planVegetation({ ...inputs, woods: boxes }).trees; ok('mutant: a planter fed the bounding BOXES of the woods instead of their polygons plants grove trees outside the woods (the check can fail)', zoneBad(r, 'grove') > 0, `${zoneBad(r, 'grove')} outside, ${r.length} trees`); }
  { const r = VG.planVegetation({ ...inputs, zones: { ...Z, belt: { ...Z.belt, width: 40 } } }).trees; ok(`mutant: a belt widened to 40 m plants belt trees beyond the ${Z.belt.width} m band (the check can fail)`, zoneBad(r, 'belt') > 0, `${zoneBad(r, 'belt')} off the band, ${r.length} trees`); }
  { const r = VG.planVegetation({ ...inputs, zones: { ...Z, avenue: { ...Z.avenue, offset: 6 } } }).trees; ok('mutant: an avenue offset of 6 m plants the limes off the authored offset (the check can fail)', zoneBad(r, 'avenue') > 0, `${zoneBad(r, 'avenue')} off the offset`); }
}

// =============================================================== 3. the crowns over the alleys: the real geometry
console.log('3. the crowns: no leaf lower than the walker\'s head over a ribbon (the REAL LOD0 geometry), the crown base table pinned to the geometry');
{ const SPT = VG.speciesTable(), minY = {};
  for (const [k, sp] of Object.entries(SPT)) { const g = TG.canopyGeometry(sp.fam, 0, sp.F); g.computeBoundingBox(); minY[k] = g.boundingBox.min.y; }
  const baseBad = Object.entries(SPT).filter(([k, sp]) => Math.abs(minY[k] - sp.base) > 0.02 * Math.max(1, sp.base) + 1e-6);
  ok('GARDEN_SPECIES.base equals the lowest leaf of the family\'s LOD0 canopy (within 2 %)', baseBad.length === 0, Object.entries(minY).map(([k, v]) => `${k} ${v.toFixed(2)}/${SPT[k].base}`).join(' '));
  const ways = Pd.PATHS.filter((p) => p.cls !== 'bridge' && p.cls !== 'steps').map((p) => ({ pts: p.pts, hw: p.w / 2 + PD.PATHS_DRAPED.pad }));
  const over = (t) => ways.some((w) => polyDist(t.x, t.z, w.pts) < w.hw + t.r), low = (t) => minY[t.species] * t.sy < K.headClear - 1e-6;
  const crowns = list.filter(over), bad = crowns.filter(low);
  ok(`every crown that reaches over a ribbon (${crowns.length} of ${list.length}) has its lowest leaf at least ${K.headClear} m up (the geometry's minimum y x the instance height)`, crowns.length > 100 && bad.length === 0, `${bad.length} low crowns`);
  // the mutant pair (fix round 1: no real species of the garden has a low AND wide crown any more, the larch's lowest tier is at 3.6 m, a shrub's crown never reaches past the trunk clearance): a FIXTURE species 'low',
  // a young oak (scale 0.5 .. 0.7: the real crown base 2.99 x 0.5 .. 0.77 = 1.5 .. 2.3 m, r 2.7 .. 3.8 m) planted as the whole grove mix: with its TRUE base the rule keeps every one of its crowns off the ribbons; with a table that claims base 9 the rule is fooled
  const fixture = (base) => VG.planVegetation({ ...inputs, data: { ...DV, GARDEN_SPECIES: { ...DV.GARDEN_SPECIES, low: { fam: 'oak', scale: [0.5, 0.7], leaf: 'oak', base } }, ZONES: { ...Z, grove: { ...Z.grove, mix: { low: 1 }, shrub: 0 } } } }).trees;
  const lowF = (t) => (t.species === 'low' ? minY.oak : minY[t.species]) * t.sy < K.headClear - 1e-6;
  const fooled = fixture(9), honest = fixture(minY.oak), lowOver = (l) => l.filter((t) => t.species === 'low').filter(over).filter(lowF).length;
  ok(`mutant: a species table that claims the fixture's crown base at 9 m lets its low crowns over the ribbons (the check can fail): ${lowOver(fooled)} of ${fooled.filter((t) => t.species === 'low').length} young oaks`, lowOver(fooled) > 0, '');
  ok(`... and with its true base (${minY.oak.toFixed(2)} m) the rule keeps every one of the ${honest.filter((t) => t.species === 'low').length} young oaks' low crowns off the ribbons (${honest.filter((t) => t.species === 'low').filter(over).length} reach over, 0 low)`, honest.filter((t) => t.species === 'low').length > 100 && lowOver(honest) === 0, `${lowOver(honest)}`);
}

// =============================================================== 4. the build: on the terrain, the engine's meshes and materials, the colliders, the budgets
console.log('4. the build (vegetation.js buildVegetation): every tree on the terrain, the engine\'s geometry and materials, the trunk colliders, the LOD buckets, the budgets');
{ let yBad = 0, worstY = 0; for (const t of list) { const e = Math.abs(t.y - (GH.gardenHeight(t.x, t.z) ?? 0)); worstY = Math.max(worstY, e); if (e > 0.02) yBad++; }
  ok('every tree of the list stands on the terrain: y = gardenHeight(x, z) (the banks and the hills; 0 on the flat lawn) within 2 cm', yBad === 0, `worst ${(worstY * 100).toFixed(2)} cm; ${list.filter((t) => t.y > 0.3).length} trees above 0.3 m, ${list.filter((t) => t.y < -0.05).length} below -0.05`);
  // the matrices as uploaded: every bucket's instances at the terrain height (the writer's shapeOf), the LOD of each by its distance to the camera of the assignment
  T.assign(1150, -1420); const rb = T.readBack(), cellOf = (v) => Math.floor(v), tg = new Map(); for (const t of list) { const k = cellOf(t.x) * 100003 + cellOf(t.z); let l = tg.get(k); if (!l) tg.set(k, (l = [])); l.push(t); }
  const nearest = (x, z) => { let best = null; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const t of tg.get((cellOf(x) + i) * 100003 + cellOf(z) + j) || []) if (!best || Math.hypot(t.x - x, t.z - z) < Math.hypot(best.x - x, best.z - z)) best = t; return best && Math.hypot(best.x - x, best.z - z) < 0.01 ? best : null; };      // (the matrices are float32: the positions round by up to 1e-4 at x ~1400)
  let rbBad = 0, lodBad = 0; for (const q of rb) { const t = nearest(q.x, q.z); if (!t || Math.abs(q.y - t.y) > 0.02 || Math.abs(q.sx - t.s) > 1e-5 || Math.abs(q.sy - t.sy) > 1e-5 || q.fam !== t.fam) { rbBad++; continue; } const d = Math.hypot(t.x - 1150, t.z + 1420), want = d < DV.LOD_D[0] ? 0 : d < DV.LOD_D[1] ? 1 : d < DV.LOD_D[2] ? 2 : 3; if (!(q.lod === want || (q.lod > want && d >= DV.LOD_D[q.lod - 1] * 0.9))) lodBad++; }      // (the first assignment was the HERO's: a tree just inside a band keeps its coarser LOD by the hysteresis, as the environment's do)
  ok(`the instance matrices as uploaded: ${rb.length} instances = the list, each at its tree's terrain y (2 cm), scale and family, in the LOD bucket of its distance to the camera (${DV.LOD_D.join(' / ')} m, the environment's hysteresis of 10 %)`, rb.length === list.length && rbBad === 0 && lodBad === 0, `${rbBad} wrong matrices, ${lodBad} in the wrong bucket`);
  const meshes = T.meshes, canopy = meshes.filter((m) => /^tauride-tree-/.test(m.name)), trunk = meshes.filter((m) => /^tauride-trunk-/.test(m.name));
  ok(`one InstancedMesh per family x LOD as the environment: ${T.families.length} families x 4 canopy LODs (${canopy.length}) + 2 trunk LODs where the family has a trunk (${trunk.length}), ${meshes.length} <= BUDGET.meshesMax ${DV.BUDGET.meshesMax}, every one frustumCulled false, shadows on LOD 0 / 1 only`, canopy.length === 4 * T.families.length && trunk.length <= 2 * T.families.length && meshes.length <= DV.BUDGET.meshesMax && meshes.every((m) => m.isInstancedMesh && m.frustumCulled === false) && canopy.every((m) => m.castShadow === (Number(m.name.slice(-1)) <= 1)), `${meshes.length} meshes`);
  const envCanopy = []; ctx.staticRoot.traverse((o) => { if (o.isInstancedMesh && /^env-tree-/.test(o.name)) envCanopy.push(o); });
  const names = new Set(canopy.map((m) => m.material.name)), lobe = canopy.find((m) => !/larch/.test(m.name)), tier = canopy.find((m) => /larch/.test(m.name));
  ok("the materials are the engine's: the broad-leaved crowns on 'env-canopy' (leafmat.js canopyMaterial: sway + leaf cells), the larch on 'env-conifer', the trunks on the 'env-bark-pb-*' trunk materials" + (noEnv ? '' : ', the SAME material objects as the environment\'s trees (the material cache)'), lobe && tier && lobe.material.name === 'env-canopy' && tier.material.name === 'env-conifer' && lobe.material.userData.envSway === true && trunk.every((m) => /^env-bark-pb-/.test(m.material.name)) && (noEnv || (envCanopy.length > 0 && envCanopy.some((m) => m.material === lobe.material))), [...names].join(' '));
  if (!noEnv) { const envTrunk = []; ctx.staticRoot.traverse((o) => { if (o.isInstancedMesh && /^env-trunk-oak-0$/.test(o.name)) envTrunk.push(o); }); const mine = trunk.find((m) => m.name === 'tauride-trunk-oak-0'); ok('the bark textures are the environment\'s (the texture cache: the same painter under the same key draws nothing twice)', !!mine && envTrunk.length === 1 && mine.material.map === envTrunk[0].material.map, ''); }
  const envOak = envCanopy.find((m) => m.name === 'env-tree-oak-0'), myOak = canopy.find((m) => m.name === 'tauride-tree-oak-0'), tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
  ok('the geometry per instance is the engine\'s: the garden\'s oak LOD0 has the triangle count of treegeo.canopyGeometry(\'oak\', 0)' + (noEnv ? '' : ' and of the environment\'s oak LOD0 mesh'), !!myOak && tris(myOak.geometry) === tris(TG.canopyGeometry('oak', 0)) && (noEnv || (envOak && tris(envOak.geometry) === tris(myOak.geometry))), myOak ? `${tris(myOak.geometry)} triangles` : 'no oak mesh');
  const larch = canopy.filter((m) => /larch/.test(m.name)), larchTris = larch.map((m) => tris(m.geometry)), LX = DV.SPECIES_EXTRA.larch;
  const lg = TG.canopyGeometry('larch', 0, LX); lg.computeBoundingBox(); const lt = TG.trunkGeometry('larch', 0, LX); lt.computeBoundingBox(); const lb = lg.boundingBox, tb = lt.boundingBox;
  ok(`the larch (SPECIES_EXTRA, fix round 1: a narrow 'tiers' cone H ${LX.H} / R ${LX.R} on a clear stem; was H 20 / R 3.4 from 0.9 m up without an underside, a paper tent at 12 m) has its four LODs of ${larchTris.join(' / ')} triangles (LOD0 / 1 = tiers x segments x 2: the underside is kept), the lowest tier at y0 ${LX.y0} m = GARDEN_SPECIES.larch.base, the stem ${LX.stem[0]} m tall reaching into the lowest tier, R 2.0 .. 2.4`, larch.length === 4 && larchTris[0] === LX.tiers[0] * LX.seg[0] * 2 && larchTris[1] === LX.tiers[1] * LX.seg[1] * 2 && larchTris[1] > larchTris[2] && larchTris[2] >= larchTris[3] && larchTris[0] <= 400 && Math.abs(lb.min.y - LX.y0) < 0.01 && Math.abs(lb.min.y - DV.GARDEN_SPECIES.larch.base) < 0.01 && LX.y0 >= 3 && LX.y0 <= 4 && LX.R >= 2 && LX.R <= 2.4 && LX.under === true && LX.open === true && tb.max.y > LX.y0 + 0.5 && tb.max.y < LX.y0 + 1.5 && Math.max(lb.max.x, -lb.min.x) <= LX.R + 1e-6, `y ${lb.min.y.toFixed(2)} .. ${lb.max.y.toFixed(2)}, r ${Math.max(lb.max.x, -lb.min.x).toFixed(2)}, stem to ${tb.max.y.toFixed(2)}`);
  const hsl = (hex) => { const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); return { s: mx === mn ? 0 : (mx - mn) / (mx + mn), l: (mx + mn) / 2 }; };
  const limeL = Math.max(...DV.LEAF.lime.map((h) => hsl(h).l));
  ok(`LEAF.larch is a lighter green than every lime hex (L ${DV.LEAF.larch.map((h) => hsl(h).l.toFixed(2)).join(' / ')} > ${limeL.toFixed(2)}) and less saturated than the first round's lime green (S < 0.42: ${DV.LEAF.larch.map((h) => hsl(h).s.toFixed(2)).join(' / ')})`, DV.LEAF.larch.length >= 3 && DV.LEAF.larch.every((h) => hsl(h).l > limeL && hsl(h).s < 0.42), '');
  // the colliders: a cylinder per tree in the play area, from the street level (lower on a bank) to the crown base over the terrain; the real Player is stopped by one
  const cyls = ctx.physics.items.filter((it) => it.type === 'cyl' && it.cx > 900 && it.cx < 1510 && it.cz > -1800 && it.cz < -1250 && HP.inGarden(it.cx, it.cz));
  const inPlay = list.filter((t) => L.inPlay(t.x, t.z, -5)), byCyl = new Map(cyls.map((c) => [c.cx.toFixed(3) + ',' + c.cz.toFixed(3), c]));
  let colBad = 0; for (const t of inPlay) { const c = byCyl.get(t.x.toFixed(3) + ',' + t.z.toFixed(3)); if (!c || Math.abs(c.r - t.tr) > 1e-9 || c.y0 > Math.min(0, t.y) - 0.5 + 1e-9 || c.y1 < t.y + (t.shrub ? 1.3 : 4.5) - 1e-9 || c.y0 >= 1.7) colBad++; }
  ok(`the trunk colliders: ${T.colliders} cylinders = the trees in the play area (${inPlay.length}), each at its trunk with its radius, from the street level or lower to y + 4.5 (1.3 for a shrub), y0 < 1.7 (people/nav.js reads it as an obstacle)`, T.colliders === inPlay.length && cyls.length >= inPlay.length && colBad === 0, `${colBad} wrong, ${cyls.length} cylinders in the garden`);
  { const flat = trees.filter((t) => Math.abs(t.y) < 0.01 && t.r > 3 && shore.dist(t.x, t.z) > 9 && Pd.PATHS.every((p) => polyDist(t.x, t.z, p.pts) > 6)).slice(0, 12); let stopped = 0, rows = [];
    for (const t of flat) { const p = SE.makePlayer(eng, camera, ctx.physics, { x0: 900, x1: 1520, z0: -1800, z1: -1250 }); const a = (t.x * 7 + t.z * 3) % 6.283; p.pos.set(t.x + Math.cos(a) * 3, 0, t.z + Math.sin(a) * 3); SE.walkToward(p, t.x, t.z, 240); const d = Math.hypot(p.pos.x - t.x, p.pos.z - t.z); rows.push(d.toFixed(2)); if (d >= t.tr - 0.01) stopped++; }
    ok(`the real Player walking at a trunk from 3 m is stopped at it: ${stopped} of ${flat.length} trees, the axis distance stays >= the trunk radius`, flat.length >= 8 && stopped === flat.length, rows.join(' ')); }
  const blob = meshes.length && ctx.staticRoot.getObjectByName('tauride-treeblob');
  ok('the contact-shadow blobs stand under the trees on flat ground only (a flat disc on a bank or a hill would cut into the slope), out of the outline pass, never batched', !!blob && blob.isInstancedMesh && T.blobs === blob.count && T.blobs > 0.6 * list.length && T.blobs < list.length && blob.layers.mask === 1 << ctx.LAYER_NO_OUTLINE && blob.userData.noBatch === true, `${T.blobs} blobs for ${list.length} instances`);
  // the budgets: triangles at the HERO (what npm run check:north counts), at the centre of the garden and at the south gate; the draws
  T.assign(L.HERO.x, L.HERO.z); const triHero = T.triangles(), drawsHero = T.draws(); T.assign(1150, -1420); const triC = T.triangles(), drawsC = T.draws(); T.assign(1226, -1290); const triG = T.triangles();
  const B = DV.BUDGET.triangles;
  ok(`the triangles of the LOD buckets: at the HERO (every tree at LOD3, what check:north counts) ${triHero} <= ${B.hero}; in the middle of the garden (1150, -1420) ${triC} <= ${B.centre}; at the south gate ${triG} <= ${B.centre}; the worst case (every tree at LOD0) ${T.trianglesWorst}; draws ${drawsHero} at the HERO, ${drawsC} in the garden (<= ${DV.BUDGET.drawsMax})`, triHero <= B.hero && triC <= B.centre && triG <= B.centre && drawsC <= DV.BUDGET.drawsMax && drawsHero <= DV.BUDGET.drawsMax && T.colliders <= DV.BUDGET.colliders, '');
  ok('the triangles of the LOD buckets are counted into the module\'s own total (svc.triangles) and the service publishes the instances and the colliders', svc.triangles > 600000 && T.instances === list.length && T.colliders > 900, `${svc.triangles}`);
}

// =============================================================== 5. the ground follows the planting
console.log('5. the ground mask: the litter lies under the planted crowns (ground-material.js canopy from vegetation.js plan.canopy), not under the OSM woods');
{ const mb = svc.ground.maskBox, md = svc.ground.maskData, st = svc.ground.mask, W = mb.W, res = mb.res, LIT = Math.round(GM.LOOK.litA * 255), CAN = 128;
  const can = T.canopy, grid = new Map(), gk = (i, j) => i * 100003 + j;
  for (const c of can) { const k = gk(Math.floor(c.x / 16), Math.floor(c.z / 16)); let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(c); }
  const under = (x, z, m) => { const ci = Math.floor(x / 16), cj = Math.floor(z / 16); for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) { const l = grid.get(gk(i, j)); if (l) for (const c of l) if (Math.hypot(c.x - x, c.z - z) <= c.r + m) return true; } return false; };
  let litter = 0, litterUnder = 0, canopyCells = 0, canopyFar = 0, interior = 0, interiorLit = 0;
  for (let j = 0; j < mb.H; j++) for (let i = 0; i < W; i++) {
    const o = (j * W + i) * 4, R = md[o], x = mb.x0 + (i + 0.5) * res, z = mb.z0 + (j + 0.5) * res;
    if (R >= LIT) { litter++; if (under(x, z, 0)) litterUnder++; }
    if (R >= CAN) { canopyCells++; if (!under(x, z, 3.5)) canopyFar++; }
  }
  for (const c of can) { if (c.r < 4.2) continue; for (let j = Math.floor((c.z - c.r - mb.z0) / res); j <= (c.z + c.r - mb.z0) / res; j++) for (let i = Math.floor((c.x - c.r - mb.x0) / res); i <= (c.x + c.r - mb.x0) / res; i++) { if (i < 0 || j < 0 || i >= W || j >= mb.H) continue; const x = mb.x0 + (i + 0.5) * res, z = mb.z0 + (j + 0.5) * res; if (Math.hypot(x - c.x, z - c.z) > c.r - 3.2 || shore.dist(x, z) < 0.6 || !shore.inGarden(x, z)) continue; interior++; if (md[(j * W + i) * 4] >= LIT) interiorLit++; } }
  ok(`the litter cells of the mask (R >= ${GM.LOOK.litA}) lie under a planted crown: ${litterUnder} of ${litter} (>= 98 %); the canopy cells (R >= 0.5) within 3.5 m of a crown: ${canopyCells - canopyFar} of ${canopyCells} (all); the interior of the big crowns (3.2 m inside the edge, ${interior} cells) is litter: ${interiorLit} (>= 90 %)`, litter > 10000 && litterUnder >= 0.98 * litter && canopyFar === 0 && interior > 2000 && interiorLit >= 0.9 * interior, `${(litterUnder / litter * 100).toFixed(1)} % / ${canopyFar} far / ${(interiorLit / interior * 100).toFixed(1)} %`);
  ok(`the mask stats say so: canopyTrees ${st.canopyTrees} = the trees of the plan (${trees.length}, the shrubs stamp no litter), the fallback belt stamped 0 cells, litter ${st.litterCells} cells (the byte raster counts ${litter}: the float threshold rounds) = ${(st.litterCells / st.insideCells * 100).toFixed(1)} % of the garden (the OSM woods were 44.7 %)`, st.canopyTrees === trees.length && st.beltCells === 0 && Math.abs(st.litterCells - litter) < 0.02 * litter && st.litterCells / st.insideCells < 0.35 && st.litterCells / st.insideCells > 0.08, '');
  // the mutant: the mask planned WITHOUT the planting (the T3 way: the OSM woods + the belt) has litter far from any crown
  const GI = GM.collectGroundInputs({ GARDEN: Fo.GARDEN, GARDEN_GREEN: Fo.GARDEN_GREEN, FOOTPRINTS: Fo.FOOTPRINTS, WATER_UNION: Wd.WATER_UNION, PATHS: Pd.PATHS, BENCHES: Fu.BENCHES, GATES: Fu.GATES, MONUMENTS: Fu.MONUMENTS, FOUNTAINS: Fu.FOUNTAINS }, FAC.GREEN, GH.gardenHeight);
  const old = GM.planGroundMask(GI); let oLit = 0, oUnder = 0; for (let j = 0; j < old.box.H; j++) for (let i = 0; i < old.box.W; i++) { const R = old.data[(j * old.box.W + i) * 4]; if (R < LIT) continue; oLit++; if (under(old.box.x0 + (i + 0.5) * res, old.box.z0 + (j + 0.5) * res, 0)) oUnder++; }
  ok(`mutant: the mask planned without the planting (the woods and the belt of T3) has only ${(oUnder / oLit * 100).toFixed(0)} % of its ${oLit} litter cells under a crown (the check can fail)`, oLit > 50000 && oUnder < 0.8 * oLit, '');
  const same = GM.planGroundMask({ ...GI, canopy: T.canopy }); let diff = 0; for (let k = 0; k < md.length; k++) if (md[k] !== same.data[k]) diff++;
  ok('the built mask is the mask planned from the same inputs and the plan\'s canopy (deterministic, bit for bit)', diff === 0 && same.stats.canopyTrees === st.canopyTrees, `${diff} bytes differ`);
}

// =============================================================== 6. the couplings: the hook, the clearings, the LOD distances, the engine edit
console.log('6. the couplings: HOOKS.treeReject answers \'garden\', the clearings equal the camera poses, LOD_D equals the environment\'s, the treegeo edit is a default parameter');
{ const f = AT.HOOKS.treeReject && AT.HOOKS.treeReject(ctx);
  ok("HOOKS.treeReject(ctx) answers 'garden' inside the garden outline and null outside (the environment plants no mapped tree in the garden); the Paradny podium still answers 'paradny'", typeof f === 'function' && f(1200, -1500) === 'garden' && f(1100, -1700) === null && f(900, -1000) === 'paradny' && f(461, -1350) === null, f ? `${f(1200, -1500)} / ${f(1100, -1700)} / ${f(900, -1000)}` : 'no factory');
  const views = L.VIEWS.filter((v) => v.key === 'Digit5' || v.key === 'Digit6'), cams = CAMS.CAMS.filter((c) => !c.flight);
  const want = [...cams.map((c) => ({ id: c.id, x: c.x, z: c.z, yaw: c.yaw })), ...views.map((v) => ({ id: v.key, x: v.x, z: v.z, yaw: v.yaw }))];
  const have = DV.CLEARINGS.map((c) => ({ id: c.id, x: c.x, z: c.z, yaw: c.yaw }));
  ok('data/vegetation.js CLEARINGS are the 11 ground poses of tools/tauride-cams.mjs and the two garden VIEWS poses of the North (x, z, yaw), and nothing else (a moved pose that is not copied turns this red)', JSON.stringify(want) === JSON.stringify(have) && DV.CLEARINGS.every((c) => c.len >= 20 && c.hw >= 3), JSON.stringify(have.map((c) => c.id)));
  const treesSrc = fs.readFileSync(path.join(ROOT, 'src/world/environment/trees.js'), 'utf8'), m = /const LOD_D = \[(\d+), (\d+), (\d+)\];/.exec(treesSrc);
  ok(`data/vegetation.js LOD_D ${DV.LOD_D.join(' / ')} equals the engine's LOD_D of environment/trees.js (${m && m.slice(1).join(' / ')})`, !!m && m.slice(1).map(Number).join() === DV.LOD_D.join(), '');
  const geo = fs.readFileSync(path.join(ROOT, 'src/world/environment/treegeo.js'), 'utf8');
  ok('the engine edit of T5 is a default parameter: canopyGeometry(fam, lod, F = SPECIES[fam]) and trunkGeometry(fam, lod, F = SPECIES[fam]) (the strip\'s calls are unchanged)', /export function canopyGeometry\(fam, lod, F = SPECIES\[fam\]\)/.test(geo) && /export function trunkGeometry\(fam, lod, F = SPECIES\[fam\]\)/.test(geo) && !/larch/i.test(geo.split('export const SPECIES')[1].split('export const FAMILIES')[0]), '');
  ok("the engine edit of fix round 1 (the tiers keys y0 / under / stem) defaults to the engine's own constants (0.9 open / 0.55, the underside of closed tiers, the stub 1.0 m at LOD2, the stem [2.2, 0.16, 0.07]): a row without the keys is drawn as before", /const y0 = F\.y0 \?\? \(open \? 0\.9 : 0\.55\), span = H - y0, under = F\.under \?\? !open;/.test(geo) && /if \(lod <= 1 && under\)/.test(geo) && /addStub\(acc, 0, F\.y0 \?\? 1\.0, 0\.14\)/.test(geo) && /const st = F\.stem \|\| \[2\.2, 0\.16, 0\.07\];/.test(geo) && Object.values(TG.SPECIES).every((F) => !('y0' in F) && !('under' in F) && !('stem' in F)), '');
  const sha = (g) => { const H = createHash('sha256'); for (const k of Object.keys(g.attributes).sort()) { H.update(k); H.update(Buffer.from(g.attributes[k].array.buffer)); } if (g.index) H.update(Buffer.from(g.index.array.buffer)); return H.digest('hex').slice(0, 16); };
  const spruce = { c0: sha(TG.canopyGeometry('spruceA', 0)), c1: sha(TG.canopyGeometry('spruceA', 1)), c2: sha(TG.canopyGeometry('spruceA', 2)), t0: sha(TG.trunkGeometry('spruceA', 0)), b0: sha(TG.canopyGeometry('spruceB', 0)) };
  ok("the engine's spruces (the strip's tiers family) are bit-identical to their geometry before the fix-round-1 edit (sha256 of the LOD0 / 1 / 2 canopies and the LOD0 trunk of spruceA, the LOD0 canopy of spruceB, taken at 1b5eb1e)", spruce.c0 === '38655c66e3c50606' && spruce.c1 === 'a928c57db000b7a9' && spruce.c2 === '95e1a26221b08129' && spruce.t0 === '7688d5c6997357fc' && spruce.b0 === '381ea0b05b02d7f3', JSON.stringify(spruce));
  const stripArea = await imp('src/world/area.js');
  ok('the hook is the North\'s: the strip\'s area module exports HOOKS without treeReject (nothing changes there)', !stripArea.HOOKS || !stripArea.HOOKS.treeReject || process.env.AREA === 'north', '');
  // the palace parterre (fix round 1, the QA-gate blocker "the T11 pose shows the palace front"): the lake's north shore IS the garden outline and the palace side is the OSM wood w1274934137, which the engine planted at wood density up to
  // the facade (6 crowns on the T11 sight line; the frame with the garden's trees hidden was identical). HOOKS.treeCleared clears PALACE_PARTERRE (the lawn in front of the palace's central bow) when landmarksTauride is built.
  { const PB = KO.PALACE_PARTERRE, c11 = CAMS.CAMS.find((c) => c.id === 'T11'), tc = KO.treeCleared({ buildList: ['landmarksTauride'] }), inPB = (x, z) => x > PB[0] && x < PB[1] && z > PB[2] && z < PB[3];
    ok(`HOOKS.treeCleared with landmarksTauride built answers true in PALACE_PARTERRE [${PB.join(', ')}] and false outside it, null when neither landmarksTauride nor landmarksSmolny is built`, typeof tc === 'function' && tc(1380, -1630) === true && tc(1400, -1612) === true && tc(1420, -1630) === false && tc(1340, -1630) === false && tc(1380, -1600) === false && KO.treeCleared({ buildList: ['environment', 'landmarksKirochnaya'] }) === null, '');
    const pal = FAC.BUILDINGS.find((b) => b.id === 'r3801092'), bow = []; for (const p of pal.polys) for (let i = 0; i < p.o.length; i += 2) if (p.o[i + 1] > -1660 && p.o[i] >= PB[0] && p.o[i] <= PB[1]) bow.push([p.o[i], p.o[i + 1]]);
    const bx0 = Math.min(...bow.map((q) => q[0])), bx1 = Math.max(...bow.map((q) => q[0])), bz = Math.max(...bow.map((q) => q[1]));
    const dx0 = c11.target.x - c11.x, dz0 = c11.target.z - c11.z, L11 = Math.hypot(dx0, dz0), dx = dx0 / L11, dz = dz0 / L11;
    let u0 = null; for (let u = 0; u < L11; u += 0.25) if (!HP.inGarden(c11.x + dx * u, c11.z + dz * u)) { u0 = u; break; }
    let lineOut = 0; for (let u = u0; u <= L11; u += 0.25) if (!inPB(c11.x + dx * u, c11.z + dz * u)) lineOut++;
    ok(`the parterre box holds the palace's garden-front bow (${bow.length} footprint vertices of r3801092 at z > -1660, x ${bx0.toFixed(1)} .. ${bx1.toFixed(1)}, the facade at z ${bz.toFixed(1)}) with 4 .. 10 m to spare on each side, and the T11 sight line from where it leaves the garden (${u0 && u0.toFixed(1)} m) to the target (${L11.toFixed(1)} m) lies inside the box`, bow.length >= 8 && bx0 - PB[0] >= 3 && bx0 - PB[0] <= 10 && PB[1] - bx1 >= 3 && PB[1] - bx1 <= 10 && bz > -1645 && bz < -1640 && u0 !== null && u0 > 60 && lineOut === 0, `${lineOut} samples outside`);
    const screens = (trees) => trees.filter((t) => !t.shrub && t.h > 4).map((t) => { const px = t.x - c11.x, pz = t.z - c11.z, u = px * dx + pz * dz, v = Math.abs(px * dz - pz * dx); return { t, u, v }; }).filter((h) => h.u > 30 && h.u < L11 + 2 && h.v < h.t.r + 0.5);
    if (!noEnv) {
      const s0 = screens(env.trees), side = env.trees.filter((t) => t.x > 1280 && t.x < 1470 && t.z > -1700 && t.z < -1600 && !inPB(t.x, t.z)).length, inside = env.trees.filter((t) => inPB(t.x, t.z)).length;
      ok(`no crown of the environment's trees stands on the T11 sight line (within r + 0.5 m of the line between 30 m and the facade): ${s0.length}; the environment plants nothing in the parterre (${inside}), the wood keeps its trees on both sides of it (${side} in x 1280 .. 1470, z -1700 .. -1600 outside the box), the counter 'wood:cleared' ${env.treeStats.rej['wood:cleared']} >= 8`, s0.length === 0 && inside === 0 && side > 60 && env.treeStats.rej['wood:cleared'] >= 8, s0.map((h) => `${h.t.sp} (${h.t.x.toFixed(1)}, ${h.t.z.toFixed(1)}) r ${h.t.r.toFixed(1)} off ${h.v.toFixed(1)} at ${h.u.toFixed(0)} m`).join('; '));
      // the mutant: the environment built again with the clearing hook switched off (the table of area-tables.js is a plain object; restored right after)
      const saved = AT.HOOKS.treeCleared; AT.HOOKS.treeCleared = null; let m = null;
      try { const c2 = SE.makeContext(eng, ['environment']); await SE.buildModules(eng, c2.ctx, ['environment']); m = c2.ctx.services.environment; } finally { AT.HOOKS.treeCleared = saved; }
      const s1 = m ? screens(m.trees) : [];
      ok(`mutant: the environment built without HOOKS.treeCleared stands ${s1.length} crowns on the T11 sight line and ${m ? m.trees.filter((t) => inPB(t.x, t.z)).length : '?'} trees in the parterre (the check can fail)`, !!m && s1.length >= 3 && m.trees.filter((t) => inPB(t.x, t.z)).length > 10, s1.map((h) => `${h.t.sp} off ${h.v.toFixed(1)} at ${h.u.toFixed(0)} m`).join('; '));
    }
  }
  const tl = T.treeList[0];
  ok('treeList rows have the shape of environment.trees ({ x, z, r, h, tr, sp, shrub? } + y): what wildlife/world.js reads from a landmark garden\'s treeList', tl && ['x', 'z', 'y', 'r', 'h', 'tr', 'sp'].every((k) => Number.isFinite(tl[k]) || k === 'sp') && typeof tl.sp === 'string', JSON.stringify(tl));
}

console.log(`\n${total} checks, ${failed} failed`);
console.log(failed ? `RESULT: FAIL (${failed} of ${total} checks)` : `RESULT: OK (${total} checks)`);
process.exit(failed ? 1 : 0);
