# DATA REPORT - OSM pipeline and baked map data (Saint Petersburg centre)

> **Report of the first, un-stripped extract.** The counts, gaps and tool names below describe the original centre build. In the Nevsky strip the data was clipped to the eight rectangles (`tools/strip-data-clip.mjs`, [`../STRIP.md`](../STRIP.md)); `tools/fetch-osm.mjs`, `plan.mjs`, `landmarks.mjs` and `overlay.mjs` (and the raw OSM cache) were removed, `bake-osm.mjs` / `osm-lib.mjs` are kept only for the clip functions.

Owner: the DATA agent. Files: `tools/osm-lib.mjs`, `tools/fetch-osm.mjs`, `tools/bake-osm.mjs`, `tools/plan.mjs`, `tools/landmarks.mjs`, `tools/overlay.mjs`,
`src/world/data/city.js` (baked, 3.3 MB, ONE ES module - no split needed), `docs/reference/{calibration.md,calibration.json,landmarks.json,plan-overlay.png,DATA-REPORT.md}`,
`docs/images/plan.{svg,png}`, `docs/research/osm-landmarks.md`. Map data (c) OpenStreetMap contributors, ODbL (downloaded 2026-10-02 from overpass-api.de; raw JSON in `data/osm-raw/`, git-ignored).
Rebuild: `node tools/fetch-osm.mjs` (all layers, retries / mirrors, ~5-15 min when the public servers are busy) -> `node tools/bake-osm.mjs` -> `node tools/plan.mjs` -> `node tools/landmarks.mjs`.

## 1. Frame, ORIGIN, PLAY, EXTENT (also in `tools/osm-lib.mjs` and in the header of `city.js`)

```
ORIGIN = { lon: 30.351279, lat: 59.932421 }          // the Yandex `ll`; local frame: metres, +X east, +Z south, north-up, no rotation
PLAY   = { x0: -595, x1: 835, z0: -405, z1: 860 }    // 1430 x 1265 m = 1.81 km2
EXTENT = { x0: -715, x1: 955, z0: -525, z1: 980 }    // PLAY + 120 m of scenery: 1670 x 1505 m = 2.51 km2
```

* Screenshot registration: **0.9344 m/px, origin pixel (636.0, 430.4)**, pure scale + translation, rms 1.0 px (0.9 m) on 8 hand-read crossings, max 1.4 px
  (`docs/reference/calibration.md`). The screenshot ground (x -594.3 ... 833.5, z -402.2 ... 490.2, 1.27 km2) lies completely in PLAY. The screenshot is NOT centred on ORIGIN
  (centre of the picture = world (119.6, 44.0)).
* PLAY is the screenshot ground extended 370 m to the south so that the Moscow Railway Station complex is whole: concourse parts z 245 ... 340, train hall z 340 ... 420, platform heads
  z 414 ... 484, then 380 ... 440 m of platforms + 5-12 tracks; the platforms are 520-640 m long and run on to z 936 ... 1055 (they are in the scenery ring up to z = 980).
  `PLAY.z1 = 1060` would hold the platforms completely (2.09 km2, still under the 2.3 km2 limit): change it in `tools/osm-lib.mjs`, re-run fetch + bake.
* Hotel Oktyabrskaya (centre (648, -1)), all of Vosstaniya Square (obelisk (592, 165)) and the metro vestibules are inside. Anichkov Palace (x ~ -642) and the Shuvalov Palace /
  Fountain House (z < -405) are in the scenery ring only.

## 2. What is baked (counts per export, `city.js` header documents every shape)

