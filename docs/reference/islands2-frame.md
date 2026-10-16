# Islands round 2: the frame (2026-10-13)

Brief: `docs/ISLANDS2-BRIEF.md`. Task of the foundation owner: every island of the round playable bank to bank with real OSM data: **Yelagin** (rest), **Kamenny**, **Aptekarsky**,
**Petrovsky** (whole island, the Zhdanovka corridor), **Serny** and the islets of the Krestovsky shore, each with >= 100 m of the water round it (>= 69 m beyond every shore point at the very least)
and the bridges between the islands walkable from bank to bank. Nothing is authored here: this is the frame, the baked OSM data and the water context. The baked scene assets (`assets/baked`) are stale until the lead bakes.

Files (mine): `tools/osm-lib.mjs` (19 rectangles appended after K4), `tools/fetch-osm.mjs` (guard, `--tilemul`, `--coalesce`), `src/world/data/city*.js` (19 new part files + the facade, every part file has a new header line),
`tools/water-rings.mjs`, `tools/bake-islands2-context.mjs` -> `src/world/environment/islands2-context.js`, `tools/bake-krestovsky-context.mjs` -> `krestovsky-context.js` (regenerated, islets no longer flooded),
`src/world/environment/waterways.js` (rings, PETRO_NAMES, natural-bank rule, two scenery tails removed), `tools/coverage-map.mjs`, `tools/coverage-check.mjs`, `tools/islands-data-test.mjs`,
`tools/islands2-frame-check.mjs` (this table), `tools/islands2-data-diff.mjs` (record-level proof), `tools/islands2-inventory-check.mjs`, `tools/islands2-plot.mjs` / `-needs.mjs` / `-strips.mjs` (design scratch),
`docs/reference/islands2-water-osm.json` (Overpass `rel(...);out geom;` of the 16 water relations round the islands), `docs/reference/islands2-bridges-osm.json` (the 329 bridge elements with geometry of 2026-10-13).

## The rectangles

Appended LAST in `RECTS` (after K4), so that no older record id or region assignment changes. Design: the ground that must be inside PLAY = every island polygon + 100 m (grid 10 m) + every bridge way
(bridge=*, any highway) that touches an island + 40 m; minus the existing union; covered by staircases (dynamic programming over vertical strips, 50 m snap, penalty 0.035 km2 per rectangle, <= ~1.2 km wide,
<= 1.35 km high), then hand-tuned: every junction with an older rectangle overlaps by >= 20 m (a 10 m notch between K2 / K3 and PE was found by the sliver check and closed).
Island outlines: `docs/reference/islands2-island-polys.json`. Check: `node tools/islands2-frame-check.mjs` (coverage by 8 m sampling, shore margins by 10 m sampling, slivers, areas).

