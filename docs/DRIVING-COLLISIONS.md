# Driving collisions and cosmetic damage

The player car now uses an oriented rigid footprint against the existing spatial
physics grid. Box and cylinder contacts apply normal impulses, friction and yaw
spin based on the contact point. Speed-dependent substeps keep thin obstacles
solid at nitro speed; the existing terrain, water, hole and map guards remain.
Walking collision response is unchanged.

Nearby traffic supplies its velocity and mass. Impact impulses exchange momentum
between the player and struck cars. Struck parked/moving cars switch to a Rapier
rigid body, slide and spin, and can push another parked car in a chain collision.
Their collider follows the wreck; the old parked collider and AI lane slot are
removed. AI cannot snap a wreck back onto its lane. Trams and articulated vehicles
retain their route simulation. Cars use terrain-following planar translation/yaw;
full suspension, rollover and soft-body simulation are outside this implementation.

The player's body, glazing and lamps acquire coherent front/rear/side crush zones
and paint scuffs. Plates remain planar until their bumper tears away; closed inner wheel wells prevent
see-through holes. The bonnet uses short panel edges so trim follows its folds.
Repeated impacts advance through **Scuffed, Dented, Crumpled and Wrecked**, with
stronger compression, collapsed roof/fenders and extinguished damaged lamps.
At severe damage, bumpers, lamps, plates, bonnet panels and small glass shards
break off. The exposed engine/chassis remains inside the shell. Detached pieces
use 3D gravity, angular motion, collision, friction and bounce, then expire after
18 seconds. The collision footprint shortens with the crushed nose/tail.
Heavy frontal damage emits smoke through the existing bounded
particle pool. Sparks originate at the actual contact point. Cosmetic damage
persists across exit/entry and teleports for this session, but does not change
engine power or survive a page reload. Struck parked and moving vehicles also
retain their own directional damage. Healthy traffic remains instanced; damaged
vehicles use a maximum of 24 private mesh sets, with ordinary instances as the
capacity fallback. Hidden sets are evicted without losing damage state. The
runtime physics pool is capped at 24 cars, 48 debris bodies and 512 nearby scenery
proxies. Untouched city colliders remain in the existing spatial grid.

**Repair:** stop (below approximately 5 km/h), then press **J** or click/tap
**J · Repair** above the speedometer. The BODY readout shows cosmetic condition.
Repair restores original vertex positions, normals and colours and clears smoke.

## Small test area

Run `npm start`, then open `http://localhost:5176/tools/collision-lab.html`.
The test yard loads production driving, handling, car meshes, materials, effects
and HUD without building the city. Buttons exercise a wall, an offset pole, a
production parked and oncoming fleet cars; WASD, drift, camera and repair inputs
remain live. This page is a development fixture, not a new city region.
Damage preview buttons reproduce each stage through real impacts.

```sh
node tools/drive-collision-test.mjs
node tools/drive-damage-test.mjs
node tools/traffic-damage-test.mjs
node tools/wreck-physics-test.mjs
node tools/drive-collision-browser.mjs
node tools/physics-test.mjs
node tools/physics-surface-test.mjs
node tools/drive-input-test.mjs
node tools/drive-collision-bench.mjs --baseline-ref d7227f45^
```

Validation on 2026-10-13: 11 collision scenarios pass, including 66 m/s hits against
a 12 cm wall at 144/60/30/10 Hz, reverse, sliding, pole spin, parked and moving
vehicles, height filtering and reset. Damage checks cover localized/bounded
deformation, untouched panels, exact repair, smoke thresholds and traffic braking.
Existing checks pass 62 walking assertions, 5,004 surface/hole queries and entry
input regressions. Edge GPU tests cover real keyboard acceleration, impacts,
all four stages, reciprocal fleet damage, cache isolation/capacity/eviction,
damage persistence, smoke, keyboard/button repair, cockpit and mobile HUD with
no page or WebGL errors. Screenshots are in `shots/collision/`.

The main bootstrap was additionally checked with `tools/shot.mjs --only drive
--params "noroof=1" --q medium --t 0`: entry, a real handling collision at the
Nevsky lane (498.2286, 135.1625), damage 0.38, and repair back to 0 all pass with
zero module errors. This intentionally small module check does not prove full-city
FPS, region streaming or bridge integration. The larger module-subset load was
cancelled to avoid competing with the other agent's region tests.

## Shipping handoff

The user requested small-area verification while another agent adds regions.
Region files, existing cockpit edits and shipping bake assets were left untouched.
Source changes require `npm run bake` after the concurrent region work settles,
followed by normal-loading integrated checks and a matching-bake commit. Do not
force or relabel the old bake as current.

Follow-up checkpoint `31846588` also passed the browser suite serving committed
`drive.js`, `drive/model.js` and `drive/handling.js` directly from Git, confirming
that it does not depend on the concurrent cockpit edits. A full `npm run bake`
was attempted, then stopped before manifest publication: its source revision
included unfinished region/cockpit changes outside this checkpoint. Only that
attempt's unpublished products were removed; the last complete manifest remains
`84852ddeb471ec850927`. Final combined-source baking and integrated city QA remain
the shipping handoff after those edits settle.

Physical-wreck checkpoint `d90dd9e6` passed the GPU suite with only staged
collision changes in `drive.js` and committed model/handling files, independently
of the concurrent cockpit integration. The actual main bootstrap was rerun with
`tools/shot.mjs --only drive --params noroof=1 --q medium --t 0`: a real
45 m/s collision produced damage 0.926 and 7 debris bodies, repair succeeded,
and module errors were empty. This remains a module smoke test, not full-city QA.

Full `npm run roads` completed with exit 0: furniture strict failures 0 after
existing allowances; surface residuals 992 within 2170; ribbon walls 6 within 10
and surface triangles 848 within 1000. This used the shared working tree during
concurrent region work; no road generators were changed in this checkpoint.


## The edge of the map (strip build)

The edge of the play union is a soft wall for the car, not a footprint test: see `edgePush` in `drive/handling.js` and section 5 of [STRIP.md](STRIP.md). `tools/drive-edge-test.mjs` (npm run edge) drives the coupe, the taxi pickup and the Zhiguli into the real strip border from random points and headings (footprint never outside, always able to escape, a glancing hit keeps its speed), `tools/drive-edge-real.mjs` (npm run edgereal) does the same on real streets in the browser.
