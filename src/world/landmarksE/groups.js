// landmarksE/groups.js - the layout.GROUPS sub-groups of module landmarksE (pure data, no imports: layout.js merges them). Fields as in layout.js GROUPS: { key, name, nameEn, ids: [OSM building ids + parts parents], osm: [non-building OSM ids], at: [x, z], note }.
// Everything listed here is DRAWN by landmarksE (docs/research/gostiny-dvor-ostrovsky.md); OWNS_GROUPS in landmarksE.js names the sub-groups that are really implemented.
export const GROUPS_LIST = [
  { key: 'gostiny-dvor', name: 'Большой Гостиный двор', nameEn: 'Great Gostiny Dvor (Nevsky 35 / Sadovaya 17)', ids: ['r1147588', 'r9241917', 'r8605230', 'w115428587', 'w115428582', 'w115428590', 'w115428581'],
    osm: ['r16467256'].concat(Array.from({ length: 44 }, (_, i) => 'w' + (1531185901 + i))), at: [-1122, -108],
    note: 'the arcade ring r1147588 (parts follow the parent: w6204657xx), its duplicate ways r9241917 / r8605230 and the small buildings in the great court (w1154285xx); the promenade paving r16467256 and its 44 lawn islands (OSM flowerbeds w15311859xx)' },
  { key: 'catherine-garden', name: 'Екатерининский сад и памятник Екатерине II', nameEn: 'Catherine Garden with the Catherine II monument (Ostrovsky Square)', ids: [],
    osm: ['r8280616', 'r8280613', 'r8280619', 'w224950348', 'w304476043', 'w304476046', 'w586436087', 'w586436088', 'w586436090', 'w586440726', 'r8280614', 'r8280615', 'r8280617', 'r8280618',
      'w595914086', 'w595914087', 'w595914088', 'w595914089', 'w595914090', 'w595914091', 'w595914092', 'w595914093', 'w595914094', 'w595914095', 'w595914096', 'w595914097', 'w595914098', 'w595914099',
      'w586440721', 'w586440722', 'w586440723', 'w586440724', 'w586440727', 'w586440728', 'w586440729', 'w28893951', 'w586735885', 'w586436085'],
    at: [-805, -86], note: 'garden outline (fence rectangle 68 x 148 m), the sett ring r8280616, the gravel paths r8280613, lawns + scrub, the fence ways and gates, the monument memorial w586436085 and the four candelabra' },
  { key: 'alexandrinsky-theatre', name: 'Александринский театр', nameEn: 'Alexandrinsky Theatre (Rossi, 1832) with the Apollo quadriga', ids: ['w28893849'], osm: [], at: [-844, 70],
    note: 'OSM w28893849 (body u 332-374, v 216-293 + the two 8-column side porticoes)' },
  { key: 'national-library', name: 'Российская национальная библиотека', nameEn: 'Russian National Library (corner, Rossi wing)', ids: ['r419489'], osm: [], at: [-889, -116],
    note: 'OSM r419489 (Nevsky 37 / Ostrovsky 1-3): the Sokolov corner with 6 Ionic columns, the Nevsky wing, the Rossi wing on the square' },
  { key: 'anichkov', name: 'Аничков дворец, Кабинет, павильоны Росси, ограда', nameEn: 'Anichkov Palace, Cabinet building, Rossi pavilions, fence and gate', ids: ['r1517638', 'r1517637', 'r3798383', 'r6754929', 'r6754928'],
    osm: ['w457093010', 'w20941243', 'w131817482', 'w131817483', 'w131817484', 'w131820046', 'w830713071', 'w350948211', 'w753246200'], at: [-640, -60],
    note: 'Cabinet building r1517638 + Fontanka 39 litV r1517637, the palace r3798383 (garden front west), the two pavilions, the eagle fence along the square and Nevsky, the gate, the 4 m walls' },
  { key: 'ostrovsky-houses', name: 'Дома площади Островского', nameEn: 'Houses of Ostrovsky Square (Nos 2, 2A, 5, 7 and the rear blocks)', ids: ['w66519297', 'w66519259', 'w66583112', 'r1494149', 'w66583099', 'w105365009'], osm: [], at: [-850, 110],
    note: 'Ostrovsky 7 (Credit Society, atlantes), 5 (pink, green turret), 2 (grey granite), 2A (black granite gate house), litB blocks' },
];
