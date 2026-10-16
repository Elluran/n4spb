// Debug aid for the people of the Petrograd side / the Spit (people/petro.js):
//   PROBE=svc,cover,ids node tools/people-test.mjs --eval tools/people-petro-probe.mjs
// svc    prints the shapes of the services of the new sights (SVC=landmarksFortress,... narrows; FULL=1 prints whole arrays)
// ids    the nearest routing node, its kind / component at the named places
// cover  an ASCII map of the routing graph (a letter per big component, 'o' small component, '.' walkable without a node, ' ' not walkable) over BOX="x0,x1,z0,z1,step;..."
// decks  the deck height / pavement band samples along the four big bridges
// zones  the people per place of the new area (after the population is placed)
export default async function (ctx, L) {
  const sv = ctx.services, P = sv.people || {}, nav = P.sim && P.sim.nav, N = nav && nav.N;
  const full = !!process.env.FULL;
  const shape = (v) => Array.isArray(v) ? `[${v.length}] ` + (v.length ? JSON.stringify(full ? v : v[0]).slice(0, full ? 6000 : 320) : '') : v && typeof v === 'object' ? '{' + Object.keys(v).slice(0, 40).join(',') + '} ' + JSON.stringify(v, (k, q) => (Array.isArray(q) && q.length > 6 ? `[${q.length}]` : typeof q === 'function' ? 'fn' : q)).slice(0, full ? 3000 : 260) : String(v).slice(0, 90);
  for (const mode of (process.env.PROBE || 'svc').split(',')) {
    if (mode === 'svc') {
      for (const k of (process.env.SVC || 'landmarksFortress,landmarksStrelka,landmarksUniversity,landmarksTroitskaya,landmarksAurora,landmarksKronverk,landmarksKamennoostrovsky,landmarksVladimir,bridges').split(',')) { console.log('== ' + k); for (const [kk, v] of Object.entries(sv[k] || {})) console.log('  ' + kk + ': ' + shape(v)); }
    }
    if (mode === 'ids' && nav) {
      const pts = (process.env.PTS ? process.env.PTS.split(';').map((s) => { const a = s.split(','); return [a[0], Number(a[1]), Number(a[2])]; }) : [['spit-descent', -2578, -1300], ['exchange', -2620, -1245], ['fortress-square', -1949, -1960], ['fortress-beach', -1990, -1830], ['ioannovsky-gate', -1700, -2090], ['trinity-mid', -1330, -1820], ['trinity-n', -1440, -2085], ['troitskaya', -1579, -2360], ['mosque', -1526, -2500], ['aurora', -770, -2540], ['cabin', -1142, -2300], ['kamenno', -1700, -2700], ['austrian', -1906, -3065], ['tolstoy', -2198, -3714], ['bolshoy', -2962, -2795], ['vladimir', -3123, -2120], ['tuchkov-mid', -3676, -1842], ['birzhevoy-mid', -2679, -1545], ['palace-mid', -2415, -977], ['alexander-park', -1900, -2420], ['kunstkamera', -2640, -990], ['stadium', -3600, -2400]]);
      for (const [n, x, z] of pts) { const id = nav.nearestNode(x, z, 30); console.log(n.padEnd(18), id < 0 ? 'none' : 'node ' + id + ' k=' + N.k[id] + ' d=' + Math.hypot(N.x[id] - x, N.z[id] - z).toFixed(1) + ' y=' + N.y[id].toFixed(2) + ' comp=' + nav.comp[id] + ' size=' + nav.compSize[nav.comp[id]] + (nav.comp[id] === nav.main ? ' MAIN' : ''), 'zoneW', nav.zoneW(x, z).toFixed(2)); }
      console.log('main size', nav.compSize[nav.main], 'components', nav.nComp, 'big', [...P.sim.bigComps].map((c) => c + ':' + nav.compSize[c]).sort((a, b) => Number(b.split(':')[1]) - Number(a.split(':')[1])).slice(0, 30).join(' '));
      console.log('nav stats', JSON.stringify(P.nav));
    }
    if (mode === 'cover' && nav) {
      for (const box of (process.env.BOX || '-2760,-2440,-1440,-1040,5').split(';')) {
        const [x0, x1, z0, z1, step] = box.split(',').map(Number); console.log('== box', box);
        const grid = new Map(), letters = new Map(); const LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (let i = 0; i < N.x.length; i++) { if (N.x[i] < x0 - step || N.x[i] > x1 + step || N.z[i] < z0 - step || N.z[i] > z1 + step) continue; const k = Math.floor(N.x[i] / step) + ',' + Math.floor(N.z[i] / step); let ch = 'o'; if (nav.mainOK(i)) { const cc = nav.comp[i]; if (!letters.has(cc)) letters.set(cc, LET[letters.size % LET.length]); ch = letters.get(cc); } const pr = grid.get(k); if (!pr || (pr === 'o' && ch !== 'o')) grid.set(k, ch); }
        console.log('legend', [...letters].map(([c, l]) => l + '=comp' + c + '(' + nav.compSize[c] + ')').join(' '));
        for (let z = z0; z < z1; z += step) {
          let row = '';
          for (let x = x0; x < x1; x += step) { const c = grid.get(Math.floor((x + step / 2) / step) + ',' + Math.floor((z + step / 2) / step)) || ''; row += c ? c : nav.walkable(x + step / 2, z + step / 2) && nav.cover(x + step / 2, z + step / 2) < -0.5 ? '.' : nav.inBuilding(x + step / 2, z + step / 2) ? '#' : nav.blocked(x + step / 2, z + step / 2) ? '~' : ' '; }
          console.log(String(z).padStart(6) + ' ' + row);
        }
      }
    }
    if (mode === 'decks') {
      const br = sv.bridges || {};
      for (const s of br.spans || []) {
        const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, out = [], net = sv.streets && sv.streets.net;
        for (const f of [-0.02, 0, 0.03, 0.1, 0.25, 0.5, 0.75, 0.9, 0.97, 1, 1.02]) { const row = []; for (const v of [0, s.hw - 1.2, -(s.hw - 1.2), s.hw + 1]) { const x = s.a.x + ux * l * f - uz * v, z = s.a.z + uz * l * f + ux * v, y = br.deckY(x, z), gh = ctx.physics.groundHeight(x, z, 30, false), cov = nav ? nav.fastCover(x, z) : net ? net.cover(x, z, {}) : 0; row.push((y == null ? 'null' : y.toFixed(2)) + '/' + (Number.isFinite(gh) ? gh.toFixed(2) : 'nan') + '/' + cov.toFixed(1)); } out.push(f + ': ' + row.join('  ')); }
        console.log('== span', s.id, 'a', s.a.x.toFixed(1), s.a.z.toFixed(1), 'b', s.b.x.toFixed(1), s.b.z.toFixed(1), 'hw', s.hw, 'len', l.toFixed(1), '(deckY / groundHeight / cover at v = 0, +pave, -pave, outside)'); for (const o of out) console.log('   ' + o);
        // the asphalt edge on the deck: scan v at mid span
        { const f = 0.5, row = []; for (let v = 0; v <= s.hw + 0.5; v += 0.5) { const x = s.a.x + ux * l * f - uz * v, z = s.a.z + uz * l * f + ux * v; row.push(v.toFixed(1) + ':' + (net ? net.cover(x, z, {}).toFixed(1) : '?')); } console.log('   cover across at mid span: ' + row.join(' ')); }
      }
    }
    if (mode === 'data') {                                            // roads by name, footways / squares by owner group, waterways, quay keys of the new area (works without the people module: --mods environment,streets,...)
      const st = sv.streets, inNew = (x, z) => x < -550 && z < -700 && !(x > -2300 && z > -1560) && z > -3950 && x > -3960;
      const by = new Map();
      for (const r of st.roads || []) { let len = 0, n = 0, sx = 0, sz = 0; for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1]; if (!inNew(a[0], a[1])) continue; len += Math.hypot(b[0] - a[0], b[1] - a[1]); n++; sx += a[0]; sz += a[1]; } if (!n) continue; const k = (r.name || '-') + ' |rank ' + r.rank + (r.bridge ? ' bridge' : ''); const e = by.get(k) || by.set(k, { len: 0, n: 0, sx: 0, sz: 0, w: r.w }).get(k); e.len += len; e.n += n; e.sx += sx; e.sz += sz; }
      console.log('== roads of the new area (name | rank: length m, width, centre)'); for (const [k, e] of [...by].sort((a, b) => b[1].len - a[1].len).slice(0, 70)) console.log('  ' + k + ': ' + Math.round(e.len) + ' m w' + e.w + ' @' + Math.round(e.sx / e.n) + ',' + Math.round(e.sz / e.n));
      console.log('road record keys', Object.keys((st.roads || [])[0] || {}).join(','), '| path keys', Object.keys((st.paths || [])[0] || {}).join(','), '| sidewalk keys', Object.keys((st.sidewalks || [])[0] || {}).join(','), '| crosswalk keys', Object.keys((st.crosswalks || [])[0] || {}).join(','));
      const groups = ['landmarksFortress', 'landmarksStrelka', 'landmarksUniversity', 'landmarksTroitskaya', 'landmarksAurora', 'landmarksKronverk', 'landmarksKamennoostrovsky', 'landmarksVladimir', 'bridges'];
      const own = new Map(); for (const g of groups) for (const id of (L.groupOsm ? L.groupOsm(g) : [])) own.set(id, g);
      const pc = {}, ph = {}; let pn = 0; for (const p of st.paths || []) { if (!p.pts || !inNew(p.pts[0][0], p.pts[0][1])) continue; pn++; const g = own.get(p.id) || 'generic'; pc[g] = (pc[g] || 0) + 1; ph[p.hw || '?'] = (ph[p.hw || '?'] || 0) + 1; }
      console.log('== footways in the new area', pn, 'by owner', JSON.stringify(pc), 'by hw', JSON.stringify(ph));
      const data = await import('../src/world/data/city.js');
      const ac = {}; for (const a of data.AREAS) { const o = a.polys[0].o; if (!inNew(o[0], o[1])) continue; const g = own.get(a.id) || 'generic'; ac[g] = (ac[g] || 0) + 1; }
      const gc = {}; for (const a of data.GREEN) { const o = a.polys[0].o; if (!inNew(o[0], o[1])) continue; const g = (own.get(a.id) || 'generic') + ':' + a.kind; gc[g] = (gc[g] || 0) + 1; }
      console.log('== AREAS by owner', JSON.stringify(ac), '| GREEN by owner:kind', JSON.stringify(gc));
      console.log('== sidewalks', (st.sidewalks || []).filter((s) => s.pts && inNew(s.pts[0][0], s.pts[0][1])).length, 'crosswalks', (st.crosswalks || []).filter((c) => inNew(c.pts[0][0], c.pts[0][1])).length, 'busStops', (st.busStops || []).filter((s) => inNew(s.x, s.z)).length);
      console.log('== WATERWAYS keys', Object.keys(L.WATERWAYS || {}).join(','));
      const wk = {}; for (const [n, x, z] of [['neva-trinity', -1330, -1820], ['neva-fortress', -1900, -1700], ['kronverk-strait', -1900, -2240], ['kronverk-strait-w', -2300, -2000], ['malaya-neva', -2680, -1545], ['malaya-neva-tuchkov', -3676, -1842], ['zhdanovka', -3613, -2369], ['bolshaya-nevka', -700, -2600], ['kronverk-moat', -2050, -2420], ['bolshaya-neva-spit', -2430, -1250]]) wk[n] = [L.waterwayAt && L.waterwayAt(x, z), sv.environment.waterAt && sv.environment.waterAt(x, z), sv.environment.kindAt && sv.environment.kindAt(x, z), L.inRiver && L.inRiver(x, z)].join('/');
      console.log('== water at (waterwayAt / env.waterAt / kindAt / inRiver)', JSON.stringify(wk));
      const q = sv.environment.quay || {}, qk = {}; for (const s of q.segments || []) { if (!inNew(s.ax, s.az)) continue; qk[s.key] = (qk[s.key] || 0) + Math.round(Math.hypot(s.bx - s.ax, s.bz - s.az)); }
      console.log('== quay segment metres by key (new area)', JSON.stringify(qk), 'stairs', (q.allStairs || []).filter((s) => inNew(s.x, s.z)).map((s) => s.key + '@' + Math.round(s.x) + ',' + Math.round(s.z)).join(' '));
      console.log('== env keys', Object.keys(sv.environment).join(','));
      console.log('== env boats', (sv.environment.boats || []).filter((b) => b.state).map((b) => { const s = b.state(0); return b.key + (b.moving ? '*' : '') + '@' + Math.round(s.x) + ',' + Math.round(s.z); }).join(' '));
      console.log('== env piers', JSON.stringify((sv.environment.piers || []).filter((p) => inNew(p.x, p.z)).map((p) => [p.key, Math.round(p.x), Math.round(p.z)])));
      console.log('== ponds / water polys in the new area', JSON.stringify((data.WATER || []).filter((w) => inNew(w.polys[0].o[0], w.polys[0].o[1])).map((w) => [w.id, w.kind, w.name, Math.round(w.polys[0].o[0]), Math.round(w.polys[0].o[1]), w.polys[0].o.length / 2]).slice(0, 40)));
    }
    if (mode === 'lat' && nav) {                                       // lattice nodes per zone / surface category of the new reach; the routing graph size
      const bz = {}, bc = {}; let tot = 0, all = 0;
      for (let i = 0; i < N.x.length; i++) { if (N.k[i] !== 'a') continue; all++; const z = nav.area.zone(N.x[i], N.z[i]); if (z < 8) continue; tot++; const zn = nav.marsCfg.zones[z] ? nav.marsCfg.zones[z].name : z; bz[zn] = (bz[zn] || 0) + 1; const c = nav.area.petro ? nav.area.petro.catAt(N.x[i], N.z[i]) : 0; bc[c] = (bc[c] || 0) + 1; }
      console.log('lattice nodes: all', all, 'in the petro zones', tot, 'by zone', JSON.stringify(bz), 'by cat', JSON.stringify(bc), '| area info', JSON.stringify(nav.area.info));
    }
    if (mode === 'heights') {                                          // ground heights round the points HPTS="name,x,z,r,feetY;..." (a 7 x 7 grid: the highest walk surface not above feetY + step)
      for (const s of (process.env.HPTS || 'descent,-2453,-1326,12,-2.2;lions,-1109.8,-2242.2,7,-1.1;beach,-2040,-1745,24,0.6').split(';')) {
        const [n, x, z, r, fy] = s.split(',').map((q, i) => (i ? Number(q) : q)); console.log('== heights', n, x, z, 'r', r, 'feetY', fy);
        for (let j = -3; j <= 3; j++) { let row = ''; for (let i = -3; i <= 3; i++) { const px = x + i * r / 3, pz = z + j * r / 3, h = ctx.physics.groundHeight(px, pz, fy, false), w = sv.environment.waterAt && sv.environment.waterAt(px, pz); row += (Number.isFinite(h) ? h.toFixed(2) : ' -inf').padStart(7) + (w ? '~' : ' ') + (nav ? (nav.obstDist(px, pz, 1) < 0.45 ? 'x' : ' ') : ''); } console.log(String(Math.round(z + j * r / 3)).padStart(7) + row); }
      }
    }
    if (mode === 'rail' && nav) {                                      // across each long deck at mid span: cover / distance to the nearest collider / free for a stander
      for (const s of nav.longs || []) { const row = []; for (let v = Math.max(0, s.v0 - 1); v <= s.hw + 0.3; v += 0.25) { const u = s.len * 0.42, x = s.ax + s.ux * u - s.uz * v, z = s.az + s.uz * u + s.ux * v; row.push(v.toFixed(2) + ':' + nav.cover(x, z).toFixed(1) + '/' + nav.obstDist(x, z, 2).toFixed(2) + (nav.walkable(x, z) ? 'w' : '-')); } console.log('== rail', s.id, 'band', s.v0, s.v1, 'hw', s.hw, '(v: cover / obstDist / walkable)', row.join(' ')); }
    }
    if (mode === 'island') {                                           // the ways on Zayachy Island: are they carriageways for the streets cover?
      const st = sv.streets, F = sv.landmarksFortress || {}, ring = F.ring || [], inR = (x, z) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
      const rs = (st.roads || []).filter((r) => r.pts && inR(r.pts[Math.floor(r.pts.length / 2)][0], r.pts[Math.floor(r.pts.length / 2)][1]));
      console.log('roads on the island', rs.length, 'sample', JSON.stringify(rs.slice(0, 3).map((r) => ({ ...r, pts: r.pts.length }))), 'cover at their middles', rs.slice(0, 12).map((r) => { const p = r.pts[Math.floor(r.pts.length / 2)]; return st.net.cover(p[0], p[1], {}).toFixed(1); }).join(','));
      console.log('paths on the island', (st.paths || []).filter((p) => p.pts && inR(p.pts[0][0], p.pts[0][1])).length, 'sidewalks', (st.sidewalks || []).filter((p) => p.pts && inR(p.pts[0][0], p.pts[0][1])).length, 'crosswalks', (st.crosswalks || []).filter((c) => inR(c.pts[0][0], c.pts[0][1])).length);
      for (const b of F.bridges || []) { const mx = (b.a[0] + b.b[0]) / 2, mz = (b.a[1] + b.b[1]) / 2; console.log('bridge', b.key, 'mid cover', st.net.cover(mx, mz, {}).toFixed(1), 'ground', ctx.physics.groundHeight(mx, mz, 4, false).toFixed(2), 'ends ground', ctx.physics.groundHeight(b.a[0], b.a[1], 4, false).toFixed(2), ctx.physics.groundHeight(b.b[0], b.b[1], 4, false).toFixed(2), 'waterAt mid', sv.environment.waterAt(mx, mz), 'deckY fn', typeof b.deckY); }
    }
    if (mode === 'corr' && nav) {                                      // per named street (CORR="name;name"): the routing nodes along it and the share that lies in a big component (walkers live only there)
      const st = sv.streets, names = (process.env.CORR || 'Большой проспект П.С.;Каменноостровский проспект;Кронверкский проспект;проспект Добролюбова;Кронверкская набережная;Петровская набережная;Университетская набережная;набережная Макарова;улица Куйбышева;Большая Пушкарская улица').split(';');
      for (const name of names) {
        let n = 0, big = 0, main = 0, len = 0; const seen = new Set(), comps = new Map();
        for (const r of st.roads || []) { if (r.name !== name) continue; for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); len += l; for (let s = 0; s < l; s += 6) { const x = a[0] + (b[0] - a[0]) * s / l, z = a[1] + (b[1] - a[1]) * s / l; for (let k = 0; k < N.x.length; k += 1) { /* placeholder: replaced by the grid lookup below */ break; } const id = nav.nearestNode(x, z, 14, (q) => N.k[q] === 'a' || N.k[q] === 's'); if (id < 0 || seen.has(id)) continue; seen.add(id); n++; if (nav.mainOK(id)) big++; if (nav.comp[id] === nav.main) main++; comps.set(nav.comp[id], (comps.get(nav.comp[id]) || 0) + 1); } } }
        console.log(name.padEnd(28), 'road m', Math.round(len), 'nodes sampled', n, 'in a big component', big, 'in the main one', main, 'components', comps.size, 'sizes', [...comps.keys()].map((c) => nav.compSize[c]).sort((p, q) => q - p).slice(0, 12).join(','));
      }
    }
    if (mode === 'zones' && P.sim) {
      const by = {}; for (const a of P.sim.agents) { if (a.hidden) continue; if (a.x > -550 || a.z > -700 || (a.x > -2300 && a.z > -1560)) continue; by[a.scene] = (by[a.scene] || 0) + 1; }
      console.log('people in the new area by scene', JSON.stringify(by), 'total', Object.values(by).reduce((s, q) => s + q, 0), 'of', P.sim.agents.length);
      if (P.plan && P.plan.petro) console.log('petro places', JSON.stringify(P.plan.petro), 'ms', JSON.stringify(P.plan.petroMs));
    }
  }
}
