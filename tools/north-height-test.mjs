// north-height-test.mjs - the height patches of the North and the deck services of the car handling (milestone M6, cluster A; docs/AREAS.md section 9), headless, no GPU.
//   node tools/area.mjs north tools/north-height-test.mjs [--quiet | --verbose]       (--verbose: one line per walk of the Player)
// What it proves, with the REAL layout.heightAt, core/physics.js, core/player.js and drive/handling.js (no stubs for them):
//   1. the registry: layout.heightAt walks HEIGHT_PATCHES in array order (box reject first, then at(x, z), the first non-null wins - 0 is a height - then the old waterway-bed / GROUND_Y line);
//      with the list empty it equals that old line on a lattice over the whole North, and nothing but heightAt reads the list (layout.js gains no export);
//   2. hooks/height.js: [] unless the page lists landmarksTauride, else the Paradny patch first (box = PARADNY_BOX, at = paradnyDeckY); a fresh array per call, so the Tauride remake can append after it;
//   3. the Paradny patch, ACTIVATED here by pushing makeHeightPatches(['landmarksTauride']) into the live HEIGHT_PATCHES array (area-tables.js hands the area module's own array out, layout.js reads it at
//      call time): 3.3 m on the podium, the source's answer inside the box, the old line outside it, a monotone ramp along every stair (the nine STEPS ways = eight stairs), and the real Player walks every stair
//      up and down (walking, running, 20 fps): no stuck, no fall; the Digit4 pose (915, -1010) stands on the podium and stays walkable;
//   4. drive/handling.js: HOOKS.deckServices names the services whose deckY comes before the bridge decks; an absent key / service / deckY is the old chain; the car rides the deck and climbs the stairs only through it.
// The activation is undone at the end (and on exit): the other checks of the process see the North as the page builds it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { Physics } from '../src/core/physics.js';
import { Player } from '../src/core/player.js';
import { createHandling } from '../src/world/drive/handling.js';
import { HOOKS, HEIGHT_PATCHES } from '../src/world/lib/area-tables.js';
import * as A from '../src/world/area.js';
import * as L from '../src/world/layout.js';
import { makeHooks, makeHeightPatches } from '../src/areas/north/hooks.js';
import { makeHeightPatches as terrainPatches } from '../src/areas/north/hooks/height.js';
import * as P from '../src/areas/north/hooks/paradny.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUIET = process.argv.includes('--quiet'), VERBOSE = process.argv.includes('--verbose');
if (process.env.AREA !== 'north') { console.error('run it as the North: node tools/area.mjs north tools/north-height-test.mjs'); process.exit(2); }
globalThis.addEventListener = () => {}; globalThis.document = { pointerLockElement: null }; globalThis.innerWidth = 1280;

