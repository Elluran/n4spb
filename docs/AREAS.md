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
| `ZONES.peopleDensity` | `{ station, west, mars, garden }` sub-tables of `people.js DENSITY` (`DENSITY.global` stays in the engine); `west.off` / `mars.off: true` switch the scripted places of the strip's west (`people/west.js`, fixed Kazan / Palace Square ... coordinates) and of the castle (`people/mars.js`) off: an area that does not contain them MUST set both (the North does); `garden: { factor, maxPeople }` (M6, section 9) is the density factor and the head count cap inside `HOOKS.inGarden` (the North: the Tauride Garden, `{ 0.22, 60 }`) | `people.js` (`DENSITY`), `people/nav.js`, `people/sim.js`, `people/vignettes.js` | no station zone; `west { scale 1, platforms 1 }` (the scripted places are built at the strip's coordinates!); `mars { scale 1, zones [] }`; `garden { factor 1, maxPeople Infinity }` |
| `ZONES.peopleCorridor`, `ZONES.peopleHot` | `[[u, weight], ...]` Nevsky corridor along the grid axis; `[x, z, amplitude, sigma] \| { u, d, a, s }` hot spots (`{ u, d }` = station frame) of the zone weight field | `people/zones.js` | no corridor; no hot spots (base weight only) |
| `ZONES.tramLines` | `[{ refs, a: [x, z], b: [x, z], headway }]` (`TRAM_LINES`) terminals are track ends in the data; a line whose terminals are missing is skipped | `traffic/trams.js` | no trams |
| `ZONES.clearDiscs` | `[{ x, z, r }]` discs kept free of trunks, hedges and beds | `environment/field.js` | none |
| `ZONES.farCentres` | `[{ x, z, bias }]` old dense stone city beyond the area: far blocks within `distance + bias` of one are as dense as near the area's centre | `environment/far.js` | the area's `SQUARE` only |
| `GARAGE.poses`, `GARAGE.spawn` | `{ coupe, truck, lada, roadster: { x, z, yaw (rad) } }`; `{ x, z, yaw }` | `drive/cars/index.js` (`PARKING`), `drive.js` (`SPAWN`) | a car without a pose is not built; no pose at all: `drive.js` returns early (no `ctx.drive`; its callers test it) |
| `PRUNE_SERVICES` | `['city', 'landmarksA', ...]` services whose `entrances` clear the trees from the doors | `environment.js` | no door clearings |
| `HOOKS`, `HEIGHT_PATCHES` | `{ key: factory, function or list }` and `[{ id, box, at }]`: the hook set of M6, contract in section 9 (the North builds them in `src/areas/north/hooks.js`; the strip exports `{}` and `[]`); `lib/area-tables.js` validates both (a malformed value is dropped with a warning that names it, 9.1) | `layout.js`, `drive/handling.js`, `environment/trees.js`, `environment/lawns.js`, `props/world.js`, `streets.js`, `streets/parking.js`, `people/nav.js` (section 9.1 names the key each one reads) | empty: every call site is a no-op |

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
node tools/layout-golden.mjs --diff       every export of layout.js and the data facade equals tools/golden/layout-strip.json (the area seam must not change the strip); node tools/area.mjs north tools/layout-golden.mjs --diff the same for tools/golden/layout-north.json (M6 moves neither)
node tools/area.mjs north tools/north-hooks-test.mjs   the contract of the hook set of M6 (section 9): strip {} / [], the eight keys, gating by buildList / MODULES, fixed probes and grids against independent oracles, Paradny literals vs the North facade STEPS, CAMPUS vs landmarksKirochnaya/groups.js, garden ring vs GREEN r1582734, the Paradny golden (`tools/golden/paradny-deck.json`), the height patch, purity, the validation of malformed tables (`lib/area-tables.js`), the refusal of `layout-golden` for a wrong world, text checks of the engine files (npm run hooks, also in npm run areas)
node tools/area.mjs north tools/north-height-test.mjs  the height patch, the 8 stairs, the real Player on them, the deck services of cars and walkers, the real module's service compared on a lattice (npm run hooks:height; needs three.js)
node tools/area.mjs north tools/north-keepout-test.mjs [--parallel] [--footprints]   the keep-out hooks: factories, regions, the engine with the hooks off / real / Paradny forced on, the regions against the M5 modules (npm run hooks:keepout; --only pure needs no three.js)
node tools/north-people-hooks-test.mjs [--scene]   the garden ring and cap row, the cap in a real North scene (npm run hooks:people)
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
* `.github/workflows/pages.yml`: on a pull request only the CPU `verify` job runs (no `npm ci`: bake-manifest-check, gen-area-html --check, layout-test and landmarks-groups-check for every real area, areas-test, the M6 steps (both layout goldens, `hooks-syntax-check` (`node --check` of the engine files M6 edits), north-hooks-test, north-keepout-test --only pure, north-people-hooks-test: section 9.2), handoff-test, gates-test,
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
  Dom Muruzi (-154 -> -165, it stood on the carriageway), the Smolny Institute and Kirochnaya by a few metres) and `layout-test`. (T1 of the Tauride remake moved five more: Digit0, 3, 4, 5, 6, section 8.6.)
* **Tables**: `WATER` has no plugs / bridge zones / shades / clip lines, `farSources ['neva-up']`, `farCenter [1100, -1100]`; `ZONES` has pigeon / sparrow sites at Chernyshevskaya (461, -1350), the Tauride gate
  (1226, -1268), the Transfiguration Cathedral and Smolny, crow haunts, crowds and the four hot spots, **`peopleDensity.west.off` and `.mars.off`** (the scripted places of the strip's west and of the castle
  stand at fixed strip coordinates: without the switch the North built 325 of its 962 people at Kazan, the Palace Square and the castle, 1.2-4 km outside its extent: 637 remain); **M6 added `peopleDensity.garden { factor 0.22, maxPeople 60 }`**, the crowd cap of the Tauride Garden (`HOOKS.inGarden`; section 9.3: without it the park held 333 of the 638 visible people); `GARAGE`: the four cars stand in the courtyard north of the
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
sources were CRLF, so a raw `cmp` differs and a compare with the CR removed is byte-identical). The strip is untouched except for the landmarksD sub-group refactor and part gating of 8.1 (`src/world/landmarksD/groups.js`, `landmarksD.js`, `landmarksD/fences.js`, all hash-proven inert for the strip) and the four new rows of the generated owns table of 8.2. The Tauride Palace / Garden and the Paradny quarter were NOT in this milestone (8.7); **phase T1 of the Tauride remake added the Palace and the Paradny quarter as the module `landmarksTauride` (8.9)**, the garden is still the generic North's until T2-T6 (docs/TAURIDE-REMAKE.md).

### 8.1 What was copied from where

