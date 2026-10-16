// drive/cars/tuning.js - what makes the three drivable cars FEEL different (the garage of the Moscow Railway Station): the handling overrides, the masses, the engine voices and the HUD words.
// Applied through createHandling(ctx, tuning) (drive/handling.js: every constant of the red coupe lives in COUPE_TUNING there; a car overrides only what differs) and through
// createCarSound(audio, profile) / hud.setProfile(...) / the registry (drive/cars/index.js). The coupe's entry is empty: no override = exactly the old constants.
// The table with the measured numbers (0-100, top speed, braking distance, turning circle) is in docs/research/garage-2026.md; `node tools/drive-garage-handling.mjs` re-measures it.
//
//                   coupe       truck (taxi pickup)         lada 2106
//   mass            1350 kg     2970 kg (2.2 x)             945 kg (0.7 x)
//   acceleration    15.5 m/s2   12.4 (80 %)                 17.0 (110 %)
//   top speed       VMAX 48     40.8 (85 %)                 51.8 (108 %)       (the speed where the engine force meets the air drag is a bit lower than VMAX)
//   brakes          30 m/s2     21 (longer stop)            24.5 (soft old drums)
//   steering        quick       soft: slow turn-in, low grip  lively: quick turn-in, loose tail, early slide
//   body            flat        rolls 1.6 x, lazy springs    the model leans 1.25 x / 1.3 x by itself (lada2106.js set())
//   nitro           x1.38 / 1.9  x1.30 / 1.5 (electric boost) x1.34 / 1.8
// `durability` (damage.js recordDamage): a stout stainless body crumples less per hit than the soft old Zhiguli metal.

/** body weights (kg): the red coupe is 1350 (the unit of the traffic impact ratios), the truck 2.2 x, the Lada 0.7 x */
export const MASS = { coupe: 1350, truck: 2970, lada: 945 };

/** handling overrides on top of COUPE_TUNING (drive/handling.js); the geometry fields (hf, hr, hw, smokeZ, smokeY) are derived from the spec by tuningFor() */
export const TUNING = {
  coupe: {},
  truck: {
    acc: 12.4, vmax: 40.8, brake: 21, revAcc: 7, vrev: 7, nitroVmax: 1.30, nitroAcc: 1.5, nitroDrain: 0.25, nitroRefill: 0.035,
    gearTop: [46, 46, 46, 46, 46, 46], maxGear: 1,                                   // an electric drive: one gear, the "rpm" is the motor speed
    steerIn: 4.4, steerOut: 7.5, maxLat: 18, yawGrip: 25.2 * 0.80, steerLock: 0.50, grip: 7.5, scrub: 0.13, handDecel: 5, handYaw: 0.48, handYawMax: 1.6, gripHand: 1.5,
    engBrake: 2.2,                                                                   // regenerative braking when the throttle is released
    rollK: 0.0048, rollMax: 0.088, pitchK: 0.0062, pitchMax: 0.07, bodyResp: 6.2, impactDecay: 6.5,
  },
  lada: {
    acc: 17.0, vmax: 51.8, brake: 24.5, revAcc: 8, nitroVmax: 1.34, nitroAcc: 1.8,
    gearTop: [11, 20, 29, 39, 56, 56], maxGear: 5,                                   // the 2106's five-speed box
    steerIn: 8.6, steerOut: 10, maxLat: 20, yawGrip: 25.2 * 0.92, steerLock: 0.60, grip: 6.3, scrub: 0.12, handDecel: 6.5, handYaw: 0.66, handYawMax: 2.6, gripHand: 1.0,
    rollK: 0.0034, rollMax: 0.07, pitchK: 0.0046, pitchMax: 0.06, bodyResp: 7.4, impactDecay: 3.6,      // (lada2106.js set() leans the model a further 1.25 x pitch, 1.3 x roll)
  },
};

/** how stout the body is (damage.js: crush per hit is divided by it) */
export const DURABILITY = { coupe: 1, truck: 1.3, lada: 0.85 };

/** the engine voice (drive/sound.js createCarSound(audio, profile)); every field optional, the coupe's voice is the default */
export const SOUND = {
  coupe: {},
  // a low electric hum: sines and a triangle, an octave of whine that climbs with the speed, almost no intake noise and no gear blips: never an alarm
  truck: { types: ['sine', 'triangle', 'sine'], f0: 38, fk: 96, subRatio: 2, detune: 1.002, gains: [0.55, 0.30, 0.16], lpBase: 160, lpRpm: 520, lpThr: 260, lpQ: 0.7, engBase: 0.10, engThr: 0.12, engRpm: 0.07, intake: 0.25, blip: false, wind: 1.1, volume: 0.9 },
  // a rough old four: a tad lower and grainier, a wider detune beat, a louder intake / valve rattle, a soft blip at every shift
  lada: { types: ['sawtooth', 'square', 'square'], f0: 24, fk: 104, subRatio: 0.5, detune: 1.016, gains: [0.45, 0.30, 0.34], lpBase: 200, lpRpm: 1150, lpThr: 700, lpQ: 3.0, engBase: 0.11, engThr: 0.19, engRpm: 0.05, intake: 1.8, blip: true, wind: 1.0, volume: 0.9 },
};

/** HUD words per car (drive/hud.js setProfile): the label of the boost bar, the gear letter of a one-gear car, the name pill */
export const HUD = {
  coupe: { boost: 'NITRO', gearD: false },
  truck: { boost: 'BOOST', gearD: true },
  lada: { boost: 'NITRO', gearD: false },
};

/** the full handling tuning of one car: its overrides + the spec + the footprint probes (they follow the real body: front / rear overhang, half width) + where the damage smoke rises */
export function tuningFor(id, spec) {
  if (id === 'coupe') return { spec };                    // every other constant stays the old one, bit for bit
  return { ...(TUNING[id] || {}), spec, hf: spec.front - 0.02, hr: -spec.rear + 0.08, hw: spec.W / 2 + 0.04, smokeZ: spec.front - 0.9, smokeY: spec.hgt * 0.63 };
}
