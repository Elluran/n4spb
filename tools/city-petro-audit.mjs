// city-petro-audit.mjs - headless report on the ordinary houses of the Petrograd-side extension (district.NEW_REGIONS: P1..P6, V1, V2): what the district-aware grammar decided.
//   every mode takes --region P6 (only the records of that part file)
//   node tools/city-petro-audit.mjs                     archetype mix per district / zone, KNOWN coverage, feature counts (bay windows, gables, turrets, parapets, mansards)
//   node tools/city-petro-audit.mjs --cams NORDIC 6     camera strings for tools/shot.mjs: N street fronts of that archetype (eye level, 3/4 view from across the street)  [--near x,z,r] [--known]
//   node tools/city-petro-audit.mjs --heights           records without levels / height: where the cornice came from (neighbour median, kind default, street default) and suspicious ones
//   node tools/city-petro-audit.mjs --largest 25        the largest unclaimed footprints: kind, name, storeys, archetype, front lengths
//   node tools/city-petro-audit.mjs --site              building=construction records and what is drawn for them
// Runs the city pipeline (prepare -> describe -> analyse -> assignColours -> planPassages -> buildWalls) without meshes, as tools/city-wall-audit.mjs does; landmark modules own their groups.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const argv = process.argv.slice(2), has = (k) => argv.includes('--' + k), val = (k, n = 1) => { const i = argv.indexOf('--' + k); return i < 0 ? null : argv.slice(i + 1, i + 1 + n); };

const { BUILDINGS } = await imp('src/world/data/city.js');
const L = await imp('src/world/layout.js');
const { prepare } = await imp('src/world/city/prep.js');
const { describe, assignColours } = await imp('src/world/city/archetypes.js');
const { analyse } = await imp('src/world/city/edges.js');
const { planPassages } = await imp('src/world/city/passages.js');
const { buildWalls } = await imp('src/world/city/walls.js');
const { ARCH } = await imp('src/world/city/wallmat.js');
const { regionOf, districtOf } = await imp('src/world/city/district.js');
const { knownFor } = await imp('src/world/city/known.js');
const { neighbourStoreys } = await imp('src/world/city/heights.js');
const { isOwned } = await imp('src/world/lib/claims.js');
const NAME = Object.fromEntries(Object.entries(ARCH).map(([k, v]) => [v, k]));

const owned = new Set();
for (const m of L.MODULE_KEYS) { try { const mod = await imp(`src/world/${m}.js`); const o = mod.OWNS_GROUPS; if (o === true) for (const g of L.GROUPS[m]) owned.add(g.key); else if (Array.isArray(o)) for (const k of o) owned.add(k); } catch (e) { /* needs the browser */ } }
const prep = prepare(BUILDINGS, (b) => isOwned(owned, b.id));
const described = prep.list.map((b) => ({ b, st: describe(b) }));
const list = described.filter((r) => !r.st.custom && !r.st.special);      // canopies / moored ships (canopies.js) have no walls
const net = analyse(list, prep.occluders.concat(described.filter((r) => r.st.custom).map((r) => ({ b: r.b, H: r.st.H }))));
assignColours(new Map(list.map((r) => [r.b.id, r.st])), net.adj, list.map((r) => r.b));
planPassages({}, net, list);
const dummy = { quad() {}, face() {} };
const recs = [];
const ONLY = (val('region') || [])[0];
for (const item of list) {
  const rec = net.rec.get(item.b.id);
  if (!regionOf(rec.b) || (ONLY && regionOf(rec.b) !== ONLY)) continue;
  rec.walls = buildWalls({}, rec, () => dummy, {});
  recs.push(rec);
}
const street = (rec) => rec.walls.filter((w) => w.street && !w.hole && !w.gate);
const frontLen = (rec) => street(rec).reduce((s, w) => s + w.len, 0);

