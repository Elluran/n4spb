// Debug aid for the people of Vasilievsky Island (people/voarea.js, people/vo.js):
//   PROBE=svc,roads,metro,bridges OUT=file.json node tools/people-test.mjs --eval tools/people-vo-probe.mjs [--mods environment,streets,city,...]
// svc     the shapes of the services of the sight modules of the island (crowd, fences, gates, paths, entrances, photoSpots, benches, monuments, ring/polygon fields); FULL=1 prints whole arrays
// roads   the names of the roads of the island (count, length, rank, bridge), the footway names
// metro   the metro entrances of the island; bridges the spans / pits / fallback decks
// cemetery the colliders inside the Smolensky polygon by type
// OUT=file writes everything it prints as JSON as well
import fs from 'node:fs';
export default async function (ctx, L) {
  const sv = ctx.services, full = !!process.env.FULL, out = {};
  const shape = (v) => Array.isArray(v) ? `[${v.length}] ` + (v.length ? JSON.stringify(full ? v : v[0]).slice(0, full ? 20000 : 420) : '') : v && typeof v === 'object' ? '{' + Object.keys(v).slice(0, 40).join(',') + '} ' + JSON.stringify(v, (k, q) => (Array.isArray(q) && q.length > 12 ? '[' + q.length + ']' : q)).slice(0, full ? 8000 : 300) : String(v);
  const SIGHTS = 'landmarksAcademy,landmarksMenshikov,landmarksMining,landmarksAndrew,landmarksNavalCorps,landmarksSmolensky,landmarksSeaTerminal,landmarksSevkabel,landmarksKirova,landmarksMakarova,landmarksSredny,landmarksGavan,landmarksPribaltiyskaya,landmarksMarineFacade,landmarksModernVO,landmarksOktyabrsky';
  for (const mode of (process.env.PROBE || 'svc').split(',')) {
    if (mode === 'svc') {
      for (const k of (process.env.SVC || SIGHTS).split(',')) {
        const s = sv[k]; console.log('== ' + k + (s ? '' : '  (no service)')); if (!s) continue; out[k] = {};
        for (const [kk, v] of Object.entries(s)) { if (typeof v === 'function') continue; console.log('  ' + kk + ': ' + shape(v)); out[k][kk] = Array.isArray(v) ? v.length : typeof v; }
      }
    }
    if (mode === 'roads') {
      const byName = new Map(); const st = sv.streets;
      for (const r of st.roads || []) {
        if (!r.pts || r.pts.length < 2) continue; const m = r.pts[Math.floor(r.pts.length / 2)]; if (!(m[0] < -2400 && m[0] > -9800 && m[1] > -2600 && m[1] < 1700)) continue;
        let len = 0; for (let i = 0; i + 1 < r.pts.length; i++) len += Math.hypot(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][1] - r.pts[i][1]);
        const k = (r.name || '(none)'); const e = byName.get(k) || { n: 0, len: 0, rank: 9, bridge: 0, w: 0, x: 0, z: 0 }; e.n++; e.len += len; e.rank = Math.min(e.rank, r.rank ?? 9); e.bridge += r.bridge ? 1 : 0; e.w = Math.max(e.w, r.w || 0); e.x = m[0]; e.z = m[1]; byName.set(k, e);
      }
      const rows = [...byName].sort((a, b) => b[1].len - a[1].len); out.roads = rows.map(([k, e]) => [k, e.n, Math.round(e.len), e.rank, e.bridge, e.w, Math.round(e.x), Math.round(e.z)]);
      console.log('== roads of the island (name, ways, length m, rank, bridge ways, max width, a mid point)'); for (const r of out.roads.slice(0, +(process.env.TOP || 80))) console.log('  ' + r.join(' | '));
      const pn = new Map(); for (const p of st.paths || []) { if (!p.pts || p.pts.length < 2) continue; const m = p.pts[0]; if (!(m[0] < -2400 && m[0] > -9800 && m[1] > -2600 && m[1] < 1700)) continue; pn.set(p.hw || '-', (pn.get(p.hw || '-') || 0) + 1); }
      console.log('  footways of the island by class', JSON.stringify([...pn]), '| sidewalks', (st.sidewalks || []).length, '| crosswalks', (st.crosswalks || []).length, '| busStops', (st.busStops || []).length);
    }
    if (mode === 'metro') {
      const es = ((sv.metro && sv.metro.entrances) || []).filter((e) => e.x < -2400); out.metro = es; console.log('== metro entrances of the island'); for (const e of es) console.log('  ' + JSON.stringify(e).slice(0, 260));
    }
    if (mode === 'bridges') {
      const b = sv.bridges || {}; console.log('== bridges: keys', Object.keys(b).join(','));
      for (const s of b.spans || []) console.log('  span', JSON.stringify(s).slice(0, 240));
      console.log('  list', JSON.stringify((b.list || []).map((e) => e.id || e.key || e.name)).slice(0, 1200)); console.log('  pits', JSON.stringify((b.pits || []).map((p) => [p.id, Math.round(p.x), Math.round(p.z), p.landing && p.landing.y]))); console.log('  fallbackDecks', JSON.stringify(b.fallbackDecks || []).slice(0, 600));
      out.spans = b.spans; out.pits = b.pits;
    }
    if (mode === 'cemetery') {
      const S = sv.landmarksSmolensky || {}, ring = S.ring || S.polygon || S.outline; console.log('== cemetery ring', ring ? ring.length : 'none');
      const ins = (x, z) => { if (!ring) return false; const r = Array.isArray(ring[0]) ? ring : ring.reduce((a, v, i) => (i % 2 ? (a[a.length - 1].push(v), a) : (a.push([v]), a)), []); let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], q = r[j]; if ((a[1] > z) !== (q[1] > z) && x < (q[0] - a[0]) * (z - a[1]) / (q[1] - a[1]) + a[0]) c = !c; } return c; };
      const tab = {}; for (const it of ctx.physics.items) { if (!ins(it.cx, it.cz)) continue; const k = it.type + (it.type === 'box' ? (it.fence ? '-fence' : Math.max(it.hw, it.hd) < 2 ? '-small' : Math.max(it.hw, it.hd) < 8 ? '-mid' : '-big') : ''); tab[k] = (tab[k] || 0) + 1; } console.log('  colliders inside', JSON.stringify(tab));
    }
  }
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out));
}
