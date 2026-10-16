# Vasilievsky Island: the frame (2026-10-07)

User request: "author Vasilievsky Island now, realistic and accurate, sights authored with distinct agents". This note is the frame step: the WHOLE island is inside the play area and its OSM data is
baked. Nothing of the island is authored yet: the generic `environment` / `streets` / `city` draw it, the sights and the island's own district grammar are later tasks.

Files: `tools/osm-lib.mjs` (rectangles V3..V12), `tools/fetch-osm-map.py`, `tools/bake-osm.mjs`, `src/world/data/city*.js` (10 new part files `city-v3.js` .. `city-v12.js`, the facade, every older part file
has a new header line), `tools/vo-frame-check.mjs`, `tools/vo-inventory.mjs`, `docs/reference/vo-island-polygon.json`, `docs/reference/vo-osm-inventory.json`. The baked scene assets (`assets/baked`) are stale until the lead bakes.

## The rectangles

Appended LAST in `RECTS` (after P9), in west-ward order, so that no older record id or region assignment changes. Island polygon = OSM relation 1576083 (14.084 km2, includes the Gulf coast in the west;
`docs/reference/vo-island-polygon.json`, 684 points; 25 m simplification in `src/world/lib/vo-island.js`). Areas by 3 m sampling.

| rect | box (local m, +x east, +z south) | area km2 | polygon inside km2 (share) | new ground km2 |
|---|---|---|---|---|
| V3 | x -3150..-2450, z -1900..-150 | 1.23 | 0.40 (33 %) | 0.06 (the rest is held by V1 / V2 / S4 / P2 / W2) |
| V4 | x -3850..-3150, z -2250..-150 | 1.47 | 0.81 (55 %) | 0.59 |
| V5 | x -4550..-3850, z -2250..900 | 2.21 | 1.32 (60 %) | 1.27 |
| V6 | x -5250..-4550, z -2250..1650 | 2.73 | 2.08 (76 %) | 2.08 |
| V7 | x -5950..-5250, z -1900..1600 | 2.45 | 2.05 (84 %) | 2.05 |
| V8 | x -6650..-5950, z -1900..1250 | 2.21 | 1.70 (77 %) | 1.70 |
| V9 | x -7350..-6650, z -2250..900 | 2.21 | 1.45 (66 %) | 1.45 |
| V10 | x -8050..-7350, z -2250..900 | 2.21 | 1.60 (72 %) | 1.60 |
| V11 | x -8750..-8050, z -2600..900 | 2.45 | 1.72 (70 %) | 1.72 |
| V12 | x -9800..-8750, z -2600..550 | 3.31 | 0.95 (29 %) | 0.95 |

* **Polygon coverage 100.000 %** (target 99.5 %): no sample of the polygon and none of its 684 vertices lies outside the union of the 44 rectangles. The 34 older rectangles held 4.34 %. New ground: 13.47 km2.
  The play area (union of all PLAY rectangles) grows from 31.66 km2 to 52.03 km2 (+64 %); the V rectangles alone are 22.45 km2.
* **Change against the lead's cut: V6 z1 1600 -> 1650.** The southern cape of the polygon (-5168, 1556) had only 44 m of water inside the play area. Now the water margin between every shore point and the boundary of the union is
  >= 69 m (5 %: 155 m, median 400 m).
