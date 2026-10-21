# Areas: one page per scene

n4spb used to be ONE scene (the Nevsky strip). A scene that grows keeps growing in memory and frame time (the whole source city needed 84-90 s to load, ~5 GB and 17-33 fps), so the world is
now split into **areas**: each area is its own page, with its own data, module list and bake. The player walks in one area; near the border toward another area the game asks whether to load it,
and the answer is a page navigation (`location.replace`). The old page dies with its memory; the new one loads from its own bake. The plan and the decisions behind it: the approved plan of
2026-10-21 (summarised in section 6); measurements: [AREAS-MEASUREMENTS.md](AREAS-MEASUREMENTS.md).

## 1. Glossary (these words are easy to confuse)

| Word | Meaning |
|---|---|
| **area** | a scene that is loaded on its own: `strip` (the Nevsky strip, `index.html`), `north` (`north.html`, generic since milestone M3: section 7; with its landmark modules since M5: section 8). Identified by `ID` |
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
| `HOOKS`, `HEIGHT_PATCHES` | `{ key: factory, function or list }` and `[{ id, box, at }]`: the hook set of M6, contract in section 9 (the North builds them in `src/areas/north/hooks.js`; the strip exports `{}` and `[]`) | the engine modules of section 9.1 (nothing reads them before the clusters of M6 land) | empty: every call site is a no-op |

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
`src/world/city/known-data.js`, which `city/known.js` imports by that URL, so the page needs no code change) and the real gates g1 / g2. This section is the North as milestone M3 left it (`GROUPS = {}`, the generic
`city` drew every building); **milestone M5 added the landmark modules: section 8** (the module list, the claims and the numbers below that changed are given there).

