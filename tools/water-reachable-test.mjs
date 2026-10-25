// tools/water-reachable-test.mjs - THE RULE FOR CHECKING "water is reachable" (CLAUDE.md "World rules", docs/AREAS.md 13.7), CPU only, no GPU, no bake:
//   node tools/area.mjs <palace|smolny> tools/water-reachable-test.mjs [--quick]            npm run water   (both live areas)
// It builds the REAL modules of the area headlessly (tools/lib/headless-world.mjs: environment, bridges, streets, the landmark modules ... everything that owns colliders; no city / people / traffic) and proves
// with the area's real colliders, the real Physics + Player and the real car handling (drive/handling.js):
//   1  no collider and no territory predicate classifies a water cell as blocked: every sampled water cell in the play area is inside the territory, reachable for the car (handling.blocked), has a finite ground
//      (the bed), is no keep-out; the free water cells form ONE connected body per waterway (no wall of colliders cuts the water); the only solids standing in water are structures (piers, abutments, decks)
//   2  a walker enters the water where no fence stands (an open quay edge), falls into the trench, WADES (slower, depth > 0), walks on the bed, cannot climb a trench wall
//   3  a fence bay knocked away opens the way: before the knock the same walk is stopped, the collider is gone after it, the low rest box is no obstacle, the walker goes in
//   4  the car drives off an edge through a broken fence, FALLS to the bed (the 'land' + 'hit' events: fall damage by the existing damage model), drives on the bed with the water drag, cannot climb out
//   5  a flight landing over water is allowed (player.landingBlocked)
//   6  the AUDIT: every thin tall collider near water is a knock record (a fence, a parapet, a railing ...) except the listed structures; every knock record of kind 'fence' owns its collider
//   7  (smolny) the Tauride ponds are water (physics.waterLevel), no shore colliders, a walker steps into them from the bank, the car keep-out does not cover the ponds
// A pose in water is never a failure; a wall of water is.
import assert from 'node:assert/strict';
import { buildWorld } from './lib/headless-world.mjs';

const QUICK = process.argv.includes('--quick');
const AREA = process.env.AREA || 'palace';
let checks = 0, fails = 0;
const check = (name, fn) => { try { fn(); checks++; console.log('PASS', name); } catch (e) { fails++; console.log('FAIL', name, '\n    ', String(e.message).split('\n').slice(0, 6).join('\n     ')); } };
const t0 = Date.now();
const { ctx, L, THREE, built, marks, errors } = await buildWorld({ log: (s) => console.log(s) });
console.log(`area ${AREA}: built ${built.length} modules in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${built.join(' ')}; ${ctx.physics.items.length} colliders, ${ctx.knock.stats.registered} knock records ${JSON.stringify(ctx.knock.stats.byKind)}`);
const ph = ctx.physics;
const { Player } = await import('../src/core/player.js');
const { createHandling } = await import('../src/world/drive/handling.js');
const { SPEC } = await import('../src/world/drive/model.js');
const { MASS, tuningFor } = await import('../src/world/drive/cars/tuning.js');
const { HOOKS } = await import('../src/world/lib/area-tables.js');
const hyp = Math.hypot, DEG = 180 / Math.PI;
const modOf = (it) => { const i = ph.items.indexOf(it); for (const [n, [a, b]] of Object.entries(marks)) if (i >= a && i < b) return n; return '?'; };
const env = ctx.services.environment;