| rect | box (local m, +x east, +z south) | what it holds | rect km2 | new ground km2 | buildings / ways / water / green+landuse / bridges / POIs / trees |
|---|---|---|---|---|---|
| YE1 | x -5050..-4650, z -5660..-5250 | the north-east end of Yelagin and the Srednyaya Nevka beyond it (the rest of Yelagin is K1 / K2 / K3) | 0.164 | 0.104 | 20 / 57 / 1 / 13 / 2 / 5 / 0 |
| KA1 | x -4650..-3450, z -5600..-4430 | Kamenny: west end, the Yelagin-Kamenny strait (1st Yelagin bridge is K1), the Kamenka mouth | 1.404 | 0.625 | 75 / 281 / 1 / 23 / 29 / 8 / 0 |
| KA2 | x -3450..-3150, z -5610..-4570 | Kamenny: centre, Kamennoostrovsky bridges 2..7 / 19 / 20 over the island's canals | 0.312 | 0.312 | 47 / 165 / 1 / 19 / 7 / 7 / 0 |
| KA3 | x -3150..-2900, z -5610..-4780 | Kamenny: east, Kamennoostrovsky Pr. | 0.207 | 0.207 | 19 / 137 / 0 / 13 / 10 / 7 / 0 |
| KA4 | x -2900..-2650, z -5740..-4940 | Kamenny: the strait to Aptekarsky with the Kamennoostrovsky bridge (x -2836..-2743, z -5099..-4950), the Ushakovsky bridge bank to bank (x -2877..-2846, z -5696..-5482) | 0.200 | 0.200 | 18 / 151 / 2 / 19 / 10 / 11 / 2 |
| KA5 | x -2650..-2400, z -5520..-5090 | the Kamenny tip (x -2525) and the mouth of the Malaya Nevka in the Bolshaya Nevka | 0.107 | 0.107 | 8 / 54 / 1 / 8 / 1 / 2 / 0 |
| AP1 | x -3700..-3350, z -4610..-4260 | Aptekarsky: west tip beside the Bolshoy Krestovsky bridge heads (P6 / P8 hold the Karpovka) | 0.122 | 0.073 | 2 / 6 / 0 / 3 / 0 / 1 / 0 |
| AP2 | x -3350..-3100, z -4810..-4260 | Aptekarsky: north-west shore, the Kamenny / Aptekarsky strait | 0.138 | 0.088 | 7 / 13 / 0 / 2 / 0 / 0 / 0 |
| AP3 | x -3100..-2750, z -5000..-4260 | Aptekarsky: Kamennoostrovsky Pr. north of the Karpovka, Pesochnaya embankment | 0.259 | 0.206 | 31 / 88 / 0 / 22 / 0 / 13 / 0 |
| AP4 | x -2750..-1600, z -5250..-4080 | Aptekarsky: the Botanical Garden, LETI, the north shore on the Bolshaya Nevka (the largest rectangle: the shore is an arc) | 1.345 | 1.085 | 276 / 712 / 1 / 188 / 11 / 234 / 98 |
| AP5 | x -1600..-1450, z -5290..-4080 | the Kantemirovsky bridge (x -1759..-1533, z -5255..-5018) and the north-east shore | 0.181 | 0.181 | 39 / 119 / 2 / 43 / 0 / 31 / 42 |
| AP6 | x -1450..-1150, z -4940..-4080 | the east shore of Aptekarsky | 0.258 | 0.258 | 32 / 146 / 0 / 25 / 0 / 27 / 14 |
| AP7 | x -1150..-950, z -4490..-4080 | the east tip beside the Aptekarsky Bridge (P7) | 0.082 | 0.082 | 18 / 26 / 0 / 4 / 1 / 3 / 0 |
| PE1 | x -6600..-6250, z -3830..-3290 | Petrovsky: the north-west end (the pier / basin loop at x -6500), Makarova embankment | 0.189 | 0.178 | 8 / 20 / 0 / 7 / 0 / 3 / 0 |
| PE2 | x -6250..-5900, z -3830..-3100 | Petrovsky: the yacht-club shore, the Krestovsky / Petrovsky strait south bank | 0.256 | 0.217 | 17 / 101 / 0 / 32 / 0 / 5 / 0 |
| PE3 | x -5900..-5550, z -3560..-2950 | Petrovsky: park, the Bolshoy Petrovsky bridge landing (K2 holds the bridge) | 0.213 | 0.200 | 32 / 109 / 0 / 7 / 0 / 8 / 0 |
| PE4 | x -5550..-5200, z -3560..-2620 | Petrovsky: the long middle, Serny Island's north shore | 0.329 | 0.315 | 60 / 163 / 1 / 15 / 2 / 38 / 38 |
| PE5 | x -5200..-4900, z -3560..-2430 | Petrovsky + Serny Island with the Serny Bridge (-4930, -2551), the Betancourt bridge viaduct | 0.339 | 0.301 | 29 / 62 / 0 / 9 / 9 / 13 / 0 |
| PE6 | x -4900..-3950, z -3030..-2250 | Petrovsky: the stadium arm, the Betancourt bridge (x -4742..-4520, z -3082..-2320), the Malaya Neva side of the Zhdanovka; the Zhdanovka and its Petrogradsky bank are P6 / P9 / P2 / V4 | 0.741 | 0.532 | 10 / 27 / 0 / 4 / 1 / 1 / 0 |

