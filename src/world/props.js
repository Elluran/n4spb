// props - street furniture, trade stands, adverts, verandas and wayfinding of central Saint Petersburg (see the header of each props/*.js file).
// STATUS: built from the Yakutsk props module (Geo kit, raster world, station walker) and retuned for Petersburg (docs/research/streets.md, nevsky.md, people.md):
//   osm      benches, waste baskets, bike racks, street clocks (poles + bracket clocks with hands running as a function of t), post boxes, advertising pillars, bike-share docks,
//            a few wall ATMs from the OSM FURNITURE points
//   terraces summer verandas (iron railing, flower boxes, cane chairs, umbrellas, heaters, chalk A-frames) at the POIS cafés on the pavements, never blocking the walking lane
//   walks    benches (few on Nevsky, facing the water on the Fontanka quay, along garden paths), black cast-iron urns / cube urns / steel bins, cable cabinets
//   doors    cast-iron flower urns and pots beside shop doors
//   stands   press kiosks, ice-cream / souvenir / boat-ticket cabins, tourist stalls, carts, tubs with small trees on Nevsky, bike racks, rental scooter rows
//   ads      round advertising pillars with lit poster wraps, city-light boxes, tourist wayfinding posts
//   petro    the Petrograd side and the Spit: tourist stalls, corn / ice-cream / souvenir carts and coin telescope viewers at the Spit and the Aurora quay, ticket kiosks at the fortress
//            bridges and the Commandant pier, boat-trip booths at the piers, hire scooters and press pavilions at the metro pavilions, flower baskets on Bolshoy / Kamennoostrovsky pr.
//   vo       Vasilievsky Island (props/vo.js, phase last): Bolshoy boulevard block benches + stone vase planters, playground and promenade benches, glazed newspaper kiosks (Sredny / Bolshoy / Maly), 1970s shop
//            pavilions at the Gavan loops, banners across Maly pr., city-lights, roadside billboards + totems (OSM, props/vo-data.js), wall cameras, memorial plaques with the real inscriptions, ATMs
//   islands  (props/islands.js + props/harbour.js, phase last): park benches / bins / bollards / kiosks / boards of the 2026-10-13..15 islands, boats + pontoons of the yacht clubs, stepped granite bollards and life-buoy stands on the
//            Petrovskaya kosa club quay / mole, the light grey railing of the Petrovsky stadium bays, benches + racks of the LETI court (all harbour / railing geometry is static, in the cells of the boats)
// SERVICE  ctx.services.props = { benches [{x,z,rotY,len}], lamps [] (streets owns the lamps), bins [{x,z}], shelters [] (streets owns the shelters), kiosks [{x,z,rotY,kind}],
//   terraces [{x,z,rotY,w,d,name,poly}], racks, pillars [{x,z}], boxes (city-lights), planters (tubs), urns, clocks [{x,z,y}], stalls, billboards [{x,z,rotY,w,h}], totems, cameras, plaques [{x,z,y,text}],
//   banners [{x,z,y,w,text}], bollards [{x,z}] + boards [{x,z,rotY,text}] + pontoons [{x,z,rotY,len,y}] (islands, props/islands.js), stats }
// NOT built (deliberately): street phone booths (none in the centre: research streets.md), billboards at street level (restricted in the centre), indoor ATMs / vending machines (inside buildings), dumpsters.
// Rules: no flags / flagpoles, no sounds, no brands; nothing on carriageways, inside footprints, on metro shafts / portals, bridge decks, in front of doors or on zebra ends.
import { makeState, flushInstances, pavementStations } from './props/state.js';
import { stationGrid } from './props/sites.js';
import { registerTypes } from './props/types.js';
import { placeOsm } from './props/osm.js';
import { placeWalks } from './props/walks.js';
import { placeDoors } from './props/doors.js';
import { placeWest } from './props/west.js';
import { placePetro } from './props/petro.js';
import { placeVO } from './props/vo.js';
import { placeIslands } from './props/islands.js';
import { placeStands, placeTerraces } from './props/stands.js';
import { placeAds, finishClocks } from './props/ads.js';

