# The Tauride Garden remake: hand-off and log

The document of the garden team (Track B of the areas plan, `docs/AREAS.md`). It says what the remake is, what is already prepared (phases T0 / T1: data, tooling, checks), the plan **corrected** with what the scouting of the
source repository and the North data found, the facts and tables the garden starts from, the commands that verify it, the open questions, and (section 12) an empty log for the agents that follow.
Numbers marked **DESIGN** are design values of the plan, not surveyed. Engine line numbers are at `feat/areas` 7deb152; the M6 hook set (branch `m6-hooks`) moves some of them.

## 1. Goal

The North page shows the Tauride Garden today as what the generic North makes of it: a 19.8 ha park polygon of lawn with procedural trees at full density, maroon street ribbons for the 118 mapped alleys, benches and bins drawn
by `props`, no water, no fence, no bridges, no relief, the palace and the Paradny quarter as generic blocks. The remake (plan section 5) builds the garden as a place: Gould's two ponds with islands and banks, hills heaped from the
pond soil, pale-gravel alleys, old trees at the borders and open lawns in the middle, five numbered bridges and the dam, the cast-iron fence with its gates, the Pioneers memorial, the "Boy with a duck", benches and bins, kept
in sync with the real OSM geometry; the Palace and the Paradny quarter are kept as they are in the source repository. The garden must be walkable (no wading trap, no slope the engine cannot climb, cars kept out) and cheap enough for the North budget.

## 2. What T0 / T1 delivered (this branch, `tb-data`)

New files only (plus one line in `.gitignore`: `tools/tauride/raw/`); no engine file, `area.js` or `layout.js` is touched. Details: `tools/tauride/README.md`.

| item | files | verified by |
|---|---|---|
| generators moved from `D:/temp/piter-east`, repo-relative, idempotent, facade input | `tools/tauride/*` | the legacy mode reproduces the source `terrain.js` (all 6 exports), `palace-parts.js`, `paradny-roofs.js`, `paradny-floor.js` exactly |
| derived data | `src/world/landmarksTauride/data/{water,bridges,paths,furniture,footprints}.js` (84 kB, pure data, ODbL header) | `node tools/tauride/data-test.mjs`: 141 checks, deterministic (two runs byte-identical and identical to the committed files) |
| 12 acceptance camera poses, corrected, and the two VIEWS proposals | `tools/tauride-cams.mjs`, `tools/tauride-cams-check.mjs` | the check (also `--colliders`: the real modules of the North page) |
| CPU wading / walkability harness (real `Player` + `Physics`) | `tools/tauride-height-test.mjs`, `tools/tauride/lib/{stub-env,height-harness,demo-models}.mjs` | generic North passes trivially; self-check on three synthetic models; the old trap is reproduced on the source module (12 of 14 probes enter, 0 of 12 exit) |
| acceptance overlay | `tools/tauride-overlay.mjs` | `--selftest` (synthetic images made from the data) |
| docs | this file, `docs/research/north-tauride.md` (copy of the source dossier), `docs/research/tauride-reference.md` (what the real place looks like at the 12 poses, public photo sources) | - |

Not done here (and why): no GPU frame of any kind (no GPU); the baseline screenshots of the old garden are therefore still open (section 3, T0); `src/areas/north/area.js`, the engine hooks and the port of the Palace and Paradny are the next steps.

## 3. The corrected plan

The plan of section 5 was written against the source repository and mixed its line numbers with n4spb's. What changed after the scouting (`D:/git2/n4spb-work/tauride-source-map.json`, 55 items) and this preparation:

* **The old garden module is not ported.** `landmarksTauride/garden.js` (93 dense lines: 166 k triangles, flat water at -0.55, 744-777 granite bank blocks, flat bridge decks, a 895-panel fence of ~144 k triangles, 63 benches) and `terrain.js` (29 kB of data) are replaced by new files under `src/world/landmarksTauride/` and the data modules of section 2. Only the idea of the deck extension (bridge ends must reach dry land: `BRIDGE_EXTEND`, `bridges.js`) and the "bbox reject first" idiom of `deckY` carry over.
* **The Palace and Paradny ARE ported verbatim, in a first step, and that step activates the M6 hooks.** The Paradny hook set of M6 is delivered dormant (it activates when `landmarksTauride` is in the North `MODULES`). Of the 10 source files only `landmarksTauride.js` (entry: drop the `garden` import and call, publish the services below), `groups.js` (rewrite as literal data: no `terrain.js` import, which only exists to list 8 ids) change; `palace-parts.js`, `paradny-buildings.js`, `paradny-courts.js`, `paradny-floor.js`, `paradny-roofs.js` and `paradny-surface.js` are copied unchanged.
* **The module is 778 k triangles, not 0.5-0.8 M "to be cut to 120 k":** Paradny is 551 k of them (section 5).
* **The plan's cars rule ("11 gate bollards") is incomplete** (section 6.5); the engine items the plan missed are in section 4.

