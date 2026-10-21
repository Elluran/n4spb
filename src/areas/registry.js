// ============================================================================
//  AREA REGISTRY (docs/AREAS.md) - which areas exist, where their page and their bake live, and the gates between them. PURE DATA, no imports.
//  RUNTIME-ONLY: tools/baked-revision.mjs leaves this file out of the bake revision (RUNTIME_ONLY), so tuning a gate rectangle or a prompt text never makes the bake stale; because of that
//  nothing that builds the scene may import it (tools/runtime-only-lint.mjs: only src/main.js, via core/gates.js, does). The CPU tests (tools/areas-test.mjs) check every row against the
//  real data facade of the area, so a copied number cannot drift.
//  Street frame everywhere: metres, x east, z south (north = -z), yaw 0 = north, 90 = west.
// ============================================================================
export const SCHEMA = 1;

/** Staged release (docs/AREAS.md): false hides every gate (no chip, no prompt, no navigation); a runtime flag, so flipping it needs no re-bake. ?gates=0 / ?gates=1 override it per visit. */
export const GATES_ENABLED = true;

/**
 * id        the area module's ID (src/world/area.js, src/areas/<id>/area.js) and <html data-area>
 * page      the HTML page of the area, relative to the site root (the page next to index.html keeps the PWA scope)
 * bake      directory of its baked products under assets/ (trailing slash); the strip keeps the original path, so the deployed URL and every cached page keep working
 * requireBake  true: a missing or stale bake is an error card, never a procedural rebuild (set for areas that are reached by a hand-off)
 * remap     URL-like keys (relative to the site root) the page's import map points at this area's files; empty for the strip (its files are the defaults)
 * play      the play rectangles (a copy of the data facade's PLAY_RECTS; tools/areas-test.mjs compares)
 */
export const REGISTRY = {
  strip: {
    id: 'strip', page: 'index.html', bake: 'baked/', requireBake: false,
    title: 'Невский проспект', titleEn: 'Nevsky strip',
    sights: ['Московский вокзал', 'Невский проспект', 'Дворцовая площадь', 'Адмиралтейство'],
    approxMB: 48, remap: {}, dev: false,
    play: [
      { name: 'OLD', x0: -595, x1: 835, z0: -405, z1: 1060 },
      { name: 'W1', x0: -1750, x1: -595, z0: -1000, z1: 160 },
      { name: 'N1', x0: -595, x1: -420, z0: -1000, z1: -405 },
      { name: 'W2a', x0: -1950, x1: -1750, z0: -1300, z1: 170 },
      { name: 'W2b', x0: -2200, x1: -1950, z0: -1180, z1: 170 },
      { name: 'W2c', x0: -2450, x1: -2200, z0: -1010, z1: 170 },
      { name: 'W2d', x0: -2700, x1: -2450, z0: -800, z1: 240 },
      { name: 'W2e', x0: -2900, x1: -2700, z0: -620, z1: 240 },
      { name: 'SG', x0: -1000, x1: -600, z0: -1300, z1: -1000 },
    ],
  },
};

/**
 * Gates between areas: { id, from, to, seg: [[x,z],[x,z]] (the border segment in the FROM area), inward: [nx,nz] (unit vector pointing from the border into the FROM area), zone (m: depth of the
 * prompt zone, walking), arrive: { x0, x1, z0, z1 } (where the player may land in the TO area), reverse (id of the gate back) }. Empty until the second area exists (milestone M3).
 */
export const GATES = [
  // g0 - the dev loop (?devgates=1): a gate across the Nevsky approach to Vosstaniya Square (a vertical segment at x = 470, the strip east of it is the "own area") that leads back to the SAME page at
  // the same pose. It exercises the whole hand-off (prompt, preflight, veil, navigation, arrival, memory) before a second area exists, and stays as a test fixture afterwards.
  { id: 'g0', dev: true, from: 'strip', to: 'strip', seg: [[470, 100], [470, 240]], inward: [1, 0], zone: 30, arrive: { x0: 440, x1: 700, z0: 80, z1: 260 }, reverse: 'g0' },
];
