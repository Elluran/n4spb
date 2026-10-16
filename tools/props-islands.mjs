// Headless report of the street props of the ISLANDS of the 2026-10-13 / 14 round (Yelagin, Kamenny, Aptekarsky, Petrovsky + Serny, Krestovsky; props/islands.js inIsl). No GPU.
// Builds what props reads (environment, streets, the island sights, bridges, metro; --city adds the houses), then props, and prints
//   * the props of the islands by kind (benches, bins, kiosks, boats ...), the stats of the island phase (props.stats.islands) and the samples to aim a camera at;
//   * an AUDIT of every published prop on the islands: on a carriageway (streets.net.cover > -0.3), over water, inside a house, inside the solid of a sight, on a tram track;
//   * --svc: what the island sights publish (keys, counts); --near x,z,r: the props round a point + a character map (K = kiosk, B = bench, b = bin, o = a solid, = asphalt, ~ water);
//   * --json file: the instance lists (x, z, kind) of the islands, for the before / after comparison;  --old file.json: prints the island and non-island differences against that file.
//   node tools/props-islands.mjs [--city] [--svc] [--near x,z,r] [--json out.json] [--cmp before.json]
import fs from 'node:fs';
import { world, flag, args, imp } from './traffic-harness.mjs';

const SIGHTS = ['landmarksVladimir', 'landmarksKrestovsky', 'landmarksVictoryPark', 'landmarksYelaginPalace', 'landmarksYelaginKitchen', 'landmarksYelaginServices', 'landmarksYelaginRossi', 'landmarksYelaginSpits', 'landmarksYelaginPark',
  'landmarksKamennyPalace', 'landmarksKamennyChurch', 'landmarksBotanicalGreenhouses', 'landmarksBotanicalGarden', 'landmarksPetrovskyStadium', 'landmarksPetrovskyYacht',
  'landmarksZhdanovka', 'landmarksKamennyTheatre', 'landmarksKamennyDachasEast', 'landmarksKamennyDachasWest', 'landmarksLETI', 'landmarksTVTower', 'landmarksTransfiguration', 'landmarksPetrovskyWest', 'landmarksVOStatues', 'landmarksPetroMonuments'];
const list = ['environment', 'streets', ...(args.includes('--city') ? ['city'] : []), ...SIGHTS, 'bridges', 'metro', ...(args.includes('--noprops') ? [] : ['props'])];
const t0 = Date.now();
const { ctx, L, ms } = await world(list, { tolerant: true });
console.log('built', Object.entries(ms).map(([k, v]) => `${k} ${v}`).join(', '), 'ms; total', Date.now() - t0);
const { inIsl, inIslRect } = await imp('src/world/props/islands.js');
const NEWT = /^(benchGreen|binConcrete|bollardWhite|parkCabin|infoStand|rowBoat|motorBoat|yacht)/;      // the prop types the island phase adds (boats lie on the water round the islands: inIslRect)
const SV = ctx.services, st = SV.streets, P = SV.props;
const f1 = (v) => (typeof v === 'number' ? +v.toFixed(1) : v);

