import { bakedData } from '../core/baked-world.js';
import { PETRO_OFF, VO_OFF } from './people/petroarea.js';
import { VO_ZONES, VO_GENERIC_CAP } from './people/voarea.js';
import { ISL_ZONES, ISL_OFF } from './people/isl2area.js';
// people - the pedestrians of the centre of Saint Petersburg, a July afternoon around 16:30: ~1150 anime people (docs/research/people.md) walking the real pavements, zebras, the paving of
// Vosstaniya Square, the Anichkov Bridge, the Moscow Station forecourt / hall / platforms, going in and out of the metro doors, photographing the Klodt horses and the obelisk, following
// tour guides (a plain coloured UMBRELLA - no flags), queueing at kerbs and taxis, sitting on benches, riding bikes / e-scooters, pushing prams, walking dogs, busking, painting portraits,
// sweeping the pavement, patrolling in pairs.  Cel-shaded instanced figures (people/chars.js: ~70 instanced meshes with persistent per-variant slots: only the people within the render
// radius are drawn), driven by a fixed-step agent simulation (people/sim.js) on a routing graph built from the streets / city / landmarks / rail / metro services (people/nav.js, station.js).
// Population plan: people/scenes.js + vignettes.js.  Interface between the halves: people/contract.js.
// THE WEST (Gostiny Dvor - Nevsky - the Admiralty, Palace Square, the gardens, the canals; docs/research/west-life-furniture.md): the routing graph covers the new pavements, squares, sett fields, the
// bridge decks (pavement bands of bridges/sites.js, at deck height), the open arcade of Gostiny Dvor, the three Winter Palace gateways, the Admiralty gate, the Kazan colonnade (stylobate included) and
// keeps off the steps / stylobates / plinths / fountain rims / stair descents of the landmark modules (their walk boxes are keep-out obstacles); the zone field (zones.js) puts the tourist-centre crowd
// (Kazan bridge 26 per 10 m, Kazan, Palace Square, Gostiny Dvor, the gardens) on top of the east table; people/west.js scripts ~25 places from the landmark services (guided groups with umbrellas, the
// Column ring, the Hermitage queue, buskers, painters, weddings, vendors at the kiosks, couples at the canal descents ...); people/metrolife.js puts passengers on the platforms of Gostiny Dvor,
// Nevsky Prospekt and Admiralteyskaya (underground agents, drawn only while the camera is below the street); every metro door of the metro service is a flow goal.
// THE MARS FIELD / SUMMER GARDEN / ENGINEERING CASTLE (docs/MARS-BRIEF.md): people/area.js rasters the pedestrian surfaces the landmark modules draw themselves (gravel alleys, the memorial plaza, the garden alleys and
// fountain squares, the castle footways; the Garden lawns are vetoed: nobody walks on them) and the routing lattice runs over them (Field + Suvorov Square + the embankment + Swan bridge + the garden are ONE component);
// zones.js has the hot spots (the Eternal Flame, the central gate, Krylov, the Summer Palace, Peter I ...); people/mars.js scripts ~215 people (flame ring, wedding, tour groups with a plain umbrella, queue at the
// central gate, strollers / prams / joggers / dog walkers as RESIDENT walkers, statue admirers, kids at Krylov, a busker at the Peter I monument, a school excursion at the castle portal ...); DENSITY.mars.zones caps
// the head count of the three zones (soft: people pass through), the Summer Garden is shut at night (people leave it, nobody enters).
// THE ISLANDS OF ROUND 2 (docs/research/people-isl2.md, docs/ISLANDS2-BRIEF.md): people/isl2area.js rasters the islands (Yelagin, Kamenny, Aptekarsky, Petrovsky + the Krestovsky arena apron: outlines, 30 stay zones with caps
// (DENSITY.isl), the named streets, the park footways of the sight zones, the crowd discs of the twenty-one island sight services, CLOSED TERRITORY: the Kamenny palace garden and yard, the yacht clubs of Petrovskaya kosa, the nurseries of the
// Botanical Garden, building sites and shipyards: no lattice node, no footway node, no door goal, no scripted spot) and is composed into nav.area (people/area.js); nav.js lets the stricter island rules of Vasilievsky Island apply there too (deep
// ground / flights / descents blocked, lattice cells off the rim of a footprint, the stair keep-outs, benches / photo spots / monument footprints of the sight services) and treats every bridge deck of services.bridges.deckY on an island as a walkable
// plank deck (the park bridges, the Yelagin bridges); zones.js adds the hot spots; people/isl2.js scripts ~30 places (the sunset gathering on the west spit terrace, the palace stairs + Butter Meadow, the Kitchen portico / Stable gate / Orangery, the East
// pavilion wedding, the Estradny theatre audience on its terraces, the boat-rental queue, Hercules, Green Beach, the mini-zoo, the Kamenny avenue / church / Starogo Teatra square, the Palm House excursion groups, the Botanical Garden alleys, LETI,
// Petrovsky Park, Betancourt Plaza, the arena apron, anglers) + resident walkers per zone.  ?isl=off (tools: --isloff) restores the old reach exactly (A / B); ?petro=off switches the islands off too.
// Test: node tools/people-test.mjs --minutes 3 --at kazan|palace|gostiny|admiralty|isaac|catherine|alexander|hermitage|kazanbridge|moika|horseman|station|flame|field|garden|krylov|peter|swan|suvorov|castle|marble|embankment [--night] [--q low]
//       (--probe / --eval / --items: debug aids; tools/people-mars-probe.mjs, people-mars-run.mjs, people-mars-flow.mjs are --eval scripts for the new reach).
//
// Behaviour: routes keep to pavements, zebras, squares, the bridge pavements, the hall and the platforms; signalised zebras are entered on pedState 'walk' only (queues at the kerb), side-street
// mouths and unsignalised zebras when no car is close; benches, bus stops, metro doors (people walk in and fade at the door, others come out), photo spots; nobody appears or vanishes in view
// except at doors; people step around the player and glance at the camera (non-solid: ?psolid=1 makes them colliders).  Night (?tod=night): ~22 % of the people stay.
// Quality: ctx.quality.name 'high' | 'medium' | 'low' scales the population 1 / 0.7 / 0.45 and the render radius 250 / 190 / 130 m (URL ?pdens=1.3 multiplies the population, ?prad=300 sets the radius).
// THE PETROGRAD SIDE / THE SPIT (docs/PETRO-BRIEF.md): people/petroarea.js rasters the surfaces (the avenue and embankment pavements, the fortress island, the park and garden footways), the zone weights and ten
// quiet zones (DENSITY.petro.zones); nav.js lays a pavement chain on both pavements of the Trinity, Palace, Birzhevoy, Tuchkov and Sampsonievsky bridges (at DECK height: services.bridges.spans / deckY),
// on the Zhdanovsky footbridge and the two timber bridges of the fortress, and a chain through each of the six fortress gates; people/petro.js scripts the places (the cathedral square, the beach wall,
// the roof walk, the Spit descent with newlyweds, the Aurora quay with cadets, the anglers on the embankments, cafe terraces on Bolshoy pr. ...).
// URL: ?people=lineup (characters lineup), ?people=nav (draw the routing graph), ?people=off, ?mars=off (without the Mars Field / Summer Garden / castle population), ?petro=off (without the Petrograd side / Spit population).
// Services: ctx.services.people = { walkerPaths: [{id, pts, kind}], crossingBusy(crossingId), crossers(), count, positions(), list(), nav stats, triangles / drawCalls }.
// ================================================================== DENSITY: the tuning table (everything that scales the crowd lives here)
// global     overall population multiplier (1 = the research plan of ~1250 people; quality tiers 'medium' / 'low' scale it by 0.7 / 0.45 on top)
// station    the Moscow-station zone: within `radius` m of the segments (Vosstaniya Square - forecourt - hall) and of the platform rectangles (+ rectRadius m) the people density
//            is `factor` x the plan (hall seats, taxi queues, passengers, photographers, smokers, goals and the player-following re-placement are thinned), fading to 1 over `fade` m.
//            maxPeople: a hard head count for the zone (nobody picks a target / is re-placed there while it is full).
//            The Nevsky pavement crowd between Mayakovskaya and the Fontanka is not touched.
export const DENSITY = {
  global: 0.72,
  tauride: { factor: 0.22, maxPeople: 60 },
  station: { factor: 0.35, maxPeople: 330, radius: 220, fade: 80, rectRadius: 40, segments: [[592, 165, 612, 330]], rects: [[560, 400, 790, 1100]] },
  // the WEST (Gostiny Dvor - the Admiralty; people/west.js): `scale` multiplies the counts of the scripted places (Kazan, Palace Square, the gardens, the bridges ...); `platforms` the passengers on the
  // platforms of the three west metro stations (people/metrolife.js, ~70 at 1). The population total targets 1000-1400 (the walkers follow the player: the crowd around the camera comes from them).
  west: { scale: 0.55, platforms: 0.75 },
  // the MARS FIELD / SUMMER GARDEN / ENGINEERING CASTLE reach (people/mars.js, people/area.js): `scale` multiplies the counts of the scripted places; `zones` are head-count caps of the three quiet zones
  // (nav.marsZone: 0 the Field + Suvorov Square + the Marble Palace, 1 the Summer Garden + the Neva embankment in front of the fence, 2 the castle precinct): while a zone holds `maxPeople` visible people
  // (scripted ones included) nobody is re-placed / picks a target there. The summer afternoon is busy, but this is not Nevsky.
  mars: { scale: 0.55, zones: [{ name: 'field', maxPeople: 150 }, { name: 'garden', maxPeople: 170, shut: true }, { name: 'castle', maxPeople: 70 },
    // the SOUTH-WEST (people/sw.js): Teatralnaya Square + Mariinsky, Yusupov Palace + garden, New Holland (shut at night), Nikolsky Cathedral + garden
    { name: 'mariinsky', maxPeople: 70 }, { name: 'yusupov', maxPeople: 40 }, { name: 'newholland', maxPeople: 110, shut: true }, { name: 'nikolsky', maxPeople: 60 }, { name: 'sennaya', maxPeople: 30 }] },
  // the PETROGRAD SIDE and the SPIT of Vasilievsky Island (people/petro.js, people/petroarea.js): `scale` multiplies the counts of the scripted places; `zones` are the head-count caps of the ten zones of
  // petroarea.js PETRO_ZONES in THAT order (they follow the eight zones above: nav.marsZone returns 8 + the local index). The whole reach is covered by a zone, so the crowd that follows the player is capped
  // everywhere: a sight holds its scripted people + walkers up to the cap, the avenues about two people per 10 m of pavement round the player, a bridge deck a few dozen. The fortress is shut at night.
  // `stay`: the walkers inside a full zone keep their goals inside it (the cap only closes the zone for people from outside): these zones are hundreds of metres wide, a walker has nowhere else to go.
  petro: { scale: 0.55, zones: [{ name: 'fortress', maxPeople: 175, shut: true, stay: true }, { name: 'strelka', maxPeople: 120, stay: true }, { name: 'university', maxPeople: 60, stay: true }, { name: 'troitskaya', maxPeople: 85, stay: true },
    { name: 'kronverk', maxPeople: 110, stay: true }, { name: 'aurora', maxPeople: 90, stay: true }, { name: 'petro', maxPeople: 200, stay: true }, { name: 'vladimir', maxPeople: 70, stay: true }, { name: 'bridges', maxPeople: 84, stay: true }, { name: 'vo', maxPeople: 60, stay: true }] },
  // VASILIEVSKY ISLAND (people/vo.js, people/voarea.js, docs/research/vo-roster-metro.md section 4): `scale` multiplies the counts of the scripted places; `zones` are the head-count caps of the eighteen stay zones of the
  // sights and the flows, in the order of voarea.js VO_ZONES (nav.marsZone returns 18 + the index: they follow the ten zones above); the generic island zone 'vo' (the streets of the island that belong to no sight)
  // is the last of the ten above and takes `genericCap` instead of its 60 when the island is on.  ?vo=off restores the old reach (the Spit part only, cap 60).
  vo: { scale: 0.55, genericCap: VO_GENERIC_CAP, zones: VO_ZONES.map((z) => ({ name: z.name, maxPeople: z.maxPeople, stay: true })) },
  // THE ISLANDS OF ROUND 2 (people/isl2area.js, people/isl2.js, docs/research/people-isl2.md): Yelagin (the spit terrace at sunset, the palace stairs, the Kitchen portico, the theatre, the boat rental, Hercules, Green Beach), Kamenny (the avenue, the church
  // forecourt, the closed palace garden), Aptekarsky (the Botanical Garden), Petrovsky (the park, Betancourt Plaza) and the Krestovsky arena apron: `scale` multiplies the counts of the scripted places; `zones` are the head-count caps of the
  // zones of ISL_ZONES in THAT order (nav.marsZone returns the number of older zones + the index); all `stay`. ?isl=off (tools: --isloff) restores the old reach exactly; ?petro=off switches the islands off too.
  isl: { scale: 0.55, zones: ISL_ZONES.map((z) => ({ name: z.name, maxPeople: z.maxPeople, stay: true, shut: !!z.shut })) },
};
const URLQ = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams('');

