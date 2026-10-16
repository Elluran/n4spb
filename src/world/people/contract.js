// people/contract.js - the interface between the two halves of the people module.
//
//   CHARACTERS (chars.js, rig.js, anim.js, look.js, items.js, kit.js, lineup.js): how a person LOOKS and MOVES its limbs: outfits, faces, hair, skin tones, hand-held items,
//     bikes / scooters / prams / dogs, poses as pure functions of the state below, instanced meshes, per-instance colours.
//   SIMULATION (people.js, nav.js, sim.js, scenes.js): where people ARE and what they DO: routes, signals, queues, benches, fountain kids, the player, spawning, density.
//
// The simulation never touches a part matrix or a colour; the characters never decide where somebody goes. They talk through exactly this:
//
//   const crowd = createCrowd(ctx);                 // chars.js
//   const spec  = makeSpec(rng, opts);              // look.js: a random person; opts below
//   const i     = crowd.add(spec);                  // register BEFORE finalize (instanced meshes are sized from the registered people); returns the person index
//   crowd.finalize();                               // allocates the InstancedMeshes (ctx.add), per-instance colours, accessory sets
//   crowd.render(i, st, t);                         // every frame for every visible person: writes all part matrices (+ vehicle / pram / dog / held items)
//   crowd.hide(i);                                  // person i is not drawn (inside a building, culled by distance / view): its instance slots are freed; render(i, ...) brings it back
//   crowd.renderFar(i, st);                         // far LOD (the simulation calls it beyond sim.farR m): ONE 84-triangle block figure in the person's palette colours, one matrix write
//   crowd.endFrame();                               // once per frame after all render / hide calls: flags the instance buffers
//   crowd.setNight(k);                              // 0..1: sunglasses off / phone screens glow (optional, cheap, called when ctx.shared.uNight changes by > 0.1)
//   crowd.trisPerPerson, crowd.trianglesAll, crowd.drawCalls, crowd.count, crowd.shownCount   // statistics (the instanced meshes only draw the people that hold a slot: count = highest slot + 1)
//
// ---- makeSpec(rng, opts) options (all optional) --------------------------------------------------------------------------------------------------------------------
//   role     'walk' (default: anybody, the research template mix) | 'office' | 'kid' (5-12 y) | 'toddler' (2-4 y) | 'parent' (adult with a pram; spec.pram = true) | 'rider' (spec.vehicle set) |
//            'courier' (plain square thermal bag) | 'elder' | 'student' | 'dogwalker' (spec.dog set) | 'sport' | 'vendor' | 'tourist' (cap, camera, crossbody) | 'guide' (vest + lanyard +
//            a plain coloured UMBRELLA, never a flag; opts.guideCol) | 'follower' / 'asian' (group cap colour opts.cap) | 'traveler' (suitcase, backpack) | 'police' | 'staff' | 'tout' |
//            'busker' (guitar) | 'painter' (easel) | 'cleaner' (broom) | 'statue' (gold) | 'bride' / 'groom' / 'guest' | 'date' (bouquet)  - the 28 templates of docs/research/people.md S8
//            'cadet' (Nakhimov school summer whites) | 'angler' (khaki vest, panama, a fishing rod) | 'beach' (sunbather: trunks / swimsuit top)  - the Petrograd side (people/petro.js)
//   age      'child' | 'teen' | 'adult' | 'elder' | null (the role decides)
//   fem      true | false | null (random)
//   vehicle  null | 'bike' | 'escooter' (rental e-scooter, yellow stem) | 'kick' (child kick scooter) | 'balance' (child balance bike); the person is then ALWAYS drawn riding when st.mode = MODE.RIDE
//   weights  { slavic, central, east, caucasus, south, mideast, african } override of the mix of faces / skin / hair (default: docs/research/people.md S7)
//   suitcase true | false | hex (rolling suitcase in the left hand), cap (hex of a group cap), guideCol (umbrella / vest colour), bouquet (hex), dog, pram
//
// ---- the spec the simulation reads (set by makeSpec, never changed by the simulation) ------------------------------------------------------------------------------
//   spec = { id, arch (archetype id, string), age, fem, h (height, m), r (personal radius for avoidance, m: adult 0.23, child 0.17, with pram 0.42, with bike 0.45),
//            speed (preferred walking speed m/s, +-12 % individual; riders: bike 3.6, escooter 4.2, kick 2.4), vehicle, pram (bool), dog (null | {kind}), seed (0..1000), guide (bool), role,
//            phone (bool: likes looking at the phone), glasses (bool), hat (string|null), bag: null | 'hand' | 'shoulder' | 'backpack' | 'courier' | 'crossbody' }
//
// ---- the state the simulation passes to crowd.render (all numbers; the simulation reuses ONE object) --------------------------------------------------------------------
//   st = { x, y, z,        feet position (y = height of the surface under the feet: 0 ground, 0.03 asphalt / zebra, 0.12 pavement / square paving, bench rim 0.45 ...)
//          yaw,            rotY, 0 faces +Z (south); forward = (sin yaw, cos yaw)
//          speed,          current forward speed, m/s (0 = standing); the walk / run / ride cycle blends with it (walk -> jog above ~2 m/s)
//          dist,           cumulative distance walked (m), monotone; the cycle phase = dist / stride so that feet never slide
//          turn,           yaw rate, rad/s (lean of riders in curves, body twist)
//          mode,           MODE.WALK (also standing still) | MODE.SIT | MODE.RIDE (spec.vehicle)
//          seatH,          MODE.SIT: seat surface height above st.y (bench 0.45, fountain rim 0.4, kerb 0.15 ...)
//          gesture, gk,    GESTURE.* and its blend weight 0..1 (the simulation ramps gk; the poses are smooth functions of it)
//          look, lookK }   head yaw relative to the body (rad, + = to the person's left), blend 0..1 (a glance at the camera / the traffic / the partner)
// Everything else (arm swing, breathing, weight shifts, hair, bag swing, pedalling, wheel spin, dog leash, pram) is the characters' business and a PURE function of
// (st, spec, t): no pops, no sliding feet, EVERY pose field written on every call (the Moscow head-flick lesson: a scratch pose shared between people must be fully overwritten).
// The dog / pram / bike follow the person from the state: nothing extra is passed.
export const MODE = { WALK: 0, SIT: 1, RIDE: 2 };
export const GESTURE = { NONE: 0, PHONE: 1, CALL: 2, TALK: 3, PHOTO: 4, SMOKE: 5, EAT: 6, POINT: 7, WAVE: 8, SPLASH: 9, WATCH: 10, LOOKAROUND: 11, SELFIE: 12, PLAY: 13, PAINT: 14, SWEEP: 15, GUIDE: 16, POSE: 17 };
/** a fresh render state (the simulation keeps one per person or one shared scratch object) */
export const newState = () => ({ x: 0, y: 0, z: 0, yaw: 0, speed: 0, dist: 0, turn: 0, mode: MODE.WALK, seatH: 0.45, gesture: GESTURE.NONE, gk: 0, look: 0, lookK: 0 });