(`water` = WATER + RIVER records; counts are the arrays of the part files; the records of the 120 m scenery margin belong to the first rectangle that holds them.)

**Play area 81.6360 km2 -> 86.9100 km2 (+5.2740 km2, +6.5 %)**, 57 -> 76 regions (19 new rectangles, 12.2 km2 summed, 5.27 km2 of new ground; the rest overlaps K1 / K2 / P6 / P8 / P9 / V5 / V6).
The efficiency of the cut: the missing ground to be covered was 4.6 km2 (islands + 100 m) plus 0.3 km2 of bridge heads; waste 0.4 km2 (staircase steps).

## Coverage of the island polygons (before = up to K4 / after = with the 19 rectangles)

| island | bbox x0..x1, z0..z1 | polygon inside PLAY, % | polygon + 100 m inside PLAY, % | min. distance shore point -> boundary of PLAY, m |
|---|---|---|---|---|
| Yelagin (rel 1576343) | -6424..-4331, -5564..-4776 | 86.9 / 100 | 85.7 / 100 | -246 / 90 |
| Kamenny (rel 1576182) | -4413..-2525, -5518..-4517 | 31.4 / 100 | 30.3 / 100 | -1121 / 92 |
| Aptekarsky (rel 1576187) | -3849..-1016, -5157..-3897 | 23.2 / 100 | 31 / 100 | -897 / 93 |
| Petrovsky (rel 1576109) | -6502..-3524, -3754..-2025 | 30.5 / 100 | 37 / 100 | -496 / 95 |
| Serny (way 22793388) | -5021..-4741, -2730..-2477 | 0 / 100 | 0 / 100 | -375 / 98 |
| islet w22870264 | -5494..-5324, -3689..-3617 | 100 / 100 | 99.9 / 100 | 97 / 697 |
| islet w22870327 | -5307..-5258, -3656..-3615 | 100 / 100 | 99.3 / 100 | 95 / 711 |
| Bychy (rel 3298204) | -7314..-6355, -5062..-4869 | 100 / 100 | 100 / 100 | 412 / 412 |
| Krestovsky (rel 1576176, not an aim) | -7892..-3821, -5172..-3672 | 100 / 100 | 99.7 / 100 | 26 / 161 (the PE rectangles gave its south shore the water it lacked) |

Negative = the shore point was outside. `node tools/islands-data-test.mjs` repeats it on the BAKED data with 5 m shore samples: Yelagin 1256 shore / 745 dry interior samples (min. margin 90 m), Kamenny 1291 / 844 (92),
Aptekarsky 1876 / 1647 (93), Petrovsky 2365 / 880 (95), Serny 236 / 382 (98), Bychy, both islets: no shore point outside PLAY, no dry interior sample in river or Gulf water.

## Bridges (bank to bank)

All named bridge ways that touch the islands (from an Overpass query of 2026-10-13: `way[bridge]` + `man_made=bridge` in x -7000..-900, z -5700..-2000, 329 elements) lie inside PLAY with 40 m round them:
1st / 2nd / 3rd Yelagin (K1 / K2), the Kamennoostrovsky chain 2..20 over the Kamenny canals (KA1..KA3), the Kamennoostrovsky bridge Kamenny-Aptekarsky (KA4) and the Ushakovsky bridge (KA4, north bank z -5696),
the Karpovka bridges Barochny, Silin, Karpovsky, Gesslerovsky, Petropavlovsky, Aptekarsky (P4 / P7 / P8, unchanged; their Aptekarsky banks are inside AP regions), the Kantemirovsky (AP5), Molodyozhny and the Bolshoy Krestovsky
bridge heads (P6 / AP1), the Petrovsky-Krestovsky bridges (Bolshoy Petrovsky K2, Maly Petrovsky P6), the Zhdanovka bridges (4th Zhdanovsky P6, Zhdanovsky, Krasnogo Kursanta P2), Serny and Betancourt bridges (PE5 / PE6),
the Makarova embankment viaduct along the Petrovsky south shore (PE1..PE5). `docs/reference/islands2-osm-inventory.json` x baked data: `node tools/islands2-inventory-check.mjs` (below).