// order matters: the OSM points are facts (they go first), then the verandas (they need the frontage), the facade-side things (doors, tubs, stands) and the sparse extras
const PHASES = [
  ['osm', placeOsm],
  ['terraces', placeTerraces],
  ['doors', placeDoors],
  ['stands', placeStands],
  ['west', placeWest],
  ['petro', placePetro],
  ['walks', placeWalks],
  ['ads', placeAds],
  ['vo', placeVO],                  // Vasilievsky Island (props/vo.js): with its own random stream, only inside inVO: the older districts keep every instance they had
  ['islands', placeIslands],        // the islands of 2026-10-13 / 14 (props/islands.js): LAST, with its own random stream, only inside inIsl (Yelagin, Kamenny, Aptekarsky, Petrovsky, Serny, Krestovsky)
];

export async function build(ctx) {
  const t0 = performance.now();
  const S = makeState(ctx);
  registerTypes(S);
  S.stations = pavementStations(S); S.stGrid = stationGrid(S.stations);
  (S.stats.ms = S.stats.ms || {}).state = Math.round(performance.now() - t0);
  const failed = [];
  for (const [name, fn] of PHASES) {
    const t1 = performance.now();
    try { await fn(S); } catch (e) { console.error(`[props] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); }
    (S.stats.ms = S.stats.ms || {})[name] = Math.round(performance.now() - t1);
  }
  try { S.tris += finishClocks(S); } catch (e) { console.error('[props] clocks failed:', e); failed.push('clocks: ' + (e && e.stack || e)); }
  const t2 = performance.now(); S.tris += flushInstances(S); S.stats.ms.flush = Math.round(performance.now() - t2);
  S.tris += S.panels.finish(S.root);
  ctx.services.props = { benches: S.svc.benches, lamps: S.svc.lamps, bins: S.svc.bins, shelters: S.svc.shelters, kiosks: S.svc.kiosks, terraces: S.svc.terraces, racks: S.svc.racks, pillars: S.svc.pillars, boxes: S.svc.boxes, planters: S.svc.planters, urns: S.svc.urns, clocks: S.svc.clocks, stalls: S.svc.stalls, billboards: S.svc.billboards || [], totems: S.svc.totems || [], cameras: S.svc.cameras || [], plaques: S.svc.plaques || [], banners: S.svc.banners || [], bollards: S.svc.bollards || [], boards: S.svc.boards || [], pontoons: S.svc.pontoons || [], stats: S.stats };
  if (typeof process !== 'undefined' && process.env && process.env.PROPS_DUMP) ctx.services.props.inst = Object.fromEntries([...S.inst].map(([n, l]) => [n, l.map((m) => [Math.round(m.elements[12] * 10) / 10, Math.round(m.elements[14] * 10) / 10, Math.round(Math.atan2(m.elements[8], m.elements[10]) * 100) / 100])]));      // tools/props-islands.mjs --inst: the instance lists by type, for the frozen-district proof
  S.stats.dynTris = S.dynGeo ? Math.round(S.dynGeo.tris) : 0;
  S.stats.buildMs = Math.round(performance.now() - t0);
  if (typeof process !== 'undefined' && process.env && process.env.PROPS_DEBUG) {
    console.log('PROPS', JSON.stringify(S.stats));
    const r = (a) => a.map((o) => `${Math.round(o.x)},${Math.round(o.z)}`).join(' ');
    console.log('KIOSK', S.svc.kiosks.filter((k) => k.x < -595).map((o) => `${o.kind}@${Math.round(o.x)},${Math.round(o.z)}`).join(' '));
    console.log('TERR-W', r(S.svc.terraces.filter((t) => t.x < -595)));
    console.log('PIL', r(S.svc.pillars), 'CLK', r(S.svc.clocks.filter((c) => c.x < -595)), 'TUB-W', r(S.svc.planters.filter((c) => c.x < -595)));
  }
  if (failed.length) throw new Error('props phases failed:\n' + failed.join('\n'));
}
