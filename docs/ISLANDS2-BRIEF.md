# Islands round 2: finish Vasilievsky / Petrogradsky, Petrovsky + Zhdanovka, Yelagin, Kamenny, Aptekarsky: builder brief (2026-10-13)

Read together with `docs/AGENT-BRIEF.md` (user content rules, **road integrity rules**, the section "Road markings, plates, signs and facade labels"), `docs/PERFORMANCE-CONTRACT.md` and the first section of `docs/PERFORMANCE.md`, `docs/WEST-BRIEF.md` ("How a landmark module works"), `docs/VO-BRIEF.md` and `docs/PETRO-BRIEF.md` (the two previous rounds of this kind: your templates), `docs/ISLANDS-2026.md` (the Krestovsky round of 2026-10-12: the newest template), `docs/DESIGN.md`, `docs/FIGURES.md` (statues). This file only adds what is specific to this round and wins where they differ.

## What the user asked (2026-10-13, verbatim sense)
"Let's finish authoring Vasilievsky Island and Petrogradsky Island (the parts we did not finish), also the Ждановский остров and the other small islands near the area. Also let's make Yelagin Island: it is a beautiful place, so make it with more love and accuracy. Also the view from the cockpit is strange now: improve it."
* **Yelagin gets the best treatment of the round**: the user judges at 1-3 m, wants real accuracy and "love" (park composition, the Rossi palace complex, ponds, meadows, bridges, the spit, small architecture, statues as real figures: never boxes).
* **"Ждановский остров"**: OSM has NO island of that name (checked 2026-10-13: `nwr[place~island|islet]` in 59.93..60.02 N, 30.15..30.40 E). The user means the Zhdanovka area = **Petrovsky Island** (rel 1576109, stadium, park, yacht clubs) + the **Zhdanovka river** with its embankments (Ждановская набережная, Ждановская улица, Ново- / Старо-Ждановский сквер, the Zhdanovsky + 4 footbridges) + **Serny Island** (Серный остров, way 22793388, 0.03 km2) + the unnamed islets of the Krestovsky shore. Treat that whole set as one task.
* "Other small islands near the area": **Kamenny** (rel 1576182, 1.09 km2), **Aptekarsky** (rel 1576187, 2.09 km2: Botanical Garden), **Bychy** islet (rel 3298204), the islets ways 22870264 / 22870327 / rel 10254207. Krestovsky stays as built (the 2026-10-12 pass) except the defects the audits find.

## Facts (local frame: x east, z SOUTH, metres; origin ORIGIN in `tools/osm-lib.mjs`)
| island | OSM | bbox x0..x1, z0..z1 | km2 | state of the frame on 2026-10-13 |
|---|---|---|---|---|
| Yelagin | rel 1576343 | -6424..-4331, -5564..-4776 | 0.97 | mostly inside K1..K3 as generic OSM scenery; the palace (-4544,-5223) is in K1, but the stables / glass museum / the north shore (z < -5250 east of x -4900, z < -5600) are OUTSIDE PLAY |
| Kamenny | rel 1576182 | -4413..-2525, -5518..-4517 | 1.09 | outside (K1 overlaps its west tip) |
| Aptekarsky | rel 1576187 | -3849..-1017, -5157..-3897 | 2.09 | outside except a southern sliver (P7 / P8) |
| Petrovsky | rel 1576109 | -6502..-3524, -3754..-2025 | 1.17 | partly (P2, P6, P9, K2); the west half is outside |
| Serny | way 22793388 | -5021..-4741, -2731..-2477 | 0.03 | outside |
| Bychy | rel 3298204 | -7314..-6355, -5062..-4869 | 0.06 | K3 |
The exact island outlines (local metres) are in `docs/reference/islands2-island-polys.json`; every named / tourist OSM object on and beside them (id, tags, x, z, region, inPlay) is in `docs/reference/islands2-osm-inventory.json` (written 2026-10-13 from Overpass; **Overpass works today** with `User-Agent: piter-anime-walk/1.0 (data bake; research; nepo7771@gmail.com)`, one request at a time, mirrors in `tools/fetch-osm.mjs`).
Frame regions already appended (never renumber, never reorder: records stay with the first rectangle that holds them): OLD, W1.., ..., V3..V12, C1..MS, K1..K4. New rectangles of this round are appended after K4 by the foundation owner only.

## Owners (one owner per file; everything else is read-only for you)
Never run `git add / commit / stash / checkout / reset / clean`, never `npm run bake` (the lead bakes and commits). Never delete or rewrite files you do not own. Another session may also commit to this checkout.
| owner | files |
|---|---|
| foundation | `tools/osm-lib.mjs` (append rectangles), `tools/fetch-osm.mjs` / `tools/bake-osm.mjs` runs, `src/world/data/**`, `docs/reference/islands2-*`, `tools/coverage-*.mjs`, `tools/islands-data-test.mjs`, the water context files in `src/world/environment/` that the Krestovsky round added or touched (`krestovsky-context.js`, `waterways.js` entries for the Nevkas), `docs/reference/vo-frame.md`-style frame note |
| cockpit | `src/world/drive/**`, `src/world/drive.js`, `tools/drive-*.mjs`, `docs/research/cockpit-2026.md` |
| researchers | `docs/research/<their slug>.md`, `<slug>-houses.json`, `docs/research/islands2-requests-<slug>.md` (+ photos only in `SP/refs/<slug>/`) |
| sight builders (wave 2) | `src/world/<module>.js`, `src/world/<module>/**`, `tools/<module>-*.mjs`, their dossier, `docs/research/islands2-requests-<module>.md` |
| the lead | `src/main.js`, `src/world/layout.js`, `src/world/lib/*`, registration stubs, VIEWS / AREAS, README, bake, commits |
`SP` = the session scratchpad `C:/Users/user/AppData/Local/Temp/claude/D--git2-agi-fun-tests/a7b1c919-d770-4682-8bee-6a28dbcc70af/scratchpad` (use your own unique file prefix; screenshots of a module in `shots/<module>/`, git-ignored).

