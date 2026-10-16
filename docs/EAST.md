# Eastern extension: Moscow Station to the Neva

> Integrated into the west build on branch `integrate/piter-east`: see [INTEGRATION.md](INTEGRATION.md). The `eastWater` module described below no longer exists: its water and quays are built by the general waterway system (`environment/waterways.js`, `quay.js`) from the same `data/east-water.js` polygons.

Branch: `feat/piter-east-neva`, isolated worktree `D:/git2/agi-fun-tests-piter-east`.
Base: `b39394b`. The concurrent western work remains in the original worktree.

The new E1 rectangle is x 835..2650, z -405..1750 metres in the existing
Mayakovskogo/Nevsky coordinate frame. It covers Old Nevsky, the Alexander Nevsky
Square/Lavra district, and Sinopskaya Embankment. No origin or scale change.

## Sources and reproducibility

- OpenStreetMap contributors, ODbL: building footprints, roads, green spaces,
  shoreline and bridge alignments. https://www.openstreetmap.org/#map=15/59.9270/30.3810
- Sinopskaya Embankment: https://en.mostotrest-spb.ru/embankments/sinopskaya-naberezhnaya
- Lavra and cathedral: https://lavra.spb.ru/holy-trinity-cathedral/
- Gate church: https://lavra.spb.ru/gate-church-of-the-icon-of-the-mother-of-god-of-all-the-sorrowful-joy/
- Feodorovsky Cathedral: https://visit-petersburg.ru/leisure/places/tp-199802-feodorovskiy-sobor/

Incremental fetching can be restricted to this branch's region:

```sh
node tools/fetch-osm.mjs --regions=E1 --tile=800
node tools/bake-osm.mjs
node tools/bake-east-water.mjs
```

The normal bake appends `city-e1.js`; `city-east.js` still means the original
station district. The separate eastern water bake retains the full Neva width
beyond the playable boundary, avoiding a cut through the middle of the river.
Ground holes, water masks and far-building rejection use that same polygon.

## Checkpoint 1

Expanded building/road footprints and primary water polygons. Eastern water
module: 37,610 triangles, three materials, 144 ms headless build on this machine.
`node tools/check.mjs eastWater` and `node tools/layout-test.mjs` pass.
Additional street furniture and green-space fetching is in progress.

## Checkpoint 2

Built the Lavra's Holy Trinity Cathedral, gate church, five monastery wings,
Feodorovsky Cathedral, Hotel Moscow, and Alexander Nevsky's equestrian monument.
The footprint positions are from OSM; ornamental geometry and most heights are
photo-derived approximations. The monument follows the published 3.74m pedestal
and 5.11m figure dimensions and coordinates 59.9236 N, 30.3853 E.

Alexander Nevsky Bridge now has a 35m roadway, raised approaches, seven spans,
piers, tram rails, lighting and contact wires. Traffic, pedestrians and the player
car share its deck-height service. All mapped eastern bridge paths have walking
surfaces. The far-tree rounding overflow revealed by the larger district is fixed.

- Bridge engineering reference: https://www.transmost.ru/projects/bridges/movable-bridges/most_al_nevskogo_1965/
- Bridge authority: https://mostotrest-spb.krti.gov.spb.ru/bridges/aleksandra-nevskogo
- Monument: https://peterburg.guide/pamjatniki/aleksandru-nevskomu/

Six rendered views were inspected at 1280x720 in Edge on the RTX 3090 Ti, with
no module/page/console errors in the second run. New shortcuts: 6 Old Nevsky,
7 Lavra gate, 8 Sinopskaya Embankment. Module and layout checks pass.

Overpass returned the buildings, roads, water and part of the eastern green
data, then its servers became unreachable. Additional mapped furniture, trees,
POIs and transit metadata are not yet complete; procedural street detail uses
the existing engine. Retrying the incremental fetch resumes missing tiles.

## Checkpoint 3: detail and verification

Refined cathedral entrances, the gate archivolt, and Feodorovsky Cathedral's
arched windows, pilasters and curved gables. Updated the overview and flight
shortcut help for all eight viewpoints.

- Module checks and all eight spawn/layout checks pass. The expanded generic
  city exceeds its original 600k triangle warning budget (about 1.6M).
- Full-city medium-quality smoke: walking, flight, landing, rooftop walking and
  takeoff pass with no console errors. Approximately 50 fps on RTX 3090 Ti;
  initial loading took 56 seconds. This is not a low-end performance guarantee.
- Real keyboard checks: shortcuts 6–8 land on dry ground; bridge walking follows
  its rising approach; driving maintains the player car on the raised deck.
- At 390x844, the eastern bank renders without horizontal document overflow and
  the touch Fly button works. The existing top HUD remains crowded at this width.
- Final three landmark depth checks: 17, 5 and 1 unstable pixels respectively
  (maximum 0.002%); rendered landmark and street views inspected visually.

Local screenshots and interaction reports are in `D:/temp/piter-east`.
The opposite bank is distant scenery; this extension's detailed coverage ends
at the Neva. Building footprints and street geography are mapped, while facade
details remain stylized reconstructions rather than survey-accurate replicas.

## Monument refinement checkpoint

Rebuilt the Nevsky monument with a contiguous, closed granite pedestal and a
thick folded cloak. Added muscular horse volumes, articulated legs, hooves,
mane, bridle/reins, saddle/stirrups, rider facial features and armour, cross,
cornice ornament and interpretive bronze relief panels. Photo reference:
https://peterburg.center/sites/default/files/an_1.jpg

Removed duplicate sidewalk/path paving inside existing square surfaces while
retaining pedestrian navigation lines. At the reported camera
`1895.1,1.5,984.2,-79.5,22.2` the missing surfaces are closed. The floor-facing
depth probe improved from 280 unstable pixels to 7 (0.001%); three-angle visual
inspection and module checks pass. Small edge differences remain elsewhere in
the scene; this is a stylized photographic reconstruction, not a scanned statue.
