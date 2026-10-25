// landmarksTroitsky/groups.js - the layout.GROUPS sub-group of module landmarksTroitsky (pure data, no imports; the area module merges it). Everything listed here is DRAWN by the module (the deck, the kerbs, the
// pavements, the tram rails of the bridge), so streets must not draw those ways; the lanes stay in the lane graph (the NPC traffic drives over the deck, the module publishes its height and the stop lines).
// The two non-bridge approach pieces (w143681930 / w143681927, layer 0) are ordinary streets and stay with `streets`. Ids: the OSM ways of the Troitsky Bridge (the source project's bridges/groups.js 'troitsky').
export const WAY_IDS = ['w142545019', 'w142545020', 'w309915522'];                 // the carriageways (the lanes of these ways get the barrier stop lines)
export const GROUPS_LIST = [
  { key: 'troitsky', name: 'Троицкий мост', nameEn: 'Troitsky Bridge (the whole bridge, bank to bank, with the opening bascule leaf)', ids: [],
    osm: ['w142545019', 'w142545020', 'w309915522', 'w142545023', 'w142545024', 'w202626988', 'w202626991'], at: [-1223, -1565],
    note: 'the two carriageways (w142545019 / w142545020 + the south ramp w309915522), the two tram ways (w142545023 / w142545024) and the two footways (w202626988 / w202626991) of the 554 m bridge: the module draws the deck, the kerbs, the pavements and the rails; the single bascule leaf (u 15 .. 58 from the Mars Field bank) opens on a schedule' },
];