## Data: fetch, bake, proofs

* **Fetch** (Overpass today: only `overpass-api.de` answers; the two mirrors time out; 504 / 429 are frequent): `tools/fetch-osm.mjs --regions=YE1,...,PE6 --tilemul=2.2 --coalesce=1.3 <layer>`. New options of the tool:
  `--tilemul` (multiplies the tile edges of LAYERS, tuned for the dense centre), `--coalesce[=1.5]` (merges the pieces of the todo list of a staircase into a few boxes: ~400 queries -> ~60), and the **earlier-region guard**
  (the rule of `fetch-osm-map.py`: an element that is NEW to a layer and lies wholly inside the EXTENT rectangles of the regions listed before the first requested region is not added; the count is logged).
  Layer by layer, failed layers retried with smaller tiles (2.2 -> 1.5 -> 1.0 -> 0.7 -> 0.5): water (3 boxes), bridges (2), buildings (12 tiles at mul 1.5; mul 2.2 timed out), roads, green, trees, street, barriers, manmade,
  historic, pois, parking, transit, rail, routes, subwayroutes. Wall time 08:36 .. 13:51 UTC = 5 h 15 min (almost all of it 504 / timeout retries; the pure query time is ~40 min). Raw files stay git-ignored (`data/osm-raw`).
  Elements added to the raw layers (all new islands + the margin): water +27, bridges +230, buildings +1 442, roads +5 055, green +1 139, trees +211, street +3 110, barriers +1 591, manmade +546, historic +55, pois +2 024, parking +432, transit +155, rail +22 (the K / V rounds took the map API: Overpass finds newer data).
* **Routes were fetched but are NOT baked**: `routes` (trolleybus / tram / bus route relations: `out body`, no geometry, so the guard cannot tell where they are) added 8 trolleybus, 10 tram and 54 bus routes to the global
  tables TROLLEY / TRAM_ROUTES / BUS_ROUTES, i.e. wires and route labels in the reviewed districts. The previous rounds (V, K) had not fetched them either. `data/osm-raw/routes.json` and `subwayroutes.json` are back to the
  state of 2026-10-06; the fetched versions are in the session scratchpad. The bus stops of the islands therefore carry no route refs.
* **Bake**: `node tools/bake-osm.mjs --out <scratch>` ~1 min 54 s (2 min 31 s with routes), then copied to `src/world/data`. Region lock: 268 770 records of the previous bake found again, 277 180 kept their part file, 802 of them
  would have moved by the geometric rule. Whole bake: 28 409 buildings + parts (22 625 outlines + 5 784 parts), 77 775 road ways, 1 127 bridges, 12 402 trees, 27 417+ POIs; new part files 0.4 MB (ap4 645 KB the largest).
* **Old regions**: `tools/islands2-data-diff.mjs` (record level, old bake vs new bake): of 570 changed records in 22 part files, 565 have a vertex on the boundary of the OLD EXTENT union (they were cut there and are whole now;
  `clipRingUnion` also cuts a ring that crosses the outer boundary along more rectangle edges now). The other 5: four id-less OLD `RIVER` records (the Bolshaya Neva ring is clipped into 23 instead of 13 pieces along the
  new grid lines, the Bolshaya Nevka 0 -> 7: all of it water seams that waterways.js drops) and one post box that now knows its building. 0 records of OLD, W1, N1, W2a..e, E1, N2, N3, M1..M7, S1..S5 changed
  (their part files differ in the header line only, "part n/76").
  `tools/city-signature.mjs` (old data vs new data, same code, `--new` = the 19 rectangles): **the 23 frozen regions OLD..S5: 0 records changed**; changed houses (all cut by the old boundary, now whole): P2 1, P6 2, P7 3, P8 32,
  P9 14, V5 1, V6 15, V7 2, C1 4, C2 1, C3 1, K1 10, K2 22, K3 1; geometry: 1207 (stream, cell) meshes of cells that no new house touches, 0 differ; triangles 9.31 M -> 9.53 M (+211 657, the new houses).
  `tools/streets-signature.mjs`: zone old 76 cells (was 75), 75 identical, 1 differs: cell x -3200..-2560, z -6400..-5760 (north of Kamenny, 120 m scenery margin of KA3 / KA4): `pt-skirt` 0 -> 2 triangles
  (a `pt-skirt` mesh of the streets module in a cell that holds only the north margin of KA3 / KA4); zone new 217 cells, +183 315 triangles (expected).