| export | count | notes |
|---|---|---|
| BUILDINGS | 1497 (outlines 1282, parts 215, 60 outlines hidden by their parts) | `h/hEst/hSrc/levels/minH/roof/roofH/colour/material/startDate/heritage/addr/tags{architect,ref:okn,...}/area/cx/cz/parent/skip/coverage/dupOf` |
| ROADS | 4347 | service 2726, footway 1185, primary 103, tertiary 68, residential 76, secondary 56, steps 111; `bus/trolley/tram` route refs on 132 / 96 / 0 ways; 877 `passage` (building arches), 68 tunnels, 8 bridges |
| AREAS / CROSSINGS / CROSSING_NODES / SIGNALS | 30 / 183 / 263 / 97 | squares: Vosstaniya, Vladimirskaya, Manezhnaya, Grecheskaya |
| BUS_STOPS | 109 (40 trolleybus, 70 with `routes`) | `routes: {bus, trolley, tram}` per stop |
| LAMPS / CALMING / DOORS / FURNITURE | 68 / 32 / 3226 / 871 | doors: 1574 yes, 1127 staircase, 325 shop, 98 main |
| WATER / STREAMS / RIVER / FOUNTAINS | 4 / 2 / 1 / 4 | Fontanka = `natural=water water=river` multipolygon r1201709 + centre lines w24255525 / w79570067; `RIVER[0]`: width 54 m, 946 m of centre line inside the extent |
| BRIDGES | 9 | Anichkov Bridge: deck r5537267 (man_made=bridge) + 2 carriageway ways (primary, 4 lanes, w 14 m, layer 1) + 6 footways (2.4 m, layer 1) |
| TUNNELS / STEPS | 68 / 111 | the metro station underpasses and stairs (layer -4 / -5), Vosstaniya / Mayakovskaya / Vladimirskaya / Dostoevskaya |
| RAILS / RAIL_NODES | 43 / 86 | main tracks (36), yard (5), construction sidings (2); `electrified` = contact_line; buffer stops, switches, signals |
| PLATFORMS | 16 | 6 railway platforms of the Moscow station (refs 1, 2;3, 4;5, 6;7, 8;9, 10;11, shelter=yes except 1), 5 metro platforms (underground, layer -4/-5), tram platforms |
| STATIONS | 17 | rail: Санкт-Петербург-Главный (n21596808); subway: Площадь Восстания, Маяковская, Владимирская, Достоевская (`depth`, `colour`, `lines`); 12 `railway=tram_stop` nodes |
| ENTRANCES | 12 | all four metro stations; every one has `bldg` = id of the containing building (e.g. Mayakovskaya -> r15081493 Nevsky Atrium; Vosstaniya -> w28962850 vestibule + r2404499/00/01 station wings) |
| SUBWAY / SUBWAY_ROUTES | 15 / 6 | lines 1 (red), 3 (green), 4 (orange) through the extent; routes carry the ordered stations of the WHOLE line with x, z (also far outside the extent) + simplified geometry (`segments`) for the later rides |
| TRAMWAYS / TRAM_ROUTES | 12 / 6 | trams 16, 43, 49 (Marata ul. / Kuznechny); the tram stops on Nevsky / Zhukovskogo are mapped but no tramway runs there |
| TROLLEY | 24 route records (lines 1, 3, 5, 7, 8, 10, 11, 12, 15, 16, 22, 42; both directions) | `lines`: flat polylines of the member ways clipped to the extent, `stops` |
| BUS_ROUTES | 35 | `{ref, name, from, to}`; refs per road in `ROADS[].bus` |
| GREEN / LANDUSE / PITCHES / PARKING | 447 / 112 / 64 / 75 | |
| TREES / TREE_ROWS | 285 trees / 14 rows | OSM trees are sparse: scatter procedurally on GREEN, along the streets that have `tree_row`, in the courtyards |
| WALLS / EMBANKMENTS / BARRIERS / BARRIER_NODES | 36 / 36 / 664 / 1081 | the quay walls of the Fontanka are `barrier=retaining_wall` (a few with `height`) |
| PIERS / PIPES / MANMADE / MONUMENTS / POIS | 4 / 2 / 278 / 123 / 3713 | monuments: 57 plaques, 8 statues, 8 busts, 4 stones / war memorials, 46 artworks (sculptures, murals, graffiti) |
| OVERLAPS | 19 | z-fight audit (section 5) |

## 3. Height coverage (the weak point of OSM here)

Visible buildings + parts: 1437. **Mapped `height` 24 (1.7 %), levels only 947 (65.9 %), neither 466 (32.4 %).** Outlines: 12 / 754 / 456; parts: 12 / 193 / 10.
Levels histogram of the visible buildings: 1: 142, 2: 96, 3: 136, **4: 245, 5: 242**, 6: 62, 7: 23, 8-10: 6, none: 480.
`h = levels * 3.3` is far too low for central Saint Petersburg: pre-1917 buildings have floor heights of 3.6-4.5 m (a "5-storey" house is 20-24 m, the cornice limit of the old centre
is 23.5 m). The lead should use **levels * 4.0 (heritage / `startDate` < 1917) or 3.3 (Soviet panel blocks)** and, for the 466 buildings with neither, a neighbourhood default of 5 floors ~ 21 m
(the median of the block); the bake keeps the raw facts (`levels`, `hEst`) and never invents a height. Other building tags: roof:shape 90, building:colour 6, building:material 49,
start_date 22, name 70, address (house number) 1122, `architect` 8, heritage 1, courtyard holes in 213 outlines.

## 4. Problems / gaps

