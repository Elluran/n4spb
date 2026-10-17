# The garage: four drivable cars at the Moscow Railway Station (2026-10-13, the Roadster added 2026-10-17)

User requests: (2026-10-13, 102_3d_piter) "author another car near the central station: a Tesla Cybertruck in the colours of an ordinary taxi; it should be heavier than our red car and a bit slower.
And one more car: purple (eggplant), an old-looking Lada 2106 (VAZ-2106 Zhiguli); it should be a bit faster than our red car and lighter." (2026-10-17, n4spb) a fourth car: the **Tesla Roadster** (second generation, unveiled 2026-10-15),
same colours and design as the real one, with a "reactive" thruster boost and reactive jumps (hops).

Owner of the registry + handling: `src/world/drive/cars/index.js`, `cars/tuning.js`, the hooks in `drive.js` / `handling.js` / `fx.js` / `hud.js` / `sound.js`. The models are `cars/cybertruck.js` (+ `cybertruck/`),
`cars/lada2106.js` (+ `lada2106/`) and `cars/roadster.js` (+ `roadster/`); the damage / wreck base (`damage.js`, `breakable.js`, `collision.js`, `wrecks.js`) is shared.
No flags, no sirens, no beacons, no brand badges (the pickup carries no T logo and no company name, the Zhiguli no VAZ emblem, the Roadster no badge; the prompts say "такси-пикап" / "Жигули" / "родстер"; the only logo is the
Bibliotechka roof decal every car carries). The Roadster's toast names the car (`Родстер · Tesla Roadster 2026`), at the user's explicit request.

## 1. What the game does