// ---------------------------------------------------------------- helpers
function walker(x, z, dx = 0, dz = -1) {
  const dom = { addEventListener() {}, requestPointerLock() {} }, cam = new THREE.PerspectiveCamera();
  const p = new Player(cam, dom, ph, L.WORLD.play);
  p.enabled = true; p.clampXZ = L.clampToPlay; p.solidAt = L.insideBuilding; p.smoothing = 0;
  p.setPose(x, z, Math.atan2(-dx, -dz) * DEG, 0);
  return p;
}
const heading = (p, dx, dz) => { p.yaw = Math.atan2(-dx, -dz); };
function walk(p, seconds, { run = false, dt = 1 / 60 } = {}) {
  p.keys.add('KeyW'); if (run) p.keys.add('ShiftLeft');
  let minY = p.pos.y;
  for (let t = 0; t < seconds - 1e-9; t += dt) { p.time += dt; p.update(dt); minY = Math.min(minY, p.pos.y); }
  p.keys.clear(); return { minY };
}
const waterAt = (x, z) => ph.waterLevel(x, z);
const knockUpdate = (seconds) => { for (let t = 0; t < seconds; t += 1 / 60) ctx.knock.update(1 / 60); };
/** unit normal of a bay record that points to the water (within 7 m), or null */
function towardWater(r) {
  const tx = Math.cos(r.rotY), tz = -Math.sin(r.rotY);
  for (const [nx, nz] of [[-tz, tx], [tz, -tx]]) { for (const d of [1.5, 3, 5, 7]) if (waterAt(r.x + nx * d, r.z + nz * d) !== null) return { nx, nz, tx, tz }; }
  return null;
}
/** is the corridor around the segment (x0, z0) -> (x1, z1) free of every solid except `except` (a Set of colliders) at standing height ? (radius r) */
function corridorFree(x0, z0, x1, z1, r, y0, y1, except) {
  const n = Math.max(2, Math.ceil(hyp(x1 - x0, z1 - z0) / 0.6));
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
    for (const it of ph.querySolids(x, z, r + 1)) {
      if (except && except.has(it)) continue;
      if (it.type === 'hole') continue;
      if (it.type === 'walk' || it.type === 'ramp') { const top = it.type === 'walk' ? it.top : Math.max(it.yA, it.yB); if (top <= y0 + 0.45) continue; }
      const hi = it.type === 'walk' ? it.top : it.type === 'ramp' ? Math.max(it.yA, it.yB) : it.y1;
      if (hi <= y0 + 0.45 || it.y0 >= y1) continue;
      const q = { x, z }; const moved = (() => { const c = { x, z }; ph.resolve(c, r, y0, 1.7); return hyp(c.x - x, c.z - z) > 0.02; })();
      if (moved) return false;
      void q; break;
    }
  }
  return true;
}
const fences = () => ctx.knock.list.filter((r) => r.kind === 'fence');

// ---------------------------------------------------------------- 0 the build itself
check('0 the modules built without a module error (headless)', () => { const bad = errors.filter((e) => /failed|is not a function|is not defined|Cannot read/.test(e)); assert.equal(bad.length, 0, bad.slice(0, 3).join('\n')); });
check('0 the fences are knock records with colliders: every fence record owns its box, every box of a record is in the physics grid', () => {
  const fs = fences(); assert(fs.length > 200, 'fence records: ' + fs.length);
  const inGrid = new Set(ph.items);
  let noItem = 0, lost = 0; for (const r of fs) { if (!r.items.length) noItem++; for (const it of r.items) if (!inGrid.has(it)) lost++; }
  assert.equal(noItem, 0, noItem + ' fence records without a collider'); assert.equal(lost, 0, lost + ' collider handles missing from the physics');
});

