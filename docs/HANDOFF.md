# Piter 3D — handoff (first build finished, 2026-10-02)

**2026-10-07: the whole-city performance pass is in `docs/PERFORMANCE.md` (first section: sector culling, size-class LOD, far proxies, loader fixes, new measuring tools) and `docs/PETRO-HANDOFF.md` has the state of the Petrograd extension.**

**NEXT SESSION: read `docs/NEXT-STEPS.md` first** (1. fix the cut trolleybus overhead wires, 2. extend the map west along Nevsky to the Admiralty / Palace Square with metro stations; it contains a ready-to-paste starting prompt).

Walkable anime cel-shaded three.js scene of central Saint Petersburg: Moscow Railway Station + Vosstaniya Square, Nevsky Prospekt to the Anichkov Bridge over the Fontanka, side streets, a metro with trains, ~1000 people, traffic, trains, boats, birds and a drivable car,
on real OSM footprints registered to the user's Yandex screenshot. Sibling of `../100_3d_moscow_city` and `../101_3d_yakutsk` (Yakutsk is the direct ancestor: a code library). `README.md` is the user-facing summary (controls, metro guide, gallery, how to extend).
Start: `node tools/serve.mjs` -> http://localhost:5176. **All 14 world modules are built and committed** (`git log`: "Piter 3D checkpoint 3 ... 18" and the commits between them). Gallery: `docs/images/*.jpg` from `node tools/tour.mjs`.

User content rules (they override research docs): **no flags, no sirens / alarm sounds, car horns are fine** (`docs/AGENT-BRIEF.md`). Cyrillic only through Write / Edit (never shell heredocs).

## State per module (header status blocks in each `src/world/<module>.js` have the details)

| module | state | open items (from the header blocks) |
|---|---|---|
| environment | done: ground with shaft holes, Fontanka trench + quay + water, lawns / beds, ~2000 trees, far skyline | - |
| streets | done: network, markings, 259 zebras, kerbs / pavements, bollards, 533 lamps, 114 signals, plates, stops, trolleybus wires, lane graph + signal plan, 965 parking slots (`docs/streets-api.md`) | **912 k triangles vs the 700 k budget** (roads / pavements ~570 k, lamps ~190 k, chain / rail posts ~130 k); Ligovsky median parking, guard stones, bus-lane pictogram, hatched islands, real steps |
| city | done: 1539 buildings, 14 archetypes in one wall shader, arches, roofs / mansards / dormers, balconies, erkers, shop signs, awnings (`docs/city-api.md`), ~0.9 M triangles | pitched roofs (decks are flat), glazed rooftop additions, wall lanterns, cables, ghost ads, blade signs, arch interiors beyond a plain vault, per-street tuning of Stalin / panel / modern variants, more KNOWN houses (Marata, Ligovsky, Vladimirsky), CLASSIC palette share still high |
| rail | done: 11 tracks, 6 platforms + canopies, catenary, yard, 10 timetabled trains with doors, services for people | overbridges, depot sheds, TEM18 shunters, switch blades, level crossings, station-name plates, stair niches along the platforms, Sapsan nose polish |
| landmarksA | done: station (facade, clock tower, roof lettering, hall with the Peter I bust, Kassovy zal), square + obelisk, Hotel Oktyabrskaya + roof sign, corner hotels, Galereya mall; night floodlighting | metro stairs in the station lobby, departure-board text on the ticket-hall boards, hotel ground-floor shopfronts are simple arches |
| landmarksB | done: Nevsky Atrium (+ Mayakovskaya arches), Yusupova, San Remo, Kozhevnikova, Dom zhurnalista, Nevsky Centre | close-up polish (Atrium corner windows, rustication contrast, signage variety); **built but dormant** `landmarksB/extras.js` (Colosseum, Ivanov 108, Teatr Sever, Nevsky Plaza, Nevsky Palace, house Rossiya: add their ids to sub-group `nevsky-corner`); Palkin 47, Bryun 82, Yakovlev 96, Maltsev 77 not started |
| landmarksC | done: Anichkov Bridge + four Klodt groups, Beloselsky palace, quay houses, 5 boats on a loop + 5 piers with moored boats | boats are not colliders (the quay is solid, the player cannot reach the water) |
| landmarksD | done: Vladimirsky Cathedral + bell tower, National Library, Mariinsky block, Tolstoy House, Vladimirsky Passage + Renaissance Hall, Dostoevsky statue | - |
| metro | done: Vosstaniya (rotunda, 116 m 3-lane escalator, pylon hall at -58 m, Vosstaniya-2 vestibule), Mayakovskaya, Vladimirskaya, Dostoevskaya, passages, real tunnel Vosstaniya <-> Vladimirskaya, trains both directions (120 s period), ride + map panel, ways out, tests | car-to-car walking, intermediate stops, Chernyshevskaya / Gostiny Dvor real halls, second door of Vosstaniya-2 (annex too small), ambient hum / a soft chime (nothing alarm-like); the V-2 room occupies a strip inside r2404499 that landmarksA must keep free (see `DOORWAYS`) |
| props | done: 202 benches, bins, urns, 66 verandas, kiosks, stalls, scooters, ad pillars, clocks | no street phone booths / street billboards (deliberate) |
| traffic | done: 21 archetypes, 252 moving + 756 parked, IDM simulation with signals, queues, stops, trolleybus poles; no sirens / beacons | - |
| people | done: ~1000 pedestrians (988 at t = 20 s, quality high), 20 vignettes, station / platform boarding, metro in / out; station crowd thinned to 35 % (`DENSITY` at the top of `people.js`) | 70 instanced part meshes are drawn three times (a `BatchedMesh` per material would cut it to ~6 draws); `tools/smoke.mjs` reports "npc heads: 0 tracked within 60 m" at the square (head-yaw check is vacuous: look at it if the head tracking matters) |
| wildlife | done: pigeons, sparrows, crows, gulls, swifts, ducks (132 birds); calm ambience | `docs/TODO-audio.md` is still the **Yakutsk** edition of the audio notes (the Petersburg retune is in `core/audio.js`, the file only lists ideas: zebra beeper tick, positional engine voices for traffic) |
| drive | done: red sports car at the station taxi rank, handling, HUD, camera modes, sound; vehicles on the bridge ride the humped deck | `tools/drive-test.mjs` is the end-to-end test |
| engine | done: underground support (`docs/UNDERGROUND.md`), outline proxies (`core/ndproxy.js`), frozen matrices, quality tiers | see `docs/PERFORMANCE.md` "Remaining hot spots" |

