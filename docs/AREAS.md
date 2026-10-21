# Areas: one page per scene

n4spb used to be ONE scene (the Nevsky strip). A scene that grows keeps growing in memory and frame time (the whole source city needed 84-90 s to load, ~5 GB and 17-33 fps), so the world is
now split into **areas**: each area is its own page, with its own data, module list and bake. The player walks in one area; near the border toward another area the game asks whether to load it,
and the answer is a page navigation (`location.replace`). The old page dies with its memory; the new one loads from its own bake. The plan and the decisions behind it: the approved plan of
2026-10-21 (summarised in section 6); measurements: [AREAS-MEASUREMENTS.md](AREAS-MEASUREMENTS.md).

## 1. Glossary (these words are easy to confuse)

| Word | Meaning |
|---|---|
| **area** | a scene that is loaded on its own: `strip` (the Nevsky strip, `index.html`), `north` (`north.html`, generic since milestone M3: section 7). Identified by `ID` |
| **area module** | `src/world/area.js` (strip) or `src/areas/<id>/area.js`: the pure-data tables that say WHAT the world is (names, anchors, landmark groups, HUD location table, viewpoints, module list, water tables ...) |
| **registry** | `src/areas/registry.js`: which areas exist, their page, bake directory, import-map remap and the gates between them. Runtime-only (not part of the bake revision) |
| **gate** | a stretch of the border of an area where the player is offered the neighbour (milestone M2) |
| `AREAS` (layout.js) | the HUD table of **named places** for the location toast (`areaAt`): NOT the areas of this document |
| `dev:area` (package.json) | the authoring preview of one module (`tools/area-dev.mjs`, docs/AREA-DEVELOPMENT.md): also unrelated |

## 2. How a page picks its area

Every area page is the same engine with a different import map. `index.html` has none for the area (its files are the defaults). `<id>.html` (generated from `index.html`) remaps URL-like keys:

```html
<script type="importmap">{ "imports": {
  "./src/world/data/city.js": "./src/areas/north/data/city.js",
  "./src/world/area.js": "./src/areas/north/area.js",
  "three": "..." } }</script>
```

A URL-like key matches every relative importer and `import()` after resolution (HTML spec, "resolve a module specifier"), so the ~170 files that import the data facade or `layout.js` are untouched.
`tools/importmap-probe.mjs` proves it (Edge 155 and Firefox 158: PASS at the site root and under a sub-path; `--serve` hosts the probe for a phone). **Import maps do not apply inside Workers**:
the only worker (`core/baked-worker.js`) imports nothing area-specific. `<html data-area="<id>">` must equal the area module's `ID`: `main.js` throws (fatal card) when they disagree, so a stale
cached page can never build the wrong world.

Headless tools run as another area with `node tools/area.mjs <area> <tool.mjs> [args]` (`tools/lib/area-hooks.mjs`: Node loader hooks with the same remap). `tools/modules-list.mjs` reads the
module list of `AREA` (strip: `src/main.js MODULES`; another area: `MODULES` of its area module).

## 3. What lives where

* `src/world/area.js` / `src/areas/<id>/area.js`: `ID, BAKE_DIR, REQUIRE_BAKE, NAMES, SQUARE/OBELISK/STATION, GROUPS (landmark claims), makeAreas(h) (the HUD table), makeViews({yawToward}) -> { HERO, VIEWS }`;
  another area adds `MODULES, LABELS`. Every area module also exports the engine tables of section 3.1 (`WATER, ZONES, GARAGE, PRUNE_SERVICES, HOOKS, HEIGHT_PATCHES`). `layout.js` re-exports the first group, so the
  engine keeps importing it from `layout.js`; the engine tables are NOT re-exported (the layout golden dump would change): the modules read them through `src/world/lib/area-tables.js`.
* `src/world/data/city.js`: the data facade of the area (OSM records, `PLAY_RECTS`, `EXTENT_RECTS`, `RECT_NAMES`, `REGIONS`). Another area has its own facade built by `tools/area-data-cut.mjs` (M3).
* `assets/baked/` (strip) and `assets/baked/<id>/`: the baked products. ONE global revision covers all areas (`tools/baked-revision.mjs`).
* `src/core/baked-world.js`: `setBakeDir(dir)` (called by `main.js` from the area module), `openBakedWorld(ctx, params, { required })` (a page reached by a hand-off must not fall back to a procedural
  build: it throws), `peekManifest(dir)` (the gate preflight).