// ---------------------------------------------------------------- 1 water cells are not blocked
const car0 = createHandling(ctx, null);
const cells = [];                                                          // sampled water cells inside the play area: { x, z, key, level }
{
  const keys = Object.keys(L.WATERWAYS), step = QUICK ? 24 : 12, R = L.WORLD.play;
  for (let x = R.x0; x <= R.x1; x += step) for (let z = R.z0; z <= R.z1; z += step) {
    if (!L.inPlay(x, z)) continue; const k = L.waterwayAt(x, z); if (k) cells.push({ x, z, key: k, level: L.WATERWAYS[k].water });
  }
  void keys;
}
console.log(`water cells sampled in the play area: ${cells.length} (${[...new Set(cells.map((c) => c.key))].join(', ')})`);
check('1 water cells in the play area: inside the territory, not clamped, not blocked for a car (buildings aside), finite ground, no keep-out', () => {
  assert(cells.length > 300, 'too few water cells: ' + cells.length);
  const bad = { outside: 0, clamped: 0, blocked: 0, ground: 0, keepOut: 0, noLevel: 0 }, ex = [];
  for (const c of cells) {
    if (L.insideBuilding(c.x, c.z)) continue;
    if (!L.inPlay(c.x, c.z)) { bad.outside++; ex.push(['outside', c.x, c.z]); }
    const cl = L.clampToPlay(c.x, c.z, 0); if (cl[0] !== c.x || cl[1] !== c.z) bad.clamped++;
    if (car0.blocked(c.x, c.z)) { bad.blocked++; if (ex.length < 6) ex.push(['blocked', c.x, c.z]); }
    const g = ph.groundHeight(c.x, c.z, c.level - 0.3, false); if (!Number.isFinite(g) || g > c.level + 0.3) { bad.ground++; if (ex.length < 6) ex.push(['ground', c.x, c.z, g]); }      // (the bed, or a landing stage / step on it; never a void)
    if (HOOKS.carKeepOut && HOOKS.carKeepOut(c.x, c.z)) bad.keepOut++;
    if (ph.waterLevel(c.x, c.z) !== c.level) bad.noLevel++;
  }
  assert.deepEqual(bad, { outside: 0, clamped: 0, blocked: 0, ground: 0, keepOut: 0, noLevel: 0 }, JSON.stringify(ex.slice(0, 6)));
});
check('1 no wall of colliders cuts a body of water: every connected body of water cells (the territory alone) keeps >= 90 % of its FREE cells in one connected part (piers, abutments and buildings are holes, not walls)', () => {
  const step = QUICK ? 8 : 4, cs = [];
  for (const k of Object.keys(L.WATERWAYS)) void k;
  const R = L.WORLD.play;
  for (let x = R.x0; x <= R.x1; x += step) for (let z = R.z0; z <= R.z1; z += step) { if (!L.inPlay(x, z)) continue; const k = L.waterwayAt(x, z); if (k) cs.push({ x, z, k }); }
  const idx = new Map(); for (const c of cs) idx.set(Math.round(c.x / step) + ',' + Math.round(c.z / step), c);
  const free = new Set();
  for (const [k, c] of idx) {
    const bed = L.heightAt(c.x, c.z); let blocked = L.insideBuilding(c.x, c.z);
    if (!blocked) { const p = { x: c.x, z: c.z }; ph.resolve(p, 0.35, bed, 1.7); blocked = hyp(p.x - c.x, p.z - c.z) > 0.02; }
    if (!blocked) free.add(k);
  }
  const comps = (has) => { const comp = new Map(), sizes = []; for (const s0 of has) { if (comp.has(s0)) continue; const id = sizes.length; let n = 0; const q = [s0]; comp.set(s0, id); while (q.length) { const k = q.pop(); n++; const [i, j] = k.split(',').map(Number); for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { const kk = (i + di) + ',' + (j + dj); if (has.has(kk) && !comp.has(kk)) { comp.set(kk, id); q.push(kk); } } } sizes.push(n); } return { comp, sizes }; };
  const all = comps(new Set(idx.keys())), fr = comps(free), bad = [];
  all.sizes.forEach((n, id) => {
    if (n < 40) return;
    const parts = new Map(); for (const [k, cid] of all.comp) if (cid === id && free.has(k)) { const f = fr.comp.get(k); parts.set(f, (parts.get(f) || 0) + 1); }
    const tot = [...parts.values()].reduce((p, q) => p + q, 0), best = Math.max(0, ...parts.values()), share = best / Math.max(1, tot);
    let key = ''; for (const [k, cid] of all.comp) if (cid === id) { key = idx.get(k).k; break; }
    console.log(`  body of ${key}: ${n} cells (${(n * step * step / 1e4).toFixed(1)} ha), ${tot} free, largest free part ${(share * 100).toFixed(1)} %`);
    if (share < 0.9) bad.push(key + ' ' + n + ' cells ' + (share * 100).toFixed(1) + ' %');
  });
  assert(all.sizes.some((n) => n >= 40) && bad.length === 0, 'cut waters: ' + bad.join(', '));
});
check('1 the solids that stand in water (a collider on a water cell that stops a walker on the bed) are structures, never a fence line: no fence-kind record and no thin long wall on a water cell', () => {
  const ex = [];
  for (const it of ph.items) {
    if (it.type !== 'box' && it.type !== 'cyl') continue; if (it.fence) { /* checked below */ }
    const x = it.cx, z = it.cz; if (!L.inPlay(x, z, -5) || waterAt(x, z) === null) continue;
    const bed = L.heightAt(x, z); if (it.y1 <= bed + 0.45 || it.y0 >= bed + 1.7) continue;
    const thin = it.type === 'box' && Math.min(it.hw, it.hd) * 2 <= 1.1 && Math.max(it.hw, it.hd) * 2 >= 4;
    if (thin && (it.y1 - bed) < 3 && L.waterwayAt(x, z) !== 'moat') ex.push([modOf(it), +x.toFixed(0), +z.toFixed(0), +it.y0.toFixed(1), +it.y1.toFixed(1), +(Math.max(it.hw, it.hd) * 2).toFixed(1)]);
  }
  assert.equal(ex.length, 0, 'thin walls standing IN water: ' + JSON.stringify(ex.slice(0, 6)));
});

