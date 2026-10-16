// landmarksK/groups.js - the layout.GROUPS sub-groups of module landmarksK (pure data, no imports: layout.js merges them). Fields as in layout.js GROUPS: { key, name, nameEn, ids: [OSM building ids + parts parents], osm: [non-building OSM ids], at: [x, z], note }.
// Everything listed here is DRAWN by landmarksK (docs/research/saviour-mikhailovsky.md section 11): the church w28966446 with its precinct buildings, the Winkler fence runs and the inner spear fence,
// the Mikhailovsky Palace (Russian Museum) with the Rossi wing, the Benois wing, the Ethnographic Museum wing and the street fence / hedges / lions, the Rossi pavilion in the garden (+ its 60 OSM parts through
// `parent`) with the busts, and the Pushkin monument with its flower bed on Arts Square.  The garden lawns, trees, ponds and paths stay with `environment` / `streets` (generic but fine); the canal quay too.
export const GROUPS_LIST = [
  { key: 'saviour-church', name: 'Спас на Крови', nameEn: 'Church of the Saviour on Spilled Blood (Parland, 1907) with the ticket kiosk, Iverskaya chapel, servants house and the Winkler fence', ids: ['w28966446', 'r15746145', 'r15746147', 'r15746223', 'w623509603'],
    osm: ['w127645397', 'w127645395', 'w127645399', 'w588807856', 'w102265046', 'w1164101336', 'w1164101337'], at: [-1255, -851],
    note: 'cathedral w28966446 (81 m), Iverskaya chapel-sacristy r15746145, School of Folk Art r15746147, kiosk r15746223, toilets w623509603; fences: Winkler w127645397 / 95 / 99 / w588807856, inner spear fence w102265046, queue fences w1164101336 / 37' },
  { key: 'russian-museum', name: 'Русский музей (Михайловский дворец)', nameEn: 'Mikhailovsky Palace (Russian Museum) with the Rossi wing, Benois wing, Ethnographic wing and the street fence', ids: ['r1502547', 'r54363', 'r2614477', 'w235984453'],
    osm: ['w66875015', 'w127674104', 'w1229081776', 'w1229081777', 'w308976598', 'w308976599', 'n7080782987', 'n10180478942', 'n6580613995'], at: [-1061, -697],
    note: 'palace r1502547, Rossi wing r54363, Benois wing r2614477, Ethnographic museum w235984453; gate fence w66875015 / w127674104, forecourt hedges, the two Medici lions, the stele' },
  { key: 'rossi-pavilion', name: 'Павильон Росси', nameEn: 'Rossi pavilion on the Moika (Mikhailovsky Garden) with three busts', ids: ['w30353982'], osm: ['n1412456535', 'n1412626295', 'n1412626297'], at: [-971, -940],
    note: 'OSM w30353982 + 60 parts (parent): stylobate, columns, cornices, rotunda roof' },
  { key: 'mikhailovsky-garden', name: 'Михайловский сад', nameEn: 'Mikhailovsky Garden: woods, lime allees, ponds (the generic trees leave it)', ids: [],
    osm: ['r2614476', 'r1740860', 'w145815121', 'w145816613', 'w128976800', 'w691424548', 'w691424549', 'w691424550', 'w62802443'], at: [-1020, -830],
    note: 'park r2614476 (93,490 m2) and the wood polygons (r1740860 with 5 holes and the small ones at the edges) are planted by landmarksK (grove.js); ponds w62802443' },
  { key: 'pushkin-square', name: 'Памятник Пушкину на площади Искусств', nameEn: 'Pushkin monument (Anikushin, 1957) with its flower bed on Arts Square', ids: [], osm: ['n477027518', 'w179738847', 'w638329070'], at: [-1099, -539],
    note: 'statue node n477027518; the bed w179738847 (an AREA footway) and the square polygon w638329070 (the garden: the generic ground must not pave it; trees planted here) belong to this group' },
];
