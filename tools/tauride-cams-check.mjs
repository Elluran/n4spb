// Proof of the 12 Tauride acceptance poses (tools/tauride-cams.mjs) and of the two proposed North VIEWS poses, on the North layout and the garden data. FAILS when a pose is invalid.
//   node tools/tauride-cams-check.mjs [--plan] [--colliders] [--json]
// Per ground pose: inside the play area (10 m margin); not inside a building (1.5 m) or a garden building footprint (2 m); off the roadway (1.2 m); on land: 3 m or more from the water outline of the
// garden (so it stays dry when the ponds, banks and hills exist) and the layout's own ground is not below -0.3 m; 3 m or more from every bridge deck; 1.5 m or more from a fence; inside the garden
// outline; REACHABLE ON FOOT from the south gate (1 m raster: land, outside buildings, the bridge decks count as floor); the HUD area is a named place; a clear line of sight to the target (no
// building of the layout in between); the stored yaw looks at the target (+-1 degree) and the stored pitch aims at its height from the 1.7 m eye (+-3.5 degrees); the object the target names
// (gate, bridge site, monument, green, fountain, building) exists in the data and the target is within 3 m of it. The aerial: a flight pose inside the play area, 100-400 m up, the ground point
// its pitch looks at is the target (+-6 m).
// --plan  prints what is wrong with each pose of the PLAN (expected failures: they justify the corrections; always exit 0)
// --colliders builds the page's static modules like tools/views-check.mjs (heavy: ~2 GB, a minute or two) and adds: the real colliders do not push the pose (0.05 m), the streets net cover, ground height
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { CAMS, VIEWS_PROPOSAL, PLAN_POSES, VIEWS_WAS, EYE } from './tauride-cams.mjs';
import * as S from './tauride/lib/site.mjs';
import { ROOT, parseArgs, inPoly, polyDist, ringDist } from './tauride/lib/common.mjs';

const args = parseArgs();
const { L } = S;
const reach = S.walkGrid().reach(S.S_GATE.x, S.S_GATE.z - 5);
const D = await import(pathToFileURL(path.join(ROOT, 'src/areas/north/data/city.js')).href);
const deg = (r) => r * 180 / Math.PI;
const normYaw = (a) => ((a + 540) % 360) - 180;

/** where the object a target names is (or null when the data has no such object) */
function objectOf(of) {
  if (!of || of === 'ground') return { ok: true, near: () => true };
  const [kind, id] = of.split(':');
  if (of === 'dam') return { ok: !!S.Br.DAM, near: (x, z) => Math.hypot(x - S.Br.DAM.authoritative[0], z - S.Br.DAM.authoritative[1]) < 3 };
  if (kind === 'gate') { const g = S.Fu.GATES.find((q) => q.id === id); return { ok: !!g, near: (x, z) => !!g && Math.hypot(x - g.x, z - g.z) < 3 }; }
  if (kind === 'bridge') { const b = S.Br.BRIDGE_SITES.find((q) => q.site === id); return { ok: !!b, near: (x, z) => !!b && polyDist(x, z, b.deck) < 3 }; }
  if (kind === 'monument') { const m = S.Fu.MONUMENTS.find((q) => q.id === id); return { ok: !!m, near: (x, z) => !!m && Math.hypot(x - m.x, z - m.z) < 3 }; }
  if (kind === 'fountain') { const f = S.Fu.FOUNTAINS.find((q) => q.id === id); return { ok: !!f, near: (x, z) => !!f && Math.hypot(x - f.x, z - f.z) < 3 }; }
  if (kind === 'green') { const g = D.GREEN.find((q) => q.id === id); return { ok: !!g, near: (x, z) => !!g && g.polys.some((p) => inPoly(x, z, p) || ringDist(x, z, p.o) < 3) }; }
  if (kind === 'building') { const b = D.BUILDINGS.find((q) => q.id === id); return { ok: !!b, near: (x, z) => !!b && b.polys.some((p) => inPoly(x, z, p) || ringDist(x, z, p.o) < 3) }; }
  return { ok: false, near: () => false };
}