* **Inventory vs data** (`node tools/islands2-inventory-check.mjs`): of the 5 263 named / tourist objects of `islands2-osm-inventory.json`, 325 lie in PLAY and have their own id in no baked array. 199 carry no tags
  (the inventory shows the tags of the parent): they are tagless member ways of building / multipolygon relations that ARE baked under the relation id (checked for the six Karpovka-embankment "buildings" w30506358,
  w30506361, w499636219, w865150501, w979869527, w979869529: relations r21304728 .. r21304745 are in the raw layer). The rest: 17 `tourism=information` boards, 16 parking entrances, 9 piers, 8 shelters, 3 viewpoints,
  6 `highway=construction`, 3 movable bridge parts, a few relation parts: none a statue or a sight (every `historic` / `tourism=artwork` / `memorial` object of the islands is baked: Yelagin lions, the antique statues,
  the Latona fountain, Hercules, the Kirov memorial ... are in `MONUMENTS` / `HISTORIC` of K1 / K2 / KA* / AP* / PE*).
* **Guard** (new elements wholly inside the extents of earlier regions, not added): buildings 2, green 2, street 1, manmade 3, pois 1, every other layer 0 (the old regions were fetched with the same Overpass queries; the routes layer pruned 143 route elements); counts are in `data/fetch4.log`; a re-fetch of P7 / P8 with the rule of the earlier regions off found nothing
  new in the buildings layer (30 204 elements before and after), so the Karpovka north bank is complete.

## Water

The bake cannot close the big river polygons (their members leave the fetched area; a bbox `out geom` drops the member geometry outside the box). Mirror of `krestovsky-context.js`:

* `docs/reference/islands2-water-osm.json` = Overpass `rel(...);out geom;` of 16 relations (complete geometry). `tools/bake-islands2-context.mjs` -> `src/world/environment/islands2-context.js`:
  `ISLANDS2_WATER` = the complete rings of the Bolshaya Nevka (r1312674, r1576181), the water north of Kamenny (r1576183, named Bolshaya Nevka in OSM), the Srednyaya Nevka north-east of Yelagin (r1576344) and west (r1576173),
  the Krestovka (r943897), the Gulf-side water north of Krestovsky / Bychy (r1114251), plus the Malaya Neva (r72500, the existing ring of petro-water.js + the OSM tail of vo-water.js) with **Serny cut out**;
  `ISLANDS2_COAST` = the exact outlines of the five islands (for the natural-bank rule). Before: the water north of Yelagin / Kamenny and the Krestovka were not water at all (`inRiver` false in 1 372 + 923 + 79 in-play samples).
* **Holes**: waterways.js collects outer rings only. A polygon with an island in it flooded the island (found: the two islets of the Krestovsky shore inside the Malaya Nevka ring: `inRiver` was true at their centres;
  Serny inside the Malaya Neva ring). `tools/water-rings.mjs` cuts such a ring into simple rings along two slits per hole (slits >= 3 m away from every other vertex; the pieces share the slits, which the generator reads as open joins)
  and removes back-tracking spikes / thin wedges at mouth lines. `bake-krestovsky-context.mjs` uses it too (the Malaya Nevka became 3 rings, ids `r1266760.0..2`, field `rel`); waterways.js compares `(w.rel || w.id)`.
