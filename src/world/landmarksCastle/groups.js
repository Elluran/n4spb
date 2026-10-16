// landmarksCastle/groups.js - the layout.GROUPS sub-groups of module landmarksCastle (pure data, no imports: layout.js merges them). Fields as in layout.js GROUPS:
// { key, name, nameEn, ids: [OSM building ids + parts parents], osm: [non-building OSM ids], at: [x, z], note }.
// Everything listed here is DRAWN by landmarksCastle (docs/research/summer-garden.md section 8): the castle r238571 (the court polygon is a hole of it; the court paving r8102789 is drawn by the module),
// the small stair block w688660632 in the court, the two Kordegardiya guardhouses, the Peter I monument (n1041154862, flower bed, the iron-and-granite precinct), the Paul I statue in the court
// (n4428331026) and the Three-part bridge with its footways and the railings round the two islands of the moat.
// The ordinary houses around (Sadovaya, Pestelya, the Fontanka quay), the lawns / trees of the precinct and the water of the moat stay with city / environment.
export const GROUPS_LIST = [
  { key: 'engineering-castle', name: 'Михайловский (Инженерный) замок', nameEn: 'Mikhailovsky (Engineers) Castle: three tiers, rounded corners, court, south portal with obelisks, green copper roofs, gilded spire', ids: ['r238571', 'w688660632'],
    osm: ['r8102789', 'n4428331026', 'w619210511', 'w619210512', 'w619210513', 'w619210514', 'w619210515', 'w619210516', 'w619210517', 'w619210518', 'w619210519', 'w688660627', 'w688660630', 'w688660634', 'w688660636', 'w688660638', 'w688660641', 'w688660643', 'w691424552', 'w459074429', 'w371587760'],
    at: [-764, -885],
    note: 'OSM relation r238571 (outer ring + 15-vertex court + two tiny holes filled), the court footway area r8102789, court stairs / paths, the Paul I statue in the court' },
  { key: 'three-part-bridge', name: 'Трёхчастный мост', nameEn: 'Three-part bridge in front of the castle portal (three short stone arches over the restored Voskresensky canal) with the island railings', ids: [],
    osm: ['w568786525', 'w568786527', 'w568786528', 'w583732812', 'w583732817', 'w583732822', 'w583732824', 'w568786523', 'w568786524', 'w568786531', 'w568786520', 'w568786521', 'w568786522', 'w583732810', 'w583732814', 'w583732819', 'w583732827', 'w459074433', 'w459074434', 'w459074435', 'w459074437', 'w568786516'],
    at: [-734, -825],
    note: 'decks w568786525 / 27 / 28 (service, 4 m), footway decks w583732812 / 17 / 22 / 24, the approaches, the moat railings w459074433 / 34 / 35 / 37' },
  { key: 'castle-guardhouses', name: 'Кордегардии Михайловского замка', nameEn: 'The two Kordegardiya guardhouses on Klenovaya alley (Western and Eastern pavilions)', ids: ['w28691665', 'w28691666'], osm: [], at: [-674, -647],
    note: 'Западный павильон w28691665 (Инженерная ул. 8), Восточный павильон w28691666 (Инженерная ул. 10): orange three-storey pavilions with a Tuscan portico' },
  { key: 'peter-monument', name: 'Памятник Петру I у Михайловского замка', nameEn: 'Peter I monument (Rastrelli, 1747 / 1800) with its pink Olonets marble pedestal and the flower bed', ids: [], osm: ['n1041154862', 'w1256886049', 'w1256886060', 'w1329323694'], at: [-712, -757],
    note: 'statue node n1041154862, the two round flower beds w1256886049 / 60 and the low fence w1329323694 round the pedestal' },
];