### 3.1 The engine tables (milestone M3)

Several engine modules used to hard-code places of the strip (Vosstaniya Square, the Palace Bridge, the Kazan garden ...). Those literals were moved VERBATIM into the area module (the strip's values are
unchanged: layout golden dump, signatures, `npm run check`, a byte compare of a scratch bake), and the modules read them through `src/world/lib/area-tables.js`. It imports the area module as a namespace
(`import * as A from '../area.js'`, so the import-map remap applies and a missing export is no link error) and **fills every missing table or key with an empty / inert value**: a minimal area module still
boots, and a module does nothing for what the area does not list. The tables are pure data (a few rows hold a function of `ctx`, documented below); no import of `layout.js` or three.js.

| Export | Shape | Read by | If the area leaves it out |
|---|---|---|---|
| `WATER.plugs` | `[{ key, o: [x, z, ...] }]` strips that OSM leaves out of the water polygons | `environment/waterways.js` | none |
| `WATER.bridgeZones` | `[{ id, name, key, c: [x, z], axis, w, len, own }]` bridge crossings of the quay (fields: `waterways.js`) | `waterways.js` (`BRIDGE_ZONES`), `river.js`, `water.js`, `bridges.js` | no bridge gaps |
| `WATER.bridgeShades` | `[{ id, key, c, axis, w, len }]` decks the water shader darkens the water under | `water.js` | none |
| `WATER.clipLines` | `[['x' \| 'z', value], ...]` extra clip lines of the data besides the borders of `EXTENT_RECTS` (an edge on one is no bank) | `waterways.js` | only the extent borders |
| `WATER.farSources` | names of the scenery rings drawn beyond the data: `'neva-up'`, `'neva-down'`, `'neva-malaya'` (the ring objects stay in `waterways.js`) | `waterways.js` (banks, pieces) | no far Neva |
| `WATER.farCenter`, `WATER.farRadius` | `[x, z]` and metres: the window of the far scenery (the horizon ring of `far.js`) | `waterways.js` (`FAR_WIN`), `river.js` | centre of the `EXTENT_RECTS`, 6000 |
| `WATER.forcedBanks`, `WATER.openMouths` | `[[x0, z0, x1, z1], ...]` data edges that are shore / segments across the mouth of a waterway that joins another | `waterways.js` | none |
| `WATER.dataWater` | `[{ id, key }]` records of the `WATER` data (not `RIVER`) that form a waterway of that key (the castle moat) | `waterways.js` | none |
| `WATER.slopeReaches` | `[{ id, key, run, kerb, lip, test(x, z, nx, nz), rail(nx) }]` grass-slope banks | `waterways.js` (`SLOPE_REACHES`), `quay.js` | no slope banks |
| `ZONES.pigeons` | `[{ tag, kind: 'pigeon' \| 'sparrow', x, z, ...{ spread, n, r, w, name, min } }]`, in priority order; a row may have `at(ctx) -> { x, z } \| null` instead of `x, z` (a position from a landmark service; the row is skipped when it gives nothing) | `wildlife/zones.js` `zoneTable` | no zones |
| `ZONES.crowHaunts`, `ZONES.crowds` | `[{ x, z, r }]`; `{ tag: [r, f, level] }` (a pigeon zone whose tag is listed gives one crowd to the ambience) | `wildlife/zones.js` | one haunt round `L.SQUARE` (crows need one); no crowds |
| `ZONES.fountains` | `[[x, z, volume], ...]` positional fountain loops (played only inside the play area) | `wildlife.js` | none |
| `ZONES.peopleDensity` | `{ station, west, mars }` sub-tables of `people.js DENSITY` (`DENSITY.global` stays in the engine); `west.off` / `mars.off: true` switch the scripted places of the strip's west (`people/west.js`, fixed Kazan / Palace Square ... coordinates) and of the castle (`people/mars.js`) off: an area that does not contain them MUST set both (the North does) | `people.js` (`DENSITY`), `people/nav.js`, `people/vignettes.js` | no station zone; `west { scale 1, platforms 1 }` (the scripted places are built at the strip's coordinates!); `mars { scale 1, zones [] }` |
| `ZONES.peopleCorridor`, `ZONES.peopleHot` | `[[u, weight], ...]` Nevsky corridor along the grid axis; `[x, z, amplitude, sigma] \| { u, d, a, s }` hot spots (`{ u, d }` = station frame) of the zone weight field | `people/zones.js` | no corridor; no hot spots (base weight only) |
| `ZONES.tramLines` | `[{ refs, a: [x, z], b: [x, z], headway }]` (`TRAM_LINES`) terminals are track ends in the data; a line whose terminals are missing is skipped | `traffic/trams.js` | no trams |
| `ZONES.clearDiscs` | `[{ x, z, r }]` discs kept free of trunks, hedges and beds | `environment/field.js` | none |
| `ZONES.farCentres` | `[{ x, z, bias }]` old dense stone city beyond the area: far blocks within `distance + bias` of one are as dense as near the area's centre | `environment/far.js` | the area's `SQUARE` only |
| `GARAGE.poses`, `GARAGE.spawn` | `{ coupe, truck, lada, roadster: { x, z, yaw (rad) } }`; `{ x, z, yaw }` | `drive/cars/index.js` (`PARKING`), `drive.js` (`SPAWN`) | a car without a pose is not built; no pose at all: `drive.js` returns early (no `ctx.drive`; its callers test it) |
| `PRUNE_SERVICES` | `['city', 'landmarksA', ...]` services whose `entrances` clear the trees from the doors | `environment.js` | no door clearings |
| `HOOKS`, `HEIGHT_PATCHES` | `{}` and `[]`, reserved for the hand-merged hooks and the height patches of M6 | nothing yet | empty |