* `drive.js` builds **one vehicle per car**: `{ id, def, model, car (handling state), parked, damage, spec, box }`. `ctx.drive.fleet` lists them (order: coupe, truck, lada, roadster), `ctx.drive.vehicle` is the current / last driven one and
  `ctx.drive.car / model / damage / parked` follow it (with nothing entered they are the coupe's). `enter('roadster')` / `enter(vehicle)` gets into a car by id (no argument = the current one).
* **E gets into the NEAREST car in reach**: every car registers its own `ctx.interact` prompt (nearest enabled one within its radius and in front of the camera wins: standing at the Lada never offers the pickup).
  Prompts: `[E] Сесть в машину · Get in the car · Bibliott GT`, `[E] Сесть в такси-пикап · Get in the taxi pickup`, `[E] Сесть в «Жигули» · Get in the Zhiguli`, `[E] Сесть в родстер · Get in the Roadster`.
  Toast on entering: `Красная «Б» · Bibliott GT`, `Такси-пикап · Taxi pickup`, `Жигули · баклажановая шестёрка`, `Родстер · Tesla Roadster 2026`.
* Exit (E below 25 km/h, or `exit(true)`) leaves that car **parked where it stopped** (a solid box again for the walkers, the traffic blockers and the other cars), with its dents. Only one car is active; the other three stay
  parked solid obstacles. Digits / R teleport the active car (`place()` probes the footprint with the car's own length and width).
* **Per car**: the handling object (`createHandling(ctx, tuning)`, its own spec, collision footprint, mass and constants), the damage state (`createCarDamage(model, { spec })`), the wreck debris, the engine voice, the HUD words,
  the cockpit eye + resting FOV (`spec.eye`, `spec.fovRest`), the chase-camera distance, the exhaust points (`def.exhaust`; the pickup has none, the Roadster has its four rear nozzles and a `jetFx` description of the cold-gas
  plume), the position of the damage smoke (`front - 0.9`, `0.63 * height`). One damage state per car.
* **Parked cars cost nothing far away**: a parked car is posed and drawn only inside 70 m of the camera or inside the view frustum.
* A car file that fails to load or does not export its factory drops **that car** from the garage (console warning) and the game goes on with the others; `loadGarage(ctx, { placeholders: true })` builds plain box cars for tests only
  (the Roadster's placeholder keeps its four nozzles and its jet fx).
* **Registry gotchas**: a car id missing from `MASS` / `DURABILITY` / `SOUND` / `HUD` / `TUNING` fails silently (default mass 1350, durability 1, the coupe's voice) or at the first frame (`HUD[id]` undefined). The test
  `tools/drive-garage-handling.mjs` checks the Roadster's rows.

## 2. Where the cars stand

The coupe's old spot (579, 219) lies on the **station's taxi-rank service aisle**: OSM way `w569726648`, `highway=service`, lane `rank 0`, which `traffic/sim.js` never drives; the two real carriageways nearby are the Vosstaniya Square
links 13.5 m north and Nevsky / Ligovsky 30 m away. South of the aisle lies the open station forecourt (free pavement from z 223 to the station building at z 241+).
**Every car has a free way out to the east**; the new ones stand staggered on the forecourt pavement, facing the same way (99 degrees = east, slightly toward -z):

| car | x | z | yaw | length x width | what is around it |
|---|---|---|---|---|---|
| coupe | 579.00 | 219.00 | 99 deg | 4.14 x 1.82 m | on the aisle, the old spot, unchanged |
| taxi pickup | 590.00 | 224.00 | 99 deg | 5.68 x 2.03 m | 5.7 m south-east of the coupe, 1.5 m clear of the aisle's south edge |
| Zhiguli | 582.00 | 228.00 | 99 deg | 4.16 x 1.62 m | a row further south; its way east passes 2.7 m south of the pickup's centre |
| **Roadster** | 596.00 | 232.00 | 99 deg | 4.62 x 2.00 m | the south-east corner, 10 m beyond the pickup (4.9 m between the bumpers), 14.6 m from the Zhiguli; 25 m of open pavement ahead of the nose (room for a thrust run and a hop), nobody's way out passes it |

How it was chosen: a scan of 465 candidate poses (x 558..618, z 226..240, yaw 99 deg, the Roadster's footprint) against the garage-test rules; 373 passed, every pose for x 592..616 and z 231..235 passes with more than 4 m to any
other car. How it is checked (`tools/drive-garage-recon.mjs` prints the ASCII map, `tools/drive-garage-test.mjs` asserts it in the real page): no building under the footprint, inside the play area, **no driven lane** (every lane with
`rank > 0` is more than 0.3 m from the 9 footprint samples), a solid at the car's centre and nose for the walkers, a free strip on at least one side, **a free way out** (14 m straight ahead of the nose, car width + 40 cm: no solid,
no building, other parked cars included) and bumper gaps >= 0.6 m. The knockable street furniture (`core/knock.js`) puts new solids on the pavements: re-run `drive-garage-test.mjs` after any change to it; the fallback spot is (572, 233).
Map of the forecourt (`node tools/drive-garage-recon.mjs --x 596 --z 230 --r 22`; `R` asphalt, `S` solid, `#` building, `c t l r` the cars, `.` free; x from 574, one character per metre):

```
 z    x=574                  596                 618
 218  ....SRcRRRRRRRRRRRRRRRRRRRRRRRRRRRR..........     the coupe
 223  RRRRRR........SSttt..........................     the pickup
 228  ......lllll..................................     the Zhiguli
 231  ....................SSrrr....................
 232  ....................rrrrr....................     the Roadster (596, 232)
 233  ....................rrrSS....................
 236  .............................................     free forecourt
 241  ....................................SSSS#####     the station building
```

The crash test of `drive-garage-test.mjs` (section 5 there) drives the Zhiguli into a wall on the free pavement at (568, 229), 28 m west of the Roadster, so it never touches the Roadster's box.

## 3. The numbers: coupe / taxi pickup / Zhiguli / Roadster

The red coupe's real constants (kept bit for bit as `COUPE_TUNING` in `handling.js`): `ACC 15.5`, `BRAKE 30`, `REV_ACC 9`, `VMAX 48`, `VREV 9`, `NITRO_VMAX 1.38`, `NITRO_ACC 1.9`, gears `[13, 22, 31, 40, 49, 62]` m/s,
steer-in rate 6.5 / out 11 per s, lateral grip 9 (handbrake 1.3) with cap 24 (handbrake 8) m/s2, yaw `tan(0.55 * steer) * v / wb` limited by `24 * 1.05 / v`, air drag `0.0011 v^2`, engine braking 1.7, sliding scrub 0.10,
nitro drain 0.22 / s, refill 0.045 / s (+0.10 while drifting), body pitch 0.0040 and roll 0.0030 per m/s2 (cap 0.05 / 0.06), response 9 / s. `createHandling(ctx)` with no tuning is exactly this.

The model files carry their own mass hints; the registry's `MASS` table (`2970 / 945 / 1690`) overrides `spec.mass`, so one place decides.

Tuning table (`cars/tuning.js`; measured numbers from `node tools/drive-garage-handling.mjs`, the real `handling.js` on a flat empty world at 60 Hz):

| | coupe | taxi pickup | Zhiguli | **Roadster** |
|---|---|---|---|---|
| **mass** | 1350 kg | 2970 kg (2.2 x) | 945 kg (0.7 x) | **1690 kg (1.25 x)**; a real one is "just under 1,700 kg" |
| acceleration `acc` | 15.5 | 12.4 (80 %) | 17.0 (110 %) | 22.5 (145 %), about 2.3 g of launch |
| top speed constant `vmax` | 48 | 40.8 (85 %) | 51.8 (108 %) | 62 (the drag settles it near 56 m/s = 202 km/h) |
| brakes `brake` | 30 | 21 | 24.5 (soft old drums) | 36 (big discs) |
| reverse | 9 | 7 | 8 | 8 |
| nitro / boost / THRUST speed x, accel x | 1.38, 1.9 | 1.30, 1.5 | 1.34, 1.8 | 1.28, 2.0 (`nitroRamp` 0.22 s: builds up instead of switching on) |
| nitro drain / refill per s | 0.22 / 0.045 | 0.25 / 0.035 | 0.22 / 0.045 | 0.30 / 0.05 (a full tank is 3.3 s of THRUST, about 20 s to refill) |
| gears | 6 | 1 (HUD shows D) | 5 | 1 (HUD shows D) |
| HUD boost label | NITRO | BOOST | NITRO | THRUST |
| steering turn-in / return per s | 6.5 / 11 | 4.4 / 7.5 (soft) | 8.6 / 10 (lively) | 7.0 / 11 |
| steering lock factor | 0.55 | 0.50 | 0.60 | 0.50 |
| yaw grip limit | 25.2 | 20.2 | 23.2 | 25.2 |
| lateral grip / cap (m/s2) | 9 / 24 | 7.5 / 18 | 6.3 / 20 (loose) | 9.5 / 26 (planted wide tyres) |
| handbrake yaw | 0.55 (max 2.3) | 0.48 (max 1.6) | 0.66 (max 2.6) | 0.55 (max 2.2) |
| sliding scrub | 0.10 | 0.13 | 0.12 | 0.10 |
| engine braking | 1.7 | 2.2 (regenerative) | 1.7 | 2.0 (regenerative) |
| body pitch / roll per m/s2 | 0.0040 / 0.0030 | 0.0062 / 0.0048 | 0.0046 / 0.0034 | 0.0045 / 0.0024 (caps 0.07 / 0.045: stiff and low, squats at launch) |
| body response / impact spin decay | 9 / 4.5 | 6.2 / 6.5 | 7.4 / 3.6 | 11 / 4.5 |
| damage durability (crush per hit / x) | 1 | 1.3 (stout stainless body) | 0.85 (soft old metal) | 0.95 (thin faceted shell) |
| hop (`hop` row, Roadster only) | - | - | - | `v0 6.2` m/s, `g 15.5`, tank cost 0.28 (needs 0.28), cooldown 0.55 s, air steering x0.25, nose-up 0.07 |

Measured (flat world, 60 Hz; the Roadster's THRUST row is without the `nitroRamp` build-up, which costs about 1.5 km/h and 0.12 s):

| metric | coupe | pickup | Zhiguli | Roadster | Roadster / coupe |
|---|---|---|---|---|---|
| 0-100 km/h (s) | 2.20 | 3.03 | 1.95 | 1.38 | 0.63 |
| speed after 10 s (km/h) | 157.8 | 135.0 | 169.6 | 201.9 | 1.28 |
| top speed, 40 s (km/h) | 158.4 | 135.7 | 170.1 | 202.2 | 1.28 |
| peak speed with the nitro / THRUST in one tank (km/h) | 210.7 | 155.3 | 219.7 | 250.9 (249.4 with the ramp) | 1.19 |
| nitro sprint: speed at 6 s, nitro on from 60 km/h (km/h) | 200.9 | 146.6 | 204.7 | 211.0 | 1.05 |
| braking distance from 60 km/h (m) | 4.6 | 6.5 | 5.6 | 3.9 | 0.85 |
| braking distance from 100 km/h (m) / time (s) | 12.7 / 0.95 | 17.9 / 1.33 | 15.4 / 1.15 | 10.6 / 0.80 | 0.83 |
| turning circle at 60 km/h, full lock: radius (m) | 4.3 | 7.0 | 3.6 | 5.5 (11 m across) | 1.28 |
| nose swing 0.5 s after full lock at 50 km/h (rad/s) | 1.30 | 0.88 | 1.32 | 1.31 | 1.01 |
| peak sideways slide in a 100 km/h corner (m/s) | 4.2 | 5.0 | 7.9 | 2.6 | 0.62 |
| handbrake slide peak (m/s) | 14.0 | 11.1 | 14.8 | 13.7 | 0.98 |

Roadster targets (spec 2.3) and results: 0-100 km/h 1.3-1.6 s (1.38), top without THRUST 190-205 km/h (202), with THRUST 245-265 km/h (250), braking from 100 km/h under 2.7 s (0.80: the arcade brake constant is metres per
second squared), turning circle about 11 m across (11.0). Only `acc` / `vmax` were tuned to the targets (plus `nitroAcc` 2.0 instead of the spec's 1.8: with the build-up ramp, 1.8 peaked at 241 km/h, under the 245 target).
The real car's 0.81 s 0-60 mph is marketing; the game stays under about 2.4 g because tyre grip is not modelled. The coupe, the pickup and the Zhiguli are unchanged by the fourth car (the same numbers as in the 102 table).

(The arcade scale: the coupe's 0-100 in 2.2 s is the game's own, the others are relative to it. Top speed is where the engine force meets the quadratic drag, a little under `vmax`.)

### Mass in the collisions and wrecks

* `collision.js createCarCollisions`: the car's mass is `spec.mass` (default 1350, the coupe): the impulse handed to a struck traffic / parked car is `mass * dv` and the target's inverse-mass ratio is scaled by `mass / 1350`.
* `wrecks.js vehicleMass(spec)`: `spec.mass` wins when present. `damage.js recordDamage`: the crush per hit is divided by `spec.durability` (default 1).
* `handling.js`: every constant above is a field of `COUPE_TUNING`; `createHandling(ctx, tuning)` merges an override object; the 8 footprint probes of `carBlocked` follow `hf / hr / hw` (Roadster 2.34 / 2.34 / 1.04, so the soft
  map edge keeps it 2.7 m inside the border).
* `fx.js`: the damage smoke rises at `car.smokeZ / smokeY`. `sound.js`: `createCarSound(audio, profile)` / `setProfile`. `hud.js`: `setProfile({ boost, gearD })`.

Measured with the real game classes (`tools/drive-garage-damage-test.mjs`, collision yard): the damage at 20 m/s into the wall is coupe 0.36, pickup 0.28, Zhiguli 0.42, Roadster 0.38; a sedan hit at 22 m/s flies
coupe 16.5 m, pickup 25.6 m, Zhiguli 12.6 m, Roadster 18.7 m in 2.5 s (momentum order lada < coupe < Roadster < pickup).

### Engine voices (`sound.js` profiles, all calm: no sirens, no alarms, no warning beeps)

* coupe: the old voice (two detuned saws + a square an octave down).
* pickup: a low electric hum: sine / triangle / sine, the pitch law `38 + 96 * rpm` Hz, a dark low-pass, almost no intake noise, no gear blips.
* Zhiguli: a rough old four: saw + two squares, a wider detune beat (1.016), higher filter resonance, a louder intake / valve rattle, a soft blip at each shift.
* **Roadster: an electric whine**: sine / sine / triangle, the pitch law `70 + 330 * rpm` Hz (about 70 Hz at rest, 370 Hz near 200 km/h) with a fifth on top (`subRatio 1.5`), a soft filter (Q 1.0), almost no intake, no blips, a louder
  wind (x1.35: a 1.22 m low car at 250 km/h is mostly wind). The `jet` field (`gain 0.16, hp 1800, attack 0.05, release 0.35`) is the THRUST hiss: more air and less roar than the shared whoosh, fading out slowly.
* The horn (`G`) is the engine's own ordinary car horn for all four.

### The Roadster's reactive system (registry side)

* THRUST is the nitro (Shift / the touch button): the tank, the lock on an empty tank and the FOV / shake / vignette / speed streaks are the shared ones; the Roadster adds the `nitroRamp` build-up (0.22 s of valve lag),
  the four nozzle points (`entry.exhaust`, car-local `(+-0.40, +-0.13, 0.50, -2.27)`) and `entry.jetFx` (`JET_FX` in `cars/index.js`: pale white condensate puffs instead of the orange exhaust glow).
* The hop (`hop` tuning row) is a small vertical simulation in `handling.js` (`car.h`, `car.vy`, `car.air`): it clears curbs, benches and bins (a knockable thing is skipped by the car while its top is under `car.y + 0.45`), it does not
  clear buildings or the river (those stay 2D). Gas costs a part of the THRUST tank.

## 4. Tests

| tool | what | needs |
|---|---|---|
| `node tools/drive-garage-handling.mjs` | the table above; asserts top speed / acceleration order truck < coupe < lada < roadster, the Roadster targets, braking, masses, the coupe equals the legacy call; the registry fallbacks (missing car files, placeholders, the real Roadster entry, damage on a placeholder with the truck's spec, durability order) | node only (3 s) |
| `node tools/drive-garage-sound-test.mjs` | the four engine voices on a recording WebAudio mock: coupe = old graph, pickup = sines / triangle, Zhiguli = detuned rough, Roadster = sine / sine / triangle whine with a calm jet profile, live `setProfile`, no gear blip for the electric cars | node only |
| `node tools/drive-garage-damage-test.mjs [--shots]` | every car into the wall, a parked sedan and oncoming traffic in the collision yard: crush on its own shell, shed panels, debris, wrecks, momentum order, durability order, repair, one damage state per car (four) | headless Edge (20 s) |
| `node tools/drive-garage-test.mjs [--shots]` | the real page: layout of all four (no building / lane, solid, a free way out), prompts, E at each car, 0-100 / top / braking on a long straight, cockpit eye + FOV, exit parks the car solid, a dent stays with its car | headless Edge (reduced modules: environment, streets, city, drive; `baked=force`) |
| `node tools/drive-garage-keys-test.mjs [--shots]` | the REAL keyboard for each car in turn (truck, Zhiguli, Roadster, coupe) on a long straight street (E, W, Shift, A + Space, G, V V V, S, E); the Roadster also presses X once the hop exists in `handling.js` | headless Edge (reduced modules) |
| `node tools/drive-garage-recon.mjs` / `drive-garage-session.mjs` | the ASCII map of the forecourt (letters c t l r for the cars); a long-lived page for experiments | headless Edge |
| `npm run edge` / `npm run edgereal` | the car at the invisible map edge: four cars in turn headless (960 runs, none stuck); the coupe and the Roadster in the real scene (49 runs, none stuck at the edge; a wrecked Roadster can wedge itself diagonally in a 3.8 m alley between two walls far from the edge, R frees it: reported as a jam, not a failure) | node only / headless Edge |
| `node tools/drive-damage-test.mjs`, `node tools/wreck-physics-test.mjs` | the shared base: unchanged | node only |

Real-page tools need `?baked=force` while `src/` is newer than the bake (the garage tools add it by default; `--baked 0` turns it off).

## 5. Known limits

* The parked cars are not wreck-physics bodies: a car driven into a parked one hits a static solid; the parked car is not shoved.
* Dents persist for the session only; J / the HUD button repairs the car you sit in.
* The Zhiguli's model tilts itself 1.25 x / 1.3 x on top of the handling pitch / roll; the Roadster's roll and pitch come from the handling table above.
* `assets/baked` is stale after any `src/` edit: re-bake (`node tools/bake-scene.mjs`) as the last step of the work session, then `node tools/bake-manifest-check.mjs`.
* The cost of the Roadster's model (draw calls, triangles) is reported by its builder in the header of `cars/roadster.js`; it was not re-measured here.