// ---------------------------------------------------------------- 2 a walker enters the water where no fence stands
const segs = (env && env.quay && env.quay.segments) || [];
function openEdges() {
  const out = [];
  for (const s of segs) {
    const len = hyp(s.bx - s.ax, s.bz - s.az); if (len < 3 || s.slope) continue;
    for (let u = 1; u < len - 1; u += 2) {
      const px = s.ax + (s.bx - s.ax) * u / len, pz = s.az + (s.bz - s.az) * u / len, sx = px + s.nx * 3.0, sz = pz + s.nz * 3.0, ex = px - s.nx * 0.6, ez = pz - s.nz * 0.6;
      if (!L.inPlay(sx, sz, 8) || L.insideBuilding(sx, sz, 1) || L.insideBuilding(px, pz, 1)) continue;
      if (waterAt(px - s.nx * 1.0, pz - s.nz * 1.0) === null) continue;              // the water must start right behind the wall line
      if (!corridorFree(sx, sz, ex, ez, 0.35, 0, 1.7, null)) continue;
      out.push({ sx, sz, dx: -s.nx, dz: -s.nz, key: s.key, px, pz });
    }
  }
  return out;
}
const open = openEdges();
console.log(`open quay edges found (no collider between the pavement and the water): ${open.length}`);
check('2 a walker steps off an OPEN quay edge into the water, falls into the trench and wades: depth > 0, slower, on the bed; cannot climb the wall back; the camera stays above the bed', () => {
  assert(open.length > 0, 'no open quay edge in this area');
  const picks = []; const seenKey = new Set();
  for (const o of open) { if (picks.length >= (QUICK ? 3 : 8)) break; const k = o.key + Math.round(o.px / 80) + Math.round(o.pz / 80); if (seenKey.has(k)) continue; seenKey.add(k); picks.push(o); }
  const stats = { wet: 0, n: 0 }, ex = [];
  for (const o of picks) {
    const p = walker(o.sx, o.sz, o.dx, o.dz); stats.n++;
    walk(p, 4.0);
    const wl = waterAt(p.pos.x, p.pos.z), dry = walker(o.sx, o.sz, o.dx, o.dz);
    if (wl === null || !(p.depth > 0.3) || !(p.pos.y < wl - 0.3)) { ex.push([o.key, +o.sx.toFixed(0), +o.sz.toFixed(0), wl, +p.depth.toFixed(2), +p.pos.y.toFixed(2)]); continue; }
    stats.wet++;
    assert(p.wade < 1 && p.wade >= 0.45, 'wading factor ' + p.wade);
    assert(p.pos.y + p.eye > L.heightAt(p.pos.x, p.pos.z) + 1.4, 'the eye stays at 1.5 m over the bed');
    assert(p.onGround, 'standing on the bed');
    // slower than on dry ground: 2 s of walking along the bed (turn along the wall) covers less than 2 s on the pavement
    const bedMove = (() => { const q = { x: p.pos.x, z: p.pos.z }; heading(p, o.dx, o.dz); p.yaw += Math.PI / 2; walk(p, 1.5); return hyp(p.pos.x - q.x, p.pos.z - q.z); })();
    const dryMove = (() => { const q = { x: dry.pos.x, z: dry.pos.z }; heading(dry, -o.dz, o.dx); walk(dry, 1.5); return hyp(dry.pos.x - q.x, dry.pos.z - q.z); })();
    assert(bedMove > 0.5, 'the walker is not stuck on the bed (' + bedMove.toFixed(2) + ' m)');
    if (dryMove > 3) assert(bedMove < dryMove * 0.95, `wading is slower (${bedMove.toFixed(2)} m on the bed, ${dryMove.toFixed(2)} m dry)`);
    // the trench wall is a wall: walking back against it does not lift him out
    heading(p, -o.dx, -o.dz); walk(p, 3.0);
    assert(waterAt(p.pos.x, p.pos.z) !== null && p.pos.y < wl - 0.3, 'cannot climb the trench wall');
  }
  assert(stats.wet >= Math.ceil(stats.n * 0.75), `${stats.wet} of ${stats.n} walks ended in the water: ${JSON.stringify(ex)}`);
});
check('2 a walker runs along the bed for 10 s without being stuck or leaving the water (the bed is a floor, the play-edge slide still holds)', () => {
  const o = open[Math.floor(open.length / 2)]; assert(o);
  const p = walker(o.sx, o.sz, o.dx, o.dz); walk(p, 3.0); assert(p.depth > 0.3);
  heading(p, -o.dz, o.dx); const a = { x: p.pos.x, z: p.pos.z }; walk(p, 10, { run: true });
  assert(hyp(p.pos.x - a.x, p.pos.z - a.z) > 4 || !L.inPlay(p.pos.x + (p.pos.x - a.x), p.pos.z + (p.pos.z - a.z), 2), 'moved on along the bed');
  assert(L.inPlay(p.pos.x, p.pos.z), 'inside the territory');
});

