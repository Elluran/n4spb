# Underground engine (metro): what the core gives a module

The core (`src/core/*`, `src/main.js`, `index.html`) can host a metro that lies **down to ~-70 m** below the street plane (y = 0): a vestibule at street level, a
very long escalator (50-65 m deep stations, ~100-130 m of slope at 30 degrees), a station hall far below, a platform, a train that arrives, opens its doors,
carries the player to the next station. The metro **content** is built by the `metro` module; this document is the contract between the two. A working,
self-contained example was `src/world/undertest.js` (`?only=undertest`, see the git history of 102_3d_piter); the live reference now is `src/world/metro.js`.

Conventions: metres, +Y up, +X east, -Z north, +Z south. `rotY` is the three.js rotation about Y (0 faces +Z, +PI/2 faces +X). Camera yaw in **degrees**
(0 = north/-Z, 90 = west) everywhere a pose is given to the player (`setPose`, `alight`, `?cam=`). A ride **frame** uses `rotY` in radians.

## 1. Physics: several floors on top of each other (`ctx.physics`)

* All solids default to the vertical range **-300 .. +400** (`Y_MIN`, `Y_MAX` exported by `core/physics.js`). A wall box at -60 m is as solid as a house.
* The terrain (`heightAt`, flat 0 in Piter) is just **one floor**. It counts only when it is not above `feet + STEP_HEIGHT` (0.45 m), so a walker at y = -55 is
  never lifted to the street. `groundHeight(x, z, feetY = 1e9, roofs = true)` returns the highest surface not above `feetY + 0.45`, or **-Infinity** where there is none
  (a void). Default `feetY` means "the highest surface at all".
* **Terrain hole** `physics.addHole(cx, cz, w, d, rotY)`: inside its footprint the terrain is not a floor. Needed over every shaft / stairwell mouth (an escalator that
  starts at y = 0 and goes down: without a hole the terrain at y = 0 would lift the walker back up). `addEscalator` cuts its own hole; stairs need an explicit one.
  The visual hole in the ground mesh is the module's job (the ground plane is the environment module's mesh: ask it to leave a hole, or build the ground in pieces).
* **Walk boxes are solid columns from `bottom` to `top`** (`addWalkBox(cx, cz, w, d, rotY, topY, bottom = -300)`). A platform at -60 over nothing: pass
  `bottom = top - thickness` (e.g. `FY - 1.1`) for every floor that people can walk UNDER (a mezzanine, a platform with a tunnel below, a bridge deck), otherwise its column
  blocks everybody who is below it in the same footprint. Same for ramps: `addWalkRamp(..., yA, yB, thick = 50)` is a wedge from the surface down to `thick`; escalators use 1.2.
* **Edges.** A walker that is below the terrain (or at a terrain hole) stays on its surfaces: a step down into a void is refused like a wall, a drop of up to
  `DROP_MAX = 1.2 m` onto another surface is allowed (platform edge -> track bed), a larger one is refused. On the surface (above the terrain) nothing changed: you can still
  walk off a deck or a quay. A jump into a void ends with a **rescue**: after falling `6 m` below the last grounded spot with no surface under the feet the player is put
  back there (`player.onRescue()`, main.js shows a toast).
* **Slopes.** Ramps, escalators and stairs are continuous surfaces: slopes up to ~40 degrees are walkable at running speed. Going down them the feet **stick** to the surface
  (items flagged `sticky`: ramps, escalators, `addStairs` steps), so there is no airborne flicker and the camera does not shake (tested at 30 degrees with dt from 1/144 to 1/20).
  `addStairs(cx, cz, w, d, rotY, y0, y1, n)` rises along local +z from y0 to y1; **y1 < y0 = stairs going down**. It returns the n walk boxes.
* **Conveyors / escalators.**

