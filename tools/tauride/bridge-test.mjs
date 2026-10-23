// bridge-test.mjs - T4b of the Tauride remake: the bridges, the dam, the deck service, the reeds (and the pond lanes of the ducks). node tools/area.mjs north tools/tauride/bridge-test.mjs [--no-env] [--ducks]
// Every check runs on the REAL modules (the built landmarksTauride, with --ducks also environment + streets + wildlife) or on the real factories (bridges.js planBridges, ponds.js planPonds, reeds.js planReeds) fed with the real data; the
// design values come from src/world/landmarksTauride/data/bridge-design.js and the datum table data/ponds.js, and the mutants (a copy of the design with ONE number changed, a service that forgets the bridges, a ring without the deck cuts,
// a rail that a hop clears) must turn a check red. The walk along the south gate -> memorial route and the wading ring with the deck starts are in tools/tauride-height-test.mjs (section BRIDGES).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const args = new Set(process.argv.slice(2));
let failed = 0, total = 0;
const ok = (name, cond, detail = '') => { total++; if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`); };

const SE = await imp('tools/tauride/lib/stub-env.mjs');
const eng = await imp('tools/tauride/lib/stub-env.mjs').then((m) => m.loadEngine(ROOT));
const GH = await imp('src/world/landmarksTauride/height.js');
const BR = await imp('src/world/landmarksTauride/bridges.js');
const PM = await imp('src/world/landmarksTauride/ponds.js');
const RD = await imp('src/world/landmarksTauride/reeds.js');
const PD = await imp('src/world/landmarksTauride/paths-draped.js');
const TM = await imp('src/world/landmarksTauride/terrain-mesh.js');
const D = await imp('src/world/landmarksTauride/data/bridge-design.js');
const Bd = await imp('src/world/landmarksTauride/data/bridges.js');
const Pd = await imp('src/world/landmarksTauride/data/paths.js');
const Fo = await imp('src/world/landmarksTauride/data/footprints.js');
const Hk = await imp('src/areas/north/hooks/paradny.js');
const HW = await imp('src/areas/north/hooks/water.js');
const AT = await imp('src/world/lib/area-tables.js');
const P = GH.PONDS, shore = GH.GARDEN_SHORE, L = eng.L, STEP = eng.STEP_HEIGHT;
// the ground of the bridge heads is the FLOOR MESH (the alleys are draped on it; landmarksTauride.js plans the bridges with meshHeight ?? gardenHeight), the street (0) outside the garden
const tplan = TM.planTerrain(GH.gardenHeight, GH.RELIEF_BOX, TM.floorOptions()), mesh = TM.makeMeshHeight(tplan), gh = (x, z) => mesh(x, z) ?? GH.gardenHeight(x, z);
const G = (x, z) => gh(x, z) ?? 0;
const segDist = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0; return Math.hypot(x - ax - t * dx, z - az - t * dz); };
const polyDist = (x, z, pts) => { let m = Infinity; for (let i = 0; i + 3 < pts.length; i += 2) m = Math.min(m, segDist(x, z, pts[i], pts[i + 1], pts[i + 2], pts[i + 3])); return m; };
const ringDist = (x, z, r) => { let m = Infinity; for (let i = 0; i < r.length; i += 2) m = Math.min(m, segDist(x, z, r[i], r[i + 1], r[(i + 2) % r.length], r[(i + 3) % r.length])); return m; };
/** the deck rectangle test of a plan: (x, z) inside a deck axis segment grown by hw (+ extra) */
const inDecks = (plan, x, z, extra = 0) => plan.decks.some((d) => segDist(x, z, d.ax, d.az, d.bx, d.bz) <= d.hw + extra);

// =============================================================== 1. the plan: determinism, the axis, the profile, the heads
console.log('1. the plan (bridges.js planBridges): deterministic, the ends on dry land, the profile continuous and walkable, the heads meet the alley and the bank');
const plan = BR.planBridges({ gh }), plan2 = BR.planBridges({ gh });
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
ok('planBridges is deterministic: two plans give the same tables, colliders and geometry bit for bit', plan.sites.every((s, i) => same(s.table, plan2.sites[i].table)) && JSON.stringify(plan.colliders) === JSON.stringify(plan2.colliders) && same(plan.geometry.pos, plan2.geometry.pos) && same(plan.geometry.idx, plan2.geometry.idx), `${plan.sites.length} sites, ${plan.colliders.length} colliders, ${plan.geometry.triangles} triangles`);
ok('six sites, one per crossing site of data/bridges.js, the eight bridge ways among them', plan.sites.length === Bd.BRIDGE_SITES.length && new Set(plan.sites.flatMap((s) => s.ways)).size === 8, plan.sites.map((s) => s.site + ':' + s.type).join(' '));
{ const C = P.COLLIDER, prof = GH.pondProfile(P); let notDry = 0, rows = [];
  for (const s of plan.sites) for (const e of [s.ends.a, s.ends.b]) { const need = PM.landOffsetAt(C.contourY, prof.slopeAt(e.x, e.z), P) + D.EXTEND.margin, d = shore.dist(e.x, e.z); if (!(d >= need - 1e-9) && !e.stair) notDry++; if (e.stair && !(d > need)) notDry++; rows.push(`${s.site}:${d.toFixed(2)}/${need.toFixed(2)}${e.stair ? 's' : ''}`); }
  ok(`every axis end stands on dry land past the shore colliders (shore distance >= the -0.3 contour offset + EXTEND.margin ${D.EXTEND.margin} m), or at the foot of the data's stair`, notDry === 0, rows.join(' ')); }
{ let worst = 0, steps = 0, maxSlope = 0, wetLow = 0, where = '';
  for (const s of plan.sites) {
    let prev = null;
    for (let u = 0; u <= s.L + 1e-9; u += 0.05) { const q = s.at(u), y = plan.deckY(q.x, q.z); if (y === null) { worst = Infinity; where = s.site + '@' + u.toFixed(2); break; }
      const e = Math.abs(y - s.h(u)); if (e > worst) { worst = e; where = s.site + '@' + u.toFixed(2); }
      if (prev !== null) { const dy = Math.abs(y - prev), um = u - 0.025; const inStair = (s.ends.a.stair && um <= s.uA) || (s.ends.b.stair && um >= s.L - s.uB); if (dy > STEP) steps++; if (!inStair) maxSlope = Math.max(maxSlope, dy / 0.05); }
      if (shore.dist(q.x, q.z) < 0 && y < P.WATER_Y + 0.3) wetLow++;
      prev = y; } }
  ok('deckY along every axis equals the profile table to 1e-9 and is continuous (no step over STEP_HEIGHT, sampled every 5 cm)', worst < 1e-9 && steps === 0, `worst ${worst.toExponential(1)} at ${where}, ${steps} steps`);
  let offA = 0, worstA = 0; for (const s of plan.sites) for (let u = 0; u <= s.L + 1e-9; u += 0.05) { const e = Math.abs(s.h(u) - s.hAnalytic(u)); worstA = Math.max(worstA, e); if (e > 0.003) offA++; }
  ok('the table is the analytic profile (the ramps, the hump, the arch, the flat) within 3 mm (the knots are at most 0.25 m apart and the kinks lie on knots)', offA === 0, `worst ${(worstA * 1000).toFixed(2)} mm`);
  ok(`the walking slope of every deck, ramp and approach (outside the stairs) is at most ${D.MAX_RAMP_SLOPE} per metre (1:4 of the plan is 0.25)`, maxSlope <= D.MAX_RAMP_SLOPE + 1e-6 && maxSlope <= 0.25, `steepest ${maxSlope.toFixed(3)}`);
  ok('over the water every deck stands at least 0.3 m above the water level', wetLow === 0, `${wetLow} samples lower`); }
{ let bad = 0, rows = [];
  for (const s of plan.sites) for (const [e, u] of [[s.ends.a, 0], [s.ends.b, s.L]]) { const want = G(e.x, e.z) + D.HEAD_LIFT, got = s.h(u); if (Math.abs(got - want) > 1e-9) bad++; rows.push(`${s.site}:${(got - want).toExponential(1)}`); }
  ok(`at every axis end the deck is the ground + HEAD_LIFT ${D.HEAD_LIFT} (the ribbon surface of the alley: no step and no gap between the alley and the approach)`, bad === 0, rows.join(' ')); }
{ const wood = plan.sites.filter((s) => s.type === 'wood-humped'), DS = BR.designOf(Bd.BRIDGE_SITES.find((s) => s.type === 'wood-humped')); let bad = 0, rows = [];
  for (const s of wood) for (const [e, uHead] of [[s.ends.a, s.uA], [s.ends.b, s.L - s.uB]]) { if (!e.stair) { bad++; continue; } const rise = s.h(uHead) - (G(e.x, e.z) + D.HEAD_LIFT); if (Math.abs(rise - DS.headRise) > 1e-9) bad++; rows.push(`${s.site}/${e.stair.id}: rise ${rise.toFixed(3)} over ${e.ext.toFixed(2)} m, ${e.stair.n} steps`); }
  ok(`the wooden bridge's heads stand headRise ${DS.headRise} m above the ground at the feet of the data's stairs (w415779498, w420650661: the T3 rule "4 steps = 0.6 m")`, wood.length === 1 && bad === 0, rows.join(' ')); }
{ const pp = PD.planPaths(Pd.PATHS, { meshHeight: mesh, gh: GH.gardenHeight, deckAt: plan.deckY }), heads = pp.stairs.filter((s) => s.bridgeHead);
  const bad = heads.filter((s) => Math.abs(s.hHigh - plan.deckY(s.to[0], s.to[1])) > 1e-9 || !(s.riser <= STEP) || s.riser < 0.1);
  ok('the two stairs at the wooden bridge rise from the ground at their foot to the deck head exactly (paths-draped.js ground.deckAt), in risers of 0.1 .. 0.45 m', heads.length === 2 && bad.length === 0, heads.map((s) => `${s.id}: ${s.n} x ${s.riser.toFixed(3)} (${s.hLow.toFixed(2)} -> ${s.hHigh.toFixed(2)})`).join(', '));
  const alt = BR.planBridges({ gh, design: { ...D, TYPES: { ...D.TYPES, 'wood-humped': { ...D.TYPES['wood-humped'], headRise: 0.4 } } } }), altStairs = PD.planPaths(Pd.PATHS, { meshHeight: mesh, gh: GH.gardenHeight, deckAt: alt.deckY }).stairs.filter((s) => s.bridgeHead);
  ok('mutant: a wooden head 0.4 m high (design headRise 0.6 -> 0.4) moves the stair tops with it, away from the shipped deck (the stair follows the deck it is given: the check above can fail)', altStairs.length === 2 && altStairs.every((s) => Math.abs(s.hHigh - alt.deckY(s.to[0], s.to[1])) < 1e-9 && Math.abs(s.hHigh - plan.deckY(s.to[0], s.to[1])) > 0.15), altStairs.map((s) => (s.hHigh - plan.deckY(s.to[0], s.to[1])).toFixed(3)).join(' '));
  ok('the ribbons: no folded triangle (clockwise seen from above) is left, the rows are five wide only where the terrain curves across the ribbon, the budget of T3 holds again (<= 12,000 ribbon + stair triangles)', pp.stats.foldedDropped >= 0 && pp.stats.wideRows < pp.stats.rows / 2 && pp.stats.ribbonTriangles + pp.stats.stairTriangles <= PD.PATHS_DRAPED.trianglesMax, `${pp.stats.ribbonTriangles} + ${pp.stats.stairTriangles} triangles, ${pp.stats.wideRows} of ${pp.stats.rows} rows wide, ${pp.stats.foldedDropped} folded triangles dropped`); }
{ const faces = plan.sites.filter((s) => s.type !== 'wood-humped').map((s) => { const a = s.at(s.uFaceA), b = s.at(s.uFaceB); return [s.site, shore.dist(a.x, a.z), shore.dist(b.x, b.z)]; });
  ok('the abutment faces of the iron, metal and dam sites stand at the shore (shore distance 0 .. 0.5 m: in the bank profile, not floating on the lawn, not sunk in the water)', faces.every((f) => f[1] >= -0.1 && f[1] <= 0.5 && f[2] >= -0.1 && f[2] <= 0.5), faces.map((f) => `${f[0]}:${f[1].toFixed(2)}/${f[2].toFixed(2)}`).join(' ')); }

// =============================================================== 2. deckY as a function: bbox-first, pure, the sides, the cost
console.log('2. deckY: bbox-first, pure, answers on the decks only');
{ const far = [[0, 0], [900, -1000], [1200, -1500], [NaN, 0], [0, NaN], [Infinity, 0], [1e9, -1e9]]; let threw = false, nonNull = 0; for (const [x, z] of far) { try { if (plan.deckY(x, z) !== null) nonNull++; } catch (e) { threw = true; } }
  ok('deckY answers null (and does not throw) far away, on the lawn, for NaN and Infinity; its box is the hull of the six sites', !threw && nonNull === 0 && plan.deckY.box.every(Number.isFinite), JSON.stringify(plan.deckY.box.map((v) => +v.toFixed(1)))); }
{ let onEdge = 0, off = 0, bad = 0;
  for (const s of plan.sites) for (let u = 0.5; u < s.L; u += 1) { const q = s.at(u), p = [-q.dz, q.dx], r = s.hw + s.pad; for (const sg of [-1, 1]) { if (plan.deckY(q.x + p[0] * sg * (r - 0.05), q.z + p[1] * sg * (r - 0.05)) === null) bad++; else onEdge++; if (plan.deckY(q.x + p[0] * sg * (r + 0.3), q.z + p[1] * sg * (r + 0.3)) !== null) bad++; else off++; } }
  ok(`deckY answers up to half width + pad (${(plan.sites[0].hw + plan.sites[0].pad).toFixed(2)} m from the axis: the rails) and null 0.3 m beyond`, bad === 0, `${onEdge} edge points, ${off} off`); }
{ let n = 0, det = 0; for (let i = 0; i < 20000; i++) { const x = 1090 + ((i * 7919) % 4200) / 10, z = -1720 + ((i * 104729) % 4600) / 10, a = plan.deckY(x, z), b = plan2.deckY(x, z), c = plan.deckY(x, z); n++; if (a !== b || a !== c) det++; }
  ok('deckY is pure: the same bits on a second call and from a second plan (20,000 points of the garden)', det === 0, `${det} differ`);
  const src = plan.deckY.toString(); ok('the body of deckY allocates nothing (no new, closure, array / object literal, spread, iterator method): text check', !/\bnew\b|=>|\.\.\.|\.map\(|\.forEach\(|\.filter\(|\.reduce\(|\{\s*[A-Za-z]+\s*:/.test(src.replace(/^function deckY\(x, z\)/, '')), `${src.length} chars`);
  const t0 = performance.now(); let s = 0; for (let x = 915; x <= 1500; x += 2) for (let z = -1800; z <= -1250; z += 2) { const v = plan.deckY(x, z); if (v !== null) s += v; } const ms = performance.now() - t0;
  ok('deckY over the 80,868-point lattice of the garden box costs less than 40 ms (cold; the bbox rejects almost every point)', ms < 40, `${ms.toFixed(1)} ms, sum ${s.toFixed(2)}`); }

// =============================================================== 3. the colliders of the plan: ramps that are the profile, rails that a hop cannot clear
console.log('3. the colliders: walk ramps along the whole axis, rail boxes along both edges');
{ let gaps = 0, off = 0, mism = 0;
  for (const s of plan.sites) { const ramps = plan.colliders.filter((c) => c.kind === 'ramp' && c.site === s.site).sort((a, b) => a.u0 - b.u0); if (Math.abs(ramps[0].u0) > 1e-9 || Math.abs(ramps[ramps.length - 1].u1 - s.L) > 1e-9) gaps++; for (let i = 1; i < ramps.length; i++) if (Math.abs(ramps[i].u0 - ramps[i - 1].u1) > 1e-9) gaps++;
    for (const r of ramps) { if (Math.abs(r.yA - s.h(r.u0)) > 1e-9 || Math.abs(r.yB - s.h(r.u1)) > 1e-9) mism++; for (let k = 0; k <= 4; k++) { const u = r.u0 + (r.u1 - r.u0) * k / 4, lin = r.yA + (r.yB - r.yA) * k / 4; if (Math.abs(lin - s.h(u)) > 0.006) off++; } } }
  ok('the walk ramps tile every axis without a gap, their ends are the profile and the linear ramp stays within 6 mm of deckY between them', gaps === 0 && mism === 0 && off === 0, `${plan.stats.ramps} ramps, ${gaps} gaps, ${mism} end mismatches, ${off} samples off`); }
{ const R = D.RAIL; let bad = 0, low = 0, rows = [];
  for (const s of plan.sites) { const rails = plan.colliders.filter((c) => c.kind === 'rail' && c.site === s.site); if (rails.length !== 2 * (s.axis.length - 1)) bad++;
    for (const r of rails) { let hi = -Infinity, lo = Infinity; for (let u = r.u0; u <= r.u1 + 1e-9; u += 0.1) { hi = Math.max(hi, s.h(u)); lo = Math.min(lo, s.h(u)); }
      if (!(r.y1 - hi >= 0.73 + STEP + 1e-9)) low++; if (!(r.y0 <= lo - 0.5)) bad++; if (Math.abs(r.w - R.colliderThick) > 1e-9) bad++; }
    rows.push(`${s.site}:${rails.length}`); }
  ok(`two rail boxes per axis segment, ${R.colliderThick} m thick, their top more than a hop (0.73) + STEP_HEIGHT (${STEP}) above the deck under them, their bottom below it`, bad === 0 && low === 0, rows.join(' ') + `, ${low} too low`); }
{ const R = D.RAIL; let bad = 0; for (const s of plan.sites) for (const r of plan.colliders.filter((c) => c.kind === 'rail' && c.site === s.site)) { let best = Infinity; for (let u = 0; u <= s.L; u += 0.1) { const q = s.at(u); best = Math.min(best, Math.hypot(q.x - r.cx, q.z - r.cz)); } if (Math.abs(best - (s.hw + R.colliderIn + R.colliderThick / 2)) > 0.05) bad++; }
  ok('the rail boxes stand on the deck edge (their inner face at the half width): the deck between them is the whole walkway', bad === 0, `${bad} rails off the edge`); }

// =============================================================== 4. the shore ring with the decks: cut exactly under the decks
console.log('4. the shore colliders of ponds.js with the deck cuts');
{ const plain = PM.planPonds(), withDecks = PM.planPonds({ decks: plan.decks }); let inside = 0, kept = 0; const where = [];
  // (the kept chord pieces: the box centre is the chord midpoint moved COLLIDER.thick / 2 inland; its chord samples at t = -1 .. 1 along the box axis)
  for (const c of withDecks.colliders) { const ux = Math.sin(c.rot), uz = Math.cos(c.rot), hl = c.len / 2; for (const t of [-0.98, -0.5, 0, 0.5, 0.98]) { const x = c.cx + ux * t * hl, z = c.cz + uz * t * hl; if (inDecks(plan, x, z, -0.25)) { inside++; if (where.length < 4) where.push([+x.toFixed(1), +z.toFixed(1)]); } } kept++; }
  ok(`the ring is cut where a deck crosses it: ${withDecks.stats.chordsCut} chords cut (${withDecks.stats.cutLengthM.toFixed(1)} m), no kept chord sample inside a deck rectangle (the box stands COLLIDER.thick inland of the chord); the ring without decks is the T4a ring`, withDecks.stats.chordsCut >= 6 && withDecks.stats.chordsCut <= 24 && inside === 0 && plain.stats.chordsCut === 0 && plain.colliders.length === 195, `${plain.colliders.length} -> ${withDecks.colliders.length} colliders, ${inside} samples inside ${JSON.stringify(where)}`);
  let crossings = 0; for (const s of plan.sites) { const q0 = s.at(s.uWetA - 1.5), q1 = s.at(s.uWetB + 1.5); for (const q of [q0, q1]) { const hit = withDecks.colliders.some((c) => { const ux = Math.sin(c.rot), uz = Math.cos(c.rot), px = -uz, pz = ux, dx = q.x - c.cx, dz = q.z - c.cz; return Math.abs(dx * ux + dz * uz) <= c.d / 2 && Math.abs(dx * px + dz * pz) <= c.w / 2 + 0.2; }); if (hit) crossings++; } }
  ok('no shore collider stands on a deck axis where it crosses the shore (the deck is open to the water between its rails)', crossings === 0, `${crossings} of ${2 * plan.sites.length} crossings blocked`); }

// =============================================================== 5. the real Player on the plan's colliders: walks the deck, cannot leave it sideways, cannot get into the water at a head
console.log('5. the real Player (core/player.js + physics.js) on the plan colliders + the cut shore ring');
function world(design = D, decksOf = plan) {
  const bp = design === D ? decksOf : BR.planBridges({ design, gh }), ph = new eng.Physics((x, z) => L.heightAt(x, z));
  for (const c of bp.colliders) { if (c.kind === 'ramp') ph.addWalkRamp(c.cx, c.cz, c.w, c.d, c.rot, c.yA, c.yB, c.thick); else ph.addBox(c.cx, c.cz, c.w, c.d, c.rot, c.y0, c.y1); }
  for (const c of PM.planPonds({ decks: bp.decks }).colliders) ph.addBox(c.cx, c.cz, c.w, c.d, c.rot, c.y0, c.y1);
  const { camera } = SE.makeContext(eng, []);
  return { bp, ph, player: () => SE.makePlayer(eng, camera, ph, { x0: 900, x1: 1520, z0: -1800, z1: -1250 }) };
}
function walkAxis(W, s, reverse = false) {
  const p = W.player(), A = reverse ? s.ends.b : s.ends.a, B = reverse ? s.ends.a : s.ends.b;
  p.setPose(A.x, A.z, 0, 0, null, { stand: true });
  let worst = 0, wet = 0, minD = Infinity;
  const target = (u) => { const q = s.at(reverse ? s.L - u : u); return [q.x, q.z]; };
  for (let u = 1; u <= s.L + 0.5; u += 1) { const [tx, tz] = target(Math.min(u, s.L)); SE.walkToward(p, tx, tz, 240); const y = W.bp.deckY(p.pos.x, p.pos.z); if (y !== null) worst = Math.max(worst, Math.abs(p.pos.y - y)); const d = shore.dist(p.pos.x, p.pos.z); minD = Math.min(minD, d); if (d < 0 && (y === null || p.pos.y < y - 0.1)) wet++; }
  return { arrived: Math.hypot(p.pos.x - B.x, p.pos.z - B.z) < 0.7, worst, wet, end: [+p.pos.x.toFixed(2), +p.pos.z.toFixed(2), +p.pos.y.toFixed(2)] };
}
function pushSideways(W, s, mode = 'walk') {
  let runs = 0, left = 0, wet = 0, minD = Infinity;
  for (let u = 0.5; u < s.L; u += 1.5) for (const sg of [-1, 1]) {
    const q = s.at(u), p = W.player(); p.setPose(q.x, q.z, 0, 0, null, { stand: true }); const px = -q.dz * sg, pz = q.dx * sg;
    for (let t = 0; t < 180; t++) { p.yaw = Math.atan2(-px, -pz); p.keys.add('KeyW'); if (mode === 'sprint') p.keys.add('ShiftLeft'); if (mode === 'jump' && p.onGround) p.vy = 4.2; p.update(1 / 60); }
    p.keys.clear(); runs++;
    const dx = p.pos.x - q.x, dz = p.pos.z - q.z, v = Math.abs(dx * px + dz * pz), d = shore.dist(p.pos.x, p.pos.z); minD = Math.min(minD, d);
    if (v > s.hw + 0.7) left++; if (d < 0 && W.bp.deckY(p.pos.x, p.pos.z) === null) wet++; else if (d < 0 && p.pos.y < P.WATER_Y + 0.2) wet++;
  }
  return { runs, left, wet, minD };
}
const W0 = world();
{ let bad = 0; const rows = [];
  for (const s of plan.sites) for (const rev of [false, true]) { const r = walkAxis(W0, s, rev); if (!r.arrived || r.wet > 0 || r.worst > 0.12) bad++; rows.push(`${s.site}${rev ? '<' : '>'}:${r.arrived ? 'ok' : 'STUCK@' + r.end} feet-deck ${r.worst.toFixed(3)}`); }
  ok('the Player walks every axis end to end in both directions (the alley end, the approach or the stair, the deck, the far approach), feet on deckY within 12 cm, never in the water', bad === 0, rows.join(' ')); }
{ let runs = 0, left = 0, wet = 0, minD = Infinity; const by = {};
  for (const mode of ['walk', 'sprint', 'jump']) for (const s of plan.sites) { const r = pushSideways(W0, s, mode); runs += r.runs; left += r.left; wet += r.wet; minD = Math.min(minD, r.minD); by[mode] = (by[mode] || 0) + r.left + r.wet; }
  ok('pushed sideways from every deck (every 1.5 m, both sides, walk / sprint / jump, 3 s): the Player never leaves the deck and never gets into the water', left === 0 && wet === 0 && runs > 150, `${runs} runs, ${left} left the deck, ${wet} in the water, closest feet to the water ${minD.toFixed(2)} m, ${JSON.stringify(by)}`); }
{ const lowRail = { ...D, RAIL: { ...D.RAIL, colliderAbove: 0.3 } }, Wm = world(lowRail), r = pushSideways(Wm, Wm.bp.sites.find((s) => s.site === 'No.4'), 'jump');
  ok('mutant: a rail collider only 0.3 m above the deck lets a hop over it (the sideways check can fail)', r.left + r.wet > 0, `${r.left} left, ${r.wet} wet of ${r.runs}`); }
{ const ph = new eng.Physics((x, z) => L.heightAt(x, z)); for (const c of plan.colliders) { if (c.kind === 'ramp') ph.addWalkRamp(c.cx, c.cz, c.w, c.d, c.rot, c.yA, c.yB, c.thick); else ph.addBox(c.cx, c.cz, c.w, c.d, c.rot, c.y0, c.y1); } for (const c of PM.planPonds().colliders) ph.addBox(c.cx, c.cz, c.w, c.d, c.rot, c.y0, c.y1);
  const { camera } = SE.makeContext(eng, []), Wu = { bp: plan, ph, player: () => SE.makePlayer(eng, camera, ph, { x0: 900, x1: 1520, z0: -1800, z1: -1250 }) }; let stuck = 0; for (const s of plan.sites) if (!walkAxis(Wu, s).arrived) stuck++;
  ok('mutant: the T4a ring WITHOUT the deck cuts blocks the decks (the walk along the axis can fail)', stuck >= 4, `${stuck} of ${plan.sites.length} sites stuck`); }
{ const noRamps = { ...plan, colliders: plan.colliders.filter((c) => c.kind !== 'ramp') }, Wr = world(D, noRamps); let stuck = 0; for (const s of plan.sites) { const r = walkAxis(Wr, s); if (!r.arrived || r.wet > 0) stuck++; }
  ok('mutant: without the walk ramps the Player has no deck to stand on (the walk can fail)', stuck >= 4, `${stuck} of ${plan.sites.length} sites`); }

// =============================================================== 6. the built module: the service, the meshes, the budgets
console.log('6. the built module: the deck service (Paradny + bridges), deckLift, the meshes, the colliders, the budgets' + (args.has('--no-env') ? ' [environment skipped]' : ''));
const list = args.has('--no-env') ? ['landmarksTauride'] : args.has('--ducks') ? ['environment', 'landmarksTauride', 'streets', 'wildlife'] : ['environment', 'landmarksTauride'];
const { ctx } = SE.makeContext(eng, list); const before = list.slice(0, list.indexOf('landmarksTauride')), after = list.slice(list.indexOf('landmarksTauride') + 1);
await SE.buildModules(eng, ctx, before); const n0 = ctx.physics.count; await SE.buildModules(eng, ctx, ['landmarksTauride']); const nModule = ctx.physics.count - n0; await SE.buildModules(eng, ctx, after);
const svc = ctx.services.landmarksTauride, B = svc.bridges;
ok('the module publishes bridges { deckY, sites, stats, triangles, draws, colliders, decks, zones, keepOut } and reeds { instances, triangles, draws, stats }', !!B && typeof B.deckY === 'function' && Array.isArray(B.sites) && B.sites.length === 6 && !!svc.reeds && svc.reeds.instances > 0, B ? `${B.triangles} triangles, ${B.draws} draws, ${B.colliders} colliders; reeds ${svc.reeds.instances}` : 'no service');
{ let bad = 0, n = 0, onBridge = 0, onPodium = 0;
  for (const s of plan.sites) for (let u = 0; u <= s.L; u += 0.5) { const q = s.at(u); n++; const want = plan.deckY(q.x, q.z); if (svc.deckY(q.x, q.z) !== want || B.deckY(q.x, q.z) !== want || svc.deckLift(q.x, q.z) !== D.WALK_LIFT) bad++; else onBridge++; }
  for (let x = 760; x <= 1050; x += 10) for (let z = -1190; z <= -890; z += 10) { n++; const o = Hk.paradnyDeckY(x, z); if (svc.deckY(x, z) !== o) bad++; if (o !== null) { onPodium++; if (svc.deckLift(x, z) !== null) bad++; } }
  ok('the service deckY answers the Paradny deck on the podium (bit for bit paradnyDeckY, deckLift null) and the bridge profile on all eight bridge ways (deckLift WALK_LIFT), null elsewhere', bad === 0 && onBridge > 150 && onPodium > 500 && svc.deckY(1200, -1500) === null && svc.deckLift(1200, -1500) === null, `${n} points, ${onBridge} on bridges, ${onPodium} on the podium, ${bad} wrong`); }
{ const fake = { deckY: (x, z) => Hk.paradnyDeckY(x, z) }; let miss = 0; for (const s of plan.sites) { const q = s.at(s.L / 2); if (fake.deckY(q.x, q.z) === null) miss++; }
  ok('mutant: a service that forgets the bridges (the T1 service: courts.deckY alone) answers null on every deck (the check above can fail)', miss === plan.sites.length, `${miss} of ${plan.sites.length}`); }
ok('HOOKS.deckServices names the service, and the colliders of the module are the Paradny + palace 1,270, the shore ring with the deck cuts and the bridge colliders', AT.HOOKS.deckServices.includes('landmarksTauride') && nModule === 1270 + svc.ponds.colliders + B.colliders, `${nModule} = 1270 + ${svc.ponds.colliders} + ${B.colliders}`);
{ const meshes = {}; ctx.staticRoot.traverse((o) => { if (o.isMesh && /^tauride-(bridges|dam-water|reeds)$/.test(o.name)) meshes[o.name] = o; });
  const b = meshes['tauride-bridges'], w = meshes['tauride-dam-water'], r = meshes['tauride-reeds'];
  ok('the meshes: tauride-bridges (one draw, vertex colours, never batched, in the outline pass), tauride-dam-water (a transparent decal out of the outline pass), tauride-reeds (one InstancedMesh, out of the outline pass, never batched)', !!b && !!w && !!r && b.userData.noBatch && b.geometry.attributes.color && b.layers.mask !== 1 << ctx.LAYER_NO_OUTLINE && w.material.transparent && w.layers.mask === 1 << ctx.LAYER_NO_OUTLINE && r.isInstancedMesh && r.count === svc.reeds.instances && r.layers.mask === 1 << ctx.LAYER_NO_OUTLINE && r.userData.noBatch, Object.keys(meshes).join(' '));
  ok(`budgets (data/bridge-design.js BUDGET): the six sites <= ${D.BUDGET.triangles} triangles in <= ${D.BUDGET.draws} draws with <= ${D.BUDGET.colliders} colliders; the reeds ${D.REEDS.draws} draw, <= ${D.REEDS.count} instances`, B.triangles <= D.BUDGET.triangles && B.draws <= D.BUDGET.draws && B.colliders <= D.BUDGET.colliders && svc.reeds.draws === D.REEDS.draws && svc.reeds.instances <= D.REEDS.count && b.geometry.index.count / 3 + w.geometry.index.count / 3 === B.triangles, `${B.triangles} triangles (${JSON.stringify(Object.fromEntries(Object.entries(B.stats.perSite).map(([k, v]) => [k, v.triangles])))}), ${B.draws} draws, ${B.colliders} colliders, reeds ${svc.reeds.triangles} triangles`); }
{ let under = 0, aboveLip = 0, hangs = 0, coping = 0, bodyFace = 0, lipOff = 0, nappeOff = 0; const Wm = plan.water, DM = D.DAM, dam = plan.sites.find((s) => s.type === 'weir'), lip = DM.crest + DM.copingRise, Gm = plan.geometry, bx = dam.box;
  // fix round 2: the SPILL face from the data: the lake mouth (DAM.mouthOnLake) is on one side of the dam axis (south); with spillToLake false the lip and the nappe are on the OTHER side (the Small Pond, north), never on the lake side
  const dA = dam.axis[0], dB = dam.axis[dam.axis.length - 1], dL = Math.hypot(dB[0] - dA[0], dB[1] - dA[1]), px = -(dB[1] - dA[1]) / dL, pz = (dB[0] - dA[0]) / dL, M = BR.DAM_DATA.mouthOnLake;
  const sideOf = (x, z) => Math.sign((x - dA[0]) * px + (z - dA[1]) * pz), lakeSide = sideOf(M[0], M[1]), spillSide = DM.spillToLake ? lakeSide : -lakeSide;
  for (let i = 0; i < Wm.pos.length; i += 3) { const y = Wm.pos[i + 1]; if (y < P.WATER_Y - 0.05) under++; if (y > lip + 0.01) aboveLip++; if (y > DM.crest + 0.05) hangs++; if (sideOf(Wm.pos[i], Wm.pos[i + 2]) !== spillSide) nappeOff++; }
  // the solids inside the dam's box: vertices at the coping lip (copingRise above the crest: the sill stands above the deck line) and vertices of the body between the water and the crest on the channel face (the granite proud of the water)
  const inBox = (i) => Gm.pos[i] >= bx[0] && Gm.pos[i] <= bx[1] && Gm.pos[i + 2] >= bx[2] && Gm.pos[i + 2] <= bx[3];
  for (let i = 0; i < Gm.pos.length; i += 3) { if (!inBox(i)) continue; const y = Gm.pos[i + 1]; if (Math.abs(y - lip) < 1e-6) { coping++; if (sideOf(Gm.pos[i], Gm.pos[i + 2]) !== spillSide) lipOff++; } if (Math.abs(y - (DM.crest - 0.01)) < 1e-6) bodyFace++; }
  ok(`the dam: ONE water level (data/ponds.js WATER_Y ${P.WATER_Y}); the walkway on the crest at ${DM.crest} (the street level at its east end); fix round 1: the granite body rises to 1 cm under the crest (${(DM.crest - P.WATER_Y).toFixed(2)} m proud of the water) and the coping ${DM.copingRise} m ABOVE the deck line on the SPILL face (fix round 2: the face from the data: DAM.mouthOnLake is ${lakeSide > 0 ? 'south' : 'north'} of the axis, spillToLake ${DM.spillToLake}: the lip and the whole nappe on the ${spillSide > 0 ? 'south' : 'north'} face, nothing of them on the other); the nappe decal hangs from the lip to the water (not above the lip, not under the water), the foam on the water: 4 .. 400 decal triangles`, dam.level === DM.crest && Wm.triangles >= 4 && Wm.triangles <= 400 && under === 0 && aboveLip === 0 && hangs > 0 && coping >= 4 && bodyFace >= 4 && lipOff === 0 && nappeOff === 0 && lakeSide !== 0, `${Wm.triangles} decal triangles, ${hangs} decal vertices above the deck line, ${coping} solid vertices at the lip, ${bodyFace} at the body top, ${lipOff} lip + ${nappeOff} decal vertices on the wrong face`); }

// =============================================================== 7. the single datum table
console.log('7. the datum table is the only copy of the water numbers');
{ const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''), dir = 'src/world/landmarksTauride', all = [...fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.js')).map((f) => dir + '/' + f), ...fs.readdirSync(path.join(ROOT, dir, 'data')).filter((f) => f.endsWith('.js') && f !== 'ponds.js').map((f) => dir + '/data/' + f), 'src/areas/north/hooks/water.js', 'src/world/landmarksTauride.js'];
  const t4b = [dir + '/bridges.js', dir + '/reeds.js', dir + '/data/bridge-design.js', 'src/areas/north/hooks/water.js'];
  const hits = []; for (const f of all) { const src = strip(fs.readFileSync(path.join(ROOT, f), 'utf8')); for (const lit of (t4b.includes(f) ? ['-0.45', '-1.2', '-0.5', '-0.3', '1.8'] : ['-0.45', '-1.2'])) { const re = new RegExp('(?<![\\w.])' + lit.replace('.', '\\.') + '(?![\\d])', 'g'); const m = src.match(re); if (m) hits.push(`${f}: ${lit} x${m.length}`); } }
  ok('no second copy of WATER_Y -0.45 or BED_BIG -1.2 as a literal in the garden module or the hooks, and none of BED_SMALL -0.5, the contour -0.3 or the collider top 1.8 in the T4b files (they read the table; comments stripped; ducks.js takes the lane level from the hook, nav.js has no pond number)', hits.length === 0, hits.join('; ') || 'none'); }

// =============================================================== 8. the reeds
console.log('8. the reeds (reeds.js planReeds): deterministic, on the shore band, in belts, off the heads, the decks, the dam, the stairs, the quay');
{ const r1 = RD.planReeds({ keepOut: plan.keepOut }), r2 = RD.planReeds({ keepOut: plan.keepOut }), K = D.REEDS.keepOut;
  ok('planReeds is deterministic and gives at most REEDS.count instances (and at least 300)', JSON.stringify(r1.instances) === JSON.stringify(r2.instances) && r1.instances.length <= D.REEDS.count && r1.instances.length >= 300, `${r1.instances.length} of ${r1.stats.placed} candidates, ${r1.stats.belts} belts over ${r1.stats.beltLengthM} m`);
  const ends = [], ways = [], steps = []; for (const p of Pd.PATHS) { if (p.cls === 'bridge') continue; const q = p.pts; ends.push([q[0], q[1]], [q[q.length - 2], q[q.length - 1]]); (p.cls === 'steps' ? steps : ways).push(q); }
  let band = 0, garden = 0, outline = 0, wayEnd = 0, way = 0, st = 0, deck = 0, dam = 0, y = 0;
  for (const q of r1.instances) { const d = shore.dist(q.x, q.z); if (d < D.REEDS.band[0] - 0.35 || d > D.REEDS.band[1] + 0.35) band++; if (!shore.inGarden(q.x, q.z)) garden++; if (ringDist(q.x, q.z, Fo.GARDEN.o) < K.outline) outline++;
    if (ends.some((e) => Math.hypot(e[0] - q.x, e[1] - q.z) < K.wayEnd)) wayEnd++; if (ways.some((w) => polyDist(q.x, q.z, w) < K.way)) way++; if (steps.some((w) => polyDist(q.x, q.z, w) < K.steps)) st++;
    for (const k of plan.keepOut) { const dd = polyDist(q.x, q.z, k.axis.flat()); if (k.type === 'weir' ? dd < k.hw + K.dam : dd < k.hw + K.deck) { if (k.type === 'weir') dam++; else deck++; } }
    if (Math.abs(q.y - (GH.gardenHeight(q.x, q.z) ?? 0)) > 1e-9) y++; }
  ok(`every clump stands on the shore band (shore distance ${D.REEDS.band[0]} .. ${D.REEDS.band[1]} m + the 0.3 m jitter), inside the garden, its feet on the terrain (gardenHeight: the bed, the wet foot)`, band === 0 && garden === 0 && y === 0, `${band} off the band, ${garden} outside, ${y} off the ground`);
  ok(`none within ${K.wayEnd} m of an alley end, ${K.way} m of an alley, ${K.steps} m of a stair, ${K.deck} m of a bridge deck, ${K.dam} m of the dam, ${K.outline} m of the garden outline (the quay and the skirt stretches)`, wayEnd === 0 && way === 0 && st === 0 && deck === 0 && dam === 0 && outline === 0, `${wayEnd} ${way} ${st} ${deck} ${dam} ${outline}`);
  // belts, not a hedge: of the 10 m stretches of the shore with at least one clump within 2 m, the empty stretches are many
  const segs = GH.shoreSegments(GH.makeShore ? (await imp('src/world/landmarksTauride/data/water.js')).WATER_UNION : null); let stretches = 0, empty = 0;
  for (let i = 0; i < segs.n; i++) { const len = Math.hypot(segs.ex[i], segs.ez[i]); for (let t = 0; t < len; t += 10) { const x = segs.ax[i] + segs.ex[i] * t / len, z = segs.az[i] + segs.ez[i] * t / len; if (ringDist(x, z, Fo.GARDEN.o) < K.outline + 1) continue; stretches++; if (!r1.instances.some((q) => Math.hypot(q.x - x, q.z - z) < 5)) empty++; } }
  ok('the reeds come in belts: at least 25 % of the 10 m stretches of shore (away from the outline) have no clump within 5 m, at most 85 %', empty >= 0.25 * stretches && empty <= 0.85 * stretches, `${empty} of ${stretches} stretches empty`);
  const none = RD.planReeds({ keepOut: plan.keepOut, design: { ...D.REEDS, belt: { ...D.REEDS.belt, threshold: 2 } } });
  ok('mutant: a belt threshold of 2 gives no reed (the belt noise is a real parameter)', none.instances.length === 0, `${none.instances.length}`);
  const close = RD.planReeds({ keepOut: plan.keepOut, design: { ...D.REEDS, keepOut: { ...K, deck: -1, way: 0, wayEnd: 0 } } }); let onDeck = 0; for (const q of close.instances) if (plan.keepOut.some((k) => polyDist(q.x, q.z, k.axis.flat()) < k.hw + K.deck)) onDeck++;
  ok('mutant: without the deck and alley keep-outs clumps stand at the decks and the alley ends (the keep-out check can fail)', onDeck > 0, `${onDeck} at the decks`); }

// =============================================================== 9. the pond lanes of the ducks (--ducks: environment + streets + wildlife are built)
if (args.has('--ducks')) {
  console.log('9. the ducks (wildlife/ducks.js with HOOKS.duckPonds): lanes on the ponds at the water level, off the shores, not under a deck');
  const Dk = ctx.services.wildlife.debug.ducks, lanes = Dk.lanes.filter((l) => l.key === 'pond'), others = Dk.lanes.filter((l) => l.key !== 'pond'), env = ctx.services.environment, hook = AT.HOOKS.duckPonds();
  ok('the North has pond lanes (key pond; the three Fontanka lanes of its far south-west corner are the old waterway branch) and duck groups swim on them', lanes.length >= 8 && Dk.groups.length >= 3 && Dk.groups.some((g) => g.lane.key === 'pond'), `${lanes.length} pond lanes, ${others.length} others (${[...new Set(others.map((l) => l.key))].join(',')}), ${Dk.groups.length} groups (${Dk.groups.filter((g) => g.lane.key === 'pond').length} on the ponds), ${ctx.services.wildlife.ducks.length} ducks`);
  let y = 0, dry = 0, near = 0, under = 0, samples = 0; for (const l of lanes) { if (l.y !== P.WATER_Y) y++; for (let i = 0; i < l.n; i++) { samples++; const x = l.xs[i], z = l.zs[i]; if (!env.waterAt(x, z)) dry++; if (shore.dist(x, z) > -hook.margin) near++; if (plan.deckY(x, z) !== null || inDecks(plan, x, z, 1)) under++; } }
  ok(`every lane is at the water level ${P.WATER_Y}, every sample is water for the field (env.waterAt) and at least ${hook.margin} m from every shore (the exact distance), none under or beside a deck`, y === 0 && dry === 0 && near === 0 && under === 0 && samples > 100, `${samples} samples: ${y} wrong level, ${dry} dry, ${near} near the shore, ${under} at a deck`);
  { let n = 0, off = 0; const ids = new Set(); for (let t = 0; t < 120; t += 2) for (const g of Dk.groups) { const p = Dk.groupPose(g, t); n++; ids.add(g.lane.id); if (!env.waterAt(p.x, p.z) || shore.dist(p.x, p.z) > -2.5 || plan.deckY(p.x, p.z) !== null) off++; }
    ok('the groups stay on the water over 2 simulated minutes (every pose in the water, 2.5 m off the shore, never on a deck)', off === 0 && n > 100, `${n} poses, ${off} off`); }
  ok('mutant: HOOKS.duckPonds is a function on the page and undefined for a module list without the garden (the strip has none)', typeof AT.HOOKS.duckPonds === 'function' && HW.makeDuckPonds(['environment']) === undefined && HW.makeDuckPonds(undefined) === undefined, '');
  { const rings = HW.duckRings(); let bad = 0, n = 0; for (const r of rings) for (let i = 0; i + 1 < r.length; i += 3) { const a = r[i], b = r[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, tx = (b[0] - a[0]) / l, tz = (b[1] - a[1]) / l, wx = -tz, wz = tx; n++; if (!(shore.dist(a[0] + tx * l / 2 + wx * 1.0, a[1] + tz * l / 2 + wz * 1.0) < 0)) bad++; }
    ok('the hook\'s rings have the water on the LEFT of travel (the ducks\' frame), the islands included', bad === 0 && rings.length === 4, `${n} edges, ${bad} with land on the left`); }
}

console.log(failed ? `RESULT: FAIL (${failed} of ${total} checks)` : `RESULT: OK (${total} checks)`);
process.exit(failed ? 1 : 0);
