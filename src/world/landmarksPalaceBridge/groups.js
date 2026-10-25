// landmarksPalaceBridge/groups.js - the Palace Bridge opening mechanism CLAIMS NOTHING: the two carriageways and the rest of the deck stay with the `bridges` module (layout.GROUPS.bridges key 'palace', ways w362796524 / w362796525),
// which draws everything but the central bascule span when this module is in the area's MODULES (bridges/palace.js `leaves`), and this module draws the two leaves. The lanes stay in the lane graph: the NPC traffic drives over
// the deck and the module puts its stop lines on them. Pure data, no imports.
export { WAY_IDS } from './frame.js';
export const GROUPS_LIST = [];