## Rules that bite here (in addition to AGENT-BRIEF)
* **User content rules**: no flags / flagpoles / pennants (Yelagin, Petrovsky yacht clubs, stadium and the Kamenny Island palace normally have them: skip all; bare masts and spires are fine); no sirens / alarms / bells that sound like warnings (ordinary car horns are fine; church bells are NOT drawn as sound); no corporate logos (plain wordmarks only).
* **Statues and small architecture are real figures** (memory: monuments must be detailed, not boxes): use `src/world/lib/figures.js`; the Yelagin Palace lions, the ~14 antique-statue alley (Vestal, Juno, Bacchus, Flora, Meleager, Athena, Psyche, Ceres, Adonis, Mercury, Artemis, Apollo ...), the Latona fountain statue, Hercules, the Kirov memorial are all mapped as OSM nodes (see the inventory): build them as modelled figures, once, instanced where repeated.
* **Performance first** (PERFORMANCE-CONTRACT): ordinary houses and parks are generic OSM output; sights use `ctx.addStatic`, authored LOD ranges, instancing for anything repeated more than ~40 times, no `frustumCulled = false`, no update callbacks unless a shader clock. Budget <= ~250 k triangles and <= ~20 materials per sight module, build <= 1.5 s. Detail must not add draw calls: use atlases / vertex colours / the facade shader. The whole city is CPU-bound by draw calls (2,400-2,700 per view).
* **Park / water accuracy**: ponds, banks, meadows and paths come from OSM and the environment (`environment/*`); a sight module may not draw its own water or bank (ask the owner through a requests file). Trees: the shared tree buckets (`environment/tree-instances.js`); landmark tree generators use `prepareTreeLods` from `world/lib/tree-bounds.js`.
* **Player walks where a tourist walks**: paths, lawns, bridges, the palace forecourt and terraces, piers (steps). Closed territory (private yacht club piers, the Kirov stadium works yard, the Komarov Institute offices) is exterior only and solid. Nobody walks on the water: every bank you own needs a collider or a quay.
* **Road integrity** (AGENT-BRIEF): nothing on a carriageway, every drivable road is asphalt. Yelagin and Kamenny have narrow park drives (no through traffic): treat any OSM `highway=service/track/path` wider than a footpath as a road for the audits; no poles on carriageways. `npm run roads`, `npm run markings` are the lead's final gate; audit your area: `node tools/roads-furniture-audit.mjs --strict --near x,z,300`, `node tools/roads-surface-audit.mjs --near x,z,300`.
* **Facade labels**: reserve through `ctx.services.labels.reserve(...)`; plates and name friezes carry the real Russian text of the sight.
* **Truth over memory**: heights, colours, dates and attributions come from the dossier with source tags [OSM] / [W] (Wikipedia / Wikidata) / [V] (a photo you opened) / [E] (estimate, say so). A fact you cannot verify is marked `[?]` in the dossier, not invented. Overlaps between modules are settled in the module plans: never claim an id of another module.
* **Z-fighting is a bug class**; run `node tools/zfight.mjs` on your frames. Open every screenshot PNG with the Read tool and compare it with the reference photos.
* Russian text: only through Write / Edit (never shell heredocs; an unpaired apostrophe breaks a heredoc; sources mix CRLF and LF). Node scripts that import project files need `file:///` URLs. Never touch `../100_3d_moscow_city`, `../101_3d_yakutsk`, `../sakuragaoka-station`.
* Heavy jobs (headless browser, `check.mjs`, audits): ONE at a time per agent; `NODE_OPTIONS=--max-old-space-size=14000`; kill every node / msedge process you started when you finish.

## Dossier format (researchers and builders)
`docs/research/<slug>.md` like `krestovsky-2026.md`, `nikolsky.md`, `new-holland.md`: evidence tags, a PHOTO TABLE of photos you really opened (Commons via `curl -L -A "piter-anime-walk/1.0 (research; nepo7771@gmail.com)" "https://commons.wikimedia.org/wiki/Special:FilePath/<File>?width=1400" -o SP/refs/<slug>/NN_name.jpg`, ~1 request / s; search with the Commons API `list=geosearch` around the object and `list=search`), KNOWN ERRORS, a modelling spec with hex colours, dimensions, counts and OSM-measured positions (re-measure with the baked data `src/world/data/city-*.js` and the raw layers `data/osm-raw/*.json`), and at the end a **MODULE PLAN** section: one entry per proposed sight module (name `landmarks<Name>`, sights, OSM ids it claims, estimated triangles, what the generic city must stop drawing, requests to water / bridges / streets / people / props / wildlife owners).

## Final report (your last message, under 35 lines, no code)
Built / not built, files, services published, claims flipped on, triangles / draw calls / build ms, what is unverified, requests to other owners, problems, ideas.