if (args.includes('--svc')) {
  for (const m of [...SIGHTS, 'bridges']) {
    const s = SV[m]; if (!s) { console.log(m, '(not built)'); continue; }
    console.log('==', m);
    for (const [k, v] of Object.entries(s)) {
      if (Array.isArray(v)) console.log(`   ${k}: [${v.length}]`, v.length ? JSON.stringify(v[0], (kk, x) => (typeof x === 'number' ? f1(x) : typeof x === 'function' ? 'fn' : Array.isArray(x) && x.length > 8 ? `[${x.length}]` : x)).slice(0, 220) : '');
      else if (v && typeof v === 'object') console.log(`   ${k}: {${Object.keys(v).slice(0, 12).join(', ')}}`);
      else console.log(`   ${k}:`, typeof v === 'function' ? 'fn' : v);
    }
  }
  console.log('streets.busStops on the islands:', ((st && st.busStops) || []).filter((b) => inIsl(b.x, b.z)).map((b) => `${b.name || ''}${b.shelter ? '+shelter' : ''}${b.tram ? '+tram' : ''}@${Math.round(b.x)},${Math.round(b.z)}`).join(' '));
}
if (P) {
  const KEYS = ['benches', 'bins', 'kiosks', 'terraces', 'racks', 'pillars', 'boxes', 'planters', 'urns', 'clocks', 'stalls', 'billboards', 'totems', 'cameras', 'plaques', 'bollards', 'boards', 'pontoons'];
  const cnt = {}; const add = (k, n) => { cnt[k] = (cnt[k] || 0) + n; };
  for (const k of KEYS) add(k, (P[k] || []).filter((o) => inIsl(o.x, o.z)).length);
  console.log('PROPS of the islands:', JSON.stringify(cnt), '| whole map: benches', P.benches.length, 'bins', P.bins.length, 'kiosks', P.kiosks.length);
  console.log('osm phase:', JSON.stringify(P.stats.osm), '| walks:', JSON.stringify(P.stats.walks));
  console.log('island phase stats:', JSON.stringify(P.stats.islands || null));
  for (const [nm, x, z] of [['n11283867340', -6420.9, -5320.8], ['n11283867339', -6414.7, -5294.7]]) console.log(`spit bench ${nm}: generic benches within 2 m: ${P.benches.filter((b) => Math.hypot(b.x - x, b.z - z) < 2).length} (module publishes ${(((SV.landmarksYelaginSpits || {}).benches) || []).filter((b) => Math.hypot(b.x - x, b.z - z) < 2).length})`);
  console.log('kiosks of the islands:', P.kiosks.filter((o) => inIsl(o.x, o.z)).map((o) => `${o.kind}@${Math.round(o.x)},${Math.round(o.z)}`).join(' '));
  console.log('triangles: instanced', P.stats.instTris, 'static', P.stats.dynTris, 'build ms', P.stats.buildMs, JSON.stringify(P.stats.ms));
  const cover = (x, z) => (st && st.net ? st.net.cover(x, z, {}) : -9), bad = [];
  const SIZE = { benches: 0.5, bins: 0.25, kiosks: 0.8, racks: 0.4, pillars: 0.6, boxes: 0.4, planters: 0.5, urns: 0.3, stalls: 0.8 };
  for (const [k, r] of Object.entries(SIZE)) for (const o of P[k] || []) {
    if (!inIsl(o.x, o.z)) continue;
    let worst = -9; for (const [a, b] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) worst = Math.max(worst, cover(o.x + a, o.z + b));
    if (worst > -0.25) bad.push(`${k}${o.kind ? ':' + o.kind : ''} on asphalt (${worst.toFixed(2)}) at ${Math.round(o.x)},${Math.round(o.z)}`);
    if (L.inRiver(o.x, o.z) && !(SV.bridges && SV.bridges.deckY && SV.bridges.deckY(o.x, o.z) !== null)) bad.push(`${k}${o.kind ? ':' + o.kind : ''} over water at ${Math.round(o.x)},${Math.round(o.z)}`);
    if (L.insideBuilding(o.x, o.z, 0)) bad.push(`${k}${o.kind ? ':' + o.kind : ''} inside a house at ${Math.round(o.x)},${Math.round(o.z)}`);
  }
  console.log(`AUDIT of the islands: ${bad.length} offenders`); for (const b of bad.slice(0, 40)) console.log('   ' + b);
  if (flag('json', false)) {
    const out = {}; for (const k of KEYS) out[k] = (P[k] || []).map((o) => [Math.round(o.x * 10) / 10, Math.round(o.z * 10) / 10, o.kind || '', Math.round((o.rotY || 0) * 100) / 100]);
    out.byType = P.stats.byType; out.instTris = P.stats.instTris; out.instances = P.stats.instances;
    fs.writeFileSync(flag('json'), JSON.stringify(out));
    console.log('written', flag('json'));
  }
  if (P.inst) {
    const o = JSON.parse(fs.readFileSync(flag('json'), 'utf8')); o.inst = P.inst; fs.writeFileSync(flag('json'), JSON.stringify(o));
    if (flag('cmp', false)) {
      const old = JSON.parse(fs.readFileSync(flag('cmp'), 'utf8')).inst || {}; let diffOut = 0, diffIn = 0; const names = new Set([...Object.keys(old), ...Object.keys(P.inst)]);
      for (const n of names) { if (NEWT.test(n)) { const bad = (P.inst[n] || []).filter((q) => !(inIsl(q[0], q[1]) || (/^(rowBoat|motorBoat|yacht)/.test(n) && inIslRect(q[0], q[1])))); if (bad.length) { console.log(`  NEW TYPE ${n}: ${bad.length} instances outside the islands / their water, e.g. ${bad[0]}`); diffOut += bad.length; } continue; } const key = (q) => q.join('|'), a = (old[n] || []).filter((q) => !inIsl(q[0], q[1])), b = (P.inst[n] || []).filter((q) => !inIsl(q[0], q[1])); const sa = new Set(a.map(key)), sb = new Set(b.map(key)); const d = a.filter((q) => !sb.has(key(q))).length + b.filter((q) => !sa.has(key(q))).length; if (a.length !== b.length || d) { console.log(`  INSTANCES OUTSIDE THE ISLANDS differ: ${n} ${a.length} -> ${b.length} (${d} different)`); diffOut += d || 1; } const ai = (old[n] || []).length - a.length, bi = (P.inst[n] || []).length - b.length; if (ai !== bi) diffIn++; }
      console.log(`FROZEN PROOF (instances of every OLD prop type outside the islands, before / after the island phase; the new types lie on the islands / their water): ${diffOut === 0 ? 'IDENTICAL' : 'DIFFERENT (' + diffOut + ')'}; types with a different count on the islands: ${diffIn}`);
    }
  }
  if (flag('cmp', false)) {
    const old = JSON.parse(fs.readFileSync(flag('cmp'), 'utf8'));
    for (const k of KEYS) {
      const a = old[k] || [], b = (P[k] || []).map((o) => [Math.round(o.x * 10) / 10, Math.round(o.z * 10) / 10, o.kind || '', Math.round((o.rotY || 0) * 100) / 100]);
      const key = (q) => q.join('|'), sa = new Map(a.map((q) => [key(q), q])), sb = new Map(b.map((q) => [key(q), q]));
      const gone = a.filter((q) => !sb.has(key(q))), fresh = b.filter((q) => !sa.has(key(q)));
      const outside = (l) => l.filter((q) => !inIsl(q[0], q[1]));
      console.log(`  ${k}: before ${a.length} after ${b.length}; removed ${gone.length} (outside the islands: ${outside(gone).length}), added ${fresh.length} (outside the islands: ${outside(fresh).length})`);
      for (const q of outside(gone).slice(0, 5)) console.log('      OUTSIDE removed', q.join(','));
      for (const q of outside(fresh).slice(0, 5)) console.log('      OUTSIDE added', q.join(','));
    }
  }
  if (flag('near', false)) {
    const [cx, cz, r] = String(flag('near')).split(',').map(Number);
    for (const k of Object.keys(SIZE)) { const l = (P[k] || []).filter((o) => Math.hypot(o.x - cx, o.z - cz) < r); if (l.length) console.log(`   ${k} near:`, l.map((o) => `${o.kind || ''}@${f1(o.x)},${f1(o.z)}`).join(' ')); }
  }
}
if (flag('near', false) && st) {
  const [cx, cz, r] = String(flag('near')).split(',').map(Number), step = Math.max(1, Math.round(r / 40));
  const solid = (x, z) => { const p = { x, z }; ctx.physics.resolve(p, 0.3, 0, 1.6); return Math.hypot(p.x - x, p.z - z) > 0.03; };
  console.log(`map round ${cx},${cz} (+-${r} m, ${step} m cells; x to the right, z down = south): K kiosk, B bench, b bin, # house, = asphalt, ~ water, o solid`);
  const marks = []; for (const k of (P && P.kiosks) || []) marks.push([k.x, k.z, 'K']); for (const k of (P && P.benches) || []) marks.push([k.x, k.z, 'B']); for (const k of (P && P.bins) || []) marks.push([k.x, k.z, 'b']);
  for (let z = cz - r; z <= cz + r; z += step) { let row = ''; for (let x = cx - r; x <= cx + r; x += step) { const mk = marks.find((q) => Math.abs(q[0] - x) <= step / 2 && Math.abs(q[1] - z) <= step / 2); row += mk ? mk[2] : L.insideBuilding(x, z, 0) ? '#' : st.net.cover(x, z, {}) > -0.3 ? '=' : L.inRiver(x, z) ? '~' : solid(x, z) ? 'o' : '.'; } console.log(String(Math.round(z)).padStart(6) + ' ' + row); }
}
process.exit(0);
