# tools/tauride: the data and acceptance tooling of the Tauride Garden remake

Everything here is **data, tooling and checks** for the garden team (the plan: `docs/TAURIDE-REMAKE.md`; the engine is not touched). All tools run on the CPU: no GPU, no browser, no network
(only `fetch-tauride.mjs` downloads, and it is optional). Every path is derived from the repository root, so the folder works in any checkout.

* Python 3 + **shapely** is needed ONLY to regenerate the water union, the palace slices, the Paradny roof insets and the podium floor (`pip install shapely`; tested: Python 3.12.3, shapely 2.1.2 with GEOS 3.13.1,
  matplotlib 3.10.0 for the plots). The committed data modules and every check of `data-test.mjs` work without Python (the regeneration step then says SKIPPED, never passed).
* `tools/tauride/raw/` is **git-ignored** (`.gitignore`: `tools/tauride/raw/`): third-party OSM snapshots, reference photos, the intermediate files of the build (`raw/work/`) and generated previews
  (`raw/out/`). Never commit a raw OSM snapshot (1.6-2 MB) or a photo.

## The pipeline (one command)

```
node tools/tauride/build.mjs            # facade -> derived.json -> union.json -> src/world/landmarksTauride/data/*.js
node tools/tauride/build.mjs --check    # write nothing, fail if a committed module differs from what the pipeline produces
node tools/tauride/data-test.mjs        # 141 checks (ids, geometry, counts, the union, dryness, bridges, determinism)
```

| step | script | reads | writes |
|---|---|---|---|
| 1 | `tauride-generate.mjs` | the North facade `src/areas/north/data` (`--source raw`: `raw/tauride-raw.json`, the old behaviour) | `raw/work/derived.json` |
| 2 | `tauride-union.py` (shapely) | `raw/work/derived.json` (key `ponds`) | `raw/work/union.json` (ONE complete file; the old script APPENDED to terrain.js and doubled the export on a second run) |
| 3 | `build.mjs` + `lib/emit.mjs` | `derived.json`, `union.json` | `src/world/landmarksTauride/data/{water,bridges,paths,furniture,footprints}.js` (pure data, whole files) |

`lib/tables.mjs` holds every number that is judgement and not OSM (canal widths with their provenance, the bridge site mapping, the path class rule, the fence rules): edit it, run `build.mjs`.
`lib/derive.mjs` holds the computations, `lib/common.mjs` the shared helpers, `lib/site.mjs` the North layout + data as one object for the CPU tools.

### Keep Python or port to node? (the five shapely steps)

Kept in Python: **union**, **ring cleanup** (now part of the union step), **palace slicing**, **roof inset**, **podium floor**. They are boolean operations on polygons with holes and mitred
buffers (GEOS); a node port needs a robust clipper that is not installed here (the only dependencies of the repository are three and puppeteer-core), and the results are COMMITTED data, so only
whoever regenerates them needs Python. Porting would be the riskiest code of the pipeline: the lake touches the canal strips along slivers and points (the facade is a simplified copy of the map: canal ends
sit 0.0-0.08 m off the lake outline), and a hand-written union pinches there (see `joinCanal` in `lib/derive.mjs`). Everything that is NOT a boolean operation is node.

### Faithful move (checked once, results kept here)

On the legacy inputs (`--source raw` with the old Overpass snapshot, `--facade` / `PITER_SRC` for the Paradny data) the moved generators reproduce the source repository (`102_3d_piter` at `0568f7af`) exactly:
all six exports of `terrain.js` (garden 81 vertices, 118 ways, 14 fences, 11 gates, the water union with holes 17,413 / 305 / 1,650 m2, 30,487 m2, shoreline 2,691 m: only `1128.0` is printed `1128`),
`palace-parts.js`, `paradny-roofs.js` and `paradny-floor.js` byte for byte. From the facade the palace slices and the roof insets differ from the committed files by less than 5 cm; the garden
data differ by up to 0.34 m (the facade polygons are simplified copies: garden outline 66 vertices instead of 81) and by two newer ways (`w425188838`, `w425188839`).
Re-run: `node tools/tauride/tauride-generate.mjs --source raw --work tools/tauride/raw/work-legacy` (after copying `tauride-raw.json` into `raw/`), then the Python scripts with the same `--work`.

## The scripts