```js
// escalator: bottom and top points; w = belt width; dir +1 carries up, -1 down, 0 stopped (a plain ramp); speed 0.9 m/s along the slope
const down = ctx.physics.addEscalator({ bottom: { x: -2.6, y: -60, z: 103.9 }, top: { x: -2.6, y: 0, z: 0 }, w: 1.1, dir: -1 });
down.setDir(0);            // or down.dir = +1 at any time (stop at night, reverse for the rush hour)
// positional form: (cx, cz, w, len /* horizontal run */, rotY /* points UPHILL */, yBottom, yTop, dir)
// general conveyor (moving walkway, flat if yA == yB): along +1 moves toward local +z when dir > 0
const walkway = ctx.physics.addConveyor({ cx: 0, cz: 40, w: 2, d: 60, rotY: 0, yA: -20, yB: -20, along: 1, speed: 1.2, dir: 1, hole: false });
ctx.physics.addHole(0, 52, 7.4, 104, 0);                    // the shaft footprint (terrain off)
ctx.physics.addStairs(0, 52, 3, 104, 0, 0, -60, 353);       // 30 degree stairs, 60 m down, 0.17 m risers
ctx.physics.addAABB(x0, z0, x1, z1);                         // walls / balustrades: full height, nothing else to say
```

  The player is carried at `speed * cos(slope)` horizontally **on top of its own walking** (standing = carried, walking down = fast, walking against = slow). The steps
  are drawn by the module (the physics surface is the straight line between the ends; draw treads within +-0.12 m of it). `physics.remove(item)` removes any item.
* `physics.surfaceAt(x, z, feetY, roofs, out)` -> `{ y, kind: 'terrain'|'walk'|'ramp'|'roof'|null, item }` and `physics.inHole(x, z, r)` for modules that need to know.
* **Flight is not allowed to dive.** `flightFloor` keeps the terrain as the floor of a flyer also over holes; landing (`F`) over a hole is refused ("No room to land here").

Numbers measured in `tools/under-test.mjs` (real browser, test world): standing on the 120 m escalator = 127-133 s to the bottom, walking (W) 24.5 s, running 11.7 s;
stairs at running speed down 60 m: 0 airborne frames at every frame time.

## 2. Indoor zones (`ctx.zones`, `core/zones.js`)

```js
ctx.zones.add({
  id: 'station-mayakovskaya',
  box: { x0: -20, x1: 20, y0: -75, y1: -0.3, z0: -10, z1: 430 },          // or test: (x, y, z) => boolean for a curved tunnel
  indoor: {
    name: 'Маяковская',
    sun: 0,                                      // multiplier of the sun (directional light) intensity: 0 = off
    key: { color: '#fff0da', intensity: 1.5, dir: [0.35, 0.8, 0.5] },   // optional: re-aims / recolours the directional light as a ceiling "key lamp": keeps the TOON BANDS visible
    ambient: { color: '#fff1e0', ground: '#d9c9b6', intensity: 1.9 },   // the hemisphere light = flat bright ambient
    fog: { color: '#bfae93', density: 0.006 },
    sky: false,                                  // true = keep the sky (open-air platform); false = plain background instead of the dome (bg: defaults to the fog colour)
    shadows: false,                              // false = the sun shadow pass is skipped (no wasted render, no sun through the ground)
    bloom: { bloom: 0.34, glow: 0.18, threshold: 0.95 }, vignette: 0.22, exposure: 1.0, // optional grading
    far: 420,                                    // camera far plane inside the zone (depth precision, less to draw)
  },
});
```

