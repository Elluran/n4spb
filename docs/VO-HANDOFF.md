# Vasilievsky Island round: handoff No. 3 (2026-10-10, for a NEW session)

Supersedes the earlier handoffs. Read, in this order: this file, `docs/VO-BRIEF.md` (builder brief: what the island looks like, rules that bite, verification), `docs/PERFORMANCE.md` (first section: the 2026-10-08 pass), `docs/workflows/README.md` (the workflow scripts). Plans: `docs/research/vo-roster.json` (sight modules), `docs/research/vo-infra-tasks.json` (owners), `docs/reference/vo-frame.md` (frame). Every request between owners is in `docs/research/vo-requests-*.md`.

## 0. Where we are, in six lines
* The whole island (14 km2, frame rects V3..V12) is in the play area; all 15 sight modules + the concert hall are BUILT, independently REVIEWED (accept-with-notes) and COMMITTED.
* Infrastructure rounds done and reviewed: frame, water (1-3), bridges (1-2), streets (1-2), metro, the Smolensky cemetery detail pass. Round B builds committed: water-3 (reviewed), streets-3, bridges-3, mining-fix, city, props, wildlife (these six: build committed, review NOT done). `people` and `traffic` builders were cut off mid-way (work in progress committed as a WIP checkpoint, see the git log). `views` not started. The Erarta detail pass: researcher finished (`docs/research/erarta-detail.md`), critic cut off, builder not started.
* The last full bake (`b5913aa7...`, 2026-10-08) is STALE: ~50 commits of source changed after it. The page builds live (slow) until the final bake.
* Frame time is far from 30 FPS (70-86 ms mean while driving, ~2,400-2,500 draw calls, intro ~80 s): the perf rules of section 4 apply to everything.
* Nothing of the island has been walked by the lead in a browser: do the browser pass of section 7 before declaring done.
* The user's rules: no flags / flagpoles, no alarm sounds, summer day, nothing on a carriageway, monuments judged at 1-3 m.

## 1. What the user asked (2026-10-07 .. 10)
"Author Vasilievsky Island, realistic and accurate, sights authored with distinct agents" + fences on Vosstaniya Sq (people through them), the odd floor ribbon, BKZ Oktyabrsky + the Kapodistrias monument, corner-tower houses see-through (all FIXED), + "add the Erarta museum and the Smolensky cemetery as DETAILED objects" (Smolensky DONE; Erarta in progress), "continue", "start wave 3", "up to 8 heavy jobs", then "pause".

## 2. State of every part (git log is the truth)
| part | state |
|---|---|
| frame, OSM bake (region lock) | done (`docs/reference/vo-frame.md`) |
| fixes: fences, floor ribbons, corner turrets | done, audited (`tools/people-fence-test.mjs`, `streets-ribbon-audit.mjs`, `city-tower-audit.mjs`) |
| landmarksOktyabrsky (hall, foyer enterable, Kapodistrias) | done |
| sights (15) | all built + reviewed: Academy, Menshikov, Mining, Andrew, NavalCorps, Smolensky (+detail pass), SeaTerminal, Sevkabel, Kirova (incl. Erarta), Makarova, Sredny, Gavan, Pribaltiyskaya, MarineFacade, ModernVO |
| water 1-3, bridges 1-2, streets 1-2, metro | done + reviewed |
| bridges-3 (corner stairs of Nalichny / Korablestroiteley / mouth bridges, Tuchkov / Palace descents), streets-3, mining-fix, city (V.O. district grammar, KNOWN houses from every `*-houses.json`, bevel-corner turrets, audit failures), props, wildlife | builds committed; reviews NOT done |
| people, traffic | builders cut off; WIP committed (`people/vo.js`, `voarea.js`, `traffic/*`): unreviewed, unfinished |
| views (keys, areas, splash facts, streaming check, README section) | not started |
| Erarta detail pass | catalogue written, critic cut off |