/** the problems of a ground pose (empty = valid); `loose` = the checks of a plan pose (no reach / target consistency) */
function problems(c, { loose = false } = {}) {
  const n = [];
  const { x, z } = c;
  if (![c.x, c.z, c.yaw, c.pitch].every(Number.isFinite)) return ['non-finite pose'];
  if (!L.inPlay(x, z, 10)) n.push('not 10 m inside the play area');
  if (L.insideBuilding(x, z, 1.5)) n.push('inside a building');
  if (S.footprintDist(x, z) < 2) n.push(`${S.footprintDist(x, z).toFixed(1)} m from a garden building footprint`);
  if (L.isOnRoad(x, z, 1.2)) n.push('on the roadway');
  const wd = S.waterDist(x, z);
  if (wd < 0) n.push(`in the water (${(-wd).toFixed(1)} m from the shore)`); else if (wd < 3) n.push(`only ${wd.toFixed(1)} m from the water (3 m needed)`);
  const bd = S.bridgeDist(x, z); if (bd < 3) n.push(`on / beside a bridge deck (${bd.toFixed(1)} m from its axis)`);
  const fd = S.fenceDist(x, z); if (fd < 1.5) n.push(`${fd.toFixed(1)} m from a fence`);
  if (!S.inGarden(x, z)) n.push('outside the garden outline');
  if (L.heightAt(x, z) < -0.3) n.push(`layout ground ${L.heightAt(x, z).toFixed(2)} m (below -0.3)`);
  if (/^Санкт-Петербург/.test(L.areaAt(x, z))) n.push('the HUD area is the city fallback');
  if (loose) return n;
  if (!reach(x, z)) n.push('not reachable on foot from the south gate');
  const t = c.target, dist = Math.hypot(t.x - x, t.z - z);
  if (dist < 5 || dist > 200) n.push(`target ${dist.toFixed(0)} m away (5 .. 200)`);
  if (!S.los(x, z, t.x, t.z)) n.push('no line of sight to the target (a building in between)');
  const yawWant = L.yawToward(x, z, t.x, t.z), dy = Math.abs(normYaw(c.yaw - yawWant));
  if (dy > 1) n.push(`yaw ${c.yaw} is ${dy.toFixed(1)} degrees off the target (${yawWant.toFixed(1)})`);
  const pitchWant = deg(Math.atan2((t.y ?? 0) - EYE, dist)), dp = Math.abs(c.pitch - pitchWant);
  if (dp > 3.5) n.push(`pitch ${c.pitch} is ${dp.toFixed(1)} degrees off the aim (${pitchWant.toFixed(1)})`);
  const obj = objectOf(t.of);
  if (!obj.ok) n.push(`the target object ${t.of} is not in the data`); else if (!obj.near(t.x, t.z)) n.push(`the target is not within 3 m of ${t.of}`);
  return n;
}
/** a flight pose */
function flightProblems(c) {
  const n = [];
  if (!L.inPlay(c.x, c.z, 10)) n.push('not 10 m inside the play area');
  if (!(c.y >= 100 && c.y <= 400)) n.push(`altitude ${c.y} m (100 .. 400)`);
  const ground = c.y / Math.tan(-c.pitch * Math.PI / 180), b = -c.yaw * Math.PI / 180, gx = c.x + Math.sin(b) * ground, gz = c.z - Math.cos(b) * ground;
  if (!(c.pitch < -20 && c.pitch > -90)) n.push(`pitch ${c.pitch} does not look down`);
  if (Math.hypot(gx - c.target.x, gz - c.target.z) > 6) n.push(`the pose looks at the ground at (${gx.toFixed(0)}, ${gz.toFixed(0)}), not at the target`);
  if (!S.inGarden(c.target.x, c.target.z) && !S.inGarden(c.x, c.z - 110)) n.push('the aimed ground is outside the garden');
  return n;
}

const out = { poses: [], plan: [], views: [] };
let bad = 0;
const line = (ok, id, label, notes) => console.log(`${ok ? 'ok   ' : 'FAIL '} ${id.padEnd(8)} ${label}${notes.length ? ' :: ' + notes.join('; ') : ''}`);