if (has('view')) {
  // --view id[,id...] [--dist 26] [--shift 0.35]: a camera across the street from the longest street front of each house (the first free spot from `dist` metres inwards)
  const ids = val('view')[0].split(','), D0 = Number((val('dist') || [26])[0]), sh0 = Number((val('shift') || [0.35])[0]), cams = [];
  for (const id of ids) {
    const r = recs.find((q) => q.b.id === id) || recs.find((q) => q.b.parent === id && street(q).length);
    if (!r) { console.log(id, 'not drawn (claimed, hidden outline or unknown)'); continue; }
    const fronts = street(r).sort((p, q) => q.len - p.len);
    if (!fronts.length) { console.log(id, 'has no street front'); continue; }
    const w = fronts[0];
    let best = null;
    for (let d = D0; d >= 8 && !best; d -= 3) for (const sh of [sh0, -sh0, 0]) {
      const x = w.midX + w.nx * d + w.dx * Math.min(w.len, 40) * sh, z = w.midZ + w.nz * d + w.dz * Math.min(w.len, 40) * sh;
      if (!L.insideBuilding(x, z, 1.5)) { best = { x, z, d }; break; }
    }
    if (!best) { console.log(id, 'no free camera spot'); continue; }
    const pitch = Math.max(4, Math.min(22, Math.round(Math.atan2(r.st.H * 0.55 - 1.7, best.d) * 180 / Math.PI * 0.9)));
    const c = `${best.x.toFixed(1)},${best.z.toFixed(1)},${L.yawToward(best.x, best.z, w.midX, w.midZ).toFixed(1)},${pitch}`;
    cams.push(c);
    console.log(c, ' | ', r.b.id, NAME[r.st.arch], 'f' + r.st.floors, 'H' + r.st.H, r.st.hex, w.street.name, 'front', w.len.toFixed(0), 'd', best.d, L.inRiver(best.x, best.z) ? '(camera over water)' : '', r.st.parapet || '', r.st.mansard ? 'mansard' : '', r.st.turret ? 'turret:' + (r.st.turretTop || 'cone') : '');
  }
  console.log('--cams "' + cams.join(';') + '"');
  process.exit(0);
}

if (has('cams')) {
  const [want, nS] = val('cams', 2), n = Number(nS) || 6, near = val('near') ? val('near')[0].split(',').map(Number) : null;
  const withF = (val('with') || [])[0];          // --with turret | parapet | mansard | gable | majolica | socle: only houses that carry the feature
  const hasF = (r) => !withF || (withF === 'gable' ? r.walls.some((w) => (w.feat || []).some((f) => f.gable)) : withF === 'turret' ? r.st.turret && r.st.floors >= 4 : !!r.st[withF]);
  const pool = recs.filter((r) => NAME[r.st.arch] === want && hasF(r) && (!has('known') || r.st.known) && (!near || Math.hypot(r.st.ob.cx - near[0], r.st.ob.cz - near[1]) < near[2]) && street(r).some((w) => w.len >= 14 && w.street.road));
  pool.sort((p, q) => frontLen(q) - frontLen(p));
  const step = Math.max(1, Math.floor(pool.length / n)), cams = [];
  for (let i = 0; i < pool.length && cams.length < n; i += step) {
    const r = pool[i], w = street(r).filter((q) => q.street.road).sort((p, q) => q.len - p.len)[0];
    // stand across the street: the wall normal times (gap to the road axis + half its width + 2 m), shifted along the wall for a 3/4 view; never inside a building
    let best = null;
    for (const d of [Math.min(30, w.street.gap * 2 + 1), w.street.gap + 7, 18, 14, 10]) { for (const sh of [0.35, -0.35, 0]) {
      const x = w.midX + w.nx * d + w.dx * Math.min(w.len, 30) * sh, z = w.midZ + w.nz * d + w.dz * Math.min(w.len, 30) * sh;
      if (!L.insideBuilding(x, z, 1.5) && !L.inRiver(x, z)) { best = { x, z, d }; break; }
    } if (best) break; }
    if (!best) continue;
    const pitch = Math.min(24, Math.round(Math.atan2(r.st.H * 0.5 - 1.7, best.d) * 180 / Math.PI * 0.9));
    cams.push({ c: `${best.x.toFixed(1)},${best.z.toFixed(1)},${L.yawToward(best.x, best.z, w.midX, w.midZ).toFixed(1)},${pitch}`, r, w });
  }
  for (const { c, r, w } of cams) console.log(c, ' | ', r.b.id, NAME[r.st.arch], 'f' + r.st.floors, 'H' + r.st.H, r.st.hex, r.st.zone, w.street.name, 'front', w.len.toFixed(0), 'feat', JSON.stringify(w.feat || []), r.st.known ? 'KNOWN' : '', r.st.mansard ? 'mansard' : '', r.st.parapet || '', r.st.turret ? 'turret:' + (r.st.turretTop || 'cone') : '');
  console.log('--cams "' + cams.map((c) => c.c).join(';') + '"');
  process.exit(0);
}