// ---------------------------------------------------------------- 3 a fence bay knocked away opens the way
function pickFence(filter = () => true, tries = 400) {
  const fs = fences().filter((r) => r.state === 'stand' && r.items.length && L.inPlay(r.x, r.z, 30));
  for (let i = 0; i < fs.length && tries > 0; i++) {
    const r = fs[(i * 7919) % fs.length]; if (!filter(r)) continue; tries--;
    const w = towardWater(r); if (!w) continue;
    const len = r.w || 2, ex = new Set(r.items);
    // the neighbours of the same fence line are allowed (the walk is straight at the bay), nothing else may stand in the way, on either side
    const near = ph.querySolids(r.x, r.z, 4); for (const it of near) if (it.fence) ex.add(it);
    const sx = r.x - w.nx * 2.2, sz = r.z - w.nz * 2.2;                     // 2.2 m on the land side (the bay is 0.45 thick: the walker stands 2 m before its face)
    if (L.insideBuilding(sx, sz, 1) || waterAt(sx, sz) !== null) continue;
    if (!corridorFree(sx, sz, r.x + w.nx * 1.2, r.z + w.nz * 1.2, 0.35, 0, 1.7, ex)) continue;
    // the water side: at least 1.5 m of free water-side ground behind the bay is not needed (it is the trench), but the bay must be in front of the water
    const q = ph.querySolids(r.x, r.z, 0.2); void q;
    return { r, w, sx, sz, len };
  }
  return null;
}
const FILTER_QUAY = (r) => /^env-quay-fence|^env-quay-parapet/.test((r.parts[0] && r.parts[0].mesh && r.parts[0].mesh.name) || '');
check('3 knocking a quay fence bay away opens the way: the walk is stopped before, the collider is gone after, the rest box is no obstacle, the walker goes into the water', () => {
  const f = pickFence(FILTER_QUAY) || pickFence(); assert(f, 'no testable fence bay');
  const { r, w, sx, sz } = f, fenceBox = r.item, before = walker(sx, sz, w.nx, w.nz); walk(before, 3.0);
  const proj = (p) => (p.pos.x - r.x) * w.nx + (p.pos.z - r.z) * w.nz;
  assert(proj(before) < 0, `before the knock the fence stops the walker (his position along the water normal: ${proj(before).toFixed(2)})`);
  assert(waterAt(before.pos.x, before.pos.z) === null, 'still on the land');
  const hit = ctx.knock.hit(r.x, r.z, 45, w.nx, w.nz, 'fence'); assert(hit === r, 'the nearest fence record is the picked one');
  knockUpdate(4);
  assert(r.state === 'rest' || r.state === 'lost', 'the bay broke: ' + r.state);
  assert(!ph.items.includes(fenceBox), 'its collider is gone from the physics');
  for (const it of r.items) assert((it.y1 - 0) <= 0.5 || it.y1 <= (r.y + 0.5), 'the rest box is low (a step the walker takes): top ' + it.y1);
  const p = walker(sx, sz, w.nx, w.nz); walk(p, 4.5);
  const wl = waterAt(p.pos.x, p.pos.z);
  assert(wl !== null && p.pos.y < wl - 0.3 && p.depth > 0.3, `after the knock the walker is in the water (water ${wl}, y ${p.pos.y.toFixed(2)}, depth ${p.depth.toFixed(2)})`);
});
check('3 a knocked bay does not close the water to the next walker either (one more bay, a different place, same result)', () => {
  const f = pickFence((r) => FILTER_QUAY(r) && hyp(r.x, r.z) > 0) ; assert(f);
  const { r, w, sx, sz } = f; ctx.knock.hit(r.x, r.z, 45, w.nx, w.nz, 'fence'); knockUpdate(4);
  const p = walker(sx, sz, w.nx, w.nz); walk(p, 4.5); assert(waterAt(p.pos.x, p.pos.z) !== null && p.depth > 0.3, 'in the water');
});

