// landmarksF/groups.js - the layout.GROUPS sub-groups of module landmarksF (pure data, no imports: layout.js merges them). Fields as in layout.js GROUPS: { key, name, nameEn, ids: [OSM building ids + parts parents], osm: [non-building OSM ids], at: [x, z], note }.
// Everything listed here is DRAWN by landmarksF (docs/research/kazan-cathedral.md): the cathedral relation r11763697 (its three OSM parts w827660972 / w1042588710 / w1043505419 are claimed through `parent`),
// the paving of Kazan Square, the garden (park outline, lawns, hedges, the two monument plazas, the fountain), the Voronikhin garden (park, fence, 1809 fountain) and Singer House (w102305449 + the cone part).
export const GROUPS_LIST = [
  { key: 'kazan-cathedral', name: 'Казанский собор', nameEn: 'Kazan Cathedral (Voronikhin, 1811) with the colonnade and the pavilions', ids: ['r11763697'], osm: ['w638329474'], at: [-1493, -200],
    note: 'OSM r11763697 is one outline (cross + colonnade + pavilions, height 22); parts: the dome stack. Square paving w638329474 (Kazanskaya / Kazan Square).' },
  { key: 'kazan-garden', name: 'Казанский сквер', nameEn: 'Kazan Square garden: lawns, hedges, fountain, Kutuzov and Barclay de Tolly monuments', ids: [],
    osm: ['w115318448', 'w28966517', 'w101292108', 'w101292109', 'w101292110', 'r12399739', 'w1216771443', 'w1216771444', 'w1216771445', 'w1216771446', 'w1216771447', 'w1216771448', 'w101292107',
      'n318501546', 'n318501570', 'w1216771449', 'w1216771450', 'w1216771451'], at: [-1469, -285], note: 'garden outline + fence w115318448, flower beds = the monument plazas w1216771447 / w1216771448' },
  { key: 'voronikhin', name: 'Воронихинский сквер', nameEn: 'Voronikhin garden (fence with granite pylons, 1809 fountain)', ids: [], osm: ['r2050448', 'w151672020', 'n2306201359', 'w830700577', 'w830715013'], at: [-1573, -227],
    note: 'park r2050448, Voronikhin fence w151672020, Thomon fountain n2306201359, the low fences at the west portico' },
  { key: 'singer-house', name: 'Дом Зингера (Дом книги)', nameEn: 'Singer House (Dom Knigi), Nevsky 28', ids: ['w102305449'], osm: [], at: [-1422, -380], note: 'Art Nouveau 1902-04, glass globe tower; w827660971 is the tower cone part' },
];
