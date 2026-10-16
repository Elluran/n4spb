// Public-transport queues on Vasilievsky Island (no GPU): builds environment + streets + bridges + traffic, puts the camera at each probe point (the regional simulation follows it), runs the simulation for
// --seconds (default 420) and every 5 s counts the buses / trolleybuses within 450 m of the point, how many of them stand (speed < 0.3 m/s) and the longest chain of standing ones (neighbours within 32 m).
// A chain of more than --maxchain (default 7) standing buses for more than a quarter of the samples is reported as a convoy (a real stop pocket serves 2-3 buses at a time).
// usage: NODE_OPTIONS=--max-old-space-size=14000 node tools/traffic-vo-queue.mjs [--seconds 420] [--only sredny,bolshoy] [--maxchain 7]       exit code 1 when a probe shows a convoy
import { world, flag } from './traffic-harness.mjs';

const PROBES = { nevsky: null, petro: [-4050, -2910], sredny: [-5300, -450], bolshoy: [-4400, -330], line8: [-3950, -700], maly: [-6300, -570], univ: [-3330, -950], nalichnaya: [-6700, -1150] };
const only = flag('only', false) ? String(flag('only')).split(',') : Object.keys(PROBES);
const SEC = Number(flag('seconds', 420)), MAXCH = Number(flag('maxchain', 7));
const { ctx, frame } = await world(['environment', 'streets', 'bridges', 'traffic']);
const svc = ctx.services.traffic;
// control: a point on Nevsky prospekt west of the Fontanka (the old reviewed district: the same stop rules, no island routes)
{ const lanes = ctx.services.streets.lanes || []; let best = null; for (const l of lanes) { if (!/Невск/.test(l.name || '')) continue; const p = l.pts && l.pts[Math.floor(l.pts.length / 2)]; if (p && p[0] < -1200 && p[0] > -1900 && (!best || p[0] > best[0])) best = [p[0], p[2] !== undefined ? p[2] : p[1]]; } PROBES.nevsky = best || [-1500, -1200]; console.log('nevsky control at', PROBES.nevsky.map(Math.round)); }
const isPT = (v) => /^(bus|artic|midi|dd|coach|trolley|trolley2)$/.test(v.kind);
let bad = false, T = 0;
for (const name of only) {
  const [cx, cz] = PROBES[name];
  const t0 = T; const S = { n: 0, pt: 0, stand: 0, chainMax: 0, convoySamples: 0 };
  const samples = [];
  for (let k = 0; k < SEC / 1; k++) {
    T += 1; frame(T, cx, cz, 1);
    if (k % 5 !== 4 || T - t0 < 90) continue;
    const pts = (svc.vehicles || []).filter((v) => isPT(v) && Math.hypot(v.x - cx, v.z - cz) < 450);
    const st = pts.filter((v) => v.speed < 0.3);
    // chains of standing buses
    const seen = new Set(); let best = 0;
    for (const a of st) { if (seen.has(a)) continue; let n = 0; const q = [a]; seen.add(a); while (q.length) { const c = q.pop(); n++; for (const b of st) if (!seen.has(b) && Math.hypot(b.x - c.x, b.z - c.z) < 32) { seen.add(b); q.push(b); } } best = Math.max(best, n); }
    S.n++; S.pt += pts.length; S.stand += st.length; S.chainMax = Math.max(S.chainMax, best); if (best > MAXCH) S.convoySamples++;
    samples.push(best);
  }
  const convoy = S.n && S.convoySamples / S.n > 0.25;
  if (convoy) bad = true;
  console.log(`${name.padEnd(11)} at ${cx},${cz}: samples ${S.n}, public transport within 450 m avg ${(S.pt / S.n).toFixed(1)}, standing avg ${(S.stand / S.n).toFixed(1)}, longest standing chain ${S.chainMax}, samples above ${MAXCH}: ${S.convoySamples}${convoy ? '  CONVOY' : ''}`);
}
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