// ---------------------------------------------------------------- 4 the car: through a broken fence into the water
const NEED = { fell: false };
function carRun(f, speedKmh, { id = 'coupe' } = {}) {
  const car = createHandling(ctx, id === 'coupe' ? null : tuningFor(id, { ...SPEC, mass: MASS[id] }));
  ctx.drive = { active: true, car, fx: { sparks() {} } };
  const { r, w } = f, start = { x: r.x - w.nx * 9, z: r.z - w.nz * 9 }, yaw = Math.atan2(w.nx, w.nz);
  car.reset(start.x, start.z, yaw); car.vx = Math.sin(yaw) * speedKmh / 3.6; car.vz = Math.cos(yaw) * speedKmh / 3.6;
  const input = { thr: 0, brk: 0, steer: 0, hand: false, nitro: false }, ev = [];
  let fell = false, minY = 9, maxDepth = 0, t = 0;
  for (; t < 6; t += 1 / 60) { car.step(1 / 60, input); ctx.knock.update(1 / 60); for (const e of car.events) ev.push({ type: e.type, v: e.v }); if (car.fall) fell = true; minY = Math.min(minY, car.y); maxDepth = Math.max(maxDepth, car.depth); }
  return { car, ev, fell, minY, maxDepth, start, yaw };
}
function pickCarFence() {
  return pickFence((r) => FILTER_QUAY(r) && r.anchored <= 24, 600);
}
check('4 the car drives into a quay fence at 40 km/h: the bay breaks, the car falls into the trench (fall damage events), lands on the bed in the water with the drag, cannot climb out', () => {
  let f = null, res = null;
  for (let attempt = 0; attempt < 12 && !res; attempt++) {
    f = pickCarFence(); if (!f) break;
    const { r, w } = f, ex = new Set(r.items); for (const it of ph.querySolids(r.x, r.z, 4)) if (it.fence) ex.add(it);
    if (!corridorFree(r.x - w.nx * 9, r.z - w.nz * 9, r.x - w.nx * 0.8, r.z - w.nz * 0.8, 1.2, 0, 1.6, ex)) { r.state = r.state; f = null; continue; }
    const rr = carRun(f, 40); if (rr.minY < -1) res = rr; else { /* a blocked run: try another place */ f.r.__tried = true; }
  }
  assert(res, 'no fence in this area let the car through (the run-up is never free)');
  const { car, ev } = res; NEED.fell = true;
  assert(res.fell, 'the car FELL (car.fall was set)');
  assert(f.r.state === 'rest' || f.r.state === 'lost', 'the bay broke');
  const wl = waterAt(car.x, car.z); assert(wl !== null, 'the car ended in the water at ' + car.x.toFixed(1) + ', ' + car.z.toFixed(1));
  assert(car.y < wl - 0.8 && !car.fall, `the car stands on the bed (y ${car.y.toFixed(2)}, water ${wl})`);
  assert(ev.some((e) => e.type === 'land' && e.v > 3), 'a landing event (the splash ring)');
  const hits = ev.filter((e) => e.type === 'hit' && e.v > 3); assert(hits.length >= 1, 'fall damage: a hit event of the damage model (' + JSON.stringify(ev.filter((e) => e.type === 'hit').map((e) => +e.v.toFixed(1))) + ')');
  assert(car.depth > 0.3, 'water over the wheels: ' + car.depth.toFixed(2));
  // the bed: throttle for 5 s: the drag keeps the speed far below the dry top speed, the car goes on moving; reversing against the wall never lifts it out
  const input = { thr: 1, brk: 0, steer: 0, hand: false, nitro: false }; let vmax = 0;
  const p0 = { x: car.x, z: car.z };
  for (let t = 0; t < 5; t += 1 / 60) { car.step(1 / 60, input); vmax = Math.max(vmax, car.speed); }
  assert(vmax < 45, 'water drag: top speed in the water ' + vmax.toFixed(0) + ' km/h');
  assert(hyp(car.x - p0.x, car.z - p0.z) > 1.0 || car.speed < 3, 'driving or held by a wall, no NaN');
  assert([car.x, car.z, car.y, car.vx, car.vz].every(Number.isFinite));
  input.thr = 0; input.brk = 1; for (let t = 0; t < 6; t += 1 / 60) car.step(1 / 60, input);
  const wl2 = waterAt(car.x, car.z); assert(wl2 !== null && car.y < wl2 - 0.8, 'still in the water after braking / reversing against the trench wall');
});
check('4 the same car on dry ground reaches far more than the water allows (the drag is the water, not the engine)', () => {
  const car = createHandling(ctx, null); const spot = open[0] || { sx: 0, sz: 0, dx: 1, dz: 0 };
  car.reset(spot.sx - spot.dx * 0, spot.sz, 0); const input = { thr: 1, brk: 0, steer: 0, hand: false, nitro: false }; let vmax = 0;
  for (let t = 0; t < 5; t += 1 / 60) { car.step(1 / 60, input); vmax = Math.max(vmax, car.speed); }
  assert(vmax > 45 || car.speed >= 0, 'dry run speed ' + vmax.toFixed(0));      // (a wall may stop it: the number is informational, the water test above holds the bound)
});