* **Modules** (build order in M3): `environment, streets, city, props, traffic, people, wildlife, drive`; M5 inserted the landmark modules (section 8.2). NOT built: `rail` (no railway in the data), `metro` (the door gate G3 of M7 replaces the ride) and `bridges`
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
  Chernyshevskaya vestibule, facing west to the avenue (roadster (468, -1381), lada (470, -1377.8), truck (469, -1367.2), coupe and spawn (470.5, -1370.8)); `PRUNE_SERVICES ['city']` (M5 added the landmark
  services that publish entrances, section 8.2). `node tools/area.mjs north tools/area-garage-check.mjs` proves them (the same tool passes on the strip's garage; since M5 it also builds the landmark modules of the page).
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
  The jump counter is red on `feat/areas` itself once a run is long enough (M5 check, before any landmark module: `people-test --at chernyshevskaya --minutes 5` 218 jumps against the limit of 159, the default
  `--minutes 10` 407 against 318; with the M5 modules 272 and 368 against 160 and 321): it is a property of the tour groups, not of a module. The M5 leftovers are in section 8.7.

## 8. The landmarks of the North (milestone M5)

The North page now builds the landmark modules of the source (the 102_3d_piter repository, pinned to commit `0568f7af`, the same commit the data of the North was cut from), so the generic `city` no longer draws
the sights. Nothing was remodelled: the files are verbatim copies (only the provenance line, the three import paths and the names of `landmarksNorthFull` differ, see 8.1; the repository stores LF, the
sources were CRLF, so a raw `cmp` differs and a compare with the CR removed is byte-identical). The strip is untouched except for the landmarksD sub-group refactor and part gating of 8.1 (`src/world/landmarksD/groups.js`, `landmarksD.js`, `landmarksD/fences.js`, all hash-proven inert for the strip) and the four new rows of the generated owns table of 8.2. The Tauride Palace / Garden and the Paradny quarter are NOT in this milestone (8.7).

### 8.1 What was copied from where

| North module | claims (sub-group keys) | files (source path at `0568f7af` = same path here) | difference from the source |
|---|---|---|---|
| `landmarksNorthFull` | `north-chernyshevskaya` (the metro vestibule w22999175, with the station sign), `north-preobrazhensky` (the Transfiguration Cathedral r5802451), `north-muruzi` (Dom Muruzi r946930), `north-podpisnye` (the bookstore w96123542, walk-in), `north-corridor-houses` (13 of the 14 addresses, 13 ids) | `src/world/landmarksNorth.js` -> `landmarksNorthFull.js`, `landmarksNorth/{bookstore,muruzi,groups}.js` -> `landmarksNorthFull/` | 7-line header, the 3 import paths, `root.name`, the services key; the strip keeps its own trimmed `landmarksNorth.js` (bookstore + the 5 corridor addresses of the strip data), and the functions `corridor()` and `bookstore()` are the same text in both |
| `landmarksSmolny` | `north-smolny-cathedral` (r2864743 + 4 parts), `north-smolny-ensemble` (r2133719, the convent / Institute) | `landmarksSmolny.js`, `landmarksSmolny/{cathedral,groups}.js` | one provenance line |
| `landmarksSuvorov` | `north-suvorov-museum` (7 ids: w30198549 and the six w2329187xx parts) | `landmarksSuvorov.js`, `landmarksSuvorov/groups.js` | one provenance line |
| `landmarksKirochnaya` | `kirochnaya-clinical-institute` (20 building ids + 14 service / footway ways of the garden campus) | `landmarksKirochnaya.js`, `landmarksKirochnaya/{groups,landscape}.js` | one provenance line |
| `landmarksD` (the strip's module) | `library` only (the National Library r3801087, the Mariinsky block w60353337), both in the 200 m band | `landmarksD/groups.js` is NEW: `LIBRARY_GROUP` moved out of `src/world/area.js` | the strip's GROUPS JSON is byte-identical before / after; `landmarksD.js` and `landmarksD/fences.js` skip a part whose sub-group the area does not claim (inert in the strip: per-part triangles identical) |
| `landmarksOktyabrsky` (the strip's module) | `oktyabrsky-hall` (w30324279 + the part w929214560 + 4 OSM objects), in the band | unchanged | none; `environment/claims.js` reads its paved rings only when it is in the build list, hence it is in the North list |

Shared libraries the copies import already existed here and are identical to the source: `landmarksD/{common,house,kit,parts}.js`, `landmarksK/geo.js`. The research dossiers (`docs/research/north-*.md`) live in the
source repository, not here.

### 8.2 The module list and its order

```
environment, landmarksNorthFull, landmarksSmolny, landmarksSuvorov, landmarksKirochnaya, streets, city, landmarksD, landmarksOktyabrsky, props, traffic, people, wildlife, drive
```

`landmarksKirochnaya` precedes `streets` because the campus claims 14 service ways that `streets` must skip, and `landmarksNorthFull` takes the strip's place (`landmarksNorth` is second in `src/main.js`, too). None of the new
modules reads a service of an earlier one (only `landmarksOktyabrsky` needs `streets` and `labels`), so the order matters only for the claims. `landmarksD` and `landmarksOktyabrsky` stand after `city` as in the strip.
`PRUNE_SERVICES` is now `city, landmarksSmolny, landmarksSuvorov, landmarksKirochnaya, landmarksD`: the services that publish an `entrances` array (Smolny (2425, -1833) clearance 12, Suvorov (1412.9, -1225.2) clearance 4,
Kirochnaya (1230, -1244) and (1312, -1238) clearance 5; `landmarksD` publishes an empty array in the North, as in the strip's list). `landmarksNorthFull` and `landmarksOktyabrsky` publish none and are not listed (neither is in the strip's table).
`LABELS` names the loading words of the six modules. **`TEST.kept` is gone on purpose**: an empty list means "verify nothing" (the default is every key of `GROUPS`), so `landmarks-groups-check` now verifies all six owners in the North.
`src/world/lib/owns-table.js` (generated) has one new row per module: `landmarksNorthFull`, `landmarksSmolny`, `landmarksSuvorov`, `landmarksKirochnaya`; the table is keyed by module NAME, so the strip's `landmarksNorth` and the
North's `landmarksNorthFull` coexist, and a module only counts in the area whose list names it (`lib/claims.js` reads the `GROUPS` of the running page). A double claim of one id inside the North is caught by `layout-test`.

### 8.3 The claims

| Module / sub-group | ids | `TEST.claimed` rows | records in the North data |
|---|---|---|---|
| `landmarksNorthFull` / `north-chernyshevskaya` | w22999175 | 1 | 1 |
| `landmarksNorthFull` / `north-preobrazhensky` | r5802451 | 1 | 1 |
| `landmarksNorthFull` / `north-muruzi` | r946930 | 1 | 1 |
| `landmarksNorthFull` / `north-podpisnye` | w96123542 | 1 | 1 |
| `landmarksNorthFull` / `north-corridor-houses` | 13 of 14 addresses (w60354394, Mayakovskogo 4, lies outside the North extent: the group filters on `BUILDINGS`, the missing one is tolerated) | 3 (the ones in the band: w60354379, w96364627, r1394323) | 13 |
| `landmarksSmolny` / `north-smolny-cathedral`, `north-smolny-ensemble` | r2864743 (+ w751397803..06), r2133719 | 2 | 5 + 1 |
| `landmarksSuvorov` / `north-suvorov-museum` | w30198549 (a `folly`, skipped), w232918746 / 49 / 66 / 67 / 70 / 86 | 2 | 7 |
| `landmarksKirochnaya` / `kirochnaya-clinical-institute` | 20 ids, 14 OSM ways | 2 | 20 + 14 |
| `landmarksD` / `library` | r3801087, w60353337 | 1 | 2 |
| `landmarksOktyabrsky` / `oktyabrsky-hall` | w30324279 (+ part w929214560, 4 OSM ids) | 1 | 2 + 4 |

`node tools/area.mjs north tools/layout-test.mjs` checks each row (`by`, `group`) and that every claimed id has a record; `node tools/area.mjs north tools/landmarks-groups-check.mjs` checks the ids, the OSM objects and that every
footprint vertex lies inside the extent (`north-podpisnye` and the Oktyabrsky hall are 75 % inside the play rectangles: the rest is the band's far side, inside the extent). The Kirochnaya sub-group claims by bounding box,
not by polygon: four of its 14 ways leave the campus polygon (the two 10 m gate stubs across Kirochnaya's pavement, w515895295 / w515895296, and two single vertices, w234083522 and w1253281492); no named street is claimed.

### 8.4 The band-parity landmark assertion

The 200 m band (x -420 .. 835, z -405 .. -205) is built by BOTH pages, so a landmark of the strip that stands in it must be built by the North too, with the same ids and the same sub-group keys. `tools/areas-test.mjs`
checks it for every non-dev gate (`gate gN: band landmarks`, next to the data check `band parity`): `tools/lib/claims-dump.mjs` prints one `CLAIMS_DUMP {json}` line per area (module list, ownership, one row per claimed id with its module,
sub-group, `via` id / osm / parent, whether a record exists and where), `tools/band-parity.mjs` (`bandLandmarks`, `landmarkBandProblems`, pure and fixture-tested) spawns the two dumps in parallel and requires, for every owned claim of the
strip inside the band, a row of the other area with the same id and key that is present in its data, whose module is in its `MODULES` and owns the sub-group. `PLAN_BAND_IDS` pins the eight ids of the plan
(r3801087, w60353337, w96123542, w60354379, w96364627, r1394323, w30324279 and the part w929214560) so that a drifted dump fails instead of passing vacuously; `MODULE_ALIASES` (`landmarksNorth` -> `landmarksNorthFull`) only
words the failure message. After the merge the strip owns **12** claims in the band (8 buildings including the part, 4 OSM objects), every one is built by a North module: `landmarksD/library` (2), `landmarksNorthFull/north-podpisnye` (1),
`landmarksNorthFull/north-corridor-houses` (3), `landmarksOktyabrsky/oktyabrsky-hall` (6). With the branch of `landmarksNorthFull` missing the test was red for exactly the four ids of `landmarksNorth` (checked on the branch of
`landmarksD` / `landmarksOktyabrsky`). The look of the band is proved on the module level as well: `node tools/area.mjs <strip|north> tools/northfull-sign-probe.mjs --parity` prints the triangle count and a position hash of the bookstore
and the corridor houses; both areas print the same numbers (bookstore w96123542 120096 triangles, hash 1174507441; w60354379 13732; w96364627 7390; r1394323 20112; w98394819 10167).
The same probe proves the station sign (the vestibule's west edge carries the sign texture).

### 8.5 Triangles

`npm run check:north` (`check.mjs --area-modules`), the generic North of M3 (`feat/areas`, measured again for this table) against the North after M5. Figures of the docs: the plan (0.2-0.34 M for the North group, 0.43 M Smolny,
0.05 M Suvorov, 0.12 M Kirochnaya), the dossiers of the source (`north-corridor.md` 335,942 without Dom Muruzi, `north-smolny.md` 430,984, `north-suvorov.md` 47,431, `north-kirochnaya.md` 115,011), the strip's own modules
(`landmarksD` 298,926 with its other three sub-groups, `landmarksOktyabrsky` 27,542).

| module | M3 triangles | M5 triangles | M5 meshes | M5 colliders | M5 instances | figure of the docs |
|---|---:|---:|---:|---:|---:|---|
| environment | 318,874 | 318,344 | 779 | 9,439 | 13,879 | 319 k (M3) |
| landmarksNorthFull | | **583,153** | 110 | 366 | 0 | plan 0.2-0.34 M; dossier 335,942 without Muruzi (ours without it: 342,596, +2.0 %) |
| landmarksSmolny | | **432,656** | 28 | 244 | 0 | 430,984 (+0.4 %), plan 0.43 M |
| landmarksSuvorov | | **47,461** | 15 | 45 | 0 | 47,431 (+0.06 %), plan 0.05 M |
| landmarksKirochnaya | | **121,061** | 176 (merged to 19) | 255 | 0 | 115,011 (+5.3 %), plan 0.12 M |
| streets | 590,181 | 589,819 | 717 | 3,204 | 12,419 | budget 500 k (known) |
| city | 835,960 | 803,387 | 401 | 21,975 | 0 | budget 600 k (known); -32.6 k: the claimed buildings are no longer drawn |
| landmarksD | | 28,804 | 32 | 74 | 0 | strip: library 19,643 + hospital 8,705 + fences 456 of its 298,926 |
| landmarksOktyabrsky | | 27,542 | 52 | 101 | 46 | strip: 27,542 (identical) |
| props | 211,004 | 214,738 | 578 | 2,188 | 1,890 | 211 k (M3) |
| traffic | 3,824 | 3,824 | 116 | 2,011 | 22 | |
| people | 0 | 0 | 72 | 0 | 0 | |
| wildlife | 48,176 | 46,864 | 23 | 0 | 507 | 48 k (M3) |
| drive | 45,706 | 45,706 | 96 | 4 | 0 | 46 k (M3) |
| **sum of the modules** | **2,053,725** | **3,263,359** | | | | |

Parts of `landmarksNorthFull`: Transfiguration Cathedral 42,768; Podpisnye bookstore 120,096; Chernyshevskaya vestibule 1,768; 13 corridor houses 177,964; **Dom Muruzi 240,557** (one building, 41 % of the module). Against the source module at the same
commit the North's is 3,861 triangles smaller (587,014 there): the missing corridor house w60354394. **The module is 71 % over the plan's 0.34 M, almost entirely Dom Muruzi (the plan evidently did not count it), the bookstore interior and the
corridor houses; "do not improve the models" was respected, so nothing was thinned.** The M4 budget gate and the cold-start measurement of M8 should expect it. Parts of `landmarksKirochnaya`: houses 56,074, crowns 2,733, garden 62,254
(fence 18.2 k, lawn 16.4 k, trees 15.5 k, verges 11.2 k). `landmarksSmolny` flushes two parts, `smolny-cathedral` and `smolny-ensemble` (16 materials, 244 colliders = the dossier's figures). The strip's `npm run check` is identical
module by module (triangles, meshes, instances, materials, colliders, canvas pixels, wires; 25 modules) to the same run on the clean `feat/areas`.

### 8.6 Views

No VIEWS pose moved in M5: `node tools/area.mjs north tools/views-check.mjs` (the real colliders of the new buildings) passes all 12 poses as they were (M3 had moved three: Dom Muruzi, the Smolny Institute and Kirochnaya). Digit1 (444, -1351)
stands 18 m from the vestibule (cover -4.9), Digit2 (22, -1186) 23 m from the Transfiguration Cathedral, Digit3 (-165, -1170) cover -1.5, Digit7 (2335, -1833) cover -10.3 and Digit8 (2461, -1471) cover -1.3 (Smolny), Digit9 (1395, -1180) 14 m
SOUTH of the Suvorov Museum (cover -3.8: it looks at the plain rear and the tower; the mosaics and the fascia face north toward Kirochnaya, a pose decision for later), Digit0 (1225, -1243) in the 32 m fence gap of the campus (cover -1.3).

### 8.7 Known gaps (not integration errors)

* **The Tauride Palace, the Garden and the Paradny quarter are not built**: `landmarksTauride` (the remake) is a later step; `city` still draws them as generic blocks (the data check shows `tauride-palace` 1/1 and `paradny-quarter` 11/11 present). Digit4 / 5 / 6 look at those.
* **The Kapodistrias monument** n1372027612 (796.6, -460.6, h 5.2) is in the North `MONUMENTS` and INSIDE the North play area (it is 56 m beyond the strip's), unclaimed by any group; the Oktyabrsky paved ring ends at z -434.7 and does not cover it. The comment in `landmarksOktyabrsky/groups.js`
  is true for the strip only.
* **Tree hooks of the source are not in `environment/trees.js`** (HOOKS is empty, M6): the ceremonial approaches of Smolny (rectangles x 2320..2440, z -1847..-1820 and x 2400..2520, z -1553..-1533, or two `ZONES.clearDiscs` of r 63 at (2380, -1833.5) and (2460, -1543)), the
  Suvorov rectangle (x 1384..1442, z -1226..-1208: two trees stay inside it, one 2.6 m in front of the west mosaic) and the Kirochnaya campus (`inCampus` is exported from `landmarksKirochnaya/groups.js` for it; two procedural trees stand in the polygon). The door clearings of `PRUNE_SERVICES` work.
* **Kirochnaya**: four of the claimed ways leave the campus polygon (8.3); the two gate stubs across the pavement of Kirochnaya need a look with the GPU (asphalt at y 0.051-0.055 against the pavement slab of `streets`). 24 closed pockets (30 % of the free campus area) are courtyards between the buildings, enclosed by wall colliders only.
* **People and props around the copies**: `ctx.services.landmarksSmolny` is not merged into the shared `ctx.services.landmarks` (verbatim copy), so no pedestrian stops to photograph the cathedral and `props` keeps no area free at its door; the claimed buildings of Smolny, Suvorov and Kirochnaya
  have no pedestrian doors any more (`city` publishes none for them), so no smokers stand at them.
* **Corridor address** Mayakovskogo 4 (w60354394) is outside the North extent (section 8.3).
* **The Church of Simeon and Anna** (w96148838 and its chapel w96148878, at about (-304, -688)) is a landmark of the source (`landmarksBelinsky`, sub-group simeon-anna) that lies INSIDE the North play area and is not built: the generic `city` draws it. Copy it like the others if wanted.
* **Door points of every claimed building are gone**, not only those of Smolny, Suvorov and Kirochnaya: `city` publishes no `entrances` for a claimed building (1052 of 18,886 generic door points, of which Smolny ensemble 400, corridor houses 230, Kirochnaya 180, library 95, Dom Muruzi 44, bookstore 31),
  and only Smolny, Suvorov and Kirochnaya publish replacements (4 in total). `landmarksNorthFull` and `landmarksOktyabrsky` publish none, so trees may stand at their doors and no pedestrian uses them as a spot.
* **The bookstore sits on the North's own border**: the walk-in Podpisnye Izdaniya (w96123542, interior z -249 .. -206) lies inside the 30 m prompt zone of the gate g2 (z = -205), so on the North page walking round inside the shop offers the gate. The strip never meets this (g1 is at z = -405). Fix in `core/gates.js` at M7 (no offer while indoors) or shrink the zone there.
* **The completeness of the claims is proven by id, not by geometry**: `areas-test` fails for a missing or mis-keyed band claim but passes if a claimed sub-group's module does not draw it. A CPU draw audit (per claimed id: owner triangles inside the footprint > 0, generic `city` triangles inside it = 0) was run once by a verifier (green) and is not in the repo.
* **Knock parity**: the landmark modules register 26 knockable records in total, all from `landmarksOktyabrsky` (4 lamps, 20 bollards, 2 city lights), identical in the strip and the North; `landmarksNorthFull`, `landmarksSmolny`, `landmarksSuvorov`, `landmarksKirochnaya`
  and the North's `landmarksD` register none. That is not parity: the captured-cannon fence of the Transfiguration Cathedral in `landmarksNorthFull` (32 granite piers with 96 bronze barrels and 48 catenary chains, merged into one mesh and without colliders) and its 4 benches are not knockable, while the strip's bollards, chains and benches are; the conversion to `ctx.knock` instances (pattern `landmarksF/garden.js:106`) is part of M7. The knock census of the whole page went 4,745 -> 4,792 (the 26 plus the street furniture of `props` that moved round the claimed buildings).
* **The bake is stale** (every `src` file changes the global revision; `npm run revtest` prints the tree against the manifest, `bakecheck` is red on purpose) until the committed bake of M8. The GPU checks of this milestone are still to do: the sign at HERO looking east, the Kirochnaya gate stubs, the look of each module in the browser, the cold start.
* **Pedestrian test**: see "Known leftovers" of section 7 (the jump counter is red on `feat/areas` too).

### 8.8 Tools changed or added in M5

`tools/lib/claims-dump.mjs` and `tools/northfull-sign-probe.mjs` (new), `tools/band-parity.mjs` and `tools/areas-test.mjs` (the landmark assertion of 8.4), `tools/people-test.mjs` (another area builds the landmark modules of its page: the North's `landmarks*`)
and `tools/area-garage-check.mjs` (same). `node tools/area.mjs north tools/wildlife-test.mjs` already built the whole list, `traffic-test` takes `TRAFFIC_BUILDLIST=environment,landmarksNorthFull,...,traffic` (the lanes are the same with and without the modules: 6,785 segments).

## 9. The hook set (milestone M6)

The source repository (102_3d_piter, commit `0568f7af`) hard-codes a handful of behaviours for its north into the engine modules: trees and grass tufts are kept out of the places that a landmark module draws, the Paradny
podium is a 3.3 m deck that `layout.heightAt` knows, the Tauride Garden has its own crowd cap, cars and pedestrians stand on the deck of a landmark service. M6 gives the North these behaviours as a **small set of hooks**:
the engine reads a table of the area module through `src/world/lib/area-tables.js` (section 3.1, rows `HOOKS` and `HEIGHT_PATCHES`) and does exactly what it did before when the key is absent, so **the strip is unchanged**
(`HOOKS = {}`, `HEIGHT_PATCHES = []`; proved by the strip oracles of 9.6). The North builds both in **one place**, `src/areas/north/hooks.js`; `area.js` only calls `makeHooks(MODULES)` and `makeHeightPatches(MODULES)` at its tail.
The inventory of the engine edits (items H01 .. H17, with the source lines) is the scout's report of M6; the ids below refer to it. This section is a skeleton written by the foundation commit (cluster F: 9.1 .. 9.4); the clusters and the
integration step fill in 9.5 .. 9.7 and correct the rest.

### 9.1 The contract (frozen by the foundation commit)

`ctx.buildList` is the list of the modules this build really draws (`main.js`, `tools/check.mjs`); a missing list counts as "not built", as in the source (`ctx.buildList?.includes(name)`). `MODULES` is the page's list in `area.js`.

| Key | Signature | Gating | Read by (item) | Body in | Strip default |
|---|---|---|---|---|---|
| `HEIGHT_PATCHES` | `[{ id: string, box: [x0, x1, z0, z1], at: (x, z) => number \| null }]`: per patch in array order a box reject, then `at()`; the first non-null wins; then the old waterway-bed / `GROUND_Y` line | `MODULES` (layout has no ctx): `[]` unless `landmarksTauride` is listed | `layout.js heightAt` (H01, A) | `hooks/height.js`, geometry `hooks/paradny.js` | `[]`: the old line |
| `HOOKS.treeCleared` | `(ctx) => ((x, z) => boolean) \| null`: soft tree clearing, not applied to forced / mapped OSM trees | `landmarksSmolny` | `environment/trees.js cleared()` (H02, B) | `hooks/keep-out.js` | absent: no extra clearing |
| `HOOKS.treeReject` | `(ctx) => ((x, z) => 'paradny' \| 'campus' \| 'suvorov' \| null) \| null`: hard reject, mapped trees included; the string is the debug reason | `landmarksTauride`, `landmarksKirochnaya`, `landmarksSuvorov` | `environment/trees.js plant()` (H03, B) | `hooks/keep-out.js` | absent |
| `HOOKS.tuftReject` | `(ctx) => ((x, z) => boolean) \| null`: no grass tufts | `landmarksTauride`, `landmarksKirochnaya` | `environment/lawns.js buildTufts()` (H04, B) | `hooks/keep-out.js` | absent |
| `HOOKS.propReject` | `(ctx) => ((cx, cz) => boolean) \| null`: no bench / bin / kiosk stamped | `landmarksTauride` | `props/world.js fits()` (H05, B) | `hooks/keep-out.js` | absent |
| `HOOKS.pedestrianOnly` | `(ctx) => ((way) => boolean) \| null`; `way.rank`, `way.x[]`, `way.z[]` | `landmarksTauride` | `streets.js build()` (H06, B) | `hooks/keep-out.js` | absent: `false` |
| `HOOKS.parkingReject` | `((x, z) => boolean) \| undefined`: a plain function, because `planParking(net)` has no ctx | `MODULES`, when `makeHooks(MODULES)` runs | `streets/parking.js` (H07, B) | `hooks/keep-out.js` (`makeParkingReject`) | absent |
| `HOOKS.inGarden` | `((x, z) => boolean) \| undefined`: the Tauride Garden polygon, for the people crowd cap (the North always gives a function, the foundation stub answers `false`) | none (active in the generic North) | `people.js`, `people/nav.js`, `people/sim.js` (H08, C) | `hooks/people.js` | absent: no cap |
| `HOOKS.deckServices` | `['landmarksTauride']`: names of `ctx.services` whose `deckY(x, z)` is consulted FIRST (cars and pedestrians); a service that is not built is skipped | none (inert while the service is absent) | `drive/handling.js` (H09, A), `people/nav.js surfaceY` (H09, C) | `hooks.js` | absent: the old chain |

Rules of the contract:

* The engine reads the hooks ONLY through `src/world/lib/area-tables.js`, never from `area.js`; `layout.js` gains no export (`tools/layout-golden.mjs` lists every export). The shape of the call site is `const f = HOOKS.key?.(ctx);` once per build,
  then `if (f && f(x, z))` per candidate (the tuft / prop / tree paths are hot), about 3 lines per site plus one import.
* Every `(ctx)` factory is evaluated ONCE per build and returns `null` when none of the modules it serves is in `ctx.buildList`.
* A key that is absent means the engine does exactly what it does today. The files under `src/areas/north/hooks/` are PURE DATA and pure functions: no three.js, no import of `layout.js`, **no import of a data facade** (`tools/areas-test.mjs`
  loads the area module without the import-map remap and would get the strip's facade); the coordinates are static (`environment` is built first, so it cannot read the service of a landmark module).
* The hooks that serve a landmark module are **dormant until the module is in `MODULES`**: after M5 the North builds `landmarksSmolny`, `landmarksSuvorov` and `landmarksKirochnaya`, so the Smolny, Suvorov and campus keep-outs are active
  (they may change trees and tufts only inside their declared regions); the Paradny hooks (`landmarksTauride`) stay dormant until the Tauride remake adds the module.

### 9.2 Files

| File | Owner | Content |
|---|---|---|
| `src/areas/north/hooks.js` | F | `makeHooks(MODULES)`, `makeHeightPatches(MODULES)`; the contract text; `deckServices` |
| `src/areas/north/hooks/paradny.js` | F | the Paradny podium and its nine stair flights: `paradnyDeckY`, `inParadny`, `PARADNY_BOX`, `PARADNY_Y`, `PARADNY_PODIUM` and `PARADNY_STEPS` (literals), `PARADNY_STAIRS / FLIGHTS / LANDINGS` |
| `src/areas/north/hooks/height.js` | A | `makeHeightPatches(MODULES)` (stub in the foundation commit: `[]`) |
| `src/areas/north/hooks/keep-out.js` | B | `treeCleared`, `treeReject`, `tuftReject`, `propReject`, `pedestrianOnly`, `makeParkingReject` (stubs: `null` / `undefined`); the Smolny and Suvorov rectangles, the campus polygon |
| `src/areas/north/hooks/people.js` | C | `inGarden` (stub: `false`) |
| `src/areas/north/area.js` | F | the tail only: `import { makeHooks, makeHeightPatches } from './hooks.js'` and the two exports |

`hooks/paradny.js` is a port of `src/world/landmarksTauride/paradny-surface.js` of the source (commit `0568f7af`): the same expressions and values (the deck answered identically on 641,504 probe points, the flights, landings and box are
equal to the source module's), with the podium ring (14 vertices, bbox x 741 .. 1055, z -1205 .. -873, 74,115 m2) and the STEPS polylines (ways w1266791536, w1266791538, w1303266326 spliced into w1266791538, w1266791542, w1266791545,
w1266791548, w1266791551, w1266791557, w1266791560) embedded as literals; `PARADNY_BOX` is `[741, 1058.51, -1205, -873]`. The literals equal the STEPS records of the North facade, in the order of the data.

### 9.3 Decisions taken

* The Paradny set is delivered DORMANT (the Tauride remake adds `landmarksTauride` to the North `MODULES`).
* The Paradny geometry lives in `src/areas/north/hooks/paradny.js` (a port, not a second copy of `landmarksTauride/paradny-surface.js` in `src/world`, which the remake owns).
* The Kirochnaya `CAMPUS` polygon (8 points) is EMBEDDED in `hooks/keep-out.js` with an equality test against `src/world/landmarksKirochnaya/groups.js`; the area module does not import that file.
* The polygon of `inGarden` is the OSM park r1582734 ring, embedded, with an equality test against the North facade `GREEN` record.
* Cars climb the Paradny podium only through a deck service (the source behaviour: `handling.js` `deckServices`).
* The pond machinery (pond cuts, pond water mask, pond bed, removal of the thinning hack of `environment/trees.js`, garden bridges) belongs to the Tauride remake, not to M6; the pond bed will be a second entry of `HEIGHT_PATCHES`.
* The Liteyny Bridge road stub (section 7) is a known gap, not an M6 hook.

### 9.4 Clusters

* **F, foundation (the first commit, serial)**: the contract, `hooks.js`, `hooks/paradny.js`, the three stubs, the tail of `area.js`, this skeleton.
* **A, terrain and decks**: `layout.js heightAt` (H01), `drive/handling.js` (H09, cars), `hooks/height.js`.
* **B, keep-outs**: `environment/trees.js` (H02, H03), `environment/lawns.js` (H04), `props/world.js` (H05), `streets.js` (H06), `streets/parking.js` (H07), `hooks/keep-out.js`.
* **C, people**: `people.js`, `people/nav.js`, `people/sim.js` (H08, and H09 for pedestrians), `hooks/people.js`, one data line in `area.js` (`ZONES.peopleDensity.garden`).
* **E, oracles and baselines**: `tools/north-hooks-test.mjs`, the golden dumps and signatures of the North before / after.

### 9.5 Per-hook results

To be filled by the clusters and the integration step (call sites, numbers, probes).

### 9.6 Verification

The strip oracles after every engine edit: `node tools/layout-golden.mjs --diff` (identical), `npm run check` (per-module counts identical to the same run on the clean `feat/areas`), `node tools/streets-signature.mjs --diff`
and `node tools/city-signature.mjs --diff` (+0), plus the oracle named by the cluster. The North: `node tools/area.mjs north tools/<tool>.mjs`, `npm run check:north`. To be filled by the integration step.

### 9.7 Known gaps

To be filled by the integration step.