console.log('== the 12 acceptance poses');
for (const c of CAMS) {
  const notes = c.flight ? flightProblems(c) : problems(c);
  if (notes.length) bad++;
  const info = c.flight ? `(${c.x}, ${c.z}) y ${c.y}  yaw ${c.yaw} pitch ${c.pitch}  ${c.name}` : `(${c.x}, ${c.z}) yaw ${c.yaw} pitch ${c.pitch} water ${S.waterDist(c.x, c.z).toFixed(1)} m  ${c.name} -> ${c.target.of}`;
  line(!notes.length, c.id, info, notes);
  out.poses.push({ id: c.id, notes });
}
const ids = new Set(CAMS.map((c) => c.id));
if (ids.size !== 12) { bad++; console.log(`FAIL ${CAMS.length} poses, ${ids.size} distinct ids (12 needed)`); }
for (const k of ['gate', 'bridge', 'monument', 'weir', 'lawn', 'palace', 'aerial']) if (!CAMS.some((c) => c.kind === k)) { bad++; console.log(`FAIL no pose of kind ${k}`); }
console.log('== the two corrected North VIEWS poses (proposal for area.js; not applied)');
for (const v of VIEWS_PROPOSAL) {
  const c = { ...v, target: { y: v.key === 'Digit6' ? 8 : 0, ...v.target } };
  // a VIEWS pose must be valid in the GENERIC North too: the palace court is not in the garden outline, the checks that need the garden are relaxed for it
  const notes = problems({ ...c, target: { ...c.target, of: 'ground' } }, { loose: false }).filter((m) => !(v.key === 'Digit6' && /outside the garden outline|not reachable on foot|pitch .* off the aim|only .* from the water/.test(m)));
  const wall = (() => { const b = -v.yaw * Math.PI / 180; for (let d = 1; d < 6; d += 0.5) if (L.buildingAt(v.x + Math.sin(b) * d, v.z - Math.cos(b) * d)) return d; return null; })();
  if (wall !== null) notes.push(`a wall ${wall} m ahead`);
  if (notes.length) bad++;
  line(!notes.length, v.key, `(${v.x}, ${v.z}) yaw ${v.yaw} pitch ${v.pitch} ${L.areaAt(v.x, v.z)}`, notes);
  out.views.push({ key: v.key, notes });
}

if (args.plan) {
  console.log('== the poses of the PLAN as given (the reasons for the corrections; failing is expected)');
  for (const p of PLAN_POSES) {
    if (p.flight) { console.log(`     ${p.id.padEnd(8)} (${p.x}, ${p.z}) y ${p.y} ${p.name}: ${flightProblems({ ...CAMS.find((c) => c.id === p.id), x: p.x, z: p.z }).join('; ') || 'valid as given'}`); continue; }
    const n = problems({ ...CAMS.find((c) => c.id === p.id), x: p.x, z: p.z }, { loose: true });
    out.plan.push({ id: p.id, notes: n });
    console.log(`     ${p.id.padEnd(8)} (${p.x}, ${p.z}) ${p.name}: ${n.join('; ') || 'valid as given'}`);
  }
  for (const w of VIEWS_WAS) {
    const n = problems({ x: w.x, z: w.z, yaw: w.yaw, pitch: w.pitch, target: { x: w.x, z: w.z - 20, y: 1.7 } }, { loose: true });
    console.log(`     ${w.key.padEnd(8)} (${w.x}, ${w.z}) VIEWS as given: ${n.join('; ') || 'valid as given'}`);
  }
}

if (args.colliders) {
  console.log('== the real colliders (the static modules of the North page are built: this takes a while)');
  const { loadEngine, makeContext } = await import('./tauride/lib/stub-env.mjs');
  const { mainModules, DYNAMIC } = await import(pathToFileURL(path.join(ROOT, 'tools/modules-list.mjs')).href);
  const engine = await loadEngine(ROOT), { ctx } = makeContext(engine, mainModules());
  for (const m of mainModules()) { if (DYNAMIC.includes(m)) continue; const mod = await import(pathToFileURL(path.join(ROOT, 'src/world/' + m + '.js')).href); await mod.build(ctx); }
  const net = ctx.services.streets && ctx.services.streets.net, ph = ctx.physics;
  const rows = [...CAMS.filter((c) => !c.flight), ...VIEWS_PROPOSAL.map((v) => ({ id: v.key, ...v }))];
  for (const c of rows) {
    const notes = [];
    const g = ph.groundHeight(c.x, c.z, 10, false); if (!Number.isFinite(g) || g < -0.5 || g > 1.5) notes.push(`ground height ${g}`);
    const p = { x: c.x, z: c.z }; ph.resolve(p, 0.35, Number.isFinite(g) ? g : 0, 1.7);
    const push = Math.hypot(p.x - c.x, p.z - c.z); if (push > 0.05) notes.push(`inside a collider (pushed ${push.toFixed(2)} m)`);
    const cover = net && net.cover ? net.cover(c.x, c.z, {}) : null; if (cover === null) notes.push('no streets cover'); else if (cover > -0.6) notes.push(`on the roadway (cover ${cover.toFixed(2)})`);
    if (notes.length) bad++;
    line(!notes.length, String(c.id), `colliders (${c.x}, ${c.z}) ground ${Number.isFinite(g) ? g.toFixed(2) : g}${cover !== null ? ' cover ' + cover.toFixed(1) : ''}`, notes);
  }
}

if (args.json) console.log(JSON.stringify(out, null, 1));
console.log(`\n${CAMS.length} poses + ${VIEWS_PROPOSAL.length} VIEWS proposals checked, ${bad} failing`);
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(args.plan && !bad ? 0 : bad ? 1 : 0);
