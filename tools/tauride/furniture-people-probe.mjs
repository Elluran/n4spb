// furniture-people-probe.mjs - do the pedestrians of the North use the furniture of the Tauride Garden (docs/TAURIDE-REMAKE.md T6)? The --eval script of tools/people-test.mjs:
//   node tools/area.mjs north tools/people-test.mjs --at tauride --eval tools/tauride/furniture-people-probe.mjs [--seconds 75] [--spots a,b,...]
// The script receives the built ctx (environment, streets, city, landmarks incl. landmarksTauride, people). (1) nav.benches holds the garden's benches (ctx.services.landmarks.benches, where 'garden'): most of the 132 got a seat
// and an access node; (2) over the run walkers SIT on garden benches: a sitting walker (a.kind 'sit') stands at the seat of a garden bench at the bench's ground height; (3) nav.spots holds the stands round the garden's monuments
// and the photo spots, and walkers STAND there to photograph (a.goal.type 'spot' with a garden id or name); (4) a bench the car knocks takes its seats (nav.benchesNear) -- not run here (north-knock-test / people-test own that).
// The default is 6 spots x 75 s = 7.5 simulated minutes; RESULT: OK needs >= 1 distinct sitter on a garden bench and >= 1 distinct photographer at a garden monument or photo spot.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function (ctx, L, THREE) {
  const argv = process.argv, opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
  const SEC = Number(opt('seconds', 75)), sim = ctx.services.people.sim, upd = ctx._updates, dt = 1 / 60, every = 60, nav = sim.nav;
  const S = ctx.services.landmarksTauride; if (!S || !S.furniture) { console.log('RESULT: FAIL (no furniture service: landmarksTauride T6 not built?)'); process.exit(1); }
  const GH = await import(pathToFileURL(path.join(process.cwd(), 'src/world/landmarksTauride/height.js')).href);
  const monIds = new Set(S.monuments.list.map((m) => m.id)), photoNames = new Set(S.monuments.photoSpots.map((p) => p.name));
  // (1) the benches
  const garden = nav.benches.filter((b) => b.where === 'garden'), wantN = S.furniture.benches.length;
  const noSeat = garden.filter((b) => !b.seats.length).length;
  console.log(`nav.benches: ${nav.benches.length} in all, ${garden.length} of the garden's ${wantN} registered (each with seats and an access node), ${noSeat} without seats`);
  const monSpots = nav.spots.filter((p) => monIds.has(p.id)), viewSpots = nav.spots.filter((p) => p.type === 'view' && photoNames.has(p.name));
  console.log(`nav.spots: ${monSpots.length} stands round the ${monIds.size} garden monuments (${[...monIds].map((id) => monSpots.filter((p) => p.id === id).length).join(' / ')}), ${viewSpots.length} photo-spot views of the ${photoNames.size} garden photo spots`);
  const SPOTS = [['gate', 1226, -1285], ['central', 1130, -1455], ['memorial', 1371, -1458], ['fountain', 1282, -1405], ['west', 975, -1330], ['north', 1180, -1640]], only = opt('spots', null) ? String(opt('spots')).split(',') : null;
  const sitters = new Map(), shooters = new Map(), standers = new Map(); let t = 0, samples = 0, sitBadPos = 0, sitBadY = 0;
  const rows = [];
  for (const [name, sx, sz] of SPOTS) {
    if (only && !only.includes(name)) continue;
    let sit = 0, shoot = 0;
    for (let i = 1; i <= Math.round(SEC / dt); i++) {
      t += dt; ctx.time = t; ctx.shared.uTime.value = t;
      ctx.player.position.set(sx, 0, sz); ctx.camera.position.set(sx, 1.7, sz); ctx.camera.updateMatrixWorld(true);
      for (const fn of upd) fn(dt, t);
      if (i % every) continue;
      for (const a of sim.agents) {
        if (a.hidden || a.ug) continue;
        samples++;
        if (a.kind === 'sit' && a.seat && a.seat.b && a.seat.b.where === 'garden') {
          const b = a.seat.b, s = b.seats[a.seat.si];
          if (!sitters.has(a.i)) sitters.set(a.i, { x: a.x, z: a.z, bench: b });
          if (Math.hypot(a.x - s.x, a.z - s.z) > 0.6) sitBadPos++;
          if (Math.abs(a.y - (b.y ?? 0)) > 0.06) sitBadY++;
          sit++;
        }
        if (a.goal && a.goal.type === 'spot' && a.goal.p && (monIds.has(a.goal.p.id) || photoNames.has(a.goal.p.name)) && a.kind === 'stand') {
          if (!shooters.has(a.i)) shooters.set(a.i, { x: a.x, z: a.z, spot: a.goal.p.id || a.goal.p.name });
          shoot++;
        }
      }
    }
    rows.push(`  ${name.padEnd(9)} sitting samples ${String(sit).padStart(4)}, photographing samples ${String(shoot).padStart(4)}`);
  }
  console.log(`people probe: ${SEC} s per spot, ${samples} walker samples`); for (const r of rows) console.log(r);
  console.log(`distinct walkers seen sitting on a garden bench: ${sitters.size} (seat position off by more than 0.6 m: ${sitBadPos} samples, height off by more than 6 cm: ${sitBadY} samples)`);
  console.log(`distinct walkers seen photographing at a garden monument or photo spot: ${shooters.size} ${JSON.stringify([...new Set([...shooters.values()].map((q) => q.spot))])}`);
  const fails = [];
  if (garden.length < 0.85 * wantN) fails.push(`only ${garden.length} of ${wantN} garden benches registered in the nav`);
  if (monSpots.length < 20) fails.push(`only ${monSpots.length} monument stands in the nav`);
  if (sitters.size < 1) fails.push('nobody sat on a garden bench');
  if (sitBadPos || sitBadY) fails.push('a sitter off the seat');
  if (shooters.size < 1) fails.push('nobody photographed a garden monument');
  void GH;
  console.log(fails.length ? `RESULT: FAIL (${fails.join('; ')})` : 'RESULT: OK');
  process.exit(fails.length ? 1 : 0);
}