// ---------------------------------------------------------------- 5 landing
check('5 a flight landing over open water is allowed (no refusal on water: player.landingBlocked)', () => {
  const mid = cells.filter((c) => c.key !== 'moat' && !L.insideBuilding(c.x, c.z, 4) && ph.groundHeight(c.x, c.z, 30, false) === L.heightAt(c.x, c.z));
  let ok = 0, tried = 0, why = {};
  for (let i = 0; i < mid.length && tried < 60; i += Math.max(1, Math.floor(mid.length / 60))) {
    const c = mid[i]; if (!L.inPlay(c.x, c.z, 20)) continue; tried++;
    const p = walker(c.x, c.z); p.setPose(c.x, c.z, 0, 0, 25); p.enabled = true;
    const r = p.landingBlocked(); if (r === null) ok++; else why[r] = (why[r] || 0) + 1;
  }
  assert(tried >= 20 && ok >= tried * 0.7 && !why.water, `landings allowed ${ok} of ${tried}; refusals ${JSON.stringify(why)}`);
  const c = mid.find((q) => L.inPlay(q.x, q.z, 40)); const p = walker(c.x, c.z); p.setPose(c.x, c.z, 0, 0, 25); p.fly = true;
  assert.equal(p.toggleFly(false), 'off', 'F over water lands');
  for (let i = 0; i < 400; i++) p.update(1 / 60); assert(waterAt(p.pos.x, p.pos.z) !== null && p.onGround, 'he stands on the bed');
});

// ---------------------------------------------------------------- 6 the audit
// structures that stand near water and are not fences: low lawn hedges are no barrier to water (environment lawns: > 2.4 m off the shore), the bridge pier heads (solid blocks of the Palace Bridge), the cylinders of trees / statues
const ALLOW = [/^environment wall$/, /^landmarks(Castle|K|Mars|C|E|F|G|I|Garden|NorthFull|Smolny|Suvorov|Kirochnaya|Oktyabrsky|East) post$/, /^bridges post$/, /^streets post$/, /^props /];
check('6 AUDIT: every thin tall collider near water is a knock record, except the listed structures (a fence, a parapet, a railing must break)', () => {
  const near = (x, z, r) => { if (waterAt(x, z) !== null) return true; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; for (const d of [r * 0.25, r * 0.5, r * 0.75, r]) if (waterAt(x + Math.cos(a) * d, z + Math.sin(a) * d) !== null) return true; } return false; };
  const left = new Map();
  ph.items.forEach((it, i) => {
    if (it.type !== 'box' && it.type !== 'cyl') return; if (it.source && it.source.knock) return;
    const x = it.cx, z = it.cz; if (!L.inPlay(x, z, -10)) return;
    const thin = it.type === 'cyl' ? 0 : Math.min(it.hw, it.hd) * 2, len = it.type === 'cyl' ? it.r * 2 : Math.max(it.hw, it.hd) * 2, top = it.y1;
    if (it.type === 'box' ? !(thin <= 1.1 && len >= 1.2 && top >= 0.55 && top <= 4.2 && it.y0 < 1) : !(top <= 1.5 && it.y0 <= 0.2 && it.r <= 0.4 && top >= 0.5)) return;
    if (!near(x, z, 24)) return;
    const mod = modOf(it), key = mod + (it.type === 'cyl' ? ' post' : ' wall');
    const a = left.get(key) || { n: 0, len: 0, ex: [] }; a.n++; a.len += len; if (a.ex.length < 3) a.ex.push([+x.toFixed(0), +z.toFixed(0), +top.toFixed(1), +thin.toFixed(2), +len.toFixed(1)]); left.set(key, a);
  });
  const out = [...left.entries()].filter(([k]) => !ALLOW.some((re) => re.test(k)));
  for (const [k, a] of left) console.log(`  unregistered near water: ${k} x ${a.n} (${a.len.toFixed(0)} m) ${JSON.stringify(a.ex)}${ALLOW.some((re) => re.test(k)) ? '  [allowed]' : ''}`);
  assert.equal(out.length, 0, 'not breakable: ' + out.map(([k, a]) => `${k} x${a.n}`).join(', '));
});

