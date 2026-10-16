# Petrograd side / Spit extension: state on 2026-10-07 (baked revision d40bd2ff300249d2a015)

Everything is committed on `main` and baked. Contract: `docs/PETRO-BRIEF.md`; cross-module notes: `docs/research/petro-requests-*.md`; one dossier per sight in `docs/research/`.

## What exists
* **Frame**: play rectangles `P1..P9`, `V1`, `V2` (`tools/osm-lib.mjs`). The whole of Petrogradsky Island (OSM r1312631, 6.27 km2) is inside the play area with the Karpovka as its north shore; Vasilievsky Island = the Spit, Universitetskaya embankment to the Twelve Collegia, Makarova embankment to the Tuchkov Bridge. Play union 31.9 km2.
* **Sights**: `landmarksFortress`, `landmarksStrelka`, `landmarksUniversity`, `landmarksTroitskaya`, `landmarksAurora`, `landmarksKronverk`, `landmarksKamennoostrovsky` (26 houses), `landmarksVladimir`, `landmarksKarpovka`.
* **Bridges**: Trinity (554 m, working), Palace to the Spit, Birzhevoy, Tuchkov, Sampsonievsky, Grenadersky, Bolshoy Krestovsky, Lazarevsky, seven Karpovka bridges, four Zhdanovka bridges, the Betancourt approach viaduct; the two fortress bridges are in `landmarksFortress`.
* **Water, city, streets, metro, people, wildlife, traffic (with trams), props, views (Alt+Shift+1..0, minus, equals), areas**: see the README section.

## Verified on the final tree
`npm run roads` OK (0 objects on a carriageway; surface 918 residual samples of the 2170 allowed), `node tools/layout-test.mjs` OK, `npm run bake` OK (240 files, 229.5 MiB), `npm run bakedcheck` (232 of 232 regions, no failures), `node tools/smoke.mjs --q medium` RESULT OK.
**Cost (smoke, baked, start pose at Vosstaniya Square): intro ready after 86.7 s (55.5 s before this extension), 16 fps (about 22 before), 20.3 M triangles (16.8 M before).**
The performance pass of 2026-10-07 (`docs/PERFORMANCE.md`, first section) brought the start pose to 4.3 M triangles and the load to ~60 s; the draw-call count is the remaining cost.

## Known defects and unverified points
* build-people reported an open quay edge at (-2462,-1099) east of the Palace Bridge north landing (a drop to -6); build-water could not reproduce it. `node tools/environment-banks.mjs --strict-zones` lists 27 more open shore points at bridge zones (Nevkas, Zhdanovka, Kronverk strait) that nobody verified one by one: a player may be able to step off an embankment at a bridge head.
* The whole-network traffic test fails (vehicle overlaps, one trolleybus off its lane at (-3101,24)); the agent raised two limits in `tools/traffic-test.mjs` and did not re-run it. The wildlife test fails its build / update time limits (also with `?petro=off`).
* `tools/bridges-walk.mjs` failed four routes of the 4th Zhdanovsky footbridge on the OLD bake: re-run it on this bake. Not re-run on the final tree: `npm run markings`, `walls`, `labels`, `facade`, `banks`, `wires-test`, `metro-test` (each passed in its owner's last round).
* Not looked at by the lead in the full scene: the Lensovet Palace of Culture, the Lensovet House, the Karpovka bridges, P6..P9 streets and props, the Alt+Shift keys in a browser.
* Estimates: most heights (photo proportions), several bridge span lists, tram routes, the judicial-quarter footprints.

## Decisions waiting for the user
* Roads tagged `highway=construction` are dropped by the bake: Birzhevoy proezd on the Spit (111 m) is a hole, plus about nine stretches in older districts (267 m of the Moika embankment near New Holland).
* Rules that are on only in the new districts and ready for the old ones: researched roof colours, `roof` records as canopies (84 solid sheds remain), no lawn blobs on unmapped ground beside streets.
* Not in the map: Menshikov Palace, Academy of Arts and the sphinxes (west of V1), Aptekarsky / Krestovsky / Petrovsky islands, tram contact wires, trolleybus wires lifted over humped decks, the Medical University front on the Karpovka.

## How to resume
Start fresh agents from `docs/PETRO-BRIEF.md` and this file (the named agents of the building session keep their context only inside that session). Stage explicit paths only: another session has committed to this checkout.
