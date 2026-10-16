// landmarksI/groups.js - the layout.GROUPS sub-groups of module landmarksI (pure data, no imports: layout.js merges them). Fields as in layout.js GROUPS: { key, name, nameEn, ids: [OSM building ids + parts parents], osm: [non-building OSM ids], at: [x, z], note }.
export const GROUPS_LIST = [
  { key: 'winter-palace', name: 'Зимний дворец', nameEn: 'Winter Palace (Rastrelli, 1762)', ids: ['r69424', 'w1230807517'], osm: [], at: [-2091, -893],
    note: 'r69424 (+ the little kiosk w1230807517 in the Great Courtyard) with its small parts r11490110 / r11490111 / r11495928 (steps / porch boxes drawn inside the ring): walls, three gateways + passages, courtyard, roof statues, Great Church crown, turret' },
  { key: 'hermitage-museum', name: 'Эрмитаж: Малый, Старый, Новый, театр, арка над Зимней канавкой', nameEn: 'Hermitage buildings (Small, Old, New, Theatre) and the canal arch', at: [-1950, -1060],
    ids: ['r1067948', 'r270634', 'r1202918', 'r1084724', 'r8092295', 'r8092328', 'w549454802', 'w549454801', 'w549454806', 'r8201892', 'r8092312', 'w567780996'],
    osm: ['n5546742967', 'n5546742968', 'n5553493449', 'n5553493450', 'n5553493451', 'n5553493452', 'n5546742951', 'n5546742952', 'n5546742953', 'n5546742954', 'n5546742955', 'n5546742956', 'n5546742957', 'n5546742958', 'n5546742959', 'n5546742960', 'n5546742961', 'n5546742962', 'n5546742963', 'n5546742966', 'n5553493445', 'n5553493446', 'n5570352159', 'n5570352160', 'w579071832', 'n5553493447', 'n5553493448', 'n5553493453', 'n5553493454'],
    note: 'Small Hermitage r1067948, Old r270634, New r1202918 (+ parts r8210604-06, the portico of the ten atlantes at w579071832), Theatre r1084724, the gallery arch r8092295 over the Winter Canal, links and annexes; the 29 statue-niche nodes of the New Hermitage' },
];