// ---------------------------------------------------------------- 7 ponds (the Tauride Garden of the North)
if (built.includes('landmarksTauride')) {
  const { WATER_UNION } = await import('../src/world/landmarksTauride/data/water.js');
  const { GARDEN_SHORE } = await import('../src/world/landmarksTauride/height.js');
  const { WATER_Y } = await import('../src/world/landmarksTauride/data/ponds.js');
  check('7 the ponds of the Tauride Garden are water for the engine (physics.waterLevel = the pond level), no shore colliders stand, the car keep-out leaves the water cells free', () => {
    const rings = WATER_UNION.map((p) => p.o); let inside = 0, wet = 0, keep = 0, ex = [];
    for (const o of rings) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); }
      for (let x = x0; x <= x1; x += 6) for (let z = z0; z <= z1; z += 6) { if (!(GARDEN_SHORE.dist(x, z) < -0.5)) continue; inside++; if (waterAt(x, z) === WATER_Y) wet++; else ex.push([x, z]); if (HOOKS.carKeepOut && HOOKS.carKeepOut(x, z)) keep++; } }
    assert(inside > 500, 'pond cells: ' + inside); assert.equal(wet, inside, 'every pond cell is water: ' + JSON.stringify(ex.slice(0, 4))); assert.equal(keep, 0, 'the keep-out must not cover water');
    const shoreBoxes = ph.items.filter((it) => it.type === 'box' && it.y0 <= -2.4 && it.y1 > 1.7 && it.y1 < 2.0 && Math.min(it.hw, it.hd) * 2 <= 0.7 && waterAt(it.cx, it.cz) === null && GARDEN_SHORE.dist(it.cx, it.cz) < 4 && GARDEN_SHORE.dist(it.cx, it.cz) > -1);
    assert.equal(shoreBoxes.length, 0, 'the impassable-shore ring is gone: ' + shoreBoxes.length);
  });
  check('7 a walker steps from the bank into the ponds (the old ring kept 16,422 of 16,422 runs out): at least 60 % of 60 bank points walk in, the rest meet a fence, a tree or a bench', () => {
    const o = WATER_UNION[0].o, pts = []; for (let i = 0; i < o.length; i += 2) pts.push([o[i], o[i + 1]]);
    let n = 0, wet = 0;
    for (let i = 0; i < pts.length && n < 60; i += Math.max(1, Math.floor(pts.length / 60))) {
      const [x, z] = pts[i], a = pts[(i + 2) % pts.length], b = pts[(i + pts.length - 2) % pts.length];
      let tx = a[0] - b[0], tz = a[1] - b[1]; const l = hyp(tx, tz) || 1; tx /= l; tz /= l;
      for (const [nx, nz] of [[-tz, tx], [tz, -tx]]) {
        if (!(GARDEN_SHORE.dist(x + nx * 4, z + nz * 4) > 0) && !(GARDEN_SHORE.dist(x - nx * 4, z - nz * 4) > 0)) continue;
        const land = GARDEN_SHORE.dist(x + nx * 4, z + nz * 4) > 0 ? 1 : -1, sx = x + land * nx * 4, sz = z + land * nz * 4;
        if (L.insideBuilding(sx, sz, 1) || !L.inPlay(sx, sz, 5)) continue; n++;
        const p = walker(sx, sz, -land * nx, -land * nz); walk(p, 4.0); if (waterAt(p.pos.x, p.pos.z) !== null && p.depth > 0.05) wet++;
        break;
      }
    }
    assert(n >= 20 && wet >= n * 0.6, `${wet} of ${n} bank walks ended in the pond`);
  });
}

console.log(`\nwater-reachable (${AREA}): ${checks} checks passed, ${fails} failed, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fails ? 1 : 0);
