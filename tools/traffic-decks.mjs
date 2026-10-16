// Headless check of the traffic ON the long bridge decks (no GPU): builds environment + streets + bridges + traffic, puts the camera on each bridge in turn (the regional simulation
// follows it), runs the module for --seconds (default 120) and samples every vehicle that is over the deck:
//   * it stands on the ROADWAY: its centre is not further from the bridge axis than the road half width minus half a car (0.9 m; trams: on their rails, checked by tools/traffic-test.mjs);
//     reported apart, not a failure: `over the kerb` = samples of a WIDE vehicle (bus, trolleybus) whose side stands more than 0.15 m beyond the kerb line (the kerb lane of the lane graph
//     is then closer to the kerb than half a bus: a matter of the lane geometry of streets / the road width of the deck);
//   * it rides the DECK: the height traffic.js gives it (rec.y) = services.bridges.deckY under it + 0.03 within 0.15 m (the mean of the two axles on a humped deck), never the street level
//     0.03 over the water, and it pitches with the slope;
//   * there IS traffic: at least one car (and, on the three tram bridges, one tram) was seen on the deck.
// usage: node tools/traffic-decks.mjs [--seconds 120] [--only trinity,palace,birzhevoy,tuchkov,samps]      exit code 1 on a failure
import { world, flag, imp } from './traffic-harness.mjs';

const TR = await imp('src/world/bridges/troitsky.js'), PA = await imp('src/world/bridges/palace.js'), S = await imp('src/world/bridges/sites.js');
let LONG = []; try { LONG = (await imp('src/world/bridges/long.js')).LONG; } catch (e) { /* none */ }
let specs = [{ ...TR.TROITSKY, id: 'trinity', len: TR.LEN, hw: TR.HW, road: TR.ROAD, tram: true }, { ...PA.PALACE, id: 'palace', len: 254.5, hw: 13.85, road: 11.0 }, ...LONG.filter((b) => !b.ped).map((b) => ({ id: b.id, cx: b.cx, cz: b.cz, b: b.b, len: b.len, hw: b.hw, road: b.road, tram: /tuchkov|samps/.test(b.id) }))];
if (flag('only', false)) specs = specs.filter((s) => String(flag('only')).split(',').some((k) => s.id.startsWith(k)));
const seconds = Number(flag('seconds', 120));
const first = specs[0] ? S.toWorld(specs[0], specs[0].len / 2, 0) : { x: 0, z: 0 };
const { ctx, L, frame } = await world(['environment', 'streets', 'bridges', 'traffic'], { camera: [first.x, first.z] });
const B = ctx.services.bridges, T = ctx.services.traffic;
if (!B || !T || !T.sim) { console.log('RESULT: FAIL (bridges / traffic did not build)'); process.exit(1); }
let bad = 0, t = 0;
for (const s of specs) {
  const A = (s.b - 90) * Math.PI / 180, c = Math.cos(A), sn = Math.sin(A), UV = (x, z) => [(x - s.cx) * c + (z - s.cz) * sn, -(x - s.cx) * sn + (z - s.cz) * c];
  // the camera stands at the middle of the part of the deck that lies in the play area
  let u0 = 0, u1 = s.len; const inP = (u) => { const w = S.toWorld(s, u, 0); return L.inPlay(w.x, w.z, 5); }; while (u0 < u1 && !inP(u0)) u0 += 2; while (u1 > u0 && !inP(u1)) u1 -= 2;
  const cam = S.toWorld(s, (u0 + u1) / 2, 0);
  const r = { id: s.id, samples: 0, cars: 0, trams: 0, maxOnDeck: 0, offRoad: 0, overKerb: 0, yBad: 0, yErr: 0, flat: 0, pitched: 0, eg: [] };
  for (let k = 0; k <= seconds * 2; k++, t += 0.5) {
    frame(t, cam.x, cam.z, 0.5);
    let on = 0;
    for (const v of T.sim.vehicles) {
      const rec = v.rec; if (!rec) continue;
      const q = UV(rec.x, rec.z); if (q[0] < 3 || q[0] > s.len - 3 || Math.abs(q[1]) > s.hw) continue;
      const dy = B.deckY(rec.x, rec.z); if (dy === null) continue;
      on++; r.samples++; if (v.tram) r.trams++; else r.cars++;
      if (!v.tram && Math.abs(q[1]) > s.road - 0.9 + 0.25) { r.offRoad++; if (r.eg.length < 4) r.eg.push(`off the roadway: ${v.kind} at u ${q[0].toFixed(0)} v ${q[1].toFixed(1)} (road +-${s.road})`); }
      else if (!v.tram && Math.abs(q[1]) + v.wid / 2 > s.road + 0.15) { r.overKerb++; if (!r.kerbEg) r.kerbEg = `${v.kind} at u ${q[0].toFixed(0)} of ${Math.round(s.len)}, v ${q[1].toFixed(1)}, side ${(Math.abs(q[1]) + v.wid / 2 - s.road).toFixed(2)} m beyond the kerb line (road +-${s.road})`; }
      const e = Math.abs(rec.y - dy - 0.03); r.yErr = Math.max(r.yErr, e);
      if (e > 0.15) { r.yBad++; if (r.eg.length < 4) r.eg.push(`height: ${v.kind} at u ${q[0].toFixed(0)} y ${rec.y.toFixed(2)} deck ${dy.toFixed(2)}`); }
      if (dy > 0.6 && rec.y < 0.1) r.flat++;
      if (Math.abs(rec.sp || 0) > 0.004) r.pitched++;
    }
    r.maxOnDeck = Math.max(r.maxOnDeck, on);
  }
  const ok = r.offRoad === 0 && r.yBad === 0 && r.flat === 0 && r.cars > 0 && (!s.tram || r.trams > 0);
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${s.id.padEnd(10)} camera ${Math.round(cam.x)},${Math.round(cam.z)}: up to ${r.maxOnDeck} vehicles on the deck at once, samples cars ${r.cars} trams ${r.trams}; off the roadway ${r.offRoad}, wrong height ${r.yBad} (max error ${r.yErr.toFixed(3)} m), at street level over the water ${r.flat}, pitched samples ${r.pitched}`);
  for (const m of r.eg) console.log('      ' + m);
  if (r.overKerb) console.log(`      note: ${r.overKerb} samples of a wide vehicle over the kerb line, e.g. ${r.kerbEg}`);
}
console.log('traffic stats', JSON.stringify(T.stats), 'trams on the map', T.sim.trams ? T.sim.trams.count() : 0);
console.log(bad ? `RESULT: FAIL (${bad} of ${specs.length})` : `RESULT: OK (${specs.length} decks)`);
process.exit(bad ? 1 : 0);
