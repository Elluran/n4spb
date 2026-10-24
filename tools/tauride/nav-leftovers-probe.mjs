// nav-leftovers-probe.mjs - the M7b leftovers of people/nav.js and the view spots (docs/TAURIDE-REMAKE.md T7). The --eval script of tools/people-test.mjs:
//   node tools/area.mjs north tools/people-test.mjs --at tauride --eval tools/tauride/nav-leftovers-probe.mjs [--seconds 60]
// (1) THE DOOR UNION: HOOKS.doorServices (the North: landmarksNorthFull, landmarksOktyabrsky) names the landmark services whose `entrances` with a facing (rotY) are pedestrian doors besides the city's:
//     every such point inside a people zone (zoneW > 0.3, the city's own test) is a nav entrance with an access node on the main network, flagged `svc`; walkers GO to them (a.goal.type 'door' with
//     e.svc) while the player stands near; MUTANT: the nav built again with HOOKS.doorServices emptied has none (and the strip, which names no service, has none by construction).
// (2) THE VIEW SPOTS: the monuments and photo spots that the landmark modules merge into ctx.services.landmarks yield nav spots when a network is there: the Kapodistrias monument (28 stands + the
//     photo-spot views), the garden's monuments and the fountain (landmarksTauride); MUTANT: the nav built again without those records has no spot with their ids / names. The Church of Simeon and
//     Anna stands on a pavement island of 4 nodes outside every people zone: its photo spot yields a nav spot only when the area gives it a peopleHot row (reported, not asserted: area.js is not
//     the garden team's file).
// RESULT: OK needs (1) and (2) green with both mutants red.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function (ctx, L, THREE) {
  const argv = process.argv, opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
  const SEC = Number(opt('seconds', 60)), sim = ctx.services.people.sim, upd = ctx._updates, dt = 1 / 60, every = 60, nav = sim.nav, S = ctx.services;
  const root = process.cwd();
  const { HOOKS } = await import(pathToFileURL(path.join(root, 'src/world/lib/area-tables.js')).href);
  const { buildNav } = await import(pathToFileURL(path.join(root, 'src/world/people/nav.js')).href);
  const fails = []; const check = (c, m) => { if (!c) { fails.push(m); console.log('FAIL:', m); } else console.log('ok:', m); };
  const cfg = { mars: { off: true, zones: [], scale: 1 }, garden: { factor: 0.22, maxPeople: 60 }, west: { scale: 1, platforms: 1 }, station: undefined };

  // ------------------------------------------------------------ (1) the doors
  check(Array.isArray(HOOKS.doorServices) && HOOKS.doorServices.includes('landmarksNorthFull') && HOOKS.doorServices.includes('landmarksOktyabrsky'), 'HOOKS.doorServices names landmarksNorthFull and landmarksOktyabrsky (' + JSON.stringify(HOOKS.doorServices) + ')');
  const doors = nav.entrances.filter((e) => e.svc);
  const pts = HOOKS.doorServices.flatMap((k) => (S[k]?.entrances || []).filter((e) => Number.isFinite(e.rotY)));
  const inZone = pts.filter((e) => nav.inPlay(e.x, e.z, -4) && nav.zoneW(e.x, e.z) > 0.3);
  console.log(`landmark door points with a facing: ${pts.length}, in a people zone: ${inZone.length}, nav doors: ${doors.length} (stats.landmarkDoors ${nav.stats.landmarkDoors})`);
  check(doors.length >= 1 && nav.stats.landmarkDoors === doors.length, 'the nav holds the landmark doors that lie in a people zone (' + doors.length + ')');
  check(doors.length <= inZone.length && doors.every((d) => inZone.some((e) => e.x === d.x && e.z === d.z)), 'every nav landmark door is a published door point of the zone');
  check(doors.every((d) => nav.mainOK(d.node) && Math.hypot(nav.N.x[d.node] - d.x, nav.N.z[d.node] - d.z) < 6), 'each has an access node on the main network within 6 m of the door');
  check(!pts.some((e) => !Number.isFinite(e.rotY) && nav.entrances.some((d) => d.svc && d.x === e.x && d.z === e.z)), 'a point without a facing (a clearing disc) is no door');
  // the other half of the union: the city doors are unchanged in number and order (the city loop runs first)
  const cityDoors = nav.entrances.filter((e) => !e.svc && e.kind === 'door');
  const firstSvc = nav.entrances.findIndex((e) => e.svc), lastCity = nav.entrances.map((e) => !e.svc && e.kind === 'door').lastIndexOf(true);
  check(firstSvc < 0 || firstSvc > lastCity, 'the city doors keep their indices (the landmark doors are appended after them): ' + cityDoors.length + ' city doors');
  // walkers go to them
  const seen = new Map(); let samples = 0, t = 0;
  const spotsOf = [...new Map(doors.map((d) => [Math.round(d.x / 40) + ',' + Math.round(d.z / 40), d])).values()].slice(0, 3);
  for (const d of spotsOf) {
    for (let i = 1; i <= Math.round(SEC / dt); i++) {
      t += dt; ctx.time = t; ctx.shared.uTime.value = t;
      ctx.player.position.set(d.ax, 0, d.az); ctx.camera.position.set(d.ax, 1.7, d.az); ctx.camera.updateMatrixWorld(true);
      for (const fn of upd) fn(dt, t);
      if (i % every) continue;
      for (const a of sim.agents) { samples++; if (a.goal && a.goal.type === 'door' && a.goal.e && a.goal.e.svc && !seen.has(a.i)) seen.set(a.i, a.goal.e.svc + ':' + a.goal.e.bldg); }
    }
  }
  console.log(`walkers heading for a landmark door over ${spotsOf.length} x ${SEC} s: ${seen.size} ${JSON.stringify([...new Set(seen.values())])}`);
  check(seen.size >= 1, 'walkers walk to the landmark doors (>= 1 distinct walker with a door goal of a landmark service)');
  // MUTANT: the nav built again without the hook
  const quiet = (fn) => { const log = console.log; console.log = () => {}; try { return fn(); } finally { console.log = log; } };
  let n2;
  { const keep = HOOKS.doorServices; HOOKS.doorServices = []; try { n2 = quiet(() => buildNav(ctx, cfg)); } finally { HOOKS.doorServices = keep; } }
  check(n2.stats.landmarkDoors === 0 && !n2.entrances.some((e) => e.svc), 'MUTANT (HOOKS.doorServices emptied): the rebuilt nav has no landmark door (' + n2.stats.landmarkDoors + ')');
  let n3 = quiet(() => buildNav(ctx, cfg));
  check(n3.stats.landmarkDoors === nav.stats.landmarkDoors && n3.entrances.length === nav.entrances.length, 'a second build with the hook gives the same doors (' + n3.stats.landmarkDoors + ', ' + n3.entrances.length + ' entrances): deterministic');

  // ------------------------------------------------------------ (2) the view spots
  const KAP = 'n1372027612', KAPN = 'Памятник Каподистрии', CHURCH = 'Церковь Симеона и Анны';
  const kapStands = nav.spots.filter((p) => p.id === KAP), kapViews = nav.spots.filter((p) => p.type === 'view' && p.name === KAPN);
  check(kapStands.length >= 20 && kapViews.length >= 3, `the Kapodistrias monument yields nav spots (${kapStands.length} stands round it, ${kapViews.length} photo-spot views)`);
  const T = S.landmarksTauride, monIds = new Set(T.monuments.list.map((m) => m.id)), photoNames = new Set(T.monuments.photoSpots.map((p) => p.name));
  const gStands = nav.spots.filter((p) => monIds.has(p.id)), gViews = nav.spots.filter((p) => p.type === 'view' && photoNames.has(p.name));
  check(gStands.length >= 20 && gViews.length >= 1, `the garden's monuments and the fountain yield nav spots (${gStands.length} stands round the ${monIds.size} monuments, ${gViews.length} photo-spot views of ${photoNames.size})`);
  const churchSpots = nav.spots.filter((p) => p.name === CHURCH);
  console.log(`the Church of Simeon and Anna: ${churchSpots.length} nav view spots (the photo spot lies on a 4-node pavement island outside every people zone; with a peopleHot row at (-270,-682) the nav gives it 4)`);
  // MUTANT: without the records of the Kapodistrias monument and the garden
  { const lm = S.landmarks, keepM = lm.monuments, keepP = lm.photoSpots;
    lm.monuments = keepM.filter((m) => m.id !== KAP && !monIds.has(m.id)); lm.photoSpots = keepP.filter((p) => p.name !== KAPN && !photoNames.has(p.name));
    let n4; try { n4 = quiet(() => buildNav(ctx, cfg)); } finally { lm.monuments = keepM; lm.photoSpots = keepP; }
    check(!n4.spots.some((p) => p.id === KAP || p.name === KAPN || monIds.has(p.id) || photoNames.has(p.name)), 'MUTANT (the records left out): the rebuilt nav has no spot of the Kapodistrias monument or the garden (' + n4.spots.length + ' spots left of ' + nav.spots.length + ')');
    const n5 = quiet(() => buildNav(ctx, cfg));
    check(n5.spots.length === nav.spots.length, 'a second build gives the same spots (' + n5.spots.length + ')'); }
  console.log(fails.length ? `RESULT: FAIL (${fails.length})` : 'RESULT: OK');
  process.exit(fails.length ? 1 : 0);
}