## Numbers (quality high, RTX 3090 Ti, headless Edge)

Intro ready after 22-24 s (before the performance pass 38-41 s); ~60 fps on the street (vsync cap); the worst camera (Anichkov pavement) 6.9-10 ms, 1280 calls; ~6.9 M triangles and ~1000 calls in the hero view. Module build times, before / after and the list of what was
done: `docs/PERFORMANCE.md`. Not done there: the sun shadow pass (225 calls: three.js tests the main camera's layers in the shadow pass, a shadow proxy needs its own update), people part meshes, ~840 colour calls (batch cells by material variant,
170 city stream meshes, 47 night-animated `galereya` sign meshes, trains), baking static InstancedMeshes into the batch cells. The normal / depth proxies keep ~110 MB of typed arrays in JS (so a lost WebGL context can re-upload).

## Tests (all `RESULT: OK` at the end of the performance pass)

`node tools/smoke.mjs` (walk, fly, roof landing, fps), `node tools/layout-test.mjs`, `node tools/under-test.mjs` (55 checks), `node tools/metro-test.mjs` (54 checks: every door, rides, transfers, ways out), `node tools/check.mjs <module> ...` for all 13 build modules
(`npm run check`), `node tools/drive-test.mjs`, `node tools/physics-test.mjs`, `people-test`, `traffic-test`, `wildlife-test`, `audio-test`, `models-test`. A **fresh clone** (`git clone`, `npm install --no-audit --no-fund`) passes `smoke` and `layout-test`:
nothing the scene needs is ignored by git; `tools/overlay.mjs` and `tools/plan.mjs` skip the Yandex part when `docs/reference/yandex-center.png` is absent (`overlay.mjs` prints `RESULT: SKIPPED`).

## Z-fighting status

