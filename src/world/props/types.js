// props/types.js - registers every instanced prop type (name -> Geo factory). Variants differ in colour / length only; the seeded rng makes the plant mixes deterministic.
import * as F from './furniture.js';
import { registerStandTypes } from './stands.js';
import { registerAdTypes } from './ads.js';
import { COL } from './furniture.js';

export function registerTypes(S) {
  const rng = S.ctx.rng;
  const T = S.type;
  // benches
  T('benchPark', () => F.benchPark(1.8, COL.wood));
  T('benchParkL', () => F.benchPark(2.1, COL.woodL));
  T('benchParkD', () => F.benchPark(1.8, COL.woodD));
  T('benchGranite', () => F.benchGranite(2.0));
  T('benchWhite', () => F.benchPark(1.9, COL.paintWhite));                // the white-painted garden benches of the west (Kazan, Catherine, Isaac's, Alexander: P19-P24, P41, P107)
  T('benchWhiteL', () => F.benchPark(2.3, COL.paintWhite));
  // bins
  T('binCast', () => F.binCast());
  T('binCube', () => F.binCube());
  T('binSteel', () => F.binSteel());
  // plants / pots
  T('urnCast0', () => F.urnCast(rng('urn0'), false));
  T('urnCast1', () => F.urnCast(rng('urn1'), false));
  T('urnCastBig', () => F.urnCast(rng('urnB'), true));
  T('tubBirch', () => F.tubTree(0, rng('tub0')));
  T('tubMaple', () => F.tubTree(1, rng('tub1')));
  T('tubLilac', () => F.tubTree(2, rng('tub2')));
  T('pot0', () => F.flowerPot(rng('pot0')));
  T('pot1', () => F.flowerPot(rng('pot1')));
  T('planterR0', () => F.roundPlanter(rng('plr0')));
  T('planterR1', () => F.roundPlanter(rng('plr1')));
  T('wallBasket0', () => F.wallBasket(rng('wb0')));
  T('wallBasket1', () => F.wallBasket(rng('wb1')));
  // misc street items
  T('rack5', () => F.bikeRack(5, 0.6));
  T('rack3', () => F.bikeRack(3, 0.6));
  T('bicycle', () => F.bicycle('#3f8f5b'));
  T('bicycleB', () => F.bicycle('#2f64b5'));
  T('scooter', () => F.scooter());
  T('aFrameR', () => F.aFrame(COL.burgundy));
  T('aFrameK', () => F.aFrame(COL.black));
  T('cabinet', () => F.cableCabinet());
  T('postBox', () => F.postBox());
  T('heater', () => F.heater());
  T('signPole', () => F.signPole());
  registerStandTypes(S);
  registerAdTypes(S);
}
