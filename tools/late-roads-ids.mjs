// tools/late-roads-ids.mjs - the OSM way ids of the roads that the bake DROPS (highway=construction / proposed) but that are real, lasting streets of Vasilievsky Island and its Spit:
// the three named stubs that left a hole in the street grid (docs/research/vo-infra-tasks.json task 'streets', item 6; 2026-10-07). Pure data, shared by
//   tools/bake-osm.mjs          (a full bake keeps these ways as roads, class = construction=* or residential, flag late:1, in the LAST part file (V12): the END of the ROADS list, so that the
//                                index of every other way stays what it was: the streets output depends on it, tools/streets-signature.mjs) and
//   tools/streets-late-roads.mjs (writes src/world/data/late-roads.js from the raw layer WITHOUT a bake; streets/net.js appends those records after ROADS, skipping ids that ROADS holds already).
// Everything else that is built or proposed on the island (the Shkiperskiy protok interchange, ZSD ramps, ul. Shefnera, Speranskogo, Pesochnaya nab., the Makarova embankment rebuild) stays out.
export const LATE_ROAD_IDS = new Set([
  241229734,      // Биржевой проезд, 111 m, the Spit behind the Exchange (one lane, one-way, asphalt)
  1412166279,     // 6-7-я линии В.О., 80 m, the stub between the Makarova embankment and the 6-7 line (two lanes)
  1096055337,     // Кадетский переулок, 68 m, between Bolshoy pr. and Universitetskaya emb. (two-way, asphalt)
]);