const fails = []; let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails.push(msg); console.log('  FAIL', msg); } };
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: ${typeof a === 'number' ? a.toFixed(4) : a} vs ${b} (+-${tol})`);
const say = (s) => { if (!QUIET) console.log(s); };
const section = (s) => say('\n' + s);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- the live registry: the array the area module exports (area-tables.js passes it through), restored on exit
const SAVED = HEIGHT_PATCHES.slice();
const setPatches = (list) => HEIGHT_PATCHES.splice(0, HEIGHT_PATCHES.length, ...list);
const restore = () => setPatches(SAVED);
process.on('exit', restore);
/** the old line of layout.heightAt, the strip's whole answer: the bed of the waterway under (x, z), else street level */
const OLD = (x, z) => { const k = L.waterwayAt(x, z); return k ? L.WATERWAYS[k].bed : L.GROUND_Y; };
function* lattice(x0, x1, z0, z1, step) { for (let x = x0; x <= x1; x += step) for (let z = z0; z <= z1; z += step) yield [x, z]; }
const BOX = P.PARADNY_BOX;

// ------------------------------------------------------------------ 1. the registry (hooks.js is the one place that builds it; the engine reads it through area-tables.js)
section('1. the registry');
{
  ok(HEIGHT_PATCHES === A.HEIGHT_PATCHES, 'area-tables hands out the area module\'s own array (a test activates a patch by pushing into it)');
  ok(!('HEIGHT_PATCHES' in L) && !('HOOKS' in L), 'layout.js gains no export for the registry (tools/layout-golden.mjs lists every export)');
  const mod = A.MODULES.includes('landmarksTauride');
  ok(mod ? SAVED[0] && SAVED[0].id === 'paradny' : SAVED.length === 0, `the page's list (${mod ? 'with' : 'without'} landmarksTauride) gives ${mod ? 'the Paradny patch first' : 'no patch'}: [${SAVED.map((p) => p.id)}]`);
  ok(same(makeHeightPatches(A.MODULES).map((p) => p.id), SAVED.map((p) => p.id)), 'hooks.js makeHeightPatches(MODULES) equals what area.js exported');
  // hooks/height.js is the Paradny terrain (exactly one patch); hooks.js may append the patches of the Tauride remake (the pond bed) AFTER it
  for (const [name, list, exact] of [['hooks/height.js', terrainPatches, true], ['hooks.js', makeHeightPatches, false]]) {
    ok(list([]).length === 0, `${name}: no module, no patch`);
    ok(!list(A.MODULES.filter((m) => m !== 'landmarksTauride')).some((p) => p.id === 'paradny'), `${name}: the page's modules without landmarksTauride give no Paradny patch`);
    ok(list(undefined).length === 0, `${name}: an absent module list gives no patch (and does not throw)`);
    const pt = list(['environment', 'landmarksTauride', 'streets']);
    ok(pt.length >= 1 && (!exact || pt.length === 1) && pt[0].id === 'paradny' && same(pt[0].box, BOX) && pt[0].at === P.paradnyDeckY, `${name}: landmarksTauride gives the Paradny patch FIRST (box = PARADNY_BOX, at = paradnyDeckY)`);
    ok(pt !== list(['landmarksTauride']) && pt[0].box !== BOX, `${name}: a fresh array and a fresh box on every call (the remake appends to it)`);
  }
  ok(same(BOX, [741, 1058.51, -1205, -873]), `PARADNY_BOX is [741, 1058.51, -1205, -873]: ${JSON.stringify(BOX)}`);
  const src = fs.readFileSync(path.join(root, 'src/areas/north/hooks/height.js'), 'utf8');
  const imports = [...src.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
  ok(imports.length > 0 && imports.every((i) => i.startsWith('./') && !/layout|data\/|city/.test(i)), `hooks/height.js imports only its own folder (pure data: no three.js, layout.js or facade): ${JSON.stringify(imports)}`);
  const lay = fs.readFileSync(path.join(root, 'src/world/layout.js'), 'utf8'), hand = fs.readFileSync(path.join(root, 'src/world/drive/handling.js'), 'utf8');
  ok(/import \{ HEIGHT_PATCHES \} from '\.\/lib\/area-tables\.js'/.test(lay), 'layout.js reads HEIGHT_PATCHES from lib/area-tables.js');
  ok(/import \{ HOOKS \} from '\.\.\/lib\/area-tables\.js'/.test(hand), 'handling.js reads HOOKS from lib/area-tables.js');
  ok(![lay, hand].some((t) => /import[^;\n]*(HOOKS|HEIGHT_PATCHES)[^;\n]*from '[^']*\/area\.js'/.test(t)), 'neither engine file imports the tables from area.js');
}

// ------------------------------------------------------------------ 2. the semantics of heightAt over the registry (fake patches in the live array)
section('2. heightAt over the registry');
{
  setPatches([]);
  const w = (() => { for (const [x, z] of lattice(-400, 2400, -2100, -200, 20)) if (L.inRiver(x, z) && L.inPlay(x, z)) return [x, z]; return null; })();
  ok(!!w && L.heightAt(w[0], w[1]) < -1, `a river point of the North to test with: ${JSON.stringify(w)} bed ${w && L.heightAt(w[0], w[1])}`);
  const calls = [];
  const fake = (id, box, v) => ({ id, box, at: (x, z) => { calls.push(id); return typeof v === 'function' ? v(x, z) : v; } });
  const take = (x, z) => { calls.length = 0; const h = L.heightAt(x, z); return [h, calls.join('')]; };
  setPatches([fake('a', [0, 10, 0, 10], null), fake('b', [0, 10, 0, 10], 7), fake('c', [0, 10, 0, 10], 9)]);
  ok(same(take(5, 5), [7, 'ab']), `array order: a gives null, b wins at once, c is never asked: ${JSON.stringify(take(5, 5))}`);
  ok(same(take(20, 5), [OLD(20, 5), '']), 'outside the box: at() is not called and the old line answers');
  for (const [x, z] of [[0, 0], [10, 10], [0, 10], [10, 0]]) ok(take(x, z)[0] === 7, `the box edge (${x}, ${z}) is inside`);
  for (const [x, z] of [[-0.001, 5], [10.001, 5], [5, -0.001], [5, 10.001]]) ok(same(take(x, z), [OLD(x, z), '']), `just outside the box (${x}, ${z}) the old line answers`);
  setPatches([fake('n', [0, 10, 0, 10], null)]);
  ok(same(take(5, 5), [OLD(5, 5), 'n']), 'every patch null: the old line answers');
  setPatches([fake('z', [w[0] - 5, w[0] + 5, w[1] - 5, w[1] + 5], 0)]);
  ok(L.heightAt(w[0], w[1]) === 0, `a patch answering 0 wins over the river bed (0 is a height, not "no answer"): ${L.heightAt(w[0], w[1])}`);
  setPatches([fake('n', [w[0] - 5, w[0] + 5, w[1] - 5, w[1] + 5], null)]);
  ok(L.heightAt(w[0], w[1]) === OLD(w[0], w[1]) && OLD(w[0], w[1]) < -1, 'a patch answering null leaves the river bed');
  ok(L.groundAt === L.heightAt, 'groundAt is heightAt');
  restore();
}

// ------------------------------------------------------------------ 3. the list empty = the old line everywhere
section('3. no patch: heightAt is the old line');
{
  setPatches([]);
  const b = L.WORLD.play; let n = 0, bad = 0, first = null;
  for (const [x, z] of lattice(b.x0 - 150, b.x1 + 150, b.z0 - 150, b.z1 + 150, 12)) { n++; if (L.heightAt(x, z) !== OLD(x, z)) { bad++; first = first || [x, z]; } }
  for (const [x, z] of lattice(BOX[0] - 30, BOX[1] + 30, BOX[2] - 30, BOX[3] + 30, 1)) { n++; if (L.heightAt(x, z) !== OLD(x, z)) { bad++; first = first || [x, z]; } }
  ok(bad === 0, `heightAt equals the waterway-bed / GROUND_Y line on ${n} lattice points of the North and the whole podium box (differs at ${bad}${first ? ', first ' + JSON.stringify(first) : ''})`);
  say(`  ${n} points identical`);
  const d4 = L.VIEWS.find((v) => v.key === 'Digit4');
  ok(L.heightAt(d4.x, d4.z) === 0, 'dormant: Digit4 (915, -1010) is street level (the generic city draws the quarter)');
  restore();
}

// ------------------------------------------------------------------ 4. the Paradny patch, activated
section('4. the Paradny patch (activated)');
setPatches(terrainPatches(['landmarksTauride']));
{
  let plateau = 0, badPlateau = 0, inside = 0, badInside = 0, nullIn = 0, badNull = 0, n = 0;
  for (const [x, z] of lattice(BOX[0], BOX[1], BOX[2], BOX[3], 1)) {
    n++; const d = P.paradnyDeckY(x, z), h = L.heightAt(x, z);
    if (d !== null) { inside++; if (h !== d) badInside++; if (d === P.PARADNY_Y) { plateau++; if (h !== 3.3 || !P.inParadny(x, z)) badPlateau++; } }
    else { nullIn++; if (h !== OLD(x, z)) badNull++; }
  }
  ok(badInside === 0 && inside > 20000, `inside the box heightAt is the Paradny deck wherever it answers (${inside} points, ${badInside} differ)`);
  ok(badPlateau === 0 && plateau > 20000, `3.3 m on the podium: ${plateau} plateau points on a 1 m lattice, ${badPlateau} not 3.3`);
  ok(badNull === 0 && nullIn > 0, `inside the box but off the podium and the stairs the old line answers (${nullIn} points, ${badNull} differ)`);
  for (const [x, z] of [[900, -1000], [915, -1010], [800, -900], [1000, -1000], [850, -1120]]) ok(L.heightAt(x, z) === 3.3, `podium point (${x}, ${z}) = 3.3 (${L.heightAt(x, z)})`);
  say(`  ${n} points of the box: ${inside} deck (${plateau} plateau), ${nullIn} old line`);
  // outside the box: unchanged, and the deck itself answers null there
  let m = 0, bad = 0;
  for (const [x, z] of lattice(BOX[0] - 80, BOX[1] + 80, BOX[2] - 80, BOX[3] + 80, 2)) { if (x >= BOX[0] && x <= BOX[1] && z >= BOX[2] && z <= BOX[3]) continue; m++; if (L.heightAt(x, z) !== OLD(x, z) || P.paradnyDeckY(x, z) !== null) bad++; }
  ok(bad === 0, `outside the box (a ring of 80 m, ${m} points) heightAt is the old line and the deck answers null (${bad} differ)`);
  for (const [x, z] of [[BOX[0] - 0.01, -1000], [BOX[1] + 0.01, -1000], [900, BOX[2] - 0.01], [900, BOX[3] + 0.01]]) ok(L.heightAt(x, z) === OLD(x, z) && P.paradnyDeckY(x, z) === null, `just outside the box (${x}, ${z}): null from the deck, the old line from heightAt`);
  // the rest of the North is untouched
  const b = L.WORLD.play; let k = 0, kb = 0;
  for (const [x, z] of lattice(b.x0 - 150, b.x1 + 150, b.z0 - 150, b.z1 + 150, 12)) { if (x >= BOX[0] && x <= BOX[1] && z >= BOX[2] && z <= BOX[3]) continue; k++; if (L.heightAt(x, z) !== OLD(x, z)) kb++; }
  ok(kb === 0, `the rest of the North (${k} lattice points outside the box) is the old line (${kb} differ)`);
}

// ---- the stairs: eight stairs = the nine STEPS ways (w1303266326 is the tail of the L-shaped w1266791538)
section('5. the stairs');
const STAIRS = P.PARADNY_STAIRS.map((s) => ({ id: s.id, pts: Array.from({ length: s.pts.length / 2 }, (_, i) => [s.pts[i * 2], s.pts[i * 2 + 1]]) }));
const along = (pts, step) => {       // points of the polyline every `step` metres, with the arc length
  const out = []; let s0 = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az);
    for (let u = i ? step : 0; u < len + 1e-9; u += step) out.push({ x: ax + (bx - ax) * u / len, z: az + (bz - az) * u / len, s: s0 + u, nx: -(bz - az) / len, nz: (bx - ax) / len });
    s0 += len;
  }
  return out;
};
{
  ok(P.PARADNY_STEPS.length === 9 && STAIRS.length === 8, `nine STEPS ways, eight stairs (${P.PARADNY_STEPS.length}, ${STAIRS.length})`);
  let maxGrad = 0, minRise = 9, maxDip = 0;
  for (const st of STAIRS) {
    const pts = along(st.pts, 0.05), total = pts[pts.length - 1].s;
    const hs = pts.map((q) => L.heightAt(q.x, q.z));
    let dip = 0, grad = 0;
    for (let i = 1; i < hs.length; i++) { dip = Math.max(dip, hs[i - 1] - hs[i]); grad = Math.max(grad, Math.abs(hs[i] - hs[i - 1]) / (pts[i].s - pts[i - 1].s)); }
    maxGrad = Math.max(maxGrad, grad); maxDip = Math.max(maxDip, dip);
    ok(dip <= 0.02, `${st.id}: the ramp is monotone (largest dip ${(dip * 1000).toFixed(1)} mm, the source's own deck dips by up to 8 mm)`);
    near(hs[0], 0, 0.02, `${st.id}: the foot is at street level`); near(hs[hs.length - 1], P.PARADNY_Y, 0.03, `${st.id}: the top is at the podium`);
    minRise = Math.min(minRise, hs[hs.length - 1] - hs[0]);
    ok(hs.every((h) => h >= -0.001 && h <= 3.32), `${st.id}: the deck stays between street level and the podium`);
    ok(grad <= 1.3, `${st.id}: no pitch steeper than 1.3 m/m (${grad.toFixed(3)} incl. the 1.5 cm landing steps; the flights themselves climb 0.4 .. 0.82; the Player refuses a rise of 0.45 m per 0.12 m substep = 3.7)`);
  }
  // the width: a flight is 1.8 m wide, its height depends on the length along it only (samples that a landing square covers are left out: the squares stick out of a flight that is not axis aligned)
  const onLanding = (x, z) => P.PARADNY_LANDINGS.some((p) => Math.abs(x - p.x) <= p.w / 2 && Math.abs(z - p.z) <= p.w / 2);
  let across = 0, acrossBad = 0, beyond = 0, beyondBad = 0;
  for (const f of P.PARADNY_FLIGHTS) {
    const dx = f.pts[2] - f.pts[0], dz = f.pts[3] - f.pts[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
    for (let u = 0.05; u < len; u += 0.1) {
      const cx = f.pts[0] + ux * u, cz = f.pts[1] + uz * u, ramp = f.start + (f.end - f.start) * u / len;
      for (const o of [-0.85, 0.85]) { const x = cx - uz * o, z = cz + ux * o; if (onLanding(x, z) || onLanding(cx, cz)) continue; across++; if (Math.abs(L.heightAt(x, z) - ramp) > 1e-9) acrossBad++; }
      if (ramp > 0.3 && ramp < 3) for (const o of [-0.95, 0.95]) { const x = cx - uz * o, z = cz + ux * o; if (onLanding(x, z) || P.inParadny(x, z)) continue; beyond++; if (Math.abs(L.heightAt(x, z) - ramp) < 0.05) beyondBad++; }
    }
  }
  ok(across > 100 && acrossBad === 0, `a flight is the same height 0.85 m to either side of its centre line (${across} samples, ${acrossBad} differ)`);
  ok(beyond > 100 && beyondBad === 0, `and 1.8 m wide, no wider: 0.95 m to either side the ramp is gone (${beyond} samples, ${beyondBad} still on the ramp)`);
  for (const s of P.PARADNY_STEPS) {         // every one of the nine mapped ways lies on the deck
    const pts = along(Array.from({ length: s.pts.length / 2 }, (_, i) => [s.pts[i * 2], s.pts[i * 2 + 1]]), 0.1);
    ok(pts.every((q) => P.paradnyDeckY(q.x, q.z) !== null && L.heightAt(q.x, q.z) === P.paradnyDeckY(q.x, q.z)), `${s.id}: the whole mapped way lies on the Paradny deck`);
  }
  say(`  8 stairs: steepest ${maxGrad.toFixed(3)} m/m, smallest rise ${minRise.toFixed(3)} m, largest dip ${(maxDip * 1000).toFixed(1)} mm`);
}

// ---- the real Player walks the stairs
section('6. the Player on the stairs');
const mkPlayer = (ph) => {
  const cam = new THREE.PerspectiveCamera(), dom = { addEventListener() {}, requestPointerLock() {} };
  const p = new Player(cam, dom, ph, { x0: -6000, x1: 6000, z0: -6000, z1: 6000 }); p.enabled = true; p.smoothing = 0;
  p.rescues = 0; p.onRescue = () => { p.rescues++; };
  return p;
};
/** walk the polyline pts (steering at the next vertex, advancing within 0.35 m of it) from pts[0]; returns the log */
function walk(ph, pts, { run = false, dt = 1 / 60, tMax = 45 } = {}) {
  const p = mkPlayer(ph); p.setPose(pts[0][0], pts[0][1], 0, 0);
  const lg = { t: 0, arrived: false, maxErr: 0, air: 0, maxAirRun: 0, sunk: -Infinity, rescues: 0, y0: p.pos.y, y: p.pos.y, dropped: 0, x: 0, z: 0 };
  let k = 1, airRun = 0, prevY = p.pos.y;
  while (lg.t < tMax) {
    const dx = pts[k][0] - p.pos.x, dz = pts[k][1] - p.pos.z;
    if (Math.hypot(dx, dz) < 0.35) { if (k === pts.length - 1) { lg.arrived = true; break; } k++; continue; }
    p.yaw = Math.atan2(-dx, -dz); p.keys = new Set(run ? ['KeyW', 'ShiftLeft'] : ['KeyW']); p.time += dt; p.update(dt); lg.t += dt;
    lg.maxErr = Math.max(lg.maxErr, Math.abs(p.pos.y - L.heightAt(p.pos.x, p.pos.z)));
    lg.sunk = Math.max(lg.sunk, L.heightAt(p.pos.x, p.pos.z) - p.pos.y);
    if (!p.onGround) { lg.air++; airRun++; lg.maxAirRun = Math.max(lg.maxAirRun, airRun); } else airRun = 0;
    lg.dropped = Math.max(lg.dropped, prevY - p.pos.y); prevY = p.pos.y;
  }
  p.keys = new Set(); lg.rescues = p.rescues; lg.y = p.pos.y; lg.x = p.pos.x; lg.z = p.pos.z;
  return lg;
}
{
  const ph = new Physics(L.heightAt);
  const modes = [['walking', { run: false, dt: 1 / 60 }], ['running', { run: true, dt: 1 / 60 }], ['running at 20 fps', { run: true, dt: 1 / 20 }]];
  const rows = [];
  for (const st of STAIRS) {
    const [a, b] = [st.pts[0], st.pts[1]], dl = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const lead = [a[0] - (b[0] - a[0]) / dl * 2.5, a[1] - (b[1] - a[1]) / dl * 2.5];
    ok(L.heightAt(lead[0], lead[1]) === 0, `${st.id}: the lead-in point (${lead.map((v) => v.toFixed(1))}) is street level (${L.heightAt(lead[0], lead[1])})`);
    for (const [name, o] of modes) {
      const up = walk(ph, [lead, ...st.pts], o), down = walk(ph, [...st.pts].reverse().concat([lead]), o);
      rows.push({ id: st.id, name, up, down });
      if (VERBOSE) console.log(`  ${st.id} ${name.padEnd(17)} up ${up.t.toFixed(1)} s err ${up.maxErr.toFixed(3)} air ${up.air} | down ${down.t.toFixed(1)} s err ${down.maxErr.toFixed(3)} air ${down.air} (run ${down.maxAirRun})`);
      ok(up.arrived, `${st.id}, ${name}, up: reached the top landing in ${up.t.toFixed(1)} s (not stuck)`);
      ok(up.y >= 3.25 && up.y <= 3.36, `${st.id}, ${name}, up: stands on the podium (y ${up.y.toFixed(3)})`);
      ok(up.maxErr <= 0.02 && up.air === 0 && up.sunk <= 1e-9 && up.rescues === 0, `${st.id}, ${name}, up: the feet are ON the deck every frame (|y - heightAt| ${up.maxErr.toFixed(3)}, ${up.air} frames in the air, sunk ${up.sunk.toFixed(4)}, ${up.rescues} rescues)`);
      ok(down.arrived, `${st.id}, ${name}, down: reached the street again in ${down.t.toFixed(1)} s (not stuck)`);
      ok(down.y <= 0.06 && down.rescues === 0 && down.sunk <= 1e-9, `${st.id}, ${name}, down: back at street level (y ${down.y.toFixed(3)}), never below the deck (${down.sunk.toFixed(4)}), no rescue (${down.rescues})`);
      // terrain is no sticky surface: a step down of more than 6 cm per frame (steep flight + 1.5 cm landing step at 3.6 m/s, any flight at 8.4 m/s) is a short hop, landed again at the foot (the module's addStairs / addWalkBox make it smooth)
      ok(down.maxErr <= (o.run ? 2 : 0.4), `${st.id}, ${name}, down: no fall (the hop over the flight is at most ${down.maxErr.toFixed(3)} m, ${down.air} frames)`);
    }
  }
  const mx = (f) => Math.max(...rows.map(f));
  say(`  ${rows.length * 2} walks (8 stairs x 3 modes, up and down): slowest ascent ${mx((r) => r.up.t).toFixed(1)} s, slowest descent ${mx((r) => r.down.t).toFixed(1)} s, feet error up at most ${mx((r) => r.up.maxErr).toFixed(3)} m, down at most ${mx((r) => r.down.maxErr).toFixed(3)} m (walking ${Math.max(...rows.filter((r) => r.name === 'walking').map((r) => r.down.maxErr)).toFixed(3)})`);
  // a wall from the street: the podium cannot be entered except by a stair (3.3 m is more than a step)
  const p = mkPlayer(ph); p.setPose(1030, -1000, 0, 0, null);
  ok(Math.abs(p.pos.y - 3.3) < 1e-9, `setPose on the podium stands at 3.3 (${p.pos.y})`);
  const q = mkPlayer(ph); q.setPose(1050, -1000, 90, 0); q.yaw = Math.PI / 2;     // street side of the east edge; W goes along (-sin yaw, -cos yaw) = (-1, 0): west, into the podium
  for (let i = 0; i < 240; i++) { q.keys = new Set(['KeyW']); q.time += 1 / 60; q.update(1 / 60); }
  ok(q.pos.y < 0.1, `from the street the podium is a wall (stopped at x ${q.pos.x.toFixed(2)}, y ${q.pos.y.toFixed(2)})`);
}

// ---- Digit4 stands on the podium
section('7. the Digit4 pose (915, -1010)');
{
  // the pose as M6 found it (VIEWS Digit4, yaw -60, pitch 18): fixed here, so that moving the view later does not turn this check into a tripwire
  const ph = new Physics(L.heightAt), v = { x: 915, z: -1010, yaw: -60, pitch: 18 }, d4 = L.VIEWS.find((q) => q.key === 'Digit4');
  if (!d4 || d4.x !== v.x || d4.z !== v.z) say(`  note: VIEWS Digit4 is (${d4 && d4.x}, ${d4 && d4.z}) now, no longer the M6 pose`);
  ok(P.inParadny(v.x, v.z), 'the pose stands inside the podium polygon');
  const p = mkPlayer(ph); p.setPose(v.x, v.z, v.yaw, v.pitch);
  near(p.pos.y, 3.3, 1e-9, 'the pose stands on the podium (feet)'); near(p.camera.position.y, 3.3 + p.eye, 0.05, 'the eye is 1.52 m over the podium');
  ok(!p.isUnderground(), 'not underground');
  const ys = []; let pushed = 0;
  for (const yaw of [0, 90, 180, 270].map((d) => d * Math.PI / 180)) {
    p.setPose(v.x, v.z, 0, 0); p.yaw = yaw;
    for (let i = 0; i < 300; i++) { p.keys = new Set(['KeyW']); p.time += 1 / 60; p.update(1 / 60); ys.push(p.pos.y); }
    pushed = Math.max(pushed, Math.hypot(p.pos.x - v.x, p.pos.z - v.z));
  }
  ok(ys.every((y) => Math.abs(y - 3.3) < 1e-9) && pushed > 15, `walking 5 s in four directions from the pose: on the deck all the time (y ${Math.min(...ys).toFixed(3)} .. ${Math.max(...ys).toFixed(3)}), ${pushed.toFixed(0)} m away at most`);
  ok(p.onGround && p.rescues === 0, 'grounded, no rescue');
  say(`  Digit4: inside the polygon, y 3.300, eye ${(3.3 + p.eye).toFixed(2)} m, walkable. tools/views-check.mjs accepts a ground height of -0.5 .. 1.5 only (see the report)`);
}

// ------------------------------------------------------------------ 8. the deck services of the car handling
section('8. drive/handling.js deckServices');
const mkWorld = (services) => ({ physics: new Physics(L.heightAt), L: { WORLD: L.WORLD, inPlay: L.inPlay, clampToPlay: L.clampToPlay, inExtent: L.inExtent, heightAt: L.heightAt, insideBuilding: () => false }, services });
const tauride = { deckY: (x, z) => P.paradnyDeckY(x, z) };
{
  ok(same(HOOKS.deckServices, ['landmarksTauride']) && same(makeHooks([]).deckServices, ['landmarksTauride']), `HOOKS.deckServices is ['landmarksTauride']: ${JSON.stringify(HOOKS.deckServices)}`);
  const pod = [900, -1000], flight = P.PARADNY_FLIGHTS.find((f) => f.id === STAIRS[3].id), mid = [(flight.pts[0] + flight.pts[2]) / 2, (flight.pts[1] + flight.pts[3]) / 2];
  const g = (w, x, z) => createHandling(w).groundAt(x, z);
  near(g(mkWorld({}), pod[0], pod[1]), 0.03, 0.0001, 'no service: the asphalt (the car ignores terrain above 0.45 m: groundAt takes only low walk boxes)');
  near(g(mkWorld({ landmarksTauride: tauride }), pod[0], pod[1]), 3.33, 1e-9, 'landmarksTauride built: the car stands on the podium deck + 0.03');
  near(g(mkWorld({ landmarksTauride: tauride }), mid[0], mid[1]), P.paradnyDeckY(mid[0], mid[1]) + 0.03, 1e-9, 'on a stair flight: the stair deck + 0.03');
  near(g(mkWorld({ landmarksTauride: tauride }), 700, -1000), 0.03, 1e-9, 'beside the podium the service answers null: the old chain (asphalt)');
  const chain = { landmarksC: { bridge: { deckY: (x, z) => (x < 800 ? 5 : null) } }, bridges: { deckY: () => 7 } };
  const w2 = mkWorld({ ...chain, landmarksTauride: tauride });
  near(g(w2, 900, -1000), 3.33, 1e-9, 'the area\'s deck service comes BEFORE the bridge decks');
  near(g(w2, 700, -1000), 5.03, 1e-9, 'outside its deck: landmarksC.bridge next (the old order)');
  near(g(mkWorld({ bridges: chain.bridges }), 900, -1000), 7.03, 1e-9, 'without landmarksC: services.bridges (the old order)');
  near(g(mkWorld({ landmarksTauride: {} }), 900, -1000), 0.03, 1e-9, 'a service without deckY is skipped');
  near(g(mkWorld({ landmarksTauride: { deckY: () => undefined } }), 900, -1000), 0.03, 1e-9, 'a service that answers undefined is skipped');
  near(g(mkWorld({ landmarksTauride: { deckY: () => 0 }, bridges: chain.bridges }), 900, -1000), 0.03, 1e-9, 'a deck at 0 is a deck (0 is not "no answer": the bridge behind it is not asked)');
  const late = mkWorld({}), car = createHandling(late); late.services.landmarksTauride = tauride;
  near(car.groundAt(pod[0], pod[1]), 3.33, 1e-9, 'a service built after the handling is found (looked up at call time)');
  // river: a deck of the service makes the river bed no obstacle, as a bridge deck does
  const rv = (() => { for (const [x, z] of lattice(-400, 2400, -2100, -200, 20)) if (L.inRiver(x, z) && L.inPlay(x, z)) return [x, z]; return null; })();
  ok(createHandling(mkWorld({})).blocked(rv[0], rv[1]) === true, `a car cannot enter the river at ${JSON.stringify(rv)}`);
  ok(createHandling(mkWorld({ landmarksTauride: { deckY: () => 1 } })).blocked(rv[0], rv[1]) === false, 'with a deck of the service over it the river is no obstacle');
  // the absent key / an empty list: exactly the old chain
  const keep = HOOKS.deckServices;
  try {
    delete HOOKS.deckServices;
    near(g(mkWorld({ landmarksTauride: tauride }), pod[0], pod[1]), 0.03, 1e-9, 'HOOKS.deckServices absent (the strip): the old chain, the service is not asked');
    near(g(mkWorld({ landmarksTauride: tauride, bridges: chain.bridges }), pod[0], pod[1]), 7.03, 1e-9, 'absent key and a bridge: the bridge chain');
    HOOKS.deckServices = [];
    near(g(mkWorld({ landmarksTauride: tauride }), pod[0], pod[1]), 0.03, 1e-9, 'an empty list: the old chain');
    HOOKS.deckServices = ['aService', 'landmarksTauride'];
    near(g(mkWorld({ aService: { deckY: () => 2 }, landmarksTauride: tauride }), pod[0], pod[1]), 2.03, 1e-9, 'several services: in list order');
    near(g(mkWorld({ aService: { deckY: () => null }, landmarksTauride: tauride }), pod[0], pod[1]), 3.33, 1e-9, 'the first one without a deck: the next');
  } finally { if (keep === undefined) delete HOOKS.deckServices; else HOOKS.deckServices = keep; }
  ok(HOOKS.deckServices === keep, 'HOOKS.deckServices restored');

  // the car climbs each stair through the service (the first, straight flight), and sinks nowhere
  let worst = 0, climbed = 0;
  for (const s of STAIRS) {
    const f = P.PARADNY_FLIGHTS.find((q) => q.id === s.id), dx = f.pts[2] - f.pts[0], dz = f.pts[3] - f.pts[1], dl = Math.hypot(dx, dz), ux = dx / dl, uz = dz / dl;
    const w = mkWorld({ landmarksTauride: tauride }), c = createHandling(w), yaw = Math.atan2(ux, uz);
    c.reset(f.pts[0] - ux * 7, f.pts[1] - uz * 7, yaw); let t = 0, maxErr = 0, reachedY = 0;
    for (; t < 6; t += 1 / 60) {
      c.step(1 / 60, { thr: 0.2, brk: 0, steer: 0, hand: false, nitro: false });
      const d = P.paradnyDeckY(c.x, c.z); if (d !== null) maxErr = Math.max(maxErr, Math.abs(c.y - (d + 0.03)));
      const u = (c.x - f.pts[0]) * ux + (c.z - f.pts[1]) * uz; if (u >= dl - 0.3) { reachedY = c.y; break; }
    }
    worst = Math.max(worst, maxErr);
    ok(Math.abs(reachedY - (f.end + 0.03)) < 0.3, `${s.id}: the car reached the end of the first flight (y ${reachedY.toFixed(2)} vs deck ${(f.end + 0.03).toFixed(2)}) in ${t.toFixed(1)} s`);
    ok(maxErr < 0.3, `${s.id}: the car rides the deck up the flight (largest |y - deck| ${maxErr.toFixed(3)})`);
    if (reachedY > 1) climbed++;
    const w0 = mkWorld({}), c0 = createHandling(w0); c0.reset(f.pts[0] - ux * 7, f.pts[1] - uz * 7, yaw); for (let i = 0; i < 6 * 60; i++) c0.step(1 / 60, { thr: 0.2, brk: 0, steer: 0, hand: false, nitro: false });
    if (s === STAIRS[0]) ok(c0.y < 0.1, `without the service the same car stays on the asphalt (y ${c0.y.toFixed(2)}): cars climb the Paradny stairs only through a deck service`);
  }
  say(`  car: ${climbed} of 8 stairs climbed through the service, largest ride error ${worst.toFixed(3)} m`);
}

// ------------------------------------------------------------------ 9. the cost of the loop
section('9. the cost of heightAt');
{
  const timeIt = (fn) => { let s = 0; const t = process.hrtime.bigint(); for (let i = 0; i < 275; i++) for (let j = 0; j < 300; j++) s += fn(741 + i * 2, -1205 + j * 2); return [Number(process.hrtime.bigint() - t) / 1e6, s]; };
  const best = (fn) => { timeIt(fn); timeIt(fn); let m = Infinity, s = 0; for (let r = 0; r < 9; r++) { const [t, v] = timeIt(fn); m = Math.min(m, t); s = v; } return [m, s]; };
  setPatches([]); const [tOld, sOld] = best(OLD), [tEmpty, sEmpty] = best(L.heightAt);
  setPatches(terrainPatches(['landmarksTauride'])); const [tOn, sOn] = best(L.heightAt);
  restore();
  say(`  82,500 calls on a 2 m grid over the podium box (best of 9, warm): the old line ${tOld.toFixed(1)} ms, heightAt with an empty list ${tEmpty.toFixed(1)} ms, with the Paradny patch ${tOn.toFixed(1)} ms`);
  ok(sOld === sEmpty, 'the same sum');
  ok(tEmpty <= tOld * 1.6 + 3, `an empty list costs next to nothing (${tEmpty.toFixed(1)} ms vs ${tOld.toFixed(1)} ms)`);
  ok(tOn <= tOld * 40 + 50 && sOn !== sOld, `the patch keeps the whole-map start-up cheap (${tOn.toFixed(1)} ms: every call outside the box is rejected before the polygon work)`);
}

restore();
console.log(fails.length ? `\nFAILED ${fails.length} of ${checks} checks` : `\nall ${checks} checks passed`);
process.exit(fails.length ? 1 : 0);
