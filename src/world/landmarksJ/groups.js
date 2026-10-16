// landmarksJ/groups.js - the layout.GROUPS sub-groups of module landmarksJ (pure data, no imports: layout.js merges them). Fields as in layout.js GROUPS: { key, name, nameEn, ids: [OSM building ids + parts parents], osm: [non-building OSM ids], at: [x, z], note }.
// Everything listed here is DRAWN by landmarksJ (docs/research/admiralty-stisaac.md): St Isaac's Cathedral r3229838 (its twelve OSM parts follow `parent`), the granite apron and the iron fence round it.
export const GROUPS_LIST = [
  { key: 'st-isaac', name: 'Исаакиевский собор', nameEn: "St Isaac's Cathedral (Montferrand, 1858) with its stylobate and the iron fence", ids: ['r3229838'], osm: ['r13331163', 'w451262296', 'w138711609'], at: [-2524, -186],
    note: 'OSM r3229838 + 12 parts (dome r3229898, drum r3229897, towers r3229921-25, porticos r3229922 / 26-28); apron r13331163; fences w451262296 / w138711609' },
  { key: 'nicholas-i', name: 'Памятник Николаю I', nameEn: 'Nicholas I monument (Klodt) with its oval fence', ids: [], osm: ['n1123474657', 'w105699762'], at: [-2396, 35],
    note: 'monument node n1123474657 (-2395.6, 35.3), oval fence w105699762 (R 10.8 m); the four candelabra and the platform are drawn with it' },
  { key: 'mariinsky', name: 'Мариинский дворец', nameEn: 'Mariinsky Palace (Stackenschneider)', ids: ['r2001070'], osm: [], at: [-2339, 174], note: 'OSM r2001070 + parts (w30976362, w148393731, w148393736); three risalits, glass pyramid, green roofs' },
  { key: 'astoria', name: 'Гостиница Астория', nameEn: 'Astoria hotel (Lidval 1912)', ids: ['r3107676', 'r6554800'], osm: [], at: [-2362, -67], note: 'r3107676 (7 levels, courtyard) + r6554800 (the lower duplicate outline) + r6554799 (parent r3107676)' },
  { key: 'angleterre', name: 'Гостиница Англетер', nameEn: 'Angleterre hotel', ids: ['w49861780'], osm: [], at: [-2358, -150], note: 'Malaya Morskaya 24, terracotta with cream pilasters' },
  { key: 'lobanov-rostovsky', name: 'Дом Лобанова-Ростовского', nameEn: 'Lobanov-Rostovsky house (House with Lions)', ids: ['r3077276'], osm: ['n7532311480', 'n7532311481'], at: [-2433, -281], note: 'Admiralteysky 12; 8-column portico, two lions (nodes n7532311480 / 81)' },
  { key: 'isaac-garden', name: 'Исаакиевский сквер', nameEn: "St Isaac's Square garden (lawn, paths, oval lawn with rose bed, trees) and the square's paving polygon", ids: [], osm: ['w23076273', 'w132656347', 'w132656345', 'w638328792'], at: [-2449, -61],
    note: 'park w23076273; oval lawn w132656347, lawn w132656345; the OSM square w638328792 covers the garden (the generic streets paint it as paving: claimed so the garden can show)' },
];