| phase | content (corrected) | needs | done when |
|---|---|---|---|
| **T0** (this branch, done except the GPU part) | generators, data, cameras, harness, overlay, docs. **Still open:** baseline frames of the OLD garden from the SOURCE repository at 0568f7af (`tools/shot.mjs` there, `?only=...`, the 12 poses + the aerial; the screenshot of 2026-10-03 predates the podium and the later tree changes), the Paradny decimation decision, the agreement with Track A on who lands which hook | a GPU, the user | frames in `shots/`, decisions in section 11. **T1 note on the baseline frames:** the module deliberately has no garden yet, so the generic North (the park polygon as lawn, the maroon ribbons, full-density trees, no water) IS the real "before" of the remake; the QA agent takes the baseline frames at the 12 poses of section 8 from the North page built at T1 (Palace and Paradny already the module's), not from the source repository |
| **T1** Palace + Paradny port + hooks (**DONE**, branch `tb-t1`, log entry in section 12) | copy the 7 files, edit the entry and `groups.js`; `area.js`: import `GROUPS_LIST`, `GROUPS.landmarksTauride`, `MODULES` after `landmarksKirochnaya` and before `streets` (the module must precede `streets` / `city` because it claims ids and cannot read their services), `LABELS`, `TEST.claimed`, `PRUNE_SERVICES` (entrances of the garden gates, clearance 4); regenerate `lib/owns-table.js`; `check.mjs` BUDGET tripwire for the module (~0.8 M) | M6 merged (HEIGHT_PATCHES with the podium) | `tools/tauride/paradny-walk.mjs` (8 stairs, 0 failing), layout-golden unchanged for the strip, `layout-test`, `views-check` (Digit4 stands ON the podium: expected), `owns-table --check` |
| **T2** terrain | pure `landmarksTauride/height.js` (bbox reject first) + a HEIGHT_PATCH; DESIGN relief (section 7); pond beds; the raster only if the feature list is too slow | M6 `HEIGHT_PATCHES`; the harness | `tools/tauride-height-test.mjs --model <yours>`: wading, route, slope |
| **T3** ground and paths | garden-owned ground, ribbons per class (`paths.js`), **claim the way ids** (`osm` of the sub-group: 120 ways + decide the service lane, section 6.5) so `streets/paths.js` skips them; the garden lights itself (0 facade lamps in it; 17 ways are `lit`) | T2 | overlay on the user's screenshot |
| **T4** ponds, banks, bridges, dam, ducks | pond builder (a new `LOOK` key in `environment/water.js`), the engine items 1-7 of section 4, bridges from `bridges.js`, the dam at `DAM.authoritative`, duck lanes | T2, section 4 | height-test: wading / landing / cars |
| **T5** vegetation | claim the park r1582734 and the 23 woods (`footprints.js` `GARDEN_GREEN`), own zones (border belt, groves, meadows, shore), larch, optional willow, the 7 OSM trees; keep out of the 13 footprints | T3 | canopy per quadrant (overlay), triangle budget |
| **T6** furniture, fence, gates, monuments | 132 benches + 167 bins as instanced meshes (claim their ids; props skip, section 4 item 4), fence panels with the 13 openings, gates, Pioneers memorial, Chaikovsky, Yesenin, the fountain, orangery, pitch and playgrounds | T3 | data-test ids, budgets |
| **T7** integration | nav (deck exemption, surfaceY), region bake, perf at the 12 poses in both tiers, photo contact sheet | all | section 9 |

## 4. The engine items the plan missed (and the ones it cited wrongly)

Every item is a strip-neutral hook (table empty or module absent = nothing changes): prove each with `layout-golden --diff`, `owns-table --check`, `npm run check` and the streets / city signatures. `src/world/layout.js` must not gain an export (the golden dump lists them).

| # | what | where in n4spb (7deb152) | note |
|---|---|---|---|
| 1 | ground must be cut where a pond bed is below y = 0 | `environment/ground.js:185-197` `groundCuts()` = `waterCuts()` + `GROUND_HOLES` | the source cuts `[...waterCuts(), ...pondCuts()]` at y -0.4; the plan cites source numbers (`ground.js:237-260`) |
| 2 | the pond union into the field's water mask and `env.waterAt` | `environment/river.js:21-40` (`waterCuts`, `waterPolys`: rivers only), `environment/field.js:306` (`for (const w of waterPolys())`), `environment.js:78` | people, trees, wildlife read `waterAt`; the strip must stay unchanged (empty table) |
| 3 | people: the 8 garden bridges are water for pedestrians (`onDeck()` is the Anichkov bridge only) and need `surfaceY` | `people/nav.js:134,139,163,255` and `:642-651` | not in the plan; the garden crowd cap {0.22, 60} is part of M6 |
| 4 | props draw every OSM bench / bin (no claim test): 132 + 167 in the garden | `props/osm.js:52-56` (`for (let f of FURNITURE)`, `S.lmBench`) | cheapest hook: skip `L.isClaimed(f.id)` for bench / waste_basket (0 of the strip's claimed ids is a FURNITURE node) |
| 5 | `PRUNE_SERVICES` entry `landmarksTauride` (entrances clear trees, 4 m) | `environment.js:46,107`, table in `area.js` | data edit |
| 6 | car keep-out polygon, not bollards; the car predicate `heightAt < -1` does not see a -0.5 pond | `drive/handling.js:50-56` `solidBlocked` / `blocked`; the plan's `:27-33` is source numbering | 2-line hook (section 6.5) |
| 7 | duck lanes on the ponds; lane y must be the water level (-0.45) | `wildlife/ducks.js:18,62` (`LANE_KEYS` only) | a pond branch or `ZONES.duckPonds` |
| 8 | a new `LOOK` key for the pond water (greenish, duckweed band on the Small Pond) | `environment/water.js:26` (`LOOK`), `:36` (`waterMaterial`, exported), `:165` (`buildWater`: waterway keys only) | no pond builder exists: the garden writes its own and calls `waterMaterial` |
| 9 | y-aware placement of everything that assumes y = 0: grass tufts (`lawns.js`), the 7 OSM trees, props, ground birds, colliders added with absolute y ranges (fence 0..1.9, benches 0..1.02, trunks) | `heightAt` is used by 14 files only (player 11, nav 8, handling 7, physics 7, ...) | if the garden claims the park and the woods, only the 7 trees and the colliders remain |
| 10 | `tree-instances.js:13` writes y = 0 unless `shapeOf` supplies it | `environment/trees.js:372` calls `createTreeInstanceWriter(list)` without `shapeOf` | irrelevant once the garden plants its own trees |
| 11 | landing slope check | `core/player.js` walks anything the 0.12 m substeps climb (STEP 0.45 per substep = a slope of 3.75); there is no check to extend | a NEW feature, not an edit; "max walk slope 1:4" is a content rule asserted by the harness |
| 12 | the HEIGHT_PATCHES call-site | `layout.js:102` (`heightAt` = waterway bed or 0), `lib/area-tables.js:53`; `HEIGHT_PATCHES = []` in `area.js` | M6 (Track A) lands it with the Paradny podium; T2 needs it |

Wrong in the plan: the trees "hack to retire" (`trees.js:436-445`) does not exist in n4spb (the generic North plants the FULL density); `tools/overlay.mjs` is not in n4spb (the overlay here is new); `groundAt` of the car is a constant 0.03 in both repositories; the lamps need nothing (`lamps.js:132` already honours `pedestrianOnly`), but a claimed way loses its street lamps, so the garden lights itself.

## 5. Triangle and draw reality (source module at 0568f7af, measured by the scout)

| part | triangles | meshes |
|---|---:|---:|
| Paradny buildings | 551,325 | 24 |
| garden (`garden.js`) | 166,068 + 8,316 (693 instanced benches) + 623 (ponds) | 3 + 2 + 1 |
| Paradny courts | 29,075 | 15 |
| Palace | 22,853 | 11 |
| **module** | **778,260** | 56 meshes, 2,996 colliders, build 1.1 s in node |

The plan's "Tauride 0.5-0.8 M -> the remake targets <= 120 k" conflates the module with the garden: the garden budget (<= 120 k, <= 60 added draws) saves ~55 k of 778 k. After the rewrite the module is still ~0.72 M unless Paradny is decimated
(windows, balconies, pilasters of 11 buildings): a decision for the user (section 11). Custom `onBeforeCompile` materials must be `ctx.noBatch` (`ground.js:219` pattern). `heightAt` is evaluated for every map point at start-up (measured 82,500 calls on the garden box = 70 ms): patches reject by bounding box first.

## 6. Facts and tables derived from the data

Source of everything below: OpenStreetMap contributors, ODbL, through the North facade (`src/areas/north/data`, the full-city data of 102_3d_piter at `0568f7af`); the generators are in `tools/tauride/`.
The facade is a **simplified copy** of the map: the garden outline has 66 vertices (the source's `terrain.js` 81), ways moved by up to 0.31 m, the outline by 0.34 m.

### 6.1 Counts

| | count | note |
|---|---|---|
| garden outline | 1 polygon, 66 vertices, 197,570 m2 (19.76 ha) | the plan's 21.1 ha includes the palace grounds |
| garden ways | **120** = the 118 of the source's `terrain.js` + 2 newer footways (`w425188838` 9.8 m, `w425188839` 19.1 m, both 20-30 m inside the outline) | 110 non-bridge ways, 8,995 m (legacy 118) |
| bridge ways | 8 (6 crossing sites) | section 6.3 |
| fence ways | 14, 2,409 m, 897 panels of 2.7 m | one way (`w81524430`) is the closed pitch fence |
| gate nodes | 11 | section 6.5 |
| benches / bins / other | 132 / 167 / 6 (picnic table 1, bicycle rental 1, bicycle parking 4) + the fountain | 306 FURNITURE records |
| OSM trees | 7 (997,-1413.1) (1298.5,-1553.9) (1313.4,-1530.4) (1281.2,-1579.5) (1289.7,-1553) (1308.9,-1547.5) (1309.2,-1537.1) | no TREE_ROWS touch the garden |
| monuments | 3: Chaikovsky n2974761162 (932,-1311.1), Esenin n4222941889 (1004.7,-1359.3), Pioneers-heroes n4186236011 (1371.2,-1451.9) | fountain "Boy with a duck" n950150577 (1282.6,-1400.5). OSM and Commons say the memorial is **1962** (plan: 1975), 4.8 m, limestone |
| GREEN | park r1582734 + 23 wood polygons (88,356 m2) + 3 playgrounds (w188083933, w69029505, w188083935) + the pitch w81524430 + the fitness station w423708263 + the wetland w188083936 (the lake island) | the woods are the claim list for vegetation |
| facade LAMPS in the garden | 0 | 17 ways are `lit=yes` |
| palace | r3801092, `castle`, 6.6 m / 2 levels in OSM (the source uses design heights 11.5 .. 16.5 m), 0 m2 inside the garden outline | |

### 6.2 Water (`data/water.js`)

OSM maps the lake r1582714 (18,567 m2 with its island hole of 305 m2) and the west pond r6278222 (4,428 m2) as polygons and the four canals only as **centre lines**: the widths are ESTIMATED.

| canal | centre line | estimate (source repository) | width USED | what the estimate would have drowned | area added beyond the OSM polygons |
|---|---|---:|---:|---|---:|
| `w30198531` east arm round the Pioneers island | 26 pts, 1393,-1464 -> 1334,-1429 | 12 m | **12 m** | nothing (at 14 m: 15 m of way) | 5,252 m2 |
| `w81524420` south arm | 15 pts, 1328,-1342 -> 1311,-1385 | 12 m | **8 m** | **33.5 m of four footways** | 1,369 m2 |
| `w112853212` canal of the west pond to the dam | 15 pts, 1052,-1536 -> 1274,-1655 | 10 m | **8.5 m** | 1.5 m of three footways | 169 m2 |
| `w112853192` short channel, no bridge | 2 pts | 6 m | **6 m** | nothing | 0 |

* **Where the estimate comes from:** the source repository's generator and `north-tauride.md`: "6-12 m visual widths estimated from mapped crossing lengths and an aerial photograph (Wikimapia), not surveyed". The bridge spans are NOT an independent check (the strip width is the water span of the bridge that crosses it).
* **Why the widths used are lower:** a mapped footway is better evidence than the estimate, so `derive.mjs dryWidth` lowers a width in 0.5 m steps until no non-bridge garden way lies under the strip (`CANAL_DRY_RULE`, `tables.mjs`). The upper bounds are 8 m (south arm), 8.5 m (west-pond canal), 12 m (east arm). The garden team may overrule the table.
* **The union** (`WATER_UNION`): ONE polygon of 136 vertices with 3 holes (33 / 11 / 17 vertices), net **29,669 m2** (the old module: 30,487 m2 with the old widths), shoreline 2,666 m (old 2,691 m). **22.9 % of the water (6,790 m2) lies in estimated strips**: the east arm is almost entirely estimated.
* **Holes (islands):** `island-east` 17,409 m2 (the Pioneers memorial, reached by bridges No.3 and No.4); `island-south` 1,937 m2 (between the south and the east arm; **no mapped way reaches it**: unreachable on foot); `island-lake` 305 m2 (the lake's own island, the wetland w188083936; unreachable). The plan's "two islands" are the two in the Big pond (east, south); the third hole belongs to the lake relation.
* **Canal ends** that OSM draws on the lake outline lie 0.0-0.08 m off it in the simplified facade: they are moved 1.5 m into the lake (`joinCanal`, `CANALS[].joins`); without it the union pinches and the east island is no hole.
* The union is rounded to 1 mm, ring-cleaned and asserted valid by shapely 2.1.2 (GEOS 3.13.1); `data-test.mjs` re-checks the validity without Python (no self-intersection, holes inside, both OSM outlines and every canal vertex inside).

### 6.3 Bridges and the dam (`data/bridges.js`)

The 8 OSM bridge ways form 6 crossing sites: the five numbered bridges and the dam. `confirmed` = the plan gives the site AND the public monument page [citywalls.ru "Мосты и плотина"](https://www.citywalls.ru/house31112.html) describes the bridge; `inferred` = by the order along the water.

| site | design type | OSM ways | centre | bearing | deck | water span | confidence |
|---|---|---|---|---:|---:|---:|---|
| No.1 | humped wooden | w112853204 (wood, 15.3 m) | 1103.4, -1586.1 | 147 | 15.3 m | 9.8 m | confirmed: "wooden arched, 2000s" |
| No.2 | flat metal | w112853220 (metal, 13.4 m) | 1225.6, -1712.2 | 141.7 | 13.4 | 8.3 | inferred ("metal in the 18th-century style, 2000s") |
| dam | weir | w112880645 (no surface tag, 7.0 m) | 1272.3, -1674.3 | 68.6 | 9.9 | 7.0 | data (see below) |
| **No.3** | **iron arch** | w81524417 + w882132271 + w882132272 (compacted 6.7 m + metal 9.4 m + compacted 5.7 m = ONE chain, 21.8 m) | 1394, -1461 | 47.6 | 21.8 | 12.1 | confirmed: the Big Bridge, 1793-94, five iron arches on granite-clad abutments, **span 13.15 m**, joins the Big island with the EAST of the park |
| **No.4** | **iron arch** | w882128034 (metal, 16.4 m) | 1333.5, -1427.1 | 114.1 | 16.4 | 12.0 | confirmed: the Small Bridge, four iron arches, **span 10.6 m**, about 3 m wide, joins the Big island with the SOUTH-WEST of the park |
| No.5 | flat metal | w112880644 (metal, 15.8 m) | 1338.1, -1330.1 | 46.5 | 15.8 | 11.9 | inferred ("first on 1966 imagery") |

* **Deck extension** (the one idea worth keeping from the old `garden.js:9-22`): a free bridge end that stands in the water moves along its axis in 0.5 m steps (max 12 m) until it is dry, plus 0.7 m of abutment; ends shared with another bridge way (the No.3 chain) are not moved. With the widths used only the dam way needs it (+1.2 m / +1.7 m); every site ends on dry land (`data-test.mjs`). `BRIDGE_DECK_WIDTH` 3 m is a DESIGN value (the facade's 2.4 m is the class default; the real No.4 is "about 3 m").
* **The dam: two positions in the plan, one authoritative.** The plan text says "(1269,-1655)", its camera list "(1272,-1674)", 19.4 m apart. **Authoritative: (1272.1, -1674.2) = the centre of the OSM way w112880645**, axis bearing 68.2 deg, across the channel that is about 8.5 m wide (estimated). Why: (1) it is the only mapped structure on the channel between the two ponds, a `bridge=yes layer=1` way WITHOUT a surface tag (all seven other bridge ways name wood, metal or compacted: this one is the dam's walkway), and it is the sixth crossing site (five numbered bridges + the dam); (2) the plan's own camera stands 0.2 m from its centre; (3) (1269,-1655) is the west corner of the end cap of the 10 m strip the source repository drew for `w112853212` (end vertex (1273.8,-1655.1) minus half the width): an artefact of an ESTIMATED strip, not a feature. The place where the channel meets the lake, `DAM.mouthOnLake` (1273.8,-1655.1), is the natural place for the weir SILL if the water level steps there. Public description: "a stone overflow dam of the 1790s between the two ponds, a federal monument".

### 6.4 Ways (`data/paths.js`)

**No OSM width tag exists on any of the 118 ways** (checked on the 2026-10-03 snapshot too); the class and the width are derived from highway, surface, `lit`, bridge and length (`lib/derive.mjs classOf`, rule in `PATH_CLASS_RULE`):
steps = highway steps; bridge = `bridge=yes`; **trail** = highway path (1.4 m); **main** = footway and (length >= 150 m, or `lit` and length >= 30 m), width 3.5 + min(length, 300) / 300 m = 3.5 .. 4.5 m; **side** = every other footway (2.4 m). A heuristic, overridable per way (`PATH_CLASS_OVERRIDES`).

| class | ways | metres | width |
|---|---:|---:|---|
| main | 21 | 4,668 | 3.5 .. 4.5 m (the perimeter ring w425201986 789 m and w1051226582 687 m, the long cross alleys) |
| side | 74 | 3,658 | 2.4 m |
| trail | 11 | 665 | 1.4 m (earth / ground paths) |
| bridge | 8 | 90 | deck 3 m (DESIGN) |
| steps | 6 | 33 | facade 2.2 m (4 at the memorial descent: w425635247, w1458068086 / 92 / 93; 2 at the wooden bridge: w415779498, w420650661) |

Surfaces among the 118: compacted 87, earth 5, ground 4, paving_stones 5, concrete:plates 2, metal 4, wood 1, untagged 10; `lit` 17. The surface class (`gravel` / `earth` / `paved` / `wood` / `metal` / `unknown`) is stored per way for the ground shader. All 120 ways form ONE connected network (the walkable raster from the south gate reaches every way, bridges included). Claiming the ids makes the ways `pedestrianOnly` and removes their street lamps (`streets.js:82-91`).

### 6.5 Fences, gates, openings, the service lane, cars (`data/furniture.js`)

| gate node | kind | position |
|---|---|---|
| n828488069 | gate | 1226, -1267.8 (the south gate; people hot spot) |
| n950150459 | gate | 924.1, -1412.1 (west gate) |
| n11695724997 | gate, access private | 924.5, -1442.6 (west; the service lane enters here) |
| n4222941897 | gate | 961.1, -1439 |
| n967683857 | gate | 1121, -1788 (north) |
| n8486544221 | entrance | 1112.8, -1686.4 |
| n1001527689, n4249215405, n4249215401, n4263458837 (access no), n4263458839 | gates | the five gates of the pitch fence: 1362.3,-1393.1; 1388.4,-1385.8; 1412.8,-1358.2; 1378,-1325.7; 1353.2,-1353.8 |

* **13 opening clusters in the mapped fence** (the rule of the old `garden.js`: a 2.7 m panel is left out within 4 m of a gate node or 2.1 m of a path): 9 path crossings + 4 gate-only with the 118 legacy ways (**10 + 3 with the two newer ways**: the stub `w425188838` ends at the gate n4222941897); 5 of them on the pitch fence. They are 2.7-10.8 m wide. `FENCE_OPENINGS` lists each with its fence, ends and causes.
* **4 unfenced stretches** of the garden outline longer than 8 m (no mapped fence within 3 m): **141 m** (1123,-1759 -> 1240,-1733, the palace side), **50 m** (1439,-1590 -> 1487,-1588), 15 m (1126,-1784 -> 1126,-1770), 15 m (1030,-1468 -> 1029,-1480). 1,932 of the 2,153 m of outline (89.7 %) are within 3 m of a mapped fence.
* **The service lane**: `w1258039516` (asphalt, 60.8 m) + `w1258039517` (paving stones, 5.8 m), 4 m wide, runs from (918.7,-1442.9) through the private west gate n11695724997 into the garden: 66.6 m (the plan's "61 m" is the first way).
* **The lake's north shore IS a fence**: `w418563880` coincides with the water outline for 58 m (the fence stands on the shore: there is no bank to walk on); `w112853216` (3 m) reaches 1.7 m into the water.
* **Consequence for cars:** "bollards 1.2 m apart at the 11 gates" leaves 13 openings, 4 unfenced stretches and the service lane open, and a car passes any gap of about 2.2 m. Use a **keep-out polygon** (the garden outline, `footprints.js` `GARDEN`) in `drive/handling.js` `solidBlocked` (an `HOOKS` entry of M6 if it lands there); decide whether the service lane is an exception (substation, "Gorka" access). Bollards stay as visuals. `tools/tauride-height-test.mjs --assert-cars` measures the breach: today 2,018 m of the 2,158 m outline can be driven across.
* The pitch fence `w81524430` is also the pitch (GREEN pitch, same id): claim it once.

### 6.6 Buildings and footprints that hills, trees and paths must keep out of (`data/footprints.js`)

11 outlines + 2 parts overlap the garden outline (the palace does not): `w30198529` 336 m2, `w30198530` the sports centre 548 m2 (+ parts `w1308718054` 50, `w1308718055` 548), `w30324534` "Gorka" 137, `w30324535` service 116, `w30324536` industrial 101, `w420650670` 134, `w423708264` toilets 36, `w423966114` 72, `w1458068095` 55, `w1458068118` 62, `w1458068119` 22 m2. `HILL_KEEP_OUT_MARGIN` 3 m is a DESIGN value. Two flowerbeds `w1458068116/17` (outside the outline) are blocked for people by `blockPolys`.

### 6.7 What the data says about the plan's numbers

| plan | data |
|---|---|
| 777 bank blocks, 2.69 km shoreline | 744 blocks in the scout's replica; the old union's shoreline 2,691 m reproduced; the new union 2,666 m |
| 21.1 ha | polygon 19.76 ha |
| 118 ways, 94 % compacted / earth | 120 ways; 93 % of the tagged non-bridge ways, 80 % of all |
| 5 bridges | 8 ways, 6 sites |
| "two islands" | 3 union holes (2 in the Big pond + the lake's island) |
| memorial 1975 | 1962 (OSM, Commons) |
| 11 gates | 11 gate nodes, 13 openings |

## 7. Datums and design values

**DESIGN values (not surveyed; confirm after the first screenshots):** hills up to ~5 m (north hill +4.5 m, range 3-6; 5-8 bank mounds 1.2-3 m; island-2 mound 1.5 m); water surface **-0.45**; bed **-1.2** (Big pond) / **-0.5** (Small pond); bank top +0.1 -> slope 1:3 .. 1:5 -> waterline; max walk slope 1:4; stair, bridge and gate details; deck width 3 m; the heights of the palace slices.
Note the plan contradicts itself: banks 1:3 are steeper than "max walk slope 1:4" (the harness asserts 1:4 on land and ways and only REPORTS the banks).

The datums of the old module disagree, which is how the trap came about; the remake must pick ONE water level and derive the rest:

| what | old module / engine | value |
|---|---|---|
| water mesh | `garden.js:27` | y -0.55 |
| ground cut / pond cut | source `river.js:75` | y -0.4 (park ponds -0.35) |
| bed (`layout.heightAt`) | source `layout.js:206` | -1.4 |
| shore box collider | `garden.js:33` | y -1.5 .. 0.22 (a walker at y 0 is not blocked: `physics.js:233` skips a box when feet + 0.45 >= its top; at feet -1.4 it blocks, and `DROP_MAX` does not apply to terrain, `player.js:310`) |
| park-pond collider (Kronverk) | source `water.js:239` | y -2 .. 1.25 (blocks at every feet height) |
| flight landing refused as 'water' | `player.js:136` | ground < -1 |
| car blocked | `drive/handling.js:51` | `heightAt < -1` |
| step / drop | `physics.js:16-18` | STEP_HEIGHT 0.45, DROP_MAX 1.2 (non-terrain surfaces only) |
| jump | `player.js:70` | vy 4.2 = apex 0.73 m |

The plan's fix "shore colliders at the -0.3 contour, no wading" is plausible but underspecified: the collider top must exceed (contour feet + 0.45), i.e. reach above 0.15 m, and a -0.5 bed (Small Pond) triggers neither the landing nor the car predicate (they need < -1). `tools/tauride-height-test.mjs` carries a synthetic version of exactly this fix (`demo-contour`: bank 1:3, colliders on the -0.3 contour reaching 1.25 m) and it passes; the copy of the old module (`demo-trap`) fails with 14 of 14 probes trapped.

## 8. Cameras

The 12 acceptance poses (`tools/tauride-cams.mjs`), corrected from the data and proven by `tools/tauride-cams-check.mjs` (11 ground poses dry with >= 3 m margin from the water outline, outside buildings, off roads and bridge decks, reachable on foot from the south gate, with a line of sight; the real colliders of the North page do not push any of them). x east, z south, yaw 0 = north / 90 = west / -90 = east / 180 = south, pitch + = up.

| id | pose | x | z | yaw | pitch | looks at | the plan's pose and its fault |
|---|---|---:|---:|---:|---:|---|---|
| T01 | South gate | 1226 | -1278 | -180 | 4.5 | the gate n828488069, 10 m | (1226,-1268): in the gate opening on the fence line |
| T02 | Iron bridge No.3 | 1404.5 | -1438 | 24.5 | -0.5 | the chain at (1394,-1461) | (1390,-1457): on the deck of w81524417 (0.3 m) |
| T03 | Pioneers memorial | 1384 | -1439 | 44.8 | 5.7 | the memorial (1371.2,-1451.9), 18 m | (1371,-1452): the memorial itself |
| T04 | Wooden bridge No.1 | 1113.5 | -1605.5 | 152.5 | -0.5 | (1103.4,-1586.1) | (1103,-1586): on the deck |
| T05 | Dam | 1265 | -1653.5 | -18.9 | -2.4 | the dam (1272.1,-1674.2) | (1272,-1674): on the deck; the text's (1269,-1655) rejected |
| T06 | Iron bridge No.4 | 1330.5 | -1405 | -7.7 | -0.5 | (1333.5,-1427.1) | (1334,-1427): on the deck |
| T07 | Football pitch | 1353 | -1356.5 | -91 | -2.3 | the pitch (1383,-1356), 30 m | (1383,-1356): inside the fenced pitch |
| T08 | Fountain | 1279.5 | -1392 | -20 | -1.3 | n950150577, 9 m | (1283,-1401): the fountain itself |
| T09 | West gate | 934 | -1412 | 89.4 | 4.6 | the gate n950150459, 10 m | (924,-1412): in the gate opening |
| T10 | Open meadow | 1100 | -1350 | -3.3 | 2 | the wood belt w1458068124, 90 m north | valid; the look direction was missing |
| T11 | Palace garden facade | 1456.5 | -1578.5 | 49.9 | 3.6 | the palace's south front (1379.9,-1643), 100 m across the lake | (1380,-1700): **inside the palace footprint r3801092** (it spans z -1811 .. -1643; the garden front is at -1643 and the lake lies between) |
| T12 | Aerial (flight) | 1200 | -1250 | 0 | -65 | y 230: the southern half of the garden (z -1260 .. -1580) | valid as given |

**North VIEWS poses (APPLIED in T1: Digit5 and Digit6 are these two rows in `src/areas/north/area.js`).** Both are valid in today's generic North and stay valid once ponds, banks and hills exist; both pass the tests of `tools/views-check.mjs` including the real colliders (`node tools/tauride-cams-check.mjs --colliders`):

```js
{ key: 'Digit5', label: 'Таврический сад',     x: 1368, z: -1471, yaw: -4,  pitch: 2 },   // on w1458068089 at the north end of the memorial island, 8 m from the water, looking across the lake at the palace
{ key: 'Digit6', label: 'Таврический дворец',  x: 1379, z: -1800, yaw: 180, pitch: 8 },   // in the palace front court, 48 m from the portico: the six-column portico and the dome
```

Digit5 was (1390,-1457): on the deck of bridge w81524417 (0.7 m from the water). Digit6 was (1379,-1600): IN the lake, 14 m from the shore. Both would turn `layout-test` / `views-check` red the moment `heightAt` knows the ponds.

## 9. Acceptance

**Machine checks (CPU):** `tools/tauride-height-test.mjs` (wading or no trap; south gate -> memorial route; slope; flight landing; car keep-out with `--assert-cars --assert-landing`), `tools/tauride/data-test.mjs`, `tools/tauride-cams-check.mjs`, `tools/tauride/paradny-walk.mjs` (after the port), the budgets (`npm run check:north`, `check.mjs` BUDGET), z-fight probe, fps / draws at the 12 poses in both tiers (GPU).
**Human review:** the contact sheet real | model at the 12 poses, scored by the user (`docs/research/tauride-reference.md` lists public sources).
**Overlay:** `tools/tauride-overlay.mjs` against ONE user-supplied satellite screenshot with two georeferenced points; its thresholds are the plan's (water IoU >= 0.90, path P90 <= 3 m, canopy within +-10 points per quadrant). The part that needs the user's image: the aerial, its georeference and the traced masks or colours (`tools/tauride/README.md`). The P90 against the OSM-built model is circular unless the path mask comes from the image; the machine acceptance is therefore the CPU checks and the overlay is a sanity check of registration and water shape.
**Requires from the user:** 8-12 own photos or a satellite screenshot at the 12 poses (git-ignored, comparison only); confirmation of the hill heights after the first screenshots.

## 10. Commands

```
node tools/tauride/build.mjs --check            # the committed data modules equal what the facade gives (needs python + shapely)
node tools/tauride/data-test.mjs                # 141 checks ( --no-regen skips the python runs )
node tools/tauride-cams-check.mjs [--plan] [--colliders] [--poses yourposes.mjs]
node tools/tauride-height-test.mjs              # generic North + self-check of the harness
PITER_SRC=D:/git2/agi-fun-tests/102_3d_piter node tools/tauride-height-test.mjs --source     # the old trap: 12 of 14 enter, 0 exit
node tools/tauride-height-test.mjs --model path/to/yourmodel.mjs [--build landmarksTauride] --assert-cars --assert-landing
node tools/tauride-overlay.mjs --selftest
node tools/tauride-overlay.mjs aerial.png --geo x0,z0,x1,z1 --water-color 40,80,70 --out shots/tauride/overlay
node tools/tauride/paradny-walk.mjs             # after the Palace + Paradny port (or with PITER_SRC)
```

Repository checks that must stay green: `npm run importlint`, `npm run runtimelint`, `node tools/layout-golden.mjs --diff`, `node tools/areas-test.mjs`.

## 11. Open questions

1. **User:** photos / a satellite screenshot at the 12 poses (section 9) and the confirmation of the hill heights after the first screenshots.
2. **Paradny decimation:** accept ~0.72 M triangles for the module after the rewrite (Paradny alone 551 k), or decimate windows / balconies / pilasters in T1?
3. **Which dam position:** this document decides (1272.1,-1674.2 = w112880645, section 6.3); the user may overrule.
4. **Bridges No.2 and No.5:** the data cannot tell which of the two flat metal bridges (1225.6,-1712.2) and (1338.1,-1330.1) carries which number; No.1, No.3, No.4 are confirmed.
5. **The canal widths** (6 / 8.5 / 12 / 8 m used) are estimates bounded by the mapped footways; a survey or the user's screenshot would settle them. The south arm in particular is mapped as a line only.
6. **Hook ownership:** who lands the engine items of section 4 (recommended: Track B lands the pond cut, the water-mask hook, the props claim skip, the nav deck exemption and the keep-out in small strip-neutral commits; Track A's M6 lands HEIGHT_PATCHES).
7. **The service lane** (`w1258039516/17`): may AI traffic still reach the substation / "Gorka" through the west gate, i.e. is the keep-out polygon allowed an exception?
8. **Claim the two newer ways** (`w425188838`, `w425188839`) together with the 118: recommended, else `streets` draws them as maroon ribbons beside the garden's own paths.
9. The cast-iron fence date (the plan 1896, Wikipedia 1869) and the "Boy with a duck" date (1910) are unverified.

## 12. Log

(later agents append dated entries here: what was done, the commit, the checks run and their results.)

### T1, 2026-10-22: the Palace and the Paradny quarter ported, the M6 hooks active, the viewpoints (branch `tb-t1` from `feat/areas` 4eb2a0e; CPU only, no GPU frame)

**Commits** (every message ends with the Co-Authored-By line): `e6654fc` the port (six verbatim files + entry + literal `groups.js`), `44111fe` the five VIEWS poses, `7da4e17` the wiring, the flipped tripwires and the twin test, `f074b79` the regenerated North golden, and the docs commit (this entry, `docs/AREAS.md` 8 and 9).
No engine file was touched: the strip cannot move by construction, and it did not (below).

**What was done**
1. **Port** (`src/world/landmarksTauride.js`, `landmarksTauride/{palace-parts,paradny-buildings,paradny-courts,paradny-floor,paradny-roofs,paradny-surface}.js`): the six files are byte-identical to the source at 0568f7af with the CRs removed plus one provenance line each (checked by a script that re-reads the written files). The entry keeps `palace()` verbatim, drops the garden import and call (`garden.js` and `terrain.js` are NOT ported) and publishes `ctx.services.landmarksTauride = { paradny: courts, deckY: (x, z) => courts.deckY(x, z), triangles }`. `groups.js` is literal data: `tauride-palace` (r3801092, at [1380, -1735]) and `paradny-quarter` (the 11 building ids, osm: the two fountain WATER ids w1501496505 / w1501496506, at [944, -1038]); no `tauride-garden-bridges` (the later phases claim the garden). `OWNS_GROUPS = true`. **No `entrances`**: the source's list was the 11 garden gates (`garden.js:29`), the palace and the quarter have no door points, so `PRUNE_SERVICES` is unchanged.
2. **Wiring** (`src/areas/north/area.js`, only the allowed rows): `import { GROUPS_LIST as G_TAURIDE }`, `GROUPS.landmarksTauride`, `'landmarksTauride'` in `MODULES` between `landmarksKirochnaya` and `streets`, `LABELS` ('Таврический дворец и Парадный квартал'), 12 `TEST.claimed` rows (the palace and the 11 buildings, with `by` and `group`); three comment lines of `area.js` that said "the Tauride remake is still to come" were updated (comments only). `src/world/lib/owns-table.js` regenerated (22 modules), `tools/check.mjs` BUDGET `landmarksTauride: 700e3`.
3. **Activation**: with the module in `MODULES` the M6 set is on (patch, keep-outs, pedestrian-only ways, parking reject, deck service). The four tests that said "no landmarksTauride in MODULES" were flipped, each with a comment that names T1 (list in `docs/AREAS.md` 8.9); nothing was deleted: `north-keepout-test` got four variants because the CLAIMS of a built module change trees and props on their own (see "decisions"). The new twin check pins the module's `paradny-surface.js` to the `hooks/paradny.js` port (exports, the golden lattice, 498,703 direct probes; three mutants each fail 2-3 checks and the file is restored).
4. **Views** (`makeViews`): Digit5 (1368, -1471, yaw -4, pitch 2) and Digit6 (1379, -1800, yaw 180, pitch 8) from section 8; Digit4 (900, -852, yaw 0, pitch 16) off the podium; Digit0 (1224, -1266, yaw -173, pitch 10); Digit3 (-167, -1157, yaw -107, pitch 20). `TEST.viewKeys` unchanged. Candidates and alternatives: `docs/AREAS.md` 8.9.
5. **Golden**: `tools/golden/layout-north.json` regenerated; strip golden untouched.

**Decisions and why**
* **The deck service is the Paradny deck alone** (the source merged the garden's bridge deck in; the later phases compose it: `courts.deckY(x, z) ?? bridgesDeckY(x, z)`).
* **`north-keepout-test`: four variants instead of two**. Before T1: `off` (no hooks) / `real` (the page: Paradny dormant) / `fake` (list + module: Paradny on). A module in the build list also claims its buildings (`lib/claims.js`), so `real` and `fake` now differ by nothing and the former `real` differs from `off` by claims AND hooks. The variants are now `off0` / `dormant` (the list WITHOUT the module, hooks deleted / as built: the former off / real) and `off` / `real` (the page's own list: the former `fake` is `real`), and the Paradny effects are measured against `off`, never against `dormant`. A measured consequence: the claims alone already take 4 of the 5 props out of the podium (5 under `off0`, 1 under `off` and `real`), so `real` against `off` can no longer see `propReject` change a prop. (Fix round 1: the first version of the check only compared against `off0`, which the claims satisfy alone, and a deleted `propReject(cx, cz)` call site stayed green; a fifth variant `fake` = `off0` + `propReject` alone, no claims, restores the proof: 5 props in the podium -> 1, and the mutant is red.)
* **`north-hooks-test` / `-height-test`: the "either state passes" escapes were removed** (`|| MODULES.includes(TAURIDE)`, `mod ? ... : ...`): the active branch is asserted, the dormant branch lives in a new `dormant` child (a data: URL area module = the page's list minus the module) and in a stale-baseline fix of the what-if (its baseline was this process's own `heightAt`, which has the patch now; it is the old line).
* **The Digit4 move, not a `views-check` edit** (the file is not part of T1). The podium is the better vantage (from the street only 8-34 % of the facade samples of the quarter are visible; the ring buildings face inward): the lead may prefer to keep a podium pose and let `views-check` accept the height where a patch answers (`ph.groundHeight` band).
* **A bake is NOT taken** (GPU; the bake stays stale until M8). `npm run bakecheck` is red as on `feat/areas`.

**Numbers** (CPU; the module alone and the page)
* `landmarksTauride`: **621,713 triangles**, 52 meshes (after the batcher), 234 instances (the fountain jets: 18,460 triangles of them), 1,270 colliders, 42 materials, canvas 966,656 px, 2 update functions, **build 804 ms** (check.mjs; 593-1,024 ms inside the full page builds). Parts of the source's measure: Paradny buildings 551,325 + courts 29,075 + palace 22,853 = 603,253, plus the jets. BUDGET 700 k.
* `npm run check:north` (15 modules) before -> after: sum 3,263,329 -> 3,866,864; `city` 803,387 -> 787,005 (-16,382 triangles, -355 colliders), `streets` 589,819 -> 588,603, `props` 214,738 -> 214,242 (578 -> 575 meshes), `environment` 318,314 -> 318,230; the other ten modules did not move (services lists only). Strip `npm run check`: **identical in all 25 modules**.
* Golden: strip identical; North regenerated (GROUPS / SUBGROUPS / MODULE_KEYS, 5 VIEWS, the probe sets +2 points). **heightAt vs the old line on a 2 m lattice over the whole North (1,817,508 points): 18,570 differ, all inside [741, 1058.51, -1205, -873], all equal to `paradnyDeckY`; 0 outside.**
* Snapshots (`tools/north-env-snapshot.mjs`; files in `D:/git2/n4spb-work/tauride/{before,after,claims-only,before-nohooks}/`, the NEW BASELINE is `after/env-snapshot-north.json`): see `docs/AREAS.md` 8.9 for the table. The real activation equals the M6 what-if in the podium and on the streets (tuft probes 267 -> 0, pedestrian-only ways 13 -> 69, lanes 10,499 -> 10,289, slots 2,448 -> 2,447, lines 1,161 -> 1,159, podium ring 8 trees / 6 props / 267 tuft probes -> 0 / 1 mapped bench / 0) and differs from it in the trees (10,893, not 10,877) and the props (1,872, not 1,860) because of the CLAIMS (courtyard trees 374 -> 366, the streams of the woods and props re-roll: 470 tree differences outside every keep-out region, clustered at the palace); `--diff claims-only real --allow all --expect-empty paradny,campus,suvorov` = OK.
* Tests: `north-hooks-test` 196 checks OK; `north-height-test` 313 OK; `north-keepout-test --parallel --footprints` 17 OK; `north-people-hooks-test` 10 OK and `--scene` 20 OK; `tools/tauride/paradny-walk.mjs` **8 stairs, 0 failing**; `views-check` 12 poses 0 failing; `layout-test`, `landmarks-groups-check`, `areas-test`, `import-lint` (1,517 imports), `runtime-only-lint`, `gen-area-html --check`, `owns-table --check`, `hooks-syntax-check`, `tauride-cams-check --colliders` (12 poses + 2 VIEWS), `tauride/data-test --no-regen` (138 checks) all OK; `area-garage-check`, `wildlife-test`, `people-test` (default and `--at tauride`) RESULT OK; `traffic-test` (default list and the M5 + module list) identical to the M6 baseline lines (6,785 segments, 381 vehicles, 32 overlaps). The CPU suite lane: all exit 0 except `landmark-tree-bounds-test` (red on the clean `feat/areas` too).
* **Podium traffic and people**: the three straddling service ways of the M6 lens keep 16 lanes, 12 of them with a point in the polygon (six ways); none of them is in the traffic sim (all 7,074 service lanes are out of it), and five cameras x 960 s of the regional sim put 0 vehicles inside the polygon: no fix needed, the keep-out stays as the M6 left it. People: 6 minutes with the player on the podium, 0 agents inside the polygon.
* **Walker and car at the edge (a finding, not changed)**: from the street the wall holds (0 of 197 walkers, 0 of 104 cars entered), from the deck a walker or a car passes over the parapet and drops 3.3 m (208 of 240 / 104 of 119; 13 cars wedged under the wall afterwards). The source module does the same in the same harness (214 of 240 walkers): the parapet collider is 0 .. 3.3 m and `physics.js` skips a box within `STEP_HEIGHT` of the feet. Minimal fix if wanted: the collider top `Y + 1.0` in `paradny-courts.js` (a deviation from the verbatim file).

**Commands that verify it** (cwd = the worktree; `NODE_OPTIONS=--max-old-space-size=8000`): `node tools/area.mjs north tools/north-hooks-test.mjs`, `... north-height-test.mjs`, `... north-keepout-test.mjs --parallel --footprints`, `node tools/north-people-hooks-test.mjs [--scene]`, `node tools/tauride/paradny-walk.mjs`, `node tools/area.mjs north tools/views-check.mjs`, `... layout-test.mjs`, `node tools/area.mjs north tools/layout-golden.mjs --diff`, `node tools/layout-golden.mjs --diff`, `npm run check` / `npm run check:north`, `node tools/area.mjs north tools/north-env-snapshot.mjs --out x.json` then `--diff`, `node tools/owns-table.mjs --check`. The take.sh / compare.mjs harness of `D:/git2/n4spb-work/m6-baselines` runs the strip and North lanes (the pristine `feat/areas` copy for the "before" numbers: `D:/git2/n4spb-work/tauride/base`).

**Open for the next phase (T2)**
* **Re-take every North baseline from this head** (the M6 baselines and `env-snapshot-north*.json` predate the claims): the strict `--diff` of a snapshot against the M6 one is FAIL by design.
* **`HEIGHT_PATCHES`**: T2 appends the pond bed after the Paradny entry in `hooks.js makeHeightPatches`; `hooks/height.js` is the Paradny patch alone (`north-height-test` allows more entries from `hooks.js`, not from `height.js`). `north-height-test` section 7 now asserts that no VIEWS pose stands on the podium: a T2 pose on a hill or a bank must keep `views-check`'s band -0.5 .. 1.5.
* **The deck service**: add the garden bridges (`courts.deckY(x, z) ?? bridges`), and the nav deck exemption for people (`people/nav.js`, T7; the nav lattice does not know the podium or the bridges: nobody paths onto them).
* **Digit0 (1224, -1266)** stands 1.8 m south of the garden's south gate line; the fence of T6 must leave it valid (the street cross-section there is 20 m, so no valid pose can be further back); its HUD name is "Tauride Garden". **Digit5** is on w1458068089, 8 m from the water: T2 / T4 must keep it dry.
* **The podium parapet** (above): decide with the lead whether the collider top changes.
* **Claims of the garden** (T3 ways, T5 park and woods, T6 furniture) will shift the random streams again (trees, props): expect cascades in the snapshot diffs and judge them with `--allow`, as here.
* The GPU QA of T1 (the look of the palace and the quarter at Digit4 / 6, the new Digit0 / 3 poses, the podium from the street) is still to do; the bake stays stale.

### T1, fix round 1, 2026-10-22: the guard of the `propReject` call site restored (branch `tb-t1`; CPU only)

**Finding (lens, major) verified**: with `if (propReject && propReject(cx, cz)) return false;` deleted from `src/world/props/world.js` `fits()`, every T1 test stayed green. Cause: in T1 the vacuity guard of the props check became `podiumProps(off0) > podiumProps(real)`, which the CLAIMS of the module satisfy alone (podium props: `off0` 5, `off` 1, `real` 1; the log line of the T1 run said "0 stamped props gone by the hook itself"). The pre-T1 check (`goneIn > 0` between `real` and `fake`) was the only thing that saw the call site.
**Fix** (`tools/north-keepout-test.mjs` only; no engine, module or data file touched): a fifth child variant `fake` = `off0` (the page's list WITHOUT `landmarksTauride`: no claims, hooks deleted, patches emptied) plus ONE hook, `propReject`, evaluated for the page's list while the engine's `ctx.buildList` lacks the module. The variants check asserts its hooks (`['propReject']`) and list, and that everything upstream of the props (trees, tree stats, tufts, ways, lanes, parked slots, bay lines, podium ways) equals `off0`. The props check now asserts, for `fake` against `off0`: no prop that `off0` did not have, none comes into the podium, `goneIn > 0` (4 stamped props leave the podium, 5 -> 1, the mapped bench stays), the podium count is exactly `off0` minus the gone, and the totals of benches / bins / kiosks stay within 3 % (one random stream). The claims-versus-hook vacuity assertion on `off0 > real` was dropped (it measured the claims, which may legitimately change); `real <= off` ("the hook put a prop into the podium") stays and the log line prints all four podium counts. The header comment of the file was brought up to date (it still described `off` as the page's list and did not name `off0`; the `--baseline` file is written with `--child off` of a pre-T1 checkout, whose `off` is this test's `off0`).
**Proof**: the mutant (the call site deleted, scratch edit, restored with `git checkout`, `cmp` identical) now fails: `FAIL props ... vacuous: no prop that off0 stamped in the podium is gone in fake (the propReject call site of props/world.js fits() is dead ...): off0 5 in the podium, fake 5`, RESULT FAIL (1 failed, 13 passed). The unmutated run: `north-keepout-test --footprints` RESULT OK (17 checks, five children in 57 s sequential). Disabling the factory was already caught by PART 1 (the fixed probes). `docs/AREAS.md` 8.9, 9 and the test table updated to five variants.