* waterways.js: the 4-vertex scenery closure of petro-water.js r1312674 is replaced by the complete ring; `PETRO_NAMES` includes `YE|KA|AP|PE` (petroAt: bank / pavement rules of the open districts, not "old"); the natural-bank rule of
  Krestovsky (`krest`) takes the five island outlines too, with two new `NAT_BOXES` ([-5300,-900,-5800,-4245] north of the Karpovka banks, [-6700,-3900,-3500,-2200] Petrovsky / Serny); the scenery tails `kovsh-tail` and
  `zhdanovka-notch` are gone (they lay on Petrovsky: 4 flooded dry samples; the data holds the whole arm now).
* `node tools/environment-banks.mjs --petro`: shore coverage 293 points without a bank piece (baseline of HEAD 299: all of them `gulf0`, the Gulf ring of the Krestovsky round, none new); zone walk 666 walks, 64 open edges
  (HEAD baseline 440 / 23): **~40 more OPEN EDGE IN A BRIDGE ZONE** in the bridge zones of the new bridges (Yelagin 1 / 3, Kamennoostrovsky, Mali Krestovsky, Serny, Betancourt, Bychy ...): the bank there is the bridge owner's
  (decks / abutments), see "still needed".

## Checks run (2026-10-13)

* `NODE_OPTIONS=--max-old-space-size=14000 node tools/check.mjs environment streets city`: RESULT: OK (6 min 49 s; the three triangle-budget warnings are the old ones).
* `node tools/layout-test.mjs`: RESULT: OK (3.9 s; play bbox x -9800..3100, z -5740..9300, 65 modules in the owns-table).
* `node tools/islands-data-test.mjs`: RESULT: OK (Krestovsky + the eight islands of round 2, see above).
* `tools/roads-furniture-audit.mjs --strict --allow GUARD_STONE,PROP,BIN,TREE,FACADE_COLLIDER --near x,z,350` and `tools/roads-surface-audit.mjs --max-fail 2170 --near x,z,350` (there is no `--near` in roads.mjs itself) at
  (-2200,-4600) Aptekarsky, (-3300,-5200) Kamenny, (-5500,-3100) Petrovsky, (-4600,-2800) Serny / Betancourt, (-4700,-5300) Yelagin-Kamenny strait: furniture 0 failing on_road / median / lot slots at all five, RESULT OK;
  surface RESULT OK (0, 2, 0, 2, 4 residual samples). The full `npm run roads` / `markings` / `bake` are the lead's.
* `node tools/environment-banks.mjs --petro`: see Water. `node tools/coverage-map.mjs` + `node tools/coverage-check.mjs`: RESULT OK (76 regions, 8 island outlines with buttons: Елагин, Каменный, Аптекарский, Петровский, Серный added).
* Bake idempotent: a second `bake-osm.mjs` against the new part files gives byte-identical files.
* Times: fetch 5 h 15 min wall, bake 1 min 54 s, check.mjs 6 min 49 s, city-signature 1 - 2.5 min, streets-signature 1 - 1.5 min, environment-banks 1 min, road audits ~5 min per spot.

## Still needed (files I do not own)

* `src/world/environment/ground.js` `_isP`, `field.js` line 389, `south-ponds.js` line 6: the regexes list P / V / K / C / MP / VP / MS; add `YE|KA|AP|PE` (ground data raster, road-side pavement rule, park ponds of the new rectangles; without it
  the new rectangles are treated as outskirts "O" bands and the ponds of the Botanical Garden / Kamenny are not in SOUTH_PONDS).
* Bridge owners: ~40 new OPEN EDGE IN A BRIDGE ZONE of `environment-banks.mjs` (abutments / decks for the 1st..3rd Yelagin, Kamennoostrovsky, Ushakovsky, Mali Krestovsky, Serny, Betancourt, Bychy bridges and the Bolshaya Nevka crossings).
* The ground / far-water layers (`vo-water.js` Gulf ring `gulf0`: 293 shore points without a bank piece, all older than this round).
* The lead: bake (assets/baked is stale), VIEWS / AREAS for the new islands (layout.js `areaAt`), bus-stop route refs (routes not baked), the nav bake of people (new regions).