## 3. How to resume (do in this order)
1. `git status`, `git log --oneline | head -30`, kill leftover processes of the dead session (`Get-CimInstance Win32_Process | ? { $_.Name -match 'node|msedge' -and $_.CommandLine -match 'tools|headless' }`; stopped workflows leave audits running at 6-9 GB), `node tools/layout-test.mjs`.
2. Integration round B: `Workflow({ scriptPath: "D:/git2/agi-fun-tests/102_3d_piter/docs/workflows/vo-integration-b.js", args: { only: ["streets-3","bridges-3","mining-fix","city","props","wildlife","people","traffic","views"], reviewOnly: ["streets-3","bridges-3","mining-fix","city","props","wildlife"], resume: true } })`. Heavy gate is 5 (the user allows up to 8 heavy jobs in total; free RAM was ~23-30 GB with 5 running: watch it). `resume: true` tells the people and traffic builders to continue from the WIP in the tree.
3. Erarta: `Workflow({ scriptPath: ".../docs/workflows/vo-detail-erarta.js", args: { from: "critic" } })` (commit `docs/research/erarta-detail.md` first if it is still untracked). Run it when the Kirova module is not being edited by anyone else.
4. When those are done: sections 5 and 6 below, then the final gate (section 7).
Workflow scripts persist only if you keep the repo copies (`docs/workflows/`); the harness `resumeFromRunId` works inside one session only. Heavy agents never run git or the bake; the serialised committer agents stage explicit paths only (another session may commit to this checkout: never `git add -A`).

## 4. Performance rules (from the 2026-10-08 pass; keep them)
The scene is CPU-bound by draw calls. Everything a module draws goes through `ctx.addStatic` / instances so `core/batch2.js`, `spatial.js`, `lod.js` batch, sector-cull and far-proxy it; no loose per-object meshes; no object references in `userData`; <= ~200 meshes and <= ~80 materials per module; each module reports its draw-call delta at its postcard pose with the module on and off (`tools/perf-scan-page.js` via `shot.mjs --eval`, or `shot.mjs --bench`); more than ~60 calls in its own view must be slimmed. Regression tools after touching the matching code: `tools/lod-test.mjs`, `renderer-pass-test.mjs`, `region-streamer-test.mjs`, `tree-instance-test.mjs`, `fleet-upload-test.mjs`, `people-crosswalk-test.mjs`, `people-render-test.mjs`, `people-cover-test.mjs`, `signal-display-test.mjs`, `street-kerbs-test.mjs`, `field-bake-equiv.mjs`, `drive-input-test.mjs`, `drive-bench.mjs`. URL switches for A/B: `?bcell= ?bfar= ?pbat=0 ?signalcache=0 ?split=0 ?lodscale=`. Measured on 2026-10-08: intro ready ~80 s, mean frame high 86 / medium 71 / low 68 ms, ~2,400-2,500 calls. The cemetery detail pass REDUCED calls by 101-120 per view: that is the standard to copy.

## 5. Open items (after the owners of section 3 are done)
1. ENGINE (lead): `core/spatial.js sizeClass` hides every spire / chimney / crane jib / mast narrower than 2.5 m beyond ~900 m (the Sea Terminal needle vanishes at 2 km). Make tall thin objects (longest extent >= 30 m) class L or honour a skyline flag; then `lod-test`, `renderer-pass-test`, a long-view shot.
2. Draw-call trim of modules above the ~+60 guide: ModernVO (+67..+93, 148 materials), Kirova (+60, 113 materials; the Erarta pass targets <= 80 materials and <= +45 per pose), Makarova (+62), Sredny (+62, 128 materials), SeaTerminal water view (+66).
3. Small leftovers: Gavan church floating slab (church.js nave extrusion), cornice slabs near the Makarova Catherine church (city), Marine Facade gold crowns (needs a city split of the baked Golden City U-blocks), `props/state.js PETRO_SIGHTS` must list landmarksKirova, crowd / pigeons at the Xenia plaza (people / wildlife: `xenia-*` discs, 45 pigeons), Mining Soviet emblems stay NOT drawn (lead decision), Primorskaya / Dekabristov Island stay generic.
4. Metro: pavilions of Sportivnaya-2 (Makarova) and Gorny Institut (Sredny) now exist: check that the stairs show through the glazing (Makarova asks metro to drop the room wall slabs).
5. The heavy-process lesson: after `TaskStop` always kill leftover node / msedge processes.

