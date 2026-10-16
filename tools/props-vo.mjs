// Headless report of the street props of Vasilievsky Island (regions V3..V12 of docs/VO-BRIEF.md; no GPU; copy of tools/props-petro.mjs). Builds what props reads (environment, streets, the sights of the
// island, bridges, metro; --city adds the houses: door boxes, wall baskets), then props, and prints
//   * what the sights publish (--svc), the OSM furniture of the island by kind (mapped / drawn);
//   * the props of the island by service list, the curated sites of props/vo.js (placed / missed) and the draw statistics;
//   * an AUDIT of every published prop of the island: on a carriageway (streets.net.cover > -0.25), over water, inside a house, within 1.9 m of a tram track;
//   * --near x,z,r: the props and a character map round a point (to choose an anchor).
//   node tools/props-vo.mjs [--city] [--svc] [--near x,z,r] [--petro] [--noprops] [--json file]
import fs from 'node:fs';
import { world, flag, args } from './traffic-harness.mjs';

const VO_SIGHTS = ['landmarksAcademy', 'landmarksMenshikov', 'landmarksMining', 'landmarksAndrew', 'landmarksNavalCorps', 'landmarksSmolensky', 'landmarksSeaTerminal', 'landmarksSevkabel', 'landmarksKirova', 'landmarksMakarova', 'landmarksSredny', 'landmarksGavan', 'landmarksPribaltiyskaya', 'landmarksMarineFacade', 'landmarksModernVO'];
const PETRO = ['landmarksStrelka', 'landmarksUniversity'];
const SIGHTS = [...VO_SIGHTS, ...(args.includes('--petro') ? PETRO : [])];
const list = ['environment', 'streets', ...(args.includes('--city') ? ['city'] : []), ...(args.includes('--nosights') ? [] : SIGHTS), 'bridges', 'metro', ...(args.includes('--noprops') ? [] : ['props'])];
const t0 = Date.now();
const { ctx, L, ms } = await world(list, { tolerant: true });
console.log('built', Object.entries(ms).map(([k, v]) => `${k} ${v}`).join(', '), 'ms; total', Date.now() - t0);
const SV = ctx.services, st = SV.streets, P = SV.props;
const VR = [[-3150, -2450, -1900, -150], [-3850, -3150, -2250, -150], [-4550, -3850, -2250, 900], [-5250, -4550, -2250, 1650], [-5950, -5250, -1900, 1600], [-6650, -5950, -1900, 1250], [-7350, -6650, -2250, 900], [-8050, -7350, -2250, 900], [-8750, -8050, -2600, 900], [-9800, -8750, -2600, 550]];
const OLD = L.PLAY_RECTS.slice(0, 23).concat([{ x0: -3050, x1: -2300, z0: -1700, z1: -700 }, { x0: -3950, x1: -3050, z0: -1800, z1: -1300 }]);      // the rectangles before P1 + V1, V2: not the island
const inR = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const isVO = (x, z) => args.includes('--all') || (VR.some((r) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3]) && !OLD.some((r) => inR(r, x, z)));
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
}
{
  const D = await import('../src/world/data/city.js');
  const kinds = {};
  for (const f of D.FURNITURE) if (isVO(f.x, f.z) && ['bench', 'waste_basket', 'bicycle_parking', 'post_box', 'clock', 'advertising:column', 'atm', 'bicycle_rental', 'vending_machine'].includes(f.kind)) kinds[f.kind] = (kinds[f.kind] || 0) + 1;
  console.log('OSM furniture of the island:', JSON.stringify(kinds), '| planters', D.MANMADE.filter((m) => m.kind === 'planter' && isVO(m.x, m.z)).length, '| tram stops', D.BUS_STOPS.filter((b) => b.tram && isVO(b.x, b.z)).length, '| bus stops', D.BUS_STOPS.filter((b) => !b.tram && isVO(b.x, b.z)).length);
}
const report = { counts: {}, stats: null, bad: [] };
if (P) {
  const cnt = {}; const add = (k, n) => { cnt[k] = (cnt[k] || 0) + n; };
  for (const k of ['benches', 'bins', 'kiosks', 'terraces', 'racks', 'pillars', 'boxes', 'planters', 'urns', 'clocks', 'stalls', 'shelters']) add(k, (P[k] || []).filter((o) => isVO(o.x, o.z)).length);
  report.counts = cnt;
  console.log('PROPS of the island:', JSON.stringify(cnt), '| whole map: benches', P.benches.length, 'bins', P.bins.length, 'kiosks', P.kiosks.length);
  console.log('osm stats:', JSON.stringify(P.stats.osm || null));
  console.log('petro stats:', JSON.stringify(P.stats.petro || null));
  console.log('vo stats:', JSON.stringify(P.stats.vo || null));
  console.log('OSM benches / bins left to the sights (claimed paving), island:', (P.stats.voClaimed || []).length, (P.stats.voClaimed || []).slice(0, 80).map((q) => `${q[2]}@${q[0]},${q[1]}`).join(' '));
  console.log('kiosks / stands of the island:', P.kiosks.filter((o) => isVO(o.x, o.z)).map((o) => `${o.kind}@${Math.round(o.x)},${Math.round(o.z)}`).join(' '));
  {                                                                      // the Andreevsky boulevard strip (landmarksAndrew PAVED_RINGS[2]): the OSM benches / bins are drawn by props (vo-requests-landmarksAndrew.md item 4)
    const { PAVED_RINGS } = await import('../src/world/landmarksAndrew/groups.js'), { ringHas } = await import('../src/world/props/kit.js'), ring = PAVED_RINGS[2].flat();
    const D = await import('../src/world/data/city.js'), inR = (o) => ringHas(ring, o.x, o.z);
    console.log('Andreevsky boulevard strip: OSM benches', D.FURNITURE.filter((f) => f.kind === 'bench' && inR(f)).length, 'bins', D.FURNITURE.filter((f) => f.kind === 'waste_basket' && inR(f)).length, '| drawn: benches', (P.benches || []).filter(inR).length, 'bins', (P.bins || []).filter(inR).length, 'racks', (P.racks || []).filter(inR).length);
  }
  {                                                                      // SIGNATURE of everything props published OUTSIDE the island: identical with PROPS_NOVO=1 and without = the island round moved nothing in the older districts
    const { inVO } = await import('../src/world/props/vo.js'), sig = {}; let all = 2166136261;
    for (const k of ['benches', 'bins', 'racks', 'pillars', 'kiosks', 'boxes', 'planters', 'urns', 'clocks', 'stalls', 'terraces']) {
      const a = (P[k] || []).filter((o) => !inVO(o.x, o.z)).map((o) => `${Math.round(o.x * 20)},${Math.round(o.z * 20)}`).sort();
      let h = 2166136261; for (const ch of a.join(';')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
      sig[k] = `${a.length}:${(h >>> 0).toString(16)}`; all ^= h; all = Math.imul(all, 16777619);
    }
    console.log('SIGNATURE outside the island:', (all >>> 0).toString(16), JSON.stringify(sig));
    report.signature = (all >>> 0).toString(16);
  }
  console.log('triangles: instanced', P.stats.instTris, 'static', P.stats.dynTris, 'instances', P.stats.instances, 'build ms', P.stats.buildMs, JSON.stringify(P.stats.ms));
  report.vo = P.stats.vo; report.stats = { instTris: P.stats.instTris, dynTris: P.stats.dynTris, instances: P.stats.instances, buildMs: P.stats.buildMs, byType: P.stats.byType };
  // ---- audit
  const { streetTrackDist } = await import('../src/world/streets/net.js');
  const cover = (x, z) => (st && st.net ? st.net.cover(x, z, {}) : -9), bad = report.bad;
  const SIZE = { benches: 0.5, bins: 0.25, kiosks: 0.8, racks: 0.4, pillars: 0.6, boxes: 0.4, planters: 0.5, urns: 0.3, stalls: 0.8 };
  for (const [k, r] of Object.entries(SIZE)) for (const o of P[k] || []) {
    if (!isVO(o.x, o.z)) continue;
    let worst = -9; for (const [a, b] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) worst = Math.max(worst, cover(o.x + a, o.z + b));
    const tag = `${k}${o.kind ? ':' + o.kind : ''}`;
    if (worst > -0.25) bad.push(`${tag} on asphalt (${worst.toFixed(2)}) at ${Math.round(o.x)},${Math.round(o.z)}`);
    if (L.inRiver(o.x, o.z) && !(SV.bridges && SV.bridges.deckY && SV.bridges.deckY(o.x, o.z) !== null)) bad.push(`${tag} over water at ${Math.round(o.x)},${Math.round(o.z)}`);
    if (L.insideBuilding(o.x, o.z, 0)) bad.push(`${tag} inside a house at ${Math.round(o.x)},${Math.round(o.z)}`);
    const td = streetTrackDist(o.x, o.z);
    if (td < 1.35) bad.push(`${tag} ${td.toFixed(2)} m from a tram track at ${Math.round(o.x)},${Math.round(o.z)}`);
  }
  // billboards: the frame (6.2 m wide, lower edge 3.0 m, catwalk 3.0 m) must not hang over a carriageway (a bus is 3.2 m, a trolleybus 3.4 m); pole and frame ends tested (review 2026-10-10)
  const bbOver = [];
  for (const o of P.billboards || []) {
    if (!isVO(o.x, o.z)) continue;
    const ex = -Math.cos(o.rotY), ez = Math.sin(o.rotY); let worst = -9;
    for (const s of [-3.1, -2.1, -1.0, 0, 1.0, 2.1, 3.1]) worst = Math.max(worst, cover(o.x + ex * s, o.z + ez * s));
    if (worst > -0.25) bbOver.push(`billboard frame over asphalt (${worst.toFixed(2)}) at ${Math.round(o.x)},${Math.round(o.z)}`);
  }
  console.log(`billboards of the island: ${(P.billboards || []).filter((o) => isVO(o.x, o.z)).length}, frames hanging over a carriageway: ${bbOver.length}`); for (const b of bbOver.slice(0, 60)) console.log('   ' + b);
  report.billboardOver = bbOver.length;
  {                                                                      // furniture 2 m clear of the metro doors / stair pits (vo-requests-metro.md) and of the bridge stair pits (bridges/groups.js PAVED_RINGS)
    const { PAVED_RINGS } = await import('../src/world/bridges/groups.js'), { ringHas } = await import('../src/world/props/kit.js');
    const ents = ((SV.metro && SV.metro.entrances) || []).filter((e) => typeof e.x === 'number'), flat = (r) => { const o = (r && (r.ring || r.o)) || r; return o && typeof o[0] === 'number' ? o : (o || []).flatMap((q) => [q[0] ?? q.x, q[1] ?? q.z]); }, pits = (PAVED_RINGS || []).map(flat).filter((r) => r.length >= 6 && r.every(Number.isFinite));
    const near = []; let n = 0;
    for (const k of ['benches', 'bins', 'kiosks', 'racks', 'pillars', 'boxes', 'planters', 'urns', 'clocks', 'billboards', 'totems']) for (const o of P[k] || []) {
      if (!isVO(o.x, o.z)) continue; n++;
      const e = ents.find((q) => Math.hypot(q.x - o.x, q.z - o.z) < 2.0);
      if (e) near.push(`${k} ${Math.hypot(e.x - o.x, e.z - o.z).toFixed(1)} m from metro door ${e.id || e.name || ''} at ${Math.round(o.x)},${Math.round(o.z)}`);
      if (pits.some((r) => ringHas(r, o.x, o.z))) near.push(`${k} inside a bridge stair pit ring at ${Math.round(o.x)},${Math.round(o.z)}`);
    }
    console.log(`metro / pit clearance of ${n} island props: ${near.length} offenders`); for (const b of near.slice(0, 40)) console.log('   ' + b);
    report.metroClear = near.length;
  }
  console.log(`AUDIT of the island: ${bad.length} offenders`); for (const b of bad.slice(0, 60)) console.log('   ' + b);
  if (flag('near', false)) {
    const [cx, cz, r] = String(flag('near')).split(',').map(Number);
    for (const k of Object.keys(SIZE)) { const l = (P[k] || []).filter((o) => Math.hypot(o.x - cx, o.z - cz) < r); if (l.length) console.log(`   ${k} near:`, l.map((o) => `${o.kind || ''}@${f1(o.x)},${f1(o.z)}`).join(' ')); }
  }
}
if (flag('json', false)) fs.writeFileSync(String(flag('json')), JSON.stringify(report, null, 1));
if (flag('near', false) && st) {
  // a coarse character map round the point (north up): # house, = asphalt, ~ water, . free ground, o a solid of a sight / prop, K kiosk, B bench, b bin, P photo spot
  const [cx, cz, r] = String(flag('near')).split(',').map(Number), step = Math.max(1, Math.round(r / 40));
  const solid = (x, z) => { const p = { x, z }; ctx.physics.resolve(p, 0.4, 0, 1.6); return Math.hypot(p.x - x, p.z - z) > 0.03; };
  const marks = []; for (const k of (P && P.kiosks) || []) marks.push([k.x, k.z, 'K']); for (const k of (P && P.benches) || []) marks.push([k.x, k.z, 'B']); for (const k of (P && P.bins) || []) marks.push([k.x, k.z, 'b']);
  for (const m of SIGHTS) for (const q of (SV[m] && SV[m].photoSpots) || []) marks.push([q.x, q.z, 'P']);
  console.log(`map round ${cx},${cz} (+-${r} m, ${step} m cells; x grows to the right, z down = south):`);
  for (let z = cz - r; z <= cz + r; z += step) { let row = ''; for (let x = cx - r; x <= cx + r; x += step) { const mk = marks.find((q) => Math.abs(q[0] - x) <= step / 2 && Math.abs(q[1] - z) <= step / 2); row += mk ? mk[2] : L.insideBuilding(x, z, 0) ? '#' : st.net.cover(x, z, {}) > -0.3 ? '=' : L.inRiver(x, z) ? '~' : solid(x, z) ? 'o' : '.'; } console.log(String(Math.round(z)).padStart(6) + ' ' + row); }
}
process.exit(0);