Treated as a bug class (`docs/DESIGN.md` section 10; finder: `node tools/zfight.mjs --grid 80,2 --quiet --params "tr=nopark,nomove&people=off&wl=nobirds"`, target < 0.02 % noisy pixels per frame). Sweeps were run per module (streets: duplicate guard-rail runs removed, flower troughs and road decals lifted 4.5-5 cm;
hotel wall fixed; landmarksB 0.00x %; city edge graph removes shared party walls). Last probe (6 frames, after the performance pass, identical to before it): 5 frames below 0.02 %; **the platforms view `640,520,-167.9,3` (key 4) still has 0.8 % noisy pixels at the bottom edge of the frame (7367 px)** —
a rail / platform bug, pre-existing (cause not yet investigated) and not caused by the engine work. Re-run the sweep after touching any module geometry; cameras inside cars or tree crowns give false alarms.

## Known gotchas

* The repo-root `.gitignore` is a Python template that ignores `lib/ parts/ env/ build/ dist/ var/ downloads/`; this project's `.gitignore` re-includes them (`src/world/lib/` must show in `git status`). Also ignored on purpose: `node_modules/`, `shots/`, `*.log`, `data/osm-raw/`,
  and the third-party Yandex screenshot + overlay (`docs/reference/yandex-center.png`, `plan-overlay.png`). The baked map `src/world/data/city.js` is committed; `data/osm-raw/` is only needed to re-bake (`node tools/fetch-osm.mjs && node tools/bake-osm.mjs`, Overpass is slow: 504s, 10-30 min).
* `ORIGIN` is not the middle of the map (obelisk x 592, Anichkov Bridge x -441). Colliders are thin hollow wall boxes: anything that places the player or an NPC must test `L.insideBuilding` and `L.isOnRoad`.
* `OWNS_GROUPS` is a static export that city / environment / streets read before `build` runs. Everything drawn inside a footprint becomes walkable via the roof map (a sign on a roof is an obstacle, a canopy a floor).
* Static meshes are merged by the engine (batch + outline proxies): do not set `noBatch` without a reason (night-animated materials are one); use `userData.noND` to keep a mesh out of the proxies; do not use layers 2-4. Debug switches for A/B: `?nd=0`, `?ndfar=`, `?nofreeze=`, `?noempty=1`, `?ccell=`, `?icell=`, `?bcell=`, `?bfar=`, `?earlycompile=0`, `?async=0`.
* Headless runs share the GPU with other agents (timings move +-30 %); one screenshot job at a time. `window.__sim(t)` re-simulates from 0 to `t`: shots at different `t` in one page are fine, trains are pure functions of `t`.
* Several modules publish services that others read with optional chaining (`ctx.services.*`, `docs/DESIGN.md` section 7); a broken module must not break the others (the page shows `window.__errors`).
* Reference photographs (~800) lived only in the session scratchpad and are gone; the research docs list the Wikimedia Commons file names to re-download. Never put photos in the repo.
* A stray empty folder `D:\git2-agi-fun-tests` was created by research agents with a mistyped path; the harness protects it from deletion: remove it by hand.
* `docs/TODO-audio.md` still carries the Yakutsk title (see wildlife above).

## How to resume

1. `git status` / `git log --oneline | head`; `npm install` (dev tools only); `node tools/layout-test.mjs`, `node tools/smoke.mjs` (expect `RESULT: OK`), `node tools/check.mjs environment streets city rail landmarksA landmarksB landmarksC landmarksD props traffic people wildlife metro`.
2. Pick from the open items above. Good next steps by value: the platforms z-fight patch (key 4 view); streets triangle diet (lamps 250-420 tris each); `landmarksB/extras.js` activation; more KNOWN houses in `city`; pitched roofs; more metro halls (copy the Mayakovskaya block, `docs/METRO.md`);
   the remaining performance ideas (`docs/PERFORMANCE.md`); a flag-free "Petersburg events" layer (bridge raising is not modelled).
3. Work with named specialist agents as in the first build (`docs/TASKS.md` task texts + "read docs/AGENT-BRIEF.md and docs/DESIGN.md first"), at most ~6 at once (usage limits killed agents twice in the Yakutsk build and once here); one owner per shared file; the lead commits ("Piter 3D checkpoint N: ...").
4. After changes: `node tools/check.mjs <module> city`, `layout-test`, screenshots with `tools/shot.mjs` (look at every PNG), `zfight`, `smoke`; regenerate the gallery with `node tools/tour.mjs` when the look changes (<= 1600 px, JPEG ~82, the gallery stays ~3 MB).