## 6. Settled decisions (do not ask again)
Whole island in the frame; far west only Pribaltiyskaya (P2) and the Marine Facade port (P3, two white liners without flags / logos); Lenexpo = fenced site only; Primorskaya and Dekabristov Island generic; no Lieutenant Schmidt monument (does not exist); the three named construction roads are kept (late roads); the 22 old kerb cells of the kerb-arc rule are accepted; the ring phase shift of 1.2-1.5 m at the old sight rings is accepted; the Oktyabrsky foyer is enterable (`FOYER_OPEN`); triangle / mesh budgets are caps; Mining Soviet emblems not drawn.

## 7. Final gate (lead, last) and the bake
`npm run roads` (4 min, 8 GB), `npm run markings`, `npm run walls`, `npm run labels`, `npm run ribbons`, `node tools/city-tower-audit.mjs --strict`, `node tools/environment-vo-seal.mjs` (also `--decks`, `--flood --modules <sights with rings>`), `node tools/streets-signature.mjs` (accept the 22 old kerb cells), `node tools/city-signature.mjs`, `node tools/layout-test.mjs`, the regression tools of section 4, `node tools/smoke.mjs --q medium`, `node tools/drive-bench.mjs` (must not be worse than ~10 % over 70 ms mean), then the BROWSER PASS (one drive down Sredny and Bolshoy, a walk Spit - Academy - Mining - cemetery, the metro stations, the bridges), then ONE bake: `BAKE_HEAP=16384 BAKE_VERBOSE=1 node tools/bake-scene.mjs` (the 8 GB default stalls in GC while packing the `city-base` cells; the high pass took ~30 min, the whole bake ~45-60 min; the manifest is published only when every product has finished; a first launch sometimes hangs silently with tiny renderers: kill node and its `msedge` children and start again), then `node tools/streets-late-roads.mjs --empty`, `npm run bakedcheck`, commit. Never re-bake the OSM data without the region lock (`tools/bake-osm.mjs --lock`, default `src/world/data`).

## 8. Machine and agent hygiene
64 GB RAM, 24 logical CPUs, one GPU. `check.mjs` / audits need `NODE_OPTIONS=--max-old-space-size=14000`. A headless-browser shot loads minutes of scene: ONE heavy process per agent, few cameras per run, `--only <modules>`. Wave 1 cost 50 agents, 17 h, ~21 M subagent tokens: the user hits usage limits ("we are approaching limits, let's pause"): plan waves of <= ~10 agents, checkpoint-commit as each module finishes, and expect to be paused. Russian text only through Write / Edit (heredocs with an unpaired apostrophe fail; sources mix CRLF / LF).

## 9. Paste-ready prompt for the new session
"Continue the Vasilievsky Island build in `102_3d_piter`. Read `docs/VO-HANDOFF.md` (No. 3) first, then `docs/VO-BRIEF.md`, `docs/PERFORMANCE.md` (first section) and `docs/workflows/README.md`. Step 1: verify the tree (`git status`, `node tools/layout-test.mjs`, kill leftover node / msedge processes). Step 2: relaunch the integration round with the `args` of section 3 (reviews of the six committed builds, finish people and traffic, views), heavy gate 5. Step 3: the Erarta detail pass (`args.from = 'critic'`). Step 4: the open items of section 5 and the final gate of section 7 with ONE bake (`BAKE_HEAP=16384`). Keep the frame time at or under the current numbers; the user judges at 1-3 m and checks by driving the red car; no flags, no alarm sounds."
