// t8a-test.mjs - T8a of the Tauride remake: the three bugs of the owner, each with a check that FAILS without its fix (a mutant of the input or of the build turns it red).
//   node tools/area.mjs north tools/tauride/t8a-test.mjs [--no-built]        --no-built skips the part that builds environment + module + streets + city (the ray tests on real meshes, ~3 min)
//   --quick skips the second city build (the mutant without the hook)
// 1. the z-fight on the floor at the west gate (paths-draped.js overlapLevels): two ways of one class that overlap are no longer coplanar (the plan: the 11 gate zones and the whole garden; the built meshes:
//    rays from above through the built environment + module + streets over the gate zones).
// 2. the transparent roof (city/roofs.js addDeck + HOOKS.deckUnderside): from below, the deck of every garden footprint is a face that a viewer sees (a ray going up hits it), from above it is still the top.
// 3. the plate 'Сергей Есенин' on Yesenin's pedestal (monuments.js plateSpec / plateGeometry / paintPlate): it exists, faces the alley, its text is exactly that, one draw, proud of the face by a few mm.
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const args = new Set(process.argv.slice(2));
let failed = 0, total = 0;
const ok = (name, cond, detail = '') => { total++; if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`); };

const SE = await imp('tools/tauride/lib/stub-env.mjs');
const RO = await imp('tools/tauride/lib/ribbon-overlap.mjs');
const eng = await SE.loadEngine(ROOT);
const { THREE } = eng;
const GH = await imp('src/world/landmarksTauride/height.js'), TM = await imp('src/world/landmarksTauride/terrain-mesh.js'), PD = await imp('src/world/landmarksTauride/paths-draped.js');
const Pd = await imp('src/world/landmarksTauride/data/paths.js'), Fu = await imp('src/world/landmarksTauride/data/furniture.js'), Fo = await imp('src/world/landmarksTauride/data/footprints.js');
const FD = await imp('src/world/landmarksTauride/data/furniture-design.js'), MO = await imp('src/world/landmarksTauride/monuments.js'), AT = await imp('src/world/lib/area-tables.js');
const HD = await imp('src/areas/north/hooks/decks.js'), HK = await imp('src/areas/north/hooks.js'), A = await imp('src/areas/north/area.js');
const RF = await imp('src/world/city/roofs.js'), MS = await imp('src/world/lib/massing.js');

// ================================================================= 1. the alleys: no two ways of one class in one plane
console.log('1. the draped alleys: overlapping ways are not coplanar (west gate z-fight)');
const tplan = TM.planTerrain(GH.gardenHeight, GH.RELIEF_BOX, TM.floorOptions()), meshHeight = TM.makeMeshHeight(tplan);
const ground = { meshHeight, gh: GH.gardenHeight };
const ids = Pd.PATHS.filter((p) => p.cls !== 'bridge' && p.cls !== 'steps').map((p) => p.id);
const plan = PD.planPaths(Pd.PATHS, ground), old = PD.planPaths(Pd.PATHS, ground, { ...PD.PATHS_DRAPED, levelStep: 0 });
const gateBox = (g, r = 12) => [g.x - r, g.x + r, g.z - r, g.z + r];
{
  const west = Fu.GATES.find((g) => g.id === 'n950150459');
  const mWest = RO.coplanarOverlap(old, ids, { box: gateBox(west) }), sWest = RO.coplanarOverlap(plan, ids, { box: gateBox(west) });
  ok('the west gate (n950150459): without the levels the south alley w1051226582 and the main alley w81524425 lie in ONE plane over >= 8 m2 (the MUTANT, levelStep 0)', mWest.area >= 8 && mWest.pairs.has('w1051226582 x w81524425'), `${mWest.area.toFixed(1)} m2: ${[...mWest.pairs].map(([k, v]) => k + ' ' + v.n).join(', ')}`);
  ok('the west gate with the levels: no two ways in one plane (0.1 mm) in the 24 m zone', sWest.samples === 0, `${sWest.area.toFixed(2)} m2`);
  let worst = 0, mutantGates = 0; const rows = [];
  for (const g of Fu.GATES) {
    const m = RO.coplanarOverlap(old, ids, { box: gateBox(g) }), s = RO.coplanarOverlap(plan, ids, { box: gateBox(g) });
    worst = Math.max(worst, s.area); if (m.area > 0) mutantGates++; rows.push(`${g.id} ${m.area.toFixed(1)} -> ${s.area.toFixed(1)}`);
  }
  ok(`all ${Fu.GATES.length} gate zones (24 x 24 m round each gate node): at most 0.5 m2 in one plane (the crossing lines of two ribbons that meet at an angle), the mutant has some at ${mutantGates} gates`, worst <= 0.5 && mutantGates >= 2, rows.join('; '));
  const all = RO.coplanarOverlap(plan, ids, {}), allOld = RO.coplanarOverlap(old, ids, {});
  ok('the whole garden: the area of two different ways in one plane falls from the mutant\'s to under a tenth of it (what remains: the crossing lines)', allOld.area > 100 && all.area < 0.1 * allOld.area, `${allOld.area.toFixed(0)} m2 -> ${all.area.toFixed(1)} m2`);
  ok('the levels: at most 5 (0 .. 4), none over the limit, +0.4 mm each: the class order (main over side over trail by 2 mm) is kept', plan.stats.levels <= 5 && plan.stats.levelOverflow === 0 && PD.PATHS_DRAPED.levelStep * PD.PATHS_DRAPED.levelMax < 0.002, `levels ${plan.stats.levels}, overflow ${plan.stats.levelOverflow}, neighbours ${plan.stats.levelNeighbours}`);
  // the draping is intact: every vertex of a way is the mesh height + 0.03 + the class bias + its level
  let bad = 0, n = 0; const R = plan.ribbons, byIndex = new Map(plan.ways.map((w) => [w.index, w]));
  for (let v = 0; v < R.wayOf.length; v += 7) { const w = byIndex.get(R.wayOf[v]); if (!w) continue; const x = R.pos[3 * v], z = R.pos[3 * v + 2], y = R.pos[3 * v + 1]; const h = meshHeight(x, z) ?? GH.gardenHeight(x, z) ?? 0; const e = y - h - 0.03 - (PD.PATHS_DRAPED.classBias[w.cls] || 0) - w.level * PD.PATHS_DRAPED.levelStep; n++; if (Math.abs(e) > 0.05) bad++; }
  ok('the ribbons are still draped on the floor (every 7th vertex within 5 cm of mesh + 3 cm + bias + level: the 1.4 cm chord rule and the corner heights)', bad === 0, `${n} vertices, ${bad} off`);
  ok('deterministic: two plans have the same bytes', Buffer.compare(Buffer.from(PD.planPaths(Pd.PATHS, ground).ribbons.pos.buffer), Buffer.from(plan.ribbons.pos.buffer)) === 0);
  ok('the triangle count of the ribbons does not change (the fix moves vertices by 0 .. 1.6 mm)', plan.stats.ribbonTriangles === old.stats.ribbonTriangles, `${plan.stats.ribbonTriangles}`);
}

// ================================================================= the real build (environment + module + streets + city)
let ctx = null, ctx2 = null;
const modules = ['environment', 'landmarksTauride', 'streets', 'city'];
const buildCtx = async (list) => { const { ctx: c } = SE.makeContext(eng, list); for (const n of list) await SE.buildModules(eng, c, [n]); return c; };
const meshesOf = (c) => { const out = []; c.staticRoot.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.geometry.getAttribute('position')) { o.updateWorldMatrix(true, false); out.push(o); } }); return out; };
const rc = new THREE.Raycaster(); rc.layers.enableAll();
const wb = new THREE.Box3();
const near = (meshes, x0, x1, z0, z1) => meshes.filter((m) => { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); wb.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); return wb.max.x >= x0 && wb.min.x <= x1 && wb.max.z >= z0 && wb.min.z <= z1; });
if (!args.has('--no-built')) {
  console.log('1b. the built meshes over the gate zones');
  ctx = await buildCtx(modules);
  const meshes = meshesOf(ctx);
  const ALLOWED = [/^tauride-terrain/, /^env-ground/];       // the T3 floor is lifted 5 mm over the environment ground at the outline (equal polygon offset 2): by design; env-ground / env-ground-super: the engine's own (near chunks / far cells)
  let worstRib = 0, other = []; let rays = 0;
  for (const g of Fu.GATES) {
    const [x0, x1, z0, z1] = gateBox(g), mine = near(meshes, x0, x1, z0, z1); let rib = 0;
    for (let x = x0; x <= x1; x += 1) for (let z = z0; z <= z1; z += 1) {
      rc.set(new THREE.Vector3(x + 0.013, 80, z + 0.007), new THREE.Vector3(0, -1, 0)); rc.near = 0; rc.far = 200; rays++;
      const hits = rc.intersectObjects(mine, false).filter((h) => { const m = h.object.material; return !/treeblob/.test(h.object.name) && !(m.transparent && (m.opacity ?? 1) < 0.9); }).sort((a, b) => b.point.y - a.point.y);
      for (let i = 0; i + 1 < hits.length; i++) for (let j = i + 1; j < hits.length; j++) {
        const d = hits[i].point.y - hits[j].point.y; if (d > 0.01) break;
        const a = hits[i].object, b = hits[j].object;
        if (a === b && hits[i].faceIndex === hits[j].faceIndex) continue;
        if (a.name === 'tauride-paths-ribbons' && b === a) { if (d < 1e-4) rib++; continue; }
        if (!(/^tauride-/.test(a.name) || /^tauride-/.test(b.name))) continue;       // pairs of the streets / the environment alone are the strip's own (pt-gutter over pt-asphalt by 1 cm ...)
        const byDesign = (ALLOWED[0].test(a.name) && ALLOWED[1].test(b.name)) || (ALLOWED[1].test(a.name) && ALLOWED[0].test(b.name));
        if (!byDesign) other.push(`${g.id} ${a.name}|${b.name} dy ${d.toFixed(4)} at ${hits[i].point.x.toFixed(1)},${hits[i].point.z.toFixed(1)}`);
      }
    }
    worstRib = Math.max(worstRib, rib);
  }
  ok(`built ribbons over the ${Fu.GATES.length} gate zones (${rays} rays of 1 m): no two ribbon triangles in one plane (0.1 mm) on more than 3 rays per gate`, worstRib <= 3, `worst ${worstRib}`);
  ok('built module meshes over the gate zones: no other opaque surface of the module within 1 cm of another (the floor over the environment ground at the outline by 5 mm is the design)', other.length === 0, other.slice(0, 6).join(' | ') + (other.length > 6 ? ` ... ${other.length}` : ''));

  // the pitch and the play surfaces (tauride-play: the turf, the rubber / sand surfaces, the fitness pad) lie over the ribbons of the alleys that end at their gates: a ribbon must not be in the plane of any of them
  {
    const Cd = await imp('src/areas/north/data/city.js'), mp = MO.planMonuments({ GREEN: Cd.GREEN, stairs: [], orangeryRing: null });
    const boxes = []; const ringBox = (o, m = 3) => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (let i = 0; i < o.length; i += 2) { a = Math.min(a, o[i]); b = Math.max(b, o[i]); c = Math.min(c, o[i + 1]); d = Math.max(d, o[i + 1]); } return [a - m, b + m, c - m, d + m, o]; };
    boxes.push(['pitch', ...ringBox(mp.pitch.ring)]); for (const q of mp.playgrounds) boxes.push([q.id, ...ringBox(q.ring)]); for (const q of mp.fitness) boxes.push([q.id, ...ringBox(q.ring)]);
    const bad = []; let n = 0;
    for (const [id, x0, x1, z0, z1] of boxes) {
      const mine = near(meshes, x0, x1, z0, z1);
      for (let x = x0; x <= x1; x += 1) for (let z = z0; z <= z1; z += 1) {
        rc.set(new THREE.Vector3(x + 0.013, 80, z + 0.007), new THREE.Vector3(0, -1, 0)); rc.near = 0; rc.far = 200; n++;
        const hits = rc.intersectObjects(mine, false).filter((h) => h.object.name === 'tauride-play' || h.object.name === 'tauride-paths-ribbons').sort((a, b) => b.point.y - a.point.y);
        for (let i = 0; i + 1 < hits.length; i++) for (let j = i + 1; j < hits.length; j++) { const d = hits[i].point.y - hits[j].point.y; if (d > 0.008) break; if (hits[i].object !== hits[j].object) bad.push(`${id} ${hits[i].object.name}|${hits[j].object.name} dy ${d.toFixed(4)} at ${x},${z}`); }
      }
    }
    ok(`the ribbons and the play surfaces (the pitch turf, ${mp.playgrounds.length} playgrounds, the fitness pad: ${n} rays of 1 m): never within 8 mm of each other (the pitch turf was 0 .. 3 mm from the ribbons at its gates)`, bad.length === 0, bad.slice(0, 5).join(' | ') + (bad.length > 5 ? ` ... ${bad.length}` : ''));
  }
}

// ================================================================= 2. the roof decks of the garden's buildings
console.log('2. the decks of the garden footprints (HOOKS.deckUnderside)');
{
  const H = A.HOOKS;
  ok('the North page has the hook (a function) and the strip\'s area module does not: HOOKS = {}', typeof H.deckUnderside === 'function' && typeof AT.HOOKS.deckUnderside === 'function');
  const stripText = (await import('node:fs')).readFileSync(path.join(ROOT, 'src/world/area.js'), 'utf8');
  ok('the strip area module (src/world/area.js) has HOOKS = {} and no deckUnderside', /export const HOOKS\s*=\s*\{\s*\}/.test(stripText) && !/deckUnderside/.test(stripText));
  ok('the hook is undefined unless MODULES has landmarksTauride (dormant), and answers true for the 13 footprints\' decks', HD.makeDeckUnderside(['city']) === undefined && Fo.FOOTPRINTS.every((f) => f.polys.every((p) => H.deckUnderside({ o: p.o, h: p.h || [] }) === true)));
  ok('... and false for a far building (the strip\'s Nevsky) and a deck on the palace', H.deckUnderside({ o: [0, 0, 10, 0, 10, 10, 0, 10], h: [] }) === false && H.deckUnderside({ o: [1370, -1740, 1390, -1740, 1390, -1725, 1370, -1725], h: [] }) === false);
  // addDeck, unit: with the hook the deck gets a second cap (down, 1 cm lower, darker); without it (HOOKS.deckUnderside deleted) it is byte-identical to a plain addCap
  const poly = { o: [1110.3, -1460.4, 1110, -1456.2, 1112.3, -1456, 1111.6, -1447.5, 1109.3, -1447.7, 1109.1, -1445.3, 1101.6, -1445.9, 1102.8, -1461], h: [] };
  const mk = () => { const B = new RF.RoofBuilder(); B.cur = new THREE.Color('#9ba0a3'); B.col = []; const v = B.vert.bind(B); B.vert = (...a) => { B.col.push(B.cur.r, B.cur.g, B.cur.b); return v(...a); }; return B; };
  const withHook = mk(); RF.addDeck(withHook, poly, 6.0);
  const saved = AT.HOOKS.deckUnderside; delete AT.HOOKS.deckUnderside;
  const without = mk(); RF.addDeck(without, poly, 6.0); const plain = mk(); MS.addCap(plain, poly, 6.0, { uvScale: 1.2 });
  AT.HOOKS.deckUnderside = saved;
  const tris = (B) => B.idx.length / 3, nyOf = (B, t) => { const i = B.idx.slice(3 * t, 3 * t + 3).map((k) => [B.pos[3 * k], B.pos[3 * k + 1], B.pos[3 * k + 2]]); return (i[1][2] - i[0][2]) * (i[2][0] - i[0][0]) - (i[1][0] - i[0][0]) * (i[2][2] - i[0][2]); };
  ok('addDeck without the hook is the old addCap: the same positions, normals, indices (the strip does not change)', without.pos.length === plain.pos.length && without.pos.every((v, i) => v === plain.pos[i]) && without.idx.every((v, i) => v === plain.idx[i]) && without.nrm.every((v, i) => v === plain.nrm[i]), `${tris(without)} triangles`);
  const nTop = tris(plain);
  ok('addDeck with the hook: the top cap as before plus an underside of the same triangles, facing down, 1 cm lower, in 0.6 of the roof colour; B.cur restored', tris(withHook) === 2 * nTop && [...Array(nTop).keys()].every((t) => nyOf(withHook, t) > 0 && nyOf(withHook, nTop + t) < 0) && Math.abs(withHook.pos[3 * (plain.n) + 1] - 5.99) < 1e-6 && withHook.col[3 * plain.n] < 0.7 * withHook.col[0] && Math.abs(withHook.cur.r - new THREE.Color('#9ba0a3').r) < 1e-9, `${nTop} + ${nTop}`);
}
if (!args.has('--no-built')) {
  const H = A.HOOKS;
  const cover = (c, label) => {
    const meshes = meshesOf(c), res = [];
    for (const f of Fo.FOOTPRINTS) for (const p of f.polys) {
      const o = p.o; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); }
      const mine = near(meshes, x0, x1, z0, z1); let n = 0, below = 0, above = 0, deckY = null;
      const inP = (x, z) => { let k = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if ((o[i + 1] > z) !== (o[j + 1] > z) && x < (o[j] - o[i]) * (z - o[i + 1]) / (o[j + 1] - o[i + 1]) + o[i]) k = !k; return k; };
      const dist = (x, z) => { let m = 1e9; for (let i = 0; i < o.length; i += 2) { const j = (i + 2) % o.length, ax = o[i], az = o[i + 1], dx = o[j] - ax, dz = o[j + 1] - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)); m = Math.min(m, Math.hypot(x - ax - t * dx, z - az - t * dz)); } return m; };
      for (let x = x0; x <= x1; x += 0.7) for (let z = z0; z <= z1; z += 0.7) {
        if (!inP(x, z) || dist(x, z) < 0.6) continue; n++;
        rc.set(new THREE.Vector3(x, 80, z), new THREE.Vector3(0, -1, 0)); rc.near = 0; rc.far = 200;
        const dn = rc.intersectObjects(mine, false).filter((h) => h.object.name === 'city-roofs' && h.point.y > 2.5);
        if (dn.length) { above++; deckY = dn[0].point.y; }
        rc.set(new THREE.Vector3(x, 0.4, z), new THREE.Vector3(0, 1, 0)); rc.near = 0; rc.far = 60;
        const up = rc.intersectObjects(mine, false).filter((h) => h.object.name === 'city-roofs' && h.point.y > 2.5);
        if (up.length) below++;
      }
      if (n >= 3) res.push({ id: f.id, n, above, below, deckY });
    }
    console.log(label + ': ' + res.map((r) => `${r.id} ${r.below}/${r.n} below ${r.above}/${r.n} above y ${r.deckY?.toFixed(2)}`).join('; '));
    return res;
  };
  const with_ = cover(ctx, 'with the hook');
  const pav = with_.filter((r) => r.id === 'w420650670');
  ok('the 13 footprints: every one has deck samples; seen from ABOVE the deck is there as before (>= 90 % of the samples), seen from BELOW (a ray going up: only faces that look at the ray count) it is there too (>= 90 %)', with_.length >= 11 && with_.every((r) => r.above >= 0.9 * r.n || r.n < 6) && with_.every((r) => r.below >= 0.9 * r.n || r.n < 6), `${with_.length} polygons: ${with_.filter((r) => r.below < 0.9 * r.n && r.n >= 6).map((r) => r.id)} lacking`);
  ok('the pavilion w420650670 (the owner\'s pose 1100.4, 1.5, -1444.7): both views', pav.length === 1 && pav[0].below >= 0.9 * pav[0].n && pav[0].above >= 0.9 * pav[0].n, JSON.stringify(pav[0]));
  if (!args.has('--quick')) {
  // the mutant: the same city built without the hook
  const saved = AT.HOOKS.deckUnderside; delete AT.HOOKS.deckUnderside;
  ctx2 = await buildCtx(['environment', 'landmarksTauride', 'streets', 'city']);
  AT.HOOKS.deckUnderside = saved;
  const without = cover(ctx2, 'MUTANT without the hook');
  const pav2 = without.filter((r) => r.id === 'w420650670');
  ok('MUTANT: without the hook the pavilion\'s roof is not seen from below (0 of the samples), the top is', pav2.length === 1 && pav2[0].below === 0 && pav2[0].above >= 0.9 * pav2[0].n, JSON.stringify(pav2[0]));
  const trisOf = (c) => { let t = 0; c.staticRoot.traverse((o) => { if (o.isMesh && o.name === 'city-roofs') t += o.geometry.index.count / 3; }); return t; };
  ok('cost of the underside: a few triangles in city-roofs', trisOf(ctx) - trisOf(ctx2) > 0 && trisOf(ctx) - trisOf(ctx2) < 400, `${trisOf(ctx2)} -> ${trisOf(ctx)} (+${trisOf(ctx) - trisOf(ctx2)})`);
  }
}

// ================================================================= 3. the plate on Yesenin's pedestal
console.log('3. the inscription plate of Yesenin (monuments.js)');
{
  const text = 'Сергей Есенин';
  const want = [0x421, 0x435, 0x440, 0x433, 0x435, 0x439, 0x20, 0x415, 0x441, 0x435, 0x43d, 0x438, 0x43d];
  const cps = [...FD.YESENIN.plate.text].map((c) => c.codePointAt(0));
  ok('the text of the plate is exactly "Сергей Есенин" (13 code points: С е р г е й, space, Е с е н и н; no mojibake)', cps.length === want.length && cps.every((c, i) => c === want[i]) && FD.YESENIN.plate.text === text, cps.map((c) => c.toString(16)).join(' '));
  const pl = await imp('src/world/landmarksTauride/groups.js');
  const mplan = MO.planMonuments({ GREEN: (await imp('src/areas/north/data/city.js')).GREEN, stairs: [], orangeryRing: null });
  const y = mplan.yesenin, P = y.plate;
  ok('the plan has the plate on Yesenin\'s pedestal and not on Chaikovsky\'s', !!P && !mplan.chaikovsky.plate && P.text === text, JSON.stringify({ w: P?.w, h: P?.h, y0: P?.y0 }));
  const dir = [y.face.x - y.x, y.face.z - y.z], dl = Math.hypot(...dir), ang = Math.acos(Math.max(-1, Math.min(1, (P.normal[0] * dir[0] + P.normal[2] * dir[1]) / dl))) * 180 / Math.PI;
  ok('the plate\'s normal (sin rotY, 0, cos rotY) faces the alley point the pedestal looks at within 5 degrees', ang <= 5 && y.face && dl > 0.5, `${ang.toFixed(2)} deg, the alley point ${dl.toFixed(1)} m away`);
  ok('the plate sits on the shaft: inside its width and height, 8 mm proud of the front face, above the base and under the cornice', P.w < FD.YESENIN.pedestal.w && P.y0 >= FD.YESENIN.pedestal.baseH && P.y1 <= FD.YESENIN.pedestal.baseH + FD.YESENIN.pedestal.h && Math.abs(P.proud - 0.008) < 1e-9 && P.zFace === FD.YESENIN.pedestal.d / 2, `y ${P.y0.toFixed(3)}..${P.y1.toFixed(3)} on ${FD.YESENIN.pedestal.baseH}..${FD.YESENIN.pedestal.baseH + FD.YESENIN.pedestal.h}`);
  // the geometry: world normal of the front face from the triangles, and the distance to the pedestal's face
  const { GB } = await imp('src/world/landmarksTauride/fence.js'); const g = new GB(); const nt = MO.plateGeometry(g, P);
  const pos = g.P, idx = g.I; let front = null;
  for (let t = 0; t < idx.length; t += 3) { const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]].map((i) => [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]]); const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const l = Math.hypot(...n); const nn = n.map((q) => q / l); if (Math.abs(nn[1]) < 0.01 && nn[0] * P.normal[0] + nn[2] * P.normal[2] > 0.999) front = { a, nn }; }
  ok('the geometry: 10 triangles (the painted front + the four edges), the front quad\'s normal from its winding is the plan\'s normal within 1 degree and its plane is 8 mm in front of the shaft face', nt === 10 && front && Math.acos(Math.min(1, front.nn[0] * P.normal[0] + front.nn[2] * P.normal[2])) * 180 / Math.PI < 1 && Math.abs(((front.a[0] - y.x) * P.normal[0] + (front.a[2] - y.z) * P.normal[2]) - (FD.YESENIN.pedestal.d / 2 + 0.008)) < 1e-6, `${nt} triangles`);
  // the painter: a recording 2d context: the strings drawn are exactly the text, in three passes (shade, light edge, fill), on one canvas size
  const drawn = [], rec = new Proxy({ font: '', measureText: (t) => ({ width: t.length * 20 }) }, { get(t, k) { if (k in t) return t[k]; if (k === 'fillText') return (s) => drawn.push(s); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
  MO.paintPlate(rec, FD.YESENIN.plate.tw, FD.YESENIN.plate.th, FD.YESENIN.plate);
  ok('paintPlate draws the text exactly (3 passes: shade, light edge, gold), nothing else is written', drawn.length === 3 && drawn.every((s) => s === text), JSON.stringify(drawn));
  ok('one small texture: 512 x 132 px', FD.YESENIN.plate.tw * FD.YESENIN.plate.th <= 512 * 160, `${FD.YESENIN.plate.tw} x ${FD.YESENIN.plate.th}`);
  // the built module: one extra draw (the mesh), named, on the colour layer, with the texture painted at load
  const { ctx: c3 } = SE.makeContext(eng, ['landmarksTauride']); const root = new THREE.Group();
  const built = MO.buildMonuments(c3, root, mplan);
  const plate = built.meshes.filter((m) => m.name === 'tauride-yesenin-plate');
  ok('buildMonuments: exactly one plate mesh with a canvas map, 10 triangles, noBatch, colour layer only, no shadow cast', plate.length === 1 && !!plate[0].material.map && plate[0].geometry.index.count === 30 && plate[0].userData.noBatch === true && (plate[0].layers.mask & 1) === 0 && !plate[0].castShadow && plate[0].userData.plate.text === text, `${plate.length} mesh(es)`);
  const bare = MO.buildMonuments(SE.makeContext(eng, ['landmarksTauride']).ctx, new THREE.Group(), { ...mplan, yesenin: { ...y, plate: null } });
  ok('MUTANT: a plan without the plate builds no plate mesh and one draw fewer', !bare.meshes.some((m) => m.name === 'tauride-yesenin-plate') && built.draws === bare.draws + 1, `${built.draws} draws against ${bare.draws}`);
}
console.log(`\n${failed ? 'FAILED' : 'OK'}: ${total - failed} of ${total} checks`);
process.exit(failed ? 1 : 0);
