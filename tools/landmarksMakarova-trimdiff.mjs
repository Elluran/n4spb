// tools/landmarksMakarova-trimdiff.mjs - diff two trimscan results (module off / on): per pose the calls delta and the kinds that grew.
// usage: node tools/landmarksMakarova-trimdiff.mjs off.json on.json [names,comma,list]
import fs from 'node:fs';
const [a, b] = [process.argv[2], process.argv[3]].map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const names = (process.argv[4] || '').split(',');
a.forEach((pa, i) => {
  const pb = b[i], ma = new Map(pa.kinds.map((k) => [k.key, k])), rows = [];
  for (const k of pb.kinds) { const o = ma.get(k.key); const d = k.n - (o ? o.n : 0); if (d) rows.push([d, k.key, k.tris - (o ? o.tris : 0)]); }
  for (const k of pa.kinds) if (!pb.kinds.some((x) => x.key === k.key)) rows.push([-k.n, k.key, -k.tris]);
  rows.sort((x, y) => y[0] - x[0]);
  console.log(`== ${names[i] || i}: scan calls ${pa.calls} -> ${pb.calls} (${pb.calls - pa.calls >= 0 ? '+' : ''}${pb.calls - pa.calls}); renderer calls ${pa.info} -> ${pb.info} (${pb.info - pa.info >= 0 ? '+' : ''}${pb.info - pa.info})`);
  for (const r of rows.slice(0, 30)) console.log(`   ${String(r[0]).padStart(4)}  ${r[1]}  (tris ${r[2]})`);
});
