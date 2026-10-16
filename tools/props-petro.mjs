// Headless report of the street props of the Petrograd side / Spit extension (regions P1..P5, V1, V2; no GPU): builds what props reads (environment, streets, the sights of the area,
// bridges, metro; --city adds the houses: door boxes, wall baskets), then props, and prints
//   * the curated sites of props/petro.js: placed / missed, with the spot each one found;
//   * the props of the new area by kind, and an AUDIT of every published prop there: on a carriageway (streets.net.cover > -0.3), over water, inside a house, inside the solid of a sight;
//   * --svc: what the sights publish (keys, counts, a sample), --near x,z,r: the free pavement cells and the props round a point (to choose an anchor).
//   node tools/props-petro.mjs [--city] [--svc] [--near x,z,r] [--all]
import { world, flag, args } from './traffic-harness.mjs';

const SIGHTS = ['landmarksFortress', 'landmarksStrelka', 'landmarksUniversity', 'landmarksTroitskaya', 'landmarksAurora', 'landmarksKronverk', 'landmarksKamennoostrovsky', 'landmarksVladimir', 'landmarksKarpovka'];
const list = ['environment', 'streets', ...(args.includes('--city') ? ['city'] : []), ...(args.includes('--nosights') ? [] : SIGHTS), 'bridges', 'metro', ...(args.includes('--noprops') ? [] : ['props'])];
const t0 = Date.now();
const { ctx, L, ms } = await world(list, { tolerant: true });
console.log('built', Object.entries(ms).map(([k, v]) => `${k} ${v}`).join(', '), 'ms; total', Date.now() - t0);
const SV = ctx.services, st = SV.streets, P = SV.props;
const P1 = L.PLAY_RECTS.findIndex((r) => r.x0 === -2450 && r.x1 === -800 && r.z0 === -2800), OLD = L.PLAY_RECTS.slice(0, P1), NEW = L.PLAY_RECTS.slice(P1);      // P1 and every rectangle after it = the Petrograd side / Spit
const inR = (r, x, z, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;
const isNew = (x, z) => args.includes('--all') || (NEW.some((r) => inR(r, x, z)) && !OLD.some((r) => inR(r, x, z)));
const f1 = (v) => (typeof v === 'number' ? +v.toFixed(1) : v);

if (args.includes('--svc')) {
  for (const m of [...SIGHTS, 'metro', 'bridges']) {
    const s = SV[m]; if (!s) { console.log(m, '(not built)'); continue; }
    console.log('==', m);
    for (const [k, v] of Object.entries(s)) {
      if (Array.isArray(v)) console.log(`   ${k}: [${v.length}]`, v.length ? JSON.stringify(v[0], (kk, x) => (typeof x === 'number' ? f1(x) : typeof x === 'function' ? 'fn' : Array.isArray(x) && x.length > 8 ? `[${x.length}]` : x)).slice(0, 260) : '');
      else if (v && typeof v === 'object') console.log(`   ${k}: {${Object.keys(v).slice(0, 12).join(', ')}}`);
      else console.log(`   ${k}:`, typeof v === 'function' ? 'fn' : v);
    }
  }
  const me = (SV.metro && SV.metro.entrances) || []; console.log('metro entrances in the area:', me.filter((e) => isNew(e.x, e.z)).map((e) => `${e.kind || ''}/${e.name || e.station || ''}@${Math.round(e.x)},${Math.round(e.z)}/${Math.round((e.rotY || 0) * 57.3)}`).join(' '));
  const q = SV.environment && SV.environment.quay; console.log('quay stairs with a pier in the area:', ((q && q.allStairs) || []).filter((s) => isNew(s.x, s.z)).map((s) => `${s.key || ''}${s.pier ? '+pier' : ''}@${Math.round(s.x)},${Math.round(s.z)}`).join(' '));
}
if (P) {
  const cnt = {}; const add = (k, n) => { cnt[k] = (cnt[k] || 0) + n; };
  for (const k of ['benches', 'bins', 'kiosks', 'terraces', 'racks', 'pillars', 'boxes', 'planters', 'urns', 'clocks', 'stalls']) add(k, (P[k] || []).filter((o) => isNew(o.x, o.z)).length);
  console.log('PROPS of the new area:', JSON.stringify(cnt), '| whole map: benches', P.benches.length, 'bins', P.bins.length, 'kiosks', P.kiosks.length);
  console.log('petro stats:', JSON.stringify(P.stats.petro || null));
  console.log('kiosks / stands of the new area:', P.kiosks.filter((o) => isNew(o.x, o.z)).map((o) => `${o.kind}@${Math.round(o.x)},${Math.round(o.z)}`).join(' '));
  console.log('triangles: instanced', P.stats.instTris, 'static', P.stats.dynTris, 'build ms', P.stats.buildMs, JSON.stringify(P.stats.ms));
  // ---- audit
  const cover = (x, z) => (st && st.net ? st.net.cover(x, z, {}) : -9), bad = [];
  const solid = (x, z, r) => { const p = { x, z }; ctx.physics.resolve(p, r, 0, 1.6); return Math.hypot(p.x - x, p.z - z); };
  const SIZE = { benches: 0.5, bins: 0.25, kiosks: 0.8, racks: 0.4, pillars: 0.6, boxes: 0.4, planters: 0.5, urns: 0.3, stalls: 0.8 };
  for (const [k, r] of Object.entries(SIZE)) for (const o of P[k] || []) {
    if (!isNew(o.x, o.z)) continue;
    let worst = -9; for (const [a, b] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) worst = Math.max(worst, cover(o.x + a, o.z + b));
    if (worst > -0.25) bad.push(`${k}${o.kind ? ':' + o.kind : ''} on asphalt (${worst.toFixed(2)}) at ${Math.round(o.x)},${Math.round(o.z)}`);
    if (L.inRiver(o.x, o.z) && !(SV.bridges && SV.bridges.deckY && SV.bridges.deckY(o.x, o.z) !== null)) bad.push(`${k}${o.kind ? ':' + o.kind : ''} over water at ${Math.round(o.x)},${Math.round(o.z)}`);
    if (L.insideBuilding(o.x, o.z, 0)) bad.push(`${k}${o.kind ? ':' + o.kind : ''} inside a house at ${Math.round(o.x)},${Math.round(o.z)}`);
  }
  console.log(`AUDIT of the new area: ${bad.length} offenders`); for (const b of bad.slice(0, 40)) console.log('   ' + b);
  void solid;
  if (flag('near', false)) {
    const [cx, cz, r] = String(flag('near')).split(',').map(Number);
    for (const k of Object.keys(SIZE)) { const l = (P[k] || []).filter((o) => Math.hypot(o.x - cx, o.z - cz) < r); if (l.length) console.log(`   ${k} near:`, l.map((o) => `${o.kind || ''}@${f1(o.x)},${f1(o.z)}`).join(' ')); }
  }
}
if (flag('near', false) && st) {
  // a coarse character map round the point (2 m cells, north up): # house, = asphalt, ~ water, . free ground, o a solid of a sight / prop
  const [cx, cz, r] = String(flag('near')).split(',').map(Number), step = Math.max(2, Math.round(r / 30));
  const solid = (x, z) => { const p = { x, z }; ctx.physics.resolve(p, 0.4, 0, 1.6); return Math.hypot(p.x - x, p.z - z) > 0.03; };
  console.log(`map round ${cx},${cz} (+-${r} m, ${step} m cells; x grows to the right, z down = south):`);
  const marks = []; for (const k of (P && P.kiosks) || []) marks.push([k.x, k.z, k.kind === 'viewer' ? 'V' : 'K']); for (const m of SIGHTS) for (const q of (SV[m] && SV[m].photoSpots) || []) marks.push([q.x, q.z, 'P']);
  console.log('   (K = a kiosk / cart of props, V = a telescope viewer, P = a photo spot of a sight; first column = z, the row starts at x ' + (cx - r) + ')');
  for (let z = cz - r; z <= cz + r; z += step) { let row = ''; for (let x = cx - r; x <= cx + r; x += step) { const mk = marks.find((q) => Math.abs(q[0] - x) <= step / 2 && Math.abs(q[1] - z) <= step / 2); row += mk ? mk[2] : L.insideBuilding(x, z, 0) ? '#' : st.net.cover(x, z, {}) > -0.3 ? '=' : L.inRiver(x, z) ? '~' : solid(x, z) ? 'o' : '.'; } console.log(String(Math.round(z)).padStart(6) + ' ' + row); }
}
process.exit(0);
