# Facade labels: the shared registry (`ctx.services.labels`)

Everything that hangs flat on a wall (street-name plates, house-number plates, shop fascias, bracket clocks, ads, address plates) must not overlap another label on the same wall:
two labels in one plane z-fight or cross each other (user report 2026-10-06, poses `-328.9,1.5,553.7,20.3,9.6` and `-300,1.5,-33.2,-268,2.1`).
One registry, one rule: **reserve the rectangle before you draw; if the registry says no, do not draw (or move) the label.**

Code: `src/world/streets/labels.js` (`makeLabels()`), published by `streets.js` as `ctx.services.labels` before any plate is built
(build order: environment, streets, city, landmarks, props ...). A module that runs without streets (headless harness) makes its own with `makeLabels()` (the city does: `city/slots.js labelRegistry(ctx)`).

## API

```js
const labels = ctx.services.labels;            // optional chaining: may be absent
labels.reserve(buildingId, x, y, z, w, h, nx, nz, kind) // -> true: the rectangle is yours, draw it   |   false: occupied, nothing recorded
labels.isFree(x, y, z, w, h, nx, nz)           // test only
labels.list()                                  // [{ bld, x, y, z, w, h, nx, nz, kind }]
labels.count(); labels.clear();
```

* `(x, y, z)` = the **centre** of the rectangle on (or up to 60 cm in front of) the wall; `w` x `h` metres; `(nx, nz)` = the unit normal pointing **out of the wall** (the wall axis is `(nz, -nx)`).
* Collision = same facing (normals within ~37 degrees) AND within 0.7 m of one plane AND overlapping along the wall AND in height (2 cm margin). Labels on different walls or at different heights never collide.
* `buildingId`: `b.id` of the building (any stable value; 0 if unknown). `kind` is free text; the ones in use: `'plate'` (street-name plate), `'number'` (house-number plate of streets/plates.js), `'shop'`, `'awning'`, `'plate-city'`, `'pipe'`, `'ac'`, `'clock'`.
* Use `x, y, z` of the geometry you really draw (include the standoff: plates 3 cm, sign 3.5 cm) and the real size including frames; for a projecting object (awning, bracket clock) reserve its projected rectangle on the wall.

## Priority = order of reservation

1. `streets.js` (built first): street-name plates (0.75 x 0.47 m at 4.05 m, corner houses) with the number plate below (0.75 x 0.2 m), then the number-only plates (0.75 x 0.2 m at 3.1 m).
2. `city` (fix-city, `city/slots.js`): shop fascias, awnings, the city's own address plates (`labels.has(buildingId, 'number')` is checked first: a house whose number plate hangs from streets/plates.js gets no second one), downpipes, AC units.
3. `props` (`props/ads.js addClock`): wall clocks.

A module that is built later simply asks and skips: `if (labels && !labels.reserve(...)) continue;`. Do not "move" a plate: the plates are placed at the corners of the street arms (one per corner, 7 m apart).

## Diagnosis recipe (z-fight reports)

`node tools/shot.mjs --only environment,streets,city,props --cams "x,y,z,yaw,pitch" --out shots/<you>/a` (5-number free camera, yaw 0 north, 90 west, 180 south, -90 east; back off 8-10 m and pitch 12-15 degrees
to see the sign band: the reported poses sit 0.5 m from the glass), then `node tools/zfight.mjs` on the same cameras. A label pair that crosses shows two fascias printed over each other.