* **Moscow Railway Station**: mapped as outline r2404499 (17 m, building=train_station) hidden by 6 parts (`r16492034..39`: concourse wing 10.5 m, hall 10 m gabled, two 5 m side parts,
  clock-tower base r16492039 = 44 m2 / 17 m / pyramidal) + wings r2404500 (3 levels) and r2404501 (5 levels). No train-shed (canopy) geometry beyond the "roof" part w662697923
  (5 m, min_height 4.5, 1119 m2) and the platform polygons (`shelter=yes`); the long glass-and-steel platform canopies are NOT mapped (build them from the PLATFORMS polygons). The clock-tower height
  in OSM (17 m) is only the base of the tower; the real tower is far taller (take its height from the research docs). All 6 platforms and 43 track ways are present; platform `height`/`length` are not tagged.
* **Heritage**: only 1 building carries `heritage`, 8 `architect`; the Beloselsky-Belozersky Palace, Anichkov Palace, Fountain House, National Library are plain buildings with 2-3 levels
  (real 15-25 m) - their heights must come from the research docs, not from OSM.
* **Courtyards**: 877 `passage` ways (arches) and 2726 service ways exist, 213 buildings have courtyard holes, but inner courtyard buildings and the wings of the blocks are often single big
  outlines without detail; the building parts exist only for 215 buildings. Trees (285) and lamps (68) are sparse; benches / bins (871 furniture) are fine.
* **Metro**: stations, 12 entrances, lines, platforms and 68 underpass tunnels / stairs are mapped; there are NO vestibule buildings for Mayakovskaya (the entrances sit inside r15081493) and
  Dostoevskaya / Vladimirskaya (entrances sit in w38578114 / w61738351); station halls and escalator tunnels are not mapped (only the platform polygons, depth tags 51 / 58 / 55 / 64 m and
  `layer` -4 / -5 / -7). `colour` is on stations and entrances, the line `ref` on the route relations (propagated to SUBWAY ways and to STATIONS[].lines).
* **Anichkov Bridge**: mapped (deck + 2 carriageways + footways, layer 1) but the 4 Klodt horse groups, balustrades and the lamp posts are not; the Fontanka quay is only
  `barrier=retaining_wall` ways (36) without a granite parapet; the water polygon edge is the quay line (the water surface should sit ~ 2.5 m below the street level).
* "Невский плаза" (a label of the screenshot) has no OSM object (`landmarks.json -> missing`); Colosseum is a POI node only.
* Indoor `highway=corridor` ways (408) are dropped; `highway=construction/proposed` ways are dropped; 12 `railway=tram_stop` nodes lie on streets without any tram line (legacy tags, ignore them
  for the scene).
* OSM trolleybus routes: only the ways inside the extent have geometry; stop members outside the extent are omitted.

## 5. Z-fighting audit of the data (build rules for the lead)

`tools/bake-osm.mjs` writes **OVERLAPS** (19 pairs of visible buildings / parts whose footprints overlap by >= 25 % and are not parent / child; 2 pairs have the SAME height = coplanar roofs and
walls that will flicker: `w61738342`/`w1185754667` (650 / 539 m2, 19.8 m) and two low pieces of the Hero City obelisk base `w1214651507`/`w1214651509` (173 / 104 m2, 0.2 / 0.4 m)), and marks 1 building as
`dupOf` (footprint duplicates another: draw only one). 3 road ways are drawn twice (same end points / length). Rules that follow from the data:

* **Outline + parts**: 60 outlines are `skip=1` (>= 50 % covered by parts) - draw the parts only; an outline with `skip=0` and parts (coverage < 0.5) is drawn with its parts: lower the parts
  that start at `minH = 0` by nothing but give the OUTLINE a roof-less shell (or cut the outline footprint with the parts) or both roofs coincide.
* **Ground layers** (all flat at y = 0): landuse < green / pitches / parking < AREAS (paving) < roads < crossings / road markings < rails; give each layer its own polygon offset / 2-3 cm lift. Roads
  overlap AREAS (squares: Vosstaniya, Vladimirskaya) and the 1185 footways overlap the carriageway polygons at every crossing; 877 service ways run through the buildings (arches: `passage`).
* **Water**: the Fontanka polygon touches the quay walls; draw the water 2.5 m below the street level inside an embankment trench, never at y = 0 under the roads.
* **Bridges**: the Anichkov deck (r5537267) overlaps its two carriageways and six footways (all `bridge=1, layer=1`): draw ONE deck slab at the bridge level and skip the roads' ground quads under it;
  never lay the bridge roads at y = 0.
* **Rails**: 43 track ways + 5 yard tracks + 16 platforms: platforms and the "roof" part overlap tracks only at the heads; lay ballast under the tracks first, then sleepers / rails 3 cm up, platforms 1.1 m up.
* **Metro**: all subway ways, platforms (layer -4 / -5) and tunnel roads/stairs are below the surface (`tunnel=1`): keep them out of the surface network (ROADS with `tunnel` are already excluded
  by `layout.js: ROADS.filter(r => !r.tunnel)`), and give each underground level its own y.
