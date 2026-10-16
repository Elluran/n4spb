# Integration of the east / north extension into the west build

Branch `integrate/piter-east`, worktree `D:/git2/agi-fun-tests-piter-merge`, merge of `feat/piter-east-neva` (tip `2816026`, forked from checkpoint 25 `b39394b`) into `main` (`53208e1`, west build, checkpoint 46 + notes).
Written 2026-10-04. The performance pass is NOT part of this work (see "Recommended performance work").
Independent review the same day: see "Review (second pair of eyes)" at the end; it also merged main checkpoints 47-48 (`7596886`).

## What was merged

- East branch: rectangles E1 (Old Nevsky, Alexander Nevsky Lavra, Sinopskaya Embankment), N2, N3 (central north: Tauride Garden + Palace, Paradny Quarter, Smolny, Transfiguration, Liteyny and Bolsheokhtinsky bridges, Chernyshevskaya, Podpisnye Izdaniya); modules `landmarksEast`, `eastBridges`, `landmarksNorth`, `landmarksSmolny`, `landmarksSuvorov`, `landmarksKirochnaya`, `landmarksTauride`, `northBridges`; data `city-e1/n2/n3.js` and the re-baked `city.js`, `city-east.js`, `city-w*.js`, `city-n1.js` (supersets of the west bake), `east-water.js`; tools `bake-east-water.mjs`, `city-facade-test.mjs`, `street-paving-test.mjs`; docs `EAST.md`, `NORTH.md`, `research/north-*.md`.
- West line kept whole: union of play rectangles OLD + W1 + N1 + W2a..e, `environment/waterways.js` waterways, `bridges` module, landmarksE..K, the shared figure kit, wires / traffic / people / props rewrites.
- Data check (`scratchpad/mrg_ids.mjs`): 521 group references (`src/world/**/groups.js`, 16 modules), the 149 entries of `city/known-data.js` (the 266 real west houses incl. parts) and the 13 metro DOORWAYS all exist in the merged data; nothing of the main data was lost (BUILDINGS 3085 -> 6548, ROADS 9060 -> 20171, every old id present). 101 buildings, 156 road pieces, 30 green and 19 barrier records differ from our bake: they were clipped at the old seams and are whole now. Only three of the changed buildings are claimed by a module (Feodorovsky Cathedral r6319253 of the east branch, r1745667 of north-corridor-houses, Rossi Street r8222552 of landmarksE); layout-test, the group checks and screenshots of Kazan / the National Library / Nevsky show nothing wrong.

## Conflicts (13 files, 22 blocks) and their resolution

| file | blocks | resolution |
|---|---|---|
| `world/layout.js` | 2 | water: west `WATERWAYS` / `waterwayAt` / `waterLevelAt` / `inRiver` kept; `heightAt` = `paradnyDeckY` (3.3 m podium + stairs) ?? Tauride pond bed (-1.4 m, new `inTauridePond`) ?? waterway bed ?? 0. `EAST_WATER` is no longer imported here. GROUPS: both sets (landmarksE..K + bridges, landmarksEast, eastBridges, landmarksNorth, landmarksSmolny, landmarksTauride, landmarksSuvorov, landmarksKirochnaya, northBridges). VIEWS merged cleanly (see key bindings). |
| `environment/far.js` | 2 | west version (water rings from `waterRings()`, no `riverRing` / `NEVA_PTS` / `buildNeva`: the west water module draws the Neva scenery). The east branch's `inExtent` rule is the same as ours. |
| `environment/field.js` | 2 | west (`waterPolys` from `river.js`); `river.js waterPolys()` additionally returns the Tauride ponds (`kind: 'pond'`), so the field water mask, shore distance and tuft rejection know the ponds. |
| `environment/ground.js` | 2 | west (`waterCuts()` convex pieces) + `pondCuts()` (Tauride ponds triangulated with holes: `clip.js triangulateRing(o, holes)`). |
| `environment/lawns.js` | 1 | west claim / court rules + `inParadny` / `inCampus` rejection (only when the module is built). |
| `environment/trees.js` | 1 | west rejection log (`rej`) + Paradny / Kirochnaya campus / Suvorov rejection rules (named reasons). |
| `streets.js` | 2 | `pedestrianOnly` Paradny ways (no lanes, no lamps, no parking, not drawn) + west rule `skipDraw = owned && (bridge || living_street)`; `buildPaths(foot, steps, net, footX, owned)`. |
| `streets/lamps.js` | 1 | west lamp families; Paradny pedestrian ways skip lamps (`w.pedestrianOnly`). |
| `streets/paths.js` | 3 | owned paths are routed but not drawn; the parts inside named squares are not drawn; west foot classes (gravel / slab / sett / asphalt), `dpKeep` simplification applied per visible piece. |
| `streets/walks.js` | 1 | west warm Nevsky slabs + the east branch's "paved squares own their surface" and `PavingCoverage` (no coplanar duplicates). |
| `traffic.js` | 1 | deck height: `northBridges` ?? `eastBridges` ?? west `bridgeDeck` (bridges module + Anichkov). |
| `people.js` | 1 | west `global: 0.72` + the east `tauride: { factor: 0.22, maxPeople: 60 }` zone. |
| `people/nav.js` | 2 | imports of both; `surfaceY` asks northBridges / landmarksTauride / eastBridges first, then the west bridge decks (`westDeck`, pavement lifts) and the Anichkov deck. |