| North module | claims (sub-group keys) | files (source path at `0568f7af` = same path here) | difference from the source |
|---|---|---|---|
| `landmarksNorthFull` | `north-chernyshevskaya` (the metro vestibule w22999175, with the station sign), `north-preobrazhensky` (the Transfiguration Cathedral r5802451), `north-muruzi` (Dom Muruzi r946930), `north-podpisnye` (the bookstore w96123542, walk-in), `north-corridor-houses` (13 of the 14 addresses, 13 ids) | `src/world/landmarksNorth.js` -> `landmarksNorthFull.js`, `landmarksNorth/{bookstore,muruzi,groups}.js` -> `landmarksNorthFull/` | 7-line header, the 3 import paths, `root.name`, the services key; the strip keeps its own trimmed `landmarksNorth.js` (bookstore + the 5 corridor addresses of the strip data), and the functions `corridor()` and `bookstore()` are the same text in both |
| `landmarksSmolny` | `north-smolny-cathedral` (r2864743 + 4 parts), `north-smolny-ensemble` (r2133719, the convent / Institute) | `landmarksSmolny.js`, `landmarksSmolny/{cathedral,groups}.js` | one provenance line |
| `landmarksSuvorov` | `north-suvorov-museum` (7 ids: w30198549 and the six w2329187xx parts) | `landmarksSuvorov.js`, `landmarksSuvorov/groups.js` | one provenance line |
| `landmarksKirochnaya` | `kirochnaya-clinical-institute` (20 building ids + 14 service / footway ways of the garden campus) | `landmarksKirochnaya.js`, `landmarksKirochnaya/{groups,landscape}.js` | one provenance line |
| `landmarksTauride` (T1, not M5: 8.9) | `tauride-palace` (r3801092), `paradny-quarter` (11 buildings + 2 fountain waters) | `landmarksTauride.js`, `landmarksTauride/{palace-parts,paradny-buildings,paradny-courts,paradny-floor,paradny-roofs,paradny-surface}.js` | the six parts are verbatim (one provenance line each); the entry drops the garden import and call and publishes the Paradny deck service; `groups.js` is rewritten as literal data (no import of `terrain.js`, no garden sub-group); the old `garden.js` and `terrain.js` are NOT ported |
| `landmarksD` (the strip's module) | `library` only (the National Library r3801087, the Mariinsky block w60353337), both in the 200 m band | `landmarksD/groups.js` is NEW: `LIBRARY_GROUP` moved out of `src/world/area.js` | the strip's GROUPS JSON is byte-identical before / after; `landmarksD.js` and `landmarksD/fences.js` skip a part whose sub-group the area does not claim (inert in the strip: per-part triangles identical) |
| `landmarksOktyabrsky` (the strip's module) | `oktyabrsky-hall` (w30324279 + the part w929214560 + 4 OSM objects), in the band | unchanged | none; `environment/claims.js` reads its paved rings only when it is in the build list, hence it is in the North list |

Shared libraries the copies import already existed here and are identical to the source: `landmarksD/{common,house,kit,parts}.js`, `landmarksK/geo.js`. The research dossiers (`docs/research/north-*.md`) live in the
source repository, not here.

### 8.2 The module list and its order

```
environment, landmarksNorthFull, landmarksSmolny, landmarksSuvorov, landmarksKirochnaya, landmarksTauride, streets, city, landmarksD, landmarksOktyabrsky, props, traffic, people, wildlife, drive
```

(`landmarksTauride`, 8.9, was added by T1 of the Tauride remake; the list of M5 had the other 14 names.) `landmarksKirochnaya` precedes `streets` because the campus claims 14 service ways that `streets` must skip (`landmarksTauride` precedes it for the same reason: it claims 12 buildings and two fountain waters that `city` / `environment` must skip), and `landmarksNorthFull` takes the strip's place (`landmarksNorth` is second in `src/main.js`, too). None of the new
modules reads a service of an earlier one (only `landmarksOktyabrsky` needs `streets` and `labels`), so the order matters only for the claims. `landmarksD` and `landmarksOktyabrsky` stand after `city` as in the strip.
`PRUNE_SERVICES` is now `city, landmarksSmolny, landmarksSuvorov, landmarksKirochnaya, landmarksD`: the services that publish an `entrances` array (Smolny (2425, -1833) clearance 12, Suvorov (1412.9, -1225.2) clearance 4,
Kirochnaya (1230, -1244) and (1312, -1238) clearance 5; `landmarksD` publishes an empty array in the North, as in the strip's list). `landmarksNorthFull` and `landmarksOktyabrsky` publish none and are not listed (neither is in the strip's table); nor is `landmarksTauride` (T1: the Palace and the Paradny quarter have no door points; the source's `entrances` of that module were the 11 garden gates, which the later phases publish).
`LABELS` names the loading words of the six modules. **`TEST.kept` is gone on purpose**: an empty list means "verify nothing" (the default is every key of `GROUPS`), so `landmarks-groups-check` now verifies all six owners in the North.
`src/world/lib/owns-table.js` (generated) has one new row per module: `landmarksNorthFull`, `landmarksSmolny`, `landmarksSuvorov`, `landmarksKirochnaya` (and, since T1, `landmarksTauride`); the table is keyed by module NAME, so the strip's `landmarksNorth` and the
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
| `landmarksTauride` / `tauride-palace` (T1) | r3801092 | 1 | 1 |
| `landmarksTauride` / `paradny-quarter` (T1) | w102153008, w102153013, w145419644, r1452259, r1967088, r3304715, r3304716, w102153007, w134638076, w134638078, w134638079 + the two fountain WATER ids w1501496505 / w1501496506 | 11 | 11 + 2 |

(T1 does NOT claim the garden: its ways, bridges, park, woods and furniture are claimed by T3-T6; the source's third sub-group `tauride-garden-bridges` is left out of `landmarksTauride/groups.js`.)

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
| landmarksTauride (T1) | | **621,713** | 52 | 1,270 | 234 (the fountain jets) | measured at T1; BUDGET 700 k; source parts: Paradny buildings 551,325 + courts 29,075 + palace 22,853 = 603,253, plus the instanced jets 18,460; build 0.8-1.0 s |
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
**After M6** the `environment` row reads 318,314 triangles, 9,424 colliders and 13,864 instances (-30 / -15 / -15: 15 tree instances fewer, the keep-outs of section 9; the snapshot of the tree list counts -19) and the `people` row 71 meshes instead of 72 (the garden crowd cap of 9.3 changes the starting composition); no other row moved.

**After T1** (`landmarksTauride` in the list, `npm run check:north`, 15 modules; the table above shows the M5 figures plus the new row, here are the T1 deltas against the M6 state `4eb2a0e`): sum of the modules **3,263,329 -> 3,866,864** (+603,535 = +621,713 of the module, -16,382 `city`, -1,216 `streets`, -496 `props`, -84 `environment`).
`city` 803,387 -> 787,005 triangles, colliders 21,975 -> 21,620 (the palace and the 11 Paradny buildings are claimed: the generic blocks are gone, 355 colliders fewer); `streets` 589,819 -> 588,603 (56 service ways in the podium became pedestrian-only: no lanes, no parking pockets, lanes 10,499 -> 10,289, lamps unchanged at 1,042; the streets signature 590,243 -> 589,027);
`props` 214,738 -> 214,242 and 578 -> 575 meshes (the one random stream of the props, 9.5); `environment` 318,314 -> 318,230 triangles, 13,864 -> 13,858 instances, 9,424 -> 9,422 colliders (the Paradny tree keep-out and the claims). `landmarksNorthFull`, `landmarksSmolny`, `landmarksSuvorov`, `landmarksKirochnaya`, `landmarksD`, `landmarksOktyabrsky`,
`traffic`, `people`, `wildlife`, `drive` did not move except for the service lists. The strip's `npm run check` is identical in all 25 modules (triangles, meshes, instances, materials, canvas pixels, colliders, wires, update functions, services, bounds).

### 8.6 Views

No VIEWS pose moved in M5: `node tools/area.mjs north tools/views-check.mjs` (the real colliders of the new buildings) passes all 12 poses as they were (M3 had moved three: Dom Muruzi, the Smolny Institute and Kirochnaya). Digit1 (444, -1351)
stands 18 m from the vestibule (cover -4.9), Digit2 (22, -1186) 23 m from the Transfiguration Cathedral, Digit3 (-165, -1170) cover -1.5, Digit7 (2335, -1833) cover -10.3 and Digit8 (2461, -1471) cover -1.3 (Smolny), Digit9 (1395, -1180) 14 m
SOUTH of the Suvorov Museum (cover -3.8: it looks at the plain rear and the tower; the mosaics and the fascia face north toward Kirochnaya, a pose decision for later), Digit0 (1225, -1243) in the 32 m fence gap of the campus (cover -1.3).

**After T1** five poses moved (`node tools/area.mjs north tools/views-check.mjs`: 12 poses, 0 failing; `layout-test` OK; `TEST.viewKeys` unchanged; details and the alternatives in 8.9): Digit5 (1368, -1471, yaw -4, pitch 2) and Digit6 (1379, -1800, yaw 180, pitch 8) are the corrected poses of the data pack (docs/TAURIDE-REMAKE.md section 8: the old ones stood on a bridge deck and in the lake),
Digit4 (900, -852, yaw 0, pitch 16) left the Paradny podium (the old pose (915, -1010) is a 3.3 m deck once the height patch is active; views-check allows ground -0.5 .. 1.5), Digit0 (1224, -1266, yaw -173, pitch 10, across Kirochnaya from the house church, 28 m) and Digit3 (-167, -1157, yaw -107, pitch 20) replace the two close-ups the M5 GPU QA found (a wall 5 m ahead; a signal pole 1.3 m ahead).

### 8.7 Known gaps (not integration errors)

* **The Tauride Garden is not rewritten yet; the Palace and the Paradny quarter are built since T1 (8.9)**: `landmarksTauride` draws the palace (r3801092) and the 11 buildings of the Paradny quarter; the garden is still what the generic North makes of the park polygon (lawn, trees at full density, maroon ribbons for the alleys, no water, no fence): T2-T6 of docs/TAURIDE-REMAKE.md replace it. The Paradny hooks of M6 are ACTIVE since T1 (section 9).
* **The Kapodistrias monument** n1372027612 (796.6, -460.6, h 5.2) is in the North `MONUMENTS` and INSIDE the North play area (it is 56 m beyond the strip's), unclaimed by any group; the Oktyabrsky paved ring ends at z -434.7 and does not cover it. The comment in `landmarksOktyabrsky/groups.js`
  is true for the strip only.
* **Tree hooks of the source: done in M6** (section 9; they were missing here and `HOOKS` was empty): the ceremonial approaches of Smolny (rectangles x 2320..2440, z -1847..-1820 and x 2400..2520, z -1553..-1533), the
  Suvorov rectangle (x 1384..1442, z -1226..-1208: two trees stood inside it, one 2.6 m in front of the west mosaic) and the Kirochnaya campus (the 8-point `CAMPUS` is embedded in `hooks/keep-out.js`; two procedural trees stood in the polygon) are kept free of
  trees (and the campus of grass tufts) by `HOOKS.treeCleared` / `treeReject` / `tuftReject`: zero trees remain in the three regions (9.5). The door clearings of `PRUNE_SERVICES` work.
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

### 8.9 T1 of the Tauride remake: the Palace and the Paradny quarter

Phase T1 of docs/TAURIDE-REMAKE.md (its log, section 12, has the commit list and the numbers; this section is the part that belongs to the area docs). Branch `tb-t1`, no engine file touched.

* **The module** `landmarksTauride` = `src/world/landmarksTauride.js` + `landmarksTauride/*.js` (8.1). `build(ctx)` makes three parts: `tauride-palace` (the six-column portico, the drum and the dome, the wings: `PALACE_PARTS`), `paradny-quarter` (the 11 buildings), `paradny-courts` (the 3.3 m podium floor, its walls with openings at the mapped stairs, eight stairs with their handrails, the landings, the two black-granite fountain basins with 13 jets each, beds, benches, lanterns).
  It publishes `ctx.services.landmarksTauride = { paradny: { deckY, podium, fountains, jets }, deckY, triangles }`: `deckY(x, z)` is the Paradny deck (3.3 m on the podium, the ramps of the eight stairs, `null` elsewhere), asked FIRST by cars (`drive/handling.js` through `HOOKS.deckServices`) and by pedestrians (`people/nav.js surfaceY`); **no `entrances`** (the palace and the quarter have no door points; the source's `entrances` were the garden gates, so the module is not in `PRUNE_SERVICES`).
  Numbers (`npm run check:north`, 8.5): 621,713 triangles in 52 meshes, 234 instances (the jets), 1,270 colliders, build 0.8-1.0 s; BUDGET 700 k.
* **What the module switches on** (the M6 hooks of section 9 are ACTIVE from T1 on): `HEIGHT_PATCHES = [paradny]` (box [741, 1058.51, -1205, -873]), the tree / tuft / prop keep-outs, the pedestrian-only rule (56 service ways), the parking reject, the deck service. Measured on the page's real list, env snapshot (`tools/north-env-snapshot.mjs`; new baseline `D:/git2/n4spb-work/tauride/after/env-snapshot-north.json`):

  | | trees | tuft cells | props | parked slots / bay lines | pedestrian-only ways | lanes | lamps | podium ring: trees / props / tuft probes |
  |---|---:|---:|---:|---|---:|---:|---:|---|
  | before T1 (`feat/areas` 4eb2a0e) | 10,884 | 2,790 | 1,854 | 2,448 / 1,161 | 13 | 10,499 | 1,042 | 8 / 6 / 267 |
  | the M6 what-if (hooks only, module not built, 9.5) | 10,877 | 2,747 | 1,860 | 2,448 / 1,161 | 69 | 10,289 | 1,042 | 0 / 1 / 0 |
  | T1, claims only (module listed, every hook deleted) | 10,914 (the M5 keep-outs are deleted too) | 2,810 | 1,872 | 2,448 / 1,161 | 13 | 10,499 | 1,042 | 3 / 1 / 267 |
  | **T1, real** | **10,893** | **2,746** | **1,872** | **2,447 / 1,159** | **69** | **10,289** | **1,042** | **0 / 1 / 0** |

  Everything inside the podium and on the streets equals the M6 what-if (the podium holds no tree and no tuft, the one prop left is a mapped bench, 56 ways lose their lanes, 210 lanes fewer, one slot and two bay lines fewer): `north-env-snapshot --diff <claims-only> <real> --allow all --expect-empty paradny,campus,suvorov` = RESULT OK (1,175 changes, all inside the allowed regions or their cascade).
  **What the what-if could not show is the CLAIM effect**: a module in the build list claims its buildings (`lib/claims.js`), so `city` stops drawing the palace and the 11 buildings (generic city 803,387 -> 787,005 triangles) and `environment` stops planting their courtyards: 374 -> 366 courtyard trees, 358 -> 356 yard trees, and the tree streams of the woods / props re-roll (470 tree differences outside every keep-out region, clustered round the palace at x 1100-1500, z -1800 .. -1400; props 1,854 -> 1,872 although the hook changes no prop any more: the claims already take 5 of the 6 props of the snapshot out of the podium: 4 of 5 in the lists of `north-keepout-test`, which is why its prop check proves the hook with a fifth variant, `fake` = `off0` + `propReject` alone, no claims: 5 props in the podium -> 1, and a dead `propReject(cx, cz)` call site in `props/world.js` fails the check). The re-rolls are the source's behaviour (one random stream per GREEN polygon / courtyard, one stream for all props), not a hook leaking: `--allow` only passes them as "(cascade)" when the module is built with its hooks, and the strict diff against the M6 baseline is therefore FAIL by design from T1 on (re-take the baseline: the one above).
* **The strip is unchanged** (all oracles of 9.6 re-run at the T1 head): `layout-golden --diff` identical, `npm run check` identical in 25 modules, `streets-signature` / `city-signature` / `environment-regress` +0, `north-env-snapshot` strip identical (6,206 trees, 2,866 tuft cells, 2,738 props, 3,184 slots, 5 pedestrian-only ways, 12,860 lanes, 1,407 lamps); `owns-table.js` gains one row that only counts where a page lists the module.
* **The two copies of the deck** (the module's `paradny-surface.js` and `src/areas/north/hooks/paradny.js`) are held equal by the `paradny twin` group of `tools/north-hooks-test.mjs` (CI, needs no three.js): the exports, the golden lattice `tools/golden/paradny-deck.json` (1286 x 1344 points, hash 4bda374859cd45b9) and 498,703 direct probes (a 0.5 m lattice over the box + 3 m, 60,000 random points, NaN and the edges) answer bit for bit; mutants (landing step +.015 -> +.016, stair width 1.8 -> 1.9, the 0.9 m cut -> 1.0) each fail 2-3 checks.
* **The North layout golden** was regenerated (`tools/golden/layout-north.json`): the new sub-groups, the five moved VIEWS poses, and the probe sets (+2 points: the anchors of the two new sub-groups; heightAt at (944, -1038) is the 3.3 m deck). `heightAt` against the old line (waterway bed / 0) on a 2 m lattice over the whole North + 150 m (1,817,508 points): 18,570 points differ, all inside the patch box and all equal to `paradnyDeckY`, none outside.
* **The tripwires of M6 that said "no landmarksTauride in MODULES" were flipped on purpose** (never deleted): `north-hooks-test` (the parkingReject / HEIGHT_PATCHES / heightAt checks no longer accept both states; a new `dormant` child proves the old behaviour with the list minus the module; the what-if baseline is the old line), `north-keepout-test` (variants `off0` / `dormant` = the list without the module, `off` / `real` = the page's list, so that the claims are never mistaken for a hook, and `fake` = `off0` + `propReject` alone, the only way to see that hook while the claims already clear the podium), `north-people-hooks-test` (the generic-North check strips the module from a copy of `area.js`), `north-height-test` (the patch must be listed and no pose of `VIEWS` may stand on the deck).
* **Views**: `Digit4` (915, -1010) stood ON the podium: with the patch the ground is 3.3 m and `tools/views-check.mjs` accepts -0.5 .. 1.5 only. The podium is the better vantage (the ring buildings are visible only from inside: from the street the quarter shows 8-34 % of its facade samples), so the lead may prefer to keep a podium pose and let `views-check` accept the height of an active patch; the pose was moved because `views-check.mjs` was not part of T1.
  Candidates scored with line-of-sight checks (scratch tools, buildings by height, the podium wall, tree crowns, poles / signals / lamps / plates in the view cone): Digit4 (900, -852) yaw 0: the two south blocks r3304715 / r3304716 fully visible (40 of 40 facade samples) at 36-80 m, nothing in the way along the central axis (the first building ahead is 216 m away); alternatives (1052, -892) yaw 37 (the SE corner, 34 %), (906, -852) yaw 19, (1112, -1100) yaw 90 across the east avenue (the 13 m offices hide the ring behind). Digit0 (1224, -1266) yaw -173: the street cross-section there is 20 m wide (z -1264.3 .. -1244.3, both pavements: views-check refuses the pavement), so a pose 15-25 m back is impossible; this is the nearest valid one on the garden side (28 m, 74 % of the campus frontage samples visible against 25 % at the old pose, nothing in the cone against four wall colliders 7-8 m away), axial on the house church; alternatives (1220, -1266) yaw -147 and (1244, -1266) yaw 142 (80 %, oblique), (1258, -1266) yaw 158 (74 %, 36 m). It lies 1.8 m south of the south gate line of the garden (1226, -1267.8): the later phases put the fence there, so re-check it with the fence (the HUD shows "Tauride Garden" there, not "Kirochnaya"). Digit3 (-167, -1157) yaw -107: Dom Muruzi fully visible at 32 m, no pole or signal within 14 m in the cone; alternatives (-165, -1183) yaw -124, (-181, -1169) yaw -129 (both with 44-47 m of road in front), the old pose scores a pole at 1.3 m (34 degrees right) and a signal at 9 m.
* **Known behaviour of the source, not changed (the six files are verbatim)**: the podium is a wall from the street (0 of 197 walkers and 0 of 104 cars got onto it in 8 s / 7 s runs toward the edge, except through the stairs) but not from above: the parapet colliders are boxes 0 .. 3.3 m and `core/physics.js` skips a box whose top is within `STEP_HEIGHT` of the feet, so a walker or a car on the deck passes over the edge (208 of 240 walker runs and 104 of 119 car runs ended at street level, a 3.3 m drop; the source module in the same harness: 214 of 240 walkers). 13 of those cars were wedged against the podium wall below (they could not reverse within 3 s). A collider top of `Y + 1.0` in `paradny-courts.js` (a railing: invisible, no change of the meshes) would stop both; it is a deviation from the verbatim copy and left to the lead. AI traffic never reaches the podium: the 12 lanes that have a point in the polygon (six service ways, the three straddling ways of the M6 lens among them) are not in the traffic sim at all (service lanes carry no AI cars), and 5 cameras x 960 s of the regional sim (`createSim`, as the game runs it) put 0 vehicles inside the polygon. Pedestrians: 6 minutes with the player on the podium, nobody inside the polygon (the nav lattice does not know the podium; T7). `node tools/tauride/paradny-walk.mjs`: 8 stairs, 0 failing.

### 8.10 T2 of the Tauride remake: the land relief, the terrain mesh, the car keep-out, the claims of the garden

Phase T2 of docs/TAURIDE-REMAKE.md (its log, section 12, has the commits, the numbers and the commands; section 7.1 the relief table). Branch `tb-t2`. LAND relief only: the pond beds, the bank slopes and the water come in T4.

* **The relief** is authored data (`src/world/landmarksTauride/data/relief.js`: 9 elliptical features, each with a provenance `osm` | `design` and its evidence; ALL heights are design values) evaluated by the PURE function `gardenHeight(x, z)` (`landmarksTauride/height.js`: bbox and an 8 m occupancy grid first, no allocation, deterministic, `null` where no hill lifts the ground). `hooks/height.js` lists it as the second patch (`garden`, after `paradny`); `layout.heightAt` therefore answers the hills inside the garden box and the old line everywhere else (over the whole North + 150 m on a 2 m lattice: 21,827 points differ from the old line, all inside the Paradny box or the garden box and all equal to their patch).
* **The terrain mesh** (`landmarksTauride/terrain-mesh.js`): an adaptive, crack-free, 2:1-balanced quadtree over `gardenHeight` (<= 5 cm, leaves of 1-16 m, no triangle where the ground is flat), one mesh per 64 m chunk merged down to at most 16 draws, `noBatch` + `registerLOD(Infinity)` like the chunks of `environment/ground.js`, a placeholder vertex-coloured toon grass (T3 paints the ground), NO colliders. It adds about 5.5 k triangles and 16 meshes to the module.
* **The claims**: the module's third sub-group `tauride-garden` (`groups.js`, literal ids): the park r1582734, the 23 woods of `GARDEN_GREEN`, the 120 garden ways (bridge ways included), the 132 benches and 167 bins. `props/osm.js` skips a claimed bench / waste basket (`L.isClaimed(f.id)`, one line); 0 of the strip's 561 claimed ids is a FURNITURE node (`tools/tauride/strip-furniture-claims.mjs`), so the strip is unchanged. Until T3 / T5 / T6 the generic North draws no tree, grass tuft, hedge, path ribbon or OSM bench in the garden: it is bare terrain (measured, `env-snapshot`: trees 10,893 -> 7,121, tuft probes of the garden 3,160 -> 0, props 1,872 -> 1,560; nothing generic stands on a hill: 0 trees, 0 props, 0 tuft probes).
* **Cars** (`HOOKS.carKeepOut`, 9.1): `drive/handling.js solidBlocked` refuses the garden polygon; with the real `createHandling().blocked`, 0 m of the 2,158 m outline can be driven across (2,018 m without the hook), the service lane is not an exception.
* **Pedestrians** (`people/nav.js surfaceY`, 4 lines behind `HEIGHT_PATCHES.length`): where the terrain is lifted a walker stands ON it (`heightAt + 0.02`), uphill and downhill; before, nodes above feet + 2.45 m sank to street level (-4.4 m on the north hill). The strip has no patch, so the branch never runs there.
* **Proof that the strip is untouched**: `layout-golden --diff` (strip) identical, the strip's `npm run check` identical in all 25 modules, the strip streets / city / environment signatures identical, `drive-edge-test` and the garage tests as before (T2 log).
* Files: `src/world/landmarksTauride/{height.js, terrain-mesh.js, data/relief.js}`, `groups.js`, `src/world/landmarksTauride.js` (the entry builds the terrain and publishes `terrain: { heightAt, triangles, draws }`), `hooks/{height,keep-out}.js`, `hooks.js`, `lib/area-tables.js` (the known key `carKeepOut`), `drive/handling.js`, `props/osm.js`, `people/nav.js`, the golden `tools/golden/layout-north.json`; tools `tauride-relief-plan.mjs`, `tauride/{relief-check, people-probe, heightat-bench, strip-furniture-claims}.mjs`, `tauride/lib/relief-rules.mjs`; tests: `north-hooks-test` (200 checks), `north-height-test`, `tauride-height-test --model north --build landmarksTauride --assert-cars` (52 relief checks and 11 mutants).

## 9. The hook set (milestone M6)

The source repository (102_3d_piter, commit `0568f7af`) hard-codes a handful of behaviours for its north into the engine modules: trees and grass tufts are kept out of the places that a landmark module draws, the Paradny
podium is a 3.3 m deck that `layout.heightAt` knows, the Tauride Garden has its own crowd cap, cars and pedestrians stand on the deck of a landmark service. M6 gives the North these behaviours as a **small set of hooks**:
the engine reads a table of the area module through `src/world/lib/area-tables.js` (section 3.1, rows `HOOKS` and `HEIGHT_PATCHES`) and does exactly what it did before when the key is absent, so **the strip is unchanged**
(`HOOKS = {}`, `HEIGHT_PATCHES = []`; proved by the strip oracles of 9.6). The North builds both in **one place**, `src/areas/north/hooks.js`; `area.js` only calls `makeHooks(MODULES)` and `makeHeightPatches(MODULES)` at its tail.
The engine edit is 10 files (`layout.js`, `drive/handling.js`, `environment/trees.js`, `environment/lawns.js`, `props/world.js`, `streets.js`, `streets/parking.js`, `people.js`, `people/nav.js`, `people/sim.js`): 57 lines added,
13 replaced, comments included (plus the reader `lib/area-tables.js`, which validates both tables, 9.1); the rest is pure data and pure functions under `src/areas/north/`. The ids H01 .. H16 below are the items of the M6 inventory (one per North-specific engine edit of the source, traced through
its git history; the inventory itself is a working paper outside the repository, and the tables of 9.1 and 9.5 restate every item this section needs).

**What is ACTIVE in the generic North after M6** (it changes what the North builds or does today):

* the **Smolny, Suvorov and Kirochnaya-campus keep-outs**: the modules `landmarksSmolny`, `landmarksSuvorov` and `landmarksKirochnaya` are in the North's `MODULES` since M5, so the trees (and, in the campus, the grass tufts) are kept out of
  their regions (9.5): 19 trees fewer in the tree list (15 instances in `npm run check:north`), nothing else moves;
* the **Tauride Garden crowd cap** (`ZONES.peopleDensity.garden { factor 0.22, maxPeople 60 }`, `HOOKS.inGarden`): **the ONE hook of M6 that changes the generic North's crowd, and the only one that does not wait for a landmark
  module** (decision and evidence in 9.3). The garden is a plain OSM park in the generic North; without the cap it held 333 of the 638 visible people on average.

**What was DORMANT until the Tauride remake added `'landmarksTauride'` to `MODULES` (milestone M6 delivered it dormant; it is ACTIVE since T1, 8.9, and the words "dormant" in the rest of this section describe the M6 state)**: the whole Paradny set (the height patch, the tree / tuft / prop keep-out, the pedestrian-only ways, the parking reject) and the deck service
(`HOOKS.deckServices` lists the service; it is inert while the service is absent, and the module publishes it now). How the remake switched them on: 9.5; what it changed, measured: 8.9. A page without the module in its list is the old dormant North (the `dormant` child of `north-hooks-test`, the `dormant` variant of `north-keepout-test`).

### 9.1 The contract (frozen by the foundation commit)

`ctx.buildList` is the list of the modules this build really draws (`main.js`, `tools/check.mjs`); a missing list counts as "not built", as in the source (`ctx.buildList?.includes(name)`). `MODULES` is the page's list in `area.js`.

| Key | Signature | Gating | Read by (item) | Body in | Strip default |
|---|---|---|---|---|---|
| `HEIGHT_PATCHES` | `[{ id: string, box: [x0, x1, z0, z1], at: (x, z) => number \| null }]`: per patch in array order a box reject (edges inclusive), then `at()`; the first non-null wins (0 is an answer); then the old waterway-bed / `GROUND_Y` line. Read at CALL time | `MODULES` (layout has no ctx): `[]` unless `landmarksTauride` is listed, then `[paradny, garden]` (T2: the garden relief, `landmarksTauride/height.js`, box `RELIEF_BOX` = the garden bbox, `null` where no hill lifts the ground) | `layout.js heightAt` (H01) | `hooks/height.js`, geometry `hooks/paradny.js` | `[]`: the old line |
| `HOOKS.treeCleared` | `(ctx) => ((x, z) => boolean) \| null`: soft tree clearing (`cleared()` runs only under `!o.force` and no caller of `placeTrees` forces, so mapped OSM trees are cleared too: none lies in the rectangles) | `landmarksSmolny` (ACTIVE) | `environment/trees.js cleared()` (H02) | `hooks/keep-out.js` | absent: no extra clearing |
| `HOOKS.treeReject` | `(ctx) => ((x, z) => 'paradny' \| 'campus' \| 'suvorov' \| null) \| null`: hard reject, mapped trees included; the string is the `ENV_DEBUG` reason (`green:suvorov`, `yard:campus` ...); first match in that order | `landmarksTauride` (dormant), `landmarksKirochnaya` and `landmarksSuvorov` (ACTIVE) | `environment/trees.js plant()` (H03) | `hooks/keep-out.js` | absent |
| `HOOKS.tuftReject` | `(ctx) => ((x, z) => boolean) \| null`: no grass tufts | `landmarksTauride` (dormant), `landmarksKirochnaya` (ACTIVE) | `environment/lawns.js buildTufts()` (H04) | `hooks/keep-out.js` | absent |
| `HOOKS.propReject` | `(ctx) => ((cx, cz) => boolean) \| null`: no bench / bin / kiosk stamped | `landmarksTauride` (dormant) | `props/world.js fits()` (H05) | `hooks/keep-out.js` | absent |
| `HOOKS.pedestrianOnly` | `(ctx) => ((way) => boolean) \| null`; `way.rank`, `way.x[]`, `way.z[]`: rank 0 and MORE than 60 % of the points in the podium | `landmarksTauride` (dormant) | `streets.js build()` (H06) | `hooks/keep-out.js` | absent: `false` |
| `HOOKS.parkingReject` | `((x, z) => boolean) \| undefined`: a plain function, because `planParking(net)` has no ctx | `MODULES`, when `makeHooks(MODULES)` runs (dormant) | `streets/parking.js` (H07) | `hooks/keep-out.js` (`makeParkingReject`) | absent |
| `HOOKS.carKeepOut` (T2a) | `((x, z) => boolean) \| undefined`: the garden outline is CLOSED to cars (the ring of `hooks/people.js inGarden`: strict bbox, then the even-odd ring test; no exception for the service lane): a plain function like `parkingReject`, because the handling needs no ctx | `MODULES`, when `makeHooks(MODULES)` runs: undefined unless `landmarksTauride` is listed | `drive/handling.js solidBlocked` (`if (KEEP_OUT && KEEP_OUT(x, z)) return true;`, read once per car) | `hooks/keep-out.js` (`makeCarKeepOut`) | absent: no keep-out |
| `HOOKS.inGarden` | `((x, z) => boolean) \| undefined`: the Tauride Garden polygon (OSM park r1582734), for the crowd cap; the numbers are the row `ZONES.peopleDensity.garden` of `area.js` | **none: ACTIVE in the generic North** (9.3) | `people/nav.js` (H08; it is the only people file that imports `HOOKS`: `people/sim.js` reads `nav.inGarden` / `nav.gardenCfg`, `people.js` reads the row `ZONES.peopleDensity.garden`) | `hooks/people.js` | absent: no cap (the neutral row `{ 1, Infinity }`) and no garden code at all (`nav.gardenActive` false, 9.5 H08) |
| `HOOKS.deckServices` | `['landmarksTauride']`: names of `ctx.services` whose `deckY(x, z)` is consulted FIRST (cars and pedestrians); a service that is absent, has no `deckY` or answers `null` / `undefined` is skipped (the old chain answers; `drive/handling.js` skips a non-finite number too, `nav.surfaceY` ignores a non-finite deck itself), `0` is a deck | none (inert while the service is absent) | `drive/handling.js`, `people/nav.js surfaceY` (H09) | `hooks.js` | absent: the old chain |

Rules of the contract:

* The engine reads the hooks ONLY through `src/world/lib/area-tables.js`, never from `area.js`; `layout.js` gains no export (`tools/layout-golden.mjs` lists every export). The shape of the call site is `const f = HOOKS.key?.(ctx);` once per build,
  then `if (f && f(x, z))` per candidate (the tuft / prop / tree paths are hot), about 3 lines per site plus one import.
* Every `(ctx)` factory is evaluated ONCE per build and returns `null` when none of the modules it serves is in `ctx.buildList`.
* A key that is absent means the engine does exactly what it does today. The files under `src/areas/north/hooks/` are PURE DATA and pure functions: no three.js, no import of `layout.js`, **no import of a data facade** (`tools/areas-test.mjs`
  loads the area module without the import-map remap and would get the strip's facade); the coordinates are static (`environment` is built first, so it cannot read the service of a landmark module).
* The hooks that serve a landmark module are **dormant until the module is in `MODULES`**, except the crowd cap (`inGarden` and its row are gated by nothing, 9.3).
* **The tables are validated** by `lib/area-tables.js` (`checkHooks`, `checkPatches`), so that the table of a hand-written area cannot crash the build in an unnamed place: a known `HOOKS` key that is not a function (`false` is the easy way to "disable" a hook, and
  `false?.()` throws), a `deckServices` that is not an array of strings, a `HEIGHT_PATCHES` entry that is not `{ id: string, box: [4 finite numbers], at: function }`, or a table of the wrong kind, is dropped with ONE `console.warn` that names the key or the patch
  (`undefined` / `null` mean "none" and are silent; unknown keys pass). A well-formed table is handed out as it is (the strip's `{}` and `[]` are the same objects), so the engine, the strip's behaviour and the tests that push into the live list see no difference. What a factory
  RETURNS is not checked (it needs a `ctx`).
* `HEIGHT_PATCHES` is read at CALL time (`area-tables.js` hands out the area module's own array when it is well-formed), so a test or the remake can push into it; `heightAt` is evaluated for the whole map at start-up, hence the box reject comes first and the loop
  is an indexed one (a `for...of` cost ~6 ms of the 66 ms cold pass over 82,500 calls).

### 9.2 Files

| File | Content |
|---|---|
| `src/areas/north/hooks.js` | `makeHooks(MODULES)`, `makeHeightPatches(MODULES)`; the contract text; `deckServices` |
| `src/areas/north/hooks/paradny.js` | the Paradny podium and its nine stair flights: `paradnyDeckY`, `inParadny`, `PARADNY_BOX`, `PARADNY_Y`, `PARADNY_PODIUM` and `PARADNY_STEPS` (literals), `PARADNY_STAIRS / FLIGHTS / LANDINGS` |
| `src/areas/north/hooks/height.js` | `makeHeightPatches(MODULES)`: `[]`, or `[{ id: 'paradny', box: [741, 1058.51, -1205, -873], at: paradnyDeckY }]` with `landmarksTauride` (T2: with `landmarksTauride` it is `[paradny, { id: 'garden', box: RELIEF_BOX, at: gardenHeight }]`, the pure relief function of `src/world/landmarksTauride/height.js`: the one import of a file outside the hooks folder, itself pure) |
| `src/areas/north/hooks/keep-out.js` | `treeCleared`, `treeReject`, `tuftReject`, `propReject`, `pedestrianOnly`, `makeParkingReject`, `makeCarKeepOut` (T2a); the Smolny and Suvorov rectangles and the campus polygon (`SMOLNY_APPROACHES`, `SUVOROV_STRIP`, `CAMPUS`, `inCampus`) |
| `src/areas/north/hooks/people.js` | `inGarden` and its ring `GARDEN_RING` (66 vertices) |
| `src/areas/north/area.js` | the tail (`import { makeHooks, makeHeightPatches } from './hooks.js'` and the two exports) and the row `ZONES.peopleDensity.garden` |
| `tools/north-hooks-test.mjs` | the contract, the validation of malformed tables, the Paradny golden, the text checks of the engine files, the `dormant` child and the Paradny twin check of T1 (196 checks; `npm run hooks`, part of `npm run areas`, a CI step; `--write-paradny-golden` rewrites the golden, `--source <dir>` / `$PITER_SRC` name the source repository) |
| `tools/golden/paradny-deck.json` | the Paradny stair geometry pinned WITHOUT the source repository (3 kB): the 16 flights and 16 landings of `hooks/paradny.js` and `paradnyDeckY` on a 1286 x 1344 lattice of 0.25 m (hash of the heights in 0.1 mm); taken while the port equalled the source module bit for bit. A mutant of the landing width, the +0.015 step or the 0.9 m cut is caught in CI, where the source repository is absent |
| `tools/hooks-syntax-check.mjs` | `node --check` of the 11 engine files M6 edits, the two area modules and `hooks.js` + `hooks/*.js` (`npm run hooks:syntax`; a CI step; it proves that they parse, nothing more) |
| `tools/north-height-test.mjs` | the height patch, the stairs, the real `Player` on them, the deck services of cars and walkers, the real module's service built headless and compared on a lattice (321 checks since T1 fix 2, 313 before; `npm run hooks:height`; needs three.js; the cost of `heightAt` is graded by counting calls, the timings are printed only) |
| `tools/north-keepout-test.mjs` | the keep-out hooks: factories, regions, the engine in five variants (since T1: `off0` / `dormant` = the page's list WITHOUT `landmarksTauride`, hooks deleted / as built, `off` / `real` = the page's own list, hooks deleted / as built, and `fake` = `off0` + `propReject` alone on the list without the module, the proof of the prop call site; before T1: off / real / Paradny forced on), the regions against the M5 modules (17 checks; `npm run hooks:keepout`; `--only pure` (8 checks) is a CI step) |
| `tools/north-people-hooks-test.mjs` | the garden ring, the cap row, the cap in a real scene (10 checks, plus 10 with `--scene`; `npm run hooks:people` runs the fast part, a CI step) |
| `tools/north-env-snapshot.mjs` | the environment snapshot (trees, tuft cells, props, parking, pedestrian-only ways, lanes, lamps) and its `--diff` with named regions (`npm run hooks:snapshot`) |
| `tools/golden/layout-north.json` | the layout golden of the North (`npm run golden:north`); `tools/layout-golden.mjs` takes the area (`$AREA`, `--area`, or `tools/area.mjs <id>`) and refuses (exit 2, nothing written) when the area module it really loaded is not that area (an `AREA=north` exported in the shell without the remap would otherwise write the strip's world into the North golden; tested by `north-hooks-test`, group `tools`) |

`npm run hooks:all` = `hooks:syntax` + `hooks` + `hooks:height` + `hooks:keepout` + `hooks:people`. The CI job `verify` has no `npm ci` on purpose, so it runs only what imports no three.js (both layout goldens, `hooks-syntax-check`, `north-hooks-test`, `north-keepout-test --only pure`, the
fast part of `north-people-hooks-test`; each was run in a copy of the tree without `node_modules`); the three engine parts (`hooks:height`, `hooks:keepout`, `north-people-hooks-test --scene`) run locally. **The engine call sites (trees, tufts, props, ways, parking, `heightAt`, handling, nav, sim) are therefore
exercised ONLY by the local `npm run hooks:all` (it needs `npm ci`)**: the CI steps prove that the engine files parse (`node --check`), that the area side is right (contract, golden, tables) and, as TEXT, that each engine file still reads its hook through `lib/area-tables.js` (group `static` of `north-hooks-test`); a call site whose logic
was deleted passes all of them. Until the committed bake of M8 even those steps are not reached in a real run: the first step of the job, `bake-manifest-check`, is red on purpose (9.6).

`hooks/paradny.js` is a port of `src/world/landmarksTauride/paradny-surface.js` of the source (commit `0568f7af`): the same expressions and values (the deck answered identically on 641,504 probe points, the flights, landings and box are
equal to the source module's), with the podium ring (14 vertices, bbox x 741 .. 1055, z -1205 .. -873, 74,115 m2) and the STEPS polylines (ways w1266791536, w1266791538, w1303266326 spliced into w1266791538, w1266791542, w1266791545,
w1266791548, w1266791551, w1266791557, w1266791560) embedded as literals; `PARADNY_BOX` is `[741, 1058.51, -1205, -873]` (the stairs reach x 1057.6, plus half their width). The literals equal the STEPS records of the North facade, in the order
of the data.

### 9.3 Decisions taken

* The Paradny set is delivered DORMANT (the Tauride remake adds `landmarksTauride` to the North `MODULES`).
* The Paradny geometry lives in `src/areas/north/hooks/paradny.js` (a port, not a second copy of `landmarksTauride/paradny-surface.js` in `src/world`, which the remake owns).
* The Kirochnaya `CAMPUS` polygon (8 points) is EMBEDDED in `hooks/keep-out.js` with an equality test against `src/world/landmarksKirochnaya/groups.js` (and `inCampus` answers the same on 200,000 points). The copy exists because the HOOKS
  files import no data facade (that file imports `../data/city.js` for `CAMPUS_ROADS`); `area.js` itself imports the groups files since M5 (the Kirochnaya one derives its `osm` list from `ROADS` of the facade, so the area module is transitively facade-dependent and, loaded without the remap as `areas-test` does, sees the strip's facade there), so the rule binds `hooks.js` and `hooks/*.js`, whose answers must not depend on the remap, and not the whole area module.
* The polygon of `inGarden` is the OSM park r1582734 ring, embedded (the 66 vertices of the North facade record, one ring, no holes), with an equality test against the facade `GREEN` record. The source's own `TAURIDE_GARDEN` has 81 vertices (the
  closing one included, opposite winding): 14 of them are within 0.35 m of a straight edge of the facade ring (the farthest: 0.3415 m), the areas are 197,570 and 197,559 m2 and 142 of 1,344,321 probes of a 0.5 m grid differ.
* Cars climb the Paradny podium only through a deck service (the source behaviour: `handling.js` `deckServices`).
* The pond machinery (pond cuts, pond water mask, pond bed, removal of the thinning hack of `environment/trees.js`, garden bridges) belongs to the Tauride remake, not to M6; the pond bed will be a THIRD entry of `HEIGHT_PATCHES` (T2 made the garden relief the second),
  appended after the Paradny one in `hooks.js makeHeightPatches`.
* The Liteyny Bridge road stub (section 7) is a known gap, not an M6 hook.
* **The garden crowd cap is ACTIVE in the generic North** (decision of the integration step, reviewed against measurements; it replaces cluster C's variant in which the row existed only with `landmarksTauride`). Reasons: the frozen
  contract says `inGarden` is gated by nothing; the inventory of the source's edits (item H08) marks the cap ACTIVE in the generic North and as the one exception to "the generic North is bit-identical before / after M6"; and without it the generic North is visibly unbalanced: the garden
  (197,570 m2, beside the Tauride gate) takes more than half of the visible pedestrians. Evidence (CPU, `people-test --at tauride`, the camera at the Tauride gate (1226, -1268), 10 minutes, heads inside the ring
  of r1582734, `garden-crowd.mjs` of the baselines):

  | | mean | max | per minute | visible in the play area |
  |---|---:|---:|---|---:|
  | before M6 (clean `feat/areas` = the foundation baseline) | 348 | 394 | 215 281 353 371 382 384 368 369 378 380 | 638 |
  | merged tree, row removed in a scratch copy | 333 | 403 | 201 281 322 332 352 373 364 351 370 385 | 638 |
  | merged tree, row active (this commit) | **125** | **179** | 66 96 91 108 120 142 149 146 162 171 | 641 |

  The cap does what it should and no more: the visible population stays (638 -> 641, the people move to the streets), nothing outside the garden is thinned (scene test: 602 / 600 / 593 / 601 visible with the row, the head cap alone,
  the factor alone and the neutral row), and with the camera in the middle of the garden (3 minutes, `north-people-hooks-test --scene`) the row gives 76 / 91 against 403 / 454. **The cap is SOFT, as in the source**
  (`sim.js crowdedAt`: nobody picks a target or is re-placed in a full garden, but walkers on an already planned route and the scripted people are not refused), so the count creeps up during a run (66 -> 171) and the oracle of cluster E,
  "at most 60 heads", is not met and cannot be; the measurement is recorded, not graded. The cost to the other oracles: `npm run check:north` shows `people` 72 -> 71 meshes (one part type has no instance in the starting composition
  that the changed weights produce); with the row removed `people` is identical to the baseline. The verdicts of `people-test` are NOT evidence either way: its jump and carriageway counters move by +-45 jumps / by a factor of
  ten for any change of the nav lattice or the crowd (table in 9.6). To turn the cap off again: set `garden: undefined` in `ZONES.peopleDensity` of `src/areas/north/area.js` (the engine falls back to the neutral row) or gate it by
  `MODULES.includes('landmarksTauride')` as cluster C had done; `inGarden` and the engine need no change.

### 9.4 Clusters and the merge

* **F, foundation (the first commit, serial)**: the contract, `hooks.js`, `hooks/paradny.js`, the three stubs, the tail of `area.js`, the skeleton of this section.
* **A, terrain and decks**: `layout.js heightAt` (H01), `drive/handling.js` (H09, cars), `hooks/height.js`, `tools/north-height-test.mjs`.
* **B, keep-outs**: `environment/trees.js` (H02, H03), `environment/lawns.js` (H04), `props/world.js` (H05), `streets.js` (H06), `streets/parking.js` (H07), `hooks/keep-out.js`, `tools/north-keepout-test.mjs`.
* **C, people**: `people.js`, `people/nav.js`, `people/sim.js` (H08, and H09 for pedestrians), `hooks/people.js`, one data line in `area.js` (`ZONES.peopleDensity.garden`), `tools/north-people-hooks-test.mjs`.
* **E, oracles and baselines**: `tools/north-hooks-test.mjs`, `tools/north-env-snapshot.mjs`, `tools/golden/layout-north.json`, the area switch of `tools/layout-golden.mjs`, and the baselines of the strip and the North taken at the foundation
  commit (outside the repository: `D:/git2/n4spb-work/m6-baselines`, with `take.sh` / `compare.mjs`, equal to the clean `feat/areas` for every oracle).
* **Integration** (`m6-hooks`): the five branches merged with `git merge --no-ff` in the order foundation, A, B, C, E, without a conflict (the foundation edits the tail of `area.js`, cluster C one line in its `ZONES` block, `docs/AREAS.md`
  was touched by the foundation only). The integration step then (1) made the garden cap unconditional (9.3), (2) fixed the stale comments of `lib/area-tables.js`, the strip's `area.js`, `people.js` and `hooks.js`, (3) added the new tests to
  `package.json` and the CI, (4) re-took every oracle of 9.6 on the merged tree, (5) wrote this section and corrected 3.1, 5, 7 and 8.

### 9.5 Per-hook results

The engine edit, by call site (the lines are those of the source repository `0568f7af` where the hook was ported from):

| Item | Call site in n4spb | What it does | Source |
|---|---|---|---|
| H01 | `layout.js heightAt`: one import and `for (let i = 0; i < HEIGHT_PATCHES.length; i++)` before the old line | the Paradny podium answers 3.3 m (the stairs ramp from the street), the rest of the map the waterway bed / 0 | `layout.js:206` (`paradnyDeckY ?? ...`), `landmarksTauride/paradny-surface.js` |
| H02 | `environment/trees.js cleared()`, first statement | no procedural tree on the two ceremonial approaches of Smolny | `trees.js:185-188` |
| H03 | `environment/trees.js plant()`, after `merged-median`, before `if (!o.force)` | hard reject incl. mapped trees: `'paradny'`, `'campus'`, `'suvorov'` (that order) | `trees.js:261-263` |
| H04 | `environment/lawns.js buildTufts()`, `live()` | no grass tuft on the podium or in the campus (also for the cached cells, on every repack) | `lawns.js:366-368` |
| H05 | `props/world.js fits()`, first line | nothing stamped on the podium | `props/world.js:185-186` |
| H06 | `streets.js build()`, `w.pedestrianOnly = !!(pedHook && pedHook(w))` (the later rules only add) | rank-0 ways with more than 60 % of their points in the podium carry no lanes, lamps, parking | `streets.js:106-107` |
| H07 | `streets/parking.js planParking()`, with `L.inExtent` for the slots and the midpoints of the bay lines | no parked car or bay line on the podium | `streets/parking.js:74-75` (unconditional in the source; gated by `MODULES` here) |
| H08 | `people.js` (`DENSITY.garden`), `people/nav.js` (`gardenCfg`, `inGarden`, `densityFactor`), `people/sim.js` (`gardenCount`, `gardenHeads` (a plain counting loop, no array or closure per `recycle` call), `crowdedAt`, `recycle`, the recount every MICRO steps; all of it behind ONE flag, `nav.gardenActive = typeof HOOKS.inGarden === 'function'`, which is false in the strip: there `nav.densityFactor` IS `nav.stationFactor` (the function of before M6) and none of the garden code runs: `nav.inGarden` is called 0 times in a 90 s run, against 2.0 million before) | inside the garden the density is 0.22 x the plan and nobody picks a target or is re-placed there while 60 people are in it (a soft cap, no new random calls) | `people.js:50`, `nav.js:17,61-64`, `sim.js:180,192,427,435,445,589` |
| H09 | `drive/handling.js` (`DS` loop before the bridge chain), `people/nav.js surfaceY` (`serviceDeck`, + 0.12 for walkers). In `handling.js` the strip (no deck service) gets the original expression as `deck`; only an area with services gets the indexed loop over them | the deck of `ctx.services.landmarksTauride` (podium, stair landings, garden bridges) comes first; absent service = the old chain | `handling.js:23`, `nav.js:703` |
| H10 | `PRUNE_SERVICES` of `area.js` | done in M5 (a data edit); `landmarksTauride` joins it with the remake if it publishes `entrances` | `environment.js:151` |
| H11, H12, H13 | none | `lamps.js`, `lanegraph.js`, `streets.js skipDraw` already honour `pedestrianOnly`; the `wires.js` / `traffic.js` edits of the source serve the bridges the North does not build | |
| H14, H15, H16 | none (Tauride remake) | pond cuts and water mask, pond bed (-1.4 m: a second height patch), the 57 % thinning hack of `trees.js:435-445` (the remake REMOVES it) | |

Numbers of the North (real `MODULES`: Smolny, Suvorov, campus active, Paradny dormant), measured by the oracles of 9.6:

* **Keep-out regions** (verified against the geometry of the M5 modules by `tools/north-keepout-test.mjs --footprints`; the numbers are the source's, kept):
  * Smolny approach 1, x 2320 .. 2440, z -1847 .. -1820 (centre z -1833.5 = the cathedral door z): contains the entrance (2425, -1833) and the photo spot (2335, -1833); the only solids of the module in it are the 7 apse walls at x >= 2427.8
    (the cathedral footprint r2864743 starts at x 2428.3, so the east 12 m, 248 m2, of the rectangle lie inside it: harmless); the open part x 2320 .. 2428 holds none.
  * Smolny approach 2, x 2400 .. 2520, z -1553 .. -1533: its z centre -1543 is 1.5 m off the portico axis (-1544.49), its east 6 m (120 m2) overlap the Institute footprint, the only solid of the module in it is the 32.8 m facade wall at x 2513.1 +.
    It covers the last 120 m of the mapped allee only (the footway w1069307382 runs from x 2260).
  * Suvorov strip, x 1384 .. 1442, z -1226 .. -1208: the museum footprint is x 1384.3 .. 1441.2 (margins 0.3 / 0.8 m), its northmost wall z -1224.9 (1.1 m inside the north edge), the colliders of the module x 1383.8 .. 1441.7, northmost z -1222.2.
    The strip is the north 17 m of a 30.7 m deep building (330 of 1,044 m2 are footprint): the forecourts between the wings and the doorstep are kept clear, the rear half is not.
  * Kirochnaya campus polygon (8 points): 18 of the 20 group rings lie wholly inside, r3127701 (10 of 16 vertices) and the chapel r3127704 (4 of 8) straddle the edge; the 12 of 255 colliders of the module outside the polygon all belong to those two
    (none more than 8 m outside); the two gates (1230, -1244) and (1312, -1238) stand on the border (within the 5 m clearance). Three generic buildings have their centroid inside it (w232918731, r3127706, r17248223): vegetation is kept out around
    them too, as in the source.
  * No mapped OSM tree node and no tree row lies in any region (so "soft clearing also takes mapped trees" changes nothing today).
* **Trees** (environment snapshot, the page's full list): 10,903 -> 10,884 (-19; 26 added, 45 removed, 1 moved; `ENV_DEBUG` counters `green:cleared` 129 -> 586, `green:suvorov` 0 -> 11, `yard:suvorov` 0 -> 1, `yard:campus` 0 -> 3). Of the 72 changes none lies outside the allowed
  regions (the four rectangles and the campus grown by 8 m) except 38 that are the CASCADE of a random stream: the trees of a GREEN polygon or a courtyard come from ONE random stream (`trees.js seed()`), so a candidate that a hook rejects
  shifts the rest of ITS record (the source does the same), and the two parks that overlap the regions (GREEN w232918774 around the Suvorov Museum and the campus, GREEN r1948607 the Smolny park) re-roll up to 155 m from a region.
  So "every difference lies inside a keep-out region" is true for the records that touch a region and false for the cascade; the oracles grade exactly that (`--allow active`: no tree inside a region, every other change in a record that overlaps one).
  The environment test of the module (`north-keepout-test`, other counting) reads 11,263 -> 11,244; of its 28 trees that stood in the regions (Smolny 15 + 3, Suvorov 7, campus 3) none remains.
* **Tufts** (the pool is camera-centred; probe spots): the campus pool is empty (`campus-n` 154 -> 0, `campus-edge` 300 -> 1), the tuft cells of the 36 m lattice 2,814 -> 2,790 (41 differ, all inside the allowed regions), `suvorov`, `smolny-a/b`,
  `garden`, `podium`, `hero` and `control` unchanged.
* **Everything else identical**: streets (590,243 triangles, +0), lane graph 10,499, parked slots 2,448, bay lines 1,161, pedestrian-only ways 13, lamps 1,042, every props list (1,854 props in 28 types), the layout golden of the North, traffic.
  `npm run check:north`: 12 of 14 modules identical, `environment` 318,344 -> 318,314 triangles (-30), 13,879 -> 13,864 instances (-15), 9,439 -> 9,424 colliders (-15), and `people` 72 -> 71 meshes (the cap, 9.3).
* **Paradny (dormant)**, with `landmarksTauride` forced into the lists (what-if snapshot against the normal one of the same tree; the module itself is not built): trees 10,884 -> 10,877 (101 rejections: courtyard 91, green 7, yard 3), tuft
  cells 2,790 -> 2,747 and the 267 tufts of the podium probe -> 0, pedestrian-only ways 13 -> 69 (the 56 rank-0 ways with more than 60 % of their points in the podium), lanes 10,499 -> 10,289, parked slots 2,448 -> 2,447 and
  bay lines 1,161 -> 1,159 (cluster B's forced run; the snapshot's `--also` cannot switch the `MODULES`-gated parking reject), props inside the podium ring 6 -> 1 (the one left is a mapped bench: `props/osm.js` does not go through `fits()`, as in the source); the single random stream of the
  props re-rolls benches, urns and pots map-wide (1,854 -> 1,860 props): the hook changes props everywhere, which is why it must stay dormant until the module is there. **T1 (the module built and listed): the real activation reproduces every figure of this what-if inside the podium and on the streets (tufts 267 -> 0, pedestrian-only ways 13 -> 69, lanes 10,499 -> 10,289, parked slots 2,448 -> 2,447, bay lines 1,161 -> 1,159, podium ring 0 trees / 1 mapped prop / 0 tufts), but the tree total is 10,893 and the props 1,872, not 10,877 / 1,860: the CLAIMS of the module (not the hooks) re-roll the courtyards and the random streams; the table and the decomposition are in 8.9.**
* **Height patch** (patch listed): box [741, 1058.51, -1205, -873]; of the 105,894 points of the box on a 1 m lattice 74,389 are deck (74,247 plateau at 3.3, the rest the 8 stairs: flights 1.8 .. 4.3 m long (after the 0.9 m cut at each landing), gradient 0.43 .. 0.82 m/m, steepest pitch
  1.18 m/m with the landing step, top landing 3.315 = the source's +0.015) and 31,505 are the old line. Cost with the empty list: 66.2 ms against 66.3 ms (median of 14 cold runs, 82,500 calls); with the patch, the worst case (the whole podium
  box) 19.5 .. 21.9 ms against 2.5 .. 2.6 ms warm. Cars: through `deckServices` the real `createHandling` car climbs the first flight of each of the 8 stairs (ride error <= 0.09 m); without the service it stays at 0.03.
* **Garden crowd**: 9.3 (the Tauride gate, 10 minutes: mean 125 / max 179 heads against 333 / 403 without the row; the camera in the middle of the garden, 3 minutes: 76 / 91 against 403 / 454).

How the Tauride remake activates the Paradny set (checklist):

1. Add `'landmarksTauride'` to `MODULES` in `src/areas/north/area.js` (after `landmarksKirochnaya`; `PRUNE_SERVICES` too if the module publishes `entrances`). That alone switches on `HEIGHT_PATCHES` (`makeHeightPatches`), the parking reject
   (`makeHooks`) and, through `ctx.buildList`, the tree / tuft / prop / pedestrian-only hooks. The oracles that turn into "fires in the podium" checks: `north-keepout-test` (its `real` vs `off` assertions on streets / props are the dormant case),
   `north-height-test` (the patch is then listed, not pushed), `north-hooks-test` (the gating group), the North baselines of `m6-baselines` (retake them).
2. The module publishes `ctx.services.landmarksTauride.deckY(x, z)` (the podium and the garden bridges); cars and pedestrians then stand on it. It must also (a) register the stair ramps and landings with the physics (`ctx.physics.addStairs` per flight,
   `addWalkBox` per landing, as `landmarksTauride/paradny-courts.js:38,42` of the source): `heightAt` alone is not a sticky floor for the player, climbing is exact but a run down the steepest flight hops by up to 1.8 m;
   (b) put parapet colliders on the edge of the podium: `deckY` answers 3.3 for ANY podium point, so a car whose centre crosses the edge from the street would snap onto the deck; without the service (a dev subset `?only=` with the module in `MODULES`)
   the car ignores terrain above 0.45 m and sinks into the podium, as in the source.
3. Append the pond bed (-1.4 m) after the Paradny entry in `hooks.js makeHeightPatches`; add the garden bridges to the deck service; make the nav lattice walkable on the podium and the bridges (`nav.js`, 9.7).
4. If the module keeps its own copy of `paradny-surface.js` (it reads `STEPS` from the facade), add an equality test between that copy and `hooks/paradny.js` next to the existing ones.
5. Views: Digit4 (915, -1010) stands on the podium (ground 3.30): `tools/views-check.mjs` fails its ground band [-0.5, 1.5] with the patch active (the pose itself is walkable: the real `Player` walks 5 s in four directions from it). Digit5 stands on a
   bridge and Digit6 in the lake of the garden: move the three with the remake, or let the check accept `heightAt` where a patch answers.
6. The people simulation: the garden row stays as it is (it is already active); when the garden gets bridges, the cap's ring and the bridges' walkable cells must agree.

**Status after T1** (8.9): points 1, 2, 4 and 5 are done (the module is listed and publishes the deck; `paradny-courts.js` registers the 8 stair ramps with `addStairs`, the landings with `addWalkBox`, the podium walls with `addBox`; the equality test is the `paradny twin` group; Digit4 / 5 / 6 moved, Digit0 / 3 too). Open: point 2(b) is only half true (the walls stop a walker or a car coming from the street, not one leaving the deck: 8.9 "Known behaviour of the source"), points 3 and 6 belong to T2-T7.

### 9.6 Verification

The oracles are run from the root of the worktree on the merged tree (HEAD of `m6-hooks` plus the integration edits); the baselines are those of cluster E (`D:/git2/n4spb-work/m6-baselines`, taken at the foundation commit, equal to the clean
`feat/areas` for every oracle: `take.sh <OUT>` runs all of them, `compare.mjs <A> <B>` reads them; this run: `m6-after-int3`). STRIP = must be identical after every engine edit; NORTH = may change only where the hooks are active.

| Oracle | Command | Result |
|---|---|---|
| strip layout golden | `node tools/layout-golden.mjs --diff` (`npm run golden`) | identical to `tools/golden/layout-strip.json` |
| strip counts | `npm run check` (25 modules) | identical in every module: triangles, meshes, instances, materials, canvas pixels, colliders, wires, services, bounds |
| strip signatures | `streets-signature --diff`, `city-signature --diff`, `environment-regress --diff` | streets 836,197 -> 836,197 (+0); city 1,079,439 -> 1,079,439 (+0, old regions unchanged); environment-regress identical in every box |
| strip snapshot | `node tools/north-env-snapshot.mjs --diff` (trees 6,206, tuft cells 2,866, props 2,738, parking slots 3,184, pedestrian-only ways 5, lanes 12,860, lamps 1,407) | identical |
| strip simulations | `node tools/traffic-test.mjs`, `node tools/people-test.mjs` | identical lines after dropping the wall-clock numbers; both RESULT OK (people: jump counter 177, as on `feat/areas`) |
| strip CPU suite | tree-instance, drive-edge (`npm run edge`: 960 runs, 1,556 hits, 0 outside, 0 stuck), drive-collision, physics, wires, streets-clip, street-paving, street-kerbs, people-cover / crosswalk / render / fence | same exit codes as at the foundation: all OK except `landmark-tree-bounds-test` (red on the clean `feat/areas` too: "splitting preserves the original distant tree silhouette", 2500 !== Infinity) |
| gates | `npm run layout`, `landmarks`, `garage` (both areas), `owns-table --check`, `importlint` (1,502 imports), `runtimelint` (547 files), `areahtml:check`, `handoff` (24), `gates` (29) | all OK |
| bake revision | `npm run revtest`, `npm run bakecheck` | revtest OK (the bake is STALE, as with every `src` change); bakecheck red, as on the clean `feat/areas`: the committed manifest says `ce34abb8...` and no tree matches it any more (the failure prints the revision of the tree, which differs per commit: `85bc4307...` on `feat/areas` at the foundation commit of M6, `e43c9e75...` on `m6-hooks`); it turns green with the committed bake of M8 |
| North layout golden | `node tools/area.mjs north tools/layout-golden.mjs --diff` (`npm run golden:north`) | identical to `tools/golden/layout-north.json` |
| North counts | `npm run check:north` (14 modules) | 12 identical; `environment` 318,344 -> 318,314 triangles, 13,879 -> 13,864 instances, 9,439 -> 9,424 colliders (the keep-outs); `people` 72 -> 71 meshes (the cap; with the row removed `people` is identical) |
| North streets | `node tools/area.mjs north tools/streets-signature.mjs --diff` | 590,243 -> 590,243 (+0) |
| North snapshot | `north-env-snapshot.mjs --diff env-snapshot-north.json X.json --allow active --expect-empty campus,suvorov` | RESULT: OK, 566 changes, all inside the allowed regions grown by 8 m or their cascade (9.5); the campus and the Suvorov strip hold 0 trees, the campus 0 tufts; props, parking, pedestrian-only ways, lanes, lamps identical |
| North what-if Paradny | `north-env-snapshot.mjs --out Y.json --also landmarksTauride`, then `--diff X.json Y.json --allow paradny --expect-empty paradny` | RESULT: OK, 1,029 changes, only the podium and the cascade of the prop stream; the podium holds 0 trees / tufts |
| North traffic | `node tools/area.mjs north tools/traffic-test.mjs` (default list and `TRAFFIC_BUILDLIST` with the M5 modules) | identical to the baseline (6,785 segments, 381 vehicles), RESULT OK |
| North views | `node tools/area.mjs north tools/views-check.mjs` | 12 poses, 0 failing. What-if with the Paradny patch pushed into the live list: Digit4 fails the ground band (3.30), see 9.5 point 5 |
| North garage, wildlife | `area-garage-check`, `wildlife-test` as the North | OK |
| North pedestrians | `people-test` (jumps / carriageway samples, verdict) | table below: RED at the default settings before and after (the known tour-group leftover of section 7); the numbers are chaotic |
| garden crowd | `people-test --at tauride --eval garden-crowd.mjs --minutes 10` | 9.3: mean 125 / max 179 (before 348 / 394) |
| hook tests | `npm run hooks`, `hooks:height`, `hooks:keepout`, `hooks:people` (+ `--scene`), `npm run areas` | 191, 309, 17, 10 + 10 checks OK; `areas-test` 72 passed + the hook contract. The `--scene` part includes a population built WITHOUT `HOOKS.inGarden` (as the strip is): `nav.gardenActive` false, `nav.densityFactor === nav.stationFactor`, `nav.inGarden` called 0 times in the run (1.3 million times in the garden build); the cap numbers are unchanged (row 76.3 / 91, neutral 403 / 454) |
| CI steps | the added steps of `pages.yml` (both layout goldens, `hooks-syntax-check`, `north-hooks-test`, `north-keepout-test --only pure`, `north-people-hooks-test`), run in a copy without `node_modules` | OK (the existing step `bake-manifest-check` fails there for the reason in the row above, and a failed step skips the rest of the job: the M6 steps are not reached in a real run before the bake of M8). **They do not exercise the engine call sites**: only the local `npm run hooks:all` (needs `npm ci`) does, see 9.2 |

**Re-run at T1** (`landmarksTauride` listed, the Paradny set active; the baselines are a pristine copy of `feat/areas` 4eb2a0e, `D:/git2/n4spb-work/tauride/before`): STRIP rows unchanged (identical in every oracle above); NORTH rows: layout golden regenerated on purpose (8.9), `check:north` per-module deltas in 8.5, streets signature 590,243 -> 589,027, snapshot in 8.9, hook tests 196 / 313 / 17 / 10 + 10 checks OK, `views-check` 12 poses 0 failing, `traffic-test` identical, `people-test` (default and `--at tauride`) RESULT OK, `wildlife-test`, `area-garage-check` OK; the strict snapshot diff against the M6 baseline FAILS by design (the claims of the module).

`people-test` of the North, jumps / carriageway samples (verdict). The same commands on three trees: the clean `feat/areas`, the merged tree with the garden row removed (a scratch copy), and the merged tree as committed:

| position | clean `feat/areas` | merged, no row | merged, row (HEAD) |
|---|---|---|---|
| hero (Chernyshevskaya), 10 min | 368 / 178 (FAIL, limit ~320) | 412 / 231 (FAIL) | 366 / 164 (FAIL) |
| `--at tauride`, 10 min | 203 / 1,708 (FAIL) | 140 / 6,638 (FAIL) | 171 / 187 (OK) |
| `--at chernyshevskaya`, 4 min | 235 / 56 (FAIL) | 144 / 49 (FAIL) | 73 / 34 (OK) |
| `--at smolny`, 4 min | 57 / 0 (OK) | 36 / 0 (OK) | 78 / 0 (OK) |
| `--at tauride`, 4 min | 72 / 0 (OK) | 37 / 975 (FAIL) | 74 / 0 (OK) |

The carriageway samples at the Tauride gate are one or two agents standing at one crossing (cross=437, (1209.6, -1262.4)), counted every second: 0 or thousands depending on whether somebody gets stuck there, so the counter says nothing about M6.
The jump counter moves by +-45 for any change of the nav lattice (an unrelated 19-tree perturbation gave 355 against 368 and 412). Nothing here is a regression of the hooks; it is the leftover of section 7.

### 9.7 Known gaps

* **The Paradny set and the deck service WERE untested against the real module (M6); since T1 they are** (8.9): the real module is built, headless, by `tools/tauride/paradny-walk.mjs` (8 stairs, 0 failing, with the real `Player`, the module's `addStairs` ramps and walls) and, since T1 fix 2, by section 8 of `tools/north-height-test.mjs`, which publishes nothing of its own: the car checks run through the module's real `ctx.services.landmarksTauride`, and `deckY` and `paradny.deckY` are compared with `hooks/paradny.js paradnyDeckY` bit for bit on 449,360 lattice points (0.5 m, box + 5 m; also against `heightAt`, and the service key against `HOOKS.deckServices`; the mutants `deckY: () => null`, a deck shifted by 0.5 m, the service key renamed, `paradny` dropped and `undefined` for `null` each fail). `north-keepout-test`'s `real` variant does NOT build the module (its hooks read the list; the module is only in the build list for its claims, see its header), so it is no proof of the service; before T1 fix 2 section 8 used a stand-in `{ deckY: paradnyDeckY }` and a module whose service answered null passed every gate; the car on the deck service with the module's own colliders is probed only by a scratch run (8.9 "Known behaviour of the source": the podium parapet does not stop a walker or a car leaving the deck, as in the source).
  The remake still owes the second height patch (the pond bed) and the garden bridges (9.5 point 3).
* **Pedestrians and the podium / bridges**: the nav lattice (`people/nav.js`) knows neither the podium nor the garden bridges; nobody paths onto them yet (the remake's, point 3 of the checklist in 9.5). `surfaceY` already stands a walker on the service deck.
* **The pond machinery** (pond cuts, pond water mask, pond bed, removal of the thinning hack of `trees.js`, garden bridges) is the remake's, not M6's. The Liteyny Bridge road stub (section 7) is no hook.
* **The crowd cap is soft** (9.3): the garden count creeps to ~170 within 10 minutes at the gate; a hard cap would need the walkers on planned routes to be refused too (a source behaviour kept). The ring is the facade's (66 vertices); the source's
  81-vertex ring differs on 0.01 % of a 0.5 m grid.
* **Cascades**: the random stream of a GREEN polygon / courtyard (trees: 38 changes outside the +8 m boxes; 72 changes in total) and the single stream of the props (a Paradny prop hook changes about 400 prop rows map-wide once
  `landmarksTauride` is built). Both are the source's behaviour. The oracles grade them as "(cascade)".
* **Mapped OSM furniture** is not covered by `propReject`: `props/osm.js` places benches / bins / racks with `okPoint()`, not with `fits()`, and the source hook sits in `fits()` only (one mapped bench stays on the podium, as in the source).
* **`treeCleared` applies to mapped OSM trees** (no caller of `placeTrees` passes `force`); none lies in the rectangles, the strip or the campus today.
* **The Smolny rectangles are the source's numbers**, not the module's geometry: approach 2 is 1.5 m off the portico axis and 6 m of it lie inside the Institute; approach 1 covers 12 m inside the cathedral; the second covers only the last 120 m of the allee;
  the Suvorov strip is the north 17 m of the museum's 30.7 m. The Kirochnaya campus polygon cuts the buildings r3127701 and r3127704.
* **`tools/city-signature.mjs` cannot run as the North** (it reads `src/world/data/<region>` directly): there is no North city signature; the North's city is covered by `check:north` and the claims gates.
* **Not run (need a GPU or a browser)**: `drive-test`, `drive-garage-test`, `nav-bake-equiv`, `baked-check`, the bake byte comparison, the screenshots. `signals-knock-test` exits 1 on the clean `feat/areas` too. The bake is stale (every `src` file
  changes the global revision) until the committed bake of M8; the nav bake is not affected by the garden row (the graph uses the raw zone weights; a node check of `nav-bake-equiv-page.js` passed with the row).
* **CI**: `hooks:height`, `hooks:keepout` (engine part) and `north-people-hooks-test --scene` need three.js and run locally with `npm run hooks:all`; the CI job has no `npm ci` on purpose, so the engine call sites are exercised only locally (9.2) and the CI steps stay green when a call site
  is deleted. The optional source-equality parts of `north-hooks-test` (`--source <dir>`, else `PITER_SRC`, else `D:/git2/agi-fun-tests/102_3d_piter`) and of `north-people-hooks-test` (`PITER_SRC`, else the same default) skip themselves when the source repository is absent; the Paradny geometry is pinned
  without it by `tools/golden/paradny-deck.json`.
* **`suite-landmark-tree-bounds`** and **`bakecheck`** are red on the clean `feat/areas`; the people jump counter is red there at the default settings (section 7).
