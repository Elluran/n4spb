// bridges/sites-sw.js - PURE DATA: the three bridge sites of the south-west that lie inside the data extent of the Nevsky strip (docs/research/sw-canals-bridges.md section 5, 4): the Kamenny Bridge (Griboedov Canal),
// the Pochtamtsky and Fonarny bridges (Moika west of the Blue Bridge).  Merged into SITES by sites.js (same fields as there).  Extra fields: look (key of mats.js M.looks when it differs from style), hex (railing / colour override),
// bank (fixed bank interval [uL, uR]), spans / pier / crowns (multi-span bridges), trams, clear (clearance board), pole (tripod name pole text), plate (blank white Mostotrest plate at mid-span).
export const SW_SITES = [
  // ------------------------------------------------------------------ Griboedov Canal
  { id: 'kamenny', name: 'Каменный мост', nameEn: 'Kamenny Bridge', kind: 'road', style: 'kamenny', stone: true, water: 'r3298111', ww: 'griboedov',
    cx: -1800.4, cz: 218.5, b: 143.1, v0: -6.94, v1: 6.94,
    zones: [[-6.94, -5.65, 'pave'], [-5.65, 5.65, 'asphalt'], [5.65, 6.94, 'pave']], hump: 1.45, soffitCrown: 0.73, spring: 0.45, at: [-1800, 219] },
  // ------------------------------------------------------------------ Moika west of the Blue Bridge
  { id: 'pochtamtsky', name: 'Почтамтский мост', nameEn: 'Pochtamtsky Bridge (chain)', kind: 'foot', style: 'pochtamt', water: 'r1201708', ww: 'moika',
    cx: -2821.7, cz: 214.3, b: 166.3, v0: -1.1, v1: 1.1, deckW: 2.2, gapW: 6, zones: [[-1.1, 1.1, 'plank']], hump: 0, at: [-2822, 214] },
  { id: 'fonarny', name: 'Фонарный мост', nameEn: 'Fonarny Bridge', kind: 'road', style: 'rcarch', look: 'fonarny', water: 'r1201708', ww: 'moika',
    cx: -2651.5, cz: 200.3, b: 142.6, v0: -10, v1: 10,
    zones: [[-10, -7, 'pave'], [-7, 7, 'asphalt'], [7, 10, 'pave']], hump: 0.2, soffitCrown: -0.35, spring: 0.6, at: [-2652, 200] },
];