| script | what it does |
|---|---|
| `build.mjs` | the whole pipeline (above) |
| `tauride-generate.mjs` | facade (or raw snapshot) -> `derived.json`: garden outline, water pieces (two OSM polygons + four canal strips), 120 ways with class and width, 14 fences, 11 gates, openings and unfenced stretches, furniture, GREEN ids, footprints |
| `tauride-union.py` | the water union (+ ring cleanup, validity assert) -> `union.json` |
| `tauride-palace-parts.py` | `derived.json` (palace r3801092) -> `raw/out/palace-parts.js`: the footprint minus the open portico cut into 5 strips with design heights 11.5 / 7.6 / 16.5 / 7.6 / 11.5 m |
| `paradny-inspect.mjs` | the Paradny records of a data facade (default the North's) -> `raw/work/paradny-data.json` |
| `paradny-roofs.py` | `paradny-data.json` -> `raw/out/paradny-roofs.js` (footprints inset 2.4 m, mitred) |
| `paradny-floor.mjs` + `paradny-floor.py` | the podium polygon and the 8 stairs of `paradny-surface.js` (this repository after the port, `--surface <file>`, or `$PITER_SRC`) -> `raw/out/paradny-floor.js` (podium minus the stair strips) |
| `paradny-walk.mjs` | CPU harness: the REAL Player climbs the 8 mapped Paradny stairs (needs `landmarksTauride` built: here after the port, or `PITER_SRC=...`): 8 stairs, 0 failing on the source module; **T1: the port exists here, `node tools/tauride/paradny-walk.mjs` = 8 stairs, 0 failing on this repository's module as well** |
| `tauride-plan.py`, `paradny-plan.py` | matplotlib plans (`raw/out/*.png`): ways coloured by class, the union, fences, gates; Paradny buildings, roads and stairs |
| `fetch-tauride.mjs`, `tauride-extract.py`, `read-osm.py` | OPTIONAL: download the Overpass snapshot / rebuild it from OSM XML / inspect it (into `raw/`) |
| `data-test.mjs` | the checks of the data modules |
| `lib/` | `common`, `tables`, `derive`, `emit`, `site`, `stub-env` (headless engine + real Player), `demo-models`, `height-harness`, `png`, `raster` |

Not carried over: `paradny-wire.py` (a one-off patch of the source's `landmarksTauride.js`, applied long ago), `tauride-data.mjs` (needs the full-city raw data), `tauride-poses.mjs` and
`tauride-bridge-check.mjs` (superseded by `tools/tauride-cams-check.mjs` and `data-test.mjs`, which test the bridge ends against the data), `pond-inspect.py` (now `read-osm.py --ponds`),
`clean-tauride-rings.py` (folded into `tauride-union.py`). The source's raw snapshots and photographs stay in `D:/temp/piter-east` and are not in the repository.

## The data modules (`src/world/landmarksTauride/data/`)

Pure data, no imports; the header of each says where it comes from (OSM via the North facade, ODbL) and how its estimated numbers were obtained. Nothing imports them yet: the garden team does.

| module | content |
|---|---|
| `water.js` | `LAKE` r1582714 (island hole), `WEST_POND` r6278222, `CANALS` (4 centre lines, width USED and the estimate), `CANAL_WIDTH_TABLE`, `CANAL_STRIPS`, `WATER_UNION` (one polygon, 3 holes), `WATER_ISLANDS`, `WATER_STATS` |
| `bridges.js` | `BRIDGE_SITES` (5 numbered bridges + the dam: type, deck chain, bearing), `BRIDGE_WAYS` (the 8 OSM ways with the extended deck), `DAM` (the decision) |
| `paths.js` | `PATHS` (120 ways: class main / side / trail / steps / bridge, width, surface, lit, steps, geometry), `PATH_CLASS_RULE`, `PATHS_IN_WATER` (empty), `NOT_IN_LEGACY_TERRAIN` |
| `furniture.js` | `BENCHES` 132, `BINS` 167, `OTHER_FURNITURE`, `FOUNTAINS`, `OSM_TREES` 7, `MONUMENTS` 3, `FENCES` 14, `FENCE_OPENINGS` 13, `FENCE_GAPS` 4, `GATES` 11, `SERVICE_LANE` |
| `footprints.js` | `GARDEN` outline, `GARDEN_GREEN` (park, 23 woods, playgrounds, pitch, fitness, wetland), `FOOTPRINTS` (11 outlines + 2 parts) |

## The acceptance tools (in `tools/`)

* `tauride-cams.mjs` / `tauride-cams-check.mjs`: the 12 corrected camera poses and the proof (dry, outside buildings, off bridge decks, reachable on foot, line of sight; `--plan` shows what was wrong with the plan's poses; `--colliders` builds the real modules; `--poses <file.mjs>` checks another set of poses, e.g. the team's re-picked ones: a mutation test with 4 spoiled poses fails 4 of 4).
* `tauride-height-test.mjs`: the CPU wading / walkability harness with the real `Player` and `Physics`. `node tools/tauride-height-test.mjs` runs the generic North (trivial: no ponds, no hills), the self-check on three synthetic models,
  and with `PITER_SRC=...` the reproduction of the old trap (14 shore probes, 12 walk into the lake and 0 of 12 get out). `--model <file.mjs>` takes the garden team's height model and collider set (see `lib/demo-models.mjs`), `--build <modules>` the colliders of built modules.
* `tauride-overlay.mjs`: the acceptance overlay (plan raster at 0.5 m/px over an aerial image, water IoU, path P90, canopy per quadrant).
  **The part that needs the user's image:** the aerial itself (ONE north-up PNG screenshot of the garden from any satellite / map viewer), its georeference (two corners, or two points known in both the picture and the world, `--geo` / `--ref1 --ref2`) and, for the metrics,
  either hand-traced masks (`--water-mask`, `--path-mask`, `--canopy-mask`: PNGs of the same size as the aerial) or the colours of water, paths and canopy (`--water-color r,g,b` ...). No imagery is bundled, and none is needed for `--selftest`, which feeds the tool
  synthetic images made from the data (exact masks: IoU 1.000, P90 0 m, canopy 0 points; a 0.75 m/px colour image with another origin: IoU 0.98; a 3 m registration error is found; random masks fail).
  Caveat: path P90 against the OSM-built model is circular unless the path mask is made from the image.

## T2 tools: the land relief (docs/TAURIDE-REMAKE.md section 7.1 and the T2 log entry)

The relief itself is hand-authored data (`src/world/landmarksTauride/data/relief.js`), NOT generated by `build.mjs`.
* `relief-check.mjs [--features file] [--step 1]`: the authoring loop. Prints every violation of the rules of `lib/relief-rules.mjs` (zero relief within 8 m of the outline, 3 m of the building footprints, 4 m of the OSM trees, 3 m of the water, 5 m of the bridge ways, 4 m of the camera poses, 3 m of the pitch / playgrounds / plazas; slope <= 1:4 on land and on the 120 ways). Fast (no three.js).
* `lib/relief-rules.mjs`: the rules as functions over a height function `gh(x, z) -> number | null` (shared by the authoring loop, `tools/tauride-relief-plan.mjs` and `tools/tauride-height-test.mjs`, which runs them on the REAL built module and on eleven mutants that must fail them).
* `people-probe.mjs`: the `--eval` script of `tools/people-test.mjs` (`node tools/area.mjs north tools/people-test.mjs --at tauride --eval tools/tauride/people-probe.mjs --seconds 40`): the nav nodes on the hills, `nav.surfaceY` on 20,000 hill points, and the walkers standing or walking on the hills against `heightAt`.
* `heightat-bench.mjs [--mode full|paradny|old] [--repeat N]`: the cost of `layout.heightAt` over the 80,868 points of the garden box (cold first pass and warm best of nine); run as the North or as the strip. `--repeat 25` is the gate measure (fresh processes, the modes interleaved, mean / median / min and `fullVsParadnyPercent` against the +30 % of the plan; one process is noisy by +-1 ms, run it when nothing else does). About 13 ms of the 19 ms cold baseline are the one-time initialisation of the waterway polygons, which dilutes the percentage: the absolute added cost (`addedColdMs`) is the honest number.
* `strip-furniture-claims.mjs`: the proof that the claim skip of `props/osm.js` cannot move the strip (0 claimed FURNITURE records among the strip's 561 claimed ids).
* `car-keepout-sim.mjs [--quick | --full] [--no-world]` (T2 fix round 2; `node tools/area.mjs north tools/tauride/car-keepout-sim.mjs`, about 100 s; `--full` 2,192 runs about 3.5 minutes): the DYNAMIC proof of the garden's car keep-out. Real cars (coupe, roadster, truck) are driven at the closed ground and the footprint (centre + eight points) is measured after every step: three synthetic worlds (a box between the lane and the ground, a footprint embedded in a building that touches it, a car that starts inside), then the REAL North (12 modules built headless, 37 k colliders, the bus shelters included) from 60 points of the outline at seven headings, plain and nitro, and the bus-stop grid of the QA report. Two copies of `drive/handling.js` with one guard cut out (loaded from memory through a data: URL; the cut must find its text) must breach the same scenarios: M1 without the undo of the contact push, M2 without the keep-out term of the embedded rule. The static predicate test of `tauride-height-test` cannot see these holes.
* `terrain-material-test.mjs` (`node tools/area.mjs north tools/tauride/terrain-material-test.mjs`, 12 s): the relief is painted with the ground's own shader. Builds `environment` + `landmarksTauride` headless and checks that the terrain meshes share one material that carries the ground's `onBeforeCompile` and `customProgramCacheKey` (same program, same uniform objects, same shader text), has the program parameters of the ground and NO polygonOffset, no vertex-colour attribute, and that a context without a ground gets the placeholder; four copies of `terrain-mesh.js` with one line cut turn it red. What the CPU cannot show is the picture: a GPU look at the hills from 18-120 m is still the acceptance.
* `tools/tauride-relief-plan.mjs [--out png] [--table]`: the hillshaded contour plan (the image the user confirms the design heights on) and the relief table in markdown.