Not tables, by design (the street frame is shared by all areas, so these are right in every area, or they follow the area's own `SQUARE` / `STATION` / `HERO` anchors): the horizon silhouettes of `far.js`
(real lon / lat positions, drawn only while no module owns the sight), `GRID_DEG`, `toGrid` / `fromGrid` (origin = the area's `SQUARE`), the `x < -595` "west look" seams (the North lies at x > -540), the
waterway cross-sections `WATERWAYS`. Known strip literals that are NOT tables (guarded by a service, a waterway key or absolute coordinates, so inert in another area, or they read the area's own anchors):
`environment/far.js` (`SQ = L.SQUARE` as the centre of the far blocks and the horizon ring, `rail()` = the Moscow station rail corridor), `environment/farconf.js:13` (`FAR_GRID` origin = `SQUARE`),
`environment/ground.js:230` (`uRail`, `uCityR`), `environment/boats.js` REACHES (validated against the water), `environment/river.js:78` (castle moat window), `streets/style.js:26-29` and `city/archetypes.js:124`
(distance to `SQUARE`), `traffic/parking.js:25-26` (`SQUARE` / `STATION` fallbacks), `props/state.js:150` and `people/frame.js:4` (the station frame fallback), `props/stands.js`, `props/ads.js:24-26`,
`wildlife/birds.js:47,89` and `wildlife/world.js:21` (`L.OBELISK`, `L.SQUARE`: an area module must export both), `wildlife/zones.js crowdTable` (the Anichkov deck crowd, service-guarded).

## 4. The bake revision (what makes a bake stale)

The revision is the first 20 hex digits of a sha256 over `index.html`, every other `*.html` with a `data-area` attribute, and every `*.js` under `src/` except `src/core/baked-revision.js` and the
**runtime-only files** (`RUNTIME_ONLY` in `tools/baked-revision.mjs`: `src/core/gates.js`, `src/core/handoff.js`, `src/areas/registry.js`). Files are ordered by their POSIX-relative path (a native
sort orders `landmarksNorth/` and `landmarksNorthFull.js` differently on Windows and Linux, and the CI would reject a Windows bake; `tools/baked-revision-test.mjs` pins the order).
Runtime-only files never build or change anything that is baked; `tools/runtime-only-lint.mjs` enforces that only `src/main.js` imports them. Tuning a gate rectangle or a prompt text therefore
does not make a bake stale. Two bakes of the same source are byte-identical: no wall-clock field is recorded (`city-base` service timings and the roof capture time were removed from the products).

## 5. Checks (CPU unless noted)

```
node tools/areas-test.mjs                 registry vs area modules, facades, pages, gates (geometry + arrival grid + band parity of every non-dev gate, synthetic gate fixtures), generator fixtures, page.json, TEST shape
node tools/gen-area-html.mjs [--check]    generate <id>.html from index.html + src/areas/<id>/page.json (section 5.1); --check = the CI gate
node tools/layout-golden.mjs --diff       every export of layout.js and the data facade equals tools/golden/layout-strip.json (the area seam must not change the strip)
node tools/import-lint.mjs                relative imports exist with EXACTLY the spelling used (Windows develops, Linux hosts), module lists have files
node tools/runtime-only-lint.mjs          only main.js imports the runtime-only files
node tools/baked-revision-test.mjs        hash order and exclusions
node tools/handoff-test.mjs               the hand-off codec, the URL, resolveArrival (also on the real strip layout)
node tools/gates-test.mjs                 gate geometry, the state machine (zone, arming, decline, teleports) and the preflight logic with fakes
node tools/gate-hold-test.mjs             the four cars held while a question is open: stop inside the zone, never reverse
node tools/importmap-probe.mjs            go/no-go of the import-map mechanism (Edge, Firefox; GPU-free)
node tools/area-boot-test.mjs             browser: the page boots as its area, refuses a mismatching one (fast harness)
node tools/areas-flow-test.mjs            browser, GPU, fast harness: prompt, arming, decline, accept, arrival, required bake, driving, flying, failures
node tools/areas-hop-test.mjs             browser, GPU, REAL bake of both areas (no fast harness, no fakes): strip > north > strip walking, then the coupe through both gates (the car and its cockpit view survive)
node tools/nav-memory-probe.mjs           browser, GPU: does a navigation free a scene (post-GC heap, process-tree bytes, per hop; --pages index.html,north.html alternates the areas)
node tools/area-garage-check.mjs          CPU: the GARAGE of an area (four cars + spawn): no building / traffic lane / parked car, level ground, solid for walkers, 14 m of free way out (run it as `node tools/area.mjs north tools/area-garage-check.mjs [--map x0 z0 x1 z1 [step]]`)
```

### 5.1 The generated area page

`<id>.html` is **generated**, never edited: `node tools/gen-area-html.mjs [--area <id>] [--check] [--force-planned] [--root <dir>]`. It takes `index.html` (the source of truth, never modified by the tool) and applies targeted
replacements of stable anchors; an anchor that matches other than exactly once stops the tool (an `index.html` edit that moves one must be followed in `tools/gen-area-html.mjs`). What changes: `<html data-area>`, `<title>`,
`apple-mobile-web-app-title`, the canvas `aria-label`, the intro kicker and title, the phone "heavy scene" note (the area's MB is `REGISTRY[id].approxMB`), the `#places` tooltip, the two keyboard-help lines, the import map
(the registry's `remap` first, as URL-like keys `./src/...`; the `three` entries stay) and the facts script (`SIGHTS`, `FACTS`). Every id, class, script and style is `index.html` byte for byte (a test pins it). A `<!-- GENERATED -->` line follows the doctype.
`--check` writes nothing and exits 1 when the file on disk differs (CRLF checkouts compare equal) or is missing; with no `--area` it covers every real (non-`planned`) area except the strip. `--force-planned` generates the page of a
`planned` row (the area's own files do not exist yet, so the page fails at its first import: that is how `north.html` is committed before the data lands). The text data of an area is `src/areas/<id>/page.json`
(Cyrillic only through an editor, never a shell):

```json
{ "schema": 1, "title": "tab title", "appTitle": "home-screen label", "canvasLabel": "canvas aria-label",
  "intro": { "kicker": "line over the title", "title": "the splash h1" },
  "heavy": { "ramGB": 1, "ru": "... ~{mb} МБ ... ~{ram} ГБ ...", "en": "... ~{mb} MB ... ~{ram} GB ..." },
  "places": { "title": "tooltip of the Places list" },
  "help": { "walk": "text with <kbd>1</kbd> tags", "air": "text with <kbd> tags" },
  "sights": ["splash-name"],
  "facts": [["a true, checkable sentence"], ["another", "splash-name"]] }
```

`sights` are `assets/splash/<name>.jpg` (the nine strip pictures exist; `[]` = no pictures, the splash keeps its plain colour); a fact's optional second element is the sight whose picture shows it. At least 8 facts,
one line each, no `<` or `>`. Every fact must be true and checkable (the facts of `north` are about the Tauride Garden and Palace, Smolny, Chernyshevskaya, the Transfiguration Cathedral, Liteyny Prospekt and the Neva).
The `help` lines list the keyed views of the area: they must follow `VIEWS` in the area module.

### 5.2 Tools take the area

* `node tools/area.mjs <id> <tool.mjs> [args]` runs a headless tool as another area (loader remap, section 2); `node tools/each-area.mjs <tool.mjs> [args]` runs it once per real area (`npm run layout`, `npm run landmarks`).
* **The expectations of an area** are exported by its area module as `TEST` (the strip's are the fallback in `tools/lib/area-test-data.mjs`; same shape): `tools/layout-test.mjs` and `tools/landmarks-groups-check.mjs` read them.
  ```js
  export const TEST = {
    claimed: [{ id: 'r2404499', by: 'landmarksA', group: 'station' }, 'w123'],   // ids that must be claimed (by = module, group = sub-group); a bare id = claimed by anything
    viewKeys: ['Digit1', /* ... */ 'Digit0', 'Place.oktyabrsky'],                // the exact keys of VIEWS: keyed views in order, then Place.<id> views (those only have to exist)
    mustHaveAreas: [{ x: 592, z: 165, has: 'substring of areaAt(x, z), lower case' }],
    kept: ['landmarksA'],                         // modules whose GROUPS entries are verified against the data (default: every key of GROUPS)
    // optional: nearestRoad {at, names}, roadsNear {at, r, min}, riverAny [[x,z]], riverBed [[x,z]], streetLevelAt [x,z], onRoadNote [[x,z,text]], farPoint [x,z]
  };
  ```
* Browser tools take `--area <id>` or `--page <file>` (default: the strip, `index.html`): `shot.mjs` (also `hero`, `v1..`, `views` of THAT area), `smoke.mjs`, `drive-bench.mjs`, `drive-test.mjs`, `load-test.mjs`, `baked-check.mjs --area <id>`;
  `serve.mjs [port] [--area <id>]` serves every page of the site root (the flag only picks what `/` opens). `tools/lib/area-page.mjs` resolves the flags.
* `tools/check.mjs --area-modules [--skip a,b]` checks every module of the page's list (`npm run check:north` = `node tools/area.mjs north tools/check.mjs --area-modules`); `npm run check` stays the strip's list.
* `tools/owns-table.mjs` builds ONE union table of the `MODULES` of every real area (a module is the same file in every area that lists it).
* **Gate geometry** (`tools/lib/gate-geometry.mjs`, run by `areas-test` on every non-dev gate): the segment lies on the border of the origin play union (0.5 m inward is inside, 0.5 m outward is outside, sampled every 5 m); `inward` is a unit
  vector normal to the segment; a point at depth `zone` is inside; the arrive rectangle's corners lie 25 m inside the destination play union; the reverse gate leads back and names this gate, and no 25 m arrival-grid point is within `zone + 50 m`
  of the reverse border inside its lateral range; the arrival grid (25 m steps x walk / fly / car x both headings along the crossing axis) is resolved by `handoff.resolveArrival` with the DESTINATION layout and every result passes predicates
  written independently of the probe (25 m inset, not in a building or the river, a car on a drivable lane within 30 degrees); **a fall-back to the destination HERO counts as a failure**. A gate whose destination is another area runs the grid
  in a child (`tools/area.mjs <to> tools/areas-test.mjs --arrival-only <gate>`). The band-parity hook is `tools/band-parity.mjs` exporting `bandParity({ gate, root, REGISTRY })` (a list of problem strings); it runs check 4 of `tools/area-data-test.mjs` for the area on the
  other side of the gate (docs/AREAS-DATA.md section 5), once per area per process (~3 s). Synthetic fixtures inside the test exercise every check and every way it must fail.

## 6. Decisions in one place

Switch = full navigation; one static HTML per area; hand-off through the standard URL parameters (`cam`, `fly`, `tod`, `look`) plus a small `ho`; a one-sided 200 m band of strip territory belongs to the
North so the arrival lands on identical streets; the prompt is `ctx.ui.confirm` + a passive chip; the Continue tap stays (audio and pointer lock need a fresh gesture). The split removes
accumulation, not the per-scene floor: every crossing is a cold start of ~25-30 s on a fast desktop.

### 6.1 Bake and deploy

* `node tools/bake-scene.mjs --area strip|north|all` (default `strip`; `npm run bake` = `--area all`, `bake:strip`, `bake:north`). The page, the output directory and the manifest come from the registry: `assets/baked/` for the strip
  (unchanged: 66 files, the URL every cached page knows), `assets/baked/<id>/` for the others. A `planned` area is skipped (asked for by name it is an error, exit 2). The bake runs the areas one after another in one browser with the
  GPU lock of the session. The manifest is `{ format: 1, area, revision, files, sizes }`.
* **One global revision** (`tools/baked-revision.mjs`) and publication after ALL requested areas succeeded: the manifests and `src/core/baked-revision.js` are written only then, and only then is each area's OWN directory purged of old
  products (direct children only: the strip's directory contains `north/`). A failed or interrupted bake leaves the last good manifests and revision untouched. A bake of one area changes the global revision, so the manifests of the other
  areas stay behind it (the script warns, `bakecheck` fails): scratch bakes in a worktree may do that, a committed bake is always `--area all`.
* `bake-manifest-check` loops over the real areas (revision, `area`, required products, sizes, no `.part`; `--area <id>` for one); `baked-check [medium|performance] --area <id>` hydrates one area's bake against its generators
  (the far streaming target is the farthest play rectangle, `TEST.farPoint` overrides). `.gitignore` ignores `assets/baked/**/*.part`.
* `.github/workflows/pages.yml`: on a pull request only the CPU `verify` job runs (no `npm ci`: bake-manifest-check, gen-area-html --check, layout-test and landmarks-groups-check for every real area, areas-test, handoff-test, gates-test,
  owns-table --check, runtime-only-lint, import-lint, baked-revision-test, `strip-data-clip --check` on every `src/world/data` and `src/areas/*/data` that exists); `deploy` needs `verify` and does not run on pull requests. The site is
  `index.html`, every root page that names its area (`north.html` when it exists), `src`, `assets`, the manifest and the licences. The concurrency group is per ref, so a pull request never cancels a deployment of `main`.
  While the bake is stale (until the committed bake of milestone M8) `verify` is red on purpose.

## 7. The generic North (milestone M3)

The North is a real area since M3: `src/areas/north/area.js` (pure data, the export names of `src/world/area.js` plus `MODULES`, `LABELS`, `TEST`), the data facade and `known-data.js`
([AREAS-DATA.md](AREAS-DATA.md)), `north.html` (generated, `src/areas/north/page.json`), the registry row (`status: 'planned'` is gone; the remap holds the facade, the area module and
`src/world/city/known-data.js`, which `city/known.js` imports by that URL, so the page needs no code change) and the real gates g1 / g2. Landmark modules are M5: `GROUPS = {}`, so the generic `city`
draws every building (the Chernyshevskaya vestibule, the Tauride Palace and Smolny are plain blocks for now).

* **Modules** (build order): `environment, streets, city, props, traffic, people, wildlife, drive`. NOT built: `rail` (no railway in the data), `metro` (the door gate G3 of M7 replaces the ride) and `bridges`
  (so `streets` keeps the roads that cross a waterway as plain ribbons: the Liteyny Bridge ways, cut at the extent edge z = -2120, run 130 m into the Neva as a road stub; the Anichkov and Belinsky bridge
  ways end at the extent margin outside the play area. Known seams, fixed when a bridge module comes). `LABELS` overrides the loading words of `props / traffic / people / drive`.
* **Anchors**: `SQUARE`, `OBELISK`, `STATION` are COPIES of the strip's (the area module cannot import the strip's: the import map would hand back itself). That is deliberate: the style of a block follows
  its distance to `SQUARE` (`city/archetypes.js`, `streets/style.js`), so the 200 m band looks the same on both pages; the street grid origin and the far horizon are `SQUARE`-centred as well.
* **Views**: HERO = Chernyshevskaya (444, -1351); keys 1..0 Chernyshevskaya, the Transfiguration Cathedral, Dom Muruzi, the Paradny Quarter, the Tauride Garden, the Tauride Palace, Smolny Cathedral, Smolny
  Institute, the Suvorov Museum, Kirochnaya Street, then `Place.oktyabrsky`; `page.json` names the keys in this order. Every pose passes `node tools/area.mjs north tools/views-check.mjs` (3 were moved:
  Dom Muruzi (-154 -> -165, it stood on the carriageway), the Smolny Institute and Kirochnaya by a few metres) and `layout-test`.
* **Tables**: `WATER` has no plugs / bridge zones / shades / clip lines, `farSources ['neva-up']`, `farCenter [1100, -1100]`; `ZONES` has pigeon / sparrow sites at Chernyshevskaya (461, -1350), the Tauride gate
  (1226, -1268), the Transfiguration Cathedral and Smolny, crow haunts, crowds and the four hot spots, **`peopleDensity.west.off` and `.mars.off`** (the scripted places of the strip's west and of the castle
  stand at fixed strip coordinates: without the switch the North built 325 of its 962 people at Kazan, the Palace Square and the castle, 1.2-4 km outside its extent: 637 remain); `GARAGE`: the four cars stand in the courtyard north of the
  Chernyshevskaya vestibule, facing west to the avenue (roadster (468, -1381), lada (470, -1377.8), truck (469, -1367.2), coupe and spawn (470.5, -1370.8)); `PRUNE_SERVICES ['city']`.
  `node tools/area.mjs north tools/area-garage-check.mjs` proves them (the same tool passes on the strip's garage).
* **Gates** (`src/areas/registry.js`): g1 strip > north, segment z = -405, x -420 .. 835, inward (0, 1), zone 30; g2 north > strip, z = -205, inward (0, -1); they name each other. The planned arrival
  rectangles (g1 x -350 .. 805, z -520 .. -300; g2 x -350 .. 805, z -300 .. -220) were **trimmed** to what the 25 m arrival grid resolves 100 % (a car must land on a drivable lane within 30 degrees of its
  heading and the ring search stays inside the rectangle): g1 `x -225 .. 755, z -460 .. -310`, g2 `x -225 .. 805, z -300 .. -230`. The grid points that failed were all cars: the library block west of x -250
  has no north-south lane, the east edge x 775 .. 805 and a few single points have none; a walker or a car that crosses outside the rectangle lands at its nearest point (a crossing on the Fontanka quay at
  x -370 lands 145 m east of it). The ping-pong margin is 105+ m (g1 arrives at z <= -310, g2's border is z = -205). **The dev gate g0** (18 of 648 resolutions fall back to the HERO: car arrivals at the corners
  of its rectangle, x >= 640 and z 80 / 105 / 260) is left as it is: it is a fixture of `?devgates=1` and areas-flow-test, a car crosses it on the Nevsky lane at x = 470, and `areas-test` does not grade
  dev gates. `tools/band-parity.mjs` wires the band check of `area-data-test` into `areas-test` (the band is identical in all 34 arrays).
* **Water edges** (decision: no change of the rectangles). The play edge z = -2000 is 13 .. 116 m INSIDE the Neva for x -400 .. 900 (the south bank is at z -1884 .. -1994), on land for x 1000 .. 1300 and
  beyond the data for x > 1400; the Fontanka water spans x -446 .. -379 in the band, i.e. the west edge x = -420 is in the water there. A walker never reaches the edge: the quay wall of `environment` stops
  him 1 .. 3 m before the first water point (walk probes along x -200 .. 900 at the Neva and z -300 / -600 / -1000 at the Fontanka stop at the quay, never in the water, never at the play edge). The
  invisible walls are therefore the quays, and the play rectangles stay the numbers the facade was cut with. East of x 1400 the edge z = -2000 is plain ground (the data ends at z -2120 / -2180 and the Neva bank
  lies at z -2347 at x 1550): the far scenery takes over there.
* **Running the tools as the North**: `node tools/area.mjs north tools/<tool>.mjs`: `layout-test`, `views-check [--fix]`, `owns-table --check`, `check --area-modules` (= `npm run check:north`) or with a module list,
  `people-test [--at chernyshevskaya|tauride|smolny|preobrazhenskaya]`, `traffic-test`, `wildlife-test` (the area's own sights instead of Kazan and the Neva boats), `area-garage-check`; `each-area.mjs` runs
  `layout-test` and `landmarks-groups-check` for both areas. Browser: `shot / smoke / baked-check --area north`, `area-boot-test --page north.html`, `areas-hop-test`.
* **Known leftovers**: the people test counts ~100 samples per 5 minutes on a carriageway at one crossing (`cross=145` at (452, -1298), the junction of Chernyshevskogo and Kirochnaya; the threshold is 374,
  the strip has 0); `streets` / `city` exceed their triangle budgets (590 k / 836 k against 500 k / 600 k, the strip's are 835 k / 969 k); the people test's jump counter is higher than the strip's (tour
  groups that re-place themselves). Measurements: [AREAS-MEASUREMENTS.md](AREAS-MEASUREMENTS.md) section "M3: the generic North".