export async function build(ctx) {
  ctx.services.people = { walkerPaths: [], crossingBusy: () => false };
  const mode = URLQ.get('people');
  if (mode === 'lineup') { const m = await import('./people/lineup.js'); await m.buildLineup(ctx); return; }
  if (mode === 'off') return;
  const { THREE } = ctx;
  const [{ buildNav }, { createCrowd }, { createSim, STEP, MICRO }, { populate }] = await Promise.all([import('./people/nav.js'), import('./people/chars.js'), import('./people/sim.js'), import('./people/scenes.js')]);
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const tm = { t0 }, tick = (k) => { tm[k] = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - tm.t0); };
  ctx.navBake = await bakedData(ctx, `nav-${ctx.quality.name}`);
  const qf = ctx.quality && ctx.quality.name === 'low' ? 0.45 : ctx.quality && ctx.quality.name === 'medium' ? 0.7 : 1;        // the quality tiers scale the head-count caps of the Mars / Garden / castle zones too
  const marsOff = URLQ.get('mars') === 'off' || !!globalThis.__marsOff;                  // ?mars=off: the pre-Mars population (A / B comparisons)
  const petroOff = marsOff || PETRO_OFF || !!globalThis.__petroOff;                       // ?petro=off: without the population of the Petrograd side / the Spit (A / B comparisons)
  const voOff = petroOff || VO_OFF || !!globalThis.__voOff;                               // ?vo=off: without the population of Vasilievsky Island (A / B comparisons; ?petro=off switches it off too)
  const islOff = petroOff || ISL_OFF || !!globalThis.__islOff;                           // ?isl=off: without the population of the islands of round 2 (Yelagin, Kamenny, Aptekarsky, Petrovsky; ?petro=off switches it off too)
  const zoneCaps = [...DENSITY.mars.zones, ...(petroOff ? [] : DENSITY.petro.zones.map((z) => (z.name === 'vo' && !voOff ? { ...z, maxPeople: DENSITY.vo.genericCap } : z))), ...(voOff ? [] : DENSITY.vo.zones)].map((z) => ({ ...z, maxPeople: Math.round(z.maxPeople * qf) }));
  const islBase = islOff ? -1 : zoneCaps.length;                                          // the islands' zones follow the older ones: global index = islBase + the position in ISL_ZONES
  if (!islOff) zoneCaps.push(...DENSITY.isl.zones.map((z) => ({ ...z, maxPeople: Math.round(z.maxPeople * qf) })));
  const nav = buildNav(ctx, { ...DENSITY, islBase, mars: marsOff ? { off: true, zones: [], scale: 1 } : { ...DENSITY.mars, zones: zoneCaps } }); tick('nav');
  ctx.navBake = null; ctx.baked?.release?.(`nav-${ctx.quality.name}`);
  const crowd = createCrowd(ctx); tick('crowd');
  const sim = createSim(ctx, nav, crowd); tick('sim');
  const q = ctx.quality && ctx.quality.name, density = (q === 'low' ? 0.45 : q === 'medium' ? 0.7 : 1) * (Number(URLQ.get('pdens')) || 1) * DENSITY.global;
  sim.renderR = Number(URLQ.get('prad')) || (q === 'low' ? 130 : q === 'medium' ? 190 : 250); sim.farR = sim.farEff = q === 'low' ? 40 : q === 'medium' ? 55 : 70; sim.nearCap = q === 'low' ? 120 : q === 'medium' ? 180 : 250;
  const plan = populate(ctx, nav, sim, { density, west: DENSITY.west, mars: DENSITY.mars, petro: petroOff ? null : DENSITY.petro, vo: voOff ? null : DENSITY.vo, isl: islOff ? null : DENSITY.isl, qf }); tick('populate');
  crowd.finalize(); tick('finalize');
  sim.init(0); tick('init');

  // ---- update: fixed 0.1 s sim steps driven by t (deterministic: window.__sim steps from t = 0), interpolated render
  const DT = STEP / MICRO; let next = DT, lastNight = -1;
  // (round 3, 2026-10-16) a live frame runs at most MAX_STEPS micro steps (4 = 67 ms of sim): after a long frame (a GC pause, a region attach) the sim no longer replays every missed
  // step inside the next frame (a 500 ms pause = 30 steps = ~150 ms more), it catches up one step per frame; a screenshot's __sim and the headless tests (no ctx.frameStep) stay exact. ?pcap= steps
  const MAX_STEPS = Number(URLQ.get('pcap')) || 4;
  ctx.onUpdate((dt, t) => {
    let guard = 0; const cap = ctx.frameStep ? MAX_STEPS : 60000; while (next <= t + 1e-6 && guard++ < cap) { sim.update(next); next += DT; }
    if (t < next - DT - 1e-3) { /* time went backwards (a new __sim): keep the state, only render */ }
    const nt = ctx.shared.uNight.value; if (Math.abs(nt - lastNight) > 0.1) { lastNight = nt; crowd.setNight(nt); }
    sim.render(t);
  });

  // ---- people are NON-SOLID (lead's brief): they step around the player and are pushed out of the player's circle by the simulation. ?psolid=1 makes the people within 5 m dynamic colliders
  //      (the Yakutsk behaviour: the player cannot walk through them)
  const boxes = [], pp = ctx.player.position;
  if (URLQ.get('psolid') === '1') ctx.physics.addDynamic(() => {
    boxes.length = 0;
    for (const a of sim.agents) {
      if (a.hidden || a.kind === 'sit') continue; const dx = a.x - pp.x, dz = a.z - pp.z; if (dx * dx + dz * dz > 25) continue;
      const w = a.r * 1.7; boxes.push({ cx: a.x, cz: a.z, w, d: w, rotY: 0, y0: a.y - 0.1, y1: a.y + 1.8 });
    }
    return boxes;
  });

  // ---- services
  const wp = []; const st = ctx.services.streets;
  if (st) { for (const s of st.sidewalks || []) wp.push({ id: 'sw', pts: s.pts, kind: 'sidewalk' }); for (const p of st.paths || []) wp.push({ id: p.id, pts: p.pts, kind: 'path' }); }
  const busy = new Set();                                            // crossing record indices with somebody on the zebra (recomputed lazily once per sim step)
  let busyStep = -1;
  const refreshBusy = () => { if (busyStep === sim.steps) return; busyStep = sim.steps; busy.clear(); for (const a of sim.agents) if (!a.hidden && a.crossIdx >= 0) busy.add(a.crossIdx); };
  ctx.services.people = {
    walkerPaths: wp, count: sim.agents.length, plan, nav: nav.stats, sim, crowd,
    positions: () => sim.agents.filter((a) => !a.hidden).map((a) => ({ x: a.x, z: a.z })),
    list: () => sim.agents.map((a) => ({ i: a.i, x: a.x, z: a.z, y: a.y, yaw: a.yaw, kind: a.kind, scene: a.scene, hidden: a.hidden, crossIdx: a.crossIdx, speed: a.speed })),
    /** people on a zebra right now (for the traffic module: cars give way): [{ x, z, crosswalk (street crossing id) }] */
    crossers: () => sim.agents.filter((a) => !a.hidden && a.crossIdx >= 0).map((a) => ({ x: a.x, z: a.z, crosswalk: nav.crosswalks[a.crossIdx].id })),
    /** somebody is on (or waiting to enter) the zebra with this streets crossing id (also the second half of a merged two-carriageway zebra) */
    crossingBusy: (id) => { refreshBusy(); const i = nav.crossIndexById.get(id); return i !== undefined && busy.has(i); },
    trisPerPerson: crowd.trisPerPerson, drawCalls: crowd.drawCalls, shown: () => crowd.shownCount,
  };
  ctx.services.people.triangles = Math.round(crowd.trisPerPerson * 450);
  if (URLQ.get('people') === 'nav') drawGraph(ctx, nav, THREE);
  ctx.services.people.buildMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0); ctx.services.people.phases = tm;
}

function drawGraph(ctx, nav, THREE) {
  const pos = [], col = [], N = nav.N;
  for (const e of nav.E) { const c = e.kind === 1 ? [1, 0.2, 0.2] : nav.comp[e.a] === nav.main ? [0.3, 0.9, 0.4] : [0.3, 0.6, 1]; pos.push(N.x[e.a], N.y[e.a] + 0.5, N.z[e.a], N.x[e.b], N.y[e.b] + 0.5, N.z[e.b]); col.push(...c, ...c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true })); m.frustumCulled = false; ctx.noOutline(m); ctx.add(m);
}
