// Headless probe of what the traffic module finds in an area (no GPU): the lane graph, the data-edge sinks / sources, lanes over open water, lanes on pedestrian ground,
// tram tracks, stops with their routes, wires, parking slots. Default area = the regions opened on 2026-10-06 (P1..P5, V1, V2: Petrograd side + the Spit).
//   node tools/traffic-probe.mjs [--all] [--near x,z,r] [--lanes] [--edges] [--wet] [--tram] [--stops] [--slots] [--island] [--oneway name]
//   (no selector = a summary of everything)
import { world, flag, args } from './traffic-harness.mjs';

const { ctx, L } = await world((process.env.TRAFFIC_BUILDLIST || 'environment,streets').split(','));
const st = ctx.services.streets;
const P1 = L.PLAY_RECTS.findIndex((r) => r.x0 === -2450 && r.x1 === -800 && r.z0 === -2800), OLD = L.PLAY_RECTS.slice(0, P1), NEW = L.PLAY_RECTS.slice(P1);      // P1 and every rectangle after it = the Petrograd side / Spit
const inR = (r, x, z, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;
const near = flag('near', false) ? String(flag('near')).split(',').map(Number) : null;
const isNew = (x, z, m = 120) => (near ? Math.hypot(x - near[0], z - near[1]) < near[2] : args.includes('--all') ? true : NEW.some((r) => inR(r, x, z, m)) && !OLD.some((r) => inR(r, x, z, 0)));
const any = ['lanes', 'edges', 'wet', 'tram', 'stops', 'slots', 'island', 'oneway'].some((k) => args.includes('--' + k));
const want = (k) => !any || args.includes('--' + k);
const f0 = (v) => v.toFixed(0), P = (p) => `${f0(p[0])},${f0(p[1])}`;
const midOf = (l) => l.pts[Math.floor(l.pts.length / 2)];
const lanes = st.lanes.filter((l) => isNew(...midOf(l)));

if (want('lanes')) {
  const by = {}; for (const l of lanes) { const k = `r${l.rank} ${l.hw}`; (by[k] ||= { n: 0, m: 0 }); by[k].n++; by[k].m += l.len; }
  console.log('LANES in the area', lanes.length, 'of', st.lanes.length, Object.entries(by).map(([k, v]) => `${k}: ${v.n} / ${Math.round(v.m)} m`).join(' | '));
  const names = {}; for (const l of lanes) if (l.rank >= 3) names[l.name || '?'] = (names[l.name || '?'] || 0) + l.len;
  console.log('rank >= 3 streets (m of lane):', Object.entries(names).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v)}`).join(', '));
  const sig = st.signals.filter((s) => isNew(s.x, s.z)), jn = st.junctions.filter((j) => isNew(j.x, j.z));
  console.log('signals', sig.length, 'junctions', jn.length, 'connectors', st.connectors.filter((c) => isNew(...c.pts[0])).length);
}
if (want('edges')) {
  const atEdge = (p) => !L.inExtent(p[0], p[1], 70);
  const snk = lanes.filter((l) => l.rank > 0 && l.to === null), src = lanes.filter((l) => l.rank > 0 && l.from === null);
  const cells = (list, end) => { const m = new Map(); for (const l of list) { const p = end ? l.pts[l.pts.length - 1] : l.pts[0], k = `${Math.round(p[0] / 60) * 60},${Math.round(p[1] / 60) * 60}`; const e = m.get(k) || m.set(k, { n: 0, edge: 0, names: new Set() }).get(k); e.n++; if (atEdge(p)) e.edge++; e.names.add((l.name || l.hw).slice(0, 22)); } return [...m].map(([k, e]) => `${k}: ${e.n} (${e.edge} at the data edge) ${[...e.names].join('/')}`); };
  console.log('SINK lane ends (to = null), 60 m cells:\n  ' + cells(snk, true).join('\n  '));
  console.log('SOURCE lane starts (from = null):\n  ' + cells(src, false).join('\n  '));
  const dead = snk.filter((l) => !atEdge(l.pts[l.pts.length - 1]));
  console.log('dead ends inside the data (never driven into):', dead.length, dead.slice(0, 20).map((l) => `${(l.name || l.hw).slice(0, 18)}@${P(l.pts[l.pts.length - 1])}`).join(' '));
}
if (want('wet')) {
  // lanes of driven roads over water: inside the play area a deck must carry them (services.bridges / landmarks); outside it the far scenery has no decks
  const B = ctx.services.bridges, dk = (x, z) => (B && B.deckY ? B.deckY(x, z) : null);
  const rows = [];
  for (const l of lanes) {
    if (!(l.rank > 0)) continue;
    let wet = 0, wetOut = 0, first = null, n = 0;
    for (let i = 0; i + 1 < l.pts.length; i++) { const a = l.pts[i], b = l.pts[i + 1], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4)); for (let q = 0; q < k; q++) { const x = a[0] + (b[0] - a[0]) * q / k, z = a[1] + (b[1] - a[1]) * q / k; n++; if (L.inRiver(x, z) && dk(x, z) === null) { wet++; if (!L.inPlay(x, z, 0)) wetOut++; if (!first) first = [x, z]; } } }
    if (wet) rows.push({ id: l.id, name: (l.name || l.hw), bridge: l.bridge, wet, wetOut, n, first });
  }
  console.log(`WET lanes (points over a waterway${B ? ' with no bridge deck' : ' (no bridges module in the build: every bridge counts)'}):`, rows.length);
  const cells = new Map(); for (const r of rows) { const k = `${Math.round(r.first[0] / 80) * 80},${Math.round(r.first[1] / 80) * 80}`; const e = cells.get(k) || cells.set(k, { n: 0, out: 0, pts: 0, names: new Set() }).get(k); e.n++; e.pts += r.wet; e.out += r.wetOut; e.names.add(r.name.slice(0, 24) + (r.bridge ? '(bridge)' : '')); }
  for (const [k, e] of cells) console.log(`  ${k}: ${e.n} lanes, ${e.pts} wet samples (${e.out} outside the play area) ${[...e.names].join(' / ')}`);
}
if (want('island')) {
  // Zayachy Island (the fortress) and the squares: no driven lane may lie there
  const isl = lanes.filter((l) => { const p = midOf(l); return p[0] > -2377 && p[0] < -1575 && p[1] > -2230 && p[1] < -1704 && !L.inRiver(p[0], p[1]); });
  const by = {}; for (const l of isl) by[`r${l.rank} ${l.hw}`] = (by[`r${l.rank} ${l.hw}`] || 0) + 1;
  console.log('lanes with their middle on Zayachy Island:', isl.length, JSON.stringify(by), 'driven (rank > 0):', isl.filter((l) => l.rank > 0).map((l) => `${l.name || l.hw}@${P(midOf(l))}`).join(' '));
  const ped = st.net && st.net.ways ? st.net.ways.filter((w) => w.pedestrianOnly && isNew(w.x[0], w.z[0])).length : '?';
  console.log('pedestrian-only ways of the network in the area:', ped);
}
if (want('tram')) {
  const tr = st.tram || [], inA = tr.filter((t) => { for (let i = 0; i < t.pts.length; i += 2) if (isNew(t.pts[i], t.pts[i + 1])) return true; return false; });
  const len = (t) => { let s = 0; for (let i = 0; i + 3 < t.pts.length; i += 2) s += Math.hypot(t.pts[i + 2] - t.pts[i], t.pts[i + 3] - t.pts[i + 1]); return s; };
  console.log('TRAM tracks', tr.length, 'total', Math.round(tr.reduce((a, t) => a + len(t), 0)), 'm; in the area', inA.length, Math.round(inA.reduce((a, t) => a + len(t), 0)), 'm; keys', Object.keys(tr[0] || {}).join(','));
  if (args.includes('--tram')) for (const t of inA) console.log('  ', t.id, Math.round(len(t)), 'm', P([t.pts[0], t.pts[1]]), '->', P([t.pts[t.pts.length - 2], t.pts[t.pts.length - 1]]), t.pts.length / 2, 'pts');
}
if (want('stops')) {
  const bs = (st.busStops || []).filter((b) => isNew(b.x, b.z));
  console.log('STOPS in the area', bs.length, 'of', (st.busStops || []).length, 'shelters', bs.filter((b) => b.shelter).length, 'keys', Object.keys(bs[0] || {}).join(','));
  const refs = { bus: new Set(), trolley: new Set(), tram: new Set() };
  for (const b of bs) for (const k of Object.keys(refs)) for (const r of (b.routes && b.routes[k]) || []) refs[k].add(r);
  for (const k of Object.keys(refs)) console.log('  ', k, 'refs:', [...refs[k]].sort((a, b) => parseInt(a) - parseInt(b)).join(' '));
  if (args.includes('--stops')) for (const b of bs) console.log('  ', b.name, P([b.x, b.z]), b.kind, b.shelter ? 'shelter' : '', JSON.stringify(b.routes), 'bay', b.bay ? P([b.bay.x, b.bay.z]) : '-');
  const tr = new Map(); for (const r of st.roads) if (r.trolley && r.trolley.length && isNew(...r.pts[Math.floor(r.pts.length / 2)])) for (const q of r.trolley) tr.set(q, (tr.get(q) || 0) + 1);
  console.log('   trolleybus refs on the roads of the area:', JSON.stringify([...tr]));
  const wp = ((st.wires && st.wires.pairs) || []).filter((p) => isNew(p.pts[0][0], p.pts[0][2]));
  console.log('   wire pairs in the area', wp.length, 'm', Math.round(wp.reduce((a, p) => { let s = 0; for (let i = 0; i + 1 < p.pts.length; i++) s += Math.hypot(p.pts[i + 1][0] - p.pts[i][0], p.pts[i + 1][2] - p.pts[i][2]); return a + s; }, 0)));
}
if (want('slots')) {
  const sl = (st.parkedSlots || []).filter((s) => isNew(s.x, s.z, 0));
  const by = {}; for (const s of sl) by[s.kind] = (by[s.kind] || 0) + 1;
  console.log('PARKING slots in the area', sl.length, 'of', (st.parkedSlots || []).length, JSON.stringify(by));
}
if (args.includes('--oneway')) {
  const re = new RegExp(String(flag('oneway')));
  for (const r of st.roads) if (re.test(r.name || '') && isNew(...r.pts[0])) console.log('  ', r.id, r.name, 'oneway', r.oneway, 'rank', r.rank, 'w', r.w, P(r.pts[0]), '->', P(r.pts[r.pts.length - 1]));
}
