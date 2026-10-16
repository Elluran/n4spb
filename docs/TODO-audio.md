# Audio (core/audio.js) - Yakutsk edition: status

`src/core/audio.js` was the Moscow-City engine; the wildlife specialist retuned it for a summer afternoon in the centre of Yakutsk. `node tools/audio-test.mjs`
(mock AudioContext, no sound card) checks that it builds, that every sound name used in `src/world/**` exists, that all synthesised buffers are finite / non-silent,
that `update()` survives 60 s with a moving listener, and that footsteps follow the listener only on the ground.

## Done

| was (Moscow) | now (Yakutsk) |
|---|---|
| `river` quay lapping, `waterProx()` on the constant `layout.shoreDist` | loop `lake` (`river` is an alias): `waterProx()` uses `ctx.services.environment.shoreDist` (it only measures within 16 m of a bank) and otherwise the boxes of lake Taloe / the canal / the SE pond; softer lapping, droplets |
| `trainRun`, `trainBrake`, `doorChime`, MCC chime + Web Speech `announce`, `boatHorn`, rail clatter | removed (the names stay accepted and silently ignored). `doorOpen` / `doorClose` stay as pneumatic **bus doors** (aliases `busDoorOpen` / `busDoorClose`) |
| `birds` loop: Moscow sparrows / hooded crows / river gulls | sparrows, great tits, white wagtails (`wag`), pigeons, far ravens (`raven0..2`, deep croak) and carrion crows (`crow0..1`), far magpie rattle (`mag0..3`), swifts screaming high overhead (`swc`), a very rare far gull; a little quieter in the white night. The **near** birds are voiced by the wildlife module from their real positions: `audio.play('crow' / 'raven' / 'magpie' / 'wings' / 'dogBark', { position })` |
| `city` hum of towers, rooftop fans, 143 Hz drone | a low-rise hum (rumble + faint 100 Hz substation tone + haze, 45 % quieter at night); far events: a dog barking in a yard (more at night), a far construction clank (day), an ambulance, a horn |
| `wind` between the towers | dry breeze, softer needle / leaf rustle (3.1 / 3.9 kHz); follows `ctx.shared.uGust` |
| `traffic` | the bed follows `roadProx()` (`layout.roadsNear`: loud on prospekt Lenina / Yaroslavskogo, 0.4-0.6 on side streets, faint in a yard) and drops by 65 % at night; pass-bys retuned: Japanese 4-cylinder cars, a CNG bus (smooth), a UAZ / GAZelle diesel van |
| no footsteps | derived from the listener's own motion: one footfall per stride on the ground (camera < 2.4 m, not jumping / flying), surface from `environment.kindAt` (granite pavers / asphalt / sand and gravel / dry grass) |
| `fountain` | kept (ref 6, range 140; landmarksA calls `loop('fountain', { position, volume: 0.55 })`) |
| new one-shots | `crow`, `raven`, `magpie`, `wings`, `dogBark`, `clank`, `busBrake`, `carDoor` (`busBrake` / `carDoor` / `clank` are available to the traffic / props modules; nobody calls them yet) |

## Not done (ideas for the next iteration)

- Zebra pedestrian-signal beeper: the data is there (`streets.pedState(crossingId, t)`, `crosswalks[].signalised`), a positional "tick" voice per crossing within 40 m is the missing piece.
- Real vehicles: `ctx.services.traffic.vehicles` could drive 3-4 positional engine voices (instead of the baked ambient pass-bys) and trigger `busBrake` / `doorOpen` when a bus stops at a stop.
- The dry fountain "plays music" (docs/research/people.md [W9]); not synthesised (no known tune). A very quiet khomus / jaw-harp event on the square is possible.
- Kick-scooter rolling on pavers (short positional loop) for the people module; Ostrog log-tower creak; wind chimes of the sergé columns.
- The fountain loop could follow the real jet cycle if landmarksA publishes it (`services.landmarks.fountain` has no state yet).
- Hooks the engine reads (all optional, with fallbacks): `window.__ctx.shared.uGust`, `.uNight`, `.L.roadsNear`, `.services.environment.shoreDist / kindAt`.