* Check (a): all 136 named streets of the island (935 ways, 148 km) lie inside the union, except the **ZSD** (Western High-Speed Diameter, `highway=motorway`, 443 m of its 6 975 m): its viaducts leave the
  island over the Gulf at x -7800, z 900..1130 in the south (two bridge ways w119176958, w373871040) and on at z -2900..-2540 in the north (w130062824, w721628543, w721628544); they end at the edge of the data like every
  main road that leaves the map.
  (b) The Blagoveshchensky (Lieutenant Schmidt) Bridge x -3528..-3363, z -436..-95 is inside V4 + S3 with its water, bank to bank; (c) Tuchkov and Birzhevoy bridges are inside P2 / V1 / V2: no named bridge touching the
  island leaves the union except the two ZSD viaducts. (d) Waste: V12 is 3.31 km2 with 0.95 km2 of polygon (the island's western wedge is diagonal, the rest is Gulf water), V3 is 89 % older rectangles; every other rectangle
  holds 55-84 % island. A staircase of three narrower rectangles for the wedge would save ~1.5 km2 of empty water, but every cost that scales with the area (ground raster, see below) scales with the BOUNDING BOX, so it was left.
* Rerun: `node tools/vo-frame-check.mjs` (coverage, table, margins, streets, bridges; exit 1 below 99.5 %).

## Data: fetch, bake

* `python tools/fetch-osm-map.py V3 V4 V5 V6 V7 V8 V9 V10 V11 V12` (Overpass is down): **92 tiles** of the OSM map API (one cached .osm each in `data/osm-raw/map-api`, git-ignored; the whole cache is 351 MB), 26 multipolygon relations completed through
  `/relation/<id>/full`. **No tile was refused** (HTTP 400 "too many nodes": 0 tiles split, 0 failed; the biggest tile was 3.7 MB); one HTTP 509 (bandwidth) was waited out and retried. The tool now splits a refused tile
  recursively into quarters (`.split` marker files remember the refusal, up to 6 levels), writes the raw layers atomically and is resumable. Run time ~11 min.
* **New rule in the fetch tool**: an element that is new to the raw layers and lies wholly inside the extents of the regions listed BEFORE the first region asked for is not added. Without it the tiles of V3 / V4
  (which overlap the dense centre, S3, S4, W2c, W2d, P2 ...) added 34 restaurants / banks / bars (`amenity=*` nodes: the map-API classification is broader than the first Overpass queries) to the street furniture
  of W2b / W2c / W2d, i.e. changed a reviewed district. 38 elements were not added (34 amenity nodes, 1 road, 1 green, 1 parking, 1 poi; none on the island).
* **New rule in the bake: REGION LOCK** (`tools/bake-osm.mjs`, `--lock <dir>`, default the part files of `src/world/data`): a record that exists in the previous bake keeps its part file (pieces of a cut way / ring are
  matched by shared vertices). Without it 57 roads, 9 buildings and other records of S3 / S4 (long records that stopped being clipped get another first vertex) moved to V3..V5, left a gap in the old part files and
  shifted the order of every later `ROADS` record; `streets` output depends on that order (lamp / pole competition along the kerbs): 15 cells of the reviewed zone, 2 km from the new data, redrew lamps, wires and colliders.
  With the lock only 6 cells at the edge of S3 / S4 differ (below). Idempotent: a re-bake against the new files gives the same files.
* Bake: `node tools/bake-osm.mjs --out <scratch> --lock <old data>` ~70 s; the result was copied into `src/world/data`. Records per new part file (buildings / ways / water / green / bridges / POIs / trees):
  V3 12 / 29 / 1 / 5 / 0 / 3 / 50, V4 526 / 851 / 3 / 259 / 0 / 376 / 801, V5 932 / 1809 / 2 / 441 / 22 / 837 / 619, V6 943 / 2063 / 2 / 332 / 9 / 629 / 119, V7 550 / 1247 / 0 / 303 / 2 / 399 / 30,
  V8 535 / 1747 / 0 / 392 / 13 / 643 / 45, V9 517 / 1645 / 2 / 308 / 5 / 279 / 64, V10 311 / 1699 / 3 / 251 / 37 / 138 / 90, V11 141 / 573 / 4 / 83 / 10 / 74 / 934, V12 44 / 155 / 1 / 40 / 0 / 37 / 48.
  Whole bake: 18 495 buildings (13 986 outlines + 4 509 parts), 49 093 road ways, 674 bridges, 7 795 trees; data files 33.4 -> 43.2 MB (city-v3 28 KB ... city-v6 1.8 MB).
  File sizes: v3 28, v4 970, v5 1 759, v6 1 791, v7 1 111, v8 1 370, v9 1 165, v10 958, v11 426, v12 130 KB.
* `WATER` has only 0-4 records per region and nothing for the Gulf: **`natural=coastline` (11 ways, the island polygon is built from them) and `natural=bay` are in no raw layer and not baked.** The Neva / Malaya Neva
  banks come from the old water polygons; the Gulf water west of x -7400 and south of the island is not in the data at all (the environment island mask / far water must come from `vo-island-polygon.json`).

## Old regions: proof that nothing moved

Same code on both sides (HEAD code in a scratch tree: old data vs new data), so only the data differs. Tools: `tools/city-signature.mjs`, `tools/streets-signature.mjs`, a record-level diff of the baked part files.

* **Baked records** of the 23 frozen part files (OLD .. S5) against HEAD: 187 changes, every one explained: 128 records modified in place, 1 piece replaced, 1 piece removed (a kerb ring w794507299 that the old
  boundary had cut in two is one whole ring now), 5 fences and 52 id-less records added to the OLD file (51 tree rows: `TREE_ROWS` records have no region and always go to part 1; 1 overlap pair; the 5 closed
  fences w864833791, w10707043, w525189308, w161191054, w525189302 on the Malaya Neva north bank, x -4137..-7113, z -2140..-2430, straddle the edge of the union with a first vertex outside every extent, which the
  bake files under OLD: they are only new records, no old one moved). **Every one of the 129 modified / replaced old records was cut by the old union boundary** (an old vertex ON it, `distToBoundary` < 0.6 m;
  per region S3 91, S4 29, S2 4, W2d 2, S5 1, W2c 1 and 3 long metro / water records of OLD): roads, houses, landuse, subway lines and the Neva polygons became whole.
  No record of E1, N2, N3, W1, N1, M1..M7, S1 changed (the lock keeps the long records that begin there).
* **city-signature** (`--ref HEAD`, old data vs new data): 20 of the 23 frozen regions: 0 records changed / added / removed. S2 2 changed, S3 18 changed + 1 added piece, S4 2 changed = 22 houses, and
  **none of them has a single vertex inside a PLAY rectangle of the old regions**: they stand in the 120 m scenery margin of S2 / S3 / S4 (S3 west and south edge x -4070 / z 1120, S2 south edge z 1520, S4 north-west:
  among them the Russian Academy of Arts r165182 at (-3431, -597)), where they were cut by the old boundary and are whole now, or cut along more rectangle edges (`clipRingUnion` cuts a ring that crosses the
  outer boundary along the grid of ALL rectangle edges). Geometry: 1 399 (stream, cell) meshes of old-only cells compared, 18 differ (three 320 m cells at the south margin of S2 / S3, x -3840..-2880,
  z 960..1600). The tool therefore ends "OLD REGIONS CHANGED" for exactly these 22 houses and nothing else.
* **streets-signature** (HEAD streets code, old data vs new data): zone old 83 cells, 77 identical, 6 differ: x -4480..-3200, z -640..1280, the margin of S3 / S4 where the data extends (the 120 m strip that was
  scenery / road stubs belongs to the open zone now: asphalt, kerbs, lamps, colliders move from zone old to zone new). Item level inside the 23 reviewed PLAY rectangles: lamps 3 963 = 3 963, street plates 3 426 = 3 426,
  bus stops 142 = 142, all identical; 14 wire masts differ (8 before, 6 after), all along the approach of the Blagoveshchensky Bridge (x -3450..-3376, z -247..-137): the trolley wires now continue over the
  bridge to the island. Zone new: triangles 0.83 M -> 1.73 M.
* **Something that was found and fixed on the way**: `city/heights.js neighbourStoreys` returned a fractional storey count (`building:levels=3.5` of w108219870 on the 12th line, V5) and `RENT[3.5]` is undefined: NaN floors,
  NaN vertices and a NaN bounding box of the city stream (house w217543936, 12-я линия В.О. 37; `check.mjs` warned "1 object(s) with NaN/Infinity positions"). Now `Math.round`; identical for integers.
* The district default: `city/district.js` gave `'vasil'` only north of the line z = -560 (right for the Spit); west of x -3300 the island runs down to z +1550 and the other half would have been the Nevsky mix. Now every
  house inside `lib/vo-island.js inIsland` is `'vasil'` (1 550 records of V4..V12 changed their district; V1, V2 and every older region: none). The grammar of the district (zones, mixes, palettes) is unchanged: the real
  island grammar is a later task. `layout.js AREAS`: a second "Васильевский остров" entry (x < -3400, `inIsland`) so that the HUD names the whole island.

## What was run

`node tools/layout-test.mjs` RESULT OK; `node tools/check.mjs environment streets city props traffic people wildlife` (HEAD code + the new data + my files, `NODE_OPTIONS=--max-old-space-size=14000`) RESULT OK in 4 m 48 s;
old data: 3 m 24 s. Same warnings both ways (budgets, canvas pixels), no NaN warning. Triangles / build ms, old -> new: environment 2.01 -> 2.28 M / 15.3 -> 21.6 s, streets 3.61 -> 4.88 M / 29.0 -> 41.8 s (canvas textures
44.2 -> 51.1 M px), city 4.77 -> 6.20 M / 31.0 -> 52.4 s, props 0.76 -> 0.94 M, traffic 6.2 -> 6.4 k, wildlife 92 -> 94 k; colliders environment 47 k -> 72 k, streets 19 k -> 26 k, city 133 k -> 172 k.
The default Node heap overflowed in `check.mjs` with all seven modules on the new data (the old data was not tried with the default heap). No browser run, no screenshots (not asked at this step).

## Surprises and things the others must know

* **highway=construction / proposed roads are dropped by the bake** (`bake-osm.mjs`, `['proposed','construction','razed',...]`; not changed): on the island 31 ways = 4 496 m `construction` and 17 ways = 3 260 m `proposed`:
  unnamed `construction` `secondary` ramps 2 111 m (7 ways, x -8150..-7480, z 70..250: the rebuilt Shkiperskiy protok interchange with the ZSD), «Шкиперский проток» 1 620 m construction + 1 231 m proposed (24 ways, x -7760..-6520),
  «улица Вадима Шефнера» 1 724 m proposed (x -7999, z -478), footways 301 m (the Spit, x -2661, z -1212), **«Биржевой проезд» 111 m construction (w241229734, x -2686, z -1231: the Spit, V1)**, «6-7-я линии В.О.» 80 m (x -4418, z -1801),
  «Кадетский переулок» 68 m (x -3960, z -384), «улица Гончарова» 60 m proposed, «Опочинина улица» 32 m, 9 short unnamed pieces 418 m. The Spit's Birzhevoy proezd and the 6-7th line stubs are therefore missing roads in the scene.
* **The ground field raster is a 1 m grid over the bounding box of the whole extent** (`environment/field.js`: EXTENT + 40 m): now 13 220 x 6 330 = 83.7 M cells (was 8 370 x 6 330 = 53.0 M, +58 %): two RGBA8 textures
  (class mask, distance) of 335 MB each (were 212 MB), a 4 byte distance transform while it builds, a dozen 1 byte masks, and the width of 13 220 texels must fit the GPU limit of 16 384 (8 192-texel GPUs failed before as
  well). The bake file of the field grows in the same proportion. Do not extend east / west without tiling it. Not measured in a browser.
* `environment/ground.js` shader rectangle array: 44 of 48 slots used (8 + 21 P / V + 15 other); four more rectangles overflow it (`.slice(0, 48)` would silently drop the last ones).
* The people / traffic / props zone lists (`people/petroarea.js` X0..Z1, `traffic/region.js RECTS`, `props/petro.js RECTS`, `people/zones.js`) are hand-written boxes of P1..P9 / V1 / V2: V3..V12 are outside them, i.e. the
  island west of the Spit has the generic traffic, props and people only (no crash, no Petrograd-side rules such as quay stands, taxi ranks, parking keep-outs at road ends). `streets/region.js` needs no edit
  (`FIRST_OPEN = 'P1'`: V3..V12 are open districts); `environment` (`ground.js`, `waterways.js`, `field.js`, `far.js`) takes every region matching `/^(P|V)\d+$/`.
* Buildings: 5 145 of 18 495 records have no levels and no height (kind default). The island's named objects are in `docs/reference/vo-osm-inventory.json` (4 104 records: 43 museums, 26 places of worship,
  268 monuments / memorials, 20 historic, 18 attractions, 29 bridge entries, 20 stations, 146 education, 217 health, 1 779 shops and food places, 142 stops, 259 rail ways, 27 routes that serve a stop, 129 streets;
  sorted by importance: tourism / historic / worship / museum first; regenerate with `node tools/vo-inventory.mjs`).
* The OSM way count of the polygon edge is not a shore line everywhere: bridge ends (Tuchkov Bridge) lie up to 45 m beyond it, hence the 60 m tolerance for lines in the inventory.