* Each frame the zone that contains the **camera** is looked up (last added wins; O(#zones), nothing per mesh) and blended in over **0.35 s**; with `dt = 0` (`?shot` renders,
  tools) it snaps. Moving between two zones glides the parameters. The blend is applied after the time-of-day preset (`timeofday.js` re-applies the preset every frame while a zone
  is active), so the **T key and the day/dusk/night look keep working** and the underground does not depend on them (tested: luma 157 / 159 / 166).
* `ctx.indoor = { amount 0..1, zone }` (`zone` is your definition object) and `ctx.shared.uIndoor.value` (0 outdoors .. 1 inside) are live for custom shaders.
* Outside every zone, a camera more than 0.6 m **below the terrain** gets a default indoor look (`zones.config.autoUnderground`): the ground plane is single sided and from
  below the sky must never show through it.
* A zone also decides which tagged meshes are drawn (section 4): `showUnder` (default: `box.y0 < 0`) makes the `undergroundOnly` meshes visible while the camera is inside, which is what a
  surface vestibule needs (you look down the escalator from it).
* **Look recipe** (calibrated in the test world, mean luma 140-160 of 255, no black, ~1 % white): warm emissive lamps (`mat.emissive('#ffe3b3', 1.5)`, they bloom), light
  cream / pink walls, checker floor, a dark skirting, saturated blue signs; ambient 1.9 + key light 1.5. Never rely on the sun underground: it is 0.
* The camera far plane inside a zone and `zones.config.{undergroundY: -2, deepY: -20, autoSurface: true, blendSeconds: 0.35}` are tunable.

## 3. Interaction prompts and the UI layer (`ctx.interact`, `ctx.ui`)

```js
ctx.interact.add({
  id: 'board', x: 3.5, y: -59, z: 164, radius: 3.4,                  // or at: () => ({ x, y, z }) for a moving point
  label: 'Войти в вагон', labelEn: 'Board the train',                // strings or functions (label can change: 'Start / Stop the escalator')
  key: 'KeyE',                                                       // default
  enabled: () => !ctx.playerObj.riding && trainAtPlatform(),
  onUse: () => { /* ... */ },
});
ctx.interact.remove('board'); ctx.interact.list(); ctx.interact.target;   // the one shown now
```

The nearest **enabled** entry within `radius` (3D distance from the camera) and roughly in front of the camera (+-75 degrees, unless closer than 1.2 m) shows the chip
`[E] label · labelEn` (`#interact` in index.html, in the HUD style); pressing the key (or tapping / clicking the chip: touch screens) calls `onUse`. While flying nothing is offered, while a
panel is open the key does nothing.

```js
const h = ctx.ui.panel(htmlStringOrElement, { title: 'Схема метро · Metro map', onClose: () => {}, closeLabel: 'Закрыть · Close' });  // modal overlay
h.close(); ctx.ui.close(); ctx.ui.open;       // Esc, the close button and a click on the backdrop close it
ctx.ui.toast('Станция «Вторая» · Station B');  // the HUD toast (the one the area names use)
```

While a panel is open the player input is paused (`player.inputLock`), the pointer lock is released and restored on close; main.js's global keys (T, H, M, R, 1-5) are ignored.

## 4. Visibility and batching: how to keep the metro out of the street view and vice versa

Tag your objects (on the object **or any ancestor**; the tag also survives the static batching):

| tag | helper | effect |
|---|---|---|
| `userData.undergroundOnly = true` | `ctx.underground(obj)` | drawn only while the camera is below `y = -2` m, or inside a zone with `showUnder`. Never casts sun shadows. |
| `userData.surfaceOnly = true` | `ctx.surfaceOnly(obj)` | not drawn while the camera is deeper than `-20` m |
| `userData.alwaysVisible = true` | `ctx.alwaysVisible(obj)` | never hidden by the switch (a lit sign seen from the shaft) |
| `userData.zone = 'name'` | | batches only with the same zone name |

* **Everything else that is a top-level object of the scene** (the merged cells of the city, wires, crowds, traffic ...) is hidden too at depth `< -20 m` (`zones.config.autoSurface`),
  except subtrees that contain an `undergroundOnly` / `alwaysVisible` node. So the metro view does not draw the city even if the other modules forget the tag; the street view does not
  draw the metro as long as **you** tag it. The switch toggles `visible` once per state change (hysteresis 0.5 m), not per frame; the saved `visible` is restored.
* `core/batch2.js` merges static meshes by material per cell. **Objects centred deeper than -3 m and every tagged object go to their own batches**: 64 m x 20 m (vertical) cells, never merged with street objects or
  with other tags, and an object wider than 160 m or taller than 30 m (an escalator-long strip, a 100 m tunnel vault) stays alone. Without this a mesh that spans street + platform
  would have a bounding sphere of ~100 m around the city and never be culled. The merged meshes keep the tags and `userData.sources` (how many objects went in).
  (`?batch=1`, the legacy batcher, does none of this.)
* Dynamic objects (`ctx.add`, e.g. the train) can carry the tag too. If you add tagged objects after the build, call `ctx.zones.track(obj, 'under' | 'surface' | 'always')` (or `ctx.zones.refresh()`).
* A static mesh that moves or changes (the belt of an escalator with a scrolling texture) must not be merged: `ctx.noBatch(obj)` or `userData.noBatch = true`; it stays under its tagged parent group.
* **Roof map** (`core/roofmap.js`): a top-down depth capture of the visible static scene at load; geometry at -70 m is simply below every roof and never matters (checked in
  tools/under-test.mjs: a 22 m roof with the whole metro in the scene). It must run while the camera is on the surface (it is: main.js builds it at load).
* Z-fighting: keep coplanar faces apart by 2-5 cm (clad a wall 15 cm in front of the vault ring, put a floor texture on the slab itself, not a decal); at 100 m the 24-bit depth
  buffer resolves ~4 mm (near 0.25), so 1 cm is already safe; decals use `ctx.mat.decal` (polygonOffset). `tools/zfight.mjs --only undertest --cams "<free cameras underground>"` found 139 noisy pixels
  of ~11 million in the test world (one train stripe edge).

## 5. Riding a train (`ctx.playerObj.board / alight`)

```js
const frame = (t) => ({ x: 5.4, y: -60, z: trainZ(t), yaw: 0 });           // PURE function of t = ctx.time (screenshots fast-forward t); yaw is rotY in radians
ctx.playerObj.board({
  frame,                                                                    // the moving frame (train centre, floor level)
  local: { x: -1.0, y: 0, z: 3 },                                           // where the player stands in the frame (omit: the current position, clamped)
  bounds: { x0: -1.05, x1: 1.05, z0: -28, z1: 28 },                         // the player can walk inside this rectangle of the frame
  lookRelative: true,                                                       // the view turns with the frame
  onExit: (pose) => {},                                                     // called by alight() and when something else (setPose, R) ends the ride (pose.cancelled)
});
ctx.playerObj.alight({ x: 3, y: -60, z: 364, yaw: 90 });                    // yaw in DEGREES like setPose; y omitted: the highest surface near the current feet
ctx.playerObj.riding;                                                       // boolean
```

While riding physics, roofs and the ground are suspended, F is refused ("No flight on board"), the camera follows `frame(ctx.time)` exactly (so the train mesh, which a module places from the same
function in `ctx.onUpdate((dt, t) => ...)`, never lags). In `?shot` renders the rider is still updated each frame (`dt = 0`). The schedule must be a function of `t`; to make a train wait for the
player, add a constant `shift` that you change only while it is stationary (the test world does it when a rider boards: `trainState(t + shift)`).

Ride sequence template (all of it in `undertest.js` of the original project; in this repo see `src/world/metro/ride.js`): `interact` "Board" (enabled while the train is at the platform with doors open) -> `board()` -> doors close, the profile carries the
frame 200 m in ~27 s -> at the next platform `interact` "Get off" (enabled while riding, at B, doors open) -> `alight({ x, y, z, yaw })` onto platform B.

## 6. Cameras, tests, screenshots

* `?cam=x,z,yaw,pitch` standing; `x,y,z,yaw,pitch` a **free camera at eye height y** (also underground: a no-clip debug camera that keeps its height, never reachable by input); `x,y,z,yaw,pitch,1`
  **standing** on the highest surface whose top is not above y (feet level), e.g. `?cam=0.5,-60,150,90,0,1` stands on a platform at -60. Same in `tools/shot.mjs --cams "...;..."`.
  `window.__setCam(x, y, z, yaw, pitch, stand)` and `player.setPose(x, z, yawDeg, pitchDeg, y, { stand: true })` do the same from code. Zones are evaluated for the camera in `?shot` renders (snapped).
* `node tools/physics-test.mjs` (no browser, 62 checks): floors, escalators, stairs at 4 frame times, edges, voids, rescue, shaft rim, flight, riding.
* `node tools/under-test.mjs` (real renderer, test world, 53 checks): walk down (keys from the street, then fast-forward standing / walking / running), brightness of the screenshots, zones,
  random walks (15 000 frames, never off the floors), F refused, the board / ride / get-off prompts and the ride, the panel and the escalator switch, roof map, batches, draw cost, `?shot` mode.
  Screenshots land in `shots/under/ut_*.png`.
* `node tools/smoke.mjs` must stay green: with the placeholder map its roof phase is skipped (no baked buildings), so "the surface is unchanged" was additionally proven by running the **old and the new**
  `Player` + `Physics` side by side on 120 000 random frames (walls, trees, decks, steps, a roof height map, flights and landings, flat and rolling terrain): maximum deviation 0.00e+0.
* In pages: `window.__ff(seconds, dt, keysFn)` is defined by under-test.mjs only; the engine's own hooks are `window.__advance(dt)` (advances the simulation and a rider), `window.__zones`, `window.__ctx`.

## 7. Known limits

* The audio module is not zone aware (no reverb / muffled street underground): hook `ctx.indoor.amount` in the metro module when the sound design starts.
* Zones are volumes tested against the camera point; a camera that is outdoors but looks into a lit station through a surface opening is not lit as indoors (use a zone around the opening if needed).
* `physics` colliders are boxes / cylinders / ramps: the round vault of a tunnel is a visual only; add wall boxes along it.
* A moving frame has yaw only (no pitch / roll): a train on a gradient rides level.
* The legacy batcher `core/batch.js` (`?batch=1`) does not know the tags.