if (has('heights')) {
  const rows = recs.filter((r) => !r.b.levels && r.b.hSrc !== 'height' && !r.b._raised && !r.b._fill && (r.b.minH || 0) < 0.5);
  const by = {}, sus = [];
  for (const r of rows) {
    const b = r.b, kn = knownFor(b), n = neighbourStoreys(b);
    const src = kn && (kn.H || kn.floors) ? 'known' : b.area > 150 && n && (!b.kind || ['yes', 'apartments', 'residential', 'commercial', 'office', 'hotel'].includes(b.kind)) ? 'neighbours' : b.kind && b.kind !== 'yes' && L.DEFAULT_H[b.kind] !== undefined ? 'kind' : b.area < 150 ? 'small' : 'street';
    const reg = regionOf(b);
    (by[reg] || (by[reg] = {}))[src] = ((by[reg] || {})[src] || 0) + 1;
    const fl = frontLen(r);
    if (b.area > 150 && (src === 'street' || (src === 'kind' && r.st.H > 9))) sus.push(`${b.id} ${reg} ${b.kind} area ${Math.round(b.area)} H ${r.st.H} ${NAME[r.st.arch]} front ${fl.toFixed(0)} m (${Math.round(b.cx)},${Math.round(b.cz)}) ${b.name || ''}`);
  }
  console.log('records without levels / height (ground, drawn):', rows.length);
  for (const [reg, o] of Object.entries(by)) console.log(' ', reg, JSON.stringify(o));
  console.log('street / kind defaults on footprints > 150 m2 (no mapped neighbours within 55 m):', sus.length);
  for (const s of sus.slice(0, 60)) console.log('  ', s);
  process.exit(0);
}

if (has('largest')) {
  const n = Number((val('largest') || [25])[0]) || 25;
  const pool = recs.filter((r) => (r.b.minH || 0) < 0.5 && !r.b._fill).sort((p, q) => q.st.area - p.st.area).slice(0, n);
  for (const r of pool) { const b = r.b, t = b.tags || {}; console.log(`${b.id.padEnd(12)} ${regionOf(b)} ${String(Math.round(r.st.area)).padStart(6)} m2  ${String(b.kind).padEnd(12)} lv ${String(b.levels || '-').padStart(2)}  H ${String(r.st.H).padStart(5)}  ${NAME[r.st.arch].padEnd(14)} ${r.st.known ? 'KNOWN' : '     '} front ${frontLen(r).toFixed(0).padStart(4)} m  obb ${r.st.ob.w.toFixed(0)}x${r.st.ob.d.toFixed(0)}  (${Math.round(b.cx)},${Math.round(b.cz)})  ${b.name || ''} ${b.addr ? (b.addr.street || '') + ' ' + (b.addr.no || '') : ''} ${t.amenity || ''} ${t.operator || ''} ${b.startDate || ''}`); }
  process.exit(0);
}

if (has('site')) {
  for (const b of BUILDINGS) { if (b.kind !== 'construction' || !regionOf(b)) continue; const r = recs.find((q) => q.b.id === b.id); console.log(b.id, regionOf(b), 'area', Math.round(b.area), `(${Math.round(b.cx)},${Math.round(b.cz)})`, 'construction=' + (b.construction || ''), b.name || '', r ? `drawn ${NAME[r.st.arch]} H ${r.st.H} restore ${r.st.restore}` : (L.isClaimed(b.id) ? 'claimed by ' + L.groupOf(b.id) : 'not drawn')); }
  process.exit(0);
}

// ---- default report
const mix = {}, feat = { bays: 0, gables: 0, turrets: 0, parapets: 0, mansards: 0, majolica: 0, socle: 0 }, known = { total: 0 };
let n = 0, front = 0;
for (const r of recs) {
  const d = districtOf(r.b) || '-', st = r.st;
  if ((r.b.minH || 0) > 0.5) continue;
  n++;
  if (st.known) known.total++;
  if (st.area < 160 || !street(r).length) continue;
  front++;
  const k = d + '/' + (st.zone || '-');
  (mix[k] || (mix[k] = {}))[NAME[st.arch]] = ((mix[k] || {})[NAME[st.arch]] || 0) + 1;
  for (const w of r.walls) for (const f of w.feat || []) { if (f.erker && st.floors >= 4) feat.bays++; if (f.gable) feat.gables++; }
  if (st.parapet) feat.parapets++; if (st.mansard) feat.mansards++; if (st.majolica) feat.majolica++; if (st.socle) feat.socle++;
  if (st.turret && [ARCH.NORDIC, ARCH.NEOCLASSIC1910].includes(st.arch)) feat.turrets++;
}
console.log(`new-region ground records drawn: ${n}; with a street front and > 160 m2: ${front}; KNOWN: ${known.total}`);
const tot = {};
for (const [k, o] of Object.entries(mix).sort()) { console.log(' ', k.padEnd(14), JSON.stringify(o)); for (const [a, c] of Object.entries(o)) tot[a] = (tot[a] || 0) + c; }
console.log('  all           ', JSON.stringify(Object.fromEntries(Object.entries(tot).sort((p, q) => q[1] - p[1]))));
console.log('features (houses with a street front):', JSON.stringify(feat));