* **Doors**: 3226 entrance nodes sit exactly ON the facade polygon edges: push them 2-5 cm outwards.

## 6. What the lead must change in `layout.js` (still the Yakutsk version; `node tools/layout-test.mjs` currently FAILS only on Yakutsk names / ids)

* Hard-coded building ids of the Yakutsk landmarks (`w310466788`, `r1299777`, ...) -> the new ids of `docs/reference/landmarks.json` (`landmarks[].osmId`, grouped by area; the Moscow station parts,
  Hotel Oktyabrskaya r1598177, obelisk w1214651508, Nevsky Centre r1784115, Beloselsky-Belozersky r1588865, Vladimirsky cathedral w38611014 / bell tower w38611013, ...).
* Street names for `areaAt` / `nearestRoad` (ROADS[].name, Russian only; `nameEn` is set where OSM has it): Невский проспект (primary, two one-way carriageways, 14 / 17.4 m each, 51 ways),
  Лиговский проспект (37), площадь Восстания (secondary_link ring, 6), улица Маяковского, улица Марата, Стремянная улица, Пушкинская улица, Владимирский проспект, Литейный проспект,
  набережная реки Фонтанки (16 ways), Гончарная улица, Кузнечный переулок, Колокольная улица, Графский / Дмитровский / Поварской переулок, улица Рубинштейна. Squares (AREAS `hw=square`): площадь Восстания
  w638352776, Владимирская площадь w638326092, Манежная площадь r10708698, Греческая площадь w162380264.
* **Grid angles (compass bearing of the street axis, clockwise from north)**: Nevsky 103.9 deg (west of Mayakovskogo 104.3, east 103.0; i.e. +14.0 deg from the +X axis towards +Z);
  Liteyny / Vladimirsky pr. 1.5 deg (almost exactly north-south); Ligovsky pr. 17.3 deg; Marata ul. 17.0 deg; Zagorodny pr. ~ 52 deg. The blocks between Nevsky and Marata are therefore rotated
  14 deg (Nevsky) / 17 deg (Marata / Ligovsky) against the screen axes, not axis-aligned: use the road bearing, not a grid, for facing / house numbers.
* Spawn: Vosstaniya Square in front of the station (about (560, 190)); `PLAY` as above; vestibule / entrance positions from `ENTRANCES`; ORIGIN (0, 0) lies on the Nevsky roadway.
* New exports to use: RAILS / RAIL_NODES / PLATFORMS / STATIONS / ENTRANCES (station + metro), SUBWAY / SUBWAY_ROUTES (metro), TROLLEY / TRAM_ROUTES / TRAMWAYS / `ROADS[].trolley|bus` (transport),
  RIVER / EMBANKMENTS / BRIDGES / STEPS / TUNNELS (Fontanka, Anichkov Bridge, underpasses), OVERLAPS and `BUILDINGS[].dupOf` (z-fight cleanup), `ROADS[].passage` (arches), `ENTRANCES[].bldg`.
* Records changed vs the Yakutsk bake: `nameSah` is gone, `ROADS[].tunnel` is 1 also for `building_passage` (with `passage: 1`), indoor corridors are dropped, `BRIDGES` holds ways as well as decks
  (`pts` set, `polys: []` for ways; decks have `pts: []`), `PIPES` is (almost) empty, `PIERS` is filled (quays / docks), `BUILDINGS[].tags` has more keys (`architect`, `ref:okn`, `wikipedia`, ...).

## 7. Verification (`docs/reference/plan-overlay.png`, `docs/images/plan.png`)

`node tools/plan.mjs` draws the baked outlines (magenta), parts (orange), centre lines (cyan), signals, rails, platforms, Fontanka polygon, metro tunnels / entrances on the screenshot; looked at
at 3-5x in four places: Anichkov Bridge + Fontanka quays (outlines and the river polygon within 1-2 px, the bridge carriageways on the Yandex bridge), Mayakovskaya (the entrance ring is on the
Yandex "M", the vestibule block outline matches), Vosstaniya Square (obelisk, Hotel Oktyabrskaya, the Nevsky / Ligovsky roundabout-like junction) and the Moscow station (the L-shaped concourse parts, the
train hall and the platform heads fall on the grey Yandex footprint, the Cosmos hotel / Goncharnaya blocks line up). `tools/overlay.mjs` (top-down render of the engine against the screenshot) is
independent of the play area: image size, scale and picture centre come from `calibration.json`, the camera height is derived (2.53 km at fov 20 deg; the engine far plane is 7 km).