Clean merges worth knowing: `main.js` (module list, labels, Places selector, key handling), `index.html` (Places selector, mobile layout), `environment.js` (tree pruning around the new modules' entrances), `lanegraph.js` / `parking.js` / `wires.js` (pedestrian-only ways, east / north bridge decks), `city/walls.js`, the 11 data files.

## Water design (one system)

The east branch had its own `eastWater` module (water mesh, quay boxes) plus `EAST_WATER` polygons in `layout.js`, `field.js`, `ground.js`. It lived beside a Fontanka-only world. The west build has a general waterway system, so the east water was folded into it and **`eastWater` was removed** (file and module list entry; `tools/check.mjs eastWater` no longer exists).

- **Data rings.** `waterways.js` stitches every `RIVER` record that has a key. The east data adds Neva pieces of E1 / N2 / N3 (key `neva`, they get the Neva cross-section: water -3.4, bed -6.0, rolled granite quay, descents, colliders), the Obvodny canal (the bake leaves its key empty: `KEY_BY_NAME` maps it to `neva`) and the Monastyrka (no polygon in `RIVER`: taken from `east-water.js`, wholly inside the E1 extent). Obvodny and Monastyrka therefore use the Neva quay style; a dedicated style is a later nicety (tour boats may berth there).
- **Scenery beyond the data extent.** `data/east-water.js` (full OSM polygons of the Neva, Bolshaya Neva, Obvodny canal) replaces the invented Neva ring east of x = -840: `FAR_BANKS` now ends at the Fontanka mouth (-840, -1498) / (-840, -2014), the closing edge lies inside the N2 extent. The real polygons are `far` water pieces (`excludeExtent`: the data rings rule inside the extent) and their banks east of x = -840 are scenery quay banks (`far: true`, coarse sampling beyond the near zone, never colliders). West of x = -840 the tuned invented banks stay (Palace Bridge, Strelka, Petrograd side). The invented straight east ring used to run over land at z -2300..-3000.
- **Ponds.** The Tauride ponds are not waterways (no quay): `heightAt` bed -1.4 m, `pondCuts()` for the ground, `waterPolys()` for the field; the garden module draws their water.
- **Continuations.** The Swan Canal now leaves the data at the west edge of the N2 extent (x -920): its invented continuation starts there and ends in the Neva near (-1012, -1480). The Fontanka-north continuation is obsolete (N2 data runs the Fontanka to the Neva).
- **Bridges.** Every `bridge` road piece whose first point lies in E1 / N2 / N3 (and in no older rectangle) makes an automatic quay zone (`river.js eastBridgeZones`: distance to the polyline < half width + 3 m, the east branch's rule): the quay leaves wall, parapet and collider open under the decks that `eastBridges` / `northBridges` / `landmarksTauride` draw and publish through `deckY`. No fallback decks, no splits. Zones of the west bridges are unchanged.
- Water level: Neva -3.4 everywhere (the east branch drew -3.2).

## Key bindings and places

Desktop keys and the Places selector (all `layout.js VIEWS`, `tools/layout-test.mjs` checks 19 poses, keys unique):

| keys | places |
|---|---|
| 1-5 | Vosstaniya Square, obelisk, Nevsky, platforms, Anichkov Bridge (as before) |
| 6, 7, 8 | Old Nevsky, Alexander Nevsky Lavra, Sinopskaya Embankment (east branch) |
| Shift+1..6 | Podpisnye Izdaniya, Transfiguration, Chernyshevskaya, Paradny Quarter, Tauride Garden, Smolny Cathedral (east branch) |
| 9, 0 | Kazan Cathedral, Palace Square (new) |
| Shift+7, 8, 9 | Admiralty / Alexander Garden, St Isaac's Square, Bronze Horseman (new) |

`index.html`: key hints and the selector title list all of them; the selector works on mobile (390 x 844: no horizontal overflow, `scratchpad/mrg_hud.mjs`).

## Module order (`main.js MODULES`)

`environment`, [`landmarksEast`, `eastBridges`, `landmarksNorth`, `landmarksSmolny`, `landmarksSuvorov`, `landmarksKirochnaya`, `landmarksTauride`, `northBridges`], `streets`, `city`, `rail`, `landmarksA`..`landmarksK`, `bridges`, `metro`, `props`, `traffic`, `people`, `wildlife`, `drive`.
The east / north modules stay before `streets` / `city` (as in the east branch): streets / wires read `eastBridges.deckY` / `northBridges.deckY` and the claims of the new groups. `bridges` stays after the landmarks (west order). `traffic` and `people` read the deck services of all bridge modules.

## Verification (2026-10-04, RTX 3090 Ti, Edge headless, 1280 x 720)

- `node tools/check.mjs` for all 30 modules: no ERROR (only the existing triangle / texture budget warnings; `drive` needs a real DOM and cannot be built by that harness, pre-existing). Triangles per module: environment 1.14 M, streets 2.14 M, city 2.32 M, props 0.46 M, landmarksTauride 0.80 M, metro 0.43 M, landmarksSmolny 0.43 M, landmarksNorth 0.34 M, northBridges 0.19 M, landmarksE..J 0.26-0.38 M each, landmarksEast 0.15 M.
- `node tools/layout-test.mjs`: OK (19 viewpoints, 6211 footprints, 20195 roads). `node tools/wires-test.mjs`: OK (57 km of wire, 0 free ends; one rosette-in-building fixed). `node tools/metro-test.mjs`: 120 / 120. `node tools/people-test.mjs` (10 min): OK (1322 people visible, 0 in buildings / water). `node tools/traffic-test.mjs` (10 min): offlane 0, teleport 0, red 0, stuck 0, overlap 120 (limit 200); started 32 junction turns that left the asphalt in the east / north data: fixed in `lanegraph.js` (`traffic-test.mjs --conn` checks all 36 061 connectors statically); the t = 0 seed count limit grew from 1000 to 2600 (2103 cars on the 13 km2 network).
- `node tools/smoke.mjs` (`--q medium`, `--q low`, `--q high`): all OK (walk, fly, roofs, NPC heads, look easing), no page / module errors.
- Real-page walks and drives (`scratchpad/mrg_bridges_walk.mjs`): Alexander Nevsky Bridge deck 0 -> 10.8 m, Liteyny 2.8 -> 6 m, Bolsheokhtinsky 5.3 -> 7 m on foot and by car, the minor Lavra bridges: all stay on their decks, no falls. Identical to the east branch's own behaviour (its Alexander Nevsky footway line and the Frantsuzsky Bridge, which lies outside the play rectangle, are no walkable decks there either).
- Screenshots (all inspected): West: Kazan colonnade, Palace Square from the column, Admiralty / garden, St Isaac's, Neva embankment, Bronze Horseman, Vosstaniya, the station platforms, Anichkov: pixel comparison with the unmerged west build differs only by cars / people. East / north: Lavra gate, Alexander Nevsky monument and square, Sinopskaya embankment, Tauride, Smolny, Liteyny bridge, Bolsheokhtinsky bridge, Paradny, Podpisnye, Transfiguration, Chernyshevskaya, Old Nevsky, Obvodny canal, Neva aerials, the Summer Garden / Fontanka mouth / Swan Canal mouth.
- Fixes found by the screenshots: a missing quay wall (80 m, light-blue strip) where the Neva bank leaves both extents at the E1 / N3 corner (scenery banks added); the Swan Canal ended in a field north of its data (continuation moved).

### Measured (medium unless noted)

| | west build alone (`53208e1`) | integrated |
|---|---|---|
| intro ready (smoke) | 33.1 s | 62.9-68.8 s (low 62.2 s, high 64.6 s) |
| JS heap after load | 680 MB | 1346 MB (1429 MB after flying through 8 places) |
| fps at the start / Kazan / Palace Sq | 54 / 42 / 28 | 41-44 / 38 / 33 |
| fps Lavra / Smolny / Tauride / Sinopskaya / Liteyny | n/a | 35 / 60 / 48 / 54 / 60 |
| triangles drawn | 7.6-8.5 M | 15.3-17.7 M (the whole city is drawn from everywhere: merged batches are not culled by region) |
| draw calls | 1040 | 500-1250 |

Module build times (ms): environment 7078, streets 9436, city 6225, people 4990, props 2930, landmarksE 2808, traffic 1520, landmarksTauride 1158, landmarksEast 1115, landmarksD 1100, landmarksB 1023, landmarksG 966, landmarksNorth 986, landmarksSmolny 874, landmarksJ 819, landmarksH 788, landmarksA 577, wildlife 522, landmarksI 503, landmarksC 501, metro 418, landmarksF 333, rail 318, others < 200. The east authors measured 123 s load / 30 fps for their scene on the same GPU; the integrated medium scene loads about twice as fast because of the west build's performance work.

## Known problems

- Load time (63-69 s), memory (1.35 GB JS heap) and the 16-17 M triangles drawn from every pose are the cost of a 13 km2 map built in one go. Weak GPUs have not been tested.
- Pre-existing, identical in the unmerged west build: vertical white streaks and ghost slab geometry near the Admiralty side wing at about (-2500, -470) (QA sweep territory); a pavement strip pair across Vosstaniya Square at the left of the start view.
- Obvodny canal and Monastyrka use the Neva quay style (key `neva`); the quay of the scenery banks is coarse; the far SE Neva has no opposite bank detail.
- (resolved by the review below: `landmarksK` and the west QA sweep of main checkpoints 47-48 are merged in.)
- `traffic-test` overlap clusters (Bolsheokhtinsky east end 18, Vosstaniya 14, Obvodny 5) are within the limit but new in the east.
- The east branch's Alexander Nevsky footway lines and the Frantsuzsky / Kazachy bridges lie partly outside the play rectangles: not walkable decks (as in the east branch).
- East data still lacks part of the mapped furniture (Overpass outage during the east branch's fetch), documented in `EAST.md`.

## Recommended performance work

The 2026-10-04 followup measured normal loading and implemented indexed
party-wall checks (about 6.9 s saved). See [LOADING.md](LOADING.md) for current
phase measurements, reproducible loading/profiling commands and the proposed
static baking/regional loading work. The larger changes below remain pending.

1. Lazy regional build: build the intro region (station + Nevsky + a radius) first, then the west and the east / north regions after "Start walking" in idle slices (modules already take `ctx.buildList`; give `city`, `streets`, `props`, `environment` a rectangle filter).
2. Per-region data loading: split `city.js` records by the existing part files and import them dynamically (the part files `city-w*.js`, `city-e1.js`, `city-n*.js` already exist; the bake writes REGIONS), so the first page needs only OLD.
3. Region chunking of the merged static batches (`city`, `streets`, `props`, `environment` quays): one mesh per 400-500 m cell so the frustum culls them (16 M triangles drawn at every pose today); cheap LOD for the far city (roofs only beyond 600 m).
4. Cheaper generic city: 2.3 M triangles for 6.5 k buildings (budget 0.6 M), streets 2.1 M (budget 0.5 M), environment quays 1.2 M (the Neva quay of the east is 15+ km of rolled granite: drop the detail beyond 150 m, instance the parapet).
5. Memory: textures (streets 30 M px canvas textures), figure kit instances, people nav lattice for the whole map (4990 ms build): nav lattice only near the player.
6. Dedicated quay style for the Obvodny canal / Monastyrka and boats only on the Neva proper.

## How to rerun

```sh
node tools/check.mjs environment streets city landmarksEast ...      # or all modules of src/main.js MODULES
node tools/layout-test.mjs && node tools/wires-test.mjs && node tools/metro-test.mjs
node tools/traffic-test.mjs [--conn] && node tools/people-test.mjs
node tools/smoke.mjs --q medium
node tools/shot.mjs --cams "x,z,yaw,pitch;..." --out shots/x
```

## Review (second pair of eyes, 2026-10-04)

Everything below was re-run from scratch on the integration branch after merging main (`6f3670f`: checkpoint 47 Church of the Saviour on Blood + Mikhailovsky Garden + Russian Museum, checkpoint 48 west QA sweep).

- Merge of main (`7596886`): 3 conflicts. `streets/walks.js` keeps the east `PavingCoverage` (exact overlap removal; replaces the QA height offsets, which are then not needed), `streets/paths.js` keeps the east owned / in-square `drawRun` and takes the QA per-id height offset, `tools/zfight.mjs` takes the QA layer mask. Without this merge the 81 m Saviour on Blood stood in the scene as a plain beige generic box.
- Defects found and fixed: (1) the far scenery blocks (`environment/far.js`) were tested at their centre only, so a 150 m block could lie across the invented Swan Canal continuation west of x = -920 (now `spansWater`: ends and quarter points must not be over water); (2) the Shift+7 view stands in the Alexander Garden, which had no area name (toast showed the city default): added to `layout.js AREAS` (the same gap exists in the west-only build).
- Verified OK: `check.mjs` of 29 modules (landmarksK 277 k tris), `layout-test` (19 views, 6214 footprints), `wires-test` (0 free ends), `metro-test` 120 / 120, `traffic-test` (10 min: red 0, nan 0, offlane 0, teleport 0, overlap 82, stuck 12) and `--conn` (0 of 36 061 connectors off the asphalt), `people-test` (10 min, 1421 people, OK), `smoke` low / medium / high (all OK, no console errors, no module errors), a real keyboard pass over all 19 view keys (pose exact, dry ground, HUD toast named for every key), the car placed at all 19 views, player walks to the outer edges of E1 (south, east), N2 (west), N3 (north, east), OLD, W2e (clamped exactly at the edge, 0.00 m past it; a teleport 40 m outside comes back to the edge), `clampToPlay` at the concave E1 / N3 notch, bridge walks and drives (Alexander Nevsky, Liteyny, Bolsheokhtinsky decks).
- Looked at (about 60 screenshots, eye level and aerial, medium): all 19 views, join regions (Vosstaniya, station, Nevsky across the OLD / E1 seam at x = 835, the Fontanka and Anichkov Bridge, Fontanka / Kirochnaya at z = -405, Liteyny, Chernyshevskaya, W1 / OLD seam x = -595), the Neva of both halves from the water and from the embankments, the Neva mouth of the Fontanka and the Swan Canal, the Tauride ponds, Obvodny canal, Monastyrka, Lavra bridges, top-down tiles of E1, N2, N3 and the Palace Bridge: water levels, quays and ground show no hole or seam, no wall across open water except the Swan Canal mouth (below).
- Measured (RTX 3090 Ti, Edge headless 1280 x 720, other agents were using the GPU at the same time, so fps varies by 30 %): intro ready 58-66 s at every tier (west alone 33 s), 17.1-17.7 M triangles and 1250-1360 draw calls drawn at the start pose (west alone 8 M), 29-48 fps at the start pose, 33-60 fps at the other poses; the quality tiers do not change the triangle count.

Remaining problems found by the review (not fixed, none is a regression of the merge):

- People: only the Nevsky corridor and the hot spots (`people/zones.js`) are populated. The pavement graph is cut into 7.5 k small components (side-street pavements are not linked to each other: a virtual crossing needs `zoneW >= 0.14`, and lowering it to 0.05 did not connect them), so within 150 m there are 0 people at Chernyshevskaya, the Paradny Quarter, Transfiguration, the Liteyny and Bolsheokhtinsky bridges (cars, birds and parked cars are there). The east branch alone behaves the same; the old centre south of Nevsky also has empty blocks. A fix is a nav connectivity pass (join pavement ends at junctions without a crossing, lower the threshold with a density cap).
- The Swan Canal mouth: the scenery south bank of the Neva still runs as a thin coping line across the invented canal mouth (the canal water meets it at -2.8 m, the Neva is at -3.4 m).
- The Alexander Nevsky Bridge deck (907 m, straight) reaches x = 3033 but the play area ends at x = 2650: the walk ends mid-river at the invisible clamp (the same in the east branch); the Frantsuzsky bridge lies outside the play area.
- Obvodny canal and Monastyrka use the Neva quay style (a 20-60 m wide Obvodny with a 3.4 m wall looks like a small Neva).
