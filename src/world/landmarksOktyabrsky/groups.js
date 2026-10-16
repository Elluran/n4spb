// landmarksOktyabrsky/groups.js - the layout.GROUPS sub-groups of module landmarksOktyabrsky (pure data, no imports: layout.js merges them). Fields as in layout.js GROUPS:
// { key, name, nameEn, ids: [OSM building ids + parts parents], osm: [non-building OSM ids], at: [x, z], note }.  Claim only what the module really draws (docs/research/oktyabrsky.md section 12).
// A part of the module is built only when its key is listed here (landmarksOktyabrsky.js PARTS): flip a claim on together with its part.
// NOT claimed on purpose: the Greek Square polygon w162380264 (the parking lot, its bays and aisles stay with streets / environment), the parking w98377443, the footways and the rear steps ways
// (w1540830441 / 47 / 49), Prudkovsky per., the Nekrasov Garden, the business centre w330313370 (a city house).  The three mapped flights of steps ON the forecourt paving ARE claimed (review 2026-10-07).
export const GROUPS_LIST = [
  { key: 'oktyabrsky-hall', name: 'Большой концертный зал «Октябрьский»', nameEn: 'Bolshoy Concert Hall Oktyabrsky (1967): glass front under a cantilevered slab, the stone cube of the auditorium, the stair, the forecourt and the Matveev group',
    ids: ['w30324279'], osm: ['n1732981183', 'w357521804', 'w357521805', 'w1540830461'], at: [797.6, -347.5],
    note: 'outline w30324279 (skip: it owns a part) + part w929214560 (claimed through the parent id; prep.js then drops the part and its synthesised base w929214560~f); the sculpture node n1732981183 (October group) is drawn by the module; the three mapped flights of steps w357521804 / w357521805 (hall u 20 / 64, v -13 .. -4) and w1540830461 (u -4 .. -12, v -4.4, beside the SSW end of the stair) lie on the module paving and show on no photo as separate stairs: claimed so that streets lays no flat pale step slabs across the promenade' },
  { key: 'kapodistrias', name: 'Памятник Иоаннису Каподистрии', nameEn: 'Monument to Ioannis Kapodistrias (V. Klykov, M. Reinberg, 2003) at the mouth of the Nekrasov Garden',
    ids: [], osm: ['n1372027612'], at: [796.6, -460.6], note: 'statue node n1372027612; the figure, the pedestal and the platform are drawn by the module' },
];

// Ground that this module paves (world metres [x, z] rings, pure data).  The promenade along the stair (between the stair foot and the parking lot) and the apron round the Kapodistrias monument lie
// on unmapped ground that `environment` paints as patchy grass, so its grass tufts stand through the pavers: proposal for the environment owner (docs/research/oktyabrsky-requests.md): paint these rings
// as 'paved' / treat them as `field.claimed` (the triangles of plaza.js are further clipped at the asphalt, the lot, buildings and the Nekrasov Garden).
export const PAVED_RINGS = [
  [[734.9, -328.6], [808.3, -456.4], [785.3, -469.6], [772.8, -447.9], [784.2, -441.4], [736.9, -359.1], [730.4, -362.1], [717, -338.8]],
];
