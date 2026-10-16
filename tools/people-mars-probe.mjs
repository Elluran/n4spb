// Debug aid for the Mars Field / Summer Garden / Engineering Castle people work:
//   node tools/people-test.mjs --eval tools/people-mars-probe.mjs [-- svc | cover | zones]
// svc    prints the shapes of services.landmarksMars / landmarksGarden / landmarksCastle
// cover  prints an ASCII map of the routing graph (main component = '#', small component = 'o', walkable but no node within 2.5 m = '.', not walkable = ' ') over the new area
// zones  prints the people counts per place of the new area
export default async function (ctx, L) {
  for (const mode of (process.env.PROBE || 'svc,cover').split(',')) {
  const sv = ctx.services, P = sv.people, nav = P.sim.nav, N = nav.N;
  const shape = (v) => Array.isArray(v) ? `[${v.length}] ` + (v.length ? JSON.stringify(v[0]).slice(0, 300) : '') : v && typeof v === 'object' ? '{' + Object.keys(v).slice(0, 40).join(',') + '}' : String(v).slice(0, 80);
  if (mode === 'svc') {
    for (const k of (process.env.SVC || 'landmarksMars,landmarksGarden,landmarksCastle').split(',')) { console.log('== ' + k); for (const [kk, v] of Object.entries(sv[k] || {})) console.log('  ' + kk + ': ' + shape(v)); }
    console.log('== bridges'); console.log('  ' + shape(sv.bridges && sv.bridges.list));
  }
  if (mode === 'lat') {
    const by = {}, bz = {}; let tot = 0;
    for (let i = 0; i < N.x.length; i++) { if (N.k[i] !== 'a') continue; const R = (process.env.LATBOX || '-1470,-600,-1740,-640').split(',').map(Number); if (N.x[i] < R[0] || N.x[i] > R[1] || N.z[i] < R[2] || N.z[i] > R[3]) continue; tot++; const c = nav.area.catAt(N.x[i], N.z[i]); by[c] = (by[c] || 0) + 1; const z = nav.area.zone(N.x[i], N.z[i]); bz[z] = (bz[z] || 0) + 1; }
    console.log('lattice nodes in the region', tot, 'by cat', JSON.stringify(by), 'by zone', JSON.stringify(bz));
    console.log('benches', nav.benches.length, 'in Field(80 m of flame)', nav.benches.filter(b => Math.hypot(b.x + 1086, b.z + 1243) < 80).length, 'castle(60 m)', nav.benches.filter(b => Math.hypot(b.x + 712, b.z + 757) < 60).length, 'where', JSON.stringify(nav.benches.reduce((m, b) => (m[b.where] = (m[b.where] || 0) + 1, m), {})));
    console.log('marsCount', [...P.sim.marsCount].join(','));
  }
  if (mode === 'ids') {
    const st = sv.streets, g = new Set(L.groupOsm('landmarksGarden')), m = new Set(L.groupOsm('landmarksMars')), c = new Set(L.groupOsm('landmarksCastle'));
    const cnt = { garden: 0, mars: 0, castle: 0, all: st.paths.length }; const ex = [];
    for (const p of st.paths) { if (g.has(p.id)) cnt.garden++; if (m.has(p.id)) cnt.mars++; if (c.has(p.id)) cnt.castle++; if (ex.length < 3) ex.push(Object.keys(p).join(',')); }
    console.log('streets.paths by group', JSON.stringify(cnt), 'fields', ex[0]);
    console.log('groups sizes', g.size, m.size, c.size);
    const pts = [['flame', -1086, -1243], ['field', -1190, -1330], ['gate-in', -965, -1625], ['gate-out', -967, -1648], ['krylov', -909, -1537], ['peter', -712, -757], ['castle-portal', -737, -824], ['swan', -1069, -1611], ['suvorov', -1190, -1470], ['marble', -1340, -1445], ['palace', -849, -1635], ['emb', -1000, -1650]];
    for (const [n, x, z] of pts) { const id = nav.nearestNode(x, z, 25); console.log(n, id < 0 ? 'none' : 'node ' + id + ' k=' + N.k[id] + ' d=' + Math.hypot(N.x[id] - x, N.z[id] - z).toFixed(1) + ' comp=' + nav.comp[id] + ' size=' + nav.compSize[nav.comp[id]] + (nav.comp[id] === nav.main ? ' MAIN' : '')); }
    console.log('main size', nav.compSize[nav.main], 'components', nav.nComp, 'big', [...P.sim.bigComps].map(c => c + ':' + nav.compSize[c]).join(' '));
  }
  if (mode === 'cover') {
    for (const box of (process.env.BOX || '-1300,-1000,-1650,-1150,6').split(';')) { const [x0, x1, z0, z1, step] = box.split(',').map(Number); console.log('== box', box);
    const grid = new Map(), letters = new Map(); const LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; for (let i = 0; i < N.x.length; i++) { const gx = Math.floor(N.x[i] / step), gz = Math.floor(N.z[i] / step); const k = gx + ',' + gz; let ch = 'o'; if (nav.mainOK(i)) { const cc = nav.comp[i]; if (!letters.has(cc)) letters.set(cc, LET[letters.size % LET.length]); ch = letters.get(cc); } const pr = grid.get(k); if (!pr || (pr === 'o' && ch !== 'o')) grid.set(k, ch); }
    console.log('legend', [...letters].map(([c, l]) => l + '=comp' + c + '(' + nav.compSize[c] + ')').join(' '));
    for (let z = z0; z < z1; z += step) {
      let row = '';
      for (let x = x0; x < x1; x += step) {
        const c = grid.get(Math.floor((x + step / 2) / step) + ',' + Math.floor((z + step / 2) / step)) || '';
        row += c ? c : nav.walkable(x + step / 2, z + step / 2) && nav.fastCover(x + step / 2, z + step / 2) < -0.5 ? '.' : ' ';
      }
      console.log(String(z).padStart(6) + ' ' + row);
    }
    }
  }
  }
}
